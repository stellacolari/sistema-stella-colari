import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MS_DIA = 24 * 60 * 60 * 1000;
const TAMANHO_TODOS = "TODOS";
const CONFIRMACAO = "GERAR_METRICAS_PRODUTO";
const TIPOS_INTENCAO_PRODUTO = [
  "PRODUTO_VISUALIZADO",
  "PRODUTO_FAVORITADO",
  "PRODUTO_DESFAVORITADO",
  "PRODUTO_ADICIONADO_CARRINHO",
  "PRODUTO_REMOVIDO_CARRINHO",
  "BUSCA_RESULTADO_CLICADO",
  "VITRINE_EDITORIAL_CLICADA",
  "BANNER_CTA_CLICADO",
  "CHECKOUT_INICIADO",
];

function numero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inteiro(value) {
  return Math.max(0, Math.round(numero(value)));
}

function round(value, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function pct(parte, total) {
  if (total <= 0) return 0;
  return Math.min(100, round((numero(parte) / numero(total)) * 100, 2));
}

function pctLimitado(value) {
  return Math.max(0, Math.min(100, round(value, 1)));
}

function somarIntencao(contagem) {
  return (
    inteiro(contagem.visualizacoes) +
    inteiro(contagem.favoritos) +
    inteiro(contagem.desfavoritos) +
    inteiro(contagem.adicoesCarrinho) +
    inteiro(contagem.remocoesCarrinho) +
    inteiro(contagem.cliquesBusca) +
    inteiro(contagem.cliquesVitrine) +
    inteiro(contagem.cliquesBanner) +
    inteiro(contagem.checkoutsIniciados)
  );
}

function montarIntencaoAgregada(contagem = {}, vendasQuantidade = 0, estoqueFinal = 0) {
  const base = {
    visualizacoes: inteiro(contagem.visualizacoes),
    favoritos: inteiro(contagem.favoritos),
    desfavoritos: inteiro(contagem.desfavoritos),
    adicoesCarrinho: inteiro(contagem.adicoesCarrinho),
    remocoesCarrinho: inteiro(contagem.remocoesCarrinho),
    cliquesBusca: inteiro(contagem.cliquesBusca),
    cliquesVitrine: inteiro(contagem.cliquesVitrine),
    cliquesBanner: inteiro(contagem.cliquesBanner),
    checkoutsIniciados: inteiro(contagem.checkoutsIniciados),
  };
  const eventosTotal = somarIntencao(base);
  const taxaFavorito = pct(base.favoritos, base.visualizacoes);
  const taxaCarrinho = pct(base.adicoesCarrinho, base.visualizacoes);
  const taxaConversao = pct(vendasQuantidade, base.visualizacoes);
  const scoreInteresse = pctLimitado(
    base.visualizacoes * 0.6 +
      base.cliquesBusca * 2.5 +
      base.favoritos * 4 +
      base.adicoesCarrinho * 6 +
      base.cliquesVitrine * 2 +
      base.cliquesBanner * 2.5 +
      base.checkoutsIniciados * 8 -
      base.desfavoritos * 2 -
      base.remocoesCarrinho * 2,
  );
  const scoreConversao =
    base.visualizacoes > 0
      ? pctLimitado(taxaConversao * 4 + Math.min(25, vendasQuantidade * 8))
      : vendasQuantidade > 0
        ? 70
        : 0;
  const amostra = eventosTotal + vendasQuantidade * 3;
  const confiancaAnalise = amostra >= 24 ? "ALTA" : amostra >= 7 ? "MEDIA" : "BAIXA";
  const intencaoForte = scoreInteresse >= 30 || base.adicoesCarrinho >= 2 || base.favoritos >= 3;
  const poucaExposicao = base.visualizacoes < 5 && eventosTotal < 5 && scoreInteresse < 10;
  let interpretacao =
    "Produto em observacao. Use venda, estoque e sinais de intencao antes de decidir reposicao.";

  if (vendasQuantidade === 0 && poucaExposicao) {
    interpretacao = "Produto pouco testado. Aumente exposicao antes de concluir que nao vende.";
  } else if (vendasQuantidade === 0 && intencaoForte) {
    interpretacao =
      "Produto com interesse, mas baixa conversao. Revise preco, fotos, descricao ou condicao.";
  } else if (estoqueFinal <= 1 && (vendasQuantidade > 0 || intencaoForte)) {
    interpretacao =
      "Produto promissor com estoque baixo. Considere reposicao pequena antes de aumentar trafego.";
  } else if (vendasQuantidade > 0 && scoreInteresse >= 20) {
    interpretacao = "Produto validado por venda e reforcado por sinais de interesse.";
  }

  return {
    ...base,
    eventosTotal,
    taxaFavorito,
    taxaCarrinho,
    taxaConversao,
    scoreInteresse,
    scoreConversao,
    confiancaAnalise,
    interpretacao,
  };
}

function normalizarTexto(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function normalizarTamanho(value) {
  const tamanho = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  return tamanho || "UNICO";
}

function diasEntre(inicio, fim) {
  return Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / MS_DIA));
}

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [rawKey, ...valueParts] = item.slice(2).split("=");
    args[rawKey] = valueParts.length > 0 ? valueParts.join("=") : true;
  }
  return args;
}

