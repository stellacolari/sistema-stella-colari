import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_PAGAMENTO_VALIDOS = new Set([
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "RECUSADO",
  "ESTORNADO",
  "CANCELADO",
]);

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

function parseNumero(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return 0;
  }

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");

  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return numero;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const statusPagamento = String(
      body.statusPagamento || "AGUARDANDO_PAGAMENTO"
    ).trim();

    if (!STATUS_PAGAMENTO_VALIDOS.has(statusPagamento)) {
      return NextResponse.json(
        { error: "Status de pagamento inválido." },
        { status: 400 }
      );
    }

    const pedidoAtual = await prisma.pedidoOnline.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        total: true,
        pagoEm: true,
        statusPagamento: true,

        clienteId: true,
        cashbackStatus: true,
        cashbackPrevistoValor: true,
        cashbackCreditadoValor: true,
        cashbackCreditadoEm: true,
      },
    });

    if (!pedidoAtual) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const valorPagoInformado = parseNumero(body.valorPago);
    const valorPago =
      statusPagamento === "PAGO"
        ? valorPagoInformado > 0
          ? valorPagoInformado
          : Number(pedidoAtual.total || 0)
        : valorPagoInformado;

    const resultado = await prisma.$transaction(async (tx) => {
      const pagamento = await tx.pedidoOnline.update({
        where: { id },
        data: {
          statusPagamento,
          metodoPagamento: parseStringOrNull(body.metodoPagamento),
          gatewayPagamento: parseStringOrNull(body.gatewayPagamento),
          gatewayPedidoId: parseStringOrNull(body.gatewayPedidoId),
          gatewayPagamentoId: parseStringOrNull(body.gatewayPagamentoId),
          valorPago,
          pagamentoObservacao: parseStringOrNull(body.pagamentoObservacao),
          pagoEm:
            statusPagamento === "PAGO"
              ? pedidoAtual.pagoEm || new Date()
              : statusPagamento === "AGUARDANDO_PAGAMENTO"
              ? null
              : pedidoAtual.pagoEm,
        },
        select: {
          id: true,
          codigo: true,
          statusPagamento: true,
          metodoPagamento: true,
          gatewayPagamento: true,
          gatewayPedidoId: true,
          gatewayPagamentoId: true,
          valorPago: true,
          pagamentoObservacao: true,
          pagoEm: true,
        },
      });

      let cashback:
        | {
            creditado?: boolean;
            estornado?: boolean;
            valor?: number;
            motivo?: string;
          }
        | null = null;

      const deveCreditarCashback =
        statusPagamento === "PAGO" &&
        pedidoAtual.cashbackStatus === "PENDENTE" &&
        pedidoAtual.clienteId &&
        Number(pedidoAtual.cashbackPrevistoValor || 0) > 0;

      if (deveCreditarCashback && pedidoAtual.clienteId) {
        const valorCashback = Number(pedidoAtual.cashbackPrevistoValor || 0);
        const agora = new Date();

        await tx.cliente.update({
          where: {
            id: pedidoAtual.clienteId,
          },
          data: {
            cashbackSaldo: {
              increment: valorCashback,
            },
          },
        });

        await tx.clienteCashbackMovimentacao.create({
          data: {
            clienteId: pedidoAtual.clienteId,
            tipo: "CREDITO",
            status: "EFETIVADO",
            origemTipo: "PEDIDO_ONLINE",
            origemId: pedidoAtual.id,
            valor: valorCashback,
            observacao: `Cashback creditado pelo pedido ${pedidoAtual.codigo}.`,
          },
        });

        await tx.pedidoOnline.update({
          where: {
            id: pedidoAtual.id,
          },
          data: {
            cashbackStatus: "CREDITADO",
            cashbackCreditadoValor: valorCashback,
            cashbackCreditadoEm: agora,
          },
        });

        cashback = {
          creditado: true,
          valor: valorCashback,
        };
      }

      const deveEstornarCashback =
        (statusPagamento === "ESTORNADO" || statusPagamento === "CANCELADO") &&
        pedidoAtual.cashbackStatus === "CREDITADO" &&
        pedidoAtual.clienteId &&
        Number(pedidoAtual.cashbackCreditadoValor || 0) > 0;

      if (deveEstornarCashback && pedidoAtual.clienteId) {
        const valorEstorno = Number(pedidoAtual.cashbackCreditadoValor || 0);

        const cliente = await tx.cliente.findUnique({
          where: {
            id: pedidoAtual.clienteId,
          },
          select: {
            cashbackSaldo: true,
          },
        });

        const saldoAtual = Number(cliente?.cashbackSaldo || 0);
        const novoSaldo = Math.max(saldoAtual - valorEstorno, 0);

        await tx.cliente.update({
          where: {
            id: pedidoAtual.clienteId,
          },
          data: {
            cashbackSaldo: novoSaldo,
          },
        });

        await tx.clienteCashbackMovimentacao.create({
          data: {
            clienteId: pedidoAtual.clienteId,
            tipo: "ESTORNO",
            status: "EFETIVADO",
            origemTipo: "PEDIDO_ONLINE",
            origemId: pedidoAtual.id,
            valor: -valorEstorno,
            observacao: `Cashback estornado pelo pedido ${pedidoAtual.codigo}.`,
          },
        });

        await tx.pedidoOnline.update({
          where: {
            id: pedidoAtual.id,
          },
          data: {
            cashbackStatus: "ESTORNADO",
          },
        });

        cashback = {
          estornado: true,
          valor: valorEstorno,
        };
      }

      if (
        statusPagamento === "PAGO" &&
        pedidoAtual.cashbackStatus === "PENDENTE" &&
        !pedidoAtual.clienteId
      ) {
        cashback = {
          creditado: false,
          valor: 0,
          motivo: "Pedido sem cliente cadastrado.",
        };
      }

      return {
        pagamento,
        cashback,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao atualizar pagamento do pedido:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar pagamento do pedido.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}