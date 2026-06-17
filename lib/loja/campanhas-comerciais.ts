import "server-only";

import type { CampanhaComercial, Prisma, RecomendacaoGerencial } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { montarIntencaoComercial } from "@/lib/loja/intencao-comercial";

export const CAMPANHA_COMERCIAL_TIPOS = [
  "EXPOSICAO",
  "VALIDACAO",
  "CONVERSAO",
  "GIRO_ESTOQUE",
  "REPOSICAO",
  "MARGEM",
  "PRESENTE",
  "SAZONAL",
  "CUPOM_CONTROLADO",
  "BUSCA_SEM_RESULTADO",
] as const;

export const CAMPANHA_COMERCIAL_STATUS = [
  "RASCUNHO",
  "PLANEJADA",
  "EM_EXECUCAO",
  "CONCLUIDA",
  "CANCELADA",
] as const;

const STATUS_CAMPANHA_ABERTA = ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"];
const STATUS_RECOMENDACAO_ABERTA = ["NOVA", "ACEITA", "EM_EXECUCAO"];
const SIMULATION_MARKER = "[SIMULACAO_2_MESES_STELLA]";

type CampanhaComercialTipo = (typeof CAMPANHA_COMERCIAL_TIPOS)[number];
type CampanhaComercialStatus = (typeof CAMPANHA_COMERCIAL_STATUS)[number];

type RecomendacaoComProduto = RecomendacaoGerencial & {
  produto?: {
    id: string;
    nome: string;
    codigoInterno: string;
    precoVenda: number;
    precoPromocional: number | null;
    descontoAtivo: boolean;
    custoBase: number;
  } | null;
};

type CandidatoCampanha = {
  titulo: string;
  objetivo: string;
  tipo: CampanhaComercialTipo;
  origem: string;
  recomendacaoId?: string | null;
  produtoId?: string | null;
  categoriaId?: string | null;
  descricao: string;
  estrategia: string;
  publicoAlvo?: string | null;
  canalPrincipal: string;
  canaisJson: Prisma.InputJsonValue;
  produtosJson: Prisma.InputJsonValue;
  acoesJson: Prisma.InputJsonValue;
  metasJson: Prisma.InputJsonValue;
  riscosJson: Prisma.InputJsonValue;
  orcamentoSugerido?: number | null;
  descontoSugerido?: number | null;
  cupomSugerido?: string | null;
  dataInicioSugerida: Date;
  dataFimSugerida: Date;
};

export type CampanhaComercialSerializada = {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string;
  tipo: string;
  status: string;
  origem: string;
  recomendacaoId: string | null;
  produtoId: string | null;
  categoriaId: string | null;
  descricao: string;
  estrategia: string;
  publicoAlvo: string | null;
  canalPrincipal: string;
  canaisJson: unknown;
  produtosJson: unknown;
  acoesJson: unknown;
  metasJson: unknown;
  riscosJson: unknown;
  orcamentoSugerido: number | null;
  descontoSugerido: number | null;
  cupomSugerido: string | null;
  dataInicioSugerida: string | null;
  dataFimSugerida: string | null;
  resultadoJson: unknown;
  criadoEm: string;
  atualizadoEm: string;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
  recomendacao?: {
    id: string;
    codigo: string;
    titulo: string;
    status: string;
  } | null;
};

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function evidenciaCampanhaSuficiente(evidencias: Record<string, unknown>) {
  const nivel = String(evidencias.nivelEvidencia || "");
  if (nivel === "EVIDENCIA_MODERADA" || nivel === "EVIDENCIA_FORTE") return true;

  const vendas = numero(evidencias.vendasQuantidade || evidencias.vendas);
  const sellThrough = numero(evidencias.sellThrough);
  const visualizacoes = numero(evidencias.visualizacoes);
  const favoritos = numero(evidencias.favoritos);
  const carrinhos = numero(evidencias.carrinhos || evidencias.adicoesCarrinho);
  const scoreInteresse = numero(evidencias.scoreInteresse);

  return (
    vendas >= 1 ||
    sellThrough >= 35 ||
    visualizacoes >= 12 ||
    favoritos >= 1 ||
    carrinhos >= 1 ||
    scoreInteresse >= 18
  );
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
}

function adicionarDias(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data;
}