function periodoDoArgs(args) {
  const agora = new Date();
  const inicioAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const desde = args.desde ? new Date(`${args.desde}T00:00:00`) : null;
  const ate = args.ate ? new Date(`${args.ate}T23:59:59.999`) : null;

  return {
    periodoTipo: String(args.periodo || "atual").toUpperCase(),
    periodoInicio: desde && !Number.isNaN(desde.getTime()) ? desde : inicioAtual,
    periodoFim: ate && !Number.isNaN(ate.getTime()) ? ate : agora,
  };
}

function tipoMovimento(movimento) {
  const tipo = normalizarTexto(movimento.tipoMovimentacao);
  const status = normalizarTexto(movimento.status);

  if (status === "ESTORNADA") return "IGNORAR";
  if (tipo.includes("ESTORNO_VENDA")) return "ESTORNO_VENDA";
  if (tipo.includes("ESTORNO_COMPRA")) return "ESTORNO_COMPRA";
  if (tipo.startsWith("SAIDA")) return "SAIDA";
  if (tipo.startsWith("ENTRADA")) return "ENTRADA";
  if (tipo.includes("ADICAO")) return "ENTRADA";
  if (tipo.includes("EXCLUSAO")) return "ESTORNO_COMPRA";

  return "IGNORAR";
}

function custoVenda(movimento, produto) {
  return (
    numero(movimento.gastoProdutoPrincipal) ||
    numero(movimento.custo) ||
    numero(produto.custoBase) * inteiro(movimento.quantidade)
  );
}

function precoAtivo(produto) {
  if (produto.descontoAtivo && numero(produto.precoPromocional) > 0) {
    return numero(produto.precoPromocional);
  }
  return numero(produto.precoVenda);
}

function estoqueCusto(produto, tamanhoAnel) {
  const estoque = produto.estoque.find(
    (item) => normalizarTamanho(item.tamanhoAnel) === tamanhoAnel,
  );
  return numero(estoque?.custoMedio) || numero(produto.custoBase);
}

function criarCiclo(produto, tamanhoAnel, movimento, quantidadeInicial = 0, status = "ABERTO") {
  const custoMedio = estoqueCusto(produto, tamanhoAnel);
  return {
    produtoId: produto.id,
    variacaoId: null,
    tamanhoAnel,
    origemTipo: movimento?.origemTipo || null,
    origemId: movimento?.origemId || null,
    dataInicio: movimento?.criadoEm || new Date(),
    dataFim: null,
    quantidadeInicial: inteiro(quantidadeInicial),
    quantidadeEntrada: 0,
    quantidadeVendida: 0,
    quantidadeAtual: inteiro(quantidadeInicial),
    custoMedio,
    precoMedioVenda: precoAtivo(produto),
    receitaGerada: 0,
    margemEstimada: 0,
    sellThrough: 0,
    diasAtePrimeiraVenda: null,
    diasAteEsgotar: null,
    status,
    primeiraVendaEm: null,
    custoEntradaTotal: inteiro(quantidadeInicial) * custoMedio,
    custoVendidoTotal: 0,
  };
}

