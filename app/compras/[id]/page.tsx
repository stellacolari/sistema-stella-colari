import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CompraItensClient from "@/components/compras/CompraItensClient";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function Info({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>

      {children}
    </section>
  );
}

export default async function CompraDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      itens: {
        orderBy: {
          criadoEm: "asc",
        },
      },
    },
  });

  if (!compra) {
    notFound();
  }

  const itens = compra.itens.map((item) => ({
    id: item.id,
    tipoItem: item.tipoItem,
    codigoDigitado: item.codigoDigitado,
    descricao: item.descricao,
    quantidade: item.quantidade,
    valorUnitarioBase: Number(item.valorUnitarioBase),
    valorUnitarioFinal: Number(item.valorUnitarioFinal),
    valorTotalComFrete: Number(item.valorTotalComFrete),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compra de estoque
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Pedido {compra.codigo}
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Visualização do cabeçalho e dos itens da compra. Alterações feitas
              nos itens ajustam estoque e registram movimentações.
            </p>
          </div>

          <Link
            href="/compras/estoque"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Voltar para compras de estoque
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title="Cabeçalho da compra">
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Info label="Código" value={compra.codigo} />

              <Info label="Fornecedor" value={compra.fornecedor} />

              <Info
                label="Desconto do pedido"
                value={`${String(compra.descontoPercentual).replace(".", ",")}%`}
              />

              <Info label="Frete" value={moeda(Number(compra.frete))} />

              <Info
                label="Total bruto"
                value={moeda(Number(compra.valorTotalBruto))}
              />

              <Info
                label="Total final"
                value={moeda(Number(compra.valorTotalFinal))}
              />

              <Info
                label="Criado em"
                value={new Date(compra.criadoEm).toLocaleDateString("pt-BR")}
              />

              <Info label="Observações" value={compra.observacoes || "-"} />
            </div>
          </div>
        </Card>

        <Card title="Itens da compra">
          <CompraItensClient compraId={compra.id} itens={itens} />
        </Card>
      </div>
    </div>
  );
}