function codigoCampanha(tipo: string) {
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

function produtoJson(recomendacao: RecomendacaoComProduto) {
  const produto = recomendacao.produto;

  return [
    {
      produtoId: recomendacao.produtoId,
      codigo: produto?.codigoInterno || null,
      nome: produto?.nome || recomendacao.titulo,
      precoAtual: produto?.descontoAtivo
        ? produto.precoPromocional || produto.precoVenda
        : produto?.precoVenda || null,
      custoBase: produto?.custoBase || null,
    },
  ];
}

function contemDadoSimulado(recomendacao: RecomendacaoGerencial) {
  return [
    recomendacao.titulo,
    recomendacao.descricao,
    recomendacao.motivo,
    recomendacao.acaoSugerida,
    JSON.stringify(recomendacao.evidenciasJson || {}),
  ].some((item) => String(item || "").includes(SIMULATION_MARKER));
}

export function avaliarTipoCampanha(
  recomendacao: Pick<RecomendacaoGerencial, "tipo" | "titulo" | "origemTipo" | "evidenciasJson">
): CampanhaComercialTipo {
  const texto = `${recomendacao.tipo} ${recomendacao.titulo} ${recomendacao.origemTipo}`.toUpperCase();
  const evidencias = jsonRecord(recomendacao.evidenciasJson);
  const statusComercial = String(evidencias.statusComercial || "").toUpperCase();
  const recomendacaoProduto = String(evidencias.recomendacao || "").toUpperCase();

  if (texto.includes("BUSCA") || recomendacao.origemTipo === "INTENCAO_BUSCA") {
    return "BUSCA_SEM_RESULTADO";
  }
  if (texto.includes("ESTOQUE PARADO") || statusComercial === "ESTOQUE_PARADO") {
    return "GIRO_ESTOQUE";
  }
  if (texto.includes("POUCO TESTADO") || recomendacaoProduto === "EXPOR_MAIS") {
    return "EXPOSICAO";
  }
  if (
    texto.includes("INTERESSE") ||
    texto.includes("REVISAR OFERTA") ||
    statusComercial === "INTERESSE_SEM_CONVERSAO"
  ) {
    return "CONVERSAO";
  }
  if (texto.includes("MARGEM") || recomendacao.tipo === "PRECIFICACAO") {
    return "MARGEM";
  }
  if (recomendacao.tipo === "REPOSICAO") {
    return "REPOSICAO";
  }
  if (recomendacao.tipo === "MARKETING" || texto.includes("MARKETING")) {
    return "VALIDACAO";
  }

  return "VALIDACAO";
}

function recomendacaoPodeGerarCampanha(
  recomendacao: Pick<RecomendacaoGerencial, "tipo" | "origemTipo" | "evidenciasJson">
) {
  const evidencias = jsonRecord(recomendacao.evidenciasJson);

  if (recomendacao.origemTipo === "INTENCAO_BUSCA") return true;
  if (recomendacao.tipo === "MARKETING") return true;

  return evidenciaCampanhaSuficiente(evidencias);
}

export function montarMetasCampanha(tipo: CampanhaComercialTipo, evidencias: Record<string, unknown>) {
  const visualizacoes = Math.max(20, Math.ceil(numero(evidencias.visualizacoes) * 1.5));
  const favoritos = Math.max(2, Math.ceil(numero(evidencias.favoritos) + 2));
  const carrinhos = Math.max(1, Math.ceil(numero(evidencias.carrinhos) + 1));

  return {
    visualizacoesEsperadas: visualizacoes,
    favoritosEsperados: favoritos,
    carrinhosEsperados: carrinhos,
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

export function montarAcoesCampanha(tipo: CampanhaComercialTipo) {
  const base = {
    EXPOSICAO: [
      "Destacar o produto em vitrine editorial sem desconto.",
      "Publicar conteudo organico curto antes de investir em trafego.",
      "Acompanhar visualizacoes, favoritos e carrinhos por 7 a 14 dias.",
    ],
    VALIDACAO: [
      "Validar promessa, foto e posicionamento com canais organicos.",
      "Evitar trafego pago ate a oferta provar interesse minimo.",
      "Medir cliques e carrinhos antes de decidir desconto.",
    ],
    CONVERSAO: [
      "Revisar foto, descricao, preco, frete e condicao de compra.",
      "Testar destaque sem desconto; liberar desconto apenas se margem permitir.",
      "Acompanhar carrinho e conversao por produto.",
    ],
    GIRO_ESTOQUE: [
      "Planejar vitrine, combo ou cupom controlado para estoque parado.",
      "Definir limite de desconto por margem minima.",
      "Evitar misturar campeoes com itens parados na mesma oferta.",
    ],
    REPOSICAO: [
      "Planejar reposicao pequena antes de ampliar campanha.",
      "Evitar desconto se o estoque esta baixo.",
      "Acompanhar ruptura e margem durante a exposicao.",
    ],
    MARGEM: [
      "Proteger preco de produto com sinal forte.",
      "Priorizar destaque editorial em vez de desconto.",
      "Monitorar margem e estoque antes de ampliar exposicao.",
    ],
    PRESENTE: [
      "Montar curadoria por ocasiao sem ativar vitrine automaticamente.",
      "Selecionar produtos com embalagem e margem adequadas.",
      "Definir mensagem e periodo da campanha.",
    ],
    SAZONAL: [
      "Planejar calendario e janela de comunicacao.",
      "Selecionar produtos com estoque e margem compativeis.",
      "Preparar conteudo sem publicar automaticamente.",
    ],
    CUPOM_CONTROLADO: [
      "Criar proposta de cupom, sem ativar no modulo de cupons.",
      "Limitar uso, prazo e margem minima.",
      "Usar apenas em produtos com estoque parado.",
    ],
    BUSCA_SEM_RESULTADO: [
      "Criar tag, pagina ou colecao para a demanda encontrada.",
      "Avaliar compra futura se a busca for recorrente.",
      "Ajustar termos internos sem publicar builder automaticamente.",
    ],
  } satisfies Record<CampanhaComercialTipo, string[]>;

  return base[tipo];
}

function riscosCampanha(tipo: CampanhaComercialTipo, recomendacao?: RecomendacaoGerencial) {
  const riscos = [
    recomendacao?.risco || "Executar campanha sem medir sinais pode gerar aprendizado fraco.",
    "Plano nao publica cupom, vitrine ou builder automaticamente.",
  ];

  if (tipo === "GIRO_ESTOQUE" || tipo === "CUPOM_CONTROLADO") {
    riscos.push("Desconto amplo pode queimar margem se nao houver limite claro.");
  }
  if (tipo === "REPOSICAO") {
    riscos.push("Campanha sem estoque suficiente pode desperdiçar demanda.");
  }
  if (tipo === "MARGEM") {
    riscos.push("Desconto em produto validado pode reduzir lucro sem necessidade.");
  }

  return riscos;
}

function montarCandidatoDeRecomendacao(
  recomendacao: RecomendacaoComProduto
): CandidatoCampanha {
  const tipo = avaliarTipoCampanha(recomendacao);
  const evidencias = jsonRecord(recomendacao.evidenciasJson);
  const metas = montarMetasCampanha(tipo, evidencias);
  const dadosSimulados = contemDadoSimulado(recomendacao);
  const descontoSugerido =
    tipo === "GIRO_ESTOQUE" || tipo === "CUPOM_CONTROLADO"
      ? Math.min(12, Number(metas.limiteDesconto))
      : 0;
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
    canalPrincipal:
      tipo === "BUSCA_SEM_RESULTADO"
        ? "Busca interna e curadoria"
        : tipo === "VALIDACAO"
          ? "Organico"
          : "Vitrine editorial",
    canaisJson: ["Vitrine editorial", "Organico", "Busca interna"],
    produtosJson: produtoJson(recomendacao),
    acoesJson: montarAcoesCampanha(tipo),
    metasJson: {
      ...metas,
      confiancaAnalise: dadosSimulados ? "REDUZIDA_SIMULACAO" : "NORMAL",
      dadosSimulados,
    },
    riscosJson: dadosSimulados
      ? [
          ...riscosCampanha(tipo, recomendacao),
          "Dados simulados reduzem a confianca da campanha; validar com sinais reais antes de escalar.",
        ]
      : riscosCampanha(tipo, recomendacao),
    orcamentoSugerido: tipo === "VALIDACAO" || tipo === "MARGEM" ? 0 : 150,
    descontoSugerido,
    cupomSugerido: descontoSugerido > 0 ? `PLANO-${normalizarTexto(recomendacao.codigo).toUpperCase()}` : null,
    dataInicioSugerida: adicionarDias(1),
    dataFimSugerida: adicionarDias(duracao),
  };
}

function montarCandidatoBuscaSemResultado(busca: { termo: string; quantidade: number }): CandidatoCampanha {
  const termo = busca.termo.trim();

  return {
    titulo: `Campanha para busca sem resultado: ${termo}`,
    objetivo: "Transformar demanda recorrente da busca em curadoria, tag ou compra futura.",
    tipo: "BUSCA_SEM_RESULTADO",
    origem: "INTENCAO_COMERCIAL",
    descricao: `${busca.quantidade} busca(s) sem resultado indicam demanda nao atendida.`,
    estrategia: "Planejar tag, colecao ou pagina de curadoria sem publicar builder automaticamente.",
    publicoAlvo: "Clientes que pesquisam termos relacionados na loja.",
    canalPrincipal: "Busca interna",
    canaisJson: ["Busca interna", "Curadoria", "Vitrine editorial"],
    produtosJson: [],
    acoesJson: montarAcoesCampanha("BUSCA_SEM_RESULTADO"),
    metasJson: montarMetasCampanha("BUSCA_SEM_RESULTADO", { buscas: busca.quantidade }),
    riscosJson: ["Criar campanha sem produto adequado pode frustrar a demanda.", "Nenhuma pagina sera publicada automaticamente."],
    orcamentoSugerido: 0,
    descontoSugerido: 0,
    cupomSugerido: null,
    dataInicioSugerida: adicionarDias(1),
    dataFimSugerida: adicionarDias(14),
  };
}

export async function deduplicarCampanhaComercial(candidato: CandidatoCampanha) {
  const or: Prisma.CampanhaComercialWhereInput[] = [];

  if (candidato.recomendacaoId) {
    or.push({ recomendacaoId: candidato.recomendacaoId });
  }
  if (candidato.produtoId) {
    or.push({ tipo: candidato.tipo, produtoId: candidato.produtoId });
  }
  if (candidato.categoriaId) {
    or.push({ tipo: candidato.tipo, categoriaId: candidato.categoriaId });
  }
  if (!candidato.recomendacaoId && !candidato.produtoId && !candidato.categoriaId) {
    or.push({ tipo: candidato.tipo, titulo: candidato.titulo });
  }

  return prisma.campanhaComercial.findFirst({
    where: {
      status: { in: STATUS_CAMPANHA_ABERTA },
      OR: or,
    },
    orderBy: { criadoEm: "desc" },
  });
}

export async function gerarCampanhaAPartirDeRecomendacao(
  recomendacaoId: string
) {
  const recomendacao = await prisma.recomendacaoGerencial.findUnique({
    where: { id: recomendacaoId },
    include: {
      produto: {
        select: {
          id: true,
          nome: true,
          codigoInterno: true,
          precoVenda: true,
          precoPromocional: true,
          descontoAtivo: true,
          custoBase: true,
        },
      },
    },
  });

  if (!recomendacao) {
    throw new Error("Recomendacao nao encontrada.");
  }

  const candidato = montarCandidatoDeRecomendacao(recomendacao);
  const existente = await deduplicarCampanhaComercial(candidato);

  if (existente) {
    return { campanha: existente, criada: false };
  }

  const campanha = await prisma.campanhaComercial.create({
    data: {
      codigo: codigoCampanha(candidato.tipo),
      ...candidato,
    },
  });

  return { campanha, criada: true };
}

export async function gerarCampanhasComerciais() {
  const [recomendacoes, intencao] = await Promise.all([
    prisma.recomendacaoGerencial.findMany({
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
            precoVenda: true,
            precoPromocional: true,
            descontoAtivo: true,
            custoBase: true,
          },
        },
      },
      orderBy: [{ prioridade: "asc" }, { criadoEm: "desc" }],
      take: 80,
    }),
    montarIntencaoComercial({ dias: 30 }),
  ]);

  const candidatos = [
    ...recomendacoes
      .filter(recomendacaoPodeGerarCampanha)
      .map(montarCandidatoDeRecomendacao),
    ...intencao.buscasSemResultado
      .filter((busca) => busca.quantidade >= 2)
      .slice(0, 8)
      .map(montarCandidatoBuscaSemResultado),
  ];
  const criadas: CampanhaComercial[] = [];
  const existentes: CampanhaComercial[] = [];

  for (const candidato of candidatos) {
    const existente = await deduplicarCampanhaComercial(candidato);

    if (existente) {
      existentes.push(existente);
      continue;
    }

    const campanha = await prisma.campanhaComercial.create({
      data: {
        codigo: codigoCampanha(candidato.tipo),
        ...candidato,
      },
    });
    criadas.push(campanha);
  }

  return {
    candidatos: candidatos.length,
    criadas,
    existentes,
    totalAbertas: await prisma.campanhaComercial.count({
      where: { status: { in: STATUS_CAMPANHA_ABERTA } },
    }),
    porTipo: criadas.reduce<Record<string, number>>((acc, campanha) => {
      acc[campanha.tipo] = (acc[campanha.tipo] || 0) + 1;
      return acc;
    }, {}),
  };
}

