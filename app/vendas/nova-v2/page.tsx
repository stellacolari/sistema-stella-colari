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
      imagemUrl: true,
      tipoProduto: true,
      imagens: {
        orderBy: {
          ordem: "asc",
        },
        select: {
          imagemUrl: true,
        },
        take: 1,
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
              ativo: true,
              ordem: true,
            },
          },
        },
      },
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
      telefone: true,
      email: true,
      cep: true,
      rua: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
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
        produto.tipoProduto === "KIT" ? `${produto.nome} · Kit` : produto.nome,
      precoVenda: Number(produto.precoVenda),
      categoria: produto.categoria,
      imagemUrl: produto.imagens[0]?.imagemUrl ?? produto.imagemUrl,
      estoqueAtual: estoque.estoqueAtual,
      estoquesPorTamanho: estoque.estoquesPorTamanho,
      tipoProduto: produto.tipoProduto,
      variacoes: produto.variacoes.map((variacao) => ({
        id: variacao.id,
        nome: variacao.nome,
        obrigatoria: Boolean(variacao.obrigatoria),
        opcoes: variacao.opcoes.map((opcao) => ({
          id: opcao.id,
          nome: opcao.nome,
          imagemUrl: opcao.imagemUrl,
          ativo: Boolean(opcao.ativo),
          ordem: Number(opcao.ordem || 0),
        })),
      })),
    };
  });

  return (
    <NovaVendaV2Client clientes={clientes} produtos={produtosFormatados} />
  );
}
