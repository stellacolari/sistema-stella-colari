import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM_TOKEN = "ANALISAR_PRECIFICACAO_STELLA";

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function numero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function precoAtual(produto) {
  if (
    produto.descontoAtivo &&
    numero(produto.precoPromocional) > 0 &&
    numero(produto.precoPromocional) < numero(produto.precoVenda)
  ) {
    return numero(produto.precoPromocional);
  }
  return numero(produto.precoVenda);
}

function precoMinimo(custo, margemPct) {
  if (custo <= 0) return 0;
  const margem = Math.max(1, Math.min(90, margemPct)) / 100;
  return round(custo / (1 - margem));
}

function descontoMaximo(precoVenda, minimo) {
  if (precoVenda <= 0 || minimo <= 0 || minimo >= precoVenda) return 0;
  return round(((precoVenda - minimo) / precoVenda) * 100, 1);
}

function intencao(dadosJson) {
  const dados = dadosJson && typeof dadosJson === "object" && !Array.isArray(dadosJson)
    ? dadosJson
    : {};
  const item = dados.intencaoComercial && typeof dados.intencaoComercial === "object"
    ? dados.intencaoComercial
    : {};
  return {
    scoreInteresse: numero(item.scoreInteresse),
    scoreConversao: numero(item.scoreConversao),
  };
}

function classificar({ custo, margemPct, statusComercial, scoreInteresse, scoreConversao, estoque, descontoMax, sellThrough, quantidadeBase }) {
  const amostraMinima = numero(quantidadeBase) >= 3 || scoreInteresse >= 18 || scoreConversao >= 20;

  if (custo <= 0) return "DADOS_INSUFICIENTES";
  if (margemPct < 25) return "PRECO_CRITICO";
  if (statusComercial === "INTERESSE_SEM_CONVERSAO" || (scoreInteresse >= 25 && scoreConversao <= 5)) return "REVISAR_PRECO";
  if (
    ["CAMPEAO_PROVAVEL", "RISCO_RUPTURA", "REPOSICAO_CONFIRMADA"].includes(statusComercial) ||
    scoreInteresse >= 35 ||
    (estoque <= 2 &&
      ((numero(sellThrough) >= 35 && amostraMinima) || scoreInteresse >= 18 || scoreConversao >= 20))
  ) return "MARGEM_PROTEGIDA";
  if (["ESTOQUE_PARADO", "TRAVADO"].includes(statusComercial) && descontoMax > 0 && margemPct >= 45) return "DESCONTO_CONTROLADO";
  if (["ESTOQUE_PARADO", "TRAVADO"].includes(statusComercial)) return "PODE_VIRAR_COMBO";
  return "DESCONTO_BLOQUEADO";
}

async function main() {
  if (argValue("confirm") !== CONFIRM_TOKEN) {
    throw new Error(`Use --confirm=${CONFIRM_TOKEN} para analisar precificacao.`);
  }

  const produtos = await prisma.produto.findMany({
    where: { ativo: true, status: { not: "NA_LIXEIRA" } },
    include: {
      estoque: true,
      metricasSnapshots: { orderBy: { criadoEm: "desc" }, take: 1 },
      campanhasComerciais: {
        where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
        take: 5,
      },
    },
    orderBy: { nome: "asc" },
  });
  const margemMinima = 50;
  const analises = produtos.map((produto) => {
    const snapshot = produto.metricasSnapshots[0];
    const sinais = intencao(snapshot?.dadosJson);
    const estoque = produto.estoque.reduce((total, item) => total + numero(item.quantidadeAtual), 0);
    const custoMedio = produto.estoque.find((item) => numero(item.custoMedio) > 0)?.custoMedio;
    const custo = numero(custoMedio) || numero(produto.custoBase);
    const preco = precoAtual(produto);
    const margemValor = round(preco - custo);
    const margemPct = preco > 0 ? round((margemValor / preco) * 100, 2) : 0;
    const minimo = precoMinimo(custo, margemMinima);
    const descontoMax = descontoMaximo(numero(produto.precoVenda), minimo);
    const statusComercial = snapshot?.statusComercial || "NAO_TESTADO";
    const classificacao = classificar({
      custo,
      margemPct,
      statusComercial,
      scoreInteresse: sinais.scoreInteresse,
      scoreConversao: sinais.scoreConversao,
      estoque,
      descontoMax,
      sellThrough: snapshot?.sellThroughAcumulado,
      quantidadeBase: numero(snapshot?.estoqueInicial) + numero(snapshot?.entradas),
    });

    return {
      produtoId: produto.id,
      codigoInterno: produto.codigoInterno,
      nome: produto.nome,
      precoAtual: preco,
      custoEstimado: custo,
      margemValor,
      margemPct,
      precoMinimoSeguro: minimo,
      descontoMaximoSeguroPct: descontoMax,
      estoqueAtual: estoque,
      statusComercial,
      campanhasAbertas: produto.campanhasComerciais.length,
      classificacao,
    };
  });
  const resumo = {
    ok: true,
    periodo: argValue("periodo", "atual"),
    produtos: analises.length,
    descontosBloqueados: analises.filter((item) => item.classificacao === "DESCONTO_BLOQUEADO" || item.classificacao === "MARGEM_PROTEGIDA").length,
    descontosControlados: analises.filter((item) => item.classificacao === "DESCONTO_CONTROLADO").length,
    semCusto: analises.filter((item) => item.classificacao === "DADOS_INSUFICIENTES").length,
    precoCritico: analises.filter((item) => item.classificacao === "PRECO_CRITICO").length,
    porClassificacao: analises.reduce((acc, item) => {
      acc[item.classificacao] = (acc[item.classificacao] || 0) + 1;
      return acc;
    }, {}),
    itens: analises,
  };

  if (hasFlag("json")) {
    console.log(JSON.stringify(resumo, null, 2));
    return;
  }

  console.log("Analise de precificacao concluida.");
  console.log(`Produtos analisados: ${resumo.produtos}`);
  console.log(`Descontos bloqueados: ${resumo.descontosBloqueados}`);
  console.log(`Descontos controlados: ${resumo.descontosControlados}`);
  console.log(`Sem custo: ${resumo.semCusto}`);
  console.log(`Preco critico: ${resumo.precoCritico}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
