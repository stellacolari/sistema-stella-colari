"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, PackageCheck, Save } from "lucide-react";

export type FreteConfiguracao = {
  provedor: "MELHOR_ENVIO" | "MANUAL" | "DESATIVADO";
  ambiente: "sandbox" | "production";
  cepOrigem: string;
  userAgent: string;
  pesoFallbackKg: number;
  alturaFallbackCm: number;
  larguraFallbackCm: number;
  comprimentoFallbackCm: number;
  prazoAdicionalDias: number;
  valorAdicional: number;
  retiradaLocalHabilitada: boolean;
  retiradaLocalTexto: string;
  melhorEnvioTokenConfigurado: boolean;
};

function numeroParaInput(value: number | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value).replace(".", ",");
}

export default function FreteConfiguracaoClient({
  config,
}: {
  config: FreteConfiguracao;
}) {
  const [provedor, setProvedor] = useState(config.provedor);
  const [ambiente, setAmbiente] = useState(config.ambiente);
  const [cepOrigem, setCepOrigem] = useState(config.cepOrigem);
  const [userAgent, setUserAgent] = useState(config.userAgent);
  const [pesoFallbackKg, setPesoFallbackKg] = useState(
    numeroParaInput(config.pesoFallbackKg)
  );
  const [alturaFallbackCm, setAlturaFallbackCm] = useState(
    numeroParaInput(config.alturaFallbackCm)
  );
  const [larguraFallbackCm, setLarguraFallbackCm] = useState(
    numeroParaInput(config.larguraFallbackCm)
  );
  const [comprimentoFallbackCm, setComprimentoFallbackCm] = useState(
    numeroParaInput(config.comprimentoFallbackCm)
  );
  const [prazoAdicionalDias, setPrazoAdicionalDias] = useState(
    String(config.prazoAdicionalDias || 0)
  );
  const [valorAdicional, setValorAdicional] = useState(
    numeroParaInput(config.valorAdicional)
  );
  const [retiradaLocalHabilitada, setRetiradaLocalHabilitada] = useState(
    config.retiradaLocalHabilitada
  );
  const [retiradaLocalTexto, setRetiradaLocalTexto] = useState(
    config.retiradaLocalTexto
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function salvar() {
    setErro("");
    setSucesso("");
    setSalvando(true);

    try {
      const response = await fetch("/api/configuracoes/loja/frete", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provedor,
          ambiente,
          cepOrigem,
          userAgent,
          pesoFallbackKg,
          alturaFallbackCm,
          larguraFallbackCm,
          comprimentoFallbackCm,
          prazoAdicionalDias,
          valorAdicional,
          retiradaLocalHabilitada,
          retiradaLocalTexto,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao salvar configuração de frete.");
        return;
      }

      setSucesso("Configuração de frete salva com sucesso.");
    } catch {
      setErro("Erro ao salvar configuração de frete.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {(erro || sucesso) && (
          <div className="space-y-3">
            {erro && (
              <div className="flex gap-3 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{erro}</p>
              </div>
            )}

            {sucesso && (
              <div className="flex gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{sucesso}</p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <PackageCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Frete e entrega
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Defina a origem, fallback de pacote e modos disponíveis no
                checkout.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Provedor ativo
              </span>

              <select
                value={provedor}
                onChange={(event) =>
                  setProvedor(event.target.value as FreteConfiguracao["provedor"])
                }
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="MELHOR_ENVIO">Melhor Envio</option>
                <option value="MANUAL">Manual</option>
                <option value="DESATIVADO">Desativado</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Ambiente Melhor Envio
              </span>

              <select
                value={ambiente}
                onChange={(event) =>
                  setAmbiente(event.target.value as FreteConfiguracao["ambiente"])
                }
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                CEP de origem
              </span>

              <input
                value={cepOrigem}
                onChange={(event) => setCepOrigem(event.target.value)}
                placeholder="00000000"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                User-Agent / aplicação
              </span>

              <input
                value={userAgent}
                onChange={(event) => setUserAgent(event.target.value)}
                placeholder="Sistema Stella (email@dominio.com)"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Peso fallback (kg)
              </span>

              <input
                value={pesoFallbackKg}
                onChange={(event) => setPesoFallbackKg(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Altura fallback (cm)
              </span>

              <input
                value={alturaFallbackCm}
                onChange={(event) => setAlturaFallbackCm(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Largura fallback (cm)
              </span>

              <input
                value={larguraFallbackCm}
                onChange={(event) => setLarguraFallbackCm(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Comprimento fallback (cm)
              </span>

              <input
                value={comprimentoFallbackCm}
                onChange={(event) =>
                  setComprimentoFallbackCm(event.target.value)
                }
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Prazo adicional (dias)
              </span>

              <input
                value={prazoAdicionalDias}
                onChange={(event) => setPrazoAdicionalDias(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Valor adicional (R$)
              </span>

              <input
                value={valorAdicional}
                onChange={(event) => setValorAdicional(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={retiradaLocalHabilitada}
                onChange={(event) =>
                  setRetiradaLocalHabilitada(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Habilitar retirada local
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  O checkout exibirá uma opção de retirada com frete R$ 0.
                </span>
              </span>
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Observação de retirada local
              </span>

              <textarea
                value={retiradaLocalTexto}
                onChange={(event) => setRetiradaLocalTexto(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar configuração"}
            </button>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-[2rem] border border-blue-200 bg-blue-50 p-5 text-blue-900">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Status operacional
        </h3>

        <div className="mt-4 space-y-3 text-sm leading-6">
          <p>
            <strong>Token Melhor Envio:</strong>{" "}
            {config.melhorEnvioTokenConfigurado
              ? "configurado no ambiente"
              : "não configurado"}
          </p>

          <p>
            <strong>Provedor:</strong> {provedor}
          </p>

          <p>
            <strong>Retirada local:</strong>{" "}
            {retiradaLocalHabilitada ? "habilitada" : "desabilitada"}
          </p>
        </div>

        <div className="mt-5 rounded-3xl bg-white/70 p-4 text-xs leading-5 text-blue-800">
          O token continua fora do banco. Configure MELHOR_ENVIO_TOKEN no
          ambiente da aplicação.
        </div>
      </aside>
    </section>
  );
}

