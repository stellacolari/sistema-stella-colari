import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  listarRecomendacoesGerenciais,
  serializarRecomendacaoGerencial,
} from "@/lib/financeiro/recomendacoes-gerenciais";

async function exigirAcessoGeral() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }

  return null;
}

function getAll(searchParams: URLSearchParams, key: string) {
  const values = searchParams.getAll(key).filter(Boolean);
  const single = searchParams.get(key);

  if (values.length > 0) return values;
  if (single) return single.split(",").map((item) => item.trim()).filter(Boolean);
  return undefined;
}

export async function GET(req: Request) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) return bloqueio;

  const url = new URL(req.url);
  const take = Number(url.searchParams.get("take") || 100);
  const recomendacoes = await listarRecomendacoesGerenciais({
    status: getAll(url.searchParams, "status"),
    tipo: getAll(url.searchParams, "tipo"),
    prioridade: getAll(url.searchParams, "prioridade"),
    origemTipo: getAll(url.searchParams, "origemTipo"),
    produtoId: url.searchParams.get("produtoId") || undefined,
    take: Number.isFinite(take) ? Math.min(Math.max(take, 1), 200) : 100,
  });

  return NextResponse.json({
    recomendacoes: recomendacoes.map(serializarRecomendacaoGerencial),
  });
}
