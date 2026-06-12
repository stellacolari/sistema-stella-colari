import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelarPedidoOnlineNaoPago } from "@/lib/pedidos/cancelar-pedido-online";

const STATUS_VALIDOS = new Set([
  "PEDIDO_RECEBIDO",
  "PEDIDO_SEPARADO",
  "PEDIDO_ENVIADO",
  "PEDIDO_ENTREGUE",
  "CANCELADO",
  "PROBLEMA",
]);

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

function getStatusEnvioSincronizado(statusPedido: string) {
  if (statusPedido === "PEDIDO_ENVIADO") {
    return "POSTADO";
  }

  if (statusPedido === "PEDIDO_ENTREGUE") {
    return "ENTREGUE";
  }

  if (statusPedido === "PROBLEMA") {
    return "PROBLEMA";
  }

  if (statusPedido === "CANCELADO") {
    return "PROBLEMA";
  }

  return "PENDENTE";
}

function getDatasEnvioSincronizadas(statusPedido: string) {
  const agora = new Date();

  if (statusPedido === "PEDIDO_ENVIADO") {
    return {
      postadoEm: agora,
      entregueEm: null,
    };
  }

  if (statusPedido === "PEDIDO_ENTREGUE") {
    return {
      postadoEm: agora,
      entregueEm: agora,
    };
  }

  return {
    postadoEm: null,
    entregueEm: null,
  };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const statusNovo = String(body.statusNovo || "").trim();
    const observacao = parseStringOrNull(body.observacao);
    const origem = String(body.origem || "ADMIN").trim() || "ADMIN";
    const usuarioNome = parseStringOrNull(body.usuarioNome);

    if (!STATUS_VALIDOS.has(statusNovo)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 }
      );
    }

const pedidoAtual = await prisma.pedidoOnline.findUnique({
  where: { id },
  select: {
    id: true,
    status: true,
    statusPagamento: true,
    origemCanal: true,
    cep: true,
  },
});

if (!pedidoAtual) {
  return NextResponse.json(
    { error: "Pedido não encontrado." },
    { status: 404 }
  );
}

if (statusNovo === "CANCELADO") {
  const resultado = await cancelarPedidoOnlineNaoPago({
    pedidoId: id,
    origem,
    usuarioNome,
    permitirPedidoPago: pedidoAtual.origemCanal === "LOJA_STELLA",
    observacao:
      observacao ||
      "Pedido cancelado manualmente pela área administrativa.",
  });

  return NextResponse.json(resultado);
}

const statusEnvioSincronizado = getStatusEnvioSincronizado(statusNovo);
    const datasEnvioSincronizadas = getDatasEnvioSincronizadas(statusNovo);

    const resultado = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedidoOnline.update({
        where: { id },
        data: {
          status: statusNovo,
        },
        select: {
          id: true,
          codigo: true,
          status: true,
        },
      });

      const historico = await tx.pedidoStatusHistorico.create({
        data: {
          pedidoOnlineId: id,
          statusAnterior: pedidoAtual.status,
          statusNovo,
          tipoEvento: "MANUAL",
          origem,
          usuarioNome,
          observacao,
        },
      });

      await tx.pedidoEnvio.upsert({
        where: {
          pedidoOnlineId: id,
        },
        create: {
          pedidoOnlineId: id,
          tipoEntrega: "ENTREGA",
          statusEnvio: statusEnvioSincronizado,
          cepDestino: pedidoAtual.cep || null,
          postadoEm: datasEnvioSincronizadas.postadoEm,
          entregueEm: datasEnvioSincronizadas.entregueEm,
        },
        update: {
          statusEnvio: statusEnvioSincronizado,
          postadoEm: datasEnvioSincronizadas.postadoEm,
          entregueEm: datasEnvioSincronizadas.entregueEm,
        },
      });

      return {
        pedido,
        historico,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar status do pedido.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
