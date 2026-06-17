import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import {
  gerarCampanhaAPartirDeRecomendacao,
  gerarCampanhasComerciais,
  serializarCampanhaComercial,
} from "@/lib/loja/campanhas-comerciais";

async function exigirAcessoModulo(modulo: string, acao = "ver") {
  try {
    await exigirAdminComPermissao(modulo, acao);
    return null;
  } catch {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }
}

function revalidarGestao() {
  revalidatePath("/compras");
  revalidatePath("/compras/campanhas");
  revalidatePath("/compras/recomendacoes");
  revalidatePath("/compras/financeiro");
  revalidatePath("/compras/reposicao");
  revalidatePath("/compras/intencao");
}

export async function POST(req: Request) {
  const bloqueio = await exigirAcessoModulo("campanhas", "executar");

  if (bloqueio) return bloqueio;

  const body = await req.json().catch(() => ({}));

  if (body.recomendacaoId) {
    const resultado = await gerarCampanhaAPartirDeRecomendacao(
      String(body.recomendacaoId)
    );

    revalidarGestao();

    return NextResponse.json({
      ok: true,
      criada: resultado.criada,
      campanha: serializarCampanhaComercial(resultado.campanha),
    });
  }

  const resultado = await gerarCampanhasComerciais();

  revalidarGestao();

  return NextResponse.json({
    ok: true,
    candidatos: resultado.candidatos,
    criadas: resultado.criadas.map(serializarCampanhaComercial),
    existentes: resultado.existentes.map(serializarCampanhaComercial),
    totalAbertas: resultado.totalAbertas,
    porTipo: resultado.porTipo,
  });
}
