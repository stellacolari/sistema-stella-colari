import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIRM = "GERAR_VITRINES_STELLA";
const STATUS_ABERTOS = ["SUGERIDA", "EM_REVISAO"];
const STATUS_CAMPANHA_ABERTA = ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"];
const STATUS_RECOMENDACAO_ABERTA = ["NOVA", "ACEITA", "EM_EXECUCAO"];

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function numero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
}

function codigoVitrine(tipo) {
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
  return `VIT-${normalizarTexto(tipo).toUpperCase()}-${stamp}-${aleatorio}`;
}

function produtosFromJson(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item?.produtoId || item?.id || "")
    .filter(Boolean)
    .sort();
}

function mesmaLista(a, b) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function campanhaProdutosIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item?.produtoId).filter(Boolean);
}

function getPrimeiraImagem(produto) {
  return produto.imagemUrl || produto.imagemHoverUrl || "";
}

function montarTexto(tipo, produtos) {
  const primeiraCategoria = produtos[0]?.categoria || "selecionadas";
  const textos = {
    PRODUTOS_POUCO_TESTADOS: ["Pecas para conhecer", "Uma selecao para dar mais leitura a produtos com pouca amostra."],
    ALTA_INTENCAO: ["Joias com sinais de interesse", "Produtos que receberam atencao recente e merecem destaque sem pressa."],
    CAMPEOES_PROVAVEIS: ["Escolhas em destaque", "Pecas com bom desempenho para manter visibilidade sem queimar margem."],
    ESTOQUE_PARADO: ["Curadoria da semana", "Produtos que podem ganhar nova leitura com exposicao editorial."],
    CAMPANHA_COMERCIAL: ["Selecao especial", `Curadoria conectada a campanha comercial de ${primeiraCategoria}.`],
    MARGEM_PROTEGIDA: ["Favoritos em observacao", "Itens para destacar com cuidado de margem e estoque."],
    BUSCA_RECORRENTE: ["Escolhas relacionadas a sua busca", "Produtos conectados aos termos mais procurados na loja."],
    GIRO_CONTROLADO: ["Selecao para redescobrir", "Itens com estoque disponivel para trabalhar giro sem desconto automatico."],
  };
  const [titulo, subtitulo] = textos[tipo] || ["Selecao especial", "Curadoria sugerida para a loja."];
  return { titulo, subtitulo };
}

function scoreProduto(produto, tipo) {
  let score = 0;
  score += Math.min(produto.scoreInteresse, 60);
  score += Math.min(produto.visualizacoes * 1.5, 25);
  score += Math.min(produto.favoritos * 4, 20);
  score += Math.min(produto.adicoesCarrinho * 5, 25);
  score += Math.min(produto.margemBrutaPct / 2, 30);
  score += Math.min(produto.estoqueTotal * 1.5, 18);
  if (produto.imagemUrl || produto.imagemHoverUrl) score += 18;
  if (produto.estoqueTotal <= 0) score -= 100;
  if (produto.classificacaoPrecificacao === "DADOS_INSUFICIENTES") score -= 20;
  if (tipo === "PRODUTOS_POUCO_TESTADOS" && produto.vendasQuantidade === 0) score += 18;
  if (tipo === "ALTA_INTENCAO") score += produto.scoreInteresse * 1.2;
  if (tipo === "CAMPEOES_PROVAVEIS" && produto.statusComercial === "CAMPEAO_PROVAVEL") score += 35;
  if (["ESTOQUE_PARADO", "GIRO_CONTROLADO"].includes(tipo) && produto.statusComercial === "ESTOQUE_PARADO") score += 35;
  if (tipo === "MARGEM_PROTEGIDA" && produto.classificacaoPrecificacao === "MARGEM_PROTEGIDA") score += 35;
  return score;
}

