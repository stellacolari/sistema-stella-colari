import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  converterSugestaoEmBlocoRascunho,
  serializarVitrineInteligente,
} from "@/lib/loja/vitrines-inteligentes";

export async function POST(
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
    const paginaDestinoId = String(body.paginaDestinoId || "").trim() || null;
    const resultado = await converterSugestaoEmBlocoRascunho({
      sugestaoId: id,
      paginaDestinoId,
    });

    return NextResponse.json({
      ok: true,
      sugestao: serializarVitrineInteligente(resultado.sugestao),
      bloco: {
        id: resultado.bloco.id,
        titulo: resultado.bloco.titulo,
        ativo: resultado.bloco.ativo,
        paginaId: resultado.bloco.paginaId,
      },
      pagina: {
        id: resultado.pagina.id,
        titulo: resultado.pagina.titulo,
        slug: resultado.pagina.slug,
        tipo: resultado.pagina.tipo,
      },
      mensagem:
        "Bloco criado como rascunho/inativo. Revise e ative manualmente no editor antes de publicar.",
    });
  } catch (error) {
    console.error("Erro ao aplicar vitrine inteligente:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao aplicar vitrine inteligente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
