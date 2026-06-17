import "server-only";

import type {
  Prisma,
  RecomendacaoGerencial,
  RecomendacaoGerencialImpacto,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calcularResultadoMensal,
  mesAnoAtual,
  montarCentralFinanceira,
} from "@/lib/financeiro/resultado";
import { extrairIntencaoSnapshot } from "@/lib/produtos/metricas-produto";

export const IMPACTO_RECOMENDACAO_STATUS = [
  "POSITIVO",
  "PARCIAL",
  "NEUTRO",
  "NEGATIVO",
  "INCONCLUSIVO",
  "AGUARDANDO_DADOS",
] as const;

export type ImpactoRecomendacaoStatus =
  (typeof IMPACTO_RECOMENDACAO_STATUS)[number];

export type RecomendacaoImpactoSerializada = {
  id: string;
  recomendacaoId: string;
  janelaDias: number;
  statusImpacto: string;
  scoreImpacto: number;
  resumo: string;
  metricasAntesJson: unknown;
  metricasDepoisJson: unknown;
  comparativoJson: unknown;
  proximaAcaoSugerida: string | null;
  avaliadoEm: string;
  criadoEm: string;
  atualizadoEm: string;
};

type MetricasRecomendacao = Record<string, number | string | boolean | null>;

type ComparativoMetrica = {
  antes: number;
  depois: number;
  variacao: number;
  direcao: "MAIOR_MELHOR" | "MENOR_MELHOR";
};

type ComparativoRecomendacao = {
  tipo: string;
  amostra: number;
  diasDecorridos: number;
  confianca: "BAIXA" | "MEDIA" | "ALTA";
  dadosSimulados: boolean;
  metricas: Record<string, ComparativoMetrica>;
};

const STATUS_ELEGIVEIS = ["ACEITA", "EM_EXECUCAO", "CONCLUIDA"];
const STATUS_PEDIDO_INVALIDO = ["CANCELADO", "EXPIRADO", "RECUSADO"];
const STATUS_VENDA_INVALIDO = ["CANCELADA", "NA_LIXEIRA"];
const TIPOS_MARKETING = ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"];
const SIMULATION_MARKER = "[SIMULACAO_2_MESES_STELLA]";
const MS_DIA = 24 * 60 * 60 * 1000;

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function arredondar(value: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function diasEntre(inicio: Date, fim = new Date()) {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / MS_DIA));
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metrica(value: unknown) {
  return arredondar(numero(value), 2);
}

function dataReferenciaRecomendacao(recomendacao: RecomendacaoGerencial) {
  return (
    recomendacao.concluidaEm ||
    recomendacao.iniciadaEm ||
    recomendacao.aceitaEm ||
    recomendacao.criadoEm
  );
}

function inicioJanela(recomendacao: RecomendacaoGerencial, janelaDias: number) {
  const referencia = dataReferenciaRecomendacao(recomendacao);
  const inicio = new Date(referencia);
  inicio.setDate(inicio.getDate() - janelaDias);
  return inicio;
}

function fimJanela(recomendacao: RecomendacaoGerencial, janelaDias: number) {
  const referencia = dataReferenciaRecomendacao(recomendacao);
  const fim = new Date(referencia);
  fim.setDate(fim.getDate() + janelaDias);
  return new Date(Math.min(fim.getTime(), Date.now()));
}

function janelaAtingida(recomendacao: RecomendacaoGerencial, janelaDias: number) {
  return diasEntre(dataReferenciaRecomendacao(recomendacao)) >= janelaDias;
}

function eventoWhereProduto(
  produtoId: string | null,
  inicio: Date,
  fim: Date
): Prisma.EventoComercialWhereInput {
  return {
    ...(produtoId ? { produtoId } : {}),
    criadoEm: {
      gte: inicio,
      lte: fim,
    },
  };
}

