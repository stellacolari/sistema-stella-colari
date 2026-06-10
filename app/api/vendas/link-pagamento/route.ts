import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { criarPedidoManualOnline } from "@/lib/vendas/pedido-manual-online";

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
    const body = await req.json();

    const clienteId = String(body.clienteId || "").trim();
    const meioVenda = String(body.meioVenda || "").trim();
    const descontoPercentual = Number(body.descontoPercentual || 0);
    const observacoes = String(body.observacoes || "").trim();
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const envio =
      body.envio && typeof body.envio === "object" ? body.envio : null;

    if (!clienteId) {
      return NextResponse.json(
        { error: "Cliente é obrigatório." },
        { status: 400 },
      );
    }

    if (!meioVenda) {
      return NextResponse.json(
        { error: "Meio de venda é obrigatório." },
        { status: 400 },
      );
    }

    if (meioVenda.trim().toUpperCase() === "SITE") {
      return NextResponse.json(
        { error: "Site é reservado para pedidos online." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(descontoPercentual) || descontoPercentual < 0) {
      return NextResponse.json(
        { error: "Desconto inválido." },
        { status: 400 },
      );
    }

    if (itens.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um produto." },
        { status: 400 },
      );
    }

    const pedido = await criarPedidoManualOnline({
      clienteId,
      meioVenda,
      descontoPercentual,
      observacoes,
      itens,
      envio,
    });

    const totalCentavos = Math.round(Number(pedido.total || 0) * 100);

    if (totalCentavos <= 0) {
      return NextResponse.json(
        { error: "O total do pedido é inválido para pagamento." },
        { status: 400 },
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
        clienteId,
        origem: "ADMIN_MANUAL",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: totalCentavos,
            product_data: {
              name: `Pedido ${pedido.codigo} - Stella`,
              description: `Venda manual para ${pedido.nomeCliente}`,
            },
          },
        },
      ],
      success_url: `${baseUrl}/loja/pedido/${pedido.codigo}?pagamento=sucesso`,
      cancel_url: `${baseUrl}/loja/pedido/${pedido.codigo}?pagamento=cancelado`,
    });

    await prisma.pedidoOnline.update({
      where: { id: pedido.id },
      data: {
        gatewayPagamento: "STRIPE",
        gatewayPedidoId: session.id,
        metodoPagamento: "STRIPE_CHECKOUT",
        pagamentoObservacao: "Link de pagamento manual criado via Stripe.",
      },
    });

    return NextResponse.json({
      ok: true,
      pedidoId: pedido.id,
      pedidoCodigo: pedido.codigo,
      paymentUrl: session.url,
      sessionId: session.id,
      total: pedido.total,
      frete: pedido.frete,
    });
  } catch (error) {
    console.error("Erro ao gerar link de pagamento:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao gerar link de pagamento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
