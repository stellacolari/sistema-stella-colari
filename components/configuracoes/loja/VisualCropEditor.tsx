"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Minus, Plus, RotateCcw } from "lucide-react";

export type MediaCropConfig = {
  assetId?: string;
  url?: string;
  alt?: string;
  aspectRatio: string;
  zoom: number;
  positionX: number;
  positionY: number;
  rotation?: number;
  areaPercent?: Area;
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

const ASPECT_RATIO_VALUE: Record<string, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "21:9": 21 / 9,
  "2:1": 2,
  auto: 4 / 3,
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

function getAspectRatioValue(aspectRatio: string) {
  return ASPECT_RATIO_VALUE[aspectRatio] || ASPECT_RATIO_VALUE.auto;
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
  const [internalDevice, setInternalDevice] = useState<MediaCropDevice>("DESKTOP");
  const [cropOffset, setCropOffset] = useState<Point>({ x: 0, y: 0 });
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
  const cropAspectRatioValue = getAspectRatioValue(crop.aspectRatio);
  const compactFrameStyle = {
    aspectRatio: String(cropAspectRatioValue),
    maxWidth: cropAspectRatioValue < 0.75 ? "360px" : "640px",
    maxHeight: "min(420px, 55vh)",
  };

  useEffect(() => {
    setCropOffset({ x: 0, y: 0 });
    setNaturalSize(null);
  }, [activeDevice, mediaUrl]);

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
        mobileAssetId: "",
        mobile: { ...value.mobile, assetId: "", url },
      });
      return;
    }

    onChange({
      ...value,
      desktop: {
        ...value.desktop,
        assetId: "",
        url,
      },
      mobile: {
        ...value.mobile,
        url: value.mobile.url || url,
      },
    });
  }

  function onCropComplete(area: Area) {
    updateDeviceCrop({
      areaPercent: area,
      positionX: clampCropPosition(area.x + area.width / 2),
      positionY: clampCropPosition(area.y + area.height / 2),
    });
  }

  function reset() {
    updateDeviceCrop({
      positionX: 50,
      positionY: 50,
      zoom: 100,
      rotation: 0,
      areaPercent: { x: 0, y: 0, width: 100, height: 100 },
    });
    setCropOffset({ x: 0, y: 0 });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Arraste ou use as setas para reposicionar. Use a roda do mouse,
            pinça ou os botões de zoom.
          </p>
          {recommendedText ? (
            <p className="mt-1 text-xs font-medium text-slate-600">
              Recomendado para este espaço: {recommendedText}.
            </p>
          ) : null}
        </div>

        <div
          className="inline-flex rounded-2xl border border-slate-200 bg-white p-1"
          role="group"
          aria-label="Dispositivo do enquadramento"
        >
          {(["DESKTOP", "MOBILE"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDevice(option)}
              aria-pressed={activeDevice === option}
              className={`min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeDevice === option
                  ? "bg-[var(--brand-blue)] text-white"
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
                    mobileAssetId: event.target.checked ? value.mobileAssetId : "",
                    mobile: event.target.checked
                      ? value.mobile
                      : { ...value.mobile, assetId: "", url: value.desktop.url || "" },
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
                mobileAssetId: event.target.checked ? value.mobileAssetId : "",
                mobile: event.target.checked
                  ? value.mobile
                  : { ...value.mobile, assetId: "", url: value.desktop.url || "" },
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

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div
          className="relative mx-auto w-full overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200"
          style={compactFrameStyle}
          aria-label={`Enquadramento ${activeDevice === "DESKTOP" ? "desktop" : "mobile"}`}
        >
          {mediaUrl ? (
            <Cropper
              key={`${activeDevice}:${mediaUrl}`}
              image={mediaUrl}
              crop={cropOffset}
              zoom={crop.zoom / 100}
              rotation={crop.rotation || 0}
              aspect={cropAspectRatioValue}
              minZoom={minZoom / 100}
              maxZoom={maxZoom / 100}
              objectFit="cover"
              showGrid
              zoomWithScroll
              restrictPosition
              keyboardStep={4}
              initialCroppedAreaPercentages={crop.areaPercent}
              onCropChange={setCropOffset}
              onZoomChange={(zoom) =>
                updateDeviceCrop({ zoom: clampCropZoom(zoom * 100, minZoom, maxZoom) })
              }
              onCropComplete={onCropComplete}
              onMediaLoaded={(media) =>
                setNaturalSize({ width: media.naturalWidth, height: media.naturalHeight })
              }
              mediaProps={{ alt: crop.alt || "" }}
              cropperProps={{
                "aria-label": `Mover imagem no enquadramento ${activeDevice === "DESKTOP" ? "desktop" : "mobile"}`,
              }}
              classes={{
                cropAreaClassName:
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)]",
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-500">
              Adicionar imagem
            </div>
          )}

          {mediaUrl && showSafeArea ? (
            <div className="pointer-events-none absolute inset-[8%] z-10 rounded-lg border border-white/70" />
          ) : null}
        </div>
      </div>

      {imageTooSmall ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          A imagem pode perder definição neste layout.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Zoom</span>
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() =>
                updateDeviceCrop({ zoom: clampCropZoom(crop.zoom - 10, minZoom, maxZoom) })
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]"
              aria-label="Reduzir zoom"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
              {Math.round(crop.zoom)}%
            </span>
            <button
              type="button"
              onClick={() =>
                updateDeviceCrop({ zoom: clampCropZoom(crop.zoom + 10, minZoom, maxZoom) })
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]"
              aria-label="Ampliar zoom"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]"
        >
          <RotateCcw className="h-4 w-4" />
          Resetar
        </button>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        O original permanece intacto. O enquadramento é salvo separadamente para desktop e mobile.
      </p>
    </div>
  );
}
