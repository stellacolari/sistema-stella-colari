import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LojaClient, {
  type LojaBannerItem,
  type LojaBlocoHomeItem,
  type LojaCategoriaHomeItem,
  type LojaMenuItem,
  type LojaSecaoHomeItem,
} from "@/components/loja/LojaClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";

export const metadata: Metadata = {
  title: "Loja | Sistema Stella",
};

export const dynamic = "force-dynamic";

export default async function LojaPage() {
  const [
    produtos,
    menusPublicos,
    categoriasMenu,
    bannersRaw,
    categoriasHomeRaw,
    secoesHomeRaw,
    blocoHomeRaw,
  ] = await Promise.all([
    buscarProdutosPublicos(),
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),

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
      mostrarTodosProdutos
    />
  );
}