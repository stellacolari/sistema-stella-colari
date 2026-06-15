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
  if (pathname.startsWith("/pedidos")) {
    return {
      eyebrow: "Operacao",
      title: "Pedidos",
      description: "Central operacional de pagamento, separacao e entrega.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/home")) {
    return {
      eyebrow: "Loja online",
      title: "Home da loja",
      description: "Categorias, secoes personalizadas e bloco promocional.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/cupons")) {
    return {
      eyebrow: "Loja online",
      title: "Cupons",
      description: "Gerencie cupons de desconto da loja online.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/cashback")) {
    return {
      eyebrow: "Loja online",
      title: "Cashback",
      description: "Configure regras de cashback da loja online.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/formularios")) {
    return {
      eyebrow: "Loja online",
      title: "Formularios",
      description: "Acompanhe respostas e contatos recebidos pela loja online.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/paginas")) {
    return {
      eyebrow: "Loja online",
      title: "Paginas",
      description: "Builder e paginas publicas da loja online.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/categorias")) {
    return {
      eyebrow: "Loja online",
      title: "Categorias",
      description: "Categorias e subcategorias da loja online.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/frete")) {
    return {
      eyebrow: "Loja online",
      title: "Frete",
      description: "Entrega, retirada e calculo de frete da loja online.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/embalagens")) {
    return {
      eyebrow: "Insumos e embalagens",
      title: "Embalagens",
      description: "Modelos, classes e componentes de embalagem.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/configuracoes/loja")) {
    return {
      eyebrow: "Loja online",
      title: "Loja Online",
      description: "Central da loja, vitrine, paginas, frete e campanhas.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/integracoes")) {
    return {
      eyebrow: "Integracoes",
      title: "Integracoes",
      description: "Canais, importacoes e produtos vinculados.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/produtos")) {
    return {
      eyebrow: "Catalogo",
      title: "Produtos",
      description: "Cadastro e gestao dos produtos principais.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/itens-adicionais")) {
    return {
      eyebrow: "Catalogo",
      title: "Itens adicionais",
      description: "Itens consumidos por regras de categoria.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/clientes")) {
    return {
      eyebrow: "Operacao",
      title: "Clientes",
      description: "Cadastro, historico e analise de clientes.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/vendas")) {
    return {
      eyebrow: "Operacao",
      title: "Vendas",
      description: "Registro, acompanhamento e gestao de vendas.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/estoque")) {
    return {
      eyebrow: "Compras e Financeiro",
      title: "Compras de estoque",
      description:
        "Compras que movimentam produtos, embalagens e insumos controlados.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/gastos")) {
    return {
      eyebrow: "Compras e Financeiro",
      title: "Gastos financeiros",
      description:
        "Assinaturas, estrutura, marketing, permutas e despesas sem estoque.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/reposicao")) {
    return {
      eyebrow: "Compras e Financeiro",
      title: "Reposição",
      description: "Itens sugeridos para recompra por compra de estoque.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/nova-v2")) {
    return {
      eyebrow: "Compras e Financeiro",
      title: "Nova compra de estoque",
      description: "Entrada controlada de produtos, embalagens e insumos.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras")) {
    return {
      eyebrow: "Compras e Financeiro",
      title: "Compras e Financeiro",
      description: "Central de compras de estoque, gastos financeiros e reposição.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/estoque")) {
    return {
      eyebrow: "Catalogo / Estoque",
      title: "Estoque",
      description: "Saldos, valores e ajustes de estoque.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/movimentacoes")) {
    return {
      eyebrow: "Controle",
      title: "Movimentacoes",
      description: "Historico de entradas, saidas, vendas e compras.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/lixeira")) {
    return {
      eyebrow: "Sistema",
      title: "Lixeira",
      description: "Itens removidos e opcoes de restauracao.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/vendas")) {
    return {
      eyebrow: "Relatorios",
      title: "Resumo de vendas",
      description: "Indicadores, filtros e rankings de venda.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/clientes")) {
    return {
      eyebrow: "Relatorios",
      title: "Resumo de clientes",
      description: "Perfil, recorrencia e desempenho de clientes.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/estoque")) {
    return {
      eyebrow: "Relatorios",
      title: "Resumo de estoque",
      description: "Valor acumulado, itens criticos e rankings.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/regras-categoria")) {
    return {
      eyebrow: "Loja online",
      title: "Regras por categoria",
      description: "Consumo automatico de adicionais por tipo de produto.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/dashboard")) {
    return {
      eyebrow: "Painel interno",
      title: "Dashboard",
      description: "Visao geral da operacao.",
      showLojaButton: false,
    };
  }

  return {
    eyebrow: "Painel interno",
    title: "Operacao e gestao",
    description: "Compras, vendas, estoque e clientes em um so lugar.",
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
  const [sidebarCompacta, setSidebarCompacta] = useState(false);

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

  useEffect(() => {
    if (isPublicShell) {
      return;
    }

    setSidebarCompacta(
      window.localStorage.getItem("stella-admin-sidebar") === "compacta",
    );
  }, [isPublicShell]);

  function alternarSidebarCompacta() {
    setSidebarCompacta((atual) => {
      const proximo = !atual;
      window.localStorage.setItem(
        "stella-admin-sidebar",
        proximo ? "compacta" : "expandida",
      );

      return proximo;
    });
  }

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
    <div
      className={`min-h-screen bg-slate-50 lg:grid ${
        sidebarCompacta
          ? "lg:grid-cols-[92px_minmax(0,1fr)]"
          : "lg:grid-cols-[312px_minmax(0,1fr)]"
      }`}
    >
      <aside className="hidden min-w-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div
          className={`border-b border-slate-200 ${
            sidebarCompacta ? "px-3 py-4" : "px-6 py-6"
          }`}
        >
          {sidebarCompacta ? (
            <div
              title="Plataforma Stella Colari"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white"
            >
              SC
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Plataforma Stella Colari
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight">Gestao</h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Compras, vendas, estoque, clientes e loja online em um so lugar.
              </p>
            </>
          )}
        </div>

        <SidebarMenu
          perfil={perfil}
          compacto={sidebarCompacta}
          onCompactoChange={alternarSidebarCompacta}
          showCompactToggle
        />

        <div
          className={`border-t border-slate-200 ${
            sidebarCompacta ? "px-3 py-3" : "px-6 py-4"
          }`}
        >
          <div
            className={`rounded-2xl border border-slate-200 bg-slate-50 ${
              sidebarCompacta ? "p-2" : "space-y-3 px-4 py-3"
            }`}
          >
            {!sidebarCompacta && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Acesso
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  Plataforma interna
                </p>
              </>
            )}

            <LogoutButton compacto={sidebarCompacta} />
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
                  Plataforma Stella Colari
                </p>

                <p className="mt-1 text-lg font-bold tracking-tight text-slate-950">
                  Gestao
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
                compacto={false}
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
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setMenuMobileAberto(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 sm:block">
                  {pageInfo.eyebrow}
                </p>

                <h2 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:mt-1 sm:text-xl">
                  <span className="sm:hidden">Plataforma Stella Colari</span>
                  <span className="hidden sm:inline">{pageInfo.title}</span>
                </h2>

                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  {pageInfo.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {pageInfo.showLojaButton && (
                <Link
                  href="/loja"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4"
                >
                  <span className="hidden sm:inline">Ver loja publica</span>
                  <span className="sm:hidden">Loja</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}

              <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 xl:block">
                Plataforma Stella Colari
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1760px] p-3 sm:p-5 2xl:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
