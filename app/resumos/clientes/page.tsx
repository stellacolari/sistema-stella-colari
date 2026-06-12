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
    },
  });

  const clientes: ResumoClienteItem[] = clientesRaw.map(
    (cliente: ClienteComVendas) => {
      const vendasOperacionais = cliente.vendas.filter(
        (venda) =>
          venda.status !== "CANCELADA" && venda.status !== "NA_LIXEIRA"
      );

      const totalComprado = vendasOperacionais.reduce(
        (total: number, venda) => total + Number(venda.valorTotal),
        0
      );

      const lucroTotal = vendasOperacionais.reduce(
        (total: number, venda) => total + Number(venda.lucroTotal),
        0
      );

      const gastoTotal = vendasOperacionais.reduce(
        (total: number, venda) => total + Number(venda.gastoTotal),
        0
      );

      const quantidadeItens = vendasOperacionais.reduce(
        (total: number, venda) =>
          total +
          venda.itens.reduce(
            (subtotal: number, item) => subtotal + item.quantidade,
            0
          ),
        0
      );

      const ticketMedio =
        vendasOperacionais.length > 0
          ? totalComprado / vendasOperacionais.length
          : 0;

      const vendasOrdenadas = [...vendasOperacionais].sort(
        (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
      );

      const ultimaVenda = vendasOrdenadas[0] ?? null;
      const primeiraVenda = vendasOperacionais.length
        ? [...vendasOperacionais].sort(
            (a, b) => a.criadoEm.getTime() - b.criadoEm.getTime()
          )[0]
        : null;

      const meiosMap = new Map<string, number>();

      vendasOperacionais.forEach((venda) => {
        meiosMap.set(venda.meioVenda, (meiosMap.get(venda.meioVenda) ?? 0) + 1);
      });

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
        quantidadeVendas: vendasOperacionais.length,
        quantidadeVendasTotal: cliente.vendas.length,
        quantidadeItens,
        totalComprado,
        lucroTotal,
        gastoTotal,
        ticketMedio,
        meioMaisUsado,
        primeiraCompraEm: primeiraVenda ? primeiraVenda.criadoEm.toISOString() : null,
        ultimaCompraEm: ultimaVenda ? ultimaVenda.criadoEm.toISOString() : null,
      };
    }
  );

  return <ResumoClientesClient clientes={clientes} />;
}