async function contarEventosProduto(
  produtoId: string | null,
  inicio: Date,
  fim: Date
) {
  const eventos = await prisma.eventoComercial.groupBy({
    by: ["tipo"],
    where: eventoWhereProduto(produtoId, inicio, fim),
    _count: { _all: true },
  });
  const porTipo = new Map(eventos.map((evento) => [evento.tipo, evento._count._all]));

  return {
    visualizacoes: porTipo.get("PRODUTO_VISUALIZADO") || 0,
    favoritos: porTipo.get("PRODUTO_FAVORITADO") || 0,
    adicoesCarrinho: porTipo.get("PRODUTO_ADICIONADO_CARRINHO") || 0,
    cliquesBusca: porTipo.get("BUSCA_RESULTADO_CLICADO") || 0,
    cliquesVitrine: porTipo.get("VITRINE_EDITORIAL_CLICADA") || 0,
    cliquesBanner: porTipo.get("BANNER_CTA_CLICADO") || 0,
    checkoutsIniciados: porTipo.get("CHECKOUT_INICIADO") || 0,
    eventosTotal: eventos.reduce((total, item) => total + item._count._all, 0),
  };
}

async function vendasProduto(
  produtoId: string | null,
  inicio: Date,
  fim: Date
) {
  if (!produtoId) return { vendas: 0, receita: 0, margem: 0 };

  const [vendasInternas, pedidosOnline] = await Promise.all([
    prisma.vendaItem.aggregate({
      where: {
        produtoId,
        venda: {
          status: { notIn: STATUS_VENDA_INVALIDO },
          criadoEm: { gte: inicio, lte: fim },
        },
      },
      _sum: {
        quantidade: true,
        valorTotal: true,
        lucroTotal: true,
      },
    }),
    prisma.pedidoOnlineItem.aggregate({
      where: {
        produtoId,
        pedidoOnline: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          status: { notIn: STATUS_PEDIDO_INVALIDO },
          pagoEm: { gte: inicio, lte: fim },
        },
      },
      _sum: {
        quantidade: true,
        total: true,
      },
    }),
  ]);

  return {
    vendas:
      numero(vendasInternas._sum.quantidade) +
      numero(pedidosOnline._sum.quantidade),
    receita:
      numero(vendasInternas._sum.valorTotal) + numero(pedidosOnline._sum.total),
    margem: numero(vendasInternas._sum.lucroTotal),
  };
}

async function capturarMetricasProduto(
  recomendacao: RecomendacaoGerencial,
  inicio: Date,
  fim: Date
): Promise<MetricasRecomendacao> {
  const [eventos, vendas, produto, snapshot] = await Promise.all([
    contarEventosProduto(recomendacao.produtoId, inicio, fim),
    vendasProduto(recomendacao.produtoId, inicio, fim),
    recomendacao.produtoId
      ? prisma.produto.findUnique({
          where: { id: recomendacao.produtoId },
          select: {
            estoque: { select: { quantidadeAtual: true } },
          },
        })
      : Promise.resolve(null),
    recomendacao.produtoId
      ? prisma.produtoMetricaSnapshot.findFirst({
          where: {
            produtoId: recomendacao.produtoId,
            periodoTipo: "ATUAL",
          },
          orderBy: [{ tamanhoAnel: "asc" }, { criadoEm: "desc" }],
        })
      : Promise.resolve(null),
  ]);
  const intencao = extrairIntencaoSnapshot(snapshot?.dadosJson);
  const estoqueAtual =
    produto?.estoque.reduce(
      (total, item) => total + numero(item.quantidadeAtual),
      0
    ) || numero(snapshot?.estoqueFinal);

  return {
    ...eventos,
    vendas: vendas.vendas,
    receita: vendas.receita,
    margem: vendas.margem || numero(snapshot?.margemEstimada),
    sellThrough: numero(snapshot?.sellThroughAcumulado),
    estoqueAtual,
    scoreInteresse: intencao.scoreInteresse,
    scoreConversao: intencao.scoreConversao,
    taxaConversao: intencao.taxaConversao,
    statusComercial: snapshot?.statusComercial || null,
    amostra: eventos.eventosTotal + vendas.vendas * 3,
  };
}

