"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Edit,
  Filter,
  LayoutGrid,
  List,
  Plus,
  RefreshCcw,
  Search,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import ComprasListClient, {
  type CompraListItem,
} from "@/components/compras/ComprasListClient";

export type LancamentoFinanceiroListItem = {
  id: string;
  codigo: string;
  tipo: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  fornecedorParceiro: string | null;
  valorPrevisto: number | null;
  valorReal: number;
  statusPagamento: string;
  statusOperacional: string;
  dataCompetencia: string | null;
  dataVencimento: string | null;
  dataPagamento: string | null;
  recorrente: boolean;
  recorrencia: string | null;
  quantidadeParcelas: number | null;
  parcelaAtual: number | null;
  meioPagamento: string | null;
  origemTipo: string | null;
  origemId: string | null;
  observacoes: string | null;
  linkReferencia: string | null;
  anexoUrl: string | null;
  status: string;
  statusAntesLixeira: string | null;
  criadoEm: string;
};

type Props = {
  compras: CompraListItem[];
  lancamentos: LancamentoFinanceiroListItem[];
};

type AbaCompras =
  | "TODOS"
  | "COMPRAS_ESTOQUE"
  | "GASTOS_GERAIS"
  | "ASSINATURAS"
  | "COMPRAS_UNICAS"
  | "MARKETING"
  | "PERMUTAS"
  | "A_PAGAR"
  | "PAGOS";

type VisualizacaoGastos = "lista" | "cards" | "tabela";

type FormState = {
  id?: string;
  titulo: string;
  tipo: string;
  categoria: string;
  fornecedorParceiro: string;
  valorPrevisto: string;
  valorReal: string;
  dataCompetencia: string;
  dataVencimento: string;
  dataPagamento: string;
  statusPagamento: string;
  statusOperacional: string;
  meioPagamento: string;
  recorrente: boolean;
  recorrencia: string;
  quantidadeParcelas: string;
  parcelaAtual: string;
  observacoes: string;
  linkReferencia: string;
  descricao: string;
};

const PREFERENCIA_GASTOS_KEY = "stella:compras:gastos:visualizacao";

const ABAS: { value: AbaCompras; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "COMPRAS_ESTOQUE", label: "Compras de estoque" },
  { value: "GASTOS_GERAIS", label: "Gastos gerais" },
  { value: "ASSINATURAS", label: "Assinaturas" },
  { value: "COMPRAS_UNICAS", label: "Compras unicas" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PERMUTAS", label: "Permutas" },
  { value: "A_PAGAR", label: "A pagar" },
  { value: "PAGOS", label: "Pagos" },
];

