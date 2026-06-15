export type EtapaOperacional =
  | "PEDIDO_RECEBIDO"
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO"
  | "EM_SEPARACAO"
  | "SEPARADO"
  | "AGUARDANDO_RETIRADA"
  | "SAIU_PARA_ENTREGA"
  | "ENVIADO"
  | "ENTREGUE"
  | "PROBLEMA_OPERACIONAL"
  | "CANCELADO";

export type ModalidadeOperacional =
  | "SEM_ENTREGA"
  | "RETIRADA"
  | "ENTREGA_MANUAL"
  | "MELHOR_ENVIO"
  | "ENTREGA"
  | "LINK_PAGAMENTO";

type PedidoOperacionalBase = {
  status: string;
  statusPagamento: string;
  origemCanal?: string | null;
  gatewayPagamento?: string | null;
  linkPagamento?: string | null;
  alertasOperacionais?: unknown[] | null;
  entregaManual?: unknown | null;
  envio?: {
    tipoEntrega?: string | null;
    statusEnvio?: string | null;
    gatewayLogistico?: string | null;
    gatewayEnvioId?: string | null;
  } | null;
};

export type ProximoPassoOperacional = {
  label: string;
  statusNovo: string;
  observacao: string;
  descricao: string;
};

const LABELS_ETAPA: Record<EtapaOperacional, string> = {
  PEDIDO_RECEBIDO: "Pedido recebido",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pedido pago",
  EM_SEPARACAO: "Em separacao",
  SEPARADO: "Pedido separado",
  AGUARDANDO_RETIRADA: "Aguardando retirada",
  SAIU_PARA_ENTREGA: "Saiu para entrega",
  ENVIADO: "Enviado/postado",
  ENTREGUE: "Entregue",
  PROBLEMA_OPERACIONAL: "Problema",
  CANCELADO: "Cancelado",
};

const ESTILOS_ETAPA: Record<
  EtapaOperacional,
  {
    badgeClass: string;
    cardClass: string;
    softClass: string;
    buttonClass: string;
  }
> = {
  PEDIDO_RECEBIDO: {
    badgeClass: "bg-slate-100 text-slate-700 ring-slate-300",
    cardClass: "border-l-slate-400",
    softClass: "bg-slate-50 text-slate-700 ring-slate-200",
    buttonClass: "border-slate-700 bg-slate-900 text-white hover:bg-slate-800",
  },
  AGUARDANDO_PAGAMENTO: {
    badgeClass: "bg-amber-50 text-amber-800 ring-amber-200",
    cardClass: "border-l-amber-400",
    softClass: "bg-amber-50 text-amber-800 ring-amber-200",
    buttonClass: "border-amber-500 bg-amber-500 text-white hover:bg-amber-600",
  },
  PAGO: {
    badgeClass: "bg-blue-50 text-blue-800 ring-blue-200",
    cardClass: "border-l-blue-500",
    softClass: "bg-blue-50 text-blue-800 ring-blue-200",
    buttonClass: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  },
  EM_SEPARACAO: {
    badgeClass: "bg-yellow-50 text-yellow-800 ring-yellow-300",
    cardClass: "border-l-yellow-400",
    softClass: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    buttonClass: "border-yellow-500 bg-yellow-500 text-slate-950 hover:bg-yellow-400",
  },
  SEPARADO: {
    badgeClass: "bg-violet-50 text-violet-800 ring-violet-200",
    cardClass: "border-l-violet-500",
    softClass: "bg-violet-50 text-violet-800 ring-violet-200",
    buttonClass: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
  },
  AGUARDANDO_RETIRADA: {
    badgeClass: "bg-sky-50 text-sky-800 ring-sky-200",
    cardClass: "border-l-sky-500",
    softClass: "bg-sky-50 text-sky-800 ring-sky-200",
    buttonClass: "border-sky-600 bg-sky-600 text-white hover:bg-sky-700",
  },
  SAIU_PARA_ENTREGA: {
    badgeClass: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    cardClass: "border-l-indigo-500",
    softClass: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    buttonClass: "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700",
  },
  ENVIADO: {
    badgeClass: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    cardClass: "border-l-indigo-600",
    softClass: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    buttonClass: "border-indigo-700 bg-indigo-700 text-white hover:bg-indigo-800",
  },
  ENTREGUE: {
    badgeClass: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    cardClass: "border-l-emerald-500",
    softClass: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    buttonClass: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
  },
  PROBLEMA_OPERACIONAL: {
    badgeClass: "bg-red-50 text-red-800 ring-red-200",
    cardClass: "border-l-red-500",
    softClass: "bg-red-50 text-red-800 ring-red-200",
    buttonClass: "border-red-600 bg-red-600 text-white hover:bg-red-700",
  },
  CANCELADO: {
    badgeClass: "bg-slate-200 text-slate-800 ring-slate-300",
    cardClass: "border-l-slate-600",
    softClass: "bg-slate-100 text-slate-700 ring-slate-200",
    buttonClass: "border-slate-600 bg-slate-700 text-white hover:bg-slate-800",
  },
};

