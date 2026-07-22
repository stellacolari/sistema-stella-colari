"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { AlertCircle, LogIn, Sparkles } from "lucide-react";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";

type MenuPublicoLojaProps = ComponentProps<typeof MenuPublicoLoja>;

type LoginClienteClientProps = {
  menus: MenuPublicoLojaProps["menus"];
  categoriasMenu: MenuPublicoLojaProps["categorias"];
  configuracaoMenuRodape?: MenuPublicoLojaProps["configuracaoMenuRodape"];
};

export default function LoginClienteClient({
  menus,
  categoriasMenu,
  configuracaoMenuRodape,
}: LoginClienteClientProps) {
  const router = useRouter();

  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setErro("");

    if (!identificador.trim()) {
      setErro("Informe e-mail, telefone ou documento.");
      return;
    }

    if (!senha) {
      setErro("Informe sua senha.");
      return;
    }

    setEntrando(true);

    try {
      const response = await fetch("/api/loja/auth/entrar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identificador,
          senha,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao entrar.");
        return;
      }

      router.push("/loja/minha-conta");
      router.refresh();
    } catch {
      setErro("Erro ao entrar.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="store-flow min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
        mostrarFavoritos
      />

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <section className="flex items-center bg-[var(--brand-blue-soft)] p-8 md:p-12 lg:min-h-[520px]">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] brand-text">
              Stella
            </p>

            <h1 className="store-editorial-title mt-4 text-4xl font-light tracking-tight text-slate-950 md:text-6xl">
              Acesse sua conta
            </h1>

            <p className="mt-5 text-sm font-light leading-7 text-slate-600 md:text-base">
              Entre para acompanhar seus pedidos, consultar seu saldo de
              cashback e facilitar suas próximas compras.
            </p>

            <div className="mt-8 inline-flex items-center gap-3 bg-white px-4 py-3 text-sm text-[var(--brand-blue)]">
              <Sparkles className="h-4 w-4" />
              Cashback acumulativo para clientes cadastrados.
            </div>
          </div>
        </section>

        <section className="h-fit border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-light tracking-tight text-slate-950">
              Entrar
            </h2>

            <p className="mt-2 text-sm font-light leading-6 text-slate-500">
              Use o e-mail, telefone ou documento cadastrado no checkout.
            </p>
          </div>

          {erro && (
            <div
              className="mt-5 flex gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{erro}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                E-mail, telefone ou documento
              </span>

              <input
                name="identificador"
                autoComplete="username"
                aria-invalid={Boolean(erro)}
                value={identificador}
                onChange={(event) => setIdentificador(event.target.value)}
                className="h-12 w-full border border-slate-300 px-4 text-sm outline-none transition focus:border-[var(--brand-blue)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Senha
              </span>

              <input
                type="password"
                name="senha"
                autoComplete="current-password"
                aria-invalid={Boolean(erro)}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    entrar();
                  }
                }}
                className="h-12 w-full border border-slate-300 px-4 text-sm outline-none transition focus:border-[var(--brand-blue)]"
              />
            </label>

            <button
              type="button"
              onClick={entrar}
              disabled={entrando}
              className="inline-flex h-12 w-full items-center justify-center gap-2 brand-button px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {entrando ? "Entrando..." : "Entrar"}
            </button>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5 text-sm font-light leading-6 text-slate-500">
            Ainda não tem conta? Crie seu cadastro ao finalizar uma compra para
            começar a acumular cashback.
          </div>

          <Link
            href="/loja"
            className="mt-4 inline-flex text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950"
          >
            Voltar para loja
          </Link>
        </section>
      </main>

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
