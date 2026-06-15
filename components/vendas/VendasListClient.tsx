"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  Filter,
  LayoutGrid,
  List,
  PackageCheck,
  RefreshCcw,
  Search,
  Send,
  Table2,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VendaProdutoListItem = {
  id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  tamanhoAnel: string | null;
  valorUnitarioBase: number;
  valorUnitarioFinal: number;
  valorTotal: number;
  gastoProduto: number;
  gastoAdicionais: number;
  lucroTotal: number;
  categoria: string | null;
};

export type VendaListItem = {
  id: string;
  codigo: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteTelefone: string;
  clienteEmail: string | null;
  meioVenda: string;
  itensTotais: number;
  quantidadeItens: number;
  produtosVendidos: VendaProdutoListItem[];
  valorTotal: number;
  gastoTotal: number;
  lucroTotal: number;
  descontoPercentual: number;
  status: string;
  observacoes: string | null;
  criadoEm: string;
  cancelamentoMotivo: string | null;
  cancelamentoObservacao: string | null;
  canceladoEm: string | null;
};

type VendasListClientProps = {
  vendas: VendaListItem[];
};

type VisualizacaoVendas = "lista" | "cards" | "tabela";
type DensidadeVendas = "compacta" | "confortavel";

const PREFERENCIA_VENDAS_KEY = "stella:vendas:visualizacao";

const VISUALIZACAO_OPTIONS: {
  value: VisualizacaoVendas;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "lista", label: "Lista", icon: List },
  { value: "cards", label: "Cards", icon: LayoutGrid },
  { value: "tabela", label: "Tabela", icon: Table2 },
];

const DENSIDADE_OPTIONS: { value: DensidadeVendas; label: string }[] = [
  { value: "compacta", label: "Compacta" },
  { value: "confortavel", label: "Confortavel" },
];

const STATUS_OPTIONS = [
  { value: "ATIVOS", label: "Ativos" },
  { value: "TODOS", label: "Todos" },
  { value: "VENDA_FINALIZADA", label: "Venda finalizada" },
  { value: "EM_PREPARACAO", label: "Em preparação" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "NA_LIXEIRA", label: "Na lixeira" },
];

const STATUS_EDITAVEIS = [
  { value: "VENDA_FINALIZADA", label: "Venda finalizada" },
  { value: "EM_PREPARACAO", label: "Em preparação" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "ENTREGUE", label: "Entregue" },
];

