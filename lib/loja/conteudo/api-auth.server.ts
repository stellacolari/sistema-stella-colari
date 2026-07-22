import "server-only";

import { NextResponse } from "next/server";
import {
  AdminPermissaoError,
  exigirAdminComPermissao,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const CONTEUDO_PAYLOAD_MAX_BYTES = 1_000_000;

export function erroConteudo(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, ...(details ? { details } : {}) },
    { status },
  );
}

export async function exigirAcessoConteudo(
  acao: "ver" | "criar" | "editar" | "executar" | "excluir",
) {
  try {
    return await exigirAdminComPermissao("lojaOnline", acao);
  } catch (error) {
    if (error instanceof AdminPermissaoError) return null;
    throw error;
  }
}

export function validarOrigemMutacao(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function payloadDentroDoLimite(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  return !Number.isFinite(contentLength) || contentLength <= CONTEUDO_PAYLOAD_MAX_BYTES;
}

export function payloadJsonDentroDoLimite(value: unknown) {
  try {
    return (
      new TextEncoder().encode(JSON.stringify(value)).byteLength <=
      CONTEUDO_PAYLOAD_MAX_BYTES
    );
  } catch {
    return false;
  }
}

export async function protegerMutacaoConteudoLegado(
  request: Request,
  acao: "criar" | "editar" | "executar" | "excluir",
  pagina?: { tipos?: string[]; slugs?: string[] },
) {
  const usuario = await exigirAcessoConteudo(acao);
  if (!usuario) return erroConteudo("Acesso não permitido.", 403);
  if (!validarOrigemMutacao(request)) {
    return erroConteudo("Origem da requisição inválida.", 403);
  }
  if (!payloadDentroDoLimite(request)) {
    return erroConteudo("Conteúdo excede o limite permitido.", 413);
  }

  const filtrosPagina = [
    ...(pagina?.tipos?.length ? [{ tipo: { in: pagina.tipos } }] : []),
    ...(pagina?.slugs?.length ? [{ slug: { in: pagina.slugs } }] : []),
  ];
  if (filtrosPagina.length > 0) {
    const documentoNovo = await prisma.lojaConteudoDocumento.findFirst({
      where: {
        modoEntrega: "NOVO",
        pagina: { is: { OR: filtrosPagina } },
      },
      select: { id: true },
    });
    if (documentoNovo) {
      return erroConteudo(
        "Esta experiência já é gerenciada em Conteúdo da Loja.",
        409,
      );
    }
  }

  return null;
}
