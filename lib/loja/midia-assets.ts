import "server-only";

import { del, put } from "@vercel/blob";
import sharp, { type Metadata } from "sharp";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AdminPermissaoError,
  exigirAdminComPermissao,
} from "@/lib/auth/admin";

export const MIDIA_MIMES_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
export const MIDIA_LIMITE_IMAGEM_BYTES = 4 * 1024 * 1024;
export const MIDIA_LIMITE_PIXELS = 40_000_000;

type UsuarioLoja = Awaited<ReturnType<typeof exigirAdminComPermissao>>;

export function normalizarTextoMidia(value: unknown) {
  return String(value || "").trim();
}

export function erroMidia(message: string, status = 400) {
  return NextResponse.json({ error: message, erro: message }, { status });
}

export async function exigirAcessoMidia(
  acao: "ver" | "criar" | "editar" | "excluir" = "ver",
) {
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

const MIME_POR_FORMATO: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function inspecionarArquivoImagemMidia(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  let metadata: Metadata;

  try {
    metadata = await sharp(buffer, { limitInputPixels: MIDIA_LIMITE_PIXELS }).metadata();
  } catch {
    throw new Error("O arquivo enviado não é uma imagem válida.");
  }

  const mimeReal = metadata.format ? MIME_POR_FORMATO[metadata.format] : "";
  if (!mimeReal || mimeReal !== file.type) {
    throw new Error("O conteúdo da imagem não corresponde ao formato informado.");
  }

  if (!metadata.width || !metadata.height) {
    throw new Error("Não foi possível identificar as dimensões da imagem.");
  }

  if (metadata.width * metadata.height > MIDIA_LIMITE_PIXELS) {
    throw new Error("A imagem excede o limite seguro de resolução.");
  }

  return { buffer, metadata, mimeReal };
}

export async function criarMidiaAssetDeArquivo({
  file,
  usuario,
  origem = "CONTEUDO_LOJA",
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

  const { buffer, metadata, mimeReal } =
    await inspecionarArquivoImagemMidia(file);
  const providerKey = gerarNomeSeguroMidia(file.name);
  const blob = await put(providerKey, buffer, {
    access: "public",
    contentType: mimeReal,
    addRandomSuffix: true,
  });
  let thumbUrl = "";

  try {
    const thumbBuffer = await sharp(buffer, { limitInputPixels: MIDIA_LIMITE_PIXELS })
      .rotate()
      .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const thumb = await put(`${providerKey}.thumb.webp`, thumbBuffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: true,
    });
    thumbUrl = thumb.url;

    return await prisma.midiaAsset.create({
      data: {
        nome: normalizarTextoMidia(file.name.replace(/\.[^/.]+$/, "")) || file.name,
        nomeOriginal: file.name,
        url: blob.url,
        urlThumb: thumb.url,
        tipo: "IMAGEM",
        mimeType: mimeReal,
        tamanhoBytes: file.size,
        largura: metadata.width,
        altura: metadata.height,
        alt: alt || null,
        tagsJson: tags as Prisma.InputJsonValue,
        origem,
        provider: "VERCEL_BLOB",
        providerKey,
        pasta: pasta || null,
        status: "ATIVO",
        criadoPorId: usuario.id,
      },
    });
  } catch (error) {
    await del([blob.url, thumbUrl].filter(Boolean)).catch(() => undefined);
    throw error;
  }
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
