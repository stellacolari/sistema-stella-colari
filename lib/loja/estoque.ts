export const TAMANHO_ESTOQUE_UNICO = "UNICO";

export type EstoqueLojaItem = {
  tamanhoAnel: string | null;
  quantidadeAtual: number;
};

export type EstoqueVendaItem = {
  tamanhoAnel: string;
  quantidadeAtual: number;
};

export type ComponenteKitEstoque = {
  quantidade: number;
  componenteProduto: {
    estoque: {
      tamanhoAnel?: string | null;
      quantidadeAtual: number;
    }[];
  };
};

export function normalizarTamanhoEstoque(tamanho: string | null | undefined) {
  const value = String(tamanho ?? "").trim().toUpperCase();

  if (!value) {
    return TAMANHO_ESTOQUE_UNICO;
  }

  if (value === "NULL" || value === "UNDEFINED") {
    return TAMANHO_ESTOQUE_UNICO;
  }

  return value;
}

export function normalizarTamanhoPublico(tamanho: string | null | undefined) {
  const tamanhoNormalizado = normalizarTamanhoEstoque(tamanho);

  if (tamanhoNormalizado === TAMANHO_ESTOQUE_UNICO) {
    return null;
  }

  return tamanhoNormalizado;
}

/**
 * Mantido por compatibilidade com códigos antigos.
 * Para regras internas de estoque, use normalizarTamanhoEstoque.
 * Para exibição pública, use normalizarTamanhoPublico.
 */
export function normalizarTamanho(tamanho: string | null | undefined) {
  return normalizarTamanhoPublico(tamanho);
}

function agruparEstoquePorTamanho(estoque: EstoqueLojaItem[]) {
  const mapa = new Map<string, number>();

  estoque.forEach((item) => {
    const tamanhoAnel = normalizarTamanhoEstoque(item.tamanhoAnel);
    const quantidadeAtual = Number(item.quantidadeAtual || 0);

    mapa.set(tamanhoAnel, (mapa.get(tamanhoAnel) || 0) + quantidadeAtual);
  });

  return Array.from(mapa.entries()).map(([tamanhoAnel, quantidadeAtual]) => ({
    tamanhoAnel,
    quantidadeAtual,
  }));
}

export function calcularEstoqueProdutoUnitario(produto: {
  estoque: EstoqueLojaItem[];
}) {
  const estoqueAgrupado = agruparEstoquePorTamanho(produto.estoque);

  const estoqueTotal = estoqueAgrupado.reduce(
    (total, estoque) => total + estoque.quantidadeAtual,
    0
  );

  const tamanhosDisponiveis = estoqueAgrupado
    .filter((estoque) => estoque.quantidadeAtual > 0)
    .map((estoque) => ({
      tamanhoAnel: normalizarTamanhoPublico(estoque.tamanhoAnel),
      quantidadeAtual: estoque.quantidadeAtual,
    }))
    .filter((estoque) => estoque.tamanhoAnel)
    .map((estoque) => ({
      tamanhoAnel: estoque.tamanhoAnel as string,
      quantidadeAtual: estoque.quantidadeAtual,
    }));

  return {
    estoqueTotal,
    tamanhosDisponiveis,
  };
}

export function calcularEstoqueProdutoVenda(produto: {
  tipoProduto?: string | null;
  estoque: EstoqueLojaItem[];
  componentesDoKit: ComponenteKitEstoque[];
}) {
  if (produto.tipoProduto === "KIT") {
    const estoqueKit = calcularEstoqueKit(produto);

    return {
      estoqueAtual: estoqueKit.estoqueTotal,
      estoquesPorTamanho: [
        {
          tamanhoAnel: TAMANHO_ESTOQUE_UNICO,
          quantidadeAtual: estoqueKit.estoqueTotal,
        },
      ],
    };
  }

  const estoqueAgrupado = agruparEstoquePorTamanho(produto.estoque);

  const estoqueAtual = estoqueAgrupado.reduce(
    (total, estoque) => total + estoque.quantidadeAtual,
    0
  );

  return {
    estoqueAtual,
    estoquesPorTamanho: estoqueAgrupado.filter(
      (estoque) => estoque.quantidadeAtual > 0
    ),
  };
}

export function calcularEstoqueKit(produto: {
  componentesDoKit: ComponenteKitEstoque[];
}) {
  if (produto.componentesDoKit.length === 0) {
    return {
      estoqueTotal: 0,
      tamanhosDisponiveis: [],
    };
  }

  const disponibilidades = produto.componentesDoKit.map((componente) => {
    const quantidadeNecessaria = Number(componente.quantidade || 0);

    if (quantidadeNecessaria <= 0) {
      return 0;
    }

    const estoqueComponente = componente.componenteProduto.estoque.reduce(
      (total, estoque) => total + Number(estoque.quantidadeAtual || 0),
      0
    );

    return Math.floor(estoqueComponente / quantidadeNecessaria);
  });

  const estoqueTotal = Math.min(...disponibilidades);

  return {
    estoqueTotal: Number.isFinite(estoqueTotal) ? estoqueTotal : 0,
    tamanhosDisponiveis: [],
  };
}

export function calcularEstoqueProdutoPublico(produto: {
  tipoProduto?: string | null;
  estoque: EstoqueLojaItem[];
  componentesDoKit: ComponenteKitEstoque[];
}) {
  if (produto.tipoProduto === "KIT") {
    return calcularEstoqueKit(produto);
  }

  return calcularEstoqueProdutoUnitario(produto);
}

export function buscarQuantidadeDisponivelPorTamanho(
  estoque: EstoqueLojaItem[],
  tamanhoAnel: string | null | undefined
) {
  const tamanhoNormalizado = normalizarTamanhoEstoque(tamanhoAnel);
  const estoqueAgrupado = agruparEstoquePorTamanho(estoque);

  const item = estoqueAgrupado.find(
    (estoqueItem) => estoqueItem.tamanhoAnel === tamanhoNormalizado
  );

  return item?.quantidadeAtual || 0;
}