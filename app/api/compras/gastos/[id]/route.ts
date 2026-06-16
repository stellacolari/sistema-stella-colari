import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { montarPayloadLancamentoFinanceiro } from "@/lib/compras/lancamentos-financeiros";
import { registrarPagamentoLancamentoFinanceiro } from "@/lib/financeiro/resultado";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const resultado = montarPayloadLancamentoFinanceiro(body);

    if ("error" in resultado) {
      return NextResponse.json({ error: resultado.error }, { status: 400 });
    }

    const lancamentoExistente = await prisma.lancamentoFinanceiro.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!lancamentoExistente) {
      return NextResponse.json(
        { error: "Lançamento não encontrado." },
        { status: 404 }
      );
    }

    const lancamento = await prisma.lancamentoFinanceiro.update({
      where: { id },
      data: resultado.payload,
    });

    await registrarPagamentoLancamentoFinanceiro(lancamento.id);

    return NextResponse.json({ ok: true, lancamento });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar o gasto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
