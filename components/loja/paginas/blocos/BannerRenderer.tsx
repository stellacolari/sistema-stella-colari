import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getArray,
  getBoolean,
  getButtonHref,
  getButtonRadiusClass,
  getImageDesktop,
  getImageMobile,
  getNumber,
  getRichText,
  getString,
  getStringWithDefault,
  hasTextContent,
  moeda,
  produtoTemDesconto,
  type BlocoPublico,
  type ProdutoPublico,
} from "@/components/loja/paginas/blocos/utils";

export type BannerDevicePreview = "DESKTOP" | "TABLET" | "MOBILE";

export type BannerModeloFinal =
  | "HERO_PRINCIPAL"
  | "BANNER_CLASSICO"
  | "EDITORIAL_IMAGEM"
  | "CAMADAS_PARALLAX"
  | "CATEGORIA"
  | "FAIXA_PROMOCIONAL";

type BannerElement =
  | "MODELO"
  | "TITULO"
  | "SUBTITULO"
  | "CTA"
  | "MIDIA"
  | "IMAGEM_FRENTE"
  | "DESIGN"
  | "PRODUTOS"
  | "AVANCADO";

type BannerSlotContext = {
  className: string;
  style: CSSProperties;
};

type BannerRendererProps = {
  bloco: BlocoPublico;
  produtos?: ProdutoPublico[];
  device?: BannerDevicePreview;
  modo?: "publico" | "editor";
  selectedElement?: BannerElement;
  onElementSelect?: (element: BannerElement) => void;
  titleSlot?: (context: BannerSlotContext) => ReactNode;
  subtitleSlot?: (context: BannerSlotContext) => ReactNode;
  primaryCtaSlot?: (context: BannerSlotContext) => ReactNode;
  secondaryCtaSlot?: (context: BannerSlotContext) => ReactNode;
};

export const BANNER_MODELO_LABELS: Record<BannerModeloFinal, string> = {
  HERO_PRINCIPAL: "Hero principal",
  BANNER_CLASSICO: "Banner clássico",
  EDITORIAL_IMAGEM: "Editorial com imagem",
  CAMADAS_PARALLAX: "Camadas visuais",
  CATEGORIA: "Banner de categoria",
  FAIXA_PROMOCIONAL: "Faixa promocional",
};

