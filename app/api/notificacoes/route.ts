import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import { listarNotificacoes, perfilNotificacaoUsuario } from "@/lib/notificacoes/notificacoes";

export async function GET(request: NextRequest) {
  const usuario = await exigirAdmin();
  const { searchParams } = new URL(request.url);
  const notificacoes = await listarNotificacoes({
    usuarioId: usuario.id,
    perfil: perfilNotificacaoUsuario(usuario),
    categoria: searchParams.get("categoria"),
    prioridade: searchParams.get("prioridade"),
    status: searchParams.get("status"),
    busca: searchParams.get("busca"),
    take: 150,
  });

  return NextResponse.json({ notificacoes });
}
