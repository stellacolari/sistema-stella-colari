import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TipoOportunidadeCliente =
  | "RECOMPRA"
  | "ATENDIMENTO"
  | "PRESENTE"
  | "INTENCAO"
  | "INATIVO"
  | "OPERACIONAL";

export type PrioridadeOportunidadeCliente = "ALTA" | "MEDIA" | "BAIXA";
export type ConfiabilidadeOportunidadeCliente = "ALTA" | "MEDIA" | "BAIXA";

export type OportunidadeCliente = {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCodigo: string;
  tipo: TipoOportunidadeCliente;
  prioridade: PrioridadeOportunidadeCliente;
  descricao: string;
  acaoSugerida: string;
  href: string;
  confiabilidade: ConfiabilidadeOportunidadeCliente;
};

export type SegmentoCrmCliente = {
  id: string;
  nome: string;
  quantidade: number | null;
  explicacao: string;
  acaoSugerida: string;
  href: string;
  confiabilidade: ConfiabilidadeOportunidadeCliente;
  disponivel: boolean;
};

export type FichaRapidaCliente = {
  id: string;
  codigo: string;
  nome: string;
  status: string;
  quantidadeCompras: number;
  totalComprado: number;
  ticketMedio: number;
  ultimaCompraEm: string | null;
  ultimaInteracaoEm: string | null;
  contato: "COMPLETO" | "INCOMPLETO";
  sinalPrincipal: string;
  href: string;
};

export type CrmAcionavelClientes = {
  geradoEm: string;
  resumo: {
    clientesTotais: number;
    clientesRecorrentes: number;
    clientesNovos: number;
    clientesInativos: number;
    clientesComOportunidade: number;
    clientesComAtencaoOperacional: number;
  };
  segmentos: SegmentoCrmCliente[];
  oportunidades: OportunidadeCliente[];
  fichasRapidas: FichaRapidaCliente[];
  dados: {
    clientes: boolean;
    vendasInternas: boolean;
    pedidosOnline: boolean;
    eventosComerciais: boolean;
    favoritosPersistidos: boolean;
    consentimentoMarketingPersistido: boolean;
    dataEspecial: boolean;
  };
};

const DIAS_COMPRA_RECENTE = 30;
const DIAS_INTENCAO_RECENTE = 30;
const DIAS_CLIENTE_INATIVO = 90;
const DIAS_RECOMPRA = 45;

const STATUS_VENDA_IGNORADOS = new Set(["CANCELADA", "NA_LIXEIRA"]);
const TIPOS_INTENCAO_FORTE = new Set([
  "PRODUTO_FAVORITADO",
  "PRODUTO_ADICIONADO_CARRINHO",
  "CHECKOUT_INICIADO",
  "BUSCA_RESULTADO_CLICADO",
]);
const TIPOS_INTENCAO_FRACA = new Set([
  "PRODUTO_VISUALIZADO",
  "BUSCA_REALIZADA",
  "BUSCA_SEM_RESULTADO",
]);

const clienteCrmInclude = Prisma.validator<Prisma.ClienteInclude>()({
  vendas: {
    select: {
      id: true,
      codigo: true,
      meioVenda: true,
      valorTotal: true,
      status: true,
      criadoEm: true,
    },
  },
  pedidosOnline: {
    select: {
      id: true,
      codigo: true,
      status: true,
      statusPagamento: true,
      total: true,
      criadoEm: true,
      pagoEm: true,
      origemCanal: true,
      _count: {
        select: {
          embalagensPresente: true,
        },
      },
    },
  },
  eventosComerciais: {
    orderBy: {
      criadoEm: "desc",
    },
    take: 30,
    select: {
      id: true,
      tipo: true,
      termoBusca: true,
      criadoEm: true,
      produto: {
        select: {
          nome: true,
        },
      },
    },
  },
});

type ClienteCrmRaw = Prisma.ClienteGetPayload<{
  include: typeof clienteCrmInclude;
}>;

type CompraCliente = {
  id: string;
  origem: "VENDA_INTERNA" | "PEDIDO_ONLINE";
  codigo: string;
  valor: number;
  criadoEm: Date;
  temPresente: boolean;
};

