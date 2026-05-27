import { prisma } from "@/lib/prisma";
import NovaCompraV2Client from "@/components/compras/NovaCompraV2Client";

export const dynamic = "force-dynamic";

export default async function NovaCompraV2Page() {
  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    include: {
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
    orderBy: { nome: "asc" },
  });

  const itensAdicionais = await prisma.itemAdicional.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: { nome: "asc" },
  });

  const itensBusca = [
    ...produtos.map((produto) => ({
      id: produto.id,
      tipo: "produto" as const,
      codigoInterno: produto.codigoInterno,
      codigoFornecedor: produto.codigoFornecedor || "",
      nome: produto.nome,
      custoBase: Number(produto.custoBase),
      fornecedorPadrao: produto.fornecedorPadrao,
      categoria: produto.categoria,
      variacoes: produto.variacoes.map((variacao) => ({
        id: variacao.id,
        nome: variacao.nome,
        obrigatoria: Boolean(variacao.obrigatoria),
        opcoes: variacao.opcoes.map((opcao) => ({
          id: opcao.id,
          nome: opcao.nome,
          imagemUrl: opcao.imagemUrl,
          precoAdicional: Number(opcao.precoAdicional || 0),
          custoAdicional: Number(opcao.custoAdicional || 0),
          ativo: Boolean(opcao.ativo),
          ordem: Number(opcao.ordem || 0),
        })),
      })),
    })),

    ...itensAdicionais.map((item) => ({
      id: item.id,
      tipo: "adicional" as const,
      codigoInterno: item.codigoInterno,
      codigoFornecedor: item.codigoFornecedor || "",
      nome: item.nome,
      custoBase: Number(item.custoBase),
      fornecedorPadrao: item.fornecedorPadrao,
      categoria: "",
      variacoes: [],
    })),
  ];

  return <NovaCompraV2Client itensBusca={itensBusca} />;
}