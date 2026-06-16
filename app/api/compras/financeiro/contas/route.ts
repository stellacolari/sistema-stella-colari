import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listarContasFinanceiras } from "@/lib/financeiro/resultado";

function texto(value: unknown) {
  return String(value ?? "").trim();
}

function numero(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export async function GET() {
  try {
    const contas = await listarContasFinanceiras();

    return NextResponse.json({ ok: true, contas });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel listar contas.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nome = texto(body.nome);
    const tipo = texto(body.tipo) || "OUTROS";

    if (!nome) {
      return NextResponse.json(
        { error: "Nome da conta financeira e obrigatorio." },
        { status: 400 }
      );
    }

    const conta = await prisma.contaFinanceira.create({
      data: {
        nome,
        tipo,
        saldoInicial: numero(body.saldoInicial),
        dataSaldoInicial: new Date(),
        observacoes: texto(body.observacoes) || null,
      },
    });

    return NextResponse.json({ ok: true, conta });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel criar a conta.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
