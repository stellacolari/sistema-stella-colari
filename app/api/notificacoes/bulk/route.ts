import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  arquivarNotificacao,
  excluirTodasNotificacoes,
  excluirVariasNotificacoes,
  marcarComoLida,
  perfilNotificacaoUsuario,
} from "@/lib/notificacoes/notificacoes";

export async function POST(request: NextRequest) {
  const usuario = await exigirAdmin();
  const body = await request.json().catch(() => ({}));
  const acao = String(body.acao || "").toUpperCase();
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean).map(String) : [];
  const perfilNotificacao = perfilNotificacaoUsuario(usuario);

  try {
    if (acao === "EXCLUIR_TUDO") {
      const resultado = await excluirTodasNotificacoes(usuario.id, perfilNotificacao);
      return NextResponse.json({ ok: true, resultado });
    }

    if (!ids.length) {
      return NextResponse.json({ error: "Selecione ao menos uma notificacao." }, { status: 400 });
    }

    if (acao === "EXCLUIR") {
      const resultado = await excluirVariasNotificacoes(ids, usuario.id, perfilNotificacao);
      return NextResponse.json({ ok: true, resultado });
    }

    if (acao === "LIDA") {
      await Promise.all(ids.map((id) => marcarComoLida(id, usuario.id, perfilNotificacao)));
      return NextResponse.json({ ok: true, resultado: { total: ids.length } });
    }

    if (acao === "ARQUIVAR") {
      await Promise.all(ids.map((id) => arquivarNotificacao(id, usuario.id, perfilNotificacao)));
      return NextResponse.json({ ok: true, resultado: { total: ids.length } });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel executar a acao." },
      { status: 403 },
    );
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
