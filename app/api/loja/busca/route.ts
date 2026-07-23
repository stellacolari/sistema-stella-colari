import { NextResponse } from "next/server";
import {
  buscarLojaAutocomplete,
  buscarLojaInteligente,
  type BuscaLojaTipo,
  type BuscaLojaModo,
} from "@/lib/loja/busca";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").slice(0, 160);
    const limite = Number(searchParams.get("limite") || 12);
    const modo: BuscaLojaModo =
      searchParams.get("modo") === "autocomplete" ? "autocomplete" : "pagina";
    const tipo = (modo === "pagina"
      ? "produtos"
      : searchParams.get("tipo") || "produtos") as BuscaLojaTipo;

    if (modo === "autocomplete") {
      const resultado = await buscarLojaAutocomplete({ q });

      return NextResponse.json(resultado);
    }

    const resultado = await buscarLojaInteligente({
      q,
      limite,
      tipo,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar na loja:", error);

    return NextResponse.json(
      { error: "Nao foi possivel realizar a busca." },
      { status: 500 }
    );
  }
}
