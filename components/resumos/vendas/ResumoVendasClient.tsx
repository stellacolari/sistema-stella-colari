"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Filter,
  RefreshCcw,
  Search,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";

export type ResumoVendaProdutoItem = {
  id: string;
  produtoId: string;
  codigo: string;
  nome: string;
  categoria: string | null;
  tamanhoAnel: string | null;
  quantidade: number;
  valorUnitarioFinal: number;
  valorTotal: number;
  gastoProduto: number;
  gastoAdicionais: number;
  lucroTotal: number;
};

export type ResumoVendaItem = {
  id: string;
  codigo: string;
  clienteId: string;
  clienteNome: string;
  clienteDocumento: string;
  meioVenda: string;
  descontoPercentual: number;
  valorTotal: number;
  gastoTotal: number;
  lucroTotal: number;
  status: string;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  quantidadeItens: number;
  itensTotais: number;
  produtos: ResumoVendaProdutoItem[];
};

type ResumoVendasClientProps = {
  vendas: ResumoVendaItem[];
};

type RankingProduto = {
  chave: string;
  codigo: string;
  nome: string;
  categoria: string | null;
  tamanhoAnel: string | null;
  quantidade: number;
  valorTotal: number;
  lucroTotal: number;
};

type RankingCliente = {
  chave: string;
  nome: string;
  documento: string;
  quantidadeVendas: number;
  quantidadeItens: number;
  valorTotal: number;
  lucroTotal: number;
};

type RankingMeioVenda = {
  meioVenda: string;
  quantidadeVendas: number;
  valorTotal: number;
  lucroTotal: number;
};

