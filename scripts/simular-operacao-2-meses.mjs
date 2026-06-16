import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MARKER = "[SIMULACAO_2_MESES_STELLA]";
const CONFIRMATION = "SIMULAR_STELLA";
const ORIGIN_PREFIX = "SIMULACAO_2_MESES_STELLA";
const MOVEMENT_CODE_PREFIX = "SIM-MOV-";
const DEFAULT_DAYS = 60;
const DEFAULT_ITEMS_PER_DAY = 5;
const LOW_STOCK_TARGETS = [0, 2, 4, 6];

const DEFAULT_DESTINOS = [
  { tipo: "CAIXA", nome: "Caixa", percentual: 15, ordem: 1 },
  { tipo: "RESERVA", nome: "Reserva", percentual: 10, ordem: 2 },
  { tipo: "SOCIAL_MEDIA", nome: "Social media", percentual: 10, ordem: 3 },
  { tipo: "TRAFEGO_PAGO", nome: "Trafego pago", percentual: 5, ordem: 4 },
  { tipo: "REINVESTIMENTO", nome: "Reinvestimento", percentual: 10, ordem: 5 },
  { tipo: "PRO_LABORE_SOCIO_1", nome: "Pro-labore socio 1", percentual: 25, ordem: 6 },
  { tipo: "PRO_LABORE_SOCIO_2", nome: "Pro-labore socio 2", percentual: 25, ordem: 7 },
];

const NOMES_CLIENTES = [
  "Ana Souza",
  "Marina Oliveira",
  "Juliana Costa",
  "Beatriz Lima",
  "Camila Martins",
  "Larissa Fernandes",
  "Fernanda Rocha",
  "Bruna Almeida",
  "Carolina Mendes",
  "Patricia Gomes",
  "Renata Barbosa",
  "Amanda Ribeiro",
  "Isabela Duarte",
  "Luiza Monteiro",
  "Gabriela Araujo",
  "Leticia Nogueira",
  "Bianca Moreira",
  "Clara Teixeira",
  "Helena Cardoso",
  "Manuela Castro",
];

const ENDERECOS = [
  { cidade: "Itapira", estado: "SP", cep: "13970000", bairro: "Centro", rua: "Rua XV de Novembro" },
  { cidade: "Mogi Mirim", estado: "SP", cep: "13800000", bairro: "Mirante", rua: "Avenida Brasil" },
  { cidade: "Campinas", estado: "SP", cep: "13010000", bairro: "Cambuí", rua: "Rua Conceicao" },
  { cidade: "Sao Paulo", estado: "SP", cep: "01310000", bairro: "Bela Vista", rua: "Avenida Paulista" },
  { cidade: "Jaguariuna", estado: "SP", cep: "13910000", bairro: "Nova Jaguariuna", rua: "Rua Alfredo Bueno" },
  { cidade: "Holambra", estado: "SP", cep: "13825000", bairro: "Centro", rua: "Rua Rota dos Imigrantes" },
  { cidade: "Amparo", estado: "SP", cep: "13900000", bairro: "Ribeirao", rua: "Rua Treze de Maio" },
  { cidade: "Pedreira", estado: "SP", cep: "13920000", bairro: "Santa Clara", rua: "Rua Antonio Pedro" },
];

const FORNECEDORES = [
  "Fornecedor Joias SP",
  "Atelie Stella Simulado",
  "Embalagens Premium",
  "Grafica Tags Stella",
  "Insumos e Lacos",
];

function parseArgs(argv) {
  const args = {
    dias: DEFAULT_DAYS,
    itensDia: DEFAULT_ITEMS_PER_DAY,
    reset: false,
    dryRun: false,
    confirm: "",
  };

  for (const arg of argv) {
    if (arg === "--reset") args.reset = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--dias=")) args.dias = toInteger(arg.slice("--dias=".length), DEFAULT_DAYS);
    else if (arg.startsWith("--itens-dia=")) args.itensDia = toInteger(arg.slice("--itens-dia=".length), DEFAULT_ITEMS_PER_DAY);
    else if (arg.startsWith("--confirm=")) args.confirm = String(arg.slice("--confirm=".length)).trim();
  }

  args.dias = Math.max(1, Math.min(180, args.dias));
  args.itensDia = Math.max(1, Math.min(50, args.itensDia));

  return args;
}

function toInteger(value, fallback) {
  const numero = Number.parseInt(String(value), 10);
  return Number.isFinite(numero) ? numero : fallback;
}

function number(value, fallback = 0) {
  const result = Number(value ?? fallback);
  return Number.isFinite(result) ? result : fallback;
}

function round(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(round(value));
}

