import "server-only";

import { prisma } from "@/lib/prisma";
import { extrairAlertasOperacionais } from "@/lib/pedidos/alertas-operacionais";
import { extrairEntregaManualPedido } from "@/lib/pedidos/entrega-manual";
import {
  etapaOperacionalPedido,
  labelEtapaOperacional,
  labelModalidadeOperacional,
  modalidadeOperacional,
  proximaAcaoMelhorEnvio,
  proximoPassoOperacional,
  type EtapaOperacional,
} from "@/lib/pedidos/etapas-operacionais";

export type PrioridadePedidoOperacional =
  | "CRITICA"
  | "ALTA"
  | "MEDIA"
  | "BAIXA";

export type TipoEntregaPainel = "ENVIO" | "RETIRADA" | "MANUAL" | "OUTRO";

export type ColunaPainelPedidosId =
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO_RECEBIDO"
  | "EM_SEPARACAO"
  | "SEPARADO"
  | "ETIQUETA_PENDENTE"
  | "RETIRADA_LOCAL"
  | "POSTAGEM_ENTREGA"
  | "CONCLUIDOS"
  | "PROBLEMAS";

export type PedidoOperacionalCard = {
  id: string;
  codigo: string;
  clienteNome: string;
  cidadeEstado: string | null;
  etapa: EtapaOperacional;
  etapaLabel: string;
  colunaId: ColunaPainelPedidosId;
  prioridade: PrioridadePedidoOperacional;
  proximaAcao: string;
  descricaoAcao: string;
  alerta: string | null;
  diasNaEtapa: number;
  atrasado: boolean;
  etiquetaPendente: boolean;
  problema: boolean;
  retiradaPendente: boolean;
  tipoEntrega: TipoEntregaPainel;
  tipoEntregaLabel: string;
  statusPagamento: string;
  statusEnvio: string | null;
  atualizadoEm: string;
  href: string;
};

export type ColunaPainelPedidos = {
  id: ColunaPainelPedidosId;
  titulo: string;
  descricao: string;
  cards: PedidoOperacionalCard[];
};

export type ResumoPainelPedidos = {
  pagosAguardandoPreparo: number;
  emSeparacao: number;
  etiquetasPendentes: number;
  pedidosComProblema: number;
  retiradasPendentes: number;
  concluidosRecentes: number;
  atrasados: number;
};

export type PainelOperacionalPedidosData = {
  resumo: ResumoPainelPedidos;
  colunas: ColunaPainelPedidos[];
  totalCards: number;
  atualizadoEm: string;
};

const COLUNAS: Omit<ColunaPainelPedidos, "cards">[] = [
  {
    id: "AGUARDANDO_PAGAMENTO",
    titulo: "Aguardando pagamento",
    descricao: "Pedidos ainda sem confirmacao de pagamento.",
  },
  {
    id: "PAGO_RECEBIDO",
    titulo: "Pago / recebido",
    descricao: "Pedidos pagos que precisam entrar no preparo.",
  },
  {
    id: "EM_SEPARACAO",
    titulo: "Em separacao",
    descricao: "Itens em conferencia pela operacao.",
  },
  {
    id: "SEPARADO",
    titulo: "Separado",
    descricao: "Pedidos separados aguardando proximo passo.",
  },
  {
    id: "ETIQUETA_PENDENTE",
    titulo: "Etiqueta pendente",
    descricao: "Melhor Envio ou envio que precisa de preparo/etiqueta.",
  },
  {
    id: "RETIRADA_LOCAL",
    titulo: "Retirada local",
    descricao: "Pedidos prontos ou aguardando retirada.",
  },
  {
    id: "POSTAGEM_ENTREGA",
    titulo: "Postagem / entrega",
    descricao: "Pedidos postados, enviados ou em rota.",
  },
  {
    id: "CONCLUIDOS",
    titulo: "Concluidos recentes",
    descricao: "Entregues nos ultimos dias para acompanhamento rapido.",
  },
  {
    id: "PROBLEMAS",
    titulo: "Problema / cancelado",
    descricao: "Excecoes que pedem revisao antes de seguir.",
  },
];

