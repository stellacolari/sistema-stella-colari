
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const data: {
      titulo?: string | null;
      subtitulo?: string | null;
      linkUrl?: string | null;
      ordem?: number;
      ativo?: boolean;
    } = {};

    if ("titulo" in body) {
      data.titulo = String(body.titulo || "").trim() || null;
    }

    if ("subtitulo" in body) {
      data.subtitulo = String(body.subtitulo || "").trim() || null;
    }

    if ("linkUrl" in body) {
      data.linkUrl = String(body.linkUrl || "").trim() || null;
    }

    if ("ordem" in body) {
      const ordem = Number(body.ordem);
      data.ordem = Number.isFinite(ordem) ? ordem : 0;
    }

    if ("ativo" in body) {
      data.ativo = Boolean(body.ativo);
    }

    const banner = await prisma.bannerLoja.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, banner });
  } catch (error) {
    console.error("Erro ao atualizar banner:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao atualizar banner.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await prisma.bannerLoja.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir banner:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao excluir banner.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}