import { NextResponse } from "next/server";
import { AdminPermissaoError, exigirAdminComPermissao } from "@/lib/auth/admin";
import { gerarColecoesInteligentes } from "@/lib/loja/colecoes-inteligentes";

async function exigirAcesso() {
  await exigirAdminComPermissao("lojaOnline", "executar");
}

export async function POST() {
  try {
    await exigirAcesso();
    const resultado = await gerarColecoesInteligentes();
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel gerar colecoes." },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
