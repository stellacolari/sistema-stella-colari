import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";
import {
  ADMIN_SESSION_COOKIE,
  assinarSessaoAdmin,
  getOpcoesCookieSessaoAdmin,
  lerSessaoAdminDeCookies,
} from "@/lib/auth/session";

const scryptAsync = promisify(scrypt);
const HASH_PREFIXO = "scrypt";
const HASH_KEY_LENGTH = 64;

export class AdminPermissaoError extends Error {}

export async function hashSenha(senha: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(
    senha,
    salt,
    HASH_KEY_LENGTH
  )) as Buffer;

  return `${HASH_PREFIXO}:${salt}:${derivedKey.toString("hex")}`;
}

export async function verificarSenha(senha: string, senhaHash: string) {
  const [prefixo, salt, hash] = senhaHash.split(":");

  if (prefixo !== HASH_PREFIXO || !salt || !hash) {
    return false;
  }

  const hashBuffer = Buffer.from(hash, "hex");
  const derivedKey = (await scryptAsync(senha, salt, hashBuffer.length)) as Buffer;

  if (derivedKey.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, hashBuffer);
}

export async function criarSessaoAdmin(usuario: {
  id: string;
  email: string;
  nome: string;
  perfil: string;
}) {
  const cookieStore = await cookies();
  const token = await assinarSessaoAdmin({
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil,
  });

  cookieStore.set(ADMIN_SESSION_COOKIE, token, getOpcoesCookieSessaoAdmin());
}

export async function lerSessaoAdmin() {
  return lerSessaoAdminDeCookies(await cookies());
}

export async function exigirAdmin() {
  const sessao = await lerSessaoAdmin();

  if (!sessao) {
    redirect("/login");
  }

  const usuario = await prisma.usuarioAdmin.findFirst({
    where: {
      id: sessao.sub,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      perfilAdministrativo: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          tipoBase: true,
          ativo: true,
          permissoesJson: true,
        },
      },
    },
  });

  if (!usuario) {
    redirect("/login");
  }

  return usuario;
}

export async function exigirAdminGeral() {
  const usuario = await exigirAdmin();

  if (!usuarioTemPermissao(usuario, "configuracoes", "editar")) {
    throw new Error("Acesso nao permitido para este perfil.");
  }

  return usuario;
}

export function usuarioTemPermissaoAdmin(
  usuario: Awaited<ReturnType<typeof exigirAdmin>>,
  modulo: string,
  acao: string
) {
  return usuarioTemPermissao(usuario, modulo, acao);
}

export function usuarioPodeVerDadosFinanceirosAdmin(
  usuario: Awaited<ReturnType<typeof exigirAdmin>>
) {
  return (
    usuarioTemPermissaoAdmin(usuario, "financeiro", "verFinanceiro") ||
    usuarioTemPermissaoAdmin(usuario, "resultado", "verFinanceiro") ||
    usuarioTemPermissaoAdmin(usuario, "resultado", "verEstrategico") ||
    usuarioTemPermissaoAdmin(usuario, "compras", "verCustos") ||
    usuarioTemPermissaoAdmin(usuario, "precificacao", "verCustos") ||
    usuarioTemPermissaoAdmin(usuario, "precificacao", "verMargem") ||
    usuarioTemPermissaoAdmin(usuario, "produtos", "verCustos") ||
    usuarioTemPermissaoAdmin(usuario, "produtos", "verMargem")
  );
}

export async function exigirAdminComPermissao(modulo: string, acao = "ver") {
  const usuario = await exigirAdmin();

  if (!usuarioTemPermissaoAdmin(usuario, modulo, acao)) {
    throw new AdminPermissaoError("Acesso nao permitido para este perfil.");
  }

  return usuario;
}

export async function limparSessaoAdmin() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...getOpcoesCookieSessaoAdmin(),
    maxAge: 0,
  });
}
