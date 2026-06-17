"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  asConfig,
  getArray,
  getBoolean,
  getNumber,
  getString,
  getInlineVars,
  type BlocoPublicoProps,
  type ProdutoPublico,
} from "@/components/loja/paginas/blocos/utils";

type FonteTipo = "MANUAL" | "PRODUTOS" | "COLECAO_INTELIGENTE" | "CAMPANHA";
type LinkTipo = "PRODUTO" | "CATEGORIA" | "PAGINA" | "COLECAO" | "URL";
type HoverTipo =
  | "NENHUM"
  | "ZOOM_LEVE"
  | "ESCURECER"
  | "REVELAR_TEXTO"
  | "REVELAR_BOTAO";

type GaleriaEditorialItem = {
  id: string;
  imagemDesktop: string;
  imagemMobile: string;
  alt: string;
  produtoId: string;
  titulo: string;
  subtitulo: string;
  mostrarTexto: boolean;
  botaoTexto: string;
  mostrarBotao: boolean;
  botaoApenasHover: boolean;
  linkTipo: LinkTipo;
  linkValor: string;
  posicaoTexto: "INFERIOR_ESQUERDO" | "INFERIOR_CENTRO" | "CENTRO" | "SUPERIOR_ESQUERDO";
  focoX: number;
  focoY: number;
  zoom: number;
  overlayOpacidade: number;
};

type GaleriaEditorialProps = BlocoPublicoProps & {
  modo?: "publico" | "editor";
  device?: "DESKTOP" | "TABLET" | "MOBILE";
};

function getObjectConfig(config: Record<string, unknown>, key: string) {
  return asConfig(config[key]);
}

