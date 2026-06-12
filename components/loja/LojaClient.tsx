"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import MenuPublicoLoja, {
  type CategoriaMenuPublicoItem,
  type MenuPublicoItem,
} from "@/components/loja/MenuPublicoLoja";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";

export type LojaProdutoItem = {
  id: string;
  codigoInterno: string;
  nome: string;
  imagemUrl?: string | null;
  imagemHoverUrl?: string | null;
  categoria: string;
  categoriaIds?: string[];
  categoriaSlugs?: string[];
  categoriaNomes?: string[];
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoqueTotal: number;
  vendidosTotal: number;
  criadoEm: string;
  tamanhosDisponiveis: {
    tamanhoAnel: string;
    quantidadeAtual: number;
  }[];
};

export type LojaBannerItem = {
  id: string;
  titulo: string | null;
  subtitulo: string | null;
  imagemUrl: string;
  imagemMobileUrl?: string | null;
  linkUrl: string | null;
  ordem: number;
  ativo: boolean;
};

export type LojaMenuItem = {
  id: string;
  nome: string;
  slug: string;
  tipo: string;
  href: string;
  categoria: string | null;
  paginaEspecial?: string | null;
  categoriasSelecionadas?: string | null;
  destaque?: boolean;
  corDestaque?: string | null;
};

export type LojaCategoriaHomeItem = {
  id: string;
  titulo: string;
  categoria: string;
  imagemUrl: string;
};

export type LojaSecaoHomeItem = {
  id: string;
  titulo: string;
  categorias: string[];
};

export type LojaBlocoHomeItem = {
  id: string;
  titulo: string;
  texto: string;
  imagemUrl: string | null;
  textoBotao: string | null;
  linkBotao: string | null;
};

type LojaClientProps = {
  produtos: LojaProdutoItem[];
  banners: LojaBannerItem[];
  menus: LojaMenuItem[];
  categoriasHome: LojaCategoriaHomeItem[];
  secoesHome: LojaSecaoHomeItem[];
  blocoHome: LojaBlocoHomeItem | null;
  categoriasMenu?: CategoriaMenuPublicoItem[];
  mostrarTodosProdutos?: boolean;
  tituloVazio?: string;
  textoVazio?: string;
};

const LOGO_URL = "/logo-stella.png";

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(value: string) {
  return normalizarTexto(value).replace(/\s+/g, "-");
}

function LogoLoja() {
  const [logoErro, setLogoErro] = useState(false);

  return (
    <Link href="/loja" className="flex shrink-0 items-center">
      {!logoErro && (
        <img
          src={LOGO_URL}
          alt="Stella"
          onError={() => setLogoErro(true)}
          className="h-12 w-auto object-contain sm:h-8"
        />
      )}

      {logoErro && (
        <div className="flex h-12 items-center brand-bg px-5 text-base font-semibold tracking-[0.22em] sm:h-8">
          STELLA
        </div>
      )}
    </Link>
  );
}

function BannerPrincipal({ banner }: { banner: LojaBannerItem }) {
  const conteudo = (
    <picture className="block w-full">
      {banner.imagemMobileUrl && (
        <source media="(max-width: 768px)" srcSet={banner.imagemMobileUrl} />
      )}

      <img
        src={banner.imagemUrl}
        alt={banner.titulo || "Banner da loja"}
        className="h-[420px] w-full object-cover md:h-auto md:min-h-0"
      />
    </picture>
  );

  const wrapperClass =
    "block w-full overflow-hidden max-md:h-[70vh] max-md:[&_img]:h-full max-md:[&_img]:object-cover";

  if (banner.linkUrl) {
    return (
      <Link href={banner.linkUrl} className={wrapperClass}>
        {conteudo}
      </Link>
    );
  }

  return <div className={wrapperClass}>{conteudo}</div>;
}

