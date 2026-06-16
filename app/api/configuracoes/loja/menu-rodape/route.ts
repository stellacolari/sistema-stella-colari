import { NextResponse } from "next/server";
import {
  buscarConfiguracaoMenuRodape,
  salvarConfiguracaoMenuRodape,
} from "@/lib/loja/menu-rodape-config";

export async function GET() {
  try {
    const configuracao = await buscarConfiguracaoMenuRodape();

    return NextResponse.json({ configuracao });
  } catch (error) {
    console.error("Erro ao carregar menu e rodapé:", error);

    return NextResponse.json(
      { error: "Erro ao carregar menu e rodapé." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const configuracao = await salvarConfiguracaoMenuRodape(body.configuracao);

    return NextResponse.json({ ok: true, configuracao });
  } catch (error) {
    console.error("Erro ao salvar menu e rodapé:", error);

    return NextResponse.json(
      { error: "Erro ao salvar menu e rodapé." },
      { status: 500 }
    );
  }
}
