import "server-only";

import { revalidatePath } from "next/cache";

export function revalidarConteudoLoja(pagina: {
  tipo: string;
  slug: string;
  categoria?: { slug: string } | null;
}) {
  revalidatePath("/loja");
  if (pagina.tipo === "CATEGORIA") {
    const categoriaSlug = pagina.categoria?.slug || pagina.slug;
    revalidatePath(`/loja/categoria/${categoriaSlug}`);
  } else if (pagina.tipo === "TEMPLATE_CATEGORIA") {
    revalidatePath("/loja/categoria/[slug]", "page");
  } else if (pagina.tipo === "PRODUTO_GLOBAL") {
    revalidatePath("/loja/produto/[id]", "page");
  } else if (pagina.tipo === "BUSCA_GLOBAL") {
    revalidatePath("/loja/busca");
  } else if (pagina.tipo === "LEGAL") {
    revalidatePath(`/loja/${pagina.slug}`);
  } else if (pagina.tipo !== "HOME" && pagina.slug !== "home") {
    revalidatePath(`/loja/p/${pagina.slug}`);
  }
  revalidatePath("/sitemap.xml");
}
