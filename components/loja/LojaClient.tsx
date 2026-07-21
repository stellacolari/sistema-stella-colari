"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import MenuPublicoLoja, {
  type CategoriaMenuPublicoItem,
  type MenuPublicoItem,
} from "@/components/loja/MenuPublicoLoja";
import LojaFiltrosProdutos from "@/components/loja/LojaFiltrosProdutos";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import type { ProdutoPublico } from "@/lib/loja/produto-publico";
import styles from "./LojaClient.module.css";

export type LojaProdutoItem = ProdutoPublico;

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
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
  mostrarTodosProdutos?: boolean;
  tituloVazio?: string;
  textoVazio?: string;
};

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

function BannerPrincipal({ banner }: { banner: LojaBannerItem }) {
  const conteudo = (
    <div className={styles.hero}>
      <picture className={styles.heroPicture}>
        {banner.imagemMobileUrl && (
          <source media="(max-width: 768px)" srcSet={banner.imagemMobileUrl} />
        )}

        <img
          src={banner.imagemUrl}
          alt={banner.titulo || "Banner da loja"}
          className={styles.heroImage}
        />
      </picture>

      {banner.titulo || banner.subtitulo ? (
        <div className={styles.heroOverlay}>
          <div className={styles.heroCopy}>
            {banner.subtitulo ? (
              <p className={styles.heroEyebrow}>{banner.subtitulo}</p>
            ) : null}
            {banner.titulo ? (
              <h1 className={styles.heroTitle}>{banner.titulo}</h1>
            ) : null}
            {banner.linkUrl ? (
              <span className={styles.heroAction}>Descobrir coleção</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  const wrapperClass = styles.heroWrapper;

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
    "Explore o catálogo",
    "Acompanhe seus pedidos",
    "Consulte frete e prazos",
    "Veja trocas e devoluções",
  ];

  return (
    <section className={styles.valueStrip} aria-label="Atalhos da loja">
      <div className={styles.valueStripInner}>
        {diferenciais.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className={styles.valueItem}
          >
            <span className={styles.valueIndex}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
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

  if (listaCompleta) {
    return (
      <section className={styles.catalogSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Catálogo</p>
            <h2 className={styles.sectionTitle}>
              {titulo}
            </h2>
          </div>

          <LojaFiltrosProdutos
            produtos={produtos}
            defaultOrder="destaque"
            renderProduto={(produto, index) => (
              <ProdutoCardLoja
                produto={produto}
                revealDelayMs={index * 50}
              />
            )}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.productSection}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Seleção</p>
          <h2 className={styles.sectionTitle}>
            {titulo}
          </h2>
        </div>

        <div className={styles.productGridWrapper}>
          <div className={styles.productGrid}>
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
              className={styles.carouselNext}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {totalPaginas > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: totalPaginas }).map((_, index) => (
                <button
                  key={`${titulo}-pagina-${index}`}
                  type="button"
                  onClick={() => setPaginaAtual(index)}
                  aria-label={`Ir para a página ${index + 1} da seção ${titulo}`}
                  className={`${styles.paginationDot} ${
                    index === paginaAtual
                      ? styles.paginationDotActive
                      : ""
                  }`}
                />
              ))}
            </div>
          )}

          {deveLimitar && !mostrarTodos ? (
            <div className={styles.moreRow}>
              <button
                type="button"
                onClick={() => setMostrarTodos(true)}
                className={styles.moreButton}
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
    <section className={styles.categoriesSection}>
      <div className={styles.categoriesHeader}>
        <p className={styles.sectionEyebrow}>Universos Stella</p>
        <h2 className={styles.sectionTitle}>
          Compre por categorias
        </h2>
      </div>

      <div className={styles.categoriesGrid}>
        {categorias.slice(0, 6).map((item, index) => (
          <Link
            key={item.id}
            href={`/loja/categoria/${encodeURIComponent(
              slugify(item.categoria)
            )}`}
            className={styles.categoryLink}
          >
            <div className={styles.categoryMedia}>
              <img
                src={item.imagemUrl}
                alt={item.titulo}
                className={styles.categoryImage}
              />
            </div>

            <div className={styles.categoryMeta}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item.titulo}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BlocoImagemTexto({ bloco }: { bloco: LojaBlocoHomeItem | null }) {
  if (!bloco) return null;

  return (
    <section className={styles.storySection}>
      <div className={styles.storyGrid}>
        <div className={styles.storyMedia}>
          {bloco.imagemUrl ? (
            <div className={styles.storyMediaInner}>
              <img
                src={bloco.imagemUrl}
                alt={bloco.titulo}
                className={styles.storyImage}
              />
            </div>
          ) : (
            <div
              className={styles.storyPlaceholder}
              role="img"
              aria-label="Imagem da categoria ainda não disponível"
            />
          )}
        </div>

        <div className={styles.storyCopyColumn}>
          <div className={styles.storyCopy}>
            <p className={styles.storyEyebrow}>Stella Colari</p>
            <h2 className={styles.storyTitle}>
              {bloco.titulo}
            </h2>

            <p className={styles.storyText}>
              {bloco.texto}
            </p>

            {bloco.textoBotao && bloco.linkBotao && (
              <Link
                href={bloco.linkBotao}
                className={styles.storyButton}
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

function RodapeLoja({
  menus,
  configuracaoMenuRodape,
}: {
  menus: LojaMenuItem[];
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
}) {
  return (
    <RodapePublicoLoja
      menus={menus}
      configuracaoMenuRodape={configuracaoMenuRodape}
    />
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
  configuracaoMenuRodape,
  mostrarTodosProdutos = true,
  tituloVazio = "Nenhum produto disponível no momento.",
  textoVazio = "Explore novamente em breve para conhecer novas peças.",
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
    <div className={styles.storefront}>
      <MenuPublicoLoja
        menus={menusPublicos}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
      />

      {bannerPrincipal && <BannerPrincipal banner={bannerPrincipal} />}

      <MicroFaixaDiferenciais />

      <main className={styles.main}>
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
          <section className={styles.storeEmptySection}>
            <div className={styles.storeEmpty}>
              <h2 className={styles.storeEmptyTitle}>
                {tituloVazio}
              </h2>

              <p className={styles.storeEmptyText}>
                {textoVazio}
              </p>
            </div>
          </section>
        )}
      </main>

      <RodapeLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
