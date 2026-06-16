import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  calcularResultadoMensal,
  mesAnoAtual,
  montarCentralFinanceira,
  periodoFinanceiro,
} from "@/lib/financeiro/resultado";
import CentralFinanceiraClient, {
  type CentralAlerta,
  type CentralCompraPendente,
  type CentralConta,
  type CentralDestinoProLabore,
  type CentralLancamentoPendente,
  type CentralMovimento,
} from "@/components/financeiro/CentralFinanceiraClient";
import type { FinanceiroHistoricoItem } from "@/components/financeiro/ResultadoDistribuicaoClient";

export const metadata: Metadata = {
  title: "Central Financeira | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    mes?: string;
    ano?: string;
  }>;
};

function numero(value: string | undefined, fallback: number) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function mesLabel(mes: number, ano: number) {
  return `${String(mes).padStart(2, "0")}/${String(ano).slice(-2)}`;
}

async function montarHistorico(mes: number, ano: number) {
  const itens: { mes: number; ano: number }[] = [];
  let cursorMes = mes;
  let cursorAno = ano;

  for (let index = 0; index < 6; index += 1) {
    itens.unshift({ mes: cursorMes, ano: cursorAno });
    cursorMes -= 1;
    if (cursorMes === 0) {
      cursorMes = 12;
      cursorAno -= 1;
    }
  }

  const historico: FinanceiroHistoricoItem[] = [];

  for (const item of itens) {
    const resultado = await calcularResultadoMensal(item.mes, item.ano);
    const periodo = periodoFinanceiro(item.mes, item.ano);
    const marketing = await prisma.lancamentoFinanceiro.aggregate({
      where: {
        status: {
          not: "NA_LIXEIRA",
        },
        statusPagamento: "PAGO",
        tipo: {
          in: ["MARKETING", "TRAFEGO_PAGO", "INFLUENCIADOR"],
        },
        dataPagamento: {
          gte: periodo.inicio,
          lt: periodo.fimExclusivo,
        },
      },
      _sum: {
        valorReal: true,
      },
    });

    historico.push({
      label: mesLabel(item.mes, item.ano),
      receita: resultado.receitaRecebida,
      lucro: resultado.lucroApuravel,
      caixa: resultado.caixaLiquido,
      gastos: resultado.gastosOperacionais,
      proLabore: resultado.proLaboreSugerido,
      marketing: Number(marketing._sum.valorReal || 0),
    });
  }

  return historico;
}

async function buscarGastosPorCategoria(mes: number, ano: number) {
  const periodo = periodoFinanceiro(mes, ano);
  const grupos = await prisma.lancamentoFinanceiro.groupBy({
    by: ["categoria"],
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
      statusPagamento: "PAGO",
      dataPagamento: {
        gte: periodo.inicio,
        lt: periodo.fimExclusivo,
      },
    },
    _sum: {
      valorReal: true,
    },
    orderBy: {
      _sum: {
        valorReal: "desc",
      },
    },
    take: 8,
  });

  return grupos.map((grupo) => ({
    categoria: grupo.categoria,
    total: Number(grupo._sum.valorReal || 0),
  }));
}

export default async function CentralFinanceiraPage({ searchParams }: PageProps) {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/vendas/nova-v2");
  }

  const atual = mesAnoAtual();
  const params = await searchParams;
  const mes = numero(params.mes, atual.mes);
  const ano = numero(params.ano, atual.ano);
  const [central, historico, gastosPorCategoria] = await Promise.all([
    montarCentralFinanceira(mes, ano),
    montarHistorico(mes, ano),
    buscarGastosPorCategoria(mes, ano),
  ]);

  return (
    <CentralFinanceiraClient
      mes={central.resultado.mes}
      ano={central.resultado.ano}
      contas={central.contas.map(
        (conta): CentralConta => ({
          id: conta.id,
          nome: conta.nome,
          tipo: conta.tipo,
          saldoAtual: conta.saldoAtual,
        })
      )}
      movimentos={central.movimentos.map(
        (movimento): CentralMovimento => ({
          id: movimento.id,
          codigo: movimento.codigo,
          contaNome: movimento.conta.nome,
          tipo: movimento.tipo,
          categoria: movimento.categoria,
          descricao: movimento.descricao,
          valor: Number(movimento.valor),
          status: movimento.status,
          dataEfetiva: movimento.dataEfetiva
            ? movimento.dataEfetiva.toISOString()
            : null,
          origemTipo: movimento.origemTipo,
        })
      )}
      saldoGerencial={central.saldoGerencial}
      entradasMes={central.entradasMes}
      saidasMes={central.saidasMes}
      lancamentosPendentes={central.lancamentosPendentes.map(
        (lancamento): CentralLancamentoPendente => ({
          id: lancamento.id,
          codigo: lancamento.codigo,
          tipo: lancamento.tipo,
          categoria: lancamento.categoria,
          titulo: lancamento.titulo,
          valorReal: Number(lancamento.valorReal),
          dataVencimento: lancamento.dataVencimento
            ? lancamento.dataVencimento.toISOString()
            : null,
          statusPagamento: lancamento.statusPagamento,
          statusOperacional: lancamento.statusOperacional,
          recorrente: lancamento.recorrente,
          recorrencia: lancamento.recorrencia,
          quantidadeParcelas: lancamento.quantidadeParcelas,
          parcelaAtual: lancamento.parcelaAtual,
          fornecedorParceiro: lancamento.fornecedorParceiro,
          valorPrevisto:
            lancamento.valorPrevisto === null
              ? null
              : Number(lancamento.valorPrevisto),
          dataCompetencia: lancamento.dataCompetencia
            ? lancamento.dataCompetencia.toISOString()
            : null,
          dataPagamento: lancamento.dataPagamento
            ? lancamento.dataPagamento.toISOString()
            : null,
          meioPagamento: lancamento.meioPagamento,
          observacoes: lancamento.observacoes,
          linkReferencia: lancamento.linkReferencia,
          descricao: lancamento.descricao,
        })
      )}
      comprasPendentes={central.comprasPendentes.map(
        (compra): CentralCompraPendente => ({
          id: compra.id,
          codigo: compra.codigo,
          fornecedor: compra.fornecedor,
          valorTotalFinal: Number(compra.valorTotalFinal),
          criadoEm: compra.criadoEm.toISOString(),
        })
      )}
      destinosProLaboreAprovados={central.destinosProLaboreAprovados.map(
        (destino): CentralDestinoProLabore => ({
          id: destino.id,
          nome: destino.nome,
          valor: Number(destino.valor),
          apuracaoCodigo: destino.apuracaoCodigo,
          mes: destino.mes,
          ano: destino.ano,
        })
      )}
      previsao={central.previsao}
      alertas={central.alertas.map(
        (alerta): CentralAlerta => ({
          tipo: alerta.tipo,
          severidade: alerta.severidade,
          titulo: alerta.titulo,
          descricao: alerta.descricao,
        })
      )}
      historico={historico}
      gastosPorCategoria={gastosPorCategoria}
    />
  );
}