function MicroFaixaDiferenciais() {
  const diferenciais = [
    "Frete Grátis*",
    "Garantia Vitalícia",
    "10% de Cashback*",
    "Frete Grátis*",
  ];

  return (
    <section className="mt-2 bg-[var(--brand-blue)] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 overflow-x-auto px-5 py-3 text-center sm:px-6 lg:px-8">
        {diferenciais.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex shrink-0 items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            <span className="whitespace-nowrap">{item}</span>

            {index < diferenciais.length - 1 && (
              <span className="h-1 w-1 rounded-full bg-white/70" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SecaoProdutos({
  titulo,
  produtos,
  listaCompleta = false,
}: {
  titulo: string;
  produtos: LojaProdutoItem[];
  listaCompleta?: boolean;
}) {
  const [mostrarTodos, setMostrarTodos] = useState(listaCompleta);
  const deveLimitar = !listaCompleta && produtos.length > 4;
  const produtosDaPagina =
    deveLimitar && !mostrarTodos ? produtos.slice(0, 4) : produtos;
  const totalPaginas = 1;
  const paginaAtual = 0;

  function proximaPagina() {
    return undefined;
  }

  function setPaginaAtual(_index: number) {
    void _index;
  }

  if (produtos.length === 0) return null;

  return (
    <section className="relative px-5 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {titulo}
          </h2>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {produtosDaPagina.map((produto, index) => (
              <ProdutoCardLoja
                key={produto.id}
                produto={produto}
                revealDelayMs={index * 70}
              />
            ))}
          </div>

          {totalPaginas > 1 && (
            <button
              type="button"
              onClick={proximaPagina}
              disabled={paginaAtual >= totalPaginas - 1}
              aria-label={`Ver próximos produtos em ${titulo}`}
              className="absolute right-0 top-[38%] z-10 hidden h-12 w-12 translate-x-1/2 -translate-y-1/2 items-center justify-center border brand-border bg-white/95 brand-text shadow-lg backdrop-blur transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)] disabled:pointer-events-none disabled:opacity-30 lg:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {totalPaginas > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: totalPaginas }).map((_, index) => (
                <button
                  key={`${titulo}-pagina-${index}`}
                  type="button"
                  onClick={() => setPaginaAtual(index)}
                  aria-label={`Ir para a página ${index + 1} da seção ${titulo}`}
                  className={`h-2.5 transition ${
                    index === paginaAtual
                      ? "w-8 bg-[var(--brand-blue)]"
                      : "w-2.5 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          )}

          {deveLimitar && !mostrarTodos ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setMostrarTodos(true)}
                className="brand-button-outline px-6 py-3 text-sm font-semibold"
              >
                Ver mais
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ComprePorCategorias({
  categorias,
}: {
  categorias: LojaCategoriaHomeItem[];
}) {
  if (categorias.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          Compre por categorias
        </h2>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3">
        {categorias.slice(0, 6).map((item) => (
          <Link
            key={item.id}
            href={`/loja/categoria/${encodeURIComponent(
              slugify(item.categoria)
            )}`}
            className="group block text-center"
          >
            <div className="relative aspect-square overflow-hidden bg-slate-100">
              <img
                src={item.imagemUrl}
                alt={item.titulo}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />

              <div className="pointer-events-none absolute inset-0 bg-black/5" />
            </div>

            <p className="mt-3 text-sm font-medium tracking-wide text-slate-900 transition group-hover:text-[var(--brand-blue)]">
              {item.titulo}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BlocoImagemTexto({ bloco }: { bloco: LojaBlocoHomeItem | null }) {
  if (!bloco) return null;

  return (
    <section className="py-8 lg:py-10">
      <div className="grid w-full bg-slate-50 lg:h-[50vh] lg:min-h-[280px] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-h-[220px] bg-slate-100 sm:min-h-[250px] lg:h-full lg:min-h-0">
          {bloco.imagemUrl ? (
            <div className="relative h-full w-full">
              <img
                src={bloco.imagemUrl}
                alt={bloco.titulo}
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-0 bg-black/5" />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-500">
              Sem imagem
            </div>
          )}
        </div>

        <div className="flex items-center px-6 py-8 sm:px-10 lg:h-full lg:px-14 lg:py-8">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {bloco.titulo}
            </h2>

            <p className="mt-4 text-sm font-medium leading-7 text-slate-600 md:text-base">
              {bloco.texto}
            </p>

            {bloco.textoBotao && bloco.linkBotao && (
              <Link
                href={bloco.linkBotao}
                className="mt-6 inline-flex brand-button px-6 py-3 text-sm font-semibold"
              >
                {bloco.textoBotao}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RodapeLoja({ menus }: { menus: LojaMenuItem[] }) {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <LogoLoja />

          <p className="mt-4 max-w-md text-sm font-medium leading-6 text-slate-500">
            Stella Colari. Produtos selecionados para compra online.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
          <Link href="/loja" className="hover:text-[var(--brand-blue)]">
            Home
          </Link>

          {menus.map((menu) => (
            <Link
              key={menu.id}
              href={menu.href}
              className="hover:text-[var(--brand-blue)]"
            >
              {menu.nome}
            </Link>
          ))}

          <Link
            href="/loja/carrinho"
            className="hover:text-[var(--brand-blue)]"
          >
            Carrinho
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default function LojaClient({
  produtos,
  banners,
  menus,
  categoriasHome,
  secoesHome,
  blocoHome,
  categoriasMenu = [],
  mostrarTodosProdutos = true,
  tituloVazio = "Nenhum produto disponível no momento.",
  textoVazio = "Cadastre produtos ativos para que eles apareçam na loja.",
}: LojaClientProps) {
  const bannerPrincipal = banners[0] ?? null;

  const secoesComProdutos = useMemo(() => {
    return secoesHome.map((secao) => ({
      ...secao,
      produtos: produtos.filter((produto) =>
        secao.categorias.includes(produto.categoria)
      ),
    }));
  }, [produtos, secoesHome]);

  const produtosJaExibidosEmSecoes = useMemo(() => {
    const ids = new Set<string>();

    secoesComProdutos.forEach((secao) => {
      secao.produtos.forEach((produto) => {
        ids.add(produto.id);
      });
    });

    return ids;
  }, [secoesComProdutos]);

  const produtosForaDasSecoes = useMemo(() => {
    return produtos.filter(
      (produto) => !produtosJaExibidosEmSecoes.has(produto.id)
    );
  }, [produtos, produtosJaExibidosEmSecoes]);

  const menusPublicos: MenuPublicoItem[] = menus.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: menu.href,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menusPublicos}
        categorias={categoriasMenu}
        produtos={produtos}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
      />

      {bannerPrincipal && <BannerPrincipal banner={bannerPrincipal} />}

      <MicroFaixaDiferenciais />

      <main>
        <ComprePorCategorias categorias={categoriasHome} />

        {secoesComProdutos[0] && (
          <SecaoProdutos
            titulo={secoesComProdutos[0].titulo}
            produtos={secoesComProdutos[0].produtos}
            listaCompleta={!mostrarTodosProdutos}
          />
        )}

        <BlocoImagemTexto bloco={blocoHome} />

        {secoesComProdutos.slice(1, 3).map((secao) => (
          <SecaoProdutos
            key={secao.id}
            titulo={secao.titulo}
            produtos={secao.produtos}
            listaCompleta={!mostrarTodosProdutos}
          />
        ))}

        {mostrarTodosProdutos && (
          <SecaoProdutos
            titulo="Todos os produtos"
            produtos={
              produtosForaDasSecoes.length > 0 ? produtosForaDasSecoes : produtos
            }
          />
        )}

        {produtos.length === 0 && (
          <section className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-6 lg:px-8">
            <div className="bg-white px-6 py-14 ring-1 ring-slate-200">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {tituloVazio}
              </h2>

              <p className="mt-3 text-sm font-medium text-slate-500">
                {textoVazio}
              </p>
            </div>
          </section>
        )}
      </main>

      <RodapeLoja menus={menus} />
    </div>
  );
}
