import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_ENVIO_VALIDOS = new Set([
  "PENDENTE",
  "COTADO",
  "PREPARADO",
  "ETIQUETA_COMPRADA",
  "ETIQUETA_GERADA",
  "POSTADO",
  "ENTREGUE",
  "PROBLEMA",
]);

const TIPO_ENTREGA_VALIDOS = new Set([
  "ENTREGA",
  "RETIRADA",
  "MOTOBOY",
  "OUTRO",
]);

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

function parseNumeroOuNull(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");

  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

function parseInteiroOuNull(value: unknown) {
  const numero = parseNumeroOuNull(value);

  if (numero === null) {
    return null;
  }

  return Math.trunc(numero);
}

function getDatasEnvioSincronizadas({
  statusEnvio,
  postadoEmAtual,
  entregueEmAtual,
}: {
  statusEnvio: string;
  postadoEmAtual?: Date | null;
  entregueEmAtual?: Date | null;
}) {
  const agora = new Date();

  if (statusEnvio === "POSTADO") {
    return {
      postadoEm: postadoEmAtual || agora,
      entregueEm: null,
    };
  }

  if (statusEnvio === "ENTREGUE") {
    return {
      postadoEm: postadoEmAtual || agora,
      entregueEm: entregueEmAtual || agora,
    };
  }

  return {
    postadoEm: null,
    entregueEm: null,
  };
}

function getStatusPedidoSincronizadoPorEnvio({
  statusEnvio,
  statusPedidoAtual,
}: {
  statusEnvio: string;
  statusPedidoAtual: string;
}) {
  if (statusEnvio === "POSTADO") {
    return "PEDIDO_ENVIADO";
  }

  if (statusEnvio === "ENTREGUE") {
    return "PEDIDO_ENTREGUE";
  }

  if (statusEnvio === "PROBLEMA") {
    return "PROBLEMA";
  }

  if (
    [
      "PENDENTE",
      "COTADO",
      "PREPARADO",
      "ETIQUETA_COMPRADA",
      "ETIQUETA_GERADA",
    ].includes(statusEnvio) &&
    ["PEDIDO_ENVIADO", "PEDIDO_ENTREGUE", "PROBLEMA"].includes(
      statusPedidoAtual
    )
  ) {
    return "PEDIDO_SEPARADO";
  }

  return null;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const pedido = await prisma.pedidoOnline.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        subtotal: true,
        status: true,
        envio: {
          select: {
            id: true,
            postadoEm: true,
            entregueEm: true,
          },
        },
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const tipoEntrega = String(body.tipoEntrega || "ENTREGA").trim();
    const statusEnvio = String(body.statusEnvio || "PENDENTE").trim();

    if (!TIPO_ENTREGA_VALIDOS.has(tipoEntrega)) {
      return NextResponse.json(
        { error: "Tipo de entrega inválido." },
        { status: 400 }
      );
    }

    if (!STATUS_ENVIO_VALIDOS.has(statusEnvio)) {
      return NextResponse.json(
        { error: "Status de envio inválido." },
        { status: 400 }
      );
    }

    const valorFrete = parseNumeroOuNull(body.valorFrete) ?? 0;
    const totalAtualizado = Number(pedido.subtotal || 0) + valorFrete;

    const datasEnvio = getDatasEnvioSincronizadas({
      statusEnvio,
      postadoEmAtual: pedido.envio?.postadoEm,
      entregueEmAtual: pedido.envio?.entregueEm,
    });

    const statusPedidoSincronizado = getStatusPedidoSincronizadoPorEnvio({
      statusEnvio,
      statusPedidoAtual: pedido.status,
    });

    const resultado = await prisma.$transaction(async (tx) => {
      const envio = await tx.pedidoEnvio.upsert({
        where: {
          pedidoOnlineId: id,
        },
        create: {
          pedidoOnlineId: id,
          tipoEntrega,
          transportadora: parseStringOrNull(body.transportadora),
          servico: parseStringOrNull(body.servico),
          statusEnvio,
          cepOrigem: parseStringOrNull(body.cepOrigem),
          cepDestino: parseStringOrNull(body.cepDestino),
          pesoGramas: parseNumeroOuNull(body.pesoGramas),
          alturaCm: parseNumeroOuNull(body.alturaCm),
          larguraCm: parseNumeroOuNull(body.larguraCm),
          comprimentoCm: parseNumeroOuNull(body.comprimentoCm),
          valorFrete,
          prazoDias: parseInteiroOuNull(body.prazoDias),
          codigoRastreio: parseStringOrNull(body.codigoRastreio),

          etiquetaUrl: parseStringOrNull(body.etiquetaUrl),
          etiquetaPdfUrl: parseStringOrNull(body.etiquetaPdfUrl),
          declaracaoConteudoUrl: parseStringOrNull(body.declaracaoConteudoUrl),
          gatewayLogistico: parseStringOrNull(body.gatewayLogistico),
          gatewayEnvioId: parseStringOrNull(body.gatewayEnvioId),

          observacoes: parseStringOrNull(body.observacoes),
          postadoEm: datasEnvio.postadoEm,
          entregueEm: datasEnvio.entregueEm,
        },
        update: {
          tipoEntrega,
          transportadora: parseStringOrNull(body.transportadora),
          servico: parseStringOrNull(body.servico),
          statusEnvio,
          cepOrigem: parseStringOrNull(body.cepOrigem),
          cepDestino: parseStringOrNull(body.cepDestino),
          pesoGramas: parseNumeroOuNull(body.pesoGramas),
          alturaCm: parseNumeroOuNull(body.alturaCm),
          larguraCm: parseNumeroOuNull(body.larguraCm),
          comprimentoCm: parseNumeroOuNull(body.comprimentoCm),
          valorFrete,
          prazoDias: parseInteiroOuNull(body.prazoDias),
          codigoRastreio: parseStringOrNull(body.codigoRastreio),

          etiquetaUrl: parseStringOrNull(body.etiquetaUrl),
          etiquetaPdfUrl: parseStringOrNull(body.etiquetaPdfUrl),
          declaracaoConteudoUrl: parseStringOrNull(body.declaracaoConteudoUrl),
          gatewayLogistico: parseStringOrNull(body.gatewayLogistico),
          gatewayEnvioId: parseStringOrNull(body.gatewayEnvioId),

          observacoes: parseStringOrNull(body.observacoes),
          postadoEm: datasEnvio.postadoEm,
          entregueEm: datasEnvio.entregueEm,
        },
      });

      const pedidoAtualizado = await tx.pedidoOnline.update({
        where: { id },
        data: {
          frete: valorFrete,
          total: totalAtualizado,
          ...(statusPedidoSincronizado
            ? {
                status: statusPedidoSincronizado,
              }
            : {}),
        },
        select: {
          id: true,
          codigo: true,
          status: true,
          frete: true,
          total: true,
        },
      });

      if (
        statusPedidoSincronizado &&
        statusPedidoSincronizado !== pedido.status
      ) {
        await tx.pedidoStatusHistorico.create({
          data: {
            pedidoOnlineId: id,
            statusAnterior: pedido.status,
            statusNovo: statusPedidoSincronizado,
            tipoEvento: "SISTEMA",
            origem: "ENVIO",
            usuarioNome: "Sistema",
            observacao:
              "Status operacional sincronizado a partir do status de envio.",
          },
        });
      }

      return {
        envio,
        pedido: pedidoAtualizado,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao salvar envio do pedido:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao salvar envio do pedido.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
