import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminPermissaoError, exigirAdmin } from "@/lib/auth/admin";

export class UsuariosAdminError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const usuarioAdminSeguroSelect = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  perfilAdministrativoId: true,
  ativo: true,
  ultimoLoginEm: true,
  criadoEm: true,
  atualizadoEm: true,
  perfilAdministrativo: {
    select: {
      id: true,
      nome: true,
      codigo: true,
      tipoBase: true,
      ativo: true,
    },
  },
} satisfies Prisma.UsuarioAdminSelect;

export const perfilAdministrativoResumoSelect = {
  id: true,
  nome: true,
  codigo: true,
  tipoBase: true,
  ativo: true,
} satisfies Prisma.PerfilAdministrativoSelect;

export type UsuarioAdminSeguro = Prisma.UsuarioAdminGetPayload<{
  select: typeof usuarioAdminSeguroSelect;
}>;

export type PerfilAdministrativoResumo = Prisma.PerfilAdministrativoGetPayload<{
  select: typeof perfilAdministrativoResumoSelect;
}>;

const PERFIS_USUARIO = new Set(["ACESSO_GERAL", "VENDEDOR"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function exigirGestaoUsuariosAdmin() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    throw new AdminPermissaoError(
      "Acesso nao permitido para gerenciar usuarios administrativos.",
    );
  }

  return usuario;
}

export function normalizarNomeUsuario(valor: unknown) {
  const nome = String(valor || "").trim();

  if (!nome) {
    throw new UsuariosAdminError("Informe o nome do usuario.");
  }

  return nome;
}

export function normalizarEmailUsuario(valor: unknown) {
  const email = String(valor || "").trim().toLowerCase();

  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new UsuariosAdminError("Informe um e-mail valido.");
  }

  return email;
}

export function normalizarPerfilUsuario(valor: unknown) {
  const perfil = String(valor || "VENDEDOR").trim().toUpperCase();

  if (!PERFIS_USUARIO.has(perfil)) {
    throw new UsuariosAdminError("Perfil administrativo invalido.");
  }

  return perfil;
}

export function normalizarSenhaUsuario(valor: unknown, obrigatoria: boolean) {
  const senha = typeof valor === "string" ? valor : "";

  if (!senha && !obrigatoria) {
    return null;
  }

  if (senha.length < 8) {
    throw new UsuariosAdminError("A senha deve ter pelo menos 8 caracteres.");
  }

  return senha;
}

export async function garantirEmailUsuarioUnico(email: string, ignorarId?: string) {
  const existente = await prisma.usuarioAdmin.findFirst({
    where: {
      email,
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { id: true },
  });

  if (existente) {
    throw new UsuariosAdminError("Ja existe um usuario com este e-mail.");
  }
}

export async function resolverPerfilAdministrativoId(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor !== "string") {
    throw new UsuariosAdminError("Perfil administrativo invalido.");
  }

  const perfil = await prisma.perfilAdministrativo.findFirst({
    where: {
      id: valor,
      ativo: true,
    },
    select: { id: true },
  });

  if (!perfil) {
    throw new UsuariosAdminError("Perfil administrativo nao encontrado ou inativo.");
  }

  return perfil.id;
}

export async function garantirAdminGeralAtivoRestante({
  usuarioId,
  proximoPerfil,
  proximoAtivo,
}: {
  usuarioId: string;
  proximoPerfil: string;
  proximoAtivo: boolean;
}) {
  const atual = await prisma.usuarioAdmin.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      perfil: true,
      ativo: true,
    },
  });

  if (!atual) {
    throw new UsuariosAdminError("Usuario nao encontrado.", 404);
  }

  const contavaComoAdmin = atual.ativo && atual.perfil === "ACESSO_GERAL";
  const continuaraComoAdmin =
    proximoAtivo && proximoPerfil === "ACESSO_GERAL";

  if (!contavaComoAdmin || continuaraComoAdmin) {
    return;
  }

  const outrosAdmins = await prisma.usuarioAdmin.count({
    where: {
      id: { not: usuarioId },
      ativo: true,
      perfil: "ACESSO_GERAL",
    },
  });

  if (outrosAdmins === 0) {
    throw new UsuariosAdminError(
      "Nao e permitido remover o ultimo administrador geral ativo.",
    );
  }
}

export function garantirSemAutoBloqueio({
  usuarioAtualId,
  usuarioAlvoId,
  proximoPerfil,
  proximoAtivo,
  perfilAdministrativoAlterado,
}: {
  usuarioAtualId: string;
  usuarioAlvoId: string;
  proximoPerfil: string;
  proximoAtivo: boolean;
  perfilAdministrativoAlterado: boolean;
}) {
  if (usuarioAtualId !== usuarioAlvoId) {
    return;
  }

  if (!proximoAtivo) {
    throw new UsuariosAdminError(
      "Nao e permitido desativar o proprio usuario.",
    );
  }

  if (proximoPerfil !== "ACESSO_GERAL") {
    throw new UsuariosAdminError(
      "Nao e permitido remover o proprio acesso geral.",
    );
  }

  if (perfilAdministrativoAlterado) {
    throw new UsuariosAdminError(
      "Nao e permitido alterar o proprio perfil administrativo por esta tela.",
    );
  }
}
