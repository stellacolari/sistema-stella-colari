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
const LOJA_STRIPE_WEBHOOK_PATH = "/api/loja/stripe/webhook";
const METODOS_MUTACAO = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const COOKIE_CLIENTE_SESSAO = "stella_cliente_session";
const COOKIE_CLIENTE_LEGADO = "stella_cliente_id";
const COOKIE_PEDIDO_ACESSO = "stella_pedido_access";
const COOKIE_PEDIDO_ACESSO_MAX_AGE = 60 * 60 * 24 * 30;

function aplicarHeadersPedidoPrivado(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}

function aplicarHeadersPrivados(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  return response;
}

function removerCookieClienteLegado(
  request: NextRequest,
  response: NextResponse,
) {
  if (request.cookies.has(COOKIE_CLIENTE_LEGADO)) {
    response.cookies.set(COOKIE_CLIENTE_LEGADO, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

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

function redirecionarPedidoSemToken(request: NextRequest, access: string) {
  const destino = request.nextUrl.clone();
  destino.searchParams.delete("access");

  const response = aplicarHeadersPedidoPrivado(
    NextResponse.redirect(destino, 307),
  );
  response.cookies.set(COOKIE_PEDIDO_ACESSO, access, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_PEDIDO_ACESSO_MAX_AGE,
  });

  return response;
}

async function pedidoPublicoAutorizado(request: NextRequest) {
  try {
    const codigo = decodeURIComponent(
      request.nextUrl.pathname.slice(`${LOJA_PEDIDO_PREFIX}/`.length),
    ).trim();

    if (!codigo) return false;

    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
    const hostname = request.nextUrl.hostname.toLowerCase();
    const origemLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    const emVercel =
      !origemLocal && Boolean(process.env.VERCEL || process.env.VERCEL_URL);
    const gateOrigin = emVercel && siteUrl
      ? new URL(siteUrl).origin
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
        clienteSessaoToken:
          request.cookies.get(COOKIE_CLIENTE_SESSAO)?.value || "",
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

function isOrigemMutacaoInvalida(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    !isApi(pathname) ||
    !METODOS_MUTACAO.has(request.method.toUpperCase()) ||
    pathname === LOJA_STRIPE_WEBHOOK_PATH
  ) {
    return false;
  }

  const origem = request.headers.get("origin");
  if (!origem) return false;

  try {
    const origemUrl = new URL(origem);
    const forwardedHost =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || "";
    const forwardedProtocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "";
    const hostEsperado = forwardedHost || request.nextUrl.host;
    const protocoloEsperado = forwardedProtocol
      ? `${forwardedProtocol}:`
      : request.nextUrl.protocol;

    return (
      origemUrl.host.toLowerCase() !== hostEsperado.toLowerCase() ||
      origemUrl.protocol.toLowerCase() !== protocoloEsperado.toLowerCase()
    );
  } catch {
    return true;
  }
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

  return aplicarHeadersPrivados(NextResponse.redirect(loginUrl));
}

function redirectVendedor(request: NextRequest) {
  const vendasUrl = new URL("/vendas/nova-v2", request.url);

  return aplicarHeadersPrivados(NextResponse.redirect(vendasUrl));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isOrigemMutacaoInvalida(request)) {
    return NextResponse.json(
      { error: "Origem da requisicao nao permitida." },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (matchesPrefix(pathname, LOJA_PEDIDO_PREFIX)) {
    if (!(await pedidoPublicoAutorizado(request))) {
      return removerCookieClienteLegado(
        request,
        respostaPedidoNaoEncontrado(),
      );
    }

    const access = request.nextUrl.searchParams.get("access")?.trim() || "";

    if (access) {
      return removerCookieClienteLegado(
        request,
        redirecionarPedidoSemToken(request, access),
      );
    }

    return removerCookieClienteLegado(
      request,
      aplicarHeadersPedidoPrivado(NextResponse.next()),
    );
  }

  if (pathname === LOJA_STRIPE_CHECKOUT_PATH) {
    return removerCookieClienteLegado(
      request,
      aplicarHeadersPedidoPrivado(NextResponse.next()),
    );
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
    return removerCookieClienteLegado(request, NextResponse.next());
  }

  if (isApi(pathname) && !isAdminApi(pathname)) {
    return removerCookieClienteLegado(request, NextResponse.next());
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
      return aplicarHeadersPrivados(NextResponse.next());
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
  } catch {
    if (isApi(pathname)) {
      return NextResponse.json(
        { error: "Erro ao validar a sessão administrativa." },
        { status: 500 },
      );
    }

    return new NextResponse("Erro ao validar a sessão administrativa.", {
      status: 500,
    });
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads(?:/|$)|file\\.svg$|globe\\.svg$|logo-stella\\.png$|next\\.svg$|vercel\\.svg$|window\\.svg$).*)",
  ],
};
