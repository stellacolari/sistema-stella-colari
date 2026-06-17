import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  VITRINE_INTELIGENTE_STATUS,
  serializarVitrineInteligente,
} from "@/lib/loja/vitrines-inteligentes";

const STATUS_VALIDOS = new Set<string>(VITRINE_INTELIGENTE_STATUS);

function textoOpcional(value: unknown) {
  const parsed = String(value ?? "").trim();
  return parsed || null;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await exigirAdmin();

    if (usuario.perfil !== "ACESSO_GERAL") {
      return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const status = String(body.status || "").trim();

    if (status && !STATUS_VALIDOS.has(status)) {
      return NextResponse.json({ error: "Status invalido." }, { status: 400 });
    }

    const data: {
      status?: string;
      titulo?: string;
      subtitulo?: string | null;
      descricao?: string | null;
      justificativa?: string | null;
      risco?: string | null;
      acaoSugerida?: string | null;
      ignoradaEm?: Date | null;
      canceladaEm?: Date | null;
    } = {};

    if (status) {
      data.status = status;
      if (status === "IGNORADA") data.ignoradaEm = new Date();
      if (status === "CANCELADA") data.canceladaEm = new Date();
      if (status === "SUGERIDA" || status === "EM_REVISAO") {
        data.ignoradaEm = null;
        data.canceladaEm = null;
      }
    }

    if ("titulo" in body) data.titulo = String(body.titulo || "").trim();
    if ("subtitulo" in body) data.subtitulo = textoOpcional(body.subtitulo);
    if ("descricao" in body) data.descricao = textoOpcional(body.descricao);
    if ("justificativa" in body) data.justificativa = textoOpcional(body.justificativa);
    if ("risco" in body) data.risco = textoOpcional(body.risco);
    if ("acaoSugerida" in body) data.acaoSugerida = textoOpcional(body.acaoSugerida);

    const sugestao = await prisma.vitrineInteligenteSugestao.update({
      where: { id },
      data,
      include: {
        campanha: {
          select: { id: true, codigo: true, titulo: true, tipo: true, status: true },
        },
        recomendacao: {
          select: { id: true, codigo: true, titulo: true, status: true },
        },
        paginaDestino: {
          select: { id: true, titulo: true, slug: true, tipo: true },
        },
        blocoCriado: {
          select: { id: true, titulo: true, ativo: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      sugestao: serializarVitrineInteligente(sugestao),
    });
  } catch (error) {
    console.error("Erro ao atualizar vitrine inteligente:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar vitrine inteligente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