export function normalizeBannerModelo(value: string): BannerModeloFinal {
  if (value === "HERO_PRINCIPAL" || value === "HERO_TELA_CHEIA") {
    return "HERO_PRINCIPAL";
  }

  if (value === "BANNER_CLASSICO" || value === "BANNER_EDITORIAL") {
    return "BANNER_CLASSICO";
  }

  if (
    value === "EDITORIAL_IMAGEM" ||
    value === "IMAGEM_LATERAL" ||
    value === "SANGRANDO"
  ) {
    return "EDITORIAL_IMAGEM";
  }

  if (value === "CAMADAS_PARALLAX" || value === "PRODUTOS_FLUTUANTES") {
    return "CAMADAS_PARALLAX";
  }

  if (value === "CATEGORIA") return "CATEGORIA";
  if (value === "FAIXA_PROMOCIONAL") return "FAIXA_PROMOCIONAL";

  return "BANNER_CLASSICO";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getNumberClamped(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number
) {
  return clamp(getNumber(config, key, fallback), min, max);
}

function getConfigStyle(config: Record<string, unknown>, key: string) {
  const value = config[key];

  return isRecord(value) ? value : {};
}

function getTextStyle(
  config: Record<string, unknown>,
  key: string,
  fallback: CSSProperties = {},
  options: { ignoreFontSizePreset?: boolean } = {}
): CSSProperties {
  const style = getConfigStyle(config, key);
  const fontSizePreset = getString(style, "fontSizePreset");
  const fontWeight = getString(style, "fontWeight");
  const colorPreset = getString(style, "colorPreset");
  const colorCustom = getString(style, "colorCustom");
  const letterSpacing = getString(style, "letterSpacing");
  const textTransform = getString(style, "textTransform");

  const fontSizeMap: Record<string, string> = {
    PEQUENO: "0.875rem",
    MEDIO: "1rem",
    GRANDE: "1.5rem",
    EXTRA_GRANDE: "2.75rem",
  };
  const fontWeightMap: Record<string, number> = {
    LIGHT: 300,
    REGULAR: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
  };
  const letterSpacingMap: Record<string, string> = {
    NORMAL: "0",
    LEVE: "0.02em",
    MEDIO: "0.08em",
    ALTO: "0.14em",
  };
  const colorMap: Record<string, string> = {
    CLARO: "#ffffff",
    ESCURO: "#0f172a",
    DOURADO: "#b8892e",
  };

  return {
    ...fallback,
    ...(!options.ignoreFontSizePreset && fontSizeMap[fontSizePreset]
      ? { fontSize: fontSizeMap[fontSizePreset] }
      : {}),
    ...(fontWeightMap[fontWeight]
      ? { fontWeight: fontWeightMap[fontWeight] }
      : {}),
    ...(letterSpacingMap[letterSpacing]
      ? { letterSpacing: letterSpacingMap[letterSpacing] }
      : {}),
    ...(textTransform && textTransform !== "NORMAL"
      ? {
          textTransform:
            textTransform === "UPPERCASE" ? "uppercase" : "capitalize",
        }
      : {}),
    ...(colorPreset === "PERSONALIZADO" && colorCustom
      ? { color: colorCustom }
      : colorMap[colorPreset]
        ? { color: colorMap[colorPreset] }
        : {}),
  };
}

function getDefaultTitleSize(modelo: BannerModeloFinal, isMobile: boolean) {
  if (modelo === "FAIXA_PROMOCIONAL") return isMobile ? 34 : 52;
  if (modelo === "HERO_PRINCIPAL") return isMobile ? 54 : 92;
  if (modelo === "CAMADAS_PARALLAX") return isMobile ? 58 : 104;
  if (modelo === "EDITORIAL_IMAGEM") return isMobile ? 48 : 86;
  if (modelo === "CATEGORIA") return isMobile ? 46 : 72;

  return isMobile ? 42 : 68;
}

function getHeightClass(
  altura: string,
  modelo: BannerModeloFinal,
  forcedDevice?: BannerDevicePreview
) {
  const isMobile = forcedDevice === "MOBILE";

  if (altura === "AUTO_CONTEUDO") return "min-h-0";
  if (altura === "TELA_CHEIA") {
    return isMobile ? "min-h-[720px]" : "min-h-[calc(100vh-80px)]";
  }

  if (altura === "COMPACTA" || modelo === "FAIXA_PROMOCIONAL") {
    return isMobile ? "min-h-[340px]" : "min-h-[280px] md:min-h-[320px]";
  }

  if (modelo === "HERO_PRINCIPAL") {
    return isMobile ? "min-h-[700px]" : "min-h-[720px]";
  }

  if (modelo === "CAMADAS_PARALLAX") {
    return isMobile ? "min-h-[720px]" : "min-h-[680px] lg:min-h-[760px]";
  }

  if (modelo === "EDITORIAL_IMAGEM") {
    return isMobile ? "min-h-[660px]" : "min-h-[620px]";
  }

  if (modelo === "CATEGORIA") {
    return isMobile ? "min-h-[560px]" : "min-h-[500px]";
  }

  return isMobile ? "min-h-[560px]" : "min-h-[540px]";
}

function getOverlayClass(overlay: string, modelo: BannerModeloFinal) {
  if (overlay === "NENHUM") return "bg-transparent";
  if (overlay === "MEDIO") return "bg-slate-950/50";
  if (overlay === "GRADIENTE") {
    if (modelo === "EDITORIAL_IMAGEM") {
      return "bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/10";
    }

    return "bg-gradient-to-r from-slate-950/72 via-slate-950/35 to-transparent";
  }

  if (modelo === "FAIXA_PROMOCIONAL") return "bg-slate-950/34";

  return "bg-slate-950/28";
}

function getContentTextClass(corTexto: string) {
  if (corTexto === "ESCURO") {
    return {
      title: "text-slate-950",
      body: "text-slate-700",
      eyebrow: "text-slate-600",
      buttonPrimary: "bg-slate-950 text-white hover:bg-slate-800",
      buttonSecondary:
        "border-slate-950/35 text-slate-950 hover:border-slate-950 hover:bg-white/50",
      buttonLink: "text-slate-950 underline-offset-4 hover:underline",
    };
  }

  return {
    title: "text-white",
    body: "text-white/86",
    eyebrow: "text-white/72",
    buttonPrimary: "bg-white text-slate-950 hover:bg-white/90",
    buttonSecondary:
      "border-white/55 text-white hover:border-white hover:bg-white/10",
    buttonLink: "text-white underline-offset-4 hover:underline",
  };
}

function getJustifyClass(alinhamento: string) {
  if (alinhamento === "CENTRO") return "justify-center";
  if (alinhamento === "DIREITA") return "justify-end";

  return "justify-start";
}

function getItemsClass(alinhamento: string) {
  if (alinhamento === "TOPO") return "items-start";
  if (alinhamento === "BASE") return "items-end";

  return "items-center";
}

function getTextAlignClass(alinhamento: string, prefix = "") {
  if (alinhamento === "ESQUERDA") return `${prefix}text-left`;
  if (alinhamento === "DIREITA") return `${prefix}text-right`;

  return `${prefix}text-center`;
}

function getObjectPosition(config: Record<string, unknown>, device: "Desktop" | "Mobile") {
  const x = getNumberClamped(config, `mediaCrop${device}X`, 50, 0, 100);
  const y = getNumberClamped(config, `mediaCrop${device}Y`, 50, 0, 100);
  const stored = getString(config, `mediaPosition${device}`);

  if (stored) return stored;

  return `${x}% ${y}%`;
}

function getMediaScale(config: Record<string, unknown>, device: "Desktop" | "Mobile") {
  return getNumberClamped(config, `mediaZoom${device}`, 100, 80, 180) / 100;
}

function getFrontImage(config: Record<string, unknown>, isMobile: boolean) {
  const desktop =
    getString(config, [
      "imagemFrenteDesktopUrl",
      "imagemFrontalDesktopUrl",
      "imagemCamadaFrenteDesktopUrl",
    ]) ||
    getString(config, [
      "imagemFrenteUrl",
      "imagemFrontalUrl",
      "imagemCamadaFrenteUrl",
    ]);
  const mobile = getString(config, [
    "imagemFrenteMobileUrl",
    "imagemFrontalMobileUrl",
    "imagemCamadaFrenteMobileUrl",
  ]);

  return isMobile && mobile ? mobile : desktop;
}

function getSelectedProducts(produtos: ProdutoPublico[], config: Record<string, unknown>) {
  const ids = getArray(config, "produtosIds").map(String);

  if (ids.length === 0) return [];

  return produtos
    .filter((produto) => ids.includes(produto.id))
    .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

function MediaLayer({
  tipoMidia,
  imageDesktop,
  imageMobile,
  videoDesktop,
  videoMobile,
  poster,
  alt,
  exibirMidia,
  objectPositionDesktop,
  objectPositionMobile,
  scaleDesktop,
  scaleMobile,
  videoLoop,
  videoMuted,
  device,
}: {
  tipoMidia: string;
  imageDesktop: string;
  imageMobile: string;
  videoDesktop: string;
  videoMobile: string;
  poster: string;
  alt: string;
  exibirMidia: boolean;
  objectPositionDesktop: string;
  objectPositionMobile: string;
  scaleDesktop: number;
  scaleMobile: number;
  videoLoop: boolean;
  videoMuted: boolean;
  device?: BannerDevicePreview;
}) {
  const showMobile = device === "MOBILE";
  const mobileImage = imageMobile || imageDesktop;
  const mobileVideo = videoMobile || videoDesktop;

  if (!exibirMidia) {
    return <div className="h-full w-full bg-slate-200" />;
  }

  if (tipoMidia === "VIDEO" && (videoDesktop || mobileVideo)) {
    return (
      <>
        {mobileVideo ? (
          <video
            src={mobileVideo}
            poster={poster || undefined}
            autoPlay
            loop={videoLoop}
            muted={videoMuted}
            playsInline
            className={`h-full w-full object-cover ${
              device ? (showMobile ? "block" : "hidden") : "block md:hidden"
            }`}
            style={{
              objectPosition: objectPositionMobile,
              transform: `scale(${scaleMobile})`,
            }}
          />
        ) : null}

        {videoDesktop ? (
          <video
            src={videoDesktop}
            poster={poster || undefined}
            autoPlay
            loop={videoLoop}
            muted={videoMuted}
            playsInline
            className={`h-full w-full object-cover ${
              device ? (showMobile ? "hidden" : "block") : "hidden md:block"
            }`}
            style={{
              objectPosition: objectPositionDesktop,
              transform: `scale(${scaleDesktop})`,
            }}
          />
        ) : null}
      </>
    );
  }

  if (!imageDesktop && !mobileImage) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-medium text-slate-500">
        Banner sem mídia
      </div>
    );
  }

  return (
    <>
      {mobileImage ? (
        <img
          src={mobileImage}
          alt={alt}
          className={`h-full w-full object-cover ${
            device ? (showMobile ? "block" : "hidden") : "block md:hidden"
          }`}
          style={{
            objectPosition: objectPositionMobile,
            transform: `scale(${scaleMobile})`,
          }}
        />
      ) : null}

      {imageDesktop || mobileImage ? (
        <img
          src={imageDesktop || mobileImage}
          alt={alt}
          className={`h-full w-full object-cover ${
            device ? (showMobile ? "hidden" : "block") : "hidden md:block"
          }`}
          style={{
            objectPosition: objectPositionDesktop,
            transform: `scale(${scaleDesktop})`,
          }}
        />
      ) : null}
    </>
  );
}

