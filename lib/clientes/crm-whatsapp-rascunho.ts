import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizarCanalConsentimentoCliente,
  normalizarFinalidadeConsentimentoCliente,
  normalizarStatusConsentimentoCliente,
  type ConsentimentoClienteItem,
  type EstadoResumoConsentimentoCliente,
} from "@/lib/clientes/consentimentos-cliente";

export type SegmentoRascunhoWhatsapp =
  | "TODOS"
  | "RECORRENTES"
  | "INATIVOS"
  | "TICKET_ALTO"
  | "WHATSAPP_AUTORIZADO"
  | "SEM_CONSENTIMENTO"
  | "CONSENTIMENTO_REVOGADO"
  | "COMPRA_RECENTE"
  | "PRESENTE"
  | "CADASTRO_INCOMPLETO";

export type FinalidadeRascunhoWhatsapp = "MARKETING" | "RELACIONAMENTO";

export type PresetRascunhoWhatsapp =
  | "RECORRENTES"
  | "REATIVACAO"
  | "POS_VENDA"
  | "NOVIDADES"
  | "PRESENTE"
  | "ANIVERSARIO";

export type OpcaoSegmentoRascunhoWhatsapp = {
  value: SegmentoRascunhoWhatsapp;
  label: string;
  descricao: string;
};

export type PresetMensagemWhatsapp = {
  value: PresetRascunhoWhatsapp;
  label: string;
  finalidade: FinalidadeRascunhoWhatsapp;
  mensagem: string;
  descricao: string;
  disabled?: boolean;
};

export type DestinatarioRascunhoWhatsapp = {
  id: string;
  codigo: string;
  nome: string;
  primeiroNome: string;
  telefoneMascarado: string;
  telefoneValido: boolean;
  telefonePresente: boolean;
  consentimentoStatus: EstadoResumoConsentimentoCliente;
  consentimentoAtualizadoEm: string | null;
  consentimentoOrigem: string | null;
  elegivel: boolean;
  motivoElegibilidade: string;
  motivoExclusao: string | null;
  quantidadeCompras: number;
  totalComprado: number;
  ticketMedio: number;
  ultimaCompraEm: string | null;
  recorrente: boolean;
  inativo: boolean;
  compraRecente: boolean;
  temPresente: boolean;
  cadastroIncompleto: boolean;
  previewMensagem: string;
};

export type RascunhoWhatsappClientes = {
  geradoEm: string;
  parametros: {
    segmento: SegmentoRascunhoWhatsapp;
    finalidade: FinalidadeRascunhoWhatsapp;
    preset: PresetRascunhoWhatsapp;
    ticketMinimo: number;
    mensagem: string;
  };
  opcoesSegmento: OpcaoSegmentoRascunhoWhatsapp[];
  presets: PresetMensagemWhatsapp[];
  contadores: {
    totalEncontrados: number;
    comTelefone: number;
    telefoneInvalido: number;
    whatsappAutorizado: number;
    semConsentimento: number;
    consentimentoRevogado: number;
    elegiveisFinais: number;
  };
  destinatarios: DestinatarioRascunhoWhatsapp[];
  totalDestinatarios: number;
  dados: {
    presente: boolean;
    dataNascimento: boolean;
  };
};

export type RascunhoWhatsappClientesInput = {
  segmento?: string | string[];
  finalidade?: string | string[];
  preset?: string | string[];
  ticketMinimo?: string | string[] | number;
  mensagem?: string | string[];
};

type CompraClienteRascunho = {
  id: string;
  origem: "VENDA_INTERNA" | "PEDIDO_ONLINE";
  codigo: string;
  valor: number;
  criadoEm: Date;
  temPresente: boolean;
};

type ConsentimentoFinalidadeWhatsapp = {
  status: EstadoResumoConsentimentoCliente;
  atualizadoEm: string | null;
  origem: string | null;
};

type TelefoneAnalisado = {
  presente: boolean;
  valido: boolean;
  mascarado: string;
};

