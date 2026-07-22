import { NextRequest, NextResponse } from "next/server";
import {
  criarMidiaAssetDeArquivo,
  erroMidia,
  exigirAcessoMidia,
  normalizarTagsMidia,
  normalizarTextoMidia,
} from "@/lib/loja/midia-assets";
import { validarOrigemMutacao } from "@/lib/loja/conteudo/api-auth.server";

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
  if (!validarOrigemMutacao(request)) {
    return erroMidia("Origem da requisição inválida.", 403);
  }

  try {
    const formData = await request.formData();
    const arquivos = getArquivos(formData);

    if (arquivos.length === 0) {
      return erroMidia("Nenhuma imagem foi enviada.");
    }

    if (arquivos.length > 12) {
      return erroMidia("Envie no máximo 12 imagens por vez.");
    }

    const tamanhoTotal = arquivos.reduce((total, file) => total + file.size, 0);
    if (tamanhoTotal > 24 * 1024 * 1024) {
      return erroMidia("O lote de imagens deve ter no máximo 24 MB.");
    }

    const origemSolicitada = normalizarTextoMidia(formData.get("origem"));
    const origem = ["CONTEUDO_LOJA", "UPLOAD_MANUAL"].includes(origemSolicitada)
      ? origemSolicitada
      : "CONTEUDO_LOJA";
    const pasta = normalizarTextoMidia(formData.get("pasta"));
    const alt = normalizarTextoMidia(formData.get("alt"));
    const tags = normalizarTagsMidia(formData.get("tags"));
    const assets = [];
    const erros: Array<{ arquivo: number; erro: string }> = [];

    for (const [index, file] of arquivos.entries()) {
      try {
        assets.push(await criarMidiaAssetDeArquivo({
          file,
          usuario,
          origem,
          pasta,
          alt,
          tags,
        }));
      } catch (error) {
        erros.push({
          arquivo: index + 1,
          erro: error instanceof Error ? error.message : "Arquivo inválido.",
        });
      }
    }

    if (assets.length === 0) {
      return NextResponse.json(
        { ok: false, error: erros[0]?.erro || "Nenhuma imagem pôde ser enviada.", erros },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: erros.length === 0,
      total: assets.length,
      falhas: erros.length,
      assets,
      erros,
    }, { status: erros.length > 0 ? 207 : 200 });
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
