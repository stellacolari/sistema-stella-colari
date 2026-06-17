import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import { sincronizarNotificacoesOperacionais } from "@/lib/notificacoes/notificacoes";

export async function POST() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso nao permitido para este perfil." }, { status: 403 });
  }

  const resultado = await sincronizarNotificacoesOperacionais();

  return NextResponse.json({ ok: true, resultado });
}
