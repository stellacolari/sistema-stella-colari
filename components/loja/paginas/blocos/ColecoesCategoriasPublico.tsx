import type { CSSProperties } from "react";
import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getArray,
  getBackgroundClass,
  getBoolean,
  getButtonRadiusClass,
  getGridColumnsClass,
  getImageDesktop,
  getImageMobile,
  getMediaPosition,
  getNumber,
  getResponsiveTextAlignClass,
  getRichText,
  getSpacingClass,
  getString,
  getTextColorForBackground,
  hasTextContent,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

function getContentWidthClass(value: string) {
  if (value === "CONTIDA") return "max-w-6xl";
  if (value === "TOTAL") return "max-w-none";

  return "max-w-7xl";
}

function getHeaderFlexClass(value: string) {
  if (value === "DIREITA") return "justify-end";
  if (value === "CENTRO") return "justify-center";

  return "justify-start";
}

function getResponsiveHeaderFlexClass(desktop: string, mobile: string) {
  const desktopClass =
    desktop === "DIREITA"
      ? "lg:justify-end"
      : desktop === "CENTRO"
        ? "lg:justify-center"
        : "lg:justify-start";

  return `${getHeaderFlexClass(mobile)} ${desktopClass}`;
}

function getHeaderBlockAlignClass(desktop: string, mobile: string) {
  const mobileClass =
    mobile === "DIREITA" ? "ml-auto" : mobile === "CENTRO" ? "mx-auto" : "";
  const desktopClass =
    desktop === "DIREITA"
      ? "lg:ml-auto lg:mr-0"
      : desktop === "CENTRO"
        ? "lg:mx-auto"
        : "lg:mx-0";

  return `${mobileClass} ${desktopClass}`;
}

function normalizarPresetMosaico(value: string) {
  if (
    [
      "MOSAICO_5_EDITORIAL",
      "MOSAICO_4_EDITORIAL",
      "MOSAICO_3_DESTAQUE",
      "GRID_4_EDITORIAL",
      "GRID_3_EDITORIAL",
    ].includes(value)
  ) {
    return value;
  }

  return "MOSAICO_4_EDITORIAL";
}

function normalizarTamanhoCabecalho(value: string) {
  if (["MEDIO", "GRANDE", "GIGANTE"].includes(value)) return value;
  return "GRANDE";
}

function getCabecalhoTitleClass(tamanho: string) {
  const normalized = normalizarTamanhoCabecalho(tamanho);

  if (normalized === "GIGANTE") {
    return "text-[clamp(3.5rem,6.5vw,7.5rem)] leading-[0.92] tracking-[-0.06em]";
  }

  if (normalized === "MEDIO") {
    return "text-[clamp(2.25rem,4vw,4rem)] leading-[0.96] tracking-[-0.04em]";
  }

  return "text-[clamp(3rem,5.4vw,5.75rem)] leading-[0.94] tracking-[-0.05em]";
}

function getMosaicGridStyle(preset: string, itemCount = 4): CSSProperties {
  const normalized = normalizarPresetMosaico(preset);

  if (normalized === "MOSAICO_3_DESTAQUE" || (normalized === "MOSAICO_4_EDITORIAL" && itemCount <= 3)) {
    return {
      display: "grid",
      gridTemplateColumns: "1.12fr 0.92fr",
      gridTemplateRows: "repeat(2, minmax(235px, 1fr))",
      gap: "22px",
      alignItems: "stretch",
    };
  }

  if (normalized === "MOSAICO_4_EDITORIAL") {
    return {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "repeat(2, minmax(285px, 1fr))",
      gap: "22px",
      alignItems: "stretch",
    };
  }

  return {
    display: "grid",
    gridTemplateColumns: "1.05fr 0.9fr 0.9fr 1.05fr",
    gridTemplateRows: "repeat(2, minmax(285px, 1fr))",
    gap: "22px",
    alignItems: "stretch",
  };
}

