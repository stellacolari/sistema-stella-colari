import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM_VALUE = "AVALIAR_IMPACTO_RECOMENDACOES";
const STATUS_ELEGIVEIS = ["ACEITA", "EM_EXECUCAO", "CONCLUIDA"];
const MS_DIA = 24 * 60 * 60 * 1000;

function parseArgs(argv) {
  const args = {
    janela: 14,
    confirm: "",
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg.startsWith("--janela=")) {
      const parsed = Number(stripQuotes(arg.slice("--janela=".length)));
      args.janela = [7, 14, 30].includes(parsed) ? parsed : 14;
    } else if (arg.startsWith("--confirm=")) {
      args.confirm = stripQuotes(arg.slice("--confirm=".length));
    }
  }

  return args;
}

function stripQuotes(value) {
  const text = String(value ?? "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function num(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((num(value) + Number.EPSILON) * fator) / fator;
}

function diasDesde(date) {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / MS_DIA));
}

function referencia(recomendacao) {
  return (
    recomendacao.concluidaEm ||
    recomendacao.iniciadaEm ||
    recomendacao.aceitaEm ||
    recomendacao.criadoEm
  );
}

function baseFromEvidencias(recomendacao) {
  const evidencias =
    recomendacao.evidenciasJson &&
    typeof recomendacao.evidenciasJson === "object" &&
    !Array.isArray(recomendacao.evidenciasJson)
      ? recomendacao.evidenciasJson
      : {};

  return {
    visualizacoes: num(evidencias.visualizacoes),
    favoritos: num(evidencias.favoritos),
    adicoesCarrinho: num(evidencias.adicoesCarrinho || evidencias.carrinhos),
    vendas: num(evidencias.vendas || evidencias.vendasQuantidade),
    estoqueAtual: num(evidencias.estoqueAtual || evidencias.estoqueFinal),
    scoreInteresse: num(evidencias.scoreInteresse),
    caixaDisponivel: num(evidencias.caixaDisponivel || evidencias.caixa),
    runway: num(evidencias.runway || evidencias.runwayMeses),
    gastosPendentes: num(evidencias.gastosPendentes),
    marketingPct: num(evidencias.marketingPct || evidencias.marketingPercentual),
    amostra: num(evidencias.amostra || evidencias.eventosTotal),
  };
}

async function eventosProduto(produtoId, inicio, fim) {
  if (!produtoId) return {};

  const eventos = await prisma.eventoComercial.groupBy({
    by: ["tipo"],
    where: {
      produtoId,
      criadoEm: { gte: inicio, lte: fim },
    },
    _count: { _all: true },
  });
  const map = new Map(eventos.map((evento) => [evento.tipo, evento._count._all]));

  return {
    visualizacoes: map.get("PRODUTO_VISUALIZADO") || 0,
    favoritos: map.get("PRODUTO_FAVORITADO") || 0,
    adicoesCarrinho: map.get("PRODUTO_ADICIONADO_CARRINHO") || 0,
    cliquesBusca: map.get("BUSCA_RESULTADO_CLICADO") || 0,
    eventosTotal: eventos.reduce((total, evento) => total + evento._count._all, 0),
  };
}

async function vendasProduto(produtoId, inicio, fim) {
  if (!produtoId) return { vendas: 0, receita: 0 };

  const [venda, pedido] = await Promise.all([
    prisma.vendaItem.aggregate({
      where: {
        produtoId,
        venda: {
          status: { notIn: ["CANCELADA", "NA_LIXEIRA"] },
          criadoEm: { gte: inicio, lte: fim },
        },
      },
      _sum: { quantidade: true, valorTotal: true },
    }),
    prisma.pedidoOnlineItem.aggregate({
      where: {
        produtoId,
        pedidoOnline: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          status: { notIn: ["CANCELADO", "EXPIRADO", "RECUSADO"] },
          pagoEm: { gte: inicio, lte: fim },
        },
      },
      _sum: { quantidade: true, total: true },
    }),
  ]);

  return {
    vendas: num(venda._sum.quantidade) + num(pedido._sum.quantidade),
    receita: num(venda._sum.valorTotal) + num(pedido._sum.total),
  };
}

