import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  erroMidia,
  exigirAcessoMidia,
  normalizarTagsMidia,
  normalizarTextoMidia,
} from "@/lib/loja/midia-assets";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const usuario = await exigirAcessoMidia("editar");

  if (!usuario) {
    return erroMidia("Acesso nao permitido.", 403);
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = normalizarTextoMidia(body.status);

  if (status && !["ATIVO", "ARQUIVADO"].includes(status)) {
    return erroMidia("Status invalido.");
  }

  const asset = await prisma.midiaAsset.update({
    where: { id },
    data: {
      ...(body.nome !== undefined
        ? { nome: normalizarTextoMidia(body.nome) || "Imagem sem nome" }
        : {}),
      ...(body.alt !== undefined ? { alt: normalizarTextoMidia(body.alt) } : {}),
      ...(body.descricao !== undefined
        ? { descricao: normalizarTextoMidia(body.descricao) || null }
        : {}),
      ...(body.pasta !== undefined
        ? { pasta: normalizarTextoMidia(body.pasta) || null }
        : {}),
      ...(body.tags !== undefined ? { tagsJson: normalizarTagsMidia(body.tags) } : {}),
      ...(status ? { status } : {}),
    },
  });

  return NextResponse.json({ ok: true, asset });
}
