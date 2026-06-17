import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditorVisualPaginaClient, {
  type EditorVisualBloco,
  type EditorVisualCategoria,
  type EditorVisualColecaoInteligente,
  type EditorVisualPagina,
  type EditorVisualPaginaLink,
  type EditorVisualProduto,
} from "@/components/configuracoes/loja/EditorVisualPaginaClient";

export const metadata: Metadata = {
  title: "Editor visual da página | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function montarCaminhoCategoria(
  categoria: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  },
  categorias: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  }[]
) {
  const mapa = new Map(categorias.map((item) => [item.id, item]));
  const partes = [categoria.nome];

  let atual = categoria.categoriaMaeId
    ? mapa.get(categoria.categoriaMaeId)
    : null;

  while (atual) {
    partes.unshift(atual.nome);
    atual = atual.categoriaMaeId ? mapa.get(atual.categoriaMaeId) : null;
  }

  return partes.join(" > ");
}

function getUrlPublicaPagina(pagina: {
  slug: string;
  tipo: string;
  categoria?: {
    slug: string;
  } | null;
}) {
  if (pagina.slug === "home" || pagina.tipo === "HOME") {
    return "/loja";
  }

  if (pagina.tipo === "CATEGORIA" && pagina.categoria?.slug) {
    return `/loja/categoria/${pagina.categoria.slug}`;
  }

  return `/loja/p/${pagina.slug}`;
}

function coletarIdsCategoriaComFilhas(
  categoriaId: string,
  categorias: {
    id: string;
    categoriaMaeId: string | null;
  }[]
) {
  const ids = new Set([categoriaId]);

  function visitar(idPai: string) {
    categorias.forEach((categoria) => {
      if (categoria.categoriaMaeId === idPai) {
        ids.add(categoria.id);
        visitar(categoria.id);
      }
    });
  }

  visitar(categoriaId);

  return Array.from(ids);
}

export default async function EditorVisualPaginaPage({ params }: PageProps) {
  const { id } = await params;

  const [paginaRaw, categoriasRaw, paginasBuilderRaw, colecoesRaw] = await Promise.all([
    prisma.lojaPagina.findUnique({
      where: { id },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        blocos: {
          orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        },
      },
    }),

    prisma.categoriaProduto.findMany({
      where: {
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        imagemUrl: true,
        categoriaMaeId: true,
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),

    prisma.lojaPagina.findMany({
      where: {
        ativo: true,
        statusPublicacao: "PUBLICADA",
        tipo: {
          notIn: ["HOME", "CATEGORIA"],
        },
      },
      select: {
        id: true,
        titulo: true,
        slug: true,
        tipo: true,
      },
      orderBy: [{ titulo: "asc" }],
    }),

    prisma.colecaoInteligente.findMany({
      where: {
        status: {
          not: "ARQUIVADA",
        },
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        tipo: true,
        status: true,
        _count: {
          select: {
            produtos: {
              where: {
                status: "APROVADO",
              },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { nome: "asc" }],
    }),
  ]);

  if (!paginaRaw) {
    notFound();
  }

  const produtosWhere: Prisma.ProdutoWhereInput = {
    ativo: true,
    status: {
      not: "NA_LIXEIRA",
    },
  };

  if (paginaRaw.tipo === "CATEGORIA" && paginaRaw.categoriaId) {
    produtosWhere.categoriasProduto = {
      some: {
        categoriaId: {
          in: coletarIdsCategoriaComFilhas(paginaRaw.categoriaId, categoriasRaw),
        },
      },
    };
  }

  const produtosRaw = await prisma.produto.findMany({
    where: produtosWhere,
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      imagemUrl: true,
      categoria: true,
      categoriasProduto: {
        select: {
          categoria: {
            select: {
              id: true,
              nome: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: {
      nome: "asc",
    },
    take: 240,
  });

  const pagina: EditorVisualPagina = {
    id: paginaRaw.id,
    titulo: paginaRaw.titulo,
    slug: paginaRaw.slug,
    tipo: paginaRaw.tipo,
    ativo: paginaRaw.ativo,
    statusPublicacao: paginaRaw.statusPublicacao,
    seoTitle: paginaRaw.seoTitle,
    seoDescription: paginaRaw.seoDescription,
    termosBusca: paginaRaw.termosBusca,
    urlPublica: getUrlPublicaPagina(paginaRaw),
    categoriaId: paginaRaw.categoria?.id || null,
    categoriaNome: paginaRaw.categoria?.nome || null,
    categoriaSlug: paginaRaw.categoria?.slug || null,
  };

  const blocos: EditorVisualBloco[] = paginaRaw.blocos.map((bloco) => ({
    id: bloco.id,
    tipo: bloco.tipo,
    titulo: bloco.titulo,
    ativo: bloco.ativo,
    ordem: bloco.ordem,
    configJson: bloco.configJson,
    criadoEm: bloco.criadoEm.toISOString(),
    atualizadoEm: bloco.atualizadoEm.toISOString(),
  }));

  const categoriasDisponiveis: EditorVisualCategoria[] = categoriasRaw.map(
    (categoria) => ({
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      imagemUrl: categoria.imagemUrl,
      categoriaMaeId: categoria.categoriaMaeId,
      caminho: montarCaminhoCategoria(categoria, categoriasRaw),
    })
  );

  const paginasDisponiveis: EditorVisualPaginaLink[] = paginasBuilderRaw.map(
    (paginaLink) => ({
      id: paginaLink.id,
      titulo: paginaLink.titulo,
      slug: paginaLink.slug,
      tipo: paginaLink.tipo,
      urlPublica: `/loja/p/${paginaLink.slug}`,
    })
  );

  const produtosDisponiveis: EditorVisualProduto[] = produtosRaw.map(
    (produto) => ({
      id: produto.id,
      codigoInterno: produto.codigoInterno,
      nome: produto.nome,
      imagemUrl: produto.imagemUrl,
      categoria: produto.categoria,
      categoriaIds: produto.categoriasProduto.map(
        (item) => item.categoria.id
      ),
      categoriaNomes: produto.categoriasProduto.map(
        (item) => item.categoria.nome
      ),
    })
  );

  const colecoesInteligentes: EditorVisualColecaoInteligente[] =
    colecoesRaw.map((colecao) => ({
      id: colecao.id,
      nome: colecao.nome,
      slug: colecao.slug,
      tipo: colecao.tipo,
      status: colecao.status,
      produtosAprovados: colecao._count.produtos,
    }));

  return (
    <EditorVisualPaginaClient
      pagina={pagina}
      blocos={blocos}
      categoriasDisponiveis={categoriasDisponiveis}
      paginasDisponiveis={paginasDisponiveis}
      produtosDisponiveis={produtosDisponiveis}
      colecoesInteligentes={colecoesInteligentes}
    />
  );
}
