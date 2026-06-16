import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_MARKER = "[SIMULACAO_2_MESES_STELLA]";
const DEFAULT_OUTPUT = "tmp/auditorias";
const DEFAULT_DAYS = 60;
const VALID_PAYMENT_STATUS = new Set(["AGUARDANDO_PAGAMENTO", "PENDENTE", "PROCESSANDO_PAGAMENTO", "PAGO", "CANCELADO", "EXPIRADO", "RECUSADO", "ESTORNADO"]);
const VALID_ORDER_STATUS = new Set(["PEDIDO_RECEBIDO", "AGUARDANDO_PAGAMENTO", "PAGO", "EM_SEPARACAO", "SEPARADO", "PEDIDO_SEPARADO", "AGUARDANDO_RETIRADA", "SAIU_PARA_ENTREGA", "PEDIDO_ENVIADO", "ENTREGUE", "PEDIDO_ENTREGUE", "CANCELADO", "PROBLEMA", "PROBLEMA_OPERACIONAL"]);
const VALID_SHIPPING_STATUS = new Set(["PENDENTE", "PREPARADO", "ETIQUETA_COMPRADA", "ETIQUETA_GERADA", "POSTADO", "SAIU_PARA_ENTREGA", "AGUARDANDO_RETIRADA", "ENTREGUE", "PROBLEMA"]);
const VALID_CASH_TYPES = new Set(["ENTRADA", "SAIDA", "AJUSTE"]);
const VALID_CASH_STATUS = new Set(["PREVISTA", "APROVADA", "PAGA", "CANCELADA"]);
const VALID_EXPENSE_TYPES = new Set(["COMPRA_EMBALAGEM_INSUMO", "ASSINATURA", "COMPRA_UNICA", "INVESTIMENTO_ESTRUTURA", "MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR", "PERMUTA_PATROCINIO", "OUTRO"]);
const VALID_EXPENSE_STATUS = new Set(["PENDENTE", "PAGO", "VENCIDO", "CANCELADO"]);
const VALID_PRO_LABORE_STATUS = new Set(["PREVISTO", "APROVADO", "PAGO", "CANCELADO"]);
const EPSILON = 0.05;

const PAGE_AREAS = {
  "/dashboard": ["Vendas e pedidos", "Resultado e distribuicao", "Relatorios e graficos", "Caixa"],
  "/vendas": ["Vendas e pedidos", "Qualidade de dados"],
  "/pedidos": ["Vendas e pedidos", "Qualidade de dados"],
  "/compras": ["Compras de estoque", "Estoque"],
  "/compras/estoque": ["Estoque", "Reposicao"],
  "/compras/gastos": ["Gastos financeiros"],
  "/compras/financeiro": ["Caixa", "Gastos financeiros", "Pro-labore"],
  "/compras/resultado": ["Resultado e distribuicao", "Pro-labore", "Relatorios e graficos"],
  "/compras/reposicao": ["Reposicao", "Estoque"],
  "/relatorios": ["Relatorios e graficos", "Vendas e pedidos", "Estoque"],
  "/resumos/vendas": ["Vendas e pedidos", "Relatorios e graficos"],
  "/resumos/estoque": ["Estoque", "Reposicao"],
  "/resumos/clientes": ["Qualidade de dados", "Vendas e pedidos"],
};

function parseArgs(argv) {
  const args = {
    escopo: "simulacao",
    marcador: DEFAULT_MARKER,
    dias: DEFAULT_DAYS,
    desde: null,
    ate: null,
    output: DEFAULT_OUTPUT,
    json: false,
    failOnCritical: false,
  };

  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg === "--fail-on-critical") args.failOnCritical = true;
    else if (arg.startsWith("--escopo=")) args.escopo = String(arg.slice("--escopo=".length)).trim() || args.escopo;
    else if (arg.startsWith("--marcador=")) args.marcador = stripWrappingQuotes(arg.slice("--marcador=".length)) || args.marcador;
    else if (arg.startsWith("--dias=")) args.dias = Math.max(1, toInt(arg.slice("--dias=".length), DEFAULT_DAYS));
    else if (arg.startsWith("--desde=")) args.desde = parseDateArg(arg.slice("--desde=".length), "desde");
    else if (arg.startsWith("--ate=")) args.ate = parseDateArg(arg.slice("--ate=".length), "ate");
    else if (arg.startsWith("--output=")) args.output = stripWrappingQuotes(arg.slice("--output=".length)) || args.output;
  }

  return args;
}

