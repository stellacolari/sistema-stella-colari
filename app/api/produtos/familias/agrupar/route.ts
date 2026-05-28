import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProdutoAgrupamentoPayload = {
  produtoId?: string;
  familiaMaterial?: string | null;
  familiaCorJoia?: string | null;
  familiaImagemUrl?: string | null;
  familiaOrdem?: number;
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

async function gerarSlugUnico(nome: string) {
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

    if (!existente) {
      return slug;
    }

    slug = `${base}-${contador}`;
    contador += 1;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const familiaId = normalizarTexto(body.familiaId);
    const familiaNome = normalizarTexto(body.familiaNome);
    const produtos: ProdutoAgrupamentoPayload[] = Array.isArray(body.produtos)
      ? body.produtos
      : [];

    if (!familiaId && !familiaNome) {
      return NextResponse.json(
        {
          error:
            "Selecione uma família existente ou informe o nome de uma nova família.",
        },
        { status: 400 }
      );
    }

    if (produtos.length === 0) {
      return NextResponse.json(
        { error: "Selecione pelo menos um produto para agrupar." },
        { status: 400 }
      );
    }

    const produtosValidos = produtos
      .map((item, index) => ({
        produtoId: normalizarTexto(item.produtoId),
        familiaMaterial: normalizarTexto(item.familiaMaterial) || null,
        familiaCorJoia: normalizarTexto(item.familiaCorJoia) || null,
        familiaImagemUrl: normalizarTexto(item.familiaImagemUrl) || null,
        familiaOrdem: Number.isFinite(Number(item.familiaOrdem))
          ? Number(item.familiaOrdem)
          : index,
      }))
      .filter((item) => item.produtoId);

    if (produtosValidos.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto válido foi enviado." },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      let familia = familiaId
        ? await tx.produtoFamilia.findUnique({
            where: {
              id: familiaId,
            },
          })
        : null;

      if (familiaId && !familia) {
        throw new Error("Família selecionada não encontrada.");
      }

      if (!familia) {
        const slug = await gerarSlugUnico(familiaNome);

        familia = await tx.produtoFamilia.create({
          data: {
            nome: familiaNome,
            slug,
            ativo: true,
          },
        });
      }

      for (const item of produtosValidos) {
        await tx.produto.update({
          where: {
            id: item.produtoId,
          },
          data: {
            familiaId: familia.id,
            familiaMaterial: item.familiaMaterial,
            familiaCorJoia: item.familiaCorJoia,
            familiaImagemUrl: item.familiaImagemUrl,
            familiaOrdem: item.familiaOrdem,
          },
        });
      }

      return familia;
    });

    return NextResponse.json({
      ok: true,
      familia: resultado,
    });
  } catch (error) {
    console.error("Erro ao agrupar produtos em família:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao agrupar produtos.",
      },
      { status: 500 }
    );
  }
}