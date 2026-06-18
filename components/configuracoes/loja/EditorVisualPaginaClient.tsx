"use client";

import NextLink from "next/link";
import type {
  CSSProperties,
  ChangeEvent,
  DragEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Eye,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Layers,
  LayoutGrid,
  Monitor,
  MousePointer2,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
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
import BannerRenderer, {
  BANNER_MODELO_LABELS,
  normalizeBannerModelo,
  type BannerDevicePreview,
} from "@/components/loja/paginas/blocos/BannerRenderer";
import GaleriaEditorialFullBleedPublico from "@/components/loja/paginas/blocos/GaleriaEditorialFullBleedPublico";
import VitrineEditorialPublico from "@/components/loja/paginas/blocos/VitrineEditorialPublico";
import VisualCropEditor, {
  createResponsiveMediaConfig,
  getMediaCropObjectPosition,
  getRecommendedMediaSize,
  type MediaCropContext,
  type ResponsiveMediaConfig,
} from "@/components/configuracoes/loja/VisualCropEditor";

export type EditorVisualPagina = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  ativo: boolean;
  statusPublicacao: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  termosBusca?: string | null;
  urlPublica: string;
  categoriaId?: string | null;
  categoriaNome?: string | null;
  categoriaSlug?: string | null;
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
  imagemUrl?: string | null;
  categoriaMaeId: string | null;
  caminho: string;
};

export type EditorVisualPaginaLink = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  urlPublica: string;
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

export type EditorVisualColecaoInteligente = {
  id: string;
  nome: string;
  slug: string;
  tipo: string;
  status: string;
  produtosAprovados: number;
  produtoIdsAprovados: string[];
  produtoIdsSugeridos: string[];
};

export type EditorVisualCampanhaComercial = {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  produtoIds: string[];
};

type EditorVisualPaginaClientProps = {
  pagina: EditorVisualPagina;
  blocos: EditorVisualBloco[];
  categoriasDisponiveis: EditorVisualCategoria[];
  paginasDisponiveis: EditorVisualPaginaLink[];
  produtosDisponiveis: EditorVisualProduto[];
  colecoesInteligentes: EditorVisualColecaoInteligente[];
  campanhasDisponiveis: EditorVisualCampanhaComercial[];
};

type DadosSeoPaginaForm = {
  seoTitle: string;
  seoDescription: string;
  termosBusca: string;
};

type DevicePreview = "DESKTOP" | "TABLET" | "MOBILE";
type EditorSelectionContext =
  | "BLOCO"
  | "TEXTO"
  | "IMAGEM"
  | "BOTAO"
  | "DESIGN"
  | "PRODUTOS";

type TipoBlocoAdicionar =
  | "BANNER"
  | "HERO_EDITORIAL_PNG"
  | "GALERIA_EDITORIAL_FULL_BLEED"
  | "TEXTO_IMAGEM"
  | "LISTA_PRODUTOS"
  | "DESTAQUES_CARDS"
  | "COLECOES_CATEGORIAS"
  | "VITRINE_EDITORIAL"
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

type ColecaoCategoriaItemEditando = {
  id: string;
  tipoLink: string;
  categoriaId: string;
  categoriaSlug: string;
  categoriaNome: string;
  titulo: string;
  subtitulo: string;
  tituloRichText: RichTextValue | null;
  subtituloRichText: RichTextValue | null;
  textoLink: string;
  linkUrl: string;
  imagemDesktopUrl: string;
  imagemMobileUrl: string;
  tipoMidia: string;
  videoDesktopUrl: string;
  videoMobileUrl: string;
  mediaPositionDesktop: string;
  mediaPositionMobile: string;
  mediaCropDesktopX: number;
  mediaCropDesktopY: number;
  mediaCropMobileX: number;
  mediaCropMobileY: number;
  tamanhoMosaico: string;
  ordem: number;
};

type VitrineEditorialItemEditando = {
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
  imagemDesktop: string;
  imagemMobile: string;
  altText: string;
  focoHorizontal: number;
  focoVertical: number;
  zoom: number;
  focoMobileHorizontal?: number;
  focoMobileVertical?: number;
  zoomMobile?: number;
  ocultarNome: boolean;
  ocultarBotao: boolean;
  abrirNovaAba: boolean;
};