function stripWrappingQuotes(value) {
  const text = String(value ?? "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function parseDateArg(value, mode) {
  const raw = stripWrappingQuotes(value);
  if (!raw) return null;
  const date = new Date(`${raw}T${mode === "ate" ? "23:59:59.999" : "00:00:00.000"}`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida em --${mode}: ${raw}. Use YYYY-MM-DD.`);
  }
  return date;
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

function isClose(a, b, tolerance = EPSILON) {
  return Math.abs(round(a) - round(b)) <= tolerance;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthPeriod(mes, ano) {
  const inicio = new Date(ano, mes - 1, 1);
  const fimExclusivo = new Date(ano, mes, 1);
  const fim = new Date(fimExclusivo.getTime() - 1);
  return { inicio, fim, fimExclusivo };
}

function normalizeSize(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text || text === "NULL" || text === "UNDEFINED") return "UNICO";
  return text;
}

function originPrefix(marker) {
  return stripWrappingQuotes(marker)
    .replace(/[\[\]]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function markerWhere(args, field = "observacoes") {
  if (args.escopo === "periodo" || args.escopo === "todos") return {};
  return { [field]: { contains: args.marcador } };
}

function dateWhere(args, field) {
  if (args.desde || args.ate) {
    return {
      [field]: {
        ...(args.desde ? { gte: args.desde } : {}),
        ...(args.ate ? { lte: args.ate } : {}),
      },
    };
  }
  if (args.escopo === "periodo") {
    const desde = new Date();
    desde.setDate(desde.getDate() - args.dias + 1);
    desde.setHours(0, 0, 0, 0);
    return { [field]: { gte: desde } };
  }
  return {};
}

function combineWhere(...parts) {
  return parts.reduce((acc, part) => ({ ...acc, ...part }), {});
}

function movementWhere(args) {
  const prefix = originPrefix(args.marcador);
  const markerPart =
    args.escopo === "periodo" || args.escopo === "todos"
      ? {}
      : {
          OR: [
            { origemTipo: { startsWith: prefix } },
            { codigoMovimentacao: { startsWith: "SIM-MOV-" } },
          ],
        };

  return combineWhere(markerPart, dateWhere(args, "criadoEm"));
}

function cashWhere(args) {
  const prefix = originPrefix(args.marcador);
  const markerPart =
    args.escopo === "periodo" || args.escopo === "todos"
      ? {}
      : {
          OR: [
            { observacoes: { contains: args.marcador } },
            { origemTipo: { startsWith: prefix } },
          ],
        };
  return combineWhere(markerPart, dateWhere(args, "criadoEm"));
}

function addFinding(findings, severity, area, description, impact, records = [], recommendation = "Revisar manualmente antes de qualquer correcao.") {
  const filteredRecords = records.filter(Boolean).slice(0, 40);
  findings.push({
    severity,
    severidade: severity,
    area,
    description,
    descricao: description,
    impact,
    impacto: impact,
    records: filteredRecords,
    registros: filteredRecords,
    recommendation,
    recomendacao: recommendation,
  });
}

function addCountFinding(findings, severity, area, description, count, impact, recommendation) {
  if (count > 0) {
    addFinding(findings, severity, area, description, [`${count} registro(s) afetado(s).`, impact].join(" "), [], recommendation);
  }
}

function sum(items, selector) {
  return round(items.reduce((total, item) => total + num(selector(item)), 0));
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

function aggregateMap(items, keyFn, valueFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const current = map.get(key) || { key, count: 0, total: 0, quantity: 0 };
    current.count += 1;
    const value = valueFn(item);
    current.total = round(current.total + num(value.total));
    current.quantity += num(value.quantity);
    map.set(key, current);
  }
  return [...map.values()];
}

function calcularTotalCompraEsperado(compra) {
  const totalProdutosBase = sum(
    compra.itens.filter((item) => item.tipoItem === "produto"),
    (item) => item.valorTotalBase
  );
  const totalAdicionaisBase = sum(
    compra.itens.filter((item) => item.tipoItem === "adicional"),
    (item) => item.valorTotalBase
  );
  const descontoProdutos = totalProdutosBase * (num(compra.descontoPercentual) / 100);
  const totalPelosItensArredondados = round(
    sum(compra.itens, (item) => item.valorTotalFinal) + num(compra.frete)
  );
  const totalPelaFormula = round(
    totalProdutosBase - descontoProdutos + totalAdicionaisBase + num(compra.frete)
  );

  return {
    totalPelaFormula,
    totalPelosItensArredondados,
    diferencaItens: round(totalPelaFormula - totalPelosItensArredondados),
  };
}

function top(items, field, limit = 10) {
  return [...items].sort((a, b) => num(b[field]) - num(a[field])).slice(0, limit);
}

function stableJson(value) {
  return JSON.stringify(value, null, 2);
}

function fmtMoney(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(round(value));
}

function fmtPercent(value) {
  return `${round(value)}%`;
}

function severityWeight(severity) {
  if (severity === "CRITICO") return 18;
  if (severity === "ALTO") return 10;
  if (severity === "MEDIO") return 5;
  if (severity === "BAIXO") return 2;
  return 0;
}

function scoreForArea(findings, aliases) {
  const relevant = findings.filter((finding) => aliases.includes(finding.area));
  const penalty = relevant.reduce((total, finding) => total + severityWeight(finding.severity), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

async function loadData(args) {
  const vendasWhere = combineWhere(markerWhere(args), dateWhere(args, "criadoEm"));
  const pedidosWhere = combineWhere(markerWhere(args), dateWhere(args, "criadoEm"));
  const comprasWhere = combineWhere(markerWhere(args), dateWhere(args, "criadoEm"));
  const gastosWhere = combineWhere(markerWhere(args), dateWhere(args, "criadoEm"));
  const apuracoesWhere = markerWhere(args);

  const [
    produtos,
    estoquesProdutos,
    adicionais,
    estoquesAdicionais,
    clientes,
    vendas,
    pedidos,
    compras,
    movimentos,
    movimentosAdicionais,
    gastos,
    contas,
    caixa,
    regras,
    apuracoes,
  ] = await Promise.all([
    prisma.produto.findMany({ include: { estoque: true }, orderBy: { nome: "asc" } }),
    prisma.estoqueProduto.findMany({ include: { produto: true } }),
    prisma.itemAdicional.findMany({ include: { estoque: true }, orderBy: { nome: "asc" } }),
    prisma.estoqueAdicional.findMany({ include: { itemAdicional: true } }),
    prisma.cliente.findMany({ where: combineWhere(markerWhere(args), dateWhere(args, "criadoEm")), orderBy: { criadoEm: "asc" } }),
    prisma.venda.findMany({
      where: vendasWhere,
      include: { cliente: true, itens: { include: { produto: true }, orderBy: { criadoEm: "asc" } } },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.pedidoOnline.findMany({
      where: pedidosWhere,
      include: {
        cliente: true,
        envio: true,
        itens: {
        include: {
          adicionais: true,
          embalagemPresente: true,
        },
        orderBy: { criadoEm: "asc" },
      },
        adicionais: true,
        embalagensPresente: true,
        statusHistorico: { orderBy: { criadoEm: "asc" } },
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.compra.findMany({
      where: comprasWhere,
      include: { itens: { include: { produto: true, itemAdicional: true }, orderBy: { criadoEm: "asc" } } },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.movimentacao.findMany({
      where: movementWhere(args),
      include: { adicionaisConsumidos: true },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.movimentacaoAdicional.findMany({ include: { movimentacao: true } }),
    prisma.lancamentoFinanceiro.findMany({ where: gastosWhere, include: { movimentacaoCaixa: true, contaFinanceira: true }, orderBy: { criadoEm: "asc" } }),
    prisma.contaFinanceira.findMany({ include: { movimentacoesCaixa: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
    prisma.movimentacaoCaixa.findMany({ where: cashWhere(args), include: { conta: true }, orderBy: { criadoEm: "asc" } }),
    prisma.regraDistribuicaoResultado.findMany({ include: { destinos: true }, orderBy: { criadoEm: "asc" } }),
    prisma.apuracaoResultadoMensal.findMany({
      where: apuracoesWhere,
      include: { destinos: { include: { movimentacaoCaixa: true }, orderBy: { criadoEm: "asc" } } },
      orderBy: [{ ano: "asc" }, { mes: "asc" }],
    }),
  ]);

  return {
    produtos,
    estoquesProdutos,
    adicionais,
    estoquesAdicionais,
    clientes,
    vendas,
    pedidos,
    compras,
    movimentos,
    movimentosAdicionais,
    gastos,
    contas,
    caixa,
    regras,
    apuracoes,
  };
}

function pedidoContaReceita(pedido) {
  return pedido.origemCanal === "LOJA_STELLA" &&
    pedido.statusPagamento === "PAGO" &&
    !["CANCELADO", "EXPIRADO", "RECUSADO"].includes(pedido.status);
}

function vendaContaReceita(venda) {
  return !["CANCELADA", "NA_LIXEIRA"].includes(venda.status);
}

function pedidoPago(pedido) {
  return pedido.statusPagamento === "PAGO";
}

function pedidoCanceladoOuRecusado(pedido) {
  return pedido.status === "CANCELADO" || ["CANCELADO", "EXPIRADO", "RECUSADO"].includes(pedido.statusPagamento);
}

function lineRevenueEvents(data) {
  const vendaEvents = data.vendas
    .filter(vendaContaReceita)
    .flatMap((venda) =>
      venda.itens.map((item) => ({
        date: venda.criadoEm,
        tipo: "VENDA",
        codigo: venda.codigo,
        produtoId: item.produtoId,
        codigoInterno: item.codigoDigitado,
        nomeProduto: item.descricao,
        tamanhoAnel: normalizeSize(item.tamanhoAnel),
        quantidade: item.quantidade,
        total: item.valorTotal,
      })),
    );

  const pedidoEvents = data.pedidos
    .filter(pedidoContaReceita)
    .flatMap((pedido) =>
      pedido.itens.map((item) => ({
        date: pedido.pagoEm || pedido.criadoEm,
        tipo: "PEDIDO_ONLINE",
        codigo: pedido.codigo,
        produtoId: item.produtoId,
        codigoInterno: item.codigoInterno,
        nomeProduto: item.nomeProduto,
        tamanhoAnel: normalizeSize(item.tamanhoAnel),
        quantidade: item.quantidade,
        total: item.total,
      })),
    );

  return [...vendaEvents, ...pedidoEvents];
}

function auditVolume(data, args, findings) {
  const events = lineRevenueEvents(data);
  const unitsTotal = events.reduce((total, item) => total + num(item.quantidade), 0);
  const revenueTotal = sum(events, (item) => item.total);
  const dates = events.map((event) => event.date).filter(Boolean).sort((a, b) => a - b);
  const start = dates[0] || null;
  const end = dates[dates.length - 1] || null;
  const spanDays = start && end ? Math.floor((end - start) / 86400000) + 1 : 0;
  const averageByExpectedDays = args.dias > 0 ? round(unitsTotal / args.dias) : 0;
  const averageByActualSpan = spanDays > 0 ? round(unitsTotal / spanDays) : 0;
  const byDay = aggregateMap(events, (event) => dateKey(event.date), (event) => ({ quantity: event.quantidade, total: event.total }));
  const byWeek = aggregateMap(events, (event) => weekKey(event.date), (event) => ({ quantity: event.quantidade, total: event.total }));
  const topDays = top(byDay, "total", 10);
  const topProducts = top(aggregateMap(events, (event) => `${event.codigoInterno} - ${event.nomeProduto}`, (event) => ({ quantity: event.quantidade, total: event.total })), "quantity", 10);
  const topSizes = top(aggregateMap(events.filter((event) => event.tamanhoAnel !== "UNICO"), (event) => event.tamanhoAnel, (event) => ({ quantity: event.quantidade, total: event.total })), "quantity", 10);
  const daySet = new Set(byDay.map((item) => item.key));
  const daysWithoutSales = [];

  if (start && end) {
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      const key = dateKey(cursor);
      if (!daySet.has(key)) daysWithoutSales.push(key);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  if (unitsTotal === 0) {
    addFinding(findings, "CRITICO", "Volume", "Nenhuma unidade vendida foi encontrada no escopo auditado.", "Dashboards e relatórios de venda ficam vazios.", [], "Verificar se a simulação foi executada ou se o marcador informado está correto.");
  }
  if (Math.abs(unitsTotal - args.dias * 5) > args.dias * 1.5) {
    addFinding(findings, "MEDIO", "Volume", "Total de unidades vendidas ficou fora da faixa esperada para a simulação.", `Encontrado ${unitsTotal}; esperado perto de ${args.dias * 5}.`, [], "Revisar parâmetros --dias/--itens-dia ou geração de vendas.");
  }
  if (spanDays > 0 && Math.abs(spanDays - args.dias) > 10) {
    addFinding(findings, "MEDIO", "Volume", "Período efetivo de vendas difere bastante do período esperado.", `Período encontrado: ${spanDays} dias; esperado: ${args.dias}.`, [], "Verificar datas geradas na simulação.");
  }
  if (byWeek.length > 1) {
    const quantities = byWeek.map((item) => item.quantity);
    const unique = new Set(quantities);
    if (unique.size <= 1) {
      addFinding(findings, "BAIXO", "Volume", "Semanas com volumes idênticos.", "A simulação perde variação natural para gráficos.", byWeek.map((item) => `${item.key}: ${item.quantity}`), "Introduzir variação semanal na simulação se quiser dados mais orgânicos.");
    }
  }

  const inProgressRecent = data.pedidos.filter((pedido) => {
    const recentCut = new Date();
    recentCut.setDate(recentCut.getDate() - 14);
    return pedido.criadoEm >= recentCut && ["PAGO", "PEDIDO_RECEBIDO", "EM_SEPARACAO", "SEPARADO", "AGUARDANDO_RETIRADA", "SAIU_PARA_ENTREGA", "PROBLEMA"].includes(pedido.status);
  });
  if (inProgressRecent.length === 0) {
    addFinding(findings, "MEDIO", "Vendas e pedidos", "Não há pedidos recentes em andamento.", "A central operacional pode ficar sem dados para testar etapas abertas.", [], "Gerar alguns pedidos nas últimas duas semanas com status operacional não finalizado.");
  }

  return {
    unitsTotal,
    revenueTotal,
    start,
    end,
    spanDays,
    averageByExpectedDays,
    averageByActualSpan,
    byDay,
    byWeek,
    daysWithoutSales,
    topDays,
    topProducts,
    topSizes,
    recentInProgressOrders: inProgressRecent.length,
    statuses: aggregateMap(data.pedidos, (pedido) => pedido.status, () => ({ quantity: 1, total: 0 })),
  };
}

function auditSalesAndOrders(data, args, findings) {
  const movementByRelated = groupBy(data.movimentos, (mov) => String(mov.relacionadoA || ""));
  const movementByOrigin = groupBy(data.movimentos, (mov) => String(mov.origemId || ""));

  for (const venda of data.vendas) {
    if (!venda.clienteId || !venda.cliente) addFinding(findings, "ALTO", "Vendas e pedidos", "Venda sem cliente vinculado.", "Relatórios por cliente e resumos ficam incompletos.", [venda.codigo], "Vincular cliente válido à venda simulada.");
    if (venda.itens.length === 0) addFinding(findings, "CRITICO", "Vendas e pedidos", "Venda sem itens.", "Faturamento pode existir sem lastro operacional.", [venda.codigo], "Recriar ou revisar a venda.");
    if (vendaContaReceita(venda) && num(venda.valorTotal) <= 0) addFinding(findings, "CRITICO", "Vendas e pedidos", "Venda ativa/finalizada com total zerado.", "Faturamento e lucro ficam distorcidos.", [venda.codigo], "Revisar itens e valores da venda.");
    const itemTotal = sum(venda.itens, (item) => item.valorTotal);
    if (!isClose(itemTotal, venda.valorTotal)) {
      addFinding(findings, "ALTO", "Vendas e pedidos", "Soma dos itens não bate com total da venda.", `Itens: ${fmtMoney(itemTotal)}; venda: ${fmtMoney(venda.valorTotal)}.`, [venda.codigo], "Conferir desconto aplicado e totais gravados.");
    }
    if (!String(venda.observacoes || "").includes(args.marcador) && args.escopo === "simulacao") {
      addFinding(findings, "MEDIO", "Vendas e pedidos", "Venda no escopo de simulação sem marcador.", "Reset e auditorias futuras podem não encontrá-la.", [venda.codigo], "Marcar dados simulados com o identificador definido.");
    }
    for (const item of venda.itens) {
      const movimentos = movementByRelated.get(item.id) || [];
      const baixa = movimentos.filter((mov) => String(mov.tipoMovimentacao || "").startsWith("SAIDA"));
      if (baixa.length === 0 && vendaContaReceita(venda)) {
        addFinding(findings, "CRITICO", "Estoque", "Venda finalizada sem baixa de estoque para item.", "Estoque pode estar superestimado.", [`${venda.codigo}/${item.codigoDigitado}`], "Criar movimento de saída apenas após apuração manual.");
      }
      if (baixa.length > 1) {
        addFinding(findings, "ALTO", "Estoque", "Item de venda com baixa duplicada.", "Estoque e custo podem estar subestimados.", [`${venda.codigo}/${item.codigoDigitado}: ${baixa.length} baixas`], "Investigar movimentos duplicados antes de corrigir.");
      }
    }
  }

  for (const pedido of data.pedidos) {
    if (!pedido.clienteId && (!pedido.nomeCliente || !pedido.telefoneCliente)) {
      addFinding(findings, "ALTO", "Vendas e pedidos", "Pedido sem cliente nem dados mínimos de contato.", "Atendimento e relatórios por cliente ficam comprometidos.", [pedido.codigo], "Preencher nome e telefone ou vincular cliente.");
    }
    if (pedido.itens.length === 0) addFinding(findings, "CRITICO", "Vendas e pedidos", "Pedido sem itens.", "Pedido pode aparecer sem produto vendido.", [pedido.codigo], "Revisar criação do pedido.");
    if (!VALID_ORDER_STATUS.has(pedido.status)) addFinding(findings, "MEDIO", "Vendas e pedidos", "Pedido com status operacional fora da lista conhecida.", "Filtros e etapas podem não classificar corretamente.", [`${pedido.codigo}: ${pedido.status}`], "Normalizar status para o fluxo operacional atual.");
    if (!VALID_PAYMENT_STATUS.has(pedido.statusPagamento)) addFinding(findings, "MEDIO", "Vendas e pedidos", "Pedido com status de pagamento fora da lista conhecida.", "Filtros de pagamento podem ignorar o pedido.", [`${pedido.codigo}: ${pedido.statusPagamento}`], "Normalizar status de pagamento.");
    if (pedidoPago(pedido) && num(pedido.total) <= 0) addFinding(findings, "CRITICO", "Vendas e pedidos", "Pedido pago com total inválido.", "Receita recebida fica incorreta.", [pedido.codigo], "Revisar totais do pedido.");
    if (["ENTREGUE", "PEDIDO_ENTREGUE"].includes(pedido.status) && !pedidoPago(pedido)) addFinding(findings, "ALTO", "Vendas e pedidos", "Pedido entregue sem pagamento confirmado.", "Relatórios operacionais e financeiros divergem.", [pedido.codigo], "Conferir status de pagamento.");
    if (pedido.status === "SAIU_PARA_ENTREGA" && !pedido.envio) addFinding(findings, "ALTO", "Vendas e pedidos", "Pedido saiu para entrega sem dados de envio.", "Central operacional não tem lastro logístico.", [pedido.codigo], "Preencher envio ou ajustar status.");
    if (pedido.envio) {
      if (!VALID_SHIPPING_STATUS.has(pedido.envio.statusEnvio)) addFinding(findings, "MEDIO", "Vendas e pedidos", "Envio com status fora da lista conhecida.", "Fluxo logístico pode não avançar.", [`${pedido.codigo}: ${pedido.envio.statusEnvio}`], "Normalizar status de envio.");
      if (pedido.envio.gatewayLogistico === "MELHOR_ENVIO" && (!pedido.envio.transportadora || !pedido.envio.servico)) {
        addFinding(findings, "MEDIO", "Vendas e pedidos", "Pedido Melhor Envio sem transportadora/serviço mínimos.", "Ações de etiqueta/rastreio podem ficar incompletas.", [pedido.codigo], "Completar dados mínimos do envio.");
      }
      if (pedido.envio.tipoEntrega === "RETIRADA" && !["RETIRADA_LOCAL", "ENTREGA_MANUAL"].includes(String(pedido.envio.gatewayLogistico || ""))) {
        addFinding(findings, "BAIXO", "Vendas e pedidos", "Pedido de retirada com gateway logístico incomum.", "Filtro de modalidade pode ficar ambíguo.", [pedido.codigo], "Validar modalidade de retirada.");
      }
    }
    const itemTotal = sum(pedido.itens, (item) => item.total);
    const adicionaisTotal = sum(pedido.adicionais, (item) => item.valorVendaTotal);
    const embalagensTotal = sum(pedido.embalagensPresente, (item) => item.valorTotal);
    const expectedTotal = round(itemTotal + adicionaisTotal + embalagensTotal + num(pedido.frete) - num(pedido.cupomDescontoValor) - num(pedido.cashbackUsadoValor));
    if (!isClose(expectedTotal, pedido.total)) {
      addFinding(findings, "ALTO", "Vendas e pedidos", "Total do pedido não bate com itens/adicionais/embalagens/frete/descontos.", `Esperado ${fmtMoney(expectedTotal)}; gravado ${fmtMoney(pedido.total)}.`, [pedido.codigo], "Recalcular total do pedido em ambiente controlado.");
    }
    if (pedidoCanceladoOuRecusado(pedido) && pedido.valorPago > 0) {
      addFinding(findings, "ALTO", "Vendas e pedidos", "Pedido cancelado/recusado com valor pago positivo.", "Receita e reembolso podem ficar incoerentes.", [pedido.codigo], "Conferir fluxo de estorno/cancelamento.");
    }
    if (pedido.origemCanal === "LOJA_STELLA" && pedidoPago(pedido) && !pedidoCanceladoOuRecusado(pedido)) {
      for (const item of pedido.itens) {
        const baixa = (movementByRelated.get(item.id) || []).filter((mov) => String(mov.tipoMovimentacao || "").startsWith("SAIDA"));
        if (baixa.length === 0) addFinding(findings, "CRITICO", "Estoque", "Pedido online pago sem baixa para item.", "Estoque pode estar superestimado.", [`${pedido.codigo}/${item.codigoInterno}`], "Investigar efetivação do pedido pago.");
        if (baixa.length > 1) addFinding(findings, "ALTO", "Estoque", "Item de pedido online com baixa duplicada.", "Estoque e custo podem estar subestimados.", [`${pedido.codigo}/${item.codigoInterno}: ${baixa.length} baixas`], "Investigar movimentos duplicados.");
      }
    }
    const originMovements = movementByOrigin.get(pedido.id) || [];
    if (!pedidoPago(pedido) && originMovements.some((mov) => String(mov.tipoMovimentacao || "").startsWith("SAIDA"))) {
      addFinding(findings, "ALTO", "Estoque", "Pedido não pago com baixa de estoque.", "Estoque pode ter sido reduzido antes da confirmação de pagamento.", [pedido.codigo], "Conferir status e movimentos do pedido.");
    }
  }

  const adminManualPaid = data.pedidos.filter((pedido) => pedido.origemCanal === "ADMIN_MANUAL" && pedido.statusPagamento === "PAGO");
  if (adminManualPaid.length > 0) {
    addFinding(findings, "INFO", "Vendas e pedidos", "Pedidos ADMIN_MANUAL pagos encontrados.", "Eles não devem entrar duas vezes na receita: a regra atual do resultado conta a Venda gerada e exclui PedidoOnline ADMIN_MANUAL.", adminManualPaid.map((pedido) => pedido.codigo), "Manter a regra de faturamento igual à de lib/financeiro/resultado.ts.");
  }

  return {
    vendaTotal: sum(data.vendas.filter(vendaContaReceita), (venda) => venda.valorTotal),
    pedidoPublicoTotal: sum(data.pedidos.filter(pedidoContaReceita), (pedido) => num(pedido.valorPago) || pedido.total),
    adminManualPaid: adminManualPaid.length,
  };
}

function auditStock(data, findings) {
  const productByCode = new Map(data.produtos.map((product) => [product.codigoInterno, product]));
  const additionalByCode = new Map(data.adicionais.map((item) => [item.codigoInterno, item]));
  const stockByKey = new Map(data.estoquesProdutos.map((stock) => [`${stock.produtoId}:${normalizeSize(stock.tamanhoAnel)}`, stock]));
  const additionalStockById = new Map(data.estoquesAdicionais.map((stock) => [stock.itemAdicionalId, stock]));
  const negativeProducts = data.estoquesProdutos.filter((stock) => stock.quantidadeAtual < 0);
  const negativeAdditionals = data.estoquesAdicionais.filter((stock) => stock.quantidadeAtual < 0);
  addCountFinding(findings, "CRITICO", "Estoque", "Estoque de produto negativo.", negativeProducts.length, "Reposição, checkout e relatórios podem quebrar premissas de saldo.", "Investigar movimentos e corrigir por ajuste controlado.");
  addCountFinding(findings, "CRITICO", "Estoque", "Estoque adicional/embalagem negativo.", negativeAdditionals.length, "Baixa de embalagem/adicional está incoerente.", "Investigar movimentos e corrigir por ajuste controlado.");

  const stockRows = [];
  const movementGroups = groupBy(data.movimentos, (mov) => `${mov.codigoItem}:${normalizeSize(mov.tamanhoAnel)}:${mov.itemTipo}`);
  for (const [key, movements] of movementGroups.entries()) {
    const [codigoItem, tamanhoAnel, itemTipo] = key.split(":");
    const entradas = movements.filter((mov) => String(mov.tipoMovimentacao || "").startsWith("ENTRADA"));
    const saidas = movements.filter((mov) => String(mov.tipoMovimentacao || "").startsWith("SAIDA"));
    const entradasQtd = entradas.reduce((total, mov) => total + num(mov.quantidade), 0);
    const saidasQtd = saidas.reduce((total, mov) => total + num(mov.quantidade), 0);
    let current = null;
    let itemId = null;

    if (itemTipo === "produto") {
      const product = productByCode.get(codigoItem);
      if (!product) {
        addFinding(findings, "ALTO", "Estoque", "Movimentação de produto órfã.", "Movimento aponta para produto inexistente.", [codigoItem], "Verificar cadastro e origem do movimento.");
      } else {
        itemId = product.id;
        current = stockByKey.get(`${product.id}:${tamanhoAnel}`)?.quantidadeAtual ?? 0;
      }
    } else if (itemTipo === "adicional") {
      const item = additionalByCode.get(codigoItem);
      if (!item) {
        addFinding(findings, "ALTO", "Estoque", "Movimentação de adicional órfã.", "Movimento aponta para item adicional inexistente.", [codigoItem], "Verificar cadastro e origem do movimento.");
      } else {
        itemId = item.id;
        current = additionalStockById.get(item.id)?.quantidadeAtual ?? 0;
      }
    }

    stockRows.push({
      codigoItem,
      itemTipo,
      itemId,
      tamanhoAnel,
      entradas: entradasQtd,
      saidas: saidasQtd,
      saldoAtual: current,
      saldoAntesDaSimulacaoEstimado: current === null ? null : current - entradasQtd + saidasQtd,
    });
  }

  const purchaseItemIds = new Set(data.compras.flatMap((compra) => compra.itens.map((item) => item.id)));
  const entryWithoutPurchase = data.movimentos.filter((mov) => String(mov.tipoMovimentacao || "").startsWith("ENTRADA") && mov.relacionadoA && !purchaseItemIds.has(mov.relacionadoA));
  addCountFinding(findings, "MEDIO", "Estoque", "Entrada de estoque sem item de compra correspondente no escopo.", entryWithoutPurchase.length, "Pode indicar movimento de ajuste sem lastro de compra.", "Conferir se a origem é ajuste esperado ou compra ausente.");

  const duplicatedByRelated = [...groupBy(data.movimentos.filter((mov) => mov.relacionadoA && String(mov.tipoMovimentacao || "").startsWith("SAIDA")), (mov) => `${mov.relacionadoA}:${mov.codigoItem}:${normalizeSize(mov.tamanhoAnel)}`).entries()]
    .filter(([, movements]) => movements.length > 1);
  for (const [key, movements] of duplicatedByRelated.slice(0, 20)) {
    addFinding(findings, "ALTO", "Estoque", "Possível baixa duplicada por item relacionado.", "Estoque/custo podem estar duplicados.", [`${key}: ${movements.length} movimentos`], "Auditar origem antes de corrigir.");
  }

  return {
    rows: stockRows,
    negativeProducts: negativeProducts.length,
    negativeAdditionals: negativeAdditionals.length,
    lowProducts: data.estoquesProdutos.filter((stock) => stock.quantidadeAtual <= 6).length,
    zeroProducts: data.estoquesProdutos.filter((stock) => stock.quantidadeAtual === 0).length,
    lowAdditionals: data.estoquesAdicionais.filter((stock) => stock.quantidadeAtual <= 6).length,
  };
}

function auditPurchases(data, findings) {
  const caixaByOrigin = groupBy(data.caixa, (mov) => `${mov.origemTipo}:${mov.origemId}`);
  const equipmentTerms = ["impressora", "camera", "câmera", "iluminacao", "iluminação", "gaveteiro", "embaladora", "etiquetadora"];
  const compraStats = { pagas: 0, pendentes: 0, embalagens: 0, estoque: data.compras.length };

  for (const compra of data.compras) {
    if (!compra.fornecedor) addFinding(findings, "ALTO", "Compras de estoque", "Compra sem fornecedor.", "Listagens e contas a pagar ficam incompletas.", [compra.codigo], "Preencher fornecedor.");
    if (compra.itens.length === 0) addFinding(findings, "CRITICO", "Compras de estoque", "Compra sem itens.", "Entrada de estoque fica sem lastro.", [compra.codigo], "Revisar compra.");
    const totalCompra = calcularTotalCompraEsperado(compra);
    if (!isClose(totalCompra.totalPelaFormula, compra.valorTotalFinal)) {
      addFinding(findings, "ALTO", "Compras de estoque", "Total final da compra nao bate com a formula oficial.", `Esperado ${fmtMoney(totalCompra.totalPelaFormula)}; gravado ${fmtMoney(compra.valorTotalFinal)}.`, [compra.codigo], "Recalcular compra em ambiente controlado.");
    } else if (!isClose(totalCompra.totalPelosItensArredondados, compra.valorTotalFinal)) {
      addFinding(
        findings,
        "INFO",
        "Compras de estoque",
        "Soma dos itens arredondados difere do total calculado no cabecalho.",
        `Itens + frete ${fmtMoney(totalCompra.totalPelosItensArredondados)}; cabecalho ${fmtMoney(compra.valorTotalFinal)}; diferenca ${fmtMoney(totalCompra.diferencaItens)}.`,
        [compra.codigo],
        "Sem correcao automatica: cabecalho fecha pela formula oficial de desconto sobre produtos."
      );
    }
    for (const item of compra.itens) {
      const entradas = data.movimentos.filter((mov) => mov.relacionadoA === item.id && String(mov.tipoMovimentacao || "").startsWith("ENTRADA"));
      if (compra.status === "ATIVA" && entradas.length === 0) addFinding(findings, "ALTO", "Compras de estoque", "Item de compra ativa sem entrada de estoque.", "Estoque pode estar subestimado.", [`${compra.codigo}/${item.codigoDigitado}`], "Investigar entrada de estoque da compra.");
      if (item.tipoItem === "adicional") compraStats.embalagens += 1;
      const text = `${item.descricao} ${compra.fornecedor}`.toLowerCase();
      if (equipmentTerms.some((term) => text.includes(term))) {
        addFinding(findings, "MEDIO", "Compras de estoque", "Item de equipamento encontrado em Compra de estoque.", "Equipamentos devem estar em LancamentoFinanceiro, não como estoque.", [`${compra.codigo}/${item.descricao}`], "Mover em fluxo manual se confirmado; não alterar automaticamente.");
      }
    }
    const movimentosCaixa = caixaByOrigin.get(`SIMULACAO_2_MESES_STELLA:COMPRA_ESTOQUE_CAIXA:${compra.id}`) || [];
    if (movimentosCaixa.length > 0) compraStats.pagas += 1;
    else compraStats.pendentes += 1;
    if (movimentosCaixa.length > 1) {
      addFinding(findings, "ALTO", "Compras de estoque", "Compra de estoque com mais de uma saída de caixa simulada.", "Caixa pode estar descontado em duplicidade.", [compra.codigo], "Conferir movimentações financeiras da compra.");
    }
    if (movimentosCaixa[0] && !isClose(movimentosCaixa[0].valor, compra.valorTotalFinal)) {
      addFinding(findings, "ALTO", "Compras de estoque", "Saída de caixa da compra não bate com total final.", `Caixa ${fmtMoney(movimentosCaixa[0].valor)}; compra ${fmtMoney(compra.valorTotalFinal)}.`, [compra.codigo], "Conferir valor pago da compra.");
    }
  }

  return compraStats;
}

function auditExpenses(data, findings) {
  const today = new Date();
  const byMovementId = new Map(data.caixa.map((mov) => [mov.id, mov]));
  const byOrigin = groupBy(data.caixa, (mov) => `${mov.origemTipo}:${mov.origemId}`);
  const byType = aggregateMap(data.gastos, (gasto) => gasto.tipo || "SEM_TIPO", (gasto) => ({ quantity: 1, total: gasto.valorReal }));
  const stats = { pagos: 0, pendentes: 0, vencidos: 0, cancelados: 0, impactamCaixa: 0, naoImpactamCaixa: 0, byType };

  for (const gasto of data.gastos) {
    if (!gasto.titulo) addFinding(findings, "ALTO", "Gastos financeiros", "Lançamento financeiro sem título.", "Listagens e relatórios ficam pouco rastreáveis.", [gasto.codigo], "Preencher título.");
    if (!VALID_EXPENSE_TYPES.has(gasto.tipo)) addFinding(findings, "MEDIO", "Gastos financeiros", "Lançamento com tipo inválido.", "Filtros por tipo podem ignorar o gasto.", [`${gasto.codigo}: ${gasto.tipo}`], "Normalizar tipo.");
    if (!gasto.categoria) addFinding(findings, "MEDIO", "Gastos financeiros", "Lançamento sem categoria.", "Gráficos por categoria ficam incompletos.", [gasto.codigo], "Preencher categoria.");
    if (num(gasto.valorReal) < 0) addFinding(findings, "CRITICO", "Gastos financeiros", "Lançamento com valor negativo.", "Totais financeiros ficam invertidos.", [gasto.codigo], "Revisar valor.");
    if (!VALID_EXPENSE_STATUS.has(gasto.statusPagamento)) addFinding(findings, "MEDIO", "Gastos financeiros", "Status de pagamento inválido.", "Filtros de pagamento podem falhar.", [`${gasto.codigo}: ${gasto.statusPagamento}`], "Normalizar status.");
    if (gasto.statusPagamento === "PAGO") {
      stats.pagos += 1;
      if (!gasto.dataPagamento) addFinding(findings, "ALTO", "Gastos financeiros", "Gasto pago sem data de pagamento.", "Apuração mensal pode perder o gasto.", [gasto.codigo], "Preencher dataPagamento.");
    } else if (gasto.statusPagamento === "VENCIDO") stats.vencidos += 1;
    else if (gasto.statusPagamento === "CANCELADO") stats.cancelados += 1;
    else stats.pendentes += 1;
    if (gasto.statusPagamento !== "PAGO" && gasto.dataVencimento && gasto.dataVencimento < today && gasto.statusPagamento === "PENDENTE") {
      addFinding(findings, "MEDIO", "Gastos financeiros", "Gasto pendente com vencimento passado.", "Central financeira deveria tratar como vencido/alerta.", [gasto.codigo], "Atualizar status para VENCIDO se aplicável.");
    }
    if (gasto.recorrente && !gasto.recorrencia) addFinding(findings, "MEDIO", "Gastos financeiros", "Assinatura/lançamento recorrente sem recorrência.", "Próximas cobranças não podem ser projetadas corretamente.", [gasto.codigo], "Preencher recorrência.");
    if (gasto.impactaCaixa) {
      stats.impactamCaixa += 1;
      if (gasto.statusPagamento === "PAGO") {
        const movement = gasto.movimentacaoCaixaId ? byMovementId.get(gasto.movimentacaoCaixaId) : null;
        const originMovements = byOrigin.get(`SIMULACAO_2_MESES_STELLA:LANCAMENTO_FINANCEIRO:${gasto.id}`) || [];
        const matches = movement ? [movement] : originMovements;
        if (matches.length === 0) addFinding(findings, "ALTO", "Gastos financeiros", "Gasto pago e com impacto no caixa sem movimentação vinculada.", "Saldo de caixa pode estar superestimado.", [gasto.codigo], "Registrar movimentação de caixa após conferência.");
        if (matches.length > 1) addFinding(findings, "ALTO", "Gastos financeiros", "Gasto com movimentação de caixa duplicada.", "Saldo de caixa pode estar subestimado.", [gasto.codigo], "Remover duplicidade apenas após auditoria manual.");
        if (matches[0] && !isClose(matches[0].valor, gasto.valorReal)) addFinding(findings, "ALTO", "Gastos financeiros", "Valor da movimentação de caixa não bate com o gasto.", `Caixa ${fmtMoney(matches[0].valor)}; gasto ${fmtMoney(gasto.valorReal)}.`, [gasto.codigo], "Conferir valor pago.");
      }
    } else {
      stats.naoImpactamCaixa += 1;
      if (gasto.movimentacaoCaixaId) addFinding(findings, "ALTO", "Gastos financeiros", "Gasto que não impacta caixa possui movimentação vinculada.", "Permutas/patrocínios podem estar alterando caixa indevidamente.", [gasto.codigo], "Verificar vínculo financeiro.");
    }
    if (gasto.tipo === "PERMUTA_PATROCINIO" && num(gasto.valorReal) <= 0) addFinding(findings, "BAIXO", "Gastos financeiros", "Permuta/patrocínio sem valor estimado.", "Relatórios de investimento ficam incompletos.", [gasto.codigo], "Informar valor estimado, mesmo sem impacto de caixa.");
    if (gasto.tipo === "INFLUENCIADOR" && !gasto.fornecedorParceiro && !gasto.observacoes) addFinding(findings, "BAIXO", "Gastos financeiros", "Influenciador sem parceiro/observação.", "Rastreabilidade da ação fica baixa.", [gasto.codigo], "Preencher parceiro ou observação.");
  }

  return stats;
}

function auditCash(data, findings) {
  const activeAccounts = data.contas.filter((conta) => conta.ativo);
  const principal = activeAccounts.find((conta) => conta.tipo === "CAIXA_PRINCIPAL" || conta.nome.toLowerCase().includes("caixa principal"));
  if (!principal) addFinding(findings, "ALTO", "Caixa", "Nenhuma conta Caixa principal ativa encontrada.", "Central financeira perde referência principal.", [], "Criar/ativar Caixa principal.");
  for (const conta of activeAccounts) {
    if (num(conta.saldoInicial) < 0) addFinding(findings, "MEDIO", "Caixa", "Conta financeira com saldo inicial negativo.", "Saldo gerencial pode precisar de justificativa.", [conta.nome], "Revisar saldo inicial.");
  }

  const duplicateOrigins = [...groupBy(data.caixa.filter((mov) => mov.origemTipo && mov.origemId), (mov) => `${mov.origemTipo}:${mov.origemId}`).entries()].filter(([, rows]) => rows.length > 1);
  for (const [key, rows] of duplicateOrigins.slice(0, 20)) {
    const nonTransfer = !key.includes("TRANSFERENCIA");
    if (nonTransfer) addFinding(findings, "ALTO", "Caixa", "Movimentações de caixa duplicadas para a mesma origem.", "Saldo realizado pode estar duplicado.", [`${key}: ${rows.length}`], "Investigar origem antes de corrigir.");
  }

  for (const mov of data.caixa) {
    if (!VALID_CASH_TYPES.has(mov.tipo)) addFinding(findings, "MEDIO", "Caixa", "Movimentação de caixa com tipo inválido.", "Saldo pode não ser calculado pela central.", [`${mov.codigo}: ${mov.tipo}`], "Normalizar tipo.");
    if (!VALID_CASH_STATUS.has(mov.status)) addFinding(findings, "MEDIO", "Caixa", "Movimentação de caixa com status inválido.", "Previsão/realizado podem ficar incorretos.", [`${mov.codigo}: ${mov.status}`], "Normalizar status.");
    if (num(mov.valor) <= 0) addFinding(findings, "ALTO", "Caixa", "Movimentação de caixa com valor zero ou negativo.", "Saldo e gráficos ficam incoerentes.", [mov.codigo], "Revisar valor.");
    if (!mov.contaId || !mov.conta) addFinding(findings, "ALTO", "Caixa", "Movimentação sem conta financeira.", "Saldo por conta não fecha.", [mov.codigo], "Vincular conta.");
    if (mov.status === "PAGA" && !mov.dataEfetiva && !mov.pagoEm) addFinding(findings, "ALTO", "Caixa", "Movimentação paga sem data efetiva/pagoEm.", "Apuração por mês pode ignorar o movimento.", [mov.codigo], "Preencher data efetiva.");
  }

  const balances = activeAccounts.map((conta) => {
    const movements = data.caixa.filter((mov) => mov.contaId === conta.id && mov.status === "PAGA");
    const entradas = sum(movements.filter((mov) => mov.tipo === "ENTRADA"), (mov) => mov.valor);
    const saidas = sum(movements.filter((mov) => mov.tipo === "SAIDA"), (mov) => mov.valor);
    const ajustes = sum(movements.filter((mov) => mov.tipo === "AJUSTE"), (mov) => mov.valor);
    return {
      contaId: conta.id,
      nome: conta.nome,
      saldoInicial: round(conta.saldoInicial),
      entradas,
      saidas,
      ajustes,
      saldoCalculado: round(num(conta.saldoInicial) + entradas - saidas + ajustes),
    };
  });

  return {
    activeAccounts: activeAccounts.length,
    balances,
    entradasPagas: sum(data.caixa.filter((mov) => mov.status === "PAGA" && mov.tipo === "ENTRADA"), (mov) => mov.valor),
    saidasPagas: sum(data.caixa.filter((mov) => mov.status === "PAGA" && mov.tipo === "SAIDA"), (mov) => mov.valor),
    previsoes: data.caixa.filter((mov) => ["PREVISTA", "APROVADA"].includes(mov.status)).length,
  };
}

function recalcMonthFromScope(data, mes, ano) {
  const period = monthPeriod(mes, ano);
  const vendas = data.vendas.filter((venda) => vendaContaReceita(venda) && venda.criadoEm >= period.inicio && venda.criadoEm < period.fimExclusivo);
  const pedidos = data.pedidos.filter((pedido) => pedidoContaReceita(pedido) && pedido.pagoEm && pedido.pagoEm >= period.inicio && pedido.pagoEm < period.fimExclusivo);
  const pedidoIds = new Set(pedidos.map((pedido) => pedido.id));
  const movimentosPedidos = data.movimentos.filter((mov) => pedidoIds.has(mov.origemId) && mov.status === "ATIVA");
  const gastos = data.gastos.filter((gasto) => gasto.status !== "NA_LIXEIRA" && gasto.statusPagamento === "PAGO" && gasto.dataPagamento && gasto.dataPagamento >= period.inicio && gasto.dataPagamento < period.fimExclusivo && !["PRO_LABORE", "DISTRIBUICAO_RESULTADO"].includes(gasto.categoria) && !["APURACAO_RESULTADO", "APURACAO_DESTINO"].includes(gasto.origemTipo));
  const caixa = data.caixa.filter((mov) => mov.status === "PAGA" && mov.dataEfetiva && mov.dataEfetiva >= period.inicio && mov.dataEfetiva < period.fimExclusivo);
  const receitaRecebida = round(sum(vendas, (venda) => venda.valorTotal) + sum(pedidos, (pedido) => num(pedido.valorPago) || pedido.total));
  const custoProdutos = round(sum(vendas, (venda) => venda.gastoTotal) + sum(movimentosPedidos.filter((mov) => mov.origemTipo !== "pedido_online_embalagem"), (mov) => mov.custo));
  const custoEmbalagens = round(sum(movimentosPedidos.filter((mov) => mov.origemTipo === "pedido_online_embalagem"), (mov) => mov.custo));
  const gastosOperacionais = sum(gastos, (gasto) => gasto.valorReal);
  const comprasEstoqueCaixa = sum(caixa.filter((mov) => mov.categoria === "COMPRA_ESTOQUE"), (mov) => mov.valor);
  const caixaLiquido = round(sum(caixa.filter((mov) => mov.tipo === "ENTRADA"), (mov) => mov.valor) - sum(caixa.filter((mov) => mov.tipo === "SAIDA"), (mov) => mov.valor) + sum(caixa.filter((mov) => mov.tipo === "AJUSTE"), (mov) => mov.valor));
  const resultadoBruto = round(receitaRecebida - custoProdutos - custoEmbalagens);
  const lucroApuravel = round(resultadoBruto - gastosOperacionais);
  return { receitaRecebida, custoProdutos, custoEmbalagens, taxas: 0, fretes: 0, gastosOperacionais, comprasEstoqueCaixa, resultadoBruto, lucroApuravel, caixaLiquido, fontes: { vendasInternas: vendas.length, pedidosOnlinePagos: pedidos.length, gastosPagos: gastos.length, comprasEstoquePagasNoCaixa: comprasEstoqueCaixa, movimentosCaixaPagos: caixa.length } };
}

function auditResultAndProLabore(data, findings) {
  const activeRules = data.regras.filter((regra) => regra.ativa);
  if (activeRules.length === 0) addFinding(findings, "ALTO", "Resultado e distribuicao", "Nenhuma regra de distribuição ativa.", "Resultado não consegue sugerir destinos.", [], "Criar/ativar regra de distribuição.");
  if (activeRules.length > 1) addFinding(findings, "MEDIO", "Resultado e distribuicao", "Mais de uma regra de distribuição ativa.", "O helper usa a primeira regra ativa, o que pode confundir auditorias.", activeRules.map((regra) => regra.nome), "Manter apenas uma regra ativa ou documentar prioridade.");

  const regra = activeRules[0];
  if (regra) {
    const totalPrincipal = round(num(regra.percentualEmpresa) + num(regra.percentualProLabore));
    const totalDestinos = round(sum(regra.destinos.filter((destino) => destino.ativo), (destino) => destino.percentual));
    const totalProLabore = round(sum(regra.destinos.filter((destino) => destino.ativo && String(destino.tipo).startsWith("PRO_LABORE")), (destino) => destino.percentual));
    const totalEmpresa = round(totalDestinos - totalProLabore);
    if (!isClose(totalPrincipal, 100)) addFinding(findings, "CRITICO", "Resultado e distribuicao", "Percentual Empresa + Pró-labore não fecha 100%.", `Total: ${fmtPercent(totalPrincipal)}.`, [regra.nome], "Ajustar regra.");
    if (!isClose(totalDestinos, 100)) addFinding(findings, "CRITICO", "Resultado e distribuicao", "Destinos de distribuição não somam 100%.", `Total: ${fmtPercent(totalDestinos)}.`, [regra.nome], "Ajustar destinos.");
    if (!isClose(totalProLabore, regra.percentualProLabore)) addFinding(findings, "MEDIO", "Resultado e distribuicao", "Destinos de pró-labore não somam o percentual de pró-labore.", `Destinos pró-labore: ${fmtPercent(totalProLabore)}; regra: ${fmtPercent(regra.percentualProLabore)}.`, [regra.nome], "Revisar classificação/percentuais dos destinos.");
    if (!isClose(totalEmpresa, regra.percentualEmpresa)) addFinding(findings, "MEDIO", "Resultado e distribuicao", "Destinos da empresa não somam o percentual da empresa.", `Destinos empresa: ${fmtPercent(totalEmpresa)}; regra: ${fmtPercent(regra.percentualEmpresa)}.`, [regra.nome], "Revisar destinos não pró-labore.");
  }

  const apuracaoRows = [];
  for (const apuracao of data.apuracoes) {
    const calc = recalcMonthFromScope(data, apuracao.mes, apuracao.ano);
    apuracaoRows.push({ codigo: apuracao.codigo, mes: apuracao.mes, ano: apuracao.ano, status: apuracao.status, gravado: { receitaRecebida: apuracao.receitaRecebida, custoProdutos: apuracao.custoProdutos, gastosOperacionais: apuracao.gastosOperacionais, lucroApuravel: apuracao.lucroApuravel, caixaLiquido: apuracao.caixaLiquido }, recalculado: calc });
    if (apuracao.status === "FECHADA" && !apuracao.regraSnapshotJson) addFinding(findings, "ALTO", "Resultado e distribuicao", "Apuração fechada sem snapshot da regra.", "Fechamento perde rastreabilidade.", [apuracao.codigo], "Recriar fechamento apenas após conferência.");
    if (apuracao.status === "FECHADA" && !apuracao.fontesSnapshotJson) addFinding(findings, "ALTO", "Resultado e distribuicao", "Apuração fechada sem snapshot de fontes.", "Não dá para auditar origem dos valores.", [apuracao.codigo], "Revisar fechamento.");
    if (apuracao.status === "FECHADA" && !apuracao.alertasSnapshotJson) addFinding(findings, "MEDIO", "Resultado e distribuicao", "Apuração fechada sem snapshot de alertas.", "Alertas históricos ficam incompletos.", [apuracao.codigo], "Revisar fechamento.");
    if (!isClose(apuracao.receitaRecebida, calc.receitaRecebida)) addFinding(findings, "ALTO", "Resultado e distribuicao", "Receita da apuração diverge do recálculo no escopo.", `Gravado ${fmtMoney(apuracao.receitaRecebida)}; recalculado ${fmtMoney(calc.receitaRecebida)}.`, [apuracao.codigo], "Verificar se dados foram alterados após fechamento.");
    if (!isClose(apuracao.lucroApuravel, calc.lucroApuravel)) addFinding(findings, "ALTO", "Resultado e distribuicao", "Lucro apurável da apuração diverge do recálculo.", `Gravado ${fmtMoney(apuracao.lucroApuravel)}; recalculado ${fmtMoney(calc.lucroApuravel)}.`, [apuracao.codigo], "Verificar alterações após fechamento.");
    const destinosTotal = sum(apuracao.destinos, (destino) => destino.valor);
    const expectedDestinos = round(Math.max(0, num(apuracao.lucroApuravel)));
    if (!isClose(destinosTotal, expectedDestinos, 0.2)) addFinding(findings, "ALTO", "Resultado e distribuicao", "Destinos da apuração não somam o lucro distribuível.", `Destinos ${fmtMoney(destinosTotal)}; esperado ${fmtMoney(expectedDestinos)}.`, [apuracao.codigo], "Conferir destinos gravados.");
    if (apuracao.lucroApuravel < 0 && destinosTotal > 0) addFinding(findings, "CRITICO", "Resultado e distribuicao", "Apuração com lucro negativo e distribuição positiva.", "Pode gerar retiradas sem lucro.", [apuracao.codigo], "Revisar regra de distribuição.");

    const proLabores = apuracao.destinos.filter((destino) => String(destino.tipo).startsWith("PRO_LABORE"));
    if (proLabores.length === 0) addFinding(findings, "MEDIO", "Pro-labore", "Apuração sem destinos de pró-labore.", "Alertas de retirada não aparecem.", [apuracao.codigo], "Revisar regra/destinos.");
    const socios = proLabores.filter((destino) => ["PRO_LABORE_SOCIO_1", "PRO_LABORE_SOCIO_2"].includes(destino.tipo));
    if (socios.length === 2 && !isClose(socios[0].valor, socios[1].valor)) addFinding(findings, "MEDIO", "Pro-labore", "Sócio 1 e Sócio 2 com valores diferentes.", "Regra esperada 25/25 pode não estar respeitada.", [apuracao.codigo], "Revisar percentuais dos sócios.");
    for (const destino of proLabores) {
      if (!VALID_PRO_LABORE_STATUS.has(destino.statusPagamento)) addFinding(findings, "MEDIO", "Pro-labore", "Destino de pró-labore com status inválido.", "Ações de aprovar/pagar podem falhar.", [`${apuracao.codigo}/${destino.nome}: ${destino.statusPagamento}`], "Normalizar status.");
      if (destino.statusPagamento === "PAGO") {
        if (!destino.movimentacaoCaixaId || !destino.movimentacaoCaixa) addFinding(findings, "ALTO", "Pro-labore", "Pró-labore pago sem movimentação de caixa.", "Caixa pode estar superestimado.", [`${apuracao.codigo}/${destino.nome}`], "Registrar saída de caixa após conferência.");
        else {
          if (destino.movimentacaoCaixa.categoria !== "PRO_LABORE") addFinding(findings, "MEDIO", "Pro-labore", "Movimentação de pró-labore com categoria diferente de PRO_LABORE.", "Central financeira pode classificar errado.", [`${apuracao.codigo}/${destino.nome}`], "Ajustar categoria após conferência.");
          if (!isClose(destino.movimentacaoCaixa.valor, destino.valor)) addFinding(findings, "ALTO", "Pro-labore", "Valor pago de pró-labore diverge do destino.", `Caixa ${fmtMoney(destino.movimentacaoCaixa.valor)}; destino ${fmtMoney(destino.valor)}.`, [`${apuracao.codigo}/${destino.nome}`], "Conferir pagamento.");
        }
      }
      if (destino.statusPagamento === "APROVADO") addFinding(findings, "INFO", "Pro-labore", "Pró-labore aprovado pendente de pagamento.", "A central deve exibir pendência sem reduzir caixa.", [`${apuracao.codigo}/${destino.nome}`], "Pagar apenas quando a retirada ocorrer.");
    }
  }

  const proLaboreExpenses = data.gastos.filter((gasto) => ["PRO_LABORE", "DISTRIBUICAO_RESULTADO"].includes(gasto.categoria));
  if (proLaboreExpenses.length > 0) addFinding(findings, "MEDIO", "Pro-labore", "Pró-labore encontrado como lançamento financeiro/gasto.", "Pode entrar indevidamente como gasto operacional.", proLaboreExpenses.map((gasto) => gasto.codigo), "Manter pró-labore pelo fluxo de apuração/destino.");

  return { apuracaoRows, activeRules: activeRules.length };
}

function auditReplenishment(data, stockMetrics, findings) {
  const zero = data.estoquesProdutos.filter((stock) => stock.quantidadeAtual === 0);
  const low = data.estoquesProdutos.filter((stock) => stock.quantidadeAtual > 0 && stock.quantidadeAtual <= 6);
  const comfortable = data.estoquesProdutos.filter((stock) => stock.quantidadeAtual > 12);
  if (zero.length === 0) addFinding(findings, "INFO", "Reposicao", "Nenhum produto zerado encontrado.", "A tela de reposição ainda testa estoque baixo, mas não o cenário zerado.", [], "Opcional: zerar um item simulado se quiser testar alerta crítico.");
  if (low.length === 0) addFinding(findings, "MEDIO", "Reposicao", "Nenhum produto abaixo do limite operacional simples (<=6).", "Reposição pode não mostrar alertas relevantes.", [], "Gerar ou ajustar estoque baixo simulado.");
  if (comfortable.length === 0) addFinding(findings, "BAIXO", "Reposicao", "Nenhum produto com estoque confortável (>12).", "Comparação entre crítico e confortável fica pobre.", [], "Manter alguns produtos com estoque alto.");
  addFinding(findings, "INFO", "Reposicao", "Campos de estoque mínimo/ideal não existem no schema para todos os itens.", "A auditoria usa limite operacional simples (0 e <=6) em vez de regra configurável.", [], "Quando houver mínimo/ideal por item, incluir no relatório.");
  return { zero: zero.length, low: low.length, comfortable: comfortable.length, additionalLow: stockMetrics.lowAdditionals };
}

function auditCharts(data, findings) {
  const months = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({ key: monthKey(date), mes: date.getMonth() + 1, ano: date.getFullYear() });
  }
  const series = months.map((item) => {
    const calc = recalcMonthFromScope(data, item.mes, item.ano);
    const marketing = sum(data.gastos.filter((gasto) => gasto.statusPagamento === "PAGO" && ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"].includes(gasto.tipo) && gasto.dataPagamento && monthKey(gasto.dataPagamento) === item.key), (gasto) => gasto.valorReal);
    return { label: item.key, receita: calc.receitaRecebida, lucro: calc.lucroApuravel, caixa: calc.caixaLiquido, gastos: calc.gastosOperacionais, proLabore: round(Math.max(0, calc.lucroApuravel) * 0.5), marketing };
  });
  for (const item of series) {
    for (const [field, value] of Object.entries(item)) {
      if (field === "label") continue;
      if (!Number.isFinite(value)) addFinding(findings, "CRITICO", "Relatorios e graficos", "Série de gráfico contém NaN/Infinity.", "Componente pode renderizar incorretamente.", [`${item.label}/${field}`], "Verificar divisão por zero ou valor ausente.");
      if (Math.abs(value) > 1_000_000) addFinding(findings, "MEDIO", "Relatorios e graficos", "Série de gráfico contém valor muito alto para o cenário simulado.", "Gráfico pode ficar distorcido.", [`${item.label}/${field}: ${value}`], "Conferir dados de origem.");
    }
  }
  const ordered = series.every((item, index) => index === 0 || item.label >= series[index - 1].label);
  if (!ordered) addFinding(findings, "ALTO", "Relatorios e graficos", "Meses da série estão fora de ordem.", "Gráficos temporais ficam confusos.", series.map((item) => item.label), "Corrigir montagem da série.");
  const monthsWithRevenue = series.filter((item) => item.receita > 0).length;
  if (monthsWithRevenue < 2) addFinding(findings, "INFO", "Relatorios e graficos", "Série de 6 meses tem poucos meses com receita.", "Gráficos podem mostrar muitos zeros, mas isso é esperado se a simulação cobre 2 meses.", [`Meses com receita: ${monthsWithRevenue}`], "Sem ação necessária se a simulação for de 2 meses.");
  return { series, monthsWithRevenue };
}

function hasBadLiteral(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  return ["undefined", "null", "nan"].includes(text) || (text === "teste" && !text.includes("simul"));
}

function auditDataQuality(data, findings) {
  const stats = { missingClients: 0, missingOrders: 0, missingPurchases: 0, missingExpenses: 0, missingCash: 0, badLiterals: 0 };
  for (const cliente of data.clientes) {
    const missing = [];
    if (!cliente.nome) missing.push("nome");
    if (!cliente.telefone) missing.push("telefone");
    if (!cliente.email) missing.push("email");
    if (!cliente.documento) missing.push("documento");
    if (!cliente.rua || !cliente.numero || !cliente.cidade || !cliente.estado) missing.push("endereco");
    if (missing.length > 0) {
      stats.missingClients += 1;
      addFinding(findings, missing.includes("nome") || missing.includes("telefone") ? "ALTO" : "MEDIO", "Qualidade de dados", "Cliente simulado com dados essenciais faltantes.", `Campos: ${missing.join(", ")}.`, [cliente.codigo], "Completar dados simulados.");
    }
    for (const field of ["nome", "telefone", "email", "documento", "cidade", "estado"]) {
      if (hasBadLiteral(cliente[field])) stats.badLiterals += 1;
    }
  }
  for (const produto of data.produtos) {
    if (produto.ativo && produto.status !== "NA_LIXEIRA" && (!produto.nome || num(produto.precoVenda) <= 0 || !produto.categoria)) {
      addFinding(findings, "MEDIO", "Qualidade de dados", "Produto ativo com nome/preço/categoria incompletos.", "Produtos usados em vendas podem aparecer incompletos.", [produto.codigoInterno], "Completar cadastro do produto.");
    }
  }
  for (const pedido of data.pedidos) {
    const missing = [];
    if (!pedido.nomeCliente && !pedido.clienteId) missing.push("cliente");
    if (pedido.itens.length === 0) missing.push("itens");
    if (!pedido.status) missing.push("status");
    if (!pedido.statusPagamento) missing.push("pagamento");
    if (num(pedido.total) <= 0 && !pedidoCanceladoOuRecusado(pedido)) missing.push("total");
    if (missing.length > 0) {
      stats.missingOrders += 1;
      addFinding(findings, "ALTO", "Qualidade de dados", "Pedido com informação essencial faltante.", `Campos: ${missing.join(", ")}.`, [pedido.codigo], "Revisar pedido.");
    }
  }
  for (const compra of data.compras) {
    const missing = [];
    if (!compra.fornecedor) missing.push("fornecedor");
    if (compra.itens.length === 0) missing.push("itens");
    if (num(compra.valorTotalFinal) <= 0) missing.push("total");
    if (!compra.status) missing.push("status");
    if (missing.length > 0) {
      stats.missingPurchases += 1;
      addFinding(findings, "ALTO", "Qualidade de dados", "Compra com informação essencial faltante.", `Campos: ${missing.join(", ")}.`, [compra.codigo], "Revisar compra.");
    }
  }
  for (const gasto of data.gastos) {
    const missing = [];
    if (!gasto.tipo) missing.push("tipo");
    if (!gasto.categoria) missing.push("categoria");
    if (num(gasto.valorReal) < 0) missing.push("valor");
    if (gasto.statusPagamento === "PAGO" && !gasto.dataPagamento) missing.push("dataPagamento");
    if (missing.length > 0) {
      stats.missingExpenses += 1;
      addFinding(findings, "MEDIO", "Qualidade de dados", "Gasto com informação essencial faltante.", `Campos: ${missing.join(", ")}.`, [gasto.codigo], "Revisar lançamento.");
    }
  }
  for (const mov of data.caixa) {
    const missing = [];
    if (!mov.contaId) missing.push("conta");
    if (!mov.tipo) missing.push("tipo");
    if (num(mov.valor) <= 0) missing.push("valor");
    if (!mov.status) missing.push("status");
    if (mov.status === "PAGA" && !mov.dataEfetiva && !mov.pagoEm) missing.push("data");
    if (missing.length > 0) {
      stats.missingCash += 1;
      addFinding(findings, "ALTO", "Qualidade de dados", "Movimentação de caixa com informação essencial faltante.", `Campos: ${missing.join(", ")}.`, [mov.codigo], "Revisar movimentação.");
    }
  }
  if (stats.badLiterals > 0) addFinding(findings, "BAIXO", "Qualidade de dados", "Campos com literais problemáticos como undefined/null/NaN/teste.", "Dados podem ficar feios em telas e relatórios.", [`Ocorrências: ${stats.badLiterals}`], "Limpar dados simulados em próxima geração.");
  return stats;
}

function auditPages(data, findings) {
  return Object.entries(PAGE_AREAS).map(([page, areas]) => {
    const related = findings.filter((finding) => areas.includes(finding.area));
    const serious = related.filter((finding) => ["CRITICO", "ALTO"].includes(finding.severity));
    const enoughData =
      page.includes("vendas") ? data.vendas.length > 0 :
      page.includes("pedidos") ? data.pedidos.length > 0 :
      page.includes("compras") ? data.compras.length > 0 || data.gastos.length > 0 || data.caixa.length > 0 :
      page.includes("estoque") || page.includes("reposicao") ? data.estoquesProdutos.length > 0 :
      true;
    return {
      page,
      dadosSuficientes: enoughData,
      valoresCoerentes: serious.length === 0,
      possiveisProblemas: related.slice(0, 5).map((finding) => `${finding.severity}: ${finding.description}`),
    };
  });
}

function buildScores(findings) {
  return {
    Operacao: scoreForArea(findings, ["Volume", "Vendas e pedidos", "Qualidade de dados"]),
    Estoque: scoreForArea(findings, ["Estoque", "Reposicao"]),
    Financeiro: scoreForArea(findings, ["Caixa", "Gastos financeiros", "Pro-labore"]),
    Pedidos: scoreForArea(findings, ["Vendas e pedidos"]),
    Compras: scoreForArea(findings, ["Compras de estoque"]),
    Relatorios: scoreForArea(findings, ["Relatorios e graficos", "Resultado e distribuicao"]),
    "Qualidade dos dados": scoreForArea(findings, ["Qualidade de dados"]),
  };
}

function findingsBySeverity(findings, severity) {
  return findings.filter((finding) => finding.severity === severity);
}

function findingMarkdown(finding, index) {
  const records = finding.records.length > 0 ? finding.records.map((record) => `\`${record}\``).join(", ") : "Nenhum registro específico.";
  return [
    `${index + 1}. **${finding.severity} | ${finding.area}**`,
    `   - Descrição: ${finding.description}`,
    `   - Impacto: ${finding.impact}`,
    `   - Registros: ${records}`,
    `   - Recomendação: ${finding.recommendation}`,
  ].join("\n");
}

function table(headers, rows) {
  if (rows.length === 0) return "_Sem dados._";
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

function buildMarkdown(report) {
  const { args, generatedAt, metrics, findings, scores, pages, output } = report;
  const critical = findingsBySeverity(findings, "CRITICO");
  const high = findingsBySeverity(findings, "ALTO");
  const medium = findingsBySeverity(findings, "MEDIO");
  const low = findingsBySeverity(findings, "BAIXO");
  const info = findingsBySeverity(findings, "INFO");

  return [
    "# Auditoria da Operação Simulada",
    "",
    `Gerado em: ${generatedAt.toISOString()}`,
    `Escopo: ${args.escopo}`,
    `Marcador: \`${args.marcador}\``,
    "",
    "## 1. Resumo executivo",
    "",
    `Foram auditados ${metrics.counts.clientes} clientes, ${metrics.counts.vendas} vendas, ${metrics.counts.pedidos} pedidos, ${metrics.counts.compras} compras, ${metrics.counts.gastos} gastos, ${metrics.counts.caixa} movimentações de caixa e ${metrics.counts.movimentos} movimentações de estoque no escopo.`,
    `Unidades vendidas consideradas na regra de receita: **${metrics.volume.unitsTotal}**. Faturamento considerado: **${fmtMoney(metrics.volume.revenueTotal)}**.`,
    `Achados: ${critical.length} críticos, ${high.length} altos, ${medium.length} médios, ${low.length} baixos e ${info.length} informativos.`,
    "",
    "## 2. Saúde geral da simulação",
    "",
    table(["Dimensão", "Score"], Object.entries(scores).map(([key, value]) => [key, value])),
    "",
    `Período encontrado: ${metrics.volume.start ? dateKey(metrics.volume.start) : "-"} a ${metrics.volume.end ? dateKey(metrics.volume.end) : "-"} (${metrics.volume.spanDays} dias).`,
    `Média por ${args.dias} dias: ${metrics.volume.averageByExpectedDays} unidade(s)/dia. Média pelo período efetivo: ${metrics.volume.averageByActualSpan} unidade(s)/dia.`,
    "",
    "## 3. Vendas e pedidos",
    "",
    `Receita de vendas manuais/link: ${fmtMoney(metrics.sales.vendaTotal)}.`,
    `Receita de PedidoOnline público pago: ${fmtMoney(metrics.sales.pedidoPublicoTotal)}.`,
    `Pedidos ADMIN_MANUAL pagos identificados: ${metrics.sales.adminManualPaid}; estes são informativos e não entram como PedidoOnline público no cálculo do resultado.`,
    "",
    "Pedidos por status:",
    table(["Status", "Quantidade"], metrics.volume.statuses.map((item) => [item.key, item.quantity])),
    "",
    "Top 10 dias por faturamento:",
    table(["Dia", "Unidades", "Faturamento"], metrics.volume.topDays.map((item) => [item.key, item.quantity, fmtMoney(item.total)])),
    "",
    "Top 10 produtos vendidos:",
    table(["Produto", "Unidades", "Faturamento"], metrics.volume.topProducts.map((item) => [item.key, item.quantity, fmtMoney(item.total)])),
    "",
    "Top medidas/tamanhos vendidos:",
    table(["Tamanho", "Unidades", "Faturamento"], metrics.volume.topSizes.map((item) => [item.key, item.quantity, fmtMoney(item.total)])),
    "",
    "## 4. Estoque e movimentações",
    "",
    `Estoques negativos de produto: ${metrics.stock.negativeProducts}. Estoques negativos de adicionais: ${metrics.stock.negativeAdditionals}.`,
    `Produtos/opções com saldo zero: ${metrics.stock.zeroProducts}. Produtos/opções com saldo <= 6: ${metrics.stock.lowProducts}.`,
    "",
    "Resumo por produto/tamanho movimentado:",
    table(["Item", "Tipo", "Tamanho", "Entradas", "Saídas", "Saldo atual", "Saldo pré-simulação estimado"], metrics.stock.rows.slice(0, 80).map((row) => [row.codigoItem, row.itemTipo, row.tamanhoAnel, row.entradas, row.saidas, row.saldoAtual, row.saldoAntesDaSimulacaoEstimado])),
    "",
    "## 5. Compras de estoque",
    "",
    `Compras simuladas: ${metrics.purchases.estoque}. Compras com saída de caixa: ${metrics.purchases.pagas}. Compras sem saída de caixa no escopo: ${metrics.purchases.pendentes}. Itens adicionais/embalagens comprados: ${metrics.purchases.embalagens}.`,
    "",
    "## 6. Gastos financeiros",
    "",
    `Gastos pagos: ${metrics.expenses.pagos}. Pendentes: ${metrics.expenses.pendentes}. Vencidos: ${metrics.expenses.vencidos}. Cancelados: ${metrics.expenses.cancelados}.`,
    `Impactam caixa: ${metrics.expenses.impactamCaixa}. Não impactam caixa: ${metrics.expenses.naoImpactamCaixa}.`,
    "",
    table(["Tipo", "Quantidade", "Total"], metrics.expenses.byType.map((item) => [item.key, item.quantity, fmtMoney(item.total)])),
    "",
    "## 7. Caixa e movimentações financeiras",
    "",
    `Contas ativas: ${metrics.cash.activeAccounts}. Entradas pagas: ${fmtMoney(metrics.cash.entradasPagas)}. Saídas pagas: ${fmtMoney(metrics.cash.saidasPagas)}. Movimentos previstos/aprovados: ${metrics.cash.previsoes}.`,
    "",
    table(["Conta", "Saldo inicial", "Entradas", "Saídas", "Ajustes", "Saldo calculado"], metrics.cash.balances.map((row) => [row.nome, fmtMoney(row.saldoInicial), fmtMoney(row.entradas), fmtMoney(row.saidas), fmtMoney(row.ajustes), fmtMoney(row.saldoCalculado)])),
    "",
    "## 8. Resultado e distribuição",
    "",
    `Regras ativas encontradas: ${metrics.result.activeRules}. Apurações auditadas: ${metrics.result.apuracaoRows.length}.`,
    "",
    table(["Apuração", "Status", "Receita gravada", "Receita recalculada", "Lucro gravado", "Lucro recalculado"], metrics.result.apuracaoRows.map((row) => [`${row.codigo} (${String(row.mes).padStart(2, "0")}/${row.ano})`, row.status, fmtMoney(row.gravado.receitaRecebida), fmtMoney(row.recalculado.receitaRecebida), fmtMoney(row.gravado.lucroApuravel), fmtMoney(row.recalculado.lucroApuravel)])),
    "",
    "## 9. Pró-labore",
    "",
    "Achados específicos de pró-labore aparecem nas seções de inconsistências, alertas e informativos. A auditoria valida status, vínculo com caixa e valores pagos.",
    "",
    "## 10. Reposição",
    "",
    `Zerados: ${metrics.replenishment.zero}. Baixos: ${metrics.replenishment.low}. Confortáveis: ${metrics.replenishment.comfortable}. Adicionais baixos: ${metrics.replenishment.additionalLow}.`,
    "",
    "## 11. Relatórios e gráficos",
    "",
    `Série de 6 meses gerada com ${metrics.charts.monthsWithRevenue} mês(es) contendo receita.`,
    "",
    table(["Mês", "Receita", "Lucro", "Caixa", "Gastos", "Pró-labore", "Marketing"], metrics.charts.series.map((row) => [row.label, fmtMoney(row.receita), fmtMoney(row.lucro), fmtMoney(row.caixa), fmtMoney(row.gastos), fmtMoney(row.proLabore), fmtMoney(row.marketing)])),
    "",
    "## 12. Qualidade de dados",
    "",
    `Clientes com faltas: ${metrics.quality.missingClients}. Pedidos com faltas: ${metrics.quality.missingOrders}. Compras com faltas: ${metrics.quality.missingPurchases}. Gastos com faltas: ${metrics.quality.missingExpenses}. Caixa com faltas: ${metrics.quality.missingCash}. Literais problemáticos: ${metrics.quality.badLiterals}.`,
    "",
    "## 13. Inconsistências críticas",
    "",
    critical.length ? critical.map(findingMarkdown).join("\n\n") : "_Nenhuma inconsistência crítica encontrada._",
    "",
    "## 14. Alertas médios",
    "",
    [...high, ...medium].length ? [...high, ...medium].map(findingMarkdown).join("\n\n") : "_Nenhum alerta alto ou médio encontrado._",
    "",
    "## 15. Pontos informativos",
    "",
    [...low, ...info].length ? [...low, ...info].map(findingMarkdown).join("\n\n") : "_Nenhum ponto informativo encontrado._",
    "",
    "## 16. Recomendações de correção",
    "",
    findings.length ? table(["Severidade", "Área", "Recomendação"], findings.map((finding) => [finding.severity, finding.area, finding.recommendation])) : "_Sem recomendações._",
    "",
    "## Dashboards e páginas afetadas",
    "",
    table(["Página", "Dados suficientes?", "Valores coerentes?", "Possíveis problemas"], pages.map((page) => [page.page, page.dadosSuficientes ? "sim" : "não", page.valoresCoerentes ? "sim" : "não", page.possiveisProblemas.join("; ") || "-"])),
    "",
    "## Arquivos gerados",
    "",
    `Markdown: ${output.markdownPath}`,
    output.jsonPath ? `JSON: ${output.jsonPath}` : "JSON: não solicitado",
    "",
  ].join("\n");
}

async function writeReport(report, args) {
  await fs.mkdir(args.output, { recursive: true });
  const stamp = report.generatedAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 13);
  const base = path.join(args.output, `auditoria-operacao-simulada-${stamp}`);
  const markdownPath = `${base}.md`;
  const jsonPath = args.json ? `${base}.json` : null;
  report.output = { markdownPath, jsonPath };
  await fs.writeFile(markdownPath, buildMarkdown(report), "utf8");
  if (jsonPath) await fs.writeFile(jsonPath, stableJson(report), "utf8");
  return report.output;
}

async function runAudit(args) {
  const data = await loadData(args);
  const findings = [];
  const counts = {
    clientes: data.clientes.length,
    vendas: data.vendas.length,
    pedidos: data.pedidos.length,
    compras: data.compras.length,
    movimentos: data.movimentos.length,
    gastos: data.gastos.length,
    caixa: data.caixa.length,
    apuracoes: data.apuracoes.length,
  };
  const simulatedTotal = Object.values(counts).reduce((total, value) => total + value, 0);

  if (args.escopo === "simulacao" && simulatedTotal === 0) {
    addFinding(findings, "INFO", "Volume", "Nenhum dado simulado encontrado para o marcador informado.", "Nada foi auditado no escopo de simulação.", [args.marcador], "Execute a simulação ou informe outro marcador.");
  }

  const volume = auditVolume(data, args, findings);
  const sales = auditSalesAndOrders(data, args, findings);
  const stock = auditStock(data, findings);
  const purchases = auditPurchases(data, findings);
  const expenses = auditExpenses(data, findings);
  const cash = auditCash(data, findings);
  const result = auditResultAndProLabore(data, findings);
  const replenishment = auditReplenishment(data, stock, findings);
  const charts = auditCharts(data, findings);
  const quality = auditDataQuality(data, findings);
  const pages = auditPages(data, findings);
  const scores = buildScores(findings);

  return {
    args: {
      ...args,
      desde: args.desde ? args.desde.toISOString() : null,
      ate: args.ate ? args.ate.toISOString() : null,
    },
    generatedAt: new Date(),
    metrics: {
      counts,
      volume,
      sales,
      stock,
      purchases,
      expenses,
      cash,
      result,
      replenishment,
      charts,
      quality,
    },
    pages,
    scores,
    findings,
    output: {
      markdownPath: null,
      jsonPath: null,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await runAudit(args);
  const output = await writeReport(report, args);
  const criticalCount = findingsBySeverity(report.findings, "CRITICO").length;

  console.log("");
  console.log("Auditoria da operacao simulada concluida.");
  console.log(`Markdown: ${output.markdownPath}`);
  if (output.jsonPath) console.log(`JSON: ${output.jsonPath}`);
  console.log(`Achados: ${report.findings.length} (${criticalCount} critico(s)).`);
  console.log("Scores:");
  for (const [key, value] of Object.entries(report.scores)) {
    console.log(`- ${key}: ${value}`);
  }

  if (args.escopo === "simulacao" && Object.values(report.metrics.counts).reduce((total, value) => total + value, 0) === 0) {
    console.log("Nenhum dado simulado encontrado para o marcador informado.");
  }

  if (args.failOnCritical && criticalCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("Erro ao auditar operacao simulada:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
