import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getBackgroundClass,
  getBoolean,
  getButtonRadiusClass,
  getButtonHref,
  getImageDesktop,
  getImageMobile,
  getMediaPosition,
  getResponsiveTextAlignClass,
  getRichText,
  getSpacingClass,
  getString,
  getStringWithDefault,
  getTextColorForBackground,
  hasTextContent,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

function getAlignmentClass(alinhamento: string) {
  if (alinhamento === "ESQUERDA") return "items-start text-left";
  if (alinhamento === "DIREITA") return "items-end text-right";

  return "items-center text-center";
}

function getJustifyClass(alinhamento: string) {
  if (alinhamento === "ESQUERDA") return "justify-start";
  if (alinhamento === "DIREITA") return "justify-end";

  return "justify-center";
}

function getWidthClass(largura: string) {
  if (largura === "ESTREITA") return "max-w-2xl";
  if (largura === "LARGA") return "max-w-5xl";

  return "max-w-3xl";
}

function getLayout(value: string) {
  if (
    value === "TEXTO_MIDIA" ||
    value === "MIDIA_TEXTO" ||
    value === "SOBRE_MIDIA"
  ) {
    return value;
  }

  return "TEXTO_CENTRALIZADO";
}

export default function CtaPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const titulo = getString(config, "titulo");
  const texto = getString(config, ["texto", "descricao", "conteudo"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const textoRichText = getRichText(config, ["textoRichText", "subtituloRichText"]);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const alinhamentoTextoDesktop = getString(
    config,
    "alinhamentoTextoDesktop",
    alinhamento
  );
  const alinhamentoTextoMobile = getString(
    config,
    "alinhamentoTextoMobile",
    alinhamentoTextoDesktop
  );
  const textAlignClass = getResponsiveTextAlignClass({
    desktop: alinhamentoTextoDesktop,
    mobile: alinhamentoTextoMobile,
    fallback: alinhamento,
  });
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "PILULA")
  );
  const larguraConteudo = getString(config, "larguraConteudo", "MEDIA");
  const layoutDesktop = getLayout(getString(config, "layoutDesktop"));
  const layoutMobile = getLayout(getString(config, "layoutMobile"));
  const tipoMidia = getString(config, "tipoMidia", "IMAGEM");
  const imageDesktop = getImageDesktop(config);
  const imageMobile = getImageMobile(config);
  const videoDesktop = getString(config, "videoDesktopUrl");
  const videoMobile = getString(config, "videoMobileUrl");
  const hasMedia =
    getBoolean(config, "exibirMidia", false) &&
    Boolean(imageDesktop || imageMobile || videoDesktop || videoMobile);
  const exibirTexto = getBoolean(config, "exibirTexto", true);
  const textoBotaoPrimario = getStringWithDefault(
    config,
    ["textoBotaoPrimario", "textoBotao", "botaoTexto"],
    "Saiba mais"
  );
  const linkBotaoPrimario = getButtonHref(config, [
    "linkBotaoPrimario",
    "linkBotao",
    "botaoLink",
    "linkUrl",
  ]);
  const textoBotaoSecundario = getStringWithDefault(config, [
    "textoBotaoSecundario",
    "botaoSecundarioTexto",
  ]);
  const linkBotaoSecundario = getButtonHref(config, [
    "linkBotaoSecundario",
    "botaoSecundarioLink",
  ]);
  const hasTitulo = exibirTexto && hasTextContent(tituloRichText, titulo);
  const hasTexto = exibirTexto && hasTextContent(textoRichText, texto);
  const hasBotaoPrimario =
    exibirTexto &&
    getBoolean(config, "exibirBotaoPrimario", true) &&
    Boolean(textoBotaoPrimario && linkBotaoPrimario);
  const hasBotaoSecundario =
    exibirTexto &&
    getBoolean(config, "exibirBotaoSecundario", false) &&
    Boolean(textoBotaoSecundario && linkBotaoSecundario);
  const hasContent =
    hasTitulo || hasTexto || hasBotaoPrimario || hasBotaoSecundario;

  if (!hasContent && !hasMedia) return null;

  function getSafeLayout(layout: string) {
    return layout === "SOBRE_MIDIA" && !hasMedia ? "TEXTO_CENTRALIZADO" : layout;
  }

  function renderMedia() {
    if (!hasMedia) return null;

    return (
      <div className="relative min-h-[320px] overflow-hidden rounded-sm bg-slate-100 md:min-h-[420px]">
        <PublicMediaRenderer
          tipoMidia={tipoMidia}
          imagemDesktopUrl={imageDesktop}
          imagemMobileUrl={imageMobile}
          videoDesktopUrl={videoDesktop}
          videoMobileUrl={videoMobile}
          videoPosterUrl={getString(config, "videoPosterUrl")}
          videoLoop={getBoolean(config, "videoLoop", true)}
          videoMuted={getString(config, "videoSom", "MUDO") !== "COM_SOM"}
          objectPositionDesktop={getMediaPosition(config, "Desktop")}
          objectPositionMobile={getMediaPosition(config, "Mobile")}
          alt={titulo}
        />
      </div>
    );
  }

  function renderContent(layout: string) {
    if (!hasContent) return null;

    const displayColors =
      layout === "SOBRE_MIDIA"
        ? {
            title: "text-white",
            body: "text-white/82",
            border: "border-white/55",
          }
        : colors;

    return (
      <div
        className={`flex flex-col justify-center ${getAlignmentClass(
          alinhamento
        )} ${
          layout === "TEXTO_CENTRALIZADO" ? getWidthClass(larguraConteudo) : ""
        }`}
      >
        <div className={textAlignClass}>
        {hasTitulo ? (
          <PublicRichTextRenderer
            value={tituloRichText}
            fallback={titulo}
            className={`text-3xl font-light leading-tight md:text-5xl ${displayColors.title}`}
            paragraphClassName="mb-0"
          />
        ) : null}
        {hasTexto ? (
          <PublicRichTextRenderer
            value={textoRichText}
            fallback={texto}
            className={`mt-4 text-base leading-7 md:text-lg ${displayColors.body}`}
            paragraphClassName="mb-0"
          />
        ) : null}
        {hasBotaoPrimario || hasBotaoSecundario ? (
          <div className={`mt-7 flex flex-wrap gap-3 ${getJustifyClass(alinhamento)}`}>
            {hasBotaoPrimario ? (
              <Link
                href={linkBotaoPrimario}
                className={`inline-flex min-h-11 items-center justify-center bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 ${buttonRadiusClass}`}
              >
                {textoBotaoPrimario}
              </Link>
            ) : null}
            {hasBotaoSecundario ? (
              <Link
                href={linkBotaoSecundario}
                className={`inline-flex min-h-11 items-center justify-center border px-6 text-sm font-semibold transition ${buttonRadiusClass} ${displayColors.border} ${displayColors.title}`}
              >
                {textoBotaoSecundario}
              </Link>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>
    );
  }

  function renderSection(layout: string, viewportClass: string, desktop: boolean) {
    const safeLayout = getSafeLayout(layout);
    const media = renderMedia();
    const content = renderContent(safeLayout);

    if (safeLayout === "SOBRE_MIDIA" && media) {
      return (
        <section
          className={`relative overflow-hidden ${viewportClass} ${getSpacingClass(config)}`}
        >
          <div className="absolute inset-0">{media}</div>
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="relative z-10 mx-auto flex min-h-[480px] max-w-7xl py-16">
            <div
              className={`flex w-full flex-col justify-center text-white ${getAlignmentClass(
                alinhamento
              )}`}
            >
              <div className={getWidthClass(larguraConteudo)}>{content}</div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section
        className={`${viewportClass} ${getBackgroundClass(corFundo)} ${getSpacingClass(config)}`}
      >
        <div
          className={`mx-auto grid max-w-7xl gap-8 lg:items-center lg:gap-12 ${
            desktop && hasMedia && safeLayout !== "TEXTO_CENTRALIZADO"
              ? "lg:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {safeLayout === "MIDIA_TEXTO" ? media : null}
          {content}
          {safeLayout === "TEXTO_MIDIA" ? media : null}
          {safeLayout === "TEXTO_CENTRALIZADO" ? media : null}
        </div>
      </section>
    );
  }

  return (
    <>
      {renderSection(layoutMobile, "lg:hidden", false)}
      {renderSection(layoutDesktop, "hidden lg:block", true)}
    </>
  );
}
