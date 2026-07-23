import { prisma } from "@/lib/prisma";
import type { MenuPublicoItem } from "@/components/loja/MenuPublicoLoja";
import { normalizarHrefPublico } from "@/lib/loja/url-publica";

export function menuEstaAtivo(menu: {
  ativo: boolean;
  dataInicio: Date | null;
  dataFim: Date | null;
}) {
  if (!menu.ativo) return false;

  const agora = new Date();

  if (menu.dataInicio && menu.dataInicio > agora) return false;

  if (menu.dataFim) {
    const fim = new Date(menu.dataFim);
    fim.setHours(23, 59, 59, 999);

    if (fim < agora) return false;
  }

  return true;
}

export function getMenuHref(menu: {
  tipo: string;
  slug: string;
  linkUrl: string | null;
  categoria: string | null;
  paginaEspecial?: string | null;
}) {
  if (menu.linkUrl) {
    const linkSeguro = normalizarHrefPublico(menu.linkUrl);
    if (linkSeguro) return linkSeguro;
  }

  if (menu.paginaEspecial === "DESCONTOS") {
    return "/loja/descontos";
  }

  if (menu.paginaEspecial === "TODAS_CATEGORIAS") {
    return "/loja";
  }

  if (menu.tipo === "CATEGORIA") return `/loja/categoria/${menu.slug}`;
  if (menu.tipo === "CAMPANHA") return `/loja/p/${menu.slug}`;

  if (menu.tipo === "PAGINA" && menu.slug === "quem-somos") {
    return "/loja/quem-somos";
  }

  if (menu.tipo === "PAGINA") return `/loja/p/${menu.slug}`;

  return "/loja";
}

export async function buscarMenusPublicos(): Promise<MenuPublicoItem[]> {
  const menusRaw = await prisma.menuLoja.findMany({
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    select: {
      id: true,
      nome: true,
      slug: true,
      tipo: true,
      linkUrl: true,
      categoria: true,
      paginaEspecial: true,
      ativo: true,
      dataInicio: true,
      dataFim: true,
      destaque: true,
      corDestaque: true,
    },
  });

  return menusRaw.filter(menuEstaAtivo).map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: getMenuHref(menu),
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));
}
