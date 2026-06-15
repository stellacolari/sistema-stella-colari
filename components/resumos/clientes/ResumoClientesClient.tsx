"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Filter,
  RefreshCcw,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";

export type ResumoClienteItem = {
  id: string;
  codigo: string;
  nome: string;
  documento: string;
  telefone: string;
  email: string | null;
  tipoCliente: string;
  status: string;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  quantidadeVendas: number;
  quantidadeVendasTotal: number;
  quantidadeItens: number;
  totalComprado: number;
  lucroTotal: number;
  gastoTotal: number;
  ticketMedio: number;
  meioMaisUsado: string | null;
  primeiraCompraEm: string | null;
  ultimaCompraEm: string | null;
};

type ResumoClientesClientProps = {
  clientes: ResumoClienteItem[];
};

const FILTROS_COMPORTAMENTO = [
  { value: "TODOS", label: "Todos" },
  { value: "COM_COMPRA", label: "Com compra" },
  { value: "SEM_COMPRA", label: "Sem compra" },
  { value: "RECORRENTES", label: "Recorrentes" },
  { value: "ALTO_VALOR", label: "Alto valor" },
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

function dataCurta(dataIso: string | null) {
  if (!dataIso) return "-";

  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleDateString("pt-BR");
}

function diasDesde(dataIso: string | null) {
  if (!dataIso) return null;

  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  const diffMs = Date.now() - data.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatus(status: string) {
  if (status === "NOVO") return "Novo";
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Inativo";
  if (status === "NA_LIXEIRA") return "Na lixeira";

  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "NOVO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "ATIVO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "INATIVO") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (status === "NA_LIXEIRA") {
    return "border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function perfilCliente(cliente: ResumoClienteItem) {
  if (cliente.quantidadeVendas === 0) {
    return {
      label: "Sem compra",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (cliente.totalComprado >= 3000) {
    return {
      label: "Alto valor",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (cliente.quantidadeVendas >= 3) {
    return {
      label: "Recorrente",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: "Comprador",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  };
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

export default function ResumoClientesClient({
  clientes,
}: ResumoClientesClientProps) {
  const [busca, setBusca] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState("TODOS");
  const [statusSelecionado, setStatusSelecionado] = useState("ATIVOS");
  const [comportamentoSelecionado, setComportamentoSelecionado] =
    useState("TODOS");

  const tiposDisponiveis = useMemo(() => {
    const tipos = new Set<string>();

    clientes.forEach((cliente) => {
      if (cliente.tipoCliente) {
        tipos.add(cliente.tipoCliente);
      }
    });

    return Array.from(tipos).sort((a, b) => a.localeCompare(b));
  }, [clientes]);

  const statusDisponiveis = useMemo(() => {
    const status = new Set<string>();

    clientes.forEach((cliente) => {
      if (cliente.status) {
        status.add(cliente.status);
      }
    });

    return Array.from(status).sort((a, b) => a.localeCompare(b));
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);

    return clientes.filter((cliente) => {
      if (
        statusSelecionado === "ATIVOS" &&
        cliente.status === "NA_LIXEIRA"
      ) {
        return false;
      }

      if (
        statusSelecionado !== "ATIVOS" &&
        statusSelecionado !== "TODOS" &&
        cliente.status !== statusSelecionado
      ) {
        return false;
      }

      if (
        tipoSelecionado !== "TODOS" &&
        cliente.tipoCliente !== tipoSelecionado
      ) {
        return false;
      }

      if (
        comportamentoSelecionado === "COM_COMPRA" &&
        cliente.quantidadeVendas <= 0
      ) {
        return false;
      }

      if (
        comportamentoSelecionado === "SEM_COMPRA" &&
        cliente.quantidadeVendas > 0
      ) {
        return false;
      }

      if (
        comportamentoSelecionado === "RECORRENTES" &&
        cliente.quantidadeVendas < 3
      ) {
        return false;
      }

      if (
        comportamentoSelecionado === "ALTO_VALOR" &&
        cliente.totalComprado < 3000
      ) {
        return false;
      }

      if (!buscaNormalizada) {
        return true;
      }

      const texto = normalizarTexto(
        [
          cliente.codigo,
          cliente.nome,
          cliente.documento,
          cliente.telefone,
          cliente.email,
          cliente.tipoCliente,
          cliente.status,
          cliente.meioMaisUsado,
          cliente.observacoes,
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [
    busca,
    clientes,
    comportamentoSelecionado,
    statusSelecionado,
    tipoSelecionado,
  ]);

  const resumo = useMemo(() => {
    const clientesComCompra = clientesFiltrados.filter(
      (cliente) => cliente.quantidadeVendas > 0
    );

    const clientesSemCompra = clientesFiltrados.filter(
      (cliente) => cliente.quantidadeVendas === 0
    );

    const totalComprado = clientesFiltrados.reduce(
      (total: number, cliente) => total + cliente.totalComprado,
      0
    );

    const lucroTotal = clientesFiltrados.reduce(
      (total: number, cliente) => total + cliente.lucroTotal,
      0
    );

    const totalVendas = clientesFiltrados.reduce(
      (total: number, cliente) => total + cliente.quantidadeVendas,
      0
    );

    const ticketMedioPorVenda = totalVendas > 0 ? totalComprado / totalVendas : 0;

    const ticketMedioPorCliente =
      clientesComCompra.length > 0 ? totalComprado / clientesComCompra.length : 0;

    const clienteTop = [...clientesFiltrados].sort(
      (a, b) => b.totalComprado - a.totalComprado
    )[0];

    return {
      totalClientes: clientesFiltrados.length,
      clientesComCompra: clientesComCompra.length,
      clientesSemCompra: clientesSemCompra.length,
      totalComprado,
      lucroTotal,
      totalVendas,
      ticketMedioPorVenda,
      ticketMedioPorCliente,
      clienteTop,
    };
  }, [clientesFiltrados]);

  const rankingClientes = useMemo(() => {
    return [...clientesFiltrados]
      .filter((cliente) => cliente.quantidadeVendas > 0)
      .sort((a, b) => b.totalComprado - a.totalComprado)
      .slice(0, 10);
  }, [clientesFiltrados]);

  const clientesRecentes = useMemo(() => {
    return [...clientesFiltrados]
      .filter((cliente) => cliente.ultimaCompraEm)
      .sort((a, b) => {
        const dataA = new Date(a.ultimaCompraEm ?? "").getTime();
        const dataB = new Date(b.ultimaCompraEm ?? "").getTime();
        return dataB - dataA;
      })
      .slice(0, 10);
  }, [clientesFiltrados]);

  const clientesSemCompra = useMemo(() => {
    return [...clientesFiltrados]
      .filter((cliente) => cliente.quantidadeVendas === 0)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 10);
  }, [clientesFiltrados]);

  function limparFiltros() {
    setBusca("");
    setTipoSelecionado("TODOS");
    setStatusSelecionado("ATIVOS");
    setComportamentoSelecionado("TODOS");
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
              Relatório de Clientes
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Analise seus principais clientes, frequência de compra, ticket
              médio, última compra e clientes que ainda não compraram.
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
              href="/clientes/novo"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Novo cliente
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
              Filtre por nome, documento, tipo, status ou perfil de compra.
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
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Busca geral
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, documento, telefone, e-mail, tipo..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Tipo</span>

            <select
              value={tipoSelecionado}
              onChange={(event) => setTipoSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="TODOS">Todos</option>

              {tiposDisponiveis.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>

            <select
              value={statusSelecionado}
              onChange={(event) => setStatusSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="ATIVOS">Ativos</option>
              <option value="TODOS">Todos</option>

              {statusDisponiveis.map((status) => (
                <option key={status} value={status}>
                  {labelStatus(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
            <span className="text-sm font-medium text-slate-700">Perfil</span>

            <select
              value={comportamentoSelecionado}
              onChange={(event) =>
                setComportamentoSelecionado(event.target.value)
              }
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              {FILTROS_COMPORTAMENTO.map((filtro) => (
                <option key={filtro.value} value={filtro.value}>
                  {filtro.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          label="Clientes filtrados"
          value={numero(resumo.totalClientes)}
          description={`${numero(resumo.clientesComCompra)} com compra e ${numero(
            resumo.clientesSemCompra
          )} sem compra.`}
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />

        <ResumoCard
          label="Total comprado"
          value={moeda(resumo.totalComprado)}
          description={`${numero(resumo.totalVendas)} venda(s) consideradas.`}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="emerald"
        />

        <ResumoCard
          label="Ticket médio por venda"
          value={moeda(resumo.ticketMedioPorVenda)}
          description={`Ticket médio por cliente comprador: ${moeda(
            resumo.ticketMedioPorCliente
          )}.`}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="blue"
        />

        <ResumoCard
          label="Lucro total"
          value={moeda(resumo.lucroTotal)}
          description={
            resumo.clienteTop
              ? `Principal cliente: ${resumo.clienteTop.nome}.`
              : "Nenhum cliente com compra no filtro atual."
          }
          icon={<TrendingUp className="h-5 w-5" />}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Clientes que mais compraram"
            descricao="Ranking por valor total comprado."
          />

          {rankingClientes.length === 0 ? (
            <EmptyState texto="Nenhum cliente com compra no filtro atual." />
          ) : (
            <div className="divide-y divide-slate-100">
              {rankingClientes.map((cliente, index) => {
                const perfil = perfilCliente(cliente);

                return (
                  <div key={cliente.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {index + 1}. {cliente.nome}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {cliente.documento}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${perfil.className}`}
                      >
                        {perfil.label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Total comprado</span>
                      <span className="font-semibold text-slate-950">
                        {moeda(cliente.totalComprado)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Vendas</span>
                      <span className="font-semibold text-slate-950">
                        {cliente.quantidadeVendas}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Última compra</span>
                      <span className="font-semibold text-slate-950">
                        {dataCurta(cliente.ultimaCompraEm)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Compras recentes"
            descricao="Clientes com compra mais recente no filtro atual."
          />

          {clientesRecentes.length === 0 ? (
            <EmptyState texto="Nenhum cliente com compra recente no filtro atual." />
          ) : (
            <div className="divide-y divide-slate-100">
              {clientesRecentes.map((cliente) => {
                const dias = diasDesde(cliente.ultimaCompraEm);

                return (
                  <div key={cliente.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {cliente.nome}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {cliente.documento}
                        </p>
                      </div>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {dias === null ? "-" : `${dias} dia${dias === 1 ? "" : "s"}`}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Última compra</span>
                      <span className="font-semibold text-slate-950">
                        {dataCurta(cliente.ultimaCompraEm)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Meio mais usado</span>
                      <span className="font-semibold text-slate-950">
                        {cliente.meioMaisUsado ?? "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Clientes sem compra"
            descricao="Cadastros que ainda não geraram venda operacional."
          />

          {clientesSemCompra.length === 0 ? (
            <EmptyState texto="Nenhum cliente sem compra no filtro atual." />
          ) : (
            <div className="divide-y divide-slate-100">
              {clientesSemCompra.map((cliente) => (
                <div key={cliente.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {cliente.nome}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {cliente.documento}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Sem compra
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Tipo</span>
                    <span className="font-semibold text-slate-950">
                      {cliente.tipoCliente}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Cadastrado em</span>
                    <span className="font-semibold text-slate-950">
                      {dataCurta(cliente.criadoEm)}
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
          titulo="Clientes analíticos"
          descricao="Lista completa dos clientes considerados nos filtros atuais."
        />

        {clientesFiltrados.length === 0 ? (
          <EmptyState texto="Nenhum cliente encontrado no filtro atual." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Documento</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Perfil</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Vendas
                  </th>
                  <th className="px-6 py-4 font-semibold">Total comprado</th>
                  <th className="px-6 py-4 font-semibold">Ticket médio</th>
                  <th className="px-6 py-4 font-semibold">Última compra</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {clientesFiltrados.map((cliente) => {
                  const perfil = perfilCliente(cliente);

                  return (
                    <tr key={cliente.id}>
                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {cliente.codigo}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {cliente.nome}
                          </span>
                          <span className="text-xs text-slate-500">
                            {cliente.email || cliente.telefone}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">{cliente.documento}</td>

                      <td className="px-6 py-4">{cliente.tipoCliente}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${perfil.className}`}
                        >
                          {perfil.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-950">
                        {cliente.quantidadeVendas}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {moeda(cliente.totalComprado)}
                      </td>

                      <td className="px-6 py-4">
                        {moeda(cliente.ticketMedio)}
                      </td>

                      <td className="px-6 py-4">
                        {dataCurta(cliente.ultimaCompraEm)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            cliente.status
                          )}`}
                        >
                          {labelStatus(cliente.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
