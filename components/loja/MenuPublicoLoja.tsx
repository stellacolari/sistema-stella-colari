"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PerfilClienteLink from "@/components/loja/PerfilClienteLink";
import {
  ChevronRight,
  Menu,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

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
      className="flex min-w-0 max-w-[118px] shrink items-center justify-center sm:max-w-[150px] md:max-w-[180px]"
      aria-label="Ir para a loja"
    >
      {!logoErro && (
        <img
          src={LOGO_URL}
          alt="Stella"
          onError={() => setLogoErro(true)}
          className="block h-8 max-h-8 w-auto max-w-full object-contain sm:h-9 sm:max-h-9"
        />
      )}

      {logoErro && (
        <div className="flex h-8 max-w-full items-center truncate brand-bg px-3 text-xs font-semibold tracking-[0.18em] text-white sm:h-9 sm:px-4 sm:text-sm">
          STELLA
        </div>
      )}
    </Link>
  );
}

function ProdutoSugestaoBusca({ produto }: { produto: ProdutoBuscaMenuItem }) {
  return (
    <Link
      href={`/loja/produto/${produto.id}`}
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

export default function MenuPublicoLoja({
  menus,
  categorias = [],
  produtos = [],
  mostrarBusca = true,
  mostrarPerfil = true,
  mostrarCarrinho = true,
}: MenuPublicoLojaProps) {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState<
    string | null
  >(null);
  const [busca, setBusca] = useState("");
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
      .slice(0, 5);
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

  function abrirBusca() {
    setBuscaAberta(true);

    window.setTimeout(() => {
      inputBuscaRef.current?.focus();
    }, 0);
  }

  function fecharBusca() {
    setBuscaAberta(false);
    setBusca("");
  }

  function abrirMenu() {
    setMenuAberto(true);
  }

  function fecharMenu() {
    setMenuVisivel(false);

    window.setTimeout(() => {
      setMenuAberto(false);
      setCategoriaSelecionadaId(null);
    }, 280);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="brand-bg px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white sm:text-[13px] sm:tracking-[0.28em]">
          10% de cashback na primeira compra
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-[88px_minmax(0,1fr)_88px] items-center gap-2 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)_160px] sm:px-6 sm:py-4 lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:px-8">
          <div className="flex min-w-0 items-center justify-start gap-1 sm:gap-2">
            <button
              type="button"
              onClick={abrirMenu}
              aria-label="Abrir menu"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-white text-xs font-light uppercase tracking-[0.14em] text-slate-900 transition hover:text-[var(--brand-blue)] sm:h-11"
            >
              <Menu className="h-5 w-5" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {mostrarBusca && (
              <button
                type="button"
                onClick={buscaAberta ? fecharBusca : abrirBusca}
                aria-label={buscaAberta ? "Fechar busca" : "Buscar produtos"}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-white text-slate-900 transition hover:text-[var(--brand-blue)] sm:h-11 sm:w-11"
              >
                {buscaAberta ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-center overflow-hidden">
            <LogoLoja />
          </div>

          <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2 lg:gap-3">
            <Link
              href={CONTATO_URL}
              className="hidden h-11 items-center justify-center gap-2 bg-white text-xs font-light text-slate-900 transition hover:text-[var(--brand-blue)] md:inline-flex"
            >
              Fale Conosco
            </Link>

            {mostrarPerfil && <PerfilClienteLink className="h-10 w-10" />}

            {mostrarCarrinho && (
              <Link
                href="/loja/carrinho"
                aria-label="Carrinho"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-slate-900 transition hover:text-[var(--brand-blue)] sm:h-11 sm:w-11"
              >
                <ShoppingBag className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>

        {buscaAberta && (
          <div className="absolute left-0 right-0 top-full z-50 px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <label className="flex h-11 items-center gap-2 border border-slate-200 bg-white px-4 transition focus-within:border-[var(--brand-blue)]">
                <Search className="h-4 w-4 text-slate-400" />

                <input
                  ref={inputBuscaRef}
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar produtos"
                  className="h-full w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                />
              </label>

              <div className="mt-3">
                {!termoBusca ? (
                  <p className="px-1 py-3 text-sm font-medium text-slate-500">
                    Digite o nome, código ou categoria do produto.
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
            className={`absolute left-0 top-0 h-full w-[88vw] max-w-[420px] bg-white shadow-2xl transition-transform duration-300 ease-out lg:w-[20vw] lg:max-w-none ${
              menuVisivel ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 px-8 py-7">
                <button
                  type="button"
                  onClick={fecharMenu}
                  className="flex h-8 w-8 items-center justify-center text-slate-900 transition hover:text-[var(--brand-blue)]"
                  aria-label="Fechar menu"
                >
                  <X className="h-6 w-6" />
                </button>

                <span className="text-sm font-medium text-slate-900">
                  Fechar
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <nav className="space-y-7 pt-5">
                  {categoriasArvore.map((categoria) => (
                    <button
                      key={categoria.id}
                      type="button"
                      onClick={() => setCategoriaSelecionadaId(categoria.id)}
                      className={`block w-full text-left text-[18px] font-light leading-tight tracking-tight transition hover:text-[var(--brand-blue)] ${
                        categoriaSelecionadaId === categoria.id
                          ? "text-[var(--brand-blue)]"
                          : "text-slate-950"
                      }`}
                    >
                      {categoria.nome}
                    </button>
                  ))}

                  {menus.length > 0 && (
                    <div className="space-y-7 border-t border-slate-100 pt-7">
                      {menus.map((menu) => (
                        <Link
                          key={menu.id}
                          href={menu.href}
                          onClick={fecharMenu}
                          className="block text-[20px] font-normal leading-tight tracking-tight text-slate-950 transition hover:text-[var(--brand-blue)]"
                        >
                          {menu.nome}
                        </Link>
                      ))}

                      <Link
                        href={CONTATO_URL}
                        onClick={fecharMenu}
                        className="block text-[20px] font-normal leading-tight tracking-tight text-slate-950 transition hover:text-[var(--brand-blue)] md:hidden"
                      >
                        Fale conosco
                      </Link>
                    </div>
                  )}
                </nav>
              </div>

              <div className="border-t border-slate-100 px-8 py-7 text-sm text-slate-700">
                <p className="font-medium">Precisa de ajuda?</p>
                <Link
                  href={CONTATO_URL}
                  onClick={fecharMenu}
                  className="mt-3 block text-slate-950 transition hover:text-[var(--brand-blue)]"
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
                  <img
                    src={categoriaSelecionada.imagemUrl}
                    alt={categoriaSelecionada.nome}
                    className="h-64 w-full object-cover"
                  />
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

          {categoriaSelecionada && (
            <section
              className={`absolute bottom-0 left-0 right-0 max-h-[65vh] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
                menuVisivel ? "translate-y-0" : "translate-y-full"
              }`}
            >
              {categoriaSelecionada.imagemUrl ? (
                <img
                  src={categoriaSelecionada.imagemUrl}
                  alt={categoriaSelecionada.nome}
                  className="h-44 w-full object-cover"
                />
              ) : null}

              <div className="flex items-start justify-between gap-4 px-6 pt-5">
                <div>
                  <Link
                    href={`/loja/categoria/${categoriaSelecionada.slug}`}
                    onClick={fecharMenu}
                    className="text-2xl font-medium tracking-tight text-slate-950"
                  >
                    {categoriaSelecionada.nome}
                  </Link>

                  {categoriaSelecionada.descricao && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {categoriaSelecionada.descricao}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCategoriaSelecionadaId(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 pb-6 pt-5">
                <div className="border-t border-slate-200 pt-5">
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
            </section>
          )}
        </div>
      )}
    </>
  );
}