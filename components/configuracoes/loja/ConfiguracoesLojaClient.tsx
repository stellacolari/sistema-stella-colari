"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  ImageIcon,
  Menu,
  Monitor,
  Plus,
  Search,
  Smartphone,
  X,
} from "lucide-react";

export type BannerLojaItem = {
  id: string;
  titulo: string | null;
  subtitulo: string | null;
  imagemUrl: string;
  imagemMobileUrl: string | null;
  linkUrl: string | null;
  ordem: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type MenuLojaItem = {
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

export type CategoriaNovaItem = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

export type ProdutoMenuItem = {
  id: string;
  codigoInterno: string;
  nome: string;
  categoria: string;
  imagemUrl?: string | null;
  ativo: boolean;
  status: string;
};

type ConfiguracoesLojaClientProps = {
  produtos?: ProdutoMenuItem[];
  banners: BannerLojaItem[];
  menus: MenuLojaItem[];
  categorias: string[];
  categoriasNovas?: CategoriaNovaItem[];
};

type ApiResult = {
  error?: string;
  message?: string;
};

type AbaLoja = "BANNERS" | "MENU";
type BannerPreviewModo = "DESKTOP" | "MOBILE";

type BannerPreviewState = {
  banner: BannerLojaItem;
  modo: BannerPreviewModo;
} | null;

const LIMITE_UPLOAD_BANNER_MB = 4;

function ordenarPorOrdem<T extends { ordem: number; criadoEm: string }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    if (a.ordem !== b.ordem) {
      return a.ordem - b.ordem;
    }

    return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
  });
}

function moverItem<T extends { id: string }>(
  items: T[],
  itemArrastadoId: string,
  itemDestinoId: string
) {
  const origemIndex = items.findIndex((item) => item.id === itemArrastadoId);
  const destinoIndex = items.findIndex((item) => item.id === itemDestinoId);

  if (origemIndex < 0 || destinoIndex < 0 || origemIndex === destinoIndex) {
    return items;
  }

  const novaLista = [...items];
  const [itemMovido] = novaLista.splice(origemIndex, 1);

  novaLista.splice(destinoIndex, 0, itemMovido);

  return novaLista;
}

async function lerRespostaApi(response: Response): Promise<ApiResult> {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return {};
  }
}

function dataInput(value: string | null) {
  if (!value) return "";

  const data = new Date(value);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return data.toISOString().slice(0, 10);
}

function dataCurta(value: string | null) {
  if (!value) return "-";

  const data = new Date(value);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleDateString("pt-BR");
}

function tipoLabel(tipo: string) {
  if (tipo === "CATEGORIA") return "Categoria";
  if (tipo === "CAMPANHA") return "Campanha";
  if (tipo === "LINK") return "Link";
  if (tipo === "PAGINA") return "Página";

  return tipo;
}

function paginaEspecialLabel(value: string | null | undefined) {
  if (!value) return "Nenhuma";
  if (value === "DESCONTOS") return "Descontos";
  if (value === "TODAS_CATEGORIAS") return "Todas as categorias";

  return value;
}

function parseCategoriasSelecionadas(value: string | null | undefined) {
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

function corSegura(value: string | null | undefined) {
  const cor = String(value || "").trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(cor)) {
    return cor;
  }

  return "#2e7b99";
}

