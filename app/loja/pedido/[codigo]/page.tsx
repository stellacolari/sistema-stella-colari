import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PedidoPublicoClient, {
  type PedidoPublicoData,
} from "@/components/loja/PedidoPublicoClient";
import AtualizarPedidoPagamentoClient from "@/components/loja/AtualizarPedidoPagamentoClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";

export const metadata: Metadata = {
  title: "Pedido | Loja Stella",
};

export const dynamic = "force-dynamic";

export default async function PedidoPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const { codigo } = await params;
  const { pagamento = null } = await searchParams;

  const pedidoRaw = await prisma.pedidoOnline.findUnique({
    where: {
      codigo,
    },
    include: {
      itens: {
        orderBy: {
          criadoEm: "asc",
        },
        include: {
          adicionais: {
            orderBy: {
              criadoEm: "asc",
            },
          },
        },
      },
      envio: true,
    },
  });

  if (!pedidoRaw) {
    notFound();
  }

  const [menus, categoriasMenu] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
  ]);

  const pedido: PedidoPublicoData = {
    id: pedidoRaw.id,
    codigo: pedidoRaw.codigo,

    nomeCliente: pedidoRaw.nomeCliente,
    telefoneCliente: pedidoRaw.telefoneCliente,
    emailCliente: pedidoRaw.emailCliente,

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

    status: pedidoRaw.status,
    statusPagamento: pedidoRaw.statusPagamento,
    metodoPagamento: pedidoRaw.metodoPagamento,
    pagoEm: pedidoRaw.pagoEm ? pedidoRaw.pagoEm.toISOString() : null,
    valorPago: Number(pedidoRaw.valorPago || 0),

    criadoEm: pedidoRaw.criadoEm.toISOString(),

    envio: pedidoRaw.envio
      ? {
          statusEnvio: pedidoRaw.envio.statusEnvio,
          transportadora: pedidoRaw.envio.transportadora,
          servico: pedidoRaw.envio.servico,
          codigoRastreio: pedidoRaw.envio.codigoRastreio,
          valorFrete: Number(pedidoRaw.envio.valorFrete || 0),
          prazoDias: pedidoRaw.envio.prazoDias,
          postadoEm: pedidoRaw.envio.postadoEm
            ? pedidoRaw.envio.postadoEm.toISOString()
            : null,
          entregueEm: pedidoRaw.envio.entregueEm
            ? pedidoRaw.envio.entregueEm.toISOString()
            : null,
        }
      : null,

    itens: pedidoRaw.itens.map((item) => ({
      id: item.id,
      codigoInterno: item.codigoInterno,
      nomeProduto: item.nomeProduto,
      imagemUrl: item.imagemUrl,
      categoria: item.categoria,
      tamanhoAnel: item.tamanhoAnel,
      quantidade: item.quantidade,
      precoUnitario: Number(item.precoUnitario || 0),
      total: Number(item.total || 0),
      adicionais: item.adicionais.map((adicional) => ({
        id: adicional.id,
        nome: adicional.nome,
        quantidade: adicional.quantidade,
        valorVendaUnitario: Number(adicional.valorVendaUnitario || 0),
        valorVendaTotal: Number(adicional.valorVendaTotal || 0),
      })),
    })),
  };

return (
  <div>
    <AtualizarPedidoPagamentoClient
      statusPagamento={pedido.statusPagamento}
      pagamentoRetorno={pagamento}
    />

    <PedidoPublicoClient
      menus={menus}
      categoriasMenu={categoriasMenu}
      pedido={pedido}
    />
  </div>
);
}