"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PerfilClienteLink from "@/components/loja/PerfilClienteLink";
import { Heart, ChevronRight, Menu, Search, ShoppingBag, X } from "lucide-react";
import {
  FAVORITOS_UPDATED_EVENT,
  lerFavoritosIds,
} from "./favoritos";

const LOGO_URL = "/logo-stella.png";
const CONTATO_URL = "/loja/quem-somos";

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

type ProdutoBuscaMenuItem = {
  id: string;
  codigoInterno: string;
  nome: string;
  categoria: string;
  tamanhosDisponiveis?: {
    tamanhoAnel: string;
    quantidadeAtual: number;
  }[];
};

type MenuPublicoLojaProps = {
  menus: MenuPublicoItem[];
  categorias?: CategoriaMenuPublicoItem[];
  produtos?: ProdutoBuscaMenuItem[];
  mostrarBusca?: boolean;
  mostrarPerfil?: boolean;
  mostrarCarrinho?: boolean;
  mostrarFavoritos?: boolean;
};

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ordenarCategorias(
  items: CategoriaMenuComFilhos[]
): CategoriaMenuComFilhos[] {
  return [...items]
    .sort((a, b) => {
      const ordemA = Number(a.ordemMenu ?? 0);
      const ordemB = Number(b.ordemMenu ?? 0);

      if (ordemA !== ordemB) return ordemA - ordemB;

      return a.nome.localeCompare(b.nome);
    })
    .map((item) => ({
      ...item,
      filhos: ordenarCategorias(item.filhos),
    }));
}

