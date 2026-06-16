"use client";

import Link from "next/link";
import LojaFormularioBlock from "@/components/loja/blocos/LojaFormularioBlock";
import LojaFaqBlock from "@/components/loja/blocos/LojaFaqBlock";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import MenuPublicoLoja, {
  type CategoriaMenuPublicoItem,
  type MenuPublicoItem,
} from "@/components/loja/MenuPublicoLoja";
import BlocoPublicoRenderer, {
  isBlocoVisualPublico,
} from "@/components/loja/paginas/BlocoPublicoRenderer";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";

export type LojaBuilderPagina = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
};

export type LojaBuilderBloco = {
  id: string;
  tipo: string;
  titulo: string | null;
  ordem: number;
  configJson: unknown;
};

export type LojaBuilderProduto = {
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

export type LojaBuilderMenu = {
  id: string;
  nome: string;
  href: string;
  destaque?: boolean;
  corDestaque?: string | null;
};

export type LojaBuilderCategoriaAtual = {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  href: string;
  subcategorias: {
    id: string;
    nome: string;
    slug: string;
    descricao?: string | null;
    imagemUrl?: string | null;
    href: string;
  }[];
};

type FiltrosGrade = {
  categoria: string;
  tamanho: string;
  ordenacao: string;
  desconto: string;
  disponibilidade: string;
};

function asConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getString(
  config: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = config[key];

  if (typeof value === "string") return value;

  return fallback;
}

function getNumber(config: Record<string, unknown>, key: string, fallback = 0) {
  const value = Number(config[key]);

  if (Number.isFinite(value)) return value;

  return fallback;
}

function getBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback = false,
) {
  const value = config[key];

  if (typeof value === "boolean") return value;

  return fallback;
}

function getObject(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getStringArray(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return [];
}

function produtoTemDesconto(produto: {
  descontoAtivo: boolean;
  precoPromocional: number | null;
  precoVenda: number;
}) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function precoFinalProduto(produto: LojaBuilderProduto) {
  if (produtoTemDesconto(produto) && produto.precoPromocional !== null) {
    return produto.precoPromocional;
  }

  return produto.precoVenda;
}

function filtrarProdutosPorConfig(
  produtos: LojaBuilderProduto[],
  config: Record<string, unknown>,
  categoriaAtual?: LojaBuilderCategoriaAtual | null,
) {
  const fonte = getString(config, "fonte", "TODOS");
  const categorias = getStringArray(config, "categorias");
  const produtosIds = getStringArray(config, "produtosIds");
  const limite = getNumber(config, "limite", 12);

  let resultado = [...produtos];

  if (fonte === "CATEGORIA_ATUAL" && categoriaAtual) {
    const nomesCategorias = new Set([
      categoriaAtual.nome,
      ...categoriaAtual.subcategorias.map((categoria) => categoria.nome),
    ]);

    const produtosDaCategoria = resultado.filter((produto) =>
      nomesCategorias.has(produto.categoria),
    );

    resultado =
      produtosDaCategoria.length > 0 ? produtosDaCategoria : resultado;
  }

  if (fonte === "DESCONTOS") {
    resultado = resultado.filter(produtoTemDesconto);
  }

  if (fonte === "NOVOS") {
    resultado = resultado.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
    );
  }

  if (fonte === "MAIS_VENDIDOS") {
    resultado = resultado.sort((a, b) => b.vendidosTotal - a.vendidosTotal);
  }

  if (fonte === "CATEGORIA") {
    const categoria = categorias[0];

    if (categoria) {
      resultado = resultado.filter(
        (produto) => produto.categoria === categoria,
      );
    }
  }

  if (fonte === "CATEGORIAS_SELECIONADAS") {
    if (categorias.length > 0) {
      resultado = resultado.filter((produto) =>
        categorias.includes(produto.categoria),
      );
    }
  }

  if (fonte === "MANUAL") {
    if (produtosIds.length > 0) {
      const ordem = new Map(produtosIds.map((id, index) => [id, index]));

      resultado = resultado
        .filter((produto) => ordem.has(produto.id))
        .sort(
          (a, b) => Number(ordem.get(a.id) ?? 0) - Number(ordem.get(b.id) ?? 0),
        );
    }
  }

  return resultado.slice(0, limite);
}

function aplicarFiltrosGrade(
  produtos: LojaBuilderProduto[],
  filtros: FiltrosGrade,
) {
  let resultado = [...produtos];

  if (filtros.categoria) {
    resultado = resultado.filter(
      (produto) => produto.categoria === filtros.categoria,
    );
  }

  if (filtros.tamanho) {
    resultado = resultado.filter((produto) =>
      produto.tamanhosDisponiveis?.some(
        (tamanho) =>
          tamanho.tamanhoAnel === filtros.tamanho &&
          Number(tamanho.quantidadeAtual || 0) > 0,
      ),
    );
  }

  if (filtros.desconto === "COM_DESCONTO") {
    resultado = resultado.filter(produtoTemDesconto);
  }

  if (filtros.desconto === "SEM_DESCONTO") {
    resultado = resultado.filter((produto) => !produtoTemDesconto(produto));
  }

  if (filtros.disponibilidade === "DISPONIVEL") {
    resultado = resultado.filter((produto) => produto.estoqueTotal > 0);
  }

  if (filtros.disponibilidade === "SEM_ESTOQUE") {
    resultado = resultado.filter((produto) => produto.estoqueTotal <= 0);
  }

  if (filtros.ordenacao === "MENOR_PRECO") {
    resultado = resultado.sort(
      (a, b) => precoFinalProduto(a) - precoFinalProduto(b),
    );
  }

  if (filtros.ordenacao === "MAIOR_PRECO") {
    resultado = resultado.sort(
      (a, b) => precoFinalProduto(b) - precoFinalProduto(a),
    );
  }

  if (filtros.ordenacao === "AZ") {
    resultado = resultado.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  if (filtros.ordenacao === "ZA") {
    resultado = resultado.sort((a, b) => b.nome.localeCompare(a.nome));
  }

  if (filtros.ordenacao === "MAIS_RECENTES") {
    resultado = resultado.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
    );
  }

  return resultado;
}