type TextStyleConfig = {
  fontSizePreset: string;
  fontWeight: string;
  colorPreset: string;
  colorCustom: string;
  letterSpacing: string;
  lineHeight: string;
  marginTop: number;
  marginBottom: number;
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
  alturaBlocoTextoImagem: string;
  gapTextoImagem: number;
  raioImagemTextoImagem: number;
  imagemAlt: string;
  fonteProdutos: string;
  categoriaProdutoId: string;
  categoriaProdutoSlug: string;
  categoriaProdutoNome: string;
  categoriasProdutosIds: string[];
  categoriasProdutosSlugs: string[];
  categoriasProdutosNomes: string[];
  produtosSelecionadosIds: string[];
  colecaoInteligenteId: string;
  colecaoInteligenteSlug: string;
  colecaoInteligenteNome: string;
  ordenacaoColecao: string;
  incluirSugeridosColecao: boolean;
  limiteProdutos: number;
  layoutDesktopProdutos: string;
  layoutMobileProdutos: string;
  exibirSetasCarrossel: boolean;
  posicaoSetasCarrossel: string;
  estiloSetasCarrossel: string;
  navegarPor: string;
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
  layoutVisualColecoes: string;
  origemItensColecoes: string;
  larguraConteudoColecoes: string;
  colunasDesktopColecoes: number;
  colunasTabletColecoes: number;
  colunasMobileColecoes: number;
  estiloEtiquetaColecoes: string;
  presetMosaicoColecoes: string;
  gapMosaicoColecoes: string;
  tamanhoEtiquetaColecoes: string;
  posicaoEtiquetaColecoes: string;
  larguraEtiquetaColecoes: string;
  exibirLinhaEtiquetaColecoes: boolean;
  exibirEtiquetaColecoes: boolean;
  exibirBotaoEtiquetaColecoes: boolean;
  cardInteiroClicavelColecoes: boolean;
  larguraCabecalhoDesktopColecoes: number;
  posicaoCabecalhoMosaicoColecoes: string;
  itensColecoes: ColecaoCategoriaItemEditando[];
  tipoCabecalhoColecoes: string;
  logoTituloUrl: string;
  logoTituloMobileUrl: string;
  logoTituloAlt: string;
  logoTituloLarguraDesktop: number;
  logoTituloLarguraMobile: number;
  logoTituloPosicao: string;
  imagemTituloUrl: string;
  imagemTituloMobileUrl: string;
  imagemTituloAlt: string;
  imagemTituloLarguraDesktop: number;
  imagemTituloLarguraMobile: number;
  alinhamentoCabecalhoDesktop: string;
  alinhamentoCabecalhoMobile: string;
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
  alinhamentoTextoDesktop: string;
  alinhamentoTextoMobile: string;
  modeloBanner: string;
  textoPrincipal: string;
  varianteVisual: string;
  animarLetras: boolean;
  velocidadeAnimacao: string;
  mostrarTitulo: boolean;
  mostrarSubtitulo: boolean;
  mostrarCta: boolean;
  animacaoElementos: string;
  alturaBanner: string;
  larguraBanner: string;
  overlayBanner: string;
  corTextoBanner: string;
  alinhamentoVertical: string;
  margemSeguraX: number;
  margemSeguraY: number;
  larguraTextoPercentual: number;
  fonteTituloDesktop: number;
  fonteTituloMobile: number;
  lineHeightTitulo: number;
  letterSpacingTitulo: number;
  mediaZoomDesktop: number;
  mediaZoomMobile: number;
  imagemFrenteDesktopUrl: string;
  imagemFrenteMobileUrl: string;
  imagemFrenteAlt: string;
  imagemFrenteX: number;
  imagemFrenteY: number;
  imagemFrenteLarguraDesktop: number;
  imagemFrenteLarguraMobile: number;
  estiloCtaBanner: string;
  ctaNovaAba: boolean;
  produtosFlutuantesAtivos: boolean;
  tipoMidia: string;
  exibirTexto: boolean;
  exibirSubtitulo: boolean;
  exibirBotaoPrimario: boolean;
  exibirBotaoSecundario: boolean;
  estiloBordaBotao: string;
  larguraMidiaDesktop: string;
  larguraMidiaMobile: string;
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

type BannerStudioElement =
  | "MODELO"
  | "TITULO"
  | "SUBTITULO"
  | "CTA"
  | "MIDIA"
  | "IMAGEM_FRENTE"
  | "DESIGN"
  | "PRODUTOS"
  | "AVANCADO";

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

const TEXT_LINE_HEIGHT_PRESETS = [
  { value: "COMPACTO", label: "Compacto" },
  { value: "NORMAL", label: "Normal" },
  { value: "RESPIRADO", label: "Respirado" },
  { value: "AMPLO", label: "Amplo" },
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
  { value: "AUTO_CONTEUDO", label: "Auto pelo conteúdo" },
  { value: "COMPACTA", label: "Compacta" },
  { value: "PADRAO", label: "Padrão" },
  { value: "TELA_CHEIA", label: "Tela cheia" },
];

const LARGURA_BANNER_PRESETS = [
  { value: "FULL_BLEED", label: "Full bleed" },
  { value: "CONTIDA", label: "Contida" },
];

const OVERLAY_BANNER_PRESETS = [
  { value: "NENHUM", label: "Nenhum" },
  { value: "LEVE", label: "Leve" },
  { value: "MEDIO", label: "Médio" },
  { value: "GRADIENTE", label: "Gradiente" },
];

const COR_TEXTO_BANNER_PRESETS = [
  { value: "CLARO", label: "Claro" },
  { value: "ESCURO", label: "Escuro" },
];

const ANIMACAO_HERO_PRESETS = [
  { value: "SEM_ANIMACAO", label: "Sem animação" },
  { value: "FADE_IN", label: "Fade in" },
  { value: "SUBIR_SUAVE", label: "Subir suave" },
  { value: "ENTRAR_DA_ESQUERDA", label: "Entrar da esquerda" },
  { value: "ENTRAR_DA_DIREITA", label: "Entrar da direita" },
  { value: "ZOOM_SUAVE", label: "Zoom suave" },
];

const VARIANTES_TIPOGRAFICO_PRESETS = [
  { value: "BRANCO_AZUL", label: "Fundo branco + texto azul" },
  { value: "AZUL_BRANCO", label: "Fundo azul + texto branco" },
];

const VELOCIDADE_ANIMACAO_LETRAS_PRESETS = [
  { value: "SUAVE", label: "Suave" },
  { value: "MEDIA", label: "Média" },
  { value: "RAPIDA", label: "Rápida" },
];

const ALINHAMENTO_VERTICAL_BANNER_PRESETS = [
  { value: "TOPO", label: "Topo" },
  { value: "CENTRO", label: "Centro" },
  { value: "BASE", label: "Base" },
];

const ESTILO_CTA_BANNER_PRESETS = [
  { value: "PREENCHIDO", label: "Preenchido" },
  { value: "CONTORNO", label: "Contorno" },
  { value: "LINK", label: "Texto/link" },
];

const TIPO_MIDIA_BANNER_PRESETS = [
  { value: "IMAGEM", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
];

const MODELO_BANNER_PRESETS = [
  {
    value: "HERO_PRINCIPAL",
    label: "Hero principal",
    descricao:
      "Banner principal com imagem, texto opcional, CTA opcional e animação dos elementos.",
    uso: "Home, campanhas e lançamentos.",
    medidas: "Desktop 1920 x 900 px · mobile 1080 x 1400 px",
    preview: "HERO",
  },
  {
    value: "TIPOGRAFICO_EXPANDIDO",
    label: "Tipográfico expandido",
    descricao:
      "Banner sem imagem, com palavra ou frase grande ocupando quase toda a largura da página.",
    uso: "SALE, ANÉIS, NOVA COLEÇÃO, campanhas tipográficas.",
    medidas: "Altura automática · texto ajustado à largura útil",
    preview: "TIPOGRAFICO",
  },
];

const TEXTO_BANNER_PRESETS: {
  id: string;
  label: string;
  patch: Partial<NonNullable<BlocoEditandoState>>;
}[] = [
  {
    id: "PEQUENO",
    label: "Pequeno",
    patch: {
      fonteTituloDesktop: 48,
      fonteTituloMobile: 32,
      larguraTextoPercentual: 54,
      margemSeguraX: 8,
      margemSeguraY: 8,
      lineHeightTitulo: 1,
      letterSpacingTitulo: 0,
    },
  },
  {
    id: "MEDIO",
    label: "Médio",
    patch: {
      fonteTituloDesktop: 68,
      fonteTituloMobile: 42,
      larguraTextoPercentual: 58,
      margemSeguraX: 8,
      margemSeguraY: 8,
      lineHeightTitulo: 0.98,
      letterSpacingTitulo: 0,
    },
  },
  {
    id: "GRANDE",
    label: "Grande",
    patch: {
      fonteTituloDesktop: 92,
      fonteTituloMobile: 56,
      larguraTextoPercentual: 70,
      margemSeguraX: 8,
      margemSeguraY: 8,
      lineHeightTitulo: 0.94,
      letterSpacingTitulo: 0,
    },
  },
  {
    id: "EDITORIAL_GIGANTE",
    label: "Editorial gigante",
    patch: {
      alturaBanner: "AUTO_CONTEUDO",
      fonteTituloDesktop: 124,
      fonteTituloMobile: 72,
      larguraTextoPercentual: 82,
      margemSeguraX: 8,
      margemSeguraY: 10,
      lineHeightTitulo: 0.9,
      letterSpacingTitulo: 0,
    },
  },
];

type BannerEditorAba = "CONTEUDO" | "IMAGENS" | "DESIGN" | "PRODUTOS" | "AVANCADO";

const ABAS_BANNER_EDITOR: { id: BannerEditorAba; label: string }[] = [
  { id: "CONTEUDO", label: "Conteúdo" },
  { id: "IMAGENS", label: "Imagens" },
  { id: "DESIGN", label: "Design" },
  { id: "PRODUTOS", label: "Produtos" },
  { id: "AVANCADO", label: "Avançado" },
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

const LARGURA_MIDIA_TEXTO_IMAGEM_PRESETS = [
  { value: "CONTIDA", label: "Contida" },
  { value: "SANGRANDO_ATE_BORDA", label: "Sangrando até a borda" },
];

const ALTURA_BLOCO_TEXTO_IMAGEM_PRESETS = [
  { value: "AUTO", label: "Auto" },
  { value: "COMPACTO", label: "Compacto" },
  { value: "PADRAO", label: "Padrão" },
  { value: "ALTO", label: "Alto" },
];

const FONTE_PRODUTOS_PRESETS = [
  { value: "TODOS", label: "Todos" },
  { value: "DESCONTOS", label: "Descontos" },
  { value: "NOVOS", label: "Novos" },
  { value: "MAIS_VENDIDOS", label: "Mais vendidos" },
  { value: "CATEGORIA", label: "Categoria" },
  { value: "CATEGORIAS_SELECIONADAS", label: "Categorias selecionadas" },
  { value: "COLECAO_INTELIGENTE", label: "Colecao inteligente" },
  { value: "CAMPANHA", label: "Campanha" },
  { value: "FILTRO_PERSONALIZADO", label: "Filtro personalizado" },
  { value: "MANUAL", label: "Manual" },
];

const ORDENACAO_COLECAO_PRESETS = [
  { value: "ORDEM_APROVADA", label: "Ordem aprovada" },
  { value: "MAIOR_SCORE", label: "Maior score" },
  { value: "MAIS_RECENTES", label: "Mais recentes" },
  { value: "MANUAL", label: "Manual" },
];

const LAYOUT_PRODUTOS_PRESETS = [
  { value: "GRID", label: "Grid" },
  { value: "CARROSSEL", label: "Carrossel" },
];

const POSICAO_SETAS_CARROSSEL_PRESETS = [
  { value: "LATERAIS", label: "Laterais" },
  { value: "TOPO_DIREITA", label: "Topo direita" },
  { value: "INFERIOR", label: "Inferior" },
];

const ESTILO_SETAS_CARROSSEL_PRESETS = [
  { value: "CIRCULO", label: "Círculo" },
  { value: "MINIMALISTA", label: "Minimalista" },
];

const NAVEGAR_POR_PRESETS = [
  { value: "PAGINA", label: "Página" },
  { value: "ITEM", label: "Item" },
];

const ESTILO_BORDA_BOTAO_PRESETS = [
  { value: "RETO", label: "Reto" },
  { value: "SUAVE", label: "Suave" },
  { value: "ARREDONDADO", label: "Arredondado" },
  { value: "PILULA", label: "Pílula" },
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

const LAYOUT_VISUAL_COLECOES_PRESETS = [
  { value: "MOSAICO_EDITORIAL", label: "Mosaico editorial" },
  { value: "GRID_EDITORIAL", label: "Grid editorial" },
];

const ORIGEM_ITENS_COLECOES_PRESETS = [
  { value: "PERSONALIZADO", label: "Personalizado" },
  { value: "CATEGORIAS", label: "Categorias" },
];

const LARGURA_CONTEUDO_COLECOES_PRESETS = [
  { value: "CONTIDA", label: "Contida" },
  { value: "LARGA", label: "Larga" },
  { value: "TOTAL", label: "Total" },
];

const ESTILO_ETIQUETA_COLECOES_PRESETS = [
  { value: "SOBREPOSTA", label: "Sobreposta" },
  { value: "ABAIXO", label: "Abaixo" },
  { value: "OCULTA", label: "Oculta" },
];

const TIPO_CABECALHO_COLECOES_PRESETS = [
  { value: "TEXTO", label: "Texto" },
  { value: "LOGO", label: "Logo" },
  { value: "TEXTO_LOGO", label: "Texto + logo" },
  { value: "IMAGEM_TITULO", label: "Imagem de título" },
];

const POSICAO_LOGO_TITULO_PRESETS = [
  { value: "ACIMA", label: "Acima" },
  { value: "ABAIXO", label: "Abaixo" },
  { value: "AO_LADO", label: "Ao lado" },
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

const PRESET_MOSAICO_COLECOES_PRESETS = [
  { value: "MOSAICO_2_PARES", label: "Mosaico 2 itens em pares" },
  { value: "MOSAICO_4_EDITORIAL", label: "Mosaico 2x2 editorial" },
  { value: "MOSAICO_6_REFERENCIA", label: "Mosaico 6 itens estilo referência" },
  { value: "MOSAICO_3_DESTAQUE", label: "Mosaico com destaque" },
  { value: "GRID_4_EDITORIAL", label: "Grade com 4 cards" },
  { value: "GRID_3_EDITORIAL", label: "Grade com 3 cards" },
];

const GAP_MOSAICO_COLECOES_PRESETS = [
  { value: "PEQUENO", label: "Pequeno" },
  { value: "PADRAO", label: "Padrão" },
  { value: "GRANDE", label: "Grande" },
  { value: "EXTRA", label: "Extra" },
];

const TAMANHO_MOSAICO_COLECOES_PRESETS = [
  { value: "AUTO", label: "Automático pelo preset" },
  { value: "PEQUENO", label: "Pequeno" },
  { value: "MEDIO", label: "Médio" },
  { value: "GRANDE", label: "Grande" },
  { value: "ALTO", label: "Alto" },
  { value: "LARGO", label: "Largo" },
  { value: "DESTAQUE", label: "Destaque" },
];

const TAMANHO_ETIQUETA_COLECOES_PRESETS = [
  { value: "PEQUENA", label: "Pequena" },
  { value: "MEDIA", label: "Média" },
  { value: "GRANDE", label: "Grande" },
];

const POSICAO_ETIQUETA_COLECOES_PRESETS = [
  { value: "INFERIOR_ESQUERDA", label: "Inferior esquerda" },
  { value: "INFERIOR_CENTRO", label: "Inferior centro" },
  { value: "INFERIOR_DIREITA", label: "Inferior direita" },
  { value: "SUPERIOR_ESQUERDA", label: "Superior esquerda" },
  { value: "CENTRO", label: "Centro" },
];

const LARGURA_ETIQUETA_COLECOES_PRESETS = [
  { value: "AUTO", label: "Automática" },
  { value: "MEDIA", label: "Média" },
  { value: "LARGA", label: "Larga" },
];

const POSICAO_CABECALHO_MOSAICO_PRESETS = [
  { value: "LATERAL", label: "Lateral no desktop" },
  { value: "TOPO", label: "Topo" },
];

const MAX_IMAGEM_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPT_IMAGEM_UPLOAD = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const ACCEPT_VIDEO_UPLOAD = ".mp4,.webm,video/mp4,video/webm";

type HeroEditorialPngConfig = {
  variante: "COMPACTO" | "TELA_CHEIA";
  fundo: {
    tipo: "COR";
    cor: string;
  };
  texto: {
    conteudo: string;
    linhas: "AUTO" | "UMA_LINHA" | "DUAS_LINHAS";
    alinhamento: "ESQUERDA" | "CENTRO";
    margemSeguraPercentual: number;
    cor: string;
    preset: "PEQUENO" | "MEDIO" | "GRANDE" | "EDITORIAL" | "CUSTOMIZADO";
    peso: "LEVE" | "REGULAR" | "SEMIBOLD" | "BOLD";
    tracking: number;
    lineHeight: number;
    escalaAuto: boolean;
  };
  png: {
    imagemDesktop: string;
    imagemMobile: string;
    alt: string;
    escalaDesktop: number;
    escalaMobile: number;
    posicaoXDesktop: number;
    posicaoYDesktop: number;
    posicaoXMobile: number;
    posicaoYMobile: number;
    sombra: boolean;
    opacidade: number;
  };
  cta: {
    mostrar: boolean;
    label: string;
    titulo: string;
    textoBotao: string;
    linkTipo: "PRODUTO" | "CATEGORIA" | "PAGINA" | "COLECAO" | "URL";
    linkValor: string;
    posicao: "INFERIOR_ESQUERDA" | "INFERIOR_CENTRO" | "INFERIOR_DIREITA";
  };
  animacao: {
    entradaTexto: "NENHUMA" | "LETRAS_SUAVE" | "FADE_UP" | "FADE";
    entradaPng: "NENHUMA" | "FADE" | "FLOAT_UP";
    hover: "NENHUM" | "PNG_FLOAT" | "ZOOM_SUAVE";
  };
  responsivo: {
    comportamentoMobile: "EMPILHAR" | "COMPACTAR" | "CENTRALIZAR";
  };
};

const HERO_EDITORIAL_PNG_DEFAULT: HeroEditorialPngConfig = {
  variante: "COMPACTO",
  fundo: {
    tipo: "COR",
    cor: "#223846",
  },
  texto: {
    conteudo: "STELLA COLARI",
    linhas: "AUTO",
    alinhamento: "CENTRO",
    margemSeguraPercentual: 8,
    cor: "#f8fafc",
    preset: "EDITORIAL",
    peso: "BOLD",
    tracking: -0.04,
    lineHeight: 0.86,
    escalaAuto: true,
  },
  png: {
    imagemDesktop: "",
    imagemMobile: "",
    alt: "",
    escalaDesktop: 68,
    escalaMobile: 96,
    posicaoXDesktop: 58,
    posicaoYDesktop: 50,
    posicaoXMobile: 50,
    posicaoYMobile: 52,
    sombra: true,
    opacidade: 100,
  },
  cta: {
    mostrar: false,
    label: "Nova coleção",
    titulo: "Peças para atravessar o tempo.",
    textoBotao: "Conhecer",
    linkTipo: "URL",
    linkValor: "/loja",
    posicao: "INFERIOR_ESQUERDA",
  },
  animacao: {
    entradaTexto: "FADE_UP",
    entradaPng: "FLOAT_UP",
    hover: "PNG_FLOAT",
  },
  responsivo: {
    comportamentoMobile: "COMPACTAR",
  },
};

const HERO_VARIANTE_PRESETS = [
  { value: "COMPACTO", label: "Compacto" },
  { value: "TELA_CHEIA", label: "Tela cheia" },
] as const;

const HERO_LINHAS_PRESETS = [
  { value: "AUTO", label: "Auto" },
  { value: "UMA_LINHA", label: "Uma linha" },
  { value: "DUAS_LINHAS", label: "Duas linhas" },
] as const;

const HERO_TEXTO_PRESETS = [
  { value: "PEQUENO", label: "Pequeno" },
  { value: "MEDIO", label: "Médio" },
  { value: "GRANDE", label: "Grande" },
  { value: "EDITORIAL", label: "Editorial" },
  { value: "CUSTOMIZADO", label: "Customizado" },
] as const;

const HERO_PESO_PRESETS = [
  { value: "LEVE", label: "Leve" },
  { value: "REGULAR", label: "Regular" },
  { value: "SEMIBOLD", label: "Semibold" },
  { value: "BOLD", label: "Bold" },
] as const;

const HERO_LINK_TIPO_PRESETS = [
  { value: "URL", label: "URL personalizada" },
  { value: "PRODUTO", label: "Produto" },
  { value: "CATEGORIA", label: "Categoria" },
  { value: "PAGINA", label: "Página" },
  { value: "COLECAO", label: "Coleção inteligente" },
] as const;

const HERO_CTA_POSICAO_PRESETS = [
  { value: "INFERIOR_ESQUERDA", label: "Inferior esquerda" },
  { value: "INFERIOR_CENTRO", label: "Inferior centro" },
  { value: "INFERIOR_DIREITA", label: "Inferior direita" },
] as const;

const HERO_ENTRADA_TEXTO_PRESETS = [
  { value: "NENHUMA", label: "Sem animação" },
  { value: "FADE", label: "Fade" },
  { value: "LETRAS_SUAVE", label: "Letras suaves" },
  { value: "FADE_UP", label: "Subir suave" },
] as const;

const HERO_ENTRADA_PNG_PRESETS = [
  { value: "NENHUMA", label: "Sem animação" },
  { value: "FADE", label: "Fade" },
  { value: "FLOAT_UP", label: "Subir suave" },
] as const;

const HERO_HOVER_PRESETS = [
  { value: "NENHUM", label: "Sem hover" },
  { value: "PNG_FLOAT", label: "Flutuação leve do PNG" },
  { value: "ZOOM_SUAVE", label: "Zoom suave do PNG" },
] as const;

type GaleriaEditorialLinkTipo =
  | "PRODUTO"
  | "CATEGORIA"
  | "PAGINA"
  | "COLECAO"
  | "URL";

type GaleriaEditorialItemConfig = {
  id: string;
  imagemDesktop: string;
  imagemMobile: string;
  alt: string;
  produtoId: string;
  titulo: string;
  subtitulo: string;
  mostrarTexto: boolean;
  botaoTexto: string;
  mostrarBotao: boolean;
  botaoApenasHover: boolean;
  linkTipo: GaleriaEditorialLinkTipo;
  linkValor: string;
  posicaoTexto:
    | "INFERIOR_ESQUERDO"
    | "INFERIOR_CENTRO"
    | "CENTRO"
    | "SUPERIOR_ESQUERDO";
  focoX: number;
  focoY: number;
  zoom: number;
  focoMobileX?: number;
  focoMobileY?: number;
  zoomMobile?: number;
  overlayOpacidade: number;
};

type GaleriaEditorialConfig = {
  layout: {
    colunas: 3 | 4;
    varianteAltura: "PADRAO" | "COMPACTA";
    gap: number;
    fullBleed: boolean;
    comportamentoMobile: "CARROSSEL" | "EMPILHADO";
  };
  fonte: {
    tipo: "MANUAL" | "PRODUTOS" | "COLECAO_INTELIGENTE" | "CAMPANHA";
    produtosIds: string[];
    colecaoId: string;
    colecaoSlug: string;
    campanhaId: string;
    incluirSugeridos: boolean;
    quantidade: number;
    ordem: "MANUAL" | "SCORE" | "RECENTES" | "ORDEM_APROVADA";
  };
  itens: GaleriaEditorialItemConfig[];
  hover: {
    tipo: "NENHUM" | "ZOOM_LEVE" | "ESCURECER" | "REVELAR_TEXTO" | "REVELAR_BOTAO";
    intensidade: number;
  };
  design: {
    fundo: string;
    raio: number;
    espacamentoVertical: number;
  };
};

function criarGaleriaEditorialItemPadrao(index: number): GaleriaEditorialItemConfig {
  return {
    id: `galeria-${index}`,
    imagemDesktop: "",
    imagemMobile: "",
    alt: "",
    produtoId: "",
    titulo: "",
    subtitulo: "",
    mostrarTexto: false,
    botaoTexto: "Explorar",
    mostrarBotao: false,
    botaoApenasHover: false,
    linkTipo: "URL",
    linkValor: "",
    posicaoTexto: "INFERIOR_ESQUERDO",
    focoX: 50,
    focoY: 50,
    zoom: 100,
    overlayOpacidade: 18,
  };
}

const GALERIA_EDITORIAL_FULL_BLEED_DEFAULT: GaleriaEditorialConfig = {
  layout: {
    colunas: 4,
    varianteAltura: "PADRAO",
    gap: 8,
    fullBleed: true,
    comportamentoMobile: "CARROSSEL",
  },
  fonte: {
    tipo: "MANUAL",
    produtosIds: [],
    colecaoId: "",
    colecaoSlug: "",
    campanhaId: "",
    incluirSugeridos: false,
    quantidade: 4,
    ordem: "ORDEM_APROVADA",
  },
  itens: [1, 2, 3, 4].map(criarGaleriaEditorialItemPadrao),
  hover: {
    tipo: "ZOOM_LEVE",
    intensidade: 1,
  },
  design: {
    fundo: "#ffffff",
    raio: 0,
    espacamentoVertical: 0,
  },
};

const GALERIA_LAYOUT_COLUNAS_PRESETS = [
  { value: 4, label: "4 imagens" },
  { value: 3, label: "3 imagens" },
] as const;

const GALERIA_ALTURA_PRESETS = [
  { value: "PADRAO", label: "Padrão editorial" },
  { value: "COMPACTA", label: "Compacta" },
] as const;

const GALERIA_MOBILE_PRESETS = [
  { value: "CARROSSEL", label: "Carrossel horizontal" },
  { value: "EMPILHADO", label: "Empilhado" },
] as const;

const GALERIA_FONTE_PRESETS = [
  { value: "MANUAL", label: "Manual" },
  { value: "PRODUTOS", label: "Produtos" },
  { value: "COLECAO_INTELIGENTE", label: "Coleção inteligente" },
  { value: "CAMPANHA", label: "Campanha" },
] as const;

const GALERIA_ORDEM_PRESETS = [
  { value: "ORDEM_APROVADA", label: "Ordem aprovada" },
  { value: "SCORE", label: "Score" },
  { value: "RECENTES", label: "Recentes" },
  { value: "MANUAL", label: "Manual" },
] as const;

const GALERIA_LINK_TIPO_PRESETS = [
  { value: "PRODUTO", label: "Produto" },
  { value: "CATEGORIA", label: "Categoria" },
  { value: "PAGINA", label: "Página" },
  { value: "COLECAO", label: "Coleção inteligente" },
  { value: "URL", label: "URL personalizada" },
] as const;

const GALERIA_TEXTO_POSICAO_PRESETS = [
  { value: "INFERIOR_ESQUERDO", label: "Inferior esquerdo" },
  { value: "INFERIOR_CENTRO", label: "Inferior central" },
  { value: "CENTRO", label: "Centro" },
  { value: "SUPERIOR_ESQUERDO", label: "Superior esquerdo" },
] as const;

const GALERIA_HOVER_PRESETS = [
  { value: "NENHUM", label: "Nenhum" },
  { value: "ZOOM_LEVE", label: "Zoom leve" },
  { value: "ESCURECER", label: "Escurecer" },
  { value: "REVELAR_TEXTO", label: "Revelar texto" },
  { value: "REVELAR_BOTAO", label: "Revelar botão" },
] as const;

const TIPOS_BLOCO_ADICIONAR: {
  tipo: TipoBlocoAdicionar;
  nome: string;
  descricao: string;
  tituloInicial: string;
  icon: LucideIcon;
  preview?: ReactNode;
}[] = [
  {
    tipo: "BANNER",
    nome: "Banner",
    descricao: "Imagem de destaque com título, texto de apoio e botão.",
    tituloInicial: "Novo banner",
    icon: ImageIcon,
  },
  {
    tipo: "HERO_EDITORIAL_PNG",
    nome: "Hero Editorial com PNG",
    descricao:
      "Texto gigante em largura total com imagem PNG frontal para campanhas e coleções.",
    tituloInicial: "Hero Editorial com PNG",
    icon: ImageIcon,
    preview: (
      <span className="mt-3 block overflow-hidden rounded-xl bg-[#223846] p-3">
        <span className="relative block h-16">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[24px] font-black leading-none tracking-tighter text-white/85">
            STELLA
          </span>
          <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-lg" />
        </span>
        <span className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/70">
          <span>Compacto</span>
          <span>Tela cheia</span>
        </span>
      </span>
    ),
  },
  {
    tipo: "GALERIA_EDITORIAL_FULL_BLEED",
    nome: "Galeria Editorial",
    descricao:
      "Display full width com 3 ou 4 imagens para campanhas e coleções.",
    tituloInicial: "Galeria Editorial",
    icon: LayoutGrid,
    preview: (
      <span className="mt-3 grid grid-cols-4 gap-1 overflow-hidden rounded-xl bg-slate-950 p-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className="block h-16 bg-gradient-to-b from-slate-200 to-slate-400"
          />
        ))}
      </span>
    ),
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
    tipo: "COLECOES_CATEGORIAS",
    nome: "Coleções / categorias",
    descricao: "Mosaico editorial para coleções, campanhas e categorias.",
    tituloInicial: "Coleções / categorias",
    icon: LayoutGrid,
  },
  {
    tipo: "VITRINE_EDITORIAL",
    nome: "Vitrine editorial",
    descricao: "Imagens grandes com links para categorias, paginas ou campanhas.",
    tituloInicial: "Vitrine editorial",
    icon: LayoutGrid,
    preview: (
      <span className="mt-3 grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`block rounded bg-slate-200 ${
              index % 2 === 0 ? "h-11" : "h-14"
            }`}
          />
        ))}
      </span>
    ),
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

function getPaginaResumo(paginaId: string, paginas: EditorVisualPaginaLink[]) {
  return paginas.find((pagina) => pagina.id === paginaId) || null;
}

function clampEditorNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizarQuantidadeVitrineEditorial(value: number) {
  const rounded = Math.round(value);
  return [3, 4, 5].includes(rounded) ? rounded : 3;
}

function normalizarAlturaVitrineEditorial(value: string) {
  return value === "COMPACTA" ? "COMPACTA" : "PADRAO";
}

function normalizarAnimacaoVitrineEditorial(value: string) {
  if (
    [
      "SEM_ANIMACAO",
      "SUBINDO_EM_SEQUENCIA",
      "LATERAL_EM_SEQUENCIA",
      "FADE_EM_SEQUENCIA",
    ].includes(value)
  ) {
    return value;
  }

  return "SUBINDO_EM_SEQUENCIA";
}

function normalizarTipoLinkVitrineEditorial(value: string) {
  if (["CATEGORIA", "PAGINA", "URL_PERSONALIZADA"].includes(value)) {
    return value;
  }

  return "CATEGORIA";
}

function criarItemVitrineEditorialPadrao(
  index: number
): VitrineEditorialItemEditando {
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

function getItensVitrineEditorialConfig(
  config: Record<string, unknown>
): VitrineEditorialItemEditando[] {
  const itensConfig = Array.isArray(config.itens) ? config.itens : [];
  const quantidade = normalizarQuantidadeVitrineEditorial(
    getNumberConfig(config, "quantidadeItens", 3)
  );
  const itens =
    itensConfig.length > 0
      ? itensConfig.map((item, index) => {
          const data = getConfigObject(item);
          const itemPadrao = criarItemVitrineEditorialPadrao(index + 1);

          return {
            id: getStringConfig(data, "id") || itemPadrao.id,
            tipoLink: normalizarTipoLinkVitrineEditorial(
              getStringConfig(data, "tipoLink")
            ),
            categoriaId: getStringConfig(data, "categoriaId"),
            categoriaSlug: getStringConfig(data, "categoriaSlug"),
            categoriaNome: getStringConfig(data, "categoriaNome"),
            categoriaImagemUrl:
              getStringConfig(data, "categoriaImagemUrl") ||
              getStringConfig(data, "imagemCategoriaUrl"),
            paginaId: getStringConfig(data, "paginaId"),
            paginaSlug: getStringConfig(data, "paginaSlug"),
            paginaTitulo: getStringConfig(data, "paginaTitulo"),
            linkUrl: getStringConfig(data, "linkUrl"),
            label:
              getStringConfig(data, "label") ||
              getStringConfig(data, "titulo") ||
              getStringConfig(data, "nome"),
            textoBotao:
              getStringConfig(data, "textoBotao") ||
              getStringConfig(data, "textoLink") ||
              itemPadrao.textoBotao,
            imagemDesktop:
              getStringConfig(data, "imagemDesktop") ||
              getStringConfig(data, "imagemDesktopUrl") ||
              getStringConfig(data, "imagemUrl"),
            imagemMobile:
              getStringConfig(data, "imagemMobile") ||
              getStringConfig(data, "imagemMobileUrl"),
            altText:
              getStringConfig(data, "altText") || getStringConfig(data, "alt"),
            focoHorizontal: clampEditorNumber(
              getNumberConfig(
                data,
                "focoHorizontal",
                getNumberConfig(data, "mediaCropDesktopX", 50)
              ),
              0,
              100
            ),
            focoVertical: clampEditorNumber(
              getNumberConfig(
                data,
                "focoVertical",
                getNumberConfig(data, "mediaCropDesktopY", 50)
              ),
              0,
              100
            ),
            zoom: clampEditorNumber(getNumberConfig(data, "zoom", 100), 100, 160),
            focoMobileHorizontal: clampEditorNumber(
              getNumberConfig(
                data,
                "focoMobileHorizontal",
                getNumberConfig(
                  data,
                  "focoHorizontal",
                  getNumberConfig(data, "mediaCropDesktopX", 50)
                )
              ),
              0,
              100
            ),
            focoMobileVertical: clampEditorNumber(
              getNumberConfig(
                data,
                "focoMobileVertical",
                getNumberConfig(
                  data,
                  "focoVertical",
                  getNumberConfig(data, "mediaCropDesktopY", 50)
                )
              ),
              0,
              100
            ),
            zoomMobile: clampEditorNumber(
              getNumberConfig(data, "zoomMobile", getNumberConfig(data, "zoom", 100)),
              100,
              160
            ),
            ocultarNome: getBooleanConfig(data, "ocultarNome", false),
            ocultarBotao: getBooleanConfig(data, "ocultarBotao", false),
            abrirNovaAba: getBooleanConfig(data, "abrirNovaAba", false),
          };
        })
      : Array.from({ length: quantidade }, (_, index) =>
          criarItemVitrineEditorialPadrao(index + 1)
        );

  return Array.from({ length: quantidade }, (_, index) => {
    return itens[index] || criarItemVitrineEditorialPadrao(index + 1);
  });
}

function getConfigVitrineEditorial(config: Record<string, unknown>) {
  const quantidadeItens = normalizarQuantidadeVitrineEditorial(
    getNumberConfig(config, "quantidadeItens", 3)
  );

  return {
    quantidadeItens,
    alturaVisual: normalizarAlturaVitrineEditorial(
      getStringConfig(config, "alturaVisual")
    ),
    animacaoBloco: normalizarAnimacaoVitrineEditorial(
      getStringConfig(config, "animacaoBloco")
    ),
    itens: getItensVitrineEditorialConfig({
      ...config,
      quantidadeItens,
    }),
  };
}

function normalizarUrlPersonalizadaVitrine(value: string) {
  const url = value.trim();

  if (!url) return "";

  if (/^(https?:\/\/|\/|mailto:|tel:)/i.test(url)) return url;

  return "";
}

function getOpcoesCategoriasVitrine(categorias: EditorVisualCategoria[]) {
  const ordenadas = [...categorias].sort((a, b) =>
    a.caminho.localeCompare(b.caminho, "pt-BR")
  );

  return ordenadas.map((categoria) => {
    const nivel = Math.max(0, categoria.caminho.split(" > ").length - 1);
    const prefixo = nivel > 0 ? `${"- ".repeat(nivel)}` : "";

    return {
      categoria,
      label: `${prefixo}${categoria.nome}`,
    };
  });
}

function getTextStyleDefaults(kind: string): TextStyleConfig {
  if (kind.includes("botao") || kind.includes("Botao")) {
    return {
      fontSizePreset: "PEQUENO",
      fontWeight: "SEMIBOLD",
      colorPreset: "PADRAO",
      colorCustom: "",
      letterSpacing: "NORMAL",
      lineHeight: "NORMAL",
      marginTop: 0,
      marginBottom: 0,
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
      lineHeight: "RESPIRADO",
      marginTop: 0,
      marginBottom: 0,
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
    lineHeight: "NORMAL",
    marginTop: 0,
    marginBottom: 0,
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
  const lineHeight = getStringConfig(style, "lineHeight");
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
    lineHeight: TEXT_LINE_HEIGHT_PRESETS.some(
      (preset) => preset.value === lineHeight
    )
      ? lineHeight
      : defaults.lineHeight,
    marginTop: getNumberConfig(style, "marginTop", defaults.marginTop),
    marginBottom: getNumberConfig(style, "marginBottom", defaults.marginBottom),
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

  return {
    fontSize: fontSizeMap[style.fontSizePreset] || fontSizeMap.MEDIO,
    fontWeight: fontWeightMap[style.fontWeight] || fontWeightMap.REGULAR,
    color:
      style.colorPreset === "PERSONALIZADO" && style.colorCustom
        ? style.colorCustom
        : colorMap[style.colorPreset],
    letterSpacing:
      letterSpacingMap[style.letterSpacing] || letterSpacingMap.NORMAL,
    lineHeight: lineHeightMap[style.lineHeight] || lineHeightMap.NORMAL,
    marginTop: `${Math.max(0, Number(style.marginTop) || 0)}px`,
    marginBottom: `${Math.max(0, Number(style.marginBottom) || 0)}px`,
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
  if (tipo === "HERO_EDITORIAL_PNG") return "Hero Editorial com PNG";
  if (tipo === "GALERIA_EDITORIAL_FULL_BLEED") return "Galeria Editorial";
  if (tipo === "BANNER") return "Banner";
  if (tipo === "CTA_SIMPLES") return "CTA simples";
  if (tipo === "CTA") return "CTA";
  if (tipo === "TEXTO_IMAGEM") return "Texto + imagem";
  if (tipo === "PRODUTOS") return "Produtos";
  if (tipo === "LISTA_PRODUTOS") return "Lista de produtos";
  if (tipo === "DESTAQUES_CARDS") return "Destaques / cards";
  if (tipo === "COLECOES_CATEGORIAS" || tipo === "MOSAICO_COLECOES") {
    return "Coleções / categorias";
  }
  if (tipo === "VITRINE_EDITORIAL") return "Vitrine editorial";
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

  if (
    tipo.includes("IMAGEM") ||
    tipo === "HERO" ||
    tipo === "BANNER" ||
    isHeroEditorialPngTipo(tipo) ||
    isGaleriaEditorialTipo(tipo)
  ) {
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

function isHeroEditorialPngTipo(tipo: string) {
  return tipo === "HERO_EDITORIAL_PNG";
}

function isGaleriaEditorialTipo(tipo: string) {
  return tipo === "GALERIA_EDITORIAL_FULL_BLEED";
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

function isColecoesCategoriasTipo(tipo: string) {
  return tipo === "COLECOES_CATEGORIAS" || tipo === "MOSAICO_COLECOES";
}

function isVitrineEditorialTipo(tipo: string) {
  return tipo === "VITRINE_EDITORIAL";
}

function isCtaTipo(tipo: string) {
  return tipo === "CTA" || tipo === "CTA_SIMPLES";
}

function getConfigSubobject(config: Record<string, unknown>, key: string) {
  return getConfigObject(config[key]);
}

function getHeroEditorialPngConfig(value: unknown): HeroEditorialPngConfig {
  const config = getConfigObject(value);
  const fundo = getConfigSubobject(config, "fundo");
  const texto = getConfigSubobject(config, "texto");
  const png = getConfigSubobject(config, "png");
  const cta = getConfigSubobject(config, "cta");
  const animacao = getConfigSubobject(config, "animacao");
  const responsivo = getConfigSubobject(config, "responsivo");

  return {
    variante:
      getStringConfig(config, "variante") === "TELA_CHEIA"
        ? "TELA_CHEIA"
        : "COMPACTO",
    fundo: {
      tipo: "COR",
      cor: getStringConfig(fundo, "cor") || HERO_EDITORIAL_PNG_DEFAULT.fundo.cor,
    },
    texto: {
      conteudo:
        getStringConfig(texto, "conteudo") ||
        getStringConfig(config, "titulo") ||
        HERO_EDITORIAL_PNG_DEFAULT.texto.conteudo,
      linhas: (getStringConfig(texto, "linhas") ||
        HERO_EDITORIAL_PNG_DEFAULT.texto.linhas) as HeroEditorialPngConfig["texto"]["linhas"],
      alinhamento: (getStringConfig(texto, "alinhamento") ||
        HERO_EDITORIAL_PNG_DEFAULT.texto.alinhamento) as HeroEditorialPngConfig["texto"]["alinhamento"],
      margemSeguraPercentual: getNumberConfig(
        texto,
        "margemSeguraPercentual",
        HERO_EDITORIAL_PNG_DEFAULT.texto.margemSeguraPercentual
      ),
      cor: getStringConfig(texto, "cor") || HERO_EDITORIAL_PNG_DEFAULT.texto.cor,
      preset: (getStringConfig(texto, "preset") ||
        HERO_EDITORIAL_PNG_DEFAULT.texto.preset) as HeroEditorialPngConfig["texto"]["preset"],
      peso: (getStringConfig(texto, "peso") ||
        HERO_EDITORIAL_PNG_DEFAULT.texto.peso) as HeroEditorialPngConfig["texto"]["peso"],
      tracking: getNumberConfig(
        texto,
        "tracking",
        HERO_EDITORIAL_PNG_DEFAULT.texto.tracking
      ),
      lineHeight: getNumberConfig(
        texto,
        "lineHeight",
        HERO_EDITORIAL_PNG_DEFAULT.texto.lineHeight
      ),
      escalaAuto: getBooleanConfig(
        texto,
        "escalaAuto",
        HERO_EDITORIAL_PNG_DEFAULT.texto.escalaAuto
      ),
    },
    png: {
      imagemDesktop: getStringConfig(png, "imagemDesktop"),
      imagemMobile: getStringConfig(png, "imagemMobile"),
      alt: getStringConfig(png, "alt"),
      escalaDesktop: getNumberConfig(
        png,
        "escalaDesktop",
        HERO_EDITORIAL_PNG_DEFAULT.png.escalaDesktop
      ),
      escalaMobile: getNumberConfig(
        png,
        "escalaMobile",
        HERO_EDITORIAL_PNG_DEFAULT.png.escalaMobile
      ),
      posicaoXDesktop: getNumberConfig(
        png,
        "posicaoXDesktop",
        HERO_EDITORIAL_PNG_DEFAULT.png.posicaoXDesktop
      ),
      posicaoYDesktop: getNumberConfig(
        png,
        "posicaoYDesktop",
        HERO_EDITORIAL_PNG_DEFAULT.png.posicaoYDesktop
      ),
      posicaoXMobile: getNumberConfig(
        png,
        "posicaoXMobile",
        HERO_EDITORIAL_PNG_DEFAULT.png.posicaoXMobile
      ),
      posicaoYMobile: getNumberConfig(
        png,
        "posicaoYMobile",
        HERO_EDITORIAL_PNG_DEFAULT.png.posicaoYMobile
      ),
      sombra: getBooleanConfig(png, "sombra", HERO_EDITORIAL_PNG_DEFAULT.png.sombra),
      opacidade: getNumberConfig(
        png,
        "opacidade",
        HERO_EDITORIAL_PNG_DEFAULT.png.opacidade
      ),
    },
    cta: {
      mostrar: getBooleanConfig(cta, "mostrar", HERO_EDITORIAL_PNG_DEFAULT.cta.mostrar),
      label: getStringConfig(cta, "label") || HERO_EDITORIAL_PNG_DEFAULT.cta.label,
      titulo: getStringConfig(cta, "titulo") || HERO_EDITORIAL_PNG_DEFAULT.cta.titulo,
      textoBotao:
        getStringConfig(cta, "textoBotao") ||
        HERO_EDITORIAL_PNG_DEFAULT.cta.textoBotao,
      linkTipo: (getStringConfig(cta, "linkTipo") ||
        HERO_EDITORIAL_PNG_DEFAULT.cta.linkTipo) as HeroEditorialPngConfig["cta"]["linkTipo"],
      linkValor:
        getStringConfig(cta, "linkValor") ||
        HERO_EDITORIAL_PNG_DEFAULT.cta.linkValor,
      posicao: (getStringConfig(cta, "posicao") ||
        HERO_EDITORIAL_PNG_DEFAULT.cta.posicao) as HeroEditorialPngConfig["cta"]["posicao"],
    },
    animacao: {
      entradaTexto: (getStringConfig(animacao, "entradaTexto") ||
        HERO_EDITORIAL_PNG_DEFAULT.animacao.entradaTexto) as HeroEditorialPngConfig["animacao"]["entradaTexto"],
      entradaPng: (getStringConfig(animacao, "entradaPng") ||
        HERO_EDITORIAL_PNG_DEFAULT.animacao.entradaPng) as HeroEditorialPngConfig["animacao"]["entradaPng"],
      hover: (getStringConfig(animacao, "hover") ||
        HERO_EDITORIAL_PNG_DEFAULT.animacao.hover) as HeroEditorialPngConfig["animacao"]["hover"],
    },
    responsivo: {
      comportamentoMobile: (getStringConfig(responsivo, "comportamentoMobile") ||
        HERO_EDITORIAL_PNG_DEFAULT.responsivo.comportamentoMobile) as HeroEditorialPngConfig["responsivo"]["comportamentoMobile"],
    },
  };
}

function getGaleriaEditorialItemConfig(
  value: unknown,
  index: number
): GaleriaEditorialItemConfig {
  const item = getConfigObject(value);
  const fallback = criarGaleriaEditorialItemPadrao(index + 1);
  const posicaoTexto = getStringConfig(item, "posicaoTexto");
  const linkTipo = getStringConfig(item, "linkTipo");

  return {
    id: getStringConfig(item, "id") || fallback.id,
    imagemDesktop:
      getStringConfig(item, "imagemDesktop") ||
      getStringConfig(item, "imagemDesktopUrl") ||
      getStringConfig(item, "imagemUrl"),
    imagemMobile:
      getStringConfig(item, "imagemMobile") ||
      getStringConfig(item, "imagemMobileUrl"),
    alt: getStringConfig(item, "alt") || getStringConfig(item, "altText"),
    produtoId: getStringConfig(item, "produtoId"),
    titulo: getStringConfig(item, "titulo"),
    subtitulo: getStringConfig(item, "subtitulo"),
    mostrarTexto: getBooleanConfig(item, "mostrarTexto", fallback.mostrarTexto),
    botaoTexto:
      getStringConfig(item, "botaoTexto") ||
      getStringConfig(item, "textoBotao") ||
      fallback.botaoTexto,
    mostrarBotao: getBooleanConfig(item, "mostrarBotao", fallback.mostrarBotao),
    botaoApenasHover: getBooleanConfig(
      item,
      "botaoApenasHover",
      fallback.botaoApenasHover
    ),
    linkTipo: GALERIA_LINK_TIPO_PRESETS.some((preset) => preset.value === linkTipo)
      ? (linkTipo as GaleriaEditorialLinkTipo)
      : fallback.linkTipo,
    linkValor:
      getStringConfig(item, "linkValor") || getStringConfig(item, "linkUrl"),
    posicaoTexto: GALERIA_TEXTO_POSICAO_PRESETS.some(
      (preset) => preset.value === posicaoTexto
    )
      ? (posicaoTexto as GaleriaEditorialItemConfig["posicaoTexto"])
      : fallback.posicaoTexto,
    focoX: getNumberConfig(item, "focoX", fallback.focoX),
    focoY: getNumberConfig(item, "focoY", fallback.focoY),
    zoom: getNumberConfig(item, "zoom", fallback.zoom),
    overlayOpacidade: getNumberConfig(
      item,
      "overlayOpacidade",
      fallback.overlayOpacidade
    ),
  };
}

function getGaleriaEditorialConfig(value: unknown): GaleriaEditorialConfig {
  const config = getConfigObject(value);
  const layout = getConfigSubobject(config, "layout");
  const fonte = getConfigSubobject(config, "fonte");
  const hover = getConfigSubobject(config, "hover");
  const design = getConfigSubobject(config, "design");
  const itensRaw = Array.isArray(config.itens) ? config.itens : [];
  const colunas = getNumberConfig(
    layout,
    "colunas",
    GALERIA_EDITORIAL_FULL_BLEED_DEFAULT.layout.colunas
  );
  const fonteTipo = getStringConfig(fonte, "tipo");
  const fonteOrdem = getStringConfig(fonte, "ordem");
  const hoverTipo = getStringConfig(hover, "tipo");

  return {
    layout: {
      colunas: colunas === 3 ? 3 : 4,
      varianteAltura:
        getStringConfig(layout, "varianteAltura") === "COMPACTA"
          ? "COMPACTA"
          : "PADRAO",
      gap: getNumberConfig(layout, "gap", 8),
      fullBleed: getBooleanConfig(layout, "fullBleed", true),
      comportamentoMobile:
        getStringConfig(layout, "comportamentoMobile") === "EMPILHADO"
          ? "EMPILHADO"
          : "CARROSSEL",
    },
    fonte: {
      tipo: GALERIA_FONTE_PRESETS.some((preset) => preset.value === fonteTipo)
        ? (fonteTipo as GaleriaEditorialConfig["fonte"]["tipo"])
        : "MANUAL",
      produtosIds: getArrayConfig(fonte, "produtosIds"),
      colecaoId: getStringConfig(fonte, "colecaoId"),
      colecaoSlug: getStringConfig(fonte, "colecaoSlug"),
      campanhaId: getStringConfig(fonte, "campanhaId"),
      incluirSugeridos: getBooleanConfig(fonte, "incluirSugeridos", false),
      quantidade: getNumberConfig(fonte, "quantidade", colunas === 3 ? 3 : 4),
      ordem: GALERIA_ORDEM_PRESETS.some((preset) => preset.value === fonteOrdem)
        ? (fonteOrdem as GaleriaEditorialConfig["fonte"]["ordem"])
        : "ORDEM_APROVADA",
    },
    itens:
      itensRaw.length > 0
        ? itensRaw.map((item, index) => getGaleriaEditorialItemConfig(item, index))
        : GALERIA_EDITORIAL_FULL_BLEED_DEFAULT.itens.map((item) => ({
            ...item,
          })),
    hover: {
      tipo: GALERIA_HOVER_PRESETS.some((preset) => preset.value === hoverTipo)
        ? (hoverTipo as GaleriaEditorialConfig["hover"]["tipo"])
        : "ZOOM_LEVE",
      intensidade: getNumberConfig(hover, "intensidade", 1),
    },
    design: {
      fundo: getStringConfig(design, "fundo") || "#ffffff",
      raio: getNumberConfig(design, "raio", 0),
      espacamentoVertical: getNumberConfig(design, "espacamentoVertical", 0),
    },
  };
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

function normalizarLarguraMidiaTextoImagem(value: string) {
  if (value === "FULL_BLEED" || value === "SANGRANDO_ATE_BORDA") {
    return "SANGRANDO_ATE_BORDA";
  }

  return "CONTIDA";
}

function normalizarAlturaBlocoTextoImagem(value: string) {
  if (["AUTO", "COMPACTO", "PADRAO", "ALTO"].includes(value)) return value;
  return "AUTO";
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

function clampMediaCropValue(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

function getMediaObjectPosition(x: number, y: number) {
  return `${clampMediaCropValue(x)}% ${clampMediaCropValue(y)}%`;
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

function criarItemColecaoPadrao(index: number): ColecaoCategoriaItemEditando {
  return {
    id: `colecao-${Date.now()}-${index}`,
    tipoLink: "PERSONALIZADO",
    categoriaId: "",
    categoriaSlug: "",
    categoriaNome: "",
    titulo: "",
    subtitulo: "",
    tituloRichText: null,
    subtituloRichText: null,
    textoLink: "Explorar",
    linkUrl: "",
    imagemDesktopUrl: "",
    imagemMobileUrl: "",
    tipoMidia: "IMAGEM",
    videoDesktopUrl: "",
    videoMobileUrl: "",
    mediaPositionDesktop: "center center",
    mediaPositionMobile: "center center",
    mediaCropDesktopX: 50,
    mediaCropDesktopY: 50,
    mediaCropMobileX: 50,
    mediaCropMobileY: 50,
    tamanhoMosaico: "AUTO",
    ordem: index - 1,
  };
}

function criarItemColecaoPreviewPadrao(index: number): ColecaoCategoriaItemEditando {
  return {
    ...criarItemColecaoPadrao(index),
    id: `preview-colecao-${index}`,
    titulo: `Coleção ${index}`,
    subtitulo: "Chamada editorial da coleção.",
    textoLink: "Explorar",
  };
}

function normalizarLayoutVisualColecoes(value: string) {
  if (value === "GRID_EDITORIAL") return "GRID_EDITORIAL";
  return "MOSAICO_EDITORIAL";
}

function normalizarOrigemItensColecoes(value: string) {
  if (value === "CATEGORIAS") return "CATEGORIAS";
  return "PERSONALIZADO";
}

function normalizarLarguraConteudoColecoes(value: string) {
  if (["CONTIDA", "LARGA", "TOTAL"].includes(value)) return value;
  return "LARGA";
}

function normalizarEstiloEtiquetaColecoes(value: string) {
  if (["SOBREPOSTA", "ABAIXO", "OCULTA"].includes(value)) return value;
  return "SOBREPOSTA";
}

function normalizarPresetMosaicoColecoes(value: string) {
  if (
    [
      "MOSAICO_2_PARES",
      "MOSAICO_4_EDITORIAL",
      "MOSAICO_6_REFERENCIA",
      "MOSAICO_5_EDITORIAL",
      "MOSAICO_3_DESTAQUE",
      "GRID_4_EDITORIAL",
      "GRID_3_EDITORIAL",
    ].includes(value)
  ) {
    return value;
  }

  return "MOSAICO_4_EDITORIAL";
}

function normalizarTamanhoMosaicoColecoes(value: string) {
  if (
    ["AUTO", "PEQUENO", "MEDIO", "GRANDE", "ALTO", "LARGO", "DESTAQUE"].includes(
      value
    )
  ) {
    return value;
  }

  return "AUTO";
}

function normalizarGapMosaicoColecoes(value: string) {
  if (["PEQUENO", "PADRAO", "GRANDE", "EXTRA"].includes(value)) {
    return value;
  }

  return "PADRAO";
}

function getGapMosaicoColecoesPx(value: string) {
  const normalized = normalizarGapMosaicoColecoes(value);

  if (normalized === "PEQUENO") return 12;
  if (normalized === "GRANDE") return 32;
  if (normalized === "EXTRA") return 44;

  return 24;
}

function normalizarTamanhoEtiquetaColecoes(value: string) {
  if (["PEQUENA", "MEDIA", "GRANDE"].includes(value)) return value;
  return "PEQUENA";
}

function normalizarPosicaoEtiquetaColecoes(value: string) {
  if (
    [
      "INFERIOR_ESQUERDA",
      "INFERIOR_CENTRO",
      "INFERIOR_DIREITA",
      "SUPERIOR_ESQUERDA",
      "CENTRO",
    ].includes(value)
  ) {
    return value;
  }

  return "INFERIOR_ESQUERDA";
}

function normalizarLarguraEtiquetaColecoes(value: string) {
  if (["AUTO", "MEDIA", "LARGA"].includes(value)) return value;
  return "AUTO";
}

function normalizarPosicaoCabecalhoMosaico(value: string) {
  if (value === "TOPO") return "TOPO";
  return "LATERAL";
}

function getTamanhoMosaicoPreset(preset: string, index: number) {
  const normalized = normalizarPresetMosaicoColecoes(preset);

  if (normalized === "MOSAICO_3_DESTAQUE") {
    return ["DESTAQUE", "MEDIO", "MEDIO"][index] || "MEDIO";
  }

  if (normalized === "GRID_4_EDITORIAL" || normalized === "GRID_3_EDITORIAL") {
    return "MEDIO";
  }

  return "AUTO";
}

function getTamanhoMosaicoEfetivo(item: ColecaoCategoriaItemEditando, index: number, preset: string) {
  const normalizedPreset = normalizarPresetMosaicoColecoes(preset);
  if (["MOSAICO_2_PARES", "MOSAICO_4_EDITORIAL", "MOSAICO_6_REFERENCIA"].includes(normalizedPreset)) {
    return "AUTO";
  }

  const tamanho = normalizarTamanhoMosaicoColecoes(item.tamanhoMosaico);
  return tamanho === "AUTO" ? getTamanhoMosaicoPreset(preset, index) : tamanho;
}

function getColecoesMosaicItemClass(tamanho: string, index: number, preset: string) {
  const normalizedPreset = normalizarPresetMosaicoColecoes(preset);

  if (normalizedPreset === "MOSAICO_2_PARES") {
    return "aspect-[4/5]";
  }

  if (normalizedPreset === "MOSAICO_4_EDITORIAL") {
    return "aspect-[4/5] md:h-full md:min-h-full md:aspect-auto";
  }

  if (normalizedPreset === "MOSAICO_6_REFERENCIA") {
    return "aspect-[4/5]";
  }

  if (normalizedPreset === "MOSAICO_3_DESTAQUE") {
    if (index === 0 || tamanho === "DESTAQUE") {
      return "aspect-[4/5] md:row-span-2 md:min-h-[360px]";
    }

    return "aspect-[4/5] md:min-h-[170px]";
  }

  if (normalizedPreset === "GRID_4_EDITORIAL" || normalizedPreset === "GRID_3_EDITORIAL") {
    return "aspect-[4/5]";
  }

  return "aspect-[4/5]";
}

function getColecoesMosaicItemPlacementClass(index: number, preset: string) {
  const normalizedPreset = normalizarPresetMosaicoColecoes(preset);

  if (normalizedPreset !== "MOSAICO_4_EDITORIAL") return "";

  if (index === 0) {
    return "md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-5";
  }

  if (index === 1) {
    return "md:col-start-2 md:col-end-3 md:row-start-1 md:row-end-3";
  }

  if (index === 2) {
    return "md:col-start-1 md:col-end-2 md:row-start-5 md:row-end-7";
  }

  if (index === 3) {
    return "md:col-start-2 md:col-end-3 md:row-start-3 md:row-end-7";
  }

  return "";
}

function getColecoesMosaicGridClass(preset: string) {
  const normalized = normalizarPresetMosaicoColecoes(preset);

  if (normalized === "MOSAICO_4_EDITORIAL") {
    return "grid grid-cols-1 md:h-[clamp(420px,65vh,620px)] md:grid-cols-2 md:grid-rows-[repeat(6,minmax(0,1fr))] md:items-stretch";
  }

  if (normalized === "MOSAICO_2_PARES") {
    return "grid grid-cols-1 md:grid-cols-2 md:items-start";
  }

  if (normalized === "MOSAICO_6_REFERENCIA") {
    return "grid grid-cols-1 md:grid-cols-3 md:items-start";
  }

  if (normalized === "MOSAICO_3_DESTAQUE") {
    return "grid grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start";
  }

  return "grid grid-cols-1 md:grid-cols-2 md:items-start";
}

function getColecoesGridColumnsByPreset(preset: string, fallback: number) {
  const normalized = normalizarPresetMosaicoColecoes(preset);
  if (normalized === "GRID_3_EDITORIAL") return 3;
  if (normalized === "GRID_4_EDITORIAL") return 4;
  return fallback;
}

function getColecoesHeaderWidthClass(width: number) {
  if (width <= 25) return "lg:grid-cols-[minmax(0,0.32fr)_minmax(0,1.68fr)]";
  if (width <= 30) return "lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1.58fr)]";
  if (width >= 40) return "lg:grid-cols-[minmax(0,0.66fr)_minmax(0,1.34fr)]";
  return "lg:grid-cols-[minmax(0,0.52fr)_minmax(0,1.48fr)]";
}

function getColecoesLabelPositionClass(posicao: string) {
  if (posicao === "INFERIOR_CENTRO") return "bottom-4 left-1/2 -translate-x-1/2 text-center";
  if (posicao === "INFERIOR_DIREITA") return "bottom-4 right-4 text-right";
  if (posicao === "SUPERIOR_ESQUERDA") return "left-4 top-4";
  if (posicao === "CENTRO") return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center";
  return "bottom-4 left-4";
}

function getColecoesLabelSizeClass(tamanho: string) {
  if (tamanho === "GRANDE") return "px-5 py-4";
  if (tamanho === "MEDIA") return "px-4 py-3";
  return "px-3 py-2.5";
}

function getColecoesLabelWidthClass(largura: string) {
  if (largura === "LARGA") return "w-[min(82%,420px)]";
  if (largura === "MEDIA") return "w-[min(68%,320px)]";
  return "w-fit max-w-[78%]";
}

function normalizarTipoCabecalhoColecoes(value: string) {
  if (["TEXTO", "LOGO", "TEXTO_LOGO", "IMAGEM_TITULO"].includes(value)) {
    return value;
  }

  return "TEXTO";
}

function normalizarPosicaoLogoTitulo(value: string) {
  if (["ACIMA", "ABAIXO", "AO_LADO"].includes(value)) return value;

  return "ABAIXO";
}

function getItensColecoesConfig(
  config: Record<string, unknown>
): ColecaoCategoriaItemEditando[] {
  const value = config.itens;

  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const data = getConfigObject(item);
    const mediaPositionDesktop = normalizarMediaPosition(
      getStringConfig(data, "mediaPositionDesktop")
    );
    const mediaPositionMobile = normalizarMediaPosition(
      getStringConfig(data, "mediaPositionMobile")
    );
    const desktopCrop = getMediaCropFromPosition(mediaPositionDesktop);
    const mediaCropDesktopX = getNumberConfig(
      data,
      "mediaCropDesktopX",
      desktopCrop.x
    );
    const mediaCropDesktopY = getNumberConfig(
      data,
      "mediaCropDesktopY",
      desktopCrop.y
    );
    const imagemUrl =
      getStringConfig(data, "imagemDesktopUrl") ||
      getStringConfig(data, "imagemUrl") ||
      getStringConfig(data, "imagem");

    return {
      id: getStringConfig(data, "id") || `colecao-${index + 1}`,
      tipoLink: getStringConfig(data, "tipoLink") || "PERSONALIZADO",
      categoriaId: getStringConfig(data, "categoriaId"),
      categoriaSlug: getStringConfig(data, "categoriaSlug"),
      categoriaNome: getStringConfig(data, "categoriaNome"),
      titulo: getStringConfig(data, "titulo"),
      subtitulo:
        getStringConfig(data, "subtitulo") ||
        getStringConfig(data, "descricao") ||
        getStringConfig(data, "texto"),
      tituloRichText: getRichTextConfig(data, "tituloRichText"),
      subtituloRichText:
        getRichTextConfig(data, "subtituloRichText") ||
        getRichTextConfig(data, "textoRichText"),
      textoLink: getStringConfig(data, "textoLink") || "Explorar",
      linkUrl: getStringConfig(data, "linkUrl") || getStringConfig(data, "linkBotao"),
      imagemDesktopUrl: imagemUrl,
      imagemMobileUrl:
        getStringConfig(data, "imagemMobileUrl") ||
        getStringConfig(data, "imagemMobile"),
      tipoMidia: getStringConfig(data, "tipoMidia") === "VIDEO" ? "VIDEO" : "IMAGEM",
      videoDesktopUrl: getStringConfig(data, "videoDesktopUrl"),
      videoMobileUrl: getStringConfig(data, "videoMobileUrl"),
      mediaPositionDesktop,
      mediaPositionMobile,
      mediaCropDesktopX,
      mediaCropDesktopY,
      mediaCropMobileX: getNumberConfig(
        data,
        "mediaCropMobileX",
        mediaCropDesktopX
      ),
      mediaCropMobileY: getNumberConfig(
        data,
        "mediaCropMobileY",
        mediaCropDesktopY
      ),
      tamanhoMosaico: normalizarTamanhoMosaicoColecoes(
        getStringConfig(data, "tamanhoMosaico")
      ),
      ordem: getNumberConfig(data, "ordem", index),
    };
  });
}

function getFrameWidth(device: DevicePreview) {
  if (device === "MOBILE") {
    return "390px";
  }

  if (device === "TABLET") {
    return "768px";
  }

  return "1440px";
}

function getFrameClass(device: DevicePreview) {
  if (device === "MOBILE") {
    return "w-[390px]";
  }

  if (device === "TABLET") {
    return "w-[768px]";
  }

  return "w-[1440px]";
}

function getFrameLabel(device: DevicePreview) {
  if (device === "MOBILE") return "Mobile";
  if (device === "TABLET") return "Tablet";
  return "Desktop";
}

function getDeviceDescription(device: DevicePreview) {
  if (device === "MOBILE") {
    return "Canvas em largura real aproximada de mobile, com scroll horizontal se a tela administrativa for menor.";
  }

  if (device === "TABLET") {
    return "Canvas em largura real aproximada de tablet, sem reduzir fonte, crop ou espaçamentos.";
  }

  return "Canvas em largura desktop real. Painéis podem ser recolhidos para visualizar 100%.";
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
  if (overlay === "GRADIENTE") {
    return "bg-gradient-to-r from-black/60 via-black/25 to-transparent";
  }

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

function getButtonRadiusPreviewClass(value: string) {
  if (value === "RETO") return "rounded-none";
  if (value === "SUAVE") return "rounded-md";
  if (value === "ARREDONDADO") return "rounded-2xl";

  return "rounded-full";
}

function getTextAlignPreviewClass(value: string) {
  if (value === "ESQUERDA") return "text-left";
  if (value === "DIREITA") return "text-right";

  return "text-center";
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
  defaultOpen = false,
  className = "",
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}
    >
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
  className = "",
  onChange,
}: {
  checked: boolean;
  label: string;
  description?: string;
  className?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 ${className}`}
    >
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
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
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

function ButtonRadiusControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">
        Borda dos botões
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
      >
        {ESTILO_BORDA_BOTAO_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResponsiveTextAlignControls({
  desktopValue,
  mobileValue,
  onChange,
}: {
  desktopValue: string;
  mobileValue: string;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Alinhamento do texto desktop
        </span>
        <select
          value={desktopValue}
          onChange={(event) =>
            onChange({ alinhamentoTextoDesktop: event.target.value })
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
          Alinhamento do texto mobile
        </span>
        <select
          value={mobileValue}
          onChange={(event) =>
            onChange({ alinhamentoTextoMobile: event.target.value })
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
    </div>
  );
}

function VisualCropControl({
  label,
  imageUrl,
  videoUrl,
  posterUrl,
  tipoMidia,
  focoX,
  focoY,
  zoom,
  aspectClass = "aspect-[4/3]",
  onChange,
}: {
  label: string;
  imageUrl: string;
  videoUrl: string;
  posterUrl?: string;
  tipoMidia: string;
  focoX: number;
  focoY: number;
  zoom: number;
  aspectClass?: string;
  onChange: (data: { focoX: number; focoY: number; zoom: number }) => void;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const safeX = clampMediaCropValue(focoX);
  const safeY = clampMediaCropValue(focoY);
  const safeZoom = Math.max(80, Math.min(180, Number(zoom) || 100));
  const mediaUrl = tipoMidia === "VIDEO" ? videoUrl : imageUrl;
  const objectPosition = getMediaObjectPosition(safeX, safeY);

  function updateFocusFromPointer(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = previewRef.current?.getBoundingClientRect();

    if (!rect) return;

    const nextX = clampMediaCropValue(((event.clientX - rect.left) / rect.width) * 100);
    const nextY = clampMediaCropValue(((event.clientY - rect.top) / rect.height) * 100);

    onChange({ focoX: nextX, focoY: nextY, zoom: safeZoom });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Clique na prévia para mover o ponto de foco.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange({ focoX: 50, focoY: 50, zoom: 100 })}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Resetar
        </button>
      </div>

      <div
        ref={previewRef}
        role="button"
        tabIndex={0}
        onClick={updateFocusFromPointer}
        className={`relative overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 ${aspectClass}`}
      >
        {tipoMidia === "VIDEO" && mediaUrl ? (
          <video
            src={mediaUrl}
            poster={posterUrl || undefined}
            muted
            playsInline
            className="h-full w-full object-cover"
            style={{
              objectPosition,
              transform: `scale(${safeZoom / 100})`,
            }}
          />
        ) : mediaUrl ? (
          <img
            src={mediaUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{
              objectPosition,
              transform: `scale(${safeZoom / 100})`,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
            Adicionar imagem
          </div>
        )}

        <span
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow-lg ring-2 ring-slate-950/20"
          style={{ left: `${safeX}%`, top: `${safeY}%` }}
        />
      </div>

      <RangeControl
        label="Zoom"
        value={safeZoom}
        min={80}
        max={180}
        suffix="%"
        onChange={(value) => onChange({ focoX: safeX, focoY: safeY, zoom: value })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <RangeControl
          label="Foco horizontal"
          value={safeX}
          min={0}
          max={100}
          suffix="%"
          onChange={(value) => onChange({ focoX: value, focoY: safeY, zoom: safeZoom })}
        />
        <RangeControl
          label="Foco vertical"
          value={safeY}
          min={0}
          max={100}
          suffix="%"
          onChange={(value) => onChange({ focoX: safeX, focoY: value, zoom: safeZoom })}
        />
      </div>
    </div>
  );
}

function getResponsiveMediaFromEstado({
  estado,
  aspectRatioDesktop,
  aspectRatioMobile,
}: {
  estado: NonNullable<BlocoEditandoState>;
  aspectRatioDesktop: string;
  aspectRatioMobile: string;
}): ResponsiveMediaConfig {
  return createResponsiveMediaConfig({
    desktopUrl: estado.imagemDesktopUrl,
    mobileUrl: estado.imagemMobileUrl,
    alt: estado.imagemAlt || estado.titulo,
    aspectRatioDesktop,
    aspectRatioMobile,
    desktopPositionX: estado.mediaCropDesktopX,
    desktopPositionY: estado.mediaCropDesktopY,
    mobilePositionX: estado.mediaCropMobileX,
    mobilePositionY: estado.mediaCropMobileY,
    desktopZoom: estado.mediaZoomDesktop,
    mobileZoom: estado.mediaZoomMobile,
  });
}

function getEstadoPatchFromResponsiveMedia(
  media: ResponsiveMediaConfig
): Partial<NonNullable<BlocoEditandoState>> {
  return {
    imagemDesktopUrl: media.desktop.url || "",
    imagemMobileUrl:
      media.usarImagemMobileAlternativa && media.mobileUrl
        ? media.mobileUrl
        : "",
    imagemAlt: media.desktop.alt || media.mobile.alt || "",
    mediaCropDesktopX: media.desktop.positionX,
    mediaCropDesktopY: media.desktop.positionY,
    mediaCropMobileX: media.mobile.positionX,
    mediaCropMobileY: media.mobile.positionY,
    mediaZoomDesktop: media.desktop.zoom,
    mediaZoomMobile: media.mobile.zoom,
    mediaPositionDesktop: getMediaCropObjectPosition(media.desktop),
    mediaPositionMobile: getMediaCropObjectPosition(media.mobile),
  };
}

function getTextoImagemCropContext(
  estado: NonNullable<BlocoEditandoState>
): MediaCropContext {
  return estado.larguraMidiaDesktop === "SANGRANDO_ATE_BORDA" ||
    estado.larguraMidiaMobile === "SANGRANDO_ATE_BORDA"
    ? "TEXTO_IMAGEM_SANGRADA"
    : "TEXTO_IMAGEM_CONTIDA";
}

function getTextoImagemAspectRatio(
  estado: NonNullable<BlocoEditandoState>,
  device: "DESKTOP" | "MOBILE"
) {
  if (device === "MOBILE") {
    return estado.larguraMidiaMobile === "SANGRANDO_ATE_BORDA"
      ? "4:5"
      : "4:5";
  }

  if (estado.larguraMidiaDesktop === "SANGRANDO_ATE_BORDA") {
    return estado.alturaBlocoTextoImagem === "ALTO" ? "9:16" : "4:5";
  }

  return estado.layoutDesktopTextoImagem === "TEXTO_SOBRE_IMAGEM"
    ? "16:9"
    : "4:5";
}

function getBannerCropContext(estado: NonNullable<BlocoEditandoState>): MediaCropContext {
  return estado.alturaBanner === "TELA_CHEIA" ? "BANNER_21_9" : "BANNER_16_9";
}

function TextoImagemStyleControls({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TextStyleConfig;
  onChange: (value: TextStyleConfig) => void;
}) {
  function update(patch: Partial<TextStyleConfig>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Tamanho
          </span>
          <select
            value={value.fontSizePreset}
            onChange={(event) => update({ fontSizePreset: event.target.value })}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          >
            {TEXT_FONT_SIZE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Peso
          </span>
          <select
            value={value.fontWeight}
            onChange={(event) => update({ fontWeight: event.target.value })}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          >
            {TEXT_FONT_WEIGHT_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Cor
          </span>
          <select
            value={value.colorPreset}
            onChange={(event) => update({ colorPreset: event.target.value })}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          >
            {TEXT_COLOR_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Cor personalizada
          </span>
          <input
            type="color"
            value={value.colorCustom || "#0f172a"}
            onChange={(event) =>
              update({ colorPreset: "PERSONALIZADO", colorCustom: event.target.value })
            }
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Alinhamento
          </span>
          <select
            value={value.textAlign}
            onChange={(event) => update({ textAlign: event.target.value })}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          >
            {TEXT_ALIGN_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Line-height
          </span>
          <select
            value={value.lineHeight}
            onChange={(event) => update({ lineHeight: event.target.value })}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          >
            {TEXT_LINE_HEIGHT_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Espaçamento entre letras
          </span>
          <select
            value={value.letterSpacing}
            onChange={(event) => update({ letterSpacing: event.target.value })}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          >
            {TEXT_LETTER_SPACING_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Transformação
          </span>
          <select
            value={value.textTransform}
            onChange={(event) => update({ textTransform: event.target.value })}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          >
            {TEXT_TRANSFORM_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RangeControl
          label="Margem superior"
          value={value.marginTop}
          min={0}
          max={80}
          suffix="px"
          onChange={(marginTop) => update({ marginTop })}
        />
        <RangeControl
          label="Margem inferior"
          value={value.marginBottom}
          min={0}
          max={80}
          suffix="px"
          onChange={(marginBottom) => update({ marginBottom })}
        />
      </div>
    </div>
  );
}

function PreviewShell({
  children,
  device,
  previewPublico = false,
}: {
  children: ReactNode;
  device: DevicePreview;
  previewPublico?: boolean;
}) {
  return (
    <div className="min-w-0 bg-slate-100">
      {!previewPublico && (
        <div className="sticky left-0 top-0 z-20 flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {device === "DESKTOP" && <Monitor className="h-4 w-4" />}
            {device === "TABLET" && <Tablet className="h-4 w-4" />}
            {device === "MOBILE" && <Smartphone className="h-4 w-4" />}
            Canvas {getFrameLabel(device)}
          </div>

          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
            {getFrameWidth(device)} sem escala
          </span>
        </div>
      )}
      <div
        className={`loja-publica stella-storefront-render min-h-screen shrink-0 overflow-hidden bg-white text-slate-900 antialiased shadow-sm ring-1 ring-slate-200 ${getFrameClass(
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
      TiptapLink.configure({
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
  onContextSelect,
  device,
  modoPreviewPublico = false,
  onInlineTextChange,
  onInlineCardChange,
  onInlineColecaoItemChange,
  categoriasDisponiveis,
  produtosDisponiveis,
}: {
  bloco: EditorVisualBloco;
  selecionado: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onContextSelect: (context: EditorSelectionContext) => void;
  device: DevicePreview;
  modoPreviewPublico?: boolean;
  categoriasDisponiveis: EditorVisualCategoria[];
  produtosDisponiveis: EditorVisualProduto[];
  onInlineTextChange: (blocoId: string, patch: Record<string, unknown>) => void;
  onInlineCardChange: (
    blocoId: string,
    cardId: string,
    patch: Partial<DestaqueCardEditando>
  ) => void;
  onInlineColecaoItemChange: (
    blocoId: string,
    itemId: string,
    patch: Partial<ColecaoCategoriaItemEditando>
  ) => void;
}) {
  const config = getConfigObject(bloco.configJson);
  function handleEditClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onContextSelect("BLOCO");
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
  const exibirSetasCarrossel = getBooleanConfig(
    config,
    "exibirSetasCarrossel",
    true
  );
  const posicaoSetasCarrossel =
    getStringConfig(config, "posicaoSetasCarrossel") || "LATERAIS";
  const estiloSetasCarrossel =
    getStringConfig(config, "estiloSetasCarrossel") || "CIRCULO";
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
  const alinhamentoTextoDesktop =
    getStringConfig(config, "alinhamentoTextoDesktop") ||
    getStringConfig(config, "alinhamento") ||
    alinhamentoBanner ||
    "CENTRO";
  const alinhamentoTextoMobile =
    getStringConfig(config, "alinhamentoTextoMobile") ||
    alinhamentoTextoDesktop;
  const alinhamentoTextoAtual =
    device === "MOBILE" ? alinhamentoTextoMobile : alinhamentoTextoDesktop;
  const textAlignPreviewClass = getTextAlignPreviewClass(alinhamentoTextoAtual);
  const estiloBordaBotao =
    getStringConfig(config, "estiloBordaBotao") || "PILULA";
  const buttonRadiusPreviewClass = getButtonRadiusPreviewClass(estiloBordaBotao);
  const larguraMidiaDesktop =
    getStringConfig(config, "larguraMidiaDesktop") ||
    getStringConfig(config, "larguraMidia") ||
    "CONTIDA";
  const larguraMidiaMobile =
    getStringConfig(config, "larguraMidiaMobile") || larguraMidiaDesktop;
  const larguraMidiaAtual =
    device === "MOBILE" ? larguraMidiaMobile : larguraMidiaDesktop;
  const textoImagemFullBleed = larguraMidiaAtual === "FULL_BLEED";
  const alturaBanner = getStringConfig(config, "alturaBanner") || "PADRAO";
  const modeloBanner = getStringConfig(config, "modeloBanner") || "BANNER_EDITORIAL";
  const larguraBanner = getStringConfig(config, "larguraBanner") || "FULL_BLEED";
  const overlayBanner = getStringConfig(config, "overlayBanner") || "LEVE";
  const corTextoBanner = getStringConfig(config, "corTextoBanner") || "CLARO";
  const produtosFlutuantesAtivos = getBooleanConfig(
    config,
    "produtosFlutuantesAtivos",
    modeloBanner === "PRODUTOS_FLUTUANTES"
  );
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
  const produtosFlutuantesIds = getArrayConfig(config, "produtosIds").map(String);
  const produtosFlutuantesSelecionados = produtosFlutuantesIds
    .map((produtoId) => getProdutoResumo(produtoId, produtosDisponiveis))
    .filter((produto): produto is EditorVisualProduto => Boolean(produto))
    .slice(0, 3);
  const produtosFlutuantesPreview =
    produtosFlutuantesSelecionados.length > 0
      ? produtosFlutuantesSelecionados
      : [
          {
            id: "preview-produto-1",
            codigoInterno: "SC001",
            nome: "Anel Stella",
            imagemUrl: "",
            categoria: "Coleção",
            categoriaIds: [],
            categoriaNomes: [],
          },
          {
            id: "preview-produto-2",
            codigoInterno: "SC002",
            nome: "Colar luz",
            imagemUrl: "",
            categoria: "Coleção",
            categoriaIds: [],
            categoriaNomes: [],
          },
          {
            id: "preview-produto-3",
            codigoInterno: "SC003",
            nome: "Brinco brilho",
            imagemUrl: "",
            categoria: "Coleção",
            categoriaIds: [],
            categoriaNomes: [],
          },
        ];
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
    <div className={textAlignPreviewClass}>
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
          } ${buttonRadiusPreviewClass}`}
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
  const layoutVisualColecoes = normalizarLayoutVisualColecoes(
    getStringConfig(config, "layoutVisual")
  );
  const presetMosaicoColecoes = normalizarPresetMosaicoColecoes(
    getStringConfig(config, "presetMosaico")
  );
  const gapMosaicoColecoes = normalizarGapMosaicoColecoes(
    getStringConfig(config, "gapMosaico")
  );
  const gapMosaicoColecoesStyle = {
    gap: `${getGapMosaicoColecoesPx(gapMosaicoColecoes)}px`,
  };
  const layoutVisualColecoesEfetivo = presetMosaicoColecoes.startsWith("GRID_")
    ? "GRID_EDITORIAL"
    : layoutVisualColecoes;
  const larguraConteudoColecoes = normalizarLarguraConteudoColecoes(
    getStringConfig(config, "larguraConteudo")
  );
  const estiloEtiquetaColecoes = normalizarEstiloEtiquetaColecoes(
    getStringConfig(config, "estiloEtiqueta")
  );
  const tamanhoEtiquetaColecoes = normalizarTamanhoEtiquetaColecoes(
    getStringConfig(config, "tamanhoEtiqueta")
  );
  const posicaoEtiquetaColecoes = normalizarPosicaoEtiquetaColecoes(
    getStringConfig(config, "posicaoEtiqueta")
  );
  const larguraEtiquetaColecoes = normalizarLarguraEtiquetaColecoes(
    getStringConfig(config, "larguraEtiqueta")
  );
  const exibirLinhaEtiquetaColecoes = getBooleanConfig(
    config,
    "exibirLinhaEtiqueta",
    true
  );
  const exibirEtiquetaColecoes =
    getBooleanConfig(
      config,
      "exibirEtiqueta",
      estiloEtiquetaColecoes !== "OCULTA"
    ) && estiloEtiquetaColecoes !== "OCULTA";
  const exibirBotaoEtiquetaColecoes = getBooleanConfig(
    config,
    "exibirBotaoEtiqueta",
    false
  );
  const larguraCabecalhoDesktopColecoes = getNumberConfig(
    config,
    "larguraCabecalhoDesktop",
    32
  );
  const posicaoCabecalhoMosaicoColecoes = normalizarPosicaoCabecalhoMosaico(
    getStringConfig(config, "posicaoCabecalhoMosaico")
  );
  const tipoCabecalhoColecoes = normalizarTipoCabecalhoColecoes(
    getStringConfig(config, "tipoCabecalho")
  );
  const logoTituloUrl = getStringConfig(config, "logoTituloUrl");
  const logoTituloMobileUrl = getStringConfig(config, "logoTituloMobileUrl");
  const logoTituloAlt = getStringConfig(config, "logoTituloAlt") || titulo;
  const logoTituloLarguraDesktop = getNumberConfig(
    config,
    "logoTituloLarguraDesktop",
    420
  );
  const logoTituloLarguraMobile = getNumberConfig(
    config,
    "logoTituloLarguraMobile",
    260
  );
  const logoTituloPosicao = normalizarPosicaoLogoTitulo(
    getStringConfig(config, "logoTituloPosicao")
  );
  const imagemTituloUrl = getStringConfig(config, "imagemTituloUrl");
  const imagemTituloMobileUrl = getStringConfig(config, "imagemTituloMobileUrl");
  const imagemTituloAlt = getStringConfig(config, "imagemTituloAlt") || titulo;
  const imagemTituloLarguraDesktop = getNumberConfig(
    config,
    "imagemTituloLarguraDesktop",
    520
  );
  const imagemTituloLarguraMobile = getNumberConfig(
    config,
    "imagemTituloLarguraMobile",
    300
  );
  const alinhamentoCabecalhoDesktop =
    getStringConfig(config, "alinhamentoCabecalhoDesktop") ||
    alinhamentoTextoDesktop;
  const alinhamentoCabecalhoMobile =
    getStringConfig(config, "alinhamentoCabecalhoMobile") ||
    alinhamentoTextoMobile;
  const alinhamentoCabecalhoAtual = isMobile
    ? alinhamentoCabecalhoMobile
    : alinhamentoCabecalhoDesktop;
  const headerAlignPreviewClass = getTextAlignPreviewClass(
    alinhamentoCabecalhoAtual
  );
  const headerBlockAlignPreviewClass =
    alinhamentoCabecalhoAtual === "DIREITA"
      ? "ml-auto"
      : alinhamentoCabecalhoAtual === "CENTRO"
        ? "mx-auto"
        : "";
  const headerJustifyClass =
    alinhamentoCabecalhoAtual === "DIREITA"
      ? "justify-end"
      : alinhamentoCabecalhoAtual === "CENTRO"
        ? "justify-center"
        : "justify-start";
  const logoHeaderUrl =
    isMobile && logoTituloMobileUrl ? logoTituloMobileUrl : logoTituloUrl;
  const imagemTituloHeaderUrl =
    isMobile && imagemTituloMobileUrl ? imagemTituloMobileUrl : imagemTituloUrl;
  const logoHeaderWidth = isMobile
    ? logoTituloLarguraMobile
    : logoTituloLarguraDesktop;
  const imagemTituloHeaderWidth = isMobile
    ? imagemTituloLarguraMobile
    : imagemTituloLarguraDesktop;
  const itensColecoes = getItensColecoesConfig(config);
  const itensColecoesPreview =
    itensColecoes.length > 0
      ? itensColecoes
      : [1, 2, 3, 4].map((index) => criarItemColecaoPreviewPadrao(index));
  const colunasColecoes =
    device === "MOBILE"
      ? Math.max(1, getNumberConfig(config, "colunasMobile", 1))
      : device === "TABLET"
        ? Math.max(1, getNumberConfig(config, "colunasTablet", 2))
        : getColecoesGridColumnsByPreset(
            presetMosaicoColecoes,
            Math.max(1, getNumberConfig(config, "colunasDesktop", 4))
          );
  const colecoesWidthClass =
    larguraConteudoColecoes === "CONTIDA"
      ? "max-w-5xl"
      : larguraConteudoColecoes === "TOTAL"
        ? "max-w-none"
        : "max-w-7xl";
  const renderColecaoItemMedia = (
    item: ColecaoCategoriaItemEditando,
    className: string
  ) => {
    const imageUrl =
      isMobile && item.imagemMobileUrl
        ? item.imagemMobileUrl
        : item.imagemDesktopUrl;
    const videoUrl =
      isMobile && item.videoMobileUrl
        ? item.videoMobileUrl
        : item.videoDesktopUrl;
    const objectPosition = isMobile
      ? getMediaObjectPosition(
          item.mediaCropMobileX,
          item.mediaCropMobileY
        )
      : getMediaObjectPosition(
          item.mediaCropDesktopX,
          item.mediaCropDesktopY
        );

    return (
      <div className={`overflow-hidden bg-slate-100 ${className}`}>
        <MediaPreview
          tipoMidia={item.tipoMidia}
          imageUrl={imageUrl}
          videoUrl={videoUrl}
          alt={item.titulo || item.categoriaNome || "Coleção"}
          objectPosition={objectPosition}
          placeholder="Sem mídia"
        />
      </div>
    );
  };
  const colecoesHeaderText = (
    <>
      <RichTextInlineEditor
        value={tituloRichText}
        fallbackText={titulo}
        placeholder="Clique para adicionar um título"
        className="tracking-tight"
        style={resolveTextStyle(tituloSecaoStyle)}
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
        className={`mt-3 leading-7 ${
          corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
        }`}
        style={resolveTextStyle(subtituloSecaoStyle)}
        onChange={(richText, plainText) =>
          onInlineTextChange(bloco.id, {
            subtituloRichText: richText,
            textoRichText: richText,
            texto: plainText,
            descricao: plainText,
            subtitulo: plainText,
          })
        }
      />
    </>
  );
  const colecoesLogoHeader = logoHeaderUrl ? (
    <div className={`flex ${headerJustifyClass}`}>
      <img
        src={logoHeaderUrl}
        alt={logoTituloAlt}
        className="block h-auto max-w-full object-contain"
        style={{ width: `${logoHeaderWidth}px` }}
      />
    </div>
  ) : (
    <div
      className={`inline-flex min-h-16 w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 text-sm text-slate-400`}
    >
      Logo do título
    </div>
  );
  const colecoesImagemTituloHeader = imagemTituloHeaderUrl ? (
    <div className={`flex ${headerJustifyClass}`}>
      <img
        src={imagemTituloHeaderUrl}
        alt={imagemTituloAlt}
        className="block h-auto max-w-full object-contain"
        style={{ width: `${imagemTituloHeaderWidth}px` }}
      />
    </div>
  ) : (
    <div className="inline-flex min-h-20 w-full max-w-md items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 text-sm text-slate-400">
      Imagem de título
    </div>
  );
  const colecoesHeaderPreview = (
    <div
      className={`w-full max-w-3xl ${headerBlockAlignPreviewClass} ${headerAlignPreviewClass}`}
    >
      {tipoCabecalhoColecoes === "LOGO" ? (
        <>
          {colecoesLogoHeader}
          {subtituloRichText || texto ? (
            <RichTextInlineEditor
              value={subtituloRichText}
              fallbackText={texto || ""}
              placeholder="Clique para adicionar um subtítulo"
              multiline
              className={`mt-3 leading-7 ${
                corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
              }`}
              style={resolveTextStyle(subtituloSecaoStyle)}
              onChange={(richText, plainText) =>
                onInlineTextChange(bloco.id, {
                  subtituloRichText: richText,
                  textoRichText: richText,
                  texto: plainText,
                  descricao: plainText,
                  subtitulo: plainText,
                })
              }
            />
          ) : null}
        </>
      ) : tipoCabecalhoColecoes === "IMAGEM_TITULO" ? (
        <>
          {colecoesImagemTituloHeader}
          {subtituloRichText || texto ? (
            <RichTextInlineEditor
              value={subtituloRichText}
              fallbackText={texto || ""}
              placeholder="Clique para adicionar um subtítulo"
              multiline
              className={`mt-3 leading-7 ${
                corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
              }`}
              style={resolveTextStyle(subtituloSecaoStyle)}
              onChange={(richText, plainText) =>
                onInlineTextChange(bloco.id, {
                  subtituloRichText: richText,
                  textoRichText: richText,
                  texto: plainText,
                  descricao: plainText,
                  subtitulo: plainText,
                })
              }
            />
          ) : null}
        </>
      ) : tipoCabecalhoColecoes === "TEXTO_LOGO" ? (
        <div
          className={
            logoTituloPosicao === "AO_LADO"
              ? `flex flex-col gap-4 lg:flex-row lg:items-center ${headerJustifyClass}`
              : "space-y-4"
          }
        >
          {logoTituloPosicao === "ACIMA" && colecoesLogoHeader}
          <div>{colecoesHeaderText}</div>
          {logoTituloPosicao !== "ACIMA" && colecoesLogoHeader}
        </div>
      ) : (
        colecoesHeaderText
      )}
    </div>
  );
  const renderColecaoItemLabel = (
    item: ColecaoCategoriaItemEditando,
    overlay: boolean
  ) => {
    if (!exibirEtiquetaColecoes) return null;

    const tituloItem = item.titulo || item.categoriaNome;
    const etiquetaBaseClass = overlay
      ? `absolute z-10 bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur ${getColecoesLabelPositionClass(
          posicaoEtiquetaColecoes
        )} ${getColecoesLabelSizeClass(tamanhoEtiquetaColecoes)} ${getColecoesLabelWidthClass(
          larguraEtiquetaColecoes
        )} break-words`
      : "pt-4";
    const titleClass = overlay
      ? tamanhoEtiquetaColecoes === "GRANDE"
        ? "text-sm text-slate-950"
        : "text-xs text-slate-950"
      : "text-slate-950";
    const bodyClass = overlay
      ? tamanhoEtiquetaColecoes === "PEQUENA"
        ? "mt-1 text-[11px] leading-4 text-slate-500"
        : "mt-1.5 text-xs leading-5 text-slate-500"
      : "mt-2 leading-6 text-slate-500";

    return (
      <div className={etiquetaBaseClass}>
        <RichTextInlineEditor
          value={item.tituloRichText}
          fallbackText={tituloItem}
          placeholder="Título da coleção"
          className={titleClass}
          style={resolveTextStyle(cardTituloStyle)}
          onChange={(richText, plainText) =>
            onInlineColecaoItemChange(bloco.id, item.id, {
              tituloRichText: richText,
              titulo: plainText,
            })
          }
        />
        {exibirLinhaEtiquetaColecoes && overlay ? (
          <span className="my-2 block h-px w-8 bg-slate-950/30" />
        ) : null}
        <RichTextInlineEditor
          value={item.subtituloRichText}
          fallbackText={item.subtitulo}
          placeholder="Chamada da coleção"
          multiline
          className={bodyClass}
          style={resolveTextStyle(cardTextoStyle)}
          onChange={(richText, plainText) =>
            onInlineColecaoItemChange(bloco.id, item.id, {
              subtituloRichText: richText,
              subtitulo: plainText,
            })
          }
        />
        {exibirBotaoEtiquetaColecoes && item.textoLink && (
          <span
            className={`mt-2 inline-flex border border-slate-950 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-950 ${buttonRadiusPreviewClass}`}
          >
            {item.textoLink}
          </span>
        )}
      </div>
    );
  };

  return (
    <section
      role={modoPreviewPublico ? undefined : "button"}
      tabIndex={modoPreviewPublico ? undefined : 0}
      onClick={
        modoPreviewPublico
          ? undefined
          : () => {
              onSelect();
              onContextSelect("DESIGN");
            }
      }
      onKeyDown={(event) => {
        if (modoPreviewPublico) return;

        if (event.key === "Enter" || event.key === " ") {
          onSelect();
          onContextSelect("DESIGN");
        }
      }}
      className={`group relative border-2 transition ${
        modoPreviewPublico
          ? "border-transparent"
          : selecionado
          ? "border-indigo-500 bg-indigo-50/40"
          : "border-transparent hover:border-indigo-200"
      } ${modoPreviewPublico ? "" : "cursor-pointer"} ${
        bloco.ativo ? "" : "opacity-50"
      }`}
    >
      {!modoPreviewPublico && (
        <>
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
        </>
      )}

      {isVitrineEditorialTipo(bloco.tipo) ? (
        <VitrineEditorialPublico
          bloco={bloco}
          device={device}
          modo="editor"
          categorias={categoriasDisponiveis}
        />
      ) : isBannerTipo(bloco.tipo) ? (
        <>
          <BannerRenderer
            bloco={bloco}
            produtos={toBannerProdutosPublicos(produtosDisponiveis)}
            device={device}
            modo="editor"
            onElementSelect={(element) => {
              if (modoPreviewPublico) return;
              onSelect();
              onContextSelect(
                element === "CTA"
                  ? "BOTAO"
                  : element === "MIDIA" || element === "IMAGEM_FRENTE"
                    ? "IMAGEM"
                    : element === "PRODUTOS"
                      ? "PRODUTOS"
                      : "TEXTO"
              );
            }}
            titleSlot={({ className, style }) => (
              <RichTextInlineEditor
                value={tituloRichText}
                fallbackText={titulo}
                placeholder="Clique para adicionar um título"
                multiline
                className={className}
                style={style}
                onChange={(richText, plainText) =>
                  onInlineTextChange(bloco.id, {
                    tituloRichText: richText,
                    titulo: plainText,
                  })
                }
              />
            )}
            subtitleSlot={({ className, style }) => (
              <RichTextInlineEditor
                value={subtituloRichText}
                fallbackText={texto || ""}
                placeholder="Clique para adicionar um subtítulo"
                multiline
                className={className}
                style={style}
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
            primaryCtaSlot={({ className, style }) => (
              <InlineTextEditor
                value={textoBotao}
                placeholder="Botão primário"
                className={className}
                style={style}
                onChange={(value) =>
                  onInlineTextChange(bloco.id, {
                    textoBotao: value,
                    botaoTexto: value,
                  })
                }
              />
            )}
            secondaryCtaSlot={({ className, style }) => (
              <InlineTextEditor
                value={textoBotaoSecundario}
                placeholder="Botão secundário"
                className={className}
                style={style}
                onChange={(value) =>
                  onInlineTextChange(bloco.id, {
                    textoBotaoSecundario: value,
                    botaoSecundarioTexto: value,
                  })
                }
              />
            )}
          />

        <div
          className={`hidden bg-white ${
            larguraBanner === "CONTIDA" ? "px-4 py-5" : ""
          }`}
        >
          <div
            className={`relative overflow-hidden bg-slate-900 ${
              larguraBanner === "CONTIDA" ? "mx-auto max-w-7xl" : ""
            } ${getBannerHeightClass(alturaBanner, isMobile)}`}
          >
            {exibirMidia ? (
              <div
                className={
                  modeloBanner === "IMAGEM_LATERAL" && !isMobile
                    ? "absolute inset-y-0 right-0 w-[58%]"
                    : "absolute inset-0"
                }
              >
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

            {modeloBanner === "IMAGEM_LATERAL" && !isMobile ? (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
            ) : (
              <div className={`absolute inset-0 ${getBannerOverlayClass(overlayBanner)}`} />
            )}

            {exibirTexto && (
              <div
                className={`absolute inset-0 z-10 flex items-center ${getBannerAlignmentClass(
                  modeloBanner === "FAIXA_PROMOCIONAL" ? "CENTRO" : alinhamentoBanner,
                  isMobile
                )}`}
              >
                <div
                  className={`${
                    isMobile
                      ? "max-w-sm"
                      : modeloBanner === "IMAGEM_LATERAL"
                        ? "max-w-lg"
                        : "max-w-2xl"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.22em] ${bannerTextClasses.eyebrow}`}
                  >
                    Stella
                  </p>

                  <div
                    className={`mt-3 font-light tracking-tight ${bannerTextClasses.title} ${textAlignPreviewClass} ${
                      modeloBanner === "FAIXA_PROMOCIONAL"
                        ? isMobile
                          ? "text-3xl"
                          : "text-4xl"
                        : isMobile
                          ? "text-4xl"
                          : modeloBanner === "HERO_TELA_CHEIA"
                            ? "text-7xl"
                            : "text-5xl"
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
                          className={`inline-flex px-5 py-3 text-sm font-semibold ${buttonRadiusPreviewClass} ${bannerTextClasses.button}`}
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
                          className={`inline-flex border px-5 py-3 text-sm font-semibold ${buttonRadiusPreviewClass} ${
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

            {modeloBanner === "PRODUTOS_FLUTUANTES" && produtosFlutuantesAtivos && (
              <div className="pointer-events-none absolute bottom-6 right-6 z-20 hidden w-[42%] max-w-lg grid-cols-3 gap-3 md:grid">
                {produtosFlutuantesPreview.map((produto, index) => (
                  <div
                    key={produto.id}
                    className={`overflow-hidden bg-white/92 shadow-2xl ring-1 ring-black/5 backdrop-blur ${
                      index === 1 ? "translate-y-8" : ""
                    }`}
                  >
                    <div className="aspect-[3/4] bg-slate-100">
                      {produto.imagemUrl ? (
                        <img
                          src={produto.imagemUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-semibold text-slate-950">
                        {produto.nome}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {produto.codigoInterno}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
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
                    className={`mt-5 inline-flex bg-white px-5 py-3 text-slate-950 ${buttonRadiusPreviewClass}`}
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
                <div className={`min-h-[320px] bg-slate-100 ${textoImagemFullBleed ? "-mx-6 md:-mx-12" : ""}`}>
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
                <div className={`min-h-[320px] bg-slate-100 ${textoImagemFullBleed ? "-mx-6 md:-mx-12" : ""}`}>
                  {textoImagemMedia}
                </div>
              </>
            ) : (
              <>
                <div className={`min-h-[320px] bg-slate-100 ${textoImagemFullBleed ? "-mx-6 md:-mx-12" : ""}`}>
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

          {layoutAtualProdutos === "CARROSSEL" && exibirSetasCarrossel ? (
            <div
              className={`mt-4 flex gap-2 ${
                posicaoSetasCarrossel === "INFERIOR"
                  ? "justify-center"
                  : "justify-end"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 items-center justify-center border text-sm ${
                  estiloSetasCarrossel === "MINIMALISTA"
                    ? "border-transparent bg-transparent text-slate-600"
                    : "rounded-full border-slate-200 bg-white text-slate-700 shadow-sm"
                }`}
              >
                ←
              </span>
              <span
                className={`inline-flex h-9 w-9 items-center justify-center border text-sm ${
                  estiloSetasCarrossel === "MINIMALISTA"
                    ? "border-transparent bg-transparent text-slate-600"
                    : "rounded-full border-slate-200 bg-white text-slate-700 shadow-sm"
                }`}
              >
                →
              </span>
            </div>
          ) : null}

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
                        className={`mt-4 inline-flex bg-slate-950 px-4 py-2 text-white ${buttonRadiusPreviewClass}`}
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
      ) : isColecoesCategoriasTipo(bloco.tipo) ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <div
            className={`mx-auto ${colecoesWidthClass} ${
              larguraConteudoColecoes === "TOTAL" ? "" : "px-0"
            }`}
          >
            {layoutVisualColecoesEfetivo === "GRID_EDITORIAL" ? (
              <>
                {colecoesHeaderPreview}

                <div
                  className="mt-8 grid"
                  style={{
                    gridTemplateColumns: `repeat(${colunasColecoes}, minmax(0, 1fr))`,
                    ...gapMosaicoColecoesStyle,
                  }}
                >
                  {itensColecoesPreview.map((item) => (
                    <article key={item.id} className="min-w-0">
                      {renderColecaoItemMedia(item, "aspect-[4/5]")}
                      {exibirEtiquetaColecoes ? (
                        renderColecaoItemLabel(item, false)
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            ) : posicaoCabecalhoMosaicoColecoes === "TOPO" ? (
              <>
                {colecoesHeaderPreview}

                <div
                  className={`mt-8 ${getColecoesMosaicGridClass(presetMosaicoColecoes)}`}
                  style={gapMosaicoColecoesStyle}
                >
                  {itensColecoesPreview.map((item, index) => {
                    const tamanhoEfetivo = getTamanhoMosaicoEfetivo(
                      item,
                      index,
                      presetMosaicoColecoes
                    );
                    const itemFrameClass = getColecoesMosaicItemClass(
                      tamanhoEfetivo,
                      index,
                      presetMosaicoColecoes
                    );
                    const itemPlacementClass = getColecoesMosaicItemPlacementClass(
                      index,
                      presetMosaicoColecoes
                    );
                    const labelSobreposta =
                      estiloEtiquetaColecoes === "SOBREPOSTA";

                    return (
                      <article
                        key={item.id}
                        className={`relative h-full min-w-0 ${itemPlacementClass}`}
                      >
                        <div
                          className={`relative overflow-hidden ${itemFrameClass}`}
                        >
                          {renderColecaoItemMedia(item, "h-full min-h-full")}
                          {labelSobreposta
                            ? renderColecaoItemLabel(item, true)
                            : null}
                        </div>
                        {exibirEtiquetaColecoes && !labelSobreposta
                          ? renderColecaoItemLabel(item, false)
                          : null}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div
                className={`grid gap-7 lg:items-start ${getColecoesHeaderWidthClass(
                  larguraCabecalhoDesktopColecoes
                )}`}
              >
                <div className="lg:sticky lg:top-6">{colecoesHeaderPreview}</div>

                <div
                  className={getColecoesMosaicGridClass(presetMosaicoColecoes)}
                  style={gapMosaicoColecoesStyle}
                >
                  {itensColecoesPreview.map((item, index) => {
                    const tamanhoEfetivo = getTamanhoMosaicoEfetivo(
                      item,
                      index,
                      presetMosaicoColecoes
                    );
                    const itemFrameClass = getColecoesMosaicItemClass(
                      tamanhoEfetivo,
                      index,
                      presetMosaicoColecoes
                    );
                    const itemPlacementClass = getColecoesMosaicItemPlacementClass(
                      index,
                      presetMosaicoColecoes
                    );
                    const labelSobreposta =
                      estiloEtiquetaColecoes === "SOBREPOSTA";

                    return (
                      <article
                        key={item.id}
                        className={`relative h-full min-w-0 ${itemPlacementClass}`}
                      >
                        <div
                          className={`relative overflow-hidden ${itemFrameClass}`}
                        >
                          {renderColecaoItemMedia(item, "h-full min-h-full")}
                          {labelSobreposta
                            ? renderColecaoItemLabel(item, true)
                            : null}
                        </div>
                        {exibirEtiquetaColecoes && !labelSobreposta
                          ? renderColecaoItemLabel(item, false)
                          : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
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
                            <div className={`inline-flex bg-white px-5 py-3 text-slate-950 ${buttonRadiusPreviewClass}`}>
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
                            <div className={`inline-flex border border-white px-5 py-3 text-white ${buttonRadiusPreviewClass}`}>
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
                              className={`inline-flex px-5 py-3 ${buttonRadiusPreviewClass} ${ctaTextColors.button}`}
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
                            <div className={`inline-flex border border-current px-5 py-3 ${buttonRadiusPreviewClass}`}>
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

void PreviewShell;
void RenderBlocoPreview;

function ColecoesCategoriasModalFields({
  estado,
  categoriasDisponiveis,
  onChange,
}: {
  estado: NonNullable<BlocoEditandoState>;
  categoriasDisponiveis: EditorVisualCategoria[];
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  function updateItem(itemId: string, data: Partial<ColecaoCategoriaItemEditando>) {
    onChange({
      itensColecoes: estado.itensColecoes.map((item) =>
        item.id === itemId ? { ...item, ...data } : item
      ),
    });
  }

  function addItem() {
    onChange({
      itensColecoes: [
        ...estado.itensColecoes,
        criarItemColecaoPadrao(estado.itensColecoes.length + 1),
      ],
    });
  }

  function removeItem(itemId: string) {
    onChange({
      itensColecoes: estado.itensColecoes.filter((item) => item.id !== itemId),
    });
  }

  function moveItem(itemId: string, direction: "UP" | "DOWN") {
    const index = estado.itensColecoes.findIndex((item) => item.id === itemId);
    const nextIndex = direction === "UP" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= estado.itensColecoes.length) return;
    const itens = [...estado.itensColecoes];
    const [item] = itens.splice(index, 1);
    itens.splice(nextIndex, 0, item);
    onChange({ itensColecoes: itens.map((entry, ordem) => ({ ...entry, ordem })) });
  }

  function selectCategory(itemId: string, categoriaId: string) {
    const categoria = getCategoriaResumo(categoriaId, categoriasDisponiveis);
    const itemAtual = estado.itensColecoes.find((item) => item.id === itemId);
    updateItem(itemId, {
      tipoLink: "CATEGORIA",
      categoriaId: categoria?.id || "",
      categoriaSlug: categoria?.slug || "",
      categoriaNome: categoria?.nome || "",
      titulo: itemAtual?.titulo || categoria?.nome || "",
      linkUrl: categoria?.slug ? `/loja/categoria/${categoria.slug}` : "",
    });
  }

  function updatePosition(itemId: string, device: "DESKTOP" | "MOBILE", value: string) {
    const crop = getMediaCropFromPosition(value);
    updateItem(
      itemId,
      device === "DESKTOP"
        ? { mediaPositionDesktop: value, mediaCropDesktopX: crop.x, mediaCropDesktopY: crop.y }
        : { mediaPositionMobile: value, mediaCropMobileX: crop.x, mediaCropMobileY: crop.y }
    );
  }

  function updateCrop(
    itemId: string,
    device: "DESKTOP" | "MOBILE",
    axis: "X" | "Y",
    value: number
  ) {
    const crop = clampMediaCropValue(value);

    if (device === "DESKTOP") {
      updateItem(
        itemId,
        axis === "X"
          ? { mediaCropDesktopX: crop }
          : { mediaCropDesktopY: crop }
      );
      return;
    }

    updateItem(
      itemId,
      axis === "X"
        ? { mediaCropMobileX: crop }
        : { mediaCropMobileY: crop }
    );
  }

  return (
    <div className="space-y-5 px-6 py-5">
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">Nome interno</span>
        <input
          value={estado.nomeInterno}
          onChange={(event) => onChange({ nomeInterno: event.target.value })}
          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
        />
      </label>

      <SecaoRecolhivel title="Textos / conteúdo">
        <input
          value={estado.titulo}
          onChange={(event) => onChange({ titulo: event.target.value })}
          placeholder="Clique para adicionar um título"
          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
        />
        <textarea
          value={estado.texto}
          onChange={(event) => onChange({ texto: event.target.value })}
          rows={3}
          placeholder="Clique para adicionar um subtítulo"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
        />
      </SecaoRecolhivel>

      <PainelSecao title="Cabeçalho">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Tipo de cabeçalho
            </span>
            <select
              value={estado.tipoCabecalhoColecoes}
              onChange={(event) =>
                onChange({ tipoCabecalhoColecoes: event.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              {TIPO_CABECALHO_COLECOES_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Posição do logo
            </span>
            <select
              value={estado.logoTituloPosicao}
              onChange={(event) =>
                onChange({ logoTituloPosicao: event.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              disabled={estado.tipoCabecalhoColecoes !== "TEXTO_LOGO"}
            >
              {POSICAO_LOGO_TITULO_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(estado.tipoCabecalhoColecoes === "LOGO" ||
          estado.tipoCabecalhoColecoes === "TEXTO_LOGO") && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <UploadMidiaCampo
                label="Logo desktop URL"
                value={estado.logoTituloUrl}
                tipoMidia="IMAGEM"
                onChange={(url) => onChange({ logoTituloUrl: url })}
                orientacao="Cole uma URL ou envie PNG, JPG, WebP. SVG pode ser usado por URL."
              />
              <UploadMidiaCampo
                label="Logo mobile URL"
                value={estado.logoTituloMobileUrl}
                tipoMidia="IMAGEM"
                onChange={(url) => onChange({ logoTituloMobileUrl: url })}
                orientacao="Opcional. Quando vazio, usa o logo desktop."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={estado.logoTituloAlt}
                onChange={(event) => onChange({ logoTituloAlt: event.target.value })}
                placeholder="Alt do logo"
                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500 md:col-span-1"
              />
              <input
                type="number"
                min={40}
                value={estado.logoTituloLarguraDesktop}
                onChange={(event) =>
                  onChange({
                    logoTituloLarguraDesktop: Number(event.target.value) || 420,
                  })
                }
                aria-label="Largura desktop do logo"
                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
              <input
                type="number"
                min={40}
                value={estado.logoTituloLarguraMobile}
                onChange={(event) =>
                  onChange({
                    logoTituloLarguraMobile: Number(event.target.value) || 260,
                  })
                }
                aria-label="Largura mobile do logo"
                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </div>
          </div>
        )}

        {estado.tipoCabecalhoColecoes === "IMAGEM_TITULO" && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <UploadMidiaCampo
                label="Imagem de título desktop URL"
                value={estado.imagemTituloUrl}
                tipoMidia="IMAGEM"
                onChange={(url) => onChange({ imagemTituloUrl: url })}
                orientacao="Arte completa do título. PNG, JPG, WebP ou SVG por URL."
              />
              <UploadMidiaCampo
                label="Imagem de título mobile URL"
                value={estado.imagemTituloMobileUrl}
                tipoMidia="IMAGEM"
                onChange={(url) => onChange({ imagemTituloMobileUrl: url })}
                orientacao="Opcional. Quando vazio, usa a imagem desktop."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={estado.imagemTituloAlt}
                onChange={(event) =>
                  onChange({ imagemTituloAlt: event.target.value })
                }
                placeholder="Alt da imagem de título"
                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
              <input
                type="number"
                min={40}
                value={estado.imagemTituloLarguraDesktop}
                onChange={(event) =>
                  onChange({
                    imagemTituloLarguraDesktop:
                      Number(event.target.value) || 520,
                  })
                }
                aria-label="Largura desktop da imagem de título"
                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
              <input
                type="number"
                min={40}
                value={estado.imagemTituloLarguraMobile}
                onChange={(event) =>
                  onChange({
                    imagemTituloLarguraMobile:
                      Number(event.target.value) || 300,
                  })
                }
                aria-label="Largura mobile da imagem de título"
                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <select
            value={estado.alinhamentoCabecalhoDesktop}
            onChange={(event) =>
              onChange({ alinhamentoCabecalhoDesktop: event.target.value })
            }
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Alinhamento desktop do cabeçalho"
          >
            {TEXT_ALIGN_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                Desktop: {preset.label}
              </option>
            ))}
          </select>
          <select
            value={estado.alinhamentoCabecalhoMobile}
            onChange={(event) =>
              onChange({ alinhamentoCabecalhoMobile: event.target.value })
            }
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Alinhamento mobile do cabeçalho"
          >
            {TEXT_ALIGN_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                Mobile: {preset.label}
              </option>
            ))}
          </select>
        </div>
      </PainelSecao>

      <PainelSecao title="Layout">
        <div className="grid gap-4 md:grid-cols-2">
          <select value={estado.layoutVisualColecoes} onChange={(event) => onChange({ layoutVisualColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Layout visual">
            {LAYOUT_VISUAL_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <select value={estado.origemItensColecoes} onChange={(event) => onChange({ origemItensColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Origem dos itens">
            {ORIGEM_ITENS_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <select
            value={estado.presetMosaicoColecoes}
            onChange={(event) => {
              const preset = event.target.value;
              onChange({
                presetMosaicoColecoes: preset,
                layoutVisualColecoes: preset.startsWith("GRID_")
                  ? "GRID_EDITORIAL"
                  : "MOSAICO_EDITORIAL",
                colunasDesktopColecoes:
                  preset === "GRID_3_EDITORIAL"
                    ? 3
                    : preset === "GRID_4_EDITORIAL"
                      ? 4
                      : estado.colunasDesktopColecoes,
              });
            }}
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Preset de composição"
          >
            {PRESET_MOSAICO_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <select
            value={estado.gapMosaicoColecoes}
            onChange={(event) =>
              onChange({
                gapMosaicoColecoes: normalizarGapMosaicoColecoes(
                  event.target.value
                ),
              })
            }
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Espaçamento entre imagens"
          >
            {GAP_MOSAICO_COLECOES_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                Espaçamento entre imagens: {preset.label}
              </option>
            ))}
          </select>
          <select value={estado.larguraConteudoColecoes} onChange={(event) => onChange({ larguraConteudoColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Largura">
            {LARGURA_CONTEUDO_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <select value={estado.estiloEtiquetaColecoes} onChange={(event) => onChange({ estiloEtiquetaColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Etiqueta">
            {ESTILO_ETIQUETA_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <select value={estado.tamanhoEtiquetaColecoes} onChange={(event) => onChange({ tamanhoEtiquetaColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Tamanho da etiqueta">
            {TAMANHO_ETIQUETA_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>Etiqueta: {preset.label}</option>)}
          </select>
          <select value={estado.posicaoEtiquetaColecoes} onChange={(event) => onChange({ posicaoEtiquetaColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Posição da etiqueta">
            {POSICAO_ETIQUETA_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <select value={estado.larguraEtiquetaColecoes} onChange={(event) => onChange({ larguraEtiquetaColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Largura da etiqueta">
            {LARGURA_ETIQUETA_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>Largura: {preset.label}</option>)}
          </select>
          <select value={estado.posicaoCabecalhoMosaicoColecoes} onChange={(event) => onChange({ posicaoCabecalhoMosaicoColecoes: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Posição do cabeçalho no mosaico">
            {POSICAO_CABECALHO_MOSAICO_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            type="number"
            min={1}
            max={6}
            value={estado.colunasDesktopColecoes}
            onChange={(event) =>
              onChange({ colunasDesktopColecoes: Number(event.target.value) || 1 })
            }
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Colunas desktop"
          />
          <input
            type="number"
            min={1}
            max={4}
            value={estado.colunasTabletColecoes}
            onChange={(event) =>
              onChange({ colunasTabletColecoes: Number(event.target.value) || 1 })
            }
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Colunas tablet"
          />
          <input
            type="number"
            min={1}
            max={3}
            value={estado.colunasMobileColecoes}
            onChange={(event) =>
              onChange({ colunasMobileColecoes: Number(event.target.value) || 1 })
            }
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Colunas mobile"
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Largura do cabeçalho lateral (%)
            </span>
            <input
              type="number"
              min={25}
              max={40}
              value={estado.larguraCabecalhoDesktopColecoes}
              onChange={(event) =>
                onChange({
                  larguraCabecalhoDesktopColecoes: Number(event.target.value) || 32,
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={estado.exibirLinhaEtiquetaColecoes}
              onChange={(event) =>
                onChange({ exibirLinhaEtiquetaColecoes: event.target.checked })
              }
              className="h-4 w-4"
            />
            Exibir linha decorativa na etiqueta
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <select
            value={estado.corFundo}
            onChange={(event) => onChange({ corFundo: event.target.value })}
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Cor de fundo"
          >
            {COR_FUNDO_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <select
            value={estado.espacamento}
            onChange={(event) => onChange({ espacamento: event.target.value })}
            className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            aria-label="Espaçamento"
          >
            {ESPACAMENTO_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </PainelSecao>

      <ResponsiveTextAlignControls desktopValue={estado.alinhamentoTextoDesktop} mobileValue={estado.alinhamentoTextoMobile} onChange={onChange} />
      <ButtonRadiusControl
        value={estado.estiloBordaBotao}
        onChange={(value) => onChange({ estiloBordaBotao: value })}
      />

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-950">Itens</h3>
          <button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Adicionar item
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {estado.itensColecoes.map((item, index) => (
            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-950">Item {index + 1}</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveItem(item.id, "UP")} disabled={index === 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40" aria-label="Subir item"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moveItem(item.id, "DOWN")} disabled={index === estado.itensColecoes.length - 1} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40" aria-label="Descer item"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => removeItem(item.id)} className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-500" aria-label="Remover item"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select value={item.tipoLink} onChange={(event) => updateItem(item.id, { tipoLink: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Tipo de link">
                  <option value="PERSONALIZADO">Personalizado</option>
                  <option value="CATEGORIA">Categoria</option>
                </select>
                {item.tipoLink === "CATEGORIA" ? (
                  <select value={item.categoriaId} onChange={(event) => selectCategory(item.id, event.target.value)} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" aria-label="Categoria">
                    <option value="">Selecione uma categoria</option>
                    {categoriasDisponiveis.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.caminho}</option>)}
                  </select>
                ) : (
                  <input value={item.linkUrl} onChange={(event) => updateItem(item.id, { linkUrl: event.target.value })} placeholder="/loja/colecao" className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" />
                )}
                <select value={item.tamanhoMosaico} onChange={(event) => updateItem(item.id, { tamanhoMosaico: event.target.value })} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500 md:col-span-2" aria-label="Tamanho no mosaico">
                  {TAMANHO_MOSAICO_COLECOES_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
                </select>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input value={item.titulo} onChange={(event) => updateItem(item.id, { titulo: event.target.value })} placeholder={item.categoriaNome || "Título da coleção"} className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" />
                <input value={item.textoLink} onChange={(event) => updateItem(item.id, { textoLink: event.target.value })} placeholder="Explorar" className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500" />
              </div>
              <textarea value={item.subtitulo} onChange={(event) => updateItem(item.id, { subtitulo: event.target.value })} rows={3} placeholder="Chamada da coleção" className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500" />
              <select
                value={item.tipoMidia}
                onChange={(event) =>
                  updateItem(item.id, { tipoMidia: event.target.value })
                }
                className="mt-4 h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                aria-label="Tipo de mídia"
              >
                <option value="IMAGEM">Imagem</option>
                <option value="VIDEO">Vídeo</option>
              </select>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <UploadMidiaCampo
                  label={
                    item.tipoMidia === "VIDEO"
                      ? "Vídeo desktop URL"
                      : "Imagem desktop URL"
                  }
                  value={
                    item.tipoMidia === "VIDEO"
                      ? item.videoDesktopUrl
                      : item.imagemDesktopUrl
                  }
                  tipoMidia={item.tipoMidia === "VIDEO" ? "VIDEO" : "IMAGEM"}
                  onChange={(url) =>
                    updateItem(
                      item.id,
                      item.tipoMidia === "VIDEO"
                        ? { videoDesktopUrl: url }
                        : { imagemDesktopUrl: url }
                    )
                  }
                  orientacao="Cole uma URL ou envie arquivo pelo navegador."
                />
                <UploadMidiaCampo
                  label={
                    item.tipoMidia === "VIDEO"
                      ? "Vídeo mobile URL"
                      : "Imagem mobile URL"
                  }
                  value={
                    item.tipoMidia === "VIDEO"
                      ? item.videoMobileUrl
                      : item.imagemMobileUrl
                  }
                  tipoMidia={item.tipoMidia === "VIDEO" ? "VIDEO" : "IMAGEM"}
                  onChange={(url) =>
                    updateItem(
                      item.id,
                      item.tipoMidia === "VIDEO"
                        ? { videoMobileUrl: url }
                        : { imagemMobileUrl: url }
                    )
                  }
                  orientacao="Opcional. Quando vazio, usa a mídia desktop."
                />
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium leading-5 text-slate-500">
                  Use o enquadramento para escolher qual parte da imagem aparece dentro do card.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Enquadramento desktop
                    </span>
                    <select
                      value={item.mediaPositionDesktop}
                      onChange={(event) =>
                        updatePosition(item.id, "DESKTOP", event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                      aria-label="Enquadramento desktop"
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
                      Enquadramento mobile
                    </span>
                    <select
                      value={item.mediaPositionMobile}
                      onChange={(event) =>
                        updatePosition(item.id, "MOBILE", event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                      aria-label="Enquadramento mobile"
                    >
                      {MEDIA_POSITION_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      label: "Desktop X",
                      value: item.mediaCropDesktopX,
                      device: "DESKTOP" as const,
                      axis: "X" as const,
                    },
                    {
                      label: "Desktop Y",
                      value: item.mediaCropDesktopY,
                      device: "DESKTOP" as const,
                      axis: "Y" as const,
                    },
                    {
                      label: "Mobile X",
                      value: item.mediaCropMobileX,
                      device: "MOBILE" as const,
                      axis: "X" as const,
                    },
                    {
                      label: "Mobile Y",
                      value: item.mediaCropMobileY,
                      device: "MOBILE" as const,
                      axis: "Y" as const,
                    },
                  ].map((control) => (
                    <label key={control.label}>
                      <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                        {control.label}
                        <span className="text-xs text-slate-500">
                          {clampMediaCropValue(control.value)}%
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={clampMediaCropValue(control.value)}
                        onChange={(event) =>
                          updateCrop(
                            item.id,
                            control.device,
                            control.axis,
                            Number(event.target.value)
                          )
                        }
                        className="w-full accent-slate-950"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function toBannerProdutosPublicos(produtos: EditorVisualProduto[]) {
  return produtos.map((produto) => ({
    ...produto,
    imagemUrl: produto.imagemUrl || null,
    imagemHoverUrl: null,
    categoriaSlugs: [],
    precoVenda: 0,
    descontoAtivo: false,
    precoPromocional: null,
    estoqueTotal: 0,
    vendidosTotal: 0,
    criadoEm: "",
    tamanhosDisponiveis: [],
  }));
}

function getBannerPreviewBloco(estado: NonNullable<BlocoEditandoState>) {
  const configAtual = getConfigObject(estado.bloco.configJson);

  return {
    ...estado.bloco,
    titulo: estado.nomeInterno || estado.bloco.titulo,
    configJson: {
      ...configAtual,
      titulo: estado.titulo,
      texto: estado.texto,
      descricao: estado.texto,
      conteudo: estado.texto,
      tipoMidia: estado.tipoMidia,
      exibirMidia: estado.exibirMidia,
      exibirTexto: estado.exibirTexto,
      exibirSubtitulo: estado.exibirSubtitulo,
      exibirBotaoPrimario: estado.exibirBotaoPrimario,
      exibirBotaoSecundario: estado.exibirBotaoSecundario,
      textoBotao: estado.textoBotao,
      botaoTexto: estado.textoBotao,
      linkBotao: estado.linkBotao,
      botaoLink: estado.linkBotao,
      linkUrl: estado.linkBotao,
      textoBotaoSecundario: estado.textoBotaoSecundario,
      botaoSecundarioTexto: estado.textoBotaoSecundario,
      linkBotaoSecundario: estado.linkBotaoSecundario,
      botaoSecundarioLink: estado.linkBotaoSecundario,
      imagemDesktopUrl: estado.imagemDesktopUrl,
      imagemDesktop: estado.imagemDesktopUrl,
      imagemMobileUrl: estado.imagemMobileUrl,
      imagemMobile: estado.imagemMobileUrl,
      imagemUrl: estado.imagemDesktopUrl,
      videoDesktopUrl: estado.videoDesktopUrl,
      videoMobileUrl: estado.videoMobileUrl,
      videoPosterUrl: estado.videoPosterUrl,
      videoLoop: estado.videoLoop,
      videoSom: estado.videoSom,
      modeloBanner: estado.modeloBanner,
      textoPrincipal: estado.textoPrincipal,
      varianteVisual: estado.varianteVisual,
      animarLetras: estado.animarLetras,
      velocidadeAnimacao: estado.velocidadeAnimacao,
      mostrarTitulo: estado.mostrarTitulo,
      mostrarSubtitulo: estado.mostrarSubtitulo,
      mostrarCta: estado.mostrarCta,
      animacaoElementos: estado.animacaoElementos,
      alinhamentoConteudo: estado.alinhamentoConteudo,
      alinhamentoTextoDesktop: estado.alinhamentoTextoDesktop,
      alinhamentoTextoMobile: estado.alinhamentoTextoMobile,
      alinhamentoVertical: estado.alinhamentoVertical,
      alturaBanner: estado.alturaBanner,
      larguraBanner: estado.larguraBanner,
      overlayBanner: estado.overlayBanner,
      corTextoBanner: estado.corTextoBanner,
      margemSeguraX: estado.margemSeguraX,
      margemSeguraY: estado.margemSeguraY,
      larguraTextoPercentual: estado.larguraTextoPercentual,
      fonteTituloDesktop: estado.fonteTituloDesktop,
      fonteTituloMobile: estado.fonteTituloMobile,
      lineHeightTitulo: estado.lineHeightTitulo,
      letterSpacingTitulo: estado.letterSpacingTitulo,
      mediaCropDesktopX: estado.mediaCropDesktopX,
      mediaCropDesktopY: estado.mediaCropDesktopY,
      mediaCropMobileX: estado.mediaCropMobileX,
      mediaCropMobileY: estado.mediaCropMobileY,
      mediaPositionDesktop: estado.mediaPositionDesktop,
      mediaPositionMobile: estado.mediaPositionMobile,
      mediaZoomDesktop: estado.mediaZoomDesktop,
      mediaZoomMobile: estado.mediaZoomMobile,
      imagemFrenteDesktopUrl: estado.imagemFrenteDesktopUrl,
      imagemFrenteMobileUrl: estado.imagemFrenteMobileUrl,
      imagemFrenteAlt: estado.imagemFrenteAlt,
      imagemFrenteX: estado.imagemFrenteX,
      imagemFrenteY: estado.imagemFrenteY,
      imagemFrenteLarguraDesktop: estado.imagemFrenteLarguraDesktop,
      imagemFrenteLarguraMobile: estado.imagemFrenteLarguraMobile,
      estiloCtaBanner: estado.estiloCtaBanner,
      ctaNovaAba: estado.ctaNovaAba,
      estiloBordaBotao: estado.estiloBordaBotao,
      produtosFlutuantesAtivos: estado.produtosFlutuantesAtivos,
      produtosIds: estado.produtosSelecionadosIds,
      tituloStyle: estado.tituloStyle,
      subtituloStyle: estado.subtituloStyle,
      botaoPrimarioStyle: estado.botaoPrimarioStyle,
      botaoSecundarioStyle: estado.botaoSecundarioStyle,
    },
  };
}

function getBannerModeloPatch(modeloBanner: string) {
  if (modeloBanner === "HERO_PRINCIPAL") {
    return {
      modeloBanner,
      mostrarTitulo: true,
      mostrarSubtitulo: true,
      mostrarCta: true,
      animacaoElementos: "SEM_ANIMACAO",
      alturaBanner: "TELA_CHEIA",
      larguraTextoPercentual: 62,
      fonteTituloDesktop: 92,
      fonteTituloMobile: 54,
      margemSeguraX: 8,
      margemSeguraY: 8,
    };
  }

  if (modeloBanner === "EDITORIAL_IMAGEM") {
    return {
      modeloBanner,
      alturaBanner: "AUTO_CONTEUDO",
      larguraTextoPercentual: 62,
      fonteTituloDesktop: 86,
      fonteTituloMobile: 48,
      margemSeguraX: 8,
      margemSeguraY: 10,
      overlayBanner: "GRADIENTE",
    };
  }

  if (modeloBanner === "TIPOGRAFICO_EXPANDIDO") {
    return {
      modeloBanner,
      textoPrincipal: "STELLA COLARI",
      varianteVisual: "BRANCO_AZUL",
      animarLetras: true,
      velocidadeAnimacao: "MEDIA",
      exibirMidia: false,
      tipoMidia: "IMAGEM",
      imagemDesktopUrl: "",
      imagemMobileUrl: "",
      videoDesktopUrl: "",
      videoMobileUrl: "",
      exibirSubtitulo: false,
      exibirBotaoPrimario: false,
      exibirBotaoSecundario: false,
      alturaBanner: "AUTO_CONTEUDO",
      larguraTextoPercentual: 100,
      fonteTituloDesktop: 220,
      fonteTituloMobile: 86,
      lineHeightTitulo: 0.86,
      letterSpacingTitulo: 0,
      margemSeguraX: 8,
      margemSeguraY: 8,
      overlayBanner: "NENHUM",
      alinhamentoConteudo: "CENTRO",
      alinhamentoTextoDesktop: "CENTRO",
      alinhamentoTextoMobile: "CENTRO",
      alinhamentoVertical: "CENTRO",
    };
  }

  if (modeloBanner === "CAMADAS_PARALLAX") {
    return {
      modeloBanner,
      alturaBanner: "PADRAO",
      larguraTextoPercentual: 86,
      fonteTituloDesktop: 104,
      fonteTituloMobile: 58,
      margemSeguraX: 8,
      margemSeguraY: 8,
      overlayBanner: "GRADIENTE",
      produtosFlutuantesAtivos: true,
    };
  }

  if (modeloBanner === "CATEGORIA") {
    return {
      modeloBanner,
      alturaBanner: "PADRAO",
      larguraTextoPercentual: 70,
      fonteTituloDesktop: 72,
      fonteTituloMobile: 46,
      margemSeguraX: 8,
      margemSeguraY: 8,
    };
  }

  if (modeloBanner === "FAIXA_PROMOCIONAL") {
    return {
      modeloBanner,
      alturaBanner: "COMPACTA",
      larguraTextoPercentual: 92,
      fonteTituloDesktop: 52,
      fonteTituloMobile: 34,
      margemSeguraX: 8,
      margemSeguraY: 6,
      alinhamentoConteudo: "CENTRO",
      alinhamentoTextoDesktop: "CENTRO",
      alinhamentoTextoMobile: "CENTRO",
    };
  }

  return {
    modeloBanner,
    alturaBanner: "PADRAO",
    larguraTextoPercentual: 58,
    fonteTituloDesktop: 68,
    fonteTituloMobile: 42,
    margemSeguraX: 8,
    margemSeguraY: 8,
  };
}

function BannerModeloMiniatura({ tipo }: { tipo: string }) {
  if (tipo === "CAMADAS") {
    return (
      <div className="relative h-full overflow-hidden rounded-xl bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950" />
        <div className="absolute left-3 top-4 h-3 w-24 rounded-full bg-white/80" />
        <div className="absolute left-3 top-9 h-2 w-16 rounded-full bg-white/45" />
        <div className="absolute bottom-3 right-4 h-20 w-14 rounded-t-full bg-white/85 shadow-2xl" />
      </div>
    );
  }

  if (tipo === "EDITORIAL") {
    return (
      <div className="grid h-full grid-cols-[0.55fr_0.45fr] overflow-hidden rounded-xl bg-slate-950">
        <div className="flex flex-col justify-center gap-2 p-3">
          <span className="h-3 w-24 rounded-full bg-white/85" />
          <span className="h-2 w-16 rounded-full bg-white/40" />
          <span className="mt-2 h-5 w-14 rounded-full bg-white" />
        </div>
        <div className="bg-gradient-to-br from-slate-200 to-slate-500" />
      </div>
    );
  }

  if (tipo === "TIPOGRAFICO") {
    return (
      <div className="grid h-full grid-cols-2 gap-2 overflow-hidden rounded-xl bg-slate-100 p-2">
        <div className="flex min-w-0 items-center overflow-hidden rounded-lg bg-white px-1">
          <span className="w-full text-center text-[30px] font-black uppercase leading-none text-[var(--brand-blue)]">
            SALE
          </span>
        </div>
        <div className="flex min-w-0 items-center overflow-hidden rounded-lg bg-[var(--brand-blue)] px-1">
          <span className="w-full text-center text-[27px] font-black uppercase leading-none text-white">
            ANÉIS
          </span>
        </div>
      </div>
    );
  }

  if (tipo === "FAIXA") {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-slate-950 px-5">
        <span className="h-3 w-28 rounded-full bg-white/90" />
      </div>
    );
  }

  if (tipo === "HERO") {
    return (
      <div className="relative h-full overflow-hidden rounded-xl bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-300 via-slate-500 to-slate-950" />
        <div className="absolute right-3 top-3 h-24 w-20 rounded-t-full bg-white/30 shadow-2xl ring-1 ring-white/20" />
        <div className="absolute inset-0 bg-slate-950/30" />
        <div className="absolute left-4 top-1/2 w-28 -translate-y-1/2">
          <span className="block h-3 w-24 rounded-full bg-white/90" />
          <span className="mt-2 block h-2 w-16 rounded-full bg-white/50" />
          <span className="mt-4 block h-5 w-14 rounded-full bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden rounded-xl bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 to-slate-400" />
      <div className="absolute left-3 top-5 h-3 w-24 rounded-full bg-white/90" />
      <div className="absolute left-3 top-10 h-2 w-16 rounded-full bg-white/50" />
      <div className="absolute left-3 bottom-4 h-4 w-12 rounded-full bg-white" />
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
        {label}
        <span className="text-xs text-slate-500">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-slate-950"
      />
    </label>
  );
}

function getBannerStudioPanelTitle(element: BannerStudioElement) {
  if (element === "MIDIA") return "Imagem / crop";
  if (element === "IMAGEM_FRENTE") return "Camada frontal";
  if (element === "CTA") return "CTA";
  if (element === "DESIGN") return "Design";
  if (element === "PRODUTOS") return "Produtos";
  if (element === "AVANCADO") return "Avançado";
  if (element === "SUBTITULO") return "Subtítulo";
  if (element === "TITULO") return "Texto";

  return "Modelo";
}

function getBannerStudioPanelDescription(
  element: BannerStudioElement,
  modeloBanner?: string
) {
  if (modeloBanner === "TIPOGRAFICO_EXPANDIDO") {
    if (element === "DESIGN") return "Variação visual e margem lateral.";
    if (element === "TITULO") return "Texto principal e animação por letra.";
  }

  if (element === "MIDIA") {
    return "Ajuste a mídia principal, zoom e foco do enquadramento ativo.";
  }

  if (element === "IMAGEM_FRENTE") {
    return "Edite a imagem frontal da composição de camadas.";
  }

  if (element === "CTA") return "Configure texto, link e estilo do botão.";
  if (element === "DESIGN") return "Controle altura, largura, overlay e margens.";
  if (element === "PRODUTOS") {
    return "Use produto apenas como apoio visual para a composição.";
  }

  if (element === "AVANCADO") return "Ajustes técnicos de vídeo e salvamento.";
  if (element === "SUBTITULO") return "Ajuste exibição e leitura do subtítulo.";
  if (element === "TITULO") return "Ajuste escala, peso, alinhamento e margens.";

  return "Resumo do modelo atual e troca de composição.";
}

function getBannerStudioPanelIcon(element: BannerStudioElement) {
  if (element === "MIDIA") return ImageIcon;
  if (element === "IMAGEM_FRENTE") return Layers;
  if (element === "CTA") return MousePointer2;
  if (element === "DESIGN") return LayoutGrid;
  if (element === "PRODUTOS") return ClipboardList;
  if (element === "AVANCADO") return HelpCircle;
  if (element === "TITULO" || element === "SUBTITULO") return Type;

  return PanelRight;
}

function BannerDeviceSwitcher({
  device,
  onChange,
}: {
  device: BannerDevicePreview;
  onChange: (device: BannerDevicePreview) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
      {(["DESKTOP", "MOBILE"] as const).map((item) => {
        const Icon = item === "DESKTOP" ? Monitor : Smartphone;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${
              device === item
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item === "DESKTOP" ? "Desktop" : "Mobile"}
          </button>
        );
      })}
    </div>
  );
}

function BannerModeloCards({
  modeloNormalizado,
  onSelect,
}: {
  modeloNormalizado: string;
  onSelect: (modelo: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {MODELO_BANNER_PRESETS.map((preset) => {
        const selecionado = modeloNormalizado === preset.value;

        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => onSelect(preset.value)}
            className={`group rounded-3xl border bg-white p-4 text-left transition ${
              selecionado
                ? "border-indigo-400 shadow-sm ring-2 ring-indigo-100"
                : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="h-36">
              <BannerModeloMiniatura tipo={preset.preview} />
            </div>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-950">
                  {preset.label}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {preset.descricao}
                </p>
              </div>

              {selecionado && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                  Atual
                </span>
              )}
            </div>

            <div className="mt-4 space-y-1.5 text-xs leading-5 text-slate-500">
              <p>
                <span className="font-semibold text-slate-700">Uso: </span>
                {preset.uso}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Medida: </span>
                {preset.medidas}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getBannerModeloEditorInfo(modeloBanner: string) {
  const modeloNormalizado = normalizeBannerModelo(modeloBanner);
  const preset = MODELO_BANNER_PRESETS.find(
    (item) => item.value === modeloNormalizado
  );

  if (preset) {
    return {
      ...preset,
      legado: false,
    };
  }

  return {
    value: modeloNormalizado,
    label: BANNER_MODELO_LABELS[modeloNormalizado],
    descricao: "Modelo antigo preservado para compatibilidade.",
    uso: "Banner criado antes da simplificação dos modelos.",
    medidas: "Compatibilidade legada",
    preview: "LEGADO",
    legado: true,
  };
}

function BannerMediaMiniPreview({
  estado,
  device,
}: {
  estado: NonNullable<BlocoEditandoState>;
  device: BannerDevicePreview;
}) {
  const isMobile = device === "MOBILE";
  const imageUrl =
    isMobile && estado.imagemMobileUrl
      ? estado.imagemMobileUrl
      : estado.imagemDesktopUrl;
  const videoUrl =
    isMobile && estado.videoMobileUrl
      ? estado.videoMobileUrl
      : estado.videoDesktopUrl;
  const x = isMobile ? estado.mediaCropMobileX : estado.mediaCropDesktopX;
  const y = isMobile ? estado.mediaCropMobileY : estado.mediaCropDesktopY;
  const zoom = isMobile ? estado.mediaZoomMobile : estado.mediaZoomDesktop;
  const objectPosition = getMediaObjectPosition(x, y);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <div className="relative aspect-[16/9] overflow-hidden">
        {estado.tipoMidia === "VIDEO" && videoUrl ? (
          <video
            src={videoUrl}
            poster={estado.videoPosterUrl || undefined}
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
            style={{
              objectPosition,
              transform: `scale(${zoom / 100})`,
            }}
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{
              objectPosition,
              transform: `scale(${zoom / 100})`,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
            Sem mídia para pré-visualizar
          </div>
        )}
      </div>
    </div>
  );
}

function BannerCropFocusControls({
  estado,
  device,
  onChange,
}: {
  estado: NonNullable<BlocoEditandoState>;
  device: BannerDevicePreview;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  const isMobile = device === "MOBILE";
  const cropXKey = isMobile ? "mediaCropMobileX" : "mediaCropDesktopX";
  const cropYKey = isMobile ? "mediaCropMobileY" : "mediaCropDesktopY";
  const positionKey = isMobile ? "mediaPositionMobile" : "mediaPositionDesktop";
  const zoomKey = isMobile ? "mediaZoomMobile" : "mediaZoomDesktop";
  const cropX = isMobile ? estado.mediaCropMobileX : estado.mediaCropDesktopX;
  const cropY = isMobile ? estado.mediaCropMobileY : estado.mediaCropDesktopY;
  const zoom = isMobile ? estado.mediaZoomMobile : estado.mediaZoomDesktop;
  const deviceLabel = isMobile ? "mobile" : "desktop";

  function updateFocus(nextX: number, nextY: number) {
    onChange({
      [cropXKey]: nextX,
      [cropYKey]: nextY,
      [positionKey]: getMediaObjectPosition(nextX, nextY),
    } as Partial<NonNullable<BlocoEditandoState>>);
  }

  function updateZoom(value: number) {
    onChange({ [zoomKey]: value } as Partial<NonNullable<BlocoEditandoState>>);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">
          Crop do {deviceLabel}
        </p>

        <button
          type="button"
          onClick={() => {
            updateFocus(50, 50);
            updateZoom(100);
          }}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Resetar
        </button>
      </div>

      <RangeControl
        label="Zoom"
        value={zoom}
        min={80}
        max={180}
        suffix="%"
        onChange={updateZoom}
      />
      <RangeControl
        label="Foco horizontal"
        value={cropX}
        min={0}
        max={100}
        suffix="%"
        onChange={(value) => updateFocus(value, cropY)}
      />
      <RangeControl
        label="Foco vertical"
        value={cropY}
        min={0}
        max={100}
        suffix="%"
        onChange={(value) => updateFocus(cropX, value)}
      />
    </div>
  );
}

function BannerStudioEditor({
  estado,
  produtosDisponiveis,
  buscaProdutoManual,
  produtosFiltradosManual,
  selectedElement,
  device,
  onClose,
  onSave,
  salvando,
  onChange,
  onSelectedElementChange,
  onDeviceChange,
  onBuscaProdutoManualChange,
  adicionarProdutoManual,
  removerProdutoManual,
  moverProdutoManual,
}: {
  estado: NonNullable<BlocoEditandoState>;
  produtosDisponiveis: EditorVisualProduto[];
  buscaProdutoManual: string;
  produtosFiltradosManual: EditorVisualProduto[];
  selectedElement: BannerStudioElement;
  device: BannerDevicePreview;
  onClose: () => void;
  onSave: () => void;
  salvando: boolean;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
  onSelectedElementChange: (element: BannerStudioElement) => void;
  onDeviceChange: (device: BannerDevicePreview) => void;
  onBuscaProdutoManualChange: (value: string) => void;
  adicionarProdutoManual: (produtoId: string) => void;
  removerProdutoManual: (produtoId: string) => void;
  moverProdutoManual: (produtoId: string, direction: "UP" | "DOWN") => void;
}) {
  const [modelosAbertos, setModelosAbertos] = useState(false);
  const configAtual = getConfigObject(estado.bloco.configJson);
  const previewBloco = getBannerPreviewBloco(estado);
  const modeloNormalizado = normalizeBannerModelo(estado.modeloBanner);
  const isHeroPrincipal = modeloNormalizado === "HERO_PRINCIPAL";
  const isTipograficoExpandido = modeloNormalizado === "TIPOGRAFICO_EXPANDIDO";
  const modeloBannerInfo = getBannerModeloEditorInfo(estado.modeloBanner);
  const PanelIcon = getBannerStudioPanelIcon(selectedElement);
  const produtoFrenteFallback = produtosDisponiveis.find(
    (produto) => produto.id === estado.produtosSelecionadosIds[0]
  );
  const imagemFrentePreviewUrl =
    device === "MOBILE" && estado.imagemFrenteMobileUrl
      ? estado.imagemFrenteMobileUrl
      : estado.imagemFrenteDesktopUrl || produtoFrenteFallback?.imagemUrl || "";
  const bannerCropContext = getBannerCropContext(estado);
  const bannerRecommendedSize = getRecommendedMediaSize(bannerCropContext);
  const bannerAspectDesktop =
    bannerCropContext === "BANNER_21_9" ? "21:9" : "16:9";
  const bannerAspectMobile = "4:5";
  const [animacaoPreviewKey, setAnimacaoPreviewKey] = useState(0);

  function atualizarConfigInterno(patch: Record<string, unknown>) {
    onChange({
      bloco: {
        ...estado.bloco,
        configJson: {
          ...getConfigObject(estado.bloco.configJson),
          ...patch,
        },
      },
    });
  }

  function atualizarVisibilidadeHero(
    campo: "mostrarTitulo" | "mostrarSubtitulo" | "mostrarCta",
    checked: boolean
  ) {
    onChange({
      [campo]: checked,
      ...(checked ? { exibirTexto: true } : {}),
    } as Partial<NonNullable<BlocoEditandoState>>);
  }

  function atualizarAnimacaoHero(value: string) {
    onChange({ animacaoElementos: value });
    setAnimacaoPreviewKey((current) => current + 1);
  }

  const titleSlot = ({
    className,
    style,
  }: {
    className: string;
    style: CSSProperties;
  }) => (
    <RichTextInlineEditor
      value={getRichTextConfig(configAtual, "tituloRichText")}
      fallbackText={estado.titulo}
      placeholder="Clique para editar o título"
      multiline
      className={className}
      style={style}
      onChange={(richText, plainText) => {
        atualizarConfigInterno({ tituloRichText: richText });
        onChange({ titulo: plainText });
      }}
    />
  );
  const subtitleSlot = ({
    className,
    style,
  }: {
    className: string;
    style: CSSProperties;
  }) => (
    <RichTextInlineEditor
      value={
        getRichTextConfig(configAtual, "subtituloRichText") ||
        getRichTextConfig(configAtual, "textoRichText")
      }
      fallbackText={estado.texto}
      placeholder="Clique para editar o subtítulo"
      multiline
      className={className}
      style={style}
      onChange={(richText, plainText) => {
        atualizarConfigInterno({
          subtituloRichText: richText,
          textoRichText: richText,
        });
        onChange({ texto: plainText });
      }}
    />
  );
  const primaryCtaSlot = ({
    className,
    style,
  }: {
    className: string;
    style: CSSProperties;
  }) => (
    <InlineTextEditor
      value={estado.textoBotao}
      placeholder="CTA"
      className={className}
      style={style}
      onChange={(value) => onChange({ textoBotao: value })}
    />
  );
  const secondaryCtaSlot = ({
    className,
    style,
  }: {
    className: string;
    style: CSSProperties;
  }) => (
    <InlineTextEditor
      value={estado.textoBotaoSecundario}
      placeholder="CTA secundário"
      className={className}
      style={style}
      onChange={(value) => onChange({ textoBotaoSecundario: value })}
    />
  );

  return (
    <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-slate-950">
                {estado.nomeInterno || "Banner sem nome"}
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {modeloBannerInfo.label}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Preview real
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {modeloBannerInfo.medidas}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <BannerDeviceSwitcher device={device} onChange={onDeviceChange} />

            <button
              type="button"
              onClick={() => setModelosAbertos(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <LayoutGrid className="h-4 w-4" />
              Trocar modelo
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={salvando}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Fechar edição"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Preview editável
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Clique no texto, CTA, imagem ou camada frontal para editar.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                {device === "DESKTOP" ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
                {device === "DESKTOP" ? "Desktop" : "Mobile"}
              </div>
            </div>

            <div className="bg-slate-100 p-4 sm:p-6 xl:p-8">
              <div
                className={`loja-publica stella-storefront-render mx-auto overflow-hidden bg-white text-slate-900 shadow-xl ring-1 ring-slate-200 ${
                  device === "MOBILE"
                    ? "max-w-[390px] rounded-[2rem]"
                    : "max-w-[1180px]"
                }`}
              >
                <BannerRenderer
                  key={`${estado.modeloBanner}-${estado.animacaoElementos}-${estado.animarLetras}-${estado.velocidadeAnimacao}-${animacaoPreviewKey}`}
                  bloco={previewBloco}
                  produtos={toBannerProdutosPublicos(produtosDisponiveis)}
                  device={device}
                  modo="editor"
                  selectedElement={selectedElement}
                  onElementSelect={onSelectedElementChange}
                  titleSlot={titleSlot}
                  subtitleSlot={subtitleSlot}
                  primaryCtaSlot={primaryCtaSlot}
                  secondaryCtaSlot={secondaryCtaSlot}
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <PanelIcon className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Painel contextual
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                {getBannerStudioPanelTitle(selectedElement)}
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {getBannerStudioPanelDescription(
                  selectedElement,
                  modeloNormalizado
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
          {selectedElement === "MODELO" ? (
            <>
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
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-slate-800">
                  {modeloBannerInfo.label}
                </p>
                <p className="mt-1">{modeloBannerInfo.descricao}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {modeloBannerInfo.medidas}
                </p>
              </div>

              {modeloBannerInfo.legado && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Este banner usa um modelo antigo. Para novos banners, use
                  Hero principal ou Tipográfico expandido.
                </div>
              )}

              {isTipograficoExpandido && (
                <>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Texto principal
                    </span>
                    <input
                      value={estado.textoPrincipal}
                      onChange={(event) =>
                        onChange({ textoPrincipal: event.target.value })
                      }
                      placeholder="Ex: STELLA"
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Variação visual
                    </span>
                    <select
                      value={estado.varianteVisual}
                      onChange={(event) =>
                        onChange({ varianteVisual: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                    >
                      {VARIANTES_TIPOGRAFICO_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <CampoToggle
                    checked={estado.animarLetras}
                    label="Animar letras"
                    onChange={(checked) => onChange({ animarLetras: checked })}
                  />

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Velocidade da animação
                    </span>
                    <select
                      value={estado.velocidadeAnimacao}
                      onChange={(event) => {
                        onChange({ velocidadeAnimacao: event.target.value });
                        setAnimacaoPreviewKey((current) => current + 1);
                      }}
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                    >
                      {VELOCIDADE_ANIMACAO_LETRAS_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {estado.animarLetras && (
                    <button
                      type="button"
                      onClick={() =>
                        setAnimacaoPreviewKey((current) => current + 1)
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Rever animação
                    </button>
                  )}
                </>
              )}

              {isHeroPrincipal && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Conteúdo
                    </p>
                    <div className="mt-3 space-y-2">
                      <CampoToggle
                        checked={estado.mostrarTitulo}
                        label="Mostrar título"
                        onChange={(checked) =>
                          atualizarVisibilidadeHero("mostrarTitulo", checked)
                        }
                      />
                      <CampoToggle
                        checked={estado.mostrarSubtitulo}
                        label="Mostrar subtítulo"
                        onChange={(checked) =>
                          atualizarVisibilidadeHero("mostrarSubtitulo", checked)
                        }
                      />
                      <CampoToggle
                        checked={estado.mostrarCta}
                        label="Mostrar botão"
                        onChange={(checked) =>
                          atualizarVisibilidadeHero("mostrarCta", checked)
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label>
                      <span className="mb-2 block text-sm font-semibold text-slate-950">
                        Animação dos elementos
                      </span>
                      <select
                        value={estado.animacaoElementos}
                        onChange={(event) =>
                          atualizarAnimacaoHero(event.target.value)
                        }
                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                      >
                        {ANIMACAO_HERO_PRESETS.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      A animação afeta título, subtítulo e botão. A imagem de
                      fundo permanece estática.
                    </p>
                    {estado.animacaoElementos !== "SEM_ANIMACAO" && (
                      <button
                        type="button"
                        onClick={() =>
                          setAnimacaoPreviewKey((current) => current + 1)
                        }
                        className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Rever animação
                      </button>
                    )}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => setModelosAbertos(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LayoutGrid className="h-4 w-4" />
                Trocar modelo
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectedElementChange("DESIGN")}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Design
                </button>
                {!isTipograficoExpandido && (
                  <button
                    type="button"
                    onClick={() => onSelectedElementChange("AVANCADO")}
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Avançado
                  </button>
                )}
              </div>
            </>
          ) : null}

          {selectedElement === "TITULO" || selectedElement === "SUBTITULO" ? (
            <>
              {isTipograficoExpandido ? (
                <>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Texto principal
                    </span>
                    <input
                      value={estado.textoPrincipal}
                      onChange={(event) =>
                        onChange({ textoPrincipal: event.target.value })
                      }
                      placeholder="Ex: STELLA"
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                    />
                  </label>

                  <CampoToggle
                    checked={estado.animarLetras}
                    label="Animar letras"
                    onChange={(checked) => {
                      onChange({ animarLetras: checked });
                      setAnimacaoPreviewKey((current) => current + 1);
                    }}
                  />

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Velocidade da animação
                    </span>
                    <select
                      value={estado.velocidadeAnimacao}
                      onChange={(event) => {
                        onChange({ velocidadeAnimacao: event.target.value });
                        setAnimacaoPreviewKey((current) => current + 1);
                      }}
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                    >
                      {VELOCIDADE_ANIMACAO_LETRAS_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : isHeroPrincipal ? (
                <>
                  <CampoToggle
                    checked={estado.mostrarTitulo}
                    label="Mostrar título"
                    onChange={(checked) =>
                      atualizarVisibilidadeHero("mostrarTitulo", checked)
                    }
                  />
                  <CampoToggle
                    checked={estado.mostrarSubtitulo}
                    label="Mostrar subtítulo"
                    onChange={(checked) =>
                      atualizarVisibilidadeHero("mostrarSubtitulo", checked)
                    }
                  />
                </>
              ) : (
                <>
                  <CampoToggle
                    checked={estado.exibirTexto}
                    label="Exibir texto"
                    onChange={(checked) => onChange({ exibirTexto: checked })}
                  />
                  <CampoToggle
                    checked={estado.exibirSubtitulo}
                    label="Exibir subtítulo"
                    onChange={(checked) =>
                      onChange({ exibirSubtitulo: checked })
                    }
                  />
                </>
              )}

              {!isTipograficoExpandido && (
                <>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Presets de escala
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TEXTO_BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onChange(preset.patch)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <RangeControl
                label="Fonte desktop"
                value={estado.fonteTituloDesktop}
                min={24}
                max={140}
                suffix="px"
                onChange={(value) => onChange({ fonteTituloDesktop: value })}
              />
              <RangeControl
                label="Fonte mobile"
                value={estado.fonteTituloMobile}
                min={24}
                max={96}
                suffix="px"
                onChange={(value) => onChange({ fonteTituloMobile: value })}
              />
              <RangeControl
                label="Entrelinhas"
                value={estado.lineHeightTitulo}
                min={0.8}
                max={1.4}
                step={0.01}
                onChange={(value) => onChange({ lineHeightTitulo: value })}
              />
              <RangeControl
                label="Espaço entre letras"
                value={estado.letterSpacingTitulo}
                min={0}
                max={8}
                step={0.5}
                suffix="px"
                onChange={(value) => onChange({ letterSpacingTitulo: value })}
              />
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Peso
                </span>
                <select
                  value={estado.tituloStyle.fontWeight}
                  onChange={(event) =>
                    onChange({
                      tituloStyle: {
                        ...estado.tituloStyle,
                        fontWeight: event.target.value,
                      },
                    })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                >
                  {TEXT_FONT_WEIGHT_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor
                </span>
                <select
                  value={estado.corTextoBanner}
                  onChange={(event) =>
                    onChange({ corTextoBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                >
                  {COR_TEXTO_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <ResponsiveTextAlignControls
                desktopValue={estado.alinhamentoTextoDesktop}
                mobileValue={estado.alinhamentoTextoMobile}
                onChange={onChange}
              />
              <RangeControl
                label="Largura do texto"
                value={estado.larguraTextoPercentual}
                min={30}
                max={100}
                suffix="%"
                onChange={(value) => onChange({ larguraTextoPercentual: value })}
              />
              <RangeControl
                label="Margem segura lateral"
                value={estado.margemSeguraX}
                min={0}
                max={18}
                suffix="%"
                onChange={(value) => onChange({ margemSeguraX: value })}
              />
              <RangeControl
                label="Margem segura topo/base"
                value={estado.margemSeguraY}
                min={0}
                max={18}
                suffix="%"
                onChange={(value) => onChange({ margemSeguraY: value })}
              />
                </>
              )}
            </>
          ) : null}

          {selectedElement === "CTA" ? (
            <>
              <CampoToggle
                checked={
                  isHeroPrincipal
                    ? estado.mostrarCta
                    : estado.exibirBotaoPrimario
                }
                label={isHeroPrincipal ? "Mostrar botão" : "Exibir CTA principal"}
                onChange={(checked) =>
                  isHeroPrincipal
                    ? atualizarVisibilidadeHero("mostrarCta", checked)
                    : onChange({ exibirBotaoPrimario: checked })
                }
              />
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do CTA
                </span>
                <input
                  value={estado.textoBotao}
                  onChange={(event) => onChange({ textoBotao: event.target.value })}
                  placeholder="Ex: Comprar agora"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do CTA
                </span>
                <input
                  value={estado.linkBotao}
                  onChange={(event) => onChange({ linkBotao: event.target.value })}
                  placeholder="/loja/descontos"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Estilo do CTA
                </span>
                <select
                  value={estado.estiloCtaBanner}
                  onChange={(event) =>
                    onChange({ estiloCtaBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                >
                  {ESTILO_CTA_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <CampoToggle
                checked={estado.ctaNovaAba}
                label="Abrir em nova aba"
                onChange={(checked) => onChange({ ctaNovaAba: checked })}
              />
              <ButtonRadiusControl
                value={estado.estiloBordaBotao}
                onChange={(value) => onChange({ estiloBordaBotao: value })}
              />
            </>
          ) : null}

          {selectedElement === "MIDIA" ? (
            <>
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
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-slate-500 sm:text-sm"
                >
                  {TIPO_MIDIA_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              {estado.tipoMidia === "VIDEO" ? (
                <>
                  <UploadMidiaCampo
                    label="Vídeo desktop"
                    value={estado.videoDesktopUrl}
                    tipoMidia="VIDEO"
                    onChange={(url) => onChange({ videoDesktopUrl: url })}
                    orientacao="Cole uma URL ou envie MP4/WebM."
                  />
                  <UploadMidiaCampo
                    label="Vídeo mobile"
                    value={estado.videoMobileUrl}
                    tipoMidia="VIDEO"
                    onChange={(url) => onChange({ videoMobileUrl: url })}
                    orientacao="Opcional. Quando vazio usa o desktop."
                  />
                </>
              ) : (
                <>
                  <UploadMidiaCampo
                    label="Imagem desktop"
                    value={estado.imagemDesktopUrl}
                    tipoMidia="IMAGEM"
                    onChange={(url) => onChange({ imagemDesktopUrl: url })}
                    orientacao="Cole uma URL ou envie JPG, PNG ou WebP."
                  />
                  <UploadMidiaCampo
                    label="Imagem mobile"
                    value={estado.imagemMobileUrl}
                    tipoMidia="IMAGEM"
                    onChange={(url) => onChange({ imagemMobileUrl: url })}
                    orientacao="Opcional. Quando vazio usa o desktop."
                  />
                </>
              )}
              {estado.tipoMidia === "VIDEO" ? (
                <>
                  <BannerMediaMiniPreview estado={estado} device={device} />
                  <BannerCropFocusControls
                    estado={estado}
                    device={device}
                    onChange={onChange}
                  />
                </>
              ) : (
                <VisualCropEditor
                  label="Crop visual do banner"
                  value={getResponsiveMediaFromEstado({
                    estado,
                    aspectRatioDesktop: bannerAspectDesktop,
                    aspectRatioMobile: bannerAspectMobile,
                  })}
                  onChange={(media) =>
                    onChange(getEstadoPatchFromResponsiveMedia(media))
                  }
                  device={device === "MOBILE" ? "MOBILE" : "DESKTOP"}
                  onDeviceChange={(nextDevice) =>
                    onDeviceChange(nextDevice === "MOBILE" ? "MOBILE" : "DESKTOP")
                  }
                  aspectRatioDesktop={bannerAspectDesktop}
                  aspectRatioMobile={bannerAspectMobile}
                  recommendedSizeDesktop={bannerRecommendedSize.desktop}
                  recommendedSizeMobile={bannerRecommendedSize.mobile}
                  contexto={bannerCropContext}
                />
              )}
            </>
          ) : null}

          {selectedElement === "IMAGEM_FRENTE" ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <div className="flex aspect-[4/3] items-center justify-center p-4">
                  {imagemFrentePreviewUrl ? (
                    <img
                      src={imagemFrentePreviewUrl}
                      alt={estado.imagemFrenteAlt || "Camada frontal"}
                      className="max-h-full max-w-full object-contain drop-shadow-xl"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-500">
                      Sem imagem frontal
                    </span>
                  )}
                </div>
              </div>

              {produtoFrenteFallback && !estado.imagemFrenteDesktopUrl && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800">
                  Usando o primeiro produto selecionado como imagem frontal
                  enquanto não houver upload específico.
                </div>
              )}

              <UploadMidiaCampo
                label="Imagem frontal desktop"
                value={estado.imagemFrenteDesktopUrl}
                tipoMidia="IMAGEM"
                onChange={(url) => onChange({ imagemFrenteDesktopUrl: url })}
                orientacao="PNG/WebP com fundo transparente funciona melhor."
              />
              <UploadMidiaCampo
                label="Imagem frontal mobile"
                value={estado.imagemFrenteMobileUrl}
                tipoMidia="IMAGEM"
                onChange={(url) => onChange({ imagemFrenteMobileUrl: url })}
                orientacao="Opcional. Quando vazio usa a imagem frontal desktop."
              />
              <RangeControl
                label="Posição horizontal"
                value={estado.imagemFrenteX}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => onChange({ imagemFrenteX: value })}
              />
              <RangeControl
                label="Posição vertical"
                value={estado.imagemFrenteY}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => onChange({ imagemFrenteY: value })}
              />
              <RangeControl
                label="Largura desktop"
                value={estado.imagemFrenteLarguraDesktop}
                min={12}
                max={80}
                suffix="%"
                onChange={(value) =>
                  onChange({ imagemFrenteLarguraDesktop: value })
                }
              />
              <RangeControl
                label="Largura mobile"
                value={estado.imagemFrenteLarguraMobile}
                min={12}
                max={80}
                suffix="%"
                onChange={(value) =>
                  onChange({ imagemFrenteLarguraMobile: value })
                }
              />
            </>
          ) : null}

          {selectedElement === "DESIGN" ? (
            <>
              {isTipograficoExpandido ? (
                <>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Variação visual
                    </span>
                    <select
                      value={estado.varianteVisual}
                      onChange={(event) =>
                        onChange({ varianteVisual: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {VARIANTES_TIPOGRAFICO_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <ResponsiveTextAlignControls
                    desktopValue={estado.alinhamentoTextoDesktop}
                    mobileValue={estado.alinhamentoTextoMobile}
                    onChange={onChange}
                  />
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Alinhamento horizontal
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
                      Alinhamento vertical
                    </span>
                    <select
                      value={estado.alinhamentoVertical}
                      onChange={(event) =>
                        onChange({ alinhamentoVertical: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {ALINHAMENTO_VERTICAL_BANNER_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Largura do bloco
                    </span>
                    <select
                      value={estado.larguraBanner}
                      onChange={(event) =>
                        onChange({ larguraBanner: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {LARGURA_BANNER_PRESETS.map((preset) => (
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
                  <RangeControl
                    label="Margem segura lateral"
                    value={estado.margemSeguraX}
                    min={0}
                    max={18}
                    suffix="%"
                    onChange={(value) => onChange({ margemSeguraX: value })}
                  />
                  <RangeControl
                    label="Margem segura topo/base"
                    value={estado.margemSeguraY}
                    min={0}
                    max={18}
                    suffix="%"
                    onChange={(value) => onChange({ margemSeguraY: value })}
                  />
                </>
              )}
            </>
          ) : null}

          {selectedElement === "PRODUTOS" ? (
            <>
              <CampoToggle
                checked={estado.produtosFlutuantesAtivos}
                label="Usar produtos na composição"
                description="No modelo de camadas, o primeiro produto pode virar imagem frontal quando não houver imagem de frente."
                onChange={(checked) =>
                  onChange({ produtosFlutuantesAtivos: checked })
                }
              />
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Buscar produto
                </span>
                <input
                  value={buscaProdutoManual}
                  onChange={(event) =>
                    onBuscaProdutoManualChange(event.target.value)
                  }
                  placeholder="Digite nome, código ou categoria"
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                {produtosFiltradosManual.map((produto) => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => adicionarProdutoManual(produto.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-white px-2 py-2 text-left transition hover:bg-slate-100"
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
                        {produto.codigoInterno}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {estado.produtosSelecionadosIds.map((produtoId, index) => {
                  const produto = getProdutoResumo(produtoId, produtosDisponiveis);

                  return (
                    <div
                      key={produtoId}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-2"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {produto?.nome || "Produto indisponível"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => moverProdutoManual(produtoId, "UP")}
                        disabled={index === 0}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40"
                        aria-label="Subir produto"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverProdutoManual(produtoId, "DOWN")}
                        disabled={index === estado.produtosSelecionadosIds.length - 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40"
                        aria-label="Descer produto"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerProdutoManual(produtoId)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700"
                        aria-label="Remover produto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {selectedElement === "AVANCADO" ? (
            <>
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
                  onChange={(event) => onChange({ videoSom: event.target.value })}
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {VIDEO_SOM_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <UploadMidiaCampo
                label="Poster do vídeo"
                value={estado.videoPosterUrl}
                tipoMidia="IMAGEM"
                onChange={(url) => onChange({ videoPosterUrl: url })}
                orientacao="Imagem exibida enquanto o vídeo carrega."
              />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                Banner continua salvo dentro do bloco. Não há página separada de
                assets e as imagens ficam no próprio configJson do bloco.
              </div>
            </>
          ) : null}

          {selectedElement !== "MODELO" && (
            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => onSelectedElementChange("MODELO")}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Modelo
              </button>
              <button
                type="button"
                onClick={() => onSelectedElementChange("AVANCADO")}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Avançado
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>

      {modelosAbertos && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="max-h-[88vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Modelos de banner
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">
                  Escolha pela composição visual
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Cada modelo mantém imagem desktop, imagem mobile, CTA,
                  overlay, altura e largura dentro do bloco do builder.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModelosAbertos(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar modelos"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <BannerModeloCards
                modeloNormalizado={modeloNormalizado}
                onSelect={(modeloBanner) => {
                  onChange(getBannerModeloPatch(modeloBanner));
                  onSelectedElementChange("MODELO");
                  setModelosAbertos(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VitrineEditorialEditor({
  estado,
  categoriasDisponiveis,
  paginasDisponiveis,
  onChange,
}: {
  estado: NonNullable<BlocoEditandoState>;
  categoriasDisponiveis: EditorVisualCategoria[];
  paginasDisponiveis: EditorVisualPaginaLink[];
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  const configAtual = getConfigObject(estado.bloco.configJson);
  const configVitrine = getConfigVitrineEditorial(configAtual);
  const categoriasOpcoes = getOpcoesCategoriasVitrine(categoriasDisponiveis);
  const previewBloco: EditorVisualBloco = {
    ...estado.bloco,
    configJson: configVitrine,
  };

  function aplicarConfig(patch: Record<string, unknown>) {
    const proximoConfig = getConfigVitrineEditorial({
      ...configAtual,
      ...patch,
    });

    onChange({
      bloco: {
        ...estado.bloco,
        configJson: proximoConfig,
      },
    });
  }

  function atualizarItem(
    itemId: string,
    patch: Partial<VitrineEditorialItemEditando>
  ) {
    aplicarConfig({
      itens: configVitrine.itens.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    });
  }

  function atualizarQuantidade(quantidade: number) {
    const quantidadeNormalizada =
      normalizarQuantidadeVitrineEditorial(quantidade);
    const itens = Array.from({ length: quantidadeNormalizada }, (_, index) => {
      return (
        configVitrine.itens[index] ||
        criarItemVitrineEditorialPadrao(index + 1)
      );
    });

    aplicarConfig({
      quantidadeItens: quantidadeNormalizada,
      itens,
    });
  }

  function selecionarCategoria(
    item: VitrineEditorialItemEditando,
    categoriaId: string
  ) {
    const categoria = getCategoriaResumo(categoriaId, categoriasDisponiveis);

    atualizarItem(item.id, {
      categoriaId: categoria?.id || "",
      categoriaSlug: categoria?.slug || "",
      categoriaNome: categoria?.nome || "",
      categoriaImagemUrl: categoria?.imagemUrl || "",
    });
  }

  function selecionarPagina(
    item: VitrineEditorialItemEditando,
    paginaId: string
  ) {
    const paginaSelecionada = getPaginaResumo(paginaId, paginasDisponiveis);

    atualizarItem(item.id, {
      paginaId: paginaSelecionada?.id || "",
      paginaSlug: paginaSelecionada?.slug || "",
      paginaTitulo: paginaSelecionada?.titulo || "",
    });
  }

  return (
    <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-5">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Nome interno
          </span>

          <input
            value={estado.nomeInterno}
            onChange={(event) => onChange({ nomeInterno: event.target.value })}
            placeholder="Ex: Vitrine de colecoes"
            className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <PainelSecao title="Layout">
          <div className="space-y-4">
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Quantidade de itens
              </span>

              <div className="grid grid-cols-3 gap-2">
                {[3, 4, 5].map((quantidade) => (
                  <button
                    key={quantidade}
                    type="button"
                    onClick={() => atualizarQuantidade(quantidade)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                      configVitrine.quantidadeItens === quantidade
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {quantidade}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Altura visual
                </span>

                <select
                  value={configVitrine.alturaVisual}
                  onChange={(event) =>
                    aplicarConfig({ alturaVisual: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                >
                  <option value="PADRAO">Padrao</option>
                  <option value="COMPACTA">Compacta</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Animacao
                </span>

                <select
                  value={configVitrine.animacaoBloco}
                  onChange={(event) =>
                    aplicarConfig({ animacaoBloco: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                >
                  <option value="SEM_ANIMACAO">Sem animacao</option>
                  <option value="SUBINDO_EM_SEQUENCIA">
                    Subindo em sequencia
                  </option>
                  <option value="LATERAL_EM_SEQUENCIA">
                    Lateral em sequencia
                  </option>
                  <option value="FADE_EM_SEQUENCIA">Fade em sequencia</option>
                </select>
              </label>
            </div>
          </div>
        </PainelSecao>

        <div className="space-y-4">
          {configVitrine.itens.map((item, index) => {
            const linkPersonalizadoInvalido =
              item.tipoLink === "URL_PERSONALIZADA" &&
              item.linkUrl.trim().length > 0 &&
              !normalizarUrlPersonalizadaVitrine(item.linkUrl);

            return (
              <SecaoRecolhivel
                key={item.id}
                title={`Item ${index + 1}`}
                description="Desktop recomendado: 1600 x 2000 px. Mobile recomendado: 1080 x 1400 px."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Tipo de link
                    </span>

                    <select
                      value={item.tipoLink}
                      onChange={(event) =>
                        atualizarItem(item.id, {
                          tipoLink: normalizarTipoLinkVitrineEditorial(
                            event.target.value
                          ),
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                    >
                      <option value="CATEGORIA">Categoria</option>
                      <option value="PAGINA">Pagina</option>
                      <option value="URL_PERSONALIZADA">
                        URL personalizada
                      </option>
                    </select>
                  </label>

                  {item.tipoLink === "CATEGORIA" ? (
                    <label>
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Categoria
                      </span>

                      <select
                        value={item.categoriaId}
                        onChange={(event) =>
                          selecionarCategoria(item, event.target.value)
                        }
                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categoriasOpcoes.map(({ categoria, label }) => (
                          <option key={categoria.id} value={categoria.id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : item.tipoLink === "PAGINA" ? (
                    <label>
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Pagina
                      </span>

                      <select
                        value={item.paginaId}
                        onChange={(event) =>
                          selecionarPagina(item, event.target.value)
                        }
                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                      >
                        <option value="">Selecione uma pagina</option>
                        {paginasDisponiveis.map((paginaOpcao) => (
                          <option key={paginaOpcao.id} value={paginaOpcao.id}>
                            {paginaOpcao.titulo}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        URL
                      </span>

                      <input
                        value={item.linkUrl}
                        onChange={(event) =>
                          atualizarItem(item.id, { linkUrl: event.target.value })
                        }
                        placeholder="/loja/campanha"
                        className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  )}
                </div>

                {linkPersonalizadoInvalido ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                    Use uma URL iniciando com /, http://, https://, mailto: ou
                    tel:.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Nome exibido
                    </span>

                    <input
                      value={item.label}
                      onChange={(event) =>
                        atualizarItem(item.id, { label: event.target.value })
                      }
                      placeholder={
                        item.categoriaNome || item.paginaTitulo || "Ex: Colares"
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Texto do botao
                    </span>

                    <input
                      value={item.textoBotao}
                      onChange={(event) =>
                        atualizarItem(item.id, { textoBotao: event.target.value })
                      }
                      placeholder="Explorar"
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <UploadMidiaCampo
                    label="Imagem desktop"
                    value={item.imagemDesktop}
                    tipoMidia="IMAGEM"
                    onChange={(url) =>
                      atualizarItem(item.id, { imagemDesktop: url })
                    }
                    orientacao="Opcional. Quando vazio, usa a imagem da categoria selecionada."
                  />

                  <UploadMidiaCampo
                    label="Imagem mobile"
                    value={item.imagemMobile}
                    tipoMidia="IMAGEM"
                    onChange={(url) =>
                      atualizarItem(item.id, { imagemMobile: url })
                    }
                    orientacao="Opcional. Quando vazio, usa a imagem desktop."
                  />
                </div>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Texto alternativo
                  </span>

                  <input
                    value={item.altText}
                    onChange={(event) =>
                      atualizarItem(item.id, { altText: event.target.value })
                    }
                    placeholder={item.label || item.categoriaNome || item.paginaTitulo}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />
                </label>

                <VisualCropEditor
                  label="Crop visual do item"
                  value={createResponsiveMediaConfig({
                    desktopUrl:
                      item.imagemDesktop ||
                      item.categoriaImagemUrl ||
                      item.imagemMobile,
                    mobileUrl: item.imagemMobile,
                    alt: item.altText || item.label,
                    aspectRatioDesktop:
                      configVitrine.alturaVisual === "COMPACTA" ? "4:5" : "9:16",
                    aspectRatioMobile: "4:5",
                    desktopPositionX: item.focoHorizontal,
                    desktopPositionY: item.focoVertical,
                    mobilePositionX:
                      item.focoMobileHorizontal ?? item.focoHorizontal,
                    mobilePositionY:
                      item.focoMobileVertical ?? item.focoVertical,
                    desktopZoom: item.zoom,
                    mobileZoom: item.zoomMobile ?? item.zoom,
                  })}
                  onChange={(media) =>
                    atualizarItem(item.id, {
                      imagemDesktop: media.desktop.url || "",
                      imagemMobile:
                        media.usarImagemMobileAlternativa && media.mobileUrl
                          ? media.mobileUrl
                          : "",
                      altText: media.desktop.alt || media.mobile.alt || item.altText,
                      focoHorizontal: media.desktop.positionX,
                      focoVertical: media.desktop.positionY,
                      zoom: media.desktop.zoom,
                      focoMobileHorizontal: media.mobile.positionX,
                      focoMobileVertical: media.mobile.positionY,
                      zoomMobile: media.mobile.zoom,
                    })
                  }
                  aspectRatioDesktop={
                    configVitrine.alturaVisual === "COMPACTA" ? "4:5" : "9:16"
                  }
                  aspectRatioMobile="4:5"
                  contexto={
                    configVitrine.alturaVisual === "COMPACTA"
                      ? "GALERIA_4_5"
                      : "GALERIA_9_16"
                  }
                />

                <div className="grid gap-3 md:grid-cols-3">
                  <CampoToggle
                    checked={item.ocultarNome}
                    label="Ocultar nome"
                    onChange={(checked) =>
                      atualizarItem(item.id, { ocultarNome: checked })
                    }
                  />

                  <CampoToggle
                    checked={item.ocultarBotao}
                    label="Ocultar botao"
                    onChange={(checked) =>
                      atualizarItem(item.id, { ocultarBotao: checked })
                    }
                  />

                  <CampoToggle
                    checked={item.abrirNovaAba}
                    label="Abrir em nova aba"
                    onChange={(checked) =>
                      atualizarItem(item.id, { abrirNovaAba: checked })
                    }
                  />
                </div>
              </SecaoRecolhivel>
            );
          })}
        </div>
      </div>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Preview
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <VitrineEditorialPublico
            bloco={previewBloco}
            device="DESKTOP"
            modo="editor"
            categorias={categoriasDisponiveis}
          />
        </div>
      </aside>
    </div>
  );
}

function GaleriaEditorialEditor({
  estado,
  categoriasDisponiveis,
  paginasDisponiveis,
  produtosDisponiveis,
  colecoesInteligentes,
  campanhasDisponiveis,
  selectedItemId,
  onChange,
}: {
  estado: NonNullable<BlocoEditandoState>;
  categoriasDisponiveis: EditorVisualCategoria[];
  paginasDisponiveis: EditorVisualPaginaLink[];
  produtosDisponiveis: EditorVisualProduto[];
  colecoesInteligentes: EditorVisualColecaoInteligente[];
  campanhasDisponiveis: EditorVisualCampanhaComercial[];
  selectedItemId?: string;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  const configGaleria = getGaleriaEditorialConfig(estado.bloco.configJson);
  const [itemSelecionadoId, setItemSelecionadoId] = useState(
    selectedItemId || configGaleria.itens[0]?.id || "galeria-1"
  );
  const itemSelecionado =
    configGaleria.itens.find((item) => item.id === itemSelecionadoId) ||
    configGaleria.itens[0] ||
    criarGaleriaEditorialItemPadrao(1);
  const previewBloco = {
    ...estado.bloco,
    configJson: configGaleria,
  };
  const recomendacao =
    configGaleria.layout.colunas === 4
      ? {
          desktop: "Desktop recomendado: 1200 x 1600 px por imagem.",
          mobile: "Mobile recomendado: 1080 x 1350 px.",
        }
      : {
          desktop: "Desktop recomendado: 1400 x 1800 px por imagem.",
          mobile: "Mobile recomendado: 1080 x 1350 px.",
        };

  function aplicarConfig(patch: Partial<GaleriaEditorialConfig>) {
    onChange({
      bloco: {
        ...estado.bloco,
        configJson: {
          ...configGaleria,
          ...patch,
        },
      },
    });
  }

  function atualizarSecao<Key extends keyof GaleriaEditorialConfig>(
    key: Key,
    patch: Partial<GaleriaEditorialConfig[Key]>
  ) {
    aplicarConfig({
      [key]: {
        ...(configGaleria[key] as Record<string, unknown>),
        ...patch,
      },
    } as Partial<GaleriaEditorialConfig>);
  }

  function atualizarItens(itens: GaleriaEditorialItemConfig[]) {
    aplicarConfig({ itens });
  }

  function atualizarItem(
    itemId: string,
    patch: Partial<GaleriaEditorialItemConfig>
  ) {
    atualizarItens(
      configGaleria.itens.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      )
    );
  }

  function garantirQuantidadeItens(quantidade: number) {
    const itens = Array.from({ length: quantidade }, (_, index) => {
      return configGaleria.itens[index] || criarGaleriaEditorialItemPadrao(index + 1);
    });

    aplicarConfig({
      layout: {
        ...configGaleria.layout,
        colunas: quantidade === 3 ? 3 : 4,
      },
      fonte: {
        ...configGaleria.fonte,
        quantidade,
      },
      itens,
    });
  }

  function produtoParaItem(produtoId: string, index: number) {
    const produto = produtosDisponiveis.find((item) => item.id === produtoId);
    const atual = configGaleria.itens[index] || criarGaleriaEditorialItemPadrao(index + 1);

    return {
      ...atual,
      produtoId,
      imagemDesktop: atual.imagemDesktop || produto?.imagemUrl || "",
      imagemMobile: atual.imagemMobile || "",
      alt: atual.alt || produto?.nome || "",
      titulo: atual.titulo || produto?.nome || "",
      subtitulo: atual.subtitulo || produto?.categoria || "",
      linkTipo: "PRODUTO" as const,
      linkValor: produtoId,
    };
  }

  function atualizarProdutosFonte(produtosIds: string[]) {
    const quantidade = Math.max(configGaleria.layout.colunas, produtosIds.length);
    const itens = Array.from({ length: quantidade }, (_, index) => {
      const produtoId = produtosIds[index];
      return produtoId
        ? produtoParaItem(produtoId, index)
        : configGaleria.itens[index] || criarGaleriaEditorialItemPadrao(index + 1);
    });

    aplicarConfig({
      fonte: {
        ...configGaleria.fonte,
        produtosIds,
        quantidade: Math.max(configGaleria.layout.colunas, produtosIds.length),
      },
      itens,
    });
  }

  function selecionarLink(
    itemId: string,
    tipo: GaleriaEditorialLinkTipo,
    valor: string
  ) {
    if (tipo === "PRODUTO") {
      const produto = produtosDisponiveis.find((item) => item.id === valor);
      atualizarItem(itemId, {
        linkTipo: tipo,
        linkValor: produto?.id || "",
        produtoId: produto?.id || "",
        titulo: produto?.nome || itemSelecionado.titulo,
        subtitulo: produto?.categoria || itemSelecionado.subtitulo,
        imagemDesktop: itemSelecionado.imagemDesktop || produto?.imagemUrl || "",
        imagemMobile: itemSelecionado.imagemMobile || "",
        alt: itemSelecionado.alt || produto?.nome || "",
      });
      return;
    }

    if (tipo === "CATEGORIA") {
      const categoria = getCategoriaResumo(valor, categoriasDisponiveis);
      atualizarItem(itemId, {
        linkTipo: tipo,
        linkValor: categoria?.slug || "",
        titulo: itemSelecionado.titulo || categoria?.nome || "",
      });
      return;
    }

    if (tipo === "PAGINA") {
      const paginaSelecionada = getPaginaResumo(valor, paginasDisponiveis);
      atualizarItem(itemId, {
        linkTipo: tipo,
        linkValor: paginaSelecionada?.slug || "",
        titulo: itemSelecionado.titulo || paginaSelecionada?.titulo || "",
      });
      return;
    }

    if (tipo === "COLECAO") {
      const colecao = colecoesInteligentes.find((item) => item.id === valor);
      atualizarItem(itemId, {
        linkTipo: tipo,
        linkValor: colecao?.slug || "",
        titulo: itemSelecionado.titulo || colecao?.nome || "",
      });
      return;
    }

    atualizarItem(itemId, {
      linkTipo: tipo,
      linkValor: valor,
    });
  }

  return (
    <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Nome interno
          </span>
          <input
            value={estado.nomeInterno}
            onChange={(event) => onChange({ nomeInterno: event.target.value })}
            placeholder="Ex: Galeria editorial campanha"
            className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <PainelSecao title="Layout">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Quantidade de imagens
              </span>
              <select
                value={configGaleria.layout.colunas}
                onChange={(event) =>
                  garantirQuantidadeItens(Number(event.target.value))
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {GALERIA_LAYOUT_COLUNAS_PRESETS.map((preset) => (
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
                value={configGaleria.layout.varianteAltura}
                onChange={(event) =>
                  atualizarSecao("layout", {
                    varianteAltura:
                      event.target.value as GaleriaEditorialConfig["layout"]["varianteAltura"],
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {GALERIA_ALTURA_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Gap entre imagens ({configGaleria.layout.gap}px)
              </span>
              <input
                type="range"
                min={0}
                max={24}
                value={configGaleria.layout.gap}
                onChange={(event) =>
                  atualizarSecao("layout", { gap: Number(event.target.value) })
                }
                className="w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Mobile
              </span>
              <select
                value={configGaleria.layout.comportamentoMobile}
                onChange={(event) =>
                  atualizarSecao("layout", {
                    comportamentoMobile:
                      event.target.value as GaleriaEditorialConfig["layout"]["comportamentoMobile"],
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {GALERIA_MOBILE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <CampoToggle
            checked={configGaleria.layout.fullBleed}
            label="Full bleed"
            description="Ocupa toda a largura útil da página, sem moldura pesada."
            className="mt-4"
            onChange={(checked) => atualizarSecao("layout", { fullBleed: checked })}
          />
        </PainelSecao>

        <PainelSecao title="Fonte">
          <div className="space-y-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Origem do conteúdo
              </span>
              <select
                value={configGaleria.fonte.tipo}
                onChange={(event) =>
                  atualizarSecao("fonte", {
                    tipo: event.target.value as GaleriaEditorialConfig["fonte"]["tipo"],
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {GALERIA_FONTE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            {configGaleria.fonte.tipo === "PRODUTOS" && (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-500">
                  Escolha produtos; a galeria usa a imagem principal e linka para o produto. Você ainda pode sobrescrever cada item abaixo.
                </p>
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                  {produtosDisponiveis.map((produto) => {
                    const checked = configGaleria.fonte.produtosIds.includes(produto.id);
                    return (
                      <label
                        key={produto.id}
                        className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...configGaleria.fonte.produtosIds, produto.id]
                              : configGaleria.fonte.produtosIds.filter(
                                  (id) => id !== produto.id
                                );
                            atualizarProdutosFonte(next.slice(0, 8));
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="min-w-0 truncate">
                          {produto.codigoInterno} · {produto.nome}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {configGaleria.fonte.tipo === "COLECAO_INTELIGENTE" && (
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Coleção
                  </span>
                  <select
                    value={configGaleria.fonte.colecaoId}
                    onChange={(event) => {
                      const colecao = colecoesInteligentes.find(
                        (item) => item.id === event.target.value
                      );
                      const produtosIds = colecao
                        ? [
                            ...colecao.produtoIdsAprovados,
                            ...(configGaleria.fonte.incluirSugeridos
                              ? colecao.produtoIdsSugeridos
                              : []),
                          ]
                        : [];
                      atualizarSecao("fonte", {
                        colecaoId: colecao?.id || "",
                        colecaoSlug: colecao?.slug || "",
                        produtosIds: produtosIds.slice(0, 8),
                      });
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Selecione uma coleção</option>
                    {colecoesInteligentes
                      .filter((colecao) => colecao.status !== "ARQUIVADA")
                      .map((colecao) => (
                        <option key={colecao.id} value={colecao.id}>
                          {colecao.nome} ({colecao.produtosAprovados} aprovados)
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Ordem
                  </span>
                  <select
                    value={configGaleria.fonte.ordem}
                    onChange={(event) =>
                      atualizarSecao("fonte", {
                        ordem:
                          event.target.value as GaleriaEditorialConfig["fonte"]["ordem"],
                      })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {GALERIA_ORDEM_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <CampoToggle
                  checked={configGaleria.fonte.incluirSugeridos}
                  label="Incluir sugeridos"
                  description="Por padrão entram apenas produtos aprovados da coleção ativa."
                  className="md:col-span-2"
                  onChange={(checked) => {
                    const colecao = colecoesInteligentes.find(
                      (item) => item.id === configGaleria.fonte.colecaoId
                    );
                    const produtosIds = colecao
                      ? [
                          ...colecao.produtoIdsAprovados,
                          ...(checked ? colecao.produtoIdsSugeridos : []),
                        ]
                      : configGaleria.fonte.produtosIds;

                    atualizarSecao("fonte", {
                      incluirSugeridos: checked,
                      produtosIds: produtosIds.slice(0, 8),
                    });
                  }}
                />
              </div>
            )}

            {configGaleria.fonte.tipo === "CAMPANHA" && (
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Campanha
                </span>
                <select
                  value={configGaleria.fonte.campanhaId}
                  onChange={(event) => {
                    const campanha = campanhasDisponiveis.find(
                      (item) => item.id === event.target.value
                    );
                    atualizarSecao("fonte", {
                      campanhaId: campanha?.id || "",
                      produtosIds: campanha?.produtoIds.slice(0, 8) || [],
                    });
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">Selecione uma campanha</option>
                  {campanhasDisponiveis.map((campanha) => (
                    <option key={campanha.id} value={campanha.id}>
                      {campanha.codigo} · {campanha.titulo} ({campanha.status})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </PainelSecao>

        <PainelSecao title="Itens">
          <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-900">
              <p className="font-semibold">Recomendações de imagem</p>
              <p>{recomendacao.desktop}</p>
              <p>{recomendacao.mobile}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {configGaleria.itens.slice(0, configGaleria.layout.colunas).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setItemSelecionadoId(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    itemSelecionado.id === item.id
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Imagem {index + 1}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <UploadMidiaCampo
                  label="Imagem desktop"
                  value={itemSelecionado.imagemDesktop}
                  tipoMidia="IMAGEM"
                  onChange={(url) =>
                    atualizarItem(itemSelecionado.id, { imagemDesktop: url })
                  }
                  orientacao={recomendacao.desktop}
                />
                <UploadMidiaCampo
                  label="Imagem mobile"
                  value={itemSelecionado.imagemMobile}
                  tipoMidia="IMAGEM"
                  onChange={(url) =>
                    atualizarItem(itemSelecionado.id, { imagemMobile: url })
                  }
                  orientacao={`${recomendacao.mobile} Opcional; vazio usa desktop.`}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Alt text
                  </span>
                  <input
                    value={itemSelecionado.alt}
                    onChange={(event) =>
                      atualizarItem(itemSelecionado.id, { alt: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Produto base opcional
                  </span>
                  <select
                    value={itemSelecionado.produtoId}
                    onChange={(event) => {
                      const produto = produtosDisponiveis.find(
                        (item) => item.id === event.target.value
                      );
                      atualizarItem(itemSelecionado.id, {
                        ...produtoParaItem(event.target.value, 0),
                        id: itemSelecionado.id,
                        imagemDesktop:
                          itemSelecionado.imagemDesktop || produto?.imagemUrl || "",
                        imagemMobile:
                          itemSelecionado.imagemMobile || "",
                      });
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Sem produto base</option>
                    {produtosDisponiveis.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.codigoInterno} · {produto.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4">
                <VisualCropEditor
                  label="Crop visual do item"
                  value={createResponsiveMediaConfig({
                    desktopUrl: itemSelecionado.imagemDesktop,
                    mobileUrl: itemSelecionado.imagemMobile,
                    alt: itemSelecionado.alt,
                    aspectRatioDesktop:
                      configGaleria.layout.varianteAltura === "COMPACTA"
                        ? "4:5"
                        : "9:16",
                    aspectRatioMobile: "4:5",
                    desktopPositionX: itemSelecionado.focoX,
                    desktopPositionY: itemSelecionado.focoY,
                    mobilePositionX:
                      itemSelecionado.focoMobileX ?? itemSelecionado.focoX,
                    mobilePositionY:
                      itemSelecionado.focoMobileY ?? itemSelecionado.focoY,
                    desktopZoom: itemSelecionado.zoom,
                    mobileZoom:
                      itemSelecionado.zoomMobile ?? itemSelecionado.zoom,
                  })}
                  onChange={(media) =>
                    atualizarItem(itemSelecionado.id, {
                      imagemDesktop: media.desktop.url || "",
                      imagemMobile:
                        media.usarImagemMobileAlternativa && media.mobileUrl
                          ? media.mobileUrl
                          : "",
                      alt: media.desktop.alt || media.mobile.alt || itemSelecionado.alt,
                      focoX: media.desktop.positionX,
                      focoY: media.desktop.positionY,
                      zoom: media.desktop.zoom,
                      focoMobileX: media.mobile.positionX,
                      focoMobileY: media.mobile.positionY,
                      zoomMobile: media.mobile.zoom,
                    })
                  }
                  aspectRatioDesktop={
                    configGaleria.layout.varianteAltura === "COMPACTA"
                      ? "4:5"
                      : "9:16"
                  }
                  aspectRatioMobile="4:5"
                  contexto={
                    configGaleria.layout.varianteAltura === "COMPACTA"
                      ? "GALERIA_4_5"
                      : "GALERIA_9_16"
                  }
                />
              </div>

              <div className="mt-4">
                <RangeControl
                  label="Overlay"
                  value={itemSelecionado.overlayOpacidade}
                  min={0}
                  max={70}
                  suffix="%"
                  onChange={(overlayOpacidade) =>
                    atualizarItem(itemSelecionado.id, { overlayOpacidade })
                  }
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Título
                  </span>
                  <input
                    value={itemSelecionado.titulo}
                    onChange={(event) =>
                      atualizarItem(itemSelecionado.id, { titulo: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Subtítulo
                  </span>
                  <input
                    value={itemSelecionado.subtitulo}
                    onChange={(event) =>
                      atualizarItem(itemSelecionado.id, {
                        subtitulo: event.target.value,
                      })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Posição do texto
                  </span>
                  <select
                    value={itemSelecionado.posicaoTexto}
                    onChange={(event) =>
                      atualizarItem(itemSelecionado.id, {
                        posicaoTexto:
                          event.target.value as GaleriaEditorialItemConfig["posicaoTexto"],
                      })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {GALERIA_TEXTO_POSICAO_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Texto do botão
                  </span>
                  <input
                    value={itemSelecionado.botaoTexto}
                    onChange={(event) =>
                      atualizarItem(itemSelecionado.id, {
                        botaoTexto: event.target.value,
                      })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <CampoToggle
                  checked={itemSelecionado.mostrarTexto}
                  label="Mostrar texto"
                  onChange={(checked) =>
                    atualizarItem(itemSelecionado.id, { mostrarTexto: checked })
                  }
                />
                <CampoToggle
                  checked={itemSelecionado.mostrarBotao}
                  label="Mostrar botão"
                  onChange={(checked) =>
                    atualizarItem(itemSelecionado.id, { mostrarBotao: checked })
                  }
                />
                <CampoToggle
                  checked={itemSelecionado.botaoApenasHover}
                  label="Botão só no hover"
                  onChange={(checked) =>
                    atualizarItem(itemSelecionado.id, {
                      botaoApenasHover: checked,
                    })
                  }
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Tipo de link
                  </span>
                  <select
                    value={itemSelecionado.linkTipo}
                    onChange={(event) =>
                      atualizarItem(itemSelecionado.id, {
                        linkTipo: event.target.value as GaleriaEditorialLinkTipo,
                        linkValor: event.target.value === "URL" ? itemSelecionado.linkValor : "",
                      })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    {GALERIA_LINK_TIPO_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                {itemSelecionado.linkTipo === "URL" ? (
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      URL
                    </span>
                    <input
                      value={itemSelecionado.linkValor}
                      onChange={(event) =>
                        selecionarLink(itemSelecionado.id, "URL", event.target.value)
                      }
                      placeholder="/loja/categoria/aneis ou https://..."
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                ) : (
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Destino
                    </span>
                    <select
                      value=""
                      onChange={(event) =>
                        selecionarLink(
                          itemSelecionado.id,
                          itemSelecionado.linkTipo,
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      <option value="">
                        {itemSelecionado.linkValor
                          ? `Selecionado: ${itemSelecionado.linkValor}`
                          : "Selecione o destino"}
                      </option>
                      {itemSelecionado.linkTipo === "PRODUTO" &&
                        produtosDisponiveis.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.codigoInterno} · {produto.nome}
                          </option>
                        ))}
                      {itemSelecionado.linkTipo === "CATEGORIA" &&
                        categoriasDisponiveis.map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.caminho}
                          </option>
                        ))}
                      {itemSelecionado.linkTipo === "PAGINA" &&
                        paginasDisponiveis.map((pagina) => (
                          <option key={pagina.id} value={pagina.id}>
                            {pagina.titulo}
                          </option>
                        ))}
                      {itemSelecionado.linkTipo === "COLECAO" &&
                        colecoesInteligentes.map((colecao) => (
                          <option key={colecao.id} value={colecao.id}>
                            {colecao.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>
            </div>
          </div>
        </PainelSecao>

        <PainelSecao title="Hover e design">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Hover
              </span>
              <select
                value={configGaleria.hover.tipo}
                onChange={(event) =>
                  atualizarSecao("hover", {
                    tipo:
                      event.target.value as GaleriaEditorialConfig["hover"]["tipo"],
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {GALERIA_HOVER_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Intensidade
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={configGaleria.hover.intensidade}
                onChange={(event) =>
                  atualizarSecao("hover", {
                    intensidade: Number(event.target.value),
                  })
                }
                className="w-full"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Fundo
              </span>
              <input
                type="color"
                value={configGaleria.design.fundo}
                onChange={(event) =>
                  atualizarSecao("design", { fundo: event.target.value })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Raio ({configGaleria.design.raio}px)
              </span>
              <input
                type="range"
                min={0}
                max={24}
                value={configGaleria.design.raio}
                onChange={(event) =>
                  atualizarSecao("design", { raio: Number(event.target.value) })
                }
                className="w-full"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Espaçamento vertical ({configGaleria.design.espacamentoVertical}px)
              </span>
              <input
                type="range"
                min={0}
                max={96}
                value={configGaleria.design.espacamentoVertical}
                onChange={(event) =>
                  atualizarSecao("design", {
                    espacamentoVertical: Number(event.target.value),
                  })
                }
                className="w-full"
              />
            </label>
          </div>
        </PainelSecao>
      </div>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Preview
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <GaleriaEditorialFullBleedPublico
            bloco={previewBloco}
            produtos={toBannerProdutosPublicos(produtosDisponiveis)}
            modo="editor"
          />
        </div>
      </aside>
    </div>
  );
}

function HeroEditorialPngEditor({
  estado,
  categoriasDisponiveis,
  paginasDisponiveis,
  produtosDisponiveis,
  colecoesInteligentes,
  onChange,
}: {
  estado: NonNullable<BlocoEditandoState>;
  categoriasDisponiveis: EditorVisualCategoria[];
  paginasDisponiveis: EditorVisualPaginaLink[];
  produtosDisponiveis: EditorVisualProduto[];
  colecoesInteligentes: EditorVisualColecaoInteligente[];
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  const configHero = getHeroEditorialPngConfig(estado.bloco.configJson);

  function aplicarConfig(patch: Partial<HeroEditorialPngConfig>) {
    onChange({
      bloco: {
        ...estado.bloco,
        configJson: {
          ...configHero,
          ...patch,
        },
      },
    });
  }

  function atualizarSecao<Key extends keyof HeroEditorialPngConfig>(
    key: Key,
    patch: Partial<HeroEditorialPngConfig[Key]>
  ) {
    aplicarConfig({
      [key]: {
        ...(configHero[key] as Record<string, unknown>),
        ...patch,
      },
    } as Partial<HeroEditorialPngConfig>);
  }

  function selecionarLink(tipo: HeroEditorialPngConfig["cta"]["linkTipo"], valor: string) {
    if (tipo === "PRODUTO") {
      const produto = produtosDisponiveis.find((item) => item.id === valor);
      atualizarSecao("cta", {
        linkTipo: tipo,
        linkValor: produto?.id || "",
        titulo: produto?.nome || configHero.cta.titulo,
      });
      return;
    }

    if (tipo === "CATEGORIA") {
      const categoria = getCategoriaResumo(valor, categoriasDisponiveis);
      atualizarSecao("cta", {
        linkTipo: tipo,
        linkValor: categoria?.slug || "",
        titulo: categoria?.nome || configHero.cta.titulo,
      });
      return;
    }

    if (tipo === "PAGINA") {
      const paginaSelecionada = getPaginaResumo(valor, paginasDisponiveis);
      atualizarSecao("cta", {
        linkTipo: tipo,
        linkValor: paginaSelecionada?.slug || "",
        titulo: paginaSelecionada?.titulo || configHero.cta.titulo,
      });
      return;
    }

    if (tipo === "COLECAO") {
      const colecao = colecoesInteligentes.find((item) => item.id === valor);
      atualizarSecao("cta", {
        linkTipo: tipo,
        linkValor: colecao?.slug || "",
        titulo: colecao?.nome || configHero.cta.titulo,
      });
      return;
    }

    atualizarSecao("cta", {
      linkTipo: tipo,
      linkValor: valor,
    });
  }

  const recomendacao =
    configHero.variante === "TELA_CHEIA"
      ? {
          desktop: "Desktop recomendado: 2600 x 2600 px. Mínimo: 2200 x 2200 px.",
          mobile: "Mobile recomendado: 1800 x 1800 px. Mínimo: 1400 x 1400 px.",
        }
      : {
          desktop: "Desktop recomendado: 2200 x 2200 px. Mínimo: 1800 x 1800 px.",
          mobile: "Mobile recomendado: 1600 x 1600 px. Mínimo: 1200 x 1200 px.",
        };

  return (
    <div className="space-y-5 px-6 py-5">
      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Nome interno
        </span>
        <input
          value={estado.nomeInterno}
          onChange={(event) => onChange({ nomeInterno: event.target.value })}
          placeholder="Ex: Hero editorial campanha"
          className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
        />
      </label>

      <PainelSecao title="Conteúdo">
        <div className="space-y-4">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Texto principal
            </span>
            <textarea
              value={configHero.texto.conteudo}
              onChange={(event) =>
                atualizarSecao("texto", { conteudo: event.target.value })
              }
              rows={3}
              placeholder="STELLA COLARI"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Linhas do texto
              </span>
              <select
                value={configHero.texto.linhas}
                onChange={(event) =>
                  atualizarSecao("texto", {
                    linhas: event.target.value as HeroEditorialPngConfig["texto"]["linhas"],
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {HERO_LINHAS_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Alinhamento
              </span>
              <select
                value={configHero.texto.alinhamento}
                onChange={(event) =>
                  atualizarSecao("texto", {
                    alinhamento: event.target.value as HeroEditorialPngConfig["texto"]["alinhamento"],
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                <option value="CENTRO">Centro</option>
                <option value="ESQUERDA">Esquerda</option>
              </select>
            </label>
          </div>

          <CampoToggle
            checked={configHero.cta.mostrar}
            label="Mostrar CTA/box"
            description="Quando desligado, o bloco inteiro pode usar o link configurado."
            onChange={(checked) => atualizarSecao("cta", { mostrar: checked })}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Label
              </span>
              <input
                value={configHero.cta.label}
                onChange={(event) =>
                  atualizarSecao("cta", { label: event.target.value })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Título do CTA
              </span>
              <input
                value={configHero.cta.titulo}
                onChange={(event) =>
                  atualizarSecao("cta", { titulo: event.target.value })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Texto do botão
              </span>
              <input
                value={configHero.cta.textoBotao}
                onChange={(event) =>
                  atualizarSecao("cta", { textoBotao: event.target.value })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tipo de link
              </span>
              <select
                value={configHero.cta.linkTipo}
                onChange={(event) =>
                  atualizarSecao("cta", {
                    linkTipo: event.target.value as HeroEditorialPngConfig["cta"]["linkTipo"],
                    linkValor: event.target.value === "URL" ? configHero.cta.linkValor : "",
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {HERO_LINK_TIPO_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Posição do CTA
              </span>
              <select
                value={configHero.cta.posicao}
                onChange={(event) =>
                  atualizarSecao("cta", {
                    posicao: event.target.value as HeroEditorialPngConfig["cta"]["posicao"],
                  })
                }
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {HERO_CTA_POSICAO_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {configHero.cta.linkTipo === "URL" ? (
            <input
              value={configHero.cta.linkValor}
              onChange={(event) => selecionarLink("URL", event.target.value)}
              placeholder="/loja/categoria/aneis ou https://..."
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          ) : (
            <select
              value=""
              onChange={(event) =>
                selecionarLink(configHero.cta.linkTipo, event.target.value)
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              <option value="">
                {configHero.cta.linkValor
                  ? `Selecionado: ${configHero.cta.linkValor}`
                  : "Selecione o destino"}
              </option>
              {configHero.cta.linkTipo === "PRODUTO" &&
                produtosDisponiveis.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.codigoInterno} · {produto.nome}
                  </option>
                ))}
              {configHero.cta.linkTipo === "CATEGORIA" &&
                categoriasDisponiveis.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.caminho}
                  </option>
                ))}
              {configHero.cta.linkTipo === "PAGINA" &&
                paginasDisponiveis.map((pagina) => (
                  <option key={pagina.id} value={pagina.id}>
                    {pagina.titulo}
                  </option>
                ))}
              {configHero.cta.linkTipo === "COLECAO" &&
                colecoesInteligentes.map((colecao) => (
                  <option key={colecao.id} value={colecao.id}>
                    {colecao.nome} · {colecao.produtosAprovados} aprovados
                  </option>
                ))}
            </select>
          )}
        </div>
      </PainelSecao>

      <PainelSecao title="Tipografia">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Preset de escala
            </span>
            <select
              value={configHero.texto.preset}
              onChange={(event) =>
                atualizarSecao("texto", {
                  preset: event.target.value as HeroEditorialPngConfig["texto"]["preset"],
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              {HERO_TEXTO_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Peso
            </span>
            <select
              value={configHero.texto.peso}
              onChange={(event) =>
                atualizarSecao("texto", {
                  peso: event.target.value as HeroEditorialPngConfig["texto"]["peso"],
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              {HERO_PESO_PRESETS.map((preset) => (
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
            <input
              type="color"
              value={configHero.texto.cor}
              onChange={(event) =>
                atualizarSecao("texto", { cor: event.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Margem segura lateral (%)
            </span>
            <input
              type="number"
              min={4}
              max={18}
              value={configHero.texto.margemSeguraPercentual}
              onChange={(event) =>
                atualizarSecao("texto", {
                  margemSeguraPercentual: Number(event.target.value) || 8,
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Tracking (em)
            </span>
            <input
              type="number"
              step={0.01}
              min={-0.12}
              max={0.08}
              value={configHero.texto.tracking}
              onChange={(event) =>
                atualizarSecao("texto", {
                  tracking: Number(event.target.value),
                  preset: "CUSTOMIZADO",
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Altura de linha
            </span>
            <input
              type="number"
              step={0.01}
              min={0.72}
              max={1.25}
              value={configHero.texto.lineHeight}
              onChange={(event) =>
                atualizarSecao("texto", {
                  lineHeight: Number(event.target.value),
                  preset: "CUSTOMIZADO",
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>

        <CampoToggle
          checked={configHero.texto.escalaAuto}
          label="Escala automática"
          description="Ajusta o texto expansivo com clamp responsivo para evitar overflow."
          className="mt-4"
          onChange={(checked) => atualizarSecao("texto", { escalaAuto: checked })}
        />
      </PainelSecao>

      <PainelSecao title="PNG frontal">
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-900">
            <p className="font-semibold">Recomendações para PNG com fundo transparente</p>
            <p className="mt-1">{recomendacao.desktop}</p>
            <p>{recomendacao.mobile}</p>
            <p className="mt-1 text-xs text-indigo-700">
              Use objeto dentro de safe area de aproximadamente 85%, sem cortar bordas importantes. WebP com alpha também é aceito.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <UploadMidiaCampo
              label="PNG desktop"
              value={configHero.png.imagemDesktop}
              tipoMidia="IMAGEM"
              onChange={(url) => atualizarSecao("png", { imagemDesktop: url })}
              orientacao={recomendacao.desktop}
            />
            <UploadMidiaCampo
              label="PNG mobile"
              value={configHero.png.imagemMobile}
              tipoMidia="IMAGEM"
              onChange={(url) => atualizarSecao("png", { imagemMobile: url })}
              orientacao={`${recomendacao.mobile} Opcional; vazio usa desktop.`}
            />
          </div>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Alt text
            </span>
            <input
              value={configHero.png.alt}
              onChange={(event) => atualizarSecao("png", { alt: event.target.value })}
              placeholder="Descrição do objeto em PNG"
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <VisualCropEditor
            label="Crop visual do PNG"
            value={createResponsiveMediaConfig({
              desktopUrl: configHero.png.imagemDesktop,
              mobileUrl: configHero.png.imagemMobile,
              alt: configHero.png.alt,
              aspectRatioDesktop: "1:1",
              aspectRatioMobile: "1:1",
              desktopPositionX: configHero.png.posicaoXDesktop,
              desktopPositionY: configHero.png.posicaoYDesktop,
              mobilePositionX: configHero.png.posicaoXMobile,
              mobilePositionY: configHero.png.posicaoYMobile,
              desktopZoom: configHero.png.escalaDesktop,
              mobileZoom: configHero.png.escalaMobile,
              minZoom: 20,
              maxZoom: 150,
            })}
            onChange={(media) =>
              atualizarSecao("png", {
                imagemDesktop: media.desktop.url || "",
                imagemMobile:
                  media.usarImagemMobileAlternativa && media.mobileUrl
                    ? media.mobileUrl
                    : "",
                alt: media.desktop.alt || media.mobile.alt || configHero.png.alt,
                posicaoXDesktop: media.desktop.positionX,
                posicaoYDesktop: media.desktop.positionY,
                escalaDesktop: media.desktop.zoom,
                posicaoXMobile: media.mobile.positionX,
                posicaoYMobile: media.mobile.positionY,
                escalaMobile: media.mobile.zoom,
              })
            }
            aspectRatioDesktop="1:1"
            aspectRatioMobile="1:1"
            contexto={
              configHero.variante === "TELA_CHEIA"
                ? "HERO_PNG_FULLSCREEN"
                : "HERO_PNG_COMPACTO"
            }
            minZoom={20}
            maxZoom={150}
          />

          <RangeControl
            label="Opacidade"
            value={configHero.png.opacidade}
            min={0}
            max={100}
            suffix="%"
            onChange={(opacidade) => atualizarSecao("png", { opacidade })}
          />

          <CampoToggle
            checked={configHero.png.sombra}
            label="Sombra editorial no PNG"
            onChange={(checked) => atualizarSecao("png", { sombra: checked })}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                atualizarSecao("png", {
                  imagemDesktop: "",
                  imagemMobile: "",
                })
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpar PNG
            </button>
          </div>
        </div>
      </PainelSecao>

      <PainelSecao title="Layout">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Variante de altura
            </span>
            <select
              value={configHero.variante}
              onChange={(event) =>
                aplicarConfig({
                  variante: event.target.value as HeroEditorialPngConfig["variante"],
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              {HERO_VARIANTE_PRESETS.map((preset) => (
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
            <input
              type="color"
              value={configHero.fundo.cor}
              onChange={(event) =>
                atualizarSecao("fundo", { cor: event.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Comportamento mobile
            </span>
            <select
              value={configHero.responsivo.comportamentoMobile}
              onChange={(event) =>
                atualizarSecao("responsivo", {
                  comportamentoMobile: event.target.value as HeroEditorialPngConfig["responsivo"]["comportamentoMobile"],
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              <option value="COMPACTAR">Compactar composição</option>
              <option value="CENTRALIZAR">Centralizar camadas</option>
              <option value="EMPILHAR">Empilhar visualmente</option>
            </select>
          </label>
        </div>
      </PainelSecao>

      <PainelSecao title="Animação">
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Entrada do texto
            </span>
            <select
              value={configHero.animacao.entradaTexto}
              onChange={(event) =>
                atualizarSecao("animacao", {
                  entradaTexto: event.target.value as HeroEditorialPngConfig["animacao"]["entradaTexto"],
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              {HERO_ENTRADA_TEXTO_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Entrada do PNG
            </span>
            <select
              value={configHero.animacao.entradaPng}
              onChange={(event) =>
                atualizarSecao("animacao", {
                  entradaPng: event.target.value as HeroEditorialPngConfig["animacao"]["entradaPng"],
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              {HERO_ENTRADA_PNG_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Hover
            </span>
            <select
              value={configHero.animacao.hover}
              onChange={(event) =>
                atualizarSecao("animacao", {
                  hover: event.target.value as HeroEditorialPngConfig["animacao"]["hover"],
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            >
              {HERO_HOVER_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PainelSecao>

      <PainelSecao title="Avançado">
        <button
          type="button"
          onClick={() =>
            onChange({
              bloco: {
                ...estado.bloco,
                configJson: HERO_EDITORIAL_PNG_DEFAULT,
              },
            })
          }
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Restaurar padrão do bloco
        </button>
      </PainelSecao>
    </div>
  );
}

function TextoImagemEditor({
  estado,
  selectedContext,
  onChange,
}: {
  estado: NonNullable<BlocoEditandoState>;
  selectedContext: EditorSelectionContext;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
}) {
  const cropContext = getTextoImagemCropContext(estado);
  const recommendedSize = getRecommendedMediaSize(cropContext);
  const aspectRatioDesktop = getTextoImagemAspectRatio(estado, "DESKTOP");
  const aspectRatioMobile = getTextoImagemAspectRatio(estado, "MOBILE");

  function updateVideoCrop(device: "DESKTOP" | "MOBILE", data: {
    focoX: number;
    focoY: number;
    zoom: number;
  }) {
    const position = getMediaObjectPosition(data.focoX, data.focoY);

    if (device === "DESKTOP") {
      onChange({
        mediaCropDesktopX: data.focoX,
        mediaCropDesktopY: data.focoY,
        mediaZoomDesktop: data.zoom,
        mediaPositionDesktop: position,
      });
      return;
    }

    onChange({
      mediaCropMobileX: data.focoX,
      mediaCropMobileY: data.focoY,
      mediaZoomMobile: data.zoom,
      mediaPositionMobile: position,
    });
  }

  return (
    <div className="space-y-5 px-6 py-5">
      <SecaoRecolhivel
        title="Conteúdo"
        description="Título, texto e visibilidade. O canvas também permite editar texto diretamente."
        defaultOpen={selectedContext === "BLOCO" || selectedContext === "TEXTO"}
      >
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Nome interno
          </span>
          <input
            value={estado.nomeInterno}
            onChange={(event) => onChange({ nomeInterno: event.target.value })}
            placeholder="Ex: Texto institucional com imagem"
            className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <CampoToggle
            checked={estado.mostrarTitulo}
            label="Mostrar título"
            onChange={(checked) => onChange({ mostrarTitulo: checked })}
          />
          <CampoToggle
            checked={estado.exibirSubtitulo}
            label="Mostrar texto"
            onChange={(checked) => onChange({ exibirSubtitulo: checked })}
          />
          <CampoToggle
            checked={estado.exibirBotao}
            label="Mostrar botão"
            onChange={(checked) => onChange({ exibirBotao: checked })}
          />
        </div>

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

      <SecaoRecolhivel
        title="Layout"
        description="Controle posição da mídia, sangria e altura do bloco."
        defaultOpen={selectedContext === "BLOCO" || selectedContext === "DESIGN"}
      >
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
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
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
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
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
              Mídia desktop
            </span>
            <select
              value={estado.larguraMidiaDesktop}
              onChange={(event) =>
                onChange({
                  larguraMidiaDesktop: normalizarLarguraMidiaTextoImagem(
                    event.target.value
                  ),
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
            >
              {LARGURA_MIDIA_TEXTO_IMAGEM_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Mídia mobile
            </span>
            <select
              value={estado.larguraMidiaMobile}
              onChange={(event) =>
                onChange({
                  larguraMidiaMobile: normalizarLarguraMidiaTextoImagem(
                    event.target.value
                  ),
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
            >
              {LARGURA_MIDIA_TEXTO_IMAGEM_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Altura do bloco
            </span>
            <select
              value={estado.alturaBlocoTextoImagem}
              onChange={(event) =>
                onChange({
                  alturaBlocoTextoImagem: normalizarAlturaBlocoTextoImagem(
                    event.target.value
                  ),
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
            >
              {ALTURA_BLOCO_TEXTO_IMAGEM_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Alinhamento vertical
            </span>
            <select
              value={estado.alinhamentoVertical}
              onChange={(event) =>
                onChange({ alinhamentoVertical: event.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
            >
              {ALINHAMENTO_VERTICAL_BANNER_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <RangeControl
          label="Espaço entre imagem e texto"
          value={estado.gapTextoImagem}
          min={0}
          max={96}
          suffix="px"
          onChange={(gapTextoImagem) => onChange({ gapTextoImagem })}
        />
      </SecaoRecolhivel>

      <SecaoRecolhivel
        title="Imagem / crop"
        description="Ajuste imagem desktop/mobile, alt text, foco e zoom vendo o corte."
        defaultOpen={selectedContext === "IMAGEM"}
      >
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
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
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
              orientacao="Desktop recomendado: 1400 x 1800 px ou maior."
            />
            <UploadMidiaCampo
              label="Imagem mobile URL"
              value={estado.imagemMobileUrl}
              tipoMidia="IMAGEM"
              onChange={(url) => onChange({ imagemMobileUrl: url })}
              orientacao="Opcional. Mobile recomendado: 1080 x 1350 px."
            />
          </div>
        )}

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Alt text da imagem
          </span>
          <input
            value={estado.imagemAlt}
            onChange={(event) => onChange({ imagemAlt: event.target.value })}
            placeholder="Descrição curta da imagem"
            className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
          />
        </label>

        {estado.tipoMidia === "VIDEO" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <VisualCropControl
              label="Crop desktop"
              imageUrl={estado.imagemDesktopUrl}
              videoUrl={estado.videoDesktopUrl}
              posterUrl={estado.videoPosterUrl}
              tipoMidia={estado.tipoMidia}
              focoX={estado.mediaCropDesktopX}
              focoY={estado.mediaCropDesktopY}
              zoom={estado.mediaZoomDesktop}
              onChange={(data) => updateVideoCrop("DESKTOP", data)}
            />
            <VisualCropControl
              label="Crop mobile"
              imageUrl={estado.imagemMobileUrl || estado.imagemDesktopUrl}
              videoUrl={estado.videoMobileUrl || estado.videoDesktopUrl}
              posterUrl={estado.videoPosterUrl}
              tipoMidia={estado.tipoMidia}
              focoX={estado.mediaCropMobileX}
              focoY={estado.mediaCropMobileY}
              zoom={estado.mediaZoomMobile}
              aspectClass="aspect-[4/5]"
              onChange={(data) => updateVideoCrop("MOBILE", data)}
            />
          </div>
        ) : (
          <div>
            <VisualCropEditor
              label="Crop visual"
              value={getResponsiveMediaFromEstado({
                estado,
                aspectRatioDesktop,
                aspectRatioMobile,
              })}
              onChange={(media) => onChange(getEstadoPatchFromResponsiveMedia(media))}
              aspectRatioDesktop={aspectRatioDesktop}
              aspectRatioMobile={aspectRatioMobile}
              recommendedSizeDesktop={recommendedSize.desktop}
              recommendedSizeMobile={recommendedSize.mobile}
              contexto={cropContext}
              allowMobileAlternative={estado.tipoMidia !== "VIDEO"}
            />
          </div>
        )}
      </SecaoRecolhivel>

      <SecaoRecolhivel
        title="Texto"
        description="Tipografia, cor, alinhamento, line-height e respiro."
        defaultOpen={selectedContext === "TEXTO"}
      >
        <ResponsiveTextAlignControls
          desktopValue={estado.alinhamentoTextoDesktop}
          mobileValue={estado.alinhamentoTextoMobile}
          onChange={onChange}
        />
        <TextoImagemStyleControls
          label="Título"
          value={estado.tituloStyle}
          onChange={(tituloStyle) => onChange({ tituloStyle })}
        />
        <TextoImagemStyleControls
          label="Texto"
          value={estado.textoStyle}
          onChange={(textoStyle) => onChange({ textoStyle })}
        />
      </SecaoRecolhivel>

      <SecaoRecolhivel
        title="Botão"
        description="Texto, link, estilo e tipografia do CTA."
        defaultOpen={selectedContext === "BOTAO"}
      >
        <CampoToggle
          checked={estado.exibirBotao}
          label="Exibir botão"
          onChange={(checked) => onChange({ exibirBotao: checked })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Texto do botão
            </span>
            <input
              value={estado.textoBotao}
              onChange={(event) => onChange({ textoBotao: event.target.value })}
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
              onChange={(event) => onChange({ linkBotao: event.target.value })}
              placeholder="/loja/quem-somos"
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>
        <ButtonRadiusControl
          value={estado.estiloBordaBotao}
          onChange={(estiloBordaBotao) => onChange({ estiloBordaBotao })}
        />
        <TextoImagemStyleControls
          label="Tipografia do botão"
          value={estado.botaoStyle}
          onChange={(botaoStyle) => onChange({ botaoStyle })}
        />
      </SecaoRecolhivel>

      <SecaoRecolhivel
        title="Design"
        description="Fundo, espaçamento e raio da imagem contida."
        defaultOpen={selectedContext === "DESIGN"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Cor de fundo
            </span>
            <select
              value={estado.corFundo}
              onChange={(event) => onChange({ corFundo: event.target.value })}
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
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
              Espaçamento externo
            </span>
            <select
              value={estado.espacamento}
              onChange={(event) => onChange({ espacamento: event.target.value })}
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
            >
              {ESPACAMENTO_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <RangeControl
          label="Raio da imagem contida"
          value={estado.raioImagemTextoImagem}
          min={0}
          max={48}
          suffix="px"
          onChange={(raioImagemTextoImagem) =>
            onChange({ raioImagemTextoImagem })
          }
        />
      </SecaoRecolhivel>
    </div>
  );
}

function EditorConteudoBlocoModal({
  estado,
  pagina,
  categoriasDisponiveis,
  paginasDisponiveis,
  produtosDisponiveis,
  colecoesInteligentes,
  campanhasDisponiveis,
  selectedContext,
  selectedGalleryItemId,
  onChange,
  onClose,
  onSave,
  salvando,
}: {
  estado: BlocoEditandoState;
  pagina: EditorVisualPagina;
  categoriasDisponiveis: EditorVisualCategoria[];
  paginasDisponiveis: EditorVisualPaginaLink[];
  produtosDisponiveis: EditorVisualProduto[];
  colecoesInteligentes: EditorVisualColecaoInteligente[];
  campanhasDisponiveis: EditorVisualCampanhaComercial[];
  selectedContext: EditorSelectionContext;
  selectedGalleryItemId?: string;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
  onClose: () => void;
  onSave: () => void;
  salvando: boolean;
}) {
  const [buscaProdutoManual, setBuscaProdutoManual] = useState("");
  const [abaBannerAtiva, setAbaBannerAtiva] =
    useState<BannerEditorAba>("CONTEUDO");
  const [bannerStudioElement, setBannerStudioElement] =
    useState<BannerStudioElement>("MODELO");
  const [bannerStudioDevice, setBannerStudioDevice] =
    useState<BannerDevicePreview>("DESKTOP");

  if (!estado) {
    return null;
  }

  const estadoAtual = estado;
  const isBanner = isBannerTipo(estado.bloco.tipo);
  const isTextoImagem = isTextoImagemTipo(estado.bloco.tipo);
  const isListaProdutos = isListaProdutosTipo(estado.bloco.tipo);
  const isDestaquesCards = isDestaquesCardsTipo(estado.bloco.tipo);
  const isColecoesCategorias = isColecoesCategoriasTipo(estado.bloco.tipo);
  const isHeroEditorialPng = isHeroEditorialPngTipo(estado.bloco.tipo);
  const isGaleriaEditorial = isGaleriaEditorialTipo(estado.bloco.tipo);
  const isVitrineEditorial = isVitrineEditorialTipo(estado.bloco.tipo);
  const isCta = isCtaTipo(estado.bloco.tipo);
  const modeloBannerInfo = getBannerModeloEditorInfo(estado.modeloBanner);
  const modeloBannerAceitaProdutos =
    estado.modeloBanner === "PRODUTOS_FLUTUANTES";
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

  function selecionarColecaoInteligente(colecaoId: string) {
    const colecao = colecoesInteligentes.find((item) => item.id === colecaoId);

    onChange({
      colecaoInteligenteId: colecao?.id || "",
      colecaoInteligenteSlug: colecao?.slug || "",
      colecaoInteligenteNome: colecao?.nome || "",
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
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-[2rem] bg-white shadow-2xl ${
          isBanner ||
          isTextoImagem ||
          isHeroEditorialPng ||
          isGaleriaEditorial ||
          isVitrineEditorial
            ? "max-w-[min(96vw,1760px)]"
            : "max-w-3xl"
        }`}
      >
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
                      : isColecoesCategorias
                        ? "Configure mosaicos editoriais com coleções, categorias, mídia e links."
                        : isHeroEditorialPng
                          ? "Configure texto gigante, PNG frontal, variações responsivas, CTA e animações sutis."
                          : isGaleriaEditorial
                            ? "Configure imagens editoriais full bleed, fontes dinâmicas, texto, botões e hover."
                            : isVitrineEditorial
                              ? "Configure imagens grandes com links para categorias, páginas ou campanhas."
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
          <>
            <BannerStudioEditor
              estado={estado}
              produtosDisponiveis={produtosDisponiveis}
              buscaProdutoManual={buscaProdutoManual}
              produtosFiltradosManual={produtosFiltradosManual}
              selectedElement={bannerStudioElement}
              device={bannerStudioDevice}
              onClose={onClose}
              onSave={onSave}
              salvando={salvando}
              onChange={onChange}
              onSelectedElementChange={setBannerStudioElement}
              onDeviceChange={setBannerStudioDevice}
              onBuscaProdutoManualChange={setBuscaProdutoManual}
              adicionarProdutoManual={adicionarProdutoManual}
              removerProdutoManual={removerProdutoManual}
              moverProdutoManual={moverProdutoManual}
            />

          <div className="hidden">
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

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Modelo do banner
                </span>

                <select
                  value={estado.modeloBanner}
                  onChange={(event) => {
                    const modeloBanner = event.target.value;

                    onChange({
                      modeloBanner,
                      ...(modeloBanner === "HERO_TELA_CHEIA"
                        ? { alturaBanner: "TELA_CHEIA" }
                        : modeloBanner === "FAIXA_PROMOCIONAL"
                          ? { alturaBanner: "COMPACTA" }
                          : {}),
                      ...(modeloBanner === "PRODUTOS_FLUTUANTES"
                        ? { produtosFlutuantesAtivos: true }
                        : {}),
                    });
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                >
                  {MODELO_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <p className="mt-3 text-xs font-medium text-slate-500">
                Medidas recomendadas: {modeloBannerInfo.medidas}
              </p>
            </div>

            <div className="rounded-3xl bg-slate-950/5 p-1">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
                {ABAS_BANNER_EDITOR.map((aba) => (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setAbaBannerAtiva(aba.id)}
                    className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                      abaBannerAtiva === aba.id
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:bg-white/70"
                    }`}
                  >
                    {aba.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={
                abaBannerAtiva === "CONTEUDO"
                  ? "grid gap-3 md:grid-cols-2"
                  : "hidden"
              }
            >
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
              className={abaBannerAtiva === "CONTEUDO" ? "" : "hidden"}
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

            <label className={abaBannerAtiva === "IMAGENS" ? "" : "hidden"}>
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
              className={abaBannerAtiva === "IMAGENS" ? "" : "hidden"}
              onChange={(checked) => onChange({ exibirMidia: checked })}
            />

            {estado.tipoMidia === "VIDEO" ? (
              <div
                className={
                  abaBannerAtiva === "IMAGENS" ? "space-y-4" : "hidden"
                }
              >
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
              <div
                className={
                  abaBannerAtiva === "IMAGENS"
                    ? "grid gap-4 md:grid-cols-2"
                    : "hidden"
                }
              >
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

            <div className={abaBannerAtiva === "IMAGENS" ? "" : "hidden"}>
              <CropPositionControls
                desktopValue={estado.mediaPositionDesktop}
                mobileValue={estado.mediaPositionMobile}
                onChange={onChange}
              />
            </div>

            <div className={abaBannerAtiva === "DESIGN" ? "" : "hidden"}>
              <ResponsiveTextAlignControls
                desktopValue={estado.alinhamentoTextoDesktop}
                mobileValue={estado.alinhamentoTextoMobile}
                onChange={onChange}
              />
            </div>

            <div
              className={
                abaBannerAtiva === "CONTEUDO"
                  ? "grid gap-4 md:grid-cols-2"
                  : "hidden"
              }
            >
              <ButtonRadiusControl
                value={estado.estiloBordaBotao}
                onChange={(value) => onChange({ estiloBordaBotao: value })}
              />

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

            <div
              className={
                abaBannerAtiva === "CONTEUDO"
                  ? "grid gap-4 md:grid-cols-2"
                  : "hidden"
              }
            >
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

            <div
              className={
                abaBannerAtiva === "DESIGN"
                  ? "grid gap-4 md:grid-cols-2"
                  : "hidden"
              }
            >
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
                  Largura
                </span>

                <select
                  value={estado.larguraBanner}
                  onChange={(event) =>
                    onChange({ larguraBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {LARGURA_BANNER_PRESETS.map((preset) => (
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

            <div
              className={
                abaBannerAtiva === "PRODUTOS" ? "space-y-4" : "hidden"
              }
            >
              {modeloBannerAceitaProdutos ? (
                <>
                  <CampoToggle
                    checked={estado.produtosFlutuantesAtivos}
                    label="Exibir produtos flutuantes"
                    description="Mostra cards editoriais sobre a imagem do banner."
                    onChange={(checked) =>
                      onChange({ produtosFlutuantesAtivos: checked })
                    }
                  />

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
                                  onClick={() => moverProdutoManual(produtoId, "UP")}
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
                                  onClick={() => removerProdutoManual(produtoId)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700"
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
                            Selecione até 3 produtos para compor o banner.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-500">
                  Produtos flutuantes ficam disponíveis no modelo “Banner com
                  produtos flutuantes”.
                </div>
              )}
            </div>

            <div
              className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 ${
                abaBannerAtiva === "AVANCADO" ? "" : "hidden"
              }`}
            >
              Crop ainda não está ativo nesta etapa. Para vídeo, prefira MP4
              com codec H.264 para maior compatibilidade.
            </div>
          </div>
          </>
        ) : isTextoImagem ? (
          <TextoImagemEditor
            estado={estado}
            selectedContext={selectedContext}
            onChange={onChange}
          />
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

                <ButtonRadiusControl
                  value={estado.estiloBordaBotao}
                  onChange={(value) => onChange({ estiloBordaBotao: value })}
                />
              </div>

              <div className="mt-4">
                <ResponsiveTextAlignControls
                  desktopValue={estado.alinhamentoTextoDesktop}
                  mobileValue={estado.alinhamentoTextoMobile}
                  onChange={onChange}
                />
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
        ) : isHeroEditorialPng ? (
          <HeroEditorialPngEditor
            estado={estado}
            categoriasDisponiveis={categoriasDisponiveis}
            paginasDisponiveis={paginasDisponiveis}
            produtosDisponiveis={produtosDisponiveis}
            colecoesInteligentes={colecoesInteligentes}
            onChange={onChange}
          />
        ) : isGaleriaEditorial ? (
          <GaleriaEditorialEditor
            estado={estado}
            categoriasDisponiveis={categoriasDisponiveis}
            paginasDisponiveis={paginasDisponiveis}
            produtosDisponiveis={produtosDisponiveis}
            colecoesInteligentes={colecoesInteligentes}
            campanhasDisponiveis={campanhasDisponiveis}
            selectedItemId={selectedGalleryItemId}
            onChange={onChange}
          />
        ) : isVitrineEditorial ? (
          <VitrineEditorialEditor
            estado={estado}
            categoriasDisponiveis={categoriasDisponiveis}
            paginasDisponiveis={paginasDisponiveis}
            onChange={onChange}
          />
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
              {pagina.tipo === "CATEGORIA" && pagina.categoriaNome && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800 md:col-span-2">
                  Categoria fixa: este editor está vinculado a{" "}
                  <strong>{pagina.categoriaNome}</strong>. A seleção manual e a
                  renderização pública usam somente produtos desta categoria e
                  de suas subcategorias.
                </div>
              )}

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

            <PainelSecao title="Carrossel">
              <div className="space-y-4">
                <CampoToggle
                  checked={estado.exibirSetasCarrossel}
                  label="Exibir setas no carrossel"
                  description="As setas aparecem apenas quando desktop ou mobile está em modo carrossel."
                  onChange={(checked) =>
                    onChange({ exibirSetasCarrossel: checked })
                  }
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Posição
                    </span>
                    <select
                      value={estado.posicaoSetasCarrossel}
                      onChange={(event) =>
                        onChange({ posicaoSetasCarrossel: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {POSICAO_SETAS_CARROSSEL_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Estilo
                    </span>
                    <select
                      value={estado.estiloSetasCarrossel}
                      onChange={(event) =>
                        onChange({ estiloSetasCarrossel: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {ESTILO_SETAS_CARROSSEL_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Navegar por
                    </span>
                    <select
                      value={estado.navegarPor}
                      onChange={(event) =>
                        onChange({ navegarPor: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {NAVEGAR_POR_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </PainelSecao>

            <ResponsiveTextAlignControls
              desktopValue={estado.alinhamentoTextoDesktop}
              mobileValue={estado.alinhamentoTextoMobile}
              onChange={onChange}
            />

            {(estado.fonteProdutos === "CATEGORIA" ||
              estado.fonteProdutos === "CATEGORIAS_SELECIONADAS" ||
              estado.fonteProdutos === "COLECAO_INTELIGENTE" ||
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

                {estado.fonteProdutos === "COLECAO_INTELIGENTE" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label>
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Colecao inteligente ativa
                        </span>
                        <select
                          value={estado.colecaoInteligenteId}
                          onChange={(event) =>
                            selecionarColecaoInteligente(event.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                        >
                          <option value="">Selecione uma colecao</option>
                          {colecoesInteligentes
                            .filter((colecao) => colecao.status === "ATIVA")
                            .map((colecao) => (
                              <option key={colecao.id} value={colecao.id}>
                                {colecao.nome} ({colecao.produtosAprovados})
                              </option>
                            ))}
                        </select>
                      </label>

                      <label>
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Ordem
                        </span>
                        <select
                          value={estado.ordenacaoColecao}
                          onChange={(event) =>
                            onChange({ ordenacaoColecao: event.target.value })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                        >
                          {ORDENACAO_COLECAO_PRESETS.map((preset) => (
                            <option key={preset.value} value={preset.value}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <CampoToggle
                      checked={estado.incluirSugeridosColecao}
                      label="Incluir produtos sugeridos"
                      description="Por padrao, a loja usa apenas produtos aprovados em colecoes ativas."
                      onChange={(checked) =>
                        onChange({ incluirSugeridosColecao: checked })
                      }
                    />

                    {colecoesInteligentes.filter(
                      (colecao) => colecao.status === "ATIVA"
                    ).length === 0 && (
                      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        Nenhuma colecao ativa disponivel. Gere, aprove produtos
                        e ative uma colecao antes de publicar este bloco.
                      </p>
                    )}
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

            <ResponsiveTextAlignControls
              desktopValue={estado.alinhamentoTextoDesktop}
              mobileValue={estado.alinhamentoTextoMobile}
              onChange={onChange}
            />

            <ButtonRadiusControl
              value={estado.estiloBordaBotao}
              onChange={(value) => onChange({ estiloBordaBotao: value })}
            />

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
        ) : isColecoesCategorias ? (
          <ColecoesCategoriasModalFields
            estado={estado}
            categoriasDisponiveis={categoriasDisponiveis}
            onChange={onChange}
          />
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
              Use este painel para ajustar o conteúdo essencial do bloco dentro
              do editor visual.
            </div>
          </div>
        )}

        {!isBanner && (
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
        )}
      </div>
    </div>
  );
}

function DadosSeoPaginaModal({
  aberto,
  form,
  onChange,
  onClose,
  onSave,
  salvando,
}: {
  aberto: boolean;
  form: DadosSeoPaginaForm;
  onChange: (campo: keyof DadosSeoPaginaForm, valor: string) => void;
  onClose: () => void;
  onSave: () => void;
  salvando: boolean;
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Dados/SEO
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              Dados de busca da pÃ¡gina
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto px-6 py-5">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              TÃ­tulo SEO
            </span>

            <input
              value={form.seoTitle}
              onChange={(event) => onChange("seoTitle", event.target.value)}
              placeholder="TÃ­tulo exibido em compartilhamentos e resultados"
              className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              DescriÃ§Ã£o SEO
            </span>

            <textarea
              value={form.seoDescription}
              onChange={(event) =>
                onChange("seoDescription", event.target.value)
              }
              rows={3}
              placeholder="Resumo editorial da pÃ¡gina"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Termos de busca
            </span>

            <textarea
              value={form.termosBusca}
              onChange={(event) => onChange("termosBusca", event.target.value)}
              rows={4}
              placeholder="dia dos namorados, presente romÃ¢ntico, nova coleÃ§Ã£o"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
            />

            <span className="mt-2 block text-xs leading-5 text-slate-500">
              Ajuda a busca interna a encontrar esta pÃ¡gina por campanhas,
              ocasiÃµes e temas.
            </span>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            Esses termos sÃ£o usados pela busca interna e organizaÃ§Ã£o
            editorial. Eles nÃ£o criam meta keywords nem tags visÃ­veis
            automaticamente na loja.
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar Dados/SEO"}
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

                  {item.preview}
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
  paginasDisponiveis,
  produtosDisponiveis,
  colecoesInteligentes,
  campanhasDisponiveis,
}: EditorVisualPaginaClientProps) {
  const [isPending] = useTransition();
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ordemSalvando, setOrdemSalvando] = useState(false);
  const [editando, setEditando] = useState<BlocoEditandoState>(null);
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [modalDadosSeoAberto, setModalDadosSeoAberto] = useState(false);
  const [dadosSeoSalvando, setDadosSeoSalvando] = useState(false);
  const [dadosSeoForm, setDadosSeoForm] = useState<DadosSeoPaginaForm>(() => ({
    seoTitle: pagina.seoTitle || "",
    seoDescription: pagina.seoDescription || "",
    termosBusca: pagina.termosBusca || "",
  }));
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
  const [painelAberto, setPainelAberto] = useState(true);
  const [modoPreviewPublico, setModoPreviewPublico] = useState(false);
  const [selectionContext, setSelectionContext] =
    useState<EditorSelectionContext>("BLOCO");
  const [selectedGalleryItemId, setSelectedGalleryItemId] = useState("");
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const blocoSelecionado =
    blocosOrdenados.find((bloco) => bloco.id === blocoSelecionadoId) || null;
  const previewStudioMode = modoPreviewPublico ? "visualizar" : "1";
  const previewIframeSrc = `/loja/preview/pagina/${pagina.id}?studio=${previewStudioMode}`;

  function selecionarBloco(
    blocoId: string,
    context: EditorSelectionContext = "BLOCO",
    itemId = ""
  ) {
    setBlocoSelecionadoId(blocoId);
    setSelectionContext(context);
    setSelectedGalleryItemId(itemId);
    setModoPreviewPublico(false);
  }

  function alternarPreviewPublico() {
    setModoPreviewPublico((current) => {
      const next = !current;

      if (next) {
        setPainelAberto(false);
      }

      return next;
    });
  }

  const enviarDraftParaPreview = useCallback(() => {
    previewIframeRef.current?.contentWindow?.postMessage(
      {
        type: "STELLA_BUILDER_STUDIO_DRAFT",
        pageId: pagina.id,
        blocos: blocosOrdenados,
        selectedBlockId: blocoSelecionadoId,
      },
      window.location.origin
    );
  }, [blocoSelecionadoId, blocosOrdenados, pagina.id]);

  useEffect(() => {
    if (modoPreviewPublico) return;

    enviarDraftParaPreview();
  }, [enviarDraftParaPreview, modoPreviewPublico]);

  useEffect(() => {
    function handlePreviewMessage(
      event: MessageEvent<{
      type?: string;
      pageId?: string;
      blockId?: string;
      context?: EditorSelectionContext;
      itemId?: string;
      field?: string;
      value?: string;
      richText?: RichTextValue | null;
      }>
    ) {
      if (event.origin !== window.location.origin) return;

      const data = event.data;

      if (!data || data.pageId !== pagina.id) return;

      if (data.type === "STELLA_BUILDER_STUDIO_READY") {
        enviarDraftParaPreview();
        return;
      }

      if (
        data.type === "STELLA_BUILDER_STUDIO_SELECT" &&
        data.blockId
      ) {
        selecionarBloco(data.blockId, data.context || "BLOCO", data.itemId || "");
        setPainelAberto(true);
      }

      if (
        data.type === "STELLA_BUILDER_STUDIO_INLINE_UPDATE" &&
        data.blockId &&
        typeof data.field === "string" &&
        typeof data.value === "string"
      ) {
        const richTextPatch = data.richText ? data.richText : null;
        const buildPatch = (config: Record<string, unknown>) => {
          if (data.field === "titulo") {
            return {
              titulo: data.value,
              ...(richTextPatch ? { tituloRichText: richTextPatch } : {}),
            };
          }

          if (data.field === "texto") {
            return {
              texto: data.value,
              descricao: data.value,
              conteudo: data.value,
              ...(richTextPatch
                ? {
                    textoRichText: richTextPatch,
                    subtituloRichText: richTextPatch,
                  }
                : {}),
            };
          }

          if (data.field === "subtitulo") {
            return {
              subtitulo: data.value,
              texto: data.value,
              descricao: data.value,
              ...(richTextPatch
                ? {
                    subtituloRichText: richTextPatch,
                    textoRichText: richTextPatch,
                  }
                : {}),
            };
          }

          if (data.field === "textoBotao") {
            return { textoBotao: data.value, botaoTexto: data.value };
          }

          if (data.field === "textoBotaoSecundario") {
            return {
              textoBotaoSecundario: data.value,
              botaoSecundarioTexto: data.value,
            };
          }

          if (data.field === "heroTexto") {
            return {
              texto: {
                ...getConfigObject(config.texto),
                conteudo: data.value,
              },
              titulo: data.value,
            };
          }

          if (data.field === "heroCtaLabel") {
            return {
              cta: {
                ...getConfigObject(config.cta),
                label: data.value,
              },
            };
          }

          if (data.field === "heroCtaTitulo") {
            return {
              cta: {
                ...getConfigObject(config.cta),
                titulo: data.value,
              },
            };
          }

          if (data.field === "heroCtaTextoBotao") {
            return {
              cta: {
                ...getConfigObject(config.cta),
                textoBotao: data.value,
              },
              textoBotao: data.value,
            };
          }

          if (
            (data.field === "vitrineLabel" ||
              data.field === "vitrineTextoBotao") &&
            data.itemId &&
            Array.isArray(config.itens)
          ) {
            return {
              itens: config.itens.map((item) => {
                const itemConfig = getConfigObject(item);

                if (itemConfig.id !== data.itemId) return item;

                return {
                  ...itemConfig,
                  ...(data.field === "vitrineLabel"
                    ? { label: data.value, titulo: data.value }
                    : { textoBotao: data.value, textoLink: data.value }),
                };
              }),
            };
          }

          return null;
        };
        const inlineFieldSupported = [
          "titulo",
          "texto",
          "subtitulo",
          "textoBotao",
          "textoBotaoSecundario",
          "heroTexto",
          "heroCtaLabel",
          "heroCtaTitulo",
          "heroCtaTextoBotao",
          "vitrineLabel",
          "vitrineTextoBotao",
        ].includes(data.field);

        if (inlineFieldSupported) {
          const inlineValue = data.value;
          const inlineBlockId = data.blockId;

          setSucesso("");
          setBlocosComTextoPendente((current) =>
            current.includes(inlineBlockId) ? current : [...current, inlineBlockId]
          );
          setBlocosEditor((current) =>
            current.map((bloco) =>
              bloco.id === inlineBlockId
                ? {
                    ...bloco,
                    configJson: {
                      ...getConfigObject(bloco.configJson),
                      ...(buildPatch(getConfigObject(bloco.configJson)) || {}),
                    },
                  }
                : bloco
            )
          );
          setEditando((current) => {
            if (!current || current.bloco.id !== inlineBlockId) return current;

            if (data.field === "titulo") {
              return { ...current, titulo: inlineValue };
            }

            if (data.field === "texto") {
              return { ...current, texto: inlineValue };
            }

            if (data.field === "textoBotao") {
              return { ...current, textoBotao: inlineValue };
            }

            return current;
          });
        }
      }
    }

    window.addEventListener("message", handlePreviewMessage);

    return () => window.removeEventListener("message", handlePreviewMessage);
  }, [enviarDraftParaPreview, pagina.id]);

  function getBlocoEditorAtual(blocoId: string) {
    return blocosEditor.find((bloco) => bloco.id === blocoId) || null;
  }

  function atualizarDadosSeoForm(
    campo: keyof DadosSeoPaginaForm,
    valor: string
  ) {
    setDadosSeoForm((current) => ({
      ...current,
      [campo]: valor,
    }));
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

  function marcarAlteracaoPendente(blocoId: string) {
    setBlocosComTextoPendente((current) =>
      current.includes(blocoId) ? current : [...current, blocoId]
    );
  }

  function marcarTextoPendente(blocoId: string) {
    marcarAlteracaoPendente(blocoId);
  }

  function atualizarConfigBlocoDraft(
    blocoId: string,
    configJson: Record<string, unknown>
  ) {
    marcarAlteracaoPendente(blocoId);
    setSucesso("");
    setBlocosEditor((current) =>
      current.map((bloco) =>
        bloco.id === blocoId
          ? {
              ...bloco,
              configJson,
            }
          : bloco
      )
    );
  }

  function atualizarTextoInline(
    blocoId: string,
    patch: Record<string, unknown>
  ) {
    const blocoAtual = getBlocoEditorAtual(blocoId);

    if (!blocoAtual) return;

    atualizarConfigBlocoDraft(blocoId, {
      ...getConfigObject(blocoAtual.configJson),
      ...patch,
    });
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

  function atualizarColecaoItemInline(
    blocoId: string,
    itemId: string,
    patch: Partial<ColecaoCategoriaItemEditando>
  ) {
    marcarTextoPendente(blocoId);
    setBlocosEditor((current) =>
      current.map((bloco) => {
        if (bloco.id !== blocoId) return bloco;

        const config = getConfigObject(bloco.configJson);
        const itens = getItensColecoesConfig(config).map((item) =>
          item.id === itemId ? { ...item, ...patch } : item
        );

        return {
          ...bloco,
          configJson: {
            ...config,
            itens,
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
      setSelectionContext("BLOCO");
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

  async function salvarDadosSeoPagina() {
    setErro("");
    setSucesso("");
    setDadosSeoSalvando(true);

    try {
      const response = await fetch(`/api/configuracoes/loja/paginas/${pagina.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seoTitle: dadosSeoForm.seoTitle.trim() || null,
          seoDescription: dadosSeoForm.seoDescription.trim() || null,
          termosBusca: dadosSeoForm.termosBusca.trim() || null,
        }),
      });

      const result = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(result.error || result.message || "Erro ao salvar Dados/SEO.");
        return;
      }

      const paginaAtualizada = result.pagina || {};
      setDadosSeoForm({
        seoTitle: paginaAtualizada.seoTitle || "",
        seoDescription: paginaAtualizada.seoDescription || "",
        termosBusca: paginaAtualizada.termosBusca || "",
      });
      setModalDadosSeoAberto(false);
      setSucesso("Dados/SEO da pÃ¡gina salvos.");
    } catch {
      setErro("Erro ao salvar Dados/SEO.");
    } finally {
      setDadosSeoSalvando(false);
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
        selecionarBloco(novoBloco.id, "BLOCO");
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
      alturaBlocoTextoImagem: normalizarAlturaBlocoTextoImagem(
        getStringConfig(config, "alturaBloco")
      ),
      gapTextoImagem: getNumberConfig(config, "gapTextoImagem", 48),
      raioImagemTextoImagem: getNumberConfig(config, "raioImagem", 2),
      imagemAlt: getStringConfig(config, "imagemAlt"),
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
      colecaoInteligenteId: getStringConfig(config, "colecaoInteligenteId"),
      colecaoInteligenteSlug: getStringConfig(config, "colecaoInteligenteSlug"),
      colecaoInteligenteNome: getStringConfig(config, "colecaoInteligenteNome"),
      ordenacaoColecao:
        getStringConfig(config, "ordenacaoColecao") || "ORDEM_APROVADA",
      incluirSugeridosColecao: getBooleanConfig(
        config,
        "incluirSugeridosColecao",
        false
      ),
      limiteProdutos: getNumberConfig(config, "limite", 8),
      layoutDesktopProdutos:
        getStringConfig(config, "layoutDesktop") ||
        getStringConfig(config, "modo") ||
        "GRID",
      layoutMobileProdutos: getStringConfig(config, "layoutMobile") || "GRID",
      exibirSetasCarrossel: getBooleanConfig(
        config,
        "exibirSetasCarrossel",
        true
      ),
      posicaoSetasCarrossel:
        getStringConfig(config, "posicaoSetasCarrossel") || "LATERAIS",
      estiloSetasCarrossel:
        getStringConfig(config, "estiloSetasCarrossel") || "CIRCULO",
      navegarPor: getStringConfig(config, "navegarPor") || "PAGINA",
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
      layoutVisualColecoes: normalizarLayoutVisualColecoes(
        getStringConfig(config, "layoutVisual")
      ),
      origemItensColecoes: normalizarOrigemItensColecoes(
        getStringConfig(config, "origemItens")
      ),
      larguraConteudoColecoes: normalizarLarguraConteudoColecoes(
        getStringConfig(config, "larguraConteudo")
      ),
      colunasDesktopColecoes: getNumberConfig(config, "colunasDesktop", 4),
      colunasTabletColecoes: getNumberConfig(config, "colunasTablet", 2),
      colunasMobileColecoes: getNumberConfig(config, "colunasMobile", 1),
      estiloEtiquetaColecoes: normalizarEstiloEtiquetaColecoes(
        getStringConfig(config, "estiloEtiqueta")
      ),
      presetMosaicoColecoes: normalizarPresetMosaicoColecoes(
        getStringConfig(config, "presetMosaico")
      ),
      gapMosaicoColecoes: normalizarGapMosaicoColecoes(
        getStringConfig(config, "gapMosaico")
      ),
      tamanhoEtiquetaColecoes: normalizarTamanhoEtiquetaColecoes(
        getStringConfig(config, "tamanhoEtiqueta")
      ),
      posicaoEtiquetaColecoes: normalizarPosicaoEtiquetaColecoes(
        getStringConfig(config, "posicaoEtiqueta")
      ),
      larguraEtiquetaColecoes: normalizarLarguraEtiquetaColecoes(
        getStringConfig(config, "larguraEtiqueta")
      ),
      exibirLinhaEtiquetaColecoes: getBooleanConfig(
        config,
        "exibirLinhaEtiqueta",
        true
      ),
      exibirEtiquetaColecoes:
        getBooleanConfig(
          config,
          "exibirEtiqueta",
          normalizarEstiloEtiquetaColecoes(getStringConfig(config, "estiloEtiqueta")) !== "OCULTA"
        ) &&
        normalizarEstiloEtiquetaColecoes(getStringConfig(config, "estiloEtiqueta")) !== "OCULTA",
      exibirBotaoEtiquetaColecoes: getBooleanConfig(
        config,
        "exibirBotaoEtiqueta",
        false
      ),
      cardInteiroClicavelColecoes: getBooleanConfig(
        config,
        "cardInteiroClicavel",
        true
      ),
      larguraCabecalhoDesktopColecoes: getNumberConfig(
        config,
        "larguraCabecalhoDesktop",
        32
      ),
      posicaoCabecalhoMosaicoColecoes: normalizarPosicaoCabecalhoMosaico(
        getStringConfig(config, "posicaoCabecalhoMosaico")
      ),
      itensColecoes: getItensColecoesConfig(config),
      tipoCabecalhoColecoes: normalizarTipoCabecalhoColecoes(
        getStringConfig(config, "tipoCabecalho")
      ),
      logoTituloUrl: getStringConfig(config, "logoTituloUrl"),
      logoTituloMobileUrl: getStringConfig(config, "logoTituloMobileUrl"),
      logoTituloAlt: getStringConfig(config, "logoTituloAlt"),
      logoTituloLarguraDesktop: getNumberConfig(
        config,
        "logoTituloLarguraDesktop",
        420
      ),
      logoTituloLarguraMobile: getNumberConfig(
        config,
        "logoTituloLarguraMobile",
        260
      ),
      logoTituloPosicao: normalizarPosicaoLogoTitulo(
        getStringConfig(config, "logoTituloPosicao")
      ),
      imagemTituloUrl: getStringConfig(config, "imagemTituloUrl"),
      imagemTituloMobileUrl: getStringConfig(config, "imagemTituloMobileUrl"),
      imagemTituloAlt: getStringConfig(config, "imagemTituloAlt"),
      imagemTituloLarguraDesktop: getNumberConfig(
        config,
        "imagemTituloLarguraDesktop",
        520
      ),
      imagemTituloLarguraMobile: getNumberConfig(
        config,
        "imagemTituloLarguraMobile",
        300
      ),
      alinhamentoCabecalhoDesktop:
        getStringConfig(config, "alinhamentoCabecalhoDesktop") ||
        getStringConfig(config, "alinhamentoTextoDesktop") ||
        "ESQUERDA",
      alinhamentoCabecalhoMobile:
        getStringConfig(config, "alinhamentoCabecalhoMobile") ||
        getStringConfig(config, "alinhamentoTextoMobile") ||
        getStringConfig(config, "alinhamentoCabecalhoDesktop") ||
        "ESQUERDA",
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
      alinhamentoTextoDesktop:
        getStringConfig(config, "alinhamentoTextoDesktop") ||
        getStringConfig(config, "alinhamento") ||
        getStringConfig(config, "alinhamentoConteudo") ||
        "CENTRO",
      alinhamentoTextoMobile:
        getStringConfig(config, "alinhamentoTextoMobile") ||
        getStringConfig(config, "alinhamentoTextoDesktop") ||
        getStringConfig(config, "alinhamento") ||
        getStringConfig(config, "alinhamentoConteudo") ||
        "CENTRO",
      modeloBanner: normalizeBannerModelo(getStringConfig(config, "modeloBanner")),
      textoPrincipal:
        getStringConfig(config, "textoPrincipal") ||
        getStringConfig(config, "titulo") ||
        "STELLA COLARI",
      varianteVisual:
        getStringConfig(config, "varianteVisual") || "BRANCO_AZUL",
      animarLetras: getBooleanConfig(config, "animarLetras", true),
      velocidadeAnimacao:
        getStringConfig(config, "velocidadeAnimacao") || "MEDIA",
      mostrarTitulo: getBooleanConfig(config, "mostrarTitulo", true),
      mostrarSubtitulo: getBooleanConfig(config, "mostrarSubtitulo", true),
      mostrarCta: getBooleanConfig(config, "mostrarCta", true),
      animacaoElementos:
        getStringConfig(config, "animacaoElementos") || "SEM_ANIMACAO",
      alturaBanner: getStringConfig(config, "alturaBanner") || "PADRAO",
      larguraBanner: getStringConfig(config, "larguraBanner") || "FULL_BLEED",
      overlayBanner: getStringConfig(config, "overlayBanner") || "LEVE",
      corTextoBanner: getStringConfig(config, "corTextoBanner") || "CLARO",
      alinhamentoVertical: getStringConfig(config, "alinhamentoVertical") || "CENTRO",
      margemSeguraX: getNumberConfig(config, "margemSeguraX", 8),
      margemSeguraY: getNumberConfig(config, "margemSeguraY", 8),
      larguraTextoPercentual: getNumberConfig(config, "larguraTextoPercentual", 58),
      fonteTituloDesktop: getNumberConfig(config, "fonteTituloDesktop", 68),
      fonteTituloMobile: getNumberConfig(config, "fonteTituloMobile", 42),
      lineHeightTitulo: getNumberConfig(config, "lineHeightTitulo", 0.98),
      letterSpacingTitulo: getNumberConfig(config, "letterSpacingTitulo", 0),
      mediaZoomDesktop: getNumberConfig(config, "mediaZoomDesktop", 100),
      mediaZoomMobile: getNumberConfig(config, "mediaZoomMobile", 100),
      imagemFrenteDesktopUrl:
        getStringConfig(config, "imagemFrenteDesktopUrl") ||
        getStringConfig(config, "imagemFrontalDesktopUrl"),
      imagemFrenteMobileUrl:
        getStringConfig(config, "imagemFrenteMobileUrl") ||
        getStringConfig(config, "imagemFrontalMobileUrl"),
      imagemFrenteAlt: getStringConfig(config, "imagemFrenteAlt"),
      imagemFrenteX: getNumberConfig(config, "imagemFrenteX", 74),
      imagemFrenteY: getNumberConfig(config, "imagemFrenteY", 56),
      imagemFrenteLarguraDesktop: getNumberConfig(
        config,
        "imagemFrenteLarguraDesktop",
        34
      ),
      imagemFrenteLarguraMobile: getNumberConfig(
        config,
        "imagemFrenteLarguraMobile",
        56
      ),
      estiloCtaBanner: getStringConfig(config, "estiloCtaBanner") || "PREENCHIDO",
      ctaNovaAba: getBooleanConfig(config, "ctaNovaAba", false),
      produtosFlutuantesAtivos: getBooleanConfig(
        config,
        "produtosFlutuantesAtivos",
        normalizeBannerModelo(getStringConfig(config, "modeloBanner")) ===
          "CAMADAS_PARALLAX"
      ),
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
      estiloBordaBotao: getStringConfig(config, "estiloBordaBotao") || "PILULA",
      larguraMidiaDesktop:
        normalizarLarguraMidiaTextoImagem(
          getStringConfig(config, "larguraMidiaDesktop") ||
            getStringConfig(config, "larguraMidia")
        ),
      larguraMidiaMobile:
        normalizarLarguraMidiaTextoImagem(
          getStringConfig(config, "larguraMidiaMobile") ||
            getStringConfig(config, "larguraMidiaDesktop") ||
            getStringConfig(config, "larguraMidia")
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

  function montarConfigDraftEdicao({
    estado,
    blocoAtual,
  }: {
    estado: NonNullable<BlocoEditandoState>;
    blocoAtual: EditorVisualBloco;
  }) {
    const usaConfigDireto =
      isHeroEditorialPngTipo(blocoAtual.tipo) ||
      isGaleriaEditorialTipo(blocoAtual.tipo) ||
      isVitrineEditorialTipo(blocoAtual.tipo);
    const configAtual = getConfigObject(
      usaConfigDireto ? estado.bloco.configJson : blocoAtual.configJson
    );

    if (usaConfigDireto) {
      return configAtual;
    }

    const tituloRichText = estado.titulo.trim()
      ? getRichTextFallback(estado.titulo.trim())
      : null;
    const textoRichText = estado.texto.trim()
      ? getRichTextFallback(estado.texto.trim())
      : null;

    return {
      ...configAtual,
      titulo: estado.titulo,
      texto: estado.texto,
      descricao: estado.texto,
      conteudo: estado.texto,
      tituloRichText,
      textoRichText,
      subtituloRichText: textoRichText,
      tituloSecaoRichText: tituloRichText,
      subtituloSecaoRichText: textoRichText,
      textoBotao: estado.textoBotao,
      botaoTexto: estado.textoBotao,
      textoBotaoPrimario: estado.textoBotao,
      linkBotao: estado.linkBotao,
      botaoLink: estado.linkBotao,
      linkUrl: estado.linkBotao,
      linkBotaoPrimario: estado.linkBotao,
      textoBotaoSecundario: estado.textoBotaoSecundario,
      botaoSecundarioTexto: estado.textoBotaoSecundario,
      linkBotaoSecundario: estado.linkBotaoSecundario,
      botaoSecundarioLink: estado.linkBotaoSecundario,
      exibirBotao: estado.exibirBotao,
      exibirTexto: estado.exibirTexto,
      exibirSubtitulo: estado.exibirSubtitulo,
      exibirBotaoPrimario: estado.exibirBotaoPrimario,
      exibirBotaoSecundario: estado.exibirBotaoSecundario,
      tipoMidia: estado.tipoMidia,
      exibirMidia: estado.exibirMidia,
      imagemUrl: estado.imagemDesktopUrl || estado.imagemUrl,
      imagemDesktopUrl: estado.imagemDesktopUrl,
      imagemDesktop: estado.imagemDesktopUrl,
      imagemMobileUrl: estado.imagemMobileUrl,
      imagemMobile: estado.imagemMobileUrl,
      videoDesktopUrl: estado.videoDesktopUrl,
      videoMobileUrl: estado.videoMobileUrl,
      videoPosterUrl: estado.videoPosterUrl,
      videoLoop: estado.videoLoop,
      videoSom: estado.videoSom,
      mediaCropDesktopX: estado.mediaCropDesktopX,
      mediaCropDesktopY: estado.mediaCropDesktopY,
      mediaCropMobileX: estado.mediaCropMobileX,
      mediaCropMobileY: estado.mediaCropMobileY,
      mediaPositionDesktop: estado.mediaPositionDesktop,
      mediaPositionMobile: estado.mediaPositionMobile,
      mediaZoomDesktop: estado.mediaZoomDesktop,
      mediaZoomMobile: estado.mediaZoomMobile,
      modeloBanner: estado.modeloBanner,
      textoPrincipal: estado.textoPrincipal,
      varianteVisual: estado.varianteVisual,
      animarLetras: estado.animarLetras,
      velocidadeAnimacao: estado.velocidadeAnimacao,
      mostrarTitulo: estado.mostrarTitulo,
      mostrarSubtitulo: estado.mostrarSubtitulo,
      mostrarCta: estado.mostrarCta,
      animacaoElementos: estado.animacaoElementos,
      alinhamentoConteudo: estado.alinhamentoConteudo,
      alinhamentoTextoDesktop: estado.alinhamentoTextoDesktop,
      alinhamentoTextoMobile: estado.alinhamentoTextoMobile,
      alturaBanner: estado.alturaBanner,
      larguraBanner: estado.larguraBanner,
      overlayBanner: estado.overlayBanner,
      corTextoBanner: estado.corTextoBanner,
      alinhamentoVertical: estado.alinhamentoVertical,
      margemSeguraX: estado.margemSeguraX,
      margemSeguraY: estado.margemSeguraY,
      larguraTextoPercentual: estado.larguraTextoPercentual,
      fonteTituloDesktop: estado.fonteTituloDesktop,
      fonteTituloMobile: estado.fonteTituloMobile,
      lineHeightTitulo: estado.lineHeightTitulo,
      letterSpacingTitulo: estado.letterSpacingTitulo,
      imagemFrenteDesktopUrl: estado.imagemFrenteDesktopUrl,
      imagemFrenteMobileUrl: estado.imagemFrenteMobileUrl,
      imagemFrenteAlt: estado.imagemFrenteAlt,
      imagemFrenteX: estado.imagemFrenteX,
      imagemFrenteY: estado.imagemFrenteY,
      imagemFrenteLarguraDesktop: estado.imagemFrenteLarguraDesktop,
      imagemFrenteLarguraMobile: estado.imagemFrenteLarguraMobile,
      estiloCtaBanner: estado.estiloCtaBanner,
      ctaNovaAba: estado.ctaNovaAba,
      produtosFlutuantesAtivos: estado.produtosFlutuantesAtivos,
      layoutDesktop: isTextoImagemTipo(blocoAtual.tipo)
        ? estado.layoutDesktopTextoImagem
        : isListaProdutosTipo(blocoAtual.tipo)
          ? estado.layoutDesktopProdutos
          : isDestaquesCardsTipo(blocoAtual.tipo)
            ? estado.layoutDesktopCards
            : isCtaTipo(blocoAtual.tipo)
              ? estado.layoutDesktopCta
              : getStringConfig(configAtual, "layoutDesktop"),
      layoutMobile: isTextoImagemTipo(blocoAtual.tipo)
        ? estado.layoutMobileTextoImagem
        : isListaProdutosTipo(blocoAtual.tipo)
          ? estado.layoutMobileProdutos
          : isDestaquesCardsTipo(blocoAtual.tipo)
            ? estado.layoutMobileCards
            : isCtaTipo(blocoAtual.tipo)
              ? estado.layoutMobileCta
              : getStringConfig(configAtual, "layoutMobile"),
      layoutDesktopTextoImagem: estado.layoutDesktopTextoImagem,
      layoutMobileTextoImagem: estado.layoutMobileTextoImagem,
      larguraMidiaDesktop: estado.larguraMidiaDesktop,
      larguraMidiaMobile: estado.larguraMidiaMobile,
      alturaBloco: estado.alturaBlocoTextoImagem,
      gapTextoImagem: estado.gapTextoImagem,
      raioImagem: estado.raioImagemTextoImagem,
      imagemAlt: estado.imagemAlt,
      corFundo: estado.corFundo,
      espacamento: estado.espacamento,
      fonte: estado.fonteProdutos,
      categoriaId: estado.categoriaProdutoId,
      categoriaSlug: estado.categoriaProdutoSlug,
      categoriaNome: estado.categoriaProdutoNome,
      categoriasIds: estado.categoriasProdutosIds,
      categoriasSlugs: estado.categoriasProdutosSlugs,
      categoriasNomes: estado.categoriasProdutosNomes,
      categorias: estado.categoriasProdutosIds,
      produtosIds: estado.produtosSelecionadosIds,
      colecaoInteligenteId: estado.colecaoInteligenteId,
      colecaoInteligenteSlug: estado.colecaoInteligenteSlug,
      colecaoInteligenteNome: estado.colecaoInteligenteNome,
      ordenacaoColecao: estado.ordenacaoColecao,
      incluirSugeridosColecao: estado.incluirSugeridosColecao,
      limite: Math.max(1, Number(estado.limiteProdutos) || 1),
      modo: estado.layoutDesktopProdutos,
      exibirSetasCarrossel: estado.exibirSetasCarrossel,
      posicaoSetasCarrossel: estado.posicaoSetasCarrossel,
      estiloSetasCarrossel: estado.estiloSetasCarrossel,
      navegarPor: estado.navegarPor,
      colunasDesktop: Math.max(
        1,
        Number(
          isListaProdutosTipo(blocoAtual.tipo)
            ? estado.colunasDesktopProdutos
            : isColecoesCategoriasTipo(blocoAtual.tipo)
              ? estado.colunasDesktopColecoes
              : estado.colunasDesktopCards
        ) || 1
      ),
      colunasTablet: Math.max(
        1,
        Number(
          isListaProdutosTipo(blocoAtual.tipo)
            ? estado.colunasTabletProdutos
            : isColecoesCategoriasTipo(blocoAtual.tipo)
              ? estado.colunasTabletColecoes
              : estado.colunasTabletCards
        ) || 1
      ),
      colunasMobile: Math.max(
        1,
        Number(
          isListaProdutosTipo(blocoAtual.tipo)
            ? estado.colunasMobileProdutos
            : isColecoesCategoriasTipo(blocoAtual.tipo)
              ? estado.colunasMobileColecoes
              : estado.colunasMobileCards
        ) || 1
      ),
      produtosPorLinha: Math.max(1, Number(estado.colunasDesktopProdutos) || 1),
      exibirPreco: estado.exibirPrecoProdutos,
      exibirSeloDesconto: estado.exibirSeloDescontoProdutos,
      cards: estado.cardsDestaques.map((card) => ({
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
      layoutVisual: estado.layoutVisualColecoes,
      origemItens: estado.origemItensColecoes,
      larguraConteudo: isCtaTipo(blocoAtual.tipo)
        ? estado.larguraConteudoCta
        : estado.larguraConteudoColecoes,
      alinhamento: isCtaTipo(blocoAtual.tipo)
        ? estado.alinhamentoCta
        : estado.alinhamentoCards,
      estiloEtiqueta: estado.estiloEtiquetaColecoes,
      presetMosaico: estado.presetMosaicoColecoes,
      gapMosaico: estado.gapMosaicoColecoes,
      tamanhoEtiqueta: estado.tamanhoEtiquetaColecoes,
      posicaoEtiqueta: estado.posicaoEtiquetaColecoes,
      larguraEtiqueta: estado.larguraEtiquetaColecoes,
      exibirLinhaEtiqueta: estado.exibirLinhaEtiquetaColecoes,
      exibirEtiqueta: estado.exibirEtiquetaColecoes,
      exibirBotaoEtiqueta: estado.exibirBotaoEtiquetaColecoes,
      cardInteiroClicavel: estado.cardInteiroClicavelColecoes,
      larguraCabecalhoDesktop: Math.min(
        40,
        Math.max(25, Number(estado.larguraCabecalhoDesktopColecoes) || 32)
      ),
      posicaoCabecalhoMosaico: estado.posicaoCabecalhoMosaicoColecoes,
      tipoCabecalho: estado.tipoCabecalhoColecoes,
      logoTituloUrl: estado.logoTituloUrl,
      logoTituloMobileUrl: estado.logoTituloMobileUrl,
      logoTituloAlt: estado.logoTituloAlt,
      logoTituloLarguraDesktop: Math.max(
        40,
        Number(estado.logoTituloLarguraDesktop) || 420
      ),
      logoTituloLarguraMobile: Math.max(
        40,
        Number(estado.logoTituloLarguraMobile) || 260
      ),
      logoTituloPosicao: estado.logoTituloPosicao,
      imagemTituloUrl: estado.imagemTituloUrl,
      imagemTituloMobileUrl: estado.imagemTituloMobileUrl,
      imagemTituloAlt: estado.imagemTituloAlt,
      imagemTituloLarguraDesktop: Math.max(
        40,
        Number(estado.imagemTituloLarguraDesktop) || 520
      ),
      imagemTituloLarguraMobile: Math.max(
        40,
        Number(estado.imagemTituloLarguraMobile) || 300
      ),
      alinhamentoCabecalhoDesktop: estado.alinhamentoCabecalhoDesktop,
      alinhamentoCabecalhoMobile: estado.alinhamentoCabecalhoMobile,
      itens: estado.itensColecoes.map((item, index) => ({
        id: item.id,
        tipoLink: item.tipoLink,
        categoriaId: item.categoriaId,
        categoriaSlug: item.categoriaSlug,
        categoriaNome: item.categoriaNome,
        titulo: item.titulo,
        subtitulo: item.subtitulo,
        tituloRichText: item.tituloRichText,
        subtituloRichText: item.subtituloRichText,
        textoLink: item.textoLink,
        linkUrl: item.linkUrl,
        imagemDesktopUrl: item.imagemDesktopUrl,
        imagemUrl: item.imagemDesktopUrl,
        imagemMobileUrl: item.imagemMobileUrl,
        tipoMidia: item.tipoMidia,
        videoDesktopUrl: item.videoDesktopUrl,
        videoMobileUrl: item.videoMobileUrl,
        mediaPositionDesktop: item.mediaPositionDesktop,
        mediaPositionMobile: item.mediaPositionMobile,
        mediaCropDesktopX: item.mediaCropDesktopX,
        mediaCropDesktopY: item.mediaCropDesktopY,
        mediaCropMobileX: item.mediaCropMobileX,
        mediaCropMobileY: item.mediaCropMobileY,
        tamanhoMosaico: item.tamanhoMosaico,
        ordem: index,
      })),
      tituloStyle: estado.tituloStyle,
      subtituloStyle: estado.subtituloStyle,
      botaoPrimarioStyle: estado.botaoPrimarioStyle,
      botaoSecundarioStyle: estado.botaoSecundarioStyle,
      textoStyle: estado.textoStyle,
      botaoStyle: estado.botaoStyle,
      nomeProdutoStyle: estado.nomeProdutoStyle,
      precoProdutoStyle: estado.precoProdutoStyle,
      tituloSecaoStyle: estado.tituloSecaoStyle,
      subtituloSecaoStyle: estado.subtituloSecaoStyle,
      cardTituloStyle: estado.cardTituloStyle,
      cardTextoStyle: estado.cardTextoStyle,
      cardBotaoStyle: estado.cardBotaoStyle,
    };
  }

  function aplicarEdicaoNoDraft(estado: NonNullable<BlocoEditandoState>) {
    marcarAlteracaoPendente(estado.bloco.id);
    setSucesso("");
    setBlocosEditor((current) =>
      current.map((bloco) =>
        bloco.id === estado.bloco.id
          ? {
              ...bloco,
              titulo: estado.nomeInterno || estado.titulo || bloco.titulo,
              configJson: montarConfigDraftEdicao({
                estado,
                blocoAtual: bloco,
              }),
            }
          : bloco
      )
    );
  }

  function atualizarEdicao(data: Partial<NonNullable<BlocoEditandoState>>) {
    setEditando((current) => {
      if (!current) return current;

      const proximoEstado = {
        ...current,
        ...data,
      };

      aplicarEdicaoNoDraft(proximoEstado);

      return proximoEstado;
    });
  }

  async function salvarEdicaoBloco() {
    if (!editando) return;

    setErro("");
    setSucesso("");
    setSalvando(true);

    const blocoAtual = getBlocoEditorAtual(editando.bloco.id) || editando.bloco;
    const usaConfigDireto =
      isHeroEditorialPngTipo(blocoAtual.tipo) ||
      isGaleriaEditorialTipo(blocoAtual.tipo) ||
      isVitrineEditorialTipo(blocoAtual.tipo);

    if (usaConfigDireto) {
      try {
        const salvo = await atualizarBloco(blocoAtual, {
          titulo: editando.nomeInterno || blocoAtual.titulo,
          configJson: getConfigObject(editando.bloco.configJson),
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

      return;
    }

    const configAtual = getConfigObject(blocoAtual.configJson);
    const isBanner = isBannerTipo(blocoAtual.tipo);
    const isTextoImagem = isTextoImagemTipo(blocoAtual.tipo);
    const isListaProdutos = isListaProdutosTipo(blocoAtual.tipo);
    const isDestaquesCards = isDestaquesCardsTipo(blocoAtual.tipo);
    const isColecoesCategorias = isColecoesCategoriasTipo(blocoAtual.tipo);
    const isCta = isCtaTipo(blocoAtual.tipo);
    const blocoUsaRichText =
      isBanner ||
      isTextoImagem ||
      isListaProdutos ||
      isDestaquesCards ||
      isColecoesCategorias ||
      isCta;
    const tituloAtual =
      getStringConfig(configAtual, "titulo") || blocoAtual.titulo || "";
    const textoAtual =
      getStringConfig(configAtual, "texto") ||
      getStringConfig(configAtual, "descricao") ||
      getStringConfig(configAtual, "conteudo");
    const tituloMudouNoModal = blocoUsaRichText && editando.titulo !== tituloAtual;
    const textoMudouNoModal = blocoUsaRichText && editando.texto !== textoAtual;
    const tituloModalRichText = editando.titulo.trim()
      ? getRichTextFallback(editando.titulo.trim())
      : null;
    const textoModalRichText = editando.texto.trim()
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
      estiloBordaBotao: editando.estiloBordaBotao,
      alinhamentoTextoDesktop: editando.alinhamentoTextoDesktop,
      alinhamentoTextoMobile: editando.alinhamentoTextoMobile,
      ...(tituloMudouNoModal ? { tituloRichText: tituloModalRichText } : {}),
      ...(textoMudouNoModal
        ? {
            textoRichText: textoModalRichText,
            subtituloRichText: textoModalRichText,
          }
        : {}),
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
            modeloBanner: editando.modeloBanner,
            textoPrincipal: editando.textoPrincipal,
            varianteVisual: editando.varianteVisual,
            animarLetras: editando.animarLetras,
            velocidadeAnimacao: editando.velocidadeAnimacao,
            mostrarTitulo: editando.mostrarTitulo,
            mostrarSubtitulo: editando.mostrarSubtitulo,
            mostrarCta: editando.mostrarCta,
            animacaoElementos: editando.animacaoElementos,
            alinhamentoConteudo: editando.alinhamentoConteudo,
            alturaBanner: editando.alturaBanner,
            larguraBanner: editando.larguraBanner,
            overlayBanner: editando.overlayBanner,
            corTextoBanner: editando.corTextoBanner,
            alinhamentoVertical: editando.alinhamentoVertical,
            margemSeguraX: editando.margemSeguraX,
            margemSeguraY: editando.margemSeguraY,
            larguraTextoPercentual: editando.larguraTextoPercentual,
            fonteTituloDesktop: editando.fonteTituloDesktop,
            fonteTituloMobile: editando.fonteTituloMobile,
            lineHeightTitulo: editando.lineHeightTitulo,
            letterSpacingTitulo: editando.letterSpacingTitulo,
            mediaZoomDesktop: editando.mediaZoomDesktop,
            mediaZoomMobile: editando.mediaZoomMobile,
            imagemFrenteDesktopUrl: editando.imagemFrenteDesktopUrl,
            imagemFrenteMobileUrl: editando.imagemFrenteMobileUrl,
            imagemFrenteAlt: editando.imagemFrenteAlt,
            imagemFrenteX: editando.imagemFrenteX,
            imagemFrenteY: editando.imagemFrenteY,
            imagemFrenteLarguraDesktop: editando.imagemFrenteLarguraDesktop,
            imagemFrenteLarguraMobile: editando.imagemFrenteLarguraMobile,
            estiloCtaBanner: editando.estiloCtaBanner,
            ctaNovaAba: editando.ctaNovaAba,
            produtosFlutuantesAtivos: editando.produtosFlutuantesAtivos,
            produtosIds: editando.produtosSelecionadosIds,
            mediaCropDesktopX: editando.mediaCropDesktopX,
            mediaCropDesktopY: editando.mediaCropDesktopY,
            mediaCropMobileX: editando.mediaCropMobileX,
            mediaCropMobileY: editando.mediaCropMobileY,
            mediaPositionDesktop: editando.mediaPositionDesktop,
            mediaPositionMobile: editando.mediaPositionMobile,
          }
        : isTextoImagem
          ? {
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
              larguraMidiaDesktop: editando.larguraMidiaDesktop,
              larguraMidiaMobile: editando.larguraMidiaMobile,
              alturaBloco: editando.alturaBlocoTextoImagem,
              gapTextoImagem: editando.gapTextoImagem,
              raioImagem: editando.raioImagemTextoImagem,
              imagemAlt: editando.imagemAlt,
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
              mediaZoomDesktop: editando.mediaZoomDesktop,
              mediaZoomMobile: editando.mediaZoomMobile,
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
              colecaoInteligenteId: editando.colecaoInteligenteId,
              colecaoInteligenteSlug: editando.colecaoInteligenteSlug,
              colecaoInteligenteNome: editando.colecaoInteligenteNome,
              ordenacaoColecao: editando.ordenacaoColecao,
              incluirSugeridosColecao: editando.incluirSugeridosColecao,
              limite: Math.max(1, Number(editando.limiteProdutos) || 1),
              modo: editando.layoutDesktopProdutos,
              layoutDesktop: editando.layoutDesktopProdutos,
              layoutMobile: editando.layoutMobileProdutos,
              exibirSetasCarrossel: editando.exibirSetasCarrossel,
              posicaoSetasCarrossel: editando.posicaoSetasCarrossel,
              estiloSetasCarrossel: editando.estiloSetasCarrossel,
              navegarPor: editando.navegarPor,
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
              ...(tituloMudouNoModal
                ? {
                    tituloSecaoRichText: tituloModalRichText,
                  }
                : {}),
              ...(textoMudouNoModal
                ? {
                    subtituloSecaoRichText: textoModalRichText,
                  }
                : {}),
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
        : isColecoesCategorias
          ? {
              ...(tituloMudouNoModal
                ? {
                    tituloRichText: tituloModalRichText,
                  }
                : {}),
              ...(textoMudouNoModal
                ? {
                    subtituloRichText: textoModalRichText,
                  }
                : {}),
              subtitulo: editando.texto,
              descricao: editando.texto,
              layoutVisual: editando.layoutVisualColecoes,
              origemItens: editando.origemItensColecoes,
              larguraConteudo: editando.larguraConteudoColecoes,
              colunasDesktop: Math.max(
                1,
                Number(editando.colunasDesktopColecoes) || 1
              ),
              colunasTablet: Math.max(
                1,
                Number(editando.colunasTabletColecoes) || 1
              ),
              colunasMobile: Math.max(
                1,
                Number(editando.colunasMobileColecoes) || 1
              ),
              estiloEtiqueta: editando.estiloEtiquetaColecoes,
              presetMosaico: editando.presetMosaicoColecoes,
              gapMosaico: editando.gapMosaicoColecoes,
              tamanhoEtiqueta: editando.tamanhoEtiquetaColecoes,
              posicaoEtiqueta: editando.posicaoEtiquetaColecoes,
              larguraEtiqueta: editando.larguraEtiquetaColecoes,
              exibirLinhaEtiqueta: editando.exibirLinhaEtiquetaColecoes,
              exibirEtiqueta: editando.exibirEtiquetaColecoes,
              exibirBotaoEtiqueta: editando.exibirBotaoEtiquetaColecoes,
              cardInteiroClicavel: editando.cardInteiroClicavelColecoes,
              larguraCabecalhoDesktop: Math.min(
                40,
                Math.max(25, Number(editando.larguraCabecalhoDesktopColecoes) || 32)
              ),
              posicaoCabecalhoMosaico: editando.posicaoCabecalhoMosaicoColecoes,
              corFundo: editando.corFundo,
              espacamento: editando.espacamento,
              tipoCabecalho: editando.tipoCabecalhoColecoes,
              logoTituloUrl: editando.logoTituloUrl,
              logoTituloMobileUrl: editando.logoTituloMobileUrl,
              logoTituloAlt: editando.logoTituloAlt,
              logoTituloLarguraDesktop: Math.max(
                40,
                Number(editando.logoTituloLarguraDesktop) || 420
              ),
              logoTituloLarguraMobile: Math.max(
                40,
                Number(editando.logoTituloLarguraMobile) || 260
              ),
              logoTituloPosicao: editando.logoTituloPosicao,
              imagemTituloUrl: editando.imagemTituloUrl,
              imagemTituloMobileUrl: editando.imagemTituloMobileUrl,
              imagemTituloAlt: editando.imagemTituloAlt,
              imagemTituloLarguraDesktop: Math.max(
                40,
                Number(editando.imagemTituloLarguraDesktop) || 520
              ),
              imagemTituloLarguraMobile: Math.max(
                40,
                Number(editando.imagemTituloLarguraMobile) || 300
              ),
              alinhamentoCabecalhoDesktop: editando.alinhamentoCabecalhoDesktop,
              alinhamentoCabecalhoMobile: editando.alinhamentoCabecalhoMobile,
              itens: editando.itensColecoes.map((item, index) => ({
                id: item.id,
                tipoLink: item.tipoLink,
                categoriaId: item.categoriaId,
                categoriaSlug: item.categoriaSlug,
                categoriaNome: item.categoriaNome,
                titulo: item.titulo,
                subtitulo: item.subtitulo,
                tituloRichText: item.tituloRichText,
                subtituloRichText: item.subtituloRichText,
                textoLink: item.textoLink,
                linkUrl: item.linkUrl,
                imagemDesktopUrl: item.imagemDesktopUrl,
                imagemUrl: item.imagemDesktopUrl,
                imagemMobileUrl: item.imagemMobileUrl,
                tipoMidia: item.tipoMidia,
                videoDesktopUrl: item.videoDesktopUrl,
                videoMobileUrl: item.videoMobileUrl,
                mediaPositionDesktop: item.mediaPositionDesktop,
                mediaPositionMobile: item.mediaPositionMobile,
                mediaCropDesktopX: item.mediaCropDesktopX,
                mediaCropDesktopY: item.mediaCropDesktopY,
                mediaCropMobileX: item.mediaCropMobileX,
                mediaCropMobileY: item.mediaCropMobileY,
                tamanhoMosaico: item.tamanhoMosaico,
                ordem: index,
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

  void atualizarTextoInline;
  void atualizarCardInline;
  void atualizarColecaoItemInline;

  const possuiAlteracoesNaoSalvas = blocosComTextoPendente.length > 0;
  const statusSalvamento = salvando
    ? "Salvando"
    : erro
    ? "Erro ao salvar"
    : possuiAlteracoesNaoSalvas
    ? "Alterações não salvas"
    : "Salvo";
  const statusSalvamentoClass = salvando
    ? "bg-blue-50 text-blue-700"
    : erro
    ? "bg-red-50 text-red-700"
    : possuiAlteracoesNaoSalvas
    ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100 text-slate-900">
      <header className="z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-3 shadow-sm sm:px-4">
        <NextLink
          href="/configuracoes/loja/paginas"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          aria-label="Voltar para páginas"
        >
          <ArrowLeft className="h-4 w-4" />
        </NextLink>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-bold text-slate-950 sm:text-base">
              {pagina.titulo}
            </h1>

            <span
              className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
                pagina.ativo
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {pagina.ativo ? "Ativa" : "Inativa"}
            </span>

            <span className="hidden rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 md:inline-flex">
              {pagina.statusPublicacao}
            </span>

            <span
              className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold lg:inline-flex ${statusSalvamentoClass}`}
            >
              {statusSalvamento}
            </span>
          </div>

          <p className="truncate text-xs text-slate-500">
            {getFrameWidth(device)} sem escala · {pagina.slug}
          </p>
        </div>

        <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 p-1 md:inline-flex">
          {(["DESKTOP", "TABLET", "MOBILE"] as const).map((item) => {
            const Icon =
              item === "DESKTOP" ? Monitor : item === "TABLET" ? Tablet : Smartphone;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setDevice(item)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  device === item
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {getFrameLabel(item)}
              </button>
            );
          })}
        </div>

        {blocoSelecionado &&
          blocosComTextoPendente.includes(blocoSelecionado.id) && (
            <button
              type="button"
              onClick={() => void salvarTextosInline(blocoSelecionado)}
              disabled={salvando}
              className="hidden items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 lg:inline-flex"
            >
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          )}

        <button
          type="button"
          onClick={alternarPreviewPublico}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${
            modoPreviewPublico
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {modoPreviewPublico ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {modoPreviewPublico ? "Preview público" : "Ver página"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPainelAberto((current) => !current);
            setModoPreviewPublico(false);
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          aria-label={painelAberto ? "Recolher painel" : "Abrir painel"}
        >
          {painelAberto ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </button>

        <NextLink
          href={pagina.urlPublica}
          target="_blank"
          className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 xl:inline-flex"
        >
          Página pública
        </NextLink>
      </header>

      {(erro || sucesso) && (
        <div className="absolute left-1/2 top-20 z-40 w-[min(92vw,720px)] -translate-x-1/2">
          {erro && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg">
              {sucesso}
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {!modoPreviewPublico && (
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:block">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-950">Blocos</h2>
              </div>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                {blocosOrdenados.length}
              </span>
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

            <button
              type="button"
              onClick={() => setModalDadosSeoAberto(true)}
              disabled={dadosSeoSalvando}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ClipboardList className="h-4 w-4" />
              Dados/SEO
            </button>

            <div className="mt-4 space-y-2">
              {blocosOrdenados.map((bloco) => {
                const Icon = getBlocoIcon(bloco.tipo);
                const selecionado = bloco.id === blocoSelecionadoId;

                return (
                  <button
                    key={bloco.id}
                    type="button"
                    onClick={() => selecionarBloco(bloco.id, "BLOCO")}
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
        )}

        <main className="min-w-0 flex-1 overflow-auto bg-slate-100">
          <div className="min-h-full w-max p-4 sm:p-6">
            <div className="min-w-0 bg-slate-100">
              {!modoPreviewPublico && (
                <div className="sticky left-0 top-0 z-20 flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/95 px-4 py-2 backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {device === "DESKTOP" && <Monitor className="h-4 w-4" />}
                    {device === "TABLET" && <Tablet className="h-4 w-4" />}
                    {device === "MOBILE" && <Smartphone className="h-4 w-4" />}
                    Canvas real via iframe
                  </div>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                    {getFrameWidth(device)} · 100%
                  </span>
                </div>
              )}

              <iframe
                key={previewIframeSrc}
                ref={previewIframeRef}
                src={previewIframeSrc}
                onLoad={enviarDraftParaPreview}
                className={`block h-[calc(100vh-112px)] min-h-[640px] shrink-0 border-0 bg-white shadow-sm ring-1 ring-slate-200 ${getFrameClass(
                  device
                )}`}
                title={`Preview da página ${pagina.titulo}`}
              />
            </div>
          </div>
        </main>

        {!modoPreviewPublico && painelAberto && (
          <aside className="fixed inset-y-0 right-0 z-30 mt-16 w-[min(100vw,380px)] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl xl:static xl:mt-0 xl:w-[380px] xl:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PanelRight className="h-5 w-5 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-950">
                  Painel lateral
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPainelAberto(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 xl:hidden"
                aria-label="Fechar painel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {blocoSelecionado ? (
              <div className="mt-5 space-y-5">
                <PainelSecao title="Seleção">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {selectionContext === "TEXTO"
                      ? "Texto"
                      : selectionContext === "IMAGEM"
                        ? "Imagem"
                        : selectionContext === "BOTAO"
                          ? "Botão"
                          : selectionContext === "PRODUTOS"
                            ? "Produtos"
                            : selectionContext === "DESIGN"
                              ? "Design"
                              : "Bloco selecionado"}
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
                    {pagina.tipo === "CATEGORIA" && pagina.categoriaNome
                      ? `Esta página está vinculada a ${pagina.categoriaNome}; produtos disponíveis no editor já estão limitados a essa categoria.`
                      : `${categoriasDisponiveis.length} categorias carregadas para uso em blocos de produtos, categorias e campanhas.`}
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
        )}
      </div>

      <DadosSeoPaginaModal
        aberto={modalDadosSeoAberto}
        form={dadosSeoForm}
        onChange={atualizarDadosSeoForm}
        onClose={() => setModalDadosSeoAberto(false)}
        onSave={() => void salvarDadosSeoPagina()}
        salvando={dadosSeoSalvando}
      />

      <EditorConteudoBlocoModal
        estado={editando}
        pagina={pagina}
        categoriasDisponiveis={categoriasDisponiveis}
        paginasDisponiveis={paginasDisponiveis}
        produtosDisponiveis={produtosDisponiveis}
        colecoesInteligentes={colecoesInteligentes}
        campanhasDisponiveis={campanhasDisponiveis}
        selectedContext={selectionContext}
        selectedGalleryItemId={selectedGalleryItemId}
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
