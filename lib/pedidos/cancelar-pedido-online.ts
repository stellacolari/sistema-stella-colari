import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizarTamanhoEstoque } from "@/lib/loja/estoque";

function calcularCustoMedio(valorAcumulado: number, quantidadeAtual: number) {
  if (quantidadeAtual <= 0) {
    return 0;
  }

  return valorAcumulado / quantidadeAtual;
}

async function restaurarEstoqueProduto({
  tx,
  codigoInterno,
  tamanhoAnel,
  quantidade,
  custoTotal,
}: {
  tx: Prisma.TransactionClient;
  codigoInterno: string;
  tamanhoAnel: string | null | undefined;
  quantidade: number;
  custoTotal: number;
}) {
  if (!codigoInterno || quantidade <= 0) {
    return;
  }

  const produto = await tx.produto.findUnique({
    where: {
      codigoInterno,
    },
    select: {
      id: true,
    },
  });

  if (!produto) {
    return;
  }

  const tamanhoEstoque = normalizarTamanhoEstoque(tamanhoAnel);

  const estoqueAtualizado = await tx.estoqueProduto.upsert({
    where: {
      produtoId_tamanhoAnel: {
        produtoId: produto.id,
        tamanhoAnel: tamanhoEstoque,
      },
    },
    create: {
      produtoId: produto.id,
      tamanhoAnel: tamanhoEstoque,
      quantidadeAtual: quantidade,
      valorAcumulado: custoTotal,
      custoMedio: calcularCustoMedio(custoTotal, quantidade),
    },
    update: {
      quantidadeAtual: {
        increment: quantidade,
      },
      valorAcumulado: {
        increment: custoTotal,
      },
    },
  });

  await tx.estoqueProduto.update({
    where: {
      id: estoqueAtualizado.id,
    },
    data: {
      custoMedio: calcularCustoMedio(
        Number(estoqueAtualizado.valorAcumulado || 0),
        estoqueAtualizado.quantidadeAtual
      ),
    },
  });
}

async function restaurarEstoqueAdicional({
  tx,
  codigoItem,
  quantidade,
  custoTotal,
}: {
  tx: Prisma.TransactionClient;
  codigoItem: string;
  quantidade: number;
  custoTotal: number;
}) {
  if (!codigoItem || quantidade <= 0) {
    return;
  }

  const itemAdicional = await tx.itemAdicional.findUnique({
    where: {
      codigoInterno: codigoItem,
    },
    select: {
      id: true,
    },
  });

  if (!itemAdicional) {
    return;
  }

  const estoqueAtualizado = await tx.estoqueAdicional.upsert({
    where: {
      itemAdicionalId: itemAdicional.id,
    },
    create: {
      itemAdicionalId: itemAdicional.id,
      quantidadeAtual: quantidade,
      valorAcumulado: custoTotal,
      custoMedio: calcularCustoMedio(custoTotal, quantidade),
    },
    update: {
      quantidadeAtual: {
        increment: quantidade,
      },
      valorAcumulado: {
        increment: custoTotal,
      },
    },
  });

  await tx.estoqueAdicional.update({
    where: {
      id: estoqueAtualizado.id,
    },
    data: {
      custoMedio: calcularCustoMedio(
        Number(estoqueAtualizado.valorAcumulado || 0),
        estoqueAtualizado.quantidadeAtual
      ),
    },
  });
}

