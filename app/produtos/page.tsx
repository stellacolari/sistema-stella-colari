import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProdutosCatalogClient from "@/components/produtos/ProdutosCatalogClient";

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

function montarMapaCustoAdicionais(regras: RegraAdicionalComItem[]) {
  const mapa = new Map<string, number>();

  regras.forEach((regra) => {
    const itemAtivo =
      regra.itemAdicional.ativo && regra.itemAdicional.status !== "NA_LIXEIRA";

    if (!itemAtivo) {
      return;
    }

    const categoria = String(regra.categoria || "").trim();

    if (!categoria) {
      return;
    }

    const quantidade = Number(regra.quantidade || 0);
    const custoUnitario = Number(regra.itemAdicional.custoBase || 0);
    const custoTotal = quantidade * custoUnitario;

    mapa.set(
      categoria,
      arredondarMoeda((mapa.get(categoria) || 0) + custoTotal)
    );
  });

  return mapa;
}

function montarMapaQuantidadeAdicionais(regras: RegraAdicionalComItem[]) {
  const mapa = new Map<string, number>();

  regras.forEach((regra) => {
    const itemAtivo =
      regra.itemAdicional.ativo && regra.itemAdicional.status !== "NA_LIXEIRA";

    if (!itemAtivo) {
      return;
    }

    const categoria = String(regra.categoria || "").trim();

    if (!categoria) {
      return;
    }

    mapa.set(categoria, (mapa.get(categoria) || 0) + 1);
  });

  return mapa;
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

    prisma.produtoFamilia.findMany({
      where: {
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        ativo: true,
        ordem: true,
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  ]);

  const custoAdicionaisPorCategoria =
    montarMapaCustoAdicionais(regrasAdicionais);

  const quantidadeAdicionaisPorCategoria =
    montarMapaQuantidadeAdicionais(regrasAdicionais);

  const familiasDisponiveis = familiasRaw.map((familia) => ({
    id: familia.id,
    nome: familia.nome,
    slug: familia.slug,
    ativo: familia.ativo,
    ordem: familia.ordem,
  }));

  const produtos = produtosRaw.map((produto: ProdutoComRelacoes) => {
    const categoriaPrincipal = getCategoriaPrincipalProduto(produto);

    const custoBase = Number(produto.custoBase || 0);
    const margemAplicada = Number(produto.margemAplicada || 0);
    const precoVendaBanco = Number(produto.precoVenda || 0);

    const custoAdicionais = Number(
      custoAdicionaisPorCategoria.get(categoriaPrincipal) || 0
    );

    const quantidadeAdicionais = Number(
      quantidadeAdicionaisPorCategoria.get(categoriaPrincipal) || 0
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
      familiaMaterial: produto.familiaMaterial,
      familiaCorJoia: produto.familiaCorJoia,
      familiaImagemUrl: produto.familiaImagemUrl,
      familiaOrdem: produto.familiaOrdem,
    };
  });

  return (
    <ProdutosCatalogClient
      produtos={produtos}
      familiasDisponiveis={familiasDisponiveis}
    />
  );
}