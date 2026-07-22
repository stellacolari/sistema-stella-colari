
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  AdminPermissaoError,
  exigirAdminComPermissao,
} from "@/lib/auth/admin";
import LojaPaginaBuilderClient, {
  type LojaBuilderBloco,
  type LojaBuilderCategoriaAtual,
  type LojaBuilderMenu,
  type LojaBuilderProduto,
  type LojaBuilderPagina,
} from "@/components/loja/LojaPaginaBuilderClient";
import LojaPreviewPaginaClient from "@/components/loja/LojaPreviewPaginaClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { aplicarColecoesEmBlocosBuilder } from "@/lib/loja/colecoes-inteligentes";
import {
  buscarProdutosPublicos,
  buscarProdutosPublicosPorCategoriaIds,
} from "@/lib/loja/produtos";
import type { ProdutoPublico } from "@/lib/loja/produto-publico";
import { serializarBlocosBuilderPublicos } from "@/lib/loja/blocos-publicos.server";
import { buscarConteudoPreviewPagina } from "@/lib/loja/conteudo/repository.server";
import { rotaPublicaConteudoPagina } from "@/lib/loja/conteudo/public-route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Prévia da página | Stella Colari",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    categoria?: string;
    studio?: string;
    conteudo?: string;
    embed?: string;
  }>;
};

async function exigirAcessoPreviewLoja() {
  try {
    await exigirAdminComPermissao("lojaOnline", "ver");
  } catch (error) {
    if (error instanceof AdminPermissaoError) {
      notFound();
    }

    throw error;
  }
}

function serializarPaginaBuilder(paginaRaw: {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
}) {
  const pagina: LojaBuilderPagina = {
    id: paginaRaw.id,
    titulo: paginaRaw.titulo,
    slug: paginaRaw.slug,
    tipo: paginaRaw.tipo,
  };

  return pagina;
}

function serializarBlocosBuilder(
  blocosRaw: {
    id: string;
    tipo: string;
    titulo: string | null;
    ordem: number;
    configJson: unknown;
  }[]
) {
  const blocos: LojaBuilderBloco[] =
    serializarBlocosBuilderPublicos(blocosRaw);

  return blocos;
}

function serializarProdutosBuilder(
  produtosPublicos: ProdutoPublico[]
) {
  const produtos: LojaBuilderProduto[] = produtosPublicos;

  return produtos;
}

function serializarMenusBuilder(
  menusPublicos: {
    id: string;
    nome: string;
    href: string;
    destaque: boolean;
    corDestaque: string | null;
  }[]
) {
  const menus: LojaBuilderMenu[] = menusPublicos.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: menu.href,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));

  return menus;
}

async function buscarCategoriaParaPreview({
  tipoPagina,
  categoriaId,
  categoriaSlugBusca,
}: {
  tipoPagina: string;
  categoriaId?: string | null;
  categoriaSlugBusca?: string | null;
}) {
  if (tipoPagina === "CATEGORIA" && categoriaId) {
    return prisma.categoriaProduto.findUnique({
      where: {
        id: categoriaId,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        descricao: true,
        imagemUrl: true,
      },
    });
  }

  if (tipoPagina === "TEMPLATE_CATEGORIA" && categoriaSlugBusca) {
    return prisma.categoriaProduto.findFirst({
      where: {
        slug: categoriaSlugBusca,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        descricao: true,
        imagemUrl: true,
      },
    });
  }

  if (tipoPagina === "TEMPLATE_CATEGORIA") {
    return prisma.categoriaProduto.findFirst({
      where: {
        ativo: true,
      },
      orderBy: {
        nome: "asc",
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        descricao: true,
        imagemUrl: true,
      },
    });
  }

  return null;
}

