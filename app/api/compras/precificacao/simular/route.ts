import { NextResponse } from "next/server";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { simularDescontoProduto } from "@/lib/financeiro/precificacao-inteligente";

async function exigirAcessoModulo(modulo: string, acao = "ver") {
  try {
    await exigirAdminComPermissao(modulo, acao);
    return null;
  } catch {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }
}

function numero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(req: Request) {
  const bloqueio = await exigirAcessoModulo("precificacao", "ver");

  if (bloqueio) return bloqueio;

  const body = await req.json().catch(() => ({}));
  const produtoId = String(body.produtoId || "").trim();

  if (!produtoId) {
    return NextResponse.json(
      { error: "Informe o produto para simular." },
      { status: 400 }
    );
  }

  try {
    const simulacao = await simularDescontoProduto({
      produtoId,
      descontoPercentual: numero(body.descontoPercentual),
      novoPreco: numero(body.novoPreco),
    });

    return NextResponse.json({ ok: true, simulacao });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel simular desconto.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
