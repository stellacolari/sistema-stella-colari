"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Eye,
  Filter,
  Lightbulb,
  Megaphone,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  ShieldAlert,
  Search,
  XCircle,
} from "lucide-react";
import type {
  CopilotoAdministrativoData,
  EvidenciaCopilotoAdministrativo,
  EstadoImpactoCopilotoAdministrativo,
  GrupoCopilotoAdministrativo,
  PermissoesCopilotoAdministrativo,
  RecomendacaoCopilotoAdministrativo,
} from "@/lib/financeiro/copiloto-administrativo";

export type RecomendacaoGerencialResumo = {
  id: string;
  codigo: string;
  tipo: string;
  titulo: string;
  descricao: string;
  motivo: string | null;
  evidenciasJson: unknown;
  impactoEsperado: string | null;
  risco: string | null;
  prioridade: string;
  status: string;
  acaoSugerida: string | null;
  linkAcao: string | null;
  origem: string | null;
  origemTipo: string;
  origemId: string | null;
  produtoId: string | null;
  categoriaId: string | null;
  periodoReferencia: string | null;
  prazoSugerido: string | null;
  resultadoObservado: string | null;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  aceitaEm: string | null;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  ignoradaEm: string | null;
  adiadaEm: string | null;
  impactos?: RecomendacaoImpactoResumo[];
  campanhas?: CampanhaComercialResumo[];
};

export type RecomendacaoImpactoResumo = {
  id: string;
  recomendacaoId: string;
  janelaDias: number;
  statusImpacto: string;
  scoreImpacto: number;
  resumo: string;
  metricasAntesJson: unknown;
  metricasDepoisJson: unknown;
  comparativoJson: unknown;
  proximaAcaoSugerida: string | null;
  avaliadoEm: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type CampanhaComercialResumo = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  status: string;
  recomendacaoId: string | null;
};

type ResumoStatus = Record<string, number>;

type VitrineRecomendacaoResumo = {
  id: string;
  recomendacaoId: string | null;
  status: string;
  titulo: string;
};

type Props = {
  recomendacoes: RecomendacaoGerencialResumo[];
  resumo: ResumoStatus;
  tipos: string[];
  copiloto: CopilotoAdministrativoData;
  permissoes: PermissoesCopilotoAdministrativo;
  vitrines?: VitrineRecomendacaoResumo[];
  filtroInicial?: {
    status?: string;
    tipo?: string;
    prioridade?: string;
    produtoId?: string;
  };
};

const STATUS_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "NOVA", label: "Novas" },
  { value: "ACEITA", label: "Aceitas" },
  { value: "EM_EXECUCAO", label: "Em execucao" },
  { value: "CONCLUIDA", label: "Concluidas" },
  { value: "IGNORADA", label: "Ignoradas" },
  { value: "ADIADA", label: "Adiada" },
] as const;

const PRIORIDADE_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "CRITICA", label: "Critica" },
  { value: "ALTA", label: "Alta" },
  { value: "MEDIA", label: "Media" },
  { value: "BAIXA", label: "Baixa" },
] as const;

const GRUPO_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "FACA_HOJE", label: "Faca hoje" },
  { value: "ACOMPANHE", label: "Acompanhe" },
  { value: "NAO_MEXA_AINDA", label: "Nao mexa ainda" },
  { value: "BAIXA_EVIDENCIA", label: "Baixa evidencia" },
] as const;

const AREA_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "OPERACAO", label: "Operacao" },
  { value: "CATALOGO", label: "Catalogo" },
  { value: "MARKETING", label: "Marketing" },
  { value: "CRM", label: "CRM" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "SISTEMA", label: "Sistema" },
] as const;

const EVIDENCIA_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "FORTE", label: "Forte" },
  { value: "MODERADA", label: "Moderada" },
  { value: "FRACA", label: "Fraca" },
  { value: "SEM_EVIDENCIA", label: "Sem evidencia" },
] as const;

