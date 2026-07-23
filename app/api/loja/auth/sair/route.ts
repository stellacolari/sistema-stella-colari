import { NextResponse } from "next/server";
import { limparCookiesSessaoCliente } from "@/lib/loja/cliente-sessao";
import { revogarSessaoClienteAtual } from "@/lib/loja/cliente-sessao.server";

export async function POST() {
  await revogarSessaoClienteAtual();
  const response = NextResponse.json({ ok: true });

  limparCookiesSessaoCliente(response);

  return response;
}
