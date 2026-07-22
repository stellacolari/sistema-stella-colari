"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Eye,
  Filter,
  Layers,
  RefreshCcw,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";

type ProdutoSugestao = {
  produtoId?: string;
  id?: string;
  codigoInterno?: string;
  nome?: string;
  categoria?: string;
  imagemUrl?: string;
  estoqueTotal?: number;
  scoreInteresse?: number;
  margemBrutaPct?: number;
  classificacaoPrecificacao?: string;
};

type VitrineSugestao = {
  id: string;
  codigo: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  tipo: string;
  status: string;
  origem: string;
  campanhaId: string | null;
  recomendacaoId: string | null;
  produtoId: string | null;
  categoriaId: string | null;
  paginaDestinoId: string | null;
  blocoCriadoId: string | null;
  produtosJson: unknown;
  criteriosJson: unknown;
  configBlocoJson: unknown;
  metricasJson: unknown;
  justificativa: string | null;
  risco: string | null;
  acaoSugerida: string | null;
  criadoEm: string;
  atualizadoEm: string;
  aplicadaEm: string | null;
  ignoradaEm: string | null;
  canceladaEm: string | null;
  campanha?: { id: string; codigo: string; titulo: string; tipo: string; status: string } | null;
  recomendacao?: { id: string; codigo: string; titulo: string; status: string } | null;
  paginaDestino?: { id: string; titulo: string; slug: string; tipo: string } | null;
  blocoCriado?: { id: string; titulo: string | null; ativo: boolean } | null;
};

type LojaPaginaResumo = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  ativo: boolean;
  statusPublicacao: string;
};

type Props = {
  sugestoes: VitrineSugestao[];
  paginas: LojaPaginaResumo[];
  filtroInicial?: {
    campanhaId?: string;
    recomendacaoId?: string;
    produtoId?: string;
    status?: string;
    tipo?: string;
    origem?: string;
  };
};

const STATUS_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "SUGERIDA", label: "Sugeridas" },
  { value: "EM_REVISAO", label: "Em revisao" },
  { value: "APLICADA_COMO_RASCUNHO", label: "Aplicadas como rascunho" },
  { value: "IGNORADA", label: "Ignoradas" },
  { value: "CANCELADA", label: "Canceladas" },
] as const;

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatus(status: string) {
  return (
    STATUS_OPTIONS.find((item) => item.value === status)?.label ||
    status.replaceAll("_", " ")
  );
}

function labelTipo(tipo: string) {
  const labels: Record<string, string> = {
    PRODUTOS_POUCO_TESTADOS: "Produtos pouco testados",
    ALTA_INTENCAO: "Alta intencao",
    CAMPEOES_PROVAVEIS: "Campeoes provaveis",
    ESTOQUE_PARADO: "Estoque parado",
    CAMPANHA_COMERCIAL: "Campanha comercial",
    MARGEM_PROTEGIDA: "Margem protegida",
    BUSCA_RECORRENTE: "Busca recorrente",
    PRESENTES: "Presentes",
    NOVIDADES: "Novidades",
    GIRO_CONTROLADO: "Giro controlado",
  };

  return labels[tipo] || tipo.replaceAll("_", " ");
}

