import { NextResponse } from "next/server";
import { AdminPermissaoError, exigirAdminComPermissao } from "@/lib/auth/admin";
import { removerProdutoDaColecao } from "@/lib/loja/colecoes-inteligentes";

async function exigirAcesso() {
  await exigirAdminComPermissao("lojaOnline", "editar");
}

export async function POST(_request: Request, context: { params: Promise<{ id: string; produtoId: string }> }) {
  try {
    await exigirAcesso();
    const { id, produtoId } = await context.params;
    const item = await removerProdutoDaColecao(id, produtoId);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel remover produto." },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
