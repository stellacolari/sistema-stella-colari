import { NextResponse } from "next/server";
import { alterarQuantidadeItemCompra } from "@/app/compras/actions";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await context.params;
    const body = await req.json();

    const quantidade = Number(body.quantidade || 0);
    const motivo = String(
      body.motivo || "Alteração de quantidade de item da compra."
    );

    await alterarQuantidadeItemCompra(id, itemId, quantidade, motivo);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao alterar quantidade.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}