function finalizarCiclo(ciclo, dataFim = null) {
  const quantidadeBase = ciclo.quantidadeInicial + ciclo.quantidadeEntrada;
  ciclo.custoMedio =
    quantidadeBase > 0 ? round(ciclo.custoEntradaTotal / quantidadeBase, 4) : round(ciclo.custoMedio, 4);
  ciclo.precoMedioVenda =
    ciclo.quantidadeVendida > 0 ? round(ciclo.receitaGerada / ciclo.quantidadeVendida, 2) : round(ciclo.precoMedioVenda, 2);
  ciclo.margemEstimada = round(ciclo.receitaGerada - ciclo.custoVendidoTotal, 2);
  ciclo.sellThrough = pct(ciclo.quantidadeVendida, quantidadeBase);
  ciclo.diasAtePrimeiraVenda = ciclo.primeiraVendaEm ? diasEntre(ciclo.dataInicio, ciclo.primeiraVendaEm) : null;

  if (ciclo.quantidadeAtual <= 0 && ciclo.quantidadeVendida > 0) {
    ciclo.status = ciclo.status === "REPOSTO" ? "REPOSTO" : "ESGOTADO";
    ciclo.dataFim = dataFim || ciclo.dataFim || ciclo.primeiraVendaEm || new Date();
    ciclo.diasAteEsgotar = diasEntre(ciclo.dataInicio, ciclo.dataFim);
  } else if (dataFim) {
    ciclo.dataFim = dataFim;
  }

  const {
    primeiraVendaEm,
    custoEntradaTotal,
    custoVendidoTotal,
    ...persistivel
  } = ciclo;

  void primeiraVendaEm;
  void custoEntradaTotal;
  void custoVendidoTotal;

  return persistivel;
}

function agruparMovimentos(movimentos) {
  const grupos = new Map();
  for (const movimento of movimentos) {
    const tamanho = normalizarTamanho(movimento.tamanhoAnel);
    const atual = grupos.get(tamanho) || [];
    atual.push(movimento);
    grupos.set(tamanho, atual);
  }
  return grupos;
}

function reconstruirCiclosDoTamanho(produto, tamanhoAnel, movimentos) {
  const ciclos = [];
  let ciclo = null;

  function empurrar(status, dataFim) {
    if (!ciclo) return;
    ciclo.status = status;
    ciclos.push(finalizarCiclo(ciclo, dataFim));
    ciclo = null;
  }

  for (const movimento of movimentos) {
    const tipo = tipoMovimento(movimento);
    const quantidade = inteiro(movimento.quantidade);
    if (!quantidade || tipo === "IGNORAR") continue;

    if (tipo === "ENTRADA") {
      if (ciclo && ciclo.quantidadeVendida > 0 && ciclo.quantidadeAtual <= 1) {
        empurrar(ciclo.quantidadeAtual <= 0 ? "ESGOTADO" : "REPOSTO", movimento.criadoEm);
      }

      if (!ciclo) ciclo = criarCiclo(produto, tamanhoAnel, movimento);
      ciclo.quantidadeEntrada += quantidade;
      ciclo.quantidadeAtual += quantidade;
      ciclo.custoEntradaTotal += numero(movimento.custo);
      continue;
    }

    if (tipo === "SAIDA") {
      if (!ciclo) ciclo = criarCiclo(produto, tamanhoAnel, movimento, quantidade, "AJUSTADO");
      ciclo.quantidadeVendida += quantidade;
      ciclo.quantidadeAtual = Math.max(0, ciclo.quantidadeAtual - quantidade);
      ciclo.receitaGerada = round(ciclo.receitaGerada + numero(movimento.faturamento), 2);
      ciclo.custoVendidoTotal = round(ciclo.custoVendidoTotal + custoVenda(movimento, produto), 2);
      if (!ciclo.primeiraVendaEm) ciclo.primeiraVendaEm = movimento.criadoEm;
      if (ciclo.quantidadeAtual <= 0) {
        ciclo.status = "ESGOTADO";
        ciclo.dataFim = movimento.criadoEm;
      }
      continue;
    }

    if (tipo === "ESTORNO_VENDA") {
      if (!ciclo) ciclo = criarCiclo(produto, tamanhoAnel, movimento, 0, "AJUSTADO");
      ciclo.quantidadeVendida = Math.max(0, ciclo.quantidadeVendida - quantidade);
      ciclo.quantidadeAtual += quantidade;
      ciclo.receitaGerada = Math.max(0, round(ciclo.receitaGerada - numero(movimento.faturamento), 2));
      ciclo.custoVendidoTotal = Math.max(0, round(ciclo.custoVendidoTotal - custoVenda(movimento, produto), 2));
      ciclo.status = "AJUSTADO";
      continue;
    }

    if (tipo === "ESTORNO_COMPRA") {
      if (!ciclo) ciclo = criarCiclo(produto, tamanhoAnel, movimento, 0, "AJUSTADO");
      ciclo.quantidadeEntrada = Math.max(0, ciclo.quantidadeEntrada - quantidade);
      ciclo.quantidadeAtual = Math.max(0, ciclo.quantidadeAtual - quantidade);
      ciclo.custoEntradaTotal = Math.max(0, round(ciclo.custoEntradaTotal - numero(movimento.custo), 2));
      ciclo.status = "AJUSTADO";
    }
  }

  if (ciclo) ciclos.push(finalizarCiclo(ciclo));

  if (ciclos.length === 0) {
    const estoque = produto.estoque.find(
      (item) => normalizarTamanho(item.tamanhoAnel) === tamanhoAnel,
    );
    if (estoque && estoque.quantidadeAtual > 0) {
      ciclos.push(finalizarCiclo(criarCiclo(produto, tamanhoAnel, null, estoque.quantidadeAtual, "AJUSTADO")));
    }
  }

  return ciclos;
}