async function montarCategoriaAtual(
  categoria: {
    id: string;
    nome: string;
    slug: string;
    descricao: string | null;
    imagemUrl: string | null;
  } | null
): Promise<{
  categoriaAtual?: LojaBuilderCategoriaAtual;
  idsCategoria: string[];
}> {
  if (!categoria) {
    return {
      categoriaAtual: undefined,
      idsCategoria: [],
    };
  }

  const subcategorias = await prisma.categoriaProduto.findMany({
    where: {
      categoriaMaeId: categoria.id,
      ativo: true,
    },
    orderBy: {
      nome: "asc",
    },
    select: {
      id: true,
      nome: true,
      slug: true,
      descricao: true,
      imagemUrl: true,
    },
  });

  const categoriaAtual: LojaBuilderCategoriaAtual = {
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    descricao: categoria.descricao || null,
    imagemUrl: categoria.imagemUrl || null,
    href: `/loja/categoria/${categoria.slug}`,
    subcategorias: subcategorias.map((subcategoria) => ({
      id: subcategoria.id,
      nome: subcategoria.nome,
      slug: subcategoria.slug,
      descricao: subcategoria.descricao || null,
      imagemUrl: subcategoria.imagemUrl || null,
      href: `/loja/categoria/${subcategoria.slug}`,
    })),
  };

  return {
    categoriaAtual,
    idsCategoria: [categoria.id, ...subcategorias.map((item) => item.id)],
  };
}

export default async function LojaPreviewPaginaPage({
  params,
  searchParams,
}: PageProps) {
  await exigirAcessoPreviewLoja();

  const { id } = await params;
  const search = searchParams ? await searchParams : {};
  const categoriaSlugBusca =
    typeof search?.categoria === "string" ? search.categoria : null;
  const studioMode = search?.studio === "1";
  const studioEmbed = studioMode || search?.studio === "visualizar";
  const contentEmbed = search?.embed === "1";
  const conteudoScope = search?.conteudo === "publicado"
    ? "PUBLICADO" as const
    : search?.conteudo === "rascunho" || search?.conteudo === "1"
      ? "RASCUNHO" as const
      : null;
  const conteudoMode = conteudoScope !== null;

  const paginaRaw = await prisma.lojaPagina.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      titulo: true,
      slug: true,
      tipo: true,
      categoriaId: true,
      ativo: true,
      statusPublicacao: true,
      publicadoEm: true,
      atualizadoEm: true,
      seoTitle: true,
      seoDescription: true,
      categoria: {
        select: {
          id: true,
          nome: true,
          slug: true,
          descricao: true,
          imagemUrl: true,
        },
      },
      blocos: {
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        select: {
          id: true,
          tipo: true,
            titulo: true,
            ativo: true,
            ordem: true,
          configJson: true,
        },
      },
    },
  });

  if (!paginaRaw || paginaRaw.statusPublicacao === "ARQUIVADA") {
    notFound();
  }

  const categoriaPreview = await buscarCategoriaParaPreview({
    tipoPagina: paginaRaw.tipo,
    categoriaId: paginaRaw.categoriaId,
    categoriaSlugBusca,
  });

  const { categoriaAtual, idsCategoria } =
    await montarCategoriaAtual(categoriaPreview);

  const [
    menusPublicos,
    categoriasMenu,
    configuracaoMenuRodape,
    produtosPublicos,
  ] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),
    idsCategoria.length > 0
      ? buscarProdutosPublicosPorCategoriaIds(idsCategoria)
      : buscarProdutosPublicos(),
  ]);

  const pagina: LojaBuilderPagina = serializarPaginaBuilder({
    id: paginaRaw.id,
    titulo:
      paginaRaw.tipo === "TEMPLATE_CATEGORIA" && categoriaAtual
        ? `${paginaRaw.titulo} — prévia com ${categoriaAtual.nome}`
        : paginaRaw.titulo,
    slug:
      paginaRaw.tipo === "CATEGORIA" && categoriaAtual
        ? categoriaAtual.slug
        : paginaRaw.slug,
    tipo: paginaRaw.tipo,
  });

const produtosPublicosSerializados = produtosPublicos.map((produto) => ({
  ...produto,
  imagemUrl: produto.imagemUrl ?? null,
  imagemHoverUrl: produto.imagemHoverUrl ?? null,
}));

const menusPublicosSerializados = menusPublicos.map((menu) => ({
  ...menu,
  destaque: menu.destaque ?? false,
  corDestaque: menu.corDestaque ?? null,
}));

