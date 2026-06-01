"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  ImageIcon,
  LayoutGrid,
  Layers3,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import LinkSugestoesInput from "@/components/configuracoes/loja/LinkSugestoesInput";

export type HomeCategoriaDisponivel = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

export type HomeCategoriaItem = {
  id: string;
  titulo: string;
  categoria: string;
  imagemUrl: string;
  ordem: number;
  ativo: boolean;
};

export type HomeGarantiaItem = {
  id: string;
  titulo: string;
  conteudo: string;
};

export type HomeSecaoItem = {
  id: string;
  titulo: string;
  categorias: string;
  ordem: number;
  ativo: boolean;
};

export type HomeBlocoItem = {
  id: string;
  titulo: string;
  texto: string;
  imagemUrl: string | null;
  textoBotao: string | null;
  linkBotao: string | null;
  ativo: boolean;
};

type HomeLojaClientProps = {
  categoriasDisponiveis: HomeCategoriaDisponivel[];
  categoriasHome: HomeCategoriaItem[];
  secoes: HomeSecaoItem[];
  bloco: HomeBlocoItem | null;
  garantia: HomeGarantiaItem | null;
};

type AbaHome = "CATEGORIAS" | "SECOES" | "BLOCO" | "GARANTIA";

function categoriasStringParaArray(value: string) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleCategoria(lista: string[], categoria: string) {
  if (lista.includes(categoria)) {
    return lista.filter((item) => item !== categoria);
  }

  return [...lista, categoria];
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        ativo
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof LayoutGrid;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-300" />

      <h3 className="mt-3 text-base font-semibold text-slate-800">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function HomeLojaClient({
  categoriasDisponiveis,
  categoriasHome,
  secoes,
  bloco,
  garantia,
}: HomeLojaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [abaAtiva, setAbaAtiva] = useState<AbaHome>("CATEGORIAS");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [categoriaTitulo, setCategoriaTitulo] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [categoriaArquivo, setCategoriaArquivo] = useState<File | null>(null);

  const [secaoTitulo, setSecaoTitulo] = useState("");
  const [secaoCategorias, setSecaoCategorias] = useState<string[]>([]);
  const [secaoOrdem, setSecaoOrdem] = useState(String(secoes.length));

  const [blocoTitulo, setBlocoTitulo] = useState(bloco?.titulo ?? "");
  const [blocoTexto, setBlocoTexto] = useState(bloco?.texto ?? "");
  const [blocoTextoBotao, setBlocoTextoBotao] = useState(
    bloco?.textoBotao ?? ""
  );
  const [blocoLinkBotao, setBlocoLinkBotao] = useState(bloco?.linkBotao ?? "");
  const [blocoAtivo, setBlocoAtivo] = useState(bloco?.ativo ?? true);
  const [blocoArquivo, setBlocoArquivo] = useState<File | null>(null);

  const [garantiaTitulo, setGarantiaTitulo] = useState(
    garantia?.titulo ?? "Garantia"
  );
  const [garantiaConteudo, setGarantiaConteudo] = useState(
    garantia?.conteudo ??
      "Todas as peças passam por conferência antes do envio. A garantia cobre defeitos de fabricação, conforme análise interna. Danos por mau uso, queda, contato com produtos químicos ou desgaste natural não são cobertos."
  );

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function getCategoriaNomeByIdOrNome(value: string) {
    const encontrada = categoriasDisponiveis.find(
      (categoria) => categoria.id === value || categoria.nome === value
    );

    return encontrada?.nome || value;
  }

  function toggleCategoriaSecao(categoria: string) {
    setSecaoCategorias((current) => toggleCategoria(current, categoria));
  }

  async function criarCategoriaHome() {
    setErro(null);
    setSucesso(null);

    if (!categoriaTitulo.trim()) {
      setErro("Informe o texto exibido da categoria.");
      return;
    }

    if (!categoriaSelecionada) {
      setErro("Selecione a categoria vinculada.");
      return;
    }

    if (!categoriaArquivo) {
      setErro("Selecione uma imagem para a categoria.");
      return;
    }

    const categoriaNome = getCategoriaNomeByIdOrNome(categoriaSelecionada);

    const formData = new FormData();
    formData.append("titulo", categoriaTitulo);
    formData.append("categoria", categoriaNome);
    formData.append("ordem", String(categoriasHome.length));
    formData.append("ativo", "true");
    formData.append("imagem", categoriaArquivo);

    const response = await fetch("/api/configuracoes/loja/home/categorias", {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Erro ao criar categoria da home.");
      return;
    }

    setCategoriaTitulo("");
    setCategoriaSelecionada("");
    setCategoriaArquivo(null);
    setSucesso("Categoria adicionada à home.");

    const input = document.getElementById(
      "home-categoria-imagem"
    ) as HTMLInputElement | null;

    if (input) input.value = "";

    refresh();
  }

  async function atualizarCategoriaHome(
    item: HomeCategoriaItem,
    data: {
      titulo: string;
      categoria: string;
      ordem: number;
      ativo: boolean;
      arquivo?: File | null;
    }
  ) {
    setErro(null);
    setSucesso(null);

    const formData = new FormData();
    formData.append("titulo", data.titulo);
    formData.append("categoria", data.categoria);
    formData.append("ordem", String(data.ordem));
    formData.append("ativo", String(data.ativo));

    if (data.arquivo) {
      formData.append("imagem", data.arquivo);
    }

    const response = await fetch(
      `/api/configuracoes/loja/home/categorias/${item.id}`,
      {
        method: "PATCH",
        body: formData,
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(result.error || "Erro ao atualizar categoria da home.");
      return;
    }

    setSucesso("Categoria atualizada.");
    refresh();
  }

  async function excluirCategoriaHome(item: HomeCategoriaItem) {
    const confirmado = window.confirm(`Excluir ${item.titulo} da home?`);

    if (!confirmado) return;

    const response = await fetch(
      `/api/configuracoes/loja/home/categorias/${item.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Erro ao excluir categoria.");
      return;
    }

    setSucesso("Categoria removida da home.");
    refresh();
  }

  async function criarSecao() {
    setErro(null);
    setSucesso(null);

    if (!secaoTitulo.trim()) {
      setErro("Informe o título da seção.");
      return;
    }

    if (secaoCategorias.length === 0) {
      setErro("Selecione ao menos uma categoria para a seção.");
      return;
    }

    const response = await fetch("/api/configuracoes/loja/home/secoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titulo: secaoTitulo,
        categorias: secaoCategorias,
        ordem: Number(secaoOrdem || secoes.length),
        ativo: true,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Erro ao criar seção.");
      return;
    }

    setSecaoTitulo("");
    setSecaoCategorias([]);
    setSecaoOrdem(String(secoes.length + 1));
    setSucesso("Seção criada.");
    refresh();
  }

  async function atualizarSecao(
    secao: HomeSecaoItem,
    data: Partial<HomeSecaoItem>
  ) {
    const response = await fetch(
      `/api/configuracoes/loja/home/secoes/${secao.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: data.titulo ?? secao.titulo,
          categorias: data.categorias ?? secao.categorias,
          ordem: data.ordem ?? secao.ordem,
          ativo: data.ativo ?? secao.ativo,
        }),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(result.error || "Erro ao atualizar seção.");
      return;
    }

    setSucesso("Seção atualizada.");
    refresh();
  }

  async function excluirSecao(secao: HomeSecaoItem) {
    const confirmado = window.confirm(`Excluir a seção ${secao.titulo}?`);

    if (!confirmado) return;

    const response = await fetch(
      `/api/configuracoes/loja/home/secoes/${secao.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Erro ao excluir seção.");
      return;
    }

    setSucesso("Seção excluída.");
    refresh();
  }

  async function salvarBloco() {
    setErro(null);
    setSucesso(null);

    const formData = new FormData();
    formData.append("titulo", blocoTitulo);
    formData.append("texto", blocoTexto);
    formData.append("textoBotao", blocoTextoBotao);
    formData.append("linkBotao", blocoLinkBotao);
    formData.append("ativo", String(blocoAtivo));

    if (blocoArquivo) {
      formData.append("imagem", blocoArquivo);
    }

    const response = await fetch("/api/configuracoes/loja/home/bloco", {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Erro ao salvar bloco promocional.");
      return;
    }

    setSucesso("Bloco promocional salvo.");
    setBlocoArquivo(null);

    const input = document.getElementById(
      "home-bloco-imagem"
    ) as HTMLInputElement | null;

    if (input) input.value = "";

    refresh();
  }

  async function salvarGarantia() {
    setErro(null);
    setSucesso(null);

    const response = await fetch("/api/configuracoes/loja/home/garantia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titulo: garantiaTitulo,
        conteudo: garantiaConteudo,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErro(data.error || "Erro ao salvar garantia.");
      return;
    }

    setSucesso("Garantia salva com sucesso.");
    refresh();
  }

  const abas = [
    {
      id: "CATEGORIAS" as const,
      label: "Categorias",
      icon: LayoutGrid,
      resumo: `${categoriasHome.filter((item) => item.ativo).length} ativas`,
    },
    {
      id: "SECOES" as const,
      label: "Seções",
      icon: Layers3,
      resumo: `${secoes.filter((item) => item.ativo).length} ativas`,
    },
    {
      id: "BLOCO" as const,
      label: "Bloco imagem/texto",
      icon: ImageIcon,
      resumo: blocoAtivo ? "Ativo" : "Inativo",
    },
    {
      id: "GARANTIA" as const,
      label: "Garantia",
      icon: ShieldCheck,
      resumo: garantia ? "Configurada" : "Padrão",
    },
  ];

  return (
    <div className="space-y-6">
      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {sucesso}
        </div>
      )}

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Estrutura da home
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Edite a vitrine pública em blocos. Cada área abaixo corresponde a
              uma parte visível da home da loja.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {abas.map((aba) => {
              const Icon = aba.icon;
              const ativa = abaAtiva === aba.id;

              return (
                <button
                  key={aba.id}
                  type="button"
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition ${
                    ativa
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {aba.label}
                  <span
                    className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold lg:inline-flex ${
                      ativa
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {aba.resumo}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {abaAtiva === "CATEGORIAS" && (
        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-slate-400" />

              <h2 className="text-lg font-semibold text-slate-900">
                Nova categoria em destaque
              </h2>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cadastre até 6 categorias para aparecerem em boxes visuais na
              home. Use categorias mãe ou subcategorias.
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={categoriaTitulo}
                onChange={(event) => setCategoriaTitulo(event.target.value)}
                placeholder="Texto exibido. Ex: Anéis"
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />

              <select
                value={categoriaSelecionada}
                onChange={(event) => {
                  const value = event.target.value;
                  const categoria = categoriasDisponiveis.find(
                    (item) => item.nome === value
                  );

                  setCategoriaSelecionada(value);

                  if (categoria && !categoriaTitulo.trim()) {
                    setCategoriaTitulo(categoria.nome);
                  }
                }}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              >
                <option value="">Categoria vinculada</option>

                {categoriasDisponiveis.map((categoria) => (
                  <option key={categoria.id} value={categoria.nome}>
                    {categoria.caminho}
                  </option>
                ))}
              </select>

              <div>
                <p className="mb-2 text-xs leading-5 text-slate-500">
                  Imagem quadrada recomendada para o card da home.
                </p>

                <input
                  id="home-categoria-imagem"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setCategoriaArquivo(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={criarCategoriaHome}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Adicionar categoria
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Categorias da home
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Prévia dos cards exibidos na seção “Compre por categorias”.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {categoriasHome.length}/6 cadastradas
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {categoriasHome.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                >
                  <div className="relative">
                    <img
                      src={item.imagemUrl}
                      alt={item.titulo}
                      className="aspect-square w-full object-cover"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-black/5" />

                    <div className="absolute left-3 top-3">
                      <StatusBadge ativo={item.ativo} />
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    <input
                      defaultValue={item.titulo}
                      onBlur={(event) =>
                        atualizarCategoriaHome(item, {
                          titulo: event.target.value,
                          categoria: item.categoria,
                          ordem: item.ordem,
                          ativo: item.ativo,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                    />

                    <select
                      defaultValue={item.categoria}
                      onChange={(event) =>
                        atualizarCategoriaHome(item, {
                          titulo: item.titulo,
                          categoria: event.target.value,
                          ordem: item.ordem,
                          ativo: item.ativo,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                    >
                      {categoriasDisponiveis.map((categoria) => (
                        <option key={categoria.id} value={categoria.nome}>
                          {categoria.caminho}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          atualizarCategoriaHome(item, {
                            titulo: item.titulo,
                            categoria: item.categoria,
                            ordem: item.ordem,
                            ativo: !item.ativo,
                          })
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                          item.ativo
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.ativo ? "Ativo" : "Inativo"}
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirCategoriaHome(item)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {categoriasHome.length === 0 && (
                <EmptyState
                  icon={LayoutGrid}
                  title="Nenhuma categoria configurada"
                  description="Adicione categorias em destaque para montar a vitrine inicial da loja."
                />
              )}
            </div>
          </div>
        </section>
      )}

      {abaAtiva === "SECOES" && (
        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-slate-400" />

              <h2 className="text-lg font-semibold text-slate-900">
                Nova seção de produtos
              </h2>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Crie seções de produtos por categoria. As seções aceitam múltiplas
              categorias e subcategorias.
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={secaoTitulo}
                onChange={(event) => setSecaoTitulo(event.target.value)}
                placeholder="Título da seção. Ex: Presentes especiais"
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />

              <input
                type="number"
                value={secaoOrdem}
                onChange={(event) => setSecaoOrdem(event.target.value)}
                placeholder="Ordem"
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />

              <div className="max-h-64 space-y-2 overflow-auto rounded-2xl border border-slate-200 p-3">
                {categoriasDisponiveis.map((categoria) => (
                  <label
                    key={categoria.id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={secaoCategorias.includes(categoria.nome)}
                      onChange={() => toggleCategoriaSecao(categoria.nome)}
                    />
                    {categoria.caminho}
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={criarSecao}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Criar seção
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Seções cadastradas
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Cada seção exibe uma vitrine de produtos na home pública.
            </p>

            <div className="mt-5 space-y-3">
              {secoes.map((secao) => {
                const categoriasDaSecao = categoriasStringParaArray(
                  secao.categorias
                );

                return (
                  <div
                    key={secao.id}
                    className="rounded-3xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <input
                          defaultValue={secao.titulo}
                          onBlur={(event) =>
                            atualizarSecao(secao, {
                              titulo: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400"
                        />

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {categoriasDaSecao.map((categoria) => (
                            <span
                              key={categoria}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                            >
                              {categoria}
                            </span>
                          ))}
                        </div>
                      </div>

                      <StatusBadge ativo={secao.ativo} />
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
                      <input
                        type="number"
                        defaultValue={secao.ordem}
                        onBlur={(event) =>
                          atualizarSecao(secao, {
                            ordem: Number(event.target.value || 0),
                          })
                        }
                        className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          atualizarSecao(secao, { ativo: !secao.ativo })
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                          secao.ativo
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {secao.ativo ? "Ativo" : "Inativo"}
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirSecao(secao)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {secoes.length === 0 && (
                <EmptyState
                  icon={Layers3}
                  title="Nenhuma seção cadastrada"
                  description="Crie vitrines de produtos para organizar a home em blocos comerciais."
                />
              )}
            </div>
          </div>
        </section>
      )}

      {abaAtiva === "BLOCO" && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-slate-400" />

                <h2 className="text-lg font-semibold text-slate-900">
                  Bloco imagem + texto
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Este bloco aparece entre as seções de produtos e funciona como
                uma chamada editorial ou promocional.
              </p>
            </div>

            <StatusBadge ativo={blocoAtivo} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <input
                value={blocoTitulo}
                onChange={(event) => setBlocoTitulo(event.target.value)}
                placeholder="Título do bloco"
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />

              <textarea
                value={blocoTexto}
                onChange={(event) => setBlocoTexto(event.target.value)}
                placeholder="Texto do bloco"
                rows={5}
                className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
              />

              <input
                value={blocoTextoBotao}
                onChange={(event) => setBlocoTextoBotao(event.target.value)}
                placeholder="Texto do botão. Ex: Conhecer coleção"
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />

              <LinkSugestoesInput
                value={blocoLinkBotao}
                onChange={setBlocoLinkBotao}
                label="Link do botão"
                ajuda="Busque uma página, categoria, produto ou digite um link personalizado."
              />

              <div>
                <p className="mb-2 text-xs leading-5 text-slate-500">
                  Imagem usada no bloco imagem + texto. Em uma próxima etapa,
                  este bloco poderá ter versões desktop/mobile.
                </p>

                <input
                  id="home-bloco-imagem"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setBlocoArquivo(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={blocoAtivo}
                  onChange={(event) => setBlocoAtivo(event.target.checked)}
                />
                Bloco ativo
              </label>

              <button
                type="button"
                onClick={salvarBloco}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                Salvar bloco
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              {bloco?.imagemUrl ? (
                <img
                  src={bloco.imagemUrl}
                  alt={bloco.titulo}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-sm text-slate-500">
                  Nenhuma imagem cadastrada
                </div>
              )}

              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Prévia do bloco
                </p>

                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  {blocoTitulo || "Título do bloco"}
                </h3>

                <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">
                  {blocoTexto || "Texto do bloco aparecerá aqui."}
                </p>

                {blocoTextoBotao && (
                  <div className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    {blocoTextoBotao}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {abaAtiva === "GARANTIA" && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-400" />

            <h2 className="text-lg font-semibold text-slate-900">
              Garantia dos produtos
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Este texto aparece na aba de garantia de todos os produtos da loja
            pública.
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
            <div className="grid gap-4">
              <input
                value={garantiaTitulo}
                onChange={(event) => setGarantiaTitulo(event.target.value)}
                placeholder="Título da aba. Ex: Garantia"
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />

              <textarea
                value={garantiaConteudo}
                onChange={(event) => setGarantiaConteudo(event.target.value)}
                placeholder="Texto da garantia"
                rows={8}
                className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-slate-400"
              />

              <button
                type="button"
                onClick={salvarGarantia}
                className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                Salvar garantia
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-400" />

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Prévia na página do produto
                </p>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {garantiaTitulo || "Garantia"}
              </h3>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                {garantiaConteudo || "Texto da garantia aparecerá aqui."}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}