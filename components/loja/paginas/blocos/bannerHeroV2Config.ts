import type { TextElementConfig } from "@/components/loja/paginas/textElements";
import { normalizarElementoTexto } from "@/components/loja/paginas/textElements";

export type BannerHeroV2Altura = "25VH" | "50VH" | "100VH";
export type BannerHeroV2Navegacao =
  | "NENHUMA"
  | "SETA_PROXIMO_BLOCO"
  | "CONTROLES_SLIDER";
export type BannerHeroV2PosicaoConteudo =
  | "ESQUERDA"
  | "CENTRO"
  | "DIREITA"
  | "NENHUM";
export type BannerHeroV2TipoMidia = "IMAGEM" | "VIDEO";
export type BannerHeroV2LinkTipo =
  | "URL"
  | "PRODUTO"
  | "CATEGORIA"
  | "PAGINA"
  | "COLECAO";

export type BannerHeroV2Crop = {
  assetId?: string;
  url?: string;
  alt?: string;
  aspectRatio: string;
  zoom: number;
  positionX: number;
  positionY: number;
};

export type BannerHeroV2Button = {
  id: string;
  texto: string;
  linkTipo: BannerHeroV2LinkTipo;
  linkValor: string;
  abrirNovaAba: boolean;
  estilo: {
    variante:
      | "PREENCHIDO"
      | "CONTORNADO"
      | "PILL"
      | "SUAVE"
      | "RETO"
      | "TEXTO"
      | "TEXTO_LINHA";
    corFundo: string;
    corTexto: string;
    corBorda: string;
    tamanho: "PEQUENO" | "MEDIO" | "GRANDE";
    paddingX: number;
    paddingY: number;
  };
  hover: {
    opacidade: number;
  };
};

export type BannerHeroV2Slide = {
  id: string;
  tipoMidia: BannerHeroV2TipoMidia;
  midia: {
    desktop: BannerHeroV2Crop;
    mobile: BannerHeroV2Crop;
    usarMidiaMobileAlternativa: boolean;
    mobileAlternativa?: BannerHeroV2Crop;
  };
  video: {
    url: string;
    mobileUrl: string;
    posterUrl: string;
    loop: boolean;
    mutado: boolean;
    autoplay: boolean;
    avancarAoFim: boolean;
  };
  overlay: {
    ativo: boolean;
    cor: string;
    opacidade: number;
  };
  conteudo: {
    ativo: boolean;
    posicao: BannerHeroV2PosicaoConteudo;
    largura: "COMPACTA" | "MEDIA" | "LARGA";
    alinhamento: "ESQUERDA" | "CENTRO" | "DIREITA";
    mostrarEyebrow: boolean;
    mostrarTitulo: boolean;
    mostrarTexto: boolean;
    eyebrow: TextElementConfig;
    titulo: TextElementConfig;
    texto: TextElementConfig;
    botoes: BannerHeroV2Button[];
  };
  tempoMs: number;
  linkSlide: {
    tipo: BannerHeroV2LinkTipo;
    valor: string;
    abrirNovaAba: boolean;
  };
};

