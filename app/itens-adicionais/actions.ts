"use server";

import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function gerarCodigoInterno(numero: number) {
  return `F${String(numero).padStart(6, "0")}`;
}

function nomeSeguroArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .toLowerCase();
}

async function salvarImagemBase64(
  imagemBase64: string | null,
  codigoInterno: string
): Promise<string | null> {
  if (!imagemBase64) return null;
  if (!imagemBase64.startsWith("data:image/")) return null;

  const pastaUploads = path.join(process.cwd(), "public", "uploads", "adicionais");
  await mkdir(pastaUploads, { recursive: true });

  const matches = imagemBase64.match(
    /^data:image\/(jpeg|jpg|png|webp);base64,([a-zA-Z0-9+/=]+)$/,
  );

  if (!matches) {
    throw new Error("Formato da imagem inválido.");
  }

  const tipoInformado = matches[1] === "jpg" ? "jpeg" : matches[1];
  const extensao =
    tipoInformado === "png"
      ? "png"
      : tipoInformado === "webp"
        ? "webp"
        : "jpg";
  const base64Data = matches[2];
  const nomeArquivo = nomeSeguroArquivo(`${codigoInterno}-${Date.now()}.${extensao}`);
  const caminhoCompleto = path.join(pastaUploads, nomeArquivo);

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.byteLength > 4 * 1024 * 1024) {
    throw new Error("A imagem deve ter no maximo 4 MB.");
  }

  const metadata = await sharp(buffer, {
    limitInputPixels: 40_000_000,
  }).metadata();

  if (
    metadata.format !== tipoInformado ||
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > 40_000_000
  ) {
    throw new Error("O conteudo da imagem enviada e invalido.");
  }

  await writeFile(caminhoCompleto, buffer);

  return `/uploads/adicionais/${nomeArquivo}`;
}

async function removerImagemAntiga(imagemUrl: string | null) {
  if (!imagemUrl) return;
  if (!imagemUrl.startsWith("/uploads/adicionais/")) return;

  const caminhoRelativo = imagemUrl.replace(/^\/+/, "");
  const caminhoCompleto = path.join(process.cwd(), "public", caminhoRelativo);
  const pastaPermitida = path.resolve(
    process.cwd(),
    "public",
    "uploads",
    "adicionais",
  );
  const caminhoResolvido = path.resolve(caminhoCompleto);

  if (!caminhoResolvido.startsWith(`${pastaPermitida}${path.sep}`)) return;

  try {
    await unlink(caminhoResolvido);
  } catch {
    // ignora se não encontrar
  }
}

export async function criarItemAdicional(formData: FormData) {
  await exigirAdminComPermissao("produtos", "editar");

  const nome = String(formData.get("nome") || "").trim();
  const codigoFornecedor = String(formData.get("codigoFornecedor") || "").trim();
  const linkCompra = String(formData.get("linkCompra") || "").trim();
  const custoBase = Number(String(formData.get("custoBase") || "0").replace(",", "."));
  const fornecedorPadrao = String(formData.get("fornecedorPadrao") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();
  const imagemCropData = String(formData.get("imagemCropData") || "").trim();

  if (!nome) {
    throw new Error("Nome do item adicional é obrigatório.");
  }

  if (!fornecedorPadrao) {
    throw new Error("Fornecedor padrão é obrigatório.");
  }

  if (custoBase <= 0) {
    throw new Error("Custo base deve ser maior que zero.");
  }

  const ultimoItem = await prisma.itemAdicional.findFirst({
    orderBy: { criadoEm: "desc" },
    select: { codigoInterno: true },
  });

  let proximoNumero = 1;

  if (ultimoItem?.codigoInterno) {
    const numeroAtual = Number(ultimoItem.codigoInterno.replace("F", ""));
    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  const codigoInterno = gerarCodigoInterno(proximoNumero);
  const imagemUrl = await salvarImagemBase64(imagemCropData || null, codigoInterno);

  await prisma.itemAdicional.create({
    data: {
      codigoInterno,
      codigoFornecedor: codigoFornecedor || null,
      nome,
      imagemUrl,
      linkCompra: linkCompra || null,
      custoBase,
      fornecedorPadrao,
      observacoes: observacoes || null,
    },
  });

  revalidatePath("/itens-adicionais");
  redirect("/itens-adicionais");
}

export async function atualizarItemAdicional(id: string, formData: FormData) {
  await exigirAdminComPermissao("produtos", "editar");

  const nome = String(formData.get("nome") || "").trim();
  const codigoFornecedor = String(formData.get("codigoFornecedor") || "").trim();
  const linkCompra = String(formData.get("linkCompra") || "").trim();
  const custoBase = Number(String(formData.get("custoBase") || "0").replace(",", "."));
  const fornecedorPadrao = String(formData.get("fornecedorPadrao") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();
  const imagemCropData = String(formData.get("imagemCropData") || "").trim();

  if (!nome) {
    throw new Error("Nome do item adicional é obrigatório.");
  }

  if (!fornecedorPadrao) {
    throw new Error("Fornecedor padrão é obrigatório.");
  }

  if (custoBase <= 0) {
    throw new Error("Custo base deve ser maior que zero.");
  }

  const itemAtual = await prisma.itemAdicional.findUnique({
    where: { id },
    select: {
      codigoInterno: true,
      imagemUrl: true,
    },
  });

  if (!itemAtual) {
    throw new Error("Item adicional não encontrado.");
  }

  let imagemUrl = itemAtual.imagemUrl;

  if (imagemCropData) {
    await removerImagemAntiga(itemAtual.imagemUrl);
    imagemUrl = await salvarImagemBase64(imagemCropData, itemAtual.codigoInterno);
  }

  await prisma.itemAdicional.update({
    where: { id },
    data: {
      codigoFornecedor: codigoFornecedor || null,
      nome,
      imagemUrl,
      linkCompra: linkCompra || null,
      custoBase,
      fornecedorPadrao,
      observacoes: observacoes || null,
    },
  });

  revalidatePath("/itens-adicionais");
  revalidatePath(`/itens-adicionais/${id}`);
  redirect("/itens-adicionais");
}

export async function alternarStatusItemAdicional(id: string, ativoAtual: boolean) {
  await exigirAdminComPermissao("produtos", "editar");

  await prisma.itemAdicional.update({
    where: { id },
    data: {
      ativo: !ativoAtual,
    },
  });

  revalidatePath("/itens-adicionais");
}
