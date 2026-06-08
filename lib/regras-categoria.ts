export type CategoriaRegraSelecionada = {
  id?: string | null;
  nome?: string | null;
  slug?: string | null;
  caminho?: string | null;
};

export type RegraCategoriaEscopo = {
  categoria?: string | null;
  aplicarTodasCategorias?: boolean | null;
  categorias?: unknown;
};

export function normalizarCategoria(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizarId(valor: string | null | undefined) {
  return String(valor || "").trim();
}

export function extrairCategoriasRegra(
  categorias: unknown
): CategoriaRegraSelecionada[] {
  if (!Array.isArray(categorias)) {
    return [];
  }

  return categorias.reduce<CategoriaRegraSelecionada[]>((lista, categoria) => {
    const categoriaNormalizada =
      typeof categoria === "string"
        ? {
            id: null,
            nome: categoria,
            slug: null,
            caminho: null,
          }
        : null;

    const itemNormalizado =
      categoria && typeof categoria === "object"
        ? (() => {
            const item = categoria as Record<string, unknown>;

            return {
              id: typeof item.id === "string" ? item.id : null,
              nome: typeof item.nome === "string" ? item.nome : null,
              slug: typeof item.slug === "string" ? item.slug : null,
              caminho:
                typeof item.caminho === "string" ? item.caminho : null,
            };
          })()
        : categoriaNormalizada;

    if (
      itemNormalizado &&
      (normalizarId(itemNormalizado.id) ||
        normalizarCategoria(itemNormalizado.nome) ||
        normalizarCategoria(itemNormalizado.slug) ||
        normalizarCategoria(itemNormalizado.caminho))
    ) {
      lista.push(itemNormalizado);
    }

    return lista;
  }, []);
}

export function regraAplicaACategoria(
  regra: RegraCategoriaEscopo,
  categoriaAtual: string,
  categoriaIds: string[] = []
) {
  if (regra.aplicarTodasCategorias) {
    return true;
  }

  const categoriaNormalizada = normalizarCategoria(categoriaAtual);
  const idsNormalizados = new Set(categoriaIds.map(normalizarId).filter(Boolean));
  const categorias = extrairCategoriasRegra(regra.categorias);

  if (categorias.length > 0) {
    return categorias.some((categoria) => {
      const id = normalizarId(categoria.id);

      if (id && idsNormalizados.has(id)) {
        return true;
      }

      return [
        categoria.nome,
        categoria.slug,
        categoria.caminho,
      ].some((valor) => normalizarCategoria(valor) === categoriaNormalizada);
    });
  }

  return normalizarCategoria(regra.categoria) === categoriaNormalizada;
}

export function regraAplicaACategorias(
  regra: RegraCategoriaEscopo,
  categorias: { id?: string | null; nome: string }[]
) {
  if (regra.aplicarTodasCategorias) {
    return true;
  }

  return categorias.some((categoria) =>
    regraAplicaACategoria(
      regra,
      categoria.nome,
      categoria.id ? [categoria.id] : []
    )
  );
}

export function chaveEscopoRegra(regra: RegraCategoriaEscopo) {
  if (regra.aplicarTodasCategorias) {
    return "todas";
  }

  const categorias = extrairCategoriasRegra(regra.categorias);

  if (categorias.length > 0) {
    const partes = categorias
      .map((categoria) => {
        const id = normalizarId(categoria.id);

        if (id) {
          return `id:${id}`;
        }

        return `nome:${normalizarCategoria(
          categoria.caminho || categoria.nome || categoria.slug
        )}`;
      })
      .filter(Boolean)
      .sort();

    return `categorias:${partes.join("|")}`;
  }

  return `legado:${normalizarCategoria(regra.categoria)}`;
}
