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
  getResponsiveTextAlignClass,
  getStringWithDefault,
  hasTextContent,
  getMediaPosition,
  getRichText,
  getSpacingClass,
  getString,
  getTextColorForBackground,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

function getDesktopLayoutClass(layout: string) {
  if (layout === "IMAGEM_DIREITA") return "lg:grid-cols-2";
  if (layout === "IMAGEM_ACIMA") return "lg:grid-cols-1";
  if (layout === "TEXTO_SOBRE_IMAGEM") return "lg:grid-cols-1";

  return "lg:grid-cols-2";
}

function getMediaOrderClass(layout: string, tipo: string) {
  if (tipo === "IMAGEM_TEXTO") return "lg:order-first";
  if (layout === "IMAGEM_DIREITA") return "lg:order-last";

  return "lg:order-first";
}

export default function TextoImagemPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const titulo = getString(config, "titulo");
  const texto = getString(config, ["texto", "descricao", "conteudo"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const textoRichText = getRichText(config, "textoRichText");
  const tipoMidia = getString(config, "tipoMidia", "IMAGEM");
  const layoutDesktop = getString(
    config,
    ["layoutDesktopTextoImagem", "layoutDesktop"],
    bloco.tipo === "IMAGEM_TEXTO" ? "IMAGEM_ESQUERDA" : "IMAGEM_DIREITA"
  );
  const layoutMobile = getString(config, ["layoutMobileTextoImagem", "layoutMobile"], "IMAGEM_ACIMA");
  const textoSobreImagemDesktop = layoutDesktop === "TEXTO_SOBRE_IMAGEM";
  const textoSobreImagemMobile = layoutMobile === "TEXTO_SOBRE_IMAGEM";
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const alinhamentoTextoDesktop = getString(
    config,
    "alinhamentoTextoDesktop",
    "ESQUERDA"
  );
  const alinhamentoTextoMobile = getString(
    config,
    "alinhamentoTextoMobile",
    alinhamentoTextoDesktop
  );
  const textAlignClass = getResponsiveTextAlignClass({
    desktop: alinhamentoTextoDesktop,
    mobile: alinhamentoTextoMobile,
    fallback: "ESQUERDA",
  });
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "PILULA")
  );
  const larguraMidiaDesktop = getString(
    config,
    "larguraMidiaDesktop",
    getString(config, "larguraMidia", "CONTIDA")
  );
  const larguraMidiaMobile = getString(
    config,
    "larguraMidiaMobile",
    larguraMidiaDesktop
  );
  const textoBotao = getStringWithDefault(config, ["textoBotao", "botaoTexto"]);
  const linkBotao = getButtonHref(config, ["linkBotao", "botaoLink", "linkUrl"]);
  const imageDesktop = getImageDesktop(config);
  const imageMobile = getImageMobile(config);
  const videoDesktop = getString(config, "videoDesktopUrl");
  const videoMobile = getString(config, "videoMobileUrl");
  const exibirMidia = getBoolean(config, "exibirMidia", true);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasTexto = hasTextContent(textoRichText, texto);
  const hasBotao = getBoolean(config, "exibirBotao", true) && textoBotao && linkBotao;
  const hasMedia = exibirMidia && Boolean(imageDesktop || imageMobile || videoDesktop || videoMobile);

  if (!hasTitulo && !hasTexto && !hasBotao && !hasMedia) {
    return null;
  }

  function renderTextoSobreImagem(viewportClass = "") {
    return (
      <section
        className={`relative overflow-hidden ${viewportClass} ${getSpacingClass(config)}`}
      >
        <div className="absolute inset-0">
          <PublicMediaRenderer
            tipoMidia={tipoMidia}
            exibirMidia={hasMedia}
            imagemDesktopUrl={imageDesktop}
            imagemMobileUrl={imageMobile}
            videoDesktopUrl={videoDesktop}
            videoMobileUrl={videoMobile}
            objectPositionDesktop={getMediaPosition(config, "Desktop")}
            objectPositionMobile={getMediaPosition(config, "Mobile")}
            alt={titulo}
          />
        </div>
        <div className="absolute inset-0 bg-slate-950/42" />

        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-7xl items-center">
          <div className={`max-w-2xl text-white ${textAlignClass}`}>
            {hasTitulo ? (
              <PublicRichTextRenderer
                value={tituloRichText}
                fallback={titulo}
                className="text-3xl font-light leading-tight md:text-5xl"
              />
            ) : null}
            {hasTexto ? (
              <PublicRichTextRenderer
                value={textoRichText}
                fallback={texto}
                className="mt-5 text-base leading-7 text-white/82"
              />
            ) : null}
            {hasBotao ? (
              <Link
                href={linkBotao}
                className={`mt-8 inline-flex min-h-11 items-center justify-center bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-white/90 ${buttonRadiusClass}`}
              >
                {textoBotao}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  function renderTextoImagem(viewportClass = "") {
    const isDesktopViewport = viewportClass.includes("lg:block");
    const isMobileViewport = viewportClass.includes("lg:hidden");
    const fullBleedDesktop = hasMedia && larguraMidiaDesktop === "FULL_BLEED";
    const fullBleedMobile = hasMedia && larguraMidiaMobile === "FULL_BLEED";
    const fullBleed =
      (isDesktopViewport && fullBleedDesktop) ||
      (isMobileViewport && fullBleedMobile) ||
      (!isDesktopViewport && !isMobileViewport && (fullBleedDesktop || fullBleedMobile));

    return (
      <section
        className={`${viewportClass} ${getBackgroundClass(corFundo)} ${getSpacingClass(config)}`}
      >
      <div
        className={`mx-auto grid gap-8 lg:items-center lg:gap-12 ${
          fullBleed ? "max-w-none px-0" : "max-w-7xl"
        } ${getDesktopLayoutClass(
          hasMedia ? layoutDesktop : "IMAGEM_ACIMA"
        )}`}
      >
        {hasMedia ? (
          <div
            className={`relative h-[340px] overflow-hidden bg-slate-100 md:h-[460px] ${
              fullBleed ? "" : "rounded-sm"
            } ${
              layoutMobile === "TEXTO_ACIMA" ? "order-last" : "order-first"
            } ${getMediaOrderClass(layoutDesktop, bloco.tipo)}`}
          >
            <PublicMediaRenderer
              tipoMidia={tipoMidia}
              imagemDesktopUrl={imageDesktop}
              imagemMobileUrl={imageMobile}
              videoDesktopUrl={videoDesktop}
              videoMobileUrl={videoMobile}
              objectPositionDesktop={getMediaPosition(config, "Desktop")}
              objectPositionMobile={getMediaPosition(config, "Mobile")}
              alt={titulo}
            />
          </div>
        ) : null}

        <div
          className={`${
            hasMedia
              ? fullBleed
                ? ""
                : ""
              : "mx-auto max-w-3xl"
          } ${textAlignClass}`}
        >
          {hasTitulo ? (
            <PublicRichTextRenderer
              value={tituloRichText}
              fallback={titulo}
              className={`text-3xl font-light leading-tight md:text-5xl ${colors.title}`}
            />
          ) : null}
          {hasTexto ? (
            <PublicRichTextRenderer
              value={textoRichText}
              fallback={texto}
              className={`mt-5 text-base leading-7 ${colors.body}`}
            />
          ) : null}

          {hasBotao ? (
            <Link
              href={linkBotao}
              className={`mt-8 inline-flex min-h-11 items-center justify-center bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 ${buttonRadiusClass}`}
            >
              {textoBotao}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
    );
  }

  if (hasMedia && textoSobreImagemDesktop !== textoSobreImagemMobile) {
    return (
      <>
        {textoSobreImagemMobile
          ? renderTextoSobreImagem("lg:hidden")
          : renderTextoImagem("lg:hidden")}
        {textoSobreImagemDesktop
          ? renderTextoSobreImagem("hidden lg:block")
          : renderTextoImagem("hidden lg:block")}
      </>
    );
  }

  if (hasMedia && textoSobreImagemDesktop && textoSobreImagemMobile) {
    return renderTextoSobreImagem();
  }

  return renderTextoImagem();
}
