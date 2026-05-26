import { prisma } from "@/lib/prisma";
import type { MenuPublicoItem } from "@/components/loja/MenuPublicoLoja";

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
  if (menu.linkUrl) return menu.linkUrl;

  if (menu.paginaEspecial === "DESCONTOS") {
    return "/loja/descontos";
  }

  if (menu.paginaEspecial === "TODAS_CATEGORIAS") {
    return "/loja/categorias";
  }

  if (menu.tipo === "CATEGORIA") return `/loja/categoria/${menu.slug}`;
  if (menu.tipo === "CAMPANHA") return `/loja/campanha/${menu.slug}`;

  if (menu.tipo === "PAGINA" && menu.slug === "quem-somos") {
    return "/loja/quem-somos";
  }

  return "/loja";
}

export async function buscarMenusPublicos(): Promise<MenuPublicoItem[]> {
  const menusRaw = await prisma.menuLoja.findMany({
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
  });

  return menusRaw.filter(menuEstaAtivo).map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: getMenuHref(menu),
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));
}