async function carregarMovimentos(produto) {
  return prisma.movimentacao.findMany({
    where: {
      codigoItem: produto.codigoInterno,
      itemTipo: "produto",
      status: {
        notIn: ["NA_LIXEIRA", "CANCELADA"],
      },
    },
    orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
  });
}

async function carregarIntencaoProduto(produtoId, periodo) {
  const eventos = await prisma.eventoComercial.groupBy({
    by: ["tipo"],
    where: {
      produtoId,
      criadoEm: {
        gte: periodo.periodoInicio,
        lte: periodo.periodoFim,
      },
      tipo: {
        in: TIPOS_INTENCAO_PRODUTO,
      },
    },
    _count: {
      _all: true,
    },
  });
  const porTipo = new Map(eventos.map((evento) => [evento.tipo, evento._count._all]));

  return {
    visualizacoes: porTipo.get("PRODUTO_VISUALIZADO") || 0,
    favoritos: porTipo.get("PRODUTO_FAVORITADO") || 0,
    desfavoritos: porTipo.get("PRODUTO_DESFAVORITADO") || 0,
    adicoesCarrinho: porTipo.get("PRODUTO_ADICIONADO_CARRINHO") || 0,
    remocoesCarrinho: porTipo.get("PRODUTO_REMOVIDO_CARRINHO") || 0,
    cliquesBusca: porTipo.get("BUSCA_RESULTADO_CLICADO") || 0,
    cliquesVitrine: porTipo.get("VITRINE_EDITORIAL_CLICADA") || 0,
    cliquesBanner: porTipo.get("BANNER_CTA_CLICADO") || 0,
    checkoutsIniciados: porTipo.get("CHECKOUT_INICIADO") || 0,
  };
}

async function reconstruirCiclosProduto(produto) {
  const movimentos = await carregarMovimentos(produto);
  const grupos = agruparMovimentos(movimentos);

  for (const estoque of produto.estoque) {
    const tamanho = normalizarTamanho(estoque.tamanhoAnel);
    if (!grupos.has(tamanho)) grupos.set(tamanho, []);
  }

  const ciclos = [...grupos.entries()]
    .flatMap(([tamanhoAnel, movimentosTamanho]) =>
      reconstruirCiclosDoTamanho(produto, tamanhoAnel, movimentosTamanho),
    )
    .sort((a, b) => a.tamanhoAnel.localeCompare(b.tamanhoAnel, "pt-BR") || a.dataInicio - b.dataInicio);

  return { ciclos, movimentos };
}