function selecionarProdutos(produtos, tipo, limite = 5) {
  const temImagem = produtos.some((produto) => produto.imagemUrl || produto.imagemHoverUrl);
  return produtos
    .filter((produto) => produto.estoqueTotal > 0)
    .filter((produto) => (temImagem ? Boolean(produto.imagemUrl || produto.imagemHoverUrl) : true))
    .filter((produto) => {
      if (["CAMPANHA_COMERCIAL", "GIRO_CONTROLADO"].includes(tipo)) {
        return produto.classificacaoPrecificacao !== "DESCONTO_BLOQUEADO";
      }
      return produto.classificacaoPrecificacao !== "DADOS_INSUFICIENTES";
    })
    .map((produto) => ({ produto, score: scoreProduto(produto, tipo) }))
    .sort((a, b) => b.score - a.score || a.produto.nome.localeCompare(b.produto.nome, "pt-BR"))
    .slice(0, limite)
    .map((item) => item.produto);
}

function montarConfig(candidato) {
  const produtos = candidato.produtos.slice(0, 5);
  const quantidadeItens = Math.min(Math.max(produtos.length, 3), 5);
  const itens = Array.from({ length: quantidadeItens }, (_, index) => {
    const produto = produtos[index];
    return {
      id: `vitrine-inteligente-${index + 1}`,
      tipoLink: "URL_PERSONALIZADA",
      categoriaId: "",
      categoriaSlug: "",
      categoriaNome: produto?.categoria || "",
      categoriaImagemUrl: "",
      paginaId: "",
      paginaSlug: "",
      paginaTitulo: "",
      linkUrl: produto ? `/loja/produto/${produto.id}` : "",
      label: produto?.nome || "",
      textoBotao: "Ver peca",
      imagemDesktop: produto ? getPrimeiraImagem(produto) : "",
      imagemMobile: produto ? getPrimeiraImagem(produto) : "",
      altText: produto?.nome || "",
      focoHorizontal: 50,
      focoVertical: 50,
      zoom: 100,
      ocultarNome: false,
      ocultarBotao: false,
      abrirNovaAba: false,
    };
  });
  return {
    quantidadeItens,
    alturaVisual: quantidadeItens >= 4 ? "COMPACTA" : "PADRAO",
    animacaoBloco: "SUBINDO_EM_SEQUENCIA",
    origemSugestao: candidato.origem,
    tipoSugestao: candidato.tipo,
    tituloSugerido: candidato.titulo,
    subtituloSugerido: candidato.subtitulo || "",
    statusRascunho: true,
    itens,
  };
}

function serializarProduto(produto) {
  return {
    produtoId: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.nome,
    categoria: produto.categoria,
    imagemUrl: getPrimeiraImagem(produto),
    precoVenda: produto.precoVenda,
    estoqueTotal: produto.estoqueTotal,
    visualizacoes: produto.visualizacoes,
    favoritos: produto.favoritos,
    adicoesCarrinho: produto.adicoesCarrinho,
    scoreInteresse: produto.scoreInteresse,
    statusComercial: produto.statusComercial,
    classificacaoPrecificacao: produto.classificacaoPrecificacao,
    margemBrutaPct: produto.margemBrutaPct,
  };
}

