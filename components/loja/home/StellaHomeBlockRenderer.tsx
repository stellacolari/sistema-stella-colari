"use client";

import Link from "next/link";
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { CategoriaMenuPublicoItem } from "@/components/loja/MenuPublicoLoja";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import CarouselScrollArea from "@/components/loja/paginas/CarouselScrollArea";
import {
  normalizarBannerHeroV2Config,
  type BannerHeroV2Button,
  type BannerHeroV2Slide,
} from "@/components/loja/paginas/blocos/bannerHeroV2Config";
import {
  asConfig,
  getArray,
  getBoolean,
  getNumber,
  getString,
  getStringWithDefault,
  produtoTemDesconto,
} from "@/components/loja/paginas/blocos/utils";
import type { StellaHomeBlockKey } from "@/lib/loja/stella-home-contract";
import type { ProdutoPublico } from "@/lib/loja/produto-publico";
import styles from "./StellaHomeBlockRenderer.module.css";

type StellaHomeBlock = {
  id: string;
  tipo: string;
  titulo: string | null;
  ordem: number;
  configJson: unknown;
};

type StellaHomeProduct = ProdutoPublico;

type StellaHomeBlockRendererProps = {
  bloco: StellaHomeBlock;
  blockKey: StellaHomeBlockKey;
  produtos: StellaHomeProduct[];
  categorias: CategoriaMenuPublicoItem[];
};

function normalizeHref(value: string) {
  const href = value.trim();

  if (!href) return "";
  if (/^(https?:\/\/|\/|mailto:|tel:)/i.test(href)) return href;

  return "";
}

function isExternalHref(href: string) {
  return /^(https?:)?\/\//i.test(href) || /^(mailto:|tel:)/i.test(href);
}

