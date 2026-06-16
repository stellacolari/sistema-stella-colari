import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const STATUS_COMERCIAL_PRODUTO = [
  "CAMPEAO_PROVAVEL",
  "PROMISSOR",
  "NAO_TESTADO",
  "INTERESSE_SEM_CONVERSAO",
  "TRAVADO",
  "RISCO_RUPTURA",
  "ESTOQUE_PARADO",
  "REPOSICAO_CONFIRMADA",
  "NAO_RECOMPRAR_AINDA",
] as const;

export const RECOMENDACOES_REPOSICAO_PRODUTO = [
  "NAO_REPOR",
  "EXPOR_MAIS",
  "REVISAR_OFERTA",
  "OBSERVAR",
  "REPOR_PEQUENO",
  "REPOR_LOTE_MEDIO",
  "REPOR_LOTE_GRANDE",
  "LIQUIDAR_COM_CUIDADO",
] as const;

export type StatusComercialProduto =
  (typeof STATUS_COMERCIAL_PRODUTO)[number];

export type RecomendacaoReposicaoProduto =
  (typeof RECOMENDACOES_REPOSICAO_PRODUTO)[number];

export type PeriodoMetricasProduto = {
  tipo?: string;
  inicio?: Date;
  fim?: Date;
};

export type ProdutoCicloCalculado = {
  produtoId: string;
  variacaoId: string | null;
  tamanhoAnel: string;
  origemTipo: string | null;
  origemId: string | null;
  dataInicio: Date;
  dataFim: Date | null;
  quantidadeInicial: number;
  quantidadeEntrada: number;
  quantidadeVendida: number;
  quantidadeAtual: number;
  custoMedio: number;
  precoMedioVenda: number;
  receitaGerada: number;
  margemEstimada: number;
  sellThrough: number;
  diasAtePrimeiraVenda: number | null;
  diasAteEsgotar: number | null;
  status: "ABERTO" | "ESGOTADO" | "ENCERRADO" | "REPOSTO" | "AJUSTADO";
};

export type ProdutoSnapshotCalculado = {
  produtoId: string;
  variacaoId: string | null;
  tamanhoAnel: string;
  periodoTipo: string;
  periodoInicio: Date;
  periodoFim: Date;
  vendasQuantidade: number;
  receita: number;
  custoEstimado: number;
  margemEstimada: number;
  estoqueInicial: number;
  estoqueFinal: number;
  entradas: number;
  saidas: number;
  sellThroughPeriodo: number;
  sellThroughAcumulado: number;
  giroEstimado: number;
  scoreValidacao: number;
  statusComercial: StatusComercialProduto;
  recomendacao: RecomendacaoReposicaoProduto;
  dadosJson: Prisma.InputJsonValue;
};

export type ConfiancaAnaliseIntencao = "BAIXA" | "MEDIA" | "ALTA";

export type ProdutoIntencaoContagem = {
  visualizacoes: number;
  favoritos: number;
  desfavoritos: number;
  adicoesCarrinho: number;
  remocoesCarrinho: number;
  cliquesBusca: number;
  cliquesVitrine: number;
  cliquesBanner: number;
  checkoutsIniciados: number;
};

export type ProdutoIntencaoAgregada = ProdutoIntencaoContagem & {
  eventosTotal: number;
  taxaFavorito: number;
  taxaCarrinho: number;
  taxaConversao: number;
  scoreInteresse: number;
  scoreConversao: number;
  confiancaAnalise: ConfiancaAnaliseIntencao;
  interpretacao: string;
};

export type RecomendacaoReposicaoCalculada = {
  recomendacao: RecomendacaoReposicaoProduto;
  statusComercial: StatusComercialProduto;
  confianca: number;
  motivo: string;
  sugestaoQuantidade: number;
  cicloAtual: ProdutoCicloCalculado | null;
  sellThrough: number;
  scoreValidacao: number;
  intencao: ProdutoIntencaoAgregada;
};

export type InteligenciaProduto = {
  resumo: ProdutoSnapshotCalculado | null;
  ciclos: ProdutoCicloCalculado[];
  recomendacao: RecomendacaoReposicaoCalculada;
};

type MovimentoProduto = {
  id: string;
  tipoMovimentacao: string;
  origemTipo: string;
  origemId: string;
  quantidade: number;
  custo: number;
  faturamento: number;
  status: string;
  relacionadoA: string | null;
  gastoProdutoPrincipal: number;
  criadoEm: Date;
  tamanhoAnel: string | null;
};

type ProdutoBase = {
  id: string;
  codigoInterno: string;
  custoBase: number;
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoque: {
    tamanhoAnel: string;
    quantidadeAtual: number;
    custoMedio: number;
  }[];
};

type CicloInterno = ProdutoCicloCalculado & {
  primeiraVendaEm: Date | null;
  custoEntradaTotal: number;
  custoVendidoTotal: number;
};

type TipoMovimentoNormalizado =
  | "ENTRADA"
  | "SAIDA"
  | "ESTORNO_VENDA"
  | "ESTORNO_COMPRA"
  | "IGNORAR";

const MS_DIA = 24 * 60 * 60 * 1000;
const TAMANHO_TODOS = "TODOS";
const PERIODO_ATUAL_PADRAO = "ATUAL";
const TIPOS_INTENCAO_PRODUTO = [
  "PRODUTO_VISUALIZADO",
  "PRODUTO_FAVORITADO",
  "PRODUTO_DESFAVORITADO",
  "PRODUTO_ADICIONADO_CARRINHO",
  "PRODUTO_REMOVIDO_CARRINHO",
  "BUSCA_RESULTADO_CLICADO",
  "VITRINE_EDITORIAL_CLICADA",
  "BANNER_CTA_CLICADO",
  "CHECKOUT_INICIADO",
] as const;

export const INTENCAO_PRODUTO_VAZIA = {
  visualizacoes: 0,
  favoritos: 0,
  desfavoritos: 0,
  adicoesCarrinho: 0,
  remocoesCarrinho: 0,
  cliquesBusca: 0,
  cliquesVitrine: 0,
  cliquesBanner: 0,
  checkoutsIniciados: 0,
  eventosTotal: 0,
  taxaFavorito: 0,
  taxaCarrinho: 0,
  taxaConversao: 0,
  scoreInteresse: 0,
  scoreConversao: 0,
  confiancaAnalise: "BAIXA",
  interpretacao:
    "Produto sem sinais de intencao no periodo. Exponha mais antes de concluir desempenho.",
} as const satisfies ProdutoIntencaoAgregada;

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inteiro(value: unknown) {
  return Math.max(0, Math.round(numero(value)));
}

