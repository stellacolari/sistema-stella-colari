"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { useAccessibleDialog } from "@/components/configuracoes/loja/conteudo/useAccessibleDialog";

export default function CampanhasConteudoClient({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useAccessibleDialog(open, () => setOpen(false), dialogRef);

  async function create() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/configuracoes/loja/conteudo/campanhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível criar a campanha.");
      router.push(`/configuracoes/loja/conteudo/paginas/${data.page.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível criar a campanha.");
    } finally {
      setLoading(false);
    }
  }

  if (!canCreate) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-dark)]"
      >
        <Plus className="h-4 w-4" />
        Nova campanha
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4">
          <div ref={dialogRef} tabIndex={-1} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl focus:outline-none" role="dialog" aria-modal="true" aria-labelledby="new-campaign-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="new-campaign-title" className="text-xl font-semibold text-slate-950">Nova campanha</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">A campanha nasce como rascunho e não altera preços ou descontos.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-800">
                Nome interno
                <input autoFocus value={title} maxLength={140} onChange={(event) => setTitle(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]" />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Slug opcional
                <input value={slug} maxLength={120} onChange={(event) => setSlug(event.target.value)} placeholder="gerado pelo nome" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]" />
              </label>
              {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">Cancelar</button>
              <button type="button" onClick={() => void create()} disabled={!title.trim() || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-semibold text-white disabled:opacity-45">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Criar rascunho
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
