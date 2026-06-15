"use client";

import type { ElementType } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Users,
  Warehouse,
} from "lucide-react";

type MenuTone = "default" | "site" | "system";
type PerfilAdmin = "ACESSO_GERAL" | "VENDEDOR";

type MenuSingleLink = {
  type: "link";
  href: string;
  label: string;
  icon: ElementType;
  description?: string;
  highlight?: boolean;
  tone?: MenuTone;
  exact?: boolean;
  activePrefixes?: string[];
};

type MenuGroup = {
  type: "group";
  href: string;
  label: string;
  icon: ElementType;
  description?: string;
  defaultOpen?: boolean;
  highlight?: boolean;
  quickAddHref?: string;
  quickAddLabel?: string;
  tone?: MenuTone;
  activePrefixes?: string[];
  links: {
    href: string;
    label: string;
    icon?: ElementType;
    tone?: MenuTone;
    exact?: boolean;
    activePrefixes?: string[];
  }[];
};

type MenuItem = MenuSingleLink | MenuGroup;

type MenuSection = {
  title?: string;
  description?: string;
  items: MenuItem[];
};

type QuickAction = {
  href: string;
  label: string;
  icon: ElementType;
  tone?: MenuTone;
};

const menuSections: MenuSection[] = [
  {
    title: "Operação",
    description: "Rotina do dia a dia",
    items: [
      {
        type: "link",
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Visão geral do sistema",
      },
      {
        type: "link",
        href: "/pedidos",
        label: "Pedidos",
        icon: ClipboardList,
        description: "Central operacional",
        highlight: true,
      },
      {
        type: "link",
        href: "/vendas",
        label: "Vendas",
        icon: ShoppingBag,
        description: "Histórico de vendas",
      },
      {
        type: "link",
        href: "/clientes",
        label: "Clientes",
        icon: Users,
        description: "Cadastro e histórico",
      },
    ],
  },
  {
    title: "Catálogo",
    description: "Produtos, estoque e insumos",
    items: [
      {
        type: "link",
        href: "/produtos",
        label: "Produtos",
        icon: Package,
        description: "Cadastro, variações e famílias",
      },
      {
        type: "link",
        href: "/estoque",
        label: "Estoque",
        icon: Warehouse,
        description: "Saldos e ajustes",
      },
      {
        type: "link",
        href: "/insumos-embalagens",
        label: "Insumos e Embalagens",
        icon: Boxes,
        description: "Insumos, regras e embalagens",
        exact: true,
        activePrefixes: [
          "/itens-adicionais",
          "/regras-categoria",
          "/configuracoes/loja/embalagens",
        ],
      },
    ],
  },
  {
    title: "Financeiro",
    description: "Compras, gastos e reposição",
    items: [
      {
        type: "link",
        href: "/compras",
        label: "Compras e Financeiro",
        icon: ShoppingCart,
        description: "Central de compras e financeiro",
      },
    ],
  },
  {
    title: "Loja",
    description: "Site público e loja online",
    items: [
      {
        type: "link",
        href: "/configuracoes/loja",
        label: "Loja Online",
        icon: Store,
        description: "Vitrine, campanhas e canais",
        tone: "site",
        exact: true,
        activePrefixes: [
          "/configuracoes/loja/banners-menu",
          "/configuracoes/loja/cashback",
          "/configuracoes/loja/categorias",
          "/configuracoes/loja/cupons",
          "/configuracoes/loja/formularios",
          "/configuracoes/loja/frete",
          "/configuracoes/loja/home",
          "/configuracoes/loja/paginas",
        ],
      },
    ],
  },
  {
    title: "Gestão",
    description: "Indicadores da operação",
    items: [
      {
        type: "link",
        href: "/relatorios",
        label: "Relatórios",
        icon: BarChart3,
        description: "Resumos de vendas, estoque e clientes",
        exact: true,
        activePrefixes: ["/resumos"],
      },
    ],
  },
  {
    title: "Sistema",
    description: "Ajustes administrativos",
    items: [
      {
        type: "link",
        href: "/configuracoes",
        label: "Configurações",
        icon: SlidersHorizontal,
        description: "Loja, integrações e lixeira",
        tone: "system",
        exact: true,
        activePrefixes: ["/configuracoes/integracoes", "/lixeira"],
      },
    ],
  },
];