function getMosaicItemStyle(index: number, preset: string, itemCount = 4): CSSProperties {
  const normalized = normalizarPresetMosaico(preset);

  if (normalized === "MOSAICO_3_DESTAQUE" || (normalized === "MOSAICO_4_EDITORIAL" && itemCount <= 3)) {
    if (index === 0) {
      return {
        gridColumn: "1 / 2",
        gridRow: "1 / 3",
      };
    }

    return {
      gridColumn: "2 / 3",
      gridRow: `${index} / ${index + 1}`,
    };
  }

  if (normalized === "MOSAICO_4_EDITORIAL") {
    const map: CSSProperties[] = [
      {
        gridColumn: "1 / 2",
        gridRow: "1 / 3",
      },
      {
        gridColumn: "2 / 3",
        gridRow: "1 / 2",
      },
      {
        gridColumn: "2 / 3",
        gridRow: "2 / 3",
      },
      {
        gridColumn: "3 / 4",
        gridRow: "1 / 3",
      },
      {
        gridColumn: "1 / 4",
        gridRow: "3 / 4",
      },
    ];

    return map[index] || {};
  }

  const map: CSSProperties[] = [
    {
      gridColumn: "1 / 2",
      gridRow: "1 / 3",
    },
    {
      gridColumn: "2 / 4",
      gridRow: "1 / 2",
    },
    {
      gridColumn: "4 / 5",
      gridRow: "1 / 3",
    },
    {
      gridColumn: "2 / 3",
      gridRow: "2 / 3",
    },
    {
      gridColumn: "3 / 4",
      gridRow: "2 / 3",
    },
  ];

  return map[index] || {};
}

function getMosaicItemClass(index: number, preset: string, itemCount = 4) {
  const normalized = normalizarPresetMosaico(preset);

  if (normalized === "MOSAICO_3_DESTAQUE" || (normalized === "MOSAICO_4_EDITORIAL" && itemCount <= 3)) {
    return index === 0
      ? "min-h-[560px] aspect-[4/5] lg:aspect-auto"
      : "min-h-[265px] aspect-[4/3] lg:aspect-auto";
  }

  if (normalized === "MOSAICO_4_EDITORIAL") {
    if (index === 0 || index === 3) {
      return "min-h-[600px] aspect-[4/5] lg:aspect-auto";
    }

    if (index === 4) {
      return "min-h-[285px] aspect-[16/7] lg:aspect-auto";
    }

    return "min-h-[285px] aspect-[4/3] lg:aspect-auto";
  }

  if (index === 0 || index === 2) {
    return "min-h-[600px] aspect-[4/5] lg:aspect-auto";
  }

  if (index === 4) {
    return "min-h-[285px] aspect-[4/3] lg:aspect-auto";
  }

  return "min-h-[285px] aspect-[4/3] lg:aspect-auto";
}

function getGridColumnsByPreset(preset: string, fallback: number) {
  const normalized = normalizarPresetMosaico(preset);
  if (normalized === "GRID_3_EDITORIAL") return 3;
  if (normalized === "GRID_4_EDITORIAL") return 4;
  return fallback;
}

function getHeaderWidthClass(width: number) {
  if (width <= 25) return "lg:grid-cols-[minmax(260px,0.3fr)_minmax(0,1fr)]";
  if (width <= 30) return "lg:grid-cols-[minmax(280px,0.34fr)_minmax(0,1fr)]";
  if (width >= 40) return "lg:grid-cols-[minmax(340px,0.44fr)_minmax(0,1fr)]";
  return "lg:grid-cols-[minmax(300px,0.38fr)_minmax(0,1fr)]";
}

function getLabelPositionClass(posicao: string) {
  if (posicao === "INFERIOR_CENTRO") return "bottom-5 left-1/2 -translate-x-1/2 text-center";
  if (posicao === "INFERIOR_DIREITA") return "bottom-5 right-5 text-right";
  if (posicao === "SUPERIOR_ESQUERDA") return "left-5 top-5";
  if (posicao === "CENTRO") return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center";
  return "bottom-5 left-5";
}

function getLabelWidthClass(largura: string) {
  if (largura === "LARGA") return "w-[min(82%,420px)]";
  if (largura === "MEDIA") return "w-[min(68%,320px)]";
  return "w-fit max-w-[78%]";
}

