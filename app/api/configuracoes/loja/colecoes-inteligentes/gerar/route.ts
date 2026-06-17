import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";
import { gerarColecoesInteligentes } from "@/lib/loja/colecoes-inteligentes";

async function exigirAcesso() {
  const usuario = await exigirAdmin();
  if (
    usuario.perfil !== "ACESSO_GERAL" &&
    !usuarioTemPermissao(usuario, "lojaOnline", "executar") &&
    !usuarioTemPermissao(usuario, "configuracoes", "editar")
  ) {
    throw new Error("Acesso nao permitido para este perfil.");
  }
}

export async function POST() {
  try {
    await exigirAcesso();
    const resultado = await gerarColecoesInteligentes();
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel gerar colecoes." }, { status: 500 });
  }
}
