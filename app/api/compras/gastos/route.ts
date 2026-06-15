import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  gerarCodigoLancamentoFinanceiro,
  montarPayloadLancamentoFinanceiro,
} from "@/lib/compras/lancamentos-financeiros";

export async function GET() {
  try {
    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: {
        status: {
          not: "NA_LIXEIRA",
        },
      },
      orderBy: [{ dataVencimento: "asc" }, { criadoEm: "desc" }],
    });

    return NextResponse.json({ ok: true, lancamentos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível listar os gastos.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resultado = montarPayloadLancamentoFinanceiro(body);

    if ("error" in resultado) {
      return NextResponse.json({ error: resultado.error }, { status: 400 });
    }

    const ultimoRegistro = await prisma.lancamentoFinanceiro.findFirst({
      orderBy: { criadoEm: "desc" },
      select: { codigo: true },
    });

    let proximoNumero = 1;

    if (ultimoRegistro?.codigo) {
      const numeroAtual = Number(ultimoRegistro.codigo.replace("GAS-", ""));

      if (!Number.isNaN(numeroAtual)) {
        proximoNumero = numeroAtual + 1;
      }
    }

    const lancamento = await prisma.lancamentoFinanceiro.create({
      data: {
        codigo: gerarCodigoLancamentoFinanceiro(proximoNumero),
        ...resultado.payload,
      },
    });

    return NextResponse.json({ ok: true, lancamento });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o gasto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
