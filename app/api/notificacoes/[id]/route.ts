import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  arquivarNotificacao,
  excluirNotificacao,
  marcarComoLida,
} from "@/lib/notificacoes/notificacoes";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await exigirAdmin();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const acao = String(body.acao || "LIDA").toUpperCase();

  if (acao === "LIDA") {
    const notificacao = await marcarComoLida(id, usuario.id, usuario.perfil);
    return NextResponse.json({ notificacao });
  }

  if (acao === "ARQUIVAR") {
    const notificacao = await arquivarNotificacao(id, usuario.id, usuario.perfil);
    return NextResponse.json({ notificacao });
  }

  if (acao === "EXCLUIR") {
    const notificacao = await excluirNotificacao(id, usuario.id, usuario.perfil);
    return NextResponse.json({ notificacao });
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
