import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LojaClient, {
  type LojaBannerItem,
  type LojaBlocoHomeItem,
  type LojaCategoriaHomeItem,
  type LojaMenuItem,
  type LojaSecaoHomeItem,
} from "@/components/loja/LojaClient";
import LojaPaginaBuilderClient, {
  type LojaBuilderBloco,
  type LojaBuilderMenu,
  type LojaBuilderPagina,
  type LojaBuilderProduto,
} from "@/components/loja/LojaPaginaBuilderClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";
import { criarMetadataLoja, getImagemSeoBlocos } from "@/lib/loja/seo";

export const dynamic = "force-dynamic";

const HOME_VISUAL_SLUG = "home";

export async function generateMetadata(): Promise<Metadata> {
  const homeVisual = await prisma.lojaPagina.findFirst({
    where: {
      slug: HOME_VISUAL_SLUG,
      tipo: "HOME",
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
  });
  const banner = homeVisual
    ? null
    : await prisma.bannerLoja.findFirst({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
        select: {
          imagemUrl: true,
        },
      });

  return criarMetadataLoja({
    title: homeVisual?.seoTitle || "Stella Colari | Loja Online",
    description:
      homeVisual?.seoDescription ||
      "Joias e pecas selecionadas da Stella Colari para comprar online com praticidade.",
    path: "/loja",
    image: getImagemSeoBlocos(homeVisual?.blocos ?? []) || banner?.imagemUrl,
  });
}

export default async function LojaPage() {
  const [
    produtos,
    menusPublicos,
    categoriasMenu,
    configuracaoMenuRodape,
    homeVisualRaw,
  ] =
    await Promise.all([
      buscarProdutosPublicos(),
      buscarMenusPublicos(),
      buscarCategoriasMenuPublico(),
      buscarConfiguracaoMenuRodape(),

      prisma.lojaPagina.findFirst({
        where: {
          slug: HOME_VISUAL_SLUG,
          tipo: "HOME",
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

  if (homeVisualRaw && homeVisualRaw.blocos.length > 0) {
    const pagina: LojaBuilderPagina = {
      id: homeVisualRaw.id,
      titulo: homeVisualRaw.titulo,
      slug: homeVisualRaw.slug,
      tipo: homeVisualRaw.tipo,
    };

    const blocos: LojaBuilderBloco[] = homeVisualRaw.blocos.map((bloco) => ({
      id: bloco.id,
      tipo: bloco.tipo,
      titulo: bloco.titulo,
      ordem: bloco.ordem,
      configJson: bloco.configJson,
    }));

    const produtosBuilder: LojaBuilderProduto[] = produtos.map((produto) => ({
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

    const menusBuilder: LojaBuilderMenu[] = menusPublicos.map((menu) => ({
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
        produtos={produtosBuilder}
        menus={menusBuilder}
        categoriasMenu={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    );
  }

  const [bannersRaw, categoriasHomeRaw, secoesHomeRaw, blocoHomeRaw] =
    await Promise.all([
      prisma.bannerLoja.findMany({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
      }),

      prisma.lojaCategoriaHome.findMany({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        take: 6,
      }),

      prisma.lojaSecaoHome.findMany({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        take: 3,
      }),

      prisma.lojaBlocoHome.findFirst({
        where: {
          ativo: true,
        },
        orderBy: {
          criadoEm: "asc",
        },
      }),
    ]);

  const banners: LojaBannerItem[] = bannersRaw.map((banner, index) => {
    const bannerComMobile = banner as typeof banner & {
      imagemMobileUrl?: string | null;
    };

    return {
      id: banner.id,
      titulo: banner.titulo,
      subtitulo: banner.subtitulo,
      imagemUrl: banner.imagemUrl,
      imagemMobileUrl: bannerComMobile.imagemMobileUrl ?? null,
      linkUrl: banner.linkUrl,
      ordem: banner.ordem ?? index,
      ativo: banner.ativo ?? true,
    };
  });

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

  const categoriasHome: LojaCategoriaHomeItem[] = categoriasHomeRaw.map(
    (item) => ({
      id: item.id,
      titulo: item.titulo,
      categoria: item.categoria,
      imagemUrl: item.imagemUrl,
    })
  );

  const secoesHome: LojaSecaoHomeItem[] = secoesHomeRaw.map((secao) => ({
    id: secao.id,
    titulo: secao.titulo,
    categorias: secao.categorias
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  }));

  const blocoHome: LojaBlocoHomeItem | null = blocoHomeRaw
    ? {
        id: blocoHomeRaw.id,
        titulo: blocoHomeRaw.titulo,
        texto: blocoHomeRaw.texto,
        imagemUrl: blocoHomeRaw.imagemUrl,
        textoBotao: blocoHomeRaw.textoBotao,
        linkBotao: blocoHomeRaw.linkBotao,
      }
    : null;

  return (
    <LojaClient
      produtos={produtos}
      banners={banners}
      menus={menus}
      categoriasHome={categoriasHome}
      secoesHome={secoesHome}
      blocoHome={blocoHome}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
      mostrarTodosProdutos
    />
  );
}
