import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";
import { fixarProdutoNaColecao } from "@/lib/loja/colecoes-inteligentes";

async function exigirAcesso() {
  const usuario = await exigirAdmin();
  if (
    usuario.perfil !== "ACESSO_GERAL" &&
    !usuarioTemPermissao(usuario, "lojaOnline", "editar") &&
    !usuarioTemPermissao(usuario, "configuracoes", "editar")
  ) {
    throw new Error("Acesso nao permitido para este perfil.");
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string; produtoId: string }> }) {
  try {
    await exigirAcesso();
    const { id, produtoId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const item = await fixarProdutoNaColecao(id, produtoId, body.fixado !== false);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel fixar produto." }, { status: 500 });
  }
}
