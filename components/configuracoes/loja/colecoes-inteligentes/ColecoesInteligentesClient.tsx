"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ExternalLink, Pin, RefreshCcw, Search, ShieldCheck, Trash2 } from "lucide-react";

type ProdutoColecao = {
  id: string;
  produtoId: string;
  ordem: number;
  score: number;
  status: string;
  motivo: string | null;
  fixado: boolean;
  produto: {
    id: string;
    codigoInterno: string;
    nome: string;
    imagemUrl: string | null;
    imagemHoverUrl: string | null;
    categoria: string;
    precoVenda: number;
  };
};

type Colecao = {
  id: string;
  codigo: string;
  nome: string;
  slug: string;
  descricao: string | null;
  tipo: string;
  status: string;
  modoAtualizacao: string;
  geradaEm: string | null;
  produtos: ProdutoColecao[];
};

const statusOptions = ["TODAS", "RASCUNHO", "ATIVA", "PAUSADA", "ARQUIVADA"];
const tipoOptions = ["TODOS", "EM_DESTAQUE", "ALTA_INTENCAO", "POUCO_TESTADOS", "CAMPEOES_PROVAVEIS", "ESTOQUE_PARADO", "PARA_PRESENTEAR", "CAMPANHA_ATIVA", "MARGEM_PROTEGIDA", "NOVIDADES", "GIRO_CONTROLADO"];

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (item) => item.toUpperCase());
}

function statusClass(status: string) {
  if (status === "ATIVA") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "PAUSADA") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "ARQUIVADA") return "bg-slate-100 text-slate-500 ring-slate-200";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

