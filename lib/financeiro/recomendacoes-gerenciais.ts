import "server-only";

import type { Prisma, RecomendacaoGerencial } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  serializarImpactoRecomendacao,
  type RecomendacaoImpactoSerializada,
} from "@/lib/financeiro/impacto-recomendacoes";
import {
  calcularResultadoMensal,
  mesAnoAtual,
  montarCentralFinanceira,
  periodoFinanceiro,
} from "@/lib/financeiro/resultado";
import { montarInteligenciaGerencial } from "@/lib/financeiro/inteligencia-gerencial";
import {
  avaliarCompraLoteProduto,
  montarInteligenciaAdaptativaAtual,
} from "@/lib/financeiro/inteligencia-adaptativa";
import { extrairIntencaoSnapshot } from "@/lib/produtos/metricas-produto";
import { montarIntencaoComercial } from "@/lib/loja/intencao-comercial";
import type { FinanceiroHistoricoItem } from "@/components/financeiro/ResultadoDistribuicaoClient";

export const RECOMENDACAO_TIPOS = [
  "FINANCEIRO",
  "CAIXA",
  "PRO_LABORE",
  "MARKETING",
  "ESTOQUE",
  "REPOSICAO",
  "PRECIFICACAO",
  "LOJA",
  "CRESCIMENTO",
] as const;

export const RECOMENDACAO_PRIORIDADES = ["ALTA", "MEDIA", "BAIXA"] as const;

export const RECOMENDACAO_STATUS = [
  "NOVA",
  "ACEITA",
  "EM_EXECUCAO",
  "CONCLUIDA",
  "IGNORADA",
  "ADIADA",
] as const;

export const RECOMENDACAO_STATUS_ABERTOS = [
  "NOVA",
  "ACEITA",
  "EM_EXECUCAO",
] as const;

export type RecomendacaoTipo = (typeof RECOMENDACAO_TIPOS)[number];
export type RecomendacaoPrioridade =
  (typeof RECOMENDACAO_PRIORIDADES)[number];
export type RecomendacaoStatus = (typeof RECOMENDACAO_STATUS)[number];
export type RecomendacaoStatusAberto =
  (typeof RECOMENDACAO_STATUS_ABERTOS)[number];

export type RecomendacaoGerencialResumo = {
  id: string;
  codigo: string;
  tipo: string;
  titulo: string;
  descricao: string;
  motivo: string | null;
  evidenciasJson: unknown;
  impactoEsperado: string | null;
  risco: string | null;
  prioridade: string;
  status: string;
  acaoSugerida: string | null;
  linkAcao: string | null;
  origem: string | null;
  origemTipo: string;
  origemId: string | null;
  produtoId: string | null;
  categoriaId: string | null;
  periodoReferencia: string | null;
  prazoSugerido: string | null;
  resultadoObservado: string | null;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  aceitaEm: string | null;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  ignoradaEm: string | null;
  adiadaEm: string | null;
  impactos?: RecomendacaoImpactoSerializada[];
};

type CandidatoRecomendacao = {
  tipo: RecomendacaoTipo;
  titulo: string;
  descricao: string;
  motivo?: string | null;
  evidenciasJson?: Prisma.InputJsonValue;
  impactoEsperado?: string | null;
  risco?: string | null;
  prioridade: RecomendacaoPrioridade;
  acaoSugerida?: string | null;
  linkAcao?: string | null;
  origem?: string | null;
  origemTipo: string;
  origemId?: string | null;
  produtoId?: string | null;
  categoriaId?: string | null;
  periodoReferencia?: string | null;
  prazoSugerido?: Date | null;
};

export type ListarRecomendacoesParams = {
  status?: string | string[];
  tipo?: string | string[];
  prioridade?: string | string[];
  produtoId?: string;
  origemTipo?: string | string[];
  take?: number;
};

