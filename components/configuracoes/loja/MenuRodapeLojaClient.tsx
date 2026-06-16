"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  ExternalLink,
  FolderTree,
  Globe2,
  Link as LinkIcon,
  Menu,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  LojaMenuRodapeConfig,
  LojaRedeSocial,
  LojaRodapeColuna,
  LojaRodapeLink,
  LojaSeloRodape,
} from "@/lib/loja/menu-rodape-config-types";
import { normalizarLojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";

export type MenuRodapeMenuItem = {
  id: string;
  nome: string;
  slug: string;
  tipo: string;
  linkUrl: string | null;
  categoria: string | null;
  paginaEspecial?: string | null;
  categoriasSelecionadas?: string | null;
  destaque?: boolean;
  corDestaque?: string | null;
  ativo: boolean;
  ordem: number;
  dataInicio: string | null;
  dataFim: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type MenuRodapeCategoriaItem = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
  exibirNoMenu: boolean;
  ordemMenu: number;
};

export type MenuRodapePaginaItem = {
  id: string;
  titulo: string;
  tipo: string;
  urlPublica: string;
};

type MenuRodapeLojaClientProps = {
  configuracaoInicial: LojaMenuRodapeConfig;
  menus: MenuRodapeMenuItem[];
  categorias: MenuRodapeCategoriaItem[];
  paginasBuilder: MenuRodapePaginaItem[];
};

type ApiResult = {
  error?: string;
  menu?: MenuRodapeMenuItem;
};

type DestinoMenu = "URL" | "PAGINA" | "CATEGORIA";
type AbaMenuRodape =
  | "MENU"
  | "CATEGORIAS"
  | "LINKS"
  | "RODAPE"
  | "REDES"
  | "SELOS"
  | "PREVIEW";

const ABAS_MENU_RODAPE: {
  id: AbaMenuRodape;
  label: string;
}[] = [
  { id: "MENU", label: "Menu principal" },
  { id: "CATEGORIAS", label: "Categorias automáticas" },
  { id: "LINKS", label: "Links personalizados" },
  { id: "RODAPE", label: "Rodapé" },
  { id: "REDES", label: "Redes sociais" },
  { id: "SELOS", label: "Selos e imagens" },
  { id: "PREVIEW", label: "Preview" },
];

function criarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ordenarMenus(menus: MenuRodapeMenuItem[]) {
  return [...menus].sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;

    return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
  });
}

async function lerRespostaApi(response: Response): Promise<ApiResult> {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return {};
  }
}

function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function getMenuHref(menu: MenuRodapeMenuItem) {
  if (menu.linkUrl) return menu.linkUrl;

  if (menu.paginaEspecial === "DESCONTOS") return "/loja/descontos";
  if (menu.paginaEspecial === "TODAS_CATEGORIAS") return "/loja/categorias";
  if (menu.tipo === "CATEGORIA") return `/loja/categoria/${menu.slug}`;

  return "/loja";
}

function ToggleLinha({
  titulo,
  descricao,
  checked,
  onChange,
}: {
  titulo: string;
  descricao: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-slate-900">
          {titulo}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {descricao}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
      />
    </label>
  );
}

