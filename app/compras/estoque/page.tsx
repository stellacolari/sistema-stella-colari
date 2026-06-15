import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import ComprasListClient from "@/components/compras/ComprasListClient";
import { buscarComprasEstoqueListagem } from "@/lib/compras/listagens";

export const dynamic = "force-dynamic";

export default async function ComprasEstoquePage() {
  const compras = await buscarComprasEstoqueListagem();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
              <ShoppingCart className="h-4 w-4" />
              Compras de estoque
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Compras de estoque
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Compras que movimentam produtos, embalagens e insumos controlados
              no estoque.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/compras"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar para central
            </Link>
            <Link
              href="/compras/nova-v2"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Nova compra de estoque
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Compra de estoque entra no estoque, pode criar movimentação e mantém
          o fluxo atual de cancelamento com estorno.
        </div>
      </section>

      <ComprasListClient compras={compras} />
    </div>
  );
}