async function capturarMetricasIntencao(
  recomendacao: RecomendacaoGerencial,
  inicio: Date,
  fim: Date
): Promise<MetricasRecomendacao> {
  const [eventos, buscasSemResultado, buscas, cliquesBusca] = await Promise.all([
    contarEventosProduto(recomendacao.produtoId, inicio, fim),
    prisma.eventoComercial.count({
      where: {
        tipo: "BUSCA_SEM_RESULTADO",
        ...(recomendacao.origemId && !recomendacao.produtoId
          ? { termoBusca: { contains: recomendacao.origemId, mode: "insensitive" } }
          : {}),
        criadoEm: { gte: inicio, lte: fim },
      },
    }),
    prisma.eventoComercial.count({
      where: {
        tipo: "BUSCA_REALIZADA",
        criadoEm: { gte: inicio, lte: fim },
      },
    }),
    prisma.eventoComercial.count({
      where: {
        tipo: "BUSCA_RESULTADO_CLICADO",
        criadoEm: { gte: inicio, lte: fim },
      },
    }),
  ]);
  const vendas = await vendasProduto(recomendacao.produtoId, inicio, fim);

  return {
    ...eventos,
    buscasSemResultado,
    buscas,
    cliquesResultadoBusca: cliquesBusca,
    vendas: vendas.vendas,
    receita: vendas.receita,
    amostra: eventos.eventosTotal + buscas + cliquesBusca + vendas.vendas * 3,
  };
}

async function capturarMetricasFinanceiras(): Promise<MetricasRecomendacao> {
  const atual = mesAnoAtual();
  const [central, resultado, marketing] = await Promise.all([
    montarCentralFinanceira(atual.mes, atual.ano),
    calcularResultadoMensal(atual.mes, atual.ano),
    prisma.lancamentoFinanceiro.aggregate({
      where: {
        status: { not: "NA_LIXEIRA" },
        statusPagamento: "PAGO",
        tipo: { in: TIPOS_MARKETING },
      },
      _sum: { valorReal: true },
    }),
  ]);
  const gastosPendentes = central.previsao.gastosPendentes;
  const gastosBase = Math.max(resultado.gastosOperacionais, 1);
  const runway = gastosBase > 0 ? central.saldoGerencial / gastosBase : 99;
  const marketingValor = numero(marketing._sum.valorReal);
  const marketingPct =
    resultado.receitaRecebida > 0
      ? (marketingValor / resultado.receitaRecebida) * 100
      : 0;

  return {
    caixaDisponivel: central.saldoGerencial,
    runway,
    gastosPendentes,
    despesasPagas: resultado.gastosOperacionais,
    margemLiquida:
      resultado.receitaRecebida > 0
        ? arredondar((resultado.lucroApuravel / resultado.receitaRecebida) * 100)
        : 0,
    lucroOperacional: resultado.lucroApuravel,
    marketingValor,
    marketingPct,
    comprasPendentes: central.comprasPendentes.length,
    proLaborePendente: central.previsao.proLaborePendente,
    amostra:
      resultado.fontes.vendasInternas +
      resultado.fontes.pedidosOnlinePagos +
      resultado.fontes.gastosPagos,
  };
}

function baseFromEvidencias(recomendacao: RecomendacaoGerencial) {
  const evidencias = jsonRecord(recomendacao.evidenciasJson);
  const map: Record<string, string[]> = {
    visualizacoes: ["visualizacoes", "views"],
    favoritos: ["favoritos"],
    adicoesCarrinho: ["adicoesCarrinho", "carrinhos"],
    vendas: ["vendas", "vendasQuantidade"],
    sellThrough: ["sellThrough", "sellThroughAcumulado"],
    estoqueAtual: ["estoqueAtual", "estoqueFinal"],
    scoreInteresse: ["scoreInteresse"],
    scoreConversao: ["scoreConversao"],
    taxaConversao: ["taxaConversao"],
    margem: ["margem", "margemEstimada"],
    caixaDisponivel: ["caixaDisponivel", "caixa", "saldoGerencial"],
    runway: ["runway", "runwayMeses"],
    gastosPendentes: ["gastosPendentes"],
    despesasPagas: ["despesasPagas", "gastosOperacionais"],
    margemLiquida: ["margemLiquida", "margemLiquidaPct"],
    lucroOperacional: ["lucroOperacional", "lucroApuravel", "lucroAtual"],
    marketingValor: ["marketingValor"],
    marketingPct: ["marketingPct", "marketingPercentual"],
    comprasPendentes: ["comprasPendentes"],
    proLaborePendente: ["proLaborePendente", "pendente"],
    buscasSemResultado: ["quantidade", "buscasSemResultado"],
  };
  const base: MetricasRecomendacao = {};

  Object.entries(map).forEach(([destino, chaves]) => {
    const chave = chaves.find((item) => evidencias[item] !== undefined);
    if (chave) base[destino] = metrica(evidencias[chave]);
  });

  base.amostra = metrica(evidencias.amostra || evidencias.eventosTotal || 0);
  base.dadosSimulados =
    JSON.stringify(evidencias).includes(SIMULATION_MARKER) ||
    Boolean(evidencias.simulado || evidencias.dadosSimulados);

  return base;
}

