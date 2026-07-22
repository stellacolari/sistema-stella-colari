"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  History,
  Loader2,
  Plus,
  Save,
  Send,
  Undo2,
  X,
} from "lucide-react";
import ConteudoImagemField from "@/components/configuracoes/loja/conteudo/ConteudoImagemField";
import {
  criarImagemConteudoVazia,
  validarConteudoPagina,
  type ConteudoCampoDefinicao,
  type ConteudoImagem,
  type ConteudoValor,
} from "@/lib/loja/conteudo/contracts";
import type { ConteudoEstadoEditor } from "@/lib/loja/conteudo/repository.server";

type Option = { id: string; label: string; helper?: string | null };

type Props = {
  pagina: {
    id: string;
    titulo: string;
    slug: string;
    tipo: string;
    statusPublicacao: string;
    publicPath: string | null;
  };
  estado: ConteudoEstadoEditor;
  produtos: Option[];
  categorias: Option[];
  canEdit: boolean;
  canCreateMedia: boolean;
  canPublish: boolean;
};

function statusLabel(status: string, modoEntrega: string) {
  if (modoEntrega === "LEGADO" && status === "LEGADO_PUBLICADO") return "Publicado · legado";
  if (status === "PUBLICADA") return "Publicado";
  if (status === "AGENDADA") return "Agendado";
  return "Rascunho";
}

