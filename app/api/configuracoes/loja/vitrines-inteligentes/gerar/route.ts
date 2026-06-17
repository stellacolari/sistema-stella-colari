import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  gerarSugestoesVitrinesInteligentes,
  serializarVitrineInteligente,
} from "@/lib/loja/vitrines-inteligentes";

export async function POST() {
  try {
    const usuario = await exigirAdmin();

    if (usuario.perfil !== "ACESSO_GERAL") {
      return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
    }

    const resultado = await gerarSugestoesVitrinesInteligentes();

    return NextResponse.json({
      ok: true,
      produtosAnalisados: resultado.produtosAnalisados,
      candidatos: resultado.candidatos,
      criadas: resultado.criadas.map(serializarVitrineInteligente),
      atualizadas: resultado.atualizadas.map(serializarVitrineInteligente),
    });
  } catch (error) {
    console.error("Erro ao gerar vitrines inteligentes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao gerar vitrines inteligentes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
