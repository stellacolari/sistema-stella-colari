import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  Gift,
  MapPin,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import PagarPedidoStripeButton from "@/components/loja/PagarPedidoStripeButton";
import type { ComponentProps } from "react";

type MenuPublicoLojaProps = ComponentProps<typeof MenuPublicoLoja>;

export type PedidoPublicoItem = {
  id: string;
  codigoInterno: string;
  nomeProduto: string;
  imagemUrl: string | null;
  categoria: string;
  tamanhoAnel: string | null;
  quantidade: number;
  precoUnitario: number;
  total: number;
  adicionais: {
    id: string;
    nome: string;
    quantidade: number;
    valorVendaUnitario: number;
    valorVendaTotal: number;
  }[];
};

export type PedidoPublicoData = {
  id: string;
  codigo: string;

  nomeCliente: string;
  telefoneCliente: string;
  emailCliente: string | null;

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

  cupomCodigo: string | null;
  cupomDescontoValor: number;

  cashbackBaseValor: number;
  cashbackPrevistoValor: number;
  cashbackCreditadoValor: number;
  cashbackUsadoValor: number;
  cashbackStatus: string;

  status: string;
  statusPagamento: string;
  metodoPagamento: string | null;
  pagoEm: string | null;
  valorPago: number;

  criadoEm: string;

  envio: {
    statusEnvio: string;
    transportadora: string | null;
    servico: string | null;
    codigoRastreio: string | null;
    valorFrete: number;
    prazoDias: number | null;
    postadoEm: string | null;
    entregueEm: string | null;
  } | null;

  itens: PedidoPublicoItem[];
};

type PedidoPublicoClientProps = {
  menus: MenuPublicoLojaProps["menus"];
  categoriasMenu: MenuPublicoLojaProps["categorias"];
  pedido: PedidoPublicoData;
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
  if (status === "PEDIDO_SEPARADO") return "Em separação";
  if (status === "PEDIDO_ENVIADO") return "Enviado";
  if (status === "PEDIDO_ENTREGUE") return "Entregue";
  if (status === "CANCELADO") return "Cancelado";
  if (status === "PROBLEMA") return "Em análise";

  return status.replaceAll("_", " ");
}

function labelPagamento(status: string) {
  if (status === "AGUARDANDO_PAGAMENTO") return "Aguardando pagamento";
  if (status === "PAGO") return "Pagamento confirmado";
  if (status === "RECUSADO") return "Pagamento recusado";
  if (status === "ESTORNADO") return "Pagamento estornado";
  if (status === "CANCELADO") return "Pagamento cancelado";

  return status.replaceAll("_", " ");
}

function labelEnvio(status: string | null | undefined) {
  if (!status) return "Envio pendente";
  if (status === "PENDENTE") return "Envio pendente";
  if (status === "EM_PREPARACAO") return "Em preparação";
  if (status === "POSTADO") return "Postado";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "PROBLEMA") return "Problema no envio";

  return status.replaceAll("_", " ");
}

