"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Link2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

export type ProdutoCanalProdutoOption = {
  id: string;
  codigoInterno: string;
  nome: string;
  imagemUrl: string | null;
  precoVenda: number;
  ativo: boolean;
};

export type ProdutoCanalItem = {
  id: string;
  produtoId: string;
  canal: string;
  skuExterno: string | null;
  produtoExternoId: string | null;
  variacaoExternaId: string | null;
  tituloExterno: string | null;
  precoCanal: number | null;
  estoqueAnunciado: number | null;
  sincronizarEstoque: boolean;
  sincronizarPreco: boolean;
  ativo: boolean;
  ultimaSincronizacaoEm: string | null;
  criadoEm: string;
  produto: ProdutoCanalProdutoOption;
};

const CANAIS = [
  { value: "MERCADO_LIVRE", label: "Mercado Livre" },
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
  { value: "OUTRO", label: "Outro" },
];

type FormState = {
  produtoId: string;
  canal: string;
  skuExterno: string;
  produtoExternoId: string;
  variacaoExternaId: string;
  tituloExterno: string;
  precoCanal: string;
  estoqueAnunciado: string;
  sincronizarEstoque: boolean;
  sincronizarPreco: boolean;
  ativo: boolean;
};

function getEstadoInicial(): FormState {
  return {
    produtoId: "",
    canal: "MERCADO_LIVRE",
    skuExterno: "",
    produtoExternoId: "",
    variacaoExternaId: "",
    tituloExterno: "",
    precoCanal: "",
    estoqueAnunciado: "",
    sincronizarEstoque: true,
    sincronizarPreco: false,
    ativo: true,
  };
}

function canalLabel(canal: string) {
  return CANAIS.find((item) => item.value === canal)?.label || canal;
}

