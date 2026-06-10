"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, CheckCircle2, Link2, Package, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { calcularPlanoEmbalagem } from "@/lib/embalagens/calcular-plano";

type Classe = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
};

type ItemAdicional = {
  id: string;
  codigoInterno: string;
  nome: string;
  custoBase: number;
};

type Compatibilidade = {
  id: string;
  classeId: string | null;
  categoriaId: string | null;
  produtoId: string | null;
  ativo: boolean;
  prioridade: number;
  capacidadeMaximaItens: number;
  classe?: { nome: string } | null;
  categoria?: { nome: string } | null;
  produto?: { codigoInterno: string; nome: string } | null;
};

type Modelo = {
  id: string;
  tipo: string;
  nomeInterno: string;
  nomePublico: string | null;
  slug: string;
  descricaoPublica: string | null;
  imagemUrl: string | null;
  ativo: boolean;
  exibirNaLoja: boolean;
  prioridade: number;
  precoCliente: number;
  substituiEmbalagemPadrao: boolean;
  permiteMensagem: boolean;
  mensagemLimiteCaracteres: number | null;
  mensagemPlaceholder: string | null;
  capacidadeUnidades: number;
  capacidadeCaixasInternas: number | null;
  permiteMisturarClasses: boolean;
  pesoGramas: number;
  alturaCm: number | null;
  larguraCm: number | null;
  comprimentoCm: number | null;
  custoEstimadoManual: number | null;
  componentes: {
    id: string;
    itemAdicionalId: string;
    quantidade: number;
    observacao: string | null;
    itemAdicional: ItemAdicional;
  }[];
  compatibilidades: Compatibilidade[];
};

type Configuracao = {
  id: string;
  estrategiaSelecao: string;
  permitirMultiplosVolumes: boolean;
  maxCaixasInternasPorEnvio: number | null;
};

type Categoria = {
  id: string;
  nome: string;
};

type Produto = {
  id: string;
  codigoInterno: string;
  nome: string;
};

type Dados = {
  classes: Classe[];
  modelos: Modelo[];
  itensAdicionais: ItemAdicional[];
  categorias: Categoria[];
  produtos: Produto[];
  configuracao: Configuracao;
};

type Aba = "CLASSES" | "MODELOS" | "COMPATIBILIDADE" | "SIMULADOR";

const API_URL = "/api/configuracoes/loja/embalagens";

function inputClass() {
  return "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500";
}

function labelClass() {
  return "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
}

