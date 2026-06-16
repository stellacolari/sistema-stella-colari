import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  calcularResultadoMensal,
  listarContasFinanceiras,
  mesAnoAtual,
  montarCentralFinanceira,
  obterOuCriarRegraDistribuicaoAtiva,
  periodoFinanceiro,
} from "@/lib/financeiro/resultado";
import { montarInteligenciaGerencial } from "@/lib/financeiro/inteligencia-gerencial";
import ResultadoDistribuicaoClient, {
  type FinanceiroApuracao,
  type FinanceiroHistoricoItem,
  type FinanceiroResultadoCalculado,
} from "@/components/financeiro/ResultadoDistribuicaoClient";

export const metadata: Metadata = {
  title: "Resultado e Distribuicao | Plataforma Stella Colari",
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

function somaValores<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function serializarResultado(
  resultado: Awaited<ReturnType<typeof calcularResultadoMensal>>
): FinanceiroResultadoCalculado {
  return {
    ...resultado,
    periodoInicio: resultado.periodoInicio.toISOString(),
    periodoFim: resultado.periodoFim.toISOString(),
  };
}

function serializarApuracao(
  apuracao:
    | NonNullable<Awaited<ReturnType<typeof buscarApuracaoAtual>>>
    | Awaited<ReturnType<typeof buscarHistoricoApuracoes>>[number]
): FinanceiroApuracao {
  return {
    id: apuracao.id,
    codigo: apuracao.codigo,
    mes: apuracao.mes,
    ano: apuracao.ano,
    status: apuracao.status,
    receitaRecebida: Number(apuracao.receitaRecebida),
    custoProdutos: Number(apuracao.custoProdutos),
    custoEmbalagens: Number(apuracao.custoEmbalagens),
    gastosOperacionais: Number(apuracao.gastosOperacionais),
    comprasEstoqueCaixa: Number(apuracao.comprasEstoqueCaixa),
    resultadoBruto: Number(apuracao.resultadoBruto),
    lucroApuravel: Number(apuracao.lucroApuravel),
    caixaLiquido: Number(apuracao.caixaLiquido),
    fechadoEm: apuracao.fechadoEm ? apuracao.fechadoEm.toISOString() : null,
    destinos: apuracao.destinos.map((destino) => ({
      id: destino.id,
      tipo: destino.tipo,
      nome: destino.nome,
      percentual: Number(destino.percentual),
      valor: Number(destino.valor),
      statusPagamento: destino.statusPagamento,
      movimentacaoCaixaId: destino.movimentacaoCaixaId,
      pagoEm: destino.movimentacaoCaixa?.pagoEm
        ? destino.movimentacaoCaixa.pagoEm.toISOString()
        : null,
    })),
  };
}

async function buscarApuracaoAtual(mes: number, ano: number) {
  return prisma.apuracaoResultadoMensal.findUnique({
    where: {
      mes_ano: {
        mes,
        ano,
      },
    },
    include: {
      destinos: {
        include: {
          movimentacaoCaixa: true,
        },
        orderBy: { criadoEm: "asc" },
      },
    },
  });
}

async function buscarHistoricoApuracoes() {
  return prisma.apuracaoResultadoMensal.findMany({
    where: {
      status: "FECHADA",
    },
    orderBy: [{ ano: "desc" }, { mes: "desc" }],
    take: 12,
    include: {
      destinos: {
        include: {
          movimentacaoCaixa: true,
        },
        orderBy: { criadoEm: "asc" },
      },
    },
  });
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

export default async function ResultadoPage({ searchParams }: PageProps) {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/vendas/nova-v2");
  }

  const atual = mesAnoAtual();
  const params = await searchParams;
  const mes = numero(params.mes, atual.mes);
  const ano = numero(params.ano, atual.ano);
  const [
    regra,
    resultado,
    apuracaoAtual,
    historicoApuracoes,
    contas,
    historico,
    central,
  ] =
    await Promise.all([
      obterOuCriarRegraDistribuicaoAtiva(),
      calcularResultadoMensal(mes, ano),
      buscarApuracaoAtual(mes, ano),
      buscarHistoricoApuracoes(),
      listarContasFinanceiras(),
      montarHistorico(mes, ano),
      montarCentralFinanceira(mes, ano),
    ]);
  const periodo = periodoFinanceiro(mes, ano);
  const gastosVencidos = somaValores(
    central.lancamentosPendentes.filter(
      (lancamento) => lancamento.statusPagamento === "VENCIDO"
    ),
    (lancamento) => Number(lancamento.valorReal)
  );
  const comprasPendentesTotal = somaValores(
    central.comprasPendentes,
    (compra) => Number(compra.valorTotalFinal)
  );
  const proLaborePagoMes = somaValores(
    central.movimentos.filter(
      (movimento) =>
        movimento.status === "PAGA" &&
        movimento.categoria === "PRO_LABORE" &&
        (movimento.dataEfetiva || movimento.pagoEm || movimento.criadoEm) >= periodo.inicio &&
        (movimento.dataEfetiva || movimento.pagoEm || movimento.criadoEm) < periodo.fimExclusivo
    ),
    (movimento) => Number(movimento.valor)
  );
  const reservaAtual = somaValores(
    central.contas.filter((conta) =>
      `${conta.tipo} ${conta.nome}`.toLowerCase().includes("reserva")
    ),
    (conta) => conta.saldoAtual
  );
  const diagnostico = await montarInteligenciaGerencial({
    mes,
    ano,
    resultado,
    saldoGerencial: central.saldoGerencial,
    entradasMes: central.entradasMes,
    saidasMes: central.saidasMes,
    gastosPendentes: central.previsao.gastosPendentes,
    gastosVencidos,
    comprasPendentesTotal,
    comprasPendentesQuantidade: central.comprasPendentes.length,
    proLaboreAprovadoPendente: central.previsao.proLaborePendente,
    proLaborePagoMes,
    reservaAtual,
    historico,
  });

  return (
    <ResultadoDistribuicaoClient
      mes={resultado.mes}
      ano={resultado.ano}
      contas={contas.map((conta) => ({
        id: conta.id,
        nome: conta.nome,
        tipo: conta.tipo,
      }))}
      regra={{
        id: regra.id,
        nome: regra.nome,
        percentualEmpresa: Number(regra.percentualEmpresa),
        percentualProLabore: Number(regra.percentualProLabore),
        observacoes: regra.observacoes,
        destinos: regra.destinos.map((destino) => ({
          id: destino.id,
          tipo: destino.tipo,
          nome: destino.nome,
          percentual: Number(destino.percentual),
          ordem: destino.ordem,
          ativo: destino.ativo,
        })),
      }}
      resultado={serializarResultado(resultado)}
      apuracaoAtual={apuracaoAtual ? serializarApuracao(apuracaoAtual) : null}
      historicoApuracoes={historicoApuracoes.map(serializarApuracao)}
      historico={historico}
      diagnostico={diagnostico}
    />
  );
}
