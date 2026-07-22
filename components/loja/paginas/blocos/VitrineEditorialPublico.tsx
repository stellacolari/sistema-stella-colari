"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  asConfig,
  getArray,
  getBoolean,
  getNumber,
  getString,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";
import { registrarCliqueVitrineEditorial } from "@/lib/loja/eventos-client";

type VitrineDevicePreview = "DESKTOP" | "TABLET" | "MOBILE";

type VitrineEditorialItem = {
  id: string;
  tipoLink: string;
  categoriaId: string;
  categoriaSlug: string;
  categoriaNome: string;
  categoriaImagemUrl: string;
  paginaId: string;
  paginaSlug: string;
  paginaTitulo: string;
  linkUrl: string;
  label: string;
  textoBotao: string;
  labelStyle: CSSProperties;
  textoBotaoStyle: CSSProperties;
  imagemDesktop: string;
  imagemMobile: string;
  altText: string;
  focoHorizontal: number;
  focoVertical: number;
  zoom: number;
  focoMobileHorizontal: number;
  focoMobileVertical: number;
  zoomMobile: number;
  ocultarNome: boolean;
  ocultarBotao: boolean;
  abrirNovaAba: boolean;
};

type VitrineEditorialPublicoProps = BlocoPublicoProps & {
  device?: VitrineDevicePreview;
  modo?: "publico" | "editor";
  categorias?: {
    id: string;
    nome: string;
    slug: string;
    imagemUrl?: string | null;
  }[];
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getQuantidade(value: number) {
  const rounded = Math.round(value);
  if ([3, 4, 5].includes(rounded)) return rounded;
  return 3;
}

function getAlturaVisual(value: string) {
  return value === "COMPACTA" ? "COMPACTA" : "PADRAO";
}

function getAnimacao(value: string) {
  if (
    [
      "SUBINDO_EM_SEQUENCIA",
      "LATERAL_EM_SEQUENCIA",
      "FADE_EM_SEQUENCIA",
    ].includes(value)
  ) {
    return value;
  }

  return "SEM_ANIMACAO";
}

function criarItemPadrao(index: number): VitrineEditorialItem {
  return {
    id: `vitrine-${index}`,
    tipoLink: "CATEGORIA",
    categoriaId: "",
    categoriaSlug: "",
    categoriaNome: "",
    categoriaImagemUrl: "",
    paginaId: "",
    paginaSlug: "",
    paginaTitulo: "",
    linkUrl: "",
    label: "",
    textoBotao: "Explorar",
    labelStyle: {},
    textoBotaoStyle: {},
    imagemDesktop: "",
    imagemMobile: "",
    altText: "",
    focoHorizontal: 50,
    focoVertical: 50,
    zoom: 100,
    focoMobileHorizontal: 50,
    focoMobileVertical: 50,
    zoomMobile: 100,
    ocultarNome: false,
    ocultarBotao: false,
    abrirNovaAba: false,
  };
}

function getTextStyle(value: unknown): CSSProperties {
  const style = asConfig(value);
  const fontFamily = getString(style, "fontFamily", "PRINCIPAL");
  const fontSizePreset = getString(style, "fontSizePreset");
  const fontWeight = getString(style, "fontWeight");
  const colorPreset = getString(style, "colorPreset");
  const colorCustom = getString(style, "colorCustom");
  const letterSpacing = getString(style, "letterSpacing");
  const lineHeight = getString(style, "lineHeight");
  const textTransform = getString(style, "textTransform");

  const fontSizeMap: Record<string, string> = {
    PEQUENO: "0.875rem",
    MEDIO: "1rem",
    GRANDE: "1.5rem",
    EXTRA_GRANDE: "2.75rem",
    EDITORIAL: "3rem",
  };
  const fontWeightMap: Record<string, number> = {
    LIGHT: 300,
    REGULAR: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    BLACK: 900,
  };
  const colorMap: Record<string, string> = {
    CLARO: "#ffffff",
    ESCURO: "#0f172a",
    DOURADO: "#b8892e",
  };
  const letterSpacingMap: Record<string, string> = {
    NORMAL: "0",
    LEVE: "0.02em",
    MEDIO: "0.08em",
    ALTO: "0.14em",
  };
  const lineHeightMap: Record<string, string> = {
    COMPACTO: "1",
    NORMAL: "1.15",
    RESPIRADO: "1.35",
    AMPLO: "1.6",
  };

  return {
    fontFamily:
      fontFamily === "EDITORIAL"
        ? "Georgia, 'Times New Roman', serif"
        : "var(--font-primary)",
    ...(fontSizeMap[fontSizePreset] ? { fontSize: fontSizeMap[fontSizePreset] } : {}),
    ...(fontWeightMap[fontWeight] ? { fontWeight: fontWeightMap[fontWeight] } : {}),
    ...(letterSpacingMap[letterSpacing]
      ? { letterSpacing: letterSpacingMap[letterSpacing] }
      : {}),
    ...(lineHeightMap[lineHeight] ? { lineHeight: lineHeightMap[lineHeight] } : {}),
    ...(textTransform && textTransform !== "NORMAL"
      ? { textTransform: textTransform === "UPPERCASE" ? "uppercase" : "capitalize" }
      : {}),
    ...(colorPreset === "PERSONALIZADO" && colorCustom
      ? { color: colorCustom }
      : colorMap[colorPreset]
        ? { color: colorMap[colorPreset] }
        : {}),
  };
}

function getItem(data: unknown, index: number): VitrineEditorialItem {
  const config = asConfig(data);
  const itemPadrao = criarItemPadrao(index + 1);

  return {
    id: getString(config, "id", itemPadrao.id),
    tipoLink: getString(config, "tipoLink", itemPadrao.tipoLink),
    categoriaId: getString(config, "categoriaId"),
    categoriaSlug: getString(config, "categoriaSlug"),
    categoriaNome: getString(config, "categoriaNome"),
    categoriaImagemUrl:
      getString(config, "categoriaImagemUrl") ||
      getString(config, "imagemCategoriaUrl"),
    paginaId: getString(config, "paginaId"),
    paginaSlug: getString(config, "paginaSlug"),
    paginaTitulo: getString(config, "paginaTitulo"),
    linkUrl: getString(config, "linkUrl"),
    label:
      getString(config, "label") ||
      getString(config, "titulo") ||
      getString(config, "nome"),
    textoBotao:
      getString(config, "textoBotao") ||
      getString(config, "textoLink") ||
      itemPadrao.textoBotao,
    labelStyle: getTextStyle(config.labelStyle),
    textoBotaoStyle: getTextStyle(config.textoBotaoStyle),
    imagemDesktop:
      getString(config, "imagemDesktop") ||
      getString(config, "imagemDesktopUrl") ||
      getString(config, "imagemUrl"),
    imagemMobile:
      getString(config, "imagemMobile") ||
      getString(config, "imagemMobileUrl"),
    altText: getString(config, "altText") || getString(config, "alt"),
    focoHorizontal: clampNumber(
      getNumber(config, "focoHorizontal", getNumber(config, "mediaCropDesktopX", 50)),
      0,
      100,
    ),
    focoVertical: clampNumber(
      getNumber(config, "focoVertical", getNumber(config, "mediaCropDesktopY", 50)),
      0,
      100,
    ),
    zoom: clampNumber(getNumber(config, "zoom", 100), 100, 160),
    focoMobileHorizontal: clampNumber(
      getNumber(
        config,
        "focoMobileHorizontal",
        getNumber(config, "focoHorizontal", getNumber(config, "mediaCropDesktopX", 50))
      ),
      0,
      100,
    ),
    focoMobileVertical: clampNumber(
      getNumber(
        config,
        "focoMobileVertical",
        getNumber(config, "focoVertical", getNumber(config, "mediaCropDesktopY", 50))
      ),
      0,
      100,
    ),
    zoomMobile: clampNumber(
      getNumber(config, "zoomMobile", getNumber(config, "zoom", 100)),
      100,
      160,
    ),
    ocultarNome: getBoolean(config, "ocultarNome", false),
    ocultarBotao: getBoolean(config, "ocultarBotao", false),
    abrirNovaAba: getBoolean(config, "abrirNovaAba", false),
  };
}

function getItens(config: Record<string, unknown>, quantidade: number) {
  const itensConfig = getArray(config, "itens");
  const itens =
    itensConfig.length > 0
      ? itensConfig.map((item, index) => getItem(item, index))
      : Array.from({ length: quantidade }, (_, index) => criarItemPadrao(index + 1));

  return Array.from({ length: quantidade }, (_, index) => {
    return itens[index] || criarItemPadrao(index + 1);
  });
}

function normalizeCustomUrl(value: string) {
  const url = value.trim();

  if (!url) return "";

  if (/^(https?:\/\/|\/|mailto:|tel:)/i.test(url)) return url;

  return "";
}

function getItemHref(item: VitrineEditorialItem) {
  if (item.tipoLink === "CATEGORIA" && item.categoriaSlug) {
    return `/loja/categoria/${item.categoriaSlug}`;
  }

  if (item.tipoLink === "PAGINA" && item.paginaSlug) {
    return `/loja/p/${item.paginaSlug}`;
  }

  if (item.tipoLink === "URL_PERSONALIZADA") {
    return normalizeCustomUrl(item.linkUrl);
  }

  return "";
}

function isExternalHref(href: string) {
  return /^(https?:)?\/\//i.test(href) || /^mailto:|^tel:/i.test(href);
}

function getGridClass(quantidade: number) {
  if (quantidade === 5) return "md:grid-cols-3 lg:grid-cols-5";
  if (quantidade === 4) return "md:grid-cols-2 lg:grid-cols-4";
  return "md:grid-cols-3";
}

function getForcedGridClass(quantidade: number, device?: VitrineDevicePreview) {
  if (device === "MOBILE") {
    return "grid-flow-col auto-cols-[78%] overflow-x-auto";
  }

  if (device === "TABLET") {
    return "grid-flow-row auto-cols-auto grid-cols-2 overflow-visible";
  }

  if (device === "DESKTOP") {
    if (quantidade === 5) {
      return "grid-flow-row auto-cols-auto grid-cols-5 overflow-visible";
    }

    if (quantidade === 4) {
      return "grid-flow-row auto-cols-auto grid-cols-4 overflow-visible";
    }

    return "grid-flow-row auto-cols-auto grid-cols-3 overflow-visible";
  }

  return `grid-flow-col auto-cols-[78%] overflow-x-auto sm:auto-cols-[44%] md:grid-flow-row md:auto-cols-auto md:overflow-visible ${getGridClass(
    quantidade,
  )}`;
}

function getAspectClass(alturaVisual: string) {
  return alturaVisual === "COMPACTA" ? "aspect-[6/5]" : "aspect-[4/5]";
}

function CardWrapper({
  href,
  abrirNovaAba,
  modo,
  children,
  onClick,
}: {
  href: string;
  abrirNovaAba: boolean;
  modo: "publico" | "editor";
  children: ReactNode;
  onClick?: () => void;
}) {
  if (!href || modo === "editor") {
    return <div className="block h-full">{children}</div>;
  }

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target={abrirNovaAba ? "_blank" : undefined}
        rel={abrirNovaAba ? "noreferrer" : undefined}
        onClick={onClick}
        className="block h-full"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      target={abrirNovaAba ? "_blank" : undefined}
      onClick={onClick}
      className="block h-full"
    >
      {children}
    </Link>
  );
}

