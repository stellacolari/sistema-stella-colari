import { NextResponse } from "next/server";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import {
  analisarPrecificacaoProdutos,
  serializarAnalisePrecificacao,
} from "@/lib/financeiro/precificacao-inteligente";

async function exigirAcessoModulo(modulo: string, acao = "ver") {
  try {
    await exigirAdminComPermissao(modulo, acao);
    return null;
  } catch {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }
}

export async function GET() {
  const bloqueio = await exigirAcessoModulo("precificacao", "ver");

  if (bloqueio) return bloqueio;

  const analise = await analisarPrecificacaoProdutos();

  return NextResponse.json({
    ...analise,
    produtos: analise.produtos.map(serializarAnalisePrecificacao),
  });
}