type AnaliseCliente = {
  cliente: ClienteCrmRaw;
  compras: CompraCliente[];
  totalComprado: number;
  ticketMedio: number;
  ultimaCompra: Date | null;
  diasDesdeUltimaCompra: number | null;
  ultimaInteracao: Date | null;
  diasDesdeUltimaInteracao: number | null;
  temContatoCompleto: boolean;
  recorrente: boolean;
  novo: boolean;
  inativo: boolean;
  compraRecente: boolean;
  atencaoOperacional: boolean;
  temPresente: boolean;
  intencaoForte: boolean;
  intencaoFraca: boolean;
  sinalPrincipal: string;
};

function diasDesde(data: Date | null, agora: Date) {
  if (!data) return null;

  const diff = agora.getTime() - data.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function dataMaisRecente(datas: (Date | null | undefined)[]) {
  return datas
    .filter((data): data is Date => Boolean(data))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

function comprasValidas(cliente: ClienteCrmRaw): CompraCliente[] {
  const vendas = cliente.vendas
    .filter((venda) => !STATUS_VENDA_IGNORADOS.has(venda.status))
    .map((venda) => ({
      id: venda.id,
      origem: "VENDA_INTERNA" as const,
      codigo: venda.codigo,
      valor: Number(venda.valorTotal || 0),
      criadoEm: venda.criadoEm,
      temPresente: false,
    }));

  const pedidosOnline = cliente.pedidosOnline
    .filter(
      (pedido) =>
        pedido.status !== "CANCELADO" && pedido.statusPagamento === "PAGO"
    )
    .map((pedido) => ({
      id: pedido.id,
      origem: "PEDIDO_ONLINE" as const,
      codigo: pedido.codigo,
      valor: Number(pedido.total || 0),
      criadoEm: pedido.pagoEm || pedido.criadoEm,
      temPresente: pedido._count.embalagensPresente > 0,
    }));

  return [...vendas, ...pedidosOnline].sort(
    (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
  );
}

function temPedidoComAtencaoOperacional(cliente: ClienteCrmRaw) {
  return cliente.pedidosOnline.some((pedido) => {
    if (pedido.status === "PROBLEMA") return true;
    if (pedido.statusPagamento === "RECUSADO") return true;

    return (
      pedido.statusPagamento === "AGUARDANDO_PAGAMENTO" &&
      pedido.status !== "CANCELADO"
    );
  });
}

function descreverSinal(cliente: ClienteCrmRaw) {
  const evento = cliente.eventosComerciais[0];

  if (!evento) return "Sem interacao recente registrada";
  if (evento.tipo === "PRODUTO_FAVORITADO") {
    return evento.produto?.nome
      ? `Favoritou ${evento.produto.nome}`
      : "Favoritou produto";
  }
  if (evento.tipo === "PRODUTO_ADICIONADO_CARRINHO") {
    return evento.produto?.nome
      ? `Adicionou ${evento.produto.nome} ao carrinho`
      : "Adicionou produto ao carrinho";
  }
  if (evento.tipo === "CHECKOUT_INICIADO") return "Iniciou checkout";
  if (evento.tipo === "BUSCA_RESULTADO_CLICADO") return "Clicou em resultado de busca";
  if (evento.tipo === "BUSCA_REALIZADA" && evento.termoBusca) {
    return `Buscou por "${evento.termoBusca}"`;
  }

  return evento.tipo.replaceAll("_", " ").toLowerCase();
}

function analisarCliente(cliente: ClienteCrmRaw, agora: Date): AnaliseCliente {
  const compras = comprasValidas(cliente);
  const totalComprado = compras.reduce((total, compra) => total + compra.valor, 0);
  const ticketMedio = compras.length > 0 ? totalComprado / compras.length : 0;
  const ultimaCompra = compras[0]?.criadoEm ?? null;
  const ultimaInteracao = dataMaisRecente(
    cliente.eventosComerciais.map((evento) => evento.criadoEm)
  );
  const diasDesdeUltimaCompra = diasDesde(ultimaCompra, agora);
  const diasDesdeUltimaInteracao = diasDesde(ultimaInteracao, agora);
  const temContatoCompleto = Boolean(
    cliente.telefone?.trim() && cliente.email?.trim()
  );
  const eventoForteRecente = cliente.eventosComerciais.some(
    (evento) =>
      TIPOS_INTENCAO_FORTE.has(evento.tipo) &&
      diasDesde(evento.criadoEm, agora) !== null &&
      Number(diasDesde(evento.criadoEm, agora)) <= DIAS_INTENCAO_RECENTE &&
      (!ultimaCompra || evento.criadoEm > ultimaCompra)
  );
  const eventoFracoRecente = cliente.eventosComerciais.some(
    (evento) =>
      TIPOS_INTENCAO_FRACA.has(evento.tipo) &&
      diasDesde(evento.criadoEm, agora) !== null &&
      Number(diasDesde(evento.criadoEm, agora)) <= DIAS_INTENCAO_RECENTE
  );

  return {
    cliente,
    compras,
    totalComprado,
    ticketMedio,
    ultimaCompra,
    diasDesdeUltimaCompra,
    ultimaInteracao,
    diasDesdeUltimaInteracao,
    temContatoCompleto,
    recorrente: compras.length >= 2,
    novo: cliente.status === "NOVO" || compras.length === 0,
    inativo:
      cliente.status === "INATIVO" ||
      (diasDesdeUltimaCompra !== null &&
        diasDesdeUltimaCompra > DIAS_CLIENTE_INATIVO),
    compraRecente:
      diasDesdeUltimaCompra !== null &&
      diasDesdeUltimaCompra <= DIAS_COMPRA_RECENTE,
    atencaoOperacional: temPedidoComAtencaoOperacional(cliente),
    temPresente: compras.some((compra) => compra.temPresente),
    intencaoForte: eventoForteRecente,
    intencaoFraca: eventoFracoRecente,
    sinalPrincipal: descreverSinal(cliente),
  };
}

function criarOportunidade(
  analise: AnaliseCliente,
  tipo: TipoOportunidadeCliente,
  prioridade: PrioridadeOportunidadeCliente,
  descricao: string,
  acaoSugerida: string,
  confiabilidade: ConfiabilidadeOportunidadeCliente
): OportunidadeCliente {
  return {
    id: `${analise.cliente.id}-${tipo.toLowerCase()}`,
    clienteId: analise.cliente.id,
    clienteNome: analise.cliente.nome,
    clienteCodigo: analise.cliente.codigo,
    tipo,
    prioridade,
    descricao,
    acaoSugerida,
    href: `/clientes/${analise.cliente.id}/ficha`,
    confiabilidade,
  };
}

function oportunidadesDoCliente(analise: AnaliseCliente) {
  const oportunidades: OportunidadeCliente[] = [];

  if (analise.atencaoOperacional) {
    oportunidades.push(
      criarOportunidade(
        analise,
        "OPERACIONAL",
        "ALTA",
        "Existe pedido online com pagamento pendente, recusado ou status de problema.",
        "Priorizar revisao manual do historico antes de qualquer contato.",
        "ALTA"
      )
    );
  }

  if (analise.intencaoForte) {
    oportunidades.push(
      criarOportunidade(
        analise,
        "INTENCAO",
        "ALTA",
        `${analise.sinalPrincipal}. Sinal recente e vinculado ao cliente.`,
        "Revisar contexto e abordar manualmente apenas se o canal estiver autorizado.",
        "MEDIA"
      )
    );
  }

  if (analise.recorrente && (analise.diasDesdeUltimaCompra ?? 0) >= DIAS_RECOMPRA) {
    oportunidades.push(
      criarOportunidade(
        analise,
        "RECOMPRA",
        "MEDIA",
        `Cliente recorrente sem compra ha ${analise.diasDesdeUltimaCompra} dias.`,
        "Revisar historico antes de oferecer novidade semelhante.",
        "ALTA"
      )
    );
  }

  if (analise.inativo) {
    oportunidades.push(
      criarOportunidade(
        analise,
        "INATIVO",
        "MEDIA",
        analise.diasDesdeUltimaCompra === null
          ? "Cliente sem compra registrada."
          : `Ultima compra ha ${analise.diasDesdeUltimaCompra} dias.`,
        "Considerar contato manual somente se houver consentimento e contexto claro.",
        "MEDIA"
      )
    );
  }

  if (analise.temPresente) {
    oportunidades.push(
      criarOportunidade(
        analise,
        "PRESENTE",
        "BAIXA",
        "Ha compra online com embalagem de presente no historico.",
        "Perguntar sobre ocasiao apenas em atendimento manual e contextual.",
        "MEDIA"
      )
    );
  }

  if (!analise.temContatoCompleto) {
    oportunidades.push(
      criarOportunidade(
        analise,
        "ATENDIMENTO",
        "BAIXA",
        "Cadastro sem telefone ou e-mail completo para atendimento.",
        "Completar dados somente durante atendimento ativo com o cliente.",
        "ALTA"
      )
    );
  }

  if (oportunidades.length === 0 && analise.intencaoFraca) {
    oportunidades.push(
      criarOportunidade(
        analise,
        "INTENCAO",
        "BAIXA",
        `${analise.sinalPrincipal}. Sinal fraco, usar apenas como acompanhamento.`,
        "Acompanhar comportamento antes de tomar acao comercial.",
        "BAIXA"
      )
    );
  }

  return oportunidades;
}

function prioridadePeso(prioridade: PrioridadeOportunidadeCliente) {
  if (prioridade === "ALTA") return 3;
  if (prioridade === "MEDIA") return 2;
  return 1;
}

function montarSegmentos(analises: AnaliseCliente[]): SegmentoCrmCliente[] {
  const recorrentes = analises.filter((item) => item.recorrente);
  const novos = analises.filter((item) => item.novo);
  const inativos = analises.filter((item) => item.inativo);
  const compraRecente = analises.filter((item) => item.compraRecente);
  const intencao = analises.filter((item) => item.intencaoForte || item.intencaoFraca);
  const operacionais = analises.filter((item) => item.atencaoOperacional);
  const dadosIncompletos = analises.filter((item) => !item.temContatoCompleto);

  return [
    {
      id: "recorrentes",
      nome: "Clientes recorrentes",
      quantidade: recorrentes.length,
      explicacao: "Ja compraram mais de uma vez.",
      acaoSugerida: "Acompanhar novidades e preferencias antes de sugerir produtos.",
      href: "/clientes",
      confiabilidade: "ALTA",
      disponivel: true,
    },
    {
      id: "novos",
      nome: "Clientes novos",
      quantidade: novos.length,
      explicacao: "Status novo ou ainda sem historico de compra.",
      acaoSugerida: "Cuidar do primeiro atendimento e revisar cadastro.",
      href: "/clientes",
      confiabilidade: "MEDIA",
      disponivel: true,
    },
    {
      id: "inativos",
      nome: "Clientes inativos",
      quantidade: inativos.length,
      explicacao: `Sem compra ha mais de ${DIAS_CLIENTE_INATIVO} dias ou status inativo.`,
      acaoSugerida: "Considerar contato manual somente com consentimento e contexto.",
      href: "/clientes",
      confiabilidade: "MEDIA",
      disponivel: true,
    },
    {
      id: "compra-recente",
      nome: "Compra recente",
      quantidade: compraRecente.length,
      explicacao: `Compraram nos ultimos ${DIAS_COMPRA_RECENTE} dias.`,
      acaoSugerida: "Acompanhar satisfacao e andamento do pedido.",
      href: "/clientes",
      confiabilidade: "ALTA",
      disponivel: true,
    },
    {
      id: "intencao",
      nome: "Sinais de intencao",
      quantidade: intencao.length,
      explicacao: "Eventos recentes vinculados ao cliente, como favorito, carrinho ou busca.",
      acaoSugerida: "Usar como contexto de atendimento, nao como certeza.",
      href: "/clientes",
      confiabilidade: "MEDIA",
      disponivel: true,
    },
    {
      id: "operacional",
      nome: "Atencao operacional",
      quantidade: operacionais.length,
      explicacao: "Pedidos com problema, pagamento pendente ou recusado.",
      acaoSugerida: "Priorizar revisao manual do pedido e do historico.",
      href: "/pedidos",
      confiabilidade: "ALTA",
      disponivel: true,
    },
    {
      id: "dados-incompletos",
      nome: "Dados incompletos",
      quantidade: dadosIncompletos.length,
      explicacao: "Cadastro sem telefone ou e-mail completo.",
      acaoSugerida: "Completar dados apenas em atendimento ativo.",
      href: "/clientes",
      confiabilidade: "ALTA",
      disponivel: true,
    },
    {
      id: "consentimento-marketing",
      nome: "Consentimento de marketing",
      quantidade: null,
      explicacao: "Nao ha campo persistido de consentimento de marketing no banco.",
      acaoSugerida: "Evoluir persistencia antes de qualquer campanha ou automacao.",
      href: "/loja/politica-de-privacidade",
      confiabilidade: "BAIXA",
      disponivel: false,
    },
  ];
}

function montarFichaRapida(analise: AnaliseCliente): FichaRapidaCliente {
  return {
    id: analise.cliente.id,
    codigo: analise.cliente.codigo,
    nome: analise.cliente.nome,
    status: analise.cliente.status,
    quantidadeCompras: analise.compras.length,
    totalComprado: analise.totalComprado,
    ticketMedio: analise.ticketMedio,
    ultimaCompraEm: analise.ultimaCompra?.toISOString() ?? null,
    ultimaInteracaoEm: analise.ultimaInteracao?.toISOString() ?? null,
    contato: analise.temContatoCompleto ? "COMPLETO" : "INCOMPLETO",
    sinalPrincipal: analise.sinalPrincipal,
    href: `/clientes/${analise.cliente.id}/ficha`,
  };
}

export async function obterCrmAcionavelClientes(): Promise<CrmAcionavelClientes> {
  const agora = new Date();
  const clientes = await prisma.cliente.findMany({
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: {
      atualizadoEm: "desc",
    },
    include: clienteCrmInclude,
  });

  const analises = clientes.map((cliente) => analisarCliente(cliente, agora));
  const todasOportunidades = analises
    .flatMap(oportunidadesDoCliente)
    .sort((a, b) => prioridadePeso(b.prioridade) - prioridadePeso(a.prioridade));
  const oportunidades = todasOportunidades.slice(0, 10);
  const clientesComOportunidade = new Set(
    todasOportunidades.map((oportunidade) => oportunidade.clienteId)
  ).size;

  const fichasRapidas = analises
    .filter((analise) => analise.compras.length > 0 || analise.ultimaInteracao)
    .sort((a, b) => {
      const dataA = dataMaisRecente([a.ultimaCompra, a.ultimaInteracao]);
      const dataB = dataMaisRecente([b.ultimaCompra, b.ultimaInteracao]);
      return (dataB?.getTime() ?? 0) - (dataA?.getTime() ?? 0);
    })
    .slice(0, 6)
    .map(montarFichaRapida);

  const temVendasInternas = analises.some((analise) =>
    analise.compras.some((compra) => compra.origem === "VENDA_INTERNA")
  );
  const temPedidosOnline = analises.some((analise) =>
    analise.cliente.pedidosOnline.length > 0
  );
  const temEventos = analises.some(
    (analise) => analise.cliente.eventosComerciais.length > 0
  );

  return {
    geradoEm: agora.toISOString(),
    resumo: {
      clientesTotais: analises.length,
      clientesRecorrentes: analises.filter((item) => item.recorrente).length,
      clientesNovos: analises.filter((item) => item.novo).length,
      clientesInativos: analises.filter((item) => item.inativo).length,
      clientesComOportunidade,
      clientesComAtencaoOperacional: analises.filter(
        (item) => item.atencaoOperacional
      ).length,
    },
    segmentos: montarSegmentos(analises),
    oportunidades,
    fichasRapidas,
    dados: {
      clientes: analises.length > 0,
      vendasInternas: temVendasInternas,
      pedidosOnline: temPedidosOnline,
      eventosComerciais: temEventos,
      favoritosPersistidos: false,
      consentimentoMarketingPersistido: false,
      dataEspecial: false,
    },
  };
}
