import type { RecomendacaoGerencialResumo } from "@/lib/financeiro/recomendacoes-gerenciais";

export type GrupoCopilotoAdministrativo =
  | "FACA_HOJE"
  | "ACOMPANHE"
  | "NAO_MEXA_AINDA"
  | "BAIXA_EVIDENCIA";

export type ClassificacaoCopilotoAdministrativo =
  | "RECOMENDACAO"
  | "ALERTA"
  | "OBSERVACAO"
  | "NAO_RECOMENDAR";

export type PrioridadeCopilotoAdministrativo =
  | "CRITICA"
  | "ALTA"
  | "MEDIA"
  | "BAIXA";

export type EvidenciaCopilotoAdministrativo =
  | "SEM_EVIDENCIA"
  | "FRACA"
  | "MODERADA"
  | "FORTE";

export type AreaCopilotoAdministrativo =
  | "OPERACAO"
  | "CATALOGO"
  | "MARKETING"
  | "CRM"
  | "FINANCEIRO"
  | "SISTEMA";

export type ConfiancaCopilotoAdministrativo = "BAIXA" | "MEDIA" | "ALTA";

export type PermissoesCopilotoAdministrativo = {
  podeVerDadosFinanceiros: boolean;
  podeEditarRecomendacoes: boolean;
  podeExecutarRecomendacoes: boolean;
  podeVerCampanhas: boolean;
  podeExecutarCampanhas: boolean;
  podeVerProdutos: boolean;
  podeVerPedidos: boolean;
  podeVerClientes: boolean;
  podeVerIntencao: boolean;
  podeVerPrecificacao: boolean;
  podeVerFinanceiro: boolean;
  podeVerResultado: boolean;
  podeVerLoja: boolean;
};

export type RecomendacaoCopilotoAdministrativo = {
  id: string;
  recomendacao: RecomendacaoGerencialResumo;
  titulo: string;
  tipo: string;
  grupo: GrupoCopilotoAdministrativo;
  classificacao: ClassificacaoCopilotoAdministrativo;
  prioridade: PrioridadeCopilotoAdministrativo;
  evidencia: EvidenciaCopilotoAdministrativo;
  confianca?: ConfiancaCopilotoAdministrativo;
  area: AreaCopilotoAdministrativo;
  motivo: string;
  explicacaoExecutiva: string;
  impactoEsperado?: string | null;
  risco?: string | null;
  acaoSugerida?: string | null;
  href?: string | null;
  cta?: string | null;
  podeAgir: boolean;
  motivoParaNaoRecomendar?: string | null;
  dadosSensiveisOcultados: boolean;
  impactoPendente: boolean;
};

export type CopilotoAdministrativoData = {
  recomendacoes: RecomendacaoGerencialResumo[];
  itens: RecomendacaoCopilotoAdministrativo[];
  resumo: {
    total: number;
    impactosPendentes: number;
    grupos: Record<GrupoCopilotoAdministrativo, number>;
    classificacoes: Record<ClassificacaoCopilotoAdministrativo, number>;
  };
};

const GRUPOS: GrupoCopilotoAdministrativo[] = [
  "FACA_HOJE",
  "ACOMPANHE",
  "NAO_MEXA_AINDA",
  "BAIXA_EVIDENCIA",
];

const CLASSIFICACOES: ClassificacaoCopilotoAdministrativo[] = [
  "RECOMENDACAO",
  "ALERTA",
  "OBSERVACAO",
  "NAO_RECOMENDAR",
];

const TIPOS_FINANCEIROS = new Set([
  "FINANCEIRO",
  "CAIXA",
  "PRO_LABORE",
  "PRECIFICACAO",
]);

const CHAVES_SENSIVEIS = [
  "custo",
  "margem",
  "lucro",
  "caixa",
  "receita",
  "precoMinimo",
  "preco_minimo",
  "descontoMaximo",
  "desconto_maximo",
  "proLabore",
  "pro_labore",
  "financeiro",
  "saldo",
  "runway",
];

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function contemChaveSensivel(key: string) {
  const normalizada = key.toLowerCase();

  return CHAVES_SENSIVEIS.some((chave) =>
    normalizada.includes(chave.toLowerCase())
  );
}

