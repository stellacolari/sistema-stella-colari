"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState("");

  async function sair() {
    setErro("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Não foi possível sair.");
        return;
      }

      startTransition(() => {
        router.replace(data.redirectTo || "/login");
        router.refresh();
      });
    } catch {
      setErro("Não foi possível sair.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={sair}
        disabled={isPending}
        title="Sair"
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
          compacto ? "h-10 px-2" : "px-4 py-2"
        }`}
      >
        <LogOut className="h-4 w-4" />
        {!compacto && (isPending ? "Saindo..." : "Sair")}
      </button>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
