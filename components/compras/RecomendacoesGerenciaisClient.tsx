"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Lightbulb,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";

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
};

type ResumoStatus = Record<string, number>;

type Props = {
  recomendacoes: RecomendacaoGerencialResumo[];
  resumo: ResumoStatus;
  tipos: string[];
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
  { value: "ALTA", label: "Alta" },
  { value: "MEDIA", label: "Media" },
  { value: "BAIXA", label: "Baixa" },
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
  if (prioridade === "ALTA") return "border-red-200 bg-red-50 text-red-800";
  if (prioridade === "MEDIA") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
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
  recomendacoes,
  resumo,
  tipos,
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
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const recomendacoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return recomendacoes.filter((recomendacao) => {
      if (status !== "TODOS" && recomendacao.status !== status) return false;
      if (tipo !== "TODOS" && recomendacao.tipo !== tipo) return false;
      if (prioridade !== "TODAS" && recomendacao.prioridade !== prioridade) {
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
          recomendacao.titulo,
          recomendacao.descricao,
          recomendacao.motivo,
          recomendacao.acaoSugerida,
          recomendacao.origem,
          recomendacao.periodoReferencia,
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, filtroInicial?.produtoId, prioridade, recomendacoes, status, tipo]);

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
              Recomendacoes gerenciais
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe acoes sugeridas pela plataforma, aceite decisoes e
              registre execucao sem transformar isso em tarefa operacional.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={gerarRecomendacoes}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Gerar recomendacoes
            </button>
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
          label="Novas"
          value={resumo.NOVA || 0}
          description="Aguardam decisao gerencial."
        />
        <ResumoCard
          label="Aceitas"
          value={resumo.ACEITA || 0}
          description="Decisao aprovada, ainda sem execucao."
        />
        <ResumoCard
          label="Em execucao"
          value={resumo.EM_EXECUCAO || 0}
          description="Acoes em andamento."
        />
        <ResumoCard
          label="Concluidas"
          value={resumo.CONCLUIDA || 0}
          description="Com resultado observado."
        />
        <ResumoCard
          label="Ignoradas"
          value={resumo.IGNORADA || 0}
          description="Descartadas conscientemente."
        />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto] lg:items-end">
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
        {recomendacoesFiltradas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
            Nenhuma recomendacao encontrada para os filtros atuais.
          </div>
        ) : (
          recomendacoesFiltradas.map((recomendacao) => (
            <article
              key={recomendacao.id}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(
                        recomendacao.status
                      )}`}
                    >
                      {labelStatus(recomendacao.status)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${prioridadeClasses(
                        recomendacao.prioridade
                      )}`}
                    >
                      Prioridade {labelTipo(recomendacao.prioridade)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      {labelTipo(recomendacao.tipo)}
                    </span>
                    {recomendacao.periodoReferencia && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        {recomendacao.periodoReferencia}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 text-xl font-black text-slate-950">
                    {recomendacao.titulo}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                    {recomendacao.descricao}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {recomendacao.status === "NOVA" && (
                    <AcaoButton
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      label="Aceitar"
                      onClick={() => acionarRecomendacao(recomendacao, "ACEITAR")}
                    />
                  )}
                  {["NOVA", "ACEITA", "ADIADA"].includes(
                    recomendacao.status
                  ) && (
                    <AcaoButton
                      icon={<PlayCircle className="h-4 w-4" />}
                      label="Iniciar"
                      onClick={() => acionarRecomendacao(recomendacao, "INICIAR")}
                    />
                  )}
                  {recomendacao.status !== "CONCLUIDA" &&
                    recomendacao.status !== "IGNORADA" && (
                      <AcaoButton
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        label="Concluir"
                        onClick={() =>
                          acionarRecomendacao(recomendacao, "CONCLUIR")
                        }
                      />
                    )}
                  {recomendacao.status !== "CONCLUIDA" &&
                    recomendacao.status !== "IGNORADA" && (
                      <AcaoButton
                        icon={<PauseCircle className="h-4 w-4" />}
                        label="Adiar"
                        variant="secondary"
                        onClick={() => acionarRecomendacao(recomendacao, "ADIAR")}
                      />
                    )}
                  {recomendacao.status !== "CONCLUIDA" &&
                    recomendacao.status !== "IGNORADA" && (
                      <AcaoButton
                        icon={<XCircle className="h-4 w-4" />}
                        label="Ignorar"
                        variant="secondary"
                        onClick={() =>
                          acionarRecomendacao(recomendacao, "IGNORAR")
                        }
                      />
                    )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {recomendacao.motivo && (
                  <InfoBox label="Motivo" value={recomendacao.motivo} />
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
                    {recomendacao.acaoSugerida || "Registrar decisao gerencial."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recomendacao.linkAcao && (
                      <Link
                        href={recomendacao.linkAcao}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        Ir para acao
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
            </article>
          ))
        )}
      </section>
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
