"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  ImageIcon,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { useAccessibleDialog } from "@/components/configuracoes/loja/conteudo/useAccessibleDialog";

type MidiaUsoConteudo = {
  slot: string;
  escopo: string;
  documento: { chave: string };
};

export type MidiaAssetBiblioteca = {
  id: string;
  nome: string;
  nomeOriginal: string;
  url: string;
  urlThumb?: string | null;
  tipo: string;
  mimeType: string;
  tamanhoBytes: number;
  largura?: number | null;
  altura?: number | null;
  alt?: string | null;
  descricao?: string | null;
  tagsJson?: unknown;
  origem: string;
  provider: string;
  pasta?: string | null;
  status: string;
  criadoEm: string;
  _count?: {
    usosConteudo: number;
  };
  usosConteudo?: MidiaUsoConteudo[];
};

type MidiasResponse = {
  items: MidiaAssetBiblioteca[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pastas: string[];
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function tagsToString(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : "";
}

export default function MidiaBibliotecaClient({
  capacidades,
}: {
  capacidades: { criar: boolean; editar: boolean; arquivar: boolean };
}) {
  const [items, setItems] = useState<MidiaAssetBiblioteca[]>([]);
  const [pastas, setPastas] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ATIVO");
  const [pasta, setPasta] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<MidiaAssetBiblioteca | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const editDialogRef = useRef<HTMLDivElement>(null);
  const loadSequenceRef = useRef(0);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  useAccessibleDialog(Boolean(editing), () => setEditing(null), editDialogRef);

  const load = useCallback(
    async (nextPage: number) => {
      const sequence = ++loadSequenceRef.current;
      setLoading(true);
      setMessage("");
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "24",
        status,
        tipo: "IMAGEM",
      });

      if (q.trim()) params.set("q", q.trim());
      if (pasta) params.set("pasta", pasta);

      try {
        const response = await fetch(`/api/configuracoes/loja/midias?${params}`);
        const data = (await response.json()) as MidiasResponse;
        if (sequence !== loadSequenceRef.current) return;

        if (!response.ok) {
          setMessage("Erro ao carregar biblioteca.");
          return;
        }

        setItems(data.items);
        const visibleIds = new Set(data.items.map((item) => item.id));
        setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
        setPastas(data.pastas || []);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || nextPage);
      } catch {
        if (sequence !== loadSequenceRef.current) return;
        setMessage("Não foi possível carregar a biblioteca.");
      } finally {
        if (sequence === loadSequenceRef.current) setLoading(false);
      }
    },
    [pasta, q, status]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    if (!capacidades.criar) return;
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));

    if (list.length === 0) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    list.forEach((file) => formData.append("arquivos", file));
    formData.set("origem", "UPLOAD_MANUAL");
    formData.set("pasta", pasta);

    try {
      const response = await fetch("/api/configuracoes/loja/midias/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Erro ao enviar imagens.");
        return;
      }

      setMessage(
        data.falhas
          ? `${data.total} ${data.total === 1 ? "imagem enviada" : "imagens enviadas"}; ${data.falhas} ${data.falhas === 1 ? "arquivo recusado" : "arquivos recusados"}.`
          : `${data.total || list.length} ${(data.total || list.length) === 1 ? "imagem enviada" : "imagens enviadas"}.`,
      );
      setSelectedIds([]);
      await load(1);
    } catch {
      setMessage("Não foi possível enviar as imagens.");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void uploadFiles(event.target.files);
      event.target.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void uploadFiles(event.dataTransfer.files);
  }

  async function updateAsset(asset: MidiaAssetBiblioteca, patch: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/configuracoes/loja/midias/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Erro ao atualizar imagem.");
        return null;
      }

      setItems((current) =>
        current.map((item) => (item.id === asset.id ? data.asset : item)),
      );
      return data.asset as MidiaAssetBiblioteca;
    } catch {
      setMessage("Não foi possível atualizar a imagem.");
      return null;
    }
  }

  async function archiveSelected() {
    if (!capacidades.arquivar) return;
    const blocked = selectedItems.filter((item) => (item._count?.usosConteudo || 0) > 0);
    const eligible = selectedItems.filter((item) => (item._count?.usosConteudo || 0) === 0);
    const blockedDetails = blocked
      .flatMap((item) =>
        (item.usosConteudo || []).map(
          (usage) => `${item.nome}: ${usage.documento.chave} · ${usage.slot}`,
        ),
      )
      .slice(0, 3);

    if (eligible.length === 0) {
      setMessage(
        `Nenhuma imagem foi arquivada: ${blocked.length} ${blocked.length === 1 ? "está em uso" : "estão em uso"}.${blockedDetails.length ? ` ${blockedDetails.join("; ")}.` : ""}`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Arquivar ${eligible.length} ${eligible.length === 1 ? "imagem sem uso" : "imagens sem uso"}?${blocked.length ? ` ${blocked.length} em uso serão mantidas.` : ""}`,
    );
    if (!confirmed) return;

    let archived = 0;
    const failedIds: string[] = blocked.map((item) => item.id);

    for (const item of eligible) {
      const updated = await updateAsset(item, { status: "ARQUIVADO" });
      if (updated) archived += 1;
      else failedIds.push(item.id);
    }

    setSelectedIds(failedIds);
    const archivedText = `${archived} ${archived === 1 ? "imagem arquivada" : "imagens arquivadas"}`;
    const failedCount = selectedItems.length - archived;
    setMessage(
      `${archivedText}.${failedCount ? ` ${failedCount} ${failedCount === 1 ? "foi mantida" : "foram mantidas"}.${blockedDetails.length ? ` ${blockedDetails.join("; ")}.` : ""}` : ""}`,
    );
    await load(page);
  }

  return (
    <div className="space-y-6">
      {capacidades.criar ? (
        <section className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            JPG, PNG ou WebP, até 4 MB por arquivo. Dimensões e miniatura são verificadas no servidor.
          </p>
          <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 bg-[#4772AA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#355f95] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#5D8CC8] focus-within:ring-offset-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Upload em lote"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileChange}
              className="sr-only"
              disabled={uploading}
            />
          </label>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Buscar imagens"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por nome, alt ou descrição"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <select
          aria-label="Filtrar por pasta"
          value={pasta}
          onChange={(event) => setPasta(event.target.value)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-500"
        >
          <option value="">Todas as pastas</option>
          {pastas.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-500"
        >
          <option value="ATIVO">Ativas</option>
          <option value="ARQUIVADO">Arquivadas</option>
          <option value="">Todas</option>
        </select>
      </section>

      <section
        onDragOver={(event) => event.preventDefault()}
        onDrop={capacidades.criar ? onDrop : undefined}
        className="border border-slate-200 bg-white p-5"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            {loading
              ? "Carregando imagens…"
              : `${total} ${total === 1 ? "imagem encontrada" : "imagens encontradas"}`}
            {selectedIds.length > 0
              ? ` · ${selectedIds.length} ${selectedIds.length === 1 ? "selecionada" : "selecionadas"}`
              : ""}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(items.map((item) => item.id))}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Selecionar página
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Limpar seleção
            </button>
            {capacidades.arquivar ? (
              <button
                type="button"
                onClick={() => void archiveSelected()}
                disabled={selectedIds.length === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </button>
            ) : null}
          </div>
        </div>

        {message ? (
          <p role="status" aria-live="polite" className="mt-3 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
            {message}
          </p>
        ) : null}

        {items.length === 0 && !loading ? (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center">
            <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Nenhuma imagem encontrada.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Envie imagens em lote ou ajuste a busca.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const selected = selectedIds.includes(item.id);
              const usageCount = item._count?.usosConteudo ?? 0;

              return (
                <article
                  key={item.id}
                  className={`overflow-hidden border bg-white ${
                    selected ? "border-slate-950 ring-2 ring-slate-950" : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${selected ? "Remover" : "Adicionar"} ${item.nome} da seleção`}
                    onClick={() =>
                      setSelectedIds((current) =>
                        selected
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id]
                      )
                    }
                    className="relative block aspect-[4/3] w-full bg-slate-100"
                  >
                    <img
                      src={item.urlThumb || item.url}
                      alt={item.alt || item.nome}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {selected ? (
                      <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : null}
                  </button>

                  <div className="space-y-3 p-4">
                    <div>
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {item.nome}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatBytes(item.tamanhoBytes)} · {item.largura && item.altura ? `${item.largura} × ${item.altura} · ` : ""}{item.mimeType}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {usageCount} {usageCount === 1 ? "uso" : "usos"} no conteúdo
                      </p>
                      {item.usosConteudo?.[0] ? (
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.usosConteudo[0].documento.chave} · {item.usosConteudo[0].slot}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      {capacidades.editar ? (
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Editar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(item.url);
                            setMessage(`URL de ${item.nome} copiada.`);
                          } catch {
                            setMessage("Não foi possível copiar a URL.");
                          }
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                        title="Copiar URL"
                        aria-label={`Copiar URL de ${item.nome}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => void load(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm font-medium text-slate-500">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => void load(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </section>

      {editing && capacidades.editar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div
            ref={editDialogRef}
            tabIndex={-1}
            className="w-full max-w-xl bg-white p-5 shadow-2xl focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editar-midia-titulo"
          >
            <h2 id="editar-midia-titulo" className="text-lg font-bold text-slate-950">Editar imagem</h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome
                <input value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Texto alternativo
                <input value={editing.alt || ""} onChange={(event) => setEditing({ ...editing, alt: event.target.value })} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Descrição
                <textarea value={editing.descricao || ""} onChange={(event) => setEditing({ ...editing, descricao: event.target.value })} className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Pasta
                <input value={editing.pasta || ""} onChange={(event) => setEditing({ ...editing, pasta: event.target.value })} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tags separadas por vírgula
                <input
                  value={tagsToString(editing.tagsJson)}
                  onChange={(event) => setEditing({ ...editing, tagsJson: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })}
                  className="h-11 rounded-2xl border border-slate-200 px-4 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="min-h-11 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  try {
                    const updated = await updateAsset(editing, {
                      nome: editing.nome,
                      alt: editing.alt,
                      descricao: editing.descricao,
                      pasta: editing.pasta,
                      tags: editing.tagsJson,
                    });
                    if (updated) setEditing(null);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#4772AA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#355f95] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
