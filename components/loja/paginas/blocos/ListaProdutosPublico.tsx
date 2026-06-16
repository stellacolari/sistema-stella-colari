"use client";

import { useMemo, useState } from "react";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import CarouselScrollArea from "@/components/loja/paginas/CarouselScrollArea";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getBackgroundClass,
  getBoolean,
  getGridColumnsClass,
  getNumber,
  getRichText,
  getResponsiveTextAlignClass,
  getSpacingClass,
  getArray,
  getString,
  getStringWithDefault,
  hasTextContent,
  getTextColorForBackground,
  produtoTemDesconto,
  type BlocoPublicoProps,
  type ProdutoPublico,
} from "@/components/loja/paginas/blocos/utils";

type FiltrosCategoria = {
  tamanho: string;
  ordenacao: string;
  disponibilidade: string;
};

function precoFinalProduto(produto: ProdutoPublico) {
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

function filtrarProdutos(produtos: ProdutoPublico[], config: Record<string, unknown>) {
  const fonte = getString(config, "fonte", "TODOS");
  const categoriaId = getString(config, "categoriaId");
  const categoriaSlug = getString(config, "categoriaSlug");
  const categoriaNome = getString(config, "categoriaNome");
  const categoriasIds = getArray(config, "categoriasIds").map(String);
  const categoriasLegadas = getArray(config, "categorias").map(String);
  const categoriasSlugs = getArray(config, "categoriasSlugs").map(String);
  const categoriasNomes = getArray(config, "categoriasNomes").map(String);
  const produtosIds = getArray(config, "produtosIds").map(String);
  let resultado = [...produtos];

  if (fonte === "DESCONTOS") {
    resultado = resultado.filter(produtoTemDesconto);
  }

  if (fonte === "NOVOS") {
    resultado = resultado.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  }

  if (fonte === "MAIS_VENDIDOS") {
    resultado = resultado.sort((a, b) => b.vendidosTotal - a.vendidosTotal);
  }

  if (fonte === "CATEGORIA") {
    if (!categoriaId && !categoriaSlug && !categoriaNome) {
      return [];
    }

    resultado = resultado.filter((produto) => {
      return (
        Boolean(categoriaId && produto.categoriaIds?.includes(categoriaId)) ||
        Boolean(categoriaSlug && produto.categoriaSlugs?.includes(categoriaSlug)) ||
        Boolean(
          categoriaNome &&
            (produto.categoria === categoriaNome ||
              produto.categoriaNomes?.includes(categoriaNome))
        )
      );
    });
  }

  if (fonte === "CATEGORIAS_SELECIONADAS") {
    const ids = categoriasIds.length > 0 ? categoriasIds : categoriasLegadas;

    if (
      ids.length === 0 &&
      categoriasSlugs.length === 0 &&
      categoriasNomes.length === 0
    ) {
      return [];
    }

    resultado = resultado.filter((produto) => {
      return (
        ids.some((id) => produto.categoriaIds?.includes(id)) ||
        categoriasSlugs.some((slug) => produto.categoriaSlugs?.includes(slug)) ||
        categoriasNomes.some(
          (nome) =>
            produto.categoria === nome || produto.categoriaNomes?.includes(nome)
        ) ||
        categoriasLegadas.includes(produto.categoria)
      );
    });
  }

  if (fonte === "MANUAL") {
    if (produtosIds.length === 0) return [];

    const ordem = new Map(produtosIds.map((id, index) => [id, index]));

    resultado = resultado
      .filter((produto) => ordem.has(produto.id))
      .sort(
        (a, b) => Number(ordem.get(a.id) ?? 0) - Number(ordem.get(b.id) ?? 0)
      );
  }

  return resultado.slice(0, Math.max(1, getNumber(config, "limite", 8)));
}

function aplicarFiltrosCategoria(
  produtos: ProdutoPublico[],
  filtros: FiltrosCategoria
) {
  let resultado = [...produtos];

  if (filtros.tamanho) {
    resultado = resultado.filter((produto) =>
      produto.tamanhosDisponiveis?.some(
        (tamanho) =>
          tamanho.tamanhoAnel === filtros.tamanho &&
          Number(tamanho.quantidadeAtual || 0) > 0
      )
    );
  }

  if (filtros.disponibilidade === "DISPONIVEL") {
    resultado = resultado.filter((produto) => produto.estoqueTotal > 0);
  }

  if (filtros.disponibilidade === "SEM_ESTOQUE") {
    resultado = resultado.filter((produto) => produto.estoqueTotal <= 0);
  }

  if (filtros.ordenacao === "MENOR_PRECO") {
    resultado.sort((a, b) => precoFinalProduto(a) - precoFinalProduto(b));
  }

  if (filtros.ordenacao === "MAIOR_PRECO") {
    resultado.sort((a, b) => precoFinalProduto(b) - precoFinalProduto(a));
  }

  if (filtros.ordenacao === "AZ") {
    resultado.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  if (filtros.ordenacao === "ZA") {
    resultado.sort((a, b) => b.nome.localeCompare(a.nome));
  }

  if (filtros.ordenacao === "MAIS_RECENTES") {
    resultado.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  }

  return resultado;
}

export default function ListaProdutosPublico({
  bloco,
  produtos = [],
  listaCompletaProdutos = false,
}: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const produtosFiltrados = filtrarProdutos(produtos, config);
  const [filtrosCategoria, setFiltrosCategoria] = useState<FiltrosCategoria>({
    tamanho: "",
    ordenacao: "",
    disponibilidade: "",
  });
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const layoutMobile = getString(config, "layoutMobile", "GRID");
  const layoutDesktop = getString(config, "layoutDesktop", "GRID");
  const isCarousel = layoutMobile === "CARROSSEL" || layoutDesktop === "CARROSSEL";
  const exibirSetasCarrossel = getBoolean(config, "exibirSetasCarrossel", true);
  const posicaoSetasCarrossel = getString(
    config,
    "posicaoSetasCarrossel",
    "LATERAIS"
  );
  const estiloSetasCarrossel = getString(
    config,
    "estiloSetasCarrossel",
    "CIRCULO"
  );
  const navegarPor = getString(config, "navegarPor", "PAGINA");
  const sectionAlign = getResponsiveTextAlignClass({
    desktop: getString(config, "alinhamentoTextoDesktop", "CENTRO"),
    mobile: getString(
      config,
      "alinhamentoTextoMobile",
      getString(config, "alinhamentoTextoDesktop", "CENTRO")
    ),
    fallback: "CENTRO",
  });
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, [
    "subtituloRichText",
    "textoRichText",
  ]);
  const titulo = getString(config, "titulo");
  const subtitulo = getString(config, ["subtitulo", "descricao", "texto"]);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasSubtitulo = hasTextContent(subtituloRichText, subtitulo);
  const textoBotao = getStringWithDefault(config, "textoBotao", "Comprar");
  const ehListaCompletaCategoria =
    listaCompletaProdutos || getString(config, "fonte") === "CATEGORIA_ATUAL";
  const tamanhosDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          produtosFiltrados.flatMap((produto) =>
            (produto.tamanhosDisponiveis || [])
              .filter((tamanho) => Number(tamanho.quantidadeAtual || 0) > 0)
              .map((tamanho) => tamanho.tamanhoAnel)
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [produtosFiltrados]
  );
  const exibirFiltrosCategoria =
    ehListaCompletaCategoria && produtosFiltrados.length > 0;
  const produtosComFiltros = exibirFiltrosCategoria
    ? aplicarFiltrosCategoria(produtosFiltrados, filtrosCategoria)
    : produtosFiltrados;
  const deveLimitar = !ehListaCompletaCategoria && produtosComFiltros.length > 4;
  const produtosVisiveis =
    deveLimitar && !mostrarTodos ? produtosComFiltros.slice(0, 4) : produtosComFiltros;

  if (!hasTitulo && !hasSubtitulo && produtosFiltrados.length === 0) {
    return null;
  }

  return (
    <section className={`${getBackgroundClass(corFundo)} ${getSpacingClass(config)}`}>
      <div className="mx-auto max-w-7xl">
        <div className={`mx-auto max-w-3xl ${sectionAlign}`}>
          {hasTitulo ? (
            <PublicRichTextRenderer
              value={tituloRichText}
              fallback={titulo}
              className={`text-3xl font-light leading-tight md:text-5xl ${colors.title}`}
            />
          ) : null}
          {hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-4 text-base leading-7 ${colors.body}`}
            />
          ) : null}
        </div>

        {exibirFiltrosCategoria ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              {tamanhosDisponiveis.length > 0 ? (
                <select
                  value={filtrosCategoria.tamanho}
                  onChange={(event) =>
                    setFiltrosCategoria((current) => ({
                      ...current,
                      tamanho: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
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
                value={filtrosCategoria.ordenacao}
                onChange={(event) =>
                  setFiltrosCategoria((current) => ({
                    ...current,
                    ordenacao: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
              >
                <option value="">Ordenar</option>
                <option value="MAIS_RECENTES">Mais recentes</option>
                <option value="MENOR_PRECO">Preço: menor para maior</option>
                <option value="MAIOR_PRECO">Preço: maior para menor</option>
                <option value="AZ">A-Z</option>
                <option value="ZA">Z-A</option>
              </select>

              <select
                value={filtrosCategoria.disponibilidade}
                onChange={(event) =>
                  setFiltrosCategoria((current) => ({
                    ...current,
                    disponibilidade: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
              >
                <option value="">Disponibilidade</option>
                <option value="DISPONIVEL">Disponível</option>
                <option value="SEM_ESTOQUE">Sem estoque</option>
              </select>
            </div>
          </div>
        ) : null}

        {produtosComFiltros.length > 0 ? (
          <CarouselScrollArea
            enabled={isCarousel}
            showArrows={exibirSetasCarrossel}
            arrowPosition={posicaoSetasCarrossel}
            arrowStyle={estiloSetasCarrossel}
            scrollMode={navegarPor}
            itemLabel="produtos"
            containerClassName={
              isCarousel
                ? "mt-10 flex snap-x gap-5 overflow-x-auto scroll-smooth pb-4"
                : `mt-10 grid gap-x-5 gap-y-10 ${getGridColumnsClass(
                    1,
                    getNumber(config, "colunasTablet", 3),
                    getNumber(config, "colunasDesktop", 4)
                  )}`
            }
          >
            {produtosVisiveis.map((produto) => (
              <div
                key={produto.id}
                className={isCarousel ? "w-[82vw] shrink-0 snap-start sm:w-64" : ""}
              >
                <ProdutoCardLoja
                  produto={produto}
                  exibirPreco={getBoolean(config, "exibirPreco", true)}
                  exibirBotao={getBoolean(config, "exibirBotao", true)}
                  exibirSeloDesconto={getBoolean(config, "exibirSeloDesconto", true)}
                  textoBotao={textoBotao}
                />
              </div>
            ))}
          </CarouselScrollArea>
        ) : exibirFiltrosCategoria ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm font-medium text-slate-500">
            Nenhum produto encontrado com os filtros selecionados.
          </div>
        ) : null}

        {deveLimitar && !mostrarTodos ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setMostrarTodos(true)}
              className="brand-button-outline px-6 py-3 text-sm font-semibold"
            >
              Ver mais
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
