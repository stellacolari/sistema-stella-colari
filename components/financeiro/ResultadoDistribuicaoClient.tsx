"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Gauge,
  Lightbulb,
  LockKeyhole,
  PiggyBank,
  Save,
  Target,
  WalletCards,
} from "lucide-react";
import type { RecomendacaoGerencialResumo } from "@/components/compras/RecomendacoesGerenciaisClient";
import type { DiagnosticoFinanceiro } from "@/lib/financeiro/inteligencia-gerencial";

export type FinanceiroContaOption = {
  id: string;
  nome: string;
  tipo: string;
};

export type FinanceiroRegraDestino = {
  id?: string;
  tipo: string;
  nome: string;
  percentual: number;
  ordem: number;
  ativo: boolean;
};

export type FinanceiroRegra = {
  id: string;
  nome: string;
  percentualEmpresa: number;
  percentualProLabore: number;
  observacoes: string | null;
  destinos: FinanceiroRegraDestino[];
};

export type FinanceiroResultadoCalculado = {
  mes: number;
  ano: number;
  periodoInicio: string;
  periodoFim: string;
  receitaRecebida: number;
  custoProdutos: number;
  custoEmbalagens: number;
  taxas: number;
  fretes: number;
  gastosOperacionais: number;
  comprasEstoqueCaixa: number;
  resultadoBruto: number;
  lucroApuravel: number;
  caixaLiquido: number;
  proLaboreSugerido: number;
  empresaSugerido: number;
  destinos: {
    tipo: string;
    nome: string;
    percentual: number;
    valor: number;
    statusPagamento: string;
  }[];
  alertas: {
    tipo: string;
    severidade: string;
    titulo: string;
    descricao: string;
  }[];
  fontes: {
    vendasInternas: number;
    pedidosOnlinePagos: number;
    gastosPagos: number;
    movimentosCaixaPagos: number;
    estimativas: string[];
  };
};

export type FinanceiroApuracao = {
  id: string;
  codigo: string;
  mes: number;
  ano: number;
  status: string;
  receitaRecebida: number;
  custoProdutos: number;
  custoEmbalagens: number;
  gastosOperacionais: number;
  comprasEstoqueCaixa: number;
  resultadoBruto: number;
  lucroApuravel: number;
  caixaLiquido: number;
  fechadoEm: string | null;
  destinos: {
    id: string;
    tipo: string;
    nome: string;
    percentual: number;
    valor: number;
    statusPagamento: string;
    movimentacaoCaixaId: string | null;
    pagoEm: string | null;
  }[];
};

export type FinanceiroHistoricoItem = {
  label: string;
  receita: number;
  lucro: number;
  caixa: number;
  gastos: number;
  proLabore: number;
  marketing: number;
};

type DestinoExibido = {
  id: string | null;
  tipo: string;
  nome: string;
  percentual: number;
  valor: number;
  statusPagamento: string;
  pagoEm: string | null;
};

type Props = {
  mes: number;
  ano: number;
  contas: FinanceiroContaOption[];
  regra: FinanceiroRegra;
  resultado: FinanceiroResultadoCalculado;
  apuracaoAtual: FinanceiroApuracao | null;
  historicoApuracoes: FinanceiroApuracao[];
  historico: FinanceiroHistoricoItem[];
  diagnostico: DiagnosticoFinanceiro;
  recomendacoesGerenciais?: RecomendacaoGerencialResumo[];
};

const DESTINOS_PRO_LABORE = ["PRO_LABORE_SOCIO_1", "PRO_LABORE_SOCIO_2"];

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

function mesInput(mes: number, ano: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function getStatusClass(status: string) {
  if (status === "PAGO") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "APROVADO") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "CANCELADO") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status: string) {
  if (status === "SAUDAVEL") return "Saudavel";
  if (status === "ATENCAO") return "Atencao";
  if (status === "RISCO") return "Risco";
  return "Critico";
}

function statusDiagnosticoClass(status: string) {
  if (status === "SAUDAVEL") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "ATENCAO") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "RISCO") return "border-orange-200 bg-orange-50 text-orange-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function prioridadeRecomendacaoClasses(prioridade: string) {
  if (prioridade === "ALTA") return "border-red-200 bg-red-50 text-red-800";
  if (prioridade === "MEDIA") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function labelRecomendacaoStatus(status: string) {
  if (status === "NOVA") return "Nova";
  if (status === "ACEITA") return "Aceita";
  if (status === "EM_EXECUCAO") return "Em execucao";
  if (status === "ADIADA") return "Adiada";
  return status.replaceAll("_", " ");
}

