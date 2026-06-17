
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prévia da página | Stella Colari",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    categoria?: string;
    studio?: string;
  }>;
};

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
  const blocos: LojaBuilderBloco[] = blocosRaw.map((bloco) => ({
    id: bloco.id,
    tipo: bloco.tipo,
    titulo: bloco.titulo,
    ordem: bloco.ordem,
    configJson: bloco.configJson,
  }));

  return blocos;
}

function serializarProdutosBuilder(
  produtosPublicos: {
    id: string;
    codigoInterno: string;
    nome: string;
    imagemUrl: string | null;
    imagemHoverUrl: string | null;
    categoria: string;
    categoriaIds?: string[];
    categoriaSlugs?: string[];
    categoriaNomes?: string[];
    precoVenda: number;
    descontoAtivo: boolean;
    precoPromocional: number | null;
    estoqueTotal: number;
    vendidosTotal: number;
    criadoEm: string;
    tamanhosDisponiveis: {
      tamanhoAnel: string;
      quantidadeAtual: number;
    }[];
  }[]
) {
  const produtos: LojaBuilderProduto[] = produtosPublicos.map((produto) => ({
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.nome,
    imagemUrl: produto.imagemUrl,
    imagemHoverUrl: produto.imagemHoverUrl,
    categoria: produto.categoria,
    categoriaIds: produto.categoriaIds,
    categoriaSlugs: produto.categoriaSlugs,
    categoriaNomes: produto.categoriaNomes,
    precoVenda: produto.precoVenda,
    descontoAtivo: produto.descontoAtivo,
    precoPromocional: produto.precoPromocional,
    estoqueTotal: produto.estoqueTotal,
    vendidosTotal: produto.vendidosTotal,
    criadoEm: produto.criadoEm,
    tamanhosDisponiveis: produto.tamanhosDisponiveis,
  }));

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

function getUrlPublicaPagina(pagina: {
  tipo: string;
  slug: string;
  categoria?: {
    slug: string;
  } | null;
}) {
  if (pagina.tipo === "HOME" || pagina.slug === "home") {
    return "/loja";
  }

  if (pagina.tipo === "CATEGORIA" && pagina.categoria?.slug) {
    return `/loja/categoria/${pagina.categoria.slug}`;
  }

  if (pagina.tipo === "TEMPLATE_CATEGORIA") {
    return "";
  }

  return `/loja/p/${pagina.slug}`;
}

export default async function LojaPreviewPaginaPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const search = searchParams ? await searchParams : {};
  const categoriaSlugBusca =
    typeof search?.categoria === "string" ? search.categoria : null;
  const studioMode = search?.studio === "1";
  const studioEmbed = studioMode || search?.studio === "visualizar";

  const paginaRaw = await prisma.lojaPagina.findUnique({
    where: {
      id,
    },
    include: {
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

const blocosResolvidos = await aplicarColecoesEmBlocosBuilder(paginaRaw.blocos);
const blocos = serializarBlocosBuilder(blocosResolvidos);

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

  const urlPublica = getUrlPublicaPagina(paginaRaw);
  const paginaPublica =
    paginaRaw.ativo && paginaRaw.statusPublicacao === "PUBLICADA";

  return (
    <>
      {!studioEmbed && (
        <div className="sticky top-0 z-[100] border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <strong>Prévia de rascunho:</strong>{" "}
              <span>{paginaRaw.titulo}</span>
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                {paginaRaw.statusPublicacao}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {urlPublica && paginaPublica ? (
                <Link
                  href={urlPublica}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  Ver página publicada
                </Link>
              ) : null}

              <Link
                href="/configuracoes/loja/paginas"
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Voltar para páginas
              </Link>
            </div>
          </div>
        </div>
      )}

      {studioEmbed ? (
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
        />
      )}
    </>
  );
}