type AnaliseClienteRascunho = {
  cliente: ClienteRascunhoRaw;
  compras: CompraClienteRascunho[];
  totalComprado: number;
  ticketMedio: number;
  ultimaCompra: Date | null;
  diasDesdeUltimaCompra: number | null;
  recorrente: boolean;
  inativo: boolean;
  compraRecente: boolean;
  temPresente: boolean;
  cadastroIncompleto: boolean;
  telefone: TelefoneAnalisado;
  consentimento: ConsentimentoFinalidadeWhatsapp;
};

const DIAS_COMPRA_RECENTE = 30;
const DIAS_CLIENTE_INATIVO = 90;
const TICKET_MINIMO_PADRAO = 300;
const LIMITE_DESTINATARIOS = 80;

const STATUS_VENDA_IGNORADOS = new Set(["CANCELADA", "NA_LIXEIRA"]);

export const SEGMENTOS_RASCUNHO_WHATSAPP: OpcaoSegmentoRascunhoWhatsapp[] = [
  {
    value: "TODOS",
    label: "Todos os clientes",
    descricao: "Base completa, sempre filtrada por consentimento antes da elegibilidade.",
  },
  {
    value: "RECORRENTES",
    label: "Clientes recorrentes",
    descricao: "Clientes com duas ou mais compras validas.",
  },
  {
    value: "INATIVOS",
    label: "Clientes inativos",
    descricao: `Sem compra ha mais de ${DIAS_CLIENTE_INATIVO} dias ou status inativo.`,
  },
  {
    value: "TICKET_ALTO",
    label: "Ticket medio acima de X",
    descricao: "Clientes cujo ticket medio passa do valor minimo informado.",
  },
  {
    value: "WHATSAPP_AUTORIZADO",
    label: "WhatsApp autorizado",
    descricao: "Consentimento WhatsApp autorizado para a finalidade escolhida.",
  },
  {
    value: "SEM_CONSENTIMENTO",
    label: "Sem consentimento",
    descricao: "Clientes sem registro WhatsApp para a finalidade escolhida.",
  },
  {
    value: "CONSENTIMENTO_REVOGADO",
    label: "Consentimento revogado",
    descricao: "Clientes com revogacao vigente para a finalidade escolhida.",
  },
  {
    value: "COMPRA_RECENTE",
    label: "Compra recente",
    descricao: `Compra valida nos ultimos ${DIAS_COMPRA_RECENTE} dias.`,
  },
  {
    value: "PRESENTE",
    label: "Compradores de presente",
    descricao: "Pedidos online com embalagem de presente quando esse dado existe.",
  },
  {
    value: "CADASTRO_INCOMPLETO",
    label: "Contato incompleto",
    descricao: "Cadastro sem telefone valido ou sem e-mail.",
  },
];

