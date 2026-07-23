import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const PEDIDO_ACESSO_QUERY_PARAM = "access";
export const PEDIDO_ACESSO_COOKIE = "stella_pedido_access";
export const PEDIDO_ACESSO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

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

export function hashPedidoAcessoToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function criarPedidoAcessoToken() {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  return {
    token,
    hash: hashPedidoAcessoToken(token),
    criadoEm: new Date(),
  };
}

export function validarPedidoAcessoToken(
  tokenRecebido: string | null | undefined,
  hashArmazenado: string | null | undefined,
) {
  const token = String(tokenRecebido || "");
  const formatoValido = tokenBemFormado(token);
  const hashRecebido = hashPedidoAcessoToken(
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

export function clientePodeAcessarPedido({
  clienteAutenticadoId,
  pedidoClienteId,
  clienteAtivo,
}: {
  clienteAutenticadoId: string | null | undefined;
  pedidoClienteId: string | null | undefined;
  clienteAtivo: boolean;
}) {
  return Boolean(
    clienteAtivo &&
      clienteAutenticadoId &&
      pedidoClienteId &&
      clienteAutenticadoId === pedidoClienteId,
  );
}

export function criarUrlPedidoComAcesso({
  baseUrl,
  codigo,
  token,
  pagamento,
}: {
  baseUrl: string;
  codigo: string;
  token: string;
  pagamento?: "sucesso" | "cancelado";
}) {
  const url = new URL(
    `/loja/pedido/${encodeURIComponent(codigo)}`,
    `${baseUrl.replace(/\/$/, "")}/`,
  );

  url.searchParams.set(PEDIDO_ACESSO_QUERY_PARAM, token);

  if (pagamento) {
    url.searchParams.set("pagamento", pagamento);
  }

  return url.toString();
}
