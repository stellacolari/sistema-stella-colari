import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProdutosCatalogClient from "@/components/produtos/ProdutosCatalogClient";
import { regraAplicaACategorias } from "@/lib/regras-categoria";

export const dynamic = "force-dynamic";

type ProdutoComRelacoes = Prisma.ProdutoGetPayload<{
  include: {
    estoque: true;
    vendasItens: {
      select: {
        id: true;
      };
    };
    familia: {
      select: {
        id: true;
        nome: true;
        slug: true;
      };
    };
    categoriasProduto: {
      include: {
        categoria: {
          select: {
            id: true;
            nome: true;
            slug: true;
          };
        };
      };
    };
  };
}>;

type RegraAdicionalComItem = Prisma.RegraCategoriaGetPayload<{
  include: {
    itemAdicional: true;
  };
}>;

type FamiliaComRelacoes = Awaited<ReturnType<typeof buscarFamiliasRaw>>[number];

function arredondarMoeda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function somarEstoqueProduto(produto: ProdutoComRelacoes) {
  return produto.estoque.reduce(
    (total: number, estoque) => total + estoque.quantidadeAtual,
    0
  );
}

function somarValorEstoqueProduto(produto: ProdutoComRelacoes) {
  return produto.estoque.reduce(
    (total: number, estoque) => total + Number(estoque.valorAcumulado || 0),
    0
  );
}

function getStatusProduto(produto: ProdutoComRelacoes) {
  if (produto.status === "NA_LIXEIRA") {
    return "NA_LIXEIRA";
  }

  return produto.ativo ? "ATIVO" : "INATIVO";
}

function getCategoriaPrincipalProduto(produto: ProdutoComRelacoes) {
  const relacaoPrincipal =
    produto.categoriasProduto.find((relacao) => relacao.principal) ??
    produto.categoriasProduto[0] ??
    null;

  return relacaoPrincipal?.categoria?.nome || produto.categoria || "";
}

function getCategoriasProduto(produto: ProdutoComRelacoes) {
  const categorias: { id?: string | null; nome: string }[] =
    produto.categoriasProduto.map((relacao) => ({
    id: relacao.categoria.id,
    nome: relacao.categoria.nome,
  }));

  if (produto.categoria) {
    categorias.push({
      nome: produto.categoria,
    });
  }

  return categorias;
}

function calcularCustoAdicionaisProduto(
  regras: RegraAdicionalComItem[],
  categorias: { id?: string | null; nome: string }[]
) {
  const custo = regras.reduce((total, regra) => {
    if (!regraAplicaACategorias(regra, categorias)) {
      return total;
    }

    const itemAtivo =
      regra.itemAdicional.ativo && regra.itemAdicional.status !== "NA_LIXEIRA";

    if (!itemAtivo) {
      return total;
    }

    const quantidade = Number(regra.quantidade || 0);
    const custoUnitario = Number(regra.itemAdicional.custoBase || 0);
    const custoTotal = quantidade * custoUnitario;

    return total + custoTotal;
  }, 0);

  return arredondarMoeda(custo);
}

function calcularQuantidadeAdicionaisProduto(
  regras: RegraAdicionalComItem[],
  categorias: { id?: string | null; nome: string }[]
) {
  return regras.reduce((total, regra) => {
    if (!regraAplicaACategorias(regra, categorias)) {
      return total;
    }

    const itemAtivo =
      regra.itemAdicional.ativo && regra.itemAdicional.status !== "NA_LIXEIRA";

    if (!itemAtivo) {
      return total;
    }

    return total + 1;
  }, 0);
}

function calcularPrecoVendaAtualizado({
  custoBase,
  margemAplicada,
  custoAdicionais,
  precoVendaBanco,
}: {
  custoBase: number;
  margemAplicada: number;
  custoAdicionais: number;
  precoVendaBanco: number;
}) {
  if (custoBase <= 0 || margemAplicada <= 0) {
    return arredondarMoeda(precoVendaBanco);
  }

  return arredondarMoeda(custoBase * margemAplicada + custoAdicionais);
}