function arredondar(value: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function percentual(parte: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, arredondar((numero(parte) / numero(total)) * 100, 2));
}

function limitarPercentual(value: number) {
  return Math.max(0, Math.min(100, arredondar(value, 1)));
}

function intencaoVazia(): ProdutoIntencaoAgregada {
  return { ...INTENCAO_PRODUTO_VAZIA };
}

function somarIntencao(contagem: ProdutoIntencaoContagem) {
  return (
    inteiro(contagem.visualizacoes) +
    inteiro(contagem.favoritos) +
    inteiro(contagem.desfavoritos) +
    inteiro(contagem.adicoesCarrinho) +
    inteiro(contagem.remocoesCarrinho) +
    inteiro(contagem.cliquesBusca) +
    inteiro(contagem.cliquesVitrine) +
    inteiro(contagem.cliquesBanner) +
    inteiro(contagem.checkoutsIniciados)
  );
}

export function montarIntencaoAgregada(
  contagem: Partial<ProdutoIntencaoContagem> | null | undefined,
  vendasQuantidade: number,
  estoqueFinal: number
): ProdutoIntencaoAgregada {
  const base: ProdutoIntencaoContagem = {
    visualizacoes: inteiro(contagem?.visualizacoes),
    favoritos: inteiro(contagem?.favoritos),
    desfavoritos: inteiro(contagem?.desfavoritos),
    adicoesCarrinho: inteiro(contagem?.adicoesCarrinho),
    remocoesCarrinho: inteiro(contagem?.remocoesCarrinho),
    cliquesBusca: inteiro(contagem?.cliquesBusca),
    cliquesVitrine: inteiro(contagem?.cliquesVitrine),
    cliquesBanner: inteiro(contagem?.cliquesBanner),
    checkoutsIniciados: inteiro(contagem?.checkoutsIniciados),
  };
  const eventosTotal = somarIntencao(base);
  const taxaFavorito = percentual(base.favoritos, base.visualizacoes);
  const taxaCarrinho = percentual(base.adicoesCarrinho, base.visualizacoes);
  const taxaConversao = percentual(vendasQuantidade, base.visualizacoes);
  const scoreInteresse = limitarPercentual(
    base.visualizacoes * 0.6 +
      base.cliquesBusca * 2.5 +
      base.favoritos * 4 +
      base.adicoesCarrinho * 6 +
      base.cliquesVitrine * 2 +
      base.cliquesBanner * 2.5 +
      base.checkoutsIniciados * 8 -
      base.desfavoritos * 2 -
      base.remocoesCarrinho * 2
  );
  const scoreConversao =
    base.visualizacoes > 0
      ? limitarPercentual(taxaConversao * 4 + Math.min(25, vendasQuantidade * 8))
      : vendasQuantidade > 0
        ? 70
        : 0;
  const amostra = eventosTotal + vendasQuantidade * 3;
  const confiancaAnalise: ConfiancaAnaliseIntencao =
    amostra >= 24 ? "ALTA" : amostra >= 7 ? "MEDIA" : "BAIXA";
  const intencaoForte =
    scoreInteresse >= 30 || base.adicoesCarrinho >= 2 || base.favoritos >= 3;
  const poucaExposicao =
    base.visualizacoes < 5 && eventosTotal < 5 && scoreInteresse < 10;

  let interpretacao =
    "Produto em observacao. Use venda, estoque e sinais de intencao antes de decidir reposicao.";

  if (vendasQuantidade === 0 && poucaExposicao) {
    interpretacao =
      "Produto pouco testado. Aumente exposicao antes de concluir que nao vende.";
  } else if (vendasQuantidade === 0 && intencaoForte) {
    interpretacao =
      "Produto com interesse, mas baixa conversao. Revise preco, fotos, descricao ou condicao.";
  } else if (estoqueFinal <= 1 && (vendasQuantidade > 0 || intencaoForte)) {
    interpretacao =
      "Produto promissor com estoque baixo. Considere reposicao pequena antes de aumentar trafego.";
  } else if (vendasQuantidade > 0 && scoreInteresse >= 20) {
    interpretacao =
      "Produto validado por venda e reforcado por sinais de interesse.";
  }

  return {
    ...base,
    eventosTotal,
    taxaFavorito,
    taxaCarrinho,
    taxaConversao,
    scoreInteresse,
    scoreConversao,
    confiancaAnalise,
    interpretacao,
  };
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function extrairIntencaoSnapshot(
  dadosJson: unknown
): ProdutoIntencaoAgregada {
  const dados = jsonRecord(dadosJson);
  const intencao = jsonRecord(dados?.intencaoComercial);

  if (!intencao) return intencaoVazia();

  return montarIntencaoAgregada(
    {
      visualizacoes: numero(intencao.visualizacoes),
      favoritos: numero(intencao.favoritos),
      desfavoritos: numero(intencao.desfavoritos),
      adicoesCarrinho: numero(intencao.adicoesCarrinho),
      remocoesCarrinho: numero(intencao.remocoesCarrinho),
      cliquesBusca: numero(intencao.cliquesBusca),
      cliquesVitrine: numero(intencao.cliquesVitrine),
      cliquesBanner: numero(intencao.cliquesBanner),
      checkoutsIniciados: numero(intencao.checkoutsIniciados),
    },
    numero(intencao.vendasQuantidade),
    numero(intencao.estoqueFinal)
  );
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function normalizarTamanhoProduto(value: string | null | undefined) {
  const tamanho = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  return tamanho || "UNICO";
}

function diasEntre(inicio: Date, fim: Date) {
  return Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / MS_DIA));
}

function precoAtivo(produto: ProdutoBase) {
  if (produto.descontoAtivo && numero(produto.precoPromocional) > 0) {
    return numero(produto.precoPromocional);
  }

  return numero(produto.precoVenda);
}

