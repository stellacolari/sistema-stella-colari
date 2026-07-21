"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ExternalLink, Menu, X } from "lucide-react";
import SidebarMenu from "@/components/layout/SidebarMenu";
import LogoutButton from "@/components/layout/LogoutButton";

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
type NotificacoesAtualizadasEvent = CustomEvent<{
  contadores?: NotificacaoContadores;
}>;

function getPageInfo(pathname: string) {
  if (pathname.startsWith("/pedidos")) {
    return {
      eyebrow: "Operação",
      title: "Pedidos",
      description: "Central operacional de pagamento, separação e entrega.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/notificacoes")) {
    return {
      eyebrow: "Operação",
      title: "Caixa de Entrada",
      description: "Notificações internas e ações pendentes da plataforma.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/home")) {
    return {
      eyebrow: "Loja online",
      title: "Home no editor visual",
      description: "A pagina inicial fica dentro de Paginas da loja.",
      showLojaButton: true,
    };
  }

  if (
    pathname.startsWith("/configuracoes/loja/menu-rodape") ||
    pathname.startsWith("/configuracoes/loja/banners-menu")
  ) {
    return {
      eyebrow: "Loja online",
      title: "Menu e Rodape",
      description: "Navegacao global, links e referencias do rodape.",
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
      title: "Paginas da loja",
      description: "Páginas públicas e editor visual da loja online.",
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
      description: "Consumo por pedido, pacote e embalagem presente.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/configuracoes/loja/colecoes-inteligentes")) {
    return {
      eyebrow: "Loja online / Builder",
      title: "Colecoes Inteligentes",
      description: "Grupos aprovados de produtos para usar no editor visual.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/loja")) {
    return {
      eyebrow: "Loja online",
      title: "Loja Online",
      description: "Central de paginas, categorias, menu, frete e campanhas.",
      showLojaButton: true,
    };
  }

  if (pathname.startsWith("/configuracoes/integracoes")) {
    return {
      eyebrow: "Integracoes",
      title: "Integracoes",
      description: "Canais, importações e produtos vinculados.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/configuracoes/perfis")) {
    return {
      eyebrow: "Sistema",
      title: "Perfis e Permissoes",
      description:
        "Cargos administrativos, acessos e distribuição de notificações.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/configuracoes/usuarios")) {
    return {
      eyebrow: "Sistema",
      title: "Usuarios Administrativos",
      description: "Contas internas, acesso base e status dos usuarios.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/configuracoes")) {
    return {
      eyebrow: "Sistema",
      title: "Configurações",
      description: "Loja online, integrações e manutenção do sistema.",
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

  if (pathname.startsWith("/insumos-embalagens")) {
    return {
      eyebrow: "Insumos e embalagens",
      title: "Insumos e Embalagens",
      description:
        "Central de insumos físicos, consumo por produto e embalagens por pedido.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/itens-adicionais")) {
    return {
      eyebrow: "Insumos e embalagens",
      title: "Itens adicionais",
      description: "Insumos físicos controlados em estoque.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/clientes")) {
    return {
      eyebrow: "Operação",
      title: "Clientes",
      description: "Cadastro, historico e analise de clientes.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/vendas")) {
    return {
      eyebrow: "Operação",
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

  if (pathname.startsWith("/compras/recomendacoes")) {
    return {
      eyebrow: "Compras e Gestao",
      title: "Recomendações Gerenciais",
      description: "Ações sugeridas pela inteligência e decisões registradas.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/campanhas")) {
    return {
      eyebrow: "Compras e Gestao",
      title: "Campanhas Comerciais",
      description: "Planejamento comercial em rascunho, revisão e execução.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/precificacao")) {
    return {
      eyebrow: "Compras e Gestao",
      title: "Precificacao e Descontos",
      description: "Margem, preco minimo e desconto seguro por produto.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/intencao")) {
    return {
      eyebrow: "Compras e Gestao",
      title: "Intencao Comercial",
      description: "Sinais de interesse da loja para exposicao e compra.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/financeiro")) {
    return {
      eyebrow: "Compras e Financeiro",
      title: "Central Financeira",
      description: "Leitura de caixa, gastos e compromissos financeiros.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/compras/resultado")) {
    return {
      eyebrow: "Compras e Financeiro",
      title: "Resultado e Distribuicao",
      description: "Apuracao de resultado e distribuicao financeira.",
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
      description:
        "Central de compras de estoque, gastos financeiros e reposição.",
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
      title: "Movimentações",
      description: "Histórico de entradas, saídas, vendas e compras.",
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

  if (pathname.startsWith("/relatorios")) {
    return {
      eyebrow: "Gestao",
      title: "Relatorios",
      description: "Vendas, estoque, clientes e gestao financeira.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/vendas")) {
    return {
      eyebrow: "Relatorios",
      title: "Relatorio de vendas",
      description: "Indicadores, filtros e rankings de venda.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/clientes")) {
    return {
      eyebrow: "Relatorios",
      title: "Relatorio de clientes",
      description: "Perfil, recorrencia e desempenho de clientes.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/resumos/estoque")) {
    return {
      eyebrow: "Relatorios",
      title: "Relatorio de estoque",
      description: "Valor acumulado, itens críticos e rankings.",
      showLojaButton: false,
    };
  }

  if (pathname.startsWith("/regras-categoria")) {
    return {
      eyebrow: "Insumos e embalagens",
      title: "Regras por categoria",
      description: "Consumo automatico de insumos por produto ou unidade.",
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
  const [permissoes, setPermissoes] = useState<PermissoesPerfil | undefined>();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [sidebarCompacta, setSidebarCompacta] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoContadores>({
    total: 0,
    pedidos: 0,
    reposicao: 0,
    recomendacoes: 0,
    campanhas: 0,
    precificacao: 0,
  });

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

        setPerfil(
          typeof perfilResposta === "string" && perfilResposta
            ? perfilResposta
            : "VENDEDOR",
        );
        setPermissoes(data.usuario?.permissoes);

        const notificacoesResponse = await fetch(
          "/api/notificacoes/contadores",
          {
            cache: "no-store",
          },
        );
        const notificacoesData = await notificacoesResponse
          .json()
          .catch(() => ({}));

        if (ativo && notificacoesData.contadores) {
          setNotificacoes(notificacoesData.contadores);
        }
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
    if (isPublicShell) {
      return;
    }

    let ativo = true;

    async function carregarContadores() {
      try {
        const response = await fetch("/api/notificacoes/contadores", {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));

        if (ativo && data.contadores) {
          setNotificacoes(data.contadores);
        }
      } catch {
        // Mantem o ultimo contador conhecido se a consulta falhar.
      }
    }

    function onNotificacoesAtualizadas(event: Event) {
      const contadoresAtualizados = (event as NotificacoesAtualizadasEvent)
        .detail?.contadores;

      if (contadoresAtualizados) {
        setNotificacoes(contadoresAtualizados);
        return;
      }

      void carregarContadores();
    }

    window.addEventListener(
      "stella:notificacoes-atualizadas",
      onNotificacoesAtualizadas,
    );

    return () => {
      ativo = false;
      window.removeEventListener(
        "stella:notificacoes-atualizadas",
        onNotificacoesAtualizadas,
      );
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
        <div className="loja-publica stella-storefront-render min-h-screen bg-white text-[#171916]">
          {children}
        </div>
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
          permissoes={permissoes}
          notificacoes={notificacoes}
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
                permissoes={permissoes}
                notificacoes={notificacoes}
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
                  <span className="hidden sm:inline">Ver loja pública</span>
                  <span className="sm:hidden">Loja</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}

              <Link
                href="/notificacoes"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                title="Caixa de Entrada"
              >
                <Bell className="h-5 w-5" />
                {notificacoes.total > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                    {notificacoes.total > 99 ? "99+" : notificacoes.total}
                  </span>
                )}
              </Link>

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