export default function MenuRodapeLojaClient({
  configuracaoInicial,
  menus,
  categorias,
  paginasBuilder,
}: MenuRodapeLojaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [configuracao, setConfiguracao] = useState<LojaMenuRodapeConfig>(
    normalizarLojaMenuRodapeConfig(configuracaoInicial)
  );
  const [menusOrdenados, setMenusOrdenados] = useState(() =>
    ordenarMenus(menus)
  );
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [salvandoMenu, setSalvandoMenu] = useState(false);

  const [menuNome, setMenuNome] = useState("");
  const [menuDestino, setMenuDestino] = useState<DestinoMenu>("URL");
  const [menuUrl, setMenuUrl] = useState("");
  const [menuPaginaUrl, setMenuPaginaUrl] = useState("");
  const [menuCategoriaId, setMenuCategoriaId] = useState("");
  const [menuDestaque, setMenuDestaque] = useState(false);
  const [menuAtivo, setMenuAtivo] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<AbaMenuRodape>("MENU");

  useEffect(() => {
    setMenusOrdenados(ordenarMenus(menus));
  }, [menus]);

  const categoriasOcultas = useMemo(
    () => new Set(configuracao.menu.categoriasOcultasIds),
    [configuracao.menu.categoriasOcultasIds]
  );

  const categoriasVisiveisPreview = useMemo(() => {
    if (
      !configuracao.menu.ativo ||
      !configuracao.menu.categoriasAutomaticasAtivas
    ) {
      return [];
    }

    return categorias.filter((categoria) => {
      if (categoriasOcultas.has(categoria.id)) return false;
      if (
        configuracao.menu.mostrarApenasCategoriasVisiveis &&
        !categoria.exibirNoMenu
      ) {
        return false;
      }
      if (!configuracao.menu.mostrarCategoriasMae && !categoria.categoriaMaeId) {
        return false;
      }
      if (categoria.categoriaMaeId && !configuracao.menu.mostrarCategoriasFilhas) {
        return false;
      }

      return true;
    });
  }, [categorias, categoriasOcultas, configuracao.menu]);

  function atualizarMenuConfig<Key extends keyof LojaMenuRodapeConfig["menu"]>(
    key: Key,
    value: LojaMenuRodapeConfig["menu"][Key]
  ) {
    setConfiguracao((atual) => ({
      ...atual,
      menu: {
        ...atual.menu,
        [key]: value,
      },
    }));
  }

  function atualizarRodapeConfig<
    Key extends keyof LojaMenuRodapeConfig["rodape"]
  >(key: Key, value: LojaMenuRodapeConfig["rodape"][Key]) {
    setConfiguracao((atual) => ({
      ...atual,
      rodape: {
        ...atual.rodape,
        [key]: value,
      },
    }));
  }

  function alternarCategoriaOculta(categoriaId: string) {
    setConfiguracao((atual) => {
      const ocultas = new Set(atual.menu.categoriasOcultasIds);

      if (ocultas.has(categoriaId)) {
        ocultas.delete(categoriaId);
      } else {
        ocultas.add(categoriaId);
      }

      return {
        ...atual,
        menu: {
          ...atual.menu,
          categoriasOcultasIds: Array.from(ocultas),
        },
      };
    });
  }

  async function salvarConfiguracao() {
    setErro(null);
    setSucesso(null);
    setSalvandoConfig(true);

    try {
      const response = await fetch("/api/configuracoes/loja/menu-rodape", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configuracao,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao salvar menu e rodapé.");
        return;
      }

      setConfiguracao(normalizarLojaMenuRodapeConfig(data.configuracao));
      setSucesso("Menu e rodapé salvos com sucesso.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      setErro("Erro ao salvar menu e rodapé.");
    } finally {
      setSalvandoConfig(false);
    }
  }

  function getDestinoSelecionado() {
    if (menuDestino === "URL") {
      return {
        tipo: "LINK",
        href: menuUrl.trim(),
        categoria: "",
      };
    }

    if (menuDestino === "PAGINA") {
      const pagina = paginasBuilder.find(
        (item) => item.urlPublica === menuPaginaUrl
      );

      return {
        tipo: "PAGINA",
        href: pagina?.urlPublica || "",
        categoria: "",
      };
    }

    const categoria = categorias.find((item) => item.id === menuCategoriaId);

    return {
      tipo: "CATEGORIA",
      href: categoria ? `/loja/categoria/${categoria.slug}` : "",
      categoria: categoria?.nome || "",
    };
  }

  async function criarMenu() {
    if (salvandoMenu) return;

    const destino = getDestinoSelecionado();

    if (!menuNome.trim()) {
      setErro("Informe o nome do link.");
      return;
    }

    if (!destino.href) {
      setErro("Selecione ou informe o destino do link.");
      return;
    }

    if (
      menuDestino === "URL" &&
      !destino.href.startsWith("/") &&
      !isExternalUrl(destino.href)
    ) {
      setErro("Use uma rota interna começando com / ou uma URL http(s).");
      return;
    }

    setErro(null);
    setSucesso(null);
    setSalvandoMenu(true);

    try {
      const response = await fetch("/api/configuracoes/loja/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: menuNome.trim(),
          tipo: destino.tipo,
          linkUrl: destino.href,
          categoria: destino.categoria,
          paginaEspecial: "",
          categoriasSelecionadas: [],
          destaque: menuDestaque,
          corDestaque: "#2e7b99",
          ordem: menusOrdenados.length,
          ativo: menuAtivo,
          dataInicio: "",
          dataFim: "",
        }),
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao criar link do menu.");
        return;
      }

      setMenuNome("");
      setMenuUrl("");
      setMenuPaginaUrl("");
      setMenuCategoriaId("");
      setMenuDestaque(false);
      setMenuAtivo(true);
      setSucesso("Link de menu criado com sucesso.");

      if (data.menu) {
        setMenusOrdenados((atuais) => ordenarMenus([...atuais, data.menu!]));
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      setErro("Erro ao criar link do menu.");
    } finally {
      setSalvandoMenu(false);
    }
  }

  async function atualizarMenu(
    menu: MenuRodapeMenuItem,
    data: Partial<MenuRodapeMenuItem>
  ) {
    setErro(null);
    setSucesso(null);

    const response = await fetch(`/api/configuracoes/loja/menus/${menu.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await lerRespostaApi(response);

    if (!response.ok) {
      setErro(result.error || "Erro ao atualizar link do menu.");
      return false;
    }

    setMenusOrdenados((atuais) =>
      atuais.map((item) => (item.id === menu.id ? { ...item, ...data } : item))
    );

    return true;
  }

  async function moverMenu(menuId: string, direcao: -1 | 1) {
    const indexAtual = menusOrdenados.findIndex((item) => item.id === menuId);
    const indexDestino = indexAtual + direcao;

    if (indexAtual < 0 || indexDestino < 0 || indexDestino >= menusOrdenados.length) {
      return;
    }

    const novaLista = [...menusOrdenados];
    const [item] = novaLista.splice(indexAtual, 1);
    novaLista.splice(indexDestino, 0, item);

    const reordenada = novaLista.map((menu, index) => ({
      ...menu,
      ordem: index,
    }));

    setMenusOrdenados(reordenada);

    const responses = await Promise.all(
      reordenada.map((menu) =>
        fetch(`/api/configuracoes/loja/menus/${menu.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ordem: menu.ordem }),
        })
      )
    );

    if (responses.some((response) => !response.ok)) {
      setErro("Erro ao reordenar links do menu.");
      setMenusOrdenados(ordenarMenus(menus));
      return;
    }

    setSucesso("Ordem do menu atualizada.");
    startTransition(() => {
      router.refresh();
    });
  }

  async function excluirMenu(menu: MenuRodapeMenuItem) {
    const confirmado = window.confirm(`Excluir o link "${menu.nome}"?`);

    if (!confirmado) return;

    const response = await fetch(`/api/configuracoes/loja/menus/${menu.id}`, {
      method: "DELETE",
    });

    const result = await lerRespostaApi(response);

    if (!response.ok) {
      setErro(result.error || "Erro ao excluir link do menu.");
      return;
    }

    setMenusOrdenados((atuais) => atuais.filter((item) => item.id !== menu.id));
    setSucesso("Link excluído com sucesso.");
    startTransition(() => {
      router.refresh();
    });
  }

  function atualizarColuna(
    colunaId: string,
    data: Partial<LojaRodapeColuna>
  ) {
    atualizarRodapeConfig(
      "colunas",
      configuracao.rodape.colunas.map((coluna) =>
        coluna.id === colunaId ? { ...coluna, ...data } : coluna
      )
    );
  }

  function adicionarColuna() {
    atualizarRodapeConfig("colunas", [
      ...configuracao.rodape.colunas,
      {
        id: criarId("coluna"),
        titulo: "Nova coluna",
        links: [],
      },
    ]);
  }

  function removerColuna(colunaId: string) {
    atualizarRodapeConfig(
      "colunas",
      configuracao.rodape.colunas.filter((coluna) => coluna.id !== colunaId)
    );
  }

  function atualizarLinkRodape(
    colunaId: string,
    linkId: string,
    data: Partial<LojaRodapeLink>
  ) {
    atualizarRodapeConfig(
      "colunas",
      configuracao.rodape.colunas.map((coluna) => {
        if (coluna.id !== colunaId) return coluna;

        return {
          ...coluna,
          links: coluna.links.map((link) =>
            link.id === linkId ? { ...link, ...data } : link
          ),
        };
      })
    );
  }

  function adicionarLinkRodape(colunaId: string) {
    atualizarRodapeConfig(
      "colunas",
      configuracao.rodape.colunas.map((coluna) => {
        if (coluna.id !== colunaId) return coluna;

        return {
          ...coluna,
          links: [
            ...coluna.links,
            {
              id: criarId("link"),
              label: "Novo link",
              href: "/loja",
              ativo: true,
              novaAba: false,
            },
          ],
        };
      })
    );
  }

  function removerLinkRodape(colunaId: string, linkId: string) {
    atualizarRodapeConfig(
      "colunas",
      configuracao.rodape.colunas.map((coluna) => {
        if (coluna.id !== colunaId) return coluna;

        return {
          ...coluna,
          links: coluna.links.filter((link) => link.id !== linkId),
        };
      })
    );
  }

  function atualizarRedeSocial(redeId: string, data: Partial<LojaRedeSocial>) {
    setConfiguracao((atual) => ({
      ...atual,
      redesSociais: atual.redesSociais.map((rede) =>
        rede.id === redeId ? { ...rede, ...data } : rede
      ),
    }));
  }

  function adicionarRedeSocial() {
    setConfiguracao((atual) => ({
      ...atual,
      redesSociais: [
        ...atual.redesSociais,
        {
          id: criarId("rede"),
          nome: "Nova rede",
          url: "",
          ativo: true,
        },
      ],
    }));
  }

  function removerRedeSocial(redeId: string) {
    setConfiguracao((atual) => ({
      ...atual,
      redesSociais: atual.redesSociais.filter((rede) => rede.id !== redeId),
    }));
  }

  function atualizarSelo(seloId: string, data: Partial<LojaSeloRodape>) {
    setConfiguracao((atual) => ({
      ...atual,
      selos: atual.selos.map((selo) =>
        selo.id === seloId ? { ...selo, ...data } : selo
      ),
    }));
  }

  function adicionarSelo() {
    setConfiguracao((atual) => ({
      ...atual,
      selos: [
        ...atual.selos,
        {
          id: criarId("selo"),
          nome: "Novo selo",
          imagemUrl: "",
          altText: "",
          linkUrl: "",
          ativo: true,
        },
      ],
    }));
  }

  function removerSelo(seloId: string) {
    setConfiguracao((atual) => ({
      ...atual,
      selos: atual.selos.filter((selo) => selo.id !== seloId),
    }));
  }

  return (
    <div className="space-y-6">
      {(erro || sucesso) && (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm ${
            erro
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {erro || sucesso}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Links ativos
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {menusOrdenados.filter((menu) => menu.ativo).length}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Categorias no menu
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {categoriasVisiveisPreview.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Colunas do rodapé
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {configuracao.rodape.colunas.length}
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          {ABAS_MENU_RODAPE.map((aba) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtiva(aba.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                abaAtiva === aba.id
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className={abaAtiva === "PREVIEW" ? "hidden" : "space-y-6"}>
          <section
            className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${
              abaAtiva === "MENU" || abaAtiva === "CATEGORIAS"
                ? ""
                : "hidden"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Menu className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-950">
                    {abaAtiva === "CATEGORIAS"
                      ? "Categorias automáticas"
                      : "Menu principal"}
                  </h2>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {abaAtiva === "CATEGORIAS"
                    ? "Controle quais categorias entram automaticamente na navegação."
                    : "Defina se a navegação usa links manuais, categorias automáticas ou ambos."}
                </p>
              </div>

              <button
                type="button"
                onClick={salvarConfiguracao}
                disabled={salvandoConfig || isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {salvandoConfig ? "Salvando..." : "Salvar"}
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ToggleLinha
                titulo="Menu ativo"
                descricao="Exibe a navegação global no menu lateral da loja."
                checked={configuracao.menu.ativo}
                onChange={(checked) => atualizarMenuConfig("ativo", checked)}
              />
              <ToggleLinha
                titulo="Links personalizados"
                descricao="Mostra os links cadastrados manualmente."
                checked={configuracao.menu.linksManuaisAtivos}
                onChange={(checked) =>
                  atualizarMenuConfig("linksManuaisAtivos", checked)
                }
              />
              <ToggleLinha
                titulo="Categorias automáticas"
                descricao="Monta a árvore a partir da taxonomia da loja."
                checked={configuracao.menu.categoriasAutomaticasAtivas}
                onChange={(checked) =>
                  atualizarMenuConfig("categoriasAutomaticasAtivas", checked)
                }
              />
              <ToggleLinha
                titulo="Categorias mãe"
                descricao="Permite exibir categorias de primeiro nível."
                checked={configuracao.menu.mostrarCategoriasMae}
                onChange={(checked) =>
                  atualizarMenuConfig("mostrarCategoriasMae", checked)
                }
              />
              <ToggleLinha
                titulo="Categorias filhas"
                descricao="Permite exibir subcategorias no menu."
                checked={configuracao.menu.mostrarCategoriasFilhas}
                onChange={(checked) =>
                  atualizarMenuConfig("mostrarCategoriasFilhas", checked)
                }
              />
              <ToggleLinha
                titulo="Respeitar visibilidade da categoria"
                descricao="Oculta automaticamente categorias marcadas como fora do menu no cadastro."
                checked={configuracao.menu.mostrarApenasCategoriasVisiveis}
                onChange={(checked) =>
                  atualizarMenuConfig("mostrarApenasCategoriasVisiveis", checked)
                }
              />
            </div>

            <div
              className={`mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 ${
                abaAtiva === "CATEGORIAS" ? "" : "hidden"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-950">
                      Visibilidade de categorias
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    O cadastro continua sendo a taxonomia; aqui você controla a
                    navegação global.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ordenação
                    </span>
                    <select
                      value={configuracao.menu.ordenacaoCategorias}
                      onChange={(event) => {
                        const value = event.target
                          .value as LojaMenuRodapeConfig["menu"]["ordenacaoCategorias"];
                        atualizarMenuConfig(
                          "ordenacaoCategorias",
                          value
                        );
                      }}
                      className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                    >
                      <option value="ORDEM">Ordem do cadastro</option>
                      <option value="AZ">A-Z</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Exibição
                    </span>
                    <select
                      value={configuracao.menu.exibicaoCategorias}
                      onChange={(event) => {
                        const value = event.target
                          .value as LojaMenuRodapeConfig["menu"]["exibicaoCategorias"];
                        atualizarMenuConfig(
                          "exibicaoCategorias",
                          value
                        );
                      }}
                      className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                    >
                      <option value="DROPDOWN">Menu com subcategorias</option>
                      <option value="SIMPLES">Lista simples</option>
                      <option value="GRUPO">Agrupado por categoria mãe</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {categorias.map((categoria) => (
                  <label
                    key={categoria.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {categoria.caminho}
                      </span>
                      <span className="text-xs text-slate-400">
                        /loja/categoria/{categoria.slug}
                      </span>
                      {!categoria.exibirNoMenu && (
                        <span className="mt-1 block text-xs font-medium text-amber-700">
                          Oculta no cadastro de categorias
                        </span>
                      )}
                    </span>

                    <input
                      type="checkbox"
                      checked={!categoriasOcultas.has(categoria.id)}
                      onChange={() => alternarCategoriaOculta(categoria.id)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section
            className={`grid gap-6 lg:grid-cols-[360px_1fr] ${
              abaAtiva === "LINKS" ? "" : "hidden"
            }`}
          >
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Novo link
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                <input
                  value={menuNome}
                  onChange={(event) => setMenuNome(event.target.value)}
                  placeholder="Nome do link"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />

                <select
                  value={menuDestino}
                  onChange={(event) => {
                    setMenuDestino(event.target.value as DestinoMenu);
                    setMenuUrl("");
                    setMenuPaginaUrl("");
                    setMenuCategoriaId("");
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  <option value="URL">URL externa ou interna</option>
                  <option value="PAGINA">Página do builder</option>
                  <option value="CATEGORIA">Categoria</option>
                </select>

                {menuDestino === "URL" && (
                  <input
                    value={menuUrl}
                    onChange={(event) => setMenuUrl(event.target.value)}
                    placeholder="/loja/descontos ou https://..."
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />
                )}

                {menuDestino === "PAGINA" && (
                  <select
                    value={menuPaginaUrl}
                    onChange={(event) => {
                      const url = event.target.value;
                      const pagina = paginasBuilder.find(
                        (item) => item.urlPublica === url
                      );

                      setMenuPaginaUrl(url);
                      setMenuNome((atual) => atual || pagina?.titulo || "");
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Selecione uma página</option>
                    {paginasBuilder.map((pagina) => (
                      <option key={pagina.id} value={pagina.urlPublica}>
                        {pagina.titulo} · {pagina.tipo}
                      </option>
                    ))}
                  </select>
                )}

                {menuDestino === "CATEGORIA" && (
                  <select
                    value={menuCategoriaId}
                    onChange={(event) => {
                      const categoria = categorias.find(
                        (item) => item.id === event.target.value
                      );

                      setMenuCategoriaId(event.target.value);
                      setMenuNome((atual) => atual || categoria?.nome || "");
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.caminho}
                      </option>
                    ))}
                  </select>
                )}

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={menuDestaque}
                    onChange={(event) => setMenuDestaque(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Destacar link
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={menuAtivo}
                    onChange={(event) => setMenuAtivo(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Link ativo
                </label>

                <button
                  type="button"
                  onClick={criarMenu}
                  disabled={salvandoMenu}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {salvandoMenu ? "Salvando..." : "Adicionar link"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-950">
                  Links personalizados
                </h2>
              </div>

              {menusOrdenados.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                  Nenhum link cadastrado.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {menusOrdenados.map((menu, index) => (
                    <div
                      key={menu.id}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">
                            {menu.nome}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              menu.ativo
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {menu.ativo ? "Ativo" : "Inativo"}
                          </span>
                          {menu.destaque && (
                            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                              Destaque
                            </span>
                          )}
                        </div>

                        <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                          {isExternalUrl(getMenuHref(menu)) ? (
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {getMenuHref(menu)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moverMenu(menu.id, -1)}
                          disabled={index === 0}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Mover para cima"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moverMenu(menu.id, 1)}
                          disabled={index === menusOrdenados.length - 1}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            atualizarMenu(menu, { ativo: !menu.ativo })
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {menu.ativo ? "Ocultar" : "Ativar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => excluirMenu(menu)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section
            className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${
              abaAtiva === "RODAPE" ? "" : "hidden"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Columns3 className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-950">
                    Rodapé
                  </h2>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Colunas, links, redes sociais e selos da loja.
                </p>
              </div>

              <button
                type="button"
                onClick={adicionarColuna}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar coluna
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ToggleLinha
                titulo="Rodapé ativo"
                descricao="Exibe o rodapé configurável no site público."
                checked={configuracao.rodape.ativo}
                onChange={(checked) => atualizarRodapeConfig("ativo", checked)}
              />
              <ToggleLinha
                titulo="Links do menu"
                descricao="Inclui os links ativos do menu no rodapé."
                checked={configuracao.rodape.mostrarLinksMenu}
                onChange={(checked) =>
                  atualizarRodapeConfig("mostrarLinksMenu", checked)
                }
              />
              <ToggleLinha
                titulo="Link do carrinho"
                descricao="Mantém atalho para o carrinho no rodapé."
                checked={configuracao.rodape.mostrarCarrinho}
                onChange={(checked) =>
                  atualizarRodapeConfig("mostrarCarrinho", checked)
                }
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto institucional
                </span>
                <textarea
                  value={configuracao.rodape.textoInstitucional}
                  onChange={(event) =>
                    atualizarRodapeConfig(
                      "textoInstitucional",
                      event.target.value
                    )
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Copyright
                </span>
                <input
                  value={configuracao.rodape.copyright}
                  onChange={(event) =>
                    atualizarRodapeConfig("copyright", event.target.value)
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {configuracao.rodape.colunas.map((coluna) => (
                <div
                  key={coluna.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={coluna.titulo}
                      onChange={(event) =>
                        atualizarColuna(coluna.id, {
                          titulo: event.target.value,
                        })
                      }
                      className="h-10 min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-500"
                    />

                    <button
                      type="button"
                      onClick={() => adicionarLinkRodape(coluna.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                      title="Adicionar link"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removerColuna(coluna.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                      title="Excluir coluna"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {coluna.links.map((link) => (
                      <div
                        key={link.id}
                        className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200"
                      >
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            value={link.label}
                            onChange={(event) =>
                              atualizarLinkRodape(coluna.id, link.id, {
                                label: event.target.value,
                              })
                            }
                            placeholder="Texto"
                            className="h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                          />
                          <input
                            value={link.href}
                            onChange={(event) =>
                              atualizarLinkRodape(coluna.id, link.id, {
                                href: event.target.value,
                              })
                            }
                            placeholder="/loja ou https://..."
                            className="h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-3">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={link.ativo}
                                onChange={(event) =>
                                  atualizarLinkRodape(coluna.id, link.id, {
                                    ativo: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              Ativo
                            </label>

                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={Boolean(link.novaAba)}
                                onChange={(event) =>
                                  atualizarLinkRodape(coluna.id, link.id, {
                                    novaAba: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              Nova aba
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => removerLinkRodape(coluna.id, link.id)}
                            className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className={`grid gap-6 lg:grid-cols-2 ${
              abaAtiva === "REDES" || abaAtiva === "SELOS" ? "" : "hidden"
            }`}
          >
            <div
              className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${
                abaAtiva === "REDES" ? "" : "hidden"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-950">
                    Redes sociais
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={adicionarRedeSocial}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                  title="Adicionar rede"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {configuracao.redesSociais.map((rede) => (
                  <div
                    key={rede.id}
                    className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="grid gap-2 md:grid-cols-[160px_1fr]">
                      <input
                        value={rede.nome}
                        onChange={(event) =>
                          atualizarRedeSocial(rede.id, {
                            nome: event.target.value,
                          })
                        }
                        className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                      />
                      <input
                        value={rede.url}
                        onChange={(event) =>
                          atualizarRedeSocial(rede.id, {
                            url: event.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={rede.ativo}
                          onChange={(event) =>
                            atualizarRedeSocial(rede.id, {
                              ativo: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Ativo
                      </label>
                      <button
                        type="button"
                        onClick={() => removerRedeSocial(rede.id)}
                        className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${
                abaAtiva === "SELOS" ? "" : "hidden"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-950">
                    Selos e imagens
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={adicionarSelo}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                  title="Adicionar selo"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {configuracao.selos.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum selo cadastrado.
                  </div>
                )}

                {configuracao.selos.map((selo) => (
                  <div
                    key={selo.id}
                    className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <input
                      value={selo.nome}
                      onChange={(event) =>
                        atualizarSelo(selo.id, { nome: event.target.value })
                      }
                      placeholder="Nome do selo"
                      className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={selo.imagemUrl}
                      onChange={(event) =>
                        atualizarSelo(selo.id, {
                          imagemUrl: event.target.value,
                        })
                      }
                      placeholder="URL da imagem"
                      className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={selo.altText || ""}
                      onChange={(event) =>
                        atualizarSelo(selo.id, { altText: event.target.value })
                      }
                      placeholder="Texto alternativo"
                      className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={selo.linkUrl || ""}
                      onChange={(event) =>
                        atualizarSelo(selo.id, { linkUrl: event.target.value })
                      }
                      placeholder="Link opcional"
                      className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={selo.ativo}
                          onChange={(event) =>
                            atualizarSelo(selo.id, {
                              ativo: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Ativo
                      </label>
                      <button
                        type="button"
                        onClick={() => removerSelo(selo.id)}
                        className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className={abaAtiva === "PREVIEW" ? "space-y-4" : "hidden"}>
          <div className="sticky top-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-950">Preview</p>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Menu
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {categoriasVisiveisPreview.slice(0, 8).map((categoria) => (
                  <span
                    key={categoria.id}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    {categoria.nome}
                  </span>
                ))}

                {menusOrdenados
                  .filter((menu) => menu.ativo)
                  .slice(0, 6)
                  .map((menu) => (
                    <span
                      key={menu.id}
                      className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100"
                    >
                      {menu.nome}
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Rodapé
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {configuracao.rodape.textoInstitucional}
              </p>

              <div className="mt-4 grid gap-3">
                {configuracao.rodape.colunas.map((coluna) => (
                  <div key={coluna.id}>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {coluna.titulo}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {coluna.links
                        .filter((link) => link.ativo)
                        .map((link) => (
                          <span
                            key={link.id}
                            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                          >
                            {link.label}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={salvarConfiguracao}
              disabled={salvandoConfig || isPending}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {salvandoConfig ? "Salvando..." : "Salvar menu e rodapé"}
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