function tipoMovimento(movimento: MovimentoProduto): TipoMovimentoNormalizado {
  const tipo = normalizarTexto(movimento.tipoMovimentacao);

  if (normalizarTexto(movimento.status) === "ESTORNADA") return "IGNORAR";
  if (tipo.includes("ESTORNO_VENDA")) return "ESTORNO_VENDA";
  if (tipo.includes("ESTORNO_COMPRA")) return "ESTORNO_COMPRA";
  if (tipo.startsWith("SAIDA")) return "SAIDA";
  if (tipo.startsWith("ENTRADA")) return "ENTRADA";
  if (tipo.includes("ADICAO")) return "ENTRADA";
  if (tipo.includes("EXCLUSAO")) return "ESTORNO_COMPRA";

  return "IGNORAR";
}

function movimentoContaComoVenda(movimento: MovimentoProduto) {
  return tipoMovimento(movimento) === "SAIDA";
}

function custoVenda(movimento: MovimentoProduto, produto: ProdutoBase) {
  return (
    numero(movimento.gastoProdutoPrincipal) ||
    numero(movimento.custo) ||
    numero(produto.custoBase) * inteiro(movimento.quantidade)
  );
}

function criarCiclo(params: {
  produto: ProdutoBase;
  tamanhoAnel: string;
  movimento?: MovimentoProduto;
  quantidadeInicial?: number;
  status?: ProdutoCicloCalculado["status"];
}) {
  const estoque = params.produto.estoque.find(
    (item) => normalizarTamanhoProduto(item.tamanhoAnel) === params.tamanhoAnel
  );
  const custoMedio =
    numero(estoque?.custoMedio) || numero(params.produto.custoBase);
  const inicio = params.movimento?.criadoEm || new Date();
  const quantidadeInicial = inteiro(params.quantidadeInicial);

  return {
    produtoId: params.produto.id,
    variacaoId: null,
    tamanhoAnel: params.tamanhoAnel,
    origemTipo: params.movimento?.origemTipo || null,
    origemId: params.movimento?.origemId || null,
    dataInicio: inicio,
    dataFim: null,
    quantidadeInicial,
    quantidadeEntrada: 0,
    quantidadeVendida: 0,
    quantidadeAtual: quantidadeInicial,
    custoMedio,
    precoMedioVenda: precoAtivo(params.produto),
    receitaGerada: 0,
    margemEstimada: 0,
    sellThrough: 0,
    diasAtePrimeiraVenda: null,
    diasAteEsgotar: null,
    status: params.status || "ABERTO",
    primeiraVendaEm: null,
    custoEntradaTotal: quantidadeInicial * custoMedio,
    custoVendidoTotal: 0,
  } satisfies CicloInterno;
}

function finalizarCiclo(ciclo: CicloInterno, dataFim?: Date | null) {
  const quantidadeBase = ciclo.quantidadeInicial + ciclo.quantidadeEntrada;
  ciclo.custoMedio =
    quantidadeBase > 0
      ? arredondar(ciclo.custoEntradaTotal / quantidadeBase, 4)
      : arredondar(ciclo.custoMedio, 4);
  ciclo.precoMedioVenda =
    ciclo.quantidadeVendida > 0
      ? arredondar(ciclo.receitaGerada / ciclo.quantidadeVendida, 2)
      : arredondar(ciclo.precoMedioVenda, 2);
  ciclo.margemEstimada = arredondar(ciclo.receitaGerada - ciclo.custoVendidoTotal, 2);
  ciclo.sellThrough = percentual(ciclo.quantidadeVendida, quantidadeBase);
  ciclo.diasAtePrimeiraVenda = ciclo.primeiraVendaEm
    ? diasEntre(ciclo.dataInicio, ciclo.primeiraVendaEm)
    : null;

  if (ciclo.quantidadeAtual <= 0 && ciclo.quantidadeVendida > 0) {
    ciclo.status = ciclo.status === "REPOSTO" ? "REPOSTO" : "ESGOTADO";
    ciclo.dataFim = dataFim || ciclo.dataFim || ciclo.primeiraVendaEm || new Date();
    ciclo.diasAteEsgotar = diasEntre(ciclo.dataInicio, ciclo.dataFim);
  } else if (dataFim) {
    ciclo.dataFim = dataFim;
  }

  return {
    produtoId: ciclo.produtoId,
    variacaoId: ciclo.variacaoId,
    tamanhoAnel: ciclo.tamanhoAnel,
    origemTipo: ciclo.origemTipo,
    origemId: ciclo.origemId,
    dataInicio: ciclo.dataInicio,
    dataFim: ciclo.dataFim,
    quantidadeInicial: ciclo.quantidadeInicial,
    quantidadeEntrada: ciclo.quantidadeEntrada,
    quantidadeVendida: ciclo.quantidadeVendida,
    quantidadeAtual: ciclo.quantidadeAtual,
    custoMedio: ciclo.custoMedio,
    precoMedioVenda: ciclo.precoMedioVenda,
    receitaGerada: ciclo.receitaGerada,
    margemEstimada: ciclo.margemEstimada,
    sellThrough: ciclo.sellThrough,
    diasAtePrimeiraVenda: ciclo.diasAtePrimeiraVenda,
    diasAteEsgotar: ciclo.diasAteEsgotar,
    status: ciclo.status,
  } satisfies ProdutoCicloCalculado;
}

async function carregarProdutoBase(produtoId: string): Promise<ProdutoBase | null> {
  return prisma.produto.findUnique({
    where: { id: produtoId },
    select: {
      id: true,
      codigoInterno: true,
      custoBase: true,
      precoVenda: true,
      descontoAtivo: true,
      precoPromocional: true,
      estoque: {
        select: {
          tamanhoAnel: true,
          quantidadeAtual: true,
          custoMedio: true,
        },
      },
    },
  });
}

async function carregarMovimentosProduto(produto: ProdutoBase) {
  return prisma.movimentacao.findMany({
    where: {
      codigoItem: produto.codigoInterno,
      itemTipo: "produto",
      status: {
        notIn: ["NA_LIXEIRA", "CANCELADA"],
      },
    },
    select: {
      id: true,
      tipoMovimentacao: true,
      origemTipo: true,
      origemId: true,
      quantidade: true,
      custo: true,
      faturamento: true,
      status: true,
      relacionadoA: true,
      gastoProdutoPrincipal: true,
      criadoEm: true,
      tamanhoAnel: true,
    },
    orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
  });
}

