"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Filter,
  Package,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import CompraItensClient from "@/components/compras/CompraItensClient";

export type CompraItemListItem = {
  id: string;
  tipoItem: string;
  codigoDigitado: string;
  descricao: string;
  quantidade: number;
  tamanhoAnel: string | null;
  valorUnitarioBase: number;
  valorUnitarioFinal: number;
  valorTotalBase: number;
  valorTotalFinal: number;
  parcelaFrete: number;
  valorTotalComFrete: number;
};

export type CompraListItem = {
  id: string;
  codigo: string;
  fornecedor: string;
  descontoPercentual: number;
  frete: number;
  valorTotalBruto: number;
  valorTotalFinal: number;
  observacoes: string | null;
  status: string;
  cancelamentoMotivo: string | null;
  cancelamentoObservacao: string | null;
  canceladoEm: string | null;
  criadoEm: string;
  itensTotais: number;
  quantidadeItens: number;
  itens: CompraItemListItem[];
};

type ComprasListClientProps = {
  compras: CompraListItem[];
};

const STATUS_OPTIONS = [
  { value: "ATIVOS", label: "Ativos" },
  { value: "TODOS", label: "Todos" },
  { value: "ATIVA", label: "Ativa" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "NA_LIXEIRA", label: "Na lixeira" },
];