async function metricasAtuais(recomendacao, janela) {
  const inicio = new Date(referencia(recomendacao));
  const fimPlanejado = new Date(inicio);
  fimPlanejado.setDate(fimPlanejado.getDate() + janela);
  const fim = new Date(Math.min(Date.now(), fimPlanejado.getTime()));

  if (["FINANCEIRO", "CAIXA", "PRO_LABORE", "MARKETING", "CRESCIMENTO"].includes(recomendacao.tipo)) {
    const [contas, gastosPendentes, marketing, receita] = await Promise.all([
      prisma.contaFinanceira.findMany({ where: { ativo: true } }),
      prisma.lancamentoFinanceiro.aggregate({
        where: { status: { not: "NA_LIXEIRA" }, statusPagamento: { in: ["PENDENTE", "VENCIDO"] } },
        _sum: { valorReal: true },
      }),
      prisma.lancamentoFinanceiro.aggregate({
        where: { status: { not: "NA_LIXEIRA" }, statusPagamento: "PAGO", tipo: { in: ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"] } },
        _sum: { valorReal: true },
      }),
      prisma.venda.aggregate({
        where: { status: { notIn: ["CANCELADA", "NA_LIXEIRA"] } },
        _sum: { valorTotal: true, lucroTotal: true },
      }),
    ]);
    const caixaDisponivel = contas.reduce((total, conta) => total + num(conta.saldoInicial), 0);
    const receitaTotal = num(receita._sum.valorTotal);

    return {
      caixaDisponivel,
      gastosPendentes: num(gastosPendentes._sum.valorReal),
      lucroOperacional: num(receita._sum.lucroTotal),
      marketingPct: receitaTotal > 0 ? round((num(marketing._sum.valorReal) / receitaTotal) * 100) : 0,
      amostra: receitaTotal > 0 ? 10 : 0,
    };
  }

  const [eventos, vendas, produto] = await Promise.all([
    eventosProduto(recomendacao.produtoId, inicio, fim),
    vendasProduto(recomendacao.produtoId, inicio, fim),
    recomendacao.produtoId
      ? prisma.produto.findUnique({
          where: { id: recomendacao.produtoId },
          select: { estoque: { select: { quantidadeAtual: true } } },
        })
      : Promise.resolve(null),
  ]);

  return {
    ...eventos,
    ...vendas,
    estoqueAtual:
      produto?.estoque.reduce((total, estoque) => total + num(estoque.quantidadeAtual), 0) || 0,
    amostra: num(eventos.eventosTotal) + vendas.vendas * 3,
  };
}

function direcao(tipo, key) {
  if (tipo === "MARKETING" && key === "marketingPct") return -1;
  if (["gastosPendentes", "estoqueAtual"].includes(key)) return -1;
  return 1;
}

function scoreImpacto(tipo, antes, depois) {
  const keys = Object.keys(depois).filter((key) => key !== "amostra");
  if (!keys.length) return 0;
  const score = keys.reduce((total, key) => {
    const before = num(antes[key]);
    const after = num(depois[key]);
    const base = Math.max(Math.abs(before), 1);
    return total + (((after - before) / base) * 100 * direcao(tipo, key));
  }, 0) / keys.length;

  return Math.round(Math.max(-100, Math.min(100, score)));
}

function statusImpacto(score, amostra, janelaCompleta) {
  if (!janelaCompleta) return "AGUARDANDO_DADOS";
  if (amostra < 3) return "INCONCLUSIVO";
  if (score >= 70) return "POSITIVO";
  if (score >= 25) return "PARCIAL";
  if (score <= -25) return "NEGATIVO";
  return "NEUTRO";
}

function resumo(status, score) {
  if (status === "AGUARDANDO_DADOS") return "Ainda e cedo para concluir; a janela nao terminou.";
  if (status === "INCONCLUSIVO") return "Amostra pequena para declarar impacto com seguranca.";
  if (status === "POSITIVO") return `Impacto positivo claro, score ${score}.`;
  if (status === "PARCIAL") return `Impacto parcial, score ${score}.`;
  if (status === "NEGATIVO") return `Impacto negativo, score ${score}.`;
  return `Impacto neutro, score ${score}.`;
}

async function avaliar(recomendacao, janela) {
  const antes = baseFromEvidencias(recomendacao);
  const depois = await metricasAtuais(recomendacao, janela);
  const score = scoreImpacto(recomendacao.tipo, antes, depois);
  const status = statusImpacto(
    score,
    num(antes.amostra) + num(depois.amostra),
    diasDesde(referencia(recomendacao)) >= janela,
  );
  const comparativo = {
    tipo: recomendacao.tipo,
    amostra: num(antes.amostra) + num(depois.amostra),
    diasDecorridos: diasDesde(referencia(recomendacao)),
  };

  return prisma.recomendacaoGerencialImpacto.upsert({
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
      resumo: resumo(status, score),
      metricasAntesJson: antes,
      metricasDepoisJson: depois,
      comparativoJson: comparativo,
      proximaAcaoSugerida:
        status === "NEGATIVO"
          ? "Revisar premissa antes de repetir."
          : "Acompanhar e reavaliar na proxima janela.",
    },
    update: {
      statusImpacto: status,
      scoreImpacto: score,
      resumo: resumo(status, score),
      metricasAntesJson: antes,
      metricasDepoisJson: depois,
      comparativoJson: comparativo,
      proximaAcaoSugerida:
        status === "NEGATIVO"
          ? "Revisar premissa antes de repetir."
          : "Acompanhar e reavaliar na proxima janela.",
      avaliadoEm: new Date(),
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.confirm !== CONFIRM_VALUE) {
    throw new Error(`Use --confirm=${CONFIRM_VALUE} para avaliar impactos.`);
  }

  const recomendacoes = await prisma.recomendacaoGerencial.findMany({
    where: { status: { in: STATUS_ELEGIVEIS } },
    orderBy: { atualizadoEm: "desc" },
    take: 100,
  });
  const impactos = [];

  for (const recomendacao of recomendacoes) {
    impactos.push(await avaliar(recomendacao, args.janela));
  }

  const result = {
    ok: true,
    janelaDias: args.janela,
    avaliadas: impactos.length,
    porStatus: impactos.reduce((acc, impacto) => {
      acc[impacto.statusImpacto] = (acc[impacto.statusImpacto] || 0) + 1;
      return acc;
    }, {}),
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Impactos avaliados: ${result.avaliadas}`);
    console.log(`Janela: ${result.janelaDias} dias`);
    console.log(result.porStatus);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
