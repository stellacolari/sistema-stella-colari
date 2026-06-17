import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM_VALUE = "REVALIDAR_RECOMENDACOES_STELLA";
const STATUS_ABERTOS = ["NOVA", "ACEITA", "EM_EXECUCAO"];

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

function parseArgs(argv) {
  const args = {
    periodo: "atual",
    confirm: "",
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg.startsWith("--periodo=")) args.periodo = stripQuotes(arg.slice("--periodo=".length));
    else if (arg.startsWith("--confirm=")) args.confirm = stripQuotes(arg.slice("--confirm=".length));
  }

  return args;
}

function numero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function jsonRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizarTexto(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function intencaoFromSnapshot(snapshot) {
  const data = jsonRecord(snapshot?.dadosJson);
  const fonte = jsonRecord(data.intencao || data.intencaoComercial || data);

  return {
    visualizacoes: numero(fonte.visualizacoes),
    favoritos: numero(fonte.favoritos),
    carrinhos: numero(fonte.adicoesCarrinho || fonte.carrinhos),
    cliquesBusca: numero(fonte.cliquesBusca),
    cliquesVitrine: numero(fonte.cliquesVitrine),
    scoreInteresse: numero(fonte.scoreInteresse),
  };
}

function tamanhoAmostra(evidencias) {
  const quantidadeBase = numero(
    evidencias.quantidadeBase || numero(evidencias.estoqueInicial) + numero(evidencias.entradas),
  );
  const vendas = numero(evidencias.vendasQuantidade || evidencias.vendas);
  const visualizacoes = numero(evidencias.visualizacoes);
  const favoritos = numero(evidencias.favoritos);
  const carrinhos = numero(evidencias.carrinhos || evidencias.adicoesCarrinho);
  const cliquesBusca = numero(evidencias.cliquesBusca);
  const cliquesVitrine = numero(evidencias.cliquesVitrine);
  const eventos = visualizacoes + favoritos + carrinhos + cliquesBusca + cliquesVitrine;

  return {
    quantidadeBase,
    eventos,
    pequena: quantidadeBase > 0 ? quantidadeBase <= 2 : vendas <= 1 && eventos < 5,
    minimaAceitavel: quantidadeBase >= 3 || eventos >= 8 || vendas >= 2,
    volumeForte: quantidadeBase >= 5 || vendas >= 3 || eventos >= 18,
  };
}

function avaliarEvidencia(evidencias) {
  const vendas = numero(evidencias.vendasQuantidade || evidencias.vendas);
  const sellThrough = numero(evidencias.sellThrough || evidencias.sellThroughAcumulado);
  const visualizacoes = numero(evidencias.visualizacoes);
  const favoritos = numero(evidencias.favoritos);
  const carrinhos = numero(evidencias.carrinhos || evidencias.adicoesCarrinho);
  const cliquesBusca = numero(evidencias.cliquesBusca);
  const cliquesVitrine = numero(evidencias.cliquesVitrine);
  const scoreInteresse = numero(evidencias.scoreInteresse);
  const scoreValidacao = numero(evidencias.scoreValidacao);
  const estoqueFinal = numero(evidencias.estoqueFinal || evidencias.estoqueTotal);
  const amostra = tamanhoAmostra(evidencias);
  const temIntencao = favoritos > 0 || carrinhos > 0 || cliquesBusca >= 2 || cliquesVitrine >= 2;
  const intencaoForte = favoritos >= 3 || carrinhos >= 2 || scoreInteresse >= 35;

  if (
    (sellThrough >= 70 && amostra.volumeForte && (vendas >= 2 || temIntencao || estoqueFinal <= 1)) ||
    (vendas >= 3 && (temIntencao || sellThrough >= 50)) ||
    intencaoForte ||
    (scoreValidacao >= 80 && amostra.volumeForte) ||
    (estoqueFinal <= 1 && vendas >= 2 && temIntencao)
  ) {
    return "EVIDENCIA_FORTE";
  }

  if (
    (vendas >= 1 && (temIntencao || visualizacoes >= 8 || (sellThrough >= 35 && amostra.minimaAceitavel))) ||
    (sellThrough >= 35 && amostra.minimaAceitavel) ||
    visualizacoes >= 12 ||
    favoritos >= 1 ||
    carrinhos >= 1 ||
    cliquesBusca >= 2 ||
    cliquesVitrine >= 2 ||
    scoreInteresse >= 18 ||
    (scoreValidacao >= 45 && amostra.minimaAceitavel)
  ) {
    return "EVIDENCIA_MODERADA";
  }

  if (sellThrough > 0 || vendas > 0 || estoqueFinal > 0 || visualizacoes > 0) return "EVIDENCIA_FRACA";
  return "SEM_EVIDENCIA";
}

function pesoPrioridade(value) {
  if (value === "ALTA") return 0;
  if (value === "MEDIA") return 1;
  return 2;
}

function urgenciaReal(evidencias) {
  const vendas = numero(evidencias.vendasQuantidade || evidencias.vendas);
  const estoqueFinal = numero(evidencias.estoqueFinal || evidencias.estoqueTotal);
  const favoritos = numero(evidencias.favoritos);
  const carrinhos = numero(evidencias.carrinhos || evidencias.adicoesCarrinho);
  const scoreInteresse = numero(evidencias.scoreInteresse);
  const statusComercial = String(evidencias.statusComercial || "");
  const demandaForte = carrinhos >= 2 || favoritos >= 3 || scoreInteresse >= 35 || vendas >= 3;

  return (
    (estoqueFinal <= 1 && (demandaForte || vendas >= 2)) ||
    (statusComercial === "RISCO_RUPTURA" && estoqueFinal <= 2 && (vendas > 0 || demandaForte))
  );
}

function prioridadeRevalidada(prioridadeAtual, nivel, evidencias) {
  if (nivel === "SEM_EVIDENCIA" || nivel === "EVIDENCIA_FRACA") return "BAIXA";
  if (nivel === "EVIDENCIA_MODERADA") return prioridadeAtual === "BAIXA" ? "BAIXA" : "MEDIA";
  if (prioridadeAtual === "ALTA" && !urgenciaReal(evidencias)) return "MEDIA";
  return prioridadeAtual;
}

function anexarEvidencia(evidencias, nivel) {
  const amostra = tamanhoAmostra(evidencias);
  const sinalInicial = nivel === "EVIDENCIA_FRACA" || (nivel === "EVIDENCIA_MODERADA" && amostra.pequena);

  return {
    ...evidencias,
    quantidadeBase: amostra.quantidadeBase,
    amostraPequena: amostra.pequena,
    sinalInicial,
    nivelEvidencia: nivel,
    revalidada: true,
    revalidadaEm: new Date().toISOString(),
    leituraEvidencia:
      nivel === "SEM_EVIDENCIA"
        ? "Produto ainda nao testado. Aumente exposicao antes de tomar decisao de preco, desconto ou reposicao."
        : nivel === "EVIDENCIA_FRACA"
          ? "Amostra ainda pequena; manter observacao e exposicao leve."
          : sinalInicial
            ? "Sinal inicial positivo; confirmar antes de elevar urgencia ou lote."
            : nivel === "EVIDENCIA_MODERADA"
              ? "Ha sinal real suficiente para recomendacao de baixa ou media prioridade."
              : "Ha sinal forte para acao seletiva.",
  };
}

function tituloRevalidado(recomendacao, nivel, evidencias, prioridade) {
  const nome = recomendacao.produto?.nome || String(evidencias.produto || "").trim();
  const sinalInicial = nivel === "EVIDENCIA_FRACA" || Boolean(evidencias.sinalInicial || evidencias.amostraPequena);

  if (recomendacao.tipo === "REPOSICAO") {
    if (prioridade === "ALTA" && urgenciaReal(evidencias)) {
      return nome ? `Reposicao urgente: ${nome}` : recomendacao.titulo;
    }

    return "Sinal inicial positivo: considerar reposicao pequena";
  }

  if (recomendacao.tipo === "PRECIFICACAO" && /proteger margem/i.test(recomendacao.titulo)) {
    if (sinalInicial) return nome ? `Sinal inicial positivo: ${nome}` : "Sinal inicial positivo";
    return nome ? `Proteger margem: ${nome}` : recomendacao.titulo;
  }

  return recomendacao.titulo;
}

async function evidenciasAtuais(produtoId) {
  const snapshot = await prisma.produtoMetricaSnapshot.findFirst({
    where: { produtoId, periodoTipo: "ATUAL" },
    orderBy: [{ tamanhoAnel: "asc" }, { criadoEm: "desc" }],
  });

  if (!snapshot) return {};

  const intencao = intencaoFromSnapshot(snapshot);

  return {
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
    cliquesBusca: intencao.cliquesBusca,
    cliquesVitrine: intencao.cliquesVitrine,
    scoreInteresse: intencao.scoreInteresse,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.confirm !== CONFIRM_VALUE) {
    throw new Error(`Use --confirm=${CONFIRM_VALUE} para revalidar recomendacoes.`);
  }

  const abertas = await prisma.recomendacaoGerencial.findMany({
    where: { status: { in: STATUS_ABERTOS }, produtoId: { not: null } },
    include: { produto: { select: { codigoInterno: true, nome: true } } },
    orderBy: { criadoEm: "asc" },
  });
  const result = {
    ok: true,
    periodo: args.periodo,
    analisadas: abertas.length,
    revalidadas: 0,
    rebaixadas: 0,
    adiadas: 0,
    duplicadasAdiadas: 0,
    porNivel: {},
  };

  for (const recomendacao of abertas) {
    const evidencias = {
      ...jsonRecord(recomendacao.evidenciasJson),
      ...(await evidenciasAtuais(recomendacao.produtoId)),
      produto: recomendacao.produto?.codigoInterno,
    };
    const nivel = avaliarEvidencia(evidencias);
    const evidenciasJson = anexarEvidencia(evidencias, nivel);
    const prioridade = prioridadeRevalidada(recomendacao.prioridade, nivel, evidenciasJson);
    const data = {
      evidenciasJson,
      prioridade,
      titulo: tituloRevalidado(recomendacao, nivel, evidenciasJson, prioridade),
    };

    if (nivel === "SEM_EVIDENCIA" && recomendacao.status === "NOVA") {
      data.status = "ADIADA";
      data.motivo = "Recomendacao revalidada: nao ha evidencia atual suficiente para acao por produto.";
      data.descricao = "A recomendacao foi mantida como historico, mas saiu da leitura de urgencia ate surgirem sinais reais.";
    } else if (nivel === "EVIDENCIA_FRACA" || evidenciasJson.sinalInicial) {
      data.motivo = "Sinal inicial positivo, mas a amostra ainda precisa de confirmacao antes de recompra, desconto ou campanha.";
      data.descricao = "Este produto tem sinal inicial positivo, mas ainda precisa de confirmacao antes de uma recompra maior.";
    }

    await prisma.recomendacaoGerencial.update({
      where: { id: recomendacao.id },
      data,
    });

    result.revalidadas += 1;
    result.porNivel[nivel] = (result.porNivel[nivel] || 0) + 1;
    if (pesoPrioridade(prioridade) > pesoPrioridade(recomendacao.prioridade)) result.rebaixadas += 1;
    if (data.status === "ADIADA") result.adiadas += 1;
  }

  const revalidadasAbertas = await prisma.recomendacaoGerencial.findMany({
    where: {
      status: { in: STATUS_ABERTOS },
      produtoId: { not: null },
    },
    orderBy: [{ prioridade: "asc" }, { atualizadoEm: "desc" }],
  });
  const vistas = new Set();

  for (const recomendacao of revalidadasAbertas) {
    const evidencias = jsonRecord(recomendacao.evidenciasJson);
    if (!evidencias.revalidada) continue;

    const chave = [
      recomendacao.produtoId,
      recomendacao.tipo,
      normalizarTexto(recomendacao.titulo),
    ].join("|");

    if (!vistas.has(chave)) {
      vistas.add(chave);
      continue;
    }

    await prisma.recomendacaoGerencial.update({
      where: { id: recomendacao.id },
      data: {
        status: "ADIADA",
        motivo:
          "Recomendacao revalidada e adiada por duplicidade aberta para o mesmo produto e tipo.",
        observacao:
          "Historico preservado; a tela principal deve acompanhar a recomendacao aberta mais recente/representativa.",
        evidenciasJson: {
          ...evidencias,
          revalidada: true,
          duplicadaRevalidada: true,
          revalidadaEm: new Date().toISOString(),
        },
      },
    });
    result.duplicadasAdiadas += 1;
    result.adiadas += 1;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Recomendacoes abertas analisadas: ${result.analisadas}`);
    console.log(`Revalidadas: ${result.revalidadas}`);
    console.log(`Rebaixadas: ${result.rebaixadas}`);
    console.log(`Adiadas: ${result.adiadas}`);
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
