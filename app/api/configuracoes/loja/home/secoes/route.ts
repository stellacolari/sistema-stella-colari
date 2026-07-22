import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protegerMutacaoConteudoLegado } from "@/lib/loja/conteudo/api-auth.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET() {
  const secoes = await prisma.lojaSecaoHome.findMany({
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
  });

  return NextResponse.json({ secoes });
}

export async function POST(request: Request) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "criar",
    { tipos: ["HOME"], slugs: ["home"] },
  );
  if (bloqueio) return bloqueio;

  try {
    const body = await request.json();

    const titulo = texto(body.titulo);
    const categorias = Array.isArray(body.categorias)
      ? body.categorias.map(texto).filter(Boolean).join("|")
      : texto(body.categorias);
    const ordem = numero(body.ordem);
    const ativo = body.ativo === undefined ? true : booleano(body.ativo);

    if (!titulo) {
      return NextResponse.json(
        { error: "Informe o título da seção." },
        { status: 400 }
      );
    }

    if (!categorias) {
      return NextResponse.json(
        { error: "Selecione ao menos uma categoria." },
        { status: 400 }
      );
    }

    const secao = await prisma.lojaSecaoHome.create({
      data: {
        titulo,
        categorias,
        ordem,
        ativo,
      },
    });

    return NextResponse.json({ secao }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar seção da home:", error);

    return NextResponse.json(
      { error: "Erro ao criar seção da home." },
      { status: 500 }
    );
  }
}