type PedidoPainelRaw = Awaited<ReturnType<typeof buscarPedidosPainelRaw>>[number];

function diferencaDias(data: Date | null | undefined, agora: Date) {
  if (!data) {
    return 0;
  }

  const diff = agora.getTime() - data.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function inicioJanelaRecente(agora: Date) {
  const data = new Date(agora);
  data.setDate(data.getDate() - 7);
  return data;
}

function cidadeEstado(pedido: PedidoPainelRaw) {
  return [pedido.cidade, pedido.estado].filter(Boolean).join(" / ") || null;
}

function tipoEntregaPainel(
  modalidade: ReturnType<typeof modalidadeOperacional>
): TipoEntregaPainel {
  if (modalidade === "RETIRADA") return "RETIRADA";
  if (modalidade === "ENTREGA_MANUAL") return "MANUAL";
  if (modalidade === "MELHOR_ENVIO" || modalidade === "ENTREGA") {
    return "ENVIO";
  }

  return "OUTRO";
}

function isProblema(etapa: EtapaOperacional) {
  return etapa === "PROBLEMA_OPERACIONAL" || etapa === "CANCELADO";
}

function isFluxoAtivo(etapa: EtapaOperacional) {
  return !["ENTREGUE", "CANCELADO"].includes(etapa);
}

function isEtiquetaPendente(
  pedido: PedidoPainelRaw,
  modalidade: ReturnType<typeof modalidadeOperacional>
) {
  return (
    pedido.statusPagamento === "PAGO" &&
    modalidade === "MELHOR_ENVIO" &&
    ["PENDENTE", "PREPARADO", "ETIQUETA_COMPRADA", "ETIQUETA_GERADA"].includes(
      pedido.envio?.statusEnvio || ""
    )
  );
}

function isRetiradaPendente(
  etapa: EtapaOperacional,
  modalidade: ReturnType<typeof modalidadeOperacional>
) {
  return (
    modalidade === "RETIRADA" &&
    ["SEPARADO", "AGUARDANDO_RETIRADA"].includes(etapa)
  );
}

function colunaPedido({
  etapa,
  etiquetaPendente,
  retiradaPendente,
}: {
  etapa: EtapaOperacional;
  etiquetaPendente: boolean;
  retiradaPendente: boolean;
}): ColunaPainelPedidosId {
  if (isProblema(etapa)) return "PROBLEMAS";
  if (etapa === "AGUARDANDO_PAGAMENTO") return "AGUARDANDO_PAGAMENTO";
  if (etiquetaPendente) return "ETIQUETA_PENDENTE";
  if (retiradaPendente) return "RETIRADA_LOCAL";
  if (etapa === "PAGO" || etapa === "PEDIDO_RECEBIDO") return "PAGO_RECEBIDO";
  if (etapa === "EM_SEPARACAO") return "EM_SEPARACAO";
  if (etapa === "SEPARADO") return "SEPARADO";
  if (etapa === "SAIU_PARA_ENTREGA" || etapa === "ENVIADO") {
    return "POSTAGEM_ENTREGA";
  }
  if (etapa === "ENTREGUE") return "CONCLUIDOS";

  return "PAGO_RECEBIDO";
}

function prioridadePedido({
  etapa,
  atrasado,
  etiquetaPendente,
  retiradaPendente,
}: {
  etapa: EtapaOperacional;
  atrasado: boolean;
  etiquetaPendente: boolean;
  retiradaPendente: boolean;
}): PrioridadePedidoOperacional {
  if (isProblema(etapa) || atrasado) return "CRITICA";
  if (etiquetaPendente || retiradaPendente) return "ALTA";
  if (isFluxoAtivo(etapa)) return "MEDIA";
  return "BAIXA";
}

function proximaAcaoPedido(
  pedido: Parameters<typeof proximoPassoOperacional>[0],
  etapa: EtapaOperacional
) {
  const acaoMelhorEnvio = proximaAcaoMelhorEnvio(pedido);

  if (acaoMelhorEnvio) {
    return {
      proximaAcao: acaoMelhorEnvio,
      descricaoAcao:
        "Abra o pedido para executar a acao logistica com os controles existentes.",
    };
  }

  const proximoPasso = proximoPassoOperacional(pedido);

  if (proximoPasso) {
    return {
      proximaAcao: proximoPasso.label,
      descricaoAcao: proximoPasso.descricao,
    };
  }

  if (etapa === "AGUARDANDO_PAGAMENTO") {
    return {
      proximaAcao: "Aguardar pagamento",
      descricaoAcao: "Sem acao operacional ate a confirmacao do pagamento.",
    };
  }

  if (etapa === "PROBLEMA_OPERACIONAL") {
    return {
      proximaAcao: "Ver problema",
      descricaoAcao: "Revise o pedido antes de executar qualquer proximo passo.",
    };
  }

  if (etapa === "CANCELADO") {
    return {
      proximaAcao: "Sem acao necessaria",
      descricaoAcao: "Pedido cancelado ou pagamento encerrado.",
    };
  }

  if (etapa === "ENTREGUE") {
    return {
      proximaAcao: "Acompanhar pos-venda",
      descricaoAcao: "Pedido concluido recentemente.",
    };
  }

  return {
    proximaAcao: "Ver pedido",
    descricaoAcao: "Abra o detalhe para conferir o proximo passo.",
  };
}

function deveExibirPedido(
  etapa: EtapaOperacional,
  atualizadoEm: Date,
  agora: Date
) {
  if (etapa !== "ENTREGUE" && etapa !== "CANCELADO") {
    return true;
  }

  return atualizadoEm >= inicioJanelaRecente(agora);
}

async function buscarPedidosPainelRaw() {
  return prisma.pedidoOnline.findMany({
    orderBy: {
      atualizadoEm: "desc",
    },
    take: 250,
    select: {
      id: true,
      codigo: true,
      origemCanal: true,
      nomeCliente: true,
      cidade: true,
      estado: true,
      status: true,
      statusPagamento: true,
      gatewayPagamento: true,
      criadoEm: true,
      atualizadoEm: true,
      pagoEm: true,
      dadosOriginaisJson: true,
      cliente: {
        select: {
          nome: true,
        },
      },
      envio: {
        select: {
          tipoEntrega: true,
          statusEnvio: true,
          gatewayLogistico: true,
          gatewayEnvioId: true,
          codigoRastreio: true,
          atualizadoEm: true,
          postadoEm: true,
          entregueEm: true,
          observacoes: true,
        },
      },
      itens: {
        select: {
          quantidade: true,
        },
      },
      statusHistorico: {
        orderBy: {
          criadoEm: "desc",
        },
        take: 1,
        select: {
          statusNovo: true,
          observacao: true,
          criadoEm: true,
        },
      },
    },
  });
}

function montarCardPedido(pedido: PedidoPainelRaw, agora: Date) {
  const alertasOperacionais = extrairAlertasOperacionais(
    pedido.dadosOriginaisJson
  );
  const entregaManual = extrairEntregaManualPedido(
    pedido.dadosOriginaisJson,
    pedido.envio?.observacoes
  );
  const baseOperacional = {
    status: pedido.status,
    statusPagamento: pedido.statusPagamento,
    origemCanal: pedido.origemCanal,
    gatewayPagamento: pedido.gatewayPagamento,
    alertasOperacionais,
    entregaManual,
    envio: pedido.envio,
  };
  const etapa = etapaOperacionalPedido(baseOperacional);
  const modalidade = modalidadeOperacional(baseOperacional);
  const etiquetaPendente = isEtiquetaPendente(pedido, modalidade);
  const retiradaPendente = isRetiradaPendente(etapa, modalidade);
  const dataEtapa =
    pedido.statusHistorico[0]?.criadoEm ||
    pedido.envio?.atualizadoEm ||
    pedido.pagoEm ||
    pedido.atualizadoEm ||
    pedido.criadoEm;
  const diasNaEtapa = diferencaDias(dataEtapa, agora);
  const atrasado =
    pedido.statusPagamento === "PAGO" &&
    ["PEDIDO_RECEBIDO", "PAGO", "EM_SEPARACAO", "SEPARADO"].includes(etapa) &&
    diasNaEtapa >= 2;
  const problema = isProblema(etapa);
  const { proximaAcao, descricaoAcao } = proximaAcaoPedido(
    baseOperacional,
    etapa
  );
  const alertaOperacional = alertasOperacionais[0]?.mensagem || null;
  const alerta =
    alertaOperacional ||
    (atrasado ? `Parado ha ${diasNaEtapa} dia(s).` : null) ||
    (etiquetaPendente ? "Etiqueta ou preparacao logistica pendente." : null);

  return {
    id: pedido.id,
    codigo: pedido.codigo,
    clienteNome: pedido.cliente?.nome || pedido.nomeCliente,
    cidadeEstado: cidadeEstado(pedido),
    etapa,
    etapaLabel: labelEtapaOperacional(etapa),
    colunaId: colunaPedido({ etapa, etiquetaPendente, retiradaPendente }),
    prioridade: prioridadePedido({
      etapa,
      atrasado,
      etiquetaPendente,
      retiradaPendente,
    }),
    proximaAcao,
    descricaoAcao,
    alerta,
    diasNaEtapa,
    atrasado,
    etiquetaPendente,
    problema,
    retiradaPendente,
    tipoEntrega: tipoEntregaPainel(modalidade),
    tipoEntregaLabel: labelModalidadeOperacional(modalidade),
    statusPagamento: pedido.statusPagamento,
    statusEnvio: pedido.envio?.statusEnvio || null,
    atualizadoEm: pedido.atualizadoEm.toISOString(),
    href: `/pedidos/${pedido.id}`,
  } satisfies PedidoOperacionalCard;
}

function montarResumo(cards: PedidoOperacionalCard[]): ResumoPainelPedidos {
  return {
    pagosAguardandoPreparo: cards.filter(
      (card) =>
        card.statusPagamento === "PAGO" &&
        ["PAGO", "PEDIDO_RECEBIDO"].includes(card.etapa)
    ).length,
    emSeparacao: cards.filter((card) => card.etapa === "EM_SEPARACAO").length,
    etiquetasPendentes: cards.filter((card) => card.etiquetaPendente).length,
    pedidosComProblema: cards.filter((card) => card.problema).length,
    retiradasPendentes: cards.filter((card) => card.retiradaPendente).length,
    concluidosRecentes: cards.filter((card) => card.etapa === "ENTREGUE")
      .length,
    atrasados: cards.filter((card) => card.atrasado).length,
  };
}

export async function montarPainelOperacionalPedidos(): Promise<PainelOperacionalPedidosData> {
  const agora = new Date();
  const pedidos = await buscarPedidosPainelRaw();
  const cards = pedidos
    .map((pedido) => montarCardPedido(pedido, agora))
    .filter((card) => deveExibirPedido(card.etapa, new Date(card.atualizadoEm), agora));
  const cardsOrdenados = [...cards].sort((a, b) => {
    const pesoPrioridade: Record<PrioridadePedidoOperacional, number> = {
      CRITICA: 4,
      ALTA: 3,
      MEDIA: 2,
      BAIXA: 1,
    };
    const prioridade = pesoPrioridade[b.prioridade] - pesoPrioridade[a.prioridade];

    if (prioridade !== 0) {
      return prioridade;
    }

    return b.diasNaEtapa - a.diasNaEtapa;
  });

  return {
    resumo: montarResumo(cardsOrdenados),
    colunas: COLUNAS.map((coluna) => ({
      ...coluna,
      cards: cardsOrdenados.filter((card) => card.colunaId === coluna.id),
    })),
    totalCards: cardsOrdenados.length,
    atualizadoEm: agora.toISOString(),
  };
}
