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

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
    .filter((item) => item.quantidadeAtual > 0)
    .map((item) => ({
      tamanhoAnel: item.tamanhoAnel as string,
      quantidadeAtual: item.quantidadeAtual,
    }))
    .sort((a, b) => {
      const numeroA = Number(a.tamanhoAnel);
      const numeroB = Number(b.tamanhoAnel);

      if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
        return numeroA - numeroB;
      }

      return a.tamanhoAnel.localeCompare(b.tamanhoAnel);
    });
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
      variacoes: {
        where: {
          ativo: true,
        },
        orderBy: {
          ordem: "asc",
        },
        include: {
          opcoes: {
            where: {
              ativo: true,
            },
            orderBy: {
              ordem: "asc",
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

  const variacoes = produto.variacoes.map((variacao) => {
    const opcoesComEstoque = variacao.opcoes.map((opcao) => {
      const estoqueOpcao = produto.estoque.find(
        (item) =>
          normalizarTexto(item.tamanhoAnel) === normalizarTexto(opcao.nome)
      );

      return {
        id: opcao.id,
        nome: opcao.nome,
        imagemUrl: opcao.imagemUrl,
        precoAdicional: Number(opcao.precoAdicional || 0),
        custoAdicional: Number(opcao.custoAdicional || 0),
        quantidadeAtual: Number(estoqueOpcao?.quantidadeAtual || 0),
      };
    });

    return {
      id: variacao.id,
      nome: variacao.nome,
      obrigatoria: variacao.obrigatoria,
      opcoes: opcoesComEstoque,
    };
  });

  const possuiVariacao = variacoes.some((variacao) => variacao.opcoes.length > 0);

  const tamanhosDisponiveis =
    produto.tipoProduto === "KIT"
      ? []
      : possuiVariacao
      ? variacoes
          .flatMap((variacao) =>
            variacao.opcoes.map((opcao) => ({
              tamanhoAnel: opcao.nome,
              quantidadeAtual: opcao.quantidadeAtual,
            }))
          )
          .filter((opcao) => opcao.quantidadeAtual > 0)
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
    variacoes,
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