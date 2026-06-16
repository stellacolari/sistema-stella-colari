"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import type {
  BuscaLojaCategoria,
  BuscaLojaFiltrosDetectados,
  BuscaLojaPagina,
  BuscaLojaProduto,
} from "@/lib/loja/busca";

const BUSCAS_RECENTES_KEY = "stella-buscas-recentes";

type OrdenacaoBusca = "RELEVANCIA" | "MENOR_PRECO" | "MAIOR_PRECO" | "AZ" | "ZA" | "RECENTES";

type BuscaLojaClientProps = {
  termoInicial: string;
  produtos: BuscaLojaProduto[];
  categorias: BuscaLojaCategoria[];
  paginas: BuscaLojaPagina[];
  sugestoes: string[];
  filtrosDetectados: BuscaLojaFiltrosDetectados;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function precoFinalProduto(produto: BuscaLojaProduto) {
  if (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  ) {
    return produto.precoPromocional;
  }

  return produto.precoVenda;
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
  categorias,
  paginas,
  sugestoes,
  filtrosDetectados,
}: BuscaLojaClientProps) {
  const [termo, setTermo] = useState(termoInicial);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoBusca>("RELEVANCIA");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [precoFiltro, setPrecoFiltro] = useState("");
  const [disponibilidadeFiltro, setDisponibilidadeFiltro] = useState("");
  const [tamanhoFiltro, setTamanhoFiltro] = useState(filtrosDetectados.medida || "");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [buscasRecentes, setBuscasRecentes] = useState<string[]>([]);

  useEffect(() => {
    setBuscasRecentes(lerBuscasRecentes());
  }, []);

  useEffect(() => {
    if (!termoInicial.trim()) return;

    salvarBuscaRecente(termoInicial);
    setBuscasRecentes(lerBuscasRecentes());
  }, [termoInicial]);

  const categoriasDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          produtos.flatMap((produto) => [
            produto.categoria,
            ...produto.categoriaNomes,
          ])
        )
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [produtos]
  );

  const tamanhosDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          produtos.flatMap((produto) =>
            produto.tamanhosDisponiveis.map((tamanho) => tamanho.tamanhoAnel)
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [produtos]
  );

  const produtosFiltrados = useMemo(() => {
    let resultado = [...produtos];

    if (categoriaFiltro) {
      resultado = resultado.filter(
        (produto) =>
          produto.categoria === categoriaFiltro ||
          produto.categoriaNomes.includes(categoriaFiltro)
      );
    }

    if (precoFiltro) {
      const [min, max] = precoFiltro.split("-").map(Number);

      resultado = resultado.filter((produto) => {
        const preco = precoFinalProduto(produto);

        if (Number.isFinite(min) && preco < min) return false;
        if (Number.isFinite(max) && max > 0 && preco > max) return false;

        return true;
      });
    }

    if (disponibilidadeFiltro === "DISPONIVEL") {
      resultado = resultado.filter((produto) => produto.estoqueTotal > 0);
    }

    if (disponibilidadeFiltro === "SEM_ESTOQUE") {
      resultado = resultado.filter((produto) => produto.estoqueTotal <= 0);
    }

    if (tamanhoFiltro) {
      resultado = resultado.filter((produto) =>
        produto.tamanhosDisponiveis.some(
          (tamanho) => tamanho.tamanhoAnel === tamanhoFiltro
        )
      );
    }

    resultado.sort((a, b) => {
      if (ordenacao === "MENOR_PRECO") return precoFinalProduto(a) - precoFinalProduto(b);
      if (ordenacao === "MAIOR_PRECO") return precoFinalProduto(b) - precoFinalProduto(a);
      if (ordenacao === "AZ") return a.nome.localeCompare(b.nome);
      if (ordenacao === "ZA") return b.nome.localeCompare(a.nome);
      if (ordenacao === "RECENTES") {
        return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      }

      return b.relevancia - a.relevancia || a.nome.localeCompare(b.nome);
    });

    return resultado;
  }, [
    categoriaFiltro,
    disponibilidadeFiltro,
    ordenacao,
    precoFiltro,
    produtos,
    tamanhoFiltro,
  ]);

  const temResultados =
    produtos.length > 0 || categorias.length > 0 || paginas.length > 0;

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

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {produtosFiltrados.length} produto(s), {categorias.length} categoria(s),{" "}
              {paginas.length} pagina(s)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFiltrosAbertos((current) => !current)}
            className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-500 sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className={`${filtrosAbertos ? "block" : "hidden"} lg:block`}>
            <div className="space-y-3 border border-slate-200 bg-white p-4">
              <select
                value={ordenacao}
                onChange={(event) => setOrdenacao(event.target.value as OrdenacaoBusca)}
                className="h-11 w-full border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
              >
                <option value="RELEVANCIA">Mais relevantes</option>
                <option value="MENOR_PRECO">Menor preco</option>
                <option value="MAIOR_PRECO">Maior preco</option>
                <option value="AZ">A-Z</option>
                <option value="ZA">Z-A</option>
                <option value="RECENTES">Mais recentes</option>
              </select>

              {categoriasDisponiveis.length > 0 ? (
                <select
                  value={categoriaFiltro}
                  onChange={(event) => setCategoriaFiltro(event.target.value)}
                  className="h-11 w-full border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                >
                  <option value="">Todas as categorias</option>
                  {categoriasDisponiveis.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              ) : null}

              <select
                value={precoFiltro}
                onChange={(event) => setPrecoFiltro(event.target.value)}
                className="h-11 w-full border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
              >
                <option value="">Todos os precos</option>
                <option value="0-100">Ate R$ 100</option>
                <option value="100-200">R$ 100 a R$ 200</option>
                <option value="200-0">Acima de R$ 200</option>
              </select>

              {tamanhosDisponiveis.length > 0 ? (
                <select
                  value={tamanhoFiltro}
                  onChange={(event) => setTamanhoFiltro(event.target.value)}
                  className="h-11 w-full border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                >
                  <option value="">Todos os tamanhos</option>
                  {tamanhosDisponiveis.map((tamanho) => (
                    <option key={tamanho} value={tamanho}>
                      {tamanho}
                    </option>
                  ))}
                </select>
              ) : null}

              <select
                value={disponibilidadeFiltro}
                onChange={(event) => setDisponibilidadeFiltro(event.target.value)}
                className="h-11 w-full border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
              >
                <option value="">Disponibilidade</option>
                <option value="DISPONIVEL">Disponivel</option>
                <option value="SEM_ESTOQUE">Sem estoque</option>
              </select>
            </div>
          </aside>

          <div className="min-w-0">
            {produtosFiltrados.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {produtosFiltrados.map((produto, index) => (
                  <ProdutoCardLoja
                    key={produto.id}
                    produto={produto}
                    revealDelayMs={index * 50}
                  />
                ))}
              </div>
            ) : temResultados ? (
              <div className="border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-950">
                  Nenhum produto encontrado com os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-950">
                  {`Nao encontramos resultados para "${termoInicial}".`}
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Confira a escrita ou tente termos como anel, brinco ou colar.
                </p>
              </div>
            )}

            {categorias.length > 0 ? (
              <section className="mt-12">
                <h2 className="text-xl font-semibold text-slate-950">
                  Categorias encontradas
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {categorias.map((categoria) => (
                    <Link
                      key={categoria.id}
                      href={categoria.href}
                      className="border border-slate-200 bg-white p-4 transition hover:border-[var(--brand-blue)]"
                    >
                      <p className="font-semibold text-slate-950">{categoria.nome}</p>
                      {categoria.descricao ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {categoria.descricao}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {paginas.length > 0 ? (
              <section className="mt-12">
                <h2 className="text-xl font-semibold text-slate-950">
                  Paginas encontradas
                </h2>
                <div className="mt-4 grid gap-3">
                  {paginas.map((pagina) => (
                    <Link
                      key={pagina.id}
                      href={pagina.href}
                      className="border border-slate-200 bg-white p-4 transition hover:border-[var(--brand-blue)]"
                    >
                      <p className="font-semibold text-slate-950">{pagina.titulo}</p>
                      {pagina.descricao ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {pagina.descricao}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {!temResultados && sugestoes.length > 0 ? (
              <section className="mt-8">
                <p className="text-sm font-semibold text-slate-700">
                  Sugestoes para tentar:
                </p>
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
        </div>
      </section>
    </main>
  );
}
