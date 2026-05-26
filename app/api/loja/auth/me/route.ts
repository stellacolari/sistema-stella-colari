import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_CLIENTE_ID = "stella_cliente_id";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const clienteId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";

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
  } catch (error) {
    console.error("Erro ao buscar cliente logado:", error);

    return NextResponse.json(
      { error: "Erro ao buscar cliente logado." },
      { status: 500 }
    );
  }
}