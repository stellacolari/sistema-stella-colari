import { prisma } from "@/lib/prisma";
import type { LojaProdutoItem } from "@/components/loja/LojaClient";
import { calcularEstoqueProdutoPublico } from "@/lib/loja/estoque";

type ProdutoPublicoRaw = Awaited<
  ReturnType<typeof buscarProdutosPublicosRaw>
>[number];

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
    include: {
      estoque: {
        orderBy: {
          tamanhoAnel: "asc",
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
    },
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
    include: {
      estoque: {
        orderBy: {
          tamanhoAnel: "asc",
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
    },
  });

  return produtosRaw.map(formatarProdutoPublico);
}