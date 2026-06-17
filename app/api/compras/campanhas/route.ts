import { NextResponse } from "next/server";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import {
  listarCampanhasComerciais,
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

function getAll(searchParams: URLSearchParams, key: string) {
  const values = searchParams.getAll(key).filter(Boolean);
  const single = searchParams.get(key);

  if (values.length > 0) return values;
  if (single) return single.split(",").map((item) => item.trim()).filter(Boolean);
  return undefined;
}

export async function GET(req: Request) {
  const bloqueio = await exigirAcessoModulo("campanhas", "ver");

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
