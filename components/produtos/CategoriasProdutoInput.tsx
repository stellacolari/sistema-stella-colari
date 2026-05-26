"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Search,
  Settings2,
} from "lucide-react";

export type CategoriaProdutoOption = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  descricao?: string | null;
  imagemUrl?: string | null;
  exibirNoMenu?: boolean;
  ordemMenu?: number;
};

type CategoriaTreeItem = CategoriaProdutoOption & {
  filhos: CategoriaTreeItem[];
};

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function montarCaminhoCategoria(
  categoria: CategoriaProdutoOption,
  categorias: CategoriaProdutoOption[]
) {
  const mapa = new Map(categorias.map((item) => [item.id, item]));
  const partes = [categoria.nome];

  let atual = categoria.categoriaMaeId
    ? mapa.get(categoria.categoriaMaeId)
    : null;

  while (atual) {
    partes.unshift(atual.nome);
    atual = atual.categoriaMaeId ? mapa.get(atual.categoriaMaeId) : null;
  }

  return partes.join(" > ");
}

function ordenarCategorias(categorias: CategoriaProdutoOption[]) {
  return [...categorias].sort((a, b) => {
    const ordemA = Number(a.ordemMenu ?? 0);
    const ordemB = Number(b.ordemMenu ?? 0);

    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }

    const caminhoA = montarCaminhoCategoria(a, categorias);
    const caminhoB = montarCaminhoCategoria(b, categorias);

    return caminhoA.localeCompare(caminhoB);
  });
}

function ordenarTree(items: CategoriaTreeItem[]): CategoriaTreeItem[] {
  return [...items]
    .sort((a, b) => {
      const ordemA = Number(a.ordemMenu ?? 0);
      const ordemB = Number(b.ordemMenu ?? 0);

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      return a.nome.localeCompare(b.nome);
    })
    .map((item) => ({
      ...item,
      filhos: ordenarTree(item.filhos),
    }));
}

function montarArvoreCategorias(
  categorias: CategoriaProdutoOption[]
): CategoriaTreeItem[] {
  const mapa = new Map<string, CategoriaTreeItem>();

  categorias.forEach((categoria) => {
    mapa.set(categoria.id, {
      ...categoria,
      filhos: [],
    });
  });

  const raiz: CategoriaTreeItem[] = [];

  mapa.forEach((categoria) => {
    if (categoria.categoriaMaeId && mapa.has(categoria.categoriaMaeId)) {
      mapa.get(categoria.categoriaMaeId)!.filhos.push(categoria);
      return;
    }

    raiz.push(categoria);
  });

  return ordenarTree(raiz);
}

function categoriaEhKitPorCaminho(
  categoriaId: string,
  categorias: CategoriaProdutoOption[]
) {
  const mapa = new Map(categorias.map((item) => [item.id, item]));
  let atual = mapa.get(categoriaId);

  while (atual) {
    const nome = normalizarTexto(atual.nome);

    if (nome === "kits" || nome === "kit") {
      return true;
    }

    atual = atual.categoriaMaeId ? mapa.get(atual.categoriaMaeId) : undefined;
  }

  return false;
}

function filtrarArvoreCategorias(
  categoriasTree: CategoriaTreeItem[],
  categoriasBase: CategoriaProdutoOption[],
  busca: string
): CategoriaTreeItem[] {
  const termo = normalizarTexto(busca);

  if (!termo) {
    return categoriasTree;
  }

  return categoriasTree
    .map((categoria) => {
      const filhosFiltrados = filtrarArvoreCategorias(
        categoria.filhos,
        categoriasBase,
        busca
      );

      const caminho = normalizarTexto(
        montarCaminhoCategoria(categoria, categoriasBase)
      );

      const categoriaCombina =
        normalizarTexto(categoria.nome).includes(termo) ||
        normalizarTexto(categoria.slug).includes(termo) ||
        caminho.includes(termo);

      if (categoriaCombina || filhosFiltrados.length > 0) {
        return {
          ...categoria,
          filhos: filhosFiltrados,
        };
      }

      return null;
    })
    .filter(Boolean) as CategoriaTreeItem[];
}