function getStringArray(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeUrl(value: string) {
  const url = value.trim();

  if (!url) return "";
  if (/^(https?:\/\/|\/|mailto:|tel:)/i.test(url)) return url;

  return "";
}

function isExternalHref(href: string) {
  return /^(https?:)?\/\//i.test(href) || /^mailto:|^tel:/i.test(href);
}

function getLinkHref(tipo: LinkTipo, valor: string) {
  if (!valor) return "";
  if (tipo === "PRODUTO") return `/loja/produto/${valor}`;
  if (tipo === "CATEGORIA") return `/loja/categoria/${valor}`;
  if (tipo === "PAGINA") return `/loja/p/${valor}`;
  if (tipo === "COLECAO") return `/loja/colecao/${valor}`;

  return normalizeUrl(valor);
}

function getColunas(value: number) {
  return Math.round(value) === 3 ? 3 : 4;
}

function getHeightClass(variante: string) {
  if (variante === "COMPACTA") {
    return "min-h-[360px] md:min-h-[520px]";
  }

  return "min-h-[440px] md:min-h-[680px]";
}

function getGridClass(colunas: number, comportamentoMobile: string, device?: string) {
  if (device === "MOBILE") {
    return comportamentoMobile === "EMPILHADO"
      ? "grid-flow-row grid-cols-1 overflow-visible"
      : "grid-flow-col auto-cols-[82%] overflow-x-auto";
  }

  if (device === "TABLET") {
    return "grid-flow-row grid-cols-2 overflow-visible";
  }

  if (device === "DESKTOP") {
    return colunas === 3
      ? "grid-flow-row grid-cols-3 overflow-visible"
      : "grid-flow-row grid-cols-4 overflow-visible";
  }

  return comportamentoMobile === "EMPILHADO"
    ? `${colunas === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`
    : `grid-flow-col auto-cols-[82%] overflow-x-auto md:grid-flow-row md:auto-cols-auto md:overflow-visible ${
        colunas === 3 ? "md:grid-cols-3" : "md:grid-cols-4"
      }`;
}

function getTextPositionClass(value: string) {
  if (value === "CENTRO") {
    return "inset-0 items-center justify-center text-center";
  }

  if (value === "INFERIOR_CENTRO") {
    return "inset-x-0 bottom-0 items-center justify-end text-center";
  }

  if (value === "SUPERIOR_ESQUERDO") {
    return "inset-x-0 top-0 items-start justify-start text-left";
  }

  return "inset-x-0 bottom-0 items-start justify-end text-left";
}

function getHoverOverlayClass(tipo: HoverTipo) {
  if (tipo === "ESCURECER") return "group-hover:opacity-[calc(var(--gallery-overlay)+.18)]";
  if (tipo === "REVELAR_TEXTO" || tipo === "REVELAR_BOTAO") return "group-hover:opacity-[var(--gallery-overlay)]";
  return "";
}

function getTextVisibilityClass(tipo: HoverTipo) {
  if (tipo === "REVELAR_TEXTO") {
    return "opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100";
  }

  return "opacity-100";
}

function getButtonVisibilityClass(tipo: HoverTipo, apenasHover: boolean) {
  if (tipo === "REVELAR_BOTAO" || apenasHover) {
    return "opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100";
  }

  return "opacity-100";
}

function criarItemPadrao(index: number): GaleriaEditorialItem {
  return {
    id: `galeria-${index}`,
    imagemDesktop: "",
    imagemMobile: "",
    alt: "",
    produtoId: "",
    titulo: "",
    subtitulo: "",
    mostrarTexto: false,
    botaoTexto: "Explorar",
    mostrarBotao: false,
    botaoApenasHover: false,
    linkTipo: "URL",
    linkValor: "",
    posicaoTexto: "INFERIOR_ESQUERDO",
    focoX: 50,
    focoY: 50,
    zoom: 100,
    overlayOpacidade: 18,
  };
}

function getItem(data: unknown, index: number): GaleriaEditorialItem {
  const config = asConfig(data);
  const fallback = criarItemPadrao(index + 1);

  return {
    id: getString(config, "id", fallback.id),
    imagemDesktop:
      getString(config, "imagemDesktop") ||
      getString(config, "imagemDesktopUrl") ||
      getString(config, "imagemUrl"),
    imagemMobile:
      getString(config, "imagemMobile") ||
      getString(config, "imagemMobileUrl"),
    alt: getString(config, "alt") || getString(config, "altText"),
    produtoId: getString(config, "produtoId"),
    titulo: getString(config, "titulo"),
    subtitulo: getString(config, "subtitulo"),
    mostrarTexto: getBoolean(config, "mostrarTexto", false),
    botaoTexto: getString(config, "botaoTexto", fallback.botaoTexto),
    mostrarBotao: getBoolean(config, "mostrarBotao", false),
    botaoApenasHover: getBoolean(config, "botaoApenasHover", false),
    linkTipo: getString(config, "linkTipo", fallback.linkTipo) as LinkTipo,
    linkValor: getString(config, "linkValor"),
    posicaoTexto: getString(
      config,
      "posicaoTexto",
      fallback.posicaoTexto
    ) as GaleriaEditorialItem["posicaoTexto"],
    focoX: clamp(getNumber(config, "focoX", 50), 0, 100),
    focoY: clamp(getNumber(config, "focoY", 50), 0, 100),
    zoom: clamp(getNumber(config, "zoom", 100), 100, 150),
    overlayOpacidade: clamp(getNumber(config, "overlayOpacidade", 18), 0, 70),
  };
}

function getProdutoIdsFonte(fonte: Record<string, unknown>, config: Record<string, unknown>) {
  const fonteIds = getStringArray(fonte, "produtosIds");
  const configIds = getStringArray(config, "produtosIds");

  return fonteIds.length > 0 ? fonteIds : configIds;
}

function montarItensDinamicos({
  itensManual,
  produtosIds,
  produtos,
  quantidade,
}: {
  itensManual: GaleriaEditorialItem[];
  produtosIds: string[];
  produtos: ProdutoPublico[];
  quantidade: number;
}) {
  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
  const baseIds =
    produtosIds.length > 0
      ? produtosIds
      : itensManual.map((item) => item.produtoId).filter(Boolean);

  return baseIds.slice(0, quantidade).map((produtoId, index) => {
    const produto = produtosPorId.get(produtoId);
    const manual = itensManual[index] || criarItemPadrao(index + 1);

    return {
      ...manual,
      id: manual.id || `produto-${produtoId}`,
      produtoId,
      imagemDesktop: manual.imagemDesktop || produto?.imagemUrl || "",
      imagemMobile: manual.imagemMobile || manual.imagemDesktop || produto?.imagemUrl || "",
      alt: manual.alt || produto?.nome || "",
      titulo: manual.titulo || produto?.nome || "",
      subtitulo: manual.subtitulo || produto?.categoria || "",
      linkTipo: manual.linkValor ? manual.linkTipo : "PRODUTO",
      linkValor: manual.linkValor || produtoId,
    };
  });
}

function getItens({
  config,
  fonte,
  produtos,
  quantidade,
}: {
  config: Record<string, unknown>;
  fonte: Record<string, unknown>;
  produtos: ProdutoPublico[];
  quantidade: number;
}) {
  const itensManual = getArray(config, "itens").map((item, index) =>
    getItem(item, index)
  );
  const tipoFonte = getString(fonte, "tipo", "MANUAL") as FonteTipo;

  if (tipoFonte === "MANUAL") {
    return Array.from({ length: quantidade }, (_, index) => {
      return itensManual[index] || criarItemPadrao(index + 1);
    });
  }

  return montarItensDinamicos({
    itensManual,
    produtosIds: getProdutoIdsFonte(fonte, config),
    produtos,
    quantidade,
  });
}

function ItemWrapper({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  if (!href) return <div className="block h-full">{children}</div>;

  if (isExternalHref(href)) {
    return (
      <a href={href} className="block h-full">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className="block h-full">
      {children}
    </Link>
  );
}

export default function GaleriaEditorialFullBleedPublico({
  bloco,
  produtos = [],
  modo = "publico",
  device,
}: GaleriaEditorialProps) {
  const config = asConfig(bloco.configJson);
  const layout = getObjectConfig(config, "layout");
  const fonte = getObjectConfig(config, "fonte");
  const hover = getObjectConfig(config, "hover");
  const design = getObjectConfig(config, "design");

  const colunas = getColunas(getNumber(layout, "colunas", 4));
  const varianteAltura = getString(layout, "varianteAltura", "PADRAO");
  const gap = clamp(getNumber(layout, "gap", 8), 0, 32);
  const fullBleed = getBoolean(layout, "fullBleed", true);
  const comportamentoMobile = getString(layout, "comportamentoMobile", "CARROSSEL");
  const quantidade = clamp(getNumber(fonte, "quantidade", colunas), 1, 8);
  const hoverTipo = getString(hover, "tipo", "ZOOM_LEVE") as HoverTipo;
  const hoverIntensidade = clamp(getNumber(hover, "intensidade", 1), 0, 2);
  const fundo = getString(design, "fundo", "#ffffff");
  const raio = clamp(getNumber(design, "raio", 0), 0, 32);
  const espacamentoVertical = clamp(getNumber(design, "espacamentoVertical", 0), 0, 96);
  const itens = getItens({ config, fonte, produtos, quantidade });
  const itensVisiveis =
    modo === "editor"
      ? Array.from({ length: colunas }, (_, index) => itens[index] || criarItemPadrao(index + 1))
      : itens.filter((item) => item.imagemDesktop || item.imagemMobile).slice(0, colunas);

  if (modo === "publico" && itensVisiveis.length === 0) {
    return null;
  }

  return (
    <section
      className="w-full overflow-hidden text-white"
      style={getInlineVars({
        "--gallery-bg": fundo,
        "--gallery-gap": `${gap}px`,
        "--gallery-radius": `${raio}px`,
        "--gallery-py": `${espacamentoVertical}px`,
        "--gallery-hover-intensity": hoverIntensidade,
      })}
    >
      <div className="bg-[var(--gallery-bg)] py-[var(--gallery-py)]">
        <style>{`
          .stella-galeria-editorial-image {
            transform: scale(var(--gallery-item-zoom));
          }

          @media (prefers-reduced-motion: no-preference) {
            .group:hover .stella-galeria-editorial-image[data-gallery-hover="ZOOM_LEVE"] {
              transform: scale(var(--gallery-item-hover-zoom));
            }
          }
        `}</style>
        <div className={fullBleed ? "w-full" : "mx-auto max-w-7xl px-4 md:px-6"}>
          <div
            className={`grid gap-[var(--gallery-gap)] ${getGridClass(
              colunas,
              comportamentoMobile,
              device
            )}`}
          >
            {itensVisiveis.map((item, index) => {
              const imagemDesktop = item.imagemDesktop || item.imagemMobile;
              const imagemMobile = item.imagemMobile || imagemDesktop;
              const imagemAtual = device === "MOBILE" ? imagemMobile : imagemDesktop;
              const href = getLinkHref(item.linkTipo, item.linkValor);
              const label = item.titulo || item.alt || `Imagem ${index + 1}`;
              const alt = item.alt || label;
              const imageStyle: CSSProperties = {
                objectPosition: `${item.focoX}% ${item.focoY}%`,
                "--gallery-item-zoom": item.zoom / 100,
                "--gallery-item-hover-zoom":
                  item.zoom / 100 + 0.035 * hoverIntensidade,
              } as CSSProperties;

              return (
                <article
                  key={item.id || `${label}-${index}`}
                  data-stella-editorial-gallery-item-id={item.id}
                  className={`group relative overflow-hidden rounded-[var(--gallery-radius)] bg-slate-100 ${getHeightClass(
                    varianteAltura
                  )}`}
                  style={{
                    "--gallery-overlay": item.overlayOpacidade / 100,
                  } as CSSProperties}
                >
                  <ItemWrapper href={href}>
                    {imagemAtual ? (
                      <picture className="block h-full w-full overflow-hidden">
                        {imagemMobile ? (
                          <source media="(max-width: 767px)" srcSet={imagemMobile} />
                        ) : null}
                        <img
                          src={imagemDesktop || imagemMobile}
                          alt={alt}
                          data-gallery-hover={hoverTipo}
                          className="stella-galeria-editorial-image h-full w-full object-cover transition duration-500 motion-reduce:transition-none"
                          style={imageStyle}
                        />
                      </picture>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Selecionar imagem
                      </div>
                    )}

                    <div
                      className={`pointer-events-none absolute inset-0 bg-black opacity-[var(--gallery-overlay)] transition duration-500 motion-reduce:transition-none ${getHoverOverlayClass(
                        hoverTipo
                      )}`}
                    />

                    {item.mostrarTexto || item.mostrarBotao ? (
                      <div
                        className={`absolute z-10 flex p-5 md:p-7 ${getTextPositionClass(
                          item.posicaoTexto
                        )}`}
                      >
                        <div className="max-w-[22rem]">
                          {item.mostrarTexto ? (
                            <div
                              className={`transition duration-500 motion-reduce:transition-none ${getTextVisibilityClass(
                                hoverTipo
                              )}`}
                            >
                              {item.titulo ? (
                                <h3 className="text-lg font-semibold leading-tight md:text-2xl">
                                  {item.titulo}
                                </h3>
                              ) : null}
                              {item.subtitulo ? (
                                <p className="mt-2 text-sm leading-6 text-white/82">
                                  {item.subtitulo}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {item.mostrarBotao && item.botaoTexto ? (
                            <span
                              className={`mt-4 inline-flex border-b border-white pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-white transition duration-500 motion-reduce:transition-none ${getButtonVisibilityClass(
                                hoverTipo,
                                item.botaoApenasHover
                              )}`}
                            >
                              {item.botaoTexto}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </ItemWrapper>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