function normalizeStockSize(value) {
  const tamanho = String(value ?? "").trim().toUpperCase();
  if (!tamanho || tamanho === "NULL" || tamanho === "UNDEFINED") return "UNICO";
  return tamanho;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function dateAt(date, hour, minute = 0) {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function monthPeriod(mes, ano) {
  const inicio = new Date(ano, mes - 1, 1);
  const fimExclusivo = new Date(ano, mes, 1);
  const fim = new Date(fimExclusivo.getTime() - 1);
  return { inicio, fim, fimExclusivo };
}

function previousMonth(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const previous = new Date(year, month - 1, 1);
  return { mes: previous.getMonth() + 1, ano: previous.getFullYear() };
}

function currentMonth(date) {
  return { mes: date.getMonth() + 1, ano: date.getFullYear() };
}

function weighted(items) {
  const total = items.reduce((acc, item) => acc + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value;
  }

  return items[items.length - 1]?.value;
}

function pick(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function calculateAverageCost(value, quantity) {
  if (quantity <= 0) return 0;
  return round(value / quantity);
}

function markerText(extra = "") {
  return `${MARKER}${extra ? ` ${extra}` : ""}`;
}

function hasMarker(value) {
  return String(value ?? "").includes(MARKER);
}

function isSaleMovement(movement) {
  return String(movement.tipoMovimentacao || "").startsWith("SAIDA");
}

function isEntryMovement(movement) {
  return String(movement.tipoMovimentacao || "").startsWith("ENTRADA");
}

function productPrice(product) {
  const promotional = product.descontoAtivo && product.precoPromocional && product.precoPromocional > 0;
  return round(promotional ? product.precoPromocional : product.precoVenda);
}

function productCost(product) {
  const custo = number(product.custoBase);
  if (custo > 0) return round(custo);
  return round(number(product.precoVenda) * 0.35);
}

function getProductOptions(product) {
  const variation = product.variacoes.find(
    (item) => item.ativo && item.obrigatoria !== false && item.opcoes.some((option) => option.ativo),
  );

  if (variation) {
    const sizes = variation.opcoes
      .filter((option) => option.ativo)
      .map((option) => normalizeStockSize(option.nome));

    return [...new Set(sizes)].length ? [...new Set(sizes)] : ["UNICO"];
  }

  const stockSizes = product.estoque.map((stock) => normalizeStockSize(stock.tamanhoAnel));
  const uniqueStockSizes = [...new Set(stockSizes.filter(Boolean))];

  if (uniqueStockSizes.length > 0) return uniqueStockSizes;

  return ["UNICO"];
}

function stockKey(productId, tamanhoAnel) {
  return `${productId}:${normalizeStockSize(tamanhoAnel)}`;
}

async function nextSequentialNumber(model, field, prefix) {
  const ultimo = await prisma[model].findFirst({
    where: {
      [field]: {
        startsWith: prefix,
      },
    },
    orderBy: {
      [field]: "desc",
    },
    select: {
      [field]: true,
    },
  });

  const raw = String(ultimo?.[field] ?? "").replace(prefix, "").replace(/\D/g, "");
  const current = Number(raw);

  return Number.isFinite(current) ? current + 1 : 1;
}

async function loadCounters() {
  const [cliente, compra, venda, pedido, gasto, caixa] = await Promise.all([
    nextSequentialNumber("cliente", "codigo", "CL"),
    nextSequentialNumber("compra", "codigo", "PC"),
    nextSequentialNumber("venda", "codigo", "PV"),
    nextSequentialNumber("pedidoOnline", "codigo", "PO"),
    nextSequentialNumber("lancamentoFinanceiro", "codigo", "GAS-"),
    nextSequentialNumber("movimentacaoCaixa", "codigo", "CXA-"),
  ]);

  const counters = { cliente, compra, venda, pedido, gasto, caixa };

  return {
    cliente: () => `CL${String(counters.cliente++).padStart(6, "0")}`,
    compra: () => `PC${String(counters.compra++).padStart(6, "0")}`,
    venda: () => `PV${String(counters.venda++).padStart(6, "0")}`,
    pedido: () => `PO${String(counters.pedido++).padStart(6, "0")}`,
    gasto: () => `GAS-${String(counters.gasto++).padStart(5, "0")}`,
    caixa: () => `CXA-${String(counters.caixa++).padStart(5, "0")}`,
    apuracao: (mes, ano) => `APR-SIM-${ano}${String(mes).padStart(2, "0")}-${Date.now()}`,
  };
}

async function diagnose() {
  const [produtos, produtosAtivos, produtosComPreco, adicionais, contas, regras, simulatedCounts] =
    await Promise.all([
      prisma.produto.findMany({
        where: {
          ativo: true,
          status: { not: "NA_LIXEIRA" },
          precoVenda: { gt: 0 },
          tipoProduto: { not: "KIT" },
        },
        include: {
          estoque: true,
          variacoes: {
            where: { ativo: true },
            include: {
              opcoes: {
                where: { ativo: true },
                orderBy: { ordem: "asc" },
              },
            },
            orderBy: { ordem: "asc" },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.produto.count({
        where: {
          ativo: true,
          status: { not: "NA_LIXEIRA" },
        },
      }),
      prisma.produto.count({
        where: {
          ativo: true,
          status: { not: "NA_LIXEIRA" },
          precoVenda: { gt: 0 },
        },
      }),
      prisma.itemAdicional.findMany({
        where: {
          ativo: true,
          status: { not: "NA_LIXEIRA" },
        },
        include: {
          estoque: true,
        },
        orderBy: { nome: "asc" },
      }),
      prisma.contaFinanceira.count({ where: { ativo: true } }),
      prisma.regraDistribuicaoResultado.count({ where: { ativa: true } }),
      countSimulatedData(),
    ]);

  const withMeasures = produtos.filter((produto) => getProductOptions(produto).some((size) => size !== "UNICO"));

  return {
    produtos,
    produtosAtivos,
    produtosComPreco,
    produtosVendaveis: produtos.length,
    produtosComMedida: withMeasures.length,
    produtosSemMedida: produtos.length - withMeasures.length,
    adicionais,
    contas,
    regras,
    simulatedCounts,
  };
}

async function countSimulatedData() {
  const whereObs = { observacoes: { contains: MARKER } };
  const whereMov = {
    OR: [
      { origemTipo: { startsWith: ORIGIN_PREFIX } },
      { codigoMovimentacao: { startsWith: MOVEMENT_CODE_PREFIX } },
    ],
  };

  const [
    clientes,
    vendas,
    pedidos,
    compras,
    movimentosEstoque,
    gastos,
    caixas,
    apuracoes,
    contas,
  ] = await Promise.all([
    prisma.cliente.count({ where: whereObs }),
    prisma.venda.count({ where: whereObs }),
    prisma.pedidoOnline.count({ where: whereObs }),
    prisma.compra.count({ where: whereObs }),
    prisma.movimentacao.count({ where: whereMov }),
    prisma.lancamentoFinanceiro.count({ where: whereObs }),
    prisma.movimentacaoCaixa.count({ where: whereObs }),
    prisma.apuracaoResultadoMensal.count({ where: whereObs }),
    prisma.contaFinanceira.count({ where: whereObs }),
  ]);

  return {
    clientes,
    vendas,
    pedidos,
    compras,
    movimentosEstoque,
    gastos,
    caixas,
    apuracoes,
    contas,
  };
}

function totalCounts(counts) {
  return Object.values(counts).reduce((total, value) => total + number(value), 0);
}

function printSafetyWarning(args) {
  console.log("");
  console.log("==============================================================");
  console.log("Este script altera dados operacionais. Use apenas em ambiente autorizado.");
  console.log(`Identificador da simulacao: ${MARKER}`);
  console.log("Produtos, categorias, paginas e configuracoes da loja nao sao removidos.");
  console.log("==============================================================");
  console.log("");

  const databaseUrl = String(process.env.DATABASE_URL || "");
  if (databaseUrl.includes("neon.tech")) {
    console.log("Aviso: DATABASE_URL aponta para Neon/remoto.");
  }

  if (!args.dryRun && args.confirm !== CONFIRMATION) {
    throw new Error(`Operacao bloqueada. Execute com --confirm=${CONFIRMATION}.`);
  }
}

function printDryRun(diag, args) {
  const targetUnits = args.dias * args.itensDia;
  const safetyStock = Math.ceil(targetUnits * 1.75);

  console.log("DRY-RUN: nenhuma alteracao sera executada.");
  console.log("");
  console.log("Diagnostico:");
  console.log(`- Produtos ativos: ${diag.produtosAtivos}`);
  console.log(`- Produtos ativos com preco: ${diag.produtosComPreco}`);
  console.log(`- Produtos vendaveis usados pelo script: ${diag.produtosVendaveis}`);
  console.log(`- Produtos com medida/opcao: ${diag.produtosComMedida}`);
  console.log(`- Produtos sem medida/opcao: ${diag.produtosSemMedida}`);
  console.log(`- Itens adicionais ativos: ${diag.adicionais.length}`);
  console.log(`- Contas financeiras ativas: ${diag.contas}`);
  console.log(`- Regras de distribuicao ativas: ${diag.regras}`);
  console.log("");
  console.log("Simulacao planejada:");
  console.log(`- Periodo: ${args.dias} dias`);
  console.log(`- Media de joias vendidas por dia: ${args.itensDia}`);
  console.log(`- Unidades vendidas planejadas: ${targetUnits}`);
  console.log(`- Estoque de seguranca planejado: ${safetyStock} a ${Math.ceil(targetUnits * 2)} unidades`);
  console.log("- Clientes simulados: 40 a 80");
  console.log("- Compras: compra inicial grande, compras semanais, embalagens/insumos");
  console.log("- Vendas/pedidos: manuais, online, link de pagamento e etapas operacionais");
  console.log("- Financeiro: gastos, caixa, compras pagas/pendentes, apuracao e pro-labore");
  console.log("");
  console.log("Dados simulados existentes:");
  for (const [key, value] of Object.entries(diag.simulatedCounts)) {
    console.log(`- ${key}: ${value}`);
  }

  if (diag.produtosVendaveis === 0) {
    throw new Error("Nao ha produtos vendaveis ativos com preco de venda.");
  }
}

async function ensureFinancialBase(counters, summary) {
  const contas = {};
  const contasDesejadas = [
    { key: "principal", nome: "Caixa principal", tipo: "CAIXA_PRINCIPAL", saldo: 8000 },
    { key: "reserva", nome: "Reserva", tipo: "RESERVA", saldo: 2000 },
    { key: "marketing", nome: "Marketing", tipo: "MARKETING", saldo: 1000 },
    { key: "reinvestimento", nome: "Reinvestimento", tipo: "REINVESTIMENTO", saldo: 2500 },
  ];

  for (const contaConfig of contasDesejadas) {
    let conta = await prisma.contaFinanceira.findFirst({
      where: {
        nome: contaConfig.nome,
        ativo: true,
      },
      orderBy: { criadoEm: "asc" },
    });

    if (!conta) {
      conta = await prisma.contaFinanceira.create({
        data: {
          nome: contaConfig.nome,
          tipo: contaConfig.tipo,
          saldoInicial: contaConfig.saldo,
          dataSaldoInicial: new Date(),
          observacoes: markerText("Conta gerencial criada para a simulacao operacional."),
        },
      });
      summary.contasCriadas += 1;
    } else if (!hasMarker(conta.observacoes)) {
      await prisma.movimentacaoCaixa.create({
        data: {
          codigo: counters.caixa(),
          contaId: conta.id,
          tipo: "AJUSTE",
          categoria: "SALDO_INICIAL_SIMULADO",
          descricao: `Saldo gerencial simulado - ${conta.nome}`,
          valor: contaConfig.saldo,
          status: "PAGA",
          dataPrevista: addDays(new Date(), -60),
          dataEfetiva: addDays(new Date(), -60),
          origemTipo: `${ORIGIN_PREFIX}:SALDO_INICIAL`,
          origemId: `${conta.id}-${randomUUID()}`,
          aprovadoEm: addDays(new Date(), -60),
          pagoEm: addDays(new Date(), -60),
          observacoes: markerText("Ajuste de saldo para cenario de 2 meses."),
        },
      });
      summary.movimentacoesCaixa += 1;
    }

    contas[contaConfig.key] = conta;
  }

  const regra = await getOrCreateDistributionRule(summary);
  return { contas, regra };
}

async function getOrCreateDistributionRule(summary) {
  const existing = await prisma.regraDistribuicaoResultado.findFirst({
    where: { ativa: true },
    include: {
      destinos: {
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
    },
    orderBy: { criadoEm: "asc" },
  });

  if (existing && existing.destinos.length > 0) return existing;

  const created = await prisma.regraDistribuicaoResultado.create({
    data: {
      nome: "Regra padrao 50/50",
      ativa: true,
      percentualEmpresa: 50,
      percentualProLabore: 50,
      observacoes: markerText("Regra criada automaticamente para a simulacao."),
      destinos: {
        create: DEFAULT_DESTINOS,
      },
    },
    include: {
      destinos: {
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
    },
  });

  summary.regrasCriadas += 1;
  return created;
}

async function createClients(counters, summary) {
  const total = 40 + Math.floor(Math.random() * 41);
  const runId = Date.now().toString(36);
  const clientes = [];

  for (let index = 0; index < total; index += 1) {
    const nomeBase = NOMES_CLIENTES[index % NOMES_CLIENTES.length];
    const nome = index < NOMES_CLIENTES.length ? nomeBase : `${nomeBase} ${index + 1}`;
    const endereco = ENDERECOS[index % ENDERECOS.length];
    const numero = String(100 + index * 7);
    const telefone = `119${String(70000000 + index + Math.floor(Math.random() * 5000)).padStart(8, "0")}`;
    const documento = `9${String(1000000000 + index + Math.floor(Math.random() * 50000)).padStart(10, "0")}`.slice(0, 11);
    const emailName = normalizeText(nome).replace(/\s+/g, ".");

    clientes.push(
      await prisma.cliente.create({
        data: {
          codigo: counters.cliente(),
          nome,
          telefone,
          email: `${emailName}.${runId}.${index}@simulacao.stellacolari.test`,
          documento,
          cep: endereco.cep,
          rua: endereco.rua,
          numero,
          complemento: index % 4 === 0 ? "Apto 12" : null,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
          tipoCliente: index % 3 === 0 ? "ONLINE" : "VAREJO",
          status: index % 5 === 0 ? "RECORRENTE" : "NOVO",
          origemCadastro: "SIMULACAO_OPERACIONAL",
          observacoes: markerText("Cliente criado para a simulacao de 2 meses."),
        },
      }),
    );
  }

  summary.clientesCriados = clientes.length;
  return clientes;
}

function buildStockPlan(products, days, itemsPerDay) {
  const targetUnits = days * itemsPerDay;
  const totalStock = Math.max(Math.ceil(targetUnits * 1.75), targetUnits + 180);
  const options = products.flatMap((product) =>
    getProductOptions(product).map((size) => ({
      product,
      tamanhoAnel: size,
    })),
  );

  if (options.length === 0) {
    throw new Error("Nao ha produtos/opcoes para montar o estoque da simulacao.");
  }

  const base = Math.floor(totalStock / options.length);
  const remainder = totalStock % options.length;

  return options.map((option, index) => ({
    ...option,
    quantity: base + (index < remainder ? 1 : 0) + Math.floor(Math.random() * 5),
  }));
}

async function registerProductStockEntry(tx, product, tamanhoAnel, quantity, value) {
  const normalizedSize = normalizeStockSize(tamanhoAnel);
  const existing = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId: product.id,
        tamanhoAnel: normalizedSize,
      },
    },
  });

  if (existing) {
    const newQuantity = existing.quantidadeAtual + quantity;
    const newValue = round(number(existing.valorAcumulado) + value);

    await tx.estoqueProduto.update({
      where: { id: existing.id },
      data: {
        quantidadeAtual: newQuantity,
        valorAcumulado: newValue,
        custoMedio: calculateAverageCost(newValue, newQuantity),
      },
    });
    return;
  }

  await tx.estoqueProduto.create({
    data: {
      produtoId: product.id,
      tamanhoAnel: normalizedSize,
      quantidadeAtual: quantity,
      valorAcumulado: value,
      custoMedio: calculateAverageCost(value, quantity),
    },
  });
}

async function registerAdditionalStockEntry(tx, item, quantity, value) {
  const existing = await tx.estoqueAdicional.findUnique({
    where: {
      itemAdicionalId: item.id,
    },
  });

  if (existing) {
    const newQuantity = existing.quantidadeAtual + quantity;
    const newValue = round(number(existing.valorAcumulado) + value);

    await tx.estoqueAdicional.update({
      where: { id: existing.id },
      data: {
        quantidadeAtual: newQuantity,
        valorAcumulado: newValue,
        custoMedio: calculateAverageCost(newValue, newQuantity),
      },
    });
    return;
  }

  await tx.estoqueAdicional.create({
    data: {
      itemAdicionalId: item.id,
      quantidadeAtual: quantity,
      valorAcumulado: value,
      custoMedio: calculateAverageCost(value, quantity),
    },
  });
}

async function createStockPurchase({
  counters,
  contas,
  date,
  fornecedor,
  productItems,
  additionalItems = [],
  paid = true,
  summary,
  virtualStock,
}) {
  const frete = round(35 + Math.random() * 120);
  const subtotalProducts = productItems.reduce((total, item) => total + item.unitCost * item.quantity, 0);
  const subtotalAdditional = additionalItems.reduce((total, item) => total + item.unitCost * item.quantity, 0);
  const descontoPercentual = subtotalProducts > 3000 ? 12 : subtotalProducts > 1800 ? 8 : 4;
  const valorDesconto = subtotalProducts * (descontoPercentual / 100);
  const totalFinal = round(subtotalProducts - valorDesconto + subtotalAdditional + frete);

  const compra = await prisma.$transaction(
    async (tx) => {
      const created = await tx.compra.create({
        data: {
          codigo: counters.compra(),
          fornecedor,
          descontoPercentual,
          frete,
          valorTotalBruto: round(subtotalProducts + subtotalAdditional),
          valorTotalFinal: totalFinal,
          observacoes: markerText(`Compra simulada ${paid ? "paga" : "pendente"}.`),
          status: "ATIVA",
          criadoEm: date,
        },
      });

      for (const item of productItems) {
        const unitFinal = round(item.unitCost * (1 - descontoPercentual / 100));
        const totalBase = round(item.unitCost * item.quantity);
        const totalItem = round(unitFinal * item.quantity);
        const tamanho = normalizeStockSize(item.tamanhoAnel);

        const compraItem = await tx.compraItem.create({
          data: {
            compraId: created.id,
            tipoItem: "produto",
            codigoDigitado: item.product.codigoInterno,
            descricao: item.product.nome,
            quantidade: item.quantity,
            tamanhoAnel: tamanho === "UNICO" ? null : tamanho,
            valorUnitarioBase: item.unitCost,
            valorUnitarioFinal: unitFinal,
            valorTotalBase: totalBase,
            valorTotalFinal: totalItem,
            parcelaFrete: 0,
            valorTotalComFrete: totalItem,
            produtoId: item.product.id,
          },
        });

        await registerProductStockEntry(tx, item.product, tamanho, item.quantity, totalItem);

        await tx.movimentacao.create({
          data: {
            codigoMovimentacao: `${MOVEMENT_CODE_PREFIX}${randomUUID()}`,
            tipoMovimentacao: "ENTRADA",
            origemTipo: `${ORIGIN_PREFIX}:COMPRA_ESTOQUE_PRODUTO`,
            origemId: created.id,
            codigoItem: item.product.codigoInterno,
            itemTipo: "produto",
            quantidade: item.quantity,
            tamanhoAnel: tamanho === "UNICO" ? null : tamanho,
            custo: totalItem,
            faturamento: 0,
            documentoCliente: null,
            status: "ATIVA",
            relacionadoA: compraItem.id,
            gastoProdutoPrincipal: 0,
            gastoAdd1: 0,
            gastoAdd2: 0,
            gastoAdd3: 0,
            criadoEm: date,
          },
        });
      }

      for (const item of additionalItems) {
        const totalBase = round(item.unitCost * item.quantity);
        const compraItem = await tx.compraItem.create({
          data: {
            compraId: created.id,
            tipoItem: "adicional",
            codigoDigitado: item.item.codigoInterno,
            descricao: item.item.nome,
            quantidade: item.quantity,
            tamanhoAnel: null,
            valorUnitarioBase: item.unitCost,
            valorUnitarioFinal: item.unitCost,
            valorTotalBase: totalBase,
            valorTotalFinal: totalBase,
            parcelaFrete: 0,
            valorTotalComFrete: totalBase,
            itemAdicionalId: item.item.id,
          },
        });

        await registerAdditionalStockEntry(tx, item.item, item.quantity, totalBase);

        await tx.movimentacao.create({
          data: {
            codigoMovimentacao: `${MOVEMENT_CODE_PREFIX}${randomUUID()}`,
            tipoMovimentacao: "ENTRADA",
            origemTipo: `${ORIGIN_PREFIX}:COMPRA_ESTOQUE_ADICIONAL`,
            origemId: created.id,
            codigoItem: item.item.codigoInterno,
            itemTipo: "adicional",
            quantidade: item.quantity,
            tamanhoAnel: null,
            custo: totalBase,
            faturamento: 0,
            documentoCliente: null,
            status: "ATIVA",
            relacionadoA: compraItem.id,
            gastoProdutoPrincipal: 0,
            gastoAdd1: 0,
            gastoAdd2: 0,
            gastoAdd3: 0,
            criadoEm: date,
          },
        });
      }

      if (paid) {
        await tx.movimentacaoCaixa.create({
          data: {
            codigo: counters.caixa(),
            contaId: contas.principal.id,
            tipo: "SAIDA",
            categoria: "COMPRA_ESTOQUE",
            descricao: `${created.codigo} - ${fornecedor}`,
            valor: totalFinal,
            status: "PAGA",
            dataPrevista: date,
            dataEfetiva: date,
            origemTipo: `${ORIGIN_PREFIX}:COMPRA_ESTOQUE_CAIXA`,
            origemId: created.id,
            aprovadoEm: date,
            pagoEm: date,
            observacoes: markerText("Pagamento de compra de estoque simulada."),
          },
        });
      }

      return created;
    },
    { maxWait: 15000, timeout: 120000 },
  );

  for (const item of productItems) {
    const key = stockKey(item.product.id, item.tamanhoAnel);
    virtualStock.set(key, number(virtualStock.get(key)) + item.quantity);
  }

  summary.comprasEstoqueCriadas += 1;
  summary.movimentacoesEstoque += productItems.length + additionalItems.length;
  if (paid) summary.movimentacoesCaixa += 1;

  return compra;
}

async function createInitialAndWeeklyPurchases({
  counters,
  contas,
  products,
  adicionais,
  days,
  itemsPerDay,
  summary,
  virtualStock,
}) {
  const stockPlan = buildStockPlan(products, days, itemsPerDay);
  const startDate = dateAt(addDays(new Date(), -days - 5), 10, 15);
  const initialItems = stockPlan.map((item) => ({
    product: item.product,
    tamanhoAnel: item.tamanhoAnel,
    quantity: Math.max(1, Math.floor(item.quantity * 0.72)),
    unitCost: productCost(item.product),
  }));
  const additionalItems = adicionais.slice(0, 4).map((item, index) => ({
    item,
    quantity: 80 + index * 25,
    unitCost: round(number(item.custoBase, 1.8) || 1.8),
  }));

  await createStockPurchase({
    counters,
    contas,
    date: startDate,
    fornecedor: FORNECEDORES[0],
    productItems: initialItems,
    additionalItems,
    paid: true,
    summary,
    virtualStock,
  });

  const weeklyItems = stockPlan
    .map((item) => ({
      product: item.product,
      tamanhoAnel: item.tamanhoAnel,
      remaining: item.quantity - Math.max(1, Math.floor(item.quantity * 0.72)),
      unitCost: productCost(item.product),
    }))
    .filter((item) => item.remaining > 0);

  const weeks = Math.max(5, Math.ceil(days / 7));
  for (let week = 0; week < weeks; week += 1) {
    const date = dateAt(addDays(startDate, 8 + week * 7), 11 + (week % 5), 20);
    const itemsForWeek = weeklyItems
      .filter((_, index) => index % weeks === week % weeks)
      .slice(0, 8)
      .map((item) => ({
        product: item.product,
        tamanhoAnel: item.tamanhoAnel,
        quantity: Math.max(1, Math.ceil(item.remaining / 2)),
        unitCost: item.unitCost,
      }));

    if (itemsForWeek.length === 0) continue;

    await createStockPurchase({
      counters,
      contas,
      date,
      fornecedor: FORNECEDORES[(week + 1) % FORNECEDORES.length],
      productItems: itemsForWeek,
      additionalItems: week % 3 === 0 ? additionalItems.slice(0, 1) : [],
      paid: week % 4 !== 2,
      summary,
      virtualStock,
    });
  }
}

function dailyUnits(days, itemsPerDay) {
  const pattern = [5, 5, 4, 6, 5, 3, 7];
  const target = days * itemsPerDay;
  const units = Array.from({ length: days }, (_, index) => Math.max(1, Math.round((pattern[index % pattern.length] / 5) * itemsPerDay)));
  let diff = target - units.reduce((total, value) => total + value, 0);
  let cursor = units.length - 1;

  while (diff !== 0 && units.length > 0) {
    if (diff > 0) {
      units[cursor] += 1;
      diff -= 1;
    } else if (units[cursor] > 1) {
      units[cursor] -= 1;
      diff += 1;
    }
    cursor = cursor > 0 ? cursor - 1 : units.length - 1;
  }

  return units;
}

function splitUnits(units) {
  const orders = [];
  let remaining = units;
  const maxOrders = Math.min(4, Math.max(1, units));

  while (remaining > 0 && orders.length < maxOrders) {
    const slotsLeft = maxOrders - orders.length;
    const maxForThis = Math.min(3, remaining - (slotsLeft - 1));
    const quantity = slotsLeft === 1 ? remaining : 1 + Math.floor(Math.random() * maxForThis);
    orders.push(quantity);
    remaining -= quantity;
  }

  if (remaining > 0) {
    orders[orders.length - 1] += remaining;
  }

  return orders.filter((value) => value > 0);
}

function choosePaidStatus(date) {
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);

  if (daysAgo <= 14) {
    return weighted([
      { value: "PEDIDO_RECEBIDO", weight: 25 },
      { value: "EM_SEPARACAO", weight: 22 },
      { value: "SEPARADO", weight: 18 },
      { value: "AGUARDANDO_RETIRADA", weight: 12 },
      { value: "SAIU_PARA_ENTREGA", weight: 10 },
      { value: "ENTREGUE", weight: 10 },
      { value: "PROBLEMA", weight: 3 },
    ]);
  }

  return weighted([
    { value: "ENTREGUE", weight: 70 },
    { value: "PEDIDO_RECEBIDO", weight: 7 },
    { value: "EM_SEPARACAO", weight: 6 },
    { value: "SEPARADO", weight: 5 },
    { value: "AGUARDANDO_RETIRADA", weight: 4 },
    { value: "SAIU_PARA_ENTREGA", weight: 5 },
    { value: "PROBLEMA", weight: 3 },
  ]);
}

function chooseDeliveryMode() {
  return weighted([
    { value: "ENTREGA_MANUAL", weight: 35 },
    { value: "RETIRADA", weight: 25 },
    { value: "MELHOR_ENVIO", weight: 25 },
    { value: "SEM_ENTREGA", weight: 15 },
  ]);
}

function envioForStatus(status, mode, cliente, date, frete) {
  if (mode === "SEM_ENTREGA") return null;

  const statusEnvio = (() => {
    if (status === "PROBLEMA") return "PROBLEMA";
    if (status === "ENTREGUE") return "ENTREGUE";
    if (mode === "RETIRADA") {
      if (status === "AGUARDANDO_RETIRADA") return "AGUARDANDO_RETIRADA";
      return ["SEPARADO", "EM_SEPARACAO", "PEDIDO_RECEBIDO"].includes(status) ? "PENDENTE" : "AGUARDANDO_RETIRADA";
    }
    if (mode === "MELHOR_ENVIO") {
      if (status === "SAIU_PARA_ENTREGA") return "POSTADO";
      if (status === "SEPARADO") return "ETIQUETA_GERADA";
      if (status === "EM_SEPARACAO") return "PREPARADO";
      return "PENDENTE";
    }
    if (status === "SAIU_PARA_ENTREGA") return "SAIU_PARA_ENTREGA";
    return ["SEPARADO", "EM_SEPARACAO", "PEDIDO_RECEBIDO"].includes(status) ? "PENDENTE" : "SAIU_PARA_ENTREGA";
  })();

  const tipoEntrega = mode === "RETIRADA" ? "RETIRADA" : "ENTREGA";
  const gatewayLogistico = mode === "MELHOR_ENVIO" ? "MELHOR_ENVIO" : mode === "RETIRADA" ? "RETIRADA_LOCAL" : "ENTREGA_MANUAL";
  const transportadora = mode === "MELHOR_ENVIO" ? "Melhor Envio" : "Stella Colari";
  const servico = mode === "MELHOR_ENVIO" ? "Mini Envios" : mode === "RETIRADA" ? "Retirada combinada" : "Entrega manual";

  return {
    tipoEntrega,
    transportadora,
    servico,
    statusEnvio,
    cepOrigem: "13970000",
    cepDestino: cliente.cep || null,
    pesoGramas: 120,
    alturaCm: 4,
    larguraCm: 12,
    comprimentoCm: 18,
    valorFrete: frete,
    prazoDias: mode === "MELHOR_ENVIO" ? 5 : mode === "ENTREGA_MANUAL" ? 1 : 0,
    codigoRastreio: ["POSTADO", "ENTREGUE"].includes(statusEnvio) ? `ME${String(Math.floor(Math.random() * 999999999)).padStart(9, "0")}BR` : null,
    gatewayLogistico,
    gatewayEnvioId: mode,
    postadoEm: ["POSTADO", "ENTREGUE"].includes(statusEnvio) ? addHours(date, 20) : null,
    entregueEm: statusEnvio === "ENTREGUE" ? addHours(date, 48) : null,
    observacoes: JSON.stringify({
      marker: MARKER,
      modalidade: mode,
      simulado: true,
    }),
    criadoEm: date,
  };
}

function chooseSaleItems(products, virtualStock, units) {
  const lines = [];

  for (let unit = 0; unit < units; unit += 1) {
    const candidates = products.flatMap((product) =>
      getProductOptions(product)
        .map((size) => ({
          product,
          tamanhoAnel: size,
          available: number(virtualStock.get(stockKey(product.id, size))),
        }))
        .filter((item) => item.available > 0),
    );

    if (candidates.length === 0) {
      throw new Error("Estoque virtual insuficiente para concluir a simulacao.");
    }

    const selected = pick(candidates);
    const key = stockKey(selected.product.id, selected.tamanhoAnel);
    virtualStock.set(key, number(virtualStock.get(key)) - 1);

    const existing = lines.find((item) => item.product.id === selected.product.id && item.tamanhoAnel === selected.tamanhoAnel);
    if (existing) {
      existing.quantity += 1;
    } else {
      lines.push({
        product: selected.product,
        tamanhoAnel: selected.tamanhoAnel,
        quantity: 1,
      });
    }
  }

  return lines;
}

async function decrementProductStock(tx, line) {
  const tamanho = normalizeStockSize(line.tamanhoAnel);
  const stock = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId: line.product.id,
        tamanhoAnel: tamanho,
      },
    },
  });

  if (!stock || stock.quantidadeAtual < line.quantity) {
    throw new Error(`Estoque insuficiente para ${line.product.nome} (${tamanho}).`);
  }

  const costUnit = number(stock.custoMedio) || productCost(line.product);
  const totalCost = round(costUnit * line.quantity);
  const newQuantity = stock.quantidadeAtual - line.quantity;
  const newValue = Math.max(0, round(number(stock.valorAcumulado) - totalCost));

  await tx.estoqueProduto.update({
    where: { id: stock.id },
    data: {
      quantidadeAtual: newQuantity,
      valorAcumulado: newValue,
      custoMedio: calculateAverageCost(newValue, newQuantity),
    },
  });

  return totalCost;
}

