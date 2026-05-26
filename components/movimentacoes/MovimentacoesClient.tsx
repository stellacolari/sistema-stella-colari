"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Calendar,
  ClipboardList,
  Filter,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

export type MovimentacaoAdicionalDetalhe = {
  posicao: number;
  codigo: string | null;
  nome: string | null;
  quantidadeUtilizada: number | null;
  valor: number;
  origem: "historico" | "regraAtual";
};

export type MovimentacaoListItem = {
  id: string;
  data: string;
  codigoMovimentacao: string;
  tipoMovimentacao: string;
  origemTipo: string;
  origemId: string | null;
  codigoItem: string;
  nomeItem: string;
  categoriaItem: string | null;
  itemTipo: string;
  quantidade: number;
  tamanhoAnel: string | null;
  custo: number;
  faturamento: number;
  documentoCliente: string | null;
  status: string | null;
  relacionadoA: string | null;
  gastoProdutoPrincipal: number;
  gastoAdd1: number;
  gastoAdd2: number;
  gastoAdd3: number;
  adicionaisDetalhe: MovimentacaoAdicionalDetalhe[];
  adicionaisOrigem: "historico" | "regraAtual";
};

type MovimentacoesClientProps = {
  movimentacoes: MovimentacaoListItem[];
};

const filtroTodos = "TODOS";

