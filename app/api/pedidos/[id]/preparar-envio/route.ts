import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";
import { inserirEnvioNoCarrinhoMelhorEnvio } from "@/lib/frete/melhor-envio";
import type {
  FreteProdutoPayload,
  MelhorEnvioDestinatario,
  MelhorEnvioRemetente,
} from "@/lib/frete/types";

function normalizarCep(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarDocumento(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarUf(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function extrairIdMelhorEnvio(data: unknown) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const record = data as Record<string, unknown>;
  const id = record.id || record.order_id || record.protocol || record.uuid;

  return id ? String(id) : "";
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const pedido = await prisma.pedidoOnline.findUnique({
      where: {
        id,
      },
      include: {
        envio: true,
        itens: {
          select: {
            id: true,
            produtoId: true,
            nomeProduto: true,
            quantidade: true,
            precoUnitario: true,
          },
        },
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
            "Preparação de envio disponível apenas para pedidos com entrega.",
        },
        { status: 400 },
      );
    }

    if (pedido.statusPagamento !== "PAGO") {
      return NextResponse.json(
        { error: "Só é possível preparar envio de pedido pago." },
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
        { error: "Retirada local não gera envio no Melhor Envio." },
        { status: 400 },
      );
    }

    if (pedido.envio.tipoEntrega !== "ENTREGA") {
      return NextResponse.json(
        { error: "Tipo de entrega não elegível para preparação de envio." },
        { status: 400 },
      );
    }

    if (pedido.envio.gatewayLogistico !== "MELHOR_ENVIO") {
      return NextResponse.json(
        { error: "Pedido não utiliza Melhor Envio como gateway logístico." },
        { status: 400 },
      );
    }

    if (pedido.envio.statusEnvio !== "PENDENTE") {
      return NextResponse.json(
        {
          error:
            "Só é possível preparar envio quando o status logístico está pendente.",
        },
        { status: 400 },
      );
    }

    const serviceId = Number(pedido.envio.gatewayEnvioId);

    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      return NextResponse.json(
        {
          error:
            "Serviço do Melhor Envio não identificado no pedido. Refaça a cotação antes de preparar o envio.",
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

    if (freteConfig.cepOrigem.length !== 8) {
      return NextResponse.json(
        {
          error:
            "CEP de origem do frete não configurado. Ajuste em Configurações > Frete e entrega.",
        },
        { status: 400 },
      );
    }

    const remetente: MelhorEnvioRemetente = {
      name: freteConfig.remetenteNome,
      phone: freteConfig.remetenteTelefone,
      email: freteConfig.remetenteEmail,
      document: freteConfig.remetenteDocumento,
      address: freteConfig.remetenteEndereco,
      complement: freteConfig.remetenteComplemento || null,
      number: freteConfig.remetenteNumero,
      district: freteConfig.remetenteBairro,
      city: freteConfig.remetenteCidade,
      state_abbr: freteConfig.remetenteUf,
      postal_code: freteConfig.cepOrigem,
    };

    const destinatario: MelhorEnvioDestinatario = {
      name: pedido.nomeCliente,
      phone: pedido.telefoneCliente,
      email: pedido.emailCliente,
      document: normalizarDocumento(pedido.documento),
      address: String(pedido.rua || "").trim(),
      complement: pedido.complemento || null,
      number: String(pedido.numero || "").trim(),
      district: String(pedido.bairro || "").trim(),
      city: String(pedido.cidade || "").trim(),
      state_abbr: normalizarUf(pedido.estado),
      postal_code: normalizarCep(pedido.cep),
    };

    const produtos: FreteProdutoPayload[] = pedido.itens.map((item) => ({
      id: item.produtoId || item.id,
      nome: item.nomeProduto,
      quantidade: item.quantidade,
      valorUnitario: Number(item.precoUnitario || 0),
    }));

    const resposta = await inserirEnvioNoCarrinhoMelhorEnvio(
      {
        serviceId,
        pedidoCodigo: pedido.codigo,
        remetente,
        destinatario,
        produtos,
      },
      freteConfig,
    );

    const gatewayEnvioId = extrairIdMelhorEnvio(resposta);
    const observacoes = toJson({
      preparadoEm: new Date().toISOString(),
      pedidoCodigo: pedido.codigo,
      serviceId,
      gatewayEnvioId,
      resposta,
    });

    const envioAtualizado = await prisma.pedidoEnvio.update({
      where: {
        id: pedido.envio.id,
      },
      data: {
        statusEnvio: "PREPARADO",
        gatewayEnvioId: gatewayEnvioId || pedido.envio.gatewayEnvioId,
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
        observacao: gatewayEnvioId
          ? `Envio preparado no carrinho do Melhor Envio: ${gatewayEnvioId}.`
          : "Envio preparado no carrinho do Melhor Envio.",
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
    console.error("Erro ao preparar envio no Melhor Envio:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao preparar envio no Melhor Envio.";

    const status = message.startsWith("Dados incompletos") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
