import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Megaphone,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Relatórios | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type ReportCardProps = {
  href?: string;
  title: string;
  description: string;
  icon: ElementType;
  metric?: string;
  metricLabel?: string;
  status?: string;
  tone?: "default" | "success" | "warning" | "future";
};

const reportCards: ReportCardProps[] = [
  {
    href: "/resumos/vendas",
    title: "Relatório de vendas",
    description:
      "Acompanhe faturamento, histórico, rankings e indicadores de venda.",
    icon: BarChart3,
    tone: "success",
  },
  {
    href: "/resumos/estoque",
    title: "Relatório de estoque",
    description:
      "Veja saldos, valor acumulado, itens críticos e rankings de estoque.",
    icon: Warehouse,
    tone: "warning",
  },
  {
    href: "/resumos/clientes",
    title: "Relatório de clientes",
    description:
      "Analise perfil, recorrência e desempenho da base de clientes.",
    icon: Users,
  },
  {
    title: "Financeiro",
    description:
      "Gastos, assinaturas, pró-labore, caixa e distribuição de resultado.",
    icon: Wallet,
    status: "Em breve",
    tone: "future",
  },
  {
    title: "Compras",
    description: "Compras de estoque, reposição e desempenho por fornecedor.",
    icon: ShoppingCart,
    status: "Em breve",
    tone: "future",
  },
  {
    title: "Marketing",
    description: "Tráfego, influencers, permutas e campanhas comerciais.",
    icon: Megaphone,
    status: "Em breve",
    tone: "future",
  },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor || 0);
}

function getToneClasses(tone: ReportCardProps["tone"] = "default") {
  if (tone === "success") {
    return {
      icon: "bg-emerald-50 text-emerald-700",
      metric: "text-emerald-700",
      ring: "ring-emerald-200",
    };
  }

  if (tone === "warning") {
    return {
      icon: "bg-amber-50 text-amber-700",
      metric: "text-amber-700",
      ring: "ring-amber-200",
    };
  }

  if (tone === "future") {
    return {
      icon: "bg-slate-100 text-slate-500",
      metric: "text-slate-500",
      ring: "ring-slate-200",
    };
  }

  return {
    icon: "bg-blue-50 text-blue-700",
    metric: "text-blue-700",
    ring: "ring-slate-200",
  };
}

function ReportCard({
  href,
  title,
  description,
  icon: Icon,
  metric,
  metricLabel,
  status,
  tone,
}: ReportCardProps) {
  const classes = getToneClasses(tone);
  const content = (
    <>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${classes.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          {status && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {status}
            </span>
          )}
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {metric && metricLabel && (
        <div className="mt-5 rounded-2xl bg-slate-50 px-3 py-2">
          <p className={`text-base font-bold ${classes.metric}`}>{metric}</p>
          <p className="mt-0.5 text-xs text-slate-500">{metricLabel}</p>
        </div>
      )}

      {href ? (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition group-hover:text-slate-950">
          Abrir relatório
          <ArrowRight className="h-4 w-4" />
        </span>
      ) : (
        <span className="mt-5 text-sm font-semibold text-slate-400">
          Planejado para próxima fase
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <div
        className={`flex h-full flex-col justify-between rounded-3xl bg-white p-5 opacity-85 shadow-sm ring-1 ${classes.ring}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:ring-slate-300 ${classes.ring}`}
    >
      {content}
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

export default async function RelatoriosPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    vendasMes,
    pedidosOnlineMes,
    produtosEstoqueBaixo,
    adicionaisEstoqueBaixo,
    clientesAtivos,
    clientesTotal,
  ] = await Promise.all([
    prisma.venda.aggregate({
      where: {
        criadoEm: {
          gte: inicioMes,
        },
        status: {
          notIn: ["CANCELADA", "NA_LIXEIRA"],
        },
      },
      _sum: {
        valorTotal: true,
      },
      _count: true,
    }),
    prisma.pedidoOnline.aggregate({
      where: {
        origemCanal: "LOJA_STELLA",
        statusPagamento: "PAGO",
        status: {
          not: "CANCELADO",
        },
        OR: [
          {
            pagoEm: {
              gte: inicioMes,
            },
          },
          {
            pagoEm: null,
            criadoEm: {
              gte: inicioMes,
            },
          },
        ],
      },
      _sum: {
        total: true,
      },
      _count: true,
    }),
    prisma.estoqueProduto.count({
      where: {
        quantidadeAtual: {
          lte: 5,
        },
      },
    }),
    prisma.estoqueAdicional.count({
      where: {
        quantidadeAtual: {
          lte: 5,
        },
      },
    }),
    prisma.cliente.count({
      where: {
        status: {
          not: "NA_LIXEIRA",
        },
      },
    }),
    prisma.cliente.count(),
  ]);

  const totalVendidoMes =
    Number(vendasMes._sum.valorTotal || 0) +
    Number(pedidosOnlineMes._sum.total || 0);
  const vendasMesQuantidade =
    Number(vendasMes._count || 0) + Number(pedidosOnlineMes._count || 0);
  const itensEstoqueBaixo = produtosEstoqueBaixo + adicionaisEstoqueBaixo;

  const cardsComMetricas = reportCards.map((card) => {
    if (card.href === "/resumos/vendas") {
      return {
        ...card,
        metric: moeda(totalVendidoMes),
        metricLabel: `${numero(vendasMesQuantidade)} venda(s)/pedido(s) pagos no mês`,
      };
    }

    if (card.href === "/resumos/estoque") {
      return {
        ...card,
        metric: numero(itensEstoqueBaixo),
        metricLabel: "itens com 5 unidades ou menos",
      };
    }

    if (card.href === "/resumos/clientes") {
      return {
        ...card,
        metric: numero(clientesAtivos),
        metricLabel: `${numero(clientesTotal)} cliente(s) cadastrados`,
      };
    }

    return card;
  });

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
          Acompanhe indicadores de vendas, estoque, clientes e gestão
          financeira.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Vendido no mês"
          value={moeda(totalVendidoMes)}
          helper={`${numero(vendasMesQuantidade)} venda(s)/pedido(s) pagos`}
        />
        <SummaryCard
          label="Estoque baixo"
          value={numero(itensEstoqueBaixo)}
          helper="Produtos e adicionais com 5 unidades ou menos"
        />
        <SummaryCard
          label="Clientes ativos"
          value={numero(clientesAtivos)}
          helper={`${numero(clientesTotal)} cliente(s) cadastrados no total`}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cardsComMetricas.map((relatorio) => (
          <ReportCard key={relatorio.title} {...relatorio} />
        ))}
      </section>
    </main>
  );
}
