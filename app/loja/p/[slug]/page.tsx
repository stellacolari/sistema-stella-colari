import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LojaPaginaBuilderClient, {
  type LojaBuilderBloco,
  type LojaBuilderMenu,
  type LojaBuilderProduto,
  type LojaBuilderPagina,
} from "@/components/loja/LojaPaginaBuilderClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";

export const dynamic = "force-dynamic";

const TIPOS_PERMITIDOS_EM_PAGINA_PUBLICA = ["GERAL", "LANDING", "CAMPANHA"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const pagina = await prisma.lojaPagina.findFirst({
    where: {
      slug,
      ativo: true,
      statusPublicacao: "PUBLICADA",
      tipo: {
        in: TIPOS_PERMITIDOS_EM_PAGINA_PUBLICA,
      },
    },
    select: {
      titulo: true,
      seoTitle: true,
      seoDescription: true,
    },
  });

  return {
    title: pagina
      ? `${pagina.seoTitle || pagina.titulo} | Stella Colari`
      : "Stella Colari | Loja Online",
    description: pagina?.seoDescription || undefined,
  };
}

export default async function LojaPaginaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [
    paginaRaw,
    produtosPublicos,
    menusPublicos,
    categoriasMenu,
    configuracaoMenuRodape,
  ] =
    await Promise.all([
      prisma.lojaPagina.findFirst({
        where: {
          slug,
          ativo: true,
          statusPublicacao: "PUBLICADA",
          tipo: {
            in: TIPOS_PERMITIDOS_EM_PAGINA_PUBLICA,
          },
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

      buscarProdutosPublicos(),

      buscarMenusPublicos(),

      buscarCategoriasMenuPublico(),

      buscarConfiguracaoMenuRodape(),
    ]);

  if (!paginaRaw) {
    notFound();
  }

  const pagina: LojaBuilderPagina = {
    id: paginaRaw.id,
    titulo: paginaRaw.titulo,
    slug: paginaRaw.slug,
    tipo: paginaRaw.tipo,
  };

  const blocos: LojaBuilderBloco[] = paginaRaw.blocos.map((bloco) => ({
    id: bloco.id,
    tipo: bloco.tipo,
    titulo: bloco.titulo,
    ordem: bloco.ordem,
    configJson: bloco.configJson,
  }));

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
