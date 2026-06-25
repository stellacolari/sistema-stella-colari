"use client";

import type { ElementType } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Package,
  Plus,
  RefreshCcw,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Users,
  Warehouse,
} from "lucide-react";

type MenuTone = "default" | "site" | "system";
type PerfilAdmin = string;
type PermissoesPerfil = Record<string, string[]>;
type NotificacaoContadores = {
  total: number;
  pedidos: number;
  reposicao: number;
  recomendacoes: number;
  campanhas: number;
  precificacao: number;
};

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
  modulo?: string;
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
  quickAddModulo?: string;
  quickAddAcao?: string;
  tone?: MenuTone;
  activePrefixes?: string[];
  modulo?: string;
  links: {
    href: string;
    label: string;
    icon?: ElementType;
    tone?: MenuTone;
    exact?: boolean;
    activePrefixes?: string[];
    modulo?: string;
    acao?: string;
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
  modulo?: string;
  acao?: string;
};

const menuSections: MenuSection[] = [
  {
    title: "Operação",
    description: "Rotina do dia a dia",
    items: [
      {
        type: "link",
        href: "/dashboard",
        modulo: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Visão geral do sistema",
      },
      {
        type: "link",
        href: "/pedidos",
        modulo: "pedidos",
        label: "Pedidos",
        icon: ClipboardList,
        description: "Central operacional",
        highlight: true,
      },
      {
        type: "link",
        href: "/notificacoes",
        modulo: "notificacoes",
        label: "Caixa de Entrada",
        icon: Bell,
        description: "Notificacoes e acoes",
        highlight: true,
      },
      {
        type: "group",
        href: "/vendas",
        modulo: "vendas",
        label: "Vendas",
        icon: ShoppingBag,
        quickAddHref: "/vendas/nova-v2",
        quickAddLabel: "Nova venda",
        quickAddModulo: "vendas",
        activePrefixes: ["/vendas"],
        links: [
          { href: "/vendas", label: "Lista de vendas", icon: ClipboardList, exact: true, modulo: "vendas" },
          { href: "/vendas/nova-v2", label: "Nova venda", icon: Plus, modulo: "vendas" },
        ],
        description: "Histórico de vendas",
      },
      {
        type: "group",
        href: "/clientes",
        modulo: "clientes",
        label: "Clientes",
        icon: Users,
        quickAddHref: "/clientes/novo",
        quickAddLabel: "Novo cliente",
        quickAddModulo: "clientes",
        quickAddAcao: "criar",
        activePrefixes: ["/clientes"],
        links: [
          { href: "/clientes", label: "Lista de clientes", icon: Users, exact: true, modulo: "clientes" },
          { href: "/clientes/novo", label: "Novo cliente", icon: Plus, modulo: "clientes", acao: "criar" },
          { href: "/clientes/relacionamento", label: "CRM acionavel", icon: Sparkles, exact: true, modulo: "clientes" },
          { href: "/clientes/relacionamento/campanhas", label: "Rascunhos WhatsApp", icon: MessageCircle, modulo: "clientes" },
        ],
        description: "Cadastro e histórico",
      },
    ],
  },
  {
    title: "Catálogo",
    description: "Produtos, estoque e insumos",
    items: [
      {
        type: "group",
        href: "/produtos",
        modulo: "produtos",
        label: "Produtos",
        icon: Package,
        quickAddHref: "/produtos/novo",
        quickAddLabel: "Novo produto",
        quickAddModulo: "produtos",
        quickAddAcao: "editar",
        activePrefixes: ["/produtos"],
        links: [
          { href: "/produtos", label: "Lista de produtos", icon: Package, exact: true, modulo: "produtos" },
          { href: "/produtos/novo", label: "Novo produto", icon: Plus, modulo: "produtos", acao: "editar" },
        ],
        description: "Cadastro, variações e famílias",
      },
      {
        type: "link",
        href: "/estoque",
        modulo: "estoque",
        label: "Estoque",
        icon: Warehouse,
        description: "Saldos e ajustes",
      },
      {
        type: "link",
        href: "/insumos-embalagens",
        modulo: "produtos",
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
    title: "Gestao",
    description: "Compras, gastos e reposição",
    items: [
      {
        type: "group",
        href: "/compras",
        modulo: "compras",
        label: "Compras e Gestao",
        icon: ShoppingCart,
        description: "Reposicao, campanhas e margem",
        activePrefixes: ["/compras"],
        links: [
          { href: "/compras/reposicao", label: "Reposicao", icon: RefreshCcw, modulo: "reposicao" },
          { href: "/compras/recomendacoes", label: "Recomendacoes", icon: Lightbulb, modulo: "recomendacoes" },
          { href: "/compras/campanhas", label: "Campanhas", icon: Megaphone, modulo: "campanhas" },
          { href: "/compras/precificacao", label: "Precificacao", icon: MousePointerClick, modulo: "precificacao" },
          { href: "/compras/intencao", label: "Intencao", icon: Sparkles, modulo: "intencaoComercial" },
          { href: "/compras/financeiro", label: "Financeiro", icon: CreditCard, modulo: "financeiro" },
          { href: "/compras/resultado", label: "Resultado", icon: BarChart3, modulo: "resultado" },
        ],
      },
    ],
  },
  {
    title: "Loja",
    description: "Site público e loja online",
    items: [
      {
        type: "group",
        href: "/configuracoes/loja",
        modulo: "lojaOnline",
        label: "Loja Online",
        icon: Store,
        description: "Builder, paginas e navegacao",
        tone: "site",
        activePrefixes: [
          "/configuracoes/loja/banners-menu",
          "/configuracoes/loja/cashback",
          "/configuracoes/loja/categorias",
          "/configuracoes/loja/colecoes-inteligentes",
          "/configuracoes/loja/cupons",
          "/configuracoes/loja/formularios",
          "/configuracoes/loja/frete",
          "/configuracoes/loja/home",
          "/configuracoes/loja/menu-rodape",
          "/configuracoes/loja/paginas",
        ],
        links: [
          { href: "/configuracoes/loja/paginas", label: "Paginas", icon: LayoutDashboard, modulo: "lojaOnline" },
          { href: "/configuracoes/loja/colecoes-inteligentes", label: "Colecoes", icon: Sparkles, modulo: "lojaOnline" },
          { href: "/configuracoes/loja/menu-rodape", label: "Menu e rodape", icon: SlidersHorizontal, modulo: "lojaOnline" },
          { href: "/configuracoes/loja/categorias", label: "Categorias", icon: Boxes, modulo: "lojaOnline" },
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
        modulo: "relatorios",
        label: "Relatórios",
        icon: BarChart3,
        description: "Vendas, estoque, clientes e financeiro",
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
        modulo: "configuracoes",
        label: "Configurações",
        icon: SlidersHorizontal,
        description: "Loja, integrações e lixeira",
        tone: "system",
        exact: true,
        activePrefixes: ["/configuracoes/integracoes", "/configuracoes/perfis", "/lixeira"],
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
        modulo: "pedidos",
        label: "Pedidos",
        icon: ClipboardList,
        description: "Central operacional",
        highlight: true,
      },
      {
        type: "link",
        href: "/notificacoes",
        modulo: "notificacoes",
        label: "Caixa de Entrada",
        icon: Bell,
        description: "Acoes pendentes",
        highlight: true,
      },
      {
        type: "group",
        href: "/vendas",
        modulo: "vendas",
        label: "Vendas",
        icon: ShoppingBag,
        quickAddHref: "/vendas/nova-v2",
        quickAddLabel: "Nova venda",
        quickAddModulo: "vendas",
        activePrefixes: ["/vendas"],
        links: [
          { href: "/vendas", label: "Lista de vendas", icon: ClipboardList, exact: true, modulo: "vendas" },
          { href: "/vendas/nova-v2", label: "Nova venda", icon: Plus, modulo: "vendas" },
        ],
        description: "Histórico de vendas",
      },
      {
        type: "group",
        href: "/clientes",
        modulo: "clientes",
        label: "Clientes",
        icon: Users,
        quickAddHref: "/clientes/novo",
        quickAddLabel: "Novo cliente",
        quickAddModulo: "clientes",
        quickAddAcao: "criar",
        activePrefixes: ["/clientes"],
        links: [
          { href: "/clientes", label: "Lista de clientes", icon: Users, exact: true, modulo: "clientes" },
          { href: "/clientes/novo", label: "Novo cliente", icon: Plus, modulo: "clientes", acao: "criar" },
          { href: "/clientes/relacionamento", label: "CRM acionavel", icon: Sparkles, exact: true, modulo: "clientes" },
          { href: "/clientes/relacionamento/campanhas", label: "Rascunhos WhatsApp", icon: MessageCircle, modulo: "clientes" },
        ],
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
        modulo: "produtos",
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
    modulo: "vendas",
  },
  {
    href: "/compras/nova-v2",
    label: "Nova compra de estoque",
    icon: ShoppingCart,
    modulo: "compras",
  },
  {
    href: "/produtos/novo",
    label: "Novo produto",
    icon: Package,
    modulo: "produtos",
    acao: "editar",
  },
];

const vendedorQuickActions: QuickAction[] = [
  {
    href: "/vendas/nova-v2",
    label: "Nova venda",
    icon: ShoppingBag,
    modulo: "vendas",
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

function podeVerModulo(
  modulo: string | undefined,
  permissoes: PermissoesPerfil | undefined,
  acao = "ver"
) {
  if (!modulo || !permissoes) return true;
  return permissoes[modulo]?.includes(acao) || false;
}

function filtrarSectionsPorPermissao(sections: MenuSection[], permissoes: PermissoesPerfil | undefined) {
  if (!permissoes) return sections;

  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (item.type === "group") {
            return {
              ...item,
              links: item.links.filter((link) =>
                podeVerModulo(link.modulo, permissoes, link.acao)
              ),
            };
          }
          return item;
        })
        .filter((item) => {
          if (item.type === "group") return podeVerModulo(item.modulo, permissoes) || item.links.length > 0;
          return podeVerModulo(item.modulo, permissoes);
        }),
    }))
    .filter((section) => section.items.length > 0);
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
  notificacoes,
  permissoes,
}: {
  perfil?: PerfilAdmin;
  onNavigate?: () => void;
  compacto?: boolean;
  onCompactoChange?: () => void;
  showCompactToggle?: boolean;
  notificacoes?: NotificacaoContadores;
  permissoes?: PermissoesPerfil;
}) {
  const pathname = usePathname();
  const sections = useMemo(() => filtrarSectionsPorPermissao(getMenuSections(perfil), permissoes), [perfil, permissoes]);
  const actions = useMemo(
    () =>
      getQuickActions(perfil).filter((action) =>
        podeVerModulo(action.modulo, permissoes, action.acao)
      ),
    [perfil, permissoes]
  );

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

  function badgeForHref(href: string) {
    if (!notificacoes) return 0;
    if (href === "/notificacoes") return notificacoes.total;
    if (href === "/pedidos") return notificacoes.pedidos;
    if (href === "/compras") {
      return (
        notificacoes.reposicao +
        notificacoes.recomendacoes +
        notificacoes.campanhas +
        notificacoes.precificacao
      );
    }
    if (href === "/compras/reposicao") return notificacoes.reposicao;
    if (href === "/compras/recomendacoes") return notificacoes.recomendacoes;
    if (href === "/compras/campanhas") return notificacoes.campanhas;
    if (href === "/compras/precificacao") return notificacoes.precificacao;
    return 0;
  }

  function Badge({ total, forte = false }: { total: number; forte?: boolean }) {
    if (!total) return null;

    return (
      <span
        className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
          forte ? "bg-red-600 text-white" : "bg-slate-900 text-white"
        }`}
      >
        {total > 99 ? "99+" : total}
      </span>
    );
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
                    const badge = badgeForHref(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        onClick={onNavigate}
                        className={`group relative flex items-center ${itemGap} rounded-2xl border transition ${itemPadding} ${getItemButtonClass(
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
                        {compacto ? (
                          badge > 0 && (
                            <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${item.href === "/pedidos" ? "bg-red-600" : "bg-slate-900"}`} />
                          )
                        ) : (
                          <Badge total={badge} forte={item.href === "/pedidos"} />
                        )}
                      </Link>
                    );
                  }

                  const Icon = item.icon;
                  const tone = getItemTone(item);
                  const groupBadge = badgeForHref(item.href);
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
                  const shouldShowSubItems =
                    (!compacto && isOpen) ||
                    (compacto && (groupIsActive || groupBadge > 0));
                  const quickAddHref = item.quickAddHref;
                  const canShowQuickAdd =
                    quickAddHref &&
                    podeVerModulo(
                      item.quickAddModulo || item.modulo,
                      permissoes,
                      item.quickAddAcao || "ver"
                    );

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
                          className={`group relative flex min-w-0 flex-1 items-center ${itemGap} rounded-2xl border text-left transition ${itemPadding} ${getItemButtonClass(
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
                          <>
                            <Badge total={groupBadge} />
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </>
                          )}
                          {compacto && groupBadge > 0 ? (
                            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                          ) : null}
                        </button>

                        {canShowQuickAdd && quickAddHref && !compacto ? (
                          <Link
                            href={quickAddHref}
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

                      {shouldShowSubItems ? (
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
                              const subBadge = badgeForHref(link.href);

                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  title={link.label}
                                  onClick={onNavigate}
                                  className={`relative flex items-center rounded-2xl text-sm transition ${
                                    compacto ? "justify-center gap-0" : "gap-3"
                                  } ${subItemPadding} ${getSubItemClass(
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

                                  <span className={compacto ? "sr-only" : "truncate font-medium"}>
                                    {link.label}
                                  </span>
                                  {compacto ? (
                                    subBadge > 0 && (
                                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-slate-900" />
                                    )
                                  ) : (
                                    <Badge total={subBadge} forte={link.href === "/pedidos"} />
                                  )}
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