export default function ColecoesInteligentesClient({ colecoes: colecoesIniciais }: { colecoes: Colecao[] }) {
  const [colecoes, setColecoes] = useState(colecoesIniciais);
  const [selecionadaId, setSelecionadaId] = useState(colecoesIniciais[0]?.id || "");
  const [status, setStatus] = useState("TODAS");
  const [tipo, setTipo] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isPending, startTransition] = useTransition();

  const resumo = useMemo(() => {
    const produtos = colecoes.flatMap((colecao) => colecao.produtos);
    return {
      total: colecoes.length,
      ativas: colecoes.filter((colecao) => colecao.status === "ATIVA").length,
      sugeridos: produtos.filter((produto) => produto.status === "SUGERIDO").length,
      aprovados: produtos.filter((produto) => produto.status === "APROVADO").length,
    };
  }, [colecoes]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return colecoes.filter((colecao) => {
      const bateStatus = status === "TODAS" || colecao.status === status;
      const bateTipo = tipo === "TODOS" || colecao.tipo === tipo;
      const bateBusca = !termo || `${colecao.nome} ${colecao.descricao || ""} ${colecao.tipo}`.toLowerCase().includes(termo);
      return bateStatus && bateTipo && bateBusca;
    });
  }, [busca, colecoes, status, tipo]);

  const selecionada = colecoes.find((colecao) => colecao.id === selecionadaId) || filtradas[0] || colecoes[0];

  function recarregar() {
    startTransition(async () => {
      const response = await fetch("/api/configuracoes/loja/colecoes-inteligentes", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.colecoes) setColecoes(data.colecoes);
    });
  }

  function gerar() {
    startTransition(async () => {
      const response = await fetch("/api/configuracoes/loja/colecoes-inteligentes/gerar", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      setMensagem(response.ok ? `Colecoes geradas: ${data.resultado?.colecoes || 0}.` : data.error || "Nao foi possivel gerar.");
      recarregar();
    });
  }

  function atualizarColecao(id: string, patch: Record<string, unknown>) {
    startTransition(async () => {
      const response = await fetch(`/api/configuracoes/loja/colecoes-inteligentes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel atualizar.");
        return;
      }
      setColecoes((current) => current.map((colecao) => (colecao.id === id ? { ...colecao, ...data.colecao } : colecao)));
      setMensagem("Colecao atualizada.");
    });
  }

  function acaoProduto(colecaoId: string, produtoId: string, acao: "aprovar" | "remover" | "fixar", body?: Record<string, unknown>) {
    startTransition(async () => {
      const response = await fetch(`/api/configuracoes/loja/colecoes-inteligentes/${colecaoId}/produtos/${produtoId}/${acao}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel executar acao.");
        return;
      }
      recarregar();
      setMensagem("Produto atualizado na colecao.");
    });
  }

  return (
    <div className="space-y-5">
      <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Loja Online</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Colecoes Inteligentes</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Gere, aprove e use grupos inteligentes de produtos como fonte no builder da loja.
            </p>
          </div>
          <button
            type="button"
            onClick={gerar}
            disabled={isPending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
          >
            <RefreshCcw className="h-4 w-4" />
            Gerar colecoes inteligentes
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Resumo label="Colecoes" value={resumo.total} />
        <Resumo label="Ativas" value={resumo.ativas} />
        <Resumo label="Sugeridos" value={resumo.sugeridos} />
        <Resumo label="Aprovados" value={resumo.aprovados} />
      </section>

      {mensagem ? <div className="border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{mensagem}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="grid gap-2 bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <label className="flex min-h-10 items-center gap-2 border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar colecao" className="min-w-0 flex-1 text-sm outline-none" />
            </label>
            <select value={tipo} onChange={(event) => setTipo(event.target.value)} className="h-10 border border-slate-200 px-3 text-sm">
              {tipoOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-slate-200 px-3 text-sm">
              {statusOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          {filtradas.map((colecao) => (
            <button
              key={colecao.id}
              type="button"
              onClick={() => setSelecionadaId(colecao.id)}
              className={`w-full border p-4 text-left transition ${selecionada?.id === colecao.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"}`}
            >
              <span className="block text-sm font-black">{colecao.nome}</span>
              <span className="mt-1 block text-xs opacity-70">{label(colecao.tipo)} | {colecao.produtos.length} produtos</span>
            </button>
          ))}

          {filtradas.length === 0 ? (
            <div className="border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
              Nenhuma colecao encontrada para os filtros.
            </div>
          ) : null}
        </aside>

        {selecionada ? (
          <main className="space-y-4">
            <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-black ring-1 ${statusClass(selecionada.status)}`}>{label(selecionada.status)}</span>
                    <span className="bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{label(selecionada.tipo)}</span>
                    <span className="bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{selecionada.slug}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">{selecionada.nome}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{selecionada.descricao}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Atualizada: {selecionada.geradaEm ? new Date(selecionada.geradaEm).toLocaleString("pt-BR") : "Ainda nao gerada"}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" onClick={() => atualizarColecao(selecionada.id, { status: "ATIVA" })} className="inline-flex flex-1 items-center justify-center gap-2 bg-emerald-600 px-3 py-2 text-xs font-black text-white sm:flex-none"><ShieldCheck className="h-4 w-4" /> Ativar</button>
                  <button type="button" onClick={() => atualizarColecao(selecionada.id, { status: "PAUSADA" })} className="flex-1 border border-amber-200 px-3 py-2 text-xs font-black text-amber-700 sm:flex-none">Pausar</button>
                  <button type="button" onClick={() => atualizarColecao(selecionada.id, { status: "ARQUIVADA" })} className="flex-1 border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 sm:flex-none">Arquivar</button>
                  {selecionada.status === "ATIVA" ? (
                    <Link href={`/loja/colecao/${selecionada.slug}`} target="_blank" className="inline-flex flex-1 items-center justify-center gap-2 border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 sm:flex-none">
                      <ExternalLink className="h-4 w-4" /> Ver pagina
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 hidden gap-2 text-xs font-black uppercase text-slate-500 md:grid md:grid-cols-[1fr_110px_110px_220px]">
                <span>Produto</span><span>Score</span><span>Status</span><span>Acoes</span>
              </div>
              <div className="space-y-2">
                {selecionada.produtos.map((item) => (
                  <div key={item.id} className="grid gap-3 border border-slate-200 p-3 md:grid-cols-[1fr_110px_110px_220px] md:items-center">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-slate-100">
                        {item.produto.imagemUrl || item.produto.imagemHoverUrl ? (
                          <Image
                            src={item.produto.imagemUrl || item.produto.imagemHoverUrl || ""}
                            alt={item.produto.nome}
                            fill
                            sizes="56px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{item.produto.nome}</p>
                        <p className="text-xs text-slate-500">{item.produto.codigoInterno} | {item.produto.categoria}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.motivo}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-slate-800">{Math.round(item.score)}</span>
                    <span className="text-xs font-black text-slate-600">{label(item.status)}{item.fixado ? " | Fixado" : ""}</span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => acaoProduto(selecionada.id, item.produtoId, "aprovar")} className="inline-flex h-9 w-9 items-center justify-center bg-emerald-50 text-emerald-700" title="Aprovar"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => acaoProduto(selecionada.id, item.produtoId, "fixar", { fixado: !item.fixado })} className="inline-flex h-9 w-9 items-center justify-center bg-blue-50 text-blue-700" title="Fixar"><Pin className="h-4 w-4" /></button>
                      <button type="button" onClick={() => acaoProduto(selecionada.id, item.produtoId, "remover")} className="inline-flex h-9 w-9 items-center justify-center bg-red-50 text-red-700" title="Remover"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                {selecionada.produtos.length === 0 ? <div className="border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">Nenhum produto sugerido ainda.</div> : null}
              </div>
            </section>
          </main>
        ) : (
          <div className="bg-white p-8 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">Gere colecoes para comecar.</div>
        )}
      </section>
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}
