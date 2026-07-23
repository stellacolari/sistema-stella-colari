import "server-only";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  inspecionarArquivoImagemMidia,
  validarArquivoImagemMidia,
} from "@/lib/loja/midia-assets";

const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function salvarImagemLocalSegura(
  file: File,
  subdiretorio: string,
) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(subdiretorio)) {
    throw new Error("Destino de upload invalido.");
  }

  const erro = validarArquivoImagemMidia(file);
  if (erro) throw new Error(erro);

  const imagem = await inspecionarArquivoImagemMidia(file);
  const extensao = EXTENSAO_POR_MIME[imagem.mimeReal];
  if (!extensao) throw new Error("Formato de imagem nao permitido.");

  const raizUploads = path.resolve(process.cwd(), "public", "uploads");
  const pastaDestino = path.resolve(raizUploads, subdiretorio);

  if (!pastaDestino.startsWith(`${raizUploads}${path.sep}`)) {
    throw new Error("Destino de upload invalido.");
  }

  await mkdir(pastaDestino, { recursive: true });

  const nomeArquivo = `${randomUUID()}.${extensao}`;
  const caminhoDestino = path.join(pastaDestino, nomeArquivo);
  await writeFile(caminhoDestino, imagem.buffer);

  return `/uploads/${subdiretorio}/${nomeArquivo}`;
}