const MOTIVOS_CANCELAMENTO = [
  { value: "", label: "Selecione um motivo" },
  { value: "ERRO_OPERACIONAL", label: "Erro operacional" },
  { value: "COMPRA_DUPLICADA", label: "Compra duplicada" },
  { value: "DADOS_INCORRETOS", label: "Dados incorretos" },
  { value: "FORNECEDOR_CANCELADO", label: "Fornecedor cancelou" },
  { value: "PRODUTOS_DEVOLVIDOS", label: "Produtos devolvidos" },
  { value: "TESTE_SISTEMA", label: "Teste do sistema" },
  { value: "OUTRO", label: "Outro" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function dataCurta(dataIso: string | null) {
  if (!dataIso) {
    return "-";
  }

  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleDateString("pt-BR");
}

function dataCompleta(dataIso: string | null) {
  if (!dataIso) {
    return "-";
  }

  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatus(status: string) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status.replaceAll("_", " ")
  );
}

function labelMotivo(motivo: string | null) {
  if (!motivo) {
    return "-";
  }

  return (
    MOTIVOS_CANCELAMENTO.find((option) => option.value === motivo)?.label ??
    motivo.replaceAll("_", " ")
  );
}

function statusClass(status: string) {
  if (status === "CANCELADA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "NA_LIXEIRA") {
    return "border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusIcon(status: string) {
  if (status === "CANCELADA") {
    return <Ban className="h-4 w-4" />;
  }

  if (status === "NA_LIXEIRA") {
    return <Trash2 className="h-4 w-4" />;
  }

  return <CheckCircle2 className="h-4 w-4" />;
}

function itemMeta(item: CompraItemListItem) {
  return [
    item.codigoDigitado,
    item.tipoItem,
    item.tamanhoAnel ? `Tam. ${item.tamanhoAnel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function itemNomeComTamanho(item: CompraItemListItem) {
  if (!item.tamanhoAnel) {
    return item.descricao;
  }

  return `${item.descricao} · Tam. ${item.tamanhoAnel}`;
}

function itensResumo(itens: CompraItemListItem[]) {
  if (itens.length === 0) {
    return "Sem itens";
  }

  if (itens.length === 1) {
    const item = itens[0];
    return `${itemNomeComTamanho(item)} (${item.quantidade} un.)`;
  }

  const primeiro = itens[0];
  const restantes = itens.length - 1;

  return `${itemNomeComTamanho(primeiro)} (${primeiro.quantidade} un.) + ${restantes} item${
    restantes > 1 ? "s" : ""
  }`;
}

function LinhaResumo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TabelaItensSomenteLeitura({ itens }: { itens: CompraItemListItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Item</th>
            <th className="px-5 py-3 font-semibold">Tipo</th>
            <th className="px-5 py-3 text-center font-semibold">Qtd.</th>
            <th className="px-5 py-3 text-right font-semibold">Unitário</th>
            <th className="px-5 py-3 text-right font-semibold">Total final</th>
            <th className="px-5 py-3 text-right font-semibold">Com frete</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {itens.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-950">
                    {item.descricao}
                  </span>
                  <span className="text-xs text-slate-500">
                    {itemMeta(item)}
                  </span>
                </div>
              </td>

              <td className="px-5 py-4 text-slate-700">{item.tipoItem}</td>

              <td className="px-5 py-4 text-center font-semibold text-slate-900">
                {item.quantidade}
              </td>

              <td className="px-5 py-4 text-right text-slate-700">
                {moeda(item.valorUnitarioFinal)}
              </td>

              <td className="px-5 py-4 text-right font-semibold text-slate-950">
                {moeda(item.valorTotalFinal)}
              </td>

              <td className="px-5 py-4 text-right text-slate-700">
                {moeda(item.valorTotalComFrete)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ComprasListClient({ compras }: ComprasListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("ATIVOS");
  const [compraSelecionada, setCompraSelecionada] =
    useState<CompraListItem | null>(null);
  const [compraParaCancelar, setCompraParaCancelar] =
    useState<CompraListItem | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [observacaoCancelamento, setObservacaoCancelamento] = useState("");
  const [erroCancelamento, setErroCancelamento] = useState<string | null>(null);
  const [erroLixeira, setErroLixeira] = useState<string | null>(null);
  const [comprasSelecionadas, setComprasSelecionadas] = useState<string[]>([]);

  const comprasFiltradas = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);

    return compras.filter((compra) => {
      if (statusSelecionado === "ATIVOS" && compra.status === "NA_LIXEIRA") {
        return false;
      }

      if (
        statusSelecionado !== "ATIVOS" &&
        statusSelecionado !== "TODOS" &&
        compra.status !== statusSelecionado
      ) {
        return false;
      }

      if (!buscaNormalizada) {
        return true;
      }

      const texto = normalizarTexto(
        [
          compra.codigo,
          compra.fornecedor,
          compra.status,
          ...compra.itens.map((item) =>
            [
              item.codigoDigitado,
              item.descricao,
              item.tipoItem,
              item.tamanhoAnel,
            ]
              .filter(Boolean)
              .join(" ")
          ),
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [busca, compras, statusSelecionado]);

  const totaisFiltrados = useMemo(() => {
    return comprasFiltradas.reduce(
      (acc, compra) => {
        acc.valorTotal += compra.valorTotalFinal;
        acc.quantidadeItens += compra.quantidadeItens;
        return acc;
      },
      {
        valorTotal: 0,
        quantidadeItens: 0,
      }
    );
  }, [comprasFiltradas]);

  const comprasSelecionaveis = useMemo(() => {
    return comprasFiltradas.filter((compra) => compra.status !== "NA_LIXEIRA");
  }, [comprasFiltradas]);

  const todasSelecionadas =
    comprasSelecionaveis.length > 0 &&
    comprasSelecionaveis.every((compra) =>
      comprasSelecionadas.includes(compra.id)
    );

  const quantidadeSelecionada = comprasSelecionadas.length;

  function limparFiltros() {
    setBusca("");
    setStatusSelecionado("ATIVOS");
    setComprasSelecionadas([]);
  }

  function alternarCompraSelecionada(compraId: string) {
    setComprasSelecionadas((selecionadas) => {
      if (selecionadas.includes(compraId)) {
        return selecionadas.filter((id) => id !== compraId);
      }

      return [...selecionadas, compraId];
    });
  }

  function alternarTodasSelecionadas() {
    if (todasSelecionadas) {
      setComprasSelecionadas([]);
      return;
    }

    setComprasSelecionadas(comprasSelecionaveis.map((compra) => compra.id));
  }

  function abrirCancelamento(compra: CompraListItem) {
    setCompraSelecionada(null);
    setCompraParaCancelar(compra);
    setMotivoCancelamento("");
    setObservacaoCancelamento("");
    setErroCancelamento(null);
  }

  function fecharCancelamento() {
    setCompraParaCancelar(null);
    setMotivoCancelamento("");
    setObservacaoCancelamento("");
    setErroCancelamento(null);
  }

  async function confirmarCancelamento() {
    if (!compraParaCancelar) {
      return;
    }

    if (!motivoCancelamento) {
      setErroCancelamento("Selecione um motivo para cancelar a compra.");
      return;
    }

    setErroCancelamento(null);

    const response = await fetch(
      `/api/compras/${compraParaCancelar.id}/cancelar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motivo: motivoCancelamento,
          observacao: observacaoCancelamento,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setErroCancelamento(data.error || "Erro ao cancelar compra.");
      return;
    }

    fecharCancelamento();

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverParaLixeira(compra: CompraListItem) {
    const confirmado = window.confirm(
      `Mover a compra ${compra.codigo} para a lixeira? Isso não altera estoque nem cancela a compra.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    const response = await fetch(`/api/compras/${compra.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "MOVER" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao mover compra para a lixeira.");
      return;
    }

    setComprasSelecionadas((selecionadas) =>
      selecionadas.filter((id) => id !== compra.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverSelecionadasParaLixeira() {
    if (comprasSelecionadas.length === 0) {
      return;
    }

    const confirmado = window.confirm(
      `Mover ${comprasSelecionadas.length} compra${
        comprasSelecionadas.length > 1 ? "s" : ""
      } para a lixeira? Isso não altera estoque nem cancela as compras.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    for (const compraId of comprasSelecionadas) {
      const response = await fetch(`/api/compras/${compraId}/lixeira`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acao: "MOVER" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroLixeira(data.error || "Erro ao mover compras para a lixeira.");
        return;
      }
    }

    setComprasSelecionadas([]);

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarDaLixeira(compra: CompraListItem) {
    setErroLixeira(null);

    const response = await fetch(`/api/compras/${compra.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao restaurar compra.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Compras exibidas</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {comprasFiltradas.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Quantidade de itens
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {totaisFiltrados.quantidadeItens}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Total comprado filtrado
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {moeda(totaisFiltrados.valorTotal)}
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
              Busque por código, fornecedor, item, tipo de item ou tamanho.
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

        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Ex: PC000001, fornecedor, produto, adicional, tamanho..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>

            <select
              value={statusSelecionado}
              onChange={(event) => {
                setStatusSelecionado(event.target.value);
                setComprasSelecionadas([]);
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
                {quantidadeSelecionada} compra
                {quantidadeSelecionada > 1
                  ? "s selecionadas"
                  : " selecionada"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                A ação de lixeira apenas oculta as compras da lista de ativos.
                Não altera estoque nem cria estorno.
              </p>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={moverSelecionadasParaLixeira}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Enviar selecionadas para lixeira
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Compras cadastradas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Exibindo {comprasFiltradas.length} de {compras.length} compras.
            Clique em uma compra para abrir o resumo.
          </p>
        </div>

        {comprasFiltradas.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Nenhuma compra encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1220px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-sm text-slate-600">
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={todasSelecionadas}
                      disabled={comprasSelecionaveis.length === 0}
                      onChange={alternarTodasSelecionadas}
                      className="h-4 w-4 rounded border-slate-300"
                      aria-label="Selecionar todas as compras visíveis"
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Fornecedor</th>
                  <th className="px-6 py-4 font-semibold">Itens comprados</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Itens totais
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Quantidade de itens
                  </th>
                  <th className="px-6 py-4 font-semibold">Total final</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Data</th>
                  <th className="px-6 py-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {comprasFiltradas.map((compra) => {
                  const compraCancelada = compra.status === "CANCELADA";
                  const compraNaLixeira = compra.status === "NA_LIXEIRA";

                  return (
                    <tr
                      key={compra.id}
                      onClick={() => setCompraSelecionada(compra)}
                      className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <td
                        className="w-12 px-6 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={comprasSelecionadas.includes(compra.id)}
                          disabled={compraNaLixeira}
                          onChange={() => alternarCompraSelecionada(compra.id)}
                          className="h-4 w-4 rounded border-slate-300"
                          aria-label={`Selecionar compra ${compra.codigo}`}
                        />
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-900">
                        {compra.codigo}
                      </td>

                      <td className="px-6 py-4">{compra.fornecedor}</td>

                      <td className="px-6 py-4">
                        <div className="flex max-w-[360px] items-start gap-2">
                          <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span className="line-clamp-2 text-sm text-slate-700">
                            {itensResumo(compra.itens)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {compra.itensTotais}
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {compra.quantidadeItens}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {moeda(compra.valorTotalFinal)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            compra.status
                          )}`}
                        >
                          {statusIcon(compra.status)}
                          {labelStatus(compra.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">{dataCurta(compra.criadoEm)}</td>

                      <td
                        className="px-6 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          {compraNaLixeira ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => restaurarDaLixeira(compra)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Restaurar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={isPending || compraCancelada}
                                onClick={() => abrirCancelamento(compra)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Ban className="h-4 w-4" />
                                Cancelar
                              </button>

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => moverParaLixeira(compra)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Lixeira
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

      {compraSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Resumo da compra
                </p>

                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {compraSelecionada.codigo}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {compraSelecionada.fornecedor} ·{" "}
                  {moeda(compraSelecionada.valorTotalFinal)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCompraSelecionada(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar resumo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                    compraSelecionada.status
                  )}`}
                >
                  {statusIcon(compraSelecionada.status)}
                  {labelStatus(compraSelecionada.status)}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <LinhaResumo
                  label="Fornecedor"
                  value={compraSelecionada.fornecedor}
                />

                <LinhaResumo
                  label="Data da compra"
                  value={dataCompleta(compraSelecionada.criadoEm)}
                />

                <LinhaResumo
                  label="Desconto"
                  value={`${String(compraSelecionada.descontoPercentual).replace(
                    ".",
                    ","
                  )}%`}
                />

                <LinhaResumo
                  label="Frete"
                  value={moeda(compraSelecionada.frete)}
                />

                <LinhaResumo
                  label="Itens totais"
                  value={compraSelecionada.itensTotais}
                />

                <LinhaResumo
                  label="Quantidade de itens"
                  value={compraSelecionada.quantidadeItens}
                />

                <LinhaResumo
                  label="Total bruto"
                  value={moeda(compraSelecionada.valorTotalBruto)}
                />

                <LinhaResumo
                  label="Total final"
                  value={moeda(compraSelecionada.valorTotalFinal)}
                />

                <LinhaResumo
                  label="Status"
                  value={labelStatus(compraSelecionada.status)}
                />
              </div>

              <div className="rounded-3xl border border-slate-200">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Itens comprados
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {compraSelecionada.status === "ATIVA"
                      ? "Adicione, exclua ou altere quantidades. Toda alteração ajusta estoque e gera movimentação."
                      : "Lista de produtos/adicionais, quantidades e valores desta compra."}
                  </p>
                </div>

                {compraSelecionada.status === "ATIVA" ? (
                  <CompraItensClient
                    compraId={compraSelecionada.id}
                    itens={compraSelecionada.itens}
                  />
                ) : (
                  <TabelaItensSomenteLeitura itens={compraSelecionada.itens} />
                )}
              </div>

              {compraSelecionada.observacoes && (
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Observações
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {compraSelecionada.observacoes}
                  </p>
                </div>
              )}

              {compraSelecionada.status === "CANCELADA" && (
                <div className="rounded-3xl bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    Compra cancelada
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <LinhaResumo
                      label="Motivo"
                      value={labelMotivo(compraSelecionada.cancelamentoMotivo)}
                    />

                    <LinhaResumo
                      label="Cancelado em"
                      value={dataCompleta(compraSelecionada.canceladoEm)}
                    />

                    <LinhaResumo
                      label="Observação"
                      value={compraSelecionada.cancelamentoObservacao ?? "-"}
                    />
                  </div>
                </div>
              )}

              {compraSelecionada.status === "NA_LIXEIRA" && (
                <div className="rounded-3xl bg-zinc-100 p-4">
                  <p className="text-sm font-semibold text-zinc-800">
                    Compra na lixeira
                  </p>

                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    Esta compra está oculta da visualização de ativos. Restaurar
                    a compra não altera estoque nem cria movimentações.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCompraSelecionada(null)}
                  className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {compraParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cancelamento de compra
                </p>

                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {compraParaCancelar.codigo}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {compraParaCancelar.fornecedor} ·{" "}
                  {moeda(compraParaCancelar.valorTotalFinal)}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharCancelamento}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Atenção
                </div>
                Ao confirmar, o sistema irá cancelar a compra, criar
                movimentações de estorno e remover do estoque os itens que
                entraram nesta compra.
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Motivo obrigatório
                </span>

                <select
                  value={motivoCancelamento}
                  onChange={(event) =>
                    setMotivoCancelamento(event.target.value)
                  }
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {MOTIVOS_CANCELAMENTO.map((motivo) => (
                    <option key={motivo.value} value={motivo.value}>
                      {motivo.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Observação opcional
                </span>

                <textarea
                  value={observacaoCancelamento}
                  onChange={(event) =>
                    setObservacaoCancelamento(event.target.value)
                  }
                  rows={4}
                  placeholder="Inclua detalhes adicionais, se necessário."
                  className="resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              {erroCancelamento && (
                <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                  {erroCancelamento}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharCancelamento}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={confirmarCancelamento}
                  disabled={isPending}
                  className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}