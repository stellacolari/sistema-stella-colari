"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Bell,
  CheckCircle2,
  Search,
  Trash2,
  RefreshCcw,
} from "lucide-react";

type NotificacaoResumo = {
  id: string;
  tipo: string;
  categoria: string;
  prioridade: string;
  titulo: string;
  descricao: string;
  resumo: string | null;
  status: string;
  origemTipo: string;
  origemId: string | null;
  linkAcao: string | null;
  acaoLabel: string | null;
  metadataJson: unknown;
  criadoEm: string;
  atualizadoEm: string;
  lidaEm: string | null;
  arquivadaEm: string | null;
};

type Props = {
  perfil: string;
  notificacoes: NotificacaoResumo[];
  contadores: {
    total: number;
    pedidos: number;
    reposicao: number;
    recomendacoes: number;
    campanhas: number;
    precificacao: number;
  };
};

const tabs = [
  { value: "TODAS", label: "Todas" },
  { value: "PEDIDO", label: "Pedidos" },
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "REPOSICAO", label: "Estoque/Reposicao" },
  { value: "RECOMENDACAO", label: "Recomendacoes" },
  { value: "CAMPANHA", label: "Campanhas" },
  { value: "SISTEMA", label: "Sistema" },
];

const prioridades = ["TODAS", "CRITICA", "ALTA", "MEDIA", "BAIXA", "INFO"];
const statuses = ["TODAS", "NOVA", "LIDA", "ARQUIVADA"];

