import "server-only";

import { prisma } from "@/lib/prisma";
import { criarPedidoAcessoToken } from "@/lib/loja/pedido-acesso";

type AtorReemissao = {
  id: string;
  nome: string;
};

export class PedidoReemissaoError extends Error {}

function normalizarMotivo(motivo: string) {
  const valor = motivo.trim().slice(0, 500);

  if (valor.length < 10) {
    throw new PedidoReemissaoError(
      "Informe um motivo de auditoria com pelo menos 10 caracteres.",
    );
  }

  return valor;
}

export async function reemitirAcessoPedidoAnonimo({
  pedidoId,
  ator,
  motivo,
}: {
  pedidoId: string;
  ator: AtorReemissao;
  motivo: string;
}) {
  const motivoAuditoria = normalizarMotivo(motivo);
  const acesso = criarPedidoAcessoToken();

  const pedido = await prisma.$transaction(async (tx) => {
    const atual = await tx.pedidoOnline.findFirst({
      where: {
        id: pedidoId,
        clienteId: null,
        origemCanal: "LOJA_STELLA",
      },
      select: {
        id: true,
        codigo: true,
        status: true,
      },
    });

    if (!atual) {
      throw new PedidoReemissaoError(
        "Pedido anonimo legado nao encontrado ou nao elegivel.",
      );
    }

    const atualizado = await tx.pedidoOnline.update({
      where: {
        id: atual.id,
      },
      data: {
        pedidoAcessoTokenHash: acesso.hash,
        pedidoAcessoCriadoEm: acesso.criadoEm,
      },
      select: {
        id: true,
        codigo: true,
      },
    });

    await tx.pedidoStatusHistorico.create({
      data: {
        pedidoOnlineId: atual.id,
        statusAnterior: atual.status,
        statusNovo: atual.status,
        tipoEvento: "ACESSO_REEMITIDO",
        origem: "ADMIN",
        usuarioNome: ator.nome,
        observacao: `Acesso publico reemitido por admin ${ator.id}. Motivo: ${motivoAuditoria}`,
      },
    });

    return atualizado;
  });

  return {
    pedido,
    token: acesso.token,
    criadoEm: acesso.criadoEm,
  };
}

export async function revogarAcessoPedidoAnonimo({
  pedidoId,
  ator,
  motivo,
}: {
  pedidoId: string;
  ator: AtorReemissao;
  motivo: string;
}) {
  const motivoAuditoria = normalizarMotivo(motivo);

  return prisma.$transaction(async (tx) => {
    const atual = await tx.pedidoOnline.findFirst({
      where: {
        id: pedidoId,
        clienteId: null,
        origemCanal: "LOJA_STELLA",
      },
      select: {
        id: true,
        codigo: true,
        status: true,
      },
    });

    if (!atual) {
      throw new PedidoReemissaoError(
        "Pedido anonimo legado nao encontrado ou nao elegivel.",
      );
    }

    const atualizado = await tx.pedidoOnline.update({
      where: {
        id: atual.id,
      },
      data: {
        pedidoAcessoTokenHash: null,
        pedidoAcessoCriadoEm: null,
      },
      select: {
        id: true,
        codigo: true,
      },
    });

    await tx.pedidoStatusHistorico.create({
      data: {
        pedidoOnlineId: atual.id,
        statusAnterior: atual.status,
        statusNovo: atual.status,
        tipoEvento: "ACESSO_REVOGADO",
        origem: "ADMIN",
        usuarioNome: ator.nome,
        observacao: `Acesso publico revogado por admin ${ator.id}. Motivo: ${motivoAuditoria}`,
      },
    });

    return atualizado;
  });
}
