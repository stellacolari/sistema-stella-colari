"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";

export type MediaCropConfig = {
  assetId?: string;
  url?: string;
  alt?: string;
  aspectRatio: string;
  zoom: number;
  positionX: number;
  positionY: number;
  rotation?: number;
};

export type ResponsiveMediaConfig = {
  desktop: MediaCropConfig;
  mobile: MediaCropConfig;
  mobileAssetId?: string;
  mobileUrl?: string;
  usarImagemMobileAlternativa?: boolean;
};

export type MediaCropDevice = "DESKTOP" | "MOBILE";

export type MediaCropContext =
  | "PRODUTO_CARD"
  | "GALERIA_9_16"
  | "GALERIA_4_5"
  | "BANNER_16_9"
  | "BANNER_21_9"
  | "HERO_FULL"
  | "HERO_PNG_COMPACTO"
  | "HERO_PNG_FULLSCREEN"
  | "TEXTO_IMAGEM_CONTIDA"
  | "TEXTO_IMAGEM_SANGRADA"
  | "COLECOES_CATEGORIAS";

type RecommendedMediaSize = {
  desktop: string;
  mobile: string;
  desktopWidth: number;
  desktopHeight: number;
  mobileWidth: number;
  mobileHeight: number;
};

const ASPECT_RATIO_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
  "21:9": "aspect-[21/9]",
  "2:1": "aspect-[2/1]",
  auto: "aspect-[4/3]",
};

