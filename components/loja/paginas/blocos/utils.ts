import type { CSSProperties } from "react";

export type BlocoPublico = {
  id: string;
  tipo: string;
  titulo: string | null;
  ordem: number;
  configJson: unknown;
};

export type ProdutoPublico = {
  id: string;
  codigoInterno: string;
  nome: string;
  imagemUrl?: string | null;
  imagemHoverUrl?: string | null;
  categoria: string;
  categoriaIds?: string[];
  categoriaSlugs?: string[];
  categoriaNomes?: string[];
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoqueTotal: number;
  vendidosTotal: number;
  criadoEm: string;
  tamanhosDisponiveis?: {
    tamanhoAnel: string;
    quantidadeAtual: number;
  }[];
};

export type BlocoPublicoProps = {
  bloco: BlocoPublico;
  produtos?: ProdutoPublico[];
  listaCompletaProdutos?: boolean;
};

export const TIPOS_BLOCOS_VISUAIS_PUBLICOS = new Set([
  "BANNER",
  "HERO",
  "HERO_EDITORIAL_PNG",
  "GALERIA_EDITORIAL_FULL_BLEED",
  "TEXTO_IMAGEM",
  "IMAGEM_TEXTO",
  "DESTAQUES_CARDS",
  "COLECOES_CATEGORIAS",
  "MOSAICO_COLECOES",
  "VITRINE_EDITORIAL",
  "LISTA_PRODUTOS",
  "CTA",
  "CTA_SIMPLES",
]);

export function isBlocoVisualPublico(tipo: string) {
  return TIPOS_BLOCOS_VISUAIS_PUBLICOS.has(tipo);
}

export function asConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function getString(
  config: Record<string, unknown>,
  keys: string | string[],
  fallback = ""
) {
  const keysList = Array.isArray(keys) ? keys : [keys];

  for (const key of keysList) {
    const value = config[key];

    if (typeof value === "string" && value.trim()) return value;
  }

  return fallback;
}

export function hasConfigKey(config: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(config, key);
}

export function getStringWithDefault(
  config: Record<string, unknown>,
  keys: string | string[],
  fallback = ""
) {
  const keysList = Array.isArray(keys) ? keys : [keys];

  for (const key of keysList) {
    if (!hasConfigKey(config, key)) continue;

    const value = config[key];

    return typeof value === "string" ? value.trim() : "";
  }

  return fallback;
}

export function getBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback = false
) {
  const value = config[key];

  if (typeof value === "boolean") return value;

  return fallback;
}

export function getNumber(
  config: Record<string, unknown>,
  key: string,
  fallback = 0
) {
  const value = Number(config[key]);

  if (Number.isFinite(value)) return value;

  return fallback;
}

export function getArray(config: Record<string, unknown>, key: string) {
  const value = config[key];

  return Array.isArray(value) ? value : [];
}

export function getRichText(config: Record<string, unknown>, keys: string | string[]) {
  const keysList = Array.isArray(keys) ? keys : [keys];

  for (const key of keysList) {
    const value = config[key];

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      (value as { type?: unknown }).type === "doc" &&
      !isRichTextEmpty(value)
    ) {
      return value;
    }
  }

  return null;
}

export function getPlainTextFromRichText(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const node = value as {
    text?: unknown;
    content?: unknown;
  };

  if (typeof node.text === "string") return node.text;

  if (Array.isArray(node.content)) {
    return node.content.map(getPlainTextFromRichText).join("\n");
  }

  return "";
}

export function isRichTextEmpty(value: unknown) {
  return getPlainTextFromRichText(value).trim().length === 0;
}

export function hasTextContent(richText: unknown, fallback: string) {
  if (richText && !isRichTextEmpty(richText)) return true;

  return fallback.trim().length > 0;
}

export function resolveSpacingValue(value: unknown, fallback = "PADRAO") {
  if (typeof value !== "string" || !value.trim()) return fallback;

  if (value === "COMPACTO") return "PEQUENO";
  if (value === "AMPLO") return "GRANDE";
  if (value === "MEDIO") return "PADRAO";
  if (["PEQUENO", "PADRAO", "GRANDE", "EXTRA"].includes(value)) return value;

  return fallback;
}

