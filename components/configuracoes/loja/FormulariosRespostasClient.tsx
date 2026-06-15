"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Search,
  X,
} from "lucide-react";

export type FormularioRespostaItem = {
  id: string;

  paginaId: string | null;
  paginaTitulo: string | null;
  paginaSlug: string | null;
  paginaTipo: string | null;

  blocoId: string | null;
  blocoTipo: string | null;
  blocoTitulo: string | null;

  nome: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  mensagem: string | null;

  aceiteTermos: boolean;
  aceitaMarketing: boolean;

  status: string;
  origemUrl: string | null;
  observacaoInterna: string | null;

  criadoEm: string;
  atualizadoEm: string;
};

const STATUS_LEAD = [
  { value: "TODOS", label: "Todos" },
  { value: "NOVO", label: "Novo" },
  { value: "EM_ATENDIMENTO", label: "Em atendimento" },
  { value: "CONVERTIDO", label: "Convertido" },
  { value: "ARQUIVADO", label: "Arquivado" },
];

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dataCompleta(dataIso: string | null) {
  if (!dataIso) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataIso));
}

function statusLabel(status: string) {
  return STATUS_LEAD.find((item) => item.value === status)?.label || status;
}

function getStatusClass(status: string) {
  switch (status) {
    case "NOVO":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "EM_ATENDIMENTO":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "CONVERTIDO":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "ARQUIVADO":
      return "bg-slate-100 text-slate-500 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "NOVO":
      return Clock;
    case "EM_ATENDIMENTO":
      return MessageSquare;
    case "CONVERTIDO":
      return CheckCircle2;
    case "ARQUIVADO":
      return Archive;
    default:
      return Clock;
  }
}

