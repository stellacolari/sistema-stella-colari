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
  const disponibilidadePorTamanho = new Map<string, boolean>();

  estoque.forEach((item) => {
    const tamanhoAnel = normalizarTamanho(item.tamanhoAnel);

    if (!tamanhoAnel) {
      return;
    }

    disponibilidadePorTamanho.set(
      tamanhoAnel,
      Boolean(disponibilidadePorTamanho.get(tamanhoAnel)) ||
        Number(item.quantidadeAtual || 0) > 0
    );
  });

  return Array.from(disponibilidadePorTamanho.entries())
    .map(([tamanhoAnel, disponivel]) => ({
      tamanhoAnel,
      disponivel,
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

function buscarProdutoDetalheRaw(id: string) {
  return prisma.produto.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
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

function buscarProdutosRelacionadosRaw({
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
    nome: produto.tipoProduto === "KIT" ? `${produto.nome} · Kit` : produto.nome,
    imagemUrl: produto.imagemUrl,
    imagemHoverUrl: produto.imagemHoverUrl,
    categoria: produto.categoria,
    precoVenda: Number(produto.precoVenda),
    descontoAtivo: produto.descontoAtivo,
    precoPromocional: produto.precoPromocional
      ? Number(produto.precoPromocional)
      : null,
    disponivel: estoque.estoqueTotal > 0,
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
    disponivel: estoque.estoqueTotal > 0,
  };
}

export function buscarProdutoDetalhePublico(id: string) {
  return buscarProdutoDetalheRaw(id).then((produto) => {
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
        const opcaoDisponivel = produto.estoque.some(
          (item) =>
            normalizarTexto(item.tamanhoAnel) === normalizarTexto(opcao.nome) &&
            Number(item.quantidadeAtual || 0) > 0
        );

        return {
          id: opcao.id,
          nome: opcao.nome,
          imagemUrl: opcao.imagemUrl,
          precoAdicional: Number(opcao.precoAdicional || 0),
          disponivel: opcaoDisponivel,
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
        ? variacoes.flatMap((variacao) =>
            variacao.opcoes.map((opcao) => ({
              tamanhoAnel: opcao.nome,
              disponivel: opcao.disponivel,
            }))
          )
        : normalizarTamanhosDisponiveis(produto.estoque);

    const produtoBase: Omit<ProdutoLojaDetalhe, "familiaProdutos"> = {
      id: produto.id,
      nome:
        produto.tipoProduto === "KIT" ? `${produto.nome} · Kit` : produto.nome,
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
      disponivel: estoque.estoqueTotal > 0,
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
      garantia: {
        titulo: "Informações",
        conteudo:
          "Consulte a descrição disponível para esta peça e as páginas de atendimento da loja antes de finalizar a compra.",
      },
    };

    return buscarProdutosFamiliaRaw({
      produtoId: produto.id,
      familiaId: produto.familiaId,
    }).then((produtosFamiliaRaw) => {
      const familiaProdutos = produtosFamiliaRaw
        .map((vinculo) =>
          formatarProdutoFamiliaRelacionado({
            vinculo,
            produtoAtualId: produto.id,
          })
        )
        .filter(
          (item) => item.id !== produto.id || produtosFamiliaRaw.length > 1
        );

      return {
        produtoRaw: {
          id: produto.id,
          categoria: produto.categoria,
          embalagemClasseId: produto.embalagemClasseId,
          permiteEmbalagemPresente: produto.permiteEmbalagemPresente,
          embalagemPresentePadraoId: produto.embalagemPresentePadraoId,
        },
        produto: {
          ...produtoBase,
          familiaProdutos,
        },
      };
    });
  });
}

export function buscarRelacionadosProduto({
  produtoId,
  categoria,
}: {
  produtoId: string;
  categoria: string;
}) {
  return buscarProdutosRelacionadosRaw({
    produtoId,
    categoria,
    take: 8,
  }).then((relacionadosRaw) => relacionadosRaw.map(formatarProdutoRelacionado));
}

export function buscarDescontosProduto({
  produtoId,
}: {
  produtoId: string;
}) {
  return buscarProdutosRelacionadosRaw({
    produtoId,
    apenasDesconto: true,
    take: 8,
  }).then((descontosRaw) =>
    descontosRaw.map(formatarProdutoRelacionado).filter(produtoTemDesconto)
  );
}
