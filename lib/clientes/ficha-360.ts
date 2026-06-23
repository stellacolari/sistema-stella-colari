import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ConfiabilidadeFichaCliente = "ALTA" | "MEDIA" | "BAIXA";
export type PrioridadeFichaCliente = "ALTA" | "MEDIA" | "BAIXA";
export type StatusRelacionamentoCliente =
  | "NOVO"
  | "ATIVO"
  | "RECORRENTE"
  | "INATIVO";

export type Ficha360TimelineItem = {
  id: string;
  tipo: "PEDIDO" | "VENDA" | "EVENTO" | "OPERACIONAL";
  titulo: string;
  descricao: string;
  data: string;
  confiabilidade: ConfiabilidadeFichaCliente;
  href: string | null;
};

export type Ficha360SinalCliente = {
  id: string;
  tipo: string;
  valor: string;
  detalhe: string;
  confiabilidade: ConfiabilidadeFichaCliente;
};

export type Ficha360Oportunidade = {
  id: string;
  tipo:
    | "RECOMPRA"
    | "ATENDIMENTO"
    | "PRESENTE"
    | "INTENCAO"
    | "INATIVO"
    | "OPERACIONAL";
  titulo: string;
  motivo: string;
  prioridade: PrioridadeFichaCliente;
  acaoSugerida: string;
  avisoPrivacidade: string | null;
  confiabilidade: ConfiabilidadeFichaCliente;
};

export type Ficha360HistoricoItem = {
  id: string;
  codigo: string;
  data: string;
  status: string;
  pagamento: string | null;
  total: number;
  canal: string;
  tipo: "Pedido online" | "Venda interna";
  href: string;
};

export type Ficha360Cliente = {
  geradoEm: string;
  cliente: {
    id: string;
    codigo: string;
    nome: string;
    tipoCliente: string;
    status: string;
    telefone: string | null;
    email: string | null;
    contato: "COMPLETO" | "INCOMPLETO";
    criadoEm: string;
  };
  relacionamento: {
    status: StatusRelacionamentoCliente;
    label: string;
    detalhe: string;
    ultimaCompraEm: string | null;
    ultimaInteracaoEm: string | null;
    diasDesdeUltimaCompra: number | null;
  };
  resumo: {
    totalCompras: number;
    pedidosOnline: number;
    vendasInternas: number;
    totalComprado: number;
    ticketMedio: number;
    recorrencia: string;
    pedidosComAtencao: number;
    sinaisRecentes: number;
  };
  timeline: Ficha360TimelineItem[];
  sinais: Ficha360SinalCliente[];
  oportunidades: Ficha360Oportunidade[];
  historico: Ficha360HistoricoItem[];
  dados: {
    clientes: boolean;
    pedidosOnline: boolean;
    vendasInternas: boolean;
    eventosComerciais: boolean;
    favoritosPersistidos: boolean;
    consentimentoMarketingPersistido: boolean;
  };
  avisoPrivacidade: string;
};

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

const clienteFichaSelect = Prisma.validator<Prisma.ClienteSelect>()({
  id: true,
  codigo: true,
  nome: true,
  telefone: true,
  email: true,
  tipoCliente: true,
  status: true,
  criadoEm: true,
  pedidosOnline: {
    orderBy: {
      criadoEm: "desc",
    },
    take: 50,
    select: {
      id: true,
      codigo: true,
      status: true,
      statusPagamento: true,
      total: true,
      valorPago: true,
      criadoEm: true,
      pagoEm: true,
      origemCanal: true,
      _count: {
        select: {
          embalagensPresente: true,
        },
      },
      itens: {
        orderBy: {
          criadoEm: "asc",
        },
        select: {
          nomeProduto: true,
          categoria: true,
          quantidade: true,
          total: true,
        },
      },
    },
  },
  vendas: {
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
    take: 50,
    select: {
      id: true,
      codigo: true,
      meioVenda: true,
      valorTotal: true,
      status: true,
      criadoEm: true,
      itens: {
        select: {
          descricao: true,
          quantidade: true,
          valorTotal: true,
          produto: {
            select: {
              nome: true,
              categoria: true,
              categoriasProduto: {
                where: {
                  principal: true,
                },
                take: 1,
                select: {
                  categoria: {
                    select: {
                      nome: true,
                    },
                  },
                },
              },
            },
          },
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
          categoria: true,
        },
      },
      categoria: {
        select: {
          nome: true,
        },
      },
    },
  },
});

