"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  GalleryVerticalEnd,
  History,
  LayoutDashboard,
  Megaphone,
  Menu,
  SearchCheck,
} from "lucide-react";

const items = [
  { href: "/configuracoes/loja/conteudo", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/configuracoes/loja/conteudo/paginas", label: "Páginas", icon: FileText },
  { href: "/configuracoes/loja/conteudo/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/configuracoes/loja/midias", label: "Mídia", icon: GalleryVerticalEnd },
  { href: "/configuracoes/loja/menu-rodape", label: "Menu e rodapé", icon: Menu },
  { href: "/configuracoes/loja/conteudo/seo", label: "SEO", icon: SearchCheck },
  { href: "/configuracoes/loja/conteudo/historico", label: "Histórico", icon: History },
];

export default function ConteudoLojaNav({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-blue)]">
              Conteúdo da Loja
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Conteúdo da Loja">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] ${
                  active
                    ? "border-[var(--brand-blue)] text-[var(--brand-blue-dark)]"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
