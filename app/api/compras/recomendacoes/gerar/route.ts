import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import {
  gerarRecomendacoesGerenciais,
  serializarRecomendacaoGerencial,
} from "@/lib/financeiro/recomendacoes-gerenciais";

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

function revalidarGestao() {
  revalidatePath("/compras");
  revalidatePath("/compras/recomendacoes");
  revalidatePath("/compras/financeiro");
  revalidatePath("/compras/resultado");
  revalidatePath("/compras/reposicao");
  revalidatePath("/compras/intencao");
}

export async function POST(req: Request) {
  const bloqueio = await exigirAcessoModulo("recomendacoes", "executar");

  if (bloqueio) return bloqueio;

  const body = await req.json().catch(() => ({}));
  const resultado = await gerarRecomendacoesGerenciais({
    mes: numero(body.mes),
    ano: numero(body.ano),
  });

  revalidarGestao();

  return NextResponse.json({
    ok: true,
    periodoReferencia: resultado.periodoReferencia,
    candidatos: resultado.candidatos,
    criadas: resultado.criadas.map(serializarRecomendacaoGerencial),
    atualizadas: resultado.atualizadas.map(serializarRecomendacaoGerencial),
    totalAbertas: resultado.totalAbertas,
    porTipo: resultado.porTipo,
  });
}
