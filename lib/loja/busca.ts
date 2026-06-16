import { prisma } from "@/lib/prisma";
import { calcularEstoqueProdutoPublico } from "@/lib/loja/estoque";

export type BuscaLojaTipo = "todos" | "produtos" | "categorias" | "paginas";

export type BuscaLojaProduto = {
  id: string;
  codigoInterno: string;
  nome: string;
  imagemUrl: string | null;
  imagemHoverUrl: string | null;
  categoria: string;
  categoriaIds: string[];
  categoriaSlugs: string[];
  categoriaNomes: string[];
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoqueTotal: number;
  vendidosTotal: number;
  criadoEm: string;
  tamanhosDisponiveis: {
    tamanhoAnel: string;
    quantidadeAtual: number;
  }[];
  href: string;
  relevancia: number;
};

export type BuscaLojaCategoria = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  imagemUrl: string | null;
  href: string;
  relevancia: number;
};

export type BuscaLojaPagina = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  descricao: string | null;
  href: string;
  relevancia: number;
};

export type BuscaLojaFiltrosDetectados = {
  precoMaximo: number | null;
  medida: string | null;
  categoria: string | null;
  intencoes: string[];
};

export type BuscaLojaResultado = {
  produtos: BuscaLojaProduto[];
  categorias: BuscaLojaCategoria[];
  paginas: BuscaLojaPagina[];
  sugestoes: string[];
  filtrosDetectados: BuscaLojaFiltrosDetectados;
  termoNormalizado: string;
};

type ProdutoBuscaRaw = Awaited<ReturnType<typeof buscarProdutosBuscaRaw>>[number];
type CategoriaBuscaRaw = Awaited<ReturnType<typeof buscarCategoriasBuscaRaw>>[number];
type PaginaBuscaRaw = Awaited<ReturnType<typeof buscarPaginasBuscaRaw>>[number];

const SUGESTOES_FIXAS = [
  "Aneis",
  "Brincos",
  "Colares",
  "Pulseiras",
  "Presentes",
  "Promocoes",
];

const SINONIMOS: Record<string, string> = {
  aneis: "anel",
  anel: "anel",
  brincos: "brinco",
  brinco: "brinco",
  colares: "colar",
  colar: "colar",
  corrente: "colar",
  correntes: "colar",
  gargantilha: "colar",
  gargantilhas: "colar",
  pulseiras: "pulseira",
  pulseira: "pulseira",
  pingentes: "pingente",
  pingente: "pingente",
  acessorios: "acessorio",
  acessorio: "acessorio",
  dourado: "dourado",
  dourada: "dourado",
  ouro: "dourado",
  gold: "dourado",
  prata: "prata",
  silver: "prata",
  rose: "rose",
  perola: "perola",
  perolas: "perola",
  presente: "presente",
  presentes: "presente",
  gift: "presente",
  promocao: "promocao",
  promocoes: "promocao",
  sale: "promocao",
  desconto: "promocao",
  descontos: "promocao",
  off: "promocao",
  novidade: "novidade",
  novidades: "novidade",
  lancamento: "novidade",
  lancamentos: "novidade",
  novo: "novidade",
  nova: "novidade",
};

const TERMOS_CATEGORIA = new Set([
  "anel",
  "brinco",
  "colar",
  "pulseira",
  "pingente",
  "acessorio",
]);