function SmartLink({
  href,
  className,
  children,
  ariaLabel,
  newTab = false,
  style,
}: {
  href: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
  newTab?: boolean;
  style?: CSSProperties;
}) {
  const safeHref = normalizeHref(href);

  if (!safeHref) return null;

  if (isExternalHref(safeHref)) {
    return (
      <a
        href={safeHref}
        className={className}
        aria-label={ariaLabel}
        style={style}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={safeHref}
      className={className}
      aria-label={ariaLabel}
      style={style}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
    >
      {children}
    </Link>
  );
}

function RevealSection({
  className = "",
  children,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10%", threshold: 0.08 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

function Media({
  desktop,
  mobile,
  alt,
  className = "",
  eager = false,
  imageClassName = "",
  imageStyle,
}: {
  desktop: string;
  mobile?: string;
  alt: string;
  className?: string;
  eager?: boolean;
  imageClassName?: string;
  imageStyle?: CSSProperties;
}) {
  const desktopUrl = normalizeHref(desktop);
  const mobileUrl = normalizeHref(mobile || desktop);

  if (!desktopUrl && !mobileUrl) {
    return (
      <div
        className={`${styles.mediaFallback} ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <picture className={`block overflow-hidden ${className}`}>
      {mobileUrl ? <source media="(max-width: 767px)" srcSet={mobileUrl} /> : null}
      <img
        src={desktopUrl || mobileUrl}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className={`${styles.mediaImage} ${imageClassName}`}
        style={imageStyle}
      />
    </picture>
  );
}

function getHeroHref(tipo: string, valor: string) {
  if (!valor) return "";
  if (tipo === "PRODUTO") return `/loja/produto/${valor}`;
  if (tipo === "CATEGORIA") return `/loja/categoria/${valor}`;
  if (tipo === "PAGINA") return `/loja/p/${valor}`;
  if (tipo === "COLECAO") return `/loja/colecao/${valor}`;

  return normalizeHref(valor);
}

function getHeroHeightClass(altura: string) {
  if (altura === "25VH") return "min-h-[55svh]";
  if (altura === "100VH") return "min-h-[100svh]";

  return "min-h-[72svh] md:min-h-[82svh]";
}

function getHeroPositionClass(posicao: string, viewport: "mobile" | "desktop") {
  const prefix = viewport === "desktop" ? "md:" : "";
  const vertical = posicao.startsWith("SUPERIOR")
    ? `${prefix}items-start`
    : posicao.startsWith("INFERIOR")
      ? `${prefix}items-end`
      : `${prefix}items-center`;
  const horizontal = posicao.endsWith("DIREITA")
    ? `${prefix}justify-end`
    : posicao.endsWith("CENTRO") || posicao === "CENTRO"
      ? `${prefix}justify-center`
      : `${prefix}justify-start`;

  return `${vertical} ${horizontal}`;
}

function getHeroTextAlignClass(alinhamento: string) {
  if (alinhamento === "CENTRO") return "text-center";
  if (alinhamento === "DIREITA") return "text-right";

  return "text-left";
}

function getHeroContentWidthClass(largura: string) {
  if (largura === "COMPACTA") return "max-w-3xl";
  if (largura === "LARGA") return "max-w-[90rem]";

  return "max-w-6xl";
}

function getHeroContentVisibilityClass(
  desktop: string,
  mobile: string
) {
  if (desktop === "NENHUM" && mobile === "NENHUM") return "hidden";
  if (desktop === "NENHUM") return "flex md:hidden";
  if (mobile === "NENHUM") return "hidden md:flex";

  return "flex";
}

function getHeroElementStyle(
  slide: BannerHeroV2Slide,
  field: "eyebrow" | "titulo" | "texto"
): CSSProperties {
  const estilo = slide.conteudo[field].estilo;
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
  };
}

function getHeroButtonStyle(botao: BannerHeroV2Button): CSSProperties {
  const preenchido = ![
    "CONTORNADO",
    "TEXTO",
    "TEXTO_LINHA",
  ].includes(botao.estilo.variante);

  return {
    color: botao.estilo.corTexto,
    borderColor: botao.estilo.corBorda,
    backgroundColor: preenchido ? botao.estilo.corFundo : "transparent",
    padding: `${botao.estilo.paddingY}px ${botao.estilo.paddingX}px`,
    fontSize:
      botao.estilo.tamanho === "GRANDE"
        ? "0.95rem"
        : botao.estilo.tamanho === "PEQUENO"
          ? "0.78rem"
          : "0.875rem",
  };
}

function StellaHero({ bloco }: { bloco: StellaHomeBlock }) {
  const config = normalizarBannerHeroV2Config(bloco.configJson);
  const slide = config.slides[0];

  if (!slide) return null;

  const desktopUrl = slide.midia.desktop.url || "";
  const mobileCrop =
    slide.midia.usarMidiaMobileAlternativa && slide.midia.mobileAlternativa
      ? slide.midia.mobileAlternativa
      : slide.midia.mobile;
  const mobileUrl = mobileCrop.url || desktopUrl;
  const titulo = slide.conteudo.titulo.conteudo;
  const eyebrow = slide.conteudo.eyebrow.conteudo;
  const texto = slide.conteudo.texto.conteudo;
  const hasVideo = slide.tipoMidia === "VIDEO" && Boolean(slide.video.url);
  const desktopPosition = slide.conteudo.posicaoDesktop || slide.conteudo.posicao;
  const mobilePosition = slide.conteudo.posicaoMobile || slide.conteudo.posicao;
  const hasVisibleTitle = Boolean(
    slide.conteudo.ativo &&
      slide.conteudo.mostrarTitulo &&
      titulo &&
      (desktopPosition !== "NENHUM" || mobilePosition !== "NENHUM")
  );
  const overlayStyle = slide.overlay.ativo
    ? {
        backgroundColor: slide.overlay.cor,
        opacity: slide.overlay.opacidade / 100,
      }
    : undefined;
  const heroImageStyle = {
    "--stella-hero-position-desktop": `${slide.midia.desktop.positionX}% ${slide.midia.desktop.positionY}%`,
    "--stella-hero-position-mobile": `${mobileCrop.positionX}% ${mobileCrop.positionY}%`,
    "--stella-hero-zoom-desktop": slide.midia.desktop.zoom / 100,
    "--stella-hero-zoom-mobile": mobileCrop.zoom / 100,
  } as CSSProperties;

  return (
    <section
      className={`${styles.hero} relative isolate overflow-hidden bg-[#171916] text-white ${getHeroHeightClass(config.altura)}`}
      aria-labelledby={`stella-hero-${bloco.id}`}
    >
      <div className="absolute inset-0 -z-20">
        {hasVideo ? (
          <video
            className="h-full w-full object-cover"
            autoPlay={slide.video.autoplay}
            muted={slide.video.mutado}
            loop={slide.video.loop}
            playsInline
            poster={slide.video.posterUrl || undefined}
            aria-label={slide.midia.desktop.alt || "Imagem editorial Stella Colari"}
          >
            {slide.video.mobileUrl ? (
              <source media="(max-width: 767px)" src={slide.video.mobileUrl} />
            ) : null}
            <source src={slide.video.url} />
          </video>
        ) : desktopUrl || mobileUrl ? (
          <Media
            desktop={desktopUrl}
            mobile={mobileUrl}
            alt={slide.midia.desktop.alt || titulo}
            className="h-full w-full"
            eager
            imageClassName={styles.heroMediaImage}
            imageStyle={heroImageStyle}
          />
        ) : (
          <div className={`${styles.heroFallback} h-full w-full`} aria-hidden="true" />
        )}
      </div>

      {slide.overlay.ativo ? (
        <div className="absolute inset-0 -z-10" style={overlayStyle} />
      ) : null}
      <div className={`${styles.heroShade} absolute inset-0 -z-10`} />

      {!hasVisibleTitle ? (
        <h1 id={`stella-hero-${bloco.id}`} className="sr-only">
          {titulo || "Stella Colari"}
        </h1>
      ) : null}

      {slide.conteudo.ativo ? (
        <div
          className={`${styles.heroContent} mx-auto min-h-[inherit] w-full max-w-[100rem] px-5 pb-20 pt-24 sm:px-7 md:pb-24 md:pt-28 lg:px-12 ${config.headerTransparente ? "lg:pt-36" : "lg:pt-28"} ${getHeroContentVisibilityClass(desktopPosition, mobilePosition)} ${getHeroPositionClass(mobilePosition, "mobile")} ${getHeroPositionClass(desktopPosition, "desktop")}`}
        >
          <div
            className={`${styles.heroCopy} ${getHeroContentWidthClass(slide.conteudo.largura)} ${getHeroTextAlignClass(slide.conteudo.alinhamento)}`}
          >
            {slide.conteudo.mostrarEyebrow && eyebrow ? (
              <p
                data-stella-inline-field={`bannerHeroV2:${slide.id}:eyebrow`}
                className={`${styles.heroEyebrow} text-xs font-medium uppercase text-white/80`}
                style={getHeroElementStyle(slide, "eyebrow")}
              >
                {eyebrow}
              </p>
            ) : null}

            {hasVisibleTitle ? (
              <h1
                id={`stella-hero-${bloco.id}`}
                data-stella-inline-field={`bannerHeroV2:${slide.id}:titulo`}
                className={`${styles.heroTitle} mt-5 max-w-[18ch] text-white`}
                style={getHeroElementStyle(slide, "titulo")}
              >
                {titulo}
              </h1>
            ) : null}

            {slide.conteudo.mostrarTexto && texto ? (
              <p
                data-stella-inline-field={`bannerHeroV2:${slide.id}:texto`}
                className={`${styles.heroBody} mt-7 max-w-xl text-base text-white/86 md:text-lg`}
                style={getHeroElementStyle(slide, "texto")}
              >
                {texto}
              </p>
            ) : null}

            {slide.conteudo.botoes.length > 0 ? (
              <div className={`${styles.heroActions} mt-9 flex flex-wrap gap-3`}>
                {slide.conteudo.botoes.slice(0, 2).map((botao, index) => {
                  const href = getHeroHref(botao.linkTipo, botao.linkValor);
                  if (!botao.texto || !href) return null;

                  return (
                    <SmartLink
                      key={botao.id}
                      href={href}
                      newTab={botao.abrirNovaAba}
                      ariaLabel={botao.abrirNovaAba ? `${botao.texto} (abre em nova aba)` : undefined}
                      className={
                        index === 0
                          ? `${styles.heroPrimaryButton} inline-flex min-h-12 items-center justify-center bg-white px-7 text-xs font-semibold uppercase text-[#171916] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`
                          : `${styles.heroSecondaryButton} inline-flex min-h-12 items-center justify-center border border-white/70 px-7 text-xs font-semibold uppercase text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`
                      }
                      style={getHeroButtonStyle(botao)}
                    >
                      <span
                        data-stella-inline-field={`bannerHeroV2:${slide.id}:botao:${botao.id}`}
                      >
                        {botao.texto}
                      </span>
                    </SmartLink>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={styles.heroFooter} aria-hidden="true">
        <span>Stella Colari</span>
        <span>↓</span>
      </div>
    </section>
  );
}

function getCards(config: Record<string, unknown>) {
  return getArray(config, "cards")
    .map(asConfig)
    .map((card, index) => {
      const desktop = normalizeHref(
        getString(card, [
          "imagemDesktopUrl",
          "imagemDesktop",
          "imagemUrl",
          "imagem",
        ])
      );
      const mobile = normalizeHref(
        getString(card, ["imagemMobileUrl", "imagemMobile"])
      );

      return {
        id: getString(card, "id", `card-${index + 1}`),
        titulo: getString(card, "titulo"),
        texto: getString(card, ["texto", "descricao"]),
        textoBotao: getString(card, ["textoBotao", "botaoTexto"]),
        href: normalizeHref(getString(card, ["linkBotao", "linkUrl"])),
        exibirMidia: getBoolean(card, "exibirMidia", true),
        tipoMidia: getString(card, "tipoMidia", "ICONE"),
        icone: getString(card, "icone"),
        desktop,
        mobile,
        mediaPositionDesktop: getString(
          card,
          "mediaPositionDesktop",
          "center center"
        ),
        mediaPositionMobile: getString(
          card,
          "mediaPositionMobile",
          "center center"
        ),
      };
    })
    .filter((card) => card.titulo || card.texto);
}

function StellaBrandValueVisual({
  card,
  index,
}: {
  card: ReturnType<typeof getCards>[number];
  index: number;
}) {
  if (card.exibirMidia && card.tipoMidia === "ICONE" && card.icone) {
    return (
      <span
        className={styles.valueIcon}
        aria-hidden="true"
      >
        {card.icone}
      </span>
    );
  }

  if (
    card.exibirMidia &&
    card.tipoMidia === "IMAGEM" &&
    (card.desktop || card.mobile)
  ) {
    const imageStyle = {
      "--stella-value-position-desktop": card.mediaPositionDesktop,
      "--stella-value-position-mobile": card.mediaPositionMobile,
    } as CSSProperties;

    return (
      <Media
        desktop={card.desktop}
        mobile={card.mobile}
        alt={card.titulo}
        className={styles.valueMedia}
        imageClassName={styles.valueMediaImage}
        imageStyle={imageStyle}
      />
    );
  }

  return (
    <p className="text-[11px] font-semibold tracking-[0.22em] text-[#245f76]">
      {String(index + 1).padStart(2, "0")}
    </p>
  );
}

function StellaBrandValues({ bloco }: { bloco: StellaHomeBlock }) {
  const config = asConfig(bloco.configJson);
  const cards = getCards(config).slice(0, 4);

  if (cards.length === 0) return null;

  return (
    <RevealSection className={`${styles.brandValues} border-b border-[#cbc8bf] bg-[#f1efe8]`}>
      <div className={`${styles.brandValuesGrid} mx-auto grid max-w-[100rem] grid-cols-1 px-5 sm:grid-cols-2 sm:px-7 lg:grid-cols-4 lg:px-12`}>
        {cards.map((card, index) => (
          <article
            key={card.id}
            className={`${styles.brandValueCard} border-b border-[#cbc8bf] py-7 sm:border-l sm:px-6 lg:border-b-0 lg:py-9 first:sm:border-l-0 first:sm:pl-0 last:sm:pr-0`}
          >
            <StellaBrandValueVisual card={card} index={index} />
            <h2 className={`${styles.brandValueTitle} mt-4 text-sm font-semibold uppercase text-[#171916]`}>
              {card.titulo}
            </h2>
            {card.texto ? (
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#61635e]">{card.texto}</p>
            ) : null}
            {card.href && card.textoBotao ? (
              <SmartLink
                href={card.href}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#171916] underline-offset-4 hover:underline"
              >
                {card.textoBotao}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </SmartLink>
            ) : null}
          </article>
        ))}
      </div>
    </RevealSection>
  );
}

function filtrarProdutos(
  produtos: StellaHomeProduct[],
  config: Record<string, unknown>
) {
  const fonte = getString(config, "fonte", "TODOS");
  const categoriaId = getString(config, "categoriaId");
  const categoriaSlug = getString(config, "categoriaSlug");
  const categoriaNome = getString(config, "categoriaNome");
  const categoriasIds = getArray(config, "categoriasIds").map(String);
  const categoriasLegadas = getArray(config, "categorias").map(String);
  const categoriasSlugs = getArray(config, "categoriasSlugs").map(String);
  const categoriasNomes = getArray(config, "categoriasNomes").map(String);
  const ids = getArray(config, "produtosIds").map(String);
  const limite = Math.max(1, Math.min(16, getNumber(config, "limite", 8)));
  let resultado = [...produtos];

  if (fonte === "MANUAL" || fonte === "COLECAO_INTELIGENTE") {
    if (ids.length === 0) return [];
    const ordem = new Map(ids.map((id, index) => [id, index]));
    resultado = resultado
      .filter((produto) => ordem.has(produto.id))
      .sort((a, b) => Number(ordem.get(a.id)) - Number(ordem.get(b.id)));
  } else if (fonte === "NOVOS") {
    resultado = resultado.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  } else if (fonte === "DESCONTOS") {
    resultado = resultado.filter(produtoTemDesconto);
  } else if (fonte === "MAIS_VENDIDOS") {
    const ordem = new Map(ids.map((id, index) => [id, index]));
    resultado = resultado
      .filter((produto) => ordem.has(produto.id))
      .sort((a, b) => Number(ordem.get(a.id)) - Number(ordem.get(b.id)));
  } else if (fonte === "CATEGORIA") {
    if (!categoriaId && !categoriaSlug && !categoriaNome) return [];

    resultado = resultado.filter((produto) => {
      return (
        Boolean(categoriaId && produto.categoriaIds?.includes(categoriaId)) ||
        Boolean(
          categoriaSlug && produto.categoriaSlugs?.includes(categoriaSlug)
        ) ||
        Boolean(
          categoriaNome &&
            (produto.categoria === categoriaNome ||
              produto.categoriaNomes?.includes(categoriaNome))
        )
      );
    });
  } else if (fonte === "CATEGORIAS_SELECIONADAS") {
    const idsCategorias =
      categoriasIds.length > 0 ? categoriasIds : categoriasLegadas;

    if (
      idsCategorias.length === 0 &&
      categoriasSlugs.length === 0 &&
      categoriasNomes.length === 0
    ) {
      return [];
    }

    resultado = resultado.filter((produto) => {
      return (
        idsCategorias.some((id) => produto.categoriaIds?.includes(id)) ||
        categoriasSlugs.some((slug) =>
          produto.categoriaSlugs?.includes(slug)
        ) ||
        categoriasNomes.some(
          (nome) =>
            produto.categoria === nome ||
            produto.categoriaNomes?.includes(nome)
        ) ||
        categoriasLegadas.includes(produto.categoria)
      );
    });
  }

  return resultado.slice(0, limite);
}

function StellaProductCard({
  produto,
  config,
}: {
  produto: StellaHomeProduct;
  config: Record<string, unknown>;
}) {
  return (
    <div className={styles.productCardShell}>
      <ProdutoCardLoja
        produto={produto}
        exibirPreco={getBoolean(config, "exibirPreco", true)}
        exibirBotao={getBoolean(config, "exibirBotao", true)}
        exibirSeloDesconto={getBoolean(config, "exibirSeloDesconto", true)}
        textoBotao={getStringWithDefault(config, "textoBotao", "Ver peça")}
        trackingOrigem="home-stella"
        imageLoading="lazy"
        exibirImagemHover={false}
      />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  titulo,
  descricao,
}: {
  eyebrow: string;
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className={`${styles.sectionHeading} grid gap-6 border-t border-current/20 pt-5 md:grid-cols-[minmax(140px,0.35fr)_minmax(0,1fr)] md:items-start`}>
      <p className={`${styles.sectionEyebrow} text-[10px] font-semibold uppercase text-current/70`}>
        {eyebrow}
      </p>
      <div>
        <h2
          data-stella-inline-field="titulo"
          className={`${styles.sectionTitle} max-w-[16ch] text-[clamp(2.4rem,5.2vw,6.4rem)] font-medium uppercase text-current`}
        >
          {titulo}
        </h2>
        {descricao ? (
          <p
            data-stella-inline-field="subtitulo"
            className={`${styles.sectionDescription} mt-5 max-w-xl text-sm text-current/65 md:text-base`}
          >
            {descricao}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StellaNewArrivals({
  bloco,
  produtos,
}: {
  bloco: StellaHomeBlock;
  produtos: StellaHomeProduct[];
}) {
  const config = asConfig(bloco.configJson);
  const itens = filtrarProdutos(produtos, config);

  if (itens.length === 0) return null;

  const titulo = getStringWithDefault(config, "titulo", "Novidades");
  const descricao = getStringWithDefault(config, ["descricao", "subtitulo", "texto"]);

  return (
    <RevealSection className={`${styles.productsSection} bg-[#f7f5ef] px-5 py-20 text-[#171916] sm:px-7 md:py-28 lg:px-12`}>
      <div className="mx-auto max-w-[100rem]">
        <SectionHeading eyebrow="Seleção atual" titulo={titulo} descricao={descricao} />
        <CarouselScrollArea
          enabled
          showArrows
          arrowPosition="TOPO_DIREITA"
          arrowStyle="MINIMALISTA"
          scrollMode="ITEM"
          itemLabel="produtos"
          containerClassName="mt-10 flex snap-x gap-px overflow-x-auto scroll-smooth bg-[#c9c7bf] pb-px md:mt-14"
        >
          {itens.map((produto) => (
            <div
              key={produto.id}
              className="w-[78vw] max-w-[360px] shrink-0 snap-start bg-[#f7f5ef] sm:w-[43vw] lg:w-[24vw]"
            >
              <StellaProductCard produto={produto} config={config} />
            </div>
          ))}
        </CarouselScrollArea>
      </div>
    </RevealSection>
  );
}

function getTextoImagem(config: Record<string, unknown>) {
  const desktop = getStringWithDefault(config, [
    "imagemDesktopUrl",
    "imagemDesktop",
    "imagemUrl",
  ]);
  const mobile = getStringWithDefault(config, ["imagemMobileUrl", "imagemMobile"]);
  const titulo = getStringWithDefault(config, "titulo");

  return {
    titulo,
    texto: getStringWithDefault(config, ["texto", "descricao", "conteudo"]),
    textoBotao: getStringWithDefault(config, ["textoBotao", "botaoTexto"]),
    href: normalizeHref(
      getStringWithDefault(config, ["linkBotao", "botaoLink", "linkUrl"])
    ),
    desktop,
    mobile,
    alt: getStringWithDefault(config, "imagemAlt") || titulo,
    imagemPrimeiro:
      getString(config, ["layoutDesktopTextoImagem", "layoutDesktop"]) !==
      "IMAGEM_DIREITA",
    exibirMidia:
      getBoolean(config, "exibirMidia", true) &&
      Boolean(
        desktop ||
          mobile ||
          getBoolean(config, "mostrarPlaceholderSemMidia", false)
      ),
    exibirTitulo:
      getBoolean(config, "exibirTexto", true) &&
      getBoolean(config, "mostrarTitulo", true),
    exibirTexto: getBoolean(config, "exibirSubtitulo", true),
    exibirBotao: getBoolean(config, "exibirBotao", true),
  };
}

function StellaEditorialFeature({
  bloco,
  variant = "light",
}: {
  bloco: StellaHomeBlock;
  variant?: "light" | "gift" | "story";
}) {
  const content = getTextoImagem(asConfig(bloco.configJson));

  const hasTitulo = content.exibirTitulo && Boolean(content.titulo);
  const hasTexto = content.exibirTexto && Boolean(content.texto);
  const hasBotao =
    content.exibirBotao && Boolean(content.href && content.textoBotao);

  if (!hasTitulo && !hasTexto && !hasBotao && !content.exibirMidia) {
    return null;
  }

  const gift = variant === "gift";
  const story = variant === "story";
  const sectionClass = gift
    ? "bg-[#171916] text-white"
    : story
      ? "bg-[#dcd8cd] text-[#171916]"
      : "bg-[#e8e5dc] text-[#171916]";

  return (
    <RevealSection className={`${styles.editorialFeature} border-y border-black/15 ${sectionClass}`}>
      <div
        className={`grid min-h-[680px] ${content.exibirMidia ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)]" : "lg:grid-cols-1"}`}
      >
        {content.exibirMidia ? (
          <div
            className={`${styles.mediaGroup} min-h-[500px] overflow-hidden lg:min-h-[820px] ${content.imagemPrimeiro ? "lg:order-1" : "lg:order-2"}`}
          >
            <Media
              desktop={content.desktop}
              mobile={content.mobile}
              alt={content.alt}
              className="h-full w-full"
            />
          </div>
        ) : null}

        <div
          className={`${styles.editorialCopyColumn} flex items-center border-black/15 px-5 py-18 sm:px-10 md:px-14 lg:border-l lg:py-24 xl:px-20 ${content.imagemPrimeiro ? "lg:order-2" : "lg:order-1 lg:border-l-0 lg:border-r"}`}
        >
          <div className="max-w-xl">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${gift ? "text-white/70" : "text-[#555750]"}`}
            >
              {gift ? "Presentes" : story ? "História" : "Editorial Stella"}
            </p>
            {hasTitulo ? (
              <h2
                data-stella-inline-field="titulo"
                className={`${styles.editorialTitle} mt-6 text-[clamp(2.65rem,5.8vw,7rem)] font-medium uppercase`}
              >
                {content.titulo}
              </h2>
            ) : null}
            {hasTexto ? (
              <p
                data-stella-inline-field="texto"
                className={`${styles.editorialBody} mt-8 max-w-lg text-base ${gift ? "text-white/72" : "text-[#595b56]"}`}
              >
                {content.texto}
              </p>
            ) : null}
            {hasBotao ? (
              <SmartLink
                href={content.href}
                className={`mt-10 inline-flex min-h-11 items-center gap-4 border-b pb-1 text-xs font-semibold uppercase tracking-[0.14em] transition ${gift ? "border-white/55 text-white hover:border-white" : "border-[#171916]/50 text-[#171916] hover:border-[#171916]"}`}
              >
                <span data-stella-inline-field="textoBotao">{content.textoBotao}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </SmartLink>
            ) : null}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function getCategoryItems(
  config: Record<string, unknown>,
  categorias: CategoriaMenuPublicoItem[]
) {
  const byId = new Map(categorias.map((categoria) => [categoria.id, categoria]));
  const bySlug = new Map(categorias.map((categoria) => [categoria.slug, categoria]));

  return getArray(config, "itens")
    .map(asConfig)
    .map((item, index) => {
      const categoria =
        byId.get(getString(item, "categoriaId")) ||
        bySlug.get(getString(item, "categoriaSlug"));

      if (!categoria) return null;

      return {
        id: getString(item, "id", categoria.id),
        titulo: getString(item, "titulo", categoria.nome),
        href: `/loja/categoria/${categoria.slug}`,
        desktop:
          getString(item, ["imagemDesktopUrl", "imagemUrl"]) ||
          categoria.imagemUrl ||
          "",
        mobile: getString(item, "imagemMobileUrl"),
        alt: getString(item, "alt") || categoria.nome,
        index,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function StellaCategoryDiscovery({
  bloco,
  categorias,
  compact = false,
}: {
  bloco: StellaHomeBlock;
  categorias: CategoriaMenuPublicoItem[];
  compact?: boolean;
}) {
  const config = asConfig(bloco.configJson);
  const itens = getCategoryItems(config, categorias).slice(0, 4);

  if (itens.length === 0) return null;

  const titulo = getStringWithDefault(
    config,
    "titulo",
    compact ? "Mais categorias para explorar" : "Explore por categoria"
  );
  const descricao = getStringWithDefault(config, ["subtitulo", "descricao"]);

  if (compact) {
    return (
      <RevealSection className={`${styles.categoriesCompact} bg-[#edeae2] px-5 py-20 text-[#171916] sm:px-7 md:py-28 lg:px-12`}>
        <div className="mx-auto max-w-[100rem]">
          <SectionHeading eyebrow="Descobrir" titulo={titulo} descricao={descricao} />
          <div className="mt-10 grid grid-cols-2 gap-px border border-[#c5c2b9] bg-[#c5c2b9] md:mt-14 md:grid-cols-4">
            {itens.map((item, index) => (
              <SmartLink
                key={item.id}
                href={item.href}
                className={`${styles.mediaGroup} ${styles.categoryCard} group block min-w-0 bg-[#edeae2]`}
                ariaLabel={`Explorar categoria ${item.titulo}`}
              >
                <Media
                  desktop={item.desktop}
                  mobile={item.mobile}
                  alt={item.alt}
                  className="aspect-[4/5] w-full"
                />
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-5 text-sm font-semibold uppercase text-[#171916]">
                  <span className="text-[10px] font-medium tracking-[0.18em] text-[#666861]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="tracking-[0.08em]">{item.titulo}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </div>
              </SmartLink>
            ))}
          </div>
        </div>
      </RevealSection>
    );
  }

  return (
    <RevealSection className={`${styles.categoriesSection} bg-[#f7f5ef] px-5 py-20 text-[#171916] sm:px-7 md:py-32 lg:px-12`}>
      <div className="mx-auto max-w-[100rem]">
        <SectionHeading eyebrow="Navegue" titulo={titulo} descricao={descricao} />
        <div
          className="scrollbar-hidden mt-12 grid grid-flow-col auto-cols-[84%] gap-px overflow-x-auto border-y border-[#c5c2b9] bg-[#c5c2b9] pb-px md:mt-20 md:grid-flow-row md:auto-cols-auto md:grid-cols-4 md:overflow-visible"
        >
          {itens.map((item, index) => (
            <SmartLink
              key={item.id}
              href={item.href}
              className={`${styles.mediaGroup} ${styles.categoryCard} group block min-w-0 bg-[#f7f5ef]`}
              ariaLabel={`Explorar categoria ${item.titulo}`}
            >
              <div className="relative overflow-hidden">
                <Media
                  desktop={item.desktop}
                  mobile={item.mobile}
                  alt={item.alt}
                  className="aspect-[4/5] w-full"
                />
                <span className="absolute left-4 top-4 border border-white/45 bg-black/20 px-3 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-white backdrop-blur-sm">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-5 md:px-5 md:py-6">
                <h3 className={`${styles.categoryTitle} text-xl font-medium uppercase text-[#171916] md:text-2xl`}>
                  {item.titulo}
                </h3>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#171916] transition group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
              </div>
            </SmartLink>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function StellaFeaturedSelection({
  bloco,
  produtos,
}: {
  bloco: StellaHomeBlock;
  produtos: StellaHomeProduct[];
}) {
  const config = asConfig(bloco.configJson);
  const itens = filtrarProdutos(produtos, config).slice(0, 5);

  if (itens.length === 0) return null;

  return (
    <RevealSection className={`${styles.featuredSection} bg-[#dcd8cd] px-5 py-20 text-[#171916] sm:px-7 md:py-32 lg:px-12`}>
      <div className="mx-auto max-w-[100rem]">
        <SectionHeading
          eyebrow="Curadoria"
          titulo={getStringWithDefault(config, "titulo", "Destaques")}
          descricao={getStringWithDefault(config, ["descricao", "subtitulo"])}
        />
        <div className="mt-12 grid gap-px bg-black/20 lg:grid-cols-[1.08fr_.92fr]">
          <StellaProductCard produto={itens[0]} config={config} />
          <div className="grid grid-cols-2 gap-px bg-black/20">
            {itens.slice(1).map((produto) => (
              <div key={produto.id} className="bg-[#dcd8cd]">
                <StellaProductCard produto={produto} config={config} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function StellaTrustSection({ bloco }: { bloco: StellaHomeBlock }) {
  const config = asConfig(bloco.configJson);
  const cards = getCards(config).slice(0, 4);

  if (cards.length === 0) return null;

  return (
    <RevealSection className={`${styles.trustSection} bg-[#f7f5ef] px-5 py-20 text-[#171916] sm:px-7 md:py-32 lg:px-12`}>
      <div className="mx-auto grid max-w-[100rem] gap-12 border-t border-[#c5c2b9] pt-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#62645e]">
            Informações reais
          </p>
          <h2
            data-stella-inline-field="titulo"
            className={`${styles.trustTitle} mt-6 text-[clamp(2.6rem,5vw,6.2rem)] font-medium uppercase text-[#171916]`}
          >
            {getStringWithDefault(
              config,
              "titulo",
              "Informações para sua compra"
            )}
          </h2>
          <p className="mt-7 max-w-md text-base leading-8 text-[#5b5d57]">
            {getStringWithDefault(config, ["descricao", "subtitulo"])}
          </p>
        </div>
        <div className="grid gap-px border border-[#c5c2b9] bg-[#c5c2b9] sm:grid-cols-2">
          {cards.map((card, index) => (
            <article key={card.id} className="bg-[#f7f5ef] p-7 md:min-h-64 md:p-9">
              <p className="text-[10px] font-semibold tracking-[0.24em] text-[#62645e]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-8 text-xl font-medium uppercase tracking-[-0.015em] text-[#171916]">
                {card.titulo}
              </h3>
              {card.texto ? (
                <p className="mt-3 text-sm leading-7 text-[#5b5d57]">{card.texto}</p>
              ) : null}
              {card.href && card.textoBotao ? (
                <SmartLink
                  href={card.href}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#171916] underline-offset-4 hover:underline"
                >
                  {card.textoBotao}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </SmartLink>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function getGalleryHref(item: Record<string, unknown>) {
  const tipo = getString(item, "linkTipo", "URL");
  const valor = getString(item, ["linkValor", "linkUrl"]);
  const produtoId = getString(item, "produtoId");

  if (tipo === "PRODUTO") {
    const target = valor || produtoId;
    return target ? `/loja/produto/${target}` : "";
  }
  if (tipo === "CATEGORIA") return valor ? `/loja/categoria/${valor}` : "";
  if (tipo === "PAGINA") return valor ? `/loja/p/${valor}` : "";
  if (tipo === "COLECAO") return valor ? `/loja/colecao/${valor}` : "";

  return normalizeHref(valor) || (produtoId ? `/loja/produto/${produtoId}` : "");
}

function StellaEditorialGallery({
  bloco,
  produtos,
}: {
  bloco: StellaHomeBlock;
  produtos: StellaHomeProduct[];
}) {
  const config = asConfig(bloco.configJson);
  const fonte = asConfig(config.fonte);
  const quantidade = Math.max(1, Math.min(4, getNumber(fonte, "quantidade", 4)));
  const itensRaw = getArray(config, "itens").map(asConfig);
  const itens = Array.from({ length: quantidade }, (_, index) =>
    itensRaw[index] || {}
  );
  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));

  return (
    <RevealSection className={`${styles.gallerySection} bg-[#dcd8cd] px-5 py-20 text-[#171916] sm:px-7 md:py-32 lg:px-12`}>
      <div className="mx-auto max-w-[100rem]">
        <SectionHeading
          eyebrow="Atmosfera"
          titulo={getStringWithDefault(config, "titulo", "Galeria editorial")}
          descricao={getStringWithDefault(config, "descricao")}
        />
        <div
          className={`scrollbar-hidden mt-12 grid grid-flow-col auto-cols-[85%] gap-px overflow-x-auto border-y border-[#aaa79f] bg-[#aaa79f] pb-px md:mt-20 md:grid-flow-row md:auto-cols-auto md:overflow-visible ${quantidade === 1 ? "md:grid-cols-1" : quantidade === 2 ? "md:grid-cols-2" : "md:grid-cols-6"}`}
        >
          {itens.map((item, index) => {
            const itemId = getString(item, "id", `galeria-${index + 1}`);
            const produto = produtosPorId.get(getString(item, "produtoId"));
            const desktop =
              getStringWithDefault(item, [
                "imagemDesktop",
                "imagemDesktopUrl",
                "imagemUrl",
              ]) || produto?.imagemUrl || "";
            const mobile =
              getStringWithDefault(item, ["imagemMobile", "imagemMobileUrl"]) ||
              desktop;
            const alt =
              getStringWithDefault(item, ["alt", "altText"]) ||
              produto?.nome ||
              "";
            const label =
              alt ||
              getStringWithDefault(item, ["titulo", "subtitulo"]) ||
              `Explorar item ${index + 1} da galeria`;
            const href = getGalleryHref(item);
            const focoX = Math.max(0, Math.min(100, getNumber(item, "focoX", 50)));
            const focoY = Math.max(0, Math.min(100, getNumber(item, "focoY", 50)));
            const focoMobileX = Math.max(
              0,
              Math.min(100, getNumber(item, "focoMobileX", focoX))
            );
            const focoMobileY = Math.max(
              0,
              Math.min(100, getNumber(item, "focoMobileY", focoY))
            );
            const zoom = Math.max(100, Math.min(150, getNumber(item, "zoom", 100)));
            const zoomMobile = Math.max(
              100,
              Math.min(150, getNumber(item, "zoomMobile", zoom))
            );
            const imageStyle = {
              "--stella-gallery-position-desktop": `${focoX}% ${focoY}%`,
              "--stella-gallery-position-mobile": `${focoMobileX}% ${focoMobileY}%`,
              "--stella-gallery-zoom-desktop": zoom / 100,
              "--stella-gallery-zoom-mobile": zoomMobile / 100,
            } as CSSProperties;
            const media = (
              <Media
                desktop={desktop}
                mobile={mobile}
                alt={alt}
                className={`w-full ${index === 0 ? "aspect-[4/5] md:aspect-[4/5]" : "aspect-[4/5]"}`}
                imageClassName={styles.galleryMediaImage}
                imageStyle={imageStyle}
              />
            );

            return (
              <div
                key={itemId}
                data-stella-editorial-gallery-item-id={itemId}
                className={`${styles.mediaGroup} min-w-0 bg-[#dcd8cd] ${quantidade <= 2 ? "" : index === 0 ? "md:col-span-3" : "md:col-span-1"}`}
              >
                {href ? (
                  <SmartLink href={href} className="block h-full" ariaLabel={label}>
                    {media}
                  </SmartLink>
                ) : (
                  media
                )}
              </div>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}

function StellaInlineCta({ bloco }: { bloco: StellaHomeBlock }) {
  const config = asConfig(bloco.configJson);
  const texto = getStringWithDefault(config, [
    "textoBotaoPrimario",
    "textoBotao",
    "botaoTexto",
  ]);
  const href = normalizeHref(
    getStringWithDefault(config, [
      "linkBotaoPrimario",
      "linkBotao",
      "botaoLink",
      "linkUrl",
    ])
  );

  if (
    !getBoolean(config, "exibirTexto", true) ||
    !getBoolean(config, "exibirBotaoPrimario", true) ||
    !texto ||
    !href
  ) {
    return null;
  }

  return (
    <RevealSection className="bg-[#f7f5ef] px-5 pb-20 text-center text-[#171916] sm:px-7 md:pb-28 lg:px-12">
      <SmartLink
        href={href}
        className="inline-flex min-h-11 items-center gap-4 border-b border-[#171916]/55 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#171916] hover:border-[#171916]"
      >
        <span data-stella-inline-field="textoBotao">{texto}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </SmartLink>
    </RevealSection>
  );
}

function StellaFinalCta({ bloco }: { bloco: StellaHomeBlock }) {
  const config = asConfig(bloco.configJson);
  const exibirTexto = getBoolean(config, "exibirTexto", true);
  const titulo = getStringWithDefault(config, "titulo", "Continue explorando");
  const texto = getStringWithDefault(config, ["texto", "descricao"]);
  const primarioTexto = getStringWithDefault(config, [
    "textoBotaoPrimario",
    "textoBotao",
  ]);
  const primarioHref = normalizeHref(
    getStringWithDefault(config, ["linkBotaoPrimario", "linkBotao"])
  );
  const secundarioTexto = getStringWithDefault(config, "textoBotaoSecundario");
  const secundarioHref = normalizeHref(
    getStringWithDefault(config, "linkBotaoSecundario")
  );
  const hasTitulo = exibirTexto && Boolean(titulo);
  const hasTexto = exibirTexto && Boolean(texto);
  const hasPrimario =
    exibirTexto &&
    getBoolean(config, "exibirBotaoPrimario", true) &&
    Boolean(primarioTexto && primarioHref);
  const hasSecundario =
    exibirTexto &&
    getBoolean(config, "exibirBotaoSecundario", false) &&
    Boolean(secundarioTexto && secundarioHref);

  if (!hasTitulo && !hasTexto && !hasPrimario && !hasSecundario) return null;

  return (
    <RevealSection className={`${styles.finalCta} relative overflow-hidden border-y border-white/15 bg-[#171916] px-5 py-24 text-white sm:px-7 md:py-36 lg:px-12`}>
      <div className="relative mx-auto max-w-[100rem] text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/65">
          Stella Colari
        </p>
        {hasTitulo ? (
          <h2
            data-stella-inline-field="titulo"
            className={`${styles.finalCtaTitle} mx-auto mt-7 max-w-[16ch] text-[clamp(3rem,8vw,9rem)] font-medium uppercase`}
          >
            {titulo}
          </h2>
        ) : null}
        {hasTexto ? (
          <p
            data-stella-inline-field="texto"
            className="mx-auto mt-8 max-w-xl text-base leading-8 text-white/70"
          >
            {texto}
          </p>
        ) : null}
        <div className="mt-11 flex flex-wrap justify-center gap-3">
          {hasPrimario ? (
            <SmartLink
              href={primarioHref}
              className="inline-flex min-h-12 items-center border border-white bg-white px-7 text-xs font-semibold uppercase tracking-[0.14em] text-[#171916] hover:bg-transparent hover:text-white"
            >
              <span data-stella-inline-field="textoBotao">{primarioTexto}</span>
            </SmartLink>
          ) : null}
          {hasSecundario ? (
            <SmartLink
              href={secundarioHref}
              className="inline-flex min-h-12 items-center border border-white/55 px-7 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:border-white hover:bg-white hover:text-[#171916]"
            >
              <span data-stella-inline-field="textoBotaoSecundario">{secundarioTexto}</span>
            </SmartLink>
          ) : null}
        </div>
      </div>
    </RevealSection>
  );
}

const STELLA_PRODUCT_SOURCES = new Set([
  "TODOS",
  "NOVOS",
  "DESCONTOS",
  "MAIS_VENDIDOS",
  "CATEGORIA",
  "CATEGORIAS_SELECIONADAS",
  "MANUAL",
  "COLECAO_INTELIGENTE",
]);

export function canRenderStellaHomeBlock(
  bloco: StellaHomeBlock,
  blockKey: StellaHomeBlockKey
) {
  const config = asConfig(bloco.configJson);

  if (blockKey === "home.hero") {
    const slides = getArray(config, "slides");
    const carrossel = asConfig(config.carrossel);
    const slide = asConfig(slides[0]);
    const linkSlide = asConfig(slide.linkSlide);

    return (
      slides.length === 1 &&
      !getBoolean(carrossel, "ativo", false) &&
      getString(slide, "tipoMidia", "IMAGEM") === "IMAGEM" &&
      getString(config, "navegacaoInferior", "NENHUMA") === "NENHUMA" &&
      !getStringWithDefault(linkSlide, "valor")
    );
  }

  if (blockKey === "home.novidades" || blockKey === "home.destaques") {
    return STELLA_PRODUCT_SOURCES.has(getString(config, "fonte", "TODOS"));
  }

  if (
    blockKey === "home.editorial" ||
    blockKey === "home.presentes" ||
    blockKey === "home.story"
  ) {
    return (
      getString(config, "tipoMidia", "IMAGEM") === "IMAGEM" &&
      !getString(config, "videoDesktopUrl") &&
      !getString(config, "videoMobileUrl")
    );
  }

  if (blockKey === "home.galeria") {
    const fonte = asConfig(config.fonte);
    const hover = asConfig(config.hover);
    const quantidade = getNumber(fonte, "quantidade", 4);

    return (
      getString(fonte, "tipo", "MANUAL") === "MANUAL" &&
      quantidade >= 1 &&
      quantidade <= 4 &&
      getString(hover, "tipo", "ZOOM_LEVE") === "ZOOM_LEVE"
    );
  }

  if (blockKey === "home.valores") {
    return getArray(config, "cards").every((card) => {
      const cardConfig = asConfig(card);

      if (!getBoolean(cardConfig, "exibirMidia", true)) return true;

      return ["IMAGEM", "ICONE", "NENHUMA"].includes(
        getString(cardConfig, "tipoMidia", "ICONE")
      );
    });
  }

  if (
    blockKey === "home.categorias" ||
    blockKey === "home.categorias-destaque"
  ) {
    return getArray(config, "itens").every((item) => {
      const itemConfig = asConfig(item);

      return (
        getString(itemConfig, "tipoMidia", "IMAGEM") === "IMAGEM" &&
        !getString(itemConfig, "videoDesktopUrl") &&
        !getString(itemConfig, "videoMobileUrl")
      );
    });
  }

  if (blockKey === "home.novidades-cta" || blockKey === "home.cta-final") {
    const hasMedia = Boolean(
      getString(config, "imagemDesktopUrl") ||
        getString(config, "imagemMobileUrl") ||
        getString(config, "videoDesktopUrl") ||
        getString(config, "videoMobileUrl")
    );

    return !(getBoolean(config, "exibirMidia", false) && hasMedia);
  }

  return true;
}

export default function StellaHomeBlockRenderer({
  bloco,
  blockKey,
  produtos,
  categorias,
}: StellaHomeBlockRendererProps) {
  const content = useMemo(() => {
    if (blockKey === "home.hero") return <StellaHero bloco={bloco} />;
    if (blockKey === "home.valores") return <StellaBrandValues bloco={bloco} />;
    if (blockKey === "home.categorias") {
      return <StellaCategoryDiscovery bloco={bloco} categorias={categorias} />;
    }
    if (blockKey === "home.novidades") {
      return <StellaNewArrivals bloco={bloco} produtos={produtos} />;
    }
    if (blockKey === "home.novidades-cta") return <StellaInlineCta bloco={bloco} />;
    if (blockKey === "home.editorial") return <StellaEditorialFeature bloco={bloco} />;
    if (blockKey === "home.destaques") {
      return <StellaFeaturedSelection bloco={bloco} produtos={produtos} />;
    }
    if (blockKey === "home.presentes") {
      return <StellaEditorialFeature bloco={bloco} variant="gift" />;
    }
    if (blockKey === "home.categorias-destaque") {
      return (
        <StellaCategoryDiscovery bloco={bloco} categorias={categorias} compact />
      );
    }
    if (blockKey === "home.informacoes") return <StellaTrustSection bloco={bloco} />;
    if (blockKey === "home.story") {
      return <StellaEditorialFeature bloco={bloco} variant="story" />;
    }
    if (blockKey === "home.galeria") {
      return <StellaEditorialGallery bloco={bloco} produtos={produtos} />;
    }
    if (blockKey === "home.cta-final") return <StellaFinalCta bloco={bloco} />;

    return null;
  }, [bloco, blockKey, categorias, produtos]);

  return content;
}
