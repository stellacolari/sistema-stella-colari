import type { Metadata } from "next";
import { cookies } from "next/headers";
import CheckoutClient, {
  type CheckoutCashbackConfig,
  type CheckoutClienteLogado,
} from "@/components/loja/CheckoutClient";
import { prisma } from "@/lib/prisma";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";

export const metadata: Metadata = {
  title: "Checkout | Loja Stella",
};

export const dynamic = "force-dynamic";

const COOKIE_CLIENTE_ID = "stella_cliente_id";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const clienteId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";

  const [menus, categoriasMenu, cashbackRaw, clienteRaw] = await Promise.all([
    buscarMenusPublicos(),

    buscarCategoriasMenuPublico(),

    prisma.lojaCashbackConfiguracao.upsert({
      where: {
        chave: "PADRAO",
      },
      create: {
        chave: "PADRAO",
        ativo: true,
        percentualPrimeiraCompra: 10,
        percentualCompraRecorrente: 5,
        somenteClienteCadastrado: true,
        permitirComCupom: false,
        permitirProdutoComDesconto: true,
      },
      update: {},
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

  const cashbackConfig: CheckoutCashbackConfig = {
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
  };

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
      cashbackConfig={cashbackConfig}
      clienteLogado={clienteLogado}
    />
  );
}