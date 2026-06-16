"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BanknoteArrowDown,
  BanknoteArrowUp,
  Boxes,
  CheckCircle2,
  Megaphone,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { FinanceiroHistoricoItem } from "@/components/financeiro/ResultadoDistribuicaoClient";
import type { DiagnosticoFinanceiro } from "@/lib/financeiro/inteligencia-gerencial";

export type CentralConta = {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual: number;
};

export type CentralMovimento = {
  id: string;
  codigo: string;
  contaNome: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  status: string;
  dataEfetiva: string | null;
  origemTipo: string | null;
};

export type CentralLancamentoPendente = {
  id: string;
  codigo: string;
  tipo: string;
  categoria: string;
  titulo: string;
  valorReal: number;
  dataVencimento: string | null;
  statusPagamento: string;
  statusOperacional: string;
  recorrente: boolean;
  recorrencia: string | null;
  quantidadeParcelas: number | null;
  parcelaAtual: number | null;
  fornecedorParceiro: string | null;
  valorPrevisto: number | null;
  dataCompetencia: string | null;
  dataPagamento: string | null;
  meioPagamento: string | null;
  observacoes: string | null;
  linkReferencia: string | null;
  descricao: string | null;
};

export type CentralCompraPendente = {
  id: string;
  codigo: string;
  fornecedor: string;
  valorTotalFinal: number;
  criadoEm: string;
};

export type CentralDestinoProLabore = {
  id: string;
  nome: string;
  valor: number;
  apuracaoCodigo: string;
  mes: number;
  ano: number;
};

export type CentralAlerta = {
  tipo: string;
  severidade: string;
  titulo: string;
  descricao: string;
};

type Props = {
  mes: number;
  ano: number;
  contas: CentralConta[];
  movimentos: CentralMovimento[];
  saldoGerencial: number;
  entradasMes: number;
  saidasMes: number;
  lancamentosPendentes: CentralLancamentoPendente[];
  comprasPendentes: CentralCompraPendente[];
  destinosProLaboreAprovados: CentralDestinoProLabore[];
  previsao: {
    mediaReceitaUltimos3Meses: number;
    gastosPendentes: number;
    proLaborePendente: number;
    proximos30Dias: number;
    texto: string;
  };
  alertas: CentralAlerta[];
  historico: FinanceiroHistoricoItem[];
  gastosPorCategoria: {
    categoria: string;
    total: number;
  }[];
  diagnostico: DiagnosticoFinanceiro;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function percentual(valor: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(valor)}%`;
}

function dataCurta(value: string | null) {
  if (!value) return "-";
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");
}

function hojeInput() {
  return new Date().toISOString().slice(0, 10);
}

function mesInput(mes: number, ano: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function MovimentoValor({ tipo, valor }: { tipo: string; valor: number }) {
  const negativo = tipo === "SAIDA";

  return (
    <span className={negativo ? "text-rose-700" : "text-emerald-700"}>
      {negativo ? "-" : "+"}
      {moeda(valor)}
    </span>
  );
}

function statusLabel(status: string) {
  if (status === "SAUDAVEL") return "Saudavel";
  if (status === "ATENCAO") return "Atencao";
  if (status === "RISCO") return "Risco";
  return "Critico";
}

function statusClasses(status: string) {
  if (status === "SAUDAVEL") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "ATENCAO") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "RISCO") return "border-orange-200 bg-orange-50 text-orange-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function semaforoClasses(cor: string) {
  if (cor === "VERDE") return "bg-emerald-500";
  if (cor === "AMARELO") return "bg-amber-500";
  return "bg-red-500";
}

function severidadeClasses(severidade: string) {
  if (severidade === "CRITICO") return "border-red-200 bg-red-50 text-red-800";
  if (severidade === "RISCO") return "border-orange-200 bg-orange-50 text-orange-800";
  if (severidade === "ATENCAO") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Chart({
  data,
  campo,
  label,
  color = "bg-slate-900",
}: {
  data: FinanceiroHistoricoItem[];
  campo: keyof Pick<FinanceiroHistoricoItem, "caixa" | "gastos" | "marketing" | "receita">;
  label: string;
  color?: string;
}) {
  const maior = Math.max(...data.map((item) => Math.abs(Number(item[campo]))), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <div className="mt-4 flex h-32 items-end gap-2">
        {data.map((item) => {
          const valor = Number(item[campo]);
          const altura = Math.max(8, (Math.abs(valor) / maior) * 116);

          return (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-xl ${valor < 0 ? "bg-rose-300" : color}`}
                style={{ height: altura }}
                title={`${item.label}: ${moeda(valor)}`}
              />
              <span className="text-[10px] font-medium text-slate-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
  detalhe,
  icon,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{titulo}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{valor}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detalhe}</p>
    </div>
  );
}