export function labelEtapaOperacional(etapa: EtapaOperacional) {
  return LABELS_ETAPA[etapa];
}

export function estiloEtapaOperacional(etapa: EtapaOperacional) {
  return ESTILOS_ETAPA[etapa];
}

export function modalidadeOperacional(
  pedido: Pick<
    PedidoOperacionalBase,
    "envio" | "entregaManual" | "origemCanal" | "gatewayPagamento" | "statusPagamento"
  >,
): ModalidadeOperacional {
  if (
    pedido.origemCanal === "ADMIN_MANUAL" &&
    pedido.gatewayPagamento === "STRIPE" &&
    ["AGUARDANDO_PAGAMENTO", "PENDENTE"].includes(pedido.statusPagamento)
  ) {
    return "LINK_PAGAMENTO";
  }

  if (pedido.entregaManual) {
    return "ENTREGA_MANUAL";
  }

  if (!pedido.envio) {
    return "SEM_ENTREGA";
  }

  if (pedido.envio.tipoEntrega === "RETIRADA") {
    return "RETIRADA";
  }

  if (pedido.envio.gatewayLogistico === "MELHOR_ENVIO") {
    return "MELHOR_ENVIO";
  }

  if (pedido.envio.gatewayLogistico === "ENTREGA_MANUAL") {
    return "ENTREGA_MANUAL";
  }

  return "ENTREGA";
}

export function labelModalidadeOperacional(modalidade: ModalidadeOperacional) {
  if (modalidade === "SEM_ENTREGA") return "Sem entrega";
  if (modalidade === "RETIRADA") return "Retirada";
  if (modalidade === "ENTREGA_MANUAL") return "Entrega manual";
  if (modalidade === "MELHOR_ENVIO") return "Melhor Envio";
  if (modalidade === "LINK_PAGAMENTO") return "Link de pagamento";

  return "Entrega";
}

export function etapaOperacionalPedido(pedido: PedidoOperacionalBase): EtapaOperacional {
  const status = pedido.status;
  const statusEnvio = pedido.envio?.statusEnvio;

  if (
    status === "CANCELADO" ||
    ["CANCELADO", "EXPIRADO", "RECUSADO"].includes(pedido.statusPagamento)
  ) {
    return "CANCELADO";
  }

  if (
    status === "PROBLEMA" ||
    status === "PROBLEMA_OPERACIONAL" ||
    statusEnvio === "PROBLEMA" ||
    (pedido.alertasOperacionais?.length || 0) > 0
  ) {
    return "PROBLEMA_OPERACIONAL";
  }

  if (status === "PEDIDO_ENTREGUE" || status === "ENTREGUE" || statusEnvio === "ENTREGUE") {
    return "ENTREGUE";
  }

  if (status === "PEDIDO_ENVIADO" || statusEnvio === "POSTADO") {
    return "ENVIADO";
  }

  if (status === "SAIU_PARA_ENTREGA" || statusEnvio === "SAIU_PARA_ENTREGA") {
    return "SAIU_PARA_ENTREGA";
  }

  if (status === "AGUARDANDO_RETIRADA" || statusEnvio === "AGUARDANDO_RETIRADA") {
    return "AGUARDANDO_RETIRADA";
  }

  if (status === "SEPARADO" || status === "PEDIDO_SEPARADO") {
    return "SEPARADO";
  }

  if (status === "EM_SEPARACAO") {
    return "EM_SEPARACAO";
  }

  if (["AGUARDANDO_PAGAMENTO", "PENDENTE"].includes(pedido.statusPagamento)) {
    return "AGUARDANDO_PAGAMENTO";
  }

  if (pedido.statusPagamento === "PAGO") {
    return status === "PEDIDO_RECEBIDO" ? "PAGO" : "PEDIDO_RECEBIDO";
  }

  return "PEDIDO_RECEBIDO";
}

