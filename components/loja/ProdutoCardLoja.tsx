"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
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

type TouchPreviewSubscriber = (activeCardId: string | null) => void;

const touchPreviewSubscribers = new Set<TouchPreviewSubscriber>();
let touchTrackerInstalled = false;
let activeTouchCardId: string | null = null;
let pendingTouchCardId: string | null = null;
let touchMoveFrameId: number | null = null;
let clearTouchPreviewTimerId: number | null = null;

function notifyTouchPreviewSubscribers(cardId: string | null) {
  if (activeTouchCardId === cardId) {
    return;
  }

  activeTouchCardId = cardId;
  touchPreviewSubscribers.forEach((subscriber) => subscriber(cardId));
}

function scheduleTouchPreviewUpdate(cardId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  pendingTouchCardId = cardId;

  if (touchMoveFrameId !== null) {
    return;
  }

  touchMoveFrameId = window.requestAnimationFrame(() => {
    touchMoveFrameId = null;
    notifyTouchPreviewSubscribers(pendingTouchCardId);
    pendingTouchCardId = null;
  });
}

function clearTouchPreviewAfterDelay() {
  if (typeof window === "undefined") {
    return;
  }

  if (clearTouchPreviewTimerId !== null) {
    window.clearTimeout(clearTouchPreviewTimerId);
  }

  clearTouchPreviewTimerId = window.setTimeout(() => {
    clearTouchPreviewTimerId = null;
    scheduleTouchPreviewUpdate(null);
  }, 100);
}

function handleDocumentTouchMove(event: TouchEvent) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  if (clearTouchPreviewTimerId !== null) {
    window.clearTimeout(clearTouchPreviewTimerId);
    clearTouchPreviewTimerId = null;
  }

  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  const cardElement = element?.closest("[data-stella-product-card-id]") as
    | HTMLElement
    | null;

  scheduleTouchPreviewUpdate(
    cardElement?.dataset.stellaProductCardId ?? null,
  );
}

function installGlobalTouchPreviewTracker() {
  if (
    touchTrackerInstalled ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) {
    return;
  }

  document.addEventListener("touchmove", handleDocumentTouchMove, {
    passive: true,
    capture: true,
  });
  document.addEventListener("touchend", clearTouchPreviewAfterDelay, {
    passive: true,
    capture: true,
  });
  document.addEventListener("touchcancel", clearTouchPreviewAfterDelay, {
    passive: true,
    capture: true,
  });
  touchTrackerInstalled = true;
}

function uninstallGlobalTouchPreviewTracker() {
  if (!touchTrackerInstalled || touchPreviewSubscribers.size > 0) {
    return;
  }

  document.removeEventListener("touchmove", handleDocumentTouchMove, true);
  document.removeEventListener("touchend", clearTouchPreviewAfterDelay, true);
  document.removeEventListener("touchcancel", clearTouchPreviewAfterDelay, true);

  if (touchMoveFrameId !== null) {
    window.cancelAnimationFrame(touchMoveFrameId);
    touchMoveFrameId = null;
  }

  if (clearTouchPreviewTimerId !== null) {
    window.clearTimeout(clearTouchPreviewTimerId);
    clearTouchPreviewTimerId = null;
  }

  pendingTouchCardId = null;
  activeTouchCardId = null;
  touchTrackerInstalled = false;
}

function subscribeGlobalTouchPreview(
  subscriber: TouchPreviewSubscriber,
): () => void {
  installGlobalTouchPreviewTracker();
  touchPreviewSubscribers.add(subscriber);
  subscriber(activeTouchCardId);

  return () => {
    touchPreviewSubscribers.delete(subscriber);
    uninstallGlobalTouchPreviewTracker();
  };
}

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
  const [globalTouchPreview, setGlobalTouchPreview] = useState(false);
  const [revelado, setRevelado] = useState(modoPreview);
  const articleRef = useRef<HTMLElement | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setFavorito(produtoEstaFavorito(produto.id));
  }, [produto.id]);

  useEffect(() => {
    return subscribeGlobalTouchPreview((activeCardId) => {
      setGlobalTouchPreview(activeCardId === produto.id);
    });
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
        threshold: 0.01,
        rootMargin: "160px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [modoPreview]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
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

  function limparTimerReset() {
    if (resetTimerRef.current === null) {
      return;
    }

    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }

  function limparInteracaoTouch() {
    limparTimerReset();
    startPointRef.current = null;
    movedRef.current = false;
    suppressClickRef.current = false;
    setTouchPreview(false);
  }

  function bloquearDragImagem(event: DragEvent<HTMLImageElement>) {
    event.preventDefault();
  }

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    limparTimerReset();

    startPointRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    movedRef.current = false;
    suppressClickRef.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch" || !startPointRef.current) {
      return;
    }

    const deltaX = event.clientX - startPointRef.current.x;
    const deltaY = event.clientY - startPointRef.current.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance <= 12) {
      return;
    }

    movedRef.current = true;
    suppressClickRef.current = true;
    setTouchPreview(true);
  }

  function handlePointerUp(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    const houveArraste = movedRef.current;

    startPointRef.current = null;
    movedRef.current = false;
    setTouchPreview(false);

    if (!houveArraste) {
      suppressClickRef.current = false;
      return;
    }

    limparTimerReset();
    resetTimerRef.current = window.setTimeout(() => {
      startPointRef.current = null;
      movedRef.current = false;
      suppressClickRef.current = false;
      setTouchPreview(false);
      resetTimerRef.current = null;
    }, 350);
  }

  function handlePointerCancel(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    limparInteracaoTouch();
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    limparInteracaoTouch();
  }

  const semEstoque = produto.estoqueTotal <= 0;
  const desconto = percentualDesconto(produto);
  const produtoHref = href || `/loja/produto/${produto.id}`;
  const imagemOverlayUrl = produto.imagemHoverUrl || produto.imagemUrl;
  const previewTouchAtivo = touchPreview || globalTouchPreview;
  const cardClass = [
    "group stella-product-card relative h-full overflow-hidden bg-white p-2",
    revelado ? "is-visible" : "",
    semEstoque ? "stella-product-card-out-of-stock" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const conteudoNormal = (
    <div className="stella-product-normal-content relative z-10 flex h-full flex-col">
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            draggable={false}
            onDragStart={bloquearDragImagem}
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
          draggable={false}
          onDragStart={bloquearDragImagem}
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
      className="absolute right-2 top-2 z-30 inline-flex h-8 w-8 items-center justify-center text-slate-700 transition hover:text-[var(--brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]"
    >
      <Heart
        className={`h-5 w-5 drop-shadow-sm ${
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
        data-stella-product-card-id={produto.id}
        data-touch-preview={previewTouchAtivo ? "true" : "false"}
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
      data-stella-product-card-id={produto.id}
      data-touch-preview={previewTouchAtivo ? "true" : "false"}
      style={{ transitionDelay: revelado ? `${revealDelayMs}ms` : "0ms" }}
    >
      <Link
        href={produtoHref}
        className="relative block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        aria-label={`Ver produto ${produto.nome}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleLinkClick}
      >
        {conteudoNormal}
        {overlayHover}
      </Link>

      {favoritoButton}
    </article>
  );
}
