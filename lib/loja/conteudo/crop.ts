import type { CSSProperties } from "react";
import type { ConteudoCrop } from "./contracts.ts";

export function calcularEstiloCropPercentual(
  crop: ConteudoCrop,
): CSSProperties {
  const area = crop.areaPercent;

  if (
    area &&
    area.width > 0 &&
    area.height > 0 &&
    (area.width < 99.99 || area.height < 99.99)
  ) {
    return {
      position: "absolute",
      width: `${10000 / area.width}%`,
      height: `${10000 / area.height}%`,
      left: `${(-area.x / area.width) * 100}%`,
      top: `${(-area.y / area.height) * 100}%`,
      maxWidth: "none",
      objectFit: "fill",
      transform: crop.rotation ? `rotate(${crop.rotation}deg)` : undefined,
      transformOrigin: "center",
    };
  }

  return {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${crop.focalX ?? 50}% ${crop.focalY ?? 50}%`,
    transform: `scale(${Math.max(1, crop.zoom || 1)}) rotate(${crop.rotation || 0}deg)`,
    transformOrigin: `${crop.focalX ?? 50}% ${crop.focalY ?? 50}%`,
  };
}
