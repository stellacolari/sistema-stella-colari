"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Filter,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import ImageBox from "@/components/ui/ImageBox";

type ItemAdicionalStatus = "ATIVO" | "INATIVO" | "NA_LIXEIRA" | string;

type ItemAdicionalCatalogItem = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  imagemUrl?: string | null;
  fornecedorPadrao: string;
  custoBase: number;
  ativo: boolean;
  status: ItemAdicionalStatus;
  statusAntesLixeira?: string | null;
  linkCompra?: string | null;
  estoqueAtual: number;
  valorEstoque: number;
  totalRegras: number;
};

const STATUS_OPTIONS = [
  { value: "ATIVOS", label: "Ativos" },
  { value: "TODOS", label: "Todos" },
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "NA_LIXEIRA", label: "Na lixeira" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatus(status: string) {
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Inativo";
  if (status === "NA_LIXEIRA") return "Na lixeira";

  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "ATIVO") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "INATIVO") {
    return "bg-slate-200 text-slate-600";
  }

  if (status === "NA_LIXEIRA") {
    return "bg-zinc-200 text-zinc-700";
  }

  return "bg-slate-100 text-slate-700";
}

function statusIcon(status: string) {
  if (status === "ATIVO") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }

  if (status === "NA_LIXEIRA") {
    return <Trash2 className="h-3.5 w-3.5" />;
  }

  return <Archive className="h-3.5 w-3.5" />;
}

