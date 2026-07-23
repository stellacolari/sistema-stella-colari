"use client";

import { useState } from "react";
import LojaFiltrosProdutos from "@/components/loja/LojaFiltrosProdutos";
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
    const ordem = new Map(produtosIds.map((id, index) => [id, index]));
    resultado = resultado
      .filter((produto) => ordem.has(produto.id))
      .sort((a, b) => Number(ordem.get(a.id)) - Number(ordem.get(b.id)));
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

  if (fonte === "MANUAL" || fonte === "COLECAO_INTELIGENTE") {
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

export default function ListaProdutosPublico({
  bloco,
  produtos = [],
  listaCompletaProdutos = false,
}: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const isBrandSurface = ["MARCA", "AZUL_ESCURO", "ESCURO"].includes(corFundo);
  const colors = getTextColorForBackground(corFundo);
  const produtosFiltrados = filtrarProdutos(produtos, config);
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
  const exibirFiltrosPublicos =
    produtosFiltrados.length > 0 &&
    !isCarousel &&
    (ehListaCompletaCategoria ||
      getBoolean(config, "habilitarFiltros", false) ||
      getBoolean(config, "mostrarFiltros", false));
  const produtosComFiltros = produtosFiltrados;
  const deveLimitar =
    !ehListaCompletaCategoria &&
    !exibirFiltrosPublicos &&
    produtosComFiltros.length > 4;
  const produtosVisiveis =
    deveLimitar && !mostrarTodos ? produtosComFiltros.slice(0, 4) : produtosComFiltros;

  if (produtosFiltrados.length === 0) {
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
              forceColor={
                isBrandSurface ? "var(--brand-blue-foreground)" : undefined
              }
            />
          ) : null}
          {hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-4 text-base leading-7 ${colors.body}`}
              forceColor={
                isBrandSurface ? "var(--brand-blue-foreground)" : undefined
              }
            />
          ) : null}
        </div>

        {exibirFiltrosPublicos ? (
          <LojaFiltrosProdutos
            produtos={produtosFiltrados}
            className="mt-8"
            defaultOrder="destaque"
            gridClassName={`grid gap-x-5 gap-y-10 ${getGridColumnsClass(
              1,
              getNumber(config, "colunasTablet", 3),
              getNumber(config, "colunasDesktop", 4)
            )}`}
            renderProduto={(produto) => (
              <ProdutoCardLoja
                produto={produto}
                imageSizes="(max-width: 639px) 100vw, (max-width: 1023px) 33vw, 25vw"
                exibirPreco={getBoolean(config, "exibirPreco", true)}
                exibirBotao={getBoolean(config, "exibirBotao", true)}
                exibirSeloDesconto={getBoolean(config, "exibirSeloDesconto", true)}
                textoBotao={textoBotao}
              />
            )}
          />
        ) : null}

        {!exibirFiltrosPublicos && produtosComFiltros.length > 0 ? (
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
                  imageSizes={
                    isCarousel
                      ? "(max-width: 639px) 82vw, 256px"
                      : "(max-width: 639px) 100vw, (max-width: 1023px) 33vw, 25vw"
                  }
                  exibirPreco={getBoolean(config, "exibirPreco", true)}
                  exibirBotao={getBoolean(config, "exibirBotao", true)}
                  exibirSeloDesconto={getBoolean(config, "exibirSeloDesconto", true)}
                  textoBotao={textoBotao}
                />
              </div>
            ))}
          </CarouselScrollArea>
        ) : null}

        {deveLimitar && !mostrarTodos ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setMostrarTodos(true)}
              className={`px-6 py-3 text-sm font-semibold transition ${
                isBrandSurface
                  ? "border border-white bg-white text-[var(--brand-blue)] hover:text-[var(--brand-blue-dark)]"
                  : "brand-button-outline"
              }`}
            >
              Ver mais
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
