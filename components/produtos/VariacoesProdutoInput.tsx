"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import ImageBox from "@/components/ui/ImageBox";

export type ProdutoVariacaoOpcaoInput = {
  id?: string;
  nome: string;
  imagemUrl?: string | null;
  precoAdicional?: number;
  custoAdicional?: number;
  ativo?: boolean;
  ordem?: number;
};

export type ProdutoVariacaoInput = {
  id?: string;
  nome: string;
  obrigatoria?: boolean;
  opcoes: ProdutoVariacaoOpcaoInput[];
};

type VariacoesProdutoInputProps = {
  name?: string;
  variacoesIniciais?: ProdutoVariacaoInput[];
};

function numeroParaInput(valor: number | null | undefined) {
  if (!valor) {
    return "";
  }

  return String(valor).replace(".", ",");
}

function inputParaNumero(valor: string) {
  const numero = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function criarOpcaoVazia(ordem: number): ProdutoVariacaoOpcaoInput {
  return {
    nome: "",
    imagemUrl: "",
    precoAdicional: 0,
    custoAdicional: 0,
    ativo: true,
    ordem,
  };
}

export default function VariacoesProdutoInput({
  name = "variacoesProduto",
  variacoesIniciais = [],
}: VariacoesProdutoInputProps) {
  const variacaoInicial = variacoesIniciais[0];

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [ativo, setAtivo] = useState(Boolean(variacaoInicial));
  const [nomeVariacao, setNomeVariacao] = useState(
    variacaoInicial?.nome || ""
  );
  const [obrigatoria, setObrigatoria] = useState(
    variacaoInicial?.obrigatoria !== false
  );
  const [opcoes, setOpcoes] = useState<ProdutoVariacaoOpcaoInput[]>(
    variacaoInicial?.opcoes?.length
      ? variacaoInicial.opcoes.map((opcao, index) => ({
          id: opcao.id,
          nome: opcao.nome || "",
          imagemUrl: opcao.imagemUrl || "",
          precoAdicional: Number(opcao.precoAdicional || 0),
          custoAdicional: Number(opcao.custoAdicional || 0),
          ativo: opcao.ativo !== false,
          ordem: Number.isFinite(Number(opcao.ordem))
            ? Number(opcao.ordem)
            : index,
        }))
      : [criarOpcaoVazia(0)]
  );

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [erroUpload, setErroUpload] = useState("");

  const payload = useMemo(() => {
    if (!ativo) {
      return [];
    }

    const nome = nomeVariacao.trim();

    if (!nome) {
      return [];
    }

    const opcoesValidas = opcoes
      .map((opcao, index) => ({
        id: opcao.id,
        nome: String(opcao.nome || "").trim(),
        imagemUrl: String(opcao.imagemUrl || "").trim() || null,
        precoAdicional: Number(opcao.precoAdicional || 0),
        custoAdicional: Number(opcao.custoAdicional || 0),
        ativo: opcao.ativo !== false,
        ordem: index,
      }))
      .filter((opcao) => opcao.nome);

    if (opcoesValidas.length === 0) {
      return [];
    }

    return [
      {
        id: variacaoInicial?.id,
        nome,
        obrigatoria,
        opcoes: opcoesValidas,
      },
    ];
  }, [ativo, nomeVariacao, obrigatoria, opcoes, variacaoInicial?.id]);

  function adicionarOpcao() {
    setOpcoes((atuais) => [...atuais, criarOpcaoVazia(atuais.length)]);
  }

  function removerOpcao(index: number) {
    setOpcoes((atuais) => {
      const novas = atuais.filter((_, opcaoIndex) => opcaoIndex !== index);

      if (novas.length === 0) {
        return [criarOpcaoVazia(0)];
      }

      return novas.map((opcao, novaOrdem) => ({
        ...opcao,
        ordem: novaOrdem,
      }));
    });
  }

  function atualizarOpcao(
    index: number,
    campo: keyof ProdutoVariacaoOpcaoInput,
    valor: string | number | boolean | null
  ) {
    setOpcoes((atuais) =>
      atuais.map((opcao, opcaoIndex) =>
        opcaoIndex === index
          ? {
              ...opcao,
              [campo]: valor,
            }
          : opcao
      )
    );
  }

  async function enviarImagemOpcao(index: number, arquivo: File | null) {
    if (!arquivo) {
      return;
    }

    try {
      setErroUpload("");
      setUploadingIndex(index);

      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const resposta = await fetch("/api/configuracoes/loja/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await resposta.json();

      if (!resposta.ok) {
        throw new Error(data.erro || "Erro ao enviar imagem.");
      }

      const imagemUrl = data.url || data.imagemUrl || data.caminho;

      if (!imagemUrl) {
        throw new Error("A rota de upload não retornou a URL da imagem.");
      }

      atualizarOpcao(index, "imagemUrl", imagemUrl);
    } catch (error) {
      setErroUpload(
        error instanceof Error
          ? error.message
          : "Erro ao enviar imagem da opção."
      );
    } finally {
      setUploadingIndex(null);

      const input = fileInputRefs.current[index];

      if (input) {
        input.value = "";
      }
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name={name} value={JSON.stringify(payload)} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Variações do produto
          </p>

          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Opções como tamanho, material, cor ou modelo
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Use quando o produto tiver escolhas diferentes no estoque ou na
            loja, como tamanho 16, material prata, cor azul ou modelo grande.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(event) => setAtivo(event.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          Produto possui variação
        </label>
      </div>

      {ativo ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nome da variação
              </label>

              <input
                value={nomeVariacao}
                onChange={(event) => setNomeVariacao(event.target.value)}
                placeholder="Ex: Tamanho, Material, Cor, Modelo"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Obrigatoriedade
              </label>

              <label className="flex h-[46px] cursor-pointer items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={obrigatoria}
                  onChange={(event) => setObrigatoria(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
                Cliente deve escolher
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Opções da variação
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Cadastre as opções que poderão ser compradas, como 14, 15,
                  Prata, Ouro, Azul ou Grande.
                </p>
              </div>

              <button
                type="button"
                onClick={adicionarOpcao}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                Adicionar opção
              </button>
            </div>

            {erroUpload ? (
              <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {erroUpload}
              </div>
            ) : null}

            <div className="divide-y divide-slate-200">
              {opcoes.map((opcao, index) => {
                const possuiImagem = Boolean(opcao.imagemUrl);
                const enviandoImagem = uploadingIndex === index;

                return (
                  <div key={index} className="space-y-4 px-4 py-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_150px_150px_44px]">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          Opção
                        </label>

                        <input
                          value={opcao.nome}
                          onChange={(event) =>
                            atualizarOpcao(index, "nome", event.target.value)
                          }
                          placeholder="Ex: 16, Prata, Azul, Bolsa Grande"
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          Preço extra
                        </label>

                        <input
                          value={numeroParaInput(opcao.precoAdicional)}
                          onChange={(event) =>
                            atualizarOpcao(
                              index,
                              "precoAdicional",
                              inputParaNumero(event.target.value)
                            )
                          }
                          placeholder="0,00"
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          Custo extra
                        </label>

                        <input
                          value={numeroParaInput(opcao.custoAdicional)}
                          onChange={(event) =>
                            atualizarOpcao(
                              index,
                              "custoAdicional",
                              inputParaNumero(event.target.value)
                            )
                          }
                          placeholder="0,00"
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removerOpcao(index)}
                          className="flex h-[46px] w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                          title="Remover opção"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          {possuiImagem ? (
                            <ImageBox
                              src={opcao.imagemUrl}
                              alt={opcao.nome || "Imagem da opção"}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImagePlus className="h-7 w-7" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            Imagem da opção
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Opcional. Use quando a opção muda visualmente o
                            produto, como cor, material ou acabamento.
                          </p>

                          {possuiImagem ? (
                            <p className="mt-2 truncate text-xs text-slate-400">
                              {opcao.imagemUrl}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <input
                            ref={(element) => {
                              fileInputRefs.current[index] = element;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              enviarImagemOpcao(
                                index,
                                event.target.files?.[0] || null
                              )
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              fileInputRefs.current[index]?.click()
                            }
                            disabled={enviandoImagem}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {enviandoImagem ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando
                              </>
                            ) : (
                              <>
                                <ImagePlus className="h-4 w-4" />
                                {possuiImagem
                                  ? "Trocar imagem"
                                  : "Adicionar imagem"}
                              </>
                            )}
                          </button>

                          {possuiImagem ? (
                            <button
                              type="button"
                              onClick={() =>
                                atualizarOpcao(index, "imagemUrl", "")
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                            >
                              <X className="h-4 w-4" />
                              Remover
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Nesta primeira etapa, a variação é salva no produto. Na próxima
            etapa, vamos usar essas opções na compra interna, estoque, loja e
            checkout.
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          Produto sem variação. O sistema continuará usando estoque único para
          este item.
        </div>
      )}
    </section>
  );
}