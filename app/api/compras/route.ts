import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ItemCompraPayload = {
  id: string;
  tipo: "produto" | "adicional";
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  custoBase: number;
  fornecedorPadrao: string;
  quantidade: number;
  tamanhoAnel?: string | null;
};

type ProdutoComKit = Prisma.ProdutoGetPayload<{
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

function gerarCodigoCompra(numero: number) {
  return `PC${String(numero).padStart(6, "0")}`;
}

function calcularCustoMedio(valorAcumulado: number, quantidadeAtual: number) {
  if (quantidadeAtual <= 0) {
    return 0;
  }

  return valorAcumulado / quantidadeAtual;
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getVariacaoPrincipalProduto(produto: ProdutoComKit) {
  return (
    produto.variacoes.find(
      (variacao) =>
        variacao.ativo &&
        variacao.obrigatoria !== false &&
        variacao.opcoes.some((opcao) => opcao.ativo)
    ) || null
  );
}

function produtoExigeVariacao(produto: ProdutoComKit) {
  return Boolean(getVariacaoPrincipalProduto(produto));
}

function normalizarOpcaoVariacao(valor: string | null | undefined) {
  return String(valor ?? "").trim();
}

function validarOpcaoVariacaoProduto({
  produto,
  opcaoInformada,
}: {
  produto: ProdutoComKit;
  opcaoInformada: string;
}) {
  const variacao = getVariacaoPrincipalProduto(produto);

  if (!variacao) {
    return null;
  }

  const opcaoNormalizada = normalizarTexto(opcaoInformada);

  const opcaoEncontrada = variacao.opcoes.find(
    (opcao) => opcao.ativo && normalizarTexto(opcao.nome) === opcaoNormalizada
  );

  return opcaoEncontrada?.nome || null;
}

function calcularRateioKit(produto: ProdutoComKit, valorTotalFinalItem: number) {
  const componentes = produto.componentesDoKit;

  const pesos = componentes.map((componente) => {
    const custoBaseComponente = Number(componente.componenteProduto.custoBase || 0);

    return {
      componente,
      peso: custoBaseComponente * componente.quantidade,
    };
  });

  const pesoTotal = pesos.reduce((acc, item) => acc + item.peso, 0);

  if (pesoTotal > 0) {
    return pesos.map((item) => ({
      componente: item.componente,
      valorRateado: valorTotalFinalItem * (item.peso / pesoTotal),
    }));
  }

  const quantidadeTotalComponentes = componentes.reduce(
    (acc, componente) => acc + componente.quantidade,
    0
  );

  return componentes.map((componente) => ({
    componente,
    valorRateado:
      quantidadeTotalComponentes > 0
        ? valorTotalFinalItem * (componente.quantidade / quantidadeTotalComponentes)
        : 0,
  }));
}

async function registrarEntradaEstoqueProduto({
  tx,
  produtoId,
  tamanhoAnel,
  quantidade,
  valorEntrada,
}: {
  tx: Prisma.TransactionClient;
  produtoId: string;
  tamanhoAnel: string;
  quantidade: number;
  valorEntrada: number;
}) {
  const estoqueExistente = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId,
        tamanhoAnel,
      },
    },
  });

  if (estoqueExistente) {
    const novaQuantidade = estoqueExistente.quantidadeAtual + quantidade;
    const novoValor = Number(estoqueExistente.valorAcumulado) + valorEntrada;

    await tx.estoqueProduto.update({
      where: { id: estoqueExistente.id },
      data: {
        quantidadeAtual: novaQuantidade,
        valorAcumulado: novoValor,
        custoMedio: calcularCustoMedio(novoValor, novaQuantidade),
      },
    });

    return;
  }

  await tx.estoqueProduto.create({
    data: {
      produtoId,
      tamanhoAnel,
      quantidadeAtual: quantidade,
      valorAcumulado: valorEntrada,
      custoMedio: calcularCustoMedio(valorEntrada, quantidade),
    },
  });
}