async function montarProdutosBase() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, status: { not: "NA_LIXEIRA" } },
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      categoria: true,
      imagemUrl: true,
      imagemHoverUrl: true,
      precoVenda: true,
      precoPromocional: true,
      descontoAtivo: true,
      custoBase: true,
      estoque: { select: { quantidadeAtual: true, custoMedio: true } },
      metricasSnapshots: {
        orderBy: { periodoFim: "desc" },
        take: 1,
        select: {
          vendasQuantidade: true,
          sellThroughPeriodo: true,
          statusComercial: true,
          dadosJson: true,
        },
      },
    },
    orderBy: { nome: "asc" },
  });

  return produtos.map((produto) => {
    const snapshot = produto.metricasSnapshots[0];
    const dados = snapshot?.dadosJson && typeof snapshot.dadosJson === "object" ? snapshot.dadosJson : {};
    const estoqueTotal = produto.estoque.reduce((total, item) => total + item.quantidadeAtual, 0);
    const precoAtual = produto.descontoAtivo && produto.precoPromocional ? produto.precoPromocional : produto.precoVenda;
    const custo = produto.estoque.find((item) => item.custoMedio > 0)?.custoMedio || produto.custoBase || 0;
    const margemBrutaPct = precoAtual > 0 ? ((precoAtual - custo) / precoAtual) * 100 : 0;
    const classificacaoPrecificacao =
      custo <= 0
        ? "DADOS_INSUFICIENTES"
        : margemBrutaPct >= 55
          ? "MARGEM_PROTEGIDA"
          : margemBrutaPct < 25
            ? "PRECO_CRITICO"
            : "DESCONTO_BLOQUEADO";

    return {
      id: produto.id,
      codigoInterno: produto.codigoInterno,
      nome: produto.nome,
      categoria: produto.categoria,
      imagemUrl: produto.imagemUrl,
      imagemHoverUrl: produto.imagemHoverUrl,
      precoVenda: numero(produto.precoVenda),
      precoPromocional: produto.precoPromocional,
      descontoAtivo: produto.descontoAtivo,
      estoqueTotal,
      visualizacoes: numero(dados.visualizacoes),
      favoritos: numero(dados.favoritos),
      adicoesCarrinho: numero(dados.adicoesCarrinho),
      vendasQuantidade: numero(snapshot?.vendasQuantidade),
      scoreInteresse: numero(dados.scoreInteresse),
      taxaConversao: numero(dados.taxaConversao),
      statusComercial: snapshot?.statusComercial || "NAO_TESTADO",
      sellThroughPeriodo: numero(snapshot?.sellThroughPeriodo),
      classificacaoPrecificacao,
      descontoPermitido: classificacaoPrecificacao !== "DESCONTO_BLOQUEADO",
      margemBrutaPct: Math.round(margemBrutaPct * 100) / 100,
    };
  });
}

function candidatosProduto(produtos) {
  const regras = [
    {
      tipo: "PRODUTOS_POUCO_TESTADOS",
      produtos: produtos.filter((produto) => produto.statusComercial === "NAO_TESTADO" || (produto.visualizacoes <= 8 && produto.vendasQuantidade === 0)),
      justificativa: "Produtos com pouca amostra precisam de exposicao antes de qualquer decisao dura.",
    },
    {
      tipo: "ALTA_INTENCAO",
      produtos: produtos.filter((produto) => produto.scoreInteresse >= 18 || produto.favoritos >= 2 || produto.adicoesCarrinho >= 1),
      justificativa: "Produtos com interesse recente podem converter melhor com vitrine editorial.",
    },
    {
      tipo: "CAMPEOES_PROVAVEIS",
      produtos: produtos.filter((produto) => produto.statusComercial === "CAMPEAO_PROVAVEL" || produto.sellThroughPeriodo >= 35),
      justificativa: "Campeoes provaveis merecem destaque sem incentivo automatico de desconto.",
    },
    {
      tipo: "ESTOQUE_PARADO",
      produtos: produtos.filter((produto) => produto.statusComercial === "ESTOQUE_PARADO" || (produto.estoqueTotal >= 2 && produto.visualizacoes >= 8 && produto.taxaConversao <= 0)),
      justificativa: "Estoque parado pode ganhar nova leitura em vitrine especifica.",
    },
    {
      tipo: "MARGEM_PROTEGIDA",
      produtos: produtos.filter((produto) => produto.classificacaoPrecificacao === "MARGEM_PROTEGIDA" || (!produto.descontoPermitido && produto.scoreInteresse >= 15)),
      justificativa: "Produtos com margem protegida devem receber exposicao, nao desconto automatico.",
    },
  ];

  return regras.flatMap((regra) => {
    const selecionados = selecionarProdutos(regra.produtos, regra.tipo, 5);
    if (selecionados.length === 0) return [];
    const texto = montarTexto(regra.tipo, selecionados);
    return [{
      ...texto,
      descricao: regra.justificativa,
      tipo: regra.tipo,
      origem: "METRICAS_PRODUTO",
      produtoId: selecionados[0]?.id || null,
      categoriaId: null,
      produtos: selecionados,
      criterios: { tipo: regra.tipo },
      metricas: { produtosConsiderados: regra.produtos.length, produtosSelecionados: selecionados.length },
      justificativa: regra.justificativa,
      risco: "Validar imagens e posicionamento antes de ativar na loja publica.",
      acaoSugerida: "Aplicar como rascunho inativo e revisar no editor visual.",
    }];
  });
}