export const PRESETS_RASCUNHO_WHATSAPP: PresetMensagemWhatsapp[] = [
  {
    value: "RECORRENTES",
    label: "Recorrentes",
    finalidade: "RELACIONAMENTO",
    descricao: "Relacionamento cuidadoso com quem ja comprou mais de uma vez.",
    mensagem:
      "Oi, {{primeiro_nome}}! Tudo bem? Separei algumas novidades da Stella Colari que combinam com o seu historico por aqui. Posso te mostrar?",
  },
  {
    value: "REATIVACAO",
    label: "Reativacao",
    finalidade: "RELACIONAMENTO",
    descricao: "Contato manual para clientes sem compra recente.",
    mensagem:
      "Oi, {{primeiro_nome}}! Faz um tempinho desde a sua ultima compra na Stella Colari. Posso te enviar uma curadoria curta com pecas novas?",
  },
  {
    value: "POS_VENDA",
    label: "Pos-venda",
    finalidade: "RELACIONAMENTO",
    descricao: "Acompanhamento depois de uma compra recente.",
    mensagem:
      "Oi, {{primeiro_nome}}! Passando para saber se chegou tudo certinho com a sua compra na Stella Colari. Se precisar de algo, estou por aqui.",
  },
  {
    value: "NOVIDADES",
    label: "Novidades",
    finalidade: "MARKETING",
    descricao: "Mensagem de marketing para clientes com autorizacao explicita.",
    mensagem:
      "Oi, {{primeiro_nome}}! Temos novidades chegando na Stella Colari. Posso te mandar uma selecao rapida pelo WhatsApp?",
  },
  {
    value: "PRESENTE",
    label: "Presente",
    finalidade: "RELACIONAMENTO",
    descricao: "Contexto para quem ja comprou item com embalagem de presente.",
    mensagem:
      "Oi, {{primeiro_nome}}! Vi que voce ja escolheu presente na Stella Colari. Posso te ajudar com uma curadoria para uma proxima ocasiao?",
  },
  {
    value: "ANIVERSARIO",
    label: "Aniversario",
    finalidade: "RELACIONAMENTO",
    descricao: "Desabilitado porque o cadastro ainda nao possui data de nascimento.",
    mensagem:
      "Preset de aniversario indisponivel: o cadastro ainda nao possui data de nascimento.",
    disabled: true,
  },
];

