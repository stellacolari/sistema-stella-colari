import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PedidosClient, {
  type PedidoOperacionalItem,
} from "@/components/pedidos/PedidosClient";
import { mapearEmbalagensPresentePorItem } from "@/lib/pedidos/embalagens-presente";
import { extrairAlertasOperacionais } from "@/lib/pedidos/alertas-operacionais";
import { extrairEntregaManualPedido } from "@/lib/pedidos/entrega-manual";
import {
  exigirAdminComPermissao,
  usuarioPodeAlterarStatusPedidoAdmin,
  usuarioPodeExecutarAcaoSensivelPedidoAdmin,
  usuarioPodeGerenciarPagamentoPedidoAdmin,
} from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Pedidos | Sistema Stella",
};

export const dynamic = "force-dynamic";

async function buscarUrlCheckoutStripe(sessionId: string | null) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  try {
    const { stripe } = await import("@/lib/stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return session.url || null;
  } catch (error) {
    console.error("Erro ao buscar link Stripe do pedido manual:", error);
    return null;
  }
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}
export default async function PedidosPage() {
  const usuario = await exigirAdminComPermissao("pedidos", "ver");
  const podeAlterarStatus = usuarioPodeAlterarStatusPedidoAdmin(usuario);
  const podeExecutarAcaoSensivel =
    usuarioPodeExecutarAcaoSensivelPedidoAdmin(usuario);
  const podeGerenciarPagamento =
    usuarioPodeGerenciarPagamentoPedidoAdmin(usuario);

  const pedidosRaw = await prisma.pedidoOnline.findMany({
    orderBy: {
      criadoEm: "desc",
    },
    select: {
      id: true,
      codigo: true,
      origemCanal: true,
      codigoPedidoExterno: true,
      statusExterno: true,
      substatusExterno: true,
      clienteId: true,
      nomeCliente: true,
      telefoneCliente: true,
      emailCliente: true,
      documento: true,
      cidade: true,
      estado: true,
      cep: true,
      subtotal: true,
      frete: true,
      total: true,
      statusPagamento: true,
      metodoPagamento: true,
      gatewayPagamento: true,
      gatewayPedidoId: true,
      pagoEm: true,
      valorPago: true,
      cashbackStatus: true,
      cashbackPrevistoValor: true,
      cashbackCreditadoValor: true,
      cashbackUsadoValor: true,
      cupomCodigo: true,
      cupomDescontoValor: true,
      status: true,
      observacoes: true,
      criadoEm: true,
      atualizadoEm: true,
      dadosOriginaisJson: true,
      cliente: {
        select: {
          id: true,
          codigo: true,
          nome: true,
        },
      },
      envio: true,
      itens: {
        orderBy: {
          criadoEm: "asc",
        },
        select: {
          id: true,
          codigoInterno: true,
          nomeProduto: true,
          categoria: true,
          imagemUrl: true,
          tamanhoAnel: true,
          quantidade: true,
          precoUnitario: true,
          total: true,
          embalagemPresente: {
            select: {
              pedidoOnlineItemId: true,
              nomeSnapshot: true,
              imagemUrlSnapshot: true,
              descricaoSnapshot: true,
              precoUnitario: true,
              valorTotal: true,
              mensagem: true,
            },
          },
          adicionais: {
            orderBy: {
              criadoEm: "asc",
            },
            select: {
              id: true,
              nome: true,
              quantidade: true,
              valorVendaTotal: true,
            },
          },
        },
      },
      statusHistorico: {
        orderBy: {
          criadoEm: "desc",
        },
        take: 1,
        select: {
          id: true,
          statusNovo: true,
          observacao: true,
          criadoEm: true,
        },
      },
    },
  });

  const pedidosManuaisPendentes = pedidosRaw.filter(
    (pedido) =>
      pedido.origemCanal === "ADMIN_MANUAL" &&
      (pedido.statusPagamento === "AGUARDANDO_PAGAMENTO" ||
        pedido.statusPagamento === "PENDENTE") &&
      pedido.gatewayPagamento === "STRIPE",
  );

  const linksPagamento = new Map<string, string | null>(
    await Promise.all(
      pedidosManuaisPendentes.map(
        async (pedido) =>
          [
            pedido.id,
            await buscarUrlCheckoutStripe(pedido.gatewayPedidoId),
          ] as const,
      ),
    ),
  );

  const pedidosManuaisPagos = pedidosRaw.filter(
    (pedido) =>
      pedido.origemCanal === "ADMIN_MANUAL" &&
      pedido.statusPagamento === "PAGO",
  );

  const vendasPedidosManuais =
    pedidosManuaisPagos.length > 0
      ? await prisma.venda.findMany({
          where: {
            OR: pedidosManuaisPagos.map((pedido) => ({
              observacoes: {
                contains: pedido.codigo,
              },
            })),
          },
          select: {
            id: true,
            codigo: true,
            observacoes: true,
          },
        })
      : [];

  const vendasPorPedido = new Map<
    string,
    { id: string; codigo: string } | null
  >();

  pedidosManuaisPagos.forEach((pedido) => {
    const venda = vendasPedidosManuais.find((item) =>
      String(item.observacoes || "").includes(pedido.codigo),
    );

    vendasPorPedido.set(
      pedido.id,
      venda
        ? {
            id: venda.id,
            codigo: venda.codigo,
          }
        : null,
    );
  });

  const pedidos: PedidoOperacionalItem[] = pedidosRaw.map((pedido) => {
    const embalagensPresentePorItem = mapearEmbalagensPresentePorItem(
      pedido.dadosOriginaisJson,
      pedido.itens.flatMap((item) =>
        item.embalagemPresente ? [item.embalagemPresente] : [],
      ),
    );
    const alertasOperacionais = extrairAlertasOperacionais(
      pedido.dadosOriginaisJson,
    );
    const entregaManual = extrairEntregaManualPedido(
      pedido.dadosOriginaisJson,
      pedido.envio?.observacoes,
    );

    const quantidadeItens = pedido.itens.reduce(
      (total, item) => total + item.quantidade,
      0,
    );

    return {
      id: pedido.id,
      codigo: pedido.codigo,

      origemCanal: pedido.origemCanal || "LOJA_STELLA",
      codigoPedidoExterno: pedido.codigoPedidoExterno,
      statusExterno: pedido.statusExterno,
      substatusExterno: pedido.substatusExterno,

      clienteId: pedido.clienteId,
      clienteCodigo: pedido.cliente?.codigo ?? null,
      clienteNome: pedido.cliente?.nome ?? null,

      nomeCliente: pedido.nomeCliente,
      telefoneCliente: pedido.telefoneCliente,
      emailCliente: pedido.emailCliente,
      documento: pedido.documento,

      cidade: pedido.cidade,
      estado: pedido.estado,
      cep: pedido.cep,

      subtotal: Number(pedido.subtotal || 0),
      frete: Number(pedido.frete || 0),
      total: Number(pedido.total || 0),

      statusPagamento: pedido.statusPagamento || "AGUARDANDO_PAGAMENTO",
      metodoPagamento: pedido.metodoPagamento,
      gatewayPagamento: pedido.gatewayPagamento,
      gatewayPedidoId: pedido.gatewayPedidoId,
      linkPagamento: linksPagamento.get(pedido.id) || null,
      pagoEm: pedido.pagoEm ? pedido.pagoEm.toISOString() : null,
      valorPago: Number(pedido.valorPago || 0),
      vendaGerada: vendasPorPedido.get(pedido.id) || null,

      cashbackStatus: pedido.cashbackStatus,
      cashbackPrevistoValor: Number(pedido.cashbackPrevistoValor || 0),
      cashbackCreditadoValor: Number(pedido.cashbackCreditadoValor || 0),
      cashbackUsadoValor: Number(pedido.cashbackUsadoValor || 0),

      cupomCodigo: pedido.cupomCodigo,
      cupomDescontoValor: Number(pedido.cupomDescontoValor || 0),

      status: pedido.status,
      observacoes: pedido.observacoes,
      criadoEm: pedido.criadoEm.toISOString(),
      atualizadoEm: pedido.atualizadoEm.toISOString(),
      alertasOperacionais,
      entregaManual,

      quantidadeItens,
      totalItensUnicos: pedido.itens.length,

      itens: pedido.itens.map((item) => ({
        id: item.id,
        codigoInterno: item.codigoInterno,
        nomeProduto: item.nomeProduto,
        categoria: item.categoria,
        imagemUrl: item.imagemUrl,
        tamanhoAnel: item.tamanhoAnel,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario || 0),
        total: Number(item.total || 0),
        embalagemPresente: embalagensPresentePorItem.get(item.id) || null,
        adicionais: item.adicionais.map((adicional) => ({
          id: adicional.id,
          nome: adicional.nome,
          quantidade: adicional.quantidade,
          valorVendaTotal: Number(adicional.valorVendaTotal || 0),
        })),
      })),

      envio: pedido.envio
        ? {
            id: pedido.envio.id,
            tipoEntrega: pedido.envio.tipoEntrega,
            transportadora: pedido.envio.transportadora,
            servico: pedido.envio.servico,
            statusEnvio: pedido.envio.statusEnvio,
            codigoRastreio: pedido.envio.codigoRastreio,
            valorFrete: Number(pedido.envio.valorFrete || 0),
            prazoDias: pedido.envio.prazoDias,

            etiquetaUrl: pedido.envio.etiquetaUrl,
            etiquetaPdfUrl: pedido.envio.etiquetaPdfUrl,
            declaracaoConteudoUrl: pedido.envio.declaracaoConteudoUrl,
            gatewayLogistico: pedido.envio.gatewayLogistico,
            gatewayEnvioId: pedido.envio.gatewayEnvioId,

            postadoEm: pedido.envio.postadoEm
              ? pedido.envio.postadoEm.toISOString()
              : null,
            entregueEm: pedido.envio.entregueEm
              ? pedido.envio.entregueEm.toISOString()
              : null,
            atualizadoEm: pedido.envio.atualizadoEm.toISOString(),
          }
        : null,

      ultimoHistorico: pedido.statusHistorico[0]
        ? {
            id: pedido.statusHistorico[0].id,
            statusNovo: pedido.statusHistorico[0].statusNovo,
            observacao: pedido.statusHistorico[0].observacao,
            criadoEm: pedido.statusHistorico[0].criadoEm.toISOString(),
          }
        : null,
    };
  });

  const pedidosNovos = pedidos.filter(
    (pedido) => pedido.status === "PEDIDO_RECEBIDO",
  ).length;

  const pagamentosPendentes = pedidos.filter(
    (pedido) => pedido.statusPagamento === "AGUARDANDO_PAGAMENTO",
  ).length;

  const pedidosPagosParaSeparar = pedidos.filter(
    (pedido) =>
      pedido.statusPagamento === "PAGO" &&
      (pedido.status === "PEDIDO_RECEBIDO" ||
        pedido.status === "EM_SEPARACAO"),
  ).length;

  const pedidosEmEnvio = pedidos.filter(
    (pedido) =>
      pedido.envio?.statusEnvio === "PENDENTE" ||
      pedido.envio?.statusEnvio === "EM_PREPARACAO" ||
      pedido.envio?.statusEnvio === "AGUARDANDO_RETIRADA" ||
      pedido.envio?.statusEnvio === "SAIU_PARA_ENTREGA",
  ).length;

  const pedidosComCupom = pedidos.filter(
    (pedido) => Number(pedido.cupomDescontoValor || 0) > 0,
  ).length;

  const pedidosComCashbackUsado = pedidos.filter(
    (pedido) => Number(pedido.cashbackUsadoValor || 0) > 0,
  ).length;

  const pedidosComProblema = pedidos.filter(
    (pedido) =>
      pedido.status === "PROBLEMA" ||
      pedido.status === "PROBLEMA_OPERACIONAL",
  ).length;

  const pedidosCancelados = pedidos.filter(
    (pedido) => pedido.status === "CANCELADO",
  ).length;

  const valorTotalPedidos = pedidos.reduce(
    (total, pedido) => total + Number(pedido.total || 0),
    0,
  );

  const cashbackPrevistoTotal = pedidos.reduce(
    (total, pedido) => total + Number(pedido.cashbackPrevistoValor || 0),
    0,
  );

  const cashbackUsadoTotal = pedidos.reduce(
    (total, pedido) => total + Number(pedido.cashbackUsadoValor || 0),
    0,
  );

  const descontosCupomTotal = pedidos.reduce(
    (total, pedido) => total + Number(pedido.cupomDescontoValor || 0),
    0,
  );

  return (
    <main className="max-w-full space-y-4 overflow-hidden">
      <section className="hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:block">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Operação
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Pedidos
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe pedidos em andamento, pagamento, envio, rastreio,
              etiquetas e progresso operacional.
            </p>
          </div>
        </div>
      </section>
      <section className="hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:block">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Central operacional
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Indicadores principais para acompanhar o que precisa de ação
              agora.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
            <span className="font-medium text-slate-500">Total listado: </span>
            <strong>{pedidos.length}</strong>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-emerald-700 px-4 py-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
              Prioridade
            </p>

            <p className="mt-2 text-2xl font-bold">
              {pedidosPagosParaSeparar}
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-100">
              Pagos para separar.
            </p>
          </div>

          <div className="rounded-2xl bg-amber-600 px-4 py-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
              Pagamento pendente
            </p>

            <p className="mt-2 text-2xl font-bold">
              {pagamentosPendentes}
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-100">
              Aguardando confirmação.
            </p>
          </div>

          <div className="rounded-2xl bg-blue-700 px-4 py-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
              Novos
            </p>

            <p className="mt-2 text-2xl font-bold">
              {pedidosNovos}
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-100">
              Recebidos no sistema.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-800 px-4 py-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
              Envio/preparação
            </p>

            <p className="mt-2 text-2xl font-bold">
              {pedidosEmEnvio}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-200">
              Pendentes de envio.
            </p>
          </div>
        </div>

        {(pedidosComProblema > 0 || pedidosCancelados > 0) && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Atenção: {pedidosComProblema} pedido
            {pedidosComProblema === 1 ? "" : "s"} com problema e{" "}
            {pedidosCancelados} cancelado
            {pedidosCancelados === 1 ? "" : "s"}.
          </div>
        )}

        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-700 marker:hidden [&::-webkit-details-marker]:hidden">
            Ver indicadores comerciais e benefícios
          </summary>

          <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total em pedidos
              </p>

              <p className="mt-2 text-xl font-bold text-slate-950">
                {moeda(valorTotalPedidos)}
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Cupons
              </p>

              <p className="mt-2 text-xl font-bold text-slate-950">
                {pedidosComCupom}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Descontos: {moeda(descontosCupomTotal)}
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Cashback usado
              </p>

              <p className="mt-2 text-xl font-bold text-slate-950">
                {pedidosComCashbackUsado}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Total: {moeda(cashbackUsadoTotal)}
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Cashback previsto
              </p>

              <p className="mt-2 text-xl font-bold text-slate-950">
                {moeda(cashbackPrevistoTotal)}
              </p>
            </div>
          </div>
        </details>
      </section>
      <PedidosClient
        pedidos={pedidos}
        podeAlterarStatus={podeAlterarStatus}
        podeExecutarAcaoSensivel={podeExecutarAcaoSensivel}
        podeGerenciarPagamento={podeGerenciarPagamento}
      />
    </main>
  );
}
