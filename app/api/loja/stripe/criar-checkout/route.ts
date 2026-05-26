import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const url = new URL(req.url);

  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const codigo = String(body.codigo || "").trim();

    if (!codigo) {
      return NextResponse.json(
        { error: "Código do pedido não informado." },
        { status: 400 }
      );
    }

    const pedido = await prisma.pedidoOnline.findUnique({
      where: {
        codigo,
      },
      select: {
        id: true,
        codigo: true,
        total: true,
        statusPagamento: true,
        nomeCliente: true,
        emailCliente: true,
        gatewayPedidoId: true,
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (pedido.statusPagamento === "PAGO") {
      return NextResponse.json(
        { error: "Este pedido já está pago." },
        { status: 400 }
      );
    }

    const totalCentavos = Math.round(Number(pedido.total || 0) * 100);

    if (totalCentavos <= 0) {
      return NextResponse.json(
        { error: "O total do pedido é inválido para pagamento online." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: pedido.emailCliente || undefined,
      client_reference_id: pedido.id,
      metadata: {
        pedidoId: pedido.id,
        pedidoCodigo: pedido.codigo,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: totalCentavos,
            product_data: {
              name: `Pedido ${pedido.codigo} - Loja Stella`,
              description: `Pedido realizado por ${pedido.nomeCliente}`,
            },
          },
        },
      ],
      success_url: `${baseUrl}/loja/pedido/${pedido.codigo}?pagamento=sucesso`,
      cancel_url: `${baseUrl}/loja/pedido/${pedido.codigo}?pagamento=cancelado`,
    });

    await prisma.pedidoOnline.update({
      where: {
        id: pedido.id,
      },
      data: {
        gatewayPagamento: "STRIPE",
        gatewayPedidoId: session.id,
        metodoPagamento: "STRIPE_CHECKOUT",
        pagamentoObservacao: "Checkout Stripe criado para pagamento online.",
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Erro ao criar checkout Stripe:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao criar checkout de pagamento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}