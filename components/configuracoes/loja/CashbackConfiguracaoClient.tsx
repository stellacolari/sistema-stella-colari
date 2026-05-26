"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Save, Sparkles } from "lucide-react";

export type CashbackConfiguracao = {
  id: string;
  ativo: boolean;
  percentualPrimeiraCompra: number;
  percentualCompraRecorrente: number;
  somenteClienteCadastrado: boolean;
  permitirComCupom: boolean;
  permitirProdutoComDesconto: boolean;
  diasValidade: number | null;
};

function numeroParaInput(value: number | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value).replace(".", ",");
}

function parseInput(value: string) {
  return value.replace(",", ".");
}

export default function CashbackConfiguracaoClient({
  config,
}: {
  config: CashbackConfiguracao;
}) {
  const [ativo, setAtivo] = useState(config.ativo);
  const [percentualPrimeiraCompra, setPercentualPrimeiraCompra] = useState(
    numeroParaInput(config.percentualPrimeiraCompra)
  );
  const [percentualCompraRecorrente, setPercentualCompraRecorrente] = useState(
    numeroParaInput(config.percentualCompraRecorrente)
  );
  const [somenteClienteCadastrado, setSomenteClienteCadastrado] = useState(
    config.somenteClienteCadastrado
  );
  const [permitirComCupom, setPermitirComCupom] = useState(
    config.permitirComCupom
  );
  const [permitirProdutoComDesconto, setPermitirProdutoComDesconto] = useState(
    config.permitirProdutoComDesconto
  );
  const [diasValidade, setDiasValidade] = useState(
    config.diasValidade ? String(config.diasValidade) : ""
  );

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function salvar() {
    setErro("");
    setSucesso("");
    setSalvando(true);

    try {
      const response = await fetch("/api/configuracoes/loja/cashback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativo,
          percentualPrimeiraCompra: parseInput(percentualPrimeiraCompra),
          percentualCompraRecorrente: parseInput(percentualCompraRecorrente),
          somenteClienteCadastrado,
          permitirComCupom,
          permitirProdutoComDesconto,
          diasValidade,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao salvar configuração.");
        return;
      }

      setSucesso("Configuração de cashback salva com sucesso.");
    } catch {
      setErro("Erro ao salvar configuração.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
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
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Regras principais
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Defina os percentuais e quando o cashback pode ser gerado.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(event) => setAtivo(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Cashback ativo
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Quando desativado, nenhum pedido gera cashback.
                  </span>
                </span>
              </div>
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={somenteClienteCadastrado}
                  onChange={(event) =>
                    setSomenteClienteCadastrado(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Apenas cliente cadastrado
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Compras sem cadastro não acumulam saldo real.
                  </span>
                </span>
              </div>
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Cashback na primeira compra (%)
              </label>

              <input
                value={percentualPrimeiraCompra}
                onChange={(event) =>
                  setPercentualPrimeiraCompra(event.target.value)
                }
                placeholder="Ex: 10"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Recomendado: 10%. Aplicado apenas na primeira compra com
                cadastro.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Cashback recorrente (%)
              </label>

              <input
                value={percentualCompraRecorrente}
                onChange={(event) =>
                  setPercentualCompraRecorrente(event.target.value)
                }
                placeholder="Ex: 5"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Recomendado: 5%. Aplicado a partir da segunda compra.
              </p>
            </div>

            <label className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={permitirComCupom}
                  onChange={(event) => setPermitirComCupom(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Permitir cashback com cupom
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Recomendo deixar desligado para evitar benefício duplicado.
                  </span>
                </span>
              </div>
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={permitirProdutoComDesconto}
                  onChange={(event) =>
                    setPermitirProdutoComDesconto(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Permitir cashback em produto com desconto
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Se desligado, produtos promocionais não geram cashback.
                  </span>
                </span>
              </div>
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Validade do cashback em dias
              </label>

              <input
                value={diasValidade}
                onChange={(event) => setDiasValidade(event.target.value)}
                placeholder="Opcional. Ex: 180"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Deixe em branco para não aplicar validade automática por
                enquanto.
              </p>
            </div>
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
          Regra recomendada
        </h3>

        <div className="mt-4 space-y-4 text-sm leading-6">
          <p>
            <strong>Primeira compra com cadastro:</strong>{" "}
            {percentualPrimeiraCompra || "0"}% de cashback.
          </p>

          <p>
            <strong>A partir da segunda compra:</strong>{" "}
            {percentualCompraRecorrente || "0"}% de cashback.
          </p>

          <p>
            <strong>Com cupom:</strong>{" "}
            {permitirComCupom ? "gera cashback" : "não gera cashback"}.
          </p>

          <p>
            <strong>Sem cadastro:</strong>{" "}
            {somenteClienteCadastrado
              ? "não acumula cashback"
              : "pode acumular cashback"}.
          </p>
        </div>

        <div className="mt-5 rounded-3xl bg-white/70 p-4 text-xs leading-5 text-blue-800">
          O cashback deve ficar como previsto no pedido e só ser creditado no
          saldo do cliente após pagamento confirmado.
        </div>
      </aside>
    </section>
  );
}