function sanitizarJsonSensivel(value: unknown): {
  value: unknown;
  ocultou: boolean;
} {
  if (Array.isArray(value)) {
    let ocultou = false;
    const items = value.map((item) => {
      const result = sanitizarJsonSensivel(item);
      ocultou = ocultou || result.ocultou;
      return result.value;
    });

    return { value: items, ocultou };
  }

  if (!value || typeof value !== "object") {
    return { value, ocultou: false };
  }

  let ocultou = false;
  const record = value as Record<string, unknown>;
  const sanitizado = Object.entries(record).reduce<Record<string, unknown>>(
    (acc, [key, item]) => {
      if (contemChaveSensivel(key)) {
        ocultou = true;
        return acc;
      }

      const result = sanitizarJsonSensivel(item);
      ocultou = ocultou || result.ocultou;
      acc[key] = result.value;
      return acc;
    },
    {}
  );

  if (ocultou) {
    sanitizado.dadosSensiveisOcultados = true;
  }

  return { value: sanitizado, ocultou };
}

function tipoFinanceiro(tipo: string) {
  return TIPOS_FINANCEIROS.has(tipo);
}

function linkPermitido(
  href: string | null | undefined,
  permissoes: PermissoesCopilotoAdministrativo
) {
  if (!href) return null;
  if (href.startsWith("/compras/precificacao")) {
    return permissoes.podeVerPrecificacao && permissoes.podeVerDadosFinanceiros
      ? href
      : null;
  }
  if (href.startsWith("/compras/financeiro")) {
    return permissoes.podeVerFinanceiro && permissoes.podeVerDadosFinanceiros
      ? href
      : null;
  }
  if (href.startsWith("/compras/resultado")) {
    return permissoes.podeVerResultado && permissoes.podeVerDadosFinanceiros
      ? href
      : null;
  }
  if (href.startsWith("/compras/campanhas")) {
    return permissoes.podeVerCampanhas ? href : null;
  }
  if (href.startsWith("/compras/intencao")) {
    return permissoes.podeVerIntencao || permissoes.podeVerLoja ? href : null;
  }
  if (href.startsWith("/produtos")) {
    return permissoes.podeVerProdutos ? href : null;
  }
  if (href.startsWith("/clientes")) {
    return permissoes.podeVerClientes ? href : null;
  }
  if (href.startsWith("/pedidos")) {
    return permissoes.podeVerPedidos ? href : null;
  }
  if (href.startsWith("/configuracoes/loja")) {
    return permissoes.podeVerLoja ? href : null;
  }

  return href;
}

function redigirRecomendacao(
  recomendacao: RecomendacaoGerencialResumo,
  permissoes: PermissoesCopilotoAdministrativo
) {
  const evidencia = jsonRecord(recomendacao.evidenciasJson);
  const sanitizada = permissoes.podeVerDadosFinanceiros
    ? { value: evidencia, ocultou: false }
    : sanitizarJsonSensivel(evidencia);
  const sensivel = tipoFinanceiro(recomendacao.tipo);
  const ocultarTexto = sensivel && !permissoes.podeVerDadosFinanceiros;
  const dadosSensiveisOcultados = ocultarTexto || sanitizada.ocultou;
  const impactos = recomendacao.impactos?.map((impacto) => {
    if (!dadosSensiveisOcultados) {
      return impacto;
    }

    return {
      ...impacto,
      resumo:
        "Impacto estrategico com metricas financeiras ocultadas para este perfil.",
      metricasAntesJson: {
        dadosSensiveisOcultados: true,
      },
      metricasDepoisJson: {
        dadosSensiveisOcultados: true,
      },
      comparativoJson: {
        dadosSensiveisOcultados: true,
      },
      proximaAcaoSugerida:
        "Solicitar leitura de impacto a um perfil financeiro/autorizado.",
    };
  });

  return {
    recomendacao: {
      ...recomendacao,
      descricao: ocultarTexto
        ? "Recomendacao estrategica com dados financeiros ocultados para este perfil."
        : recomendacao.descricao,
      motivo: ocultarTexto
        ? "Dados de custo, margem, caixa ou precificacao exigem perfil financeiro autorizado."
        : recomendacao.motivo,
      impactoEsperado: ocultarTexto
        ? "Impacto restrito a perfis com permissao financeira."
        : recomendacao.impactoEsperado,
      risco: ocultarTexto
        ? "Pode envolver margem, custo, caixa ou preco minimo. Solicite revisao de um perfil autorizado."
        : recomendacao.risco,
      acaoSugerida: ocultarTexto
        ? "Pedir avaliacao a um perfil financeiro/autorizado antes de agir."
        : recomendacao.acaoSugerida,
      linkAcao: linkPermitido(recomendacao.linkAcao, permissoes),
      evidenciasJson: sanitizada.value,
      impactos,
    },
    dadosSensiveisOcultados,
  };
}

