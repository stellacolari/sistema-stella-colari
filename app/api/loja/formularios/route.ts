import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nome = parseStringOrNull(body.nome);
    const telefone = parseStringOrNull(body.telefone);
    const email = parseStringOrNull(body.email);
    const cidade = parseStringOrNull(body.cidade);
    const mensagem = parseStringOrNull(body.mensagem);

    const aceiteTermos = parseBoolean(body.aceiteTermos);
    const aceitaMarketing = parseBoolean(body.aceitaMarketing);

    const paginaId = parseStringOrNull(body.paginaId);
    const paginaTitulo = parseStringOrNull(body.paginaTitulo);
    const paginaSlug = parseStringOrNull(body.paginaSlug);
    const paginaTipo = parseStringOrNull(body.paginaTipo);

    const blocoId = parseStringOrNull(body.blocoId);
    const blocoTipo = parseStringOrNull(body.blocoTipo);
    const blocoTitulo = parseStringOrNull(body.blocoTitulo);

    const origemUrl = parseStringOrNull(body.origemUrl);

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

    const userAgent = req.headers.get("user-agent");

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
  } catch (error) {
    console.error("Erro ao salvar resposta do formulário:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao salvar resposta do formulário.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}