async function carregarIntencaoProduto(
  produtoId: string,
  periodo: ReturnType<typeof periodoPadrao>
): Promise<ProdutoIntencaoContagem> {
  const eventos = await prisma.eventoComercial.groupBy({
    by: ["tipo"],
    where: {
      produtoId,
      criadoEm: {
        gte: periodo.periodoInicio,
        lte: periodo.periodoFim,
      },
      tipo: {
        in: [...TIPOS_INTENCAO_PRODUTO],
      },
    },
    _count: {
      _all: true,
    },
  });

  const porTipo = new Map(
    eventos.map((evento) => [evento.tipo, evento._count._all])
  );

  return {
    visualizacoes: porTipo.get("PRODUTO_VISUALIZADO") || 0,
    favoritos: porTipo.get("PRODUTO_FAVORITADO") || 0,
    desfavoritos: porTipo.get("PRODUTO_DESFAVORITADO") || 0,
    adicoesCarrinho: porTipo.get("PRODUTO_ADICIONADO_CARRINHO") || 0,
    remocoesCarrinho: porTipo.get("PRODUTO_REMOVIDO_CARRINHO") || 0,
    cliquesBusca: porTipo.get("BUSCA_RESULTADO_CLICADO") || 0,
    cliquesVitrine: porTipo.get("VITRINE_EDITORIAL_CLICADA") || 0,
    cliquesBanner: porTipo.get("BANNER_CTA_CLICADO") || 0,
    checkoutsIniciados: porTipo.get("CHECKOUT_INICIADO") || 0,
  };
}

function agruparMovimentosPorTamanho(movimentos: MovimentoProduto[]) {
  const grupos = new Map<string, MovimentoProduto[]>();

  movimentos.forEach((movimento) => {
    const tamanho = normalizarTamanhoProduto(movimento.tamanhoAnel);
    const atual = grupos.get(tamanho) || [];
    atual.push(movimento);
    grupos.set(tamanho, atual);
  });

  return grupos;
}

function reconstruirCiclosDoTamanho(
  produto: ProdutoBase,
  tamanhoAnel: string,
  movimentos: MovimentoProduto[]
) {
  const ciclos: ProdutoCicloCalculado[] = [];
  let ciclo: CicloInterno | null = null;

  function empurrarCiclo(status: ProdutoCicloCalculado["status"], dataFim: Date) {
    if (!ciclo) return;
    ciclo.status = status;
    ciclos.push(finalizarCiclo(ciclo, dataFim));
    ciclo = null;
  }

  movimentos.forEach((movimento) => {
    const tipo = tipoMovimento(movimento);
    const quantidade = inteiro(movimento.quantidade);
    if (!quantidade || tipo === "IGNORAR") return;

    if (tipo === "ENTRADA") {
      if (
        ciclo &&
        ciclo.quantidadeVendida > 0 &&
        ciclo.quantidadeAtual <= 1
      ) {
        empurrarCiclo(ciclo.quantidadeAtual <= 0 ? "ESGOTADO" : "REPOSTO", movimento.criadoEm);
      }

      if (!ciclo) {
        ciclo = criarCiclo({ produto, tamanhoAnel, movimento });
      }

      ciclo.quantidadeEntrada += quantidade;
      ciclo.quantidadeAtual += quantidade;
      ciclo.custoEntradaTotal += numero(movimento.custo);
      return;
    }

    if (tipo === "SAIDA") {
      if (!ciclo) {
        ciclo = criarCiclo({
          produto,
          tamanhoAnel,
          movimento,
          quantidadeInicial: quantidade,
          status: "AJUSTADO",
        });
      }

      ciclo.quantidadeVendida += quantidade;
      ciclo.quantidadeAtual = Math.max(0, ciclo.quantidadeAtual - quantidade);
      ciclo.receitaGerada = arredondar(ciclo.receitaGerada + numero(movimento.faturamento), 2);
      ciclo.custoVendidoTotal = arredondar(
        ciclo.custoVendidoTotal + custoVenda(movimento, produto),
        2
      );

      if (!ciclo.primeiraVendaEm) {
        ciclo.primeiraVendaEm = movimento.criadoEm;
      }

      if (ciclo.quantidadeAtual <= 0) {
        ciclo.status = "ESGOTADO";
        ciclo.dataFim = movimento.criadoEm;
      }
      return;
    }

    if (tipo === "ESTORNO_VENDA") {
      if (!ciclo) {
        ciclo = criarCiclo({
          produto,
          tamanhoAnel,
          movimento,
          status: "AJUSTADO",
        });
      }

      ciclo.quantidadeVendida = Math.max(0, ciclo.quantidadeVendida - quantidade);
      ciclo.quantidadeAtual += quantidade;
      ciclo.receitaGerada = Math.max(0, arredondar(ciclo.receitaGerada - numero(movimento.faturamento), 2));
      ciclo.custoVendidoTotal = Math.max(
        0,
        arredondar(ciclo.custoVendidoTotal - custoVenda(movimento, produto), 2)
      );
      ciclo.status = "AJUSTADO";
      return;
    }

    if (tipo === "ESTORNO_COMPRA") {
      if (!ciclo) {
        ciclo = criarCiclo({
          produto,
          tamanhoAnel,
          movimento,
          status: "AJUSTADO",
        });
      }

      ciclo.quantidadeEntrada = Math.max(0, ciclo.quantidadeEntrada - quantidade);
      ciclo.quantidadeAtual = Math.max(0, ciclo.quantidadeAtual - quantidade);
      ciclo.custoEntradaTotal = Math.max(
        0,
        arredondar(ciclo.custoEntradaTotal - numero(movimento.custo), 2)
      );
      ciclo.status = "AJUSTADO";
    }
  });

  if (ciclo) {
    ciclos.push(finalizarCiclo(ciclo));
  }

  if (ciclos.length === 0) {
    const estoque = produto.estoque.find(
      (item) => normalizarTamanhoProduto(item.tamanhoAnel) === tamanhoAnel
    );

    if (estoque && estoque.quantidadeAtual > 0) {
      ciclos.push(
        finalizarCiclo(
          criarCiclo({
            produto,
            tamanhoAnel,
            quantidadeInicial: estoque.quantidadeAtual,
            status: "AJUSTADO",
          })
        )
      );
    }
  }

  return ciclos;
}