const vendedorMenuSections: MenuSection[] = [
  {
    title: "Operação",
    description: "Rotina do dia a dia",
    items: [
      {
        type: "link",
        href: "/pedidos",
        label: "Pedidos",
        icon: ClipboardList,
        description: "Central operacional",
        highlight: true,
      },
      {
        type: "link",
        href: "/vendas",
        label: "Vendas",
        icon: ShoppingBag,
        description: "Histórico de vendas",
      },
      {
        type: "link",
        href: "/clientes",
        label: "Clientes",
        icon: Users,
        description: "Cadastro e histórico",
      },
    ],
  },
  {
    title: "Catálogo",
    description: "Consulta de produtos",
    items: [
      {
        type: "link",
        href: "/produtos",
        label: "Produtos",
        icon: Package,
        description: "Catálogo de produtos",
      },
    ],
  },
];

const quickActions: QuickAction[] = [
  {
    href: "/vendas/nova-v2",
    label: "Nova venda",
    icon: ShoppingBag,
  },
  {
    href: "/compras/nova-v2",
    label: "Nova compra de estoque",
    icon: ShoppingCart,
  },
  {
    href: "/produtos/novo",
    label: "Novo produto",
    icon: Package,
  },
];

const vendedorQuickActions: QuickAction[] = [
  {
    href: "/vendas/nova-v2",
    label: "Nova venda",
    icon: ShoppingBag,
  },
];

