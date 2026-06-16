export const TIPOS_LANCAMENTO_FINANCEIRO = [
  "COMPRA_EMBALAGEM_INSUMO",
  "ASSINATURA",
  "COMPRA_UNICA",
  "INVESTIMENTO_ESTRUTURA",
  "MARKETING",
  "TRAFEGO_PAGO",
  "INFLUENCIADOR",
  "PERMUTA_PATROCINIO",
  "OUTRO",
] as const;

export const STATUS_PAGAMENTO_LANCAMENTO = [
  "PENDENTE",
  "PAGO",
  "VENCIDO",
  "CANCELADO",
] as const;

export const STATUS_OPERACIONAL_LANCAMENTO = [
  "ATIVO",
  "PAUSADO",
  "CANCELADO",
] as const;

export const RECORRENCIAS_LANCAMENTO = [
  "MENSAL",
  "TRIMESTRAL",
  "ANUAL",
] as const;

export type LancamentoFinanceiroPayload = {
  tipo: string;
  categoria: string;
  titulo: string;
  descricao?: string | null;
  fornecedorParceiro?: string | null;
  valorPrevisto?: number | null;
  valorReal: number;
  statusPagamento: string;
  statusOperacional: string;
  dataCompetencia?: Date | null;
  dataVencimento?: Date | null;
  dataPagamento?: Date | null;
  recorrente: boolean;
  recorrencia?: string | null;
  quantidadeParcelas?: number | null;
  parcelaAtual?: number | null;
  meioPagamento?: string | null;
  origemTipo?: string | null;
  origemId?: string | null;
  observacoes?: string | null;
  linkReferencia?: string | null;
  anexoUrl?: string | null;
  status?: string;
  impactaCaixa?: boolean;
  contaFinanceiraId?: string | null;
};

function textoOpcional(value: unknown) {
  const texto = String(value ?? "").trim();
  return texto || null;
}

function textoObrigatorio(value: unknown) {
  return String(value ?? "").trim();
}

function numeroObrigatorio(value: unknown) {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
}

function numeroOpcional(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
}

function inteiroOpcional(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numero = Number(value);
  return Number.isInteger(numero) ? numero : null;
}

function dataOpcional(value: unknown) {
  const texto = String(value ?? "").trim();

  if (!texto) {
    return null;
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function booleanOpcional(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";

  return false;
}

function valorEmLista(value: string, valores: readonly string[]) {
  return valores.includes(value);
}

export function gerarCodigoLancamentoFinanceiro(numero: number) {
  return `GAS-${String(numero).padStart(5, "0")}`;
}

export function extrairNumeroCodigoLancamentoFinanceiro(codigo: string | null) {
  const numeroAtual = Number(String(codigo ?? "").replace("GAS-", ""));
  return Number.isNaN(numeroAtual) ? 0 : numeroAtual;
}

export function recorrenciaValida(value: string | null | undefined) {
  const recorrencia = String(value ?? "").trim().toUpperCase();

  return RECORRENCIAS_LANCAMENTO.includes(
    recorrencia as (typeof RECORRENCIAS_LANCAMENTO)[number]
  )
    ? recorrencia
    : null;
}

export function adicionarPeriodoRecorrencia(data: Date, recorrencia: string) {
  const proximaData = new Date(data);

  if (recorrencia === "MENSAL") {
    proximaData.setMonth(proximaData.getMonth() + 1);
  }

  if (recorrencia === "TRIMESTRAL") {
    proximaData.setMonth(proximaData.getMonth() + 3);
  }

  if (recorrencia === "ANUAL") {
    proximaData.setFullYear(proximaData.getFullYear() + 1);
  }

  return proximaData;
}

export function intervaloDia(data: Date) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return { inicio, fim };
}

export function montarPayloadLancamentoFinanceiro(body: Record<string, unknown>) {
  const tipo = textoObrigatorio(body.tipo);
  const categoria = textoObrigatorio(body.categoria);
  const titulo = textoObrigatorio(body.titulo);
  const valorReal = numeroObrigatorio(body.valorReal);
  const statusPagamento =
    textoOpcional(body.statusPagamento) || STATUS_PAGAMENTO_LANCAMENTO[0];
  const statusOperacional =
    textoOpcional(body.statusOperacional) || STATUS_OPERACIONAL_LANCAMENTO[0];
  const recorrente = Boolean(body.recorrente);

  if (!titulo) {
    return { error: "Título é obrigatório." };
  }

  if (!tipo || !valorEmLista(tipo, TIPOS_LANCAMENTO_FINANCEIRO)) {
    return { error: "Tipo de lançamento inválido ou não informado." };
  }

  if (!categoria) {
    return { error: "Categoria é obrigatória." };
  }

  if (valorReal === null || valorReal < 0) {
    return { error: "Valor real é obrigatório e deve ser maior ou igual a zero." };
  }

  if (!valorEmLista(statusPagamento, STATUS_PAGAMENTO_LANCAMENTO)) {
    return { error: "Status de pagamento inválido." };
  }

  if (!valorEmLista(statusOperacional, STATUS_OPERACIONAL_LANCAMENTO)) {
    return { error: "Status operacional inválido." };
  }

  const payload: LancamentoFinanceiroPayload = {
    tipo,
    categoria,
    titulo,
    descricao: textoOpcional(body.descricao),
    fornecedorParceiro: textoOpcional(body.fornecedorParceiro),
    valorPrevisto: numeroOpcional(body.valorPrevisto),
    valorReal,
    statusPagamento,
    statusOperacional,
    dataCompetencia: dataOpcional(body.dataCompetencia),
    dataVencimento: dataOpcional(body.dataVencimento),
    dataPagamento:
      statusPagamento === "PAGO"
        ? dataOpcional(body.dataPagamento) || new Date()
        : dataOpcional(body.dataPagamento),
    recorrente,
    recorrencia: recorrente ? textoOpcional(body.recorrencia) : null,
    quantidadeParcelas: inteiroOpcional(body.quantidadeParcelas),
    parcelaAtual: inteiroOpcional(body.parcelaAtual),
    meioPagamento: textoOpcional(body.meioPagamento),
    origemTipo: textoOpcional(body.origemTipo),
    origemId: textoOpcional(body.origemId),
    observacoes: textoOpcional(body.observacoes),
    linkReferencia: textoOpcional(body.linkReferencia),
    anexoUrl: textoOpcional(body.anexoUrl),
    status: textoOpcional(body.status) || "ATIVO",
    impactaCaixa: booleanOpcional(body.impactaCaixa),
    contaFinanceiraId: textoOpcional(body.contaFinanceiraId),
  };

  return { payload };
}
