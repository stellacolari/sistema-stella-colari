import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ResumoVendasClient, {
  type ResumoVendaItem,
} from "@/components/resumos/vendas/ResumoVendasClient";

export const metadata: Metadata = {
  title: "Relatório de Vendas | Plataforma Stella Colari",
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

type PedidoOnlineComRelacoes = Prisma.PedidoOnlineGetPayload<{
  include: {
    cliente: true;
    itens: true;
  };
}>;

export default async function ResumoVendasPage() {
  const [vendasRaw, pedidosOnlineRaw] = await Promise.all([
    prisma.venda.findMany({
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
    }),
    prisma.pedidoOnline.findMany({
      where: {
        origemCanal: "LOJA_STELLA",
        statusPagamento: "PAGO",
        status: {
          not: "CANCELADO",
        },
      },
      orderBy: {
        pagoEm: "desc",
      },
      include: {
        cliente: true,
        itens: true,
      },
    }),
  ]);

  const pedidoOnlineIds = pedidosOnlineRaw.map((pedido) => pedido.id);
  const movimentacoesPedidosOnline =
    pedidoOnlineIds.length > 0
      ? await prisma.movimentacao.findMany({
          where: {
            origemId: {
              in: pedidoOnlineIds,
            },
            status: "ATIVA",
          },
        })
      : [];

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

  const pedidosOnline: ResumoVendaItem[] = pedidosOnlineRaw.map(
    (pedido: PedidoOnlineComRelacoes) => {
      const movimentacoesPedido = movimentacoesPedidosOnline.filter(
        (movimentacao) => movimentacao.origemId === pedido.id,
      );

      const gastoTotal = movimentacoesPedido.reduce(
        (total, movimentacao) => total + Number(movimentacao.custo || 0),
        0,
      );

      const produtos = pedido.itens.map((item) => {
        const movimentacoesItem = movimentacoesPedido.filter(
          (movimentacao) => movimentacao.relacionadoA === item.id,
        );
        const gastoProduto = movimentacoesItem.reduce(
          (total, movimentacao) =>
            total + Number(movimentacao.gastoProdutoPrincipal || 0),
          0,
        );
        const gastoAdicionais = movimentacoesItem.reduce(
          (total, movimentacao) =>
            total +
            Number(movimentacao.gastoAdd1 || 0) +
            Number(movimentacao.gastoAdd2 || 0) +
            Number(movimentacao.gastoAdd3 || 0),
          0,
        );
        const valorTotal = Number(item.total || 0);

        return {
          id: item.id,
          produtoId: item.produtoId || "",
          codigo: item.codigoInterno,
          nome: item.nomeProduto,
          categoria: item.categoria,
          tamanhoAnel: item.tamanhoAnel,
          quantidade: item.quantidade,
          valorUnitarioFinal:
            item.quantidade > 0 ? valorTotal / item.quantidade : 0,
          valorTotal,
          gastoProduto,
          gastoAdicionais,
          lucroTotal: valorTotal - gastoProduto - gastoAdicionais,
        };
      });

      const quantidadeItens = pedido.itens.reduce(
        (total, item) => total + item.quantidade,
        0,
      );

      return {
        id: pedido.id,
        codigo: pedido.codigo,
        clienteId: pedido.clienteId || "",
        clienteNome: pedido.cliente?.nome || pedido.nomeCliente,
        clienteDocumento: pedido.cliente?.documento || pedido.documento || "",
        meioVenda: "LOJA_ONLINE",
        descontoPercentual: 0,
        valorTotal: Number(pedido.total || 0),
        gastoTotal,
        lucroTotal: Number(pedido.total || 0) - gastoTotal,
        status: "PEDIDO_ONLINE_PAGO",
        observacoes: pedido.observacoes,
        criadoEm: (pedido.pagoEm || pedido.criadoEm).toISOString(),
        atualizadoEm: pedido.atualizadoEm.toISOString(),
        quantidadeItens,
        itensTotais: pedido.itens.length,
        produtos,
      };
    },
  );

  return <ResumoVendasClient vendas={[...vendas, ...pedidosOnline]} />;
}
