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
  MessageCircle,
  Package,
  Search,
  Truck,
} from "lucide-react";

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
  { value: "SITE", label: "Site" },
  { value: "MANUAL_LINK", label: "Manual com link" },
  { value: "PAGAMENTO", label: "Aguardando pagamento" },
  { value: "SEPARAR", label: "Pago / para separar" },
  { value: "ANDAMENTO", label: "Enviado / em andamento" },
  { value: "CANCELADOS", label: "Cancelados / expirados" },
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

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatusPedido(status: string) {
  if (status === "PEDIDO_RECEBIDO") return "Recebido";
  if (status === "PEDIDO_SEPARADO") return "Separado";
  if (status === "PEDIDO_ENVIADO") return "Enviado";
  if (status === "PEDIDO_ENTREGUE") return "Entregue";
  if (status === "CANCELADO") return "Cancelado";
  if (status === "PROBLEMA") return "Problema";

  return status.replaceAll("_", " ");
}

function statusPedidoClass(status: string) {
  if (status === "PEDIDO_RECEBIDO") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "PEDIDO_SEPARADO" || status === "PEDIDO_ENVIADO") {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }

  if (status === "PEDIDO_ENTREGUE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "CANCELADO" || status === "PROBLEMA") {
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

  if (status === "RECUSADO" || status === "CANCELADO" || status === "EXPIRADO") {
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
    pedido.statusPagamento === "PAGO" && pedido.status === "PEDIDO_RECEBIDO"
  );
}

function isPedidoPago(pedido: PedidoOperacionalItem) {
  return pedido.statusPagamento === "PAGO" && !isPedidoCanceladoOuExpirado(pedido);
}

function podePrepararEnvioMelhorEnvio(pedido: PedidoOperacionalItem) {
  return (
    pedido.origemCanal === "LOJA_STELLA" &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "PENDENTE"
  );
}

function podeComprarEtiquetaMelhorEnvio(pedido: PedidoOperacionalItem) {
  return (
    pedido.origemCanal === "LOJA_STELLA" &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "PREPARADO" &&
    Boolean(pedido.envio.gatewayEnvioId)
  );
}

function isPedidoEmAndamento(pedido: PedidoOperacionalItem) {
  return (
    pedido.status === "PEDIDO_SEPARADO" ||
    pedido.status === "PEDIDO_ENVIADO" ||
    pedido.envio?.statusEnvio === "EM_PREPARACAO" ||
    pedido.envio?.statusEnvio === "POSTADO"
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

  if (filtro === "SITE") {
    return pedido.origemCanal === "LOJA_STELLA";
  }

  if (filtro === "MANUAL_LINK") {
    return isPedidoManualComLink(pedido);
  }

  if (filtro === "PAGAMENTO") {
    return isPagamentoPendente(pedido);
  }

  if (filtro === "SEPARAR") {
    return isPedidoPago(pedido);
  }

  if (filtro === "ANDAMENTO") {
    return isPedidoEmAndamento(pedido) && !isPedidoCanceladoOuExpirado(pedido);
  }

  if (filtro === "CANCELADOS") {
    return isPedidoCanceladoOuExpirado(pedido) || pedido.status === "PROBLEMA";
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
    ].join(" ")
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
      label: "Separar pedido",
      className: "text-emerald-700",
      icon: Package,
    };
  }

  if (
    pedido.envio?.statusEnvio === "PENDENTE" ||
    pedido.envio?.statusEnvio === "EM_PREPARACAO"
  ) {
    return {
      label: "Preparar envio",
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
      statusNovo: "PEDIDO_SEPARADO",
      label: "Separado",
      confirmacao: `Marcar o pedido ${pedido.codigo} como separado?`,
      observacao: "Pedido marcado como separado pela lista operacional.",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    };
  }

  if (pedido.status === "PEDIDO_SEPARADO") {
    return {
      statusNovo: "PEDIDO_ENVIADO",
      label: "Enviado",
      confirmacao: `Marcar o pedido ${pedido.codigo} como enviado?`,
      observacao: "Pedido marcado como enviado pela lista operacional.",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    };
  }

  if (pedido.status === "PEDIDO_ENVIADO") {
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
      className:
        "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    };
  }

  return null;
}

function isPedidoManualComLink(pedido: PedidoOperacionalItem) {
  return pedido.origemCanal === "ADMIN_MANUAL";
}

