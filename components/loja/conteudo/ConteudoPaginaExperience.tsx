"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import ProdutoCardLoja, {
  type ProdutoCardLojaItem,
} from "@/components/loja/ProdutoCardLoja";
import ConteudoImagemResponsiva from "@/components/loja/conteudo/ConteudoImagemResponsiva";
import {
  criarImagemConteudoVazia,
  urlConteudoPermitida,
  type ConteudoContratoPublico,
  type ConteudoImagemPublica,
  type ConteudoPaginaPublica,
} from "@/lib/loja/conteudo/contracts";
import type { CategoriaMenuPublicoItem } from "@/components/loja/MenuPublicoLoja";

type Props = {
  pagina: { titulo: string; slug: string; tipo: string };
  contrato: ConteudoContratoPublico;
  conteudo: ConteudoPaginaPublica;
  produtos: ProdutoCardLojaItem[];
  categorias: CategoriaMenuPublicoItem[];
  categoryGrid?: ReactNode;
};

function stringValue(values: Record<string, unknown>, key: string) {
  return typeof values[key] === "string" ? String(values[key]).trim() : "";
}

function boolValue(values: Record<string, unknown>, key: string, fallback = true) {
  return typeof values[key] === "boolean" ? Boolean(values[key]) : fallback;
}

function arrayValue(values: Record<string, unknown>, key: string) {
  return Array.isArray(values[key])
    ? (values[key] as unknown[]).map(String).filter(Boolean)
    : [];
}

function imageValue(values: Record<string, unknown>, key: string) {
  const value = values[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ConteudoImagemPublica)
    : criarImagemConteudoVazia();
}

function safeHref(value: string) {
  return urlConteudoPermitida(value) && value ? value : "";
}

