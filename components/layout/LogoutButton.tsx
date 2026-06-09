"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {isPending ? "Saindo..." : "Sair"}
      </button>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