function isProLabore(tipo: string) {
  return DESTINOS_PRO_LABORE.includes(tipo);
}

function MiniBarChart({
  data,
  campo,
  label,
}: {
  data: FinanceiroHistoricoItem[];
  campo: keyof Pick<FinanceiroHistoricoItem, "receita" | "lucro" | "caixa" | "gastos" | "proLabore" | "marketing">;
  label: string;
}) {
  const maior = Math.max(...data.map((item) => Math.abs(Number(item[campo]))), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <div className="mt-4 flex h-36 items-end gap-2">
        {data.map((item) => {
          const valor = Number(item[campo]);
          const altura = Math.max(8, (Math.abs(valor) / maior) * 128);

          return (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-xl ${
                  valor < 0 ? "bg-rose-300" : "bg-slate-900"
                }`}
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

function DistribuicaoChart({
  destinos,
}: {
  destinos: FinanceiroResultadoCalculado["destinos"];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">Distribuicao do lucro</p>
      <div className="mt-4 space-y-3">
        {destinos.map((destino) => (
          <div key={destino.tipo}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{destino.nome}</span>
              <span className="font-semibold text-slate-950">
                {moeda(destino.valor)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  isProLabore(destino.tipo) ? "bg-blue-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, destino.percentual)}%` }}
              />
            </div>
          </div>
        ))}
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

export default function ResultadoDistribuicaoClient({
  mes,
  ano,
  contas,
  regra,
  resultado,
  apuracaoAtual,
  historicoApuracoes,
  historico,
  diagnostico,
  recomendacoesGerenciais = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [editandoRegra, setEditandoRegra] = useState(false);
  const [regraForm, setRegraForm] = useState(() => ({
    nome: regra.nome,
    percentualEmpresa: String(regra.percentualEmpresa),
    percentualProLabore: String(regra.percentualProLabore),
    destinos: regra.destinos.map((destino) => ({
      ...destino,
      percentual: String(destino.percentual),
    })),
  }));
  const [contaPagamentoId, setContaPagamentoId] = useState(contas[0]?.id || "");

  const totalPrincipal = useMemo(
    () =>
      Number(regraForm.percentualEmpresa || 0) +
      Number(regraForm.percentualProLabore || 0),
    [regraForm.percentualEmpresa, regraForm.percentualProLabore]
  );
  const totalDestinos = useMemo(
    () =>
      regraForm.destinos.reduce(
        (total, destino) => total + Number(destino.percentual || 0),
        0
      ),
    [regraForm.destinos]
  );
  const destinosExibidos: DestinoExibido[] = apuracaoAtual
    ? apuracaoAtual.destinos
    : resultado.destinos.map((destino) => ({
        ...destino,
        id: null,
        pagoEm: null,
      }));
  const leituraAdaptativaMes = [
    {
      label: "Regra 50/50",
      value: diagnostico.leituraResultado.distribuicaoSegura
        ? "Segura com controle"
        : "Meta futura",
      detail: diagnostico.leituraResultado.distribuicaoSegura
        ? "Pode ser usada neste mes se caixa e pendencias forem respeitados."
        : "Use retirada conservadora ate giro, caixa e reserva ficarem mais consistentes.",
    },
    {
      label: "Pro-labore",
      value: diagnostico.proLabore.seguro ? "Manter teto" : "Reduzir ou pausar",
      detail: diagnostico.leituraResultado.recomendacaoProLabore,
    },
    {
      label: "Caixa e reserva",
      value:
        diagnostico.indicadores.runwayMeses >= diagnostico.adaptativa.metas.reserva.minimo
          ? "Preservar"
          : "Priorizar",
      detail: diagnostico.adaptativa.metas.reserva.recomendacao,
    },
    {
      label: "Reposicao",
      value:
        diagnostico.adaptativa.distribuicao.reposicao >= 25
          ? "Receber mais verba"
          : "Seletiva",
      detail: diagnostico.estoque.recomendacao,
    },
    {
      label: "Marketing",
      value:
        diagnostico.marketing.percentual >
        diagnostico.adaptativa.metas.marketingPago.maximo
          ? "Reduzir"
          : diagnostico.adaptativa.metas.marketingPago.maximo <= 5
            ? "Cautela"
            : "Medir e escalar",
      detail: diagnostico.marketing.recomendacao,
    },
  ];

  function navegarMes(value: string) {
    const [novoAno, novoMes] = value.split("-").map(Number);
    router.push(`/compras/resultado?mes=${novoMes}&ano=${novoAno}`);
  }

  async function salvarRegra() {
    setErro("");
    setMensagem("");

    if (totalPrincipal !== 100 || totalDestinos !== 100) {
      setErro("A regra precisa fechar 100% no principal e nos destinos.");
      return;
    }

    const response = await fetch("/api/compras/resultado/regra", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: regraForm.nome,
        percentualEmpresa: regraForm.percentualEmpresa,
        percentualProLabore: regraForm.percentualProLabore,
        destinos: regraForm.destinos.map((destino, index) => ({
          ...destino,
          percentual: Number(destino.percentual || 0),
          ordem: index + 1,
        })),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel salvar a regra.");
      return;
    }

    setMensagem("Regra de distribuicao salva.");
    setEditandoRegra(false);
    startTransition(() => router.refresh());
  }

  async function fecharApuracao() {
    setErro("");
    setMensagem("");

    const response = await fetch("/api/compras/resultado/apuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes, ano }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel fechar a apuracao.");
      return;
    }

    setMensagem("Apuracao fechada. Os destinos ficaram previstos.");
    startTransition(() => router.refresh());
  }

  async function acaoDestino(id: string, acao: "APROVAR" | "CANCELAR" | "PAGAR") {
    setErro("");
    setMensagem("");

    const response = await fetch(`/api/compras/resultado/destinos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao, contaId: contaPagamentoId }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Nao foi possivel atualizar a retirada.");
      return;
    }

    setMensagem("Retirada atualizada.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Resultado e distribuicao
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Apuracao mensal
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Resultado, distribuicao e caixa sao tratados separadamente. O
              pro-labore nasce do lucro apuravel e so reduz caixa quando a
              retirada e paga.
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
              href="/compras/financeiro"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Central Financeira
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          titulo="Faturamento recebido"
          valor={moeda(resultado.receitaRecebida)}
          detalhe={`${resultado.fontes.vendasInternas} vendas internas e ${resultado.fontes.pedidosOnlinePagos} pedidos online pagos.`}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <Card
          titulo="Lucro apuravel"
          valor={moeda(resultado.lucroApuravel)}
          detalhe="Base profissional para pro-labore, ja descontando custos e gastos operacionais."
          icon={<PiggyBank className="h-5 w-5" />}
        />
        <Card
          titulo="Caixa liquido"
          valor={moeda(resultado.caixaLiquido)}
          detalhe="Movimentacoes de caixa pagas no periodo; fechamento nao desconta automaticamente."
          icon={<WalletCards className="h-5 w-5" />}
        />
        <Card
          titulo="Pro-labore sugerido"
          valor={moeda(resultado.proLaboreSugerido)}
          detalhe={`Regra atual; faixa adaptativa da fase: ${diagnostico.adaptativa.metas.proLabore.label}.`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Lightbulb className="h-4 w-4" />
              Leitura adaptativa do mes
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {diagnostico.adaptativa.faseLabel}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              A distribuicao 50/50 e uma meta de referencia. Para a fase atual,
              a plataforma ajusta retirada, caixa, reposicao e marketing pela
              confianca dos dados e pelo risco do mes.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
            Confianca {diagnostico.adaptativa.confiancaAnalise}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {leituraAdaptativaMes.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-5 text-slate-600">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {recomendacoesGerenciais.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <Lightbulb className="h-4 w-4" />
                Recomendacoes financeiras abertas
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Decisoes que afetam retirada, caixa, marketing e distribuicao.
                Use a pagina de recomendacoes para registrar o andamento.
              </p>
            </div>
            <Link
              href="/compras/recomendacoes"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Acompanhar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recomendacoesGerenciais.map((recomendacao) => (
              <div
                key={recomendacao.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${prioridadeRecomendacaoClasses(
                      recomendacao.prioridade
                    )}`}
                  >
                    {recomendacao.prioridade}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    {labelRecomendacaoStatus(recomendacao.status)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-bold text-slate-950">
                  {recomendacao.titulo}
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">
                  {recomendacao.acaoSugerida || recomendacao.descricao}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  Leitura gerencial do mes
                </h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusDiagnosticoClass(
                    diagnostico.status
                  )}`}
                >
                  {statusLabel(diagnostico.status)}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {diagnostico.leituraResultado.texto}
              </p>
            </div>
            <div className="min-w-24 rounded-3xl bg-slate-950 px-4 py-3 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Score
              </p>
              <p className="mt-1 text-3xl font-black">{diagnostico.score}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ResumoGerencial
              label="Rentabilidade"
              value={diagnostico.leituraResultado.rentavel ? "Rentavel" : "Nao rentavel"}
              detail={`Margem liquida: ${percentual(
                diagnostico.indicadores.margemLiquidaPct
              )}`}
            />
            <ResumoGerencial
              label="Margem bruta"
              value={percentual(diagnostico.indicadores.margemBrutaPct)}
              detail={diagnostico.adaptativa.margemDesconto.recomendacao}
            />
            <ResumoGerencial
              label="Distribuicao 50/50"
              value={
                diagnostico.leituraResultado.distribuicaoSegura
                  ? "Segura"
                  : "Cautela"
              }
              detail="Considera caixa, pendencias e pro-labore."
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <PiggyBank className="h-4 w-4 text-slate-500" />
                Pro-labore
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {diagnostico.leituraResultado.recomendacaoProLabore}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <Target className="h-4 w-4 text-slate-500" />
                Empresa e reinvestimento
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {diagnostico.leituraResultado.recomendacaoEmpresa}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <Lightbulb className="h-4 w-4 text-slate-500" />
              Balanca adaptativa
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Fase {diagnostico.adaptativa.faseLabel}, confianca{" "}
              {diagnostico.adaptativa.confiancaAnalise}.{" "}
              {diagnostico.adaptativa.distribuicao.leitura}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <ResumoGerencial
                label="Caixa"
                value={percentual(diagnostico.adaptativa.distribuicao.caixa)}
                detail="Sugestao gerencial"
              />
              <ResumoGerencial
                label="Reserva"
                value={percentual(diagnostico.adaptativa.distribuicao.reserva)}
                detail="Sugestao gerencial"
              />
              <ResumoGerencial
                label="Reposicao"
                value={percentual(diagnostico.adaptativa.distribuicao.reposicao)}
                detail="Sugestao gerencial"
              />
              <ResumoGerencial
                label="Marketing"
                value={percentual(diagnostico.adaptativa.distribuicao.marketing)}
                detail="Sugestao gerencial"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-950">
              Roadmap financeiro
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            <RoadmapMes titulo="Mes 1" itens={diagnostico.roadmap.mes1} />
            <RoadmapMes titulo="Mes 2" itens={diagnostico.roadmap.mes2} />
            <RoadmapMes titulo="Mes 3" itens={diagnostico.roadmap.mes3} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Regra 50/50
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Empresa: {percentual(regra.percentualEmpresa)}. Pro-labore:{" "}
                {percentual(regra.percentualProLabore)}. Destinos precisam
                fechar 100%.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditandoRegra((atual) => !atual)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Edit3 className="h-4 w-4" />
              {editandoRegra ? "Fechar edicao" : "Editar regra"}
            </button>
          </div>

          {editandoRegra ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Nome
                  </span>
                  <input
                    value={regraForm.nome}
                    onChange={(event) =>
                      setRegraForm((atual) => ({
                        ...atual,
                        nome: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </label>
                <NumeroRegra
                  label="Empresa %"
                  value={regraForm.percentualEmpresa}
                  onChange={(value) =>
                    setRegraForm((atual) => ({
                      ...atual,
                      percentualEmpresa: value,
                    }))
                  }
                />
                <NumeroRegra
                  label="Pro-labore %"
                  value={regraForm.percentualProLabore}
                  onChange={(value) =>
                    setRegraForm((atual) => ({
                      ...atual,
                      percentualProLabore: value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-3">
                {regraForm.destinos.map((destino, index) => (
                  <div
                    key={destino.tipo}
                    className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_140px]"
                  >
                    <input
                      value={destino.nome}
                      onChange={(event) =>
                        setRegraForm((atual) => ({
                          ...atual,
                          destinos: atual.destinos.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, nome: event.target.value }
                              : item
                          ),
                        }))
                      }
                      className="h-10 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={destino.percentual}
                      onChange={(event) =>
                        setRegraForm((atual) => ({
                          ...atual,
                          destinos: atual.destinos.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, percentual: event.target.value }
                              : item
                          ),
                        }))
                      }
                      className="h-10 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p
                  className={`text-sm font-semibold ${
                    totalPrincipal === 100 && totalDestinos === 100
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  Principal: {percentual(totalPrincipal)} · Destinos:{" "}
                  {percentual(totalDestinos)}
                </p>
                <button
                  type="button"
                  onClick={salvarRegra}
                  disabled={isPending}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Salvar regra
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {regra.destinos.map((destino) => (
                <div
                  key={destino.tipo}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {destino.nome}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {percentual(destino.percentual)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DistribuicaoChart destinos={resultado.destinos} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Fechamento formal
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Fechar salva o snapshot do resultado e dos destinos. Nao gera
              saida de caixa automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={fecharApuracao}
            disabled={isPending || apuracaoAtual?.status === "FECHADA"}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockKeyhole className="h-4 w-4" />
            {apuracaoAtual?.status === "FECHADA"
              ? "Apuracao fechada"
              : "Fechar apuracao do mes"}
          </button>
        </div>

        {apuracaoAtual && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {apuracaoAtual.codigo} fechada em {dataCurta(apuracaoAtual.fechadoEm)}.
          </div>
        )}

        <div className="mt-5 grid gap-3">
          {destinosExibidos.map((destino) => (
            <div
              key={`${destino.tipo}-${destino.id || destino.nome}`}
              className="grid gap-3 rounded-2xl border border-slate-200 px-4 py-3 lg:grid-cols-[1fr_140px_140px_auto] lg:items-center"
            >
              <div>
                <p className="font-semibold text-slate-950">{destino.nome}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {percentual(destino.percentual)} do lucro apuravel
                </p>
              </div>
              <p className="font-semibold text-slate-950">
                {moeda(destino.valor)}
              </p>
              <span
                className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                  destino.statusPagamento
                )}`}
              >
                {destino.statusPagamento}
              </span>
              {destino.id && isProLabore(destino.tipo) ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {destino.statusPagamento === "PREVISTO" && (
                    <button
                      type="button"
                      onClick={() => acaoDestino(destino.id!, "APROVAR")}
                      className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Aprovar retirada
                    </button>
                  )}
                  {destino.statusPagamento === "APROVADO" && (
                    <>
                      <select
                        value={contaPagamentoId}
                        onChange={(event) => setContaPagamentoId(event.target.value)}
                        className="h-9 rounded-2xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none"
                      >
                        {contas.map((conta) => (
                          <option key={conta.id} value={conta.id}>
                            {conta.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => acaoDestino(destino.id!, "PAGAR")}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Marcar pago
                      </button>
                      <button
                        type="button"
                        onClick={() => acaoDestino(destino.id!, "CANCELAR")}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {destino.statusPagamento === "PAGO" && (
                    <span className="text-xs font-semibold text-slate-500">
                      Pago em {dataCurta(destino.pagoEm)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-right text-xs font-medium text-slate-400">
                  Distribuicao gerencial
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {resultado.alertas.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2">
          {resultado.alertas.map((alerta) => (
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

      <section className="grid gap-4 xl:grid-cols-3">
        <MiniBarChart data={historico} campo="receita" label="Faturamento 6 meses" />
        <MiniBarChart data={historico} campo="proLabore" label="Pro-labore historico" />
        <MiniBarChart data={historico} campo="lucro" label="Lucro apuravel" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Historico de apuracoes
        </h2>
        <div className="mt-4 divide-y divide-slate-100">
          {historicoApuracoes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma apuracao fechada ainda.
            </div>
          ) : (
            historicoApuracoes.map((apuracao) => (
              <div
                key={apuracao.id}
                className="grid gap-3 py-3 text-sm md:grid-cols-[130px_1fr_1fr_1fr]"
              >
                <span className="font-semibold text-slate-950">
                  {String(apuracao.mes).padStart(2, "0")}/{apuracao.ano}
                </span>
                <span>Receita: {moeda(apuracao.receitaRecebida)}</span>
                <span>Lucro: {moeda(apuracao.lucroApuravel)}</span>
                <span>Fechada: {dataCurta(apuracao.fechadoEm)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function NumeroRegra({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

function ResumoGerencial({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function RoadmapMes({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
        <Lightbulb className="h-4 w-4 text-slate-500" />
        {titulo}
      </div>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-slate-600">
        {itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