function getCanalClass(canal: string) {
  switch (canal) {
    case "MERCADO_LIVRE":
      return "bg-yellow-50 text-yellow-800 ring-yellow-200";
    case "SHOPEE":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "TIKTOK_SHOP":
      return "bg-zinc-100 text-zinc-800 ring-zinc-300";
    case "OUTRO":
      return "bg-purple-50 text-purple-700 ring-purple-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function moeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
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

export default function ProdutosCanaisClient({
  produtos,
  vinculos,
}: {
  produtos: ProdutoCanalProdutoOption[];
  vinculos: ProdutoCanalItem[];
}) {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [canalFiltro, setCanalFiltro] = useState("TODOS");
  const [form, setForm] = useState<FormState>(getEstadoInicial());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const vinculosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return vinculos.filter((vinculo) => {
      const combinaCanal =
        canalFiltro === "TODOS" || vinculo.canal === canalFiltro;

      const combinaBusca =
        !termo ||
        normalizarTexto(vinculo.produto.codigoInterno).includes(termo) ||
        normalizarTexto(vinculo.produto.nome).includes(termo) ||
        normalizarTexto(vinculo.skuExterno).includes(termo) ||
        normalizarTexto(vinculo.produtoExternoId).includes(termo) ||
        normalizarTexto(vinculo.variacaoExternaId).includes(termo) ||
        normalizarTexto(vinculo.tituloExterno).includes(termo);

      return combinaCanal && combinaBusca;
    });
  }, [busca, canalFiltro, vinculos]);

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

  function editar(vinculo: ProdutoCanalItem) {
    limparMensagens();

    setEditandoId(vinculo.id);
    setForm({
      produtoId: vinculo.produtoId,
      canal: vinculo.canal,
      skuExterno: vinculo.skuExterno || "",
      produtoExternoId: vinculo.produtoExternoId || "",
      variacaoExternaId: vinculo.variacaoExternaId || "",
      tituloExterno: vinculo.tituloExterno || "",
      precoCanal:
        vinculo.precoCanal === null || vinculo.precoCanal === undefined
          ? ""
          : String(vinculo.precoCanal),
      estoqueAnunciado:
        vinculo.estoqueAnunciado === null ||
        vinculo.estoqueAnunciado === undefined
          ? ""
          : String(vinculo.estoqueAnunciado),
      sincronizarEstoque: vinculo.sincronizarEstoque,
      sincronizarPreco: vinculo.sincronizarPreco,
      ativo: vinculo.ativo,
    });
  }

  async function salvar() {
    limparMensagens();

    if (!form.produtoId) {
      setErro("Selecione um produto do Stella.");
      return;
    }

    if (!form.skuExterno.trim() && !form.produtoExternoId.trim()) {
      setErro("Informe ao menos o SKU externo ou o ID externo do produto.");
      return;
    }

    setSalvando(true);

    try {
      const response = await fetch(
        editandoId
          ? `/api/configuracoes/integracoes/produtos-canais/${editandoId}`
          : "/api/configuracoes/integracoes/produtos-canais",
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
        setErro(data.error || "Erro ao salvar vínculo.");
        return;
      }

      setSucesso(
        editandoId
          ? "Vínculo atualizado com sucesso."
          : "Vínculo criado com sucesso."
      );

      limparForm();
      router.refresh();
    } catch {
      setErro("Erro ao salvar vínculo.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(vinculo: ProdutoCanalItem) {
    limparMensagens();

    const confirmado = window.confirm(
      `Excluir o vínculo do produto "${vinculo.produto.nome}" com ${canalLabel(
        vinculo.canal
      )}?`
    );

    if (!confirmado) {
      return;
    }

    setExcluindoId(vinculo.id);

    try {
      const response = await fetch(
        `/api/configuracoes/integracoes/produtos-canais/${vinculo.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao excluir vínculo.");
        return;
      }

      setSucesso("Vínculo excluído com sucesso.");
      router.refresh();
    } catch {
      setErro("Erro ao excluir vínculo.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
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
            <Link2 className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              {editandoId ? "Editar vínculo" : "Novo vínculo"}
            </h2>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Relacione um produto interno com o SKU ou ID usado no canal externo.
          </p>

          <div className="mt-5 space-y-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Produto Stella
              </span>

              <select
                value={form.produtoId}
                onChange={(event) => atualizarForm("produtoId", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="">Selecione...</option>

                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.codigoInterno} — {produto.nome}
                    {!produto.ativo ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Canal
              </span>

              <select
                value={form.canal}
                onChange={(event) => atualizarForm("canal", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                {CANAIS.map((canal) => (
                  <option key={canal.value} value={canal.value}>
                    {canal.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  SKU externo
                </span>

                <input
                  value={form.skuExterno}
                  onChange={(event) =>
                    atualizarForm("skuExterno", event.target.value)
                  }
                  placeholder="SKU usado no canal"
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  ID do produto externo
                </span>

                <input
                  value={form.produtoExternoId}
                  onChange={(event) =>
                    atualizarForm("produtoExternoId", event.target.value)
                  }
                  placeholder="ID do anúncio/produto"
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            </div>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                ID da variação externa
              </span>

              <input
                value={form.variacaoExternaId}
                onChange={(event) =>
                  atualizarForm("variacaoExternaId", event.target.value)
                }
                placeholder="Tamanho/cor/modelo no canal, se houver"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Título externo
              </span>

              <input
                value={form.tituloExterno}
                onChange={(event) =>
                  atualizarForm("tituloExterno", event.target.value)
                }
                placeholder="Nome do anúncio no marketplace"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Preço no canal
                </span>

                <input
                  value={form.precoCanal}
                  onChange={(event) =>
                    atualizarForm("precoCanal", event.target.value)
                  }
                  placeholder="0,00"
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Estoque anunciado
                </span>

                <input
                  value={form.estoqueAnunciado}
                  onChange={(event) =>
                    atualizarForm("estoqueAnunciado", event.target.value)
                  }
                  placeholder="Ex: 5"
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.sincronizarEstoque}
                  onChange={(event) =>
                    atualizarForm("sincronizarEstoque", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block">Sincronizar estoque</span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                    Usar no futuro para atualizar estoque do canal.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.sincronizarPreco}
                  onChange={(event) =>
                    atualizarForm("sincronizarPreco", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block">Sincronizar preço</span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                    Deixe desligado no começo.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) => atualizarForm("ativo", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <span>
                  <span className="block">Vínculo ativo</span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                    Usar este vínculo na importação.
                  </span>
                </span>
              </label>
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
                  : "Criar vínculo"}
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
              Vínculos cadastrados
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {vinculosFiltrados.length} vínculo
              {vinculosFiltrados.length === 1 ? "" : "s"} encontrado
              {vinculosFiltrados.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar SKU, produto ou ID..."
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
              />
            </div>

            <select
              value={canalFiltro}
              onChange={(event) => setCanalFiltro(event.target.value)}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="TODOS">Todos os canais</option>

              {CANAIS.map((canal) => (
                <option key={canal.value} value={canal.value}>
                  {canal.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          {vinculosFiltrados.length === 0 ? (
            <div className="bg-slate-50 px-5 py-12 text-center">
              <Link2 className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Nenhum vínculo encontrado
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre o primeiro vínculo para mapear SKUs externos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {vinculosFiltrados.map((vinculo) => (
                <article
                  key={vinculo.id}
                  className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1fr_auto]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                      {vinculo.produto.imagemUrl ? (
                        <img
                          src={vinculo.produto.imagemUrl}
                          alt={vinculo.produto.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${getCanalClass(
                            vinculo.canal
                          )}`}
                        >
                          {canalLabel(vinculo.canal)}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                            vinculo.ativo
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-slate-100 text-slate-500 ring-slate-200"
                          }`}
                        >
                          {vinculo.ativo ? "Ativo" : "Inativo"}
                        </span>

                        {vinculo.sincronizarEstoque && (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                            Estoque
                          </span>
                        )}

                        {vinculo.sincronizarPreco && (
                          <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                            Preço
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-sm font-semibold text-slate-950">
                        {vinculo.produto.codigoInterno} — {vinculo.produto.nome}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {vinculo.tituloExterno || "Sem título externo"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {vinculo.skuExterno && (
                          <span>
                            SKU externo:{" "}
                            <strong className="text-slate-800">
                              {vinculo.skuExterno}
                            </strong>
                          </span>
                        )}

                        {vinculo.produtoExternoId && (
                          <span>
                            Produto externo:{" "}
                            <strong className="text-slate-800">
                              {vinculo.produtoExternoId}
                            </strong>
                          </span>
                        )}

                        {vinculo.variacaoExternaId && (
                          <span>
                            Variação:{" "}
                            <strong className="text-slate-800">
                              {vinculo.variacaoExternaId}
                            </strong>
                          </span>
                        )}

                        <span>
                          Preço canal:{" "}
                          <strong className="text-slate-800">
                            {moeda(vinculo.precoCanal)}
                          </strong>
                        </span>

                        <span>
                          Estoque anunciado:{" "}
                          <strong className="text-slate-800">
                            {vinculo.estoqueAnunciado ?? "—"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => editar(vinculo)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => excluir(vinculo)}
                      disabled={excluindoId === vinculo.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {excluindoId === vinculo.id ? "Excluindo" : "Excluir"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}