async function createCashMovement(tx, counters, params) {
  await tx.movimentacaoCaixa.create({
    data: {
      codigo: counters.caixa(),
      contaId: params.contaId,
      tipo: params.tipo,
      categoria: params.categoria,
      descricao: params.descricao,
      valor: round(Math.abs(params.valor)),
      status: params.status || "PAGA",
      dataPrevista: params.dataPrevista || params.date,
      dataEfetiva: params.dataEfetiva || params.date,
      origemTipo: params.origemTipo,
      origemId: params.origemId,
      aprovadoEm: ["APROVADA", "PAGA"].includes(params.status || "PAGA") ? params.date : null,
      pagoEm: (params.status || "PAGA") === "PAGA" ? params.date : null,
      observacoes: markerText(params.observacoes || ""),
      criadoEm: params.date,
    },
  });
}

async function createManualSale({ counters, contas, cliente, lines, date, meioVenda, summary }) {
  const discount = weighted([
    { value: 0, weight: 75 },
    { value: 5, weight: 15 },
    { value: 10, weight: 8 },
    { value: 12, weight: 2 },
  ]);

  const venda = await prisma.$transaction(
    async (tx) => {
      const created = await tx.venda.create({
        data: {
          codigo: counters.venda(),
          clienteId: cliente.id,
          meioVenda,
          descontoPercentual: discount,
          valorTotal: 0,
          gastoTotal: 0,
          lucroTotal: 0,
          observacoes: markerText(`Venda manual simulada via ${meioVenda}.`),
          status: "VENDA_FINALIZADA",
          criadoEm: date,
        },
      });

      let valorTotal = 0;
      let gastoTotal = 0;

      for (const line of lines) {
        const priceBase = productPrice(line.product);
        const priceFinal = round(priceBase * (1 - discount / 100));
        const totalLine = round(priceFinal * line.quantity);
        const costLine = await decrementProductStock(tx, line);
        const profit = round(totalLine - costLine);
        const tamanho = normalizeStockSize(line.tamanhoAnel);

        const vendaItem = await tx.vendaItem.create({
          data: {
            vendaId: created.id,
            produtoId: line.product.id,
            codigoDigitado: line.product.codigoInterno,
            descricao: line.product.nome,
            quantidade: line.quantity,
            tamanhoAnel: tamanho === "UNICO" ? null : tamanho,
            valorUnitarioBase: priceBase,
            valorUnitarioFinal: priceFinal,
            valorTotal: totalLine,
            gastoProduto: costLine,
            gastoAdicionais: 0,
            lucroTotal: profit,
            criadoEm: date,
          },
        });

        await tx.movimentacao.create({
          data: {
            codigoMovimentacao: `${MOVEMENT_CODE_PREFIX}${randomUUID()}`,
            tipoMovimentacao: "SAIDA",
            origemTipo: `${ORIGIN_PREFIX}:VENDA_MANUAL`,
            origemId: created.id,
            codigoItem: line.product.codigoInterno,
            itemTipo: "produto",
            quantidade: line.quantity,
            tamanhoAnel: tamanho === "UNICO" ? null : tamanho,
            custo: costLine,
            faturamento: totalLine,
            documentoCliente: cliente.documento,
            status: "ATIVA",
            relacionadoA: vendaItem.id,
            gastoProdutoPrincipal: costLine,
            gastoAdd1: 0,
            gastoAdd2: 0,
            gastoAdd3: 0,
            criadoEm: date,
          },
        });

        valorTotal += totalLine;
        gastoTotal += costLine;
      }

      await tx.venda.update({
        where: { id: created.id },
        data: {
          valorTotal: round(valorTotal),
          gastoTotal: round(gastoTotal),
          lucroTotal: round(valorTotal - gastoTotal),
        },
      });

      await createCashMovement(tx, counters, {
        contaId: contas.principal.id,
        tipo: "ENTRADA",
        categoria: "VENDA_MANUAL",
        descricao: `${created.codigo} - ${cliente.nome}`,
        valor: valorTotal,
        date,
        origemTipo: `${ORIGIN_PREFIX}:RECEITA_VENDA_MANUAL`,
        origemId: created.id,
        observacoes: "Recebimento de venda manual simulada.",
      });

      return created;
    },
    { maxWait: 15000, timeout: 120000 },
  );

  summary.vendasCriadas += 1;
  summary.unidadesVendidas += lines.reduce((total, line) => total + line.quantity, 0);
  summary.totalFaturado += lines.reduce((total, line) => total + productPrice(line.product) * line.quantity, 0);
  summary.movimentacoesEstoque += lines.length;
  summary.movimentacoesCaixa += 1;

  return venda;
}

