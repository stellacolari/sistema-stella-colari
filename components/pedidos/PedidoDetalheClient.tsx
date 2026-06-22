"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  History,
  MapPin,
  Package,
  Sparkles,
  Tag,
  Truck,
  User,
} from "lucide-react";
import type { PedidoItemEmbalagemPresente } from "@/lib/pedidos/embalagens-presente";
import type { PedidoAlertaOperacional } from "@/lib/pedidos/alertas-operacionais";
import type { PedidoEntregaManual } from "@/lib/pedidos/entrega-manual";
import {
  etapaOperacionalPedido,
  estiloEtapaOperacional,
  labelEtapaOperacional,
  labelModalidadeOperacional,
  modalidadeOperacional,
  proximaAcaoMelhorEnvio,
  proximoPassoOperacional,
} from "@/lib/pedidos/etapas-operacionais";
import ImageBox from "@/components/ui/ImageBox";

export type PedidoDetalhe = {
  id: string;
  codigo: string;
  status: string;
  origemCanal: string;
  statusPagamento: string;
  metodoPagamento: string | null;
  gatewayPagamento: string | null;
  pagoEm: string | null;
  valorPago: number;
  codigoPedidoExterno?: string | null;
  statusExterno?: string | null;
  substatusExterno?: string | null;

  clienteId: string | null;
  clienteCodigo: string | null;
  clienteNome: string | null;

  nomeCliente: string;
  telefoneCliente: string;
  emailCliente: string | null;
  documento: string | null;

  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;

  subtotal: number;
  frete: number;
  total: number;

  cupomCodigo?: string | null;
  cupomDescontoValor?: number;

  cashbackBaseValor: number;
  cashbackPrevistoValor: number;
  cashbackCreditadoValor: number;
  cashbackUsadoValor?: number;
  cashbackStatus: string;

  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  alertasOperacionais?: PedidoAlertaOperacional[];
  entregaManual?: PedidoEntregaManual | null;

  itens: {
    id: string;
    produtoId: string | null;
    codigoInterno: string;
    nomeProduto: string;
    imagemUrl: string | null;
    categoria: string;
    tamanhoAnel: string | null;
    quantidade: number;
    precoUnitario: number;
    precoOriginal: number | null;
    descontoPercentual: number | null;
    geraCashback: boolean;
    cashbackBaseValor: number;
    total: number;
    embalagemPresente?: PedidoItemEmbalagemPresente | null;
    adicionais?: {
      id: string;
      opcaoAdicionalId: string | null;
      opcaoAdicionalNome: string | null;
      nome: string;

      itemPadraoSubstituidoId: string | null;
      itemPadraoSubstituidoCodigo: string | null;
      itemPadraoSubstituidoNome: string | null;

      itemAdicionalConsumidoId: string | null;
      itemAdicionalConsumidoCodigo: string | null;
      itemAdicionalConsumidoNome: string | null;

      quantidade: number;
      custoUnitario: number;
      valorVendaUnitario: number;
      custoTotal: number;
      valorVendaTotal: number;
      lucroTotal: number;
    }[];
  }[];

  envio: {
    id: string;
    tipoEntrega: string;
    transportadora: string | null;
    servico: string | null;
    statusEnvio: string;
    cepOrigem: string | null;
    cepDestino: string | null;
    pesoGramas: number | null;
    alturaCm: number | null;
    larguraCm: number | null;
    comprimentoCm: number | null;
    valorFrete: number;
    prazoDias: number | null;
    codigoRastreio: string | null;
    etiquetaUrl: string | null;
    etiquetaPdfUrl: string | null;
    declaracaoConteudoUrl: string | null;
    gatewayLogistico: string | null;
    gatewayEnvioId: string | null;
    postadoEm: string | null;
    entregueEm: string | null;
    observacoes: string | null;
  } | null;

  historico: {
    id: string;
    statusAnterior: string | null;
    statusNovo: string;
    tipoEvento: string;
    origem: string;
    usuarioNome: string | null;
    observacao: string | null;
    criadoEm: string;
  }[];
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataCompleta(dataIso: string | null | undefined) {
  if (!dataIso) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataIso));
}

