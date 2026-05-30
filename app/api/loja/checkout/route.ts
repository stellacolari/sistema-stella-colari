import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pbkdf2Sync, randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizarTamanhoEstoque } from "@/lib/loja/estoque";

const CHAVE_CASHBACK_CONFIG = "PADRAO";
const COOKIE_CLIENTE_ID = "stella_cliente_id";

type CheckoutItemPayload = {
  produtoId: string;
  tamanhoAnel?: string | null;
  quantidade: number;
  opcaoAdicionalId?: string | null;
  opcaoAdicional?: {
    id?: string;
    nome?: string;
    descricao?: string | null;
    valorVenda?: number | string | null;
    itemPadraoSubstituidoId?: string | null;
    itemPadraoSubstituidoNome?: string | null;
    itemAdicionalConsumidoId?: string | null;
    itemAdicionalConsumidoNome?: string | null;
    custoUnitario?: number | string | null;
  } | null;
};

type MovimentoComponenteKit = {
  codigoItem: string;
  nomeItem: string;
  produtoId: string;
  quantidade: number;
  tamanhoAnel: string;
  custoTotal: number;
};

type BaixaAdicionalResultado = {
  codigoItem: string;
  nomeItem: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  origem: "REGRA_CATEGORIA" | "OPCAO_ADICIONAL";
};

function gerarCodigoPedido(numero: number) {
  return `PO${String(numero).padStart(6, "0")}`;
}

function gerarCodigoCliente(numero: number) {
  return `CL${String(numero).padStart(6, "0")}`;
}

