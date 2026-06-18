export type TextElementKind = "titulo" | "subtitulo" | "paragrafo" | "botaoLabel";

export type TextElementStyle = {
  fonte: "PRINCIPAL" | "EDITORIAL";
  peso: "LIGHT" | "REGULAR" | "MEDIUM" | "SEMIBOLD" | "BOLD" | "BLACK";
  tamanho: string;
  cor: string;
  alinhamento: "ESQUERDA" | "CENTRO" | "DIREITA";
  letterSpacing: string;
  lineHeight: string;
  link: string;
  preset: "TITULO" | "SUBTITULO" | "PARAGRAFO" | "BOTAO" | "CUSTOMIZADO";
};

export type TextElementConfig = {
  id: string;
  tipo: TextElementKind;
  conteudo: string;
  estilo: TextElementStyle;
};

export type SectionColumnElement =
  | {
      id: string;
      tipo: "TITULO" | "TEXTO" | "BOTAO";
      texto: TextElementConfig;
    }
  | {
      id: string;
      tipo: "IMAGEM";
      url: string;
      alt: string;
      crop?: unknown;
    }
  | {
      id: string;
      tipo: "ESPACADOR";
      altura: number;
    };

export type SectionColumnsConfig = {
  tipo: "SECAO_COLUNAS";
  layout: {
    colunas: 2;
    proporcaoDesktop: "50/50" | "40/60" | "60/40" | "CUSTOM";
    gap: number;
    altura: "AUTO" | "COMPACTA" | "PADRAO" | "ALTA" | "TELA_CHEIA";
    alinhamentoVertical: "TOPO" | "CENTRO" | "BAIXO";
    sangria: "NENHUMA" | "ESQUERDA" | "DIREITA";
  };
  colunas: {
    id: string;
    fundo: {
      tipo: "COR" | "IMAGEM" | "NENHUM";
      cor?: string;
      media?: unknown;
      crop?: unknown;
    };
    elementos: SectionColumnElement[];
  }[];
};

const DEFAULT_TEXT_STYLE: TextElementStyle = {
  fonte: "PRINCIPAL",
  peso: "REGULAR",
  tamanho: "1rem",
  cor: "inherit",
  alinhamento: "ESQUERDA",
  letterSpacing: "0",
  lineHeight: "1.35",
  link: "",
  preset: "PARAGRAFO",
};

const TEXT_PRESETS: Record<TextElementStyle["preset"], Partial<TextElementStyle>> = {
  TITULO: {
    peso: "SEMIBOLD",
    tamanho: "2.25rem",
    lineHeight: "1.05",
    preset: "TITULO",
  },
  SUBTITULO: {
    peso: "REGULAR",
    tamanho: "1.5rem",
    lineHeight: "1.2",
    preset: "SUBTITULO",
  },
  PARAGRAFO: {
    peso: "REGULAR",
    tamanho: "1rem",
    lineHeight: "1.5",
    preset: "PARAGRAFO",
  },
  BOTAO: {
    peso: "SEMIBOLD",
    tamanho: "0.875rem",
    letterSpacing: "0.04em",
    lineHeight: "1.1",
    preset: "BOTAO",
  },
  CUSTOMIZADO: {
    preset: "CUSTOMIZADO",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function aplicarPresetTexto(
  estilo: Partial<TextElementStyle>,
  preset: TextElementStyle["preset"]
): TextElementStyle {
  return {
    ...DEFAULT_TEXT_STYLE,
    ...estilo,
    ...TEXT_PRESETS[preset],
    preset,
  };
}

export function normalizarElementoTexto(
  value: unknown,
  fallback: Partial<TextElementConfig> = {}
): TextElementConfig {
  const data = isRecord(value) ? value : {};
  const estilo = isRecord(data.estilo) ? data.estilo : {};
  const tipo = getString(data.tipo, fallback.tipo || "paragrafo") as TextElementKind;
  const preset =
    tipo === "titulo"
      ? "TITULO"
      : tipo === "subtitulo"
        ? "SUBTITULO"
        : tipo === "botaoLabel"
          ? "BOTAO"
          : "PARAGRAFO";

  return {
    id: getString(data.id, fallback.id || `texto-${Date.now()}`),
    tipo,
    conteudo: getString(data.conteudo, fallback.conteudo || ""),
    estilo: aplicarPresetTexto(
      {
        fonte: getString(estilo.fonte, DEFAULT_TEXT_STYLE.fonte) as TextElementStyle["fonte"],
        peso: getString(estilo.peso, DEFAULT_TEXT_STYLE.peso) as TextElementStyle["peso"],
        tamanho: getString(estilo.tamanho, DEFAULT_TEXT_STYLE.tamanho),
        cor: getString(estilo.cor, DEFAULT_TEXT_STYLE.cor),
        alinhamento: getString(
          estilo.alinhamento,
          DEFAULT_TEXT_STYLE.alinhamento
        ) as TextElementStyle["alinhamento"],
        letterSpacing: getString(estilo.letterSpacing, DEFAULT_TEXT_STYLE.letterSpacing),
        lineHeight: getString(estilo.lineHeight, DEFAULT_TEXT_STYLE.lineHeight),
        link: getString(estilo.link),
      },
      getString(estilo.preset, preset) as TextElementStyle["preset"]
    ),
  };
}

export function extrairEstiloAtualTexto(elemento: TextElementConfig): TextElementStyle {
  return normalizarElementoTexto(elemento).estilo;
}

export function atualizarElementoTexto(
  elemento: TextElementConfig,
  patch: Partial<TextElementConfig> & { estilo?: Partial<TextElementStyle> }
): TextElementConfig {
  return normalizarElementoTexto({
    ...elemento,
    ...patch,
    estilo: {
      ...elemento.estilo,
      ...patch.estilo,
    },
  });
}

export function criarSecaoColunasPadrao(): SectionColumnsConfig {
  return {
    tipo: "SECAO_COLUNAS",
    layout: {
      colunas: 2,
      proporcaoDesktop: "50/50",
      gap: 32,
      altura: "AUTO",
      alinhamentoVertical: "CENTRO",
      sangria: "NENHUMA",
    },
    colunas: [
      {
        id: "coluna-texto",
        fundo: { tipo: "NENHUM" },
        elementos: [
          {
            id: "elemento-titulo",
            tipo: "TITULO",
            texto: normalizarElementoTexto(null, {
              id: "titulo",
              tipo: "titulo",
              conteudo: "Titulo da secao",
            }),
          },
          {
            id: "elemento-texto",
            tipo: "TEXTO",
            texto: normalizarElementoTexto(null, {
              id: "texto",
              tipo: "paragrafo",
              conteudo: "Texto de apoio da secao.",
            }),
          },
        ],
      },
      {
        id: "coluna-midia",
        fundo: { tipo: "IMAGEM", media: null, crop: null },
        elementos: [],
      },
    ],
  };
}
