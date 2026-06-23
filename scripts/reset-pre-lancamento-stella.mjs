import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const CONFIRM_TOKEN = "RESET_PRE_LANCAMENTO_STELLA";
const DEFAULT_SCOPE = "pre-lancamento";
const ALLOWED_SCOPES = new Set([
  "pre-lancamento",
  "operacional",
  "inteligencia",
  "financeiro",
  "notificacoes",
  "tudo",
]);

const PRESERVED_MODELS = [
  "produto",
  "produtoFamilia",
  "produtoFamiliaCampo",
  "produtoFamiliaProduto",
  "produtoFamiliaProdutoValor",
  "produtoImagem",
  "midiaAsset",
  "produtoVariacao",
  "produtoVariacaoOpcao",
  "produtoCanal",
  "categoriaProduto",
  "produtoCategoria",
  "produtoKitComponente",
  "categoriaOpcaoAdicional",
  "itemAdicional",
  "embalagemClasse",
  "embalagemModelo",
  "embalagemModeloComponente",
  "embalagemModeloCompatibilidade",
  "embalagemConfiguracao",
  "regraCategoria",
  "contaFinanceira",
  "regraDistribuicaoResultado",
  "regraDistribuicaoDestino",
  "lojaPagina",
  "lojaPaginaBloco",
  "bannerLoja",
  "menuLoja",
  "lojaCategoriaHome",
  "lojaSecaoHome",
  "lojaBlocoHome",
  "lojaTextoInstitucional",
  "lojaCashbackConfiguracao",
  "lojaFreteConfiguracao",
  "lojaMenuRodapeConfiguracao",
  "lojaEntregaManualOrigem",
  "usuarioAdmin",
  "perfilAdministrativo",
  "regraNotificacaoPerfil",
  "cupomLoja",
];

const RESET_GROUPS = {
  eventos: [
    "eventoComercial",
    "lojaFormularioResposta",
  ],
  notificacoes: [
    "notificacaoCanalEnvio",
    "notificacaoUsuario",
    "notificacaoSistema",
  ],
  pedidos: [
    "pedidoOnlineItemAdicional",
    "pedidoOnlineItemEmbalagemPresente",
    "pedidoEmbalagemPlanoItem",
    "pedidoEmbalagemPlano",
    "pedidoEnvio",
    "pedidoStatusHistorico",
    "pedidoOnlineItem",
    "pedidoOnline",
  ],
  vendas: [
    "vendaItem",
    "venda",
  ],
  compras: [
    "compraItem",
    "compra",
  ],
  financeiro: [
    "apuracaoResultadoDestino",
    "lancamentoFinanceiro",
    "movimentacaoCaixa",
    "apuracaoResultadoMensal",
  ],
  estoque: [
    "movimentacaoAdicional",
    "movimentacao",
    "produtoMetricaSnapshot",
    "produtoCicloEstoque",
    "estoqueProduto",
    "estoqueAdicional",
  ],
  inteligencia: [
    "recomendacaoGerencialImpacto",
    "vitrineInteligenteSugestao",
    "campanhaComercial",
    "recomendacaoGerencial",
    "colecaoInteligenteProduto",
    "colecaoInteligente",
  ],
  clientes: [
    "clienteCashbackMovimentacao",
    "cliente",
  ],
};

const SCOPE_GROUPS = {
  "pre-lancamento": [
    "eventos",
    "pedidos",
    "vendas",
    "compras",
    "financeiro",
    "estoque",
    "inteligencia",
    "notificacoes",
    "clientes",
  ],
  tudo: [
    "eventos",
    "pedidos",
    "vendas",
    "compras",
    "financeiro",
    "estoque",
    "inteligencia",
    "notificacoes",
    "clientes",
  ],
  operacional: [
    "eventos",
    "pedidos",
    "vendas",
    "estoque",
    "clientes",
  ],
  financeiro: [
    "compras",
    "financeiro",
  ],
  inteligencia: [
    "inteligencia",
  ],
  notificacoes: [
    "notificacoes",
  ],
};

const MANUAL_REVIEW = [
  {
    name: "midiaAsset",
    reason: "midias podem conter imagens reais do catalogo; revisar manualmente.",
  },
  {
    name: "cupomLoja",
    reason: "decisao comercial; preservar salvo aprovacao explicita.",
  },
  {
    name: "colecoes-inteligentes",
    reason: "o escopo pre-lancamento inclui colecoes geradas; revisar relatorio antes de executar.",
  },
  {
    name: "clientes",
    reason: "apagar clientes somente apos confirmar que nao ha cliente real.",
  },
];