export function proximoPassoOperacional(
  pedido: PedidoOperacionalBase,
): ProximoPassoOperacional | null {
  const etapa = etapaOperacionalPedido(pedido);
  const modalidade = modalidadeOperacional(pedido);

  if (
    etapa === "AGUARDANDO_PAGAMENTO" ||
    etapa === "ENTREGUE" ||
    etapa === "CANCELADO" ||
    etapa === "PROBLEMA_OPERACIONAL"
  ) {
    return null;
  }

  if (etapa === "PAGO" || etapa === "PEDIDO_RECEBIDO") {
    return {
      label: "Iniciar separacao",
      statusNovo: "EM_SEPARACAO",
      observacao: "Separacao iniciada pela central operacional.",
      descricao: "Pagamento confirmado. O proximo passo e separar os itens.",
    };
  }

  if (etapa === "EM_SEPARACAO") {
    return {
      label: "Marcar como separado",
      statusNovo: "SEPARADO",
      observacao: "Pedido separado pela central operacional.",
      descricao: "Itens em conferencia. Marque como separado ao finalizar.",
    };
  }

  if (etapa === "SEPARADO") {
    if (modalidade === "MELHOR_ENVIO") {
      return null;
    }

    if (modalidade === "RETIRADA") {
      return {
        label: "Aguardar retirada",
        statusNovo: "AGUARDANDO_RETIRADA",
        observacao: "Pedido separado e aguardando retirada.",
        descricao: "Pedido pronto para o cliente retirar.",
      };
    }

    if (modalidade === "ENTREGA_MANUAL") {
      return {
        label: "Saiu para entrega",
        statusNovo: "SAIU_PARA_ENTREGA",
        observacao: "Pedido saiu para entrega propria.",
        descricao: "Entrega manual pronta para iniciar rota.",
      };
    }

    return {
      label: "Concluir pedido",
      statusNovo: "ENTREGUE",
      observacao: "Pedido concluido pela central operacional.",
      descricao: "Sem fluxo logistico adicional registrado.",
    };
  }

  if (etapa === "AGUARDANDO_RETIRADA") {
    return {
      label: "Marcar como retirado",
      statusNovo: "ENTREGUE",
      observacao: "Pedido retirado pelo cliente.",
      descricao: "Finalize quando o cliente retirar o pedido.",
    };
  }

  if (etapa === "SAIU_PARA_ENTREGA" || etapa === "ENVIADO") {
    return {
      label: "Marcar como entregue",
      statusNovo: "ENTREGUE",
      observacao: "Pedido entregue ao cliente.",
      descricao: "Finalize quando a entrega for confirmada.",
    };
  }

  return null;
}

export function proximaAcaoMelhorEnvio(pedido: PedidoOperacionalBase) {
  if (modalidadeOperacional(pedido) !== "MELHOR_ENVIO") {
    return null;
  }

  if (pedido.envio?.statusEnvio === "PENDENTE") return "Preparar envio";
  if (pedido.envio?.statusEnvio === "PREPARADO") return "Comprar etiqueta";
  if (pedido.envio?.statusEnvio === "ETIQUETA_COMPRADA") return "Gerar etiqueta";
  if (pedido.envio?.statusEnvio === "ETIQUETA_GERADA") return "Imprimir etiqueta";
  if (pedido.envio?.statusEnvio === "POSTADO") return "Atualizar rastreio";

  return null;
}
