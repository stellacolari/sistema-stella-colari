"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";

type Area = {
  width: number;
  height: number;
  x: number;
  y: number;
};

type ImageUploadCropProps = {
  name: string;
  initialImage?: string | null;
  label?: string;
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedImageBase64(imageSrc: string, pixelCrop: Area) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Não foi possível criar o canvas.");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function ImageUploadCrop({
  name,
  initialImage,
  label = "Imagem",
}: ImageUploadCropProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [openCrop, setOpenCrop] = useState(false);

  const previewText = useMemo(() => {
    return preview ? "Imagem selecionada" : "Sem imagem";
  }, [preview]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      setSourceImage(result);
      setOpenCrop(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    };

    reader.readAsDataURL(file);
  }

  async function confirmCrop() {
    if (!sourceImage || !croppedAreaPixels) return;

    const croppedBase64 = await getCroppedImageBase64(sourceImage, croppedAreaPixels);
    setPreview(croppedBase64);
    setOpenCrop(false);
  }

  function clearImage() {
    setPreview(null);
    setSourceImage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">{label}</label>

      <input type="hidden" name={name} value={preview || ""} />

      <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        {preview ? (
          <img
            src={preview}
            alt="Pré-visualização"
            className="h-56 w-full object-contain p-3"
          />
        ) : (
          <div className="flex h-56 items-center justify-center text-sm font-medium text-slate-400">
            Sem imagem
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500">{previewText}</p>

      <div className="flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
          Selecionar imagem
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={onFileChange}
          />
        </label>

        <button
          type="button"
          onClick={clearImage}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Remover
        </button>
      </div>

      {openCrop && sourceImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Ajustar imagem
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Ajuste zoom e enquadramento antes de salvar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenCrop(false)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="relative mt-6 h-[420px] overflow-hidden rounded-2xl bg-slate-900">
              <Cropper
                image={sourceImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                objectFit="contain"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenCrop(false)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmCrop}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                Usar imagem
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}