import "server-only";

import type { Prisma, VitrineInteligenteSugestao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analisarPrecificacaoProdutos } from "@/lib/financeiro/precificacao-inteligente";
import { montarIntencaoComercial } from "@/lib/loja/intencao-comercial";

export const VITRINE_INTELIGENTE_TIPOS = [
  "PRODUTOS_POUCO_TESTADOS",
  "ALTA_INTENCAO",
  "CAMPEOES_PROVAVEIS",
  "ESTOQUE_PARADO",
  "CAMPANHA_COMERCIAL",
  "MARGEM_PROTEGIDA",
  "BUSCA_RECORRENTE",
  "PRESENTES",
  "NOVIDADES",
  "GIRO_CONTROLADO",
] as const;

export const VITRINE_INTELIGENTE_STATUS = [
  "SUGERIDA",
  "EM_REVISAO",
  "APLICADA_COMO_RASCUNHO",
  "IGNORADA",
  "CANCELADA",
] as const;

const STATUS_ABERTOS = ["SUGERIDA", "EM_REVISAO"];
const STATUS_CAMPANHA_ABERTA = ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"];
const STATUS_RECOMENDACAO_ABERTA = ["NOVA", "ACEITA", "EM_EXECUCAO"];

type TipoVitrine = (typeof VITRINE_INTELIGENTE_TIPOS)[number];

type ProdutoVitrine = {
  id: string;
  codigoInterno: string;
  nome: string;
  categoria: string;
  imagemUrl: string | null;
  imagemHoverUrl: string | null;
  precoVenda: number;
  precoPromocional: number | null;
  descontoAtivo: boolean;
  estoqueTotal: number;
  visualizacoes: number;
  favoritos: number;
  adicoesCarrinho: number;
  vendasQuantidade: number;
  scoreInteresse: number;
  taxaConversao: number;
  statusComercial: string;
  sellThroughPeriodo: number;
  classificacaoPrecificacao: string;
  descontoPermitido: boolean;
  margemBrutaPct: number;
  descontoMaximoSeguroPct: number;
};

type CandidatoVitrine = {
  titulo: string;
  subtitulo?: string | null;
  descricao?: string | null;
  tipo: TipoVitrine;
  origem: string;
  campanhaId?: string | null;
  recomendacaoId?: string | null;
  produtoId?: string | null;
  categoriaId?: string | null;
  produtos: ProdutoVitrine[];
  criterios: Record<string, unknown>;
  metricas: Record<string, unknown>;
  justificativa: string;
  risco: string;
  acaoSugerida: string;
};

export type VitrineInteligenteSerializada = {
  id: string;
  codigo: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  tipo: string;
  status: string;
  origem: string;
  campanhaId: string | null;
  recomendacaoId: string | null;
  produtoId: string | null;
  categoriaId: string | null;
  paginaDestinoId: string | null;
  blocoCriadoId: string | null;
  produtosJson: unknown;
  criteriosJson: unknown;
  configBlocoJson: unknown;
  metricasJson: unknown;
  justificativa: string | null;
  risco: string | null;
  acaoSugerida: string | null;
  criadoEm: string;
  atualizadoEm: string;
  aplicadaEm: string | null;
  ignoradaEm: string | null;
  canceladaEm: string | null;
  campanha?: { id: string; codigo: string; titulo: string; tipo: string; status: string } | null;
  recomendacao?: { id: string; codigo: string; titulo: string; status: string } | null;
  paginaDestino?: { id: string; titulo: string; slug: string; tipo: string } | null;
  blocoCriado?: { id: string; titulo: string | null; ativo: boolean } | null;
};

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
}

function codigoVitrine(tipo: string) {
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

function produtoIds(produtos: ProdutoVitrine[]) {
  return produtos.map((produto) => produto.id).sort();
}

function mesmaListaProdutos(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function produtosFromJson(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      return String(record.produtoId || record.id || "");
    })
    .filter(Boolean)
    .sort();
}

function campanhaProdutosIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return String((item as Record<string, unknown>).produtoId || "");
    })
    .filter(Boolean);
}

function getPrimeiraImagem(produto: {
  imagemUrl: string | null;
  imagemHoverUrl: string | null;
}) {
  return produto.imagemUrl || produto.imagemHoverUrl || "";
}