function EditorHitArea({
  element,
  selectedElement,
  onElementSelect,
  label,
  className = "",
}: {
  element: BannerElement;
  selectedElement?: BannerElement;
  onElementSelect?: (element: BannerElement) => void;
  label: string;
  className?: string;
}) {
  if (!onElementSelect) return null;

  const selected = selectedElement === element;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onElementSelect(element);
      }}
      className={`absolute z-30 rounded-2xl border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition ${
        selected
          ? "border-indigo-300 bg-indigo-600 text-white"
          : "border-white/50 bg-white/85 text-slate-700 hover:bg-white"
      } ${className}`}
    >
      {label}
    </button>
  );
}

function BannerFloatingProduct({
  produto,
  index,
}: {
  produto: ProdutoPublico;
  index: number;
}) {
  const precoFinal =
    produtoTemDesconto(produto) && produto.precoPromocional
      ? produto.precoPromocional
      : produto.precoVenda;

  return (
    <Link
      href={`/loja/produto/${produto.id}`}
      className={`pointer-events-auto group block overflow-hidden rounded-[28px] bg-white/92 shadow-2xl ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-1 ${
        index === 1 ? "translate-y-8" : ""
      }`}
    >
      <div className="aspect-[4/5] bg-slate-100">
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-950">
          {produto.nome}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {moeda(precoFinal)}
        </p>
      </div>
    </Link>
  );
}

