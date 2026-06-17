"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Filter,
  Search,
  ShieldCheck,
  Tag,
} from "lucide-react";

type CampanhaResumo = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  status: string;
  descontoSugerido: number | null;
  descontoSeguro: boolean;
  alertaDesconto: string | null;
};

export type PrecificacaoProdutoResumo = {
  produtoId: string;
  codigoInterno: string;
  nome: string;
  categoria: string | null;
  precoVenda: number;
  precoAtual: number;
  precoPromocional: number | null;
  descontoAtivo: boolean;
  custoEstimado: number;
  custoAusente: boolean;
  margemBrutaValor: number;
  margemBrutaPct: number;
  margemMinimaDesejadaPct: number;
  precoMinimoSeguro: number;
  descontoMaximoSeguroPct: number;
  estoqueAtual: number;
  sellThrough: number;
  statusComercial: string;
  scoreInteresse: number;
  scoreConversao: number;
  statusReposicao: string;
  faseEmpresa: string;
  campanhasAbertas: CampanhaResumo[];
  classificacao: string;
  recomendacao: string;
  motivo: string;
  acaoSugerida: string;
  descontoPermitido: boolean;
  protecaoMargem: boolean;
};

type SimulacaoResultado = {
  produtoId: string;
  descontoPercentual: number;
  novoPreco: number;
  novaMargemValor: number;
  novaMargemPct: number;
  risco: string;
  recomendacao: string;
  motivo: string;
};

type Props = {
  produtos: PrecificacaoProdutoResumo[];
  resumo: Record<string, number>;
  faseEmpresa: string;
  faseLabel: string;
  confiancaAnalise: string;
};

const CLASSIFICACOES = [
  { value: "TODAS", label: "Todas" },
  { value: "MARGEM_PROTEGIDA", label: "Margem protegida" },
  { value: "DESCONTO_BLOQUEADO", label: "Desconto bloqueado" },
  { value: "DESCONTO_CONTROLADO", label: "Desconto controlado" },
  { value: "REVISAR_PRECO", label: "Revisar preco" },
  { value: "PRECO_CRITICO", label: "Preco critico" },
  { value: "PODE_VIRAR_COMBO", label: "Pode virar combo" },
  { value: "DADOS_INSUFICIENTES", label: "Dados insuficientes" },
] as const;

