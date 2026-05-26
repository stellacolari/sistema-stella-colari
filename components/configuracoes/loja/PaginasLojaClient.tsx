"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  FileText,
  FolderTree,
  Globe2,
  Layers,
  LayoutTemplate,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export type LojaPaginaBuilderItem = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  ativo: boolean;
  categoriaId?: string | null;
  categoriaNome?: string | null;
  categoriaSlug?: string | null;
  statusPublicacao?: string;
  usarComoTemplatePadrao?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  totalBlocos: number;
  blocosAtivos: number;
  criadoEm: string;
  atualizadoEm: string;
};

export type CategoriaPaginaBuilderOption = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

type FormState = {
  titulo: string;
  slug: string;
  tipo: string;
  categoriaId: string;
  ativo: boolean;
  statusPublicacao: string;
  usarComoTemplatePadrao: boolean;
  seoTitle: string;
  seoDescription: string;
};

const TIPOS_PAGINA = [
  {
    value: "GERAL",
    label: "Página geral",
    description: "Páginas comuns da loja, como sobre, cuidados e políticas.",
    icon: FileText,
  },
  {
    value: "HOME",
    label: "Home da loja",
    description: "Página inicial pública da loja.",
    icon: Globe2,
  },
  {
    value: "CATEGORIA",
    label: "Categoria",
    description: "Página personalizada vinculada a uma categoria.",
    icon: FolderTree,
  },
  {
    value: "TEMPLATE_CATEGORIA",
    label: "Template de categoria",
    description: "Modelo reutilizável para categorias sem página própria.",
    icon: LayoutTemplate,
  },
  {
    value: "LANDING",
    label: "Landing page",
    description: "Página focada em campanha, lead ou conversão.",
    icon: Sparkles,
  },
  {
    value: "CAMPANHA",
    label: "Campanha",
    description: "Página temporária ou promocional.",
    icon: Megaphone,
  },
];

const STATUS_PUBLICACAO = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "PUBLICADA", label: "Publicada" },
  { value: "ARQUIVADA", label: "Arquivada" },
];

function tipoPaginaLabel(tipo: string) {
  return TIPOS_PAGINA.find((item) => item.value === tipo)?.label || tipo;
}

function tipoPaginaIcon(tipo: string) {
  return TIPOS_PAGINA.find((item) => item.value === tipo)?.icon || FileText;
}

