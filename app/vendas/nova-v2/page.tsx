import { prisma } from "@/lib/prisma";
import NovaVendaV2Client from "@/components/vendas/NovaVendaV2Client";
import { calcularEstoqueProdutoVenda } from "@/lib/loja/estoque";

export const dynamic = "force-dynamic";

async function buscarProdutosVenda() {
  return prisma.produto.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      codigoInterno: true,
      codigoFornecedor: true,
      nome: true,
      precoVenda: true,
      categoria: true,
      tipoProduto: true,
      estoque: {
        select: {
          tamanhoAnel: true,
          quantidadeAtual: true,
        },
        orderBy: {
          tamanhoAnel: "asc",
        },
      },
      componentesDoKit: {
        select: {
          quantidade: true,
          componenteProduto: {
            select: {
              id: true,
              codigoInterno: true,
              nome: true,
              estoque: {
                select: {
                  tamanhoAnel: true,
                  quantidadeAtual: true,
                },
                orderBy: {
                  tamanhoAnel: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          criadoEm: "asc",
        },
      },
    },
  });
}

export default async function NovaVendaV2Page() {
  const clientes = await prisma.cliente.findMany({
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      codigo: true,
      nome: true,
      documento: true,
    },
  });

  const produtos = await buscarProdutosVenda();

  const produtosFormatados = produtos.map((produto) => {
    const estoque = calcularEstoqueProdutoVenda({
      tipoProduto: produto.tipoProduto,
      estoque: produto.estoque,
      componentesDoKit: produto.componentesDoKit,
    });

    return {
      id: produto.id,
      codigoInterno: produto.codigoInterno,
      codigoFornecedor: produto.codigoFornecedor || "",
      nome:
        produto.tipoProduto === "KIT"
          ? `${produto.nome} · Kit`
          : produto.nome,
      precoVenda: Number(produto.precoVenda),
      categoria: produto.categoria,
      estoqueAtual: estoque.estoqueAtual,
      estoquesPorTamanho: estoque.estoquesPorTamanho,
      tipoProduto: produto.tipoProduto,
    };
  });

  return <NovaVendaV2Client clientes={clientes} produtos={produtosFormatados} />;
}