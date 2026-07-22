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
import { aplicarColecoesEmBlocosBuilder } from "@/lib/loja/colecoes-inteligentes";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";
import { criarMetadataLoja, getImagemSeoBlocos } from "@/lib/loja/seo";
import { serializarBlocosBuilderPublicos } from "@/lib/loja/blocos-publicos.server";
import { buscarConteudoPublicadoPagina } from "@/lib/loja/conteudo/repository.server";
import { extrairSeoConteudo } from "@/lib/loja/conteudo/contracts";

export const dynamic = "force-dynamic";

const HOME_VISUAL_SLUG = "home";

export async function generateMetadata(): Promise<Metadata> {
  const homeVisual = await prisma.lojaPagina.findFirst({
    where: {
      slug: HOME_VISUAL_SLUG,
      tipo: "HOME",
    },
    select: {
      id: true,
      ativo: true,
      statusPublicacao: true,
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
  const conteudoGerenciado = homeVisual
    ? await buscarConteudoPublicadoPagina(homeVisual.id)
    : null;
  const homeLegadaPublicavel = Boolean(
    homeVisual?.ativo && homeVisual.statusPublicacao === "PUBLICADA",
  );
  const banner = !conteudoGerenciado && !homeLegadaPublicavel
    ? await prisma.bannerLoja.findFirst({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
        select: {
          imagemUrl: true,
        },
      })
    : null;
  const conteudoAtivo =
    conteudoGerenciado && !conteudoGerenciado.indisponivel
      ? conteudoGerenciado
      : null;
  const conteudoNovoIndisponivel = Boolean(conteudoGerenciado?.indisponivel);
  const blocosSeo = conteudoAtivo
    ? conteudoAtivo.baseVisualHome ?? []
    : conteudoGerenciado?.indisponivel
      ? []
      : homeLegadaPublicavel
        ? homeVisual?.blocos ?? []
        : [];
  const seo =
    conteudoAtivo
      ? extrairSeoConteudo(conteudoAtivo.conteudo)
      : null;

  return criarMetadataLoja({
    title:
      seo?.title ||
      (homeLegadaPublicavel ? homeVisual?.seoTitle : null) ||
      "Stella Colari | Loja Online",
    description:
      seo?.description ||
      (homeLegadaPublicavel ? homeVisual?.seoDescription : null) ||
      "Joias e pecas selecionadas da Stella Colari para comprar online com praticidade.",
    path: "/loja",
    canonical: seo?.canonical,
    image: seo?.image || getImagemSeoBlocos(blocosSeo) || banner?.imagemUrl,
    robots:
      conteudoNovoIndisponivel || seo?.noindex
        ? { index: false, follow: false }
        : undefined,
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
        },
        select: {
          id: true,
          titulo: true,
          slug: true,
          tipo: true,
          ativo: true,
          statusPublicacao: true,
          blocos: {
            where: {
              ativo: true,
            },
            orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
            select: {
              id: true,
              tipo: true,
              titulo: true,
              ordem: true,
              configJson: true,
            },
          },
        },
      }),
    ]);

  const conteudoGerenciado = homeVisualRaw
    ? await buscarConteudoPublicadoPagina(homeVisualRaw.id)
    : null;
  const conteudoAtivo =
    conteudoGerenciado && !conteudoGerenciado.indisponivel
      ? conteudoGerenciado
      : null;
  const conteudoNovoIndisponivel = Boolean(conteudoGerenciado?.indisponivel);
  const homeLegadaPublicavel =
    homeVisualRaw?.ativo && homeVisualRaw.statusPublicacao === "PUBLICADA";

  if (
    homeVisualRaw &&
    (conteudoAtivo ||
      conteudoNovoIndisponivel ||
      (homeLegadaPublicavel && homeVisualRaw.blocos.length > 0))
  ) {
    const pagina: LojaBuilderPagina = {
      id: homeVisualRaw.id,
      titulo: homeVisualRaw.titulo,
      slug: homeVisualRaw.slug,
      tipo: homeVisualRaw.tipo,
    };

    const blocosResolvidos = conteudoNovoIndisponivel
      ? []
      : conteudoAtivo?.modoEntrega === "NOVO"
        ? conteudoAtivo.baseVisualHome ?? []
        : await aplicarColecoesEmBlocosBuilder(homeVisualRaw.blocos);

    const blocos: LojaBuilderBloco[] =
      serializarBlocosBuilderPublicos(blocosResolvidos);

    const produtosBuilder: LojaBuilderProduto[] = produtos;

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
        conteudoGerenciado={conteudoAtivo?.publico}
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
        select: {
          id: true,
          titulo: true,
          subtitulo: true,
          imagemUrl: true,
          imagemMobileUrl: true,
          linkUrl: true,
          ordem: true,
          ativo: true,
        },
      }),

      prisma.lojaCategoriaHome.findMany({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        take: 6,
        select: {
          id: true,
          titulo: true,
          categoria: true,
          imagemUrl: true,
        },
      }),

      prisma.lojaSecaoHome.findMany({
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        take: 3,
        select: {
          id: true,
          titulo: true,
          categorias: true,
        },
      }),

      prisma.lojaBlocoHome.findFirst({
        where: {
          ativo: true,
        },
        orderBy: {
          criadoEm: "asc",
        },
        select: {
          id: true,
          titulo: true,
          texto: true,
          imagemUrl: true,
          textoBotao: true,
          linkBotao: true,
        },
      }),
    ]);

  const banners: LojaBannerItem[] = bannersRaw.map((banner, index) => {
    return {
      id: banner.id,
      titulo: banner.titulo,
      subtitulo: banner.subtitulo,
      imagemUrl: banner.imagemUrl,
      imagemMobileUrl: banner.imagemMobileUrl,
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