function getAlignClass(alinhamento: string) {
  if (alinhamento === "ESQUERDA") return "text-left";
  if (alinhamento === "DIREITA") return "text-right";
  return "text-center";
}

function getTextoFundoClasses(fundo: string) {
  if (fundo === "AZUL_ESCURO") {
    return {
      section: "bg-[#2e7b99]",
      titulo: "text-white",
      texto: "text-white/85",
    };
  }

  if (fundo === "AZUL_CLARO") {
    return {
      section: "bg-[var(--brand-blue-soft)]",
      titulo: "text-slate-950",
      texto: "text-slate-600",
    };
  }

  if (fundo === "ESCURO") {
    return {
      section: "bg-slate-950",
      titulo: "text-white",
      texto: "text-white/75",
    };
  }

  return {
    section: "bg-white",
    titulo: "text-slate-950",
    texto: "text-slate-600",
  };
}

function getEspacamentoClass(espacamento: string) {
  if (espacamento === "PEQUENO") return "py-8";
  if (espacamento === "GRANDE") return "py-20";
  return "py-12";
}

function getLarguraContainerClass(largura: string) {
  if (largura === "ESTREITA") return "max-w-4xl";
  if (largura === "LARGA") return "max-w-7xl";
  if (largura === "TOTAL") return "max-w-none";
  return "max-w-6xl";
}

function getTituloSizeClass(tamanho: string) {
  if (tamanho === "PEQUENO") return "text-2xl md:text-3xl";
  if (tamanho === "GRANDE") return "text-4xl md:text-6xl";
  if (tamanho === "IMPACTO") return "text-5xl md:text-7xl";
  return "text-3xl md:text-5xl";
}

function ProdutoCard({ produto }: { produto: LojaBuilderProduto }) {
  return <ProdutoCardLoja produto={produto} />;
}

function BlocoBanner({ config }: { config: Record<string, unknown> }) {
  const imagemDesktop = getString(config, "imagemDesktop");
  const imagemMobile = getString(config, "imagemMobile") || imagemDesktop;
  const linkUrl = getString(config, "linkUrl");
  const alturaDesktop = getNumber(config, "alturaDesktop", 520);
  const alturaMobile = getNumber(config, "alturaMobile", 320);

  if (!imagemDesktop && !imagemMobile) return null;

  const conteudo = (
    <picture>
      {imagemMobile && (
        <source media="(max-width: 768px)" srcSet={imagemMobile} />
      )}

      <img
        src={imagemDesktop || imagemMobile}
        alt="Banner"
        className="w-full object-cover"
        style={{
          height: `${alturaMobile}px`,
        }}
      />
    </picture>
  );

  return (
    <section
      className="overflow-hidden md:[&_img]:h-[var(--altura-desktop)]"
      style={
        {
          "--altura-desktop": `${alturaDesktop}px`,
        } as CSSProperties
      }
    >
      {linkUrl ? (
        <Link href={linkUrl} className="block">
          {conteudo}
        </Link>
      ) : (
        conteudo
      )}
    </section>
  );
}