export async function capturarMetricasBaseRecomendacao(
  recomendacao: RecomendacaoGerencial
) {
  const evidencias = baseFromEvidencias(recomendacao);

  if (Object.keys(evidencias).some((key) => key !== "dadosSimulados")) {
    return evidencias;
  }

  const inicio = inicioJanela(recomendacao, 14);
  const fim = dataReferenciaRecomendacao(recomendacao);

  if (["FINANCEIRO", "CAIXA", "PRO_LABORE", "MARKETING", "CRESCIMENTO"].includes(recomendacao.tipo)) {
    return capturarMetricasFinanceiras();
  }

  if (["LOJA"].includes(recomendacao.tipo)) {
    return capturarMetricasIntencao(recomendacao, inicio, fim);
  }

  return capturarMetricasProduto(recomendacao, inicio, fim);
}

export async function capturarMetricasAtuaisRecomendacao(
  recomendacao: RecomendacaoGerencial,
  janelaDias = 14
) {
  const inicio = dataReferenciaRecomendacao(recomendacao);
  const fim = fimJanela(recomendacao, janelaDias);

  if (["FINANCEIRO", "CAIXA", "PRO_LABORE", "MARKETING", "CRESCIMENTO"].includes(recomendacao.tipo)) {
    return capturarMetricasFinanceiras();
  }

  if (["LOJA"].includes(recomendacao.tipo)) {
    return capturarMetricasIntencao(recomendacao, inicio, fim);
  }

  return capturarMetricasProduto(recomendacao, inicio, fim);
}

function direcaoMetrica(tipo: string, metricaNome: string) {
  if (tipo === "MARKETING" && metricaNome === "marketingPct") return "MENOR_MELHOR";
  if (["gastosPendentes", "despesasPagas", "comprasPendentes", "proLaborePendente"].includes(metricaNome)) {
    return "MENOR_MELHOR";
  }
  if (tipo === "ESTOQUE" && metricaNome === "estoqueAtual") return "MENOR_MELHOR";
  return "MAIOR_MELHOR";
}

function metricasPrincipais(tipo: string) {
  if (["REPOSICAO", "ESTOQUE", "PRECIFICACAO"].includes(tipo)) {
    return ["vendas", "sellThrough", "scoreInteresse", "scoreConversao", "estoqueAtual", "margem"];
  }
  if (tipo === "LOJA") {
    return ["visualizacoes", "favoritos", "adicoesCarrinho", "cliquesResultadoBusca", "buscasSemResultado", "vendas"];
  }
  if (tipo === "MARKETING") {
    return ["marketingPct", "vendas", "scoreInteresse", "lucroOperacional"];
  }
  if (tipo === "PRO_LABORE") {
    return ["caixaDisponivel", "lucroOperacional", "runway", "proLaborePendente"];
  }
  return ["caixaDisponivel", "runway", "gastosPendentes", "lucroOperacional", "margemLiquida", "comprasPendentes"];
}

export function compararMetricasRecomendacao({
  recomendacao,
  antes,
  depois,
  diasDecorridos,
}: {
  recomendacao: RecomendacaoGerencial;
  antes: MetricasRecomendacao;
  depois: MetricasRecomendacao;
  diasDecorridos: number;
}): ComparativoRecomendacao {
  const metricas: Record<string, ComparativoMetrica> = {};

  metricasPrincipais(recomendacao.tipo).forEach((nome) => {
    if (antes[nome] === undefined && depois[nome] === undefined) return;

    const before = metrica(antes[nome]);
    const after = metrica(depois[nome]);
    metricas[nome] = {
      antes: before,
      depois: after,
      variacao: arredondar(after - before, 2),
      direcao: direcaoMetrica(recomendacao.tipo, nome),
    };
  });

  const amostra = metrica(depois.amostra) + metrica(antes.amostra);
  const dadosSimulados = Boolean(antes.dadosSimulados || depois.dadosSimulados);

  return {
    tipo: recomendacao.tipo,
    amostra,
    diasDecorridos,
    confianca: amostra >= 30 ? "ALTA" : amostra >= 8 ? "MEDIA" : "BAIXA",
    dadosSimulados,
    metricas,
  };
}