async function gerarProximoCodigoPedido(tx: Prisma.TransactionClient) {
  const ultimoPedido = await tx.pedidoOnline.findFirst({
    where: {
      codigo: {
        startsWith: "PO",
      },
    },
    orderBy: {
      codigo: "desc",
    },
    select: {
      codigo: true,
    },
  });

  let proximoNumero = 1;

  if (ultimoPedido?.codigo) {
    const numeroAtual = Number(ultimoPedido.codigo.replace("PO", ""));

    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const codigo = gerarCodigoPedido(proximoNumero + tentativa);

    const pedidoExistente = await tx.pedidoOnline.findUnique({
      where: {
        codigo,
      },
      select: {
        id: true,
      },
    });

    if (!pedidoExistente) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código único para o pedido.");
}

async function gerarProximoCodigoCliente(tx: Prisma.TransactionClient) {
  const ultimoCliente = await tx.cliente.findFirst({
    where: {
      codigo: {
        startsWith: "CL",
      },
    },
    orderBy: {
      codigo: "desc",
    },
    select: {
      codigo: true,
    },
  });

  let proximoNumero = 1;

  if (ultimoCliente?.codigo) {
    const numeroAtual = Number(ultimoCliente.codigo.replace("CL", ""));

    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const codigo = gerarCodigoCliente(proximoNumero + tentativa);

    const clienteExistente = await tx.cliente.findUnique({
      where: {
        codigo,
      },
      select: {
        id: true,
      },
    });

    if (!clienteExistente) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código único para o cliente.");
}

function parseNumero(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return fallback;
  }

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");
  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : fallback;
}

function normalizarCodigoCupom(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function normalizarCategoria(categoria: string) {
  return categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function produtoExigeTamanhoAnel(categoria: string) {
  const categoriaNormalizada = normalizarCategoria(categoria);

  return (
    categoriaNormalizada === "anel" ||
    categoriaNormalizada === "aneis" ||
    categoriaNormalizada === "aneis e aliancas" ||
    categoriaNormalizada.includes("anel")
  );
}

function normalizarTamanhoAnel(tamanho: string | null | undefined) {
  const value = String(tamanho ?? "").trim().toUpperCase();

  if (!value || value === "UNICO") {
    return "";
  }

  return value;
}

type ProdutoCheckoutComVariacoes = Prisma.ProdutoGetPayload<{
  include: {
    variacoes: {
      include: {
        opcoes: true;
      };
    };
  };
}>;

function normalizarOpcaoProduto(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function getVariacaoPrincipalProduto(produto: ProdutoCheckoutComVariacoes) {
  return (
    produto.variacoes.find(
      (variacao) =>
        variacao.ativo &&
        variacao.obrigatoria !== false &&
        variacao.opcoes.some((opcao) => opcao.ativo)
    ) || null
  );
}

function produtoExigeVariacao(produto: ProdutoCheckoutComVariacoes) {
  return Boolean(getVariacaoPrincipalProduto(produto));
}

function validarOpcaoVariacaoProduto({
  produto,
  opcaoInformada,
}: {
  produto: ProdutoCheckoutComVariacoes;
  opcaoInformada: string;
}) {
  const variacao = getVariacaoPrincipalProduto(produto);

  if (!variacao) {
    return null;
  }

  const opcaoNormalizada = normalizarCategoria(opcaoInformada);

  return (
    variacao.opcoes.find(
      (opcao) =>
        opcao.ativo && normalizarCategoria(opcao.nome) === opcaoNormalizada
    ) || null
  );
}

function criarSenhaHash(senha: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(senha, salt, 100000, 64, "sha512").toString("hex");

  return `pbkdf2$${salt}$${hash}`;
}

function calcularCustoMedio(valorAcumulado: number, quantidadeAtual: number) {
  if (quantidadeAtual <= 0) {
    return 0;
  }

  return valorAcumulado / quantidadeAtual;
}

function produtoTemDesconto(produto: {
  descontoAtivo: boolean;
  precoPromocional: number | null;
  precoVenda: number;
}) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function calcularPrecoProduto(produto: {
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
}) {
  if (produtoTemDesconto(produto)) {
    const precoPromocional = produto.precoPromocional as number;

    return {
      precoUnitario: precoPromocional,
      precoOriginal: produto.precoVenda,
      descontoPercentual: Math.round(
        ((produto.precoVenda - precoPromocional) / produto.precoVenda) * 100
      ),
      produtoComDesconto: true,
    };
  }

  return {
    precoUnitario: produto.precoVenda,
    precoOriginal: null,
    descontoPercentual: null,
    produtoComDesconto: false,
  };
}

function calcularDescontoCupom({
  tipo,
  valor,
  subtotal,
}: {
  tipo: string;
  valor: number;
  subtotal: number;
}) {
  if (tipo === "PERCENTUAL") {
    return Math.min(subtotal, subtotal * (valor / 100));
  }

  return Math.min(subtotal, valor);
}

async function baixarEstoqueProduto({
  tx,
  produtoId,
  tamanhoAnel,
  quantidade,
  descricao,
}: {
  tx: Prisma.TransactionClient;
  produtoId: string;
  tamanhoAnel: string | null | undefined;
  quantidade: number;
  descricao: string;
}) {
  const tamanhoEstoque = normalizarTamanhoEstoque(tamanhoAnel);

  const estoqueProduto = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId,
        tamanhoAnel: tamanhoEstoque,
      },
    },
  });

  if (!estoqueProduto) {
    throw new Error(
      tamanhoEstoque !== "UNICO"
        ? `Produto sem estoque na opção ${tamanhoEstoque}: ${descricao}`
        : `Produto sem estoque: ${descricao}`
    );
  }

  if (estoqueProduto.quantidadeAtual < quantidade) {
    throw new Error(
      tamanhoEstoque !== "UNICO"
        ? `Saldo insuficiente para ${descricao} na opção ${tamanhoEstoque}. Saldo atual: ${estoqueProduto.quantidadeAtual}.`
        : `Saldo insuficiente para ${descricao}. Saldo atual: ${estoqueProduto.quantidadeAtual}.`
    );
  }

  const custoMedioProduto = Number(estoqueProduto.custoMedio || 0);
  const gastoProduto = custoMedioProduto * quantidade;

  const novaQuantidadeProduto = estoqueProduto.quantidadeAtual - quantidade;
  const novoValorProduto =
    Number(estoqueProduto.valorAcumulado || 0) - gastoProduto;
  const valorProdutoSeguro = novoValorProduto > 0 ? novoValorProduto : 0;

  await tx.estoqueProduto.update({
    where: {
      id: estoqueProduto.id,
    },
    data: {
      quantidadeAtual: novaQuantidadeProduto,
      valorAcumulado: valorProdutoSeguro,
      custoMedio: calcularCustoMedio(valorProdutoSeguro, novaQuantidadeProduto),
    },
  });

  return {
    tamanhoEstoque,
    gastoProduto,
    custoMedioProduto,
  };
}

async function baixarEstoqueAdicional({
  tx,
  itemAdicionalId,
  quantidade,
  descricao,
  origem,
}: {
  tx: Prisma.TransactionClient;
  itemAdicionalId: string;
  quantidade: number;
  descricao: string;
  origem: "REGRA_CATEGORIA" | "OPCAO_ADICIONAL";
}): Promise<BaixaAdicionalResultado> {
  const estoque = await tx.estoqueAdicional.findUnique({
    where: {
      itemAdicionalId,
    },
    include: {
      itemAdicional: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          ativo: true,
          status: true,
        },
      },
    },
  });

  if (!estoque) {
    throw new Error(`Item adicional sem estoque cadastrado: ${descricao}`);
  }

  if (
    !estoque.itemAdicional.ativo ||
    estoque.itemAdicional.status === "NA_LIXEIRA"
  ) {
    throw new Error(`Item adicional indisponível: ${estoque.itemAdicional.nome}`);
  }

  if (estoque.quantidadeAtual < quantidade) {
    throw new Error(
      `Saldo insuficiente do item adicional ${estoque.itemAdicional.nome}. Saldo atual: ${estoque.quantidadeAtual}.`
    );
  }

  const custoUnitario = Number(estoque.custoMedio || 0);
  const custoTotal = custoUnitario * quantidade;

  const novaQuantidade = estoque.quantidadeAtual - quantidade;
  const novoValorAcumulado = Number(estoque.valorAcumulado || 0) - custoTotal;
  const valorSeguro = novoValorAcumulado > 0 ? novoValorAcumulado : 0;

  await tx.estoqueAdicional.update({
    where: {
      id: estoque.id,
    },
    data: {
      quantidadeAtual: novaQuantidade,
      valorAcumulado: valorSeguro,
      custoMedio: calcularCustoMedio(valorSeguro, novaQuantidade),
    },
  });

  return {
    codigoItem: estoque.itemAdicional.codigoInterno,
    nomeItem: estoque.itemAdicional.nome,
    quantidade,
    custoUnitario,
    custoTotal,
    origem,
  };
}

