export type FreteProdutoPayload = {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  pesoKg?: number | null;
  alturaCm?: number | null;
  larguraCm?: number | null;
  comprimentoCm?: number | null;
};

export type FreteOpcao = {
  id: string;
  servicoId: string;
  nome: string;
  transportadora: string;
  valor: number;
  prazoDias: number | null;
  descricao: string;
  provider?: "MELHOR_ENVIO" | "MANUAL" | "RETIRADA_LOCAL";
  tipoEntrega?: "ENTREGA" | "RETIRADA";
  raw?: unknown;
  erro?: string | null;
};

export type CotarFreteInput = {
  cepDestino: string;
  produtos: FreteProdutoPayload[];
};

export type MelhorEnvioRemetente = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  company_document?: string | null;
  state_register?: string | null;
  address?: string | null;
  complement?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state_abbr?: string | null;
  postal_code?: string | null;
};

export type MelhorEnvioDestinatario = {
  name: string;
  phone: string;
  email?: string | null;
  document?: string | null;
  address: string;
  complement?: string | null;
  number: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
};

export type PrepararEnvioMelhorEnvioInput = {
  serviceId: number;
  pedidoCodigo: string;
  remetente: MelhorEnvioRemetente;
  destinatario: MelhorEnvioDestinatario;
  produtos: FreteProdutoPayload[];
};

export type ComprarEtiquetaMelhorEnvioInput = {
  orderId: string;
};

export type GerarEtiquetaMelhorEnvioInput = {
  orderId: string;
};

export type ImprimirEtiquetaMelhorEnvioInput = {
  orderId: string;
  mode?: "private" | "public";
};

export type AtualizarRastreioMelhorEnvioInput = {
  orderId: string;
};
