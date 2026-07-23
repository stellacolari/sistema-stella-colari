import { NextResponse } from "next/server";
import { pbkdf2Sync, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { registrarConsentimentoWhatsappPublico } from "@/lib/clientes/consentimentos-cliente";
import { definirCookieSessaoCliente } from "@/lib/loja/cliente-sessao";
import {
  criarSessaoCliente,
  revogarSessaoClienteAtual,
} from "@/lib/loja/cliente-sessao.server";

function criarSenhaHash(senha: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(senha, salt, 100000, 64, "sha512").toString("hex");

  return `pbkdf2$${salt}$${hash}`;
}

function normalizarTexto(value: unknown) {
  return String(value ?? "").trim();
}

function normalizarEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizarCpf(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\D/g, "");
}

function normalizarTelefone(value: unknown) {
  return String(value ?? "").trim();
}

function gerarCodigoCliente(numero: number) {
  return `CL${String(numero).padStart(6, "0")}`;
}

async function gerarProximoCodigoCliente() {
  const ultimoCliente = await prisma.cliente.findFirst({
    orderBy: {
      criadoEm: "desc",
    },
    select: {
      codigo: true,
    },
  });

  let proximoNumero = 1;

  if (ultimoCliente?.codigo) {
    const numeroAtual = Number(ultimoCliente.codigo.replace("CL", ""));

    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  return gerarCodigoCliente(proximoNumero);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nome = normalizarTexto(body.nome);
    const telefone = normalizarTelefone(body.telefone);
    const email = normalizarEmail(body.email);
    const documento = normalizarCpf(body.documento);
    const senha = String(body.senha || "");
    const confirmarSenha = String(body.confirmarSenha || "");
    const consentimentoWhatsapp = body.consentimentoWhatsapp === true;
    const manterConectado = body.manterConectado !== false;

    if (!nome) {
      return NextResponse.json(
        { error: "Informe seu nome." },
        { status: 400 }
      );
    }

    if (!telefone) {
      return NextResponse.json(
        { error: "Informe seu telefone/WhatsApp." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Informe seu e-mail." },
        { status: 400 }
      );
    }

    if (!documento) {
      return NextResponse.json(
        { error: "Informe seu CPF." },
        { status: 400 }
      );
    }

    if (documento.length !== 11) {
      return NextResponse.json(
        { error: "Informe um CPF válido com 11 dígitos." },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (senha !== confirmarSenha) {
      return NextResponse.json(
        { error: "As senhas não conferem." },
        { status: 400 }
      );
    }

    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { telefone },
          { email },
          { documento },
        ],
      },
      select: {
        id: true,
      },
    });

    if (clienteExistente) {
      return NextResponse.json(
        {
          error: "Já existe uma conta com este telefone, e-mail ou CPF.",
        },
        { status: 400 }
      );
    }

    const codigo = await gerarProximoCodigoCliente();

    const cliente = await prisma.cliente.create({
      data: {
        codigo,
        nome,
        telefone,
        email,
        documento,
        tipoCliente: "ONLINE",
        status: "NOVO",
        senhaHash: criarSenhaHash(senha),
        cashbackSaldo: 0,
        origemCadastro: "LOJA_ONLINE",
        observacoes: "Cliente criado pela área da loja online.",
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        email: true,
        telefone: true,
        documento: true,
        cashbackSaldo: true,
        tipoCliente: true,
      },
    });

    if (consentimentoWhatsapp) {
      try {
        await registrarConsentimentoWhatsappPublico({
          clienteId: cliente.id,
          origem: "CADASTRO",
        });
      } catch (error) {
        console.error(
          "Erro ao registrar consentimento publico no cadastro:",
          error
        );
      }
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
        ...cliente,
        cashbackSaldo: Number(cliente.cashbackSaldo || 0),
      },
    });

    definirCookieSessaoCliente({
      response,
      token: sessao.token,
      manterConectado,
    });

    return response;
  } catch (error) {
    console.error("Erro ao criar conta na loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao criar conta.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