function nivelEvidencia(
  evidencias: Record<string, unknown>
): EvidenciaCopilotoAdministrativo {
  const nivel = String(evidencias.nivelEvidencia || "");

  if (nivel === "EVIDENCIA_FORTE") return "FORTE";
  if (nivel === "EVIDENCIA_MODERADA") return "MODERADA";
  if (nivel === "EVIDENCIA_FRACA") return "FRACA";
  return "SEM_EVIDENCIA";
}

function confiancaPorEvidencia(
  evidencias: Record<string, unknown>,
  evidencia: EvidenciaCopilotoAdministrativo
): ConfiancaCopilotoAdministrativo | undefined {
  const declarada = String(
    evidencias.confianca || evidencias.confiancaAnalise || ""
  ).toUpperCase();

  if (["BAIXA", "MEDIA", "ALTA"].includes(declarada)) {
    return declarada as ConfiancaCopilotoAdministrativo;
  }
  if (evidencia === "FORTE") return "ALTA";
  if (evidencia === "MODERADA") return "MEDIA";
  if (evidencia === "FRACA") return "BAIXA";
  return undefined;
}

function areaRecomendacao(tipo: string, origemTipo: string): AreaCopilotoAdministrativo {
  if (origemTipo.includes("CLIENTE") || origemTipo.includes("CRM")) return "CRM";
  if (["REPOSICAO", "ESTOQUE"].includes(tipo)) return "CATALOGO";
  if (["MARKETING", "LOJA", "CRESCIMENTO"].includes(tipo)) return "MARKETING";
  if (tipoFinanceiro(tipo)) return "FINANCEIRO";
  return "SISTEMA";
}

function prioridadeCopiloto(
  prioridade: string,
  evidencia: EvidenciaCopilotoAdministrativo,
  titulo: string
): PrioridadeCopilotoAdministrativo {
  const urgente = /urgente|ruptura|critico|problema/i.test(titulo);

  if (prioridade === "ALTA" && evidencia === "FORTE" && urgente) {
    return "CRITICA";
  }
  if (prioridade === "ALTA") return "ALTA";
  if (prioridade === "MEDIA") return "MEDIA";
  return "BAIXA";
}

function temAcaoClara(recomendacao: RecomendacaoGerencialResumo) {
  return Boolean(
    recomendacao.acaoSugerida ||
      recomendacao.linkAcao ||
      recomendacao.campanhas?.length
  );
}

function impactoPendente(recomendacao: RecomendacaoGerencialResumo) {
  return (
    ["ACEITA", "EM_EXECUCAO", "CONCLUIDA"].includes(recomendacao.status) &&
    !recomendacao.impactos?.length
  );
}

function motivoNaoRecomendar(params: {
  recomendacao: RecomendacaoGerencialResumo;
  evidencias: Record<string, unknown>;
  evidencia: EvidenciaCopilotoAdministrativo;
  dadosSensiveisOcultados: boolean;
  href: string | null;
}) {
  if (params.dadosSensiveisOcultados) {
    return "Nao recomendo acao para este perfil porque parte dos dados sensiveis esta oculta.";
  }
  if (params.evidencias.amostraPequena || params.evidencias.sinalInicial) {
    return "Nao recomendo escalar agora: a amostra ainda e pequena.";
  }
  if (params.evidencia === "SEM_EVIDENCIA" || params.evidencia === "FRACA") {
    return "Sinal acompanhado, mas sem evidencia suficiente para decisao.";
  }
  if (!temAcaoClara(params.recomendacao)) {
    return "Nao ha acao manual clara o suficiente para recomendar agora.";
  }
  if (params.recomendacao.linkAcao && !params.href) {
    return "O link de acao aponta para uma area sem permissao para este perfil.";
  }
  if (params.recomendacao.status === "CONCLUIDA") {
    return "A recomendacao ja foi concluida; agora o melhor passo e avaliar impacto.";
  }
  if (params.recomendacao.status === "IGNORADA") {
    return "A recomendacao foi ignorada conscientemente.";
  }

  return null;
}