export default function VitrineEditorialPublico({
  bloco,
  device,
  modo = "publico",
  categorias = [],
}: VitrineEditorialPublicoProps) {
  const config = asConfig(bloco.configJson);
  const quantidade = getQuantidade(getNumber(config, "quantidadeItens", 3));
  const alturaVisual = getAlturaVisual(getString(config, "alturaVisual", "PADRAO"));
  const animacaoBloco = getAnimacao(
    getString(config, "animacaoBloco", "SEM_ANIMACAO"),
  );
  const itens = getItens(config, quantidade);
  const gridClass = getForcedGridClass(quantidade, device);
  const aspectClass = getAspectClass(alturaVisual);
  const paddingYClass =
    device === "MOBILE" ? "py-10" : device ? "py-12" : "py-10 md:py-14";
  const forceMobile = device === "MOBILE";

  return (
    <section className="w-full bg-white text-slate-950">
      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .stella-vitrine-editorial-image {
              transition: transform 500ms ease;
            }

            .stella-vitrine-editorial-card[data-animation="SUBINDO_EM_SEQUENCIA"] {
              opacity: 0;
              animation: stella-vitrine-up 720ms cubic-bezier(.22, 1, .36, 1) forwards;
            }

            .stella-vitrine-editorial-card[data-animation="LATERAL_EM_SEQUENCIA"] {
              opacity: 0;
              animation: stella-vitrine-side 720ms cubic-bezier(.22, 1, .36, 1) forwards;
            }

            .stella-vitrine-editorial-card[data-animation="FADE_EM_SEQUENCIA"] {
              opacity: 0;
              animation: stella-vitrine-fade 640ms ease forwards;
            }
          }

          .stella-vitrine-editorial-image {
            object-position: var(--vitrine-image-position-desktop);
            transform: scale(var(--vitrine-image-zoom-desktop));
            transform-origin: var(--vitrine-image-position-desktop);
          }

          @media (max-width: 767px) {
            .stella-vitrine-editorial-image {
              object-position: var(--vitrine-image-position-mobile);
              transform: scale(var(--vitrine-image-zoom-mobile));
              transform-origin: var(--vitrine-image-position-mobile);
            }
          }

          @keyframes stella-vitrine-up {
            from { opacity: 0; transform: translateY(22px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes stella-vitrine-side {
            from { opacity: 0; transform: translateX(22px); }
            to { opacity: 1; transform: translateX(0); }
          }

          @keyframes stella-vitrine-fade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>

      <div
        className={`grid w-full gap-5 ${paddingYClass} ${gridClass}`}
        style={{ paddingInline: "8%" }}
      >
        {itens.map((item, index) => {
          const categoriaFallback = categorias.find(
            (categoria) =>
              categoria.id === item.categoriaId ||
              categoria.slug === item.categoriaSlug,
          );
          const itemResolvido = {
            ...item,
            categoriaSlug: item.categoriaSlug || categoriaFallback?.slug || "",
            categoriaNome: item.categoriaNome || categoriaFallback?.nome || "",
            categoriaImagemUrl:
              item.categoriaImagemUrl || categoriaFallback?.imagemUrl || "",
          };
          const href = getItemHref(itemResolvido);
          const imagemFallback =
            itemResolvido.imagemDesktop || itemResolvido.categoriaImagemUrl;
          const imagemMobile = item.imagemMobile || imagemFallback;
          const imagemDesktop = imagemFallback || imagemMobile;
          const imagemAtual =
            forceMobile && imagemMobile ? imagemMobile : imagemDesktop;
          const label =
            itemResolvido.label ||
            itemResolvido.categoriaNome ||
            itemResolvido.paginaTitulo ||
            "Vitrine";
          const alt = item.altText || label;
          const imageStyle: CSSProperties = {
            "--vitrine-image-position-desktop": forceMobile
              ? `${item.focoMobileHorizontal}% ${item.focoMobileVertical}%`
              : `${item.focoHorizontal}% ${item.focoVertical}%`,
            "--vitrine-image-position-mobile": `${item.focoMobileHorizontal}% ${item.focoMobileVertical}%`,
            "--vitrine-image-zoom-desktop": (forceMobile ? item.zoomMobile : item.zoom) / 100,
            "--vitrine-image-zoom-mobile": item.zoomMobile / 100,
          } as CSSProperties;
          const cardStyle: CSSProperties =
            animacaoBloco === "SEM_ANIMACAO"
              ? {}
              : { animationDelay: `${index * 90}ms` };

          return (
            <article
              key={item.id || `${label}-${index}`}
              className="stella-vitrine-editorial-card min-w-0"
              data-stella-editorial-gallery-item-id={item.id}
              data-animation={animacaoBloco}
              style={cardStyle}
            >
              <CardWrapper
                href={href}
                abrirNovaAba={item.abrirNovaAba}
                modo={modo}
                onClick={() =>
                  registrarCliqueVitrineEditorial({
                    blocoId: bloco.id,
                    categoriaId: itemResolvido.categoriaId || categoriaFallback?.id,
                    paginaId: itemResolvido.paginaId,
                    metadata: {
                      itemId: itemResolvido.id,
                      label,
                      tipoLink: itemResolvido.tipoLink,
                      href,
                      posicao: index + 1,
                      textoBotao: itemResolvido.textoBotao,
                    },
                  })
                }
              >
                <div
                  className={`w-full overflow-hidden bg-slate-100 ${aspectClass}`}
                >
                  {imagemAtual ? (
                    forceMobile ? (
                      <img
                        src={imagemAtual}
                        alt={alt}
                        className="stella-vitrine-editorial-image h-full w-full object-cover"
                        style={imageStyle}
                      />
                    ) : (
                      <picture className="block h-full w-full">
                        {imagemMobile ? (
                          <source media="(max-width: 767px)" srcSet={imagemMobile} />
                        ) : null}
                        <img
                          src={imagemDesktop}
                          alt={alt}
                          className="stella-vitrine-editorial-image h-full w-full object-cover"
                          style={imageStyle}
                        />
                      </picture>
                    )
                  ) : (
                    <div
                      className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,#f8fafc_34%,var(--brand-blue-soft)_100%)]"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {!item.ocultarNome || !item.ocultarBotao ? (
                  <div className="pt-4 text-left">
                    {!item.ocultarNome ? (
                      <h3
                        data-stella-inline-field="vitrineLabel"
                        className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-950"
                        style={item.labelStyle}
                      >
                        {label}
                      </h3>
                    ) : null}

                    {!item.ocultarBotao && item.textoBotao ? (
                      <span
                        data-stella-inline-field="vitrineTextoBotao"
                        className="mt-2 inline-block border-b border-current pb-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
                        style={item.textoBotaoStyle}
                      >
                        {item.textoBotao}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </CardWrapper>
            </article>
          );
        })}
      </div>
    </section>
  );
}
