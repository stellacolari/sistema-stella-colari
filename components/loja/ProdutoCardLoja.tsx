import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import {
  alternarFavoritoId,
  FAVORITOS_UPDATED_EVENT,
  produtoEstaFavorito,
} from "./favoritos";

export type ProdutoCardLojaItem = {
  id: string;
  nome: string;
  imagemUrl?: string | null;
  imagemHoverUrl?: string | null;
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoqueTotal: number;
};

type ProdutoCardLojaProps = {
  produto: ProdutoCardLojaItem;
  exibirPreco?: boolean;
  exibirBotao?: boolean;
  exibirSeloDesconto?: boolean;
  textoBotao?: string;
  href?: string;
  modoPreview?: boolean;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function produtoTemDesconto(produto: ProdutoCardLojaItem) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function percentualDesconto(produto: ProdutoCardLojaItem) {
  if (!produtoTemDesconto(produto) || produto.precoPromocional === null) {
    return null;
  }

  return Math.round(
    ((produto.precoVenda - produto.precoPromocional) / produto.precoVenda) *
      100,
  );
}

function ProdutoPreco({ produto }: { produto: ProdutoCardLojaItem }) {
  const temDesconto = produtoTemDesconto(produto);

  if (!temDesconto || produto.precoPromocional === null) {
    return (
      <p className="mt-2 text-sm font-medium tracking-wide text-slate-700">
        {moeda(produto.precoVenda)}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-xs font-normal tracking-wide text-slate-400 line-through">
        {moeda(produto.precoVenda)}
      </span>

      <span className="text-sm font-semibold tracking-wide brand-text">
        {moeda(produto.precoPromocional)}
      </span>
    </div>
  );
}

function ProdutoImagem({ produto }: { produto: ProdutoCardLojaItem }) {
  const hasHover = Boolean(produto.imagemHoverUrl);

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
      <div
        className={hasHover ? "stella-product-hover-primary h-full" : "h-full"}
      >
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center text-xs font-medium text-slate-400">
            Sem imagem
          </div>
        )}
      </div>

      {hasHover && produto.imagemHoverUrl ? (
        <div className="stella-product-hover-secondary absolute inset-0 overflow-hidden bg-white">
          <img
            src={produto.imagemHoverUrl}
            alt={produto.nome}
            className="pointer-events-none h-full w-full object-cover object-center"
          />

          <div className="pointer-events-none absolute inset-0 bg-black/5" />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-black/5" />
    </div>
  );
}

export default function ProdutoCardLoja({
  produto,
  exibirPreco = true,
  exibirBotao = false,
  exibirSeloDesconto = true,
  textoBotao = "Comprar",
  href,
  modoPreview = false,
}: ProdutoCardLojaProps) {
  const [favorito, setFavorito] = useState(false);
  const [mostrarHoverMobile, setMostrarHoverMobile] = useState(false);

  useEffect(() => {
    setFavorito(produtoEstaFavorito(produto.id));
  }, [produto.id]);

  useEffect(() => {
    function atualizarFavorito() {
      setFavorito(produtoEstaFavorito(produto.id));
    }

    window.addEventListener(FAVORITOS_UPDATED_EVENT, atualizarFavorito);
    window.addEventListener("storage", atualizarFavorito);

    return () => {
      window.removeEventListener(FAVORITOS_UPDATED_EVENT, atualizarFavorito);
      window.removeEventListener("storage", atualizarFavorito);
    };
  }, [produto.id]);

  function handleToggleFavorito(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();

    const proximo = alternarFavoritoId(produto.id);
    setFavorito(proximo);
  }

  const semEstoque = produto.estoqueTotal <= 0;
  const desconto = percentualDesconto(produto);
  const produtoHref = href || `/loja/produto/${produto.id}`;
  const cardClass = `group stella-product-card relative block h-full overflow-hidden bg-white p-2 transition-colors duration-200 active:bg-slate-50 ${
    semEstoque ? "opacity-75" : ""
  } ${mostrarHoverMobile ? "hover-mobile" : ""}`;
  const conteudo = (
    <>
      <div className="relative overflow-hidden">
        <ProdutoImagem produto={produto} />

        <button
          type="button"
          onClick={handleToggleFavorito}
          aria-label={
            favorito
              ? `Remover ${produto.nome} dos favoritos`
              : `Adicionar ${produto.nome} aos favoritos`
          }
          aria-pressed={favorito}
          className="absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-900 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
        >
          <Heart
            className={`h-5 w-5 ${favorito ? "fill-[var(--brand-blue)] text-[var(--brand-blue)]" : "text-slate-400"}`}
            fill="currentColor"
          />
        </button>

        {exibirSeloDesconto && desconto !== null ? (
          <div className="pointer-events-none absolute right-3 top-3 z-10 brand-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]">
            -{desconto}%
          </div>
        ) : null}

        {semEstoque ? (
          <div className="pointer-events-none absolute left-3 top-3 z-10 bg-white/95 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-700">
            Sem estoque
          </div>
        ) : null}
      </div>

      <div className="stella-product-hover-surface relative z-10 flex min-h-[88px] flex-col bg-white px-1 pb-1 pt-3">
        <h3 className="stella-product-hover-title line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-slate-900">
          {produto.nome}
        </h3>

        {exibirPreco ? (
          <div className="mt-auto">
            <ProdutoPreco produto={produto} />
          </div>
        ) : null}

        {exibirBotao && textoBotao ? (
          <span className="stella-product-hover-button mt-3 inline-flex min-h-9 w-full items-center justify-center border border-slate-950 bg-slate-950 px-4 text-xs font-semibold text-white">
            {textoBotao}
          </span>
        ) : null}
      </div>
    </>
  );

  if (modoPreview) {
    return <article className={cardClass}>{conteudo}</article>;
  }

  return (
    <article
      className={cardClass}
      onTouchStart={() => setMostrarHoverMobile(true)}
      onTouchEnd={() => setMostrarHoverMobile(false)}
      onTouchCancel={() => setMostrarHoverMobile(false)}
    >
      <Link
        href={produtoHref}
        className="absolute inset-0 z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        aria-label={`Ver produto ${produto.nome}`}
      />
      {conteudo}
    </article>
  );
}
