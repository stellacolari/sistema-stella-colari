export type EventoFunilLoja =
  | "descoberta"
  | "produto"
  | "carrinho"
  | "checkout"
  | "relacionamento";

export type EventoComercialCanal = "cliente" | "servidor" | "futuro";

export type EventoComercialConfiabilidade = "alta" | "media" | "baixa";

export type EventoComercialTaxonomiaItem = {
  tipo: string;
  funil: EventoFunilLoja;
  canal: EventoComercialCanal;
  publico: boolean;
  implementado: boolean;
  confiabilidade: EventoComercialConfiabilidade;
  motivo: string;
};

export const EVENTOS_COMERCIAIS_TAXONOMIA = [
  {
    tipo: "BUSCA_REALIZADA",
    funil: "descoberta",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "media",
    motivo: "Registrado na busca publica e no autocomplete.",
  },
  {
    tipo: "BUSCA_SEM_RESULTADO",
    funil: "descoberta",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "media",
    motivo: "Registrado quando uma busca nao retorna produto.",
  },
  {
    tipo: "BUSCA_RESULTADO_CLICADO",
    funil: "descoberta",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em clique explicito em resultado de busca.",
  },
  {
    tipo: "CATEGORIA_CLICADA",
    funil: "descoberta",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em clique explicito no menu publico.",
  },
  {
    tipo: "CATEGORIA_VISUALIZADA",
    funil: "descoberta",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "baixa",
    motivo: "Exigiria definir se page view de categoria e sinal util sem ruido.",
  },
  {
    tipo: "COLECAO_VISUALIZADA",
    funil: "descoberta",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "baixa",
    motivo: "Exigiria regra clara para page view de colecao ativa.",
  },
  {
    tipo: "BANNER_CTA_CLICADO",
    funil: "descoberta",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em clique explicito em CTA de banner.",
  },
  {
    tipo: "VITRINE_EDITORIAL_CLICADA",
    funil: "descoberta",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em clique explicito em vitrine editorial.",
  },
  {
    tipo: "PRODUTO_VISUALIZADO",
    funil: "produto",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "media",
    motivo: "Registrado ao abrir produto, com dedupe para reduzir reloads.",
  },
  {
    tipo: "PRODUTO_FAVORITADO",
    funil: "produto",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em acao explicita de favoritar.",
  },
  {
    tipo: "PRODUTO_DESFAVORITADO",
    funil: "produto",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em acao explicita de remover favorito.",
  },
  {
    tipo: "VARIACAO_SELECIONADA",
    funil: "produto",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "media",
    motivo: "Futuro: depende de UI clara e dedupe para nao registrar troca ruidosa.",
  },
  {
    tipo: "IMAGEM_PRODUTO_INTERAGIDA",
    funil: "produto",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "baixa",
    motivo: "Futuro: so vale se houver interacao clara com galeria.",
  },
  {
    tipo: "PRODUTO_ADICIONADO_CARRINHO",
    funil: "carrinho",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em acao explicita de adicionar item ao carrinho.",
  },
  {
    tipo: "PRODUTO_REMOVIDO_CARRINHO",
    funil: "carrinho",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em acao explicita de remover item do carrinho.",
  },
  {
    tipo: "CARRINHO_QUANTIDADE_ALTERADA",
    funil: "carrinho",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "media",
    motivo: "Futuro: precisa dedupe para nao registrar cada stepper como ruido.",
  },
  {
    tipo: "CARRINHO_VISUALIZADO",
    funil: "carrinho",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "baixa",
    motivo: "Nao implementado para evitar page view ruidoso de pagina sensivel.",
  },
  {
    tipo: "CHECKOUT_INICIADO",
    funil: "checkout",
    canal: "cliente",
    publico: true,
    implementado: true,
    confiabilidade: "alta",
    motivo: "Registrado em clique para checkout ou submit explicito do checkout.",
  },
  {
    tipo: "FRETE_COTADO",
    funil: "checkout",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "media",
    motivo: "Futuro: cotacao hoje pode ocorrer automaticamente por CEP salvo.",
  },
  {
    tipo: "CHECKOUT_ERRO_VALIDACAO",
    funil: "checkout",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "media",
    motivo: "Futuro: registrar apenas codigos de erro sem PII.",
  },
  {
    tipo: "PEDIDO_CRIADO",
    funil: "checkout",
    canal: "servidor",
    publico: false,
    implementado: false,
    confiabilidade: "alta",
    motivo: "Futuro: registrar server-side apos pedido real sem expor API publica.",
  },
  {
    tipo: "PAGAMENTO_INICIADO",
    funil: "checkout",
    canal: "servidor",
    publico: false,
    implementado: false,
    confiabilidade: "alta",
    motivo: "Futuro: registrar apos sessao Stripe criada, fora da API publica.",
  },
  {
    tipo: "PAGAMENTO_CONFIRMADO",
    funil: "checkout",
    canal: "servidor",
    publico: false,
    implementado: false,
    confiabilidade: "alta",
    motivo: "Futuro: registrar no webhook apos confirmacao, sem aceitar do cliente.",
  },
  {
    tipo: "CLIENTE_ENTROU",
    funil: "relacionamento",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "media",
    motivo: "Futuro: exige decisao de privacidade e evento de auth.",
  },
  {
    tipo: "CLIENTE_CADASTROU",
    funil: "relacionamento",
    canal: "futuro",
    publico: false,
    implementado: false,
    confiabilidade: "media",
    motivo: "Futuro: exige decisao de privacidade e evento server-side.",
  },
] as const satisfies readonly EventoComercialTaxonomiaItem[];

export type EventoComercialTipo =
  (typeof EVENTOS_COMERCIAIS_TAXONOMIA)[number]["tipo"];

export type EventoComercialTipoPublico = Extract<
  (typeof EVENTOS_COMERCIAIS_TAXONOMIA)[number],
  { publico: true }
>["tipo"];

export const TIPOS_EVENTO_COMERCIAL_PUBLICOS = new Set<string>(
  EVENTOS_COMERCIAIS_TAXONOMIA.filter((evento) => evento.publico).map(
    (evento) => evento.tipo
  )
);

export const EVENTO_COMERCIAL_TAXONOMIA_POR_TIPO = new Map<
  string,
  EventoComercialTaxonomiaItem
>(
  EVENTOS_COMERCIAIS_TAXONOMIA.map((evento) => [
    evento.tipo,
    evento as EventoComercialTaxonomiaItem,
  ])
);

export const METADATA_KEYS_SENSIVEIS_EVENTO =
  /(senha|password|token|documento|cpf|cnpj|cartao|card|pagamento|endereco|rua|cep|telefone|email|whatsapp|nomeCliente|clienteNome)/i;

export function etapaFunilEvento(tipo: string) {
  return EVENTO_COMERCIAL_TAXONOMIA_POR_TIPO.get(tipo)?.funil || "descoberta";
}

export function confiabilidadeEvento(tipo: string) {
  return EVENTO_COMERCIAL_TAXONOMIA_POR_TIPO.get(tipo)?.confiabilidade || "baixa";
}
