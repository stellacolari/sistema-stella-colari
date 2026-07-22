export const STELLA_HOME_NAMESPACE = "loja-inicial-2026-07";
export const STELLA_HOME_HERO_TITLE = "Viva Stella Colari.";

const STELLA_HOME_SUPPORTED_VERSIONS = new Set([1, 2]);

export const STELLA_HOME_BLOCK_TYPES = {
  "home.hero": "BANNER_HERO_V2",
  "home.valores": "DESTAQUES_CARDS",
  "home.categorias": "COLECOES_CATEGORIAS",
  "home.novidades": "LISTA_PRODUTOS",
  "home.novidades-cta": "CTA_SIMPLES",
  "home.editorial": "TEXTO_IMAGEM",
  "home.destaques": "LISTA_PRODUTOS",
  "home.presentes": "TEXTO_IMAGEM",
  "home.categorias-destaque": "COLECOES_CATEGORIAS",
  "home.informacoes": "DESTAQUES_CARDS",
  "home.story": "TEXTO_IMAGEM",
  "home.galeria": "GALERIA_EDITORIAL_FULL_BLEED",
  "home.cta-final": "CTA_SIMPLES",
} as const;

export type StellaHomeBlockKey = keyof typeof STELLA_HOME_BLOCK_TYPES;

export const STELLA_HOME_BLOCK_ORDER: readonly StellaHomeBlockKey[] = [
  "home.hero",
  "home.categorias",
  "home.novidades",
  "home.novidades-cta",
  "home.valores",
  "home.editorial",
  "home.destaques",
  "home.presentes",
  "home.categorias-destaque",
  "home.informacoes",
  "home.story",
  "home.galeria",
  "home.cta-final",
];

type StellaHomeBlockLike = {
  tipo: string;
  configJson: unknown;
};

const STELLA_HOME_PRODUCT_SOURCES = new Set([
  "TODOS",
  "NOVOS",
  "DESCONTOS",
  "MAIS_VENDIDOS",
  "CATEGORIA",
  "CATEGORIAS_SELECIONADAS",
  "MANUAL",
  "COLECAO_INTELIGENTE",
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getArray(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return Array.isArray(value) ? value : [];
}

function getString(
  config: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function getStringWithDefault(
  config: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  if (!Object.prototype.hasOwnProperty.call(config, key)) return fallback;
  const value = config[key];
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback = false,
) {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}

function getNumber(
  config: Record<string, unknown>,
  key: string,
  fallback = 0,
) {
  const value = Number(config[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function isStellaHomeBlockConfigSupported(
  blockKey: StellaHomeBlockKey,
  configJson: unknown,
) {
  const config = asRecord(configJson);

  if (blockKey === "home.hero") {
    const slides = getArray(config, "slides");
    const carrossel = asRecord(config.carrossel);
    const slide = asRecord(slides[0]);
    const linkSlide = asRecord(slide.linkSlide);

    return (
      slides.length === 1 &&
      !getBoolean(carrossel, "ativo", false) &&
      getString(slide, "tipoMidia", "IMAGEM") === "IMAGEM" &&
      getString(config, "navegacaoInferior", "NENHUMA") === "NENHUMA" &&
      !getStringWithDefault(linkSlide, "valor")
    );
  }

  if (blockKey === "home.novidades" || blockKey === "home.destaques") {
    return STELLA_HOME_PRODUCT_SOURCES.has(
      getString(config, "fonte", "TODOS"),
    );
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
    const fonte = asRecord(config.fonte);
    const hover = asRecord(config.hover);
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
      const cardConfig = asRecord(card);
      if (!getBoolean(cardConfig, "exibirMidia", true)) return true;

      return ["IMAGEM", "ICONE", "NENHUMA"].includes(
        getString(cardConfig, "tipoMidia", "ICONE"),
      );
    });
  }

  if (
    blockKey === "home.categorias" ||
    blockKey === "home.categorias-destaque"
  ) {
    return getArray(config, "itens").every((item) => {
      const itemConfig = asRecord(item);
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
        getString(config, "videoMobileUrl"),
    );

    return !(getBoolean(config, "exibirMidia", false) && hasMedia);
  }

  return true;
}

export function getStellaHomeBlockKey(
  bloco: StellaHomeBlockLike
): StellaHomeBlockKey | null {
  const setup = asRecord(asRecord(bloco.configJson)._stellaSetup);
  const namespace = typeof setup.namespace === "string" ? setup.namespace : "";
  const key = typeof setup.key === "string" ? setup.key : "";
  const version = Number(setup.version);

  if (
    namespace !== STELLA_HOME_NAMESPACE ||
    !Number.isInteger(version) ||
    !STELLA_HOME_SUPPORTED_VERSIONS.has(version)
  ) {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(STELLA_HOME_BLOCK_TYPES, key)) {
    return null;
  }

  const typedKey = key as StellaHomeBlockKey;

  return STELLA_HOME_BLOCK_TYPES[typedKey] === bloco.tipo ? typedKey : null;
}
