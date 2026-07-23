const CARACTERES_URL_PERIGOSOS = /[\\\u0000-\u001f\u007f]/;

export function normalizarDestinoInterno(
  value: unknown,
  fallback = "/pedidos",
) {
  const destino = String(value || fallback).trim();

  if (
    !destino.startsWith("/") ||
    destino.startsWith("//") ||
    CARACTERES_URL_PERIGOSOS.test(destino) ||
    destino.startsWith("/api") ||
    destino === "/login"
  ) {
    return fallback;
  }

  return destino;
}
