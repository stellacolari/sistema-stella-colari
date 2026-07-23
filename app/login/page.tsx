import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { lerSessaoAdmin } from "@/lib/auth/admin";
import { normalizarDestinoInterno } from "@/lib/security/redirect-interno";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login | Plataforma Stella Colari",
};

function normalizarNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;

  return normalizarDestinoInterno(next);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const redirectTo = normalizarNext(next);
  const sessao = await lerSessaoAdmin();

  if (sessao) {
    redirect(redirectTo);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Plataforma Stella Colari
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Entrar no painel
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Acesse a gestão de pedidos, produtos, estoque e configurações da loja.
        </p>

        <LoginClient next={redirectTo} />
      </section>
    </main>
  );
}
