import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CreditCard,
  MousePointerClick,
  Package,
  Plus,
  RefreshCcw,
  Settings,
  ShoppingCart,
  Store,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const atalhosRelacionados = [
  {
    label: "Produtos",
    href: "/produtos",
    icon: Package,
  },
  {
    label: "Itens adicionais",
    href: "/itens-adicionais",
    icon: Boxes,
  },
  {
    label: "Embalagens",
    href: "/configuracoes/loja/embalagens",
    icon: Store,
  },
  {
    label: "Configurações de loja",
    href: "/configuracoes/loja",
    icon: Settings,
  },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default async function ComprasPage() {
  const [totalComprasEstoque, totalGastos, gastosAbertos, gastosPagosMes] =
    await Promise.all([
      prisma.compra.count({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
        },
      }),
      prisma.lancamentoFinanceiro.count({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
        },
      }),
      prisma.lancamentoFinanceiro.aggregate({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
          statusPagamento: {
            in: ["PENDENTE", "VENCIDO"],
          },
        },
        _sum: {
          valorReal: true,
        },
      }),
      prisma.lancamentoFinanceiro.aggregate({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
          statusPagamento: "PAGO",
          dataPagamento: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: {
          valorReal: true,
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compras
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Compras e Financeiro
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Central para compras de estoque, gastos financeiros, assinaturas,
              marketing, permutas e reposição.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/compras/estoque"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ShoppingCart className="h-4 w-4" />
              Compras de estoque
            </Link>
            <Link
              href="/compras/gastos"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <CreditCard className="h-4 w-4" />
              Gastos financeiros
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard titulo="Compras de estoque" valor={totalComprasEstoque} />
        <ResumoCard titulo="Gastos cadastrados" valor={totalGastos} />
        <ResumoCard
          titulo="Gastos em aberto"
          valor={moeda(Number(gastosAbertos._sum.valorReal ?? 0))}
        />
        <ResumoCard
          titulo="Pago este mês"
          valor={moeda(Number(gastosPagosMes._sum.valorReal ?? 0))}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <HubCard
          icon={ShoppingCart}
          title="Compras de estoque"
          description="Registre compras que entram no estoque, como produtos, embalagens e insumos controlados."
          primaryLabel="Ver compras de estoque"
          primaryHref="/compras/estoque"
          secondaryLabel="Nova compra de estoque"
          secondaryHref="/compras/nova-v2"
        />

        <HubCard
          icon={CreditCard}
          title="Gastos financeiros"
          description="Controle assinaturas, compras únicas, estrutura, marketing, tráfego, influenciadores e permutas sem alterar estoque."
          primaryLabel="Ver gastos"
          primaryHref="/compras/gastos"
          secondaryLabel="Novo lançamento"
          secondaryHref="/compras/gastos?novo=1"
        />

        <HubCard
          icon={RefreshCcw}
          title="Reposição"
          description="Veja produtos, embalagens e insumos que precisam ser recomprados."
          primaryLabel="Ver reposição"
          primaryHref="/compras/reposicao"
        />

        <HubCard
          icon={MousePointerClick}
          title="Intencao comercial"
          description="Acompanhe sinais anonimos da loja: busca, favoritos, carrinho, banners e checkout."
          primaryLabel="Ver intencao"
          primaryHref="/compras/intencao"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Cadastros relacionados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Atalhos para cadastros usados por compras, estoque e loja.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {atalhosRelacionados.map((atalho) => {
              const Icon = atalho.icon;

              return (
                <Link
                  key={atalho.href}
                  href={atalho.href}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {atalho.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Financeiro e distribuição
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Base futura para apuração mensal, caixa, reserva,
                investimentos e pró-labore.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            {[
              "Apuração mensal",
              "Caixa",
              "Reserva",
              "Social media",
              "Tráfego",
              "Investimentos",
              "Pró-labore",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href="/compras/resultado"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Resultado
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/compras/financeiro"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Central Financeira
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {valor}
      </p>
    </div>
  );
}

function HubCard({
  icon: Icon,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            {secondaryLabel}
          </Link>
        )}
      </div>
    </article>
  );
}
