import "server-only";

import { prisma } from "@/lib/prisma";
import {
  calcularResultadoMensal,
  mesAnoAtual,
  montarCentralFinanceira,
  periodoFinanceiro,
} from "@/lib/financeiro/resultado";
import {
  extrairIntencaoSnapshot,
  type ProdutoIntencaoAgregada,
} from "@/lib/produtos/metricas-produto";

export const FASES_EMPRESA = [
  "PRE_OPERACAO",
  "VALIDACAO_INICIAL",
  "PRIMEIRA_TRACAO",
  "GIRO_COMPROVADO",
  "CRESCIMENTO_SAUDAVEL",
  "ESCALA",
  "PRESSAO_CAIXA",
  "CRISE_DEFESA",
  "ESTOQUE_TRAVADO",
] as const;

export type FaseEmpresa = (typeof FASES_EMPRESA)[number];
export type ConfiancaAnaliseGerencial = "BAIXA" | "MEDIA" | "ALTA";
export type DecisaoLoteProdutoStatus = "BLOQUEADO" | "CAUTELA" | "LIBERADO";

export type FaixaAdaptativa = {
  minimo: number;
  maximo: number;
  label: string;
  recomendacao: string;
};

export type AlocacaoAdaptativa = {
  caixa: number;
  reserva: number;
  reposicao: number;
  marketing: number;
  reinvestimento: number;
  proLabore: number;
  descontosCampanhas: number;
  leitura: string;
};

export type DadosAdaptativos = {
  vendasReaisTotal: number;
  vendasReaisPeriodo: number;
  vendasReaisRecentes: number;
  diasOperacao: number;
  eventosIntencaoRecentes: number;
  eventosIntencaoSnapshots: number;
  produtosAtivos: number;
  produtosTestados: number;
  produtosPoucoTestados: number;
  unidadesEstoqueTotal: number;
  produtosComDadosSimulados: number;
  registrosSimulados: number;
  mesesLucroPositivoRecentes: number;
  mesesReceitaPositivaRecentes: number;
  percentualProdutosTestados: number;
};

export type InteligenciaAdaptativaGerencial = {
  fase: FaseEmpresa;
  faseLabel: string;
  confiancaAnalise: ConfiancaAnaliseGerencial;
  scoreConfianca: number;
  motivo: string;
  motivos: string[];
  dados: DadosAdaptativos;
  metas: {
    marketingPago: FaixaAdaptativa;
    reserva: FaixaAdaptativa;
    proLabore: FaixaAdaptativa;
    reposicao: FaixaAdaptativa;
  };
  distribuicao: AlocacaoAdaptativa;
  riscos: string[];
  acoesPrioritarias: string[];
  margemDesconto: {
    acao: "PROTEGER_MARGEM" | "TESTAR_DESCONTO_CONTROLADO" | "REVER_OFERTA" | "MANTER";
    recomendacao: string;
  };
  leituraDados: string;
};

export type ResumoEstoqueAdaptativo = {
  produtosZerados: number;
  produtosBaixo: number;
  produtosParados: number;
  produtosCampeoesProvaveis: number;
  produtosRiscoRuptura: number;
  produtosEstoqueParadoHistorico: number;
  produtosReposicaoConfirmada: number;
  produtosInteresseSemConversao: number;
  produtosPoucoTestados: number;
  produtosAltoInteresseEstoqueBaixo: number;
};

export type MontarInteligenciaAdaptativaParams = {
  mes: number;
  ano: number;
  receitaRecebida: number;
  lucroApuravel: number;
  margemBrutaPct: number;
  margemLiquidaPct: number;
  gastosOperacionaisPct: number;
  marketingPct: number;
  runwayMeses: number;
  saldoGerencial: number;
  entradasMes: number;
  saidasMes: number;
  gastosPendentes: number;
  gastosVencidos: number;
  comprasPendentesTotal: number;
  comprasPendentesQuantidade: number;
  proLaborePendente: number;
  proLaborePagoMes: number;
  reservaAtual?: number;
  historico: {
    receita: number;
    lucro: number;
    gastos: number;
    marketing: number;
  }[];
  estoque: ResumoEstoqueAdaptativo;
};

export type AvaliarCompraLoteProdutoParams = {
  fase: FaseEmpresa;
  confiancaAnalise: ConfiancaAnaliseGerencial;
  caixaDisponivel?: number;
  statusComercial?: string | null;
  recomendacaoReposicao?: string | null;
  confiancaReposicao?: number | null;
  vendasQuantidade?: number | null;
  estoqueAtual?: number | null;
  sugestaoQuantidade?: number | null;
  custoUnitario?: number | null;
  margemEstimadaPct?: number | null;
  cicloAtual?: {
    quantidadeVendida: number;
    quantidadeInicial: number;
    quantidadeEntrada: number;
    sellThrough: number;
    diasAteEsgotar?: number | null;
  } | null;
  intencao?: Partial<ProdutoIntencaoAgregada> | null;
};

export type DecisaoLoteProduto = {
  decisao: DecisaoLoteProdutoStatus;
  loteGrandeLiberado: boolean;
  sugestao: string;
  sugestaoQuantidade: number;
  motivo: string;
  confianca: ConfiancaAnaliseGerencial;
  margem: {
    acao: "PROTEGER" | "REVISAR" | "DESCONTO_CONTROLADO" | "MANTER";
    recomendacao: string;
  };
};

const STATUS_PEDIDO_INVALIDO = ["CANCELADO", "EXPIRADO", "RECUSADO"];
const STATUS_VENDA_INVALIDO = ["CANCELADA", "NA_LIXEIRA"];
const TIPOS_MARKETING = ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"];
const SIMULATION_MARKER = "[SIMULACAO_2_MESES_STELLA]";

