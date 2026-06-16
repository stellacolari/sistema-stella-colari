import type { Metadata } from "next";
import Link from "next/link";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Quem somos | Stella Colari",
  description: "Conheca a loja online Stella Colari e sua proposta.",
  path: "/loja/quem-somos",
});

export default function QuemSomosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Stella Colari
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Quem somos
            </h1>
          </div>

          <Link
            href="/loja"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Voltar para loja
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Sobre a loja
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Uma loja criada para aproximar produtos, estoque e atendimento.
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Esta é uma página inicial de apresentação da loja. No próximo
              pacote, podemos transformar este conteúdo em configurável pelo
              painel interno.
            </p>

            <p>
              A proposta é conectar o catálogo público à operação da
              Stella Colari, permitindo uma gestão mais integrada entre
              produtos, vendas e atendimento ao cliente.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
