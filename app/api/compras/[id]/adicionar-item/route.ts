import { NextResponse } from "next/server";
import { adicionarItemCompra } from "@/app/compras/actions";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const formData = new FormData();

    formData.set("tipoItem", String(body.tipoItem || ""));
    formData.set("codigoDigitado", String(body.codigoDigitado || ""));
    formData.set("quantidade", String(body.quantidade || 0));
    formData.set("tamanhoAnel", String(body.tamanhoAnel || "UNICO"));
    formData.set("valorUnitarioBase", String(body.valorUnitarioBase || 0));
    formData.set(
      "motivo",
      String(body.motivo || "Inclusão posterior de item na compra.")
    );

    await adicionarItemCompra(id, formData);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao adicionar item.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}