export async function reconstruirCiclosProduto(
  produtoId: string,
  options: { persistir?: boolean } = {}
) {
  const produto = await carregarProdutoBase(produtoId);
  if (!produto) return [];

  const movimentos = await carregarMovimentosProduto(produto);
  const grupos = agruparMovimentosPorTamanho(movimentos);

  produto.estoque.forEach((estoque) => {
    const tamanho = normalizarTamanhoProduto(estoque.tamanhoAnel);
    if (!grupos.has(tamanho)) grupos.set(tamanho, []);
  });

  const ciclos = Array.from(grupos.entries())
    .flatMap(([tamanhoAnel, movimentosTamanho]) =>
      reconstruirCiclosDoTamanho(produto, tamanhoAnel, movimentosTamanho)
    )
    .sort(
      (a, b) =>
        a.tamanhoAnel.localeCompare(b.tamanhoAnel, "pt-BR") ||
        a.dataInicio.getTime() - b.dataInicio.getTime()
    );

  if (options.persistir) {
    await prisma.produtoCicloEstoque.deleteMany({ where: { produtoId } });

    if (ciclos.length > 0) {
      await prisma.produtoCicloEstoque.createMany({
        data: ciclos.map((ciclo) => {
          const atualizadoEm = new Date();

          return {
            produtoId: ciclo.produtoId,
            variacaoId: ciclo.variacaoId,
            tamanhoAnel: ciclo.tamanhoAnel,
            origemTipo: ciclo.origemTipo,
            origemId: ciclo.origemId,
            dataInicio: ciclo.dataInicio,
            dataFim: ciclo.dataFim,
            quantidadeInicial: ciclo.quantidadeInicial,
            quantidadeEntrada: ciclo.quantidadeEntrada,
            quantidadeVendida: ciclo.quantidadeVendida,
            quantidadeAtual: ciclo.quantidadeAtual,
            custoMedio: ciclo.custoMedio,
            precoMedioVenda: ciclo.precoMedioVenda,
            receitaGerada: ciclo.receitaGerada,
            margemEstimada: ciclo.margemEstimada,
            sellThrough: ciclo.sellThrough,
            diasAtePrimeiraVenda: ciclo.diasAtePrimeiraVenda,
            diasAteEsgotar: ciclo.diasAteEsgotar,
            status: ciclo.status,
            atualizadoEm,
          };
        }),
      });
    }
  }

  return ciclos;
}

function periodoPadrao(periodo?: PeriodoMetricasProduto) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  return {
    periodoTipo: periodo?.tipo || PERIODO_ATUAL_PADRAO,
    periodoInicio: periodo?.inicio || inicioMes,
    periodoFim: periodo?.fim || agora,
  };
}

function classificarSnapshot(params: {
  estoqueFinal: number;
  vendasQuantidade: number;
  sellThroughAcumulado: number;
  sellThroughPeriodo: number;
  diasSemVenda: number | null;
  ciclos: ProdutoCicloCalculado[];
  margemEstimada: number;
  intencao: ProdutoIntencaoAgregada;
}): StatusComercialProduto {
  const cicloAtual = params.ciclos
    .filter((ciclo) => ciclo.status === "ABERTO" || ciclo.status === "AJUSTADO")
    .at(-1);
  const ciclosEsgotadosRapidos = params.ciclos.filter(
    (ciclo) =>
      ciclo.quantidadeVendida >= 2 &&
      ciclo.sellThrough >= 95 &&
      (ciclo.diasAteEsgotar ?? 999) <= 15
  ).length;
  const intencaoForte =
    params.intencao.scoreInteresse >= 30 ||
    params.intencao.adicoesCarrinho >= 2 ||
    params.intencao.favoritos >= 3;
  const intencaoRelevante =
    params.intencao.scoreInteresse >= 18 ||
    params.intencao.adicoesCarrinho >= 1 ||
    params.intencao.favoritos >= 2 ||
    params.intencao.cliquesBusca >= 3;
  const poucaExposicao =
    params.intencao.visualizacoes < 5 &&
    params.intencao.eventosTotal < 5 &&
    params.intencao.scoreInteresse < 10;

  if (
    params.estoqueFinal <= 1 &&
    (params.vendasQuantidade > 0 || ciclosEsgotadosRapidos > 0 || intencaoForte)
  ) {
    return "RISCO_RUPTURA";
  }

  if (ciclosEsgotadosRapidos >= 1 && params.ciclos.length >= 2 && params.vendasQuantidade > 0) {
    return "REPOSICAO_CONFIRMADA";
  }

  if (
    ciclosEsgotadosRapidos >= 1 ||
    (params.sellThroughAcumulado >= 80 &&
      (params.vendasQuantidade > 0 || intencaoRelevante)) ||
    (params.vendasQuantidade >= 2 && intencaoForte && params.margemEstimada >= 0)
  ) {
    return "CAMPEAO_PROVAVEL";
  }

  if (params.vendasQuantidade === 0 && poucaExposicao) {
    return "NAO_TESTADO";
  }

  if (params.vendasQuantidade === 0 && intencaoForte) {
    return (params.diasSemVenda ?? 0) >= 30 ? "TRAVADO" : "INTERESSE_SEM_CONVERSAO";
  }

  if (
    params.vendasQuantidade > 0 ||
    params.sellThroughPeriodo >= 35 ||
    intencaoRelevante
  ) {
    return "PROMISSOR";
  }

  if (
    params.estoqueFinal > 0 &&
    params.vendasQuantidade === 0 &&
    params.intencao.visualizacoes >= 10 &&
    params.intencao.scoreInteresse < 12 &&
    (params.diasSemVenda ?? 0) >= 60
  ) {
    return "ESTOQUE_PARADO";
  }

  if (
    params.estoqueFinal > 0 &&
    cicloAtual &&
    cicloAtual.quantidadeEntrada + cicloAtual.quantidadeInicial >= 2 &&
    cicloAtual.quantidadeVendida === 0 &&
    (params.diasSemVenda ?? 0) >= 45
  ) {
    return "TRAVADO";
  }

  if (
    params.estoqueFinal > 0 &&
    params.diasSemVenda !== null &&
    params.diasSemVenda >= 45 &&
    params.intencao.eventosTotal >= 5
  ) {
    return "NAO_RECOMPRAR_AINDA";
  }

  return "NAO_TESTADO";
}

