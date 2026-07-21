"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselScrollAreaProps = {
  children: ReactNode;
  enabled: boolean;
  showArrows: boolean;
  arrowPosition: string;
  arrowStyle: string;
  scrollMode: string;
  containerClassName: string;
  itemLabel: string;
};

function getArrowButtonClass(arrowStyle: string) {
  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-35";

  if (arrowStyle === "MINIMALISTA") {
    return `${base} border-transparent bg-transparent text-slate-700 hover:bg-slate-100`;
  }

  return `${base} border-slate-200 bg-white text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50`;
}

export default function CarouselScrollArea({
  children,
  enabled,
  showArrows,
  arrowPosition,
  arrowStyle,
  scrollMode,
  containerClassName,
  itemLabel,
}: CarouselScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;

    if (!element || !enabled) {
      setCanScroll(false);
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const hasOverflow = maxScrollLeft > 8;

    setCanScroll(hasOverflow);
    setCanScrollPrev(hasOverflow && element.scrollLeft > 4);
    setCanScrollNext(hasOverflow && element.scrollLeft < maxScrollLeft - 4);
  }, [enabled]);

  useEffect(() => {
    updateScrollState();

    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [children, enabled, updateScrollState]);

  function scroll(direction: "prev" | "next") {
    const element = scrollRef.current;
    if (!element) return;

    const amount =
      scrollMode === "ITEM"
        ? Math.max(220, element.clientWidth / 3)
        : Math.max(280, element.clientWidth * 0.88);

    element.scrollBy({
      left: direction === "prev" ? -amount : amount,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  const arrows =
    enabled && showArrows && canScroll ? (
      <div
        className={
          arrowPosition === "INFERIOR"
            ? "mt-5 flex justify-center gap-2"
            : "flex justify-end gap-2"
        }
      >
        <button
          type="button"
          aria-label={`Voltar ${itemLabel}`}
          disabled={!canScrollPrev}
          onClick={() => scroll("prev")}
          className={getArrowButtonClass(arrowStyle)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Avançar ${itemLabel}`}
          disabled={!canScrollNext}
          onClick={() => scroll("next")}
          className={getArrowButtonClass(arrowStyle)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    ) : null;

  if (!enabled) {
    return <div className={containerClassName}>{children}</div>;
  }

  return (
    <div className="stella-product-carousel relative">
      {arrowPosition === "TOPO_DIREITA" ? (
        <div className="mb-4">{arrows}</div>
      ) : null}

      <div className="relative">
        {arrowPosition === "LATERAIS" && enabled && showArrows && canScroll ? (
          <>
            <button
              type="button"
              aria-label={`Voltar ${itemLabel}`}
              disabled={!canScrollPrev}
              onClick={() => scroll("prev")}
              className={`${getArrowButtonClass(
                arrowStyle,
              )} absolute left-2 top-1/2 z-10 -translate-y-1/2`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Avançar ${itemLabel}`}
              disabled={!canScrollNext}
              onClick={() => scroll("next")}
              className={`${getArrowButtonClass(
                arrowStyle,
              )} absolute right-2 top-1/2 z-10 -translate-y-1/2`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div
          ref={scrollRef}
          role="region"
          aria-label={`Carrossel de ${itemLabel}`}
          tabIndex={canScroll ? 0 : undefined}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

            event.preventDefault();
            scroll(event.key === "ArrowLeft" ? "prev" : "next");
          }}
          className={`${containerClassName} scrollbar-hidden overscroll-x-contain motion-reduce:scroll-auto`}
        >
          {children}
        </div>
      </div>

      {arrowPosition === "INFERIOR" ? arrows : null}
    </div>
  );
}
