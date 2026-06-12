"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
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
  revealDelayMs?: number;
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

export default function ProdutoCardLoja({
  produto,
  exibirPreco = true,
  exibirBotao = false,
  exibirSeloDesconto = true,
  textoBotao = "Comprar",
  href,
  modoPreview = false,
  revealDelayMs = 0,
}: ProdutoCardLojaProps) {
  const [favorito, setFavorito] = useState(false);
  const [touchPreview, setTouchPreview] = useState(false);
  const [revelado, setRevelado] = useState(modoPreview);
  const articleRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDraggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setFavorito(produtoEstaFavorito(produto.id));
  }, [produto.id]);

  useEffect(() => {
    if (modoPreview) {
      setRevelado(true);
      return;
    }

    const element = articleRef.current;
    if (!element) {
      return;
    }

    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setRevelado(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setRevelado(true);
        observer.unobserve(element);
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -36px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [modoPreview]);

  useEffect(() => {
    return () => {
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

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

    if (modoPreview) {
      return;
    }

    const proximo = alternarFavoritoId(produto.id);
    setFavorito(proximo);
  }

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
      suppressClickTimeoutRef.current = null;
    }

    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    touchDraggedRef.current = false;
    suppressClickRef.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch" || !touchStartRef.current) {
      return;
    }

    const deltaX = event.clientX - touchStartRef.current.x;
    const deltaY = event.clientY - touchStartRef.current.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < 9) {
      return;
    }

    touchDraggedRef.current = true;
    suppressClickRef.current = true;
    setTouchPreview(true);
  }

  function finalizarPointerTouch(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    const houveArraste = touchDraggedRef.current;

    touchStartRef.current = null;
    touchDraggedRef.current = false;
    setTouchPreview(false);

    if (!houveArraste) {
      suppressClickRef.current = false;
      return;
    }

    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, 120);
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    suppressClickRef.current = false;
  }

  const semEstoque = produto.estoqueTotal <= 0;
  const desconto = percentualDesconto(produto);
  const produtoHref = href || `/loja/produto/${produto.id}`;
  const imagemOverlayUrl = produto.imagemHoverUrl || produto.imagemUrl;
  const cardClass = [
    "group stella-product-card relative h-full overflow-hidden bg-white p-2 active:bg-slate-50",
    revelado ? "is-visible" : "",
    touchPreview ? "is-touch-preview" : "",
    semEstoque ? "stella-product-card-out-of-stock" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const conteudoNormal = (
    <div className="stella-product-normal relative z-10 flex h-full flex-col">
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
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

        {exibirSeloDesconto && desconto !== null ? (
          <div className="pointer-events-none absolute left-2 top-2 z-10 brand-bg px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
            -{desconto}%
          </div>
        ) : null}

        {semEstoque ? (
          <div
            className={`pointer-events-none absolute left-2 z-10 bg-white/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-700 ${
              desconto !== null ? "top-10" : "top-2"
            }`}
          >
            Sem estoque
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-black/5" />
      </div>

      <div className="flex min-h-[88px] flex-col bg-white px-1 pb-1 pt-3">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-slate-900">
          {produto.nome}
        </h3>

        {exibirPreco ? (
          <div className="mt-auto">
            <ProdutoPreco produto={produto} />
          </div>
        ) : null}

        {exibirBotao && textoBotao ? (
          <span className="mt-3 inline-flex min-h-9 w-full items-center justify-center border border-slate-950 bg-slate-950 px-4 text-xs font-semibold text-white">
            {textoBotao}
          </span>
        ) : null}
      </div>
    </div>
  );

  const overlayHover = (
    <div className="stella-product-hover-overlay pointer-events-none absolute inset-0 z-20 overflow-hidden bg-slate-100">
      {imagemOverlayUrl ? (
        <img
          src={imagemOverlayUrl}
          alt=""
          aria-hidden="true"
          className="stella-product-hover-image h-full w-full object-cover object-center"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center text-xs font-medium text-slate-400">
          Sem imagem
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-black/10" />
    </div>
  );

  const favoritoButton = (
    <button
      type="button"
      onClick={handleToggleFavorito}
      aria-label={
        favorito
          ? `Remover ${produto.nome} dos favoritos`
          : `Adicionar ${produto.nome} aos favoritos`
      }
      aria-pressed={favorito}
      className="absolute right-2 top-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white/95 text-slate-500 shadow-sm backdrop-blur transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] sm:h-8 sm:w-8"
    >
      <Heart
        className={`h-4 w-4 ${
          favorito ? "fill-[var(--brand-blue)] text-[var(--brand-blue)]" : ""
        }`}
        fill={favorito ? "currentColor" : "none"}
      />
    </button>
  );

  if (modoPreview) {
    return (
      <article
        ref={articleRef}
        className={cardClass}
        style={{ transitionDelay: revelado ? `${revealDelayMs}ms` : "0ms" }}
      >
        <div className="relative block h-full">
          {conteudoNormal}
          {overlayHover}
        </div>
        {favoritoButton}
      </article>
    );
  }

  return (
    <article
      ref={articleRef}
      className={cardClass}
      style={{ transitionDelay: revelado ? `${revealDelayMs}ms` : "0ms" }}
    >
      <Link
        href={produtoHref}
        className="relative block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        aria-label={`Ver produto ${produto.nome}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finalizarPointerTouch}
        onPointerCancel={finalizarPointerTouch}
        onClick={handleLinkClick}
      >
        {conteudoNormal}
        {overlayHover}
      </Link>

      {favoritoButton}
    </article>
  );
}
