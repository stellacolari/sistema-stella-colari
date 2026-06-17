import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATUS_RECOMENDACAO_ABERTA = ["NOVA", "ACEITA", "EM_EXECUCAO"];
const STATUS_CAMPANHA_ABERTA = ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"];
const CONFIRM_TOKEN = "GERAR_CAMPANHAS_STELLA";
const SIMULATION_MARKER = "[SIMULACAO_2_MESES_STELLA]";

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

function jsonRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
}

function adicionarDias(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data;
}

function codigoCampanha(tipo) {
  const data = new Date();
  const stamp = [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
    String(data.getHours()).padStart(2, "0"),
    String(data.getMinutes()).padStart(2, "0"),
    String(data.getSeconds()).padStart(2, "0"),
  ].join("");
  const aleatorio = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CMP-${normalizarTexto(tipo).toUpperCase()}-${stamp}-${aleatorio}`;
}

function avaliarTipoCampanha(recomendacao) {
  const texto = `${recomendacao.tipo} ${recomendacao.titulo} ${recomendacao.origemTipo}`.toUpperCase();
  const evidencias = jsonRecord(recomendacao.evidenciasJson);
  const statusComercial = String(evidencias.statusComercial || "").toUpperCase();
  const recomendacaoProduto = String(evidencias.recomendacao || "").toUpperCase();

  if (texto.includes("BUSCA") || recomendacao.origemTipo === "INTENCAO_BUSCA") return "BUSCA_SEM_RESULTADO";
  if (texto.includes("ESTOQUE PARADO") || statusComercial === "ESTOQUE_PARADO") return "GIRO_ESTOQUE";
  if (texto.includes("POUCO TESTADO") || recomendacaoProduto === "EXPOR_MAIS") return "EXPOSICAO";
  if (texto.includes("INTERESSE") || texto.includes("REVISAR OFERTA") || statusComercial === "INTERESSE_SEM_CONVERSAO") return "CONVERSAO";
  if (texto.includes("MARGEM") || recomendacao.tipo === "PRECIFICACAO") return "MARGEM";
  if (recomendacao.tipo === "REPOSICAO") return "REPOSICAO";
  if (recomendacao.tipo === "MARKETING" || texto.includes("MARKETING")) return "VALIDACAO";
  return "VALIDACAO";
}

function metasCampanha(tipo, evidencias) {
  return {
    visualizacoesEsperadas: Math.max(20, Math.ceil(numero(evidencias.visualizacoes) * 1.5)),
    favoritosEsperados: Math.max(2, Math.ceil(numero(evidencias.favoritos) + 2)),
    carrinhosEsperados: Math.max(1, Math.ceil(numero(evidencias.carrinhos) + 1)),
    vendasEsperadas: tipo === "EXPOSICAO" || tipo === "VALIDACAO" ? 0 : 1,
    taxaConversaoEsperada: tipo === "CONVERSAO" ? 2 : 1,
    limiteDesconto: ["GIRO_ESTOQUE", "CUPOM_CONTROLADO"].includes(tipo) ? 12 : 0,
    limiteOrcamento: tipo === "VALIDACAO" ? 0 : 150,
    margemMinima: tipo === "MARGEM" ? 55 : 40,
    riscoCaixa: tipo === "REPOSICAO" ? "Comprar pequeno antes de ampliar lote." : "Baixo, campanha nasce como plano.",
    cliquesVitrine: tipo === "EXPOSICAO" ? 10 : 5,
    cliquesBanner: 5,
    buscasRelacionadas: tipo === "BUSCA_SEM_RESULTADO" ? 5 : 0,
  };
}

function acoesCampanha(tipo) {
  const map = {
    EXPOSICAO: ["Destacar em vitrine editorial sem desconto.", "Publicar conteudo organico.", "Medir visualizacoes, favoritos e carrinhos."],
    VALIDACAO: ["Validar promessa com canais organicos.", "Evitar trafego pago no inicio.", "Medir cliques e carrinhos."],
    CONVERSAO: ["Revisar foto, descricao, preco, frete e condicao.", "Testar destaque sem desconto.", "Acompanhar carrinho e conversao."],
    GIRO_ESTOQUE: ["Planejar vitrine, combo ou cupom controlado.", "Definir limite de desconto.", "Separar itens parados de campeoes."],
    REPOSICAO: ["Planejar reposicao pequena.", "Evitar desconto com estoque baixo.", "Acompanhar ruptura e margem."],
    MARGEM: ["Proteger preco.", "Priorizar destaque editorial.", "Monitorar margem e estoque."],
    PRESENTE: ["Montar curadoria por ocasiao.", "Selecionar produtos com embalagem.", "Definir mensagem e periodo."],
    SAZONAL: ["Planejar calendario.", "Selecionar produtos com estoque.", "Preparar conteudo sem publicar automaticamente."],
    CUPOM_CONTROLADO: ["Criar proposta de cupom sem ativar.", "Limitar uso, prazo e margem.", "Usar em estoque parado."],
    BUSCA_SEM_RESULTADO: ["Criar tag, pagina ou colecao planejada.", "Avaliar compra futura.", "Ajustar termos sem publicar builder."],
  };
  return map[tipo] || map.VALIDACAO;
}

function contemDadoSimulado(recomendacao) {
  return [
    recomendacao.titulo,
    recomendacao.descricao,
    recomendacao.motivo,
    recomendacao.acaoSugerida,
    JSON.stringify(recomendacao.evidenciasJson || {}),
  ].some((item) => String(item || "").includes(SIMULATION_MARKER));
}

function candidatoDeRecomendacao(recomendacao) {
  const tipo = avaliarTipoCampanha(recomendacao);
  const evidencias = jsonRecord(recomendacao.evidenciasJson);
  const metas = metasCampanha(tipo, evidencias);
  const dadosSimulados = contemDadoSimulado(recomendacao);
  const descontoSugerido = ["GIRO_ESTOQUE", "CUPOM_CONTROLADO"].includes(tipo) ? 12 : 0;
  const duracao = tipo === "EXPOSICAO" || tipo === "VALIDACAO" ? 10 : 14;

  return {
    titulo: recomendacao.titulo.replace(/^Criar campanha para/i, "Campanha para"),
    objetivo: recomendacao.impactoEsperado || "Transformar recomendacao em plano comercial mensuravel.",
    tipo,
    origem: "RECOMENDACAO_GERENCIAL",
    recomendacaoId: recomendacao.id,
    produtoId: recomendacao.produtoId,
    categoriaId: recomendacao.categoriaId,
    descricao: recomendacao.descricao,
    estrategia: recomendacao.acaoSugerida || "Planejar acao comercial controlada sem publicar automaticamente.",
    publicoAlvo: "Clientes da loja com sinais de intencao e publico organico.",
    canalPrincipal: tipo === "BUSCA_SEM_RESULTADO" ? "Busca interna e curadoria" : tipo === "VALIDACAO" ? "Organico" : "Vitrine editorial",
    canaisJson: ["Vitrine editorial", "Organico", "Busca interna"],
    produtosJson: [
      {
        produtoId: recomendacao.produtoId,
        nome: recomendacao.produto?.nome || recomendacao.titulo,
        codigo: recomendacao.produto?.codigoInterno || null,
      },
    ],
    acoesJson: acoesCampanha(tipo),
    metasJson: {
      ...metas,
      confiancaAnalise: dadosSimulados ? "REDUZIDA_SIMULACAO" : "NORMAL",
      dadosSimulados,
    },
    riscosJson: [
      recomendacao.risco || "Executar campanha sem medir sinais pode gerar aprendizado fraco.",
      "Plano nao publica cupom, vitrine ou builder automaticamente.",
      ...(dadosSimulados
        ? ["Dados simulados reduzem a confianca da campanha; validar com sinais reais antes de escalar."]
        : []),
    ],
    orcamentoSugerido: tipo === "VALIDACAO" || tipo === "MARGEM" ? 0 : 150,
    descontoSugerido,
    cupomSugerido: descontoSugerido > 0 ? `PLANO-${normalizarTexto(recomendacao.codigo).toUpperCase()}` : null,
    dataInicioSugerida: adicionarDias(1),
    dataFimSugerida: adicionarDias(duracao),
  };
}

async function deduplicar(candidato) {
  const OR = [];
  if (candidato.recomendacaoId) OR.push({ recomendacaoId: candidato.recomendacaoId });
  if (candidato.produtoId) OR.push({ tipo: candidato.tipo, produtoId: candidato.produtoId });
  if (candidato.categoriaId) OR.push({ tipo: candidato.tipo, categoriaId: candidato.categoriaId });
  if (OR.length === 0) OR.push({ tipo: candidato.tipo, titulo: candidato.titulo });

  return prisma.campanhaComercial.findFirst({
    where: {
      status: { in: STATUS_CAMPANHA_ABERTA },
      OR,
    },
    orderBy: { criadoEm: "desc" },
  });
}

async function main() {
  if (argValue("confirm") !== CONFIRM_TOKEN) {
    throw new Error(`Use --confirm=${CONFIRM_TOKEN} para gerar campanhas.`);
  }

  const recomendacoes = await prisma.recomendacaoGerencial.findMany({
    where: {
      status: { in: STATUS_RECOMENDACAO_ABERTA },
      tipo: { in: ["LOJA", "REPOSICAO", "ESTOQUE", "PRECIFICACAO", "MARKETING"] },
    },
    include: {
      produto: {
        select: {
          id: true,
          nome: true,
          codigoInterno: true,
        },
      },
    },
    orderBy: [{ prioridade: "asc" }, { criadoEm: "desc" }],
    take: 80,
  });
  const candidatos = recomendacoes.map(candidatoDeRecomendacao);
  const criadas = [];
  const existentes = [];

  for (const candidato of candidatos) {
    const existente = await deduplicar(candidato);
    if (existente) {
      existentes.push(existente);
      continue;
    }

    criadas.push(
      await prisma.campanhaComercial.create({
        data: {
          codigo: codigoCampanha(candidato.tipo),
          ...candidato,
        },
      })
    );
  }

  const resumo = {
    ok: true,
    periodo: argValue("periodo", "atual"),
    candidatos: candidatos.length,
    criadas: criadas.length,
    existentes: existentes.length,
    totalAbertas: await prisma.campanhaComercial.count({
      where: { status: { in: STATUS_CAMPANHA_ABERTA } },
    }),
    porTipo: criadas.reduce((acc, campanha) => {
      acc[campanha.tipo] = (acc[campanha.tipo] || 0) + 1;
      return acc;
    }, {}),
  };

  if (hasFlag("json")) {
    console.log(JSON.stringify(resumo, null, 2));
  } else {
    console.log("Campanhas comerciais geradas.");
    console.log(`- Candidatos: ${resumo.candidatos}`);
    console.log(`- Criadas: ${resumo.criadas}`);
    console.log(`- Ja existentes: ${resumo.existentes}`);
    console.log(`- Abertas: ${resumo.totalAbertas}`);
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
