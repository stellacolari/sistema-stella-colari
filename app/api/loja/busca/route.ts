import { NextResponse } from "next/server";
import {
  buscarLojaInteligente,
  type BuscaLojaTipo,
} from "@/lib/loja/busca";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const limite = Number(searchParams.get("limite") || 12);
    const tipo = (searchParams.get("tipo") || "todos") as BuscaLojaTipo;

    const resultado = await buscarLojaInteligente({
      q,
      limite,
      tipo,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar na loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao buscar na loja.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
