const CARACTERES_URL_PERIGOSOS = /[\\\u0000-\u001f\u007f]/;
const PROTOCOLOS_EXTERNOS_PERMITIDOS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

export function normalizarHrefPublico(
  value: unknown,
  fallback = "",
) {
  const href = String(value || "").trim();

  if (!href || CARACTERES_URL_PERIGOSOS.test(href)) {
    return fallback;
  }

  if (href.startsWith("#")) {
    return href;
  }

  if (href.startsWith("/") && !href.startsWith("//")) {
    return href;
  }

  try {
    const url = new URL(href);

    return PROTOCOLOS_EXTERNOS_PERMITIDOS.has(url.protocol)
      ? href
      : fallback;
  } catch {
    return fallback;
  }
}