export default function ItensAdicionaisCatalogClient({
  itens,
}: {
  itens: ItemAdicionalCatalogItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("ATIVOS");
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [erroLixeira, setErroLixeira] = useState<string | null>(null);

  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return itens.filter((item) => {
      const statusItem = item.status || (item.ativo ? "ATIVO" : "INATIVO");

      if (statusSelecionado === "ATIVOS" && statusItem === "NA_LIXEIRA") {
        return false;
      }

      if (
        statusSelecionado !== "ATIVOS" &&
        statusSelecionado !== "TODOS" &&
        statusItem !== statusSelecionado
      ) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const texto = normalizarTexto(
        [
          item.nome,
          item.codigoInterno,
          item.codigoFornecedor,
          item.fornecedorPadrao,
          statusItem,
        ].join(" ")
      );

      return texto.includes(termo);
    });
  }, [busca, itens, statusSelecionado]);

  const itensSelecionaveis = useMemo(() => {
    return itensFiltrados.filter(
      (item) =>
        (item.status || (item.ativo ? "ATIVO" : "INATIVO")) !== "NA_LIXEIRA"
    );
  }, [itensFiltrados]);

  const todosSelecionados =
    itensSelecionaveis.length > 0 &&
    itensSelecionaveis.every((item) => itensSelecionados.includes(item.id));

  const quantidadeSelecionada = itensSelecionados.length;

  function limparFiltros() {
    setBusca("");
    setStatusSelecionado("ATIVOS");
    setItensSelecionados([]);
  }

  function alternarItemSelecionado(itemId: string) {
    setItensSelecionados((selecionados) => {
      if (selecionados.includes(itemId)) {
        return selecionados.filter((id) => id !== itemId);
      }

      return [...selecionados, itemId];
    });
  }

  function alternarTodosSelecionados() {
    if (todosSelecionados) {
      setItensSelecionados([]);
      return;
    }

    setItensSelecionados(itensSelecionaveis.map((item) => item.id));
  }

  async function moverParaLixeira(item: ItemAdicionalCatalogItem) {
    const confirmado = window.confirm(
      `Mover o item adicional ${item.codigoInterno} para a lixeira? Isso não apaga imagem, estoque, regras ou movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    const response = await fetch(`/api/itens-adicionais/${item.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "MOVER" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao mover item adicional para a lixeira.");
      return;
    }

    setItensSelecionados((selecionados) =>
      selecionados.filter((id) => id !== item.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverSelecionadosParaLixeira() {
    if (itensSelecionados.length === 0) {
      return;
    }

    const confirmado = window.confirm(
      `Mover ${itensSelecionados.length} item${
        itensSelecionados.length > 1 ? "s adicionais" : " adicional"
      } para a lixeira? Isso não apaga imagens, estoque, regras ou movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    for (const itemId of itensSelecionados) {
      const response = await fetch(`/api/itens-adicionais/${itemId}/lixeira`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acao: "MOVER" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroLixeira(
          data.error || "Erro ao mover itens adicionais para a lixeira."
        );
        return;
      }
    }

    setItensSelecionados([]);

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarDaLixeira(item: ItemAdicionalCatalogItem) {
    setErroLixeira(null);

    const response = await fetch(`/api/itens-adicionais/${item.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao restaurar item adicional.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Insumos e Embalagens
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Itens adicionais
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Cadastre insumos físicos controlados em estoque, como tags,
              cartelas, caixas, laços, papéis, sacos e garantias. Regras por
              categoria consomem esses itens por produto ou unidade.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/insumos-embalagens"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Voltar para central
            </Link>

            <Link
              href="/itens-adicionais/novo"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Novo item adicional
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Pesquisar
            </span>

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar por nome, código ou fornecedor"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4 text-slate-400" />
              Status
            </span>

            <select
              value={statusSelecionado}
              onChange={(event) => {
                setStatusSelecionado(event.target.value);
                setItensSelecionados([]);
              }}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limparFiltros}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </button>
          </div>
        </div>

        {erroLixeira && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {erroLixeira}
          </div>
        )}
      </div>

      {quantidadeSelecionada > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {quantidadeSelecionada} item
                {quantidadeSelecionada > 1
                  ? "s adicionais selecionados"
                  : " adicional selecionado"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                A lixeira não apaga imagens, estoque, regras ou movimentações.
                Apenas oculta os itens adicionais da visualização de ativos.
              </p>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={moverSelecionadosParaLixeira}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Enviar selecionados para lixeira
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {itensFiltrados.length} item
            {itensFiltrados.length === 1 ? "" : "s"} encontrado
            {itensFiltrados.length === 1 ? "" : "s"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Use os checkboxes dos cards para ações em lote.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={todosSelecionados}
            disabled={itensSelecionaveis.length === 0}
            onChange={alternarTodosSelecionados}
            className="h-4 w-4 rounded border-slate-300"
          />
          Selecionar todos visíveis
        </label>
      </div>

      {itensFiltrados.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          Nenhum item adicional encontrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {itensFiltrados.map((item) => {
            const statusItem = item.status || (item.ativo ? "ATIVO" : "INATIVO");
            const itemNaLixeira = statusItem === "NA_LIXEIRA";

            return (
              <div
                key={item.id}
                className={`relative flex h-full flex-col overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${
                  itemNaLixeira ? "opacity-75" : ""
                }`}
              >
                <div className="absolute left-4 top-4 z-10 rounded-xl bg-white/90 px-2 py-1 shadow-sm">
                  <input
                    type="checkbox"
                    checked={itensSelecionados.includes(item.id)}
                    disabled={itemNaLixeira}
                    onChange={() => alternarItemSelecionado(item.id)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Selecionar item adicional ${item.codigoInterno}`}
                  />
                </div>

                <ImageBox src={item.imagemUrl} alt={item.nome} />

                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {item.codigoInterno}
                      </p>

                      <h2 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">
                        {item.nome}
                      </h2>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(
                        statusItem
                      )}`}
                    >
                      {statusIcon(statusItem)}
                      {labelStatus(statusItem)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <Info label="Fornecedor" value={item.fornecedorPadrao} />
                    <Info label="Estoque" value={`${item.estoqueAtual} un.`} />
                    <Info
                      label="Valor estoque"
                      value={moeda(Number(item.valorEstoque))}
                    />
                    <Info
                      label="Custo"
                      value={moeda(Number(item.custoBase))}
                      destaque
                    />
                    <Info
                      label="Cód. fornecedor"
                      value={item.codigoFornecedor || "Não informado"}
                    />
                    <Info
                      label="Regras"
                      value={`${item.totalRegras} vínculo${
                        item.totalRegras === 1 ? "" : "s"
                      }`}
                    />
                  </div>

                  {item.linkCompra ? (
                    <a
                      href={item.linkCompra}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-4 transition hover:text-slate-900"
                    >
                      Ver link de compra
                    </a>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      Sem link de compra
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    {itemNaLixeira ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => restaurarDaLixeira(item)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Restaurar
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/itens-adicionais/${item.id}`}
                          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Editar
                        </Link>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => moverParaLixeira(item)}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Mover para lixeira"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  destaque = false,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <span
        className={`text-right ${
          destaque ? "text-sm font-bold" : "text-sm font-medium"
        } text-slate-900`}
      >
        {value}
      </span>
    </div>
  );
}
