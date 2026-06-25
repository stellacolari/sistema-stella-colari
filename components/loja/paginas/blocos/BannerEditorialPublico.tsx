import Link from "next/link";
import {
  getInlineVars,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";
import {
  getBannerEditorialTituloClass,
  normalizarBannerEditorialConfig,
} from "@/components/loja/paginas/blocos/bannerEditorialConfig";

type BannerEditorialPublicoProps = BlocoPublicoProps & {
  device?: "DESKTOP" | "TABLET" | "MOBILE";
  modo?: "publico" | "editor";
};

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function BannerEditorialButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  const className =
    "inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-[var(--banner-editorial-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95";

  if (isExternalUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function BannerEditorialFallbackVisual() {
  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-[2rem] bg-white/65 ring-1 ring-black/5 md:min-h-[420px]">
      <div
        className="absolute inset-5 rounded-[1.5rem] border"
        style={{ borderColor: "var(--banner-editorial-accent-soft)" }}
      />
      <div
        className="absolute left-8 top-10 h-24 w-2/3 rounded-[1.5rem]"
        style={{ backgroundColor: "var(--banner-editorial-accent-soft)" }}
      />
      <div className="absolute bottom-10 right-8 h-32 w-3/5 rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-black/5" />
      <div
        className="absolute bottom-20 left-10 h-px w-2/3"
        style={{ backgroundColor: "var(--banner-editorial-accent)" }}
      />
      <div
        className="absolute bottom-24 left-10 h-px w-1/2 opacity-60"
        style={{ backgroundColor: "var(--banner-editorial-accent)" }}
      />
    </div>
  );
}

export default function BannerEditorialPublico({
  bloco,
  device,
  modo = "publico",
}: BannerEditorialPublicoProps) {
  const config = normalizarBannerEditorialConfig(bloco.configJson);
  const forceMobile = modo === "editor" && device === "MOBILE";
  const titulo = config.titulo.trim() || (modo === "editor" ? "Titulo do banner" : "Stella Colari");
  const imageUrl =
    (forceMobile && config.imagemMobileUrl ? config.imagemMobileUrl : "") ||
    config.imagemUrl;
  const titleClass = getBannerEditorialTituloClass(
    titulo.length,
    forceMobile
  );
  const alignClass =
    config.alinhamento === "CENTRO"
      ? "items-center text-center"
      : "items-start text-left";
  const gridClass = forceMobile
    ? "grid-cols-1"
    : "lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.8fr)]";

  return (
    <section
      className="bg-slate-50 px-4 py-10 md:px-8 md:py-14"
      style={getInlineVars({
        "--banner-editorial-bg": config.corFundo,
        "--banner-editorial-text": config.corTexto,
        "--banner-editorial-accent": config.corDestaque,
        "--banner-editorial-accent-soft": `${config.corDestaque}24`,
      })}
    >
      <div className="mx-auto max-w-7xl">
        <div className={`grid gap-8 overflow-hidden rounded-[2.25rem] bg-[var(--banner-editorial-bg)] p-6 text-[var(--banner-editorial-text)] shadow-sm ring-1 ring-black/5 md:p-10 ${gridClass}`}>
          <div
            className={`flex min-h-[360px] flex-col justify-between gap-8 ${alignClass} ${
              forceMobile ? "min-h-[300px]" : "lg:min-h-[560px]"
            }`}
          >
            <div className={`flex w-full flex-col ${alignClass}`}>
              {config.textoAuxiliar ? (
                <p className="mb-5 text-xs font-semibold uppercase text-[var(--banner-editorial-accent)]">
                  {config.textoAuxiliar}
                </p>
              ) : null}

              <h2
                className={`max-w-[12ch] break-words font-semibold leading-[0.88] ${titleClass}`}
                style={{ overflowWrap: "anywhere" }}
              >
                {titulo}
              </h2>
            </div>

            <div className={`flex max-w-xl flex-col gap-5 ${alignClass}`}>
              {config.subtitulo ? (
                <p className="text-base leading-7 text-[var(--banner-editorial-text)] opacity-75 md:text-lg">
                  {config.subtitulo}
                </p>
              ) : null}

              {config.botaoTexto && config.botaoUrl ? (
                <BannerEditorialButton href={config.botaoUrl}>
                  {config.botaoTexto}
                </BannerEditorialButton>
              ) : null}
            </div>
          </div>

          <div className="relative min-h-[280px] overflow-hidden rounded-[2rem] md:min-h-[420px]">
            {imageUrl ? (
              <picture>
                {config.imagemMobileUrl ? (
                  <source media="(max-width: 767px)" srcSet={config.imagemMobileUrl} />
                ) : null}
                <img
                  src={imageUrl}
                  alt={config.imagemAlt || titulo}
                  className="h-full min-h-[280px] w-full object-cover md:min-h-[420px]"
                />
              </picture>
            ) : (
              <BannerEditorialFallbackVisual />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
