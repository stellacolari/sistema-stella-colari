import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  PackagePlus,
  RefreshCcw,
  SlidersHorizontal,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Insumos e Embalagens | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type HubCardProps = {
  title: string;
  description: string;
  icon: ElementType;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  metric?: string;
  metricLabel?: string;
};

function HubCard({
  title,
  description,
  icon: Icon,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  metric,
  metricLabel,
}: HubCardProps) {
  return (
    <article className="flex h-full flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        {(metric || metricLabel) && (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            {metric && (
              <p className="text-2xl font-bold tracking-tight text-slate-950">
                {metric}
              </p>
            )}
            {metricLabel && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {metricLabel}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>

        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </article>
  );
}

function ConceitoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default async function InsumosEmbalagensPage() {
  const [itensAtivos, regrasAtivas, modelosAtivos, itensReposicao] =
    await Promise.all([
      prisma.itemAdicional.count({
        where: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
        },
      }),
      prisma.regraCategoria.count(),
      prisma.embalagemModelo.count({
        where: {
          ativo: true,
        },
      }),
      prisma.estoqueAdicional.count({
        where: {
          quantidadeAtual: {
            lte: 5,
          },
          itemAdicional: {
            ativo: true,
            status: {
              not: "NA_LIXEIRA",
            },
          },
        },
      }),
    ]);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Insumos e Embalagens
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Central de Insumos e Embalagens
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Organize insumos físicos controlados em estoque, regras de
              consumo por produto e o motor de embalagens por pedido ou pacote.
            </p>
          </div>

          <Link
            href="/compras/reposicao"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Reposição de insumos
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ConceitoCard
          title="Item adicional = insumo físico controlado em estoque"
          description="Tag, cartela, caixa, laço, papel, saco, garantia e outros itens comprados e acompanhados como saldo."
        />
        <ConceitoCard
          title="Regra por categoria = consumo por produto/unidade"
          description="Define quantas tags, garantias, saquinhos ou outros insumos entram no custo de cada produto vendido."
        />
        <ConceitoCard
          title="Motor de embalagem = consumo por pedido/pacote"
          description="Define caixa padrão, caixa presente, embalagem externa e compatibilidades usadas para preparar o pedido."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <HubCard
          icon={Boxes}
          title="Itens adicionais"
          description="Cadastre insumos físicos controlados em estoque, como tag, cartela, caixa, laço, papel, saco e garantia."
          primaryLabel="Ver itens adicionais"
          primaryHref="/itens-adicionais"
          secondaryLabel="Novo item adicional"
          secondaryHref="/itens-adicionais/novo"
          metric={String(itensAtivos)}
          metricLabel="itens ativos"
        />

        <HubCard
          icon={SlidersHorizontal}
          title="Regras por categoria"
          description="Configure consumo por produto ou unidade vendida, como tag por produto, garantia por produto ou saquinho individual."
          primaryLabel="Ver regras por categoria"
          primaryHref="/regras-categoria"
          metric={String(regrasAtivas)}
          metricLabel="regras cadastradas"
        />

        <HubCard
          icon={PackagePlus}
          title="Embalagens"
          description="Modele consumo por pedido ou pacote, como caixa padrão, caixa presente, embalagem externa e componentes."
          primaryLabel="Ver embalagens"
          primaryHref="/configuracoes/loja/embalagens"
          metric={String(modelosAtivos)}
          metricLabel="modelos ativos"
        />

        <HubCard
          icon={RefreshCcw}
          title="Reposição de insumos"
          description="Acompanhe insumos e embalagens perto de acabar e siga para uma compra de estoque quando precisar recomprar."
          primaryLabel="Ver reposição"
          primaryHref="/compras/reposicao"
          metric={String(itensReposicao)}
          metricLabel="itens em atenção"
        />
      </section>
    </main>
  );
}
