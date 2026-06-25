"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  aplicarFiltrosProdutos,
  derivarFiltrosDisponiveis,
  type LojaFiltroDesconto,
  type LojaFiltroEstoque,
  type LojaProdutoFiltravel,
  type LojaProdutoOrdenacao,
} from "@/lib/loja/produtos-filtros";

type FiltrosDraft = {
  buscar: string;
  categoria: string;
  precoMin: string;
  precoMax: string;
  estoque: LojaFiltroEstoque;
  ordem: LojaProdutoOrdenacao;
  tamanho: string;
  desconto: LojaFiltroDesconto;
};

type ChipFiltro = {
  chave: keyof FiltrosDraft;
  label: string;
};

type LojaFiltrosProdutosProps<TProduto extends LojaProdutoFiltravel> = {
  produtos: TProduto[];
  className?: string;
  gridClassName?: string;
  defaultOrder?: LojaProdutoOrdenacao;
  exibirCategoria?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  renderProduto: (produto: TProduto, index: number) => ReactNode;
};

const PARAM_KEYS: (keyof FiltrosDraft)[] = [
  "buscar",
  "categoria",
  "precoMin",
  "precoMax",
  "estoque",
  "ordem",
  "tamanho",
  "desconto",
];

const ESTOQUE_LABELS: Record<LojaFiltroEstoque, string> = {
  todos: "Todos",
  disponivel: "Em estoque",
  "sem-estoque": "Sem estoque",
};

const DESCONTO_LABELS: Record<Exclude<LojaFiltroDesconto, "">, string> = {
  "com-desconto": "Com desconto",
  "sem-desconto": "Sem desconto",
};

function criarFiltrosPadrao(defaultOrder: LojaProdutoOrdenacao): FiltrosDraft {
  return {
    buscar: "",
    categoria: "",
    precoMin: "",
    precoMax: "",
    estoque: "todos",
    ordem: defaultOrder,
    tamanho: "",
    desconto: "",
  };
}

function limitarTexto(value: string | null, limite = 80) {
  return String(value ?? "").trim().slice(0, limite);
}

