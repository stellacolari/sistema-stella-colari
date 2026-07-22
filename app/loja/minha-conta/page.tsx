import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { obterResumoWhatsappPublicoCliente } from "@/lib/clientes/consentimentos-cliente";
import MinhaContaClient, {
  type MinhaContaClienteData,
} from "@/components/loja/MinhaContaClient";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Minha conta | Stella Colari",
  path: "/loja/minha-conta",
  robots: {
    index: false,
    follow: false,
  },
});

export const dynamic = "force-dynamic";

const COOKIE_CLIENTE_ID = "stella_cliente_id";

export default async function MinhaContaPage() {
  const cookieStore = await cookies();
  const clienteId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";

  if (!clienteId) {
    redirect("/loja/entrar");
  }

  const [menus, categoriasMenu, configuracaoMenuRodape, clienteRaw] =
    await Promise.all([
      buscarMenusPublicos(),
      buscarCategoriasMenuPublico(),
      buscarConfiguracaoMenuRodape(),
      prisma.cliente.findUnique({
      where: {
        id: clienteId,
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        telefone: true,
        email: true,
        documento: true,
        cep: true,
        rua: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        tipoCliente: true,
        status: true,
        cashbackSaldo: true,
        criadoEm: true,
        pedidosOnline: {
          orderBy: {
            criadoEm: "desc",
          },
          take: 20,
          select: {
            id: true,
            codigo: true,
            status: true,
            statusPagamento: true,
            total: true,
            valorPago: true,
            cupomCodigo: true,
            cupomDescontoValor: true,
            cashbackBaseValor: true,
            cashbackPrevistoValor: true,
            cashbackCreditadoValor: true,
            cashbackUsadoValor: true,
            cashbackStatus: true,
            criadoEm: true,
            envio: {
              select: {
                statusEnvio: true,
                codigoRastreio: true,
                transportadora: true,
                postadoEm: true,
                entregueEm: true,
              },
            },
            itens: {
              select: {
                quantidade: true,
              },
            },
          },
        },
        cashbackMovimentacoes: {
          orderBy: {
            criadoEm: "desc",
          },
          take: 30,
          select: {
            id: true,
            tipo: true,
            status: true,
            origemTipo: true,
            origemId: true,
            valor: true,
            observacao: true,
            criadoEm: true,
          },
        },
      },
      }),
    ]);

  if (!clienteRaw || clienteRaw.status === "NA_LIXEIRA") {
    redirect("/loja/entrar");
  }

  const consentimentoWhatsapp = await obterResumoWhatsappPublicoCliente(
    clienteRaw.id
  );

  const cliente: MinhaContaClienteData = {
    id: clienteRaw.id,
    codigo: clienteRaw.codigo,
    nome: clienteRaw.nome || "Cliente",
    telefone: clienteRaw.telefone || "",
    email: clienteRaw.email,
    documento: clienteRaw.documento || "",
    cep: clienteRaw.cep,
    rua: clienteRaw.rua,
    numero: clienteRaw.numero,
    complemento: clienteRaw.complemento,
    bairro: clienteRaw.bairro,
    cidade: clienteRaw.cidade,
    estado: clienteRaw.estado,
    tipoCliente: clienteRaw.tipoCliente,
    cashbackSaldo: Number(clienteRaw.cashbackSaldo || 0),
    criadoEm: clienteRaw.criadoEm.toISOString(),
    consentimentoWhatsapp,
    pedidos: clienteRaw.pedidosOnline.map((pedido) => ({
      id: pedido.id,
      codigo: pedido.codigo,
      status: pedido.status,
      statusPagamento: pedido.statusPagamento,
      total: Number(pedido.total || 0),
      valorPago: Number(pedido.valorPago || 0),
      cupomCodigo: pedido.cupomCodigo,
      cupomDescontoValor: Number(pedido.cupomDescontoValor || 0),
      cashbackBaseValor: Number(pedido.cashbackBaseValor || 0),
      cashbackPrevistoValor: Number(pedido.cashbackPrevistoValor || 0),
      cashbackCreditadoValor: Number(pedido.cashbackCreditadoValor || 0),
      cashbackUsadoValor: Number(pedido.cashbackUsadoValor || 0),
      cashbackStatus: pedido.cashbackStatus,
      criadoEm: pedido.criadoEm.toISOString(),
      quantidadeItens: pedido.itens.reduce(
        (total, item) => total + item.quantidade,
        0
      ),
      envio: pedido.envio
        ? {
            statusEnvio: pedido.envio.statusEnvio,
            codigoRastreio: pedido.envio.codigoRastreio,
            transportadora: pedido.envio.transportadora,
            postadoEm: pedido.envio.postadoEm
              ? pedido.envio.postadoEm.toISOString()
              : null,
            entregueEm: pedido.envio.entregueEm
              ? pedido.envio.entregueEm.toISOString()
              : null,
          }
        : null,
    })),
    cashbackMovimentacoes: clienteRaw.cashbackMovimentacoes.map(
      (movimentacao) => ({
        id: movimentacao.id,
        tipo: movimentacao.tipo,
        status: movimentacao.status,
        origemTipo: movimentacao.origemTipo,
        origemId: movimentacao.origemId,
        valor: Number(movimentacao.valor || 0),
        observacao: movimentacao.observacao,
        criadoEm: movimentacao.criadoEm.toISOString(),
      })
    ),
  };

  return (
    <MinhaContaClient
      menus={menus}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
      cliente={cliente}
    />
  );
}
