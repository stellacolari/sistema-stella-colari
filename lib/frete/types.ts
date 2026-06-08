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
  raw?: unknown;
  erro?: string | null;
};

export type CotarFreteInput = {
  cepDestino: string;
  produtos: FreteProdutoPayload[];
};