function statusClass(status: string, modoEntrega: string) {
  if (modoEntrega === "LEGADO") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "PUBLICADA") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "AGENDADA") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SelectionField({
  value,
  options,
  onChange,
  limit,
  disabled,
  labelledBy,
}: {
  value: string[];
  options: Option[];
  onChange: (value: string[]) => void;
  limit: number;
  disabled: boolean;
  labelledBy: string;
}) {
  const [selected, setSelected] = useState("");
  const selectedOptions = value
    .map((id) => options.find((option) => option.id === id))
    .filter(Boolean) as Option[];
  const available = options.filter((option) => !value.includes(option.id));

  function add() {
    if (!selected || value.includes(selected) || value.length >= limit) return;
    onChange([...value, selected]);
    setSelected("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          aria-labelledby={labelledBy}
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={disabled || value.length >= limit}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#5D8CC8] focus:ring-2 focus:ring-[#5D8CC8]/20 disabled:bg-slate-100"
        >
          <option value="">Selecione…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={disabled || !selected || value.length >= limit}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          aria-label="Adicionar seleção"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {selectedOptions.length > 0 ? (
        <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {selectedOptions.map((option, index) => (
            <li key={option.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0 text-sm text-slate-800">
                <span className="mr-2 text-xs font-semibold text-slate-400">{index + 1}</span>
                {option.label}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== option.id))}
                disabled={disabled}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                aria-label={`Remover ${option.label}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs leading-5 text-slate-500">
          Nenhum item manual. A experiência usa a regra dinâmica definida no código.
        </p>
      )}
      <p className="text-xs text-slate-400">{value.length} de {limit}</p>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
  produtos,
  categorias,
  disabled,
  canCreateMedia,
}: {
  field: ConteudoCampoDefinicao;
  value: ConteudoValor;
  onChange: (value: ConteudoValor) => void;
  produtos: Option[];
  categorias: Option[];
  disabled: boolean;
  canCreateMedia: boolean;
}) {
  if (field.tipo === "IMAGEM") {
    return (
      <ConteudoImagemField
        label={field.label}
        description={field.descricao}
        value={(value as ConteudoImagem) || criarImagemConteudoVazia()}
        onChange={onChange}
        aspectDesktop={field.proporcaoDesktop ?? 16 / 9}
        aspectMobile={field.proporcaoMobile ?? 4 / 5}
        recommendedDesktop={field.tamanhoRecomendadoDesktop}
        recommendedMobile={field.tamanhoRecomendadoMobile}
        disabled={disabled}
        canCreateMedia={canCreateMedia}
      />
    );
  }

  if (field.tipo === "BOOLEANO") {
    return (
      <label className="flex items-start justify-between gap-5 border-t border-slate-200 py-5 first:border-t-0 first:pt-0">
        <span>
          <span className="block text-sm font-semibold text-slate-900">{field.label}</span>
          {field.descricao ? <span className="mt-1 block text-sm leading-6 text-slate-500">{field.descricao}</span> : null}
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-[#4772AA]"
        />
      </label>
    );
  }

  if (field.tipo === "PRODUTOS" || field.tipo === "CATEGORIAS") {
    const labelId = `content-field-${field.key.replace(/[^a-zA-Z0-9]/g, "-")}-label`;
    return (
      <div className="border-t border-slate-200 py-5 first:border-t-0 first:pt-0">
        <p id={labelId} className="mb-2 block text-sm font-semibold text-slate-900">{field.label}</p>
        {field.descricao ? <p className="mb-3 text-sm leading-6 text-slate-500">{field.descricao}</p> : null}
        <SelectionField
          value={Array.isArray(value) ? value : []}
          options={field.tipo === "PRODUTOS" ? produtos : categorias}
          onChange={onChange}
          limit={field.limite ?? 24}
          disabled={disabled}
          labelledBy={labelId}
        />
      </div>
    );
  }

  const id = `content-field-${field.key.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const textValue = typeof value === "string" || typeof value === "number" ? String(value) : "";

  return (
    <label htmlFor={id} className="block border-t border-slate-200 py-5 first:border-t-0 first:pt-0">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {field.label}
        {field.obrigatorioPublicar ? <span className="ml-1 text-[#4772AA]">*</span> : null}
      </span>
      {field.descricao ? <span className="mb-3 block text-sm leading-6 text-slate-500">{field.descricao}</span> : null}
      {field.tipo === "TEXTO_LONGO" ? (
        <textarea
          id={id}
          value={textValue}
          maxLength={field.limite}
          rows={Math.min(10, Math.max(4, Math.ceil((field.limite ?? 500) / 180)))}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#5D8CC8] focus:ring-2 focus:ring-[#5D8CC8]/20 disabled:bg-slate-100"
        />
      ) : (
        <input
          id={id}
          type={field.tipo === "DATA_HORA" ? "datetime-local" : field.tipo === "NUMERO" ? "number" : "text"}
          value={textValue}
          maxLength={field.limite}
          min={field.minimo}
          max={field.maximo}
          step={field.passo}
          onChange={(event) =>
            onChange(field.tipo === "NUMERO" ? Number(event.target.value) : event.target.value)
          }
          disabled={disabled}
          placeholder={field.placeholder}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#5D8CC8] focus:ring-2 focus:ring-[#5D8CC8]/20 disabled:bg-slate-100"
        />
      )}
      {field.limite && typeof value === "string" ? (
        <span className="mt-1 block text-right text-xs text-slate-400">
          {value.length}/{field.limite}
        </span>
      ) : null}
    </label>
  );
}

export default function ConteudoPaginaEditorClient({
  pagina,
  estado,
  produtos,
  categorias,
  canEdit,
  canCreateMedia,
  canPublish,
}: Props) {
  const [content, setContent] = useState(estado.conteudo);
  const [revision, setRevision] = useState(estado.revisao);
  const [status, setStatus] = useState(estado.status);
  const [modoEntrega, setModoEntrega] = useState(estado.modoEntrega);
  const [activeSection, setActiveSection] = useState(estado.contrato.sections[0]?.key || "");
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(estado.conteudo));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history] = useState(estado.historico);
  const dirty = JSON.stringify(content) !== savedSnapshot;
  const contract = estado.contrato;
  const section = contract.sections.find((item) => item.key === activeSection) || contract.sections[0];
  const draftIssues = useMemo(
    () => validarConteudoPagina(contract, content, "RASCUNHO"),
    [content, contract],
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function updateValue(key: string, value: ConteudoValor) {
    setContent((current) => ({
      ...current,
      values: { ...current.values, [key]: value },
    }));
    setMessage("");
    setError("");
  }

  async function saveDraft(silent = false) {
    if (!canEdit) return null;
    setSaving(true);
    setError("");
    if (!silent) setMessage("");

    try {
      const response = await fetch(`/api/configuracoes/loja/conteudo/${pagina.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision, content }),
      });
      const data = await response.json();
      if (!response.ok) {
        const issueText = data.details?.issues?.map((issue: { mensagem: string }) => issue.mensagem).join(" ");
        throw new Error(issueText || data.error || "Não foi possível salvar.");
      }
      setRevision(data.revisao);
      setSavedSnapshot(JSON.stringify(content));
      if (!silent) setMessage("Rascunho salvo.");
      return data.revisao as number;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!canPublish) return;
    setPublishing(true);
    setError("");
    setMessage("");

    try {
      let nextRevision = revision;
      if (dirty || revision === 0) {
        const savedRevision = await saveDraft(true);
        if (savedRevision === null) return;
        nextRevision = savedRevision;
      }

      const response = await fetch(`/api/configuracoes/loja/conteudo/${pagina.id}/publicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: nextRevision }),
      });
      const data = await response.json();
      if (!response.ok) {
        const issueText = data.details?.issues?.map((issue: { mensagem: string }) => issue.mensagem).join(" ");
        throw new Error(issueText || data.error || "Não foi possível publicar.");
      }
      setRevision(data.revisao);
      setStatus(data.status === "AGENDADA" ? "AGENDADA" : "PUBLICADA");
      setModoEntrega("NOVO");
      setMessage(
        data.status === "AGENDADA"
          ? `Versão ${data.versao} agendada.`
          : `Versão ${data.versao} publicada.`,
      );
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Não foi possível publicar.");
    } finally {
      setPublishing(false);
    }
  }

  async function restore(versionId: string, versionNumber: number) {
    if (!canPublish || !window.confirm(`Restaurar a versão ${versionNumber} como novo rascunho?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/configuracoes/loja/conteudo/${pagina.id}/restaurar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, expectedRevision: revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível restaurar.");
      setContent(data.conteudo);
      setRevision(data.revisao);
      setSavedSnapshot(JSON.stringify(data.conteudo));
      setMessage(`Versão ${versionNumber} restaurada como rascunho.`);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Não foi possível restaurar.");
    } finally {
      setSaving(false);
    }
  }

  async function rollbackToLegacy() {
    if (
      !canPublish ||
      !window.confirm(
        "Voltar a entrega pública desta página para o renderer legado? O rascunho e todo o histórico novo serão preservados.",
      )
    ) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/configuracoes/loja/conteudo/${pagina.id}/rollback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedRevision: revision }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível executar o rollback.");
      setRevision(data.revisao);
      setModoEntrega("LEGADO");
      setStatus(data.status === "LEGADO_PUBLICADO" ? "LEGADO_PUBLICADO" : "RASCUNHO");
      setMessage("Entrega revertida para o renderer legado; histórico novo preservado.");
    } catch (rollbackError) {
      setError(rollbackError instanceof Error ? rollbackError.message : "Não foi possível executar o rollback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-20">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/configuracoes/loja/conteudo/paginas"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D8CC8]"
              aria-label="Voltar para páginas"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-slate-950">{pagina.titulo}</h1>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(status, modoEntrega)}`}>
                  {statusLabel(status, modoEntrega)}
                </span>
                {dirty ? <span className="text-xs font-medium text-amber-700">Alterações não salvas</span> : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {pagina.publicPath ||
                  (pagina.tipo === "PRODUTO_GLOBAL"
                    ? "Aplicado às páginas de produto"
                    : pagina.tipo === "TEMPLATE_CATEGORIA"
                      ? "Aplicado às categorias sem conteúdo específico"
                      : "Sem rota pública própria")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {modoEntrega === "NOVO" ? (
              <button
                type="button"
                onClick={() => void rollbackToLegacy()}
                disabled={!canPublish || saving || publishing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-45"
              >
                <Undo2 className="h-4 w-4" />
                Voltar ao legado
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={!canEdit || saving || !dirty}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar rascunho
            </button>
            <Link
              href={`/loja/preview/pagina/${pagina.id}?conteudo=1`}
              target="_blank"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Prévia
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={!canPublish || publishing || estado.blocosNaoMapeados.length > 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4772AA] px-5 text-sm font-semibold text-white transition hover:bg-[#3f6699] disabled:cursor-not-allowed disabled:opacity-45"
              title={estado.blocosNaoMapeados.length > 0 ? "Revise as seções legadas antes de publicar" : undefined}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publicar
            </button>
          </div>
        </div>
      </header>

      {!canEdit ? (
        <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6" role="status">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Modo somente leitura. Seu perfil pode revisar o conteúdo e a prévia, mas não pode salvar alterações.
          </p>
        </div>
      ) : null}

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        {(message || error) ? (
          <div
            role={error ? "alert" : "status"}
            aria-live="polite"
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${
              error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        ) : null}

        {estado.avisosLegado.length > 0 ? (
          <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold">Compatibilidade legada em revisão</h2>
                <ul className="mt-2 space-y-1 text-sm leading-6">
                  {estado.avisosLegado.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
                <p className="mt-2 text-xs leading-5">
                  O conteúdo publicado continua no renderer legado até todas as seções estarem mapeadas. Nada será apagado.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mb-5 lg:hidden">
          <label className="block text-sm font-semibold text-slate-800">
            Seção
            <select
              value={activeSection}
              onChange={(event) => setActiveSection(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              {contract.sections.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,820px)_minmax(240px,1fr)] lg:items-start">
          <nav className="sticky top-24 hidden rounded-2xl border border-slate-200 bg-white p-2 lg:block" aria-label="Seções da página">
            {contract.sections.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                aria-pressed={activeSection === item.key}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  activeSection === item.key
                    ? "bg-[#eaf0f8] text-[#274b78]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {item.label}
                <ChevronRight className="h-4 w-4" />
              </button>
            ))}
          </nav>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 border-b border-slate-200 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4772AA]">
                {contract.label}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{section?.label}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{section?.descricao}</p>
            </div>
            <div>
              {section?.campos.filter((field) => field.editavel !== false).map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={content.values[field.key] ?? field.valorPadrao}
                  onChange={(value) => updateValue(field.key, value)}
                  produtos={produtos}
                  categorias={categorias}
                  disabled={!canEdit}
                  canCreateMedia={canCreateMedia}
                />
              ))}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
              <section id="historico-conteudo" className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-950">Estado editorial</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Contrato</dt><dd className="font-medium text-slate-800">{contract.key} v{contract.version}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Revisão</dt><dd className="font-medium text-slate-800">{revision}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Entrega</dt><dd className="font-medium text-slate-800">{modoEntrega === "NOVO" ? "Experiência nova" : "Legado seguro"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Validação</dt><dd className={draftIssues.some((issue) => issue.nivel === "ERRO") ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{draftIssues.length ? `${draftIssues.length} ponto(s)` : "Válido"}</dd></div>
              </dl>
              {draftIssues.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
                  {draftIssues.slice(0, 5).map((issue) => <li key={`${issue.campo}-${issue.mensagem}`}>{issue.mensagem}</li>)}
                </ul>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#4772AA]" />
                <h2 className="text-sm font-semibold text-slate-950">Histórico</h2>
              </div>
              {history.length > 0 ? (
                <ol className="mt-4 space-y-3">
                  {history.slice(0, 8).map((item) => (
                    <li key={item.id} className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Versão {item.numero} · {item.operacao.toLowerCase()}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {item.autorNome || "Sistema"} · {new Date(item.criadoEm).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        {canPublish && !item.publicada ? (
                          <button
                            type="button"
                            onClick={() => void restore(item.id, item.numero)}
                            className="text-xs font-semibold text-[#4772AA] hover:underline"
                          >
                            Restaurar
                          </button>
                        ) : item.publicada ? <Check className="h-4 w-4 text-emerald-600" aria-label="Versão publicada" /> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-xs leading-5 text-slate-500">O histórico começa no primeiro salvamento.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-[#eaf0f8] p-5 text-[#274b78]">
              <div className="flex gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-5">
                  Salvar nunca altera a loja pública. Publicar cria uma versão imutável e mantém rollback.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
