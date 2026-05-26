import { NextResponse } from "next/server";
import { pbkdf2Sync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_CLIENTE_ID = "stella_cliente_id";

function verificarSenha(senha: string, senhaHash: string | null | undefined) {
  if (!senhaHash) {
    return false;
  }

  const partes = senhaHash.split("$");

  if (partes.length !== 3 || partes[0] !== "pbkdf2") {
    return false;
  }

  const [, salt, hashSalvo] = partes;

  const hashCalculado = pbkdf2Sync(
    senha,
    salt,
    100000,
    64,
    "sha512"
  ).toString("hex");

  try {
    return timingSafeEqual(
      Buffer.from(hashCalculado, "hex"),
      Buffer.from(hashSalvo, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const identificador = String(body.identificador || "").trim();
    const identificadorNumerico = identificador.replace(/\D/g, "");
    const senha = String(body.senha || "");

    if (!identificador) {
      return NextResponse.json(
        { error: "Informe e-mail, telefone ou CPF." },
        { status: 400 }
      );
    }

    if (!senha) {
      return NextResponse.json(
        { error: "Informe sua senha." },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
      OR: [
        { email: identificador.toLowerCase() },
        { telefone: identificador },
        { telefone: identificadorNumerico },
        { documento: identificador },
        { documento: identificadorNumerico },
      ],
        status: {
          not: "NA_LIXEIRA",
        },
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        email: true,
        telefone: true,
        documento: true,
        senhaHash: true,
        cashbackSaldo: true,
      },
    });

    if (!cliente || !verificarSenha(senha, cliente.senhaHash)) {
      return NextResponse.json(
        { error: "Dados de acesso inválidos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      cliente: {
        id: cliente.id,
        codigo: cliente.codigo,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        documento: cliente.documento,
        cashbackSaldo: Number(cliente.cashbackSaldo || 0),
      },
    });

    response.cookies.set(COOKIE_CLIENTE_ID, cliente.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Erro ao entrar na loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao entrar na loja.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}