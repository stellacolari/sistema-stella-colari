import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_CLIENTE_ID = "stella_cliente_id";
const MAX_EVENTOS_POR_MINUTO = 80;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const TIPOS_EVENTO_COMERCIAL = new Set([
  "PRODUTO_VISUALIZADO",
  "PRODUTO_FAVORITADO",
  "PRODUTO_DESFAVORITADO",
  "PRODUTO_ADICIONADO_CARRINHO",
  "PRODUTO_REMOVIDO_CARRINHO",
  "BUSCA_REALIZADA",
  "BUSCA_RESULTADO_CLICADO",
  "BUSCA_SEM_RESULTADO",
  "VITRINE_EDITORIAL_CLICADA",
  "BANNER_CTA_CLICADO",
  "CHECKOUT_INICIADO",
  "CATEGORIA_CLICADA",
]);

const METADATA_KEYS_SENSIVEIS =
  /(senha|password|token|documento|cpf|cnpj|cartao|card|pagamento|endereco|rua|cep|telefone|email|whatsapp)/i;

type JsonSeguro =
  | string
  | number
  | boolean
  | null
  | JsonSeguro[]
  | { [key: string]: JsonSeguro };

function limitarString(value: unknown, max = 160) {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  if (!normalized) return undefined;

  return normalized.slice(0, max);
}

function limitarId(value: unknown) {
  const id = limitarString(value, 80);

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return undefined;

  return id;
}

function getRateLimitKey(req: Request, sessionId?: string) {
  if (sessionId) return `session:${sessionId}`;

  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || req.headers.get("x-real-ip");

  return `ip:${ip || "anonimo"}`;
}

function excedeuRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitMap.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + 60_000,
    });
    return false;
  }

  current.count += 1;

  if (rateLimitMap.size > 1_000) {
    for (const [mapKey, value] of rateLimitMap.entries()) {
      if (value.resetAt <= now) {
        rateLimitMap.delete(mapKey);
      }
    }
  }

  return current.count > MAX_EVENTOS_POR_MINUTO;
}

function sanitizarMetadata(value: unknown, depth = 0): JsonSeguro | undefined {
  if (depth > 3) return undefined;

  if (value === null) return null;

  if (typeof value === "string") {
    return value.trim().slice(0, 220);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, 12)
      .map((item) => sanitizarMetadata(item, depth + 1))
      .filter((item): item is JsonSeguro => typeof item !== "undefined");

    return items;
  }

  if (typeof value === "object" && value) {
    const output: { [key: string]: JsonSeguro } = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 24);

    entries.forEach(([key, item]) => {
      const cleanKey = key.trim().slice(0, 48);

      if (!cleanKey || METADATA_KEYS_SENSIVEIS.test(cleanKey)) {
        return;
      }

      const cleanValue = sanitizarMetadata(item, depth + 1);

      if (typeof cleanValue !== "undefined") {
        output[cleanKey] = cleanValue;
      }
    });

    return Object.keys(output).length > 0 ? output : undefined;
  }

  return undefined;
}

async function buscarClienteLogadoId() {
  const cookieStore = await cookies();
  const clienteId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";

  if (!clienteId) return undefined;

  const cliente = await prisma.cliente.findFirst({
    where: {
      id: clienteId,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    select: {
      id: true,
    },
  });

  return cliente?.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const tipo = limitarString(body.tipo, 60);

    if (!tipo || !TIPOS_EVENTO_COMERCIAL.has(tipo)) {
      return NextResponse.json(
        { error: "Tipo de evento comercial invalido." },
        { status: 400 }
      );
    }

    const sessionId = limitarString(body.sessionId, 80);
    const rateLimitKey = getRateLimitKey(req, sessionId);

    if (excedeuRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Limite de eventos excedido." },
        { status: 429 }
      );
    }

    const metadataJson = sanitizarMetadata(body.metadata);
    const clienteId = await buscarClienteLogadoId();
    const data: Prisma.EventoComercialUncheckedCreateInput = {
      tipo,
      produtoId: limitarId(body.produtoId),
      categoriaId: limitarId(body.categoriaId),
      paginaId: limitarId(body.paginaId),
      blocoId: limitarId(body.blocoId),
      pedidoId: limitarId(body.pedidoId),
      clienteId,
      termoBusca: limitarString(body.termoBusca, 120),
      origem: limitarString(body.origem, 80),
      sessionId,
      ...(typeof metadataJson !== "undefined" && metadataJson !== null
        ? { metadataJson: metadataJson as Prisma.InputJsonValue }
        : {}),
    };

    await prisma.eventoComercial.create({
      data,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const prismaCode =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (prismaCode === "P2003") {
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    console.error("Erro ao registrar evento comercial:", error);

    return NextResponse.json(
      { error: "Erro ao registrar evento comercial." },
      { status: 500 }
    );
  }
}