function BlocoFaixa({ config }: { config: Record<string, unknown> }) {
  const itens = getStringArray(config, "itens");
  const corFundo = getString(config, "corFundo", "#2e7b99");
  const corTexto = getString(config, "corTexto", "#ffffff");

  if (itens.length === 0) return null;

  return (
    <section
      className="mt-2"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 overflow-x-auto px-5 py-3 text-center sm:px-6 lg:px-8">
        {itens.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex shrink-0 items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            <span className="whitespace-nowrap">{item}</span>

            {index < itens.length - 1 && (
              <span className="h-1 w-1 rounded-full bg-white/70" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BlocoTexto({ config }: { config: Record<string, unknown> }) {
  const titulo = getString(config, "titulo");
  const texto = getString(config, "texto");
  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const fundo = getString(config, "fundo", "BRANCO");
  const espacamento = getString(config, "espacamento", "MEDIO");
  const fundoClasses = getTextoFundoClasses(fundo);

  if (!titulo && !texto) return null;

  return (
    <section className={fundoClasses.section}>
      <div
        className={`${getEspacamentoClass(espacamento)} px-5 sm:px-6 lg:px-8`}
      >
        <div className={`mx-auto max-w-5xl ${getAlignClass(alinhamento)}`}>
          {titulo && (
            <h2
              className={`text-2xl font-semibold tracking-tight md:text-4xl ${fundoClasses.titulo}`}
            >
              {titulo}
            </h2>
          )}

          {texto && (
            <p
              className={`mt-4 whitespace-pre-line text-sm font-medium leading-7 md:text-base ${fundoClasses.texto}`}
            >
              {texto}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BlocoImagemTexto({ config }: { config: Record<string, unknown> }) {
  const titulo = getString(config, "titulo");
  const texto = getString(config, "texto");
  const imagemUrl = getString(config, "imagemUrl");
  const posicaoImagem = getString(config, "posicaoImagem", "ESQUERDA");
  const textoBotao = getString(config, "textoBotao");
  const linkBotao = getString(config, "linkBotao");
  const altura = getNumber(config, "altura", 420);

  if (!titulo && !texto && !imagemUrl) return null;

  const imagem = (
    <div
      className="min-h-[240px] bg-slate-100"
      style={{ height: `${altura}px` }}
    >
      {imagemUrl ? (
        <img
          src={imagemUrl}
          alt={titulo || "Imagem do bloco"}
          className="h-full w-full object-cover"
        />
      ) : null}
    </div>
  );

  const conteudo = (
    <div className="flex items-center px-6 py-8 sm:px-10 lg:px-14">
      <div className="max-w-xl">
        {titulo && (
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {titulo}
          </h2>
        )}

        {texto && (
          <p className="mt-4 whitespace-pre-line text-sm font-medium leading-7 text-slate-600 md:text-base">
            {texto}
          </p>
        )}

        {textoBotao && linkBotao && (
          <Link
            href={linkBotao}
            className="mt-6 inline-flex brand-button px-6 py-3 text-sm font-semibold"
          >
            {textoBotao}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <section className="py-8 lg:py-10">
      <div className="grid w-full bg-slate-50 lg:grid-cols-2">
        {posicaoImagem === "DIREITA" ? (
          <>
            {conteudo}
            {imagem}
          </>
        ) : (
          <>
            {imagem}
            {conteudo}
          </>
        )}
      </div>
    </section>
  );
}

function BlocoCategoriaHero({
  config,
  categoriaAtual,
}: {
  config: Record<string, unknown>;
  categoriaAtual?: LojaBuilderCategoriaAtual | null;
}) {
  if (!categoriaAtual) return null;

  const titulo =
    getString(config, "titulo") ||
    getString(config, "tituloPrefixo") + categoriaAtual.nome ||
    categoriaAtual.nome;

  const subtitulo =
    getString(config, "subtitulo") || categoriaAtual.descricao || "";

  const textoEtiqueta = getString(config, "textoEtiqueta", "Categoria");
  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const fundo = getString(config, "fundo", "CLARO");
  const tamanhoTitulo = getString(config, "tamanhoTitulo", "GRANDE");
  const espacamento = getString(config, "espacamento", "GRANDE");
  const largura = getString(config, "largura", "NORMAL");
  const imagemConfig = getString(config, "imagemUrl");
  const usarImagemCategoria = getBoolean(config, "usarImagemCategoria", false);
  const imagemUrl =
    imagemConfig || (usarImagemCategoria ? categoriaAtual.imagemUrl || "" : "");

  const classes =
    fundo === "ESCURO"
      ? {
          section: "bg-slate-950 text-white",
          etiqueta: "text-white/60",
          titulo: "text-white",
          texto: "text-white/75",
          card: "bg-white/10 ring-white/10",
        }
      : fundo === "AZUL_CLARO"
        ? {
            section: "bg-[var(--brand-blue-soft)] text-slate-950",
            etiqueta: "brand-text",
            titulo: "text-slate-950",
            texto: "text-slate-600",
            card: "bg-white/70 ring-slate-200",
          }
        : {
            section: "bg-white text-slate-950",
            etiqueta: "brand-text",
            titulo: "text-slate-950",
            texto: "text-slate-600",
            card: "bg-slate-50 ring-slate-200",
          };

  if (imagemUrl) {
    return (
      <section className={`relative overflow-hidden ${classes.section}`}>
        <div className="absolute inset-0">
          <img
            src={imagemUrl}
            alt={categoriaAtual.nome}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/45" />
        </div>

        <div
          className={`${getEspacamentoClass(
            espacamento,
          )} relative mx-auto ${getLarguraContainerClass(
            largura,
          )} px-5 sm:px-6 lg:px-8`}
        >
          <div className={`mx-auto max-w-4xl ${getAlignClass(alinhamento)}`}>
            {textoEtiqueta && (
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/75">
                {textoEtiqueta}
              </p>
            )}

            <h1
              className={`mt-4 font-semibold tracking-tight text-white ${getTituloSizeClass(
                tamanhoTitulo,
              )}`}
            >
              {titulo}
            </h1>

            {subtitulo && (
              <p className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-sm font-medium leading-7 text-white/85 md:text-base">
                {subtitulo}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={classes.section}>
      <div
        className={`${getEspacamentoClass(
          espacamento,
        )} mx-auto ${getLarguraContainerClass(largura)} px-5 sm:px-6 lg:px-8`}
      >
        <div
          className={`rounded-[2rem] px-6 py-10 ring-1 md:px-10 ${classes.card} ${getAlignClass(
            alinhamento,
          )}`}
        >
          {textoEtiqueta && (
            <p
              className={`text-xs font-semibold uppercase tracking-[0.26em] ${classes.etiqueta}`}
            >
              {textoEtiqueta}
            </p>
          )}

          <h1
            className={`mt-4 font-semibold tracking-tight ${classes.titulo} ${getTituloSizeClass(
              tamanhoTitulo,
            )}`}
          >
            {titulo}
          </h1>

          {subtitulo && (
            <p
              className={`mx-auto mt-5 max-w-3xl whitespace-pre-line text-sm font-medium leading-7 md:text-base ${classes.texto}`}
            >
              {subtitulo}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BlocoCategoriaDescricao({
  config,
  categoriaAtual,
}: {
  config: Record<string, unknown>;
  categoriaAtual?: LojaBuilderCategoriaAtual | null;
}) {
  if (!categoriaAtual) return null;

  const titulo = getString(config, "titulo", `Sobre ${categoriaAtual.nome}`);
  const texto = getString(config, "texto") || categoriaAtual.descricao || "";
  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const fundo = getString(config, "fundo", "BRANCO");
  const espacamento = getString(config, "espacamento", "MEDIO");
  const fundoClasses = getTextoFundoClasses(fundo);

  if (!titulo && !texto) return null;

  return (
    <section className={fundoClasses.section}>
      <div
        className={`${getEspacamentoClass(espacamento)} px-5 sm:px-6 lg:px-8`}
      >
        <div className={`mx-auto max-w-4xl ${getAlignClass(alinhamento)}`}>
          {titulo && (
            <h2
              className={`text-2xl font-semibold tracking-tight md:text-4xl ${fundoClasses.titulo}`}
            >
              {titulo}
            </h2>
          )}

          {texto && (
            <p
              className={`mt-4 whitespace-pre-line text-sm font-medium leading-7 md:text-base ${fundoClasses.texto}`}
            >
              {texto}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BlocoCategoriaSubcategorias({
  config,
  categoriaAtual,
}: {
  config: Record<string, unknown>;
  categoriaAtual?: LojaBuilderCategoriaAtual | null;
}) {
  if (!categoriaAtual || categoriaAtual.subcategorias.length === 0) return null;

  const titulo = getString(config, "titulo", "Explore por categoria");
  const descricao = getString(
    config,
    "descricao",
    "Veja as subcategorias disponíveis.",
  );
  const colunas = getNumber(config, "colunas", 4);
  const espacamento = getString(config, "espacamento", "MEDIO");

  const gridClass =
    colunas === 2
      ? "sm:grid-cols-2"
      : colunas === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="bg-white">
      <div
        className={`mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 ${getEspacamentoClass(
          espacamento,
        )}`}
      >
        <div className="mb-8 text-center">
          {titulo && (
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {titulo}
            </h2>
          )}

          {descricao && (
            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500 md:text-base">
              {descricao}
            </p>
          )}
        </div>

        <div className={`grid gap-5 ${gridClass}`}>
          {categoriaAtual.subcategorias.map((categoria) => (
            <Link
              key={categoria.id}
              href={categoria.href}
              className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[4/3] bg-slate-100">
                {categoria.imagemUrl ? (
                  <img
                    src={categoria.imagemUrl}
                    alt={categoria.nome}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center brand-bg-soft">
                    <Layers className="h-8 w-8 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-base font-semibold text-slate-950 transition group-hover:text-[var(--brand-blue)]">
                  {categoria.nome}
                </h3>

                {categoria.descricao && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    {categoria.descricao}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BlocoCategoriaCTA({
  config,
  categoriaAtual,
}: {
  config: Record<string, unknown>;
  categoriaAtual?: LojaBuilderCategoriaAtual | null;
}) {
  if (!categoriaAtual) return null;

  const titulo = getString(
    config,
    "titulo",
    `Encontre sua próxima peça em ${categoriaAtual.nome}`,
  );
  const texto = getString(
    config,
    "texto",
    "Explore os produtos disponíveis e escolha seus favoritos.",
  );
  const textoBotao = getString(config, "textoBotao", "Ver produtos");
  const linkBotao = getString(config, "linkBotao", categoriaAtual.href);
  const fundo = getString(config, "fundo", "AZUL_CLARO");

  const fundoClasses = getTextoFundoClasses(fundo);

  return (
    <section className={fundoClasses.section}>
      <div className="mx-auto max-w-5xl px-5 py-12 text-center sm:px-6 lg:px-8">
        <Sparkles className="mx-auto h-6 w-6 brand-text" />

        <h2
          className={`mt-4 text-2xl font-semibold tracking-tight md:text-4xl ${fundoClasses.titulo}`}
        >
          {titulo}
        </h2>

        {texto && (
          <p
            className={`mx-auto mt-4 max-w-2xl whitespace-pre-line text-sm font-medium leading-7 md:text-base ${fundoClasses.texto}`}
          >
            {texto}
          </p>
        )}

        {textoBotao && linkBotao && (
          <Link
            href={linkBotao}
            className="mt-7 inline-flex brand-button px-6 py-3 text-sm font-semibold"
          >
            {textoBotao}
          </Link>
        )}
      </div>
    </section>
  );
}

function CabecalhoProdutos({
  tituloPrincipal,
  descricaoPrincipal,
  titulo,
  descricao,
  alinhamentoPrincipal,
  alinhamentoSecao,
}: {
  tituloPrincipal: string;
  descricaoPrincipal: string;
  titulo: string;
  descricao: string;
  alinhamentoPrincipal: string;
  alinhamentoSecao: string;
}) {
  const alignPrincipalClass = getAlignClass(alinhamentoPrincipal);
  const alignSecaoClass = getAlignClass(alinhamentoSecao);

  function getBlocoTextoWidth(alinhamento: string) {
    if (alinhamento === "ESQUERDA") return "mr-auto";
    if (alinhamento === "DIREITA") return "ml-auto";
    return "mx-auto";
  }

  if (!tituloPrincipal && !descricaoPrincipal && !titulo && !descricao) {
    return null;
  }

  return (
    <div className="mb-8">
      {(tituloPrincipal || descricaoPrincipal) && (
        <div className={`mb-8 ${alignPrincipalClass}`}>
          {tituloPrincipal && (
            <h2
              className={`text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl ${
                alinhamentoPrincipal === "CENTRO" ? "mx-auto max-w-5xl" : ""
              }`}
            >
              {tituloPrincipal}
            </h2>
          )}

          {descricaoPrincipal && (
            <p
              className={`mt-4 max-w-3xl whitespace-pre-line text-sm font-medium leading-7 text-slate-600 md:text-base ${getBlocoTextoWidth(
                alinhamentoPrincipal,
              )}`}
            >
              {descricaoPrincipal}
            </p>
          )}
        </div>
      )}

      {(titulo || descricao) && (
        <div className={alignSecaoClass}>
          {titulo && (
            <h3
              className={`text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl ${
                alinhamentoSecao === "CENTRO" ? "mx-auto max-w-4xl" : ""
              }`}
            >
              {titulo}
            </h3>
          )}

          {descricao && (
            <p
              className={`mt-3 max-w-3xl whitespace-pre-line text-sm font-medium leading-7 text-slate-600 md:text-base ${getBlocoTextoWidth(
                alinhamentoSecao,
              )}`}
            >
              {descricao}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FiltrosProdutosGrade({
  produtos,
  filtrosAtivos,
  filtros,
  setFiltros,
}: {
  produtos: LojaBuilderProduto[];
  filtrosAtivos: Record<string, unknown>;
  filtros: FiltrosGrade;
  setFiltros: Dispatch<SetStateAction<FiltrosGrade>>;
}) {
  const categorias = Array.from(
    new Set(produtos.map((produto) => produto.categoria).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const tamanhos = Array.from(
    new Set(
      produtos.flatMap((produto) =>
        (produto.tamanhosDisponiveis || [])
          .filter((tamanho) => Number(tamanho.quantidadeAtual || 0) > 0)
          .map((tamanho) => tamanho.tamanhoAnel),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));

  if (
    !filtrosAtivos.categoria &&
    !filtrosAtivos.tamanho &&
    !filtrosAtivos.preco &&
    !filtrosAtivos.desconto &&
    !filtrosAtivos.disponibilidade
  ) {
    return null;
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {Boolean(filtrosAtivos.categoria) && (
          <select
            value={filtros.categoria}
            onChange={(event) =>
              setFiltros((current) => ({
                ...current,
                categoria: event.target.value,
              }))
            }
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
          >
            <option value="">Todas as categorias</option>

            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        )}

        {Boolean(filtrosAtivos.tamanho) && tamanhos.length > 0 && (
          <select
            value={filtros.tamanho}
            onChange={(event) =>
              setFiltros((current) => ({
                ...current,
                tamanho: event.target.value,
              }))
            }
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
          >
            <option value="">Todos os tamanhos</option>

            {tamanhos.map((tamanho) => (
              <option key={tamanho} value={tamanho}>
                {tamanho}
              </option>
            ))}
          </select>
        )}

        {Boolean(filtrosAtivos.preco) && (
          <select
            value={filtros.ordenacao}
            onChange={(event) =>
              setFiltros((current) => ({
                ...current,
                ordenacao: event.target.value,
              }))
            }
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
          >
            <option value="">Ordenar</option>
            <option value="MAIS_RECENTES">Mais recentes</option>
            <option value="MENOR_PRECO">Preço: menor para maior</option>
            <option value="MAIOR_PRECO">Preço: maior para menor</option>
            <option value="AZ">A-Z</option>
            <option value="ZA">Z-A</option>
          </select>
        )}

        {Boolean(filtrosAtivos.desconto) && (
          <select
            value={filtros.desconto}
            onChange={(event) =>
              setFiltros((current) => ({
                ...current,
                desconto: event.target.value,
              }))
            }
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
          >
            <option value="">Todos</option>
            <option value="COM_DESCONTO">Com desconto</option>
            <option value="SEM_DESCONTO">Sem desconto</option>
          </select>
        )}

        {Boolean(filtrosAtivos.disponibilidade) && (
          <select
            value={filtros.disponibilidade}
            onChange={(event) =>
              setFiltros((current) => ({
                ...current,
                disponibilidade: event.target.value,
              }))
            }
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
          >
            <option value="">Disponibilidade</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="SEM_ESTOQUE">Sem estoque</option>
          </select>
        )}
      </div>
    </div>
  );
}

function ProdutosCarrossel({
  tituloPrincipal,
  descricaoPrincipal,
  titulo,
  descricao,
  alinhamentoPrincipal,
  alinhamentoSecao,
  produtos,
  mostrarSetas,
  listaCompleta,
}: {
  tituloPrincipal: string;
  descricaoPrincipal: string;
  titulo: string;
  descricao: string;
  alinhamentoPrincipal: string;
  alinhamentoSecao: string;
  produtos: LojaBuilderProduto[];
  mostrarSetas: boolean;
  listaCompleta: boolean;
}) {
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [mostrarTodos, setMostrarTodos] = useState(listaCompleta);
  const itensPorPagina = 4;
  const totalPaginas = 1;

  const produtosPagina = useMemo(() => {
    return mostrarTodos || listaCompleta
      ? produtos
      : produtos.slice(0, itensPorPagina);
  }, [listaCompleta, mostrarTodos, produtos]);

  if (produtos.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <CabecalhoProdutos
        tituloPrincipal={tituloPrincipal}
        descricaoPrincipal={descricaoPrincipal}
        titulo={titulo}
        descricao={descricao}
        alinhamentoPrincipal={alinhamentoPrincipal}
        alinhamentoSecao={alinhamentoSecao}
      />

      <div className="relative">
        {mostrarSetas && totalPaginas > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setPaginaAtual((current) => Math.max(current - 1, 0))
              }
              disabled={paginaAtual === 0}
              className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center border brand-border bg-white brand-text shadow-lg transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)] disabled:pointer-events-none disabled:opacity-30 lg:flex"
              aria-label="Produtos anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setPaginaAtual((current) =>
                  Math.min(current + 1, totalPaginas - 1),
                )
              }
              disabled={paginaAtual >= totalPaginas - 1}
              className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center border brand-border bg-white brand-text shadow-lg transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)] disabled:pointer-events-none disabled:opacity-30 lg:flex"
              aria-label="Próximos produtos"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {produtosPagina.map((produto) => (
            <ProdutoCard key={produto.id} produto={produto} />
          ))}
        </div>

        {mostrarSetas && totalPaginas > 1 && (
          <div className="mt-6 flex justify-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() =>
                setPaginaAtual((current) => Math.max(current - 1, 0))
              }
              disabled={paginaAtual === 0}
              className="flex h-11 w-11 items-center justify-center border brand-border bg-white brand-text shadow-sm transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)] disabled:pointer-events-none disabled:opacity-30"
              aria-label="Produtos anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setPaginaAtual((current) =>
                  Math.min(current + 1, totalPaginas - 1),
                )
              }
              disabled={paginaAtual >= totalPaginas - 1}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] disabled:pointer-events-none disabled:opacity-30"
              aria-label="Próximos produtos"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: totalPaginas }).map((_, index) => (
            <button
              key={`carrossel-dot-${index}`}
              type="button"
              onClick={() => setPaginaAtual(index)}
              className={`h-2.5 rounded-full transition ${
                index === paginaAtual
                  ? "w-8 bg-[var(--brand-blue)]"
                  : "w-2.5 bg-slate-300"
              }`}
              aria-label={`Ir para página ${index + 1} do carrossel`}
            />
          ))}
        </div>
      )}

      {!listaCompleta && !mostrarTodos && produtos.length > itensPorPagina ? (
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
    </section>
  );
}

function ProdutosGrade({
  tituloPrincipal,
  descricaoPrincipal,
  titulo,
  descricao,
  alinhamentoPrincipal,
  alinhamentoSecao,
  produtos,
  produtosPorLinha,
  linhasPorPagina,
  paginacao,
  mostrarFiltros,
  filtrosAtivos,
  listaCompleta,
}: {
  tituloPrincipal: string;
  descricaoPrincipal: string;
  titulo: string;
  descricao: string;
  alinhamentoPrincipal: string;
  alinhamentoSecao: string;
  produtos: LojaBuilderProduto[];
  produtosPorLinha: number;
  linhasPorPagina: number;
  paginacao: string;
  mostrarFiltros: boolean;
  filtrosAtivos: Record<string, unknown>;
  listaCompleta: boolean;
}) {
  const itensPorPagina = listaCompleta
    ? Math.max(1, produtos.length)
    : Math.min(4, Math.max(1, produtosPorLinha * linhasPorPagina));
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(itensPorPagina);
  const [filtros, setFiltros] = useState<FiltrosGrade>({
    categoria: "",
    tamanho: "",
    ordenacao: "",
    desconto: "",
    disponibilidade: "",
  });

  const produtosFiltrados = mostrarFiltros
    ? aplicarFiltrosGrade(produtos, filtros)
    : produtos;

  const totalPaginas = listaCompleta
    ? 1
    : Math.max(1, Math.ceil(produtosFiltrados.length / itensPorPagina));

  const produtosPagina = listaCompleta
    ? produtosFiltrados
    : paginacao === "CARREGAR_MAIS"
      ? produtosFiltrados.slice(0, quantidadeVisivel)
      : produtosFiltrados.slice(
          paginaAtual * itensPorPagina,
          paginaAtual * itensPorPagina + itensPorPagina,
        );

  if (produtos.length === 0) return null;

  const gridClass =
    produtosPorLinha === 2
      ? "sm:grid-cols-2"
      : produtosPorLinha === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <CabecalhoProdutos
        tituloPrincipal={tituloPrincipal}
        descricaoPrincipal={descricaoPrincipal}
        titulo={titulo}
        descricao={descricao}
        alinhamentoPrincipal={alinhamentoPrincipal}
        alinhamentoSecao={alinhamentoSecao}
      />

      {mostrarFiltros && (
        <FiltrosProdutosGrade
          produtos={produtos}
          filtrosAtivos={filtrosAtivos}
          filtros={filtros}
          setFiltros={(value) => {
            setPaginaAtual(0);
            setQuantidadeVisivel(itensPorPagina);
            setFiltros(value);
          }}
        />
      )}

      {produtosPagina.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm font-medium text-slate-500">
          Nenhum produto encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className={`grid gap-6 ${gridClass}`}>
          {produtosPagina.map((produto) => (
            <ProdutoCard key={produto.id} produto={produto} />
          ))}
        </div>
      )}

      {paginacao === "CARREGAR_MAIS"
        ? !listaCompleta && produtosPagina.length < produtosFiltrados.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setQuantidadeVisivel((current) => current + itensPorPagina)
                }
                className="brand-button px-6 py-3 text-sm font-semibold"
              >
                Ver mais
              </button>
            </div>
          )
        : !listaCompleta && totalPaginas > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: totalPaginas }).map((_, index) => (
                <button
                  key={`pagina-${index}`}
                  type="button"
                  onClick={() => setPaginaAtual(index)}
                  className={`h-10 min-w-10 border px-3 text-sm font-semibold transition ${
                    paginaAtual === index
                      ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
    </section>
  );
}

function BlocoProdutos({
  config,
  produtos,
  categoriaAtual,
}: {
  config: Record<string, unknown>;
  produtos: LojaBuilderProduto[];
  categoriaAtual?: LojaBuilderCategoriaAtual | null;
}) {
  const tituloPrincipal = getString(config, "tituloPrincipal");
  const descricaoPrincipal = getString(config, "descricaoPrincipal");
  const titulo = getString(
    config,
    "titulo",
    categoriaAtual ? `Produtos em ${categoriaAtual.nome}` : "Produtos",
  );
  const descricao = getString(config, "descricao");
  const alinhamentoPrincipal = getString(
    config,
    "alinhamentoPrincipal",
    getString(config, "alinhamento", "CENTRO"),
  );
  const alinhamentoSecao = getString(config, "alinhamento", "ESQUERDA");
  const modo = getString(config, "modo", "CARROSSEL");
  const mostrarSetas = getBoolean(config, "mostrarSetas", true);
  const mostrarFiltros = getBoolean(config, "mostrarFiltros", false);
  const filtrosAtivos = getObject(config, "filtros");
  const produtosDoBloco = filtrarProdutosPorConfig(
    produtos,
    config,
    categoriaAtual,
  );

  if (modo === "GRADE") {
    return (
      <ProdutosGrade
        tituloPrincipal={tituloPrincipal}
        descricaoPrincipal={descricaoPrincipal}
        titulo={titulo}
        descricao={descricao}
        alinhamentoPrincipal={alinhamentoPrincipal}
        alinhamentoSecao={alinhamentoSecao}
        produtos={produtosDoBloco}
        produtosPorLinha={getNumber(config, "produtosPorLinha", 4)}
        linhasPorPagina={getNumber(config, "linhasPorPagina", 2)}
        paginacao={getString(config, "paginacao", "NUMEROS")}
        mostrarFiltros={mostrarFiltros}
        filtrosAtivos={filtrosAtivos}
        listaCompleta={Boolean(categoriaAtual)}
      />
    );
  }

  return (
    <ProdutosCarrossel
      tituloPrincipal={tituloPrincipal}
      descricaoPrincipal={descricaoPrincipal}
      titulo={titulo}
      descricao={descricao}
      alinhamentoPrincipal={alinhamentoPrincipal}
      alinhamentoSecao={alinhamentoSecao}
      produtos={produtosDoBloco}
      mostrarSetas={mostrarSetas}
      listaCompleta={Boolean(categoriaAtual)}
    />
  );
}

function RodapeLoja({
  menus,
  configuracaoMenuRodape,
}: {
  menus: LojaBuilderMenu[];
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
}) {
  return (
    <RodapePublicoLoja
      menus={menus}
      configuracaoMenuRodape={configuracaoMenuRodape}
    />
  );
}

export default function LojaPaginaBuilderClient({
  pagina,
  blocos,
  produtos,
  menus,
  categoriasMenu = [],
  categoriaAtual = null,
  configuracaoMenuRodape,
}: {
  pagina: LojaBuilderPagina;
  blocos: LojaBuilderBloco[];
  produtos: LojaBuilderProduto[];
  menus: LojaBuilderMenu[];
  categoriasMenu?: CategoriaMenuPublicoItem[];
  categoriaAtual?: LojaBuilderCategoriaAtual | null;
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
}) {
  const menusPublicos: MenuPublicoItem[] = menus.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: menu.href,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));

  return (
    <div className="stella-storefront-render min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menusPublicos}
        categorias={categoriasMenu}
        produtos={produtos}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
      />

      <main>
        {blocos.length === 0 ? (
          <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-6 lg:px-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              {pagina.titulo}
            </h1>

            <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
              Esta página ainda não possui blocos ativos.
            </p>
          </section>
        ) : (
          blocos.map((bloco) => {
            const config = asConfig(bloco.configJson);

            if (isBlocoVisualPublico(bloco.tipo)) {
              return (
                <BlocoPublicoRenderer
                  key={bloco.id}
                  bloco={bloco}
                  produtos={produtos}
                  listaCompletaProdutos={Boolean(categoriaAtual)}
                />
              );
            }

            if (bloco.tipo === "BANNER") {
              return <BlocoBanner key={bloco.id} config={config} />;
            }

            if (bloco.tipo === "FAIXA_DIFERENCIAIS") {
              return <BlocoFaixa key={bloco.id} config={config} />;
            }

            if (bloco.tipo === "TEXTO") {
              return <BlocoTexto key={bloco.id} config={config} />;
            }

            if (bloco.tipo === "IMAGEM_TEXTO") {
              return <BlocoImagemTexto key={bloco.id} config={config} />;
            }

            if (bloco.tipo === "PRODUTOS") {
              return (
                <BlocoProdutos
                  key={bloco.id}
                  config={config}
                  produtos={produtos}
                  categoriaAtual={categoriaAtual}
                />
              );
            }
            if (bloco.tipo === "RECOMENDACOES") {
              return (
                <BlocoProdutos
                  key={bloco.id}
                  config={{
                    titulo: getString(
                      config,
                      "titulo",
                      "Você também pode gostar",
                    ),
                    descricao: getString(
                      config,
                      "descricao",
                      "Produtos selecionados para complementar sua escolha.",
                    ),
                    tituloPrincipal: getString(config, "tituloPrincipal"),
                    descricaoPrincipal: getString(config, "descricaoPrincipal"),
                    alinhamentoPrincipal: getString(
                      config,
                      "alinhamentoPrincipal",
                      "CENTRO",
                    ),
                    alinhamento: getString(config, "alinhamento", "ESQUERDA"),
                    modo: getString(config, "modo", "CARROSSEL"),
                    fonte: getString(config, "fonte", "MAIS_VENDIDOS"),
                    categorias: getStringArray(config, "categorias"),
                    produtosIds: getStringArray(config, "produtosIds"),
                    limite: getNumber(config, "limite", 8),
                    mostrarSetas: getBoolean(config, "mostrarSetas", true),
                    produtosPorLinha: getNumber(config, "produtosPorLinha", 4),
                    linhasPorPagina: getNumber(config, "linhasPorPagina", 2),
                    paginacao: getString(config, "paginacao", "NUMEROS"),
                    mostrarFiltros: getBoolean(config, "mostrarFiltros", false),
                    filtros: getObject(config, "filtros"),
                  }}
                  produtos={produtos}
                  categoriaAtual={categoriaAtual}
                />
              );
            }

            if (bloco.tipo === "CATEGORIA_HERO") {
              return (
                <BlocoCategoriaHero
                  key={bloco.id}
                  config={config}
                  categoriaAtual={categoriaAtual}
                />
              );
            }

            if (bloco.tipo === "CATEGORIA_DESCRICAO") {
              return (
                <BlocoCategoriaDescricao
                  key={bloco.id}
                  config={config}
                  categoriaAtual={categoriaAtual}
                />
              );
            }

            if (bloco.tipo === "CATEGORIA_SUBCATEGORIAS") {
              return (
                <BlocoCategoriaSubcategorias
                  key={bloco.id}
                  config={config}
                  categoriaAtual={categoriaAtual}
                />
              );
            }

            if (bloco.tipo === "CATEGORIA_PRODUTOS") {
              return (
                <BlocoProdutos
                  key={bloco.id}
                  config={{
                    ...config,
                    fonte: "CATEGORIA_ATUAL",
                    titulo:
                      getString(config, "titulo") ||
                      `Produtos em ${categoriaAtual?.nome || pagina.titulo}`,
                  }}
                  produtos={produtos}
                  categoriaAtual={categoriaAtual}
                />
              );
            }

            if (bloco.tipo === "CATEGORIA_CTA") {
              return (
                <BlocoCategoriaCTA
                  key={bloco.id}
                  config={config}
                  categoriaAtual={categoriaAtual}
                />
              );
            }
            if (bloco.tipo === "FAQ") {
              return <LojaFaqBlock key={bloco.id} config={config} />;
            }
            if (bloco.tipo === "FORMULARIO") {
              return (
                <LojaFormularioBlock
                  key={bloco.id}
                  config={config}
                  pagina={pagina}
                  bloco={{
                    id: bloco.id,
                    tipo: bloco.tipo,
                    titulo: bloco.titulo,
                  }}
                />
              );
            }

            return null;
          })
        )}
      </main>

      <RodapeLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
