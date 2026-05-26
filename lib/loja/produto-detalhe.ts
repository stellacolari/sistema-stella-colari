import { prisma } from "@/lib/prisma";
import {
  calcularEstoqueProdutoPublico,
  normalizarTamanho,
} from "@/lib/loja/estoque";
import type {
  LojaProdutoRelacionado,
  ProdutoLojaDetalhe,
} from "@/components/loja/ProdutoLojaClient";

type ProdutoRelacionadoRaw = Awaited<
  ReturnType<typeof buscarProdutosRelacionadosRaw>
>[number];

type ProdutoDetalheRaw = NonNullable<
  Awaited<ReturnType<typeof buscarProdutoDetalheRaw>>
>;

function produtoTemDesconto(produto: {
  descontoAtivo: boolean;
  precoPromocional: number | null;
  precoVenda: number;
}) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function normalizarTamanhosDisponiveis(
  estoque: {
    tamanhoAnel: string;
    quantidadeAtual: number;
  }[]
) {
  return estoque
    .map((item) => ({
      tamanhoAnel: normalizarTamanho(item.tamanhoAnel),
      quantidadeAtual: item.quantidadeAtual,
    }))
    .filter((item) => item.tamanhoAnel)
    .map((item) => ({
      tamanhoAnel: item.tamanhoAnel as string,
      quantidadeAtual: item.quantidadeAtual,
    }))
    .sort((a, b) => Number(b.tamanhoAnel) - Number(a.tamanhoAnel));
}

async function buscarProdutoDetalheRaw(id: string) {
  return prisma.produto.findUnique({
    where: {
      id,
    },
    include: {
      estoque: {
        orderBy: {
          tamanhoAnel: "asc",
        },
      },
      imagens: {
        orderBy: {
          ordem: "asc",
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

async function buscarProdutosRelacionadosRaw({
  produtoId,
  categoria,
  apenasDesconto = false,
  take = 8,
}: {
  produtoId: string;
  categoria?: string;
  apenasDesconto?: boolean;
  take?: number;
}) {
  return prisma.produto.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
      id: {
        not: produtoId,
      },
      ...(categoria ? { categoria } : {}),
      ...(apenasDesconto
        ? {
            descontoAtivo: true,
            precoPromocional: {
              not: null,
            },
          }
        : {}),
    },
    orderBy: apenasDesconto
      ? [{ atualizadoEm: "desc" }]
      : [{ criadoEm: "desc" }],
    take,
    include: {
      estoque: {
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
    },
  });
}

function formatarProdutoRelacionado(
  produto: ProdutoRelacionadoRaw
): LojaProdutoRelacionado {
  const estoque = calcularEstoqueProdutoPublico({
    tipoProduto: produto.tipoProduto,
    estoque: produto.estoque,
    componentesDoKit: produto.componentesDoKit,
  });

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
  };
}

export async function buscarProdutoDetalhePublico(id: string) {
  const produto = await buscarProdutoDetalheRaw(id);

  if (!produto || !produto.ativo || produto.status === "NA_LIXEIRA") {
    return null;
  }

  const estoque = calcularEstoqueProdutoPublico({
    tipoProduto: produto.tipoProduto,
    estoque: produto.estoque,
    componentesDoKit: produto.componentesDoKit,
  });

  const imagens = produto.imagens.length
    ? produto.imagens.map((imagem) => imagem.imagemUrl)
    : [produto.imagemUrl, produto.imagemHoverUrl].filter(Boolean).map(String);

  const tamanhosDisponiveis =
    produto.tipoProduto === "KIT"
      ? []
      : normalizarTamanhosDisponiveis(produto.estoque);

  const produtoFormatado: ProdutoLojaDetalhe = {
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.tipoProduto === "KIT" ? `${produto.nome} · Kit` : produto.nome,
    imagemUrl: produto.imagemUrl,
    imagemHoverUrl: produto.imagemHoverUrl,
    imagens,
    categoria: produto.categoria,
    precoVenda: Number(produto.precoVenda),
    descontoAtivo: produto.descontoAtivo,
    precoPromocional: produto.precoPromocional
      ? Number(produto.precoPromocional)
      : null,
    descricaoLoja: produto.descricaoLoja,
    observacoes: produto.observacoes,
    estoqueTotal: estoque.estoqueTotal,
    tamanhosDisponiveis,
    garantia: {
      titulo: "Garantia",
      conteudo:
        "Todas as peças passam por conferência antes do envio. A garantia cobre defeitos de fabricação, conforme análise interna. Danos por mau uso, queda, contato com produtos químicos ou desgaste natural não são cobertos.",
    },
  };

  return {
    produtoRaw: produto,
    produto: produtoFormatado,
  };
}

export async function buscarRelacionadosProduto({
  produtoId,
  categoria,
}: {
  produtoId: string;
  categoria: string;
}) {
  const relacionadosRaw = await buscarProdutosRelacionadosRaw({
    produtoId,
    categoria,
    take: 8,
  });

  return relacionadosRaw.map(formatarProdutoRelacionado);
}

export async function buscarDescontosProduto({ produtoId }: { produtoId: string }) {
  const descontosRaw = await buscarProdutosRelacionadosRaw({
    produtoId,
    apenasDesconto: true,
    take: 8,
  });

  return descontosRaw.map(formatarProdutoRelacionado).filter(produtoTemDesconto);
}