import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pbkdf2Sync, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  cotarFreteMelhorEnvio,
  getCepOrigemMelhorEnvio,
} from "@/lib/frete/melhor-envio";
import {
  buscarConfiguracaoFrete,
  FRETE_MANUAL_ID,
  FRETE_RETIRADA_LOCAL_ID,
} from "@/lib/frete/configuracao";
import {
  persistirPlanoEmbalagemPedido,
  type ItemPedidoPlanoEmbalagem,
} from "@/lib/embalagens/persistir-plano-pedido";
import { validarEmbalagemPresenteCarrinho } from "@/lib/embalagens/presente-loja";
import { registrarConsentimentoWhatsappPublico } from "@/lib/clientes/consentimentos-cliente";
import type { FreteOpcao, FreteProdutoPayload } from "@/lib/frete/types";

const CHAVE_CASHBACK_CONFIG = "PADRAO";
const COOKIE_CLIENTE_ID = "stella_cliente_id";

type CheckoutItemPayload = {
  produtoId: string;
  tamanhoAnel?: string | null;
  quantidade: number;
  embalagemPresenteModeloId?: string | null;
  embalagemPresenteMensagem?: string | null;
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

function normalizarCep(cep: unknown) {
  return String(cep || "").replace(/\D/g, "");
}

function selecionarOpcaoFrete(
  opcoes: FreteOpcao[],
  freteOpcaoId: string
) {
  return (
    opcoes.find((opcao) => opcao.id === freteOpcaoId && !opcao.erro) || null
  );
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function montarOpcaoRetiradaLocal(texto: string): FreteOpcao {
  return {
    id: FRETE_RETIRADA_LOCAL_ID,
    servicoId: FRETE_RETIRADA_LOCAL_ID,
    nome: "Retirada local",
    transportadora: "Retirada local",
    valor: 0,
    prazoDias: 0,
    descricao: texto || "Retirada local sem custo de frete.",
    provider: "RETIRADA_LOCAL",
    tipoEntrega: "RETIRADA",
  };
}

function montarOpcaoManual(valor: number, prazoDias: number): FreteOpcao {
  return {
    id: FRETE_MANUAL_ID,
    servicoId: FRETE_MANUAL_ID,
    nome: "Frete manual",
    transportadora: "Frete manual",
    valor,
    prazoDias,
    descricao: "Frete configurado manualmente.",
    provider: "MANUAL",
    tipoEntrega: "ENTREGA",
  };
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();

    const clienteCookieId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";
    const criarCadastro = Boolean(body.criarCadastro);
    const consentimentoWhatsapp = body.consentimentoWhatsapp === true;

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
    const freteOpcaoId = String(body.freteOpcaoId || "").trim();

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

    if (normalizarCep(cep).length !== 8) {
      return NextResponse.json(
        { error: "Informe um CEP válido para calcular o frete." },
        { status: 400 }
      );
    }

    if (!freteOpcaoId) {
      return NextResponse.json(
        { error: "Selecione uma opção de frete." },
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

    const freteConfig = await buscarConfiguracaoFrete();

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
        let subtotalEmbalagensPresente = 0;
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
          tamanhoAnel: string | null;
          preco: ReturnType<typeof calcularPrecoProduto>;
          totalProdutoItem: number;
          opcaoAdicional: Awaited<ReturnType<typeof buscarOpcaoAdicionalValida>>;
          valorVendaAdicionalUnitario: number;
          custoAdicionalUnitario: number;
          valorVendaAdicionalTotal: number;
          embalagemPresente: Awaited<
            ReturnType<typeof validarEmbalagemPresenteCarrinho>
          >;
          valorEmbalagemPresenteUnitario: number;
          valorEmbalagemPresenteTotal: number;
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

          const embalagemPresente = await validarEmbalagemPresenteCarrinho({
            client: tx,
            produto: {
              id: produto.id,
              categoria: produto.categoria,
              embalagemClasseId: produto.embalagemClasseId,
              permiteEmbalagemPresente: produto.permiteEmbalagemPresente,
              embalagemPresentePadraoId: produto.embalagemPresentePadraoId,
            },
            modeloId: item.embalagemPresenteModeloId,
            mensagem: item.embalagemPresenteMensagem,
          });

          const valorEmbalagemPresenteUnitario = embalagemPresente
            ? Number(embalagemPresente.preco || 0)
            : 0;

          const valorEmbalagemPresenteTotal =
            valorEmbalagemPresenteUnitario * quantidade;

          subtotalEmbalagensPresente += valorEmbalagemPresenteTotal;

          const itemPodeGerarCashback =
            cashbackConfig.permitirProdutoComDesconto ||
            !preco.produtoComDesconto;

          const cashbackBaseItemBruta = itemPodeGerarCashback
            ? totalProdutoItem +
              valorVendaAdicionalTotal +
              valorEmbalagemPresenteTotal
            : 0;

          cashbackBaseBruta += cashbackBaseItemBruta;

          itensProcessados.push({
            item,
            quantidade,
            produto,
            tamanhoAnel,
            preco,
            totalProdutoItem,
            opcaoAdicional,
            valorVendaAdicionalUnitario,
            custoAdicionalUnitario,
            valorVendaAdicionalTotal,
            embalagemPresente,
            valorEmbalagemPresenteUnitario,
            valorEmbalagemPresenteTotal,
            cashbackBaseItemBruta,
          });
        }

        const subtotalBruto =
          subtotalProdutos + subtotalAdicionais + subtotalEmbalagensPresente;

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

        const produtosFrete: FreteProdutoPayload[] = itensProcessados.map(
          (itemProcessado) => ({
            id: itemProcessado.produto.id,
            nome: itemProcessado.produto.nome,
            quantidade: itemProcessado.quantidade,
            valorUnitario: Number(itemProcessado.preco.precoUnitario || 0),
          })
        );
        const opcoesFrete: FreteOpcao[] = [];

        if (freteConfig.retiradaLocalHabilitada) {
          opcoesFrete.push(
            montarOpcaoRetiradaLocal(freteConfig.retiradaLocalTexto)
          );
        }

        if (freteConfig.provedor === "MANUAL") {
          opcoesFrete.push(
            montarOpcaoManual(
              freteConfig.valorAdicional,
              freteConfig.prazoAdicionalDias
            )
          );
        }

        if (freteConfig.provedor === "MELHOR_ENVIO") {
          if (!freteConfig.melhorEnvioTokenConfigurado) {
            throw new Error(
              "Token do Melhor Envio não configurado. Configure MELHOR_ENVIO_TOKEN no ambiente."
            );
          }

          if (freteConfig.cepOrigem.length !== 8) {
            throw new Error(
              "CEP de origem do frete não configurado. Ajuste em Configurações > Frete e entrega."
            );
          }

          const opcoesMelhorEnvio = await cotarFreteMelhorEnvio(
            {
              cepDestino: cep,
              produtos: produtosFrete,
            },
            freteConfig
          );

          opcoesFrete.push(...opcoesMelhorEnvio);
        }

        const freteSelecionado = selecionarOpcaoFrete(
          opcoesFrete,
          freteOpcaoId
        );

        if (!freteSelecionado) {
          throw new Error(
            "A opção de frete selecionada não está mais disponível. Recalcule o frete."
          );
        }

        const valorFrete = Number(freteSelecionado.valor || 0);
        const totalPedido = subtotal + valorFrete;
        const providerFrete = freteSelecionado.provider || freteConfig.provedor;
        const tipoEntrega = freteSelecionado.tipoEntrega || "ENTREGA";
        const cepOrigem =
          providerFrete === "MELHOR_ENVIO"
            ? getCepOrigemMelhorEnvio(freteConfig)
            : freteConfig.cepOrigem;
        const freteDadosJson = toPrismaJson({
          provider: providerFrete,
          opcao: freteSelecionado,
          cepOrigem,
          cepDestino: normalizarCep(cep),
        });

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
            frete: valorFrete,
            total: totalPedido,
            status: "PEDIDO_RECEBIDO",
            dadosOriginaisJson: {
              frete: freteDadosJson,
            },

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
            tipoEntrega,
            transportadora: freteSelecionado.transportadora || null,
            servico: freteSelecionado.nome || null,
            statusEnvio: "PENDENTE",
            cepOrigem: cepOrigem || null,
            cepDestino: cep || null,
            valorFrete,
            prazoDias: freteSelecionado.prazoDias,
            gatewayLogistico: providerFrete,
            gatewayEnvioId: freteSelecionado.servicoId,
            observacoes: JSON.stringify({
              provider: providerFrete,
              cotacao: freteSelecionado,
            }),
          },
        });

        const embalagensPresenteSnapshot: unknown[] = [];
        const itensPlanoEmbalagem: ItemPedidoPlanoEmbalagem[] = [];

        for (const itemProcessado of itensProcessados) {
          const {
            quantidade,
            produto,
            tamanhoAnel,
            preco,
            totalProdutoItem,
            opcaoAdicional,
            valorVendaAdicionalUnitario,
            custoAdicionalUnitario,
            valorVendaAdicionalTotal,
            embalagemPresente,
            valorEmbalagemPresenteUnitario,
            valorEmbalagemPresenteTotal,
            cashbackBaseItemBruta,
          } = itemProcessado;

          const custoAdicionalTotalInformado =
            custoAdicionalUnitario * quantidade;

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

          itensPlanoEmbalagem.push({
            pedidoOnlineItemId: pedidoItem.id,
            produtoId: produto.id,
            nome: produto.nome,
            quantidade,
            embalagemClasseId: produto.embalagemClasseId,
            embalagemUnidades: produto.embalagemUnidades,
            embalagemCompartilhavel: produto.embalagemCompartilhavel,
            embalagemIndividualObrigatoria:
              produto.embalagemIndividualObrigatoria,
            embalagemPresenteModeloId: embalagemPresente?.id || null,
            pesoGramas: produto.pesoGramas,
          });

          if (embalagemPresente) {
            await tx.pedidoOnlineItemEmbalagemPresente.create({
              data: {
                pedidoOnlineId: pedido.id,
                pedidoOnlineItemId: pedidoItem.id,
                embalagemModeloId: embalagemPresente.id,
                nomeSnapshot: embalagemPresente.nome,
                descricaoSnapshot: embalagemPresente.descricao,
                imagemUrlSnapshot: embalagemPresente.imagemUrl,
                precoUnitario: valorEmbalagemPresenteUnitario,
                valorTotal: valorEmbalagemPresenteTotal,
                quantidade,
                mensagem: embalagemPresente.mensagem,
                substituiEmbalagemPadrao:
                  embalagemPresente.substituiEmbalagemPadrao,
              },
            });

            embalagensPresenteSnapshot.push({
              pedidoOnlineItemId: pedidoItem.id,
              produtoId: produto.id,
              codigoInterno: produto.codigoInterno,
              nomeProduto: produto.nome,
              quantidade,
              embalagemPresenteModeloId: embalagemPresente.id,
              nome: embalagemPresente.nome,
              imagemUrl: embalagemPresente.imagemUrl,
              descricao: embalagemPresente.descricao,
              precoUnitario: valorEmbalagemPresenteUnitario,
              valorTotal: valorEmbalagemPresenteTotal,
              mensagem: embalagemPresente.mensagem,
              substituiEmbalagemPadrao:
                embalagemPresente.substituiEmbalagemPadrao,
            });
          }

          if (opcaoAdicional) {
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
                custoUnitario: custoAdicionalUnitario,
                valorVendaUnitario: valorVendaAdicionalUnitario,
                custoTotal: custoAdicionalTotalInformado,
                valorVendaTotal: valorVendaAdicionalTotal,
                lucroTotal:
                  valorVendaAdicionalTotal - custoAdicionalTotalInformado,
              },
            });
          }
        }

        await persistirPlanoEmbalagemPedido({
          tx,
          pedidoOnlineId: pedido.id,
          itens: itensPlanoEmbalagem,
        });

        if (embalagensPresenteSnapshot.length > 0) {
          await tx.pedidoOnline.update({
            where: {
              id: pedido.id,
            },
            data: {
              dadosOriginaisJson: toPrismaJson({
                frete: freteDadosJson,
                embalagensPresente: embalagensPresenteSnapshot,
              }),
            },
          });
        }

        return {
          id: pedido.id,
          codigo: pedido.codigo,
          cashbackPrevistoValor,
          clienteId,
        };
      },
      {
        maxWait: 15000,
        timeout: 120000,
      }
    );

    if (consentimentoWhatsapp && pedidoCriado.clienteId) {
      try {
        await registrarConsentimentoWhatsappPublico({
          clienteId: pedidoCriado.clienteId,
          origem: "CHECKOUT",
        });
      } catch (error) {
        console.error(
          "Erro ao registrar consentimento publico no checkout:",
          error
        );
      }
    }

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