function escolherGrupo(params: {
  recomendacao: RecomendacaoGerencialResumo;
  evidencia: EvidenciaCopilotoAdministrativo;
  prioridade: PrioridadeCopilotoAdministrativo;
  evidencias: Record<string, unknown>;
  dadosSensiveisOcultados: boolean;
  href: string | null;
}) {
  const motivoNao = motivoNaoRecomendar(params);

  if (params.dadosSensiveisOcultados || params.recomendacao.status === "IGNORADA") {
    return {
      grupo: "NAO_MEXA_AINDA" as const,
      motivoParaNaoRecomendar: motivoNao,
    };
  }
  if (
    params.evidencia === "SEM_EVIDENCIA" ||
    params.evidencia === "FRACA" ||
    params.evidencias.amostraPequena ||
    params.evidencias.sinalInicial
  ) {
    return {
      grupo: "BAIXA_EVIDENCIA" as const,
      motivoParaNaoRecomendar: motivoNao,
    };
  }
  if (
    motivoNao ||
    params.recomendacao.status === "CONCLUIDA" ||
    (params.recomendacao.linkAcao && !params.href)
  ) {
    return {
      grupo: "NAO_MEXA_AINDA" as const,
      motivoParaNaoRecomendar: motivoNao,
    };
  }
  if (
    ["CRITICA", "ALTA"].includes(params.prioridade) &&
    ["NOVA", "ACEITA", "EM_EXECUCAO"].includes(params.recomendacao.status)
  ) {
    return {
      grupo: "FACA_HOJE" as const,
      motivoParaNaoRecomendar: null,
    };
  }

  return {
    grupo: "ACOMPANHE" as const,
    motivoParaNaoRecomendar: motivoNao,
  };
}

function classificacaoPorGrupo(
  grupo: GrupoCopilotoAdministrativo,
  prioridade: PrioridadeCopilotoAdministrativo
): ClassificacaoCopilotoAdministrativo {
  if (grupo === "NAO_MEXA_AINDA") return "NAO_RECOMENDAR";
  if (grupo === "BAIXA_EVIDENCIA") return "OBSERVACAO";
  if (grupo === "FACA_HOJE" && ["CRITICA", "ALTA"].includes(prioridade)) {
    return "ALERTA";
  }
  return "RECOMENDACAO";
}

function explicacaoExecutiva(params: {
  grupo: GrupoCopilotoAdministrativo;
  evidencia: EvidenciaCopilotoAdministrativo;
  prioridade: PrioridadeCopilotoAdministrativo;
  impactoPendente: boolean;
  motivoParaNaoRecomendar?: string | null;
}) {
  if (params.grupo === "FACA_HOJE") {
    return `Entrou em Faca hoje por combinar prioridade ${params.prioridade.toLowerCase()}, evidencia ${params.evidencia.toLowerCase()} e acao manual clara.`;
  }
  if (params.grupo === "ACOMPANHE") {
    return params.impactoPendente
      ? "Acompanhe porque a acao ja teve andamento e ainda precisa de avaliacao de impacto."
      : "Acompanhe porque ha sinal util, mas a decisao ainda nao exige acao imediata.";
  }
  if (params.grupo === "BAIXA_EVIDENCIA") {
    return "Sinal acompanhado: use para observacao, nao como decisao comercial ainda.";
  }

  return params.motivoParaNaoRecomendar || "Nao recomendo acao agora.";
}

function ctaPorHref(href: string | null, recomendacao: RecomendacaoGerencialResumo) {
  if (!href) return null;
  if (href.startsWith("/produtos")) return "Abrir produto";
  if (href.startsWith("/pedidos")) return "Abrir pedido";
  if (href.startsWith("/clientes")) return "Abrir cliente";
  if (href.startsWith("/compras/campanhas")) return "Abrir campanha";
  if (href.startsWith("/compras/intencao")) return "Abrir intencao";
  if (href.startsWith("/compras/precificacao")) return "Abrir precificacao";
  if (recomendacao.campanhas?.length) return "Ver campanha";
  return "Ver detalhes";
}

function scorePrioridade(prioridade: PrioridadeCopilotoAdministrativo) {
  if (prioridade === "CRITICA") return 4;
  if (prioridade === "ALTA") return 3;
  if (prioridade === "MEDIA") return 2;
  return 1;
}

function scoreEvidencia(evidencia: EvidenciaCopilotoAdministrativo) {
  if (evidencia === "FORTE") return 4;
  if (evidencia === "MODERADA") return 3;
  if (evidencia === "FRACA") return 2;
  return 1;
}

