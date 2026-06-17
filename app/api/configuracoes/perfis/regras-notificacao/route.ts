import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminGeral } from "@/lib/auth/admin";

function dadosRegra(body: Record<string, unknown>) {
  return {
    tipoNotificacao: String(body.tipoNotificacao || "*").trim().toUpperCase(),
    categoria: String(body.categoria || "SISTEMA").trim().toUpperCase(),
    prioridadeMinima: String(body.prioridadeMinima || "INFO").trim().toUpperCase(),
    perfilId: typeof body.perfilId === "string" && body.perfilId ? body.perfilId : null,
    usuarioId: typeof body.usuarioId === "string" && body.usuarioId ? body.usuarioId : null,
    ativo: body.ativo !== false,
    canalInApp: body.canalInApp !== false,
    canalWhatsappFuturo: body.canalWhatsappFuturo === true,
    canalSmsFuturo: body.canalSmsFuturo === true,
    canalEmailFuturo: body.canalEmailFuturo === true,
  };
}

export async function GET() {
  try {
    await exigirAdminGeral();
    const regras = await prisma.regraNotificacaoPerfil.findMany({
      include: {
        perfil: { select: { id: true, nome: true, codigo: true, tipoBase: true, ativo: true } },
        usuario: { select: { id: true, nome: true, email: true, ativo: true } },
      },
      orderBy: [{ categoria: "asc" }, { tipoNotificacao: "asc" }, { criadoEm: "desc" }],
    });

    return NextResponse.json({ regras });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Acesso nao permitido." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await exigirAdminGeral();
    const body = await request.json().catch(() => ({}));
    const regra = await prisma.regraNotificacaoPerfil.create({
      data: dadosRegra(body),
    });

    return NextResponse.json({ regra });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel criar a regra." }, { status: 500 });
  }
}
