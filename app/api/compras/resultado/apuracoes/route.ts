import { NextResponse } from "next/server";
import { fecharApuracaoResultadoMensal } from "@/lib/financeiro/resultado";

function numero(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function texto(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mes = numero(body.mes);
    const ano = numero(body.ano);

    if (!mes || !ano) {
      return NextResponse.json(
        { error: "Mes e ano sao obrigatorios para fechar a apuracao." },
        { status: 400 }
      );
    }

    const apuracao = await fecharApuracaoResultadoMensal({
      mes,
      ano,
      observacoes: texto(body.observacoes) || null,
    });

    return NextResponse.json({ ok: true, apuracao });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel fechar a apuracao.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