const IMPACTO_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "PENDENTE", label: "Impacto pendente" },
  { value: "SEM_ACAO_EXECUTADA", label: "Sem acao executada" },
  { value: "AINDA_CEDO", label: "Ainda cedo" },
  { value: "SEM_DADOS", label: "Sem dados" },
  { value: "POSITIVO", label: "Impacto positivo" },
  { value: "NEUTRO", label: "Impacto neutro" },
  { value: "NEGATIVO", label: "Impacto negativo" },
  { value: "INCONCLUSIVO", label: "Inconclusivo" },
  { value: "NAO_AVALIADO", label: "Nao avaliado" },
] as const;

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatus(status: string) {
  if (status === "NOVA") return "Nova";
  if (status === "ACEITA") return "Aceita";
  if (status === "EM_EXECUCAO") return "Em execucao";
  if (status === "CONCLUIDA") return "Concluida";
  if (status === "IGNORADA") return "Ignorada";
  if (status === "ADIADA") return "Adiada";
  return status.replaceAll("_", " ");
}

function statusClasses(status: string) {
  if (status === "NOVA") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "ACEITA") return "border-violet-200 bg-violet-50 text-violet-800";
  if (status === "EM_EXECUCAO") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "CONCLUIDA") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "IGNORADA") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-orange-200 bg-orange-50 text-orange-800";
}

