import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminGeral } from "@/lib/auth/admin";
import { normalizarPermissoes } from "@/lib/permissoes/perfis";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await exigirAdminGeral();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const atual = await prisma.perfilAdministrativo.findUnique({
      where: { id },
      include: { _count: { select: { usuarios: true } } },
    });

    if (!atual) {
      return NextResponse.json({ error: "Perfil nao encontrado." }, { status: 404 });
    }

    if (atual.codigo === "ADMIN_GERAL" && body.ativo === false) {
      const outrosAdmins = await prisma.perfilAdministrativo.count({
        where: {
          id: { not: id },
          ativo: true,
          tipoBase: "ADMIN_GERAL",
        },
      });

      if (outrosAdmins === 0) {
        return NextResponse.json({ error: "Nao e permitido desativar o ultimo perfil Admin Geral." }, { status: 400 });
      }
    }

    const perfil = await prisma.perfilAdministrativo.update({
      where: { id },
      data: {
        nome: typeof body.nome === "string" && body.nome.trim() ? body.nome.trim() : undefined,
        descricao: typeof body.descricao === "string" ? body.descricao.trim() || null : undefined,
        tipoBase: typeof body.tipoBase === "string" ? body.tipoBase.trim().toUpperCase() : undefined,
        ativo: typeof body.ativo === "boolean" ? body.ativo : undefined,
        permissoesJson: body.permissoesJson || body.permissoes ? normalizarPermissoes(body.permissoesJson || body.permissoes) : undefined,
      },
    });

    if (Array.isArray(body.usuarioIds)) {
      const usuarioIds = body.usuarioIds.filter((item: unknown): item is string => typeof item === "string" && item.length > 0);
      await prisma.$transaction([
        prisma.usuarioAdmin.updateMany({
          where: { perfilAdministrativoId: id, id: { notIn: usuarioIds } },
          data: { perfilAdministrativoId: null },
        }),
        prisma.usuarioAdmin.updateMany({
          where: { id: { in: usuarioIds } },
          data: {
            perfilAdministrativoId: id,
            perfil: perfil.tipoBase === "VENDEDOR" ? "VENDEDOR" : "ACESSO_GERAL",
          },
        }),
      ]);
    }

    return NextResponse.json({ perfil });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel atualizar o perfil." }, { status: 500 });
  }
}
