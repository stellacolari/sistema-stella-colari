import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);
const HASH_PREFIXO = "scrypt";
const HASH_KEY_LENGTH = 64;

async function hashSenha(senha) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(senha, salt, HASH_KEY_LENGTH);

  return `${HASH_PREFIXO}:${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

function getEnvObrigatoria(nome) {
  const value = String(process.env[nome] || "").trim();

  if (!value) {
    throw new Error(`Defina ${nome}.`);
  }

  return value;
}

async function main() {
  const nome = getEnvObrigatoria("ADMIN_NOME");
  const email = getEnvObrigatoria("ADMIN_EMAIL").toLowerCase();
  const senha = getEnvObrigatoria("ADMIN_SENHA");
  const podeAtualizar = String(process.env.ADMIN_ATUALIZAR || "")
    .trim()
    .toUpperCase();

  if (senha.length < 8) {
    throw new Error("ADMIN_SENHA deve ter ao menos 8 caracteres.");
  }

  const existente = await prisma.usuarioAdmin.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existente && podeAtualizar !== "SIM") {
    throw new Error(
      "Já existe um admin com esse e-mail. Use ADMIN_ATUALIZAR=SIM para atualizar senha/perfil/ativo."
    );
  }

  const senhaHash = await hashSenha(senha);

  await prisma.usuarioAdmin.upsert({
    where: {
      email,
    },
    create: {
      nome,
      email,
      senhaHash,
      perfil: "ADMIN",
      ativo: true,
    },
    update: {
      nome,
      senhaHash,
      perfil: "ADMIN",
      ativo: true,
    },
  });

  console.log(`Admin ${email} criado/atualizado com sucesso.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
