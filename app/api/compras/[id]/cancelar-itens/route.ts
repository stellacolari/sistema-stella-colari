import { NextResponse } from "next/server";
import { cancelarItensCompra } from "@/app/compras/actions";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const itemIds = Array.isArray(body.itemIds) ? body.itemIds : [];

    await cancelarItensCompra(id, itemIds);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao cancelar itens.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}