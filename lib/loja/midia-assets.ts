import "server-only";

import { put } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AdminPermissaoError,
  exigirAdminComPermissao,
} from "@/lib/auth/admin";

export const MIDIA_MIMES_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
export const MIDIA_LIMITE_IMAGEM_BYTES = 4 * 1024 * 1024;

type UsuarioLoja = Awaited<ReturnType<typeof exigirAdminComPermissao>>;

export function normalizarTextoMidia(value: unknown) {
  return String(value || "").trim();
}

export function erroMidia(message: string, status = 400) {
  return NextResponse.json({ error: message, erro: message }, { status });
}

export async function exigirAcessoMidia(acao: "ver" | "criar" | "editar" = "ver") {
  try {
    return await exigirAdminComPermissao("lojaOnline", acao);
  } catch (error) {
    if (error instanceof AdminPermissaoError) {
      return null;
    }

    throw error;
  }
}

export function gerarNomeSeguroMidia(nomeOriginal: string) {
  const extensao = nomeOriginal.split(".").pop()?.toLowerCase() || "jpg";
  const extensaoSegura = ["jpg", "jpeg", "png", "webp"].includes(extensao)
    ? extensao
    : "jpg";
  const nomeBase = nomeOriginal
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `loja/midias/${Date.now()}-${nomeBase || "imagem"}.${extensaoSegura}`;
}

export function validarArquivoImagemMidia(file: File) {
  if (!MIDIA_MIMES_IMAGEM.includes(file.type)) {
    return "Envie uma imagem JPG, PNG ou WebP.";
  }

  if (file.size > MIDIA_LIMITE_IMAGEM_BYTES) {
    return "A imagem deve ter no maximo 4 MB.";
  }

  return "";
}

export async function criarMidiaAssetDeArquivo({
  file,
  usuario,
  origem = "BUILDER",
  pasta = "",
  alt = "",
  tags = [],
}: {
  file: File;
  usuario: UsuarioLoja;
  origem?: string;
  pasta?: string;
  alt?: string;
  tags?: string[];
}) {
  const erro = validarArquivoImagemMidia(file);

  if (erro) {
    throw new Error(erro);
  }

  const providerKey = gerarNomeSeguroMidia(file.name);
  const blob = await put(providerKey, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: true,
  });

  return prisma.midiaAsset.create({
    data: {
      nome: normalizarTextoMidia(file.name.replace(/\.[^/.]+$/, "")) || file.name,
      nomeOriginal: file.name,
      url: blob.url,
      urlThumb: blob.url,
      tipo: "IMAGEM",
      mimeType: file.type,
      tamanhoBytes: file.size,
      alt: alt || normalizarTextoMidia(file.name.replace(/\.[^/.]+$/, "")),
      tagsJson: tags as Prisma.InputJsonValue,
      origem,
      provider: "VERCEL_BLOB",
      providerKey,
      pasta: pasta || null,
      status: "ATIVO",
      criadoPorId: usuario.id,
    },
  });
}

export function normalizarTagsMidia(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}
