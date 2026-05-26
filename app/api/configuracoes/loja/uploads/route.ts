import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

function gerarNomeSeguro(nomeOriginal: string) {
  const extensao = nomeOriginal.split(".").pop()?.toLowerCase() || "jpg";

  const extensaoSegura = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(
    extensao
  )
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const arquivo = formData.get("arquivo") || formData.get("file") || formData.get("imagem");

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        {
          erro: "Nenhuma imagem foi enviada.",
        },
        { status: 400 }
      );
    }

    if (!arquivo.type.startsWith("image/")) {
      return NextResponse.json(
        {
          erro: "O arquivo enviado precisa ser uma imagem.",
        },
        { status: 400 }
      );
    }

    const nomeArquivo = gerarNomeSeguro(arquivo.name);

    const blob = await put(nomeArquivo, arquivo, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      imagemUrl: blob.url,
      caminho: blob.url,
    });
  } catch (error) {
    console.error("Erro ao fazer upload da imagem da loja:", error);

    return NextResponse.json(
      {
        erro: "Erro ao fazer upload da imagem.",
      },
      { status: 500 }
    );
  }
}