const EXPECTED_IF_PRESENT = [
  "carrinho",
  "carrinhoItem",
  "checkoutSessao",
  "sessaoCheckout",
  "pedidoPagamentoTentativa",
  "simulacaoOperacional",
];

const args = parseArgs(process.argv.slice(2));
const prisma = new PrismaClient();

const report = {
  timestamp: new Date().toISOString(),
  mode: args.execute && args.confirm === CONFIRM_TOKEN ? "execute" : "dry-run",
  scope: args.scope,
  scopeGroups: SCOPE_GROUPS[args.scope] ?? [],
  safety: {
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    secretsPrinted: false,
  },
  modelsEvaluated: [],
  countsBefore: {},
  countsAfter: {},
  deletePlan: [],
  deleted: {},
  preserved: [],
  ignored: [],
  warnings: [],
  errors: [],
};

try {
  validateArgs(args);
  runSafetyChecks(args, report);

  const resetModels = getModelsForScope(args.scope);
  const availableModels = new Set(getAvailableModels(prisma));

  report.preserved = await collectCounts(PRESERVED_MODELS, availableModels);
  report.ignored.push(...collectMissingExpected(availableModels));
  report.ignored.push(...MANUAL_REVIEW);

  for (const modelName of resetModels) {
    const delegate = getDelegate(prisma, modelName);
    const item = {
      name: modelName,
      exists: Boolean(delegate),
      action: delegate ? "deleteMany" : "not-found",
      reason: delegate ? "candidate reset data for selected scope" : "modelo nao encontrado no Prisma Client",
    };

    report.modelsEvaluated.push(item);

    if (!delegate) {
      report.ignored.push({
        name: modelName,
        reason: "modelo nao encontrado",
      });
      continue;
    }

    const count = await delegate.count();
    report.countsBefore[modelName] = count;
    report.deletePlan.push({
      name: modelName,
      count,
      action: "deleteMany",
    });
  }

  if (report.mode === "execute") {
    await executeReset(resetModels, availableModels, report);

    for (const modelName of resetModels) {
      const delegate = getDelegate(prisma, modelName);
      if (delegate) {
        report.countsAfter[modelName] = await delegate.count();
      }
    }
  } else {
    report.warnings.push("Dry-run executado: nenhuma delecao ou alteracao de banco foi realizada.");
    if (args.execute) {
      report.warnings.push("Flag --execute ignorada porque a confirmacao textual esta ausente ou incorreta.");
    }
  }
} catch (error) {
  report.errors.push(safeErrorMessage(error));
  process.exitCode = 1;
} finally {
  const reportPath = writeReport(report);
  await prisma.$disconnect();
  printSummary(report, reportPath, args.json);
}

function parseArgs(argv) {
  const parsed = {
    scope: DEFAULT_SCOPE,
    execute: false,
    confirm: "",
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--execute") {
      parsed.execute = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg.startsWith("--scope=")) {
      parsed.scope = arg.slice("--scope=".length);
    } else if (arg.startsWith("--escopo=")) {
      parsed.scope = arg.slice("--escopo=".length);
    } else if (arg.startsWith("--confirm=")) {
      parsed.confirm = arg.slice("--confirm=".length);
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  return parsed;
}

function validateArgs(parsed) {
  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  if (!ALLOWED_SCOPES.has(parsed.scope)) {
    throw new Error(`Escopo invalido: ${parsed.scope}`);
  }

  if (parsed.execute && parsed.confirm !== CONFIRM_TOKEN) {
    report.warnings.push(`Para executar de verdade, use --execute --confirm=${CONFIRM_TOKEN}.`);
    parsed.execute = false;
  }
}

function runSafetyChecks(parsed, safetyReport) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ausente. Abortando sem acessar o banco.");
  }

  assertMigrationsOk();

  const gitShortStatus = getGitStatusShort();
  if (gitShortStatus.trim()) {
    if (parsed.execute) {
      throw new Error("Git possui alteracoes locais. Reset real abortado.");
    }

    safetyReport.warnings.push("Git possui alteracoes locais; dry-run permitido, reset real seria abortado.");
  }
}

