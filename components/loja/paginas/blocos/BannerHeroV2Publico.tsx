"use client";

import type { CSSProperties, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  normalizarBannerHeroV2Config,
  type BannerHeroV2Button,
  type BannerHeroV2Config,
  type BannerHeroV2LinkTipo,
  type BannerHeroV2PosicaoConteudo,
  type BannerHeroV2Slide,
} from "@/components/loja/paginas/blocos/bannerHeroV2Config";
import type {
  BlocoPublico,
  ProdutoPublico,
} from "@/components/loja/paginas/blocos/utils";

function getHeightStyle(altura: BannerHeroV2Config["altura"]): CSSProperties {
  if (altura === "25VH") return { minHeight: "25svh" };
  if (altura === "50VH") return { minHeight: "50svh" };
  return { minHeight: "100svh" };
}

type InlineRichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: InlineRichTextNode[];
  content?: InlineRichTextNode[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getContentPositionClass(
  posicao: BannerHeroV2PosicaoConteudo,
  prefix = ""
) {
  const p = prefix ? `${prefix}:` : "";

  if (posicao === "SUPERIOR_CENTRO") return `${p}items-start ${p}justify-center`;
  if (posicao === "SUPERIOR_DIREITA") return `${p}items-start ${p}justify-end`;
  if (posicao === "CENTRO_ESQUERDA") return `${p}items-center ${p}justify-start`;
  if (posicao === "CENTRO") return `${p}items-center ${p}justify-center`;
  if (posicao === "CENTRO_DIREITA") return `${p}items-center ${p}justify-end`;
  if (posicao === "INFERIOR_ESQUERDA") return `${p}items-end ${p}justify-start`;
  if (posicao === "INFERIOR_CENTRO") return `${p}items-end ${p}justify-center`;
  if (posicao === "INFERIOR_DIREITA") return `${p}items-end ${p}justify-end`;

  return `${p}items-start ${p}justify-start`;
}

function getContentWidthClass(largura: string) {
  if (largura === "COMPACTA") return "max-w-md";
  if (largura === "LARGA") return "max-w-3xl";
  return "max-w-2xl";
}

function getJustifyClass(alinhamento: string) {
  if (alinhamento === "CENTRO") return "justify-center";
  if (alinhamento === "DIREITA") return "justify-end";
  return "justify-start";
}

function getObjectPosition(crop: { positionX: number; positionY: number }) {
  return `${crop.positionX}% ${crop.positionY}%`;
}

function getContentAlignStyle(alinhamento: string): CSSProperties {
  return {
    textAlign:
      alinhamento === "CENTRO"
        ? "center"
        : alinhamento === "DIREITA"
          ? "right"
          : "left",
  };
}

function getContentVisibilityClass(
  desktop: BannerHeroV2PosicaoConteudo,
  mobile: BannerHeroV2PosicaoConteudo
) {
  if (desktop === "NENHUM" && mobile === "NENHUM") return "hidden";
  if (desktop === "NENHUM") return "flex md:hidden";
  if (mobile === "NENHUM") return "hidden md:flex";
  return "flex";
}

function sanitizeInlineUrl(value: unknown) {
  const url = typeof value === "string" ? value.trim() : "";

  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("#")) return url;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

function sanitizeCssColor(value: unknown) {
  const color = typeof value === "string" ? value.trim() : "";

  if (
    /^#[0-9a-f]{3,8}$/i.test(color) ||
    /^rgba?\([\d\s,.%]+\)$/i.test(color) ||
    ["inherit", "currentColor", "transparent", "white", "black"].includes(color)
  ) {
    return color;
  }

  return "";
}

function sanitizeCssSize(value: unknown) {
  const size = typeof value === "string" ? value.trim() : "";

  return /^-?\d*\.?\d+(rem|em|px|%)$/i.test(size) || size === "0"
    ? size
    : "";
}

function sanitizeLineHeight(value: unknown) {
  const lineHeight = typeof value === "string" ? value.trim() : "";

  return /^\d*\.?\d+$/.test(lineHeight) || sanitizeCssSize(lineHeight)
    ? lineHeight
    : "";
}

function sanitizeFontFamily(value: unknown) {
  const font = typeof value === "string" ? value.toLowerCase() : "";

  if (font.includes("georgia") || font.includes("times")) {
    return "Georgia, 'Times New Roman', serif";
  }

  if (
    font.includes("var(--font-primary)") ||
    font.includes("system") ||
    font.includes("outfit")
  ) {
    return "var(--font-primary)";
  }

  return "";
}

function sanitizeFontWeight(value: unknown) {
  const weight = typeof value === "string" ? value.trim() : "";

  if (/^[1-9]00$/.test(weight)) return weight;
  if (weight === "bold" || weight === "normal") return weight;

  return "";
}

function getInlineStyle(attrs: unknown): CSSProperties {
  const data = isRecord(attrs) ? attrs : {};
  const style: CSSProperties = {};
  const color = sanitizeCssColor(data.color);
  const fontFamily = sanitizeFontFamily(data.fontFamily);
  const fontSize = sanitizeCssSize(data.fontSize);
  const fontWeight = sanitizeFontWeight(data.fontWeight);
  const letterSpacing = sanitizeCssSize(data.letterSpacing);
  const lineHeight = sanitizeLineHeight(data.lineHeight);

  if (color) style.color = color;
  if (fontFamily) style.fontFamily = fontFamily;
  if (fontSize) style.fontSize = fontSize;
  if (fontWeight) style.fontWeight = fontWeight;
  if (letterSpacing) style.letterSpacing = letterSpacing;
  if (lineHeight) style.lineHeight = lineHeight;

  return style;
}

function getRichTextTextNodes(value: unknown): InlineRichTextNode[] {
  const root = isRecord(value) ? value : {};
  const blocks = Array.isArray(root.content) ? root.content : [];

  return blocks.flatMap((block) => {
    const data = isRecord(block) ? block : {};
    const content = Array.isArray(data.content) ? data.content : [];

    return content.filter(
      (node): node is InlineRichTextNode =>
        isRecord(node) && typeof node.text === "string"
    );
  });
}

function renderTextNode(
  node: InlineRichTextNode,
  key: string,
  allowLinks: boolean
) {
  const marks = Array.isArray(node.marks) ? node.marks : [];
  let content: ReactNode = node.text || "";

  marks.forEach((mark, index) => {
    if (!isRecord(mark)) return;

    const markKey = `${key}-${index}`;

    if (mark.type === "bold") {
      content = <strong key={markKey}>{content}</strong>;
      return;
    }

    if (mark.type === "italic") {
      content = <em key={markKey}>{content}</em>;
      return;
    }

    if (mark.type === "underline") {
      content = <span key={markKey} className="underline">{content}</span>;
      return;
    }

    if (mark.type === "link") {
      const href = sanitizeInlineUrl(isRecord(mark.attrs) ? mark.attrs.href : "");

      if (href && allowLinks) {
        content = (
          <a key={markKey} href={href} className="underline underline-offset-4">
            {content}
          </a>
        );
      } else if (href) {
        content = (
          <span key={markKey} className="underline underline-offset-4">
            {content}
          </span>
        );
      }
      return;
    }

    if (mark.type === "textStyle") {
      const style = getInlineStyle(mark.attrs);

      if (Object.keys(style).length > 0) {
        content = <span key={markKey} style={style}>{content}</span>;
      }
    }
  });

  return <Fragment key={key}>{content}</Fragment>;
}

function renderInlineRichText(
  richText: unknown,
  fallback: string,
  allowLinks = true
) {
  const nodes = getRichTextTextNodes(richText);

  if (nodes.length === 0) return fallback;

  return nodes.map((node, index) =>
    renderTextNode(node, `inline-${index}`, allowLinks)
  );
}

function getLinkHref(
  tipo: BannerHeroV2LinkTipo,
  valor: string,
  produtos: ProdutoPublico[]
) {
  const clean = valor.trim();
  if (!clean) return "";
  if (tipo === "PRODUTO") {
    const produto = produtos.find((item) => item.id === clean);
    return produto ? `/loja/produto/${produto.id}` : `/loja/produto/${clean}`;
  }
  if (tipo === "CATEGORIA") return `/loja/categoria/${clean}`;
  if (tipo === "PAGINA") return clean.startsWith("/") ? clean : `/loja/p/${clean}`;
  if (tipo === "COLECAO") return `/loja/colecao/${clean}`;
  return /^(https?:\/\/|\/|mailto:|tel:)/i.test(clean) ? clean : `/${clean}`;
}

function getButtonClass(botao: BannerHeroV2Button) {
  if (botao.estilo.variante === "TEXTO" || botao.estilo.variante === "TEXTO_LINHA") {
    return `inline-flex items-center justify-center font-semibold transition hover:opacity-[var(--banner-hero-v2-hover-opacity)] ${
      botao.estilo.variante === "TEXTO_LINHA"
        ? "border-b border-current pb-1"
        : ""
    }`;
  }

  const radius =
    botao.estilo.variante === "RETO"
      ? "rounded-none"
      : botao.estilo.variante === "SUAVE"
        ? "rounded-md"
        : "rounded-full";

  return `inline-flex items-center justify-center border font-semibold transition hover:opacity-[var(--banner-hero-v2-hover-opacity)] ${radius}`;
}

function getButtonStyle(botao: BannerHeroV2Button): CSSProperties {
  const base: CSSProperties = {
    color: botao.estilo.corTexto,
    borderColor: botao.estilo.corBorda,
    padding: `${botao.estilo.paddingY}px ${botao.estilo.paddingX}px`,
    ["--banner-hero-v2-hover-opacity" as string]: botao.hover.opacidade / 100,
    fontSize:
      botao.estilo.tamanho === "GRANDE"
        ? "0.95rem"
        : botao.estilo.tamanho === "PEQUENO"
          ? "0.78rem"
          : "0.875rem",
  };

  if (
    botao.estilo.variante !== "CONTORNADO" &&
    botao.estilo.variante !== "TEXTO" &&
    botao.estilo.variante !== "TEXTO_LINHA"
  ) {
    base.backgroundColor = botao.estilo.corFundo;
  }

  return base;
}

function getTextStyle(slide: BannerHeroV2Slide, field: "eyebrow" | "titulo" | "texto") {
  const element = slide.conteudo[field];
  const estilo = element.estilo;
  const fontWeightMap: Record<string, number> = {
    LIGHT: 300,
    REGULAR: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    BLACK: 900,
  };

  return {
    fontFamily:
      estilo.fonte === "EDITORIAL"
        ? "Georgia, 'Times New Roman', serif"
        : "var(--font-primary)",
    fontWeight: fontWeightMap[estilo.peso] || 400,
    fontSize: estilo.tamanho,
    color: estilo.cor === "inherit" ? undefined : estilo.cor,
    textAlign:
      estilo.alinhamento === "CENTRO"
        ? "center"
        : estilo.alinhamento === "DIREITA"
          ? "right"
          : "left",
    letterSpacing: estilo.letterSpacing,
    lineHeight: estilo.lineHeight,
  } satisfies CSSProperties;
}

function SlideText({
  slide,
  field,
  className,
}: {
  slide: BannerHeroV2Slide;
  field: "eyebrow" | "titulo" | "texto";
  className: string;
}) {
  const element = slide.conteudo[field];
  const Tag = field === "titulo" ? "h1" : "div";

  return (
    <Tag
      data-stella-inline-field={`bannerHeroV2:${slide.id}:${field}`}
      className={className}
      style={getTextStyle(slide, field)}
    >
      {renderInlineRichText(element.richText, element.conteudo)}
    </Tag>
  );
}

function SlideMedia({
  slide,
  onVideoEnded,
}: {
  slide: BannerHeroV2Slide;
  onVideoEnded: () => void;
}) {
  const desktop = slide.midia.desktop;
  const mobile =
    slide.midia.usarMidiaMobileAlternativa && slide.midia.mobileAlternativa
      ? slide.midia.mobileAlternativa
      : slide.midia.mobile;
  const desktopStyle: CSSProperties = {
    objectPosition: getObjectPosition(desktop),
    transform: `scale(${desktop.zoom / 100})`,
    transformOrigin: getObjectPosition(desktop),
  };
  const mobileStyle: CSSProperties = {
    objectPosition: getObjectPosition(mobile),
    transform: `scale(${mobile.zoom / 100})`,
    transformOrigin: getObjectPosition(mobile),
  };
  const desktopImage = desktop.url || mobile.url || "";
  const mobileImage = mobile.url || desktopImage;
  const desktopVideo = slide.video.url || slide.video.mobileUrl;
  const mobileVideo = slide.video.mobileUrl || desktopVideo;
  const showMobileVariant =
    mobileImage !== desktopImage ||
    mobileVideo !== desktopVideo ||
    getObjectPosition(mobile) !== getObjectPosition(desktop) ||
    mobile.zoom !== desktop.zoom;

  if (slide.tipoMidia === "VIDEO" && desktopVideo) {
    const loop = slide.video.avancarAoFim ? false : slide.video.loop;

    return (
      <>
        {showMobileVariant ? (
          <video
            className="h-full w-full object-cover md:hidden"
            src={mobileVideo}
            poster={slide.video.posterUrl || desktopImage || undefined}
            autoPlay={slide.video.autoplay}
            muted={slide.video.mutado}
            loop={loop}
            playsInline
            style={mobileStyle}
            onEnded={slide.video.avancarAoFim ? onVideoEnded : undefined}
          />
        ) : null}
        <video
          className={`h-full w-full object-cover ${
            showMobileVariant ? "hidden md:block" : ""
          }`}
          src={desktopVideo}
          poster={slide.video.posterUrl || desktopImage || undefined}
          autoPlay={slide.video.autoplay}
          muted={slide.video.mutado}
          loop={loop}
          playsInline
          style={desktopStyle}
          onEnded={slide.video.avancarAoFim ? onVideoEnded : undefined}
        />
      </>
    );
  }

  if (desktopImage || mobileImage) {
    return (
      <>
        {showMobileVariant ? (
          <img
            src={mobileImage}
            alt={mobile.alt || desktop.alt || ""}
            className="h-full w-full object-cover md:hidden"
            style={mobileStyle}
          />
        ) : null}
        <img
          src={desktopImage || mobileImage}
          alt={desktop.alt || mobile.alt || ""}
          className={`h-full w-full object-cover ${
            showMobileVariant ? "hidden md:block" : ""
          }`}
          style={desktopStyle}
        />
      </>
    );
  }

  return (
    <div
      className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,#e7f2f6_42%,#bfd9e4_100%)]"
      aria-hidden="true"
    />
  );
}

export default function BannerHeroV2Publico({
  bloco,
  produtos = [],
}: {
  bloco: BlocoPublico;
  produtos?: ProdutoPublico[];
}) {
  const config = useMemo(
    () => normalizarBannerHeroV2Config(bloco.configJson),
    [bloco.configJson]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = config.slides;
  const activeSlide = slides[activeIndex] || slides[0];
  const canSlide = config.carrossel.ativo && slides.length > 1;
  const showSliderControls =
    canSlide &&
    config.navegacaoInferior === "CONTROLES_SLIDER" &&
    config.carrossel.mostrarControles;

  useEffect(() => {
    if (!canSlide || !config.carrossel.autoplay || paused) return;

    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, activeSlide?.tempoMs || config.carrossel.tempoPadraoMs);

    return () => window.clearTimeout(timeout);
  }, [
    activeSlide?.tempoMs,
    canSlide,
    config.carrossel.autoplay,
    config.carrossel.tempoPadraoMs,
    paused,
    slides.length,
  ]);

  if (!activeSlide) return null;

  function goTo(index: number) {
    if (!slides.length) return;
    setActiveIndex((index + slides.length) % slides.length);
  }

  function goNext() {
    goTo(activeIndex + 1);
  }

  function scrollToNextBlock() {
    const section = document.querySelector(`[data-banner-hero-v2-id="${bloco.id}"]`);
    const next = section?.nextElementSibling;

    next?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  const slideHref = getLinkHref(
    activeSlide.linkSlide.tipo,
    activeSlide.linkSlide.valor,
    produtos
  );
  const contentVisible =
    activeSlide.conteudo.ativo &&
    (activeSlide.conteudo.posicaoDesktop !== "NENHUM" ||
      activeSlide.conteudo.posicaoMobile !== "NENHUM");

  return (
    <section
      data-banner-hero-v2-id={bloco.id}
      className="relative isolate w-full overflow-hidden bg-slate-950 text-white"
      style={getHeightStyle(config.altura)}
      onMouseEnter={() => {
        if (config.carrossel.pausarAoHover) setPaused(true);
      }}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="absolute inset-0 z-0"
        data-banner-hero-v2-media="true"
        data-stella-editorial-gallery-item-id={activeSlide.id}
      >
        <SlideMedia slide={activeSlide} onVideoEnded={goNext} />
      </div>

      {slideHref ? (
        <Link
          href={slideHref}
          target={activeSlide.linkSlide.abrirNovaAba ? "_blank" : undefined}
          rel={activeSlide.linkSlide.abrirNovaAba ? "noreferrer" : undefined}
          className="absolute inset-0 z-[1]"
          aria-label={activeSlide.conteudo.titulo.conteudo || bloco.titulo || "Banner"}
        />
      ) : null}

      {activeSlide.overlay.ativo ? (
        <div
          className="absolute inset-0 z-[2]"
          style={{
            backgroundColor: activeSlide.overlay.cor,
            opacity: activeSlide.overlay.opacidade / 100,
          }}
        />
      ) : null}

      {contentVisible ? (
        <div
          className={`relative z-[3] min-h-[inherit] px-5 py-16 md:px-12 lg:px-20 ${getContentVisibilityClass(
            activeSlide.conteudo.posicaoDesktop,
            activeSlide.conteudo.posicaoMobile
          )} ${getContentPositionClass(
            activeSlide.conteudo.posicaoMobile
          )} ${getContentPositionClass(
            activeSlide.conteudo.posicaoDesktop,
            "md"
          )}`}
        >
          <div
            className={`space-y-5 ${getContentWidthClass(
              activeSlide.conteudo.largura
            )}`}
            style={getContentAlignStyle(activeSlide.conteudo.alinhamento)}
          >
            {activeSlide.conteudo.mostrarEyebrow ? (
              <SlideText
                slide={activeSlide}
                field="eyebrow"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80"
              />
            ) : null}

            {activeSlide.conteudo.mostrarTitulo ? (
              <SlideText
                slide={activeSlide}
                field="titulo"
                className="text-4xl font-light leading-none md:text-6xl lg:text-7xl"
              />
            ) : null}

            {activeSlide.conteudo.mostrarTexto ? (
              <SlideText
                slide={activeSlide}
                field="texto"
                className="max-w-2xl text-base leading-7 text-white/85 md:text-lg"
              />
            ) : null}

            {activeSlide.conteudo.botoes.length > 0 ? (
              <div
                className={`relative z-[4] flex flex-wrap gap-3 ${getJustifyClass(
                  activeSlide.conteudo.alinhamento
                )}`}
              >
                {activeSlide.conteudo.botoes.map((botao, index) => {
                  const href = getLinkHref(botao.linkTipo, botao.linkValor, produtos) || "#";

                  return (
                    <Link
                      key={botao.id}
                      href={href}
                      target={botao.abrirNovaAba ? "_blank" : undefined}
                      rel={botao.abrirNovaAba ? "noreferrer" : undefined}
                      className={getButtonClass(botao)}
                      style={getButtonStyle(botao)}
                      data-stella-inline-field={`bannerHeroV2:${activeSlide.id}:botao:${botao.id}`}
                      data-stella-editorial-gallery-item-id={botao.id}
                      onClick={(event) => {
                        if (href === "#") event.preventDefault();
                      }}
                    >
                      {renderInlineRichText(
                        botao.richText,
                        botao.texto || `Botao ${index + 1}`,
                        false
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSliderControls ? (
        <div className="absolute inset-x-0 bottom-6 z-[5] flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/45"
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur"
            aria-label="Proximo slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {config.navegacaoInferior === "SETA_PROXIMO_BLOCO" ? (
        <button
          type="button"
          onClick={scrollToNextBlock}
          className="absolute bottom-6 left-1/2 z-[5] inline-flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
          aria-label="Ir para o proximo bloco"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      ) : null}
    </section>
  );
}