const FASE_LABELS: Record<FaseEmpresa, string> = {
  PRE_OPERACAO: "Pre-operacao",
  VALIDACAO_INICIAL: "Validacao inicial",
  PRIMEIRA_TRACAO: "Primeira tracao",
  GIRO_COMPROVADO: "Giro comprovado",
  CRESCIMENTO_SAUDAVEL: "Crescimento saudavel",
  ESCALA: "Escala",
  PRESSAO_CAIXA: "Pressao de caixa",
  CRISE_DEFESA: "Crise / defesa",
  ESTOQUE_TRAVADO: "Estoque travado",
};

function numero(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function arredondar(value: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function percentual(parte: number, total: number) {
  if (!total) return 0;
  return arredondar((numero(parte) / numero(total)) * 100, 2);
}

function limitar(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function faixa(minimo: number, maximo: number, recomendacao: string): FaixaAdaptativa {
  return {
    minimo,
    maximo,
    label: `${minimo}% a ${maximo}%`,
    recomendacao,
  };
}

function faixaMeses(minimo: number, maximo: number, recomendacao: string): FaixaAdaptativa {
  return {
    minimo,
    maximo,
    label:
      minimo === 3 && maximo === 4
        ? "3 meses ou mais"
        : `${minimo} a ${maximo} meses`,
    recomendacao,
  };
}

function diasDesde(data: Date | null | undefined) {
  if (!data) return 0;
  const diff = Date.now() - data.getTime();
  if (diff <= 0) return 0;
  return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function deslocarMes(mes: number, ano: number, offset: number) {
  const data = new Date(ano, mes - 1 + offset, 1);
  return {
    mes: data.getMonth() + 1,
    ano: data.getFullYear(),
  };
}

function menorData(datas: (Date | null | undefined)[]) {
  return datas
    .filter((item): item is Date => item instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())[0];
}

function statusCount(
  snapshots: {
    statusComercial: string;
    recomendacao: string | null;
    vendasQuantidade: number;
    scoreValidacao: number;
    dadosJson: unknown;
  }[],
  status: string
) {
  return snapshots.filter((item) => item.statusComercial === status).length;
}

async function carregarSinaisAdaptativos(mes: number, ano: number): Promise<DadosAdaptativos> {
  const periodo = periodoFinanceiro(mes, ano);
  const inicioRecentes = new Date(periodo.fimExclusivo);
  inicioRecentes.setDate(inicioRecentes.getDate() - 180);
  const inicioIntencao = new Date(periodo.fimExclusivo);
  inicioIntencao.setDate(inicioIntencao.getDate() - 120);

  const [
    produtosAtivos,
    estoques,
    primeiraProduto,
    primeiraVenda,
    primeiraPedido,
    primeiroEvento,
    vendasInternasTotal,
    vendasInternasPeriodo,
    vendasInternasRecentes,
    pedidosOnlineTotal,
    pedidosOnlinePeriodo,
    pedidosOnlineRecentes,
    eventosIntencaoRecentes,
    snapshotsRaw,
    simulacaoVendas,
    simulacaoPedidos,
    simulacaoCompras,
    simulacaoLancamentos,
  ] = await Promise.all([
    prisma.produto.count({
      where: { ativo: true, status: { not: "NA_LIXEIRA" } },
    }),
    prisma.estoqueProduto.findMany({
      where: {
        produto: { ativo: true, status: { not: "NA_LIXEIRA" } },
      },
      select: { quantidadeAtual: true },
    }),
    prisma.produto.aggregate({
      where: { ativo: true, status: { not: "NA_LIXEIRA" } },
      _min: { criadoEm: true },
    }),
    prisma.venda.aggregate({
      where: { status: { notIn: STATUS_VENDA_INVALIDO } },
      _min: { criadoEm: true },
    }),
    prisma.pedidoOnline.aggregate({
      where: {
        origemCanal: "LOJA_STELLA",
        statusPagamento: "PAGO",
        status: { notIn: STATUS_PEDIDO_INVALIDO },
      },
      _min: { pagoEm: true, criadoEm: true },
    }),
    prisma.eventoComercial.aggregate({
      _min: { criadoEm: true },
    }),
    prisma.vendaItem.aggregate({
      where: { venda: { status: { notIn: STATUS_VENDA_INVALIDO } } },
      _sum: { quantidade: true },
    }),
    prisma.vendaItem.aggregate({
      where: {
        venda: {
          status: { notIn: STATUS_VENDA_INVALIDO },
          criadoEm: { gte: periodo.inicio, lt: periodo.fimExclusivo },
        },
      },
      _sum: { quantidade: true },
    }),
    prisma.vendaItem.aggregate({
      where: {
        venda: {
          status: { notIn: STATUS_VENDA_INVALIDO },
          criadoEm: { gte: inicioRecentes, lt: periodo.fimExclusivo },
        },
      },
      _sum: { quantidade: true },
    }),
    prisma.pedidoOnlineItem.aggregate({
      where: {
        pedidoOnline: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          status: { notIn: STATUS_PEDIDO_INVALIDO },
        },
      },
      _sum: { quantidade: true },
    }),
    prisma.pedidoOnlineItem.aggregate({
      where: {
        pedidoOnline: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          status: { notIn: STATUS_PEDIDO_INVALIDO },
          pagoEm: { gte: periodo.inicio, lt: periodo.fimExclusivo },
        },
      },
      _sum: { quantidade: true },
    }),
    prisma.pedidoOnlineItem.aggregate({
      where: {
        pedidoOnline: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          status: { notIn: STATUS_PEDIDO_INVALIDO },
          pagoEm: { gte: inicioRecentes, lt: periodo.fimExclusivo },
        },
      },
      _sum: { quantidade: true },
    }),
    prisma.eventoComercial.count({
      where: {
        criadoEm: { gte: inicioIntencao, lt: periodo.fimExclusivo },
      },
    }),
    prisma.produtoMetricaSnapshot.findMany({
      where: { periodoTipo: "ATUAL" },
      select: {
        produtoId: true,
        tamanhoAnel: true,
        statusComercial: true,
        recomendacao: true,
        vendasQuantidade: true,
        estoqueFinal: true,
        scoreValidacao: true,
        dadosJson: true,
      },
      orderBy: [{ criadoEm: "desc" }],
    }),
    prisma.venda.count({
      where: { observacoes: { contains: SIMULATION_MARKER } },
    }),
    prisma.pedidoOnline.count({
      where: { observacoes: { contains: SIMULATION_MARKER } },
    }),
    prisma.compra.count({
      where: { observacoes: { contains: SIMULATION_MARKER } },
    }),
    prisma.lancamentoFinanceiro.count({
      where: { observacoes: { contains: SIMULATION_MARKER } },
    }),
  ]);

  const snapshotsPorProduto = new Map<string, (typeof snapshotsRaw)[number]>();
  snapshotsRaw.forEach((snapshot) => {
    const atual = snapshotsPorProduto.get(snapshot.produtoId);
    if (!atual || snapshot.tamanhoAnel === "TODOS" || snapshot.scoreValidacao > atual.scoreValidacao) {
      snapshotsPorProduto.set(snapshot.produtoId, snapshot);
    }
  });
  const snapshots = Array.from(snapshotsPorProduto.values());
  const intencoes = snapshots.map((snapshot) => extrairIntencaoSnapshot(snapshot.dadosJson));
  const eventosIntencaoSnapshots = intencoes.reduce(
    (total, intencao) => total + intencao.eventosTotal,
    0
  );
  const produtosTestados = snapshots.filter((snapshot, index) => {
    const intencao = intencoes[index];
    return (
      snapshot.vendasQuantidade > 0 ||
      snapshot.scoreValidacao >= 30 ||
      intencao.eventosTotal >= 5 ||
      intencao.confiancaAnalise !== "BAIXA"
    );
  }).length;
  const produtosPoucoTestados =
    statusCount(snapshots, "NAO_TESTADO") +
    snapshots.filter((snapshot, index) => {
      const intencao = intencoes[index];
      return (
        snapshot.statusComercial !== "NAO_TESTADO" &&
        snapshot.vendasQuantidade === 0 &&
        intencao.confiancaAnalise === "BAIXA" &&
        intencao.eventosTotal < 5
      );
    }).length;
  const primeiraData = menorData([
    primeiraProduto._min.criadoEm,
    primeiraVenda._min.criadoEm,
    primeiraPedido._min.pagoEm,
    primeiraPedido._min.criadoEm,
    primeiroEvento._min.criadoEm,
  ]);
  const registrosSimulados =
    simulacaoVendas + simulacaoPedidos + simulacaoCompras + simulacaoLancamentos;
  const vendasReaisTotal =
    numero(vendasInternasTotal._sum.quantidade) + numero(pedidosOnlineTotal._sum.quantidade);
  const vendasReaisPeriodo =
    numero(vendasInternasPeriodo._sum.quantidade) + numero(pedidosOnlinePeriodo._sum.quantidade);
  const vendasReaisRecentes =
    numero(vendasInternasRecentes._sum.quantidade) + numero(pedidosOnlineRecentes._sum.quantidade);

  return {
    vendasReaisTotal,
    vendasReaisPeriodo,
    vendasReaisRecentes,
    diasOperacao: diasDesde(primeiraData),
    eventosIntencaoRecentes,
    eventosIntencaoSnapshots,
    produtosAtivos,
    produtosTestados,
    produtosPoucoTestados,
    unidadesEstoqueTotal: estoques.reduce(
      (total, estoque) => total + numero(estoque.quantidadeAtual),
      0
    ),
    produtosComDadosSimulados: 0,
    registrosSimulados,
    mesesLucroPositivoRecentes: 0,
    mesesReceitaPositivaRecentes: 0,
    percentualProdutosTestados: percentual(produtosTestados, produtosAtivos),
  };
}

function completarSinaisHistorico(
  sinais: DadosAdaptativos,
  historico: MontarInteligenciaAdaptativaParams["historico"]
) {
  const recentes = historico.slice(-6);
  return {
    ...sinais,
    mesesLucroPositivoRecentes: recentes.filter((item) => numero(item.lucro) > 0).length,
    mesesReceitaPositivaRecentes: recentes.filter((item) => numero(item.receita) > 0).length,
  };
}

function avaliarConfianca(dados: DadosAdaptativos): {
  nivel: ConfiancaAnaliseGerencial;
  score: number;
} {
  let score = 0;

  if (dados.vendasReaisTotal >= 40) score += 35;
  else if (dados.vendasReaisTotal >= 15) score += 28;
  else if (dados.vendasReaisTotal >= 5) score += 18;
  else if (dados.vendasReaisTotal > 0) score += 8;

  if (dados.diasOperacao >= 120) score += 18;
  else if (dados.diasOperacao >= 60) score += 14;
  else if (dados.diasOperacao >= 30) score += 8;
  else if (dados.diasOperacao > 0) score += 3;

  const eventos = Math.max(dados.eventosIntencaoRecentes, dados.eventosIntencaoSnapshots);
  if (eventos >= 250) score += 18;
  else if (eventos >= 80) score += 14;
  else if (eventos >= 20) score += 8;
  else if (eventos > 0) score += 4;

  if (dados.percentualProdutosTestados >= 70) score += 18;
  else if (dados.percentualProdutosTestados >= 45) score += 12;
  else if (dados.percentualProdutosTestados >= 25) score += 6;

  if (dados.mesesReceitaPositivaRecentes >= 3) score += 6;
  if (dados.mesesLucroPositivoRecentes >= 2) score += 5;
  if (dados.registrosSimulados > 0) score -= dados.vendasReaisTotal < 10 ? 18 : 8;
  if (dados.vendasReaisTotal === 0) score = Math.min(score, 32);
  if (dados.produtosAtivos > 0 && dados.percentualProdutosTestados < 25) {
    score = Math.min(score, 45);
  }

  const finalScore = Math.round(limitar(score, 0, 100));
  return {
    score: finalScore,
    nivel: finalScore >= 70 ? "ALTA" : finalScore >= 45 ? "MEDIA" : "BAIXA",
  };
}

function classificarFase(
  params: MontarInteligenciaAdaptativaParams,
  dados: DadosAdaptativos,
  confianca: ConfiancaAnaliseGerencial
): { fase: FaseEmpresa; motivos: string[] } {
  const motivos: string[] = [];
  const estoque = params.estoque;
  const ativosBase = Math.max(1, dados.produtosAtivos);
  const produtosTravados = estoque.produtosEstoqueParadoHistorico + estoque.produtosParados;
  const taxaTravados = produtosTravados / ativosBase;
  const pendencias =
    params.gastosPendentes + params.gastosVencidos + params.comprasPendentesTotal + params.proLaborePendente;

  if (
    params.saldoGerencial < 0 ||
    (params.lucroApuravel < 0 && params.runwayMeses < 1) ||
    (params.gastosVencidos > 0 && params.runwayMeses < 1)
  ) {
    motivos.push("Caixa, lucro ou vencidos exigem defesa imediata.");
    return { fase: "CRISE_DEFESA", motivos };
  }

  if (
    params.runwayMeses < 1.5 ||
    pendencias > Math.max(params.saldoGerencial * 0.8, params.receitaRecebida * 0.5)
  ) {
    motivos.push("Caixa livre e pendencias reduzem margem para novas apostas.");
    return { fase: "PRESSAO_CAIXA", motivos };
  }

  if (
    taxaTravados >= 0.35 &&
    dados.vendasReaisRecentes <= 3 &&
    (dados.eventosIntencaoRecentes >= 20 || confianca !== "BAIXA")
  ) {
    motivos.push("Muitos produtos ativos seguem parados apesar de alguma leitura comercial.");
    return { fase: "ESTOQUE_TRAVADO", motivos };
  }

  if (dados.vendasReaisTotal <= 0) {
    motivos.push("Ainda nao ha venda real suficiente para tratar metas como comprovadas.");
    return { fase: "PRE_OPERACAO", motivos };
  }

  if (
    dados.vendasReaisTotal < 10 ||
    dados.percentualProdutosTestados < 30 ||
    confianca === "BAIXA"
  ) {
    motivos.push("Ha vendas ou sinais iniciais, mas a amostra ainda e curta.");
    return { fase: "VALIDACAO_INICIAL", motivos };
  }

  if (
    dados.vendasReaisTotal < 25 ||
    dados.mesesReceitaPositivaRecentes < 2 ||
    estoque.produtosReposicaoConfirmada <= 0
  ) {
    motivos.push("A operacao ja tracionou, mas ainda precisa repetir ciclos vencedores.");
    return { fase: "PRIMEIRA_TRACAO", motivos };
  }

  if (
    dados.vendasReaisTotal >= 80 &&
    dados.mesesLucroPositivoRecentes >= 4 &&
    params.runwayMeses >= 3 &&
    params.gastosOperacionaisPct <= 28
  ) {
    motivos.push("Venda, lucro e caixa sustentam leitura de escala.");
    return { fase: "ESCALA", motivos };
  }

  if (
    dados.mesesLucroPositivoRecentes >= 3 &&
    params.runwayMeses >= 2.5 &&
    params.margemBrutaPct >= 55 &&
    params.gastosOperacionaisPct <= 32
  ) {
    motivos.push("Historico recente mostra caixa, margem e lucro em conjunto.");
    return { fase: "CRESCIMENTO_SAUDAVEL", motivos };
  }

  motivos.push("Ha giro real e produtos com reposicao mais defensavel, mas ainda seletiva.");
  return { fase: "GIRO_COMPROVADO", motivos };
}

function montarMetas(
  fase: FaseEmpresa,
  params: MontarInteligenciaAdaptativaParams,
  confianca: ConfiancaAnaliseGerencial
) {
  const baixaConfianca = confianca === "BAIXA";
  const margemECaixaPermitemEscala =
    params.margemBrutaPct >= 55 &&
    params.lucroApuravel > 0 &&
    params.runwayMeses >= 3;
  const marketingBase: Record<FaseEmpresa, [number, number]> = {
    PRE_OPERACAO: [0, 3],
    VALIDACAO_INICIAL: [3, 8],
    PRIMEIRA_TRACAO: [5, 10],
    GIRO_COMPROVADO: [6, 10],
    CRESCIMENTO_SAUDAVEL: [8, 12],
    ESCALA: margemECaixaPermitemEscala ? [12, 18] : [8, 12],
    PRESSAO_CAIXA: [0, 5],
    CRISE_DEFESA: [0, 0],
    ESTOQUE_TRAVADO: [0, 5],
  };
  const proLaboreBase: Record<FaseEmpresa, [number, number]> = {
    PRE_OPERACAO: [0, 0],
    VALIDACAO_INICIAL: [0, 10],
    PRIMEIRA_TRACAO: [10, 20],
    GIRO_COMPROVADO: [20, 35],
    CRESCIMENTO_SAUDAVEL: margemECaixaPermitemEscala ? [25, 50] : [20, 35],
    ESCALA: margemECaixaPermitemEscala ? [30, 50] : [25, 35],
    PRESSAO_CAIXA: [0, 8],
    CRISE_DEFESA: [0, 0],
    ESTOQUE_TRAVADO: [0, 15],
  };
  const reposicaoBase: Record<FaseEmpresa, [number, number]> = {
    PRE_OPERACAO: [0, 5],
    VALIDACAO_INICIAL: [5, 20],
    PRIMEIRA_TRACAO: [15, 35],
    GIRO_COMPROVADO: [25, 45],
    CRESCIMENTO_SAUDAVEL: [25, 40],
    ESCALA: [30, 45],
    PRESSAO_CAIXA: [0, 15],
    CRISE_DEFESA: [0, 5],
    ESTOQUE_TRAVADO: [0, 15],
  };
  const reservaBaseMeses: Record<FaseEmpresa, [number, number]> = {
    PRE_OPERACAO: [2, 4],
    VALIDACAO_INICIAL: [1, 2],
    PRIMEIRA_TRACAO: [1.5, 2.5],
    GIRO_COMPROVADO: [2, 3],
    CRESCIMENTO_SAUDAVEL: [2, 3],
    ESCALA: [3, 4],
    PRESSAO_CAIXA: [3, 5],
    CRISE_DEFESA: [4, 6],
    ESTOQUE_TRAVADO: [2, 4],
  };

  const marketing = marketingBase[fase];
  const proLabore = proLaboreBase[fase];
  const reposicao = reposicaoBase[fase];
  const reserva = reservaBaseMeses[fase];
  const marketingMax = baixaConfianca
    ? Math.max(marketing[0], Math.min(marketing[1], 4))
    : marketing[1];
  const reposicaoMax = baixaConfianca
    ? Math.max(reposicao[0], Math.min(reposicao[1], 20))
    : reposicao[1];

  return {
    marketingPago: faixa(
      marketing[0],
      marketingMax,
      params.marketingPct > marketingMax
        ? "Reduzir marketing pago ate a fase validar margem, produto e conversao."
        : "Manter pago pequeno e vinculado a produtos com margem e sinal real."
    ),
    reserva: faixaMeses(
      reserva[0],
      reserva[1],
      params.runwayMeses < reserva[0]
        ? "Priorizar caixa e reserva em meses antes de novas compras, marketing pago ou retiradas."
        : "Preservar a faixa de meses da fase antes de acelerar compras e campanhas."
    ),
    proLabore: faixa(
      proLabore[0],
      proLabore[1],
      params.lucroApuravel <= 0 || params.runwayMeses < 1.5
        ? "Pro-labore deve ficar travado ou simbolico ate caixa e lucro voltarem."
        : "Retirada segura so dentro do lucro realizado e depois da reserva minima."
    ),
    reposicao: faixa(
      reposicao[0],
      reposicaoMax,
      "Comprar apenas com sinal de venda, ciclo ou intencao suficiente; lote grande so com repeticao."
    ),
  };
}

function montarDistribuicao(fase: FaseEmpresa): AlocacaoAdaptativa {
  const porFase: Record<FaseEmpresa, AlocacaoAdaptativa> = {
    PRE_OPERACAO: {
      caixa: 40,
      reserva: 25,
      reposicao: 5,
      marketing: 5,
      reinvestimento: 20,
      proLabore: 0,
      descontosCampanhas: 5,
      leitura: "Preservar caixa e gerar exposicao antes de apostar em lote.",
    },
    VALIDACAO_INICIAL: {
      caixa: 30,
      reserva: 25,
      reposicao: 15,
      marketing: 5,
      reinvestimento: 15,
      proLabore: 5,
      descontosCampanhas: 5,
      leitura: "Validar produto e oferta com compras pequenas e campanhas organicas.",
    },
    PRIMEIRA_TRACAO: {
      caixa: 20,
      reserva: 20,
      reposicao: 25,
      marketing: 8,
      reinvestimento: 14,
      proLabore: 10,
      descontosCampanhas: 3,
      leitura: "Repor pequenos campeoes e proteger margem enquanto a tracao se repete.",
    },
    GIRO_COMPROVADO: {
      caixa: 15,
      reserva: 15,
      reposicao: 35,
      marketing: 8,
      reinvestimento: 12,
      proLabore: 12,
      descontosCampanhas: 3,
      leitura: "Caixa pode seguir para reposicao seletiva de itens comprovados.",
    },
    CRESCIMENTO_SAUDAVEL: {
      caixa: 12,
      reserva: 13,
      reposicao: 32,
      marketing: 10,
      reinvestimento: 12,
      proLabore: 18,
      descontosCampanhas: 3,
      leitura: "Aumentar reinvestimento sem perder reserva e margem.",
    },
    ESCALA: {
      caixa: 10,
      reserva: 10,
      reposicao: 35,
      marketing: 12,
      reinvestimento: 10,
      proLabore: 20,
      descontosCampanhas: 3,
      leitura: "Escalar com caixa protegido, reposicao recorrente e marketing medido.",
    },
    PRESSAO_CAIXA: {
      caixa: 45,
      reserva: 25,
      reposicao: 10,
      marketing: 3,
      reinvestimento: 10,
      proLabore: 5,
      descontosCampanhas: 2,
      leitura: "Reduzir apostas e preservar liquidez ate aliviar pendencias.",
    },
    CRISE_DEFESA: {
      caixa: 60,
      reserva: 25,
      reposicao: 3,
      marketing: 0,
      reinvestimento: 7,
      proLabore: 0,
      descontosCampanhas: 5,
      leitura: "Defesa de caixa: suspender saidas nao essenciais e vender estoque.",
    },
    ESTOQUE_TRAVADO: {
      caixa: 35,
      reserva: 20,
      reposicao: 5,
      marketing: 5,
      reinvestimento: 10,
      proLabore: 10,
      descontosCampanhas: 15,
      leitura: "Girar estoque atual antes de recomprar modelos sem validacao.",
    },
  };

  return porFase[fase];
}

function montarRiscosEAcoes(
  fase: FaseEmpresa,
  params: MontarInteligenciaAdaptativaParams,
  dados: DadosAdaptativos,
  confianca: ConfiancaAnaliseGerencial
) {
  const riscos: string[] = [];
  const acoes: string[] = [];

  if (confianca === "BAIXA") {
    riscos.push("Amostra baixa: conclusoes devem virar testes, nao metas rigidas.");
    acoes.push("Expor produtos pouco testados antes de comprar lote ou cortar margem.");
  }
  if (dados.registrosSimulados > 0) {
    riscos.push("A base contem dados simulados; separar leitura real antes de escalar decisao.");
  }
  if (params.runwayMeses < 2) {
    riscos.push("Runway curto limita compra de estoque, marketing pago e pro-labore.");
    acoes.push("Priorizar recebimentos, reserva e reducao de saidas recorrentes.");
  }
  if (params.estoque.produtosInteresseSemConversao > 0) {
    riscos.push("Ha interesse sem conversao; comprar mais pode repetir o gargalo.");
    acoes.push("Revisar oferta, fotos, preco, descricao e frete antes de recomprar.");
  }
  if (params.estoque.produtosAltoInteresseEstoqueBaixo > 0) {
    acoes.push("Repor pequeno produtos com alto interesse e estoque baixo antes de ampliar trafego.");
  }
  if (params.estoque.produtosPoucoTestados > 0) {
    acoes.push("Colocar produtos pouco testados em vitrine, busca e conteudo antes de nova compra.");
  }

  if (fase === "PRE_OPERACAO") {
    acoes.unshift("Validar primeiras vendas reais com exposicao organica e oferta clara.");
  } else if (fase === "VALIDACAO_INICIAL") {
    acoes.unshift("Repor apenas o que vendeu ou recebeu sinal forte; observar o restante.");
  } else if (fase === "ESTOQUE_TRAVADO") {
    acoes.unshift("Criar campanhas para girar estoque parado antes de recomprar variedade.");
  } else if (fase === "PRESSAO_CAIXA" || fase === "CRISE_DEFESA") {
    acoes.unshift("Congelar lote grande, marketing novo e retirada extra ate caixa estabilizar.");
  } else if (fase === "GIRO_COMPROVADO" || fase === "CRESCIMENTO_SAUDAVEL" || fase === "ESCALA") {
    acoes.unshift("Concentrar reposicao em ciclos repetidos e manter compra grande como excecao comprovada.");
  }

  return {
    riscos: riscos.length ? riscos : ["Nenhum risco adaptativo critico alem do acompanhamento normal."],
    acoesPrioritarias: Array.from(new Set(acoes)).slice(0, 6),
  };
}

function montarMargemDesconto(params: MontarInteligenciaAdaptativaParams) {
  if (params.margemBrutaPct > 0 && params.margemBrutaPct < 50) {
    return {
      acao: "PROTEGER_MARGEM" as const,
      recomendacao: "Margem baixa: evitar desconto amplo e revisar precificacao/custo antes de campanha.",
    };
  }

  if (params.estoque.produtosInteresseSemConversao > 0) {
    return {
      acao: "REVER_OFERTA" as const,
      recomendacao:
        "Interesse sem conversao pede revisar oferta; use desconto pequeno apenas como teste controlado.",
    };
  }

  if (params.estoque.produtosEstoqueParadoHistorico > 0 || params.estoque.produtosParados > 0) {
    return {
      acao: "TESTAR_DESCONTO_CONTROLADO" as const,
      recomendacao:
        "Produtos parados podem receber campanha ou desconto controlado sem contaminar campeoes.",
    };
  }

  if (params.estoque.produtosCampeoesProvaveis > 0 || params.estoque.produtosRiscoRuptura > 0) {
    return {
      acao: "PROTEGER_MARGEM" as const,
      recomendacao: "Campeoes e itens com risco de ruptura devem proteger margem, nao desconto.",
    };
  }

  return {
    acao: "MANTER" as const,
    recomendacao: "Manter margem atual e testar descontos apenas por produto, canal e periodo.",
  };
}

export function avaliarInteligenciaAdaptativa(
  params: MontarInteligenciaAdaptativaParams,
  dadosInput: DadosAdaptativos
): InteligenciaAdaptativaGerencial {
  const dados = completarSinaisHistorico(dadosInput, params.historico);
  const confianca = avaliarConfianca(dados);
  const fase = classificarFase(params, dados, confianca.nivel);
  const metas = montarMetas(fase.fase, params, confianca.nivel);
  const { riscos, acoesPrioritarias } = montarRiscosEAcoes(
    fase.fase,
    params,
    dados,
    confianca.nivel
  );
  const leituraDados =
    dados.registrosSimulados > 0
      ? `Leitura com ${dados.registrosSimulados} registro(s) simulados detectados; trate escala como hipotese ate separar dados reais.`
      : "Leitura baseada nos registros reais disponiveis e sinais comerciais capturados.";

  return {
    fase: fase.fase,
    faseLabel: FASE_LABELS[fase.fase],
    confiancaAnalise: confianca.nivel,
    scoreConfianca: confianca.score,
    motivo: fase.motivos[0] || "Fase definida pelos sinais combinados de caixa, vendas, estoque e intencao.",
    motivos: fase.motivos,
    dados,
    metas,
    distribuicao: montarDistribuicao(fase.fase),
    riscos,
    acoesPrioritarias,
    margemDesconto: montarMargemDesconto(params),
    leituraDados,
  };
}

export async function montarInteligenciaAdaptativa(
  params: MontarInteligenciaAdaptativaParams
): Promise<InteligenciaAdaptativaGerencial> {
  const dados = await carregarSinaisAdaptativos(params.mes, params.ano);
  return avaliarInteligenciaAdaptativa(params, dados);
}

async function calcularMarketingPago(mes: number, ano: number) {
  const periodo = periodoFinanceiro(mes, ano);
  const marketing = await prisma.lancamentoFinanceiro.aggregate({
    where: {
      status: { not: "NA_LIXEIRA" },
      statusPagamento: "PAGO",
      tipo: { in: TIPOS_MARKETING },
      dataPagamento: {
        gte: periodo.inicio,
        lt: periodo.fimExclusivo,
      },
    },
    _sum: { valorReal: true },
  });

  return numero(marketing._sum.valorReal);
}

export async function montarInteligenciaAdaptativaAtual() {
  const atual = mesAnoAtual();
  const anterior2 = deslocarMes(atual.mes, atual.ano, -2);
  const anterior1 = deslocarMes(atual.mes, atual.ano, -1);
  const central = await montarCentralFinanceira(atual.mes, atual.ano);
  const [marketingPago, resultadoAnterior2, resultadoAnterior1] = await Promise.all([
    calcularMarketingPago(atual.mes, atual.ano),
    calcularResultadoMensal(anterior2.mes, anterior2.ano),
    calcularResultadoMensal(anterior1.mes, anterior1.ano),
  ]);
  const receita = central.resultado.receitaRecebida;
  const gastosVencidos = central.lancamentosPendentes
    .filter((lancamento) => lancamento.statusPagamento === "VENCIDO")
    .reduce((total, lancamento) => total + numero(lancamento.valorReal), 0);
  const comprasPendentesTotal = central.comprasPendentes.reduce(
    (total, compra) => total + numero(compra.valorTotalFinal),
    0
  );
  const proLaborePendente = central.previsao.proLaborePendente;
  const gastosBase = Math.max(central.resultado.gastosOperacionais, 1);
  const runwayMeses = gastosBase > 0 ? arredondar(central.saldoGerencial / gastosBase, 1) : 99;
  const historico = [resultadoAnterior2, resultadoAnterior1, central.resultado].map((resultado) => ({
    receita: resultado.receitaRecebida,
    lucro: resultado.lucroApuravel,
    gastos: resultado.gastosOperacionais,
    marketing: 0,
  }));
  const dados = await montarInteligenciaAdaptativa({
    mes: atual.mes,
    ano: atual.ano,
    receitaRecebida: receita,
    lucroApuravel: central.resultado.lucroApuravel,
    margemBrutaPct: percentual(central.resultado.resultadoBruto, receita),
    margemLiquidaPct: percentual(central.resultado.lucroApuravel, receita),
    gastosOperacionaisPct: percentual(central.resultado.gastosOperacionais, receita),
    marketingPct: percentual(marketingPago, receita),
    runwayMeses,
    saldoGerencial: central.saldoGerencial,
    entradasMes: central.entradasMes,
    saidasMes: central.saidasMes,
    gastosPendentes: central.previsao.gastosPendentes,
    gastosVencidos,
    comprasPendentesTotal,
    comprasPendentesQuantidade: central.comprasPendentes.length,
    proLaborePendente,
    proLaborePagoMes: 0,
    reservaAtual: 0,
    historico,
    estoque: {
      produtosZerados: 0,
      produtosBaixo: 0,
      produtosParados: 0,
      produtosCampeoesProvaveis: 0,
      produtosRiscoRuptura: 0,
      produtosEstoqueParadoHistorico: 0,
      produtosReposicaoConfirmada: 0,
      produtosInteresseSemConversao: 0,
      produtosPoucoTestados: 0,
      produtosAltoInteresseEstoqueBaixo: 0,
    },
  });

  return {
    ...dados,
    caixaDisponivel: Math.max(0, central.saldoGerencial - comprasPendentesTotal - proLaborePendente),
  };
}

function confiancaProduto(score: number, faseConfianca: ConfiancaAnaliseGerencial) {
  if (score >= 75 && faseConfianca !== "BAIXA") return "ALTA";
  if (score >= 45 || faseConfianca === "MEDIA") return "MEDIA";
  return "BAIXA";
}

export function avaliarMargemDescontoProduto(params: {
  margemEstimadaPct?: number | null;
  statusComercial?: string | null;
  recomendacaoReposicao?: string | null;
  intencao?: Partial<ProdutoIntencaoAgregada> | null;
}) {
  const margem = numero(params.margemEstimadaPct);
  const status = String(params.statusComercial || "");
  const recomendacao = String(params.recomendacaoReposicao || "");
  const intencao = params.intencao;

  if (margem > 0 && margem < 50) {
    return {
      acao: "PROTEGER" as const,
      recomendacao: "Margem curta: proteger preco e revisar custo antes de desconto.",
    };
  }

  if (status === "RISCO_RUPTURA" || status === "REPOSICAO_CONFIRMADA" || status === "CAMPEAO_PROVAVEL") {
    return {
      acao: "PROTEGER" as const,
      recomendacao: "Produto validado ou com ruptura deve proteger margem.",
    };
  }

  if (status === "INTERESSE_SEM_CONVERSAO" || recomendacao === "REVISAR_OFERTA") {
    return {
      acao: "REVISAR" as const,
      recomendacao: "Revisar oferta antes de desconto; testar desconto pequeno so com prazo e medicao.",
    };
  }

  if (status === "ESTOQUE_PARADO" || recomendacao === "LIQUIDAR_COM_CUIDADO") {
    return {
      acao: "DESCONTO_CONTROLADO" as const,
      recomendacao: "Desconto controlado pode destravar estoque parado sem virar regra da marca.",
    };
  }

  if (numero(intencao?.scoreInteresse) >= 30 && numero(intencao?.taxaConversao) <= 0) {
    return {
      acao: "REVISAR" as const,
      recomendacao: "Interesse alto sem conversao pede melhorar oferta antes de comprar mais.",
    };
  }

  return {
    acao: "MANTER" as const,
    recomendacao: "Manter margem e observar nova amostra antes de desconto.",
  };
}

export function avaliarCompraLoteProduto(
  params: AvaliarCompraLoteProdutoParams
): DecisaoLoteProduto {
  const status = String(params.statusComercial || "");
  const recomendacao = String(params.recomendacaoReposicao || "");
  const vendasQuantidade = numero(params.vendasQuantidade ?? params.cicloAtual?.quantidadeVendida);
  const confiancaReposicao = numero(params.confiancaReposicao);
  const sugestaoOriginal = Math.max(0, Math.round(numero(params.sugestaoQuantidade)));
  const custoEstimado = numero(params.custoUnitario) * Math.max(1, sugestaoOriginal || 1);
  const caixaDisponivel = numero(params.caixaDisponivel);
  const margem = avaliarMargemDescontoProduto(params);
  const confianca = confiancaProduto(confiancaReposicao, params.confiancaAnalise);
  const faseDefensiva = ["PRE_OPERACAO", "VALIDACAO_INICIAL", "PRESSAO_CAIXA", "CRISE_DEFESA", "ESTOQUE_TRAVADO"].includes(params.fase);
  const caixaApertado = caixaDisponivel > 0 && custoEstimado > caixaDisponivel * 0.25;

  if (!status || status === "NAO_TESTADO" || recomendacao === "EXPOR_MAIS") {
    return {
      decisao: "BLOQUEADO",
      loteGrandeLiberado: false,
      sugestao: "EXPOR_MAIS",
      sugestaoQuantidade: 0,
      motivo: "Produto ainda precisa de exposicao real antes de compra.",
      confianca,
      margem,
    };
  }

  if (status === "INTERESSE_SEM_CONVERSAO" || recomendacao === "REVISAR_OFERTA") {
    return {
      decisao: "BLOQUEADO",
      loteGrandeLiberado: false,
      sugestao: "REVISAR_OFERTA",
      sugestaoQuantidade: 0,
      motivo: "Ha interesse sem conversao; revisar oferta antes de recomprar.",
      confianca,
      margem,
    };
  }

  if (status === "ESTOQUE_PARADO" || recomendacao === "LIQUIDAR_COM_CUIDADO" || recomendacao === "NAO_REPOR") {
    return {
      decisao: "BLOQUEADO",
      loteGrandeLiberado: false,
      sugestao: "NAO_REPOR",
      sugestaoQuantidade: 0,
      motivo: "Estoque parado ou historico fraco bloqueia nova compra.",
      confianca,
      margem,
    };
  }

  if (vendasQuantidade <= 1) {
    return {
      decisao: "CAUTELA",
      loteGrandeLiberado: false,
      sugestao: "REPOR_PEQUENO",
      sugestaoQuantidade: vendasQuantidade > 0 ? Math.min(2, Math.max(1, sugestaoOriginal || 1)) : 0,
      motivo: "Uma venda valida reposicao pequena, nao lote grande.",
      confianca,
      margem,
    };
  }

  if (faseDefensiva) {
    return {
      decisao: "CAUTELA",
      loteGrandeLiberado: false,
      sugestao: recomendacao === "REPOR_LOTE_MEDIO" ? "REPOR_PEQUENO" : "OBSERVAR",
      sugestaoQuantidade: Math.min(3, Math.max(1, sugestaoOriginal || 1)),
      motivo: `Fase ${FASE_LABELS[params.fase]} limita lote grande mesmo com sinal comercial.`,
      confianca,
      margem,
    };
  }

  if (caixaApertado) {
    return {
      decisao: "CAUTELA",
      loteGrandeLiberado: false,
      sugestao: "REPOR_PEQUENO",
      sugestaoQuantidade: Math.min(3, Math.max(1, sugestaoOriginal || 1)),
      motivo: "Custo estimado da compra pressiona caixa livre; reduzir lote.",
      confianca,
      margem,
    };
  }

  if (
    status === "REPOSICAO_CONFIRMADA" &&
    recomendacao === "REPOR_LOTE_GRANDE" &&
    confiancaReposicao >= 75 &&
    vendasQuantidade >= 4 &&
    params.confiancaAnalise !== "BAIXA"
  ) {
    return {
      decisao: "LIBERADO",
      loteGrandeLiberado: true,
      sugestao: "LOTE_GRANDE",
      sugestaoQuantidade: Math.max(6, sugestaoOriginal || 6),
      motivo: "Produto repetiu ciclo, tem confianca e a fase permite compra maior.",
      confianca,
      margem,
    };
  }

  if (recomendacao === "REPOR_LOTE_MEDIO" || status === "REPOSICAO_CONFIRMADA") {
    return {
      decisao: "CAUTELA",
      loteGrandeLiberado: false,
      sugestao: "REPOR_MEDIO",
      sugestaoQuantidade: Math.min(5, Math.max(2, sugestaoOriginal || 2)),
      motivo: "Sinal permite lote medio, mas lote grande exige repeticao e caixa mais claro.",
      confianca,
      margem,
    };
  }

  return {
    decisao: "CAUTELA",
    loteGrandeLiberado: false,
    sugestao: "REPOR_PEQUENO",
    sugestaoQuantidade: Math.min(3, Math.max(1, sugestaoOriginal || 1)),
    motivo: "Reposicao pequena preserva aprendizado sem criar risco de estoque.",
    confianca,
    margem,
  };
}
