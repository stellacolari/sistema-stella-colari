import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PedidoAcoesCliente from "@/components/pedidos/PedidoAcoesCliente";
import PedidoPagamentoClient from "@/components/pedidos/PedidoPagamentoClient";
import PedidoDetalheClient, {
  type PedidoDetalhe,
} from "@/components/pedidos/PedidoDetalheClient";
import { mapearEmbalagensPresentePorItem } from "@/lib/pedidos/embalagens-presente";

export const metadata: Metadata = {
  title: "Detalhe do pedido | Sistema Stella",
};

export const dynamic = "force-dynamic";

export default async function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pedidoRaw = await prisma.pedidoOnline.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      status: true,
      origemCanal: true,
      codigoPedidoExterno: true,
      statusExterno: true,
      substatusExterno: true,
      clienteId: true,
      nomeCliente: true,
      telefoneCliente: true,
      emailCliente: true,
      documento: true,
      cep: true,
      rua: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      subtotal: true,
      frete: true,
      total: true,
      cupomCodigo: true,
      cupomDescontoValor: true,
      cashbackBaseValor: true,
      cashbackPrevistoValor: true,
      cashbackCreditadoValor: true,
      cashbackUsadoValor: true,
      cashbackStatus: true,
      observacoes: true,
      criadoEm: true,
      atualizadoEm: true,
      statusPagamento: true,
      metodoPagamento: true,
      gatewayPagamento: true,
      gatewayPedidoId: true,
      gatewayPagamentoId: true,
      pagoEm: true,
      valorPago: true,
      pagamentoObservacao: true,
      dadosOriginaisJson: true,
      cliente: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          telefone: true,
          email: true,
          documento: true,
        },
      },
      itens: {
        orderBy: {
          criadoEm: "asc",
        },
        include: {
          adicionais: {
            orderBy: {
              criadoEm: "asc",
            },
            include: {
              opcaoAdicional: {
                select: {
                  id: true,
                  nome: true,
                },
              },
              itemPadraoSubstituido: {
                select: {
                  id: true,
                  codigoInterno: true,
                  nome: true,
                },
              },
              itemAdicionalConsumido: {
                select: {
                  id: true,
                  codigoInterno: true,
                  nome: true,
                },
              },
            },
          },
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
        },
      },
      envio: true,
      statusHistorico: {
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
  });

  if (!pedidoRaw) {
    notFound();
  }

  const embalagensPresentePorItem = mapearEmbalagensPresentePorItem(
    pedidoRaw.dadosOriginaisJson,
    pedidoRaw.itens.flatMap((item) =>
      item.embalagemPresente ? [item.embalagemPresente] : [],
    ),
  );

  const pedido: PedidoDetalhe = {
    id: pedidoRaw.id,
    codigo: pedidoRaw.codigo,
    status: pedidoRaw.status,
    origemCanal: pedidoRaw.origemCanal || "LOJA_STELLA",
    codigoPedidoExterno: pedidoRaw.codigoPedidoExterno,
    statusExterno: pedidoRaw.statusExterno,
    substatusExterno: pedidoRaw.substatusExterno,

    clienteId: pedidoRaw.clienteId,
    clienteCodigo: pedidoRaw.cliente?.codigo ?? null,
    clienteNome: pedidoRaw.cliente?.nome ?? null,

    nomeCliente: pedidoRaw.nomeCliente,
    telefoneCliente: pedidoRaw.telefoneCliente,
    emailCliente: pedidoRaw.emailCliente,
    documento: pedidoRaw.documento,

    cep: pedidoRaw.cep,
    rua: pedidoRaw.rua,
    numero: pedidoRaw.numero,
    complemento: pedidoRaw.complemento,
    bairro: pedidoRaw.bairro,
    cidade: pedidoRaw.cidade,
    estado: pedidoRaw.estado,

    subtotal: Number(pedidoRaw.subtotal || 0),
    frete: Number(pedidoRaw.frete || 0),
    total: Number(pedidoRaw.total || 0),

    cupomCodigo: pedidoRaw.cupomCodigo,
    cupomDescontoValor: Number(pedidoRaw.cupomDescontoValor || 0),

    cashbackBaseValor: Number(pedidoRaw.cashbackBaseValor || 0),
    cashbackPrevistoValor: Number(pedidoRaw.cashbackPrevistoValor || 0),
    cashbackCreditadoValor: Number(pedidoRaw.cashbackCreditadoValor || 0),
    cashbackUsadoValor: Number(pedidoRaw.cashbackUsadoValor || 0),
    cashbackStatus: pedidoRaw.cashbackStatus,

    observacoes: pedidoRaw.observacoes,
    criadoEm: pedidoRaw.criadoEm.toISOString(),
    atualizadoEm: pedidoRaw.atualizadoEm.toISOString(),

    itens: pedidoRaw.itens.map((item) => ({
      id: item.id,
      produtoId: item.produtoId,
      codigoInterno: item.codigoInterno,
      nomeProduto: item.nomeProduto,
      imagemUrl: item.imagemUrl,
      categoria: item.categoria,
      tamanhoAnel: item.tamanhoAnel,
      quantidade: item.quantidade,
      precoUnitario: Number(item.precoUnitario || 0),
      precoOriginal:
        item.precoOriginal !== null && item.precoOriginal !== undefined
          ? Number(item.precoOriginal)
          : null,
      descontoPercentual:
        item.descontoPercentual !== null &&
        item.descontoPercentual !== undefined
          ? Number(item.descontoPercentual)
          : null,
      geraCashback: item.geraCashback,
      cashbackBaseValor: Number(item.cashbackBaseValor || 0),
      total: Number(item.total || 0),
      embalagemPresente: embalagensPresentePorItem.get(item.id) || null,
      adicionais: item.adicionais.map((adicional) => ({
        id: adicional.id,
        opcaoAdicionalId: adicional.opcaoAdicionalId,
        opcaoAdicionalNome: adicional.opcaoAdicional?.nome ?? null,
        nome: adicional.nome,

        itemPadraoSubstituidoId: adicional.itemPadraoSubstituidoId,
        itemPadraoSubstituidoCodigo:
          adicional.itemPadraoSubstituido?.codigoInterno ?? null,
        itemPadraoSubstituidoNome:
          adicional.itemPadraoSubstituido?.nome ?? null,

        itemAdicionalConsumidoId: adicional.itemAdicionalConsumidoId,
        itemAdicionalConsumidoCodigo:
          adicional.itemAdicionalConsumido?.codigoInterno ?? null,
        itemAdicionalConsumidoNome:
          adicional.itemAdicionalConsumido?.nome ?? null,

        quantidade: adicional.quantidade,
        custoUnitario: Number(adicional.custoUnitario || 0),
        valorVendaUnitario: Number(adicional.valorVendaUnitario || 0),
        custoTotal: Number(adicional.custoTotal || 0),
        valorVendaTotal: Number(adicional.valorVendaTotal || 0),
        lucroTotal: Number(adicional.lucroTotal || 0),
      })),
    })),

    envio: pedidoRaw.envio
      ? {
          id: pedidoRaw.envio.id,
          tipoEntrega: pedidoRaw.envio.tipoEntrega,
          transportadora: pedidoRaw.envio.transportadora,
          servico: pedidoRaw.envio.servico,
          statusEnvio: pedidoRaw.envio.statusEnvio,
          cepOrigem: pedidoRaw.envio.cepOrigem,
          cepDestino: pedidoRaw.envio.cepDestino,
          pesoGramas:
            pedidoRaw.envio.pesoGramas !== null &&
            pedidoRaw.envio.pesoGramas !== undefined
              ? Number(pedidoRaw.envio.pesoGramas)
              : null,
          alturaCm:
            pedidoRaw.envio.alturaCm !== null &&
            pedidoRaw.envio.alturaCm !== undefined
              ? Number(pedidoRaw.envio.alturaCm)
              : null,
          larguraCm:
            pedidoRaw.envio.larguraCm !== null &&
            pedidoRaw.envio.larguraCm !== undefined
              ? Number(pedidoRaw.envio.larguraCm)
              : null,
          comprimentoCm:
            pedidoRaw.envio.comprimentoCm !== null &&
            pedidoRaw.envio.comprimentoCm !== undefined
              ? Number(pedidoRaw.envio.comprimentoCm)
              : null,
          valorFrete: Number(pedidoRaw.envio.valorFrete || 0),
          prazoDias: pedidoRaw.envio.prazoDias,
          codigoRastreio: pedidoRaw.envio.codigoRastreio,
          etiquetaUrl: pedidoRaw.envio.etiquetaUrl,
          etiquetaPdfUrl: pedidoRaw.envio.etiquetaPdfUrl,
          declaracaoConteudoUrl: pedidoRaw.envio.declaracaoConteudoUrl,
          gatewayLogistico: pedidoRaw.envio.gatewayLogistico,
          gatewayEnvioId: pedidoRaw.envio.gatewayEnvioId,
          postadoEm: pedidoRaw.envio.postadoEm
            ? pedidoRaw.envio.postadoEm.toISOString()
            : null,
          entregueEm: pedidoRaw.envio.entregueEm
            ? pedidoRaw.envio.entregueEm.toISOString()
            : null,
          observacoes: pedidoRaw.envio.observacoes,
        }
      : null,

    historico: pedidoRaw.statusHistorico.map((historico) => ({
      id: historico.id,
      statusAnterior: historico.statusAnterior,
      statusNovo: historico.statusNovo,
      tipoEvento: historico.tipoEvento,
      origem: historico.origem,
      usuarioNome: historico.usuarioNome,
      observacao: historico.observacao,
      criadoEm: historico.criadoEm.toISOString(),
    })),
  };

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Pedidos
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {pedido.codigo}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe o pedido, pagamento, status operacional e dados de
              envio/rastreio.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/pedidos"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar para pedidos
            </Link>
          </div>
        </div>
      </section>

      <PedidoAcoesCliente
        codigo={pedido.codigo}
        nomeCliente={pedido.nomeCliente}
        telefoneCliente={pedido.telefoneCliente}
        total={pedido.total}
        status={pedido.status}
        codigoRastreio={pedido.envio?.codigoRastreio}
        endereco={{
          cep: pedido.cep,
          rua: pedido.rua,
          numero: pedido.numero,
          complemento: pedido.complemento,
          bairro: pedido.bairro,
          cidade: pedido.cidade,
          estado: pedido.estado,
        }}
      />

      <PedidoPagamentoClient
        pagamento={{
          id: pedidoRaw.id,
          total: Number(pedidoRaw.total || 0),
          statusPagamento: pedidoRaw.statusPagamento || "AGUARDANDO_PAGAMENTO",
          metodoPagamento: pedidoRaw.metodoPagamento,
          gatewayPagamento: pedidoRaw.gatewayPagamento,
          gatewayPedidoId: pedidoRaw.gatewayPedidoId,
          gatewayPagamentoId: pedidoRaw.gatewayPagamentoId,
          pagoEm: pedidoRaw.pagoEm ? pedidoRaw.pagoEm.toISOString() : null,
          valorPago: Number(pedidoRaw.valorPago || 0),
          pagamentoObservacao: pedidoRaw.pagamentoObservacao,
        }}
      />

      <PedidoDetalheClient pedido={pedido} />
    </main>
  );
}
