import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import EditorVisualPaginaClient, {
  type EditorVisualBloco,
  type EditorVisualCategoria,
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

  const [paginaRaw, categoriasRaw, paginasBuilderRaw] = await Promise.all([
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

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/configuracoes/loja/paginas"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para páginas
            </Link>

            <p className="mt-5 text-sm font-medium uppercase tracking-wide text-slate-500">
              Editor visual
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {pagina.titulo}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Edite blocos, conteúdo, mídia e aparência com preview por
              dispositivo em uma única experiência de edição.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                Tipo: {pagina.tipo}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                Slug: {pagina.slug}
              </span>

              <span
                className={`rounded-full px-3 py-1 font-semibold ${
                  pagina.ativo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {pagina.ativo ? "Ativa" : "Inativa"}
              </span>

              <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
                {pagina.statusPublicacao}
              </span>

              {pagina.categoriaNome && (
                <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                  Categoria: {pagina.categoriaNome}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={pagina.urlPublica}
              target="_blank"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver página pública
            </Link>
          </div>
        </div>
      </section>

      <EditorVisualPaginaClient
        pagina={pagina}
        blocos={blocos}
        categoriasDisponiveis={categoriasDisponiveis}
        paginasDisponiveis={paginasDisponiveis}
        produtosDisponiveis={produtosDisponiveis}
      />
    </main>
  );
}