const produtos = serializarProdutosBuilder(produtosPublicosSerializados);
const menus = serializarMenusBuilder(menusPublicosSerializados);
const conteudoGerenciado = conteudoScope === "PUBLICADO"
  ? await buscarConteudoPreviewPagina(paginaRaw, "PUBLICADO")
  : conteudoScope === "RASCUNHO"
    ? await buscarConteudoPreviewPagina(paginaRaw, "RASCUNHO")
    : null;
const conteudoIndisponivel = conteudoMode && !conteudoGerenciado;
const blocosResolvidos = conteudoIndisponivel
  ? []
  : conteudoGerenciado?.modoEntrega === "NOVO"
    ? conteudoGerenciado.baseVisualHome ?? []
    : await aplicarColecoesEmBlocosBuilder(paginaRaw.blocos);
const blocos = serializarBlocosBuilder(blocosResolvidos);
const conteudoProjetado = conteudoGerenciado
  ? {
      contrato: conteudoGerenciado.contrato,
      conteudo: conteudoGerenciado.conteudo,
    }
  : null;

  const urlPublica = rotaPublicaConteudoPagina(paginaRaw) || "";
  const paginaPublica =
    paginaRaw.ativo && paginaRaw.statusPublicacao === "PUBLICADA";

  return (
    <>
      {!studioEmbed && !contentEmbed && (
        <div className="sticky top-0 z-[100] border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <strong>
                {conteudoScope === "PUBLICADO"
                  ? "Preview publicado:"
                  : conteudoScope === "RASCUNHO"
                    ? "Preview do rascunho:"
                    : "Prévia da página:"}
              </strong>{" "}
              <span>{paginaRaw.titulo}</span>
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                {conteudoScope === "PUBLICADO" ? "PUBLICADO" : conteudoScope === "RASCUNHO" ? "RASCUNHO" : paginaRaw.statusPublicacao}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {conteudoMode && conteudoScope !== "RASCUNHO" ? (
                <Link
                  href={`/loja/preview/pagina/${pagina.id}?conteudo=rascunho`}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  Preview do rascunho
                </Link>
              ) : null}

              {conteudoMode && conteudoScope !== "PUBLICADO" ? (
                <Link
                  href={`/loja/preview/pagina/${pagina.id}?conteudo=publicado`}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  Preview publicado
                </Link>
              ) : null}

              {urlPublica && paginaPublica ? (
                <Link
                  href={urlPublica}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  Ver publicado
                </Link>
              ) : null}

              <Link
                href={conteudoMode ? "/configuracoes/loja/conteudo/paginas" : "/configuracoes/loja/paginas"}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Voltar para páginas
              </Link>
            </div>
          </div>
        </div>
      )}

      {conteudoIndisponivel ? (
        <main className="min-h-screen bg-slate-50 px-4 py-16">
          <div
            role="status"
            className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm"
          >
            <h1 className="text-lg font-semibold text-slate-950">
              {conteudoScope === "PUBLICADO"
                ? "Nenhuma versão publicada disponível"
                : "O preview do rascunho está indisponível"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Este preview não usa o rascunho nem o renderer legado como
              substitutos. Publique uma versão válida ou retorne a entrega ao
              legado de forma explícita.
            </p>
          </div>
        </main>
      ) : studioEmbed && !conteudoMode ? (
        <LojaPreviewPaginaClient
          pagina={pagina}
          blocos={blocos}
          produtos={produtos}
          menus={menus}
          categoriasMenu={categoriasMenu}
          categoriaAtual={categoriaAtual}
          configuracaoMenuRodape={configuracaoMenuRodape}
          studioMode={studioMode}
        />
      ) : (
        <LojaPaginaBuilderClient
          pagina={pagina}
          blocos={blocos}
          produtos={produtos}
          menus={menus}
          categoriasMenu={categoriasMenu}
          categoriaAtual={categoriaAtual}
          configuracaoMenuRodape={configuracaoMenuRodape}
          conteudoGerenciado={conteudoProjetado}
        />
      )}
    </>
  );
}
