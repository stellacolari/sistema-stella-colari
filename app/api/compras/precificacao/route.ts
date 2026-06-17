import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  analisarPrecificacaoProdutos,
  serializarAnalisePrecificacao,
} from "@/lib/financeiro/precificacao-inteligente";

async function exigirAcessoGeral() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) return bloqueio;

  const analise = await analisarPrecificacaoProdutos();

  return NextResponse.json({
    ...analise,
    produtos: analise.produtos.map(serializarAnalisePrecificacao),
  });
}
