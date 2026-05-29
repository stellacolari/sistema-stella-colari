import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
    produtoId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: familiaId, produtoId } = await context.params;

    const vinculo = await prisma.produtoFamiliaProduto.findUnique({
      where: {
        familiaId_produtoId: {
          familiaId,
          produtoId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!vinculo) {
      return NextResponse.json(
        { error: "Produto não pertence a esta família." },
        { status: 404 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      await tx.produtoFamiliaProduto.delete({
        where: {
          id: vinculo.id,
        },
      });

      await tx.produto.update({
        where: {
          id: produtoId,
        },
        data: {
          familiaId: null,

          // Limpeza da estrutura antiga de compatibilidade.
          familiaMaterial: null,
          familiaCorJoia: null,
          familiaImagemUrl: null,
          familiaOrdem: 0,
        },
      });

      const produtosRestantes = await tx.produtoFamiliaProduto.count({
        where: {
          familiaId,
          ativo: true,
        },
      });

      return {
        produtosRestantes,
      };
    });

    return NextResponse.json({
      ok: true,
      produtosRestantes: resultado.produtosRestantes,
      familiaVazia: resultado.produtosRestantes === 0,
    });
  } catch (error) {
    console.error("Erro ao remover produto da família:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao remover produto da família.",
      },
      { status: 500 }
    );
  }
}