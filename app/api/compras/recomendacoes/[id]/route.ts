import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  atualizarStatusRecomendacaoGerencial,
  serializarRecomendacaoGerencial,
} from "@/lib/financeiro/recomendacoes-gerenciais";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function exigirAcessoGeral() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }

  return null;
}

function texto(value: unknown) {
  return String(value ?? "").trim();
}

function dataOpcional(value: unknown) {
  const raw = texto(value);
  if (!raw) return null;

  const data = new Date(raw);
  return Number.isNaN(data.getTime()) ? null : data;
}

function revalidarGestao() {
  revalidatePath("/compras");
  revalidatePath("/compras/recomendacoes");
  revalidatePath("/compras/financeiro");
  revalidatePath("/compras/resultado");
  revalidatePath("/compras/reposicao");
  revalidatePath("/compras/intencao");
}

export async function PATCH(req: Request, context: RouteContext) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) return bloqueio;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const acao = texto(body.acao || body.status);

  if (!acao) {
    return NextResponse.json(
      { error: "Informe a acao da recomendacao." },
      { status: 400 }
    );
  }

  try {
    const recomendacao = await atualizarStatusRecomendacaoGerencial({
      id,
      acao,
      resultadoObservado: texto(body.resultadoObservado) || null,
      observacao: texto(body.observacao) || null,
      prazoSugerido: dataOpcional(body.prazoSugerido),
    });

    revalidarGestao();

    return NextResponse.json({
      ok: true,
      recomendacao: serializarRecomendacaoGerencial(recomendacao),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar a recomendacao.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
