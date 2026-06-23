import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { atualizarCliente } from "../actions";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataCompleta(data: Date | string | null | undefined) {
  if (!data) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function labelMovimentacaoCashback(tipo: string) {
  if (tipo === "CREDITO") return "Crédito";
  if (tipo === "ESTORNO") return "Estorno";
  if (tipo === "USO") return "Uso";

  return tipo.replaceAll("_", " ");
}

function movimentacaoCashbackClass(tipo: string) {
  if (tipo === "CREDITO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tipo === "ESTORNO" || tipo === "USO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await exigirAdminComPermissao("clientes", "ver");

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      cashbackMovimentacoes: {
        orderBy: {
          criadoEm: "desc",
        },
        take: 30,
      },
      pedidosOnline: {
        orderBy: {
          criadoEm: "desc",
        },
        select: {
          id: true,
          codigo: true,
          status: true,
          statusPagamento: true,
          total: true,
          valorPago: true,
          cashbackBaseValor: true,
          cashbackPrevistoValor: true,
          cashbackCreditadoValor: true,
          cashbackStatus: true,
          cupomCodigo: true,
          cupomDescontoValor: true,
          criadoEm: true,
        },
      },
      vendas: {
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
        },
        select: {
          id: true,
          codigo: true,
          valorTotal: true,
          status: true,
          criadoEm: true,
        },
        orderBy: {
          criadoEm: "desc",
        },
        take: 10,
      },
    },
  });

  if (!cliente) {
    notFound();
  }

  const actionAtualizar = atualizarCliente.bind(null, cliente.id);

  const cashbackSaldo = Number(cliente.cashbackSaldo || 0);

  const totalCashbackCreditado = cliente.cashbackMovimentacoes.reduce(
    (total, movimentacao) =>
      movimentacao.valor > 0 ? total + Number(movimentacao.valor || 0) : total,
    0
  );

  const totalCashbackEstornadoOuUsado = cliente.cashbackMovimentacoes.reduce(
    (total, movimentacao) =>
      movimentacao.valor < 0 ? total + Math.abs(Number(movimentacao.valor)) : total,
    0
  );

  const totalPedidosOnline = cliente.pedidosOnline.length;

  const totalPedidosPagos = cliente.pedidosOnline.filter(
    (pedido) => pedido.statusPagamento === "PAGO"
  ).length;

  const valorTotalOnline = cliente.pedidosOnline.reduce(
    (total, pedido) => total + Number(pedido.total || 0),
    0
  );

  const cashbackPendente = cliente.pedidosOnline.reduce((total, pedido) => {
    if (pedido.cashbackStatus !== "PENDENTE") {
      return total;
    }

    return total + Number(pedido.cashbackPrevistoValor || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Clientes
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Editar Cliente
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Atualize os dados cadastrais, consulte pedidos e acompanhe o
              saldo de cashback.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/clientes/${cliente.id}/ficha`}
              className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              Ver ficha 360
            </Link>

            <Link
              href="/clientes"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Voltar para lista
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Cashback disponível
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-950">
            {moeda(cashbackSaldo)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Cashback creditado
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {moeda(totalCashbackCreditado)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Cashback pendente
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {moeda(cashbackPendente)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Pedidos online
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {totalPedidosOnline}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {totalPedidosPagos} pago{totalPedidosPagos === 1 ? "" : "s"} ·{" "}
            {moeda(valorTotalOnline)}
          </p>
        </div>
      </div>

      <form
        action={actionAtualizar}
        className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"
      >
        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Informações principais
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Código do cliente">
                <input
                  value={cliente.codigo}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              <Field label="Tipo de cliente">
                <select
                  name="tipoCliente"
                  defaultValue={cliente.tipoCliente}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option>ONLINE</option>
                  <option>PESSOA FÍSICA</option>
                  <option>REVENDEDORA</option>
                  <option>LOJA FISICA</option>
                </select>
              </Field>

              <Field label="Nome" className="md:col-span-2">
                <input
                  name="nome"
                  defaultValue={cliente.nome}
                  placeholder="Nome do cliente"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Telefone">
                <input
                  name="telefone"
                  defaultValue={cliente.telefone}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Email">
                <input
                  name="email"
                  defaultValue={cliente.email || ""}
                  placeholder="email@cliente.com"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Documento" className="md:col-span-2">
                <input
                  name="documento"
                  defaultValue={cliente.documento}
                  placeholder="CPF / Documento"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Endereço</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="CEP">
                <input
                  name="cep"
                  defaultValue={cliente.cep || ""}
                  placeholder="00000-000"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Número">
                <input
                  name="numero"
                  defaultValue={cliente.numero || ""}
                  placeholder="123"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Rua" className="md:col-span-2">
                <input
                  name="rua"
                  defaultValue={cliente.rua || ""}
                  placeholder="Rua / Avenida"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Observações
            </h2>

            <div className="mt-5">
              <textarea
                name="observacoes"
                defaultValue={cliente.observacoes || ""}
                rows={4}
                placeholder="Observações internas sobre este cliente"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Histórico de cashback
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Movimentações de crédito, uso ou estorno vinculadas ao cliente.
            </p>

            {cliente.cashbackMovimentacoes.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhuma movimentação de cashback registrada.
              </div>
            ) : (
              <div className="mt-5 divide-y divide-slate-100 rounded-3xl border border-slate-200">
                {cliente.cashbackMovimentacoes.map((movimentacao) => (
                  <div
                    key={movimentacao.id}
                    className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${movimentacaoCashbackClass(
                            movimentacao.tipo
                          )}`}
                        >
                          {labelMovimentacaoCashback(movimentacao.tipo)}
                        </span>

                        <span className="text-xs text-slate-400">
                          {dataCompleta(movimentacao.criadoEm)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {movimentacao.observacao || "Movimentação de cashback"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Origem: {movimentacao.origemTipo} ·{" "}
                        {movimentacao.origemId}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p
                        className={`text-base font-semibold ${
                          movimentacao.valor >= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {movimentacao.valor >= 0 ? "+" : ""}
                        {moeda(Number(movimentacao.valor || 0))}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {movimentacao.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Pedidos online
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pedidos vinculados a este cliente na loja online.
            </p>

            {cliente.pedidosOnline.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum pedido online vinculado.
              </div>
            ) : (
              <div className="mt-5 divide-y divide-slate-100 rounded-3xl border border-slate-200">
                {cliente.pedidosOnline.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <Link
                        href={`/pedidos/${pedido.id}`}
                        className="text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
                      >
                        {pedido.codigo}
                      </Link>

                      <p className="mt-1 text-xs text-slate-500">
                        {labelStatusPedido(pedido.status)} ·{" "}
                        {labelStatusPagamento(pedido.statusPagamento)} ·{" "}
                        {dataCompleta(pedido.criadoEm)}
                      </p>

                      {pedido.cupomCodigo && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Cupom {pedido.cupomCodigo}: -
                          {moeda(Number(pedido.cupomDescontoValor || 0))}
                        </p>
                      )}

                      {pedido.cashbackPrevistoValor > 0 && (
                        <p className="mt-1 text-xs text-blue-700">
                          Cashback previsto:{" "}
                          {moeda(Number(pedido.cashbackPrevistoValor || 0))} ·{" "}
                          {pedido.cashbackStatus}
                        </p>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-base font-semibold text-slate-900">
                        {moeda(Number(pedido.total || 0))}
                      </p>

                      {pedido.valorPago > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Pago: {moeda(Number(pedido.valorPago || 0))}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/clientes"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Salvar alterações
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Resumo</h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                  Cashback disponível
                </p>

                <p className="mt-2 text-xl font-semibold text-blue-950">
                  {moeda(cashbackSaldo)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Código
                </p>

                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {cliente.codigo}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Documento atual
                </p>

                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {cliente.documento}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cashback creditado
                </p>

                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {moeda(totalCashbackCreditado)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cashback usado/estornado
                </p>

                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {moeda(totalCashbackEstornadoOuUsado)}
                </p>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
