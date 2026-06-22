import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  type SessaoAdminPayload,
  verificarSessaoAdminToken,
} from "@/lib/auth/session";

const PUBLIC_PREFIXES = [
  "/_next",
  "/loja",
  "/api/loja",
  "/api/auth",
];

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

const ADMIN_API_PREFIXES = [
  "/api/clientes",
  "/api/compras",
  "/api/configuracoes",
  "/api/estoque",
  "/api/itens-adicionais",
  "/api/notificacoes",
  "/api/pedidos",
  "/api/produtos",
  "/api/vendas",
];

const VENDEDOR_PAGE_PREFIXES = [
  "/pedidos",
  "/vendas",
  "/clientes",
  "/notificacoes",
];

const VENDEDOR_API_PREFIXES = [
  "/api/clientes",
  "/api/notificacoes",
  "/api/pedidos",
  "/api/vendas",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function isAdminApi(pathname: string) {
  return ADMIN_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isApi(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isVendedorAllowedPage(pathname: string) {
  if (pathname === "/produtos") {
    return true;
  }

  return VENDEDOR_PAGE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

function isVendedorAllowedApi(pathname: string) {
  return VENDEDOR_API_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

function isAcessoGeral(sessao: SessaoAdminPayload) {
  return sessao.perfil === "ACESSO_GERAL";
}

function isVendedor(sessao: SessaoAdminPayload) {
  return sessao.perfil === "VENDEDOR";
}

function isAuthorizedForPath(sessao: SessaoAdminPayload, pathname: string) {
  if (isAcessoGeral(sessao)) {
    return true;
  }

  if (!isVendedor(sessao)) {
    return false;
  }

  if (isApi(pathname)) {
    return isVendedorAllowedApi(pathname);
  }

  return isVendedorAllowedPage(pathname);
}

function redirectLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (next !== "/login") {
    loginUrl.searchParams.set("next", next);
  }

  return NextResponse.redirect(loginUrl);
}

function redirectVendedor(request: NextRequest) {
  const vendasUrl = new URL("/vendas/nova-v2", request.url);

  return NextResponse.redirect(vendasUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isApi(pathname) && !isAdminApi(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    if (isApi(pathname)) {
      return NextResponse.json(
        { error: "Não autenticado no painel administrativo." },
        { status: 401 }
      );
    }

    return redirectLogin(request);
  }

  try {
    const sessao = await verificarSessaoAdminToken(token);

    if (sessao && isAuthorizedForPath(sessao, pathname)) {
      return NextResponse.next();
    }

    if (sessao) {
      if (isApi(pathname)) {
        return NextResponse.json(
          { error: "Acesso não permitido para este perfil." },
          { status: 403 }
        );
      }

      return redirectVendedor(request);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao validar sessão administrativa.";

    if (isApi(pathname)) {
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return new NextResponse(message, { status: 500 });
  }

  if (isApi(pathname)) {
    return NextResponse.json(
      { error: "Sessão administrativa inválida ou expirada." },
      { status: 401 }
    );
  }

  return redirectLogin(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