function labelStatusPedido(status: string) {
  if (status === "PEDIDO_RECEBIDO") return "Pedido recebido";
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

function labelStatusPagamento(status: string) {
  if (status === "AGUARDANDO_PAGAMENTO") return "Aguardando pagamento";
  if (status === "PENDENTE") return "Pendente";
  if (status === "PAGO") return "Pago";
  if (status === "RECUSADO") return "Recusado";
  if (status === "ESTORNADO") return "Estornado";
  if (status === "CANCELADO") return "Cancelado";
  if (status === "EXPIRADO") return "Expirado";

  return status.replaceAll("_", " ");
}

function statusPedidoClass(status: string) {
  if (status === "PEDIDO_RECEBIDO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "PEDIDO_ENTREGUE" || status === "ENTREGUE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status === "CANCELADO" ||
    status === "PROBLEMA" ||
    status === "PROBLEMA_OPERACIONAL"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function labelCashbackStatus(status: string) {
  if (status === "PENDENTE") return "Pendente";
  if (status === "CREDITADO") return "Creditado";
  if (status === "ESTORNADO") return "Estornado";
  if (status === "NAO_APLICAVEL") return "Não aplicável";

  return status.replaceAll("_", " ");
}

function cashbackStatusClass(status: string) {
  if (status === "PENDENTE") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "CREDITADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "ESTORNADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function montarEndereco(pedido: PedidoDetalhe) {
  const partes = [
    pedido.rua,
    pedido.numero,
    pedido.complemento,
    pedido.bairro,
    pedido.cidade,
    pedido.estado,
    pedido.cep,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(", ") : "Endereço não informado";
}

function valorSeguro(value: number | null | undefined) {
  return Number(value || 0);
}
function getTextoOpcaoProduto(tamanhoAnel: string | null) {
  if (!tamanhoAnel) {
    return null;
  }

  return tamanhoAnel;
}
export default function PedidoDetalheClient({
  pedido,
  podeVerDadosFinanceiros = false,
}: {
  pedido: PedidoDetalhe;
  podeVerDadosFinanceiros?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [erroOperacao, setErroOperacao] = useState("");
  const etapa = etapaOperacionalPedido(pedido);
  const estiloEtapa = estiloEtapaOperacional(etapa);
  const modalidade = modalidadeOperacional(pedido);
  const proximoPasso = proximoPassoOperacional(pedido);
  const proximaAcaoMe = proximaAcaoMelhorEnvio(pedido);
  const subtotalProdutos = pedido.itens.reduce(
    (total, item) => total + valorSeguro(item.total),
    0
  );

  const subtotalAdicionais = pedido.itens.reduce((total, item) => {
    const adicionais = item.adicionais || [];

    return (
      total +
      adicionais.reduce(
        (subtotal, adicional) => subtotal + valorSeguro(adicional.valorVendaTotal),
        0
      )
    );
  }, 0);

  const subtotalEmbalagensPresente = pedido.itens.reduce(
    (total, item) => total + valorSeguro(item.embalagemPresente?.valorTotal),
    0
  );

  const custoAdicionais = pedido.itens.reduce((total, item) => {
    const adicionais = item.adicionais || [];

    return (
      total +
      adicionais.reduce(
        (subtotal, adicional) => subtotal + valorSeguro(adicional.custoTotal),
        0
      )
    );
  }, 0);

  const lucroAdicionais = pedido.itens.reduce((total, item) => {
    const adicionais = item.adicionais || [];

    return (
      total +
      adicionais.reduce(
        (subtotal, adicional) => subtotal + valorSeguro(adicional.lucroTotal),
        0
      )
    );
  }, 0);

  const cupomDescontoValor = valorSeguro(pedido.cupomDescontoValor);
  const cashbackUsado = valorSeguro(pedido.cashbackUsadoValor);
  const possuiAdicionais = subtotalAdicionais > 0;
  const possuiEmbalagensPresente = subtotalEmbalagensPresente > 0;
  const possuiCupom = cupomDescontoValor > 0;
  const possuiCashbackUsado = cashbackUsado > 0;
  const alertasOperacionais = pedido.alertasOperacionais || [];

  async function executarProximoPasso() {
    if (!proximoPasso) {
      return;
    }

    const confirmado = window.confirm(
      `${proximoPasso.label} do pedido ${pedido.codigo}?`,
    );

    if (!confirmado) {
      return;
    }

    setErroOperacao("");
    setAtualizandoStatus(true);

    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusNovo: proximoPasso.statusNovo,
          origem: "DETALHE_PEDIDO",
          usuarioNome: "Sistema",
          observacao: proximoPasso.observacao,
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
      setAtualizandoStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100`}>
        <div className={`border-l-8 ${estiloEtapa.cardClass} p-5`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${estiloEtapa.badgeClass}`}
                >
                  {labelEtapaOperacional(etapa)}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {labelStatusPagamento(pedido.statusPagamento)}
                </span>
                <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {labelModalidadeOperacional(modalidade)}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-bold text-slate-950">
                {pedido.codigo} · {pedido.nomeCliente}
              </h2>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                <p>
                  <span className="font-semibold text-slate-900">Total:</span>{" "}
                  {moeda(pedido.total)}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Pago:</span>{" "}
                  {moeda(pedido.valorPago)}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Telefone:</span>{" "}
                  {pedido.telefoneCliente || "Nao informado"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Criado:</span>{" "}
                  {dataCompleta(pedido.criadoEm)}
                </p>
              </div>

              {erroOperacao ? (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
                  {erroOperacao}
                </p>
              ) : null}
            </div>

            <div className={`rounded-2xl px-4 py-4 ring-1 ${estiloEtapa.softClass}`}>
              <p className="text-xs font-bold uppercase tracking-wide">
                Proxima acao
              </p>
              <p className="mt-2 text-sm leading-6">
                {proximoPasso?.descricao ||
                  (proximaAcaoMe
                    ? `Fluxo Melhor Envio: ${proximaAcaoMe}.`
                    : "Nenhuma acao operacional pendente para esta etapa.")}
              </p>

              {proximoPasso ? (
                <button
                  type="button"
                  onClick={executarProximoPasso}
                  disabled={atualizandoStatus || isPending}
                  className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-4 py-2 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${estiloEtapa.buttonClass}`}
                >
                  {atualizandoStatus || isPending
                    ? "Atualizando..."
                    : proximoPasso.label}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Status
          </p>

          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPedidoClass(
              pedido.status
            )}`}
          >
            {labelStatusPedido(pedido.status)}
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total final
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {moeda(pedido.total)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Frete: {moeda(pedido.frete)}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Cashback previsto
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-950">
            {moeda(pedido.cashbackPrevistoValor)}
          </p>

          <span
            className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cashbackStatusClass(
              pedido.cashbackStatus
            )}`}
          >
            {labelCashbackStatus(pedido.cashbackStatus)}
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Criado em
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-950">
            {dataCompleta(pedido.criadoEm)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Atualizado em {dataCompleta(pedido.atualizadoEm)}
          </p>
        </div>
      </section>

      {alertasOperacionais.length > 0 && (
        <section className="rounded-[2rem] border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-red-950">
                Alerta operacional
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-800">
                O pagamento foi registrado, mas este pedido precisa de
                conferencia antes da separacao ou embalagem.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {alertasOperacionais.map((alerta) => (
              <div
                key={alerta.id}
                className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                    {alerta.tipo}
                  </span>

                  {alerta.itemNome && (
                    <span className="text-xs font-medium text-slate-500">
                      Item: {alerta.itemNome}
                    </span>
                  )}

                  {alerta.componenteNome && (
                    <span className="text-xs font-medium text-slate-500">
                      Componente: {alerta.componenteNome}
                    </span>
                  )}
                </div>

                <p className="mt-2 font-semibold">{alerta.mensagem}</p>

                {alerta.detalhe && (
                  <p className="mt-1 leading-6 text-red-800">
                    {alerta.detalhe}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-slate-500" />

          <h2 className="text-lg font-semibold text-slate-950">
            Resumo financeiro
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Produtos {moeda(subtotalProdutos)}
          {possuiAdicionais ? ` · Adicionais ${moeda(subtotalAdicionais)}` : ""}
          {possuiEmbalagensPresente
            ? ` · Embalagens presente ${moeda(subtotalEmbalagensPresente)}`
            : ""}
          {possuiCupom ? ` · Cupom -${moeda(cupomDescontoValor)}` : ""}
          {possuiCashbackUsado ? ` · Cashback usado -${moeda(cashbackUsado)}` : ""}
          {" · "}
          Frete {moeda(pedido.frete)}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Produtos
            </p>

            <p className="mt-2 text-xl font-semibold text-slate-950">
              {moeda(subtotalProdutos)}
            </p>
          </div>

          {possuiAdicionais && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Adicionais
              </p>

              <p className="mt-2 text-xl font-semibold text-slate-950">
                {moeda(subtotalAdicionais)}
              </p>
            </div>
          )}

          {possuiEmbalagensPresente && (
            <div className="rounded-2xl border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-blue)]">
                Embalagens presente
              </p>

              <p className="mt-2 text-xl font-semibold text-slate-950">
                {moeda(subtotalEmbalagensPresente)}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Valor jÃ¡ incluÃ­do no total final do pedido.
              </p>
            </div>
          )}

          {possuiCupom && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Cupom aplicado
              </p>

              <p className="mt-2 text-xl font-semibold text-emerald-900">
                -{moeda(cupomDescontoValor)}
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                {pedido.cupomCodigo || "Cupom"}
              </p>
            </div>
          )}

          {possuiCashbackUsado && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Cashback usado
              </p>

              <p className="mt-2 text-xl font-semibold text-blue-950">
                -{moeda(cashbackUsado)}
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Descontado do saldo do cliente.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-900 bg-slate-950 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Total final
            </p>

            <p className="mt-2 text-xl font-semibold text-white">
              {moeda(pedido.total)}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-300">
              Frete: {moeda(pedido.frete)}
            </p>
          </div>
        </div>

        {possuiAdicionais && (
          <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Venda adicionais
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-950">
                {moeda(subtotalAdicionais)}
              </p>
            </div>

            {podeVerDadosFinanceiros && (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Custo adicionais
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {moeda(custoAdicionais)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Lucro adicionais
                  </p>

                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {moeda(lucroAdicionais)}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              Cliente
            </h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nome
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-950">
                {pedido.nomeCliente}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Telefone
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-950">
                {pedido.telefoneCliente}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                E-mail
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-950">
                {pedido.emailCliente || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                CPF
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-950">
                {pedido.documento || "—"}
              </p>
            </div>
          </div>

          {pedido.clienteId && (
            <Link
              href={`/clientes/${pedido.clienteId}`}
              className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Abrir cadastro do cliente
            </Link>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              Endereço
            </h2>
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-600">
            {montarEndereco(pedido)}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-500" />

              <h2 className="text-lg font-semibold text-slate-950">
                Itens do pedido
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Produtos, opções adicionais, embalagem premium e cashback por item.
            </p>
          </div>

          {possuiAdicionais && (
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              {moeda(subtotalAdicionais)} em adicionais
            </span>
          )}
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {pedido.itens.map((item) => {
            const adicionais = item.adicionais || [];
            const totalAdicionaisItem = adicionais.reduce(
              (total, adicional) => total + valorSeguro(adicional.valorVendaTotal),
              0
            );
            const totalEmbalagemPresenteItem =
              item.embalagemPresente?.valorTotal || 0;

            const totalCompletoItem =
              item.total + totalAdicionaisItem + totalEmbalagemPresenteItem;

            return (
              <article
                key={item.id}
                className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[72px_1fr_auto]"
              >
                <div className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden bg-slate-100">
                  {item.imagemUrl ? (
                    <img
                      src={item.imagemUrl}
                      alt={item.nomeProduto}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-slate-300" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-black/5" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {item.codigoInterno}
                  </p>

                  <h3 className="mt-1 text-sm font-semibold text-slate-950">
                    {item.nomeProduto}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.categoria}
                  </p>

                  {getTextoOpcaoProduto(item.tamanhoAnel) && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Opção escolhida:{" "}
                      <span className="font-semibold text-slate-700">
                        {getTextoOpcaoProduto(item.tamanhoAnel)}
                      </span>
                    </p>
                  )}

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.quantidade} un. × {moeda(item.precoUnitario)}
                  </p>
                  {getTextoOpcaoProduto(item.tamanhoAnel) && (
                    <div className="mt-2 inline-flex border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      Separar opção: {getTextoOpcaoProduto(item.tamanhoAnel)}
                    </div>
                  )}
                  {adicionais.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {adicionais.map((adicional) => (
                        <div
                          key={adicional.id}
                          className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold text-blue-800">
                                {adicional.nome}
                              </p>

                              <p className="mt-1 text-xs leading-5 text-blue-700">
                                {adicional.quantidade} un. ×{" "}
                                {moeda(adicional.valorVendaUnitario)}
                              </p>

                              {adicional.itemPadraoSubstituidoNome && (
                                <p className="mt-1 text-[11px] leading-5 text-blue-600">
                                  Substituiu:{" "}
                                  <strong>
                                    {adicional.itemPadraoSubstituidoCodigo} —{" "}
                                    {adicional.itemPadraoSubstituidoNome}
                                  </strong>
                                </p>
                              )}

                              {adicional.itemAdicionalConsumidoNome && (
                                <p className="mt-1 text-[11px] leading-5 text-blue-600">
                                  Consumiu:{" "}
                                  <strong>
                                    {adicional.itemAdicionalConsumidoCodigo} —{" "}
                                    {adicional.itemAdicionalConsumidoNome}
                                  </strong>
                                </p>
                              )}
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-xs font-semibold text-blue-900">
                                {moeda(adicional.valorVendaTotal)}
                              </p>

                              {podeVerDadosFinanceiros && (
                                <>
                                  <p className="mt-1 text-[11px] text-blue-600">
                                    Custo: {moeda(adicional.custoTotal)}
                                  </p>

                                  <p className="mt-1 text-[11px] text-emerald-700">
                                    Lucro: {moeda(adicional.lucroTotal)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.embalagemPresente && (
                    <div className="mt-3 rounded-2xl border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-3 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="h-16 w-16 shrink-0 bg-white ring-1 ring-white/80 [&>div]:h-full [&>div]:w-full [&>div]:rounded-none">
                          <ImageBox
                            src={item.embalagemPresente.imagemUrl}
                            alt={item.embalagemPresente.nome}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-blue)]">
                            Preparar como presente
                          </p>

                          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {item.embalagemPresente.nome}
                              </p>

                              {item.embalagemPresente.descricao && (
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {item.embalagemPresente.descricao}
                                </p>
                              )}
                            </div>

                            <p className="shrink-0 text-sm font-semibold text-slate-950">
                              {moeda(item.embalagemPresente.valorTotal)}
                            </p>
                          </div>

                          <p className="mt-1 text-xs text-slate-600">
                            {item.quantidade} un. x{" "}
                            {moeda(item.embalagemPresente.precoUnitario)}
                          </p>

                          {item.embalagemPresente.mensagem && (
                            <div className="mt-3 rounded-xl bg-white/80 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Mensagem do presente
                              </p>

                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {item.embalagemPresente.mensagem}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {item.geraCashback && (
                    <p className="mt-2 text-xs font-medium text-[var(--brand-blue)]">
                      Cashback base: {moeda(item.cashbackBaseValor)}
                    </p>
                  )}
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-slate-950">
                    {moeda(totalCompletoItem)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Produto: {moeda(item.total)}
                  </p>

                  {totalAdicionaisItem > 0 && (
                    <p className="mt-1 text-xs text-blue-700">
                      Adicionais: {moeda(totalAdicionaisItem)}
                    </p>
                  )}

                  {item.embalagemPresente && (
                    <p className="mt-1 text-xs text-[var(--brand-blue)]">
                      Presente: {moeda(totalEmbalagemPresenteItem)}
                    </p>
                  )}

                  {item.descontoPercentual !== null && (
                    <p className="mt-1 text-xs text-slate-500">
                      Desconto: {item.descontoPercentual}%
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              Envio
            </h2>
          </div>

          {pedido.envio ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {pedido.envio.statusEnvio}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Entrega
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {moeda(pedido.envio.valorFrete)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Transportadora
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {pedido.envio.transportadora || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Rastreio
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {pedido.envio.codigoRastreio || "—"}
                </p>
              </div>
              </div>

              {pedido.entregaManual && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Entrega manual
                  </p>
                  <p className="mt-2 font-semibold">
                    {pedido.entregaManual.label} |{" "}
                    {moeda(pedido.entregaManual.valor)}
                  </p>
                  {pedido.entregaManual.distanciaPossivelmenteIncorreta ||
                  pedido.entregaManual.erroCalculo ? (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-amber-200">
                      {pedido.entregaManual.erroCalculo ||
                        "Distancia possivelmente incorreta. Revise a rota antes de usar esse valor."}
                    </p>
                  ) : null}
                  {pedido.entregaManual.calculoAutomatico &&
                  (pedido.entregaManual.avisoDestinoAproximado ||
                    String(pedido.entregaManual.precisaoOrigem || "").startsWith("APROXIMADA") ||
                    String(pedido.entregaManual.precisaoDestino || "").startsWith("APROXIMADA")) ? (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-amber-200">
                      Destino aproximado. Confira a rota no Maps antes de usar esse valor.
                    </p>
                  ) : null}
                  {pedido.entregaManual.origemCoordenadaFixa ? (
                    <p className="mt-2 inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800 ring-1 ring-emerald-200">
                      Origem por localizacao exata
                    </p>
                  ) : null}
                  {pedido.entregaManual.precisaoDestino === "COORDENADA_FIXA" ? (
                    <p className="mt-2 inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800 ring-1 ring-emerald-200">
                      Destino por localizacao exata
                    </p>
                  ) : null}
                  {!pedido.entregaManual.calculoAutomatico &&
                  !pedido.entregaManual.erroCalculo ? (
                    <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-700 ring-1 ring-slate-200">
                      Entrega antiga sem calculo automatico registrado.
                    </p>
                  ) : null}
                  {!pedido.entregaManual.distanciaPossivelmenteIncorreta &&
                    pedido.entregaManual.kmEstimado !== null && (
                    <p className="mt-1 text-blue-800">
                      Distância ida: {pedido.entregaManual.kmIda} km
                      {pedido.entregaManual.kmIdaVolta !== null
                        ? ` | ida e volta: ${pedido.entregaManual.kmIdaVolta} km`
                        : ""}
                    </p>
                  )}
                  {pedido.entregaManual.duracaoTexto && (
                    <p className="mt-1 text-blue-800">
                      Duração estimada de ida: {pedido.entregaManual.duracaoTexto}
                    </p>
                  )}
                  {pedido.entregaManual.origem && (
                    <p className="mt-1 leading-6 text-blue-800">
                      Origem: {pedido.entregaManual.origem}
                    </p>
                  )}
                  {pedido.entregaManual.endereco && (
                    <p className="mt-1 leading-6 text-blue-800">
                      Destino: {pedido.entregaManual.endereco}
                    </p>
                  )}
                  {pedido.entregaManual.mapsUrl && (
                    <a
                      href={pedido.entregaManual.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-800 ring-1 ring-blue-200 transition hover:bg-blue-100"
                    >
                      Ver rota no Maps
                    </a>
                  )}
                  {pedido.entregaManual.observacao && (
                    <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white/80 px-3 py-2 leading-6 text-slate-700">
                      {pedido.entregaManual.observacao}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma informação de envio registrada.
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              Cashback
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Base de cálculo
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-950">
                {moeda(pedido.cashbackBaseValor)}
              </p>

              {possuiCashbackUsado && (
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Cashback usado: -{moeda(cashbackUsado)}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Previsto
              </p>

              <p className="mt-1 text-sm font-semibold text-blue-950">
                {moeda(pedido.cashbackPrevistoValor)}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Creditado
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-950">
                {moeda(pedido.cashbackCreditadoValor)}
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cashbackStatusClass(
                pedido.cashbackStatus
              )}`}
            >
              {labelCashbackStatus(pedido.cashbackStatus)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-500" />

          <h2 className="text-lg font-semibold text-slate-950">
            Histórico do pedido
          </h2>
        </div>

        {pedido.historico.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Nenhum histórico registrado.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100 rounded-3xl border border-slate-200">
            {pedido.historico.map((historico) => (
              <div
                key={historico.id}
                className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {labelStatusPedido(historico.statusNovo)}
                    </span>

                    <span className="text-xs text-slate-400">
                      {historico.tipoEvento} · {historico.origem}
                    </span>
                  </div>

                  {historico.observacao && (
                    <p className="mt-2 text-sm text-slate-600">
                      {historico.observacao}
                    </p>
                  )}

                  {historico.usuarioNome && (
                    <p className="mt-1 text-xs text-slate-400">
                      Por {historico.usuarioNome}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 md:justify-end">
                  <CalendarClock className="h-4 w-4" />
                  {dataCompleta(historico.criadoEm)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {pedido.observacoes && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Observações
          </h2>

          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
            {pedido.observacoes}
          </p>
        </section>
      )}
    </div>
  );
}
