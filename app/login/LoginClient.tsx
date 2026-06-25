"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";

export default function LoginClient({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [manterConectado, setManterConectado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setCarregando(true);

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
          manterConectado,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Nao foi possivel entrar.");
        setCarregando(false);
        return;
      }

      window.location.assign(data.redirectTo || next || "/pedidos");
    } catch {
      setErro("Nao foi possivel entrar.");
      setCarregando(false);
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

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          checked={manterConectado}
          onChange={(event) => setManterConectado(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-500"
        />
        <span>
          <span className="block text-sm font-semibold text-slate-800">
            Manter conectado
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            Mantem o acesso neste dispositivo por 5 dias.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={carregando}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LockKeyhole className="h-4 w-4" />
        {carregando ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