function getUrlPublicaPagina(pagina: LojaPaginaBuilderItem) {
  if (pagina.tipo === "HOME" || pagina.slug === "home") {
    return "/loja";
  }

  if (pagina.tipo === "CATEGORIA" && pagina.categoriaSlug) {
    return `/loja/categoria/${pagina.categoriaSlug}`;
  }

  if (pagina.tipo === "TEMPLATE_CATEGORIA") {
    return "";
  }

  return `/loja/p/${pagina.slug}`;
}
function getUrlPreviewPagina(pagina: LojaPaginaBuilderItem) {
  return `/loja/preview/pagina/${pagina.id}`;
}
function confirmarEdicaoBlocosAoVivo(
  event: React.MouseEvent<HTMLAnchorElement>,
  pagina: LojaPaginaBuilderItem,
  paginaPublica: boolean
) {
  if (!paginaPublica) {
    return;
  }

  const confirmado = window.confirm(
    `A página "${pagina.titulo}" está publicada.\n\n` +
      "Como ainda não temos versionamento separado, qualquer alteração nos blocos será refletida no site público imediatamente.\n\n" +
      "Deseja continuar?"
  );

  if (!confirmado) {
    event.preventDefault();
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getEstadoInicial(): FormState {
  return {
    titulo: "",
    slug: "",
    tipo: "GERAL",
    categoriaId: "",
    ativo: false,
    statusPublicacao: "RASCUNHO",
    usarComoTemplatePadrao: false,
    seoTitle: "",
    seoDescription: "",
  };
}

function formatarData(dataIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dataIso));
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function PaginasLojaClient({
  paginas,
  categorias,
}: {
  paginas: LojaPaginaBuilderItem[];
  categorias: CategoriaPaginaBuilderOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [paginaEditando, setPaginaEditando] =
    useState<LojaPaginaBuilderItem | null>(null);

  const [form, setForm] = useState<FormState>(() => getEstadoInicial());
const [salvando, setSalvando] = useState(false);
const [excluindoId, setExcluindoId] = useState<string | null>(null);
const [publicandoId, setPublicandoId] = useState<string | null>(null);

  const paginasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return paginas.filter((pagina) => {
      const combinaBusca =
        !termo ||
        normalizarTexto(pagina.titulo).includes(termo) ||
        normalizarTexto(pagina.slug).includes(termo) ||
        normalizarTexto(pagina.tipo).includes(termo) ||
        normalizarTexto(pagina.categoriaNome).includes(termo);

      const combinaTipo = tipoFiltro === "TODOS" || pagina.tipo === tipoFiltro;

      const status = pagina.statusPublicacao || "PUBLICADA";
      const combinaStatus =
        statusFiltro === "TODOS" || status === statusFiltro;

      return combinaBusca && combinaTipo && combinaStatus;
    });
  }, [paginas, busca, tipoFiltro, statusFiltro]);

  const estatisticas = useMemo(() => {
    return {
      total: paginas.length,
      publicadas: paginas.filter(
        (pagina) => (pagina.statusPublicacao || "PUBLICADA") === "PUBLICADA"
      ).length,
      categorias: paginas.filter((pagina) => pagina.tipo === "CATEGORIA")
        .length,
      templates: paginas.filter(
        (pagina) => pagina.tipo === "TEMPLATE_CATEGORIA"
      ).length,
    };
  }, [paginas]);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function limparMensagens() {
    setErro("");
    setSucesso("");
  }

  function atualizarForm<K extends keyof FormState>(
    campo: K,
    valor: FormState[K]
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

function abrirCriacao(tipo = "GERAL") {
  limparMensagens();

  setPaginaEditando(null);
  setForm({
    ...getEstadoInicial(),
    tipo,
    ativo: false,
    statusPublicacao: "RASCUNHO",
    usarComoTemplatePadrao: tipo === "TEMPLATE_CATEGORIA",
  });
  setModalAberto(true);
}

  function abrirEdicao(pagina: LojaPaginaBuilderItem) {
    limparMensagens();

    setPaginaEditando(pagina);
    setForm({
      titulo: pagina.titulo,
      slug: pagina.slug,
      tipo: pagina.tipo,
      categoriaId: pagina.categoriaId || "",
      ativo: pagina.ativo,
      statusPublicacao: pagina.statusPublicacao || "PUBLICADA",
      usarComoTemplatePadrao: Boolean(pagina.usarComoTemplatePadrao),
      seoTitle: pagina.seoTitle || "",
      seoDescription: pagina.seoDescription || "",
    });
    setModalAberto(true);
  }

 async function salvarPagina() {
  limparMensagens();

  const titulo = form.titulo.trim();
  const slug = form.slug.trim() || slugify(titulo);

  if (!titulo) {
    setErro("Informe o título da página.");
    return;
  }

  if (form.tipo === "CATEGORIA" && !form.categoriaId) {
    setErro("Selecione uma categoria para páginas do tipo categoria.");
    return;
  }

  if (form.tipo !== "CATEGORIA" && form.categoriaId) {
    setErro("Categoria vinculada só deve ser usada em páginas do tipo categoria.");
    return;
  }

  setSalvando(true);

  try {
    const payload = {
      titulo,
      slug,
      tipo: form.tipo,
      categoriaId: form.tipo === "CATEGORIA" ? form.categoriaId : null,

      // Na criação, a API também força RASCUNHO/inativa.
      // Mantemos aqui para a interface seguir a mesma regra.
ativo: paginaEditando ? form.ativo : false,
statusPublicacao: paginaEditando ? form.statusPublicacao : "RASCUNHO",

      usarComoTemplatePadrao:
        form.tipo === "TEMPLATE_CATEGORIA"
          ? form.usarComoTemplatePadrao
          : false,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
    };

    const response = await fetch(
      paginaEditando
        ? `/api/configuracoes/loja/paginas/${paginaEditando.id}`
        : "/api/configuracoes/loja/paginas",
      {
        method: paginaEditando ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await lerRespostaApi(response);

    if (!response.ok) {
      setErro(data.error || "Erro ao salvar página.");
      return;
    }

    setModalAberto(false);
    setPaginaEditando(null);
    setForm(getEstadoInicial());
    setSucesso(
      paginaEditando
        ? "Página atualizada com sucesso."
        : "Página criada como rascunho. Publique manualmente quando estiver pronta."
    );
    refresh();
  } catch {
    setErro("Erro ao salvar página.");
  } finally {
    setSalvando(false);
  }
}

async function publicarPagina(pagina: LojaPaginaBuilderItem) {
  limparMensagens();

  if (pagina.statusPublicacao === "PUBLICADA" && pagina.ativo) {
    setErro("Esta página já está publicada.");
    return;
  }

  if (pagina.tipo === "CATEGORIA" && !pagina.categoriaId) {
    setErro("Esta página de categoria não possui categoria vinculada.");
    return;
  }

  if (pagina.totalBlocos === 0 || pagina.blocosAtivos === 0) {
    const confirmado = window.confirm(
      `A página "${pagina.titulo}" não possui blocos ativos.\n\nDeseja publicar mesmo assim?`
    );

    if (!confirmado) {
      return;
    }
  }

  setPublicandoId(pagina.id);

  try {
    const response = await fetch(
      `/api/configuracoes/loja/paginas/${pagina.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusPublicacao: "PUBLICADA",
        }),
      }
    );

    const data = await lerRespostaApi(response);

    if (!response.ok) {
      setErro(data.error || "Erro ao publicar página.");
      return;
    }

    setSucesso("Página publicada com sucesso.");
    refresh();
  } catch {
    setErro("Erro ao publicar página.");
  } finally {
    setPublicandoId(null);
  }
}

async function tirarPaginaDoAr(pagina: LojaPaginaBuilderItem) {
  limparMensagens();

  if (pagina.tipo === "HOME" || pagina.slug === "home") {
    const confirmadoHome = window.confirm(
      "Você está tentando tirar a Home do ar.\n\nIsso pode afetar a página inicial da loja. Deseja continuar?"
    );

    if (!confirmadoHome) {
      return;
    }
  }

  const confirmado = window.confirm(
    `Deseja tirar a página "${pagina.titulo}" do ar?\n\nEla voltará para rascunho e não ficará visível no site público.`
  );

  if (!confirmado) {
    return;
  }

  setPublicandoId(pagina.id);

  try {
    const response = await fetch(
      `/api/configuracoes/loja/paginas/${pagina.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusPublicacao: "RASCUNHO",
        }),
      }
    );

    const data = await lerRespostaApi(response);

    if (!response.ok) {
      setErro(data.error || "Erro ao tirar página do ar.");
      return;
    }

    setSucesso("Página retirada do ar e movida para rascunho.");
    refresh();
  } catch {
    setErro("Erro ao tirar página do ar.");
  } finally {
    setPublicandoId(null);
  }
}

  async function arquivarPagina(pagina: LojaPaginaBuilderItem) {
    limparMensagens();

    if (pagina.tipo === "HOME" || pagina.slug === "home") {
      setErro("A Home não pode ser arquivada por aqui.");
      return;
    }

    const confirmado = window.confirm(
      `Deseja arquivar a página "${pagina.titulo}"?`
    );

    if (!confirmado) {
      return;
    }

    setExcluindoId(pagina.id);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ativo: false,
            statusPublicacao: "ARQUIVADA",
          }),
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao arquivar página.");
        return;
      }

      setSucesso("Página arquivada com sucesso.");
      refresh();
    } catch {
      setErro("Erro ao arquivar página.");
    } finally {
      setExcluindoId(null);
    }
  }
  async function excluirPaginaPermanentemente(pagina: LojaPaginaBuilderItem) {
  limparMensagens();

  if (pagina.tipo === "HOME" || pagina.slug === "home") {
    setErro("A Home não pode ser excluída permanentemente.");
    return;
  }

  const confirmado = window.confirm(
    `Deseja excluir permanentemente a página "${pagina.titulo}"?\n\nEssa ação apagará a página e todos os blocos dela. Não será possível recuperar.`
  );

  if (!confirmado) {
    return;
  }

  const confirmacaoTexto = window.prompt(
    `Para confirmar a exclusão permanente, digite EXCLUIR`
  );

  if (confirmacaoTexto !== "EXCLUIR") {
    setErro("Exclusão cancelada. Confirmação inválida.");
    return;
  }

  setExcluindoId(pagina.id);

  try {
    const response = await fetch(
      `/api/configuracoes/loja/paginas/${pagina.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await lerRespostaApi(response);

    if (!response.ok) {
      setErro(data.error || "Erro ao excluir página permanentemente.");
      return;
    }

    setSucesso("Página excluída permanentemente.");
    refresh();
  } catch {
    setErro("Erro ao excluir página permanentemente.");
  } finally {
    setExcluindoId(null);
  }
}

  return (
    <section className="space-y-6">
      {(erro || sucesso) && (
        <div className="space-y-3">
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {estatisticas.total}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Publicadas
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {estatisticas.publicadas}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Categorias
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {estatisticas.categorias}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Templates
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {estatisticas.templates}
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Páginas cadastradas
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Crie páginas por tipo e vincule páginas específicas às categorias
              quando precisar de controle total.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => abrirCriacao("GERAL")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Página geral
            </button>

            <button
              type="button"
              onClick={() => abrirCriacao("CATEGORIA")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FolderTree className="h-4 w-4" />
              Categoria
            </button>

            <button
              type="button"
              onClick={() => abrirCriacao("TEMPLATE_CATEGORIA")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <LayoutTemplate className="h-4 w-4" />
              Template categoria
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar página, slug, tipo ou categoria..."
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <select
            value={tipoFiltro}
            onChange={(event) => setTipoFiltro(event.target.value)}
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="TODOS">Todos os tipos</option>

            {TIPOS_PAGINA.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>

          <select
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value)}
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="TODOS">Todos os status</option>

            {STATUS_PUBLICACAO.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          {paginasFiltradas.length === 0 ? (
            <div className="bg-slate-50 px-5 py-12 text-center">
              <Layers className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Nenhuma página encontrada
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Crie uma nova página ou ajuste os filtros.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {paginasFiltradas.map((pagina) => {
                const Icone = tipoPaginaIcon(pagina.tipo);
                const urlPublica = getUrlPublicaPagina(pagina);
                const status = pagina.statusPublicacao || "PUBLICADA";
                const paginaPublica = pagina.ativo && status === "PUBLICADA";

                return (
                  <article
                    key={pagina.id}
                    className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1fr_auto]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <Icone className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">
                            {pagina.titulo}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                            {tipoPaginaLabel(pagina.tipo)}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              status === "PUBLICADA"
                                ? "bg-emerald-50 text-emerald-700"
                                : status === "RASCUNHO"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {status}
                          </span>

                          {pagina.usarComoTemplatePadrao && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                              Template padrão
                            </span>
                          )}

                          {!pagina.ativo && (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                              Inativa
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            Slug:{" "}
                            <strong className="font-semibold text-slate-700">
                              {pagina.slug}
                            </strong>
                          </span>

                          {pagina.categoriaNome && (
                            <span>
                              Categoria:{" "}
                              <strong className="font-semibold text-slate-700">
                                {pagina.categoriaNome}
                              </strong>
                            </span>
                          )}
                          <Link
                            href={`/configuracoes/loja/paginas/${pagina.id}/blocos`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Layers className="h-4 w-4" />
                            Blocos
                          </Link>

                          <span>Atualizada em {formatarData(pagina.atualizadoEm)}</span>
                        </div>

                        {urlPublica ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {paginaPublica ? "URL pública:" : "URL após publicação:"}{" "}
                            <span className="font-semibold text-slate-600">
                              {urlPublica}
                            </span>
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">
                            Template reutilizável, sem URL pública própria.
                          </p>
                        )}
                          <p className="mt-1 text-xs text-slate-400">
                            Template reutilizável, sem URL pública própria.
                          </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <Link
                      href={`/configuracoes/loja/paginas/${pagina.id}/blocos`}
                      onClick={(event) =>
                        confirmarEdicaoBlocosAoVivo(event, pagina, paginaPublica)
                      }
                      className={
                        paginaPublica
                          ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                          : "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      }
                      title={
                        paginaPublica
                          ? "Esta página está publicada. Alterações nos blocos aparecem no site imediatamente."
                          : "Editar blocos da página"
                      }
                    >
                      <LayoutTemplate className="h-4 w-4" />
                      {paginaPublica ? "Editar ao vivo" : "Blocos"}
                    </Link>

                        {urlPublica && paginaPublica && (
                          <Link
                            href={urlPublica}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Link>
                        )}

                      <button
                        type="button"
                        onClick={() => abrirEdicao(pagina)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      {status !== "ARQUIVADA" && !paginaPublica && (
                        <Link
                          href={getUrlPreviewPagina(pagina)}
                          target="_blank"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <Eye className="h-4 w-4" />
                          Prévia
                        </Link>
                      )}
                      {status === "PUBLICADA" && pagina.ativo ? (
                        <button
                          type="button"
                          onClick={() => tirarPaginaDoAr(pagina)}
                          disabled={publicandoId === pagina.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Archive className="h-4 w-4" />
                          {publicandoId === pagina.id ? "Atualizando" : "Tirar do ar"}
                        </button>
                      ) : status !== "ARQUIVADA" ? (
                        <button
                          type="button"
                          onClick={() => publicarPagina(pagina)}
                          disabled={publicandoId === pagina.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {publicandoId === pagina.id ? "Publicando" : "Publicar"}
                        </button>
                      ) : null}

                      {pagina.tipo !== "HOME" && pagina.slug !== "home" && (
  <>
    <button
      type="button"
      onClick={() => arquivarPagina(pagina)}
      disabled={excluindoId === pagina.id}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Archive className="h-4 w-4" />
      Arquivar
    </button>

    <button
      type="button"
      onClick={() => excluirPaginaPermanentemente(pagina)}
      disabled={excluindoId === pagina.id}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {excluindoId === pagina.id ? "Excluindo" : "Excluir"}
    </button>
  </>
)}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {paginaEditando ? "Editar página" : "Nova página"}
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {paginaEditando ? paginaEditando.titulo : "Criar página"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Configure tipo, vínculo com categoria, publicação e SEO.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalAberto(false);
                  setPaginaEditando(null);
                  setForm(getEstadoInicial());
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Título
                  </span>

                  <input
                    value={form.titulo}
                    onChange={(event) => {
                      const titulo = event.target.value;
                      atualizarForm("titulo", titulo);

                      if (!paginaEditando) {
                        atualizarForm("slug", slugify(titulo));
                      }
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-slate-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Slug interno
                  </span>

                  <input
                    value={form.slug}
                    onChange={(event) =>
                      atualizarForm("slug", slugify(event.target.value))
                    }
                    disabled={form.tipo === "HOME"}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Tipo de página
                  </span>

                  <select
                    value={form.tipo}
                    onChange={(event) => {
                      const tipo = event.target.value;

                      atualizarForm("tipo", tipo);
                      atualizarForm(
                        "usarComoTemplatePadrao",
                        tipo === "TEMPLATE_CATEGORIA"
                      );

                      if (tipo !== "CATEGORIA") {
                        atualizarForm("categoriaId", "");
                      }

                      if (tipo === "HOME") {
                        atualizarForm("slug", "home");
                      }
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-slate-500"
                  >
                    {TIPOS_PAGINA.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Status de publicação
                  </span>
                  <select
                    value={form.statusPublicacao}
                    onChange={(event) =>
                      atualizarForm("statusPublicacao", event.target.value)
                    }
                    disabled={!paginaEditando}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {STATUS_PUBLICACAO.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {!paginaEditando && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Toda página nova nasce como rascunho. Ela só ficará pública após uma ação
                      explícita de publicação.
                    </p>
                  )}
                  {!paginaEditando && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Toda página nova nasce como rascunho. Ela só ficará pública após uma ação
                      explícita de publicação.
                    </p>
                  )}
                </label>
              </div>

              {form.tipo === "CATEGORIA" && (
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Categoria vinculada
                  </span>

                  <select
                    value={form.categoriaId}
                    onChange={(event) =>
                      atualizarForm("categoriaId", event.target.value)
                    }
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">Selecione a categoria</option>

                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.caminho}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    A URL pública será a URL da categoria:{" "}
                    <strong>/loja/categoria/slug-da-categoria</strong>.
                  </p>
                </label>
              )}

              {form.tipo === "TEMPLATE_CATEGORIA" && (
                <label className="flex items-start gap-3 rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <input
                    type="checkbox"
                    checked={form.usarComoTemplatePadrao}
                    onChange={(event) =>
                      atualizarForm(
                        "usarComoTemplatePadrao",
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-blue-300"
                  />

                  <span>
                    <strong className="block">Usar como template padrão</strong>
                    <span className="mt-1 block leading-6 text-blue-800">
                      Este template será usado para categorias que não tiverem
                      uma página personalizada vinculada.
                    </span>
                  </span>
                </label>
              )}

                <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(event) => atualizarForm("ativo", event.target.checked)}
                    disabled={!paginaEditando}
                    className="mt-1 h-4 w-4 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <span>
                    <span className="block">Página ativa</span>

                    {!paginaEditando && (
                      <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                        Novas páginas começam inativas para evitar publicação acidental.
                      </span>
                    )}
                  </span>
                </label>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  SEO básico
                </p>

                <div className="mt-4 grid gap-4">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      SEO title
                    </span>

                    <input
                      value={form.seoTitle}
                      onChange={(event) =>
                        atualizarForm("seoTitle", event.target.value)
                      }
                      placeholder="Título para buscadores"
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      SEO description
                    </span>

                    <textarea
                      value={form.seoDescription}
                      onChange={(event) =>
                        atualizarForm("seoDescription", event.target.value)
                      }
                      rows={3}
                      placeholder="Resumo da página para buscadores"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Como esta página será usada
                </p>

                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
                  {form.tipo === "CATEGORIA" ? (
                    <p>
                      Esta página será renderizada dentro de{" "}
                      <strong>/loja/categoria/[slug]</strong>, usando a
                      categoria vinculada como contexto dinâmico.
                    </p>
                  ) : form.tipo === "TEMPLATE_CATEGORIA" ? (
                    <p>
                      Este template não tem URL pública própria. Ele será usado
                      como fallback para categorias sem página personalizada.
                    </p>
                  ) : form.tipo === "HOME" ? (
                    <p>
                      Esta página será renderizada em <strong>/loja</strong>.
                    </p>
                  ) : (
                    <p>
                      Esta página será renderizada em{" "}
                      <strong>/loja/p/{form.slug || "slug-da-pagina"}</strong>.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false);
                    setPaginaEditando(null);
                    setForm(getEstadoInicial());
                  }}
                  disabled={salvando}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarPagina}
                  disabled={salvando}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {salvando ? "Salvando..." : "Salvar página"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}