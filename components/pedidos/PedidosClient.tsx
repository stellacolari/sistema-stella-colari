"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Gift,
  MessageCircle,
  Package,
  Search,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import type { PedidoItemEmbalagemPresente } from "@/lib/pedidos/embalagens-presente";
import type { PedidoAlertaOperacional } from "@/lib/pedidos/alertas-operacionais";
import type { PedidoEntregaManual } from "@/lib/pedidos/entrega-manual";

export type PedidoOperacionalItem = {
  id: string;
  codigo: string;

  origemCanal: string;
  codigoPedidoExterno: string | null;
  statusExterno: string | null;
  substatusExterno: string | null;

  clienteId: string | null;
  clienteCodigo: string | null;
  clienteNome: string | null;

  nomeCliente: string;
  telefoneCliente: string;
  emailCliente: string | null;
  documento: string | null;

  cidade: string | null;
  estado: string | null;
  cep: string | null;

  subtotal: number;
  frete: number;
  total: number;

  statusPagamento: string;
  metodoPagamento: string | null;
  gatewayPagamento: string | null;
  gatewayPedidoId: string | null;
  linkPagamento: string | null;
  pagoEm: string | null;
  valorPago: number;
  vendaGerada: {
    id: string;
    codigo: string;
  } | null;

  cashbackStatus: string;
  cashbackPrevistoValor: number;
  cashbackCreditadoValor: number;
  cashbackUsadoValor: number;

  cupomCodigo: string | null;
  cupomDescontoValor: number;

  status: string;
  criadoEm: string;
  atualizadoEm: string;
  alertasOperacionais?: PedidoAlertaOperacional[];
  entregaManual?: PedidoEntregaManual | null;

  quantidadeItens: number;
  totalItensUnicos: number;
  itens: {
    id: string;
    codigoInterno: string;
    nomeProduto: string;
    categoria: string;
    tamanhoAnel: string | null;
    quantidade: number;
    precoUnitario: number;
    total: number;
    embalagemPresente?: PedidoItemEmbalagemPresente | null;
    adicionais: {
      id: string;
      nome: string;
      quantidade: number;
      valorVendaTotal: number;
    }[];
  }[];
  envio: {
    id: string;
    tipoEntrega: string;
    transportadora: string | null;
    servico: string | null;
    statusEnvio: string;
    codigoRastreio: string | null;
    valorFrete: number;
    prazoDias: number | null;

    etiquetaUrl: string | null;
    etiquetaPdfUrl: string | null;
    declaracaoConteudoUrl: string | null;
    gatewayLogistico: string | null;
    gatewayEnvioId: string | null;

    postadoEm: string | null;
    entregueEm: string | null;
    atualizadoEm: string;
  } | null;

  ultimoHistorico: {
    id: string;
    statusNovo: string;
    observacao: string | null;
    criadoEm: string;
  } | null;
};

type PedidosClientProps = {
  pedidos: PedidoOperacionalItem[];
};

const FILTROS_RAPIDOS = [
  { value: "TODOS", label: "Todos" },
  { value: "PAGAMENTO", label: "Aguardando pagamento" },
  { value: "PAGO_PREPARO", label: "Pago / aguardando preparo" },
  { value: "PREPARAR_ENVIO", label: "Preparar envio" },
  { value: "COMPRAR_ETIQUETA", label: "Comprar etiqueta" },
  { value: "GERAR_ETIQUETA", label: "Gerar etiqueta" },
  { value: "PRONTO_IMPRESSAO", label: "Pronto para impressão" },
  { value: "TRANSPORTE", label: "Postado / em transporte" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "PROBLEMA", label: "Problema / cancelado" },
  { value: "RETIRADA", label: "Retirada local" },
  { value: "MANUAL_LINK", label: "Manual com link" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataCurta(dataIso: string | null | undefined) {
  if (!dataIso) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataIso));
}