function recomendarReposicao(params: {
  statusComercial: StatusComercialProduto;
  estoqueFinal: number;
  vendasQuantidade: number;
  scoreValidacao: number;
  margemEstimada: number;
  cicloAtual: ProdutoCicloCalculado | null;
  ciclos: ProdutoCicloCalculado[];
  intencao: ProdutoIntencaoAgregada;
}): RecomendacaoReposicaoProduto {
  const ciclosRapidos = params.ciclos.filter(
    (ciclo) =>
      ciclo.quantidadeVendida >= 2 &&
      ciclo.sellThrough >= 95 &&
      (ciclo.diasAteEsgotar ?? 999) <= 15
  ).length;
  const intencaoForte =
    params.intencao.scoreInteresse >= 30 ||
    params.intencao.adicoesCarrinho >= 2 ||
    params.intencao.favoritos >= 3;
  const intencaoRelevante =
    params.intencao.scoreInteresse >= 18 ||
    params.intencao.adicoesCarrinho >= 1 ||
    params.intencao.favoritos >= 2;

  if (params.statusComercial === "ESTOQUE_PARADO") return "LIQUIDAR_COM_CUIDADO";
  if (
    params.statusComercial === "TRAVADO" ||
    params.statusComercial === "INTERESSE_SEM_CONVERSAO"
  ) {
    return "REVISAR_OFERTA";
  }
  if (params.statusComercial === "NAO_TESTADO") return "EXPOR_MAIS";
  if (params.statusComercial === "NAO_RECOMPRAR_AINDA") return "NAO_REPOR";
  if (params.margemEstimada < 0 && params.scoreValidacao < 55) return "OBSERVAR";

  if (params.statusComercial === "REPOSICAO_CONFIRMADA") {
    return params.scoreValidacao >= 85 && ciclosRapidos >= 2
      ? "REPOR_LOTE_GRANDE"
      : "REPOR_LOTE_MEDIO";
  }

  if (params.statusComercial === "RISCO_RUPTURA") {
    return params.scoreValidacao >= 75 &&
      params.vendasQuantidade >= 2 &&
      intencaoRelevante
      ? "REPOR_LOTE_MEDIO"
      : "REPOR_PEQUENO";
  }

  if (params.statusComercial === "CAMPEAO_PROVAVEL") {
    return params.vendasQuantidade >= 2 && intencaoForte
      ? "REPOR_LOTE_MEDIO"
      : "REPOR_PEQUENO";
  }

  if (params.statusComercial === "PROMISSOR") {
    if (params.estoqueFinal <= 1 && (params.vendasQuantidade > 0 || intencaoForte)) {
      return "REPOR_PEQUENO";
    }

    if (params.vendasQuantidade >= 1 && intencaoRelevante) {
      return "REPOR_PEQUENO";
    }

    return "OBSERVAR";
  }

  if (!params.cicloAtual || params.cicloAtual.quantidadeVendida === 0) {
    return "EXPOR_MAIS";
  }

  return params.estoqueFinal <= 1 ? "OBSERVAR" : "NAO_REPOR";
}

function calcularScore(params: {
  vendasQuantidade: number;
  sellThroughAcumulado: number;
  sellThroughPeriodo: number;
  giroEstimado: number;
  margemEstimada: number;
  estoqueFinal: number;
  ciclos: ProdutoCicloCalculado[];
  intencao: ProdutoIntencaoAgregada;
}) {
  const cicloAtual = params.ciclos.at(-1);
  const ciclosRapidos = params.ciclos.filter(
    (ciclo) =>
      ciclo.quantidadeVendida >= 2 &&
      ciclo.sellThrough >= 95 &&
      (ciclo.diasAteEsgotar ?? 999) <= 15
  ).length;

  let score = 30;
  score += Math.min(30, params.sellThroughAcumulado * 0.3);
  score += Math.min(20, params.sellThroughPeriodo * 0.2);
  score += Math.min(16, params.giroEstimado * 4);
  score += Math.min(12, params.vendasQuantidade * 4);
  score += ciclosRapidos * 12;
  score += Math.min(18, params.intencao.scoreInteresse * 0.18);
  score += Math.min(8, params.intencao.scoreConversao * 0.08);

  if (params.margemEstimada < 0) score -= 18;
  if (
    params.estoqueFinal <= 1 &&
    (params.vendasQuantidade > 0 || params.intencao.scoreInteresse >= 30)
  ) {
    score += 8;
  }
  if (cicloAtual && cicloAtual.quantidadeVendida === 0 && cicloAtual.quantidadeAtual > 0) {
    score -= 8;
  }
  if (params.vendasQuantidade === 0 && params.intencao.scoreInteresse >= 30) {
    score = Math.min(score, 68);
  }

  return Math.max(0, Math.min(100, arredondar(score, 1)));
}