function EditorialButton({ label, href }: { label: string; href: string }) {
  const target = safeHref(href);
  if (!label || !target) return null;

  return (
    <Link
      href={target}
      className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--brand-blue)] px-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue-dark)] transition hover:bg-[var(--brand-blue)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function HeroTitle({ title }: { title: string }) {
  if (title.trim().toLowerCase() === "viva stella colari.") {
    return (
      <>
        <span className="font-light">Viva </span>
        <strong className="font-semibold">Stella Colari.</strong>
      </>
    );
  }
  return <>{title}</>;
}

function HeroSection({
  values,
  prefix = "hero",
  compact = false,
  fallbackTitle = "",
}: {
  values: Record<string, unknown>;
  prefix?: string;
  compact?: boolean;
  fallbackTitle?: string;
}) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const eyebrow = stringValue(values, `${prefix}.eyebrow`);
  const title = stringValue(values, `${prefix}.title`) || fallbackTitle;
  const text = stringValue(values, `${prefix}.text`);
  const media = imageValue(values, `${prefix}.image`);
  const hasImage = Boolean(media.desktopUrl || media.mobileUrl);
  const primaryLabel = stringValue(values, `${prefix}.primaryLabel`);
  const primaryHref = safeHref(stringValue(values, `${prefix}.primaryHref`));
  const secondaryLabel = stringValue(values, `${prefix}.secondaryLabel`);
  const secondaryHref = safeHref(stringValue(values, `${prefix}.secondaryHref`));

  return (
    <section
      className={`relative isolate flex items-center overflow-hidden border-b border-[#171916]/10 px-5 sm:px-8 lg:px-12 ${
        compact ? "min-h-[32vh] py-16 lg:min-h-[38vh]" : "min-h-[58vh] py-24 lg:min-h-[72vh]"
      } ${
        hasImage ? "text-white" : "bg-[var(--brand-blue)] text-white"
      }`}
    >
      {hasImage ? (
        <>
          <ConteudoImagemResponsiva media={media} className="absolute inset-0" eager />
          <div className="absolute inset-0 bg-[#0f172a]/45" />
        </>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="max-w-4xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">{eyebrow}</p>
          ) : null}
          <h1 className="mt-5 text-balance text-[clamp(3rem,8vw,8.5rem)] font-light leading-[0.92] tracking-[-0.045em]">
            <HeroTitle title={title} />
          </h1>
          {text ? (
            <p className={`mt-7 max-w-2xl text-pretty text-base leading-7 md:text-lg ${hasImage ? "text-white/88" : "text-white"}`}>
              {text}
            </p>
          ) : null}
          {(primaryLabel && primaryHref) || (secondaryLabel && secondaryHref) ? (
            <div className="mt-9 flex flex-wrap gap-3">
              {primaryLabel && primaryHref ? (
                <Link
                  href={primaryHref}
                  className={`inline-flex min-h-12 items-center justify-center px-6 text-xs font-semibold uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    hasImage
                      ? "bg-white text-[#171916] hover:bg-white/90 focus-visible:ring-white"
                      : "bg-white text-[var(--brand-blue)] hover:text-[var(--brand-blue-dark)] focus-visible:ring-white"
                  }`}
                >
                  {primaryLabel}
                </Link>
              ) : null}
              {secondaryLabel && secondaryHref ? (
                <Link
                  href={secondaryHref}
                  className={`inline-flex min-h-12 items-center justify-center border px-6 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    hasImage
                      ? "border-white/70 text-white hover:bg-white hover:text-[#171916]"
                      : "border-white text-white hover:bg-white hover:text-[var(--brand-blue)]"
                  }`}
                >
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EditorialSection({
  values,
  prefix,
  reverse = false,
}: {
  values: Record<string, unknown>;
  prefix: string;
  reverse?: boolean;
}) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const title = stringValue(values, `${prefix}.title`);
  const text = stringValue(values, `${prefix}.text`);
  const media = imageValue(values, `${prefix}.image`);
  const hasImage = Boolean(media.desktopUrl || media.mobileUrl);

  if (!title && !text && !hasImage) return null;

  return (
    <section className="border-b border-[#171916]/10 bg-white px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
        {hasImage ? (
          <ConteudoImagemResponsiva
            media={media}
            className={`aspect-[4/5] ${reverse ? "lg:order-2" : ""}`}
          />
        ) : (
          <div className={`aspect-[4/5] bg-[var(--brand-blue-soft)] ${reverse ? "lg:order-2" : ""}`} />
        )}
        <div className={reverse ? "lg:order-1" : ""}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-blue)]">
            Stella Colari
          </p>
          {title ? (
            <h2 className="mt-5 max-w-xl text-balance text-[clamp(2.4rem,5vw,5.4rem)] font-light leading-[0.98] tracking-[-0.035em] text-[#171916]">
              {title}
            </h2>
          ) : null}
          {text ? (
            <p className="mt-7 max-w-xl whitespace-pre-line text-pretty text-base leading-8 text-[#171916]/70">
              {text}
            </p>
          ) : null}
          <EditorialButton
            label={stringValue(values, `${prefix}.ctaLabel`)}
            href={stringValue(values, `${prefix}.ctaHref`)}
          />
        </div>
      </div>
    </section>
  );
}

function ProductSection({
  values,
  prefix,
  produtos,
  experienceKey,
}: {
  values: Record<string, unknown>;
  prefix: string;
  produtos: ProdutoCardLojaItem[];
  experienceKey: string;
}) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const ids = arrayValue(values, `${prefix}.productIds`);
  const categoryIds = arrayValue(values, `${prefix}.categoryIds`);
  let selected = ids.length > 0
    ? ids.map((id) => produtos.find((produto) => produto.id === id)).filter(Boolean)
    : [...produtos];
  if (categoryIds.length > 0) {
    selected = selected.filter((produto) =>
      produto?.categoriaIds?.some((id) => categoryIds.includes(id)),
    );
  }
  if (experienceKey === "ofertas") {
    selected = selected.filter(
      (produto) =>
        produto?.descontoAtivo &&
        produto.precoPromocional !== null &&
        produto.precoPromocional < produto.precoVenda,
    );
  } else if (
    (experienceKey === "novidades" || prefix === "newArrivals") &&
    ids.length === 0
  ) {
    selected.sort(
      (a, b) =>
        Date.parse(b?.criadoEm || "") - Date.parse(a?.criadoEm || ""),
    );
  }
  selected = selected.slice(0, 8);
  const title = stringValue(values, `${prefix}.title`);
  const text = stringValue(values, `${prefix}.text`);
  const ctaLabel = stringValue(values, `${prefix}.ctaLabel`);
  const ctaHref = safeHref(stringValue(values, `${prefix}.ctaHref`));

  return (
    <section className="border-b border-[#171916]/10 bg-white px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl md:mb-14">
          {title ? (
            <h2 className="text-balance text-[clamp(2.2rem,4.5vw,4.8rem)] font-light leading-none tracking-[-0.035em] text-[#171916]">
              {title}
            </h2>
          ) : null}
          {text ? <p className="mt-5 max-w-2xl text-base leading-7 text-[#171916]/65">{text}</p> : null}
        </div>
        {selected.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
            {selected.map((produto) =>
              produto ? (
                <ProdutoCardLoja
                  key={produto.id}
                  produto={produto}
                  exibirImagemHover
                  trackingOrigem={`conteudo-${prefix}`}
                />
              ) : null,
            )}
          </div>
        ) : (
          <p className="border border-dashed border-[#171916]/20 px-5 py-12 text-center text-sm text-[#171916]/55">
            Nenhum produto público disponível nesta seleção.
          </p>
        )}
        {ctaLabel && ctaHref ? (
          <div className="mt-12 text-center">
            <EditorialButton label={ctaLabel} href={ctaHref} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CategorySection({
  values,
  prefix,
  categorias,
}: {
  values: Record<string, unknown>;
  prefix: string;
  categorias: CategoriaMenuPublicoItem[];
}) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const ids = arrayValue(values, `${prefix}.categoryIds`);
  const selected = ids.length > 0
    ? ids.map((id) => categorias.find((categoria) => categoria.id === id)).filter(Boolean)
    : categorias.filter((categoria) => !categoria.categoriaMaeId).slice(0, 6);

  return (
    <section className="border-b border-[#171916]/10 bg-[#f7f9fb] px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-balance text-[clamp(2.2rem,4.5vw,4.8rem)] font-light leading-none tracking-[-0.035em] text-[#171916]">
            {stringValue(values, `${prefix}.title`)}
          </h2>
          {stringValue(values, `${prefix}.text`) ? (
            <p className="mt-5 text-base leading-7 text-[#171916]/65">{stringValue(values, `${prefix}.text`)}</p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selected.map((categoria) =>
            categoria ? (
              <Link
                key={categoria.id}
                href={`/loja/categoria/${categoria.slug}`}
                className="group relative aspect-[4/5] overflow-hidden bg-[var(--brand-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2"
              >
                {categoria.imagemUrl ? (
                  <img
                    src={categoria.imagemUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                ) : null}
                <span className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/70 via-transparent to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
                  <span className="text-2xl font-light tracking-[-0.02em]">{categoria.nome}</span>
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ) : null,
          )}
        </div>
      </div>
    </section>
  );
}

function TextSection({ values, prefix }: { values: Record<string, unknown>; prefix: string }) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const title = stringValue(values, `${prefix}.title`);
  const text = stringValue(values, `${prefix}.text`);
  if (!title && !text) return null;

  return (
    <section className="border-b border-[#171916]/10 bg-white px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        {title ? (
          <h2 className="text-balance text-[clamp(2.2rem,4.5vw,4.8rem)] font-light leading-none tracking-[-0.035em] text-[#171916]">
            {title}
          </h2>
        ) : null}
        {text ? (
          <p className="mt-7 whitespace-pre-line text-pretty text-base leading-8 text-[#171916]/70 md:text-lg">
            {text}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function LinkCardsSection({ values, prefix }: { values: Record<string, unknown>; prefix: string }) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const cards = Array.from({ length: 5 }, (_, index) => {
    const key = `${prefix}.card${index + 1}`;
    return {
      title: stringValue(values, `${key}.title`),
      text: stringValue(values, `${key}.text`),
      label: stringValue(values, `${key}.label`),
      href: safeHref(stringValue(values, `${key}.href`)),
    };
  }).filter((card) => card.title || card.text || (card.label && card.href));
  const title = stringValue(values, `${prefix}.title`);
  const text = stringValue(values, `${prefix}.text`);
  if (!title && !text && cards.length === 0) return null;

  return (
    <section className="border-b border-[#171916]/10 bg-white px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {title ? (
          <h2 className="max-w-4xl text-balance text-[clamp(2.2rem,4.5vw,4.8rem)] font-light leading-none tracking-[-0.035em] text-[#171916]">
            {title}
          </h2>
        ) : null}
        {text ? <p className="mt-5 max-w-3xl text-pretty text-base leading-7 text-[#171916]/65">{text}</p> : null}
        {cards.length > 0 ? (
          <div className="mt-10 grid border-l border-t border-[#171916]/12 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => (
              <article key={`${prefix}-${index}`} className="flex min-h-56 flex-col border-b border-r border-[#171916]/12 p-6 sm:p-7">
                {card.title ? <h3 className="text-xl font-medium tracking-[-0.02em] text-[#171916]">{card.title}</h3> : null}
                {card.text ? <p className="mt-4 flex-1 whitespace-pre-line text-sm leading-6 text-[#171916]/65">{card.text}</p> : <span className="flex-1" />}
                {card.label && card.href ? (
                  <Link href={card.href} className="mt-7 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-blue-dark)] underline-offset-4 hover:underline">
                    {card.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContactSection({ values }: { values: Record<string, unknown> }) {
  if (!boolValue(values, "contacts.enabled")) return null;
  const title = stringValue(values, "contacts.title");
  const text = stringValue(values, "contacts.text");
  const label = stringValue(values, "contacts.primaryLabel");
  const href = safeHref(stringValue(values, "contacts.primaryHref"));
  if (!title && !text && !(label && href)) return null;

  return (
    <section className="border-b border-[#171916]/10 bg-[#f7f9fb] px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        {title ? <h2 className="text-balance text-4xl font-light tracking-[-0.035em] text-[#171916] md:text-6xl">{title}</h2> : null}
        {text ? <p className="mt-6 whitespace-pre-line text-base leading-8 text-[#171916]/70">{text}</p> : null}
        {label && href ? <EditorialButton label={label} href={href} /> : null}
      </div>
    </section>
  );
}

function FaqSection({ values }: { values: Record<string, unknown> }) {
  if (!boolValue(values, "faq.enabled")) return null;
  const items = Array.from({ length: 3 }, (_, index) => ({
    question: stringValue(values, `faq.question${index + 1}`),
    answer: stringValue(values, `faq.answer${index + 1}`),
  })).filter((item) => item.question || item.answer);
  if (items.length === 0) return null;

  return (
    <section className="border-b border-[#171916]/10 bg-white px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-balance text-4xl font-light tracking-[-0.035em] text-[#171916] md:text-6xl">Perguntas frequentes</h2>
        <div className="mt-10 divide-y divide-[#171916]/12 border-y border-[#171916]/12">
          {items.map((item, index) => (
            <details key={index} className="group py-5">
              <summary className="cursor-pointer list-none pr-8 text-lg font-medium text-[#171916] marker:hidden">{item.question}</summary>
              {item.answer ? <p className="mt-4 whitespace-pre-line text-base leading-7 text-[#171916]/68">{item.answer}</p> : null}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function LegalSection({ values }: { values: Record<string, unknown> }) {
  const title = stringValue(values, "content.title");
  const introduction = stringValue(values, "content.introduction");
  const body = stringValue(values, "content.body");
  const effectiveDate = stringValue(values, "content.effectiveDate");
  if (!title && !introduction && !body) return null;

  return (
    <article className="bg-white px-5 py-16 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        {title ? <h1 className="text-balance text-4xl font-light tracking-[-0.035em] text-[#171916] md:text-6xl">{title}</h1> : null}
        {effectiveDate ? <p className="mt-4 text-sm text-[#171916]/55">Vigência: {effectiveDate}</p> : null}
        {introduction ? <p className="mt-8 whitespace-pre-line text-lg leading-8 text-[#171916]/72">{introduction}</p> : null}
        {body ? <div className="mt-10 whitespace-pre-line text-base leading-8 text-[#171916]/72">{body}</div> : null}
      </div>
    </article>
  );
}

function GallerySection({ values, prefix }: { values: Record<string, unknown>; prefix: string }) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const items = [1, 2, 3, 4]
    .map((index) => {
      const item = `${prefix}.item${index}`;
      return {
        media: imageValue(values, `${item}.image`),
        title: stringValue(values, `${item}.title`),
        text: stringValue(values, `${item}.text`),
        label: stringValue(values, `${item}.label`),
        href: safeHref(stringValue(values, `${item}.href`)),
      };
    })
    .filter((item) => item.media.desktopUrl || item.media.mobileUrl);
  if (items.length === 0) return null;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="px-5 sm:px-8 lg:px-12">
        <h2 className="mx-auto max-w-7xl text-balance text-[clamp(2.2rem,4.5vw,4.8rem)] font-light leading-none tracking-[-0.035em] text-[#171916]">
          {stringValue(values, `${prefix}.title`)}
        </h2>
        {stringValue(values, `${prefix}.text`) ? (
          <p className="mx-auto mt-5 max-w-7xl text-base leading-7 text-[#171916]/65">
            {stringValue(values, `${prefix}.text`)}
          </p>
        ) : null}
      </div>
      <div className="mt-10 grid gap-px bg-[#171916]/10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <article key={index} className="group relative aspect-[4/5] overflow-hidden bg-white">
            <ConteudoImagemResponsiva media={item.media} className="absolute inset-0 transition duration-700 group-hover:scale-[1.02]" />
            {item.title || item.text || (item.label && item.href) ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/75 via-[#0f172a]/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  {item.title ? <h3 className="text-2xl font-light tracking-[-0.02em]">{item.title}</h3> : null}
                  {item.text ? <p className="mt-2 text-sm leading-6 text-white/78">{item.text}</p> : null}
                  {item.label && item.href ? (
                    <Link href={item.href} className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] underline-offset-4 hover:underline">
                      {item.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function CtaSection({ values, prefix }: { values: Record<string, unknown>; prefix: string }) {
  if (!boolValue(values, `${prefix}.enabled`)) return null;
  const title = stringValue(values, `${prefix}.title`);
  const text = stringValue(values, `${prefix}.text`);
  const label = stringValue(values, `${prefix}.label`);
  const href = safeHref(stringValue(values, `${prefix}.href`));
  const secondaryLabel = stringValue(values, `${prefix}.secondaryLabel`);
  const secondaryHref = safeHref(stringValue(values, `${prefix}.secondaryHref`));
  if (!title && !text && !(label && href) && !(secondaryLabel && secondaryHref)) return null;

  return (
    <section className="border-y border-white/30 bg-[var(--brand-blue)] px-5 py-20 text-white sm:px-8 md:py-32 lg:px-12">
      <div className="mx-auto max-w-5xl text-center">
        {title ? (
          <h2 className="text-balance text-[clamp(2.6rem,6vw,6.8rem)] font-light leading-[0.95] tracking-[-0.04em]">
            {title}
          </h2>
        ) : null}
        {text ? <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white">{text}</p> : null}
        {(label && href) || (secondaryLabel && secondaryHref) ? (
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {label && href ? (
              <Link
                href={href}
                className="inline-flex min-h-12 items-center justify-center border border-white bg-white px-7 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)] transition hover:text-[var(--brand-blue-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-blue)]"
              >
                {label}
              </Link>
            ) : null}
            {secondaryLabel && secondaryHref ? (
              <Link
                href={secondaryHref}
                className="inline-flex min-h-12 items-center justify-center border border-white px-7 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-[var(--brand-blue)]"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ConteudoPaginaExperience({
  pagina,
  contrato,
  conteudo,
  produtos,
  categorias,
  categoryGrid,
}: Props) {
  const values = conteudo.values as Record<string, unknown>;
  let editorialIndex = 0;

  return (
    <div data-conteudo-loja={contrato.key}>
      {contrato.sections.map((section) => {
        if (section.tipoVisual === "SEO" || section.tipoVisual === "CAMPANHA") return null;
        if (section.tipoVisual === "HERO") {
          return (
            <HeroSection
              key={section.key}
              values={values}
              prefix={section.key}
              compact={contrato.key === "atendimento"}
              fallbackTitle={contrato.key === "categoria" ? pagina.titulo : ""}
            />
          );
        }
        if (section.tipoVisual === "EDITORIAL") {
          const reverse = editorialIndex++ % 2 === 1;
          return <EditorialSection key={section.key} values={values} prefix={section.key} reverse={reverse} />;
        }
        if (section.tipoVisual === "PRODUTOS") {
          return (
            <ProductSection
              key={section.key}
              values={values}
              prefix={section.key}
              produtos={produtos}
              experienceKey={contrato.key}
            />
          );
        }
        if (section.tipoVisual === "CATEGORIAS") {
          return <CategorySection key={section.key} values={values} prefix={section.key} categorias={categorias} />;
        }
        if (section.tipoVisual === "GALERIA") {
          return <GallerySection key={section.key} values={values} prefix={section.key} />;
        }
        if (section.tipoVisual === "CTA") {
          return <CtaSection key={section.key} values={values} prefix={section.key} />;
        }
        if (contrato.key === "legal" && section.key === "content") {
          return <LegalSection key={section.key} values={values} />;
        }
        if (section.key === "contacts") {
          return <ContactSection key={section.key} values={values} />;
        }
        if (section.key === "faq") {
          return <FaqSection key={section.key} values={values} />;
        }
        if (section.temCardsLinks) {
          return <LinkCardsSection key={section.key} values={values} prefix={section.key} />;
        }
        if (contrato.key === "categoria" && section.key === "beforeGrid") {
          return (
            <Fragment key={section.key}>
              <TextSection values={values} prefix={section.key} />
              {categoryGrid}
            </Fragment>
          );
        }
        return <TextSection key={section.key} values={values} prefix={section.key} />;
      })}
      {contrato.sections.length === 0 ? (
        <section className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h1 className="text-4xl font-light text-[#171916]">{pagina.titulo}</h1>
        </section>
      ) : null}
    </div>
  );
}
