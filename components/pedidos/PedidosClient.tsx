"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Filter,
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
  pagoEm: string | null;
  valorPago: number;

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
  { value: "ACAO", label: "Precisa de ação" },
  { value: "PAGAMENTO", label: "Pagamento pendente" },
  { value: "SEPARAR", label: "Pagos para separar" },
  { value: "ENVIO", label: "Envio/preparação" },
  { value: "PROBLEMA", label: "Problema/cancelado" },
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
  if (status === "PAGO") return "Pago";
  if (status === "RECUSADO") return "Recusado";
  if (status === "ESTORNADO") return "Estornado";
  if (status === "CANCELADO") return "Cancelado";

  return status.replaceAll("_", " ");
}

function statusPagamentoClass(status: string) {
  if (status === "PAGO") {
    return "text-emerald-700";
  }

  if (status === "AGUARDANDO_PAGAMENTO") {
    return "text-amber-700";
  }

  if (status === "RECUSADO" || status === "CANCELADO") {
    return "text-red-700";
  }

  if (status === "ESTORNADO") {
    return "text-orange-700";
  }

  return "text-slate-600";
}

function labelStatusEnvio(status: string | null | undefined) {
  if (!status) return "Sem envio";
  if (status === "PENDENTE") return "Pendente";
  if (status === "EM_PREPARACAO") return "Em preparação";
  if (status === "POSTADO") return "Postado";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "PROBLEMA") return "Problema";

  return status.replaceAll("_", " ");
}

function pedidoPrecisaAcao(pedido: PedidoOperacionalItem) {
  if (pedido.status === "PROBLEMA") return true;
  if (pedido.statusPagamento === "AGUARDANDO_PAGAMENTO") return true;

  return (
    pedido.statusPagamento === "PAGO" &&
    pedido.status === "PEDIDO_RECEBIDO"
  );
}

function passaFiltroRapido(pedido: PedidoOperacionalItem, filtro: string) {
  if (filtro === "TODOS") return true;

  if (filtro === "ACAO") {
    return pedidoPrecisaAcao(pedido);
  }

  if (filtro === "PAGAMENTO") {
    return pedido.statusPagamento === "AGUARDANDO_PAGAMENTO";
  }

  if (filtro === "SEPARAR") {
    return (
      pedido.statusPagamento === "PAGO" &&
      pedido.status === "PEDIDO_RECEBIDO"
    );
  }

  if (filtro === "ENVIO") {
    return (
      pedido.envio?.statusEnvio === "PENDENTE" ||
      pedido.envio?.statusEnvio === "EM_PREPARACAO"
    );
  }

  if (filtro === "PROBLEMA") {
    return pedido.status === "PROBLEMA" || pedido.status === "CANCELADO";
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
      pedido.envio?.statusEnvio,
      pedido.envio?.transportadora,
      pedido.envio?.codigoRastreio,
      pedido.cupomCodigo,
    ].join(" ")
  );

  return texto.includes(termo);
}

function getMensagemAcao(pedido: PedidoOperacionalItem) {
  if (pedido.status === "PROBLEMA") {
    return {
      label: "Ver problema",
      className: "text-red-700",
      icon: AlertCircle,
    };
  }

  if (pedido.statusPagamento === "AGUARDANDO_PAGAMENTO") {
    return {
      label: "Aguardando pagamento",
      className: "text-amber-700",
      icon: CreditCard,
    };
  }

  if (
    pedido.statusPagamento === "PAGO" &&
    pedido.status === "PEDIDO_RECEBIDO"
  ) {
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
    pedido.statusPagamento === "AGUARDANDO_PAGAMENTO" &&
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

export default function PedidosClient({ pedidos }: PedidosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [filtroRapido, setFiltroRapido] = useState("ACAO");
  const [erroOperacao, setErroOperacao] = useState("");
  const [processandoPedidoId, setProcessandoPedidoId] = useState<string | null>(
    null
  );

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      return (
        passaFiltroRapido(pedido, filtroRapido) &&
        pedidoCombinaBusca(pedido, busca)
      );
    });
  }, [busca, filtroRapido, pedidos]);

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

          <div className="grid gap-3 md:grid-cols-[1fr_220px] xl:w-[620px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar pedido, cliente, cidade, rastreio..."
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label className="relative block">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={filtroRapido}
                onChange={(event) => setFiltroRapido(event.target.value)}
                className="h-11 w-full appearance-none rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
              >
                {FILTROS_RAPIDOS.map((filtro) => (
                  <option key={filtro.value} value={filtro.value}>
                    {filtro.label}
                  </option>
                ))}
              </select>
            </label>
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

            return (
              <article
                key={pedido.id}
                className="grid items-center gap-4 px-5 py-3 transition hover:bg-slate-50 xl:grid-cols-[minmax(180px,0.9fr)_minmax(260px,1.2fr)_minmax(220px,1fr)_minmax(260px,auto)]"
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
                      {labelStatusPedido(pedido.status)}
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
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-slate-200 ${statusPagamentoClass(
                        pedido.statusPagamento
                      )}`}
                    >
                      <CreditCard className="h-3 w-3" />
                      {labelStatusPagamento(pedido.statusPagamento)}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      <Truck className="h-3 w-3" />
                      {labelStatusEnvio(pedido.envio?.statusEnvio)}
                    </span>
                  </div>

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