function linkCompacto(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}/...`;
  } catch {
    return url;
  }
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatusPedido(status: string) {
  if (status === "PEDIDO_RECEBIDO") return "Recebido";
  if (status === "EM_SEPARACAO") return "Em separacao";
  if (status === "SEPARADO") return "Separado";
  if (status === "PEDIDO_SEPARADO") return "Separado";
  if (status === "AGUARDANDO_RETIRADA") return "Aguardando retirada";
  if (status === "SAIU_PARA_ENTREGA") return "Saiu para entrega";
  if (status === "PEDIDO_ENVIADO") return "Enviado";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "PEDIDO_ENTREGUE") return "Entregue";
  if (status === "CANCELADO") return "Cancelado";
  if (status === "PROBLEMA") return "Problema";
  if (status === "PROBLEMA_OPERACIONAL") return "Problema operacional";

  return status.replaceAll("_", " ");
}

function statusPedidoClass(status: string) {
  if (status === "PEDIDO_RECEBIDO") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (
    status === "EM_SEPARACAO" ||
    status === "SEPARADO" ||
    status === "PEDIDO_SEPARADO" ||
    status === "AGUARDANDO_RETIRADA" ||
    status === "SAIU_PARA_ENTREGA" ||
    status === "PEDIDO_ENVIADO"
  ) {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }

  if (status === "PEDIDO_ENTREGUE" || status === "ENTREGUE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    status === "CANCELADO" ||
    status === "PROBLEMA" ||
    status === "PROBLEMA_OPERACIONAL"
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function labelStatusPagamento(status: string) {
  if (status === "AGUARDANDO_PAGAMENTO") return "Aguardando";
  if (status === "PENDENTE") return "Pendente";
  if (status === "PAGO") return "Pago";
  if (status === "RECUSADO") return "Recusado";
  if (status === "ESTORNADO") return "Estornado";
  if (status === "CANCELADO") return "Cancelado";
  if (status === "EXPIRADO") return "Expirado";

  return status.replaceAll("_", " ");
}

function statusPagamentoClass(status: string) {
  if (status === "PAGO") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "AGUARDANDO_PAGAMENTO" || status === "PENDENTE") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (
    status === "RECUSADO" ||
    status === "CANCELADO" ||
    status === "EXPIRADO"
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "ESTORNADO") {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }

  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function labelStatusEnvio(status: string | null | undefined) {
  if (!status) return "Sem envio";
  if (status === "PENDENTE") return "Pendente";
  if (status === "PREPARADO") return "Preparado";
  if (status === "COTADO") return "Cotado";
  if (status === "ETIQUETA_COMPRADA") return "Etiqueta comprada";
  if (status === "EM_PREPARACAO") return "Em preparação";
  if (status === "AGUARDANDO_RETIRADA") return "Aguardando retirada";
  if (status === "SAIU_PARA_ENTREGA") return "Saiu para entrega";
  if (status === "ETIQUETA_GERADA") return "Etiqueta gerada";
  if (status === "POSTADO") return "Postado";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "PROBLEMA") return "Problema";

  return status.replaceAll("_", " ");
}

function isPagamentoPendente(pedido: PedidoOperacionalItem) {
  return (
    pedido.statusPagamento === "AGUARDANDO_PAGAMENTO" ||
    pedido.statusPagamento === "PENDENTE"
  );
}

function isPedidoPagoParaSeparar(pedido: PedidoOperacionalItem) {
  return (
    pedido.statusPagamento === "PAGO" &&
    (pedido.status === "PEDIDO_RECEBIDO" || pedido.status === "EM_SEPARACAO")
  );
}

function isPedidoPago(pedido: PedidoOperacionalItem) {
  return (
    pedido.statusPagamento === "PAGO" && !isPedidoCanceladoOuExpirado(pedido)
  );
}

function isCanalLogisticoElegivel(pedido: PedidoOperacionalItem) {
  return (
    pedido.origemCanal === "LOJA_STELLA" ||
    pedido.origemCanal === "ADMIN_MANUAL"
  );
}

function isPedidoPagoAguardandoPreparo(pedido: PedidoOperacionalItem) {
  return (
    isCanalLogisticoElegivel(pedido) &&
    isPedidoPago(pedido) &&
    (pedido.status === "PEDIDO_RECEBIDO" ||
      pedido.status === "EM_SEPARACAO" ||
      pedido.status === "SEPARADO" ||
      pedido.status === "PEDIDO_SEPARADO") &&
    !(pedido.origemCanal === "ADMIN_MANUAL" && !pedido.envio)
  );
}

function podePrepararEnvioMelhorEnvio(pedido: PedidoOperacionalItem) {
  return (
    isCanalLogisticoElegivel(pedido) &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "PENDENTE"
  );
}

function podeComprarEtiquetaMelhorEnvio(pedido: PedidoOperacionalItem) {
  return (
    isCanalLogisticoElegivel(pedido) &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "PREPARADO" &&
    Boolean(pedido.envio.gatewayEnvioId)
  );
}

function podeGerarEtiquetaMelhorEnvio(pedido: PedidoOperacionalItem) {
  return (
    isCanalLogisticoElegivel(pedido) &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "ETIQUETA_COMPRADA" &&
    Boolean(pedido.envio.gatewayEnvioId)
  );
}

function podeImprimirEtiquetaMelhorEnvio(pedido: PedidoOperacionalItem) {
  return (
    isCanalLogisticoElegivel(pedido) &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "ETIQUETA_GERADA" &&
    Boolean(pedido.envio.gatewayEnvioId)
  );
}

function podeAtualizarRastreioMelhorEnvio(pedido: PedidoOperacionalItem) {
  return (
    isCanalLogisticoElegivel(pedido) &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    Boolean(pedido.envio.gatewayEnvioId) &&
    ["ETIQUETA_GERADA", "POSTADO", "ENTREGUE", "PROBLEMA"].includes(
      pedido.envio.statusEnvio,
    )
  );
}

function podeImprimirEtiquetaEmLote(pedido: PedidoOperacionalItem) {
  return (
    isCanalLogisticoElegivel(pedido) &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "ETIQUETA_GERADA" &&
    Boolean(pedido.envio.etiquetaPdfUrl || pedido.envio.etiquetaUrl)
  );
}

function isPedidoCanceladoOuExpirado(pedido: PedidoOperacionalItem) {
  return (
    pedido.status === "CANCELADO" ||
    pedido.statusPagamento === "CANCELADO" ||
    pedido.statusPagamento === "EXPIRADO" ||
    pedido.statusPagamento === "RECUSADO"
  );
}

function passaFiltroRapido(pedido: PedidoOperacionalItem, filtro: string) {
  if (filtro === "TODOS") return true;

  if (filtro === "PAGAMENTO") {
    return isPagamentoPendente(pedido);
  }

  if (filtro === "PAGO_PREPARO") {
    return isPedidoPagoAguardandoPreparo(pedido);
  }

  if (filtro === "PREPARAR_ENVIO") {
    return podePrepararEnvioMelhorEnvio(pedido);
  }

  if (filtro === "COMPRAR_ETIQUETA") {
    return podeComprarEtiquetaMelhorEnvio(pedido);
  }

  if (filtro === "GERAR_ETIQUETA") {
    return podeGerarEtiquetaMelhorEnvio(pedido);
  }

  if (filtro === "PRONTO_IMPRESSAO") {
    return podeImprimirEtiquetaEmLote(pedido);
  }

  if (filtro === "TRANSPORTE") {
    return (
      pedido.envio?.statusEnvio === "POSTADO" ||
      pedido.envio?.statusEnvio === "EM_PREPARACAO" ||
      pedido.envio?.statusEnvio === "SAIU_PARA_ENTREGA"
    );
  }

  if (filtro === "ENTREGUE") {
    return (
      pedido.status === "PEDIDO_ENTREGUE" ||
      pedido.status === "ENTREGUE" ||
      pedido.envio?.statusEnvio === "ENTREGUE"
    );
  }

  if (filtro === "PROBLEMA") {
    return (
      isPedidoCanceladoOuExpirado(pedido) ||
      pedido.status === "PROBLEMA" ||
      pedido.status === "PROBLEMA_OPERACIONAL"
    );
  }

  if (filtro === "RETIRADA") {
    return pedido.envio?.tipoEntrega === "RETIRADA";
  }

  if (filtro === "MANUAL_LINK") {
    return isPedidoManualComLink(pedido);
  }

  return true;
}

function pedidoCombinaBusca(pedido: PedidoOperacionalItem, busca: string) {
  const termo = normalizarTexto(busca);

  if (!termo) {
    return true;
  }

  const texto = normalizarTexto(
    [
      pedido.codigo,
      pedido.codigoPedidoExterno,
      pedido.nomeCliente,
      pedido.clienteNome,
      pedido.clienteCodigo,
      pedido.telefoneCliente,
      pedido.emailCliente,
      pedido.documento,
      pedido.cidade,
      pedido.estado,
      pedido.cep,
      pedido.status,
      pedido.statusPagamento,
      labelStatusPagamento(pedido.statusPagamento),
      labelStatusPedido(pedido.status),
      pedido.origemCanal,
      origemPedidoLabel(pedido),
      pedido.gatewayPagamento,
      pedido.gatewayPedidoId,
      pedido.linkPagamento,
      pedido.vendaGerada?.codigo,
      pedido.envio?.statusEnvio,
      pedido.envio?.transportadora,
      pedido.envio?.servico,
      pedido.envio?.codigoRastreio,
      pedido.cupomCodigo,
    ].join(" "),
  );

  return texto.includes(termo);
}
function getTextoOpcaoProduto(tamanhoAnel: string | null) {
  if (!tamanhoAnel) {
    return null;
  }

  return tamanhoAnel;
}
function getMensagemAcao(pedido: PedidoOperacionalItem) {
  if (pedido.status === "PROBLEMA") {
    return {
      label: "Ver problema",
      className: "text-red-700",
      icon: AlertCircle,
    };
  }

  if (isPedidoCanceladoOuExpirado(pedido)) {
    return {
      label:
        pedido.statusPagamento === "EXPIRADO"
          ? "Link expirado"
          : "Pedido cancelado",
      className: "text-red-700",
      icon: AlertCircle,
    };
  }

  if (isPagamentoPendente(pedido)) {
    return {
      label: isPedidoManualComLink(pedido)
        ? "Link aguardando pagamento"
        : "Aguardando pagamento",
      className: "text-amber-700",
      icon: CreditCard,
    };
  }

  if (isPedidoPagoParaSeparar(pedido)) {
    return {
      label:
        pedido.status === "EM_SEPARACAO"
          ? "Separacao em andamento"
          : "Separar pedido",
      className: "text-emerald-700",
      icon: Package,
    };
  }

  if (
    pedido.envio?.statusEnvio === "PENDENTE" ||
    pedido.envio?.statusEnvio === "EM_PREPARACAO" ||
    pedido.envio?.statusEnvio === "AGUARDANDO_RETIRADA" ||
    pedido.envio?.statusEnvio === "SAIU_PARA_ENTREGA"
  ) {
    return {
      label:
        pedido.envio?.statusEnvio === "AGUARDANDO_RETIRADA"
          ? "Aguardando retirada"
          : pedido.envio?.statusEnvio === "SAIU_PARA_ENTREGA"
            ? "Em rota de entrega"
            : "Preparar envio",
      className: "text-blue-700",
      icon: Truck,
    };
  }

  return {
    label: "Acompanhar",
    className: "text-slate-500",
    icon: CheckCircle2,
  };
}

function getAcaoRapidaStatus(pedido: PedidoOperacionalItem) {
  if (isPedidoManualComLink(pedido)) {
    return null;
  }

  if (
    pedido.statusPagamento === "PAGO" &&
    pedido.status === "PEDIDO_RECEBIDO"
  ) {
    return {
      statusNovo: "EM_SEPARACAO",
      label: "Iniciar separacao",
      confirmacao: `Iniciar separacao do pedido ${pedido.codigo}?`,
      observacao: "Separacao iniciada pela lista operacional.",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    };
  }

  if (pedido.status === "EM_SEPARACAO") {
    return {
      statusNovo: "SEPARADO",
      label: "Separado",
      confirmacao: `Marcar o pedido ${pedido.codigo} como separado?`,
      observacao: "Pedido separado pela lista operacional.",
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    };
  }

  if (pedido.status === "SEPARADO" || pedido.status === "PEDIDO_SEPARADO") {
    if (pedido.envio?.tipoEntrega === "RETIRADA") {
      return {
        statusNovo: "AGUARDANDO_RETIRADA",
        label: "Aguardando retirada",
        confirmacao: `Marcar o pedido ${pedido.codigo} como aguardando retirada?`,
        observacao: "Pedido separado e aguardando retirada.",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
      };
    }

    if (pedido.envio?.gatewayLogistico === "ENTREGA_MANUAL") {
      return {
        statusNovo: "SAIU_PARA_ENTREGA",
        label: "Saiu para entrega",
        confirmacao: `Marcar o pedido ${pedido.codigo} como saiu para entrega?`,
        observacao: "Pedido saiu para entrega propria.",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
      };
    }

    return {
      statusNovo: "PEDIDO_ENVIADO",
      label: "Enviado",
      confirmacao: `Marcar o pedido ${pedido.codigo} como enviado?`,
      observacao: "Pedido marcado como enviado pela lista operacional.",
      className: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    };
  }

  if (
    pedido.status === "PEDIDO_ENVIADO" ||
    pedido.status === "SAIU_PARA_ENTREGA" ||
    pedido.status === "AGUARDANDO_RETIRADA"
  ) {
    return {
      statusNovo: "PEDIDO_ENTREGUE",
      label: "Entregue",
      confirmacao: `Marcar o pedido ${pedido.codigo} como entregue?`,
      observacao: "Pedido marcado como entregue pela lista operacional.",
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    };
  }

  if (
    isPagamentoPendente(pedido) &&
    pedido.status !== "CANCELADO" &&
    pedido.status !== "PROBLEMA"
  ) {
    return {
      statusNovo: "CANCELADO",
      label: "Cancelar pendente",
      confirmacao: `Cancelar o pedido pendente ${pedido.codigo}? O estoque e o cashback usado serão devolvidos automaticamente.`,
      observacao:
        "Pedido pendente cancelado pela lista operacional. Estoque e cashback usados foram estornados.",
      className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    };
  }

  return null;
}

function isPedidoManualComLink(pedido: PedidoOperacionalItem) {
  return (
    pedido.origemCanal === "ADMIN_MANUAL" &&
    isPagamentoPendente(pedido) &&
    pedido.gatewayPagamento === "STRIPE"
  );
}

function origemPedidoLabel(pedido: PedidoOperacionalItem) {
  if (pedido.entregaManual) {
    return pedido.entregaManual.label;
  }

  if (pedido.origemCanal === "ADMIN_MANUAL" && pedido.envio) {
    return "Manual entrega";
  }

  if (isPedidoManualComLink(pedido)) {
    return "Manual com link";
  }

  if (pedido.origemCanal === "LOJA_STELLA") {
    return "Site";
  }

  return pedido.origemCanal.replaceAll("_", " ");
}

function origemPedidoClass(pedido: PedidoOperacionalItem) {
  if (isPedidoManualComLink(pedido)) {
    return "bg-violet-50 text-violet-700 ring-violet-200";
  }

  if (pedido.origemCanal === "LOJA_STELLA") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function normalizarTelefoneWhatsApp(telefone: string | null | undefined) {
  const digitos = String(telefone || "").replace(/\D/g, "");

  if (!digitos) {
    return "";
  }

  if (digitos.startsWith("55")) {
    return digitos;
  }

  return `55${digitos}`;
}

function montarLinkWhatsApp(pedido: PedidoOperacionalItem) {
  if (!pedido.linkPagamento) {
    return "";
  }

  const telefone = normalizarTelefoneWhatsApp(pedido.telefoneCliente);

  if (!telefone) {
    return "";
  }

  const mensagem = `Olá, ${pedido.nomeCliente}! Segue o link para pagamento do pedido ${pedido.codigo} na Stella: ${pedido.linkPagamento}`;

  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

function getDestaquePedidoClass(pedido: PedidoOperacionalItem) {
  if (pedido.status === "PROBLEMA") {
    return "border-l-4 border-red-400 bg-red-50/30";
  }

  if (isPedidoCanceladoOuExpirado(pedido)) {
    return "border-l-4 border-slate-300 bg-slate-50";
  }

  if (isPedidoPagoParaSeparar(pedido)) {
    return "border-l-4 border-emerald-300 bg-emerald-50/25";
  }

  if (isPagamentoPendente(pedido) && isPedidoManualComLink(pedido)) {
    return "border-l-4 border-violet-300 bg-violet-50/25";
  }

  if (isPagamentoPendente(pedido)) {
    return "border-l-4 border-amber-300 bg-amber-50/25";
  }

  return "";
}

export default function PedidosClient({ pedidos }: PedidosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [filtroRapido, setFiltroRapido] = useState("TODOS");
  const [filtrosMobileAbertos, setFiltrosMobileAbertos] = useState(false);
  const [erroOperacao, setErroOperacao] = useState("");
  const [linkCopiadoPedidoId, setLinkCopiadoPedidoId] = useState<string | null>(
    null,
  );
  const [processandoPedidoId, setProcessandoPedidoId] = useState<string | null>(
    null,
  );
  const [cancelandoLinkPedidoId, setCancelandoLinkPedidoId] = useState<
    string | null
  >(null);
  const [preparandoEnvioPedidoId, setPreparandoEnvioPedidoId] = useState<
    string | null
  >(null);
  const [comprandoEtiquetaPedidoId, setComprandoEtiquetaPedidoId] = useState<
    string | null
  >(null);
  const [gerandoEtiquetaPedidoId, setGerandoEtiquetaPedidoId] = useState<
    string | null
  >(null);
  const [imprimindoEtiquetaPedidoId, setImprimindoEtiquetaPedidoId] = useState<
    string | null
  >(null);
  const [atualizandoRastreioPedidoId, setAtualizandoRastreioPedidoId] =
    useState<string | null>(null);
  const [pedidoIdsSelecionados, setPedidoIdsSelecionados] = useState<string[]>(
    [],
  );
  const [preparandoImpressaoLote, setPreparandoImpressaoLote] = useState(false);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      return (
        passaFiltroRapido(pedido, filtroRapido) &&
        pedidoCombinaBusca(pedido, busca)
      );
    });
  }, [busca, filtroRapido, pedidos]);

  const pedidosImprimiveisVisiveis = useMemo(() => {
    return pedidosFiltrados.filter(podeImprimirEtiquetaEmLote);
  }, [pedidosFiltrados]);

  const pedidoIdsImprimiveisVisiveis = useMemo(() => {
    return new Set(pedidosImprimiveisVisiveis.map((pedido) => pedido.id));
  }, [pedidosImprimiveisVisiveis]);

  const pedidoIdsSelecionadosValidos = useMemo(() => {
    return pedidoIdsSelecionados.filter((id) =>
      pedidoIdsImprimiveisVisiveis.has(id),
    );
  }, [pedidoIdsImprimiveisVisiveis, pedidoIdsSelecionados]);

  const todosImprimiveisVisiveisSelecionados =
    pedidosImprimiveisVisiveis.length > 0 &&
    pedidosImprimiveisVisiveis.every((pedido) =>
      pedidoIdsSelecionadosValidos.includes(pedido.id),
    );

  const contadoresFiltro = useMemo(() => {
    return new Map(
      FILTROS_RAPIDOS.map((filtro) => [
        filtro.value,
        pedidos.filter((pedido) => passaFiltroRapido(pedido, filtro.value))
          .length,
      ]),
    );
  }, [pedidos]);

  const resumoOperacional = useMemo(() => {
    return {
      linksPendentes: pedidos.filter(
        (pedido) =>
          isPedidoManualComLink(pedido) && isPagamentoPendente(pedido),
      ).length,
      pagosParaSeparar: pedidos.filter(isPedidoPagoParaSeparar).length,
      problemas: pedidos.filter((pedido) => pedido.status === "PROBLEMA")
        .length,
      canceladosExpirados: pedidos.filter(isPedidoCanceladoOuExpirado).length,
    };
  }, [pedidos]);

  const totalFiltrado = useMemo(() => {
    return pedidosFiltrados.reduce(
      (total, pedido) => total + Number(pedido.total || 0),
      0,
    );
  }, [pedidosFiltrados]);

  async function atualizarStatusRapido(pedido: PedidoOperacionalItem) {
    const acaoRapida = getAcaoRapidaStatus(pedido);

    if (!acaoRapida) {
      return;
    }

    const confirmado = window.confirm(acaoRapida.confirmacao);

    if (!confirmado) {
      return;
    }

    setErroOperacao("");
    setProcessandoPedidoId(pedido.id);

    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusNovo: acaoRapida.statusNovo,
          origem: "LISTA_PEDIDOS",
          usuarioNome: "Sistema",
          observacao: acaoRapida.observacao,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(data.error || "Erro ao atualizar status do pedido.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErroOperacao("Erro ao atualizar status do pedido.");
    } finally {
      setProcessandoPedidoId(null);
    }
  }

  async function copiarLinkPagamento(pedido: PedidoOperacionalItem) {
    if (!pedido.linkPagamento) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pedido.linkPagamento);
      setLinkCopiadoPedidoId(pedido.id);
      window.setTimeout(() => setLinkCopiadoPedidoId(null), 2200);
    } catch {
      setErroOperacao("Não foi possível copiar o link de pagamento.");
    }
  }

  async function cancelarLinkPagamentoManual(pedido: PedidoOperacionalItem) {
    const confirmado = window.confirm(
      `Cancelar o link de pagamento do pedido ${pedido.codigo}? A sessão Stripe será expirada quando possível e o estoque não será baixado.`,
    );

    if (!confirmado) {
      return;
    }

    setErroOperacao("");
    setCancelandoLinkPedidoId(pedido.id);

    try {
      const response = await fetch(
        `/api/pedidos/${pedido.id}/cancelar-link-pagamento`,
        {
          method: "PATCH",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(
          data.error || "Erro ao cancelar link de pagamento manual.",
        );
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErroOperacao("Erro ao cancelar link de pagamento manual.");
    } finally {
      setCancelandoLinkPedidoId(null);
    }
  }

  async function prepararEnvioMelhorEnvio(pedido: PedidoOperacionalItem) {
    setErroOperacao("");
    setPreparandoEnvioPedidoId(pedido.id);

    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/preparar-envio`, {
        method: "PATCH",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(data.error || "Erro ao preparar envio.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErroOperacao("Erro ao preparar envio.");
    } finally {
      setPreparandoEnvioPedidoId(null);
    }
  }

  async function comprarEtiquetaMelhorEnvio(pedido: PedidoOperacionalItem) {
    const confirmado = window.confirm(
      `Comprar/pagar a etiqueta do Melhor Envio para o pedido ${pedido.codigo}? A geração e impressão continuarão pendentes.`,
    );

    if (!confirmado) {
      return;
    }

    setErroOperacao("");
    setComprandoEtiquetaPedidoId(pedido.id);

    try {
      const response = await fetch(
        `/api/pedidos/${pedido.id}/comprar-etiqueta`,
        {
          method: "PATCH",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(data.error || "Erro ao comprar etiqueta.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErroOperacao("Erro ao comprar etiqueta.");
    } finally {
      setComprandoEtiquetaPedidoId(null);
    }
  }

  async function gerarEtiquetaMelhorEnvio(pedido: PedidoOperacionalItem) {
    const confirmado = window.confirm(
      `Gerar a etiqueta do Melhor Envio para o pedido ${pedido.codigo}? Depois disso será possível solicitar o link de impressão.`,
    );

    if (!confirmado) {
      return;
    }

    setErroOperacao("");
    setGerandoEtiquetaPedidoId(pedido.id);

    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/gerar-etiqueta`, {
        method: "PATCH",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(data.error || "Erro ao gerar etiqueta.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErroOperacao("Erro ao gerar etiqueta.");
    } finally {
      setGerandoEtiquetaPedidoId(null);
    }
  }

  async function imprimirEtiquetaMelhorEnvio(pedido: PedidoOperacionalItem) {
    setErroOperacao("");
    setImprimindoEtiquetaPedidoId(pedido.id);

    try {
      const response = await fetch(
        `/api/pedidos/${pedido.id}/imprimir-etiqueta`,
        {
          method: "PATCH",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(data.error || "Erro ao imprimir etiqueta.");
        return;
      }

      const etiquetaUrl = String(data.etiquetaUrl || "").trim();

      if (etiquetaUrl) {
        window.open(etiquetaUrl, "_blank", "noopener,noreferrer");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErroOperacao("Erro ao imprimir etiqueta.");
    } finally {
      setImprimindoEtiquetaPedidoId(null);
    }
  }

  async function atualizarRastreioMelhorEnvio(pedido: PedidoOperacionalItem) {
    setErroOperacao("");
    setAtualizandoRastreioPedidoId(pedido.id);

    try {
      const response = await fetch(
        `/api/pedidos/${pedido.id}/atualizar-rastreio`,
        {
          method: "PATCH",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(data.error || "Erro ao atualizar rastreio.");
        return;
      }

      if (data.aviso) {
        setErroOperacao(String(data.aviso));
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErroOperacao("Erro ao atualizar rastreio.");
    } finally {
      setAtualizandoRastreioPedidoId(null);
    }
  }

  function alternarPedidoSelecionado(pedido: PedidoOperacionalItem) {
    if (!podeImprimirEtiquetaEmLote(pedido)) {
      return;
    }

    setPedidoIdsSelecionados((idsAtuais) =>
      idsAtuais.includes(pedido.id)
        ? idsAtuais.filter((id) => id !== pedido.id)
        : [...idsAtuais, pedido.id],
    );
  }

  function alternarTodosImprimiveisVisiveis() {
    if (todosImprimiveisVisiveisSelecionados) {
      setPedidoIdsSelecionados((idsAtuais) =>
        idsAtuais.filter((id) => !pedidoIdsImprimiveisVisiveis.has(id)),
      );
      return;
    }

    setPedidoIdsSelecionados((idsAtuais) => {
      const proximosIds = new Set(idsAtuais);

      pedidosImprimiveisVisiveis.forEach((pedido) =>
        proximosIds.add(pedido.id),
      );

      return Array.from(proximosIds);
    });
  }

  async function imprimirEtiquetasSelecionadas() {
    if (pedidoIdsSelecionadosValidos.length === 0) {
      return;
    }

    setErroOperacao("");
    setPreparandoImpressaoLote(true);

    try {
      const response = await fetch("/api/pedidos/etiquetas/lote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: pedidoIdsSelecionadosValidos,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(data.error || "Erro ao preparar impressão em lote.");
        return;
      }

      if (data.url) {
        window.open(String(data.url), "_blank", "noopener,noreferrer");
      }
    } catch {
      setErroOperacao("Erro ao preparar impressão em lote.");
    } finally {
      setPreparandoImpressaoLote(false);
    }
  }

  return (
    <section className="w-full max-w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-3xl">
      <div className="border-b border-slate-200 px-3 py-2.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 overflow-hidden">
            <h2 className="truncate text-base font-semibold text-slate-950 sm:text-lg">
              <span className="md:hidden">Pedidos</span>
              <span className="hidden md:inline">Lista de pedidos</span>
            </h2>

            <p className="mt-0.5 truncate text-xs text-slate-500 sm:mt-1 sm:text-sm">
              {pedidosFiltrados.length} pedido
              {pedidosFiltrados.length === 1 ? "" : "s"} exibido
              {pedidosFiltrados.length === 1 ? "" : "s"} ·{" "}
              {moeda(totalFiltrado)}
            </p>

            {erroOperacao && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:px-4 sm:py-3">
                {erroOperacao}
              </div>
            )}
          </div>

          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_88px] items-end gap-2 md:hidden">
            <label className="min-w-0">
              <span className="sr-only">Visão</span>
              <select
                value={filtroRapido}
                onChange={(event) => setFiltroRapido(event.target.value)}
                className="h-10 w-full min-w-0 max-w-full truncate rounded-2xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-800 outline-none transition focus:border-slate-500"
              >
                {FILTROS_RAPIDOS.map((filtro) => (
                  <option key={filtro.value} value={filtro.value}>
                    {filtro.label} ({contadoresFiltro.get(filtro.value) || 0})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() =>
                setFiltrosMobileAbertos((valorAtual) => !valorAtual)
              }
              className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="truncate">Filtros</span>
            </button>
          </div>

          <div className="hidden gap-3 md:grid xl:w-[680px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar cliente, código, pagamento, origem, gateway..."
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 hidden flex-wrap gap-2 md:flex">
          {FILTROS_RAPIDOS.map((filtro) => {
            const ativo = filtroRapido === filtro.value;

            return (
              <button
                key={filtro.value}
                type="button"
                onClick={() => setFiltroRapido(filtro.value)}
                className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                  ativo
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{filtro.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    ativo
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {contadoresFiltro.get(filtro.value) || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`mt-3 ${
            filtrosMobileAbertos ? "block" : "hidden"
          } md:hidden`}
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar cliente, código, origem..."
              className="h-10 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-base outline-none transition focus:border-slate-500"
            />
          </label>
        </div>

        <div
          className={`mt-3 min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:mt-4 md:flex md:flex-row md:items-center md:justify-between md:px-4 ${
            filtrosMobileAbertos ? "flex" : "hidden"
          }`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <label className="inline-flex max-w-full min-w-0 items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={todosImprimiveisVisiveisSelecionados}
                disabled={pedidosImprimiveisVisiveis.length === 0}
                onChange={alternarTodosImprimiveisVisiveis}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <span className="truncate">Selecionar todos visíveis</span>
            </label>

            <span className="min-w-0 truncate text-xs text-slate-500">
              {pedidoIdsSelecionadosValidos.length} pedido
              {pedidoIdsSelecionadosValidos.length === 1 ? "" : "s"} selecionado
              {pedidoIdsSelecionadosValidos.length === 1 ? "" : "s"}
            </span>

            <span className="min-w-0 truncate text-xs text-slate-400">
              {pedidosImprimiveisVisiveis.length} pronto
              {pedidosImprimiveisVisiveis.length === 1 ? "" : "s"} para
              impressão
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {pedidoIdsSelecionados.length > 0 && (
              <button
                type="button"
                onClick={() => setPedidoIdsSelecionados([])}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Limpar seleção
              </button>
            )}

            <button
              type="button"
              onClick={imprimirEtiquetasSelecionadas}
              disabled={
                pedidoIdsSelecionadosValidos.length === 0 ||
                preparandoImpressaoLote
              }
              className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {preparandoImpressaoLote
                  ? "Preparando..."
                  : "Imprimir etiquetas selecionadas"}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-4 hidden gap-2 md:grid md:grid-cols-4">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Links pendentes
            </p>
            <p className="mt-1 text-lg font-bold text-violet-950">
              {resumoOperacional.linksPendentes}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Para separar
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-950">
              {resumoOperacional.pagosParaSeparar}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
              Problemas
            </p>
            <p className="mt-1 text-lg font-bold text-red-950">
              {resumoOperacional.problemas}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Cancelados/expirados
            </p>
            <p className="mt-1 text-lg font-bold text-slate-950">
              {resumoOperacional.canceladosExpirados}
            </p>
          </div>
        </div>
      </div>

      {pedidosFiltrados.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Package className="mx-auto h-8 w-8 text-slate-300" />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Nenhum pedido encontrado
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Ajuste a busca ou altere o filtro rápido.
          </p>
        </div>
      ) : (
        <div className="max-w-full divide-y divide-slate-100 overflow-hidden">
          {pedidosFiltrados.map((pedido) => {
            const acao = getMensagemAcao(pedido);
            const IconeAcao = acao.icon;

            const possuiCupom =
              Boolean(pedido.cupomCodigo) && pedido.cupomDescontoValor > 0;

            const possuiCashbackUsado = pedido.cashbackUsadoValor > 0;

            const possuiCashbackPrevisto = pedido.cashbackPrevistoValor > 0;

            const acaoRapida = getAcaoRapidaStatus(pedido);
            const estaProcessando =
              processandoPedidoId === pedido.id || isPending;
            const pedidoManualComLink = isPedidoManualComLink(pedido);
            const linkWhatsApp = montarLinkWhatsApp(pedido);
            const pagamentoPendente = isPagamentoPendente(pedido);
            const estaCancelandoLink =
              cancelandoLinkPedidoId === pedido.id || isPending;
            const destaquePedidoClass = getDestaquePedidoClass(pedido);
            const podeSelecionarParaImpressao =
              podeImprimirEtiquetaEmLote(pedido);
            const selecionadoParaImpressao =
              pedidoIdsSelecionadosValidos.includes(pedido.id);

            return (
              <article
                key={pedido.id}
                className={`relative flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden px-3 py-3 transition hover:bg-slate-50 sm:px-5 xl:grid xl:grid-cols-[32px_minmax(180px,0.9fr)_minmax(260px,1.2fr)_minmax(240px,1fr)_minmax(260px,auto)] xl:gap-4 ${
                  destaquePedidoClass
                }`}
              >
                <div className="absolute right-3 top-3 xl:static xl:pt-1">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar etiqueta do pedido ${pedido.codigo}`}
                    checked={selecionadoParaImpressao}
                    disabled={!podeSelecionarParaImpressao}
                    onChange={() => alternarPedidoSelecionado(pedido)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                  />
                </div>

                <div className="min-w-0 max-w-full overflow-hidden pr-8 xl:pr-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                    <Link
                      href={`/pedidos/${pedido.id}`}
                      className="max-w-full min-w-0 truncate text-sm font-bold text-slate-950 underline-offset-4 hover:underline"
                    >
                      {pedido.codigo}
                    </Link>

                    <span
                      className={`inline-flex max-w-full min-w-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 sm:px-2.5 ${statusPedidoClass(
                        pedido.status,
                      )}`}
                    >
                      <span className="truncate">
                        {labelStatusPedido(pedido.status)}
                      </span>
                    </span>

                    <span
                      className={`inline-flex max-w-full min-w-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 sm:px-2.5 ${origemPedidoClass(
                        pedido,
                      )}`}
                    >
                      <span className="truncate">
                        {origemPedidoLabel(pedido)}
                      </span>
                    </span>

                    {pedido.alertasOperacionais &&
                      pedido.alertasOperacionais.length > 0 && (
                        <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-200 sm:px-2.5">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {pedido.alertasOperacionais.length} alerta
                            {pedido.alertasOperacionais.length === 1
                              ? ""
                              : "s"}
                          </span>
                        </span>
                      )}
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Criado em {dataCurta(pedido.criadoEm)}
                  </p>

                  <p
                    className={`mt-1.5 inline-flex max-w-full items-center gap-1 text-xs font-semibold ${acao.className}`}
                  >
                    <IconeAcao className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{acao.label}</span>
                  </p>

                  {pedido.alertasOperacionais &&
                    pedido.alertasOperacionais.length > 0 && (
                      <p className="mt-1.5 line-clamp-2 text-xs font-medium text-red-700">
                        {pedido.alertasOperacionais[0].mensagem}
                      </p>
                    )}
                </div>

                <div className="min-w-0 max-w-full overflow-hidden">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {pedido.clienteNome || pedido.nomeCliente}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {[
                      pedido.telefoneCliente,
                      [pedido.cidade, pedido.estado].filter(Boolean).join("/"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <p className="mt-1.5 text-xs text-slate-500">
                    {pedido.quantidadeItens} un. · {pedido.totalItensUnicos}{" "}
                    item
                    {pedido.totalItensUnicos === 1 ? "" : "s"}
                  </p>
                  {pedido.itens.length > 0 && (
                    <div className="mt-2 max-w-full space-y-1 overflow-hidden">
                      {pedido.itens.slice(0, 3).map((item) => {
                        const textoOpcao = getTextoOpcaoProduto(
                          item.tamanhoAnel,
                        );

                        return (
                          <div
                            key={item.id}
                            className="max-w-full overflow-hidden rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-600 ring-1 ring-slate-200"
                          >
                            <p className="line-clamp-1 font-medium text-slate-800">
                              {item.quantidade}x {item.nomeProduto}
                            </p>

                            {textoOpcao && (
                              <p className="mt-0.5 text-slate-500">
                                Opção:{" "}
                                <span className="font-medium text-slate-700">
                                  {textoOpcao}
                                </span>
                              </p>
                            )}

                            {item.adicionais.length > 0 && (
                              <p className="mt-0.5 truncate text-blue-700">
                                +{" "}
                                {item.adicionais
                                  .map((adicional) => adicional.nome)
                                  .join(", ")}
                              </p>
                            )}

                            {item.embalagemPresente && (
                              <div className="mt-1.5 rounded-xl border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-2 py-1.5 text-[11px] text-[var(--brand-blue)]">
                                <p className="flex min-w-0 items-center gap-1 font-semibold">
                                  <Gift className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    Presente: {item.embalagemPresente.nome}
                                  </span>
                                </p>

                                <p className="mt-0.5 text-slate-600">
                                  {moeda(item.embalagemPresente.valorTotal)}
                                </p>

                                {item.embalagemPresente.mensagem && (
                                  <p className="mt-0.5 line-clamp-1 text-slate-600">
                                    Mensagem: {item.embalagemPresente.mensagem}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {pedido.itens.length > 3 && (
                        <p className="text-[11px] text-slate-400">
                          + {pedido.itens.length - 3} item
                          {pedido.itens.length - 3 === 1 ? "" : "s"} no pedido
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="min-w-0 max-w-full overflow-hidden">
                  <div className="flex max-w-full flex-wrap gap-1.5 overflow-hidden sm:gap-2">
                    <span
                      className={`inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 sm:px-2.5 ${statusPagamentoClass(
                        pedido.statusPagamento,
                      )}`}
                    >
                      <CreditCard className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        Pag.: {labelStatusPagamento(pedido.statusPagamento)}
                      </span>
                    </span>

                    {pedido.gatewayPagamento && (
                      <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 sm:px-2.5">
                        <span className="truncate">
                          {pedido.gatewayPagamento}
                        </span>
                      </span>
                    )}

                    <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 sm:px-2.5">
                      <Truck className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {labelStatusEnvio(pedido.envio?.statusEnvio)}
                      </span>
                    </span>
                  </div>

                  {pedidoManualComLink && pagamentoPendente && (
                    <div className="mt-3 max-w-full overflow-hidden rounded-2xl border border-violet-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                        Link de pagamento
                      </p>

                      {pedido.linkPagamento ? (
                        <>
                          <p className="mt-1 max-w-full truncate rounded-xl bg-slate-50 px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-100">
                            {linkCompacto(pedido.linkPagamento)}
                          </p>

                          <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            <button
                              type="button"
                              onClick={() => copiarLinkPagamento(pedido)}
                              className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-3"
                            >
                              <Copy className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {linkCopiadoPedidoId === pedido.id
                                  ? "Copiado"
                                  : "Copiar"}
                              </span>
                            </button>

                            <a
                              href={pedido.linkPagamento}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-3"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Abrir</span>
                            </a>

                            {linkWhatsApp && (
                              <a
                                href={linkWhatsApp}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:px-3"
                              >
                                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">WhatsApp</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                cancelarLinkPagamentoManual(pedido)
                              }
                              disabled={estaCancelandoLink}
                              className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
                            >
                              <span className="truncate">
                                {estaCancelandoLink
                                  ? "Cancelando..."
                                  : "Cancelar link"}
                              </span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 text-xs text-amber-700">
                            Link indisponível ou expirado na Stripe.
                          </p>

                          <button
                            type="button"
                            onClick={() => cancelarLinkPagamentoManual(pedido)}
                            disabled={estaCancelandoLink}
                            className="mt-2 inline-flex h-8 max-w-full min-w-0 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="truncate">
                              {estaCancelandoLink
                                ? "Cancelando..."
                                : "Marcar cancelado"}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {pedidoManualComLink && pedido.statusPagamento === "PAGO" && (
                    <div className="mt-3 max-w-full overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      {pedido.vendaGerada ? (
                        <>
                          Venda gerada:{" "}
                          <Link
                            href={`/vendas`}
                            className="font-semibold underline-offset-4 hover:underline"
                          >
                            {pedido.vendaGerada.codigo}
                          </Link>
                        </>
                      ) : (
                        "Pagamento confirmado. Venda gerada não localizada na listagem."
                      )}
                    </div>
                  )}

                  {pedido.envio && (
                    <div className="mt-3 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      <p className="font-semibold text-slate-900">
                        {pedido.envio.tipoEntrega === "RETIRADA"
                          ? "Retirada local"
                          : "Frete escolhido"}
                      </p>

                      <p className="mt-1 truncate">
                        {pedido.entregaManual
                          ? pedido.entregaManual.label
                          : pedido.envio.tipoEntrega === "RETIRADA"
                          ? pedido.envio.servico || "Retirada local"
                          : [pedido.envio.transportadora, pedido.envio.servico]
                              .filter(Boolean)
                              .join(" - ") || "Entrega"}
                      </p>

                      <div className="mt-1 flex max-w-full flex-wrap gap-x-3 gap-y-1 overflow-hidden">
                        <span>{moeda(pedido.envio.valorFrete)}</span>
                        {pedido.envio.prazoDias !== null && (
                          <span>
                            {pedido.envio.prazoDias} dia
                            {pedido.envio.prazoDias === 1 ? "" : "s"}
                          </span>
                        )}
                        <span className="truncate">
                          {labelStatusEnvio(pedido.envio.statusEnvio)}
                        </span>
                      </div>

                      {pedido.entregaManual && (
                        <div className="mt-2 rounded-xl bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600 ring-1 ring-slate-200">
                          <p className="font-semibold text-slate-800">
                            {pedido.entregaManual.label}
                            {!pedido.entregaManual.distanciaPossivelmenteIncorreta &&
                            pedido.entregaManual.kmEstimado !== null
                              ? ` | ${pedido.entregaManual.kmEstimado} km`
                              : ""}
                            {" | "}
                            {moeda(pedido.entregaManual.valor)}
                          </p>
                          {pedido.entregaManual.distanciaPossivelmenteIncorreta ||
                          pedido.entregaManual.erroCalculo ? (
                            <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                              {pedido.entregaManual.erroCalculo ||
                                "Distancia possivelmente incorreta."}
                            </p>
                          ) : null}
                          {pedido.entregaManual.calculoAutomatico &&
                          (pedido.entregaManual.precisaoOrigem === "APROXIMADA" ||
                            pedido.entregaManual.precisaoDestino === "APROXIMADA") ? (
                            <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                              Endereco localizado de forma aproximada.
                            </p>
                          ) : null}
                          {pedido.entregaManual.endereco && (
                            <p className="mt-1 line-clamp-2">
                              {pedido.entregaManual.endereco}
                            </p>
                          )}
                          {pedido.entregaManual.observacao && (
                            <p className="mt-1 line-clamp-2">
                              {pedido.entregaManual.observacao}
                            </p>
                          )}
                          {pedido.entregaManual.mapsUrl && (
                            <a
                              href={pedido.entregaManual.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Ver rota no Maps
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {pedido.envio.statusEnvio === "PREPARADO" &&
                        pedido.envio.gatewayEnvioId && (
                          <p className="mt-2 max-w-full truncate text-[11px] font-semibold text-emerald-700">
                            Envio preparado: {pedido.envio.gatewayEnvioId}
                          </p>
                        )}

                      {pedido.envio.statusEnvio === "ETIQUETA_COMPRADA" &&
                        pedido.envio.gatewayEnvioId && (
                          <p className="mt-2 max-w-full truncate text-[11px] font-semibold text-emerald-700">
                            Etiqueta comprada: {pedido.envio.gatewayEnvioId}
                          </p>
                        )}

                      {pedido.envio.statusEnvio === "ETIQUETA_GERADA" &&
                        pedido.envio.gatewayEnvioId && (
                          <p className="mt-2 max-w-full truncate text-[11px] font-semibold text-emerald-700">
                            Etiqueta gerada: {pedido.envio.gatewayEnvioId}
                          </p>
                        )}

                      {pedido.envio.codigoRastreio && (
                        <p className="mt-2 max-w-full break-all text-[11px] font-semibold text-slate-700">
                          Rastreio: {pedido.envio.codigoRastreio}
                        </p>
                      )}

                      {podeAtualizarRastreioMelhorEnvio(pedido) && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Rastreio atualizado em{" "}
                          {dataCurta(pedido.envio.atualizadoEm)}
                        </p>
                      )}

                      {podePrepararEnvioMelhorEnvio(pedido) && (
                        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:inline-grid">
                          <button
                            type="button"
                            onClick={() => prepararEnvioMelhorEnvio(pedido)}
                            disabled={preparandoEnvioPedidoId === pedido.id}
                            className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Truck className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {preparandoEnvioPedidoId === pedido.id
                                ? "Preparando..."
                                : "Preparar envio"}
                            </span>
                          </button>
                        </div>
                      )}

                      {podeComprarEtiquetaMelhorEnvio(pedido) && (
                        <button
                          type="button"
                          onClick={() => comprarEtiquetaMelhorEnvio(pedido)}
                          disabled={comprandoEtiquetaPedidoId === pedido.id}
                          className="mt-3 inline-flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          <CreditCard className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {comprandoEtiquetaPedidoId === pedido.id
                              ? "Comprando..."
                              : "Comprar etiqueta"}
                          </span>
                        </button>
                      )}

                      {podeGerarEtiquetaMelhorEnvio(pedido) && (
                        <button
                          type="button"
                          onClick={() => gerarEtiquetaMelhorEnvio(pedido)}
                          disabled={gerandoEtiquetaPedidoId === pedido.id}
                          className="mt-3 inline-flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          <Package className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {gerandoEtiquetaPedidoId === pedido.id
                              ? "Gerando..."
                              : "Gerar etiqueta"}
                          </span>
                        </button>
                      )}

                      {podeImprimirEtiquetaMelhorEnvio(pedido) && (
                        <button
                          type="button"
                          onClick={() => imprimirEtiquetaMelhorEnvio(pedido)}
                          disabled={imprimindoEtiquetaPedidoId === pedido.id}
                          className="mt-3 inline-flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {imprimindoEtiquetaPedidoId === pedido.id
                              ? "Abrindo..."
                              : "Imprimir etiqueta"}
                          </span>
                        </button>
                      )}

                      {(pedido.envio.etiquetaUrl ||
                        pedido.envio.etiquetaPdfUrl) && (
                        <a
                          href={
                            pedido.envio.etiquetaPdfUrl ||
                            pedido.envio.etiquetaUrl ||
                            "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:w-auto"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Abrir etiqueta</span>
                        </a>
                      )}

                      {podeAtualizarRastreioMelhorEnvio(pedido) && (
                        <button
                          type="button"
                          onClick={() => atualizarRastreioMelhorEnvio(pedido)}
                          disabled={atualizandoRastreioPedidoId === pedido.id}
                          className="mt-3 inline-flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          <Truck className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {atualizandoRastreioPedidoId === pedido.id
                              ? "Atualizando..."
                              : "Atualizar rastreio"}
                          </span>
                        </button>
                      )}

                      {pedido.envio.tipoEntrega !== "RETIRADA" &&
                        pedido.envio.gatewayLogistico === "MELHOR_ENVIO" && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Rastreio manual pelo Melhor Envio.
                        </p>
                      )}
                    </div>
                  )}

                  {(possuiCupom ||
                    possuiCashbackUsado ||
                    possuiCashbackPrevisto) && (
                    <div className="mt-2 flex max-w-full flex-wrap gap-1.5 overflow-hidden">
                      {possuiCupom && (
                        <span className="max-w-full truncate rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          Cupom {pedido.cupomCodigo}
                        </span>
                      )}

                      {possuiCashbackUsado && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                          Cashback usado
                        </span>
                      )}

                      {possuiCashbackPrevisto && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                          Cashback previsto
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-2 border-t border-slate-100 pt-3 xl:items-end xl:border-t-0 xl:pt-0 xl:text-right">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Total
                    </p>

                    <p className="mt-0.5 text-base font-bold text-slate-950">
                      {moeda(pedido.total)}
                    </p>

                    {(possuiCupom || possuiCashbackUsado) && (
                      <div className="mt-1 flex max-w-full flex-wrap gap-x-2 gap-y-0.5 overflow-hidden text-[11px] xl:justify-end">
                        {possuiCupom && (
                          <span className="truncate text-emerald-700">
                            Cupom: -{moeda(pedido.cupomDescontoValor)}
                          </span>
                        )}

                        {possuiCashbackUsado && (
                          <span className="truncate text-blue-700">
                            Cashback: -{moeda(pedido.cashbackUsadoValor)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                    {acaoRapida && (
                      <button
                        type="button"
                        onClick={() => atualizarStatusRapido(pedido)}
                        disabled={estaProcessando}
                        className={`inline-flex h-8 min-w-0 items-center justify-center rounded-xl border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 ${acaoRapida.className}`}
                      >
                        <span className="truncate">
                          {estaProcessando
                            ? "Atualizando..."
                            : acaoRapida.label}
                        </span>
                      </button>
                    )}

                    <Link
                      href={`/pedidos/${pedido.id}`}
                      className="inline-flex h-8 min-w-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-3"
                    >
                      <span className="truncate">Abrir pedido</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
