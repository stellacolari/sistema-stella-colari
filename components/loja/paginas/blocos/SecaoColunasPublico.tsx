import type { CSSProperties } from "react";
import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  criarSecaoColunasPadrao,
  normalizarElementoTexto,
  type SectionColumnElement,
  type SectionColumnsConfig,
  type TextElementConfig,
} from "@/components/loja/paginas/textElements";
import {
  asConfig,
  getNumber,
  getString,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

type SecaoColunasPublicoProps = BlocoPublicoProps & {
  modo?: "publico" | "editor";
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getRecord(value: unknown) {
  return asConfig(value);
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeTextElement(value: unknown, fallback: Partial<TextElementConfig>) {
  return normalizarElementoTexto(value, fallback);
}

function normalizeElement(value: unknown, index: number): SectionColumnElement {
  const data = getRecord(value);
  const tipo = getString(data, "tipo", "TEXTO");
  const id = getString(data, "id", `elemento-${index + 1}`);

  if (tipo === "IMAGEM") {
    return {
      id,
      tipo: "IMAGEM",
      url: getString(data, ["url", "imagemUrl", "imagemDesktopUrl"]),
      mobileUrl: getString(data, ["mobileUrl", "imagemMobileUrl"]),
      alt: getString(data, "alt"),
      crop: data.crop,
      link: getString(data, "link"),
    };
  }

  if (tipo === "ESPACADOR") {
    return {
      id,
      tipo: "ESPACADOR",
      altura: clamp(getNumber(data, "altura", 32), 8, 220),
    };
  }

  if (tipo === "BOTAO") {
    return {
      id,
      tipo: "BOTAO",
      link: getString(data, "link"),
      abrirNovaAba: Boolean(data.abrirNovaAba),
      texto: normalizeTextElement(data.texto, {
        id: `${id}-texto`,
        tipo: "botaoLabel",
        conteudo: "Conhecer",
      }),
    };
  }

  if (tipo === "TITULO") {
    return {
      id,
      tipo: "TITULO",
      texto: normalizeTextElement(data.texto, {
        id: `${id}-texto`,
        tipo: "titulo",
        conteudo: "Titulo da secao",
      }),
    };
  }

  return {
    id,
    tipo: "TEXTO",
    texto: normalizeTextElement(data.texto, {
      id: `${id}-texto`,
      tipo: "paragrafo",
      conteudo: "Texto de apoio da secao.",
    }),
  };
}

function normalizeConfig(config: unknown): SectionColumnsConfig {
  const fallback = criarSecaoColunasPadrao();
  const data = getRecord(config);
  const layout = getRecord(data.layout);
  const design = getRecord(data.design);
  const responsivo = getRecord(data.responsivo);
  const rawColumns = getArray(data.colunas);
  const columns = (rawColumns.length > 0 ? rawColumns : fallback.colunas).slice(0, 2);

  return {
    ...fallback,
    layout: {
      ...fallback.layout,
      colunas: clamp(getNumber(layout, "colunas", fallback.layout.colunas), 1, 2) as 1 | 2,
      proporcaoDesktop: getString(
        layout,
        "proporcaoDesktop",
        fallback.layout.proporcaoDesktop
      ) as SectionColumnsConfig["layout"]["proporcaoDesktop"],
      proporcaoCustom: Array.isArray(layout.proporcaoCustom)
        ? layout.proporcaoCustom.map(Number).filter(Number.isFinite)
        : undefined,
      gap: clamp(getNumber(layout, "gap", fallback.layout.gap), 0, 96),
      altura: getString(
        layout,
        "altura",
        fallback.layout.altura
      ) as SectionColumnsConfig["layout"]["altura"],
      alinhamentoVertical: getString(
        layout,
        "alinhamentoVertical",
        fallback.layout.alinhamentoVertical
      ) as SectionColumnsConfig["layout"]["alinhamentoVertical"],
      largura: getString(
        layout,
        "largura",
        fallback.layout.largura
      ) as SectionColumnsConfig["layout"]["largura"],
      sangria: getString(
        layout,
        "sangria",
        fallback.layout.sangria
      ) as SectionColumnsConfig["layout"]["sangria"],
      paddingDesktop: clamp(
        getNumber(layout, "paddingDesktop", fallback.layout.paddingDesktop),
        0,
        160
      ),
      paddingMobile: clamp(
        getNumber(layout, "paddingMobile", fallback.layout.paddingMobile),
        0,
        80
      ),
    },
    colunas: columns.map((column, index) => {
      const columnData = getRecord(column);
      const fundo = getRecord(columnData.fundo);

      return {
        id: getString(columnData, "id", `coluna-${index + 1}`),
        largura: clamp(getNumber(columnData, "largura", 50), 10, 90),
        fundo: {
          tipo: getString(fundo, "tipo", "NENHUM") as "COR" | "IMAGEM" | "NENHUM",
          cor: getString(fundo, "cor", "#f8fafc"),
          media: fundo.media,
          crop: fundo.crop,
          overlay: clamp(getNumber(fundo, "overlay", 0), 0, 85),
        },
        padding: clamp(getNumber(columnData, "padding", 32), 0, 96),
        elementos: getArray(columnData.elementos).map(normalizeElement),
      };
    }),
    design: {
      fundoSecao: getString(design, "fundoSecao", fallback.design.fundoSecao),
      corTextoPadrao: getString(
        design,
        "corTextoPadrao",
        fallback.design.corTextoPadrao
      ),
      raio: clamp(getNumber(design, "raio", fallback.design.raio || 0), 0, 32),
    },
    responsivo: {
      mobile: getString(
        responsivo,
        "mobile",
        fallback.responsivo.mobile
      ) as SectionColumnsConfig["responsivo"]["mobile"],
      ordemMobile: Array.isArray(responsivo.ordemMobile)
        ? responsivo.ordemMobile.map(String)
        : fallback.responsivo.ordemMobile,
    },
  };
}

function getHeightClass(value: string) {
  if (value === "COMPACTA") return "min-h-[360px]";
  if (value === "ALTA") return "min-h-[720px]";
  if (value === "TELA_CHEIA") return "min-h-[100svh]";
  if (value === "PADRAO") return "min-h-[540px]";
  return "";
}

function getAlignClass(value: string) {
  if (value === "TOPO") return "items-start";
  if (value === "BAIXO") return "items-end";
  if (value === "ESTICAR") return "items-stretch";
  return "items-center";
}

function getColumnsClass(config: SectionColumnsConfig) {
  if (config.layout.colunas === 1) return "lg:grid-cols-1";
  if (config.layout.proporcaoDesktop === "40/60") return "lg:grid-cols-[0.8fr_1.2fr]";
  if (config.layout.proporcaoDesktop === "60/40") return "lg:grid-cols-[1.2fr_0.8fr]";
  if (
    config.layout.proporcaoDesktop === "CUSTOM" &&
    config.layout.proporcaoCustom?.length === 2
  ) {
    const [first, second] = config.layout.proporcaoCustom;
    return `lg:grid-cols-[${first}fr_${second}fr]`;
  }

  return "lg:grid-cols-2";
}

function getMediaFromColumn(column: SectionColumnsConfig["colunas"][number]) {
  const media = getRecord(column.fundo.media);
  const desktop = getRecord(media.desktop);
  const mobile = getRecord(media.mobile);
  const mobileAlternative = Boolean(media.usarImagemMobileAlternativa);

  return {
    desktopUrl: getString(desktop, "url"),
    mobileUrl: mobileAlternative ? getString(media, "mobileUrl") : getString(desktop, "url"),
    alt: getString(desktop, "alt"),
    desktopPosition: `${clamp(getNumber(desktop, "positionX", 50), 0, 100)}% ${clamp(
      getNumber(desktop, "positionY", 50),
      0,
      100
    )}%`,
    mobilePosition: `${clamp(getNumber(mobile, "positionX", 50), 0, 100)}% ${clamp(
      getNumber(mobile, "positionY", 50),
      0,
      100
    )}%`,
    desktopZoom: clamp(getNumber(desktop, "zoom", 100), 80, 240) / 100,
    mobileZoom: clamp(getNumber(mobile, "zoom", 100), 80, 240) / 100,
  };
}

function getTextStyle(text: TextElementConfig): CSSProperties {
  const weightMap: Record<string, number> = {
    LIGHT: 300,
    REGULAR: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    BLACK: 900,
  };

  return {
    fontFamily:
      text.estilo.fonte === "EDITORIAL"
        ? "Georgia, 'Times New Roman', serif"
        : "var(--font-primary)",
    fontWeight: weightMap[text.estilo.peso] || 400,
    fontSize: text.estilo.tamanho,
    color: text.estilo.cor,
    textAlign:
      text.estilo.alinhamento === "DIREITA"
        ? "right"
        : text.estilo.alinhamento === "CENTRO"
          ? "center"
          : "left",
    letterSpacing: text.estilo.letterSpacing,
    lineHeight: text.estilo.lineHeight,
  };
}

function isBrandColor(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, "");

  return [
    "#2e7b99",
    "rgb(46,123,153)",
    "rgba(46,123,153,1)",
    "var(--brand-blue)",
  ].includes(normalized || "");
}

function renderTextContent(
  element: Extract<SectionColumnElement, { texto: TextElementConfig }>,
  forceBrandForeground = false
) {
  const content = element.texto.conteudo;
  const buttonOnBrand = element.tipo === "BOTAO" && forceBrandForeground;
  const forcedTextColor = buttonOnBrand
    ? "var(--stella-inverted-cta-text)"
    : element.tipo === "BOTAO" || forceBrandForeground
      ? "var(--brand-blue-foreground)"
      : undefined;
  const commonProps = {
    "data-stella-inline-field": "secaoTexto",
    "data-stella-editorial-gallery-item-id": element.id,
    style: {
      ...getTextStyle(element.texto),
      color: forcedTextColor || getTextStyle(element.texto).color,
    },
    forceColor: forcedTextColor,
  };

  if (!content.trim()) return null;

  if (element.tipo === "TITULO") {
    return (
      <PublicRichTextRenderer
        value={element.texto.richText}
        fallback={content}
        {...commonProps}
        className="whitespace-pre-line text-3xl md:text-5xl"
      />
    );
  }

  if (element.tipo === "BOTAO") {
    const className = buttonOnBrand
      ? "inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-white bg-white px-6 text-sm font-semibold text-[var(--stella-inverted-cta-text)] [--stella-inverted-cta-text:var(--brand-blue)] transition hover:[--stella-inverted-cta-text:var(--brand-blue-dark)]"
      : "inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-[var(--brand-blue)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-dark)]";
    const buttonContent = (
      <PublicRichTextRenderer
        value={element.texto.richText}
        fallback={content}
        {...commonProps}
        inline
        className={className}
      />
    );

    if (!element.link) {
      return buttonContent;
    }

    return (
      <Link
        href={element.link}
        target={element.abrirNovaAba ? "_blank" : undefined}
        rel={element.abrirNovaAba ? "noreferrer" : undefined}
        className="inline-block w-fit"
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <PublicRichTextRenderer
      value={element.texto.richText}
      fallback={content}
      {...commonProps}
      className="whitespace-pre-line text-base md:text-lg"
    />
  );
}

function renderElement(
  element: SectionColumnElement,
  forceBrandForeground = false
) {
  if (element.tipo === "ESPACADOR") {
    return <div key={element.id} style={{ height: `${element.altura}px` }} />;
  }

  if (element.tipo === "IMAGEM") {
    const image = (
      <div
        data-stella-editorial-gallery-item-id={element.id}
        className="min-h-[260px] overflow-hidden bg-slate-100"
      >
        <PublicMediaRenderer
          imagemDesktopUrl={element.url}
          imagemMobileUrl={element.mobileUrl}
          alt={element.alt}
          placeholder="Imagem"
        />
      </div>
    );

    return element.link ? (
      <Link key={element.id} href={element.link} className="block">
        {image}
      </Link>
    ) : (
      <div key={element.id}>{image}</div>
    );
  }

  return (
    <div key={element.id}>
      {renderTextContent(element, forceBrandForeground)}
    </div>
  );
}

export default function SecaoColunasPublico({
  bloco,
  modo = "publico",
}: SecaoColunasPublicoProps) {
  const config = normalizeConfig(bloco.configJson);
  const isEditor = modo === "editor";
  const columns = config.colunas.slice(0, config.layout.colunas);
  const stackedMobile = config.responsivo.mobile === "EMPILHAR";
  const bleedLeft = config.layout.sangria === "ESQUERDA" || config.layout.sangria === "AMBAS";
  const bleedRight = config.layout.sangria === "DIREITA" || config.layout.sangria === "AMBAS";
  const isBrandSection = isBrandColor(config.design.fundoSecao);

  return (
    <section
      className={`overflow-hidden ${getHeightClass(config.layout.altura)}`}
      style={{
        backgroundColor: config.design.fundoSecao,
        color: isBrandSection
          ? "var(--brand-blue-foreground)"
          : config.design.corTextoPadrao,
      }}
    >
      <div
        className={`mx-auto py-[var(--secao-padding-mobile)] md:py-[var(--secao-padding-desktop)] ${
          config.layout.largura === "CONTIDA" ? "max-w-7xl" : "max-w-none"
        }`}
        style={
          {
            "--secao-padding-desktop": `${config.layout.paddingDesktop}px`,
            "--secao-padding-mobile": `${config.layout.paddingMobile}px`,
          } as CSSProperties
        }
      >
        <div
          className={`grid ${
            stackedMobile ? "grid-cols-1" : "grid-cols-2"
          } ${getColumnsClass(config)} ${getAlignClass(config.layout.alinhamentoVertical)} ${
            config.layout.largura === "CONTIDA"
              ? "px-[var(--secao-padding-mobile)] md:px-[var(--secao-padding-desktop)]"
              : ""
          }`}
          style={{
            gap: `${config.layout.gap}px`,
          }}
        >
          {columns.map((column, index) => {
            const media = getMediaFromColumn(column);
            const hasImageBackground = column.fundo.tipo === "IMAGEM";
            const configuredColumnColor =
              column.fundo.tipo === "COR" ? column.fundo.cor?.trim() : "";
            const columnColor =
              configuredColumnColor &&
              configuredColumnColor.toLowerCase() !== "transparent"
                ? configuredColumnColor
                : config.design.fundoSecao;
            const forceBrandForeground =
              !hasImageBackground && isBrandColor(columnColor);
            const bleedColumn =
              (index === 0 && bleedLeft) || (index === columns.length - 1 && bleedRight);

            return (
              <div
                key={column.id}
                data-stella-editorial-gallery-item-id={column.id}
                className={`relative min-h-[320px] overflow-hidden ${
                  isEditor ? "outline-1 outline-offset-[-1px] outline-transparent hover:outline-indigo-300" : ""
                }`}
                style={{
                  backgroundColor:
                    column.fundo.tipo === "COR" ? column.fundo.cor : "transparent",
                  borderRadius: `${config.design.raio || 0}px`,
                  marginLeft: bleedColumn && index === 0 ? `-${config.layout.paddingMobile}px` : undefined,
                  marginRight:
                    bleedColumn && index === columns.length - 1
                      ? `-${config.layout.paddingMobile}px`
                      : undefined,
                  "--secao-coluna-zoom-desktop": media.desktopZoom,
                  "--secao-coluna-zoom-mobile": media.mobileZoom,
                } as CSSProperties}
              >
                {hasImageBackground ? (
                  <div className="absolute inset-0">
                    <PublicMediaRenderer
                      imagemDesktopUrl={media.desktopUrl}
                      imagemMobileUrl={media.mobileUrl}
                      objectPositionDesktop={media.desktopPosition}
                      objectPositionMobile={media.mobilePosition}
                      mediaClassName="scale-[var(--secao-coluna-zoom-mobile)] md:scale-[var(--secao-coluna-zoom-desktop)]"
                      alt={media.alt}
                      placeholder={isEditor ? "Imagem de fundo" : ""}
                      className="h-full"
                    />
                    <div
                      className="absolute inset-0 bg-slate-950"
                      style={{
                        opacity: (column.fundo.overlay || 0) / 100,
                      }}
                    />
                  </div>
                ) : null}

                <div
                  className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-5"
                  style={
                    {
                      padding: `${column.padding}px`,
                    } as CSSProperties
                  }
                >
                  {column.elementos.length > 0 ? (
                    column.elementos.map((element) =>
                      renderElement(element, forceBrandForeground)
                    )
                  ) : isEditor ? (
                    <div className="rounded-md border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                      Adicionar elemento
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
