"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ConsentimentoPrivacidadeBanner from "@/components/loja/ConsentimentoPrivacidadeBanner";
import PerfilClienteLink from "@/components/loja/PerfilClienteLink";
import {
  ChevronRight,
  Heart,
  Menu,
  Package,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  FAVORITOS_UPDATED_EVENT,
  lerFavoritosIds,
} from "./favoritos";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import { normalizarLojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import {
  registrarBuscaRealizada,
  registrarBuscaSemResultado,
  registrarCategoriaClicada,
  registrarCliqueResultadoBusca,
} from "@/lib/loja/eventos-client";
import { imagemPublicaPodeSerOtimizada } from "@/lib/loja/imagem-publica";
import { categoriaConsentimentoPermitida } from "@/lib/loja/consentimento-privacidade";

const LOGO_URL = "/logo-stella.png";
const CONTATO_URL = "/loja/contato";

export type MenuPublicoItem = {
  id: string;
  nome: string;
  href: string;
  destaque?: boolean;
  corDestaque?: string | null;
};

export type CategoriaMenuPublicoItem = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  descricao?: string | null;
  imagemUrl?: string | null;
  exibirNoMenu?: boolean;
  ordemMenu?: number;
};

type CategoriaMenuComFilhos = CategoriaMenuPublicoItem & {
  filhos: CategoriaMenuComFilhos[];
};

type CategoriaMenuNivelada = CategoriaMenuComFilhos & {
  nivel: number;
};

type BuscaAutocompleteProduto = {
  id: string;
  nome: string;
  slug: string | null;
  categoria: string;
  imagemUrl?: string | null;
  href: string;
  tipoResultado: "PRODUTO";
};

type BuscaAutocompleteCategoria = {
  id?: never;
};

type BuscaAutocompletePagina = {
  id?: never;
};

type BuscaAutocompleteGrupo = "produtos" | "sugestoes";

type BuscaAutocompleteResultado = {
  modo: "autocomplete";
  produtos: BuscaAutocompleteProduto[];
  categorias: BuscaAutocompleteCategoria[];
  paginas: BuscaAutocompletePagina[];
  sugestoes: string[];
  termoNormalizado: string;
  ordemGrupos: BuscaAutocompleteGrupo[];
};

type BuscaAutocompleteClick = {
  tipoResultado: "produto";
  produtoId?: string;
  metadata?: Record<string, unknown>;
};

type MenuPublicoLojaProps = {
  menus: MenuPublicoItem[];
  categorias?: CategoriaMenuPublicoItem[];
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
  mostrarBusca?: boolean;
  mostrarPerfil?: boolean;
  mostrarCarrinho?: boolean;
  mostrarFavoritos?: boolean;
  transparenteNoTopo?: boolean;
  textoClaroNoTopo?: boolean;
  transicaoTransparenteAoScroll?: boolean;
};

const BUSCAS_RECENTES_KEY = "stella-buscas-recentes";
const AUTOCOMPLETE_CACHE_TTL_MS = 2 * 60_000;
const autocompleteCache = new Map<
  string,
  { timestamp: number; data: BuscaAutocompleteResultado }
>();

