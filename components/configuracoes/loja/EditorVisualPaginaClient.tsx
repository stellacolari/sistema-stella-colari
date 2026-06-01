"use client";

import type {
  CSSProperties,
  ChangeEvent,
  DragEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Layers,
  LayoutGrid,
  Monitor,
  MousePointer2,
  PanelRight,
  Plus,
  Rows3,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  X,
} from "lucide-react";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import {
  RICH_TEXT_COLOR_PRESETS,
  RICH_TEXT_FONT_PRESETS,
  RICH_TEXT_LETTER_SPACING_PRESETS,
  RICH_TEXT_SIZE_PRESETS,
  RICH_TEXT_WEIGHT_PRESETS,
  getRichTextPresetCss,
} from "@/components/loja/paginas/richTextPresets";

export type EditorVisualPagina = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  ativo: boolean;
  statusPublicacao: string;
  urlPublica: string;
};

export type EditorVisualBloco = {
  id: string;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ordem: number;
  configJson: unknown;
  criadoEm: string;
  atualizadoEm: string;
};

export type EditorVisualCategoria = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

export type EditorVisualProduto = {
  id: string;
  codigoInterno: string;
  nome: string;
  imagemUrl: string | null;
  categoria: string;
  categoriaIds: string[];
  categoriaNomes: string[];
};

type EditorVisualPaginaClientProps = {
  pagina: EditorVisualPagina;
  blocos: EditorVisualBloco[];
  categoriasDisponiveis: EditorVisualCategoria[];
  produtosDisponiveis: EditorVisualProduto[];
};

type DevicePreview = "DESKTOP" | "TABLET" | "MOBILE";

type TipoBlocoAdicionar =
  | "BANNER"
  | "TEXTO_IMAGEM"
  | "LISTA_PRODUTOS"
  | "DESTAQUES_CARDS"
  | "CTA_SIMPLES"
  | "CTA"
  | "CATEGORIAS"
  | "FAQ"
  | "FORMULARIO"
  | "TEXTO"
  | "ESPACADOR";

type DestaqueCardEditando = {
  id: string;
  titulo: string;
  texto: string;
  tituloRichText: RichTextValue | null;
  textoRichText: RichTextValue | null;
  exibirMidia: boolean;
  tipoMidia: string;
  imagemDesktopUrl: string;
  imagemMobileUrl: string;
  videoDesktopUrl: string;
  videoMobileUrl: string;
  icone: string;
  mediaPositionDesktop: string;
  mediaPositionMobile: string;
  mediaCropDesktopX: number;
  mediaCropDesktopY: number;
  mediaCropMobileX: number;
  mediaCropMobileY: number;
  exibirBotao: boolean;
  textoBotao: string;
  linkBotao: string;
};

type TextStyleConfig = {
  fontSizePreset: string;
  fontWeight: string;
  colorPreset: string;
  colorCustom: string;
  letterSpacing: string;
  textTransform: string;
  textAlign: string;
};

type RichTextValue = JSONContent;

type BlocoEditandoState = {
  bloco: EditorVisualBloco;
  nomeInterno: string;
  titulo: string;
  texto: string;
  imagemUrl: string;
  imagemDesktopUrl: string;
  imagemMobileUrl: string;
  videoDesktopUrl: string;
  videoMobileUrl: string;
  videoPosterUrl: string;
  videoLoop: boolean;
  videoSom: string;
  textoBotao: string;
  textoBotaoSecundario: string;
  linkBotao: string;
  linkBotaoSecundario: string;
  exibirBotao: boolean;
  layoutDesktopTextoImagem: string;
  layoutMobileTextoImagem: string;
  fonteProdutos: string;
  categoriaProdutoId: string;
  categoriaProdutoSlug: string;
  categoriaProdutoNome: string;
  categoriasProdutosIds: string[];
  categoriasProdutosSlugs: string[];
  categoriasProdutosNomes: string[];
  produtosSelecionadosIds: string[];
  limiteProdutos: number;
  layoutDesktopProdutos: string;
  layoutMobileProdutos: string;
  colunasDesktopProdutos: number;
  colunasTabletProdutos: number;
  colunasMobileProdutos: number;
  exibirPrecoProdutos: boolean;
  exibirSeloDescontoProdutos: boolean;
  layoutDesktopCards: string;
  layoutMobileCards: string;
  layoutDesktopCta: string;
  layoutMobileCta: string;
  alinhamentoCta: string;
  larguraConteudoCta: string;
  colunasDesktopCards: number;
  colunasTabletCards: number;
  colunasMobileCards: number;
  alinhamentoCards: string;
  cardsDestaques: DestaqueCardEditando[];
  exibirMidia: boolean;
  mediaCropDesktopX: number;
  mediaCropDesktopY: number;
  mediaCropMobileX: number;
  mediaCropMobileY: number;
  mediaPositionDesktop: string;
  mediaPositionMobile: string;
  corFundo: string;
  espacamento: string;
  alinhamentoConteudo: string;
  alturaBanner: string;
  overlayBanner: string;
  corTextoBanner: string;
  tipoMidia: string;
  exibirTexto: boolean;
  exibirSubtitulo: boolean;
  exibirBotaoPrimario: boolean;
  exibirBotaoSecundario: boolean;
  tituloStyle: TextStyleConfig;
  subtituloStyle: TextStyleConfig;
  botaoPrimarioStyle: TextStyleConfig;
  botaoSecundarioStyle: TextStyleConfig;
  textoStyle: TextStyleConfig;
  botaoStyle: TextStyleConfig;
  nomeProdutoStyle: TextStyleConfig;
  precoProdutoStyle: TextStyleConfig;
  tituloSecaoStyle: TextStyleConfig;
  subtituloSecaoStyle: TextStyleConfig;
  cardTituloStyle: TextStyleConfig;
  cardTextoStyle: TextStyleConfig;
  cardBotaoStyle: TextStyleConfig;
} | null;

type MediaKind = "IMAGEM" | "VIDEO";

const COR_FUNDO_PRESETS = [
  { value: "BRANCO", label: "Branco" },
  { value: "CINZA", label: "Cinza claro" },
  { value: "MARCA", label: "Azul marca" },
  { value: "ESCURO", label: "Escuro" },
];

const ESPACAMENTO_PRESETS = [
  { value: "COMPACTO", label: "Compacto" },
  { value: "PADRAO", label: "Padrão" },
  { value: "AMPLO", label: "Amplo" },
];

const TEXT_FONT_SIZE_PRESETS = [
  { value: "PEQUENO", label: "Pequeno" },
  { value: "MEDIO", label: "Médio" },
  { value: "GRANDE", label: "Grande" },
  { value: "EXTRA_GRANDE", label: "Extra grande" },
];

const TEXT_FONT_WEIGHT_PRESETS = [
  { value: "LIGHT", label: "Light" },
  { value: "REGULAR", label: "Regular" },
  { value: "MEDIUM", label: "Medium" },
  { value: "SEMIBOLD", label: "Semibold" },
  { value: "BOLD", label: "Bold" },
];

const TEXT_COLOR_PRESETS = [
  { value: "PADRAO", label: "Padrão" },
  { value: "CLARO", label: "Claro" },
  { value: "ESCURO", label: "Escuro" },
  { value: "DOURADO", label: "Dourado" },
  { value: "PERSONALIZADO", label: "Personalizado" },
];

const TEXT_LETTER_SPACING_PRESETS = [
  { value: "NORMAL", label: "Normal" },
  { value: "LEVE", label: "Leve" },
  { value: "MEDIO", label: "Médio" },
  { value: "ALTO", label: "Alto" },
];

const TEXT_TRANSFORM_PRESETS = [
  { value: "NORMAL", label: "Normal" },
  { value: "UPPERCASE", label: "Uppercase" },
  { value: "CAPITALIZE", label: "Capitalize" },
];

const TEXT_ALIGN_PRESETS = [
  { value: "ESQUERDA", label: "Esquerda" },
  { value: "CENTRO", label: "Centro" },
  { value: "DIREITA", label: "Direita" },
];

const ALINHAMENTO_BANNER_PRESETS = [
  { value: "ESQUERDA", label: "Esquerda" },
  { value: "CENTRO", label: "Centro" },
  { value: "DIREITA", label: "Direita" },
];

const ALTURA_BANNER_PRESETS = [
  { value: "COMPACTA", label: "Compacta" },
  { value: "PADRAO", label: "Padrão" },
  { value: "TELA_CHEIA", label: "Tela cheia" },
];

const OVERLAY_BANNER_PRESETS = [
  { value: "NENHUM", label: "Nenhum" },
  { value: "LEVE", label: "Leve" },
  { value: "MEDIO", label: "Médio" },
];

const COR_TEXTO_BANNER_PRESETS = [
  { value: "CLARO", label: "Claro" },
  { value: "ESCURO", label: "Escuro" },
];

const TIPO_MIDIA_BANNER_PRESETS = [
  { value: "IMAGEM", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
];

const VIDEO_SOM_PRESETS = [
  { value: "MUDO", label: "Mudo" },
  { value: "COM_SOM", label: "Com som" },
];

const LAYOUT_DESKTOP_TEXTO_IMAGEM_PRESETS = [
  { value: "IMAGEM_ESQUERDA", label: "Imagem esquerda" },
  { value: "IMAGEM_DIREITA", label: "Imagem direita" },
  { value: "TEXTO_SOBRE_IMAGEM", label: "Texto sobre imagem" },
  { value: "IMAGEM_ACIMA", label: "Imagem acima" },
];

const LAYOUT_MOBILE_TEXTO_IMAGEM_PRESETS = [
  { value: "IMAGEM_ACIMA", label: "Imagem acima" },
  { value: "TEXTO_ACIMA", label: "Texto acima" },
  { value: "TEXTO_SOBRE_IMAGEM", label: "Texto sobre imagem" },
];

const FONTE_PRODUTOS_PRESETS = [
  { value: "TODOS", label: "Todos" },
  { value: "DESCONTOS", label: "Descontos" },
  { value: "NOVOS", label: "Novos" },
  { value: "MAIS_VENDIDOS", label: "Mais vendidos" },
  { value: "CATEGORIA", label: "Categoria" },
  { value: "CATEGORIAS_SELECIONADAS", label: "Categorias selecionadas" },
  { value: "MANUAL", label: "Manual" },
];

const LAYOUT_PRODUTOS_PRESETS = [
  { value: "GRID", label: "Grid" },
  { value: "CARROSSEL", label: "Carrossel" },
];

const ALINHAMENTO_CARDS_PRESETS = [
  { value: "ESQUERDA", label: "Esquerda" },
  { value: "CENTRO", label: "Centro" },
];

const TIPO_MIDIA_CARD_PRESETS = [
  { value: "IMAGEM", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "ICONE", label: "Ícone" },
  { value: "NENHUMA", label: "Nenhuma" },
];

const LAYOUT_CTA_PRESETS = [
  { value: "TEXTO_CENTRALIZADO", label: "Texto centralizado" },
  { value: "TEXTO_MIDIA", label: "Texto + mídia" },
  { value: "MIDIA_TEXTO", label: "Mídia + texto" },
  { value: "SOBRE_MIDIA", label: "Texto sobre mídia" },
];

const LARGURA_CONTEUDO_CTA_PRESETS = [
  { value: "ESTREITA", label: "Estreita" },
  { value: "MEDIA", label: "Média" },
  { value: "LARGA", label: "Larga" },
];

const MEDIA_POSITION_PRESETS = [
  { value: "center center", label: "Centro" },
  { value: "top center", label: "Topo centro" },
  { value: "bottom center", label: "Base centro" },
  { value: "center left", label: "Centro esquerda" },
  { value: "center right", label: "Centro direita" },
  { value: "top left", label: "Topo esquerda" },
  { value: "top right", label: "Topo direita" },
  { value: "bottom left", label: "Base esquerda" },
  { value: "bottom right", label: "Base direita" },
];

const MAX_IMAGEM_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPT_IMAGEM_UPLOAD = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const ACCEPT_VIDEO_UPLOAD = ".mp4,.webm,video/mp4,video/webm";

const TIPOS_BLOCO_ADICIONAR: {
  tipo: TipoBlocoAdicionar;
  nome: string;
  descricao: string;
  tituloInicial: string;
  icon: LucideIcon;
}[] = [
  {
    tipo: "BANNER",
    nome: "Banner",
    descricao: "Imagem de destaque com título, texto de apoio e botão.",
    tituloInicial: "Novo banner",
    icon: ImageIcon,
  },
  {
    tipo: "TEXTO_IMAGEM",
    nome: "Texto + imagem",
    descricao: "Bloco editorial com imagem, texto e chamada para ação.",
    tituloInicial: "Texto + imagem",
    icon: ImageIcon,
  },
  {
    tipo: "LISTA_PRODUTOS",
    nome: "Lista de produtos",
    descricao: "Vitrine visual para organizar produtos em grade simulada.",
    tituloInicial: "Lista de produtos",
    icon: Layers,
  },
  {
    tipo: "DESTAQUES_CARDS",
    nome: "Destaques / cards",
    descricao: "Cards manuais para benefícios, coleções e chamadas da loja.",
    tituloInicial: "Destaques / cards",
    icon: LayoutGrid,
  },
  {
    tipo: "CTA_SIMPLES",
    nome: "CTA simples",
    descricao: "Chamada editorial com texto, mídia opcional e até dois botões.",
    tituloInicial: "Chamada para ação",
    icon: MousePointer2,
  },
  {
    tipo: "CATEGORIAS",
    nome: "Categorias",
    descricao: "Grade visual para destacar categorias da loja.",
    tituloInicial: "Categorias",
    icon: LayoutGrid,
  },
  {
    tipo: "FAQ",
    nome: "FAQ",
    descricao: "Perguntas frequentes em lista simples nesta etapa.",
    tituloInicial: "FAQ",
    icon: HelpCircle,
  },
  {
    tipo: "FORMULARIO",
    nome: "Formulário",
    descricao: "Bloco para captação de contato ou interesse.",
    tituloInicial: "Formulário",
    icon: ClipboardList,
  },
  {
    tipo: "TEXTO",
    nome: "Texto",
    descricao: "Título e conteúdo textual básico.",
    tituloInicial: "Texto",
    icon: Type,
  },
  {
    tipo: "ESPACADOR",
    nome: "Espaçador",
    descricao: "Área de respiro entre seções da página.",
    tituloInicial: "Espaçador",
    icon: Rows3,
  },
];

function getConfigObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getStringConfig(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function hasConfigKey(config: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(config, key);
}

function getStringConfigWithDefault(
  config: Record<string, unknown>,
  keys: string[],
  fallback: string
) {
  for (const key of keys) {
    if (hasConfigKey(config, key)) {
      return getStringConfig(config, key);
    }
  }

  return fallback;
}

function getBooleanConfig(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean
) {
  const value = config[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
}

function getNumberConfig(
  config: Record<string, unknown>,
  key: string,
  fallback: number
) {
  const value = config[key];
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getArrayConfig(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getStringArrayConfig(config: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = getArrayConfig(config, key);

    if (value.length > 0) return value;
  }

  return [];
}

function getCategoriaResumo(
  categoriaId: string,
  categorias: EditorVisualCategoria[]
) {
  return categorias.find((categoria) => categoria.id === categoriaId) || null;
}

function getProdutoResumo(produtoId: string, produtos: EditorVisualProduto[]) {
  return produtos.find((produto) => produto.id === produtoId) || null;
}

function getTextStyleDefaults(kind: string): TextStyleConfig {
  if (kind.includes("botao") || kind.includes("Botao")) {
    return {
      fontSizePreset: "PEQUENO",
      fontWeight: "SEMIBOLD",
      colorPreset: "PADRAO",
      colorCustom: "",
      letterSpacing: "NORMAL",
      textTransform: "NORMAL",
      textAlign: "CENTRO",
    };
  }

  if (kind.includes("subtitulo") || kind.includes("texto") || kind.includes("Texto")) {
    return {
      fontSizePreset: "MEDIO",
      fontWeight: "REGULAR",
      colorPreset: "PADRAO",
      colorCustom: "",
      letterSpacing: "NORMAL",
      textTransform: "NORMAL",
      textAlign: "ESQUERDA",
    };
  }

  return {
    fontSizePreset: "GRANDE",
    fontWeight: "LIGHT",
    colorPreset: "PADRAO",
    colorCustom: "",
    letterSpacing: "NORMAL",
    textTransform: "NORMAL",
    textAlign: "ESQUERDA",
  };
}

function normalizeTextStyle(
  value: unknown,
  defaults: TextStyleConfig
): TextStyleConfig {
  const style = getConfigObject(value);
  const fontSizePreset = getStringConfig(style, "fontSizePreset");
  const fontWeight = getStringConfig(style, "fontWeight");
  const colorPreset = getStringConfig(style, "colorPreset");
  const letterSpacing = getStringConfig(style, "letterSpacing");
  const textTransform = getStringConfig(style, "textTransform");
  const textAlign = getStringConfig(style, "textAlign");

  return {
    fontSizePreset: TEXT_FONT_SIZE_PRESETS.some(
      (preset) => preset.value === fontSizePreset
    )
      ? fontSizePreset
      : defaults.fontSizePreset,
    fontWeight: TEXT_FONT_WEIGHT_PRESETS.some(
      (preset) => preset.value === fontWeight
    )
      ? fontWeight
      : defaults.fontWeight,
    colorPreset: TEXT_COLOR_PRESETS.some((preset) => preset.value === colorPreset)
      ? colorPreset
      : defaults.colorPreset,
    colorCustom: getStringConfig(style, "colorCustom") || defaults.colorCustom,
    letterSpacing: TEXT_LETTER_SPACING_PRESETS.some(
      (preset) => preset.value === letterSpacing
    )
      ? letterSpacing
      : defaults.letterSpacing,
    textTransform: TEXT_TRANSFORM_PRESETS.some(
      (preset) => preset.value === textTransform
    )
      ? textTransform
      : defaults.textTransform,
    textAlign: TEXT_ALIGN_PRESETS.some((preset) => preset.value === textAlign)
      ? textAlign
      : defaults.textAlign,
  };
}

function getTextStyleConfig(config: Record<string, unknown>, key: string) {
  return normalizeTextStyle(config[key], getTextStyleDefaults(key));
}

function getRichTextConfig(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const richText = value as RichTextValue;

    return isRichTextEmpty(richText) ? null : richText;
  }

  return null;
}

function getRichTextFallback(text: string): RichTextValue {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text
          ? [
              {
                type: "text",
                text,
              },
            ]
          : [],
      },
    ],
  };
}

function extractRichTextPlainText(value: RichTextValue): string {
  if (typeof value.text === "string") {
    return value.text;
  }

  if (Array.isArray(value.content)) {
    return value.content.map((item) => extractRichTextPlainText(item)).join("\n");
  }

  return "";
}

function isRichTextEmpty(value: RichTextValue | null | undefined) {
  if (!value) return true;

  return extractRichTextPlainText(value).trim().length === 0;
}

function getEditableRichTextContent(
  value: RichTextValue | null,
  fallbackText: string
) {
  if (!isRichTextEmpty(value)) return value as RichTextValue;

  const normalizedFallback = fallbackText.trim();

  return getRichTextFallback(normalizedFallback);
}

function resolveTextStyle(style: TextStyleConfig): CSSProperties {
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
  const textAlignMap: Record<string, CSSProperties["textAlign"]> = {
    ESQUERDA: "left",
    CENTRO: "center",
    DIREITA: "right",
  };

  return {
    fontSize: fontSizeMap[style.fontSizePreset] || fontSizeMap.MEDIO,
    fontWeight: fontWeightMap[style.fontWeight] || fontWeightMap.REGULAR,
    color:
      style.colorPreset === "PERSONALIZADO" && style.colorCustom
        ? style.colorCustom
        : colorMap[style.colorPreset],
    letterSpacing:
      letterSpacingMap[style.letterSpacing] || letterSpacingMap.NORMAL,
    textTransform:
      style.textTransform === "NORMAL"
        ? "none"
        : style.textTransform === "UPPERCASE"
          ? "uppercase"
          : "capitalize",
    textAlign: textAlignMap[style.textAlign] || "left",
  };
}