function origemPedidoLabel(pedido: PedidoOperacionalItem) {
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
  const [erroOperacao, setErroOperacao] = useState("");
  const [linkCopiadoPedidoId, setLinkCopiadoPedidoId] = useState<string | null>(
    null
  );
  const [processandoPedidoId, setProcessandoPedidoId] = useState<string | null>(
    null
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

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      return (
        passaFiltroRapido(pedido, filtroRapido) &&
        pedidoCombinaBusca(pedido, busca)
      );
    });
  }, [busca, filtroRapido, pedidos]);

  const contadoresFiltro = useMemo(() => {
    return new Map(
      FILTROS_RAPIDOS.map((filtro) => [
        filtro.value,
        pedidos.filter((pedido) => passaFiltroRapido(pedido, filtro.value))
          .length,
      ])
    );
  }, [pedidos]);

  const resumoOperacional = useMemo(() => {
    return {
      linksPendentes: pedidos.filter(
        (pedido) => isPedidoManualComLink(pedido) && isPagamentoPendente(pedido)
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
      0
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
      `Cancelar o link de pagamento do pedido ${pedido.codigo}? A sessão Stripe será expirada quando possível e o estoque não será baixado.`
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
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroOperacao(
          data.error || "Erro ao cancelar link de pagamento manual."
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
      `Comprar/pagar a etiqueta do Melhor Envio para o pedido ${pedido.codigo}? A geração e impressão continuarão pendentes.`
    );

    if (!confirmado) {
      return;
    }

    setErroOperacao("");
    setComprandoEtiquetaPedidoId(pedido.id);

    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/comprar-etiqueta`, {
        method: "PATCH",
      });

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

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Lista de pedidos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {pedidosFiltrados.length} pedido
              {pedidosFiltrados.length === 1 ? "" : "s"} exibido
              {pedidosFiltrados.length === 1 ? "" : "s"} ·{" "}
              {moeda(totalFiltrado)}
            </p>

            {erroOperacao && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erroOperacao}
              </div>
            )}
          </div>

          <div className="grid gap-3 xl:w-[680px]">
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

        <div className="mt-4 flex flex-wrap gap-2">
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

        <div className="mt-4 grid gap-2 md:grid-cols-4">
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
        <div className="divide-y divide-slate-100">
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

            return (
              <article
                key={pedido.id}
                className={`grid items-center gap-4 px-5 py-3 transition hover:bg-slate-50 xl:grid-cols-[minmax(180px,0.9fr)_minmax(260px,1.2fr)_minmax(240px,1fr)_minmax(260px,auto)] ${
                  destaquePedidoClass
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/pedidos/${pedido.id}`}
                      className="text-sm font-bold text-slate-950 underline-offset-4 hover:underline"
                    >
                      {pedido.codigo}
                    </Link>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusPedidoClass(
                        pedido.status
                      )}`}
                    >
                      Operação: {labelStatusPedido(pedido.status)}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${origemPedidoClass(
                        pedido
                      )}`}
                    >
                      Origem: {origemPedidoLabel(pedido)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Criado em {dataCurta(pedido.criadoEm)}
                  </p>

                  <p
                    className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${acao.className}`}
                  >
                    <IconeAcao className="h-3.5 w-3.5" />
                    {acao.label}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {pedido.clienteNome || pedido.nomeCliente}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {pedido.telefoneCliente}
                    {pedido.cidade || pedido.estado ? " · " : ""}
                    {[pedido.cidade, pedido.estado].filter(Boolean).join("/")}
                  </p>

                  <p className="mt-1.5 text-xs text-slate-500">
                    {pedido.quantidadeItens} un. · {pedido.totalItensUnicos} item
                    {pedido.totalItensUnicos === 1 ? "" : "s"}
                  </p>
                  {pedido.itens.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {pedido.itens.slice(0, 3).map((item) => {
                        const textoOpcao = getTextoOpcaoProduto(item.tamanhoAnel);

                        return (
                          <div
                            key={item.id}
                            className="rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-600 ring-1 ring-slate-200"
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
                              <p className="mt-0.5 text-blue-700">
                                + {item.adicionais.map((adicional) => adicional.nome).join(", ")}
                              </p>
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

                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusPagamentoClass(
                        pedido.statusPagamento
                      )}`}
                    >
                      <CreditCard className="h-3 w-3" />
                      Pagamento: {labelStatusPagamento(pedido.statusPagamento)}
                    </span>

                    {pedido.gatewayPagamento && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {pedido.gatewayPagamento}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      <Truck className="h-3 w-3" />
                      {labelStatusEnvio(pedido.envio?.statusEnvio)}
                    </span>
                  </div>

                  {pedidoManualComLink && pagamentoPendente && (
                    <div className="mt-3 rounded-2xl border border-violet-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                        Link de pagamento
                      </p>

                      {pedido.linkPagamento ? (
                        <>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {pedido.linkPagamento}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => copiarLinkPagamento(pedido)}
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {linkCopiadoPedidoId === pedido.id
                                ? "Copiado"
                                : "Copiar"}
                            </button>

                            <a
                              href={pedido.linkPagamento}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir
                            </a>

                            {linkWhatsApp && (
                              <a
                                href={linkWhatsApp}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                cancelarLinkPagamentoManual(pedido)
                              }
                              disabled={estaCancelandoLink}
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {estaCancelandoLink
                                ? "Cancelando..."
                                : "Cancelar link"}
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
                            className="mt-2 inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {estaCancelandoLink
                              ? "Cancelando..."
                              : "Marcar cancelado"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {pedidoManualComLink && pedido.statusPagamento === "PAGO" && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
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

                  {!pedidoManualComLink && pedido.envio && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      <p className="font-semibold text-slate-900">
                        {pedido.envio.tipoEntrega === "RETIRADA"
                          ? "Retirada local"
                          : "Frete escolhido"}
                      </p>

                      <p className="mt-1">
                        {pedido.envio.tipoEntrega === "RETIRADA"
                          ? pedido.envio.servico || "Retirada local"
                          : [pedido.envio.transportadora, pedido.envio.servico]
                              .filter(Boolean)
                              .join(" - ") || "Entrega"}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>{moeda(pedido.envio.valorFrete)}</span>
                        {pedido.envio.prazoDias !== null && (
                          <span>
                            {pedido.envio.prazoDias} dia
                            {pedido.envio.prazoDias === 1 ? "" : "s"}
                          </span>
                        )}
                        <span>{labelStatusEnvio(pedido.envio.statusEnvio)}</span>
                      </div>

                      {pedido.envio.statusEnvio === "PREPARADO" &&
                        pedido.envio.gatewayEnvioId && (
                          <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                            Envio preparado: {pedido.envio.gatewayEnvioId}
                          </p>
                        )}

                      {pedido.envio.statusEnvio === "ETIQUETA_COMPRADA" &&
                        pedido.envio.gatewayEnvioId && (
                          <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                            Etiqueta comprada: {pedido.envio.gatewayEnvioId}
                          </p>
                        )}

                      {podePrepararEnvioMelhorEnvio(pedido) && (
                        <button
                          type="button"
                          onClick={() => prepararEnvioMelhorEnvio(pedido)}
                          disabled={preparandoEnvioPedidoId === pedido.id}
                          className="mt-3 inline-flex h-8 items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          {preparandoEnvioPedidoId === pedido.id
                            ? "Preparando..."
                            : "Preparar envio"}
                        </button>
                      )}

                      {podeComprarEtiquetaMelhorEnvio(pedido) && (
                        <button
                          type="button"
                          onClick={() => comprarEtiquetaMelhorEnvio(pedido)}
                          disabled={comprandoEtiquetaPedidoId === pedido.id}
                          className="mt-3 inline-flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          {comprandoEtiquetaPedidoId === pedido.id
                            ? "Comprando..."
                            : "Comprar etiqueta"}
                        </button>
                      )}

                      {pedido.envio.tipoEntrega !== "RETIRADA" && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Geração, impressão e rastreio serão adicionados em etapa futura.
                        </p>
                      )}
                    </div>
                  )}

                  {(possuiCupom ||
                    possuiCashbackUsado ||
                    possuiCashbackPrevisto) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {possuiCupom && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
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

                <div className="flex flex-col gap-2 xl:items-end xl:text-right">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Total
                    </p>

                    <p className="mt-0.5 text-base font-bold text-slate-950">
                      {moeda(pedido.total)}
                    </p>

                    {(possuiCupom || possuiCashbackUsado) && (
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] xl:justify-end">
                        {possuiCupom && (
                          <span className="text-emerald-700">
                            Cupom: -{moeda(pedido.cupomDescontoValor)}
                          </span>
                        )}

                        {possuiCashbackUsado && (
                          <span className="text-blue-700">
                            Cashback: -{moeda(pedido.cashbackUsadoValor)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {acaoRapida && (
                      <button
                        type="button"
                        onClick={() => atualizarStatusRapido(pedido)}
                        disabled={estaProcessando}
                        className={`inline-flex h-8 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${acaoRapida.className}`}
                      >
                        {estaProcessando ? "Atualizando..." : acaoRapida.label}
                      </button>
                    )}

                    <Link
                      href={`/pedidos/${pedido.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Abrir pedido
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
