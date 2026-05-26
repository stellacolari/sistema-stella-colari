import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ResumoVendasClient, {
  type ResumoVendaItem,
} from "@/components/resumos/vendas/ResumoVendasClient";

export const metadata: Metadata = {
  title: "Resumo de Vendas | Sistema Stella",
};

export const dynamic = "force-dynamic";

type VendaComRelacoes = Prisma.VendaGetPayload<{
  include: {
    cliente: true;
    itens: {
      include: {
        produto: true;
      };
    };
  };
}>;

export default async function ResumoVendasPage() {
  const vendasRaw = await prisma.venda.findMany({
    orderBy: {
      criadoEm: "desc",
    },
    include: {
      cliente: true,
      itens: {
        include: {
          produto: true,
        },
      },
    },
  });

  const vendas: ResumoVendaItem[] = vendasRaw.map((venda: VendaComRelacoes) => {
    const produtos = venda.itens.map((item) => ({
      id: item.id,
      produtoId: item.produtoId,
      codigo: item.codigoDigitado,
      nome: item.descricao,
      categoria: item.produto?.categoria ?? null,
      tamanhoAnel: item.tamanhoAnel,
      quantidade: item.quantidade,
      valorUnitarioFinal: Number(item.valorUnitarioFinal),
      valorTotal: Number(item.valorTotal),
      gastoProduto: Number(item.gastoProduto),
      gastoAdicionais: Number(item.gastoAdicionais),
      lucroTotal: Number(item.lucroTotal),
    }));

    const quantidadeItens = venda.itens.reduce(
      (total: number, item) => total + item.quantidade,
      0
    );

    return {
      id: venda.id,
      codigo: venda.codigo,
      clienteId: venda.clienteId,
      clienteNome: venda.cliente.nome,
      clienteDocumento: venda.cliente.documento,
      meioVenda: venda.meioVenda,
      descontoPercentual: Number(venda.descontoPercentual),
      valorTotal: Number(venda.valorTotal),
      gastoTotal: Number(venda.gastoTotal),
      lucroTotal: Number(venda.lucroTotal),
      status: venda.status,
      observacoes: venda.observacoes,
      criadoEm: venda.criadoEm.toISOString(),
      atualizadoEm: venda.atualizadoEm.toISOString(),
      quantidadeItens,
      itensTotais: venda.itens.length,
      produtos,
    };
  });

  return <ResumoVendasClient vendas={vendas} />;
}