export const FAVORITOS_STORAGE_KEY = "stella-favoritos-produtos";
export const FAVORITOS_UPDATED_EVENT = "stella-favoritos-updated";

export function lerFavoritosIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITOS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

export function salvarFavoritosIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITOS_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(FAVORITOS_UPDATED_EVENT));
}

export function alternarFavoritoId(produtoId: string) {
  const favoritos = lerFavoritosIds();
  const ehFavorito = favoritos.includes(produtoId);
  const proximosFavoritos = ehFavorito
    ? favoritos.filter((id) => id !== produtoId)
    : [...favoritos, produtoId];

  salvarFavoritosIds(proximosFavoritos);
  return !ehFavorito;
}

export function produtoEstaFavorito(produtoId: string) {
  return lerFavoritosIds().includes(produtoId);
}
