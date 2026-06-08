import { prisma } from "@/lib/prisma";
import { criarProduto } from "../actions";
import NovoProdutoClient from "@/components/produtos/NovoProdutoClient";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const [categorias, produtosDisponiveisKit, regrasAdicionais] =
    await Promise.all([
      prisma.categoriaProduto.findMany({
        where: {
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          slug: true,
          categoriaMaeId: true,
          descricao: true,
          imagemUrl: true,
          exibirNoMenu: true,
          ordemMenu: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),

      prisma.produto.findMany({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
          tipoProduto: "UNITARIO",
        },
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          categoria: true,
          tipoProduto: true,
          custoBase: true,
        },
        orderBy: {
          nome: "asc",
        },
      }),

      prisma.regraCategoria.findMany({
        where: {
          itemAdicional: {
            ativo: true,
            status: {
              not: "NA_LIXEIRA",
            },
          },
        },
        select: {
          id: true,
          categoria: true,
          aplicarTodasCategorias: true,
          categorias: true,
          quantidade: true,
          itemAdicional: {
            select: {
              id: true,
              codigoInterno: true,
              nome: true,
              custoBase: true,
            },
          },
        },
        orderBy: [{ categoria: "asc" }, { criadoEm: "asc" }],
      }),
    ]);

  const produtosKitSerializados = produtosDisponiveisKit.map((produto) => ({
    ...produto,
    custoBase: Number(produto.custoBase || 0),
  }));

  const regrasAdicionaisSerializadas = regrasAdicionais.map((regra) => ({
    id: regra.id,
    categoria: regra.categoria,
    aplicarTodasCategorias: regra.aplicarTodasCategorias,
    categorias: regra.categorias,
    quantidade: Number(regra.quantidade || 0),
    itemAdicional: {
      id: regra.itemAdicional.id,
      codigoInterno: regra.itemAdicional.codigoInterno,
      nome: regra.itemAdicional.nome,
      custoBase: Number(regra.itemAdicional.custoBase || 0),
    },
  }));

  return (
    <NovoProdutoClient
      categorias={categorias}
      produtosDisponiveisKit={produtosKitSerializados}
      regrasAdicionais={regrasAdicionaisSerializadas}
      criarProdutoAction={criarProduto}
    />
  );
}
