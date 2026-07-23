export type BannerEditorialAlinhamento = "ESQUERDA" | "CENTRO";

export type BannerEditorialConfig = {
  preset: "EDITORIAL_HERO";
  titulo: string;
  subtitulo: string;
  textoAuxiliar: string;
  botaoTexto: string;
  botaoUrl: string;
  imagemUrl: string;
  imagemMobileUrl: string;
  imagemAlt: string;
  alinhamento: BannerEditorialAlinhamento;
  corFundo: string;
  corTexto: string;
  corDestaque: string;
};

export const BANNER_EDITORIAL_TEXT_LIMITS = {
  titulo: 70,
  subtitulo: 160,
  textoAuxiliar: 80,
  botaoTexto: 24,
} as const;

const DEFAULT_BANNER_EDITORIAL_CONFIG: BannerEditorialConfig = {
  preset: "EDITORIAL_HERO",
  titulo: "Brilho em nova escala",
  subtitulo:
    "Peças autorais para compor dias especiais com leveza, presença e acabamento premium.",
  textoAuxiliar: "Nova coleção",
  botaoTexto: "Explorar",
  botaoUrl: "/loja",
  imagemUrl: "",
  imagemMobileUrl: "",
  imagemAlt: "Banner editorial Stella Colari",
  alinhamento: "ESQUERDA",
  corFundo: "#ffffff",
  corTexto: "#000000",
  corDestaque: "#2e7b99",
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getString(config: Record<string, unknown>, key: string) {
  const value = config[key];

  return typeof value === "string" ? value : undefined;
}

function limitarTexto(value: string | undefined, limit: number, fallback = "") {
  return (value ?? fallback).slice(0, limit);
}

function normalizarCor(value: string | undefined, fallback: string) {
  const color = (value || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;

  return fallback;
}

function normalizarAlinhamento(value: string | undefined): BannerEditorialAlinhamento {
  return value === "CENTRO" ? "CENTRO" : "ESQUERDA";
}

export function criarBannerEditorialConfigPadrao(): BannerEditorialConfig {
  return { ...DEFAULT_BANNER_EDITORIAL_CONFIG };
}

export function normalizarBannerEditorialConfig(value: unknown): BannerEditorialConfig {
  const config = asRecord(value);

  return {
    preset: "EDITORIAL_HERO",
    titulo: limitarTexto(
      getString(config, "titulo"),
      BANNER_EDITORIAL_TEXT_LIMITS.titulo,
      DEFAULT_BANNER_EDITORIAL_CONFIG.titulo
    ),
    subtitulo: limitarTexto(
      getString(config, "subtitulo"),
      BANNER_EDITORIAL_TEXT_LIMITS.subtitulo,
      DEFAULT_BANNER_EDITORIAL_CONFIG.subtitulo
    ),
    textoAuxiliar: limitarTexto(
      getString(config, "textoAuxiliar"),
      BANNER_EDITORIAL_TEXT_LIMITS.textoAuxiliar,
      DEFAULT_BANNER_EDITORIAL_CONFIG.textoAuxiliar
    ),
    botaoTexto: limitarTexto(
      getString(config, "botaoTexto"),
      BANNER_EDITORIAL_TEXT_LIMITS.botaoTexto,
      DEFAULT_BANNER_EDITORIAL_CONFIG.botaoTexto
    ),
    botaoUrl:
      getString(config, "botaoUrl") ||
      getString(config, "linkBotao") ||
      getString(config, "linkUrl") ||
      DEFAULT_BANNER_EDITORIAL_CONFIG.botaoUrl,
    imagemUrl:
      getString(config, "imagemUrl") ||
      getString(config, "imagemDesktopUrl") ||
      getString(config, "imagemDesktop") ||
      "",
    imagemMobileUrl:
      getString(config, "imagemMobileUrl") ||
      getString(config, "imagemMobile") ||
      "",
    imagemAlt:
      getString(config, "imagemAlt") ||
      getString(config, "altText") ||
      DEFAULT_BANNER_EDITORIAL_CONFIG.imagemAlt,
    alinhamento: normalizarAlinhamento(getString(config, "alinhamento")),
    corFundo: normalizarCor(
      getString(config, "corFundo"),
      DEFAULT_BANNER_EDITORIAL_CONFIG.corFundo
    ),
    corTexto: normalizarCor(
      getString(config, "corTexto"),
      DEFAULT_BANNER_EDITORIAL_CONFIG.corTexto
    ),
    corDestaque: normalizarCor(
      getString(config, "corDestaque"),
      DEFAULT_BANNER_EDITORIAL_CONFIG.corDestaque
    ),
  };
}

export function getBannerEditorialTituloClass(length: number, forceMobile = false) {
  if (forceMobile) {
    if (length <= 22) return "text-5xl";
    if (length <= 42) return "text-4xl";
    if (length <= 58) return "text-3xl";
    return "text-2xl";
  }

  if (length <= 22) return "text-5xl sm:text-6xl lg:text-8xl xl:text-9xl";
  if (length <= 42) return "text-4xl sm:text-5xl lg:text-7xl xl:text-8xl";
  if (length <= 58) return "text-4xl sm:text-5xl lg:text-6xl xl:text-7xl";

  return "text-3xl sm:text-4xl lg:text-5xl xl:text-6xl";
}
