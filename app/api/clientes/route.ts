import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function gerarCodigoCliente(numero: number) {
  return `C${String(numero).padStart(6, "0")}`;
}

function limparDocumento(valor: string) {
  return valor.replace(/\D/g, "").trim();
}

function limparTelefone(valor: string) {
  return valor.replace(/\D/g, "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = String(body.nome || "").trim();
    const telefone = String(body.telefone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const documento = String(body.documento || "").trim();
    const tipoCliente = String(body.tipoCliente || "PESSOA FÍSICA").trim();
    const observacoes = String(body.observacoes || "").trim();

    if (!nome) {
      return NextResponse.json(
        { error: "Nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!telefone) {
      return NextResponse.json(
        { error: "Telefone/WhatsApp é obrigatório." },
        { status: 400 }
      );
    }

    if (!documento) {
      return NextResponse.json(
        { error: "Documento é obrigatório." },
        { status: 400 }
      );
    }

    if (!tipoCliente) {
      return NextResponse.json(
        { error: "Tipo de cliente é obrigatório." },
        { status: 400 }
      );
    }

    const telefoneLimpo = limparTelefone(telefone);
    const documentoLimpo = limparDocumento(documento);

    if (!telefoneLimpo) {
      return NextResponse.json(
        { error: "Telefone/WhatsApp é obrigatório." },
        { status: 400 }
      );
    }

    if (!documentoLimpo) {
      return NextResponse.json(
        { error: "Documento é obrigatório." },
        { status: 400 }
      );
    }

    const clienteDuplicado = await prisma.cliente.findFirst({
      where: {
        OR: [
          ...(telefoneLimpo ? [{ telefone: telefoneLimpo }] : []),
          { documento: documentoLimpo },
          ...(email ? [{ email }] : []),
        ],
      },
      select: {
        id: true,
      },
    });

    if (clienteDuplicado) {
      return NextResponse.json(
        { error: "Já existe um cliente com esse telefone, documento ou email." },
        { status: 409 }
      );
    }

    const ultimoCliente = await prisma.cliente.findFirst({
      orderBy: { criadoEm: "desc" },
      select: { codigo: true },
    });

    let proximoNumero = 1;

    if (ultimoCliente?.codigo) {
      const numeroAtual = Number(ultimoCliente.codigo.replace("C", ""));

      if (!Number.isNaN(numeroAtual)) {
        proximoNumero = numeroAtual + 1;
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        codigo: gerarCodigoCliente(proximoNumero),
        nome,
        telefone: telefoneLimpo,
        email: email || null,
        documento: documentoLimpo,
        tipoCliente,
        observacoes: observacoes || null,
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        documento: true,
      },
    });

    return NextResponse.json({ cliente }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);

    return NextResponse.json(
      { error: "Erro ao cadastrar cliente." },
      { status: 500 }
    );
  }
}
