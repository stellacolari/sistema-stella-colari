import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getArray,
  getBackgroundClass,
  getBoolean,
  getButtonHref,
  getGridColumnsClass,
  getImageDesktop,
  getImageMobile,
  getMediaPosition,
  getNumber,
  getRichText,
  getSpacingClass,
  getString,
  getTextColorForBackground,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

function asCard(value: unknown) {
  return asConfig(value);
}

function getCardMedia(card: Record<string, unknown>) {
  const tipoMidia = getString(card, "tipoMidia", "ICONE");

  if (tipoMidia === "NENHUMA") return null;

  if (tipoMidia === "ICONE") {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-2xl text-white">
        {getString(card, "icone", "★")}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-slate-100">
      <PublicMediaRenderer
        tipoMidia={tipoMidia}
        imagemDesktopUrl={getImageDesktop(card)}
        imagemMobileUrl={getImageMobile(card)}
        videoDesktopUrl={getString(card, "videoDesktopUrl")}
        videoMobileUrl={getString(card, "videoMobileUrl")}
        objectPositionDesktop={getMediaPosition(card, "Desktop")}
        objectPositionMobile={getMediaPosition(card, "Mobile")}
        alt={getString(card, "titulo")}
      />
    </div>
  );
}

export default function DestaquesCardsPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const corFundo = getString(config, "corFundo", "BRANCO");
  const colors = getTextColorForBackground(corFundo);
  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const sectionAlign = alinhamento === "ESQUERDA" ? "text-left" : "text-center";
  const cards = getArray(config, "cards").map(asCard);
  const layoutMobile = getString(config, "layoutMobile", "GRID");
  const layoutDesktop = getString(config, "layoutDesktop", "GRID");
  const isCarousel = layoutMobile === "CARROSSEL" || layoutDesktop === "CARROSSEL";

  return (
    <section className={`${getBackgroundClass(corFundo)} ${getSpacingClass(getString(config, "espacamento", "PADRAO"))}`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className={`mx-auto max-w-3xl ${sectionAlign}`}>
          <PublicRichTextRenderer
            value={getRichText(config, ["tituloSecaoRichText", "tituloRichText"])}
            fallback={getString(config, "titulo", bloco.titulo || "Destaques")}
            className={`text-3xl font-light leading-tight md:text-5xl ${colors.title}`}
          />
          <PublicRichTextRenderer
            value={getRichText(config, ["subtituloSecaoRichText", "subtituloRichText", "textoRichText"])}
            fallback={getString(config, ["subtitulo", "descricao", "texto"])}
            className={`mt-4 text-base leading-7 ${colors.body}`}
          />
        </div>

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
          {(cards.length > 0 ? cards : [{ titulo: "Destaque", texto: "Configure cards no editor." }]).map(
            (card, index) => {
              const titulo = getString(card, "titulo", `Card ${index + 1}`);
              const texto = getString(card, "texto");
              const textoBotao = getString(card, "textoBotao", "Saiba mais");
              const exibirMidia = getBoolean(card, "exibirMidia", true);

              return (
                <article
                  key={getString(card, "id", `card-${index}`)}
                  className={`rounded-sm border ${colors.border} ${colors.card} p-5 shadow-sm ${
                    isCarousel ? "w-[78vw] shrink-0 snap-start sm:w-80" : ""
                  } ${alinhamento === "CENTRO" ? "text-center" : "text-left"}`}
                >
                  {exibirMidia ? (
                    <div className={alinhamento === "CENTRO" ? "flex justify-center" : ""}>
                      {getCardMedia(card)}
                    </div>
                  ) : null}

                  <PublicRichTextRenderer
                    value={getRichText(card, "tituloRichText")}
                    fallback={titulo}
                    className={`mt-5 text-xl font-semibold leading-snug ${colors.title}`}
                  />
                  <PublicRichTextRenderer
                    value={getRichText(card, "textoRichText")}
                    fallback={texto}
                    className={`mt-3 text-sm leading-6 ${colors.body}`}
                  />

                  {getBoolean(card, "exibirBotao", false) && textoBotao ? (
                    <Link
                      href={getButtonHref(card, "linkBotao")}
                      className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-slate-950/15 px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
                    >
                      {textoBotao}
                    </Link>
                  ) : null}
                </article>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}
