import type { Metadata } from "next";
import CheckoutClient, {
  type CheckoutCashbackConfig,
  type CheckoutClienteLogado,
} from "@/components/loja/CheckoutClient";
import { prisma } from "@/lib/prisma";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { criarMetadataLoja } from "@/lib/loja/seo";
import { obterClienteAutenticadoId } from "@/lib/loja/cliente-sessao.server";

export const metadata: Metadata = criarMetadataLoja({
  title: "Checkout | Stella Colari",
  path: "/loja/checkout",
  robots: {
    index: false,
    follow: false,
  },
});

export const dynamic = "force-dynamic";

const CHAVE_CASHBACK_CONFIG = "PADRAO";

const CASHBACK_CONFIG_PADRAO: CheckoutCashbackConfig = {
  ativo: true,
  percentualPrimeiraCompra: 10,
  percentualCompraRecorrente: 5,
  somenteClienteCadastrado: true,
  permitirComCupom: false,
  permitirProdutoComDesconto: true,
  diasValidade: null,
};

export default async function CheckoutPage() {
  const clienteId = await obterClienteAutenticadoId();

  const [
    menus,
    categoriasMenu,
    configuracaoMenuRodape,
    cashbackRaw,
    clienteRaw,
  ] = await Promise.all([
    buscarMenusPublicos(),

    buscarCategoriasMenuPublico(),

    buscarConfiguracaoMenuRodape(),

    prisma.lojaCashbackConfiguracao.findUnique({
      where: {
        chave: CHAVE_CASHBACK_CONFIG,
      },
    }),

    clienteId
      ? prisma.cliente.findUnique({
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
            pedidosOnline: {
              select: {
                id: true,
                statusPagamento: true,
              },
              orderBy: {
                criadoEm: "desc",
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const cashbackConfig: CheckoutCashbackConfig = cashbackRaw
    ? {
        ativo: cashbackRaw.ativo,
        percentualPrimeiraCompra: Number(
          cashbackRaw.percentualPrimeiraCompra || 0
        ),
        percentualCompraRecorrente: Number(
          cashbackRaw.percentualCompraRecorrente || 0
        ),
        somenteClienteCadastrado: cashbackRaw.somenteClienteCadastrado,
        permitirComCupom: cashbackRaw.permitirComCupom,
        permitirProdutoComDesconto: cashbackRaw.permitirProdutoComDesconto,
        diasValidade: cashbackRaw.diasValidade,
      }
    : CASHBACK_CONFIG_PADRAO;

  const clienteLogado: CheckoutClienteLogado | null =
    clienteRaw && clienteRaw.status !== "NA_LIXEIRA"
    ? {
        id: clienteRaw.id,
        codigo: clienteRaw.codigo,
        nome: clienteRaw.nome,
        telefone: clienteRaw.telefone,
        email: clienteRaw.email,
        documento: clienteRaw.documento,
        cep: clienteRaw.cep,
        rua: clienteRaw.rua,
        numero: clienteRaw.numero,
        complemento: clienteRaw.complemento,
        bairro: clienteRaw.bairro,
        cidade: clienteRaw.cidade,
        estado: clienteRaw.estado,
        tipoCliente: clienteRaw.tipoCliente,
        cashbackSaldo: Number(clienteRaw.cashbackSaldo || 0),
        totalPedidosOnline: clienteRaw.pedidosOnline.length,
        totalPedidosPagos: clienteRaw.pedidosOnline.filter(
            (pedido) => pedido.statusPagamento === "PAGO"
          ).length,
        }
      : null;

  return (
    <CheckoutClient
      menus={menus}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
      cashbackConfig={cashbackConfig}
      clienteLogado={clienteLogado}
    />
  );
}
