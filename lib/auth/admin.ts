import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  assinarSessaoAdmin,
  getSessaoAdminMaxAge,
  lerSessaoAdminDeCookies,
} from "@/lib/auth/session";

const scryptAsync = promisify(scrypt);
const HASH_PREFIXO = "scrypt";
const HASH_KEY_LENGTH = 64;

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

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessaoAdminMaxAge(),
  });
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
    },
  });

  if (!usuario) {
    redirect("/login");
  }

  return usuario;
}

export async function limparSessaoAdmin() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