function orderTotals(lines, discount = 0, frete = 0) {
  const subtotalBase = lines.reduce((total, line) => total + productPrice(line.product) * line.quantity, 0);
  const subtotal = round(subtotalBase * (1 - discount / 100));
  return {
    subtotal,
    frete,
    total: round(subtotal + frete),
  };
}

async function createPedidoOnline({ counters, contas, cliente, lines, date, status, mode, origemCanal, baixarEstoque, createVendaForLink, summary }) {
  const discount = weighted([
    { value: 0, weight: 76 },
    { value: 5, weight: 16 },
    { value: 10, weight: 8 },
  ]);
  const statusPagamento = status === "AGUARDANDO_PAGAMENTO" ? "AGUARDANDO_PAGAMENTO" : status === "CANCELADO" ? "CANCELADO" : "PAGO";
  const paid = statusPagamento === "PAGO";
  const frete = mode === "SEM_ENTREGA" || mode === "RETIRADA" ? 0 : round(12 + Math.random() * 26);
  const totals = orderTotals(lines, discount, frete);
  const envio = envioForStatus(status, mode, cliente, date, frete);

  const pedido = await prisma.$transaction(
    async (tx) => {
      const created = await tx.pedidoOnline.create({
        data: {
          codigo: counters.pedido(),
          clienteId: cliente.id,
          clienteCriadoCheckout: false,
          nomeCliente: cliente.nome,
          telefoneCliente: cliente.telefone,
          emailCliente: cliente.email,
          documento: cliente.documento,
          cep: cliente.cep,
          rua: cliente.rua,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro: cliente.bairro,
          cidade: cliente.cidade,
          estado: cliente.estado,
          subtotal: totals.subtotal,
          frete: totals.frete,
          total: totals.total,
          status,
          observacoes: markerText(origemCanal === "ADMIN_MANUAL" ? "Pedido com link de pagamento simulado." : "Pedido online simulado."),
          gatewayPagamento: origemCanal === "ADMIN_MANUAL" || paid ? "STRIPE" : null,
          gatewayPagamentoId: paid ? `sim_pi_${randomUUID()}` : null,
          gatewayPedidoId: origemCanal === "ADMIN_MANUAL" || paid ? `sim_cs_${randomUUID()}` : null,
          metodoPagamento: origemCanal === "ADMIN_MANUAL" || paid ? "STRIPE_CHECKOUT" : null,
          pagamentoObservacao: paid ? "Pagamento simulado confirmado." : "Pagamento simulado pendente.",
          pagoEm: paid ? addHours(date, 1) : null,
          statusPagamento,
          valorPago: paid ? totals.total : 0,
          origemCanal,
          dadosOriginaisJson: {
            marker: MARKER,
            mode,
            simulado: true,
            descontoPercentual: discount,
          },
          criadoEm: date,
          ...(envio
            ? {
                envio: {
                  create: envio,
                },
              }
            : {}),
        },
      });

      await tx.pedidoStatusHistorico.create({
        data: {
          pedidoOnlineId: created.id,
          statusAnterior: null,
          statusNovo: origemCanal === "ADMIN_MANUAL" ? "AGUARDANDO_PAGAMENTO" : "PEDIDO_RECEBIDO",
          tipoEvento: "CRIACAO",
          origem: `${ORIGIN_PREFIX}:SCRIPT`,
          usuarioNome: "Simulacao",
          observacao: markerText("Pedido criado pela simulacao."),
          criadoEm: date,
        },
      });

      if (status !== "PEDIDO_RECEBIDO" && status !== "AGUARDANDO_PAGAMENTO") {
        await tx.pedidoStatusHistorico.create({
          data: {
            pedidoOnlineId: created.id,
            statusAnterior: "PEDIDO_RECEBIDO",
            statusNovo: status,
            tipoEvento: paid ? "OPERACIONAL" : "MANUAL",
            origem: `${ORIGIN_PREFIX}:SCRIPT`,
            usuarioNome: "Simulacao",
            observacao: markerText(`Status operacional simulado: ${status}.`),
            criadoEm: addHours(date, 2),
          },
        });
      }

      for (const line of lines) {
        const priceBase = productPrice(line.product);
        const priceFinal = round(priceBase * (1 - discount / 100));
        const totalLine = round(priceFinal * line.quantity);
        const tamanho = normalizeStockSize(line.tamanhoAnel);

        const pedidoItem = await tx.pedidoOnlineItem.create({
          data: {
            pedidoOnlineId: created.id,
            produtoId: line.product.id,
            codigoInterno: line.product.codigoInterno,
            nomeProduto: line.product.nome,
            imagemUrl: line.product.imagemUrl,
            categoria: line.product.categoria,
            tamanhoAnel: tamanho === "UNICO" ? null : tamanho,
            quantidade: line.quantity,
            precoUnitario: priceFinal,
            precoOriginal: priceBase,
            descontoPercentual: discount || null,
            geraCashback: paid,
            cashbackBaseValor: paid ? totalLine : 0,
            total: totalLine,
            criadoEm: date,
          },
        });

        if (baixarEstoque && paid) {
          const costLine = await decrementProductStock(tx, line);

          await tx.movimentacao.create({
            data: {
              codigoMovimentacao: `${MOVEMENT_CODE_PREFIX}${randomUUID()}`,
              tipoMovimentacao: "SAIDA",
              origemTipo: `${ORIGIN_PREFIX}:PEDIDO_ONLINE`,
              origemId: created.id,
              codigoItem: line.product.codigoInterno,
              itemTipo: "produto",
              quantidade: line.quantity,
              tamanhoAnel: tamanho === "UNICO" ? null : tamanho,
              custo: costLine,
              faturamento: totalLine,
              documentoCliente: cliente.documento,
              status: "ATIVA",
              relacionadoA: pedidoItem.id,
              gastoProdutoPrincipal: costLine,
              gastoAdd1: 0,
              gastoAdd2: 0,
              gastoAdd3: 0,
              criadoEm: date,
            },
          });
        }
      }

      if (baixarEstoque && paid) {
        await createCashMovement(tx, counters, {
          contaId: contas.principal.id,
          tipo: "ENTRADA",
          categoria: "VENDA_ONLINE",
          descricao: `${created.codigo} - ${cliente.nome}`,
          valor: totals.total,
          date: addHours(date, 1),
          origemTipo: `${ORIGIN_PREFIX}:RECEITA_PEDIDO_ONLINE`,
          origemId: created.id,
          observacoes: "Recebimento de pedido online simulado.",
        });
      }

      return created;
    },
    { maxWait: 15000, timeout: 120000 },
  );

  summary.pedidosCriados += 1;
  summary.pedidosPorStatus[status] = (summary.pedidosPorStatus[status] || 0) + 1;
  if (baixarEstoque && paid) {
    summary.unidadesVendidas += lines.reduce((total, line) => total + line.quantity, 0);
    summary.totalFaturado += totals.total;
    summary.movimentacoesEstoque += lines.length;
    summary.movimentacoesCaixa += 1;
  }

  if (createVendaForLink && paid) {
    await createManualSale({
      counters,
      contas,
      cliente,
      lines,
      date: addHours(date, 1),
      meioVenda: "Link de pagamento",
      summary,
    });
  }

  return pedido;
}

