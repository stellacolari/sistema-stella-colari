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
    <main className="store-flow min-h-screen bg-white text-[#27251f]">
      <section className="store-page-header px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-[var(--store-page-max)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#70695e]">
                Loja Stella Colari
              </p>
              <h1 className="store-editorial-title mt-4 text-4xl font-normal leading-none tracking-[-0.04em] text-[#27251f] sm:text-6xl">
                Busca
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[#645e54] sm:text-base">
                {termoInicial
                  ? `Resultados para "${termoInicial}"`
                  : "Encontre joias, acessorios e presentes."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <label className="flex h-14 items-center gap-3 border-b border-[#27251f] bg-transparent px-0 transition focus-within:border-[#7b7161]">
                <Search className="h-5 w-5 text-[#70695e]" />
                <input
                  type="search"
                  name="q"
                  aria-label="Buscar produtos"
                  value={termo}
                  onChange={(event) => setTermo(event.target.value)}
                  placeholder="Buscar por anel dourado, presente ate 100..."
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-[#27251f] outline-none placeholder:text-[#8d8578]"
                />
                {termo ? (
                  <button
                    type="button"
                    onClick={() => setTermo("")}
                    aria-label="Limpar busca"
                    className="text-[#81796c] transition hover:text-[#27251f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#27251f]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                ) : null}
              </label>
            </form>
          </div>

          {buscasRecentes.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#777064]">
                Recentes
              </span>
              {buscasRecentes.map((busca) => (
                <Link
                  key={busca}
                  href={`/loja/busca?q=${encodeURIComponent(busca)}`}
                  className="border border-[#27251f]/20 px-3 py-1.5 text-xs font-medium text-[#4f4a42] transition hover:border-[#27251f] hover:bg-[#f3f3f1]"
                >
                  {busca}
                </Link>
              ))}
              <button
                type="button"
                onClick={limparHistorico}
                className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81796c] transition hover:text-[#27251f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
              >
                Limpar
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="store-page-content py-12 sm:py-16">
        {termoInicial && filtrosDetectados.precoMaximo ? (
          <div className="mb-4 border-y border-[#27251f]/20 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f594f]">
            Preco maximo detectado: {moeda(filtrosDetectados.precoMaximo)}
          </div>
        ) : null}

        {termoInicial && filtrosDetectados.medida ? (
          <div className="mb-4 border-y border-[#27251f]/20 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f594f]">
            Medida detectada: aro/tamanho {filtrosDetectados.medida}
          </div>
        ) : null}

        <div className="min-w-0 space-y-10">
          <section>
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#777064]">
                Produtos encontrados
              </p>
              <h2 className="mt-2 text-2xl font-normal uppercase tracking-[-0.02em] text-[#27251f]">
                Resultados para compra
              </h2>
            </div>

            <LojaFiltrosProdutos
              produtos={produtos}
              defaultOrder="destaque"
              gridClassName="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4"
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
                />
              )}
            />
          </section>

            {sugestoes.length > 0 ? (
              <section>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#777064]">
                    Sugestões
                  </p>
                  <h2 className="mt-2 text-2xl font-normal uppercase tracking-[-0.02em] text-[#27251f]">
                    Continue buscando
                  </h2>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sugestoes.map((sugestao) => (
                    <Link
                      key={sugestao}
                      href={`/loja/busca?q=${encodeURIComponent(sugestao)}`}
                      className="border border-[#27251f]/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#4f4a42] transition hover:border-[#27251f] hover:bg-[#f3f3f1]"
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
