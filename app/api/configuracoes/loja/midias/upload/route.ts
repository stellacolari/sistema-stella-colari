import { NextRequest, NextResponse } from "next/server";
import {
  criarMidiaAssetDeArquivo,
  erroMidia,
  exigirAcessoMidia,
  normalizarTagsMidia,
  normalizarTextoMidia,
} from "@/lib/loja/midia-assets";

function getArquivos(formData: FormData) {
  return [
    ...formData.getAll("arquivos"),
    ...formData.getAll("arquivo"),
    ...formData.getAll("file"),
    ...formData.getAll("imagem"),
  ].filter((item): item is File => item instanceof File && item.size > 0);
}

export async function POST(request: NextRequest) {
  const usuario = await exigirAcessoMidia("criar");

  if (!usuario) {
    return erroMidia("Acesso nao permitido.", 403);
  }

  try {
    const formData = await request.formData();
    const arquivos = getArquivos(formData);

    if (arquivos.length === 0) {
      return erroMidia("Nenhuma imagem foi enviada.");
    }

    if (arquivos.length > 24) {
      return erroMidia("Envie no maximo 24 imagens por vez.");
    }

    const origem = normalizarTextoMidia(formData.get("origem")) || "BUILDER";
    const pasta = normalizarTextoMidia(formData.get("pasta"));
    const alt = normalizarTextoMidia(formData.get("alt"));
    const tags = normalizarTagsMidia(formData.get("tags"));
    const assets = [];

    for (const file of arquivos) {
      assets.push(
        await criarMidiaAssetDeArquivo({
          file,
          usuario,
          origem,
          pasta,
          alt,
          tags,
        })
      );
    }

    return NextResponse.json({
      ok: true,
      total: assets.length,
      assets,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar imagens.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        erro: message,
      },
      { status: 400 }
    );
  }
}