function assertMigrationsOk() {
  try {
    const prismaCliPath = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
    const output = execFileSync(process.execPath, [prismaCliPath, "migrate", "status"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    if (!output.includes("Database schema is up to date")) {
      throw new Error("Prisma migrate status nao confirmou schema atualizado.");
    }
  } catch (error) {
    throw new Error(`Falha ao validar migrations Prisma: ${safeErrorMessage(error)}`);
  }
}

function getGitStatusShort() {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(`Falha ao validar status Git: ${safeErrorMessage(error)}`);
  }
}

function getModelsForScope(scope) {
  const groups = SCOPE_GROUPS[scope];
  const models = [];
  const seen = new Set();

  for (const group of groups) {
    for (const modelName of RESET_GROUPS[group]) {
      if (!seen.has(modelName)) {
        seen.add(modelName);
        models.push(modelName);
      }
    }
  }

  return models;
}

function getAvailableModels(client) {
  return Object.keys(client).filter((key) => {
    if (key.startsWith("$") || key.startsWith("_")) {
      return false;
    }

    return Boolean(getDelegate(client, key));
  });
}

function getDelegate(client, modelName) {
  const delegate = client[modelName];
  if (!delegate || typeof delegate.count !== "function") {
    return null;
  }

  return delegate;
}

async function collectCounts(modelNames, availableModels) {
  const result = [];

  for (const modelName of modelNames) {
    const delegate = getDelegate(prisma, modelName);
    if (!delegate) {
      result.push({
        name: modelName,
        exists: false,
        reason: "modelo preservado nao encontrado no Prisma Client",
      });
      continue;
    }

    result.push({
      name: modelName,
      exists: availableModels.has(modelName),
      count: await delegate.count(),
      action: "preserve",
    });
  }

  return result;
}

function collectMissingExpected(availableModels) {
  return EXPECTED_IF_PRESENT
    .filter((modelName) => !availableModels.has(modelName))
    .map((modelName) => ({
      name: modelName,
      reason: "modelo nao encontrado; nenhuma acao necessaria",
    }));
}

async function executeReset(resetModels, availableModels, executionReport) {
  const existingModels = resetModels.filter((modelName) => availableModels.has(modelName));

  await prisma.$transaction(
    async (tx) => {
      for (const modelName of existingModels) {
        const delegate = getDelegate(tx, modelName);
        if (!delegate) {
          executionReport.ignored.push({
            name: modelName,
            reason: "delegate indisponivel durante transacao",
          });
          continue;
        }

        const result = await delegate.deleteMany({});
        executionReport.deleted[modelName] = result.count;
      }
    },
    {
      timeout: 120_000,
      maxWait: 20_000,
    },
  );
}

function writeReport(currentReport) {
  const timestamp = currentReport.timestamp
    .replace(/[:.]/g, "-")
    .replace("T", "-")
    .replace("Z", "");
  const tmpDir = path.join(process.cwd(), "tmp");
  const reportPath = path.join(tmpDir, `reset-pre-lancamento-${timestamp}.json`);

  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(currentReport, null, 2)}\n`, "utf8");

  return reportPath;
}

function printSummary(currentReport, reportPath, asJson) {
  const relativeReportPath = path.relative(process.cwd(), reportPath);
  const summary = {
    ok: currentReport.errors.length === 0,
    mode: currentReport.mode,
    scope: currentReport.scope,
    modelsEvaluated: currentReport.modelsEvaluated.length,
    plannedRows: Object.values(currentReport.countsBefore).reduce((sum, count) => sum + count, 0),
    reportPath: relativeReportPath,
    warnings: currentReport.warnings,
    errors: currentReport.errors,
  };

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Modo: ${summary.mode}`);
  console.log(`Escopo: ${summary.scope}`);
  console.log(`Models avaliados: ${summary.modelsEvaluated}`);
  console.log(`Registros planejados: ${summary.plannedRows}`);
  console.log(`Relatorio: ${summary.reportPath}`);

  if (summary.warnings.length > 0) {
    console.log("Avisos:");
    for (const warning of summary.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (summary.errors.length > 0) {
    console.log("Erros:");
    for (const error of summary.errors) {
      console.log(`- ${error}`);
    }
  }
}

function safeErrorMessage(error) {
  if (!error) {
    return "Erro desconhecido";
  }

  const message = error.stderr?.toString?.() || error.message || String(error);
  return message.replaceAll(process.env.DATABASE_URL ?? "", "[DATABASE_URL]");
}

function printHelp() {
  console.log(`
Uso:
  npm run reset:pre-lancamento -- --scope=pre-lancamento --json

Dry-run e o comportamento padrao.

Escopos:
  pre-lancamento, operacional, inteligencia, financeiro, notificacoes, tudo

Execucao real exige as duas flags:
  --execute --confirm=${CONFIRM_TOKEN}
`);
}
