import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getArray,
  getBackgroundClass,
  getBoolean,
  getButtonRadiusClass,
  getButtonHref,
  getGridColumnsClass,
  getImageDesktop,
  getImageMobile,
  getMediaPosition,
  getNumber,
  getRichText,
  getResponsiveTextAlignClass,
  getSpacingClass,
  getString,
  getStringWithDefault,
  hasTextContent,
  getTextColorForBackground,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

function asCard(value: unknown) {
  return asConfig(value);
}

function getCardMedia(card: Record<string, unknown>) {
  const tipoMidia = getString(card, "tipoMidia", "ICONE");
  const imageDesktop = getImageDesktop(card);
  const imageMobile = getImageMobile(card);
  const videoDesktop = getString(card, "videoDesktopUrl");
  const videoMobile = getString(card, "videoMobileUrl");

  if (tipoMidia === "NENHUMA") return null;

  if (tipoMidia === "ICONE") {
    const icone = getString(card, "icone");

    if (!icone) return null;

    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-2xl text-white">
        {icone}
      </div>
    );
  }

  if (!imageDesktop && !imageMobile && !videoDesktop && !videoMobile) {
    return null;
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-slate-100">
      <PublicMediaRenderer
        tipoMidia={tipoMidia}
        imagemDesktopUrl={imageDesktop}
        imagemMobileUrl={imageMobile}
        videoDesktopUrl={videoDesktop}
        videoMobileUrl={videoMobile}
        objectPositionDesktop={getMediaPosition(card, "Desktop")}
        objectPositionMobile={getMediaPosition(card, "Mobile")}
        alt={getString(card, "titulo")}
      />
    </div>
  );
}

function cardHasPublicContent(card: Record<string, unknown>) {
  const titulo = getString(card, "titulo");
  const texto = getString(card, "texto");
  const tituloRichText = getRichText(card, "tituloRichText");
  const textoRichText = getRichText(card, "textoRichText");
  const media = getBoolean(card, "exibirMidia", true) ? getCardMedia(card) : null;
  const textoBotao = getStringWithDefault(card, "textoBotao");
  const linkBotao = getButtonHref(card, "linkBotao");

  return Boolean(
    hasTextContent(tituloRichText, titulo) ||
      hasTextContent(textoRichText, texto) ||
      media ||
      (getBoolean(card, "exibirBotao", false) && textoBotao && linkBotao)
  );
}

