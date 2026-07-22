"use client";

import { useRef, useState } from "react";
import { Crop, ImageIcon, Smartphone, Trash2, X } from "lucide-react";
import MediaLibraryPicker from "@/components/configuracoes/loja/MediaLibraryPicker";
import type { MidiaAssetBiblioteca } from "@/components/configuracoes/loja/MidiaBibliotecaClient";
import VisualCropEditor, {
  type ResponsiveMediaConfig,
} from "@/components/configuracoes/loja/VisualCropEditor";
import {
  criarImagemConteudoVazia,
  type ConteudoImagem,
} from "@/lib/loja/conteudo/contracts";
import { useAccessibleDialog } from "@/components/configuracoes/loja/conteudo/useAccessibleDialog";

function aspectLabel(value: number) {
  const known: Array<[number, string]> = [
    [1, "1:1"],
    [4 / 5, "4:5"],
    [9 / 16, "9:16"],
    [16 / 9, "16:9"],
    [21 / 9, "21:9"],
    [2, "2:1"],
  ];
  return known.find(([ratio]) => Math.abs(ratio - value) < 0.01)?.[1] ?? "auto";
}

function toResponsive(value: ConteudoImagem): ResponsiveMediaConfig {
  return {
    desktop: {
      assetId: value.assetId,
      url: value.desktopUrl,
      alt: value.alt,
      aspectRatio: aspectLabel(value.desktop.aspect),
      zoom: value.desktop.zoom * 100,
      positionX: value.desktop.focalX ?? 50,
      positionY: value.desktop.focalY ?? 50,
      rotation: value.desktop.rotation,
      areaPercent: value.desktop.areaPercent,
    },
    mobile: {
      assetId: value.mobileAssetId || value.assetId,
      url: value.mobileUrl || value.desktopUrl,
      alt: value.alt,
      aspectRatio: aspectLabel(value.mobile.aspect),
      zoom: value.mobile.zoom * 100,
      positionX: value.mobile.focalX ?? 50,
      positionY: value.mobile.focalY ?? 50,
      rotation: value.mobile.rotation,
      areaPercent: value.mobile.areaPercent,
    },
    mobileAssetId: value.mobileAssetId,
    mobileUrl: value.mobileUrl,
    usarImagemMobileAlternativa: Boolean(value.mobileAssetId || value.mobileUrl),
  };
}

function fromResponsive(value: ResponsiveMediaConfig, current: ConteudoImagem): ConteudoImagem {
  return {
    ...current,
    assetId: value.desktop.assetId || "",
    desktopUrl: value.desktop.url || "",
    mobileAssetId: value.mobileAssetId || "",
    mobileUrl: value.mobileUrl || "",
    alt: value.desktop.alt || current.alt,
    desktop: {
      ...current.desktop,
      zoom: Math.max(1, value.desktop.zoom / 100),
      rotation: value.desktop.rotation || 0,
      focalX: value.desktop.positionX,
      focalY: value.desktop.positionY,
      areaPercent: value.desktop.areaPercent || current.desktop.areaPercent,
    },
    mobile: {
      ...current.mobile,
      zoom: Math.max(1, value.mobile.zoom / 100),
      rotation: value.mobile.rotation || 0,
      focalX: value.mobile.positionX,
      focalY: value.mobile.positionY,
      areaPercent: value.mobile.areaPercent || current.mobile.areaPercent,
    },
  };
}

