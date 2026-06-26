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

type ProdutoFamiliaRelacionadoRaw = Awaited<
  ReturnType<typeof buscarProdutosFamiliaRaw>
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
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      tipoProduto: true,
      ativo: true,
      status: true,
      imagemUrl: true,
      imagemHoverUrl: true,
      categoria: true,
      precoVenda: true,
      descontoAtivo: true,
      precoPromocional: true,
      descricaoLoja: true,
      observacoes: true,
      familiaId: true,
      familiaMaterial: true,
      familiaCorJoia: true,
      embalagemClasseId: true,
      permiteEmbalagemPresente: true,
      embalagemPresentePadraoId: true,
      familia: {
        select: {
          id: true,
          nome: true,
          slug: true,
        },
      },
      estoque: {
        orderBy: {
          tamanhoAnel: "asc",
        },
        select: {
          tamanhoAnel: true,
          quantidadeAtual: true,
        },
      },
      imagens: {
        orderBy: {
          ordem: "asc",
        },
        select: {
          imagemUrl: true,
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
        select: {
          id: true,
          nome: true,
          obrigatoria: true,
          opcoes: {
            where: {
              ativo: true,
            },
            orderBy: {
              ordem: "asc",
            },
            select: {
              id: true,
              nome: true,
              imagemUrl: true,
              precoAdicional: true,
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
    select: {
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

async function buscarProdutosFamiliaRaw({
  familiaId,
}: {
  produtoId: string;
  familiaId?: string | null;
}) {
  if (!familiaId) {
    return [];
  }

  return prisma.produtoFamiliaProduto.findMany({
    where: {
      familiaId,
      ativo: true,
      produto: {
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
      },
    },
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    select: {
      imagemUrl: true,
      produto: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          tipoProduto: true,
          imagemUrl: true,
          imagemHoverUrl: true,
          familiaImagemUrl: true,
          familiaMaterial: true,
          familiaCorJoia: true,
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
      },
      valores: {
        include: {
          campo: {
            select: {
              id: true,
              nome: true,
              slug: true,
              ativo: true,
              ordem: true,
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

function getValoresOrdenadosFamilia(vinculo: ProdutoFamiliaRelacionadoRaw) {
  return [...vinculo.valores]
    .filter((valor) => valor.campo.ativo)
    .sort((a, b) => Number(a.campo.ordem || 0) - Number(b.campo.ordem || 0))
    .map((valor) => ({
      campoId: valor.campoId,
      campoNome: valor.campo.nome,
      campoSlug: valor.campo.slug,
      valor: valor.valor,
    }))
    .filter((item) => String(item.valor || "").trim());
}

function formatarProdutoFamiliaRelacionado({
  vinculo,
  produtoAtualId,
}: {
  vinculo: ProdutoFamiliaRelacionadoRaw;
  produtoAtualId: string;
}) {
  const produto = vinculo.produto;

  const estoque = calcularEstoqueProdutoPublico({
    tipoProduto: produto.tipoProduto,
    estoque: produto.estoque,
    componentesDoKit: produto.componentesDoKit,
  });

  const valoresOrdenados = getValoresOrdenadosFamilia(vinculo);

  const partesOpcaoDinamicas = valoresOrdenados
    .map((item) => String(item.valor || "").trim())
    .filter(Boolean);

  const partesOpcaoFallback = [produto.familiaMaterial, produto.familiaCorJoia]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const nomeOpcao =
    partesOpcaoDinamicas.length > 0
      ? partesOpcaoDinamicas.join(" · ")
      : partesOpcaoFallback.length > 0
      ? partesOpcaoFallback.join(" · ")
      : produto.nome;

  const materialDinamico =
    valoresOrdenados.find((item) => item.campoSlug === "material")?.valor ||
    produto.familiaMaterial;

  const corJoiaDinamica =
    valoresOrdenados.find((item) => item.campoSlug === "cor-da-joia")?.valor ||
    produto.familiaCorJoia;

  return {
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.nome,
    nomeOpcao,
    imagemUrl:
      vinculo.imagemUrl ||
      produto.familiaImagemUrl ||
      produto.imagemUrl ||
      produto.imagemHoverUrl,
    material: materialDinamico,
    corJoia: corJoiaDinamica,
    href: `/loja/produto/${produto.id}`,
    selecionado: produto.id === produtoAtualId,
    estoqueTotal: estoque.estoqueTotal,
  };
}

export async function buscarProdutoDetalhePublico(id: string) {
  const produto = await buscarProdutoDetalheRaw(id);

  if (!produto || !produto.ativo || produto.status === "NA_LIXEIRA") {
    return null;
  }

  const [estoque, produtosFamiliaRaw] = await Promise.all([
    Promise.resolve(
      calcularEstoqueProdutoPublico({
        tipoProduto: produto.tipoProduto,
        estoque: produto.estoque,
        componentesDoKit: produto.componentesDoKit,
      })
    ),

    buscarProdutosFamiliaRaw({
      produtoId: produto.id,
      familiaId: produto.familiaId,
    }),
  ]);

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

  const possuiVariacao = variacoes.some(
    (variacao) => variacao.opcoes.length > 0
  );

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

  const familiaProdutos = produtosFamiliaRaw
    .map((vinculo) =>
      formatarProdutoFamiliaRelacionado({
        vinculo,
        produtoAtualId: produto.id,
      })
    )
    .filter((item) => item.id !== produto.id || produtosFamiliaRaw.length > 1);

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
    familia: produto.familia
      ? {
          id: produto.familia.id,
          nome: produto.familia.nome,
          slug: produto.familia.slug,
        }
      : null,
    familiaMaterial: produto.familiaMaterial,
    familiaCorJoia: produto.familiaCorJoia,
    familiaProdutos,
    garantia: {
      titulo: "Garantia",
      conteudo:
        "Todas as peças passam por conferência antes do envio. A garantia cobre defeitos de fabricação, conforme análise interna. Danos por mau uso, queda, contato com produtos químicos ou desgaste natural não são cobertos.",
    },
  };

  return {
    produtoRaw: {
      id: produto.id,
      categoria: produto.categoria,
      embalagemClasseId: produto.embalagemClasseId,
      permiteEmbalagemPresente: produto.permiteEmbalagemPresente,
      embalagemPresentePadraoId: produto.embalagemPresentePadraoId,
    },
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

export async function buscarDescontosProduto({
  produtoId,
}: {
  produtoId: string;
}) {
  const descontosRaw = await buscarProdutosRelacionadosRaw({
    produtoId,
    apenasDesconto: true,
    take: 8,
  });

  return descontosRaw.map(formatarProdutoRelacionado).filter(produtoTemDesconto);
}