function normalizar(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dataCurta(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoriaClass(categoria: string) {
  if (categoria === "PEDIDO") return "border-red-200 bg-red-50 text-red-900";
  if (categoria === "OPERACIONAL") return "border-orange-200 bg-orange-50 text-orange-900";
  if (categoria === "REPOSICAO" || categoria === "ESTOQUE") return "border-amber-200 bg-amber-50 text-amber-900";
  if (categoria === "RECOMENDACAO") return "border-blue-200 bg-blue-50 text-blue-900";
  if (categoria === "CAMPANHA") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (categoria === "PRECIFICACAO") return "border-violet-200 bg-violet-50 text-violet-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function prioridadeClass(prioridade: string) {
  if (prioridade === "CRITICA") return "bg-red-700 text-white";
  if (prioridade === "ALTA") return "bg-red-100 text-red-800";
  if (prioridade === "MEDIA") return "bg-amber-100 text-amber-800";
  if (prioridade === "BAIXA") return "bg-slate-100 text-slate-700";
  return "bg-blue-100 text-blue-800";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (item) => item.toUpperCase());
}

export default function NotificacoesClient({ perfil, notificacoes, contadores }: Props) {
  const [items, setItems] = useState(notificacoes);
  const [categoria, setCategoria] = useState("TODAS");
  const [prioridade, setPrioridade] = useState("TODAS");
  const [status, setStatus] = useState("TODAS");
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);

    return items
      .filter((item) => (categoria === "TODAS" ? true : item.categoria === categoria || (categoria === "REPOSICAO" && item.categoria === "ESTOQUE")))
      .filter((item) => (prioridade === "TODAS" ? true : item.prioridade === prioridade))
      .filter((item) => (status === "TODAS" ? true : item.status === status))
      .filter((item) =>
        termo
          ? normalizar(`${item.titulo} ${item.descricao} ${item.origemTipo}`).includes(termo)
          : true,
      )
      .sort((a, b) => {
        if (a.categoria === "PEDIDO" && b.categoria !== "PEDIDO") return -1;
        if (b.categoria === "PEDIDO" && a.categoria !== "PEDIDO") return 1;
        return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      });
  }, [busca, categoria, items, prioridade, status]);

  function atualizarLocal(ids: string[], patch: Partial<NotificacaoResumo>) {
    setItems((current) => current.map((item) => (ids.includes(item.id) ? { ...item, ...patch } : item)));
    setSelecionadas([]);
  }

  function acaoIndividual(id: string, acao: string) {
    startTransition(async () => {
      await fetch(`/api/notificacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });
      if (acao === "EXCLUIR") setItems((current) => current.filter((item) => item.id !== id));
      if (acao === "LIDA") atualizarLocal([id], { status: "LIDA", lidaEm: new Date().toISOString() });
      if (acao === "ARQUIVAR") atualizarLocal([id], { status: "ARQUIVADA", arquivadaEm: new Date().toISOString() });
    });
  }

  function acaoMassa(acao: string) {
    const ids = acao === "EXCLUIR_TUDO" ? [] : selecionadas;
    startTransition(async () => {
      const response = await fetch("/api/notificacoes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, ids }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel executar a acao.");
        return;
      }

      if (acao === "EXCLUIR" || acao === "EXCLUIR_TUDO") {
        setItems((current) => (acao === "EXCLUIR_TUDO" ? [] : current.filter((item) => !selecionadas.includes(item.id))));
      }
      if (acao === "LIDA") atualizarLocal(selecionadas, { status: "LIDA", lidaEm: new Date().toISOString() });
      if (acao === "ARQUIVAR") atualizarLocal(selecionadas, { status: "ARQUIVADA", arquivadaEm: new Date().toISOString() });
      setMensagem("Acao aplicada.");
    });
  }

  function sincronizar() {
    startTransition(async () => {
      const response = await fetch("/api/notificacoes/sincronizar", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      setMensagem(response.ok ? "Notificacoes sincronizadas." : data.error || "Nao foi possivel sincronizar.");
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Caixa de Entrada</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Notificacoes e acoes</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Pedidos aparecem primeiro. Alertas estrategicos respeitam o perfil de acesso.
            </p>
          </div>
          {perfil === "ACESSO_GERAL" && (
            <button
              type="button"
              onClick={sincronizar}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Sincronizar
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Resumo label="Novas" value={contadores.total} tone="slate" />
        <Resumo label="Pedidos" value={contadores.pedidos} tone="red" />
        <Resumo label="Reposicao" value={contadores.reposicao} tone="amber" />
        <Resumo label="Recomendacoes" value={contadores.recomendacoes} tone="blue" />
        <Resumo label="Campanhas" value={contadores.campanhas} tone="emerald" />
        <Resumo label="Precificacao" value={contadores.precificacao} tone="violet" />
      </section>

      {mensagem && <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{mensagem}</div>}

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setCategoria(tab.value)}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  categoria === tab.value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_150px_150px]">
            <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <select value={prioridade} onChange={(event) => setPrioridade(event.target.value)} className="h-11 rounded-2xl border border-slate-200 px-3 text-sm">
              {prioridades.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-2xl border border-slate-200 px-3 text-sm">
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelecionadas(filtradas.map((item) => item.id))} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Selecionar visiveis</button>
          <button type="button" onClick={() => acaoMassa("LIDA")} disabled={!selecionadas.length} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Marcar como lidas</button>
          <button type="button" onClick={() => acaoMassa("ARQUIVAR")} disabled={!selecionadas.length} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Arquivar</button>
          <button type="button" onClick={() => acaoMassa("EXCLUIR")} disabled={!selecionadas.length} className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Excluir selecionadas</button>
          <button type="button" onClick={() => acaoMassa("EXCLUIR_TUDO")} className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Excluir tudo</button>
        </div>
      </section>

      <section className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-500">
            Nenhuma notificacao encontrada.
          </div>
        ) : (
          filtradas.map((item) => (
            <article key={item.id} className={`rounded-3xl border p-4 shadow-sm ${categoriaClass(item.categoria)}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <input
                    type="checkbox"
                    checked={selecionadas.includes(item.id)}
                    onChange={(event) =>
                      setSelecionadas((current) =>
                        event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                      )
                    }
                    className="mt-2 h-4 w-4"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${prioridadeClass(item.prioridade)}`}>
                        {label(item.prioridade)}
                      </span>
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold">
                        {label(item.categoria)}
                      </span>
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
                        {label(item.status)}
                      </span>
                      <span className="text-xs font-semibold opacity-75">{dataCurta(item.criadoEm)}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-black text-slate-950">{item.titulo}</h2>
                    <p className="mt-1 max-w-4xl text-sm leading-6">{item.descricao}</p>
                    <p className="mt-2 text-xs font-semibold opacity-75">Origem: {label(item.origemTipo)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {item.linkAcao && (
                    <Link href={item.linkAcao} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
                      {item.acaoLabel || "Ir para acao"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <IconButton label="Lida" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => acaoIndividual(item.id, "LIDA")} />
                  <IconButton label="Arquivar" icon={<Archive className="h-4 w-4" />} onClick={() => acaoIndividual(item.id, "ARQUIVAR")} />
                  <IconButton label="Excluir" icon={<Trash2 className="h-4 w-4" />} onClick={() => acaoIndividual(item.id, "EXCLUIR")} />
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function Resumo({ label, value, tone }: { label: string; value: number; tone: string }) {
  const classes: Record<string, string> = {
    red: "bg-red-50 text-red-800 ring-red-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    blue: "bg-blue-50 text-blue-800 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    violet: "bg-violet-50 text-violet-800 ring-violet-100",
    slate: "bg-white text-slate-800 ring-slate-200",
  };

  return (
    <div className={`rounded-3xl p-4 shadow-sm ring-1 ${classes[tone] || classes.slate}`}>
      <div className="flex items-center gap-2 text-sm font-bold">
        <Bell className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white"
    >
      {icon}
      {label}
    </button>
  );
}
