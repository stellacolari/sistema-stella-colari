"use client";

import { GripVertical, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";

type Area = {
  width: number;
  height: number;
  x: number;
  y: number;
};

export type ProdutoGaleriaImagemInicial = {
  id?: string;
  imagemUrl: string;
};

type GaleriaItem = {
  uid: string;
  id?: string;
  imagemUrl?: string;
  dataUrl?: string;
};

type ProdutoGaleriaInputProps = {
  name: string;
  imagensIniciais?: ProdutoGaleriaImagemInicial[];
  limite?: number;
};

function criarUid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function arquivoParaDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler imagem."));
    };

    reader.readAsDataURL(file);
  });
}

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

  if (!ctx) {
    throw new Error("Não foi possível criar o canvas.");
  }

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

export default function ProdutoGaleriaInput({
  name,
  imagensIniciais = [],
  limite = 4,
}: ProdutoGaleriaInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draggingUid, setDraggingUid] = useState<string | null>(null);

  const [imagens, setImagens] = useState<GaleriaItem[]>(
    imagensIniciais.slice(0, limite).map((imagem) => ({
      uid: imagem.id || imagem.imagemUrl || criarUid(),
      id: imagem.id,
      imagemUrl: imagem.imagemUrl,
    }))
  );

  const [editandoUid, setEditandoUid] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [erroCrop, setErroCrop] = useState<string | null>(null);
  const [salvandoCrop, setSalvandoCrop] = useState(false);

  const hiddenValue = useMemo(() => {
    return JSON.stringify(
      imagens.map((imagem, index) => ({
        id: imagem.id,
        imagemUrl: imagem.imagemUrl,
        dataUrl: imagem.dataUrl,
        ordem: index,
      }))
    );
  }, [imagens]);

  const imagemEditando = useMemo(() => {
    if (!editandoUid) return null;

    return imagens.find((imagem) => imagem.uid === editandoUid) ?? null;
  }, [editandoUid, imagens]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function adicionarArquivos(files: FileList | null) {
    if (!files) return;

    const espacoDisponivel = limite - imagens.length;

    if (espacoDisponivel <= 0) {
      return;
    }

    const arquivos = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, espacoDisponivel);

    const novasImagens: GaleriaItem[] = [];

    for (const file of arquivos) {
      const dataUrl = await arquivoParaDataUrl(file);

      novasImagens.push({
        uid: criarUid(),
        dataUrl,
      });
    }

    setImagens((current) => [...current, ...novasImagens].slice(0, limite));

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removerImagem(uid: string) {
    setImagens((current) => current.filter((imagem) => imagem.uid !== uid));
  }

  function moverImagem(uidOrigem: string, uidDestino: string) {
    setImagens((current) => {
      const origemIndex = current.findIndex(
        (imagem) => imagem.uid === uidOrigem
      );
      const destinoIndex = current.findIndex(
        (imagem) => imagem.uid === uidDestino
      );

      if (origemIndex < 0 || destinoIndex < 0 || origemIndex === destinoIndex) {
        return current;
      }

      const novaLista = [...current];
      const [itemMovido] = novaLista.splice(origemIndex, 1);

      novaLista.splice(destinoIndex, 0, itemMovido);

      return novaLista;
    });
  }

  function abrirEditor(imagem: GaleriaItem) {
    const src = imagem.dataUrl || imagem.imagemUrl;

    if (!src) {
      return;
    }

    setEditandoUid(imagem.uid);
    setSourceImage(src);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setErroCrop(null);
    setSalvandoCrop(false);
  }

  function fecharEditor() {
    setEditandoUid(null);
    setSourceImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setErroCrop(null);
    setSalvandoCrop(false);
  }

  async function confirmarCrop() {
    if (!editandoUid || !sourceImage || !croppedAreaPixels) {
      setErroCrop("Ajuste a imagem antes de salvar.");
      return;
    }

    setErroCrop(null);
    setSalvandoCrop(true);

    try {
      const croppedBase64 = await getCroppedImageBase64(
        sourceImage,
        croppedAreaPixels
      );

      setImagens((current) =>
        current.map((imagem) => {
          if (imagem.uid !== editandoUid) {
            return imagem;
          }

          return {
            uid: imagem.uid,
            dataUrl: croppedBase64,
          };
        })
      );

      fecharEditor();
    } catch {
      setErroCrop(
        "Não foi possível editar esta imagem. Tente enviar a imagem novamente."
      );
      setSalvandoCrop(false);
    }
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={hiddenValue} />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => void adicionarArquivos(event.target.files)}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={imagens.length >= limite}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImagePlus className="h-5 w-5" />
        Selecionar imagens
      </button>

      <p className="text-xs leading-5 text-slate-500">
        Selecione até {limite} imagens. Arraste para mudar a ordem. A imagem 1
        será a principal e a imagem 2 será usada no hover da loja. Use o lápis
        para ajustar o corte e o zoom de cada imagem.
      </p>

      {imagens.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {imagens.map((imagem, index) => {
            const src = imagem.dataUrl || imagem.imagemUrl || "";

            return (
              <div
                key={imagem.uid}
                draggable
                onDragStart={() => setDraggingUid(imagem.uid)}
                onDragEnd={() => setDraggingUid(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingUid) {
                    moverImagem(draggingUid, imagem.uid);
                  }

                  setDraggingUid(null);
                }}
                className={`group relative overflow-hidden border border-slate-200 bg-white ${
                  draggingUid === imagem.uid ? "opacity-50" : ""
                }`}
              >
                <div className="aspect-square bg-slate-100">
                  {src ? (
                    <img
                      src={src}
                      alt={`Imagem ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="absolute left-2 top-2 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  {index + 1}
                </div>

                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center bg-white/95 text-slate-700 shadow-sm transition hover:bg-slate-100"
                    onClick={() => abrirEditor(imagem)}
                    aria-label="Editar corte da imagem"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center bg-white/95 text-red-600 shadow-sm transition hover:bg-red-50"
                    onClick={() => removerImagem(imagem.uid)}
                    aria-label="Remover imagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/95 px-2 py-1 text-xs text-slate-600 shadow-sm">
                  <GripVertical className="h-3 w-3" />
                  Arrastar
                </div>

                {index === 0 && (
                  <div className="absolute bottom-2 right-2 bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Principal
                  </div>
                )}

                {index === 1 && (
                  <div className="absolute bottom-2 right-2 bg-violet-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Hover
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sourceImage && imagemEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Editar imagem
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ajuste o zoom e a posição. O corte será salvo em formato
                  quadrado.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharEditor}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Fechar editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="relative h-[420px] overflow-hidden rounded-3xl bg-slate-900">
                <Cropper
                  image={sourceImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  objectFit="contain"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Zoom
                </label>

                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.05}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full"
                />
              </div>

              {erroCrop && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroCrop}
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={fecharEditor}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => void confirmarCrop()}
                  disabled={salvandoCrop}
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvandoCrop ? "Salvando..." : "Aplicar corte"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}