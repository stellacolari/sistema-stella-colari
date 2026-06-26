import { prisma } from "@/lib/prisma";
import type { LojaProdutoItem } from "@/components/loja/LojaClient";
import { calcularEstoqueProdutoPublico } from "@/lib/loja/estoque";

type ProdutoPublicoRaw = Awaited<
  ReturnType<typeof buscarProdutosPublicosRaw>
>[number];

const produtoPublicoSelect = {
  id: true,
  codigoInterno: true,
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
      tamanhoAnel: "asc" as const,
    },
  },
  vendasItens: {
    select: {
      quantidade: true,
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
};

async function buscarProdutosPublicosRaw() {
  return prisma.produto.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: {
      nome: "asc",
    },
    select: produtoPublicoSelect,
  });
}

function formatarProdutoPublico(produto: ProdutoPublicoRaw): LojaProdutoItem {
  const estoque = calcularEstoqueProdutoPublico(produto);

  const vendidosTotal = produto.vendasItens.reduce(
    (total: number, item) => total + Number(item.quantidade || 0),
    0
  );

  return {
    id: produto.id,
    codigoInterno: produto.codigoInterno,
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
    estoqueTotal: estoque.estoqueTotal,
    vendidosTotal,
    criadoEm: produto.criadoEm.toISOString(),
    tamanhosDisponiveis: estoque.tamanhosDisponiveis,
  };
}

export async function buscarProdutosPublicos(): Promise<LojaProdutoItem[]> {
  const produtosRaw = await buscarProdutosPublicosRaw();

  return produtosRaw.map(formatarProdutoPublico);
}

export async function buscarProdutosPublicosPorCategoriaIds(
  categoriaIds: string[]
): Promise<LojaProdutoItem[]> {
  if (categoriaIds.length === 0) {
    return [];
  }

  const produtosRaw = await prisma.produto.findMany({
    where: {
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
    },
    orderBy: {
      nome: "asc",
    },
    select: produtoPublicoSelect,
  });

  return produtosRaw.map(formatarProdutoPublico);
}
