import { prisma } from "@/lib/prisma";
import { calcularEstoqueProdutoPublico } from "@/lib/loja/estoque";
import type { ProdutoPublico } from "@/lib/loja/produto-publico";
import type { Prisma } from "@prisma/client";

const produtoPublicoSelect = {
  id: true,
  nome: true,
  tipoProduto: true,
  imagemUrl: true,
  imagemHoverUrl: true,
  categoria: true,
  precoVenda: true,
  descontoAtivo: true,
  precoPromocional: true,
  criadoEm: true,
  estoque: {
    orderBy: {
      tamanhoAnel: "asc",
    },
    select: {
      tamanhoAnel: true,
      quantidadeAtual: true,
    },
  },
  componentesDoKit: {
    select: {
      quantidade: true,
      componenteProduto: {
        select: {
          estoque: {
            select: {
              quantidadeAtual: true,
            },
          },
        },
      },
    },
  },
  categoriasProduto: {
    select: {
      categoria: {
        select: {
          id: true,
          nome: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.ProdutoSelect;

type ProdutoPublicoRaw = Prisma.ProdutoGetPayload<{
  select: typeof produtoPublicoSelect;
}>;

function consultarProdutosPublicos(
  where: Prisma.ProdutoWhereInput,
): Promise<ProdutoPublico[]> {
  return prisma.produto.findMany({
    where,
    orderBy: {
      nome: "asc",
    },
    select: produtoPublicoSelect,
  }).then((produtosRaw) => produtosRaw.map(formatarProdutoPublico));
}

function formatarProdutoPublico(produto: ProdutoPublicoRaw): ProdutoPublico {
  const estoque = calcularEstoqueProdutoPublico(produto);

  return {
    id: produto.id,
    nome: produto.tipoProduto === "KIT" ? `${produto.nome} · Kit` : produto.nome,
    imagemUrl: produto.imagemUrl,
    imagemHoverUrl: produto.imagemHoverUrl,
    categoria: produto.categoria,
    categoriaIds: produto.categoriasProduto.map((item) => item.categoria.id),
    categoriaSlugs: produto.categoriasProduto.map((item) => item.categoria.slug),
    categoriaNomes: produto.categoriasProduto.map((item) => item.categoria.nome),
    precoVenda: Number(produto.precoVenda),
    descontoAtivo: produto.descontoAtivo,
    precoPromocional: produto.precoPromocional
      ? Number(produto.precoPromocional)
      : null,
    disponivel: estoque.estoqueTotal > 0,
    criadoEm: produto.criadoEm.toISOString(),
    tamanhosDisponiveis: estoque.tamanhosDisponiveis.map((tamanho) => ({
      tamanhoAnel: tamanho.tamanhoAnel,
      disponivel: tamanho.quantidadeAtual > 0,
    })),
  };
}

export function buscarProdutosPublicos(): Promise<ProdutoPublico[]> {
  return consultarProdutosPublicos({
    ativo: true,
    status: {
      not: "NA_LIXEIRA",
    },
  });
}

export function buscarProdutosPublicosPorCategoriaIds(
  categoriaIds: string[]
): Promise<ProdutoPublico[]> {
  if (categoriaIds.length === 0) {
    return Promise.resolve([]);
  }

  return consultarProdutosPublicos({
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
      categoriasProduto: {
        some: {
          categoriaId: {
            in: categoriaIds,
          },
        },
      },
  });
}
