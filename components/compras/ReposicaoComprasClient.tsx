"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PackagePlus, RefreshCcw, Search, Sparkles } from "lucide-react";
import type { RecomendacaoGerencialResumo } from "@/components/compras/RecomendacoesGerenciaisClient";

export type ReposicaoCompraItem = {
  id: string;
  cadastroId: string;
  tipo: "produto" | "adicional" | "embalagem";
  codigo: string;
  nome: string;
  detalhe: string;
  fornecedorPadrao: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueIdeal: number;
  sugestaoCompra: number;
  linkCompra: string | null;
  tamanhoAnel: string | null;
  statusComercial?: string | null;
  recomendacaoReposicao?: string | null;
  confiancaReposicao?: number | null;
  cicloAtual?: string | null;
  sellThrough?: number | null;
  acaoSugerida?: string | null;
  visualizacoesIntencao?: number | null;
  favoritosIntencao?: number | null;
  carrinhosIntencao?: number | null;
  scoreInteresse?: number | null;
  taxaConversao?: number | null;
  confiancaAnalise?: string | null;
  faseEmpresa?: string | null;
  faseEmpresaLabel?: string | null;
  loteDecisao?: string | null;
  loteGrandeLiberado?: boolean | null;
  loteSugestao?: string | null;
  loteSugestaoQuantidade?: number | null;
  loteMotivo?: string | null;
  loteConfianca?: string | null;
  margemAcao?: string | null;
  margemRecomendacao?: string | null;
  recomendacaoGerencial?: RecomendacaoGerencialResumo | null;
};

type Props = {
  itens: ReposicaoCompraItem[];
  exibirInteligenciaAdaptativa?: boolean;
};

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "produto", label: "Produtos / medidas" },
  { value: "adicional", label: "Itens adicionais" },
  { value: "embalagem", label: "Embalagens" },
] as const;

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelTipo(tipo: ReposicaoCompraItem["tipo"]) {
  if (tipo === "produto") return "Produto / medida";
  if (tipo === "embalagem") return "Embalagem";
  return "Item adicional";
}

function labelInteligencia(value: string | null | undefined) {
  const texto = String(value || "-").replaceAll("_", " ").toLowerCase();
  return texto.replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function labelAcaoLote(value: string | null | undefined) {
  const labels: Record<string, string> = {
    EXPOR_MAIS: "Expor mais",
    REVISAR_OFERTA: "Revisar oferta",
    REPOR_PEQUENO: "Repor pequeno",
    REPOR_MEDIO: "Repor lote medio",
    REPOR_LOTE_MEDIO: "Repor lote medio",
    LOTE_GRANDE: "Repor lote grande",
    REPOR_LOTE_GRANDE: "Repor lote grande",
    NAO_REPOR: "Nao recomprar ainda",
    OBSERVAR: "Nao recomprar ainda",
    LIQUIDAR_COM_CUIDADO: "Liquidar com cuidado",
  };

  return labels[String(value || "")] || labelInteligencia(value);
}

function numeroCurto(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function percentualDireto(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value || 0) / 100);
}