function prioridadeClasses(prioridade: string) {
  if (prioridade === "CRITICA") return "border-rose-300 bg-rose-50 text-rose-900";
  if (prioridade === "ALTA") return "border-red-200 bg-red-50 text-red-800";
  if (prioridade === "MEDIA") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function labelPrioridade(prioridade: string) {
  if (prioridade === "CRITICA") return "Critica";
  if (prioridade === "ALTA") return "Alta";
  if (prioridade === "MEDIA") return "Media";
  if (prioridade === "BAIXA") return "Baixa";
  return prioridade.replaceAll("_", " ");
}

function labelGrupo(grupo: string) {
  return GRUPO_OPTIONS.find((item) => item.value === grupo)?.label || grupo.replaceAll("_", " ");
}

function grupoClasses(grupo: string) {
  if (grupo === "FACA_HOJE") return "border-red-200 bg-red-50 text-red-800";
  if (grupo === "ACOMPANHE") return "border-blue-200 bg-blue-50 text-blue-800";
  if (grupo === "NAO_MEXA_AINDA") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function labelClassificacao(classificacao: string) {
  if (classificacao === "RECOMENDACAO") return "Recomendacao";
  if (classificacao === "ALERTA") return "Alerta";
  if (classificacao === "OBSERVACAO") return "Observacao";
  if (classificacao === "NAO_RECOMENDAR") return "Nao recomendar";
  return classificacao.replaceAll("_", " ");
}

function classificacaoClasses(classificacao: string) {
  if (classificacao === "ALERTA") return "border-red-200 bg-red-50 text-red-800";
  if (classificacao === "RECOMENDACAO") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (classificacao === "OBSERVACAO") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function labelArea(area: string) {
  return AREA_OPTIONS.find((item) => item.value === area)?.label || area.replaceAll("_", " ");
}

function areaClasses(area: string) {
  if (area === "OPERACAO") return "border-red-200 bg-red-50 text-red-800";
  if (area === "CATALOGO") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (area === "MARKETING") return "border-violet-200 bg-violet-50 text-violet-800";
  if (area === "CRM") return "border-sky-200 bg-sky-50 text-sky-800";
  if (area === "FINANCEIRO") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function labelEvidencia(evidencia: EvidenciaCopilotoAdministrativo | string) {
  if (evidencia === "FORTE") return "Forte";
  if (evidencia === "MODERADA") return "Moderada";
  if (evidencia === "FRACA") return "Fraca";
  if (evidencia === "SEM_EVIDENCIA") return "Sem evidencia";
  return String(evidencia).replaceAll("_", " ");
}

function evidenciaClasses(evidencia: string) {
  if (evidencia === "FORTE") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (evidencia === "MODERADA") return "border-amber-200 bg-amber-50 text-amber-800";
  if (evidencia === "FRACA") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-slate-200 bg-white text-slate-500";
}

function labelImpacto(status: string) {
  if (status === "POSITIVO") return "Positivo";
  if (status === "PARCIAL") return "Parcial";
  if (status === "NEUTRO") return "Neutro";
  if (status === "NEGATIVO") return "Negativo";
  if (status === "INCONCLUSIVO") return "Inconclusivo";
  if (status === "AGUARDANDO_DADOS") return "Aguardando dados";
  if (status === "AINDA_CEDO") return "Ainda cedo";
  if (status === "SEM_DADOS") return "Sem dados";
  if (status === "SEM_ACAO_EXECUTADA") return "Sem acao executada";
  return status.replaceAll("_", " ");
}

function impactoClasses(status: string) {
  if (status === "POSITIVO") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "PARCIAL") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "NEUTRO") return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "NEGATIVO") return "border-red-200 bg-red-50 text-red-800";
  if (status === "AGUARDANDO_DADOS" || status === "AINDA_CEDO") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (status === "SEM_DADOS" || status === "SEM_ACAO_EXECUTADA") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-violet-200 bg-violet-50 text-violet-800";
}

function labelEstadoImpacto(estado: EstadoImpactoCopilotoAdministrativo | string) {
  if (estado === "NAO_AVALIADO") return "Impacto ainda nao avaliado";
  if (estado === "PENDENTE") return "Impacto pendente";
  if (estado === "AINDA_CEDO") return "Ainda cedo para avaliar";
  if (estado === "SEM_ACAO_EXECUTADA") return "Sem acao executada";
  if (estado === "SEM_DADOS") return "Sem dados suficientes";
  if (estado === "INCONCLUSIVO") return "Impacto inconclusivo";
  if (estado === "POSITIVO") return "Impacto positivo";
  if (estado === "NEUTRO") return "Impacto neutro";
  if (estado === "NEGATIVO") return "Impacto negativo";
  return String(estado).replaceAll("_", " ");
}

function estadoImpactoClasses(estado: EstadoImpactoCopilotoAdministrativo | string) {
  if (estado === "POSITIVO") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (estado === "NEGATIVO") return "border-red-200 bg-red-50 text-red-800";
  if (estado === "PENDENTE") return "border-amber-200 bg-amber-50 text-amber-800";
  if (estado === "AINDA_CEDO") return "border-blue-200 bg-blue-50 text-blue-800";
  if (estado === "SEM_DADOS" || estado === "INCONCLUSIVO") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  if (estado === "SEM_ACAO_EXECUTADA" || estado === "NAO_AVALIADO") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-slate-200 bg-white text-slate-600";
}

function labelTipo(tipo: string) {
  const labels: Record<string, string> = {
    FINANCEIRO: "Financeiro",
    CAIXA: "Caixa",
    PRO_LABORE: "Pro-labore",
    MARKETING: "Marketing",
    ESTOQUE: "Estoque",
    REPOSICAO: "Reposicao",
    PRECIFICACAO: "Precificacao",
    LOJA: "Loja",
    CRESCIMENTO: "Crescimento",
  };

  return labels[tipo] || tipo.replaceAll("_", " ");
}

function dataCurta(value: string | null) {
  if (!value) return "-";
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");
}

function evidenciasResumo(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .slice(0, 5)
    .map(([key, item]) => ({
      key,
      value:
        typeof item === "number"
          ? new Intl.NumberFormat("pt-BR", {
              maximumFractionDigits: 2,
            }).format(item)
          : String(item),
    }));
}

function evidenciasRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function selosEvidencia(value: unknown) {
  const evidencias = evidenciasRecord(value);
  const nivel = String(evidencias.nivelEvidencia || "");
  const selos: { label: string; className: string }[] = [];

  if (evidencias.sinalInicial) {
    selos.push({
      label: "Sinal inicial",
      className: "border-sky-200 bg-sky-50 text-sky-800",
    });
  }
  if (nivel === "EVIDENCIA_MODERADA") {
    selos.push({
      label: "Evidencia moderada",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    });
  }
  if (nivel === "EVIDENCIA_FORTE") {
    selos.push({
      label: "Evidencia forte",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    });
  }
  if (evidencias.amostraPequena) {
    selos.push({
      label: "Amostra pequena",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    });
  }
  if (evidencias.revalidada) {
    selos.push({
      label: "Revalidada",
      className: "border-indigo-200 bg-indigo-50 text-indigo-800",
    });
  }

  return selos;
}

function latestImpacto(recomendacao: RecomendacaoGerencialResumo) {
  return recomendacao.impactos?.[0] || null;
}

function latestCampanha(recomendacao: RecomendacaoGerencialResumo) {
  return recomendacao.campanhas?.[0] || null;
}

function metricasResumo(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => typeof item === "number")
    .slice(0, 4)
    .map(([key, item]) => ({
      key,
      value: new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 2,
      }).format(Number(item)),
    }));
}

function ResumoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default function RecomendacoesGerenciaisClient({
  tipos,
  copiloto,
  permissoes,
  vitrines = [],
  filtroInicial,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(filtroInicial?.status || "TODOS");
  const [tipo, setTipo] = useState(filtroInicial?.tipo || "TODOS");
  const [prioridade, setPrioridade] = useState(
    filtroInicial?.prioridade || "TODAS"
  );
  const [grupo, setGrupo] = useState<string>("TODOS");
  const [area, setArea] = useState("TODAS");
  const [evidencia, setEvidencia] = useState("TODAS");
  const [impactoFiltro, setImpactoFiltro] = useState("TODOS");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const resumoImpactos = copiloto.resumo.impactos;

  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return copiloto.itens.filter((item) => {
      const recomendacao = item.recomendacao;
      if (grupo !== "TODOS" && item.grupo !== grupo) return false;
      if (area !== "TODAS" && item.area !== area) return false;
      if (evidencia !== "TODAS" && item.evidencia !== evidencia) return false;
      if (impactoFiltro !== "TODOS" && item.estadoImpacto !== impactoFiltro) {
        return false;
      }
      if (status !== "TODOS" && recomendacao.status !== status) return false;
      if (tipo !== "TODOS" && recomendacao.tipo !== tipo) return false;
      if (
        prioridade !== "TODAS" &&
        item.prioridade !== prioridade &&
        !(prioridade === "ALTA" && item.prioridade === "CRITICA")
      ) {
        return false;
      }
      if (
        filtroInicial?.produtoId &&
        recomendacao.produtoId !== filtroInicial.produtoId
      ) {
        return false;
      }
      if (!termo) return true;

      return normalizarTexto(
        [
          recomendacao.codigo,
          recomendacao.tipo,
          recomendacao.status,
          recomendacao.prioridade,
          item.grupo,
          item.classificacao,
          item.area,
          item.evidencia,
          item.estadoImpacto,
          labelEstadoImpacto(item.estadoImpacto),
          item.impactoResumoExecutivo,
          recomendacao.titulo,
          recomendacao.descricao,
          item.motivo,
          item.acaoSugerida,
          recomendacao.origem,
          recomendacao.periodoReferencia,
        ].join(" ")
      ).includes(termo);
    });
  }, [
    area,
    busca,
    copiloto.itens,
    evidencia,
    filtroInicial?.produtoId,
    grupo,
    impactoFiltro,
    prioridade,
    status,
    tipo,
  ]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function gerarRecomendacoes() {
    setErro("");
    setMensagem("");

    const response = await fetch("/api/compras/recomendacoes/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel gerar recomendacoes.");
      return;
    }

    setMensagem(
      `${data.criadas?.length || 0} nova(s) e ${
        data.atualizadas?.length || 0
      } atualizada(s).`
    );
    refresh();
  }

  async function criarCampanha(recomendacao: RecomendacaoGerencialResumo) {
    setErro("");
    setMensagem("");

    const response = await fetch("/api/compras/campanhas/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recomendacaoId: recomendacao.id }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel criar campanha.");
      return;
    }

    setMensagem(data.criada ? "Campanha criada." : "Campanha ja existia.");
    refresh();
  }

  async function acionarRecomendacao(
    recomendacao: RecomendacaoGerencialResumo,
    acao: string
  ) {
    setErro("");
    setMensagem("");

    let observacao = "";
    let resultadoObservado = "";
    let prazoSugerido = "";

    if (acao === "CONCLUIR") {
      resultadoObservado =
        window.prompt("Qual foi o resultado observado?", "") || "";
    }

    if (acao === "IGNORAR") {
      observacao = window.prompt("Por que esta recomendacao sera ignorada?", "") || "";
    }

    if (acao === "ADIAR") {
      prazoSugerido =
        window.prompt("Prazo sugerido para retomar (AAAA-MM-DD):", "") || "";
      observacao = window.prompt("Observacao opcional:", "") || "";
    }

    const response = await fetch(
      `/api/compras/recomendacoes/${recomendacao.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao,
          observacao,
          resultadoObservado,
          prazoSugerido,
        }),
      }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel atualizar a recomendacao.");
      return;
    }

    setMensagem("Recomendacao atualizada.");
    refresh();
  }

  function limparFiltros() {
    setBusca("");
    setStatus("TODOS");
    setTipo("TODOS");
    setPrioridade("TODAS");
    setGrupo("TODOS");
    setArea("TODAS");
    setEvidencia("TODAS");
    setImpactoFiltro("TODOS");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Inteligencia de gestao
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Copiloto administrativo
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Recomendacoes explicadas, priorizadas e seguras para decisao.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {permissoes.podeExecutarRecomendacoes ? (
              <>
                <button
                  type="button"
                  onClick={gerarRecomendacoes}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Gerar recomendacoes
                </button>
              </>
            ) : (
              <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                <Eye className="h-4 w-4" />
                Modo leitura
              </span>
            )}
            <Link
              href="/compras"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 shadow-sm">
        Como a operacao ainda esta em fase inicial, produtos com poucas
        unidades podem gerar sinais positivos rapidos. O sistema agora
        diferencia sinal inicial de produto realmente validado, evitando
        alertas fortes sem confirmacao.
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600 shadow-sm">
        Impactos aparecem como estado de acompanhamento. Para calcular novos
        impactos com seguranca, use o script `npm run recomendacoes:impacto`
        primeiro em dry-run; a tela nao executa avaliacao automaticamente.
      </section>

      {(erro || mensagem) && (
        <div className="space-y-2">
          {erro && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}
          {mensagem && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {mensagem}
            </div>
          )}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard
          label="Faca hoje"
          value={copiloto.resumo.grupos.FACA_HOJE}
          description="Alta prioridade com acao manual clara."
        />
        <ResumoCard
          label="Acompanhe"
          value={copiloto.resumo.grupos.ACOMPANHE}
          description="Sinais uteis sem urgencia imediata."
        />
        <ResumoCard
          label="Nao mexa ainda"
          value={copiloto.resumo.grupos.NAO_MEXA_AINDA}
          description="Agir agora pode trazer mais risco que beneficio."
        />
        <ResumoCard
          label="Baixa evidencia"
          value={copiloto.resumo.grupos.BAIXA_EVIDENCIA}
          description="Sinais acompanhados, sem decisao ainda."
        />
        <ResumoCard
          label="Impactos pendentes"
          value={resumoImpactos.pendentes}
          description="Acoes executadas que pedem avaliacao."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard
          label="Impacto positivo"
          value={resumoImpactos.positivos}
          description="Recomendacoes com melhora clara."
        />
        <ResumoCard
          label="Sem dados"
          value={resumoImpactos.semDados + resumoImpactos.inconclusivos}
          description="Amostra insuficiente ou inconclusiva."
        />
        <ResumoCard
          label="Impacto negativo"
          value={resumoImpactos.negativos}
          description="Pedem revisao da premissa."
        />
        <ResumoCard
          label="Ainda cedo"
          value={resumoImpactos.aindaCedo}
          description="Janela ainda em andamento."
        />
        <ResumoCard
          label="Sem acao"
          value={resumoImpactos.semAcaoExecutada}
          description="Nao atribuir impacto ainda."
        />
      </section>

      <section className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-2 md:grid-cols-5">
          {GRUPO_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGrupo(option.value)}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                grupo === option.value
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  grupo === option.value
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {option.value === "TODOS"
                  ? copiloto.resumo.total
                  : copiloto.resumo.grupos[option.value as GrupoCopilotoAdministrativo]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_150px_150px_150px_170px_auto] xl:items-end">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Titulo, motivo, origem ou codigo"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <FiltroSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
          <FiltroSelect
            label="Tipo"
            value={tipo}
            onChange={setTipo}
            options={[
              { value: "TODOS", label: "Todos" },
              ...tipos.map((item) => ({ value: item, label: labelTipo(item) })),
            ]}
          />
          <FiltroSelect
            label="Prioridade"
            value={prioridade}
            onChange={setPrioridade}
            options={PRIORIDADE_OPTIONS}
          />
          <FiltroSelect
            label="Area"
            value={area}
            onChange={setArea}
            options={AREA_OPTIONS}
          />
          <FiltroSelect
            label="Evidencia"
            value={evidencia}
            onChange={setEvidencia}
            options={EVIDENCIA_OPTIONS}
          />
          <FiltroSelect
            label="Impacto"
            value={impactoFiltro}
            onChange={setImpactoFiltro}
            options={IMPACTO_OPTIONS}
          />

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {itensFiltrados.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
            Nenhuma acao recomendada agora.
          </div>
        ) : (
          itensFiltrados.map((item) => (
            <RecomendacaoCard
              key={item.id}
              copiloto={item}
              recomendacao={item.recomendacao}
              permissoes={permissoes}
              vitrine={vitrines.find((vitrine) => vitrine.recomendacaoId === item.id) || null}
              onAcao={acionarRecomendacao}
              onCriarCampanha={criarCampanha}
            />
          ))
        )}
      </section>
    </div>
  );
}

function RecomendacaoCard({
  copiloto,
  recomendacao,
  permissoes,
  vitrine,
  onAcao,
  onCriarCampanha,
}: {
  copiloto: RecomendacaoCopilotoAdministrativo;
  recomendacao: RecomendacaoGerencialResumo;
  permissoes: PermissoesCopilotoAdministrativo;
  vitrine: VitrineRecomendacaoResumo | null;
  onAcao: (recomendacao: RecomendacaoGerencialResumo, acao: string) => void;
  onCriarCampanha: (recomendacao: RecomendacaoGerencialResumo) => void;
}) {
  const impacto = latestImpacto(recomendacao);
  const campanha = latestCampanha(recomendacao);
  const evidencias = evidenciasRecord(recomendacao.evidenciasJson);
  const prioridadeVisual =
    recomendacao.prioridade === "ALTA" && (evidencias.sinalInicial || evidencias.amostraPequena)
      ? "MEDIA"
      : copiloto.prioridade;
  const podeCriarCampanha =
    permissoes.podeExecutarCampanhas &&
    permissoes.podeVerCampanhas &&
    !(evidencias.revalidada && (evidencias.sinalInicial || evidencias.amostraPequena)) &&
    !["SEM_EVIDENCIA", "EVIDENCIA_FRACA"].includes(String(evidencias.nivelEvidencia || ""));

  return (
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${grupoClasses(
                        copiloto.grupo
                      )}`}
                    >
                      {labelGrupo(copiloto.grupo)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${classificacaoClasses(
                        copiloto.classificacao
                      )}`}
                    >
                      {labelClassificacao(copiloto.classificacao)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(
                        recomendacao.status
                      )}`}
                    >
                      {labelStatus(recomendacao.status)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${prioridadeClasses(
                        prioridadeVisual
                      )}`}
                    >
                      Prioridade {labelPrioridade(prioridadeVisual)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${areaClasses(
                        copiloto.area
                      )}`}
                    >
                      {labelArea(copiloto.area)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${evidenciaClasses(
                        copiloto.evidencia
                      )}`}
                    >
                      Evidencia {labelEvidencia(copiloto.evidencia)}
                    </span>
                    {copiloto.confianca && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        Confianca {labelPrioridade(copiloto.confianca)}
                      </span>
                    )}
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      {labelTipo(recomendacao.tipo)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${estadoImpactoClasses(
                        copiloto.estadoImpacto
                      )}`}
                    >
                      {labelEstadoImpacto(copiloto.estadoImpacto)}
                    </span>
                    {recomendacao.periodoReferencia && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        {recomendacao.periodoReferencia}
                      </span>
                    )}
                    {selosEvidencia(recomendacao.evidenciasJson).map((selo) => (
                      <span
                        key={selo.label}
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${selo.className}`}
                      >
                        {selo.label}
                      </span>
                    ))}
                  </div>

                  <h2 className="mt-3 text-xl font-black text-slate-950">
                    {recomendacao.titulo}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                    {recomendacao.descricao}
                  </p>
                  {Boolean(evidencias.sinalInicial || evidencias.amostraPequena) && (
                    <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-sky-800">
                      Este produto tem sinal inicial positivo, mas ainda precisa
                      de confirmacao antes de uma recompra maior.
                    </p>
                  )}
                  {copiloto.grupo === "NAO_MEXA_AINDA" && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      <p className="flex items-center gap-2 font-bold text-slate-900">
                        <Ban className="h-4 w-4" />
                        Nao recomendo acao agora
                      </p>
                      <p className="mt-1">
                        {copiloto.motivoParaNaoRecomendar ||
                          "Observe novos dados antes de transformar este sinal em acao."}
                      </p>
                    </div>
                  )}
                  {copiloto.grupo === "BAIXA_EVIDENCIA" && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      <p className="flex items-center gap-2 font-bold">
                        <Eye className="h-4 w-4" />
                        Sinal acompanhado
                      </p>
                      <p className="mt-1">
                        Amostra pequena. Nao usar como decisao comercial ainda.
                      </p>
                    </div>
                  )}
                  {copiloto.dadosSensiveisOcultados && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                      <p className="flex items-center gap-2 font-bold text-slate-900">
                        <ShieldAlert className="h-4 w-4" />
                        Dados sensiveis ocultados
                      </p>
                      <p className="mt-1">
                        Custos, margens, caixa ou precificacao aparecem apenas
                        para perfis autorizados.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {permissoes.podeEditarRecomendacoes && recomendacao.status === "NOVA" && (
                    <AcaoButton
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      label="Aceitar"
                      onClick={() => onAcao(recomendacao, "ACEITAR")}
                    />
                  )}
                  {permissoes.podeEditarRecomendacoes &&
                    ["NOVA", "ACEITA", "ADIADA"].includes(
                      recomendacao.status
                    ) && (
                    <AcaoButton
                      icon={<PlayCircle className="h-4 w-4" />}
                      label="Iniciar"
                      onClick={() => onAcao(recomendacao, "INICIAR")}
                    />
                  )}
                  {permissoes.podeEditarRecomendacoes &&
                    recomendacao.status !== "CONCLUIDA" &&
                    recomendacao.status !== "IGNORADA" && (
                      <AcaoButton
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        label="Concluir"
                        onClick={() =>
                          onAcao(recomendacao, "CONCLUIR")
                        }
                      />
                    )}
                  {campanha && permissoes.podeVerCampanhas ? (
                    <Link
                      href="/compras/campanhas"
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Megaphone className="h-4 w-4" />
                      Ver campanha
                    </Link>
                  ) : (
                    ["NOVA", "ACEITA", "EM_EXECUCAO"].includes(
                      recomendacao.status
                    ) &&
                    podeCriarCampanha && (
                      <AcaoButton
                        icon={<Megaphone className="h-4 w-4" />}
                        label="Criar campanha"
                        variant="secondary"
                        onClick={() => onCriarCampanha(recomendacao)}
                      />
                    )
                  )}
                  {permissoes.podeEditarRecomendacoes &&
                    recomendacao.status !== "CONCLUIDA" &&
                    recomendacao.status !== "IGNORADA" && (
                      <AcaoButton
                        icon={<PauseCircle className="h-4 w-4" />}
                        label="Adiar"
                        variant="secondary"
                        onClick={() => onAcao(recomendacao, "ADIAR")}
                      />
                    )}
                  {permissoes.podeEditarRecomendacoes &&
                    recomendacao.status !== "CONCLUIDA" &&
                    recomendacao.status !== "IGNORADA" && (
                      <AcaoButton
                        icon={<XCircle className="h-4 w-4" />}
                        label="Ignorar"
                        variant="secondary"
                        onClick={() =>
                          onAcao(recomendacao, "IGNORAR")
                        }
                      />
                    )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-4">
                <InfoBox
                  label="Explicacao executiva"
                  value={copiloto.explicacaoExecutiva}
                />
                <InfoBox
                  label="Estado do impacto"
                  value={copiloto.impactoResumoExecutivo}
                />
                {copiloto.motivo && (
                  <InfoBox label="Motivo" value={copiloto.motivo} />
                )}
                {recomendacao.impactoEsperado && (
                  <InfoBox
                    label="Impacto esperado"
                    value={recomendacao.impactoEsperado}
                  />
                )}
                {recomendacao.risco && (
                  <InfoBox label="Risco" value={recomendacao.risco} />
                )}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_260px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Acao sugerida
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                    {copiloto.acaoSugerida || "Registrar decisao gerencial."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {permissoes.podeVerLoja && (
                      <Link
                        href={
                          vitrine
                            ? `/configuracoes/loja/vitrines-inteligentes?recomendacaoId=${recomendacao.id}`
                            : "/configuracoes/loja/vitrines-inteligentes"
                        }
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        {vitrine ? "Ver vitrine sugerida" : "Sugerir vitrine"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {copiloto.href && (
                      <Link
                        href={copiloto.href}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        {copiloto.cta || "Ir para acao"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <span className="inline-flex min-h-9 items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                      Origem: {recomendacao.origem || recomendacao.origemTipo}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-500">
                  <p className="font-bold uppercase tracking-wide">
                    Acompanhamento
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <Linha label="Criada" value={dataCurta(recomendacao.criadoEm)} />
                    <Linha
                      label="Atualizada"
                      value={dataCurta(recomendacao.atualizadoEm)}
                    />
                    <Linha
                      label="Prazo"
                      value={dataCurta(recomendacao.prazoSugerido)}
                    />
                    {recomendacao.resultadoObservado && (
                      <p className="pt-2 leading-5 text-slate-700">
                        {recomendacao.resultadoObservado}
                      </p>
                    )}
                    {recomendacao.observacao && (
                      <p className="pt-2 leading-5 text-slate-700">
                        {recomendacao.observacao}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {evidenciasResumo(recomendacao.evidenciasJson).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {evidenciasResumo(recomendacao.evidenciasJson).map((item) => (
                    <span
                      key={item.key}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500"
                    >
                      {item.key}: {item.value}
                    </span>
                  ))}
                </div>
              )}
              {!impacto && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Avaliacao de impacto
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                        {copiloto.impactoResumoExecutivo}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${estadoImpactoClasses(
                        copiloto.estadoImpacto
                      )}`}
                    >
                      {labelEstadoImpacto(copiloto.estadoImpacto)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Proxima acao:
                    </span>{" "}
                    {copiloto.impactoAcaoSugerida}
                  </p>
                </div>
              )}
              {impacto && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Avaliacao de impacto - {impacto.janelaDias} dias
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                        {impacto.resumo}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${impactoClasses(
                        impacto.statusImpacto
                      )}`}
                    >
                      {labelImpacto(impacto.statusImpacto)} - Score {impacto.scoreImpacto}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <ImpactoMetricasBox
                      title="Antes"
                      items={metricasResumo(impacto.metricasAntesJson)}
                    />
                    <ImpactoMetricasBox
                      title="Depois"
                      items={metricasResumo(impacto.metricasDepoisJson)}
                    />
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Proxima acao
                      </p>
                      <p className="mt-2 font-semibold text-slate-800">
                        {copiloto.impactoAcaoSugerida ||
                          impacto.proximaAcaoSugerida ||
                          "Acompanhar antes de escalar."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </article>
  );
}

function ImpactoMetricasBox({
  title,
  items,
}: {
  title: string;
  items: { key: string; value: string }[];
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.key} className="flex justify-between gap-3">
              <span>{item.key}</span>
              <span className="text-slate-900">{item.value}</span>
            </div>
          ))
        ) : (
          <p>Sem metrica numerica suficiente.</p>
        )}
      </div>
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
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

function AcaoButton({
  icon,
  label,
  variant = "primary",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  variant?: "primary" | "secondary";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition ${
        variant === "primary"
          ? "bg-slate-950 text-white hover:bg-slate-800"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}