function HeaderImage({
  desktopUrl,
  mobileUrl,
  alt,
  desktopWidth,
  mobileWidth,
  alignDesktop,
  alignMobile,
}: {
  desktopUrl: string;
  mobileUrl: string;
  alt: string;
  desktopWidth: number;
  mobileWidth: number;
  alignDesktop: string;
  alignMobile: string;
}) {
  const imageDesktop = desktopUrl || mobileUrl;
  const imageMobile = mobileUrl || desktopUrl;

  if (!imageDesktop && !imageMobile) return null;

  return (
    <div className={`flex ${getResponsiveHeaderFlexClass(alignDesktop, alignMobile)}`}>
      {imageMobile ? (
        <img
          src={imageMobile}
          alt={alt}
          className="block h-auto max-w-full object-contain md:hidden"
          style={{ width: `${mobileWidth}px` }}
        />
      ) : null}
      {imageDesktop ? (
        <img
          src={imageDesktop}
          alt={alt}
          className={`h-auto max-w-full object-contain ${
            imageMobile ? "hidden md:block" : "block"
          }`}
          style={{ width: `${desktopWidth}px` }}
        />
      ) : null}
    </div>
  );
}

function getItemHref(item: Record<string, unknown>) {
  const tipoLink = getString(item, "tipoLink", "PERSONALIZADO");

  if (tipoLink === "CATEGORIA") {
    const slug = getString(item, "categoriaSlug");
    return slug ? `/loja/categoria/${slug}` : "";
  }

  return getString(item, "linkUrl");
}

function itemHasMedia(item: Record<string, unknown>) {
  return Boolean(
    getImageDesktop(item) ||
      getImageMobile(item) ||
      getString(item, "videoDesktopUrl") ||
      getString(item, "videoMobileUrl")
  );
}

function itemHasPublicContent(item: Record<string, unknown>) {
  const titulo =
    getString(item, "titulo") || getString(item, "categoriaNome");
  const subtitulo = getString(item, "subtitulo");
  const textoLink = getString(item, "textoLink");
  const href = getItemHref(item);

  return Boolean(
    hasTextContent(getRichText(item, "tituloRichText"), titulo) ||
      hasTextContent(getRichText(item, "subtituloRichText"), subtitulo) ||
      itemHasMedia(item) ||
      (textoLink && href)
  );
}

function ItemMedia({
  item,
  alt,
  className,
}: {
  item: Record<string, unknown>;
  alt: string;
  className: string;
}) {
  if (!itemHasMedia(item)) return null;

  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      <PublicMediaRenderer
        tipoMidia={getString(item, "tipoMidia", "IMAGEM")}
        imagemDesktopUrl={getImageDesktop(item)}
        imagemMobileUrl={getImageMobile(item)}
        videoDesktopUrl={getString(item, "videoDesktopUrl")}
        videoMobileUrl={getString(item, "videoMobileUrl")}
        objectPositionDesktop={getMediaPosition(item, "Desktop")}
        objectPositionMobile={getMediaPosition(item, "Mobile")}
        alt={alt}
      />
    </div>
  );
}