async function createSalesAndOrders({ counters, contas, products, clientes, days, itemsPerDay, virtualStock, summary }) {
  const startDate = addDays(new Date(), -days + 1);
  const unitsByDay = dailyUnits(days, itemsPerDay);

  for (let day = 0; day < days; day += 1) {
    const currentDate = addDays(startDate, day);
    const splits = splitUnits(unitsByDay[day]);

    for (let index = 0; index < splits.length; index += 1) {
      const units = splits[index];
      const date = dateAt(currentDate, 9 + ((day + index) % 10), (index * 17 + day * 3) % 60);
      const cliente = pick(clientes);
      const lines = chooseSaleItems(products, virtualStock, units);
      const channel = weighted([
        { value: "VENDA_MANUAL", weight: 38 },
        { value: "PEDIDO_ONLINE", weight: 46 },
        { value: "LINK_PAGAMENTO", weight: 16 },
      ]);

      if (channel === "VENDA_MANUAL") {
        await createManualSale({
          counters,
          contas,
          cliente,
          lines,
          date,
          meioVenda: weighted([
            { value: "WhatsApp", weight: 45 },
            { value: "Instagram", weight: 35 },
            { value: "Presencial", weight: 20 },
          ]),
          summary,
        });
        continue;
      }

      if (channel === "LINK_PAGAMENTO") {
        await createPedidoOnline({
          counters,
          contas,
          cliente,
          lines,
          date,
          status: "PAGO",
          mode: chooseDeliveryMode(),
          origemCanal: "ADMIN_MANUAL",
          baixarEstoque: false,
          createVendaForLink: true,
          summary,
        });
        continue;
      }

      await createPedidoOnline({
        counters,
        contas,
        cliente,
        lines,
        date,
        status: choosePaidStatus(date),
        mode: chooseDeliveryMode(),
        origemCanal: "LOJA_STELLA",
        baixarEstoque: true,
        createVendaForLink: false,
        summary,
      });
    }
  }
}

async function createOperationalExtraOrders({ counters, contas, products, clientes, virtualStock, summary }) {
  const requiredStatuses = [
    { status: "AGUARDANDO_PAGAMENTO", paid: false, mode: "SEM_ENTREGA", origemCanal: "ADMIN_MANUAL" },
    { status: "PEDIDO_RECEBIDO", paid: true, mode: "MELHOR_ENVIO", origemCanal: "LOJA_STELLA" },
    { status: "EM_SEPARACAO", paid: true, mode: "ENTREGA_MANUAL", origemCanal: "LOJA_STELLA" },
    { status: "SEPARADO", paid: true, mode: "MELHOR_ENVIO", origemCanal: "LOJA_STELLA" },
    { status: "AGUARDANDO_RETIRADA", paid: true, mode: "RETIRADA", origemCanal: "LOJA_STELLA" },
    { status: "SAIU_PARA_ENTREGA", paid: true, mode: "ENTREGA_MANUAL", origemCanal: "LOJA_STELLA" },
    { status: "ENTREGUE", paid: true, mode: "MELHOR_ENVIO", origemCanal: "LOJA_STELLA" },
    { status: "PROBLEMA", paid: true, mode: "MELHOR_ENVIO", origemCanal: "LOJA_STELLA" },
    { status: "CANCELADO", paid: false, mode: "ENTREGA_MANUAL", origemCanal: "LOJA_STELLA" },
  ];
  const start = addDays(new Date(), -10);

  for (let index = 0; index < requiredStatuses.length; index += 1) {
    const item = requiredStatuses[index];
    const cliente = clientes[index % clientes.length];
    const units = item.paid ? 1 : 1;
    const lines = item.paid ? chooseSaleItems(products, virtualStock, units) : chooseSaleItemsWithoutConsuming(products, virtualStock, units);

    await createPedidoOnline({
      counters,
      contas,
      cliente,
      lines,
      date: dateAt(addDays(start, index), 13, index * 3),
      status: item.status,
      mode: item.mode,
      origemCanal: item.origemCanal,
      baixarEstoque: item.paid && item.origemCanal === "LOJA_STELLA",
      createVendaForLink: false,
      summary,
    });
  }
}

function chooseSaleItemsWithoutConsuming(products, virtualStock, units) {
  const lines = [];
  const candidates = products.flatMap((product) =>
    getProductOptions(product)
      .map((size) => ({
        product,
        tamanhoAnel: size,
        available: number(virtualStock.get(stockKey(product.id, size))),
      }))
      .filter((item) => item.available > 0),
  );

  for (let unit = 0; unit < units; unit += 1) {
    const selected = pick(candidates);
    if (!selected) throw new Error("Nao ha item disponivel para pedido pendente/cancelado.");
    const existing = lines.find((item) => item.product.id === selected.product.id && item.tamanhoAnel === selected.tamanhoAnel);
    if (existing) existing.quantity += 1;
    else lines.push({ product: selected.product, tamanhoAnel: selected.tamanhoAnel, quantity: 1 });
  }

  return lines;
}