function scoreMetrica(item: ComparativoMetrica) {
  const base = Math.max(Math.abs(item.antes), 1);
  const variacaoPct = (item.variacao / base) * 100;
  const ajustada =
    item.direcao === "MAIOR_MELHOR" ? variacaoPct : variacaoPct * -1;

  return clamp(ajustada, -35, 35);
}

function calcularScoreImpacto(comparativo: ComparativoRecomendacao) {
  const valores = Object.values(comparativo.metricas);
  if (valores.length === 0) return 0;

  let score = valores.reduce((total, item) => total + scoreMetrica(item), 0);
  score = score / Math.max(1, valores.length);

  if (comparativo.confianca === "BAIXA") score *= 0.45;
  if (comparativo.confianca === "MEDIA") score *= 0.75;
  if (comparativo.dadosSimulados) score *= 0.6;

  return Math.round(clamp(score * 2, -100, 100));
}

function statusPorScore(
  score: number,
  comparativo: ComparativoRecomendacao,
  janelaCompleta: boolean
): ImpactoRecomendacaoStatus {
  if (!janelaCompleta) return "AGUARDANDO_DADOS";
  if (comparativo.amostra < 3) return "INCONCLUSIVO";
  if (comparativo.confianca === "BAIXA") return "INCONCLUSIVO";
  if (score >= 70) return "POSITIVO";
  if (score >= 25) return "PARCIAL";
  if (score <= -25) return "NEGATIVO";
  return "NEUTRO";
}

export function formatarResumoImpacto({
  status,
  score,
  comparativo,
}: {
  status: ImpactoRecomendacaoStatus;
  score: number;
  comparativo: ComparativoRecomendacao;
}) {
  const cautela = comparativo.dadosSimulados
    ? " Leitura cautelosa: ha dados simulados na base."
    : "";

  if (status === "AGUARDANDO_DADOS") {
    return `Ainda e cedo para concluir; a janela analisada nao terminou.${cautela}`;
  }
  if (status === "INCONCLUSIVO") {
    return `A amostra ainda e pequena para declarar impacto com seguranca.${cautela}`;
  }
  if (status === "POSITIVO") {
    return `Impacto positivo claro, com score ${score}. A metrica principal melhorou de forma consistente.${cautela}`;
  }
  if (status === "PARCIAL") {
    return `Impacto parcial, com score ${score}. Houve melhora em parte dos sinais, mas ainda pede acompanhamento.${cautela}`;
  }
  if (status === "NEGATIVO") {
    return `Impacto negativo, com score ${score}. O indicador principal piorou ou o risco aumentou.${cautela}`;
  }

  return `Impacto neutro, com score ${score}. Houve pouca mudanca relevante no periodo.${cautela}`;
}

function proximaAcao(status: ImpactoRecomendacaoStatus, tipo: string) {
  if (status === "AGUARDANDO_DADOS") return "Reavaliar ao fim da janela definida.";
  if (status === "INCONCLUSIVO") return "Aumentar amostra antes de decidir escalar ou descartar.";
  if (status === "POSITIVO") return "Manter a decisao e considerar repetir em casos semelhantes.";
  if (status === "PARCIAL" && ["LOJA", "ESTOQUE", "REPOSICAO"].includes(tipo)) {
    return "Revisar foto, preco, oferta ou exposicao antes de nova compra.";
  }
  if (status === "NEGATIVO") return "Interromper a acao, revisar premissa e proteger caixa/margem.";
  return "Acompanhar sem escalar investimento por enquanto.";
}

