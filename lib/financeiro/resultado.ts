import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TIPOS_DESTINO_PRO_LABORE = [
  "PRO_LABORE_SOCIO_1",
  "PRO_LABORE_SOCIO_2",
];

export const DESTINOS_DISTRIBUICAO_PADRAO = [
  { tipo: "CAIXA", nome: "Caixa", percentual: 15, ordem: 1 },
  { tipo: "RESERVA", nome: "Reserva", percentual: 10, ordem: 2 },
  { tipo: "SOCIAL_MEDIA", nome: "Social media", percentual: 10, ordem: 3 },
  { tipo: "TRAFEGO_PAGO", nome: "Trafego pago", percentual: 5, ordem: 4 },
  { tipo: "REINVESTIMENTO", nome: "Reinvestimento", percentual: 10, ordem: 5 },
  {
    tipo: "PRO_LABORE_SOCIO_1",
    nome: "Pro-labore socio 1",
    percentual: 25,
    ordem: 6,
  },
  {
    tipo: "PRO_LABORE_SOCIO_2",
    nome: "Pro-labore socio 2",
    percentual: 25,
    ordem: 7,
  },
];

export type PeriodoFinanceiro = {
  mes: number;
  ano: number;
  inicio: Date;
  fim: Date;
  fimExclusivo: Date;
};

export type AlertaFinanceiro = {
  tipo: string;
  severidade: "INFO" | "ATENCAO" | "CRITICO";
  titulo: string;
  descricao: string;
};

export type FonteResultado = {
  vendasInternas: number;
  pedidosOnlinePagos: number;
  gastosPagos: number;
  comprasEstoquePagasNoCaixa: number;
  movimentosCaixaPagos: number;
  estimativas: string[];
};

export type ResultadoMensalCalculado = {
  mes: number;
  ano: number;
  periodoInicio: Date;
  periodoFim: Date;
  receitaRecebida: number;
  custoProdutos: number;
  custoEmbalagens: number;
  taxas: number;
  fretes: number;
  gastosOperacionais: number;
  comprasEstoqueCaixa: number;
  resultadoBruto: number;
  lucroApuravel: number;
  caixaLiquido: number;
  proLaboreSugerido: number;
  empresaSugerido: number;
  destinos: DestinoResultadoCalculado[];
  alertas: AlertaFinanceiro[];
  fontes: FonteResultado;
};

export type DestinoResultadoCalculado = {
  tipo: string;
  nome: string;
  percentual: number;
  valor: number;
  statusPagamento: string;
  movimentacaoCaixaId?: string | null;
};

type RegraComDestinos = Prisma.RegraDistribuicaoResultadoGetPayload<{
  include: {
    destinos: true;
  };
}>;

