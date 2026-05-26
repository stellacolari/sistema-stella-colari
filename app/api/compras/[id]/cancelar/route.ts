import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MOTIVOS_VALIDOS = [
  "ERRO_OPERACIONAL",
  "COMPRA_DUPLICADA",
  "DADOS_INCORRETOS",
  "FORNECEDOR_CANCELADO",
  "PRODUTOS_DEVOLVIDOS",
  "TESTE_SISTEMA",
  "OUTRO",
];

function gerarCodigoMovimentacaoEstornoCompra() {
  return `MOV-EST-COMPRA-${crypto.randomUUID()}`;
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
        const compra = await tx.compra.findUnique({
          where: { id },
          include: {
            itens: true,
          },
        });

        if (!compra) {
          throw new Error("Compra não encontrada.");
        }

        if (compra.status === "CANCELADA") {
          throw new Error("Esta compra já está cancelada.");
        }

        if (compra.status === "NA_LIXEIRA") {
          throw new Error(
            "Não é possível cancelar uma compra que está na lixeira."
          );
        }

        for (const item of compra.itens) {
          if (item.tipoItem === "produto") {
            if (!item.produtoId) {
              throw new Error(
                `Item de compra sem produto vinculado: ${item.descricao}`
              );
            }

            const produto = await tx.produto.findUnique({
              where: { id: item.produtoId },
            });

            if (!produto) {
              throw new Error(`Produto não encontrado: ${item.descricao}`);
            }

            const tamanhoEstoque = tamanhoEstoqueProduto(item.tamanhoAnel);

            const estoqueProduto = await tx.estoqueProduto.findUnique({
              where: {
                produtoId_tamanhoAnel: {
                  produtoId: item.produtoId,
                  tamanhoAnel: tamanhoEstoque,
                },
              },
            });

            if (!estoqueProduto) {
              throw new Error(
                tamanhoEstoque !== "UNICO"
                  ? `Estoque não encontrado para o produto ${item.descricao} tamanho ${tamanhoEstoque}.`
                  : `Estoque não encontrado para o produto: ${item.descricao}.`
              );
            }

            if (estoqueProduto.quantidadeAtual < item.quantidade) {
              throw new Error(
                tamanhoEstoque !== "UNICO"
                  ? `Não é possível cancelar a compra. O estoque atual de ${item.descricao} tamanho ${tamanhoEstoque} é menor que a quantidade comprada.`
                  : `Não é possível cancelar a compra. O estoque atual de ${item.descricao} é menor que a quantidade comprada.`
              );
            }

            const valorParaRemover = Number(
              item.valorTotalComFrete || item.valorTotalFinal
            );
            const novaQuantidade =
              estoqueProduto.quantidadeAtual - item.quantidade;
            const novoValor =
              Number(estoqueProduto.valorAcumulado) - valorParaRemover;

            const valorSeguro = novoValor > 0 ? novoValor : 0;

            await tx.estoqueProduto.update({
              where: { id: estoqueProduto.id },
              data: {
                quantidadeAtual: novaQuantidade,
                valorAcumulado: valorSeguro,
                custoMedio: recalcularCustoMedio(
                  valorSeguro,
                  novaQuantidade
                ),
              },
            });

            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: gerarCodigoMovimentacaoEstornoCompra(),
                tipoMovimentacao: "ESTORNO_COMPRA",
                origemTipo: "cancelamento_compra",
                origemId: compra.id,
                codigoItem: produto.codigoInterno,
                itemTipo: "produto",
                quantidade: item.quantidade,
                tamanhoAnel: item.tamanhoAnel,
                custo: -valorParaRemover,
                faturamento: 0,
                documentoCliente: null,
                status: "ATIVA",
                relacionadoA: item.id,
                gastoProdutoPrincipal: -valorParaRemover,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          }

          if (item.tipoItem === "adicional") {
            if (!item.itemAdicionalId) {
              throw new Error(
                `Item de compra sem adicional vinculado: ${item.descricao}`
              );
            }

            const adicional = await tx.itemAdicional.findUnique({
              where: { id: item.itemAdicionalId },
            });

            if (!adicional) {
              throw new Error(
                `Item adicional não encontrado: ${item.descricao}`
              );
            }

            const estoqueAdicional = await tx.estoqueAdicional.findUnique({
              where: {
                itemAdicionalId: item.itemAdicionalId,
              },
            });

            if (!estoqueAdicional) {
              throw new Error(
                `Estoque não encontrado para o adicional: ${item.descricao}`
              );
            }

            if (estoqueAdicional.quantidadeAtual < item.quantidade) {
              throw new Error(
                `Não é possível cancelar a compra. O estoque atual de ${item.descricao} é menor que a quantidade comprada.`
              );
            }

            const valorParaRemover = Number(
              item.valorTotalComFrete || item.valorTotalFinal
            );
            const novaQuantidade =
              estoqueAdicional.quantidadeAtual - item.quantidade;
            const novoValor =
              Number(estoqueAdicional.valorAcumulado) - valorParaRemover;

            const valorSeguro = novoValor > 0 ? novoValor : 0;

            await tx.estoqueAdicional.update({
              where: { id: estoqueAdicional.id },
              data: {
                quantidadeAtual: novaQuantidade,
                valorAcumulado: valorSeguro,
                custoMedio: recalcularCustoMedio(
                  valorSeguro,
                  novaQuantidade
                ),
              },
            });

            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: gerarCodigoMovimentacaoEstornoCompra(),
                tipoMovimentacao: "ESTORNO_COMPRA",
                origemTipo: "cancelamento_compra",
                origemId: compra.id,
                codigoItem: adicional.codigoInterno,
                itemTipo: "adicional",
                quantidade: item.quantidade,
                tamanhoAnel: null,
                custo: -valorParaRemover,
                faturamento: 0,
                documentoCliente: null,
                status: "ATIVA",
                relacionadoA: item.id,
                gastoProdutoPrincipal: 0,
                gastoAdd1: -valorParaRemover,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          }
        }

        const compraCancelada = await tx.compra.update({
          where: { id: compra.id },
          data: {
            status: "CANCELADA",
            cancelamentoMotivo: motivo,
            cancelamentoObservacao: observacao || null,
            canceladoEm: new Date(),
          },
        });

        return compraCancelada;
      }
    );

    return NextResponse.json({
      ok: true,
      compraId: resultado.id,
      status: resultado.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao cancelar compra.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}