export async function avaliarImpactoRecomendacao({
  recomendacaoId,
  janelaDias = 14,
}: {
  recomendacaoId: string;
  janelaDias?: number;
}) {
  const recomendacao = await prisma.recomendacaoGerencial.findUnique({
    where: { id: recomendacaoId },
  });

  if (!recomendacao) {
    throw new Error("Recomendacao gerencial nao encontrada.");
  }

  const janela = [7, 14, 30].includes(janelaDias) ? janelaDias : 14;
  const antes = await capturarMetricasBaseRecomendacao(recomendacao);
  const depois = await capturarMetricasAtuaisRecomendacao(recomendacao, janela);
  const diasDecorridos = diasEntre(dataReferenciaRecomendacao(recomendacao));
  const comparativo = compararMetricasRecomendacao({
    recomendacao,
    antes,
    depois,
    diasDecorridos,
  });
  const score = calcularScoreImpacto(comparativo);
  const status = statusPorScore(score, comparativo, janelaAtingida(recomendacao, janela));
  const resumo = formatarResumoImpacto({ status, score, comparativo });
  const proximaAcaoSugerida = proximaAcao(status, recomendacao.tipo);

  const impacto = await prisma.recomendacaoGerencialImpacto.upsert({
    where: {
      recomendacaoId_janelaDias: {
        recomendacaoId: recomendacao.id,
        janelaDias: janela,
      },
    },
    create: {
      recomendacaoId: recomendacao.id,
      janelaDias: janela,
      statusImpacto: status,
      scoreImpacto: score,
      resumo,
      metricasAntesJson: antes as Prisma.InputJsonObject,
      metricasDepoisJson: depois as Prisma.InputJsonObject,
      comparativoJson: comparativo as unknown as Prisma.InputJsonObject,
      proximaAcaoSugerida,
    },
    update: {
      statusImpacto: status,
      scoreImpacto: score,
      resumo,
      metricasAntesJson: antes as Prisma.InputJsonObject,
      metricasDepoisJson: depois as Prisma.InputJsonObject,
      comparativoJson: comparativo as unknown as Prisma.InputJsonObject,
      proximaAcaoSugerida,
      avaliadoEm: new Date(),
    },
  });

  return impacto;
}

export async function avaliarImpactoRecomendacoes({
  janelaDias = 14,
  status = STATUS_ELEGIVEIS,
  take = 50,
}: {
  janelaDias?: number;
  status?: string[];
  take?: number;
} = {}) {
  const recomendacoes = await prisma.recomendacaoGerencial.findMany({
    where: {
      status: { in: status },
    },
    orderBy: [{ atualizadoEm: "desc" }],
    take: Math.min(Math.max(take, 1), 200),
  });
  const impactos: RecomendacaoGerencialImpacto[] = [];

  for (const recomendacao of recomendacoes) {
    impactos.push(
      await avaliarImpactoRecomendacao({
        recomendacaoId: recomendacao.id,
        janelaDias,
      })
    );
  }

  return {
    avaliadas: impactos.length,
    impactos,
    porStatus: impactos.reduce<Record<string, number>>((acc, impacto) => {
      acc[impacto.statusImpacto] = (acc[impacto.statusImpacto] || 0) + 1;
      return acc;
    }, {}),
  };
}

export async function listarImpactosRecomendacoes({
  status,
  tipo,
  recomendacaoId,
  janelaDias,
  take = 100,
}: {
  status?: string;
  tipo?: string;
  recomendacaoId?: string;
  janelaDias?: number;
  take?: number;
} = {}) {
  return prisma.recomendacaoGerencialImpacto.findMany({
    where: {
      ...(status ? { statusImpacto: status } : {}),
      ...(janelaDias ? { janelaDias } : {}),
      ...(recomendacaoId ? { recomendacaoId } : {}),
      ...(tipo
        ? {
            recomendacao: {
              tipo,
            },
          }
        : {}),
    },
    include: {
      recomendacao: true,
    },
    orderBy: [{ avaliadoEm: "desc" }],
    take: Math.min(Math.max(take, 1), 200),
  });
}

export function serializarImpactoRecomendacao(
  impacto: RecomendacaoGerencialImpacto
): RecomendacaoImpactoSerializada {
  return {
    ...impacto,
    avaliadoEm: impacto.avaliadoEm.toISOString(),
    criadoEm: impacto.criadoEm.toISOString(),
    atualizadoEm: impacto.atualizadoEm.toISOString(),
  };
}