function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function normalizarChaveAutocomplete(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resultadoBuscaTemItens(resultado: BuscaAutocompleteResultado | null) {
  if (!resultado) return false;

  return resultado.produtos.length > 0;
}

function ordenarCategorias(
  items: CategoriaMenuComFilhos[],
  ordenacao: "ORDEM" | "AZ"
): CategoriaMenuComFilhos[] {
  return [...items]
    .sort((a, b) => {
      if (ordenacao === "AZ") {
        return a.nome.localeCompare(b.nome);
      }

      const ordemA = Number(a.ordemMenu ?? 0);
      const ordemB = Number(b.ordemMenu ?? 0);

      if (ordemA !== ordemB) return ordemA - ordemB;

      return a.nome.localeCompare(b.nome);
    })
    .map((item) => ({
      ...item,
      filhos: ordenarCategorias(item.filhos, ordenacao),
    }));
}

function montarArvoreCategorias(
  categorias: CategoriaMenuPublicoItem[],
  ordenacao: "ORDEM" | "AZ"
): CategoriaMenuComFilhos[] {
  const mapa = new Map<string, CategoriaMenuComFilhos>();

  categorias.forEach((categoria) => {
    mapa.set(categoria.id, {
      ...categoria,
      filhos: [],
    });
  });

  const raiz: CategoriaMenuComFilhos[] = [];

  mapa.forEach((categoria) => {
    if (categoria.categoriaMaeId && mapa.has(categoria.categoriaMaeId)) {
      mapa.get(categoria.categoriaMaeId)!.filhos.push(categoria);
      return;
    }

    raiz.push(categoria);
  });

  return ordenarCategorias(raiz, ordenacao);
}

function achatarCategorias(
  categorias: CategoriaMenuComFilhos[],
  nivel = 0
): CategoriaMenuNivelada[] {
  return categorias.flatMap((categoria) => [
    {
      ...categoria,
      nivel,
    },
    ...achatarCategorias(categoria.filhos, nivel + 1),
  ]);
}

function LogoLoja({ claro = false }: { claro?: boolean }) {
  const [logoErro, setLogoErro] = useState(false);

  return (
    <Link
      href="/loja"
      className="flex min-w-0 shrink-0 items-center justify-center"
      aria-label="Ir para a loja"
    >
      {!logoErro && (
        <Image
          src={LOGO_URL}
          alt="Stella"
          width={170}
          height={36}
          onError={() => setLogoErro(true)}
          className={`block h-7 max-h-7 w-auto max-w-[116px] object-contain transition duration-300 sm:h-8 sm:max-h-8 sm:max-w-[160px] lg:h-10 lg:max-h-10 lg:max-w-[190px] ${
            claro ? "brightness-0 invert" : ""
          }`}
        />
      )}

      {logoErro && (
        <div
          className={`flex h-8 max-w-full items-center truncate border px-3 text-[11px] font-medium uppercase tracking-[0.28em] sm:h-9 sm:px-4 sm:text-xs lg:h-10 ${
            claro
              ? "border-white/50 bg-transparent text-white"
              : "border-[#1b1b18]/70 bg-transparent text-[#1b1b18]"
          }`}
        >
          STELLA
        </div>
      )}
    </Link>
  );
}

function ProdutoSugestaoBusca({
  produto,
  onNavigate,
}: {
  produto: BuscaAutocompleteProduto;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={produto.href}
      onClick={onNavigate}
      className="group grid grid-cols-[56px_minmax(0,1fr)] gap-4 border-b border-[#1b1b18]/10 py-4 transition last:border-b-0 hover:bg-[#eeeae1] sm:grid-cols-[64px_minmax(0,1fr)] sm:px-2"
    >
      <div className="aspect-[4/5] overflow-hidden bg-[#ebe7de]">
        {produto.imagemUrl ? (
          imagemPublicaPodeSerOtimizada(produto.imagemUrl) ? (
            <Image
              src={produto.imagemUrl}
              alt={produto.nome}
              width={128}
              height={160}
              sizes="64px"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <img
              src={produto.imagemUrl}
              alt={produto.nome}
              width={64}
              height={80}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#1b1b18]/35">
            <Package className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 self-center">
        <p className="line-clamp-2 text-[13px] font-medium uppercase leading-5 tracking-[0.08em] text-[#1b1b18]">
          {produto.nome}
        </p>
        <span className="mt-2 inline-flex text-[10px] font-medium uppercase tracking-[0.16em] text-[#1b1b18]/55 underline decoration-[#1b1b18]/25 underline-offset-4 transition group-hover:text-[var(--brand-blue)] group-hover:decoration-[var(--brand-blue)]">
          Ver produto
        </span>
      </div>
    </Link>
  );
}

function SecaoAutocomplete({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#1b1b18]/15 pt-4 first:border-t-0 first:pt-0">
      <div className="mb-1.5 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#1b1b18]/65">
          {titulo}
        </p>
      </div>
      {children}
    </section>
  );
}

function lerBuscasRecentes() {
  if (typeof window === "undefined") return [];
  if (!categoriaConsentimentoPermitida("PERSONALIZACAO")) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(BUSCAS_RECENTES_KEY) || "[]");

    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string").slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function salvarBuscaRecente(termo: string) {
  if (typeof window === "undefined") return;
  if (!categoriaConsentimentoPermitida("PERSONALIZACAO")) return;

  const termoLimpo = termo.trim();
  if (!termoLimpo) return;

  const atuais = lerBuscasRecentes();
  const proximas = [
    termoLimpo,
    ...atuais.filter((item) => item.toLowerCase() !== termoLimpo.toLowerCase()),
  ].slice(0, 5);

  window.localStorage.setItem(BUSCAS_RECENTES_KEY, JSON.stringify(proximas));
}

function CategoriaSubLink({
  categoria,
  nivel = 0,
  onNavigate,
}: {
  categoria: CategoriaMenuComFilhos;
  nivel?: number;
  onNavigate: () => void;
}) {
  function handleClick() {
    registrarCategoriaClicada({
      categoriaId: categoria.id,
      origem: "menu_publico",
      metadata: {
        nome: categoria.nome,
        slug: categoria.slug,
        nivel,
      },
    });
    onNavigate();
  }

  return (
    <div>
      <Link
        href={`/loja/categoria/${categoria.slug}`}
        onClick={handleClick}
        className="group flex items-center justify-between gap-3 border-b border-[#1b1b18]/10 py-3 text-left transition last:border-b-0"
        style={{
          paddingLeft: `${nivel * 18}px`,
        }}
      >
        <span
          className={`${
            nivel === 0
              ? "text-[15px] font-medium uppercase tracking-[0.08em] text-[#1b1b18]"
              : "text-[13px] font-normal uppercase tracking-[0.07em] text-[#1b1b18]/65"
          } transition group-hover:text-[var(--brand-blue)]`}
        >
          {categoria.nome}
        </span>

        {nivel === 0 && (
          <ChevronRight className="h-4 w-4 text-[#1b1b18]/30 transition group-hover:text-[var(--brand-blue)]" />
        )}
      </Link>

      {categoria.filhos.length > 0 && (
        <div>
          {categoria.filhos.map((filho) => (
            <CategoriaSubLink
              key={filho.id}
              categoria={filho}
              nivel={nivel + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriaMobileItem({
  categoria,
  aberta,
  onToggle,
  onNavigate,
}: {
  categoria: CategoriaMenuComFilhos;
  aberta: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const temFilhos = categoria.filhos.length > 0;

  function handleClick() {
    registrarCategoriaClicada({
      categoriaId: categoria.id,
      origem: "menu_publico_mobile",
      metadata: {
        nome: categoria.nome,
        slug: categoria.slug,
      },
    });
    onNavigate();
  }

  return (
    <div className="border-b border-[#1b1b18]/15 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/loja/categoria/${categoria.slug}`}
          onClick={handleClick}
          className="min-w-0 flex-1 py-4 text-sm font-medium uppercase tracking-[0.1em] text-[#1b1b18]"
        >
          {categoria.nome}
        </Link>

        {temFilhos && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-[#1b1b18]/55 transition hover:text-[var(--brand-blue)]"
            aria-label={
              aberta
                ? `Fechar subcategorias de ${categoria.nome}`
                : `Abrir subcategorias de ${categoria.nome}`
            }
          >
            <ChevronRight
              className={`h-5 w-5 transition-transform duration-200 ${
                aberta ? "rotate-90" : ""
              }`}
            />
          </button>
        )}
      </div>

      {temFilhos && aberta && (
        <div className="pb-4">
          <div className="border-l border-[#1b1b18]/20 pl-4">
            {categoria.filhos.map((filho) => (
              <CategoriaSubLink
                key={filho.id}
                categoria={filho}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPublicoLoja({
  menus,
  categorias = [],
  configuracaoMenuRodape,
  mostrarBusca = true,
  mostrarPerfil = true,
  mostrarCarrinho = true,
  mostrarFavoritos = true,
  transparenteNoTopo = false,
  textoClaroNoTopo = true,
  transicaoTransparenteAoScroll = true,
}: MenuPublicoLojaProps) {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState<
    string | null
  >(null);
  const [categoriasMobileAbertas, setCategoriasMobileAbertas] = useState<
    string[]
  >([]);
  const [busca, setBusca] = useState("");
  const [resultadoBusca, setResultadoBusca] =
    useState<BuscaAutocompleteResultado | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [buscasRecentes, setBuscasRecentes] = useState<string[]>([]);
  const [favoritosCount, setFavoritosCount] = useState(0);
  const [passouTopoTransparente, setPassouTopoTransparente] = useState(false);
  const inputBuscaRef = useRef<HTMLInputElement | null>(null);
  const buscaContainerRef = useRef<HTMLDivElement | null>(null);
  const buscaAbortRef = useRef<AbortController | null>(null);
  const buscaButtonRef = useRef<HTMLButtonElement | null>(null);
  const abrirMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuDialogRef = useRef<HTMLElement | null>(null);
  const fecharMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  const configMenu = useMemo(
    () => normalizarLojaMenuRodapeConfig(configuracaoMenuRodape).menu,
    [configuracaoMenuRodape]
  );

  const categoriasConfiguradas = useMemo(() => {
    if (!configMenu.ativo || !configMenu.categoriasAutomaticasAtivas) {
      return [];
    }

    const categoriasOcultas = new Set(configMenu.categoriasOcultasIds);

    return categorias.filter((categoria) => {
      if (categoriasOcultas.has(categoria.id)) return false;
      if (
        configMenu.mostrarApenasCategoriasVisiveis &&
        categoria.exibirNoMenu === false
      ) {
        return false;
      }
      if (!configMenu.mostrarCategoriasMae && !categoria.categoriaMaeId) {
        return false;
      }
      if (categoria.categoriaMaeId && !configMenu.mostrarCategoriasFilhas) {
        return false;
      }

      return true;
    });
  }, [categorias, configMenu]);

  const menusConfigurados = useMemo(() => {
    if (!configMenu.ativo || !configMenu.linksManuaisAtivos) {
      return [];
    }

    return menus;
  }, [configMenu, menus]);

  const categoriasArvore = useMemo(
    () =>
      montarArvoreCategorias(
        categoriasConfiguradas,
        configMenu.ordenacaoCategorias
      ),
    [categoriasConfiguradas, configMenu.ordenacaoCategorias]
  );

  const categoriasListaSimples = useMemo(
    () => achatarCategorias(categoriasArvore),
    [categoriasArvore]
  );

  const categoriaSelecionada =
    categoriasArvore.find(
      (categoria) => categoria.id === categoriaSelecionadaId
    ) ?? null;
  const headerTransparenteAtivo =
    transparenteNoTopo &&
    (!transicaoTransparenteAoScroll || !passouTopoTransparente);
  const headerTextClass =
    headerTransparenteAtivo && textoClaroNoTopo
      ? "text-white hover:text-white/70"
      : "text-[#1b1b18] hover:text-[var(--brand-blue)]";
  const headerRuleClass =
    headerTransparenteAtivo && textoClaroNoTopo
      ? "border-white/30"
      : "border-[#1b1b18]/15";

  const termoBusca = busca.trim();
  const sugestoesBusca = resultadoBusca?.produtos || [];
  const resultadoBuscaPossuiItens = resultadoBuscaTemItens(resultadoBusca);
  const gruposAutocomplete = useMemo(() => {
    if (!resultadoBusca) return [];

    const grupos = {
      produtos: {
        titulo: "Produtos encontrados",
        quantidade: resultadoBusca.produtos.length,
      },
      sugestoes: {
        titulo: "Sugestões",
        quantidade: resultadoBusca.sugestoes.length,
      },
    };

    return resultadoBusca.ordemGrupos
      .map((grupo) => ({
        chave: grupo,
        ...grupos[grupo],
      }))
      .filter((grupo) => grupo.quantidade > 0);
  }, [resultadoBusca]);

  useEffect(() => {
    function atualizarContador() {
      setFavoritosCount(lerFavoritosIds().length);
    }

    atualizarContador();

    window.addEventListener(FAVORITOS_UPDATED_EVENT, atualizarContador);
    window.addEventListener("storage", atualizarContador);

    return () => {
      window.removeEventListener(FAVORITOS_UPDATED_EVENT, atualizarContador);
      window.removeEventListener("storage", atualizarContador);
    };
  }, []);

  useEffect(() => {
    setBuscasRecentes(lerBuscasRecentes());
  }, []);

  useEffect(() => {
    if (!buscaAberta) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (target && buscaContainerRef.current?.contains(target)) {
        return;
      }

      fecharBusca();
    }

    function handleSearchKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      fecharBusca();
      window.requestAnimationFrame(() => buscaButtonRef.current?.focus());
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleSearchKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleSearchKeyDown);
    };
  }, [buscaAberta]);

  useEffect(() => {
    if (!buscaAberta) return;

    buscaAbortRef.current?.abort();

    if (termoBusca.length < 2) {
      setResultadoBusca(null);
      setBuscando(false);
      return;
    }

    const cacheKey = normalizarChaveAutocomplete(termoBusca);
    const cache = autocompleteCache.get(cacheKey);

    if (cache && Date.now() - cache.timestamp < AUTOCOMPLETE_CACHE_TTL_MS) {
      setResultadoBusca(cache.data);
      setBuscando(false);
      return;
    }

    const controller = new AbortController();
    buscaAbortRef.current = controller;
    setBuscando(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/loja/busca?modo=autocomplete&q=${encodeURIComponent(termoBusca)}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao buscar sugestoes.");
        }

        const data = (await response.json()) as BuscaAutocompleteResultado;
        autocompleteCache.set(cacheKey, {
          timestamp: Date.now(),
          data,
        });
        setResultadoBusca(data);

        registrarBuscaRealizada({
          termoBusca,
          origem: "autocomplete",
          metadata: {
            modo: "autocomplete",
            produtos: data.produtos.length,
          },
        });

        if (data.produtos.length === 0) {
          registrarBuscaSemResultado({
            termoBusca,
            origem: "autocomplete",
            metadata: {
              modo: "autocomplete",
            },
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Erro no autocomplete da loja:", error);
      } finally {
        if (!controller.signal.aborted) {
          setBuscando(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [buscaAberta, termoBusca]);

  useEffect(() => {
    if (!menuAberto) return;

    const frame = window.requestAnimationFrame(() => {
      setMenuVisivel(true);
      fecharMenuButtonRef.current?.focus();
    });

    function handleMenuKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        fecharMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        menuDialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter(
        (element) =>
          element.offsetParent !== null && element.getAttribute("aria-hidden") !== "true"
      );

      if (focusable.length === 0) {
        event.preventDefault();
        menuDialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleMenuKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleMenuKeyDown);
    };
  }, [menuAberto]);

  useEffect(() => {
    if (!buscaAberta) return;

    window.setTimeout(() => {
      inputBuscaRef.current?.focus();
    }, 0);
  }, [buscaAberta]);

  useEffect(() => {
    if (!menuAberto && !buscaAberta) return;

    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
    };
  }, [menuAberto, buscaAberta]);

  useEffect(() => {
    if (!transparenteNoTopo || !transicaoTransparenteAoScroll) {
      setPassouTopoTransparente(false);
      return;
    }

    function updateHeaderMode() {
      setPassouTopoTransparente(window.scrollY > 48);
    }

    updateHeaderMode();
    window.addEventListener("scroll", updateHeaderMode, { passive: true });

    return () => window.removeEventListener("scroll", updateHeaderMode);
  }, [transparenteNoTopo, transicaoTransparenteAoScroll]);

  function abrirBusca() {
    setBuscaAberta(true);
    setMenuVisivel(false);
    setMenuAberto(false);
    setCategoriaSelecionadaId(null);
  }

  function fecharBusca() {
    setBuscaAberta(false);
    setBusca("");
    setResultadoBusca(null);
    setBuscando(false);
    buscaAbortRef.current?.abort();
  }

  function abrirMenu() {
    setMenuAberto(true);
    setBuscaAberta(false);
    setBusca("");
    setResultadoBusca(null);
  }

  function irParaResultadosBusca() {
    const termo = busca.trim();

    if (!termo) return;

    salvarBuscaRecente(termo);
    setBuscasRecentes(lerBuscasRecentes());
    window.location.href = `/loja/busca?q=${encodeURIComponent(termo)}`;
  }

  function navegarSugestaoBusca(evento?: BuscaAutocompleteClick) {
    const termo = busca.trim();

    if (termo) {
      salvarBuscaRecente(termo);
      setBuscasRecentes(lerBuscasRecentes());

      if (evento) {
        registrarCliqueResultadoBusca({
          termoBusca: termo,
          tipoResultado: evento.tipoResultado,
          produtoId: evento.produtoId,
          origem: "autocomplete",
          metadata: evento.metadata,
        });
      }
    }

    fecharBusca();
  }

  function fecharMenu() {
    setMenuVisivel(false);

    window.setTimeout(() => {
      setMenuAberto(false);
      setCategoriaSelecionadaId(null);
      setCategoriasMobileAbertas([]);
      abrirMenuButtonRef.current?.focus();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280);
  }

  function toggleCategoriaMobile(categoriaId: string) {
    setCategoriasMobileAbertas((atuais) => {
      if (atuais.includes(categoriaId)) {
        return atuais.filter((id) => id !== categoriaId);
      }

      return [...atuais, categoriaId];
    });
  }

  function navegarCategoriaMenu(
    categoria: CategoriaMenuNivelada | CategoriaMenuComFilhos,
    origem: string,
    nivel?: number
  ) {
    registrarCategoriaClicada({
      categoriaId: categoria.id,
      origem,
      metadata: {
        nome: categoria.nome,
        slug: categoria.slug,
        nivel,
      },
    });
    fecharMenu();
  }

  return (
    <>
      <header
        className={`top-0 z-50 transition-colors duration-300 ${
          transparenteNoTopo
            ? "fixed inset-x-0"
            : "sticky"
        } ${
          headerTransparenteAtivo
            ? "border-transparent bg-transparent"
            : "border-b border-[#1b1b18]/15 bg-white/95 text-[#1b1b18] backdrop-blur-md"
        }`}
      >
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:h-[72px] sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:px-6 lg:h-20 lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:px-10">
          <div className="flex min-w-0 items-center justify-start">
            <button
              ref={abrirMenuButtonRef}
              type="button"
              onClick={abrirMenu}
              aria-label="Abrir menu"
              aria-controls="menu-publico-dialog"
              aria-expanded={menuAberto}
              className={`group inline-flex h-11 w-10 shrink-0 items-center justify-center gap-3 transition sm:w-auto sm:justify-start ${headerTextClass}`}
            >
              <Menu className="h-[18px] w-[18px] stroke-[1.5]" />
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.24em] sm:inline">
                Menu
              </span>
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-center overflow-hidden px-1">
            <LogoLoja claro={headerTransparenteAtivo && textoClaroNoTopo} />
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-0 sm:gap-1">
            <Link
              href={CONTATO_URL}
              className={`hidden h-11 shrink-0 items-center justify-center border-r pr-5 text-[10px] font-medium uppercase tracking-[0.18em] transition lg:inline-flex ${headerRuleClass} ${headerTextClass}`}
            >
              Atendimento
            </Link>

            {mostrarBusca && (
              <button
                ref={buscaButtonRef}
                type="button"
                onClick={buscaAberta ? fecharBusca : abrirBusca}
                aria-label={buscaAberta ? "Fechar busca" : "Buscar produtos"}
                aria-controls="busca-publica"
                aria-expanded={buscaAberta}
                className={`inline-flex h-11 w-9 shrink-0 items-center justify-center transition sm:w-11 ${headerTextClass}`}
              >
                {buscaAberta ? (
                  <X className="h-[18px] w-[18px] stroke-[1.5]" />
                ) : (
                  <Search className="h-[18px] w-[18px] stroke-[1.5]" />
                )}
              </button>
            )}

            {mostrarFavoritos && (
              <Link
                href="/loja/favoritos"
                aria-label="Favoritos"
                className={`inline-flex h-11 w-9 shrink-0 items-center justify-center transition sm:w-11 ${headerTextClass}`}
              >
                <div className="relative">
                  <Heart
                    className={`h-[18px] w-[18px] stroke-[1.5] ${
                      favoritosCount > 0
                        ? "fill-[var(--brand-blue)] text-[var(--brand-blue)]"
                        : ""
                    }`}
                    fill={favoritosCount > 0 ? "currentColor" : "none"}
                  />
                  {favoritosCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center bg-[var(--brand-blue)] px-1 text-[9px] font-semibold text-white">
                      {favoritosCount}
                    </span>
                  )}
                </div>
              </Link>
            )}

            {mostrarPerfil && (
              <div className="hidden lg:block">
                <PerfilClienteLink
                  className={`h-11 w-11 shrink-0 ${headerTextClass}`}
                />
              </div>
            )}

            {mostrarCarrinho && (
              <Link
                href="/loja/carrinho"
                aria-label="Carrinho"
                className={`inline-flex h-11 w-9 shrink-0 items-center justify-center transition sm:w-11 ${headerTextClass}`}
              >
                <ShoppingBag className="h-[18px] w-[18px] stroke-[1.5]" />
              </Link>
            )}
          </div>
        </div>

        {(categoriasArvore.length > 0 || menusConfigurados.length > 0) && (
          <nav
            aria-label="Navegação principal da loja"
            className={`mx-auto hidden h-10 max-w-[1600px] items-center justify-center gap-7 overflow-hidden border-t px-10 lg:flex ${headerRuleClass}`}
          >
            {categoriasArvore.slice(0, 6).map((categoria) => (
              <Link
                key={`cabecalho-categoria-${categoria.id}`}
                href={`/loja/categoria/${categoria.slug}`}
                onClick={() =>
                  registrarCategoriaClicada({
                    categoriaId: categoria.id,
                    origem: "menu_publico_cabecalho",
                    metadata: {
                      nome: categoria.nome,
                      slug: categoria.slug,
                      nivel: 0,
                    },
                  })
                }
                className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] transition ${headerTextClass}`}
              >
                {categoria.nome}
              </Link>
            ))}

            {menusConfigurados.slice(0, 4).map((menu) => (
              <Link
                key={`cabecalho-menu-${menu.id}`}
                href={menu.href}
                target={isExternalUrl(menu.href) ? "_blank" : undefined}
                rel={isExternalUrl(menu.href) ? "noreferrer" : undefined}
                className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] transition ${headerTextClass}`}
                style={
                  menu.corDestaque ? { color: menu.corDestaque } : undefined
                }
              >
                {menu.nome}
              </Link>
            ))}
          </nav>
        )}

        {buscaAberta && (
          <div
            ref={buscaContainerRef}
            id="busca-publica"
            role="search"
            aria-label="Busca de produtos"
            className="absolute left-0 right-0 top-full z-50 border-y border-[#1b1b18]/15 bg-white px-4 py-5 text-[#1b1b18] sm:px-6 sm:py-7 lg:px-10"
          >
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center justify-between gap-3">
                <label className="flex h-14 flex-1 items-center gap-3 border-b border-[#1b1b18]/45 bg-transparent px-1 transition focus-within:border-[var(--brand-blue)]">
                  <span className="sr-only">Buscar produtos</span>
                  <Search className="h-4 w-4 text-[#1b1b18]/45" />

                  <input
                    ref={inputBuscaRef}
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        irParaResultadosBusca();
                      }
                    }}
                    placeholder="Buscar joias, produtos ou códigos"
                    className="h-full w-full bg-transparent text-sm font-medium uppercase tracking-[0.08em] outline-none placeholder:text-[#1b1b18]/35"
                  />
                </label>

                <button
                  type="button"
                  onClick={fecharBusca}
                  className="flex h-14 w-14 items-center justify-center border border-[#1b1b18]/25 text-[#1b1b18]/55 transition hover:border-[#1b1b18] hover:text-[#1b1b18]"
                  aria-label="Fechar busca"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-[58vh] overflow-y-auto">
                {!termoBusca ? (
                  <>
                    <p className="px-1 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#1b1b18]/50">
                      Digite o nome, material ou tamanho do produto.
                    </p>
                    {buscasRecentes.length > 0 ? (
                      <div className="flex flex-wrap gap-2 px-1 pb-3">
                        {buscasRecentes.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setBusca(item)}
                            className="border-b border-[#1b1b18]/30 px-1 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#1b1b18]/65 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : termoBusca.length < 2 ? (
                  <p className="px-1 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#1b1b18]/50">
                    Digite pelo menos 2 letras para buscar.
                  </p>
                ) : buscando && !resultadoBuscaPossuiItens ? (
                  <p className="px-1 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#1b1b18]/50">
                    Buscando...
                  </p>
                ) : resultadoBuscaPossuiItens && resultadoBusca ? (
                  <div className="space-y-4">
                    {buscando ? (
                      <p className="px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#1b1b18]/40">
                        Atualizando resultados...
                      </p>
                    ) : null}

                    {gruposAutocomplete.map((grupo) => (
                      <SecaoAutocomplete
                        key={grupo.chave}
                        titulo={grupo.titulo}
                      >
                        {grupo.chave === "produtos"
                          ? sugestoesBusca.map((produto, index) => (
                              <ProdutoSugestaoBusca
                                key={produto.id}
                                produto={produto}
                                onNavigate={() =>
                                  navegarSugestaoBusca({
                                    tipoResultado: "produto",
                                    produtoId: produto.id,
                                    metadata: {
                                      nome: produto.nome,
                                      href: produto.href,
                                      posicao: index + 1,
                                      categoria: produto.categoria,
                                    },
                                  })
                                }
                              />
                            ))
                          : null}

                        {grupo.chave === "sugestoes" ? (
                          <div className="flex flex-wrap gap-2 px-1 py-2">
                            {resultadoBusca.sugestoes.map((sugestao) => (
                              <Link
                                key={sugestao}
                                href={`/loja/busca?q=${encodeURIComponent(
                                  sugestao
                                )}`}
                                onClick={() => {
                                  salvarBuscaRecente(sugestao);
                                  setBuscasRecentes(lerBuscasRecentes());
                                  fecharBusca();
                                }}
                                className="border-b border-[#1b1b18]/30 bg-transparent px-1 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#1b1b18]/65 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                              >
                                {sugestao}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </SecaoAutocomplete>
                    ))}

                    <button
                      type="button"
                      onClick={irParaResultadosBusca}
                      className="mx-auto mt-4 flex w-fit items-center justify-center px-2 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#1b1b18]/70 underline decoration-[#1b1b18]/30 underline-offset-4 transition hover:text-[var(--brand-blue)] hover:decoration-[var(--brand-blue)]"
                    >
                      Ver todos os resultados →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="px-1 pt-3 text-xs font-medium uppercase tracking-[0.14em] text-[#1b1b18]/65">
                      Nenhum produto encontrado.
                    </p>

                    <SecaoAutocomplete
                      titulo="Sugestões"
                    >
                      <div className="flex flex-wrap gap-2 px-1 py-2">
                        {(resultadoBusca?.sugestoes || [
                          "anel",
                          "colar",
                          "brinco",
                          "presente",
                        ]).map((sugestao) => (
                          <Link
                            key={sugestao}
                            href={`/loja/busca?q=${encodeURIComponent(sugestao)}`}
                            onClick={() => {
                              salvarBuscaRecente(sugestao);
                              setBuscasRecentes(lerBuscasRecentes());
                              fecharBusca();
                            }}
                            className="border-b border-[#1b1b18]/30 bg-transparent px-1 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#1b1b18]/65 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                          >
                            {sugestao}
                          </Link>
                        ))}
                      </div>
                    </SecaoAutocomplete>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {menuAberto && (
        <div className="fixed inset-0 z-[80]">
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-[#12120f] transition-opacity duration-300 ease-out motion-reduce:duration-0 ${
              menuVisivel ? "opacity-75" : "opacity-0"
            }`}
            onClick={fecharMenu}
          />

          <aside
            ref={menuDialogRef}
            id="menu-publico-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            tabIndex={-1}
            className={`absolute left-0 top-0 h-full w-[94vw] max-w-[480px] border-r border-[#1b1b18]/20 bg-white text-[#1b1b18] transition-transform duration-300 ease-out motion-reduce:duration-0 lg:w-[46vw] lg:max-w-[520px] xl:w-[560px] xl:max-w-[560px] ${
              menuVisivel ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex h-20 items-center justify-between border-b border-[#1b1b18]/15 px-5 sm:px-8 lg:h-24 lg:px-10">
                <div className="flex items-center gap-3">
                  <button
                    ref={fecharMenuButtonRef}
                    type="button"
                    onClick={fecharMenu}
                    className="flex h-11 w-11 items-center justify-center text-[#1b1b18] transition hover:text-[var(--brand-blue)]"
                    aria-label="Fechar menu"
                  >
                    <X className="h-5 w-5 stroke-[1.5]" />
                  </button>

                  <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#1b1b18]/70">
                    Navegação
                  </span>
                </div>

                <div className="lg:hidden">
                  <LogoLoja />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8 sm:px-8 lg:px-10">
                <div className="border-b border-[#1b1b18]/15 py-5 lg:hidden">
                  <div className="grid grid-cols-2 gap-px bg-[#1b1b18]/15">
                    {mostrarPerfil && (
                      <div className="flex items-center gap-3 bg-white px-3 py-3.5">
                        <PerfilClienteLink className="h-9 w-9" />
                        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#1b1b18]">
                          Minha conta
                        </span>
                      </div>
                    )}

                    {mostrarFavoritos && (
                      <Link
                        href="/loja/favoritos"
                        onClick={fecharMenu}
                        className="flex items-center gap-3 bg-white px-3 py-3.5"
                      >
                        <Heart className="h-5 w-5 stroke-[1.5] text-[#1b1b18]" />
                        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#1b1b18]">
                          Favoritos
                        </span>
                      </Link>
                    )}

                    {mostrarCarrinho && (
                      <Link
                        href="/loja/carrinho"
                        onClick={fecharMenu}
                        className="flex items-center gap-3 bg-white px-3 py-3.5"
                      >
                        <ShoppingBag className="h-5 w-5 stroke-[1.5] text-[#1b1b18]" />
                        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#1b1b18]">
                          Carrinho
                        </span>
                      </Link>
                    )}
                  </div>
                </div>

                <nav className="pt-6 lg:space-y-10 lg:pt-10">
                  {categoriasArvore.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#1b1b18]/45 lg:hidden">
                        Categorias
                      </p>

                      {configMenu.exibicaoCategorias === "SIMPLES" ? (
                        <div className="space-y-1 lg:hidden">
                          {categoriasListaSimples.map((categoria) => (
                            <Link
                              key={categoria.id}
                              href={`/loja/categoria/${categoria.slug}`}
                              onClick={() =>
                                navegarCategoriaMenu(
                                  categoria,
                                  "menu_publico_mobile_simples",
                                  categoria.nivel
                                )
                              }
                              className="block border-b border-[#1b1b18]/15 py-4 text-sm font-medium uppercase tracking-[0.1em] text-[#1b1b18] transition hover:text-[var(--brand-blue)]"
                              style={{
                                paddingLeft: `${categoria.nivel * 16}px`,
                              }}
                            >
                              {categoria.nome}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="lg:hidden">
                          {categoriasArvore.map((categoria) => (
                            <CategoriaMobileItem
                              key={categoria.id}
                              categoria={categoria}
                              aberta={categoriasMobileAbertas.includes(
                                categoria.id
                              )}
                              onToggle={() =>
                                toggleCategoriaMobile(categoria.id)
                              }
                              onNavigate={fecharMenu}
                            />
                          ))}
                        </div>
                      )}

                      {configMenu.exibicaoCategorias === "SIMPLES" ? (
                        <div className="hidden lg:block">
                          {categoriasListaSimples.map((categoria) => (
                            <Link
                              key={categoria.id}
                              href={`/loja/categoria/${categoria.slug}`}
                              onClick={() =>
                                navegarCategoriaMenu(
                                  categoria,
                                  "menu_publico_desktop_simples",
                                  categoria.nivel
                                )
                              }
                              className={`block w-full border-b border-[#1b1b18]/15 py-4 text-left uppercase leading-tight transition hover:text-[var(--brand-blue)] ${
                                categoria.nivel === 0
                                  ? "text-[15px] font-medium tracking-[0.1em] text-[#1b1b18]"
                                  : "text-[12px] font-normal tracking-[0.08em] text-[#1b1b18]/60"
                              }`}
                              style={{
                                paddingLeft: `${categoria.nivel * 16}px`,
                              }}
                            >
                              {categoria.nome}
                            </Link>
                          ))}
                        </div>
                      ) : configMenu.exibicaoCategorias === "GRUPO" ? (
                        <div className="hidden lg:block">
                          {categoriasArvore.map((categoria) => (
                            <CategoriaSubLink
                              key={categoria.id}
                              categoria={categoria}
                              onNavigate={fecharMenu}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="hidden lg:block">
                          {categoriasArvore.map((categoria) => (
                            <button
                              key={categoria.id}
                              type="button"
                              onClick={() =>
                                setCategoriaSelecionadaId(categoria.id)
                              }
                              className={`block w-full border-b border-[#1b1b18]/15 py-4 text-left text-[15px] font-medium uppercase leading-tight tracking-[0.1em] transition hover:text-[var(--brand-blue)] ${
                                categoriaSelecionadaId === categoria.id
                                  ? "text-[var(--brand-blue)]"
                                  : "text-[#1b1b18]"
                              }`}
                            >
                              {categoria.nome}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {menusConfigurados.length > 0 && (
                    <div className="mt-7 space-y-1 border-t border-[#1b1b18]/15 pt-5 lg:mt-0 lg:space-y-0 lg:pt-8">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#1b1b18]/45 lg:hidden">
                        Links
                      </p>

                      {menusConfigurados.map((menu) => (
                        <Link
                          key={menu.id}
                          href={menu.href}
                          target={isExternalUrl(menu.href) ? "_blank" : undefined}
                          rel={isExternalUrl(menu.href) ? "noreferrer" : undefined}
                          onClick={fecharMenu}
                          className={`block border-b border-[#1b1b18]/15 py-4 text-sm font-medium uppercase leading-tight tracking-[0.1em] transition hover:text-[var(--brand-blue)] lg:text-[14px] ${
                            menu.destaque
                              ? "text-[var(--brand-blue)]"
                              : "text-[#1b1b18]"
                          }`}
                          style={
                            menu.corDestaque
                              ? { color: menu.corDestaque }
                              : undefined
                          }
                        >
                          {menu.nome}
                        </Link>
                      ))}

                      <Link
                        href={CONTATO_URL}
                        onClick={fecharMenu}
                        className="block border-b border-[#1b1b18]/15 py-4 text-sm font-medium uppercase leading-tight tracking-[0.1em] text-[#1b1b18] transition hover:text-[var(--brand-blue)] md:hidden"
                      >
                        Fale conosco
                      </Link>
                    </div>
                  )}
                </nav>
              </div>

              <div className="border-t border-[#1b1b18]/15 px-5 py-6 text-sm text-[#1b1b18]/65 sm:px-8 lg:px-10 lg:py-8">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em]">Precisa de ajuda?</p>
                <Link
                  href={CONTATO_URL}
                  onClick={fecharMenu}
                  className="mt-3 block w-fit border-b border-[#1b1b18]/35 pb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#1b1b18] transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                >
                  Fale conosco
                </Link>
              </div>
            </div>
          </aside>

          {configMenu.exibicaoCategorias === "DROPDOWN" && (
            <section
              className={`absolute top-0 hidden h-full border-r border-[#1b1b18]/20 bg-[#ebe7de] text-[#1b1b18] transition-all duration-300 ease-out lg:block ${
                categoriaSelecionada && menuVisivel
                  ? "left-[min(46vw,520px)] w-[420px] translate-x-0 opacity-100 xl:left-[560px] xl:w-[440px]"
                  : "left-[min(46vw,520px)] w-0 -translate-x-4 overflow-hidden opacity-0 xl:left-[560px]"
              }`}
            >
              {categoriaSelecionada && (
                <div className="h-full overflow-y-auto">
                  {categoriaSelecionada.imagemUrl ? (
                    <div className="relative h-[42vh] min-h-64 w-full overflow-hidden bg-[#ded8cc]">
                      <img
                        src={categoriaSelecionada.imagemUrl}
                        alt={categoriaSelecionada.nome}
                        className="h-full w-full object-cover"
                      />

                      <div className="pointer-events-none absolute inset-0 bg-black/5" />
                    </div>
                  ) : (
                    <div
                      className="h-[42vh] min-h-64 w-full bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,#f3f3f1_48%,#e4edef_100%)]"
                      aria-hidden="true"
                    />
                  )}

                  <div className="px-10 pt-9">
                    <Link
                      href={`/loja/categoria/${categoriaSelecionada.slug}`}
                      onClick={() =>
                        navegarCategoriaMenu(
                          categoriaSelecionada,
                          "menu_publico_dropdown_destaque"
                        )
                      }
                      className="text-[24px] font-light uppercase tracking-[0.08em] text-[#1b1b18] transition hover:text-[var(--brand-blue)]"
                    >
                      {categoriaSelecionada.nome}
                    </Link>

                    {categoriaSelecionada.descricao && (
                      <p className="mt-4 max-w-xl text-sm leading-7 text-[#1b1b18]/60">
                        {categoriaSelecionada.descricao}
                      </p>
                    )}
                  </div>

                  <div className="px-10 pb-10 pt-8">
                    <div className="border-t border-[#1b1b18]/20 pt-6">
                      {categoriaSelecionada.filhos.length > 0 ? (
                        <div className="space-y-1">
                          {categoriaSelecionada.filhos.map((filho) => (
                            <CategoriaSubLink
                              key={filho.id}
                              categoria={filho}
                              onNavigate={fecharMenu}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs uppercase tracking-[0.12em] text-[#1b1b18]/50">
                          Nenhuma subcategoria cadastrada.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
      <ConsentimentoPrivacidadeBanner />
    </>
  );
}