const RECOMMENDED_SIZES: Record<MediaCropContext, RecommendedMediaSize> = {
  PRODUTO_CARD: {
    desktop: "1600 x 1600 px",
    mobile: "1600 x 1600 px",
    desktopWidth: 1600,
    desktopHeight: 1600,
    mobileWidth: 1600,
    mobileHeight: 1600,
  },
  GALERIA_9_16: {
    desktop: "1200 x 2133 px",
    mobile: "1080 x 1920 px",
    desktopWidth: 1200,
    desktopHeight: 2133,
    mobileWidth: 1080,
    mobileHeight: 1920,
  },
  GALERIA_4_5: {
    desktop: "1600 x 2000 px",
    mobile: "1080 x 1350 px",
    desktopWidth: 1600,
    desktopHeight: 2000,
    mobileWidth: 1080,
    mobileHeight: 1350,
  },
  BANNER_16_9: {
    desktop: "1920 x 1080 px",
    mobile: "1080 x 1350 px",
    desktopWidth: 1920,
    desktopHeight: 1080,
    mobileWidth: 1080,
    mobileHeight: 1350,
  },
  BANNER_21_9: {
    desktop: "2400 x 1030 px",
    mobile: "1080 x 1350 px",
    desktopWidth: 2400,
    desktopHeight: 1030,
    mobileWidth: 1080,
    mobileHeight: 1350,
  },
  HERO_FULL: {
    desktop: "2400 x 1400 px",
    mobile: "1440 x 1800 px",
    desktopWidth: 2400,
    desktopHeight: 1400,
    mobileWidth: 1440,
    mobileHeight: 1800,
  },
  HERO_PNG_COMPACTO: {
    desktop: "2200 x 2200 px",
    mobile: "1600 x 1600 px",
    desktopWidth: 2200,
    desktopHeight: 2200,
    mobileWidth: 1600,
    mobileHeight: 1600,
  },
  HERO_PNG_FULLSCREEN: {
    desktop: "2600 x 2600 px",
    mobile: "1800 x 1800 px",
    desktopWidth: 2600,
    desktopHeight: 2600,
    mobileWidth: 1800,
    mobileHeight: 1800,
  },
  TEXTO_IMAGEM_CONTIDA: {
    desktop: "1400 x 1800 px",
    mobile: "1080 x 1350 px",
    desktopWidth: 1400,
    desktopHeight: 1800,
    mobileWidth: 1080,
    mobileHeight: 1350,
  },
  TEXTO_IMAGEM_SANGRADA: {
    desktop: "1800 x 2400 px",
    mobile: "1080 x 1350 px",
    desktopWidth: 1800,
    desktopHeight: 2400,
    mobileWidth: 1080,
    mobileHeight: 1350,
  },
  COLECOES_CATEGORIAS: {
    desktop: "1600 x 2000 px",
    mobile: "1080 x 1350 px",
    desktopWidth: 1600,
    desktopHeight: 2000,
    mobileWidth: 1080,
    mobileHeight: 1350,
  },
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampCropPosition(value: number) {
  return clamp(Number(value), 0, 100);
}

export function clampCropZoom(value: number, min = 80, max = 220) {
  return clamp(Number(value), min, max);
}

export function getMediaCropObjectPosition(crop: Pick<MediaCropConfig, "positionX" | "positionY">) {
  return `${clampCropPosition(crop.positionX)}% ${clampCropPosition(crop.positionY)}%`;
}

export function getAspectRatioClass(aspectRatio: string) {
  return ASPECT_RATIO_CLASS[aspectRatio] || ASPECT_RATIO_CLASS.auto;
}

export function getRecommendedMediaSize(contexto: MediaCropContext) {
  return RECOMMENDED_SIZES[contexto];
}

function parseRecommendedSize(value: string) {
  const match = value.match(/(\d+)\s*x\s*(\d+)/i);

  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function normalizeCrop(
  crop: MediaCropConfig,
  fallbackAspectRatio: string,
  minZoom = 80,
  maxZoom = 220
): MediaCropConfig {
  return {
    ...crop,
    aspectRatio: crop.aspectRatio || fallbackAspectRatio,
    zoom: clampCropZoom(crop.zoom || 100, minZoom, maxZoom),
    positionX: clampCropPosition(crop.positionX ?? 50),
    positionY: clampCropPosition(crop.positionY ?? 50),
  };
}

export function createResponsiveMediaConfig({
  desktopUrl = "",
  mobileUrl = "",
  alt = "",
  aspectRatioDesktop = "4:5",
  aspectRatioMobile = "4:5",
  desktopPositionX = 50,
  desktopPositionY = 50,
  mobilePositionX = 50,
  mobilePositionY = 50,
  desktopZoom = 100,
  mobileZoom = 100,
  minZoom = 80,
  maxZoom = 220,
}: {
  desktopUrl?: string;
  mobileUrl?: string;
  alt?: string;
  aspectRatioDesktop?: string;
  aspectRatioMobile?: string;
  desktopPositionX?: number;
  desktopPositionY?: number;
  mobilePositionX?: number;
  mobilePositionY?: number;
  desktopZoom?: number;
  mobileZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}): ResponsiveMediaConfig {
  return {
    desktop: normalizeCrop(
      {
        url: desktopUrl,
        alt,
        aspectRatio: aspectRatioDesktop,
        zoom: desktopZoom,
        positionX: desktopPositionX,
        positionY: desktopPositionY,
      },
      aspectRatioDesktop,
      minZoom,
      maxZoom
    ),
    mobile: normalizeCrop(
      {
        url: desktopUrl,
        alt,
        aspectRatio: aspectRatioMobile,
        zoom: mobileZoom,
        positionX: mobilePositionX,
        positionY: mobilePositionY,
      },
      aspectRatioMobile,
      minZoom,
      maxZoom
    ),
    mobileUrl,
    usarImagemMobileAlternativa: Boolean(mobileUrl),
  };
}

function getMediaUrl(value: ResponsiveMediaConfig, device: MediaCropDevice) {
  if (device === "MOBILE" && value.usarImagemMobileAlternativa && value.mobileUrl) {
    return value.mobileUrl;
  }

  return value.desktop.url || value.mobile.url || "";
}

function getActiveCrop(
  value: ResponsiveMediaConfig,
  device: MediaCropDevice,
  aspectRatioDesktop: string,
  aspectRatioMobile: string,
  minZoom = 80,
  maxZoom = 220
) {
  return normalizeCrop(
    device === "MOBILE" ? value.mobile : value.desktop,
    device === "MOBILE" ? aspectRatioMobile : aspectRatioDesktop,
    minZoom,
    maxZoom
  );
}

export default function VisualCropEditor({
  label = "Enquadramento",
  value,
  onChange,
  device,
  onDeviceChange,
  aspectRatioDesktop = value.desktop.aspectRatio || "4:5",
  aspectRatioMobile = value.mobile.aspectRatio || "4:5",
  recommendedSizeDesktop,
  recommendedSizeMobile,
  contexto,
  allowMobileAlternative = true,
  showUrlFields = false,
  showSafeArea = true,
  minZoom = 80,
  maxZoom = 220,
}: {
  label?: string;
  value: ResponsiveMediaConfig;
  onChange: (value: ResponsiveMediaConfig) => void;
  device?: MediaCropDevice;
  onDeviceChange?: (device: MediaCropDevice) => void;
  aspectRatioDesktop?: string;
  aspectRatioMobile?: string;
  recommendedSizeDesktop?: string;
  recommendedSizeMobile?: string;
  contexto?: MediaCropContext;
  allowMobileAlternative?: boolean;
  showUrlFields?: boolean;
  showSafeArea?: boolean;
  minZoom?: number;
  maxZoom?: number;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(
    null
  );
  const [internalDevice, setInternalDevice] = useState<MediaCropDevice>("DESKTOP");
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const activeDevice = device || internalDevice;
  const crop = getActiveCrop(
    value,
    activeDevice,
    aspectRatioDesktop,
    aspectRatioMobile,
    minZoom,
    maxZoom
  );
  const mediaUrl = getMediaUrl(value, activeDevice);
  const recommended = contexto ? getRecommendedMediaSize(contexto) : null;
  const recommendedText =
    activeDevice === "MOBILE"
      ? recommendedSizeMobile || recommended?.mobile
      : recommendedSizeDesktop || recommended?.desktop;
  const recommendedParsed = recommendedText
    ? parseRecommendedSize(recommendedText)
    : null;
  const imageTooSmall =
    naturalSize && recommendedParsed
      ? naturalSize.width < recommendedParsed.width ||
        naturalSize.height < recommendedParsed.height
      : false;

  function setDevice(nextDevice: MediaCropDevice) {
    if (onDeviceChange) {
      onDeviceChange(nextDevice);
      return;
    }

    setInternalDevice(nextDevice);
  }

  function updateDeviceCrop(patch: Partial<MediaCropConfig>) {
    const nextCrop = normalizeCrop(
      {
        ...crop,
        ...patch,
      },
      activeDevice === "MOBILE" ? aspectRatioMobile : aspectRatioDesktop,
      minZoom,
      maxZoom
    );

    if (activeDevice === "MOBILE") {
      onChange({
        ...value,
        mobile: nextCrop,
      });
      return;
    }

    onChange({
      ...value,
      desktop: nextCrop,
      mobile: {
        ...value.mobile,
        url: value.mobile.url || nextCrop.url,
        alt: value.mobile.alt || nextCrop.alt,
      },
    });
  }

  function updateUrl(url: string) {
    if (activeDevice === "MOBILE" && value.usarImagemMobileAlternativa) {
      onChange({
        ...value,
        mobileUrl: url,
      });
      return;
    }

    onChange({
      ...value,
      desktop: {
        ...value.desktop,
        url,
      },
      mobile: {
        ...value.mobile,
        url: value.mobile.url || url,
      },
    });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      positionX: crop.positionX,
      positionY: crop.positionY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rect = previewRef.current?.getBoundingClientRect();

    if (!drag || !rect) return;

    const deltaX = ((event.clientX - drag.x) / rect.width) * 100;
    const deltaY = ((event.clientY - drag.y) / rect.height) * 100;

    updateDeviceCrop({
      positionX: clampCropPosition(drag.positionX - deltaX),
      positionY: clampCropPosition(drag.positionY - deltaY),
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function reset() {
    updateDeviceCrop({
      positionX: 50,
      positionY: 50,
      zoom: 100,
    });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Arraste a imagem para reposicionar. O arquivo original não é alterado.
          </p>
          {recommendedText ? (
            <p className="mt-1 text-xs font-medium text-slate-600">
              Recomendado para este espaço: {recommendedText}.
            </p>
          ) : null}
        </div>

        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
          {(["DESKTOP", "MOBILE"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDevice(option)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeDevice === option
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option === "DESKTOP" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
      </div>

      {showUrlFields ? (
        <div className="space-y-3">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              URL da imagem
            </span>
            <input
              value={mediaUrl}
              onChange={(event) => updateUrl(event.target.value)}
              placeholder="/uploads/loja/imagem.jpg ou https://..."
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
            />
          </label>

          {allowMobileAlternative && activeDevice === "MOBILE" ? (
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={Boolean(value.usarImagemMobileAlternativa)}
                onChange={(event) =>
                  onChange({
                    ...value,
                    usarImagemMobileAlternativa: event.target.checked,
                    mobileUrl: event.target.checked ? value.mobileUrl : "",
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Usar imagem mobile alternativa
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Quando vazio, o mobile usa a mesma imagem principal com
                  enquadramento próprio.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      ) : allowMobileAlternative && activeDevice === "MOBILE" ? (
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={Boolean(value.usarImagemMobileAlternativa)}
            onChange={(event) =>
              onChange({
                ...value,
                usarImagemMobileAlternativa: event.target.checked,
                mobileUrl: event.target.checked ? value.mobileUrl : "",
              })
            }
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Usar imagem mobile alternativa
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              Quando vazio, o mobile usa a mesma imagem principal com
              enquadramento próprio.
            </span>
          </span>
        </label>
      ) : null}

      <div
        ref={previewRef}
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative touch-none overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 ${getAspectRatioClass(
          crop.aspectRatio
        )}`}
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={crop.alt || ""}
            draggable={false}
            onLoad={(event) =>
              setNaturalSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            className="h-full w-full select-none object-cover"
            style={{
              objectPosition: getMediaCropObjectPosition(crop),
              transform: `scale(${crop.zoom / 100})`,
              transformOrigin: getMediaCropObjectPosition(crop),
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-500">
            Adicionar imagem
          </div>
        )}

        {showSafeArea ? (
          <div className="pointer-events-none absolute inset-[8%] rounded-xl border border-white/70" />
        ) : null}

        <span
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow-lg ring-2 ring-slate-950/20"
          style={{ left: `${crop.positionX}%`, top: `${crop.positionY}%` }}
        />
      </div>

      {imageTooSmall ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          A imagem pode perder definição neste layout.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => updateDeviceCrop({ positionX: 50, positionY: 50 })}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Centralizar
        </button>
        <button
          type="button"
          onClick={() => updateDeviceCrop({ zoom: 100, positionX: 50, positionY: 50 })}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Ajustar largura
        </button>
        <button
          type="button"
          onClick={() => updateDeviceCrop({ zoom: 120, positionX: 50, positionY: 50 })}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Ajustar altura
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Resetar
        </button>
      </div>

      <label>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Zoom
        </span>
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          value={crop.zoom}
          onChange={(event) => updateDeviceCrop({ zoom: Number(event.target.value) })}
          className="w-full"
        />
        <span className="mt-1 block text-xs font-semibold text-slate-500">
          {crop.zoom}%
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Posição X
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={crop.positionX}
            onChange={(event) =>
              updateDeviceCrop({ positionX: Number(event.target.value) })
            }
            className="w-full"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Posição Y
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={crop.positionY}
            onChange={(event) =>
              updateDeviceCrop({ positionY: Number(event.target.value) })
            }
            className="w-full"
          />
        </label>
      </div>
    </div>
  );
}
