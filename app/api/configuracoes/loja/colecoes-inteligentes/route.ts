import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminPermissaoError, exigirAdminComPermissao } from "@/lib/auth/admin";
import { serializarColecao } from "@/lib/loja/colecoes-inteligentes";

async function exigirAcessoColecoes() {
  return exigirAdminComPermissao("lojaOnline", "ver");
}

export async function GET() {
  try {
    await exigirAcessoColecoes();
    const colecoes = await prisma.colecaoInteligente.findMany({
      include: {
        produtos: {
          where: { status: { not: "IGNORADO" } },
          include: {
            produto: {
              select: {
                id: true,
                codigoInterno: true,
                nome: true,
                imagemUrl: true,
                imagemHoverUrl: true,
                categoria: true,
                precoVenda: true,
              },
            },
          },
          orderBy: [{ fixado: "desc" }, { ordem: "asc" }, { score: "desc" }],
        },
      },
      orderBy: [{ status: "asc" }, { tipo: "asc" }, { nome: "asc" }],
    });

    return NextResponse.json({ colecoes: colecoes.map(serializarColecao) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel listar colecoes." },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
