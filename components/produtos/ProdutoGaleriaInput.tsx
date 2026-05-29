"use client";

import { ImagePlus, Trash2, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";

type Area = {
  width: number;
  height: number;
  x: number;
  y: number;
};

type ImagemInicial = {
  id?: string;
  imagemUrl: string;
};

type GaleriaItem = {
  id?: string;
  imagemUrl?: string;
  dataUrl?: string;
  ordem: number;
};

type ProdutoGaleriaInputProps = {
  name?: string;
  imagensIniciais?: ImagemInicial[];
};

const LIMITE_IMAGENS = 4;
const LIMITE_IMAGEM_MB = 4;
const LIMITE_IMAGEM_BYTES = LIMITE_IMAGEM_MB * 1024 * 1024;
const QUALIDADE_IMAGEM_FINAL = 0.9;
const TAMANHO_MAXIMO_IMAGEM_FINAL = 1600;

function criarItemVazio(ordem: number): GaleriaItem {
  return {
    ordem,
  };
}

function arquivoParaDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler a imagem."));
    };

    reader.readAsDataURL(file);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Não foi possível carregar a imagem para corte."))
    );

    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedImageBase64(imageSrc: string, pixelCrop: Area) {
  const image = await createImage(imageSrc);

  const escala = Math.min(
    1,
    TAMANHO_MAXIMO_IMAGEM_FINAL / Math.max(pixelCrop.width, pixelCrop.height)
  );

  const larguraFinal = Math.max(1, Math.round(pixelCrop.width * escala));
  const alturaFinal = Math.max(1, Math.round(pixelCrop.height * escala));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Não foi possível preparar a imagem para corte.");
  }

  canvas.width = larguraFinal;
  canvas.height = alturaFinal;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    larguraFinal,
    alturaFinal
  );

  return canvas.toDataURL("image/jpeg", QUALIDADE_IMAGEM_FINAL);
}

function normalizarItensIniciais(
  imagensIniciais: ImagemInicial[]
): GaleriaItem[] {
  const itens: GaleriaItem[] = imagensIniciais
    .slice(0, LIMITE_IMAGENS)
    .map((imagem, index): GaleriaItem => ({
      id: imagem.id,
      imagemUrl: imagem.imagemUrl,
      ordem: index,
    }));

  while (itens.length < LIMITE_IMAGENS) {
    itens.push(criarItemVazio(itens.length));
  }

  return itens;
}

