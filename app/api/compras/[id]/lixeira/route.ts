import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_RESTAURACAO_PADRAO = "ATIVA";

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

    const compra = await prisma.compra.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        statusAntesLixeira: true,
      },
    });

    if (!compra) {
      return NextResponse.json(
        { error: "Compra não encontrada." },
        { status: 404 }
      );
    }

    if (acao === "MOVER") {
      if (compra.status === "NA_LIXEIRA") {
        return NextResponse.json(
          { error: "Esta compra já está na lixeira." },
          { status: 400 }
        );
      }

      await prisma.compra.update({
        where: { id },
        data: {
          statusAntesLixeira: compra.status,
          status: "NA_LIXEIRA",
        },
      });

      return NextResponse.json({ ok: true, status: "NA_LIXEIRA" });
    }

    if (compra.status !== "NA_LIXEIRA") {
      return NextResponse.json(
        { error: "Esta compra não está na lixeira." },
        { status: 400 }
      );
    }

    const statusRestaurado =
      compra.statusAntesLixeira || STATUS_RESTAURACAO_PADRAO;

    await prisma.compra.update({
      where: { id },
      data: {
        status: statusRestaurado,
        statusAntesLixeira: null,
      },
    });

    return NextResponse.json({ ok: true, status: statusRestaurado });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar lixeira.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}