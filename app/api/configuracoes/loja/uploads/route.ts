import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const LIMITE_IMAGEM_BYTES = 4 * 1024 * 1024;
const LIMITE_VIDEO_BYTES = 15 * 1024 * 1024;

const EXTENSOES_IMAGEM = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
const EXTENSOES_VIDEO = ["mp4", "webm"];
const MIMES_IMAGEM = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const MIMES_VIDEO = ["video/mp4", "video/webm"];

function gerarNomeSeguro(nomeOriginal: string) {
  const extensao = nomeOriginal.split(".").pop()?.toLowerCase() || "jpg";

  const extensaoSegura = [...EXTENSOES_IMAGEM, ...EXTENSOES_VIDEO].includes(extensao)
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

  return `loja/${Date.now()}-${nomeBase || "imagem"}.${extensaoSegura}`;
}

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json(
    {
      erro: mensagem,
      error: mensagem,
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const arquivo = formData.get("arquivo") || formData.get("file") || formData.get("imagem");

    if (!(arquivo instanceof File)) {
      return respostaErro("Nenhum arquivo foi enviado.");
    }

    const tipoSolicitado = String(formData.get("tipoMidia") || "").toUpperCase();
    const isImagem = MIMES_IMAGEM.includes(arquivo.type);
    const isVideo = MIMES_VIDEO.includes(arquivo.type);

    if (tipoSolicitado === "VIDEO" && !isVideo) {
      return respostaErro("Envie um vídeo em MP4 ou WebM.");
    }

    if (tipoSolicitado === "IMAGEM" && !isImagem) {
      return respostaErro("Envie uma imagem JPG, PNG, WebP, GIF ou SVG.");
    }

    if (!isImagem && !isVideo) {
      return respostaErro(
        "Envie uma imagem JPG, PNG, WebP, GIF ou SVG, ou um vídeo MP4/WebM."
      );
    }

    if (isImagem && arquivo.size > LIMITE_IMAGEM_BYTES) {
      return respostaErro("A imagem deve ter no máximo 4 MB.");
    }

    if (isVideo && arquivo.size > LIMITE_VIDEO_BYTES) {
      return respostaErro("O vídeo deve ter no máximo 15 MB.");
    }

    const nomeArquivo = gerarNomeSeguro(arquivo.name);

    const blob = await put(nomeArquivo, arquivo, {
      access: "public",
      contentType: arquivo.type,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      imagemUrl: blob.url,
      videoUrl: blob.url,
      caminho: blob.url,
      tipoMidia: isVideo ? "VIDEO" : "IMAGEM",
    });
  } catch (error) {
    console.error("Erro ao fazer upload de mídia da loja:", error);

    return NextResponse.json(
      {
        erro: "Erro ao fazer upload do arquivo.",
        error: "Erro ao fazer upload do arquivo.",
      },
      { status: 500 }
    );
  }
}