function numero(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function arredondar(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizarMes(mes: number) {
  if (!Number.isFinite(mes)) return new Date().getMonth() + 1;
  return Math.min(12, Math.max(1, Math.trunc(mes)));
}

function normalizarAno(ano: number) {
  if (!Number.isFinite(ano)) return new Date().getFullYear();
  return Math.min(2999, Math.max(2000, Math.trunc(ano)));
}

export function periodoFinanceiro(mesInput: number, anoInput: number): PeriodoFinanceiro {
  const mes = normalizarMes(mesInput);
  const ano = normalizarAno(anoInput);
  const inicio = new Date(ano, mes - 1, 1);
  const fimExclusivo = new Date(ano, mes, 1);
  const fim = new Date(fimExclusivo.getTime() - 1);

  return { mes, ano, inicio, fim, fimExclusivo };
}

export function mesAnoAtual() {
  const agora = new Date();
  return {
    mes: agora.getMonth() + 1,
    ano: agora.getFullYear(),
  };
}

function mesAnterior(mes: number, ano: number) {
  if (mes === 1) {
    return { mes: 12, ano: ano - 1 };
  }

  return { mes: mes - 1, ano };
}

function somarMovimentoCaixa(movimento: {
  tipo: string;
  valor: number;
  status: string;
}) {
  if (movimento.status !== "PAGA") return 0;
  if (movimento.tipo === "SAIDA") return -numero(movimento.valor);
  if (movimento.tipo === "ENTRADA") return numero(movimento.valor);
  if (movimento.tipo === "AJUSTE") return numero(movimento.valor);

  return 0;
}

function statusPedidoOnlineValido(status: string) {
  return !["CANCELADO", "EXPIRADO", "RECUSADO"].includes(status);
}

function ehDestinoProLabore(tipo: string) {
  return TIPOS_DESTINO_PRO_LABORE.includes(tipo);
}

function categoriaMovimentoParaLancamento(tipo: string) {
  if (["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"].includes(tipo)) {
    return "MARKETING";
  }

  return "GASTO_OPERACIONAL";
}

function codigoSequencial(prefixo: string, codigoAtual: string | null | undefined) {
  const numeroAtual = Number(String(codigoAtual ?? "").replace(`${prefixo}-`, ""));
  const proximo = Number.isFinite(numeroAtual) ? numeroAtual + 1 : 1;

  return `${prefixo}-${String(proximo).padStart(5, "0")}`;
}

async function gerarCodigoMovimentacaoCaixa() {
  const ultimo = await prisma.movimentacaoCaixa.findFirst({
    orderBy: { criadoEm: "desc" },
    select: { codigo: true },
  });

  return codigoSequencial("CXA", ultimo?.codigo);
}

async function gerarCodigoApuracao(mes: number, ano: number) {
  const ultimo = await prisma.apuracaoResultadoMensal.findFirst({
    orderBy: { criadoEm: "desc" },
    select: { codigo: true },
  });
  const sequencial = codigoSequencial("APR", ultimo?.codigo);

  return `${sequencial}-${ano}${String(mes).padStart(2, "0")}`;
}

export async function obterOuCriarContaPrincipal() {
  const existente = await prisma.contaFinanceira.findFirst({
    where: {
      tipo: "CAIXA_PRINCIPAL",
      ativo: true,
    },
    orderBy: { criadoEm: "asc" },
  });

  if (existente) return existente;

  return prisma.contaFinanceira.create({
    data: {
      nome: "Caixa principal",
      tipo: "CAIXA_PRINCIPAL",
      saldoInicial: 0,
      dataSaldoInicial: new Date(),
      observacoes: "Conta gerencial criada automaticamente pela Central Financeira.",
    },
  });
}

export async function listarContasFinanceiras() {
  await obterOuCriarContaPrincipal();

  return prisma.contaFinanceira.findMany({
    where: { ativo: true },
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });
}

export async function obterOuCriarRegraDistribuicaoAtiva(): Promise<RegraComDestinos> {
  const existente = await prisma.regraDistribuicaoResultado.findFirst({
    where: { ativa: true },
    include: {
      destinos: {
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
    },
    orderBy: { criadoEm: "asc" },
  });

  if (existente) return existente;

  return prisma.regraDistribuicaoResultado.create({
    data: {
      nome: "Regra padrao 50/50",
      ativa: true,
      percentualEmpresa: 50,
      percentualProLabore: 50,
      observacoes:
        "50% empresa e 50% pro-labore, com dois socios em partes iguais.",
      destinos: {
        create: DESTINOS_DISTRIBUICAO_PADRAO,
      },
    },
    include: {
      destinos: {
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
    },
  });
}

export function validarRegraDistribuicao(params: {
  percentualEmpresa: number;
  percentualProLabore: number;
  destinos: { percentual: number }[];
}) {
  const totalPrincipal = arredondar(
    numero(params.percentualEmpresa) + numero(params.percentualProLabore)
  );
  const totalDestinos = arredondar(
    params.destinos.reduce((total, destino) => total + numero(destino.percentual), 0)
  );

  if (totalPrincipal !== 100) {
    return "Empresa + pro-labore precisa fechar 100%.";
  }

  if (totalDestinos !== 100) {
    return "A soma dos destinos precisa fechar 100%.";
  }

  return null;
}

export function calcularDestinosResultado(
  lucroApuravel: number,
  regra: RegraComDestinos
): DestinoResultadoCalculado[] {
  return regra.destinos
    .filter((destino) => destino.ativo)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
    .map((destino) => ({
      tipo: destino.tipo,
      nome: destino.nome,
      percentual: numero(destino.percentual),
      valor: arredondar((Math.max(0, lucroApuravel) * numero(destino.percentual)) / 100),
      statusPagamento: "PREVISTO",
      movimentacaoCaixaId: null,
    }));
}

async function calcularReceitaECustos(periodo: PeriodoFinanceiro) {
  const [vendas, pedidosOnline] = await Promise.all([
    prisma.venda.findMany({
      where: {
        criadoEm: {
          gte: periodo.inicio,
          lt: periodo.fimExclusivo,
        },
        status: {
          notIn: ["CANCELADA", "NA_LIXEIRA"],
        },
      },
      select: {
        valorTotal: true,
        gastoTotal: true,
        lucroTotal: true,
      },
    }),
    prisma.pedidoOnline.findMany({
      where: {
        origemCanal: "LOJA_STELLA",
        statusPagamento: "PAGO",
        pagoEm: {
          gte: periodo.inicio,
          lt: periodo.fimExclusivo,
        },
      },
      select: {
        id: true,
        status: true,
        total: true,
        valorPago: true,
      },
    }),
  ]);

  const pedidosValidos = pedidosOnline.filter((pedido) =>
    statusPedidoOnlineValido(pedido.status)
  );
  const pedidoIds = pedidosValidos.map((pedido) => pedido.id);
  const movimentosPedidos =
    pedidoIds.length > 0
      ? await prisma.movimentacao.findMany({
          where: {
            origemId: {
              in: pedidoIds,
            },
            status: "ATIVA",
          },
          select: {
            origemTipo: true,
            custo: true,
          },
        })
      : [];

  const receitaVendas = vendas.reduce(
    (total, venda) => total + numero(venda.valorTotal),
    0
  );
  const custoVendas = vendas.reduce(
    (total, venda) => total + numero(venda.gastoTotal),
    0
  );
  const receitaPedidos = pedidosValidos.reduce(
    (total, pedido) => total + (numero(pedido.valorPago) || numero(pedido.total)),
    0
  );
  const custoEmbalagens = movimentosPedidos.reduce(
    (total, movimento) =>
      movimento.origemTipo === "pedido_online_embalagem"
        ? total + numero(movimento.custo)
        : total,
    0
  );
  const custoProdutosPedidos = movimentosPedidos.reduce(
    (total, movimento) =>
      movimento.origemTipo === "pedido_online_embalagem"
        ? total
        : total + numero(movimento.custo),
    0
  );

  return {
    receitaRecebida: arredondar(receitaVendas + receitaPedidos),
    custoProdutos: arredondar(custoVendas + custoProdutosPedidos),
    custoEmbalagens: arredondar(custoEmbalagens),
    vendasInternas: vendas.length,
    pedidosOnlinePagos: pedidosValidos.length,
  };
}

async function calcularGastosOperacionais(periodo: PeriodoFinanceiro) {
  const lancamentos = await prisma.lancamentoFinanceiro.findMany({
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
      statusPagamento: "PAGO",
      dataPagamento: {
        gte: periodo.inicio,
        lt: periodo.fimExclusivo,
      },
      NOT: [
        { categoria: { in: ["PRO_LABORE", "DISTRIBUICAO_RESULTADO"] } },
        { origemTipo: { in: ["APURACAO_RESULTADO", "APURACAO_DESTINO"] } },
      ],
    },
    select: {
      valorReal: true,
    },
  });

  return {
    total: arredondar(
      lancamentos.reduce((total, lancamento) => total + numero(lancamento.valorReal), 0)
    ),
    quantidade: lancamentos.length,
  };
}

async function calcularCaixaPeriodo(periodo: PeriodoFinanceiro) {
  const movimentos = await prisma.movimentacaoCaixa.findMany({
    where: {
      status: "PAGA",
      dataEfetiva: {
        gte: periodo.inicio,
        lt: periodo.fimExclusivo,
      },
    },
    select: {
      tipo: true,
      categoria: true,
      valor: true,
      status: true,
    },
  });

  const caixaLiquido = movimentos.reduce(
    (total, movimento) => total + somarMovimentoCaixa(movimento),
    0
  );
  const comprasEstoqueCaixa = movimentos.reduce(
    (total, movimento) =>
      movimento.categoria === "COMPRA_ESTOQUE"
        ? total + numero(movimento.valor)
        : total,
    0
  );

  return {
    caixaLiquido: arredondar(caixaLiquido),
    comprasEstoqueCaixa: arredondar(comprasEstoqueCaixa),
    movimentosCaixaPagos: movimentos.length,
  };
}

async function montarAlertasResultado(params: {
  mes: number;
  ano: number;
  receitaRecebida: number;
  lucroApuravel: number;
  gastosOperacionais: number;
  comprasEstoqueCaixa: number;
}) {
  const alertas: AlertaFinanceiro[] = [];
  const receita = params.receitaRecebida;

  if (params.lucroApuravel < 0) {
    alertas.push({
      tipo: "LUCRO_NEGATIVO",
      severidade: "CRITICO",
      titulo: "Resultado negativo no periodo",
      descricao:
        "O lucro apuravel ficou abaixo de zero. Revise custos, gastos operacionais e precificacao.",
    });
  }

  if (receita > 0 && params.gastosOperacionais / receita > 0.35) {
    alertas.push({
      tipo: "GASTOS_OPERACIONAIS_ALTOS",
      severidade: "ATENCAO",
      titulo: "Gastos operacionais acima de 35% da receita",
      descricao:
        "Os gastos do periodo passaram do limite gerencial de 35% da receita recebida.",
    });
  }

  if (receita > 0 && params.comprasEstoqueCaixa / receita > 0.4) {
    alertas.push({
      tipo: "COMPRAS_ESTOQUE_ALTAS",
      severidade: "ATENCAO",
      titulo: "Compras de estoque consumiram muito caixa",
      descricao:
        "As compras de estoque pagas no caixa passaram de 40% da receita recebida.",
    });
  }

  const historico = await calcularReceitasUltimosMeses(params.mes, params.ano, 3);
  const mediaHistorico =
    historico.length > 0
      ? historico.reduce((total, item) => total + item.receita, 0) / historico.length
      : 0;

  if (mediaHistorico > 0 && receita < mediaHistorico * 0.8) {
    alertas.push({
      tipo: "FATURAMENTO_QUEDA",
      severidade: "ATENCAO",
      titulo: "Faturamento abaixo da media recente",
      descricao:
        "A receita recebida caiu mais de 20% em relacao a media dos ultimos 3 meses.",
    });
  }

  const destinosPendentes = await prisma.apuracaoResultadoDestino.count({
    where: {
      tipo: {
        in: TIPOS_DESTINO_PRO_LABORE,
      },
      statusPagamento: "APROVADO",
    },
  });

  if (destinosPendentes > 0) {
    alertas.push({
      tipo: "PRO_LABORE_APROVADO_PENDENTE",
      severidade: "INFO",
      titulo: "Pro-labore aprovado pendente de pagamento",
      descricao:
        "Ha retiradas aprovadas que ainda nao foram marcadas como pagas no caixa.",
    });
  }

  return alertas;
}

export async function calcularResultadoMensal(
  mesInput: number,
  anoInput: number
): Promise<ResultadoMensalCalculado> {
  const periodo = periodoFinanceiro(mesInput, anoInput);
  const regra = await obterOuCriarRegraDistribuicaoAtiva();
  const [receitaCustos, gastos, caixa] = await Promise.all([
    calcularReceitaECustos(periodo),
    calcularGastosOperacionais(periodo),
    calcularCaixaPeriodo(periodo),
  ]);

  const taxas = 0;
  const fretes = 0;
  const resultadoBruto = arredondar(
    receitaCustos.receitaRecebida -
      receitaCustos.custoProdutos -
      receitaCustos.custoEmbalagens -
      taxas -
      fretes
  );
  const lucroApuravel = arredondar(resultadoBruto - gastos.total);
  const destinos = calcularDestinosResultado(lucroApuravel, regra);
  const alertas = await montarAlertasResultado({
    mes: periodo.mes,
    ano: periodo.ano,
    receitaRecebida: receitaCustos.receitaRecebida,
    lucroApuravel,
    gastosOperacionais: gastos.total,
    comprasEstoqueCaixa: caixa.comprasEstoqueCaixa,
  });

  return {
    mes: periodo.mes,
    ano: periodo.ano,
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
    receitaRecebida: receitaCustos.receitaRecebida,
    custoProdutos: receitaCustos.custoProdutos,
    custoEmbalagens: receitaCustos.custoEmbalagens,
    taxas,
    fretes,
    gastosOperacionais: gastos.total,
    comprasEstoqueCaixa: caixa.comprasEstoqueCaixa,
    resultadoBruto,
    lucroApuravel,
    caixaLiquido: caixa.caixaLiquido,
    proLaboreSugerido: arredondar(Math.max(0, lucroApuravel) * 0.5),
    empresaSugerido: arredondar(Math.max(0, lucroApuravel) * 0.5),
    destinos,
    alertas,
    fontes: {
      vendasInternas: receitaCustos.vendasInternas,
      pedidosOnlinePagos: receitaCustos.pedidosOnlinePagos,
      gastosPagos: gastos.quantidade,
      comprasEstoquePagasNoCaixa: caixa.comprasEstoqueCaixa,
      movimentosCaixaPagos: caixa.movimentosCaixaPagos,
      estimativas: [
        "Taxas de pagamento e frete subsidiado ficam em zero quando nao ha fonte confiavel cadastrada.",
        "Compras de estoque afetam caixa, nao reduzem lucro apuravel automaticamente.",
      ],
    },
  };
}

export async function calcularReceitasUltimosMeses(
  mesAtual: number,
  anoAtual: number,
  quantidade: number
) {
  const meses: { mes: number; ano: number }[] = [];
  let cursor = mesAnterior(normalizarMes(mesAtual), normalizarAno(anoAtual));

  for (let index = 0; index < quantidade; index += 1) {
    meses.push(cursor);
    cursor = mesAnterior(cursor.mes, cursor.ano);
  }

  const resultados = [];

  for (const item of meses) {
    const periodo = periodoFinanceiro(item.mes, item.ano);
    const receitaCustos = await calcularReceitaECustos(periodo);
    resultados.push({
      mes: item.mes,
      ano: item.ano,
      receita: receitaCustos.receitaRecebida,
    });
  }

  return resultados;
}

export async function fecharApuracaoResultadoMensal(params: {
  mes: number;
  ano: number;
  observacoes?: string | null;
}) {
  const existente = await prisma.apuracaoResultadoMensal.findUnique({
    where: {
      mes_ano: {
        mes: normalizarMes(params.mes),
        ano: normalizarAno(params.ano),
      },
    },
  });

  if (existente && existente.status === "FECHADA") {
    throw new Error("A apuracao deste mes ja esta fechada.");
  }

  const calculo = await calcularResultadoMensal(params.mes, params.ano);
  const regra = await obterOuCriarRegraDistribuicaoAtiva();
  const codigo = existente?.codigo || (await gerarCodigoApuracao(calculo.mes, calculo.ano));
  const regraSnapshot = {
    id: regra.id,
    nome: regra.nome,
    percentualEmpresa: regra.percentualEmpresa,
    percentualProLabore: regra.percentualProLabore,
    destinos: regra.destinos.map((destino) => ({
      tipo: destino.tipo,
      nome: destino.nome,
      percentual: destino.percentual,
      ordem: destino.ordem,
    })),
  };

  return prisma.$transaction(async (tx) => {
    if (existente) {
      await tx.apuracaoResultadoDestino.deleteMany({
        where: { apuracaoId: existente.id },
      });
    }

    const apuracao = await tx.apuracaoResultadoMensal.upsert({
      where: {
        mes_ano: {
          mes: calculo.mes,
          ano: calculo.ano,
        },
      },
      create: {
        codigo,
        mes: calculo.mes,
        ano: calculo.ano,
        periodoInicio: calculo.periodoInicio,
        periodoFim: calculo.periodoFim,
        status: "FECHADA",
        receitaRecebida: calculo.receitaRecebida,
        custoProdutos: calculo.custoProdutos,
        custoEmbalagens: calculo.custoEmbalagens,
        taxas: calculo.taxas,
        fretes: calculo.fretes,
        gastosOperacionais: calculo.gastosOperacionais,
        comprasEstoqueCaixa: calculo.comprasEstoqueCaixa,
        resultadoBruto: calculo.resultadoBruto,
        lucroApuravel: calculo.lucroApuravel,
        caixaLiquido: calculo.caixaLiquido,
        regraSnapshotJson: regraSnapshot as Prisma.InputJsonValue,
        fontesSnapshotJson: calculo.fontes as Prisma.InputJsonValue,
        alertasSnapshotJson: calculo.alertas as Prisma.InputJsonValue,
        fechadoEm: new Date(),
        observacoes: params.observacoes || null,
      },
      update: {
        periodoInicio: calculo.periodoInicio,
        periodoFim: calculo.periodoFim,
        status: "FECHADA",
        receitaRecebida: calculo.receitaRecebida,
        custoProdutos: calculo.custoProdutos,
        custoEmbalagens: calculo.custoEmbalagens,
        taxas: calculo.taxas,
        fretes: calculo.fretes,
        gastosOperacionais: calculo.gastosOperacionais,
        comprasEstoqueCaixa: calculo.comprasEstoqueCaixa,
        resultadoBruto: calculo.resultadoBruto,
        lucroApuravel: calculo.lucroApuravel,
        caixaLiquido: calculo.caixaLiquido,
        regraSnapshotJson: regraSnapshot as Prisma.InputJsonValue,
        fontesSnapshotJson: calculo.fontes as Prisma.InputJsonValue,
        alertasSnapshotJson: calculo.alertas as Prisma.InputJsonValue,
        fechadoEm: new Date(),
        observacoes: params.observacoes || null,
      },
    });

    await tx.apuracaoResultadoDestino.createMany({
      data: calculo.destinos.map((destino) => ({
        apuracaoId: apuracao.id,
        tipo: destino.tipo,
        nome: destino.nome,
        percentual: destino.percentual,
        valor: destino.valor,
        statusPagamento: "PREVISTO",
      })),
    });

    return tx.apuracaoResultadoMensal.findUnique({
      where: { id: apuracao.id },
      include: {
        destinos: {
          orderBy: { criadoEm: "asc" },
        },
      },
    });
  });
}

export async function criarMovimentacaoCaixa(params: {
  contaId: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  status?: string;
  dataPrevista?: Date | null;
  dataEfetiva?: Date | null;
  origemTipo?: string | null;
  origemId?: string | null;
  observacoes?: string | null;
}) {
  if (params.origemTipo && params.origemId) {
    const existente = await prisma.movimentacaoCaixa.findFirst({
      where: {
        origemTipo: params.origemTipo,
        origemId: params.origemId,
      },
    });

    if (existente) return existente;
  }

  const status = params.status || "PREVISTA";
  const dataEfetiva =
    status === "PAGA" ? params.dataEfetiva || params.dataPrevista || new Date() : params.dataEfetiva;

  return prisma.movimentacaoCaixa.create({
    data: {
      codigo: await gerarCodigoMovimentacaoCaixa(),
      contaId: params.contaId,
      tipo: params.tipo,
      categoria: params.categoria,
      descricao: params.descricao,
      valor: arredondar(Math.abs(numero(params.valor))),
      status,
      dataPrevista: params.dataPrevista || null,
      dataEfetiva: dataEfetiva || null,
      origemTipo: params.origemTipo || null,
      origemId: params.origemId || null,
      aprovadoEm: ["APROVADA", "PAGA"].includes(status) ? new Date() : null,
      pagoEm: status === "PAGA" ? dataEfetiva || new Date() : null,
      observacoes: params.observacoes || null,
    },
  });
}

export async function registrarPagamentoLancamentoFinanceiro(lancamentoId: string) {
  const lancamento = await prisma.lancamentoFinanceiro.findUnique({
    where: { id: lancamentoId },
  });

  if (
    !lancamento ||
    lancamento.statusPagamento !== "PAGO" ||
    !lancamento.impactaCaixa ||
    lancamento.movimentacaoCaixaId
  ) {
    return null;
  }

  const conta =
    lancamento.contaFinanceiraId
      ? await prisma.contaFinanceira.findUnique({
          where: { id: lancamento.contaFinanceiraId },
        })
      : await obterOuCriarContaPrincipal();

  if (!conta) {
    throw new Error("Conta financeira nao encontrada para o lancamento.");
  }

  const movimento = await criarMovimentacaoCaixa({
    contaId: conta.id,
    tipo: "SAIDA",
    categoria: categoriaMovimentoParaLancamento(lancamento.tipo),
    descricao: `${lancamento.codigo} - ${lancamento.titulo}`,
    valor: lancamento.valorReal,
    status: "PAGA",
    dataPrevista: lancamento.dataVencimento,
    dataEfetiva: lancamento.dataPagamento || new Date(),
    origemTipo: "LANCAMENTO_FINANCEIRO",
    origemId: lancamento.id,
    observacoes: lancamento.observacoes,
  });

  await prisma.lancamentoFinanceiro.update({
    where: { id: lancamento.id },
    data: {
      movimentacaoCaixaId: movimento.id,
    },
  });

  return movimento;
}

export async function registrarPagamentoCompraEstoque(params: {
  compraId: string;
  contaId: string;
  dataPagamento?: Date | null;
}) {
  const compra = await prisma.compra.findUnique({
    where: { id: params.compraId },
    select: {
      id: true,
      codigo: true,
      fornecedor: true,
      valorTotalFinal: true,
      status: true,
    },
  });

  if (!compra || ["CANCELADA", "NA_LIXEIRA"].includes(compra.status)) {
    throw new Error("Compra de estoque nao encontrada ou indisponivel.");
  }

  return criarMovimentacaoCaixa({
    contaId: params.contaId,
    tipo: "SAIDA",
    categoria: "COMPRA_ESTOQUE",
    descricao: `${compra.codigo} - ${compra.fornecedor}`,
    valor: compra.valorTotalFinal,
    status: "PAGA",
    dataPrevista: params.dataPagamento || new Date(),
    dataEfetiva: params.dataPagamento || new Date(),
    origemTipo: "COMPRA_ESTOQUE",
    origemId: compra.id,
    observacoes:
      "Pagamento de compra de estoque registrado pela Central Financeira.",
  });
}

export async function pagarDestinoProLabore(params: {
  destinoId: string;
  contaId: string;
}) {
  const destino = await prisma.apuracaoResultadoDestino.findUnique({
    where: { id: params.destinoId },
    include: {
      apuracao: true,
    },
  });

  if (!destino) throw new Error("Destino da apuracao nao encontrado.");
  if (!ehDestinoProLabore(destino.tipo)) {
    throw new Error("Somente destinos de pro-labore podem ser pagos por esta acao.");
  }
  if (destino.statusPagamento === "PAGO") {
    throw new Error("Esta retirada ja foi paga.");
  }
  if (destino.statusPagamento !== "APROVADO") {
    throw new Error("A retirada precisa ser aprovada antes do pagamento.");
  }

  const movimento = await criarMovimentacaoCaixa({
    contaId: params.contaId,
    tipo: "SAIDA",
    categoria: "PRO_LABORE",
    descricao: `${destino.nome} - ${destino.apuracao.codigo}`,
    valor: destino.valor,
    status: "PAGA",
    dataPrevista: new Date(),
    dataEfetiva: new Date(),
    origemTipo: "APURACAO_DESTINO",
    origemId: destino.id,
    observacoes:
      "Retirada de pro-labore paga a partir da apuracao de resultado.",
  });

  return prisma.apuracaoResultadoDestino.update({
    where: { id: destino.id },
    data: {
      statusPagamento: "PAGO",
      movimentacaoCaixaId: movimento.id,
    },
    include: {
      movimentacaoCaixa: true,
    },
  });
}

export async function atualizarStatusDestino(params: {
  destinoId: string;
  statusPagamento: "APROVADO" | "CANCELADO";
}) {
  const destino = await prisma.apuracaoResultadoDestino.findUnique({
    where: { id: params.destinoId },
    select: {
      id: true,
      tipo: true,
      statusPagamento: true,
    },
  });

  if (!destino) throw new Error("Destino da apuracao nao encontrado.");
  if (!ehDestinoProLabore(destino.tipo)) {
    throw new Error("Somente pro-labore tem aprovacao de retirada nesta etapa.");
  }
  if (destino.statusPagamento === "PAGO") {
    throw new Error("Nao e possivel alterar uma retirada ja paga.");
  }

  return prisma.apuracaoResultadoDestino.update({
    where: { id: params.destinoId },
    data: {
      statusPagamento: params.statusPagamento,
    },
  });
}

export async function calcularSaldosContas() {
  const contas = await listarContasFinanceiras();
  const movimentos = await prisma.movimentacaoCaixa.findMany({
    where: {
      status: "PAGA",
    },
    select: {
      contaId: true,
      tipo: true,
      valor: true,
      status: true,
    },
  });

  return contas.map((conta) => {
    const saldoMovimentos = movimentos
      .filter((movimento) => movimento.contaId === conta.id)
      .reduce((total, movimento) => total + somarMovimentoCaixa(movimento), 0);

    return {
      ...conta,
      saldoAtual: arredondar(numero(conta.saldoInicial) + saldoMovimentos),
    };
  });
}

export async function montarCentralFinanceira(mesInput: number, anoInput: number) {
  const periodo = periodoFinanceiro(mesInput, anoInput);
  const [contas, movimentos, resultado, lancamentosPendentes, apuracoes] =
    await Promise.all([
      calcularSaldosContas(),
      prisma.movimentacaoCaixa.findMany({
        orderBy: [{ dataEfetiva: "desc" }, { criadoEm: "desc" }],
        take: 60,
        include: {
          conta: true,
        },
      }),
      calcularResultadoMensal(periodo.mes, periodo.ano),
      prisma.lancamentoFinanceiro.findMany({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
          statusPagamento: {
            in: ["PENDENTE", "VENCIDO"],
          },
        },
        orderBy: [{ dataVencimento: "asc" }, { criadoEm: "desc" }],
        take: 12,
      }),
      prisma.apuracaoResultadoMensal.findMany({
        where: {
          status: "FECHADA",
        },
        orderBy: [{ ano: "desc" }, { mes: "desc" }],
        take: 12,
        include: {
          destinos: true,
        },
      }),
    ]);

  const movimentosMes = movimentos.filter((movimento) => {
    const data = movimento.dataEfetiva || movimento.dataPrevista || movimento.criadoEm;
    return data >= periodo.inicio && data < periodo.fimExclusivo;
  });
  const entradasMes = movimentosMes.reduce(
    (total, movimento) =>
      movimento.status === "PAGA" && movimento.tipo === "ENTRADA"
        ? total + numero(movimento.valor)
        : total,
    0
  );
  const saidasMes = movimentosMes.reduce(
    (total, movimento) =>
      movimento.status === "PAGA" && movimento.tipo === "SAIDA"
        ? total + numero(movimento.valor)
        : total,
    0
  );
  const destinosProLaboreAprovados = apuracoes.flatMap((apuracao) =>
    apuracao.destinos
      .filter(
        (destino) =>
          ehDestinoProLabore(destino.tipo) && destino.statusPagamento === "APROVADO"
      )
      .map((destino) => ({
        ...destino,
        apuracaoCodigo: apuracao.codigo,
        mes: apuracao.mes,
        ano: apuracao.ano,
      }))
  );
  const movimentosCompraIds = new Set(
    movimentos
      .filter((movimento) => movimento.origemTipo === "COMPRA_ESTOQUE")
      .map((movimento) => movimento.origemId)
      .filter(Boolean)
  );
  const comprasRecentes = await prisma.compra.findMany({
    where: {
      status: {
        notIn: ["CANCELADA", "NA_LIXEIRA"],
      },
    },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });
  const comprasPendentes = comprasRecentes
    .filter((compra) => !movimentosCompraIds.has(compra.id))
    .slice(0, 10);
  const receitaUltimosMeses = await calcularReceitasUltimosMeses(
    periodo.mes,
    periodo.ano,
    3
  );
  const mediaReceita =
    receitaUltimosMeses.length > 0
      ? receitaUltimosMeses.reduce((total, item) => total + item.receita, 0) /
        receitaUltimosMeses.length
      : 0;
  const gastosPendentes = lancamentosPendentes.reduce(
    (total, lancamento) => total + numero(lancamento.valorReal),
    0
  );
  const proLaborePendente = destinosProLaboreAprovados.reduce(
    (total, destino) => total + numero(destino.valor),
    0
  );
  const previsaoProximos30Dias = arredondar(mediaReceita - gastosPendentes - proLaborePendente);
  const alertas = [
    ...resultado.alertas,
    ...(lancamentosPendentes.some((lancamento) => {
      if (!lancamento.dataVencimento) return false;
      return lancamento.dataVencimento < new Date();
    })
      ? [
          {
            tipo: "GASTOS_VENCIDOS",
            severidade: "ATENCAO" as const,
            titulo: "Existem gastos vencidos",
            descricao:
              "Ha lancamentos financeiros pendentes com vencimento anterior a hoje.",
          },
        ]
      : []),
  ];

  return {
    contas,
    movimentos,
    resultado,
    lancamentosPendentes,
    comprasPendentes,
    destinosProLaboreAprovados,
    entradasMes: arredondar(entradasMes),
    saidasMes: arredondar(saidasMes),
    saldoGerencial: arredondar(
      contas.reduce((total, conta) => total + conta.saldoAtual, 0)
    ),
    previsao: {
      mediaReceitaUltimos3Meses: arredondar(mediaReceita),
      gastosPendentes: arredondar(gastosPendentes),
      proLaborePendente: arredondar(proLaborePendente),
      proximos30Dias: previsaoProximos30Dias,
      texto:
        "Previsao gerencial baseada em lancamentos cadastrados e historico.",
    },
    alertas,
  };
}
