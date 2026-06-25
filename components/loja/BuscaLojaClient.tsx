"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import LojaFiltrosProdutos from "@/components/loja/LojaFiltrosProdutos";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import type {
  BuscaLojaFiltrosDetectados,
  BuscaLojaProduto,
} from "@/lib/loja/busca";
import {
  registrarBuscaRealizada,
  registrarBuscaSemResultado,
} from "@/lib/loja/eventos-client";

const BUSCAS_RECENTES_KEY = "stella-buscas-recentes";

type BuscaLojaClientProps = {
  termoInicial: string;
  produtos: BuscaLojaProduto[];
  sugestoes: string[];
  filtrosDetectados: BuscaLojaFiltrosDetectados;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function lerBuscasRecentes() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(BUSCAS_RECENTES_KEY) || "[]");

    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string").slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function salvarBuscaRecente(termo: string) {
  if (typeof window === "undefined") return;

  const termoLimpo = termo.trim();
  if (!termoLimpo) return;

  const atuais = lerBuscasRecentes();
  const proximas = [
    termoLimpo,
    ...atuais.filter((item) => item.toLowerCase() !== termoLimpo.toLowerCase()),
  ].slice(0, 5);

  window.localStorage.setItem(BUSCAS_RECENTES_KEY, JSON.stringify(proximas));
}

export default function BuscaLojaClient({
  termoInicial,
  produtos,
  sugestoes,
  filtrosDetectados,
}: BuscaLojaClientProps) {
  const [termo, setTermo] = useState(termoInicial);
  const [buscasRecentes, setBuscasRecentes] = useState<string[]>([]);

  useEffect(() => {
    setBuscasRecentes(lerBuscasRecentes());
  }, []);

  useEffect(() => {
    if (!termoInicial.trim()) return;

    salvarBuscaRecente(termoInicial);
    setBuscasRecentes(lerBuscasRecentes());
  }, [termoInicial]);

  const temResultados = produtos.length > 0;

  useEffect(() => {
    const termoLimpo = termoInicial.trim();

    if (!termoLimpo) return;

    const metadata = {
      produtos: produtos.length,
      filtros: filtrosDetectados,
    };

    registrarBuscaRealizada({
      termoBusca: termoLimpo,
      origem: "pagina_busca",
      metadata,
    });

    if (!temResultados) {
      registrarBuscaSemResultado({
        termoBusca: termoLimpo,
        origem: "pagina_busca",
        metadata,
      });
    }
  }, [
    filtrosDetectados,
    produtos.length,
    temResultados,
    termoInicial,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const termoLimpo = termo.trim();
    if (!termoLimpo) return;

    salvarBuscaRecente(termoLimpo);
    window.location.href = `/loja/busca?q=${encodeURIComponent(termoLimpo)}`;
  }

  function limparHistorico() {
    window.localStorage.removeItem(BUSCAS_RECENTES_KEY);
    setBuscasRecentes([]);
  }

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-5 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] brand-text">
                Loja Stella Colari
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Busca
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {termoInicial
                  ? `Resultados para "${termoInicial}"`
                  : "Encontre joias, acessorios e presentes."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <label className="flex h-14 items-center gap-3 border border-slate-300 bg-white px-4 transition focus-within:border-[var(--brand-blue)]">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={termo}
                  onChange={(event) => setTermo(event.target.value)}
                  placeholder="Buscar por anel dourado, presente ate 100..."
                  className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
                />
                {termo ? (
                  <button
                    type="button"
                    onClick={() => setTermo("")}
                    aria-label="Limpar busca"
                    className="text-slate-400 transition hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                ) : null}
              </label>
            </form>
          </div>

          {buscasRecentes.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Recentes
              </span>
              {buscasRecentes.map((busca) => (
                <Link
                  key={busca}
                  href={`/loja/busca?q=${encodeURIComponent(busca)}`}
                  className="border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                >
                  {busca}
                </Link>
              ))}
              <button
                type="button"
                onClick={limparHistorico}
                className="px-2 py-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-900"
              >
                Limpar
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        {termoInicial && filtrosDetectados.precoMaximo ? (
          <div className="mb-4 border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
            Preco maximo detectado: {moeda(filtrosDetectados.precoMaximo)}
          </div>
        ) : null}

        {termoInicial && filtrosDetectados.medida ? (
          <div className="mb-4 border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
            Medida detectada: aro/tamanho {filtrosDetectados.medida}
          </div>
        ) : null}

        <div className="min-w-0 space-y-10">
          <section>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] brand-text">
                Produtos encontrados
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Resultados para compra
              </h2>
            </div>

            <LojaFiltrosProdutos
              produtos={produtos}
              defaultOrder="relevancia"
              gridClassName="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
              emptyTitle={
                temResultados
                  ? "Nenhum produto encontrado com esses filtros."
                  : "Nenhum produto encontrado."
              }
              emptyDescription={
                temResultados
                  ? "Tente remover algum filtro ou buscar por outro termo."
                  : "Confira a escrita ou tente termos como anel, brinco ou colar."
              }
              renderProduto={(produto, index) => (
                <ProdutoCardLoja
                  produto={produto}
                  revealDelayMs={index * 50}
                  trackingOrigem="pagina_busca"
                  trackingResultadoBusca={{
                    termoBusca: termoInicial,
                    posicao: index + 1,
                  }}
                  trackingMetadata={{
                    relevancia: produto.relevancia,
                  }}
                />
              )}
            />
          </section>

            {sugestoes.length > 0 ? (
              <section>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] brand-text">
                    Sugestões
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    Continue buscando
                  </h2>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sugestoes.map((sugestao) => (
                    <Link
                      key={sugestao}
                      href={`/loja/busca?q=${encodeURIComponent(sugestao)}`}
                      className="border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                    >
                      {sugestao}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
        </div>
      </section>
    </main>
  );
}
