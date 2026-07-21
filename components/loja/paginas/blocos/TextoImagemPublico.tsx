import Link from "next/link";
import type { CSSProperties } from "react";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getBackgroundClass,
  getBoolean,
  getButtonRadiusClass,
  getButtonHref,
  getImageDesktop,
  getImageMobile,
  getNumber,
  getResponsiveTextAlignClass,
  getStringWithDefault,
  hasTextContent,
  getMediaPosition,
  getRichText,
  getSpacingClass,
  getString,
  getTextColorForBackground,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

const ALTURA_BLOCO_CLASS: Record<string, string> = {
  AUTO: "",
  COMPACTO: "lg:min-h-[420px]",
  PADRAO: "lg:min-h-[560px]",
  ALTO: "lg:min-h-[680px]",
};

const ALTURA_MIDIA_CLASS: Record<string, string> = {
  AUTO: "min-h-[340px] md:min-h-[460px]",
  COMPACTO: "min-h-[300px] lg:min-h-[420px]",
  PADRAO: "min-h-[340px] lg:min-h-[560px]",
  ALTO: "min-h-[420px] lg:min-h-[680px]",
};

function getDesktopLayoutClass(layout: string) {
  if (layout === "IMAGEM_DIREITA") return "lg:grid-cols-2";
  if (layout === "IMAGEM_ACIMA") return "lg:grid-cols-1";
  if (layout === "TEXTO_SOBRE_IMAGEM") return "lg:grid-cols-1";

  return "lg:grid-cols-2";
}

function getMediaOrderClass(layout: string, tipo: string) {
  if (tipo === "IMAGEM_TEXTO") return "lg:order-first";
  if (layout === "IMAGEM_DIREITA") return "lg:order-last";

  return "lg:order-first";
}

function normalizeMediaWidth(value: string) {
  if (value === "SANGRANDO_ATE_BORDA" || value === "FULL_BLEED") {
    return "SANGRANDO_ATE_BORDA";
  }

  return "CONTIDA";
}

function normalizeBlockHeight(value: string) {
  if (["AUTO", "COMPACTO", "PADRAO", "ALTO"].includes(value)) return value;
  return "AUTO";
}

function getVerticalAlignClass(value: string) {
  if (value === "TOPO") return "items-start";
  if (value === "BASE") return "items-end";
  return "items-center";
}

function getImageRadiusClass(widthMode: string, radius: number) {
  if (widthMode === "SANGRANDO_ATE_BORDA" && radius <= 0) return "";
  if (radius <= 0) return "";
  if (radius <= 4) return "rounded";
  if (radius <= 12) return "rounded-xl";
  if (radius <= 24) return "rounded-3xl";
  return "rounded-[2rem]";
}

type TextoImagemStyleRole = "titulo" | "texto" | "botao";