async function salvar(candidato) {
  if (!candidato.produtos.length) return { tipo: "ignorada" };
  const ids = candidato.produtos.map((produto) => produto.id).sort();
  const existentes = await prisma.vitrineInteligenteSugestao.findMany({
    where: {
      tipo: candidato.tipo,
      status: { in: STATUS_ABERTOS },
      ...(candidato.campanhaId ? { campanhaId: candidato.campanhaId } : {}),
      ...(candidato.recomendacaoId ? { recomendacaoId: candidato.recomendacaoId } : {}),
    },
  });
  const existente = existentes.find((sugestao) => mesmaLista(ids, produtosFromJson(sugestao.produtosJson)));
  const produtosJson = candidato.produtos.map(serializarProduto);
  const configBlocoJson = montarConfig(candidato);

  if (existente) {
    const sugestao = await prisma.vitrineInteligenteSugestao.update({
      where: { id: existente.id },
      data: {
        titulo: candidato.titulo,
        subtitulo: candidato.subtitulo,
        descricao: candidato.descricao,
        produtosJson,
        criteriosJson: candidato.criterios,
        configBlocoJson,
        metricasJson: candidato.metricas,
        justificativa: candidato.justificativa,
        risco: candidato.risco,
        acaoSugerida: candidato.acaoSugerida,
      },
    });
    return { tipo: "atualizada", sugestao };
  }

  const sugestao = await prisma.vitrineInteligenteSugestao.create({
    data: {
      codigo: codigoVitrine(candidato.tipo),
      titulo: candidato.titulo,
      subtitulo: candidato.subtitulo,
      descricao: candidato.descricao,
      tipo: candidato.tipo,
      status: "SUGERIDA",
      origem: candidato.origem,
      campanhaId: candidato.campanhaId || null,
      recomendacaoId: candidato.recomendacaoId || null,
      produtoId: candidato.produtoId || candidato.produtos[0]?.id || null,
      categoriaId: candidato.categoriaId || null,
      produtosJson,
      criteriosJson: candidato.criterios,
      configBlocoJson,
      metricasJson: candidato.metricas,
      justificativa: candidato.justificativa,
      risco: candidato.risco,
      acaoSugerida: candidato.acaoSugerida,
    },
  });
  return { tipo: "criada", sugestao };
}

