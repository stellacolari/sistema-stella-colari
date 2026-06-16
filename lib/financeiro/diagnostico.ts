import "server-only";

import { prisma } from "@/lib/prisma";
import { periodoFinanceiro, type ResultadoMensalCalculado } from "@/lib/financeiro/resultado";

export type StatusSaudeFinanceira = "SAUDAVEL" | "ATENCAO" | "RISCO" | "CRITICO";

export type SeveridadeDiagnostico = "INFO" | "ATENCAO" | "RISCO" | "CRITICO";

export type DiagnosticoAlerta = {
  tipo: string;
  severidade: SeveridadeDiagnostico;
  titulo: string;
  texto: string;
  recomendacao: string;
  acaoLabel?: string;
  href?: string;
};

export type DiagnosticoIndicadores = {
  margemBrutaPct: number;
  margemLiquidaPct: number;
  gastosOperacionaisPct: number;
  marketingPct: number;
  runwayMeses: number;
  comprasEstoquePct: number;
  proLaborePendente: number;
  estoqueBaixo: number;
  estoqueZerado: number;
};

export type DiagnosticoProdutoGiro = {
  codigo: string;
  nome: string;
  categoria: string;
  estoque: number;
  vendidas: number;
  receita: number;
};

export type DiagnosticoEstoque = {
  produtosZerados: number;
  produtosBaixo: number;
  produtosParados: number;
  topProdutos: DiagnosticoProdutoGiro[];
  recomendacao: string;
};

export type DiagnosticoPrevisaoCenario = {
  nome: "Conservador" | "Realista" | "Otimista";
  receita: number;
  caixaProjetado: number;
};

export type DiagnosticoPrevisao = {
  baseReceita: number;
  gastosRecorrentes: number;
  pendencias: number;
  texto: string;
  cenarios: DiagnosticoPrevisaoCenario[];
};

export type DiagnosticoFinanceiro = {
  status: StatusSaudeFinanceira;
  score: number;
  frase: string;
  indicadores: DiagnosticoIndicadores;
  alertas: DiagnosticoAlerta[];
  recomendacoes: string[];
  semaforoCaixa: {
    cor: "VERDE" | "AMARELO" | "VERMELHO";
    texto: string;
  };
  marketing: {
    valor: number;
    percentual: number;
    faixaIdeal: string;
    recomendacao: string;
  };
  proLabore: {
    sugerido: number;
    aprovado: number;
    pago: number;
    pendente: number;
    seguro: boolean;
    recomendacao: string;
  };
  reinvestimento: {
    recomendacoes: string[];
  };
  estoque: DiagnosticoEstoque;
  previsao: DiagnosticoPrevisao;
  leituraResultado: {
    rentavel: boolean;
    distribuicaoSegura: boolean;
    texto: string;
    recomendacaoProLabore: string;
    recomendacaoEmpresa: string;
  };
  roadmap: {
    mes1: string[];
    mes2: string[];
    mes3: string[];
  };
};

export type HistoricoDiagnosticoItem = {
  receita: number;
  lucro: number;
  gastos: number;
  marketing: number;
};

export type MontarDiagnosticoFinanceiroParams = {
  mes: number;
  ano: number;
  resultado: ResultadoMensalCalculado;
  saldoGerencial: number;
  entradasMes: number;
  saidasMes: number;
  gastosPendentes: number;
  gastosVencidos: number;
  comprasPendentesTotal: number;
  comprasPendentesQuantidade: number;
  proLaboreAprovadoPendente: number;
  proLaborePagoMes: number;
  reservaAtual?: number;
  historico: HistoricoDiagnosticoItem[];
};

type ResumoEstoqueCalculado = {
  produtosZerados: number;
  produtosBaixo: number;
  produtosParados: number;
  topProdutos: DiagnosticoProdutoGiro[];
};

const STATUS_PEDIDO_INVALIDO = ["CANCELADO", "EXPIRADO", "RECUSADO"];
const TIPOS_MARKETING = ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"];