export async function cancelarPedidoOnlineNaoPago({
  pedidoId,
  origem = "SISTEMA",
  usuarioNome = "Sistema",
  observacao,
  permitirPedidoPago = false,
}: {
  pedidoId: string;
  origem?: string;
  usuarioNome?: string | null;
  observacao?: string | null;
  permitirPedidoPago?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedidoOnline.findUnique({
      where: {
        id: pedidoId,
      },
      select: {
        id: true,
        codigo: true,
        status: true,
        statusPagamento: true,
        clienteId: true,
        cashbackUsadoValor: true,
        cep: true,
      },
    });

    if (!pedido) {
      throw new Error("Pedido não encontrado.");
    }

    if (pedido.status === "CANCELADO") {
      return {
        pedido,
        cancelado: false,
        motivo: "Pedido já estava cancelado.",
      };
    }

    if (pedido.statusPagamento === "PAGO" && !permitirPedidoPago) {
      throw new Error(
        "Este pedido já está pago. Para cancelar, faça um fluxo de reembolso/estorno."
      );
    }

    const movimentacoes = await tx.movimentacao.findMany({
      where: {
        origemId: pedido.id,
        status: "ATIVA",
      },
      include: {
        adicionaisConsumidos: true,
      },
      orderBy: {
        criadoEm: "asc",
      },
    });

    for (const movimento of movimentacoes) {
      const deveRestaurarProduto =
        movimento.itemTipo === "produto" &&
        (movimento.tipoMovimentacao === "SAÍDA" ||
          movimento.tipoMovimentacao === "SAÍDA COMPONENTE KIT");

      if (deveRestaurarProduto) {
        await restaurarEstoqueProduto({
          tx,
          codigoInterno: movimento.codigoItem,
          tamanhoAnel: movimento.tamanhoAnel,
          quantidade: movimento.quantidade,
          custoTotal: Number(movimento.gastoProdutoPrincipal || 0),
        });
      }

      for (const adicional of movimento.adicionaisConsumidos) {
        await restaurarEstoqueAdicional({
          tx,
          codigoItem: adicional.codigoItem,
          quantidade: Math.round(Number(adicional.quantidade || 0)),
          custoTotal: Number(adicional.custoTotal || 0),
        });
      }
    }

    await tx.movimentacao.updateMany({
      where: {
        origemId: pedido.id,
        status: "ATIVA",
      },
      data: {
        status: "CANCELADA",
      },
    });

    const cashbackUsadoValor = Number(pedido.cashbackUsadoValor || 0);

    if (cashbackUsadoValor > 0 && pedido.clienteId) {
      const estornoExistente = await tx.clienteCashbackMovimentacao.findFirst({
        where: {
          clienteId: pedido.clienteId,
          origemTipo: "PEDIDO_ONLINE",
          origemId: pedido.id,
          tipo: "ESTORNO",
        },
        select: {
          id: true,
        },
      });

      if (!estornoExistente) {
        await tx.cliente.update({
          where: {
            id: pedido.clienteId,
          },
          data: {
            cashbackSaldo: {
              increment: cashbackUsadoValor,
            },
          },
        });

        await tx.clienteCashbackMovimentacao.create({
          data: {
            clienteId: pedido.clienteId,
            tipo: "ESTORNO",
            status: "EFETIVADO",
            origemTipo: "PEDIDO_ONLINE",
            origemId: pedido.id,
            valor: cashbackUsadoValor,
            observacao: `Cashback devolvido pelo cancelamento do pedido ${pedido.codigo}.`,
          },
        });
      }
    }

    const pedidoPago = pedido.statusPagamento === "PAGO";
    const pedidoCancelado = await tx.pedidoOnline.update({
      where: {
        id: pedido.id,
      },
      data: {
        status: "CANCELADO",
        statusPagamento: pedidoPago ? "PAGO" : "CANCELADO",
        pagamentoObservacao:
          observacao ||
          "Pedido cancelado automaticamente antes da confirmação do pagamento.",
      },
      select: {
        id: true,
        codigo: true,
        status: true,
        statusPagamento: true,
      },
    });

    await tx.pedidoEnvio.upsert({
      where: {
        pedidoOnlineId: pedido.id,
      },
      create: {
        pedidoOnlineId: pedido.id,
        tipoEntrega: "ENTREGA",
        statusEnvio: "PROBLEMA",
        cepDestino: pedido.cep || null,
      },
      update: {
        statusEnvio: "PROBLEMA",
      },
    });

    await tx.pedidoStatusHistorico.create({
      data: {
        pedidoOnlineId: pedido.id,
        statusAnterior: pedido.status,
        statusNovo: "CANCELADO",
        tipoEvento: "AUTOMATICO",
        origem,
        usuarioNome,
        observacao:
          observacao ||
          "Pedido cancelado antes da confirmação do pagamento. Estoque e cashback usados foram estornados.",
      },
    });

    return {
      pedido: pedidoCancelado,
      cancelado: true,
      cashbackDevolvido: cashbackUsadoValor,
      movimentacoesCanceladas: movimentacoes.length,
      estoqueRestaurado: movimentacoes.length > 0,
      pagamentoMantidoPago: pedidoPago,
    };
  });
}
