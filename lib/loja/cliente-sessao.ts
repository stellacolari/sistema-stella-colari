import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const CLIENTE_SESSAO_COOKIE = "stella_cliente_session";
export const CLIENTE_COOKIE_LEGADO = "stella_cliente_id";

export const CLIENTE_SESSAO_DURACAO_SEGUNDOS = 60 * 60 * 12;
export const CLIENTE_SESSAO_PERSISTENTE_DURACAO_SEGUNDOS =
  60 * 60 * 24 * 30;

const TOKEN_BYTES = 32;
const TOKEN_BASE64URL_LENGTH = 43;
const HASH_HEX_LENGTH = 64;
const HASH_DUMMY = "0".repeat(HASH_HEX_LENGTH);

function tokenBemFormado(token: string) {
  return (
    token.length === TOKEN_BASE64URL_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

function hashBemFormado(hash: string | null | undefined) {
  return Boolean(hash && /^[a-f0-9]{64}$/.test(hash));
}

export function hashClienteSessaoToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function criarClienteSessaoToken() {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  return {
    token,
    hash: hashClienteSessaoToken(token),
  };
}

export function validarClienteSessaoToken(
  tokenRecebido: string | null | undefined,
  hashArmazenado: string | null | undefined,
) {
  const token = String(tokenRecebido || "");
  const formatoValido = tokenBemFormado(token);
  const hashRecebido = hashClienteSessaoToken(
    formatoValido ? token : "token-invalido-padronizado",
  );
  const hashPersistido = hashBemFormado(hashArmazenado)
    ? String(hashArmazenado)
    : HASH_DUMMY;

  const iguais = timingSafeEqual(
    Buffer.from(hashRecebido, "hex"),
    Buffer.from(hashPersistido, "hex"),
  );

  return formatoValido && hashBemFormado(hashArmazenado) && iguais;
}

export function getDuracaoSessaoCliente(manterConectado: boolean) {
  return manterConectado
    ? CLIENTE_SESSAO_PERSISTENTE_DURACAO_SEGUNDOS
    : CLIENTE_SESSAO_DURACAO_SEGUNDOS;
}

function getOpcoesBaseCookieCliente() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function definirCookieSessaoCliente({
  response,
  token,
  manterConectado,
}: {
  response: NextResponse;
  token: string;
  manterConectado: boolean;
}) {
  const duracao = getDuracaoSessaoCliente(manterConectado);

  response.cookies.set(CLIENTE_SESSAO_COOKIE, token, {
    ...getOpcoesBaseCookieCliente(),
    ...(manterConectado ? { maxAge: duracao } : {}),
  });
  removerCookieLegadoCliente(response);

  return response;
}

export function removerCookieLegadoCliente(response: NextResponse) {
  response.cookies.set(CLIENTE_COOKIE_LEGADO, "", {
    ...getOpcoesBaseCookieCliente(),
    maxAge: 0,
  });

  return response;
}

export function limparCookiesSessaoCliente(response: NextResponse) {
  response.cookies.set(CLIENTE_SESSAO_COOKIE, "", {
    ...getOpcoesBaseCookieCliente(),
    maxAge: 0,
  });
  removerCookieLegadoCliente(response);

  return response;
}
