"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SairClienteButton() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/loja/auth/sair", {
      method: "POST",
    });

    router.push("/loja/entrar");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}