async function registrarEntradaEstoqueAdicional({
  tx,
  itemAdicionalId,
  quantidade,
  valorEntrada,
}: {
  tx: Prisma.TransactionClient;
  itemAdicionalId: string;
  quantidade: number;
  valorEntrada: number;
}) {
  const estoqueExistente = await tx.estoqueAdicional.findFirst({
    where: { itemAdicionalId },
  });

  if (estoqueExistente) {
    const novaQuantidade = estoqueExistente.quantidadeAtual + quantidade;
    const novoValor = Number(estoqueExistente.valorAcumulado) + valorEntrada;

    await tx.estoqueAdicional.update({
      where: { id: estoqueExistente.id },
      data: {
        quantidadeAtual: novaQuantidade,
        valorAcumulado: novoValor,
        custoMedio: calcularCustoMedio(novoValor, novaQuantidade),
      },
    });

    return;
  }

  await tx.estoqueAdicional.create({
    data: {
      itemAdicionalId,
      quantidadeAtual: quantidade,
      valorAcumulado: valorEntrada,
      custoMedio: calcularCustoMedio(valorEntrada, quantidade),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fornecedor = String(body.fornecedor || "").trim();
    const frete = Number(body.frete || 0);
    const observacoes = String(body.observacoes || "").trim();
    const itens: ItemCompraPayload[] = Array.isArray(body.itens)
      ? body.itens
      : [];

    if (!fornecedor) {
      return NextResponse.json(
        { error: "Fornecedor é obrigatório." },
        { status: 400 }
      );
    }

    if (itens.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um item à compra." },
        { status: 400 }
      );
    }

    const itemInvalido = itens.find(
      (item: ItemCompraPayload) =>
        !item.id ||
        !item.codigoInterno ||
        !item.nome ||
        !["produto", "adicional"].includes(item.tipo) ||
        !Number.isFinite(Number(item.custoBase)) ||
        !Number.isFinite(Number(item.quantidade)) ||
        Number(item.quantidade) <= 0
    );

    if (itemInvalido) {
      return NextResponse.json(
        {
          error: `Item inválido na compra: ${
            itemInvalido.nome || "sem nome"
          }.`,
        },
        { status: 400 }
      );
    }

    const subtotalProdutos = itens
      .filter((item: ItemCompraPayload) => item.tipo === "produto")
      .reduce(
        (acc: number, item: ItemCompraPayload) =>
          acc + Number(item.custoBase) * item.quantidade,
        0
      );

    let descontoPercentual = 0;

    if (subtotalProdutos > 3000) descontoPercentual = 20;
    else if (subtotalProdutos > 2000) descontoPercentual = 15;
    else if (subtotalProdutos > 1200) descontoPercentual = 10;
    else if (subtotalProdutos > 800) descontoPercentual = 5;

    const subtotalAdicionais = itens
      .filter((item: ItemCompraPayload) => item.tipo === "adicional")
      .reduce(
        (acc: number, item: ItemCompraPayload) =>
          acc + Number(item.custoBase) * item.quantidade,
        0
      );

    const valorDescontoProdutos =
      subtotalProdutos * (descontoPercentual / 100);

    const valorTotalBruto = subtotalProdutos + subtotalAdicionais;

    const valorTotalFinal =
      subtotalProdutos -
      valorDescontoProdutos +
      subtotalAdicionais +
      frete;

    const ultimoRegistro = await prisma.compra.findFirst({
      orderBy: { criadoEm: "desc" },
      select: { codigo: true },
    });

    let proximoNumero = 1;

    if (ultimoRegistro?.codigo) {
      const numeroAtual = Number(ultimoRegistro.codigo.replace("PC", ""));

      if (!Number.isNaN(numeroAtual)) {
        proximoNumero = numeroAtual + 1;
      }
    }

    const codigoCompra = gerarCodigoCompra(proximoNumero);

    const resultado = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const compra = await tx.compra.create({
          data: {
            codigo: codigoCompra,
            fornecedor,
            descontoPercentual,
            frete,
            observacoes: observacoes || null,
            valorTotalBruto,
            valorTotalFinal,
            status: "ATIVA",
          },
        });

        for (const item of itens) {
          const valorUnitarioBase = Number(item.custoBase);

          const valorUnitarioFinal =
            item.tipo === "produto"
              ? valorUnitarioBase * (1 - descontoPercentual / 100)
              : valorUnitarioBase;

          const valorTotalBase = valorUnitarioBase * item.quantidade;
          const valorTotalFinalItem = valorUnitarioFinal * item.quantidade;

          if (item.tipo === "produto") {
            const produto = await tx.produto.findUnique({
              where: { id: item.id },
              include: {
                componentesDoKit: {
                  include: {
                    componenteProduto: true,
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

            if (!produto) {
              throw new Error(`Produto não encontrado: ${item.nome}`);
            }

            const produtoEhKit = produto.tipoProduto === "KIT";

            if (produtoEhKit && produto.componentesDoKit.length === 0) {
              throw new Error(
                `O kit ${produto.nome} não possui componentes cadastrados.`
              );
            }

            const exigeVariacao = !produtoEhKit && produtoExigeVariacao(produto);

            const opcaoVariacaoInformada = exigeVariacao
              ? normalizarOpcaoVariacao(item.tamanhoAnel)
              : null;

            const opcaoVariacaoValida =
              exigeVariacao && opcaoVariacaoInformada
                ? validarOpcaoVariacaoProduto({
                    produto,
                    opcaoInformada: opcaoVariacaoInformada,
                  })
                : null;

            if (exigeVariacao && !opcaoVariacaoValida) {
              const nomeVariacao =
                getVariacaoPrincipalProduto(produto)?.nome || "variação";

              throw new Error(
                `Informe uma opção válida de ${nomeVariacao} para o produto: ${produto.nome}`
              );
            }

            const tamanhoAnel = exigeVariacao ? opcaoVariacaoValida : null;

            const tamanhoEstoque: string = exigeVariacao
              ? opcaoVariacaoValida || "UNICO"
              : "UNICO";

            const compraItem = await tx.compraItem.create({
              data: {
                compraId: compra.id,
                tipoItem: "produto",
                codigoDigitado: item.codigoInterno,
                descricao: item.nome,
                quantidade: item.quantidade,
                tamanhoAnel,
                valorUnitarioBase,
                valorUnitarioFinal,
                valorTotalBase,
                valorTotalFinal: valorTotalFinalItem,
                parcelaFrete: 0,
                valorTotalComFrete: valorTotalFinalItem,
                produtoId: produto.id,
                itemAdicionalId: null,
              },
            });

            if (!produtoEhKit) {
              await registrarEntradaEstoqueProduto({
                tx,
                produtoId: produto.id,
                tamanhoAnel: tamanhoEstoque,
                quantidade: item.quantidade,
                valorEntrada: valorTotalFinalItem,
              });

              await tx.movimentacao.create({
                data: {
                  codigoMovimentacao: `MOV-${crypto.randomUUID()}`,
                  tipoMovimentacao: "ENTRADA",
                  origemTipo: "pedido_compra",
                  origemId: compra.id,
                  codigoItem: item.codigoInterno,
                  itemTipo: "produto",
                  quantidade: item.quantidade,
                  tamanhoAnel,
                  custo: valorTotalFinalItem,
                  faturamento: 0,
                  documentoCliente: null,
                  status: "ATIVA",
                  relacionadoA: compraItem.id,
                  gastoProdutoPrincipal: 0,
                  gastoAdd1: 0,
                  gastoAdd2: 0,
                  gastoAdd3: 0,
                },
              });

              continue;
            }

            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: `MOV-${crypto.randomUUID()}`,
                tipoMovimentacao: "REGISTRO COMPRA KIT",
                origemTipo: "pedido_compra_kit",
                origemId: compra.id,
                codigoItem: produto.codigoInterno,
                itemTipo: "kit",
                quantidade: item.quantidade,
                tamanhoAnel: null,
                custo: valorTotalFinalItem,
                faturamento: 0,
                documentoCliente: null,
                status: "INFO",
                relacionadoA: compraItem.id,
                gastoProdutoPrincipal: 0,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });

            const rateios = calcularRateioKit(produto, valorTotalFinalItem);

            for (const rateio of rateios) {
              const componente = rateio.componente;
              const produtoComponente = componente.componenteProduto;

              const quantidadeEntrada =
                item.quantidade * componente.quantidade;

              const tamanhoComponente = "UNICO";

              await registrarEntradaEstoqueProduto({
                tx,
                produtoId: produtoComponente.id,
                tamanhoAnel: tamanhoComponente,
                quantidade: quantidadeEntrada,
                valorEntrada: rateio.valorRateado,
              });

              await tx.movimentacao.create({
                data: {
                  codigoMovimentacao: `MOV-${crypto.randomUUID()}`,
                  tipoMovimentacao: "ENTRADA COMPONENTE KIT",
                  origemTipo: "pedido_compra_kit_componente",
                  origemId: compra.id,
                  codigoItem: produtoComponente.codigoInterno,
                  itemTipo: "produto",
                  quantidade: quantidadeEntrada,
                  tamanhoAnel: tamanhoComponente,
                  custo: rateio.valorRateado,
                  faturamento: 0,
                  documentoCliente: null,
                  status: "ATIVA",
                  relacionadoA: compraItem.id,
                  gastoProdutoPrincipal: 0,
                  gastoAdd1: 0,
                  gastoAdd2: 0,
                  gastoAdd3: 0,
                },
              });
            }
          }

          if (item.tipo === "adicional") {
            const adicional = await tx.itemAdicional.findUnique({
              where: { id: item.id },
            });

            if (!adicional) {
              throw new Error(`Item adicional não encontrado: ${item.nome}`);
            }

            const compraItem = await tx.compraItem.create({
              data: {
                compraId: compra.id,
                tipoItem: "adicional",
                codigoDigitado: item.codigoInterno,
                descricao: item.nome,
                quantidade: item.quantidade,
                tamanhoAnel: null,
                valorUnitarioBase,
                valorUnitarioFinal,
                valorTotalBase,
                valorTotalFinal: valorTotalFinalItem,
                parcelaFrete: 0,
                valorTotalComFrete: valorTotalFinalItem,
                produtoId: null,
                itemAdicionalId: adicional.id,
              },
            });

            await registrarEntradaEstoqueAdicional({
              tx,
              itemAdicionalId: adicional.id,
              quantidade: item.quantidade,
              valorEntrada: valorTotalFinalItem,
            });

            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: `MOV-${crypto.randomUUID()}`,
                tipoMovimentacao: "ENTRADA",
                origemTipo: "pedido_compra",
                origemId: compra.id,
                codigoItem: item.codigoInterno,
                itemTipo: "adicional",
                quantidade: item.quantidade,
                tamanhoAnel: null,
                custo: valorTotalFinalItem,
                faturamento: 0,
                documentoCliente: null,
                status: "ATIVA",
                relacionadoA: compraItem.id,
                gastoProdutoPrincipal: 0,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          }
        }

        return compra;
      },
      {
        maxWait: 15000,
        timeout: 120000,
      }
    );

    return NextResponse.json({ ok: true, compraId: resultado.id });
  } catch (error) {
    console.error("Erro ao finalizar compra:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao finalizar compra.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}