async function createExpenses({ counters, contas, summary }) {
  const today = new Date();
  const expenses = [
    ["ASSINATURA", "Infraestrutura", "Vercel", 120, "PAGO", true],
    ["ASSINATURA", "Banco de dados", "Neon", 95, "PAGO", true],
    ["ASSINATURA", "Design", "Canva", 34.9, "PAGO", true],
    ["ASSINATURA", "Dominio", "Dominio loja", 49.9, "PENDENTE", true],
    ["ASSINATURA", "Comunicacao", "Sistema de WhatsApp", 89.9, "PAGO", true],
    ["COMPRA_UNICA", "Equipamento", "Impressora termica", 489, "PAGO", true],
    ["COMPRA_UNICA", "Equipamento", "Camera", 1450, "PAGO", true],
    ["INVESTIMENTO_ESTRUTURA", "Studio", "Iluminacao para fotos", 680, "PAGO", true],
    ["INVESTIMENTO_ESTRUTURA", "Organizacao", "Gaveteiro", 360, "PENDENTE", true],
    ["COMPRA_UNICA", "Operacao", "Etiquetadora", 310, "PAGO", true],
    ["MARKETING", "Social media", "Social media mensal", 900, "PAGO", true],
    ["TRAFEGO_PAGO", "Instagram Ads", "Trafego pago Instagram", 650, "PAGO", true],
    ["TRAFEGO_PAGO", "Campanha", "Campanha Dia dos Namorados", 780, "PAGO", true],
    ["MARKETING", "Conteudo", "Ensaio fotografico", 520, "VENCIDO", true],
    ["MARKETING", "Design", "Design de posts", 280, "PENDENTE", true],
    ["INFLUENCIADOR", "Influenciadores", "Influenciadora 1 pago", 350, "PAGO", true],
    ["INFLUENCIADOR", "Influenciadores", "Influenciadora 2 permuta", 180, "PAGO", false],
    ["INFLUENCIADOR", "Influenciadores", "Influenciadora 3 misto", 240, "PENDENTE", true],
    ["PERMUTA_PATROCINIO", "Relacionamento", "Envio de produtos para acao", 220, "PAGO", false],
    ["PERMUTA_PATROCINIO", "Evento", "Patrocinio pequeno", 300, "CANCELADO", false],
    ["COMPRA_EMBALAGEM_INSUMO", "Embalagens", "Caixas e papel seda", 420, "PAGO", true],
    ["COMPRA_EMBALAGEM_INSUMO", "Grafica", "Tags e cartoes", 230, "PAGO", true],
  ];

  for (let index = 0; index < expenses.length; index += 1) {
    const [tipo, categoria, titulo, valor, statusPagamento, impactaCaixa] = expenses[index];
    const vencimento = dateAt(addDays(today, -58 + index * 4), 9, 0);
    const dataPagamento = statusPagamento === "PAGO" ? addHours(vencimento, 5) : null;

    const lancamento = await prisma.lancamentoFinanceiro.create({
      data: {
        codigo: counters.gasto(),
        tipo,
        categoria,
        titulo,
        descricao: `${titulo} - lancamento simulado para analise operacional.`,
        fornecedorParceiro: titulo,
        valorPrevisto: round(valor),
        valorReal: round(valor),
        statusPagamento,
        statusOperacional: statusPagamento === "CANCELADO" ? "CANCELADO" : "ATIVO",
        dataCompetencia: vencimento,
        dataVencimento: statusPagamento === "PENDENTE" ? addDays(today, index % 3 === 0 ? 7 : 18) : vencimento,
        dataPagamento,
        recorrente: tipo === "ASSINATURA",
        recorrencia: tipo === "ASSINATURA" ? "MENSAL" : null,
        meioPagamento: impactaCaixa ? "PIX" : "PERMUTA",
        origemTipo: `${ORIGIN_PREFIX}:GASTO`,
        origemId: randomUUID(),
        observacoes: markerText("Lancamento financeiro simulado."),
        status: "ATIVO",
        impactaCaixa,
        contaFinanceiraId: impactaCaixa ? contas.principal.id : null,
        criadoEm: vencimento,
      },
    });

    summary.gastosCriados += 1;
    summary.totalGastos += statusPagamento === "CANCELADO" ? 0 : round(valor);

    if (statusPagamento === "PAGO" && impactaCaixa) {
      const movimento = await prisma.movimentacaoCaixa.create({
        data: {
          codigo: counters.caixa(),
          contaId: contas.principal.id,
          tipo: "SAIDA",
          categoria: ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"].includes(tipo) ? "MARKETING" : "GASTO_OPERACIONAL",
          descricao: `${lancamento.codigo} - ${titulo}`,
          valor: round(valor),
          status: "PAGA",
          dataPrevista: vencimento,
          dataEfetiva: dataPagamento,
          origemTipo: `${ORIGIN_PREFIX}:LANCAMENTO_FINANCEIRO`,
          origemId: lancamento.id,
          aprovadoEm: dataPagamento,
          pagoEm: dataPagamento,
          observacoes: markerText("Saida de caixa de gasto simulado."),
          criadoEm: vencimento,
        },
      });

      await prisma.lancamentoFinanceiro.update({
        where: { id: lancamento.id },
        data: {
          movimentacaoCaixaId: movimento.id,
        },
      });
      summary.movimentacoesCaixa += 1;
    }
  }
}

async function createTransfers({ counters, contas, summary }) {
  const transfers = [
    { from: contas.principal, to: contas.reserva, value: 1200, category: "TRANSFERENCIA_RESERVA" },
    { from: contas.principal, to: contas.marketing, value: 700, category: "TRANSFERENCIA_MARKETING" },
    { from: contas.principal, to: contas.reinvestimento, value: 950, category: "TRANSFERENCIA_REINVESTIMENTO" },
  ];

  for (const transfer of transfers) {
    const date = dateAt(addDays(new Date(), -18 + Math.floor(Math.random() * 10)), 16, 0);
    const groupId = randomUUID();

    await prisma.movimentacaoCaixa.createMany({
      data: [
        {
          codigo: counters.caixa(),
          contaId: transfer.from.id,
          tipo: "SAIDA",
          categoria: transfer.category,
          descricao: `Transferencia para ${transfer.to.nome}`,
          valor: transfer.value,
          status: "PAGA",
          dataPrevista: date,
          dataEfetiva: date,
          origemTipo: `${ORIGIN_PREFIX}:TRANSFERENCIA_SAIDA`,
          origemId: `${groupId}-saida`,
          aprovadoEm: date,
          pagoEm: date,
          observacoes: markerText("Transferencia gerencial simulada."),
          criadoEm: date,
        },
        {
          codigo: counters.caixa(),
          contaId: transfer.to.id,
          tipo: "ENTRADA",
          categoria: transfer.category,
          descricao: `Transferencia recebida de ${transfer.from.nome}`,
          valor: transfer.value,
          status: "PAGA",
          dataPrevista: date,
          dataEfetiva: date,
          origemTipo: `${ORIGIN_PREFIX}:TRANSFERENCIA_ENTRADA`,
          origemId: `${groupId}-entrada`,
          aprovadoEm: date,
          pagoEm: date,
          observacoes: markerText("Transferencia gerencial simulada."),
          criadoEm: date,
        },
      ],
    });

    summary.movimentacoesCaixa += 2;
  }
}

async function createLowStockAdjustments({ counters, products, virtualStock, summary }) {
  const options = shuffle(
    products.flatMap((product) =>
      getProductOptions(product).map((size) => ({
        product,
        tamanhoAnel: size,
        current: number(virtualStock.get(stockKey(product.id, size))),
      })),
    ),
  )
    .filter((item) => item.current > 8)
    .slice(0, LOW_STOCK_TARGETS.length);

  for (let index = 0; index < options.length; index += 1) {
    const item = options[index];
    const target = LOW_STOCK_TARGETS[index];
    const quantity = Math.max(0, item.current - target);
    if (quantity <= 0) continue;

    const date = dateAt(addDays(new Date(), -2 + index), 18, 10);
    await prisma.$transaction(async (tx) => {
      const stock = await tx.estoqueProduto.findUnique({
        where: {
          produtoId_tamanhoAnel: {
            produtoId: item.product.id,
            tamanhoAnel: normalizeStockSize(item.tamanhoAnel),
          },
        },
      });

      if (!stock || stock.quantidadeAtual <= target) return;

      const decrement = stock.quantidadeAtual - target;
      const cost = round(number(stock.custoMedio) * decrement);
      const newValue = Math.max(0, round(number(stock.valorAcumulado) - cost));

      await tx.estoqueProduto.update({
        where: { id: stock.id },
        data: {
          quantidadeAtual: target,
          valorAcumulado: newValue,
          custoMedio: calculateAverageCost(newValue, target),
        },
      });

      await tx.movimentacao.create({
        data: {
          codigoMovimentacao: `${MOVEMENT_CODE_PREFIX}${randomUUID()}`,
          tipoMovimentacao: "SAIDA AJUSTE SIMULACAO",
          origemTipo: `${ORIGIN_PREFIX}:AJUSTE_REPOSICAO`,
          origemId: `${item.product.id}-${normalizeStockSize(item.tamanhoAnel)}-${randomUUID()}`,
          codigoItem: item.product.codigoInterno,
          itemTipo: "produto",
          quantidade: decrement,
          tamanhoAnel: normalizeStockSize(item.tamanhoAnel) === "UNICO" ? null : normalizeStockSize(item.tamanhoAnel),
          custo: cost,
          faturamento: 0,
          documentoCliente: null,
          status: "ATIVA",
          relacionadoA: "Reposicao simulada",
          gastoProdutoPrincipal: cost,
          gastoAdd1: 0,
          gastoAdd2: 0,
          gastoAdd3: 0,
          criadoEm: date,
        },
      });
    });

    virtualStock.set(stockKey(item.product.id, item.tamanhoAnel), target);
    summary.estoqueBaixo += 1;
    summary.movimentacoesEstoque += 1;
  }
}

