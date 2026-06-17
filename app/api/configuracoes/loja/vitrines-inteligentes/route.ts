import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { serializarVitrineInteligente } from "@/lib/loja/vitrines-inteligentes";

export async function GET() {
  try {
    const usuario = await exigirAdmin();

    if (usuario.perfil !== "ACESSO_GERAL") {
      return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
    }

    const sugestoes = await prisma.vitrineInteligenteSugestao.findMany({
      orderBy: [{ criadoEm: "desc" }],
      take: 300,
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
      sugestoes: sugestoes.map(serializarVitrineInteligente),
    });
  } catch (error) {
    console.error("Erro ao listar vitrines inteligentes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao listar vitrines inteligentes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