function CategoriaBars({
  data,
}: {
  data: {
    categoria: string;
    total: number;
  }[];
}) {
  const maior = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">Gastos por categoria</p>
      <div className="mt-4 space-y-3">
        {data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Sem gastos pagos no periodo.
          </p>
        ) : (
          data.map((item) => (
            <div key={item.categoria}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.categoria}</span>
                <span className="font-semibold text-slate-950">
                  {moeda(item.total)}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.max(4, (item.total / maior) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CentralFinanceiraClient({
  mes,
  ano,
  contas,
  movimentos,
  saldoGerencial,
  entradasMes,
  saidasMes,
  lancamentosPendentes,
  comprasPendentes,
  destinosProLaboreAprovados,
  previsao,
  alertas,
  historico,
  gastosPorCategoria,
  diagnostico,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [contaId, setContaId] = useState(contas[0]?.id || "");
  const [ajuste, setAjuste] = useState({
    tipo: "ENTRADA",
    categoria: "AJUSTE_MANUAL",
    descricao: "",
    valor: "",
  });

  const marketingVsReceita = useMemo(
    () =>
      historico.map((item) => ({
        ...item,
        marketing:
          item.receita > 0 ? Math.round((item.marketing / item.receita) * 10000) / 100 : 0,
      })),
    [historico]
  );

  function navegarMes(value: string) {
    const [novoAno, novoMes] = value.split("-").map(Number);
    router.push(`/compras/financeiro?mes=${novoMes}&ano=${novoAno}`);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function registrarAjuste() {
    setErro("");
    setMensagem("");

    const response = await fetch("/api/compras/financeiro/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ajuste,
        contaId,
        status: "PAGA",
        dataEfetiva: new Date().toISOString(),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel registrar o ajuste.");
      return;
    }

    setMensagem("Movimentacao de caixa registrada.");
    setAjuste({
      tipo: "ENTRADA",
      categoria: "AJUSTE_MANUAL",
      descricao: "",
      valor: "",
    });
    refresh();
  }

  async function marcarGastoPago(lancamento: CentralLancamentoPendente) {
    setErro("");
    setMensagem("");

    const response = await fetch(`/api/compras/gastos/${lancamento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: lancamento.tipo,
        categoria: lancamento.categoria,
        titulo: lancamento.titulo,
        descricao: lancamento.descricao,
        fornecedorParceiro: lancamento.fornecedorParceiro,
        valorPrevisto: lancamento.valorPrevisto,
        valorReal: lancamento.valorReal,
        statusPagamento: "PAGO",
        statusOperacional: lancamento.statusOperacional,
        dataCompetencia: lancamento.dataCompetencia,
        dataVencimento: lancamento.dataVencimento,
        dataPagamento: hojeInput(),
        recorrente: lancamento.recorrente,
        recorrencia: lancamento.recorrencia,
        quantidadeParcelas: lancamento.quantidadeParcelas,
        parcelaAtual: lancamento.parcelaAtual,
        meioPagamento: lancamento.meioPagamento,
        observacoes: lancamento.observacoes,
        linkReferencia: lancamento.linkReferencia,
        impactaCaixa: true,
        contaFinanceiraId: contaId,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel marcar o gasto como pago.");
      return;
    }

    setMensagem(`${lancamento.codigo} pago e descontado do caixa.`);
    refresh();
  }

  async function pagarCompra(compra: CentralCompraPendente) {
    setErro("");
    setMensagem("");

    const response = await fetch("/api/compras/financeiro/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compraId: compra.id,
        contaId,
        dataPagamento: new Date().toISOString(),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel registrar o pagamento da compra.");
      return;
    }

    setMensagem(`${compra.codigo} descontada do caixa.`);
    refresh();
  }

  async function pagarProLabore(destino: CentralDestinoProLabore) {
    setErro("");
    setMensagem("");

    const response = await fetch(`/api/compras/resultado/destinos/${destino.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "PAGAR", contaId }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel pagar o pro-labore.");
      return;
    }

    setMensagem(`${destino.nome} pago e descontado do caixa.`);
    refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Central Financeira
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Caixa gerencial
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Controle gerencial de saldos, pagamentos, retiradas e previsao.
              Nao e integracao bancaria real.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="month"
              value={mesInput(mes, ano)}
              onChange={(event) => navegarMes(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
            />
            <Link
              href="/compras/resultado"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Resultado e distribuicao
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {(erro || mensagem) && (
        <div className="space-y-2">
          {erro && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}
          {mensagem && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {mensagem}
            </div>
          )}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  Saude financeira
                </h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(
                    diagnostico.status
                  )}`}
                >
                  {statusLabel(diagnostico.status)}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {diagnostico.frase}
              </p>
            </div>
            <div className="min-w-28 rounded-3xl bg-slate-950 px-4 py-3 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Score
              </p>
              <p className="mt-1 text-3xl font-black">{diagnostico.score}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {diagnostico.alertas.slice(0, 3).map((alerta) => (
              <div
                key={alerta.tipo}
                className={`rounded-2xl border px-4 py-3 ${severidadeClasses(
                  alerta.severidade
                )}`}
              >
                <p className="text-sm font-bold">{alerta.titulo}</p>
                <p className="mt-1 text-sm leading-5">{alerta.texto}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {diagnostico.recomendacoes.slice(0, 3).map((recomendacao) => (
              <div
                key={recomendacao}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Recomendacao
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-700">
                  {recomendacao}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Semaforo de caixa
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {diagnostico.semaforoCaixa.texto}
              </p>
            </div>
            <span
              className={`mt-1 h-4 w-4 rounded-full ${semaforoClasses(
                diagnostico.semaforoCaixa.cor
              )}`}
            />
          </div>
          <div className="mt-5 grid gap-3 text-sm">
            <LinhaResumo label="Caixa gerencial" value={moeda(saldoGerencial)} />
            <LinhaResumo label="Runway" value={`${diagnostico.indicadores.runwayMeses} meses`} />
            <LinhaResumo label="Entradas do mes" value={moeda(entradasMes)} />
            <LinhaResumo label="Saidas do mes" value={moeda(saidasMes)} />
            <LinhaResumo label="Gastos pendentes" value={moeda(previsao.gastosPendentes)} />
            <LinhaResumo
              label="Compras pendentes"
              value={`${comprasPendentes.length} item(ns)`}
            />
            <LinhaResumo
              label="Pro-labore pendente"
              value={moeda(diagnostico.proLabore.pendente)}
            />
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Saldo por conta
              </p>
              <div className="mt-2 space-y-1.5">
                {contas.slice(0, 4).map((conta) => (
                  <LinhaResumo
                    key={conta.id}
                    label={conta.nome}
                    value={moeda(conta.saldoAtual)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InteligenciaCard
          titulo="Marketing inteligente"
          valor={`${percentual(diagnostico.marketing.percentual)}`}
          detalhe={`${moeda(diagnostico.marketing.valor)} pagos. Faixa inicial: ${diagnostico.marketing.faixaIdeal}.`}
          recomendacao={diagnostico.marketing.recomendacao}
          icon={<Megaphone className="h-5 w-5" />}
        />
        <InteligenciaCard
          titulo="Pro-labore seguro"
          valor={moeda(diagnostico.proLabore.sugerido)}
          detalhe={`Aprovado: ${moeda(diagnostico.proLabore.aprovado)}. Pago: ${moeda(
            diagnostico.proLabore.pago
          )}. Pendente: ${moeda(
            diagnostico.proLabore.pendente
          )}.`}
          recomendacao={diagnostico.proLabore.recomendacao}
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700">
            <span className="font-semibold text-slate-950">Por socio: </span>
            {moeda(diagnostico.proLabore.valorPorSocio)}
          </div>
          {diagnostico.proLabore.avisoRendaPrincipal && (
            <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-5 text-amber-800">
              {diagnostico.proLabore.avisoRendaPrincipal}
            </p>
          )}
        </InteligenciaCard>
        <InteligenciaCard
          titulo="Reinvestimento recomendado"
          valor={diagnostico.status === "SAUDAVEL" ? "Seletivo" : "Cautela"}
          detalhe={diagnostico.reinvestimento.recomendacoes[0] || "Manter caixa e margem sob controle."}
          recomendacao={
            diagnostico.reinvestimento.recomendacoes[1] ||
            "Priorize categorias vencedoras e reserva."
          }
          icon={<Target className="h-5 w-5" />}
        />
        <InteligenciaCard
          titulo="Estoque e giro"
          valor={`${diagnostico.estoque.produtosZerados}/${diagnostico.estoque.produtosBaixo}`}
          detalhe={`${diagnostico.estoque.produtosZerados} zerado(s), ${diagnostico.estoque.produtosBaixo} baixo(s), ${diagnostico.estoque.produtosParados} parado(s).`}
          recomendacao={diagnostico.estoque.recomendacao}
          icon={<Activity className="h-5 w-5" />}
        >
          {diagnostico.estoque.topProdutos.length > 0 && (
            <div className="mt-3 space-y-1.5 rounded-2xl bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Campeoes recentes
              </p>
              {diagnostico.estoque.topProdutos.slice(0, 3).map((produto) => (
                <div
                  key={produto.codigo}
                  className="flex items-center justify-between gap-3 text-xs text-slate-600"
                >
                  <span className="truncate font-semibold text-slate-700">
                    {produto.nome}
                  </span>
                  <span>{produto.vendidas} un.</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/compras/reposicao"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Ver reposicao
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/estoque"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Ver estoque
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </InteligenciaCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Previsao do proximo mes
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {diagnostico.previsao.texto}
          </p>
          <div className="mt-4 grid gap-3">
            {diagnostico.previsao.cenarios.map((cenario) => (
              <div
                key={cenario.nome}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-950">
                    {cenario.nome}
                  </p>
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <span>Receita: {moeda(cenario.receita)}</span>
                  <span>Caixa proj.: {moeda(cenario.caixaProjetado)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Alertas inteligentes
          </h2>
          <div className="mt-4 grid gap-3">
            {diagnostico.alertas.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Nenhum alerta gerencial relevante.
              </p>
            ) : (
              diagnostico.alertas.map((alerta) => (
                <div
                  key={alerta.tipo}
                  className={`rounded-2xl border px-4 py-3 ${severidadeClasses(
                    alerta.severidade
                  )}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">{alerta.titulo}</p>
                      <p className="mt-1 text-sm leading-5">{alerta.texto}</p>
                      <p className="mt-2 text-sm leading-5 font-semibold">
                        {alerta.recomendacao}
                      </p>
                    </div>
                    {alerta.href && alerta.acaoLabel && (
                      <Link
                        href={alerta.href}
                        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-current/10 transition hover:bg-white"
                      >
                        {alerta.acaoLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          titulo="Saldo gerencial atual"
          valor={moeda(saldoGerencial)}
          detalhe={`${contas.length} conta(s) gerenciais ativas.`}
          icon={<WalletCards className="h-5 w-5" />}
        />
        <Card
          titulo="Entradas do mes"
          valor={moeda(entradasMes)}
          detalhe="Somente movimentos pagos do caixa."
          icon={<BanknoteArrowUp className="h-5 w-5" />}
        />
        <Card
          titulo="Saidas do mes"
          valor={moeda(saidasMes)}
          detalhe="Gastos, compras, pro-labore e ajustes pagos."
          icon={<BanknoteArrowDown className="h-5 w-5" />}
        />
        <Card
          titulo="Previsao 30 dias"
          valor={moeda(previsao.proximos30Dias)}
          detalhe={previsao.texto}
          icon={<RefreshCcw className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Contas</h2>
          <div className="mt-4 space-y-3">
            {contas.map((conta) => (
              <label
                key={conta.id}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
                  contaId === conta.id
                    ? "border-slate-950 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-950">
                    {conta.nome}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {conta.tipo}
                  </span>
                </span>
                <span className="text-sm font-bold text-slate-950">
                  {moeda(conta.saldoAtual)}
                </span>
                <input
                  type="radio"
                  checked={contaId === conta.id}
                  onChange={() => setContaId(conta.id)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Ajuste manual de caixa
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Use para saldo inicial complementar, correcao gerencial ou entrada
            manual. Nao altera estoque, vendas ou pedidos.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_160px]">
            <select
              value={ajuste.tipo}
              onChange={(event) =>
                setAjuste((atual) => ({ ...atual, tipo: event.target.value }))
              }
              className="h-11 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saida</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
            <input
              value={ajuste.descricao}
              onChange={(event) =>
                setAjuste((atual) => ({
                  ...atual,
                  descricao: event.target.value,
                }))
              }
              placeholder="Descricao do ajuste"
              className="h-11 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={ajuste.valor}
              onChange={(event) =>
                setAjuste((atual) => ({ ...atual, valor: event.target.value }))
              }
              placeholder="Valor"
              className="h-11 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={registrarAjuste}
            disabled={isPending}
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Registrar ajuste
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <PendenciasCard
          titulo="Gastos pendentes"
          vazio="Nenhum gasto pendente."
          itens={lancamentosPendentes.map((lancamento) => ({
            id: lancamento.id,
            titulo: `${lancamento.codigo} - ${lancamento.titulo}`,
            detalhe: dataCurta(lancamento.dataVencimento),
            valor: lancamento.valorReal,
            onClick: () => marcarGastoPago(lancamento),
            acao: "Pagar e descontar",
          }))}
        />
        <PendenciasCard
          titulo="Compras de estoque pendentes"
          vazio="Nenhuma compra recente pendente."
          itens={comprasPendentes.map((compra) => ({
            id: compra.id,
            titulo: `${compra.codigo} - ${compra.fornecedor}`,
            detalhe: dataCurta(compra.criadoEm),
            valor: compra.valorTotalFinal,
            onClick: () => pagarCompra(compra),
            acao: "Descontar caixa",
          }))}
        />
        <PendenciasCard
          titulo="Pro-labore aprovado"
          vazio="Nenhuma retirada aprovada."
          itens={destinosProLaboreAprovados.map((destino) => ({
            id: destino.id,
            titulo: `${destino.nome} - ${destino.apuracaoCodigo}`,
            detalhe: `${String(destino.mes).padStart(2, "0")}/${destino.ano}`,
            valor: destino.valor,
            onClick: () => pagarProLabore(destino),
            acao: "Marcar pago",
          }))}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Chart data={historico} campo="caixa" label="Evolucao de caixa 6 meses" />
        <Chart
          data={historico}
          campo="gastos"
          label="Gastos por mes"
          color="bg-amber-500"
        />
        <Chart
          data={marketingVsReceita}
          campo="marketing"
          label="Marketing vs receita (%)"
          color="bg-blue-500"
        />
      </section>

      <CategoriaBars data={gastosPorCategoria} />

      {alertas.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2">
          {alertas.map((alerta) => (
            <div
              key={`${alerta.tipo}-${alerta.titulo}`}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {alerta.titulo}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {alerta.descricao}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Historico de caixa
        </h2>
        <div className="mt-4 divide-y divide-slate-100">
          {movimentos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma movimentacao de caixa registrada.
            </div>
          ) : (
            movimentos.map((movimento) => (
              <div
                key={movimento.id}
                className="grid gap-3 py-3 text-sm md:grid-cols-[110px_1fr_150px_150px]"
              >
                <span className="font-semibold text-slate-950">
                  {movimento.codigo}
                </span>
                <span>
                  {movimento.descricao}
                  <span className="mt-1 block text-xs text-slate-500">
                    {movimento.contaNome} · {movimento.categoria}
                  </span>
                </span>
                <span>{dataCurta(movimento.dataEfetiva)}</span>
                <span className="text-right font-semibold">
                  <MovimentoValor tipo={movimento.tipo} valor={movimento.valor} />
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PendenciasCard({
  titulo,
  vazio,
  itens,
}: {
  titulo: string;
  vazio: string;
  itens: {
    id: string;
    titulo: string;
    detalhe: string;
    valor: number;
    acao: string;
    onClick: () => void;
  }[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
        <Boxes className="h-5 w-5 text-slate-400" />
        {titulo}
      </h2>
      <div className="mt-4 space-y-3">
        {itens.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {vazio}
          </p>
        ) : (
          itens.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {item.titulo}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.detalhe}</p>
                </div>
                <p className="text-sm font-bold text-slate-950">
                  {moeda(item.valor)}
                </p>
              </div>
              <button
                type="button"
                onClick={item.onClick}
                className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <CheckCircle2 className="h-4 w-4" />
                {item.acao}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LinhaResumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-950">{value}</span>
    </div>
  );
}

function InteligenciaCard({
  titulo,
  valor,
  detalhe,
  recomendacao,
  icon,
  children,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  recomendacao: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{titulo}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{valor}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detalhe}</p>
      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold leading-5 text-slate-700">
        {recomendacao}
      </p>
      {children}
    </div>
  );
}