async function calculateMonthResult(mes, ano) {
  const period = monthPeriod(mes, ano);
  const [vendas, pedidos, gastos, caixa, movimentos] = await Promise.all([
    prisma.venda.findMany({
      where: {
        observacoes: { contains: MARKER },
        status: { notIn: ["CANCELADA", "NA_LIXEIRA"] },
        criadoEm: { gte: period.inicio, lt: period.fimExclusivo },
      },
      select: { valorTotal: true, gastoTotal: true },
    }),
    prisma.pedidoOnline.findMany({
      where: {
        observacoes: { contains: MARKER },
        origemCanal: "LOJA_STELLA",
        statusPagamento: "PAGO",
        status: { notIn: ["CANCELADO", "EXPIRADO", "RECUSADO"] },
        pagoEm: { gte: period.inicio, lt: period.fimExclusivo },
      },
      select: { id: true, total: true, valorPago: true },
    }),
    prisma.lancamentoFinanceiro.findMany({
      where: {
        observacoes: { contains: MARKER },
        statusPagamento: "PAGO",
        status: { not: "NA_LIXEIRA" },
        dataPagamento: { gte: period.inicio, lt: period.fimExclusivo },
      },
      select: { valorReal: true, categoria: true, tipo: true },
    }),
    prisma.movimentacaoCaixa.findMany({
      where: {
        observacoes: { contains: MARKER },
        status: "PAGA",
        dataEfetiva: { gte: period.inicio, lt: period.fimExclusivo },
      },
      select: { tipo: true, categoria: true, valor: true },
    }),
    prisma.movimentacao.findMany({
      where: {
        origemTipo: { startsWith: ORIGIN_PREFIX },
        status: "ATIVA",
        criadoEm: { gte: period.inicio, lt: period.fimExclusivo },
      },
      select: { origemTipo: true, origemId: true, custo: true, faturamento: true },
    }),
  ]);

  const receitaVendas = vendas.reduce((total, item) => total + number(item.valorTotal), 0);
  const custoVendas = vendas.reduce((total, item) => total + number(item.gastoTotal), 0);
  const pedidoIds = new Set(pedidos.map((pedido) => pedido.id));
  const receitaPedidos = pedidos.reduce((total, item) => total + (number(item.valorPago) || number(item.total)), 0);
  const custoPedidos = movimentos
    .filter((movimento) => String(movimento.origemTipo).includes(":PEDIDO_ONLINE") && pedidoIds.has(movimento.origemId))
    .reduce((total, item) => total + number(item.custo), 0);
  const gastosOperacionais = gastos
    .filter((item) => !["PRO_LABORE", "DISTRIBUICAO_RESULTADO"].includes(item.categoria))
    .reduce((total, item) => total + number(item.valorReal), 0);
  const comprasEstoqueCaixa = caixa
    .filter((item) => item.categoria === "COMPRA_ESTOQUE")
    .reduce((total, item) => total + number(item.valor), 0);
  const caixaLiquido = caixa.reduce((total, item) => {
    if (item.tipo === "SAIDA") return total - number(item.valor);
    return total + number(item.valor);
  }, 0);
  const receitaRecebida = round(receitaVendas + receitaPedidos);
  const custoProdutos = round(custoVendas + custoPedidos);
  const resultadoBruto = round(receitaRecebida - custoProdutos);
  const lucroApuravel = round(resultadoBruto - gastosOperacionais);

  return {
    periodo: period,
    receitaRecebida,
    custoProdutos,
    custoEmbalagens: 0,
    taxas: 0,
    fretes: 0,
    gastosOperacionais: round(gastosOperacionais),
    comprasEstoqueCaixa: round(comprasEstoqueCaixa),
    resultadoBruto,
    lucroApuravel,
    caixaLiquido: round(caixaLiquido),
    fontes: {
      vendasInternas: vendas.length,
      pedidosOnlinePagos: pedidos.length,
      gastosPagos: gastos.length,
      comprasEstoquePagasNoCaixa: round(comprasEstoqueCaixa),
      movimentosCaixaPagos: caixa.length,
      estimativas: ["Resultado gerado pelo script de simulacao operacional."],
    },
    alertas: lucroApuravel < 0
      ? [{ tipo: "LUCRO_NEGATIVO", severidade: "ATENCAO", titulo: "Simulacao com lucro negativo", descricao: "Revise precificacao no cenario simulado." }]
      : [],
  };
}

async function createResultApuracoes({ counters, contas, regra, summary, warnings }) {
  const today = new Date();
  const months = [
    { ...previousMonth(today), status: "FECHADA" },
    { ...currentMonth(today), status: "RASCUNHO" },
  ];

  for (const item of months) {
    const existing = await prisma.apuracaoResultadoMensal.findUnique({
      where: {
        mes_ano: {
          mes: item.mes,
          ano: item.ano,
        },
      },
      include: { destinos: true },
    });

    if (existing && !hasMarker(existing.observacoes)) {
      warnings.push(`Apuracao ${item.mes}/${item.ano} ja existe sem marcador; o script nao alterou esse fechamento.`);
      continue;
    }

    const calc = await calculateMonthResult(item.mes, item.ano);
    const destinos = regra.destinos.length > 0 ? regra.destinos : DEFAULT_DESTINOS;
    const regraSnapshot = {
      id: regra.id,
      nome: regra.nome,
      percentualEmpresa: regra.percentualEmpresa,
      percentualProLabore: regra.percentualProLabore,
      destinos: destinos.map((destino) => ({
        tipo: destino.tipo,
        nome: destino.nome,
        percentual: destino.percentual,
        ordem: destino.ordem,
      })),
    };

    const apuracao = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.apuracaoResultadoDestino.updateMany({
          where: { apuracaoId: existing.id },
          data: { movimentacaoCaixaId: null },
        });
        await tx.apuracaoResultadoDestino.deleteMany({
          where: { apuracaoId: existing.id },
        });
      }

      const created = await tx.apuracaoResultadoMensal.upsert({
        where: {
          mes_ano: {
            mes: item.mes,
            ano: item.ano,
          },
        },
        create: {
          codigo: counters.apuracao(item.mes, item.ano),
          mes: item.mes,
          ano: item.ano,
          periodoInicio: calc.periodo.inicio,
          periodoFim: calc.periodo.fim,
          status: item.status,
          receitaRecebida: calc.receitaRecebida,
          custoProdutos: calc.custoProdutos,
          custoEmbalagens: calc.custoEmbalagens,
          taxas: calc.taxas,
          fretes: calc.fretes,
          gastosOperacionais: calc.gastosOperacionais,
          comprasEstoqueCaixa: calc.comprasEstoqueCaixa,
          resultadoBruto: calc.resultadoBruto,
          lucroApuravel: calc.lucroApuravel,
          caixaLiquido: calc.caixaLiquido,
          regraSnapshotJson: regraSnapshot,
          fontesSnapshotJson: calc.fontes,
          alertasSnapshotJson: calc.alertas,
          fechadoEm: item.status === "FECHADA" ? new Date() : null,
          observacoes: markerText(`Apuracao ${item.status.toLowerCase()} criada pela simulacao.`),
        },
        update: {
          periodoInicio: calc.periodo.inicio,
          periodoFim: calc.periodo.fim,
          status: item.status,
          receitaRecebida: calc.receitaRecebida,
          custoProdutos: calc.custoProdutos,
          custoEmbalagens: calc.custoEmbalagens,
          taxas: calc.taxas,
          fretes: calc.fretes,
          gastosOperacionais: calc.gastosOperacionais,
          comprasEstoqueCaixa: calc.comprasEstoqueCaixa,
          resultadoBruto: calc.resultadoBruto,
          lucroApuravel: calc.lucroApuravel,
          caixaLiquido: calc.caixaLiquido,
          regraSnapshotJson: regraSnapshot,
          fontesSnapshotJson: calc.fontes,
          alertasSnapshotJson: calc.alertas,
          fechadoEm: item.status === "FECHADA" ? new Date() : null,
          observacoes: markerText(`Apuracao ${item.status.toLowerCase()} criada pela simulacao.`),
        },
      });

      for (const destino of destinos) {
        const value = round(Math.max(0, calc.lucroApuravel) * (number(destino.percentual) / 100));
        await tx.apuracaoResultadoDestino.create({
          data: {
            apuracaoId: created.id,
            tipo: destino.tipo,
            nome: destino.nome,
            percentual: number(destino.percentual),
            valor: value,
            statusPagamento: item.status === "FECHADA" && String(destino.tipo).startsWith("PRO_LABORE") ? "APROVADO" : "PREVISTO",
            observacoes: markerText("Destino de resultado simulado."),
          },
        });
      }

      return created;
    });

    summary.apuracoesCriadas += 1;

    if (item.status === "FECHADA") {
      const proLabore = await prisma.apuracaoResultadoDestino.findMany({
        where: {
          apuracaoId: apuracao.id,
          tipo: { startsWith: "PRO_LABORE" },
        },
        orderBy: { criadoEm: "asc" },
      });

      if (proLabore[0]) {
        const date = dateAt(new Date(), 10, 30);
        const movimento = await prisma.movimentacaoCaixa.create({
          data: {
            codigo: counters.caixa(),
            contaId: contas.principal.id,
            tipo: "SAIDA",
            categoria: "PRO_LABORE",
            descricao: `${proLabore[0].nome} - ${apuracao.codigo}`,
            valor: proLabore[0].valor,
            status: "PAGA",
            dataPrevista: date,
            dataEfetiva: date,
            origemTipo: `${ORIGIN_PREFIX}:APURACAO_DESTINO`,
            origemId: proLabore[0].id,
            aprovadoEm: date,
            pagoEm: date,
            observacoes: markerText("Pro-labore pago na simulacao."),
          },
        });

        await prisma.apuracaoResultadoDestino.update({
          where: { id: proLabore[0].id },
          data: {
            statusPagamento: "PAGO",
            movimentacaoCaixaId: movimento.id,
          },
        });
        summary.movimentacoesCaixa += 1;
      }

      if (proLabore[1]) {
        await prisma.apuracaoResultadoDestino.update({
          where: { id: proLabore[1].id },
          data: {
            statusPagamento: "APROVADO",
          },
        });
      }
    }
  }
}

async function reverseProductStock(tx, movement, direction) {
  const product = await tx.produto.findUnique({
    where: {
      codigoInterno: movement.codigoItem,
    },
    select: {
      id: true,
    },
  });

  if (!product) return false;

  const tamanho = normalizeStockSize(movement.tamanhoAnel);
  const quantity = Math.max(0, number(movement.quantidade));
  const value = Math.max(0, number(movement.gastoProdutoPrincipal) || number(movement.custo));

  if (quantity <= 0) return false;

  const stock = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId: product.id,
        tamanhoAnel: tamanho,
      },
    },
  });

  if (direction > 0) {
    const updated = await tx.estoqueProduto.upsert({
      where: {
        produtoId_tamanhoAnel: {
          produtoId: product.id,
          tamanhoAnel: tamanho,
        },
      },
      create: {
        produtoId: product.id,
        tamanhoAnel: tamanho,
        quantidadeAtual: quantity,
        valorAcumulado: value,
        custoMedio: calculateAverageCost(value, quantity),
      },
      update: {
        quantidadeAtual: { increment: quantity },
        valorAcumulado: { increment: value },
      },
    });

    await tx.estoqueProduto.update({
      where: { id: updated.id },
      data: {
        custoMedio: calculateAverageCost(number(updated.valorAcumulado), updated.quantidadeAtual),
      },
    });
    return true;
  }

  if (!stock) return false;

  const nextQuantity = Math.max(0, stock.quantidadeAtual - quantity);
  const nextValue = Math.max(0, round(number(stock.valorAcumulado) - value));

  await tx.estoqueProduto.update({
    where: { id: stock.id },
    data: {
      quantidadeAtual: nextQuantity,
      valorAcumulado: nextValue,
      custoMedio: calculateAverageCost(nextValue, nextQuantity),
    },
  });
  return true;
}

