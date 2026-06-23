import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ClientesListClient, {
  type ClienteListItem,
} from "@/components/clientes/ClientesListClient";

export const dynamic = "force-dynamic";

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

export default async function ClientesPage() {
  const clientesRaw = await prisma.cliente.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      vendas: {
        select: {
          id: true,
          valorTotal: true,
          status: true,
        },
      },
    },
  });

  const clientes: ClienteListItem[] = clientesRaw.map(
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
        telefone: cliente.telefone,
        email: cliente.email,
        documento: cliente.documento,
        tipoCliente: cliente.tipoCliente,
        status: cliente.status,
        statusAntesLixeira: cliente.statusAntesLixeira,
        observacoes: cliente.observacoes,
        criadoEm: cliente.criadoEm.toISOString(),
        atualizadoEm: cliente.atualizadoEm.toISOString(),
        totalVendas: cliente.vendas.length,
        totalVendasAtivas: vendasAtivas.length,
        valorTotalComprado,
      };
    }
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Clientes
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Lista de Clientes
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Gerencie o cadastro de clientes, consulte histórico de vendas e
              envie registros para a lixeira sem apagar vendas antigas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/clientes/relacionamento"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Relacionamento
            </Link>

            <Link
              href="/clientes/novo"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Adicionar cliente
            </Link>
          </div>
        </div>
      </div>

      <ClientesListClient clientes={clientes} />
    </div>
  );
}