export function resolveVerticalSpacingClass(value: unknown) {
  const normalized = resolveSpacingValue(value);

  if (normalized === "PEQUENO") return "py-8 md:py-10";
  if (normalized === "GRANDE") return "py-16 md:py-24";
  if (normalized === "EXTRA") return "py-24 md:py-32";

  return "py-12 md:py-16";
}

export function resolveHorizontalSpacingClass(value: unknown) {
  const normalized = resolveSpacingValue(value);

  if (normalized === "PEQUENO") return "px-4";
  if (normalized === "GRANDE") return "px-6 md:px-12";
  if (normalized === "EXTRA") return "px-8 md:px-20";

  return "px-5 md:px-8";
}

export function resolveSpacingClasses(config: Record<string, unknown>) {
  const fallbackSpacing = resolveSpacingValue(config.espacamento);
  const vertical = resolveSpacingValue(
    config.espacamentoVertical,
    fallbackSpacing
  );
  const horizontal = resolveSpacingValue(
    config.espacamentoHorizontal,
    fallbackSpacing
  );

  return `${resolveVerticalSpacingClass(vertical)} ${resolveHorizontalSpacingClass(horizontal)}`;
}

export function getSpacingClass(value: string | Record<string, unknown>) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return resolveSpacingClasses(value);
  }

  return `${resolveVerticalSpacingClass(value)} ${resolveHorizontalSpacingClass("PADRAO")}`;
}

export function getBackgroundClass(value: string) {
  if (value === "CINZA" || value === "AZUL_CLARO") return "bg-slate-50";
  if (value === "MARCA" || value === "AZUL_ESCURO") return "bg-[#2e7b99]";
  if (value === "ESCURO") return "bg-slate-950";

  return "bg-white";
}

export function getTextColorForBackground(value: string) {
  if (value === "MARCA" || value === "AZUL_ESCURO" || value === "ESCURO") {
    return {
      title: "text-white",
      body: "text-white/78",
      muted: "text-white/60",
      border: "border-white/15",
      card: "bg-white/10",
    };
  }

  return {
    title: "text-slate-950",
    body: "text-slate-600",
    muted: "text-slate-500",
    border: "border-slate-200",
    card: "bg-white",
  };
}

export function getGridColumnsClass(
  mobile: number,
  tablet: number,
  desktop: number
) {
  const mobileClass: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };
  const tabletClass: Record<number, string> = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };
  const desktopClass: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
  };

  return [
    mobileClass[Math.min(Math.max(mobile, 1), 4)] || "grid-cols-1",
    tabletClass[Math.min(Math.max(tablet, 1), 4)] || "md:grid-cols-2",
    desktopClass[Math.min(Math.max(desktop, 1), 6)] || "lg:grid-cols-3",
  ].join(" ");
}

export function getMediaPosition(config: Record<string, unknown>, device: "Desktop" | "Mobile") {
  return getString(config, `mediaPosition${device}`, "center center");
}

export function getImageDesktop(config: Record<string, unknown>) {
  return getString(config, [
    "imagemDesktopUrl",
    "imagemDesktop",
    "imagemUrl",
    "imagem",
    "backgroundImageUrl",
  ]);
}

export function getImageMobile(config: Record<string, unknown>) {
  return getString(config, ["imagemMobileUrl", "imagemMobile"]);
}

export function getButtonHref(config: Record<string, unknown>, keys: string | string[]) {
  const href = getString(config, keys);

  return href;
}

export function getButtonRadiusClass(value: string) {
  if (value === "RETO") return "rounded-none";
  if (value === "SUAVE") return "rounded-md";
  if (value === "ARREDONDADO") return "rounded-2xl";

  return "rounded-full";
}

function getTextAlignClass(value: string, prefix = "") {
  if (value === "ESQUERDA") return `${prefix}text-left`;
  if (value === "DIREITA") return `${prefix}text-right`;

  return `${prefix}text-center`;
}

export function getResponsiveTextAlignClass({
  desktop,
  mobile,
  fallback = "CENTRO",
}: {
  desktop?: string;
  mobile?: string;
  fallback?: string;
}) {
  const mobileValue = mobile || fallback;
  const desktopValue = desktop || fallback;

  return `${getTextAlignClass(mobileValue)} ${getTextAlignClass(
    desktopValue,
    "lg:"
  )}`;
}

export function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function produtoTemDesconto(produto: ProdutoPublico) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

export function getInlineVars(vars: Record<string, string | number>) {
  return vars as CSSProperties;
}
