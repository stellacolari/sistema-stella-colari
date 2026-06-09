import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarSessaoAdmin, verificarSenha } from "@/lib/auth/admin";

function normalizarNext(value: unknown) {
  const next = String(value || "/pedidos").trim();

  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/api")) {
    return "/pedidos";
  }

  if (next === "/login") {
    return "/pedidos";
  }

  return next;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const redirectTo = normalizarNext(body.next);

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Informe e-mail e senha." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuarioAdmin.findUnique({
      where: {
        email,
      },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const senhaValida = await verificarSenha(senha, usuario.senhaHash);

    if (!senhaValida) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    await criarSessaoAdmin({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
    });

    await prisma.usuarioAdmin.update({
      where: {
        id: usuario.id,
      },
      data: {
        ultimoLoginEm: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      redirectTo,
    });
  } catch (error) {
    console.error("Erro ao fazer login administrativo:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao fazer login administrativo.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
