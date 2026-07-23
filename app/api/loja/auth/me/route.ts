import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterClienteAutenticadoId } from "@/lib/loja/cliente-sessao.server";

export async function GET() {
  try {
    const clienteId = await obterClienteAutenticadoId();

    if (!clienteId) {
      return NextResponse.json({ cliente: null });
    }

    const cliente = await prisma.cliente.findUnique({
      where: {
        id: clienteId,
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
        status: true,
      },
    });

    if (!cliente || cliente.status === "NA_LIXEIRA") {
      return NextResponse.json({ cliente: null });
    }

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        codigo: cliente.codigo,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        documento: cliente.documento,
        cashbackSaldo: Number(cliente.cashbackSaldo || 0),
        tipoCliente: cliente.tipoCliente,
      },
    });
  } catch {
    console.error("Erro interno ao buscar cliente logado.");

    return NextResponse.json(
      { error: "Erro ao buscar cliente logado." },
      { status: 500 }
    );
  }
}
