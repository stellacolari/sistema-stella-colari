import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nomeSeguroArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getExtensao(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return ext;
  }

  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";

  return "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("imagem");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Nenhum arquivo de imagem foi enviado." },
        { status: 400 }
      );
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "O arquivo enviado não é uma imagem válida." },
        { status: 400 }
      );
    }

    const extensao = getExtensao(file.name, file.type);

    if (!extensao) {
      return NextResponse.json(
        { error: "Use imagens JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 8 MB." },
        { status: 400 }
      );
    }

    const pastaUploads = path.join(process.cwd(), "public", "uploads", "loja");
    await mkdir(pastaUploads, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const nomeBase =
      nomeSeguroArquivo(path.basename(file.name, path.extname(file.name))) ||
      "imagem";

    const nomeArquivo = `${Date.now()}-${nomeBase}${extensao}`;
    const caminhoCompleto = path.join(pastaUploads, nomeArquivo);

    await writeFile(caminhoCompleto, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/loja/${nomeArquivo}`,
    });
  } catch (error) {
    console.error("Erro ao fazer upload de imagem da loja:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao fazer upload da imagem.";

    return NextResponse.json(
      {
        error: `Erro ao fazer upload da imagem: ${message}`,
      },
      { status: 500 }
    );
  }
}