function ordenarProdutos(produtos: ProdutoVitrine[]) {
  return [...produtos].sort(
    (a, b) =>
      Number(Boolean(b.imagemUrl || b.imagemHoverUrl)) -
        Number(Boolean(a.imagemUrl || a.imagemHoverUrl)) ||
      b.scoreInteresse - a.scoreInteresse ||
      b.margemBrutaPct - a.margemBrutaPct ||
      a.nome.localeCompare(b.nome, "pt-BR")
  );
}

export function calcularScoreProdutoParaVitrine(
  produto: ProdutoVitrine,
  tipo: TipoVitrine
) {
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

  if (tipo === "PRODUTOS_POUCO_TESTADOS") {
    if (produto.vendasQuantidade === 0) score += 18;
    if (produto.visualizacoes <= 8) score += 12;
  }

  if (tipo === "ALTA_INTENCAO") {
    score += produto.scoreInteresse * 1.2;
    if (produto.taxaConversao <= 0) score += 8;
  }

  if (tipo === "CAMPEOES_PROVAVEIS") {
    if (produto.statusComercial === "CAMPEAO_PROVAVEL") score += 35;
    score += produto.sellThroughPeriodo * 0.4;
  }

  if (tipo === "ESTOQUE_PARADO" || tipo === "GIRO_CONTROLADO") {
    if (produto.statusComercial === "ESTOQUE_PARADO") score += 35;
    if (produto.estoqueTotal >= 2) score += 10;
  }

  if (tipo === "MARGEM_PROTEGIDA") {
    if (produto.classificacaoPrecificacao === "MARGEM_PROTEGIDA") score += 35;
    if (!produto.descontoPermitido) score += 10;
  }

  return Math.round(score * 100) / 100;
}

export function selecionarProdutosParaVitrine(
  produtos: ProdutoVitrine[],
  tipo: TipoVitrine,
  limite = 5
) {
  const elegiveis = produtos.filter((produto) => {
    if (produto.estoqueTotal <= 0) return false;
    if (!produto.imagemUrl && !produto.imagemHoverUrl) {
      return produtos.every((item) => !item.imagemUrl && !item.imagemHoverUrl);
    }
    if (
      ["CAMPANHA_COMERCIAL", "GIRO_CONTROLADO"].includes(tipo) &&
      produto.classificacaoPrecificacao === "DESCONTO_BLOQUEADO"
    ) {
      return false;
    }
    if (
      tipo !== "BUSCA_RECORRENTE" &&
      produto.classificacaoPrecificacao === "DADOS_INSUFICIENTES"
    ) {
      return false;
    }
    return true;
  });

  return elegiveis
    .map((produto) => ({
      produto,
      score: calcularScoreProdutoParaVitrine(produto, tipo),
    }))
    .sort((a, b) => b.score - a.score || a.produto.nome.localeCompare(b.produto.nome, "pt-BR"))
    .slice(0, limite)
    .map((item) => item.produto);
}

export function montarTextoVitrine(tipo: TipoVitrine, produtos: ProdutoVitrine[]) {
  const primeiraCategoria = produtos[0]?.categoria || "selecionadas";
  const textos: Record<TipoVitrine, { titulo: string; subtitulo: string }> = {
    PRODUTOS_POUCO_TESTADOS: {
      titulo: "Pecas para conhecer",
      subtitulo: "Uma selecao para dar mais leitura a produtos com pouca amostra.",
    },
    ALTA_INTENCAO: {
      titulo: "Joias com sinais de interesse",
      subtitulo: "Produtos que receberam atencao recente e merecem destaque sem pressa.",
    },
    CAMPEOES_PROVAVEIS: {
      titulo: "Escolhas em destaque",
      subtitulo: "Pecas com bom desempenho para manter visibilidade sem queimar margem.",
    },
    ESTOQUE_PARADO: {
      titulo: "Curadoria da semana",
      subtitulo: "Produtos que podem ganhar nova leitura com exposicao editorial.",
    },
    CAMPANHA_COMERCIAL: {
      titulo: "Selecao especial",
      subtitulo: `Curadoria conectada a campanha comercial de ${primeiraCategoria}.`,
    },
    MARGEM_PROTEGIDA: {
      titulo: "Favoritos em observacao",
      subtitulo: "Itens para destacar com cuidado de margem e estoque.",
    },
    BUSCA_RECORRENTE: {
      titulo: "Escolhas relacionadas a sua busca",
      subtitulo: "Produtos conectados aos termos mais procurados na loja.",
    },
    PRESENTES: {
      titulo: "Para presentear",
      subtitulo: "Pecas com boa leitura para datas e presentes.",
    },
    NOVIDADES: {
      titulo: "Novidades em observacao",
      subtitulo: "Produtos recentes para ganhar mais exposicao na loja.",
    },
    GIRO_CONTROLADO: {
      titulo: "Selecao para redescobrir",
      subtitulo: "Itens com estoque disponivel para trabalhar giro sem desconto automatico.",
    },
  };

  return textos[tipo];
}

