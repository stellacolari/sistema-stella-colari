import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getBoolean,
  getButtonHref,
  getImageDesktop,
  getImageMobile,
  getMediaPosition,
  getRichText,
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
  const titulo = getString(config, ["titulo", "nome"], bloco.titulo || "");
  const subtitulo = getString(config, ["subtitulo", "texto", "descricao", "conteudo"]);
  const tituloRichText = getRichText(config, "tituloRichText");
  const subtituloRichText = getRichText(config, ["subtituloRichText", "textoRichText"]);
  const tipoMidia = getString(config, "tipoMidia", "IMAGEM");
  const exibirTexto = getBoolean(config, "exibirTexto", true);
  const exibirSubtitulo = getBoolean(config, "exibirSubtitulo", true);
  const exibirBotaoPrimario = getBoolean(config, "exibirBotaoPrimario", true);
  const exibirBotaoSecundario = getBoolean(config, "exibirBotaoSecundario", false);
  const textoBotao = getString(config, ["textoBotao", "botaoTexto"], "Conhecer");
  const textoBotaoSecundario = getString(config, [
    "textoBotaoSecundario",
    "botaoSecundarioTexto",
  ]);
  const altura = getString(config, "alturaBanner", "PADRAO");
  const alinhamento = getString(config, "alinhamentoConteudo", "ESQUERDA");
  const overlay = getString(config, "overlayBanner", "LEVE");
  const corTexto = getString(config, "corTextoBanner", "CLARO");
  const textClass = getTextClass(corTexto);

  return (
    <section className={`relative overflow-hidden bg-slate-950 ${getHeightClass(altura)}`}>
      <div className="absolute inset-0">
        <PublicMediaRenderer
          tipoMidia={tipoMidia}
          exibirMidia={getBoolean(config, "exibirMidia", true)}
          imagemDesktopUrl={getImageDesktop(config)}
          imagemMobileUrl={getImageMobile(config)}
          videoDesktopUrl={getString(config, "videoDesktopUrl")}
          videoMobileUrl={getString(config, "videoMobileUrl")}
          videoPosterUrl={getString(config, "videoPosterUrl")}
          videoLoop={getBoolean(config, "videoLoop", true)}
          videoMuted={getString(config, "videoSom", "MUDO") !== "COM_SOM"}
          objectPositionDesktop={getMediaPosition(config, "Desktop")}
          objectPositionMobile={getMediaPosition(config, "Mobile")}
          alt={titulo}
          placeholder="Banner sem mídia"
        />
      </div>

      <div className={`absolute inset-0 ${getOverlayClass(overlay)}`} />

      {exibirTexto ? (
        <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
          <div
            className={`flex w-full flex-col justify-center ${getContentAlignClass(
              alinhamento
            )}`}
          >
            <div className="max-w-3xl">
              <PublicRichTextRenderer
                value={tituloRichText}
                fallback={titulo}
                className={`text-4xl font-light leading-[1.05] tracking-normal md:text-6xl ${textClass.title}`}
                paragraphClassName="mb-0"
              />

              {exibirSubtitulo ? (
                <PublicRichTextRenderer
                  value={subtituloRichText}
                  fallback={subtitulo}
                  className={`mt-5 text-base leading-7 md:text-lg ${textClass.body}`}
                  paragraphClassName="mb-0"
                />
              ) : null}

              {(exibirBotaoPrimario && textoBotao) ||
              (exibirBotaoSecundario && textoBotaoSecundario) ? (
                <div
                  className={`mt-8 flex flex-wrap gap-3 ${
                    alinhamento === "CENTRO"
                      ? "justify-center"
                      : alinhamento === "DIREITA"
                        ? "justify-end"
                        : "justify-start"
                  }`}
                >
                  {exibirBotaoPrimario && textoBotao ? (
                    <Link
                      href={getButtonHref(config, ["linkBotao", "botaoLink", "linkUrl"])}
                      className={`inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${textClass.primary}`}
                    >
                      {textoBotao}
                    </Link>
                  ) : null}

                  {exibirBotaoSecundario && textoBotaoSecundario ? (
                    <Link
                      href={getButtonHref(config, [
                        "linkBotaoSecundario",
                        "botaoSecundarioLink",
                      ])}
                      className={`inline-flex min-h-11 items-center justify-center rounded-full border px-6 text-sm font-semibold transition ${textClass.secondary}`}
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
