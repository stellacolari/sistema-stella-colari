"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import { normalizarLojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import { abrirPreferenciasPrivacidade } from "@/lib/loja/consentimento-privacidade";

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

const LOGO_URL = "/logo-stella.png";
const LEGAL_LINKS = [
  { href: "/loja/termos-de-uso", label: "Termos de Uso" },
  { href: "/loja/politica-de-privacidade", label: "Política de Privacidade" },
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
  const external = novaAba || isExternalUrl(href);

  return (
    <Link
      href={href}
      prefetch={false}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group w-fit text-[12px] font-normal leading-6 text-[#f4f0e8]/65 transition hover:text-[#f4f0e8]"
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
      className="group w-fit text-left text-[12px] font-normal leading-6 text-[#f4f0e8]/65 transition hover:text-[#f4f0e8]"
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

  const redesAtivas = config.redesSociais.filter(
    (rede) => rede.ativo && rede.url
  );
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
    <footer className="mt-16 bg-[#171815] text-[#f4f0e8] sm:mt-24">
      <div className="border-b border-[#f4f0e8]/15">
        <div className={`mx-auto grid max-w-[1600px] gap-14 px-5 py-14 sm:px-7 sm:py-16 lg:gap-20 lg:px-10 lg:py-20 ${brandingSimplificado ? "" : "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)]"}`}>
          {!brandingSimplificado ? (
          <div className="lg:pr-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#f4f0e8]/50">
              Stella Colari
            </p>

            <p className="mt-6 max-w-xl text-[clamp(1.35rem,2.2vw,2.4rem)] font-light leading-[1.18] tracking-[-0.025em] text-[#f4f0e8]">
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
                    className="border-b border-[#f4f0e8]/30 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#f4f0e8]/70 transition hover:border-[#f4f0e8] hover:text-[#f4f0e8]"
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
                    return (
                      <Link
                        key={selo.id}
                        href={selo.linkUrl}
                        target={isExternalUrl(selo.linkUrl) ? "_blank" : undefined}
                        rel={isExternalUrl(selo.linkUrl) ? "noreferrer" : undefined}
                        className="inline-flex border border-[#f4f0e8]/20 bg-white px-3 py-2 transition hover:border-[#f4f0e8]/60"
                      >
                        {imagem}
                      </Link>
                    );
                  }

                  return (
                    <span
                      key={selo.id}
                      className="inline-flex border border-[#f4f0e8]/20 bg-white px-3 py-2"
                    >
                      {imagem}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          ) : null}

          <div className={`grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 ${brandingSimplificado ? "" : "border-t border-[#f4f0e8]/15 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0"}`}>
            {config.rodape.colunas.map((coluna, index) => (
              <nav
                key={coluna.id}
                aria-label={`Rodapé — ${coluna.titulo}${index > 0 ? ` ${index + 1}` : ""}`}
                className="space-y-5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#f4f0e8]/45">
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
                  <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#f4f0e8]/45">
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
              <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#f4f0e8]/45">
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
        {!brandingSimplificado ? (
          <Link
            href="/loja"
            aria-label="Ir para a página inicial da loja"
            className="block"
          >
            <span className="block whitespace-nowrap text-center text-[clamp(2.5rem,11vw,10.5rem)] font-light uppercase leading-[0.82] tracking-[-0.065em] text-[#f4f0e8] transition hover:text-white">
              Stella Colari
            </span>
          </Link>
        ) : null}

        <div className={`${brandingSimplificado ? "" : "mt-9"} flex flex-col gap-5 border-t border-[#f4f0e8]/15 pt-6 text-[9px] font-medium uppercase tracking-[0.18em] text-[#f4f0e8]/45 sm:flex-row sm:items-center sm:justify-between`}>
          <p>
            © {new Date().getFullYear()} {config.rodape.copyright}
          </p>

          {!brandingSimplificado ? (
            <Link href="/loja" className="inline-flex w-fit items-center gap-3">
              <Image
                src={LOGO_URL}
                alt="Stella"
                width={150}
                height={40}
                className="h-7 w-auto max-w-[132px] object-contain brightness-0 invert opacity-65 transition hover:opacity-100"
              />
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