async function main() {
  if (argValue("confirm") !== CONFIRM) {
    throw new Error(`Use --confirm=${CONFIRM} para gerar vitrines inteligentes.`);
  }

  const produtos = await montarProdutosBase();
  const [campanhas, recomendacoes] = await Promise.all([
    prisma.campanhaComercial.findMany({
      where: { status: { in: STATUS_CAMPANHA_ABERTA }, tipo: { in: ["EXPOSICAO", "CONVERSAO", "GIRO_ESTOQUE", "MARGEM"] } },
      orderBy: { criadoEm: "desc" },
      take: 20,
    }),
    prisma.recomendacaoGerencial.findMany({
      where: { status: { in: STATUS_RECOMENDACAO_ABERTA }, OR: [{ produtoId: { not: null } }, { origemTipo: "INTENCAO_BUSCA" }] },
      orderBy: { criadoEm: "desc" },
      take: 30,
    }),
  ]);
  const candidatos = [...candidatosProduto(produtos)];

  for (const campanha of campanhas) {
    const ids = new Set([campanha.produtoId, ...campanhaProdutosIds(campanha.produtosJson)].filter(Boolean));
    const base = produtos.filter((produto) => ids.has(produto.id));
    const tipo = campanha.tipo === "GIRO_ESTOQUE" ? "GIRO_CONTROLADO" : campanha.tipo === "MARGEM" ? "MARGEM_PROTEGIDA" : "CAMPANHA_COMERCIAL";
    const selecionados = selecionarProdutos(base.length ? base : produtos, tipo, 5);
    if (!selecionados.length) continue;
    const texto = montarTexto(tipo, selecionados);
    candidatos.push({
      ...texto,
      descricao: `Sugestao criada a partir da campanha ${campanha.titulo}.`,
      tipo,
      origem: "CAMPANHA_COMERCIAL",
      campanhaId: campanha.id,
      produtoId: campanha.produtoId,
      categoriaId: campanha.categoriaId,
      produtos: selecionados,
      criterios: { campanhaTipo: campanha.tipo, objetivo: campanha.objetivo, descontoSugerido: campanha.descontoSugerido },
      metricas: { produtosSelecionados: selecionados.length },
      justificativa: "Campanha aberta com produtos que podem receber exposicao editorial sem publicacao automatica.",
      risco: "Revisar texto, imagens e margem antes de ativar o bloco.",
      acaoSugerida: "Aplicar como rascunho no builder e revisar manualmente antes de publicar.",
    });
  }

  for (const recomendacao of recomendacoes) {
    const produtoBase = recomendacao.produtoId ? produtos.find((produto) => produto.id === recomendacao.produtoId) : null;
    const tipo = recomendacao.origemTipo === "INTENCAO_BUSCA" ? "BUSCA_RECORRENTE" : recomendacao.tipo === "PRECIFICACAO" ? "MARGEM_PROTEGIDA" : recomendacao.tipo === "REPOSICAO" ? "CAMPEOES_PROVAVEIS" : "ALTA_INTENCAO";
    const base = produtoBase ? produtos.filter((produto) => produto.id === produtoBase.id || produto.categoria === produtoBase.categoria) : produtos;
    const selecionados = selecionarProdutos(base, tipo, 5);
    if (!selecionados.length) continue;
    const texto = montarTexto(tipo, selecionados);
    candidatos.push({
      ...texto,
      descricao: `Sugestao criada a partir da recomendacao ${recomendacao.titulo}.`,
      tipo,
      origem: "RECOMENDACAO_GERENCIAL",
      recomendacaoId: recomendacao.id,
      produtoId: recomendacao.produtoId,
      categoriaId: recomendacao.categoriaId,
      produtos: selecionados,
      criterios: { recomendacaoTipo: recomendacao.tipo, origemTipo: recomendacao.origemTipo },
      metricas: { produtosSelecionados: selecionados.length },
      justificativa: "Recomendacao acionavel pode virar exposicao visual sem alterar campanha, cupom ou preco.",
      risco: "Usar como rascunho e validar narrativa antes de publicar.",
      acaoSugerida: "Criar bloco inativo no editor visual ou copiar a configuracao sugerida.",
    });
  }

  const criadas = [];
  const atualizadas = [];
  for (const candidato of candidatos) {
    const resultado = await salvar(candidato);
    if (resultado.tipo === "criada") criadas.push(resultado.sugestao);
    if (resultado.tipo === "atualizada") atualizadas.push(resultado.sugestao);
  }

  const resumo = {
    ok: true,
    periodo: argValue("periodo") || "atual",
    produtosAnalisados: produtos.length,
    candidatos: candidatos.length,
    criadas: criadas.length,
    atualizadas: atualizadas.length,
    porTipo: [...criadas, ...atualizadas].reduce((acc, sugestao) => {
      acc[sugestao.tipo] = (acc[sugestao.tipo] || 0) + 1;
      return acc;
    }, {}),
  };

  if (hasFlag("json")) console.log(JSON.stringify(resumo, null, 2));
  else console.log(resumo);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
