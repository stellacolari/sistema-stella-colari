import { NextResponse } from "next/server";
import {
  AdminPermissaoError,
  exigirPermissaoExecutarAcaoSensivelPedidoAdmin,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";
import { gerarEtiquetaMelhorEnvio } from "@/lib/frete/melhor-envio";

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
            "Geração de etiqueta disponível apenas para pedidos com entrega.",
        },
        { status: 400 },
      );
    }

    if (pedido.statusPagamento !== "PAGO") {
      return NextResponse.json(
        { error: "Só é possível gerar etiqueta de pedido pago." },
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
        { error: "Retirada local não gera etiqueta." },
        { status: 400 },
      );
    }

    if (pedido.envio.tipoEntrega !== "ENTREGA") {
      return NextResponse.json(
        { error: "Tipo de entrega não elegível para geração de etiqueta." },
        { status: 400 },
      );
    }

    if (pedido.envio.gatewayLogistico !== "MELHOR_ENVIO") {
      return NextResponse.json(
        { error: "Pedido não utiliza Melhor Envio como gateway logístico." },
        { status: 400 },
      );
    }

    if (pedido.envio.statusEnvio === "ETIQUETA_GERADA") {
      return NextResponse.json(
        { error: "Etiqueta já foi gerada para este pedido." },
        { status: 400 },
      );
    }

    if (pedido.envio.statusEnvio !== "ETIQUETA_COMPRADA") {
      return NextResponse.json(
        { error: "Só é possível gerar etiqueta após comprar a etiqueta." },
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

    const resposta = await gerarEtiquetaMelhorEnvio(
      {
        orderId: gatewayEnvioId,
      },
      freteConfig,
    );

    const observacoesAnteriores = parseObservacoes(pedido.envio.observacoes);
    const observacoes = {
      ...observacoesAnteriores,
      etiquetaGeradaEm: new Date().toISOString(),
      gatewayEnvioId,
      geracaoEtiqueta: {
        endpoint: "/api/v2/me/shipment/generate",
        resposta,
      },
    };

    const envioAtualizado = await prisma.pedidoEnvio.update({
      where: {
        id: pedido.envio.id,
      },
      data: {
        statusEnvio: "ETIQUETA_GERADA",
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
        observacao: `Etiqueta gerada no Melhor Envio para o envio ${gatewayEnvioId}. Impressão ainda pendente.`,
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
    console.error("Erro ao gerar etiqueta no Melhor Envio:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao gerar etiqueta no Melhor Envio.";

    return NextResponse.json(
      { error: message },
      { status: error instanceof AdminPermissaoError ? 403 : 500 },
    );
  }
}
