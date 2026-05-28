"use client";

import { ImagePlus, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

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

      setItens((atuais) =>
        atuais.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ordem: index,
                dataUrl,
              }
            : item
        )
      );
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
          {LIMITE_IMAGEM_MB} MB.
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
                    accept="image/*"
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
                    <button
                      type="button"
                      onClick={() => removerImagem(index)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </button>
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
    </div>
  );
}