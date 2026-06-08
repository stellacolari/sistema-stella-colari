"use client";

import { Printer } from "lucide-react";

export default function ImpressaoEtiquetasClient() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      <Printer className="h-4 w-4" />
      Imprimir todas
    </button>
  );
}
