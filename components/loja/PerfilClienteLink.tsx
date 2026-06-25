"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  LogIn,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

type ClienteLogado = {
  id: string;
  codigo: string;
  nome: string;
  email: string | null;
  telefone: string;
  documento: string;
  cashbackSaldo: number;
  tipoCliente: string;
};

type AbaAuth = "ENTRAR" | "CRIAR_CONTA";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function PerfilClienteLink({
  className = "",
  mostrarTexto = false,
}: {
  className?: string;
  mostrarTexto?: boolean;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [cliente, setCliente] = useState<ClienteLogado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<AbaAuth>("ENTRAR");

  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);

  const [loginForm, setLoginForm] = useState({
    identificador: "",
    senha: "",
  });

  const [cadastroForm, setCadastroForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    documento: "",
    senha: "",
    confirmarSenha: "",
  });
  const [cadastroConsentimentoWhatsapp, setCadastroConsentimentoWhatsapp] =
    useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarCliente() {
      try {
        const response = await fetch("/api/loja/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (!ativo) return;

        setCliente(data.cliente || null);
      } catch {
        if (!ativo) return;

        setCliente(null);
      } finally {
        if (!ativo) return;

        setCarregando(false);
      }
    }

    carregarCliente();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (!popoverRef.current) return;

      if (!popoverRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }

    if (aberto) {
      document.addEventListener("mousedown", fecharAoClicarFora);
    }

    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
    };
  }, [aberto]);

  function atualizarLogin(campo: keyof typeof loginForm, valor: string) {
    setLoginForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function atualizarCadastro(campo: keyof typeof cadastroForm, valor: string) {
    setCadastroForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function carregarClienteAtualizado() {
    const response = await fetch("/api/loja/auth/me", {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    setCliente(data.cliente || null);
  }

  async function entrar() {
    setErro("");

    if (!loginForm.identificador.trim()) {
      setErro("Informe e-mail, telefone ou CPF.");
      return;
    }

    if (!loginForm.senha) {
      setErro("Informe sua senha.");
      return;
    }

    setProcessando(true);

    try {
      const response = await fetch("/api/loja/auth/entrar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao entrar.");
        return;
      }

      await carregarClienteAtualizado();

      setAberto(false);
      setLoginForm({
        identificador: "",
        senha: "",
      });
    } catch {
      setErro("Erro ao entrar.");
    } finally {
      setProcessando(false);
    }
  }

  async function criarConta() {
    setErro("");

    if (!cadastroForm.nome.trim()) {
      setErro("Informe seu nome.");
      return;
    }

    if (!cadastroForm.telefone.trim()) {
      setErro("Informe seu telefone/WhatsApp.");
      return;
    }

    if (!cadastroForm.email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }

    if (!cadastroForm.documento.trim()) {
      setErro("Informe seu CPF.");
      return;
    }

    const cpfNumeros = cadastroForm.documento.replace(/\D/g, "");

    if (cpfNumeros.length !== 11) {
      setErro("Informe um CPF válido com 11 dígitos.");
      return;
    }

    if (cadastroForm.senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (cadastroForm.senha !== cadastroForm.confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }

    setProcessando(true);

    try {
      const response = await fetch("/api/loja/auth/cadastrar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...cadastroForm,
          consentimentoWhatsapp: cadastroConsentimentoWhatsapp,
        }),
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao criar conta.");
        return;
      }

      await carregarClienteAtualizado();

      setAberto(false);
    setCadastroForm({
      nome: "",
      telefone: "",
        email: "",
        documento: "",
        senha: "",
        confirmarSenha: "",
      });
      setCadastroConsentimentoWhatsapp(false);
    } catch {
      setErro("Erro ao criar conta.");
    } finally {
      setProcessando(false);
    }
  }

  async function sair() {
    await fetch("/api/loja/auth/sair", {
      method: "POST",
    });

    setCliente(null);
    setAberto(false);
  }

  function abrirPopup() {
    setErro("");
    setAberto((atual) => !atual);
  }

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={abrirPopup}
        title={
          cliente
            ? `Minha conta · ${moeda(cliente.cashbackSaldo)} em cashback`
            : "Entrar ou criar conta"
        }
        className={`inline-flex items-center justify-center gap-2 transition hover:text-[var(--brand-blue)] ${className}`}
      >
        <UserRound className="h-5 w-5" />

        {mostrarTexto && (
          <span className="text-sm font-medium">
            {carregando
              ? "Conta"
              : cliente
              ? cliente.nome.split(" ")[0] || "Minha conta"
              : "Entrar"}
          </span>
        )}

        {mostrarTexto && <ChevronDown className="h-4 w-4" />}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[340px] max-w-[calc(100vw-24px)] border border-slate-200 bg-white p-4 text-slate-950 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] brand-text">
                Conta Stella
              </p>

              <h3 className="mt-1 text-lg font-light tracking-tight text-slate-950">
                {cliente ? "Minha conta" : "Entrar ou criar conta"}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 transition hover:border-slate-950 hover:text-slate-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {cliente ? (
            <div className="mt-4">
              <div className="border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-4 py-3">
                <p className="text-sm font-medium text-slate-950">
                  {cliente.nome}
                </p>

                <p className="mt-1 text-xs text-slate-500">{cliente.email}</p>

                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-[var(--brand-blue)]">
                    Cashback
                  </span>

                  <strong className="text-[var(--brand-blue)]">
                    {moeda(cliente.cashbackSaldo)}
                  </strong>
                </div>
              </div>

              <Link
                href="/loja/minha-conta"
                onClick={() => setAberto(false)}
                className="mt-3 flex h-11 items-center justify-center border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Ver minha conta
              </Link>

              <button
                type="button"
                onClick={sair}
                className="mt-2 flex h-11 w-full items-center justify-center border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-2 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAba("ENTRAR");
                    setErro("");
                  }}
                  className={`h-10 text-sm font-medium transition ${
                    aba === "ENTRAR"
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Entrar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAba("CRIAR_CONTA");
                    setErro("");
                  }}
                  className={`h-10 text-sm font-medium transition ${
                    aba === "CRIAR_CONTA"
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Criar conta
                </button>
              </div>

              <a
                href="/api/loja/auth/google"
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-950"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold">
                  G
                </span>
                Entrar com Google
              </a>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  ou
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {erro && (
                <div className="mb-3 flex gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{erro}</p>
                </div>
              )}

              {aba === "ENTRAR" ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">
                      E-mail, telefone ou documento
                    </span>

                    <input
                      value={loginForm.identificador}
                      onChange={(event) =>
                        atualizarLogin("identificador", event.target.value)
                      }
                      className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">
                      Senha
                    </span>

                    <input
                      type="password"
                      value={loginForm.senha}
                      onChange={(event) =>
                        atualizarLogin("senha", event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          entrar();
                        }
                      }}
                      className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={entrar}
                    disabled={processando}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 brand-button px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogIn className="h-4 w-4" />
                    {processando ? "Entrando..." : "Entrar"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
                    <div className="flex gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Crie uma conta para acompanhar pedidos e acumular
                        cashback.
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">
                      Nome
                    </span>

                    <input
                      value={cadastroForm.nome}
                      onChange={(event) =>
                        atualizarCadastro("nome", event.target.value)
                      }
                      className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600">
                        Telefone
                      </span>

                      <input
                        value={cadastroForm.telefone}
                        onChange={(event) =>
                          atualizarCadastro("telefone", event.target.value)
                        }
                        className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600">
                        Documento
                      </span>

                    <input
                      value={cadastroForm.documento}
                      onChange={(event) =>
                        atualizarCadastro("documento", event.target.value)
                      }
                      placeholder="000.000.000-00"
                      className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                    />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">
                      E-mail
                    </span>

                    <input
                      value={cadastroForm.email}
                      onChange={(event) =>
                        atualizarCadastro("email", event.target.value)
                      }
                      className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600">
                        Senha
                      </span>

                      <input
                        type="password"
                        value={cadastroForm.senha}
                        onChange={(event) =>
                          atualizarCadastro("senha", event.target.value)
                        }
                        className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600">
                        Confirmar
                      </span>

                      <input
                        type="password"
                        value={cadastroForm.confirmarSenha}
                        onChange={(event) =>
                          atualizarCadastro(
                            "confirmarSenha",
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            criarConta();
                          }
                        }}
                        className="h-10 w-full border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                      />
                    </label>
                  </div>

                  <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={cadastroConsentimentoWhatsapp}
                      onChange={(event) =>
                        setCadastroConsentimentoWhatsapp(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-blue)]"
                    />

                    <span>
                      Quero receber novidades, lancamentos e ofertas da Stella
                      Colari pelo WhatsApp. Posso revogar quando quiser na Minha
                      Conta.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={criarConta}
                    disabled={processando}
                    className="inline-flex h-10 w-full items-center justify-center brand-button px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processando ? "Criando..." : "Criar conta"}
                  </button>
                </div>
              )}

              <Link
                href="/loja/entrar"
                onClick={() => setAberto(false)}
                className="mt-4 block text-center text-xs font-medium text-slate-500 underline underline-offset-4 hover:text-slate-950"
              >
                Abrir página completa de login
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
