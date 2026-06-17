import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";
import { serializarColecao } from "@/lib/loja/colecoes-inteligentes";

async function exigirAcessoColecoes() {
  const usuario = await exigirAdmin();
  if (
    usuario.perfil !== "ACESSO_GERAL" &&
    !usuarioTemPermissao(usuario, "lojaOnline", "editar") &&
    !usuarioTemPermissao(usuario, "configuracoes", "editar")
  ) {
    throw new Error("Acesso nao permitido para este perfil.");
  }
  return usuario;
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Acesso nao permitido." }, { status: 403 });
  }
}
