import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";
import { atualizarRastreioMelhorEnvio } from "@/lib/frete/melhor-envio";

function parseObservacoes(value: string | null) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {
      observacoesAnteriores: value,
    };
  }
}

function normalizarStatus(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function mapearStatusEnvioMelhorEnvio(status: string, statusAtual: string) {
  const normalizado = normalizarStatus(status);

  if (
    [
      "posted",
      "shipped",
      "in_transit",
      "in-transit",
      "transit",
      "received",
      "collected",
    ].includes(normalizado)
  ) {
    return "POSTADO";
  }

  if (["delivered", "entregue"].includes(normalizado)) {
    return "ENTREGUE";
  }

  if (
    [
      "canceled",
      "cancelled",
      "undelivered",
      "problem",
      "suspended",
      "paused",
      "expired",
    ].includes(normalizado)
  ) {
    return "PROBLEMA";
  }

  if (
    ["generated", "released", "paid", "printed", "pending"].includes(
      normalizado
    )
  ) {
    return statusAtual === "POSTADO" || statusAtual === "ENTREGUE"
      ? statusAtual
      : "ETIQUETA_GERADA";
  }

  return statusAtual;
}

function extrairPrimeiroTexto(
  data: unknown,
  campos: string[],
  visitados = new Set<unknown>()
): string {
  if (!data || visitados.has(data)) {
    return "";
  }

  if (typeof data !== "object") {
    return "";
  }

  visitados.add(data);

  if (Array.isArray(data)) {
    for (const item of data) {
      const value = extrairPrimeiroTexto(item, campos, visitados);

      if (value) {
        return value;
      }
    }

    return "";
  }

  const record = data as Record<string, unknown>;

  for (const campo of campos) {
    const value = record[campo];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const value of Object.values(record)) {
    const encontrado = extrairPrimeiroTexto(value, campos, visitados);

    if (encontrado) {
      return encontrado;
    }
  }

  return "";
}

function getDatasEnvio(statusEnvio: string, envioAtual: {
  postadoEm: Date | null;
  entregueEm: Date | null;
}) {
  const agora = new Date();

  if (statusEnvio === "POSTADO") {
    return {
      postadoEm: envioAtual.postadoEm || agora,
      entregueEm: null,
    };
  }

  if (statusEnvio === "ENTREGUE") {
    return {
      postadoEm: envioAtual.postadoEm || agora,
      entregueEm: envioAtual.entregueEm || agora,
    };
  }

  return {
    postadoEm: envioAtual.postadoEm,
    entregueEm: envioAtual.entregueEm,
  };
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const pedido = await prisma.pedidoOnline.findUnique({
      where: {
        id,
      },
      include: {
        envio: true,
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (pedido.origemCanal !== "LOJA_STELLA") {
      return NextResponse.json(
        { error: "Rastreio disponível apenas para pedidos do site." },
        { status: 400 }
      );
    }

    if (!pedido.envio) {
      return NextResponse.json(
        { error: "Pedido não possui dados de envio." },
        { status: 400 }
      );
    }

    if (pedido.envio.tipoEntrega === "RETIRADA") {
      return NextResponse.json(
        { error: "Retirada local não possui rastreio no Melhor Envio." },
        { status: 400 }
      );
    }

    if (pedido.envio.tipoEntrega !== "ENTREGA") {
      return NextResponse.json(
        { error: "Tipo de entrega não elegível para rastreio." },
        { status: 400 }
      );
    }

    if (pedido.envio.gatewayLogistico !== "MELHOR_ENVIO") {
      return NextResponse.json(
        { error: "Pedido não utiliza Melhor Envio como gateway logístico." },
        { status: 400 }
      );
    }

    const gatewayEnvioId = String(pedido.envio.gatewayEnvioId || "").trim();

    if (!gatewayEnvioId) {
      return NextResponse.json(
        { error: "Identificador do envio no Melhor Envio não encontrado." },
        { status: 400 }
      );
    }

    if (
      ![
        "ETIQUETA_GERADA",
        "POSTADO",
        "ENTREGUE",
        "PROBLEMA",
      ].includes(pedido.envio.statusEnvio)
    ) {
      return NextResponse.json(
        {
          error:
            "Rastreio disponível apenas após a etiqueta ser gerada no Melhor Envio.",
        },
        { status: 400 }
      );
    }

    const freteConfig = await buscarConfiguracaoFrete();

    if (!freteConfig.melhorEnvioTokenConfigurado) {
      return NextResponse.json(
        {
          error:
            "Token do Melhor Envio não configurado. Configure MELHOR_ENVIO_TOKEN no ambiente.",
        },
        { status: 400 }
      );
    }

    const resposta = await atualizarRastreioMelhorEnvio(
      {
        orderId: gatewayEnvioId,
      },
      freteConfig
    );
    const statusMelhorEnvio = extrairPrimeiroTexto(resposta, [
      "status",
      "delivery_status",
      "deliveryStatus",
    ]);
    const codigoRastreio = extrairPrimeiroTexto(resposta, [
      "tracking",
      "tracking_code",
      "trackingCode",
      "code",
    ]);
    const protocolo = extrairPrimeiroTexto(resposta, ["protocol", "id"]);
    const statusEnvio = mapearStatusEnvioMelhorEnvio(
      statusMelhorEnvio,
      pedido.envio.statusEnvio
    );
    const datasEnvio = getDatasEnvio(statusEnvio, {
      postadoEm: pedido.envio.postadoEm,
      entregueEm: pedido.envio.entregueEm,
    });
    const observacoesAnteriores = parseObservacoes(pedido.envio.observacoes);
    const observacoes = {
      ...observacoesAnteriores,
      rastreioAtualizadoEm: new Date().toISOString(),
      gatewayEnvioId,
      codigoRastreio: codigoRastreio || pedido.envio.codigoRastreio,
      statusMelhorEnvio: statusMelhorEnvio || null,
      protocoloMelhorEnvio: protocolo || null,
      rastreioMelhorEnvio: {
        endpoint: "/api/v2/me/shipment/tracking",
        resposta,
      },
    };

    const envioAtualizado = await prisma.pedidoEnvio.update({
      where: {
        id: pedido.envio.id,
      },
      data: {
        statusEnvio,
        codigoRastreio: codigoRastreio || pedido.envio.codigoRastreio,
        postadoEm: datasEnvio.postadoEm,
        entregueEm: datasEnvio.entregueEm,
        observacoes: JSON.stringify(observacoes),
      },
    });

    await prisma.pedidoStatusHistorico.create({
      data: {
        pedidoOnlineId: pedido.id,
        statusAnterior: pedido.status,
        statusNovo: pedido.status,
        tipoEvento: "AUTOMATICO",
        origem: "MELHOR_ENVIO",
        usuarioNome: "Sistema",
        observacao: [
          `Rastreio atualizado no Melhor Envio para o envio ${gatewayEnvioId}.`,
          statusMelhorEnvio ? `Status ME: ${statusMelhorEnvio}.` : null,
          codigoRastreio ? `Código: ${codigoRastreio}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
      },
    });

    return NextResponse.json({
      ok: true,
      statusMelhorEnvio,
      codigoRastreio: envioAtualizado.codigoRastreio,
      envio: {
        id: envioAtualizado.id,
        statusEnvio: envioAtualizado.statusEnvio,
        codigoRastreio: envioAtualizado.codigoRastreio,
        gatewayEnvioId: envioAtualizado.gatewayEnvioId,
        atualizadoEm: envioAtualizado.atualizadoEm.toISOString(),
      },
      aviso:
        !codigoRastreio && !statusMelhorEnvio
          ? "Melhor Envio ainda não retornou código ou status de rastreio."
          : null,
    });
  } catch (error) {
    console.error("Erro ao atualizar rastreio no Melhor Envio:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar rastreio no Melhor Envio.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
