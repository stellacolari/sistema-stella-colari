import { NextResponse } from "next/server";
import { buscarPedidoPublicoAutorizado } from "@/lib/loja/pedido-acesso.server";
import { resolverSessaoClienteToken } from "@/lib/loja/cliente-sessao.server";
import {
  respostaRateLimit,
  verificarRateLimit,
} from "@/lib/security/rate-limit";

function respostaGate(status: 204 | 404) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const codigo = String(body.codigo || "").trim();
    const clienteSessaoToken = String(body.clienteSessaoToken || "").trim();
    const access = String(body.access || "").trim();
    const tokenCookie = String(body.tokenCookie || "").trim();

    if (!codigo) {
      return respostaGate(404);
    }

    const limite = verificarRateLimit({
      request,
      scope: "loja-pedido-acesso",
      identifier: codigo,
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!limite.allowed) return respostaRateLimit(limite);

    const sessao = await resolverSessaoClienteToken(clienteSessaoToken);
    const pedido = await buscarPedidoPublicoAutorizado({
      codigo,
      clienteAutenticadoId: sessao?.clienteId ?? null,
      access,
      tokenCookie,
    });

    return respostaGate(pedido ? 204 : 404);
  } catch {
    return respostaGate(404);
  }
}
