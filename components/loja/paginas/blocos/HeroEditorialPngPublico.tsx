import Link from "next/link";
import {
  asConfig,
  getBoolean,
  getNumber,
  getString,
  getInlineVars,
  type BlocoPublicoProps,
} from "@/components/loja/paginas/blocos/utils";

type LinkTipo = "PRODUTO" | "CATEGORIA" | "PAGINA" | "COLECAO" | "URL";

function getObjectConfig(config: Record<string, unknown>, key: string) {
  return asConfig(config[key]);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getHeroLink(tipo: LinkTipo, valor: string) {
  if (!valor) return "";

  if (tipo === "PRODUTO") return `/loja/produto/${valor}`;
  if (tipo === "CATEGORIA") return `/loja/categoria/${valor}`;
  if (tipo === "PAGINA") return `/loja/p/${valor}`;
  if (tipo === "COLECAO") return `/loja/colecao/${valor}`;

  return valor;
}

function getTextWeightClass(value: string) {
  if (value === "LEVE") return "font-light";
  if (value === "REGULAR") return "font-normal";
  if (value === "SEMIBOLD") return "font-semibold";
  return "font-black";
}

function getTextAlignClass(value: string) {
  if (value === "ESQUERDA") return "text-left";
  return "text-center";
}

function getHeightClass(value: string) {
  if (value === "TELA_CHEIA") {
    return "min-h-[min(760px,100svh)] md:min-h-[100svh]";
  }

  return "min-h-[480px] md:min-h-[680px]";
}

function getCtaPositionClass(value: string) {
  if (value === "INFERIOR_CENTRO") {
    return "left-1/2 -translate-x-1/2 items-center text-center";
  }

  if (value === "INFERIOR_DIREITA") {
    return "right-[var(--hero-safe-x)] items-end text-right";
  }

  return "left-[var(--hero-safe-x)] items-start text-left";
}

function getTextAnimationClass(value: string) {
  if (value === "FADE") return "motion-safe:animate-[heroFade_.75s_ease-out_both]";
  if (value === "FADE_UP") return "motion-safe:animate-[heroFadeUp_.75s_ease-out_both]";
  if (value === "LETRAS_SUAVE") {
    return "motion-safe:animate-[heroTracking_.9s_ease-out_both]";
  }

  return "";
}

function getPngAnimationClass(value: string) {
  if (value === "FADE") return "motion-safe:animate-[heroFade_.8s_ease-out_both]";
  if (value === "FLOAT_UP") return "motion-safe:animate-[heroPngUp_.9s_ease-out_both]";

  return "";
}

function getHoverClass(value: string) {
  if (value === "PNG_FLOAT") return "group-hover:scale-[1.015]";
  if (value === "ZOOM_SUAVE") return "group-hover:scale-[1.025]";

  return "";
}

export default function HeroEditorialPngPublico({ bloco }: BlocoPublicoProps) {
  const config = asConfig(bloco.configJson);
  const fundo = getObjectConfig(config, "fundo");
  const texto = getObjectConfig(config, "texto");
  const png = getObjectConfig(config, "png");
  const cta = getObjectConfig(config, "cta");
  const animacao = getObjectConfig(config, "animacao");

  const variante = getString(config, "variante", "COMPACTO");
  const conteudoTexto =
    getString(texto, "conteudo") || getString(config, "titulo") || "STELLA COLARI";
  const linhas = getString(texto, "linhas", "AUTO");
  const alinhamento = getString(texto, "alinhamento", "CENTRO");
  const textoCor = getString(texto, "cor", "#f8fafc");
  const fundoCor = getString(fundo, "cor", "#223846");
  const margemSegura = clamp(getNumber(texto, "margemSeguraPercentual", 8), 4, 18);
  const tracking = clamp(getNumber(texto, "tracking", -0.04), -0.12, 0.08);
  const lineHeight = clamp(getNumber(texto, "lineHeight", 0.86), 0.72, 1.25);
  const escalaAuto = getBoolean(texto, "escalaAuto", true);
  const peso = getString(texto, "peso", "BOLD");
  const preset = getString(texto, "preset", "EDITORIAL");

  const pngDesktop = getString(png, "imagemDesktop");
  const pngMobile = getString(png, "imagemMobile") || pngDesktop;
  const pngAlt = getString(png, "alt") || conteudoTexto;
  const escalaDesktop = clamp(getNumber(png, "escalaDesktop", 68), 20, 130);
  const escalaMobile = clamp(getNumber(png, "escalaMobile", 96), 35, 150);
  const xDesktop = clamp(getNumber(png, "posicaoXDesktop", 58), 0, 100);
  const yDesktop = clamp(getNumber(png, "posicaoYDesktop", 50), 0, 100);
  const xMobile = clamp(getNumber(png, "posicaoXMobile", 50), 0, 100);
  const yMobile = clamp(getNumber(png, "posicaoYMobile", 52), 0, 100);
  const pngOpacity = clamp(getNumber(png, "opacidade", 100), 0, 100);
  const pngShadow = getBoolean(png, "sombra", true);

  const mostrarCta = getBoolean(cta, "mostrar", false);
  const linkTipo = getString(cta, "linkTipo", "URL") as LinkTipo;
  const linkValor = getString(cta, "linkValor");
  const ctaHref = getHeroLink(linkTipo, linkValor);
  const ctaLabel = getString(cta, "label");
  const ctaTitulo = getString(cta, "titulo");
  const ctaTextoBotao = getString(cta, "textoBotao", "Conhecer");
  const ctaPosicao = getString(cta, "posicao", "INFERIOR_ESQUERDA");

  const textAnimation = getTextAnimationClass(
    getString(animacao, "entradaTexto", "NENHUMA")
  );
  const pngAnimation = getPngAnimationClass(
    getString(animacao, "entradaPng", "NENHUMA")
  );
  const hoverClass = getHoverClass(getString(animacao, "hover", "NENHUM"));
  const textSize = escalaAuto
    ? "clamp(4.6rem, 18vw, 19rem)"
    : preset === "GRANDE"
      ? "clamp(4rem, 14vw, 14rem)"
      : preset === "MEDIO"
        ? "clamp(3.4rem, 11vw, 10rem)"
        : preset === "PEQUENO"
          ? "clamp(2.8rem, 8vw, 7rem)"
          : "clamp(4.6rem, 18vw, 19rem)";

  const section = (
    <section
      className={`group relative isolate flex overflow-hidden ${getHeightClass(
        variante
      )}`}
      style={getInlineVars({
        "--hero-bg": fundoCor,
        "--hero-text": textoCor,
        "--hero-safe-x": `${margemSegura}%`,
        "--hero-font-size": textSize,
        "--hero-line-height": lineHeight,
        "--hero-letter-spacing": `${tracking}em`,
        "--hero-png-w-desktop": `${escalaDesktop}%`,
        "--hero-png-w-mobile": `${escalaMobile}%`,
        "--hero-png-x-desktop": `${xDesktop}%`,
        "--hero-png-y-desktop": `${yDesktop}%`,
        "--hero-png-x-mobile": `${xMobile}%`,
        "--hero-png-y-mobile": `${yMobile}%`,
        "--hero-png-opacity": pngOpacity / 100,
      })}
    >
      <style>{`
        @keyframes heroFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes heroFadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes heroTracking { from { opacity: 0; letter-spacing: .08em; } to { opacity: 1; letter-spacing: var(--hero-letter-spacing); } }
        @keyframes heroPngUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 28px)); } to { opacity: var(--hero-png-opacity); transform: translate(-50%, -50%); } }
      `}</style>

      <div className="absolute inset-0 -z-10 bg-[var(--hero-bg)]" />

      <div
        className={`relative z-10 flex w-full items-center px-[var(--hero-safe-x)] py-14 md:py-20 ${getTextAlignClass(
          alinhamento
        )}`}
      >
        <h2
          data-stella-inline-field="heroTexto"
          className={`max-w-full whitespace-normal break-words uppercase text-[length:var(--hero-font-size)] leading-[var(--hero-line-height)] tracking-[var(--hero-letter-spacing)] text-[var(--hero-text)] ${getTextWeightClass(
            peso
          )} ${textAnimation} ${
            linhas === "UMA_LINHA"
              ? "line-clamp-1"
              : linhas === "DUAS_LINHAS"
                ? "line-clamp-2"
                : ""
          }`}
        >
          {conteudoTexto}
        </h2>
      </div>

      {pngDesktop || pngMobile ? (
        <picture>
          {pngMobile && <source media="(max-width: 767px)" srcSet={pngMobile} />}
          <img
            src={pngDesktop || pngMobile}
            alt={pngAlt}
            className={`pointer-events-none absolute left-[var(--hero-png-x-mobile)] top-[var(--hero-png-y-mobile)] z-20 w-[var(--hero-png-w-mobile)] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-[var(--hero-png-opacity)] transition duration-700 motion-reduce:transition-none md:left-[var(--hero-png-x-desktop)] md:top-[var(--hero-png-y-desktop)] md:w-[var(--hero-png-w-desktop)] ${pngAnimation} ${hoverClass} ${
              pngShadow ? "drop-shadow-[0_34px_48px_rgba(15,23,42,.30)]" : ""
            }`}
          />
        </picture>
      ) : null}

      {mostrarCta && (ctaLabel || ctaTitulo || ctaTextoBotao) ? (
        <div
          className={`absolute bottom-8 z-30 flex max-w-[min(28rem,calc(100%-2*var(--hero-safe-x)))] flex-col gap-3 text-white md:bottom-12 ${getCtaPositionClass(
            ctaPosicao
          )}`}
        >
          {ctaLabel ? (
            <p
              data-stella-inline-field="heroCtaLabel"
              className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70"
            >
              {ctaLabel}
            </p>
          ) : null}

          {ctaTitulo ? (
            <p
              data-stella-inline-field="heroCtaTitulo"
              className="text-lg font-semibold leading-tight md:text-2xl"
            >
              {ctaTitulo}
            </p>
          ) : null}

          {ctaTextoBotao && ctaHref ? (
            <Link
              href={ctaHref}
              data-stella-inline-field="heroCtaTextoBotao"
              className="inline-flex w-fit items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-white/90"
            >
              {ctaTextoBotao}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  if (ctaHref && !mostrarCta) {
    return (
      <Link href={ctaHref} className="block">
        {section}
      </Link>
    );
  }

  return section;
}
