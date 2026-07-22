"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Eye,
  FolderKanban,
  LayoutTemplate,
  Menu,
  PackageCheck,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";

type LojaConfigHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
};

const tabs = [
  {
    href: "/configuracoes/loja",
    label: "Central",
    icon: Store,
    exact: true,
  },
  {
    href: "/configuracoes/loja/menu-rodape",
    label: "Menu e Rodapé",
    icon: Menu,
  },
  {
    href: "/configuracoes/loja/conteudo",
    label: "Conteúdo",
    icon: LayoutTemplate,
  },
  {
    href: "/configuracoes/loja/categorias",
    label: "Categorias",
    icon: FolderKanban,
  },
  {
    href: "/configuracoes/loja/cupons",
    label: "Cupons",
    icon: Tag,
  },
  {
    href: "/configuracoes/loja/cashback",
    label: "Cashback",
    icon: Sparkles,
  },
  {
    href: "/configuracoes/loja/frete",
    label: "Frete",
    icon: PackageCheck,
  },
  {
    href: "/configuracoes/loja/embalagens",
    label: "Embalagens",
    icon: Boxes,
  },
  {
    href: "/configuracoes/loja/formularios",
    label: "Formulários",
    icon: ClipboardList,
  },
  {
    href: "/loja",
    label: "Ver loja",
    icon: Eye,
    external: true,
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function LojaConfigHeader({
  title,
  description,
  eyebrow = "Loja Online",
  actions,
}: LojaConfigHeaderProps) {
  const pathname = usePathname();

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {eyebrow}
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <nav className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              !tab.external && isActive(pathname, tab.href, tab.exact);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                target={tab.external ? "_blank" : undefined}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white"
                    : tab.external
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
