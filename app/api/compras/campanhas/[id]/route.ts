import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  atualizarCampanhaComercial,
  serializarCampanhaComercial,
} from "@/lib/loja/campanhas-comerciais";

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

function revalidarGestao() {
  revalidatePath("/compras");
  revalidatePath("/compras/campanhas");
  revalidatePath("/compras/recomendacoes");
  revalidatePath("/compras/financeiro");
  revalidatePath("/compras/reposicao");
  revalidatePath("/compras/intencao");
}

export async function PATCH(req: Request, context: RouteContext) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) return bloqueio;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  try {
    const campanha = await atualizarCampanhaComercial({
      id,
      status: texto(body.status || body.acao),
      resultado: body.resultadoJson || body.resultado,
    });

    revalidarGestao();

    return NextResponse.json({
      ok: true,
      campanha: serializarCampanhaComercial(campanha),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar a campanha.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
