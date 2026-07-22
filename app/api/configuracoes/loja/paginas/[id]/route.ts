import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirAcessoConteudo,
  validarOrigemMutacao,
} from "@/lib/loja/conteudo/api-auth.server";

const TIPOS_VALIDOS = new Set([
  "GERAL",
  "HOME",
  "CATEGORIA",
  "TEMPLATE_CATEGORIA",
  "LANDING",
  "CAMPANHA",
]);

const STATUS_VALIDOS = new Set(["RASCUNHO", "PUBLICADA", "ARQUIVADA"]);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gerarSlugUnico(slugBase: string, ignorarId: string) {
  const base = slugify(slugBase) || "pagina";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.lojaPagina.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existente || existente.id === ignorarId) {
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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const usuario = await exigirAcessoConteudo("editar");
  if (!usuario) return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
  if (!validarOrigemMutacao(req)) {
    return NextResponse.json({ error: "Origem da requisição inválida." }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const conteudoNovo = await prisma.lojaConteudoDocumento.findFirst({
      where: { paginaId: id, modoEntrega: "NOVO" },
      select: { id: true },
    });
    if (conteudoNovo) {
      return NextResponse.json(
        { error: "Esta página é gerenciada por Conteúdo da Loja." },
        { status: 409 },
      );
    }

    const paginaAtual = await prisma.lojaPagina.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        tipo: true,
        publicadoEm: true,
      },
    });

    if (!paginaAtual) {
      return NextResponse.json(
        { error: "Página não encontrada." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const data: {
      titulo?: string;
      slug?: string;
      tipo?: string;
      categoriaId?: string | null;
      ativo?: boolean;
      statusPublicacao?: string;
      usarComoTemplatePadrao?: boolean;
      seoTitle?: string | null;
      seoDescription?: string | null;
      termosBusca?: string | null;
      publicadoEm?: Date | null;
    } = {};

    if (typeof body.titulo !== "undefined") {
      const titulo = String(body.titulo || "").trim();

      if (!titulo) {
        return NextResponse.json(
          { error: "Título da página é obrigatório." },
          { status: 400 }
        );
      }

      data.titulo = titulo;
    }

    const proximoTipo =
      typeof body.tipo !== "undefined"
        ? String(body.tipo || "").trim()
        : paginaAtual.tipo;

    if (!TIPOS_VALIDOS.has(proximoTipo)) {
      return NextResponse.json(
        { error: "Tipo de página inválido." },
        { status: 400 }
      );
    }

    if (typeof body.tipo !== "undefined") {
      data.tipo = proximoTipo;
    }

    const categoriaIdInformada =
      typeof body.categoriaId !== "undefined"
        ? parseStringOrNull(body.categoriaId)
        : undefined;

    if (proximoTipo === "CATEGORIA") {
      if (categoriaIdInformada === null) {
        return NextResponse.json(
          { error: "Selecione uma categoria para páginas do tipo categoria." },
          { status: 400 }
        );
      }

      if (typeof categoriaIdInformada === "string") {
        const categoria = await prisma.categoriaProduto.findUnique({
          where: { id: categoriaIdInformada },
          select: {
            id: true,
          },
        });

        if (!categoria) {
          return NextResponse.json(
            { error: "Categoria vinculada não encontrada." },
            { status: 404 }
          );
        }

        const paginaCategoriaExistente = await prisma.lojaPagina.findFirst({
          where: {
            id: {
              not: id,
            },
            tipo: "CATEGORIA",
            categoriaId: categoriaIdInformada,
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

        data.categoriaId = categoriaIdInformada;
      }
    } else if (typeof categoriaIdInformada !== "undefined") {
      data.categoriaId = null;
    }

    if (typeof body.slug !== "undefined") {
      const slugInformado = String(body.slug || "").trim();

      if (proximoTipo === "HOME") {
        data.slug = "home";
      } else {
        data.slug = await gerarSlugUnico(slugInformado, id);
      }
    }

    if (typeof body.ativo !== "undefined") {
      data.ativo = parseBoolean(body.ativo, true);
    }

if (typeof body.statusPublicacao !== "undefined") {
  const statusPublicacao = String(body.statusPublicacao || "").trim();

  if (!STATUS_VALIDOS.has(statusPublicacao)) {
    return NextResponse.json(
      { error: "Status de publicação inválido." },
      { status: 400 }
    );
  }

  data.statusPublicacao = statusPublicacao;

  if (statusPublicacao === "PUBLICADA") {
    data.ativo = true;
    data.publicadoEm = new Date();
  }

  if (statusPublicacao === "RASCUNHO") {
    data.ativo = false;
    data.publicadoEm = null;
  }

  if (statusPublicacao === "ARQUIVADA") {
    data.ativo = false;
    data.publicadoEm = null;
  }
}

    if (typeof body.usarComoTemplatePadrao !== "undefined") {
      data.usarComoTemplatePadrao =
        proximoTipo === "TEMPLATE_CATEGORIA"
          ? parseBoolean(body.usarComoTemplatePadrao, false)
          : false;
    }

    if (typeof body.seoTitle !== "undefined") {
      data.seoTitle = parseStringOrNull(body.seoTitle);
    }

    if (typeof body.seoDescription !== "undefined") {
      data.seoDescription = parseStringOrNull(body.seoDescription);
    }

    if (typeof body.termosBusca !== "undefined") {
      data.termosBusca = parseStringOrNull(body.termosBusca);
    }

    if (data.usarComoTemplatePadrao) {
      await prisma.lojaPagina.updateMany({
        where: {
          id: {
            not: id,
          },
          tipo: "TEMPLATE_CATEGORIA",
          usarComoTemplatePadrao: true,
        },
        data: {
          usarComoTemplatePadrao: false,
        },
      });
    }

    const pagina = await prisma.lojaPagina.update({
      where: { id },
      data,
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
    console.error("Erro ao atualizar página da loja:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar página da loja.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const usuario = await exigirAcessoConteudo("excluir");
  if (!usuario) return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
  if (!validarOrigemMutacao(req)) {
    return NextResponse.json({ error: "Origem da requisição inválida." }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const documento = await prisma.lojaConteudoDocumento.findUnique({
      where: { paginaId: id },
      select: { id: true },
    });
    if (documento) {
      return NextResponse.json(
        { error: "Páginas com histórico de conteúdo não podem ser excluídas pelo endpoint legado." },
        { status: 409 },
      );
    }

    const pagina = await prisma.lojaPagina.findUnique({
      where: { id },
      select: {
        id: true,
        titulo: true,
        slug: true,
        tipo: true,
      },
    });

    if (!pagina) {
      return NextResponse.json(
        { error: "Página não encontrada." },
        { status: 404 }
      );
    }

    if (pagina.tipo === "HOME" || pagina.slug === "home") {
      return NextResponse.json(
        { error: "A página Home não pode ser excluída permanentemente." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.lojaPaginaBloco.deleteMany({
        where: {
          paginaId: id,
        },
      });

      await tx.lojaPagina.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Página excluída permanentemente.",
    });
  } catch (error) {
    console.error("Erro ao excluir página da loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao excluir página da loja.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
