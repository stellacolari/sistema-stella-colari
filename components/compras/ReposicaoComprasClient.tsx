"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PackagePlus, RefreshCcw, Search } from "lucide-react";

export type ReposicaoCompraItem = {
  id: string;
  cadastroId: string;
  tipo: "produto" | "adicional" | "embalagem";
  codigo: string;
  nome: string;
  detalhe: string;
  fornecedorPadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueIdeal: number;
  sugestaoCompra: number;
  linkCompra: string | null;
  tamanhoAnel: string | null;
};

type Props = {
  itens: ReposicaoCompraItem[];
};

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "produto", label: "Produtos / medidas" },
  { value: "adicional", label: "Itens adicionais" },
  { value: "embalagem", label: "Embalagens" },
] as const;

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelTipo(tipo: ReposicaoCompraItem["tipo"]) {
  if (tipo === "produto") return "Produto / medida";
  if (tipo === "embalagem") return "Embalagem";
  return "Item adicional";
}

function situacao(item: ReposicaoCompraItem) {
  if (item.estoqueAtual <= 0) {
    return {
      label: "Zerado",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Repor",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function compraHref(item: ReposicaoCompraItem) {
  const params = new URLSearchParams({
    itemTipo: item.tipo === "produto" ? "produto" : "adicional",
    itemId: item.cadastroId,
    quantidade: String(Math.max(item.sugestaoCompra, 1)),
  });

  if (item.tamanhoAnel && item.tamanhoAnel !== "UNICO") {
    params.set("tamanho", item.tamanhoAnel);
  }

  return `/compras/nova-v2?${params.toString()}`;
}

function ResumoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function ReposicaoComprasClient({ itens }: Props) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPO_OPTIONS)[number]["value"]>(
    "todos"
  );
  const [fornecedor, setFornecedor] = useState("");

  const fornecedores = useMemo(() => {
    return Array.from(new Set(itens.map((item) => item.fornecedorPadrao)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return itens.filter((item) => {
      if (tipo !== "todos" && item.tipo !== tipo) return false;
      if (fornecedor && item.fornecedorPadrao !== fornecedor) return false;

      if (!termo) return true;

      return normalizarTexto(
        [
          item.codigo,
          item.nome,
          item.detalhe,
          item.fornecedorPadrao,
          labelTipo(item.tipo),
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, fornecedor, itens, tipo]);

  const zerados = itens.filter((item) => item.estoqueAtual <= 0).length;
  const produtos = itens.filter((item) => item.tipo === "produto").length;
  const adicionais = itens.filter((item) => item.tipo === "adicional").length;
  const embalagens = itens.filter((item) => item.tipo === "embalagem").length;

  function limparFiltros() {
    setBusca("");
    setTipo("todos");
    setFornecedor("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compras de estoque
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Reposição / Comprar agora
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Itens com estoque baixo para reposição operacional. Esta visão
              leva para compra de estoque e não cria gasto financeiro.
            </p>
          </div>

          <Link
            href="/compras"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Voltar para central
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          label="Itens para repor"
          value={String(itens.length)}
          description="Estoque atual menor ou igual ao mínimo padrão."
        />
        <ResumoCard
          label="Zerados"
          value={String(zerados)}
          description="Itens com estoque atual igual a zero."
        />
        <ResumoCard
          label="Produtos / medidas"
          value={String(produtos)}
          description="Inclui variações por tamanho quando existirem."
        />
        <ResumoCard
          label="Adicionais / embalagens"
          value={String(adicionais + embalagens)}
          description={`${adicionais} adicionais e ${embalagens} embalagens.`}
        />
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto] lg:items-end">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Código, nome, fornecedor..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:text-sm"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Tipo</span>
            <select
              value={tipo}
              onChange={(event) =>
                setTipo(event.target.value as typeof tipo)
              }
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-slate-400 sm:text-sm"
            >
              {TIPO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Fornecedor
            </span>
            <select
              value={fornecedor}
              onChange={(event) => setFornecedor(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-slate-400 sm:text-sm"
            >
              <option value="">Todos</option>
              {fornecedores.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold">Item</th>
              <th className="px-5 py-4 font-semibold">Tipo</th>
              <th className="px-5 py-4 font-semibold">Estoque atual</th>
              <th className="px-5 py-4 font-semibold">Mínimo</th>
              <th className="px-5 py-4 font-semibold">Ideal</th>
              <th className="px-5 py-4 font-semibold">Sugestão</th>
              <th className="px-5 py-4 font-semibold">Fornecedor</th>
              <th className="px-5 py-4 text-right font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                  Nenhum item de reposição encontrado para os filtros atuais.
                </td>
              </tr>
            ) : (
              itensFiltrados.map((item) => {
                const status = situacao(item);

                return (
                  <tr key={item.id} className="text-slate-700">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-950">
                          {item.nome}
                        </span>
                        <span className="mt-1 text-xs text-slate-500">
                          {item.codigo} · {item.detalhe}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">{labelTipo(item.tipo)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {item.estoqueAtual} un. · {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">{item.estoqueMinimo} un.</td>
                    <td className="px-5 py-4">{item.estoqueIdeal} un.</td>
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {item.sugestaoCompra} un.
                    </td>
                    <td className="px-5 py-4">{item.fornecedorPadrao}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {item.linkCompra && (
                          <a
                            href={item.linkCompra}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Link
                          </a>
                        )}
                        <Link
                          href={compraHref(item)}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          <PackagePlus className="h-4 w-4" />
                          Adicionar à compra
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