const RichTextTypography = Extension.create({
  name: "richTextTypography",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize
                ? { style: `font-size: ${attributes.fontSize}` }
                : {},
          },
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight || null,
            renderHTML: (attributes) =>
              attributes.fontWeight
                ? { style: `font-weight: ${attributes.fontWeight}` }
                : {},
          },
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) =>
              attributes.letterSpacing
                ? { style: `letter-spacing: ${attributes.letterSpacing}` }
                : {},
          },
        },
      },
    ];
  },
});

function getTipoLabel(tipo: string) {
  if (tipo === "HERO") return "Banner / Hero";
  if (tipo === "BANNER") return "Banner";
  if (tipo === "CTA_SIMPLES") return "CTA simples";
  if (tipo === "CTA") return "CTA";
  if (tipo === "TEXTO_IMAGEM") return "Texto + imagem";
  if (tipo === "PRODUTOS") return "Produtos";
  if (tipo === "LISTA_PRODUTOS") return "Lista de produtos";
  if (tipo === "DESTAQUES_CARDS") return "Destaques / cards";
  if (tipo === "CATEGORIAS") return "Categorias";
  if (tipo === "FAQ") return "FAQ";
  if (tipo === "FORMULARIO") return "Formulário";
  if (tipo === "TEXTO") return "Texto";
  if (tipo === "IMAGEM") return "Imagem";
  if (tipo === "ESPACADOR") return "Espaçador";

  return tipo.replaceAll("_", " ");
}

function getBlocoIcon(tipo: string) {
  if (tipo === "CTA" || tipo === "CTA_SIMPLES") {
    return MousePointer2;
  }

  if (tipo.includes("IMAGEM") || tipo === "HERO" || tipo === "BANNER") {
    return ImageIcon;
  }

  if (tipo.includes("PRODUTO") || tipo.includes("CATEGORIA")) {
    return LayoutGrid;
  }

  if (tipo.includes("TEXTO") || tipo === "FAQ") {
    return Type;
  }

  return LayoutGrid;
}

function isBannerTipo(tipo: string) {
  return tipo === "BANNER" || tipo === "HERO";
}

function isTextoImagemTipo(tipo: string) {
  return tipo === "TEXTO_IMAGEM" || tipo === "IMAGEM_TEXTO";
}

function isListaProdutosTipo(tipo: string) {
  return tipo === "LISTA_PRODUTOS";
}

function isDestaquesCardsTipo(tipo: string) {
  return tipo === "DESTAQUES_CARDS";
}

function isCtaTipo(tipo: string) {
  return tipo === "CTA" || tipo === "CTA_SIMPLES";
}

function normalizarLayoutCta(value: string) {
  if (
    ["TEXTO_CENTRALIZADO", "TEXTO_MIDIA", "MIDIA_TEXTO", "SOBRE_MIDIA"].includes(
      value
    )
  ) {
    return value;
  }

  return "TEXTO_CENTRALIZADO";
}

function normalizarAlinhamentoCta(value: string) {
  if (["ESQUERDA", "CENTRO", "DIREITA"].includes(value)) return value;

  return "CENTRO";
}

function normalizarLarguraConteudoCta(value: string) {
  if (["ESTREITA", "MEDIA", "LARGA"].includes(value)) return value;

  return "MEDIA";
}

function normalizarLayoutCards(value: string) {
  if (value === "CARROSSEL") return "CARROSSEL";
  return "GRID";
}

function normalizarAlinhamentoCards(value: string) {
  if (value === "ESQUERDA") return "ESQUERDA";
  return "CENTRO";
}

function normalizarTipoMidiaCard(value: string) {
  if (["IMAGEM", "VIDEO", "ICONE", "NENHUMA"].includes(value)) {
    return value;
  }

  return "ICONE";
}

function normalizarLayoutDesktopTextoImagem(value: string) {
  if (value === "DIREITA") return "IMAGEM_DIREITA";
  if (value === "ESQUERDA") return "IMAGEM_ESQUERDA";

  if (
    ["IMAGEM_ESQUERDA", "IMAGEM_DIREITA", "TEXTO_SOBRE_IMAGEM", "IMAGEM_ACIMA"].includes(
      value
    )
  ) {
    return value;
  }

  return "IMAGEM_ESQUERDA";
}

function normalizarLayoutMobileTextoImagem(value: string) {
  if (["IMAGEM_ACIMA", "TEXTO_ACIMA", "TEXTO_SOBRE_IMAGEM"].includes(value)) {
    return value;
  }

  return "IMAGEM_ACIMA";
}

function normalizarMediaPosition(value: string) {
  if (MEDIA_POSITION_PRESETS.some((preset) => preset.value === value)) {
    return value;
  }

  return "center center";
}

function getMediaCropFromPosition(position: string) {
  const [vertical = "center", horizontal = "center"] = position.split(" ");

  const x = horizontal === "left" ? 0 : horizontal === "right" ? 100 : 50;
  const y = vertical === "top" ? 0 : vertical === "bottom" ? 100 : 50;

  return { x, y };
}

function criarCardDestaquePadrao(index: number): DestaqueCardEditando {
  return {
    id: `card-${Date.now()}-${index}`,
    titulo: `Destaque ${index}`,
    texto: "Texto de apoio do card.",
    tituloRichText: null,
    textoRichText: null,
    exibirMidia: true,
    tipoMidia: "ICONE",
    imagemDesktopUrl: "",
    imagemMobileUrl: "",
    videoDesktopUrl: "",
    videoMobileUrl: "",
    icone: "★",
    mediaPositionDesktop: "center center",
    mediaPositionMobile: "center center",
    mediaCropDesktopX: 50,
    mediaCropDesktopY: 50,
    mediaCropMobileX: 50,
    mediaCropMobileY: 50,
    exibirBotao: false,
    textoBotao: "Saiba mais",
    linkBotao: "",
  };
}

function criarCardDestaquePreviewPadrao(index: number): DestaqueCardEditando {
  return {
    ...criarCardDestaquePadrao(index),
    id: `preview-card-${index}`,
  };
}

function getCardsDestaquesConfig(
  config: Record<string, unknown>
): DestaqueCardEditando[] {
  const value = config.cards;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const card = getConfigObject(item);
    const mediaPositionDesktop = normalizarMediaPosition(
      getStringConfig(card, "mediaPositionDesktop")
    );
    const mediaPositionMobile = normalizarMediaPosition(
      getStringConfig(card, "mediaPositionMobile")
    );
    const desktopCrop = getMediaCropFromPosition(mediaPositionDesktop);
    const mobileCrop = getMediaCropFromPosition(mediaPositionMobile);
    const imagemUrl =
      getStringConfig(card, "imagemDesktopUrl") ||
      getStringConfig(card, "imagemUrl") ||
      getStringConfig(card, "imagem");

    return {
      id: getStringConfig(card, "id") || `card-${index + 1}`,
      titulo: getStringConfig(card, "titulo") || `Destaque ${index + 1}`,
      texto: getStringConfig(card, "texto") || getStringConfig(card, "descricao"),
      tituloRichText: getRichTextConfig(card, "tituloRichText"),
      textoRichText: getRichTextConfig(card, "textoRichText"),
      exibirMidia: getBooleanConfig(card, "exibirMidia", true),
      tipoMidia: normalizarTipoMidiaCard(getStringConfig(card, "tipoMidia")),
      imagemDesktopUrl: imagemUrl,
      imagemMobileUrl:
        getStringConfig(card, "imagemMobileUrl") ||
        getStringConfig(card, "imagemMobile"),
      videoDesktopUrl: getStringConfig(card, "videoDesktopUrl"),
      videoMobileUrl: getStringConfig(card, "videoMobileUrl"),
      icone: getStringConfig(card, "icone") || "★",
      mediaPositionDesktop,
      mediaPositionMobile,
      mediaCropDesktopX: getNumberConfig(
        card,
        "mediaCropDesktopX",
        desktopCrop.x
      ),
      mediaCropDesktopY: getNumberConfig(
        card,
        "mediaCropDesktopY",
        desktopCrop.y
      ),
      mediaCropMobileX: getNumberConfig(card, "mediaCropMobileX", mobileCrop.x),
      mediaCropMobileY: getNumberConfig(card, "mediaCropMobileY", mobileCrop.y),
      exibirBotao: getBooleanConfig(card, "exibirBotao", false),
      textoBotao: getStringConfig(card, "textoBotao") || "Saiba mais",
      linkBotao: getStringConfig(card, "linkBotao"),
    };
  });
}

function getFrameClass(device: DevicePreview) {
  if (device === "MOBILE") {
    return "mx-auto max-w-[390px]";
  }

  if (device === "TABLET") {
    return "mx-auto max-w-[820px]";
  }

  return "mx-auto max-w-full";
}

function getFrameLabel(device: DevicePreview) {
  if (device === "MOBILE") return "Mobile";
  if (device === "TABLET") return "Tablet";
  return "Desktop";
}

function getDeviceDescription(device: DevicePreview) {
  if (device === "MOBILE") {
    return "Ajustes mobile serão separados nas próximas etapas. Por enquanto, estes campos continuam salvando o conteúdo base do bloco.";
  }

  if (device === "TABLET") {
    return "Ajustes tablet serão separados nas próximas etapas. Por enquanto, estes campos continuam salvando o conteúdo base do bloco.";
  }

  return "Ajustes gerais e desktop. As alterações abaixo atualizam o conteúdo base usado no preview.";
}

function getBgClass(corFundo: string) {
  if (corFundo === "CINZA") return "bg-slate-50";
  if (corFundo === "MARCA") return "bg-[var(--brand-blue-soft)]";
  if (corFundo === "ESCURO") return "bg-slate-950 text-white";

  return "bg-white";
}

function getPaddingClass(espacamento: string) {
  if (espacamento === "COMPACTO") return "px-6 py-6";
  if (espacamento === "AMPLO") return "px-6 py-16";

  return "px-6 py-10";
}

function getBannerHeightClass(altura: string, isMobile: boolean) {
  if (altura === "COMPACTA") {
    return isMobile ? "h-[360px]" : "h-[320px]";
  }

  if (altura === "TELA_CHEIA") {
    return isMobile ? "h-[640px]" : "h-[720px]";
  }

  return isMobile ? "h-[520px]" : "h-[420px]";
}

function getBannerAlignmentClass(alinhamento: string, isMobile: boolean) {
  if (alinhamento === "CENTRO") {
    return "justify-center px-6 text-center";
  }

  if (alinhamento === "DIREITA") {
    return isMobile
      ? "justify-center px-6 text-center"
      : "justify-end px-12 text-right";
  }

  return isMobile ? "justify-center px-6 text-center" : "justify-start px-12";
}

function getBannerOverlayClass(overlay: string) {
  if (overlay === "MEDIO") return "bg-black/45";
  if (overlay === "LEVE") return "bg-black/20";

  return "bg-transparent";
}

function getBannerTextClasses(corTexto: string) {
  if (corTexto === "ESCURO") {
    return {
      eyebrow: "text-slate-700",
      title: "text-slate-950",
      text: "text-slate-700",
      button: "bg-slate-950 text-white",
    };
  }

  return {
    eyebrow: "text-white/70",
    title: "text-white",
    text: "text-white/80",
    button: "bg-white text-slate-950",
  };
}

function getCtaAlignmentClass(alinhamento: string) {
  if (alinhamento === "ESQUERDA") return "items-start text-left";
  if (alinhamento === "DIREITA") return "items-end text-right";

  return "items-center text-center";
}

function getCtaContentWidthClass(largura: string) {
  if (largura === "ESTREITA") return "max-w-2xl";
  if (largura === "LARGA") return "max-w-5xl";

  return "max-w-3xl";
}

function getCtaDesktopGridClass(layout: string, hasMedia: boolean) {
  if (!hasMedia || layout === "TEXTO_CENTRALIZADO" || layout === "SOBRE_MIDIA") {
    return "grid-cols-1";
  }

  return "grid-cols-2";
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function ordenarBlocos(items: EditorVisualBloco[]) {
  return [...items].sort((a, b) => {
    if (a.ordem !== b.ordem) {
      return a.ordem - b.ordem;
    }

    return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
  });
}

function PainelSecao({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>

      <div className="mt-3">{children}</div>
    </section>
  );
}

function SecaoRecolhivel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        {title}
      </summary>

      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}

      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function formatarTamanhoMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function validarArquivoMidia(file: File, tipoMidia: MediaKind) {
  if (tipoMidia === "IMAGEM") {
    const tiposValidos = ["image/jpeg", "image/png", "image/webp"];

    if (!tiposValidos.includes(file.type)) {
      return "Use uma imagem JPG, PNG ou WebP.";
    }

    if (file.size > MAX_IMAGEM_UPLOAD_BYTES) {
      return "A imagem deve ter no máximo 4 MB.";
    }

    return "";
  }

  const tiposValidos = ["video/mp4", "video/webm"];

  if (!tiposValidos.includes(file.type)) {
    return "Use um vídeo MP4 ou WebM. Recomendado: MP4/H.264.";
  }

  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return "O vídeo deve ter no máximo 15 MB.";
  }

  return "";
}

function CampoToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>

        {description && (
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

function UploadMidiaCampo({
  label,
  value,
  tipoMidia,
  onChange,
  orientacao,
}: {
  label: string;
  value: string;
  tipoMidia: MediaKind;
  onChange: (url: string) => void;
  orientacao: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);

  const accept =
    tipoMidia === "IMAGEM" ? ACCEPT_IMAGEM_UPLOAD : ACCEPT_VIDEO_UPLOAD;

  async function enviarArquivo(file: File | null) {
    setErro("");

    if (!file) return;

    const erroValidacao = validarArquivoMidia(file, tipoMidia);

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      formData.append("tipoMidia", tipoMidia);

      const response = await fetch("/api/configuracoes/loja/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || data.erro || "Erro ao enviar arquivo.");
        return;
      }

      if (typeof data.url !== "string" || !data.url) {
        setErro("Upload concluído, mas a URL do arquivo não foi retornada.");
        return;
      }

      onChange(data.url);
    } catch {
      setErro("Erro ao enviar arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void enviarArquivo(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
    void enviarArquivo(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{orientacao}</p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
        className={`rounded-2xl border border-dashed p-4 transition ${
          arrastando
            ? "border-indigo-300 bg-indigo-50"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        {value ? (
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {tipoMidia === "VIDEO" ? (
              <video src={value} className="h-36 w-full object-cover" controls />
            ) : (
              <img src={value} alt={label} className="h-36 w-full object-cover" />
            )}
          </div>
        ) : (
          <div className="mb-3 flex h-28 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 ring-1 ring-slate-200">
            Arraste um arquivo aqui
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {enviando ? "Enviando..." : "Selecionar arquivo"}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onInputChange}
            disabled={enviando}
            className="hidden"
          />

          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Cole ou digite uma URL"
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          />

          <p className="text-xs leading-5 text-slate-500">
            {tipoMidia === "VIDEO"
              ? `MP4/H.264 recomendado. Limite: ${formatarTamanhoMb(
                  MAX_VIDEO_UPLOAD_BYTES
                )}.`
              : `JPG, PNG ou WebP. Limite: ${formatarTamanhoMb(
                  MAX_IMAGEM_UPLOAD_BYTES
                )}.`}
          </p>
        </div>

        {erro && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaPreview({
  tipoMidia,
  imageUrl,
  videoUrl,
  posterUrl,
  alt,
  objectPosition,
  videoLoop = true,
  videoMuted = true,
  placeholder = "Sem mídia",
}: {
  tipoMidia: string;
  imageUrl: string;
  videoUrl: string;
  posterUrl?: string;
  alt: string;
  objectPosition: string;
  videoLoop?: boolean;
  videoMuted?: boolean;
  placeholder?: string;
}) {
  if (tipoMidia === "VIDEO" && videoUrl) {
    return (
      <video
        src={videoUrl}
        poster={posterUrl || undefined}
        autoPlay
        loop={videoLoop}
        muted={videoMuted}
        playsInline
        className="block h-full w-full object-cover"
        style={{ objectPosition }}
      />
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className="block h-full w-full object-cover"
        style={{ objectPosition }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-[260px] w-full items-center justify-center bg-slate-200 text-sm font-medium text-slate-500">
      {placeholder}
    </div>
  );
}

function CardMediaPreview({
  card,
  device,
}: {
  card: DestaqueCardEditando;
  device: DevicePreview;
}) {
  if (!card.exibirMidia || card.tipoMidia === "NENHUMA") {
    return null;
  }

  if (card.tipoMidia === "ICONE") {
    return (
      <div className="flex h-full min-h-[150px] w-full items-center justify-center bg-slate-100 text-4xl font-semibold text-slate-700">
        {card.icone || "★"}
      </div>
    );
  }

  const isMobile = device === "MOBILE";
  const imageUrl =
    isMobile && card.imagemMobileUrl
      ? card.imagemMobileUrl
      : card.imagemDesktopUrl;
  const videoUrl =
    isMobile && card.videoMobileUrl ? card.videoMobileUrl : card.videoDesktopUrl;
  const objectPosition = isMobile
    ? card.mediaPositionMobile
    : card.mediaPositionDesktop;

  return (
    <MediaPreview
      tipoMidia={card.tipoMidia}
      imageUrl={imageUrl}
      videoUrl={videoUrl}
      alt={card.titulo}
      objectPosition={objectPosition}
      videoLoop
      videoMuted
      placeholder="Sem mídia"
    />
  );
}

function CropPositionControls({
  desktopValue,
  mobileValue,
  onChange,
}: {
  desktopValue: string;
  mobileValue: string;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  function updatePosition(device: "DESKTOP" | "MOBILE", value: string) {
    const crop = getMediaCropFromPosition(value);

    if (device === "DESKTOP") {
      onChange({
        mediaPositionDesktop: value,
        mediaCropDesktopX: crop.x,
        mediaCropDesktopY: crop.y,
      });
      return;
    }

    onChange({
      mediaPositionMobile: value,
      mediaCropMobileX: crop.x,
      mediaCropMobileY: crop.y,
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Crop/posição desktop
        </span>

        <select
          value={desktopValue}
          onChange={(event) => updatePosition("DESKTOP", event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
        >
          {MEDIA_POSITION_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Crop/posição mobile
        </span>

        <select
          value={mobileValue}
          onChange={(event) => updatePosition("MOBILE", event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
        >
          {MEDIA_POSITION_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PreviewShell({
  children,
  device,
}: {
  children: ReactNode;
  device: DevicePreview;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-100 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {device === "DESKTOP" && <Monitor className="h-4 w-4" />}
          {device === "TABLET" && <Tablet className="h-4 w-4" />}
          {device === "MOBILE" && <Smartphone className="h-4 w-4" />}
          Preview {getFrameLabel(device)}
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
          Renderização simulada
        </span>
      </div>

      <div
        className={`loja-publica stella-storefront-render overflow-hidden bg-white text-slate-900 antialiased shadow-sm ring-1 ring-slate-200 ${getFrameClass(
          device
        )}`}
      >
        {children}
      </div>
    </div>
  );
}

function RichTextBubbleToolbar({ editor }: { editor: Editor }) {
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  function keepSelection(event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function rememberSelection() {
    const { from, to } = editor.state.selection;
    selectionRef.current = { from, to };
  }

  function applyWithSelection(callback: () => void) {
    const selection = selectionRef.current;

    if (selection) {
      editor.commands.setTextSelection(selection);
    }

    callback();
  }

  function setLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link", previousUrl || "");

    if (url === null) return;

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <BubbleMenu
      editor={editor}
      appendTo={() => document.body}
      updateDelay={80}
      resizeDelay={40}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 10,
        flip: {
          padding: 12,
          fallbackPlacements: ["bottom", "top-start", "top-end", "bottom-start", "bottom-end"],
        },
        shift: {
          padding: 12,
        },
        inline: true,
      }}
      className="z-[9999] flex max-w-[min(92vw,720px)] flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded-xl px-2 py-1 font-bold ${
          editor.isActive("bold") ? "bg-slate-950 text-white" : "bg-slate-100"
        }`}
      >
        B
      </button>
      <button
        type="button"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`rounded-xl px-2 py-1 italic ${
          editor.isActive("italic") ? "bg-slate-950 text-white" : "bg-slate-100"
        }`}
      >
        I
      </button>
      <button
        type="button"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`rounded-xl px-2 py-1 underline ${
          editor.isActive("underline")
            ? "bg-slate-950 text-white"
            : "bg-slate-100"
        }`}
      >
        U
      </button>

      <select
        aria-label="Fonte"
        className="h-7 rounded-xl border border-slate-200 bg-white px-2"
        onMouseDown={(event) => {
          event.stopPropagation();
          rememberSelection();
        }}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const fontFamily = getRichTextPresetCss(
            RICH_TEXT_FONT_PRESETS,
            event.target.value
          );

          if (!fontFamily || event.target.value === "PADRAO") {
            applyWithSelection(() => editor.chain().focus().unsetFontFamily().run());
            return;
          }

          applyWithSelection(() =>
            editor.chain().focus().setFontFamily(fontFamily).run()
          );
        }}
        defaultValue="PADRAO"
      >
        {RICH_TEXT_FONT_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Tamanho"
        className="h-7 rounded-xl border border-slate-200 bg-white px-2"
        onMouseDown={(event) => {
          event.stopPropagation();
          rememberSelection();
        }}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const fontSize = getRichTextPresetCss(
            RICH_TEXT_SIZE_PRESETS,
            event.target.value
          );
          applyWithSelection(() =>
            editor.chain().focus().setMark("textStyle", { fontSize }).run()
          );
        }}
        defaultValue="M"
      >
        {RICH_TEXT_SIZE_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Peso"
        className="h-7 rounded-xl border border-slate-200 bg-white px-2"
        onMouseDown={(event) => {
          event.stopPropagation();
          rememberSelection();
        }}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const fontWeight = getRichTextPresetCss(
            RICH_TEXT_WEIGHT_PRESETS,
            event.target.value
          );
          applyWithSelection(() =>
            editor.chain().focus().setMark("textStyle", { fontWeight }).run()
          );
        }}
        defaultValue="REGULAR"
      >
        {RICH_TEXT_WEIGHT_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Cor"
        className="h-7 rounded-xl border border-slate-200 bg-white px-2"
        onMouseDown={(event) => {
          event.stopPropagation();
          rememberSelection();
        }}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const color = getRichTextPresetCss(
            RICH_TEXT_COLOR_PRESETS,
            event.target.value
          );

          if (!color || event.target.value === "PADRAO") {
            applyWithSelection(() => editor.chain().focus().unsetColor().run());
            return;
          }

          applyWithSelection(() => editor.chain().focus().setColor(color).run());
        }}
        defaultValue="PADRAO"
      >
        {RICH_TEXT_COLOR_PRESETS.filter(
          (preset) => preset.value !== "PERSONALIZADO"
        ).map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      <input
        type="color"
        aria-label="Cor personalizada"
        className="h-7 w-8 rounded border border-slate-200 bg-white"
        onMouseDown={(event) => {
          event.stopPropagation();
          rememberSelection();
        }}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) =>
          applyWithSelection(() =>
            editor.chain().focus().setColor(event.target.value).run()
          )
        }
      />

      <select
        aria-label="Espaçamento"
        className="h-7 rounded-xl border border-slate-200 bg-white px-2"
        onMouseDown={(event) => {
          event.stopPropagation();
          rememberSelection();
        }}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const letterSpacing = getRichTextPresetCss(
            RICH_TEXT_LETTER_SPACING_PRESETS,
            event.target.value
          );
          applyWithSelection(() =>
            editor.chain().focus().setMark("textStyle", { letterSpacing }).run()
          );
        }}
        defaultValue="NORMAL"
      >
        {RICH_TEXT_LETTER_SPACING_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onMouseDown={keepSelection}
        onClick={setLink}
        className={`rounded-xl px-2 py-1 ${
          editor.isActive("link") ? "bg-slate-950 text-white" : "bg-slate-100"
        }`}
      >
        Link
      </button>

      <button
        type="button"
        onMouseDown={keepSelection}
        onClick={() =>
          editor.chain().focus().unsetAllMarks().removeEmptyTextStyle().run()
        }
        className="rounded-xl bg-slate-100 px-2 py-1"
      >
        Limpar
      </button>
    </BubbleMenu>
  );
}