function numero(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function arredondar(value: number) {
  return Math.round((numero(value) + Number.EPSILON) * 100) / 100;
}

function percentual(parte: number, total: number) {
  if (!total) return 0;
  return arredondar((numero(parte) / numero(total)) * 100);
}

function media(values: number[]) {
  const validos = values.map(numero).filter((value) => Number.isFinite(value));
  if (validos.length === 0) return 0;
  return arredondar(validos.reduce((total, value) => total + value, 0) / validos.length);
}

function soma<T>(items: T[], selector: (item: T) => number) {
  return arredondar(items.reduce((total, item) => total + numero(selector(item)), 0));
}

function limitarScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusPorScore(score: number): StatusSaudeFinanceira {
  if (score >= 80) return "SAUDAVEL";
  if (score >= 60) return "ATENCAO";
  if (score >= 40) return "RISCO";
  return "CRITICO";
}

function severidadePeso(severidade: SeveridadeDiagnostico) {
  if (severidade === "CRITICO") return 30;
  if (severidade === "RISCO") return 18;
  if (severidade === "ATENCAO") return 8;
  return 2;
}

function criarAlerta(
  alertas: DiagnosticoAlerta[],
  alerta: DiagnosticoAlerta
) {
  alertas.push(alerta);
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
    _sum: {
      valorReal: true,
    },
  });

  return arredondar(Number(marketing._sum.valorReal || 0));
}

async function calcularGastosRecorrentes() {
  const recorrentes = await prisma.lancamentoFinanceiro.findMany({
    where: {
      status: { not: "NA_LIXEIRA" },
      statusPagamento: { not: "CANCELADO" },
      recorrente: true,
    },
    select: {
      valorReal: true,
      valorPrevisto: true,
      tipo: true,
    },
  });

  return soma(recorrentes, (item) => numero(item.valorReal) || numero(item.valorPrevisto));
}

async function calcularEstoqueEGiro(mes: number, ano: number): Promise<ResumoEstoqueCalculado> {
  const periodo = periodoFinanceiro(mes, ano);
  const inicioHistorico = new Date(ano, mes - 7, 1);
  const [produtos, vendaItens, pedidoItens] = await Promise.all([
    prisma.produto.findMany({
      where: {
        ativo: true,
        status: { not: "NA_LIXEIRA" },
      },
      include: {
        estoque: true,
      },
      orderBy: { nome: "asc" },
    }),
    prisma.vendaItem.findMany({
      where: {
        venda: {
          criadoEm: {
            gte: inicioHistorico,
            lt: periodo.fimExclusivo,
          },
          status: {
            notIn: ["CANCELADA", "NA_LIXEIRA"],
          },
        },
      },
      include: {
        produto: true,
      },
    }),
    prisma.pedidoOnlineItem.findMany({
      where: {
        pedidoOnline: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          status: {
            notIn: STATUS_PEDIDO_INVALIDO,
          },
          pagoEm: {
            gte: inicioHistorico,
            lt: periodo.fimExclusivo,
          },
        },
      },
    }),
  ]);

  const vendasPorCodigo = new Map<string, DiagnosticoProdutoGiro>();

  function adicionarVenda(params: {
    codigo: string;
    nome: string;
    categoria: string;
    quantidade: number;
    receita: number;
  }) {
    const atual =
      vendasPorCodigo.get(params.codigo) ||
      {
        codigo: params.codigo,
        nome: params.nome,
        categoria: params.categoria,
        estoque: 0,
        vendidas: 0,
        receita: 0,
      };

    atual.vendidas += numero(params.quantidade);
    atual.receita = arredondar(atual.receita + numero(params.receita));
    vendasPorCodigo.set(params.codigo, atual);
  }

  vendaItens.forEach((item) => {
    adicionarVenda({
      codigo: item.produto.codigoInterno,
      nome: item.produto.nome,
      categoria: item.produto.categoria,
      quantidade: item.quantidade,
      receita: item.valorTotal,
    });
  });

  pedidoItens.forEach((item) => {
    adicionarVenda({
      codigo: item.codigoInterno || item.produtoId || item.nomeProduto,
      nome: item.nomeProduto,
      categoria: item.categoria || "Sem categoria",
      quantidade: item.quantidade,
      receita: item.total,
    });
  });

  const produtosResumo = produtos.map((produto) => {
    const estoque = soma(produto.estoque, (item) => item.quantidadeAtual);
    const venda = vendasPorCodigo.get(produto.codigoInterno);
    const resumo = {
      codigo: produto.codigoInterno,
      nome: produto.nome,
      categoria: produto.categoria,
      estoque,
      vendidas: venda?.vendidas || 0,
      receita: venda?.receita || 0,
    };

    if (venda) {
      venda.estoque = estoque;
      venda.nome = produto.nome;
      venda.categoria = produto.categoria;
    }

    return resumo;
  });

  const produtosZerados = produtosResumo.filter((produto) => produto.estoque <= 0).length;
  const produtosBaixo = produtosResumo.filter((produto) => produto.estoque > 0 && produto.estoque <= 6).length;
  const produtosParados = produtosResumo.filter(
    (produto) => produto.estoque > 0 && produto.vendidas === 0
  ).length;
  const topProdutos = [...vendasPorCodigo.values()]
    .sort((a, b) => b.vendidas - a.vendidas || b.receita - a.receita)
    .slice(0, 5);

  return {
    produtosZerados,
    produtosBaixo,
    produtosParados,
    topProdutos,
  };
}

