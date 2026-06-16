import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LojaClient, {
  type LojaBannerItem,
  type LojaBlocoHomeItem,
  type LojaCategoriaHomeItem,
  type LojaMenuItem,
} from "@/components/loja/LojaClient";
import LojaPaginaBuilderClient, {
  type LojaBuilderBloco,
  type LojaBuilderCategoriaAtual,
  type LojaBuilderMenu,
  type LojaBuilderProduto,
  type LojaBuilderPagina,
} from "@/components/loja/LojaPaginaBuilderClient";
import {
  buscarCategoriaPublicaPorSlug,
  buscarCategoriasMenuPublico,
  slugifyCategoria,
} from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarProdutosPublicosPorCategoriaIds } from "@/lib/loja/produtos";
import { criarMetadataLoja, getImagemSeoBlocos } from "@/lib/loja/seo";

type LojaCategoriaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

function montarTituloSlug(slug: string) {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function normalizarTextoSeo(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function montarTituloSeoCategoria(tituloSeo: string | null | undefined, nome: string) {
  const tituloLimpo = tituloSeo?.trim();

  if (!tituloLimpo) {
    return `${nome} | Stella Colari`;
  }

  const tituloNormalizado = normalizarTextoSeo(tituloLimpo);
  const nomeNormalizado = normalizarTextoSeo(nome);

  if (tituloNormalizado.includes(nomeNormalizado)) {
    return `${tituloLimpo} | Stella Colari`;
  }

  return `${tituloLimpo} | ${nome} | Stella Colari`;
}

function paginaEstaPublica(pagina: {
  ativo: boolean;
  statusPublicacao?: string | null;
}) {
  return pagina.ativo && (pagina.statusPublicacao || "PUBLICADA") === "PUBLICADA";
}

function getPaginaBuilderPublicaSelect(categoriaId: string) {
  return {
    where: {
      tipo: "CATEGORIA",
      categoriaId,
      ativo: true,
      statusPublicacao: "PUBLICADA",
    },
    include: {
      blocos: {
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" as const }, { criadoEm: "asc" as const }],
      },
    },
  };
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

export async function generateMetadata({
  params,
}: LojaCategoriaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugNormalizado = slugifyCategoria(decodeURIComponent(slug));

  const resultado = await buscarCategoriaPublicaPorSlug(slugNormalizado);

  if (!resultado) {
    return criarMetadataLoja({
      title: `${montarTituloSlug(slug)} | Stella Colari`,
      path: `/loja/categoria/${slugNormalizado}`,
      robots: {
        index: false,
        follow: false,
      },
    });
  }

  const paginaBuilder = await prisma.lojaPagina.findFirst({
    where: {
      tipo: "CATEGORIA",
      categoriaId: resultado.categoria.id,
      ativo: true,
      statusPublicacao: "PUBLICADA",
    },
    select: {
      titulo: true,
      seoTitle: true,
      seoDescription: true,
      blocos: {
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        select: {
          configJson: true,
        },
      },
    },
  });
  const templateBuilder = paginaBuilder
    ? null
    : await prisma.lojaPagina.findFirst({
        where: {
          tipo: "TEMPLATE_CATEGORIA",
          usarComoTemplatePadrao: true,
          ativo: true,
          statusPublicacao: "PUBLICADA",
        },
        select: {
          seoDescription: true,
          blocos: {
            where: {
              ativo: true,
            },
            orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
            select: {
              configJson: true,
            },
          },
        },
      });

  return criarMetadataLoja({
    title: montarTituloSeoCategoria(
      paginaBuilder?.seoTitle || paginaBuilder?.titulo,
      resultado.categoria.nome
    ),
    description:
      paginaBuilder?.seoDescription ||
      resultado.categoria.descricao ||
      templateBuilder?.seoDescription ||
      `Conheca os produtos de ${resultado.categoria.nome} da Stella Colari.`,
    path: `/loja/categoria/${resultado.categoria.slug}`,
    image:
      resultado.categoria.imagemUrl ||
      getImagemSeoBlocos(paginaBuilder?.blocos ?? []) ||
      getImagemSeoBlocos(templateBuilder?.blocos ?? []),
  });
}

export default async function LojaCategoriaPage({
  params,
}: LojaCategoriaPageProps) {
  const { slug } = await params;
  const slugNormalizado = slugifyCategoria(decodeURIComponent(slug));

  const resultadoCategoria = await buscarCategoriaPublicaPorSlug(slugNormalizado);

  if (!resultadoCategoria) {
    notFound();
  }

  const categoria = resultadoCategoria.categoria;

  const [
    produtosCategoria,
    menusPublicos,
    categoriasMenu,
    configuracaoMenuRodape,
    paginaCategoriaRaw,
    templateCategoriaRaw,
  ] = await Promise.all([
    buscarProdutosPublicosPorCategoriaIds(resultadoCategoria.idsCategoria),
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),

    prisma.lojaPagina.findFirst(getPaginaBuilderPublicaSelect(categoria.id)),

    prisma.lojaPagina.findFirst({
      where: {
        tipo: "TEMPLATE_CATEGORIA",
        usarComoTemplatePadrao: true,
        ativo: true,
        statusPublicacao: "PUBLICADA",
      },
      include: {
        blocos: {
          where: {
            ativo: true,
          },
          orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        },
      },
    }),
  ]);

  const paginaParaRenderizar =
    paginaCategoriaRaw && paginaEstaPublica(paginaCategoriaRaw)
      ? paginaCategoriaRaw
      : templateCategoriaRaw && paginaEstaPublica(templateCategoriaRaw)
      ? templateCategoriaRaw
      : null;

  const categoriaAtual: LojaBuilderCategoriaAtual = {
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    descricao: categoria.descricao || null,
    imagemUrl: categoria.imagemUrl || null,
    href: `/loja/categoria/${categoria.slug}`,
    subcategorias: resultadoCategoria.subcategorias.map((subcategoria) => ({
      id: subcategoria.id,
      nome: subcategoria.nome,
      slug: subcategoria.slug,
      descricao: subcategoria.descricao || null,
      imagemUrl: subcategoria.imagemUrl || null,
      href: `/loja/categoria/${subcategoria.slug}`,
    })),
  };

  if (paginaParaRenderizar) {
    const pagina: LojaBuilderPagina = serializarPaginaBuilder({
      id: paginaParaRenderizar.id,
      titulo:
        paginaParaRenderizar.tipo === "TEMPLATE_CATEGORIA"
          ? categoria.nome
          : paginaParaRenderizar.titulo,
      slug: categoria.slug,
      tipo: paginaParaRenderizar.tipo,
    });

const blocos = serializarBlocosBuilder(paginaParaRenderizar.blocos);

const produtosCategoriaSerializados = produtosCategoria.map((produto) => ({
  ...produto,
  imagemUrl: produto.imagemUrl ?? null,
  imagemHoverUrl: produto.imagemHoverUrl ?? null,
}));

const produtos = serializarProdutosBuilder(produtosCategoriaSerializados);

const menusPublicosSerializados = menusPublicos.map((menu) => ({
  ...menu,
  destaque: menu.destaque ?? false,
  corDestaque: menu.corDestaque ?? null,
}));

const menus = serializarMenusBuilder(menusPublicosSerializados);

    return (
      <LojaPaginaBuilderClient
        pagina={pagina}
        blocos={blocos}
        produtos={produtos}
        menus={menus}
        categoriasMenu={categoriasMenu}
        categoriaAtual={categoriaAtual}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    );
  }

const banners: LojaBannerItem[] = categoria.imagemUrl
  ? [
      {
        id: `categoria-${categoria.id}`,
        titulo: categoria.nome,
        subtitulo: categoria.descricao,
        imagemUrl: categoria.imagemUrl,
        imagemMobileUrl: null,
        linkUrl: null,
        ordem: 0,
        ativo: true,
      },
    ]
  : [];

  const menus: LojaMenuItem[] = menusPublicos.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    slug: "",
    tipo: "LINK",
    href: menu.href,
    categoria: null,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));

  const categoriasHome: LojaCategoriaHomeItem[] =
    resultadoCategoria.subcategorias
      .filter((subcategoria) => subcategoria.imagemUrl)
      .map((subcategoria) => ({
        id: subcategoria.id,
        titulo: subcategoria.nome,
        categoria: subcategoria.nome,
        imagemUrl: subcategoria.imagemUrl as string,
      }));

  const categoriasDaSecao = Array.from(
    new Set(produtosCategoria.map((produto) => produto.categoria))
  );

  const blocoHome: LojaBlocoHomeItem | null = categoria.descricao
    ? {
        id: `texto-${categoria.id}`,
        titulo: categoria.nome,
        texto: categoria.descricao,
        imagemUrl: null,
        textoBotao: null,
        linkBotao: null,
      }
    : null;

  return (
    <LojaClient
      produtos={produtosCategoria}
      banners={banners}
      menus={menus}
      categoriasHome={categoriasHome}
      secoesHome={[
        {
          id: `categoria-${categoria.id}`,
          titulo: categoria.nome,
          categorias: categoriasDaSecao,
        },
      ]}
      blocoHome={blocoHome}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
      mostrarTodosProdutos={false}
      tituloVazio={`Nenhum produto em ${categoria.nome}.`}
      textoVazio="Produtos vinculados a esta categoria aparecerão aqui automaticamente."
    />
  );
}