function getTextoImagemStyle(
  config: Record<string, unknown>,
  key: string,
  role: TextoImagemStyleRole
): CSSProperties {
  const style = asConfig(config[key]);
  const fontSizeMaps: Record<TextoImagemStyleRole, Record<string, string>> = {
    titulo: {
      PEQUENO: "1.5rem",
      MEDIO: "2rem",
      GRANDE: "2.5rem",
      EXTRA_GRANDE: "3rem",
      EDITORIAL: "3.5rem",
    },
    texto: {
      PEQUENO: "0.9375rem",
      MEDIO: "1rem",
      GRANDE: "1.125rem",
      EXTRA_GRANDE: "1.25rem",
      EDITORIAL: "1.375rem",
    },
    botao: {
      PEQUENO: "0.8125rem",
      MEDIO: "0.875rem",
      GRANDE: "1rem",
      EXTRA_GRANDE: "1.125rem",
      EDITORIAL: "1.125rem",
    },
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
  const textAlignMap: Record<string, CSSProperties["textAlign"]> = {
    ESQUERDA: "left",
    CENTRO: "center",
    DIREITA: "right",
  };
  const hasStyleConfig = Object.keys(style).length > 0;

  if (!hasStyleConfig) {
    return {};
  }

  const nextStyle: CSSProperties = {};
  const fontFamily = getStringWithDefault(style, "fontFamily");
  const fontSizePreset = getStringWithDefault(style, "fontSizePreset");
  const fontWeight = getStringWithDefault(style, "fontWeight");
  const colorPreset = getStringWithDefault(style, "colorPreset");
  const colorCustom = getString(style, "colorCustom");
  const letterSpacing = getStringWithDefault(style, "letterSpacing");
  const lineHeight = getStringWithDefault(style, "lineHeight");
  const textTransform = getStringWithDefault(style, "textTransform");
  const textAlign = getStringWithDefault(style, "textAlign");

  if (fontFamily) {
    nextStyle.fontFamily =
      fontFamily === "EDITORIAL"
        ? "Georgia, 'Times New Roman', serif"
        : "var(--font-primary)";
  }

  if (fontSizePreset && fontSizeMaps[role][fontSizePreset]) {
    nextStyle.fontSize = fontSizeMaps[role][fontSizePreset];
  }

  if (fontWeight && fontWeightMap[fontWeight]) {
    nextStyle.fontWeight = fontWeightMap[fontWeight];
  }

  if (colorPreset === "PERSONALIZADO" && colorCustom) {
    nextStyle.color = colorCustom;
  } else if (colorPreset && colorMap[colorPreset]) {
    nextStyle.color = colorMap[colorPreset];
  }

  if (letterSpacing && letterSpacingMap[letterSpacing]) {
    nextStyle.letterSpacing = letterSpacingMap[letterSpacing];
  }

  if (lineHeight && lineHeightMap[lineHeight]) {
    nextStyle.lineHeight = lineHeightMap[lineHeight];
  }

  if (textTransform === "UPPERCASE") {
    nextStyle.textTransform = "uppercase";
  } else if (textTransform === "CAPITALIZE") {
    nextStyle.textTransform = "capitalize";
  }

  if (textAlign && textAlignMap[textAlign]) {
    nextStyle.textAlign = textAlignMap[textAlign];
  }

  if (Object.prototype.hasOwnProperty.call(style, "marginTop")) {
    nextStyle.marginTop = `${Math.max(0, getNumber(style, "marginTop", 0))}px`;
  }

  if (Object.prototype.hasOwnProperty.call(style, "marginBottom")) {
    nextStyle.marginBottom = `${Math.max(0, getNumber(style, "marginBottom", 0))}px`;
  }

  return nextStyle;
}

export default function TextoImagemPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const titulo = getString(config, "titulo");
  const texto = getString(config, ["texto", "descricao", "conteudo"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const textoRichText = getRichText(config, "textoRichText");
  const tipoMidia = getString(config, "tipoMidia", "IMAGEM");
  const layoutDesktop = getString(
    config,
    ["layoutDesktopTextoImagem", "layoutDesktop"],
    bloco.tipo === "IMAGEM_TEXTO" ? "IMAGEM_ESQUERDA" : "IMAGEM_DIREITA"
  );
  const layoutMobile = getString(config, ["layoutMobileTextoImagem", "layoutMobile"], "IMAGEM_ACIMA");
  const textoSobreImagemDesktop = layoutDesktop === "TEXTO_SOBRE_IMAGEM";
  const textoSobreImagemMobile = layoutMobile === "TEXTO_SOBRE_IMAGEM";
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const alinhamentoTextoDesktop = getString(
    config,
    "alinhamentoTextoDesktop",
    "ESQUERDA"
  );
  const alinhamentoTextoMobile = getString(
    config,
    "alinhamentoTextoMobile",
    alinhamentoTextoDesktop
  );
  const textAlignClass = getResponsiveTextAlignClass({
    desktop: alinhamentoTextoDesktop,
    mobile: alinhamentoTextoMobile,
    fallback: "ESQUERDA",
  });
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "PILULA")
  );
  const larguraMidiaDesktop = normalizeMediaWidth(
    getString(config, "larguraMidiaDesktop", getString(config, "larguraMidia", "CONTIDA"))
  );
  const larguraMidiaMobile = normalizeMediaWidth(
    getString(config, "larguraMidiaMobile", larguraMidiaDesktop)
  );
  const alturaBloco = normalizeBlockHeight(getString(config, "alturaBloco", "AUTO"));
  const alinhamentoVertical = getString(config, "alinhamentoVertical", "CENTRO");
  const gapDesktop = Math.max(0, Math.min(96, getNumber(config, "gapTextoImagem", 48)));
  const raioImagem = Math.max(0, Math.min(48, getNumber(config, "raioImagem", 2)));
  const altText = getString(config, "imagemAlt", titulo);
  const zoomDesktop = Math.max(80, Math.min(180, getNumber(config, "mediaZoomDesktop", 100)));
  const zoomMobile = Math.max(80, Math.min(180, getNumber(config, "mediaZoomMobile", 100)));
  const tituloStyle = getTextoImagemStyle(config, "tituloStyle", "titulo");
  const textoStyle = getTextoImagemStyle(config, "textoStyle", "texto");
  const botaoStyle = getTextoImagemStyle(config, "botaoStyle", "botao");
  const textoBotao = getStringWithDefault(config, ["textoBotao", "botaoTexto"]);
  const linkBotao = getButtonHref(config, ["linkBotao", "botaoLink", "linkUrl"]);
  const imageDesktop = getImageDesktop(config);
  const imageMobile = getImageMobile(config);
  const videoDesktop = getString(config, "videoDesktopUrl");
  const videoMobile = getString(config, "videoMobileUrl");
  const exibirMidia = getBoolean(config, "exibirMidia", true);
  const mostrarPlaceholderSemMidia = getBoolean(
    config,
    "mostrarPlaceholderSemMidia",
    false
  );
  const hasTitulo =
    getBoolean(config, "mostrarTitulo", true) &&
    getBoolean(config, "exibirTexto", true) &&
    hasTextContent(tituloRichText, titulo);
  const hasTexto =
    getBoolean(config, "exibirSubtitulo", true) &&
    hasTextContent(textoRichText, texto);
  const hasBotao = getBoolean(config, "exibirBotao", true) && textoBotao && linkBotao;
  const hasMedia =
    exibirMidia &&
    Boolean(
      imageDesktop ||
        imageMobile ||
        videoDesktop ||
        videoMobile ||
        mostrarPlaceholderSemMidia
    );

  if (!hasTitulo && !hasTexto && !hasBotao && !hasMedia) {
    return null;
  }

  function renderTextoSobreImagem(viewportClass = "") {
    return (
      <section
        className={`relative overflow-hidden ${viewportClass} ${getSpacingClass(config)}`}
      >
        <div className="absolute inset-0">
          <PublicMediaRenderer
            tipoMidia={tipoMidia}
            exibirMidia={hasMedia}
            imagemDesktopUrl={imageDesktop}
            imagemMobileUrl={imageMobile}
            videoDesktopUrl={videoDesktop}
            videoMobileUrl={videoMobile}
            objectPositionDesktop={getMediaPosition(config, "Desktop")}
            objectPositionMobile={getMediaPosition(config, "Mobile")}
            alt={altText}
            mediaClassName="scale-[var(--texto-imagem-zoom-mobile)] md:scale-[var(--texto-imagem-zoom-desktop)]"
          />
        </div>
        <div className="absolute inset-0 bg-slate-950/42" />

        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-7xl items-center">
          <div className={`max-w-2xl text-white ${textAlignClass}`}>
            {hasTitulo ? (
              <PublicRichTextRenderer
                value={tituloRichText}
                fallback={titulo}
                data-stella-inline-field="titulo"
                className="text-3xl font-light leading-tight md:text-5xl"
                style={tituloStyle}
              />
            ) : null}
            {hasTexto ? (
              <PublicRichTextRenderer
                value={textoRichText}
                fallback={texto}
                data-stella-inline-field="texto"
                className="mt-5 text-base leading-7 text-white/82"
                style={textoStyle}
              />
            ) : null}
            {hasBotao ? (
              <Link
                href={linkBotao}
                data-stella-inline-field="textoBotao"
                className={`mt-8 inline-flex min-h-11 items-center justify-center bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-white/90 ${buttonRadiusClass}`}
                style={botaoStyle}
              >
                {textoBotao}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  function renderTextoImagem(viewportClass = "") {
    const isDesktopViewport = viewportClass.includes("lg:block");
    const isMobileViewport = viewportClass.includes("lg:hidden");
    const fullBleedDesktop =
      hasMedia &&
      larguraMidiaDesktop === "SANGRANDO_ATE_BORDA" &&
      layoutDesktop !== "IMAGEM_ACIMA";
    const fullBleedMobile =
      hasMedia &&
      larguraMidiaMobile === "SANGRANDO_ATE_BORDA" &&
      layoutMobile !== "TEXTO_SOBRE_IMAGEM";
    const fullBleed =
      (isDesktopViewport && fullBleedDesktop) ||
      (isMobileViewport && fullBleedMobile) ||
      (!isDesktopViewport && !isMobileViewport && (fullBleedDesktop || fullBleedMobile));
    const mediaFirst = layoutDesktop !== "IMAGEM_DIREITA";
    const mediaRadiusClass = getImageRadiusClass(
      fullBleed ? "SANGRANDO_ATE_BORDA" : "CONTIDA",
      raioImagem
    );
    const mediaStyle = {
      "--texto-imagem-zoom-desktop": zoomDesktop / 100,
      "--texto-imagem-zoom-mobile": zoomMobile / 100,
    } as CSSProperties;

    return (
      <section
        className={`${viewportClass} ${getBackgroundClass(corFundo)} ${getSpacingClass(config)} overflow-x-clip`}
        style={mediaStyle}
      >
        <div
          className={`mx-auto grid ${
            hasMedia ? getDesktopLayoutClass(layoutDesktop) : "lg:grid-cols-1"
          } ${getVerticalAlignClass(alinhamentoVertical)} ${ALTURA_BLOCO_CLASS[alturaBloco]} ${
            fullBleed ? "max-w-none px-0" : "max-w-7xl px-4 md:px-6"
          }`}
          style={{ columnGap: `${gapDesktop}px` }}
        >
          {hasMedia ? (
            <div
              data-stella-texto-imagem-media="true"
              className={`relative overflow-hidden bg-slate-100 ${ALTURA_MIDIA_CLASS[alturaBloco]} ${
                mediaRadiusClass
              } ${
                layoutMobile === "TEXTO_ACIMA" ? "order-last" : "order-first"
              } ${getMediaOrderClass(layoutDesktop, bloco.tipo)} ${
                fullBleed && mediaFirst
                  ? "lg:w-[calc(50vw)]"
                  : fullBleed && !mediaFirst
                    ? "lg:w-[calc(50vw)]"
                    : ""
              }`}
            >
              <PublicMediaRenderer
                tipoMidia={tipoMidia}
                imagemDesktopUrl={imageDesktop}
                imagemMobileUrl={imageMobile}
                videoDesktopUrl={videoDesktop}
                videoMobileUrl={videoMobile}
                objectPositionDesktop={getMediaPosition(config, "Desktop")}
                objectPositionMobile={getMediaPosition(config, "Mobile")}
                alt={altText}
                mediaClassName="scale-[var(--texto-imagem-zoom-mobile)] md:scale-[var(--texto-imagem-zoom-desktop)]"
              />
            </div>
          ) : null}

          <div
            className={`flex min-h-full items-center ${
              fullBleed ? "px-4 py-10 md:px-6 lg:px-12" : "py-10"
            } ${hasMedia ? "" : "mx-auto max-w-3xl"} ${textAlignClass}`}
          >
            <div className="w-full">
              {hasTitulo ? (
                <PublicRichTextRenderer
                  value={tituloRichText}
                  fallback={titulo}
                  data-stella-inline-field="titulo"
                  className={`text-3xl font-light leading-tight md:text-5xl ${colors.title}`}
                  style={tituloStyle}
                />
              ) : null}
              {hasTexto ? (
                <PublicRichTextRenderer
                  value={textoRichText}
                  fallback={texto}
                  data-stella-inline-field="texto"
                  className={`mt-5 text-base leading-7 ${colors.body}`}
                  style={textoStyle}
                />
              ) : null}

              {hasBotao ? (
                <Link
                  href={linkBotao}
                  data-stella-inline-field="textoBotao"
                  className={`mt-8 inline-flex min-h-11 items-center justify-center bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 ${buttonRadiusClass}`}
                  style={botaoStyle}
                >
                  {textoBotao}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
    </section>
    );
  }

  if (hasMedia && textoSobreImagemDesktop !== textoSobreImagemMobile) {
    return (
      <>
        {textoSobreImagemMobile
          ? renderTextoSobreImagem("lg:hidden")
          : renderTextoImagem("lg:hidden")}
        {textoSobreImagemDesktop
          ? renderTextoSobreImagem("hidden lg:block")
          : renderTextoImagem("hidden lg:block")}
      </>
    );
  }

  if (hasMedia && textoSobreImagemDesktop && textoSobreImagemMobile) {
    return renderTextoSobreImagem();
  }

  return renderTextoImagem();
}
