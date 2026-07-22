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

const LOJA_PREVIEW_PREFIX = "/loja/preview/pagina";
const LOJA_PEDIDO_PREFIX = "/loja/pedido";
const LOJA_STRIPE_CHECKOUT_PATH = "/api/loja/stripe/criar-checkout";
const COOKIE_CLIENTE_ID = "stella_cliente_id";
const COOKIE_PEDIDO_ACESSO = "stella_pedido_access";

function aplicarHeadersPedidoPrivado(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}

function respostaPedidoNaoEncontrado() {
  return aplicarHeadersPedidoPrivado(
    new NextResponse("Pedido não encontrado.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }),
  );
}

async function pedidoPublicoAutorizado(request: NextRequest) {
  try {
    const codigo = decodeURIComponent(
      request.nextUrl.pathname.slice(`${LOJA_PEDIDO_PREFIX}/`.length),
    ).trim();

    if (!codigo) return false;

    const vercelHost = String(process.env.VERCEL_URL || "").trim();
    const gateOrigin = vercelHost
      ? `https://${vercelHost.replace(/^https?:\/\//, "")}`
      : request.nextUrl.origin;
    const gateUrl = new URL("/api/loja/pedido/acesso", gateOrigin);
    const response = await fetch(gateUrl, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo,
        clienteCookieId:
          request.cookies.get(COOKIE_CLIENTE_ID)?.value || "",
        access: request.nextUrl.searchParams.get("access") || "",
        tokenCookie:
          request.cookies.get(COOKIE_PEDIDO_ACESSO)?.value || "",
      }),
    });

    return response.status === 204;
  } catch {
    return false;
  }
}

function aplicarHeadersPreviewPrivado(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  return response;
}

function isLojaPreviewPath(pathname: string) {
  return matchesPrefix(pathname, LOJA_PREVIEW_PREFIX);
}

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

  if (matchesPrefix(pathname, LOJA_PEDIDO_PREFIX)) {
    if (!(await pedidoPublicoAutorizado(request))) {
      return respostaPedidoNaoEncontrado();
    }

    return aplicarHeadersPedidoPrivado(NextResponse.next());
  }

  if (pathname === LOJA_STRIPE_CHECKOUT_PATH) {
    return aplicarHeadersPedidoPrivado(NextResponse.next());
  }

  if (isLojaPreviewPath(pathname)) {
    const tokenPreview = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (!tokenPreview) {
      return aplicarHeadersPreviewPrivado(redirectLogin(request));
    }

    try {
      const sessaoPreview = await verificarSessaoAdminToken(tokenPreview);

      if (!sessaoPreview) {
        return aplicarHeadersPreviewPrivado(redirectLogin(request));
      }

      return aplicarHeadersPreviewPrivado(NextResponse.next());
    } catch {
      return aplicarHeadersPreviewPrivado(redirectLogin(request));
    }
  }

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