function renderCtaLink({
  href,
  children,
  className,
  novaAba,
}: {
  href: string;
  children: ReactNode;
  className: string;
  novaAba: boolean;
}) {
  if (!href) {
    return <span className={className}>{children}</span>;
  }

  const isExternal = /^https?:\/\//.test(href);
  const targetProps =
    novaAba || isExternal ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <Link href={href} className={className} {...targetProps}>
      {children}
    </Link>
  );
}

export default function BannerRenderer({
  bloco,
  produtos = [],
  device,
  modo = "publico",
  selectedElement,
  onElementSelect,
  titleSlot,
  subtitleSlot,
  primaryCtaSlot,
  secondaryCtaSlot,
}: BannerRendererProps) {
  const config = asConfig(bloco.configJson);
  const modelo = normalizeBannerModelo(getString(config, "modeloBanner"));
  const isEditor = modo === "editor";
  const isMobile = device === "MOBILE";
  const titulo = getString(config, ["titulo", "nome"]);
  const subtitulo = getString(config, ["subtitulo", "texto", "descricao", "conteudo"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, ["subtituloRichText", "textoRichText"]);
  const tipoMidia = getString(config, "tipoMidia", "IMAGEM");
  const imageDesktop = getImageDesktop(config);
  const imageMobile = getImageMobile(config);
  const videoDesktop = getString(config, "videoDesktopUrl");
  const videoMobile = getString(config, "videoMobileUrl");
  const exibirMidia = getBoolean(config, "exibirMidia", true);
  const exibirTexto = getBoolean(config, "exibirTexto", true);
  const exibirSubtitulo = getBoolean(config, "exibirSubtitulo", true);
  const exibirBotaoPrimario = getBoolean(config, "exibirBotaoPrimario", true);
  const exibirBotaoSecundario = getBoolean(config, "exibirBotaoSecundario", false);
  const textoBotao = getStringWithDefault(config, ["textoBotao", "botaoTexto"], "Conhecer");
  const linkBotao = getButtonHref(config, ["linkBotao", "botaoLink", "linkUrl"]);
  const textoBotaoSecundario = getStringWithDefault(config, [
    "textoBotaoSecundario",
    "botaoSecundarioTexto",
  ]);
  const linkBotaoSecundario = getButtonHref(config, [
    "linkBotaoSecundario",
    "botaoSecundarioLink",
  ]);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasSubtitulo = hasTextContent(subtituloRichText, subtitulo);
  const hasBotaoPrimario = exibirBotaoPrimario && Boolean(textoBotao || primaryCtaSlot);
  const hasBotaoSecundario =
    exibirBotaoSecundario && Boolean(textoBotaoSecundario || secondaryCtaSlot);
  const hasConteudo =
    exibirTexto &&
    (hasTitulo ||
      (exibirSubtitulo && hasSubtitulo) ||
      hasBotaoPrimario ||
      hasBotaoSecundario ||
      isEditor);
  const largura = getString(config, "larguraBanner", "FULL_BLEED");
  const altura = getString(config, "alturaBanner", "PADRAO");
  const overlay = getString(config, "overlayBanner", "LEVE");
  const corTexto = getString(config, "corTextoBanner", "CLARO");
  const textClass = getContentTextClass(corTexto);
  const alinhamentoHorizontal = getString(config, "alinhamentoConteudo", "ESQUERDA");
  const alinhamentoVertical = getString(config, "alinhamentoVertical", "CENTRO");
  const alinhamentoTextoDesktop = getString(
    config,
    "alinhamentoTextoDesktop",
    alinhamentoHorizontal
  );
  const alinhamentoTextoMobile = getString(
    config,
    "alinhamentoTextoMobile",
    alinhamentoTextoDesktop
  );
  const textAlignClass = device
    ? getTextAlignClass(isMobile ? alinhamentoTextoMobile : alinhamentoTextoDesktop)
    : `${getTextAlignClass(alinhamentoTextoMobile)} ${getTextAlignClass(
        alinhamentoTextoDesktop,
        "md:"
      )}`;
  const safeX = getNumberClamped(config, "margemSeguraX", 8, 0, 18);
  const safeY = getNumberClamped(config, "margemSeguraY", 8, 0, 18);
  const larguraTexto = getNumberClamped(
    config,
    "larguraTextoPercentual",
    modelo === "CAMADAS_PARALLAX" ? 86 : modelo === "FAIXA_PROMOCIONAL" ? 92 : 58,
    30,
    100
  );
  const fontDesktop = getNumberClamped(
    config,
    "fonteTituloDesktop",
    getDefaultTitleSize(modelo, false),
    24,
    140
  );
  const fontMobile = getNumberClamped(
    config,
    "fonteTituloMobile",
    getDefaultTitleSize(modelo, true),
    24,
    96
  );
  const lineHeightTitulo = getNumberClamped(config, "lineHeightTitulo", 0.98, 0.8, 1.4);
  const letterSpacingTitulo = getNumber(config, "letterSpacingTitulo", 0);
  const selectedProducts = getSelectedProducts(produtos, config);
  const frontImage =
    getFrontImage(config, isMobile) ||
    (modelo === "CAMADAS_PARALLAX" ? selectedProducts[0]?.imagemUrl || "" : "");
  const frontImageAlt =
    getString(config, "imagemFrenteAlt") || selectedProducts[0]?.nome || titulo;
  const frontWidth = getNumberClamped(
    config,
    isMobile ? "imagemFrenteLarguraMobile" : "imagemFrenteLarguraDesktop",
    isMobile ? 56 : 34,
    12,
    80
  );
  const frontX = getNumberClamped(config, "imagemFrenteX", isMobile ? 50 : 74, 0, 100);
  const frontY = getNumberClamped(config, "imagemFrenteY", isMobile ? 78 : 56, 0, 100);
  const ctaStyle = getString(config, "estiloCtaBanner", "PREENCHIDO");
  const ctaNovaAba = getBoolean(config, "ctaNovaAba", false);
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "PILULA")
  );
  const hasMedia = Boolean(imageDesktop || imageMobile || videoDesktop || videoMobile);

  if (!hasMedia && !hasConteudo && !frontImage) {
    return null;
  }

  const isAutoHeight = altura === "AUTO_CONTEUDO";
  const wrapperClass =
    largura === "CONTIDA" ? "mx-auto max-w-7xl px-4 py-6 md:px-8" : "";
  const innerClass = `relative overflow-hidden bg-slate-950 ${getHeightClass(
    altura,
    modelo,
    device
  )}`;
  const textStyleBase: CSSProperties = {
    fontSize: device
      ? `${isMobile ? fontMobile : fontDesktop}px`
      : `clamp(${fontMobile}px, 6vw, ${fontDesktop}px)`,
    lineHeight: lineHeightTitulo,
    letterSpacing: `${letterSpacingTitulo}px`,
  };
  const titleStyle = getTextStyle(config, "tituloStyle", textStyleBase, {
    ignoreFontSizePreset: true,
  });
  const subtitleStyle = getTextStyle(config, "subtituloStyle", {});
  const primaryCtaStyle = getTextStyle(config, "botaoPrimarioStyle", {});
  const secondaryCtaStyle = getTextStyle(config, "botaoSecundarioStyle", {});
  const ctaBaseClass = `inline-flex min-h-11 items-center justify-center px-6 text-sm font-semibold transition ${buttonRadiusClass}`;
  const primaryCtaClass =
    ctaStyle === "CONTORNO"
      ? `${ctaBaseClass} border ${textClass.buttonSecondary}`
      : ctaStyle === "LINK"
        ? `inline-flex items-center justify-center text-sm font-semibold ${textClass.buttonLink}`
        : `${ctaBaseClass} ${textClass.buttonPrimary}`;
  const secondaryCtaClass = `${ctaBaseClass} border ${textClass.buttonSecondary}`;
  const contentMaxWidth =
    modelo === "FAIXA_PROMOCIONAL" ? "min(980px, 100%)" : `${larguraTexto}%`;
  const contentStyle: CSSProperties = {
    padding: `${safeY}% ${safeX}%`,
  };
  const mediaObjectPositionDesktop = getObjectPosition(config, "Desktop");
  const mediaObjectPositionMobile = getObjectPosition(config, "Mobile");
  const mediaScaleDesktop = getMediaScale(config, "Desktop");
  const mediaScaleMobile = getMediaScale(config, "Mobile");

  const titleContent =
    titleSlot?.({ className: "w-full", style: titleStyle }) || (
      <PublicRichTextRenderer
        value={tituloRichText}
        fallback={titulo}
        className={`font-light tracking-normal ${textClass.title}`}
        style={titleStyle}
        paragraphClassName="mb-0"
      />
    );
  const subtitleContent =
    subtitleSlot?.({ className: "w-full", style: subtitleStyle }) || (
      <PublicRichTextRenderer
        value={subtituloRichText}
        fallback={subtitulo}
        className={`text-base leading-7 md:text-lg ${textClass.body}`}
        style={subtitleStyle}
        paragraphClassName="mb-0"
      />
    );
  const primaryCtaContent =
    primaryCtaSlot?.({ className: "text-center", style: primaryCtaStyle }) ||
    textoBotao;
  const secondaryCtaContent =
    secondaryCtaSlot?.({ className: "text-center", style: secondaryCtaStyle }) ||
    textoBotaoSecundario;

  const contentNode = hasConteudo ? (
    <div
      className={`relative z-20 mx-auto flex w-full max-w-7xl ${
        isAutoHeight ? "" : "min-h-[inherit]"
      } ${getItemsClass(alinhamentoVertical)} ${getJustifyClass(
        modelo === "FAIXA_PROMOCIONAL" ? "CENTRO" : alinhamentoHorizontal
      )}`}
      style={contentStyle}
    >
      <div className={`${textAlignClass}`} style={{ width: "100%", maxWidth: contentMaxWidth }}>
        {hasTitulo || isEditor ? (
          <div
            className={`relative rounded-2xl font-light transition ${
              isEditor
                ? selectedElement === "TITULO"
                  ? "ring-4 ring-indigo-400"
                  : "hover:ring-2 hover:ring-white/45"
                : ""
            } ${textClass.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onElementSelect?.("TITULO");
            }}
          >
            {titleContent}
          </div>
        ) : null}

        {exibirSubtitulo && (hasSubtitulo || isEditor) ? (
          <div
            className={`relative mt-5 rounded-2xl transition ${
              isEditor
                ? selectedElement === "SUBTITULO"
                  ? "ring-4 ring-indigo-400"
                  : "hover:ring-2 hover:ring-white/45"
                : ""
            } ${textClass.body}`}
            onClick={(event) => {
              event.stopPropagation();
              onElementSelect?.("SUBTITULO");
            }}
          >
            {subtitleContent}
          </div>
        ) : null}

        {hasBotaoPrimario || hasBotaoSecundario ? (
          <div
            className={`mt-8 flex flex-wrap gap-3 rounded-2xl transition ${
              isEditor
                ? selectedElement === "CTA"
                  ? "ring-4 ring-indigo-400"
                  : "hover:ring-2 hover:ring-white/45"
                : ""
            } ${
              modelo === "FAIXA_PROMOCIONAL" || alinhamentoHorizontal === "CENTRO"
                ? "justify-center"
                : alinhamentoHorizontal === "DIREITA"
                  ? "justify-end"
                  : "justify-start"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onElementSelect?.("CTA");
            }}
          >
            {hasBotaoPrimario
              ? renderCtaLink({
                  href: linkBotao,
                  novaAba: ctaNovaAba,
                  className: primaryCtaClass,
                  children: primaryCtaContent,
                })
              : null}

            {hasBotaoSecundario
              ? renderCtaLink({
                  href: linkBotaoSecundario,
                  novaAba: ctaNovaAba,
                  className: secondaryCtaClass,
                  children: secondaryCtaContent,
                })
              : null}
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <section className={wrapperClass}>
      <div
        className={`${innerClass} ${
          modelo === "EDITORIAL_IMAGEM" ? "isolate" : ""
        }`}
      >
        <div
          className={`absolute inset-0 overflow-hidden ${
            modelo === "EDITORIAL_IMAGEM" ? "md:left-[42%]" : ""
          }`}
        >
          <MediaLayer
            tipoMidia={tipoMidia}
            imageDesktop={imageDesktop}
            imageMobile={imageMobile}
            videoDesktop={videoDesktop}
            videoMobile={videoMobile}
            poster={getString(config, "videoPosterUrl")}
            alt={titulo || BANNER_MODELO_LABELS[modelo]}
            exibirMidia={exibirMidia}
            objectPositionDesktop={mediaObjectPositionDesktop}
            objectPositionMobile={mediaObjectPositionMobile}
            scaleDesktop={mediaScaleDesktop}
            scaleMobile={mediaScaleMobile}
            videoLoop={getBoolean(config, "videoLoop", true)}
            videoMuted={getString(config, "videoSom", "MUDO") !== "COM_SOM"}
            device={device}
          />
        </div>

        <button
          type="button"
          aria-label="Selecionar mídia do banner"
          onClick={(event) => {
            event.stopPropagation();
            onElementSelect?.("MIDIA");
          }}
          className={`absolute inset-0 z-10 ${
            onElementSelect ? "cursor-pointer" : "pointer-events-none"
          } ${
            isEditor && selectedElement === "MIDIA"
              ? "ring-4 ring-inset ring-indigo-400"
              : isEditor && onElementSelect
                ? "hover:ring-2 hover:ring-inset hover:ring-white/45"
                : ""
          }`}
        />

        <div className={`absolute inset-0 z-10 ${getOverlayClass(overlay, modelo)}`} />

        {modelo === "CAMADAS_PARALLAX" && frontImage ? (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              width: `${frontWidth}%`,
              left: `${frontX}%`,
              top: `${frontY}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <img
              src={frontImage}
              alt={frontImageAlt}
              className="h-auto w-full drop-shadow-[0_32px_70px_rgba(15,23,42,0.38)]"
            />

            {isEditor ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onElementSelect?.("IMAGEM_FRENTE");
                }}
                className={`pointer-events-auto absolute inset-0 rounded-[2rem] ${
                  selectedElement === "IMAGEM_FRENTE"
                    ? "ring-4 ring-indigo-400"
                    : "ring-1 ring-white/25"
                }`}
                aria-label="Selecionar imagem frontal"
              />
            ) : null}
          </div>
        ) : null}

        {contentNode}

        {modelo === "CAMADAS_PARALLAX" &&
        getBoolean(config, "produtosFlutuantesAtivos", false) &&
        selectedProducts.length > 1 ? (
          <div className="pointer-events-none absolute bottom-6 right-4 z-20 hidden w-[36%] max-w-md grid-cols-2 gap-3 md:grid lg:right-8">
            {selectedProducts.slice(1, 3).map((produto, index) => (
              <BannerFloatingProduct
                key={produto.id}
                produto={produto}
                index={index}
              />
            ))}
          </div>
        ) : null}

        {isEditor ? (
          <>
            <EditorHitArea
              element="MIDIA"
              selectedElement={selectedElement}
              onElementSelect={onElementSelect}
              label="Imagem / crop"
              className="left-4 top-4"
            />
            <EditorHitArea
              element="DESIGN"
              selectedElement={selectedElement}
              onElementSelect={onElementSelect}
              label="Design"
              className="right-4 top-4"
            />
            {modelo === "CAMADAS_PARALLAX" ? (
              <EditorHitArea
                element="IMAGEM_FRENTE"
                selectedElement={selectedElement}
                onElementSelect={onElementSelect}
                label="Camada frontal"
                className="right-4 bottom-4"
              />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
