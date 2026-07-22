import "server-only";

import { revalidatePath } from "next/cache";

export function revalidarConteudoLoja(pagina: {
  tipo: string;
  slug: string;
  categoria?: { slug: string } | null;
}) {
  const destinos: Array<{ path: string; type?: "page" }> = [{ path: "/loja" }];
  if (pagina.tipo === "CATEGORIA") {
    const categoriaSlug = pagina.categoria?.slug || pagina.slug;
    destinos.push({ path: `/loja/categoria/${categoriaSlug}` });
  } else if (pagina.tipo === "TEMPLATE_CATEGORIA") {
    destinos.push({ path: "/loja/categoria/[slug]", type: "page" });
  } else if (pagina.tipo === "PRODUTO_GLOBAL") {
    destinos.push({ path: "/loja/produto/[id]", type: "page" });
  } else if (pagina.tipo === "BUSCA_GLOBAL") {
    destinos.push({ path: "/loja/busca" });
  } else if (pagina.tipo === "LEGAL") {
    destinos.push({ path: `/loja/${pagina.slug}` });
  } else if (pagina.tipo !== "HOME" && pagina.slug !== "home") {
    destinos.push({ path: `/loja/p/${pagina.slug}` });
  }
  destinos.push({ path: "/sitemap.xml" });

  const falhas: string[] = [];
  for (const destino of destinos) {
    try {
      if (destino.type) {
        revalidatePath(destino.path, destino.type);
      } else {
        revalidatePath(destino.path);
      }
    } catch {
      falhas.push(destino.path);
      console.error(`Falha ao revalidar conteúdo público em ${destino.path}.`);
    }
  }

  return { ok: falhas.length === 0, falhas };
}
