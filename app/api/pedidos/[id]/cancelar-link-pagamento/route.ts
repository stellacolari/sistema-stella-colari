import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  AdminPermissaoError,
  exigirPermissaoGerenciarPagamentoPedidoAdmin,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

const STATUS_PENDENTES = new Set([
  "AGUARDANDO_PAGAMENTO",
  "PENDENTE",
  "PROCESSANDO_PAGAMENTO",
]);

function mergeDadosOriginaisJson(
  dadosAtuais: Prisma.JsonValue,
  dadosCancelamento: Record<string, Prisma.InputJsonValue | null>
) {
  const base =
    dadosAtuais && typeof dadosAtuais === "object" && !Array.isArray(dadosAtuais)
      ? (dadosAtuais as Prisma.JsonObject)
      : {};

  return {
    ...base,
    linkPagamentoCancelado: dadosCancelamento,
  };
}

async function expirarCheckoutStripe(sessionId: string | null) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return {
      statusPagamento: "CANCELADO",
      observacaoStripe: sessionId
        ? "Chave Stripe ausente. Pedido cancelado localmente."
        : "Pedido sem sessão Stripe vinculada. Pedido cancelado localmente.",
    };
  }

  try {
    const { stripe } = await import("@/lib/stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid" || session.status === "complete") {
      throw new Error("Sessão Stripe já foi paga/concluída.");
    }

    if (session.status === "expired") {
      return {
        statusPagamento: "EXPIRADO",
        observacaoStripe: "Sessão Stripe já estava expirada.",
      };
    }

    await stripe.checkout.sessions.expire(sessionId);

    return {
      statusPagamento: "EXPIRADO",
      observacaoStripe: "Sessão Stripe expirada manualmente.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao expirar sessão Stripe.";

    if (message.toLowerCase().includes("expired")) {
      return {
        statusPagamento: "EXPIRADO",
        observacaoStripe: "Sessão Stripe já estava expirada.",
      };
    }

    throw new Error(`Não foi possível expirar a sessão Stripe: ${message}`);
  }
}

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await exigirPermissaoGerenciarPagamentoPedidoAdmin();

    const { id } = await context.params;

    const pedido = await prisma.pedidoOnline.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        origemCanal: true,
        status: true,
        statusPagamento: true,
        gatewayPagamento: true,
        gatewayPedidoId: true,
        dadosOriginaisJson: true,
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (pedido.origemCanal !== "ADMIN_MANUAL") {
      return NextResponse.json(
        { error: "Esta ação é permitida apenas para links manuais." },
        { status: 400 }
      );
    }

    if (pedido.statusPagamento === "PAGO") {
      return NextResponse.json(
        { error: "Não é possível cancelar link de pedido já pago." },
        { status: 409 }
      );
    }

    if (!STATUS_PENDENTES.has(pedido.statusPagamento)) {
      return NextResponse.json(
        { error: "Este pedido não está mais pendente de pagamento." },
        { status: 409 }
      );
    }

    const resultadoStripe =
      pedido.gatewayPagamento === "STRIPE"
        ? await expirarCheckoutStripe(pedido.gatewayPedidoId)
        : {
            statusPagamento: "CANCELADO",
            observacaoStripe: "Gateway não é Stripe. Pedido cancelado localmente.",
          };

    const agora = new Date();
    const observacao = `${resultadoStripe.observacaoStripe} Cancelamento solicitado manualmente na central de pedidos.`;

    const resultado = await prisma.$transaction(async (tx) => {
      const pedidoAtual = await tx.pedidoOnline.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          statusPagamento: true,
        },
      });

      if (!pedidoAtual) {
        throw new Error("Pedido não encontrado.");
      }

      if (pedidoAtual.statusPagamento === "PAGO") {
        throw new Error("Não é possível cancelar link de pedido já pago.");
      }

      if (!STATUS_PENDENTES.has(pedidoAtual.statusPagamento)) {
        throw new Error("Este pedido não está mais pendente de pagamento.");
      }

      const pedidoAtualizado = await tx.pedidoOnline.update({
        where: { id },
        data: {
          status: "CANCELADO",
          statusPagamento: resultadoStripe.statusPagamento,
          pagamentoObservacao: observacao,
          dadosOriginaisJson: mergeDadosOriginaisJson(
            pedido.dadosOriginaisJson,
            {
              canceladoEm: agora.toISOString(),
              origem: "ADMIN_MANUAL",
              gatewayPagamento: pedido.gatewayPagamento,
              gatewayPedidoId: pedido.gatewayPedidoId,
              statusPagamento: resultadoStripe.statusPagamento,
              observacao,
            }
          ),
          statusHistorico: {
            create: {
              statusAnterior: pedidoAtual.status,
              statusNovo: "CANCELADO",
              tipoEvento: "MANUAL",
              origem: "ADMIN_MANUAL",
              usuarioNome: "Sistema",
              observacao,
            },
          },
        },
        select: {
          id: true,
          codigo: true,
          status: true,
          statusPagamento: true,
          pagamentoObservacao: true,
        },
      });

      return {
        pedido: pedidoAtualizado,
        estoqueBaixado: false,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao cancelar link de pagamento manual:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao cancelar link de pagamento manual.";

    return NextResponse.json(
      { error: message },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
