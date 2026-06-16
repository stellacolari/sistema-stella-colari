import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  criarMovimentacaoCaixa,
  obterOuCriarContaPrincipal,
  registrarPagamentoCompraEstoque,
} from "@/lib/financeiro/resultado";

function texto(value: unknown) {
  return String(value ?? "").trim();
}

function numero(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function dataOpcional(value: unknown) {
  const text = texto(value);
  if (!text) return null;

  const data = new Date(text);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contaPadrao = await obterOuCriarContaPrincipal();
    const contaId = texto(body.contaId) || contaPadrao.id;
    const compraId = texto(body.compraId);

    if (compraId) {
      const movimento = await registrarPagamentoCompraEstoque({
        compraId,
        contaId,
        dataPagamento: dataOpcional(body.dataPagamento),
      });

      return NextResponse.json({ ok: true, movimento });
    }

    const valor = numero(body.valor);
    const tipo = texto(body.tipo) || "AJUSTE";
    const categoria = texto(body.categoria) || "AJUSTE_MANUAL";
    const descricao = texto(body.descricao);

    if (!descricao) {
      return NextResponse.json(
        { error: "Descricao da movimentacao e obrigatoria." },
        { status: 400 }
      );
    }

    if (valor === null || valor <= 0) {
      return NextResponse.json(
        { error: "Valor da movimentacao precisa ser maior que zero." },
        { status: 400 }
      );
    }

    const movimento = await criarMovimentacaoCaixa({
      contaId,
      tipo,
      categoria,
      descricao,
      valor,
      status: texto(body.status) || "PAGA",
      dataPrevista: dataOpcional(body.dataPrevista),
      dataEfetiva: dataOpcional(body.dataEfetiva) || new Date(),
      origemTipo: texto(body.origemTipo) || "AJUSTE_MANUAL",
      origemId: texto(body.origemId) || randomUUID(),
      observacoes: texto(body.observacoes) || null,
    });

    return NextResponse.json({ ok: true, movimento });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel registrar a movimentacao de caixa.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
