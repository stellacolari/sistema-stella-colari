import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIRM_VALUE = "ANALISAR_STELLA";
const DEFAULT_OUTPUT = "tmp/relatorios";
const DEFAULT_MONTHS = 6;
const SIMULATION_MARKER = "[SIMULACAO_2_MESES_STELLA]";
const INVALID_ORDER_STATUSES = new Set(["CANCELADO", "EXPIRADO", "RECUSADO"]);
const PRO_LABORE_TYPES = new Set(["PRO_LABORE_SOCIO_1", "PRO_LABORE_SOCIO_2"]);
const OPERATING_EXCLUDED_CATEGORIES = new Set(["PRO_LABORE", "DISTRIBUICAO_RESULTADO"]);
const OPERATING_EXCLUDED_ORIGINS = new Set(["APURACAO_RESULTADO", "APURACAO_DESTINO"]);

function parseArgs(argv) {
  const args = {
    mes: "atual",
    ultimosMeses: DEFAULT_MONTHS,
    output: DEFAULT_OUTPUT,
    json: false,
    simulacao: false,
    confirm: "",
  };

  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg === "--simulacao") args.simulacao = true;
    else if (arg.startsWith("--mes=")) args.mes = stripQuotes(arg.slice("--mes=".length)) || args.mes;
    else if (arg.startsWith("--ultimos-meses=")) {
      args.ultimosMeses = Math.max(1, toInt(arg.slice("--ultimos-meses=".length), DEFAULT_MONTHS));
    } else if (arg.startsWith("--output=")) {
      args.output = stripQuotes(arg.slice("--output=".length)) || args.output;
    } else if (arg.startsWith("--confirm=")) {
      args.confirm = stripQuotes(arg.slice("--confirm=".length));
    }
  }

  return args;
}

function stripQuotes(value) {
  const text = String(value ?? "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function num(value) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function round(value) {
  return Math.round((num(value) + Number.EPSILON) * 100) / 100;
}

function percent(part, total) {
  if (!total) return 0;
  return round((num(part) / num(total)) * 100);
}

function average(values) {
  const valid = values.map(num).filter(Number.isFinite);
  if (valid.length === 0) return 0;
  return round(valid.reduce((total, value) => total + value, 0) / valid.length);
}

function sum(items, selector) {
  return round(items.reduce((total, item) => total + num(selector(item)), 0));
}

function fmtMoney(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(round(value));
}

function fmtNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(round(value));
}

function fmtPercent(value) {
  return `${fmtNumber(value)}%`;
}

function fmtDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(date));
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function monthLabel(period) {
  return `${String(period.mes).padStart(2, "0")}/${period.ano}`;
}

function parseMonth(value) {
  const raw = normalizeText(value).toLowerCase();
  const now = new Date();

  if (!raw || raw === "atual") {
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  }

  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error("Mes invalido. Use --mes=YYYY-MM ou --mes=atual.");
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("Mes invalido. Use --mes=YYYY-MM ou --mes=atual.");
  }

  return { mes, ano };
}

function periodFor(mes, ano) {
  const inicio = new Date(ano, mes - 1, 1);
  const fimExclusivo = new Date(ano, mes, 1);
  const fim = new Date(fimExclusivo.getTime() - 1);
  return { mes, ano, inicio, fim, fimExclusivo };
}

function addMonths(period, offset) {
  const date = new Date(period.ano, period.mes - 1 + offset, 1);
  return periodFor(date.getMonth() + 1, date.getFullYear());
}

function monthsEndingAt(period, count) {
  const months = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    months.push(addMonths(period, -index));
  }
  return months;
}

function daysInPeriod(period) {
  return new Date(period.ano, period.mes, 0).getDate();
}

function elapsedDays(period) {
  const now = new Date();
  if (now < period.inicio) return 0;
  if (now >= period.fimExclusivo) return daysInPeriod(period);
  return Math.max(1, now.getDate());
}

function isSelectedCurrentMonth(period) {
  const now = new Date();
  return now.getFullYear() === period.ano && now.getMonth() + 1 === period.mes;
}

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function weekKey(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function table(headers, rows) {
  if (!rows.length) return "_Sem dados._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "-")).join(" | ")} |`),
  ].join("\n");
}

function bullet(items) {
  if (!items.length) return "- Nenhum ponto relevante.";
  return items.map((item) => `- ${item}`).join("\n");
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function aggregate(items, keyFn, valueFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const current = map.get(key) || { key, count: 0, total: 0, quantity: 0 };
    const value = valueFn(item);
    current.count += 1;
    current.total = round(current.total + num(value.total));
    current.quantity += num(value.quantity);
    map.set(key, current);
  }
  return [...map.values()];
}

function top(items, field, limit = 10) {
  return [...items].sort((a, b) => num(b[field]) - num(a[field])).slice(0, limit);
}

function simulationWhere(args, field = "observacoes") {
  if (!args.simulacao) return {};
  return { [field]: { contains: SIMULATION_MARKER } };
}

function simulationCashWhere(args) {
  if (!args.simulacao) return {};
  const prefix = SIMULATION_MARKER.replace(/[\[\]]/g, "");
  return {
    OR: [
      { observacoes: { contains: SIMULATION_MARKER } },
      { origemTipo: { startsWith: prefix } },
    ],
  };
}

function validPublicOrder(pedido) {
  return pedido.origemCanal === "LOJA_STELLA" && pedido.statusPagamento === "PAGO" && !INVALID_ORDER_STATUSES.has(pedido.status);
}

function operatingExpense(lancamento) {
  if (OPERATING_EXCLUDED_CATEGORIES.has(lancamento.categoria)) return false;
  if (OPERATING_EXCLUDED_ORIGINS.has(lancamento.origemTipo)) return false;
  return true;
}

function cashImpact(movimento) {
  if (movimento.status !== "PAGA") return 0;
  if (movimento.tipo === "ENTRADA") return num(movimento.valor);
  if (movimento.tipo === "SAIDA") return -num(movimento.valor);
  if (movimento.tipo === "AJUSTE") return num(movimento.valor);
  return 0;
}

function soldItemsFrom(vendas, pedidos) {
  const items = [];

  for (const venda of vendas) {
    for (const item of venda.itens) {
      const produto = item.produto;
      items.push({
        source: "Venda",
        sourceCode: venda.codigo,
        date: venda.criadoEm,
        code: produto?.codigoInterno || item.codigoDigitado,
        name: item.descricao || produto?.nome || item.codigoDigitado,
        category: produto?.categoria || "Sem categoria",
        size: item.tamanhoAnel || "UNICO",
        quantity: num(item.quantidade),
        revenue: num(item.valorTotal),
        cost: num(item.gastoProduto) + num(item.gastoAdicionais),
      });
    }
  }

  for (const pedido of pedidos) {
    for (const item of pedido.itens) {
      items.push({
        source: "PedidoOnline",
        sourceCode: pedido.codigo,
        date: pedido.pagoEm || pedido.criadoEm,
        code: item.codigoInterno || item.produtoId || item.nomeProduto,
        name: item.nomeProduto,
        category: item.categoria || "Sem categoria",
        size: item.tamanhoAnel || "UNICO",
        quantity: num(item.quantidade),
        revenue: num(item.total),
        cost: 0,
      });
    }
  }

  return items;
}

