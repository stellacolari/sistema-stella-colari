import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const quantidadeAtual = Number(body.quantidadeAtual);

    if (Number.isNaN(quantidadeAtual) || quantidadeAtual < 0) {
      return NextResponse.json(
        { error: "Quantidade inválida." },
        { status: 400 }
      );
    }

    const estoque = await prisma.estoqueAdicional.findUnique({
      where: { id },
    });

    if (!estoque) {
      return NextResponse.json(
        { error: "Registro de estoque não encontrado." },
        { status: 404 }
      );
    }

    const custoMedio =
      quantidadeAtual > 0 ? Number(estoque.valorAcumulado) / quantidadeAtual : 0;

    await prisma.estoqueAdicional.update({
      where: { id },
      data: {
        quantidadeAtual,
        custoMedio,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar estoque.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}