type ClienteFichaRaw = Prisma.ClienteGetPayload<{
  select: typeof clienteFichaSelect;
}>;

type CompraCliente = {
  id: string;
  codigo: string;
  origem: "PEDIDO_ONLINE" | "VENDA_INTERNA";
  valor: number;
  criadoEm: Date;
  href: string;
  temPresente: boolean;
  itens: {
    nome: string;
    categoria: string;
    quantidade: number;
  }[];
};

function diasDesde(data: Date | null, agora: Date) {
  if (!data) return null;

  const diff = agora.getTime() - data.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function dataMaisRecente(datas: (Date | null | undefined)[]) {
  return (
    datas
      .filter((data): data is Date => Boolean(data))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
  );
}

function normalizarTexto(valor: string | null | undefined) {
  return String(valor || "").trim();
}

function labelStatusPedido(status: string) {
  if (status === "PEDIDO_RECEBIDO") return "Pedido recebido";
  if (status === "PEDIDO_SEPARADO") return "Separado";
  if (status === "PEDIDO_ENVIADO") return "Enviado";
  if (status === "PEDIDO_ENTREGUE") return "Entregue";
  if (status === "CANCELADO") return "Cancelado";
  if (status === "PROBLEMA") return "Problema";

  return status.replaceAll("_", " ");
}

function labelStatusPagamento(status: string) {
  if (status === "AGUARDANDO_PAGAMENTO") return "Aguardando pagamento";
  if (status === "PAGO") return "Pago";
  if (status === "RECUSADO") return "Recusado";
  if (status === "ESTORNADO") return "Estornado";
  if (status === "CANCELADO") return "Cancelado";

  return status.replaceAll("_", " ");
}

function labelEventoComercial(tipo: string) {
  if (tipo === "PRODUTO_FAVORITADO") return "Produto favoritado";
  if (tipo === "PRODUTO_ADICIONADO_CARRINHO") return "Produto no carrinho";
  if (tipo === "CHECKOUT_INICIADO") return "Checkout iniciado";
  if (tipo === "BUSCA_RESULTADO_CLICADO") return "Clique em busca";
  if (tipo === "PRODUTO_VISUALIZADO") return "Produto visualizado";
  if (tipo === "BUSCA_REALIZADA") return "Busca realizada";
  if (tipo === "BUSCA_SEM_RESULTADO") return "Busca sem resultado";

  return tipo.replaceAll("_", " ").toLowerCase();
}

function pedidoComAtencaoOperacional(
  pedido: ClienteFichaRaw["pedidosOnline"][number]
) {
  if (pedido.status === "PROBLEMA") return true;
  if (pedido.statusPagamento === "RECUSADO") return true;

  return (
    pedido.statusPagamento === "AGUARDANDO_PAGAMENTO" &&
    pedido.status !== "CANCELADO"
  );
}

function comprasValidas(cliente: ClienteFichaRaw): CompraCliente[] {
  const pedidos = cliente.pedidosOnline
    .filter(
      (pedido) =>
        pedido.status !== "CANCELADO" && pedido.statusPagamento === "PAGO"
    )
    .map((pedido) => ({
      id: pedido.id,
      codigo: pedido.codigo,
      origem: "PEDIDO_ONLINE" as const,
      valor: Number(pedido.valorPago || pedido.total || 0),
      criadoEm: pedido.pagoEm || pedido.criadoEm,
      href: `/pedidos/${pedido.id}`,
      temPresente: pedido._count.embalagensPresente > 0,
      itens: pedido.itens.map((item) => ({
        nome: item.nomeProduto,
        categoria: normalizarTexto(item.categoria) || "Sem categoria",
        quantidade: item.quantidade,
      })),
    }));

  const vendas = cliente.vendas
    .filter((venda) => !STATUS_VENDA_IGNORADOS.has(venda.status))
    .map((venda) => ({
      id: venda.id,
      codigo: venda.codigo,
      origem: "VENDA_INTERNA" as const,
      valor: Number(venda.valorTotal || 0),
      criadoEm: venda.criadoEm,
      href: "/vendas",
      temPresente: false,
      itens: venda.itens.map((item) => ({
        nome: item.descricao || item.produto.nome,
        categoria:
          item.produto.categoriasProduto[0]?.categoria.nome ||
          item.produto.categoria ||
          "Sem categoria",
        quantidade: item.quantidade,
      })),
    }));

  return [...pedidos, ...vendas].sort(
    (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
  );
}

function calcularRecorrencia(compras: CompraCliente[]) {
  if (compras.length === 0) return "Sem compra registrada";
  if (compras.length === 1) return "Primeira compra registrada";

  const datas = [...compras]
    .map((compra) => compra.criadoEm)
    .sort((a, b) => a.getTime() - b.getTime());
  const intervalos = datas
    .slice(1)
    .map((data, index) =>
      Math.max(
        1,
        Math.round(
          (data.getTime() - datas[index].getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    );
  const media =
    intervalos.reduce((total, intervalo) => total + intervalo, 0) /
    intervalos.length;

  return `Compra a cada ${Math.round(media)} dias em media`;
}

function classificarRelacionamento(
  cliente: ClienteFichaRaw,
  compras: CompraCliente[],
  diasDesdeUltimaCompra: number | null
): Ficha360Cliente["relacionamento"] {
  const ultimaCompra = compras[0]?.criadoEm ?? null;
  const ultimaInteracao = dataMaisRecente(
    cliente.eventosComerciais.map((evento) => evento.criadoEm)
  );

  if (
    cliente.status === "INATIVO" ||
    (diasDesdeUltimaCompra !== null &&
      diasDesdeUltimaCompra > DIAS_CLIENTE_INATIVO)
  ) {
    return {
      status: "INATIVO",
      label: "Cliente inativo",
      detalhe:
        diasDesdeUltimaCompra === null
          ? "Sem compra registrada no historico."
          : `Ultima compra ha ${diasDesdeUltimaCompra} dias.`,
      ultimaCompraEm: ultimaCompra?.toISOString() ?? null,
      ultimaInteracaoEm: ultimaInteracao?.toISOString() ?? null,
      diasDesdeUltimaCompra,
    };
  }

  if (compras.length >= 2) {
    return {
      status: "RECORRENTE",
      label: "Cliente recorrente",
      detalhe: "Ja comprou mais de uma vez.",
      ultimaCompraEm: ultimaCompra?.toISOString() ?? null,
      ultimaInteracaoEm: ultimaInteracao?.toISOString() ?? null,
      diasDesdeUltimaCompra,
    };
  }

  if (compras.length === 0 || cliente.status === "NOVO") {
    return {
      status: "NOVO",
      label: "Cliente novo",
      detalhe: "Ainda sem historico forte de compra.",
      ultimaCompraEm: ultimaCompra?.toISOString() ?? null,
      ultimaInteracaoEm: ultimaInteracao?.toISOString() ?? null,
      diasDesdeUltimaCompra,
    };
  }

  return {
    status: "ATIVO",
    label: "Cliente ativo",
    detalhe: "Tem compra registrada e sem alerta de inatividade.",
    ultimaCompraEm: ultimaCompra?.toISOString() ?? null,
    ultimaInteracaoEm: ultimaInteracao?.toISOString() ?? null,
    diasDesdeUltimaCompra,
  };
}

function montarTimeline(cliente: ClienteFichaRaw): Ficha360TimelineItem[] {
  const timeline: Ficha360TimelineItem[] = [];

  cliente.pedidosOnline.forEach((pedido) => {
    timeline.push({
      id: `pedido-criado-${pedido.id}`,
      tipo: "PEDIDO",
      titulo: `Pedido ${pedido.codigo}`,
      descricao: `${labelStatusPedido(pedido.status)} - ${labelStatusPagamento(
        pedido.statusPagamento
      )}`,
      data: pedido.criadoEm.toISOString(),
      confiabilidade: "ALTA",
      href: `/pedidos/${pedido.id}`,
    });

    if (pedido.statusPagamento === "PAGO" && pedido.pagoEm) {
      timeline.push({
        id: `pedido-pago-${pedido.id}`,
        tipo: "PEDIDO",
        titulo: `Pagamento confirmado`,
        descricao: `Pedido ${pedido.codigo} pago.`,
        data: pedido.pagoEm.toISOString(),
        confiabilidade: "ALTA",
        href: `/pedidos/${pedido.id}`,
      });
    }

    if (pedidoComAtencaoOperacional(pedido)) {
      timeline.push({
        id: `pedido-atencao-${pedido.id}`,
        tipo: "OPERACIONAL",
        titulo: "Atencao operacional",
        descricao: `Pedido ${pedido.codigo} requer revisao manual.`,
        data: pedido.criadoEm.toISOString(),
        confiabilidade: "ALTA",
        href: `/pedidos/${pedido.id}`,
      });
    }
  });

  cliente.vendas
    .filter((venda) => !STATUS_VENDA_IGNORADOS.has(venda.status))
    .forEach((venda) => {
      timeline.push({
        id: `venda-${venda.id}`,
        tipo: "VENDA",
        titulo: `Venda ${venda.codigo}`,
        descricao: `${venda.meioVenda} - ${venda.status.replaceAll("_", " ")}`,
        data: venda.criadoEm.toISOString(),
        confiabilidade: "ALTA",
        href: "/vendas",
      });
    });

  cliente.eventosComerciais.forEach((evento) => {
    const alvo =
      evento.produto?.nome ||
      evento.categoria?.nome ||
      evento.termoBusca ||
      "Evento vinculado";

    timeline.push({
      id: `evento-${evento.id}`,
      tipo: "EVENTO",
      titulo: labelEventoComercial(evento.tipo),
      descricao: alvo,
      data: evento.criadoEm.toISOString(),
      confiabilidade: "MEDIA",
      href: null,
    });
  });

  return timeline
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 12);
}

function adicionarContagem(
  mapa: Map<string, number>,
  chave: string,
  quantidade: number
) {
  const nome = chave.trim();
  if (!nome) return;

  mapa.set(nome, (mapa.get(nome) || 0) + quantidade);
}

function montarSinais(
  cliente: ClienteFichaRaw,
  compras: CompraCliente[],
  agora: Date
): Ficha360SinalCliente[] {
  const categoriasCompradas = new Map<string, number>();
  const produtosComprados = new Map<string, number>();
  const sinais: Ficha360SinalCliente[] = [];

  compras.forEach((compra) => {
    compra.itens.forEach((item) => {
      adicionarContagem(categoriasCompradas, item.categoria, item.quantidade);
      adicionarContagem(produtosComprados, item.nome, item.quantidade);
    });
  });

  [...categoriasCompradas.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .forEach(([categoria, quantidade]) => {
      sinais.push({
        id: `categoria-${categoria}`,
        tipo: "Categoria comprada",
        valor: categoria,
        detalhe: `${quantidade} item${quantidade === 1 ? "" : "s"} em compra real.`,
        confiabilidade: "ALTA",
      });
    });

  [...produtosComprados.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .forEach(([produto, quantidade]) => {
      sinais.push({
        id: `produto-${produto}`,
        tipo: "Produto comprado",
        valor: produto,
        detalhe: `${quantidade} unidade${quantidade === 1 ? "" : "s"} comprada${quantidade === 1 ? "" : "s"}.`,
        confiabilidade: "ALTA",
      });
    });

  const comprasComPresente = compras.filter((compra) => compra.temPresente);
  if (comprasComPresente.length > 0) {
    sinais.push({
      id: "presente",
      tipo: "Presente",
      valor: "Ja comprou com embalagem de presente",
      detalhe: `${comprasComPresente.length} pedido${comprasComPresente.length === 1 ? "" : "s"} online com sinal real.`,
      confiabilidade: "ALTA",
    });
  }

  cliente.eventosComerciais
    .filter((evento) => {
      const dias = diasDesde(evento.criadoEm, agora);
      return (
        dias !== null &&
        dias <= DIAS_INTENCAO_RECENTE &&
        (TIPOS_INTENCAO_FORTE.has(evento.tipo) ||
          TIPOS_INTENCAO_FRACA.has(evento.tipo))
      );
    })
    .slice(0, 5)
    .forEach((evento) => {
      const valor =
        evento.produto?.nome ||
        evento.categoria?.nome ||
        evento.termoBusca ||
        labelEventoComercial(evento.tipo);

      sinais.push({
        id: `evento-${evento.id}`,
        tipo: labelEventoComercial(evento.tipo),
        valor,
        detalhe:
          TIPOS_INTENCAO_FORTE.has(evento.tipo)
            ? "Evento recente vinculado ao cliente."
            : "Sinal recente para acompanhar com cautela.",
        confiabilidade: "MEDIA",
      });
    });

  return sinais.slice(0, 12);
}

function montarOportunidades(params: {
  cliente: ClienteFichaRaw;
  compras: CompraCliente[];
  diasDesdeUltimaCompra: number | null;
  pedidosComAtencao: number;
  sinais: Ficha360SinalCliente[];
  temContatoCompleto: boolean;
  agora: Date;
}): Ficha360Oportunidade[] {
  const {
    cliente,
    compras,
    diasDesdeUltimaCompra,
    pedidosComAtencao,
    sinais,
    temContatoCompleto,
    agora,
  } = params;
  const oportunidades: Ficha360Oportunidade[] = [];
  const ultimaCompra = compras[0]?.criadoEm ?? null;
  const intencaoRecente = cliente.eventosComerciais.find((evento) => {
    const dias = diasDesde(evento.criadoEm, agora);
    return (
      dias !== null &&
      dias <= DIAS_INTENCAO_RECENTE &&
      (!ultimaCompra || evento.criadoEm > ultimaCompra) &&
      (TIPOS_INTENCAO_FORTE.has(evento.tipo) ||
        TIPOS_INTENCAO_FRACA.has(evento.tipo))
    );
  });

  if (pedidosComAtencao > 0) {
    oportunidades.push({
      id: "operacional",
      tipo: "OPERACIONAL",
      titulo: "Revisar pedido antes de contato",
      motivo: `${pedidosComAtencao} pedido${pedidosComAtencao === 1 ? "" : "s"} com pagamento pendente, recusado ou problema.`,
      prioridade: "ALTA",
      acaoSugerida: "Abrir o pedido e resolver o ponto operacional antes de abordagem comercial.",
      avisoPrivacidade: null,
      confiabilidade: "ALTA",
    });
  }

  if (intencaoRecente) {
    const alvo =
      intencaoRecente.produto?.nome ||
      intencaoRecente.categoria?.nome ||
      intencaoRecente.termoBusca ||
      labelEventoComercial(intencaoRecente.tipo);

    oportunidades.push({
      id: "intencao",
      tipo: "INTENCAO",
      titulo: "Usar sinal recente como contexto",
      motivo: `${labelEventoComercial(intencaoRecente.tipo)}: ${alvo}.`,
      prioridade: TIPOS_INTENCAO_FORTE.has(intencaoRecente.tipo)
        ? "ALTA"
        : "BAIXA",
      acaoSugerida: "Conferir historico e abordar manualmente apenas se houver canal autorizado.",
      avisoPrivacidade:
        "Contato comercial deve respeitar consentimento e contexto do atendimento.",
      confiabilidade: "MEDIA",
    });
  }

  if (compras.length >= 2 && (diasDesdeUltimaCompra ?? 0) >= DIAS_RECOMPRA) {
    oportunidades.push({
      id: "recompra",
      tipo: "RECOMPRA",
      titulo: "Recompra cuidadosa",
      motivo: `Cliente recorrente sem compra ha ${diasDesdeUltimaCompra} dias.`,
      prioridade: "MEDIA",
      acaoSugerida: "Revisar categorias compradas antes de sugerir novidade semelhante.",
      avisoPrivacidade:
        "Use como apoio de atendimento, nao como disparo automatico.",
      confiabilidade: "ALTA",
    });
  }

  if (
    cliente.status === "INATIVO" ||
    (diasDesdeUltimaCompra !== null &&
      diasDesdeUltimaCompra > DIAS_CLIENTE_INATIVO)
  ) {
    oportunidades.push({
      id: "inativo",
      tipo: "INATIVO",
      titulo: "Cliente parado",
      motivo:
        diasDesdeUltimaCompra === null
          ? "Nao ha compra registrada."
          : `Ultima compra ha ${diasDesdeUltimaCompra} dias.`,
      prioridade: "MEDIA",
      acaoSugerida: "Avaliar contato manual somente com consentimento e motivo claro.",
      avisoPrivacidade:
        "Nao presumir interesse atual sem interacao recente do cliente.",
      confiabilidade: "MEDIA",
    });
  }

  if (compras.some((compra) => compra.temPresente)) {
    oportunidades.push({
      id: "presente",
      tipo: "PRESENTE",
      titulo: "Contexto de presente",
      motivo: "Ha compra real com embalagem de presente no historico.",
      prioridade: "BAIXA",
      acaoSugerida: "Usar apenas se o assunto aparecer no atendimento.",
      avisoPrivacidade: null,
      confiabilidade: "ALTA",
    });
  }

  if (!temContatoCompleto) {
    oportunidades.push({
      id: "cadastro",
      tipo: "ATENDIMENTO",
      titulo: "Completar cadastro em atendimento ativo",
      motivo: "Cadastro sem telefone ou e-mail completo.",
      prioridade: "BAIXA",
      acaoSugerida: "Pedir dado faltante somente durante conversa com o cliente.",
      avisoPrivacidade:
        "Nao coletar dado adicional sem necessidade operacional clara.",
      confiabilidade: "ALTA",
    });
  }

  if (oportunidades.length === 0 && sinais.length > 0) {
    oportunidades.push({
      id: "acompanhar",
      tipo: "ATENDIMENTO",
      titulo: "Acompanhar relacionamento",
      motivo: "Ha historico suficiente para atendimento contextual, sem urgencia.",
      prioridade: "BAIXA",
      acaoSugerida: "Consultar preferencias antes de responder ou sugerir produto.",
      avisoPrivacidade: null,
      confiabilidade: "MEDIA",
    });
  }

  return oportunidades.slice(0, 5);
}

function montarHistorico(cliente: ClienteFichaRaw): Ficha360HistoricoItem[] {
  const pedidos = cliente.pedidosOnline.map((pedido) => ({
    id: `pedido-${pedido.id}`,
    codigo: pedido.codigo,
    data: pedido.criadoEm.toISOString(),
    status: labelStatusPedido(pedido.status),
    pagamento: labelStatusPagamento(pedido.statusPagamento),
    total: Number(pedido.total || 0),
    canal: pedido.origemCanal || "LOJA_STELLA",
    tipo: "Pedido online" as const,
    href: `/pedidos/${pedido.id}`,
  }));

  const vendas = cliente.vendas
    .filter((venda) => !STATUS_VENDA_IGNORADOS.has(venda.status))
    .map((venda) => ({
      id: `venda-${venda.id}`,
      codigo: venda.codigo,
      data: venda.criadoEm.toISOString(),
      status: venda.status.replaceAll("_", " "),
      pagamento: null,
      total: Number(venda.valorTotal || 0),
      canal: venda.meioVenda,
      tipo: "Venda interna" as const,
      href: "/vendas",
    }));

  return [...pedidos, ...vendas]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 12);
}

export async function obterFicha360Cliente(
  clienteId: string
): Promise<Ficha360Cliente | null> {
  const agora = new Date();
  const cliente = await prisma.cliente.findUnique({
    where: {
      id: clienteId,
    },
    select: clienteFichaSelect,
  });

  if (!cliente) return null;

  const compras = comprasValidas(cliente);
  const totalComprado = compras.reduce(
    (total, compra) => total + compra.valor,
    0
  );
  const ticketMedio = compras.length > 0 ? totalComprado / compras.length : 0;
  const ultimaCompra = compras[0]?.criadoEm ?? null;
  const diasDesdeUltimaCompra = diasDesde(ultimaCompra, agora);
  const relacionamento = classificarRelacionamento(
    cliente,
    compras,
    diasDesdeUltimaCompra
  );
  const pedidosComAtencao = cliente.pedidosOnline.filter(
    pedidoComAtencaoOperacional
  ).length;
  const sinaisRecentes = cliente.eventosComerciais.filter((evento) => {
    const dias = diasDesde(evento.criadoEm, agora);
    return dias !== null && dias <= DIAS_INTENCAO_RECENTE;
  }).length;
  const temContatoCompleto = Boolean(
    cliente.telefone.trim() && cliente.email?.trim()
  );
  const sinais = montarSinais(cliente, compras, agora);

  return {
    geradoEm: agora.toISOString(),
    cliente: {
      id: cliente.id,
      codigo: cliente.codigo,
      nome: cliente.nome,
      tipoCliente: cliente.tipoCliente,
      status: cliente.status,
      telefone: cliente.telefone || null,
      email: cliente.email || null,
      contato: temContatoCompleto ? "COMPLETO" : "INCOMPLETO",
      criadoEm: cliente.criadoEm.toISOString(),
    },
    relacionamento,
    resumo: {
      totalCompras: compras.length,
      pedidosOnline: cliente.pedidosOnline.length,
      vendasInternas: cliente.vendas.filter(
        (venda) => !STATUS_VENDA_IGNORADOS.has(venda.status)
      ).length,
      totalComprado,
      ticketMedio,
      recorrencia: calcularRecorrencia(compras),
      pedidosComAtencao,
      sinaisRecentes,
    },
    timeline: montarTimeline(cliente),
    sinais,
    oportunidades: montarOportunidades({
      cliente,
      compras,
      diasDesdeUltimaCompra,
      pedidosComAtencao,
      sinais,
      temContatoCompleto,
      agora,
    }),
    historico: montarHistorico(cliente),
    dados: {
      clientes: true,
      pedidosOnline: cliente.pedidosOnline.length > 0,
      vendasInternas: cliente.vendas.some(
        (venda) => !STATUS_VENDA_IGNORADOS.has(venda.status)
      ),
      eventosComerciais: cliente.eventosComerciais.length > 0,
      favoritosPersistidos: false,
      consentimentoMarketingPersistido: false,
    },
    avisoPrivacidade:
      "Use essas informacoes apenas para atendimento e relacionamento responsavel. Nao ha envio automatico de mensagens.",
  };
}
