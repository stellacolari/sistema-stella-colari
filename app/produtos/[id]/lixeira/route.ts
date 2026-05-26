import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_RESTAURACAO_PADRAO = "ATIVO";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const acao = String(body.acao || "").trim();

    if (!["MOVER", "RESTAURAR"].includes(acao)) {
      return NextResponse.json(
        { error: "Ação inválida para lixeira." },
        { status: 400 }
      );
    }

    const produto = await prisma.produto.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        statusAntesLixeira: true,
        ativo: true,
      },
    });

    if (!produto) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    const statusAtual =
      produto.status || (produto.ativo ? "ATIVO" : "INATIVO");

    if (acao === "MOVER") {
      if (statusAtual === "NA_LIXEIRA") {
        return NextResponse.json(
          { error: "Este produto já está na lixeira." },
          { status: 400 }
        );
      }

      await prisma.produto.update({
        where: { id },
        data: {
          statusAntesLixeira: statusAtual,
          status: "NA_LIXEIRA",
          ativo: false,
        },
      });

      return NextResponse.json({ ok: true, status: "NA_LIXEIRA" });
    }

    if (statusAtual !== "NA_LIXEIRA") {
      return NextResponse.json(
        { error: "Este produto não está na lixeira." },
        { status: 400 }
      );
    }

    const statusRestaurado =
      produto.statusAntesLixeira || STATUS_RESTAURACAO_PADRAO;

    await prisma.produto.update({
      where: { id },
      data: {
        status: statusRestaurado,
        statusAntesLixeira: null,
        ativo: statusRestaurado === "ATIVO",
      },
    });

    return NextResponse.json({ ok: true, status: statusRestaurado });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar lixeira.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}