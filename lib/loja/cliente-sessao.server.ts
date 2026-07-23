import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CLIENTE_SESSAO_COOKIE,
  criarClienteSessaoToken,
  getDuracaoSessaoCliente,
  hashClienteSessaoToken,
  validarClienteSessaoToken,
} from "@/lib/loja/cliente-sessao";

const INTERVALO_ATUALIZACAO_ULTIMO_USO_MS = 15 * 60 * 1000;

function hashUserAgent(userAgent: string | null | undefined) {
  const valor = String(userAgent || "").trim();

  return valor
    ? createHash("sha256").update(valor, "utf8").digest("hex")
    : null;
}

export async function criarSessaoCliente({
  clienteId,
  manterConectado,
  userAgent,
}: {
  clienteId: string;
  manterConectado: boolean;
  userAgent?: string | null;
}) {
  const credencial = criarClienteSessaoToken();
  const agora = new Date();
  const expiraEm = new Date(
    agora.getTime() + getDuracaoSessaoCliente(manterConectado) * 1000,
  );

  await prisma.clienteSessao.create({
    data: {
      clienteId,
      tokenHash: credencial.hash,
      expiraEm,
      ultimoUsoEm: agora,
      userAgentHash: hashUserAgent(userAgent),
    },
  });

  return {
    token: credencial.token,
    expiraEm,
  };
}

export async function resolverSessaoClienteToken(
  tokenRecebido: string | null | undefined,
) {
  const token = String(tokenRecebido || "").trim();
  const tokenHash = hashClienteSessaoToken(
    token || "token-ausente-padronizado",
  );
  const sessao = await prisma.clienteSessao.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      clienteId: true,
      tokenHash: true,
      expiraEm: true,
      revogadoEm: true,
      ultimoUsoEm: true,
      cliente: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const agora = new Date();
  const tokenValido = validarClienteSessaoToken(token, sessao?.tokenHash);
  const valida = Boolean(
    sessao &&
      !sessao.revogadoEm &&
      sessao.expiraEm > agora &&
      sessao.cliente.status !== "NA_LIXEIRA" &&
      tokenValido,
  );

  if (!valida || !sessao) {
    return null;
  }

  if (
    !sessao.ultimoUsoEm ||
    agora.getTime() - sessao.ultimoUsoEm.getTime() >=
      INTERVALO_ATUALIZACAO_ULTIMO_USO_MS
  ) {
    await prisma.clienteSessao.updateMany({
      where: {
        id: sessao.id,
        revogadoEm: null,
        expiraEm: {
          gt: agora,
        },
      },
      data: {
        ultimoUsoEm: agora,
      },
    });
  }

  return {
    sessaoId: sessao.id,
    clienteId: sessao.clienteId,
    expiraEm: sessao.expiraEm,
  };
}

export async function obterSessaoClienteAtual() {
  const cookieStore = await cookies();

  return resolverSessaoClienteToken(
    cookieStore.get(CLIENTE_SESSAO_COOKIE)?.value,
  );
}

export async function obterClienteAutenticadoId() {
  const sessao = await obterSessaoClienteAtual();

  return sessao?.clienteId ?? null;
}

export async function revogarSessaoClienteToken(
  tokenRecebido: string | null | undefined,
) {
  const token = String(tokenRecebido || "").trim();

  if (!token) return false;

  const tokenHash = hashClienteSessaoToken(token);
  const resultado = await prisma.clienteSessao.updateMany({
    where: {
      tokenHash,
      revogadoEm: null,
    },
    data: {
      revogadoEm: new Date(),
    },
  });

  return resultado.count > 0;
}

export async function revogarSessaoClienteAtual() {
  const cookieStore = await cookies();

  return revogarSessaoClienteToken(
    cookieStore.get(CLIENTE_SESSAO_COOKIE)?.value,
  );
}