async function buscarOpcaoAdicionalValida({
  tx,
  opcaoAdicionalId,
  produtoCategoria,
}: {
  tx: Prisma.TransactionClient;
  opcaoAdicionalId: string | null | undefined;
  produtoCategoria: string;
}) {
  if (!opcaoAdicionalId) {
    return null;
  }

  const opcao = await tx.categoriaOpcaoAdicional.findUnique({
    where: {
      id: opcaoAdicionalId,
    },
    include: {
      categoria: {
        select: {
          id: true,
          nome: true,
        },
      },
      itemPadraoSubstituido: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          custoBase: true,
        },
      },
      itemAdicionalConsumido: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          custoBase: true,
          ativo: true,
          status: true,
        },
      },
    },
  });

  if (!opcao || !opcao.ativo) {
    throw new Error("Uma opção adicional selecionada não está disponível.");
  }

  if (
    !opcao.itemAdicionalConsumido.ativo ||
    opcao.itemAdicionalConsumido.status === "NA_LIXEIRA"
  ) {
    throw new Error(
      `O item adicional "${opcao.itemAdicionalConsumido.nome}" não está disponível.`
    );
  }

  if (
    normalizarCategoria(opcao.categoria.nome) !==
    normalizarCategoria(produtoCategoria)
  ) {
    throw new Error(
      `A opção adicional "${opcao.nome}" não pertence à categoria do produto.`
    );
  }

  return opcao;
}

async function buscarCupomValido({
  tx,
  codigoCupom,
  subtotal,
  clienteId,
}: {
  tx: Prisma.TransactionClient;
  codigoCupom: string | null;
  subtotal: number;
  clienteId: string | null;
}) {
  if (!codigoCupom) {
    return null;
  }

  const codigo = normalizarCodigoCupom(codigoCupom);

  if (!codigo) {
    return null;
  }

  const cupom = await tx.cupomLoja.findUnique({
    where: {
      codigo,
    },
  });

  if (!cupom || !cupom.ativo) {
    throw new Error("Cupom inválido ou inativo.");
  }

  const agora = new Date();

  if (cupom.dataInicio && cupom.dataInicio > agora) {
    throw new Error("Este cupom ainda não está disponível.");
  }

  if (cupom.dataFim) {
    const dataFimLimite = new Date(cupom.dataFim);
    dataFimLimite.setHours(23, 59, 59, 999);

    if (dataFimLimite < agora) {
      throw new Error("Este cupom expirou.");
    }
  }

  if (subtotal < Number(cupom.valorMinimoPedido || 0)) {
    throw new Error(
      `Pedido mínimo para este cupom: ${new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(cupom.valorMinimoPedido || 0))}.`
    );
  }

  if (
    cupom.limiteUsoTotal !== null &&
    cupom.limiteUsoTotal !== undefined &&
    cupom.quantidadeUsada >= cupom.limiteUsoTotal
  ) {
    throw new Error("Este cupom atingiu o limite de uso.");
  }

  if (
    clienteId &&
    cupom.limiteUsoPorCliente !== null &&
    cupom.limiteUsoPorCliente !== undefined
  ) {
    const usosCliente = await tx.pedidoOnline.count({
      where: {
        clienteId,
        cupomId: cupom.id,
      },
    });

    if (usosCliente >= cupom.limiteUsoPorCliente) {
      throw new Error("Este cliente já atingiu o limite de uso deste cupom.");
    }
  }

  const descontoValor = calcularDescontoCupom({
    tipo: cupom.tipo,
    valor: Number(cupom.valor || 0),
    subtotal,
  });

  return {
    cupom,
    descontoValor,
  };
}