const clienteRascunhoSelect = Prisma.validator<Prisma.ClienteSelect>()({
  id: true,
  codigo: true,
  nome: true,
  telefone: true,
  email: true,
  status: true,
  criadoEm: true,
  vendas: {
    select: {
      id: true,
      codigo: true,
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
      _count: {
        select: {
          embalagensPresente: true,
        },
      },
    },
  },
  consentimentos: {
    orderBy: {
      criadoEm: "desc",
    },
    take: 50,
    select: {
      id: true,
      finalidade: true,
      canal: true,
      status: true,
      origem: true,
      versaoPolitica: true,
      registradoPorAdminId: true,
      registradoPorAdminNome: true,
      consentidoEm: true,
      revogadoEm: true,
      observacao: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  },
});

type ClienteRascunhoRaw = Prisma.ClienteGetPayload<{
  select: typeof clienteRascunhoSelect;
}>;

function primeiroValor(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizarSegmento(value: string | string[] | undefined) {
  const raw = primeiroValor(value)?.toUpperCase();
  return SEGMENTOS_RASCUNHO_WHATSAPP.some((item) => item.value === raw)
    ? (raw as SegmentoRascunhoWhatsapp)
    : "TODOS";
}

function normalizarFinalidade(value: string | string[] | undefined) {
  const raw = primeiroValor(value)?.toUpperCase();
  return raw === "MARKETING" || raw === "RELACIONAMENTO"
    ? (raw as FinalidadeRascunhoWhatsapp)
    : "RELACIONAMENTO";
}

function normalizarPreset(value: string | string[] | undefined) {
  const raw = primeiroValor(value)?.toUpperCase();
  return PRESETS_RASCUNHO_WHATSAPP.some((item) => item.value === raw)
    ? (raw as PresetRascunhoWhatsapp)
    : "RECORRENTES";
}

function normalizarTicketMinimo(value: string | string[] | number | undefined) {
  const raw = typeof value === "number" ? value : Number(primeiroValor(value));
  if (!Number.isFinite(raw) || raw < 0) return TICKET_MINIMO_PADRAO;
  return Math.min(Math.round(raw * 100) / 100, 999999);
}

function normalizarMensagem(value: string | string[] | undefined, fallback: string) {
  const raw = primeiroValor(value);
  const mensagem = String(raw || "").trim();
  return (mensagem || fallback).slice(0, 1200);
}

function serializarConsentimentoRascunho(
  consentimento: ClienteRascunhoRaw["consentimentos"][number]
): ConsentimentoClienteItem {
  return {
    id: consentimento.id,
    finalidade:
      normalizarFinalidadeConsentimentoCliente(consentimento.finalidade) ||
      "RELACIONAMENTO",
    canal:
      normalizarCanalConsentimentoCliente(consentimento.canal) || "WHATSAPP",
    status:
      normalizarStatusConsentimentoCliente(consentimento.status) ||
      "REVOGADO",
    origem: consentimento.origem,
    versaoPolitica: consentimento.versaoPolitica,
    registradoPorAdminId: consentimento.registradoPorAdminId,
    registradoPorAdminNome: consentimento.registradoPorAdminNome,
    consentidoEm: consentimento.consentidoEm?.toISOString() ?? null,
    revogadoEm: consentimento.revogadoEm?.toISOString() ?? null,
    observacao: consentimento.observacao,
    criadoEm: consentimento.criadoEm.toISOString(),
    atualizadoEm: consentimento.atualizadoEm.toISOString(),
  };
}

function comprasValidas(cliente: ClienteRascunhoRaw): CompraClienteRascunho[] {
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

function diasDesde(data: Date | null, agora: Date) {
  if (!data) return null;
  const diff = agora.getTime() - data.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function analisarTelefone(telefone: string | null): TelefoneAnalisado {
  const digitos = String(telefone || "").replace(/\D/g, "");
  const presente = digitos.length > 0;
  const valido = digitos.length === 10 || digitos.length === 11;

  if (!presente) {
    return {
      presente: false,
      valido: false,
      mascarado: "Sem telefone",
    };
  }

  if (!valido) {
    const final = digitos.slice(-4).padStart(4, "*");
    return {
      presente,
      valido,
      mascarado: `(**) ****-${final}`,
    };
  }

  const ddd = digitos.slice(0, 2);
  const final = digitos.slice(-4);
  const prefixo = digitos.length === 11 ? "*****" : "****";

  return {
    presente,
    valido,
    mascarado: `(${ddd}) ${prefixo}-${final}`,
  };
}

function obterConsentimentoFinalidadeWhatsapp(
  consentimentosRaw: ClienteRascunhoRaw["consentimentos"],
  finalidade: FinalidadeRascunhoWhatsapp
): ConsentimentoFinalidadeWhatsapp {
  const consentimentos = consentimentosRaw
    .map(serializarConsentimentoRascunho)
    .filter(
      (item) => item.canal === "WHATSAPP" && item.finalidade === finalidade
    )
    .sort(
      (a, b) =>
        new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  const atual = consentimentos[0];

  return {
    status: atual?.status || "NAO_REGISTRADO",
    atualizadoEm: atual?.criadoEm ?? null,
    origem: atual?.origem ?? null,
  };
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || "tudo bem";
}

function formatarDataIso(data: Date | null) {
  return data?.toISOString() ?? null;
}

function formatarDataMensagem(dataIso: string | null) {
  if (!dataIso) return "sua ultima compra";
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "sua ultima compra";

  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function aplicarVariaveisMensagem(
  mensagem: string,
  cliente: {
    nome: string;
    primeiroNome: string;
    ultimaCompraEm: string | null;
    ticketMedio: number;
  }
) {
  return mensagem
    .replaceAll("{{primeiro_nome}}", cliente.primeiroNome)
    .replaceAll("{{nome}}", cliente.nome)
    .replaceAll("{{ultima_compra}}", formatarDataMensagem(cliente.ultimaCompraEm))
    .replaceAll("{{ticket_medio}}", formatarMoeda(cliente.ticketMedio));
}

function labelFinalidade(finalidade: FinalidadeRascunhoWhatsapp) {
  return finalidade === "MARKETING" ? "marketing" : "relacionamento";
}

function motivoBloqueio(
  analise: AnaliseClienteRascunho,
  finalidade: FinalidadeRascunhoWhatsapp
) {
  if (!analise.telefone.presente) return "Sem telefone cadastrado.";
  if (!analise.telefone.valido) return "Telefone invalido para WhatsApp.";
  if (analise.consentimento.status === "REVOGADO") {
    return `Consentimento de ${labelFinalidade(finalidade)} revogado para WhatsApp.`;
  }
  if (analise.consentimento.status === "NAO_REGISTRADO") {
    return `Sem consentimento de ${labelFinalidade(finalidade)} para WhatsApp.`;
  }

  return null;
}

function analisarCliente(
  cliente: ClienteRascunhoRaw,
  agora: Date,
  finalidade: FinalidadeRascunhoWhatsapp
): AnaliseClienteRascunho {
  const compras = comprasValidas(cliente);
  const totalComprado = compras.reduce((total, compra) => total + compra.valor, 0);
  const ticketMedio = compras.length > 0 ? totalComprado / compras.length : 0;
  const ultimaCompra = compras[0]?.criadoEm ?? null;
  const diasDesdeUltimaCompra = diasDesde(ultimaCompra, agora);
  const telefone = analisarTelefone(cliente.telefone);

  return {
    cliente,
    compras,
    totalComprado,
    ticketMedio,
    ultimaCompra,
    diasDesdeUltimaCompra,
    recorrente: compras.length >= 2,
    inativo:
      cliente.status === "INATIVO" ||
      (diasDesdeUltimaCompra !== null &&
        diasDesdeUltimaCompra > DIAS_CLIENTE_INATIVO),
    compraRecente:
      diasDesdeUltimaCompra !== null &&
      diasDesdeUltimaCompra <= DIAS_COMPRA_RECENTE,
    temPresente: compras.some((compra) => compra.temPresente),
    cadastroIncompleto: !telefone.valido || !cliente.email?.trim(),
    telefone,
    consentimento: obterConsentimentoFinalidadeWhatsapp(
      cliente.consentimentos,
      finalidade
    ),
  };
}

function atendeSegmento(
  analise: AnaliseClienteRascunho,
  segmento: SegmentoRascunhoWhatsapp,
  ticketMinimo: number
) {
  if (segmento === "TODOS") return true;
  if (segmento === "RECORRENTES") return analise.recorrente;
  if (segmento === "INATIVOS") return analise.inativo;
  if (segmento === "TICKET_ALTO") return analise.ticketMedio >= ticketMinimo;
  if (segmento === "WHATSAPP_AUTORIZADO") {
    return analise.consentimento.status === "AUTORIZADO";
  }
  if (segmento === "SEM_CONSENTIMENTO") {
    return analise.consentimento.status === "NAO_REGISTRADO";
  }
  if (segmento === "CONSENTIMENTO_REVOGADO") {
    return analise.consentimento.status === "REVOGADO";
  }
  if (segmento === "COMPRA_RECENTE") return analise.compraRecente;
  if (segmento === "PRESENTE") return analise.temPresente;
  if (segmento === "CADASTRO_INCOMPLETO") return analise.cadastroIncompleto;

  return true;
}

function montarDestinatario(
  analise: AnaliseClienteRascunho,
  finalidade: FinalidadeRascunhoWhatsapp,
  mensagem: string
): DestinatarioRascunhoWhatsapp {
  const primeiro = primeiroNome(analise.cliente.nome);
  const ultimaCompraEm = formatarDataIso(analise.ultimaCompra);
  const motivoExclusao = motivoBloqueio(analise, finalidade);
  const elegivel = !motivoExclusao && analise.consentimento.status === "AUTORIZADO";
  const basePreview = {
    nome: analise.cliente.nome,
    primeiroNome: primeiro,
    ultimaCompraEm,
    ticketMedio: analise.ticketMedio,
  };

  return {
    id: analise.cliente.id,
    codigo: analise.cliente.codigo,
    nome: analise.cliente.nome,
    primeiroNome: primeiro,
    telefoneMascarado: analise.telefone.mascarado,
    telefoneValido: analise.telefone.valido,
    telefonePresente: analise.telefone.presente,
    consentimentoStatus: analise.consentimento.status,
    consentimentoAtualizadoEm: analise.consentimento.atualizadoEm,
    consentimentoOrigem: analise.consentimento.origem,
    elegivel,
    motivoElegibilidade: elegivel
      ? `Elegivel para rascunho interno de ${labelFinalidade(finalidade)}.`
      : "Bloqueado para contato ativo.",
    motivoExclusao,
    quantidadeCompras: analise.compras.length,
    totalComprado: analise.totalComprado,
    ticketMedio: analise.ticketMedio,
    ultimaCompraEm,
    recorrente: analise.recorrente,
    inativo: analise.inativo,
    compraRecente: analise.compraRecente,
    temPresente: analise.temPresente,
    cadastroIncompleto: analise.cadastroIncompleto,
    previewMensagem: aplicarVariaveisMensagem(mensagem, basePreview),
  };
}

function ordenarDestinatarios(
  a: DestinatarioRascunhoWhatsapp,
  b: DestinatarioRascunhoWhatsapp
) {
  if (a.elegivel !== b.elegivel) return a.elegivel ? -1 : 1;
  if (a.consentimentoStatus !== b.consentimentoStatus) {
    if (a.consentimentoStatus === "AUTORIZADO") return -1;
    if (b.consentimentoStatus === "AUTORIZADO") return 1;
  }

  return b.quantidadeCompras - a.quantidadeCompras;
}

export async function obterRascunhoWhatsappClientes(
  input: RascunhoWhatsappClientesInput = {}
): Promise<RascunhoWhatsappClientes> {
  const agora = new Date();
  const segmento = normalizarSegmento(input.segmento);
  const preset = normalizarPreset(input.preset);
  const presetSelecionado =
    PRESETS_RASCUNHO_WHATSAPP.find((item) => item.value === preset) ||
    PRESETS_RASCUNHO_WHATSAPP[0];
  const finalidade = normalizarFinalidade(
    input.finalidade || presetSelecionado.finalidade
  );
  const ticketMinimo = normalizarTicketMinimo(input.ticketMinimo);
  const mensagem = normalizarMensagem(input.mensagem, presetSelecionado.mensagem);

  const clientes = await prisma.cliente.findMany({
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
    select: clienteRascunhoSelect,
  });

  const analises = clientes
    .map((cliente) => analisarCliente(cliente, agora, finalidade))
    .filter((analise) => atendeSegmento(analise, segmento, ticketMinimo));
  const destinatarios = analises
    .map((analise) => montarDestinatario(analise, finalidade, mensagem))
    .sort(ordenarDestinatarios);

  return {
    geradoEm: agora.toISOString(),
    parametros: {
      segmento,
      finalidade,
      preset,
      ticketMinimo,
      mensagem,
    },
    opcoesSegmento: SEGMENTOS_RASCUNHO_WHATSAPP,
    presets: PRESETS_RASCUNHO_WHATSAPP,
    contadores: {
      totalEncontrados: destinatarios.length,
      comTelefone: destinatarios.filter((item) => item.telefonePresente).length,
      telefoneInvalido: destinatarios.filter(
        (item) => item.telefonePresente && !item.telefoneValido
      ).length,
      whatsappAutorizado: destinatarios.filter(
        (item) => item.consentimentoStatus === "AUTORIZADO"
      ).length,
      semConsentimento: destinatarios.filter(
        (item) => item.consentimentoStatus === "NAO_REGISTRADO"
      ).length,
      consentimentoRevogado: destinatarios.filter(
        (item) => item.consentimentoStatus === "REVOGADO"
      ).length,
      elegiveisFinais: destinatarios.filter((item) => item.elegivel).length,
    },
    destinatarios: destinatarios.slice(0, LIMITE_DESTINATARIOS),
    totalDestinatarios: destinatarios.length,
    dados: {
      presente: clientes.some((cliente) =>
        cliente.pedidosOnline.some(
          (pedido) => pedido._count.embalagensPresente > 0
        )
      ),
      dataNascimento: false,
    },
  };
}
