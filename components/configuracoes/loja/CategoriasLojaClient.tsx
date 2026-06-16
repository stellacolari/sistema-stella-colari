"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  ImageIcon,
  LayoutTemplate,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

export type CategoriaLoja = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  descricao?: string | null;
  imagemUrl?: string | null;
  exibirNoMenu?: boolean;
  ordemMenu?: number;
  paginaBuilderId?: string | null;
  paginaBuilderAtiva?: boolean;
  paginaBuilderStatus?: string | null;
};

type CategoriaTreeItem = CategoriaLoja & {
  filhos: CategoriaTreeItem[];
};

type CategoriaParaExcluir = {
  id: string;
  nome: string;
} | null;

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function montarCaminhoCategoria(
  categoria: CategoriaLoja,
  categorias: CategoriaLoja[]
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

function ordenarCategorias(categorias: CategoriaLoja[]) {
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

function montarArvoreCategorias(categorias: CategoriaLoja[]) {
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

function filtrarArvoreCategorias(
  categorias: CategoriaTreeItem[],
  categoriasBase: CategoriaLoja[],
  busca: string
): CategoriaTreeItem[] {
  const termo = normalizarTexto(busca);

  if (!termo) {
    return categorias;
  }

  return categorias
    .map((categoria) => {
      const filhosFiltrados = filtrarArvoreCategorias(
        categoria.filhos,
        categoriasBase,
        busca
      );

      const caminho = normalizarTexto(
        montarCaminhoCategoria(categoria, categoriasBase)
      );

      const descricao = normalizarTexto(categoria.descricao);

      const categoriaCombina =
        normalizarTexto(categoria.nome).includes(termo) ||
        normalizarTexto(categoria.slug).includes(termo) ||
        caminho.includes(termo) ||
        descricao.includes(termo);

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

function coletarIdsDescendentes(
  categoriaId: string,
  categorias: CategoriaLoja[]
) {
  const ids = new Set<string>();

  function visitar(idPai: string) {
    categorias.forEach((categoria) => {
      if (categoria.categoriaMaeId === idPai) {
        ids.add(categoria.id);
        visitar(categoria.id);
      }
    });
  }

  visitar(categoriaId);

  return ids;
}

export default function CategoriasLojaClient({
  categoriasIniciais,
}: {
  categoriasIniciais: CategoriaLoja[];
}) {
  const [categorias, setCategorias] =
    useState<CategoriaLoja[]>(categoriasIniciais);

  const [busca, setBusca] = useState("");
  const [categoriasAbertas, setCategoriasAbertas] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [nomeNovaCategoria, setNomeNovaCategoria] = useState("");
  const [novaCategoriaMaeId, setNovaCategoriaMaeId] = useState("");
  const [criando, setCriando] = useState(false);

  const [categoriaEditando, setCategoriaEditando] =
    useState<CategoriaLoja | null>(null);

  const [editNome, setEditNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editImagemUrl, setEditImagemUrl] = useState("");
  const [editImagemArquivo, setEditImagemArquivo] = useState<File | null>(null);
  const [editExibirNoMenu, setEditExibirNoMenu] = useState(true);
  const [editOrdemMenu, setEditOrdemMenu] = useState("0");
  const [editCategoriaMaeId, setEditCategoriaMaeId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [categoriaParaExcluir, setCategoriaParaExcluir] =
    useState<CategoriaParaExcluir>(null);

  const [excluindo, setExcluindo] = useState(false);
  const [criandoPaginaCategoriaId, setCriandoPaginaCategoriaId] = useState<
    string | null
  >(null);

  const categoriasOrdenadas = useMemo(
    () => ordenarCategorias(categorias),
    [categorias]
  );

  const categoriasArvore = useMemo(
    () => montarArvoreCategorias(categorias),
    [categorias]
  );

  const categoriasArvoreFiltrada = useMemo(
    () => filtrarArvoreCategorias(categoriasArvore, categorias, busca),
    [categoriasArvore, categorias, busca]
  );

  const categoriasMae = useMemo(
    () => categorias.filter((categoria) => !categoria.categoriaMaeId),
    [categorias]
  );

  const categoriasOcultasNoMenu = useMemo(
    () => categorias.filter((categoria) => categoria.exibirNoMenu === false),
    [categorias]
  );

  const categoriasComImagem = useMemo(
    () => categorias.filter((categoria) => Boolean(categoria.imagemUrl)),
    [categorias]
  );

  const categoriasMaeDisponiveisEdicao = useMemo(() => {
    if (!categoriaEditando) {
      return categoriasOrdenadas;
    }

    const descendentes = coletarIdsDescendentes(
      categoriaEditando.id,
      categorias
    );

    return categoriasOrdenadas.filter((categoria) => {
      if (categoria.id === categoriaEditando.id) {
        return false;
      }

      return !descendentes.has(categoria.id);
    });
  }, [categoriaEditando, categorias, categoriasOrdenadas]);

  function limparMensagens() {
    setErro("");
    setSucesso("");
  }

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

  function expandirTodas() {
    setCategoriasAbertas(categorias.map((categoria) => categoria.id));
  }

  function recolherTodas() {
    setCategoriasAbertas([]);
  }

  function abrirPaisDaCategoria(categoriaId: string) {
    const mapa = new Map(categorias.map((categoria) => [categoria.id, categoria]));
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

  function abrirEdicao(categoria: CategoriaLoja) {
    limparMensagens();

    setCategoriaEditando(categoria);
    setEditNome(categoria.nome || "");
    setEditDescricao(categoria.descricao || "");
    setEditImagemUrl(categoria.imagemUrl || "");
    setEditImagemArquivo(null);
    setEditExibirNoMenu(categoria.exibirNoMenu ?? true);
    setEditOrdemMenu(String(categoria.ordemMenu ?? 0));
    setEditCategoriaMaeId(categoria.categoriaMaeId || "");
  }

  async function criarCategoria() {
    limparMensagens();

    const nome = nomeNovaCategoria.trim();

    if (!nome) {
      setErro("Informe o nome da categoria.");
      return;
    }

    setCriando(true);

    try {
      const response = await fetch("/api/produtos/categorias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          categoriaMaeId: novaCategoriaMaeId || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao criar categoria.");
        return;
      }

      const novaCategoria = data.categoria as CategoriaLoja;

      setCategorias((atuais) => [...atuais, novaCategoria]);
      setNomeNovaCategoria("");
      setNovaCategoriaMaeId("");
      setSucesso("Categoria criada com sucesso.");

      if (novaCategoria.categoriaMaeId) {
        abrirPaisDaCategoria(novaCategoria.id);
        setCategoriasAbertas((atuais) =>
          atuais.includes(novaCategoria.categoriaMaeId!)
            ? atuais
            : [...atuais, novaCategoria.categoriaMaeId!]
        );
      }
    } catch {
      setErro("Erro ao criar categoria.");
    } finally {
      setCriando(false);
    }
  }

  async function salvarCategoria() {
    if (!categoriaEditando) {
      return;
    }

    limparMensagens();

    const nome = editNome.trim();

    if (!nome) {
      setErro("Informe o nome da categoria.");
      return;
    }

    setSalvando(true);

    try {
      const formData = new FormData();

      formData.append("nome", nome);
      formData.append("descricao", editDescricao);
      formData.append("imagemUrl", editImagemUrl);
      formData.append("exibirNoMenu", String(editExibirNoMenu));
      formData.append("ordemMenu", editOrdemMenu);
      formData.append("categoriaMaeId", editCategoriaMaeId || "");

      if (editImagemArquivo) {
        formData.append("imagem", editImagemArquivo);
      }

      const response = await fetch(
        `/api/produtos/categorias/${categoriaEditando.id}`,
        {
          method: "PATCH",
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao salvar categoria.");
        return;
      }

      const categoriaAtualizada = data.categoria as CategoriaLoja;

      setCategorias((atuais) =>
        atuais.map((categoria) =>
          categoria.id === categoriaAtualizada.id
            ? categoriaAtualizada
            : categoria
        )
      );

      setCategoriaEditando(null);
      setEditImagemArquivo(null);
      setSucesso("Categoria atualizada com sucesso.");
    } catch {
      setErro("Erro ao salvar categoria.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusaoCategoria() {
    if (!categoriaParaExcluir) {
      return;
    }

    limparMensagens();
    setExcluindo(true);

    try {
      const response = await fetch(
        `/api/produtos/categorias/${categoriaParaExcluir.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao excluir categoria.");
        setCategoriaParaExcluir(null);
        return;
      }

      setCategorias((atuais) =>
        atuais.filter((categoria) => categoria.id !== categoriaParaExcluir.id)
      );

      setCategoriasAbertas((atuais) =>
        atuais.filter((id) => id !== categoriaParaExcluir.id)
      );

      setCategoriaParaExcluir(null);
      setSucesso("Categoria excluída com sucesso.");
    } catch {
      setErro("Erro ao excluir categoria.");
    } finally {
      setExcluindo(false);
    }
  }

  async function abrirOuCriarPaginaCategoria(categoria: CategoriaLoja) {
    limparMensagens();

    if (categoria.paginaBuilderId) {
      window.location.href = `/configuracoes/loja/paginas/${categoria.paginaBuilderId}/editor`;
      return;
    }

    setCriandoPaginaCategoriaId(categoria.id);

    try {
      const response = await fetch("/api/configuracoes/loja/paginas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: `Categoria: ${categoria.nome}`,
          tipo: "CATEGORIA",
          categoriaId: categoria.id,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao criar página personalizada da categoria.");
        return;
      }

      if (data.pagina?.id) {
        window.location.href = `/configuracoes/loja/paginas/${data.pagina.id}/editor`;
        return;
      }

      setErro("Página criada, mas o editor não foi localizado.");
    } catch {
      setErro("Erro ao criar página personalizada da categoria.");
    } finally {
      setCriandoPaginaCategoriaId(null);
    }
  }

  function renderCategoria(categoria: CategoriaTreeItem, nivel = 0) {
    const aberta = categoriaEstaAberta(categoria.id);
    const temFilhos = categoria.filhos.length > 0;
    const caminho = montarCaminhoCategoria(categoria, categorias);

    return (
      <div key={categoria.id}>
        <div
          className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300"
          style={{
            marginLeft: `${nivel * 18}px`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (temFilhos) {
                alternarCategoriaAberta(categoria.id);
              }
            }}
            className={`mt-1 flex h-8 w-8 items-center justify-center rounded-2xl transition ${
              temFilhos
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "cursor-default bg-slate-50 text-slate-300"
            }`}
            aria-label={
              temFilhos
                ? aberta
                  ? "Recolher categoria"
                  : "Expandir categoria"
                : "Categoria sem subcategorias"
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

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {temFilhos ? (
                aberta ? (
                  <FolderOpen className="h-4 w-4 text-slate-400" />
                ) : (
                  <Folder className="h-4 w-4 text-slate-400" />
                )
              ) : null}

              <h3 className="text-sm font-semibold text-slate-950">
                {categoria.nome}
              </h3>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                /{categoria.slug}
              </span>

              {categoria.exibirNoMenu === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                  <EyeOff className="h-3 w-3" />
                  Oculta no menu
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <Eye className="h-3 w-3" />
                  Menu
                </span>
              )}

              {categoria.imagemUrl && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  <ImageIcon className="h-3 w-3" />
                  Imagem
                </span>
              )}

              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                Ordem {categoria.ordemMenu ?? 0}
              </span>

              {categoria.paginaBuilderId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  <LayoutTemplate className="h-3 w-3" />
                  Página personalizada
                </span>
              ) : (
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  Layout padrão
                </span>
              )}
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-400">{caminho}</p>

            {categoria.descricao && (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                {categoria.descricao}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => abrirOuCriarPaginaCategoria(categoria)}
              disabled={criandoPaginaCategoriaId === categoria.id}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`Criar ou editar página da categoria ${categoria.nome}`}
            >
              <LayoutTemplate className="h-4 w-4" />
              {categoria.paginaBuilderId
                ? "Editar página"
                : criandoPaginaCategoriaId === categoria.id
                ? "Criando..."
                : "Criar página"}
            </button>

            <button
              type="button"
              onClick={() => abrirEdicao(categoria)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label={`Editar categoria ${categoria.nome}`}
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                limparMensagens();
                setCategoriaParaExcluir({
                  id: categoria.id,
                  nome: categoria.nome,
                });
              }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
              aria-label={`Excluir categoria ${categoria.nome}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {temFilhos && aberta && (
          <div className="mt-2 space-y-2">
            {categoria.filhos.map((filho) => renderCategoria(filho, nivel + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Configurações da loja
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Categorias da loja
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Gerencie categorias mãe, subcategorias, imagens, descrições e
              exibição no menu inteligente da loja pública.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-slate-400">Total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {categorias.length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-slate-400">Mães</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {categoriasMae.length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-slate-400">Com imagem</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {categoriasComImagem.length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-slate-400">Ocultas</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {categoriasOcultasNoMenu.length}
              </p>
            </div>
          </div>
        </div>

        {(erro || sucesso) && (
          <div className="mb-5">
            {erro && (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                {sucesso}
              </div>
            )}
          </div>
        )}

        <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Criar nova categoria
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Crie categorias principais ou subcategorias para organizar o
                menu e os produtos da loja.
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-slate-950 text-white">
              <Plus className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome da categoria
              </span>

              <input
                value={nomeNovaCategoria}
                onChange={(event) => setNomeNovaCategoria(event.target.value)}
                placeholder="Ex: Anéis"
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Categoria mãe opcional
              </span>

              <select
                value={novaCategoriaMaeId}
                onChange={(event) => setNovaCategoriaMaeId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="">Sem categoria mãe</option>

                {categoriasOrdenadas.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {montarCaminhoCategoria(categoria, categorias)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={criarCategoria}
              disabled={criando}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {criando ? "Criando..." : "Criar"}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Estrutura de categorias
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Edite a árvore usada no menu público e nas páginas de categoria.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar categoria..."
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500 sm:w-72"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={expandirTodas}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Expandir
                </button>

                <button
                  type="button"
                  onClick={recolherTodas}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Recolher
                </button>
              </div>
            </div>
          </div>

          {categoriasArvoreFiltrada.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <Folder className="mx-auto h-8 w-8 text-slate-300" />

              <h3 className="mt-3 text-lg font-semibold text-slate-800">
                Nenhuma categoria encontrada
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Crie uma nova categoria ou ajuste sua busca.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categoriasArvoreFiltrada.map((categoria) =>
                renderCategoria(categoria)
              )}
            </div>
          )}
        </section>
      </div>

      {categoriaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Editar categoria
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {categoriaEditando.nome}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  O slug é mantido para não quebrar links já publicados.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCategoriaEditando(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar edição"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Nome
                  </span>

                  <input
                    value={editNome}
                    onChange={(event) => setEditNome(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Categoria mãe
                  </span>

                  <select
                    value={editCategoriaMaeId}
                    onChange={(event) =>
                      setEditCategoriaMaeId(event.target.value)
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">Sem categoria mãe</option>

                    {categoriasMaeDisponiveisEdicao.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {montarCaminhoCategoria(categoria, categorias)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Descrição curta
                </span>

                <textarea
                  value={editDescricao}
                  onChange={(event) => setEditDescricao(event.target.value)}
                  rows={3}
                  placeholder="Texto usado no menu e futuramente na página da categoria."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Imagem da categoria
                </span>

                <p className="mb-3 text-xs leading-5 text-slate-500">
                  Recomendado: imagem horizontal, leve, entre 800 × 500 px e
                  1000 × 600 px.
                </p>

                {editImagemUrl ? (
                  <img
                    src={editImagemUrl}
                    alt={editNome}
                    className="mb-3 h-48 w-full rounded-3xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="mb-3 flex h-48 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                    Nenhuma imagem configurada
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setEditImagemArquivo(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                <input
                  value={editImagemUrl}
                  onChange={(event) => setEditImagemUrl(event.target.value)}
                  placeholder="/uploads/categorias/imagem.jpg ou https://..."
                  className="mt-3 h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editExibirNoMenu}
                    onChange={(event) =>
                      setEditExibirNoMenu(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Exibir no menu inteligente
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Ordem no menu
                  </span>

                  <input
                    type="number"
                    value={editOrdemMenu}
                    onChange={(event) => setEditOrdemMenu(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCategoriaEditando(null)}
                  disabled={salvando}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarCategoria}
                  disabled={salvando}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {salvando ? "Salvando..." : "Salvar categoria"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {categoriaParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Excluir categoria
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {categoriaParaExcluir.nome}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCategoriaParaExcluir(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar confirmação"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                A exclusão só será permitida se a categoria não tiver produtos
                vinculados e não possuir subcategorias.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCategoriaParaExcluir(null)}
                  disabled={excluindo}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={confirmarExclusaoCategoria}
                  disabled={excluindo}
                  className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {excluindo ? "Excluindo..." : "Excluir categoria"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
