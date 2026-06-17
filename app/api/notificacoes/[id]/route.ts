import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  arquivarNotificacao,
  excluirNotificacao,
  marcarComoLida,
  perfilNotificacaoUsuario,
} from "@/lib/notificacoes/notificacoes";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await exigirAdmin();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const acao = String(body.acao || "LIDA").toUpperCase();
  const perfilNotificacao = perfilNotificacaoUsuario(usuario);

  try {
    if (acao === "LIDA") {
      const notificacao = await marcarComoLida(id, usuario.id, perfilNotificacao);
      return NextResponse.json({ notificacao });
    }

    if (acao === "ARQUIVAR") {
      const notificacao = await arquivarNotificacao(id, usuario.id, perfilNotificacao);
      return NextResponse.json({ notificacao });
    }

    if (acao === "EXCLUIR") {
      const notificacao = await excluirNotificacao(id, usuario.id, perfilNotificacao);
      return NextResponse.json({ notificacao });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel alterar a notificacao." },
      { status: 403 },
    );
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
