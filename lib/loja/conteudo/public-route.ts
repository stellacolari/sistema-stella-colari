export type PaginaConteudoRoteavel = {
  tipo: string;
  slug: string;
  categoria?: { slug: string } | null;
};

export function rotaPublicaConteudoPagina(
  pagina: PaginaConteudoRoteavel,
): string | null {
  if (pagina.tipo === "HOME" || pagina.slug === "home") return "/loja";
  if (pagina.tipo === "PRODUTO_GLOBAL") return null;
  if (pagina.tipo === "BUSCA_GLOBAL") return "/loja/busca";
  if (pagina.tipo === "CATEGORIA") {
    return pagina.categoria?.slug
      ? `/loja/categoria/${pagina.categoria.slug}`
      : null;
  }
  if (pagina.tipo === "TEMPLATE_CATEGORIA") return null;
  if (pagina.tipo === "LEGAL") return `/loja/${pagina.slug}`;
  return `/loja/p/${pagina.slug}`;
}

export function rotuloRotaConteudoPagina(
  pagina: PaginaConteudoRoteavel,
): string {
  const rota = rotaPublicaConteudoPagina(pagina);
  if (rota) return rota;
  if (pagina.tipo === "PRODUTO_GLOBAL") return "Aplicado às páginas de produto";
  if (pagina.tipo === "TEMPLATE_CATEGORIA") return "Template das categorias";
  return "Sem rota pública própria";
}
