export type LojaProdutoOrdenacao =
  | "destaque"
  | "relevancia"
  | "recentes"
  | "menor-preco"
  | "maior-preco"
  | "mais-vendidos"
  | "az"
  | "za";

export type LojaFiltroEstoque = "todos" | "disponivel" | "sem-estoque";
export type LojaFiltroDesconto = "" | "com-desconto" | "sem-desconto";

export type LojaProdutoFiltros = {
  busca?: string;
  categoria?: string;
  precoMin?: number;
  precoMax?: number;
  estoque?: LojaFiltroEstoque;
  ordem?: LojaProdutoOrdenacao;
  tamanho?: string;
  desconto?: LojaFiltroDesconto;
};

export type LojaProdutoFiltravel = {
  id: string;
  nome: string;
  categoria: string;
  categoriaIds?: string[];
  categoriaSlugs?: string[];
  categoriaNomes?: string[];
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoqueTotal: number;
  vendidosTotal?: number;
  criadoEm?: string;
  relevancia?: number;
  tamanhosDisponiveis?: {
    tamanhoAnel: string;
    quantidadeAtual: number;
  }[];
};

export type LojaFiltroCategoriaOpcao = {
  valor: string;
  label: string;
};

export type LojaFiltrosDisponiveis = {
  categorias: LojaFiltroCategoriaOpcao[];
  tamanhos: string[];
  precoMinimo: number | null;
  precoMaximo: number | null;
  temProdutosComDesconto: boolean;
  temProdutosSemDesconto: boolean;
  temMaisVendidos: boolean;
};