function normalizarPrecoParam(value: string | null) {
  const numero = Number(String(value ?? "").replace(",", "."));

  if (!Number.isFinite(numero) || numero < 0) return "";

  return String(numero);
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function montarFiltrosAplicaveis(draft: FiltrosDraft) {
  const precoMin = Number(draft.precoMin);
  const precoMax = Number(draft.precoMax);

  return {
    busca: draft.buscar,
    categoria: draft.categoria,
    precoMin:
      draft.precoMin && Number.isFinite(precoMin) && precoMin >= 0
        ? precoMin
        : undefined,
    precoMax:
      draft.precoMax && Number.isFinite(precoMax) && precoMax >= 0
        ? precoMax
        : undefined,
    estoque: draft.estoque,
    ordem: draft.ordem,
    tamanho: draft.tamanho,
    desconto: draft.desconto,
  };
}

function sanitizarDraft(
  draft: FiltrosDraft,
  opcoes: {
    defaultOrder: LojaProdutoOrdenacao;
    ordensPermitidas: LojaProdutoOrdenacao[];
    categoriasPermitidas: string[];
    tamanhosPermitidos: string[];
    descontoDisponivel: boolean;
  },
): FiltrosDraft {
  const precoMin = normalizarPrecoParam(draft.precoMin);
  const precoMax = normalizarPrecoParam(draft.precoMax);
  const estoque: LojaFiltroEstoque =
    draft.estoque === "disponivel" || draft.estoque === "sem-estoque"
      ? draft.estoque
      : "todos";
  const ordem = opcoes.ordensPermitidas.includes(draft.ordem)
    ? draft.ordem
    : opcoes.defaultOrder;
  const categoria = opcoes.categoriasPermitidas.includes(draft.categoria)
    ? draft.categoria
    : "";
  const tamanho = opcoes.tamanhosPermitidos.includes(draft.tamanho)
    ? draft.tamanho
    : "";
  const desconto =
    opcoes.descontoDisponivel &&
    (draft.desconto === "com-desconto" || draft.desconto === "sem-desconto")
      ? draft.desconto
      : "";

  return {
    buscar: limitarTexto(draft.buscar),
    categoria,
    precoMin,
    precoMax,
    estoque,
    ordem,
    tamanho,
    desconto,
  };
}

function temFiltrosAtivos(
  filtros: FiltrosDraft,
  defaultOrder: LojaProdutoOrdenacao,
) {
  return Boolean(
    filtros.buscar ||
      filtros.categoria ||
      filtros.precoMin ||
      filtros.precoMax ||
      filtros.estoque !== "todos" ||
      filtros.ordem !== defaultOrder ||
      filtros.tamanho ||
      filtros.desconto,
  );
}

export default function LojaFiltrosProdutos<
  TProduto extends LojaProdutoFiltravel,
>({
  produtos,
  className = "",
  gridClassName = "grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4",
  defaultOrder = "destaque",
  exibirCategoria = true,
  emptyTitle = "Nenhum produto encontrado com esses filtros.",
  emptyDescription = "Tente remover algum filtro ou buscar por outro termo.",
  renderProduto,
}: LojaFiltrosProdutosProps<TProduto>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [painelAberto, setPainelAberto] = useState(false);

  const filtrosDisponiveis = useMemo(
    () => derivarFiltrosDisponiveis(produtos),
    [produtos],
  );
  const exibirFiltroCategoria =
    exibirCategoria && filtrosDisponiveis.categorias.length > 1;
  const exibirFiltroDesconto =
    filtrosDisponiveis.temProdutosComDesconto &&
    filtrosDisponiveis.temProdutosSemDesconto;
  const ordensPermitidas = useMemo(() => {
    const opcoes: LojaProdutoOrdenacao[] = [
      defaultOrder,
      "recentes",
      "menor-preco",
      "maior-preco",
      "az",
      "za",
    ];

    if (filtrosDisponiveis.temMaisVendidos) {
      opcoes.splice(4, 0, "mais-vendidos");
    }

    return Array.from(new Set(opcoes));
  }, [defaultOrder, filtrosDisponiveis.temMaisVendidos]);
  const opcoesSanitizacao = useMemo(
    () => ({
      defaultOrder,
      ordensPermitidas,
      categoriasPermitidas: exibirFiltroCategoria
        ? filtrosDisponiveis.categorias.map((categoria) => categoria.valor)
        : [],
      tamanhosPermitidos: filtrosDisponiveis.tamanhos,
      descontoDisponivel: exibirFiltroDesconto,
    }),
    [
      defaultOrder,
      exibirFiltroCategoria,
      exibirFiltroDesconto,
      filtrosDisponiveis.categorias,
      filtrosDisponiveis.tamanhos,
      ordensPermitidas,
    ],
  );

  const filtrosUrl = useMemo(() => {
    const paramsDraft = criarFiltrosPadrao(defaultOrder);
    const ordemParam = searchParams.get("ordem") as LojaProdutoOrdenacao | null;
    const estoqueParam = searchParams.get("estoque") as LojaFiltroEstoque | null;
    const descontoParam = searchParams.get("desconto") as LojaFiltroDesconto | null;

    paramsDraft.buscar = limitarTexto(searchParams.get("buscar"));
    paramsDraft.categoria = limitarTexto(searchParams.get("categoria"));
    paramsDraft.precoMin = normalizarPrecoParam(searchParams.get("precoMin"));
    paramsDraft.precoMax = normalizarPrecoParam(searchParams.get("precoMax"));
    paramsDraft.estoque = estoqueParam || "todos";
    paramsDraft.ordem = ordemParam || defaultOrder;
    paramsDraft.tamanho = limitarTexto(searchParams.get("tamanho"));
    paramsDraft.desconto = descontoParam || "";

    return sanitizarDraft(paramsDraft, opcoesSanitizacao);
  }, [defaultOrder, opcoesSanitizacao, searchParams]);
  const [draft, setDraft] = useState<FiltrosDraft>(filtrosUrl);

  useEffect(() => {
    setDraft(filtrosUrl);
  }, [filtrosUrl]);

  const filtrosAplicaveis = useMemo(
    () => montarFiltrosAplicaveis(filtrosUrl),
    [filtrosUrl],
  );
  const produtosFiltrados = useMemo(
    () => aplicarFiltrosProdutos(produtos, filtrosAplicaveis),
    [filtrosAplicaveis, produtos],
  );
  const filtrosAtivos = temFiltrosAtivos(filtrosUrl, defaultOrder);
  const chips = useMemo<ChipFiltro[]>(() => {
    const categoria = filtrosDisponiveis.categorias.find(
      (item) => item.valor === filtrosUrl.categoria,
    );
    const itens: ChipFiltro[] = [];

    if (filtrosUrl.buscar) {
      itens.push({ chave: "buscar", label: `Busca: ${filtrosUrl.buscar}` });
    }

    if (categoria) {
      itens.push({ chave: "categoria", label: categoria.label });
    }

    if (filtrosUrl.precoMin || filtrosUrl.precoMax) {
      const min = filtrosUrl.precoMin ? moeda(Number(filtrosUrl.precoMin)) : "";
      const max = filtrosUrl.precoMax ? moeda(Number(filtrosUrl.precoMax)) : "";
      itens.push({
        chave: filtrosUrl.precoMin ? "precoMin" : "precoMax",
        label:
          min && max
            ? `${min} a ${max}`
            : min
              ? `A partir de ${min}`
              : `Ate ${max}`,
      });
    }

    if (filtrosUrl.estoque !== "todos") {
      itens.push({
        chave: "estoque",
        label: ESTOQUE_LABELS[filtrosUrl.estoque],
      });
    }

    if (filtrosUrl.tamanho) {
      itens.push({ chave: "tamanho", label: `Tamanho ${filtrosUrl.tamanho}` });
    }

    if (filtrosUrl.desconto) {
      itens.push({
        chave: "desconto",
        label: DESCONTO_LABELS[filtrosUrl.desconto],
      });
    }

    if (filtrosUrl.ordem !== defaultOrder) {
      const label = getLabelOrdenacao(filtrosUrl.ordem, defaultOrder);
      itens.push({ chave: "ordem", label });
    }

    return itens;
  }, [defaultOrder, filtrosDisponiveis.categorias, filtrosUrl]);

  function aplicarDraft(proximosFiltros: FiltrosDraft, fecharPainel = false) {
    const filtrosSanitizados = sanitizarDraft(proximosFiltros, opcoesSanitizacao);
    const params = new URLSearchParams(searchParamsString);

    PARAM_KEYS.forEach((key) => params.delete(key));

    if (filtrosSanitizados.buscar) params.set("buscar", filtrosSanitizados.buscar);
    if (filtrosSanitizados.categoria) {
      params.set("categoria", filtrosSanitizados.categoria);
    }
    if (filtrosSanitizados.precoMin) params.set("precoMin", filtrosSanitizados.precoMin);
    if (filtrosSanitizados.precoMax) params.set("precoMax", filtrosSanitizados.precoMax);
    if (filtrosSanitizados.estoque !== "todos") {
      params.set("estoque", filtrosSanitizados.estoque);
    }
    if (filtrosSanitizados.ordem !== defaultOrder) {
      params.set("ordem", filtrosSanitizados.ordem);
    }
    if (filtrosSanitizados.tamanho) params.set("tamanho", filtrosSanitizados.tamanho);
    if (filtrosSanitizados.desconto) {
      params.set("desconto", filtrosSanitizados.desconto);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    if (fecharPainel) {
      setPainelAberto(false);
    }
  }

  function atualizarFiltro(parcial: Partial<FiltrosDraft>) {
    const proximos = {
      ...draft,
      ...parcial,
    };

    setDraft(proximos);
    aplicarDraft(proximos);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    aplicarDraft(draft, true);
  }

  function limparFiltros(fecharPainel = false) {
    const limpos = criarFiltrosPadrao(defaultOrder);
    const params = new URLSearchParams(searchParamsString);

    PARAM_KEYS.forEach((key) => params.delete(key));
    setDraft(limpos);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    if (fecharPainel) {
      setPainelAberto(false);
    }
  }

  function removerFiltro(chave: keyof FiltrosDraft) {
    const proximos = {
      ...filtrosUrl,
      [chave]: chave === "ordem" ? defaultOrder : "",
    };

    if (chave === "precoMin" || chave === "precoMax") {
      proximos.precoMin = "";
      proximos.precoMax = "";
    }

    if (chave === "estoque") {
      proximos.estoque = "todos";
    }

    setDraft(proximos);
    aplicarDraft(proximos);
  }

  function renderControles(mobile = false) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-md border border-slate-200 bg-white p-4"
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Buscar nesta pagina
          </label>
          <div className="mt-2 flex h-11 items-center gap-2 rounded-md border border-slate-200 px-3 transition focus-within:border-[var(--brand-blue)]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={draft.buscar}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  buscar: event.target.value,
                }))
              }
              placeholder="Nome ou categoria"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Ordenar
          </label>
          <select
            value={draft.ordem}
            onChange={(event) =>
              atualizarFiltro({
                ordem: event.target.value as LojaProdutoOrdenacao,
              })
            }
            className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
          >
            {ordensPermitidas.map((ordem) => (
              <option key={ordem} value={ordem}>
                {getLabelOrdenacao(ordem, defaultOrder)}
              </option>
            ))}
          </select>
        </div>

        {exibirFiltroCategoria ? (
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Categoria
            </label>
            <select
              value={draft.categoria}
              onChange={(event) =>
                atualizarFiltro({
                  categoria: event.target.value,
                })
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
            >
              <option value="">Todas</option>
              {filtrosDisponiveis.categorias.map((categoria) => (
                <option key={categoria.valor} value={categoria.valor}>
                  {categoria.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Faixa de preco
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={draft.precoMin}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  precoMin: event.target.value,
                }))
              }
              placeholder={
                filtrosDisponiveis.precoMinimo !== null
                  ? `Min. ${moeda(filtrosDisponiveis.precoMinimo)}`
                  : "Min."
              }
              className="h-11 min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
            />
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={draft.precoMax}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  precoMax: event.target.value,
                }))
              }
              placeholder={
                filtrosDisponiveis.precoMaximo !== null
                  ? `Max. ${moeda(filtrosDisponiveis.precoMaximo)}`
                  : "Max."
              }
              className="h-11 min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
            />
          </div>
        </div>

        {filtrosDisponiveis.tamanhos.length > 0 ? (
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Tamanho
            </label>
            <select
              value={draft.tamanho}
              onChange={(event) =>
                atualizarFiltro({
                  tamanho: event.target.value,
                })
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
            >
              <option value="">Todos</option>
              {filtrosDisponiveis.tamanhos.map((tamanho) => (
                <option key={tamanho} value={tamanho}>
                  {tamanho}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Disponibilidade
          </label>
          <select
            value={draft.estoque}
            onChange={(event) =>
              atualizarFiltro({
                estoque: event.target.value as LojaFiltroEstoque,
              })
            }
            className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
          >
            <option value="todos">Todos</option>
            <option value="disponivel">Em estoque</option>
            <option value="sem-estoque">Sem estoque</option>
          </select>
        </div>

        {exibirFiltroDesconto ? (
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Promocao
            </label>
            <select
              value={draft.desconto}
              onChange={(event) =>
                atualizarFiltro({
                  desconto: event.target.value as LojaFiltroDesconto,
                })
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
            >
              <option value="">Todos</option>
              <option value="com-desconto">Com desconto</option>
              <option value="sem-desconto">Sem desconto</option>
            </select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => limparFiltros(mobile)}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Limpar
          </button>
          <button
            type="submit"
            className="h-11 rounded-md bg-[var(--brand-blue)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-hover)]"
          >
            Aplicar filtros
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={className}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {produtosFiltrados.length} produto
            {produtosFiltrados.length === 1 ? "" : "s"} encontrado
            {produtosFiltrados.length === 1 ? "" : "s"}
          </p>
          {produtos.length > 0 ? (
            <p className="mt-1 text-xs font-medium text-slate-500">
              de {produtos.length} produto{produtos.length === 1 ? "" : "s"} nesta listagem
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setPainelAberto(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-500 lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrar
        </button>
      </div>

      {chips.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.chave}-${chip.label}`}
              type="button"
              onClick={() => removerFiltro(chip.chave)}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              <span className="truncate">{chip.label}</span>
              <X className="h-3.5 w-3.5 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => limparFiltros()}
            className="px-2 py-1 text-xs font-semibold text-slate-500 transition hover:text-slate-950"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      {painelAberto ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setPainelAberto(false)}
            className="absolute inset-0 bg-slate-950/35"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-lg bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">Filtros</p>
              <button
                type="button"
                onClick={() => setPainelAberto(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600"
                aria-label="Fechar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderControles(true)}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{renderControles(false)}</aside>

        <div className="min-w-0">
          {produtosFiltrados.length > 0 ? (
            <div className={gridClassName}>
              {produtosFiltrados.map((produto, index) => (
                <div key={produto.id}>{renderProduto(produto, index)}</div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-lg font-semibold text-slate-950">{emptyTitle}</p>
              <p className="mt-3 text-sm text-slate-600">{emptyDescription}</p>
              {filtrosAtivos ? (
                <button
                  type="button"
                  onClick={() => limparFiltros()}
                  className="mt-5 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getLabelOrdenacao(
  ordem: LojaProdutoOrdenacao,
  defaultOrder: LojaProdutoOrdenacao,
) {
  if (ordem === "destaque") return "Destaque";
  if (ordem === "relevancia") return "Mais relevantes";
  if (ordem === "recentes") return "Mais recentes";
  if (ordem === "menor-preco") return "Menor preco";
  if (ordem === "maior-preco") return "Maior preco";
  if (ordem === "mais-vendidos") return "Mais vendidos";
  if (ordem === "az") return "A-Z";
  if (ordem === "za") return "Z-A";

  return defaultOrder === "relevancia" ? "Mais relevantes" : "Destaque";
}