function RichTextInlineEditor({
  value,
  fallbackText,
  placeholder,
  multiline = false,
  className = "",
  style,
  onChange,
}: {
  value: RichTextValue | null;
  fallbackText: string;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  onChange: (richText: RichTextValue | null, plainText: string) => void;
}) {
  const normalizedFallbackText = fallbackText.trim();
  const initialContent = useMemo(
    () => getEditableRichTextContent(value, normalizedFallbackText),
    [normalizedFallbackText, value]
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(() => isRichTextEmpty(initialContent));
  const isFocusedRef = useRef(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        orderedList: false,
        underline: false,
      }),
      TextStyle,
      RichTextTypography,
      Color,
      FontFamily,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
      }),
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "outline-none [&_p]:m-0 [&_a]:underline [&_a]:underline-offset-2",
      },
      handleKeyDown: (_view, event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const richText = currentEditor.getJSON();
      const plainText = extractRichTextPlainText(richText).trim();
      const nextIsEmpty = plainText.length === 0;

      setIsEmpty(nextIsEmpty);
      onChange(nextIsEmpty ? null : richText, plainText);
    },
    onFocus: () => {
      isFocusedRef.current = true;
      setIsFocused(true);
    },
    onBlur: () => {
      isFocusedRef.current = false;
      setIsFocused(false);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isFocusedRef.current || editor.isFocused) return;

    const nextContent = getEditableRichTextContent(value, normalizedFallbackText);

    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }

    setIsEmpty(isRichTextEmpty(nextContent));
  }, [editor, normalizedFallbackText, value]);

  if (!editor) {
    return (
      <span className={`${className} ${fallbackText ? "" : "opacity-60"}`} style={style}>
        {fallbackText || placeholder}
      </span>
    );
  }

  return (
    <div
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className={`relative min-w-0 rounded-md bg-transparent outline-none transition hover:ring-1 hover:ring-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500 ${
        isEmpty ? "ring-1 ring-dashed ring-slate-300/80" : ""
      } ${className}`}
      style={style}
      data-placeholder={placeholder}
    >
      <RichTextBubbleToolbar editor={editor} />
      {isEmpty && !isFocused ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 min-h-[1.5em] text-current opacity-45">
          {placeholder}
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}

function InlineTextEditor({
  value,
  placeholder,
  multiline = false,
  className = "",
  style,
  onChange,
}: {
  value: string;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  onChange: (value: string) => void;
}) {
  const baseClass =
    "min-w-0 rounded-md bg-transparent outline-none transition hover:ring-1 hover:ring-indigo-300 focus:ring-2 focus:ring-indigo-500";

  if (multiline) {
    return (
      <textarea
        value={value}
        rows={3}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${baseClass} block w-full resize-none ${className}`}
        style={style}
        aria-label={placeholder}
      />
    );
  }

  return (
    <input
      value={value}
      size={Math.max(value.length, placeholder.length, 8)}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();

        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`${baseClass} max-w-full ${className}`}
      style={style}
      aria-label={placeholder}
    />
  );
}

function RenderBlocoPreview({
  bloco,
  selecionado,
  onSelect,
  onEdit,
  device,
  onInlineTextChange,
  onInlineCardChange,
}: {
  bloco: EditorVisualBloco;
  selecionado: boolean;
  onSelect: () => void;
  onEdit: () => void;
  device: DevicePreview;
  onInlineTextChange: (blocoId: string, patch: Record<string, unknown>) => void;
  onInlineCardChange: (
    blocoId: string,
    cardId: string,
    patch: Partial<DestaqueCardEditando>
  ) => void;
}) {
  const config = getConfigObject(bloco.configJson);
  function handleEditClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onEdit();
  }

  const titulo = getStringConfig(config, "titulo");
  const nomeBloco = bloco.titulo || getTipoLabel(bloco.tipo);

  const texto =
    getStringConfig(config, "texto") ||
    getStringConfig(config, "descricao") ||
    getStringConfig(config, "conteudo");
  const tituloRichText = getRichTextConfig(config, "tituloRichText");
  const subtituloRichText =
    getRichTextConfig(config, "subtituloRichText") ||
    getRichTextConfig(config, "textoRichText");
  const tituloSecaoRichText =
    getRichTextConfig(config, "tituloSecaoRichText") || tituloRichText;
  const subtituloSecaoRichText =
    getRichTextConfig(config, "subtituloSecaoRichText") || subtituloRichText;
  const tituloStyle = getTextStyleConfig(config, "tituloStyle");
  const subtituloStyle = getTextStyleConfig(config, "subtituloStyle");
  const botaoPrimarioStyle = getTextStyleConfig(config, "botaoPrimarioStyle");
  const botaoSecundarioStyle = getTextStyleConfig(config, "botaoSecundarioStyle");
  const textoStyle = getTextStyleConfig(config, "textoStyle");
  const botaoStyle = getTextStyleConfig(config, "botaoStyle");
  const tituloSecaoStyle = getTextStyleConfig(config, "tituloSecaoStyle");
  const subtituloSecaoStyle = getTextStyleConfig(config, "subtituloSecaoStyle");
  const cardTituloStyle = getTextStyleConfig(config, "cardTituloStyle");
  const cardTextoStyle = getTextStyleConfig(config, "cardTextoStyle");
  const cardBotaoStyle = getTextStyleConfig(config, "cardBotaoStyle");

  const imagemUrl =
    getStringConfig(config, "imagemUrl") ||
    getStringConfig(config, "imagem") ||
    getStringConfig(config, "backgroundImageUrl");

  const imagemDesktopUrl =
    getStringConfig(config, "imagemDesktopUrl") ||
    getStringConfig(config, "imagemDesktop") ||
    imagemUrl;

  const imagemMobileUrl =
    getStringConfig(config, "imagemMobileUrl") ||
    getStringConfig(config, "imagemMobile");

  const textoBotao =
    getStringConfigWithDefault(config, ["textoBotao", "botaoTexto"], "Conhecer");

  const textoBotaoSecundario =
    getStringConfig(config, "textoBotaoSecundario") ||
    getStringConfig(config, "botaoSecundarioTexto");

  const corFundo = getStringConfig(config, "corFundo") || "BRANCO";
  const espacamento = getStringConfig(config, "espacamento") || "PADRAO";

  const categorias = getArrayConfig(config, "categorias");
  const produtos = getArrayConfig(config, "produtos");
  const fonteProdutos = getStringConfig(config, "fonte") || "TODOS";
  const categoriaProdutoId = getStringConfig(config, "categoriaId");
  const categoriasProdutosIds = getStringArrayConfig(config, [
    "categoriasIds",
    "categorias",
  ]);
  const produtosSelecionadosIds = getStringArrayConfig(config, ["produtosIds"]);
  const limiteProdutos = Math.max(1, getNumberConfig(config, "limite", 8));
  const layoutDesktopProdutos =
    getStringConfig(config, "layoutDesktop") ||
    getStringConfig(config, "modo") ||
    "GRID";
  const layoutMobileProdutos =
    getStringConfig(config, "layoutMobile") || "GRID";
  const colunasDesktopProdutos = Math.max(
    1,
    getNumberConfig(
      config,
      "colunasDesktop",
      getNumberConfig(config, "produtosPorLinha", 4)
    )
  );
  const colunasTabletProdutos = Math.max(
    1,
    getNumberConfig(config, "colunasTablet", 3)
  );
  const colunasMobileProdutos = Math.max(
    1,
    getNumberConfig(config, "colunasMobile", 2)
  );
  const exibirPrecoProdutos = getBooleanConfig(config, "exibirPreco", true);
  const exibirBotaoProdutos = getBooleanConfig(config, "exibirBotao", true);
  const exibirSeloDescontoProdutos = getBooleanConfig(
    config,
    "exibirSeloDesconto",
    true
  );
  const cardsDestaques = getCardsDestaquesConfig(config);
  const layoutDesktopCards = normalizarLayoutCards(
    getStringConfig(config, "layoutDesktop")
  );
  const layoutMobileCards = normalizarLayoutCards(
    getStringConfig(config, "layoutMobile")
  );
  const colunasDesktopCards = Math.max(
    1,
    getNumberConfig(config, "colunasDesktop", 3)
  );
  const colunasTabletCards = Math.max(
    1,
    getNumberConfig(config, "colunasTablet", 2)
  );
  const colunasMobileCards = Math.max(
    1,
    getNumberConfig(config, "colunasMobile", 1)
  );
  const alinhamentoCards = normalizarAlinhamentoCards(
    getStringConfig(config, "alinhamento")
  );
  const alinhamentoCta = normalizarAlinhamentoCta(
    getStringConfig(config, "alinhamento")
  );
  const larguraConteudoCta = normalizarLarguraConteudoCta(
    getStringConfig(config, "larguraConteudo")
  );
  const layoutDesktopCta = normalizarLayoutCta(
    getStringConfig(config, "layoutDesktop")
  );
  const layoutMobileCta = normalizarLayoutCta(
    getStringConfig(config, "layoutMobile")
  );

  const isMobile = device === "MOBILE";
  const bgClass = getBgClass(corFundo);
  const paddingClass = getPaddingClass(espacamento);
  const alinhamentoBanner =
    getStringConfig(config, "alinhamentoConteudo") || "ESQUERDA";
  const alturaBanner = getStringConfig(config, "alturaBanner") || "PADRAO";
  const overlayBanner = getStringConfig(config, "overlayBanner") || "LEVE";
  const corTextoBanner = getStringConfig(config, "corTextoBanner") || "CLARO";
  const tipoMidia = getStringConfig(config, "tipoMidia") || "IMAGEM";
  const videoDesktopUrl = getStringConfig(config, "videoDesktopUrl");
  const videoMobileUrl = getStringConfig(config, "videoMobileUrl");
  const videoPosterUrl = getStringConfig(config, "videoPosterUrl");
  const videoLoop = getBooleanConfig(config, "videoLoop", true);
  const videoSom = getStringConfig(config, "videoSom") || "MUDO";
  const exibirMidia = getBooleanConfig(config, "exibirMidia", true);
  const mediaPositionDesktop = normalizarMediaPosition(
    getStringConfig(config, "mediaPositionDesktop")
  );
  const mediaPositionMobile = normalizarMediaPosition(
    getStringConfig(config, "mediaPositionMobile")
  );
  const mediaPositionAtual = isMobile
    ? mediaPositionMobile
    : mediaPositionDesktop;
  const exibirBotaoTextoImagem = getBooleanConfig(config, "exibirBotao", true);
  const layoutDesktopTextoImagem = normalizarLayoutDesktopTextoImagem(
    getStringConfig(config, "layoutDesktop") ||
      getStringConfig(config, "layoutDesktopTextoImagem") ||
      getStringConfig(config, "posicaoImagem")
  );
  const layoutMobileTextoImagem = normalizarLayoutMobileTextoImagem(
    getStringConfig(config, "layoutMobile") ||
      getStringConfig(config, "layoutMobileTextoImagem")
  );
  const exibirTexto = getBooleanConfig(config, "exibirTexto", true);
  const exibirSubtitulo = getBooleanConfig(config, "exibirSubtitulo", true);
  const exibirBotaoPrimario = getBooleanConfig(
    config,
    "exibirBotaoPrimario",
    true
  );
  const exibirBotaoSecundario = getBooleanConfig(
    config,
    "exibirBotaoSecundario",
    false
  );
  const imagemBannerUrl =
    isMobile && imagemMobileUrl ? imagemMobileUrl : imagemDesktopUrl;
  const videoBannerUrl =
    isMobile && videoMobileUrl ? videoMobileUrl : videoDesktopUrl;
  const bannerTextClasses = getBannerTextClasses(corTextoBanner);
  const mediaTextoImagemUrl =
    isMobile && imagemMobileUrl ? imagemMobileUrl : imagemDesktopUrl;
  const videoTextoImagemUrl =
    isMobile && videoMobileUrl ? videoMobileUrl : videoDesktopUrl;
  const ctaLayoutAtual = isMobile ? layoutMobileCta : layoutDesktopCta;
  const ctaImageUrl = isMobile && imagemMobileUrl ? imagemMobileUrl : imagemDesktopUrl;
  const ctaVideoUrl = isMobile && videoMobileUrl ? videoMobileUrl : videoDesktopUrl;
  const ctaHasMedia = exibirMidia && Boolean(ctaImageUrl || ctaVideoUrl);
  const ctaSafeLayout =
    ctaLayoutAtual === "SOBRE_MIDIA" && !ctaHasMedia
      ? "TEXTO_CENTRALIZADO"
      : ctaLayoutAtual;
  const ctaAlignmentClass = getCtaAlignmentClass(alinhamentoCta);
  const ctaWidthClass = getCtaContentWidthClass(larguraConteudoCta);
  const ctaTextColors =
    corFundo === "ESCURO" || corFundo === "MARCA"
      ? { title: "text-white", body: "text-white/75", button: "bg-white text-slate-950" }
      : { title: "text-slate-950", body: "text-slate-600", button: "bg-slate-950 text-white" };
  const textoImagemSobreImagem = isMobile
    ? layoutMobileTextoImagem === "TEXTO_SOBRE_IMAGEM"
    : layoutDesktopTextoImagem === "TEXTO_SOBRE_IMAGEM";
  const textoImagemMedia = exibirMidia ? (
    <MediaPreview
      tipoMidia={tipoMidia}
      imageUrl={mediaTextoImagemUrl}
      videoUrl={videoTextoImagemUrl}
      posterUrl={videoPosterUrl}
      alt={titulo || nomeBloco}
      objectPosition={mediaPositionAtual}
      videoLoop={videoLoop}
      videoMuted={videoSom === "MUDO"}
      placeholder="Sem mídia"
    />
  ) : null;
  const textoImagemConteudo = (
    <div>
      <RichTextInlineEditor
        value={tituloRichText}
        fallbackText={titulo}
        placeholder="Clique para adicionar um título"
        className="tracking-tight"
        style={resolveTextStyle(tituloStyle)}
        onChange={(richText, plainText) =>
          onInlineTextChange(bloco.id, {
            tituloRichText: richText,
            titulo: plainText,
          })
        }
      />

      <RichTextInlineEditor
        value={subtituloRichText}
        fallbackText={texto || ""}
        placeholder="Clique para adicionar um texto"
        multiline
        className={`mt-4 leading-7 ${
          corFundo === "ESCURO" ? "text-slate-300" : "text-slate-600"
        }`}
        style={resolveTextStyle(textoStyle)}
        onChange={(richText, plainText) =>
          onInlineTextChange(bloco.id, {
            textoRichText: richText,
            subtituloRichText: richText,
            texto: plainText,
            descricao: plainText,
            conteudo: plainText,
          })
        }
      />

      {exibirBotaoTextoImagem && (
        <div
          className={`mt-5 inline-flex px-5 py-3 ${
            corFundo === "ESCURO"
              ? "bg-white text-slate-950"
              : "bg-slate-950 text-white"
          }`}
          style={resolveTextStyle(botaoStyle)}
        >
          <InlineTextEditor
            value={textoBotao}
            placeholder="Texto do botão"
            className="text-center"
            style={resolveTextStyle(botaoStyle)}
            onChange={(value) =>
              onInlineTextChange(bloco.id, {
                textoBotao: value,
                botaoTexto: value,
              })
            }
          />
        </div>
      )}
    </div>
  );
  const layoutAtualProdutos =
    device === "MOBILE" ? layoutMobileProdutos : layoutDesktopProdutos;
  const colunasProdutos =
    device === "MOBILE"
      ? colunasMobileProdutos
      : device === "TABLET"
        ? colunasTabletProdutos
        : colunasDesktopProdutos;
  const totalMockProdutos = Math.min(Math.max(limiteProdutos, 1), 12);
  const avisoFonteProdutos =
    fonteProdutos === "CATEGORIA" && !categoriaProdutoId
      ? "Selecione uma categoria para exibir produtos."
      : fonteProdutos === "CATEGORIAS_SELECIONADAS" &&
          categoriasProdutosIds.length === 0
        ? "Selecione categorias para exibir produtos."
        : fonteProdutos === "MANUAL" && produtosSelecionadosIds.length === 0
          ? "Selecione produtos para montar esta vitrine."
          : "";
  const layoutAtualCards =
    device === "MOBILE" ? layoutMobileCards : layoutDesktopCards;
  const colunasCards =
    device === "MOBILE"
      ? colunasMobileCards
      : device === "TABLET"
        ? colunasTabletCards
        : colunasDesktopCards;

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
      className={`group relative cursor-pointer border-2 transition ${
        selecionado
          ? "border-indigo-500 bg-indigo-50/40"
          : "border-transparent hover:border-indigo-200"
      } ${bloco.ativo ? "" : "opacity-50"}`}
    >
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={handleEditClick}
        className="absolute right-3 top-3 z-30 hidden items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur transition hover:bg-slate-50 group-hover:inline-flex focus:inline-flex"
      >
        <Type className="h-3.5 w-3.5" />
        Editar
      </button>

      <div className="absolute left-3 top-3 z-10 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm group-hover:flex">
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
        {getTipoLabel(bloco.tipo)}
      </div>

      {isBannerTipo(bloco.tipo) ? (
        <div
          className={`relative overflow-hidden bg-slate-900 ${getBannerHeightClass(
            alturaBanner,
            isMobile
          )}`}
        >
          {exibirMidia ? (
            <div className="absolute inset-0">
              <MediaPreview
                tipoMidia={tipoMidia}
                imageUrl={imagemBannerUrl}
                videoUrl={videoBannerUrl}
                posterUrl={videoPosterUrl}
                alt={titulo}
                objectPosition={mediaPositionAtual}
                videoLoop={videoLoop}
                videoMuted={videoSom === "MUDO"}
                placeholder="Banner sem mídia"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-sm font-medium text-slate-500">
              Mídia oculta
            </div>
          )}

          <div className={`absolute inset-0 ${getBannerOverlayClass(overlayBanner)}`} />

          {exibirTexto && (
            <div
              className={`absolute inset-0 flex items-center ${getBannerAlignmentClass(
                alinhamentoBanner,
                isMobile
              )}`}
            >
              <div className={isMobile ? "max-w-sm" : "max-w-xl"}>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.22em] ${bannerTextClasses.eyebrow}`}
                >
                  Stella
                </p>

                <div
                  className={`mt-3 font-light tracking-tight ${bannerTextClasses.title} ${
                    isMobile ? "text-4xl" : "text-5xl"
                  }`}
                  style={resolveTextStyle(tituloStyle)}
                >
                  <RichTextInlineEditor
                    value={tituloRichText}
                    fallbackText={titulo}
                    placeholder="Clique para adicionar um título"
                    className="w-full"
                    style={resolveTextStyle(tituloStyle)}
                    onChange={(richText, plainText) =>
                      onInlineTextChange(bloco.id, {
                        tituloRichText: richText,
                        titulo: plainText,
                      })
                    }
                  />
                </div>

                {exibirSubtitulo && (
                  <RichTextInlineEditor
                    value={subtituloRichText}
                    fallbackText={texto || ""}
                    placeholder="Clique para adicionar um subtítulo"
                    multiline
                    className={`mt-4 text-sm leading-6 ${bannerTextClasses.text}`}
                    style={resolveTextStyle(subtituloStyle)}
                    onChange={(richText, plainText) =>
                      onInlineTextChange(bloco.id, {
                        subtituloRichText: richText,
                        textoRichText: richText,
                        texto: plainText,
                        descricao: plainText,
                        conteudo: plainText,
                      })
                    }
                  />
                )}

                {(exibirBotaoPrimario || exibirBotaoSecundario) && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {exibirBotaoPrimario && (
                      <div
                        className={`inline-flex px-5 py-3 text-sm font-semibold ${bannerTextClasses.button}`}
                        style={resolveTextStyle(botaoPrimarioStyle)}
                      >
                        <InlineTextEditor
                          value={textoBotao}
                          placeholder="Botão primário"
                          className="text-center"
                          style={resolveTextStyle(botaoPrimarioStyle)}
                          onChange={(value) =>
                            onInlineTextChange(bloco.id, {
                              textoBotao: value,
                              botaoTexto: value,
                            })
                          }
                        />
                      </div>
                    )}

                    {exibirBotaoSecundario && (
                      <div
                        className={`inline-flex border px-5 py-3 text-sm font-semibold ${
                          corTextoBanner === "ESCURO"
                            ? "border-slate-950 text-slate-950"
                            : "border-white text-white"
                        }`}
                        style={resolveTextStyle(botaoSecundarioStyle)}
                      >
                        <InlineTextEditor
                          value={textoBotaoSecundario}
                          placeholder="Botão secundário"
                          className="text-center"
                          style={resolveTextStyle(botaoSecundarioStyle)}
                          onChange={(value) =>
                            onInlineTextChange(bloco.id, {
                              textoBotaoSecundario: value,
                              botaoSecundarioTexto: value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : bloco.tipo === "ESPACADOR" ? (
        <div className="flex h-16 items-center justify-center bg-slate-50">
          <div className="h-px w-24 bg-slate-200" />
        </div>
      ) : isTextoImagemTipo(bloco.tipo) ? (
        textoImagemSobreImagem && exibirMidia ? (
          <div
            className={`relative overflow-hidden ${bgClass} ${
              isMobile ? "min-h-[520px]" : "min-h-[460px]"
            }`}
          >
            <div className="absolute inset-0">{textoImagemMedia}</div>
            <div className="absolute inset-0 bg-black/35" />

            <div className="absolute inset-0 flex items-center px-6 py-10 md:px-12">
              <div className="max-w-xl text-white">
                <RichTextInlineEditor
                  value={tituloRichText}
                  fallbackText={titulo}
                  placeholder="Clique para adicionar um título"
                  className="tracking-tight"
                  style={resolveTextStyle(tituloStyle)}
                  onChange={(richText, plainText) =>
                    onInlineTextChange(bloco.id, {
                      tituloRichText: richText,
                      titulo: plainText,
                    })
                  }
                />

                <RichTextInlineEditor
                  value={subtituloRichText}
                  fallbackText={texto || ""}
                  placeholder="Clique para adicionar um texto"
                  multiline
                  className="mt-4 leading-7 text-white/85"
                  style={resolveTextStyle(textoStyle)}
                  onChange={(richText, plainText) =>
                    onInlineTextChange(bloco.id, {
                      textoRichText: richText,
                      subtituloRichText: richText,
                      texto: plainText,
                      descricao: plainText,
                      conteudo: plainText,
                    })
                  }
                />

                {exibirBotaoTextoImagem && (
                  <div
                    className="mt-5 inline-flex bg-white px-5 py-3 text-slate-950"
                    style={resolveTextStyle(botaoStyle)}
                  >
                    <InlineTextEditor
                      value={textoBotao}
                      placeholder="Texto do botão"
                      className="text-center"
                      style={resolveTextStyle(botaoStyle)}
                      onChange={(value) =>
                        onInlineTextChange(bloco.id, {
                          textoBotao: value,
                          botaoTexto: value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isMobile ? (
          <div className={`grid grid-cols-1 ${bgClass}`}>
            {!exibirMidia ? (
              <div className={`flex items-center ${paddingClass}`}>
                {textoImagemConteudo}
              </div>
            ) : layoutMobileTextoImagem === "TEXTO_ACIMA" ? (
              <>
                <div className={`flex items-center ${paddingClass}`}>
                  {textoImagemConteudo}
                </div>
                <div className="min-h-[260px] bg-slate-100">
                  {textoImagemMedia}
                </div>
              </>
            ) : (
              <>
                <div className="min-h-[260px] bg-slate-100">
                  {textoImagemMedia}
                </div>
                <div className={`flex items-center ${paddingClass}`}>
                  {textoImagemConteudo}
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            className={`grid ${bgClass} ${
              !exibirMidia || layoutDesktopTextoImagem === "IMAGEM_ACIMA"
                ? "grid-cols-1"
                : "grid-cols-2"
            }`}
          >
            {!exibirMidia ? (
              <div className={`flex items-center ${paddingClass}`}>
                {textoImagemConteudo}
              </div>
            ) : layoutDesktopTextoImagem === "IMAGEM_ACIMA" ? (
              <>
                <div className="min-h-[320px] bg-slate-100">
                  {textoImagemMedia}
                </div>
                <div className={`flex items-center ${paddingClass}`}>
                  {textoImagemConteudo}
                </div>
              </>
            ) : layoutDesktopTextoImagem === "IMAGEM_DIREITA" ? (
              <>
                <div className={`flex items-center ${paddingClass}`}>
                  {textoImagemConteudo}
                </div>
                <div className="min-h-[320px] bg-slate-100">
                  {textoImagemMedia}
                </div>
              </>
            ) : (
              <>
                <div className="min-h-[320px] bg-slate-100">
                  {textoImagemMedia}
                </div>
                <div className={`flex items-center ${paddingClass}`}>
                  {textoImagemConteudo}
                </div>
              </>
            )}
          </div>
        )
      ) : isListaProdutosTipo(bloco.tipo) ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <RichTextInlineEditor
                value={tituloRichText}
                fallbackText={titulo}
                placeholder="Clique para adicionar um título da seção"
                className="tracking-tight"
                style={resolveTextStyle(tituloStyle)}
                onChange={(richText, plainText) =>
                  onInlineTextChange(bloco.id, {
                    tituloRichText: richText,
                    titulo: plainText,
                  })
                }
              />

              <RichTextInlineEditor
                value={subtituloRichText}
                fallbackText={texto || ""}
                placeholder="Clique para adicionar um subtítulo"
                multiline
                className={`mt-2 max-w-2xl leading-6 ${
                  corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
                }`}
                style={resolveTextStyle(subtituloStyle)}
                onChange={(richText, plainText) =>
                  onInlineTextChange(bloco.id, {
                    subtituloRichText: richText,
                    textoRichText: richText,
                    texto: plainText,
                    descricao: plainText,
                    conteudo: plainText,
                  })
                }
              />
            </div>

            <span className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              {fonteProdutos.replaceAll("_", " ")}
            </span>
          </div>

          <div
            className={
              layoutAtualProdutos === "CARROSSEL"
                ? "mt-6 flex gap-3 overflow-hidden"
                : "mt-6 grid gap-3"
            }
            style={
              layoutAtualProdutos === "CARROSSEL"
                ? undefined
                : {
                    gridTemplateColumns: `repeat(${colunasProdutos}, minmax(0, 1fr))`,
                  }
            }
          >
            {avisoFonteProdutos ? (
              <div className="col-span-full rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm font-medium text-amber-800">
                {avisoFonteProdutos}
              </div>
            ) : (
              Array.from({ length: totalMockProdutos }).map((_, index) => {
              const temDesconto = index % 3 === 0;
              const precoVenda = 149.9 + index * 18;
              const precoPromocional = temDesconto ? precoVenda * 0.85 : null;

              return (
                <div
                  key={index}
                  className={
                    layoutAtualProdutos === "CARROSSEL"
                      ? "w-40 shrink-0 sm:w-48"
                      : "min-w-0"
                  }
                >
                  <ProdutoCardLoja
                    modoPreview
                    produto={{
                      id: `preview-produto-${index}`,
                      nome:
                        index % 2 === 0
                          ? "Anel solitário Stella"
                          : "Colar ponto de luz",
                      imagemUrl: null,
                      imagemHoverUrl: null,
                      precoVenda,
                      descontoAtivo: temDesconto,
                      precoPromocional,
                      estoqueTotal: index === 5 ? 0 : 4,
                    }}
                    exibirPreco={exibirPrecoProdutos}
                    exibirBotao={exibirBotaoProdutos}
                    exibirSeloDesconto={exibirSeloDescontoProdutos}
                    textoBotao={textoBotao}
                  />
                </div>
              );
              })
            )}
          </div>

          {(categorias.length > 0 || produtos.length > 0) && (
            <p className="mt-5 text-xs text-slate-400">
              Fonte configurada:{" "}
              {[...categorias, ...produtos].slice(0, 4).join(", ")}
            </p>
          )}
        </div>
      ) : isDestaquesCardsTipo(bloco.tipo) ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <div
            className={
              alinhamentoCards === "CENTRO"
                ? "mx-auto max-w-2xl text-center"
                : "max-w-2xl text-left"
            }
          >
            <RichTextInlineEditor
              value={tituloSecaoRichText}
              fallbackText={titulo}
              placeholder="Clique para adicionar um título da seção"
              className="tracking-tight"
              style={resolveTextStyle(tituloSecaoStyle)}
              onChange={(richText, plainText) =>
                onInlineTextChange(bloco.id, {
                  tituloSecaoRichText: richText,
                  tituloRichText: richText,
                  titulo: plainText,
                })
              }
            />

            <RichTextInlineEditor
              value={subtituloSecaoRichText}
              fallbackText={texto || ""}
              placeholder="Clique para adicionar um subtítulo"
              multiline
              className={`mt-2 leading-6 ${
                corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
              }`}
              style={resolveTextStyle(subtituloSecaoStyle)}
              onChange={(richText, plainText) =>
                onInlineTextChange(bloco.id, {
                  subtituloSecaoRichText: richText,
                  subtituloRichText: richText,
                  textoRichText: richText,
                  texto: plainText,
                  descricao: plainText,
                  conteudo: plainText,
                })
              }
            />
          </div>

          <div
            className={
              layoutAtualCards === "CARROSSEL"
                ? "mt-6 flex gap-4 overflow-hidden"
                : "mt-6 grid gap-4"
            }
            style={
              layoutAtualCards === "CARROSSEL"
                ? undefined
                : {
                    gridTemplateColumns: `repeat(${colunasCards}, minmax(0, 1fr))`,
                  }
            }
          >
            {(cardsDestaques.length > 0
              ? cardsDestaques
              : [1, 2, 3].map((index) => criarCardDestaquePreviewPadrao(index))
            ).map((card) => (
              <article
                key={card.id}
                className={`min-w-0 border border-slate-200 bg-white ${
                  layoutAtualCards === "CARROSSEL" ? "w-64 shrink-0" : ""
                } ${corFundo === "ESCURO" ? "text-slate-950" : ""}`}
              >
                {card.exibirMidia && card.tipoMidia !== "NENHUMA" && (
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <CardMediaPreview card={card} device={device} />
                  </div>
                )}

                <div
                  className={
                    alinhamentoCards === "CENTRO"
                      ? "p-5 text-center"
                      : "p-5 text-left"
                  }
                >
                  <RichTextInlineEditor
                    value={card.tituloRichText}
                    fallbackText={card.titulo || ""}
                    placeholder="Título do card"
                    className="text-slate-950"
                    style={resolveTextStyle(cardTituloStyle)}
                    onChange={(richText, plainText) =>
                      onInlineCardChange(bloco.id, card.id, {
                        tituloRichText: richText,
                        titulo: plainText,
                      })
                    }
                  />

                  <RichTextInlineEditor
                    value={card.textoRichText}
                    fallbackText={card.texto || ""}
                    placeholder="Texto do card"
                    multiline
                    className="mt-2 leading-6 text-slate-500"
                    style={resolveTextStyle(cardTextoStyle)}
                    onChange={(richText, plainText) =>
                      onInlineCardChange(bloco.id, card.id, {
                        textoRichText: richText,
                        texto: plainText,
                      })
                    }
                  />

                  {card.exibirBotao && (
                    <>
                      <div
                        className="mt-4 inline-flex bg-slate-950 px-4 py-2 text-white"
                        style={resolveTextStyle(cardBotaoStyle)}
                      >
                        <InlineTextEditor
                          value={card.textoBotao}
                          placeholder="Texto do botão"
                          className="text-center"
                          style={resolveTextStyle(cardBotaoStyle)}
                          onChange={(value) =>
                            onInlineCardChange(bloco.id, card.id, {
                              textoBotao: value,
                            })
                          }
                        />
                      </div>

                      <InlineTextEditor
                        value={card.linkBotao}
                        placeholder="Link do card"
                        className="mt-2 block w-full text-xs text-slate-400"
                        onChange={(value) =>
                          onInlineCardChange(bloco.id, card.id, {
                            linkBotao: value,
                          })
                        }
                      />
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : isCtaTipo(bloco.tipo) ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <div
            className={`mx-auto grid gap-6 ${getCtaContentWidthClass(
              ctaSafeLayout === "TEXTO_CENTRALIZADO" ? larguraConteudoCta : "LARGA"
            )} ${
              isMobile
                ? "grid-cols-1"
                : getCtaDesktopGridClass(ctaSafeLayout, ctaHasMedia)
            }`}
          >
            {ctaHasMedia && ctaSafeLayout === "SOBRE_MIDIA" ? (
              <div className="relative min-h-[420px] overflow-hidden bg-slate-100">
                <div className="absolute inset-0">
                  <MediaPreview
                    tipoMidia={tipoMidia}
                    imageUrl={ctaImageUrl}
                    videoUrl={ctaVideoUrl}
                    posterUrl={videoPosterUrl}
                    alt={titulo || nomeBloco}
                    objectPosition={mediaPositionAtual}
                    videoLoop={videoLoop}
                    videoMuted={videoSom === "MUDO"}
                    placeholder="CTA sem mídia"
                  />
                </div>
                <div className="absolute inset-0 bg-slate-950/42" />
                <div
                  className={`absolute inset-0 flex flex-col justify-center px-6 py-10 text-white ${ctaAlignmentClass}`}
                >
                  {exibirTexto && (
                    <div className={ctaWidthClass}>
                      <RichTextInlineEditor
                        value={tituloRichText}
                        fallbackText={titulo}
                        placeholder="Clique para adicionar um título"
                        className="tracking-tight"
                        style={resolveTextStyle(tituloStyle)}
                        onChange={(richText, plainText) =>
                          onInlineTextChange(bloco.id, {
                            tituloRichText: richText,
                            titulo: plainText,
                          })
                        }
                      />
                      <RichTextInlineEditor
                        value={subtituloRichText}
                        fallbackText={texto || ""}
                        placeholder="Clique para adicionar um texto"
                        multiline
                        className="mt-4 leading-7 text-white/82"
                        style={resolveTextStyle(textoStyle)}
                        onChange={(richText, plainText) =>
                          onInlineTextChange(bloco.id, {
                            textoRichText: richText,
                            subtituloRichText: richText,
                            texto: plainText,
                            descricao: plainText,
                            conteudo: plainText,
                          })
                        }
                      />
                      {(exibirBotaoPrimario || exibirBotaoSecundario) && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          {exibirBotaoPrimario && (
                            <div className="inline-flex bg-white px-5 py-3 text-slate-950">
                              <InlineTextEditor
                                value={textoBotao}
                                placeholder="Botão primário"
                                className="text-center"
                                style={resolveTextStyle(botaoPrimarioStyle)}
                                onChange={(value) =>
                                  onInlineTextChange(bloco.id, {
                                    textoBotao: value,
                                    textoBotaoPrimario: value,
                                    botaoTexto: value,
                                  })
                                }
                              />
                            </div>
                          )}
                          {exibirBotaoSecundario && (
                            <div className="inline-flex border border-white px-5 py-3 text-white">
                              <InlineTextEditor
                                value={textoBotaoSecundario}
                                placeholder="Botão secundário"
                                className="text-center"
                                style={resolveTextStyle(botaoSecundarioStyle)}
                                onChange={(value) =>
                                  onInlineTextChange(bloco.id, {
                                    textoBotaoSecundario: value,
                                    botaoSecundarioTexto: value,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {ctaHasMedia && ctaSafeLayout === "MIDIA_TEXTO" && (
                  <div className="min-h-[320px] overflow-hidden bg-slate-100">
                    <MediaPreview
                      tipoMidia={tipoMidia}
                      imageUrl={ctaImageUrl}
                      videoUrl={ctaVideoUrl}
                      posterUrl={videoPosterUrl}
                      alt={titulo || nomeBloco}
                      objectPosition={mediaPositionAtual}
                      videoLoop={videoLoop}
                      videoMuted={videoSom === "MUDO"}
                      placeholder="CTA sem mídia"
                    />
                  </div>
                )}

                <div
                  className={`flex min-h-[260px] flex-col justify-center ${ctaAlignmentClass} ${
                    ctaSafeLayout === "TEXTO_CENTRALIZADO" ? ctaWidthClass : ""
                  }`}
                >
                  {exibirTexto && (
                    <>
                      <RichTextInlineEditor
                        value={tituloRichText}
                        fallbackText={titulo}
                        placeholder="Clique para adicionar um título"
                        className={`tracking-tight ${ctaTextColors.title}`}
                        style={resolveTextStyle(tituloStyle)}
                        onChange={(richText, plainText) =>
                          onInlineTextChange(bloco.id, {
                            tituloRichText: richText,
                            titulo: plainText,
                          })
                        }
                      />
                      <RichTextInlineEditor
                        value={subtituloRichText}
                        fallbackText={texto || ""}
                        placeholder="Clique para adicionar um texto"
                        multiline
                        className={`mt-4 leading-7 ${ctaTextColors.body}`}
                        style={resolveTextStyle(textoStyle)}
                        onChange={(richText, plainText) =>
                          onInlineTextChange(bloco.id, {
                            textoRichText: richText,
                            subtituloRichText: richText,
                            texto: plainText,
                            descricao: plainText,
                            conteudo: plainText,
                          })
                        }
                      />
                      {(exibirBotaoPrimario || exibirBotaoSecundario) && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          {exibirBotaoPrimario && (
                            <div
                              className={`inline-flex px-5 py-3 ${ctaTextColors.button}`}
                            >
                              <InlineTextEditor
                                value={textoBotao}
                                placeholder="Botão primário"
                                className="text-center"
                                style={resolveTextStyle(botaoPrimarioStyle)}
                                onChange={(value) =>
                                  onInlineTextChange(bloco.id, {
                                    textoBotao: value,
                                    textoBotaoPrimario: value,
                                    botaoTexto: value,
                                  })
                                }
                              />
                            </div>
                          )}
                          {exibirBotaoSecundario && (
                            <div className="inline-flex border border-current px-5 py-3">
                              <InlineTextEditor
                                value={textoBotaoSecundario}
                                placeholder="Botão secundário"
                                className="text-center"
                                style={resolveTextStyle(botaoSecundarioStyle)}
                                onChange={(value) =>
                                  onInlineTextChange(bloco.id, {
                                    textoBotaoSecundario: value,
                                    botaoSecundarioTexto: value,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {ctaHasMedia && ctaSafeLayout === "TEXTO_MIDIA" && (
                  <div className="min-h-[320px] overflow-hidden bg-slate-100">
                    <MediaPreview
                      tipoMidia={tipoMidia}
                      imageUrl={ctaImageUrl}
                      videoUrl={ctaVideoUrl}
                      posterUrl={videoPosterUrl}
                      alt={titulo || nomeBloco}
                      objectPosition={mediaPositionAtual}
                      videoLoop={videoLoop}
                      videoMuted={videoSom === "MUDO"}
                      placeholder="CTA sem mídia"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : bloco.tipo.includes("PRODUTO") ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          {texto && (
            <p
              className={`mt-2 max-w-2xl text-sm leading-6 ${
                corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {texto}
            </p>
          )}

          <div
            className={`mt-6 grid gap-3 ${
              isMobile ? "grid-cols-2" : "grid-cols-4"
            }`}
          >
            {Array.from({ length: isMobile ? 4 : 8 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-square bg-slate-100" />
                <div className="mt-3 h-3 w-3/4 bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 bg-slate-100" />
              </div>
            ))}
          </div>

          {(categorias.length > 0 || produtos.length > 0) && (
            <p className="mt-5 text-xs text-slate-400">
              Fonte configurada:{" "}
              {[...categorias, ...produtos].slice(0, 4).join(", ")}
            </p>
          )}
        </div>
      ) : bloco.tipo.includes("CATEGORIA") ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          {texto && (
            <p
              className={`mt-2 max-w-2xl text-sm leading-6 ${
                corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {texto}
            </p>
          )}

          <div
            className={`mt-6 grid gap-4 ${
              isMobile ? "grid-cols-2" : "grid-cols-3"
            }`}
          >
            {Array.from({ length: isMobile ? 4 : 6 }).map((_, index) => (
              <div key={index} className="text-center">
                <div className="aspect-square bg-slate-100" />
                <div className="mx-auto mt-3 h-3 w-2/3 bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : bloco.tipo === "FAQ" ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border border-slate-200 bg-white px-4 py-4">
                <div className="h-3 w-2/3 bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          <p
            className={`mt-4 max-w-2xl text-sm leading-7 ${
              corFundo === "ESCURO" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {texto || "Conteúdo do bloco será exibido aqui."}
          </p>
        </div>
      )}
    </section>
  );
}

function EditorConteudoBlocoModal({
  estado,
  categoriasDisponiveis,
  produtosDisponiveis,
  onChange,
  onClose,
  onSave,
  salvando,
}: {
  estado: BlocoEditandoState;
  categoriasDisponiveis: EditorVisualCategoria[];
  produtosDisponiveis: EditorVisualProduto[];
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
  onClose: () => void;
  onSave: () => void;
  salvando: boolean;
}) {
  const [buscaProdutoManual, setBuscaProdutoManual] = useState("");

  if (!estado) {
    return null;
  }

  const estadoAtual = estado;
  const isBanner = isBannerTipo(estado.bloco.tipo);
  const isTextoImagem = isTextoImagemTipo(estado.bloco.tipo);
  const isListaProdutos = isListaProdutosTipo(estado.bloco.tipo);
  const isDestaquesCards = isDestaquesCardsTipo(estado.bloco.tipo);
  const isCta = isCtaTipo(estado.bloco.tipo);
  const produtosFiltradosManual = produtosDisponiveis
    .filter((produto) => {
      const termo = buscaProdutoManual.trim().toLowerCase();

      if (!termo) return true;

      return (
        produto.nome.toLowerCase().includes(termo) ||
        produto.codigoInterno.toLowerCase().includes(termo) ||
        produto.categoria.toLowerCase().includes(termo) ||
        produto.categoriaNomes.some((categoria) =>
          categoria.toLowerCase().includes(termo)
        )
      );
    })
    .filter((produto) => !estadoAtual.produtosSelecionadosIds.includes(produto.id))
    .slice(0, 30);

  function selecionarCategoriaProduto(categoriaId: string) {
    const categoria = getCategoriaResumo(categoriaId, categoriasDisponiveis);

    onChange({
      categoriaProdutoId: categoria?.id || "",
      categoriaProdutoSlug: categoria?.slug || "",
      categoriaProdutoNome: categoria?.nome || "",
    });
  }

  function selecionarCategoriasProdutos(categoriaId: string, checked: boolean) {
    const categoria = getCategoriaResumo(categoriaId, categoriasDisponiveis);

    const nextIds = checked
      ? [...estadoAtual.categoriasProdutosIds, categoriaId]
      : estadoAtual.categoriasProdutosIds.filter((id) => id !== categoriaId);

    const categoriasSelecionadas = nextIds
      .map((id) => getCategoriaResumo(id, categoriasDisponiveis))
      .filter((item): item is EditorVisualCategoria => Boolean(item));

    onChange({
      categoriasProdutosIds: nextIds,
      categoriasProdutosSlugs: categoriasSelecionadas.map((item) => item.slug),
      categoriasProdutosNomes: categoriasSelecionadas.map((item) => item.nome),
      ...(categoria && checked && !estadoAtual.categoriaProdutoId
        ? {
            categoriaProdutoId: categoria.id,
            categoriaProdutoSlug: categoria.slug,
            categoriaProdutoNome: categoria.nome,
          }
        : {}),
    });
  }

  function adicionarProdutoManual(produtoId: string) {
    if (estadoAtual.produtosSelecionadosIds.includes(produtoId)) return;

    onChange({
      produtosSelecionadosIds: [
        ...estadoAtual.produtosSelecionadosIds,
        produtoId,
      ],
    });
  }

  function removerProdutoManual(produtoId: string) {
    onChange({
      produtosSelecionadosIds: estadoAtual.produtosSelecionadosIds.filter(
        (id) => id !== produtoId
      ),
    });
  }

  function moverProdutoManual(produtoId: string, direction: "UP" | "DOWN") {
    const index = estadoAtual.produtosSelecionadosIds.indexOf(produtoId);
    const nextIndex = direction === "UP" ? index - 1 : index + 1;

    if (
      index < 0 ||
      nextIndex < 0 ||
      nextIndex >= estadoAtual.produtosSelecionadosIds.length
    ) {
      return;
    }

    const ids = [...estadoAtual.produtosSelecionadosIds];
    const [produtoMovido] = ids.splice(index, 1);
    ids.splice(nextIndex, 0, produtoMovido);
    onChange({ produtosSelecionadosIds: ids });
  }

  function atualizarCardDestaque(
    cardId: string,
    data: Partial<DestaqueCardEditando>
  ) {
    onChange({
      cardsDestaques: estadoAtual.cardsDestaques.map((card) =>
        card.id === cardId ? { ...card, ...data } : card
      ),
    });
  }

  function atualizarPosicaoCardDestaque(
    cardId: string,
    device: "DESKTOP" | "MOBILE",
    value: string
  ) {
    const crop = getMediaCropFromPosition(value);

    atualizarCardDestaque(
      cardId,
      device === "DESKTOP"
        ? {
            mediaPositionDesktop: value,
            mediaCropDesktopX: crop.x,
            mediaCropDesktopY: crop.y,
          }
        : {
            mediaPositionMobile: value,
            mediaCropMobileX: crop.x,
            mediaCropMobileY: crop.y,
          }
    );
  }

  function adicionarCardDestaque() {
    onChange({
      cardsDestaques: [
        ...estadoAtual.cardsDestaques,
        criarCardDestaquePadrao(estadoAtual.cardsDestaques.length + 1),
      ],
    });
  }

  function removerCardDestaque(cardId: string) {
    onChange({
      cardsDestaques: estadoAtual.cardsDestaques.filter(
        (card) => card.id !== cardId
      ),
    });
  }

  function moverCardDestaque(cardId: string, direction: "UP" | "DOWN") {
    const index = estadoAtual.cardsDestaques.findIndex(
      (card) => card.id === cardId
    );
    const nextIndex = direction === "UP" ? index - 1 : index + 1;

    if (
      index < 0 ||
      nextIndex < 0 ||
      nextIndex >= estadoAtual.cardsDestaques.length
    ) {
      return;
    }

    const cards = [...estadoAtual.cardsDestaques];
    const [card] = cards.splice(index, 1);
    cards.splice(nextIndex, 0, card);
    onChange({ cardsDestaques: cards });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Editar bloco
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {estado.nomeInterno || getTipoLabel(estado.bloco.tipo)}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isBanner
                ? "Configure conteúdo, imagens e aparência do banner no preview visual."
                : isTextoImagem
                  ? "Configure texto, mídia, layout e aparência do bloco texto + imagem."
                  : isListaProdutos
                    ? "Configure a vitrine visual de produtos no preview do editor."
                    : isDestaquesCards
                      ? "Configure cards manuais com mídia, ícones, links e layout responsivo."
                      : isCta
                        ? "Configure uma chamada visual com texto rico, mídia opcional e botões."
                        : "Primeira edição visual com campos universais. Depois vamos especializar por tipo de bloco."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Fechar edição"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isBanner ? (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno
              </span>

              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Banner principal"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <CampoToggle
                checked={estado.exibirTexto}
                label="Exibir texto"
                description="Controla título, subtítulo e botões do banner."
                onChange={(checked) => onChange({ exibirTexto: checked })}
              />

              <CampoToggle
                checked={estado.exibirSubtitulo}
                label="Exibir subtítulo"
                onChange={(checked) => onChange({ exibirSubtitulo: checked })}
              />

              <CampoToggle
                checked={estado.exibirBotaoPrimario}
                label="Exibir botão primário"
                onChange={(checked) =>
                  onChange({ exibirBotaoPrimario: checked })
                }
              />

              <CampoToggle
                checked={estado.exibirBotaoSecundario}
                label="Exibir botão secundário"
                onChange={(checked) =>
                  onChange({ exibirBotaoSecundario: checked })
                }
              />
            </div>

            <SecaoRecolhivel
              title="Textos / conteúdo"
              description="Você também pode editar título e subtítulo diretamente no preview."
            >
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Título
                </span>

                <input
                  value={estado.titulo}
                  onChange={(event) => onChange({ titulo: event.target.value })}
                  placeholder="Título visível"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Subtítulo/texto
                </span>

                <textarea
                  value={estado.texto}
                  onChange={(event) => onChange({ texto: event.target.value })}
                  rows={4}
                  placeholder="Texto de apoio do banner"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
                />
              </label>
            </SecaoRecolhivel>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tipo de mídia
              </span>

              <select
                value={estado.tipoMidia}
                onChange={(event) => onChange({ tipoMidia: event.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {TIPO_MIDIA_BANNER_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <CampoToggle
              checked={estado.exibirMidia}
              label="Exibir mídia"
              description="Oculta ou mostra a imagem/vídeo do banner sem remover URLs salvas."
              onChange={(checked) => onChange({ exibirMidia: checked })}
            />

            {estado.tipoMidia === "VIDEO" ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <UploadMidiaCampo
                    label="Vídeo desktop URL"
                    value={estado.videoDesktopUrl}
                    tipoMidia="VIDEO"
                    onChange={(url) => onChange({ videoDesktopUrl: url })}
                    orientacao="Cole uma URL ou envie um arquivo MP4/WebM. MP4/H.264 é recomendado para compatibilidade."
                  />

                  <UploadMidiaCampo
                    label="Vídeo mobile URL"
                    value={estado.videoMobileUrl}
                    tipoMidia="VIDEO"
                    onChange={(url) => onChange({ videoMobileUrl: url })}
                    orientacao="Opcional. Quando vazio, o preview mobile usa o vídeo desktop."
                  />
                </div>

                <UploadMidiaCampo
                  label="Poster do vídeo URL"
                  value={estado.videoPosterUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ videoPosterUrl: url })}
                  orientacao="Imagem exibida enquanto o vídeo carrega. JPG, PNG ou WebP."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <CampoToggle
                    checked={estado.videoLoop}
                    label="Repetir vídeo em loop"
                    onChange={(checked) => onChange({ videoLoop: checked })}
                  />

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Som do vídeo
                    </span>

                    <select
                      value={estado.videoSom}
                      onChange={(event) =>
                        onChange({ videoSom: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {VIDEO_SOM_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <UploadMidiaCampo
                  label="Imagem desktop URL"
                  value={estado.imagemDesktopUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ imagemDesktopUrl: url })}
                  orientacao="Cole uma URL ou envie JPG, PNG ou WebP."
                />

                <UploadMidiaCampo
                  label="Imagem mobile URL"
                  value={estado.imagemMobileUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ imagemMobileUrl: url })}
                  orientacao="Opcional. Quando vazio, o preview mobile usa a imagem desktop."
                />
              </div>
            )}

            <CropPositionControls
              desktopValue={estado.mediaPositionDesktop}
              mobileValue={estado.mediaPositionMobile}
              onChange={onChange}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do botão
                </span>

                <input
                  value={estado.textoBotao}
                  onChange={(event) =>
                    onChange({ textoBotao: event.target.value })
                  }
                  placeholder="Ex: Comprar agora"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do botão
                </span>

                <input
                  value={estado.linkBotao}
                  onChange={(event) =>
                    onChange({ linkBotao: event.target.value })
                  }
                  placeholder="/loja/descontos"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do botão secundário
                </span>

                <input
                  value={estado.textoBotaoSecundario}
                  onChange={(event) =>
                    onChange({ textoBotaoSecundario: event.target.value })
                  }
                  placeholder="Ex: Ver coleção"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do botão secundário
                </span>

                <input
                  value={estado.linkBotaoSecundario}
                  onChange={(event) =>
                    onChange({ linkBotaoSecundario: event.target.value })
                  }
                  placeholder="/loja/colecao"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Alinhamento do conteúdo
                </span>

                <select
                  value={estado.alinhamentoConteudo}
                  onChange={(event) =>
                    onChange({ alinhamentoConteudo: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ALINHAMENTO_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Altura
                </span>

                <select
                  value={estado.alturaBanner}
                  onChange={(event) =>
                    onChange({ alturaBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ALTURA_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Overlay
                </span>

                <select
                  value={estado.overlayBanner}
                  onChange={(event) =>
                    onChange({ overlayBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {OVERLAY_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor do texto
                </span>

                <select
                  value={estado.corTextoBanner}
                  onChange={(event) =>
                    onChange({ corTextoBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {COR_TEXTO_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Crop ainda não está ativo nesta etapa. Para vídeo, prefira MP4
              com codec H.264 para maior compatibilidade.
            </div>
          </div>
        ) : isTextoImagem ? (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno
              </span>

              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Texto institucional com imagem"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <SecaoRecolhivel
              title="Textos / conteúdo"
              description="Edite título e texto direto no preview quando quiser ajustar por seleção."
            >
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Título
                </span>

                <input
                  value={estado.titulo}
                  onChange={(event) => onChange({ titulo: event.target.value })}
                  placeholder="Título visível"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto
                </span>

                <textarea
                  value={estado.texto}
                  onChange={(event) => onChange({ texto: event.target.value })}
                  rows={5}
                  placeholder="Texto do bloco"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
                />
              </label>
            </SecaoRecolhivel>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do botão
                </span>

                <input
                  value={estado.textoBotao}
                  onChange={(event) =>
                    onChange({ textoBotao: event.target.value })
                  }
                  placeholder="Ex: Saiba mais"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do botão
                </span>

                <input
                  value={estado.linkBotao}
                  onChange={(event) =>
                    onChange({ linkBotao: event.target.value })
                  }
                  placeholder="/loja/quem-somos"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <CampoToggle
              checked={estado.exibirBotao}
              label="Exibir botão"
              onChange={(checked) => onChange({ exibirBotao: checked })}
            />

            <CampoToggle
              checked={estado.exibirMidia}
              label="Exibir mídia"
              onChange={(checked) => onChange({ exibirMidia: checked })}
            />

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tipo de mídia
              </span>

              <select
                value={estado.tipoMidia}
                onChange={(event) => onChange({ tipoMidia: event.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {TIPO_MIDIA_BANNER_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            {estado.tipoMidia === "VIDEO" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <UploadMidiaCampo
                  label="Vídeo desktop URL"
                  value={estado.videoDesktopUrl}
                  tipoMidia="VIDEO"
                  onChange={(url) => onChange({ videoDesktopUrl: url })}
                  orientacao="Cole uma URL ou envie MP4/WebM. MP4/H.264 é recomendado."
                />

                <UploadMidiaCampo
                  label="Vídeo mobile URL"
                  value={estado.videoMobileUrl}
                  tipoMidia="VIDEO"
                  onChange={(url) => onChange({ videoMobileUrl: url })}
                  orientacao="Opcional. Quando vazio, o mobile usa o vídeo desktop."
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <UploadMidiaCampo
                  label="Imagem desktop URL"
                  value={estado.imagemDesktopUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ imagemDesktopUrl: url })}
                  orientacao="Cole uma URL ou envie JPG, PNG ou WebP."
                />

                <UploadMidiaCampo
                  label="Imagem mobile URL"
                  value={estado.imagemMobileUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ imagemMobileUrl: url })}
                  orientacao="Opcional. Quando vazio, o mobile usa a imagem desktop."
                />
              </div>
            )}

            <CropPositionControls
              desktopValue={estado.mediaPositionDesktop}
              mobileValue={estado.mediaPositionMobile}
              onChange={onChange}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Layout desktop
                </span>

                <select
                  value={estado.layoutDesktopTextoImagem}
                  onChange={(event) =>
                    onChange({ layoutDesktopTextoImagem: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {LAYOUT_DESKTOP_TEXTO_IMAGEM_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Layout mobile
                </span>

                <select
                  value={estado.layoutMobileTextoImagem}
                  onChange={(event) =>
                    onChange({ layoutMobileTextoImagem: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {LAYOUT_MOBILE_TEXTO_IMAGEM_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor de fundo
                </span>

                <select
                  value={estado.corFundo}
                  onChange={(event) =>
                    onChange({ corFundo: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {COR_FUNDO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Espaçamento
                </span>

                <select
                  value={estado.espacamento}
                  onChange={(event) =>
                    onChange({ espacamento: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ESPACAMENTO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Editor rico de texto e crop ainda não estão ativos nesta etapa.
            </div>
          </div>
        ) : isCta ? (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno
              </span>
              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Chamada final da página"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <SecaoRecolhivel
              title="Textos / conteúdo"
              description="Título e texto também podem ser editados diretamente no preview com seleção parcial."
            >
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Título
                </span>
                <input
                  value={estado.titulo}
                  onChange={(event) => onChange({ titulo: event.target.value })}
                  placeholder="Título da chamada"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto
                </span>
                <textarea
                  value={estado.texto}
                  onChange={(event) => onChange({ texto: event.target.value })}
                  rows={4}
                  placeholder="Texto de apoio da chamada"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
                />
              </label>
            </SecaoRecolhivel>

            <PainelSecao title="Layout e aparência">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Alinhamento
                  </span>
                  <select
                    value={estado.alinhamentoCta}
                    onChange={(event) =>
                      onChange({ alinhamentoCta: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {ALINHAMENTO_BANNER_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Largura do conteúdo
                  </span>
                  <select
                    value={estado.larguraConteudoCta}
                    onChange={(event) =>
                      onChange({ larguraConteudoCta: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {LARGURA_CONTEUDO_CTA_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Cor de fundo
                  </span>
                  <select
                    value={estado.corFundo}
                    onChange={(event) =>
                      onChange({ corFundo: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {COR_FUNDO_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Espaçamento
                  </span>
                  <select
                    value={estado.espacamento}
                    onChange={(event) =>
                      onChange({ espacamento: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {ESPACAMENTO_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Layout desktop
                  </span>
                  <select
                    value={estado.layoutDesktopCta}
                    onChange={(event) =>
                      onChange({ layoutDesktopCta: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {LAYOUT_CTA_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Layout mobile
                  </span>
                  <select
                    value={estado.layoutMobileCta}
                    onChange={(event) =>
                      onChange({ layoutMobileCta: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {LAYOUT_CTA_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </PainelSecao>

            <PainelSecao title="Mídia">
              <div className="space-y-4">
                <CampoToggle
                  checked={estado.exibirMidia}
                  label="Exibir mídia"
                  description="Quando desligado, URLs e crop continuam salvos."
                  onChange={(checked) => onChange({ exibirMidia: checked })}
                />

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Tipo de mídia
                  </span>
                  <select
                    value={estado.tipoMidia}
                    onChange={(event) => onChange({ tipoMidia: event.target.value })}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {TIPO_MIDIA_BANNER_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                {estado.tipoMidia === "VIDEO" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <UploadMidiaCampo
                      label="Vídeo desktop URL"
                      value={estado.videoDesktopUrl}
                      tipoMidia="VIDEO"
                      onChange={(url) => onChange({ videoDesktopUrl: url })}
                      orientacao="Cole uma URL ou envie MP4/WebM. MP4/H.264 é recomendado."
                    />
                    <UploadMidiaCampo
                      label="Vídeo mobile URL"
                      value={estado.videoMobileUrl}
                      tipoMidia="VIDEO"
                      onChange={(url) => onChange({ videoMobileUrl: url })}
                      orientacao="Opcional. Quando vazio, o mobile usa o vídeo desktop."
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <UploadMidiaCampo
                      label="Imagem desktop URL"
                      value={estado.imagemDesktopUrl}
                      tipoMidia="IMAGEM"
                      onChange={(url) => onChange({ imagemDesktopUrl: url })}
                      orientacao="Cole uma URL ou envie JPG, PNG ou WebP."
                    />
                    <UploadMidiaCampo
                      label="Imagem mobile URL"
                      value={estado.imagemMobileUrl}
                      tipoMidia="IMAGEM"
                      onChange={(url) => onChange({ imagemMobileUrl: url })}
                      orientacao="Opcional. Quando vazio, o mobile usa a imagem desktop."
                    />
                  </div>
                )}

                <CropPositionControls
                  desktopValue={estado.mediaPositionDesktop}
                  mobileValue={estado.mediaPositionMobile}
                  onChange={onChange}
                />
              </div>
            </PainelSecao>

            <PainelSecao title="Botões">
              <div className="space-y-4">
                <CampoToggle
                  checked={estado.exibirTexto}
                  label="Exibir texto"
                  description="Controla título, texto e botões da chamada."
                  onChange={(checked) => onChange({ exibirTexto: checked })}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <CampoToggle
                    checked={estado.exibirBotaoPrimario}
                    label="Exibir botão primário"
                    onChange={(checked) =>
                      onChange({ exibirBotaoPrimario: checked })
                    }
                  />
                  <CampoToggle
                    checked={estado.exibirBotaoSecundario}
                    label="Exibir botão secundário"
                    onChange={(checked) =>
                      onChange({ exibirBotaoSecundario: checked })
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Texto do botão primário
                    </span>
                    <input
                      value={estado.textoBotao}
                      onChange={(event) =>
                        onChange({ textoBotao: event.target.value })
                      }
                      placeholder="Saiba mais"
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Link do botão primário
                    </span>
                    <input
                      value={estado.linkBotao}
                      onChange={(event) =>
                        onChange({ linkBotao: event.target.value })
                      }
                      placeholder="/loja"
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Texto do botão secundário
                    </span>
                    <input
                      value={estado.textoBotaoSecundario}
                      onChange={(event) =>
                        onChange({ textoBotaoSecundario: event.target.value })
                      }
                      placeholder="Ver coleção"
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Link do botão secundário
                    </span>
                    <input
                      value={estado.linkBotaoSecundario}
                      onChange={(event) =>
                        onChange({ linkBotaoSecundario: event.target.value })
                      }
                      placeholder="/loja/colecao"
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                </div>

                {((estado.exibirBotaoPrimario &&
                  (!estado.textoBotao.trim() || !estado.linkBotao.trim())) ||
                  (estado.exibirBotaoSecundario &&
                    (!estado.textoBotaoSecundario.trim() ||
                      !estado.linkBotaoSecundario.trim()))) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                    Botões ativos precisam de texto e link para aparecer na loja
                    pública.
                  </div>
                )}
              </div>
            </PainelSecao>

          </div>
        ) : isListaProdutos ? (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno
              </span>

              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Produtos em destaque"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <SecaoRecolhivel
              title="Textos / conteúdo"
              description="O título e subtítulo da seção também são editáveis no preview."
            >
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Título
                </span>

                <input
                  value={estado.titulo}
                  onChange={(event) => onChange({ titulo: event.target.value })}
                  placeholder="Título da vitrine"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Subtítulo
                </span>

                <textarea
                  value={estado.texto}
                  onChange={(event) => onChange({ texto: event.target.value })}
                  rows={3}
                  placeholder="Texto de apoio da vitrine"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
                />
              </label>
            </SecaoRecolhivel>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Fonte/origem dos produtos
                </span>

                <select
                  value={estado.fonteProdutos}
                  onChange={(event) =>
                    onChange({ fonteProdutos: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {FONTE_PRODUTOS_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Limite de produtos
                </span>

                <input
                  type="number"
                  min={1}
                  max={48}
                  value={estado.limiteProdutos}
                  onChange={(event) =>
                    onChange({ limiteProdutos: Number(event.target.value) || 1 })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            {(estado.fonteProdutos === "CATEGORIA" ||
              estado.fonteProdutos === "CATEGORIAS_SELECIONADAS" ||
              estado.fonteProdutos === "MANUAL") && (
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Origem dos produtos
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Salva apenas IDs e slugs no configJson para manter o bloco leve.
                  </p>
                </div>

                {estado.fonteProdutos === "CATEGORIA" && (
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Categoria
                    </span>
                    <select
                      value={estado.categoriaProdutoId}
                      onChange={(event) =>
                        selecionarCategoriaProduto(event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categoriasDisponiveis.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.caminho}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {estado.fonteProdutos === "CATEGORIAS_SELECIONADAS" && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Categorias
                    </p>
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                      {categoriasDisponiveis.map((categoria) => (
                        <label
                          key={categoria.id}
                          className="flex items-start gap-3 rounded-xl px-2 py-2 text-sm hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={estado.categoriasProdutosIds.includes(
                              categoria.id
                            )}
                            onChange={(event) =>
                              selecionarCategoriasProdutos(
                                categoria.id,
                                event.target.checked
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />
                          <span>
                            <span className="block font-medium text-slate-800">
                              {categoria.caminho}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {categoria.slug}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {estado.fonteProdutos === "MANUAL" && (
                  <div className="space-y-4">
                    <label>
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Buscar produto
                      </span>
                      <input
                        value={buscaProdutoManual}
                        onChange={(event) =>
                          setBuscaProdutoManual(event.target.value)
                        }
                        placeholder="Digite nome, código ou categoria"
                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                      />
                    </label>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Disponíveis
                        </p>
                        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                          {produtosFiltradosManual.map((produto) => (
                            <button
                              key={produto.id}
                              type="button"
                              onClick={() => adicionarProdutoManual(produto.id)}
                              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50"
                            >
                              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                {produto.imagemUrl ? (
                                  <img
                                    src={produto.imagemUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-800">
                                  {produto.nome}
                                </span>
                                <span className="block truncate text-xs text-slate-400">
                                  {produto.codigoInterno} · {produto.categoria}
                                </span>
                              </span>
                            </button>
                          ))}

                          {produtosFiltradosManual.length === 0 && (
                            <p className="px-2 py-4 text-sm text-slate-500">
                              Nenhum produto encontrado.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Selecionados
                        </p>
                        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                          {estado.produtosSelecionadosIds.map(
                            (produtoId, index) => {
                              const produto = getProdutoResumo(
                                produtoId,
                                produtosDisponiveis
                              );

                              return (
                                <div
                                  key={produtoId}
                                  className="flex items-center gap-2 rounded-xl border border-slate-100 px-2 py-2"
                                >
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                                    {index + 1}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-slate-800">
                                      {produto?.nome || "Produto indisponível"}
                                    </span>
                                    <span className="block truncate text-xs text-slate-400">
                                      {produto?.codigoInterno || produtoId}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moverProdutoManual(produtoId, "UP")
                                    }
                                    disabled={index === 0}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40"
                                    aria-label="Subir produto"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moverProdutoManual(produtoId, "DOWN")
                                    }
                                    disabled={
                                      index ===
                                      estado.produtosSelecionadosIds.length - 1
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40"
                                    aria-label="Descer produto"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removerProdutoManual(produtoId)
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-500"
                                    aria-label="Remover produto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            }
                          )}

                          {estado.produtosSelecionadosIds.length === 0 && (
                            <p className="px-2 py-4 text-sm text-slate-500">
                              Selecione produtos para montar esta vitrine.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Layout desktop
                </span>

                <select
                  value={estado.layoutDesktopProdutos}
                  onChange={(event) =>
                    onChange({ layoutDesktopProdutos: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {LAYOUT_PRODUTOS_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Layout mobile
                </span>

                <select
                  value={estado.layoutMobileProdutos}
                  onChange={(event) =>
                    onChange({ layoutMobileProdutos: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {LAYOUT_PRODUTOS_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Colunas desktop
                </span>

                <input
                  type="number"
                  min={1}
                  max={6}
                  value={estado.colunasDesktopProdutos}
                  onChange={(event) =>
                    onChange({
                      colunasDesktopProdutos: Number(event.target.value) || 1,
                    })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Colunas tablet
                </span>

                <input
                  type="number"
                  min={1}
                  max={4}
                  value={estado.colunasTabletProdutos}
                  onChange={(event) =>
                    onChange({
                      colunasTabletProdutos: Number(event.target.value) || 1,
                    })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Colunas mobile
                </span>

                <input
                  type="number"
                  min={1}
                  max={3}
                  value={estado.colunasMobileProdutos}
                  onChange={(event) =>
                    onChange({
                      colunasMobileProdutos: Number(event.target.value) || 1,
                    })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <CampoToggle
                checked={estado.exibirPrecoProdutos}
                label="Exibir preço"
                onChange={(checked) =>
                  onChange({ exibirPrecoProdutos: checked })
                }
              />

              <CampoToggle
                checked={estado.exibirBotao}
                label="Exibir botão"
                onChange={(checked) => onChange({ exibirBotao: checked })}
              />

              <CampoToggle
                checked={estado.exibirSeloDescontoProdutos}
                label="Exibir selo/desconto"
                onChange={(checked) =>
                  onChange({ exibirSeloDescontoProdutos: checked })
                }
              />
            </div>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Texto do botão
              </span>

              <input
                value={estado.textoBotao}
                onChange={(event) =>
                  onChange({ textoBotao: event.target.value })
                }
                placeholder="Ex: Comprar"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor de fundo
                </span>

                <select
                  value={estado.corFundo}
                  onChange={(event) =>
                    onChange({ corFundo: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {COR_FUNDO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Espaçamento
                </span>

                <select
                  value={estado.espacamento}
                  onChange={(event) =>
                    onChange({ espacamento: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ESPACAMENTO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : isDestaquesCards ? (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno
              </span>
              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Diferenciais da loja"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Alinhamento
                </span>
                <select
                  value={estado.alinhamentoCards}
                  onChange={(event) =>
                    onChange({ alinhamentoCards: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ALINHAMENTO_CARDS_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <SecaoRecolhivel
              title="Textos / conteúdo"
              description="Título e subtítulo da seção ficam mais confortáveis para editar no preview."
            >
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Título
                </span>
                <input
                  value={estado.titulo}
                  onChange={(event) => onChange({ titulo: event.target.value })}
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Subtítulo
                </span>
                <textarea
                  value={estado.texto}
                  onChange={(event) => onChange({ texto: event.target.value })}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
                />
              </label>
            </SecaoRecolhivel>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Layout desktop
                </span>
                <select
                  value={estado.layoutDesktopCards}
                  onChange={(event) =>
                    onChange({ layoutDesktopCards: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {LAYOUT_PRODUTOS_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Layout mobile
                </span>
                <select
                  value={estado.layoutMobileCards}
                  onChange={(event) =>
                    onChange({ layoutMobileCards: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {LAYOUT_PRODUTOS_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Colunas desktop", "colunasDesktopCards", estado.colunasDesktopCards, 6],
                ["Colunas tablet", "colunasTabletCards", estado.colunasTabletCards, 4],
                ["Colunas mobile", "colunasMobileCards", estado.colunasMobileCards, 3],
              ].map(([label, key, value, max]) => (
                <label key={String(key)}>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    {label}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={Number(max)}
                    value={Number(value)}
                    onChange={(event) =>
                      onChange({
                        [String(key)]: Number(event.target.value) || 1,
                      } as Partial<NonNullable<BlocoEditandoState>>)
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />
                </label>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor de fundo
                </span>
                <select
                  value={estado.corFundo}
                  onChange={(event) =>
                    onChange({ corFundo: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {COR_FUNDO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Espaçamento
                </span>
                <select
                  value={estado.espacamento}
                  onChange={(event) =>
                    onChange({ espacamento: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ESPACAMENTO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">Cards</h3>
                <button
                  type="button"
                  onClick={adicionarCardDestaque}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar card
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {estado.cardsDestaques.map((card, index) => (
                  <div
                    key={card.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-950">
                        Card {index + 1}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moverCardDestaque(card.id, "UP")}
                          disabled={index === 0}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40"
                          aria-label="Subir card"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moverCardDestaque(card.id, "DOWN")}
                          disabled={index === estado.cardsDestaques.length - 1}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40"
                          aria-label="Descer card"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerCardDestaque(card.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-500"
                          aria-label="Remover card"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label>
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Título
                        </span>
                        <input
                          value={card.titulo}
                          onChange={(event) =>
                            atualizarCardDestaque(card.id, {
                              titulo: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                        />
                      </label>

                      <label>
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Tipo de mídia
                        </span>
                        <select
                          value={card.tipoMidia}
                          onChange={(event) =>
                            atualizarCardDestaque(card.id, {
                              tipoMidia: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                        >
                          {TIPO_MIDIA_CARD_PRESETS.map((preset) => (
                            <option key={preset.value} value={preset.value}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Texto
                      </span>
                      <textarea
                        value={card.texto}
                        onChange={(event) =>
                          atualizarCardDestaque(card.id, {
                            texto: event.target.value,
                          })
                        }
                        rows={3}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
                      />
                    </label>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <CampoToggle
                        checked={card.exibirMidia}
                        label="Exibir mídia"
                        onChange={(checked) =>
                          atualizarCardDestaque(card.id, {
                            exibirMidia: checked,
                          })
                        }
                      />
                      <CampoToggle
                        checked={card.exibirBotao}
                        label="Exibir botão"
                        onChange={(checked) =>
                          atualizarCardDestaque(card.id, {
                            exibirBotao: checked,
                          })
                        }
                      />
                    </div>

                    {card.tipoMidia === "IMAGEM" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <UploadMidiaCampo
                          label="Imagem desktop URL"
                          value={card.imagemDesktopUrl}
                          tipoMidia="IMAGEM"
                          onChange={(url) =>
                            atualizarCardDestaque(card.id, {
                              imagemDesktopUrl: url,
                            })
                          }
                          orientacao="Cole uma URL ou envie JPG, PNG ou WebP."
                        />
                        <UploadMidiaCampo
                          label="Imagem mobile URL"
                          value={card.imagemMobileUrl}
                          tipoMidia="IMAGEM"
                          onChange={(url) =>
                            atualizarCardDestaque(card.id, {
                              imagemMobileUrl: url,
                            })
                          }
                          orientacao="Opcional. Quando vazio, usa a imagem desktop."
                        />
                      </div>
                    )}

                    {card.tipoMidia === "VIDEO" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <UploadMidiaCampo
                          label="Vídeo desktop URL"
                          value={card.videoDesktopUrl}
                          tipoMidia="VIDEO"
                          onChange={(url) =>
                            atualizarCardDestaque(card.id, {
                              videoDesktopUrl: url,
                            })
                          }
                          orientacao="Cole uma URL ou envie MP4/WebM. MP4/H.264 é recomendado."
                        />
                        <UploadMidiaCampo
                          label="Vídeo mobile URL"
                          value={card.videoMobileUrl}
                          tipoMidia="VIDEO"
                          onChange={(url) =>
                            atualizarCardDestaque(card.id, {
                              videoMobileUrl: url,
                            })
                          }
                          orientacao="Opcional. Quando vazio, usa o vídeo desktop."
                        />
                      </div>
                    )}

                    {card.tipoMidia === "ICONE" && (
                      <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Ícone
                        </span>
                        <input
                          value={card.icone}
                          onChange={(event) =>
                            atualizarCardDestaque(card.id, {
                              icone: event.target.value,
                            })
                          }
                          placeholder="Ex: estrela, frete, premium"
                          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                        />
                      </label>
                    )}

                    {(card.tipoMidia === "IMAGEM" || card.tipoMidia === "VIDEO") && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label>
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            Crop/posição desktop
                          </span>
                          <select
                            value={card.mediaPositionDesktop}
                            onChange={(event) =>
                              atualizarPosicaoCardDestaque(
                                card.id,
                                "DESKTOP",
                                event.target.value
                              )
                            }
                            className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                          >
                            {MEDIA_POSITION_PRESETS.map((preset) => (
                              <option key={preset.value} value={preset.value}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            Crop/posição mobile
                          </span>
                          <select
                            value={card.mediaPositionMobile}
                            onChange={(event) =>
                              atualizarPosicaoCardDestaque(
                                card.id,
                                "MOBILE",
                                event.target.value
                              )
                            }
                            className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                          >
                            {MEDIA_POSITION_PRESETS.map((preset) => (
                              <option key={preset.value} value={preset.value}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label>
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Texto do botão
                        </span>
                        <input
                          value={card.textoBotao}
                          onChange={(event) =>
                            atualizarCardDestaque(card.id, {
                              textoBotao: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Link do botão
                        </span>
                        <input
                          value={card.linkBotao}
                          onChange={(event) =>
                            atualizarCardDestaque(card.id, {
                              linkBotao: event.target.value,
                            })
                          }
                          placeholder="/loja/colecao"
                          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno do bloco
              </span>

              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Banner principal"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Título
              </span>

              <input
                value={estado.titulo}
                onChange={(event) => onChange({ titulo: event.target.value })}
                placeholder="Título visível"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Texto
              </span>

              <textarea
                value={estado.texto}
                onChange={(event) => onChange({ texto: event.target.value })}
                rows={5}
                placeholder="Texto do bloco"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Imagem URL
              </span>

              <input
                value={estado.imagemUrl}
                onChange={(event) =>
                  onChange({ imagemUrl: event.target.value })
                }
                placeholder="/uploads/imagem.jpg ou https://..."
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do botão
                </span>

                <input
                  value={estado.textoBotao}
                  onChange={(event) =>
                    onChange({ textoBotao: event.target.value })
                  }
                  placeholder="Ex: Comprar agora"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do botão
                </span>

                <input
                  value={estado.linkBotao}
                  onChange={(event) =>
                    onChange({ linkBotao: event.target.value })
                  }
                  placeholder="/loja/descontos"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor de fundo
                </span>

                <select
                  value={estado.corFundo}
                  onChange={(event) =>
                    onChange({ corFundo: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {COR_FUNDO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Espaçamento
                </span>

                <select
                  value={estado.espacamento}
                  onChange={(event) =>
                    onChange({ espacamento: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ESPACAMENTO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Esta é a primeira camada de edição visual. Nas próximas etapas,
              vamos adicionar imagem desktop/mobile, crop e editor rico de
              texto.
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar conteúdo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdicionarBlocoModal({
  aberto,
  onClose,
  onSelect,
  salvando,
}: {
  aberto: boolean;
  onClose: () => void;
  onSelect: (tipo: TipoBlocoAdicionar) => void;
  salvando: boolean;
}) {
  if (!aberto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Editor visual
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Adicionar bloco
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Escolha um tipo de bloco para inserir na página.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Fechar seleção de bloco"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          {TIPOS_BLOCO_ADICIONAR.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.tipo}
                type="button"
                onClick={() => onSelect(item.tipo)}
                disabled={salvando}
                className="flex min-h-28 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>

                <span>
                  <span className="block text-sm font-semibold text-slate-950">
                    {item.nome}
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    {item.descricao}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EditorVisualPaginaClient({
  pagina,
  blocos,
  categoriasDisponiveis,
  produtosDisponiveis,
}: EditorVisualPaginaClientProps) {
  const [isPending] = useTransition();
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ordemSalvando, setOrdemSalvando] = useState(false);
  const [editando, setEditando] = useState<BlocoEditandoState>(null);
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [blocosComTextoPendente, setBlocosComTextoPendente] = useState<string[]>(
    []
  );

  const [blocosEditor, setBlocosEditor] = useState<EditorVisualBloco[]>(() =>
    ordenarBlocos(blocos)
  );

  const blocosOrdenados = useMemo(() => {
    return ordenarBlocos(blocosEditor);
  }, [blocosEditor]);

  const [device, setDevice] = useState<DevicePreview>("DESKTOP");
  const [blocoSelecionadoId, setBlocoSelecionadoId] = useState(
    blocosOrdenados[0]?.id || ""
  );

  const blocoSelecionado =
    blocosOrdenados.find((bloco) => bloco.id === blocoSelecionadoId) || null;

  function getBlocoEditorAtual(blocoId: string) {
    return blocosEditor.find((bloco) => bloco.id === blocoId) || null;
  }

  function atualizarBlocoLocal(
    blocoId: string,
    data: Partial<EditorVisualBloco>
  ) {
    setBlocosEditor((current) =>
      current.map((bloco) =>
        bloco.id === blocoId
          ? {
              ...bloco,
              ...data,
            }
          : bloco
      )
    );
  }

  function marcarTextoPendente(blocoId: string) {
    setBlocosComTextoPendente((current) =>
      current.includes(blocoId) ? current : [...current, blocoId]
    );
  }

  function atualizarTextoInline(
    blocoId: string,
    patch: Record<string, unknown>
  ) {
    marcarTextoPendente(blocoId);
    setBlocosEditor((current) =>
      current.map((bloco) =>
        bloco.id === blocoId
          ? {
              ...bloco,
              configJson: {
                ...getConfigObject(bloco.configJson),
                ...patch,
              },
            }
          : bloco
      )
    );
  }

  function atualizarCardInline(
    blocoId: string,
    cardId: string,
    patch: Partial<DestaqueCardEditando>
  ) {
    marcarTextoPendente(blocoId);
    setBlocosEditor((current) =>
      current.map((bloco) => {
        if (bloco.id !== blocoId) return bloco;

        const config = getConfigObject(bloco.configJson);
        const cards = getCardsDestaquesConfig(config).map((card) =>
          card.id === cardId ? { ...card, ...patch } : card
        );

        return {
          ...bloco,
          configJson: {
            ...config,
            cards,
          },
        };
      })
    );
  }

  async function atualizarBloco(
    bloco: EditorVisualBloco,
    data: Partial<EditorVisualBloco>
  ): Promise<boolean> {
    setErro("");
    setSucesso("");

    const blocoAnterior = { ...bloco };
    atualizarBlocoLocal(bloco.id, data);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}/blocos/${bloco.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await lerRespostaApi(response);

      if (!response.ok) {
        atualizarBlocoLocal(bloco.id, blocoAnterior);
        setErro(result.error || result.message || "Erro ao atualizar bloco.");
        return false;
      }

      if (result.bloco) {
        atualizarBlocoLocal(bloco.id, {
          titulo: result.bloco.titulo,
          ativo: result.bloco.ativo,
          ordem: result.bloco.ordem,
          configJson: result.bloco.configJson,
          atualizadoEm:
            typeof result.bloco.atualizadoEm === "string"
              ? result.bloco.atualizadoEm
              : new Date().toISOString(),
        });
      }

      setSucesso("Bloco atualizado.");
      return true;
    } catch {
      atualizarBlocoLocal(bloco.id, blocoAnterior);
      setErro("Erro ao atualizar bloco.");
      return false;
    }
  }

  async function salvarOrdemBlocos(novaLista: EditorVisualBloco[]) {
    setErro("");
    setSucesso("");
    setOrdemSalvando(true);

    const listaAnterior = [...blocosEditor];
    setBlocosEditor(novaLista);

    try {
      const responses = await Promise.all(
        novaLista.map((bloco, index) =>
          fetch(
            `/api/configuracoes/loja/paginas/${pagina.id}/blocos/${bloco.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ordem: index,
              }),
            }
          )
        )
      );

      const erroResponse = responses.find((response) => !response.ok);

      if (erroResponse) {
        setBlocosEditor(listaAnterior);
        setErro("Erro ao salvar ordem dos blocos.");
        return;
      }

      setSucesso("Ordem dos blocos atualizada.");
    } catch {
      setBlocosEditor(listaAnterior);
      setErro("Erro ao salvar ordem dos blocos.");
    } finally {
      setOrdemSalvando(false);
    }
  }

  async function moverBlocoPorSeta(blocoId: string, direcao: "CIMA" | "BAIXO") {
    if (ordemSalvando) return;

    const indexAtual = blocosOrdenados.findIndex((bloco) => bloco.id === blocoId);

    if (indexAtual < 0) return;

    const novoIndex = direcao === "CIMA" ? indexAtual - 1 : indexAtual + 1;

    if (novoIndex < 0 || novoIndex >= blocosOrdenados.length) return;

    const novaLista = [...blocosOrdenados];
    const [blocoMovido] = novaLista.splice(indexAtual, 1);

    novaLista.splice(novoIndex, 0, blocoMovido);

    const listaComOrdem = novaLista.map((bloco, index) => ({
      ...bloco,
      ordem: index,
    }));

    await salvarOrdemBlocos(listaComOrdem);
  }

  async function excluirBloco(bloco: EditorVisualBloco) {
    const confirmado = window.confirm(
      `Excluir o bloco ${bloco.titulo || getTipoLabel(bloco.tipo)}?`
    );

    if (!confirmado) return;

    setErro("");
    setSucesso("");

    const listaAnterior = [...blocosEditor];

    setBlocosEditor((current) => current.filter((item) => item.id !== bloco.id));

    if (blocoSelecionadoId === bloco.id) {
      const proximoBloco = blocosOrdenados.find((item) => item.id !== bloco.id);
      setBlocoSelecionadoId(proximoBloco?.id || "");
    }

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}/blocos/${bloco.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setBlocosEditor(listaAnterior);
        setErro(data.error || data.message || "Erro ao excluir bloco.");
        return;
      }

      setSucesso("Bloco excluído.");
    } catch {
      setBlocosEditor(listaAnterior);
      setErro("Erro ao excluir bloco.");
    }
  }

  async function salvarTextosInline(bloco: EditorVisualBloco) {
    const blocoAtual = getBlocoEditorAtual(bloco.id) || bloco;

    const salvo = await atualizarBloco(blocoAtual, {
      configJson: getConfigObject(blocoAtual.configJson),
    });

    if (salvo) {
      setBlocosComTextoPendente((current) =>
        current.filter((blocoId) => blocoId !== bloco.id)
      );
      setSucesso("Textos do bloco salvos.");
    }
  }

  async function criarBloco(tipo: TipoBlocoAdicionar) {
    const tipoSelecionado = TIPOS_BLOCO_ADICIONAR.find(
      (item) => item.tipo === tipo
    );

    if (!tipoSelecionado) return;

    setErro("");
    setSucesso("");
    setSalvando(true);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}/blocos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: tipoSelecionado.tipo,
            titulo: tipoSelecionado.tituloInicial,
          }),
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || data.message || "Erro ao criar bloco.");
        return;
      }

      if (data.bloco) {
        const novoBloco: EditorVisualBloco = {
          id: data.bloco.id,
          tipo: data.bloco.tipo,
          titulo: data.bloco.titulo,
          ativo: data.bloco.ativo,
          ordem: data.bloco.ordem,
          configJson: data.bloco.configJson,
          criadoEm:
            typeof data.bloco.criadoEm === "string"
              ? data.bloco.criadoEm
              : new Date().toISOString(),
          atualizadoEm:
            typeof data.bloco.atualizadoEm === "string"
              ? data.bloco.atualizadoEm
              : new Date().toISOString(),
        };

        setBlocosEditor((current) => ordenarBlocos([...current, novoBloco]));
        setBlocoSelecionadoId(novoBloco.id);
        setModalAdicionarAberto(false);
        setSucesso("Bloco criado.");
      }
    } catch {
      setErro("Erro ao criar bloco.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirEdicaoBloco(bloco: EditorVisualBloco) {
    const blocoAtual = getBlocoEditorAtual(bloco.id) || bloco;
    const config = getConfigObject(blocoAtual.configJson);
    const textoBotaoFallback = isBannerTipo(blocoAtual.tipo) ? "Conhecer" : "";

    setEditando({
      bloco: blocoAtual,
      nomeInterno: blocoAtual.titulo || "",
      titulo: getStringConfig(config, "titulo") || blocoAtual.titulo || "",
      texto:
        getStringConfig(config, "texto") ||
        getStringConfig(config, "descricao") ||
        getStringConfig(config, "conteudo"),
      imagemUrl:
        getStringConfig(config, "imagemUrl") ||
        getStringConfig(config, "imagem") ||
        getStringConfig(config, "backgroundImageUrl"),
      imagemDesktopUrl:
        getStringConfig(config, "imagemDesktopUrl") ||
        getStringConfig(config, "imagemDesktop") ||
        getStringConfig(config, "imagemUrl") ||
        getStringConfig(config, "imagem") ||
        getStringConfig(config, "backgroundImageUrl"),
      imagemMobileUrl:
        getStringConfig(config, "imagemMobileUrl") ||
        getStringConfig(config, "imagemMobile"),
      videoDesktopUrl: getStringConfig(config, "videoDesktopUrl"),
      videoMobileUrl: getStringConfig(config, "videoMobileUrl"),
      videoPosterUrl: getStringConfig(config, "videoPosterUrl"),
      videoLoop: getBooleanConfig(config, "videoLoop", true),
      videoSom: getStringConfig(config, "videoSom") || "MUDO",
      exibirMidia: getBooleanConfig(config, "exibirMidia", true),
      textoBotao: getStringConfigWithDefault(
        config,
        ["textoBotao", "botaoTexto", "textoBotaoPrimario"],
        textoBotaoFallback
      ),
      textoBotaoSecundario: getStringConfigWithDefault(
        config,
        ["textoBotaoSecundario", "botaoSecundarioTexto"],
        ""
      ),
      linkBotao: getStringConfigWithDefault(
        config,
        ["linkBotao", "botaoLink", "linkUrl", "linkBotaoPrimario"],
        ""
      ),
      linkBotaoSecundario: getStringConfigWithDefault(
        config,
        ["linkBotaoSecundario", "botaoSecundarioLink"],
        ""
      ),
      exibirBotao: getBooleanConfig(config, "exibirBotao", true),
      layoutDesktopTextoImagem: normalizarLayoutDesktopTextoImagem(
        getStringConfig(config, "layoutDesktop") ||
          getStringConfig(config, "layoutDesktopTextoImagem") ||
          getStringConfig(config, "posicaoImagem")
      ),
      layoutMobileTextoImagem: normalizarLayoutMobileTextoImagem(
        getStringConfig(config, "layoutMobile") ||
          getStringConfig(config, "layoutMobileTextoImagem")
      ),
      fonteProdutos: getStringConfig(config, "fonte") || "TODOS",
      categoriaProdutoId: getStringConfig(config, "categoriaId"),
      categoriaProdutoSlug: getStringConfig(config, "categoriaSlug"),
      categoriaProdutoNome: getStringConfig(config, "categoriaNome"),
      categoriasProdutosIds: getStringArrayConfig(config, [
        "categoriasIds",
        "categorias",
      ]),
      categoriasProdutosSlugs: getStringArrayConfig(config, ["categoriasSlugs"]),
      categoriasProdutosNomes: getStringArrayConfig(config, ["categoriasNomes"]),
      produtosSelecionadosIds: getStringArrayConfig(config, ["produtosIds"]),
      limiteProdutos: getNumberConfig(config, "limite", 8),
      layoutDesktopProdutos:
        getStringConfig(config, "layoutDesktop") ||
        getStringConfig(config, "modo") ||
        "GRID",
      layoutMobileProdutos: getStringConfig(config, "layoutMobile") || "GRID",
      colunasDesktopProdutos: getNumberConfig(
        config,
        "colunasDesktop",
        getNumberConfig(config, "produtosPorLinha", 4)
      ),
      colunasTabletProdutos: getNumberConfig(config, "colunasTablet", 3),
      colunasMobileProdutos: getNumberConfig(config, "colunasMobile", 2),
      exibirPrecoProdutos: getBooleanConfig(config, "exibirPreco", true),
      exibirSeloDescontoProdutos: getBooleanConfig(
        config,
        "exibirSeloDesconto",
        true
      ),
      layoutDesktopCards: normalizarLayoutCards(
        getStringConfig(config, "layoutDesktop")
      ),
      layoutMobileCards: normalizarLayoutCards(
        getStringConfig(config, "layoutMobile")
      ),
      layoutDesktopCta: normalizarLayoutCta(getStringConfig(config, "layoutDesktop")),
      layoutMobileCta: normalizarLayoutCta(getStringConfig(config, "layoutMobile")),
      alinhamentoCta: normalizarAlinhamentoCta(
        getStringConfig(config, "alinhamento")
      ),
      larguraConteudoCta: normalizarLarguraConteudoCta(
        getStringConfig(config, "larguraConteudo")
      ),
      colunasDesktopCards: getNumberConfig(config, "colunasDesktop", 3),
      colunasTabletCards: getNumberConfig(config, "colunasTablet", 2),
      colunasMobileCards: getNumberConfig(config, "colunasMobile", 1),
      alinhamentoCards: normalizarAlinhamentoCards(
        getStringConfig(config, "alinhamento")
      ),
      cardsDestaques: getCardsDestaquesConfig(config),
      mediaCropDesktopX: getNumberConfig(config, "mediaCropDesktopX", 50),
      mediaCropDesktopY: getNumberConfig(config, "mediaCropDesktopY", 50),
      mediaCropMobileX: getNumberConfig(config, "mediaCropMobileX", 50),
      mediaCropMobileY: getNumberConfig(config, "mediaCropMobileY", 50),
      mediaPositionDesktop: normalizarMediaPosition(
        getStringConfig(config, "mediaPositionDesktop")
      ),
      mediaPositionMobile: normalizarMediaPosition(
        getStringConfig(config, "mediaPositionMobile")
      ),
      corFundo: getStringConfig(config, "corFundo") || "BRANCO",
      espacamento: getStringConfig(config, "espacamento") || "PADRAO",
      alinhamentoConteudo:
        getStringConfig(config, "alinhamentoConteudo") || "ESQUERDA",
      alturaBanner: getStringConfig(config, "alturaBanner") || "PADRAO",
      overlayBanner: getStringConfig(config, "overlayBanner") || "LEVE",
      corTextoBanner: getStringConfig(config, "corTextoBanner") || "CLARO",
      tipoMidia: getStringConfig(config, "tipoMidia") || "IMAGEM",
      exibirTexto: getBooleanConfig(config, "exibirTexto", true),
      exibirSubtitulo: getBooleanConfig(config, "exibirSubtitulo", true),
      exibirBotaoPrimario: getBooleanConfig(
        config,
        "exibirBotaoPrimario",
        true
      ),
      exibirBotaoSecundario: getBooleanConfig(
        config,
        "exibirBotaoSecundario",
        false
      ),
      tituloStyle: getTextStyleConfig(config, "tituloStyle"),
      subtituloStyle: getTextStyleConfig(config, "subtituloStyle"),
      botaoPrimarioStyle: getTextStyleConfig(config, "botaoPrimarioStyle"),
      botaoSecundarioStyle: getTextStyleConfig(config, "botaoSecundarioStyle"),
      textoStyle: getTextStyleConfig(config, "textoStyle"),
      botaoStyle: getTextStyleConfig(config, "botaoStyle"),
      nomeProdutoStyle: getTextStyleConfig(config, "nomeProdutoStyle"),
      precoProdutoStyle: getTextStyleConfig(config, "precoProdutoStyle"),
      tituloSecaoStyle: getTextStyleConfig(config, "tituloSecaoStyle"),
      subtituloSecaoStyle: getTextStyleConfig(config, "subtituloSecaoStyle"),
      cardTituloStyle: getTextStyleConfig(config, "cardTituloStyle"),
      cardTextoStyle: getTextStyleConfig(config, "cardTextoStyle"),
      cardBotaoStyle: getTextStyleConfig(config, "cardBotaoStyle"),
    });
  }

  function atualizarEdicao(data: Partial<NonNullable<BlocoEditandoState>>) {
    setEditando((current) =>
      current
        ? {
            ...current,
            ...data,
          }
        : current
    );
  }

  async function salvarEdicaoBloco() {
    if (!editando) return;

    setErro("");
    setSucesso("");
    setSalvando(true);

    const blocoAtual = getBlocoEditorAtual(editando.bloco.id) || editando.bloco;
    const configAtual = getConfigObject(blocoAtual.configJson);

    const isBanner = isBannerTipo(blocoAtual.tipo);
    const isTextoImagem = isTextoImagemTipo(blocoAtual.tipo);
    const isListaProdutos = isListaProdutosTipo(blocoAtual.tipo);
    const isDestaquesCards = isDestaquesCardsTipo(blocoAtual.tipo);
    const isCta = isCtaTipo(blocoAtual.tipo);
    const tituloAtual =
      getStringConfig(configAtual, "titulo") || blocoAtual.titulo || "";
    const textoAtual =
      getStringConfig(configAtual, "texto") ||
      getStringConfig(configAtual, "descricao") ||
      getStringConfig(configAtual, "conteudo");
    const tituloTextoImagemMudou =
      isTextoImagem && editando.titulo !== tituloAtual;
    const textoTextoImagemMudou = isTextoImagem && editando.texto !== textoAtual;
    const tituloTextoImagemRichText = editando.titulo.trim()
      ? getRichTextFallback(editando.titulo.trim())
      : null;
    const textoTextoImagemRichText = editando.texto.trim()
      ? getRichTextFallback(editando.texto.trim())
      : null;

    const novoConfig = {
      ...configAtual,
      titulo: editando.titulo,
      texto: editando.texto,
      descricao: editando.texto,
      conteudo: editando.texto,
      textoBotao: editando.textoBotao,
      botaoTexto: editando.textoBotao,
      linkBotao: editando.linkBotao,
      botaoLink: editando.linkBotao,
      linkUrl: editando.linkBotao,
      tituloStyle: editando.tituloStyle,
      subtituloStyle: editando.subtituloStyle,
      botaoPrimarioStyle: editando.botaoPrimarioStyle,
      botaoSecundarioStyle: editando.botaoSecundarioStyle,
      textoStyle: editando.textoStyle,
      botaoStyle: editando.botaoStyle,
      nomeProdutoStyle: editando.nomeProdutoStyle,
      precoProdutoStyle: editando.precoProdutoStyle,
      tituloSecaoStyle: editando.tituloSecaoStyle,
      subtituloSecaoStyle: editando.subtituloSecaoStyle,
      cardTituloStyle: editando.cardTituloStyle,
      cardTextoStyle: editando.cardTextoStyle,
      cardBotaoStyle: editando.cardBotaoStyle,
      ...(isBanner
          ? {
              tipoMidia: editando.tipoMidia,
              exibirMidia: editando.exibirMidia,
              exibirTexto: editando.exibirTexto,
              exibirSubtitulo: editando.exibirSubtitulo,
            exibirBotaoPrimario: editando.exibirBotaoPrimario,
            exibirBotaoSecundario: editando.exibirBotaoSecundario,
            imagemDesktopUrl: editando.imagemDesktopUrl,
            imagemDesktop: editando.imagemDesktopUrl,
            imagemMobileUrl: editando.imagemMobileUrl,
            imagemMobile: editando.imagemMobileUrl,
            imagemUrl: editando.imagemDesktopUrl,
            videoDesktopUrl: editando.videoDesktopUrl,
            videoMobileUrl: editando.videoMobileUrl,
            videoPosterUrl: editando.videoPosterUrl,
            videoLoop: editando.videoLoop,
            videoSom: editando.videoSom,
            textoBotaoSecundario: editando.textoBotaoSecundario,
            botaoSecundarioTexto: editando.textoBotaoSecundario,
            linkBotaoSecundario: editando.linkBotaoSecundario,
            botaoSecundarioLink: editando.linkBotaoSecundario,
              alinhamentoConteudo: editando.alinhamentoConteudo,
              alturaBanner: editando.alturaBanner,
              overlayBanner: editando.overlayBanner,
              corTextoBanner: editando.corTextoBanner,
              mediaCropDesktopX: editando.mediaCropDesktopX,
              mediaCropDesktopY: editando.mediaCropDesktopY,
              mediaCropMobileX: editando.mediaCropMobileX,
              mediaCropMobileY: editando.mediaCropMobileY,
              mediaPositionDesktop: editando.mediaPositionDesktop,
              mediaPositionMobile: editando.mediaPositionMobile,
            }
        : isTextoImagem
          ? {
              ...(tituloTextoImagemMudou
                ? {
                    tituloRichText: tituloTextoImagemRichText,
                  }
                : {}),
              ...(textoTextoImagemMudou
                ? {
                    textoRichText: textoTextoImagemRichText,
                    subtituloRichText: textoTextoImagemRichText,
                  }
                : {}),
              tipoMidia: editando.tipoMidia,
              exibirMidia: editando.exibirMidia,
              imagemDesktopUrl: editando.imagemDesktopUrl,
              imagemDesktop: editando.imagemDesktopUrl,
              imagemMobileUrl: editando.imagemMobileUrl,
              imagemMobile: editando.imagemMobileUrl,
              imagemUrl: editando.imagemDesktopUrl,
              videoDesktopUrl: editando.videoDesktopUrl,
              videoMobileUrl: editando.videoMobileUrl,
              exibirBotao: editando.exibirBotao,
              layoutDesktop: editando.layoutDesktopTextoImagem,
              layoutDesktopTextoImagem: editando.layoutDesktopTextoImagem,
              layoutMobile: editando.layoutMobileTextoImagem,
              layoutMobileTextoImagem: editando.layoutMobileTextoImagem,
              posicaoImagem:
                editando.layoutDesktopTextoImagem === "IMAGEM_DIREITA"
                  ? "DIREITA"
                  : "ESQUERDA",
              corFundo: editando.corFundo,
              espacamento: editando.espacamento,
              mediaCropDesktopX: editando.mediaCropDesktopX,
              mediaCropDesktopY: editando.mediaCropDesktopY,
              mediaCropMobileX: editando.mediaCropMobileX,
              mediaCropMobileY: editando.mediaCropMobileY,
              mediaPositionDesktop: editando.mediaPositionDesktop,
              mediaPositionMobile: editando.mediaPositionMobile,
            }
        : isListaProdutos
          ? {
              descricao: editando.texto,
              fonte: editando.fonteProdutos,
              categoriaId: editando.categoriaProdutoId,
              categoriaSlug: editando.categoriaProdutoSlug,
              categoriaNome: editando.categoriaProdutoNome,
              categoriasIds: editando.categoriasProdutosIds,
              categoriasSlugs: editando.categoriasProdutosSlugs,
              categoriasNomes: editando.categoriasProdutosNomes,
              categorias: editando.categoriasProdutosIds,
              produtosIds: editando.produtosSelecionadosIds,
              limite: Math.max(1, Number(editando.limiteProdutos) || 1),
              modo: editando.layoutDesktopProdutos,
              layoutDesktop: editando.layoutDesktopProdutos,
              layoutMobile: editando.layoutMobileProdutos,
              colunasDesktop: Math.max(
                1,
                Number(editando.colunasDesktopProdutos) || 1
              ),
              colunasTablet: Math.max(
                1,
                Number(editando.colunasTabletProdutos) || 1
              ),
              colunasMobile: Math.max(
                1,
                Number(editando.colunasMobileProdutos) || 1
              ),
              produtosPorLinha: Math.max(
                1,
                Number(editando.colunasDesktopProdutos) || 1
              ),
              exibirPreco: editando.exibirPrecoProdutos,
              exibirBotao: editando.exibirBotao,
              textoBotao: editando.textoBotao,
              botaoTexto: editando.textoBotao,
              exibirSeloDesconto: editando.exibirSeloDescontoProdutos,
              corFundo: editando.corFundo,
              espacamento: editando.espacamento,
            }
        : isDestaquesCards
          ? {
              descricao: editando.texto,
              layoutDesktop: editando.layoutDesktopCards,
              layoutMobile: editando.layoutMobileCards,
              colunasDesktop: Math.max(
                1,
                Number(editando.colunasDesktopCards) || 1
              ),
              colunasTablet: Math.max(
                1,
                Number(editando.colunasTabletCards) || 1
              ),
              colunasMobile: Math.max(
                1,
                Number(editando.colunasMobileCards) || 1
              ),
              alinhamento: editando.alinhamentoCards,
              corFundo: editando.corFundo,
              espacamento: editando.espacamento,
              cards: editando.cardsDestaques.map((card) => ({
                id: card.id,
                titulo: card.titulo,
                texto: card.texto,
                tituloRichText: card.tituloRichText,
                textoRichText: card.textoRichText,
                exibirMidia: card.exibirMidia,
                tipoMidia: card.tipoMidia,
                imagemUrl: card.imagemDesktopUrl,
                imagemDesktopUrl: card.imagemDesktopUrl,
                imagemMobileUrl: card.imagemMobileUrl,
                videoDesktopUrl: card.videoDesktopUrl,
                videoMobileUrl: card.videoMobileUrl,
                icone: card.icone,
                mediaPositionDesktop: card.mediaPositionDesktop,
                mediaPositionMobile: card.mediaPositionMobile,
                mediaCropDesktopX: card.mediaCropDesktopX,
                mediaCropDesktopY: card.mediaCropDesktopY,
                mediaCropMobileX: card.mediaCropMobileX,
                mediaCropMobileY: card.mediaCropMobileY,
                exibirBotao: card.exibirBotao,
                textoBotao: card.textoBotao,
                linkBotao: card.linkBotao,
              })),
            }
        : isCta
          ? {
              descricao: editando.texto,
              conteudo: editando.texto,
              exibirTexto: editando.exibirTexto,
              exibirBotaoPrimario: editando.exibirBotaoPrimario,
              textoBotaoPrimario: editando.textoBotao,
              linkBotaoPrimario: editando.linkBotao,
              textoBotao: editando.textoBotao,
              botaoTexto: editando.textoBotao,
              linkBotao: editando.linkBotao,
              botaoLink: editando.linkBotao,
              linkUrl: editando.linkBotao,
              exibirBotaoSecundario: editando.exibirBotaoSecundario,
              textoBotaoSecundario: editando.textoBotaoSecundario,
              botaoSecundarioTexto: editando.textoBotaoSecundario,
              linkBotaoSecundario: editando.linkBotaoSecundario,
              botaoSecundarioLink: editando.linkBotaoSecundario,
              alinhamento: editando.alinhamentoCta,
              larguraConteudo: editando.larguraConteudoCta,
              corFundo: editando.corFundo,
              espacamento: editando.espacamento,
              layoutDesktop: editando.layoutDesktopCta,
              layoutMobile: editando.layoutMobileCta,
              exibirMidia: editando.exibirMidia,
              tipoMidia: editando.tipoMidia,
              imagemDesktopUrl: editando.imagemDesktopUrl,
              imagemDesktop: editando.imagemDesktopUrl,
              imagemMobileUrl: editando.imagemMobileUrl,
              imagemMobile: editando.imagemMobileUrl,
              imagemUrl: editando.imagemDesktopUrl,
              videoDesktopUrl: editando.videoDesktopUrl,
              videoMobileUrl: editando.videoMobileUrl,
              videoPosterUrl: editando.videoPosterUrl,
              videoLoop: editando.videoLoop,
              videoSom: editando.videoSom,
              mediaCropDesktopX: editando.mediaCropDesktopX,
              mediaCropDesktopY: editando.mediaCropDesktopY,
              mediaCropMobileX: editando.mediaCropMobileX,
              mediaCropMobileY: editando.mediaCropMobileY,
              mediaPositionDesktop: editando.mediaPositionDesktop,
              mediaPositionMobile: editando.mediaPositionMobile,
            }
        : {
            imagemUrl: editando.imagemUrl,
            corFundo: editando.corFundo,
            espacamento: editando.espacamento,
          }),
    };

    try {
      const salvo = await atualizarBloco(blocoAtual, {
        titulo: editando.nomeInterno || editando.titulo || blocoAtual.titulo,
        configJson: novoConfig,
      });

      if (salvo) {
        setBlocosComTextoPendente((current) =>
          current.filter((blocoId) => blocoId !== editando.bloco.id)
        );
        setEditando(null);
        setSucesso("Conteúdo do bloco salvo.");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {(erro || sucesso) && (
        <div>
          {erro && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {sucesso}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="h-fit rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 xl:sticky xl:top-6">
          <div className="flex items-center gap-2">
            <PanelRight className="h-5 w-5 text-slate-400" />

            <h2 className="text-sm font-bold text-slate-950">Blocos</h2>
          </div>

          <button
            type="button"
            onClick={() => setModalAdicionarAberto(true)}
            disabled={salvando || isPending}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {salvando ? "Criando..." : "Adicionar bloco"}
          </button>

          <div className="mt-4 space-y-2">
            {blocosOrdenados.map((bloco) => {
              const Icon = getBlocoIcon(bloco.tipo);
              const selecionado = bloco.id === blocoSelecionadoId;

              return (
                <button
                  key={bloco.id}
                  type="button"
                  onClick={() => setBlocoSelecionadoId(bloco.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    selecionado
                      ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {bloco.titulo || getTipoLabel(bloco.tipo)}
                    </span>

                    <span className="mt-0.5 block text-xs text-slate-500">
                      {getTipoLabel(bloco.tipo)} · Ordem {bloco.ordem}
                    </span>

                    {!bloco.ativo && (
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Inativo
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            {blocosOrdenados.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum bloco nesta página.
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Preview ao vivo
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Primeira versão visual. A renderização ainda é simulada e será
                aproximada da loja pública nas próximas etapas.
              </p>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setDevice("DESKTOP")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  device === "DESKTOP"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </button>

              <button
                type="button"
                onClick={() => setDevice("TABLET")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  device === "TABLET"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Tablet className="h-4 w-4" />
                Tablet
              </button>

              <button
                type="button"
                onClick={() => setDevice("MOBILE")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  device === "MOBILE"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </button>
            </div>
          </div>

          <PreviewShell device={device}>
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-950">
                  STELLA
                </div>

                {device !== "MOBILE" ? (
                  <div className="flex gap-5 text-sm text-slate-500">
                    <span>Home</span>
                    <span>Categorias</span>
                    <span>Descontos</span>
                  </div>
                ) : (
                  <MousePointer2 className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>

            {blocosOrdenados.map((bloco) => (
              <RenderBlocoPreview
                key={bloco.id}
                bloco={bloco}
                selecionado={bloco.id === blocoSelecionadoId}
                onSelect={() => setBlocoSelecionadoId(bloco.id)}
                onEdit={() => abrirEdicaoBloco(bloco)}
                device={device}
                onInlineTextChange={atualizarTextoInline}
                onInlineCardChange={atualizarCardInline}
              />
            ))}

            {blocosOrdenados.length === 0 && (
              <div className="flex min-h-[420px] items-center justify-center bg-white p-8 text-center">
                <div>
                  <LayoutGrid className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Página sem blocos
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Adicione o primeiro bloco para começar a montar a página.
                  </p>
                </div>
              </div>
            )}
          </PreviewShell>
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 xl:sticky xl:top-6">
          <div className="flex items-center gap-2">
            <PanelRight className="h-5 w-5 text-slate-400" />

            <h2 className="text-sm font-bold text-slate-950">Painel lateral</h2>
          </div>

          {blocoSelecionado ? (
            <div className="mt-5 space-y-5">
              <PainelSecao title="Conteúdo">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Bloco selecionado
                </p>

                <h3 className="mt-1 text-lg font-semibold text-slate-950">
                  {blocoSelecionado.titulo ||
                    getTipoLabel(blocoSelecionado.tipo)}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {getTipoLabel(blocoSelecionado.tipo)} · Ordem{" "}
                  {blocoSelecionado.ordem}
                </p>

                <button
                  type="button"
                  onClick={() => abrirEdicaoBloco(blocoSelecionado)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Type className="h-4 w-4" />
                  Editar conteúdo básico
                </button>

                {blocosComTextoPendente.includes(blocoSelecionado.id) && (
                  <button
                    type="button"
                    onClick={() => void salvarTextosInline(blocoSelecionado)}
                    disabled={salvando}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {salvando ? "Salvando..." : "Salvar textos do preview"}
                  </button>
                )}
              </PainelSecao>

              <PainelSecao title="Aparência">
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Cor de fundo e espaçamento ficam no modal de conteúdo nesta
                  etapa. Eles são salvos junto com as configurações existentes do
                  bloco.
                </p>
              </PainelSecao>

              <PainelSecao title="Dispositivo atual">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  {device === "DESKTOP" && <Monitor className="h-4 w-4" />}
                  {device === "TABLET" && <Tablet className="h-4 w-4" />}
                  {device === "MOBILE" && <Smartphone className="h-4 w-4" />}
                  {getFrameLabel(device)}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {getDeviceDescription(device)}
                </p>
              </PainelSecao>

              <PainelSecao title="Ações do bloco">
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void atualizarBloco(blocoSelecionado, {
                        ativo: !blocoSelecionado.ativo,
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {blocoSelecionado.ativo ? "Ocultar bloco" : "Ativar bloco"}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void moverBlocoPorSeta(blocoSelecionado.id, "CIMA")
                      }
                      disabled={ordemSalvando}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowUp className="h-4 w-4" />
                      Subir
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void moverBlocoPorSeta(blocoSelecionado.id, "BAIXO")
                      }
                      disabled={ordemSalvando}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowDown className="h-4 w-4" />
                      Descer
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void excluirBloco(blocoSelecionado)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir bloco
                  </button>
                </div>
              </PainelSecao>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Categorias disponíveis
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {categoriasDisponiveis.length} categorias carregadas para uso
                  em blocos de produtos, categorias e campanhas.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <PanelRight className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Nenhum bloco selecionado
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Clique em um bloco no preview ou na lista para editar suas
                configurações.
              </p>
            </div>
          )}
        </aside>
      </div>

      <EditorConteudoBlocoModal
        estado={editando}
        categoriasDisponiveis={categoriasDisponiveis}
        produtosDisponiveis={produtosDisponiveis}
        onChange={atualizarEdicao}
        onClose={() => setEditando(null)}
        onSave={() => void salvarEdicaoBloco()}
        salvando={salvando}
      />

      <AdicionarBlocoModal
        aberto={modalAdicionarAberto}
        onClose={() => setModalAdicionarAberto(false)}
        onSelect={(tipo) => void criarBloco(tipo)}
        salvando={salvando}
      />
    </div>
  );
}