export default function ConteudoImagemField({
  label,
  description,
  value,
  onChange,
  aspectDesktop,
  aspectMobile,
  recommendedDesktop,
  recommendedMobile,
  disabled = false,
  canCreateMedia = false,
}: {
  label: string;
  description?: string;
  value: ConteudoImagem;
  onChange: (value: ConteudoImagem) => void;
  aspectDesktop: number;
  aspectMobile: number;
  recommendedDesktop?: string;
  recommendedMobile?: string;
  disabled?: boolean;
  canCreateMedia?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"DESKTOP" | "MOBILE">("DESKTOP");
  const [cropOpen, setCropOpen] = useState(false);
  const [working, setWorking] = useState(value);
  const cropDialogRef = useRef<HTMLDivElement>(null);
  const hasImage = Boolean(value.desktopUrl);

  useAccessibleDialog(cropOpen && !disabled, () => setCropOpen(false), cropDialogRef);

  function openPicker(target: "DESKTOP" | "MOBILE") {
    if (disabled) return;
    setPickerTarget(target);
    setPickerOpen(true);
  }

  function applyAsset(asset: MidiaAssetBiblioteca) {
    const empty = criarImagemConteudoVazia(aspectDesktop, aspectMobile);
    const next: ConteudoImagem =
      pickerTarget === "MOBILE"
        ? {
            ...value,
            mobileAssetId: asset.id,
            mobileUrl: asset.url,
            alt: value.alt || asset.alt || "",
            mobile: empty.mobile,
          }
        : {
            ...value,
            assetId: asset.id,
            desktopUrl: asset.url,
            alt: value.alt || asset.alt || "",
            desktop: empty.desktop,
            mobile: value.desktopUrl ? value.mobile : empty.mobile,
          };
    onChange(next);
    setWorking(next);
    setCropOpen(true);
  }

  return (
    <div className="space-y-4 border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          <p className="mt-1 text-xs text-slate-500">
            Desktop {recommendedDesktop || aspectLabel(aspectDesktop)} · Mobile {recommendedMobile || aspectLabel(aspectMobile)}
          </p>
        </div>
        {hasImage && !disabled ? (
          <button
            type="button"
            onClick={() => onChange(criarImagemConteudoVazia(aspectDesktop, aspectMobile))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label={`Remover ${label}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-start">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#eef3f8] ring-1 ring-slate-200">
          {hasImage ? (
            <img src={value.desktopUrl} alt={value.alt} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Texto alternativo</span>
            <input
              value={value.alt}
              maxLength={240}
              onChange={(event) => onChange({ ...value, alt: event.target.value })}
              disabled={disabled}
              placeholder="Descreva o conteúdo relevante da imagem"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#5D8CC8] focus:ring-2 focus:ring-[#5D8CC8]/20"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openPicker("DESKTOP")}
              disabled={disabled}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4772AA] px-4 text-sm font-semibold text-white transition hover:bg-[#3f6699] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D8CC8] focus-visible:ring-offset-2"
            >
              <ImageIcon className="h-4 w-4" />
              {hasImage ? "Trocar imagem" : "Selecionar imagem"}
            </button>
            {hasImage && !disabled ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setWorking(value);
                    setCropOpen(true);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D8CC8]"
                >
                  <Crop className="h-4 w-4" />
                  Ajustar enquadramento
                </button>
                <button
                  type="button"
                  onClick={() => openPicker("MOBILE")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D8CC8]"
                >
                  <Smartphone className="h-4 w-4" />
                  Imagem mobile opcional
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <MediaLibraryPicker
        open={pickerOpen}
        title={pickerTarget === "MOBILE" ? "Selecionar imagem mobile" : "Selecionar imagem"}
        onClose={() => setPickerOpen(false)}
        onSelect={(assets) => {
          if (assets[0]) applyAsset(assets[0]);
        }}
        allowUpload={canCreateMedia}
      />

      {cropOpen && !disabled ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conteudo-crop-title"
        >
          <div
            ref={cropDialogRef}
            tabIndex={-1}
            className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl focus:outline-none"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="conteudo-crop-title" className="text-lg font-semibold text-slate-950">
                  Ajustar {label.toLowerCase()}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  O recorte é um metadado deste uso; o arquivo original permanece intacto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCropOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D8CC8]"
                aria-label="Fechar editor de enquadramento"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <VisualCropEditor
                label="Enquadramento visual"
                value={toResponsive(working)}
                onChange={(next) => setWorking(fromResponsive(next, working))}
                aspectRatioDesktop={aspectLabel(aspectDesktop)}
                aspectRatioMobile={aspectLabel(aspectMobile)}
                recommendedSizeDesktop={recommendedDesktop}
                recommendedSizeMobile={recommendedMobile}
                showUrlFields={false}
                allowMobileAlternative={false}
                minZoom={100}
                maxZoom={300}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setCropOpen(false)}
                className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(working);
                  setCropOpen(false);
                }}
                className="min-h-11 rounded-xl bg-[#4772AA] px-5 text-sm font-semibold text-white transition hover:bg-[#3f6699]"
              >
                Aplicar enquadramento
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
