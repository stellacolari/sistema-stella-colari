export type PedidoEntregaManual = {
  modalidade: string;
  label: string;
  valor: number;
  kmEstimado: number | null;
  valorSugerido: number | null;
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
  if (modalidade === "ENTREGA_LOCAL") return "Entrega local propria";
  if (modalidade === "CIDADE_PROXIMA") return "Cidade proxima";

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
    kmEstimado: numero(record.kmEstimado),
    valorSugerido: numero(record.valorSugerido),
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
