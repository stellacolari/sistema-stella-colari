import "server-only";

import type { CampanhaComercial, Prisma, Produto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { montarInteligenciaAdaptativaAtual } from "@/lib/financeiro/inteligencia-adaptativa";
import { extrairIntencaoSnapshot } from "@/lib/produtos/metricas-produto";

export const PRECIFICACAO_CLASSIFICACOES = [
  "MARGEM_PROTEGIDA",
  "DESCONTO_BLOQUEADO",
  "DESCONTO_CONTROLADO",
  "REVISAR_PRECO",
  "PRECO_CRITICO",
  "PODE_VIRAR_COMBO",
  "DADOS_INSUFICIENTES",
] as const;

export type PrecificacaoClassificacao =
  (typeof PRECIFICACAO_CLASSIFICACOES)[number];

export type SimulacaoDescontoStatus =
  | "SEGURO"
  | "ACEITAVEL_COM_CAUTELA"
  | "NAO_RECOMENDADO"
  | "BLOQUEADO";

type ProdutoPrecificacaoBase = Produto & {
  estoque?: { quantidadeAtual: number; custoMedio: number }[];
  metricasSnapshots?: {
    statusComercial: string;
    recomendacao: string | null;
    sellThroughAcumulado: number;
    scoreValidacao: number;
    estoqueFinal: number;
    vendasQuantidade: number;
    dadosJson: Prisma.JsonValue;
  }[];
  campanhasComerciais?: CampanhaComercial[];
};

export type PrecificacaoProdutoAnalise = {
  produtoId: string;
  codigoInterno: string;
  nome: string;
  categoria: string | null;
  precoVenda: number;
  precoAtual: number;
  precoPromocional: number | null;
  descontoAtivo: boolean;
  custoEstimado: number;
  custoAusente: boolean;
  margemBrutaValor: number;
  margemBrutaPct: number;
  margemMinimaDesejadaPct: number;
  precoMinimoSeguro: number;
  descontoMaximoSeguroPct: number;
  estoqueAtual: number;
  sellThrough: number;
  statusComercial: string;
  scoreInteresse: number;
  scoreConversao: number;
  statusReposicao: string;
  faseEmpresa: string;
  campanhasAbertas: {
    id: string;
    codigo: string;
    titulo: string;
    tipo: string;
    status: string;
    descontoSugerido: number | null;
    descontoSeguro: boolean;
    alertaDesconto: string | null;
  }[];
  classificacao: PrecificacaoClassificacao;
  recomendacao: string;
  motivo: string;
  acaoSugerida: string;
  descontoPermitido: boolean;
  protecaoMargem: boolean;
};

export type SimulacaoDescontoProduto = {
  produtoId: string;
  descontoPercentual: number;
  novoPreco: number;
  novaMargemValor: number;
  novaMargemPct: number;
  risco: string;
  recomendacao: SimulacaoDescontoStatus;
  motivo: string;
};

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function arredondar(value: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((numero(value) + Number.EPSILON) * fator) / fator;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function precoAtualProduto(produto: Pick<Produto, "precoVenda" | "descontoAtivo" | "precoPromocional">) {
  const precoVenda = numero(produto.precoVenda);
  const promocional = numero(produto.precoPromocional);

  if (produto.descontoAtivo && promocional > 0 && promocional < precoVenda) {
    return promocional;
  }

  return precoVenda;
}

function margemMinimaPorFase(fase: string, campanhaTipo?: string | null) {
  let margem = 45;

  if (["VALIDACAO_INICIAL", "PRE_OPERACAO", "PRESSAO_CAIXA", "CRISE_DEFESA"].includes(fase)) {
    margem = 55;
  }
  if (["PRIMEIRA_TRACAO", "GIRO_COMPROVADO"].includes(fase)) {
    margem = 50;
  }
  if (campanhaTipo === "MARGEM") margem = Math.max(margem, 58);
  if (campanhaTipo === "GIRO_ESTOQUE" || campanhaTipo === "CUPOM_CONTROLADO") {
    margem = Math.max(38, margem - 8);
  }

  return margem;
}

function campanhaAberta(campanha: CampanhaComercial) {
  return ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"].includes(campanha.status);
}

function campanhaPrincipal(campanhas: CampanhaComercial[]) {
  return campanhas.find(campanhaAberta) || null;
}

export function calcularMargemProduto({
  preco,
  custo,
}: {
  preco: number;
  custo: number;
}) {
  const margemBrutaValor = arredondar(preco - custo);
  const margemBrutaPct = preco > 0 ? arredondar((margemBrutaValor / preco) * 100, 2) : 0;

  return { margemBrutaValor, margemBrutaPct };
}

export function calcularPrecoMinimoSeguro({
  custo,
  margemMinimaPct,
}: {
  custo: number;
  margemMinimaPct: number;
}) {
  if (custo <= 0) return 0;

  const margem = clamp(margemMinimaPct, 1, 90) / 100;
  return arredondar(custo / (1 - margem));
}

export function calcularDescontoMaximoSeguro({
  precoVenda,
  precoMinimoSeguro,
}: {
  precoVenda: number;
  precoMinimoSeguro: number;
}) {
  if (precoVenda <= 0 || precoMinimoSeguro <= 0 || precoMinimoSeguro >= precoVenda) {
    return 0;
  }

  return arredondar(((precoVenda - precoMinimoSeguro) / precoVenda) * 100, 1);
}

export function avaliarProtecaoMargem(params: {
  statusComercial: string;
  scoreInteresse: number;
  scoreConversao: number;
  estoqueAtual: number;
  margemBrutaPct: number;
  faseEmpresa: string;
  sellThrough?: number;
}) {
  return (
    ["CAMPEAO_PROVAVEL", "RISCO_RUPTURA", "REPOSICAO_CONFIRMADA"].includes(params.statusComercial) ||
    params.scoreInteresse >= 35 ||
    params.scoreConversao >= 45 ||
    (params.estoqueAtual <= 2 &&
      (numero(params.sellThrough) >= 35 || params.scoreInteresse >= 18 || params.scoreConversao >= 20)) ||
    params.margemBrutaPct < 45 ||
    (["PRESSAO_CAIXA", "CRISE_DEFESA"].includes(params.faseEmpresa) &&
      (params.scoreInteresse >= 18 || params.scoreConversao >= 20 || numero(params.sellThrough) >= 35))
  );
}

export function avaliarPermissaoDesconto(params: {
  custoAusente: boolean;
  estoqueAtual: number;
  statusComercial: string;
  scoreInteresse: number;
  scoreConversao: number;
  margemBrutaPct: number;
  descontoMaximoSeguroPct: number;
  campanhaTipo?: string | null;
}) {
  if (params.custoAusente) return false;
  if (params.descontoMaximoSeguroPct <= 0) return false;
  if (params.estoqueAtual <= 2) return false;
  if (["CAMPEAO_PROVAVEL", "RISCO_RUPTURA", "REPOSICAO_CONFIRMADA"].includes(params.statusComercial)) {
    return false;
  }
  if (params.scoreInteresse >= 35 || params.scoreConversao >= 40) return false;
  if (params.margemBrutaPct < 45) return false;

  return ["ESTOQUE_PARADO", "TRAVADO"].includes(params.statusComercial) ||
    ["GIRO_ESTOQUE", "CUPOM_CONTROLADO"].includes(String(params.campanhaTipo || ""));
}

function classificarProduto(params: {
  custoAusente: boolean;
  margemBrutaPct: number;
  descontoPermitido: boolean;
  protecaoMargem: boolean;
  statusComercial: string;
  scoreInteresse: number;
  scoreConversao: number;
  sellThrough: number;
  estoqueAtual: number;
}): PrecificacaoClassificacao {
  if (params.custoAusente) return "DADOS_INSUFICIENTES";
  if (params.margemBrutaPct <= 0 || params.margemBrutaPct < 25) return "PRECO_CRITICO";
  if (
    params.statusComercial === "INTERESSE_SEM_CONVERSAO" ||
    (params.scoreInteresse >= 25 && params.scoreConversao <= 5)
  ) {
    return params.margemBrutaPct >= 45 ? "REVISAR_PRECO" : "PRECO_CRITICO";
  }
  if (params.descontoPermitido) return "DESCONTO_CONTROLADO";
  if (params.protecaoMargem) return "MARGEM_PROTEGIDA";
  if (
    ["ESTOQUE_PARADO", "TRAVADO"].includes(params.statusComercial) ||
    (params.sellThrough < 20 && params.estoqueAtual >= 4)
  ) {
    return "PODE_VIRAR_COMBO";
  }

  return "DESCONTO_BLOQUEADO";
}

export function gerarRecomendacaoPrecoProduto(
  analise: Pick<
    PrecificacaoProdutoAnalise,
    | "classificacao"
    | "descontoMaximoSeguroPct"
    | "precoMinimoSeguro"
    | "margemBrutaPct"
    | "statusComercial"
  >
) {
  const mensagens: Record<PrecificacaoClassificacao, { recomendacao: string; acao: string }> = {
    MARGEM_PROTEGIDA: {
      recomendacao: "Proteger margem e evitar desconto direto.",
      acao: "Usar vitrine, conteudo organico ou reposicao seletiva antes de desconto.",
    },
    DESCONTO_BLOQUEADO: {
      recomendacao: "Desconto bloqueado para preservar margem ou demanda.",
      acao: "Manter preco e acompanhar intencao antes de testar incentivo.",
    },
    DESCONTO_CONTROLADO: {
      recomendacao: `Desconto controlado possivel ate ${analise.descontoMaximoSeguroPct}%.`,
      acao: "Testar desconto pequeno, por periodo curto, sem criar cupom automaticamente.",
    },
    REVISAR_PRECO: {
      recomendacao: "Revisar preco/oferta antes de desconto agressivo.",
      acao: "Comparar foto, descricao, frete e preco minimo seguro antes de alterar produto.",
    },
    PRECO_CRITICO: {
      recomendacao: "Preco atual deixa margem critica.",
      acao: `Revisar custo ou subir preco para pelo menos o minimo seguro de ${analise.precoMinimoSeguro}.`,
    },
    PODE_VIRAR_COMBO: {
      recomendacao: "Produto pode virar combo em vez de desconto direto.",
      acao: "Planejar kit ou curadoria para aumentar ticket sem destruir margem.",
    },
    DADOS_INSUFICIENTES: {
      recomendacao: "Dados insuficientes para autorizar desconto.",
      acao: "Cadastrar custo do produto e gerar metricas antes de simular desconto.",
    },
  };

  return mensagens[analise.classificacao];
}

function motivoClassificacao(analise: {
  classificacao: PrecificacaoClassificacao;
  custoAusente: boolean;
  margemBrutaPct: number;
  estoqueAtual: number;
  statusComercial: string;
  scoreInteresse: number;
  scoreConversao: number;
  campanhas: CampanhaComercial[];
}) {
  if (analise.custoAusente) return "Produto sem custo confiavel cadastrado.";
  if (analise.classificacao === "PRECO_CRITICO") return `Margem atual de ${analise.margemBrutaPct}% esta abaixo da faixa minima.`;
  if (analise.estoqueAtual <= 2) return "Estoque baixo pede protecao de preco e evita incentivo desnecessario.";
  if (["CAMPEAO_PROVAVEL", "RISCO_RUPTURA"].includes(analise.statusComercial)) {
    return "Produto com sinal forte ou risco de ruptura deve preservar margem.";
  }
  if (analise.classificacao === "REVISAR_PRECO") {
    return "Ha interesse sem conversao; pode haver friccao de oferta, preco ou frete.";
  }
  if (analise.campanhas.some((campanha) => ["GIRO_ESTOQUE", "CUPOM_CONTROLADO"].includes(campanha.tipo))) {
    return "Campanha aberta de giro permite analisar desconto controlado sem ativar cupom.";
  }
  if (analise.scoreInteresse >= 35 || analise.scoreConversao >= 40) {
    return "Intencao/conversao ja justificam evitar desconto amplo.";
  }

  return "Classificacao calculada por margem, estoque, intencao e campanha aberta.";
}

export async function analisarPrecificacaoProduto(produtoId: string) {
  const [produto, contexto] = await Promise.all([
    prisma.produto.findUnique({
      where: { id: produtoId },
      include: {
        estoque: true,
        metricasSnapshots: {
          orderBy: { criadoEm: "desc" },
          take: 1,
        },
        campanhasComerciais: {
          where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
          orderBy: { criadoEm: "desc" },
          take: 5,
        },
      },
    }),
    montarInteligenciaAdaptativaAtual(),
  ]);

  if (!produto) throw new Error("Produto nao encontrado.");

  return analisarProdutoBase(produto, contexto.fase);
}

function analisarProdutoBase(
  produto: ProdutoPrecificacaoBase,
  faseEmpresa: string
): PrecificacaoProdutoAnalise {
  const snapshot = produto.metricasSnapshots?.[0] || null;
  const intencao = snapshot ? extrairIntencaoSnapshot(snapshot.dadosJson) : null;
  const estoqueAtual = produto.estoque?.reduce(
    (total, item) => total + numero(item.quantidadeAtual),
    0
  ) || numero(snapshot?.estoqueFinal);
  const custoEstoque =
    produto.estoque?.find((item) => numero(item.custoMedio) > 0)?.custoMedio || 0;
  const custoEstimado = numero(custoEstoque) || numero(produto.custoBase);
  const custoAusente = custoEstimado <= 0;
  const precoVenda = numero(produto.precoVenda);
  const precoAtual = precoAtualProduto(produto);
  const campanhas = produto.campanhasComerciais?.filter(campanhaAberta) || [];
  const campanha = campanhaPrincipal(campanhas);
  const margemMinimaDesejadaPct = margemMinimaPorFase(faseEmpresa, campanha?.tipo);
  const { margemBrutaValor, margemBrutaPct } = calcularMargemProduto({
    preco: precoAtual,
    custo: custoEstimado,
  });
  const precoMinimoSeguro = calcularPrecoMinimoSeguro({
    custo: custoEstimado,
    margemMinimaPct: margemMinimaDesejadaPct,
  });
  const descontoMaximoSeguroPct = calcularDescontoMaximoSeguro({
    precoVenda,
    precoMinimoSeguro,
  });
  const statusComercial = snapshot?.statusComercial || "NAO_TESTADO";
  const scoreInteresse = intencao?.scoreInteresse || 0;
  const scoreConversao = intencao?.scoreConversao || 0;
  const protecaoMargem = avaliarProtecaoMargem({
    statusComercial,
    scoreInteresse,
    scoreConversao,
    estoqueAtual,
    margemBrutaPct,
    faseEmpresa,
    sellThrough: numero(snapshot?.sellThroughAcumulado),
  });
  const descontoPermitido = avaliarPermissaoDesconto({
    custoAusente,
    estoqueAtual,
    statusComercial,
    scoreInteresse,
    scoreConversao,
    margemBrutaPct,
    descontoMaximoSeguroPct,
    campanhaTipo: campanha?.tipo,
  });
  const classificacao = classificarProduto({
    custoAusente,
    margemBrutaPct,
    descontoPermitido,
    protecaoMargem,
    statusComercial,
    scoreInteresse,
    scoreConversao,
    sellThrough: snapshot?.sellThroughAcumulado || 0,
    estoqueAtual,
  });
  const recomendacao = gerarRecomendacaoPrecoProduto({
    classificacao,
    descontoMaximoSeguroPct,
    precoMinimoSeguro,
    margemBrutaPct,
    statusComercial,
  });
  const campanhasAbertas = campanhas.map((item) => {
    const desconto = numero(item.descontoSugerido);
    const descontoSeguro = desconto <= descontoMaximoSeguroPct && descontoPermitido;

    return {
      id: item.id,
      codigo: item.codigo,
      titulo: item.titulo,
      tipo: item.tipo,
      status: item.status,
      descontoSugerido: item.descontoSugerido,
      descontoSeguro,
      alertaDesconto:
        desconto > 0 && !descontoSeguro
          ? "Desconto sugerido compromete margem. Considere vitrine, combo ou conteudo organico."
          : null,
    };
  });

  return {
    produtoId: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.nome,
    categoria: produto.categoria,
    precoVenda,
    precoAtual,
    precoPromocional: produto.precoPromocional,
    descontoAtivo: produto.descontoAtivo,
    custoEstimado,
    custoAusente,
    margemBrutaValor,
    margemBrutaPct,
    margemMinimaDesejadaPct,
    precoMinimoSeguro,
    descontoMaximoSeguroPct,
    estoqueAtual,
    sellThrough: snapshot?.sellThroughAcumulado || 0,
    statusComercial,
    scoreInteresse,
    scoreConversao,
    statusReposicao: snapshot?.recomendacao || "EXPOR_MAIS",
    faseEmpresa,
    campanhasAbertas,
    classificacao,
    recomendacao: recomendacao.recomendacao,
    motivo: motivoClassificacao({
      classificacao,
      custoAusente,
      margemBrutaPct,
      estoqueAtual,
      statusComercial,
      scoreInteresse,
      scoreConversao,
      campanhas,
    }),
    acaoSugerida: recomendacao.acao,
    descontoPermitido,
    protecaoMargem,
  };
}

export async function analisarPrecificacaoProdutos() {
  const [produtos, contexto] = await Promise.all([
    prisma.produto.findMany({
      where: {
        ativo: true,
        status: { not: "NA_LIXEIRA" },
      },
      include: {
        estoque: true,
        metricasSnapshots: {
          orderBy: { criadoEm: "desc" },
          take: 1,
        },
        campanhasComerciais: {
          where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
          orderBy: { criadoEm: "desc" },
          take: 5,
        },
      },
      orderBy: { nome: "asc" },
    }),
    montarInteligenciaAdaptativaAtual(),
  ]);
  const produtosAnalisados = produtos.map((produto) =>
    analisarProdutoBase(produto, contexto.fase)
  );

  return {
    faseEmpresa: contexto.fase,
    faseLabel: contexto.faseLabel,
    confiancaAnalise: contexto.confiancaAnalise,
    produtos: produtosAnalisados,
    resumo: produtosAnalisados.reduce<Record<string, number>>((acc, item) => {
      acc[item.classificacao] = (acc[item.classificacao] || 0) + 1;
      if (item.custoAusente) acc.SEM_CUSTO = (acc.SEM_CUSTO || 0) + 1;
      return acc;
    }, {}),
  };
}

export async function simularDescontoProduto({
  produtoId,
  descontoPercentual,
  novoPreco,
}: {
  produtoId: string;
  descontoPercentual?: number;
  novoPreco?: number;
}): Promise<SimulacaoDescontoProduto> {
  const analise = await analisarPrecificacaoProduto(produtoId);
  const desconto = clamp(numero(descontoPercentual), 0, 95);
  const precoSimulado =
    novoPreco && numero(novoPreco) > 0
      ? arredondar(numero(novoPreco))
      : arredondar(analise.precoVenda * (1 - desconto / 100));
  const descontoCalculado =
    analise.precoVenda > 0
      ? arredondar(((analise.precoVenda - precoSimulado) / analise.precoVenda) * 100, 1)
      : desconto;
  const margem = calcularMargemProduto({
    preco: precoSimulado,
    custo: analise.custoEstimado,
  });
  let recomendacao: SimulacaoDescontoStatus = "SEGURO";
  let risco = "Margem preservada dentro do limite seguro.";
  let motivo = "Preco simulado respeita o minimo seguro calculado.";

  if (analise.custoAusente || analise.classificacao === "DADOS_INSUFICIENTES") {
    recomendacao = "BLOQUEADO";
    risco = "Sem custo cadastrado, nao ha margem confiavel.";
    motivo = "Cadastre custo antes de qualquer desconto.";
  } else if (!analise.descontoPermitido && descontoCalculado > 0) {
    recomendacao = "BLOQUEADO";
    risco = "Produto esta protegido ou desconto nao se justifica pelos sinais atuais.";
    motivo = analise.motivo;
  } else if (precoSimulado < analise.precoMinimoSeguro || margem.margemBrutaPct < analise.margemMinimaDesejadaPct) {
    recomendacao = "NAO_RECOMENDADO";
    risco = "Desconto compromete a margem minima segura.";
    motivo = "Use vitrine, combo ou conteudo organico em vez de desconto direto.";
  } else if (descontoCalculado > analise.descontoMaximoSeguroPct * 0.75) {
    recomendacao = "ACEITAVEL_COM_CAUTELA";
    risco = "Desconto perto do limite maximo seguro.";
    motivo = "Limite periodo, canal e quantidade antes de qualquer acao real.";
  }

  return {
    produtoId,
    descontoPercentual: descontoCalculado,
    novoPreco: precoSimulado,
    novaMargemValor: margem.margemBrutaValor,
    novaMargemPct: margem.margemBrutaPct,
    risco,
    recomendacao,
    motivo,
  };
}

export function serializarAnalisePrecificacao(analise: PrecificacaoProdutoAnalise) {
  return analise;
}
