import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import PedidoPublicoClient, {
  type PedidoPublicoData,
} from "@/components/loja/PedidoPublicoClient";
import AtualizarPedidoPagamentoClient from "@/components/loja/AtualizarPedidoPagamentoClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { PEDIDO_ACESSO_COOKIE } from "@/lib/loja/pedido-acesso";
import { buscarPedidoPublicoAutorizado } from "@/lib/loja/pedido-acesso.server";
import { criarMetadataLoja } from "@/lib/loja/seo";
import { obterClienteAutenticadoId } from "@/lib/loja/cliente-sessao.server";

export const dynamic = "force-dynamic";

type PedidoSearchParams = {
  access?: string | string[];
  pagamento?: string | string[];
};

const buscarAcessoPedidoAutorizado = cache(
  async (
    codigo: string,
    clienteAutenticadoId: string | null,
    access: string,
    tokenCookie: string,
  ) => {
    return buscarPedidoPublicoAutorizado({
      codigo,
      clienteAutenticadoId,
      access,
      tokenCookie,
    });
  },
);

function primeiroValorQuery(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] || "" : valor || "";
}

async function obterProvasAcesso(searchParams: PedidoSearchParams) {
  const cookieStore = await cookies();

  return {
    access: primeiroValorQuery(searchParams.access),
    clienteAutenticadoId: await obterClienteAutenticadoId(),
    tokenCookie: cookieStore.get(PEDIDO_ACESSO_COOKIE)?.value || "",
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<PedidoSearchParams>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const query = await searchParams;
  const provas = await obterProvasAcesso(query);
  const acesso = await buscarAcessoPedidoAutorizado(
    codigo,
    provas.clienteAutenticadoId,
    provas.access,
    provas.tokenCookie,
  );

  if (!acesso) {
    notFound();
  }

  return criarMetadataLoja({
    title: "Pedido | Stella Colari",
    path: "/loja/pedido",
    robots: {
      index: false,
      follow: false,
    },
  });
}

function destinoEntrega(cidade: string | null, estado: string | null) {
  if (cidade && estado) return `${cidade}/${estado}`;
  return cidade || estado || null;
}

export default async function PedidoPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<PedidoSearchParams>;
}) {
  const { codigo } = await params;
  const query = await searchParams;
  const pagamento = primeiroValorQuery(query.pagamento);
  const provas = await obterProvasAcesso(query);
  const acessoPedido = await buscarAcessoPedidoAutorizado(
    codigo,
    provas.clienteAutenticadoId,
    provas.access,
    provas.tokenCookie,
  );

  if (!acessoPedido) {
    notFound();
  }

  const pedidoRaw = await prisma.pedidoOnline.findUnique({
    where: { id: acessoPedido.id },
    select: {
      codigo: true,
      cidade: true,
      estado: true,
      subtotal: true,
      frete: true,
      total: true,
      cupomDescontoValor: true,
      cashbackUsadoValor: true,
      status: true,
      statusPagamento: true,
      metodoPagamento: true,
      pagoEm: true,
      valorPago: true,
      criadoEm: true,
      envio: {
        select: {
          statusEnvio: true,
          transportadora: true,
          servico: true,
          codigoRastreio: true,
          prazoDias: true,
          postadoEm: true,
          entregueEm: true,
        },
      },
      itens: {
        orderBy: { criadoEm: "asc" },
        select: {
          nomeProduto: true,
          imagemUrl: true,
          tamanhoAnel: true,
          quantidade: true,
          precoUnitario: true,
          total: true,
          adicionais: {
            orderBy: { criadoEm: "asc" },
            select: {
              nome: true,
              quantidade: true,
              valorVendaUnitario: true,
              valorVendaTotal: true,
            },
          },
        },
      },
    },
  });

  if (!pedidoRaw) {
    notFound();
  }

  const [menus, categoriasMenu, configuracaoMenuRodape] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),
  ]);

  const pedido: PedidoPublicoData = {
    codigo: pedidoRaw.codigo,
    destinoEntrega: destinoEntrega(pedidoRaw.cidade, pedidoRaw.estado),
    subtotal: Number(pedidoRaw.subtotal || 0),
    frete: Number(pedidoRaw.frete || 0),
    total: Number(pedidoRaw.total || 0),
    descontoValor:
      Number(pedidoRaw.cupomDescontoValor || 0) +
      Number(pedidoRaw.cashbackUsadoValor || 0),
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
      nomeProduto: item.nomeProduto,
      imagemUrl: item.imagemUrl,
      tamanhoAnel: item.tamanhoAnel,
      quantidade: item.quantidade,
      precoUnitario: Number(item.precoUnitario || 0),
      total: Number(item.total || 0),
      adicionais: item.adicionais.map((adicional) => ({
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
        pagamentoRetorno={pagamento || null}
      />

      <PedidoPublicoClient
        menus={menus}
        categoriasMenu={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        pedido={pedido}
      />
    </div>
  );
}