export default function ProdutoGaleriaInput({
  name = "galeriaProduto",
  imagensIniciais = [],
}: ProdutoGaleriaInputProps) {
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [itens, setItens] = useState<GaleriaItem[]>(
    normalizarItensIniciais(imagensIniciais)
  );
  const [erro, setErro] = useState("");

  const [cropAberto, setCropAberto] = useState(false);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [imagemOrigemCrop, setImagemOrigemCrop] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processandoCrop, setProcessandoCrop] = useState(false);

  const payload = useMemo(() => {
    return itens
      .map((item, index) => ({
        id: item.id,
        imagemUrl: item.imagemUrl,
        dataUrl: item.dataUrl,
        ordem: index,
      }))
      .filter((item) => item.id || item.imagemUrl || item.dataUrl);
  }, [itens]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function selecionarImagem(index: number, file: File | null) {
    setErro("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErro("O arquivo selecionado precisa ser uma imagem.");
      limparInput(index);
      return;
    }

    if (file.size > LIMITE_IMAGEM_BYTES) {
      setErro(
        `A imagem é muito grande. Envie arquivos com até ${LIMITE_IMAGEM_MB} MB. Comprima a imagem antes de continuar.`
      );
      limparInput(index);
      return;
    }

    try {
      const dataUrl = await arquivoParaDataUrl(file);
      abrirCrop(index, dataUrl);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar a imagem selecionada."
      );
    } finally {
      limparInput(index);
    }
  }

  function abrirCrop(index: number, imagem: string) {
    setErro("");
    setCropIndex(index);
    setImagemOrigemCrop(imagem);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropAberto(true);
  }

  function ajustarCorteImagemExistente(index: number) {
    const item = itens[index];
    const imagem = item.dataUrl || item.imagemUrl || "";

    if (!imagem) {
      return;
    }

    abrirCrop(index, imagem);
  }

  async function confirmarCrop() {
    if (cropIndex === null || !imagemOrigemCrop || !croppedAreaPixels) {
      return;
    }

    setErro("");
    setProcessandoCrop(true);

    try {
      const dataUrl = await getCroppedImageBase64(
        imagemOrigemCrop,
        croppedAreaPixels
      );

      setItens((atuais) =>
        atuais.map((item, itemIndex) =>
          itemIndex === cropIndex
            ? {
                ordem: itemIndex,
                dataUrl,
              }
            : item
        )
      );

      fecharCrop();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao cortar a imagem selecionada."
      );
    } finally {
      setProcessandoCrop(false);
    }
  }

  function fecharCrop() {
    if (processandoCrop) {
      return;
    }

    setCropAberto(false);
    setCropIndex(null);
    setImagemOrigemCrop("");
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  function limparInput(index: number) {
    const input = fileInputRefs.current[index];

    if (input) {
      input.value = "";
    }
  }

  function removerImagem(index: number) {
    setErro("");

    setItens((atuais) =>
      atuais.map((item, itemIndex) =>
        itemIndex === index ? criarItemVazio(index) : item
      )
    );

    limparInput(index);
  }

  function moverImagem(index: number, direcao: "CIMA" | "BAIXO") {
    setErro("");

    setItens((atuais) => {
      const destino = direcao === "CIMA" ? index - 1 : index + 1;

      if (destino < 0 || destino >= atuais.length) {
        return atuais;
      }

      const novaLista = [...atuais];
      const atual = novaLista[index];
      const outro = novaLista[destino];

      novaLista[index] = {
        ...outro,
        ordem: index,
      };

      novaLista[destino] = {
        ...atual,
        ordem: destino,
      };

      return novaLista;
    });
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(payload)} />

      <div>
        <p className="text-sm font-semibold text-slate-900">
          Galeria do produto
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Adicione até {LIMITE_IMAGENS} imagens. A primeira será a principal e a
          segunda será usada no hover. Cada imagem deve ter no máximo{" "}
          {LIMITE_IMAGEM_MB} MB. Após selecionar, ajuste o enquadramento antes de
          salvar.
        </p>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
          {erro}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {itens.map((item, index) => {
          const imagem = item.dataUrl || item.imagemUrl || "";
          const temImagem = Boolean(imagem);

          return (
            <div
              key={index}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Imagem {index + 1}
                    </p>

                    <p className="text-xs text-slate-500">
                      {index === 0
                        ? "Principal"
                        : index === 1
                        ? "Hover"
                        : "Imagem adicional"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moverImagem(index, "CIMA")}
                      disabled={index === 0}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => moverImagem(index, "BAIXO")}
                      disabled={index === itens.length - 1}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {temImagem ? (
                    <img
                      src={imagem}
                      alt={`Imagem ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center px-4 text-center text-slate-400">
                      <ImagePlus className="h-8 w-8" />
                      <p className="mt-2 text-sm">Nenhuma imagem</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    ref={(element) => {
                      fileInputRefs.current[index] = element;
                    }}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      void selecionarImagem(
                        index,
                        event.target.files?.[0] || null
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />
                    {temImagem ? "Trocar imagem" : "Adicionar imagem"}
                  </button>

                  {temImagem ? (
                    <>
                      <button
                        type="button"
                        onClick={() => ajustarCorteImagemExistente(index)}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Ajustar corte
                      </button>

                      <button
                        type="button"
                        onClick={() => removerImagem(index)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </>
                  ) : null}
                </div>

                {temImagem && item.imagemUrl ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <X className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                      <p
                        className="min-w-0 truncate text-xs text-slate-400"
                        title={item.imagemUrl}
                      >
                        {item.imagemUrl}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {cropAberto && imagemOrigemCrop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Ajustar imagem
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Ajuste zoom e enquadramento. O corte final será quadrado,
                  ideal para a galeria do produto.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharCrop}
                disabled={processandoCrop}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Fechar
              </button>
            </div>

            <div className="relative mt-6 h-[420px] overflow-hidden rounded-2xl bg-slate-900">
              <Cropper
                image={imagemOrigemCrop}
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
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharCrop}
                disabled={processandoCrop}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmarCrop()}
                disabled={processandoCrop}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processandoCrop ? "Processando..." : "Usar imagem"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}