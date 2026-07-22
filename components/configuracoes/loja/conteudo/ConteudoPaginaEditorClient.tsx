"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  ExternalLink,
  GitCompareArrows,
  History,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Send,
  Undo2,
  X,
} from "lucide-react";
import ConteudoImagemField from "@/components/configuracoes/loja/conteudo/ConteudoImagemField";
import {
  assinaturaConteudoPagina,
  criarImagemConteudoVazia,
  validarConteudoPagina,
  type ConteudoCampoDefinicao,
  type ConteudoImagem,
  type ConteudoPaginaPayload,
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

function publicacaoLabel({
  status,
  origem,
  versao,
}: {
  status: string;
  origem: "NOVO" | "LEGADO" | null;
  versao: number | null;
}) {
  if (!origem) return "Ainda não publicado";
  if (status === "AGENDADA") return versao ? `Agendado · versão ${versao}` : "Agendado";
  if (origem === "LEGADO") return "Publicado · legado";
  return versao ? `Publicado · versão ${versao}` : "Publicado";
}

function formatarDataEditorial(value: string | null | undefined) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function operacaoLabel(value: string) {
  const labels: Record<string, string> = {
    MIGRACAO: "Migração segura",
    RASCUNHO: "Rascunho salvo",
    PUBLICACAO: "Publicação",
    RESTAURACAO: "Versão restaurada",
    RESTAURACAO_PUBLICADA: "Publicado restaurado",
    ROLLBACK: "Retorno ao legado",
  };
  return labels[value] || value.toLocaleLowerCase("pt-BR").replaceAll("_", " ");
}

function resumirImagem(value: ConteudoImagem) {
  const temDesktop = Boolean(value.desktopUrl || value.assetId);
  const temMobile = Boolean(value.mobileUrl || value.mobileAssetId);
  if (!temDesktop && !temMobile) return "Sem imagem definida";
  if (temDesktop && temMobile) return value.alt ? `Desktop e mobile · “${value.alt}”` : "Desktop e mobile definidos";
  if (temMobile) return value.alt ? `Somente mobile · “${value.alt}”` : "Somente mobile definida";
  return value.alt ? `Imagem desktop · “${value.alt}”` : "Imagem desktop definida";
}

function resumirValorEditorial(
  field: ConteudoCampoDefinicao,
  value: ConteudoValor | undefined,
  produtos: Option[],
  categorias: Option[],
) {
  if (value === undefined || value === null || value === "") return "Não preenchido";
  if (field.tipo === "IMAGEM") return resumirImagem(value as ConteudoImagem);
  if (field.tipo === "BOOLEANO") return value ? "Ativo" : "Desativado";
  if (Array.isArray(value)) {
    if (value.length === 0) return "Seleção dinâmica (nenhum item manual)";
    const options = field.tipo === "PRODUTOS" ? produtos : categorias;
    const labels = value.map((id) => options.find((option) => option.id === id)?.label || "Item selecionado");
    return labels.join(", ");
  }
  if (field.tipo === "DATA_HORA" && typeof value === "string") {
    return formatarDataEditorial(value);
  }
  return String(value);
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
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)] disabled:bg-slate-100"
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
          className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-[var(--brand-blue)]"
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
        {field.obrigatorioPublicar ? <span className="ml-1 text-[var(--brand-blue)]">*</span> : null}
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
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)] disabled:bg-slate-100"
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
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)] disabled:bg-slate-100"
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
  const [publishedContent, setPublishedContent] = useState<ConteudoPaginaPayload | null>(
    estado.conteudoPublicado,
  );
  const [publishedOrigin, setPublishedOrigin] = useState<"NOVO" | "LEGADO" | null>(
    estado.origemPublicada,
  );
  const [publishedVersion, setPublishedVersion] = useState<number | null>(estado.versaoPublicada);
  const [publishedAt, setPublishedAt] = useState<string | null>(estado.publicadoEm);
  const [publishedBy, setPublishedBy] = useState<string | null>(estado.publicadoPorNome);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(estado.atualizadoEm);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(estado.atualizadoPorNome);
  const [activeSection, setActiveSection] = useState(estado.contrato.sections[0]?.key || "");
  const [savedSnapshot, setSavedSnapshot] = useState(assinaturaConteudoPagina(estado.conteudo));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoringPublished, setRestoringPublished] = useState(false);
  const [showEmbeddedPreview, setShowEmbeddedPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState(estado.historico);
  const dirty = assinaturaConteudoPagina(content) !== savedSnapshot;
  const contract = estado.contrato;
  const section = contract.sections.find((item) => item.key === activeSection) || contract.sections[0];
  const hasUnpublishedChanges = publishedContent
    ? assinaturaConteudoPagina(content) !== assinaturaConteudoPagina(publishedContent)
    : estado.temAlteracoesNaoPublicadas;
  const draftIssues = useMemo(
    () => validarConteudoPagina(contract, content, "RASCUNHO"),
    [content, contract],
  );
  const comparison = useMemo(
    () => {
      if (!publishedContent) return [];
      return contract.sections.flatMap((contractSection) =>
        contractSection.campos.flatMap((field) => {
          const draftValue = content.values[field.key] ?? field.valorPadrao;
          const publishedValue = publishedContent?.values[field.key] ?? field.valorPadrao;
          if (assinaturaConteudoPagina(draftValue) === assinaturaConteudoPagina(publishedValue)) return [];
          let draftSummary = resumirValorEditorial(field, draftValue, produtos, categorias);
          let publishedSummary = publishedContent
            ? resumirValorEditorial(field, publishedValue, produtos, categorias)
            : "Ainda não publicado";
          if (field.tipo === "IMAGEM" && draftSummary === publishedSummary) {
            draftSummary = `${draftSummary} · imagem ou enquadramento do rascunho`;
            publishedSummary = `${publishedSummary} · imagem ou enquadramento publicado`;
          }
          return [{
            key: field.key,
            sectionLabel: contractSection.label,
            fieldLabel: field.label,
            draft: draftSummary,
            published: publishedSummary,
          }];
        }),
      );
    },
    [categorias, content, contract.sections, produtos, publishedContent],
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
      setSavedSnapshot(assinaturaConteudoPagina(content));
      const updatedAt = new Date().toISOString();
      setLastUpdatedAt(updatedAt);
      setLastUpdatedBy("Você");
      if (Number.isInteger(data.numeroVersao) && typeof data.versaoId === "string") {
        setHistory((current) => [{
          id: data.versaoId,
          numero: data.numeroVersao,
          operacao: "RASCUNHO",
          resumo: null,
          autorNome: "Você",
          criadoEm: updatedAt,
          publicada: false,
        }, ...current]);
      }
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
    if (
      modoEntrega === "LEGADO" &&
      !window.confirm(
        "Publicar este rascunho ativa a nova entrega pública desta página. A versão legada será preservada para rollback. Deseja continuar?",
      )
    ) return;

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
      setPublishedOrigin("NOVO");
      setPublishedContent(content);
      setPublishedVersion(data.versao);
      const publicationTime = data.publicadoEm || new Date().toISOString();
      setPublishedAt(publicationTime);
      setPublishedBy("Você");
      setLastUpdatedAt(publicationTime);
      setLastUpdatedBy("Você");
      setSavedSnapshot(assinaturaConteudoPagina(content));
      setHistory((current) => [{
        id: data.versaoId,
        numero: data.versao,
        operacao: "PUBLICACAO",
        resumo: null,
        autorNome: "Você",
        criadoEm: publicationTime,
        publicada: true,
      }, ...current.map((item) => ({ ...item, publicada: false }))]);
      setMessage(
        data.cacheRevalidado === false
          ? data.avisoCache ||
              `Versão ${data.versao} publicada; invalidação de cache pendente.`
          : data.status === "AGENDADA"
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
      setSavedSnapshot(assinaturaConteudoPagina(data.conteudo));
      const updatedAt = new Date().toISOString();
      setLastUpdatedAt(updatedAt);
      setLastUpdatedBy("Você");
      if (Number.isInteger(data.numeroVersao) && typeof data.versaoId === "string") {
        setHistory((current) => [{
          id: data.versaoId,
          numero: data.numeroVersao,
          operacao: "RESTAURACAO",
          resumo: `Versão ${versionNumber} restaurada como rascunho`,
          autorNome: "Você",
          criadoEm: updatedAt,
          publicada: false,
        }, ...current]);
      }
      setMessage(`Versão ${versionNumber} restaurada como rascunho.`);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Não foi possível restaurar.");
    } finally {
      setSaving(false);
    }
  }

  async function restorePublished() {
    if (
      !canPublish ||
      !publishedContent ||
      !window.confirm(
        "Restaurar o conteúdo publicado como rascunho? Alterações atuais do rascunho, inclusive as ainda não salvas, serão substituídas. A página pública não será alterada.",
      )
    ) return;

    setRestoringPublished(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/configuracoes/loja/conteudo/${pagina.id}/restaurar-publicado`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedRevision: revision }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível restaurar o conteúdo publicado.");

      const restoredContent = data.conteudo as ConteudoPaginaPayload;
      const updatedAt = new Date().toISOString();
      setContent(restoredContent);
      setRevision(data.revisao);
      setSavedSnapshot(assinaturaConteudoPagina(restoredContent));
      setLastUpdatedAt(updatedAt);
      setLastUpdatedBy("Você");
      if (Number.isInteger(data.numeroVersao) && typeof data.versaoId === "string") {
        setHistory((current) => [{
          id: data.versaoId,
          numero: data.numeroVersao,
          operacao: "RESTAURACAO_PUBLICADA",
          resumo: "Conteúdo publicado restaurado como rascunho",
          autorNome: "Você",
          criadoEm: updatedAt,
          publicada: false,
        }, ...current]);
      }
      setMessage("Conteúdo publicado restaurado como rascunho. A página pública não foi alterada.");
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Não foi possível restaurar o conteúdo publicado.",
      );
    } finally {
      setRestoringPublished(false);
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
      if (data.cacheRevalidado === false) {
        window.alert(
          data.avisoCache ||
            "O rollback foi concluído, mas a invalidação de cache ficou pendente.",
        );
      }
      window.location.reload();
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
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]"
              aria-label="Voltar para páginas"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-slate-950">{pagina.titulo}</h1>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Rascunho
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    publishedOrigin === "NOVO"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : publishedOrigin === "LEGADO"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {publicacaoLabel({ status, origem: publishedOrigin, versao: publishedVersion })}
                </span>
                {hasUnpublishedChanges ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    Alterações não publicadas
                  </span>
                ) : null}
                {dirty ? <span className="text-xs font-medium text-rose-700">Alterações não salvas</span> : null}
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
                disabled={!canPublish || saving || publishing || restoringPublished}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-45"
              >
                <Undo2 className="h-4 w-4" />
                Voltar ao legado
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={!canEdit || saving || publishing || restoringPublished || !dirty}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar rascunho
            </button>
            <Link
              href={`/loja/preview/pagina/${pagina.id}?conteudo=rascunho`}
              target="_blank"
              rel="noreferrer"
              title={dirty ? "Salve o rascunho para visualizar as alterações atuais" : undefined}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Preview do rascunho
              <ExternalLink className="h-4 w-4" />
            </Link>
            {publishedContent ? (
              <Link
                href={`/loja/preview/pagina/${pagina.id}?conteudo=publicado`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Preview publicado
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
            {pagina.publicPath && publishedOrigin ? (
              <Link
                href={pagina.publicPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver publicado
                <Eye className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void restorePublished()}
              disabled={!canPublish || !publishedContent || !hasUnpublishedChanges || saving || publishing || restoringPublished}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
              title={hasUnpublishedChanges ? "Substitui o rascunho pelo conteúdo publicado" : "O rascunho já coincide com o publicado"}
            >
              {restoringPublished ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Restaurar publicado
            </button>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={
                !canPublish ||
                publishing ||
                saving ||
                restoringPublished ||
                estado.blocosNaoMapeados.length > 0 ||
                (modoEntrega === "NOVO" && !hasUnpublishedChanges)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-dark)] disabled:cursor-not-allowed disabled:opacity-45"
              title={
                estado.blocosNaoMapeados.length > 0
                  ? "Revise as seções legadas antes de publicar"
                  : modoEntrega === "NOVO" && !hasUnpublishedChanges
                    ? "O rascunho já coincide com o publicado"
                    : undefined
              }
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

        <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[var(--brand-blue)]" />
                <h2 className="text-sm font-semibold text-slate-950">Preview visual do rascunho salvo</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Usa o mesmo renderer-base da página pública. Salve o rascunho para atualizar esta visualização.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEmbeddedPreview((current) => !current)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              aria-expanded={showEmbeddedPreview}
              aria-controls="preview-rascunho-integrado"
            >
              {showEmbeddedPreview ? "Ocultar preview" : "Abrir preview integrado"}
            </button>
          </div>
          {showEmbeddedPreview ? (
            <div id="preview-rascunho-integrado" className="border-t border-slate-200 bg-slate-100 p-2 sm:p-4">
              {dirty ? (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Há alterações não salvas. O preview abaixo mostra o último rascunho salvo.
                </p>
              ) : null}
              <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                <iframe
                  key={`preview-rascunho-${revision}`}
                  src={`/loja/preview/pagina/${pagina.id}?conteudo=rascunho&embed=1`}
                  title={`Preview do rascunho de ${pagina.titulo}`}
                  className="h-[68vh] min-h-[520px] w-full bg-white"
                  loading="lazy"
                />
              </div>
            </div>
          ) : null}
        </section>

        <details className="group mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <GitCompareArrows className="h-4 w-4 text-[var(--brand-blue)]" />
              Comparar rascunho e publicado
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              !publishedContent
                ? "bg-slate-100 text-slate-600"
                : comparison.length > 0
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {!publishedContent
                ? "Ainda não publicado"
                : comparison.length > 0
                  ? `${comparison.length} alteração(ões)`
                  : "Sem diferenças"}
            </span>
          </summary>
          <div className="border-t border-slate-200 p-4 sm:p-5">
            {!publishedContent ? (
              <p className="text-sm leading-6 text-slate-600">
                Ainda não existe uma versão publicada para comparar com este
                rascunho.
              </p>
            ) : comparison.length > 0 ? (
              <ol className="space-y-3">
                {comparison.map((item) => (
                  <li key={item.key} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {item.sectionLabel}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{item.fieldLabel}</h3>
                    <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <dt className="font-semibold text-slate-500">Rascunho</dt>
                        <dd className="mt-1 break-words leading-5 text-slate-800">{item.draft}</dd>
                      </div>
                      <div className="rounded-lg bg-emerald-50/70 p-3">
                        <dt className="font-semibold text-emerald-700">Publicado</dt>
                        <dd className="mt-1 break-words leading-5 text-slate-800">{item.published}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                O rascunho coincide com o conteúdo publicado.
              </p>
            )}
          </div>
        </details>

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
                    ? "bg-[var(--brand-blue-soft)] text-[var(--brand-blue-dark)]"
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
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
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Entrega</dt><dd className="text-right font-medium text-slate-800">{publishedOrigin === "NOVO" ? "Conteúdo versionado" : publishedOrigin === "LEGADO" ? "Legado preservado" : "Sem publicação"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Versão pública</dt><dd className="text-right font-medium text-slate-800">{publishedOrigin === "LEGADO" ? "Original legada" : publishedVersion ? `Versão ${publishedVersion}` : "Nenhuma"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Renderer</dt><dd className="text-right font-medium text-slate-800">Base visual compartilhada</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Validação</dt><dd className={draftIssues.some((issue) => issue.nivel === "ERRO") ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{draftIssues.length ? `${draftIssues.length} ponto(s)` : "Válido"}</dd></div>
              </dl>
              <dl className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-xs">
                <div>
                  <dt className="font-semibold text-slate-500">Última edição</dt>
                  <dd className="mt-1 leading-5 text-slate-700">
                    {lastUpdatedBy || "Autor não informado"} · {formatarDataEditorial(lastUpdatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Última publicação</dt>
                  <dd className="mt-1 leading-5 text-slate-700">
                    {publishedOrigin
                      ? `${publishedBy || "Autor não informado"} · ${formatarDataEditorial(publishedAt)}`
                      : "Ainda não publicada"}
                  </dd>
                </div>
              </dl>
              {draftIssues.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
                  {draftIssues.slice(0, 5).map((issue) => <li key={`${issue.campo}-${issue.mensagem}`}>{issue.mensagem}</li>)}
                </ul>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[var(--brand-blue)]" />
                <h2 className="text-sm font-semibold text-slate-950">Histórico</h2>
              </div>
              {history.length > 0 ? (
                <ol className="mt-4 space-y-3">
                  {history.slice(0, 8).map((item) => (
                    <li key={item.id} className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Versão {item.numero} · {operacaoLabel(item.operacao)}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {item.autorNome || "Sistema"} · {new Date(item.criadoEm).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        {canPublish && !item.publicada ? (
                          <button
                            type="button"
                            onClick={() => void restore(item.id, item.numero)}
                            className="text-xs font-semibold text-[var(--brand-blue)] hover:underline"
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

            <section className="rounded-2xl border border-slate-200 bg-[var(--brand-blue-soft)] p-5 text-[var(--brand-blue-dark)]">
              <div className="flex gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-5">
                  Salvar altera somente o rascunho. Preview publicado e “Ver publicado” nunca recebem alterações antes da publicação.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
