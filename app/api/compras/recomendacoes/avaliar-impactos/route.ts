import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import {
  avaliarImpactoRecomendacoes,
  serializarImpactoRecomendacao,
} from "@/lib/financeiro/impacto-recomendacoes";

async function exigirAcessoModulo(modulo: string, acao = "ver") {
  try {
    await exigirAdminComPermissao(modulo, acao);
    return null;
  } catch {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }
}

function janela(value: unknown) {
  const parsed = Number(value);
  return [7, 14, 30].includes(parsed) ? parsed : 14;
}

function revalidarGestao() {
  revalidatePath("/compras/recomendacoes");
  revalidatePath("/compras/financeiro");
  revalidatePath("/compras/reposicao");
  revalidatePath("/compras/intencao");
}

export async function POST(req: Request) {
  const bloqueio = await exigirAcessoModulo("recomendacoes", "executar");

  if (bloqueio) return bloqueio;

  const body = await req.json().catch(() => ({}));
  const resultado = await avaliarImpactoRecomendacoes({
    janelaDias: janela(body.janelaDias),
  });

  revalidarGestao();

  return NextResponse.json({
    ok: true,
    avaliadas: resultado.avaliadas,
    porStatus: resultado.porStatus,
    impactos: resultado.impactos.map(serializarImpactoRecomendacao),
  });
}
