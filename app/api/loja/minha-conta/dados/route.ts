import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_CLIENTE_ID = "stella_cliente_id";

function normalizarTexto(value: unknown) {
  return String(value ?? "").trim();
}

function normalizarEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizarCpf(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizarCep(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const clienteId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";

    if (!clienteId) {
      return NextResponse.json(
        { error: "Cliente não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const nome = normalizarTexto(body.nome);
    const telefone = normalizarTexto(body.telefone);
    const email = normalizarEmail(body.email);
    const documento = normalizarCpf(body.documento);

    const cep = normalizarCep(body.cep);
    const rua = normalizarTexto(body.rua);
    const numero = normalizarTexto(body.numero);
    const complemento = normalizarTexto(body.complemento);
    const bairro = normalizarTexto(body.bairro);
    const cidade = normalizarTexto(body.cidade);
    const estado = normalizarTexto(body.estado).toUpperCase();

    if (!nome) {
      return NextResponse.json(
        { error: "Informe seu nome." },
        { status: 400 }
      );
    }

    if (!telefone) {
      return NextResponse.json(
        { error: "Informe seu telefone." },
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

    if (cep && cep.length !== 8) {
      return NextResponse.json(
        { error: "O CEP deve ter 8 dígitos." },
        { status: 400 }
      );
    }

    const clienteAtual = await prisma.cliente.findUnique({
      where: {
        id: clienteId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!clienteAtual || clienteAtual.status === "NA_LIXEIRA") {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const clienteDuplicado = await prisma.cliente.findFirst({
      where: {
        id: {
          not: clienteId,
        },
        OR: [{ telefone }, { email }, { documento }],
      },
      select: {
        id: true,
      },
    });

    if (clienteDuplicado) {
      return NextResponse.json(
        { error: "Já existe outra conta com este telefone, e-mail ou CPF." },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.update({
      where: {
        id: clienteId,
      },
      data: {
        nome,
        telefone,
        email,
        documento,
        cep: cep || null,
        rua: rua || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        telefone: true,
        email: true,
        documento: true,
        cep: true,
        rua: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
      },
    });

    return NextResponse.json({ ok: true, cliente });
  } catch (error) {
    console.error("Erro ao atualizar dados da conta:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar dados da conta.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}