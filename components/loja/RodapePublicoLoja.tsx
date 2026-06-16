"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import { normalizarLojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";

type RodapeMenuItem = {
  id: string;
  nome: string;
  href: string;
};

type RodapePublicoLojaProps = {
  menus: RodapeMenuItem[];
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
};

const LOGO_URL = "/logo-stella.png";

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
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="text-sm font-medium text-slate-600 transition hover:text-[var(--brand-blue)]"
    >
      {children}
    </Link>
  );
}

export default function RodapePublicoLoja({
  menus,
  configuracaoMenuRodape,
}: RodapePublicoLojaProps) {
  const config = normalizarLojaMenuRodapeConfig(configuracaoMenuRodape);

  if (!config.rodape.ativo) {
    return null;
  }

  const redesAtivas = config.redesSociais.filter(
    (rede) => rede.ativo && rede.url
  );
  const selosAtivos = config.selos.filter((selo) => selo.ativo && selo.imagemUrl);

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:px-8">
        <div>
          <Link href="/loja" className="inline-flex shrink-0 items-center">
            <Image
              src={LOGO_URL}
              alt="Stella"
              width={180}
              height={48}
              className="h-10 w-auto object-contain"
            />
          </Link>

          <p className="mt-4 max-w-md text-sm font-medium leading-6 text-slate-500">
            {config.rodape.textoInstitucional}
          </p>

          {redesAtivas.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {redesAtivas.map((rede) => (
                <Link
                  key={rede.id}
                  href={rede.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {rede.nome}
                </Link>
              ))}
            </div>
          )}

          {selosAtivos.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {selosAtivos.map((selo) => {
                const imagem = (
                  <img
                    src={selo.imagemUrl}
                    alt={selo.altText || selo.nome}
                    className="h-10 max-w-[120px] object-contain"
                  />
                );

                if (selo.linkUrl) {
                  return (
                    <Link
                      key={selo.id}
                      href={selo.linkUrl}
                      target={isExternalUrl(selo.linkUrl) ? "_blank" : undefined}
                      rel={isExternalUrl(selo.linkUrl) ? "noreferrer" : undefined}
                      className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      {imagem}
                    </Link>
                  );
                }

                return (
                  <span
                    key={selo.id}
                    className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    {imagem}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {config.rodape.colunas.map((coluna) => (
            <nav key={coluna.id} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {coluna.titulo}
              </p>

              <div className="grid gap-2">
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

          {(config.rodape.mostrarLinksMenu || config.rodape.mostrarCarrinho) && (
            <nav className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Loja
              </p>

              <div className="grid gap-2">
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
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4 text-center text-xs font-medium text-slate-400">
        © {new Date().getFullYear()} {config.rodape.copyright}
      </div>
    </footer>
  );
}
