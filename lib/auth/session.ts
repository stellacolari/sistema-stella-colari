export const ADMIN_SESSION_COOKIE = "stella_admin_session";

export type SessaoAdminPayload = {
  sub: string;
  email: string;
  nome: string;
  perfil: string;
  exp: number;
};

type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

const SESSAO_DURACAO_SEGUNDOS = 60 * 60 * 8;
export const SESSAO_ADMIN_PERSISTENTE_DURACAO_SEGUNDOS = 60 * 60 * 24 * 5;
const ADMIN_SESSION_SECRET_MIN_LENGTH_PRODUCTION = 32;
export const ADMIN_SESSION_SECRET_MISSING_MESSAGE =
  "ADMIN_SESSION_SECRET não configurado. Defina um segredo forte no ambiente de produção antes de acessar o painel administrativo.";
const ADMIN_SESSION_SECRET_WEAK_MESSAGE =
  "ADMIN_SESSION_SECRET fraco para produção. Defina um segredo forte com pelo menos 32 caracteres.";

type OpcoesSessaoAdmin = {
  maxAgeSeconds?: number;
};

export class AdminSessionSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminSessionSecretError";
  }
}

function base64UrlEncode(value: Uint8Array | string) {
  const source =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const binary = Array.from(source, (byte) => String.fromCharCode(byte)).join(
    "",
  );

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);

  return new Uint8Array(Array.from(binary, (char) => char.charCodeAt(0)));
}

function getAdminSessionSecretRaw() {
  return String(process.env.ADMIN_SESSION_SECRET || "").trim();
}

export function isAdminSessionSecretConfigured() {
  return Boolean(getAdminSessionSecretRaw());
}

export function isAdminSessionSecretError(
  error: unknown,
): error is AdminSessionSecretError {
  return error instanceof AdminSessionSecretError;
}

function getSessionSecret() {
  const secret = getAdminSessionSecretRaw();

  if (!secret) {
    throw new AdminSessionSecretError(ADMIN_SESSION_SECRET_MISSING_MESSAGE);
  }

  if (
    process.env.NODE_ENV === "production" &&
    secret.length < ADMIN_SESSION_SECRET_MIN_LENGTH_PRODUCTION
  ) {
    throw new AdminSessionSecretError(ADMIN_SESSION_SECRET_WEAK_MESSAGE);
  }

  return secret;
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  );
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return diff === 0;
}

function resolverSessaoAdminMaxAge(maxAgeSeconds?: number) {
  if (
    typeof maxAgeSeconds === "number" &&
    Number.isFinite(maxAgeSeconds) &&
    maxAgeSeconds > 0
  ) {
    return Math.floor(maxAgeSeconds);
  }

  return SESSAO_DURACAO_SEGUNDOS;
}

export function getSessaoAdminMaxAge(maxAgeSeconds?: number) {
  return resolverSessaoAdminMaxAge(maxAgeSeconds);
}

export function getOpcoesCookieSessaoAdmin(opcoes: OpcoesSessaoAdmin = {}) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessaoAdminMaxAge(opcoes.maxAgeSeconds),
  };
}

export async function assinarSessaoAdmin(
  payload: Omit<SessaoAdminPayload, "exp">,
  opcoes: OpcoesSessaoAdmin = {},
) {
  const maxAge = resolverSessaoAdminMaxAge(opcoes.maxAgeSeconds);
  const sessao: SessaoAdminPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  };
  const body = base64UrlEncode(JSON.stringify(sessao));
  const key = await getSigningKey();
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );

  return `${body}.${base64UrlEncode(signature)}`;
}

export async function verificarSessaoAdminToken(token: string | undefined) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const key = await getSigningKey();
  const expectedSignature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  const expected = base64UrlEncode(expectedSignature);

  if (!timingSafeEqual(expected, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body)),
    ) as SessaoAdminPayload;

    if (!payload.sub || !payload.email || !payload.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function lerSessaoAdminDeCookies(cookies: CookieStoreLike) {
  return verificarSessaoAdminToken(cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