function classificarSnapshot({
  estoqueFinal,
  vendasQuantidade,
  sellThroughAcumulado,
  sellThroughPeriodo,
  diasSemVenda,
  ciclos,
  margemEstimada,
  intencao,
}) {
  const cicloAtual = [...ciclos].reverse().find((ciclo) => ciclo.status === "ABERTO" || ciclo.status === "AJUSTADO");
  const ciclosRapidos = ciclos.filter(
    (ciclo) => ciclo.quantidadeVendida >= 2 && ciclo.sellThrough >= 95 && (ciclo.diasAteEsgotar ?? 999) <= 15,
  ).length;
  const intencaoForte = intencao.scoreInteresse >= 30 || intencao.adicoesCarrinho >= 2 || intencao.favoritos >= 3;
  const intencaoRelevante =
    intencao.scoreInteresse >= 18 ||
    intencao.adicoesCarrinho >= 1 ||
    intencao.favoritos >= 2 ||
    intencao.cliquesBusca >= 3;
  const poucaExposicao = intencao.visualizacoes < 5 && intencao.eventosTotal < 5 && intencao.scoreInteresse < 10;

  if (estoqueFinal <= 1 && (vendasQuantidade > 0 || ciclosRapidos > 0 || intencaoForte)) return "RISCO_RUPTURA";
  if (ciclosRapidos >= 1 && ciclos.length >= 2 && vendasQuantidade > 0) return "REPOSICAO_CONFIRMADA";
  if (
    ciclosRapidos >= 1 ||
    (sellThroughAcumulado >= 80 && (vendasQuantidade > 0 || intencaoRelevante)) ||
    (vendasQuantidade >= 2 && intencaoForte && margemEstimada >= 0)
  ) {
    return "CAMPEAO_PROVAVEL";
  }
  if (vendasQuantidade === 0 && poucaExposicao) return "NAO_TESTADO";
  if (vendasQuantidade === 0 && intencaoForte) {
    return (diasSemVenda ?? 0) >= 30 ? "TRAVADO" : "INTERESSE_SEM_CONVERSAO";
  }
  if (vendasQuantidade > 0 || sellThroughPeriodo >= 35 || intencaoRelevante) return "PROMISSOR";
  if (
    estoqueFinal > 0 &&
    vendasQuantidade === 0 &&
    intencao.visualizacoes >= 10 &&
    intencao.scoreInteresse < 12 &&
    (diasSemVenda ?? 0) >= 60
  ) {
    return "ESTOQUE_PARADO";
  }
  if (estoqueFinal > 0 && cicloAtual && cicloAtual.quantidadeVendida === 0 && (diasSemVenda ?? 0) >= 45) return "TRAVADO";
  if (estoqueFinal > 0 && diasSemVenda !== null && diasSemVenda >= 45 && intencao.eventosTotal >= 5) return "NAO_RECOMPRAR_AINDA";
  return "NAO_TESTADO";
}

function scoreSnapshot({
  vendasQuantidade,
  sellThroughAcumulado,
  sellThroughPeriodo,
  giroEstimado,
  margemEstimada,
  estoqueFinal,
  ciclos,
  intencao,
}) {
  const cicloAtual = ciclos.at(-1);
  const ciclosRapidos = ciclos.filter(
    (ciclo) => ciclo.quantidadeVendida >= 2 && ciclo.sellThrough >= 95 && (ciclo.diasAteEsgotar ?? 999) <= 15,
  ).length;
  let score = 30;
  score += Math.min(30, sellThroughAcumulado * 0.3);
  score += Math.min(20, sellThroughPeriodo * 0.2);
  score += Math.min(16, giroEstimado * 4);
  score += Math.min(12, vendasQuantidade * 4);
  score += ciclosRapidos * 12;
  score += Math.min(18, intencao.scoreInteresse * 0.18);
  score += Math.min(8, intencao.scoreConversao * 0.08);
  if (margemEstimada < 0) score -= 18;
  if (estoqueFinal <= 1 && (vendasQuantidade > 0 || intencao.scoreInteresse >= 30)) score += 8;
  if (cicloAtual && cicloAtual.quantidadeVendida === 0 && cicloAtual.quantidadeAtual > 0) score -= 8;
  if (vendasQuantidade === 0 && intencao.scoreInteresse >= 30) score = Math.min(score, 68);
  return Math.max(0, Math.min(100, round(score, 1)));
}

