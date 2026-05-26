import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_VALIDOS = new Set([
  "NOVO",
  "EM_ATENDIMENTO",
  "CONVERTIDO",
  "ARQUIVADO",
]);

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const status = String(body.status || "NOVO").trim();
    const observacaoInterna = parseStringOrNull(body.observacaoInterna);

    if (!STATUS_VALIDOS.has(status)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 }
      );
    }

    const existente = await prisma.lojaFormularioResposta.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Resposta não encontrada." },
        { status: 404 }
      );
    }

    const resposta = await prisma.lojaFormularioResposta.update({
      where: {
        id,
      },
      data: {
        status,
        observacaoInterna,
      },
    });

    return NextResponse.json({ resposta });
  } catch (error) {
    console.error("Erro ao atualizar resposta do formulário:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar resposta do formulário.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}