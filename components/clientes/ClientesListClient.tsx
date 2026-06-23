"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Filter,
  RefreshCcw,
  Search,
  Trash2,
  User,
  UserX,
  Wallet,
} from "lucide-react";

type EstadoResumoConsentimentoCliente =
  | "AUTORIZADO"
  | "REVOGADO"
  | "NAO_REGISTRADO";

export type ClienteListItem = {
  id: string;
  codigo: string;
  nome: string;
  telefone: string;
  email: string | null;
  documento: string;
  tipoCliente: string;
  status: string;
  statusAntesLixeira: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  totalVendas: number;
  totalVendasAtivas: number;
  valorTotalComprado: number;
  consentimento: EstadoResumoConsentimentoCliente;
  cashbackSaldo?: number;
};

type ClientesListClientProps = {
  clientes: ClienteListItem[];
};

const STATUS_OPTIONS = [
  { value: "ATIVOS", label: "Ativos" },
  { value: "TODOS", label: "Todos" },
  { value: "NOVO", label: "Novo" },
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "NA_LIXEIRA", label: "Na lixeira" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
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

function statusIcon(status: string) {
  if (status === "NA_LIXEIRA") {
    return <Trash2 className="h-4 w-4" />;
  }

  if (status === "INATIVO") {
    return <UserX className="h-4 w-4" />;
  }

  return <CheckCircle2 className="h-4 w-4" />;
}

function consentimentoLabel(status: EstadoResumoConsentimentoCliente) {
  if (status === "AUTORIZADO") return "Contato autorizado";
  if (status === "REVOGADO") return "Revogado";

  return "Sem consentimento";
}

function consentimentoClass(status: EstadoResumoConsentimentoCliente) {
  if (status === "AUTORIZADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REVOGADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function ClientesListClient({
  clientes,
}: ClientesListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("ATIVOS");
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>(
    []
  );
  const [erroLixeira, setErroLixeira] = useState<string | null>(null);

  const clientesFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return clientes.filter((cliente) => {
      const statusCliente = cliente.status || "NOVO";

      if (statusSelecionado === "ATIVOS" && statusCliente === "NA_LIXEIRA") {
        return false;
      }

      if (
        statusSelecionado !== "ATIVOS" &&
        statusSelecionado !== "TODOS" &&
        statusCliente !== statusSelecionado
      ) {
        return false;
      }

      if (!termo) {
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
        ].join(" ")
      );

      return texto.includes(termo);
    });
  }, [busca, clientes, statusSelecionado]);

  const clientesSelecionaveis = useMemo(() => {
    return clientesFiltrados.filter(
      (cliente) => (cliente.status || "NOVO") !== "NA_LIXEIRA"
    );
  }, [clientesFiltrados]);

  const todosSelecionados =
    clientesSelecionaveis.length > 0 &&
    clientesSelecionaveis.every((cliente) =>
      clientesSelecionados.includes(cliente.id)
    );

  const quantidadeSelecionada = clientesSelecionados.length;

  const totalCompradoFiltrado = useMemo(() => {
    return clientesFiltrados.reduce(
      (total: number, cliente) => total + cliente.valorTotalComprado,
      0
    );
  }, [clientesFiltrados]);

  const totalCashbackFiltrado = useMemo(() => {
    return clientesFiltrados.reduce(
      (total: number, cliente) => total + Number(cliente.cashbackSaldo || 0),
      0
    );
  }, [clientesFiltrados]);

  function limparFiltros() {
    setBusca("");
    setStatusSelecionado("ATIVOS");
    setClientesSelecionados([]);
  }

  function alternarClienteSelecionado(clienteId: string) {
    setClientesSelecionados((selecionados) => {
      if (selecionados.includes(clienteId)) {
        return selecionados.filter((id) => id !== clienteId);
      }

      return [...selecionados, clienteId];
    });
  }

  function alternarTodosSelecionados() {
    if (todosSelecionados) {
      setClientesSelecionados([]);
      return;
    }

    setClientesSelecionados(clientesSelecionaveis.map((cliente) => cliente.id));
  }

  async function moverParaLixeira(cliente: ClienteListItem) {
    const confirmado = window.confirm(
      `Mover o cliente ${cliente.codigo} para a lixeira? Isso não apaga vendas antigas nem movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    const response = await fetch(`/api/clientes/${cliente.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "MOVER" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao mover cliente para a lixeira.");
      return;
    }

    setClientesSelecionados((selecionados) =>
      selecionados.filter((id) => id !== cliente.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverSelecionadosParaLixeira() {
    if (clientesSelecionados.length === 0) {
      return;
    }

    const confirmado = window.confirm(
      `Mover ${clientesSelecionados.length} cliente${
        clientesSelecionados.length > 1 ? "s" : ""
      } para a lixeira? Isso não apaga vendas antigas nem movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    for (const clienteId of clientesSelecionados) {
      const response = await fetch(`/api/clientes/${clienteId}/lixeira`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acao: "MOVER" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroLixeira(data.error || "Erro ao mover clientes para a lixeira.");
        return;
      }
    }

    setClientesSelecionados([]);

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarDaLixeira(cliente: ClienteListItem) {
    setErroLixeira(null);

    const response = await fetch(`/api/clientes/${cliente.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao restaurar cliente.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Clientes exibidos
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {clientesFiltrados.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Vendas ativas</p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {clientesFiltrados.reduce(
              (total: number, cliente) => total + cliente.totalVendasAtivas,
              0
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Total comprado</p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {moeda(totalCompradoFiltrado)}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-700" />

            <p className="text-sm font-medium text-blue-700">
              Cashback disponível
            </p>
          </div>

          <p className="mt-2 text-2xl font-bold text-blue-950">
            {moeda(totalCashbackFiltrado)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4" />
              Filtros
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Busque por código, nome, documento, telefone, e-mail ou tipo.
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

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Ex: C000001, nome, CPF/CNPJ, telefone..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>

            <select
              value={statusSelecionado}
              onChange={(event) => {
                setStatusSelecionado(event.target.value);
                setClientesSelecionados([]);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {erroLixeira && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {erroLixeira}
          </div>
        )}
      </div>

      {quantidadeSelecionada > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {quantidadeSelecionada} cliente
                {quantidadeSelecionada > 1
                  ? "s selecionados"
                  : " selecionado"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                A lixeira não apaga vendas antigas. Apenas oculta o cliente da
                visualização de ativos.
              </p>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={moverSelecionadosParaLixeira}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Enviar selecionados para lixeira
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Clientes cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Exibindo {clientesFiltrados.length} de {clientes.length} clientes.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={todosSelecionados}
              disabled={clientesSelecionaveis.length === 0}
              onChange={alternarTodosSelecionados}
              className="h-4 w-4 rounded border-slate-300"
            />
            Selecionar todos visíveis
          </label>
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1460px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-sm text-slate-600">
                  <th className="w-12 px-6 py-4"></th>
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">Documento</th>
                  <th className="px-6 py-4 font-semibold">Telefone</th>
                  <th className="px-6 py-4 font-semibold">E-mail</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Vendas</th>
                  <th className="px-6 py-4 font-semibold">Cashback</th>
                  <th className="px-6 py-4 font-semibold">Consentimento</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {clientesFiltrados.map((cliente) => {
                  const statusCliente = cliente.status || "NOVO";
                  const clienteNaLixeira = statusCliente === "NA_LIXEIRA";
                  const cashbackSaldo = Number(cliente.cashbackSaldo || 0);

                  return (
                    <tr key={cliente.id} className="text-sm text-slate-700">
                      <td className="w-12 px-6 py-4">
                        <input
                          type="checkbox"
                          checked={clientesSelecionados.includes(cliente.id)}
                          disabled={clienteNaLixeira}
                          onChange={() =>
                            alternarClienteSelecionado(cliente.id)
                          }
                          className="h-4 w-4 rounded border-slate-300"
                          aria-label={`Selecionar cliente ${cliente.codigo}`}
                        />
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-900">
                        {cliente.codigo}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span>{cliente.nome}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">{cliente.documento}</td>

                      <td className="px-6 py-4">{cliente.telefone}</td>

                      <td className="px-6 py-4">{cliente.email || "-"}</td>

                      <td className="px-6 py-4">{cliente.tipoCliente}</td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {cliente.totalVendasAtivas} ativa
                            {cliente.totalVendasAtivas === 1 ? "" : "s"}
                          </span>

                          <span className="text-xs text-slate-500">
                            {moeda(cliente.valorTotalComprado)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold ${
                              cashbackSaldo > 0
                                ? "text-blue-700"
                                : "text-slate-400"
                            }`}
                          >
                            {moeda(cashbackSaldo)}
                          </span>

                          <span className="text-xs text-slate-500">
                            disponível
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${consentimentoClass(
                            cliente.consentimento
                          )}`}
                        >
                          {consentimentoLabel(cliente.consentimento)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            statusCliente
                          )}`}
                        >
                          {statusIcon(statusCliente)}
                          {labelStatus(statusCliente)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {clienteNaLixeira ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => restaurarDaLixeira(cliente)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Restaurar
                            </button>
                          ) : (
                            <>
                              <Link
                                href={`/clientes/${cliente.id}/ficha`}
                                className="inline-flex items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                              >
                                <ClipboardList className="h-4 w-4" />
                                Ficha 360
                              </Link>

                              <Link
                                href={`/clientes/${cliente.id}`}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                Editar
                              </Link>

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => moverParaLixeira(cliente)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
