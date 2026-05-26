import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ImportarPedidoExternoClient from "@/components/configuracoes/integracoes/ImportarPedidoExternoClient";

export const metadata: Metadata = {
  title: "Importar pedido externo | Sistema Stella",
};

export default function ImportarPedidoExternoPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/configuracoes/integracoes"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para integrações
            </Link>

            <p className="mt-5 text-sm font-medium uppercase tracking-wide text-slate-500">
              Integrações
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Importar pedido externo
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Tela técnica para testar a entrada de pedidos externos no Stella.
              Use para simular Mercado Livre, Shopee, TikTok Shop ou outro
              canal antes da integração real.
            </p>
          </div>
        </div>
      </section>

      <ImportarPedidoExternoClient />
    </main>
  );
}