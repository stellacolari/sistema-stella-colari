"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownUp,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";

export type DashboardStatusItem = {
  status: string;
  label: string;
  quantidade: number;
};

export type DashboardEstoqueAlertaItem = {
  id: string;
  tipo: string;
  codigo: string;
  nome: string;
  quantidadeAtual: number;
  valorAcumulado: number;
  situacao: string;
};

export type DashboardMovimentacaoItem = {
  id: string;
  codigoMovimentacao: string;
  tipoMovimentacao: string;
  tipoMovimentacaoLabel: string;
  origemTipo: string;
  codigoItem: string;
  itemTipo: string;
  quantidade: number;
  tamanhoAnel: string | null;
  custo: number;
  faturamento: number;
  criadoEm: string;
  status: string;
};

export type DashboardData = {
  cards: {
    totalVendido: number;
    lucroTotal: number;
    gastoTotalVendas: number;
    totalComprado: number;
    clientesAtivos: number;
    vendasAtivas: number;
    pedidosOnlinePagos: number;
    totalPedidosOnlinePagos: number;
    comprasAtivas: number;
    quantidadeItensVendidos: number;
    quantidadeItensComprados: number;
    quantidadeProdutosEmEstoque: number;
    quantidadeAdicionaisEmEstoque: number;
    valorEstoqueProdutos: number;
    valorEstoqueAdicionais: number;
    alertasEstoque: number;
  };
  vendasPorStatus: DashboardStatusItem[];
  alertasEstoque: DashboardEstoqueAlertaItem[];
  ultimasMovimentacoes: DashboardMovimentacaoItem[];
};

type DashboardClientProps = {
  data: DashboardData;
};

