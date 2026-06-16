import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = new Set([
  "GERAL",
  "HOME",
  "CATEGORIA",
  "TEMPLATE_CATEGORIA",
  "LANDING",
  "CAMPANHA",
]);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gerarSlugUnico(slugBase: string) {
  const base = slugify(slugBase) || "pagina";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.lojaPagina.findUnique({
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

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const titulo = String(body.titulo || "").trim();
    const tipo = String(body.tipo || "GERAL").trim();
    const categoriaId = parseStringOrNull(body.categoriaId);

    if (!titulo) {
      return NextResponse.json(
        { error: "Título da página é obrigatório." },
        { status: 400 }
      );
    }

    if (!TIPOS_VALIDOS.has(tipo)) {
      return NextResponse.json(
        { error: "Tipo de página inválido." },
        { status: 400 }
      );
    }

    if (tipo === "CATEGORIA" && !categoriaId) {
      return NextResponse.json(
        { error: "Selecione uma categoria para páginas do tipo categoria." },
        { status: 400 }
      );
    }

    if (tipo !== "CATEGORIA" && categoriaId) {
      return NextResponse.json(
        {
          error:
            "Categoria vinculada só pode ser usada em páginas do tipo categoria.",
        },
        { status: 400 }
      );
    }

    let categoriaSlug: string | null = null;

    if (categoriaId) {
      const categoria = await prisma.categoriaProduto.findUnique({
        where: { id: categoriaId },
        select: {
          id: true,
          slug: true,
        },
      });

      if (!categoria) {
        return NextResponse.json(
          { error: "Categoria vinculada não encontrada." },
          { status: 404 }
        );
      }

      categoriaSlug = categoria.slug;

      const paginaCategoriaExistente = await prisma.lojaPagina.findFirst({
        where: {
          tipo: "CATEGORIA",
          categoriaId,
          statusPublicacao: {
            not: "ARQUIVADA",
          },
        },
        select: {
          id: true,
        },
      });

      if (paginaCategoriaExistente) {
        return NextResponse.json(
          { error: "Esta categoria já possui uma página personalizada." },
          { status: 400 }
        );
      }
    }

    if (tipo === "HOME") {
      const homeExistente = await prisma.lojaPagina.findFirst({
        where: {
          OR: [{ tipo: "HOME" }, { slug: "home" }],
        },
        select: {
          id: true,
        },
      });

      if (homeExistente) {
        return NextResponse.json(
          { error: "Já existe uma página Home cadastrada." },
          { status: 400 }
        );
      }
    }

    const slugInformado = String(body.slug || "").trim();

    const slugBase =
      tipo === "HOME"
        ? "home"
        : tipo === "CATEGORIA" && categoriaSlug
        ? `categoria-${categoriaSlug}`
        : tipo === "TEMPLATE_CATEGORIA"
        ? "template-categoria"
        : slugInformado || titulo;

    const slug = await gerarSlugUnico(slugBase);

    const usarComoTemplatePadrao =
      tipo === "TEMPLATE_CATEGORIA"
        ? parseBoolean(body.usarComoTemplatePadrao, true)
        : false;

    if (usarComoTemplatePadrao) {
      await prisma.lojaPagina.updateMany({
        where: {
          tipo: "TEMPLATE_CATEGORIA",
          usarComoTemplatePadrao: true,
        },
        data: {
          usarComoTemplatePadrao: false,
        },
      });
    }

    const pagina = await prisma.lojaPagina.create({
      data: {
        titulo,
        slug,
        tipo,
        categoriaId: tipo === "CATEGORIA" ? categoriaId : null,

        // Regra oficial:
        // toda página criada manualmente no builder nasce como rascunho.
        ativo: false,
        statusPublicacao: "RASCUNHO",
        publicadoEm: null,

        usarComoTemplatePadrao,
        seoTitle: parseStringOrNull(body.seoTitle),
        seoDescription: parseStringOrNull(body.seoDescription),
        termosBusca: parseStringOrNull(body.termosBusca),
      },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        blocos: {
          select: {
            id: true,
            ativo: true,
          },
        },
      },
    });

    return NextResponse.json({ pagina });
  } catch (error) {
    console.error("Erro ao criar página da loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao criar página da loja.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
