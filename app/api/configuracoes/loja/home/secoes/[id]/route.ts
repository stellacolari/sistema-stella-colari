import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protegerMutacaoConteudoLegado } from "@/lib/loja/conteudo/api-auth.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function texto(value: unknown) {
  return String(value ?? "").trim();
}

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function booleano(value: unknown) {
  return Boolean(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "editar",
    { tipos: ["HOME"], slugs: ["home"] },
  );
  if (bloqueio) return bloqueio;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const categorias = Array.isArray(body.categorias)
      ? body.categorias.map(texto).filter(Boolean).join("|")
      : texto(body.categorias);

    const secao = await prisma.lojaSecaoHome.update({
      where: { id },
      data: {
        titulo: texto(body.titulo),
        categorias,
        ordem: numero(body.ordem),
        ativo: body.ativo === undefined ? true : booleano(body.ativo),
      },
    });

    return NextResponse.json({ secao });
  } catch (error) {
    console.error("Erro ao atualizar seção da home:", error);

    return NextResponse.json(
      { error: "Erro ao atualizar seção da home." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "excluir",
    { tipos: ["HOME"], slugs: ["home"] },
  );
  if (bloqueio) return bloqueio;

  try {
    const { id } = await context.params;

    await prisma.lojaSecaoHome.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir seção da home:", error);

    return NextResponse.json(
      { error: "Erro ao excluir seção da home." },
      { status: 500 }
    );
  }
}
