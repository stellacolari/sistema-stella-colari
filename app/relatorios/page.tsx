import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Users, Warehouse } from "lucide-react";

export const metadata: Metadata = {
  title: "Relatórios | Plataforma Stella Colari",
};

type HubCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ElementType;
};

const relatorios = [
  {
    href: "/resumos/vendas",
    title: "Vendas",
    description: "Acompanhe faturamento, histórico, rankings e indicadores de venda.",
    icon: BarChart3,
  },
  {
    href: "/resumos/estoque",
    title: "Estoque",
    description: "Veja saldos, valor acumulado, itens críticos e rankings de estoque.",
    icon: Warehouse,
  },
  {
    href: "/resumos/clientes",
    title: "Clientes",
    description: "Analise perfil, recorrência e desempenho da base de clientes.",
    icon: Users,
  },
];

function HubCard({ href, title, description, icon: Icon }: HubCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-slate-300"
    >
      <div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition group-hover:text-slate-950">
        Abrir relatório
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export default function RelatoriosPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Gestão
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Relatórios
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Acompanhe indicadores e resumos da operação.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {relatorios.map((relatorio) => (
          <HubCard key={relatorio.href} {...relatorio} />
        ))}
      </section>
    </main>
  );
}