function calcularRunway(saldoGerencial: number, historico: HistoricoDiagnosticoItem[], gastosAtuais: number) {
  const historicoComGastos = historico
    .slice(-3)
    .map((item) => item.gastos)
    .filter((value) => value > 0);
  const baseGastos = media(historicoComGastos) || gastosAtuais;

  if (baseGastos <= 0) return 99;
  return arredondar(saldoGerencial / baseGastos);
}

function montarFrase(status: StatusSaudeFinanceira, alertas: DiagnosticoAlerta[]) {
  const principal = alertas[0];

  if (status === "SAUDAVEL") {
    return principal
      ? `A empresa esta saudavel neste mes, com margem e caixa confortaveis. O principal ponto de atencao e ${principal.titulo.toLowerCase()}.`
      : "A empresa esta saudavel neste mes, com margem forte, lucro positivo e caixa confortavel.";
  }

  if (status === "ATENCAO") {
    return principal
      ? `A operacao segue viavel, mas pede atencao: ${principal.titulo.toLowerCase()}.`
      : "A operacao segue viavel, mas alguns indicadores estao perto do limite.";
  }

  if (status === "RISCO") {
    return principal
      ? `A operacao exige ajuste gerencial agora: ${principal.titulo.toLowerCase()}.`
      : "A operacao apresenta risco financeiro e precisa de ajuste de gastos, margem ou caixa.";
  }

  return "A operacao esta em estado critico e exige preservacao imediata de caixa.";
}

function montarRoadmap(status: StatusSaudeFinanceira) {
  const focoCaixa = status === "RISCO" || status === "CRITICO";

  return {
    mes1: [
      "Validar ticket medio e margem por categoria.",
      "Vender 30% a 40% do estoque inicial.",
      "Medir produtos campeoes e itens sem giro.",
      focoCaixa ? "Congelar gastos externos nao essenciais." : "Preservar reserva minima.",
    ],
    mes2: [
      "Repor somente campeoes com venda recente.",
      "Organizar campanhas organicas.",
      "Testar trafego baixo apenas se margem permitir.",
      "Controlar pro-labore pelo caixa realizado.",
    ],
    mes3: [
      "Escalar produtos vencedores.",
      "Revisar precos e margens.",
      "Formar reserva de 2 a 3 meses.",
      "Criar calendario de campanhas.",
    ],
  };
}

