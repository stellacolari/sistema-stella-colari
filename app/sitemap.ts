import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getLojaUrl } from "@/lib/loja/seo";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

const TIPOS_PAGINA_INDEXAVEIS = ["GERAL", "LANDING", "CAMPANHA"];

function adicionarUrl(
  mapa: Map<string, SitemapEntry>,
  entrada: SitemapEntry
) {
  const atual = mapa.get(entrada.url);

  if (!atual || getLastModifiedTime(entrada) > getLastModifiedTime(atual)) {
    mapa.set(entrada.url, entrada);
  }
}

function getLastModifiedTime(entrada: SitemapEntry) {
  const valor = entrada.lastModified;

  if (!valor) {
    return 0;
  }

  return new Date(valor).getTime();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [produtos, categorias, paginas] = await Promise.all([
    prisma.produto.findMany({
      where: {
        ativo: true,
        status: {
          not: "LIXEIRA",
        },
      },
      select: {
        id: true,
        atualizadoEm: true,
      },
      orderBy: {
        atualizadoEm: "desc",
      },
    }),
    prisma.categoriaProduto.findMany({
      where: {
        ativo: true,
      },
      select: {
        slug: true,
        atualizadoEm: true,
      },
      orderBy: {
        atualizadoEm: "desc",
      },
    }),
    prisma.lojaPagina.findMany({
      where: {
        ativo: true,
        statusPublicacao: "PUBLICADA",
      },
      select: {
        slug: true,
        tipo: true,
        atualizadoEm: true,
        categoria: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: {
        atualizadoEm: "desc",
      },
    }),
  ]);
  const urls = new Map<string, SitemapEntry>();

  adicionarUrl(urls, {
    url: getLojaUrl("/loja"),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  });
  adicionarUrl(urls, {
    url: getLojaUrl("/loja/descontos"),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  });
  adicionarUrl(urls, {
    url: getLojaUrl("/loja/quem-somos"),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  });

  for (const categoria of categorias) {
    adicionarUrl(urls, {
      url: getLojaUrl(`/loja/categoria/${categoria.slug}`),
      lastModified: categoria.atualizadoEm,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const produto of produtos) {
    adicionarUrl(urls, {
      url: getLojaUrl(`/loja/produto/${produto.id}`),
      lastModified: produto.atualizadoEm,
      changeFrequency: "daily",
      priority: 0.85,
    });
  }

  for (const pagina of paginas) {
    if (pagina.tipo === "HOME" || pagina.slug === "home") {
      adicionarUrl(urls, {
        url: getLojaUrl("/loja"),
        lastModified: pagina.atualizadoEm,
        changeFrequency: "daily",
        priority: 1,
      });
      continue;
    }

    if (pagina.tipo === "CATEGORIA" && pagina.categoria?.slug) {
      adicionarUrl(urls, {
        url: getLojaUrl(`/loja/categoria/${pagina.categoria.slug}`),
        lastModified: pagina.atualizadoEm,
        changeFrequency: "weekly",
        priority: 0.75,
      });
      continue;
    }

    if (TIPOS_PAGINA_INDEXAVEIS.includes(pagina.tipo)) {
      adicionarUrl(urls, {
        url: getLojaUrl(`/loja/p/${pagina.slug}`),
        lastModified: pagina.atualizadoEm,
        changeFrequency: "weekly",
        priority: 0.65,
      });
    }
  }

  return Array.from(urls.values());
}