function recomendar({ statusComercial, scoreValidacao, margemEstimada, cicloAtual, estoqueFinal, vendasQuantidade, ciclos, intencao }) {
  const ciclosRapidos = ciclos.filter(
    (ciclo) => ciclo.quantidadeVendida >= 2 && ciclo.sellThrough >= 95 && (ciclo.diasAteEsgotar ?? 999) <= 15,
  ).length;
  const intencaoForte = intencao.scoreInteresse >= 30 || intencao.adicoesCarrinho >= 2 || intencao.favoritos >= 3;
  const intencaoRelevante = intencao.scoreInteresse >= 18 || intencao.adicoesCarrinho >= 1 || intencao.favoritos >= 2;

  if (statusComercial === "ESTOQUE_PARADO") return "LIQUIDAR_COM_CUIDADO";
  if (statusComercial === "TRAVADO" || statusComercial === "INTERESSE_SEM_CONVERSAO") return "REVISAR_OFERTA";
  if (statusComercial === "NAO_TESTADO") return "EXPOR_MAIS";
  if (statusComercial === "NAO_RECOMPRAR_AINDA") return "NAO_REPOR";
  if (margemEstimada < 0 && scoreValidacao < 55) return "OBSERVAR";
  if (statusComercial === "REPOSICAO_CONFIRMADA") return scoreValidacao >= 85 && ciclosRapidos >= 2 ? "REPOR_LOTE_GRANDE" : "REPOR_LOTE_MEDIO";
  if (statusComercial === "RISCO_RUPTURA") {
    return scoreValidacao >= 75 && vendasQuantidade >= 2 && intencaoRelevante ? "REPOR_LOTE_MEDIO" : "REPOR_PEQUENO";
  }
  if (statusComercial === "CAMPEAO_PROVAVEL") return vendasQuantidade >= 2 && intencaoForte ? "REPOR_LOTE_MEDIO" : "REPOR_PEQUENO";
  if (statusComercial === "PROMISSOR") {
    if (estoqueFinal <= 1 && (vendasQuantidade > 0 || intencaoForte)) return "REPOR_PEQUENO";
    if (vendasQuantidade >= 1 && intencaoRelevante) return "REPOR_PEQUENO";
    return "OBSERVAR";
  }
  if (!cicloAtual || cicloAtual.quantidadeVendida === 0) return "EXPOR_MAIS";
  return estoqueFinal <= 1 ? "OBSERVAR" : "NAO_REPOR";
}

function montarSnapshot({ produto, tamanhoAnel, periodo, movimentos, ciclos, estoqueFinal, intencaoContagem }) {
  const movimentosPeriodo = movimentos.filter((mov) => mov.criadoEm >= periodo.periodoInicio && mov.criadoEm <= periodo.periodoFim);
  const vendas = movimentosPeriodo.filter((mov) => tipoMovimento(mov) === "SAIDA");
  const entradas = movimentosPeriodo.filter((mov) => ["ENTRADA", "ESTORNO_VENDA"].includes(tipoMovimento(mov)));
  const saidas = movimentosPeriodo.filter((mov) => ["SAIDA", "ESTORNO_COMPRA"].includes(tipoMovimento(mov)));
  const vendasQuantidade = vendas.reduce((total, mov) => total + inteiro(mov.quantidade), 0);
  const receita = round(vendas.reduce((total, mov) => total + numero(mov.faturamento), 0), 2);
  const custoEstimado = round(vendas.reduce((total, mov) => total + custoVenda(mov, produto), 0), 2);
  const margemEstimada = round(receita - custoEstimado, 2);
  const entradasQtd = entradas.reduce((total, mov) => total + inteiro(mov.quantidade), 0);
  const saidasQtd = saidas.reduce((total, mov) => total + inteiro(mov.quantidade), 0);
  const estoqueInicial = Math.max(0, estoqueFinal - entradasQtd + saidasQtd);
  const sellThroughPeriodo = pct(saidasQtd, estoqueInicial + entradasQtd);
  const baseCiclos = ciclos.reduce((total, ciclo) => total + ciclo.quantidadeInicial + ciclo.quantidadeEntrada, 0);
  const vendidoCiclos = ciclos.reduce((total, ciclo) => total + ciclo.quantidadeVendida, 0);
  const sellThroughAcumulado = pct(vendidoCiclos, baseCiclos);
  const diasPeriodo = Math.max(1, diasEntre(periodo.periodoInicio, periodo.periodoFim));
  const giroEstimado = round((vendasQuantidade / diasPeriodo) * 30, 2);
  const ultimaVenda = vendas.at(-1)?.criadoEm || null;
  const diasSemVenda = ultimaVenda ? diasEntre(ultimaVenda, periodo.periodoFim) : diasPeriodo;
  const intencao = montarIntencaoAgregada(intencaoContagem, vendasQuantidade, estoqueFinal);
  const scoreValidacao = scoreSnapshot({
    vendasQuantidade,
    sellThroughAcumulado,
    sellThroughPeriodo,
    giroEstimado,
    margemEstimada,
    estoqueFinal,
    ciclos,
    intencao,
  });
  const statusComercial = classificarSnapshot({
    estoqueFinal,
    vendasQuantidade,
    sellThroughAcumulado,
    sellThroughPeriodo,
    diasSemVenda,
    ciclos,
    margemEstimada,
    intencao,
  });
  const cicloAtual = [...ciclos].reverse().find((ciclo) => ciclo.status === "ABERTO" || ciclo.status === "AJUSTADO") || ciclos.at(-1) || null;
  const recomendacao = recomendar({
    statusComercial,
    scoreValidacao,
    margemEstimada,
    cicloAtual,
    estoqueFinal,
    vendasQuantidade,
    ciclos,
    intencao,
  });

  return {
    produtoId: produto.id,
    variacaoId: null,
    tamanhoAnel,
    periodoTipo: periodo.periodoTipo,
    periodoInicio: periodo.periodoInicio,
    periodoFim: periodo.periodoFim,
    vendasQuantidade,
    receita,
    custoEstimado,
    margemEstimada,
    estoqueInicial,
    estoqueFinal,
    entradas: entradasQtd,
    saidas: saidasQtd,
    sellThroughPeriodo,
    sellThroughAcumulado,
    giroEstimado,
    scoreValidacao,
    statusComercial,
    recomendacao,
    dadosJson: {
      ciclosConsiderados: ciclos.length,
      diasPeriodo,
      diasSemVenda,
      ultimaVendaEm: ultimaVenda?.toISOString() || null,
      intencaoComercial: {
        ...intencao,
        vendasQuantidade,
        estoqueFinal,
        periodoInicio: periodo.periodoInicio.toISOString(),
        periodoFim: periodo.periodoFim.toISOString(),
      },
      cicloAtual: cicloAtual
        ? {
            status: cicloAtual.status,
            sellThrough: cicloAtual.sellThrough,
            quantidadeVendida: cicloAtual.quantidadeVendida,
            quantidadeAtual: cicloAtual.quantidadeAtual,
          }
        : null,
    },
  };
}