function situacao(item: ReposicaoCompraItem) {
  if (item.estoqueAtual <= 0) {
    return {
      label: "Zerado",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Repor",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function decisaoClasses(value: string | null | undefined) {
  if (value === "LIBERADO") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "CAUTELA") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function labelStatusRecomendacao(value: string | null | undefined) {
  if (value === "NOVA") return "Nova";
  if (value === "ACEITA") return "Aceita";
  if (value === "EM_EXECUCAO") return "Em execucao";
  if (value === "ADIADA") return "Adiada";
  return labelInteligencia(value);
}

function labelImpactoRecomendacao(status: string) {
  if (status === "POSITIVO") return "Impacto positivo";
  if (status === "PARCIAL") return "Impacto parcial";
  if (status === "NEUTRO") return "Impacto neutro";
  if (status === "NEGATIVO") return "Impacto negativo";
  if (status === "INCONCLUSIVO") return "Impacto inconclusivo";
  if (status === "AGUARDANDO_DADOS") return "Aguardando dados";
  return status.replaceAll("_", " ");
}

function compraHref(item: ReposicaoCompraItem) {
  const params = new URLSearchParams({
    itemTipo: item.tipo === "produto" ? "produto" : "adicional",
    itemId: item.cadastroId,
    quantidade: String(Math.max(item.sugestaoCompra, 1)),
  });

  if (item.tamanhoAnel && item.tamanhoAnel !== "UNICO") {
    params.set("tamanho", item.tamanhoAnel);
  }

  return `/compras/nova-v2?${params.toString()}`;
}

function ResumoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function ReposicaoComprasClient({
  itens,
  exibirInteligenciaAdaptativa = false,
}: Props) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPO_OPTIONS)[number]["value"]>(
    "todos"
  );
  const [fornecedor, setFornecedor] = useState("");

  const fornecedores = useMemo(() => {
    return Array.from(new Set(itens.map((item) => item.fornecedorPadrao)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return itens.filter((item) => {
      if (tipo !== "todos" && item.tipo !== tipo) return false;
      if (fornecedor && item.fornecedorPadrao !== fornecedor) return false;

      if (!termo) return true;

      return normalizarTexto(
        [
          item.codigo,
          item.nome,
          item.detalhe,
          item.fornecedorPadrao,
          item.statusComercial,
          item.recomendacaoReposicao,
          item.acaoSugerida,
          item.confiancaAnalise,
          item.faseEmpresaLabel,
          item.loteDecisao,
          item.loteSugestao,
          item.loteMotivo,
          item.margemRecomendacao,
          item.recomendacaoGerencial?.titulo,
          item.recomendacaoGerencial?.acaoSugerida,
          labelTipo(item.tipo),
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, fornecedor, itens, tipo]);

  const zerados = itens.filter((item) => item.estoqueAtual <= 0).length;
  const produtos = itens.filter((item) => item.tipo === "produto").length;
  const adicionais = itens.filter((item) => item.tipo === "adicional").length;
  const embalagens = itens.filter((item) => item.tipo === "embalagem").length;
  const itensComDecisao = itens.filter((item) => item.loteDecisao);
  const loteGrandeLiberado = itensComDecisao.filter(
    (item) => item.loteGrandeLiberado
  ).length;
  const loteGrandeBloqueado = itensComDecisao.filter(
    (item) => !item.loteGrandeLiberado
  ).length;
  const revisarOferta = itensComDecisao.filter(
    (item) => item.loteSugestao === "REVISAR_OFERTA"
  ).length;
  const reporPequenoOuMedio = itensComDecisao.filter((item) =>
    ["REPOR_PEQUENO", "REPOR_MEDIO", "REPOR_LOTE_MEDIO"].includes(
      String(item.loteSugestao || "")
    )
  ).length;

  function limparFiltros() {
    setBusca("");
    setTipo("todos");
    setFornecedor("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compras e Financeiro
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Reposição
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Itens com estoque baixo para reposição operacional. Esta visão
              sugere produtos, embalagens e insumos a recomprar e leva para
              compra de estoque, sem criar gasto financeiro.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {exibirInteligenciaAdaptativa ? (
              <Link
                href="/configuracoes/loja/vitrines-inteligentes"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
              >
                <Sparkles className="h-4 w-4" />
                Sugerir vitrine
              </Link>
            ) : null}
            <Link
              href="/compras"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Voltar para central
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          label="Itens para repor"
          value={String(itens.length)}
          description="Estoque atual menor ou igual ao mínimo padrão."
        />
        <ResumoCard
          label="Zerados"
          value={String(zerados)}
          description="Itens com estoque atual igual a zero."
        />
        <ResumoCard
          label="Produtos / medidas"
          value={String(produtos)}
          description="Inclui variações por tamanho quando existirem."
        />
        <ResumoCard
          label="Adicionais / embalagens"
          value={String(adicionais + embalagens)}
          description={`${adicionais} adicionais e ${embalagens} embalagens.`}
        />
      </div>

      {exibirInteligenciaAdaptativa && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            label="Lote grande liberado"
            value={String(loteGrandeLiberado)}
            description="Apenas produtos com ciclo e confiança suficientes."
          />
          <ResumoCard
            label="Lote grande bloqueado"
            value={String(loteGrandeBloqueado)}
            description="Uma venda ou amostra curta nunca libera compra grande."
          />
          <ResumoCard
            label="Repor pequeno / medio"
            value={String(reporPequenoOuMedio)}
            description="Reposicao seletiva para preservar caixa e aprendizado."
          />
          <ResumoCard
            label="Revisar oferta"
            value={String(revisarOferta)}
            description="Interesse sem conversao pede ajuste antes de recompra."
          />
        </div>
      )}

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto] lg:items-end">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Código, nome, fornecedor..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:text-sm"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Tipo</span>
            <select
              value={tipo}
              onChange={(event) =>
                setTipo(event.target.value as typeof tipo)
              }
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-slate-400 sm:text-sm"
            >
              {TIPO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Fornecedor
            </span>
            <select
              value={fornecedor}
              onChange={(event) => setFornecedor(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-slate-400 sm:text-sm"
            >
              <option value="">Todos</option>
              {fornecedores.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[1520px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold">Item</th>
              <th className="px-5 py-4 font-semibold">Tipo</th>
              <th className="px-5 py-4 font-semibold">Estoque atual</th>
              <th className="px-5 py-4 font-semibold">Inteligencia</th>
              <th className="px-5 py-4 font-semibold">Ciclo</th>
              <th className="px-5 py-4 font-semibold">Mínimo</th>
              <th className="px-5 py-4 font-semibold">Ideal</th>
              <th className="px-5 py-4 font-semibold">Sugestão</th>
              <th className="px-5 py-4 font-semibold">Fornecedor</th>
              <th className="px-5 py-4 text-right font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-slate-500">
                  Nenhum item de reposição encontrado para os filtros atuais.
                </td>
              </tr>
            ) : (
              itensFiltrados.map((item) => {
                const status = situacao(item);

                return (
                  <tr key={item.id} className="text-slate-700">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-950">
                          {item.nome}
                        </span>
                        <span className="mt-1 text-xs text-slate-500">
                          {item.codigo} · {item.detalhe}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">{labelTipo(item.tipo)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {item.estoqueAtual} un. · {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {exibirInteligenciaAdaptativa && item.statusComercial ? (
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {labelInteligencia(item.statusComercial)}
                          </span>
                          <p className="text-xs font-semibold text-slate-900">
                            {labelInteligencia(item.recomendacaoReposicao)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Confianca {numeroCurto(item.confiancaReposicao)}%
                          </p>
                          <p className="text-xs text-slate-500">
                            Interesse {numeroCurto(item.scoreInteresse)}/100 -{" "}
                            {labelInteligencia(item.confiancaAnalise)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {numeroCurto(item.visualizacoesIntencao)} views -{" "}
                            {numeroCurto(item.favoritosIntencao)} fav. -{" "}
                            {numeroCurto(item.carrinhosIntencao)} carrinho
                          </p>
                          <p className="text-xs text-slate-500">
                            Conversao {percentualDireto(item.taxaConversao)}
                          </p>
                          {item.loteDecisao && (
                            <div className="pt-1">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${decisaoClasses(
                                  item.loteDecisao
                                )}`}
                              >
                                Lote grande:{" "}
                                {item.loteGrandeLiberado
                                  ? "liberado"
                                  : labelInteligencia(item.loteDecisao)}
                              </span>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.faseEmpresaLabel} -{" "}
                                {labelInteligencia(item.loteConfianca)}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Sem leitura comercial
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {item.tipo === "produto" ? (
                        <div className="max-w-[220px] space-y-1 text-xs text-slate-600">
                          {exibirInteligenciaAdaptativa ? (
                            <>
                              <p>
                                Ciclo atual:{" "}
                                <span className="font-semibold text-slate-900">
                                  {item.cicloAtual || "-"}
                                </span>
                              </p>
                              <p>Sell-through: {percentualDireto(item.sellThrough)}</p>
                              {item.acaoSugerida && (
                                <p className="leading-5 text-slate-500">
                                  {item.acaoSugerida}
                                </p>
                              )}
                              {item.loteMotivo && (
                                <p className="leading-5 font-semibold text-slate-700">
                                  {item.loteMotivo}
                                </p>
                              )}
                              {item.loteSugestao && (
                                <p className="text-slate-500">
                                  Acao sugerida:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {labelAcaoLote(item.loteSugestao)}
                                  </span>
                                  {item.loteSugestaoQuantidade
                                    ? ` (${item.loteSugestaoQuantidade} un.)`
                                    : ""}
                                </p>
                              )}
                              {item.margemRecomendacao && (
                                <p className="leading-5 text-slate-500">
                                  {item.margemRecomendacao}
                                </p>
                              )}
                              {item.recomendacaoGerencial && (
                                <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2">
                                  <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                                    Recomendacao{" "}
                                    {labelStatusRecomendacao(
                                      item.recomendacaoGerencial.status
                                    )}
                                  </p>
                                  {item.recomendacaoGerencial.impactos?.[0] && (
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                                      {labelImpactoRecomendacao(
                                        item.recomendacaoGerencial.impactos[0]
                                          .statusImpacto
                                      )}
                                    </p>
                                  )}
                                  {item.recomendacaoGerencial.campanhas?.[0] && (
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                                      Campanha{" "}
                                      {item.recomendacaoGerencial.campanhas[0].status.toLowerCase()}
                                    </p>
                                  )}
                                  <p className="mt-1 leading-5 font-semibold text-blue-900">
                                    {item.recomendacaoGerencial.titulo}
                                  </p>
                                  <p className="mt-1 leading-5 text-blue-800">
                                    {item.recomendacaoGerencial.acaoSugerida ||
                                      item.recomendacaoGerencial.descricao}
                                  </p>
                                  <Link
                                    href={`/compras/recomendacoes?produtoId=${item.cadastroId}`}
                                    className="mt-2 inline-flex min-h-8 items-center rounded-2xl bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                                  >
                                    Acompanhar decisao
                                  </Link>
                                  <Link
                                    href="/compras/campanhas"
                                    className="ml-2 mt-2 inline-flex min-h-8 items-center rounded-2xl bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                                  >
                                    {item.recomendacaoGerencial.campanhas?.[0]
                                      ? "Ver campanha"
                                      : "Planejar campanha"}
                                  </Link>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Controle operacional
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Controle operacional
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">{item.estoqueMinimo} un.</td>
                    <td className="px-5 py-4">{item.estoqueIdeal} un.</td>
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {item.sugestaoCompra} un.
                    </td>
                    <td className="px-5 py-4">{item.fornecedorPadrao}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {item.linkCompra && (
                          <a
                            href={item.linkCompra}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Link
                          </a>
                        )}
                        <Link
                          href={compraHref(item)}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          <PackagePlus className="h-4 w-4" />
                          Criar compra de estoque
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