function moeda(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function numero(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function check(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function requestJson(method: string, body: Record<string, unknown>) {
  const response = await fetch(API_URL, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Erro ao salvar embalagens.");
  }

  return data;
}

function tipoLabel(tipo: string) {
  if (tipo === "INTERNA_PADRAO") return "Interna padrão";
  if (tipo === "INTERNA_PRESENTE") return "Presente";
  if (tipo === "EXTERNA_ENVIO") return "Externa envio";
  return tipo;
}

export default function EmbalagensConfigClient({ dadosIniciais }: { dadosIniciais: Dados }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aba, setAba] = useState<Aba>("CLASSES");
  const [dados, setDados] = useState(dadosIniciais);
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState(
    dadosIniciais.modelos[0]?.id || ""
  );
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [simulacao, setSimulacao] =
    useState<ReturnType<typeof calcularPlanoEmbalagem> | null>(null);

  const modeloSelecionado = useMemo(() => {
    return dados.modelos.find((modelo) => modelo.id === modeloSelecionadoId) || null;
  }, [dados.modelos, modeloSelecionadoId]);

  async function recarregar() {
    const response = await fetch(API_URL);
    const data = await response.json();
    setDados(data);
    startTransition(() => router.refresh());
  }

  async function executar(operacao: () => Promise<void>, sucesso: string) {
    setErro("");
    setMensagem("");

    try {
      await operacao();
      await recarregar();
      setMensagem(sucesso);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  }

  function modelosCalculadora() {
    return dados.modelos.map((modelo) => ({
      ...modelo,
      componentes: modelo.componentes.map((componente) => ({
        itemAdicionalId: componente.itemAdicionalId,
        nome: componente.itemAdicional.nome,
        quantidade: Number(componente.quantidade || 0),
        custoBase: Number(componente.itemAdicional.custoBase || 0),
      })),
      compatibilidades: modelo.compatibilidades.map((compatibilidade) => ({
        classeId: compatibilidade.classeId,
        categoriaId: compatibilidade.categoriaId,
        produtoId: compatibilidade.produtoId,
        ativo: compatibilidade.ativo,
        prioridade: Number(compatibilidade.prioridade || 0),
        capacidadeMaximaItens: Math.max(
          1,
          Number(compatibilidade.capacidadeMaximaItens || 1)
        ),
      })),
    }));
  }

  function submitClasse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    executar(
      () =>
        requestJson("POST", {
          entidade: "CLASSE",
          nome: formData.get("nome"),
          slug: formData.get("slug"),
          descricao: formData.get("descricao"),
          ordem: numero(formData.get("ordem")),
          ativo: check(formData, "ativo"),
        }).then(() => {
          if (form.isConnected) {
            form.reset();
          }
        }),
      "Classe salva."
    );
  }

  function submitModelo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = String(formData.get("id") || "");

    const payload = {
      entidade: "MODELO",
      id,
      tipo: formData.get("tipo"),
      nomeInterno: formData.get("nomeInterno"),
      nomePublico: formData.get("nomePublico"),
      slug: formData.get("slug"),
      descricaoPublica: formData.get("descricaoPublica"),
      imagemUrl: formData.get("imagemUrl"),
      ativo: check(formData, "ativo"),
      exibirNaLoja: check(formData, "exibirNaLoja"),
      prioridade: numero(formData.get("prioridade")),
      precoCliente: numero(formData.get("precoCliente")),
      substituiEmbalagemPadrao: check(formData, "substituiEmbalagemPadrao"),
      permiteMensagem: check(formData, "permiteMensagem"),
      mensagemLimiteCaracteres: formData.get("mensagemLimiteCaracteres"),
      mensagemPlaceholder: formData.get("mensagemPlaceholder"),
      capacidadeUnidades: numero(formData.get("capacidadeUnidades"), 1),
      capacidadeCaixasInternas: formData.get("capacidadeCaixasInternas"),
      permiteMisturarClasses: check(formData, "permiteMisturarClasses"),
      pesoGramas: numero(formData.get("pesoGramas")),
      alturaCm: formData.get("alturaCm"),
      larguraCm: formData.get("larguraCm"),
      comprimentoCm: formData.get("comprimentoCm"),
      custoEstimadoManual: formData.get("custoEstimadoManual"),
    };

    executar(
      () => requestJson(id ? "PATCH" : "POST", payload),
      id ? "Modelo atualizado." : "Modelo criado."
    );
  }

  function submitComponente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    executar(
      () =>
        requestJson("POST", {
          entidade: "COMPONENTE",
          embalagemModeloId: modeloSelecionadoId,
          itemAdicionalId: formData.get("itemAdicionalId"),
          quantidade: numero(formData.get("quantidade"), 1),
          observacao: formData.get("observacao"),
        }),
      "Componente vinculado."
    );
  }

  function submitCompatibilidade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    executar(
      () =>
        requestJson("POST", {
          entidade: "COMPATIBILIDADE",
          embalagemModeloId: modeloSelecionadoId,
          classeId: formData.get("classeId"),
          categoriaId: formData.get("categoriaId"),
          produtoId: formData.get("produtoId"),
          prioridade: numero(formData.get("prioridade")),
          capacidadeMaximaItens: numero(
            formData.get("capacidadeMaximaItens"),
            1
          ),
          ativo: check(formData, "ativo"),
        }),
      "Compatibilidade criada."
    );
  }

  function remover(entidade: "COMPONENTE" | "COMPATIBILIDADE", id: string) {
    executar(
      () => requestJson("DELETE", { entidade, id }),
      "Vínculo removido."
    );
  }

  function submitConfiguracao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    executar(
      () =>
        requestJson("PATCH", {
          entidade: "CONFIGURACAO",
          id: dados.configuracao.id,
          estrategiaSelecao: formData.get("estrategiaSelecao"),
          permitirMultiplosVolumes: check(formData, "permitirMultiplosVolumes"),
          maxCaixasInternasPorEnvio: formData.get("maxCaixasInternasPorEnvio"),
        }),
      "Configuração atualizada."
    );
  }

  function submitSimulador(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const classeId = String(formData.get("classeId") || "");
    const quantidade = numero(formData.get("quantidade"), 1);
    const presente = check(formData, "presente");
    const presenteModeloId = presente
      ? String(formData.get("embalagemPresenteModeloId") || "")
      : "";

    setSimulacao(
      calcularPlanoEmbalagem({
        itens: [
          {
            produtoId: "simulado",
            nome: "Produto simulado",
            quantidade,
            embalagemClasseId: classeId || null,
            embalagemUnidades: 1,
            embalagemCompartilhavel: true,
            embalagemIndividualObrigatoria: false,
            embalagemPresenteModeloId: presenteModeloId || null,
          },
        ],
        modelos: modelosCalculadora(),
        configuracao: dados.configuracao,
      })
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          ["CLASSES", "Classes", Box],
          ["MODELOS", "Modelos", Package],
          ["COMPATIBILIDADE", "Compatibilidade", Link2],
          ["SIMULADOR", "Simulador", RefreshCcw],
        ].map(([id, label, Icon]) => (
          <button
            key={String(id)}
            type="button"
            onClick={() => setAba(id as Aba)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              aba === id
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {String(label)}
          </button>
        ))}
      </div>

      {(mensagem || erro) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            erro
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {erro || mensagem}
        </div>
      )}

      {aba === "CLASSES" && (
        <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={submitClasse}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <h2 className="text-base font-semibold text-slate-950">
              Nova classe
            </h2>
            <div className="mt-4 grid gap-3">
              <label>
                <span className={labelClass()}>Nome</span>
                <input name="nome" className={inputClass()} required />
              </label>
              <label>
                <span className={labelClass()}>Slug opcional</span>
                <input name="slug" className={inputClass()} />
              </label>
              <label>
                <span className={labelClass()}>Descrição</span>
                <textarea name="descricao" rows={3} className={inputClass()} />
              </label>
              <label>
                <span className={labelClass()}>Ordem</span>
                <input name="ordem" type="number" defaultValue="0" className={inputClass()} />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input name="ativo" type="checkbox" defaultChecked className="h-4 w-4" />
                Ativa
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Salvar classe
              </button>
            </div>
          </form>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-950">
              Classes cadastradas
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {dados.classes.map((classe) => (
                <div key={classe.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold text-slate-900">{classe.nome}</p>
                    <p className="text-xs text-slate-500">
                      {classe.slug} · ordem {classe.ordem}
                    </p>
                    {classe.descricao && (
                      <p className="mt-1 text-sm text-slate-500">{classe.descricao}</p>
                    )}
                  </div>
                  <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                    {classe.ativo ? "Ativa" : "Inativa"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {aba === "MODELOS" && (
        <section className="space-y-5">
          <form
            onSubmit={submitModelo}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-base font-semibold text-slate-950">
                Modelo de embalagem
              </h2>
              <select
                value={modeloSelecionadoId}
                onChange={(event) => setModeloSelecionadoId(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Criar novo modelo</option>
                {dados.modelos.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>
                    {modelo.nomeInterno}
                  </option>
                ))}
              </select>
            </div>
            <input name="id" type="hidden" value={modeloSelecionado?.id || ""} />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label>
                <span className={labelClass()}>Tipo</span>
                <select
                  key={`tipo-${modeloSelecionado?.id || "novo"}`}
                  name="tipo"
                  defaultValue={modeloSelecionado?.tipo || "INTERNA_PADRAO"}
                  className={inputClass()}
                >
                  <option value="INTERNA_PADRAO">Interna padrão</option>
                  <option value="INTERNA_PRESENTE">Presente</option>
                  <option value="EXTERNA_ENVIO">Externa envio</option>
                </select>
              </label>
              <label>
                <span className={labelClass()}>Nome interno</span>
                <input
                  key={`nome-${modeloSelecionado?.id || "novo"}`}
                  name="nomeInterno"
                  defaultValue={modeloSelecionado?.nomeInterno || ""}
                  className={inputClass()}
                  required
                />
              </label>
              <label>
                <span className={labelClass()}>Slug</span>
                <input
                  key={`slug-${modeloSelecionado?.id || "novo"}`}
                  name="slug"
                  defaultValue={modeloSelecionado?.slug || ""}
                  className={inputClass()}
                />
              </label>
              <label>
                <span className={labelClass()}>Nome público</span>
                <input
                  key={`publico-${modeloSelecionado?.id || "novo"}`}
                  name="nomePublico"
                  defaultValue={modeloSelecionado?.nomePublico || ""}
                  className={inputClass()}
                />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass()}>Imagem pública URL</span>
                <input
                  key={`imagem-${modeloSelecionado?.id || "novo"}`}
                  name="imagemUrl"
                  defaultValue={modeloSelecionado?.imagemUrl || ""}
                  className={inputClass()}
                />
              </label>
              <label className="md:col-span-3">
                <span className={labelClass()}>Descrição pública</span>
                <textarea
                  key={`desc-${modeloSelecionado?.id || "novo"}`}
                  name="descricaoPublica"
                  defaultValue={modeloSelecionado?.descricaoPublica || ""}
                  rows={3}
                  className={inputClass()}
                />
              </label>
              {[
                ["prioridade", "Prioridade", modeloSelecionado?.prioridade ?? 0],
                ["precoCliente", "Preço cliente", modeloSelecionado?.precoCliente ?? 0],
                ["capacidadeUnidades", "Capacidade unidades", modeloSelecionado?.capacidadeUnidades ?? 1],
                ["capacidadeCaixasInternas", "Capacidade caixas internas", modeloSelecionado?.capacidadeCaixasInternas ?? ""],
                ["pesoGramas", "Peso gramas", modeloSelecionado?.pesoGramas ?? 0],
                ["alturaCm", "Altura cm", modeloSelecionado?.alturaCm ?? ""],
                ["larguraCm", "Largura cm", modeloSelecionado?.larguraCm ?? ""],
                ["comprimentoCm", "Comprimento cm", modeloSelecionado?.comprimentoCm ?? ""],
                ["custoEstimadoManual", "Custo manual", modeloSelecionado?.custoEstimadoManual ?? ""],
                ["mensagemLimiteCaracteres", "Limite mensagem", modeloSelecionado?.mensagemLimiteCaracteres ?? ""],
              ].map(([name, label, value]) => (
                <label key={`${name}-${modeloSelecionado?.id || "novo"}`}>
                  <span className={labelClass()}>{String(label)}</span>
                  <input
                    name={String(name)}
                    type="number"
                    step="0.01"
                    defaultValue={String(value)}
                    className={inputClass()}
                  />
                </label>
              ))}
              <label className="md:col-span-2">
                <span className={labelClass()}>Placeholder mensagem</span>
                <input
                  key={`placeholder-${modeloSelecionado?.id || "novo"}`}
                  name="mensagemPlaceholder"
                  defaultValue={modeloSelecionado?.mensagemPlaceholder || ""}
                  className={inputClass()}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                ["ativo", "Ativo", modeloSelecionado?.ativo ?? true],
                ["exibirNaLoja", "Exibir na loja", modeloSelecionado?.exibirNaLoja ?? false],
                ["substituiEmbalagemPadrao", "Substitui padrão", modeloSelecionado?.substituiEmbalagemPadrao ?? false],
                ["permiteMensagem", "Permite mensagem", modeloSelecionado?.permiteMensagem ?? false],
                ["permiteMisturarClasses", "Permite misturar classes", modeloSelecionado?.permiteMisturarClasses ?? true],
              ].map(([name, label, checked]) => (
                <label
                  key={`${name}-${modeloSelecionado?.id || "novo"}`}
                  className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} />
                  {String(label)}
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="mt-4 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {modeloSelecionado ? "Atualizar modelo" : "Criar modelo"}
            </button>
          </form>

          {modeloSelecionado && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-base font-semibold text-slate-950">
                  Componentes consumidos
                </h3>
                <form onSubmit={submitComponente} className="mt-4 grid gap-3 md:grid-cols-[1fr_110px]">
                  <select name="itemAdicionalId" className={inputClass()} required>
                    <option value="">Selecionar item adicional</option>
                    {dados.itensAdicionais.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} · {moeda(item.custoBase)}
                      </option>
                    ))}
                  </select>
                  <input name="quantidade" type="number" step="0.01" defaultValue="1" className={inputClass()} />
                  <input name="observacao" placeholder="Observação" className={`${inputClass()} md:col-span-2`} />
                  <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-2">
                    Vincular componente
                  </button>
                </form>
                <div className="mt-4 divide-y divide-slate-100">
                  {modeloSelecionado.componentes.map((componente) => (
                    <div key={componente.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {componente.itemAdicional.nome}
                        </p>
                        <p className="text-xs text-slate-500">
                          {componente.quantidade} un. · {moeda(componente.itemAdicional.custoBase)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remover("COMPONENTE", componente.id)}
                        className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-base font-semibold text-slate-950">
                  Modelos cadastrados
                </h3>
                <div className="mt-4 grid gap-3">
                  {dados.modelos.map((modelo) => (
                    <button
                      key={modelo.id}
                      type="button"
                      onClick={() => setModeloSelecionadoId(modelo.id)}
                      className={`rounded-2xl border px-4 py-3 text-left ${
                        modelo.id === modeloSelecionadoId
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {modelo.nomeInterno}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {tipoLabel(modelo.tipo)} · {modelo.componentes.length} componentes · {modelo.compatibilidades.length} compat.
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {aba === "COMPATIBILIDADE" && (
        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <form onSubmit={submitCompatibilidade} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-950">
              Nova compatibilidade
            </h2>
            <div className="mt-4 grid gap-3">
              <select value={modeloSelecionadoId} onChange={(event) => setModeloSelecionadoId(event.target.value)} className={inputClass()} required>
                <option value="">Selecionar modelo</option>
                {dados.modelos.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>{modelo.nomeInterno}</option>
                ))}
              </select>
              <select name="classeId" className={inputClass()}>
                <option value="">Classe opcional</option>
                {dados.classes.map((classe) => (
                  <option key={classe.id} value={classe.id}>{classe.nome}</option>
                ))}
              </select>
              <select name="categoriaId" className={inputClass()}>
                <option value="">Categoria opcional</option>
                {dados.categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                ))}
              </select>
              <select name="produtoId" className={inputClass()}>
                <option value="">Produto específico opcional</option>
                {dados.produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>{produto.codigoInterno} · {produto.nome}</option>
                ))}
              </select>
              <label>
                <span className={labelClass()}>
                  Capacidade máxima de itens
                </span>
                <input
                  name="capacidadeMaximaItens"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue="1"
                  className={inputClass()}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Quantas unidades dessa classe cabem neste modelo de embalagem.
                </span>
              </label>
              <input name="prioridade" type="number" defaultValue="0" className={inputClass()} />
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input name="ativo" type="checkbox" defaultChecked />
                Ativa
              </label>
              <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                Salvar compatibilidade
              </button>
            </div>
          </form>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-950">
              Compatibilidades do modelo
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {(modeloSelecionado?.compatibilidades || []).map((compat) => (
                <div key={compat.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {compat.produto
                        ? `${compat.produto.codigoInterno} · ${compat.produto.nome}`
                        : compat.categoria?.nome || compat.classe?.nome || "Compatibilidade geral"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Prioridade {compat.prioridade} · Capacidade:{" "}
                      {compat.capacidadeMaximaItens || 1}{" "}
                      {(compat.capacidadeMaximaItens || 1) === 1
                        ? "item"
                        : "itens"}{" "}
                      · {compat.ativo ? "ativa" : "inativa"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover("COMPATIBILIDADE", compat.id)}
                    className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {aba === "SIMULADOR" && (
        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            <form onSubmit={submitConfiguracao} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-base font-semibold text-slate-950">
                Configuração
              </h2>
              <div className="mt-4 grid gap-3">
                <select name="estrategiaSelecao" defaultValue={dados.configuracao.estrategiaSelecao} className={inputClass()}>
                  <option value="MENOR_CUSTO_TOTAL">Menor custo total</option>
                </select>
                <input name="maxCaixasInternasPorEnvio" type="number" defaultValue={dados.configuracao.maxCaixasInternasPorEnvio ?? ""} placeholder="Máx. caixas internas por envio" className={inputClass()} />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input name="permitirMultiplosVolumes" type="checkbox" defaultChecked={dados.configuracao.permitirMultiplosVolumes} />
                  Permitir múltiplos volumes
                </label>
                <button type="submit" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold">
                  Salvar configuração
                </button>
              </div>
            </form>

            <form onSubmit={submitSimulador} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-base font-semibold text-slate-950">
                Simular pedido
              </h2>
              <div className="mt-4 grid gap-3">
                <select name="classeId" className={inputClass()}>
                  <option value="">Sem classe</option>
                  {dados.classes.map((classe) => (
                    <option key={classe.id} value={classe.id}>{classe.nome}</option>
                  ))}
                </select>
                <input name="quantidade" type="number" min="1" defaultValue="1" className={inputClass()} />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input name="presente" type="checkbox" />
                  Com embalagem presente
                </label>
                <select name="embalagemPresenteModeloId" className={inputClass()}>
                  <option value="">Selecionar presente</option>
                  {dados.modelos
                    .filter((modelo) => modelo.tipo === "INTERNA_PRESENTE")
                    .map((modelo) => (
                      <option key={modelo.id} value={modelo.id}>{modelo.nomePublico || modelo.nomeInterno}</option>
                    ))}
                </select>
                <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                  Simular
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-950">
              Resultado
            </h2>
            {!simulacao ? (
              <p className="mt-4 text-sm text-slate-500">
                Preencha os dados e rode uma simulação para ver o plano sugerido.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase text-slate-500">Custo</p>
                    <p className="mt-1 text-xl font-bold">{moeda(simulacao.custoEstimado)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase text-slate-500">Cliente</p>
                    <p className="mt-1 text-xl font-bold">{moeda(simulacao.valorEmbalagensCliente)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase text-slate-500">Peso</p>
                    <p className="mt-1 text-xl font-bold">{simulacao.pesoEstimadoGramas} g</p>
                  </div>
                </div>

                {[
                  ["Internas padrão", simulacao.embalagensInternasPadrao],
                  ["Presentes", simulacao.embalagensPresente],
                  ["Componentes", simulacao.componentes],
                ].map(([titulo, lista]) => (
                  <div key={String(titulo)}>
                    <p className="text-sm font-semibold text-slate-900">{String(titulo)}</p>
                    <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                      {(lista as typeof simulacao.componentes).map((item, index) => (
                        <div key={`${item.nome}-${index}`} className="flex justify-between gap-3 px-4 py-3 text-sm">
                          <span>{item.nome}</span>
                          <strong>{item.quantidade} un.</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Externa
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {simulacao.embalagemExterna?.nome || "Não encontrada"}
                  </p>
                </div>

                {simulacao.alertas.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {simulacao.alertas.map((alerta) => (
                      <p key={alerta}>{alerta}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />
        Esta etapa só modela embalagens e simula consumo. Checkout, carrinho,
        Melhor Envio, estoque, pedidos e loja pública não usam estes dados ainda.
      </div>
    </div>
  );
}
