import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminGeral } from "@/lib/auth/admin";
import { normalizarPermissoes } from "@/lib/permissoes/perfis";

function codigoPerfil(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export async function GET() {
  try {
    await exigirAdminGeral();
    const [perfis, usuarios] = await Promise.all([
      prisma.perfilAdministrativo.findMany({
        orderBy: [{ tipoBase: "asc" }, { nome: "asc" }],
        include: {
          usuarios: {
            select: { id: true, nome: true, email: true, perfil: true, ativo: true },
            orderBy: { nome: "asc" },
          },
          _count: { select: { regrasNotificacao: true } },
        },
      }),
      prisma.usuarioAdmin.findMany({
        select: { id: true, nome: true, email: true, perfil: true, perfilAdministrativoId: true, ativo: true },
        orderBy: { nome: "asc" },
      }),
    ]);

    return NextResponse.json({ perfis, usuarios });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Acesso nao permitido." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await exigirAdminGeral();
    const body = await request.json().catch(() => ({}));
    const nome = String(body.nome || "").trim();

    if (!nome) {
      return NextResponse.json({ error: "Informe o nome do perfil." }, { status: 400 });
    }

    const codigo = String(body.codigo || codigoPerfil(nome)).trim().toUpperCase();
    const perfil = await prisma.perfilAdministrativo.create({
      data: {
        nome,
        codigo,
        descricao: String(body.descricao || "").trim() || null,
        tipoBase: String(body.tipoBase || "PERSONALIZADO").trim().toUpperCase(),
        ativo: body.ativo !== false,
        permissoesJson: normalizarPermissoes(body.permissoesJson || body.permissoes),
      },
    });

    return NextResponse.json({ perfil });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel criar o perfil." }, { status: 500 });
  }
}
