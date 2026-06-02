import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getArray,
  getBackgroundClass,
  getBoolean,
  getButtonRadiusClass,
  getGridColumnsClass,
  getImageDesktop,
  getImageMobile,
  getMediaPosition,
  getNumber,
  getResponsiveTextAlignClass,
  getRichText,
  getSpacingClass,
  getString,
  getTextColorForBackground,
  hasTextContent,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

function getContentWidthClass(value: string) {
  if (value === "CONTIDA") return "max-w-6xl";
  if (value === "TOTAL") return "max-w-none";

  return "max-w-7xl";
}

function getHeaderFlexClass(value: string) {
  if (value === "DIREITA") return "justify-end";
  if (value === "CENTRO") return "justify-center";

  return "justify-start";
}

function getResponsiveHeaderFlexClass(desktop: string, mobile: string) {
  const desktopClass =
    desktop === "DIREITA"
      ? "lg:justify-end"
      : desktop === "CENTRO"
        ? "lg:justify-center"
        : "lg:justify-start";

  return `${getHeaderFlexClass(mobile)} ${desktopClass}`;
}

function getHeaderBlockAlignClass(desktop: string, mobile: string) {
  const mobileClass =
    mobile === "DIREITA" ? "ml-auto" : mobile === "CENTRO" ? "mx-auto" : "";
  const desktopClass =
    desktop === "DIREITA"
      ? "lg:ml-auto lg:mr-0"
      : desktop === "CENTRO"
        ? "lg:mx-auto"
        : "lg:mx-0";

  return `${mobileClass} ${desktopClass}`;
}

