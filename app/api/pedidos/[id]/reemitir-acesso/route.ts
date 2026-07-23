import { NextResponse } from "next/server";
import {
  AdminPermissaoError,
  exigirPermissaoExecutarAcaoSensivelPedidoAdmin,
} from "@/lib/auth/admin";
import {
  PedidoReemissaoError,
  reemitirAcessoPedidoAnonimo,
  revogarAcessoPedidoAnonimo,
} from "@/lib/loja/pedido-reemissao.server";
import { criarUrlPedidoComAcesso } from "@/lib/loja/pedido-acesso";

const CONFIRMACAO_REEMISSAO = "REEMITIR_ACESSO_PEDIDOS_LEGADOS";
const CONFIRMACAO_REVOGACAO = "REVOGAR_ACESSO_PEDIDO_LEGADO";

function respostaSemCache(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function baseUrlPublica(request: Request) {
  const configurada = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();

  if (configurada) return configurada.replace(/\/$/, "");

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function statusErro(error: unknown) {
  if (error instanceof AdminPermissaoError) return 403;
  if (error instanceof PedidoReemissaoError) return 400;
  return 500;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await exigirPermissaoExecutarAcaoSensivelPedidoAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (String(body.confirmacao || "") !== CONFIRMACAO_REEMISSAO) {
      return respostaSemCache(
        { error: "Confirmacao explicita de reemissao ausente." },
        400,
      );
    }

    const resultado = await reemitirAcessoPedidoAnonimo({
      pedidoId: id,
      ator: {
        id: admin.id,
        nome: admin.nome,
      },
      motivo: String(body.motivo || ""),
    });
    const accessUrl = criarUrlPedidoComAcesso({
      baseUrl: baseUrlPublica(request),
      codigo: resultado.pedido.codigo,
      token: resultado.token,
    });

    return respostaSemCache({
      ok: true,
      pedido: resultado.pedido,
      accessUrl,
      criadoEm: resultado.criadoEm.toISOString(),
    });
  } catch (error) {
    if (
      !(error instanceof AdminPermissaoError) &&
      !(error instanceof PedidoReemissaoError)
    ) {
      console.error("Erro ao reemitir acesso de pedido anonimo:", error);
    }

    return respostaSemCache(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao reemitir acesso do pedido.",
      },
      statusErro(error),
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await exigirPermissaoExecutarAcaoSensivelPedidoAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (String(body.confirmacao || "") !== CONFIRMACAO_REVOGACAO) {
      return respostaSemCache(
        { error: "Confirmacao explicita de revogacao ausente." },
        400,
      );
    }

    const pedido = await revogarAcessoPedidoAnonimo({
      pedidoId: id,
      ator: {
        id: admin.id,
        nome: admin.nome,
      },
      motivo: String(body.motivo || ""),
    });

    return respostaSemCache({ ok: true, pedido });
  } catch (error) {
    if (
      !(error instanceof AdminPermissaoError) &&
      !(error instanceof PedidoReemissaoError)
    ) {
      console.error("Erro ao revogar acesso de pedido anonimo:", error);
    }

    return respostaSemCache(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao revogar acesso do pedido.",
      },
      statusErro(error),
    );
  }
}
