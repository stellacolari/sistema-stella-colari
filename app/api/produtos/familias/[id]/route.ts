import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminPermissaoError, exigirAdminComPermissao } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizarTexto(value: unknown) {
  return String(value ?? "").trim();
}

function gerarSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gerarSlugUnico(nome: string, familiaIdAtual: string) {
  const base = gerarSlug(nome) || "familia";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.produtoFamilia.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existente || existente.id === familiaIdAtual) {
      return slug;
    }

    slug = `${base}-${contador}`;
    contador += 1;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await exigirAdminComPermissao("produtos", "editar");

    const { id } = await context.params;
    const body = await request.json();

    const nome = normalizarTexto(body.nome);
    const ativo =
      typeof body.ativo === "boolean" ? Boolean(body.ativo) : undefined;
    const ordem = Number.isFinite(Number(body.ordem))
      ? Number(body.ordem)
      : undefined;

    if (!nome && typeof ativo === "undefined" && typeof ordem === "undefined") {
      return NextResponse.json(
        { error: "Nenhuma alteração foi enviada." },
        { status: 400 }
      );
    }

    const familiaAtual = await prisma.produtoFamilia.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
      },
    });

    if (!familiaAtual) {
      return NextResponse.json(
        { error: "Família não encontrada." },
        { status: 404 }
      );
    }

    const slug = nome ? await gerarSlugUnico(nome, id) : undefined;

    const familia = await prisma.produtoFamilia.update({
      where: {
        id,
      },
      data: {
        ...(nome ? { nome, slug } : {}),
        ...(typeof ativo !== "undefined" ? { ativo } : {}),
        ...(typeof ordem !== "undefined" ? { ordem } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      familia,
    });
  } catch (error) {
    console.error("Erro ao atualizar família de produtos:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar família.",
      },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
