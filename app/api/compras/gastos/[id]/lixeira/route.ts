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
        { error: "Acao invalida para lixeira." },
        { status: 400 }
      );
    }

    const lancamento = await prisma.lancamentoFinanceiro.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        statusAntesLixeira: true,
      },
    });

    if (!lancamento) {
      return NextResponse.json(
        { error: "Lancamento nao encontrado." },
        { status: 404 }
      );
    }

    if (acao === "MOVER") {
      if (lancamento.status === "NA_LIXEIRA") {
        return NextResponse.json(
          { error: "Este lancamento ja esta na lixeira." },
          { status: 400 }
        );
      }

      await prisma.lancamentoFinanceiro.update({
        where: { id },
        data: {
          statusAntesLixeira: lancamento.status,
          status: "NA_LIXEIRA",
        },
      });

      return NextResponse.json({ ok: true, status: "NA_LIXEIRA" });
    }

    if (lancamento.status !== "NA_LIXEIRA") {
      return NextResponse.json(
        { error: "Este lancamento nao esta na lixeira." },
        { status: 400 }
      );
    }

    const statusRestaurado =
      lancamento.statusAntesLixeira || STATUS_RESTAURACAO_PADRAO;

    await prisma.lancamentoFinanceiro.update({
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