function slugify(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function arquivoDentroDoLimite(file: File | null) {
  if (!file) return true;

  const tamanhoMb = file.size / 1024 / 1024;

  return tamanhoMb <= LIMITE_UPLOAD_BANNER_MB;
}

function BannerPreviewModal({
  preview,
  onClose,
}: {
  preview: BannerPreviewState;
  onClose: () => void;
}) {
  if (!preview) {
    return null;
  }

  const { banner, modo } = preview;
  const imagemPreview =
    modo === "MOBILE" ? banner.imagemMobileUrl || banner.imagemUrl : banner.imagemUrl;

  const usandoDesktopNoMobile = modo === "MOBILE" && !banner.imagemMobileUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Prévia {modo === "MOBILE" ? "mobile" : "desktop"}
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {banner.titulo || "Banner da loja"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Visualização simulada dentro da estrutura da loja pública.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Fechar prévia"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {usandoDesktopNoMobile && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Este banner não possui versão mobile. A loja usará a imagem desktop
              como fallback no celular.
            </div>
          )}

          {modo === "DESKTOP" ? (
            <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="flex h-16 items-center justify-between border-b border-slate-100 px-8">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-950">
                  STELLA
                </div>

                <div className="hidden gap-6 text-sm font-medium text-slate-500 md:flex">
                  <span>Home</span>
                  <span>Categorias</span>
                  <span>Descontos</span>
                  <span>Quem somos</span>
                </div>

                <div className="text-sm text-slate-400">Busca · Conta · Carrinho</div>
              </div>

              <div className="relative h-[360px] overflow-hidden bg-slate-100">
                <img
                  src={imagemPreview}
                  alt={banner.titulo || "Prévia desktop"}
                  className="h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-0 bg-black/5" />
              </div>

              <div className="grid gap-4 px-8 py-8 md:grid-cols-3">
                <div className="h-24 bg-slate-50" />
                <div className="h-24 bg-slate-50" />
                <div className="h-24 bg-slate-50" />
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[390px] overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
                <Menu className="h-5 w-5 text-slate-700" />

                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-950">
                  STELLA
                </div>

                <div className="flex gap-2 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-current" />
                  <span className="h-2 w-2 rounded-full bg-current" />
                </div>
              </div>

              <div className="relative h-[70vh] max-h-[640px] min-h-[420px] overflow-hidden bg-slate-100">
                <img
                  src={imagemPreview}
                  alt={banner.titulo || "Prévia mobile"}
                  className="h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-0 bg-black/5" />
              </div>

              <div className="space-y-3 px-4 py-5">
                <div className="h-20 bg-slate-50" />
                <div className="h-20 bg-slate-50" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesLojaClient({
  banners,
  menus,
  categorias,
  categoriasNovas = [],
}: ConfiguracoesLojaClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const categoriasParaUso = useMemo(() => {
    if (categoriasNovas.length > 0) {
      return categoriasNovas.map((categoria) => ({
        label: categoria.caminho,
        value: categoria.nome,
        slug: categoria.slug || slugify(categoria.nome),
      }));
    }

    return categorias.map((categoria) => ({
      label: categoria,
      value: categoria,
      slug: slugify(categoria),
    }));
  }, [categorias, categoriasNovas]);

  const bannersOrdenadosInicial = useMemo(
    () => ordenarPorOrdem(banners),
    [banners]
  );

  const menusOrdenadosInicial = useMemo(() => ordenarPorOrdem(menus), [menus]);

  const [abaAtiva, setAbaAtiva] = useState<AbaLoja>("BANNERS");

  const [bannersOrdenados, setBannersOrdenados] = useState<BannerLojaItem[]>(
    bannersOrdenadosInicial
  );

  const [menusOrdenados, setMenusOrdenados] =
    useState<MenuLojaItem[]>(menusOrdenadosInicial);

  const [bannerArrastandoId, setBannerArrastandoId] = useState<string | null>(
    null
  );
  const [menuArrastandoId, setMenuArrastandoId] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<BannerPreviewState>(null);

  const [bannerTitulo, setBannerTitulo] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [bannerAtivo, setBannerAtivo] = useState(true);
  const [bannerArquivo, setBannerArquivo] = useState<File | null>(null);
  const [bannerArquivoMobile, setBannerArquivoMobile] = useState<File | null>(
    null
  );

  const [menuNome, setMenuNome] = useState("");
  const [menuTipo, setMenuTipo] = useState("CATEGORIA");
  const [menuLinkUrl, setMenuLinkUrl] = useState("");
  const [menuCategoria, setMenuCategoria] = useState("");
  const [menuPaginaEspecial, setMenuPaginaEspecial] = useState("");
  const [menuCategoriasSelecionadas, setMenuCategoriasSelecionadas] = useState<
    string[]
  >([]);
  const [menuDestaque, setMenuDestaque] = useState(false);
  const [menuCorDestaque, setMenuCorDestaque] = useState("#2e7b99");
  const [menuAtivo, setMenuAtivo] = useState(true);
  const [menuDataInicio, setMenuDataInicio] = useState("");
  const [menuDataFim, setMenuDataFim] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [bannerSalvando, setBannerSalvando] = useState(false);
  const [menuSalvando, setMenuSalvando] = useState(false);
  const [ordemSalvando, setOrdemSalvando] = useState(false);

  useEffect(() => {
    setBannersOrdenados(bannersOrdenadosInicial);
  }, [bannersOrdenadosInicial]);

  useEffect(() => {
    setMenusOrdenados(menusOrdenadosInicial);
  }, [menusOrdenadosInicial]);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function selecionarBannerDesktop(file: File | null) {
    if (!arquivoDentroDoLimite(file)) {
      setErro(
        `O banner desktop deve ter no máximo ${LIMITE_UPLOAD_BANNER_MB} MB. Comprima a imagem antes de enviar.`
      );
      setBannerArquivo(null);
      return;
    }

    setErro(null);
    setBannerArquivo(file);
  }

  function selecionarBannerMobile(file: File | null) {
    if (!arquivoDentroDoLimite(file)) {
      setErro(
        `O banner mobile deve ter no máximo ${LIMITE_UPLOAD_BANNER_MB} MB. Comprima a imagem antes de enviar.`
      );
      setBannerArquivoMobile(null);
      return;
    }

    setErro(null);
    setBannerArquivoMobile(file);
  }

  function aplicarCategoriaNoMenu(categoriaNome: string) {
    setMenuCategoria(categoriaNome);

    const categoria = categoriasParaUso.find(
      (item) => item.value === categoriaNome
    );

    if (categoria && menuTipo === "CATEGORIA") {
      setMenuNome((current) => current || categoria.value);
      setMenuLinkUrl(`/loja/categoria/${categoria.slug}`);
    }
  }

  async function criarBanner() {
    setErro(null);
    setSucesso(null);

    if (bannerSalvando) return;

    if (!bannerArquivo) {
      setErro("Selecione uma imagem para o banner antes de adicionar.");
      return;
    }

    setBannerSalvando(true);

    try {
      const formData = new FormData();
      formData.append("titulo", bannerTitulo.trim());
      formData.append("subtitulo", "");
      formData.append("linkUrl", bannerLinkUrl.trim());
      formData.append("ordem", String(bannersOrdenados.length));
      formData.append("ativo", String(bannerAtivo));
      formData.append("imagem", bannerArquivo);

      if (bannerArquivoMobile) {
        formData.append("imagemMobile", bannerArquivoMobile);
      }

      const response = await fetch("/api/configuracoes/loja/banners", {
        method: "POST",
        body: formData,
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(
          data.error ||
            data.message ||
            `Erro ao criar banner. Status: ${response.status}`
        );
        return;
      }

      setBannerTitulo("");
      setBannerLinkUrl("");
      setBannerAtivo(true);
      setBannerArquivo(null);
      setBannerArquivoMobile(null);
      setSucesso("Banner adicionado com sucesso.");

      const inputDesktop = document.getElementById(
        "banner-imagem"
      ) as HTMLInputElement | null;

      const inputMobile = document.getElementById(
        "banner-imagem-mobile"
      ) as HTMLInputElement | null;

      if (inputDesktop) inputDesktop.value = "";
      if (inputMobile) inputMobile.value = "";

      refresh();
    } catch (error) {
      console.error(error);
      setErro(
        "Erro ao criar banner. Verifique o terminal do Next.js para mais detalhes."
      );
    } finally {
      setBannerSalvando(false);
    }
  }

  async function atualizarBanner(
    banner: BannerLojaItem,
    data: Partial<BannerLojaItem>
  ) {
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/banners/${banner.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(
          result.error ||
            result.message ||
            `Erro ao atualizar banner. Status: ${response.status}`
        );
        return;
      }

      setSucesso("Banner atualizado.");
      refresh();
    } catch (error) {
      console.error(error);
      setErro(
        "Erro ao atualizar banner. Verifique o terminal do Next.js para mais detalhes."
      );
    }
  }

  async function salvarOrdemBanners(novaLista: BannerLojaItem[]) {
    setErro(null);
    setSucesso(null);
    setOrdemSalvando(true);

    try {
      const responses = await Promise.all(
        novaLista.map((banner, index) =>
          fetch(`/api/configuracoes/loja/banners/${banner.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ordem: index,
            }),
          })
        )
      );

      const erroResponse = responses.find((response) => !response.ok);

      if (erroResponse) {
        setErro("Erro ao salvar a nova ordem dos banners.");
        setBannersOrdenados(bannersOrdenadosInicial);
        return;
      }

      setSucesso("Ordem dos banners atualizada.");
      refresh();
    } catch (error) {
      console.error(error);
      setErro("Erro ao salvar a nova ordem dos banners.");
      setBannersOrdenados(bannersOrdenadosInicial);
    } finally {
      setOrdemSalvando(false);
    }
  }

  async function reordenarBanner(destinoId: string) {
    if (!bannerArrastandoId || ordemSalvando) return;

    const novaLista = moverItem(
      bannersOrdenados,
      bannerArrastandoId,
      destinoId
    ).map((banner, index) => ({
      ...banner,
      ordem: index,
    }));

    setBannerArrastandoId(null);
    setBannersOrdenados(novaLista);

    await salvarOrdemBanners(novaLista);
  }

  async function excluirBanner(bannerId: string, bannerTitulo?: string | null) {
    const confirmado = window.confirm(
      `Excluir o banner ${bannerTitulo || bannerId}?`
    );

    if (!confirmado) return;

    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/banners/${bannerId}`,
        {
          method: "DELETE",
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(
          data.error ||
            data.message ||
            `Erro ao excluir banner. Status: ${response.status}`
        );
        return;
      }

      setSucesso("Banner excluído com sucesso.");
      refresh();
    } catch (error) {
      console.error(error);
      setErro(
        "Erro ao excluir banner. Verifique o terminal do Next.js para mais detalhes."
      );
    }
  }

  async function criarMenu() {
    setErro(null);
    setSucesso(null);

    if (menuSalvando) return;

    if (!menuNome.trim()) {
      setErro("Informe o nome do item de menu.");
      return;
    }

    setMenuSalvando(true);

    try {
      const response = await fetch("/api/configuracoes/loja/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: menuNome.trim(),
          tipo: menuTipo,
          linkUrl: menuLinkUrl.trim(),
          categoria: menuCategoria.trim(),
          paginaEspecial: menuPaginaEspecial,
          categoriasSelecionadas: menuCategoriasSelecionadas,
          destaque: menuDestaque,
          corDestaque: menuCorDestaque,
          ordem: menusOrdenados.length,
          ativo: menuAtivo,
          dataInicio: menuDataInicio,
          dataFim: menuDataFim,
        }),
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(
          data.error ||
            data.message ||
            `Erro ao criar item de menu. Status: ${response.status}`
        );
        return;
      }

      setMenuNome("");
      setMenuTipo("CATEGORIA");
      setMenuLinkUrl("");
      setMenuCategoria("");
      setMenuPaginaEspecial("");
      setMenuCategoriasSelecionadas([]);
      setMenuDestaque(false);
      setMenuCorDestaque("#2e7b99");
      setMenuAtivo(true);
      setMenuDataInicio("");
      setMenuDataFim("");
      setSucesso("Item de menu adicionado com sucesso.");

      refresh();
    } catch (error) {
      console.error(error);
      setErro(
        "Erro ao criar item de menu. Verifique o terminal do Next.js para mais detalhes."
      );
    } finally {
      setMenuSalvando(false);
    }
  }

  async function atualizarMenu(menu: MenuLojaItem, data: Partial<MenuLojaItem>) {
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(`/api/configuracoes/loja/menus/${menu.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(
          result.error ||
            result.message ||
            `Erro ao atualizar menu. Status: ${response.status}`
        );
        return;
      }

      setSucesso("Menu atualizado.");
      refresh();
    } catch (error) {
      console.error(error);
      setErro(
        "Erro ao atualizar menu. Verifique o terminal do Next.js para mais detalhes."
      );
    }
  }

  async function salvarOrdemMenus(novaLista: MenuLojaItem[]) {
    setErro(null);
    setSucesso(null);
    setOrdemSalvando(true);

    try {
      const responses = await Promise.all(
        novaLista.map((menu, index) =>
          fetch(`/api/configuracoes/loja/menus/${menu.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ordem: index,
            }),
          })
        )
      );

      const erroResponse = responses.find((response) => !response.ok);

      if (erroResponse) {
        setErro("Erro ao salvar a nova ordem do menu.");
        setMenusOrdenados(menusOrdenadosInicial);
        return;
      }

      setSucesso("Ordem do menu atualizada.");
      refresh();
    } catch (error) {
      console.error(error);
      setErro("Erro ao salvar a nova ordem do menu.");
      setMenusOrdenados(menusOrdenadosInicial);
    } finally {
      setOrdemSalvando(false);
    }
  }

  async function reordenarMenu(destinoId: string) {
    if (!menuArrastandoId || ordemSalvando) return;

    const novaLista = moverItem(menusOrdenados, menuArrastandoId, destinoId).map(
      (menu, index) => ({
        ...menu,
        ordem: index,
      })
    );

    setMenuArrastandoId(null);
    setMenusOrdenados(novaLista);

    await salvarOrdemMenus(novaLista);
  }

  async function excluirMenu(menu: MenuLojaItem) {
    const confirmado = window.confirm(`Excluir o item de menu ${menu.nome}?`);

    if (!confirmado) return;

    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(`/api/configuracoes/loja/menus/${menu.id}`, {
        method: "DELETE",
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(
          data.error ||
            data.message ||
            `Erro ao excluir menu. Status: ${response.status}`
        );
        return;
      }

      setSucesso("Item de menu excluído com sucesso.");
      refresh();
    } catch (error) {
      console.error(error);
      setErro(
        "Erro ao excluir menu. Verifique o terminal do Next.js para mais detalhes."
      );
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Configuração visual da loja
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Organize banners desktop/mobile e os links do menu público em uma
              tela mais guiada.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setAbaAtiva("BANNERS")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                abaAtiva === "BANNERS"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Banners
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("MENU")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                abaAtiva === "MENU"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Menu público
            </button>
          </div>
        </div>

        {erro && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {sucesso}
          </div>
        )}
      </section>

      {abaAtiva === "BANNERS" && (
        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">
                Novo banner
              </h2>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              O banner será exibido como imagem clicável na loja. Envie uma
              versão horizontal para desktop e, opcionalmente, uma versão
              vertical para mobile.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Banner desktop
                </label>

                <p className="mb-2 text-xs leading-5 text-slate-500">
                  Recomendado: 1920 x 640 px. Use imagem horizontal.
                </p>

                <input
                  id="banner-imagem"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    selecionarBannerDesktop(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Banner mobile
                </label>

                <p className="mb-2 text-xs leading-5 text-slate-500">
                  Opcional. Recomendado: 1080 x 1350 px ou 900 x 1200 px.
                </p>

                <input
                  id="banner-imagem-mobile"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    selecionarBannerMobile(event.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
                />
              </div>

              <input
                value={bannerTitulo}
                onChange={(event) => setBannerTitulo(event.target.value)}
                placeholder="Nome interno opcional"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Link do banner
                </label>

                <div className="flex gap-2">
                  <input
                    value={bannerLinkUrl}
                    onChange={(event) => setBannerLinkUrl(event.target.value)}
                    placeholder="/loja/descontos ou https://..."
                    className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                  />

                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                  >
                    <Search className="h-4 w-4" />
                    Buscar
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={bannerAtivo}
                  onChange={(event) => setBannerAtivo(event.target.checked)}
                  className="h-4 w-4"
                />
                Banner ativo
              </label>

              <button
                type="button"
                onClick={criarBanner}
                disabled={bannerSalvando}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {bannerSalvando ? "Salvando..." : "Adicionar banner"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Banners cadastrados
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Arraste os banners para mudar a ordem de exibição.
              </p>
            </div>

            {bannersOrdenados.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                Nenhum banner cadastrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bannersOrdenados.map((banner) => (
                  <div
                    key={banner.id}
                    draggable={!ordemSalvando}
                    onDragStart={() => setBannerArrastandoId(banner.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reordenarBanner(banner.id)}
                    className={`grid cursor-grab gap-4 px-5 py-4 transition active:cursor-grabbing lg:grid-cols-[32px_180px_1fr_auto] ${
                      bannerArrastandoId === banner.id ? "bg-slate-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center text-slate-300">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="grid gap-2">
                      <div className="relative h-20 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                        <img
                          src={banner.imagemUrl}
                          alt={banner.titulo || "Banner da loja"}
                          className="h-full w-full object-cover"
                        />

                        <div className="pointer-events-none absolute inset-0 bg-black/5" />

                        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          <Monitor className="h-3 w-3" />
                          Desktop
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Smartphone className="h-3.5 w-3.5" />
                        {banner.imagemMobileUrl
                          ? "Mobile configurado"
                          : "Sem versão mobile"}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-3">
                      <input
                        value={banner.titulo || ""}
                        onChange={(event) =>
                          setBannersOrdenados((atuais) =>
                            atuais.map((item) =>
                              item.id === banner.id
                                ? { ...item, titulo: event.target.value }
                                : item
                            )
                          )
                        }
                        onBlur={(event) =>
                          atualizarBanner(banner, {
                            titulo: event.target.value,
                          })
                        }
                        placeholder="Nome interno"
                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
                      />

                      <input
                        value={banner.linkUrl || ""}
                        onChange={(event) =>
                          setBannersOrdenados((atuais) =>
                            atuais.map((item) =>
                              item.id === banner.id
                                ? { ...item, linkUrl: event.target.value }
                                : item
                            )
                          )
                        }
                        onBlur={(event) =>
                          atualizarBanner(banner, {
                            linkUrl: event.target.value,
                          })
                        }
                        placeholder="Link opcional"
                        className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
                      />

                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Ordem {banner.ordem}</span>
                        <span>Atualizado em {dataCurta(banner.atualizadoEm)}</span>
                      </div>
                    </div>

                    <div className="flex min-w-[140px] flex-col gap-2">
                      <button
                        type="button"
                        draggable={false}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setBannerPreview({
                            banner,
                            modo: "DESKTOP",
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <Monitor className="h-4 w-4" />
                        Desktop
                      </button>

                      <button
                        type="button"
                        draggable={false}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setBannerPreview({
                            banner,
                            modo: "MOBILE",
                          });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <Smartphone className="h-4 w-4" />
                        Mobile
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          atualizarBanner(banner, { ativo: !banner.ativo })
                        }
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                          banner.ativo
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {banner.ativo ? "Ativo" : "Inativo"}
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirBanner(banner.id, banner.titulo)}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {abaAtiva === "MENU" && (
        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <Menu className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">
                Novo item de menu
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={menuNome}
                onChange={(event) => setMenuNome(event.target.value)}
                placeholder="Nome do menu"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />

              <select
                value={menuTipo}
                onChange={(event) => {
                  setMenuTipo(event.target.value);
                  setMenuCategoria("");
                  setMenuLinkUrl("");
                  setMenuPaginaEspecial("");
                  setMenuCategoriasSelecionadas([]);
                }}
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                <option value="CATEGORIA">Categoria</option>
                <option value="PAGINA">Página especial</option>
                <option value="CAMPANHA">Campanha por categorias</option>
                <option value="LINK">Link personalizado</option>
              </select>

              {menuTipo === "CATEGORIA" && (
                <select
                  value={menuCategoria}
                  onChange={(event) => aplicarCategoriaNoMenu(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">Selecione uma categoria</option>

                  {categoriasParaUso.map((categoria) => (
                    <option key={categoria.slug} value={categoria.value}>
                      {categoria.label}
                    </option>
                  ))}
                </select>
              )}

              {menuTipo === "PAGINA" && (
                <select
                  value={menuPaginaEspecial}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMenuPaginaEspecial(value);

                    if (value === "DESCONTOS") {
                      setMenuNome((current) => current || "Descontos");
                      setMenuLinkUrl("/loja/descontos");
                    }

                    if (value === "TODAS_CATEGORIAS") {
                      setMenuNome((current) => current || "Categorias");
                      setMenuLinkUrl("/loja");
                    }
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">Selecione</option>
                  <option value="DESCONTOS">Descontos</option>
                  <option value="TODAS_CATEGORIAS">Todas as categorias</option>
                </select>
              )}

              {menuTipo === "CAMPANHA" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Categorias da campanha
                  </p>

                  <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                    {categoriasParaUso.map((categoria) => (
                      <label
                        key={categoria.slug}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-700 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={menuCategoriasSelecionadas.includes(
                            categoria.value
                          )}
                          onChange={() =>
                            setMenuCategoriasSelecionadas((atuais) =>
                              toggleCategoria(atuais, categoria.value)
                            )
                          }
                          className="h-4 w-4"
                        />
                        {categoria.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <input
                value={menuLinkUrl}
                onChange={(event) => setMenuLinkUrl(event.target.value)}
                placeholder="/loja/descontos ou https://..."
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={menuDestaque}
                  onChange={(event) => setMenuDestaque(event.target.checked)}
                  className="h-4 w-4"
                />
                Destacar item no menu
              </label>

              {menuDestaque && (
                <input
                  type="color"
                  value={menuCorDestaque}
                  onChange={(event) => setMenuCorDestaque(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3"
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Início
                  </span>
                  <input
                    type="date"
                    value={menuDataInicio}
                    onChange={(event) => setMenuDataInicio(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Fim
                  </span>
                  <input
                    type="date"
                    value={menuDataFim}
                    onChange={(event) => setMenuDataFim(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={menuAtivo}
                  onChange={(event) => setMenuAtivo(event.target.checked)}
                  className="h-4 w-4"
                />
                Menu ativo
              </label>

              <button
                type="button"
                onClick={criarMenu}
                disabled={menuSalvando}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {menuSalvando ? "Salvando..." : "Adicionar item ao menu"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Menu público
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Arraste os itens para mudar a ordem.
              </p>

              {menusOrdenados.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {menusOrdenados
                    .filter((menu) => menu.ativo)
                    .map((menu) => (
                      <span
                        key={menu.id}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                        style={
                          menu.destaque
                            ? { color: corSegura(menu.corDestaque) }
                            : undefined
                        }
                      >
                        {menu.nome}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {menusOrdenados.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                Nenhum item de menu cadastrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {menusOrdenados.map((menu) => (
                  <div
                    key={menu.id}
                    draggable={!ordemSalvando}
                    onDragStart={() => setMenuArrastandoId(menu.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reordenarMenu(menu.id)}
                    className={`grid cursor-grab gap-4 px-5 py-4 transition active:cursor-grabbing lg:grid-cols-[32px_1fr_auto] ${
                      menuArrastandoId === menu.id ? "bg-slate-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center text-slate-300">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {menu.nome}
                        </p>

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          {tipoLabel(menu.tipo)}
                        </span>

                        {menu.destaque && (
                          <span
                            className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold ring-1 ring-slate-200"
                            style={{ color: corSegura(menu.corDestaque) }}
                          >
                            Destaque
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            menu.ativo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {menu.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {menu.linkUrl || "Sem link configurado"}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        Categoria: {menu.categoria || "-"} · Página:{" "}
                        {paginaEspecialLabel(menu.paginaEspecial)}
                      </p>

                      {parseCategoriasSelecionadas(
                        menu.categoriasSelecionadas
                      ).length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Campanha:{" "}
                          {parseCategoriasSelecionadas(
                            menu.categoriasSelecionadas
                          ).join(", ")}
                        </p>
                      )}

                      {(menu.dataInicio || menu.dataFim) && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Período: {dataInput(menu.dataInicio)} até{" "}
                          {dataInput(menu.dataFim)}
                        </p>
                      )}
                    </div>

                    <div className="flex min-w-[110px] flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          atualizarMenu(menu, { ativo: !menu.ativo })
                        }
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                          menu.ativo
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {menu.ativo ? "Ativo" : "Inativo"}
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirMenu(menu)}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <BannerPreviewModal
        preview={bannerPreview}
        onClose={() => setBannerPreview(null)}
      />
    </main>
  );
}