const TIPOS = [
  { value: "COMPRA_EMBALAGEM_INSUMO", label: "Compra embalagem/insumo" },
  { value: "ASSINATURA", label: "Assinatura" },
  { value: "COMPRA_UNICA", label: "Compra unica" },
  { value: "INVESTIMENTO_ESTRUTURA", label: "Investimento estrutura" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TRAFEGO_PAGO", label: "Trafego pago" },
  { value: "INFLUENCIADOR", label: "Influenciador" },
  { value: "PERMUTA_PATROCINIO", label: "Permuta/patrocinio" },
  { value: "OUTRO", label: "Outro" },
];

const STATUS_PAGAMENTO = ["PENDENTE", "PAGO", "VENCIDO", "CANCELADO"];
const STATUS_OPERACIONAL = ["ATIVO", "PAUSADO", "CANCELADO"];
const VISUALIZACOES: {
  value: VisualizacaoGastos;
  label: string;
  icon: typeof List;
}[] = [
  { value: "lista", label: "Lista", icon: List },
  { value: "cards", label: "Cards", icon: LayoutGrid },
  { value: "tabela", label: "Tabela", icon: Table2 },
];

const FORM_INICIAL: FormState = {
  titulo: "",
  tipo: "ASSINATURA",
  categoria: "",
  fornecedorParceiro: "",
  valorPrevisto: "",
  valorReal: "",
  dataCompetencia: "",
  dataVencimento: "",
  dataPagamento: "",
  statusPagamento: "PENDENTE",
  statusOperacional: "ATIVO",
  meioPagamento: "",
  recorrente: true,
  recorrencia: "MENSAL",
  quantidadeParcelas: "",
  parcelaAtual: "",
  observacoes: "",
  linkReferencia: "",
  descricao: "",
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function dataCurta(dataIso: string | null) {
  if (!dataIso) return "-";

  const data = new Date(dataIso);
  return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");
}

function dataInput(dataIso: string | null) {
  if (!dataIso) return "";

  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "";

  return data.toISOString().slice(0, 10);
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelTipo(tipo: string) {
  return TIPOS.find((item) => item.value === tipo)?.label ?? tipo;
}

function statusPagamentoClass(status: string) {
  if (status === "PAGO") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "VENCIDO") return "border-red-200 bg-red-50 text-red-700";
  if (status === "CANCELADO") return "border-zinc-300 bg-zinc-100 text-zinc-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function dataBaseMes(lancamento: LancamentoFinanceiroListItem) {
  return (
    lancamento.dataCompetencia ||
    lancamento.dataVencimento ||
    lancamento.dataPagamento ||
    lancamento.criadoEm
  );
}

function mesmoMesAtual(dataIso: string | null) {
  if (!dataIso) return false;

  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return false;

  const agora = new Date();
  return (
    data.getFullYear() === agora.getFullYear() &&
    data.getMonth() === agora.getMonth()
  );
}

function lancamentoParaForm(lancamento: LancamentoFinanceiroListItem): FormState {
  return {
    id: lancamento.id,
    titulo: lancamento.titulo,
    tipo: lancamento.tipo,
    categoria: lancamento.categoria,
    fornecedorParceiro: lancamento.fornecedorParceiro ?? "",
    valorPrevisto: lancamento.valorPrevisto?.toString() ?? "",
    valorReal: lancamento.valorReal.toString(),
    dataCompetencia: dataInput(lancamento.dataCompetencia),
    dataVencimento: dataInput(lancamento.dataVencimento),
    dataPagamento: dataInput(lancamento.dataPagamento),
    statusPagamento: lancamento.statusPagamento,
    statusOperacional: lancamento.statusOperacional,
    meioPagamento: lancamento.meioPagamento ?? "",
    recorrente: lancamento.recorrente,
    recorrencia: lancamento.recorrencia ?? "",
    quantidadeParcelas: lancamento.quantidadeParcelas?.toString() ?? "",
    parcelaAtual: lancamento.parcelaAtual?.toString() ?? "",
    observacoes: lancamento.observacoes ?? "",
    linkReferencia: lancamento.linkReferencia ?? "",
    descricao: lancamento.descricao ?? "",
  };
}

function formParaPayload(form: FormState) {
  return {
    titulo: form.titulo,
    tipo: form.tipo,
    categoria: form.categoria,
    fornecedorParceiro: form.fornecedorParceiro,
    valorPrevisto: form.valorPrevisto,
    valorReal: form.valorReal,
    dataCompetencia: form.dataCompetencia,
    dataVencimento: form.dataVencimento,
    dataPagamento: form.dataPagamento,
    statusPagamento: form.statusPagamento,
    statusOperacional: form.statusOperacional,
    meioPagamento: form.meioPagamento,
    recorrente: form.recorrente,
    recorrencia: form.recorrencia,
    quantidadeParcelas: form.quantidadeParcelas,
    parcelaAtual: form.parcelaAtual,
    observacoes: form.observacoes,
    linkReferencia: form.linkReferencia,
    descricao: form.descricao,
  };
}

export default function ComprasEGastosClient({ compras, lancamentos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [abaAtiva, setAbaAtiva] = useState<AbaCompras>("TODOS");
  const [busca, setBusca] = useState("");
  const [visualizacao, setVisualizacao] =
    useState<VisualizacaoGastos>("lista");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const preferencia = window.localStorage.getItem(PREFERENCIA_GASTOS_KEY);

    if (
      preferencia === "lista" ||
      preferencia === "cards" ||
      preferencia === "tabela"
    ) {
      setVisualizacao(preferencia);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PREFERENCIA_GASTOS_KEY, visualizacao);
  }, [visualizacao]);

  const lancamentosAtivos = useMemo(() => {
    return lancamentos.filter((lancamento) => lancamento.status !== "NA_LIXEIRA");
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);

    return lancamentosAtivos.filter((lancamento) => {
      if (abaAtiva === "ASSINATURAS" && lancamento.tipo !== "ASSINATURA") {
        return false;
      }

      if (
        abaAtiva === "COMPRAS_UNICAS" &&
        !["COMPRA_UNICA", "INVESTIMENTO_ESTRUTURA"].includes(lancamento.tipo)
      ) {
        return false;
      }

      if (
        abaAtiva === "MARKETING" &&
        !["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"].includes(
          lancamento.tipo
        )
      ) {
        return false;
      }

      if (
        abaAtiva === "PERMUTAS" &&
        lancamento.tipo !== "PERMUTA_PATROCINIO"
      ) {
        return false;
      }

      if (
        abaAtiva === "A_PAGAR" &&
        !["PENDENTE", "VENCIDO"].includes(lancamento.statusPagamento)
      ) {
        return false;
      }

      if (abaAtiva === "PAGOS" && lancamento.statusPagamento !== "PAGO") {
        return false;
      }

      if (!buscaNormalizada) {
        return true;
      }

      const texto = normalizarTexto(
        [
          lancamento.codigo,
          lancamento.titulo,
          lancamento.tipo,
          lancamento.categoria,
          lancamento.fornecedorParceiro,
          lancamento.statusPagamento,
          lancamento.meioPagamento,
          lancamento.observacoes,
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [abaAtiva, busca, lancamentosAtivos]);

  const resumo = useMemo(() => {
    return lancamentosAtivos.reduce(
      (acc, lancamento) => {
        const noMes = mesmoMesAtual(dataBaseMes(lancamento));

        if (
          noMes &&
          ["PENDENTE", "VENCIDO"].includes(lancamento.statusPagamento)
        ) {
          acc.aPagarMes += lancamento.valorReal;
        }

        if (noMes && lancamento.statusPagamento === "PAGO") {
          acc.pagoMes += lancamento.valorReal;
        }

        if (
          lancamento.tipo === "ASSINATURA" &&
          lancamento.statusOperacional === "ATIVO" &&
          lancamento.statusPagamento !== "CANCELADO"
        ) {
          acc.assinaturasAtivas += 1;
        }

        if (
          noMes &&
          ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"].includes(
            lancamento.tipo
          )
        ) {
          acc.marketingMes += lancamento.valorReal;
        }

        if (
          lancamento.tipo === "PERMUTA_PATROCINIO" &&
          ["PENDENTE", "VENCIDO"].includes(lancamento.statusPagamento)
        ) {
          acc.permutasAbertas += 1;
        }

        return acc;
      },
      {
        aPagarMes: 0,
        pagoMes: 0,
        assinaturasAtivas: 0,
        marketingMes: 0,
        permutasAbertas: 0,
      }
    );
  }, [lancamentosAtivos]);

  const mostrarComprasEstoque =
    abaAtiva === "TODOS" || abaAtiva === "COMPRAS_ESTOQUE";
  const mostrarGastos =
    abaAtiva !== "COMPRAS_ESTOQUE" && lancamentosFiltrados.length >= 0;

  function atualizarForm<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function abrirNovoLancamento() {
    setForm(FORM_INICIAL);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(lancamento: LancamentoFinanceiroListItem) {
    setForm(lancamentoParaForm(lancamento));
    setErro(null);
    setModalAberto(true);
  }

  async function salvarLancamento() {
    setErro(null);

    const response = await fetch(
      form.id ? `/api/compras/gastos/${form.id}` : "/api/compras/gastos",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formParaPayload(form)),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao salvar lancamento.");
      return;
    }

    setModalAberto(false);

    startTransition(() => {
      router.refresh();
    });
  }

  async function marcarComoPago(lancamento: LancamentoFinanceiroListItem) {
    const payload = {
      ...formParaPayload(lancamentoParaForm(lancamento)),
      statusPagamento: "PAGO",
      dataPagamento: new Date().toISOString(),
    };

    const response = await fetch(`/api/compras/gastos/${lancamento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao marcar como pago.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverLancamentoParaLixeira(lancamento: LancamentoFinanceiroListItem) {
    const confirmado = window.confirm(
      `Mover ${lancamento.codigo} para a lixeira? Isso nao altera estoque.`
    );

    if (!confirmado) return;

    const response = await fetch(
      `/api/compras/gastos/${lancamento.id}/lixeira`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "MOVER" }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao mover lancamento para lixeira.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  function renderStatus(lancamento: LancamentoFinanceiroListItem) {
    return (
      <span
        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPagamentoClass(
          lancamento.statusPagamento
        )}`}
      >
        {lancamento.statusPagamento.replaceAll("_", " ")}
      </span>
    );
  }

  function renderAcoes(lancamento: LancamentoFinanceiroListItem) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {lancamento.statusPagamento !== "PAGO" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => marcarComoPago(lancamento)}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Pago
          </button>
        )}

        <button
          type="button"
          onClick={() => abrirEdicao(lancamento)}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Edit className="h-4 w-4" />
          Editar
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => moverLancamentoParaLixeira(lancamento)}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Lixeira
        </button>
      </div>
    );
  }

  function renderListaGastos() {
    if (lancamentosFiltrados.length === 0) {
      return (
        <div className="rounded-3xl bg-white px-6 py-10 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          Nenhum lancamento encontrado.
        </div>
      );
    }

    if (visualizacao === "cards") {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lancamentosFiltrados.map((lancamento) => (
            <article
              key={lancamento.id}
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {lancamento.titulo}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {lancamento.codigo} · {labelTipo(lancamento.tipo)}
                  </p>
                </div>
                {renderStatus(lancamento)}
              </div>

              <p className="mt-4 text-2xl font-bold text-slate-950">
                {moeda(lancamento.valorReal)}
              </p>

              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Categoria</span>
                  <span className="truncate font-medium">{lancamento.categoria}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Parceiro</span>
                  <span className="truncate font-medium">
                    {lancamento.fornecedorParceiro || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Vencimento</span>
                  <span className="font-medium">
                    {dataCurta(lancamento.dataVencimento)}
                  </span>
                </div>
              </div>

              <div className="mt-4">{renderAcoes(lancamento)}</div>
            </article>
          ))}
        </div>
      );
    }

    if (visualizacao === "tabela") {
      return (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-4 font-semibold">Codigo</th>
                <th className="px-5 py-4 font-semibold">Titulo</th>
                <th className="px-5 py-4 font-semibold">Tipo</th>
                <th className="px-5 py-4 font-semibold">Categoria</th>
                <th className="px-5 py-4 font-semibold">Vencimento</th>
                <th className="px-5 py-4 font-semibold">Pagamento</th>
                <th className="px-5 py-4 text-right font-semibold">Valor</th>
                <th className="px-5 py-4 text-right font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lancamentosFiltrados.map((lancamento) => (
                <tr key={lancamento.id}>
                  <td className="px-5 py-4 font-semibold text-slate-950">
                    {lancamento.codigo}
                  </td>
                  <td className="px-5 py-4">{lancamento.titulo}</td>
                  <td className="px-5 py-4">{labelTipo(lancamento.tipo)}</td>
                  <td className="px-5 py-4">{lancamento.categoria}</td>
                  <td className="px-5 py-4">
                    {dataCurta(lancamento.dataVencimento)}
                  </td>
                  <td className="px-5 py-4">{renderStatus(lancamento)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">
                    {moeda(lancamento.valorReal)}
                  </td>
                  <td className="px-5 py-4">{renderAcoes(lancamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        {lancamentosFiltrados.map((lancamento) => (
          <div
            key={lancamento.id}
            className="grid gap-3 px-4 py-3 text-sm text-slate-700 lg:grid-cols-[110px_minmax(180px,1.3fr)_minmax(140px,0.9fr)_minmax(110px,0.7fr)_minmax(120px,0.7fr)_auto] lg:items-center"
          >
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Codigo
              </span>
              <span className="font-semibold text-slate-950">
                {lancamento.codigo}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Lancamento
              </span>
              <span className="block truncate font-medium text-slate-950">
                {lancamento.titulo}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {labelTipo(lancamento.tipo)} · {lancamento.categoria}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Parceiro
              </span>
              <span className="truncate">
                {lancamento.fornecedorParceiro || "-"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:hidden">
                Vencimento
              </span>
              {dataCurta(lancamento.dataVencimento)}
            </div>
            <div>{renderStatus(lancamento)}</div>
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <span className="font-semibold text-slate-950">
                {moeda(lancamento.valorReal)}
              </span>
              {renderAcoes(lancamento)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compras
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Compras e Gastos
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Separe compras de estoque dos gastos financeiros sem alterar
              entrada, saida ou estorno de estoque.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={abrirNovoLancamento}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Novo lancamento
            </button>
            <Link
              href="/compras/nova-v2"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Nova compra de estoque
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard titulo="A pagar este mes" valor={moeda(resumo.aPagarMes)} />
        <ResumoCard titulo="Pago este mes" valor={moeda(resumo.pagoMes)} />
        <ResumoCard
          titulo="Assinaturas ativas"
          valor={resumo.assinaturasAtivas}
        />
        <ResumoCard titulo="Marketing do mes" valor={moeda(resumo.marketingMes)} />
        <ResumoCard titulo="Permutas em aberto" valor={resumo.permutasAbertas} />
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <div className="flex min-w-max gap-2">
          {ABAS.map((aba) => (
            <button
              key={aba.value}
              type="button"
              onClick={() => setAbaAtiva(aba.value)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                abaAtiva === aba.value
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>
      </div>

      {mostrarGastos && (
        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex min-w-0 flex-col gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Search className="h-4 w-4 text-slate-400" />
                    Buscar gastos
                  </span>
                  <input
                    type="text"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Codigo, titulo, parceiro, categoria..."
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:text-sm"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Limpar
                </button>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Filter className="h-4 w-4" />
                  Visualizacao
                </p>
                <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                  {VISUALIZACOES.map((item) => {
                    const Icon = item.icon;
                    const ativo = visualizacao === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setVisualizacao(item.value)}
                        className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition sm:flex-none ${
                          ativo
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {erro && (
              <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                {erro}
              </div>
            )}
          </div>

          {renderListaGastos()}
        </section>
      )}

      {mostrarComprasEstoque && (
        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Compras de estoque
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fluxo operacional atual preservado: compras entram no estoque e
              cancelamentos estornam estoque.
            </p>
          </div>
          <ComprasListClient compras={compras} />
        </section>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {form.id ? "Editar lancamento" : "Novo lancamento"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Gastos gerais
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <CampoSelect
                  label="Tipo"
                  value={form.tipo}
                  onChange={(value) => {
                    const assinatura = value === "ASSINATURA";
                    atualizarForm("tipo", value);
                    atualizarForm("recorrente", assinatura);
                    if (assinatura && !form.recorrencia) {
                      atualizarForm("recorrencia", "MENSAL");
                    }
                  }}
                  options={TIPOS}
                />
                <CampoTexto
                  label="Titulo"
                  value={form.titulo}
                  onChange={(value) => atualizarForm("titulo", value)}
                  placeholder="Ex: Canva Pro, camera, campanha Meta"
                />
                <CampoTexto
                  label="Categoria"
                  value={form.categoria}
                  onChange={(value) => atualizarForm("categoria", value)}
                  placeholder="Ex: software, equipamento, Meta Ads"
                />
                <CampoTexto
                  label="Fornecedor/parceiro"
                  value={form.fornecedorParceiro}
                  onChange={(value) =>
                    atualizarForm("fornecedorParceiro", value)
                  }
                  placeholder="Nome do fornecedor, influencer ou parceiro"
                />
                <CampoNumero
                  label="Valor previsto"
                  value={form.valorPrevisto}
                  onChange={(value) => atualizarForm("valorPrevisto", value)}
                />
                <CampoNumero
                  label="Valor real"
                  value={form.valorReal}
                  onChange={(value) => atualizarForm("valorReal", value)}
                />
                <CampoData
                  label="Data competencia"
                  value={form.dataCompetencia}
                  onChange={(value) => atualizarForm("dataCompetencia", value)}
                />
                <CampoData
                  label="Data vencimento"
                  value={form.dataVencimento}
                  onChange={(value) => atualizarForm("dataVencimento", value)}
                />
                <CampoSelect
                  label="Status pagamento"
                  value={form.statusPagamento}
                  onChange={(value) => atualizarForm("statusPagamento", value)}
                  options={STATUS_PAGAMENTO.map((status) => ({
                    value: status,
                    label: status,
                  }))}
                />
                <CampoData
                  label="Data pagamento"
                  value={form.dataPagamento}
                  onChange={(value) => atualizarForm("dataPagamento", value)}
                />
                <CampoSelect
                  label="Status operacional"
                  value={form.statusOperacional}
                  onChange={(value) => atualizarForm("statusOperacional", value)}
                  options={STATUS_OPERACIONAL.map((status) => ({
                    value: status,
                    label: status,
                  }))}
                />
                <CampoTexto
                  label="Forma de pagamento"
                  value={form.meioPagamento}
                  onChange={(value) => atualizarForm("meioPagamento", value)}
                  placeholder="Pix, boleto, cartao..."
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.recorrente}
                    onChange={(event) =>
                      atualizarForm("recorrente", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Lancamento recorrente
                </label>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <CampoSelect
                    label="Recorrencia"
                    value={form.recorrencia}
                    onChange={(value) => atualizarForm("recorrencia", value)}
                    options={[
                      { value: "", label: "Sem recorrencia" },
                      { value: "MENSAL", label: "Mensal" },
                      { value: "TRIMESTRAL", label: "Trimestral" },
                      { value: "ANUAL", label: "Anual" },
                    ]}
                  />
                  <CampoNumero
                    label="Quantidade parcelas"
                    value={form.quantidadeParcelas}
                    onChange={(value) =>
                      atualizarForm("quantidadeParcelas", value)
                    }
                  />
                  <CampoNumero
                    label="Parcela atual"
                    value={form.parcelaAtual}
                    onChange={(value) => atualizarForm("parcelaAtual", value)}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <CampoTexto
                  label="Descricao"
                  value={form.descricao}
                  onChange={(value) => atualizarForm("descricao", value)}
                  placeholder="Resumo curto do gasto ou investimento"
                />

                <CampoTexto
                  label="Link referencia"
                  value={form.linkReferencia}
                  onChange={(value) => atualizarForm("linkReferencia", value)}
                  placeholder="Perfil, post, contrato, nota ou referencia"
                />

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Observacoes
                  </span>
                  <textarea
                    value={form.observacoes}
                    onChange={(event) =>
                      atualizarForm("observacoes", event.target.value)
                    }
                    rows={4}
                    placeholder="Contrapartida, periodo da campanha, garantia, produtos cedidos..."
                    className="resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:text-sm"
                  />
                </label>
              </div>

              {erro && (
                <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarLancamento}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4" />
                  Salvar lancamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string | number;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{valor}</p>
    </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:text-sm"
      />
    </label>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-slate-400 sm:text-sm"
      />
    </label>
  );
}

function CampoData({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-slate-400 sm:text-sm"
      />
    </label>
  );
}

function CampoSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-slate-400 sm:text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
