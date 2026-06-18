"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  ImageIcon,
  Loader2,
  Search,
  Upload,
} from "lucide-react";

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

export default function MidiaBibliotecaClient() {
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
  const [message, setMessage] = useState("");

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
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

        if (!response.ok) {
          setMessage("Erro ao carregar biblioteca.");
          return;
        }

        setItems(data.items);
        setPastas(data.pastas || []);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || nextPage);
      } finally {
        setLoading(false);
      }
    },
    [pasta, q, status]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
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

      setMessage(`${data.total || list.length} imagem(ns) enviada(s).`);
      setSelectedIds([]);
      await load(1);
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
      current.map((item) => (item.id === asset.id ? data.asset : item))
    );
    return data.asset as MidiaAssetBiblioteca;
  }

  async function archiveSelected() {
    for (const item of selectedItems) {
      await updateAsset(item, { status: "ARQUIVADO" });
    }

    setSelectedIds([]);
    setMessage(`${selectedItems.length} imagem(ns) arquivada(s).`);
    await load(page);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Loja Online
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Biblioteca de Midia
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Reutilize imagens no builder sem cortar o arquivo original. Cada uso
              salva seu proprio enquadramento desktop e mobile.
            </p>
          </div>

          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Upload em lote"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileChange}
              className="hidden"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por nome, alt ou descricao"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <select
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
        onDrop={onDrop}
        className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            {loading ? "Carregando imagens..." : `${total} imagem(ns) encontradas`}
            {selectedIds.length > 0 ? ` - ${selectedIds.length} selecionada(s)` : ""}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(items.map((item) => item.id))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Selecionar pagina
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Limpar selecao
            </button>
            <button
              type="button"
              onClick={() => void archiveSelected()}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
            >
              <Archive className="h-4 w-4" />
              Arquivar
            </button>
          </div>
        </div>

        {message ? (
          <p className="mt-3 rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
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

              return (
                <article
                  key={item.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                    selected ? "border-slate-950 ring-2 ring-slate-950" : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
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
                        {formatBytes(item.tamanhoBytes)} - {item.mimeType}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(item.url)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                        title="Copiar URL"
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
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm font-medium text-slate-500">
            Pagina {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => void load(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-950">Editar imagem</h2>
            <div className="mt-4 grid gap-4">
              <input
                value={editing.nome}
                onChange={(event) => setEditing({ ...editing, nome: event.target.value })}
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm"
                placeholder="Nome"
              />
              <input
                value={editing.alt || ""}
                onChange={(event) => setEditing({ ...editing, alt: event.target.value })}
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm"
                placeholder="Alt text"
              />
              <input
                value={editing.pasta || ""}
                onChange={(event) => setEditing({ ...editing, pasta: event.target.value })}
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm"
                placeholder="Pasta"
              />
              <input
                value={tagsToString(editing.tagsJson)}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    tagsJson: event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm"
                placeholder="Tags separadas por virgula"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const updated = await updateAsset(editing, {
                    nome: editing.nome,
                    alt: editing.alt,
                    pasta: editing.pasta,
                    tags: editing.tagsJson,
                  });

                  if (updated) setEditing(null);
                }}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
