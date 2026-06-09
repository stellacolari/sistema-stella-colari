"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, X } from "lucide-react";
import SidebarMenu from "@/components/layout/SidebarMenu";
import LogoutButton from "@/components/layout/LogoutButton";

type PerfilAdmin = "ACESSO_GERAL" | "VENDEDOR";

function getPageInfo(pathname: string) {
  if (pathname.startsWith("/configuracoes/loja/home")) {
    return {
      eyebrow: "Loja online",
      title: "Home da loja",
      description: "Categorias, seções personalizadas e bloco promocional.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja")) {
    return {
      eyebrow: "Loja online",
      title: "Banners e menu da loja",
      description: "Configuração dos banners e da navegação pública.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/produtos")) {
    return {
      eyebrow: "Cadastros",
      title: "Produtos",
      description: "Cadastro e gestão dos produtos principais.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/itens-adicionais")) {
    return {
      eyebrow: "Cadastros",
      title: "Itens adicionais",
      description: "Itens consumidos por regras de categoria.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/clientes")) {
    return {
      eyebrow: "Cadastros",
      title: "Clientes",
      description: "Cadastro, histórico e análise de clientes.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/vendas")) {
    return {
      eyebrow: "Operação",
      title: "Vendas",
      description: "Registro, acompanhamento e gestão de vendas.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras")) {
    return {
      eyebrow: "Operação",
      title: "Compras",
      description: "Entrada de produtos, adicionais e controle de fornecedores.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/estoque")) {
    return {
      eyebrow: "Operação",
      title: "Estoque",
      description: "Saldos, valores e ajustes de estoque.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/movimentacoes")) {
    return {
      eyebrow: "Controle",
      title: "Movimentações",
      description: "Histórico de entradas, saídas, vendas e compras.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/lixeira")) {
    return {
      eyebrow: "Controle",
      title: "Lixeira",
      description: "Itens removidos e opções de restauração.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/vendas")) {
    return {
      eyebrow: "Relatórios",
      title: "Resumo de vendas",
      description: "Indicadores, filtros e rankings de venda.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/clientes")) {
    return {
      eyebrow: "Relatórios",
      title: "Resumo de clientes",
      description: "Perfil, recorrência e desempenho de clientes.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/estoque")) {
    return {
      eyebrow: "Relatórios",
      title: "Resumo de estoque",
      description: "Valor acumulado, itens críticos e rankings.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/regras-categoria")) {
    return {
      eyebrow: "Regras",
      title: "Regras por categoria",
      description: "Consumo automático de adicionais por tipo de produto.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/dashboard")) {
    return {
      eyebrow: "Painel interno",
      title: "Dashboard",
      description: "Visão geral da operação.",
      showLojaButton: false,
    };
  }

  return {
    eyebrow: "Painel interno",
    title: "Operação e gestão",
    description: "Compras, vendas, estoque e clientes em um só lugar.",
    showLojaButton: false,
  };
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoja = pathname === "/loja" || pathname.startsWith("/loja/");
  const isLogin = pathname === "/login";
  const isPublicShell =
    pathname === "/" ||
    isLogin ||
    isLoja ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    /\.[a-zA-Z0-9]+$/.test(pathname);
  const pageInfo = getPageInfo(pathname);
  const [perfil, setPerfil] = useState<PerfilAdmin>("VENDEDOR");
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    if (isPublicShell) {
      return;
    }

    let ativo = true;

    async function carregarSessao() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        const perfilResposta = data.usuario?.perfil;

        if (!ativo) {
          return;
        }

        setPerfil(perfilResposta === "ACESSO_GERAL" ? "ACESSO_GERAL" : "VENDEDOR");
      } catch {
        if (ativo) {
          setPerfil("VENDEDOR");
        }
      }
    }

    carregarSessao();

    return () => {
      ativo = false;
    };
  }, [isPublicShell]);

  useEffect(() => {
    setMenuMobileAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuMobileAberto) {
      return;
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [menuMobileAberto]);

  if (isPublicShell) {
    if (isLoja) {
      return (
        <main className="loja-publica stella-storefront-render min-h-screen bg-white text-slate-900">
          {children}
        </main>
      );
    }

    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Sistema Stella
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight">Gestão</h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Compras, vendas, estoque, clientes e loja online em um só lugar.
          </p>
        </div>

        <SidebarMenu perfil={perfil} />

        <div className="border-t border-slate-200 px-6 py-4">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Acesso
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              Sistema interno
            </p>

            <LogoutButton />
          </div>
        </div>
      </aside>

      {menuMobileAberto ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuMobileAberto(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Sistema Stella
                </p>

                <p className="mt-1 text-lg font-bold tracking-tight text-slate-950">
                  Gestão
                </p>
              </div>

              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMenuMobileAberto(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <SidebarMenu
                perfil={perfil}
                onNavigate={() => setMenuMobileAberto(false)}
              />
            </div>

            <div className="border-t border-slate-200 p-4">
              <LogoutButton />
            </div>
          </aside>
        </div>
      ) : null}

      <main className="min-w-0">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setMenuMobileAberto(true)}
                className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {pageInfo.eyebrow}
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                  {pageInfo.title}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {pageInfo.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pageInfo.showLojaButton && (
                <Link
                  href="/loja"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver loja pública
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                Sistema Stella
              </div>

              <div className="w-full sm:w-auto">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