function montarSnapshot(params: {
  produto: ProdutoBase;
  tamanhoAnel: string;
  periodo: ReturnType<typeof periodoPadrao>;
  movimentos: MovimentoProduto[];
  ciclos: ProdutoCicloCalculado[];
  estoqueFinal: number;
  intencaoContagem: ProdutoIntencaoContagem;
}) {
  const movimentosPeriodo = params.movimentos.filter(
    (movimento) =>
      movimento.criadoEm >= params.periodo.periodoInicio &&
      movimento.criadoEm <= params.periodo.periodoFim
  );
  const vendas = movimentosPeriodo.filter(movimentoContaComoVenda);
  const entradas = movimentosPeriodo.filter(
    (movimento) => tipoMovimento(movimento) === "ENTRADA" || tipoMovimento(movimento) === "ESTORNO_VENDA"
  );
  const saidas = movimentosPeriodo.filter(
    (movimento) => tipoMovimento(movimento) === "SAIDA" || tipoMovimento(movimento) === "ESTORNO_COMPRA"
  );
  const vendasQuantidade = vendas.reduce((total, item) => total + inteiro(item.quantidade), 0);
  const receita = arredondar(vendas.reduce((total, item) => total + numero(item.faturamento), 0), 2);
  const custoEstimado = arredondar(
    vendas.reduce((total, item) => total + custoVenda(item, params.produto), 0),
    2
  );
  const margemEstimada = arredondar(receita - custoEstimado, 2);
  const entradasQuantidade = entradas.reduce((total, item) => total + inteiro(item.quantidade), 0);
  const saidasQuantidade = saidas.reduce((total, item) => total + inteiro(item.quantidade), 0);
  const estoqueInicial = Math.max(0, params.estoqueFinal - entradasQuantidade + saidasQuantidade);
  const sellThroughPeriodo = percentual(saidasQuantidade, estoqueInicial + entradasQuantidade);
  const quantidadeCicloBase = params.ciclos.reduce(
    (total, ciclo) => total + ciclo.quantidadeInicial + ciclo.quantidadeEntrada,
    0
  );
  const quantidadeCicloVendida = params.ciclos.reduce(
    (total, ciclo) => total + ciclo.quantidadeVendida,
    0
  );
  const sellThroughAcumulado = percentual(quantidadeCicloVendida, quantidadeCicloBase);
  const diasPeriodo = Math.max(1, diasEntre(params.periodo.periodoInicio, params.periodo.periodoFim));
  const giroEstimado = arredondar((vendasQuantidade / diasPeriodo) * 30, 2);
  const ultimaVenda = vendas.at(-1)?.criadoEm || null;
  const diasSemVenda = ultimaVenda ? diasEntre(ultimaVenda, params.periodo.periodoFim) : diasPeriodo;
  const intencao = montarIntencaoAgregada(
    params.intencaoContagem,
    vendasQuantidade,
    params.estoqueFinal
  );
  const scoreValidacao = calcularScore({
    vendasQuantidade,
    sellThroughAcumulado,
    sellThroughPeriodo,
    giroEstimado,
    margemEstimada,
    estoqueFinal: params.estoqueFinal,
    ciclos: params.ciclos,
    intencao,
  });
  const statusComercial = classificarSnapshot({
    estoqueFinal: params.estoqueFinal,
    vendasQuantidade,
    sellThroughAcumulado,
    sellThroughPeriodo,
    diasSemVenda,
    ciclos: params.ciclos,
    margemEstimada,
    intencao,
  });
  const cicloAtual =
    params.ciclos.findLast((ciclo) => ciclo.status === "ABERTO" || ciclo.status === "AJUSTADO") ||
    params.ciclos.at(-1) ||
    null;
  const recomendacao = recomendarReposicao({
    statusComercial,
    estoqueFinal: params.estoqueFinal,
    vendasQuantidade,
    scoreValidacao,
    margemEstimada,
    cicloAtual,
    ciclos: params.ciclos,
    intencao,
  });

  return {
    produtoId: params.produto.id,
    variacaoId: null,
    tamanhoAnel: params.tamanhoAnel,
    periodoTipo: params.periodo.periodoTipo,
    periodoInicio: params.periodo.periodoInicio,
    periodoFim: params.periodo.periodoFim,
    vendasQuantidade,
    receita,
    custoEstimado,
    margemEstimada,
    estoqueInicial,
    estoqueFinal: params.estoqueFinal,
    entradas: entradasQuantidade,
    saidas: saidasQuantidade,
    sellThroughPeriodo,
    sellThroughAcumulado,
    giroEstimado,
    scoreValidacao,
    statusComercial,
    recomendacao,
    dadosJson: {
      ciclosConsiderados: params.ciclos.length,
      diasPeriodo,
      diasSemVenda,
      ultimaVendaEm: ultimaVenda?.toISOString() || null,
      intencaoComercial: {
        ...intencao,
        vendasQuantidade,
        estoqueFinal: params.estoqueFinal,
        periodoInicio: params.periodo.periodoInicio.toISOString(),
        periodoFim: params.periodo.periodoFim.toISOString(),
      },
      cicloAtual: cicloAtual
        ? {
            status: cicloAtual.status,
            sellThrough: cicloAtual.sellThrough,
            quantidadeVendida: cicloAtual.quantidadeVendida,
            quantidadeAtual: cicloAtual.quantidadeAtual,
          }
        : null,
    } satisfies Prisma.InputJsonObject,
  } satisfies ProdutoSnapshotCalculado;
}

export async function calcularSnapshotsProduto(
  produtoId: string,
  periodo?: PeriodoMetricasProduto
) {
  const produto = await carregarProdutoBase(produtoId);
  if (!produto) return [];

  const movimentos = await carregarMovimentosProduto(produto);
  const grupos = agruparMovimentosPorTamanho(movimentos);
  const ciclos = await reconstruirCiclosProduto(produtoId);
  const periodoFinal = periodoPadrao(periodo);
  const intencaoContagem = await carregarIntencaoProduto(produtoId, periodoFinal);
  const estoquePorTamanho = new Map(
    produto.estoque.map((item) => [
      normalizarTamanhoProduto(item.tamanhoAnel),
      inteiro(item.quantidadeAtual),
    ])
  );

  ciclos.forEach((ciclo) => {
    if (!estoquePorTamanho.has(ciclo.tamanhoAnel)) {
      estoquePorTamanho.set(ciclo.tamanhoAnel, ciclo.quantidadeAtual);
    }
  });

  const snapshotsPorTamanho = Array.from(estoquePorTamanho.entries()).map(
    ([tamanhoAnel, estoqueFinal]) =>
      montarSnapshot({
        produto,
        tamanhoAnel,
        periodo: periodoFinal,
        movimentos: grupos.get(tamanhoAnel) || [],
        ciclos: ciclos.filter((ciclo) => ciclo.tamanhoAnel === tamanhoAnel),
        estoqueFinal,
        intencaoContagem,
      })
  );

  if (snapshotsPorTamanho.length <= 1) {
    return snapshotsPorTamanho;
  }

  const snapshotTodos = montarSnapshot({
    produto,
    tamanhoAnel: TAMANHO_TODOS,
    periodo: periodoFinal,
    movimentos,
    ciclos,
    estoqueFinal: Array.from(estoquePorTamanho.values()).reduce(
      (total, quantidade) => total + quantidade,
      0
    ),
    intencaoContagem,
  });

  return [snapshotTodos, ...snapshotsPorTamanho];
}

export async function calcularSnapshotProduto(
  produtoId: string,
  periodo?: PeriodoMetricasProduto
) {
  const snapshots = await calcularSnapshotsProduto(produtoId, periodo);
  return (
    snapshots.find((snapshot) => snapshot.tamanhoAnel === TAMANHO_TODOS) ||
    snapshots[0] ||
    null
  );
}

export async function calcularScoreValidacaoProduto(produtoId: string) {
  const snapshot = await calcularSnapshotProduto(produtoId);
  return snapshot?.scoreValidacao || 0;
}

export async function classificarProduto(produtoId: string) {
  const snapshot = await calcularSnapshotProduto(produtoId);
  return snapshot?.statusComercial || "NAO_TESTADO";
}

