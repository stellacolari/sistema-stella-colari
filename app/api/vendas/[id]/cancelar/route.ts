import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MOTIVOS_VALIDOS = [
  "DESISTENCIA_CLIENTE",
  "ERRO_OPERACIONAL",
  "DADOS_INCORRETOS",
  "PRODUTO_INDISPONIVEL",
  "PAGAMENTO_NAO_APROVADO",
  "VENDA_DUPLICADA",
  "OUTRO",
];

type MovimentacaoVendaComAdicionais = Prisma.MovimentacaoGetPayload<{
  include: {
    adicionaisConsumidos: true;
  };
}>;

function gerarCodigoMovimentacaoEstorno() {
  return `MOV-EST-${crypto.randomUUID()}`;
}

function recalcularCustoMedio(valorAcumulado: number, quantidadeAtual: number) {
  if (quantidadeAtual <= 0) {
    return 0;
  }

  return valorAcumulado / quantidadeAtual;
}

function tamanhoEstoqueProduto(tamanhoAnel: string | null | undefined) {
  const tamanho = String(tamanhoAnel ?? "").trim();

  return tamanho || "UNICO";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const motivo = String(body.motivo || "").trim();
    const observacao = String(body.observacao || "").trim();

    if (!MOTIVOS_VALIDOS.includes(motivo)) {
      return NextResponse.json(
        { error: "Motivo de cancelamento inválido ou não informado." },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const venda = await tx.venda.findUnique({
          where: { id },
          include: {
            cliente: true,
            itens: {
              include: {
                produto: true,
              },
            },
          },
        });

        if (!venda) {
          throw new Error("Venda não encontrada.");
        }

        if (venda.status === "CANCELADA") {
          throw new Error("Esta venda já está cancelada.");
        }

        if (venda.status === "NA_LIXEIRA") {
          throw new Error(
            "Não é possível cancelar uma venda que está na lixeira."
          );
        }

        const movimentacoesVenda = await tx.movimentacao.findMany({
          where: {
            origemTipo: "pedido_venda",
            origemId: venda.id,
          },
          include: {
            adicionaisConsumidos: true,
          },
        });

        for (const vendaItem of venda.itens) {
          const tamanhoEstoque = tamanhoEstoqueProduto(vendaItem.tamanhoAnel);

          const estoqueProduto = await tx.estoqueProduto.findUnique({
            where: {
              produtoId_tamanhoAnel: {
                produtoId: vendaItem.produtoId,
                tamanhoAnel: tamanhoEstoque,
              },
            },
          });

          const quantidadeProdutoDevolvida = vendaItem.quantidade;
          const valorProdutoDevolvido = Number(vendaItem.gastoProduto);

          if (estoqueProduto) {
            const novaQuantidade =
              estoqueProduto.quantidadeAtual + quantidadeProdutoDevolvida;

            const novoValor =
              Number(estoqueProduto.valorAcumulado) + valorProdutoDevolvido;

            await tx.estoqueProduto.update({
              where: { id: estoqueProduto.id },
              data: {
                quantidadeAtual: novaQuantidade,
                valorAcumulado: novoValor,
                custoMedio: recalcularCustoMedio(novoValor, novaQuantidade),
              },
            });
          } else {
            await tx.estoqueProduto.create({
              data: {
                produtoId: vendaItem.produtoId,
                tamanhoAnel: tamanhoEstoque,
                quantidadeAtual: quantidadeProdutoDevolvida,
                valorAcumulado: valorProdutoDevolvido,
                custoMedio: recalcularCustoMedio(
                  valorProdutoDevolvido,
                  quantidadeProdutoDevolvida
                ),
              },
            });
          }

          const movimentacaoOriginal:
            | MovimentacaoVendaComAdicionais
            | undefined = movimentacoesVenda.find(
            (movimentacao: MovimentacaoVendaComAdicionais) =>
              movimentacao.relacionadoA === vendaItem.id
          );

          const adicionaisDaMovimentacao =
            movimentacaoOriginal?.adicionaisConsumidos ?? [];

          for (const adicionalConsumido of adicionaisDaMovimentacao) {
            const itemAdicional = await tx.itemAdicional.findUnique({
              where: {
                codigoInterno: adicionalConsumido.codigoItem,
              },
            });

            if (!itemAdicional) {
              throw new Error(
                `Item adicional não encontrado para estorno: ${adicionalConsumido.codigoItem}`
              );
            }

            const quantidadeAdicionalDevolvida = Math.round(
              Number(adicionalConsumido.quantidade)
            );

            const valorAdicionalDevolvido = Number(
              adicionalConsumido.custoTotal
            );

            const estoqueAdicional = await tx.estoqueAdicional.findUnique({
              where: {
                itemAdicionalId: itemAdicional.id,
              },
            });

            if (estoqueAdicional) {
              const novaQuantidade =
                estoqueAdicional.quantidadeAtual + quantidadeAdicionalDevolvida;

              const novoValor =
                Number(estoqueAdicional.valorAcumulado) +
                valorAdicionalDevolvido;

              await tx.estoqueAdicional.update({
                where: { id: estoqueAdicional.id },
                data: {
                  quantidadeAtual: novaQuantidade,
                  valorAcumulado: novoValor,
                  custoMedio: recalcularCustoMedio(novoValor, novaQuantidade),
                },
              });
            } else {
              await tx.estoqueAdicional.create({
                data: {
                  itemAdicionalId: itemAdicional.id,
                  quantidadeAtual: quantidadeAdicionalDevolvida,
                  valorAcumulado: valorAdicionalDevolvido,
                  custoMedio: recalcularCustoMedio(
                    valorAdicionalDevolvido,
                    quantidadeAdicionalDevolvida
                  ),
                },
              });
            }
          }

          const custoTotalItem =
            Number(vendaItem.gastoProduto) + Number(vendaItem.gastoAdicionais);

          const movimentacaoEstorno = await tx.movimentacao.create({
            data: {
              codigoMovimentacao: gerarCodigoMovimentacaoEstorno(),
              tipoMovimentacao: "ESTORNO_VENDA",
              origemTipo: "cancelamento_venda",
              origemId: venda.id,
              codigoItem: vendaItem.produto.codigoInterno,
              itemTipo: "produto",
              quantidade: vendaItem.quantidade,
              tamanhoAnel: vendaItem.tamanhoAnel,
              custo: -custoTotalItem,
              faturamento: -Number(vendaItem.valorTotal),
              documentoCliente: venda.cliente.documento,
              status: "ATIVA",
              relacionadoA: vendaItem.id,
              gastoProdutoPrincipal: -Number(vendaItem.gastoProduto),
              gastoAdd1: movimentacaoOriginal
                ? -Number(movimentacaoOriginal.gastoAdd1)
                : 0,
              gastoAdd2: movimentacaoOriginal
                ? -Number(movimentacaoOriginal.gastoAdd2)
                : 0,
              gastoAdd3: movimentacaoOriginal
                ? -Number(movimentacaoOriginal.gastoAdd3)
                : 0,
            },
          });

          if (adicionaisDaMovimentacao.length > 0) {
            await tx.movimentacaoAdicional.createMany({
              data: adicionaisDaMovimentacao.map((adicional) => ({
                movimentacaoId: movimentacaoEstorno.id,
                codigoItem: adicional.codigoItem,
                nomeItem: adicional.nomeItem,
                quantidade: Number(adicional.quantidade),
                custoUnitario: Number(adicional.custoUnitario),
                custoTotal: -Number(adicional.custoTotal),
              })),
            });
          }
        }

        const vendaCancelada = await tx.venda.update({
          where: { id: venda.id },
          data: {
            status: "CANCELADA",
            cancelamentoMotivo: motivo,
            cancelamentoObservacao: observacao || null,
            canceladoEm: new Date(),
          },
        });

        return vendaCancelada;
      }
    );

    return NextResponse.json({
      ok: true,
      vendaId: resultado.id,
      status: resultado.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao cancelar venda.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}