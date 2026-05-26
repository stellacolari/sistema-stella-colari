"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

type LojaFormularioBlockProps = {
  config: Record<string, unknown>;
  pagina: {
    id: string;
    titulo: string;
    slug: string;
    tipo: string;
  };
  bloco: {
    id: string;
    tipo: string;
    titulo: string | null;
  };
};

function getString(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];

  if (typeof value === "string") {
    return value;
  }

  return fallback;
}

function getBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback = false
) {
  const value = config[key];

  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function getAlignClass(alinhamento: string) {
  if (alinhamento === "ESQUERDA") return "text-left";
  if (alinhamento === "DIREITA") return "text-right";
  return "text-center";
}

function getEspacamentoClass(espacamento: string) {
  if (espacamento === "PEQUENO") return "py-8";
  if (espacamento === "GRANDE") return "py-20";
  return "py-12";
}

function getFundoClasses(fundo: string) {
  if (fundo === "AZUL_CLARO") {
    return {
      section: "bg-[var(--brand-blue-soft)]",
      card: "bg-white border-slate-200",
      title: "text-slate-950",
      text: "text-slate-600",
    };
  }

  if (fundo === "AZUL_ESCURO") {
    return {
      section: "bg-[#2e7b99]",
      card: "bg-white/95 border-white/30",
      title: "text-white",
      text: "text-white/85",
    };
  }

  if (fundo === "ESCURO") {
    return {
      section: "bg-slate-950",
      card: "bg-white border-slate-200",
      title: "text-white",
      text: "text-white/75",
    };
  }

  return {
    section: "bg-white",
    card: "bg-white border-slate-200",
    title: "text-slate-950",
    text: "text-slate-600",
  };
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function LojaFormularioBlock({
  config,
  pagina,
  bloco,
}: LojaFormularioBlockProps) {
  const titulo = getString(config, "titulo", "Fale com a Stella");
  const descricao = getString(
    config,
    "descricao",
    "Preencha seus dados e entraremos em contato."
  );
  const textoBotao = getString(config, "textoBotao", "Enviar");
  const mensagemSucesso = getString(
    config,
    "mensagemSucesso",
    "Recebemos suas informações com sucesso."
  );

  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const fundo = getString(config, "fundo", "BRANCO");
  const espacamento = getString(config, "espacamento", "MEDIO");
  const largura = getString(config, "largura", "NORMAL");

  const mostrarNome = getBoolean(config, "mostrarNome", true);
  const mostrarTelefone = getBoolean(config, "mostrarTelefone", true);
  const mostrarEmail = getBoolean(config, "mostrarEmail", true);
  const mostrarCidade = getBoolean(config, "mostrarCidade", false);
  const mostrarMensagem = getBoolean(config, "mostrarMensagem", true);
  const mostrarMarketing = getBoolean(config, "mostrarMarketing", false);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    cidade: "",
    mensagem: "",
    aceiteTermos: false,
    aceitaMarketing: false,
  });

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const classes = getFundoClasses(fundo);

  const larguraClass =
    largura === "LARGA"
      ? "max-w-5xl"
      : largura === "ESTREITA"
      ? "max-w-2xl"
      : "max-w-3xl";

  function atualizarCampo<K extends keyof typeof form>(
    campo: K,
    valor: (typeof form)[K]
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function enviarFormulario(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setSucesso(false);

    if (!form.aceiteTermos) {
      setErro("Aceite os termos para enviar o formulário.");
      return;
    }

    if (
      (mostrarNome && !form.nome.trim()) &&
      (mostrarTelefone && !form.telefone.trim()) &&
      (mostrarEmail && !form.email.trim())
    ) {
      setErro("Informe pelo menos um contato.");
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch("/api/loja/formularios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paginaId: pagina.id,
          paginaTitulo: pagina.titulo,
          paginaSlug: pagina.slug,
          paginaTipo: pagina.tipo,

          blocoId: bloco.id,
          blocoTipo: bloco.tipo,
          blocoTitulo: bloco.titulo,

          nome: mostrarNome ? form.nome : "",
          telefone: mostrarTelefone ? form.telefone : "",
          email: mostrarEmail ? form.email : "",
          cidade: mostrarCidade ? form.cidade : "",
          mensagem: mostrarMensagem ? form.mensagem : "",

          aceiteTermos: form.aceiteTermos,
          aceitaMarketing: mostrarMarketing ? form.aceitaMarketing : false,

          origemUrl:
            typeof window !== "undefined" ? window.location.href : null,
        }),
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao enviar formulário.");
        return;
      }

      setSucesso(true);
      setForm({
        nome: "",
        telefone: "",
        email: "",
        cidade: "",
        mensagem: "",
        aceiteTermos: false,
        aceitaMarketing: false,
      });
    } catch {
      setErro("Erro ao enviar formulário.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={classes.section}>
      <div
        className={`mx-auto ${larguraClass} px-5 sm:px-6 lg:px-8 ${getEspacamentoClass(
          espacamento
        )}`}
      >
        <div className={getAlignClass(alinhamento)}>
          {titulo && (
            <h2
              className={`text-2xl font-semibold tracking-tight md:text-4xl ${classes.title}`}
            >
              {titulo}
            </h2>
          )}

          {descricao && (
            <p
              className={`mx-auto mt-3 max-w-2xl whitespace-pre-line text-sm font-medium leading-7 md:text-base ${classes.text}`}
            >
              {descricao}
            </p>
          )}
        </div>

        <form
          onSubmit={enviarFormulario}
          className={`mt-8 rounded-[2rem] border p-5 shadow-sm md:p-6 ${classes.card}`}
        >
          {sucesso ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center text-emerald-700">
              <CheckCircle2 className="mx-auto h-8 w-8" />

              <p className="mt-3 text-sm font-semibold">
                {mensagemSucesso}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                {mostrarNome && (
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Nome
                    </span>

                    <input
                      value={form.nome}
                      onChange={(event) =>
                        atualizarCampo("nome", event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                    />
                  </label>
                )}

                {mostrarTelefone && (
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Telefone/WhatsApp
                    </span>

                    <input
                      value={form.telefone}
                      onChange={(event) =>
                        atualizarCampo("telefone", event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                    />
                  </label>
                )}

                {mostrarEmail && (
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      E-mail
                    </span>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        atualizarCampo("email", event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                    />
                  </label>
                )}

                {mostrarCidade && (
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Cidade
                    </span>

                    <input
                      value={form.cidade}
                      onChange={(event) =>
                        atualizarCampo("cidade", event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                    />
                  </label>
                )}
              </div>

              {mostrarMensagem && (
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Mensagem
                  </span>

                  <textarea
                    value={form.mensagem}
                    onChange={(event) =>
                      atualizarCampo("mensagem", event.target.value)
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
                  />
                </label>
              )}

              <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                <input
                  type="checkbox"
                  checked={form.aceiteTermos}
                  onChange={(event) =>
                    atualizarCampo("aceiteTermos", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  Li e aceito os termos de contato e a política de privacidade.
                </span>
              </label>

              {mostrarMarketing && (
                <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.aceitaMarketing}
                    onChange={(event) =>
                      atualizarCampo("aceitaMarketing", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <span>
                    Aceito receber comunicações, novidades e ofertas da Stella.
                  </span>
                </label>
              )}

              {erro && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {enviando ? "Enviando..." : textoBotao}
              </button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}