async function baixarAdicionaisDaCategoria({
  tx,
  categoria,
  quantidadeProduto,
  opcaoAdicional,
}: {
  tx: Prisma.TransactionClient;
  categoria: string;
  quantidadeProduto: number;
  opcaoAdicional: Awaited<ReturnType<typeof buscarOpcaoAdicionalValida>>;
}) {
  const baixas: BaixaAdicionalResultado[] = [];

  const regras = await tx.regraCategoria.findMany({
    where: {
      categoria,
    },
    include: {
      itemAdicional: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          ativo: true,
          status: true,
        },
      },
    },
    orderBy: {
      criadoEm: "asc",
    },
  });

  for (const regra of regras) {
    const itemPadraoFoiSubstituido =
      opcaoAdicional?.itemPadraoSubstituidoId &&
      regra.itemAdicionalId === opcaoAdicional.itemPadraoSubstituidoId;

    const itemPremiumJaSeraConsumido =
      opcaoAdicional?.itemAdicionalConsumidoId &&
      regra.itemAdicionalId === opcaoAdicional.itemAdicionalConsumidoId;

    if (itemPadraoFoiSubstituido || itemPremiumJaSeraConsumido) {
      continue;
    }

    if (
      !regra.itemAdicional.ativo ||
      regra.itemAdicional.status === "NA_LIXEIRA"
    ) {
      continue;
    }

    const quantidadeConsumida =
      Number(regra.quantidade || 0) * quantidadeProduto;

    if (quantidadeConsumida <= 0) {
      continue;
    }

    const baixa = await baixarEstoqueAdicional({
      tx,
      itemAdicionalId: regra.itemAdicionalId,
      quantidade: quantidadeConsumida,
      descricao: `${regra.itemAdicional.nome} da categoria ${categoria}`,
      origem: "REGRA_CATEGORIA",
    });

    baixas.push(baixa);
  }

  if (opcaoAdicional) {
    const baixaPremium = await baixarEstoqueAdicional({
      tx,
      itemAdicionalId: opcaoAdicional.itemAdicionalConsumidoId,
      quantidade: quantidadeProduto,
      descricao: opcaoAdicional.itemAdicionalConsumido.nome,
      origem: "OPCAO_ADICIONAL",
    });

    baixas.push(baixaPremium);
  }

  return baixas;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();

    const clienteCookieId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";
    const criarCadastro = Boolean(body.criarCadastro);

    const nomeCliente = String(body.nomeCliente || "").trim();
    const telefoneCliente = String(body.telefoneCliente || "").trim();
    const emailCliente = String(body.emailCliente || "").trim();
    const documento = String(body.documento || "").trim().replace(/\D/g, "");
    const senha = String(body.senha || "");
    const confirmarSenha = String(body.confirmarSenha || "");

    const cep = String(body.cep || "").trim();
    const rua = String(body.rua || "").trim();
    const numero = String(body.numero || "").trim();
    const complemento = String(body.complemento || "").trim();
    const bairro = String(body.bairro || "").trim();
    const cidade = String(body.cidade || "").trim();
    const estado = String(body.estado || "").trim();
    const observacoes = String(body.observacoes || "").trim();

    const cupomCodigo = normalizarCodigoCupom(body.cupomCodigo);
    const cashbackUsadoSolicitado = parseNumero(body.cashbackUsadoValor, 0);

    const itens: CheckoutItemPayload[] = Array.isArray(body.itens)
      ? body.itens
      : [];

    if (!nomeCliente) {
      return NextResponse.json(
        { error: "Informe o nome do cliente." },
        { status: 400 }
      );
    }

    if (!telefoneCliente) {
      return NextResponse.json(
        { error: "Informe o telefone/WhatsApp do cliente." },
        { status: 400 }
      );
    }

    if (criarCadastro) {
      if (!emailCliente) {
        return NextResponse.json(
          { error: "Informe o e-mail para criar o cadastro." },
          { status: 400 }
        );
      }

      if (!documento) {
        return NextResponse.json(
          { error: "Informe o CPF para criar o cadastro." },
          { status: 400 }
        );
      }

      if (documento.length !== 11) {
        return NextResponse.json(
          { error: "Informe um CPF válido com 11 dígitos." },
          { status: 400 }
        );
      }

      if (senha.length < 6) {
        return NextResponse.json(
          { error: "A senha deve ter pelo menos 6 caracteres." },
          { status: 400 }
        );
      }

      if (senha !== confirmarSenha) {
        return NextResponse.json(
          { error: "As senhas não conferem." },
          { status: 400 }
        );
      }
    }

    if (itens.length === 0) {
      return NextResponse.json(
        { error: "O carrinho está vazio." },
        { status: 400 }
      );
    }

    const itemInvalido = itens.find(
      (item) =>
        !item.produtoId ||
        !Number.isFinite(Number(item.quantidade)) ||
        Number(item.quantidade) <= 0
    );

    if (itemInvalido) {
      return NextResponse.json(
        { error: "Existe um item inválido no carrinho." },
        { status: 400 }
      );
    }

    const pedidoCriado = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const codigoPedido = await gerarProximoCodigoPedido(tx);

        let clienteId: string | null = null;
        let clienteCriadoCheckout = false;
        let clienteEhPrimeiraCompra = false;

        const cashbackConfig = await tx.lojaCashbackConfiguracao.upsert({
          where: {
            chave: CHAVE_CASHBACK_CONFIG,
          },
          create: {
            chave: CHAVE_CASHBACK_CONFIG,
            ativo: true,
            percentualPrimeiraCompra: 10,
            percentualCompraRecorrente: 5,
            somenteClienteCadastrado: true,
            permitirComCupom: false,
            permitirProdutoComDesconto: true,
          },
          update: {},
        });

        if (clienteCookieId) {
          const clienteLogado = await tx.cliente.findUnique({
            where: {
              id: clienteCookieId,
            },
            select: {
              id: true,
              status: true,
              cashbackSaldo: true,
            },
          });

          if (clienteLogado && clienteLogado.status !== "NA_LIXEIRA") {
            clienteId = clienteLogado.id;

            const pedidosPagos = await tx.pedidoOnline.count({
              where: {
                clienteId: clienteLogado.id,
                statusPagamento: "PAGO",
              },
            });

            clienteEhPrimeiraCompra = pedidosPagos === 0;
          }
        }

        if (criarCadastro && !clienteId) {
          const clienteExistente = await tx.cliente.findFirst({
            where: {
              OR: [
                { telefone: telefoneCliente },
                { documento },
                { email: emailCliente },
              ],
            },
          });

          if (clienteExistente) {
            throw new Error(
              "Já existe um cliente cadastrado com este telefone, CPF ou e-mail."
            );
          }

          const codigoCliente = await gerarProximoCodigoCliente(tx);

          const cliente = await tx.cliente.create({
            data: {
              codigo: codigoCliente,
              nome: nomeCliente,
              telefone: telefoneCliente,
              email: emailCliente,
              documento,
              cep: cep || null,
              rua: rua || null,
              numero: numero || null,
              complemento: complemento || null,
              bairro: bairro || null,
              cidade: cidade || null,
              estado: estado || null,
              tipoCliente: "ONLINE",
              status: "NOVO",
              senhaHash: criarSenhaHash(senha),
              cashbackSaldo: 0,
              origemCadastro: "CHECKOUT_ONLINE",
              observacoes: "Cliente criado no checkout da loja online.",
            },
          });

          clienteId = cliente.id;
          clienteCriadoCheckout = true;
          clienteEhPrimeiraCompra = true;
        }

        let subtotalProdutos = 0;
        let subtotalAdicionais = 0;
        let cashbackBaseBruta = 0;

        type ItemProcessado = {
          item: CheckoutItemPayload;
          quantidade: number;
          produto: Prisma.ProdutoGetPayload<{
            include: {
              componentesDoKit: {
                include: {
                  componenteProduto: true;
                };
              };
              variacoes: {
                include: {
                  opcoes: true;
                };
              };
            };
          }>;
          produtoEhKit: boolean;
          exigeTamanho: boolean;
          tamanhoAnel: string | null;
          preco: ReturnType<typeof calcularPrecoProduto>;
          totalProdutoItem: number;
          opcaoAdicional: Awaited<ReturnType<typeof buscarOpcaoAdicionalValida>>;
          valorVendaAdicionalUnitario: number;
          custoAdicionalUnitario: number;
          valorVendaAdicionalTotal: number;
          cashbackBaseItemBruta: number;
        };

        const itensProcessados: ItemProcessado[] = [];

        for (const item of itens) {
          const quantidade = Number(item.quantidade);

          const produto = await tx.produto.findUnique({
            where: {
              id: item.produtoId,
            },
            include: {
              componentesDoKit: {
                include: {
                  componenteProduto: true,
                },
                orderBy: {
                  criadoEm: "asc",
                },
              },
              variacoes: {
                where: {
                  ativo: true,
                },
                orderBy: {
                  ordem: "asc",
                },
                include: {
                  opcoes: {
                    where: {
                      ativo: true,
                    },
                    orderBy: {
                      ordem: "asc",
                    },
                  },
                },
              },
            },
          });

          if (!produto || !produto.ativo || produto.status === "NA_LIXEIRA") {
            throw new Error("Um dos produtos do carrinho não está disponível.");
          }

          const produtoEhKit = produto.tipoProduto === "KIT";

          if (produtoEhKit && produto.componentesDoKit.length === 0) {
            throw new Error(
              `O kit ${produto.nome} não possui componentes cadastrados.`
            );
          }

          const exigeVariacao = !produtoEhKit && produtoExigeVariacao(produto);
          const exigeTamanhoAnel =
            !produtoEhKit &&
            !exigeVariacao &&
            produtoExigeTamanhoAnel(produto.categoria);

          const opcaoInformada = normalizarOpcaoProduto(item.tamanhoAnel);

          const opcaoVariacaoValida =
            exigeVariacao && opcaoInformada
              ? validarOpcaoVariacaoProduto({
                  produto,
                  opcaoInformada,
                })
              : null;

          if (exigeVariacao && !opcaoVariacaoValida) {
            const nomeVariacao =
              getVariacaoPrincipalProduto(produto)?.nome || "opção";

            throw new Error(
              `Selecione uma opção válida de ${nomeVariacao} para o produto: ${produto.nome}`
            );
          }

          const tamanhoAnel = exigeVariacao
            ? opcaoVariacaoValida?.nome || null
            : exigeTamanhoAnel
            ? normalizarTamanhoAnel(item.tamanhoAnel)
            : null;

          if (exigeTamanhoAnel && !tamanhoAnel) {
            throw new Error(
              `Selecione o tamanho do anel para o produto: ${produto.nome}`
            );
          }

          const precoAdicionalVariacao = Number(
            opcaoVariacaoValida?.precoAdicional || 0
          );

          const preco = calcularPrecoProduto({
            precoVenda: Number(produto.precoVenda) + precoAdicionalVariacao,
            descontoAtivo: produto.descontoAtivo,
            precoPromocional: produto.precoPromocional
              ? Number(produto.precoPromocional) + precoAdicionalVariacao
              : null,
          });

          const totalProdutoItem = preco.precoUnitario * quantidade;
          subtotalProdutos += totalProdutoItem;

          const opcaoAdicionalId =
            item.opcaoAdicionalId || item.opcaoAdicional?.id || null;

          const opcaoAdicional = await buscarOpcaoAdicionalValida({
            tx,
            opcaoAdicionalId,
            produtoCategoria: produto.categoria,
          });

          const valorVendaAdicionalUnitario = opcaoAdicional
            ? Number(opcaoAdicional.valorVenda || 0)
            : 0;

          const custoAdicionalUnitario = opcaoAdicional
            ? Number(opcaoAdicional.itemAdicionalConsumido.custoBase || 0)
            : 0;

          const valorVendaAdicionalTotal =
            valorVendaAdicionalUnitario * quantidade;

          subtotalAdicionais += valorVendaAdicionalTotal;

          const itemPodeGerarCashback =
            cashbackConfig.permitirProdutoComDesconto ||
            !preco.produtoComDesconto;

          const cashbackBaseItemBruta = itemPodeGerarCashback
            ? totalProdutoItem + valorVendaAdicionalTotal
            : 0;

          cashbackBaseBruta += cashbackBaseItemBruta;

          itensProcessados.push({
            item,
            quantidade,
            produto,
            produtoEhKit,
            exigeTamanho: exigeVariacao || exigeTamanhoAnel,
            tamanhoAnel,
            preco,
            totalProdutoItem,
            opcaoAdicional,
            valorVendaAdicionalUnitario,
            custoAdicionalUnitario,
            valorVendaAdicionalTotal,
            cashbackBaseItemBruta,
          });
        }

        const subtotalBruto = subtotalProdutos + subtotalAdicionais;

        const cupomValidado = await buscarCupomValido({
          tx,
          codigoCupom: cupomCodigo || null,
          subtotal: subtotalBruto,
          clienteId,
        });

        const cupom = cupomValidado?.cupom ?? null;
        const cupomDescontoValor = Number(cupomValidado?.descontoValor || 0);
        const subtotalAposCupom = Math.max(
          subtotalBruto - cupomDescontoValor,
          0
        );

        let cashbackUsadoValor = 0;

        if (cashbackUsadoSolicitado > 0) {
          if (!clienteId) {
            throw new Error("Entre na sua conta para usar cashback.");
          }

          const clienteCashback = await tx.cliente.findUnique({
            where: {
              id: clienteId,
            },
            select: {
              cashbackSaldo: true,
            },
          });

          const saldoDisponivel = Number(clienteCashback?.cashbackSaldo || 0);
          const maximoUsavel = Math.min(saldoDisponivel, subtotalAposCupom);

          if (cashbackUsadoSolicitado > maximoUsavel + 0.009) {
            throw new Error(
              `Você pode usar até ${new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(maximoUsavel)} de cashback neste pedido.`
            );
          }

          cashbackUsadoValor = Number(
            Math.min(cashbackUsadoSolicitado, maximoUsavel).toFixed(2)
          );
        }

        const subtotal = Math.max(subtotalAposCupom - cashbackUsadoValor, 0);

        let cashbackPercentualAplicado = 0;
        let cashbackBloqueadoMotivo: string | null = null;

        if (!cashbackConfig.ativo) {
          cashbackBloqueadoMotivo = "Cashback desativado";
        } else if (
          cupom &&
          (cupom.bloqueiaCashback || !cashbackConfig.permitirComCupom)
        ) {
          cashbackBloqueadoMotivo = "Cupom aplicado";
        } else if (cashbackConfig.somenteClienteCadastrado && !clienteId) {
          cashbackBloqueadoMotivo = "Cliente sem cadastro";
        } else {
          cashbackPercentualAplicado = clienteEhPrimeiraCompra
            ? Number(cashbackConfig.percentualPrimeiraCompra || 0)
            : Number(cashbackConfig.percentualCompraRecorrente || 0);
        }

        const cashbackBaseValor = cashbackBloqueadoMotivo
          ? 0
          : Math.max(
              cashbackBaseBruta - cupomDescontoValor - cashbackUsadoValor,
              0
            );

        const cashbackPrevistoValor = Number(
          ((cashbackBaseValor * cashbackPercentualAplicado) / 100).toFixed(2)
        );

        const pedido = await tx.pedidoOnline.create({
          data: {
            codigo: codigoPedido,
            origemCanal: "LOJA_STELLA",
            clienteId,
            clienteCriadoCheckout,
            nomeCliente,
            telefoneCliente,
            emailCliente: emailCliente || null,
            documento: documento || null,
            cep: cep || null,
            rua: rua || null,
            numero: numero || null,
            complemento: complemento || null,
            bairro: bairro || null,
            cidade: cidade || null,
            estado: estado || null,
            observacoes: observacoes || null,
            subtotal,
            frete: 0,
            total: subtotal,
            status: "PEDIDO_RECEBIDO",

            cupomId: cupom?.id || null,
            cupomCodigo: cupom?.codigo || null,
            cupomDescontoValor,

            cashbackBaseValor,
            cashbackPrevistoValor,
            cashbackPercentualAplicado,
            cashbackBloqueadoMotivo,
            cashbackUsadoValor,
            cashbackStatus:
              cashbackPrevistoValor > 0 ? "PENDENTE" : "NAO_APLICAVEL",
          },
        });

        if (cashbackUsadoValor > 0 && clienteId) {
          const clienteAtual = await tx.cliente.findUnique({
            where: {
              id: clienteId,
            },
            select: {
              cashbackSaldo: true,
            },
          });

          const saldoAtual = Number(clienteAtual?.cashbackSaldo || 0);
          const novoSaldo = Math.max(saldoAtual - cashbackUsadoValor, 0);

          await tx.cliente.update({
            where: {
              id: clienteId,
            },
            data: {
              cashbackSaldo: novoSaldo,
            },
          });

          await tx.clienteCashbackMovimentacao.create({
            data: {
              clienteId,
              tipo: "USO",
              status: "EFETIVADO",
              origemTipo: "PEDIDO_ONLINE",
              origemId: pedido.id,
              valor: -cashbackUsadoValor,
              observacao: `Cashback usado no pedido ${pedido.codigo}.`,
            },
          });
        }

        if (cupom) {
          await tx.cupomLoja.update({
            where: {
              id: cupom.id,
            },
            data: {
              quantidadeUsada: {
                increment: 1,
              },
            },
          });
        }

        await tx.pedidoStatusHistorico.create({
          data: {
            pedidoOnlineId: pedido.id,
            statusAnterior: null,
            statusNovo: "PEDIDO_RECEBIDO",
            tipoEvento: "AUTOMATICO",
            origem: "CHECKOUT_ONLINE",
            usuarioNome: "Sistema",
            observacao: "Pedido criado no checkout da loja online.",
          },
        });

        await tx.pedidoEnvio.create({
          data: {
            pedidoOnlineId: pedido.id,
            tipoEntrega: "ENTREGA",
            statusEnvio: "PENDENTE",
            cepDestino: cep || null,
            valorFrete: 0,
          },
        });

        for (const itemProcessado of itensProcessados) {
          const {
            quantidade,
            produto,
            produtoEhKit,
            exigeTamanho,
            tamanhoAnel,
            preco,
            totalProdutoItem,
            opcaoAdicional,
            valorVendaAdicionalUnitario,
            custoAdicionalUnitario,
            valorVendaAdicionalTotal,
            cashbackBaseItemBruta,
          } = itemProcessado;

          let gastoProduto = 0;
          const movimentosComponentesKit: MovimentoComponenteKit[] = [];

          if (!produtoEhKit) {
            const tamanhoEstoque = exigeTamanho ? tamanhoAnel : "UNICO";

            const baixa = await baixarEstoqueProduto({
              tx,
              produtoId: produto.id,
              tamanhoAnel: tamanhoEstoque,
              quantidade,
              descricao: produto.nome,
            });

            gastoProduto = baixa.gastoProduto;
          } else {
            for (const componente of produto.componentesDoKit) {
              const produtoComponente = componente.componenteProduto;
              const quantidadeComponente = quantidade * componente.quantidade;

              const baixaComponente = await baixarEstoqueProduto({
                tx,
                produtoId: produtoComponente.id,
                tamanhoAnel: "UNICO",
                quantidade: quantidadeComponente,
                descricao: `${produtoComponente.nome} do kit ${produto.nome}`,
              });

              gastoProduto += baixaComponente.gastoProduto;

              movimentosComponentesKit.push({
                codigoItem: produtoComponente.codigoInterno,
                nomeItem: produtoComponente.nome,
                produtoId: produtoComponente.id,
                quantidade: quantidadeComponente,
                tamanhoAnel: baixaComponente.tamanhoEstoque,
                custoTotal: baixaComponente.gastoProduto,
              });
            }
          }

          const custoAdicionalTotalInformado =
            custoAdicionalUnitario * quantidade;

          const totalItemAntesCupom =
            totalProdutoItem + valorVendaAdicionalTotal;

          const pedidoItem = await tx.pedidoOnlineItem.create({
            data: {
              pedidoOnlineId: pedido.id,
              produtoId: produto.id,
              codigoInterno: produto.codigoInterno,
              nomeProduto: produto.nome,
              imagemUrl: produto.imagemUrl,
              categoria: produto.categoria,
              tamanhoAnel,
              quantidade,
              precoUnitario: preco.precoUnitario,
              precoOriginal: preco.precoOriginal,
              descontoPercentual: preco.descontoPercentual,
              geraCashback:
                cashbackBaseItemBruta > 0 && !cashbackBloqueadoMotivo,
              cashbackBaseValor: cashbackBloqueadoMotivo
                ? 0
                : Math.max(cashbackBaseItemBruta, 0),
              total: totalProdutoItem,
            },
          });

          const baixasAdicionais = await baixarAdicionaisDaCategoria({
            tx,
            categoria: produto.categoria,
            quantidadeProduto: quantidade,
            opcaoAdicional,
          });

          const custoTotalAdicionaisEstoque = baixasAdicionais.reduce(
            (total, baixa) => total + baixa.custoTotal,
            0
          );

          if (opcaoAdicional) {
            const custoRealPremium =
              baixasAdicionais.find(
                (baixa) =>
                  baixa.origem === "OPCAO_ADICIONAL" &&
                  baixa.codigoItem ===
                    opcaoAdicional.itemAdicionalConsumido.codigoInterno
              )?.custoTotal ?? custoAdicionalTotalInformado;

            await tx.pedidoOnlineItemAdicional.create({
              data: {
                pedidoOnlineId: pedido.id,
                pedidoOnlineItemId: pedidoItem.id,
                opcaoAdicionalId: opcaoAdicional.id,
                nome: opcaoAdicional.nome,
                itemPadraoSubstituidoId:
                  opcaoAdicional.itemPadraoSubstituidoId || null,
                itemAdicionalConsumidoId:
                  opcaoAdicional.itemAdicionalConsumidoId || null,
                quantidade,
                custoUnitario:
                  quantidade > 0 ? custoRealPremium / quantidade : 0,
                valorVendaUnitario: valorVendaAdicionalUnitario,
                custoTotal: custoRealPremium,
                valorVendaTotal: valorVendaAdicionalTotal,
                lucroTotal: valorVendaAdicionalTotal - custoRealPremium,
              },
            });
          }

          const movimentacao = await tx.movimentacao.create({
            data: {
              codigoMovimentacao: `MOV-${randomUUID()}`,
              tipoMovimentacao: produtoEhKit ? "SAÍDA KIT" : "SAÍDA",
              origemTipo: produtoEhKit ? "pedido_online_kit" : "pedido_online",
              origemId: pedido.id,
              codigoItem: produto.codigoInterno,
              itemTipo: produtoEhKit ? "kit" : "produto",
              quantidade,
              tamanhoAnel,
              custo: gastoProduto + custoTotalAdicionaisEstoque,
              faturamento: totalItemAntesCupom,
              documentoCliente: documento || null,
              status: "ATIVA",
              relacionadoA: pedidoItem.id,
              gastoProdutoPrincipal: gastoProduto,
              gastoAdd1: custoTotalAdicionaisEstoque,
              gastoAdd2: 0,
              gastoAdd3: 0,
            },
          });

          for (const baixaAdicional of baixasAdicionais) {
            await tx.movimentacaoAdicional.create({
              data: {
                movimentacaoId: movimentacao.id,
                codigoItem: baixaAdicional.codigoItem,
                nomeItem: baixaAdicional.nomeItem,
                quantidade: baixaAdicional.quantidade,
                custoUnitario: baixaAdicional.custoUnitario,
                custoTotal: baixaAdicional.custoTotal,
              },
            });
          }

          if (produtoEhKit) {
            for (const componente of movimentosComponentesKit) {
              await tx.movimentacao.create({
                data: {
                  codigoMovimentacao: `MOV-${randomUUID()}`,
                  tipoMovimentacao: "SAÍDA COMPONENTE KIT",
                  origemTipo: "pedido_online_kit_componente",
                  origemId: pedido.id,
                  codigoItem: componente.codigoItem,
                  itemTipo: "produto",
                  quantidade: componente.quantidade,
                  tamanhoAnel: componente.tamanhoAnel,
                  custo: componente.custoTotal,
                  faturamento: 0,
                  documentoCliente: documento || null,
                  status: "ATIVA",
                  relacionadoA: pedidoItem.id,
                  gastoProdutoPrincipal: componente.custoTotal,
                  gastoAdd1: 0,
                  gastoAdd2: 0,
                  gastoAdd3: 0,
                },
              });
            }
          }
        }

        return {
          id: pedido.id,
          codigo: pedido.codigo,
          cashbackPrevistoValor,
        };
      },
      {
        maxWait: 15000,
        timeout: 120000,
      }
    );

    return NextResponse.json({
      ok: true,
      pedidoId: pedidoCriado.id,
      codigo: pedidoCriado.codigo,
      cashbackPrevistoValor: pedidoCriado.cashbackPrevistoValor,
    });
  } catch (error) {
    console.error("Erro ao finalizar pedido online:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao finalizar pedido online.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}