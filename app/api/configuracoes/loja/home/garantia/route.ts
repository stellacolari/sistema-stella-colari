import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAVE_GARANTIA = "garantia-produto";

function limparTexto(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET() {
  try {
    const garantia = await prisma.lojaTextoInstitucional.findUnique({
      where: {
        chave: CHAVE_GARANTIA,
      },
    });

    return NextResponse.json({ garantia });
  } catch (error) {
    console.error("Erro ao buscar garantia da loja:", error);

    return NextResponse.json(
      { error: "Erro ao buscar garantia da loja." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const titulo = limparTexto(body.titulo) || "Garantia";
    const conteudo = limparTexto(body.conteudo);

    if (!conteudo) {
      return NextResponse.json(
        { error: "Informe o texto da garantia." },
        { status: 400 }
      );
    }

    const garantia = await prisma.lojaTextoInstitucional.upsert({
      where: {
        chave: CHAVE_GARANTIA,
      },
      create: {
        chave: CHAVE_GARANTIA,
        titulo,
        conteudo,
      },
      update: {
        titulo,
        conteudo,
      },
    });

    return NextResponse.json({ garantia });
  } catch (error) {
    console.error("Erro ao salvar garantia da loja:", error);

    return NextResponse.json(
      { error: "Erro ao salvar garantia da loja." },
      { status: 500 }
    );
  }
}