function isPathActive(
  pathname: string,
  href: string,
  exact = false,
  activePrefixes: string[] = []
) {
  if (
    activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  if (href === "/") {
    return pathname === "/";
  }

  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getItemTone(item: { tone?: MenuTone }) {
  return item.tone || "default";
}

function getItemButtonClass({
  active,
  highlight,
  tone,
}: {
  active: boolean;
  highlight?: boolean;
  tone: MenuTone;
}) {
  if (active && tone === "site") {
    return "border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-indigo-100";
  }

  if (active && tone === "system") {
    return "border-violet-200 bg-violet-50 text-violet-800 shadow-sm ring-1 ring-violet-100";
  }

  if (active) {
    return "border-slate-200 bg-slate-100 text-slate-950 shadow-sm ring-1 ring-slate-100";
  }

  if (highlight && tone === "site") {
    return "border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-white to-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50/80";
  }

  if (highlight) {
    return "border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white text-slate-900 hover:bg-slate-100";
  }

  if (tone === "site") {
    return "border-transparent bg-white text-slate-700 hover:border-indigo-100 hover:bg-indigo-50/60 hover:text-indigo-800";
  }

  if (tone === "system") {
    return "border-transparent bg-white text-slate-700 hover:border-violet-100 hover:bg-violet-50/60 hover:text-violet-800";
  }

  return "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950";
}

function getSubItemClass({
  active,
  tone,
}: {
  active: boolean;
  tone: MenuTone;
}) {
  if (active && tone === "site") {
    return "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200";
  }

  if (active && tone === "system") {
    return "bg-violet-50 text-violet-800 ring-1 ring-violet-200";
  }

  if (active) {
    return "bg-slate-100 text-slate-900 ring-1 ring-slate-200";
  }

  if (tone === "site") {
    return "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-800";
  }

  if (tone === "system") {
    return "text-slate-600 hover:bg-violet-50/70 hover:text-violet-800";
  }

  return "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
}

function getGroupWrapperClass({
  active,
  tone,
}: {
  active: boolean;
  tone: MenuTone;
}) {
  if (active && tone === "site") {
    return "border-indigo-100 bg-indigo-50/35";
  }

  if (active && tone === "system") {
    return "border-violet-100 bg-violet-50/35";
  }

  if (active) {
    return "border-slate-200 bg-slate-50";
  }

  return "border-transparent bg-transparent";
}

function getIconBoxClass({
  active,
  tone,
}: {
  active: boolean;
  tone: MenuTone;
}) {
  if (active && tone === "site") {
    return "bg-white text-indigo-700 ring-indigo-200";
  }

  if (active && tone === "system") {
    return "bg-white text-violet-700 ring-violet-200";
  }

  if (active) {
    return "bg-white text-slate-900 ring-slate-200";
  }

  if (tone === "site") {
    return "bg-white/80 text-indigo-600 ring-indigo-100";
  }

  if (tone === "system") {
    return "bg-white/80 text-violet-600 ring-violet-100";
  }

  return "bg-white/80 text-slate-600 ring-slate-200";
}

function getMenuSections(perfil: PerfilAdmin) {
  return perfil === "VENDEDOR" ? vendedorMenuSections : menuSections;
}

function getQuickActions(perfil: PerfilAdmin) {
  return perfil === "VENDEDOR" ? vendedorQuickActions : quickActions;
}

function getSectionGroups(sections: MenuSection[]) {
  return sections.flatMap((section) =>
    section.items
      .filter((item): item is MenuGroup => item.type === "group")
      .map((group) => ({
        href: group.href,
        defaultOpen: group.defaultOpen ?? false,
        activePrefixes: group.activePrefixes ?? [],
        links: group.links,
      }))
  );
}

export default function SidebarMenu({
  perfil = "VENDEDOR",
  onNavigate,
  compacto = false,
  onCompactoChange,
  showCompactToggle = false,
}: {
  perfil?: PerfilAdmin;
  onNavigate?: () => void;
  compacto?: boolean;
  onCompactoChange?: () => void;
  showCompactToggle?: boolean;
}) {
  const pathname = usePathname();
  const sections = useMemo(() => getMenuSections(perfil), [perfil]);
  const actions = useMemo(() => getQuickActions(perfil), [perfil]);

  const groups = useMemo(() => getSectionGroups(sections), [sections]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };

      groups.forEach((group) => {
        const groupIsActive =
          isPathActive(pathname, group.href, false, group.activePrefixes) ||
          group.links.some((link) =>
            isPathActive(
              pathname,
              link.href,
              link.exact,
              link.activePrefixes
            )
          );

        if (typeof next[group.href] === "undefined") {
          next[group.href] = group.defaultOpen || groupIsActive;
          return;
        }

        if (groupIsActive) {
          next[group.href] = true;
        }
      });

      return next;
    });
  }, [groups, pathname]);

  function toggleGroup(href: string) {
    setOpenGroups((current) => ({
      ...current,
      [href]: !current[href],
    }));
  }

  function alternarModoMenu() {
    onCompactoChange?.();
  }

  const sectionSpacing = compacto ? "space-y-3" : "space-y-6";
  const itemSpacing = compacto ? "space-y-0.5" : "space-y-1.5";
  const itemPadding = compacto ? "justify-center px-2 py-2" : "px-3 py-3";
  const itemGap = compacto ? "gap-0" : "gap-3";
  const iconBoxSize = compacto ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl";
  const subItemPadding = compacto ? "px-2.5 py-1.5" : "px-3 py-2.5";
  const sectionTitleMargin = compacto ? "mb-1.5 px-2" : "mb-3 px-2";
  const panelPadding = compacto ? "px-2 py-3" : "px-3 py-4";
  const groupPad = compacto ? "p-1" : "p-1.5";
  const subItemsWrap = compacto ? "mt-1 space-y-0.5 pl-2" : "mt-2 space-y-1 pl-3";
  const quickActionSpacing = compacto ? "space-y-1" : "space-y-1.5";

  return (
    <aside className="flex h-full w-full flex-col rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
      {showCompactToggle && (
      <div className="border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={alternarModoMenu}
          title={compacto ? "Expandir menu" : "Compactar menu"}
          className={`flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white px-3 py-2 text-left text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${
            compacto ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            {!compacto && (
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Menu {compacto ? "compacto" : "extendido"}
              </p>
            </div>
            )}
          </div>

          {!compacto && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {compacto ? "Compacto" : "Extendido"}
          </span>
          )}
        </button>
      </div>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${panelPadding}`}>
        {actions.length > 0 ? (
          <div className={compacto ? "mb-3" : "mb-5"}>
            {!compacto ? (
              <div className="mb-2 px-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Ações rápidas
                </p>
              </div>
            ) : null}

            <div className={quickActionSpacing}>
              {actions.map((action) => {
                const active = isPathActive(pathname, action.href);
                const Icon = action.icon;
                const tone = getItemTone(action);

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    title={action.label}
                    onClick={onNavigate}
                    className={`group flex items-center ${itemGap} rounded-2xl border transition ${
                      compacto ? "justify-center px-2 py-2" : "px-3 py-2.5"
                    } ${getItemButtonClass({
                      active,
                      highlight: true,
                      tone,
                    })}`}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${iconBoxSize} ${getIconBoxClass(
                        {
                          active,
                          tone,
                        }
                      )}`}
                    >
                      <Icon className="h-[17px] w-[17px]" />
                    </div>

                    <div className={compacto ? "sr-only" : "min-w-0 flex-1"}>
                      <p className="truncate text-sm font-semibold">
                        {action.label}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <nav className={sectionSpacing}>
          {sections.map((section, sectionIndex) => (
            <div key={`${section.title || "sem-titulo"}-${sectionIndex}`}>
              {section.title ? (
                <div className={sectionTitleMargin}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ${
                    compacto ? "sr-only" : ""
                  }`}>
                    {section.title}
                  </p>

                  {!compacto && section.description ? (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {section.description}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className={itemSpacing}>
                {section.items.map((item) => {
                  if (item.type === "link") {
                    const active = isPathActive(
                      pathname,
                      item.href,
                      item.exact,
                      item.activePrefixes
                    );
                    const Icon = item.icon;
                    const tone = getItemTone(item);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        onClick={onNavigate}
                        className={`group flex items-center ${itemGap} rounded-2xl border transition ${itemPadding} ${getItemButtonClass(
                          {
                            active,
                            highlight: item.highlight,
                            tone,
                          }
                        )}`}
                      >
                        <div
                          className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${iconBoxSize} ${getIconBoxClass(
                            {
                              active,
                              tone,
                            }
                          )}`}
                        >
                          <Icon className="h-[17px] w-[17px]" />
                        </div>

                        <div className={compacto ? "sr-only" : "min-w-0 flex-1 text-left"}>
                          <p className="truncate text-sm font-semibold">
                            {item.label}
                          </p>

                          {!compacto && item.description ? (
                            <p className="truncate text-xs text-slate-500 transition group-hover:text-slate-600">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    );
                  }

                  const Icon = item.icon;
                  const tone = getItemTone(item);
                  const groupIsActive =
                    isPathActive(
                      pathname,
                      item.href,
                      false,
                      item.activePrefixes
                    ) ||
                    item.links.some((link) =>
                      isPathActive(
                        pathname,
                        link.href,
                        link.exact,
                        link.activePrefixes
                      )
                    );
                  const isOpen = openGroups[item.href] ?? false;

                  return (
                    <div
                      key={item.href}
                      className={`rounded-[1.4rem] border transition ${groupPad} ${getGroupWrapperClass(
                        {
                          active: groupIsActive,
                          tone,
                        }
                      )}`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={item.label}
                          onClick={() => toggleGroup(item.href)}
                          className={`group flex min-w-0 flex-1 items-center ${itemGap} rounded-2xl border text-left transition ${itemPadding} ${getItemButtonClass(
                            {
                              active: groupIsActive,
                              highlight: item.highlight,
                              tone,
                            }
                          )}`}
                        >
                          <div
                            className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${iconBoxSize} ${getIconBoxClass(
                              {
                                active: groupIsActive,
                                tone,
                              }
                            )}`}
                          >
                            <Icon className="h-[17px] w-[17px]" />
                          </div>

                          <div className={compacto ? "sr-only" : "min-w-0 flex-1 text-left"}>
                            <p className="truncate text-sm font-semibold">
                              {item.label}
                            </p>

                            {!compacto && item.description ? (
                              <p className="truncate text-xs text-slate-500 transition group-hover:text-slate-600">
                                {item.description}
                              </p>
                            ) : null}
                          </div>

                          {!compacto && (
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                          )}
                        </button>

                        {item.quickAddHref && !compacto ? (
                          <Link
                            href={item.quickAddHref}
                            title={item.quickAddLabel || "Adicionar"}
                            onClick={onNavigate}
                            className={`flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 ${
                              compacto ? "h-8 w-8 rounded-xl" : "h-11 w-11"
                            }`}
                          >
                            <Plus className={compacto ? "h-3.5 w-3.5" : "h-4 w-4"} />
                          </Link>
                        ) : null}
                      </div>

                      {isOpen && !compacto ? (
                        <div className={subItemsWrap}>
                          {item.links.length > 0 ? (
                            item.links.map((link) => {
                              const subActive = isPathActive(
                                pathname,
                                link.href,
                                link.exact,
                                link.activePrefixes
                              );
                              const SubIcon = link.icon;
                              const subTone = getItemTone(link);

                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  onClick={onNavigate}
                                  className={`flex items-center gap-3 rounded-2xl text-sm transition ${subItemPadding} ${getSubItemClass(
                                    {
                                      active: subActive,
                                      tone: subTone,
                                    }
                                  )}`}
                                >
                                  {SubIcon ? (
                                    <SubIcon className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-60" />
                                  )}

                                  <span className="truncate font-medium">
                                    {link.label}
                                  </span>
                                </Link>
                              );
                            })
                          ) : (
                            <Fragment>
                              <Link
                                href={item.href}
                                onClick={onNavigate}
                                className={`flex items-center gap-3 rounded-2xl text-sm transition ${subItemPadding} ${getSubItemClass(
                                  {
                                    active: isPathActive(
                                      pathname,
                                      item.href,
                                      false,
                                      item.activePrefixes
                                    ),
                                    tone,
                                  }
                                )}`}
                              >
                                <BarChart3 className="h-4 w-4 shrink-0" />
                                <span className="truncate font-medium">
                                  Abrir {item.label.toLowerCase()}
                                </span>
                              </Link>
                            </Fragment>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
