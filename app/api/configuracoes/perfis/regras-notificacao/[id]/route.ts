import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminGeral } from "@/lib/auth/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await exigirAdminGeral();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const regra = await prisma.regraNotificacaoPerfil.update({
      where: { id },
      data: {
        tipoNotificacao: typeof body.tipoNotificacao === "string" ? body.tipoNotificacao.trim().toUpperCase() : undefined,
        categoria: typeof body.categoria === "string" ? body.categoria.trim().toUpperCase() : undefined,
        prioridadeMinima: typeof body.prioridadeMinima === "string" ? body.prioridadeMinima.trim().toUpperCase() : undefined,
        perfilId: typeof body.perfilId === "string" ? body.perfilId || null : undefined,
        usuarioId: typeof body.usuarioId === "string" ? body.usuarioId || null : undefined,
        ativo: typeof body.ativo === "boolean" ? body.ativo : undefined,
        canalInApp: typeof body.canalInApp === "boolean" ? body.canalInApp : undefined,
        canalWhatsappFuturo: typeof body.canalWhatsappFuturo === "boolean" ? body.canalWhatsappFuturo : undefined,
        canalSmsFuturo: typeof body.canalSmsFuturo === "boolean" ? body.canalSmsFuturo : undefined,
        canalEmailFuturo: typeof body.canalEmailFuturo === "boolean" ? body.canalEmailFuturo : undefined,
      },
    });

    return NextResponse.json({ regra });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel atualizar a regra." }, { status: 500 });
  }
}