function normalizarTexto(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarMoeda(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatarNumero(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatarData(value: string): string {
  const data = new Date(value);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function getTipoBadgeClass(tipo: string): string {
  const tipoNormalizado = normalizarTexto(tipo);

  if (
    tipoNormalizado.includes("entrada") ||
    tipoNormalizado.includes("compra")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    tipoNormalizado.includes("saida") ||
    tipoNormalizado.includes("saída") ||
    tipoNormalizado.includes("venda")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (tipoNormalizado.includes("ajuste")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    tipoNormalizado.includes("cancel") ||
    tipoNormalizado.includes("estorno")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function getStatusBadgeClass(status: string | null): string {
  const statusNormalizado = normalizarTexto(status);

  if (!statusNormalizado || statusNormalizado === "-") {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }

  if (
    statusNormalizado.includes("finalizada") ||
    statusNormalizado.includes("ativo") ||
    statusNormalizado.includes("ok")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    statusNormalizado.includes("preparacao") ||
    statusNormalizado.includes("preparação") ||
    statusNormalizado.includes("pendente")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    statusNormalizado.includes("enviada") ||
    statusNormalizado.includes("entregue")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    statusNormalizado.includes("cancelada") ||
    statusNormalizado.includes("lixeira")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function formatarLabel(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function getDataInicioTimestamp(dataInicio: string): number | null {
  if (!dataInicio) {
    return null;
  }

  const data = new Date(`${dataInicio}T00:00:00`);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data.getTime();
}

function getDataFimTimestamp(dataFim: string): number | null {
  if (!dataFim) {
    return null;
  }

  const data = new Date(`${dataFim}T23:59:59`);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data.getTime();
}

function tamanhoTexto(tamanhoAnel: string | null) {
  if (!tamanhoAnel) {
    return "";
  }

  return `Tam. ${tamanhoAnel}`;
}

function itemMeta(movimentacao: MovimentacaoListItem) {
  return [
    movimentacao.codigoItem,
    formatarLabel(movimentacao.itemTipo),
    movimentacao.categoriaItem,
    tamanhoTexto(movimentacao.tamanhoAnel),
  ]
    .filter(Boolean)
    .join(" · ");
}

function LinhaDetalhe({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function CardAdicional({
  adicional,
}: {
  adicional: MovimentacaoAdicionalDetalhe;
}) {
  const titulo = adicional.nome ?? "Adicional não identificado";

  const subtitulo = adicional.codigo
    ? `${adicional.codigo}${
        adicional.quantidadeUtilizada !== null
          ? ` · ${formatarNumero(adicional.quantidadeUtilizada)} un. utilizadas`
          : ""
      }`
    : "Sem vínculo encontrado";

  return (
    <div className="rounded-2xl bg-zinc-50 p-3">
      <p className="text-sm font-semibold text-zinc-950">{titulo}</p>

      <p className="mt-1 text-xs text-zinc-500">{subtitulo}</p>

      <p className="mt-3 text-sm font-semibold text-zinc-950">
        {formatarMoeda(adicional.valor)}
      </p>
    </div>
  );
}

export default function MovimentacoesClient({
  movimentacoes,
}: MovimentacoesClientProps) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState(filtroTodos);
  const [origemSelecionada, setOrigemSelecionada] = useState(filtroTodos);
  const [statusSelecionado, setStatusSelecionado] = useState(filtroTodos);
  const [buscaCodigo, setBuscaCodigo] = useState("");
  const [buscaDocumento, setBuscaDocumento] = useState("");
  const [movimentacaoSelecionada, setMovimentacaoSelecionada] =
    useState<MovimentacaoListItem | null>(null);

  const tiposDisponiveis = useMemo(() => {
    const tipos = new Set<string>();

    movimentacoes.forEach((movimentacao) => {
      if (movimentacao.tipoMovimentacao) {
        tipos.add(movimentacao.tipoMovimentacao);
      }
    });

    return Array.from(tipos).sort((a, b) => a.localeCompare(b));
  }, [movimentacoes]);

  const origensDisponiveis = useMemo(() => {
    const origens = new Set<string>();

    movimentacoes.forEach((movimentacao) => {
      if (movimentacao.origemTipo) {
        origens.add(movimentacao.origemTipo);
      }
    });

    return Array.from(origens).sort((a, b) => a.localeCompare(b));
  }, [movimentacoes]);

  const statusDisponiveis = useMemo(() => {
    const status = new Set<string>();

    movimentacoes.forEach((movimentacao) => {
      if (movimentacao.status) {
        status.add(movimentacao.status);
      }
    });

    return Array.from(status).sort((a, b) => a.localeCompare(b));
  }, [movimentacoes]);

  const movimentacoesFiltradas = useMemo(() => {
    const inicioTimestamp = getDataInicioTimestamp(dataInicio);
    const fimTimestamp = getDataFimTimestamp(dataFim);
    const buscaCodigoNormalizada = normalizarTexto(buscaCodigo);
    const buscaDocumentoNormalizada = normalizarTexto(buscaDocumento);

    return movimentacoes.filter((movimentacao) => {
      const dataMovimentacao = new Date(movimentacao.data).getTime();

      if (
        inicioTimestamp !== null &&
        !Number.isNaN(dataMovimentacao) &&
        dataMovimentacao < inicioTimestamp
      ) {
        return false;
      }

      if (
        fimTimestamp !== null &&
        !Number.isNaN(dataMovimentacao) &&
        dataMovimentacao > fimTimestamp
      ) {
        return false;
      }

      if (
        tipoSelecionado !== filtroTodos &&
        movimentacao.tipoMovimentacao !== tipoSelecionado
      ) {
        return false;
      }

      if (
        origemSelecionada !== filtroTodos &&
        movimentacao.origemTipo !== origemSelecionada
      ) {
        return false;
      }

      if (
        statusSelecionado !== filtroTodos &&
        movimentacao.status !== statusSelecionado
      ) {
        return false;
      }

      if (buscaCodigoNormalizada) {
        const textoBusca = normalizarTexto(
          [
            movimentacao.codigoMovimentacao,
            movimentacao.codigoItem,
            movimentacao.nomeItem,
            movimentacao.categoriaItem,
            movimentacao.tamanhoAnel,
            movimentacao.origemId,
            movimentacao.relacionadoA,
            ...movimentacao.adicionaisDetalhe.map((adicional) =>
              [adicional.codigo, adicional.nome].filter(Boolean).join(" ")
            ),
          ]
            .filter(Boolean)
            .join(" ")
        );

        if (!textoBusca.includes(buscaCodigoNormalizada)) {
          return false;
        }
      }

      if (buscaDocumentoNormalizada) {
        const documentoNormalizado = normalizarTexto(
          movimentacao.documentoCliente
        );

        if (!documentoNormalizado.includes(buscaDocumentoNormalizada)) {
          return false;
        }
      }

      return true;
    });
  }, [
    buscaCodigo,
    buscaDocumento,
    dataFim,
    dataInicio,
    movimentacoes,
    origemSelecionada,
    statusSelecionado,
    tipoSelecionado,
  ]);

  const resumo = useMemo(() => {
    const totalCusto = movimentacoesFiltradas.reduce(
      (total, movimentacao) => total + movimentacao.custo,
      0
    );

    const totalFaturamento = movimentacoesFiltradas.reduce(
      (total, movimentacao) => total + movimentacao.faturamento,
      0
    );

    const entradas = movimentacoesFiltradas.filter((movimentacao) => {
      const tipo = normalizarTexto(movimentacao.tipoMovimentacao);
      return tipo.includes("entrada") || tipo.includes("compra");
    }).length;

    const saidas = movimentacoesFiltradas.filter((movimentacao) => {
      const tipo = normalizarTexto(movimentacao.tipoMovimentacao);
      return tipo.includes("saida") || tipo.includes("venda");
    }).length;

    return {
      totalRegistros: movimentacoesFiltradas.length,
      entradas,
      saidas,
      totalCusto,
      totalFaturamento,
      resultado: totalFaturamento - totalCusto,
    };
  }, [movimentacoesFiltradas]);

  function limparFiltros() {
    setDataInicio("");
    setDataFim("");
    setTipoSelecionado(filtroTodos);
    setOrigemSelecionada(filtroTodos);
    setStatusSelecionado(filtroTodos);
    setBuscaCodigo("");
    setBuscaDocumento("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                <ClipboardList className="h-4 w-4" />
                Auditoria operacional
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                Movimentações
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                Acompanhe entradas, saídas, ajustes, custos, faturamentos e
                vínculos gerados por compras, vendas e alterações de estoque.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <span className="font-semibold text-zinc-950">
                {movimentacoes.length}
              </span>{" "}
              movimentações carregadas
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-500">Registros</p>
              <ArrowDownUp className="h-5 w-5 text-zinc-400" />
            </div>

            <p className="mt-3 text-2xl font-semibold text-zinc-950">
              {resumo.totalRegistros}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-emerald-700">Entradas</p>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="mt-3 text-2xl font-semibold text-zinc-950">
              {resumo.entradas}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-blue-700">Saídas</p>
              <TrendingDown className="h-5 w-5 text-blue-600" />
            </div>

            <p className="mt-3 text-2xl font-semibold text-zinc-950">
              {resumo.saidas}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Custo filtrado</p>

            <p className="mt-3 text-2xl font-semibold text-zinc-950">
              {formatarMoeda(resumo.totalCusto)}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              Faturamento filtrado
            </p>

            <p className="mt-3 text-2xl font-semibold text-zinc-950">
              {formatarMoeda(resumo.totalFaturamento)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Filter className="h-4 w-4" />
                Filtros
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Refine a visualização por período, origem, status, código, nome
                do item, tamanho do anel, adicional ou documento.
              </p>
            </div>

            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Limpar filtros
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <Calendar className="h-4 w-4 text-zinc-400" />
                Data inicial
              </span>

              <input
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <Calendar className="h-4 w-4 text-zinc-400" />
                Data final
              </span>

              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">
                Tipo de movimentação
              </span>

              <select
                value={tipoSelecionado}
                onChange={(event) => setTipoSelecionado(event.target.value)}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
              >
                <option value={filtroTodos}>Todos</option>

                {tiposDisponiveis.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {formatarLabel(tipo)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Origem</span>

              <select
                value={origemSelecionada}
                onChange={(event) => setOrigemSelecionada(event.target.value)}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
              >
                <option value={filtroTodos}>Todas</option>

                {origensDisponiveis.map((origem) => (
                  <option key={origem} value={origem}>
                    {formatarLabel(origem)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Status</span>

              <select
                value={statusSelecionado}
                onChange={(event) => setStatusSelecionado(event.target.value)}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
              >
                <option value={filtroTodos}>Todos</option>

                {statusDisponiveis.map((status) => (
                  <option key={status} value={status}>
                    {formatarLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 md:col-span-1 xl:col-span-2">
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <Search className="h-4 w-4 text-zinc-400" />
                Buscar por item, adicional, código, tamanho ou origem
              </span>

              <input
                type="text"
                value={buscaCodigo}
                onChange={(event) => setBuscaCodigo(event.target.value)}
                placeholder="Ex: anel, Tam. 16, embalagem, S000001, F000001, PC000001..."
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <Search className="h-4 w-4 text-zinc-400" />
                Documento do cliente
              </span>

              <input
                type="text"
                value={buscaDocumento}
                onChange={(event) => setBuscaDocumento(event.target.value)}
                placeholder="CPF/CNPJ/documento"
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
              />
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Histórico de movimentações
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Exibindo {movimentacoesFiltradas.length} de{" "}
                {movimentacoes.length} registros. Clique em uma linha para ver
                os detalhes.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 px-4 py-2 text-sm text-zinc-600">
              Resultado filtrado:{" "}
              <span className="font-semibold text-zinc-950">
                {formatarMoeda(resumo.resultado)}
              </span>
            </div>
          </div>

          {movimentacoesFiltradas.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
                <Search className="h-6 w-6 text-zinc-400" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-zinc-950">
                Nenhuma movimentação encontrada
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Ajuste os filtros ou limpe a busca para visualizar novamente o
                histórico de movimentações.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Data</th>
                      <th className="px-5 py-3 font-semibold">Tipo</th>
                      <th className="px-5 py-3 font-semibold">Item</th>
                      <th className="px-5 py-3 font-semibold">Origem</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Qtd.
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Custo
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Faturamento
                      </th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Documento</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100">
                    {movimentacoesFiltradas.map((movimentacao) => (
                      <tr
                        key={movimentacao.id}
                        onClick={() =>
                          setMovimentacaoSelecionada(movimentacao)
                        }
                        className="cursor-pointer transition hover:bg-zinc-50"
                      >
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500">
                          {formatarData(movimentacao.data)}
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getTipoBadgeClass(
                              movimentacao.tipoMovimentacao
                            )}`}
                          >
                            {formatarLabel(movimentacao.tipoMovimentacao)}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex max-w-[320px] flex-col">
                            <span className="truncate font-semibold text-zinc-950">
                              {movimentacao.nomeItem}
                            </span>

                            <span className="text-xs text-zinc-500">
                              {itemMeta(movimentacao)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-800">
                              {formatarLabel(movimentacao.origemTipo)}
                            </span>

                            <span className="text-xs text-zinc-500">
                              {movimentacao.origemId ?? "-"}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-zinc-800">
                          {formatarNumero(movimentacao.quantidade)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-right text-zinc-700">
                          {formatarMoeda(movimentacao.custo)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-right text-zinc-700">
                          {formatarMoeda(movimentacao.faturamento)}
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              movimentacao.status
                            )}`}
                          >
                            {formatarLabel(movimentacao.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-600">
                          {movimentacao.documentoCliente ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 xl:hidden">
                {movimentacoesFiltradas.map((movimentacao) => (
                  <button
                    type="button"
                    key={movimentacao.id}
                    onClick={() => setMovimentacaoSelecionada(movimentacao)}
                    className="rounded-3xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:bg-zinc-50"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-zinc-500">
                          {formatarData(movimentacao.data)}
                        </p>

                        <h3 className="mt-1 text-base font-semibold text-zinc-950">
                          {movimentacao.nomeItem}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          {itemMeta(movimentacao)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getTipoBadgeClass(
                          movimentacao.tipoMovimentacao
                        )}`}
                      >
                        {formatarLabel(movimentacao.tipoMovimentacao)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">Quantidade</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-950">
                          {formatarNumero(movimentacao.quantidade)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">Custo</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-950">
                          {formatarMoeda(movimentacao.custo)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">Faturamento</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-950">
                          {formatarMoeda(movimentacao.faturamento)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {movimentacaoSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Resumo detalhado
                </p>

                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  {movimentacaoSelecionada.nomeItem}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {itemMeta(movimentacaoSelecionada)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMovimentacaoSelecionada(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950"
                aria-label="Fechar resumo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="mb-5 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getTipoBadgeClass(
                    movimentacaoSelecionada.tipoMovimentacao
                  )}`}
                >
                  {formatarLabel(movimentacaoSelecionada.tipoMovimentacao)}
                </span>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                    movimentacaoSelecionada.status
                  )}`}
                >
                  {formatarLabel(movimentacaoSelecionada.status)}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <LinhaDetalhe
                  label="Data da movimentação"
                  value={formatarData(movimentacaoSelecionada.data)}
                />

                <LinhaDetalhe
                  label="Código da movimentação"
                  value={movimentacaoSelecionada.codigoMovimentacao}
                />

                <LinhaDetalhe
                  label="Origem"
                  value={formatarLabel(movimentacaoSelecionada.origemTipo)}
                />

                <LinhaDetalhe
                  label="ID / código de origem"
                  value={movimentacaoSelecionada.origemId ?? "-"}
                />

                <LinhaDetalhe
                  label="Quantidade vendida/movimentada"
                  value={formatarNumero(movimentacaoSelecionada.quantidade)}
                />

                <LinhaDetalhe
                  label="Tamanho do anel"
                  value={movimentacaoSelecionada.tamanhoAnel ?? "-"}
                />

                <LinhaDetalhe
                  label="Documento do cliente"
                  value={movimentacaoSelecionada.documentoCliente ?? "-"}
                />

                <LinhaDetalhe
                  label="Custo"
                  value={formatarMoeda(movimentacaoSelecionada.custo)}
                />

                <LinhaDetalhe
                  label="Faturamento"
                  value={formatarMoeda(movimentacaoSelecionada.faturamento)}
                />

                <LinhaDetalhe
                  label="Resultado"
                  value={formatarMoeda(
                    movimentacaoSelecionada.faturamento -
                      movimentacaoSelecionada.custo
                  )}
                />

                <LinhaDetalhe
                  label="Relacionado a"
                  value={movimentacaoSelecionada.relacionadoA ?? "-"}
                />
              </div>

              <div className="mt-6 rounded-3xl border border-zinc-200 p-4">
                <h3 className="text-sm font-semibold text-zinc-950">
                  Composição de gasto
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  O sistema usa o histórico salvo no momento da movimentação
                  sempre que disponível. Quando não houver histórico antigo,
                  exibe os dados com base nas regras atuais.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 p-3">
                    <p className="text-sm font-semibold text-zinc-950">
                      {movimentacaoSelecionada.nomeItem}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {movimentacaoSelecionada.codigoItem} · produto principal
                      {movimentacaoSelecionada.tamanhoAnel
                        ? ` · Tam. ${movimentacaoSelecionada.tamanhoAnel}`
                        : ""}
                    </p>

                    <p className="mt-3 text-sm font-semibold text-zinc-950">
                      {formatarMoeda(
                        movimentacaoSelecionada.gastoProdutoPrincipal
                      )}
                    </p>
                  </div>

                  {movimentacaoSelecionada.adicionaisDetalhe.map(
                    (adicional) => (
                      <CardAdicional
                        key={adicional.posicao}
                        adicional={adicional}
                      />
                    )
                  )}
                </div>

                {movimentacaoSelecionada.adicionaisOrigem === "regraAtual" && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    Esta movimentação não possui histórico detalhado salvo dos
                    adicionais consumidos. A identificação exibida pode refletir
                    as regras atuais da categoria.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMovimentacaoSelecionada(null)}
                  className="rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}