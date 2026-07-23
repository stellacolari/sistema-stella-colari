import type { CSSProperties } from "react";
import type {
  ConteudoCrop,
  ConteudoImagemPublica,
} from "@/lib/loja/conteudo/contracts";
import { calcularEstiloCropPercentual } from "@/lib/loja/conteudo/crop";
import styles from "./ConteudoImagemResponsiva.module.css";

type CropVariables = CSSProperties & Record<`--crop-${string}`, string>;

function cropVariables(crop: ConteudoCrop, viewport: "desktop" | "mobile") {
  const style = calcularEstiloCropPercentual(crop);
  const prefix = `--crop-${viewport}`;

  return {
    [`${prefix}-position`]: String(style.position ?? "absolute"),
    [`${prefix}-inset`]: style.inset === undefined ? "auto" : String(style.inset),
    [`${prefix}-top`]: style.top === undefined ? "auto" : String(style.top),
    [`${prefix}-left`]: style.left === undefined ? "auto" : String(style.left),
    [`${prefix}-width`]: String(style.width ?? "100%"),
    [`${prefix}-height`]: String(style.height ?? "100%"),
    [`${prefix}-object-fit`]: String(style.objectFit ?? "cover"),
    [`${prefix}-object-position`]: String(style.objectPosition ?? "50% 50%"),
    [`${prefix}-transform`]: String(style.transform ?? "none"),
    [`${prefix}-transform-origin`]: String(style.transformOrigin ?? "center"),
  } as CropVariables;
}

export default function ConteudoImagemResponsiva({
  media,
  className = "",
  eager = false,
}: {
  media: ConteudoImagemPublica;
  className?: string;
  eager?: boolean;
}) {
  const desktopUrl = media.desktopUrl;
  const mobileUrl = media.mobileUrl || desktopUrl;
  if (!desktopUrl && !mobileUrl) return null;
  const fallbackUrl = desktopUrl || mobileUrl;
  const cropStyle = {
    ...cropVariables(media.mobile, "mobile"),
    ...cropVariables(media.desktop, "desktop"),
  } as CropVariables;

  return (
    <span className={`relative block overflow-hidden bg-[var(--brand-blue-soft)] ${className}`}>
      <picture className={styles.frame}>
        {mobileUrl && mobileUrl !== fallbackUrl ? (
          <source media="(max-width: 767px)" srcSet={mobileUrl} />
        ) : null}
        <img
          src={fallbackUrl}
          alt={media.alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          draggable={false}
          className={styles.image}
          style={cropStyle}
        />
      </picture>
    </span>
  );
}