function moeda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function percentual(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0))}%`;
}

function numeroCurto(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function labelClassificacao(value: string) {
  return CLASSIFICACOES.find((item) => item.value === value)?.label || value.replaceAll("_", " ");
}

function labelTexto(value: string | null | undefined) {
  const texto = String(value || "-").replaceAll("_", " ").toLowerCase();
  return texto.replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function classificacaoClasses(value: string) {
  if (value === "MARGEM_PROTEGIDA") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "DESCONTO_CONTROLADO") return "border-blue-200 bg-blue-50 text-blue-800";
  if (value === "REVISAR_PRECO" || value === "PODE_VIRAR_COMBO") return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "PRECO_CRITICO") return "border-red-200 bg-red-50 text-red-800";
  if (value === "DADOS_INSUFICIENTES") return "border-violet-200 bg-violet-50 text-violet-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function PrecificacaoInteligenteClient({
  produtos,
  resumo,
  faseLabel,
  confiancaAnalise,
}: Props) {
  const [busca, setBusca] = useState("");
  const [classificacao, setClassificacao] = useState("TODAS");
  const [categoria, setCategoria] = useState("TODAS");
  const [campanha, setCampanha] = useState("TODAS");
  const [estoque, setEstoque] = useState("TODOS");
  const [margem, setMargem] = useState("TODAS");
  const [produtoSimulado, setProdutoSimulado] = useState(produtos[0]?.produtoId || "");
  const [desconto, setDesconto] = useState("10");
  const [novoPreco, setNovoPreco] = useState("");
  const [simulacao, setSimulacao] = useState<SimulacaoResultado | null>(null);
  const [erroSimulacao, setErroSimulacao] = useState("");

  const categorias = useMemo(() => {
    return Array.from(new Set(produtos.map((produto) => produto.categoria || "Sem categoria")))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return produtos.filter((produto) => {
      if (classificacao !== "TODAS" && produto.classificacao !== classificacao) return false;
      if (categoria !== "TODAS" && (produto.categoria || "Sem categoria") !== categoria) return false;
      if (campanha === "COM_CAMPANHA" && produto.campanhasAbertas.length === 0) return false;
      if (campanha === "SEM_CAMPANHA" && produto.campanhasAbertas.length > 0) return false;
      if (estoque === "BAIXO" && produto.estoqueAtual > 2) return false;
      if (estoque === "COM_ESTOQUE" && produto.estoqueAtual <= 0) return false;
      if (margem === "CRITICA" && produto.margemBrutaPct >= 25) return false;
      if (margem === "SAUDAVEL" && produto.margemBrutaPct < produto.margemMinimaDesejadaPct) return false;
      if (!termo) return true;

      return normalizarTexto(
        [
          produto.codigoInterno,
          produto.nome,
          produto.categoria,
          produto.statusComercial,
          produto.recomendacao,
          produto.motivo,
          produto.acaoSugerida,
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, campanha, categoria, classificacao, estoque, margem, produtos]);

  async function simular() {
    setErroSimulacao("");
    setSimulacao(null);

    const response = await fetch("/api/compras/precificacao/simular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produtoId: produtoSimulado,
        descontoPercentual: desconto ? Number(desconto) : undefined,
        novoPreco: novoPreco ? Number(novoPreco) : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErroSimulacao(data.error || "Nao foi possivel simular.");
      return;
    }

    setSimulacao(data.simulacao);
  }

  function limparFiltros() {
    setBusca("");
    setClassificacao("TODAS");
    setCategoria("TODAS");
    setCampanha("TODAS");
    setEstoque("TODOS");
    setMargem("TODAS");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Margem e desconto
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Precificacao e Descontos
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Analise margem, preco minimo, desconto seguro e protecao de margem
              por produto. Esta tela nao altera precos, cupons ou campanhas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Fase: {faseLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Confianca: {labelTexto(confiancaAnalise)}
            </span>
            <Link
              href="/compras"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Voltar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 shadow-sm">
        A empresa esta em fase inicial e muitos produtos ainda tem pouca
        amostra. Por isso, recomendacoes individuais so serao geradas quando
        houver sinais reais de venda, intencao, exposicao suficiente ou risco
        comprovado.
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard label="Margem protegida" value={resumo.MARGEM_PROTEGIDA || 0} description="Produtos onde desconto deve ser evitado." />
        <ResumoCard label="Desconto bloqueado" value={resumo.DESCONTO_BLOQUEADO || 0} description="Sem justificativa segura para desconto." />
        <ResumoCard label="Desconto controlado" value={resumo.DESCONTO_CONTROLADO || 0} description="Possivel com limite e janela curta." />
        <ResumoCard label="Preco critico" value={resumo.PRECO_CRITICO || 0} description="Margem abaixo da faixa minima." />
        <ResumoCard label="Sem custo" value={resumo.SEM_CUSTO || 0} description="Sem margem confiavel." />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_180px_180px_160px_160px_160px_auto] xl:items-end">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Produto, codigo ou motivo"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <FiltroSelect label="Classificacao" value={classificacao} onChange={setClassificacao} options={CLASSIFICACOES} />
          <FiltroSelect label="Categoria" value={categoria} onChange={setCategoria} options={[{ value: "TODAS", label: "Todas" }, ...categorias.map((item) => ({ value: item, label: item }))]} />
          <FiltroSelect label="Campanha" value={campanha} onChange={setCampanha} options={[{ value: "TODAS", label: "Todas" }, { value: "COM_CAMPANHA", label: "Com campanha" }, { value: "SEM_CAMPANHA", label: "Sem campanha" }]} />
          <FiltroSelect label="Estoque" value={estoque} onChange={setEstoque} options={[{ value: "TODOS", label: "Todos" }, { value: "BAIXO", label: "Baixo" }, { value: "COM_ESTOQUE", label: "Com estoque" }]} />
          <FiltroSelect label="Margem" value={margem} onChange={setMargem} options={[{ value: "TODAS", label: "Todas" }, { value: "CRITICA", label: "Critica" }, { value: "SAUDAVEL", label: "Saudavel" }]} />
          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Simulador de desconto</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Simule desconto ou novo preco sem salvar alteracao no produto.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(220px,1fr)_160px_160px_auto] lg:items-end">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Produto</span>
            <select
              value={produtoSimulado}
              onChange={(event) => setProdutoSimulado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              {produtos.map((produto) => (
                <option key={produto.produtoId} value={produto.produtoId}>
                  {produto.codigoInterno} - {produto.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Desconto %</span>
            <input
              value={desconto}
              onChange={(event) => setDesconto(event.target.value)}
              inputMode="decimal"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Novo preco</span>
            <input
              value={novoPreco}
              onChange={(event) => setNovoPreco(event.target.value)}
              inputMode="decimal"
              placeholder="Opcional"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={simular}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Calculator className="h-4 w-4" />
            Simular
          </button>
        </div>

        {erroSimulacao && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erroSimulacao}
          </div>
        )}
        {simulacao && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <InfoBox label="Novo preco" value={moeda(simulacao.novoPreco)} />
            <InfoBox label="Nova margem" value={`${moeda(simulacao.novaMargemValor)} (${percentual(simulacao.novaMargemPct)})`} />
            <InfoBox label="Risco" value={simulacao.risco} />
            <InfoBox label="Recomendacao" value={labelTexto(simulacao.recomendacao)} />
            <div className="md:col-span-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {simulacao.motivo}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        {produtosFiltrados.map((produto) => (
          <ProdutoCard key={produto.produtoId} produto={produto} />
        ))}
      </section>
    </div>
  );
}

function ProdutoCard({ produto }: { produto: PrecificacaoProdutoResumo }) {
  return (
    <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${classificacaoClasses(produto.classificacao)}`}>
              {labelClassificacao(produto.classificacao)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {produto.codigoInterno}
            </span>
            {produto.custoAusente && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
                Sem custo
              </span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-black text-slate-950">{produto.nome}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            {produto.recomendacao}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/produtos/${produto.produtoId}`}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Ver produto
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <InfoBox label="Preco atual" value={moeda(produto.precoAtual)} />
        <InfoBox label="Custo" value={produto.custoAusente ? "Sem custo" : moeda(produto.custoEstimado)} />
        <InfoBox label="Margem" value={`${moeda(produto.margemBrutaValor)} (${percentual(produto.margemBrutaPct)})`} />
        <InfoBox label="Preco minimo seguro" value={produto.custoAusente ? "-" : moeda(produto.precoMinimoSeguro)} />
        <InfoBox label="Desconto maximo seguro" value={percentual(produto.descontoMaximoSeguroPct)} />
        <InfoBox label="Estoque" value={`${numeroCurto(produto.estoqueAtual)} un.`} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InfoBox label="Motivo" value={produto.motivo} />
        <InfoBox label="Acao sugerida" value={produto.acaoSugerida} />
        <InfoBox
          label="Sinais comerciais"
          value={`${labelTexto(produto.statusComercial)} · interesse ${numeroCurto(produto.scoreInteresse)} · conversao ${numeroCurto(produto.scoreConversao)}`}
        />
      </div>

      {produto.campanhasAbertas.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Tag className="h-3.5 w-3.5" />
            Campanhas abertas
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {produto.campanhasAbertas.map((campanha) => (
              <div key={campanha.id} className="rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                <p className="font-bold text-slate-900">{campanha.titulo}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {labelTexto(campanha.tipo)} · desconto sugerido {percentual(campanha.descontoSugerido || 0)}
                </p>
                {campanha.alertaDesconto ? (
                  <p className="mt-2 flex gap-2 text-xs font-semibold leading-5 text-red-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {campanha.alertaDesconto}
                  </p>
                ) : (
                  <p className="mt-2 flex gap-2 text-xs font-semibold leading-5 text-emerald-700">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Desconto sugerido dentro da faixa segura.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function ResumoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
