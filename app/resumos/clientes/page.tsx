import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ResumoClientesClient, {
  type ResumoClienteItem,
} from "@/components/resumos/clientes/ResumoClientesClient";

export const metadata: Metadata = {
  title: "Resumo de Clientes | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type ClienteComVendas = Prisma.ClienteGetPayload<{
  include: {
    vendas: {
      include: {
        itens: true;
      };
    };
    pedidosOnline: {
      include: {
        itens: true;
      };
    };
  };
}>;

export default async function ResumoClientesPage() {
  const clientesRaw = await prisma.cliente.findMany({
    orderBy: {
      nome: "asc",
    },
    include: {
      vendas: {
        include: {
          itens: true,
        },
      },
      pedidosOnline: {
        where: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          status: {
            not: "CANCELADO",
          },
        },
        include: {
          itens: true,
        },
      },
    },
  });

  const pedidoOnlineIds = clientesRaw.flatMap((cliente) =>
    cliente.pedidosOnline.map((pedido) => pedido.id),
  );
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

  const clientes: ResumoClienteItem[] = clientesRaw.map(
    (cliente: ClienteComVendas) => {
      const vendasOperacionais = cliente.vendas.filter(
        (venda) =>
          venda.status !== "CANCELADA" && venda.status !== "NA_LIXEIRA"
      );
      const pedidosOnlinePagos = cliente.pedidosOnline;

      const totalCompradoVendas = vendasOperacionais.reduce(
        (total: number, venda) => total + Number(venda.valorTotal),
        0
      );
      const totalCompradoOnline = pedidosOnlinePagos.reduce(
        (total, pedido) => total + Number(pedido.total || 0),
        0,
      );
      const totalComprado = totalCompradoVendas + totalCompradoOnline;

      const lucroTotalVendas = vendasOperacionais.reduce(
        (total: number, venda) => total + Number(venda.lucroTotal),
        0
      );

      const gastoTotalVendas = vendasOperacionais.reduce(
        (total: number, venda) => total + Number(venda.gastoTotal),
        0
      );
      const gastoTotalOnline = movimentacoesPedidosOnline
        .filter((movimentacao) =>
          pedidosOnlinePagos.some((pedido) => pedido.id === movimentacao.origemId),
        )
        .reduce((total, movimentacao) => total + Number(movimentacao.custo || 0), 0);
      const gastoTotal = gastoTotalVendas + gastoTotalOnline;
      const lucroTotal =
        lucroTotalVendas + (totalCompradoOnline - gastoTotalOnline);

      const quantidadeItensVendas = vendasOperacionais.reduce(
        (total: number, venda) =>
          total +
          venda.itens.reduce(
            (subtotal: number, item) => subtotal + item.quantidade,
            0
          ),
        0
      );
      const quantidadeItensOnline = pedidosOnlinePagos.reduce(
        (total, pedido) =>
          total +
          pedido.itens.reduce((subtotal, item) => subtotal + item.quantidade, 0),
        0,
      );
      const quantidadeItens = quantidadeItensVendas + quantidadeItensOnline;

      const quantidadeCompras =
        vendasOperacionais.length + pedidosOnlinePagos.length;

      const ticketMedio =
        quantidadeCompras > 0
          ? totalComprado / quantidadeCompras
          : 0;

      const comprasOrdenadas = [
        ...vendasOperacionais.map((venda) => venda.criadoEm),
        ...pedidosOnlinePagos.map((pedido) => pedido.pagoEm || pedido.criadoEm),
      ].sort(
        (a, b) => b.getTime() - a.getTime()
      );

      const ultimaCompra = comprasOrdenadas[0] ?? null;
      const primeiraCompra = comprasOrdenadas.length
        ? [...comprasOrdenadas].sort((a, b) => a.getTime() - b.getTime())[0]
        : null;

      const meiosMap = new Map<string, number>();

      vendasOperacionais.forEach((venda) => {
        meiosMap.set(venda.meioVenda, (meiosMap.get(venda.meioVenda) ?? 0) + 1);
      });
      if (pedidosOnlinePagos.length > 0) {
        meiosMap.set(
          "LOJA_ONLINE",
          (meiosMap.get("LOJA_ONLINE") ?? 0) + pedidosOnlinePagos.length,
        );
      }

      const meioMaisUsado =
        Array.from(meiosMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        null;

      return {
        id: cliente.id,
        codigo: cliente.codigo,
        nome: cliente.nome,
        documento: cliente.documento,
        telefone: cliente.telefone,
        email: cliente.email,
        tipoCliente: cliente.tipoCliente,
        status: cliente.status,
        observacoes: cliente.observacoes,
        criadoEm: cliente.criadoEm.toISOString(),
        atualizadoEm: cliente.atualizadoEm.toISOString(),
        quantidadeVendas: quantidadeCompras,
        quantidadeVendasTotal: cliente.vendas.length + cliente.pedidosOnline.length,
        quantidadeItens,
        totalComprado,
        lucroTotal,
        gastoTotal,
        ticketMedio,
        meioMaisUsado,
        primeiraCompraEm: primeiraCompra ? primeiraCompra.toISOString() : null,
        ultimaCompraEm: ultimaCompra ? ultimaCompra.toISOString() : null,
      };
    }
  );

  return <ResumoClientesClient clientes={clientes} />;
}
