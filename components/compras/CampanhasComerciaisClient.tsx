"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  PlayCircle,
  RefreshCcw,
  Search,
  Target,
  XCircle,
} from "lucide-react";

export type CampanhaComercialResumo = {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string;
  tipo: string;
  status: string;
  origem: string;
  recomendacaoId: string | null;
  produtoId: string | null;
  categoriaId: string | null;
  descricao: string;
  estrategia: string;
  publicoAlvo: string | null;
  canalPrincipal: string;
  canaisJson: unknown;
  produtosJson: unknown;
  acoesJson: unknown;
  metasJson: unknown;
  riscosJson: unknown;
  orcamentoSugerido: number | null;
  descontoSugerido: number | null;
  cupomSugerido: string | null;
  dataInicioSugerida: string | null;
  dataFimSugerida: string | null;
  resultadoJson: unknown;
  criadoEm: string;
  atualizadoEm: string;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
  recomendacao?: {
    id: string;
    codigo: string;
    titulo: string;
    status: string;
  } | null;
};

type PrecificacaoCampanhaResumo = {
  produtoId: string;
  descontoMaximoSeguroPct: number;
  descontoPermitido: boolean;
  classificacao: string;
  precoMinimoSeguro: number;
  margemBrutaPct: number;
};

type Props = {
  campanhas: CampanhaComercialResumo[];
  resumo: Record<string, number>;
  precificacoes?: PrecificacaoCampanhaResumo[];
  filtroInicial?: {
    status?: string;
    tipo?: string;
  };
};

const STATUS_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "PLANEJADA", label: "Planejada" },
  { value: "EM_EXECUCAO", label: "Em execucao" },
  { value: "CONCLUIDA", label: "Concluida" },
  { value: "CANCELADA", label: "Cancelada" },
] as const;

const TIPO_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "EXPOSICAO", label: "Exposicao" },
  { value: "VALIDACAO", label: "Validacao" },
  { value: "CONVERSAO", label: "Conversao" },
  { value: "GIRO_ESTOQUE", label: "Giro de estoque" },
  { value: "REPOSICAO", label: "Reposicao" },
  { value: "MARGEM", label: "Margem" },
  { value: "PRESENTE", label: "Presente" },
  { value: "SAZONAL", label: "Sazonal" },
  { value: "CUPOM_CONTROLADO", label: "Cupom controlado" },
  { value: "BUSCA_SEM_RESULTADO", label: "Busca sem resultado" },
] as const;

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelTipo(tipo: string) {
  return TIPO_OPTIONS.find((item) => item.value === tipo)?.label || tipo.replaceAll("_", " ");
}

function labelStatus(status: string) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status.replaceAll("_", " ");
}