function scoreGrupo(grupo: GrupoCopilotoAdministrativo) {
  if (grupo === "FACA_HOJE") return 4;
  if (grupo === "ACOMPANHE") return 3;
  if (grupo === "NAO_MEXA_AINDA") return 2;
  return 1;
}

function montarItemCopiloto(
  recomendacaoOriginal: RecomendacaoGerencialResumo,
  permissoes: PermissoesCopilotoAdministrativo
): RecomendacaoCopilotoAdministrativo {
  const { recomendacao, dadosSensiveisOcultados } = redigirRecomendacao(
    recomendacaoOriginal,
    permissoes
  );
  const evidencias = jsonRecord(recomendacao.evidenciasJson);
  const evidencia = nivelEvidencia(evidencias);
  const prioridade = prioridadeCopiloto(
    recomendacao.prioridade,
    evidencia,
    recomendacao.titulo
  );
  const href =
    linkPermitido(recomendacao.linkAcao, permissoes) ||
    (recomendacao.campanhas?.length && permissoes.podeVerCampanhas
      ? "/compras/campanhas"
      : null);
  const impactoEmAberto = impactoPendente(recomendacao);
  const grupo = escolherGrupo({
    recomendacao,
    evidencia,
    prioridade,
    evidencias,
    dadosSensiveisOcultados,
    href,
  });
  const classificacao = classificacaoPorGrupo(grupo.grupo, prioridade);
  const podeAgir =
    Boolean(href || permissoes.podeEditarRecomendacoes) &&
    grupo.grupo !== "NAO_MEXA_AINDA" &&
    !dadosSensiveisOcultados;

  return {
    id: recomendacao.id,
    recomendacao,
    titulo: recomendacao.titulo,
    tipo: recomendacao.tipo,
    grupo: grupo.grupo,
    classificacao,
    prioridade,
    evidencia,
    confianca: confiancaPorEvidencia(evidencias, evidencia),
    area: areaRecomendacao(recomendacao.tipo, recomendacao.origemTipo),
    motivo:
      recomendacao.motivo ||
      grupo.motivoParaNaoRecomendar ||
      "Recomendacao sem motivo detalhado.",
    explicacaoExecutiva: explicacaoExecutiva({
      grupo: grupo.grupo,
      evidencia,
      prioridade,
      impactoPendente: impactoEmAberto,
      motivoParaNaoRecomendar: grupo.motivoParaNaoRecomendar,
    }),
    impactoEsperado: recomendacao.impactoEsperado,
    risco: recomendacao.risco,
    acaoSugerida: recomendacao.acaoSugerida,
    href,
    cta: ctaPorHref(href, recomendacao),
    podeAgir,
    motivoParaNaoRecomendar: grupo.motivoParaNaoRecomendar,
    dadosSensiveisOcultados,
    impactoPendente: impactoEmAberto,
  };
}

export function montarCopilotoAdministrativo(
  recomendacoes: RecomendacaoGerencialResumo[],
  permissoes: PermissoesCopilotoAdministrativo
): CopilotoAdministrativoData {
  const itens = recomendacoes
    .map((recomendacao) => montarItemCopiloto(recomendacao, permissoes))
    .sort((a, b) => {
      const grupo = scoreGrupo(b.grupo) - scoreGrupo(a.grupo);
      if (grupo !== 0) return grupo;

      const prioridade = scorePrioridade(b.prioridade) - scorePrioridade(a.prioridade);
      if (prioridade !== 0) return prioridade;

      const evidencia = scoreEvidencia(b.evidencia) - scoreEvidencia(a.evidencia);
      if (evidencia !== 0) return evidencia;

      return (
        new Date(b.recomendacao.criadoEm).getTime() -
        new Date(a.recomendacao.criadoEm).getTime()
      );
    });

  return {
    recomendacoes: itens.map((item) => item.recomendacao),
    itens,
    resumo: {
      total: itens.length,
      impactosPendentes: itens.filter((item) => item.impactoPendente).length,
      grupos: Object.fromEntries(
        GRUPOS.map((grupo) => [
          grupo,
          itens.filter((item) => item.grupo === grupo).length,
        ])
      ) as Record<GrupoCopilotoAdministrativo, number>,
      classificacoes: Object.fromEntries(
        CLASSIFICACOES.map((classificacao) => [
          classificacao,
          itens.filter((item) => item.classificacao === classificacao).length,
        ])
      ) as Record<ClassificacaoCopilotoAdministrativo, number>,
    },
  };
}
