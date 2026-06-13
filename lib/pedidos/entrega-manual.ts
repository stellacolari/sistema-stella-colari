export type PedidoEntregaManual = {
  modalidade: string;
  label: string;
  valor: number;
  kmIda: number | null;
  kmEstimado: number | null;
  kmIdaVolta: number | null;
  litrosEstimados: number | null;
  custoCombustivel: number | null;
  margemPercentual: number | null;
  taxaFixa: number | null;
  valorMinimo: number | null;
  valorSugerido: number | null;
  valorFinalCalculado: number | null;
  providerDistancia: string | null;
  origem: string | null;
  observacao: string | null;
  endereco: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function texto(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

function numero(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function labelModalidadeEntregaManual(modalidade: string) {
  if (modalidade === "RETIRADA_COMBINADA") return "Retirada combinada";
  if (
    modalidade === "ENTREGA_MANUAL" ||
    modalidade === "ENTREGA_LOCAL" ||
    modalidade === "CIDADE_PROXIMA"
  ) {
    return "Entrega manual";
  }

  return modalidade.replaceAll("_", " ");
}

function montarEndereco(record: Record<string, unknown>) {
  const endereco = isRecord(record.endereco) ? record.endereco : record;
  const partes = [
    endereco.rua,
    endereco.numero,
    endereco.complemento,
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    endereco.cep,
  ]
    .map(texto)
    .filter(Boolean);

  return partes.length > 0 ? partes.join(", ") : null;
}

function normalizarEntregaManual(
  value: unknown,
): PedidoEntregaManual | null {
  const record = parseJsonRecord(value);

  if (!record) {
    return null;
  }

  const modalidade = texto(record.modalidade);

  if (
    !modalidade ||
    modalidade === "SEM_ENTREGA" ||
    modalidade === "MELHOR_ENVIO"
  ) {
    return null;
  }

  return {
    modalidade,
    label: labelModalidadeEntregaManual(modalidade),
    valor: numero(record.valorFinal ?? record.valor ?? record.valorManual) || 0,
    kmIda: numero(record.distanciaIdaKm ?? record.kmIda ?? record.kmEstimado),
    kmEstimado: numero(record.kmEstimado ?? record.distanciaIdaKm ?? record.kmIda),
    kmIdaVolta: numero(record.distanciaTotalKm ?? record.kmIdaVolta),
    litrosEstimados: numero(record.litrosEstimados),
    custoCombustivel: numero(record.custoCombustivel),
    margemPercentual: numero(record.margemPercentual),
    taxaFixa: numero(record.taxaFixa),
    valorMinimo: numero(record.valorMinimo),
    valorSugerido: numero(record.valorSugerido),
    valorFinalCalculado: numero(record.valorFinalCalculado),
    providerDistancia: texto(record.providerDistancia),
    origem: isRecord(record.origemDespachoSnapshot)
      ? montarEndereco(record.origemDespachoSnapshot)
      : texto(record.origemResumo),
    observacao: texto(record.observacao ?? record.observacaoManual),
    endereco: montarEndereco(record),
  };
}

export function extrairEntregaManualPedido(
  dadosOriginaisJson: unknown,
  envioObservacoes?: string | null,
): PedidoEntregaManual | null {
  const dados = parseJsonRecord(dadosOriginaisJson);
  const entregaDados = normalizarEntregaManual(dados?.entregaManual);

  if (entregaDados) {
    return entregaDados;
  }

  const frete = isRecord(dados?.frete) ? dados.frete : null;
  const entregaFrete = normalizarEntregaManual(frete?.entregaManual);

  if (entregaFrete) {
    return entregaFrete;
  }

  const observacoes = parseJsonRecord(envioObservacoes);

  return normalizarEntregaManual(observacoes?.entregaManual);
}
