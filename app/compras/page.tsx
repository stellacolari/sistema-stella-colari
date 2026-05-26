import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ComprasListClient, {
  type CompraListItem,
} from "@/components/compras/ComprasListClient";

export const dynamic = "force-dynamic";

type CompraComItens = Prisma.CompraGetPayload<{
  include: {
    itens: true;
  };
}>;

export default async function ComprasPage() {
  const comprasRaw = await prisma.compra.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      itens: true,
    },
  });

  const compras: CompraListItem[] = comprasRaw.map((compra: CompraComItens) => {
    const itens = compra.itens.map((item) => ({
      id: item.id,
      tipoItem: item.tipoItem,
      codigoDigitado: item.codigoDigitado,
      descricao: item.descricao,
      quantidade: item.quantidade,
      tamanhoAnel: item.tamanhoAnel,
      valorUnitarioBase: Number(item.valorUnitarioBase),
      valorUnitarioFinal: Number(item.valorUnitarioFinal),
      valorTotalBase: Number(item.valorTotalBase),
      valorTotalFinal: Number(item.valorTotalFinal),
      parcelaFrete: Number(item.parcelaFrete),
      valorTotalComFrete: Number(item.valorTotalComFrete),
    }));

    const quantidadeItens = compra.itens.reduce(
      (total: number, item) => total + item.quantidade,
      0
    );

    return {
      id: compra.id,
      codigo: compra.codigo,
      fornecedor: compra.fornecedor,
      descontoPercentual: Number(compra.descontoPercentual),
      frete: Number(compra.frete),
      valorTotalBruto: Number(compra.valorTotalBruto),
      valorTotalFinal: Number(compra.valorTotalFinal),
      observacoes: compra.observacoes,
      status: compra.status,
      cancelamentoMotivo: compra.cancelamentoMotivo,
      cancelamentoObservacao: compra.cancelamentoObservacao,
      canceladoEm: compra.canceladoEm ? compra.canceladoEm.toISOString() : null,
      criadoEm: compra.criadoEm.toISOString(),
      itensTotais: compra.itens.length,
      quantidadeItens,
      itens,
    };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compras
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Lista de Compras
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Consulte os pedidos de compra, acompanhe os itens e cancele
              compras com estorno controlado de estoque.
            </p>
          </div>

          <Link
            href="/compras/nova-v2"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Nova compra
          </Link>
        </div>
      </div>

      <ComprasListClient compras={compras} />
    </div>
  );
}