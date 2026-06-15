"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Filter,
  Package,
  RefreshCcw,
  Search,
  Warehouse,
} from "lucide-react";

export type ResumoEstoqueItem = {
  id: string;
  cadastroId: string;
  tipo: "PRODUTO" | "ADICIONAL";
  codigo: string;
  codigoFornecedor: string | null;
  nome: string;
  categoria: string | null;
  fornecedor: string;
  tamanhoAnel: string | null;
  quantidadeAtual: number;
  valorAcumulado: number;
  custoMedio: number;
  custoBase: number;
  precoVenda: number | null;
  margemAplicada: number | null;
  statusCadastro: string;
  ativo: boolean;
  situacao: "ZERADO" | "REPOR" | "ATENCAO" | "OK";
  atualizadoEm: string;
};

type ResumoEstoqueClientProps = {
  itens: ResumoEstoqueItem[];
};

const FILTRO_TODOS = "TODOS";

const SITUACOES = [
  { value: "TODOS", label: "Todas" },
  { value: "ZERADO", label: "Zerado" },
  { value: "REPOR", label: "Repor" },
  { value: "ATENCAO", label: "Atenção" },
  { value: "OK", label: "OK" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function dataCurta(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleDateString("pt-BR");
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function nomeComTamanho(item: ResumoEstoqueItem) {
  if (!item.tamanhoAnel) {
    return item.nome;
  }

  return `${item.nome} · Tam. ${item.tamanhoAnel}`;
}

function itemMeta(item: ResumoEstoqueItem) {
  return [
    item.codigo,
    item.tipo === "PRODUTO" ? "Produto" : "Item adicional",
    item.categoria,
    item.tamanhoAnel ? `Tam. ${item.tamanhoAnel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function labelSituacao(situacao: ResumoEstoqueItem["situacao"]) {
  if (situacao === "ZERADO") return "Zerado";
  if (situacao === "REPOR") return "Repor";
  if (situacao === "ATENCAO") return "Atenção";
  return "OK";
}

function situacaoClass(situacao: ResumoEstoqueItem["situacao"]) {
  if (situacao === "ZERADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (situacao === "REPOR") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (situacao === "ATENCAO") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function tipoClass(tipo: ResumoEstoqueItem["tipo"]) {
  if (tipo === "PRODUTO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function statusClass(status: string) {
  if (status === "ATIVO" || status === "NOVO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "INATIVO") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (status === "NA_LIXEIRA") {
    return "border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function labelStatus(status: string) {
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Inativo";
  if (status === "NA_LIXEIRA") return "Na lixeira";
  if (status === "NOVO") return "Novo";

  return status.replaceAll("_", " ");
}

function ResumoCard({
  label,
  value,
  description,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone?: "emerald" | "blue" | "amber" | "violet" | "red" | "indigo" | "slate";
}) {
  const tones = {
    emerald: {
      card: "bg-emerald-50 ring-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      label: "text-emerald-700",
      value: "text-emerald-950",
      description: "text-emerald-800/80",
    },
    blue: {
      card: "bg-blue-50 ring-blue-200",
      icon: "bg-blue-100 text-blue-700",
      label: "text-blue-700",
      value: "text-blue-950",
      description: "text-blue-800/80",
    },
    amber: {
      card: "bg-amber-50 ring-amber-200",
      icon: "bg-amber-100 text-amber-700",
      label: "text-amber-700",
      value: "text-amber-950",
      description: "text-amber-800/80",
    },
    violet: {
      card: "bg-violet-50 ring-violet-200",
      icon: "bg-violet-100 text-violet-700",
      label: "text-violet-700",
      value: "text-violet-950",
      description: "text-violet-800/80",
    },
    red: {
      card: "bg-red-50 ring-red-200",
      icon: "bg-red-100 text-red-700",
      label: "text-red-700",
      value: "text-red-950",
      description: "text-red-800/80",
    },
    indigo: {
      card: "bg-indigo-50 ring-indigo-200",
      icon: "bg-indigo-100 text-indigo-700",
      label: "text-indigo-700",
      value: "text-indigo-950",
      description: "text-indigo-800/80",
    },
    slate: {
      card: "bg-white ring-slate-200",
      icon: "bg-slate-100 text-slate-700",
      label: "text-slate-500",
      value: "text-slate-950",
      description: "text-slate-500",
    },
  };

  const toneClass = tones[tone];

  return (
    <div className={`rounded-3xl p-5 shadow-sm ring-1 ${toneClass.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${toneClass.label}`}>{label}</p>

          <p className={`mt-2 text-2xl font-bold ${toneClass.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass.icon}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-4 text-sm leading-6 ${toneClass.description}`}>
        {description}
      </p>
    </div>
  );
}

function TabelaTitulo({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{descricao}</p>
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return <div className="px-5 py-10 text-sm text-slate-500">{texto}</div>;
}

export default function ResumoEstoqueClient({
  itens,
}: ResumoEstoqueClientProps) {
  const [busca, setBusca] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState(FILTRO_TODOS);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(FILTRO_TODOS);
  const [fornecedorSelecionado, setFornecedorSelecionado] =
    useState(FILTRO_TODOS);
  const [situacaoSelecionada, setSituacaoSelecionada] = useState(FILTRO_TODOS);

  const categoriasDisponiveis = useMemo(() => {
    const categorias = new Set<string>();

    itens.forEach((item) => {
      if (item.categoria) {
        categorias.add(item.categoria);
      }
    });

    return Array.from(categorias).sort((a, b) => a.localeCompare(b));
  }, [itens]);

  const fornecedoresDisponiveis = useMemo(() => {
    const fornecedores = new Set<string>();

    itens.forEach((item) => {
      if (item.fornecedor) {
        fornecedores.add(item.fornecedor);
      }
    });

    return Array.from(fornecedores).sort((a, b) => a.localeCompare(b));
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);

    return itens.filter((item) => {
      if (tipoSelecionado !== FILTRO_TODOS && item.tipo !== tipoSelecionado) {
        return false;
      }

      if (
        categoriaSelecionada !== FILTRO_TODOS &&
        item.categoria !== categoriaSelecionada
      ) {
        return false;
      }

      if (
        fornecedorSelecionado !== FILTRO_TODOS &&
        item.fornecedor !== fornecedorSelecionado
      ) {
        return false;
      }

      if (
        situacaoSelecionada !== FILTRO_TODOS &&
        item.situacao !== situacaoSelecionada
      ) {
        return false;
      }

      if (!buscaNormalizada) {
        return true;
      }

      const texto = normalizarTexto(
        [
          item.codigo,
          item.codigoFornecedor,
          item.nome,
          item.categoria,
          item.fornecedor,
          item.tamanhoAnel,
          item.tamanhoAnel ? `tam ${item.tamanhoAnel}` : null,
          item.tipo,
          item.situacao,
          item.statusCadastro,
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [
    busca,
    categoriaSelecionada,
    fornecedorSelecionado,
    itens,
    situacaoSelecionada,
    tipoSelecionado,
  ]);

  const resumo = useMemo(() => {
    const produtos = itensFiltrados.filter((item) => item.tipo === "PRODUTO");
    const adicionais = itensFiltrados.filter(
      (item) => item.tipo === "ADICIONAL"
    );

    const valorTotal = itensFiltrados.reduce(
      (total: number, item) => total + item.valorAcumulado,
      0
    );

    const quantidadeTotal = itensFiltrados.reduce(
      (total: number, item) => total + item.quantidadeAtual,
      0
    );

    const zerados = itensFiltrados.filter(
      (item) => item.situacao === "ZERADO"
    );

    const baixoOuAtencao = itensFiltrados.filter(
      (item) => item.situacao === "REPOR" || item.situacao === "ATENCAO"
    );

    const aneisPorTamanho = itensFiltrados.filter(
      (item) => item.tipo === "PRODUTO" && item.tamanhoAnel
    );

    const maiorValor = [...itensFiltrados].sort(
      (a, b) => b.valorAcumulado - a.valorAcumulado
    )[0];

    return {
      produtos: produtos.length,
      adicionais: adicionais.length,
      valorTotal,
      quantidadeTotal,
      zerados: zerados.length,
      baixoOuAtencao: baixoOuAtencao.length,
      aneisPorTamanho: aneisPorTamanho.length,
      maiorValor,
    };
  }, [itensFiltrados]);

  const rankingValor = useMemo(() => {
    return [...itensFiltrados]
      .sort((a, b) => b.valorAcumulado - a.valorAcumulado)
      .slice(0, 10);
  }, [itensFiltrados]);

  const rankingMenorEstoque = useMemo(() => {
    return [...itensFiltrados]
      .sort((a, b) => {
        if (a.quantidadeAtual !== b.quantidadeAtual) {
          return a.quantidadeAtual - b.quantidadeAtual;
        }

        return b.valorAcumulado - a.valorAcumulado;
      })
      .slice(0, 10);
  }, [itensFiltrados]);

  const itensCriticos = useMemo(() => {
    return itensFiltrados
      .filter((item) => item.situacao !== "OK")
      .sort((a, b) => a.quantidadeAtual - b.quantidadeAtual)
      .slice(0, 12);
  }, [itensFiltrados]);

  function limparFiltros() {
    setBusca("");
    setTipoSelecionado(FILTRO_TODOS);
    setCategoriaSelecionada(FILTRO_TODOS);
    setFornecedorSelecionado(FILTRO_TODOS);
    setSituacaoSelecionada(FILTRO_TODOS);
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Resumo
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Resumo de Estoque
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Analise valor parado em estoque, itens críticos, anéis por tamanho,
              produtos principais e itens adicionais em uma visão gerencial.
            </p>
          </div>

          <Link
            href="/estoque"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ver estoque operacional
          </Link>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4" />
              Filtros
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Busque por produto, código, fornecedor, categoria, situação ou
              tamanho de anel.
            </p>
          </div>

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Busca geral
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, código, fornecedor, Tam. 16..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Tipo</span>

            <select
              value={tipoSelecionado}
              onChange={(event) => setTipoSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value={FILTRO_TODOS}>Todos</option>
              <option value="PRODUTO">Produtos</option>
              <option value="ADICIONAL">Itens adicionais</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Categoria
            </span>

            <select
              value={categoriaSelecionada}
              onChange={(event) => setCategoriaSelecionada(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value={FILTRO_TODOS}>Todas</option>

              {categoriasDisponiveis.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Situação
            </span>

            <select
              value={situacaoSelecionada}
              onChange={(event) => setSituacaoSelecionada(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              {SITUACOES.map((situacao) => (
                <option key={situacao.value} value={situacao.value}>
                  {situacao.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Fornecedor
            </span>

            <select
              value={fornecedorSelecionado}
              onChange={(event) => setFornecedorSelecionado(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value={FILTRO_TODOS}>Todos</option>

              {fornecedoresDisponiveis.map((fornecedor) => (
                <option key={fornecedor} value={fornecedor}>
                  {fornecedor}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          label="Valor em estoque"
          value={moeda(resumo.valorTotal)}
          description={`${numero(resumo.quantidadeTotal)} unidade(s) nos filtros atuais.`}
          icon={<Warehouse className="h-5 w-5" />}
          tone="indigo"
        />

        <ResumoCard
          label="Produtos"
          value={numero(resumo.produtos)}
          description={`${numero(resumo.aneisPorTamanho)} registro(s) de anel por tamanho.`}
          icon={<Package className="h-5 w-5" />}
          tone="blue"
        />

        <ResumoCard
          label="Itens adicionais"
          value={numero(resumo.adicionais)}
          description="Embalagens, materiais e outros itens de apoio."
          icon={<Boxes className="h-5 w-5" />}
          tone="violet"
        />

        <ResumoCard
          label="Alertas"
          value={numero(resumo.zerados + resumo.baixoOuAtencao)}
          description={`${numero(resumo.zerados)} zerado(s) e ${numero(
            resumo.baixoOuAtencao
          )} com reposição/atenção.`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={resumo.zerados + resumo.baixoOuAtencao > 0 ? "red" : "emerald"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Maior valor acumulado"
            descricao="Itens com maior valor parado em estoque."
          />

          {rankingValor.length === 0 ? (
            <EmptyState texto="Nenhum item encontrado." />
          ) : (
            <div className="divide-y divide-slate-100">
              {rankingValor.map((item, index) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {index + 1}. {nomeComTamanho(item)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {itemMeta(item)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tipoClass(
                        item.tipo
                      )}`}
                    >
                      {item.tipo === "PRODUTO" ? "Produto" : "Adicional"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Valor acumulado</span>
                    <span className="font-semibold text-slate-950">
                      {moeda(item.valorAcumulado)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Quantidade</span>
                    <span className="font-semibold text-slate-950">
                      {item.quantidadeAtual} un.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Menor estoque"
            descricao="Itens com menor saldo disponível."
          />

          {rankingMenorEstoque.length === 0 ? (
            <EmptyState texto="Nenhum item encontrado." />
          ) : (
            <div className="divide-y divide-slate-100">
              {rankingMenorEstoque.map((item, index) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {index + 1}. {nomeComTamanho(item)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {itemMeta(item)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${situacaoClass(
                        item.situacao
                      )}`}
                    >
                      {labelSituacao(item.situacao)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Quantidade</span>
                    <span className="font-semibold text-slate-950">
                      {item.quantidadeAtual} un.
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Valor</span>
                    <span className="font-semibold text-slate-950">
                      {moeda(item.valorAcumulado)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <TabelaTitulo
            titulo="Itens críticos"
            descricao="Zerados, reposição ou atenção."
          />

          {itensCriticos.length === 0 ? (
            <EmptyState texto="Nenhum item crítico no filtro atual." />
          ) : (
            <div className="divide-y divide-slate-100">
              {itensCriticos.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {nomeComTamanho(item)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {itemMeta(item)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${situacaoClass(
                        item.situacao
                      )}`}
                    >
                      {labelSituacao(item.situacao)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Quantidade</span>
                    <span className="font-semibold text-slate-950">
                      {item.quantidadeAtual} un.
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Fornecedor</span>
                    <span className="font-semibold text-slate-950">
                      {item.fornecedor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <TabelaTitulo
          titulo="Estoque analítico"
          descricao="Lista completa dos itens considerados nos filtros atuais."
        />

        {itensFiltrados.length === 0 ? (
          <EmptyState texto="Nenhum item encontrado no filtro atual." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Fornecedor</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Quantidade
                  </th>
                  <th className="px-6 py-4 font-semibold">Custo médio</th>
                  <th className="px-6 py-4 font-semibold">Valor acumulado</th>
                  <th className="px-6 py-4 font-semibold">Situação</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Atualizado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {itensFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-950">
                          {nomeComTamanho(item)}
                        </span>

                        <span className="mt-1 text-xs text-slate-500">
                          {itemMeta(item)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tipoClass(
                          item.tipo
                        )}`}
                      >
                        {item.tipo === "PRODUTO" ? "Produto" : "Adicional"}
                      </span>
                    </td>

                    <td className="px-6 py-4">{item.fornecedor}</td>

                    <td className="px-6 py-4 text-center font-semibold text-slate-950">
                      {item.quantidadeAtual}
                    </td>

                    <td className="px-6 py-4">{moeda(item.custoMedio)}</td>

                    <td className="px-6 py-4 font-semibold text-slate-950">
                      {moeda(item.valorAcumulado)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${situacaoClass(
                          item.situacao
                        )}`}
                      >
                        {labelSituacao(item.situacao)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                          item.statusCadastro
                        )}`}
                      >
                        {labelStatus(item.statusCadastro)}
                      </span>
                    </td>

                    <td className="px-6 py-4">{dataCurta(item.atualizadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