async function reverseAdditionalStock(tx, movement, direction) {
  const item = await tx.itemAdicional.findUnique({
    where: {
      codigoInterno: movement.codigoItem,
    },
    select: {
      id: true,
    },
  });

  if (!item) return false;

  const quantity = Math.max(0, number(movement.quantidade));
  const value = Math.max(0, number(movement.custo));
  if (quantity <= 0) return false;

  const stock = await tx.estoqueAdicional.findUnique({
    where: {
      itemAdicionalId: item.id,
    },
  });

  if (direction > 0) {
    const updated = await tx.estoqueAdicional.upsert({
      where: {
        itemAdicionalId: item.id,
      },
      create: {
        itemAdicionalId: item.id,
        quantidadeAtual: quantity,
        valorAcumulado: value,
        custoMedio: calculateAverageCost(value, quantity),
      },
      update: {
        quantidadeAtual: { increment: quantity },
        valorAcumulado: { increment: value },
      },
    });

    await tx.estoqueAdicional.update({
      where: { id: updated.id },
      data: {
        custoMedio: calculateAverageCost(number(updated.valorAcumulado), updated.quantidadeAtual),
      },
    });
    return true;
  }

  if (!stock) return false;

  const nextQuantity = Math.max(0, stock.quantidadeAtual - quantity);
  const nextValue = Math.max(0, round(number(stock.valorAcumulado) - value));

  await tx.estoqueAdicional.update({
    where: { id: stock.id },
    data: {
      quantidadeAtual: nextQuantity,
      valorAcumulado: nextValue,
      custoMedio: calculateAverageCost(nextValue, nextQuantity),
    },
  });
  return true;
}

async function resetSimulation() {
  const result = {
    estoqueRevertido: 0,
    apuracoes: 0,
    caixas: 0,
    gastos: 0,
    pedidos: 0,
    vendas: 0,
    compras: 0,
    movimentosEstoque: 0,
    clientes: 0,
    contasRemovidas: 0,
    contasMantidas: 0,
  };

  await prisma.$transaction(
    async (tx) => {
      const movements = await tx.movimentacao.findMany({
        where: {
          OR: [
            { origemTipo: { startsWith: ORIGIN_PREFIX } },
            { codigoMovimentacao: { startsWith: MOVEMENT_CODE_PREFIX } },
          ],
        },
        include: {
          adicionaisConsumidos: true,
        },
        orderBy: { criadoEm: "desc" },
      });

      const saleMovements = movements.filter(isSaleMovement);
      const entryMovements = movements.filter(isEntryMovement);

      for (const movement of saleMovements) {
        if (movement.itemTipo === "produto") {
          if (await reverseProductStock(tx, movement, 1)) result.estoqueRevertido += 1;
        }
        if (movement.itemTipo === "adicional") {
          if (await reverseAdditionalStock(tx, movement, 1)) result.estoqueRevertido += 1;
        }
        for (const adicional of movement.adicionaisConsumidos) {
          await reverseAdditionalStock(tx, {
            codigoItem: adicional.codigoItem,
            quantidade: Math.round(number(adicional.quantidade)),
            custo: adicional.custoTotal,
          }, 1);
        }
      }

      for (const movement of entryMovements) {
        if (movement.itemTipo === "produto") {
          if (await reverseProductStock(tx, movement, -1)) result.estoqueRevertido += 1;
        }
        if (movement.itemTipo === "adicional") {
          if (await reverseAdditionalStock(tx, movement, -1)) result.estoqueRevertido += 1;
        }
      }

      const apuracaoIds = await tx.apuracaoResultadoMensal.findMany({
        where: {
          observacoes: { contains: MARKER },
        },
        select: {
          id: true,
        },
      });

      await tx.apuracaoResultadoDestino.updateMany({
        where: {
          OR: [
            { observacoes: { contains: MARKER } },
            { apuracaoId: { in: apuracaoIds.map((item) => item.id) } },
          ],
        },
        data: {
          movimentacaoCaixaId: null,
        },
      });

      const apuracoes = await tx.apuracaoResultadoMensal.deleteMany({
        where: {
          observacoes: { contains: MARKER },
        },
      });
      result.apuracoes = apuracoes.count;

      await tx.lancamentoFinanceiro.updateMany({
        where: {
          observacoes: { contains: MARKER },
        },
        data: {
          movimentacaoCaixaId: null,
        },
      });

      const gastos = await tx.lancamentoFinanceiro.deleteMany({
        where: {
          observacoes: { contains: MARKER },
        },
      });
      result.gastos = gastos.count;

      const caixas = await tx.movimentacaoCaixa.deleteMany({
        where: {
          observacoes: { contains: MARKER },
        },
      });
      result.caixas = caixas.count;

      const pedidos = await tx.pedidoOnline.deleteMany({
        where: {
          observacoes: { contains: MARKER },
        },
      });
      result.pedidos = pedidos.count;

      const vendas = await tx.venda.deleteMany({
        where: {
          observacoes: { contains: MARKER },
        },
      });
      result.vendas = vendas.count;

      const compras = await tx.compra.deleteMany({
        where: {
          observacoes: { contains: MARKER },
        },
      });
      result.compras = compras.count;

      const movimentosEstoque = await tx.movimentacao.deleteMany({
        where: {
          OR: [
            { origemTipo: { startsWith: ORIGIN_PREFIX } },
            { codigoMovimentacao: { startsWith: MOVEMENT_CODE_PREFIX } },
          ],
        },
      });
      result.movimentosEstoque = movimentosEstoque.count;

      await tx.clienteCashbackMovimentacao.deleteMany({
        where: {
          observacao: { contains: MARKER },
        },
      });

      const clientes = await tx.cliente.deleteMany({
        where: {
          observacoes: { contains: MARKER },
        },
      });
      result.clientes = clientes.count;

      const contasSimuladas = await tx.contaFinanceira.findMany({
        where: {
          observacoes: { contains: MARKER },
        },
        select: {
          id: true,
        },
      });

      for (const conta of contasSimuladas) {
        const refs = await Promise.all([
          tx.movimentacaoCaixa.count({ where: { contaId: conta.id } }),
          tx.lancamentoFinanceiro.count({ where: { contaFinanceiraId: conta.id } }),
        ]);

        if (refs[0] === 0 && refs[1] === 0) {
          await tx.contaFinanceira.delete({ where: { id: conta.id } });
          result.contasRemovidas += 1;
        } else {
          result.contasMantidas += 1;
        }
      }
    },
    { maxWait: 15000, timeout: 180000 },
  );

  return result;
}

function createSummary() {
  return {
    clientesCriados: 0,
    contasCriadas: 0,
    regrasCriadas: 0,
    comprasEstoqueCriadas: 0,
    vendasCriadas: 0,
    pedidosCriados: 0,
    pedidosPorStatus: {},
    unidadesVendidas: 0,
    produtosUsados: new Set(),
    gastosCriados: 0,
    movimentacoesCaixa: 0,
    movimentacoesEstoque: 0,
    apuracoesCriadas: 0,
    estoqueBaixo: 0,
    totalFaturado: 0,
    totalGastos: 0,
  };
}

function printSummary(summary, warnings = []) {
  console.log("");
  console.log("Resumo da simulacao");
  console.log("===================");
  console.log(`Clientes criados: ${summary.clientesCriados}`);
  console.log(`Produtos usados: ${summary.produtosUsados.size}`);
  console.log(`Unidades vendidas: ${summary.unidadesVendidas}`);
  console.log(`Vendas criadas: ${summary.vendasCriadas}`);
  console.log(`Pedidos criados: ${summary.pedidosCriados}`);
  console.log(`Compras de estoque criadas: ${summary.comprasEstoqueCriadas}`);
  console.log(`Gastos criados: ${summary.gastosCriados}`);
  console.log(`Movimentacoes de estoque: ${summary.movimentacoesEstoque}`);
  console.log(`Movimentacoes de caixa: ${summary.movimentacoesCaixa}`);
  console.log(`Apuracoes criadas: ${summary.apuracoesCriadas}`);
  console.log(`Produtos/opcoes deixados em estoque baixo: ${summary.estoqueBaixo}`);
  console.log(`Total faturado simulado: ${money(summary.totalFaturado)}`);
  console.log(`Total de gastos simulados: ${money(summary.totalGastos)}`);
  console.log("");
  console.log("Pedidos por status:");
  for (const [status, count] of Object.entries(summary.pedidosPorStatus).sort()) {
    console.log(`- ${status}: ${count}`);
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("Avisos:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  printSafetyWarning(args);

  const diag = await diagnose();

  if (diag.produtosVendaveis === 0) {
    throw new Error("Nao ha produtos vendaveis ativos com preco de venda. Cadastre produtos antes de simular.");
  }

  if (args.dryRun) {
    printDryRun(diag, args);
    return;
  }

  if (args.reset) {
    const reset = await resetSimulation();
    console.log("Reset seguro concluido.");
    for (const [key, value] of Object.entries(reset)) {
      console.log(`- ${key}: ${value}`);
    }
    return;
  }

  if (totalCounts(diag.simulatedCounts) > 0) {
    throw new Error(`Ja existem dados simulados com ${MARKER}. Rode primeiro com --reset --confirm=${CONFIRMATION}.`);
  }

  const counters = await loadCounters();
  const summary = createSummary();
  const warnings = [];
  const virtualStock = new Map();

  for (const product of diag.produtos) {
    for (const size of getProductOptions(product)) {
      const existing = product.estoque.find((stock) => normalizeStockSize(stock.tamanhoAnel) === normalizeStockSize(size));
      virtualStock.set(stockKey(product.id, size), number(existing?.quantidadeAtual));
    }
  }

  const { contas, regra } = await ensureFinancialBase(counters, summary);
  const clientes = await createClients(counters, summary);

  await createInitialAndWeeklyPurchases({
    counters,
    contas,
    products: diag.produtos,
    adicionais: diag.adicionais,
    days: args.dias,
    itemsPerDay: args.itensDia,
    summary,
    virtualStock,
  });

  await createSalesAndOrders({
    counters,
    contas,
    products: diag.produtos,
    clientes,
    days: args.dias,
    itemsPerDay: args.itensDia,
    virtualStock,
    summary,
  });

  await createOperationalExtraOrders({
    counters,
    contas,
    products: diag.produtos,
    clientes,
    virtualStock,
    summary,
  });

  await createExpenses({ counters, contas, summary });
  await createTransfers({ counters, contas, summary });
  await createLowStockAdjustments({
    counters,
    products: diag.produtos,
    virtualStock,
    summary,
  });
  await createResultApuracoes({ counters, contas, regra, summary, warnings });

  const usedProductIds = new Set();
  const simulatedMovements = await prisma.movimentacao.findMany({
    where: {
      origemTipo: { startsWith: ORIGIN_PREFIX },
      itemTipo: "produto",
    },
    select: {
      codigoItem: true,
    },
  });
  for (const movement of simulatedMovements) {
    usedProductIds.add(movement.codigoItem);
  }
  summary.produtosUsados = usedProductIds;

  printSummary(summary, warnings);
}

main()
  .catch((error) => {
    console.error("");
    console.error("Erro na simulacao operacional:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
