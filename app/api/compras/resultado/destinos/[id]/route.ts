import { NextResponse } from "next/server";
import {
  atualizarStatusDestino,
  obterOuCriarContaPrincipal,
  pagarDestinoProLabore,
} from "@/lib/financeiro/resultado";

function texto(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const acao = texto(body.acao).toUpperCase();

    if (acao === "APROVAR") {
      const destino = await atualizarStatusDestino({
        destinoId: id,
        statusPagamento: "APROVADO",
      });

      return NextResponse.json({ ok: true, destino });
    }

    if (acao === "CANCELAR") {
      const destino = await atualizarStatusDestino({
        destinoId: id,
        statusPagamento: "CANCELADO",
      });

      return NextResponse.json({ ok: true, destino });
    }

    if (acao === "PAGAR") {
      const contaPadrao = await obterOuCriarContaPrincipal();
      const destino = await pagarDestinoProLabore({
        destinoId: id,
        contaId: texto(body.contaId) || contaPadrao.id,
      });

      return NextResponse.json({ ok: true, destino });
    }

    return NextResponse.json(
      { error: "Acao invalida para o destino da apuracao." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar o destino da apuracao.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
