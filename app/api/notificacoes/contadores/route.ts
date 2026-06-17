import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import { contarNotificacoesNaoLidas } from "@/lib/notificacoes/notificacoes";

export async function GET() {
  const usuario = await exigirAdmin();
  const contadores = await contarNotificacoesNaoLidas(usuario.id, usuario.perfil);

  return NextResponse.json({ contadores });
}
