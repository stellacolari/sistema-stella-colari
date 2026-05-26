import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function limparTextoOuNull(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const texto = String(value ?? "").trim();

  return texto || null;
}

function limparBooleanOuUndefined(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  return Boolean(value);
}

function limparNumeroOuUndefined(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const numero = Number(value);

  if (Number.isNaN(numero)) {
    return 0;
  }

  return numero;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const data = {
      titulo: limparTextoOuNull(body.titulo),
      subtitulo: limparTextoOuNull(body.subtitulo),
      linkUrl: limparTextoOuNull(body.linkUrl),
      ordem: limparNumeroOuUndefined(body.ordem),
      ativo: limparBooleanOuUndefined(body.ativo),
    };

    const banner = await prisma.bannerLoja.update({
      where: {
        id,
      },
      data,
    });

    return NextResponse.json({ banner });
  } catch (error) {
    console.error("Erro ao atualizar banner da loja:", error);

    return NextResponse.json(
      { error: "Erro ao atualizar banner da loja." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.bannerLoja.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir banner da loja:", error);

    return NextResponse.json(
      { error: "Erro ao excluir banner da loja." },
      { status: 500 }
    );
  }
}