function montarArvoreCategorias(
  categorias: CategoriaMenuPublicoItem[]
): CategoriaMenuComFilhos[] {
  const categoriasVisiveis = categorias.filter(
    (categoria) => categoria.exibirNoMenu !== false
  );

  const mapa = new Map<string, CategoriaMenuComFilhos>();

  categoriasVisiveis.forEach((categoria) => {
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

  return ordenarCategorias(raiz);
}

function LogoLoja() {
  const [logoErro, setLogoErro] = useState(false);

  return (
    <Link
      href="/loja"
      className="flex min-w-0 shrink-0 items-center justify-center"
      aria-label="Ir para a loja"
    >
      {!logoErro && (
        <img
          src={LOGO_URL}
          alt="Stella"
          onError={() => setLogoErro(true)}
          className="block h-7 max-h-7 w-auto max-w-[116px] object-contain sm:h-8 sm:max-h-8 sm:max-w-[150px] lg:h-9 lg:max-h-9 lg:max-w-[170px]"
        />
      )}

      {logoErro && (
        <div className="flex h-7 max-w-full items-center truncate brand-bg px-3 text-xs font-semibold tracking-[0.16em] text-white sm:h-8 sm:px-4 sm:text-sm lg:h-9">
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
  produto: ProdutoBuscaMenuItem;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={`/loja/produto/${produto.id}`}
      onClick={onNavigate}
      className="block border-b border-slate-100 px-1 py-3 last:border-b-0"
    >
      <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-900">
        {produto.nome}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {produto.codigoInterno} · {produto.categoria}
      </p>
    </Link>
  );
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
  return (
    <div>
      <Link
        href={`/loja/categoria/${categoria.slug}`}
        onClick={onNavigate}
        className="group flex items-center justify-between gap-3 py-2.5 text-left transition"
        style={{
          paddingLeft: `${nivel * 18}px`,
        }}
      >
        <span
          className={`${
            nivel === 0
              ? "text-[17px] font-medium text-slate-950"
              : "text-[15px] font-normal text-slate-600"
          } transition group-hover:text-[var(--brand-blue)]`}
        >
          {categoria.nome}
        </span>

        {nivel === 0 && (
          <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-[var(--brand-blue)]" />
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

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/loja/categoria/${categoria.slug}`}
          onClick={onNavigate}
          className="min-w-0 flex-1 py-4 text-base font-medium tracking-tight text-slate-950"
        >
          {categoria.nome}
        </Link>

        {temFilhos && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-500 transition hover:text-[var(--brand-blue)]"
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
          <div className="border-l border-slate-200 pl-4">
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
  produtos = [],
  mostrarBusca = true,
  mostrarPerfil = true,
  mostrarCarrinho = true,
  mostrarFavoritos = true,
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
  const [favoritosCount, setFavoritosCount] = useState(0);
  const inputBuscaRef = useRef<HTMLInputElement | null>(null);

  const categoriasArvore = useMemo(
    () => montarArvoreCategorias(categorias),
    [categorias]
  );

  const categoriaSelecionada =
    categoriasArvore.find(
      (categoria) => categoria.id === categoriaSelecionadaId
    ) ?? null;

  const termoBusca = normalizarTexto(busca);

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

  const sugestoesBusca = useMemo(() => {
    if (!termoBusca) return [];

    return produtos
      .filter((produto) => {
        const texto = normalizarTexto(
          [
            produto.codigoInterno,
            produto.nome,
            produto.categoria,
            ...(produto.tamanhosDisponiveis || []).map(
              (tamanho) => `tam ${tamanho.tamanhoAnel}`
            ),
          ].join(" ")
        );

        return texto.includes(termoBusca);
      })
      .slice(0, 6);
  }, [produtos, termoBusca]);

  useEffect(() => {
    if (!menuAberto) return;

    const frame = window.requestAnimationFrame(() => {
      setMenuVisivel(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
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

  function abrirBusca() {
    setBuscaAberta(true);
    setMenuVisivel(false);
    setMenuAberto(false);
    setCategoriaSelecionadaId(null);
  }

  function fecharBusca() {
    setBuscaAberta(false);
    setBusca("");
  }

  function abrirMenu() {
    setMenuAberto(true);
    setBuscaAberta(false);
    setBusca("");
  }

  function fecharMenu() {
    setMenuVisivel(false);

    window.setTimeout(() => {
      setMenuAberto(false);
      setCategoriaSelecionadaId(null);
      setCategoriasMobileAbertas([]);
    }, 280);
  }

  function toggleCategoriaMobile(categoriaId: string) {
    setCategoriasMobileAbertas((atuais) => {
      if (atuais.includes(categoriaId)) {
        return atuais.filter((id) => id !== categoriaId);
      }

      return [...atuais, categoriaId];
    });
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="hidden brand-bg px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white md:block lg:text-[13px] lg:tracking-[0.28em]">
          10% de cashback na primeira compra
        </div>

        <div className="mx-auto grid h-14 max-w-7xl grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:h-16 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:px-5 lg:h-[68px] lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:px-8">
          <div className="flex min-w-0 items-center justify-start">
            <button
              type="button"
              onClick={abrirMenu}
              aria-label="Abrir menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-white text-slate-900 transition hover:text-[var(--brand-blue)] sm:h-11 sm:w-auto sm:justify-start sm:gap-2"
            >
              <Menu className="h-5 w-5" />
              <span className="hidden text-xs font-light uppercase tracking-[0.14em] lg:inline">
                Menu
              </span>
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-center overflow-hidden px-1">
            <LogoLoja />
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5 sm:gap-1 lg:gap-2">
            <Link
              href={CONTATO_URL}
              className="hidden h-10 shrink-0 items-center justify-center gap-2 bg-white px-2 text-xs font-light text-slate-900 transition hover:text-[var(--brand-blue)] lg:inline-flex"
            >
              Fale Conosco
            </Link>

            {mostrarBusca && (
              <button
                type="button"
                onClick={buscaAberta ? fecharBusca : abrirBusca}
                aria-label={buscaAberta ? "Fechar busca" : "Buscar produtos"}
                className="hidden h-10 w-10 shrink-0 items-center justify-center bg-white text-slate-900 transition hover:text-[var(--brand-blue)] md:inline-flex"
              >
                {buscaAberta ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            )}

            {mostrarFavoritos && (
              <Link
                href="/loja/favoritos"
                aria-label="Favoritos"
                className="inline-flex h-10 w-9 shrink-0 items-center justify-center text-slate-900 transition hover:text-[var(--brand-blue)] sm:w-10"
              >
                <div className="relative">
                  <Heart
                    className={`h-5 w-5 ${
                      favoritosCount > 0
                        ? "fill-[var(--brand-blue)] text-[var(--brand-blue)]"
                        : ""
                    }`}
                    fill={favoritosCount > 0 ? "currentColor" : "none"}
                  />
                  {favoritosCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--brand-blue)] px-1 text-[10px] font-semibold text-white">
                      {favoritosCount}
                    </span>
                  )}
                </div>
              </Link>
            )}

            {mostrarPerfil && (
              <div className="hidden lg:block">
                <PerfilClienteLink className="h-10 w-10 shrink-0" />
              </div>
            )}

            {mostrarCarrinho && (
              <Link
                href="/loja/carrinho"
                aria-label="Carrinho"
                className="inline-flex h-10 w-9 shrink-0 items-center justify-center text-slate-900 transition hover:text-[var(--brand-blue)] sm:w-10"
              >
                <ShoppingBag className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>

        {buscaAberta && (
          <div className="absolute left-0 right-0 top-full z-50 border-t border-slate-100 bg-white px-4 py-4 shadow-2xl sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between gap-3">
                <label className="flex h-12 flex-1 items-center gap-2 border border-slate-200 bg-white px-4 transition focus-within:border-[var(--brand-blue)]">
                  <Search className="h-4 w-4 text-slate-400" />

                  <input
                    ref={inputBuscaRef}
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar joias, categorias ou códigos"
                    className="h-full w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={fecharBusca}
                  className="flex h-12 w-12 items-center justify-center border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
                  aria-label="Fechar busca"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 max-h-[55vh] overflow-y-auto">
                {!termoBusca ? (
                  <p className="px-1 py-3 text-sm font-medium text-slate-500">
                    Digite o nome, código, categoria ou tamanho do produto.
                  </p>
                ) : sugestoesBusca.length > 0 ? (
                  <div>
                    <p className="px-1 pb-1 text-xs font-medium uppercase tracking-[0.22em] brand-text">
                      Sugestões
                    </p>

                    {sugestoesBusca.map((produto) => (
                      <ProdutoSugestaoBusca
                        key={produto.id}
                        produto={produto}
                        onNavigate={fecharBusca}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="px-1 py-3 text-sm font-medium text-slate-500">
                    Nenhum produto encontrado.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {menuAberto && (
        <div className="fixed inset-0 z-[80]">
          <div
            className={`absolute inset-0 bg-slate-950 transition-opacity duration-300 ease-out ${
              menuVisivel ? "opacity-70" : "opacity-0"
            }`}
            onClick={fecharMenu}
          />

          <aside
            className={`absolute left-0 top-0 h-full w-[92vw] max-w-[430px] bg-white shadow-2xl transition-transform duration-300 ease-out lg:w-[20vw] lg:max-w-none ${
              menuVisivel ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5 sm:h-[72px] sm:px-8">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={fecharMenu}
                    className="flex h-10 w-10 items-center justify-center text-slate-900 transition hover:text-[var(--brand-blue)]"
                    aria-label="Fechar menu"
                  >
                    <X className="h-6 w-6" />
                  </button>

                  <span className="text-sm font-medium text-slate-900">
                    Menu
                  </span>
                </div>

                <div className="lg:hidden">
                  <LogoLoja />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8 sm:px-8">
                <div className="border-b border-slate-100 py-5 lg:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    {mostrarPerfil && (
                      <div className="flex items-center gap-3 border border-slate-200 px-3 py-3">
                        <PerfilClienteLink className="h-9 w-9" />
                        <span className="text-sm font-medium text-slate-900">
                          Minha conta
                        </span>
                      </div>
                    )}

                    {mostrarFavoritos && (
                      <Link
                        href="/loja/favoritos"
                        onClick={fecharMenu}
                        className="flex items-center gap-3 border border-slate-200 px-3 py-3"
                      >
                        <Heart className="h-5 w-5 text-slate-900" />
                        <span className="text-sm font-medium text-slate-900">
                          Favoritos
                        </span>
                      </Link>
                    )}

                    {mostrarCarrinho && (
                      <Link
                        href="/loja/carrinho"
                        onClick={fecharMenu}
                        className="flex items-center gap-3 border border-slate-200 px-3 py-3"
                      >
                        <ShoppingBag className="h-5 w-5 text-slate-900" />
                        <span className="text-sm font-medium text-slate-900">
                          Carrinho
                        </span>
                      </Link>
                    )}
                  </div>
                </div>

                <nav className="pt-5 lg:space-y-7">
                  {categoriasArvore.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 lg:hidden">
                        Categorias
                      </p>

                      <div className="lg:hidden">
                        {categoriasArvore.map((categoria) => (
                          <CategoriaMobileItem
                            key={categoria.id}
                            categoria={categoria}
                            aberta={categoriasMobileAbertas.includes(
                              categoria.id
                            )}
                            onToggle={() => toggleCategoriaMobile(categoria.id)}
                            onNavigate={fecharMenu}
                          />
                        ))}
                      </div>

                      <div className="hidden space-y-7 lg:block">
                        {categoriasArvore.map((categoria) => (
                          <button
                            key={categoria.id}
                            type="button"
                            onClick={() =>
                              setCategoriaSelecionadaId(categoria.id)
                            }
                            className={`block w-full text-left text-[18px] font-light leading-tight tracking-tight transition hover:text-[var(--brand-blue)] ${
                              categoriaSelecionadaId === categoria.id
                                ? "text-[var(--brand-blue)]"
                                : "text-slate-950"
                            }`}
                          >
                            {categoria.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {menus.length > 0 && (
                    <div className="mt-7 space-y-1 border-t border-slate-100 pt-5 lg:mt-0 lg:space-y-7 lg:pt-7">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 lg:hidden">
                        Links
                      </p>

                      {menus.map((menu) => (
                        <Link
                          key={menu.id}
                          href={menu.href}
                          onClick={fecharMenu}
                          className={`block py-3 text-base font-medium leading-tight tracking-tight transition hover:text-[var(--brand-blue)] lg:py-0 lg:text-[20px] lg:font-normal ${
                            menu.destaque
                              ? "text-[var(--brand-blue)]"
                              : "text-slate-950"
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
                        className="block py-3 text-base font-medium leading-tight tracking-tight text-slate-950 transition hover:text-[var(--brand-blue)] md:hidden"
                      >
                        Fale conosco
                      </Link>
                    </div>
                  )}
                </nav>
              </div>

              <div className="border-t border-slate-100 px-5 py-5 text-sm text-slate-700 sm:px-8 lg:py-7">
                <p className="font-medium">Precisa de ajuda?</p>
                <Link
                  href={CONTATO_URL}
                  onClick={fecharMenu}
                  className="mt-2 block text-slate-950 transition hover:text-[var(--brand-blue)]"
                >
                  Fale conosco
                </Link>
              </div>
            </div>
          </aside>

          <section
            className={`absolute top-0 hidden h-full bg-white shadow-2xl transition-all duration-300 ease-out lg:block ${
              categoriaSelecionada && menuVisivel
                ? "left-[20vw] w-[25vw] translate-x-0 opacity-100"
                : "left-[20vw] w-[0vw] -translate-x-4 overflow-hidden opacity-0"
            }`}
          >
            {categoriaSelecionada && (
              <div className="h-full overflow-y-auto">
                {categoriaSelecionada.imagemUrl ? (
                  <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                    <img
                      src={categoriaSelecionada.imagemUrl}
                      alt={categoriaSelecionada.nome}
                      className="h-full w-full object-cover"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-black/5" />
                  </div>
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
                    Sem imagem cadastrada
                  </div>
                )}

                <div className="px-10 pt-8">
                  <Link
                    href={`/loja/categoria/${categoriaSelecionada.slug}`}
                    onClick={fecharMenu}
                    className="text-[24px] font-medium tracking-tight text-slate-950 transition hover:text-[var(--brand-blue)]"
                  >
                    {categoriaSelecionada.nome}
                  </Link>

                  {categoriaSelecionada.descricao && (
                    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                      {categoriaSelecionada.descricao}
                    </p>
                  )}
                </div>

                <div className="px-10 pb-10 pt-8">
                  <div className="border-t border-slate-200 pt-6">
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
                      <p className="text-sm text-slate-500">
                        Nenhuma subcategoria cadastrada.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
