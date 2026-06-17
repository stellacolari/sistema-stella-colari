import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import {
  avaliarImpactoRecomendacao,
  serializarImpactoRecomendacao,
} from "@/lib/financeiro/impacto-recomendacoes";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function POST(req: Request, context: RouteContext) {
  const bloqueio = await exigirAcessoModulo("recomendacoes", "executar");

  if (bloqueio) return bloqueio;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  try {
    const impacto = await avaliarImpactoRecomendacao({
      recomendacaoId: id,
      janelaDias: janela(body.janelaDias),
    });

    revalidarGestao();

    return NextResponse.json({
      ok: true,
      impacto: serializarImpactoRecomendacao(impacto),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel avaliar o impacto.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
