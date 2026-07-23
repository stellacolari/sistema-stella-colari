import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getLojaUrl } from "@/lib/loja/seo";

export const revalidate = 300;

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
  const [produtos, categorias, colecoes, paginas] = await Promise.all([
    prisma.produto.findMany({
      where: {
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
      },
      select: {
        id: true,
        atualizadoEm: true,
        descontoAtivo: true,
        precoVenda: true,
        precoPromocional: true,
      },
      orderBy: {
        atualizadoEm: "desc",
      },
    }),
    prisma.categoriaProduto.findMany({
      where: {
        ativo: true,
        OR: [
          {
            produtos: {
              some: {
                produto: {
                  ativo: true,
                  status: {
                    not: "NA_LIXEIRA",
                  },
                },
              },
            },
          },
          {
            paginasBuilder: {
              some: {
                ativo: true,
                statusPublicacao: "PUBLICADA",
                tipo: "CATEGORIA",
                blocos: {
                  some: {
                    ativo: true,
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        slug: true,
        atualizadoEm: true,
      },
      orderBy: {
        atualizadoEm: "desc",
      },
    }),
    prisma.colecaoInteligente.findMany({
      where: {
        status: "ATIVA",
        produtos: {
          some: {
            status: "APROVADO",
            produto: {
              ativo: true,
              status: {
                not: "NA_LIXEIRA",
              },
            },
          },
        },
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
        id: true,
        slug: true,
        tipo: true,
        atualizadoEm: true,
        blocos: {
          where: { ativo: true },
          take: 1,
          select: { id: true },
        },
        conteudoDocumento: {
          select: {
            modoEntrega: true,
            status: true,
            versaoPublicadaId: true,
            inicioPublicacao: true,
            fimPublicacao: true,
            versaoPublicada: {
              select: { conteudoJson: true },
            },
          },
        },
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
    url: getLojaUrl("/loja/politica-de-privacidade"),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.35,
  });
  adicionarUrl(urls, {
    url: getLojaUrl("/loja/politica-de-cookies"),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.35,
  });
  const temDescontoReal = produtos.some(
    (produto) =>
      produto.descontoAtivo &&
      produto.precoPromocional !== null &&
      produto.precoPromocional > 0 &&
      produto.precoPromocional < produto.precoVenda
  );

  if (temDescontoReal) {
    adicionarUrl(urls, {
      url: getLojaUrl("/loja/descontos"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }
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

  for (const colecao of colecoes) {
    adicionarUrl(urls, {
      url: getLojaUrl(`/loja/colecao/${colecao.slug}`),
      lastModified: colecao.atualizadoEm,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const pagina of paginas) {
    const now = new Date();
    const managed = pagina.conteudoDocumento;
    const managedActive = Boolean(
      managed?.modoEntrega === "NOVO" &&
        managed.versaoPublicadaId &&
        ["PUBLICADA", "AGENDADA"].includes(managed.status) &&
        (!managed.inicioPublicacao || managed.inicioPublicacao <= now) &&
        (!managed.fimPublicacao || managed.fimPublicacao > now),
    );
    const legacyActive = managed?.modoEntrega !== "NOVO" && pagina.blocos.length > 0;
    if (!managedActive && !legacyActive) continue;
    const publishedJson = managed?.versaoPublicada?.conteudoJson;
    const publishedValues =
      publishedJson && typeof publishedJson === "object" && !Array.isArray(publishedJson)
        ? (publishedJson as { values?: Record<string, unknown> }).values
        : undefined;
    if (managedActive && publishedValues?.["seo.noindex"] === true) continue;

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

    if (pagina.tipo === "LEGAL") {
      adicionarUrl(urls, {
        url: getLojaUrl(`/loja/${pagina.slug}`),
        lastModified: pagina.atualizadoEm,
        changeFrequency: "monthly",
        priority: 0.35,
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