function normalizarPresetMosaico(value: string) {
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

function normalizarGapMosaico(value: string) {
  if (["PEQUENO", "PADRAO", "GRANDE", "EXTRA"].includes(value)) {
    return value;
  }

  return "PADRAO";
}

function getMosaicGapPx(value: string) {
  const normalized = normalizarGapMosaico(value);

  if (normalized === "PEQUENO") return 12;
  if (normalized === "GRANDE") return 32;
  if (normalized === "EXTRA") return 44;

  return 24;
}

function getTamanhoMosaicoPreset(preset: string, index: number) {
  const normalized = normalizarPresetMosaico(preset);

  if (normalized === "MOSAICO_3_DESTAQUE") {
    return ["DESTAQUE", "MEDIO", "MEDIO"][index] || "MEDIO";
  }

  if (normalized === "GRID_4_EDITORIAL" || normalized === "GRID_3_EDITORIAL") {
    return "MEDIO";
  }

  return "AUTO";
}

function getTamanhoMosaicoEfetivo(item: Record<string, unknown>, index: number, preset: string) {
  const normalizedPreset = normalizarPresetMosaico(preset);
  if (["MOSAICO_2_PARES", "MOSAICO_4_EDITORIAL", "MOSAICO_6_REFERENCIA"].includes(normalizedPreset)) {
    return "AUTO";
  }

  const tamanho = getString(item, "tamanhoMosaico", "AUTO");
  return tamanho && tamanho !== "AUTO" ? tamanho : getTamanhoMosaicoPreset(preset, index);
}

function getMosaicGridClass(preset: string) {
  const normalized = normalizarPresetMosaico(preset);

  if (normalized === "MOSAICO_2_PARES" || normalized === "MOSAICO_4_EDITORIAL") {
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

function getMosaicItemClass(tamanho: string, index: number, preset: string) {
  const normalizedPreset = normalizarPresetMosaico(preset);

  if (normalizedPreset === "MOSAICO_2_PARES") {
    return "aspect-[4/5]";
  }

  if (normalizedPreset === "MOSAICO_4_EDITORIAL") {
    return "aspect-[4/5]";
  }

  if (normalizedPreset === "MOSAICO_6_REFERENCIA") {
    return "aspect-[4/5]";
  }

  if (normalizedPreset === "MOSAICO_3_DESTAQUE") {
    if (index === 0 || tamanho === "DESTAQUE") {
      return "aspect-[4/5] md:row-span-2 md:min-h-[620px]";
    }

    return "aspect-[4/5] md:min-h-[300px]";
  }

  if (tamanho === "DESTAQUE") {
    return "md:col-span-2 md:row-span-2 aspect-[4/5] md:aspect-auto md:min-h-[620px]";
  }
  if (tamanho === "ALTO") {
    return "md:row-span-2 aspect-[4/5] md:aspect-auto md:min-h-[560px]";
  }
  if (tamanho === "LARGO") {
    return "md:col-span-2 aspect-[16/9] md:min-h-[300px]";
  }
  if (tamanho === "GRANDE") {
    return "md:row-span-2 aspect-[3/4] md:aspect-auto md:min-h-[480px]";
  }
  if (tamanho === "PEQUENO") {
    return "aspect-[4/3] md:min-h-[220px]";
  }

  return "aspect-[4/5]";
}

function getGridColumnsByPreset(preset: string, fallback: number) {
  const normalized = normalizarPresetMosaico(preset);
  if (normalized === "GRID_3_EDITORIAL") return 3;
  if (normalized === "GRID_4_EDITORIAL") return 4;
  return fallback;
}

function getHeaderWidthClass(width: number) {
  if (width <= 25) return "lg:grid-cols-[minmax(0,0.32fr)_minmax(0,1.68fr)]";
  if (width <= 30) return "lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1.58fr)]";
  if (width >= 40) return "lg:grid-cols-[minmax(0,0.66fr)_minmax(0,1.34fr)]";
  return "lg:grid-cols-[minmax(0,0.52fr)_minmax(0,1.48fr)]";
}

function getLabelPositionClass(posicao: string) {
  if (posicao === "INFERIOR_CENTRO") return "bottom-5 left-1/2 -translate-x-1/2 text-center";
  if (posicao === "INFERIOR_DIREITA") return "bottom-5 right-5 text-right";
  if (posicao === "SUPERIOR_ESQUERDA") return "left-5 top-5";
  if (posicao === "CENTRO") return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center";
  return "bottom-5 left-5";
}

function getLabelSizeClass(tamanho: string) {
  if (tamanho === "GRANDE") return "px-5 py-4";
  if (tamanho === "MEDIA") return "px-4 py-3";
  return "px-3 py-2.5";
}

function getLabelWidthClass(largura: string) {
  if (largura === "LARGA") return "w-[min(82%,420px)]";
  if (largura === "MEDIA") return "w-[min(68%,320px)]";
  return "w-fit max-w-[78%]";
}

function HeaderImage({
  desktopUrl,
  mobileUrl,
  alt,
  desktopWidth,
  mobileWidth,
  alignDesktop,
  alignMobile,
}: {
  desktopUrl: string;
  mobileUrl: string;
  alt: string;
  desktopWidth: number;
  mobileWidth: number;
  alignDesktop: string;
  alignMobile: string;
}) {
  const imageDesktop = desktopUrl || mobileUrl;
  const imageMobile = mobileUrl || desktopUrl;

  if (!imageDesktop && !imageMobile) return null;

  return (
    <div className={`flex ${getResponsiveHeaderFlexClass(alignDesktop, alignMobile)}`}>
      {imageMobile ? (
        <img
          src={imageMobile}
          alt={alt}
          className="block h-auto max-w-full object-contain md:hidden"
          style={{ width: `${mobileWidth}px` }}
        />
      ) : null}
      {imageDesktop ? (
        <img
          src={imageDesktop}
          alt={alt}
          className={`h-auto max-w-full object-contain ${
            imageMobile ? "hidden md:block" : "block"
          }`}
          style={{ width: `${desktopWidth}px` }}
        />
      ) : null}
    </div>
  );
}

function getItemHref(item: Record<string, unknown>) {
  const tipoLink = getString(item, "tipoLink", "PERSONALIZADO");

  if (tipoLink === "CATEGORIA") {
    const slug = getString(item, "categoriaSlug");
    return slug ? `/loja/categoria/${slug}` : "";
  }

  return getString(item, "linkUrl");
}

function itemHasMedia(item: Record<string, unknown>) {
  return Boolean(
    getImageDesktop(item) ||
      getImageMobile(item) ||
      getString(item, "videoDesktopUrl") ||
      getString(item, "videoMobileUrl")
  );
}

function itemHasPublicContent(item: Record<string, unknown>) {
  const titulo =
    getString(item, "titulo") || getString(item, "categoriaNome");
  const subtitulo = getString(item, "subtitulo");
  const textoLink = getString(item, "textoLink");
  const href = getItemHref(item);

  return Boolean(
    hasTextContent(getRichText(item, "tituloRichText"), titulo) ||
      hasTextContent(getRichText(item, "subtituloRichText"), subtitulo) ||
      itemHasMedia(item) ||
      (textoLink && href)
  );
}

function ItemMedia({
  item,
  alt,
  className,
}: {
  item: Record<string, unknown>;
  alt: string;
  className: string;
}) {
  if (!itemHasMedia(item)) return null;

  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      <PublicMediaRenderer
        tipoMidia={getString(item, "tipoMidia", "IMAGEM")}
        imagemDesktopUrl={getImageDesktop(item)}
        imagemMobileUrl={getImageMobile(item)}
        videoDesktopUrl={getString(item, "videoDesktopUrl")}
        videoMobileUrl={getString(item, "videoMobileUrl")}
        objectPositionDesktop={getMediaPosition(item, "Desktop")}
        objectPositionMobile={getMediaPosition(item, "Mobile")}
        alt={alt}
      />
    </div>
  );
}

export default function ColecoesCategoriasPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const layoutVisual = getString(config, "layoutVisual", "MOSAICO_EDITORIAL");
  const estiloEtiqueta = getString(config, "estiloEtiqueta", "SOBREPOSTA");
  const presetMosaico = normalizarPresetMosaico(
    getString(config, "presetMosaico", "MOSAICO_4_EDITORIAL")
  );
  const gapMosaico = normalizarGapMosaico(
    getString(config, "gapMosaico", "PADRAO")
  );
  const gapMosaicoStyle = { gap: `${getMosaicGapPx(gapMosaico)}px` };
  const layoutVisualEfetivo = presetMosaico.startsWith("GRID_")
    ? "GRID_EDITORIAL"
    : layoutVisual;
  const tamanhoEtiqueta = getString(config, "tamanhoEtiqueta", "PEQUENA");
  const posicaoEtiqueta = getString(
    config,
    "posicaoEtiqueta",
    "INFERIOR_ESQUERDA"
  );
  const larguraEtiqueta = getString(config, "larguraEtiqueta", "AUTO");
  const exibirLinhaEtiqueta = getBoolean(config, "exibirLinhaEtiqueta", true);
  const exibirEtiqueta =
    getBoolean(config, "exibirEtiqueta", estiloEtiqueta !== "OCULTA") &&
    estiloEtiqueta !== "OCULTA";
  const exibirBotaoEtiqueta = getBoolean(config, "exibirBotaoEtiqueta", false);
  const cardInteiroClicavel = getBoolean(config, "cardInteiroClicavel", true);
  const larguraCabecalhoDesktop = getNumber(
    config,
    "larguraCabecalhoDesktop",
    32
  );
  const posicaoCabecalhoMosaico = getString(
    config,
    "posicaoCabecalhoMosaico",
    "LATERAL"
  );
  const larguraConteudo = getString(config, "larguraConteudo", "LARGA");
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "RETO")
  );
  const tipoCabecalho = getString(config, "tipoCabecalho", "TEXTO");
  const alinhamentoCabecalhoDesktop = getString(
    config,
    "alinhamentoCabecalhoDesktop",
    getString(config, "alinhamentoTextoDesktop", "ESQUERDA")
  );
  const alinhamentoCabecalhoMobile = getString(
    config,
    "alinhamentoCabecalhoMobile",
    getString(config, "alinhamentoTextoMobile", alinhamentoCabecalhoDesktop)
  );
  const headerAlign = getResponsiveTextAlignClass({
    desktop: alinhamentoCabecalhoDesktop,
    mobile: alinhamentoCabecalhoMobile,
    fallback: "ESQUERDA",
  });
  const titulo = getString(config, "titulo");
  const subtitulo = getString(config, ["subtitulo", "descricao", "texto"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, [
    "subtituloRichText",
    "textoRichText",
  ]);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasSubtitulo = hasTextContent(subtituloRichText, subtitulo);
  const hasLogoTitulo = Boolean(
    getString(config, "logoTituloUrl") ||
      getString(config, "logoTituloMobileUrl")
  );
  const hasImagemTitulo = Boolean(
    getString(config, "imagemTituloUrl") ||
      getString(config, "imagemTituloMobileUrl")
  );
  const hasCabecalho =
    (tipoCabecalho === "LOGO" && (hasLogoTitulo || hasSubtitulo)) ||
    (tipoCabecalho === "TEXTO_LOGO" &&
      (hasTitulo || hasLogoTitulo || hasSubtitulo)) ||
    (tipoCabecalho === "IMAGEM_TITULO" && (hasImagemTitulo || hasSubtitulo)) ||
    (tipoCabecalho !== "LOGO" &&
      tipoCabecalho !== "TEXTO_LOGO" &&
      tipoCabecalho !== "IMAGEM_TITULO" &&
      (hasTitulo || hasSubtitulo));
  const itens = getArray(config, "itens")
    .map(asConfig)
    .filter(itemHasPublicContent)
    .filter((item) => estiloEtiqueta !== "OCULTA" || itemHasMedia(item))
    .sort(
      (a, b) =>
        getNumber(a, "ordem", 0) - getNumber(b, "ordem", 0)
    );

  if (!hasCabecalho && itens.length === 0) {
    return null;
  }

  const widthClass = getContentWidthClass(larguraConteudo);
  const tituloTextual = (
    <>
      {hasTitulo ? (
        <PublicRichTextRenderer
          value={tituloRichText}
          fallback={titulo}
          className={`text-4xl font-light leading-tight md:text-6xl ${colors.title}`}
        />
      ) : null}
      {hasSubtitulo ? (
        <PublicRichTextRenderer
          value={subtituloRichText}
          fallback={subtitulo}
          className={`mt-4 max-w-2xl text-base leading-7 ${colors.body}`}
        />
      ) : null}
    </>
  );
  const logoTitulo = (
    <HeaderImage
      desktopUrl={getString(config, "logoTituloUrl")}
      mobileUrl={getString(config, "logoTituloMobileUrl")}
      alt={getString(config, "logoTituloAlt", titulo)}
      desktopWidth={getNumber(config, "logoTituloLarguraDesktop", 420)}
      mobileWidth={getNumber(config, "logoTituloLarguraMobile", 260)}
      alignDesktop={alinhamentoCabecalhoDesktop}
      alignMobile={alinhamentoCabecalhoMobile}
    />
  );
  const imagemTitulo = (
    <HeaderImage
      desktopUrl={getString(config, "imagemTituloUrl")}
      mobileUrl={getString(config, "imagemTituloMobileUrl")}
      alt={getString(config, "imagemTituloAlt", titulo)}
      desktopWidth={getNumber(config, "imagemTituloLarguraDesktop", 520)}
      mobileWidth={getNumber(config, "imagemTituloLarguraMobile", 300)}
      alignDesktop={alinhamentoCabecalhoDesktop}
      alignMobile={alinhamentoCabecalhoMobile}
    />
  );
  const logoPosition = getString(config, "logoTituloPosicao", "ABAIXO");
  const headerContent = hasCabecalho ? (
    <div
      className={`w-full max-w-4xl ${getHeaderBlockAlignClass(
        alinhamentoCabecalhoDesktop,
        alinhamentoCabecalhoMobile
      )} ${headerAlign}`}
    >
      {tipoCabecalho === "LOGO" ? (
        <>
          {logoTitulo}
          {hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-4 max-w-2xl text-base leading-7 ${colors.body}`}
            />
          ) : null}
        </>
      ) : tipoCabecalho === "IMAGEM_TITULO" ? (
        <>
          {imagemTitulo}
          {hasSubtitulo ? (
            <PublicRichTextRenderer
              value={subtituloRichText}
              fallback={subtitulo}
              className={`mt-4 max-w-2xl text-base leading-7 ${colors.body}`}
            />
          ) : null}
        </>
      ) : tipoCabecalho === "TEXTO_LOGO" ? (
        <div
          className={
            logoPosition === "AO_LADO"
              ? `flex flex-col gap-5 lg:flex-row lg:items-center ${getResponsiveHeaderFlexClass(
                  alinhamentoCabecalhoDesktop,
                  alinhamentoCabecalhoMobile
                )}`
              : "space-y-5"
          }
        >
          {logoPosition === "ACIMA" ? logoTitulo : null}
          <div>{tituloTextual}</div>
          {logoPosition !== "ACIMA" ? logoTitulo : null}
        </div>
      ) : (
        tituloTextual
      )}
    </div>
  ) : null;
  const renderItemLabel = (item: Record<string, unknown>, overlay: boolean) => {
    if (!exibirEtiqueta) return null;

    const tituloItem = getString(item, "titulo") || getString(item, "categoriaNome");
    const subtituloItem = getString(item, "subtitulo");
    const textoLink = getString(item, "textoLink", "Explorar");
    const href = getItemHref(item);
    const hasTituloItem = hasTextContent(
      getRichText(item, "tituloRichText"),
      tituloItem
    );
    const hasSubtituloItem = hasTextContent(
      getRichText(item, "subtituloRichText"),
      subtituloItem
    );

    if (!hasTituloItem && !hasSubtituloItem && !(textoLink && href)) {
      return null;
    }

    const wrapperClass = overlay
      ? `absolute z-10 bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur ${getLabelPositionClass(
          posicaoEtiqueta
        )} ${getLabelSizeClass(tamanhoEtiqueta)} ${getLabelWidthClass(larguraEtiqueta)} break-words`
      : "pt-5";

    return (
      <div className={wrapperClass}>
        <PublicRichTextRenderer
          value={getRichText(item, "tituloRichText")}
          fallback={tituloItem}
          className={`font-medium leading-snug ${
            overlay
              ? tamanhoEtiqueta === "GRANDE"
                ? "text-sm text-slate-950"
                : "text-xs text-slate-950"
              : `text-xl ${colors.title}`
          }`}
        />
        {exibirLinhaEtiqueta && overlay ? (
          <span className="my-2 block h-px w-8 bg-slate-950/30" />
        ) : null}
        <PublicRichTextRenderer
          value={getRichText(item, "subtituloRichText")}
          fallback={subtituloItem}
          className={
            overlay
              ? "mt-1 text-xs leading-5 text-slate-600"
              : `mt-2 text-sm leading-6 ${colors.body}`
          }
        />
        {exibirBotaoEtiqueta && textoLink && href ? (
          <span
            className={`mt-3 inline-flex min-h-8 items-center border border-current px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${buttonRadiusClass}`}
          >
            {textoLink}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <section
      className={`${getBackgroundClass(corFundo)} ${getSpacingClass(
        getString(config, "espacamento", "PADRAO")
      )}`}
    >
      <div
        className={`mx-auto ${widthClass} ${
          larguraConteudo === "TOTAL" ? "px-0" : "px-5 sm:px-6 lg:px-8"
        }`}
      >
        {layoutVisualEfetivo === "GRID_EDITORIAL" ? (
          <>
            {headerContent}

            {itens.length > 0 ? (
              <div
                className={`mt-10 grid ${getGridColumnsClass(
                  getNumber(config, "colunasMobile", 1),
                  getNumber(config, "colunasTablet", 2),
                  getGridColumnsByPreset(
                    presetMosaico,
                    getNumber(config, "colunasDesktop", 4)
                  )
                )}`}
                style={gapMosaicoStyle}
              >
                {itens.map((item, index) => {
                  const tituloItem =
                    getString(item, "titulo") || getString(item, "categoriaNome");
                  const href = getItemHref(item);
                  const content = (
                    <article>
                      <ItemMedia
                        item={item}
                        alt={tituloItem}
                        className="aspect-[4/5]"
                      />

                      {exibirEtiqueta ? (
                        renderItemLabel(item, false)
                      ) : null}
                    </article>
                  );

                  return href && cardInteiroClicavel ? (
                    <Link
                      key={getString(item, "id", `colecao-${index}`)}
                      href={href}
                      className="group block"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={getString(item, "id", `colecao-${index}`)}>
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : posicaoCabecalhoMosaico === "TOPO" ? (
          <>
            {headerContent}

            {itens.length > 0 ? (
              <div
                className={`mt-10 ${getMosaicGridClass(presetMosaico)}`}
                style={gapMosaicoStyle}
              >
                {itens.map((item, index) => {
                  const tituloItem =
                    getString(item, "titulo") || getString(item, "categoriaNome");
                  const href = getItemHref(item);
                  const tamanhoEfetivo = getTamanhoMosaicoEfetivo(
                    item,
                    index,
                    presetMosaico
                  );
                  const hasMedia = itemHasMedia(item);
                  const labelSobreposta = estiloEtiqueta === "SOBREPOSTA" && hasMedia;
                  const itemFrameClass = getMosaicItemClass(
                    tamanhoEfetivo,
                    index,
                    presetMosaico
                  );
                  const content = (
                    <article className="relative min-w-0">
                      {hasMedia ? (
                        <div
                          className={`relative overflow-hidden ${itemFrameClass}`}
                        >
                          <ItemMedia
                            item={item}
                            alt={tituloItem}
                            className="h-full min-h-full"
                          />
                          {labelSobreposta ? renderItemLabel(item, true) : null}
                        </div>
                      ) : null}
                      {exibirEtiqueta && !labelSobreposta
                        ? renderItemLabel(item, false)
                        : null}
                    </article>
                  );

                  return href && cardInteiroClicavel ? (
                    <Link
                      key={getString(item, "id", `colecao-${index}`)}
                      href={href}
                      className="group block"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={getString(item, "id", `colecao-${index}`)}>
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <div
            className={`grid gap-8 lg:items-start ${getHeaderWidthClass(
              larguraCabecalhoDesktop
            )}`}
          >
            {headerContent ? (
              <div className="lg:sticky lg:top-24">
                {headerContent}
              </div>
            ) : null}

            {itens.length > 0 ? (
              <div
                className={getMosaicGridClass(presetMosaico)}
                style={gapMosaicoStyle}
              >
                {itens.map((item, index) => {
                  const tituloItem =
                    getString(item, "titulo") || getString(item, "categoriaNome");
                  const href = getItemHref(item);
                  const tamanhoEfetivo = getTamanhoMosaicoEfetivo(
                    item,
                    index,
                    presetMosaico
                  );
                  const hasMedia = itemHasMedia(item);
                  const labelSobreposta = estiloEtiqueta === "SOBREPOSTA" && hasMedia;
                  const itemFrameClass = getMosaicItemClass(
                    tamanhoEfetivo,
                    index,
                    presetMosaico
                  );
                  const content = (
                    <article className="relative min-w-0">
                      {hasMedia ? (
                        <div
                          className={`relative overflow-hidden ${itemFrameClass}`}
                        >
                          <ItemMedia
                            item={item}
                            alt={tituloItem}
                            className="h-full min-h-full"
                          />
                          {labelSobreposta ? renderItemLabel(item, true) : null}
                        </div>
                      ) : null}
                      {exibirEtiqueta && !labelSobreposta
                        ? renderItemLabel(item, false)
                        : null}
                    </article>
                  );

                  return href && cardInteiroClicavel ? (
                    <Link
                      key={getString(item, "id", `colecao-${index}`)}
                      href={href}
                      className="group block"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={getString(item, "id", `colecao-${index}`)}>
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
