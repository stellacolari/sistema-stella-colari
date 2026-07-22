"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, ImageIcon, Loader2, Search, Upload, X } from "lucide-react";
import type { MidiaAssetBiblioteca } from "@/components/configuracoes/loja/MidiaBibliotecaClient";
import { useAccessibleDialog } from "@/components/configuracoes/loja/conteudo/useAccessibleDialog";

type MediaLibraryPickerProps = {
  open: boolean;
  mode?: "single" | "multiple";
  title?: string;
  onClose: () => void;
  onSelect: (assets: MidiaAssetBiblioteca[]) => void;
  allowUpload?: boolean;
};

type MidiasResponse = {
  items: MidiaAssetBiblioteca[];
  totalPages: number;
  page: number;
};

export default function MediaLibraryPicker({
  open,
  mode = "single",
  title = "Selecionar mídia",
  onClose,
  onSelect,
  allowUpload = false,
}: MediaLibraryPickerProps) {
  const [items, setItems] = useState<MidiaAssetBiblioteca[]>([]);
  const [selected, setSelected] = useState<MidiaAssetBiblioteca[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const loadSequenceRef = useRef(0);

  const load = useCallback(
    async (nextPage: number) => {
      if (!open) return;

      const sequence = ++loadSequenceRef.current;
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "18",
        status: "ATIVO",
        tipo: "IMAGEM",
      });

      if (q.trim()) params.set("q", q.trim());

      try {
        const response = await fetch(`/api/configuracoes/loja/midias?${params}`);
        const data = (await response.json()) as MidiasResponse;
        if (sequence !== loadSequenceRef.current) return;

        if (!response.ok) {
          setError("Erro ao carregar imagens.");
          return;
        }

        setItems(data.items || []);
        setPage(data.page || nextPage);
        setTotalPages(data.totalPages || 1);
      } catch {
        if (sequence !== loadSequenceRef.current) return;
        setError("Não foi possível carregar as imagens.");
      } finally {
        if (sequence === loadSequenceRef.current) setLoading(false);
      }
    },
    [open, q]
  );

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    void load(1);
  }, [load, open]);

  useAccessibleDialog(open, onClose, dialogRef);

  async function uploadFiles(files: FileList | File[]) {
    if (!allowUpload) return;
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));

    if (list.length === 0) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    list.forEach((file) => formData.append("arquivos", file));
    formData.set("origem", "CONTEUDO_LOJA");

    try {
      const response = await fetch("/api/configuracoes/loja/midias/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao enviar imagens.");
        return;
      }

      const assets = Array.isArray(data.assets) ? data.assets : [];

      if (mode === "multiple") {
        setSelected((current) => [...current, ...assets]);
      } else if (assets[0]) {
        setSelected([assets[0]]);
      }

      await load(1);
    } catch {
      setError("Não foi possível enviar as imagens.");
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

  function toggle(asset: MidiaAssetBiblioteca) {
    if (mode === "single") {
      setSelected([asset]);
      return;
    }

    setSelected((current) =>
      current.some((item) => item.id === asset.id)
        ? current.filter((item) => item.id !== asset.id)
        : [...current, asset]
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-library-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="media-library-title" className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="text-sm text-slate-500">
              {mode === "multiple" ? "Seleção múltipla em ordem." : "Selecione uma imagem."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Buscar imagens na biblioteca"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar imagens"
              className="h-11 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-slate-500"
            />
          </div>
          {allowUpload ? (
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileChange}
              className="sr-only"
              disabled={uploading}
            />
          </label>
          ) : null}
        </div>

        <div
          aria-busy={loading}
          onDragOver={(event) => event.preventDefault()}
          onDrop={allowUpload ? onDrop : undefined}
          className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5"
        >
          {error ? (
            <p role="alert" className="mb-4 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p role="status" className="mb-4 text-sm font-medium text-slate-500">
              Carregando imagens…
            </p>
          ) : null}

          {items.length === 0 && !loading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Nenhuma imagem encontrada.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((asset) => {
                const selectedIndex = selected.findIndex((item) => item.id === asset.id);

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggle(asset)}
                    aria-pressed={selectedIndex >= 0}
                    className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm ${
                      selectedIndex >= 0
                        ? "border-slate-950 ring-2 ring-slate-950"
                        : "border-slate-200"
                    }`}
                  >
                    <span className="relative block aspect-[4/3] bg-slate-100">
                      <img
                        src={asset.urlThumb || asset.url}
                        alt={asset.alt || asset.nome}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {selectedIndex >= 0 ? (
                        <span className="absolute right-3 top-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-bold text-white">
                          {mode === "multiple" ? selectedIndex + 1 : <Check className="h-4 w-4" />}
                        </span>
                      ) : null}
                    </span>
                    <span className="block p-3">
                      <span className="block truncate text-sm font-semibold text-slate-950">
                        {asset.nome}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {asset.nomeOriginal}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="min-h-11 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => void load(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="min-h-11 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelect(selected);
              onClose();
            }}
            disabled={selected.length === 0}
            className="min-h-11 rounded-2xl bg-[var(--brand-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-dark)] disabled:opacity-50"
          >
            {mode === "single"
              ? "Usar imagem"
              : `Usar ${selected.length} ${selected.length === 1 ? "imagem" : "imagens"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
