import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  erroMidia,
  exigirAcessoMidia,
  normalizarTagsMidia,
  normalizarTextoMidia,
} from "@/lib/loja/midia-assets";
import {
  payloadDentroDoLimite,
  payloadJsonDentroDoLimite,
  validarOrigemMutacao,
} from "@/lib/loja/conteudo/api-auth.server";

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
  if (!validarOrigemMutacao(request)) {
    return erroMidia("Origem da requisicao invalida.", 403);
  }
  if (!payloadDentroDoLimite(request)) {
    return erroMidia("Conteudo excede o limite permitido.", 413);
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!payloadJsonDentroDoLimite(body)) {
    return erroMidia("Conteudo excede o limite permitido.", 413);
  }
  const status = normalizarTextoMidia(body.status);

  if (status && !["ATIVO", "ARQUIVADO"].includes(status)) {
    return erroMidia("Status invalido.");
  }

  if (status === "ARQUIVADO") {
    const podeExcluir = await exigirAcessoMidia("excluir");
    if (!podeExcluir) {
      return erroMidia("Acesso não permitido para arquivar mídia.", 403);
    }

    const usos = await prisma.lojaConteudoMidiaUso.findMany({
      where: { assetId: id },
      select: {
        escopo: true,
        slot: true,
        documento: {
          select: {
            chave: true,
          },
        },
      },
      take: 10,
    });

    if (usos.length > 0) {
      return NextResponse.json(
        {
          error: "A imagem está em uso e não pode ser arquivada.",
          usos: usos.map((uso) => ({
            documento: uso.documento.chave,
            slot: uso.slot,
            escopo: uso.escopo,
          })),
        },
        { status: 409 },
      );
    }
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