export default function ColecoesCategoriasPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const layoutVisual = getString(config, "layoutVisual", "MOSAICO_EDITORIAL");
  const estiloEtiqueta = getString(config, "estiloEtiqueta", "SOBREPOSTA");
  const presetMosaico = normalizarPresetMosaico(
    getString(config, "presetMosaico", "MOSAICO_4_EDITORIAL")
  );
  const layoutVisualEfetivo = presetMosaico.startsWith("GRID_")
    ? "GRID_EDITORIAL"
    : layoutVisual;
  const posicaoEtiqueta = getString(
    config,
    "posicaoEtiqueta",
    "INFERIOR_ESQUERDA"
  );
  const larguraEtiqueta = getString(config, "larguraEtiqueta", "AUTO");
  const exibirLinhaEtiqueta = getBoolean(config, "exibirLinhaEtiqueta", true);
  const tamanhoCabecalho = normalizarTamanhoCabecalho(
    getString(config, "tamanhoCabecalho", "GRANDE")
  );
  const exibirEtiqueta =
    getBoolean(config, "exibirEtiqueta", estiloEtiqueta !== "OCULTA") &&
    estiloEtiqueta !== "OCULTA";
  const exibirBotaoEtiqueta = getBoolean(config, "exibirBotaoEtiqueta", false);
  const cardInteiroClicavel = getBoolean(config, "cardInteiroClicavel", true);
  const larguraCabecalhoDesktop = getNumber(
    config,
    "larguraCabecalhoDesktop",
    32
  );
  const posicaoCabecalhoMosaico = getString(
    config,
    "posicaoCabecalhoMosaico",
    "LATERAL"
  );
  const larguraConteudo = getString(config, "larguraConteudo", "LARGA");
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "RETO")
  );
  const tipoCabecalho = getString(config, "tipoCabecalho", "TEXTO");
  const alinhamentoCabecalhoDesktop = getString(
    config,
    "alinhamentoCabecalhoDesktop",
    getString(config, "alinhamentoTextoDesktop", "ESQUERDA")
  );
  const alinhamentoCabecalhoMobile = getString(
    config,
    "alinhamentoCabecalhoMobile",
    getString(config, "alinhamentoTextoMobile", alinhamentoCabecalhoDesktop)
  );
  const headerAlign = getResponsiveTextAlignClass({
    desktop: alinhamentoCabecalhoDesktop,
    mobile: alinhamentoCabecalhoMobile,
    fallback: "ESQUERDA",
  });
  const titulo = getString(config, "titulo");
  const subtitulo = getString(config, ["subtitulo", "descricao", "texto"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, [
    "subtituloRichText",
    "textoRichText",
  ]);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasSubtitulo = hasTextContent(subtituloRichText, subtitulo);
  const hasLogoTitulo = Boolean(
    getString(config, "logoTituloUrl") ||
      getString(config, "logoTituloMobileUrl")
  );
  const hasImagemTitulo = Boolean(
    getString(config, "imagemTituloUrl") ||
      getString(config, "imagemTituloMobileUrl")
  );
  const hasCabecalho =
    (tipoCabecalho === "LOGO" && (hasLogoTitulo || hasSubtitulo)) ||
    (tipoCabecalho === "TEXTO_LOGO" &&
      (hasTitulo || hasLogoTitulo || hasSubtitulo)) ||
    (tipoCabecalho === "IMAGEM_TITULO" && (hasImagemTitulo || hasSubtitulo)) ||
    (tipoCabecalho !== "LOGO" &&
      tipoCabecalho !== "TEXTO_LOGO" &&
      tipoCabecalho !== "IMAGEM_TITULO" &&
      (hasTitulo || hasSubtitulo));
  const itens = getArray(config, "itens")
    .map(asConfig)
    .filter(itemHasPublicContent)
    .filter((item) => exibirEtiqueta || itemHasMedia(item))
    .sort(
      (a, b) =>
        getNumber(a, "ordem", 0) - getNumber(b, "ordem", 0)
    );

  if (!hasCabecalho && itens.length === 0) {
    return null;
  }

  const widthClass = getContentWidthClass(larguraConteudo);
  const tituloTextual = (
    <>
      {hasTitulo ? (
        <PublicRichTextRenderer
          value={tituloRichText}
          fallback={titulo}
          className={`max-w-full break-words whitespace-pre-line font-light ${getCabecalhoTitleClass(
            tamanhoCabecalho
          )} ${colors.title}`}
        />
      ) : null}
      {hasSubtitulo ? (
        <PublicRichTextRenderer
          value={subtituloRichText}
          fallback={subtitulo}
          className={`mt-4 max-w-2xl text-base leading-7 ${colors.body}`}
        />
      ) : null}
    </>
  );
  const logoTitulo = (
    <HeaderImage
      desktopUrl={getString(config, "logoTituloUrl")}
      mobileUrl={getString(config, "logoTituloMobileUrl")}
      alt={getString(config, "logoTituloAlt", titulo)}
      desktopWidth={getNumber(config, "logoTituloLarguraDesktop", 420)}
      mobileWidth={getNumber(config, "logoTituloLarguraMobile", 260)}
      alignDesktop={alinhamentoCabecalhoDesktop}
      alignMobile={alinhamentoCabecalhoMobile}
    />
  );
  const imagemTitulo = (
    <HeaderImage
      desktopUrl={getString(config, "imagemTituloUrl")}
      mobileUrl={getString(config, "imagemTituloMobileUrl")}
      alt={getString(config, "imagemTituloAlt", titulo)}
      desktopWidth={getNumber(config, "imagemTituloLarguraDesktop", 520)}
      mobileWidth={getNumber(config, "imagemTituloLarguraMobile", 300)}
      alignDesktop={alinhamentoCabecalhoDesktop}
      alignMobile={alinhamentoCabecalhoMobile}
    />
  );
  const logoPosition = getString(config, "logoTituloPosicao", "ABAIXO");
  const headerContent = hasCabecalho ? (
    <div
      className={`w-full max-w-4xl ${getHeaderBlockAlignClass(
        alinhamentoCabecalhoDesktop,
        alinhamentoCabecalhoMobile
      )} ${headerAlign}`}
    >
      {tipoCabecalho === "LOGO" ? (
        <>
          {logoTitulo}
          {hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-4 max-w-2xl text-base leading-7 ${colors.body}`}
            />
          ) : null}
        </>
      ) : tipoCabecalho === "IMAGEM_TITULO" ? (
        <>
          {imagemTitulo}
          {hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-4 max-w-2xl text-base leading-7 ${colors.body}`}
            />
          ) : null}
        </>
      ) : tipoCabecalho === "TEXTO_LOGO" ? (
        <div
          className={
            logoPosition === "AO_LADO"
              ? `flex flex-col gap-5 lg:flex-row lg:items-center ${getResponsiveHeaderFlexClass(
                  alinhamentoCabecalhoDesktop,
                  alinhamentoCabecalhoMobile
                )}`
              : "space-y-5"
          }
        >
          {logoPosition === "ACIMA" ? logoTitulo : null}
          <div>{tituloTextual}</div>
          {logoPosition !== "ACIMA" ? logoTitulo : null}
        </div>
      ) : (
        tituloTextual
      )}
    </div>
  ) : null;

  const renderItemLabel = (item: Record<string, unknown>, overlay: boolean) => {
    if (!exibirEtiqueta) return null;

    const tituloItem = getString(item, "titulo") || getString(item, "categoriaNome");
    const subtituloItem = getString(item, "subtitulo");
    const textoLink = getString(item, "textoLink", "Explorar");
    const href = getItemHref(item);
    const hasTituloItem = hasTextContent(
      getRichText(item, "tituloRichText"),
      tituloItem
    );
    const hasSubtituloItem = hasTextContent(
      getRichText(item, "subtituloRichText"),
      subtituloItem
    );

    if (!hasTituloItem && !hasSubtituloItem && !(textoLink && href)) {
      return null;
    }

    const wrapperClass = overlay
      ? `absolute z-10 bg-white/92 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm ${getLabelPositionClass(
          posicaoEtiqueta
        )} px-4 py-3 ${getLabelWidthClass(larguraEtiqueta)} break-words`
      : "pt-4";

    const buttonContent =
      exibirBotaoEtiqueta && textoLink && href ? (
        cardInteiroClicavel ? (
          <span
            className={`mt-4 inline-flex min-h-8 items-center border border-current px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${buttonRadiusClass}`}
          >
            {textoLink}
          </span>
        ) : (
          <Link
            href={href}
            className={`mt-4 inline-flex min-h-8 items-center border border-current px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${buttonRadiusClass}`}
          >
            {textoLink}
          </Link>
        )
      ) : null;

    return (
      <div className={wrapperClass}>
        {hasTituloItem ? (
          <PublicRichTextRenderer
            value={getRichText(item, "tituloRichText")}
            fallback={tituloItem}
            className={
              overlay
                ? "text-sm font-medium leading-tight text-slate-950"
                : `text-xl font-semibold leading-tight ${colors.title}`
            }
          />
        ) : null}

        {exibirLinhaEtiqueta && overlay ? (
          <span className="mt-3 block h-px w-12 bg-slate-950/35" />
        ) : null}

        {hasSubtituloItem ? (
          <PublicRichTextRenderer
            value={getRichText(item, "subtituloRichText")}
            fallback={subtituloItem}
            className={
              overlay
                ? "mt-2 text-xs leading-5 text-slate-600"
                : `mt-2 text-sm leading-6 ${colors.body}`
            }
          />
        ) : null}

        {buttonContent}
      </div>
    );
  };

  const renderGridItem = (item: Record<string, unknown>, index: number) => {
    const tituloItem =
      getString(item, "titulo") || getString(item, "categoriaNome");
    const href = getItemHref(item);
    const content = (
      <article className="stella-reveal-card" style={{ animationDelay: `${index * 90}ms` }}>
        <ItemMedia item={item} alt={tituloItem} className="aspect-[4/5]" />
        {exibirEtiqueta ? renderItemLabel(item, false) : null}
      </article>
    );
    const key = getString(item, "id", `colecao-${index}`);

    if (href && cardInteiroClicavel) {
      return (
        <Link key={key} href={href} className="group block">
          {content}
        </Link>
      );
    }

    return <div key={key}>{content}</div>;
  };

  const renderMosaicItems = () => (
    <div className="mt-10 lg:mt-0">
      <div className="hidden lg:grid" style={getMosaicGridStyle(presetMosaico, itens.length)}>
        {itens.map((item, index) => {
          const tituloItem =
            getString(item, "titulo") || getString(item, "categoriaNome");
          const href = getItemHref(item);
          const hasMedia = itemHasMedia(item);
          const labelSobreposta = exibirEtiqueta && estiloEtiqueta === "SOBREPOSTA" && hasMedia;

          const content = (
            <article
              className="stella-reveal-card relative min-w-0"
              style={{
                ...getMosaicItemStyle(index, presetMosaico, itens.length),
                animationDelay: `${index * 90}ms`,
              }}
            >
              {hasMedia ? (
                <div
                  className={`relative h-full overflow-hidden ${getMosaicItemClass(
                    index,
                    presetMosaico,
                    itens.length
                  )}`}
                >
                  <ItemMedia
                    item={item}
                    alt={tituloItem}
                    className="h-full min-h-full transition duration-700 group-hover:scale-[1.035]"
                  />
                  {labelSobreposta ? renderItemLabel(item, true) : null}
                </div>
              ) : null}

              {exibirEtiqueta && !labelSobreposta
                ? renderItemLabel(item, false)
                : null}
            </article>
          );

          const key = getString(item, "id", `colecao-${index}`);

          if (href && cardInteiroClicavel) {
            return (
              <Link key={key} href={href} className="group block">
                {content}
              </Link>
            );
          }

          return <div key={key}>{content}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:hidden">
        {itens.map((item, index) => {
          const tituloItem =
            getString(item, "titulo") || getString(item, "categoriaNome");
          const href = getItemHref(item);
          const hasMedia = itemHasMedia(item);
          const labelSobreposta = exibirEtiqueta && estiloEtiqueta === "SOBREPOSTA" && hasMedia;

          const content = (
            <article
              className="stella-reveal-card relative min-w-0"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {hasMedia ? (
                <div className="relative aspect-[4/5] overflow-hidden">
                  <ItemMedia
                    item={item}
                    alt={tituloItem}
                    className="h-full min-h-full"
                  />
                  {labelSobreposta ? renderItemLabel(item, true) : null}
                </div>
              ) : null}

              {exibirEtiqueta && !labelSobreposta
                ? renderItemLabel(item, false)
                : null}
            </article>
          );

          const key = getString(item, "id", `colecao-${index}`);

          if (href && cardInteiroClicavel) {
            return (
              <Link key={key} href={href} className="group block">
                {content}
              </Link>
            );
          }

          return <div key={key}>{content}</div>;
        })}
      </div>
    </div>
  );

  return (
    <section
      className={`${getBackgroundClass(corFundo)} ${getSpacingClass(config)}`}
    >
      <div className={`mx-auto ${widthClass}`}>
        {layoutVisualEfetivo === "GRID_EDITORIAL" ? (
          <>
            {headerContent}

            {itens.length > 0 ? (
              <div
                className={`mt-10 grid gap-6 ${getGridColumnsClass(
                  getNumber(config, "colunasMobile", 1),
                  getNumber(config, "colunasTablet", 2),
                  getGridColumnsByPreset(
                    presetMosaico,
                    getNumber(config, "colunasDesktop", 4)
                  )
                )}`}
              >
                {itens.map(renderGridItem)}
              </div>
            ) : null}
          </>
        ) : posicaoCabecalhoMosaico === "TOPO" ? (
          <>
            {headerContent}
            {itens.length > 0 ? renderMosaicItems() : null}
          </>
        ) : (
          <div
            className={`grid gap-10 lg:gap-16 lg:items-start ${getHeaderWidthClass(
              larguraCabecalhoDesktop
            )}`}
          >
            {headerContent ? (
              <div className="min-w-0 max-w-full lg:sticky lg:top-24">
                {headerContent}
              </div>
            ) : null}

            <div className="min-w-0 max-w-full">
              {itens.length > 0 ? renderMosaicItems() : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
