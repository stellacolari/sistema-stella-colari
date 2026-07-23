import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  respostaRateLimit,
  verificarRateLimit,
} from "@/lib/security/rate-limit";
import {
  exigirAcessoMidia,
  inspecionarArquivoImagemMidia,
  validarArquivoImagemMidia,
} from "@/lib/loja/midia-assets";

const LIMITE_IMAGEM_BYTES = 4 * 1024 * 1024;
const LIMITE_VIDEO_BYTES = 15 * 1024 * 1024;

const MIMES_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const MIMES_VIDEO = ["video/mp4", "video/webm"];

async function inspecionarVideo(arquivo: File) {
  const cabecalho = new Uint8Array((await arquivo.slice(0, 16).arrayBuffer()));
  const isMp4 =
    arquivo.type === "video/mp4" &&
    cabecalho.length >= 12 &&
    String.fromCharCode(...cabecalho.slice(4, 8)) === "ftyp";
  const isWebm =
    arquivo.type === "video/webm" &&
    cabecalho.length >= 4 &&
    cabecalho[0] === 0x1a &&
    cabecalho[1] === 0x45 &&
    cabecalho[2] === 0xdf &&
    cabecalho[3] === 0xa3;

  if (!isMp4 && !isWebm) {
    throw new Error("O conteudo do video nao corresponde ao formato informado.");
  }
}

function gerarNomeSeguro(nomeOriginal: string, mime: string) {
  const extensaoSegura: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };

  const nomeBase = nomeOriginal
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `loja/${Date.now()}-${nomeBase || "arquivo"}.${
    extensaoSegura[mime] || "bin"
  }`;
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
    const usuario = await exigirAcessoMidia("criar");

    if (!usuario) {
      return respostaErro("Acesso nao permitido.", 403);
    }

    const limite = verificarRateLimit({
      request,
      scope: "admin-upload-loja",
      identifier: usuario.id,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    if (!limite.allowed) return respostaRateLimit(limite);

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
      return respostaErro("Envie uma imagem JPG, PNG ou WebP.");
    }

    if (!isImagem && !isVideo) {
      return respostaErro(
        "Envie uma imagem JPG, PNG ou WebP, ou um vídeo MP4/WebM."
      );
    }

    if (isImagem && arquivo.size > LIMITE_IMAGEM_BYTES) {
      return respostaErro("A imagem deve ter no máximo 4 MB.");
    }

    if (isVideo && arquivo.size > LIMITE_VIDEO_BYTES) {
      return respostaErro("O vídeo deve ter no máximo 15 MB.");
    }

    let conteudoUpload: File | Buffer = arquivo;
    let contentType = arquivo.type;

    if (isImagem) {
      const erroImagem = validarArquivoImagemMidia(arquivo);
      if (erroImagem) return respostaErro(erroImagem);

      const imagem = await inspecionarArquivoImagemMidia(arquivo);
      conteudoUpload = imagem.buffer;
      contentType = imagem.mimeReal;
    } else {
      await inspecionarVideo(arquivo);
    }

    const nomeArquivo = gerarNomeSeguro(arquivo.name, contentType);
    const blob = await put(nomeArquivo, conteudoUpload, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      imagemUrl: blob.url,
      videoUrl: blob.url,
      caminho: blob.url,
      tipoMidia: isVideo ? "VIDEO" : "IMAGEM",
    });
  } catch {
    console.error("Erro interno ao fazer upload de mídia da loja.");

    return NextResponse.json(
      {
        erro: "Erro ao fazer upload do arquivo.",
        error: "Erro ao fazer upload do arquivo.",
      },
      { status: 500 }
    );
  }
}
