import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { cancelarPedidoOnlineNaoPago } from "@/lib/pedidos/cancelar-pedido-online";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function creditarCashbackDoPedido(pedidoId: string) {
  const pedidoAtual = await prisma.pedidoOnline.findUnique({
    where: {
      id: pedidoId,
    },
    select: {
      id: true,
      codigo: true,
      clienteId: true,
      cashbackStatus: true,
      cashbackPrevistoValor: true,
    },
  });

  if (!pedidoAtual) {
    return null;
  }

  const deveCreditarCashback =
    pedidoAtual.cashbackStatus === "PENDENTE" &&
    pedidoAtual.clienteId &&
    Number(pedidoAtual.cashbackPrevistoValor || 0) > 0;

  if (!deveCreditarCashback || !pedidoAtual.clienteId) {
    return null;
  }

  const valorCashback = Number(pedidoAtual.cashbackPrevistoValor || 0);
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.cliente.update({
      where: {
        id: pedidoAtual.clienteId as string,
      },
      data: {
        cashbackSaldo: {
          increment: valorCashback,
        },
      },
    });

    await tx.clienteCashbackMovimentacao.create({
      data: {
        clienteId: pedidoAtual.clienteId as string,
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
  });

  return {
    creditado: true,
    valor: valorCashback,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "stripe-webhook",
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado.");

    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado." },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("Assinatura Stripe ausente.");

    return NextResponse.json(
      { error: "Assinatura Stripe ausente." },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Erro ao validar webhook Stripe:", error);

    return NextResponse.json(
      { error: "Webhook Stripe inválido." },
      { status: 400 }
    );
  }

  try {
    console.log("Webhook Stripe recebido:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const pedidoId = session.metadata?.pedidoId || "";
      const pedidoCodigo = session.metadata?.pedidoCodigo || "";

      console.log("Checkout concluído:", {
        pedidoId,
        pedidoCodigo,
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });

      if (!pedidoId) {
        console.warn("Webhook sem pedidoId no metadata.");
        return NextResponse.json({ received: true });
      }

      if (session.payment_status !== "paid") {
        console.warn("Sessão concluída, mas pagamento ainda não está paid.");
        return NextResponse.json({ received: true });
      }

      const valorPago = Number(session.amount_total || 0) / 100;

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      const pedidoAtualizado = await prisma.pedidoOnline.update({
        where: {
          id: pedidoId,
        },
        data: {
          statusPagamento: "PAGO",
          metodoPagamento: "STRIPE_CHECKOUT",
          gatewayPagamento: "STRIPE",
          gatewayPedidoId: session.id,
          gatewayPagamentoId: paymentIntentId,
          valorPago,
          pagoEm: new Date(),
          pagamentoObservacao: `Pagamento confirmado via Stripe para o pedido ${pedidoCodigo}.`,
        },
        select: {
          id: true,
          codigo: true,
          statusPagamento: true,
        },
      });

      console.log("Pedido atualizado pelo Stripe:", pedidoAtualizado);

      const cashback = await creditarCashbackDoPedido(pedidoAtualizado.id);

      if (cashback) {
        console.log("Cashback creditado pelo Stripe:", cashback);
      }
    }
if (event.type === "checkout.session.expired") {
  const session = event.data.object;

  const pedidoId = session.metadata?.pedidoId || "";
  const pedidoCodigo = session.metadata?.pedidoCodigo || "";

  console.log("Checkout expirado:", {
    pedidoId,
    pedidoCodigo,
    sessionId: session.id,
  });

  if (!pedidoId) {
    console.warn("Webhook expired sem pedidoId no metadata.");
    return NextResponse.json({ received: true });
  }

  const cancelamento = await cancelarPedidoOnlineNaoPago({
    pedidoId,
    origem: "STRIPE",
    usuarioNome: "Stripe",
    observacao: `Sessão Stripe expirada para o pedido ${pedidoCodigo}. Pedido cancelado automaticamente.`,
  });

  console.log("Pedido cancelado por expiração Stripe:", cancelamento);
}
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook Stripe:", error);

    return NextResponse.json(
      { error: "Erro ao processar webhook Stripe." },
      { status: 500 }
    );
  }
}