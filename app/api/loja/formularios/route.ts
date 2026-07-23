import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  respostaRateLimit,
  verificarRateLimit,
} from "@/lib/security/rate-limit";

function parseStringOrNull(value: unknown, maxLength = 500) {
  const parsed = String(value ?? "").trim().slice(0, maxLength);

  return parsed || null;
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "SIM";
  }

  return false;
}

function validarEmail(email: string | null) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashUserAgent(value: string | null) {
  const normalizado = String(value || "").trim();

  return normalizado
    ? `sha256:${createHash("sha256").update(normalizado).digest("hex")}`
    : null;
}

export async function POST(req: Request) {
  try {
    const limite = verificarRateLimit({
      request: req,
      scope: "loja-formulario",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!limite.allowed) return respostaRateLimit(limite);

    const body = await req.json().catch(() => ({}));

    const nome = parseStringOrNull(body.nome, 120);
    const telefone = parseStringOrNull(body.telefone, 30);
    const email = parseStringOrNull(body.email, 180);
    const cidade = parseStringOrNull(body.cidade, 120);
    const mensagem = parseStringOrNull(body.mensagem, 2_000);

    const aceiteTermos = parseBoolean(body.aceiteTermos);
    const aceitaMarketing = parseBoolean(body.aceitaMarketing);

    const paginaId = parseStringOrNull(body.paginaId, 80);
    const paginaTitulo = parseStringOrNull(body.paginaTitulo, 160);
    const paginaSlug = parseStringOrNull(body.paginaSlug, 160);
    const paginaTipo = parseStringOrNull(body.paginaTipo, 60);

    const blocoId = parseStringOrNull(body.blocoId, 80);
    const blocoTipo = parseStringOrNull(body.blocoTipo, 60);
    const blocoTitulo = parseStringOrNull(body.blocoTitulo, 160);

    const origemUrl = parseStringOrNull(body.origemUrl, 500);

    if (!nome && !telefone && !email) {
      return NextResponse.json(
        {
          error:
            "Informe pelo menos um contato: nome, telefone ou e-mail.",
        },
        { status: 400 }
      );
    }

    if (!validarEmail(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 }
      );
    }

    if (!aceiteTermos) {
      return NextResponse.json(
        {
          error:
            "É necessário aceitar os termos para enviar o formulário.",
        },
        { status: 400 }
      );
    }

    const userAgent = hashUserAgent(req.headers.get("user-agent"));

    const resposta = await prisma.lojaFormularioResposta.create({
      data: {
        paginaId,
        paginaTitulo,
        paginaSlug,
        paginaTipo,

        blocoId,
        blocoTipo,
        blocoTitulo,

        nome,
        telefone,
        email,
        cidade,
        mensagem,

        aceiteTermos,
        aceitaMarketing,

        origemUrl,
        userAgent,
        status: "NOVO",
      },
      select: {
        id: true,
        criadoEm: true,
      },
    });

    return NextResponse.json({
      ok: true,
      resposta,
    });
  } catch {
    console.error("Erro interno ao salvar resposta do formulário.");

    return NextResponse.json(
      { error: "Não foi possível enviar o formulário." },
      { status: 500 },
    );
  }
}