type GerarRecomendacoesParams = {
  mes?: number;
  ano?: number;
};

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function arredondar(value: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function somaValores<T>(items: T[], selector: (item: T) => number) {
  return arredondar(items.reduce((total, item) => total + numero(selector(item)), 0));
}

function mesLabel(mes: number, ano: number) {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

function deslocarMes(mes: number, ano: number, offset: number) {
  const data = new Date(ano, mes - 1 + offset, 1);
  return {
    mes: data.getMonth() + 1,
    ano: data.getFullYear(),
  };
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function asArray(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function prioridadePeso(value: string) {
  if (value === "ALTA") return 0;
  if (value === "MEDIA") return 1;
  return 2;
}

function statusPeso(value: string) {
  if (value === "NOVA") return 0;
  if (value === "ACEITA") return 1;
  if (value === "EM_EXECUCAO") return 2;
  if (value === "ADIADA") return 3;
  if (value === "CONCLUIDA") return 4;
  return 5;
}

export function serializarRecomendacaoGerencial(
  recomendacao: RecomendacaoGerencial & {
    impactos?: Parameters<typeof serializarImpactoRecomendacao>[0][];
  }
): RecomendacaoGerencialResumo {
  return {
    ...recomendacao,
    prazoSugerido: recomendacao.prazoSugerido?.toISOString() || null,
    criadoEm: recomendacao.criadoEm.toISOString(),
    atualizadoEm: recomendacao.atualizadoEm.toISOString(),
    aceitaEm: recomendacao.aceitaEm?.toISOString() || null,
    iniciadaEm: recomendacao.iniciadaEm?.toISOString() || null,
    concluidaEm: recomendacao.concluidaEm?.toISOString() || null,
    ignoradaEm: recomendacao.ignoradaEm?.toISOString() || null,
    adiadaEm: recomendacao.adiadaEm?.toISOString() || null,
    impactos: recomendacao.impactos?.map(serializarImpactoRecomendacao) || [],
  };
}

export async function listarRecomendacoesGerenciais(
  params: ListarRecomendacoesParams = {}
) {
  const status = asArray(params.status);
  const tipo = asArray(params.tipo);
  const prioridade = asArray(params.prioridade);
  const origemTipo = asArray(params.origemTipo);
  const where: Prisma.RecomendacaoGerencialWhereInput = {};

  if (status?.length) where.status = { in: status };
  if (tipo?.length) where.tipo = { in: tipo };
  if (prioridade?.length) where.prioridade = { in: prioridade };
  if (origemTipo?.length) where.origemTipo = { in: origemTipo };
  if (params.produtoId) where.produtoId = params.produtoId;

  const recomendacoes = await prisma.recomendacaoGerencial.findMany({
    where,
    include: {
      impactos: {
        orderBy: [{ avaliadoEm: "desc" }],
        take: 3,
      },
    },
    orderBy: [{ criadoEm: "desc" }],
    take: params.take,
  });

  return recomendacoes.sort((a, b) => {
    const statusDiff = statusPeso(a.status) - statusPeso(b.status);
    if (statusDiff !== 0) return statusDiff;

    const prioridadeDiff =
      prioridadePeso(a.prioridade) - prioridadePeso(b.prioridade);
    if (prioridadeDiff !== 0) return prioridadeDiff;

    return b.criadoEm.getTime() - a.criadoEm.getTime();
  });
}

async function montarHistorico(mes: number, ano: number) {
  const itens = Array.from({ length: 6 }).map((_, index) =>
    deslocarMes(mes, ano, index - 5)
  );
  const historico: FinanceiroHistoricoItem[] = [];

  for (const item of itens) {
    const resultado = await calcularResultadoMensal(item.mes, item.ano);
    const periodo = periodoFinanceiro(item.mes, item.ano);
    const marketing = await prisma.lancamentoFinanceiro.aggregate({
      where: {
        status: { not: "NA_LIXEIRA" },
        statusPagamento: "PAGO",
        tipo: { in: ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"] },
        dataPagamento: {
          gte: periodo.inicio,
          lt: periodo.fimExclusivo,
        },
      },
      _sum: { valorReal: true },
    });

    historico.push({
      label: mesLabel(item.mes, item.ano),
      receita: resultado.receitaRecebida,
      lucro: resultado.lucroApuravel,
      caixa: resultado.caixaLiquido,
      gastos: resultado.gastosOperacionais,
      proLabore: resultado.proLaboreSugerido,
      marketing: Number(marketing._sum.valorReal || 0),
    });
  }

  return historico;
}

async function montarDiagnosticoBase(mes: number, ano: number) {
  const [central, historico] = await Promise.all([
    montarCentralFinanceira(mes, ano),
    montarHistorico(mes, ano),
  ]);
  const periodo = periodoFinanceiro(mes, ano);
  const gastosVencidos = somaValores(
    central.lancamentosPendentes.filter(
      (lancamento) => lancamento.statusPagamento === "VENCIDO"
    ),
    (lancamento) => Number(lancamento.valorReal)
  );
  const comprasPendentesTotal = somaValores(
    central.comprasPendentes,
    (compra) => Number(compra.valorTotalFinal)
  );
  const proLaborePagoMes = somaValores(
    central.movimentos.filter(
      (movimento) =>
        movimento.status === "PAGA" &&
        movimento.categoria === "PRO_LABORE" &&
        (movimento.dataEfetiva || movimento.pagoEm || movimento.criadoEm) >=
          periodo.inicio &&
        (movimento.dataEfetiva || movimento.pagoEm || movimento.criadoEm) <
          periodo.fimExclusivo
    ),
    (movimento) => Number(movimento.valor)
  );
  const reservaAtual = somaValores(
    central.contas.filter((conta) =>
      `${conta.tipo} ${conta.nome}`.toLowerCase().includes("reserva")
    ),
    (conta) => conta.saldoAtual
  );
  const diagnostico = await montarInteligenciaGerencial({
    mes,
    ano,
    resultado: central.resultado,
    saldoGerencial: central.saldoGerencial,
    entradasMes: central.entradasMes,
    saidasMes: central.saidasMes,
    gastosPendentes: central.previsao.gastosPendentes,
    gastosVencidos,
    comprasPendentesTotal,
    comprasPendentesQuantidade: central.comprasPendentes.length,
    proLaboreAprovadoPendente: central.previsao.proLaborePendente,
    proLaborePagoMes,
    reservaAtual,
    historico,
  });

  return { central, diagnostico, historico };
}

function codigoRecomendacao() {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `REC-${Date.now().toString(36).toUpperCase()}-${random}`;
}

async function criarOuAtualizarRecomendacao(candidato: CandidatoRecomendacao) {
  const where: Prisma.RecomendacaoGerencialWhereInput = {
    status: { in: [...RECOMENDACAO_STATUS_ABERTOS] },
    tipo: candidato.tipo,
    origemTipo: candidato.origemTipo,
  };

  if (candidato.produtoId) {
    where.produtoId = candidato.produtoId;
  } else if (candidato.categoriaId) {
    where.categoriaId = candidato.categoriaId;
  } else if (candidato.origemId) {
    where.origemId = candidato.origemId;
  }

  const existentes = await prisma.recomendacaoGerencial.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    take: 20,
  });
  const tituloNormalizado = normalizarTexto(candidato.titulo);
  const existente = existentes.find((item) => {
    const tituloExistente = normalizarTexto(item.titulo);
    return (
      tituloExistente === tituloNormalizado ||
      tituloExistente.includes(tituloNormalizado) ||
      tituloNormalizado.includes(tituloExistente)
    );
  });
  const data = {
    tipo: candidato.tipo,
    titulo: candidato.titulo,
    descricao: candidato.descricao,
    motivo: candidato.motivo || null,
    evidenciasJson: candidato.evidenciasJson,
    impactoEsperado: candidato.impactoEsperado || null,
    risco: candidato.risco || null,
    prioridade: candidato.prioridade,
    acaoSugerida: candidato.acaoSugerida || null,
    linkAcao: candidato.linkAcao || null,
    origem: candidato.origem || null,
    origemTipo: candidato.origemTipo,
    origemId: candidato.origemId || null,
    produtoId: candidato.produtoId || null,
    categoriaId: candidato.categoriaId || null,
    periodoReferencia: candidato.periodoReferencia || null,
    prazoSugerido: candidato.prazoSugerido || null,
  };

  if (existente) {
    const recomendacao = await prisma.recomendacaoGerencial.update({
      where: { id: existente.id },
      data,
    });

    return { recomendacao, criada: false };
  }

  const recomendacao = await prisma.recomendacaoGerencial.create({
    data: {
      ...data,
      codigo: codigoRecomendacao(),
    },
  });

  return { recomendacao, criada: true };
}

function montarCandidatosFinanceiros({
  diagnostico,
  central,
  historico,
  periodoReferencia,
}: Awaited<ReturnType<typeof montarDiagnosticoBase>> & {
  periodoReferencia: string;
}) {
  const candidatos: CandidatoRecomendacao[] = [];
  const receitaAtual = diagnostico.indicadores.receitaRecebida;
  const lucroAtual = diagnostico.indicadores.lucroApuravel;
  const receitaAnterior = historico.at(-2)?.receita || 0;
  const lucroAnterior = historico.at(-2)?.lucro || 0;

  if (diagnostico.indicadores.runwayMeses < diagnostico.adaptativa.metas.reserva.minimo) {
    candidatos.push({
      tipo: "CAIXA",
      titulo: "Direcionar lucro para reserva antes de reinvestir",
      descricao:
        "A reserva atual ainda esta abaixo da faixa adaptativa recomendada para a fase da empresa.",
      motivo: diagnostico.adaptativa.metas.reserva.recomendacao,
      evidenciasJson: {
        runwayMeses: diagnostico.indicadores.runwayMeses,
        faixaReserva: diagnostico.adaptativa.metas.reserva.label,
        fase: diagnostico.adaptativa.faseLabel,
      },
      impactoEsperado: "Aumentar seguranca de caixa antes de acelerar compras e campanhas.",
      risco: "Reinvestir cedo demais pode reduzir o folego para despesas fixas.",
      prioridade: diagnostico.indicadores.runwayMeses < 1 ? "ALTA" : "MEDIA",
      acaoSugerida: "Separar caixa/reserva no fechamento do mes.",
      linkAcao: "/compras/financeiro",
      origem: "Central financeira",
      origemTipo: "FINANCEIRO_CAIXA",
      periodoReferencia,
    });
  }

  if (!diagnostico.proLabore.seguro || diagnostico.proLabore.pendente > 0) {
    candidatos.push({
      tipo: "PRO_LABORE",
      titulo: "Adiar pro-labore variavel neste ciclo",
      descricao:
        "A retirada deve respeitar lucro apuravel, pendencias e a faixa adaptativa da fase.",
      motivo: diagnostico.proLabore.recomendacao,
      evidenciasJson: {
        pago: diagnostico.proLabore.pago,
        pendente: diagnostico.proLabore.pendente,
        lucroApuravel: lucroAtual,
        faixaProLabore: diagnostico.adaptativa.metas.proLabore.label,
      },
      impactoEsperado: "Preservar caixa ate a retirada ficar segura.",
      risco: "Pagar pro-labore antes da reserva pode pressionar o caixa.",
      prioridade: diagnostico.proLabore.seguro ? "MEDIA" : "ALTA",
      acaoSugerida: "Revisar retirada no Resultado e Distribuicao.",
      linkAcao: "/compras/resultado",
      origem: "Resultado e distribuicao",
      origemTipo: "FINANCEIRO_PRO_LABORE",
      periodoReferencia,
    });
  }

  if (
    diagnostico.marketing.percentual >
    diagnostico.adaptativa.metas.marketingPago.maximo
  ) {
    candidatos.push({
      tipo: "MARKETING",
      titulo: "Reduzir marketing pago temporariamente",
      descricao:
        "Marketing pago esta acima da faixa adaptativa para a fase e deve voltar a uma zona controlada.",
      motivo: diagnostico.marketing.recomendacao,
      evidenciasJson: {
        marketingPercentual: diagnostico.marketing.percentual,
        faixaMarketing: diagnostico.adaptativa.metas.marketingPago.label,
        marketingValor: diagnostico.marketing.valor,
      },
      impactoEsperado: "Reduzir saida de caixa e medir campanhas por produto/canal.",
      risco: "Trazer trafego antes de reposicao, oferta e margem pode queimar caixa.",
      prioridade: "ALTA",
      acaoSugerida: "Revisar gastos de marketing do mes.",
      linkAcao: "/compras/gastos",
      origem: "Central financeira",
      origemTipo: "FINANCEIRO_MARKETING",
      periodoReferencia,
    });
  }

  if (diagnostico.indicadores.gastosOperacionaisPct > 30) {
    candidatos.push({
      tipo: "FINANCEIRO",
      titulo: "Reduzir gastos operacionais antes de acelerar",
      descricao:
        "Gastos operacionais estao altos frente a receita recebida do periodo.",
      motivo:
        "Segurar novas despesas ate receita, caixa e confianca justificarem aumento.",
      evidenciasJson: {
        gastosOperacionaisPct: diagnostico.indicadores.gastosOperacionaisPct,
        gastosOperacionais: diagnostico.indicadores.gastosOperacionaisPercentual,
      },
      impactoEsperado: "Melhorar margem liquida e liberar caixa para prioridade real.",
      risco: "Gasto fixo alto reduz margem de manobra em meses mais fracos.",
      prioridade:
        diagnostico.indicadores.gastosOperacionaisPct > 45 ? "ALTA" : "MEDIA",
      acaoSugerida: "Revisar gastos financeiros em aberto.",
      linkAcao: "/compras/gastos",
      origem: "Central financeira",
      origemTipo: "FINANCEIRO_GASTOS",
      periodoReferencia,
    });
  }

  if (central.comprasPendentes.length > 0) {
    candidatos.push({
      tipo: "CAIXA",
      titulo: "Considerar compras pendentes antes de novas saidas",
      descricao:
        "Compras pendentes ainda podem pressionar o caixa gerencial quando forem pagas.",
      motivo: diagnostico.estoque.recomendacao,
      evidenciasJson: {
        comprasPendentes: central.comprasPendentes.length,
        valorPendente: diagnostico.indicadores.comprasEstoquePendentes,
      },
      impactoEsperado: "Evitar sobreposicao de novas compras com compromissos ja assumidos.",
      risco: "Comprar novamente sem descontar pendencias pode distorcer o caixa real.",
      prioridade: "MEDIA",
      acaoSugerida: "Conferir compras pendentes na Central Financeira.",
      linkAcao: "/compras/financeiro",
      origem: "Central financeira",
      origemTipo: "FINANCEIRO_COMPRAS_PENDENTES",
      periodoReferencia,
    });
  }

  if (lucroAtual < 0) {
    candidatos.push({
      tipo: "FINANCEIRO",
      titulo: "Revisar margem e gastos antes de distribuir resultado",
      descricao:
        "O mes ainda nao gerou lucro apuravel positivo para distribuicao segura.",
      motivo: diagnostico.leituraResultado.texto,
      evidenciasJson: {
        lucroApuravel: lucroAtual,
        margemLiquidaPct: diagnostico.indicadores.margemLiquidaPct,
      },
      impactoEsperado: "Evitar distribuicao em mes deficitario.",
      risco: "Distribuir resultado negativo reduz caixa e dificulta reposicao seletiva.",
      prioridade: "ALTA",
      acaoSugerida: "Revisar Resultado e Distribuicao.",
      linkAcao: "/compras/resultado",
      origem: "Resultado e distribuicao",
      origemTipo: "FINANCEIRO_RESULTADO_NEGATIVO",
      periodoReferencia,
    });
  }

  if (receitaAnterior > 0 && receitaAtual > receitaAnterior && lucroAtual < lucroAnterior) {
    candidatos.push({
      tipo: "CRESCIMENTO",
      titulo: "Investigar crescimento com lucro caindo",
      descricao:
        "A receita cresceu frente ao periodo anterior, mas o lucro apuravel caiu.",
      motivo:
        "Crescimento saudavel precisa preservar margem, caixa e custo de aquisicao.",
      evidenciasJson: {
        receitaAtual,
        receitaAnterior,
        lucroAtual,
        lucroAnterior,
      },
      impactoEsperado: "Separar crescimento saudavel de faturamento com margem comprimida.",
      risco: "Escalar venda com lucro menor pode piorar caixa e reposicao.",
      prioridade: "MEDIA",
      acaoSugerida: "Comparar gastos, marketing e margem no Resultado.",
      linkAcao: "/compras/resultado",
      origem: "Resultado e distribuicao",
      origemTipo: "FINANCEIRO_CRESCIMENTO",
      periodoReferencia,
    });
  }

  return candidatos;
}

async function montarCandidatosProduto(periodoReferencia: string) {
  const candidatos: CandidatoRecomendacao[] = [];
  const contexto = await montarInteligenciaAdaptativaAtual();
  const snapshotsRaw = await prisma.produtoMetricaSnapshot.findMany({
    where: {
      periodoTipo: "ATUAL",
      produto: {
        ativo: true,
        status: { not: "NA_LIXEIRA" },
      },
    },
    include: {
      produto: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          categoria: true,
          custoBase: true,
          precoVenda: true,
        },
      },
    },
    orderBy: [{ scoreValidacao: "desc" }, { criadoEm: "desc" }],
    take: 80,
  });
  const snapshotsPorProduto = new Map<string, (typeof snapshotsRaw)[number]>();

  snapshotsRaw.forEach((snapshot) => {
    const atual = snapshotsPorProduto.get(snapshot.produtoId);
    if (!atual || snapshot.tamanhoAnel === "TODOS") {
      snapshotsPorProduto.set(snapshot.produtoId, snapshot);
    }
  });

  const snapshots = Array.from(snapshotsPorProduto.values()).slice(0, 40);

  for (const snapshot of snapshots) {
    const produto = snapshot.produto;
    const intencao = extrairIntencaoSnapshot(snapshot.dadosJson);
    const margemEstimadaPct =
      produto.precoVenda > 0
        ? arredondar(((produto.precoVenda - produto.custoBase) / produto.precoVenda) * 100)
        : 0;
    const decisao = avaliarCompraLoteProduto({
      fase: contexto.fase,
      confiancaAnalise: contexto.confiancaAnalise,
      caixaDisponivel: contexto.caixaDisponivel,
      statusComercial: snapshot.statusComercial,
      recomendacaoReposicao: snapshot.recomendacao,
      confiancaReposicao: snapshot.scoreValidacao,
      vendasQuantidade: snapshot.vendasQuantidade,
      estoqueAtual: snapshot.estoqueFinal,
      sugestaoQuantidade:
        snapshot.recomendacao === "REPOR_LOTE_MEDIO"
          ? 5
          : snapshot.recomendacao === "REPOR_LOTE_GRANDE"
            ? 8
            : snapshot.recomendacao === "REPOR_PEQUENO"
              ? 2
              : 0,
      custoUnitario: produto.custoBase,
      margemEstimadaPct,
      intencao,
    });
    const evidenciaBase = {
      produto: produto.codigoInterno,
      statusComercial: snapshot.statusComercial,
      recomendacao: snapshot.recomendacao,
      scoreValidacao: snapshot.scoreValidacao,
      vendasQuantidade: snapshot.vendasQuantidade,
      estoqueFinal: snapshot.estoqueFinal,
      sellThrough: snapshot.sellThroughAcumulado,
      decisaoLote: decisao.decisao,
      loteGrandeLiberado: decisao.loteGrandeLiberado,
    };

    if (
      ["CAMPEAO_PROVAVEL", "RISCO_RUPTURA", "REPOSICAO_CONFIRMADA"].includes(
        snapshot.statusComercial
      ) &&
      snapshot.estoqueFinal <= 3
    ) {
      candidatos.push({
        tipo: "REPOSICAO",
        titulo: `Priorizar reposicao pequena de ${produto.codigoInterno}`,
        descricao: `${produto.nome} tem sinal comercial forte e estoque baixo.`,
        motivo: decisao.motivo,
        evidenciasJson: evidenciaBase,
        impactoEsperado: "Evitar ruptura sem assumir lote grande cedo demais.",
        risco: "Sem reposicao seletiva, a vitrine pode perder produto validado.",
        prioridade: "ALTA",
        acaoSugerida: decisao.loteGrandeLiberado
          ? "Avaliar lote maior com caixa confirmado."
          : "Repor pequeno ou medio conforme decisao de lote.",
        linkAcao: "/compras/reposicao",
        origem: "Reposicao inteligente",
        origemTipo: "REPOSICAO_PRODUTO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (
      snapshot.statusComercial === "PROMISSOR" &&
      snapshot.estoqueFinal <= 5
    ) {
      candidatos.push({
        tipo: "REPOSICAO",
        titulo: `Repor pequeno produto promissor ${produto.codigoInterno}`,
        descricao: `${produto.nome} tem sinal inicial e pede reposicao pequena, nao lote grande.`,
        motivo: decisao.motivo,
        evidenciasJson: evidenciaBase,
        impactoEsperado: "Preservar aprendizado com baixo risco de estoque.",
        risco: "Comprar grande com pouca amostra pode travar caixa em estoque.",
        prioridade: "MEDIA",
        acaoSugerida: "Repor pequeno e acompanhar novo ciclo.",
        linkAcao: "/compras/reposicao",
        origem: "Reposicao inteligente",
        origemTipo: "REPOSICAO_PRODUTO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (!decisao.loteGrandeLiberado && snapshot.vendasQuantidade <= 2) {
      candidatos.push({
        tipo: "REPOSICAO",
        titulo: `Nao comprar lote grande ainda de ${produto.codigoInterno}`,
        descricao:
          "A regra adaptativa bloqueia lote grande ate haver repeticao de ciclo ou padrao forte.",
        motivo: decisao.motivo,
        evidenciasJson: evidenciaBase,
        impactoEsperado: "Evitar excesso de estoque antes de validacao recorrente.",
        risco: "Uma venda de poucas pecas nao confirma lote grande.",
        prioridade: "MEDIA",
        acaoSugerida: "Repor pequeno, expor mais ou observar conforme o caso.",
        linkAcao: "/compras/reposicao",
        origem: "Decisao de lote",
        origemTipo: "REPOSICAO_LOTE",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (
      snapshot.statusComercial === "INTERESSE_SEM_CONVERSAO" ||
      snapshot.recomendacao === "REVISAR_OFERTA"
    ) {
      candidatos.push({
        tipo: "LOJA",
        titulo: `Revisar oferta de ${produto.codigoInterno}`,
        descricao: `${produto.nome} desperta interesse, mas ainda nao converte como deveria.`,
        motivo: intencao.interpretacao,
        evidenciasJson: {
          ...evidenciaBase,
          visualizacoes: intencao.visualizacoes,
          favoritos: intencao.favoritos,
          carrinhos: intencao.adicoesCarrinho,
          taxaConversao: intencao.taxaConversao,
        },
        impactoEsperado: "Melhorar conversao antes de recomprar.",
        risco: "Comprar mais pode repetir o gargalo de oferta.",
        prioridade: "ALTA",
        acaoSugerida: "Revisar preco, foto, descricao, frete ou oferta.",
        linkAcao: `/produtos/${produto.id}`,
        origem: "Intencao comercial",
        origemTipo: "INTENCAO_PRODUTO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (
      snapshot.statusComercial === "NAO_TESTADO" ||
      snapshot.recomendacao === "EXPOR_MAIS"
    ) {
      candidatos.push({
        tipo: "LOJA",
        titulo: `Expor produto pouco testado ${produto.codigoInterno}`,
        descricao: `${produto.nome} ainda precisa de mais vitrine antes de conclusao comercial.`,
        motivo: intencao.interpretacao,
        evidenciasJson: evidenciaBase,
        impactoEsperado: "Aumentar amostra real antes de comprar ou cortar margem.",
        risco: "Tratar pouca exposicao como produto ruim pode matar um item promissor.",
        prioridade: "BAIXA",
        acaoSugerida: "Colocar em Home, vitrine editorial, busca ou conteudo organico.",
        linkAcao: `/produtos/${produto.id}`,
        origem: "Intencao comercial",
        origemTipo: "INTENCAO_PRODUTO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (
      snapshot.statusComercial === "ESTOQUE_PARADO" ||
      snapshot.recomendacao === "LIQUIDAR_COM_CUIDADO"
    ) {
      candidatos.push({
        tipo: "ESTOQUE",
        titulo: `Criar campanha para estoque parado ${produto.codigoInterno}`,
        descricao: `${produto.nome} deve girar antes de nova recompra.`,
        motivo: decisao.margem.recomendacao,
        evidenciasJson: evidenciaBase,
        impactoEsperado: "Liberar capital parado com campanha controlada.",
        risco: "Recomprar item parado aumenta estoque sem giro.",
        prioridade: "MEDIA",
        acaoSugerida: "Criar campanha, kit ou destaque com desconto controlado.",
        linkAcao: `/produtos/${produto.id}`,
        origem: "Metricas de produto",
        origemTipo: "PRODUTO_ESTOQUE_PARADO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (decisao.margem.acao === "PROTEGER") {
      candidatos.push({
        tipo: "PRECIFICACAO",
        titulo: `Proteger margem de ${produto.codigoInterno}`,
        descricao: `${produto.nome} tem sinal comercial que pede preservar preco e margem.`,
        motivo: decisao.margem.recomendacao,
        evidenciasJson: evidenciaBase,
        impactoEsperado: "Preservar lucro em produto validado ou com ruptura.",
        risco: "Desconto em campeao pode reduzir margem sem necessidade.",
        prioridade: ["RISCO_RUPTURA", "CAMPEAO_PROVAVEL"].includes(
          snapshot.statusComercial
        )
          ? "ALTA"
          : "MEDIA",
        acaoSugerida: "Evitar desconto amplo; testar destaque, kit ou vitrine.",
        linkAcao: `/produtos/${produto.id}`,
        origem: "Precificacao adaptativa",
        origemTipo: "PRECIFICACAO_PRODUTO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }
  }

  return candidatos;
}

async function montarCandidatosIntencao(periodoReferencia: string) {
  const candidatos: CandidatoRecomendacao[] = [];
  const intencao = await montarIntencaoComercial({ dias: 30 });
  const produtosRiscoRuptura = intencao.produtos
    .filter(
      (produto) =>
        produto.estoqueTotal <= 1 &&
        (produto.vendasQuantidade > 0 ||
          produto.scoreInteresse >= 30 ||
          produto.adicoesCarrinho >= 2 ||
          produto.favoritos >= 3)
    )
    .slice(0, 8);

  for (const produto of intencao.produtosTravados.slice(0, 8)) {
    candidatos.push({
      tipo: "LOJA",
      titulo: `Revisar oferta de produto com interesse ${produto.codigoInterno}`,
      descricao: `${produto.nome} recebeu sinais de interesse sem conversao suficiente.`,
      motivo: produto.diagnostico,
      evidenciasJson: {
        visualizacoes: produto.visualizacoes,
        favoritos: produto.favoritos,
        carrinhos: produto.adicoesCarrinho,
        taxaConversao: produto.taxaConversao,
      },
      impactoEsperado: "Aumentar conversao antes de recompra.",
      risco: "Sem ajuste de oferta, a recompra pode aumentar estoque parado.",
      prioridade: "ALTA",
      acaoSugerida: "Revisar preco, foto, descricao, frete ou oferta.",
      linkAcao: `/produtos/${produto.produtoId}`,
      origem: "Intencao comercial",
      origemTipo: "INTENCAO_PRODUTO",
      origemId: produto.produtoId,
      produtoId: produto.produtoId,
      periodoReferencia,
    });
  }

  for (const produto of intencao.produtosPoucoTestados.slice(0, 8)) {
    candidatos.push({
      tipo: "LOJA",
      titulo: `Expor produto pouco testado ${produto.codigoInterno}`,
      descricao: `${produto.nome} precisa de mais exposicao antes de decisao de compra.`,
      motivo: "Produto pouco testado nao deve ser considerado ruim; precisa de mais amostra.",
      evidenciasJson: {
        visualizacoes: produto.visualizacoes,
        favoritos: produto.favoritos,
        carrinhos: produto.adicoesCarrinho,
        scoreInteresse: produto.scoreInteresse,
      },
      impactoEsperado: "Gerar dados reais antes de reposicao, desconto ou descarte.",
      risco: "Baixa amostra pode levar a decisao errada.",
      prioridade: "BAIXA",
      acaoSugerida: "Expor na Home, vitrine editorial ou conteudo organico.",
      linkAcao: `/produtos/${produto.produtoId}`,
      origem: "Intencao comercial",
      origemTipo: "INTENCAO_PRODUTO",
      origemId: produto.produtoId,
      produtoId: produto.produtoId,
      periodoReferencia,
    });
  }

  for (const produto of produtosRiscoRuptura) {
    candidatos.push({
      tipo: "REPOSICAO",
      titulo: `Proteger margem e ruptura de ${produto.codigoInterno}`,
      descricao: `${produto.nome} tem estoque baixo e sinais de interesse/venda.`,
      motivo: produto.diagnostico,
      evidenciasJson: {
        estoqueTotal: produto.estoqueTotal,
        visualizacoes: produto.visualizacoes,
        favoritos: produto.favoritos,
        carrinhos: produto.adicoesCarrinho,
        vendas: produto.vendasQuantidade,
      },
      impactoEsperado: "Evitar ruptura e preservar margem de produto desejado.",
      risco: "Aumentar campanha sem estoque pode desperdiçar demanda.",
      prioridade: "ALTA",
      acaoSugerida: "Repor seletivamente e evitar desconto amplo.",
      linkAcao: "/compras/reposicao",
      origem: "Intencao comercial",
      origemTipo: "INTENCAO_RUPTURA",
      origemId: produto.produtoId,
      produtoId: produto.produtoId,
      periodoReferencia,
    });
  }

  for (const busca of intencao.buscasSemResultado.slice(0, 8)) {
    if (busca.quantidade < 2) continue;

    candidatos.push({
      tipo: "LOJA",
      titulo: `Tratar busca sem resultado: ${busca.termo}`,
      descricao:
        "Busca recorrente sem resultado pode indicar ajuste de termos, tags, categoria ou compra futura.",
      motivo: `${busca.quantidade} busca(s) sem resultado nos ultimos 30 dias.`,
      evidenciasJson: {
        termo: busca.termo,
        quantidade: busca.quantidade,
      },
      impactoEsperado: "Reduzir perda de intencao na loja.",
      risco: "Cliente com intencao clara pode sair sem encontrar produto.",
      prioridade: busca.quantidade >= 5 ? "MEDIA" : "BAIXA",
      acaoSugerida: "Criar tag, ajustar termos de busca ou planejar compra futura.",
      linkAcao: `/loja/busca?q=${encodeURIComponent(busca.termo)}`,
      origem: "Busca da loja",
      origemTipo: "INTENCAO_BUSCA",
      origemId: normalizarTexto(busca.termo),
      periodoReferencia,
    });
  }

  for (const conteudo of intencao.conteudosClicados.slice(0, 5)) {
    if (conteudo.quantidade < 5) continue;

    candidatos.push({
      tipo: "LOJA",
      titulo: `Aproveitar vitrine com muitos cliques: ${conteudo.label}`,
      descricao:
        "Conteudo com clique recorrente pode direcionar exposicao e reposicao seletiva.",
      motivo: `${conteudo.quantidade} clique(s) no periodo analisado.`,
      evidenciasJson: {
        tipo: conteudo.tipo,
        blocoId: conteudo.blocoId,
        href: conteudo.href,
        quantidade: conteudo.quantidade,
      },
      impactoEsperado: "Concentrar exposicao onde ja existe atencao.",
      risco: "Ignorar vitrines clicadas pode desperdiçar demanda organica.",
      prioridade: "BAIXA",
      acaoSugerida: "Revisar vitrine e conectar produtos promissores.",
      linkAcao: conteudo.href,
      origem: "Intencao comercial",
      origemTipo: "INTENCAO_CONTEUDO",
      origemId: conteudo.chave,
      periodoReferencia,
    });
  }

  return candidatos;
}

export async function gerarRecomendacoesGerenciais(
  params: GerarRecomendacoesParams = {}
) {
  const atual = mesAnoAtual();
  const mes = params.mes || atual.mes;
  const ano = params.ano || atual.ano;
  const periodoReferencia = mesLabel(mes, ano);
  const [base, candidatosProduto, candidatosIntencao] = await Promise.all([
    montarDiagnosticoBase(mes, ano),
    montarCandidatosProduto(periodoReferencia),
    montarCandidatosIntencao(periodoReferencia),
  ]);
  const candidatos = [
    ...montarCandidatosFinanceiros({
      ...base,
      periodoReferencia,
    }),
    ...candidatosProduto,
    ...candidatosIntencao,
  ];
  const titulosUnicos = new Set<string>();
  const candidatosUnicos = candidatos.filter((candidato) => {
    const chave = [
      candidato.tipo,
      candidato.origemTipo,
      candidato.origemId || "",
      candidato.produtoId || "",
      candidato.categoriaId || "",
      normalizarTexto(candidato.titulo),
    ].join("|");

    if (titulosUnicos.has(chave)) return false;
    titulosUnicos.add(chave);
    return true;
  });
  const criadas: RecomendacaoGerencial[] = [];
  const atualizadas: RecomendacaoGerencial[] = [];

  for (const candidato of candidatosUnicos) {
    const result = await criarOuAtualizarRecomendacao(candidato);

    if (result.criada) {
      criadas.push(result.recomendacao);
    } else {
      atualizadas.push(result.recomendacao);
    }
  }

  const abertas = await prisma.recomendacaoGerencial.count({
    where: {
      status: { in: [...RECOMENDACAO_STATUS_ABERTOS] },
    },
  });

  return {
    periodoReferencia,
    candidatos: candidatosUnicos.length,
    criadas,
    atualizadas,
    totalAbertas: abertas,
    porTipo: RECOMENDACAO_TIPOS.reduce<Record<string, number>>((acc, tipo) => {
      acc[tipo] = candidatosUnicos.filter((item) => item.tipo === tipo).length;
      return acc;
    }, {}),
  };
}

export async function atualizarStatusRecomendacaoGerencial({
  id,
  acao,
  resultadoObservado,
  observacao,
  prazoSugerido,
}: {
  id: string;
  acao: string;
  resultadoObservado?: string | null;
  observacao?: string | null;
  prazoSugerido?: Date | null;
}) {
  const agora = new Date();
  const acaoNormalizada = normalizarTexto(acao).replaceAll(" ", "_").toUpperCase();
  const data: Prisma.RecomendacaoGerencialUpdateInput = {};

  if (acaoNormalizada === "ACEITAR" || acaoNormalizada === "ACEITA") {
    data.status = "ACEITA";
    data.aceitaEm = agora;
  } else if (
    acaoNormalizada === "INICIAR" ||
    acaoNormalizada === "EM_EXECUCAO"
  ) {
    data.status = "EM_EXECUCAO";
    data.iniciadaEm = agora;
    data.aceitaEm = agora;
  } else if (
    acaoNormalizada === "CONCLUIR" ||
    acaoNormalizada === "CONCLUIDA"
  ) {
    data.status = "CONCLUIDA";
    data.concluidaEm = agora;
    if (resultadoObservado) data.resultadoObservado = resultadoObservado;
  } else if (
    acaoNormalizada === "IGNORAR" ||
    acaoNormalizada === "IGNORADA"
  ) {
    data.status = "IGNORADA";
    data.ignoradaEm = agora;
    if (observacao) data.observacao = observacao;
  } else if (acaoNormalizada === "ADIAR" || acaoNormalizada === "ADIADA") {
    data.status = "ADIADA";
    data.adiadaEm = agora;
    if (prazoSugerido) data.prazoSugerido = prazoSugerido;
    if (observacao) data.observacao = observacao;
  } else {
    throw new Error("Acao invalida para recomendacao gerencial.");
  }

  if (observacao && !data.observacao) data.observacao = observacao;

  return prisma.recomendacaoGerencial.update({
    where: { id },
    data,
  });
}

export async function obterResumoRecomendacoes() {
  const grupos = await prisma.recomendacaoGerencial.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const resumo = Object.fromEntries(
    RECOMENDACAO_STATUS.map((status) => [status, 0])
  ) as Record<RecomendacaoStatus, number>;

  grupos.forEach((grupo) => {
    if (RECOMENDACAO_STATUS.includes(grupo.status as RecomendacaoStatus)) {
      resumo[grupo.status as RecomendacaoStatus] = grupo._count._all;
    }
  });

  return resumo;
}

export function filtrarTiposUnicos(recomendacoes: RecomendacaoGerencial[]) {
  return unique(recomendacoes.map((item) => item.tipo)).sort();
}
