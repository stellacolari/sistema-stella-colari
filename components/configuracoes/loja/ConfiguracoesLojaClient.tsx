"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  GripVertical,
  ImageIcon,
  LinkIcon,
  Menu,
  Monitor,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import LinkSugestoesInput from "@/components/configuracoes/loja/LinkSugestoesInput";

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
type BannerPreviewModo = "DESKTOP" | "MOBILE";

type BannerPreviewState = {
  banner: BannerLojaItem;
  modo: BannerPreviewModo;
} | null;
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
function BannerPreviewCard({
  banner,
  expandido,
  onToggle,
}: {
  banner: BannerLojaItem;
  expandido: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Prévia do banner
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Confira rapidamente as versões desktop e mobile deste banner.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {expandido ? (
            <>
              <EyeOff className="h-4 w-4" />
              Ocultar prévia
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4" />
              Expandir prévia
            </>
          )}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Monitor className="h-4 w-4" />
            Desktop
          </div>

          <div
            className={`relative overflow-hidden border border-slate-200 bg-white ${
              expandido ? "h-64" : "h-24"
            }`}
          >
            <img
              src={banner.imagemUrl}
              alt={banner.titulo || "Banner desktop"}
              className="h-full w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-0 bg-black/5" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Smartphone className="h-4 w-4" />
            Mobile
          </div>

          <div
            className={`relative overflow-hidden border border-slate-200 bg-white ${
              expandido ? "h-64" : "h-24"
            }`}
          >
            {banner.imagemMobileUrl ? (
              <img
                src={banner.imagemMobileUrl}
                alt={banner.titulo || "Banner mobile"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-amber-50 px-4 text-center text-xs font-medium leading-5 text-amber-700">
                Sem imagem mobile. A loja usará a imagem desktop.
              </div>
            )}

            {banner.imagemMobileUrl && (
              <div className="pointer-events-none absolute inset-0 bg-black/5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
  const [isPending, startTransition] = useTransition();

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

  const [bannersOrdenados, setBannersOrdenados] = useState<BannerLojaItem[]>(
    bannersOrdenadosInicial
  );

  const [menusOrdenados, setMenusOrdenados] = useState<MenuLojaItem[]>(
    menusOrdenadosInicial
  );

  const [bannerArrastandoId, setBannerArrastandoId] = useState<string | null>(
    null
  );
  const [bannersPreviewAberto, setBannersPreviewAberto] = useState<string[]>([]);
  const [menuArrastandoId, setMenuArrastandoId] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<BannerPreviewState>(null);

  const [bannerTitulo, setBannerTitulo] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [bannerAtivo, setBannerAtivo] = useState(true);
  const [bannerArquivo, setBannerArquivo] = useState<File | null>(null);
  const [bannerArquivoMobile, setBannerArquivoMobile] = useState<File | null>(null);
  const LIMITE_UPLOAD_BANNER_MB = 4;

function arquivoDentroDoLimite(file: File | null) {
  if (!file) return true;

  const tamanhoMb = file.size / 1024 / 1024;

  return tamanhoMb <= LIMITE_UPLOAD_BANNER_MB;
}

function selecionarBannerDesktop(file: File | null) {
  if (!arquivoDentroDoLimite(file)) {
    setErro(`O banner desktop deve ter no máximo ${LIMITE_UPLOAD_BANNER_MB} MB. Comprima a imagem antes de enviar.`);
    setBannerArquivo(null);
    return;
  }

  setErro(null);
  setBannerArquivo(file);
}

function selecionarBannerMobile(file: File | null) {
  if (!arquivoDentroDoLimite(file)) {
    setErro(`O banner mobile deve ter no máximo ${LIMITE_UPLOAD_BANNER_MB} MB. Comprima a imagem antes de enviar.`);
    setBannerArquivoMobile(null);
    return;
  }

  setErro(null);
  setBannerArquivoMobile(file);
}

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
  const [abaAtiva, setAbaAtiva] = useState<"BANNERS" | "MENU">("BANNERS");

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
  function alternarPreviewBanner(bannerId: string) {
  setBannersPreviewAberto((atuais) => {
    if (atuais.includes(bannerId)) {
      return atuais.filter((id) => id !== bannerId);
    }

    return [...atuais, bannerId];
  });
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

    if (bannerSalvando) {
      return;
    }

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

    if (menuSalvando) {
      return;
    }

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
            Organize banners desktop/mobile e os links do menu público em uma tela
            mais guiada.
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
  O banner será exibido como imagem clicável na loja. Envie uma versão
  horizontal para desktop e, opcionalmente, uma versão vertical para mobile.
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
      Opcional. Recomendado: 1080 x 1350 px ou 900 x 1200 px. A imagem ocupará cerca de 70% da altura da tela no mobile.
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
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            />

            <LinkSugestoesInput
              value={bannerLinkUrl}
              onChange={setBannerLinkUrl}
              label="Link do banner"
              ajuda="Busque páginas, categorias, produtos ou digite um link personalizado."
            />

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={bannerAtivo}
                onChange={(event) => setBannerAtivo(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Banner ativo
            </label>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void criarBanner();
              }}
              disabled={bannerSalvando || isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {bannerSalvando ? "Adicionando..." : "Adicionar banner"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Banners cadastrados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Arraste os banners para mudar a ordem de exibição.
            </p>
          </div>

          {bannersOrdenados.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">
              Nenhum banner cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bannersOrdenados.map((banner) => (
                <div
                  key={banner.id}
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setBannerArrastandoId(banner.id);
                  }}
                  onDragEnd={(event) => {
                    event.stopPropagation();
                    setBannerArrastandoId(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void reordenarBanner(banner.id);
                  }}
                  className={`grid cursor-grab gap-4 px-5 py-4 transition active:cursor-grabbing lg:grid-cols-[32px_180px_1fr_auto] ${
                    bannerArrastandoId === banner.id
                      ? "bg-slate-50 opacity-60"
                      : "bg-white"
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
                      {banner.imagemMobileUrl ? "Mobile configurado" : "Sem versão mobile"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      defaultValue={banner.titulo ?? ""}
                      onBlur={(event) =>
                        atualizarBanner(banner, {
                          titulo: event.target.value,
                        })
                      }
                      placeholder="Nome interno"
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                    />

                    <input
                      defaultValue={banner.linkUrl ?? ""}
                      onBlur={(event) =>
                        atualizarBanner(banner, {
                          linkUrl: event.target.value,
                        })
                      }
                      placeholder="Link opcional"
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                      <BannerPreviewCard
                          banner={banner}
                          expandido={bannersPreviewAberto.includes(banner.id)}
                          onToggle={() => alternarPreviewBanner(banner.id)}
                        />
                  <div className="flex flex-col gap-2">
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
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        banner.ativo
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {banner.ativo ? "Ativo" : "Inativo"}
                    </button>

                    <button
                      type="button"
                      draggable={false}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void excluirBanner(banner.id, banner.titulo);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
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

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Cadastre categorias, campanhas, páginas especiais ou links livres.
          </p>

          <div className="mt-5 space-y-4">
            <input
              value={menuNome}
              onChange={(event) => setMenuNome(event.target.value)}
              placeholder="Nome. Ex: Anéis, Descontos, Quem somos"
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            />

            <select
              value={menuTipo}
              onChange={(event) => setMenuTipo(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="CATEGORIA">Categoria</option>
              <option value="CAMPANHA">Campanha temporária</option>
              <option value="PAGINA">Página</option>
              <option value="LINK">Link livre</option>
            </select>

            <select
              value={menuPaginaEspecial}
              onChange={(event) => {
                const value = event.target.value;
                setMenuPaginaEspecial(value);

                if (value === "DESCONTOS") {
                  setMenuLinkUrl("/loja/descontos");
                  setMenuNome((current) => current || "Descontos");
                }

                if (value === "TODAS_CATEGORIAS") {
                  setMenuLinkUrl("/loja/categorias");
                  setMenuNome((current) => current || "Categorias");
                }
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Sem página especial</option>
              <option value="DESCONTOS">Página de descontos</option>
              <option value="TODAS_CATEGORIAS">Todas as categorias</option>
            </select>

            <select
              value={menuCategoria}
              onChange={(event) => aplicarCategoriaNoMenu(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Categoria opcional</option>

              {categoriasParaUso.map((categoria) => (
                <option key={categoria.value} value={categoria.value}>
                  {categoria.label}
                </option>
              ))}
            </select>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Categorias selecionadas
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use para páginas especiais, campanhas ou agrupamentos.
              </p>

              <div className="mt-3 grid max-h-40 gap-2 overflow-y-auto pr-1">
                {categoriasParaUso.map((categoria) => (
                  <label
                    key={categoria.value}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={menuCategoriasSelecionadas.includes(
                        categoria.value
                      )}
                      onChange={() =>
                        setMenuCategoriasSelecionadas((current) =>
                          toggleCategoria(current, categoria.value)
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {categoria.label}
                  </label>
                ))}
              </div>
            </div>

            <LinkSugestoesInput
              value={menuLinkUrl}
              onChange={setMenuLinkUrl}
              label="Link do menu"
              ajuda="Escolha uma sugestão ou mantenha um link personalizado."
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={menuDestaque}
                  onChange={(event) => setMenuDestaque(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Deixar item em destaque no menu
              </label>

              {menuDestaque && (
                <div className="mt-3 grid gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Cor do destaque
                  </label>

                  <div className="grid grid-cols-[56px_1fr] gap-3">
                    <input
                      type="color"
                      value={menuCorDestaque}
                      onChange={(event) =>
                        setMenuCorDestaque(event.target.value)
                      }
                      className="h-11 w-14 rounded-xl border border-slate-200 bg-white p-1"
                    />

                    <input
                      value={menuCorDestaque}
                      onChange={(event) =>
                        setMenuCorDestaque(event.target.value)
                      }
                      placeholder="#2e7b99"
                      className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>

                  <div
                    className="inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-semibold text-white"
                    style={{
                      backgroundColor: corSegura(menuCorDestaque),
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Prévia do destaque
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="date"
                value={menuDataInicio}
                onChange={(event) => setMenuDataInicio(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />

              <input
                type="date"
                value={menuDataFim}
                onChange={(event) => setMenuDataFim(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={menuAtivo}
                onChange={(event) => setMenuAtivo(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Menu ativo
            </label>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void criarMenu();
              }}
              disabled={menuSalvando || isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {menuSalvando ? "Adicionando..." : "Adicionar menu"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Menu público cadastrado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Arraste os itens para mudar a ordem do menu da loja.
            </p>
          </div>

          {menusOrdenados.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">
              Nenhum item de menu cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {menusOrdenados.map((menu) => {
                const categoriasSelecionadas = parseCategoriasSelecionadas(
                  menu.categoriasSelecionadas
                );

                return (
                  <div
                    key={menu.id}
                    draggable
                    onDragStart={(event) => {
                      event.stopPropagation();
                      setMenuArrastandoId(menu.id);
                    }}
                    onDragEnd={(event) => {
                      event.stopPropagation();
                      setMenuArrastandoId(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void reordenarMenu(menu.id);
                    }}
                    className={`grid cursor-grab gap-4 px-5 py-4 transition active:cursor-grabbing lg:grid-cols-[32px_1fr_180px_120px] ${
                      menuArrastandoId === menu.id
                        ? "bg-slate-50 opacity-60"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-center text-slate-300">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">
                          {menu.nome}
                        </p>

                        {menu.destaque && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                            style={{
                              backgroundColor: corSegura(menu.corDestaque),
                            }}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Destaque
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {tipoLabel(menu.tipo)} · /{menu.slug} · Página especial:{" "}
                        {paginaEspecialLabel(menu.paginaEspecial)}
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        Link: {menu.linkUrl || "-"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Categoria: {menu.categoria || "-"}
                      </p>

                      {categoriasSelecionadas.length > 0 && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Categorias selecionadas:{" "}
                          <span className="font-medium">
                            {categoriasSelecionadas.join(", ")}
                          </span>
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-400">
                        Vigência: {dataCurta(menu.dataInicio)} até{" "}
                        {dataCurta(menu.dataFim)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <select
                        defaultValue={menu.tipo}
                        onChange={(event) =>
                          atualizarMenu(menu, { tipo: event.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="CATEGORIA">Categoria</option>
                        <option value="CAMPANHA">Campanha</option>
                        <option value="PAGINA">Página</option>
                        <option value="LINK">Link</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          atualizarMenu(menu, {
                            destaque: !Boolean(menu.destaque),
                            corDestaque: menu.corDestaque || "#2e7b99",
                          })
                        }
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold ${
                          menu.destaque
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {menu.destaque ? "Com destaque" : "Sem destaque"}
                      </button>

                      <input
                        type="date"
                        defaultValue={dataInput(menu.dataInicio)}
                        onBlur={(event) =>
                          atualizarMenu(menu, {
                            dataInicio: event.target.value,
                          })
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                      />

                      <input
                        type="date"
                        defaultValue={dataInput(menu.dataFim)}
                        onBlur={(event) =>
                          atualizarMenu(menu, {
                            dataFim: event.target.value,
                          })
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          atualizarMenu(menu, { ativo: !menu.ativo })
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                          menu.ativo
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {menu.ativo ? "Ativo" : "Inativo"}
                      </button>

                      <button
                        type="button"
                        draggable={false}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void excluirMenu(menu);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
  </section>
)}
{abaAtiva === "MENU" && (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">
            Links úteis
          </h2>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            Home: <span className="font-semibold">/loja</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            Carrinho: <span className="font-semibold">/loja/carrinho</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            Categorias: <span className="font-semibold">/loja/categorias</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            Descontos: <span className="font-semibold">/loja/descontos</span>
          </div>
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