function aggregateSoldItems(items) {
  return aggregate(items, (item) => `${item.code} - ${item.name}`, (item) => ({
    total: item.revenue,
    quantity: item.quantity,
  }))
    .map((item) => ({
      codeName: item.key,
      units: item.quantity,
      revenue: item.total,
      avgPrice: item.quantity > 0 ? round(item.total / item.quantity) : 0,
    }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue);
}

function aggregateByKey(items, keyFn) {
  return aggregate(items, keyFn, (item) => ({
    total: item.revenue,
    quantity: item.quantity,
  })).sort((a, b) => b.total - a.total);
}

async function calculateMonth(period, args) {
  const dateFilterSale = { gte: period.inicio, lt: period.fimExclusivo };
  const [vendas, pedidos, compras, lancamentosPagos, lancamentosMes, movimentosCaixa, apuracao] =
    await Promise.all([
      prisma.venda.findMany({
        where: {
          criadoEm: dateFilterSale,
          status: { notIn: ["CANCELADA", "NA_LIXEIRA"] },
          ...simulationWhere(args),
        },
        include: {
          cliente: true,
          itens: { include: { produto: true }, orderBy: { criadoEm: "asc" } },
        },
        orderBy: { criadoEm: "asc" },
      }),
      prisma.pedidoOnline.findMany({
        where: {
          origemCanal: "LOJA_STELLA",
          statusPagamento: "PAGO",
          pagoEm: dateFilterSale,
          status: { notIn: [...INVALID_ORDER_STATUSES] },
          ...simulationWhere(args),
        },
        include: {
          cliente: true,
          envio: true,
          itens: { orderBy: { criadoEm: "asc" } },
        },
        orderBy: { pagoEm: "asc" },
      }),
      prisma.compra.findMany({
        where: {
          criadoEm: dateFilterSale,
          status: { notIn: ["CANCELADA", "NA_LIXEIRA"] },
          ...simulationWhere(args),
        },
        include: { itens: true },
        orderBy: { criadoEm: "asc" },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: {
          status: { not: "NA_LIXEIRA" },
          statusPagamento: "PAGO",
          dataPagamento: dateFilterSale,
          ...simulationWhere(args),
        },
        orderBy: { dataPagamento: "asc" },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: {
          status: { not: "NA_LIXEIRA" },
          OR: [
            { dataCompetencia: dateFilterSale },
            { dataPagamento: dateFilterSale },
            { dataVencimento: dateFilterSale },
            { criadoEm: dateFilterSale },
          ],
          ...simulationWhere(args),
        },
        orderBy: [{ dataVencimento: "asc" }, { criadoEm: "asc" }],
      }),
      prisma.movimentacaoCaixa.findMany({
        where: {
          status: "PAGA",
          dataEfetiva: dateFilterSale,
          ...simulationCashWhere(args),
        },
        include: { conta: true },
        orderBy: { dataEfetiva: "asc" },
      }),
      prisma.apuracaoResultadoMensal.findUnique({
        where: { mes_ano: { mes: period.mes, ano: period.ano } },
        include: { destinos: true },
      }),
    ]);

  const publicPedidos = pedidos.filter(validPublicOrder);
  const pedidoIds = publicPedidos.map((pedido) => pedido.id);
  const movimentosPedidos = pedidoIds.length
    ? await prisma.movimentacao.findMany({
        where: {
          origemId: { in: pedidoIds },
          status: "ATIVA",
        },
        orderBy: { criadoEm: "asc" },
      })
    : [];

  const soldItems = soldItemsFrom(vendas, publicPedidos);
  const receitaVendas = sum(vendas, (venda) => venda.valorTotal);
  const receitaPedidos = sum(publicPedidos, (pedido) => num(pedido.valorPago) || num(pedido.total));
  const receitaRecebida = round(receitaVendas + receitaPedidos);
  const custoVendas = sum(vendas, (venda) => venda.gastoTotal);
  const custoProdutosPedidos = sum(
    movimentosPedidos.filter((movimento) => movimento.origemTipo !== "pedido_online_embalagem"),
    (movimento) => movimento.custo
  );
  const custoEmbalagens = sum(
    movimentosPedidos.filter((movimento) => movimento.origemTipo === "pedido_online_embalagem"),
    (movimento) => movimento.custo
  );
  const custoProdutos = round(custoVendas + custoProdutosPedidos);
  const taxas = 0;
  const fretes = 0;
  const resultadoBruto = round(receitaRecebida - custoProdutos - custoEmbalagens - taxas - fretes);
  const lancamentosOperacionais = lancamentosPagos.filter(operatingExpense);
  const gastosOperacionais = sum(lancamentosOperacionais, (lancamento) => lancamento.valorReal);
  const lucroApuravel = round(resultadoBruto - gastosOperacionais);
  const unidadesVendidas = sum(soldItems, (item) => item.quantity);
  const pedidosQuantidade = vendas.length + publicPedidos.length;
  const ticketMedio = pedidosQuantidade ? round(receitaRecebida / pedidosQuantidade) : 0;
  const margemBrutaPct = percent(resultadoBruto, receitaRecebida);
  const margemLiquidaPct = percent(lucroApuravel, receitaRecebida);
  const gastosReceitaPct = percent(gastosOperacionais, receitaRecebida);
  const marketingPago = sum(
    lancamentosOperacionais.filter((lancamento) => ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"].includes(lancamento.tipo)),
    (lancamento) => lancamento.valorReal
  );
  const marketingReceitaPct = percent(marketingPago, receitaRecebida);
  const comprasEstoqueTotal = sum(compras, (compra) => compra.valorTotalFinal);
  const entradasCaixa = sum(
    movimentosCaixa.filter((movimento) => movimento.tipo === "ENTRADA"),
    (movimento) => movimento.valor
  );
  const saidasCaixa = sum(
    movimentosCaixa.filter((movimento) => movimento.tipo === "SAIDA"),
    (movimento) => movimento.valor
  );
  const caixaLiquido = round(movimentosCaixa.reduce((total, movimento) => total + cashImpact(movimento), 0));
  const comprasEstoqueCaixa = sum(
    movimentosCaixa.filter((movimento) => movimento.categoria === "COMPRA_ESTOQUE"),
    (movimento) => movimento.valor
  );
  const comprasEstoqueCaixaPct = percent(comprasEstoqueCaixa, Math.max(entradasCaixa, receitaRecebida));
  const proLaboreSugerido = round(Math.max(0, lucroApuravel) * 0.5);
  const destinosProLabore = apuracao?.destinos?.filter((destino) => PRO_LABORE_TYPES.has(destino.tipo)) || [];
  const proLaboreAprovado = sum(
    destinosProLabore.filter((destino) => destino.statusPagamento === "APROVADO"),
    (destino) => destino.valor
  );
  const proLaborePagoApuracao = sum(
    destinosProLabore.filter((destino) => destino.statusPagamento === "PAGO"),
    (destino) => destino.valor
  );
  const proLaborePagoCaixa = sum(
    movimentosCaixa.filter((movimento) => movimento.categoria === "PRO_LABORE"),
    (movimento) => movimento.valor
  );
  const diasMes = daysInPeriod(period);
  const diasDecorridos = elapsedDays(period);
  const currentMonth = isSelectedCurrentMonth(period);
  const receitaPorDia = diasDecorridos ? round(receitaRecebida / diasDecorridos) : 0;
  const receitaProjetada = currentMonth && diasDecorridos < diasMes
    ? round((receitaRecebida / Math.max(1, diasDecorridos)) * diasMes)
    : receitaRecebida;
  const unidadesProjetadas = currentMonth && diasDecorridos < diasMes
    ? round((unidadesVendidas / Math.max(1, diasDecorridos)) * diasMes)
    : unidadesVendidas;

  const revenueEvents = [
    ...vendas.map((venda) => ({
      date: venda.criadoEm,
      revenue: num(venda.valorTotal),
      quantity: sum(venda.itens, (item) => item.quantidade),
    })),
    ...publicPedidos.map((pedido) => ({
      date: pedido.pagoEm || pedido.criadoEm,
      revenue: num(pedido.valorPago) || num(pedido.total),
      quantity: sum(pedido.itens, (item) => item.quantidade),
    })),
  ];
  const receitaPorDiaTabela = aggregate(revenueEvents, (item) => dateKey(item.date), (item) => ({
    total: item.revenue,
    quantity: item.quantity,
  })).sort((a, b) => a.key.localeCompare(b.key));
  const receitaPorSemana = aggregate(revenueEvents, (item) => weekKey(item.date), (item) => ({
    total: item.revenue,
    quantity: item.quantity,
  })).sort((a, b) => a.key.localeCompare(b.key));
  const pedidosPorStatus = [...groupBy(pedidos, (pedido) => pedido.status)].map(([status, list]) => ({
    status,
    count: list.length,
  })).sort((a, b) => b.count - a.count);
  const canais = [
    ...aggregate(vendas, (venda) => venda.meioVenda || "Venda interna", (venda) => ({
      total: venda.valorTotal,
      quantity: 1,
    })),
    ...aggregate(publicPedidos, (pedido) => pedido.origemCanal || "Pedido online", (pedido) => ({
      total: num(pedido.valorPago) || num(pedido.total),
      quantity: 1,
    })),
  ].sort((a, b) => b.total - a.total);

  return {
    period,
    label: monthLabel(period),
    counts: {
      vendas: vendas.length,
      pedidosOnlinePagos: publicPedidos.length,
      pedidosTotalPagosConsultados: pedidos.length,
      compras: compras.length,
      gastosPagos: lancamentosPagos.length,
      movimentosCaixa: movimentosCaixa.length,
    },
    receitaVendas,
    receitaPedidos,
    receitaRecebida,
    receitaProjetada,
    receitaPorDia,
    receitaPorSemana,
    receitaPorDiaTabela,
    custoProdutos,
    custoEmbalagens,
    taxas,
    fretes,
    resultadoBruto,
    gastosOperacionais,
    lucroApuravel,
    margemBrutaPct,
    margemLiquidaPct,
    gastosReceitaPct,
    marketingPago,
    marketingReceitaPct,
    comprasEstoqueTotal,
    comprasEstoqueCaixa,
    comprasEstoqueCaixaPct,
    entradasCaixa,
    saidasCaixa,
    caixaLiquido,
    proLaboreSugerido,
    proLaboreAprovado,
    proLaborePagoApuracao,
    proLaborePagoCaixa,
    unidadesVendidas,
    unidadesProjetadas,
    pedidosQuantidade,
    ticketMedio,
    apuracaoFechada: Boolean(apuracao),
    soldItems,
    topProducts: aggregateSoldItems(soldItems).slice(0, 10),
    topCategories: aggregateByKey(soldItems, (item) => item.category).slice(0, 10),
    topSizes: aggregateByKey(soldItems, (item) => item.size).slice(0, 10),
    pedidosPorStatus,
    canais,
    gastosPorTipo: aggregate(lancamentosOperacionais, (item) => item.tipo, (item) => ({
      total: item.valorReal,
      quantity: 1,
    })).sort((a, b) => b.total - a.total),
    gastosPorCategoria: aggregate(lancamentosOperacionais, (item) => item.categoria, (item) => ({
      total: item.valorReal,
      quantity: 1,
    })).sort((a, b) => b.total - a.total),
    lancamentosMes,
    lancamentosOperacionais,
    compras,
    movimentosCaixa,
  };
}

async function loadContext(args) {
  const [clientes, contas, movimentosPagos, lancamentosPendentes, comprasAtivas, regrasAtivas, apuracoes] =
    await Promise.all([
      prisma.cliente.count({
        where: args.simulacao ? { observacoes: { contains: SIMULATION_MARKER } } : {},
      }),
      prisma.contaFinanceira.findMany({
        where: { ativo: true },
        orderBy: [{ tipo: "asc" }, { nome: "asc" }],
      }),
      prisma.movimentacaoCaixa.findMany({
        where: {
          status: "PAGA",
          ...simulationCashWhere(args),
        },
        include: { conta: true },
        orderBy: { dataEfetiva: "asc" },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: {
          status: { not: "NA_LIXEIRA" },
          statusPagamento: { in: ["PENDENTE", "VENCIDO"] },
          ...simulationWhere(args),
        },
        orderBy: [{ dataVencimento: "asc" }, { criadoEm: "asc" }],
      }),
      prisma.compra.findMany({
        where: {
          status: { notIn: ["CANCELADA", "NA_LIXEIRA"] },
          ...simulationWhere(args),
        },
        orderBy: { criadoEm: "desc" },
      }),
      prisma.regraDistribuicaoResultado.findMany({
        where: { ativa: true },
        include: { destinos: true },
        orderBy: { criadoEm: "asc" },
      }),
      prisma.apuracaoResultadoMensal.findMany({
        where: { status: "FECHADA" },
        include: { destinos: true },
        orderBy: [{ ano: "desc" }, { mes: "desc" }],
        take: 12,
      }),
    ]);

  const saldosContas = contas.map((conta) => {
    const saldoMovimentos = movimentosPagos
      .filter((movimento) => movimento.contaId === conta.id)
      .reduce((total, movimento) => total + cashImpact(movimento), 0);
    return {
      id: conta.id,
      nome: conta.nome,
      tipo: conta.tipo,
      saldoInicial: num(conta.saldoInicial),
      saldoAtual: round(num(conta.saldoInicial) + saldoMovimentos),
    };
  });
  const saldoGerencial = sum(saldosContas, (conta) => conta.saldoAtual);
  const reserva = sum(
    saldosContas.filter((conta) => `${conta.tipo} ${conta.nome}`.toLowerCase().includes("reserva")),
    (conta) => conta.saldoAtual
  );
  const compraIdsComCaixa = new Set(
    movimentosPagos
      .filter((movimento) => movimento.categoria === "COMPRA_ESTOQUE" || String(movimento.origemTipo || "").includes("COMPRA_ESTOQUE"))
      .map((movimento) => movimento.origemId)
      .filter(Boolean)
  );
  const comprasPendentes = comprasAtivas.filter((compra) => !compraIdsComCaixa.has(compra.id));
  const gastosPendentes = sum(lancamentosPendentes, (lancamento) => lancamento.valorReal);
  const gastosVencidos = sum(
    lancamentosPendentes.filter((lancamento) => lancamento.statusPagamento === "VENCIDO"),
    (lancamento) => lancamento.valorReal
  );
  const proLaboreAprovadoPendente = sum(
    apuracoes.flatMap((apuracao) => apuracao.destinos)
      .filter((destino) => PRO_LABORE_TYPES.has(destino.tipo) && destino.statusPagamento === "APROVADO"),
    (destino) => destino.valor
  );

  return {
    clientes,
    contas: saldosContas,
    saldoGerencial,
    reserva,
    lancamentosPendentes,
    comprasPendentes,
    gastosPendentes,
    gastosVencidos,
    proLaboreAprovadoPendente,
    regrasAtivas,
    apuracoes,
  };
}

async function loadInventory(monthResults, args) {
  const soldAll = monthResults.flatMap((month) => month.soldItems);
  const soldCurrent = monthResults.at(-1)?.soldItems || [];
  const soldAllByCode = new Map();
  const soldCurrentByCode = new Map();

  for (const item of soldAll) {
    const key = item.code;
    const current = soldAllByCode.get(key) || { units: 0, revenue: 0 };
    current.units += num(item.quantity);
    current.revenue = round(current.revenue + num(item.revenue));
    soldAllByCode.set(key, current);
  }

  for (const item of soldCurrent) {
    const key = item.code;
    const current = soldCurrentByCode.get(key) || { units: 0, revenue: 0 };
    current.units += num(item.quantity);
    current.revenue = round(current.revenue + num(item.revenue));
    soldCurrentByCode.set(key, current);
  }

  const [produtos, estoquesAdicionais] = await Promise.all([
    prisma.produto.findMany({
      where: {
        ativo: true,
        status: { not: "NA_LIXEIRA" },
        ...simulationWhere(args),
      },
      include: { estoque: true },
      orderBy: { nome: "asc" },
    }),
    prisma.estoqueAdicional.findMany({
      include: { itemAdicional: true },
      orderBy: { atualizadoEm: "desc" },
    }),
  ]);

  const produtosResumo = produtos.map((produto) => {
    const estoqueTotal = sum(produto.estoque, (estoque) => estoque.quantidadeAtual);
    const valorEstoque = sum(produto.estoque, (estoque) => {
      const acumulado = num(estoque.valorAcumulado);
      if (acumulado > 0) return acumulado;
      return num(estoque.custoMedio || produto.custoBase) * num(estoque.quantidadeAtual);
    });
    const sold6 = soldAllByCode.get(produto.codigoInterno) || { units: 0, revenue: 0 };
    const soldMonth = soldCurrentByCode.get(produto.codigoInterno) || { units: 0, revenue: 0 };
    const giro = estoqueTotal > 0 ? round(sold6.units / estoqueTotal) : sold6.units > 0 ? 99 : 0;
    return {
      codigo: produto.codigoInterno,
      nome: produto.nome,
      categoria: produto.categoria,
      precoVenda: num(produto.precoVenda),
      custoBase: num(produto.custoBase),
      margemProdutoPct: percent(num(produto.precoVenda) - num(produto.custoBase), num(produto.precoVenda)),
      estoqueTotal,
      valorEstoque,
      unidadesVendidas6m: sold6.units,
      receita6m: sold6.revenue,
      unidadesVendidasMes: soldMonth.units,
      giro,
    };
  });

  const estoqueTotal = sum(produtosResumo, (produto) => produto.estoqueTotal);
  const valorEstoque = sum(produtosResumo, (produto) => produto.valorEstoque);
  const produtosZerados = produtosResumo.filter((produto) => produto.estoqueTotal <= 0);
  const estoqueBaixo = produtosResumo.filter((produto) => produto.estoqueTotal > 0 && produto.estoqueTotal <= 6);
  const parados = produtosResumo.filter((produto) => produto.estoqueTotal > 0 && produto.unidadesVendidas6m === 0);
  const valorParado = sum(parados, (produto) => produto.valorEstoque);
  const topGiro = [...produtosResumo]
    .filter((produto) => produto.unidadesVendidas6m > 0)
    .sort((a, b) => b.unidadesVendidas6m - a.unidadesVendidas6m || b.giro - a.giro)
    .slice(0, 10);
  const giroGeral = estoqueTotal > 0 ? round(sum(produtosResumo, (produto) => produto.unidadesVendidas6m) / estoqueTotal) : 0;

  return {
    produtosAtivos: produtos.length,
    estoqueTotal,
    valorEstoque,
    produtosZerados,
    estoqueBaixo,
    parados,
    valorParado,
    valorParadoPct: percent(valorParado, valorEstoque),
    topGiro,
    giroGeral,
    produtosResumo,
    adicionais: estoquesAdicionais.map((estoque) => ({
      codigo: estoque.itemAdicional.codigoInterno,
      nome: estoque.itemAdicional.nome,
      quantidadeAtual: estoque.quantidadeAtual,
      custoMedio: estoque.custoMedio,
    })),
  };
}

function buildDiagnosis(current, history, context, inventory) {
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const previousThree = history.slice(Math.max(0, history.length - 4), Math.max(0, history.length - 1));
  const avg3Revenue = average(previousThree.map((month) => month.receitaRecebida));
  const comparableRevenue = current.receitaProjetada || current.receitaRecebida;
  const growthMomPct = previous?.receitaRecebida ? percent(comparableRevenue - previous.receitaRecebida, previous.receitaRecebida) : 0;
  const growthVsAvg3Pct = avg3Revenue ? percent(comparableRevenue - avg3Revenue, avg3Revenue) : 0;
  const fixedExpenseBase = average(previousThree.map((month) => month.gastosOperacionais).filter((value) => value > 0)) || current.gastosOperacionais;
  const runwayMonths = fixedExpenseBase > 0 ? round(context.saldoGerencial / fixedExpenseBase) : 99;
  const proLaboreSafe = current.proLaborePagoCaixa <= current.proLaboreSugerido && context.saldoGerencial > fixedExpenseBase;

  const reasons = [];
  let status = "SAUDAVEL";

  if (
    context.saldoGerencial <= 0 ||
    (current.receitaRecebida > 0 && growthMomPct < -45 && runwayMonths < 1) ||
    (context.gastosVencidos > current.receitaRecebida * 0.2 && runwayMonths < 1)
  ) {
    status = "CRITICO";
    reasons.push("Caixa ou tendencia de faturamento coloca a operacao em zona critica.");
  } else if (
    current.lucroApuravel < 0 ||
    current.gastosReceitaPct > 45 ||
    runwayMonths < 1 ||
    current.proLaborePagoCaixa > Math.max(0, current.lucroApuravel) ||
    inventory.valorParadoPct > 60
  ) {
    status = "RISCO";
    reasons.push("Lucro, gastos, caixa ou estoque parado exigem intervencao de curto prazo.");
  } else if (
    current.margemBrutaPct < 55 ||
    current.gastosReceitaPct > 30 ||
    runwayMonths < 2 ||
    current.comprasEstoqueCaixaPct > 40 ||
    growthMomPct < -10 ||
    context.gastosVencidos > 0
  ) {
    status = "ATENCAO";
    reasons.push("A operacao e positiva, mas ainda tem pontos que pedem controle gerencial.");
  } else {
    reasons.push("Lucro positivo, margem saudavel, gastos sob controle e caixa com folga.");
  }

  return {
    status,
    reasons,
    rentavel: current.lucroApuravel > 0,
    margemSaudavel: current.margemBrutaPct >= 55 && current.margemLiquidaPct >= 12,
    caixaSaudavel: context.saldoGerencial > 0 && runwayMonths >= 2,
    gastosControlados: current.gastosReceitaPct <= 30,
    proLaboreSeguro: proLaboreSafe,
    estoqueEquilibrado: inventory.valorParadoPct <= 35 && inventory.estoqueBaixo.length <= Math.max(3, inventory.produtosAtivos * 0.35),
    growthMomPct,
    growthVsAvg3Pct,
    avg3Revenue,
    fixedExpenseBase,
    runwayMonths,
  };
}

const ADAPTIVE_PHASE_LABELS = {
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

function adaptiveRange(min, max, recommendation) {
  return { min, max, label: `${min}% a ${max}%`, recommendation };
}

function buildAdaptiveTargets(phase, confidence, current, diagnosis) {
  const marketingByPhase = {
    PRE_OPERACAO: [0, 2],
    VALIDACAO_INICIAL: [0, 4],
    PRIMEIRA_TRACAO: [3, 7],
    GIRO_COMPROVADO: [5, 9],
    CRESCIMENTO_SAUDAVEL: [6, 10],
    ESCALA: [8, 12],
    PRESSAO_CAIXA: [0, 3],
    CRISE_DEFESA: [0, 1],
    ESTOQUE_TRAVADO: [0, 4],
  };
  const proLaboreByPhase = {
    PRE_OPERACAO: [0, 0],
    VALIDACAO_INICIAL: [0, 10],
    PRIMEIRA_TRACAO: [10, 25],
    GIRO_COMPROVADO: [20, 35],
    CRESCIMENTO_SAUDAVEL: [25, 40],
    ESCALA: [30, 45],
    PRESSAO_CAIXA: [0, 15],
    CRISE_DEFESA: [0, 5],
    ESTOQUE_TRAVADO: [0, 20],
  };
  const stockByPhase = {
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
  const reserveByPhase = {
    PRE_OPERACAO: [40, 70],
    VALIDACAO_INICIAL: [30, 55],
    PRIMEIRA_TRACAO: [20, 40],
    GIRO_COMPROVADO: [15, 30],
    CRESCIMENTO_SAUDAVEL: [10, 25],
    ESCALA: [10, 20],
    PRESSAO_CAIXA: [45, 75],
    CRISE_DEFESA: [60, 90],
    ESTOQUE_TRAVADO: [35, 60],
  };
  const marketing = marketingByPhase[phase];
  const proLabore = proLaboreByPhase[phase];
  const stock = stockByPhase[phase];
  const reserve = reserveByPhase[phase];
  const marketingMax = confidence === "BAIXA" ? Math.min(marketing[1], 4) : marketing[1];
  const stockMax = confidence === "BAIXA" ? Math.min(stock[1], 20) : stock[1];

  return {
    marketing: adaptiveRange(
      marketing[0],
      marketingMax,
      current.marketingReceitaPct > marketingMax
        ? "Reduzir marketing pago ate a fase validar margem, produto e conversao."
        : "Manter pago pequeno e ligado a produto com margem e sinal real."
    ),
    reserve: adaptiveRange(
      reserve[0],
      reserve[1],
      diagnosis.runwayMonths < 2
        ? "Priorizar caixa e reserva antes de compras, marketing ou retirada."
        : "Preservar reserva antes de acelerar compras e campanhas."
    ),
    proLabore: adaptiveRange(
      proLabore[0],
      proLabore[1],
      current.lucroApuravel <= 0 || diagnosis.runwayMonths < 1.5
        ? "Pro-labore deve ficar travado ou simbolico ate caixa e lucro voltarem."
        : "Retirada segura so dentro do lucro realizado e depois da reserva."
    ),
    stock: adaptiveRange(
      stock[0],
      stockMax,
      "Comprar apenas com sinal de venda, ciclo ou intencao suficiente; lote grande so com repeticao."
    ),
  };
}

function adaptiveDistribution(phase) {
  const values = {
    PRE_OPERACAO: [40, 25, 5, 5, 20, 0, 5, "Preservar caixa e gerar exposicao antes de apostar em lote."],
    VALIDACAO_INICIAL: [30, 25, 15, 5, 15, 5, 5, "Validar produto e oferta com compras pequenas e campanhas organicas."],
    PRIMEIRA_TRACAO: [20, 20, 25, 8, 14, 10, 3, "Repor pequenos campeoes e proteger margem enquanto a tracao se repete."],
    GIRO_COMPROVADO: [15, 15, 35, 8, 12, 12, 3, "Caixa pode seguir para reposicao seletiva de itens comprovados."],
    CRESCIMENTO_SAUDAVEL: [12, 13, 32, 10, 12, 18, 3, "Aumentar reinvestimento sem perder reserva e margem."],
    ESCALA: [10, 10, 35, 12, 10, 20, 3, "Escalar com caixa protegido, reposicao recorrente e marketing medido."],
    PRESSAO_CAIXA: [45, 25, 10, 3, 10, 5, 2, "Reduzir apostas e preservar liquidez ate aliviar pendencias."],
    CRISE_DEFESA: [60, 25, 3, 0, 7, 0, 5, "Defesa de caixa: suspender saidas nao essenciais e vender estoque."],
    ESTOQUE_TRAVADO: [35, 20, 5, 5, 10, 10, 15, "Girar estoque atual antes de recomprar modelos sem validacao."],
  }[phase];

  return {
    caixa: values[0],
    reserva: values[1],
    reposicao: values[2],
    marketing: values[3],
    reinvestimento: values[4],
    proLabore: values[5],
    descontosCampanhas: values[6],
    leitura: values[7],
  };
}

function buildAdaptiveIntelligence(current, history, context, inventory, diagnosis, args) {
  const vendasReaisTotal = sum(history, (month) => month.unidadesVendidas);
  const produtosVendidos = inventory.produtosResumo.filter((produto) => produto.unidadesVendidas6m > 0).length;
  const percentualProdutosTestados = inventory.produtosAtivos ? percent(produtosVendidos, inventory.produtosAtivos) : 0;
  const produtosTravadosPct = inventory.produtosAtivos ? inventory.parados.length / inventory.produtosAtivos : 0;
  const eventosIntencao = 0;
  const positiveRevenueMonths = history.filter((month) => month.receitaRecebida > 0).length;
  const positiveProfitMonths = history.filter((month) => month.lucroApuravel > 0).length;
  const hasSimulationScope = Boolean(args.simulacao);
  let confidenceScore = 0;

  if (vendasReaisTotal >= 40) confidenceScore += 35;
  else if (vendasReaisTotal >= 15) confidenceScore += 28;
  else if (vendasReaisTotal >= 5) confidenceScore += 18;
  else if (vendasReaisTotal > 0) confidenceScore += 8;

  if (history.length >= 6) confidenceScore += 18;
  else if (history.length >= 3) confidenceScore += 10;
  if (percentualProdutosTestados >= 70) confidenceScore += 18;
  else if (percentualProdutosTestados >= 45) confidenceScore += 12;
  else if (percentualProdutosTestados >= 25) confidenceScore += 6;
  if (positiveRevenueMonths >= 3) confidenceScore += 6;
  if (positiveProfitMonths >= 2) confidenceScore += 5;
  if (hasSimulationScope) confidenceScore -= vendasReaisTotal < 10 ? 18 : 8;
  if (vendasReaisTotal === 0) confidenceScore = Math.min(confidenceScore, 32);
  if (inventory.produtosAtivos > 0 && percentualProdutosTestados < 25) confidenceScore = Math.min(confidenceScore, 45);

  confidenceScore = Math.max(0, Math.min(100, Math.round(confidenceScore)));
  const confidence = confidenceScore >= 70 ? "ALTA" : confidenceScore >= 45 ? "MEDIA" : "BAIXA";
  let phase = "GIRO_COMPROVADO";
  const reasons = [];
  const pendencias = context.gastosPendentes + context.gastosVencidos + context.proLaboreAprovadoPendente;

  if (context.saldoGerencial < 0 || (current.lucroApuravel < 0 && diagnosis.runwayMonths < 1) || (context.gastosVencidos > 0 && diagnosis.runwayMonths < 1)) {
    phase = "CRISE_DEFESA";
    reasons.push("Caixa, lucro ou vencidos exigem defesa imediata.");
  } else if (diagnosis.runwayMonths < 1.5 || pendencias > Math.max(context.saldoGerencial * 0.8, current.receitaRecebida * 0.5)) {
    phase = "PRESSAO_CAIXA";
    reasons.push("Caixa livre e pendencias reduzem margem para novas apostas.");
  } else if (produtosTravadosPct >= 0.35 && current.unidadesVendidas <= 3 && confidence !== "BAIXA") {
    phase = "ESTOQUE_TRAVADO";
    reasons.push("Muitos produtos ativos seguem parados apesar de alguma leitura comercial.");
  } else if (vendasReaisTotal <= 0) {
    phase = "PRE_OPERACAO";
    reasons.push("Ainda nao ha venda real suficiente para tratar metas como comprovadas.");
  } else if (vendasReaisTotal < 10 || percentualProdutosTestados < 30 || confidence === "BAIXA") {
    phase = "VALIDACAO_INICIAL";
    reasons.push("Ha vendas ou sinais iniciais, mas a amostra ainda e curta.");
  } else if (vendasReaisTotal < 25 || positiveRevenueMonths < 2) {
    phase = "PRIMEIRA_TRACAO";
    reasons.push("A operacao ja tracionou, mas ainda precisa repetir ciclos vencedores.");
  } else if (vendasReaisTotal >= 80 && positiveProfitMonths >= 4 && diagnosis.runwayMonths >= 3 && current.gastosReceitaPct <= 28) {
    phase = "ESCALA";
    reasons.push("Venda, lucro e caixa sustentam leitura de escala.");
  } else if (positiveProfitMonths >= 3 && diagnosis.runwayMonths >= 2.5 && current.margemBrutaPct >= 55 && current.gastosReceitaPct <= 32) {
    phase = "CRESCIMENTO_SAUDAVEL";
    reasons.push("Historico recente mostra caixa, margem e lucro em conjunto.");
  } else {
    reasons.push("Ha giro real e produtos com reposicao mais defensavel, mas ainda seletiva.");
  }

  const targets = buildAdaptiveTargets(phase, confidence, current, diagnosis);
  const distribution = adaptiveDistribution(phase);
  const risks = [];
  const actions = [];

  if (confidence === "BAIXA") {
    risks.push("Amostra baixa: conclusoes devem virar testes, nao metas rigidas.");
    actions.push("Expor produtos pouco testados antes de comprar lote ou cortar margem.");
  }
  if (hasSimulationScope) {
    risks.push("Escopo de simulacao: nao escalar decisao como se fosse historico real.");
  }
  if (diagnosis.runwayMonths < 2) {
    risks.push("Runway curto limita compra de estoque, marketing pago e pro-labore.");
    actions.push("Priorizar recebimentos, reserva e reducao de saidas recorrentes.");
  }
  if (inventory.parados.length > 0) {
    actions.push("Criar campanhas para girar estoque parado antes de recomprar variedade.");
  }
  if (inventory.estoqueBaixo.length > 0 || inventory.produtosZerados.length > 0) {
    actions.push("Repor pequeno apenas produtos com venda ou ciclo comprovado.");
  }
  if (["PRESSAO_CAIXA", "CRISE_DEFESA"].includes(phase)) {
    actions.unshift("Congelar lote grande, marketing novo e retirada extra ate caixa estabilizar.");
  }

  const marginDiscount = current.margemBrutaPct > 0 && current.margemBrutaPct < 50
    ? "Proteger margem e revisar precificacao/custo antes de desconto amplo."
    : inventory.parados.length > 0
      ? "Usar desconto controlado apenas para estoque parado, sem contaminar campeoes."
      : "Manter margem nos campeoes e testar desconto apenas por produto, canal e periodo.";

  return {
    phase,
    phaseLabel: ADAPTIVE_PHASE_LABELS[phase],
    confidence,
    confidenceScore,
    reasons,
    data: {
      vendasReaisTotal,
      produtosAtivos: inventory.produtosAtivos,
      produtosTestados: produtosVendidos,
      percentualProdutosTestados,
      estoqueTotal: inventory.estoqueTotal,
      produtosParados: inventory.parados.length,
      eventosIntencao,
      escopoSimulado: hasSimulationScope,
    },
    targets,
    distribution,
    marginDiscount,
    risks: risks.length ? risks : ["Nenhum risco adaptativo critico alem do acompanhamento normal."],
    actions: [...new Set(actions)].slice(0, 6),
    dataReading: hasSimulationScope
      ? "Relatorio em escopo de simulacao; separar validacao real antes de escalar compras e retiradas."
      : "Relatorio sobre a base completa disponivel; trate ausencia de amostra como baixa confianca.",
  };
}

function buildRecommendations(current, history, context, inventory, diagnosis, adaptive) {
  const recommendations = [];
  const strengths = [];
  const weaknesses = [];
  const risks = [];
  const goals = [];

  if (current.lucroApuravel > 0) strengths.push(`Lucro apuravel positivo de ${fmtMoney(current.lucroApuravel)} no mes.`);
  else weaknesses.push(`Lucro apuravel negativo de ${fmtMoney(current.lucroApuravel)} no mes.`);

  if (current.margemBrutaPct >= 55) strengths.push(`Margem bruta estimada saudavel em ${fmtPercent(current.margemBrutaPct)}.`);
  else weaknesses.push(`Margem bruta abaixo da faixa confortavel para a fase, hoje em ${fmtPercent(current.margemBrutaPct)}.`);

  if (current.gastosReceitaPct <= 30) strengths.push(`Gastos operacionais em ${fmtPercent(current.gastosReceitaPct)} da receita, dentro do limite gerencial.`);
  else weaknesses.push(`Gastos operacionais em ${fmtPercent(current.gastosReceitaPct)} da receita, acima do limite recomendado.`);

  if (diagnosis.caixaSaudavel) strengths.push(`Caixa gerencial cobre cerca de ${fmtNumber(diagnosis.runwayMonths)} mes(es) de gastos operacionais medios.`);
  else risks.push(`Runway de caixa de ${fmtNumber(diagnosis.runwayMonths)} mes(es), abaixo da faixa segura de 2 meses.`);

  if (inventory.topGiro.length > 0) strengths.push(`Ha produtos campeoes com giro claro, liderados por ${inventory.topGiro[0].codigo} - ${inventory.topGiro[0].nome}.`);
  if (inventory.parados.length > 0) weaknesses.push(`${inventory.parados.length} produto(s) ativo(s) com estoque e sem venda nos ultimos meses analisados.`);
  if (context.gastosVencidos > 0) risks.push(`Existem ${fmtMoney(context.gastosVencidos)} em gastos vencidos.`);
  if (context.proLaboreAprovadoPendente > 0) risks.push(`Ha ${fmtMoney(context.proLaboreAprovadoPendente)} de pro-labore aprovado pendente de caixa.`);

  if (current.margemBrutaPct < 60) {
    recommendations.push(adaptive.marginDiscount);
  } else {
    recommendations.push("Manter politica de preco atual nos campeoes e testar leve aumento em produtos com demanda recorrente.");
  }

  if (current.gastosReceitaPct > 30) {
    recommendations.push("Segurar gastos externos nao essenciais ate os gastos operacionais voltarem para abaixo de 30% da receita.");
  } else {
    recommendations.push("Preservar teto de gastos operacionais de 30% da receita e aprovar excecoes apenas com retorno esperado claro.");
  }

  if (current.marketingReceitaPct > adaptive.targets.marketing.max) {
    recommendations.push(`${adaptive.targets.marketing.recommendation} Faixa da fase: ${adaptive.targets.marketing.label}.`);
  } else if (current.marketingReceitaPct < adaptive.targets.marketing.min && current.margemBrutaPct >= 55 && current.lucroApuravel > 0) {
    recommendations.push(`Testar trafego pago pequeno apenas em produtos campeoes, respeitando ${adaptive.targets.marketing.label} da receita.`);
  } else {
    recommendations.push("Manter marketing organico como base e usar pago so onde houver produto campeao, margem e conversao validada.");
  }

  if (inventory.estoqueBaixo.length > 0 || inventory.produtosZerados.length > 0) {
    recommendations.push("Repor primeiro produtos campeoes com estoque baixo ou zerado, evitando recompras de itens sem giro.");
  } else {
    recommendations.push("Nao aumentar estoque de forma ampla; concentrar caixa em reposicao seletiva dos itens com maior giro.");
  }

  if (diagnosis.runwayMonths < 2) {
    recommendations.push(adaptive.targets.reserve.recommendation);
  } else {
    recommendations.push(`Reserva adaptativa da fase: ${adaptive.targets.reserve.label} do lucro/caixa livre antes de acelerar.`);
  }

  if (!diagnosis.proLaboreSeguro) {
    recommendations.push(adaptive.targets.proLabore.recommendation);
  } else {
    recommendations.push(`Pro-labore pode seguir dentro da faixa ${adaptive.targets.proLabore.label} do lucro realizado, sem antecipar vendas nao consolidadas.`);
  }

  const targetRevenueBase = Math.max(current.receitaProjetada, diagnosis.avg3Revenue, current.receitaRecebida);
  goals.push(`Faturamento mensal alvo: ${fmtMoney(round(targetRevenueBase * 1.1))} a ${fmtMoney(round(targetRevenueBase * 1.2))}.`);
  goals.push(`Fase atual: ${adaptive.phaseLabel}; confianca ${adaptive.confidence} (${adaptive.confidenceScore}/100).`);
  goals.push(`Marketing pago: ${adaptive.targets.marketing.label} da receita enquanto CAC/ROAS nao estiverem claros.`);
  goals.push(`Reserva: ${adaptive.targets.reserve.label} do lucro/caixa livre conforme fase e runway.`);
  goals.push(`Reposicao: ${adaptive.targets.stock.label}; lote grande so com ciclo repetido e caixa livre.`);
  goals.push(`Pro-labore: ${adaptive.targets.proLabore.label} do lucro realizado, com reserva preservada.`);

  return { recommendations, strengths, weaknesses, risks, goals };
}

function buildInitialPlan(current) {
  const investimento = 3000;
  const itens = 64;
  const custoMedio = round(investimento / itens);
  const price55 = round(custoMedio / (1 - 0.55));
  const price60 = round(custoMedio / (1 - 0.6));
  const price65 = round(custoMedio / (1 - 0.65));
  const avgTicketUnit = current.unidadesVendidas ? round(current.receitaRecebida / current.unidadesVendidas) : price60;
  const unitsToRecover = avgTicketUnit > 0 ? Math.ceil(investimento / avgTicketUnit) : itens;

  return {
    investimento,
    itens,
    custoMedio,
    price55,
    price60,
    price65,
    avgTicketUnit,
    unitsToRecover,
    sellThrough30: Math.ceil(itens * 0.3),
    sellThrough40: Math.ceil(itens * 0.4),
    recommendations: [
      "Validar primeiro os produtos campeoes antes de recomprar variedade ampla.",
      "Recuperar o investimento inicial antes de aumentar pro-labore.",
      "Separar reserva de caixa antes de ampliar compra de estoque.",
      "Usar marketing organico primeiro; trafego pago so com margem e conversao minima validadas.",
      "Repor quando um campeao vender 60% ou mais do lote e ainda mantiver margem saudavel.",
    ],
  };
}

function futureBlocks() {
  return [
    "Saude financeira: status geral, cor e resumo executivo.",
    "Semaforo de caixa: verde/amarelo/vermelho e meses de seguranca.",
    "Pro-labore seguro: sugerido, aprovado, pago e risco.",
    "Limite de gastos: gasto atual vs limite recomendado.",
    "Marketing inteligente: marketing pago vs receita e recomendacao de investir/cortar/segurar.",
    "Reinvestimento recomendado: estoque campeao, reserva, trafego e estrutura.",
    "Estoque e giro: produtos campeoes, parados e sugestao de campanha.",
    "Crescimento: faturamento, lucro, ticket medio e clientes.",
    "Previsao do proximo mes: cenario conservador, realista e otimista.",
    "Alertas de risco: vencidos, caixa baixo, margem baixa e gastos excessivos.",
  ];
}

function roadmap90Days() {
  return {
    mes1: [
      "Validar ticket medio e margem por categoria.",
      "Vender 30% a 40% do estoque inicial.",
      "Medir produtos campeoes e produtos sem giro.",
      "Evitar gastos externos desnecessarios.",
      "Criar reserva minima e fortalecer busca, SEO e paginas.",
    ],
    mes2: [
      "Repor somente campeoes.",
      "Criar campanhas organicas por categoria e ocasiao.",
      "Testar trafego baixo se margem permitir.",
      "Organizar paginas de categoria e vitrines editoriais.",
      "Controlar pro-labore com caixa realizado.",
    ],
    mes3: [
      "Escalar produtos vencedores.",
      "Criar calendario de campanhas.",
      "Aumentar marketing apenas se CAC for saudavel.",
      "Formar reserva de 2 a 3 meses de gastos fixos.",
      "Revisar precos, margens e curva de giro.",
    ],
  };
}

function dataGaps(current, inventory) {
  const gaps = [
    "Taxas de pagamento e frete subsidiado ficam em zero quando nao ha fonte confiavel consolidada no modelo de resultado.",
    "CAC, conversao por canal e ROI de campanha ainda dependem de integracao ou lancamento especifico.",
    "Estoque minimo/ideal por produto nao existe de forma global no schema atual; reposicao usa criterio gerencial simples.",
  ];

  if (current.custoEmbalagens === 0) {
    gaps.push("Custo de embalagens/adicionais pode estar incompleto quando nao ha movimentacao de baixa vinculada.");
  }

  if (inventory.valorEstoque === 0 && inventory.estoqueTotal > 0) {
    gaps.push("Valor gerencial do estoque pode estar subestimado se custo medio/valor acumulado estiver zerado.");
  }

  return gaps;
}

function buildReport(args, selectedPeriod, history, current, context, inventory) {
  const diagnosis = buildDiagnosis(current, history, context, inventory);
  const adaptive = buildAdaptiveIntelligence(current, history, context, inventory, diagnosis, args);
  const insight = buildRecommendations(current, history, context, inventory, diagnosis, adaptive);
  const initialPlan = buildInitialPlan(current);
  const roadmap = roadmap90Days();
  const blocks = futureBlocks();
  const gaps = dataGaps(current, inventory);

  return {
    generatedAt: new Date().toISOString(),
    args: {
      mes: args.mes,
      ultimosMeses: args.ultimosMeses,
      simulacao: args.simulacao,
    },
    period: {
      label: monthLabel(selectedPeriod),
      inicio: selectedPeriod.inicio.toISOString(),
      fim: selectedPeriod.fim.toISOString(),
    },
    status: diagnosis.status,
    diagnosis,
    adaptive,
    current,
    history,
    context,
    inventory,
    insight,
    initialPlan,
    roadmap,
    blocks,
    gaps,
  };
}

function buildMarkdown(report) {
  const current = report.current;
  const diagnosis = report.diagnosis;
  const adaptive = report.adaptive;
  const context = report.context;
  const inventory = report.inventory;
  const insight = report.insight;
  const plan = report.initialPlan;
  const roadmap = report.roadmap;

  const lines = [];
  lines.push("# Consultoria Financeira Stella Colari");
  lines.push("");
  lines.push(`Gerado em: ${report.generatedAt}`);
  lines.push(`Periodo analisado: ${report.period.label}`);
  lines.push(`Escopo: ${report.args.simulacao ? "simulacao" : "base completa"}`);
  lines.push("");

  lines.push("## 1. Resumo executivo");
  lines.push("");
  lines.push(`Status gerencial: **${report.status}**.`);
  lines.push(`Fase adaptativa: **${adaptive.phaseLabel}**. Confianca: **${adaptive.confidence} (${adaptive.confidenceScore}/100)**.`);
  lines.push(`Receita recebida: **${fmtMoney(current.receitaRecebida)}**. Lucro apuravel: **${fmtMoney(current.lucroApuravel)}**. Margem bruta estimada: **${fmtPercent(current.margemBrutaPct)}**.`);
  lines.push(`Caixa gerencial: **${fmtMoney(context.saldoGerencial)}**. Runway estimado: **${fmtNumber(diagnosis.runwayMonths)} mes(es)**.`);
  lines.push(`Unidades vendidas: **${fmtNumber(current.unidadesVendidas)}**. Ticket medio: **${fmtMoney(current.ticketMedio)}**.`);
  if (current.receitaProjetada !== current.receitaRecebida) {
    lines.push(`Como o mes atual ainda esta em andamento, a receita projetada pelo ritmo atual e **${fmtMoney(current.receitaProjetada)}**.`);
  }
  lines.push("");
  lines.push(table(
    ["Indicador", "Valor"],
    [
      ["Faturamento recebido", fmtMoney(current.receitaRecebida)],
      ["Lucro apuravel", fmtMoney(current.lucroApuravel)],
      ["Margem bruta estimada", fmtPercent(current.margemBrutaPct)],
      ["Margem liquida gerencial", fmtPercent(current.margemLiquidaPct)],
      ["Gastos operacionais/receita", fmtPercent(current.gastosReceitaPct)],
      ["Marketing pago/receita", fmtPercent(current.marketingReceitaPct)],
      ["Compras de estoque/caixa", fmtPercent(current.comprasEstoqueCaixaPct)],
      ["Pro-labore sugerido", fmtMoney(current.proLaboreSugerido)],
      ["Pro-labore pago no caixa", fmtMoney(current.proLaborePagoCaixa)],
      ["Reserva identificada", fmtMoney(context.reserva)],
    ]
  ));
  lines.push("");

  lines.push("## Inteligencia adaptativa");
  lines.push("");
  lines.push(`Fase atual: **${adaptive.phaseLabel}**.`);
  lines.push(`Motivo: ${adaptive.reasons.join(" ")}`);
  lines.push(`Confianca da analise: **${adaptive.confidence} (${adaptive.confidenceScore}/100)**.`);
  lines.push(adaptive.dataReading);
  lines.push("");
  lines.push(table(
    ["Meta", "Faixa adaptativa", "Leitura"],
    [
      ["Marketing pago", adaptive.targets.marketing.label, adaptive.targets.marketing.recommendation],
      ["Reserva", adaptive.targets.reserve.label, adaptive.targets.reserve.recommendation],
      ["Reposicao", adaptive.targets.stock.label, adaptive.targets.stock.recommendation],
      ["Pro-labore", adaptive.targets.proLabore.label, adaptive.targets.proLabore.recommendation],
    ]
  ));
  lines.push("");
  lines.push(table(
    ["Destino", "% sugerido"],
    [
      ["Caixa", fmtPercent(adaptive.distribution.caixa)],
      ["Reserva", fmtPercent(adaptive.distribution.reserva)],
      ["Reposicao", fmtPercent(adaptive.distribution.reposicao)],
      ["Marketing", fmtPercent(adaptive.distribution.marketing)],
      ["Reinvestimento", fmtPercent(adaptive.distribution.reinvestimento)],
      ["Pro-labore", fmtPercent(adaptive.distribution.proLabore)],
      ["Descontos/campanhas", fmtPercent(adaptive.distribution.descontosCampanhas)],
    ]
  ));
  lines.push(adaptive.distribution.leitura);
  lines.push("");
  lines.push("Acoes prioritarias:");
  lines.push(bullet(adaptive.actions));
  lines.push("");
  lines.push("Riscos adaptativos:");
  lines.push(bullet(adaptive.risks));
  lines.push("");

  lines.push("## 2. Rentavel ou nao?");
  lines.push("");
  lines.push(diagnosis.rentavel
    ? `Sim. A operacao gerou lucro apuravel positivo de ${fmtMoney(current.lucroApuravel)} no periodo.`
    : `Nao no periodo analisado. O lucro apuravel ficou em ${fmtMoney(current.lucroApuravel)}.`);
  lines.push(`A margem liquida gerencial ficou em ${fmtPercent(current.margemLiquidaPct)}.`);
  lines.push("");

  lines.push("## 3. Pontos fortes");
  lines.push("");
  lines.push(bullet(insight.strengths));
  lines.push("");

  lines.push("## 4. Pontos fracos");
  lines.push("");
  lines.push(bullet(insight.weaknesses));
  lines.push("");

  lines.push("## 5. Riscos");
  lines.push("");
  lines.push(bullet(insight.risks));
  lines.push("");
  lines.push(`Motivos do status: ${diagnosis.reasons.join(" ")}`);
  lines.push("");

  lines.push("## 6. Margem e precificacao");
  lines.push("");
  lines.push(`Custo de produtos: ${fmtMoney(current.custoProdutos)}. Custo de embalagens/adicionais: ${fmtMoney(current.custoEmbalagens)}.`);
  lines.push(`Resultado bruto: ${fmtMoney(current.resultadoBruto)}. Margem bruta: ${fmtPercent(current.margemBrutaPct)}.`);
  lines.push("");
  lines.push(table(
    ["Produto", "Unidades", "Receita", "Preco medio"],
    current.topProducts.map((item) => [item.codeName, fmtNumber(item.units), fmtMoney(item.revenue), fmtMoney(item.avgPrice)])
  ));
  lines.push("");

  lines.push("## 7. Caixa e reserva");
  lines.push("");
  lines.push(`Saldo gerencial por contas: ${fmtMoney(context.saldoGerencial)}.`);
  lines.push(`Entradas pagas no mes: ${fmtMoney(current.entradasCaixa)}. Saidas pagas no mes: ${fmtMoney(current.saidasCaixa)}. Caixa liquido do periodo: ${fmtMoney(current.caixaLiquido)}.`);
  lines.push(`Gastos pendentes: ${fmtMoney(context.gastosPendentes)}. Gastos vencidos: ${fmtMoney(context.gastosVencidos)}.`);
  lines.push("");
  lines.push(table(
    ["Conta", "Tipo", "Saldo inicial", "Saldo atual"],
    context.contas.map((conta) => [conta.nome, conta.tipo, fmtMoney(conta.saldoInicial), fmtMoney(conta.saldoAtual)])
  ));
  lines.push("");

  lines.push("## 8. Pro-labore");
  lines.push("");
  lines.push(`Pro-labore sugerido pelo lucro: ${fmtMoney(current.proLaboreSugerido)}.`);
  lines.push(`Pro-labore aprovado no mes: ${fmtMoney(current.proLaboreAprovado)}. Pago por apuracao: ${fmtMoney(current.proLaborePagoApuracao)}. Pago no caixa: ${fmtMoney(current.proLaborePagoCaixa)}.`);
  lines.push(diagnosis.proLaboreSeguro
    ? `Leitura: retirada segura se mantida dentro do lucro apuravel e da faixa adaptativa ${adaptive.targets.proLabore.label}.`
    : adaptive.targets.proLabore.recommendation);
  lines.push("");

  lines.push("## 9. Compras de estoque");
  lines.push("");
  lines.push(`Compras de estoque criadas no mes: ${current.counts.compras}, total ${fmtMoney(current.comprasEstoqueTotal)}.`);
  lines.push(`Compras pagas no caixa no mes: ${fmtMoney(current.comprasEstoqueCaixa)} (${fmtPercent(current.comprasEstoqueCaixaPct)} da base de caixa/receita).`);
  lines.push(`Compras pendentes de desconto no caixa: ${context.comprasPendentes.length}.`);
  lines.push("");

  lines.push("## 10. Gastos e assinaturas");
  lines.push("");
  lines.push(`Gastos operacionais pagos: ${fmtMoney(current.gastosOperacionais)} (${fmtPercent(current.gastosReceitaPct)} da receita).`);
  lines.push(table(
    ["Tipo", "Qtd", "Total"],
    current.gastosPorTipo.map((item) => [item.key, item.count, fmtMoney(item.total)])
  ));
  lines.push("");

  lines.push("## 11. Marketing");
  lines.push("");
  lines.push(`Marketing, trafego e influenciadores pagos: ${fmtMoney(current.marketingPago)} (${fmtPercent(current.marketingReceitaPct)} da receita).`);
  lines.push(`Faixa adaptativa da fase ${adaptive.phaseLabel}: ${adaptive.targets.marketing.label}.`);
  lines.push(current.marketingReceitaPct > adaptive.targets.marketing.max
    ? adaptive.targets.marketing.recommendation
    : "Leitura: marketing pago esta compativel com a fase e deve seguir medido por produto/canal.");
  lines.push("");

  lines.push("## 12. Crescimento");
  lines.push("");
  lines.push(`Crescimento mes contra mes: ${fmtPercent(diagnosis.growthMomPct)}.`);
  lines.push(`Crescimento contra media dos ultimos 3 meses: ${fmtPercent(diagnosis.growthVsAvg3Pct)}.`);
  lines.push("");
  lines.push(table(
    ["Mes", "Receita", "Lucro", "Gastos", "Marketing", "Unidades"],
    report.history.map((month) => [
      month.label,
      fmtMoney(month.receitaRecebida),
      fmtMoney(month.lucroApuravel),
      fmtMoney(month.gastosOperacionais),
      fmtMoney(month.marketingPago),
      fmtNumber(month.unidadesVendidas),
    ])
  ));
  lines.push("");

  lines.push("## 13. Estoque");
  lines.push("");
  lines.push(`Produtos ativos: ${inventory.produtosAtivos}. Estoque total: ${fmtNumber(inventory.estoqueTotal)} unidades. Valor gerencial: ${fmtMoney(inventory.valorEstoque)}.`);
  lines.push(`Produtos zerados: ${inventory.produtosZerados.length}. Estoque baixo: ${inventory.estoqueBaixo.length}. Produtos parados: ${inventory.parados.length} (${fmtPercent(inventory.valorParadoPct)} do valor de estoque).`);
  lines.push("");
  lines.push(table(
    ["Produto", "Estoque", "Vendidas 6m", "Receita 6m", "Giro"],
    inventory.topGiro.map((item) => [item.codigo, fmtNumber(item.estoqueTotal), fmtNumber(item.unidadesVendidas6m), fmtMoney(item.receita6m), fmtNumber(item.giro)])
  ));
  lines.push("");

  lines.push("## Plano inicial - 64 joias e investimento de R$ 3.000");
  lines.push("");
  lines.push(`Investimento inicial: ${fmtMoney(plan.investimento)} para ${plan.itens} joias. Custo medio gerencial: ${fmtMoney(plan.custoMedio)} por joia.`);
  lines.push(`Preco minimo aproximado para margem 55%: ${fmtMoney(plan.price55)}; para 60%: ${fmtMoney(plan.price60)}; para 65%: ${fmtMoney(plan.price65)}.`);
  lines.push(`Com preco medio atual/projetado de ${fmtMoney(plan.avgTicketUnit)} por unidade, seriam necessarias cerca de ${plan.unitsToRecover} joias para recuperar o investimento bruto.`);
  lines.push(`Referencia de sell-through inicial: vender ${plan.sellThrough30} a ${plan.sellThrough40} joias antes de ampliar reposicao, ajustando pela fase ${adaptive.phaseLabel}.`);
  lines.push(bullet(plan.recommendations));
  lines.push("");

  lines.push("## 14. Recomendacoes imediatas");
  lines.push("");
  lines.push(bullet(insight.recommendations));
  lines.push("");
  lines.push("Metas realistas para os proximos meses:");
  lines.push(bullet(insight.goals));
  lines.push("");

  lines.push("## 15. Roadmap de 90 dias");
  lines.push("");
  lines.push("Mes 1:");
  lines.push(bullet(roadmap.mes1));
  lines.push("");
  lines.push("Mes 2:");
  lines.push(bullet(roadmap.mes2));
  lines.push("");
  lines.push("Mes 3:");
  lines.push(bullet(roadmap.mes3));
  lines.push("");

  lines.push("## 16. Blocos financeiros sugeridos para implementar no sistema");
  lines.push("");
  lines.push(bullet(report.blocks));
  lines.push("");

  lines.push("## 17. Dados faltantes que impedem analise 100% precisa");
  lines.push("");
  lines.push(bullet(report.gaps));
  lines.push("");

  lines.push("## Anexos operacionais");
  lines.push("");
  lines.push("Receita por semana:");
  lines.push(table(
    ["Semana", "Unidades", "Receita"],
    current.receitaPorSemana.map((item) => [item.key, fmtNumber(item.quantity), fmtMoney(item.total)])
  ));
  lines.push("");
  lines.push("Pedidos por status:");
  lines.push(table(
    ["Status", "Quantidade"],
    current.pedidosPorStatus.map((item) => [item.status, item.count])
  ));
  lines.push("");
  lines.push("Canais:");
  lines.push(table(
    ["Canal", "Qtd", "Receita"],
    current.canais.map((item) => [item.key, item.quantity, fmtMoney(item.total)])
  ));
  lines.push("");

  return lines.join("\n");
}

async function writeReport(report, args) {
  await fs.mkdir(args.output, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
  const base = path.join(args.output, `consultoria-financeira-stella-${stamp}`);
  const markdownPath = `${base}.md`;
  const jsonPath = `${base}.json`;
  await fs.writeFile(markdownPath, buildMarkdown(report), "utf8");
  if (args.json) {
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  }
  return {
    markdownPath,
    jsonPath: args.json ? jsonPath : null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.confirm !== CONFIRM_VALUE) {
    console.error(`Informe --confirm=${CONFIRM_VALUE} para confirmar a analise read-only.`);
    process.exitCode = 1;
    return;
  }

  const selected = parseMonth(args.mes);
  const selectedPeriod = periodFor(selected.mes, selected.ano);
  const periods = monthsEndingAt(selectedPeriod, args.ultimosMeses);
  const history = [];

  for (const period of periods) {
    history.push(await calculateMonth(period, args));
  }

  const current = history.at(-1);
  const [context, inventory] = await Promise.all([
    loadContext(args),
    loadInventory(history, args),
  ]);
  const report = buildReport(args, selectedPeriod, history, current, context, inventory);
  const output = await writeReport(report, args);

  console.log("Consultoria financeira concluida.");
  console.log(`Markdown: ${output.markdownPath}`);
  if (output.jsonPath) console.log(`JSON: ${output.jsonPath}`);
  console.log(`Status: ${report.status}`);
  console.log(`Receita: ${fmtMoney(current.receitaRecebida)}`);
  console.log(`Lucro apuravel: ${fmtMoney(current.lucroApuravel)}`);
  console.log(`Margem bruta: ${fmtPercent(current.margemBrutaPct)}`);
  console.log(`Caixa gerencial: ${fmtMoney(context.saldoGerencial)}`);
}

main()
  .catch((error) => {
    console.error("Erro ao gerar consultoria financeira:");
    console.error(error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
