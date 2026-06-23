import { NextResponse } from "next/server";
import {
  AdminPermissaoError,
  exigirPermissaoExecutarAcaoSensivelPedidoAdmin,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";
import { imprimirEtiquetaMelhorEnvio } from "@/lib/frete/melhor-envio";

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

function extrairUrlEtiqueta(data: unknown): string {
  if (!data) {
    return "";
  }

  if (typeof data === "string" && data.startsWith("http")) {
    return data;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const url = extrairUrlEtiqueta(item);

      if (url) {
        return url;
      }
    }

    return "";
  }

  if (typeof data !== "object") {
    return "";
  }

  const record = data as Record<string, unknown>;
  const candidatos = [
    record.url,
    record.link,
    record.print_url,
    record.printUrl,
    record.label_url,
    record.labelUrl,
    record.pdf,
  ];

  const encontrado = candidatos.find(
    (value) => typeof value === "string" && value.startsWith("http"),
  );

  if (typeof encontrado === "string") {
    return encontrado;
  }

  for (const value of Object.values(record)) {
    const url = extrairUrlEtiqueta(value);

    if (url) {
      return url;
    }
  }

  return "";
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await exigirPermissaoExecutarAcaoSensivelPedidoAdmin();

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
        { status: 404 },
      );
    }

    if (!["LOJA_STELLA", "ADMIN_MANUAL"].includes(pedido.origemCanal)) {
      return NextResponse.json(
        {
          error:
            "Impressão de etiqueta disponível apenas para pedidos com entrega.",
        },
        { status: 400 },
      );
    }

    if (pedido.statusPagamento !== "PAGO") {
      return NextResponse.json(
        { error: "Só é possível imprimir etiqueta de pedido pago." },
        { status: 400 },
      );
    }

    if (!pedido.envio) {
      return NextResponse.json(
        { error: "Pedido não possui dados de envio." },
        { status: 400 },
      );
    }

    if (pedido.envio.tipoEntrega === "RETIRADA") {
      return NextResponse.json(
        { error: "Retirada local não gera impressão de etiqueta." },
        { status: 400 },
      );
    }

    if (pedido.envio.tipoEntrega !== "ENTREGA") {
      return NextResponse.json(
        { error: "Tipo de entrega não elegível para impressão de etiqueta." },
        { status: 400 },
      );
    }

    if (pedido.envio.gatewayLogistico !== "MELHOR_ENVIO") {
      return NextResponse.json(
        { error: "Pedido não utiliza Melhor Envio como gateway logístico." },
        { status: 400 },
      );
    }

    if (pedido.envio.statusEnvio !== "ETIQUETA_GERADA") {
      return NextResponse.json(
        { error: "Só é possível imprimir etiqueta após gerar a etiqueta." },
        { status: 400 },
      );
    }

    const gatewayEnvioId = String(pedido.envio.gatewayEnvioId || "").trim();

    if (!gatewayEnvioId) {
      return NextResponse.json(
        { error: "Identificador do envio no Melhor Envio não encontrado." },
        { status: 400 },
      );
    }

    const freteConfig = await buscarConfiguracaoFrete();

    if (!freteConfig.melhorEnvioTokenConfigurado) {
      return NextResponse.json(
        {
          error:
            "Token do Melhor Envio não configurado. Configure MELHOR_ENVIO_TOKEN no ambiente.",
        },
        { status: 400 },
      );
    }

    const resposta = await imprimirEtiquetaMelhorEnvio(
      {
        orderId: gatewayEnvioId,
        mode: "public",
      },
      freteConfig,
    );
    const etiquetaUrl = extrairUrlEtiqueta(resposta);
    const observacoesAnteriores = parseObservacoes(pedido.envio.observacoes);
    const observacoes = {
      ...observacoesAnteriores,
      etiquetaImpressaEm: new Date().toISOString(),
      etiquetaUrl: etiquetaUrl || pedido.envio.etiquetaUrl,
      gatewayEnvioId,
      impressaoEtiqueta: {
        endpoint: "/api/v2/me/shipment/print",
        mode: "public",
        resposta,
      },
    };

    const envioAtualizado = await prisma.pedidoEnvio.update({
      where: {
        id: pedido.envio.id,
      },
      data: {
        etiquetaUrl: etiquetaUrl || pedido.envio.etiquetaUrl,
        etiquetaPdfUrl: etiquetaUrl || pedido.envio.etiquetaPdfUrl,
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
        observacao: etiquetaUrl
          ? `Link de impressão da etiqueta gerado no Melhor Envio: ${etiquetaUrl}.`
          : `Impressão solicitada no Melhor Envio para o envio ${gatewayEnvioId}.`,
      },
    });

    return NextResponse.json({
      ok: true,
      etiquetaUrl,
      envio: {
        id: envioAtualizado.id,
        statusEnvio: envioAtualizado.statusEnvio,
        gatewayEnvioId: envioAtualizado.gatewayEnvioId,
        etiquetaUrl: envioAtualizado.etiquetaUrl,
        etiquetaPdfUrl: envioAtualizado.etiquetaPdfUrl,
      },
    });
  } catch (error) {
    console.error("Erro ao imprimir etiqueta no Melhor Envio:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao imprimir etiqueta no Melhor Envio.";

    return NextResponse.json(
      { error: message },
      { status: error instanceof AdminPermissaoError ? 403 : 500 },
    );
  }
}