function snapshotsProduto(produto, periodo, ciclos, movimentos, intencaoContagem) {
  const grupos = agruparMovimentos(movimentos);
  const estoquePorTamanho = new Map(
    produto.estoque.map((item) => [normalizarTamanho(item.tamanhoAnel), inteiro(item.quantidadeAtual)]),
  );
  for (const ciclo of ciclos) {
    if (!estoquePorTamanho.has(ciclo.tamanhoAnel)) {
      estoquePorTamanho.set(ciclo.tamanhoAnel, ciclo.quantidadeAtual);
    }
  }

  const snapshots = [...estoquePorTamanho.entries()].map(([tamanhoAnel, estoqueFinal]) =>
    montarSnapshot({
      produto,
      tamanhoAnel,
      periodo,
      movimentos: grupos.get(tamanhoAnel) || [],
      ciclos: ciclos.filter((ciclo) => ciclo.tamanhoAnel === tamanhoAnel),
      estoqueFinal,
      intencaoContagem,
    }),
  );

  if (snapshots.length > 1) {
    snapshots.unshift(
      montarSnapshot({
        produto,
        tamanhoAnel: TAMANHO_TODOS,
        periodo,
        movimentos,
        ciclos,
        estoqueFinal: [...estoquePorTamanho.values()].reduce((total, item) => total + item, 0),
        intencaoContagem,
      }),
    );
  }

  return snapshots;
}

