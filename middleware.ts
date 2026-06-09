import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
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
  "/api/pedidos",
  "/api/produtos",
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

function redirectLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (next !== "/login") {
    loginUrl.searchParams.set("next", next);
  }

  return NextResponse.redirect(loginUrl);
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

    if (sessao) {
      return NextResponse.next();
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
