import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getBoolean,
  getButtonRadiusClass,
  getButtonHref,
  getResponsiveTextAlignClass,
  getStringWithDefault,
  getImageDesktop,
  getImageMobile,
  hasTextContent,
  getMediaPosition,
  getRichText,
  getSpacingClass,
  getString,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

function getHeightClass(altura: string) {
  if (altura === "COMPACTA") return "min-h-[360px] md:min-h-[420px]";
  if (altura === "TELA_CHEIA") return "min-h-[calc(100vh-80px)]";

  return "min-h-[460px] md:min-h-[580px]";
}

function getContentAlignClass(alinhamento: string) {
  if (alinhamento === "CENTRO") {
    return "items-center text-center";
  }

  if (alinhamento === "DIREITA") {
    return "items-end text-right";
  }

  return "items-start text-left";
}

function getOverlayClass(overlay: string) {
  if (overlay === "NENHUM") return "bg-transparent";
  if (overlay === "MEDIO") return "bg-slate-950/50";

  return "bg-slate-950/28";
}

function getTextClass(corTexto: string) {
  if (corTexto === "ESCURO") {
    return {
      title: "text-slate-950",
      body: "text-slate-700",
      primary: "bg-slate-950 text-white hover:bg-slate-800",
      secondary:
        "border-slate-950/25 text-slate-950 hover:border-slate-950 hover:bg-white/50",
    };
  }

  return {
    title: "text-white",
    body: "text-white/86",
    primary: "bg-white text-slate-950 hover:bg-white/90",
    secondary:
      "border-white/55 text-white hover:border-white hover:bg-white/10",
  };
}

export default function BannerPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const titulo = getString(config, ["titulo", "nome"]);
  const subtitulo = getString(config, ["subtitulo", "texto", "descricao", "conteudo"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, ["subtituloRichText", "textoRichText"]);
  const tipoMidia = getString(config, "tipoMidia", "IMAGEM");
  const exibirTexto = getBoolean(config, "exibirTexto", true);
  const exibirSubtitulo = getBoolean(config, "exibirSubtitulo", true);
  const exibirBotaoPrimario = getBoolean(config, "exibirBotaoPrimario", true);
  const exibirBotaoSecundario = getBoolean(config, "exibirBotaoSecundario", false);
  const textoBotao = getStringWithDefault(config, ["textoBotao", "botaoTexto"], "Conhecer");
  const linkBotao = getButtonHref(config, ["linkBotao", "botaoLink", "linkUrl"]);
  const textoBotaoSecundario = getStringWithDefault(config, [
    "textoBotaoSecundario",
    "botaoSecundarioTexto",
  ]);
  const linkBotaoSecundario = getButtonHref(config, [
    "linkBotaoSecundario",
    "botaoSecundarioLink",
  ]);
  const altura = getString(config, "alturaBanner", "PADRAO");
  const alinhamento = getString(config, "alinhamentoConteudo", "ESQUERDA");
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
  const overlay = getString(config, "overlayBanner", "LEVE");
  const corTexto = getString(config, "corTextoBanner", "CLARO");
  const textClass = getTextClass(corTexto);
  const imageDesktop = getImageDesktop(config);
  const imageMobile = getImageMobile(config);
  const videoDesktop = getString(config, "videoDesktopUrl");
  const videoMobile = getString(config, "videoMobileUrl");
  const hasMedia =
    getBoolean(config, "exibirMidia", true) &&
    Boolean(imageDesktop || imageMobile || videoDesktop || videoMobile);
  const hasTitulo = hasTextContent(tituloRichText, titulo);
  const hasSubtitulo = hasTextContent(subtituloRichText, subtitulo);
  const hasBotaoPrimario = exibirBotaoPrimario && textoBotao && linkBotao;
  const hasBotaoSecundario =
    exibirBotaoSecundario && textoBotaoSecundario && linkBotaoSecundario;
  const hasConteudo =
    exibirTexto && (hasTitulo || (exibirSubtitulo && hasSubtitulo) || hasBotaoPrimario || hasBotaoSecundario);

  if (!hasMedia && !hasConteudo) {
    return null;
  }

  return (
    <section className={`relative overflow-hidden bg-slate-950 ${getHeightClass(altura)}`}>
      <div className="absolute inset-0">
        <PublicMediaRenderer
          tipoMidia={tipoMidia}
          exibirMidia={hasMedia}
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

      <div className={`absolute inset-0 ${getOverlayClass(overlay)}`} />

      {hasConteudo ? (
        <div className={`relative z-10 mx-auto flex min-h-[inherit] max-w-7xl ${getSpacingClass(config)}`}>
          <div
            className={`flex w-full flex-col justify-center ${getContentAlignClass(
              alinhamento
            )}`}
          >
            <div className={`max-w-3xl ${textAlignClass}`}>
              {hasTitulo ? (
                <PublicRichTextRenderer
                  value={tituloRichText}
                  fallback={titulo}
                  className={`text-4xl font-light leading-[1.05] tracking-normal md:text-6xl ${textClass.title}`}
                  paragraphClassName="mb-0"
                />
              ) : null}

              {exibirSubtitulo && hasSubtitulo ? (
                <PublicRichTextRenderer
                  value={subtituloRichText}
                  fallback={subtitulo}
                  className={`mt-5 text-base leading-7 md:text-lg ${textClass.body}`}
                  paragraphClassName="mb-0"
                />
              ) : null}

              {hasBotaoPrimario || hasBotaoSecundario ? (
                <div
                  className={`mt-8 flex flex-wrap gap-3 ${
                    alinhamento === "CENTRO"
                      ? "justify-center"
                      : alinhamento === "DIREITA"
                        ? "justify-end"
                        : "justify-start"
                  }`}
                >
                  {hasBotaoPrimario ? (
                    <Link
                      href={linkBotao}
                      className={`inline-flex min-h-11 items-center justify-center px-6 text-sm font-semibold transition ${buttonRadiusClass} ${textClass.primary}`}
                    >
                      {textoBotao}
                    </Link>
                  ) : null}

                  {hasBotaoSecundario ? (
                    <Link
                      href={linkBotaoSecundario}
                      className={`inline-flex min-h-11 items-center justify-center border px-6 text-sm font-semibold transition ${buttonRadiusClass} ${textClass.secondary}`}
                    >
                      {textoBotaoSecundario}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
