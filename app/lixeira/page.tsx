import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import LixeiraClient, {
  type ClienteLixeiraItem,
  type CompraLixeiraItem,
  type ItemAdicionalLixeiraItem,
  type ProdutoLixeiraItem,
  type VendaLixeiraItem,
} from "@/components/lixeira/LixeiraClient";

export const metadata: Metadata = {
  title: "Lixeira | Sistema Stella",
};

export const dynamic = "force-dynamic";

type VendaComRelacoes = Prisma.VendaGetPayload<{
  include: {
    cliente: true;
    itens: true;
  };
}>;

type CompraComItens = Prisma.CompraGetPayload<{
  include: {
    itens: true;
  };
}>;

type ProdutoComRelacoes = Prisma.ProdutoGetPayload<{
  include: {
    estoque: true;
    vendasItens: {
      select: {
        id: true;
      };
    };
  };
}>;

type ItemAdicionalComRelacoes = Prisma.ItemAdicionalGetPayload<{
  include: {
    estoque: true;
    regrasCategoria: {
      select: {
        id: true;
      };
    };
  };
}>;

type ClienteComVendas = Prisma.ClienteGetPayload<{
  include: {
    vendas: {
      select: {
        id: true;
        valorTotal: true;
        status: true;
      };
    };
  };
}>;

function somarEstoqueProduto(produto: ProdutoComRelacoes) {
  return produto.estoque.reduce(
    (total: number, estoque) => total + estoque.quantidadeAtual,
    0
  );
}

function somarValorEstoqueProduto(produto: ProdutoComRelacoes) {
  return produto.estoque.reduce(
    (total: number, estoque) => total + Number(estoque.valorAcumulado),
    0
  );
}

export default async function LixeiraPage() {
  const [
    vendasRaw,
    comprasRaw,
    produtosRaw,
    itensAdicionaisRaw,
    clientesRaw,
  ] = await Promise.all([
    prisma.venda.findMany({
      where: {
        status: "NA_LIXEIRA",
      },
      orderBy: {
        atualizadoEm: "desc",
      },
      include: {
        cliente: true,
        itens: true,
      },
    }),

    prisma.compra.findMany({
      where: {
        status: "NA_LIXEIRA",
      },
      orderBy: {
        atualizadoEm: "desc",
      },
      include: {
        itens: true,
      },
    }),

    prisma.produto.findMany({
      where: {
        status: "NA_LIXEIRA",
      },
      orderBy: {
        atualizadoEm: "desc",
      },
      include: {
        estoque: true,
        vendasItens: {
          select: {
            id: true,
          },
        },
      },
    }),

    prisma.itemAdicional.findMany({
      where: {
        status: "NA_LIXEIRA",
      },
      orderBy: {
        atualizadoEm: "desc",
      },
      include: {
        estoque: true,
        regrasCategoria: {
          select: {
            id: true,
          },
        },
      },
    }),

    prisma.cliente.findMany({
      where: {
        status: "NA_LIXEIRA",
      },
      orderBy: {
        atualizadoEm: "desc",
      },
      include: {
        vendas: {
          select: {
            id: true,
            valorTotal: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const vendas: VendaLixeiraItem[] = vendasRaw.map((venda: VendaComRelacoes) => ({
    id: venda.id,
    codigo: venda.codigo,
    clienteNome: venda.cliente.nome,
    clienteDocumento: venda.cliente.documento,
    meioVenda: venda.meioVenda,
    quantidadeItens: venda.itens.reduce(
      (total: number, item) => total + item.quantidade,
      0
    ),
    itensTotais: venda.itens.length,
    valorTotal: Number(venda.valorTotal),
    statusAntesLixeira: venda.statusAntesLixeira,
    criadoEm: venda.criadoEm.toISOString(),
    atualizadoEm: venda.atualizadoEm.toISOString(),
  }));

  const compras: CompraLixeiraItem[] = comprasRaw.map(
    (compra: CompraComItens) => ({
      id: compra.id,
      codigo: compra.codigo,
      fornecedor: compra.fornecedor,
      quantidadeItens: compra.itens.reduce(
        (total: number, item) => total + item.quantidade,
        0
      ),
      itensTotais: compra.itens.length,
      valorTotalFinal: Number(compra.valorTotalFinal),
      statusAntesLixeira: compra.statusAntesLixeira,
      criadoEm: compra.criadoEm.toISOString(),
      atualizadoEm: compra.atualizadoEm.toISOString(),
    })
  );

  const produtos: ProdutoLixeiraItem[] = produtosRaw.map(
    (produto: ProdutoComRelacoes) => ({
      id: produto.id,
      codigoInterno: produto.codigoInterno,
      codigoFornecedor: produto.codigoFornecedor,
      nome: produto.nome,
      categoria: produto.categoria,
      fornecedorPadrao: produto.fornecedorPadrao,
      precoVenda: Number(produto.precoVenda),
      custoBase: Number(produto.custoBase),
      estoqueAtual: somarEstoqueProduto(produto),
      valorEstoque: somarValorEstoqueProduto(produto),
      totalVendas: produto.vendasItens.length,
      statusAntesLixeira: produto.statusAntesLixeira,
      criadoEm: produto.criadoEm.toISOString(),
      atualizadoEm: produto.atualizadoEm.toISOString(),
    })
  );

  const itensAdicionais: ItemAdicionalLixeiraItem[] = itensAdicionaisRaw.map(
    (item: ItemAdicionalComRelacoes) => ({
      id: item.id,
      codigoInterno: item.codigoInterno,
      codigoFornecedor: item.codigoFornecedor,
      nome: item.nome,
      fornecedorPadrao: item.fornecedorPadrao,
      custoBase: Number(item.custoBase),
      estoqueAtual: item.estoque?.quantidadeAtual ?? 0,
      valorEstoque: Number(item.estoque?.valorAcumulado ?? 0),
      totalRegras: item.regrasCategoria.length,
      statusAntesLixeira: item.statusAntesLixeira,
      criadoEm: item.criadoEm.toISOString(),
      atualizadoEm: item.atualizadoEm.toISOString(),
    })
  );

  const clientes: ClienteLixeiraItem[] = clientesRaw.map(
    (cliente: ClienteComVendas) => {
      const vendasAtivas = cliente.vendas.filter(
        (venda) => venda.status !== "CANCELADA" && venda.status !== "NA_LIXEIRA"
      );

      const valorTotalComprado = vendasAtivas.reduce(
        (total: number, venda) => total + Number(venda.valorTotal),
        0
      );

      return {
        id: cliente.id,
        codigo: cliente.codigo,
        nome: cliente.nome,
        documento: cliente.documento,
        telefone: cliente.telefone,
        email: cliente.email,
        tipoCliente: cliente.tipoCliente,
        totalVendas: cliente.vendas.length,
        totalVendasAtivas: vendasAtivas.length,
        valorTotalComprado,
        statusAntesLixeira: cliente.statusAntesLixeira,
        criadoEm: cliente.criadoEm.toISOString(),
        atualizadoEm: cliente.atualizadoEm.toISOString(),
      };
    }
  );

  return (
    <LixeiraClient
      vendas={vendas}
      compras={compras}
      produtos={produtos}
      itensAdicionais={itensAdicionais}
      clientes={clientes}
    />
  );
}