export async function listarCampanhasComerciais(params: {
  status?: string | string[];
  tipo?: string | string[];
  take?: number;
} = {}) {
  const status = Array.isArray(params.status)
    ? params.status
    : params.status
      ? [params.status]
      : undefined;
  const tipo = Array.isArray(params.tipo)
    ? params.tipo
    : params.tipo
      ? [params.tipo]
      : undefined;

  return prisma.campanhaComercial.findMany({
    where: {
      ...(status?.length ? { status: { in: status } } : {}),
      ...(tipo?.length ? { tipo: { in: tipo } } : {}),
    },
    include: {
      recomendacao: {
        select: {
          id: true,
          codigo: true,
          titulo: true,
          status: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    take: Math.min(Math.max(params.take || 200, 1), 300),
  });
}

export async function obterResumoCampanhasComerciais() {
  const grupos = await prisma.campanhaComercial.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return grupos.reduce<Record<string, number>>((acc, grupo) => {
    acc[grupo.status] = grupo._count._all;
    return acc;
  }, {});
}

export async function atualizarCampanhaComercial({
  id,
  status,
  resultado,
}: {
  id: string;
  status?: string;
  resultado?: unknown;
}) {
  const data: Prisma.CampanhaComercialUpdateInput = {};
  const statusNormalizado = String(status || "").trim().toUpperCase();

  if (statusNormalizado) {
    if (!CAMPANHA_COMERCIAL_STATUS.includes(statusNormalizado as CampanhaComercialStatus)) {
      throw new Error("Status de campanha invalido.");
    }
    data.status = statusNormalizado;
    if (statusNormalizado === "EM_EXECUCAO") data.iniciadaEm = new Date();
    if (statusNormalizado === "CONCLUIDA") data.concluidaEm = new Date();
    if (statusNormalizado === "CANCELADA") data.canceladaEm = new Date();
  }

  if (resultado !== undefined) {
    data.resultadoJson = jsonRecord(resultado) as Prisma.InputJsonValue;
  }

  return prisma.campanhaComercial.update({
    where: { id },
    data,
    include: {
      recomendacao: {
        select: {
          id: true,
          codigo: true,
          titulo: true,
          status: true,
        },
      },
    },
  });
}

export function serializarCampanhaComercial(
  campanha: CampanhaComercial & {
    recomendacao?: {
      id: string;
      codigo: string;
      titulo: string;
      status: string;
    } | null;
  }
): CampanhaComercialSerializada {
  return {
    ...campanha,
    dataInicioSugerida: campanha.dataInicioSugerida?.toISOString() || null,
    dataFimSugerida: campanha.dataFimSugerida?.toISOString() || null,
    criadoEm: campanha.criadoEm.toISOString(),
    atualizadoEm: campanha.atualizadoEm.toISOString(),
    iniciadaEm: campanha.iniciadaEm?.toISOString() || null,
    concluidaEm: campanha.concluidaEm?.toISOString() || null,
    canceladaEm: campanha.canceladaEm?.toISOString() || null,
    recomendacao: campanha.recomendacao || null,
  };
}