async function buscarFamiliasRaw() {
  return prisma.produtoFamilia.findMany({
    where: {
      ativo: true,
    },
    include: {
      campos: {
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
      vinculos: {
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        include: {
          produto: {
            select: {
              id: true,
              codigoInterno: true,
              nome: true,
              imagemUrl: true,
              ativo: true,
              status: true,
            },
          },
          valores: {
            include: {
              campo: {
                select: {
                  id: true,
                  nome: true,
                  slug: true,
                  ordem: true,
                  ativo: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
}

function montarMapaValoresFamilia(familias: FamiliaComRelacoes[]) {
  const mapa = new Map<
    string,
    {
      vinculoId: string;
      familiaId: string;
      familiaImagemUrl: string | null;
      familiaOrdem: number;
      valores: {
        campoId: string;
        campoNome: string;
        campoSlug: string;
        valor: string;
      }[];
      valoresPorCampo: Record<string, string>;
    }
  >();

  familias.forEach((familia) => {
    familia.vinculos.forEach((vinculo) => {
      const valores = vinculo.valores
        .filter((valor) => valor.campo.ativo)
        .sort((a, b) => Number(a.campo.ordem || 0) - Number(b.campo.ordem || 0))
        .map((valor) => ({
          campoId: valor.campoId,
          campoNome: valor.campo.nome,
          campoSlug: valor.campo.slug,
          valor: valor.valor,
        }));

      const valoresPorCampo = valores.reduce<Record<string, string>>(
        (acc, item) => {
          acc[item.campoId] = item.valor;
          acc[item.campoSlug] = item.valor;
          acc[item.campoNome] = item.valor;
          return acc;
        },
        {}
      );

      mapa.set(vinculo.produtoId, {
        vinculoId: vinculo.id,
        familiaId: vinculo.familiaId,
        familiaImagemUrl: vinculo.imagemUrl,
        familiaOrdem: vinculo.ordem,
        valores,
        valoresPorCampo,
      });
    });
  });

  return mapa;
}

function serializarFamilias(familias: FamiliaComRelacoes[]) {
  return familias.map((familia) => ({
    id: familia.id,
    nome: familia.nome,
    slug: familia.slug,
    ativo: familia.ativo,
    ordem: familia.ordem,
    campos: familia.campos.map((campo) => ({
      id: campo.id,
      nome: campo.nome,
      slug: campo.slug,
      ativo: campo.ativo,
      ordem: campo.ordem,
    })),
    produtos: familia.vinculos.map((vinculo) => {
      const valores = vinculo.valores
        .filter((valor) => valor.campo.ativo)
        .sort((a, b) => Number(a.campo.ordem || 0) - Number(b.campo.ordem || 0))
        .map((valor) => ({
          campoId: valor.campoId,
          campoNome: valor.campo.nome,
          campoSlug: valor.campo.slug,
          valor: valor.valor,
        }));

      const valoresPorCampo = valores.reduce<Record<string, string>>(
        (acc, item) => {
          acc[item.campoId] = item.valor;
          acc[item.campoSlug] = item.valor;
          acc[item.campoNome] = item.valor;
          return acc;
        },
        {}
      );

      return {
        id: vinculo.id,
        produtoId: vinculo.produtoId,
        codigoInterno: vinculo.produto.codigoInterno,
        nome: vinculo.produto.nome,
        imagemUrl: vinculo.imagemUrl || vinculo.produto.imagemUrl,
        ativo: vinculo.ativo,
        ordem: vinculo.ordem,
        produtoAtivo:
          vinculo.produto.ativo && vinculo.produto.status !== "NA_LIXEIRA",
        valores,
        valoresPorCampo,
      };
    }),
  }));
}

export default async function ProdutosPage() {
  const [produtosRaw, regrasAdicionais, familiasRaw] = await Promise.all([
    prisma.produto.findMany({
      orderBy: {
        nome: "asc",
      },
      include: {
        estoque: true,
        vendasItens: {
          select: {
            id: true,
          },
        },
        familia: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        categoriasProduto: {
          include: {
            categoria: {
              select: {
                id: true,
                nome: true,
                slug: true,
              },
            },
          },
          orderBy: {
            criadoEm: "asc",
          },
        },
      },
    }),

    prisma.regraCategoria.findMany({
      include: {
        itemAdicional: true,
      },
      orderBy: [{ categoria: "asc" }, { criadoEm: "asc" }],
    }),

    buscarFamiliasRaw(),
  ]);

  const familiasDisponiveis = serializarFamilias(familiasRaw);
  const mapaValoresFamilia = montarMapaValoresFamilia(familiasRaw);

  const produtos = produtosRaw.map((produto: ProdutoComRelacoes) => {
    const categoriaPrincipal = getCategoriaPrincipalProduto(produto);
    const categoriasProduto = getCategoriasProduto(produto);

    const custoBase = Number(produto.custoBase || 0);
    const margemAplicada = Number(produto.margemAplicada || 0);
    const precoVendaBanco = Number(produto.precoVenda || 0);

    const custoAdicionais = calcularCustoAdicionaisProduto(
      regrasAdicionais,
      categoriasProduto
    );

    const quantidadeAdicionais = calcularQuantidadeAdicionaisProduto(
      regrasAdicionais,
      categoriasProduto
    );

    const custoTotal = arredondarMoeda(custoBase + custoAdicionais);

    const precoVendaAtualizado = calcularPrecoVendaAtualizado({
      custoBase,
      margemAplicada,
      custoAdicionais,
      precoVendaBanco,
    });

    const precoPromocional =
      produto.precoPromocional !== null && produto.precoPromocional !== undefined
        ? Number(produto.precoPromocional)
        : null;

    const descontoAtivo =
      Boolean(produto.descontoAtivo) &&
      precoPromocional !== null &&
      precoPromocional > 0 &&
      precoPromocional < precoVendaAtualizado;

    const precoEfetivo = descontoAtivo
      ? Number(precoPromocional)
      : precoVendaAtualizado;

    const lucroBruto = arredondarMoeda(precoEfetivo - custoTotal);

    const margemBruta =
      precoEfetivo > 0
        ? arredondarMoeda(((precoEfetivo - custoTotal) / precoEfetivo) * 100)
        : 0;

    const dadosFamilia = mapaValoresFamilia.get(produto.id);

    return {
      id: produto.id,
      codigoInterno: produto.codigoInterno,
      codigoFornecedor: produto.codigoFornecedor || "",
      nome: produto.nome,
      imagemUrl: produto.imagemUrl,
      categoria: categoriaPrincipal,
      fornecedorPadrao: produto.fornecedorPadrao,

      custoBase,
      custoAdicionais,
      quantidadeAdicionais,
      custoTotal,

      margemAplicada,
      precoVenda: precoVendaAtualizado,

      descontoAtivo,
      precoPromocional,

      lucroBruto,
      margemBruta,

      ativo: produto.ativo,
      status: getStatusProduto(produto),
      statusAntesLixeira: produto.statusAntesLixeira,
      linkCompra: produto.linkCompra,
      estoqueAtual: somarEstoqueProduto(produto),
      valorEstoque: somarValorEstoqueProduto(produto),
      totalVendas: produto.vendasItens.length,

      familiaId: produto.familiaId,
      familiaNome: produto.familia?.nome || null,
      familiaSlug: produto.familia?.slug || null,

      // Compatibilidade temporária com estrutura antiga.
      familiaMaterial: produto.familiaMaterial,
      familiaCorJoia: produto.familiaCorJoia,
      familiaImagemUrl:
        dadosFamilia?.familiaImagemUrl || produto.familiaImagemUrl,
      familiaOrdem:
        typeof dadosFamilia?.familiaOrdem === "number"
          ? dadosFamilia.familiaOrdem
          : produto.familiaOrdem,

      // Estrutura dinâmica nova.
      familiaVinculoId: dadosFamilia?.vinculoId || null,
      familiaValores: dadosFamilia?.valores || [],
      familiaValoresPorCampo: dadosFamilia?.valoresPorCampo || {},
    };
  });

  return (
    <ProdutosCatalogClient
      produtos={produtos}
      familiasDisponiveis={familiasDisponiveis}
    />
  );
}
