"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Filter,
  MapPin,
  PackageCheck,
  Truck,
  UserRound,
} from "lucide-react";
import type {
  ColunaPainelPedidos,
  PainelOperacionalPedidosData,
  PedidoOperacionalCard,
  PrioridadePedidoOperacional,
  ResumoPainelPedidos,
} from "@/lib/pedidos/painel-operacional";

type PainelOperacionalPedidosProps = {
  data: PainelOperacionalPedidosData;
};

type FiltroPainel =
  | "TODOS"
  | "CRITICOS"
  | "PROBLEMA"
  | "RETIRADA"
  | "ETIQUETA"
  | "ATRASADOS";

const FILTROS: { id: FiltroPainel; label: string }[] = [
  { id: "TODOS", label: "Todos" },
  { id: "CRITICOS", label: "Criticos" },
  { id: "PROBLEMA", label: "Com problema" },
  { id: "RETIRADA", label: "Retirada local" },
  { id: "ETIQUETA", label: "Etiqueta pendente" },
  { id: "ATRASADOS", label: "Atrasados" },
];

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function dataCurta(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function prioridadeClasse(prioridade: PrioridadePedidoOperacional) {
  if (prioridade === "CRITICA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (prioridade === "ALTA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (prioridade === "MEDIA") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function etapaClasse(card: PedidoOperacionalCard) {
  if (card.problema) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (card.etiquetaPendente) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (card.retiradaPendente) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (card.etapa === "ENTREGUE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function passaFiltro(card: PedidoOperacionalCard, filtro: FiltroPainel) {
  if (filtro === "TODOS") return true;
  if (filtro === "CRITICOS") return card.prioridade === "CRITICA";
  if (filtro === "PROBLEMA") return card.problema;
  if (filtro === "RETIRADA") return card.retiradaPendente;
  if (filtro === "ETIQUETA") return card.etiquetaPendente;
  if (filtro === "ATRASADOS") return card.atrasado;

  return true;
}

function ResumoCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: "red" | "amber" | "blue" | "emerald" | "slate";
}) {
  const classes = {
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    slate: "border-slate-200 bg-white text-slate-700",
  }[tone];

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${classes}`}>
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-2 text-3xl font-black">{numero(value)}</p>
      <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>
    </div>
  );
}

function ResumoOperacional({ resumo }: { resumo: ResumoPainelPedidos }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <ResumoCard
        label="Pagos para preparo"
        value={resumo.pagosAguardandoPreparo}
        description="Pedidos pagos que ainda precisam iniciar fluxo."
        tone={resumo.pagosAguardandoPreparo > 0 ? "emerald" : "slate"}
      />
      <ResumoCard
        label="Em separacao"
        value={resumo.emSeparacao}
        description="Pedidos em conferencia operacional."
        tone="blue"
      />
      <ResumoCard
        label="Etiquetas pendentes"
        value={resumo.etiquetasPendentes}
        description="Envios que precisam de preparo ou etiqueta."
        tone={resumo.etiquetasPendentes > 0 ? "amber" : "slate"}
      />
      <ResumoCard
        label="Com problema"
        value={resumo.pedidosComProblema}
        description="Excecoes que pedem revisao."
        tone={resumo.pedidosComProblema > 0 ? "red" : "slate"}
      />
      <ResumoCard
        label="Retiradas"
        value={resumo.retiradasPendentes}
        description="Pedidos aguardando retirada local."
        tone={resumo.retiradasPendentes > 0 ? "blue" : "slate"}
      />
      <ResumoCard
        label="Atrasados"
        value={resumo.atrasados}
        description="Parados ha 2+ dias no preparo."
        tone={resumo.atrasados > 0 ? "red" : "emerald"}
      />
    </section>
  );
}

function PedidoCard({ card }: { card: PedidoOperacionalCard }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {card.codigo}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{card.clienteNome}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${prioridadeClasse(
            card.prioridade
          )}`}
        >
          {card.prioridade}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={`rounded-full border px-2 py-1 text-[11px] font-bold ${etapaClasse(
            card
          )}`}
        >
          {card.etapaLabel}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
          {card.tipoEntregaLabel}
        </span>
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
        <div className="flex items-start gap-2">
          <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-950">
              {card.proximaAcao}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {card.descricaoAcao}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span>
            {card.diasNaEtapa > 0
              ? `Parado ha ${card.diasNaEtapa} dia(s)`
              : "Atualizado hoje"}
          </span>
        </div>
        {card.cidadeEstado ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{card.cidadeEstado}</span>
          </div>
        ) : null}
        {card.statusEnvio ? (
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Envio: {card.statusEnvio}</span>
          </div>
        ) : null}
      </div>

      {card.alerta ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-800">
          {card.alerta}
        </div>
      ) : null}

      <Link
        href={card.href}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800"
      >
        Ver pedido
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function ColunaPedidos({
  coluna,
  filtro,
}: {
  coluna: ColunaPainelPedidos;
  filtro: FiltroPainel;
}) {
  const cards = coluna.cards.filter((card) => passaFiltro(card, filtro));

  return (
    <section className="flex min-h-[220px] flex-col rounded-3xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3 px-1 py-1">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-950">{coluna.titulo}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {coluna.descricao}
          </p>
        </div>
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
          {numero(cards.length)}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-8 text-center text-xs font-semibold text-slate-400">
            Nenhum pedido pendente nesta etapa.
          </div>
        ) : (
          cards.map((card) => <PedidoCard key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}

export default function PainelOperacionalPedidos({
  data,
}: PainelOperacionalPedidosProps) {
  const [filtro, setFiltro] = useState<FiltroPainel>("TODOS");
  const totalFiltrado = useMemo(
    () =>
      data.colunas.reduce(
        (total, coluna) =>
          total + coluna.cards.filter((card) => passaFiltro(card, filtro)).length,
        0
      ),
    [data.colunas, filtro]
  );
  const operacaoEmDia =
    data.resumo.pedidosComProblema === 0 &&
    data.resumo.atrasados === 0 &&
    data.resumo.etiquetasPendentes === 0 &&
    data.resumo.pagosAguardandoPreparo === 0;

  return (
    <main className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/pedidos"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para pedidos
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Painel operacional
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Operacao de pedidos
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe pedidos por etapa, atraso e proxima acao.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">
              Atualizado em:
            </span>{" "}
            {dataCurta(data.atualizadoEm)}
          </div>
        </div>

        {operacaoEmDia ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Operacao em dia.</p>
              <p className="mt-1 leading-6">
                Nao ha atrasos, problemas ou etiquetas pendentes no painel.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Ha pedidos pedindo atencao.</p>
              <p className="mt-1 leading-6">
                Comece pelos criticos, problemas e itens parados ha mais tempo.
              </p>
            </div>
          </div>
        )}
      </section>

      <ResumoOperacional resumo={data.resumo} />

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-black text-slate-950">
              Filtros rapidos
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
              {numero(totalFiltrado)} de {numero(data.totalCards)}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTROS.map((item) => {
              const ativo = filtro === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltro(item.id)}
                  className={`h-9 shrink-0 rounded-full border px-3 text-xs font-black transition ${
                    ativo
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {data.colunas.map((coluna) => (
          <ColunaPedidos key={coluna.id} coluna={coluna} filtro={filtro} />
        ))}
      </section>
    </main>
  );
}
