import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  adicionarPeriodoRecorrencia,
  extrairNumeroCodigoLancamentoFinanceiro,
  gerarCodigoLancamentoFinanceiro,
  intervaloDia,
  recorrenciaValida,
} from "@/lib/compras/lancamentos-financeiros";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const lancamento = await prisma.lancamentoFinanceiro.findUnique({
      where: { id },
    });

    if (!lancamento || lancamento.status === "NA_LIXEIRA") {
      return NextResponse.json(
        { error: "Lançamento não encontrado." },
        { status: 404 }
      );
    }

    if (lancamento.tipo !== "ASSINATURA") {
      return NextResponse.json(
        { error: "A próxima cobrança só pode ser gerada para assinaturas." },
        { status: 400 }
      );
    }

    if (!lancamento.recorrente) {
      return NextResponse.json(
        { error: "Esta assinatura não está marcada como recorrente." },
        { status: 400 }
      );
    }

    const recorrencia = recorrenciaValida(lancamento.recorrencia);

    if (!recorrencia) {
      return NextResponse.json(
        { error: "Informe uma recorrência mensal, trimestral ou anual." },
        { status: 400 }
      );
    }

    const baseVencimento =
      lancamento.dataVencimento ?? lancamento.dataCompetencia ?? new Date();
    const baseCompetencia =
      lancamento.dataCompetencia ?? lancamento.dataVencimento ?? new Date();
    const proximoVencimento = adicionarPeriodoRecorrencia(
      baseVencimento,
      recorrencia
    );
    const proximaCompetencia = adicionarPeriodoRecorrencia(
      baseCompetencia,
      recorrencia
    );
    const { inicio, fim } = intervaloDia(proximoVencimento);

    const cobrancaExistente = await prisma.lancamentoFinanceiro.findFirst({
      where: {
        id: { not: lancamento.id },
        status: { not: "NA_LIXEIRA" },
        tipo: lancamento.tipo,
        titulo: lancamento.titulo,
        fornecedorParceiro: lancamento.fornecedorParceiro,
        recorrencia,
        dataVencimento: {
          gte: inicio,
          lt: fim,
        },
      },
      select: { id: true },
    });

    if (cobrancaExistente) {
      return NextResponse.json(
        { error: "Já existe uma cobrança para o próximo vencimento." },
        { status: 409 }
      );
    }

    const ultimoRegistro = await prisma.lancamentoFinanceiro.findFirst({
      orderBy: { criadoEm: "desc" },
      select: { codigo: true },
    });
    const proximoNumero =
      extrairNumeroCodigoLancamentoFinanceiro(ultimoRegistro?.codigo ?? null) +
      1;

    const novaCobranca = await prisma.lancamentoFinanceiro.create({
      data: {
        codigo: gerarCodigoLancamentoFinanceiro(proximoNumero),
        tipo: lancamento.tipo,
        categoria: lancamento.categoria,
        titulo: lancamento.titulo,
        descricao: lancamento.descricao,
        fornecedorParceiro: lancamento.fornecedorParceiro,
        valorPrevisto: lancamento.valorPrevisto,
        valorReal: lancamento.valorReal,
        statusPagamento: "PENDENTE",
        statusOperacional: lancamento.statusOperacional,
        dataCompetencia: proximaCompetencia,
        dataVencimento: proximoVencimento,
        dataPagamento: null,
        recorrente: lancamento.recorrente,
        recorrencia,
        quantidadeParcelas: lancamento.quantidadeParcelas,
        parcelaAtual: lancamento.parcelaAtual,
        meioPagamento: lancamento.meioPagamento,
        observacoes: lancamento.observacoes,
        linkReferencia: lancamento.linkReferencia,
        anexoUrl: lancamento.anexoUrl,
        status: "ATIVO",
      },
    });

    return NextResponse.json({ ok: true, lancamento: novaCobranca });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a próxima cobrança.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
