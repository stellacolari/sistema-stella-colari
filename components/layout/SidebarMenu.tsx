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
  FolderKanban,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  Plus,
  PlugZap,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag,
  Trash2,
  Users,
  Warehouse,
} from "lucide-react";

type MenuTone = "default" | "site" | "system";

type MenuSingleLink = {
  type: "link";
  href: string;
  label: string;
  icon: ElementType;
  description?: string;
  highlight?: boolean;
  tone?: MenuTone;
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
  links: {
    href: string;
    label: string;
    icon?: ElementType;
    tone?: MenuTone;
  }[];
};

type MenuItem = MenuSingleLink | MenuGroup;

type MenuSection = {
  title?: string;
  description?: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    items: [
      {
        type: "link",
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Visão geral do sistema",
      },
    ],
  },
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
        type: "group",
        href: "/vendas",
        label: "Vendas",
        icon: ShoppingBag,
        description: "Venda manual e histórico",
        defaultOpen: false,
        quickAddHref: "/vendas/nova-v2",
        quickAddLabel: "Nova venda",
        links: [
          {
            href: "/vendas",
            label: "Lista de vendas",
            icon: ShoppingBag,
          },
          {
            href: "/vendas/nova-v2",
            label: "Nova venda",
            icon: Plus,
          },
          {
            href: "/resumos/vendas",
            label: "Resumo de vendas",
            icon: BarChart3,
          },
        ],
      },
      {
        type: "group",
        href: "/compras",
        label: "Compras",
        icon: ShoppingCart,
        description: "Entradas e fornecedores",
        defaultOpen: false,
        quickAddHref: "/compras/nova-v2",
        quickAddLabel: "Nova compra",
        links: [
          {
            href: "/compras",
            label: "Lista de compras",
            icon: ShoppingCart,
          },
          {
            href: "/compras/nova-v2",
            label: "Nova compra",
            icon: Plus,
          },
        ],
      },
      {
        type: "group",
        href: "/estoque",
        label: "Estoque",
        icon: Warehouse,
        description: "Saldos, custos e alertas",
        defaultOpen: false,
        links: [
          {
            href: "/estoque",
            label: "Estoque atual",
            icon: Warehouse,
          },
          {
            href: "/resumos/estoque",
            label: "Resumo de estoque",
            icon: BarChart3,
          },
          {
            href: "/movimentacoes",
            label: "Movimentações",
            icon: BarChart3,
          },
        ],
      },
    ],
  },
  {
    title: "Catálogo",
    description: "Produtos, famílias e insumos",
    items: [
      {
        type: "group",
        href: "/produtos",
        label: "Produtos",
        icon: Package,
        description: "Cadastro, variações e famílias",
        defaultOpen: false,
        quickAddHref: "/produtos/novo",
        quickAddLabel: "Novo produto",
        links: [
          {
            href: "/produtos",
            label: "Catálogo de produtos",
            icon: Package,
          },
          {
            href: "/produtos/novo",
            label: "Novo produto",
            icon: Plus,
          },
        ],
      },
      {
        type: "link",
        href: "/configuracoes/loja/categorias",
        label: "Categorias",
        icon: FolderKanban,
        description: "Categorias e subcategorias",
      },
      {
        type: "group",
        href: "/itens-adicionais",
        label: "Itens adicionais",
        icon: Boxes,
        description: "Embalagens, insumos e extras",
        defaultOpen: false,
        quickAddHref: "/itens-adicionais/novo",
        quickAddLabel: "Novo item adicional",
        links: [
          {
            href: "/itens-adicionais",
            label: "Lista de adicionais",
            icon: Boxes,
          },
          {
            href: "/itens-adicionais/novo",
            label: "Novo adicional",
            icon: Plus,
          },
          {
            href: "/regras-categoria",
            label: "Regras por categoria",
            icon: SlidersHorizontal,
          },
        ],
      },
    ],
  },
  {
    title: "Clientes",
    description: "Base e relacionamento",
    items: [
      {
        type: "group",
        href: "/clientes",
        label: "Clientes",
        icon: Users,
        description: "Cadastro e histórico",
        defaultOpen: false,
        quickAddHref: "/clientes/novo",
        quickAddLabel: "Novo cliente",
        links: [
          {
            href: "/clientes",
            label: "Lista de clientes",
            icon: Users,
          },
          {
            href: "/clientes/novo",
            label: "Novo cliente",
            icon: Plus,
          },
          {
            href: "/resumos/clientes",
            label: "Resumo de clientes",
            icon: BarChart3,
          },
        ],
      },
      {
        type: "link",
        href: "/configuracoes/loja/formularios",
        label: "Leads / Formulários",
        icon: ClipboardList,
        description: "Respostas recebidas",
      },
    ],
  },
  {
    title: "Loja online",
    description: "Site público e vendas online",
    items: [
      {
        type: "group",
        href: "/configuracoes/loja",
        label: "Configurações da loja",
        icon: Store,
        description: "Banners, menu e vitrine",
        defaultOpen: true,
        highlight: true,
        tone: "site",
        links: [
          {
            href: "/configuracoes/loja",
            label: "Banners e menu",
            icon: SlidersHorizontal,
            tone: "site",
          },
          {
            href: "/configuracoes/loja/home",
            label: "Home da loja",
            icon: Home,
            tone: "site",
          },
          {
            href: "/configuracoes/loja/paginas",
            label: "Páginas / Builder",
            icon: LayoutTemplate,
            tone: "site",
          },
          {
            href: "/configuracoes/loja/cupons",
            label: "Cupons",
            icon: Tag,
            tone: "site",
          },
          {
            href: "/configuracoes/loja/cashback",
            label: "Cashback",
            icon: BarChart3,
            tone: "site",
          },
          {
            href: "/configuracoes/loja/formularios",
            label: "Formulários",
            icon: ClipboardList,
            tone: "site",
          },
          {
            href: "/site",
            label: "Área do site",
            icon: Store,
            tone: "site",
          },
          {
            href: "/loja",
            label: "Ver loja pública",
            icon: Store,
            tone: "site",
          },
        ],
      },
    ],
  },
  {
    title: "Relatórios",
    description: "Análises rápidas",
    items: [
      {
        type: "link",
        href: "/resumos/vendas",
        label: "Resumo de vendas",
        icon: BarChart3,
        description: "Faturamento e histórico",
      },
      {
        type: "link",
        href: "/resumos/estoque",
        label: "Resumo de estoque",
        icon: Warehouse,
        description: "Saldos e valores",
      },
      {
        type: "link",
        href: "/resumos/clientes",
        label: "Resumo de clientes",
        icon: Users,
        description: "Base e relacionamento",
      },
    ],
  },
  {
    title: "Integrações",
    description: "Canais e importações",
    items: [
      {
        type: "group",
        href: "/configuracoes/integracoes",
        label: "Integrações",
        icon: PlugZap,
        description: "Marketplaces, canais e gateways",
        defaultOpen: false,
        tone: "system",
        links: [
          {
            href: "/configuracoes/integracoes",
            label: "Visão geral",
            icon: PlugZap,
            tone: "system",
          },
          {
            href: "/configuracoes/integracoes/produtos-canais",
            label: "Produtos por canal",
            icon: Package,
            tone: "system",
          },
          {
            href: "/configuracoes/integracoes/importar-pedido",
            label: "Importar pedido",
            icon: ClipboardList,
            tone: "system",
          },
        ],
      },
    ],
  },
  {
    title: "Sistema",
    description: "Ajustes gerais",
    items: [
      {
        type: "link",
        href: "/configuracoes",
        label: "Configurações gerais",
        icon: Settings,
        description: "Preferências do sistema",
        tone: "system",
      },
      {
        type: "link",
        href: "/lixeira",
        label: "Lixeira",
        icon: Trash2,
        description: "Itens arquivados",
        tone: "system",
      },
    ],
  },
];

function isPathActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
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

function getSectionGroups() {
  return menuSections.flatMap((section) =>
    section.items
      .filter((item): item is MenuGroup => item.type === "group")
      .map((group) => ({
        href: group.href,
        defaultOpen: group.defaultOpen ?? false,
        links: group.links,
      }))
  );
}

export default function SidebarMenu() {
  const pathname = usePathname();

  const groups = useMemo(() => getSectionGroups(), []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    const modoSalvo = window.localStorage.getItem("stella-menu-density");

    if (modoSalvo === "compacto") {
      setCompacto(true);
    }
  }, []);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };

      groups.forEach((group) => {
        const groupIsActive =
          isPathActive(pathname, group.href) ||
          group.links.some((link) => isPathActive(pathname, link.href));

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
    setCompacto((atual) => {
      const proximo = !atual;

      window.localStorage.setItem(
        "stella-menu-density",
        proximo ? "compacto" : "extendido"
      );

      return proximo;
    });
  }

  const sectionSpacing = compacto ? "space-y-3" : "space-y-6";
  const itemSpacing = compacto ? "space-y-0.5" : "space-y-1.5";
  const itemPadding = compacto ? "px-2.5 py-2" : "px-3 py-3";
  const itemGap = compacto ? "gap-2.5" : "gap-3";
  const iconBoxSize = compacto ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl";
  const subItemPadding = compacto ? "px-2.5 py-1.5" : "px-3 py-2.5";
  const sectionTitleMargin = compacto ? "mb-1.5 px-2" : "mb-3 px-2";
  const panelPadding = compacto ? "px-2 py-3" : "px-3 py-4";
  const groupPad = compacto ? "p-1" : "p-1.5";
  const subItemsWrap = compacto ? "mt-1 space-y-0.5 pl-2" : "mt-2 space-y-1 pl-3";

  return (
    <aside className="flex h-full w-full flex-col rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
      <div className="border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={alternarModoMenu}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white px-3 py-2 text-left text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-900">
                Menu {compacto ? "compacto" : "extendido"}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {compacto ? "Compacto" : "Extendido"}
          </span>
        </button>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${panelPadding}`}>
        <nav className={sectionSpacing}>
          {menuSections.map((section, sectionIndex) => (
            <div key={`${section.title || "sem-titulo"}-${sectionIndex}`}>
              {section.title ? (
                <div className={sectionTitleMargin}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
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
                    const active = isPathActive(pathname, item.href);
                    const Icon = item.icon;
                    const tone = getItemTone(item);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
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

                        <div className="min-w-0 flex-1 text-left">
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
                    isPathActive(pathname, item.href) ||
                    item.links.some((link) => isPathActive(pathname, link.href));
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

                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-semibold">
                              {item.label}
                            </p>

                            {!compacto && item.description ? (
                              <p className="truncate text-xs text-slate-500 transition group-hover:text-slate-600">
                                {item.description}
                              </p>
                            ) : null}
                          </div>

                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {item.quickAddHref ? (
                          <Link
                            href={item.quickAddHref}
                            title={item.quickAddLabel || "Adicionar"}
                            className={`flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 ${
                              compacto ? "h-8 w-8 rounded-xl" : "h-11 w-11"
                            }`}
                          >
                            <Plus className={compacto ? "h-3.5 w-3.5" : "h-4 w-4"} />
                          </Link>
                        ) : null}
                      </div>

                      {isOpen ? (
                        <div className={subItemsWrap}>
                          {item.links.length > 0 ? (
                            item.links.map((link) => {
                              const subActive = isPathActive(pathname, link.href);
                              const SubIcon = link.icon;
                              const subTone = getItemTone(link);

                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
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
                                className={`flex items-center gap-3 rounded-2xl text-sm transition ${subItemPadding} ${getSubItemClass(
                                  {
                                    active: isPathActive(pathname, item.href),
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