function motivoRecomendacao(
  recomendacao: RecomendacaoReposicaoProduto,
  intencao: ProdutoIntencaoAgregada
) {
  const motivos: Record<RecomendacaoReposicaoProduto, string> = {
    NAO_REPOR: "Historico ainda nao justifica nova compra.",
    EXPOR_MAIS: "Produto precisa de mais exposicao antes de decidir lote.",
    REVISAR_OFERTA:
      "Produto tem sinal de interesse sem conversao suficiente; revisar preco, fotos, descricao, frete ou oferta antes de recomprar.",
    OBSERVAR: "Produto tem sinal inicial, mas ainda pede leitura cautelosa.",
    REPOR_PEQUENO: "Venda validou o primeiro ciclo; recomprar pequeno.",
    REPOR_LOTE_MEDIO: "Reposicao anterior voltou a vender; lote medio e defensavel.",
    REPOR_LOTE_GRANDE: "Ciclos fortes e recorrentes indicam prioridade de compra.",
    LIQUIDAR_COM_CUIDADO: "Produto parado; melhor girar estoque antes de recomprar.",
  };

  if (intencao.eventosTotal <= 0) return motivos[recomendacao];

  return `${motivos[recomendacao]} Sinais do periodo: ${intencao.visualizacoes} views, ${intencao.favoritos} favorito(s), ${intencao.adicoesCarrinho} carrinho(s), ${intencao.taxaConversao}% conversao. ${intencao.interpretacao}`;
}

function sugestaoQuantidade(recomendacao: RecomendacaoReposicaoProduto) {
  const sugestoes: Record<RecomendacaoReposicaoProduto, number> = {
    NAO_REPOR: 0,
    EXPOR_MAIS: 0,
    REVISAR_OFERTA: 0,
    OBSERVAR: 1,
    REPOR_PEQUENO: 2,
    REPOR_LOTE_MEDIO: 5,
    REPOR_LOTE_GRANDE: 8,
    LIQUIDAR_COM_CUIDADO: 0,
  };

  return sugestoes[recomendacao];
}

export async function gerarRecomendacaoReposicao(
  produtoId: string,
  options: { tamanhoAnel?: string | null } = {}
): Promise<RecomendacaoReposicaoCalculada> {
  const [snapshots, ciclos] = await Promise.all([
    calcularSnapshotsProduto(produtoId),
    reconstruirCiclosProduto(produtoId),
  ]);
  const tamanho = options.tamanhoAnel
    ? normalizarTamanhoProduto(options.tamanhoAnel)
    : TAMANHO_TODOS;
  const snapshot =
    snapshots.find((item) => item.tamanhoAnel === tamanho) ||
    snapshots.find((item) => item.tamanhoAnel === TAMANHO_TODOS) ||
    snapshots[0] ||
    null;
  const ciclosFiltrados =
    tamanho === TAMANHO_TODOS
      ? ciclos
      : ciclos.filter((ciclo) => ciclo.tamanhoAnel === tamanho);
  const cicloAtual =
    ciclosFiltrados.findLast((ciclo) => ciclo.status === "ABERTO" || ciclo.status === "AJUSTADO") ||
    ciclosFiltrados.at(-1) ||
    null;
  const recomendacao = snapshot?.recomendacao || "EXPOR_MAIS";
  const intencao = snapshot
    ? extrairIntencaoSnapshot(snapshot.dadosJson)
    : intencaoVazia();
  const confianca = snapshot
    ? Math.max(20, Math.min(100, arredondar(snapshot.scoreValidacao, 1)))
    : 20;

  return {
    recomendacao,
    statusComercial: snapshot?.statusComercial || "NAO_TESTADO",
    confianca,
    motivo: motivoRecomendacao(recomendacao, intencao),
    sugestaoQuantidade: sugestaoQuantidade(recomendacao),
    cicloAtual,
    sellThrough: snapshot?.sellThroughAcumulado || cicloAtual?.sellThrough || 0,
    scoreValidacao: snapshot?.scoreValidacao || 0,
    intencao,
  };
}

export async function obterInteligenciaProduto(
  produtoId: string
): Promise<InteligenciaProduto> {
  const [resumo, ciclos, recomendacao] = await Promise.all([
    calcularSnapshotProduto(produtoId),
    reconstruirCiclosProduto(produtoId),
    gerarRecomendacaoReposicao(produtoId),
  ]);

  return {
    resumo,
    ciclos,
    recomendacao,
  };
}

export async function salvarSnapshotsProduto(
  produtoId: string,
  periodo?: PeriodoMetricasProduto,
  options: { reconstruirCiclos?: boolean } = {}
) {
  const snapshots = await calcularSnapshotsProduto(produtoId, periodo);

  if (options.reconstruirCiclos) {
    await reconstruirCiclosProduto(produtoId, { persistir: true });
  }

  if (snapshots.length === 0) return snapshots;

  const primeiro = snapshots[0];
  await prisma.produtoMetricaSnapshot.deleteMany({
    where:
      primeiro.periodoTipo === PERIODO_ATUAL_PADRAO
        ? {
            produtoId,
            periodoTipo: primeiro.periodoTipo,
          }
        : {
            produtoId,
            periodoTipo: primeiro.periodoTipo,
            periodoInicio: primeiro.periodoInicio,
            periodoFim: primeiro.periodoFim,
          },
  });

  await prisma.produtoMetricaSnapshot.createMany({
    data: snapshots.map((snapshot) => ({
      produtoId: snapshot.produtoId,
      variacaoId: snapshot.variacaoId,
      tamanhoAnel: snapshot.tamanhoAnel,
      periodoTipo: snapshot.periodoTipo,
      periodoInicio: snapshot.periodoInicio,
      periodoFim: snapshot.periodoFim,
      vendasQuantidade: snapshot.vendasQuantidade,
      receita: snapshot.receita,
      custoEstimado: snapshot.custoEstimado,
      margemEstimada: snapshot.margemEstimada,
      estoqueInicial: snapshot.estoqueInicial,
      estoqueFinal: snapshot.estoqueFinal,
      entradas: snapshot.entradas,
      saidas: snapshot.saidas,
      sellThroughPeriodo: snapshot.sellThroughPeriodo,
      sellThroughAcumulado: snapshot.sellThroughAcumulado,
      giroEstimado: snapshot.giroEstimado,
      scoreValidacao: snapshot.scoreValidacao,
      statusComercial: snapshot.statusComercial,
      recomendacao: snapshot.recomendacao,
      dadosJson: snapshot.dadosJson,
    })),
  });

  return snapshots;
}