export default function CategoriasProdutoInput({
  categoriasIniciais,
  categoriaPrincipalInicialId,
  categoriasSelecionadasIniciaisIds,
  kitContent,
  onCategoriaPrincipalChange,
}: {
  categoriasIniciais: CategoriaProdutoOption[];
  categoriaPrincipalInicialId?: string | null;
  categoriasSelecionadasIniciaisIds?: string[];
  kitContent?: ReactNode;
  onCategoriaPrincipalChange?: (
    categoria: CategoriaProdutoOption | null,
    produtoEhKit: boolean
  ) => void;
}) {
  const [categoriaPrincipalId, setCategoriaPrincipalId] = useState(
    categoriaPrincipalInicialId || ""
  );

  const [categoriasSelecionadasIds, setCategoriasSelecionadasIds] = useState<
    string[]
  >(categoriasSelecionadasIniciaisIds || []);

  const [categoriasAbertas, setCategoriasAbertas] = useState<string[]>([]);
  const [busca, setBusca] = useState("");

  const categoriasOrdenadas = useMemo(
    () => ordenarCategorias(categoriasIniciais),
    [categoriasIniciais]
  );

  const categoriasArvore = useMemo(
    () => montarArvoreCategorias(categoriasIniciais),
    [categoriasIniciais]
  );

  const categoriasArvoreFiltrada = useMemo(
    () => filtrarArvoreCategorias(categoriasArvore, categoriasIniciais, busca),
    [categoriasArvore, categoriasIniciais, busca]
  );

  const produtoEhKit = useMemo(() => {
    if (!categoriaPrincipalId) {
      return false;
    }

    return categoriaEhKitPorCaminho(categoriaPrincipalId, categoriasIniciais);
  }, [categoriaPrincipalId, categoriasIniciais]);

  const categoriasIdsParaSalvar = useMemo(() => {
    const ids = new Set<string>();

    if (categoriaPrincipalId) {
      ids.add(categoriaPrincipalId);
    }

    categoriasSelecionadasIds.forEach((id) => {
      if (id) {
        ids.add(id);
      }
    });

    return Array.from(ids);
  }, [categoriaPrincipalId, categoriasSelecionadasIds]);

  const categoriaPrincipal = useMemo(() => {
    if (!categoriaPrincipalId) {
      return null;
    }

    return categoriasIniciais.find(
      (categoria) => categoria.id === categoriaPrincipalId
    );
  }, [categoriaPrincipalId, categoriasIniciais]);

  useEffect(() => {
    onCategoriaPrincipalChange?.(categoriaPrincipal || null, produtoEhKit);
  }, [categoriaPrincipal, produtoEhKit, onCategoriaPrincipalChange]);

  function categoriaEstaAberta(categoriaId: string) {
    return categoriasAbertas.includes(categoriaId);
  }

  function alternarCategoriaAberta(categoriaId: string) {
    setCategoriasAbertas((atuais) => {
      if (atuais.includes(categoriaId)) {
        return atuais.filter((id) => id !== categoriaId);
      }

      return [...atuais, categoriaId];
    });
  }

  function abrirPaisDaCategoria(categoriaId: string) {
    const mapa = new Map(categoriasIniciais.map((item) => [item.id, item]));
    const idsParaAbrir: string[] = [];

    let atual = mapa.get(categoriaId);

    while (atual?.categoriaMaeId) {
      idsParaAbrir.push(atual.categoriaMaeId);
      atual = mapa.get(atual.categoriaMaeId);
    }

    if (idsParaAbrir.length > 0) {
      setCategoriasAbertas((idsAtuais) =>
        Array.from(new Set([...idsAtuais, ...idsParaAbrir]))
      );
    }
  }

  function alternarCategoriaAdicional(categoriaId: string) {
    setCategoriasSelecionadasIds((atuais) => {
      if (atuais.includes(categoriaId)) {
        return atuais.filter((id) => id !== categoriaId);
      }

      return [...atuais, categoriaId];
    });
  }

  function definirCategoriaPrincipal(categoriaId: string) {
    setCategoriaPrincipalId(categoriaId);

    setCategoriasSelecionadasIds((atuais) =>
      atuais.includes(categoriaId) ? atuais : [...atuais, categoriaId]
    );

    abrirPaisDaCategoria(categoriaId);
  }

  function removerCategoriaPrincipal() {
    setCategoriaPrincipalId("");
  }

  function renderCategoriaTree(item: CategoriaTreeItem, nivel = 0) {
    const selecionada = categoriasSelecionadasIds.includes(item.id);
    const principal = categoriaPrincipalId === item.id;
    const aberta = categoriaEstaAberta(item.id);
    const temFilhos = item.filhos.length > 0;
    const caminho = montarCaminhoCategoria(item, categoriasIniciais);

    return (
      <div key={item.id}>
        <div
          className={`grid grid-cols-[auto_1fr_auto] items-start gap-2 rounded-xl border px-3 py-2 text-sm transition ${
            principal
              ? "border-slate-900 bg-slate-50"
              : selecionada
              ? "border-slate-300 bg-slate-50"
              : "border-transparent hover:bg-slate-50"
          }`}
          style={{
            marginLeft: `${nivel * 16}px`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (temFilhos) {
                alternarCategoriaAberta(item.id);
              }
            }}
            className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg transition ${
              temFilhos
                ? "text-slate-600 hover:bg-slate-200"
                : "cursor-default text-slate-300"
            }`}
            aria-label={
              temFilhos
                ? aberta
                  ? "Recolher categoria"
                  : "Expandir categoria"
                : "Categoria sem filhos"
            }
          >
            {temFilhos ? (
              aberta ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            )}
          </button>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={selecionada || principal}
              disabled={principal}
              onChange={() => alternarCategoriaAdicional(item.id)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />

            <span className="flex-1">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                {temFilhos ? (
                  aberta ? (
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Folder className="h-4 w-4 text-slate-400" />
                  )
                ) : null}

                {item.nome}
              </span>

              {nivel > 0 && (
                <span className="mt-0.5 block text-xs text-slate-400">
                  {caminho}
                </span>
              )}

              <span className="mt-1 flex flex-wrap gap-1">
                {principal && (
                  <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Principal
                  </span>
                )}

                {selecionada && !principal && (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    Adicional
                  </span>
                )}

                {item.exibirNoMenu === false && (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    Oculta no menu
                  </span>
                )}

                {categoriaEhKitPorCaminho(item.id, categoriasIniciais) && (
                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    Kit
                  </span>
                )}
              </span>
            </span>
          </label>

          <div className="flex items-center gap-1">
            {!principal ? (
              <button
                type="button"
                onClick={() => definirCategoriaPrincipal(item.id)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Definir principal
              </button>
            ) : (
              <button
                type="button"
                onClick={removerCategoriaPrincipal}
                className="rounded-lg border border-slate-900 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800"
              >
                Principal
              </button>
            )}
          </div>
        </div>

        {temFilhos && aberta && (
          <div className="mt-1 space-y-1">
            {item.filhos.map((filho) => renderCategoriaTree(filho, nivel + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        type="hidden"
        name="categoriaPrincipalId"
        value={categoriaPrincipalId}
      />

      <input
        type="hidden"
        name="categoriasIds"
        value={JSON.stringify(categoriasIdsParaSalvar)}
      />

      <input
        type="hidden"
        name="tipoProduto"
        value={produtoEhKit ? "KIT" : "UNITARIO"}
      />

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Categorias são gerenciadas em uma tela própria
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Aqui você apenas vincula o produto às categorias já cadastradas.
              Para criar, editar imagem, descrição ou ordem no menu, use o
              gerenciador de categorias.
            </p>
          </div>

          <Link
            href="/configuracoes/loja/categorias"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Settings2 className="h-4 w-4" />
            Gerenciar categorias
          </Link>
        </div>
      </div>

      <div
        className={`rounded-3xl border p-4 ${
          categoriaPrincipal
            ? "border-slate-300 bg-white"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            categoriaPrincipal ? "text-slate-900" : "text-amber-900"
          }`}
        >
          Categoria principal
        </p>

        {categoriaPrincipal ? (
          <>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {montarCaminhoCategoria(categoriaPrincipal, categoriasIniciais)}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Tipo detectado:{" "}
              <strong>{produtoEhKit ? "Kit composto" : "Produto unitário"}</strong>
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Nenhuma categoria principal selecionada. Use o botão “Definir
            principal” na lista abaixo.
          </p>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Lista de categorias
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Marque categorias adicionais e use “Definir principal” para
              escolher a categoria principal do produto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setCategoriasAbertas(
                  categoriasIniciais.map((categoria) => categoria.id)
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Expandir todas
            </button>

            <button
              type="button"
              onClick={() => setCategoriasAbertas([])}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Recolher todas
            </button>

            <button
              type="button"
              onClick={() =>
                setCategoriasSelecionadasIds(
                  categoriaPrincipalId ? [categoriaPrincipalId] : []
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Limpar adicionais
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar categoria..."
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        {categoriasIniciais.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Nenhuma categoria cadastrada ainda. Acesse “Gerenciar categorias”
            para criar a primeira categoria.
          </div>
        ) : categoriasArvoreFiltrada.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Nenhuma categoria encontrada para a busca atual.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
            <div className="space-y-1">
              {categoriasArvoreFiltrada.map((categoria) =>
                renderCategoriaTree(categoria)
              )}
            </div>
          </div>
        )}
      </div>

      {produtoEhKit && kitContent ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-amber-900">
              Composição do kit
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Como a categoria principal selecionada pertence a “Kits”, este
              produto será salvo como kit composto.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-4">
            {kitContent}
          </div>
        </div>
      ) : null}
    </div>
  );
}