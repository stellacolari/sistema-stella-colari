import { NextResponse } from "next/server";
import { AdminPermissaoError, exigirAdminComPermissao } from "@/lib/auth/admin";
import { fixarProdutoNaColecao } from "@/lib/loja/colecoes-inteligentes";

async function exigirAcesso() {
  await exigirAdminComPermissao("lojaOnline", "editar");
}

export async function POST(request: Request, context: { params: Promise<{ id: string; produtoId: string }> }) {
  try {
    await exigirAcesso();
    const { id, produtoId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const item = await fixarProdutoNaColecao(id, produtoId, body.fixado !== false);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel fixar produto." },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
