import { NextResponse } from "next/server";
import { exigirAdmin, lerSessaoAdmin } from "@/lib/auth/admin";
import { obterPermissoesUsuario } from "@/lib/permissoes/perfis";

export async function GET() {
  const sessao = await lerSessaoAdmin();

  if (!sessao) {
    return NextResponse.json(
      { error: "Não autenticado no painel administrativo." },
      { status: 401 }
    );
  }

  const usuario = await exigirAdmin();

  return NextResponse.json({
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      perfilAdministrativo: usuario.perfilAdministrativo,
      permissoes: obterPermissoesUsuario(usuario),
    },
  });
}