const STATUS_OPTIONS_FIXOS = [
  { value: "OPERACIONAIS", label: "Operacionais" },
  { value: "TODOS", label: "Todos" },
  { value: "VENDA_FINALIZADA", label: "Venda finalizada" },
  { value: "EM_PREPARACAO", label: "Em preparação" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "PEDIDO_ONLINE_PAGO", label: "Pedido online pago" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "NA_LIXEIRA", label: "Na lixeira" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function percentual(valor: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor)}%`;
}

function dataCurta(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleDateString("pt-BR");
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatus(status: string) {
  if (status === "VENDA_FINALIZADA") return "Venda finalizada";
  if (status === "EM_PREPARACAO") return "Em preparação";
  if (status === "ENVIADA") return "Enviada";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "PEDIDO_ONLINE_PAGO") return "Pedido online pago";
  if (status === "CANCELADA") return "Cancelada";
  if (status === "NA_LIXEIRA") return "Na lixeira";

  return status.replaceAll("_", " ");
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

  if (status === "PEDIDO_ONLINE_PAGO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "CANCELADA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "NA_LIXEIRA") {
    return "border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getDataInicioTimestamp(dataInicio: string): number | null {
  if (!dataInicio) return null;

  const data = new Date(`${dataInicio}T00:00:00`);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data.getTime();
}

function getDataFimTimestamp(dataFim: string): number | null {
  if (!dataFim) return null;

  const data = new Date(`${dataFim}T23:59:59`);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data.getTime();
}

function produtoNomeComTamanho(produto: {
  nome: string;
  tamanhoAnel: string | null;
}) {
  if (!produto.tamanhoAnel) {
    return produto.nome;
  }

  return `${produto.nome} · Tam. ${produto.tamanhoAnel}`;
}

function produtoMeta(produto: {
  codigo: string;
  categoria: string | null;
  tamanhoAnel: string | null;
}) {
  return [
    produto.codigo,
    produto.categoria,
    produto.tamanhoAnel ? `Tam. ${produto.tamanhoAnel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ResumoCard({
  label,
  value,
  description,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone?: "emerald" | "blue" | "amber" | "violet" | "red" | "slate";
}) {
  const tones = {
    emerald: {
      card: "bg-emerald-50 ring-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      label: "text-emerald-700",
      value: "text-emerald-950",
      description: "text-emerald-800/80",
    },
    blue: {
      card: "bg-blue-50 ring-blue-200",
      icon: "bg-blue-100 text-blue-700",
      label: "text-blue-700",
      value: "text-blue-950",
      description: "text-blue-800/80",
    },
    amber: {
      card: "bg-amber-50 ring-amber-200",
      icon: "bg-amber-100 text-amber-700",
      label: "text-amber-700",
      value: "text-amber-950",
      description: "text-amber-800/80",
    },
    violet: {
      card: "bg-violet-50 ring-violet-200",
      icon: "bg-violet-100 text-violet-700",
      label: "text-violet-700",
      value: "text-violet-950",
      description: "text-violet-800/80",
    },
    red: {
      card: "bg-red-50 ring-red-200",
      icon: "bg-red-100 text-red-700",
      label: "text-red-700",
      value: "text-red-950",
      description: "text-red-800/80",
    },
    slate: {
      card: "bg-white ring-slate-200",
      icon: "bg-slate-100 text-slate-700",
      label: "text-slate-500",
      value: "text-slate-950",
      description: "text-slate-500",
    },
  };

  const toneClass = tones[tone];

  return (
    <div className={`rounded-3xl p-5 shadow-sm ring-1 ${toneClass.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${toneClass.label}`}>{label}</p>

          <p className={`mt-2 text-2xl font-bold ${toneClass.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass.icon}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-4 text-sm leading-6 ${toneClass.description}`}>
        {description}
      </p>
    </div>
  );
}

export default function ResumoVendasClient({
  vendas,
}: ResumoVendasClientProps) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("OPERACIONAIS");
  const [clienteSelecionado, setClienteSelecionado] = useState("TODOS");
  const [produtoSelecionado, setProdutoSelecionado] = useState("TODOS");
  const [meioSelecionado, setMeioSelecionado] = useState("TODOS");
  const [busca, setBusca] = useState("");

  const clientesDisponiveis = useMemo(() => {
    const map = new Map<
      string,
      { id: string; nome: string; documento: string }
    >();

    vendas.forEach((venda) => {
      map.set(venda.clienteId, {
        id: venda.clienteId,
        nome: venda.clienteNome,
        documento: venda.clienteDocumento,
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [vendas]);

  const produtosDisponiveis = useMemo(() => {
    const map = new Map<
      string,
      { id: string; nome: string; codigo: string }
    >();

    vendas.forEach((venda) => {
      venda.produtos.forEach((produto) => {
        map.set(produto.produtoId, {
          id: produto.produtoId,
          nome: produto.nome,
          codigo: produto.codigo,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [vendas]);

  const meiosDisponiveis = useMemo(() => {
    const meios = new Set<string>();

    vendas.forEach((venda) => {
      if (venda.meioVenda) {
        meios.add(venda.meioVenda);
      }
    });

    return Array.from(meios).sort((a, b) => a.localeCompare(b));
  }, [vendas]);

  const vendasFiltradas = useMemo(() => {
    const inicioTimestamp = getDataInicioTimestamp(dataInicio);
    const fimTimestamp = getDataFimTimestamp(dataFim);
    const buscaNormalizada = normalizarTexto(busca);

    return vendas.filter((venda) => {
      const dataVenda = new Date(venda.criadoEm).getTime();

      if (
        inicioTimestamp !== null &&
        !Number.isNaN(dataVenda) &&
        dataVenda < inicioTimestamp
      ) {
        return false;
      }

      if (
        fimTimestamp !== null &&
        !Number.isNaN(dataVenda) &&
        dataVenda > fimTimestamp
      ) {
        return false;
      }

      if (
        statusSelecionado === "OPERACIONAIS" &&
        (venda.status === "CANCELADA" || venda.status === "NA_LIXEIRA")
      ) {
        return false;
      }

      if (
        statusSelecionado !== "OPERACIONAIS" &&
        statusSelecionado !== "TODOS" &&
        venda.status !== statusSelecionado
      ) {
        return false;
      }

      if (
        clienteSelecionado !== "TODOS" &&
        venda.clienteId !== clienteSelecionado
      ) {
        return false;
      }

      if (meioSelecionado !== "TODOS" && venda.meioVenda !== meioSelecionado) {
        return false;
      }

      if (
        produtoSelecionado !== "TODOS" &&
        !venda.produtos.some(
          (produto) => produto.produtoId === produtoSelecionado
        )
      ) {
        return false;
      }

      if (buscaNormalizada) {
        const texto = normalizarTexto(
          [
            venda.codigo,
            venda.clienteNome,
            venda.clienteDocumento,
            venda.meioVenda,
            venda.status,
            ...venda.produtos.map((produto) =>
              [
                produto.codigo,
                produto.nome,
                produto.categoria,
                produto.tamanhoAnel,
                produto.tamanhoAnel ? `tam ${produto.tamanhoAnel}` : null,
              ]
                .filter(Boolean)
                .join(" ")
            ),
          ].join(" ")
        );

        if (!texto.includes(buscaNormalizada)) {
          return false;
        }
      }

      return true;
    });
  }, [
    busca,
    clienteSelecionado,
    dataFim,
    dataInicio,
    meioSelecionado,
    produtoSelecionado,
    statusSelecionado,
    vendas,
  ]);

  const resumo = useMemo(() => {
    const totalVendido = vendasFiltradas.reduce(
      (total: number, venda) => total + venda.valorTotal,
      0
    );

    const gastoTotal = vendasFiltradas.reduce(
      (total: number, venda) => total + venda.gastoTotal,
      0
    );

    const lucroTotal = vendasFiltradas.reduce(
      (total: number, venda) => total + venda.lucroTotal,
      0
    );

    const quantidadeItens = vendasFiltradas.reduce(
      (total: number, venda) => total + venda.quantidadeItens,
      0
    );

    const ticketMedio =
      vendasFiltradas.length > 0 ? totalVendido / vendasFiltradas.length : 0;

    const margem = totalVendido > 0 ? (lucroTotal / totalVendido) * 100 : 0;

    return {
      quantidadeVendas: vendasFiltradas.length,
      totalVendido,
      gastoTotal,
      lucroTotal,
      quantidadeItens,
      ticketMedio,
      margem,
    };
  }, [vendasFiltradas]);

  const rankingProdutos = useMemo(() => {
    const map = new Map<string, RankingProduto>();

    vendasFiltradas.forEach((venda) => {
      venda.produtos.forEach((produto) => {
        const chave = `${produto.produtoId}-${produto.tamanhoAnel ?? "UNICO"}`;
        const atual = map.get(chave);

        if (atual) {
          atual.quantidade += produto.quantidade;
          atual.valorTotal += produto.valorTotal;
          atual.lucroTotal += produto.lucroTotal;
        } else {
          map.set(chave, {
            chave,
            codigo: produto.codigo,
            nome: produto.nome,
            categoria: produto.categoria,
            tamanhoAnel: produto.tamanhoAnel,
            quantidade: produto.quantidade,
            valorTotal: produto.valorTotal,
            lucroTotal: produto.lucroTotal,
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10);
  }, [vendasFiltradas]);

  const rankingClientes = useMemo(() => {
    const map = new Map<string, RankingCliente>();

    vendasFiltradas.forEach((venda) => {
      const atual = map.get(venda.clienteId);

      if (atual) {
        atual.quantidadeVendas += 1;
        atual.quantidadeItens += venda.quantidadeItens;
        atual.valorTotal += venda.valorTotal;
        atual.lucroTotal += venda.lucroTotal;
      } else {
        map.set(venda.clienteId, {
          chave: venda.clienteId,
          nome: venda.clienteNome,
          documento: venda.clienteDocumento,
          quantidadeVendas: 1,
          quantidadeItens: venda.quantidadeItens,
          valorTotal: venda.valorTotal,
          lucroTotal: venda.lucroTotal,
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10);
  }, [vendasFiltradas]);

  const rankingMeios = useMemo(() => {
    const map = new Map<string, RankingMeioVenda>();

    vendasFiltradas.forEach((venda) => {
      const atual = map.get(venda.meioVenda);

      if (atual) {
        atual.quantidadeVendas += 1;
        atual.valorTotal += venda.valorTotal;
        atual.lucroTotal += venda.lucroTotal;
      } else {
        map.set(venda.meioVenda, {
          meioVenda: venda.meioVenda,
          quantidadeVendas: 1,
          valorTotal: venda.valorTotal,
          lucroTotal: venda.lucroTotal,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.valorTotal - a.valorTotal
    );
  }, [vendasFiltradas]);

  function limparFiltros() {
    setDataInicio("");
    setDataFim("");
    setStatusSelecionado("OPERACIONAIS");
    setClienteSelecionado("TODOS");
    setProdutoSelecionado("TODOS");
    setMeioSelecionado("TODOS");
    setBusca("");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Relatório
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Relatório de Vendas
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Analise vendas por período, produto, cliente, meio de venda e
              status. Por padrão, vendas canceladas e na lixeira ficam fora dos
              números operacionais.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/relatorios"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar para Relatórios
            </Link>

            <Link
              href="/vendas/nova-v2"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Nova venda
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4" />
              Filtros
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Refine o resumo por período, status, cliente, produto, tamanho ou
              meio de venda.
            </p>
          </div>

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              Data inicial
            </span>

            <input
              type="date"
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              Data final
            </span>

            <input
              type="date"
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>

            <select
              value={statusSelecionado}
              onChange={(event) => setStatusSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              {STATUS_OPTIONS_FIXOS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Meio de venda
            </span>

            <select
              value={meioSelecionado}
              onChange={(event) => setMeioSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="TODOS">Todos</option>

              {meiosDisponiveis.map((meio) => (
                <option key={meio} value={meio}>
                  {meio}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Cliente</span>

            <select
              value={clienteSelecionado}
              onChange={(event) => setClienteSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="TODOS">Todos</option>

              {clientesDisponiveis.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Produto</span>

            <select
              value={produtoSelecionado}
              onChange={(event) => setProdutoSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="TODOS">Todos</option>

              {produtosDisponiveis.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Busca geral
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por código da venda, cliente, documento, produto, tamanho..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          label="Total vendido"
          value={moeda(resumo.totalVendido)}
          description={`${numero(resumo.quantidadeVendas)} venda(s) no filtro atual.`}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="emerald"
        />

        <ResumoCard
          label="Lucro total"
          value={moeda(resumo.lucroTotal)}
          description={`Margem aproximada: ${percentual(resumo.margem)}.`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="blue"
        />

        <ResumoCard
          label="Gasto total"
          value={moeda(resumo.gastoTotal)}
          description="Soma de custos de produtos e adicionais vendidos."
          icon={<Wallet className="h-5 w-5" />}
          tone="amber"
        />

        <ResumoCard
          label="Ticket médio"
          value={moeda(resumo.ticketMedio)}
          description={`${numero(resumo.quantidadeItens)} item(ns) vendido(s).`}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="violet"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Produtos mais vendidos"
            descricao="Ranking por faturamento no filtro atual."
          />

          {rankingProdutos.length === 0 ? (
            <EmptyState texto="Nenhum produto vendido no filtro atual." />
          ) : (
            <div className="divide-y divide-slate-100">
              {rankingProdutos.map((produto, index) => (
                <div key={produto.chave} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {index + 1}. {produtoNomeComTamanho(produto)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {produtoMeta(produto)}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {produto.quantidade} un.
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-slate-950">
                      {moeda(produto.valorTotal)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Lucro</span>
                    <span className="font-semibold text-blue-700">
                      {moeda(produto.lucroTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Clientes que mais compraram"
            descricao="Ranking por valor comprado no filtro atual."
          />

          {rankingClientes.length === 0 ? (
            <EmptyState texto="Nenhum cliente no filtro atual." />
          ) : (
            <div className="divide-y divide-slate-100">
              {rankingClientes.map((cliente, index) => (
                <div key={cliente.chave} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {index + 1}. {cliente.nome}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {cliente.documento}
                      </p>
                    </div>

                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {cliente.quantidadeVendas} venda
                      {cliente.quantidadeVendas === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-slate-950">
                      {moeda(cliente.valorTotal)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Itens</span>
                    <span className="font-semibold text-slate-950">
                      {cliente.quantidadeItens}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Meios de venda"
            descricao="Distribuição por canal/meio de venda."
          />

          {rankingMeios.length === 0 ? (
            <EmptyState texto="Nenhum meio de venda no filtro atual." />
          ) : (
            <div className="divide-y divide-slate-100">
              {rankingMeios.map((meio) => (
                <div key={meio.meioVenda} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {meio.meioVenda}
                    </p>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {meio.quantidadeVendas} venda
                      {meio.quantidadeVendas === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-slate-950">
                      {moeda(meio.valorTotal)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Lucro</span>
                    <span className="font-semibold text-blue-700">
                      {moeda(meio.lucroTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <TabelaTitulo
          titulo="Vendas analíticas"
          descricao="Lista das vendas consideradas nos filtros atuais."
        />

        {vendasFiltradas.length === 0 ? (
          <EmptyState texto="Nenhuma venda encontrada no filtro atual." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Data</th>
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Produtos</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Itens
                  </th>
                  <th className="px-6 py-4 font-semibold">Meio</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Lucro</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {vendasFiltradas.map((venda) => (
                  <tr key={venda.id}>
                    <td className="px-6 py-4 text-slate-600">
                      {dataCurta(venda.criadoEm)}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-950">
                      {venda.codigo}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {venda.clienteNome}
                        </span>
                        <span className="text-xs text-slate-500">
                          {venda.clienteDocumento}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="max-w-[420px] truncate text-slate-700">
                        {venda.produtos
                          .map(
                            (produto) =>
                              `${produtoNomeComTamanho(produto)} (${produto.quantidade} un.)`
                          )
                          .join(", ")}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-semibold text-slate-950">
                      {venda.quantidadeItens}
                    </td>

                    <td className="px-6 py-4">{venda.meioVenda}</td>

                    <td className="px-6 py-4 font-semibold text-slate-950">
                      {moeda(venda.valorTotal)}
                    </td>

                    <td className="px-6 py-4 font-semibold text-blue-700">
                      {moeda(venda.lucroTotal)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                          venda.status
                        )}`}
                      >
                        {labelStatus(venda.status)}
                      </span>
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

function TabelaTitulo({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{descricao}</p>
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return <div className="px-5 py-10 text-sm text-slate-500">{texto}</div>;
}
