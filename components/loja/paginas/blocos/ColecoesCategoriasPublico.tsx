import Link from "next/link";
import PublicMediaRenderer from "@/components/loja/paginas/PublicMediaRenderer";
import PublicRichTextRenderer from "@/components/loja/paginas/PublicRichTextRenderer";
import {
  asConfig,
  getArray,
  getBackgroundClass,
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
  const larguraConteudo = getString(config, "larguraConteudo", "LARGA");
  const buttonRadiusClass = getButtonRadiusClass(
    getString(config, "estiloBordaBotao", "RETO")
  );
  const sectionAlign = getResponsiveTextAlignClass({
    desktop: getString(config, "alinhamentoTextoDesktop", "ESQUERDA"),
    mobile: getString(config, "alinhamentoTextoMobile", "ESQUERDA"),
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
  const itens = getArray(config, "itens")
    .map(asConfig)
    .filter(itemHasPublicContent)
    .sort(
      (a, b) =>
        getNumber(a, "ordem", 0) - getNumber(b, "ordem", 0)
    );

  if (!hasTitulo && !hasSubtitulo && itens.length === 0) {
    return null;
  }

  const widthClass = getContentWidthClass(larguraConteudo);

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
        {layoutVisual === "GRID_EDITORIAL" ? (
          <>
            {(hasTitulo || hasSubtitulo) && (
              <div className={`max-w-4xl ${sectionAlign}`}>
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
              </div>
            )}

            {itens.length > 0 ? (
              <div
                className={`mt-10 grid gap-6 ${getGridColumnsClass(
                  getNumber(config, "colunasMobile", 1),
                  getNumber(config, "colunasTablet", 2),
                  getNumber(config, "colunasDesktop", 4)
                )}`}
              >
                {itens.map((item, index) => {
                  const tituloItem =
                    getString(item, "titulo") || getString(item, "categoriaNome");
                  const subtituloItem = getString(item, "subtitulo");
                  const textoLink = getString(item, "textoLink", "Explorar");
                  const href = getItemHref(item);
                  const content = (
                    <article>
                      <ItemMedia
                        item={item}
                        alt={tituloItem}
                        className="aspect-[4/5]"
                      />

                      {estiloEtiqueta !== "OCULTA" ? (
                        <div className="pt-5">
                          <PublicRichTextRenderer
                            value={getRichText(item, "tituloRichText")}
                            fallback={tituloItem}
                            className={`text-xl font-medium leading-snug ${colors.title}`}
                          />
                          <PublicRichTextRenderer
                            value={getRichText(item, "subtituloRichText")}
                            fallback={subtituloItem}
                            className={`mt-2 text-sm leading-6 ${colors.body}`}
                          />
                          {textoLink && href ? (
                            <span
                              className={`mt-4 inline-flex min-h-10 items-center border border-current px-5 text-sm font-semibold ${buttonRadiusClass}`}
                            >
                              {textoLink}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );

                  return href ? (
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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-start">
            {(hasTitulo || hasSubtitulo) && (
              <div className={`lg:sticky lg:top-24 ${sectionAlign}`}>
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
                    className={`mt-4 text-base leading-7 ${colors.body}`}
                  />
                ) : null}
              </div>
            )}

            {itens.length > 0 ? (
              <div className="grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-5 md:grid-cols-2">
                {itens.map((item, index) => {
                  const tituloItem =
                    getString(item, "titulo") || getString(item, "categoriaNome");
                  const subtituloItem = getString(item, "subtitulo");
                  const textoLink = getString(item, "textoLink", "Explorar");
                  const href = getItemHref(item);
                  const featured = index === 0 || index === 3;
                  const label = estiloEtiqueta !== "OCULTA" && (
                    <div
                      className={
                        estiloEtiqueta === "SOBREPOSTA"
                          ? "absolute bottom-4 left-4 right-4 bg-white/92 p-4 shadow-sm backdrop-blur"
                          : "pt-4"
                      }
                    >
                      <PublicRichTextRenderer
                        value={getRichText(item, "tituloRichText")}
                        fallback={tituloItem}
                        className={`text-lg font-medium leading-snug ${
                          estiloEtiqueta === "SOBREPOSTA"
                            ? "text-slate-950"
                            : colors.title
                        }`}
                      />
                      <PublicRichTextRenderer
                        value={getRichText(item, "subtituloRichText")}
                        fallback={subtituloItem}
                        className={`mt-2 text-sm leading-6 ${
                          estiloEtiqueta === "SOBREPOSTA"
                            ? "text-slate-600"
                            : colors.body
                        }`}
                      />
                      {textoLink && href ? (
                        <span
                          className={`mt-3 inline-flex min-h-9 items-center border border-current px-4 text-xs font-semibold ${buttonRadiusClass}`}
                        >
                          {textoLink}
                        </span>
                      ) : null}
                    </div>
                  );
                  const content = (
                    <article
                      className={`relative ${
                        featured ? "md:row-span-2" : ""
                      }`}
                    >
                      <ItemMedia
                        item={item}
                        alt={tituloItem}
                        className={featured ? "aspect-[3/4] h-full" : "aspect-[4/3]"}
                      />
                      {label}
                    </article>
                  );

                  return href ? (
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
