"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function LoginClient({ next }: { next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          senha,
          next,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Não foi possível entrar.");
        return;
      }

      startTransition(() => {
        router.replace(data.redirectTo || "/pedidos");
        router.refresh();
      });
    } catch {
      setErro("Não foi possível entrar.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Senha</span>
        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          autoComplete="current-password"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          required
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LockKeyhole className="h-4 w-4" />
        {isPending ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