type CardTone =
  | "emerald"
  | "blue"
  | "amber"
  | "violet"
  | "indigo"
  | "red"
  | "slate";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function dataCompleta(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function getCardToneClasses(tone: CardTone) {
  const classes: Record<
    CardTone,
    {
      card: string;
      icon: string;
      value: string;
      label: string;
      description: string;
      border: string;
    }
  > = {
    emerald: {
      card: "bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-950",
      label: "text-emerald-700",
      description: "text-emerald-800/80",
      border: "ring-emerald-200",
    },
    blue: {
      card: "bg-blue-50",
      icon: "bg-blue-100 text-blue-700",
      value: "text-blue-950",
      label: "text-blue-700",
      description: "text-blue-800/80",
      border: "ring-blue-200",
    },
    amber: {
      card: "bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-950",
      label: "text-amber-700",
      description: "text-amber-800/80",
      border: "ring-amber-200",
    },
    violet: {
      card: "bg-violet-50",
      icon: "bg-violet-100 text-violet-700",
      value: "text-violet-950",
      label: "text-violet-700",
      description: "text-violet-800/80",
      border: "ring-violet-200",
    },
    indigo: {
      card: "bg-indigo-50",
      icon: "bg-indigo-100 text-indigo-700",
      value: "text-indigo-950",
      label: "text-indigo-700",
      description: "text-indigo-800/80",
      border: "ring-indigo-200",
    },
    red: {
      card: "bg-red-50",
      icon: "bg-red-100 text-red-700",
      value: "text-red-950",
      label: "text-red-700",
      description: "text-red-800/80",
      border: "ring-red-200",
    },
    slate: {
      card: "bg-white",
      icon: "bg-slate-100 text-slate-700",
      value: "text-slate-950",
      label: "text-slate-500",
      description: "text-slate-500",
      border: "ring-slate-200",
    },
  };

  return classes[tone];
}

function statusBadgeClass(status: string) {
  if (status === "VENDA_FINALIZADA") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "EM_PREPARACAO") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "ENVIADA") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "ENTREGUE") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (status === "CANCELADA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "NA_LIXEIRA") {
    return "border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function movimentoBadgeClass(tipo: string) {
  if (tipo === "ENTRADA") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tipo === "SAÍDA" || tipo === "SAIDA") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (tipo === "ESTORNO_VENDA" || tipo === "ESTORNO_COMPRA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function situacaoEstoqueClass(situacao: string) {
  if (situacao === "ZERADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (situacao === "REPOR") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function itemMetaMovimentacao(movimentacao: DashboardMovimentacaoItem) {
  return [
    movimentacao.itemTipo,
    movimentacao.tamanhoAnel ? `Tam. ${movimentacao.tamanhoAnel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function DashboardCard({
  label,
  value,
  description,
  icon,
  href,
  tone = "slate",
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  tone?: CardTone;
}) {
  const toneClasses = getCardToneClasses(tone);

  const content = (
    <div
      className={`h-full rounded-3xl p-5 shadow-sm ring-1 transition hover:shadow-md ${toneClasses.card} ${toneClasses.border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${toneClasses.label}`}>
            {label}
          </p>

          <p className={`mt-2 text-2xl font-bold ${toneClasses.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses.icon}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-4 text-sm leading-6 ${toneClasses.description}`}>
        {description}
      </p>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

export default function DashboardClient({ data }: DashboardClientProps) {
  const totalEstoque =
    data.cards.valorEstoqueProdutos + data.cards.valorEstoqueAdicionais;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-sm ring-1 ring-slate-800">
        <div className="relative p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
                Dashboard
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
                Visão geral da Plataforma Stella Colari
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Acompanhe vendas, compras, estoque, clientes, alertas e
                movimentações recentes em um único painel.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200">
              Dados atualizados em tempo real pelo banco local.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Total vendido"
          value={moeda(data.cards.totalVendido)}
          description={`${numero(data.cards.vendasAtivas)} venda(s)/pedido(s) pago(s). Online: ${moeda(data.cards.totalPedidosOnlinePagos)}.`}
          icon={<ShoppingBag className="h-5 w-5" />}
          href="/resumos/vendas"
          tone="emerald"
        />

        <DashboardCard
          label="Lucro total"
          value={moeda(data.cards.lucroTotal)}
          description={`Gasto de vendas e pedidos online efetivados: ${moeda(data.cards.gastoTotalVendas)}.`}
          icon={<TrendingUp className="h-5 w-5" />}
          href="/resumos/vendas"
          tone="blue"
        />

        <DashboardCard
          label="Total comprado"
          value={moeda(data.cards.totalComprado)}
          description={`${numero(data.cards.comprasAtivas)} compra(s) ativa(s), sem canceladas/lixeira.`}
          icon={<ShoppingCart className="h-5 w-5" />}
          href="/compras"
          tone="amber"
        />

        <DashboardCard
          label="Clientes ativos"
          value={numero(data.cards.clientesAtivos)}
          description="Clientes fora da lixeira cadastrados no sistema."
          icon={<Users className="h-5 w-5" />}
          href="/clientes"
          tone="violet"
        />

        <DashboardCard
          label="Itens vendidos"
          value={numero(data.cards.quantidadeItensVendidos)}
          description={`${numero(data.cards.pedidosOnlinePagos)} pedido(s) online pago(s) incluidos.`}
          icon={<ReceiptText className="h-5 w-5" />}
          href="/pedidos"
          tone="emerald"
        />

        <DashboardCard
          label="Itens comprados"
          value={numero(data.cards.quantidadeItensComprados)}
          description="Soma das quantidades compradas nas compras ativas."
          icon={<ArrowDownUp className="h-5 w-5" />}
          href="/compras"
          tone="amber"
        />

        <DashboardCard
          label="Valor em estoque"
          value={moeda(totalEstoque)}
          description={`Produtos: ${moeda(data.cards.valorEstoqueProdutos)} · Adicionais: ${moeda(data.cards.valorEstoqueAdicionais)}.`}
          icon={<Warehouse className="h-5 w-5" />}
          href="/estoque"
          tone="indigo"
        />

        <DashboardCard
          label="Alertas de estoque"
          value={numero(data.cards.alertasEstoque)}
          description="Itens com estoque zerado ou igual/abaixo de 5 unidades."
          icon={<AlertTriangle className="h-5 w-5" />}
          href="/estoque"
          tone={data.cards.alertasEstoque > 0 ? "red" : "emerald"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Vendas por status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Distribuição geral das vendas cadastradas.
            </p>
          </div>

          {data.vendasPorStatus.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhuma venda cadastrada.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.vendasPorStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.label}
                  </span>

                  <span className="text-sm font-bold text-slate-950">
                    {item.quantidade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 bg-gradient-to-r from-red-50 to-white px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Alertas de estoque
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Produtos e adicionais que exigem atenção.
            </p>
          </div>

          {data.alertasEstoque.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhum alerta de estoque no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Item</th>
                    <th className="px-6 py-4 font-semibold">Tipo</th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Estoque
                    </th>
                    <th className="px-6 py-4 font-semibold">Valor</th>
                    <th className="px-6 py-4 font-semibold">Situação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {data.alertasEstoque.map((item) => (
                    <tr key={`${item.tipo}-${item.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-950">
                            {item.nome}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.codigo}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">{item.tipo}</td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-950">
                        {item.quantidadeAtual}
                      </td>

                      <td className="px-6 py-4">
                        {moeda(item.valorAcumulado)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${situacaoEstoqueClass(
                            item.situacao
                          )}`}
                        >
                          {item.situacao}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Últimas movimentações
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Entradas, saídas e estornos registrados recentemente.
          </p>
        </div>

        {data.ultimasMovimentacoes.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Nenhuma movimentação cadastrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Data</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Origem</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Qtd.
                  </th>
                  <th className="px-6 py-4 font-semibold">Custo</th>
                  <th className="px-6 py-4 font-semibold">Faturamento</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.ultimasMovimentacoes.map((movimentacao) => (
                  <tr key={movimentacao.id}>
                    <td className="px-6 py-4 text-slate-600">
                      {dataCompleta(movimentacao.criadoEm)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${movimentoBadgeClass(
                          movimentacao.tipoMovimentacao
                        )}`}
                      >
                        {movimentacao.tipoMovimentacaoLabel}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-950">
                          {movimentacao.codigoItem}
                        </span>
                        <span className="text-xs text-slate-500">
                          {itemMetaMovimentacao(movimentacao)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">{movimentacao.origemTipo}</td>

                    <td className="px-6 py-4 text-center font-semibold text-slate-950">
                      {movimentacao.quantidade}
                    </td>

                    <td className="px-6 py-4">
                      {moeda(movimentacao.custo)}
                    </td>

                    <td className="px-6 py-4">
                      {moeda(movimentacao.faturamento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