export default function DestaquesCardsPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const isBrandSurface = ["MARCA", "AZUL_ESCURO", "ESCURO"].includes(corFundo);
  const colors = getTextColorForBackground(corFundo);
  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const sectionAlign = getResponsiveTextAlignClass({
    desktop: getString(config, "alinhamentoTextoDesktop", alinhamento),
    mobile: getString(
      config,
      "alinhamentoTextoMobile",
      getString(config, "alinhamentoTextoDesktop", alinhamento)
    ),
    fallback: alinhamento,
  });
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "PILULA")
  );
  const cards = getArray(config, "cards").map(asCard).filter(cardHasPublicContent);
  const layoutMobile = getString(config, "layoutMobile", "GRID");
  const layoutDesktop = getString(config, "layoutDesktop", "GRID");
  const isCarousel = layoutMobile === "CARROSSEL" || layoutDesktop === "CARROSSEL";
  const tituloSecaoRichText = getRichText(config, [
    "tituloSecaoRichText",
    "tituloRichText",
  ]);
  const subtituloSecaoRichText = getRichText(config, [
    "subtituloSecaoRichText",
    "subtituloRichText",
    "textoRichText",
  ]);
  const tituloSecao = getString(config, "titulo");
  const subtituloSecao = getString(config, ["subtitulo", "descricao", "texto"]);
  const hasTituloSecao = hasTextContent(tituloSecaoRichText, tituloSecao);
  const hasSubtituloSecao = hasTextContent(
    subtituloSecaoRichText,
    subtituloSecao
  );

  if (!hasTituloSecao && !hasSubtituloSecao && cards.length === 0) {
    return null;
  }

  return (
    <section className={`${getBackgroundClass(corFundo)} ${getSpacingClass(config)}`}>
      <div className="mx-auto max-w-7xl">
        <div className={`mx-auto max-w-3xl ${sectionAlign}`}>
          {hasTituloSecao ? (
            <PublicRichTextRenderer
              value={tituloSecaoRichText}
              fallback={tituloSecao}
              className={`text-3xl font-light leading-tight md:text-5xl ${colors.title}`}
              forceColor={
                isBrandSurface ? "var(--brand-blue-foreground)" : undefined
              }
            />
          ) : null}
          {hasSubtituloSecao ? (
            <PublicRichTextRenderer
              value={subtituloSecaoRichText}
              fallback={subtituloSecao}
              className={`mt-4 text-base leading-7 ${colors.body}`}
              forceColor={
                isBrandSurface ? "var(--brand-blue-foreground)" : undefined
              }
            />
          ) : null}
        </div>

        {cards.length > 0 ? (
          <div
            className={
              isCarousel
                ? "mt-10 flex snap-x gap-5 overflow-x-auto pb-4"
                : `mt-10 grid gap-5 ${getGridColumnsClass(
                    getNumber(config, "colunasMobile", 1),
                    getNumber(config, "colunasTablet", 2),
                    getNumber(config, "colunasDesktop", 3)
                  )}`
            }
          >
            {cards.map(
            (card, index) => {
              const titulo = getString(card, "titulo");
              const texto = getString(card, "texto");
              const tituloRichText = getRichText(card, "tituloRichText");
              const textoRichText = getRichText(card, "textoRichText");
              const textoBotao = getStringWithDefault(card, "textoBotao", "Saiba mais");
              const linkBotao = getButtonHref(card, "linkBotao");
              const exibirMidia = getBoolean(card, "exibirMidia", true);
              const media = exibirMidia ? getCardMedia(card) : null;
              const hasTitulo = hasTextContent(tituloRichText, titulo);
              const hasTexto = hasTextContent(textoRichText, texto);

              return (
                <article
                  key={getString(card, "id", `card-${index}`)}
                  className={`rounded-sm border ${colors.border} ${colors.card} p-5 shadow-sm ${
                    isCarousel ? "w-[78vw] shrink-0 snap-start sm:w-80" : ""
                  } ${alinhamento === "CENTRO" ? "text-center" : "text-left"}`}
                >
                  {media ? (
                    <div className={alinhamento === "CENTRO" ? "flex justify-center" : ""}>
                      {media}
                    </div>
                  ) : null}

                  {hasTitulo ? (
                    <PublicRichTextRenderer
                      value={tituloRichText}
                      fallback={titulo}
                      className={`mt-5 text-xl font-semibold leading-snug ${colors.title}`}
                      forceColor={
                        isBrandSurface
                          ? "var(--brand-blue-foreground)"
                          : undefined
                      }
                    />
                  ) : null}
                  {hasTexto ? (
                    <PublicRichTextRenderer
                      value={textoRichText}
                      fallback={texto}
                      className={`mt-3 text-sm leading-6 ${colors.body}`}
                      forceColor={
                        isBrandSurface
                          ? "var(--brand-blue-foreground)"
                          : undefined
                      }
                    />
                  ) : null}

                  {getBoolean(card, "exibirBotao", false) && textoBotao && linkBotao ? (
                    <Link
                      href={linkBotao}
                      className={`mt-5 inline-flex min-h-10 items-center justify-center border px-5 text-sm font-semibold transition ${buttonRadiusClass} ${
                        isBrandSurface
                          ? "border-white bg-white text-[var(--brand-blue)] hover:text-[var(--brand-blue-dark)]"
                          : "border-slate-950/15 text-slate-950 hover:border-slate-950"
                      }`}
                    >
                      {textoBotao}
                    </Link>
                  ) : null}
                </article>
              );
            }
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