function normalizarTelefoneWhatsApp(telefone: string | null) {
  const somenteNumeros = String(telefone ?? "").replace(/\D/g, "");

  if (!somenteNumeros) {
    return "";
  }

  if (somenteNumeros.startsWith("55")) {
    return somenteNumeros;
  }

  return `55${somenteNumeros}`;
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function FormulariosRespostasClient({
  respostas,
}: {
  respostas: FormularioRespostaItem[];
}) {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [respostaSelecionada, setRespostaSelecionada] =
    useState<FormularioRespostaItem | null>(null);

  const [observacaoInterna, setObservacaoInterna] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const respostasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return respostas.filter((resposta) => {
      const combinaBusca =
        !termo ||
        normalizarTexto(resposta.nome).includes(termo) ||
        normalizarTexto(resposta.telefone).includes(termo) ||
        normalizarTexto(resposta.email).includes(termo) ||
        normalizarTexto(resposta.cidade).includes(termo) ||
        normalizarTexto(resposta.mensagem).includes(termo) ||
        normalizarTexto(resposta.paginaTitulo).includes(termo) ||
        normalizarTexto(resposta.blocoTitulo).includes(termo);

      const combinaStatus =
        statusFiltro === "TODOS" || resposta.status === statusFiltro;

      return combinaBusca && combinaStatus;
    });
  }, [respostas, busca, statusFiltro]);

  const resumo = useMemo(() => {
    return {
      total: respostas.length,
      novos: respostas.filter((resposta) => resposta.status === "NOVO").length,
      atendimento: respostas.filter(
        (resposta) => resposta.status === "EM_ATENDIMENTO"
      ).length,
      convertidos: respostas.filter(
        (resposta) => resposta.status === "CONVERTIDO"
      ).length,
      arquivados: respostas.filter(
        (resposta) => resposta.status === "ARQUIVADO"
      ).length,
    };
  }, [respostas]);

  function abrirResposta(resposta: FormularioRespostaItem) {
    setRespostaSelecionada(resposta);
    setObservacaoInterna(resposta.observacaoInterna || "");
    setErro("");
    setSucesso("");
  }

  function fecharResposta() {
    setRespostaSelecionada(null);
    setObservacaoInterna("");
    setErro("");
    setSucesso("");
  }

  async function atualizarResposta(statusNovo?: string) {
    if (!respostaSelecionada) {
      return;
    }

    setErro("");
    setSucesso("");
    setSalvando(true);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/formularios/${respostaSelecionada.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: statusNovo || respostaSelecionada.status,
            observacaoInterna,
          }),
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao atualizar resposta.");
        return;
      }

      setSucesso("Resposta atualizada com sucesso.");
      router.refresh();

      setRespostaSelecionada((atual) =>
        atual
          ? {
              ...atual,
              status: statusNovo || atual.status,
              observacaoInterna,
            }
          : atual
      );
    } catch {
      setErro("Erro ao atualizar resposta.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirWhatsApp(resposta: FormularioRespostaItem) {
    const telefone = normalizarTelefoneWhatsApp(resposta.telefone);

    if (!telefone) {
      return;
    }

    const mensagem = [
      `Olá, ${resposta.nome || "tudo bem"}!`,
      "",
      "Recebemos seu contato pela Stella Colari e estamos retornando por aqui.",
    ].join("\n");

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(
      mensagem
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <button
          type="button"
          onClick={() => setStatusFiltro("TODOS")}
          className={`rounded-3xl border p-5 text-left shadow-sm transition ${
            statusFiltro === "TODOS"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Total
          </p>
          <p className="mt-2 text-3xl font-semibold">{resumo.total}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFiltro("NOVO")}
          className={`rounded-3xl border p-5 text-left shadow-sm transition ${
            statusFiltro === "NOVO"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Novos
          </p>
          <p className="mt-2 text-3xl font-semibold">{resumo.novos}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFiltro("EM_ATENDIMENTO")}
          className={`rounded-3xl border p-5 text-left shadow-sm transition ${
            statusFiltro === "EM_ATENDIMENTO"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Atendimento
          </p>
          <p className="mt-2 text-3xl font-semibold">{resumo.atendimento}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFiltro("CONVERTIDO")}
          className={`rounded-3xl border p-5 text-left shadow-sm transition ${
            statusFiltro === "CONVERTIDO"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Convertidos
          </p>
          <p className="mt-2 text-3xl font-semibold">{resumo.convertidos}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFiltro("ARQUIVADO")}
          className={`rounded-3xl border p-5 text-left shadow-sm transition ${
            statusFiltro === "ARQUIVADO"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Arquivados
          </p>
          <p className="mt-2 text-3xl font-semibold">{resumo.arquivados}</p>
        </button>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Respostas recebidas
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Gerencie os contatos enviados pelos blocos de formulário.
            </p>
          </div>

          <div className="inline-flex rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            {respostasFiltradas.length} resposta
            {respostasFiltradas.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, telefone, e-mail, cidade, mensagem ou página..."
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <select
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value)}
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          >
            {STATUS_LEAD.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          {respostasFiltradas.length === 0 ? (
            <div className="bg-slate-50 px-5 py-12 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Nenhuma resposta encontrada
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Ajuste os filtros ou aguarde novos envios dos formulários.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {respostasFiltradas.map((resposta) => {
                const IconeStatus = getStatusIcon(resposta.status);

                return (
                  <article
                    key={resposta.id}
                    className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1fr_auto]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <IconeStatus className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">
                            {resposta.nome || "Contato sem nome"}
                          </h3>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${getStatusClass(
                              resposta.status
                            )}`}
                          >
                            {statusLabel(resposta.status)}
                          </span>

                          {resposta.aceitaMarketing && (
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                              Aceita marketing
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {resposta.telefone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {resposta.telefone}
                            </span>
                          )}

                          {resposta.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {resposta.email}
                            </span>
                          )}

                          {resposta.cidade && <span>{resposta.cidade}</span>}

                          <span>{dataCompleta(resposta.criadoEm)}</span>
                        </div>

                        {(resposta.paginaTitulo || resposta.blocoTitulo) && (
                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            Origem:{" "}
                            <strong className="text-slate-500">
                              {resposta.paginaTitulo || "Página"}
                            </strong>
                            {resposta.blocoTitulo
                              ? ` · ${resposta.blocoTitulo}`
                              : ""}
                          </p>
                        )}

                        {resposta.mensagem && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                            {resposta.mensagem}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      {resposta.telefone && (
                        <button
                          type="button"
                          onClick={() => abrirWhatsApp(resposta)}
                          className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          WhatsApp
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => abrirResposta(resposta)}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {respostaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Resposta do formulário
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {respostaSelecionada.nome || "Contato sem nome"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Recebido em {dataCompleta(respostaSelecionada.criadoEm)}.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharResposta}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {(erro || sucesso) && (
                <div className="space-y-2">
                  {erro && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {erro}
                    </div>
                  )}

                  {sucesso && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {sucesso}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Telefone
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {respostaSelecionada.telefone || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    E-mail
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {respostaSelecionada.email || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Cidade
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {respostaSelecionada.cidade || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {statusLabel(respostaSelecionada.status)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Mensagem
                </p>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {respostaSelecionada.mensagem || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Origem
                </p>

                <div className="mt-2 grid gap-1 text-sm leading-6 text-slate-700">
                  <p>
                    Página:{" "}
                    <strong>{respostaSelecionada.paginaTitulo || "—"}</strong>
                  </p>
                  <p>
                    Tipo:{" "}
                    <strong>{respostaSelecionada.paginaTipo || "—"}</strong>
                  </p>
                  <p>
                    Bloco:{" "}
                    <strong>{respostaSelecionada.blocoTitulo || "—"}</strong>
                  </p>

                  {respostaSelecionada.origemUrl && (
                    <a
                      href={respostaSelecionada.origemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 underline"
                    >
                      Abrir origem <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    respostaSelecionada.aceiteTermos
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {respostaSelecionada.aceiteTermos
                      ? "Aceitou os termos"
                      : "Não aceitou os termos"}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    respostaSelecionada.aceitaMarketing
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {respostaSelecionada.aceitaMarketing
                      ? "Aceita marketing"
                      : "Não aceita marketing"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Gestão interna
                </p>

                <div className="mt-4 grid gap-4">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Observação interna
                    </span>

                    <textarea
                      value={observacaoInterna}
                      onChange={(event) =>
                        setObservacaoInterna(event.target.value)
                      }
                      rows={4}
                      placeholder="Ex: cliente pediu retorno pelo WhatsApp."
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => atualizarResposta("EM_ATENDIMENTO")}
                      disabled={salvando}
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Em atendimento
                    </button>

                    <button
                      type="button"
                      onClick={() => atualizarResposta("CONVERTIDO")}
                      disabled={salvando}
                      className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Converter
                    </button>

                    <button
                      type="button"
                      onClick={() => atualizarResposta("ARQUIVADO")}
                      disabled={salvando}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Arquivar
                    </button>

                    <button
                      type="button"
                      onClick={() => atualizarResposta()}
                      disabled={salvando}
                      className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Salvar observação
                    </button>
                  </div>
                </div>
              </div>

              {respostaSelecionada.telefone && (
                <button
                  type="button"
                  onClick={() => abrirWhatsApp(respostaSelecionada)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Phone className="h-4 w-4" />
                  Abrir WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
