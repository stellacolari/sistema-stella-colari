import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_RESTAURACAO_PADRAO = "VENDA_FINALIZADA";

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

    const venda = await prisma.venda.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        statusAntesLixeira: true,
      },
    });

    if (!venda) {
      return NextResponse.json(
        { error: "Venda não encontrada." },
        { status: 404 }
      );
    }

    if (acao === "MOVER") {
      if (venda.status === "NA_LIXEIRA") {
        return NextResponse.json(
          { error: "Esta venda já está na lixeira." },
          { status: 400 }
        );
      }

      await prisma.venda.update({
        where: { id },
        data: {
          statusAntesLixeira: venda.status,
          status: "NA_LIXEIRA",
        },
      });

      return NextResponse.json({ ok: true, status: "NA_LIXEIRA" });
    }

    if (venda.status !== "NA_LIXEIRA") {
      return NextResponse.json(
        { error: "Esta venda não está na lixeira." },
        { status: 400 }
      );
    }

    const statusRestaurado =
      venda.statusAntesLixeira || STATUS_RESTAURACAO_PADRAO;

    await prisma.venda.update({
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