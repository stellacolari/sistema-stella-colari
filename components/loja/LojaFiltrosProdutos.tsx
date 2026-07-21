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
import styles from "./LojaFiltrosProdutos.module.css";

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

const filterLabelClass = styles.label;
const filterFieldClass = styles.field;
const filterInputClass = styles.input;

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
  const valor = String(value ?? "").trim();

  if (!valor) return "";

  const numero = Number(valor.replace(",", "."));

  if (!Number.isFinite(numero) || numero <= 0) return "";

  return String(numero);
}

function normalizarFaixaPreco(
  draft: Pick<FiltrosDraft, "precoMin" | "precoMax">,
) {
  const precoMin = normalizarPrecoParam(draft.precoMin);
  const precoMax = normalizarPrecoParam(draft.precoMax);

  if (precoMin && precoMax && Number(precoMin) > Number(precoMax)) {
    return {
      precoMin: "",
      precoMax: "",
    };
  }

  return {
    precoMin,
    precoMax,
  };
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
  const precoMinValido =
    draft.precoMin && Number.isFinite(precoMin) && precoMin > 0;
  const precoMaxValido =
    draft.precoMax && Number.isFinite(precoMax) && precoMax > 0;
  const intervaloValido =
    !precoMinValido || !precoMaxValido || precoMin <= precoMax;

  return {
    busca: draft.buscar,
    categoria: draft.categoria,
    precoMin: precoMinValido && intervaloValido ? precoMin : undefined,
    precoMax: precoMaxValido && intervaloValido ? precoMax : undefined,
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
  const { precoMin, precoMax } = normalizarFaixaPreco(draft);
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
  gridClassName =
    "grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4",
  defaultOrder = "destaque",
  exibirCategoria = true,
  emptyTitle = "Nenhum produto encontrado.",
  emptyDescription = "Tente remover algum filtro ou buscar outro termo.",
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
            ? `Preço: ${min}–${max}`
            : min
              ? `Preço: a partir de ${min}`
              : `Preço: até ${max}`,
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
        className={`${styles.filterForm} ${
          mobile ? styles.filterFormMobile : ""
        }`}
      >
        <div>
          <label className={filterLabelClass}>
            Buscar nesta página
          </label>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} />
            <input
              value={draft.buscar}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  buscar: event.target.value,
                }))
              }
              placeholder="Buscar produtos"
              className={styles.searchInput}
            />
          </div>
        </div>

        <div>
          <label className={filterLabelClass}>
            Ordenar por
          </label>
          <select
            value={draft.ordem}
            onChange={(event) =>
              atualizarFiltro({
                ordem: event.target.value as LojaProdutoOrdenacao,
              })
            }
            className={filterFieldClass}
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
            <label className={filterLabelClass}>
              Categoria
            </label>
            <select
              value={draft.categoria}
              onChange={(event) =>
                atualizarFiltro({
                  categoria: event.target.value,
                })
              }
              className={filterFieldClass}
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
          <label className={filterLabelClass}>
            Faixa de preço
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
                  ? `Mín. ${moeda(filtrosDisponiveis.precoMinimo)}`
                  : "Mín."
              }
              className={filterInputClass}
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
                  ? `Máx. ${moeda(filtrosDisponiveis.precoMaximo)}`
                  : "Máx."
              }
              className={filterInputClass}
            />
          </div>
        </div>

        {filtrosDisponiveis.tamanhos.length > 0 ? (
          <div>
            <label className={filterLabelClass}>
              Tamanho
            </label>
            <select
              value={draft.tamanho}
              onChange={(event) =>
                atualizarFiltro({
                  tamanho: event.target.value,
                })
              }
              className={filterFieldClass}
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
          <label className={filterLabelClass}>
            Disponibilidade
          </label>
          <select
            value={draft.estoque}
            onChange={(event) =>
              atualizarFiltro({
                estoque: event.target.value as LojaFiltroEstoque,
              })
            }
            className={filterFieldClass}
          >
            <option value="todos">Todos</option>
            <option value="disponivel">Em estoque</option>
            <option value="sem-estoque">Sem estoque</option>
          </select>
        </div>

        {exibirFiltroDesconto ? (
          <div>
            <label className={filterLabelClass}>
              Promoção
            </label>
            <select
              value={draft.desconto}
              onChange={(event) =>
                atualizarFiltro({
                  desconto: event.target.value as LojaFiltroDesconto,
                })
              }
              className={filterFieldClass}
            >
              <option value="">Todos</option>
              <option value="com-desconto">Com desconto</option>
              <option value="sem-desconto">Sem desconto</option>
            </select>
          </div>
        ) : null}

        <div
          className={`${styles.actionGrid} ${
            filtrosAtivos ? styles.actionGridSplit : ""
          }`}
        >
          {filtrosAtivos ? (
            <button
              type="button"
              onClick={() => limparFiltros(mobile)}
              className={styles.secondaryButton}
            >
              Limpar
            </button>
          ) : null}
          <button
            type="submit"
            className={styles.primaryButton}
          >
            Aplicar filtros
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={className}>
      <div className={styles.toolbar}>
        <div>
          <p className={styles.resultCount}>
            {produtosFiltrados.length} produto
            {produtosFiltrados.length === 1 ? "" : "s"} encontrado
            {produtosFiltrados.length === 1 ? "" : "s"}
          </p>
          {produtos.length > 0 ? (
            <p className={styles.resultTotal}>
              de {produtos.length} produto{produtos.length === 1 ? "" : "s"} nesta listagem
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setPainelAberto(true)}
          className={styles.mobileTrigger}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrar
        </button>
      </div>

      {chips.length > 0 ? (
        <div className={styles.chipBar}>
          {chips.map((chip) => (
            <button
              key={`${chip.chave}-${chip.label}`}
              type="button"
              onClick={() => removerFiltro(chip.chave)}
              className={styles.chip}
            >
              <span className="truncate">{chip.label}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => limparFiltros()}
            className={styles.clearLink}
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      {painelAberto ? (
        <div className={styles.mobilePanel}>
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setPainelAberto(false)}
            className={styles.mobileBackdrop}
          />
          <div className={styles.mobileDrawer}>
            <div className={styles.mobileDrawerHeader}>
              <div>
                <p className={styles.drawerEyebrow}>
                  Filtros
                </p>
                <p className={styles.drawerCount}>
                  {produtosFiltrados.length} resultado
                  {produtosFiltrados.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPainelAberto(false)}
                className={styles.closeButton}
                aria-label="Fechar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderControles(true)}
          </div>
        </div>
      ) : null}

      <div className={styles.catalogLayout}>
        <aside className={styles.desktopAside}>
          <div className={styles.stickyFilters}>
            <p className={styles.asideTitle}>
              Refinar seleção
            </p>
            {renderControles(false)}
          </div>
        </aside>

        <div className="min-w-0">
          {produtosFiltrados.length > 0 ? (
            <div className={gridClassName}>
              {produtosFiltrados.map((produto, index) => (
                <div key={produto.id}>{renderProduto(produto, index)}</div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>{emptyTitle}</p>
              <p className={styles.emptyDescription}>{emptyDescription}</p>
              {filtrosAtivos ? (
                <button
                  type="button"
                  onClick={() => limparFiltros()}
                  className={styles.emptyButton}
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
  if (ordem === "menor-preco") return "Menor preço";
  if (ordem === "maior-preco") return "Maior preço";
  if (ordem === "mais-vendidos") return "Mais vendidos";
  if (ordem === "az") return "A-Z";
  if (ordem === "za") return "Z-A";

  return defaultOrder === "relevancia" ? "Mais relevantes" : "Destaque";
}
