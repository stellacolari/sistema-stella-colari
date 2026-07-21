export const STELLA_HOME_NAMESPACE = "loja-inicial-2026-07";

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

type StellaHomeBlockLike = {
  tipo: string;
  configJson: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
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
