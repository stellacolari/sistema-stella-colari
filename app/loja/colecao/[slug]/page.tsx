import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LojaPaginaBuilderClient, {
  type LojaBuilderBloco,
  type LojaBuilderMenu,
  type LojaBuilderPagina,
  type LojaBuilderProduto,
} from "@/components/loja/LojaPaginaBuilderClient";
import { prisma } from "@/lib/prisma";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { resolverFonteProdutosBuilder } from "@/lib/loja/colecoes-inteligentes";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";
import { criarMetadataLoja } from "@/lib/loja/seo";
import { serializarBlocoBuilderPublico } from "@/lib/loja/blocos-publicos.server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function serializarProdutosBuilder(
  produtosPublicos: Awaited<ReturnType<typeof buscarProdutosPublicos>>
) {
  const produtos: LojaBuilderProduto[] = produtosPublicos;

  return produtos;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const colecao = await prisma.colecaoInteligente.findFirst({
    where: {
      slug,
      status: "ATIVA",
    },
    select: {
      nome: true,
      descricao: true,
      slug: true,
    },
  });

  if (!colecao) {
    return criarMetadataLoja({
      title: "Colecao | Stella Colari",
      path: `/loja/colecao/${slug}`,
      robots: {
        index: false,
        follow: false,
      },
    });
  }

  return criarMetadataLoja({
    title: `${colecao.nome} | Stella Colari`,
    description: colecao.descricao,
    path: `/loja/colecao/${colecao.slug}`,
  });
}

export default async function LojaColecaoPage({ params }: PageProps) {
  const { slug } = await params;

  const [colecao, produtosPublicos, menusPublicos, categoriasMenu, configuracaoMenuRodape] =
    await Promise.all([
      prisma.colecaoInteligente.findFirst({
        where: {
          slug,
          status: "ATIVA",
        },
        select: {
          id: true,
          nome: true,
          slug: true,
          descricao: true,
        },
      }),
      buscarProdutosPublicos(),
      buscarMenusPublicos(),
      buscarCategoriasMenuPublico(),
      buscarConfiguracaoMenuRodape(),
    ]);

  if (!colecao) {
    notFound();
  }

  const produtosIds = await resolverFonteProdutosBuilder({
    fonte: "COLECAO_INTELIGENTE",
    colecaoInteligenteId: colecao.id,
    colecaoInteligenteSlug: colecao.slug,
    ordenacaoColecao: "ORDEM_APROVADA",
    incluirSugeridosColecao: false,
    limite: 48,
  });

  const pagina: LojaBuilderPagina = {
    id: colecao.id,
    titulo: colecao.nome,
    slug: colecao.slug,
    tipo: "COLECAO_INTELIGENTE",
  };

  const blocos: LojaBuilderBloco[] = [
    serializarBlocoBuilderPublico({
      id: `colecao-${colecao.id}`,
      tipo: "LISTA_PRODUTOS",
      titulo: colecao.nome,
      ordem: 1,
      configJson: {
        titulo: colecao.nome,
        descricao: colecao.descricao || "",
        fonte: "MANUAL",
        produtosIds,
        limite: 48,
        layoutDesktop: "GRID",
        layoutMobile: "GRID",
        habilitarFiltros: true,
        colunasDesktop: 4,
        colunasTablet: 3,
        colunasMobile: 2,
        exibirPreco: true,
        exibirBotao: true,
        exibirSeloDesconto: true,
        corFundo: "BRANCO",
        espacamento: "PADRAO",
      },
    }),
  ];

  const produtos = serializarProdutosBuilder(produtosPublicos);

  const menus: LojaBuilderMenu[] = menusPublicos.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: menu.href,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));

  return (
    <LojaPaginaBuilderClient
      pagina={pagina}
      blocos={blocos}
      produtos={produtos}
      menus={menus}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
    />
  );
}
