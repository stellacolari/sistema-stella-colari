import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminPermissaoError, hashSenha } from "@/lib/auth/admin";
import {
  exigirGestaoUsuariosAdmin,
  garantirEmailUsuarioUnico,
  normalizarEmailUsuario,
  normalizarNomeUsuario,
  normalizarPerfilUsuario,
  normalizarSenhaUsuario,
  perfilAdministrativoResumoSelect,
  resolverPerfilAdministrativoId,
  usuarioAdminSeguroSelect,
  UsuariosAdminError,
} from "@/lib/admin/usuarios-admin";

function respostaErro(error: unknown, fallback: string) {
  if (error instanceof UsuariosAdminError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof AdminPermissaoError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function GET() {
  try {
    await exigirGestaoUsuariosAdmin();

    const [usuarios, perfis] = await Promise.all([
      prisma.usuarioAdmin.findMany({
        select: usuarioAdminSeguroSelect,
        orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      }),
      prisma.perfilAdministrativo.findMany({
        select: perfilAdministrativoResumoSelect,
        orderBy: [{ ativo: "desc" }, { tipoBase: "asc" }, { nome: "asc" }],
      }),
    ]);

    return NextResponse.json({ usuarios, perfis });
  } catch (error) {
    return respostaErro(error, "Nao foi possivel carregar os usuarios.");
  }
}

export async function POST(request: Request) {
  try {
    await exigirGestaoUsuariosAdmin();

    const body = await request.json().catch(() => ({}));
    const nome = normalizarNomeUsuario(body.nome);
    const email = normalizarEmailUsuario(body.email);
    const senha = normalizarSenhaUsuario(body.senha, true);
    const perfil = normalizarPerfilUsuario(body.perfil);
    const perfilAdministrativoId = await resolverPerfilAdministrativoId(
      body.perfilAdministrativoId,
    );

    await garantirEmailUsuarioUnico(email);

    const usuario = await prisma.usuarioAdmin.create({
      data: {
        nome,
        email,
        senhaHash: await hashSenha(senha || ""),
        perfil,
        perfilAdministrativoId,
        ativo: body.ativo !== false,
      },
      select: usuarioAdminSeguroSelect,
    });

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    return respostaErro(error, "Nao foi possivel criar o usuario.");
  }
}
