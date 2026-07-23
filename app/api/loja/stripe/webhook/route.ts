import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { cancelarPedidoOnlineNaoPago } from "@/lib/pedidos/cancelar-pedido-online";
import { efetivarPedidoOnlinePago } from "@/lib/pedidos/efetivar-pedido-online-pago";
import { efetivarPedidoManualPagoComoVenda } from "@/lib/vendas/efetivar-pedido-manual";
import { creditarCashbackPedidoIdempotente } from "@/lib/clientes/creditar-cashback-pedido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function validarCorrelacaoSessao(
  session: Stripe.Checkout.Session,
  pedidoId: string,
) {
  const pedido = await prisma.pedidoOnline.findUnique({
    where: {
      id: pedidoId,
    },
    select: {
      id: true,
      codigo: true,
      origemCanal: true,
      total: true,
      gatewayPedidoId: true,
    },
  });

  if (!pedido) return null;

  const totalEsperado = Math.round(Number(pedido.total || 0) * 100);
  const referenciaValida =
    !session.client_reference_id ||
    session.client_reference_id === pedido.id;
  const moedaValida = String(session.currency || "").toLowerCase() === "brl";
  const valorValido =
    typeof session.amount_total === "number" &&
    session.amount_total === totalEsperado;
  const sessaoValida = pedido.gatewayPedidoId === session.id;

  if (!referenciaValida || !moedaValida || !valorValido || !sessaoValida) {
    return null;
  }

  return pedido;
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
    console.error("Webhook Stripe indisponivel: secret ausente.");
    return NextResponse.json(
      { error: "Webhook indisponivel." },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Assinatura ausente." },
      { status: 400 },
    );
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    console.warn("Webhook Stripe rejeitado por assinatura invalida.");
    return NextResponse.json(
      { error: "Webhook invalido." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const pedidoId = session.metadata?.pedidoId || "";

      if (!pedidoId || session.payment_status !== "paid") {
        return NextResponse.json({ received: true });
      }

      const pedido = await validarCorrelacaoSessao(session, pedidoId);

      if (!pedido) {
        console.error("Webhook Stripe rejeitado por divergencia de correlacao.");
        return NextResponse.json(
          { error: "Evento nao correlacionado." },
          { status: 409 },
        );
      }

      const valorPago = Number(session.amount_total || 0) / 100;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      if (session.metadata?.origem === "ADMIN_MANUAL") {
        if (pedido.origemCanal !== "ADMIN_MANUAL") {
          console.error(
            "Webhook Stripe manual rejeitado por origem de pedido invalida.",
          );
          return NextResponse.json(
            { error: "Origem de pedido invalida." },
            { status: 409 },
          );
        }

        await efetivarPedidoManualPagoComoVenda({
          pedidoId,
          gatewayPagamentoId: paymentIntentId,
          valorPago,
        });

        return NextResponse.json({ received: true });
      }

      if (pedido.origemCanal !== "LOJA_STELLA") {
        console.error("Webhook Stripe rejeitado por origem de pedido invalida.");
        return NextResponse.json(
          { error: "Origem de pedido invalida." },
          { status: 409 },
        );
      }

      await efetivarPedidoOnlinePago({
        pedidoId,
        gatewayPedidoId: session.id,
        gatewayPagamentoId: paymentIntentId,
        gatewayPagamento: "STRIPE",
        metodoPagamento: "STRIPE_CHECKOUT",
        valorPago,
        origemHistorico: "STRIPE",
        usuarioNomeHistorico: "Stripe",
        pagamentoObservacao: `Pagamento confirmado via Stripe para o pedido ${pedido.codigo}.`,
        historicoObservacao:
          "Pagamento confirmado via Stripe. Estoque de produtos e adicionais processado.",
      });

      await creditarCashbackPedidoIdempotente(pedidoId);
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const pedidoId = session.metadata?.pedidoId || "";

      if (!pedidoId) {
        return NextResponse.json({ received: true });
      }

      const pedido = await validarCorrelacaoSessao(session, pedidoId);

      if (!pedido) {
        console.error(
          "Webhook Stripe expirado rejeitado por divergencia de correlacao.",
        );
        return NextResponse.json(
          { error: "Evento nao correlacionado." },
          { status: 409 },
        );
      }

      await cancelarPedidoOnlineNaoPago({
        pedidoId,
        origem: "STRIPE",
        usuarioNome: "Stripe",
        observacao: `Sessao Stripe expirada para o pedido ${pedido.codigo}. Pedido cancelado automaticamente.`,
      });
    }

    return NextResponse.json({ received: true });
  } catch {
    console.error("Erro interno ao processar webhook Stripe.");
    return NextResponse.json(
      { error: "Erro ao processar webhook Stripe." },
      { status: 500 },
    );
  }
}
