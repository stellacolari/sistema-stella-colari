import { NextResponse } from "next/server";
import { lerSessaoAdmin } from "@/lib/auth/admin";

export async function GET() {
  const sessao = await lerSessaoAdmin();

  if (!sessao) {
    return NextResponse.json(
      { error: "Não autenticado no painel administrativo." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    usuario: {
      id: sessao.sub,
      nome: sessao.nome,
      email: sessao.email,
      perfil: sessao.perfil,
    },
  });
}