function pagamentoClass(status: string) {
  if (status === "PAGO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "AGUARDANDO_PAGAMENTO") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "RECUSADO" || status === "CANCELADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "ESTORNADO") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function pedidoClass(status: string) {
  if (status === "PEDIDO_RECEBIDO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "PEDIDO_SEPARADO" || status === "PEDIDO_ENVIADO") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (status === "PEDIDO_ENTREGUE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "CANCELADO" || status === "PROBLEMA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}
function getTextoOpcaoProduto(item: PedidoPublicoItem) {
  if (!item.tamanhoAnel) {
    return null;
  }

  return item.tamanhoAnel;
}
function montarEndereco(pedido: PedidoPublicoData) {
  const partes = [
    pedido.rua,
    pedido.numero,
    pedido.complemento,
    pedido.bairro,
    pedido.cidade && pedido.estado
      ? `${pedido.cidade}/${pedido.estado}`
      : pedido.cidade || pedido.estado,
    pedido.cep,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(", ") : "Endereço não informado";
}

export default function PedidoPublicoClient({
  menus,
  categoriasMenu,
  pedido,
}: PedidoPublicoClientProps) {
const possuiCupom = pedido.cupomDescontoValor > 0;
const possuiCashbackUsado = pedido.cashbackUsadoValor > 0;
const possuiCashbackPrevisto = pedido.cashbackPrevistoValor > 0;
const possuiCashbackCreditado = pedido.cashbackCreditadoValor > 0;

const pagamentoConfirmado = pedido.statusPagamento === "PAGO";
const pagamentoPendente = pedido.statusPagamento === "AGUARDANDO_PAGAMENTO";
const pagamentoNaoConcluido =
  pedido.statusPagamento === "CANCELADO" ||
  pedido.statusPagamento === "RECUSADO" ||
  pedido.statusPagamento === "ESTORNADO";

  const subtotalItens = pedido.itens.reduce((total, item) => {
    const adicionais = item.adicionais.reduce(
      (subtotal, adicional) => subtotal + adicional.valorVendaTotal,
      0
    );

    return total + item.total + adicionais;
  }, 0);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
      />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl brand-bg-soft">
                <CheckCircle2 className="h-6 w-6 brand-text" />
              </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.26em] brand-text">
                {pagamentoConfirmado
                    ? "Pedido confirmado"
                    : pagamentoNaoConcluido
                    ? "Pagamento não concluído"
                    : "Pedido recebido"}
                </p>

              <h1 className="mt-3 text-3xl font-light tracking-tight text-slate-950 md:text-5xl">
                {pedido.codigo}
              </h1>
                <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-slate-500">
                {pagamentoConfirmado
                    ? "Seu pagamento foi confirmado. Acompanhe abaixo o status de separação e entrega."
                    : pagamentoNaoConcluido
                    ? "O pagamento deste pedido não foi concluído. Faça uma nova compra ou entre em contato para verificar a situação."
                    : "Recebemos seu pedido. Agora finalize o pagamento para seguirmos com a separação e entrega."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${pedidoClass(
                    pedido.status
                    )}`}
                >
                    {labelStatusPedido(pedido.status)}
                </span>

                <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${pagamentoClass(
                    pedido.statusPagamento
                    )}`}
                >
                    {labelPagamento(pedido.statusPagamento)}
                </span>
                </div>

                {pagamentoNaoConcluido && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    O pagamento não foi concluído e este pedido pode ter sido cancelado. Caso
                    queira comprar novamente, volte para a loja e refaça o pedido.
                </div>
                )}

                {pagamentoPendente && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
                    Seu pedido foi recebido e está aguardando pagamento. Finalize o pagamento
                    para confirmarmos a compra.
                </div>
                )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:min-w-[280px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {pagamentoConfirmado
                ? "Total pago"
                : pagamentoNaoConcluido
                ? "Pedido não pago"
                : "Total a pagar"}
            </p>

              <p className="mt-2 text-3xl font-light text-slate-950">
                {moeda(pedido.total)}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Pedido feito em {dataCompleta(pedido.criadoEm)}
              </p>

                {pagamentoPendente ? (
                <div className="mt-5">
                    <PagarPedidoStripeButton codigo={pedido.codigo} />
                </div>
                ) : (
                <Link
                    href="/loja"
                    className="mt-5 inline-flex h-11 w-full items-center justify-center brand-button px-4 text-sm font-medium"
                >
                    Comprar novamente
                </Link>
                )}

                {pagamentoPendente && (
                <Link
                    href="/loja"
                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                    Continuar comprando
                </Link>
                )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />

                <h2 className="text-lg font-medium text-slate-950">
                  Itens do pedido
                </h2>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                {pedido.itens.map((item) => {
                  const totalAdicionais = item.adicionais.reduce(
                    (total, adicional) => total + adicional.valorVendaTotal,
                    0
                  );

                  return (
                    <article
                      key={item.id}
                      className="grid gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[80px_1fr_auto]"
                    >
                    <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden bg-slate-100">
                      {item.imagemUrl ? (
                        <img
                          src={item.imagemUrl}
                          alt={item.nomeProduto}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-slate-300" />
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-black/5" />
                    </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {item.codigoInterno}
                        </p>

                        <h3 className="mt-1 text-sm font-semibold text-slate-950">
                          {item.nomeProduto}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.quantidade} un.
                        </p>

                        {getTextoOpcaoProduto(item) && (
                          <p className="mt-1 text-xs text-slate-500">
                            Opção:{" "}
                            <span className="font-medium text-slate-700">
                              {getTextoOpcaoProduto(item)}
                            </span>
                          </p>
                        )}

                        {item.adicionais.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {item.adicionais.map((adicional) => (
                              <p
                                key={adicional.id}
                                className="text-xs text-blue-700"
                              >
                                {adicional.nome}:{" "}
                                {moeda(adicional.valorVendaTotal)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {moeda(item.total + totalAdicionais)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Produto: {moeda(item.total)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-slate-500" />

                <h2 className="text-lg font-medium text-slate-950">
                  Entrega
                </h2>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Endereço
                    </p>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {montarEndereco(pedido)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status do envio
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {labelEnvio(pedido.envio?.statusEnvio)}
                  </p>

                  {pedido.envio?.transportadora && (
                    <p className="mt-1 text-xs text-slate-500">
                      Transportadora: {pedido.envio.transportadora}
                    </p>
                  )}

                  {pedido.envio?.codigoRastreio && (
                    <p className="mt-1 text-xs text-slate-500">
                      Rastreio:{" "}
                      <strong className="text-slate-800">
                        {pedido.envio.codigoRastreio}
                      </strong>
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-slate-500" />

                <h2 className="text-lg font-medium text-slate-950">
                  Pagamento
                </h2>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-slate-950">
                    {labelPagamento(pedido.statusPagamento)}
                  </span>
                </div>

                {pedido.metodoPagamento && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Método</span>
                    <span className="font-semibold text-slate-950">
                      {pedido.metodoPagamento}
                    </span>
                  </div>
                )}

                {pedido.valorPago > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Valor pago</span>
                    <span className="font-semibold text-slate-950">
                      {moeda(pedido.valorPago)}
                    </span>
                  </div>
                )}

                {pedido.pagoEm && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Pago em</span>
                    <span className="font-semibold text-slate-950">
                      {dataCompleta(pedido.pagoEm)}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-medium text-slate-950">
                Resumo
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Itens</span>
                  <span className="font-semibold text-slate-950">
                    {moeda(subtotalItens)}
                  </span>
                </div>

                {possuiCupom && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">
                      Cupom {pedido.cupomCodigo}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      -{moeda(pedido.cupomDescontoValor)}
                    </span>
                  </div>
                )}

                {possuiCashbackUsado && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Cashback usado</span>
                    <span className="font-semibold text-blue-700">
                      -{moeda(pedido.cashbackUsadoValor)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Frete</span>
                  <span className="font-semibold text-slate-950">
                    {pedido.frete > 0 ? moeda(pedido.frete) : "A combinar"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="text-base font-medium text-slate-950">
                    Total
                  </span>
                  <span className="text-base font-bold text-slate-950">
                    {moeda(pedido.total)}
                  </span>
                </div>
              </div>
            </section>

            {(possuiCashbackPrevisto || possuiCashbackCreditado) && (
              <section className="rounded-[2rem] border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[var(--brand-blue)]" />

                  <h2 className="text-lg font-medium text-slate-950">
                    Cashback
                  </h2>
                </div>

                {possuiCashbackCreditado ? (
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    Você recebeu{" "}
                    <strong>{moeda(pedido.cashbackCreditadoValor)}</strong> de
                    cashback neste pedido.
                  </p>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    Você receberá{" "}
                    <strong>{moeda(pedido.cashbackPrevistoValor)}</strong> de
                    cashback após a confirmação do pagamento.
                  </p>
                )}
              </section>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}