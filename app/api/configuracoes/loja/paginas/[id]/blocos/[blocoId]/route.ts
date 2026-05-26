import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; blocoId: string }> }
) {
  try {
    const { id, blocoId } = await context.params;
    const body = await req.json();

    const blocoAtual = await prisma.lojaPaginaBloco.findFirst({
      where: {
        id: blocoId,
        paginaId: id,
      },
    });

    if (!blocoAtual) {
      return NextResponse.json(
        { error: "Bloco não encontrado." },
        { status: 404 }
      );
    }

    const data: {
      titulo?: string | null;
      ativo?: boolean;
      ordem?: number;
      configJson?: Prisma.InputJsonValue;
    } = {};

    if ("titulo" in body) {
      data.titulo = String(body.titulo || "").trim() || null;
    }

    if ("ativo" in body) {
      data.ativo = Boolean(body.ativo);
    }

    if ("ordem" in body) {
      const ordem = Number(body.ordem);
      data.ordem = Number.isFinite(ordem) ? ordem : 0;
    }

    if ("configJson" in body) {
      if (!isPlainObject(body.configJson)) {
        return NextResponse.json(
          { error: "Configuração do bloco inválida." },
          { status: 400 }
        );
      }

      data.configJson = body.configJson as Prisma.InputJsonValue;
    }

    const bloco = await prisma.lojaPaginaBloco.update({
      where: { id: blocoId },
      data,
    });

    return NextResponse.json({ ok: true, bloco });
  } catch (error) {
    console.error("Erro ao atualizar bloco:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao atualizar bloco.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; blocoId: string }> }
) {
  try {
    const { id, blocoId } = await context.params;

    const blocoAtual = await prisma.lojaPaginaBloco.findFirst({
      where: {
        id: blocoId,
        paginaId: id,
      },
    });

    if (!blocoAtual) {
      return NextResponse.json(
        { error: "Bloco não encontrado." },
        { status: 404 }
      );
    }

    await prisma.lojaPaginaBloco.delete({
      where: { id: blocoId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir bloco:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao excluir bloco.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}