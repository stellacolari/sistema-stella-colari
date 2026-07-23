import { NextResponse } from "next/server";
import {
  buscarLojaAutocomplete,
  buscarLojaInteligente,
  type BuscaLojaTipo,
  type BuscaLojaModo,
} from "@/lib/loja/busca";
import {
  respostaRateLimit,
  verificarRateLimit,
} from "@/lib/security/rate-limit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").slice(0, 160);
    const limiteIp = verificarRateLimit({
      request: req,
      scope: "loja-busca-ip",
      limit: 240,
      windowMs: 60 * 1000,
    });
    const limiteTermo = verificarRateLimit({
      request: req,
      scope: "loja-busca-termo",
      identifier: q,
      limit: 30,
      windowMs: 60 * 1000,
    });

    if (!limiteIp.allowed) return respostaRateLimit(limiteIp);
    if (!limiteTermo.allowed) return respostaRateLimit(limiteTermo);

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
  } catch {
    console.error("Erro interno ao buscar na loja.");

    return NextResponse.json(
      { error: "Nao foi possivel realizar a busca." },
      { status: 500 }
    );
  }
}
