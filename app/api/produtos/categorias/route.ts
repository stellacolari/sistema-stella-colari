import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminPermissaoError, exigirAdminComPermissao } from "@/lib/auth/admin";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gerarSlugUnico(nome: string) {
  const base = slugify(nome) || "categoria";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.categoriaProduto.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existente) {
      return slug;
    }

    slug = `${base}-${contador}`;
    contador += 1;
  }
}

const categoriaSelect = {
  id: true,
  nome: true,
  slug: true,
  categoriaMaeId: true,
  descricao: true,
  descricaoSeo: true,
  termosBusca: true,
  imagemUrl: true,
  exibirNoMenu: true,
  ordemMenu: true,
};

export async function GET() {
  try {
    const categorias = await prisma.categoriaProduto.findMany({
      where: {
        ativo: true,
      },
      orderBy: [
        {
          ordemMenu: "asc",
        },
        {
          nome: "asc",
        },
      ],
      select: categoriaSelect,
    });

    return NextResponse.json({ categorias });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao buscar categorias.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await exigirAdminComPermissao("produtos", "editar");

    const body = await req.json().catch(() => ({}));

    const nome = String(body.nome || "").trim();
    const categoriaMaeId = body.categoriaMaeId
      ? String(body.categoriaMaeId)
      : null;

    if (!nome) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório." },
        { status: 400 }
      );
    }

    if (categoriaMaeId) {
      const categoriaMae = await prisma.categoriaProduto.findUnique({
        where: { id: categoriaMaeId },
        select: { id: true },
      });

      if (!categoriaMae) {
        return NextResponse.json(
          { error: "Categoria mãe não encontrada." },
          { status: 404 }
        );
      }
    }

    const slug = await gerarSlugUnico(nome);

    const categoria = await prisma.categoriaProduto.create({
      data: {
        nome,
        slug,
        categoriaMaeId,
        ativo: true,
        descricao: body.descricao ? String(body.descricao).trim() : null,
        descricaoSeo: body.descricaoSeo
          ? String(body.descricaoSeo).trim()
          : null,
        termosBusca: body.termosBusca
          ? String(body.termosBusca).trim()
          : null,
        imagemUrl: body.imagemUrl ? String(body.imagemUrl).trim() : null,
        exibirNoMenu:
          typeof body.exibirNoMenu === "boolean" ? body.exibirNoMenu : true,
        ordemMenu: Number.isFinite(Number(body.ordemMenu))
          ? Number(body.ordemMenu)
          : 0,
      },
      select: categoriaSelect,
    });

    return NextResponse.json({ categoria });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao criar categoria.";

    return NextResponse.json(
      { error: message },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
