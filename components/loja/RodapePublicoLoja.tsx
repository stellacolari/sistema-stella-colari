"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import { normalizarLojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import { abrirPreferenciasPrivacidade } from "@/lib/loja/consentimento-privacidade";
import { normalizarHrefPublico } from "@/lib/loja/url-publica";

type RodapeMenuItem = {
  id: string;
  nome: string;
  href: string;
};

type RodapePublicoLojaProps = {
  menus: RodapeMenuItem[];
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
  brandingSimplificado?: boolean;
};

const LEGAL_LINKS = [
  { href: "/loja/termos-de-uso", label: "Termos de Uso" },
  { href: "/loja/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/loja/politica-de-cookies", label: "Política de Cookies" },
  { href: "/loja/trocas-e-devolucoes", label: "Trocas e Devoluções" },
  { href: "/loja/frete-e-prazos", label: "Frete e Prazos" },
  { href: "/loja/contato", label: "Contato" },
];

function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function LinkRodape({
  href,
  children,
  novaAba,
}: {
  href: string;
  children: ReactNode;
  novaAba?: boolean;
}) {
  const hrefSeguro = normalizarHrefPublico(href, "/loja");
  const external = novaAba || isExternalUrl(hrefSeguro);

  return (
    <Link
      href={hrefSeguro}
      prefetch={false}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group w-fit text-[12px] font-normal leading-6 text-white/65 transition hover:text-white"
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
        {children}
      </span>
    </Link>
  );
}

function BotaoRodape({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-fit text-left text-[12px] font-normal leading-6 text-white/65 transition hover:text-white"
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
        {children}
      </span>
    </button>
  );
}

export default function RodapePublicoLoja({
  menus,
  configuracaoMenuRodape,
  brandingSimplificado = false,
}: RodapePublicoLojaProps) {
  const config = normalizarLojaMenuRodapeConfig(configuracaoMenuRodape);

  if (!config.rodape.ativo) {
    return null;
  }

  const redesAtivas = config.redesSociais
    .map((rede) => ({
      ...rede,
      url: normalizarHrefPublico(rede.url),
    }))
    .filter((rede) => rede.ativo && rede.url);
  const selosAtivos = config.selos.filter((selo) => selo.ativo && selo.imagemUrl);
  const linksPersonalizadosAtivos = config.rodape.colunas.flatMap((coluna) =>
    coluna.links.filter((link) => link.ativo)
  );
  const hrefsPersonalizados = new Set(
    linksPersonalizadosAtivos.map((link) => link.href)
  );
  const possuiColunaLojaPersonalizada = config.rodape.colunas.some(
    (coluna) =>
      coluna.id.trim().toLowerCase() === "loja" ||
      coluna.titulo.trim().toLowerCase() === "loja"
  );
  const linksLegaisComplementares = LEGAL_LINKS.filter(
    (link) => !hrefsPersonalizados.has(link.href)
  );

  return (
    <footer className="mt-16 bg-black text-white sm:mt-24">
      <div className="border-b border-white/15">
        <div className={`mx-auto grid max-w-[1600px] gap-14 px-5 py-14 sm:px-7 sm:py-16 lg:gap-20 lg:px-10 lg:py-20 ${brandingSimplificado ? "" : "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)]"}`}>
          {!brandingSimplificado ? (
          <div className="lg:pr-8">
            <p className="max-w-xl text-[clamp(1.35rem,2.2vw,2.4rem)] font-light leading-[1.18] tracking-[-0.025em] text-white">
              {config.rodape.textoInstitucional}
            </p>

            {redesAtivas.length > 0 && (
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
                {redesAtivas.map((rede) => (
                  <Link
                    key={rede.id}
                    href={rede.url}
                    target="_blank"
                    rel="noreferrer"
                    className="border-b border-white/30 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/70 transition hover:border-white hover:text-white"
                  >
                    {rede.nome}
                  </Link>
                ))}
              </div>
            )}

            {selosAtivos.length > 0 && (
              <div className="mt-9 flex flex-wrap items-center gap-3">
                {selosAtivos.map((selo) => {
                  const imagem = (
                    <img
                      src={selo.imagemUrl}
                      alt={selo.altText || selo.nome}
                      className="h-9 max-w-[112px] object-contain"
                    />
                  );

                  if (selo.linkUrl) {
                    const linkSeguro = normalizarHrefPublico(selo.linkUrl);

                    if (!linkSeguro) {
                      return (
                        <span
                          key={selo.id}
                          className="inline-flex border border-white/20 bg-white px-3 py-2"
                        >
                          {imagem}
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={selo.id}
                        href={linkSeguro}
                        target={isExternalUrl(linkSeguro) ? "_blank" : undefined}
                        rel={isExternalUrl(linkSeguro) ? "noreferrer" : undefined}
                        className="inline-flex border border-white/20 bg-white px-3 py-2 transition hover:border-white/60"
                      >
                        {imagem}
                      </Link>
                    );
                  }

                  return (
                    <span
                      key={selo.id}
                      className="inline-flex border border-white/20 bg-white px-3 py-2"
                    >
                      {imagem}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          ) : null}

          <div className={`grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 ${brandingSimplificado ? "" : "border-t border-white/15 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0"}`}>
            {config.rodape.colunas.map((coluna, index) => (
              <nav
                key={coluna.id}
                aria-label={`Rodapé — ${coluna.titulo}${index > 0 ? ` ${index + 1}` : ""}`}
                className="space-y-5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  {coluna.titulo}
                </p>

                <div className="grid gap-1.5">
                  {coluna.links
                    .filter((link) => link.ativo)
                    .map((link) => (
                      <LinkRodape
                        key={link.id}
                        href={link.href}
                        novaAba={link.novaAba}
                      >
                        {link.label}
                      </LinkRodape>
                    ))}
                </div>
              </nav>
            ))}

            {(config.rodape.mostrarLinksMenu || config.rodape.mostrarCarrinho) &&
              !possuiColunaLojaPersonalizada && (
                <nav aria-label="Rodapé — navegação da loja" className="space-y-5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/45">
                    Loja
                  </p>

                  <div className="grid gap-1.5">
                    <LinkRodape href="/loja">Home</LinkRodape>

                    {config.rodape.mostrarLinksMenu &&
                      menus.map((menu) => (
                        <LinkRodape key={menu.id} href={menu.href}>
                          {menu.nome}
                        </LinkRodape>
                      ))}

                    {config.rodape.mostrarCarrinho && (
                      <LinkRodape href="/loja/carrinho">Carrinho</LinkRodape>
                    )}
                  </div>
                </nav>
              )}

            <nav aria-label="Rodapé — informações e privacidade" className="space-y-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/45">
                Informações
              </p>

              <div className="grid gap-1.5">
                {linksLegaisComplementares.map((link) => (
                  <LinkRodape key={link.href} href={link.href}>
                    {link.label}
                  </LinkRodape>
                ))}
                <BotaoRodape onClick={abrirPreferenciasPrivacidade}>
                  Preferências de privacidade
                </BotaoRodape>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] overflow-hidden px-5 pb-7 pt-9 sm:px-7 sm:pb-9 lg:px-10">
        <div className="flex flex-col gap-5 border-t border-white/15 pt-6 text-[9px] font-medium uppercase tracking-[0.18em] text-white/45 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {config.rodape.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
