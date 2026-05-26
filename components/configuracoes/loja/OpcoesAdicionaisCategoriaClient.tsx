"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Gift,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

export type CategoriaOpcaoAdicionalCategoria = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

export type CategoriaOpcaoAdicionalItemOption = {
  id: string;
  codigoInterno: string;
  nome: string;
  custoBase: number;
};

export type CategoriaOpcaoAdicionalItem = {
  id: string;
  categoriaId: string;
  categoriaNome: string;
  categoriaSlug: string;
  nome: string;
  descricao: string | null;
  itemPadraoSubstituidoId: string | null;
  itemPadraoSubstituido: CategoriaOpcaoAdicionalItemOption | null;
  itemAdicionalConsumidoId: string;
  itemAdicionalConsumido: CategoriaOpcaoAdicionalItemOption;
  valorVenda: number;
  ativo: boolean;
  criadoEm: string;
};

type FormState = {
  categoriaId: string;
  nome: string;
  descricao: string;
  itemPadraoSubstituidoId: string;
  itemAdicionalConsumidoId: string;
  valorVenda: string;
  ativo: boolean;
};

function getEstadoInicial(): FormState {
  return {
    categoriaId: "",
    nome: "Embalagem para presente",
    descricao: "Adicione uma embalagem premium ideal para presentear.",
    itemPadraoSubstituidoId: "",
    itemAdicionalConsumidoId: "",
    valorVenda: "",
    ativo: true,
  };
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function parseNumero(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();

  if (!raw) return 0;

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");
  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : 0;
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function OpcoesAdicionaisCategoriaClient({
  categorias,
  itensAdicionais,
  opcoes,
}: {
  categorias: CategoriaOpcaoAdicionalCategoria[];
  itensAdicionais: CategoriaOpcaoAdicionalItemOption[];
  opcoes: CategoriaOpcaoAdicionalItem[];
}) {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(getEstadoInicial());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const itemConsumidoSelecionado = useMemo(
    () =>
      itensAdicionais.find(
        (item) => item.id === form.itemAdicionalConsumidoId
      ) || null,
    [form.itemAdicionalConsumidoId, itensAdicionais]
  );

  const itemPadraoSelecionado = useMemo(
    () =>
      itensAdicionais.find((item) => item.id === form.itemPadraoSubstituidoId) ||
      null,
    [form.itemPadraoSubstituidoId, itensAdicionais]
  );

  const valorVenda = parseNumero(form.valorVenda);
  const custoPremium = Number(itemConsumidoSelecionado?.custoBase || 0);
  const lucroPremium = valorVenda - custoPremium;

  const opcoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return opcoes.filter((opcao) => {
      if (!termo) return true;

      const texto = normalizarTexto(
        [
          opcao.categoriaNome,
          opcao.nome,
          opcao.descricao,
          opcao.itemPadraoSubstituido?.nome,
          opcao.itemAdicionalConsumido.nome,
          opcao.itemAdicionalConsumido.codigoInterno,
        ].join(" ")
      );

      return texto.includes(termo);
    });
  }, [busca, opcoes]);

  function limparMensagens() {
    setErro("");
    setSucesso("");
  }

  function atualizarForm<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function limparForm() {
    setForm(getEstadoInicial());
    setEditandoId(null);
  }

  function editar(opcao: CategoriaOpcaoAdicionalItem) {
    limparMensagens();

    setEditandoId(opcao.id);
    setForm({
      categoriaId: opcao.categoriaId,
      nome: opcao.nome,
      descricao: opcao.descricao || "",
      itemPadraoSubstituidoId: opcao.itemPadraoSubstituidoId || "",
      itemAdicionalConsumidoId: opcao.itemAdicionalConsumidoId,
      valorVenda: String(opcao.valorVenda || ""),
      ativo: opcao.ativo,
    });
  }

  async function salvar() {
    limparMensagens();

    if (!form.categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }

    if (!form.nome.trim()) {
      setErro("Informe o nome da opção.");
      return;
    }

    if (!form.itemAdicionalConsumidoId) {
      setErro("Selecione o item premium consumido.");
      return;
    }

    setSalvando(true);

    try {
      const response = await fetch(
        editandoId
          ? `/api/configuracoes/loja/opcoes-adicionais/${editandoId}`
          : "/api/configuracoes/loja/opcoes-adicionais",
        {
          method: editandoId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao salvar opção adicional.");
        return;
      }

      setSucesso(
        editandoId
          ? "Opção adicional atualizada com sucesso."
          : "Opção adicional criada com sucesso."
      );

      limparForm();
      router.refresh();
    } catch {
      setErro("Erro ao salvar opção adicional.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(opcao: CategoriaOpcaoAdicionalItem) {
    limparMensagens();

    const confirmado = window.confirm(
      `Excluir a opção "${opcao.nome}" da categoria "${opcao.categoriaNome}"?`
    );

    if (!confirmado) return;

    setExcluindoId(opcao.id);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/opcoes-adicionais/${opcao.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao excluir opção adicional.");
        return;
      }

      setSucesso("Opção adicional excluída com sucesso.");
      router.refresh();
    } catch {
      setErro("Erro ao excluir opção adicional.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="space-y-6">
        {(erro || sucesso) && (
          <div className="space-y-3">
            {erro && (
              <div className="flex gap-3 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{erro}</p>
              </div>
            )}

            {sucesso && (
              <div className="flex gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{sucesso}</p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              {editandoId ? "Editar opção" : "Nova opção"}
            </h2>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Cadastre opções que aparecem para o cliente, como embalagem de
            presente.
          </p>

          <div className="mt-5 space-y-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Categoria
              </span>

              <select
                value={form.categoriaId}
                onChange={(event) =>
                  atualizarForm("categoriaId", event.target.value)
                }
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="">Selecione...</option>

                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.caminho}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome para o cliente
              </span>

              <input
                value={form.nome}
                onChange={(event) => atualizarForm("nome", event.target.value)}
                placeholder="Embalagem para presente"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Descrição curta
              </span>

              <textarea
                value={form.descricao}
                onChange={(event) =>
                  atualizarForm("descricao", event.target.value)
                }
                rows={3}
                placeholder="Adicione uma embalagem premium ideal para presentear."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Item padrão substituído
              </span>

              <select
                value={form.itemPadraoSubstituidoId}
                onChange={(event) =>
                  atualizarForm("itemPadraoSubstituidoId", event.target.value)
                }
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="">Nenhum / não substitui</option>

                {itensAdicionais.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigoInterno} — {item.nome} ({moeda(item.custoBase)})
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Exemplo: embalagem padrão. Quando o cliente escolher a opção,
                esse item deixa de ser consumido.
              </p>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Item premium consumido
              </span>

              <select
                value={form.itemAdicionalConsumidoId}
                onChange={(event) =>
                  atualizarForm("itemAdicionalConsumidoId", event.target.value)
                }
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="">Selecione...</option>

                {itensAdicionais.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigoInterno} — {item.nome} ({moeda(item.custoBase)})
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Exemplo: embalagem premium de presente.
              </p>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Valor de venda para o cliente
              </span>

              <input
                value={form.valorVenda}
                onChange={(event) =>
                  atualizarForm("valorVenda", event.target.value)
                }
                placeholder="Ex: 12,90"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(event) =>
                  atualizarForm("ativo", event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />

              <span>
                <span className="block">Opção ativa</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Exibir esta opção para produtos da categoria.
                </span>
              </span>
            </label>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Resumo comercial
              </p>

              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Custo premium</span>
                  <strong className="text-slate-900">
                    {moeda(custoPremium)}
                  </strong>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Venda adicional</span>
                  <strong className="text-slate-900">
                    {moeda(valorVenda)}
                  </strong>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Lucro adicional</span>
                  <strong
                    className={
                      lucroPremium < 0 ? "text-red-700" : "text-emerald-700"
                    }
                  >
                    {moeda(lucroPremium)}
                  </strong>
                </div>

                {itemPadraoSelecionado && (
                  <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
                    <span className="text-slate-500">
                      Substitui no estoque
                    </span>
                    <strong className="text-slate-900">
                      {itemPadraoSelecionado.nome}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {salvando
                  ? "Salvando..."
                  : editandoId
                  ? "Salvar alterações"
                  : "Criar opção"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={limparForm}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Opções cadastradas
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {opcoesFiltradas.length} opção
              {opcoesFiltradas.length === 1 ? "" : "ões"} encontrada
              {opcoesFiltradas.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar opção, categoria ou item..."
              className="h-11 w-full min-w-[260px] rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          {opcoesFiltradas.length === 0 ? (
            <div className="bg-slate-50 px-5 py-12 text-center">
              <Gift className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Nenhuma opção encontrada
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre uma opção como embalagem para presente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {opcoesFiltradas.map((opcao) => {
                const custoPremium = Number(
                  opcao.itemAdicionalConsumido.custoBase || 0
                );
                const lucro = Number(opcao.valorVenda || 0) - custoPremium;

                return (
                  <article
                    key={opcao.id}
                    className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                            opcao.ativo
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-slate-100 text-slate-500 ring-slate-200"
                          }`}
                        >
                          {opcao.ativo ? "Ativa" : "Inativa"}
                        </span>

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {opcao.categoriaNome}
                        </span>
                      </div>

                      <h3 className="mt-2 text-sm font-semibold text-slate-950">
                        {opcao.nome}
                      </h3>

                      {opcao.descricao && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {opcao.descricao}
                        </p>
                      )}

                      <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="font-semibold text-slate-800">
                            Consome
                          </p>
                          <p className="mt-1">
                            {opcao.itemAdicionalConsumido.codigoInterno} —{" "}
                            {opcao.itemAdicionalConsumido.nome}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="font-semibold text-slate-800">
                            Substitui
                          </p>
                          <p className="mt-1">
                            {opcao.itemPadraoSubstituido
                              ? `${opcao.itemPadraoSubstituido.codigoInterno} — ${opcao.itemPadraoSubstituido.nome}`
                              : "Nenhum item padrão"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          Custo premium:{" "}
                          <strong className="text-slate-800">
                            {moeda(custoPremium)}
                          </strong>
                        </span>

                        <span>
                          Venda adicional:{" "}
                          <strong className="text-slate-800">
                            {moeda(opcao.valorVenda)}
                          </strong>
                        </span>

                        <span>
                          Lucro adicional:{" "}
                          <strong
                            className={
                              lucro < 0 ? "text-red-700" : "text-emerald-700"
                            }
                          >
                            {moeda(lucro)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => editar(opcao)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => excluir(opcao)}
                        disabled={excluindoId === opcao.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {excluindoId === opcao.id ? "Excluindo" : "Excluir"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}