export function montarConfigVitrineEditorial(
  candidato: Pick<CandidatoVitrine, "tipo" | "titulo" | "subtitulo" | "origem" | "produtos">
) {
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

function serializarProduto(produto: ProdutoVitrine) {
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

export async function deduplicarSugestaoVitrine(candidato: CandidatoVitrine) {
  const ids = produtoIds(candidato.produtos);
  const sugestoes = await prisma.vitrineInteligenteSugestao.findMany({
    where: {
      tipo: candidato.tipo,
      status: { in: STATUS_ABERTOS },
      ...(candidato.campanhaId ? { campanhaId: candidato.campanhaId } : {}),
      ...(candidato.recomendacaoId ? { recomendacaoId: candidato.recomendacaoId } : {}),
    },
  });

  return sugestoes.find((sugestao) =>
    mesmaListaProdutos(ids, produtosFromJson(sugestao.produtosJson))
  );
}

async function salvarSugestao(candidato: CandidatoVitrine) {
  if (candidato.produtos.length === 0) return null;

  const configBloco = montarConfigVitrineEditorial(candidato);
  const existente = await deduplicarSugestaoVitrine(candidato);
  const produtosJson = candidato.produtos.map(serializarProduto);

  if (existente) {
    return prisma.vitrineInteligenteSugestao.update({
      where: { id: existente.id },
      data: {
        titulo: candidato.titulo,
        subtitulo: candidato.subtitulo || null,
        descricao: candidato.descricao || null,
        produtoId: candidato.produtoId || candidato.produtos[0]?.id || null,
        categoriaId: candidato.categoriaId || null,
        produtosJson: produtosJson as Prisma.InputJsonValue,
        criteriosJson: candidato.criterios as Prisma.InputJsonValue,
        configBlocoJson: configBloco as Prisma.InputJsonValue,
        metricasJson: candidato.metricas as Prisma.InputJsonValue,
        justificativa: candidato.justificativa,
        risco: candidato.risco,
        acaoSugerida: candidato.acaoSugerida,
      },
    });
  }

  return prisma.vitrineInteligenteSugestao.create({
    data: {
      codigo: codigoVitrine(candidato.tipo),
      titulo: candidato.titulo,
      subtitulo: candidato.subtitulo || null,
      descricao: candidato.descricao || null,
      tipo: candidato.tipo,
      status: "SUGERIDA",
      origem: candidato.origem,
      campanhaId: candidato.campanhaId || null,
      recomendacaoId: candidato.recomendacaoId || null,
      produtoId: candidato.produtoId || candidato.produtos[0]?.id || null,
      categoriaId: candidato.categoriaId || null,
      produtosJson: produtosJson as Prisma.InputJsonValue,
      criteriosJson: candidato.criterios as Prisma.InputJsonValue,
      configBlocoJson: configBloco as Prisma.InputJsonValue,
      metricasJson: candidato.metricas as Prisma.InputJsonValue,
      justificativa: candidato.justificativa,
      risco: candidato.risco,
      acaoSugerida: candidato.acaoSugerida,
    },
  });
}

export async function gerarSugestaoAPartirDeCampanha(
  campanha: {
    id: string;
    titulo: string;
    tipo: string;
    objetivo: string;
    produtoId: string | null;
    categoriaId: string | null;
    produtosJson: unknown;
    descontoSugerido: number | null;
  },
  produtos: ProdutoVitrine[]
): Promise<CandidatoVitrine | null> {
  const idsCampanha = new Set([
    campanha.produtoId,
    ...campanhaProdutosIds(campanha.produtosJson),
  ].filter(Boolean) as string[]);
  const produtosCampanha = produtos.filter((produto) => idsCampanha.has(produto.id));
  const tipo: TipoVitrine =
    campanha.tipo === "GIRO_ESTOQUE"
      ? "GIRO_CONTROLADO"
      : campanha.tipo === "MARGEM"
      ? "MARGEM_PROTEGIDA"
      : "CAMPANHA_COMERCIAL";
  const selecionados = selecionarProdutosParaVitrine(
    produtosCampanha.length > 0 ? produtosCampanha : produtos,
    tipo,
    5
  );

  if (selecionados.length === 0) return null;

  const texto = montarTextoVitrine(tipo, selecionados);
  return {
    titulo: texto.titulo,
    subtitulo: texto.subtitulo,
    descricao: `Sugestao criada a partir da campanha ${campanha.titulo}.`,
    tipo,
    origem: "CAMPANHA_COMERCIAL",
    campanhaId: campanha.id,
    produtoId: campanha.produtoId,
    categoriaId: campanha.categoriaId,
    produtos: selecionados,
    criterios: {
      campanhaTipo: campanha.tipo,
      objetivo: campanha.objetivo,
      descontoSugerido: campanha.descontoSugerido,
    },
    metricas: {
      produtosConsiderados: produtosCampanha.length,
      produtosSelecionados: selecionados.length,
    },
    justificativa: "Campanha aberta com produtos que podem receber exposicao editorial sem publicacao automatica.",
    risco: "Revisar texto, imagens e margem antes de ativar o bloco.",
    acaoSugerida: "Aplicar como rascunho no builder e revisar manualmente antes de publicar.",
  };
}

export async function gerarSugestaoAPartirDeRecomendacao(
  recomendacao: {
    id: string;
    titulo: string;
    tipo: string;
    origemTipo: string;
    produtoId: string | null;
    categoriaId: string | null;
    evidenciasJson: unknown;
  },
  produtos: ProdutoVitrine[]
): Promise<CandidatoVitrine | null> {
  const produtoBase = recomendacao.produtoId
    ? produtos.find((produto) => produto.id === recomendacao.produtoId)
    : null;
  const tipo: TipoVitrine =
    recomendacao.origemTipo === "INTENCAO_BUSCA"
      ? "BUSCA_RECORRENTE"
      : recomendacao.tipo === "PRECIFICACAO"
      ? "MARGEM_PROTEGIDA"
      : recomendacao.tipo === "REPOSICAO"
      ? "CAMPEOES_PROVAVEIS"
      : "ALTA_INTENCAO";
  const base = produtoBase
    ? produtos.filter(
        (produto) =>
          produto.id === produtoBase.id ||
          produto.categoria === produtoBase.categoria
      )
    : produtos;
  const selecionados = selecionarProdutosParaVitrine(base, tipo, 5);

  if (selecionados.length === 0) return null;

  const texto = montarTextoVitrine(tipo, selecionados);
  return {
    titulo: texto.titulo,
    subtitulo: texto.subtitulo,
    descricao: `Sugestao criada a partir da recomendacao ${recomendacao.titulo}.`,
    tipo,
    origem: "RECOMENDACAO_GERENCIAL",
    recomendacaoId: recomendacao.id,
    produtoId: recomendacao.produtoId,
    categoriaId: recomendacao.categoriaId,
    produtos: selecionados,
    criterios: {
      recomendacaoTipo: recomendacao.tipo,
      origemTipo: recomendacao.origemTipo,
      evidencias: recomendacao.evidenciasJson,
    },
    metricas: {
      produtosSelecionados: selecionados.length,
    },
    justificativa: "Recomendacao acionavel pode virar exposicao visual sem alterar campanha, cupom ou preco.",
    risco: "Usar como rascunho e validar narrativa antes de publicar.",
    acaoSugerida: "Criar bloco inativo no editor visual ou copiar a configuracao sugerida.",
  };
}

async function montarProdutosBase() {
  const [intencao, precificacaoResultado, produtosRaw] = await Promise.all([
    montarIntencaoComercial({ dias: 30 }),
    analisarPrecificacaoProdutos(),
    prisma.produto.findMany({
      where: {
        ativo: true,
        status: { not: "NA_LIXEIRA" },
      },
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
        estoque: {
          select: { quantidadeAtual: true },
        },
        metricasSnapshots: {
          orderBy: { periodoFim: "desc" },
          take: 1,
          select: {
            vendasQuantidade: true,
            sellThroughPeriodo: true,
            statusComercial: true,
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
  ]);
  const intencaoPorProduto = new Map(
    intencao.produtos.map((produto) => [produto.produtoId, produto])
  );
  const precificacaoPorProduto = new Map(
    precificacaoResultado.produtos.map((item) => [item.produtoId, item])
  );

  return produtosRaw.map((produto): ProdutoVitrine => {
    const intencaoProduto = intencaoPorProduto.get(produto.id);
    const precificacao = precificacaoPorProduto.get(produto.id);
    const snapshot = produto.metricasSnapshots[0];

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
      estoqueTotal: produto.estoque.reduce(
        (total, item) => total + item.quantidadeAtual,
        0
      ),
      visualizacoes: intencaoProduto?.visualizacoes || 0,
      favoritos: intencaoProduto?.favoritos || 0,
      adicoesCarrinho: intencaoProduto?.adicoesCarrinho || 0,
      vendasQuantidade:
        intencaoProduto?.vendasQuantidade || snapshot?.vendasQuantidade || 0,
      scoreInteresse: intencaoProduto?.scoreInteresse || 0,
      taxaConversao: intencaoProduto?.taxaConversao || 0,
      statusComercial: snapshot?.statusComercial || "NAO_TESTADO",
      sellThroughPeriodo: numero(snapshot?.sellThroughPeriodo),
      classificacaoPrecificacao:
        precificacao?.classificacao || "DADOS_INSUFICIENTES",
      descontoPermitido: Boolean(precificacao?.descontoPermitido),
      margemBrutaPct: precificacao?.margemBrutaPct || 0,
      descontoMaximoSeguroPct: precificacao?.descontoMaximoSeguroPct || 0,
    };
  });
}

function montarCandidatosProduto(produtos: ProdutoVitrine[]): CandidatoVitrine[] {
  const candidatos: CandidatoVitrine[] = [];
  const regras: { tipo: TipoVitrine; produtos: ProdutoVitrine[]; justificativa: string }[] = [
    {
      tipo: "PRODUTOS_POUCO_TESTADOS",
      produtos: produtos.filter(
        (produto) =>
          produto.statusComercial === "NAO_TESTADO" ||
          (produto.visualizacoes <= 8 && produto.vendasQuantidade === 0)
      ),
      justificativa: "Produtos com pouca amostra precisam de exposicao antes de qualquer decisao dura.",
    },
    {
      tipo: "ALTA_INTENCAO",
      produtos: produtos.filter(
        (produto) =>
          produto.scoreInteresse >= 18 ||
          produto.favoritos >= 2 ||
          produto.adicoesCarrinho >= 1
      ),
      justificativa: "Produtos com interesse recente podem converter melhor com vitrine editorial.",
    },
    {
      tipo: "CAMPEOES_PROVAVEIS",
      produtos: produtos.filter(
        (produto) =>
          produto.statusComercial === "CAMPEAO_PROVAVEL" ||
          produto.sellThroughPeriodo >= 35
      ),
      justificativa: "Campeoes provaveis merecem destaque sem incentivo automatico de desconto.",
    },
    {
      tipo: "ESTOQUE_PARADO",
      produtos: produtos.filter(
        (produto) =>
          produto.statusComercial === "ESTOQUE_PARADO" ||
          (produto.estoqueTotal >= 2 &&
            produto.visualizacoes >= 8 &&
            produto.taxaConversao <= 0)
      ),
      justificativa: "Estoque parado pode ganhar nova leitura em vitrine especifica.",
    },
    {
      tipo: "MARGEM_PROTEGIDA",
      produtos: produtos.filter(
        (produto) =>
          produto.classificacaoPrecificacao === "MARGEM_PROTEGIDA" ||
          (!produto.descontoPermitido && produto.scoreInteresse >= 15)
      ),
      justificativa: "Produtos com margem protegida devem receber exposicao, nao desconto automatico.",
    },
  ];

  for (const regra of regras) {
    const selecionados = selecionarProdutosParaVitrine(regra.produtos, regra.tipo, 5);
    if (selecionados.length === 0) continue;

    const texto = montarTextoVitrine(regra.tipo, selecionados);
    candidatos.push({
      titulo: texto.titulo,
      subtitulo: texto.subtitulo,
      descricao: regra.justificativa,
      tipo: regra.tipo,
      origem: "METRICAS_PRODUTO",
      produtoId: selecionados[0]?.id || null,
      categoriaId: null,
      produtos: selecionados,
      criterios: { tipo: regra.tipo },
      metricas: {
        produtosConsiderados: regra.produtos.length,
        scoreMedio:
          selecionados.reduce(
            (total, produto) =>
              total + calcularScoreProdutoParaVitrine(produto, regra.tipo),
            0
          ) / selecionados.length,
      },
      justificativa: regra.justificativa,
      risco: "Validar imagens e posicionamento antes de ativar na loja publica.",
      acaoSugerida: "Aplicar como rascunho inativo e revisar no editor visual.",
    });
  }

  return candidatos;
}

async function montarCandidatoBuscaRecorrente(produtos: ProdutoVitrine[]) {
  const intencao = await montarIntencaoComercial({ dias: 30 });
  const termo = intencao.buscasFrequentes[0]?.termo;
  if (!termo) return null;

  const termoNormalizado = normalizarTexto(termo);
  const relacionados = produtos.filter((produto) =>
    normalizarTexto(
      `${produto.nome} ${produto.categoria} ${produto.codigoInterno}`
    ).includes(termoNormalizado)
  );
  const selecionados = selecionarProdutosParaVitrine(
    relacionados.length > 0 ? relacionados : ordenarProdutos(produtos).slice(0, 8),
    "BUSCA_RECORRENTE",
    5
  );

  if (selecionados.length === 0) return null;

  const texto = montarTextoVitrine("BUSCA_RECORRENTE", selecionados);
  return {
    titulo: texto.titulo,
    subtitulo: texto.subtitulo,
    descricao: `Termo recorrente: ${termo}.`,
    tipo: "BUSCA_RECORRENTE" as const,
    origem: "INTENCAO_BUSCA",
    produtos: selecionados,
    criterios: { termoBusca: termo },
    metricas: { quantidadeBuscas: intencao.buscasFrequentes[0]?.quantidade || 0 },
    justificativa:
      relacionados.length > 0
        ? "Busca recorrente tem produtos relacionados para exposicao."
        : "Busca recorrente sem correspondencia direta; revisar curadoria antes de publicar.",
    risco: "Nao publicar vitrine vazia; revisar aderencia dos produtos ao termo.",
    acaoSugerida: "Revisar produtos e considerar tag, pagina ou compra futura se a busca nao tiver boa cobertura.",
  };
}

export async function gerarSugestoesVitrinesInteligentes() {
  const produtos = await montarProdutosBase();
  const [campanhas, recomendacoes, busca] = await Promise.all([
    prisma.campanhaComercial.findMany({
      where: {
        status: { in: STATUS_CAMPANHA_ABERTA },
        tipo: { in: ["EXPOSICAO", "CONVERSAO", "GIRO_ESTOQUE", "MARGEM"] },
      },
      orderBy: { criadoEm: "desc" },
      take: 20,
      select: {
        id: true,
        titulo: true,
        tipo: true,
        objetivo: true,
        produtoId: true,
        categoriaId: true,
        produtosJson: true,
        descontoSugerido: true,
      },
    }),
    prisma.recomendacaoGerencial.findMany({
      where: {
        status: { in: STATUS_RECOMENDACAO_ABERTA },
        OR: [{ produtoId: { not: null } }, { origemTipo: "INTENCAO_BUSCA" }],
      },
      orderBy: { criadoEm: "desc" },
      take: 30,
      select: {
        id: true,
        titulo: true,
        tipo: true,
        origemTipo: true,
        produtoId: true,
        categoriaId: true,
        evidenciasJson: true,
      },
    }),
    montarCandidatoBuscaRecorrente(produtos),
  ]);
  const candidatos: CandidatoVitrine[] = [...montarCandidatosProduto(produtos)];

  for (const campanha of campanhas) {
    const candidato = await gerarSugestaoAPartirDeCampanha(campanha, produtos);
    if (candidato) candidatos.push(candidato);
  }

  for (const recomendacao of recomendacoes) {
    const candidato = await gerarSugestaoAPartirDeRecomendacao(
      recomendacao,
      produtos
    );
    if (candidato) candidatos.push(candidato);
  }

  if (busca) candidatos.push(busca);

  const salvas = [];
  const atualizadas = [];

  for (const candidato of candidatos) {
    const existente = await deduplicarSugestaoVitrine(candidato);
    const sugestao = await salvarSugestao(candidato);
    if (!sugestao) continue;
    if (existente) atualizadas.push(sugestao);
    else salvas.push(sugestao);
  }

  return {
    produtosAnalisados: produtos.length,
    candidatos: candidatos.length,
    criadas: salvas,
    atualizadas,
  };
}

export async function converterSugestaoEmBlocoRascunho({
  sugestaoId,
  paginaDestinoId,
}: {
  sugestaoId: string;
  paginaDestinoId?: string | null;
}) {
  const sugestao = await prisma.vitrineInteligenteSugestao.findUnique({
    where: { id: sugestaoId },
  });

  if (!sugestao) {
    throw new Error("Sugestao de vitrine nao encontrada.");
  }

  const pagina =
    (paginaDestinoId
      ? await prisma.lojaPagina.findUnique({ where: { id: paginaDestinoId } })
      : null) ||
    (await prisma.lojaPagina.findFirst({
      where: {
        OR: [{ slug: "home", tipo: "HOME" }, { tipo: "HOME" }],
        statusPublicacao: { not: "ARQUIVADA" },
      },
      orderBy: [{ ativo: "desc" }, { criadoEm: "asc" }],
    }));

  if (!pagina) {
    throw new Error("Nenhuma pagina Home foi encontrada para receber o rascunho.");
  }

  const ultimaOrdem = await prisma.lojaPaginaBloco.aggregate({
    where: { paginaId: pagina.id },
    _max: { ordem: true },
  });

  const bloco = await prisma.lojaPaginaBloco.create({
    data: {
      paginaId: pagina.id,
      tipo: "VITRINE_EDITORIAL",
      titulo: sugestao.titulo,
      ativo: false,
      ordem: (ultimaOrdem._max.ordem || 0) + 1,
      configJson: sugestao.configBlocoJson as Prisma.InputJsonValue,
    },
  });

  const atualizada = await prisma.vitrineInteligenteSugestao.update({
    where: { id: sugestao.id },
    data: {
      status: "APLICADA_COMO_RASCUNHO",
      paginaDestinoId: pagina.id,
      blocoCriadoId: bloco.id,
      aplicadaEm: new Date(),
    },
  });

  return { sugestao: atualizada, bloco, pagina };
}

export function serializarVitrineInteligente(
  sugestao: VitrineInteligenteSugestao & {
    campanha?: { id: string; codigo: string; titulo: string; tipo: string; status: string } | null;
    recomendacao?: { id: string; codigo: string; titulo: string; status: string } | null;
    paginaDestino?: { id: string; titulo: string; slug: string; tipo: string } | null;
    blocoCriado?: { id: string; titulo: string | null; ativo: boolean } | null;
  }
): VitrineInteligenteSerializada {
  return {
    id: sugestao.id,
    codigo: sugestao.codigo,
    titulo: sugestao.titulo,
    subtitulo: sugestao.subtitulo,
    descricao: sugestao.descricao,
    tipo: sugestao.tipo,
    status: sugestao.status,
    origem: sugestao.origem,
    campanhaId: sugestao.campanhaId,
    recomendacaoId: sugestao.recomendacaoId,
    produtoId: sugestao.produtoId,
    categoriaId: sugestao.categoriaId,
    paginaDestinoId: sugestao.paginaDestinoId,
    blocoCriadoId: sugestao.blocoCriadoId,
    produtosJson: sugestao.produtosJson,
    criteriosJson: sugestao.criteriosJson,
    configBlocoJson: sugestao.configBlocoJson,
    metricasJson: sugestao.metricasJson,
    justificativa: sugestao.justificativa,
    risco: sugestao.risco,
    acaoSugerida: sugestao.acaoSugerida,
    criadoEm: sugestao.criadoEm.toISOString(),
    atualizadoEm: sugestao.atualizadoEm.toISOString(),
    aplicadaEm: sugestao.aplicadaEm?.toISOString() || null,
    ignoradaEm: sugestao.ignoradaEm?.toISOString() || null,
    canceladaEm: sugestao.canceladaEm?.toISOString() || null,
    campanha: sugestao.campanha || null,
    recomendacao: sugestao.recomendacao || null,
    paginaDestino: sugestao.paginaDestino || null,
    blocoCriado: sugestao.blocoCriado || null,
  };
}
