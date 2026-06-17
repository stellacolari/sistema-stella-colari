import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  listarImpactosRecomendacoes,
  serializarImpactoRecomendacao,
} from "@/lib/financeiro/impacto-recomendacoes";
import { serializarRecomendacaoGerencial } from "@/lib/financeiro/recomendacoes-gerenciais";

async function exigirAcessoGeral() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }

  return null;
}

function numero(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: Request) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) return bloqueio;

  const { searchParams } = new URL(req.url);
  const impactos = await listarImpactosRecomendacoes({
    status: searchParams.get("status") || undefined,
    tipo: searchParams.get("tipo") || undefined,
    recomendacaoId: searchParams.get("recomendacaoId") || undefined,
    janelaDias: numero(searchParams.get("janelaDias")),
    take: numero(searchParams.get("take")),
  });

  return NextResponse.json({
    impactos: impactos.map((impacto) => ({
      ...serializarImpactoRecomendacao(impacto),
      recomendacao: serializarRecomendacaoGerencial(impacto.recomendacao),
    })),
  });
}
