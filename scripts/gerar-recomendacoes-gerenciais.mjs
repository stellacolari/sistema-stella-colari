import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM_VALUE = "GERAR_RECOMENDACOES_STELLA";
const STATUS_ABERTOS = ["NOVA", "ACEITA", "EM_EXECUCAO"];

function parseArgs(argv) {
  const args = {
    periodo: "atual",
    confirm: "",
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg.startsWith("--periodo=")) {
      args.periodo = stripQuotes(arg.slice("--periodo=".length)) || args.periodo;
    } else if (arg.startsWith("--confirm=")) {
      args.confirm = stripQuotes(arg.slice("--confirm=".length));
    }
  }

  return args;
}

function stripQuotes(value) {
  const text = String(value ?? "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }

  return text;
}

function numero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function percent(parte, total) {
  if (!total) return 0;
  return round((numero(parte) / numero(total)) * 100, 2);
}

function monthFromArgs(periodo) {
  const now = new Date();
  const raw = String(periodo || "atual").toLowerCase();

  if (raw === "atual") {
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  }

  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error("Periodo invalido. Use --periodo=atual ou --periodo=YYYY-MM.");
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("Periodo invalido. Use --periodo=atual ou --periodo=YYYY-MM.");
  }

  return { mes, ano };
}

function periodFor(mes, ano) {
  return {
    inicio: new Date(ano, mes - 1, 1),
    fimExclusivo: new Date(ano, mes, 1),
    label: `${String(mes).padStart(2, "0")}/${ano}`,
  };
}

