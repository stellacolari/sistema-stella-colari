import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  listarCampanhasComerciais,
  serializarCampanhaComercial,
} from "@/lib/loja/campanhas-comerciais";

async function exigirAcessoGeral() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 403 });
  }

  return null;
}

function getAll(searchParams: URLSearchParams, key: string) {
  const values = searchParams.getAll(key).filter(Boolean);
  const single = searchParams.get(key);

  if (values.length > 0) return values;
  if (single) return single.split(",").map((item) => item.trim()).filter(Boolean);
  return undefined;
}

export async function GET(req: Request) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) return bloqueio;

  const url = new URL(req.url);
  const take = Number(url.searchParams.get("take") || 200);
  const campanhas = await listarCampanhasComerciais({
    status: getAll(url.searchParams, "status"),
    tipo: getAll(url.searchParams, "tipo"),
    take: Number.isFinite(take) ? Math.min(Math.max(take, 1), 300) : 200,
  });

  return NextResponse.json({
    campanhas: campanhas.map(serializarCampanhaComercial),
  });
}
