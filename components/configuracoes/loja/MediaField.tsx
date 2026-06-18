"use client";

import { useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import MediaLibraryPicker from "@/components/configuracoes/loja/MediaLibraryPicker";
import type { MidiaAssetBiblioteca } from "@/components/configuracoes/loja/MidiaBibliotecaClient";
import VisualCropEditor, {
  createResponsiveMediaConfig,
  type MediaCropContext,
  type ResponsiveMediaConfig,
} from "@/components/configuracoes/loja/VisualCropEditor";

type MediaFieldProps = {
  label: string;
  value: ResponsiveMediaConfig;
  onChange: (value: ResponsiveMediaConfig) => void;
  contexto?: MediaCropContext;
  recommendedSize?: string;
};

export default function MediaField({
  label,
  value,
  onChange,
  contexto,
  recommendedSize,
}: MediaFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const desktopUrl = value.desktop.url || "";

  function applyAsset(asset: MidiaAssetBiblioteca) {
    onChange(
      createResponsiveMediaConfig({
        desktopUrl: asset.url,
        alt: asset.alt || asset.nome,
        aspectRatioDesktop: value.desktop.aspectRatio || "4:5",
        aspectRatioMobile: value.mobile.aspectRatio || "4:5",
        desktopPositionX: value.desktop.positionX,
        desktopPositionY: value.desktop.positionY,
        mobilePositionX: value.mobile.positionX,
        mobilePositionY: value.mobile.positionY,
        desktopZoom: value.desktop.zoom,
        mobileZoom: value.mobile.zoom,
      })
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{label}</p>
          {recommendedSize ? (
            <p className="mt-1 text-xs text-slate-500">Recomendado: {recommendedSize}</p>
          ) : null}
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Quando vazio, o mobile usa a mesma imagem principal com enquadramento proprio.
          </p>
        </div>
        {desktopUrl ? (
          <button
            type="button"
            onClick={() =>
              onChange(
                createResponsiveMediaConfig({
                  aspectRatioDesktop: value.desktop.aspectRatio,
                  aspectRatioMobile: value.mobile.aspectRatio,
                })
              )
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600"
            aria-label="Remover imagem"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-100">
        {desktopUrl ? (
          <img src={desktopUrl} alt={value.desktop.alt || ""} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-slate-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Selecionar da biblioteca
        </button>
        <input
          value={desktopUrl}
          onChange={(event) =>
            onChange({
              ...value,
              desktop: {
                ...value.desktop,
                url: event.target.value,
              },
              mobile: {
                ...value.mobile,
                url: value.mobile.url || event.target.value,
              },
            })
          }
          placeholder="Colar URL"
          className="min-h-10 flex-1 rounded-2xl border border-slate-200 px-4 text-sm"
        />
      </div>

      <VisualCropEditor
        label="Crop visual"
        value={value}
        onChange={onChange}
        contexto={contexto}
        showUrlFields
      />

      <MediaLibraryPicker
        open={pickerOpen}
        mode="single"
        onClose={() => setPickerOpen(false)}
        onSelect={(assets) => {
          if (assets[0]) applyAsset(assets[0]);
        }}
      />
    </div>
  );
}
