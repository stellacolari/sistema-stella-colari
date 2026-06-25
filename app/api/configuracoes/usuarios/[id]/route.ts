import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminPermissaoError, hashSenha } from "@/lib/auth/admin";
import {
  exigirGestaoUsuariosAdmin,
  garantirAdminGeralAtivoRestante,
  garantirEmailUsuarioUnico,
  garantirSemAutoBloqueio,
  normalizarEmailUsuario,
  normalizarNomeUsuario,
  normalizarPerfilUsuario,
  normalizarSenhaUsuario,
  resolverPerfilAdministrativoId,
  usuarioAdminSeguroSelect,
  UsuariosAdminError,
} from "@/lib/admin/usuarios-admin";

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const usuarioAtual = await exigirGestaoUsuariosAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const atual = await prisma.usuarioAdmin.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        perfilAdministrativoId: true,
        ativo: true,
      },
    });

    if (!atual) {
      throw new UsuariosAdminError("Usuario nao encontrado.", 404);
    }

    const data: Prisma.UsuarioAdminUpdateInput = {};
    const proximoPerfil = hasOwn(body, "perfil")
      ? normalizarPerfilUsuario(body.perfil)
      : atual.perfil;
    const proximoAtivo = hasOwn(body, "ativo")
      ? body.ativo === true
      : atual.ativo;
    let perfilAdministrativoAlterado = false;

    if (hasOwn(body, "nome")) {
      data.nome = normalizarNomeUsuario(body.nome);
    }

    if (hasOwn(body, "email")) {
      const email = normalizarEmailUsuario(body.email);
      await garantirEmailUsuarioUnico(email, id);
      data.email = email;
    }

    if (hasOwn(body, "perfil")) {
      data.perfil = proximoPerfil;
    }

    if (hasOwn(body, "perfilAdministrativoId")) {
      const perfilAdministrativoId = await resolverPerfilAdministrativoId(
        body.perfilAdministrativoId,
      );
      perfilAdministrativoAlterado =
        perfilAdministrativoId !== atual.perfilAdministrativoId;
      data.perfilAdministrativo = perfilAdministrativoId
        ? { connect: { id: perfilAdministrativoId } }
        : { disconnect: true };
    }

    if (hasOwn(body, "ativo")) {
      if (typeof body.ativo !== "boolean") {
        throw new UsuariosAdminError("Status do usuario invalido.");
      }
      data.ativo = proximoAtivo;
    }

    if (hasOwn(body, "senha")) {
      const senha = normalizarSenhaUsuario(body.senha, false);
      if (senha) {
        data.senhaHash = await hashSenha(senha);
      }
    }

    garantirSemAutoBloqueio({
      usuarioAtualId: usuarioAtual.id,
      usuarioAlvoId: id,
      proximoPerfil,
      proximoAtivo,
      perfilAdministrativoAlterado,
    });

    await garantirAdminGeralAtivoRestante({
      usuarioId: id,
      proximoPerfil,
      proximoAtivo,
    });

    const usuario = await prisma.usuarioAdmin.update({
      where: { id },
      data,
      select: usuarioAdminSeguroSelect,
    });

    return NextResponse.json({ usuario });
  } catch (error) {
    return respostaErro(error, "Nao foi possivel atualizar o usuario.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const usuarioAtual = await exigirGestaoUsuariosAdmin();
    const { id } = await context.params;

    if (usuarioAtual.id === id) {
      throw new UsuariosAdminError(
        "Nao e permitido desativar o proprio usuario.",
      );
    }

    const atual = await prisma.usuarioAdmin.findUnique({
      where: { id },
      select: {
        id: true,
        perfil: true,
        ativo: true,
      },
    });

    if (!atual) {
      throw new UsuariosAdminError("Usuario nao encontrado.", 404);
    }

    await garantirAdminGeralAtivoRestante({
      usuarioId: id,
      proximoPerfil: atual.perfil,
      proximoAtivo: false,
    });

    const usuario = await prisma.usuarioAdmin.update({
      where: { id },
      data: { ativo: false },
      select: usuarioAdminSeguroSelect,
    });

    return NextResponse.json({ usuario });
  } catch (error) {
    return respostaErro(error, "Nao foi possivel desativar o usuario.");
  }
}
