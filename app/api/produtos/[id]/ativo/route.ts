import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const ativo = Boolean(body.ativo);

    const produtoAtual = await prisma.produto.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!produtoAtual) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    if (produtoAtual.status === "NA_LIXEIRA") {
      return NextResponse.json(
        {
          error:
            "Não é possível alterar a visibilidade de um produto na lixeira.",
        },
        { status: 400 }
      );
    }

    await prisma.produto.update({
      where: { id },
      data: {
        ativo,
        status: ativo ? "ATIVO" : "INATIVO",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao alterar visibilidade do produto:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao alterar visibilidade do produto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}