export async function montarDiagnosticoFinanceiro(
  params: MontarDiagnosticoFinanceiroParams
): Promise<DiagnosticoFinanceiro> {
  const [marketingPago, gastosRecorrentes, estoque] = await Promise.all([
    calcularMarketingPago(params.mes, params.ano),
    calcularGastosRecorrentes(),
    calcularEstoqueEGiro(params.mes, params.ano),
  ]);

  const receita = params.resultado.receitaRecebida;
  const lucro = params.resultado.lucroApuravel;
  const margemBrutaPct = percentual(params.resultado.resultadoBruto, receita);
  const margemLiquidaPct = percentual(lucro, receita);
  const gastosOperacionaisPct = percentual(params.resultado.gastosOperacionais, receita);
  const marketingPct = percentual(marketingPago, receita);
  const runwayMeses = calcularRunway(
    params.saldoGerencial,
    params.historico,
    params.resultado.gastosOperacionais
  );
  const comprasBase = Math.max(receita, params.entradasMes);
  const comprasEstoquePct = percentual(params.resultado.comprasEstoqueCaixa, comprasBase);
  const proLaborePendente = params.proLaboreAprovadoPendente;
  const proLaborePago = params.proLaborePagoMes;
  const proLaboreSeguro =
    proLaborePago <= Math.max(0, lucro) &&
    proLaborePendente <= Math.max(0, params.saldoGerencial - params.resultado.gastosOperacionais);
  const alertas: DiagnosticoAlerta[] = [];

  if (params.saldoGerencial < 0) {
    criarAlerta(alertas, {
      tipo: "CAIXA_NEGATIVO",
      severidade: "CRITICO",
      titulo: "Caixa negativo",
      texto: "O caixa gerencial esta abaixo de zero.",
      recomendacao: "Suspender saidas nao essenciais e revisar pendencias imediatamente.",
      acaoLabel: "Ver caixa",
      href: "/compras/financeiro",
    });
  }

  if (lucro < 0) {
    criarAlerta(alertas, {
      tipo: "LUCRO_NEGATIVO",
      severidade: "RISCO",
      titulo: "Lucro negativo",
      texto: "O mes nao gerou lucro apuravel positivo.",
      recomendacao: "Revisar precos, custos e gastos pagos antes de distribuir resultado.",
      acaoLabel: "Ver resultado",
      href: "/compras/resultado",
    });
  }

  if (margemBrutaPct > 0 && margemBrutaPct < 55) {
    criarAlerta(alertas, {
      tipo: "MARGEM_BAIXA",
      severidade: "ATENCAO",
      titulo: "Margem baixa",
      texto: `Margem bruta em ${margemBrutaPct}%, abaixo do alvo de 55%.`,
      recomendacao: "Revisar precificacao dos itens de maior giro.",
      acaoLabel: "Ver produtos",
      href: "/produtos",
    });
  }

  if (gastosOperacionaisPct > 45) {
    criarAlerta(alertas, {
      tipo: "GASTOS_EXCESSIVOS",
      severidade: "RISCO",
      titulo: "Gastos excessivos",
      texto: `Gastos operacionais em ${gastosOperacionaisPct}% da receita.`,
      recomendacao: "Cortar ou adiar gastos externos ate voltar abaixo de 30%.",
      acaoLabel: "Ver gastos",
      href: "/compras/gastos",
    });
  } else if (gastosOperacionaisPct > 30) {
    criarAlerta(alertas, {
      tipo: "GASTOS_ALTOS",
      severidade: "ATENCAO",
      titulo: "Gastos altos",
      texto: `Gastos operacionais em ${gastosOperacionaisPct}% da receita.`,
      recomendacao: "Segurar novas despesas ate a receita crescer.",
      acaoLabel: "Ver gastos",
      href: "/compras/gastos",
    });
  }

  if (marketingPct > 15) {
    criarAlerta(alertas, {
      tipo: "MARKETING_ALTO",
      severidade: "ATENCAO",
      titulo: "Marketing pago alto",
      texto: `Marketing pago em ${marketingPct}% da receita.`,
      recomendacao: "Reduzir ou pausar trafego ate ficar entre 8% e 10%, salvo ROAS comprovado.",
      acaoLabel: "Ver gastos",
      href: "/compras/gastos",
    });
  } else if (marketingPct > 10) {
    criarAlerta(alertas, {
      tipo: "MARKETING_ATENCAO",
      severidade: "ATENCAO",
      titulo: "Marketing acima da faixa inicial",
      texto: `Marketing pago em ${marketingPct}% da receita.`,
      recomendacao: "Manter teto claro para trafego e priorizar campanhas organicas.",
      acaoLabel: "Ver gastos",
      href: "/compras/gastos",
    });
  }

  if (runwayMeses < 1) {
    criarAlerta(alertas, {
      tipo: "CAIXA_BAIXO",
      severidade: "RISCO",
      titulo: "Caixa baixo",
      texto: `Caixa cobre aproximadamente ${runwayMeses} mes(es).`,
      recomendacao: "Priorizar recebimentos, reduzir saidas e postergar compras nao urgentes.",
      acaoLabel: "Ver caixa",
      href: "/compras/financeiro",
    });
  } else if (runwayMeses < 3) {
    criarAlerta(alertas, {
      tipo: "RESERVA_BAIXA",
      severidade: "ATENCAO",
      titulo: "Reserva curta",
      texto: `Caixa cobre aproximadamente ${runwayMeses} mes(es).`,
      recomendacao: "Direcionar parte da empresa para reserva antes de aumentar retiradas.",
      acaoLabel: "Ver caixa",
      href: "/compras/financeiro",
    });
  }

  if (params.comprasPendentesQuantidade > 0) {
    criarAlerta(alertas, {
      tipo: "COMPRAS_PENDENTES",
      severidade: "ATENCAO",
      titulo: "Compras pendentes",
      texto: `${params.comprasPendentesQuantidade} compra(s) ainda podem pressionar o caixa.`,
      recomendacao: "Considerar compras pendentes antes de aprovar novas saidas.",
      acaoLabel: "Ver compras pendentes",
      href: "/compras/financeiro",
    });
  }

  if (proLaborePendente > 0) {
    criarAlerta(alertas, {
      tipo: "PRO_LABORE_PENDENTE",
      severidade: proLaboreSeguro ? "INFO" : "ATENCAO",
      titulo: "Pro-labore pendente",
      texto: `Ha R$ ${proLaborePendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aprovado pendente de pagamento.`,
      recomendacao: "Pagar apenas sem comprometer a reserva minima.",
      acaoLabel: "Ver apuracao",
      href: "/compras/resultado",
    });
  }

  if (estoque.produtosZerados > 0 || estoque.produtosBaixo > 0) {
    criarAlerta(alertas, {
      tipo: "ESTOQUE_BAIXO",
      severidade: "ATENCAO",
      titulo: "Estoque baixo",
      texto: `${estoque.produtosZerados} produto(s) zerado(s) e ${estoque.produtosBaixo} com estoque baixo.`,
      recomendacao: "Priorizar reposicao dos campeoes antes de ampliar trafego pago.",
      acaoLabel: "Ver reposicao",
      href: "/compras/reposicao",
    });
  }

  const receitasValidas = params.historico.map((item) => item.receita).filter((value) => value > 0);
  const receitaAnterior = receitasValidas.length >= 2 ? receitasValidas[receitasValidas.length - 2] : 0;
  if (receitaAnterior > 0 && receita < receitaAnterior * 0.8) {
    criarAlerta(alertas, {
      tipo: "QUEDA_FATURAMENTO",
      severidade: "ATENCAO",
      titulo: "Queda de faturamento",
      texto: "Receita do mes ficou mais de 20% abaixo do mes anterior.",
      recomendacao: "Reforcar campanhas organicas e revisar produtos campeoes em vitrine.",
      acaoLabel: "Ver vendas",
      href: "/resumos/vendas",
    });
  }

  alertas.sort((a, b) => severidadePeso(b.severidade) - severidadePeso(a.severidade));

  const lucroNegativoRecorrente =
    params.historico.slice(-3).filter((item) => item.lucro < 0).length >= 2 && lucro < 0;
  const critico =
    params.saldoGerencial < 0 ||
    lucroNegativoRecorrente ||
    params.gastosVencidos > Math.max(500, receita * 0.2) ||
    (proLaborePago > Math.max(0, lucro) && runwayMeses < 1);
  const score = critico
    ? limitarScore(35 - alertas.reduce((total, alerta) => total + severidadePeso(alerta.severidade), 0) / 2)
    : limitarScore(
        100 -
          (lucro < 0 ? 24 : 0) -
          (margemBrutaPct < 55 ? 12 : 0) -
          (margemLiquidaPct < 20 ? 10 : 0) -
          (gastosOperacionaisPct > 45 ? 20 : gastosOperacionaisPct > 30 ? 10 : 0) -
          (marketingPct > 15 ? 8 : marketingPct > 10 ? 5 : 0) -
          (runwayMeses < 1 ? 24 : runwayMeses < 2 ? 12 : runwayMeses < 3 ? 5 : 0) -
          (params.comprasPendentesQuantidade > 0 ? 4 : 0) -
          (proLaboreSeguro ? 0 : 8) -
          (estoque.produtosZerados > 0 ? 5 : 0) -
          (estoque.produtosBaixo > 0 ? 3 : 0)
      );
  const status = critico ? "CRITICO" : statusPorScore(score);
  const frase = montarFrase(status, alertas);
  const semaforoCaixa = {
    cor: runwayMeses >= 3 ? "VERDE" : runwayMeses >= 1 ? "AMARELO" : "VERMELHO",
    texto: `Caixa cobre aproximadamente ${runwayMeses} mes(es) de gastos atuais.`,
  } as const;
  const marketingRecomendacao =
    marketingPct > 15
      ? "Reduzir ou pausar trafego pago ate ficar entre 8% e 10%, salvo ROAS comprovado."
      : marketingPct > 10
        ? "Segurar novos testes pagos e priorizar campanhas organicas."
        : "Marketing pago dentro da faixa inicial recomendada.";
  const proLaboreRecomendacao = proLaboreSeguro
    ? "Pro-labore pode seguir limitado ao lucro apuravel e apos aprovacao."
    : "Reduzir ou adiar retirada ate preservar reserva e caixa.";
  const estoqueRecomendacao =
    estoque.produtosZerados > 0 || estoque.produtosBaixo > 0
      ? "Priorize reposicao dos produtos campeoes com estoque baixo."
      : estoque.produtosParados > 0
        ? "Criar campanha para itens parados antes de recomprar variedade."
        : "Estoque sem alerta critico; manter reposicao seletiva.";
  const reinvestimento = {
    recomendacoes: [
      ...(estoque.produtosZerados > 0 || estoque.produtosBaixo > 0
        ? ["Repor campeoes com estoque baixo antes de aumentar trafego pago."]
        : []),
      ...(runwayMeses < 3 ? ["Direcionar parte da empresa para reserva."] : []),
      ...(marketingPct > 10 ? ["Segurar marketing pago e reforcar campanhas organicas."] : []),
      ...(status === "SAUDAVEL" && runwayMeses >= 3
        ? ["Separar verba controlada para categorias vencedoras."]
        : []),
    ],
  };
  const recomendacoes = [
    marketingRecomendacao,
    proLaboreRecomendacao,
    estoqueRecomendacao,
    ...(reinvestimento.recomendacoes.length > 0
      ? [reinvestimento.recomendacoes[0]]
      : ["Manter gastos sob controle e acompanhar margem semanalmente."]),
  ].filter((item, index, list) => list.indexOf(item) === index);
  const receitasRecentes = params.historico
    .slice(-3)
    .map((item) => item.receita)
    .filter((value) => value > 0);
  const baseReceita = media(receitasRecentes) || receita;
  const gastosRecorrentesBase = gastosRecorrentes || media(params.historico.slice(-3).map((item) => item.gastos)) || params.resultado.gastosOperacionais;
  const pendencias = arredondar(
    params.gastosPendentes + params.comprasPendentesTotal + proLaborePendente
  );
  const montarCenario = (
    nome: DiagnosticoPrevisaoCenario["nome"],
    fator: number
  ): DiagnosticoPrevisaoCenario => {
    const receitaCenario = arredondar(baseReceita * fator);
    const caixaProjetado = arredondar(
      params.saldoGerencial + receitaCenario - gastosRecorrentesBase - pendencias
    );

    return {
      nome,
      receita: receitaCenario,
      caixaProjetado,
    };
  };
  const previsao = {
    baseReceita,
    gastosRecorrentes: gastosRecorrentesBase,
    pendencias,
    texto: "Estimativa gerencial baseada na media recente, gastos recorrentes e pendencias cadastradas.",
    cenarios: [
      montarCenario("Conservador", 0.85),
      montarCenario("Realista", 1),
      montarCenario("Otimista", 1.15),
    ],
  };
  const distribuicaoSegura =
    lucro > 0 &&
    proLaboreSeguro &&
    params.saldoGerencial - params.comprasPendentesTotal - proLaborePendente > 0;

  return {
    status,
    score,
    frase,
    indicadores: {
      margemBrutaPct,
      margemLiquidaPct,
      gastosOperacionaisPct,
      marketingPct,
      runwayMeses,
      comprasEstoquePct,
      proLaborePendente,
      estoqueBaixo: estoque.produtosBaixo,
      estoqueZerado: estoque.produtosZerados,
    },
    alertas,
    recomendacoes,
    semaforoCaixa,
    marketing: {
      valor: marketingPago,
      percentual: marketingPct,
      faixaIdeal: "8% a 10%",
      recomendacao: marketingRecomendacao,
    },
    proLabore: {
      sugerido: params.resultado.proLaboreSugerido,
      aprovado: proLaborePendente,
      pago: proLaborePago,
      pendente: proLaborePendente,
      seguro: proLaboreSeguro,
      recomendacao: proLaboreRecomendacao,
    },
    reinvestimento,
    estoque: {
      ...estoque,
      recomendacao: estoqueRecomendacao,
    },
    previsao,
    leituraResultado: {
      rentavel: lucro > 0,
      distribuicaoSegura,
      texto: distribuicaoSegura
        ? "A distribuicao 50/50 e segura neste mes se as compras pendentes forem consideradas no caixa."
        : "A distribuicao pede cautela ate caixa, pendencias e pro-labore ficarem confortaveis.",
      recomendacaoProLabore: proLaboreRecomendacao,
      recomendacaoEmpresa:
        status === "SAUDAVEL"
          ? "Preservar reserva e reinvestir de forma seletiva nos campeoes."
          : "Priorizar reserva e reduzir novas saidas ate estabilizar indicadores.",
    },
    roadmap: montarRoadmap(status),
  };
}
