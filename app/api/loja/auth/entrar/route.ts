import { NextResponse } from "next/server";
import { pbkdf2Sync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  definirCookieSessaoCliente,
} from "@/lib/loja/cliente-sessao";
import {
  criarSessaoCliente,
  revogarSessaoClienteAtual,
} from "@/lib/loja/cliente-sessao.server";
import {
  respostaRateLimit,
  verificarRateLimit,
} from "@/lib/security/rate-limit";

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
    const manterConectado = body.manterConectado !== false;

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

    const limiteIp = verificarRateLimit({
      request: req,
      scope: "cliente-login-ip",
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });
    const limiteCredencial = verificarRateLimit({
      request: req,
      scope: "cliente-login-credencial",
      identifier: identificador,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!limiteIp.allowed) return respostaRateLimit(limiteIp);
    if (!limiteCredencial.allowed) return respostaRateLimit(limiteCredencial);

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

    await revogarSessaoClienteAtual();
    const sessao = await criarSessaoCliente({
      clienteId: cliente.id,
      manterConectado,
      userAgent: req.headers.get("user-agent"),
    });

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

    definirCookieSessaoCliente({
      response,
      token: sessao.token,
      manterConectado,
    });

    return response;
  } catch {
    console.error("Erro interno ao entrar na loja.");

    return NextResponse.json(
      { error: "Não foi possível concluir o login." },
      { status: 500 },
    );
  }
}