export function normalizarTextoBusca(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizarToken(token: string) {
  if (token.length <= 3) return token;
  if (token.endsWith("oes")) return `${token.slice(0, -3)}ao`;
  if (token.endsWith("ais")) return `${token.slice(0, -3)}al`;
  if (token.endsWith("eis")) return `${token.slice(0, -3)}el`;
  if (token.endsWith("res")) return token.slice(0, -2);
  if (token.endsWith("s")) return token.slice(0, -1);

  return token;
}

export function tokenizarBusca(value: string | null | undefined) {
  const normalizado = normalizarTextoBusca(value);

  if (!normalizado) return [];

  return normalizado
    .split(" ")
    .map((token) => SINONIMOS[token] || singularizarToken(token))
    .map((token) => SINONIMOS[token] || token)
    .filter(Boolean);
}

function montarTextoIndexavel(value: string | null | undefined) {
  const normalizado = normalizarTextoBusca(value);
  const tokensCanonicos = tokenizarBusca(value).join(" ");

  return [normalizado, tokensCanonicos].filter(Boolean).join(" ");
}

function detectarPrecoMaximo(termo: string) {
  const normalizado = normalizarTextoBusca(termo);
  const match = normalizado.match(
    /(?:ate|abaixo de|menos de|menor que)\s*(?:r\$)?\s*(\d+(?:[,.]\d{1,2})?)/
  );

  if (!match) return null;

  const valor = Number(match[1].replace(",", "."));

  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function detectarMedida(termo: string) {
  const normalizado = normalizarTextoBusca(termo);
  const match = normalizado.match(/(?:aro|tamanho|medida|tam)\s*(\d{1,3})/);

  return match?.[1] || null;
}

function precoFinalProduto(produto: {
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
}) {
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

function textoContemTodosTokens(texto: string, tokens: string[]) {
  if (tokens.length === 0) return true;

  return tokens.every((token) => texto.includes(token));
}

function contarTokensEncontrados(texto: string, tokens: string[]) {
  return tokens.reduce((total, token) => total + (texto.includes(token) ? 1 : 0), 0);
}

function scoreTextoCampo(texto: string, tokens: string[], peso: number) {
  if (!texto) return 0;

  return contarTokensEncontrados(texto, tokens) * peso;
}

async function buscarProdutosBuscaRaw() {
  return prisma.produto.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: {
      nome: "asc",
    },
    take: 500,
    include: {
      estoque: {
        orderBy: {
          tamanhoAnel: "asc",
        },
      },
      vendasItens: {
        select: {
          quantidade: true,
        },
      },
      componentesDoKit: {
        select: {
          quantidade: true,
          componenteProduto: {
            select: {
              estoque: {
                select: {
                  quantidadeAtual: true,
                },
              },
            },
          },
        },
      },
      categoriasProduto: {
        select: {
          categoria: {
            select: {
              id: true,
              nome: true,
              slug: true,
            },
          },
        },
      },
      variacoes: {
        where: {
          ativo: true,
        },
        select: {
          nome: true,
          opcoes: {
            where: {
              ativo: true,
            },
            select: {
              nome: true,
            },
          },
        },
      },
      familia: {
        select: {
          nome: true,
          slug: true,
        },
      },
      familiasVinculos: {
        where: {
          ativo: true,
        },
        select: {
          familia: {
            select: {
              nome: true,
            },
          },
          valores: {
            select: {
              valor: true,
              campo: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

async function buscarCategoriasBuscaRaw() {
  return prisma.categoriaProduto.findMany({
    where: {
      ativo: true,
    },
    orderBy: [{ ordemMenu: "asc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      slug: true,
      descricao: true,
      imagemUrl: true,
    },
  });
}

async function buscarPaginasBuscaRaw() {
  return prisma.lojaPagina.findMany({
    where: {
      ativo: true,
      statusPublicacao: "PUBLICADA",
      tipo: {
        in: ["GERAL", "LANDING", "CAMPANHA"],
      },
    },
    orderBy: [{ publicadoEm: "desc" }, { atualizadoEm: "desc" }],
    take: 80,
    select: {
      id: true,
      titulo: true,
      slug: true,
      tipo: true,
      seoDescription: true,
    },
  });
}

function montarTextoProduto(produto: ProdutoBuscaRaw) {
  return [
    produto.nome,
    produto.codigoInterno,
    produto.categoria,
    produto.descricaoLoja,
    produto.familiaMaterial,
    produto.familiaCorJoia,
    produto.familia?.nome,
    produto.familia?.slug,
    ...produto.categoriasProduto.flatMap((item) => [
      item.categoria.nome,
      item.categoria.slug,
    ]),
    ...produto.variacoes.flatMap((variacao) => [
      variacao.nome,
      ...variacao.opcoes.map((opcao) => opcao.nome),
    ]),
    ...produto.familiasVinculos.flatMap((vinculo) => [
      vinculo.familia.nome,
      ...vinculo.valores.flatMap((valor) => [valor.campo.nome, valor.valor]),
    ]),
    ...produto.estoque.map((estoque) =>
      estoque.tamanhoAnel ? `aro ${estoque.tamanhoAnel} tamanho ${estoque.tamanhoAnel}` : ""
    ),
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreProduto({
  produto,
  tokens,
  termoNormalizado,
  filtros,
}: {
  produto: ProdutoBuscaRaw;
  tokens: string[];
  termoNormalizado: string;
  filtros: BuscaLojaFiltrosDetectados;
}) {
  const nome = montarTextoIndexavel(produto.nome);
  const codigo = montarTextoIndexavel(produto.codigoInterno);
  const categoriaPrincipal = montarTextoIndexavel(produto.categoria);
  const categorias = montarTextoIndexavel(
    produto.categoriasProduto.map((item) => item.categoria.nome).join(" ")
  );
  const descricao = montarTextoIndexavel(produto.descricaoLoja);
  const textoCompleto = montarTextoIndexavel(montarTextoProduto(produto));

  let score = 0;

  if (nome === termoNormalizado) score += 180;
  if (nome.startsWith(termoNormalizado) && termoNormalizado) score += 120;
  score += scoreTextoCampo(nome, tokens, 42);
  score += scoreTextoCampo(categoriaPrincipal, tokens, 34);
  score += scoreTextoCampo(categorias, tokens, 34);
  score += scoreTextoCampo(codigo, tokens, 30);
  score += scoreTextoCampo(descricao, tokens, 16);
  score += scoreTextoCampo(textoCompleto, tokens, 8);

  if (textoContemTodosTokens(textoCompleto, tokens)) score += 35;

  if (filtros.categoria) {
    const categoriaToken = filtros.categoria;
    if (
      categoriaPrincipal.includes(categoriaToken) ||
      categorias.includes(categoriaToken)
    ) {
      score += 80;
    } else {
      score -= 80;
    }
  }

  if (filtros.medida) {
    const temMedida = produto.estoque.some(
      (estoque) =>
        normalizarTextoBusca(estoque.tamanhoAnel) === filtros.medida &&
        Number(estoque.quantidadeAtual || 0) > 0
    );

    score += temMedida ? 70 : -30;
  }

  if (filtros.intencoes.includes("promocao") && produto.descontoAtivo) {
    score += 85;
  }

  if (filtros.intencoes.includes("presente")) {
    score += 24;
  }

  if (filtros.precoMaximo !== null) {
    score += 22;
  }

  if (filtros.intencoes.includes("novidade")) {
    score += Math.max(
      0,
      40 -
        Math.floor(
          (Date.now() - produto.criadoEm.getTime()) / (1000 * 60 * 60 * 24 * 10)
        )
    );
  }

  return score;
}

function formatarProdutoBusca(
  produto: ProdutoBuscaRaw,
  relevancia: number
): BuscaLojaProduto {
  const estoque = calcularEstoqueProdutoPublico(produto);
  const vendidosTotal = produto.vendasItens.reduce(
    (total, item) => total + Number(item.quantidade || 0),
    0
  );

  return {
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.tipoProduto === "KIT" ? `${produto.nome} · Kit` : produto.nome,
    imagemUrl: produto.imagemUrl,
    imagemHoverUrl: produto.imagemHoverUrl,
    categoria: produto.categoria,
    categoriaIds: produto.categoriasProduto.map((item) => item.categoria.id),
    categoriaSlugs: produto.categoriasProduto.map((item) => item.categoria.slug),
    categoriaNomes: produto.categoriasProduto.map((item) => item.categoria.nome),
    precoVenda: Number(produto.precoVenda),
    descontoAtivo: produto.descontoAtivo,
    precoPromocional: produto.precoPromocional
      ? Number(produto.precoPromocional)
      : null,
    estoqueTotal: estoque.estoqueTotal,
    vendidosTotal,
    criadoEm: produto.criadoEm.toISOString(),
    tamanhosDisponiveis: estoque.tamanhosDisponiveis,
    href: `/loja/produto/${produto.id}`,
    relevancia,
  };
}

function scoreCategoria(
  categoria: CategoriaBuscaRaw,
  tokens: string[],
  termoNormalizado: string
) {
  const nome = montarTextoIndexavel(categoria.nome);
  const slug = montarTextoIndexavel(categoria.slug);
  const descricao = montarTextoIndexavel(categoria.descricao);
  const texto = [nome, slug, descricao].join(" ");
  let score = 0;

  if (nome === termoNormalizado || slug === termoNormalizado) score += 150;
  if (nome.startsWith(termoNormalizado) && termoNormalizado) score += 95;
  score += scoreTextoCampo(nome, tokens, 35);
  score += scoreTextoCampo(slug, tokens, 24);
  score += scoreTextoCampo(descricao, tokens, 12);
  if (textoContemTodosTokens(texto, tokens)) score += 30;

  return score;
}

function scorePagina(
  pagina: PaginaBuscaRaw,
  tokens: string[],
  termoNormalizado: string
) {
  const titulo = montarTextoIndexavel(pagina.titulo);
  const slug = montarTextoIndexavel(pagina.slug);
  const descricao = montarTextoIndexavel(pagina.seoDescription);
  const texto = [titulo, slug, descricao].join(" ");
  let score = 0;

  if (titulo === termoNormalizado || slug === termoNormalizado) score += 140;
  if (titulo.startsWith(termoNormalizado) && termoNormalizado) score += 90;
  score += scoreTextoCampo(titulo, tokens, 32);
  score += scoreTextoCampo(slug, tokens, 22);
  score += scoreTextoCampo(descricao, tokens, 10);
  if (textoContemTodosTokens(texto, tokens)) score += 25;

  return score;
}

function detectarFiltros(termo: string, tokens: string[]): BuscaLojaFiltrosDetectados {
  const intencoes = Array.from(
    new Set(tokens.filter((token) => ["presente", "promocao", "novidade"].includes(token)))
  );
  const categoria = tokens.find((token) => TERMOS_CATEGORIA.has(token)) || null;

  return {
    precoMaximo: detectarPrecoMaximo(termo),
    medida: detectarMedida(termo),
    categoria,
    intencoes,
  };
}

function limitarTipo(tipo: BuscaLojaTipo | undefined): BuscaLojaTipo {
  if (
    tipo === "produtos" ||
    tipo === "categorias" ||
    tipo === "paginas" ||
    tipo === "todos"
  ) {
    return tipo;
  }

  return "todos";
}

export async function buscarLojaInteligente({
  q,
  limite = 12,
  tipo = "todos",
}: {
  q: string;
  limite?: number;
  tipo?: BuscaLojaTipo;
}): Promise<BuscaLojaResultado> {
  const termoNormalizado = normalizarTextoBusca(q);
  const tokens = tokenizarBusca(q);
  const filtrosDetectados = detectarFiltros(q, tokens);
  const tipoNormalizado = limitarTipo(tipo);
  const limiteSeguro = Math.min(Math.max(Number(limite) || 12, 1), 60);

  const incluirProdutos = tipoNormalizado === "todos" || tipoNormalizado === "produtos";
  const incluirCategorias =
    tipoNormalizado === "todos" || tipoNormalizado === "categorias";
  const incluirPaginas = tipoNormalizado === "todos" || tipoNormalizado === "paginas";

  const [produtosRaw, categoriasRaw, paginasRaw] = await Promise.all([
    incluirProdutos ? buscarProdutosBuscaRaw() : Promise.resolve([]),
    incluirCategorias ? buscarCategoriasBuscaRaw() : Promise.resolve([]),
    incluirPaginas ? buscarPaginasBuscaRaw() : Promise.resolve([]),
  ]);

  const produtos = produtosRaw
    .map((produto) => {
      const relevancia = scoreProduto({
        produto,
        tokens,
        termoNormalizado,
        filtros: filtrosDetectados,
      });

      return { produto, relevancia };
    })
    .filter(({ produto, relevancia }) => {
      if (filtrosDetectados.precoMaximo !== null) {
        const preco = precoFinalProduto({
          precoVenda: Number(produto.precoVenda),
          descontoAtivo: produto.descontoAtivo,
          precoPromocional: produto.precoPromocional
            ? Number(produto.precoPromocional)
            : null,
        });

        if (preco > filtrosDetectados.precoMaximo) return false;
      }

      if (!termoNormalizado && filtrosDetectados.precoMaximo === null) {
        return false;
      }

      return relevancia > 0;
    })
    .sort((a, b) => b.relevancia - a.relevancia || a.produto.nome.localeCompare(b.produto.nome))
    .slice(0, limiteSeguro)
    .map(({ produto, relevancia }) => formatarProdutoBusca(produto, relevancia));

  const categorias = categoriasRaw
    .map((categoria) => ({
      categoria,
      relevancia: scoreCategoria(categoria, tokens, termoNormalizado),
    }))
    .filter(({ relevancia }) => termoNormalizado && relevancia > 0)
    .sort(
      (a, b) =>
        b.relevancia - a.relevancia || a.categoria.nome.localeCompare(b.categoria.nome)
    )
    .slice(0, tipoNormalizado === "categorias" ? limiteSeguro : 8)
    .map(({ categoria, relevancia }) => ({
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      descricao: categoria.descricao,
      imagemUrl: categoria.imagemUrl,
      href: `/loja/categoria/${categoria.slug}`,
      relevancia,
    }));

  const paginas = paginasRaw
    .map((pagina) => ({
      pagina,
      relevancia: scorePagina(pagina, tokens, termoNormalizado),
    }))
    .filter(({ relevancia }) => termoNormalizado && relevancia > 0)
    .sort((a, b) => b.relevancia - a.relevancia || a.pagina.titulo.localeCompare(b.pagina.titulo))
    .slice(0, tipoNormalizado === "paginas" ? limiteSeguro : 6)
    .map(({ pagina, relevancia }) => ({
      id: pagina.id,
      titulo: pagina.titulo,
      slug: pagina.slug,
      tipo: pagina.tipo,
      descricao: pagina.seoDescription,
      href: `/loja/p/${pagina.slug}`,
      relevancia,
    }));

  const sugestoesCategorias = categoriasRaw
    .map((categoria) => categoria.nome)
    .slice(0, 6);

  return {
    produtos,
    categorias,
    paginas,
    sugestoes: Array.from(new Set([...sugestoesCategorias, ...SUGESTOES_FIXAS])).slice(0, 8),
    filtrosDetectados,
    termoNormalizado: tokens.join(" "),
  };
}
