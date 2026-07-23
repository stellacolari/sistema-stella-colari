"use client";

import Image from "next/image";
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
import {
  registrarCliqueResultadoBusca,
  registrarFavoritoProduto,
} from "@/lib/loja/eventos-client";
import { imagemPublicaPodeSerOtimizada } from "@/lib/loja/imagem-publica";
import styles from "./ProdutoCardLoja.module.css";

export type ProdutoCardLojaItem = {
  id: string;
  nome: string;
  imagemUrl?: string | null;
  imagemHoverUrl?: string | null;
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  disponivel: boolean;
  categoriaIds?: string[];
  criadoEm?: string;
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
  imageLoading?: "eager" | "lazy";
  imageSizes?: string;
  exibirImagemHover?: boolean;
  trackingOrigem?: string;
  trackingMetadata?: Record<string, unknown>;
  trackingResultadoBusca?: {
    termoBusca: string;
    posicao?: number;
  };
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
      <p className={styles.price}>
        {moeda(produto.precoVenda)}
      </p>
    );
  }

  return (
    <div className={styles.salePriceRow}>
      <span className={styles.originalPrice}>
        {moeda(produto.precoVenda)}
      </span>

      <span className={styles.salePrice}>
        {moeda(produto.precoPromocional)}
      </span>
    </div>
  );
}

function ProdutoCardImagem({
  src,
  alt,
  loading,
  sizes,
  className,
  onLoad,
  onDragStart,
}: {
  src: string;
  alt: string;
  loading: "eager" | "lazy";
  sizes: string;
  className: string;
  onLoad?: () => void;
  onDragStart: (event: DragEvent<HTMLImageElement>) => void;
}) {
  if (imagemPublicaPodeSerOtimizada(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={loading}
        decoding="async"
        draggable={false}
        onLoad={onLoad}
        onDragStart={onDragStart}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      onLoad={onLoad}
      onDragStart={onDragStart}
      className={className}
    />
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
  imageLoading = "lazy",
  imageSizes = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw",
  exibirImagemHover = true,
  trackingOrigem,
  trackingMetadata,
  trackingResultadoBusca,
}: ProdutoCardLojaProps) {
  const [favorito, setFavorito] = useState(false);
  const [touchPreview, setTouchPreview] = useState(false);
  const [globalTouchPreview, setGlobalTouchPreview] = useState(false);
  const [revelado, setRevelado] = useState(modoPreview);
  const [imagemHoverSolicitada, setImagemHoverSolicitada] = useState(false);
  const [imagemHoverCarregada, setImagemHoverCarregada] = useState(false);
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
    if (touchPreview || globalTouchPreview) {
      setImagemHoverSolicitada(true);
    }
  }, [globalTouchPreview, touchPreview]);

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
    registrarFavoritoProduto({
      produtoId: produto.id,
      favorito: proximo,
      origem: trackingOrigem,
      metadata: {
        nome: produto.nome,
        ...trackingMetadata,
      },
    });
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
    setImagemHoverSolicitada(true);
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
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      limparInteracaoTouch();
      return;
    }

    if (trackingResultadoBusca) {
      registrarCliqueResultadoBusca({
        termoBusca: trackingResultadoBusca.termoBusca,
        tipoResultado: "produto",
        produtoId: produto.id,
        origem: trackingOrigem || "busca",
        metadata: {
          nome: produto.nome,
          posicao: trackingResultadoBusca.posicao,
          href: produtoHref,
          ...trackingMetadata,
        },
      });
    }
  }

  const semEstoque = !produto.disponivel;
  const desconto = percentualDesconto(produto);
  const produtoHref = href || `/loja/produto/${produto.id}`;
  const imagemOverlayUrl =
    produto.imagemHoverUrl && produto.imagemHoverUrl !== produto.imagemUrl
      ? produto.imagemHoverUrl
      : null;
  const hoverDisponivel = exibirImagemHover && Boolean(imagemOverlayUrl);
  const previewTouchAtivo = touchPreview || globalTouchPreview;
  const cardClass = [
    `group stella-product-card ${styles.card}`,
    revelado ? "is-visible" : "",
    semEstoque ? "stella-product-card-out-of-stock" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const overlayHover = hoverDisponivel && imagemHoverSolicitada ? (
    <div
      className={`stella-product-hover-overlay ${styles.hoverMedia}`}
      aria-hidden="true"
    >
      {imagemOverlayUrl ? (
        <ProdutoCardImagem
          src={imagemOverlayUrl}
          alt=""
          loading="eager"
          sizes={imageSizes}
          onLoad={() => setImagemHoverCarregada(true)}
          onDragStart={bloquearDragImagem}
          className={`stella-product-hover-image ${styles.hoverImage}`}
        />
      ) : (
        <div className={styles.placeholder} />
      )}
    </div>
  ) : null;

  const conteudoNormal = (
    <div className={styles.content}>
      <div className={styles.media}>
        {produto.imagemUrl ? (
          <ProdutoCardImagem
            src={produto.imagemUrl}
            alt={produto.nome}
            loading={imageLoading}
            sizes={imageSizes}
            onDragStart={bloquearDragImagem}
            className={styles.primaryImage}
          />
        ) : (
          <div
            className={styles.placeholder}
            role="img"
            aria-label="Imagem do produto ainda não disponível"
          />
        )}

        {overlayHover}

        {exibirSeloDesconto && desconto !== null ? (
          <div className={styles.discountBadge}>-{desconto}%</div>
        ) : null}

        {semEstoque ? (
          <div
            className={`${styles.stockBadge} ${
              desconto !== null ? styles.stockBadgeWithDiscount : ""
            }`}
          >
            Sem estoque
          </div>
        ) : null}
      </div>

      <div className={styles.details}>
        <div className={styles.detailsTopline}>
          <h3 className={styles.name}>{produto.nome}</h3>

          {exibirPreco ? (
            <div className={styles.priceColumn}>
              <ProdutoPreco produto={produto} />
            </div>
          ) : null}
        </div>

        {exibirBotao && textoBotao ? (
          <span className={styles.cta}>{textoBotao}</span>
        ) : null}
      </div>
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
      className={styles.favoriteButton}
    >
      <Heart
        className={favorito ? styles.favoriteActive : ""}
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
        data-image-hover={
          hoverDisponivel && imagemHoverCarregada ? "true" : "false"
        }
        onMouseEnter={() => setImagemHoverSolicitada(true)}
        style={{ transitionDelay: revelado ? `${revealDelayMs}ms` : "0ms" }}
      >
        <div className={styles.previewWrapper}>
          {conteudoNormal}
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
      data-image-hover={
        hoverDisponivel && imagemHoverCarregada ? "true" : "false"
      }
      onMouseEnter={() => setImagemHoverSolicitada(true)}
      style={{ transitionDelay: revelado ? `${revealDelayMs}ms` : "0ms" }}
    >
      <Link
        href={produtoHref}
        className={styles.productLink}
        aria-label={`Ver produto ${produto.nome}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleLinkClick}
      >
        {conteudoNormal}
      </Link>

      {favoritoButton}
    </article>
  );
}