function normalizarTexto(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function codigoRecomendacao() {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `REC-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function intencaoFromSnapshot(snapshot) {
  const data = snapshot.dadosJson && typeof snapshot.dadosJson === "object"
    ? snapshot.dadosJson
    : {};
  const fonte = data.intencao || data.intencaoComercial || data;

  return {
    visualizacoes: numero(fonte.visualizacoes),
    favoritos: numero(fonte.favoritos),
    carrinhos: numero(fonte.adicoesCarrinho || fonte.carrinhos),
    scoreInteresse: numero(fonte.scoreInteresse),
    taxaConversao: numero(fonte.taxaConversao),
    interpretacao:
      fonte.interpretacao ||
      "Use venda, estoque e sinais de intencao antes de decidir recompra.",
  };
}

function avaliarEvidencia(evidencias) {
  const vendas = numero(evidencias.vendasQuantidade || evidencias.vendas);
  const sellThrough = numero(evidencias.sellThrough);
  const visualizacoes = numero(evidencias.visualizacoes);
  const favoritos = numero(evidencias.favoritos);
  const carrinhos = numero(evidencias.carrinhos);
  const cliquesBusca = numero(evidencias.cliquesBusca);
  const cliquesVitrine = numero(evidencias.cliquesVitrine);
  const scoreInteresse = numero(evidencias.scoreInteresse);
  const scoreValidacao = numero(evidencias.scoreValidacao);
  const estoqueFinal = numero(evidencias.estoqueFinal || evidencias.estoqueTotal);
  const quantidadeBase = numero(
    evidencias.quantidadeBase || numero(evidencias.estoqueInicial) + numero(evidencias.entradas),
  );
  const eventos =
    visualizacoes +
    favoritos +
    carrinhos +
    cliquesBusca +
    cliquesVitrine;
  const amostraPequena = quantidadeBase > 0 ? quantidadeBase <= 2 : vendas <= 1 && eventos < 5;
  const amostraMinima = quantidadeBase >= 3 || eventos >= 8 || vendas >= 2;
  const volumeForte = quantidadeBase >= 5 || vendas >= 3 || eventos >= 18;
  const temIntencao = favoritos > 0 || carrinhos > 0 || cliquesBusca >= 2 || cliquesVitrine >= 2;
  const intencaoForte = favoritos >= 3 || carrinhos >= 2 || scoreInteresse >= 35;

  if (
    (sellThrough >= 70 && volumeForte && (vendas >= 2 || temIntencao || estoqueFinal <= 1)) ||
    (vendas >= 3 && (temIntencao || sellThrough >= 50)) ||
    intencaoForte ||
    (scoreValidacao >= 80 && volumeForte) ||
    (estoqueFinal <= 1 && vendas >= 2 && temIntencao)
  ) {
    return "EVIDENCIA_FORTE";
  }

  if (
    (vendas >= 1 && (temIntencao || visualizacoes >= 8 || (sellThrough >= 35 && amostraMinima))) ||
    (sellThrough >= 35 && amostraMinima) ||
    visualizacoes >= 12 ||
    favoritos >= 1 ||
    carrinhos >= 1 ||
    cliquesBusca >= 2 ||
    cliquesVitrine >= 2 ||
    scoreInteresse >= 18 ||
    (scoreValidacao >= 45 && amostraMinima)
  ) {
    return "EVIDENCIA_MODERADA";
  }

  if (sellThrough > 0 || vendas > 0 || estoqueFinal > 0 || visualizacoes > 0 || amostraPequena) {
    return "EVIDENCIA_FRACA";
  }
  return "SEM_EVIDENCIA";
}

function pesoEvidencia(nivel) {
  if (nivel === "EVIDENCIA_FORTE") return 3;
  if (nivel === "EVIDENCIA_MODERADA") return 2;
  if (nivel === "EVIDENCIA_FRACA") return 1;
  return 0;
}

function evidenciaSuficiente(nivel, minimo) {
  return pesoEvidencia(nivel) >= pesoEvidencia(minimo);
}

function prioridadePorEvidencia(prioridade, nivel) {
  if (nivel === "EVIDENCIA_FORTE") return prioridade;
  if (nivel === "EVIDENCIA_MODERADA" && prioridade === "ALTA") return "MEDIA";
  if (nivel === "EVIDENCIA_FRACA") return "BAIXA";
  return prioridade;
}

function urgenciaReal(evidencias) {
  const vendas = numero(evidencias.vendasQuantidade || evidencias.vendas);
  const estoqueFinal = numero(evidencias.estoqueFinal || evidencias.estoqueTotal);
  const favoritos = numero(evidencias.favoritos);
  const carrinhos = numero(evidencias.carrinhos);
  const scoreInteresse = numero(evidencias.scoreInteresse);
  const statusComercial = String(evidencias.statusComercial || "");
  const demandaForte = carrinhos >= 2 || favoritos >= 3 || scoreInteresse >= 35 || vendas >= 3;

  return (
    (estoqueFinal <= 1 && (demandaForte || vendas >= 2)) ||
    (statusComercial === "RISCO_RUPTURA" && estoqueFinal <= 2 && (vendas > 0 || demandaForte))
  );
}

function limitarPrioridade(prioridade, nivel, evidencias) {
  const base = prioridadePorEvidencia(prioridade, nivel);
  if (base === "ALTA" && !urgenciaReal(evidencias)) return "MEDIA";
  return base;
}

function anexarEvidencia(evidencia, nivel) {
  const quantidadeBase = numero(
    evidencia.quantidadeBase || numero(evidencia.estoqueInicial) + numero(evidencia.entradas),
  );
  const eventos =
    numero(evidencia.visualizacoes) +
    numero(evidencia.favoritos) +
    numero(evidencia.carrinhos) +
    numero(evidencia.cliquesBusca) +
    numero(evidencia.cliquesVitrine);
  const vendas = numero(evidencia.vendasQuantidade || evidencia.vendas);
  const amostraPequena = quantidadeBase > 0 ? quantidadeBase <= 2 : vendas <= 1 && eventos < 5;
  const sinalInicial = nivel === "EVIDENCIA_FRACA" || (nivel === "EVIDENCIA_MODERADA" && amostraPequena);

  return {
    ...evidencia,
    quantidadeBase,
    amostraPequena,
    sinalInicial,
    nivelEvidencia: nivel,
    leituraEvidencia:
      nivel === "SEM_EVIDENCIA"
        ? "Produto ainda nao testado. Aumente exposicao antes de tomar decisao de preco, desconto ou reposicao."
        : nivel === "EVIDENCIA_FRACA"
          ? "Amostra ainda pequena; manter observacao e exposicao leve."
          : nivel === "EVIDENCIA_MODERADA"
            ? sinalInicial
              ? "Sinal inicial positivo; confirmar antes de elevar urgencia ou lote."
              : "Ha sinal real suficiente para recomendacao de baixa ou media prioridade."
            : "Ha sinal forte para acao seletiva.",
  };
}

async function criarOuAtualizar(candidato) {
  const where = {
    status: { in: STATUS_ABERTOS },
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
  const existentePorTitulo = existentes.find((item) => {
    const tituloExistente = normalizarTexto(item.titulo);
    return (
      tituloExistente === tituloNormalizado ||
      tituloExistente.includes(tituloNormalizado) ||
      tituloNormalizado.includes(tituloExistente)
    );
  });
  const existente = existentePorTitulo || existentes[0];
  const data = {
    tipo: candidato.tipo,
    titulo: candidato.titulo,
    descricao: candidato.descricao,
    motivo: candidato.motivo || null,
    evidenciasJson: candidato.evidenciasJson || undefined,
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

async function candidatosDeProdutos(periodoReferencia) {
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
    take: 100,
  });
  const porProduto = new Map();

  for (const snapshot of snapshotsRaw) {
    const atual = porProduto.get(snapshot.produtoId);
    if (!atual || snapshot.tamanhoAnel === "TODOS") {
      porProduto.set(snapshot.produtoId, snapshot);
    }
  }

  const candidatos = [];

  for (const snapshot of [...porProduto.values()].slice(0, 60)) {
    const produto = snapshot.produto;
    const intencao = intencaoFromSnapshot(snapshot);
    const evidencia = {
      produto: produto.codigoInterno,
      statusComercial: snapshot.statusComercial,
      recomendacao: snapshot.recomendacao,
      vendasQuantidade: snapshot.vendasQuantidade,
      estoqueInicial: snapshot.estoqueInicial,
      entradas: snapshot.entradas,
      estoqueFinal: snapshot.estoqueFinal,
      quantidadeBase: snapshot.estoqueInicial + snapshot.entradas,
      sellThrough: snapshot.sellThroughAcumulado,
      scoreValidacao: snapshot.scoreValidacao,
      visualizacoes: intencao.visualizacoes,
      favoritos: intencao.favoritos,
      carrinhos: intencao.carrinhos,
      scoreInteresse: intencao.scoreInteresse,
    };
    const nivelEvidencia = avaliarEvidencia(evidencia);
    const evidenciasJson = anexarEvidencia(evidencia, nivelEvidencia);
    const prioridadeReposicao = limitarPrioridade("ALTA", nivelEvidencia, evidencia);

    if (
      ["CAMPEAO_PROVAVEL", "RISCO_RUPTURA", "REPOSICAO_CONFIRMADA"].includes(
        snapshot.statusComercial,
      ) &&
      snapshot.estoqueFinal <= 3 &&
      evidenciaSuficiente(nivelEvidencia, "EVIDENCIA_MODERADA")
    ) {
      candidatos.push({
        tipo: "REPOSICAO",
        titulo:
          prioridadeReposicao === "ALTA"
            ? `Reposicao urgente: ${produto.nome}`
            : "Sinal inicial positivo: considerar reposicao pequena",
        descricao:
          prioridadeReposicao === "ALTA"
            ? `${produto.nome} tem demanda confirmada e estoque critico.`
            : `${produto.nome} teve bom giro inicial, mas a amostra ainda pede cautela.`,
        motivo:
          prioridadeReposicao === "ALTA"
            ? "Repor sem assumir lote grande automaticamente preserva caixa e evita ruptura."
            : "O produto teve bom giro inicial, mas a amostra ainda e pequena. Repor pouco evita ruptura sem assumir lote grande.",
        evidenciasJson,
        impactoEsperado: "Manter produto validado disponivel com risco controlado.",
        risco: "Sem reposicao seletiva, a vitrine pode perder produto com demanda.",
        prioridade: prioridadeReposicao,
        acaoSugerida: "Repor pequeno ou medio conforme caixa e ciclo confirmado.",
        linkAcao: "/compras/reposicao",
        origem: "Reposicao inteligente",
        origemTipo: "REPOSICAO_PRODUTO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (
      snapshot.vendasQuantidade <= 2 &&
      ["PROMISSOR", "CAMPEAO_PROVAVEL", "REPOSICAO_CONFIRMADA"].includes(
        snapshot.statusComercial,
      ) &&
      evidenciaSuficiente(nivelEvidencia, "EVIDENCIA_MODERADA")
    ) {
      candidatos.push({
        tipo: "REPOSICAO",
        titulo: `Compra com cautela: ${produto.nome}`,
        descricao:
          "Amostra curta nao libera lote grande. Uma venda de poucas pecas ainda pede cautela.",
        motivo: "Lote grande so deve aparecer com segundo ciclo confirmado ou padrao forte.",
        evidenciasJson,
        impactoEsperado: "Evitar estoque excessivo antes de validacao recorrente.",
        risco: "Comprar grande cedo demais pode travar caixa.",
        prioridade: "MEDIA",
        acaoSugerida: "Repor pequeno, expor mais e acompanhar novo ciclo.",
        linkAcao: "/compras/reposicao",
        origem: "Decisao de lote",
        origemTipo: "REPOSICAO_LOTE",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (
      (snapshot.statusComercial === "INTERESSE_SEM_CONVERSAO" ||
        snapshot.recomendacao === "REVISAR_OFERTA") &&
      evidenciaSuficiente(nivelEvidencia, "EVIDENCIA_MODERADA")
    ) {
      candidatos.push({
        tipo: "LOJA",
        titulo: `Revisar oferta: ${produto.nome}`,
        descricao: `${produto.nome} recebe interesse, mas precisa converter melhor antes de recompra.`,
        motivo: intencao.interpretacao,
        evidenciasJson,
        impactoEsperado: "Melhorar conversao sem aumentar compra no escuro.",
        risco: "Recomprar antes de ajustar oferta pode aumentar estoque parado.",
        prioridade: limitarPrioridade("ALTA", nivelEvidencia, evidencia),
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
      (snapshot.statusComercial === "NAO_TESTADO" ||
        snapshot.recomendacao === "EXPOR_MAIS") &&
      nivelEvidencia !== "SEM_EVIDENCIA"
    ) {
      candidatos.push({
        tipo: "LOJA",
        titulo: `Produto ainda nao testado: ${produto.nome}`,
        descricao: `${produto.nome} ainda precisa de amostra real antes de decisao comercial.`,
        motivo:
          "Produto ainda nao testado. Aumente exposicao antes de tomar decisao de preco, desconto ou reposicao.",
        evidenciasJson,
        impactoEsperado: "Gerar dados antes de comprar mais, descontar ou cortar.",
        risco: "Pouca exposicao pode levar a conclusao errada.",
        prioridade: "BAIXA",
        acaoSugerida: "Aumentar exposicao leve e observar novos sinais.",
        linkAcao: `/produtos/${produto.id}`,
        origem: "Intencao comercial",
        origemTipo: "INTENCAO_PRODUTO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }

    if (
      (snapshot.statusComercial === "ESTOQUE_PARADO" ||
        snapshot.recomendacao === "LIQUIDAR_COM_CUIDADO") &&
      evidenciaSuficiente(nivelEvidencia, "EVIDENCIA_MODERADA")
    ) {
      candidatos.push({
        tipo: "ESTOQUE",
        titulo: `Criar campanha controlada para ${produto.codigoInterno}`,
        descricao: `${produto.nome} deve girar antes de qualquer nova compra.`,
        motivo: "Estoque parado permite margem menor com objetivo claro de giro.",
        evidenciasJson,
        impactoEsperado: "Liberar caixa parado em estoque.",
        risco: "Recomprar item parado aumenta capital imobilizado.",
        prioridade: "MEDIA",
        acaoSugerida: "Testar kit, vitrine editorial ou desconto controlado.",
        linkAcao: `/produtos/${produto.id}`,
        origem: "Metricas de produto",
        origemTipo: "PRODUTO_ESTOQUE_PARADO",
        origemId: snapshot.id,
        produtoId: produto.id,
        periodoReferencia,
      });
    }
  }

  return candidatos;
}

async function candidatosFinanceiros(periodo, periodoReferencia) {
  const [marketing, gastos, vendasInternas, pedidosOnline] = await Promise.all([
    prisma.lancamentoFinanceiro.aggregate({
      where: {
        status: { not: "NA_LIXEIRA" },
        statusPagamento: "PAGO",
        tipo: { in: ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"] },
        dataPagamento: { gte: periodo.inicio, lt: periodo.fimExclusivo },
      },
      _sum: { valorReal: true },
    }),
    prisma.lancamentoFinanceiro.aggregate({
      where: {
        status: { not: "NA_LIXEIRA" },
        statusPagamento: "PAGO",
        dataPagamento: { gte: periodo.inicio, lt: periodo.fimExclusivo },
      },
      _sum: { valorReal: true },
    }),
    prisma.venda.aggregate({
      where: {
        status: "VENDA_FINALIZADA",
        criadoEm: { gte: periodo.inicio, lt: periodo.fimExclusivo },
      },
      _sum: { valorTotal: true, lucroTotal: true },
    }),
    prisma.pedidoOnline.aggregate({
      where: {
        statusPagamento: "PAGO",
        pagoEm: { gte: periodo.inicio, lt: periodo.fimExclusivo },
      },
      _sum: { valorPago: true },
    }),
  ]);
  const marketingValor = numero(marketing._sum.valorReal);
  const gastosValor = numero(gastos._sum.valorReal);
  const receita =
    numero(vendasInternas._sum.valorTotal) + numero(pedidosOnline._sum.valorPago);
  const lucroInterno = numero(vendasInternas._sum.lucroTotal);
  const marketingPct = percent(marketingValor, receita);
  const gastosPct = percent(gastosValor, receita);
  const candidatos = [];

  if (receita > 0 && marketingPct > 12) {
    candidatos.push({
      tipo: "MARKETING",
      titulo: "Revisar marketing pago do periodo",
      descricao:
        "Marketing pago esta acima da faixa que normalmente pede mais controle para a fase.",
      motivo: `${marketingPct}% da receita recebida no periodo foi para marketing pago.`,
      evidenciasJson: { marketingValor, receita, marketingPct },
      impactoEsperado: "Reduzir saida de caixa e medir campanha por produto.",
      risco: "Escalar trafego sem margem e reposicao pode pressionar caixa.",
      prioridade: marketingPct > 18 ? "ALTA" : "MEDIA",
      acaoSugerida: "Revisar campanhas, criativos e produtos anunciados.",
      linkAcao: "/compras/financeiro",
      origem: "Script de recomendacoes",
      origemTipo: "FINANCEIRO_MARKETING",
      periodoReferencia,
    });
  }

  if (receita > 0 && gastosPct > 35) {
    candidatos.push({
      tipo: "FINANCEIRO",
      titulo: "Rever gastos operacionais do periodo",
      descricao: "Gastos pagos estao altos frente a receita recebida.",
      motivo: `${gastosPct}% da receita foi consumida por lancamentos pagos.`,
      evidenciasJson: { gastosValor, receita, gastosPct, lucroInterno },
      impactoEsperado: "Preservar lucro e caixa para reposicao seletiva.",
      risco: "Gasto alto reduz margem de manobra nos proximos ciclos.",
      prioridade: gastosPct > 50 ? "ALTA" : "MEDIA",
      acaoSugerida: "Revisar gastos financeiros e recorrencias.",
      linkAcao: "/compras/gastos",
      origem: "Script de recomendacoes",
      origemTipo: "FINANCEIRO_GASTOS",
      periodoReferencia,
    });
  }

  return candidatos;
}

function deduplicarCandidatos(candidatos) {
  const vistos = new Set();

  return candidatos.filter((candidato) => {
    const chave = [
      candidato.tipo,
      candidato.origemTipo,
      candidato.origemId || "",
      candidato.produtoId || "",
      candidato.categoriaId || "",
      normalizarTexto(candidato.titulo),
    ].join("|");

    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.confirm !== CONFIRM_VALUE) {
    throw new Error(`Use --confirm=${CONFIRM_VALUE} para gerar recomendacoes.`);
  }

  const { mes, ano } = monthFromArgs(args.periodo);
  const periodo = periodFor(mes, ano);
  const candidatos = deduplicarCandidatos([
    ...(await candidatosFinanceiros(periodo, periodo.label)),
    ...(await candidatosDeProdutos(periodo.label)),
  ]);
  const criadas = [];
  const atualizadas = [];

  for (const candidato of candidatos) {
    const result = await criarOuAtualizar(candidato);
    if (result.criada) criadas.push(result.recomendacao);
    else atualizadas.push(result.recomendacao);
  }

  const totalAbertas = await prisma.recomendacaoGerencial.count({
    where: { status: { in: STATUS_ABERTOS } },
  });
  const result = {
    ok: true,
    periodoReferencia: periodo.label,
    candidatos: candidatos.length,
    criadas: criadas.length,
    atualizadas: atualizadas.length,
    totalAbertas,
    porTipo: candidatos.reduce((acc, candidato) => {
      acc[candidato.tipo] = (acc[candidato.tipo] || 0) + 1;
      return acc;
    }, {}),
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Recomendacoes gerenciais - ${periodo.label}`);
    console.log(`Candidatas: ${result.candidatos}`);
    console.log(`Criadas: ${result.criadas}`);
    console.log(`Atualizadas: ${result.atualizadas}`);
    console.log(`Abertas no total: ${result.totalAbertas}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
