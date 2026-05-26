import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_VALIDOS = [
  "VENDA_FINALIZADA",
  "EM_PREPARACAO",
  "ENVIADA",
  "ENTREGUE",
  "NA_LIXEIRA",
];

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const status = String(body.status || "").trim();

    if (status === "CANCELADA") {
      return NextResponse.json(
        {
          error:
            "Para cancelar uma venda, use o fluxo de cancelamento com motivo e estorno de estoque.",
        },
        { status: 400 }
      );
    }

    if (!STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 }
      );
    }

    const vendaAtual = await prisma.venda.findUnique({
      where: { id },
      select: {
        status: true,
      },
    });

    if (!vendaAtual) {
      return NextResponse.json(
        { error: "Venda não encontrada." },
        { status: 404 }
      );
    }

    if (vendaAtual.status === "CANCELADA") {
      return NextResponse.json(
        { error: "Não é possível alterar o status de uma venda cancelada." },
        { status: 400 }
      );
    }

    await prisma.venda.update({
      where: { id },
      data: {
        status,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar status.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}