export function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizarValorCategoria(value: string | null | undefined) {
  return normalizarTexto(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function precoFinalProduto(produto: LojaProdutoFiltravel) {
  if (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  ) {
    return produto.precoPromocional;
  }

  return produto.precoVenda;
}

export function produtoTemDescontoFiltro(produto: LojaProdutoFiltravel) {
  return precoFinalProduto(produto) < produto.precoVenda;
}

function adicionarCategoria(
  categorias: Map<string, LojaFiltroCategoriaOpcao>,
  label: string | null | undefined,
  valor?: string | null,
) {
  const labelLimpo = String(label ?? "").trim();
  const valorLimpo = normalizarValorCategoria(valor || labelLimpo);

  if (!labelLimpo || !valorLimpo || categorias.has(valorLimpo)) return;

  categorias.set(valorLimpo, {
    valor: valorLimpo,
    label: labelLimpo,
  });
}

function compararTamanhos(a: string, b: string) {
  const numeroA = Number(a);
  const numeroB = Number(b);

  if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
    return numeroA - numeroB;
  }

  return a.localeCompare(b);
}

export function derivarFiltrosDisponiveis(
  produtos: LojaProdutoFiltravel[],
): LojaFiltrosDisponiveis {
  const categorias = new Map<string, LojaFiltroCategoriaOpcao>();
  const tamanhos = new Set<string>();
  const precos = produtos.map(precoFinalProduto).filter(Number.isFinite);

  produtos.forEach((produto) => {
    adicionarCategoria(categorias, produto.categoria);

    produto.categoriaNomes?.forEach((nome, index) => {
      adicionarCategoria(categorias, nome, produto.categoriaSlugs?.[index]);
    });

    produto.categoriaSlugs?.forEach((slug, index) => {
      adicionarCategoria(categorias, produto.categoriaNomes?.[index] || slug, slug);
    });

    produto.tamanhosDisponiveis?.forEach((tamanho) => {
      if (Number(tamanho.quantidadeAtual || 0) <= 0) return;
      if (!tamanho.tamanhoAnel) return;

      tamanhos.add(tamanho.tamanhoAnel);
    });
  });

  return {
    categorias: Array.from(categorias.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
    tamanhos: Array.from(tamanhos).sort(compararTamanhos),
    precoMinimo: precos.length > 0 ? Math.min(...precos) : null,
    precoMaximo: precos.length > 0 ? Math.max(...precos) : null,
    temProdutosComDesconto: produtos.some(produtoTemDescontoFiltro),
    temProdutosSemDesconto: produtos.some((produto) => !produtoTemDescontoFiltro(produto)),
    temMaisVendidos: produtos.some((produto) => Number(produto.vendidosTotal || 0) > 0),
  };
}

function produtoCorrespondeBusca(produto: LojaProdutoFiltravel, busca: string) {
  const termos = normalizarTexto(busca).split(/\s+/).filter(Boolean);

  if (termos.length === 0) return true;

  const textoProduto = normalizarTexto(
    [
      produto.nome,
      produto.categoria,
      ...(produto.categoriaNomes || []),
      ...(produto.categoriaSlugs || []),
    ].join(" "),
  );

  return termos.every((termo) => textoProduto.includes(termo));
}

function produtoCorrespondeCategoria(
  produto: LojaProdutoFiltravel,
  categoria: string,
) {
  const alvo = normalizarValorCategoria(categoria);

  if (!alvo) return true;

  const valores = [
    produto.categoria,
    ...(produto.categoriaNomes || []),
    ...(produto.categoriaSlugs || []),
  ].map(normalizarValorCategoria);

  return valores.includes(alvo);
}

function produtoCorrespondeTamanho(produto: LojaProdutoFiltravel, tamanho: string) {
  if (!tamanho) return true;

  return Boolean(
    produto.tamanhosDisponiveis?.some(
      (item) =>
        item.tamanhoAnel === tamanho && Number(item.quantidadeAtual || 0) > 0,
    ),
  );
}

function dataProduto(produto: LojaProdutoFiltravel) {
  const timestamp = new Date(produto.criadoEm || "").getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function aplicarFiltrosProdutos<TProduto extends LojaProdutoFiltravel>(
  produtos: TProduto[],
  filtros: LojaProdutoFiltros,
) {
  const ordemOriginal = new Map(produtos.map((produto, index) => [produto.id, index]));
  let resultado = [...produtos];

  if (filtros.busca) {
    resultado = resultado.filter((produto) =>
      produtoCorrespondeBusca(produto, filtros.busca || ""),
    );
  }

  if (filtros.categoria) {
    resultado = resultado.filter((produto) =>
      produtoCorrespondeCategoria(produto, filtros.categoria || ""),
    );
  }

  if (typeof filtros.precoMin === "number" && Number.isFinite(filtros.precoMin)) {
    resultado = resultado.filter(
      (produto) => precoFinalProduto(produto) >= Number(filtros.precoMin),
    );
  }

  if (typeof filtros.precoMax === "number" && Number.isFinite(filtros.precoMax)) {
    resultado = resultado.filter(
      (produto) => precoFinalProduto(produto) <= Number(filtros.precoMax),
    );
  }

  if (filtros.estoque === "disponivel") {
    resultado = resultado.filter((produto) => produto.estoqueTotal > 0);
  }

  if (filtros.estoque === "sem-estoque") {
    resultado = resultado.filter((produto) => produto.estoqueTotal <= 0);
  }

  if (filtros.tamanho) {
    resultado = resultado.filter((produto) =>
      produtoCorrespondeTamanho(produto, filtros.tamanho || ""),
    );
  }

  if (filtros.desconto === "com-desconto") {
    resultado = resultado.filter(produtoTemDescontoFiltro);
  }

  if (filtros.desconto === "sem-desconto") {
    resultado = resultado.filter((produto) => !produtoTemDescontoFiltro(produto));
  }

  const ordenarPorOriginal = (a: TProduto, b: TProduto) =>
    Number(ordemOriginal.get(a.id) ?? 0) - Number(ordemOriginal.get(b.id) ?? 0);

  resultado.sort((a, b) => {
    if (filtros.ordem === "recentes") {
      return dataProduto(b) - dataProduto(a) || ordenarPorOriginal(a, b);
    }

    if (filtros.ordem === "menor-preco") {
      return precoFinalProduto(a) - precoFinalProduto(b) || ordenarPorOriginal(a, b);
    }

    if (filtros.ordem === "maior-preco") {
      return precoFinalProduto(b) - precoFinalProduto(a) || ordenarPorOriginal(a, b);
    }

    if (filtros.ordem === "mais-vendidos") {
      return (
        Number(b.vendidosTotal || 0) -
          Number(a.vendidosTotal || 0) ||
        ordenarPorOriginal(a, b)
      );
    }

    if (filtros.ordem === "az") {
      return a.nome.localeCompare(b.nome) || ordenarPorOriginal(a, b);
    }

    if (filtros.ordem === "za") {
      return b.nome.localeCompare(a.nome) || ordenarPorOriginal(a, b);
    }

    if (filtros.ordem === "relevancia") {
      return (
        Number(b.relevancia || 0) -
          Number(a.relevancia || 0) ||
        ordenarPorOriginal(a, b)
      );
    }

    return ordenarPorOriginal(a, b);
  });

  return resultado;
}
