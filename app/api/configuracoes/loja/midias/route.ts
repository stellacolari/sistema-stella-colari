import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroMidia, exigirAcessoMidia } from "@/lib/loja/midia-assets";

export async function GET(request: NextRequest) {
  const usuario = await exigirAcessoMidia("ver");

  if (!usuario) {
    return erroMidia("Acesso nao permitido.", 403);
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(48, Math.max(12, Number(searchParams.get("pageSize") || 24)));
  const busca = String(searchParams.get("q") || "").trim();
  const status = String(searchParams.get("status") || "ATIVO").trim();
  const pasta = String(searchParams.get("pasta") || "").trim();
  const tipo = String(searchParams.get("tipo") || "IMAGEM").trim();

  const where = {
    ...(status ? { status } : {}),
    ...(tipo ? { tipo } : {}),
    ...(pasta ? { pasta } : {}),
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" as const } },
            { nomeOriginal: { contains: busca, mode: "insensitive" as const } },
            { alt: { contains: busca, mode: "insensitive" as const } },
            { descricao: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total, pastas] = await Promise.all([
    prisma.midiaAsset.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            usosConteudo: true,
          },
        },
        usosConteudo: {
          take: 3,
          orderBy: { criadoEm: "desc" },
          select: {
            slot: true,
            escopo: true,
            documento: { select: { chave: true } },
          },
        },
      },
    }),
    prisma.midiaAsset.count({ where }),
    prisma.midiaAsset.findMany({
      where: {
        status: "ATIVO",
        pasta: {
          not: null,
        },
      },
      distinct: ["pasta"],
      select: {
        pasta: true,
      },
      orderBy: {
        pasta: "asc",
      },
    }),
  ]);

  return NextResponse.json(
    {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      pastas: pastas.map((item) => item.pasta).filter(Boolean),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