async function salvarProduto(produto, periodo, reconstruirCiclos) {
  const { ciclos, movimentos } = await reconstruirCiclosProduto(produto);
  const intencaoContagem = await carregarIntencaoProduto(produto.id, periodo);
  const snapshots = snapshotsProduto(produto, periodo, ciclos, movimentos, intencaoContagem);

  if (reconstruirCiclos) {
    await prisma.produtoCicloEstoque.deleteMany({ where: { produtoId: produto.id } });
    if (ciclos.length > 0) {
      const atualizadoEm = new Date();
      await prisma.produtoCicloEstoque.createMany({
        data: ciclos.map((ciclo) => ({
          ...ciclo,
          atualizadoEm,
        })),
      });
    }
  }

  await prisma.produtoMetricaSnapshot.deleteMany({
    where:
      periodo.periodoTipo === "ATUAL"
        ? {
            produtoId: produto.id,
            periodoTipo: periodo.periodoTipo,
          }
        : {
            produtoId: produto.id,
            periodoTipo: periodo.periodoTipo,
            periodoInicio: periodo.periodoInicio,
            periodoFim: periodo.periodoFim,
          },
  });

  if (snapshots.length > 0) {
    await prisma.produtoMetricaSnapshot.createMany({ data: snapshots });
  }

  return { ciclos, snapshots };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.confirm !== CONFIRMACAO) {
    console.error(`Passe --confirm=${CONFIRMACAO} para gerar metricas persistidas.`);
    process.exitCode = 1;
    return;
  }

  const periodo = periodoDoArgs(args);
  const reconstruirCiclos = Boolean(args["reconstruir-ciclos"]);
  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      status: { not: "NA_LIXEIRA" },
    },
    include: {
      estoque: true,
    },
    orderBy: { nome: "asc" },
  });
  const resumo = {
    produtos: 0,
    ciclos: 0,
    snapshots: 0,
    produtosComEventos: 0,
    visualizacoes: 0,
    favoritos: 0,
    carrinhos: 0,
    interesseSemConversao: 0,
    naoTestados: 0,
    riscoRuptura: 0,
    status: new Map(),
    recomendacoes: new Map(),
  };

  console.log(
    `Gerando metricas de ${produtos.length} produto(s) no periodo ${periodo.periodoTipo} (${periodo.periodoInicio.toISOString()} - ${periodo.periodoFim.toISOString()})`,
  );

  for (const produto of produtos) {
    const { ciclos, snapshots } = await salvarProduto(produto, periodo, reconstruirCiclos);
    resumo.produtos += 1;
    resumo.ciclos += ciclos.length;
    resumo.snapshots += snapshots.length;

    for (const snapshot of snapshots) {
      if (snapshot.tamanhoAnel !== TAMANHO_TODOS && snapshots.some((item) => item.tamanhoAnel === TAMANHO_TODOS)) {
        continue;
      }
      const intencao = snapshot.dadosJson?.intencaoComercial || {};
      if ((intencao.eventosTotal || 0) > 0) resumo.produtosComEventos += 1;
      resumo.visualizacoes += inteiro(intencao.visualizacoes);
      resumo.favoritos += inteiro(intencao.favoritos);
      resumo.carrinhos += inteiro(intencao.adicoesCarrinho);
      if (snapshot.statusComercial === "INTERESSE_SEM_CONVERSAO" || snapshot.statusComercial === "TRAVADO") {
        resumo.interesseSemConversao += 1;
      }
      if (snapshot.statusComercial === "NAO_TESTADO") resumo.naoTestados += 1;
      if (snapshot.statusComercial === "RISCO_RUPTURA") resumo.riscoRuptura += 1;
      resumo.status.set(snapshot.statusComercial, (resumo.status.get(snapshot.statusComercial) || 0) + 1);
      resumo.recomendacoes.set(snapshot.recomendacao, (resumo.recomendacoes.get(snapshot.recomendacao) || 0) + 1);
    }
  }

  console.log("Resumo de metricas de produto");
  console.log(`- Produtos processados: ${resumo.produtos}`);
  console.log(`- Ciclos ${reconstruirCiclos ? "persistidos" : "calculados"}: ${resumo.ciclos}`);
  console.log(`- Snapshots persistidos: ${resumo.snapshots}`);
  console.log(`- Produtos com eventos: ${resumo.produtosComEventos}`);
  console.log(`- Total de visualizacoes: ${resumo.visualizacoes}`);
  console.log(`- Total de favoritos: ${resumo.favoritos}`);
  console.log(`- Total de carrinhos: ${resumo.carrinhos}`);
  console.log(`- Produtos com interesse sem conversao: ${resumo.interesseSemConversao}`);
  console.log(`- Produtos nao testados: ${resumo.naoTestados}`);
  console.log(`- Produtos em risco de ruptura: ${resumo.riscoRuptura}`);
  console.log("- Status comerciais:");
  for (const [status, total] of [...resumo.status.entries()].sort()) {
    console.log(`  ${status}: ${total}`);
  }
  console.log("- Recomendacoes:");
  for (const [recomendacao, total] of [...resumo.recomendacoes.entries()].sort()) {
    console.log(`  ${recomendacao}: ${total}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
