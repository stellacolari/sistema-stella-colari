import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import { contarNotificacoesNaoLidas, perfilNotificacaoUsuario } from "@/lib/notificacoes/notificacoes";

export async function GET() {
  const usuario = await exigirAdmin();
  const contadores = await contarNotificacoesNaoLidas(usuario.id, perfilNotificacaoUsuario(usuario));

  return NextResponse.json({ contadores });
}