export type BannerHeroV2Config = {
  tipo: "BANNER_HERO_V2";
  altura: BannerHeroV2Altura;
  largura: "FULL_BLEED";
  headerTransparente: boolean;
  headerTextoClaro: boolean;
  transicaoHeaderAoScroll: boolean;
  navegacaoInferior: BannerHeroV2Navegacao;
  carrossel: {
    ativo: boolean;
    autoplay: boolean;
    tempoPadraoMs: number;
    pausarAoHover: boolean;
    transicao: "FADE" | "SLIDE";
    mostrarControles: boolean;
  };
  slides: BannerHeroV2Slide[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getObject(value: unknown) {
  return isRecord(value) ? value : {};
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function pick<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  const text = getString(value);
  return options.includes(text as T) ? (text as T) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function criarBannerHeroV2Crop(url = "", alt = ""): BannerHeroV2Crop {
  return {
    url,
    alt,
    aspectRatio: "16:9",
    zoom: 100,
    positionX: 50,
    positionY: 50,
  };
}

export function criarBannerHeroV2Botao(index = 1): BannerHeroV2Button {
  return {
    id: `botao-${index}`,
    texto: index === 1 ? "Conhecer" : "Ver colecao",
    linkTipo: "URL",
    linkValor: "/loja",
    abrirNovaAba: false,
    estilo: {
      variante: index === 1 ? "PREENCHIDO" : "CONTORNADO",
      corFundo: "#ffffff",
      corTexto: "#0f172a",
      corBorda: "#ffffff",
      tamanho: "MEDIO",
      paddingX: 20,
      paddingY: 10,
    },
    hover: {
      opacidade: 88,
    },
  };
}

export function criarBannerHeroV2Slide(index = 1): BannerHeroV2Slide {
  return {
    id: `slide-${index}`,
    tipoMidia: "IMAGEM",
    midia: {
      desktop: criarBannerHeroV2Crop(),
      mobile: criarBannerHeroV2Crop(),
      usarMidiaMobileAlternativa: false,
    },
    video: {
      url: "",
      mobileUrl: "",
      posterUrl: "",
      loop: true,
      mutado: true,
      autoplay: true,
      avancarAoFim: false,
    },
    overlay: {
      ativo: true,
      cor: "#000000",
      opacidade: 28,
    },
    conteudo: {
      ativo: true,
      posicao: "ESQUERDA",
      largura: "MEDIA",
      alinhamento: "ESQUERDA",
      mostrarEyebrow: false,
      mostrarTitulo: true,
      mostrarTexto: true,
      eyebrow: normalizarElementoTexto(null, {
        id: `slide-${index}-eyebrow`,
        tipo: "subtitulo",
        conteudo: "Nova colecao",
      }),
      titulo: normalizarElementoTexto(null, {
        id: `slide-${index}-titulo`,
        tipo: "titulo",
        conteudo: "Banner editorial",
      }),
      texto: normalizarElementoTexto(null, {
        id: `slide-${index}-texto`,
        tipo: "paragrafo",
        conteudo: "Imagem ou video de fundo com texto editavel no canvas.",
      }),
      botoes: [criarBannerHeroV2Botao(1)],
    },
    tempoMs: 5000,
    linkSlide: {
      tipo: "URL",
      valor: "",
      abrirNovaAba: false,
    },
  };
}

export function criarBannerHeroV2ConfigPadrao(): BannerHeroV2Config {
  return {
    tipo: "BANNER_HERO_V2",
    altura: "100VH",
    largura: "FULL_BLEED",
    headerTransparente: false,
    headerTextoClaro: true,
    transicaoHeaderAoScroll: true,
    navegacaoInferior: "NENHUMA",
    carrossel: {
      ativo: false,
      autoplay: false,
      tempoPadraoMs: 5000,
      pausarAoHover: true,
      transicao: "FADE",
      mostrarControles: false,
    },
    slides: [criarBannerHeroV2Slide(1)],
  };
}

function normalizarCrop(value: unknown, fallback: BannerHeroV2Crop): BannerHeroV2Crop {
  const data = getObject(value);
  return {
    assetId: getString(data.assetId),
    url: getString(data.url, fallback.url || ""),
    alt: getString(data.alt, fallback.alt || ""),
    aspectRatio: getString(data.aspectRatio, fallback.aspectRatio || "16:9"),
    zoom: clamp(getNumber(data.zoom, fallback.zoom || 100), 20, 220),
    positionX: clamp(getNumber(data.positionX, fallback.positionX ?? 50), 0, 100),
    positionY: clamp(getNumber(data.positionY, fallback.positionY ?? 50), 0, 100),
  };
}

function normalizarBotao(value: unknown, index: number): BannerHeroV2Button {
  const fallback = criarBannerHeroV2Botao(index + 1);
  const data = getObject(value);
  const estilo = getObject(data.estilo);
  const hover = getObject(data.hover);

  return {
    id: getString(data.id, fallback.id),
    texto: getString(data.texto, fallback.texto).slice(0, 24),
    linkTipo: pick(data.linkTipo, ["URL", "PRODUTO", "CATEGORIA", "PAGINA", "COLECAO"] as const, fallback.linkTipo),
    linkValor: getString(data.linkValor, fallback.linkValor),
    abrirNovaAba: getBoolean(data.abrirNovaAba, false),
    estilo: {
      variante: pick(
        estilo.variante,
        ["PREENCHIDO", "CONTORNADO", "PILL", "SUAVE", "RETO", "TEXTO", "TEXTO_LINHA"] as const,
        fallback.estilo.variante
      ),
      corFundo: getString(estilo.corFundo, fallback.estilo.corFundo),
      corTexto: getString(estilo.corTexto, fallback.estilo.corTexto),
      corBorda: getString(estilo.corBorda, fallback.estilo.corBorda),
      tamanho: pick(estilo.tamanho, ["PEQUENO", "MEDIO", "GRANDE"] as const, fallback.estilo.tamanho),
      paddingX: clamp(getNumber(estilo.paddingX, fallback.estilo.paddingX), 8, 48),
      paddingY: clamp(getNumber(estilo.paddingY, fallback.estilo.paddingY), 6, 24),
    },
    hover: {
      opacidade: clamp(getNumber(hover.opacidade, fallback.hover.opacidade), 40, 100),
    },
  };
}

export function normalizarBannerHeroV2Config(value: unknown): BannerHeroV2Config {
  const fallback = criarBannerHeroV2ConfigPadrao();
  const data = getObject(value);
  const carrossel = getObject(data.carrossel);
  const slidesData = Array.isArray(data.slides) ? data.slides : [];
  const slidesBase = slidesData.length > 0 ? slidesData : fallback.slides;
  const slides = slidesBase.map((slideValue, index): BannerHeroV2Slide => {
    const fallbackSlide = criarBannerHeroV2Slide(index + 1);
    const slide = getObject(slideValue);
    const midia = getObject(slide.midia);
    const video = getObject(slide.video);
    const overlay = getObject(slide.overlay);
    const conteudo = getObject(slide.conteudo);
    const linkSlide = getObject(slide.linkSlide);
    const botoesData = Array.isArray(conteudo.botoes)
      ? conteudo.botoes
      : fallbackSlide.conteudo.botoes;
    const avancarAoFim = getBoolean(video.avancarAoFim, false);

    return {
      id: getString(slide.id, fallbackSlide.id),
      tipoMidia: pick(slide.tipoMidia, ["IMAGEM", "VIDEO"] as const, fallbackSlide.tipoMidia),
      midia: {
        desktop: normalizarCrop(midia.desktop, fallbackSlide.midia.desktop),
        mobile: normalizarCrop(midia.mobile, fallbackSlide.midia.mobile),
        usarMidiaMobileAlternativa: getBoolean(midia.usarMidiaMobileAlternativa, false),
        mobileAlternativa: normalizarCrop(
          midia.mobileAlternativa,
          fallbackSlide.midia.mobile
        ),
      },
      video: {
        url: getString(video.url),
        mobileUrl: getString(video.mobileUrl),
        posterUrl: getString(video.posterUrl),
        loop: avancarAoFim ? false : getBoolean(video.loop, true),
        mutado: getBoolean(video.mutado, true),
        autoplay: getBoolean(video.autoplay, true),
        avancarAoFim,
      },
      overlay: {
        ativo: getBoolean(overlay.ativo, true),
        cor: getString(overlay.cor, "#000000"),
        opacidade: clamp(getNumber(overlay.opacidade, 28), 0, 90),
      },
      conteudo: {
        ativo: getBoolean(conteudo.ativo, true),
        posicao: pick(
          conteudo.posicao,
          ["ESQUERDA", "CENTRO", "DIREITA", "NENHUM"] as const,
          "ESQUERDA"
        ),
        largura: pick(conteudo.largura, ["COMPACTA", "MEDIA", "LARGA"] as const, "MEDIA"),
        alinhamento: pick(
          conteudo.alinhamento,
          ["ESQUERDA", "CENTRO", "DIREITA"] as const,
          "ESQUERDA"
        ),
        mostrarEyebrow: getBoolean(conteudo.mostrarEyebrow, false),
        mostrarTitulo: getBoolean(conteudo.mostrarTitulo, true),
        mostrarTexto: getBoolean(conteudo.mostrarTexto, true),
        eyebrow: normalizarElementoTexto(conteudo.eyebrow, fallbackSlide.conteudo.eyebrow),
        titulo: normalizarElementoTexto(conteudo.titulo, fallbackSlide.conteudo.titulo),
        texto: normalizarElementoTexto(conteudo.texto, fallbackSlide.conteudo.texto),
        botoes: botoesData.slice(0, 2).map(normalizarBotao),
      },
      tempoMs: clamp(getNumber(slide.tempoMs, 5000), 1500, 30000),
      linkSlide: {
        tipo: pick(linkSlide.tipo, ["URL", "PRODUTO", "CATEGORIA", "PAGINA", "COLECAO"] as const, "URL"),
        valor: getString(linkSlide.valor),
        abrirNovaAba: getBoolean(linkSlide.abrirNovaAba, false),
      },
    };
  });

  return {
    tipo: "BANNER_HERO_V2",
    altura: pick(data.altura, ["25VH", "50VH", "100VH"] as const, fallback.altura),
    largura: "FULL_BLEED",
    headerTransparente: getBoolean(data.headerTransparente, false),
    headerTextoClaro: getBoolean(data.headerTextoClaro, true),
    transicaoHeaderAoScroll: getBoolean(data.transicaoHeaderAoScroll, true),
    navegacaoInferior: pick(
      data.navegacaoInferior,
      ["NENHUMA", "SETA_PROXIMO_BLOCO", "CONTROLES_SLIDER"] as const,
      fallback.navegacaoInferior
    ),
    carrossel: {
      ativo: getBoolean(carrossel.ativo, false),
      autoplay: getBoolean(carrossel.autoplay, false),
      tempoPadraoMs: clamp(getNumber(carrossel.tempoPadraoMs, 5000), 1500, 30000),
      pausarAoHover: getBoolean(carrossel.pausarAoHover, true),
      transicao: pick(carrossel.transicao, ["FADE", "SLIDE"] as const, "FADE"),
      mostrarControles: getBoolean(carrossel.mostrarControles, false),
    },
    slides,
  };
}