function statusClasses(status: string) {
  if (status === "SUGERIDA") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "EM_REVISAO") return "border-violet-200 bg-violet-50 text-violet-800";
  if (status === "APLICADA_COMO_RASCUNHO") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "IGNORADA") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function tipoClasses(tipo: string) {
  if (["MARGEM_PROTEGIDA", "CAMPEOES_PROVAVEIS"].includes(tipo)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (["ESTOQUE_PARADO", "GIRO_CONTROLADO"].includes(tipo)) {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }
  if (tipo === "BUSCA_RECORRENTE") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function dataCurta(value: string | null) {
  if (!value) return "-";
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");
}

function produtos(value: unknown): ProdutoSugestao[] {
  return Array.isArray(value) ? (value as ProdutoSugestao[]) : [];
}

function metricas(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .slice(0, 5)
    .map(([key, item]) => ({
      key,
      value:
        typeof item === "number"
          ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(item)
          : String(item),
    }));
}

function primeiraImagem(item: ProdutoSugestao) {
  return String(item.imagemUrl || "");
}

function ResumoCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

export default function VitrinesInteligentesClient({
  sugestoes,
  paginas,
  filtroInicial,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(filtroInicial?.status || "TODOS");
  const [tipo, setTipo] = useState(filtroInicial?.tipo || "TODOS");
  const [origem, setOrigem] = useState(filtroInicial?.origem || "TODOS");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [paginaDestinoId, setPaginaDestinoId] = useState(
    paginas.find((pagina) => pagina.tipo === "HOME" || pagina.slug === "home")?.id ||
      paginas[0]?.id ||
      ""
  );
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const tipos = useMemo(
    () => Array.from(new Set(sugestoes.map((sugestao) => sugestao.tipo))).sort(),
    [sugestoes]
  );
  const origens = useMemo(
    () => Array.from(new Set(sugestoes.map((sugestao) => sugestao.origem))).sort(),
    [sugestoes]
  );
  const sugestaoPreview = sugestoes.find((sugestao) => sugestao.id === previewId) || null;

  const resumo = useMemo(() => {
    return sugestoes.reduce(
      (acc, sugestao) => {
        acc.total += 1;
        acc.status[sugestao.status] = (acc.status[sugestao.status] || 0) + 1;
        acc.tipo[sugestao.tipo] = (acc.tipo[sugestao.tipo] || 0) + 1;
        return acc;
      },
      { total: 0, status: {} as Record<string, number>, tipo: {} as Record<string, number> }
    );
  }, [sugestoes]);

  const filtradas = useMemo(() => {
    const termo = normalizarTexto(busca);
    return sugestoes.filter((sugestao) => {
      if (status !== "TODOS" && sugestao.status !== status) return false;
      if (tipo !== "TODOS" && sugestao.tipo !== tipo) return false;
      if (origem !== "TODOS" && sugestao.origem !== origem) return false;
      if (filtroInicial?.campanhaId && sugestao.campanhaId !== filtroInicial.campanhaId) return false;
      if (
        filtroInicial?.recomendacaoId &&
        sugestao.recomendacaoId !== filtroInicial.recomendacaoId
      ) {
        return false;
      }
      if (filtroInicial?.produtoId && sugestao.produtoId !== filtroInicial.produtoId) return false;
      if (!termo) return true;
      return normalizarTexto(
        [
          sugestao.codigo,
          sugestao.titulo,
          sugestao.subtitulo,
          sugestao.tipo,
          sugestao.origem,
          sugestao.justificativa,
          sugestao.risco,
          sugestao.acaoSugerida,
          sugestao.campanha?.titulo,
          sugestao.recomendacao?.titulo,
          produtos(sugestao.produtosJson)
            .map((produto) => produto.nome)
            .join(" "),
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, filtroInicial, origem, status, sugestoes, tipo]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function gerar() {
    setErro("");
    setMensagem("");

    const response = await fetch("/api/configuracoes/loja/vitrines-inteligentes/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel gerar vitrines inteligentes.");
      return;
    }

    setMensagem(
      `${data.criadas?.length || 0} sugestao(oes) criada(s); ${
        data.atualizadas?.length || 0
      } atualizada(s).`
    );
    refresh();
  }

  async function atualizarStatus(sugestao: VitrineSugestao, novoStatus: string) {
    setErro("");
    setMensagem("");

    const response = await fetch(
      `/api/configuracoes/loja/vitrines-inteligentes/${sugestao.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel atualizar a sugestao.");
      return;
    }

    setMensagem("Status da sugestao atualizado.");
    refresh();
  }

  async function aplicar(sugestao: VitrineSugestao) {
    setErro("");
    setMensagem("");

    const response = await fetch(
      `/api/configuracoes/loja/vitrines-inteligentes/${sugestao.id}/aplicar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paginaDestinoId }),
      }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel aplicar como rascunho.");
      return;
    }

    setMensagem(data.mensagem || "Bloco criado como rascunho/inativo.");
    refresh();
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Conteúdo da Loja
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Vitrines Inteligentes
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Sugestões de vitrines para o conteúdo da loja com base em intenção,
              campanhas, estoque e margem. Nada e publicado automaticamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={gerar}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              Gerar vitrines inteligentes
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>

        {erro ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        ) : null}
        {mensagem ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {mensagem}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard label="Sugeridas" value={resumo.status.SUGERIDA || 0} helper="aguardando revisao" />
        <ResumoCard label="Rascunhos" value={resumo.status.APLICADA_COMO_RASCUNHO || 0} helper="blocos inativos criados" />
        <ResumoCard label="Ignoradas" value={resumo.status.IGNORADA || 0} helper="descartadas pela gestao" />
        <ResumoCard label="Tipos" value={Object.keys(resumo.tipo).length} helper={`${resumo.total} sugestao(oes) totais`} />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por titulo, produto, origem ou campanha"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <Select
            value={tipo}
            onChange={setTipo}
            options={[
              { value: "TODOS", label: "Todos os tipos" },
              ...tipos.map((item) => ({ value: item, label: labelTipo(item) })),
            ]}
          />
          <Select
            value={origem}
            onChange={setOrigem}
            options={[
              { value: "TODOS", label: "Todas as origens" },
              ...origens.map((item) => ({ value: item, label: item.replaceAll("_", " ") })),
            ]}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Filter className="h-4 w-4" />
          {filtradas.length} sugestao(oes) exibida(s)
        </div>
      </section>

      <section className="grid gap-4">
        {filtradas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Nenhuma sugestao encontrada para os filtros atuais.
          </div>
        ) : (
          filtradas.map((sugestao) => {
            const itens = produtos(sugestao.produtosJson);
            const aberta = ["SUGERIDA", "EM_REVISAO"].includes(sugestao.status);

            return (
              <article
                key={sugestao.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(sugestao.status)}`}>
                        {labelStatus(sugestao.status)}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tipoClasses(sugestao.tipo)}`}>
                        {labelTipo(sugestao.tipo)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {sugestao.origem.replaceAll("_", " ")}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-slate-950">
                      {sugestao.titulo}
                    </h2>
                    {sugestao.subtitulo ? (
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {sugestao.subtitulo}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {sugestao.codigo} · criada em {dataCurta(sugestao.criadoEm)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-wrap lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setPreviewId(sugestao.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      Pre-visualizar
                    </button>
                    {aberta ? (
                      <>
                        <button
                          type="button"
                          onClick={() => aplicar(sugestao)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          <Layers className="h-4 w-4" />
                          Aplicar como rascunho
                        </button>
                        <button
                          type="button"
                          onClick={() => atualizarStatus(sugestao, "IGNORADA")}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Ban className="h-4 w-4" />
                          Ignorar
                        </button>
                        <button
                          type="button"
                          onClick={() => atualizarStatus(sugestao, "CANCELADA")}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancelar
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Produtos sugeridos
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {itens.map((produto) => (
                        <div
                          key={produto.produtoId || produto.id || produto.nome}
                          className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                            {primeiraImagem(produto) ? (
                              <img
                                src={primeiraImagem(produto)}
                                alt={produto.nome || "Produto"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                                Sem foto
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {produto.nome || "Produto"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {produto.categoria || "-"} · estoque {produto.estoqueTotal ?? 0}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Interesse {produto.scoreInteresse ?? 0} · margem {produto.margemBrutaPct ?? 0}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Leitura da sugestao
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {sugestao.justificativa || sugestao.descricao || "-"}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-950">Risco</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {sugestao.risco || "-"}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      Acao sugerida
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {sugestao.acaoSugerida || "-"}
                    </p>

                    {sugestao.campanha ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Campanha: {sugestao.campanha.titulo}
                      </p>
                    ) : null}
                    {sugestao.recomendacao ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Recomendacao: {sugestao.recomendacao.titulo}
                      </p>
                    ) : null}
                    {sugestao.blocoCriado ? (
                      <p className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700">
                        Bloco criado inativo em {sugestao.paginaDestino?.titulo || "pagina"}.
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">
          Pagina destino para aplicar como rascunho
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          <select
            value={paginaDestinoId}
            onChange={(event) => setPaginaDestinoId(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 md:min-w-80"
          >
            {paginas.map((pagina) => (
              <option key={pagina.id} value={pagina.id}>
                {pagina.titulo} ({pagina.tipo}, {pagina.statusPublicacao})
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-500">
            O bloco nasce inativo e precisa ser revisado no editor antes de aparecer na loja.
          </p>
        </div>
      </section>

      {sugestaoPreview ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
          <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Previa da vitrine
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {sugestaoPreview.titulo}
                </h2>
                {sugestaoPreview.subtitulo ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {sugestaoPreview.subtitulo}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {produtos(sugestaoPreview.produtosJson).slice(0, 5).map((produto) => (
                <div key={produto.produtoId || produto.nome} className="min-w-0">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
                    {primeiraImagem(produto) ? (
                      <img
                        src={primeiraImagem(produto)}
                        alt={produto.nome || "Produto"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-300 text-xs font-semibold uppercase text-slate-400">
                        Imagem em breve
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-slate-950">
                    {produto.nome}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Ver peca</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">
                Metricas usadas
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {metricas(sugestaoPreview.metricasJson).map((item) => (
                  <span
                    key={item.key}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                  >
                    {item.key}: {item.value}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {sugestaoPreview.blocoCriadoId ? (
                <Link
                  href={`/configuracoes/loja/paginas/${sugestaoPreview.paginaDestinoId}/editor`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Abrir editor
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar previa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[] | readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