function statusClasses(status: string) {
  if (status === "RASCUNHO") return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "PLANEJADA") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "EM_EXECUCAO") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "CONCLUIDA") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function tipoClasses(tipo: string) {
  if (["GIRO_ESTOQUE", "CUPOM_CONTROLADO"].includes(tipo)) {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }
  if (["MARGEM", "REPOSICAO"].includes(tipo)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (tipo === "BUSCA_SEM_RESULTADO") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function dataCurta(value: string | null) {
  if (!value) return "-";
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");
}

function moeda(value: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function arrayResumo(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((item) => {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return String(record.nome || record.codigo || record.produtoId || "Item planejado");
    }

    return String(item);
  });
}

function objectResumo(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .slice(0, 6)
    .map(([key, item]) => ({
      key,
      value: typeof item === "number" ? new Intl.NumberFormat("pt-BR").format(item) : String(item),
    }));
}

export default function CampanhasComerciaisClient({
  campanhas,
  resumo,
  precificacoes = [],
  filtroInicial,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(filtroInicial?.status || "TODOS");
  const [tipo, setTipo] = useState(filtroInicial?.tipo || "TODOS");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const campanhasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return campanhas.filter((campanha) => {
      if (status !== "TODOS" && campanha.status !== status) return false;
      if (tipo !== "TODOS" && campanha.tipo !== tipo) return false;
      if (!termo) return true;

      return normalizarTexto(
        [
          campanha.codigo,
          campanha.titulo,
          campanha.objetivo,
          campanha.tipo,
          campanha.status,
          campanha.origem,
          campanha.descricao,
          campanha.estrategia,
          campanha.canalPrincipal,
          campanha.recomendacao?.titulo,
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, campanhas, status, tipo]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function gerarCampanhas() {
    setErro("");
    setMensagem("");

    const response = await fetch("/api/compras/campanhas/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel gerar campanhas.");
      return;
    }

    setMensagem(
      `${data.criadas?.length || 0} campanha(s) criada(s); ${
        data.existentes?.length || 0
      } ja existiam.`
    );
    refresh();
  }

  async function atualizarCampanha(campanha: CampanhaComercialResumo, novoStatus: string) {
    setErro("");
    setMensagem("");

    let resultado: Record<string, string> | undefined;

    if (novoStatus === "CONCLUIDA") {
      const resumoResultado =
        window.prompt("Resultado observado da campanha:", "") || "";
      resultado = { resumo: resumoResultado };
    }

    const response = await fetch(`/api/compras/campanhas/${campanha.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus, resultado }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel atualizar campanha.");
      return;
    }

    setMensagem("Campanha atualizada.");
    refresh();
  }

  function limparFiltros() {
    setBusca("");
    setStatus("TODOS");
    setTipo("TODOS");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Inteligencia comercial
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Campanhas Comerciais
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Planeje acoes comerciais a partir das recomendacoes, intencao de
              compra e estoque, sempre como rascunho antes de qualquer
              publicacao na loja.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={gerarCampanhas}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Gerar campanhas inteligentes
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard label="Rascunhos" value={resumo.RASCUNHO || 0} description="Planos ainda nao aprovados." />
        <ResumoCard label="Planejadas" value={resumo.PLANEJADA || 0} description="Prontas para iniciar." />
        <ResumoCard label="Em execucao" value={resumo.EM_EXECUCAO || 0} description="Acoes acompanhadas." />
        <ResumoCard label="Concluidas" value={resumo.CONCLUIDA || 0} description="Com resultado registrado." />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_220px_auto] lg:items-end">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Titulo, objetivo, canal ou codigo"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <FiltroSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <FiltroSelect label="Tipo" value={tipo} onChange={setTipo} options={TIPO_OPTIONS} />

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
        {campanhasFiltradas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
            Nenhuma campanha encontrada para os filtros atuais.
          </div>
        ) : (
          campanhasFiltradas.map((campanha) => (
            <CampanhaCard
              key={campanha.id}
              campanha={campanha}
              precificacao={precificacaoCampanha(campanha, precificacoes)}
              onStatus={atualizarCampanha}
            />
          ))
        )}
      </section>
    </div>
  );
}

function CampanhaCard({
  campanha,
  precificacao,
  onStatus,
}: {
  campanha: CampanhaComercialResumo;
  precificacao: PrecificacaoCampanhaResumo | null;
  onStatus: (campanha: CampanhaComercialResumo, status: string) => void;
}) {
  const descontoSugerido = Number(campanha.descontoSugerido || 0);
  const descontoInseguro =
    Boolean(precificacao) &&
    descontoSugerido > 0 &&
    (!precificacao?.descontoPermitido ||
      descontoSugerido > Number(precificacao?.descontoMaximoSeguroPct || 0));

  return (
    <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(campanha.status)}`}>
              {labelStatus(campanha.status)}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tipoClasses(campanha.tipo)}`}>
              {labelTipo(campanha.tipo)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {campanha.codigo}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-black text-slate-950">{campanha.titulo}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            {campanha.objetivo}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {campanha.status === "RASCUNHO" && (
            <AcaoButton icon={<Target className="h-4 w-4" />} label="Planejar" onClick={() => onStatus(campanha, "PLANEJADA")} />
          )}
          {["RASCUNHO", "PLANEJADA"].includes(campanha.status) && (
            <AcaoButton icon={<PlayCircle className="h-4 w-4" />} label="Iniciar" onClick={() => onStatus(campanha, "EM_EXECUCAO")} />
          )}
          {campanha.status !== "CONCLUIDA" && campanha.status !== "CANCELADA" && (
            <AcaoButton icon={<CheckCircle2 className="h-4 w-4" />} label="Concluir" onClick={() => onStatus(campanha, "CONCLUIDA")} />
          )}
          {campanha.status !== "CONCLUIDA" && campanha.status !== "CANCELADA" && (
            <AcaoButton icon={<XCircle className="h-4 w-4" />} label="Cancelar" variant="secondary" onClick={() => onStatus(campanha, "CANCELADA")} />
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InfoBox label="Motivo" value={campanha.descricao} />
        <InfoBox label="Estrategia" value={campanha.estrategia} />
        <InfoBox label="Canal principal" value={campanha.canalPrincipal} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <ResumoMini title="Produtos envolvidos" items={arrayResumo(campanha.produtosJson).length ? arrayResumo(campanha.produtosJson) : ["Plano sem produto especifico"]} />
        <ResumoMini title="Acoes sugeridas" items={arrayResumo(campanha.acoesJson)} />
        <ResumoMini title="Riscos" items={arrayResumo(campanha.riscosJson)} />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Metas e limites
          </p>
          <div className="mt-2 space-y-1 text-xs font-semibold">
            {objectResumo(campanha.metasJson).map((item) => (
              <div key={item.key} className="flex justify-between gap-3">
                <span>{item.key}</span>
                <span className="text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs font-semibold">
            <div className="flex justify-between gap-3">
              <span>Orcamento</span>
              <span className="text-slate-900">{moeda(campanha.orcamentoSugerido)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Desconto</span>
              <span className="text-slate-900">{campanha.descontoSugerido || 0}%</span>
            </div>
            {campanha.cupomSugerido && (
              <div className="flex justify-between gap-3">
                <span>Cupom sugerido</span>
                <span className="text-slate-900">{campanha.cupomSugerido}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {precificacao && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            descontoInseguro
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide">
            Analise de desconto da campanha
          </p>
          <p className="mt-2 font-semibold leading-6">
            {descontoInseguro
              ? "Desconto sugerido compromete margem. Considere vitrine, combo ou conteudo organico."
              : `Desconto sugerido dentro do limite seguro de ${precificacao.descontoMaximoSeguroPct}%.`}
          </p>
          <p className="mt-1 text-xs leading-5">
            Classificacao: {precificacao.classificacao.replaceAll("_", " ").toLowerCase()} ·
            margem atual {precificacao.margemBrutaPct}% · minimo seguro{" "}
            {moeda(precificacao.precoMinimoSeguro)}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Inicio sugerido: {dataCurta(campanha.dataInicioSugerida)}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
          Fim sugerido: {dataCurta(campanha.dataFimSugerida)}
        </span>
        {campanha.recomendacao && (
          <Link
            href={`/compras/recomendacoes?produtoId=${campanha.produtoId || ""}`}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:bg-slate-50"
          >
            Recomendacao: {campanha.recomendacao.codigo}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
          Rascunho gerencial: nao publica loja, cupom ou builder.
        </span>
      </div>
    </article>
  );
}

function precificacaoCampanha(
  campanha: CampanhaComercialResumo,
  precificacoes: PrecificacaoCampanhaResumo[]
) {
  if (campanha.produtoId) {
    return (
      precificacoes.find((item) => item.produtoId === campanha.produtoId) || null
    );
  }

  const produtos = Array.isArray(campanha.produtosJson)
    ? campanha.produtosJson
    : [];
  const produtoId = produtos
    .map((item) =>
      item && typeof item === "object"
        ? String((item as Record<string, unknown>).produtoId || "")
        : ""
    )
    .find(Boolean);

  return produtoId
    ? precificacoes.find((item) => item.produtoId === produtoId) || null
    : null;
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

function ResumoMini({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-slate-700">
        {items.length > 0 ? (
          items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
        ) : (
          <li>Sem item definido.</li>
        )}
      </ul>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
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
