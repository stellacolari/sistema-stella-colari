import { NextResponse } from "next/server";
import {
  AdminPermissaoError,
  exigirPermissaoExecutarAcaoSensivelPedidoAdmin,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";
import { comprarEtiquetaMelhorEnvio } from "@/lib/frete/melhor-envio";

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

function temEtiquetaGeradaOuPaga(statusEnvio: string) {
  return [
    "ETIQUETA_COMPRADA",
    "ETIQUETA_GERADA",
    "POSTADO",
    "ENTREGUE",
  ].includes(statusEnvio);
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
            "Compra de etiqueta disponível apenas para pedidos com entrega.",
        },
        { status: 400 },
      );
    }

    if (pedido.statusPagamento !== "PAGO") {
      return NextResponse.json(
        { error: "Só é possível comprar etiqueta de pedido pago." },
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
        { error: "Retirada local não gera compra de etiqueta." },
        { status: 400 },
      );
    }

    if (pedido.envio.tipoEntrega !== "ENTREGA") {
      return NextResponse.json(
        { error: "Tipo de entrega não elegível para compra de etiqueta." },
        { status: 400 },
      );
    }

    if (pedido.envio.gatewayLogistico !== "MELHOR_ENVIO") {
      return NextResponse.json(
        { error: "Pedido não utiliza Melhor Envio como gateway logístico." },
        { status: 400 },
      );
    }

    if (temEtiquetaGeradaOuPaga(pedido.envio.statusEnvio)) {
      return NextResponse.json(
        {
          error:
            "Etiqueta já foi comprada, gerada ou enviada para este pedido.",
        },
        { status: 400 },
      );
    }

    if (pedido.envio.statusEnvio !== "PREPARADO") {
      return NextResponse.json(
        {
          error:
            "Só é possível comprar etiqueta após preparar o envio no Melhor Envio.",
        },
        { status: 400 },
      );
    }

    const gatewayEnvioId = String(pedido.envio.gatewayEnvioId || "").trim();

    if (!gatewayEnvioId) {
      return NextResponse.json(
        {
          error:
            "Identificador do envio preparado não encontrado. Prepare o envio novamente antes de comprar a etiqueta.",
        },
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

    const resposta = await comprarEtiquetaMelhorEnvio(
      {
        orderId: gatewayEnvioId,
      },
      freteConfig,
    );

    const observacoesAnteriores = parseObservacoes(pedido.envio.observacoes);
    const observacoes = {
      ...observacoesAnteriores,
      etiquetaCompradaEm: new Date().toISOString(),
      gatewayEnvioId,
      compraEtiqueta: {
        endpoint: "/api/v2/me/shipment/checkout",
        resposta,
      },
    };

    const envioAtualizado = await prisma.pedidoEnvio.update({
      where: {
        id: pedido.envio.id,
      },
      data: {
        statusEnvio: "ETIQUETA_COMPRADA",
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
        observacao: `Etiqueta comprada no Melhor Envio para o envio ${gatewayEnvioId}. Geração/impressão ainda pendentes.`,
      },
    });

    return NextResponse.json({
      ok: true,
      envio: {
        id: envioAtualizado.id,
        statusEnvio: envioAtualizado.statusEnvio,
        gatewayEnvioId: envioAtualizado.gatewayEnvioId,
      },
    });
  } catch (error) {
    console.error("Erro ao comprar etiqueta no Melhor Envio:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao comprar etiqueta no Melhor Envio.";

    return NextResponse.json(
      { error: message },
      { status: error instanceof AdminPermissaoError ? 403 : 500 },
    );
  }
}
