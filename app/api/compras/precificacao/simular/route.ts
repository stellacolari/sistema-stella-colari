import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import { simularDescontoProduto } from "@/lib/financeiro/precificacao-inteligente";

async function exigirAcessoGeral() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }

  return null;
}

function numero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(req: Request) {
  const bloqueio = await exigirAcessoGeral();

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
