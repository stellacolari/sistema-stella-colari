import "server-only";

import { prisma } from "@/lib/prisma";

export async function creditarCashbackPedidoIdempotente(pedidoId: string) {
  return prisma.$transaction(async (tx) => {
    const bloqueio = await tx.pedidoOnline.updateMany({
      where: {
        id: pedidoId,
        cashbackStatus: "PENDENTE",
        clienteId: {
          not: null,
        },
        cashbackPrevistoValor: {
          gt: 0,
        },
      },
      data: {
        cashbackStatus: "PROCESSANDO",
      },
    });

    if (bloqueio.count === 0) return null;

    const pedido = await tx.pedidoOnline.findUnique({
      where: {
        id: pedidoId,
      },
      select: {
        id: true,
        codigo: true,
        clienteId: true,
        cashbackPrevistoValor: true,
      },
    });

    if (
      !pedido?.clienteId ||
      Number(pedido.cashbackPrevistoValor || 0) <= 0
    ) {
      throw new Error("Pedido sem dados validos para credito de cashback.");
    }

    const valor = Number(pedido.cashbackPrevistoValor);
    const agora = new Date();

    await tx.cliente.update({
      where: {
        id: pedido.clienteId,
      },
      data: {
        cashbackSaldo: {
          increment: valor,
        },
      },
    });

    await tx.clienteCashbackMovimentacao.create({
      data: {
        clienteId: pedido.clienteId,
        tipo: "CREDITO",
        status: "EFETIVADO",
        origemTipo: "PEDIDO_ONLINE",
        origemId: pedido.id,
        valor,
        observacao: `Cashback creditado pelo pedido ${pedido.codigo}.`,
      },
    });

    const finalizacao = await tx.pedidoOnline.updateMany({
      where: {
        id: pedido.id,
        cashbackStatus: "PROCESSANDO",
      },
      data: {
        cashbackStatus: "CREDITADO",
        cashbackCreditadoValor: valor,
        cashbackCreditadoEm: agora,
      },
    });

    if (finalizacao.count !== 1) {
      throw new Error("Nao foi possivel finalizar o credito de cashback.");
    }

    return {
      creditado: true,
      valor,
    };
  });
}
