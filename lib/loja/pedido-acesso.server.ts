import { prisma } from "@/lib/prisma";
import {
  clientePodeAcessarPedido,
  validarPedidoAcessoToken,
} from "@/lib/loja/pedido-acesso";

export async function buscarPedidoPublicoAutorizado({
  codigo,
  clienteCookieId,
  access,
  tokenCookie,
}: {
  codigo: string;
  clienteCookieId: string;
  access: string;
  tokenCookie: string;
}) {
  const pedido = await prisma.pedidoOnline.findUnique({
    where: { codigo },
    select: {
      id: true,
      clienteId: true,
      pedidoAcessoTokenHash: true,
      cliente: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const clienteProprietario = clientePodeAcessarPedido({
    clienteCookieId,
    pedidoClienteId: pedido?.clienteId,
    clienteAtivo: Boolean(
      pedido?.cliente && pedido.cliente.status !== "NA_LIXEIRA",
    ),
  });
  const tokenValido =
    validarPedidoAcessoToken(access, pedido?.pedidoAcessoTokenHash) ||
    validarPedidoAcessoToken(tokenCookie, pedido?.pedidoAcessoTokenHash);

  return pedido && (clienteProprietario || tokenValido)
    ? { id: pedido.id }
    : null;
}