const MOTIVOS_CANCELAMENTO = [
  { value: "", label: "Selecione um motivo" },
  { value: "DESISTENCIA_CLIENTE", label: "Desistência do cliente" },
  { value: "ERRO_OPERACIONAL", label: "Erro operacional" },
  { value: "DADOS_INCORRETOS", label: "Dados incorretos" },
  { value: "PRODUTO_INDISPONIVEL", label: "Produto indisponível" },
  { value: "PAGAMENTO_NAO_APROVADO", label: "Pagamento não aprovado" },
  { value: "VENDA_DUPLICADA", label: "Venda duplicada" },
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

function statusIcon(status: string) {
  if (status === "VENDA_FINALIZADA") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (status === "EM_PREPARACAO") {
    return <PackageCheck className="h-4 w-4" />;
  }

  if (status === "ENVIADA") {
    return <Send className="h-4 w-4" />;
  }

  if (status === "CANCELADA") {
    return <Ban className="h-4 w-4" />;
  }

  if (status === "NA_LIXEIRA") {
    return <Trash2 className="h-4 w-4" />;
  }

  return <CheckCircle2 className="h-4 w-4" />;
}

function produtoMeta(produto: VendaProdutoListItem) {
  return [
    produto.codigo,
    produto.categoria,
    produto.tamanhoAnel ? `Tam. ${produto.tamanhoAnel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function produtosResumo(produtos: VendaProdutoListItem[]) {
  if (produtos.length === 0) {
    return "Sem produtos";
  }

  if (produtos.length === 1) {
    const produto = produtos[0];
    const tamanho = produto.tamanhoAnel ? ` · Tam. ${produto.tamanhoAnel}` : "";
    return `${produto.nome}${tamanho} (${produto.quantidade} un.)`;
  }

  const primeiro = produtos[0];
  const restantes = produtos.length - 1;
  const tamanho = primeiro.tamanhoAnel ? ` · Tam. ${primeiro.tamanhoAnel}` : "";

  return `${primeiro.nome}${tamanho} (${primeiro.quantidade} un.) + ${restantes} item${
    restantes > 1 ? "s" : ""
  }`;
}

function pagamentoVenda() {
  return "-";
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

export default function VendasListClient({ vendas }: VendasListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("ATIVOS");
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaListItem | null>(
    null
  );
  const [vendaParaCancelar, setVendaParaCancelar] =
    useState<VendaListItem | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [observacaoCancelamento, setObservacaoCancelamento] = useState("");
  const [erroCancelamento, setErroCancelamento] = useState<string | null>(null);
  const [erroStatus, setErroStatus] = useState<string | null>(null);
  const [erroLixeira, setErroLixeira] = useState<string | null>(null);
  const [vendasSelecionadas, setVendasSelecionadas] = useState<string[]>([]);
  const [visualizacao, setVisualizacao] =
    useState<VisualizacaoVendas>("lista");
  const [densidade, setDensidade] = useState<DensidadeVendas>("compacta");
  const [preferenciasCarregadas, setPreferenciasCarregadas] = useState(false);
  const [meioSelecionado, setMeioSelecionado] = useState("TODOS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    try {
      const preferenciaSalva = window.localStorage.getItem(
        PREFERENCIA_VENDAS_KEY
      );

      if (preferenciaSalva) {
        const preferencia = JSON.parse(preferenciaSalva) as {
          visualizacao?: VisualizacaoVendas;
          densidade?: DensidadeVendas;
        };

        if (
          preferencia.visualizacao &&
          VISUALIZACAO_OPTIONS.some(
            (option) => option.value === preferencia.visualizacao
          )
        ) {
          setVisualizacao(preferencia.visualizacao);
        }

        if (
          preferencia.densidade &&
          DENSIDADE_OPTIONS.some(
            (option) => option.value === preferencia.densidade
          )
        ) {
          setDensidade(preferencia.densidade);
        }
      }
    } catch {
      window.localStorage.removeItem(PREFERENCIA_VENDAS_KEY);
    } finally {
      setPreferenciasCarregadas(true);
    }
  }, []);

  useEffect(() => {
    if (!preferenciasCarregadas) {
      return;
    }

    window.localStorage.setItem(
      PREFERENCIA_VENDAS_KEY,
      JSON.stringify({ visualizacao, densidade })
    );
  }, [densidade, preferenciasCarregadas, visualizacao]);

  const meiosVenda = useMemo(() => {
    return Array.from(new Set(vendas.map((venda) => venda.meioVenda)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [vendas]);

  const vendasFiltradas = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);
    const inicioTimestamp = dataInicio
      ? new Date(`${dataInicio}T00:00:00`).getTime()
      : null;
    const fimTimestamp = dataFim
      ? new Date(`${dataFim}T23:59:59`).getTime()
      : null;

    return vendas.filter((venda) => {
      if (statusSelecionado === "ATIVOS" && venda.status === "NA_LIXEIRA") {
        return false;
      }

      if (
        statusSelecionado !== "ATIVOS" &&
        statusSelecionado !== "TODOS" &&
        venda.status !== statusSelecionado
      ) {
        return false;
      }

      if (meioSelecionado !== "TODOS" && venda.meioVenda !== meioSelecionado) {
        return false;
      }

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

      if (!buscaNormalizada) {
        return true;
      }

      const texto = normalizarTexto(
        [
          venda.codigo,
          venda.clienteNome,
          venda.clienteDocumento,
          venda.meioVenda,
          venda.status,
          ...venda.produtosVendidos.map((produto) =>
            [
              produto.codigo,
              produto.nome,
              produto.categoria,
              produto.tamanhoAnel,
            ]
              .filter(Boolean)
              .join(" ")
          ),
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [
    busca,
    dataFim,
    dataInicio,
    meioSelecionado,
    statusSelecionado,
    vendas,
  ]);

  const totaisFiltrados = useMemo(() => {
    return vendasFiltradas.reduce(
      (acc, venda) => {
        acc.valorTotal += venda.valorTotal;
        acc.quantidadeItens += venda.quantidadeItens;
        acc.itensTotais += venda.itensTotais;
        return acc;
      },
      {
        valorTotal: 0,
        quantidadeItens: 0,
        itensTotais: 0,
      }
    );
  }, [vendasFiltradas]);

  const vendasSelecionaveis = useMemo(() => {
    return vendasFiltradas.filter((venda) => venda.status !== "NA_LIXEIRA");
  }, [vendasFiltradas]);

  const todasSelecionadas =
    vendasSelecionaveis.length > 0 &&
    vendasSelecionaveis.every((venda) => vendasSelecionadas.includes(venda.id));

  const quantidadeSelecionada = vendasSelecionadas.length;

  function limparFiltros() {
    setBusca("");
    setStatusSelecionado("ATIVOS");
    setMeioSelecionado("TODOS");
    setDataInicio("");
    setDataFim("");
    setVendasSelecionadas([]);
  }

  function alternarVendaSelecionada(vendaId: string) {
    setVendasSelecionadas((selecionadas) => {
      if (selecionadas.includes(vendaId)) {
        return selecionadas.filter((id) => id !== vendaId);
      }

      return [...selecionadas, vendaId];
    });
  }

  function alternarTodasSelecionadas() {
    if (todasSelecionadas) {
      setVendasSelecionadas([]);
      return;
    }

    setVendasSelecionadas(vendasSelecionaveis.map((venda) => venda.id));
  }

  async function alterarStatus(vendaId: string, status: string) {
    setErroStatus(null);
    setErroLixeira(null);

    const response = await fetch(`/api/vendas/${vendaId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroStatus(data.error || "Erro ao atualizar status.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  function abrirCancelamento(venda: VendaListItem) {
    setVendaSelecionada(null);
    setVendaParaCancelar(venda);
    setMotivoCancelamento("");
    setObservacaoCancelamento("");
    setErroCancelamento(null);
  }

  function fecharCancelamento() {
    setVendaParaCancelar(null);
    setMotivoCancelamento("");
    setObservacaoCancelamento("");
    setErroCancelamento(null);
  }

  async function confirmarCancelamento() {
    if (!vendaParaCancelar) {
      return;
    }

    if (!motivoCancelamento) {
      setErroCancelamento("Selecione um motivo para cancelar a venda.");
      return;
    }

    setErroCancelamento(null);

    const response = await fetch(
      `/api/vendas/${vendaParaCancelar.id}/cancelar`,
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
      setErroCancelamento(data.error || "Erro ao cancelar venda.");
      return;
    }

    fecharCancelamento();

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverParaLixeira(venda: VendaListItem) {
    const confirmado = window.confirm(
      `Mover a venda ${venda.codigo} para a lixeira? Isso não altera estoque nem cancela a venda.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);
    setErroStatus(null);

    const response = await fetch(`/api/vendas/${venda.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "MOVER" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao mover venda para a lixeira.");
      return;
    }

    setVendasSelecionadas((selecionadas) =>
      selecionadas.filter((id) => id !== venda.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverSelecionadasParaLixeira() {
    if (vendasSelecionadas.length === 0) {
      return;
    }

    const confirmado = window.confirm(
      `Mover ${vendasSelecionadas.length} venda${
        vendasSelecionadas.length > 1 ? "s" : ""
      } para a lixeira? Isso não altera estoque nem cancela as vendas.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);
    setErroStatus(null);

    for (const vendaId of vendasSelecionadas) {
      const response = await fetch(`/api/vendas/${vendaId}/lixeira`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acao: "MOVER" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroLixeira(data.error || "Erro ao mover vendas para a lixeira.");
        return;
      }
    }

    setVendasSelecionadas([]);

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarDaLixeira(venda: VendaListItem) {
    setErroLixeira(null);
    setErroStatus(null);

    const response = await fetch(`/api/vendas/${venda.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao restaurar venda.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  const compacto = densidade === "compacta";
  const cardPadding = compacto ? "p-3" : "p-4";
  const rowPadding = compacto ? "px-3 py-3" : "px-4 py-4";
  const rowGap = compacto ? "gap-2" : "gap-3";

  function renderStatusControl(venda: VendaListItem) {
    const vendaCancelada = venda.status === "CANCELADA";
    const vendaNaLixeira = venda.status === "NA_LIXEIRA";

    if (vendaCancelada || vendaNaLixeira) {
      return (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
              venda.status
            )}`}
          >
            {statusIcon(venda.status)}
            {labelStatus(venda.status)}
          </span>

          {vendaCancelada && (
            <span className="text-xs text-slate-500">
              {labelMotivo(venda.cancelamentoMotivo)}
            </span>
          )}
        </div>
      );
    }

    return (
      <select
        value={venda.status}
        disabled={isPending}
        onChange={(event) => alterarStatus(venda.id, event.target.value)}
        className={`h-9 max-w-full rounded-xl border px-2 text-xs font-semibold outline-none transition ${statusClass(
          venda.status
        )}`}
      >
        {STATUS_EDITAVEIS.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    );
  }

  function renderSelecao(venda: VendaListItem) {
    return (
      <input
        type="checkbox"
        checked={vendasSelecionadas.includes(venda.id)}
        disabled={venda.status === "NA_LIXEIRA"}
        onChange={() => alternarVendaSelecionada(venda.id)}
        className="h-4 w-4 rounded border-slate-300"
        aria-label={`Selecionar venda ${venda.codigo}`}
      />
    );
  }

  function renderAcoes(venda: VendaListItem) {
    const vendaCancelada = venda.status === "CANCELADA";
    const vendaNaLixeira = venda.status === "NA_LIXEIRA";

    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setVendaSelecionada(venda)}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Eye className="h-4 w-4" />
          Ver
        </button>

        {vendaNaLixeira ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => restaurarDaLixeira(venda)}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Restaurar
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={isPending || vendaCancelada}
              onClick={() => abrirCancelamento(venda)}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              Cancelar
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => moverParaLixeira(venda)}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Lixeira
            </button>
          </>
        )}
      </div>
    );
  }

  function renderListaCompacta() {
    return (
      <div className="divide-y divide-slate-100">
        {vendasFiltradas.map((venda) => (
          <div
            key={venda.id}
            onClick={() => setVendaSelecionada(venda)}
            className={`grid cursor-pointer ${rowGap} ${rowPadding} text-sm text-slate-700 transition hover:bg-slate-50 lg:grid-cols-[28px_minmax(95px,0.7fr)_minmax(150px,1.2fr)_minmax(120px,0.9fr)_minmax(130px,1fr)_minmax(86px,0.7fr)_minmax(105px,0.8fr)_auto] lg:items-center`}
          >
            <div onClick={(event) => event.stopPropagation()}>
              {renderSelecao(venda)}
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Venda
              </span>
              <span className="block truncate font-semibold text-slate-950">
                {venda.codigo}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Cliente
              </span>
              <span className="block truncate font-medium text-slate-900">
                {venda.clienteNome}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {venda.clienteDocumento}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Data / canal
              </span>
              <span className="block font-medium text-slate-900">
                {dataCurta(venda.criadoEm)}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {venda.meioVenda}
              </span>
            </div>

            <div
              className="min-w-0"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Status
              </span>
              {renderStatusControl(venda)}
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Pagamento
              </span>
              <span className="block truncate text-slate-600">
                {pagamentoVenda()}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Total
              </span>
              <span className="block font-semibold text-slate-950">
                {moeda(venda.valorTotal)}
              </span>
            </div>

            <div onClick={(event) => event.stopPropagation()}>
              {renderAcoes(venda)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderCards() {
    return (
      <div className={`grid ${compacto ? "gap-3" : "gap-4"} p-4 md:grid-cols-2 xl:grid-cols-3`}>
        {vendasFiltradas.map((venda) => (
          <article
            key={venda.id}
            className={`rounded-2xl border border-slate-200 bg-white ${cardPadding} shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {venda.clienteNome}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {venda.codigo} · {dataCurta(venda.criadoEm)}
                </p>
              </div>

              <div
                className="flex shrink-0 items-center gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                {renderSelecao(venda)}
              </div>
            </div>

            <div className={compacto ? "mt-3" : "mt-4"}>
              <p className="text-2xl font-bold text-slate-950">
                {moeda(venda.valorTotal)}
              </p>
            </div>

            <div
              className={`${compacto ? "mt-3 gap-2" : "mt-4 gap-3"} grid grid-cols-2 text-sm`}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Canal</p>
                <p className="truncate font-medium text-slate-800">
                  {venda.meioVenda}
                </p>
              </div>

              <div onClick={(event) => event.stopPropagation()}>
                <p className="text-xs font-medium text-slate-500">Status</p>
                <div className="mt-1">{renderStatusControl(venda)}</div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Itens</p>
                <p className="font-medium text-slate-800">
                  {venda.quantidadeItens} un. em {venda.itensTotais} item
                  {venda.itensTotais === 1 ? "" : "s"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Pagamento</p>
                <p className="font-medium text-slate-800">{pagamentoVenda()}</p>
              </div>
            </div>

            <div className={compacto ? "mt-3" : "mt-4"}>
              <p className="text-xs font-medium text-slate-500">
                Resumo de itens
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">
                {produtosResumo(venda.produtosVendidos)}
              </p>
            </div>

            <div
              className={`${compacto ? "mt-3" : "mt-4"}`}
              onClick={(event) => event.stopPropagation()}
            >
              {renderAcoes(venda)}
            </div>
          </article>
        ))}
      </div>
    );
  }

  function renderTabelaDetalhada() {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left">
          <thead className="bg-slate-50">
            <tr className="text-sm text-slate-600">
              <th className="w-12 px-4 py-4">
                <input
                  type="checkbox"
                  checked={todasSelecionadas}
                  disabled={vendasSelecionaveis.length === 0}
                  onChange={alternarTodasSelecionadas}
                  className="h-4 w-4 rounded border-slate-300"
                  aria-label="Selecionar todas as vendas visiveis"
                />
              </th>
              <th className="px-4 py-4 font-semibold">Venda</th>
              <th className="px-4 py-4 font-semibold">Data</th>
              <th className="px-4 py-4 font-semibold">Cliente</th>
              <th className="px-4 py-4 font-semibold">Canal</th>
              <th className="px-4 py-4 font-semibold">Itens</th>
              <th className="px-4 py-4 font-semibold">Pagamento</th>
              <th className="px-4 py-4 font-semibold">Total</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 text-right font-semibold">Acao</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {vendasFiltradas.map((venda) => (
              <tr
                key={venda.id}
                onClick={() => setVendaSelecionada(venda)}
                className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <td
                  className={rowPadding}
                  onClick={(event) => event.stopPropagation()}
                >
                  {renderSelecao(venda)}
                </td>
                <td className={`${rowPadding} font-semibold text-slate-950`}>
                  {venda.codigo}
                </td>
                <td className={rowPadding}>{dataCurta(venda.criadoEm)}</td>
                <td className={rowPadding}>
                  <div className="flex min-w-0 flex-col">
                    <span className="max-w-[220px] truncate font-medium text-slate-900">
                      {venda.clienteNome}
                    </span>
                    <span className="text-xs text-slate-500">
                      {venda.clienteDocumento}
                    </span>
                  </div>
                </td>
                <td className={rowPadding}>{venda.meioVenda}</td>
                <td className={rowPadding}>
                  <div className="flex max-w-[300px] items-start gap-2">
                    <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <span className="line-clamp-2 text-sm text-slate-700">
                        {produtosResumo(venda.produtosVendidos)}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {venda.quantidadeItens} un. · {venda.itensTotais} item
                        {venda.itensTotais === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={rowPadding}>{pagamentoVenda()}</td>
                <td className={`${rowPadding} font-semibold text-slate-950`}>
                  {moeda(venda.valorTotal)}
                </td>
                <td
                  className={rowPadding}
                  onClick={(event) => event.stopPropagation()}
                >
                  {renderStatusControl(venda)}
                </td>
                <td
                  className={rowPadding}
                  onClick={(event) => event.stopPropagation()}
                >
                  {renderAcoes(venda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Vendas exibidas</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {vendasFiltradas.length}
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
            Total vendido filtrado
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
              Busque por código, cliente, documento, meio de venda, produto ou
              tamanho.
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_170px_170px]">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Ex: PV000001, cliente, documento, produto, tamanho..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>

            <select
              value={statusSelecionado}
              onChange={(event) => {
                setStatusSelecionado(event.target.value);
                setVendasSelecionadas([]);
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

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Canal</span>

            <select
              value={meioSelecionado}
              onChange={(event) => {
                setMeioSelecionado(event.target.value);
                setVendasSelecionadas([]);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="TODOS">Todos</option>
              {meiosVenda.map((meio) => (
                <option key={meio} value={meio}>
                  {meio}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Inicio</span>

            <input
              type="date"
              value={dataInicio}
              onChange={(event) => {
                setDataInicio(event.target.value);
                setVendasSelecionadas([]);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Fim</span>

            <input
              type="date"
              value={dataFim}
              onChange={(event) => {
                setDataFim(event.target.value);
                setVendasSelecionadas([]);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
        </div>

        {erroStatus && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {erroStatus}
          </div>
        )}

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
                {quantidadeSelecionada} venda
                {quantidadeSelecionada > 1 ? "s selecionadas" : " selecionada"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                A ação de lixeira apenas oculta as vendas da lista de ativos.
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
            Vendas cadastradas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Exibindo {vendasFiltradas.length} de {vendas.length} vendas. Clique
            em uma venda para abrir o resumo.
          </p>

          <div className="mt-4 grid gap-3 xl:grid-cols-[auto_auto]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Visualizacao
              </p>
              <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                {VISUALIZACAO_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const ativo = visualizacao === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisualizacao(option.value)}
                      className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition sm:flex-none ${
                        ativo
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Densidade
              </p>
              <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                {DENSIDADE_OPTIONS.map((option) => {
                  const ativo = densidade === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDensidade(option.value)}
                      className={`min-h-9 flex-1 rounded-xl px-3 text-xs font-semibold transition sm:flex-none ${
                        ativo
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {visualizacao === "lista" && vendasFiltradas.length > 0 && (
            <div className="mt-4 hidden grid-cols-[28px_minmax(95px,0.7fr)_minmax(150px,1.2fr)_minmax(120px,0.9fr)_minmax(130px,1fr)_minmax(86px,0.7fr)_minmax(105px,0.8fr)_auto] gap-3 border-t border-slate-100 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <span />
              <span>Venda</span>
              <span>Cliente</span>
              <span>Data / canal</span>
              <span>Status</span>
              <span>Pagamento</span>
              <span>Total</span>
              <span className="text-right">Acao</span>
            </div>
          )}
        </div>

        {vendasFiltradas.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Nenhuma venda encontrada.
          </div>
        ) : visualizacao === "cards" ? (
          renderCards()
        ) : visualizacao === "tabela" ? (
          renderTabelaDetalhada()
        ) : (
          renderListaCompacta()
        )}

      </div>

      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Resumo da venda
                </p>

                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {vendaSelecionada.codigo}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {vendaSelecionada.clienteNome} ·{" "}
                  {moeda(vendaSelecionada.valorTotal)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setVendaSelecionada(null)}
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
                    vendaSelecionada.status
                  )}`}
                >
                  {statusIcon(vendaSelecionada.status)}
                  {labelStatus(vendaSelecionada.status)}
                </span>

                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {vendaSelecionada.meioVenda}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <LinhaResumo
                  label="Cliente"
                  value={vendaSelecionada.clienteNome}
                />

                <LinhaResumo
                  label="Documento"
                  value={vendaSelecionada.clienteDocumento}
                />

                <LinhaResumo
                  label="Telefone"
                  value={vendaSelecionada.clienteTelefone}
                />

                <LinhaResumo
                  label="E-mail"
                  value={vendaSelecionada.clienteEmail ?? "-"}
                />

                <LinhaResumo
                  label="Data da venda"
                  value={dataCompleta(vendaSelecionada.criadoEm)}
                />

                <LinhaResumo
                  label="Desconto aplicado"
                  value={`${vendaSelecionada.descontoPercentual}%`}
                />

                <LinhaResumo
                  label="Itens totais"
                  value={vendaSelecionada.itensTotais}
                />

                <LinhaResumo
                  label="Quantidade de itens"
                  value={vendaSelecionada.quantidadeItens}
                />

                <LinhaResumo
                  label="Meio de venda"
                  value={vendaSelecionada.meioVenda}
                />
              </div>

              <div className="rounded-3xl border border-slate-200">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Produtos vendidos
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Lista de produtos, quantidades e valores desta venda.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Produto</th>
                        <th className="px-5 py-3 text-center font-semibold">
                          Qtd.
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Unitário
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Total
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Gasto
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Lucro
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {vendaSelecionada.produtosVendidos.map((produto) => (
                        <tr key={produto.id}>
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-950">
                                {produto.nome}
                              </span>
                              <span className="text-xs text-slate-500">
                                {produtoMeta(produto)}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center font-semibold text-slate-900">
                            {produto.quantidade}
                          </td>

                          <td className="px-5 py-4 text-right text-slate-700">
                            {moeda(produto.valorUnitarioFinal)}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-950">
                            {moeda(produto.valorTotal)}
                          </td>

                          <td className="px-5 py-4 text-right text-slate-700">
                            {moeda(
                              produto.gastoProduto + produto.gastoAdicionais
                            )}
                          </td>

                          <td className="px-5 py-4 text-right text-slate-700">
                            {moeda(produto.lucroTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <LinhaResumo
                  label="Total da venda"
                  value={moeda(vendaSelecionada.valorTotal)}
                />

                <LinhaResumo
                  label="Gasto total"
                  value={moeda(vendaSelecionada.gastoTotal)}
                />

                <LinhaResumo
                  label="Lucro total"
                  value={moeda(vendaSelecionada.lucroTotal)}
                />
              </div>

              {vendaSelecionada.observacoes && (
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Observações
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {vendaSelecionada.observacoes}
                  </p>
                </div>
              )}

              {vendaSelecionada.status === "CANCELADA" && (
                <div className="rounded-3xl bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    Venda cancelada
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <LinhaResumo
                      label="Motivo"
                      value={labelMotivo(vendaSelecionada.cancelamentoMotivo)}
                    />

                    <LinhaResumo
                      label="Cancelado em"
                      value={dataCompleta(vendaSelecionada.canceladoEm)}
                    />

                    <LinhaResumo
                      label="Observação"
                      value={vendaSelecionada.cancelamentoObservacao ?? "-"}
                    />
                  </div>
                </div>
              )}

              {vendaSelecionada.status === "NA_LIXEIRA" && (
                <div className="rounded-3xl bg-zinc-100 p-4">
                  <p className="text-sm font-semibold text-zinc-800">
                    Venda na lixeira
                  </p>

                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    Esta venda está oculta da visualização de ativos. Restaurar
                    a venda não altera estoque nem cria movimentações.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setVendaSelecionada(null)}
                  className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {vendaParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cancelamento de venda
                </p>

                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {vendaParaCancelar.codigo}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {vendaParaCancelar.clienteNome} ·{" "}
                  {moeda(vendaParaCancelar.valorTotal)}
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
                Ao confirmar, o sistema irá cancelar a venda, criar uma
                movimentação de estorno e devolver ao estoque o produto
                principal e os adicionais consumidos.
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
