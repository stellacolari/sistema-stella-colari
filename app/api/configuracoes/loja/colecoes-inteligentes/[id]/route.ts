import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";

const STATUS_VALIDOS = new Set(["RASCUNHO", "ATIVA", "PAUSADA", "ARQUIVADA"]);

async function exigirAcesso() {
  const usuario = await exigirAdmin();
  if (
    usuario.perfil !== "ACESSO_GERAL" &&
    !usuarioTemPermissao(usuario, "lojaOnline", "editar") &&
    !usuarioTemPermissao(usuario, "configuracoes", "editar")
  ) {
    throw new Error("Acesso nao permitido para este perfil.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await exigirAcesso();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === "string" ? body.status.toUpperCase() : undefined;

    if (status && !STATUS_VALIDOS.has(status)) {
      return NextResponse.json({ error: "Status invalido." }, { status: 400 });
    }

    const colecao = await prisma.colecaoInteligente.update({
      where: { id },
      data: {
        nome: typeof body.nome === "string" && body.nome.trim() ? body.nome.trim() : undefined,
        descricao: typeof body.descricao === "string" ? body.descricao.trim() || null : undefined,
        status,
        modoAtualizacao: typeof body.modoAtualizacao === "string" ? body.modoAtualizacao.toUpperCase() : undefined,
        criteriosJson: body.criteriosJson ? (body.criteriosJson as Prisma.InputJsonValue) : undefined,
        configJson: body.configJson ? (body.configJson as Prisma.InputJsonValue) : undefined,
        aprovadaEm: status === "ATIVA" ? new Date() : undefined,
        desativadaEm: status === "PAUSADA" || status === "ARQUIVADA" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ colecao });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel atualizar a colecao." }, { status: 500 });
  }
}
