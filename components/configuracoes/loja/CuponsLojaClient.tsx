"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";

export type CupomLojaItem = {
  id: string;
  codigo: string;
  nome: string | null;
  tipo: string;
  valor: number;
  valorMinimoPedido: number;
  ativo: boolean;
  dataInicio: string | null;
  dataFim: string | null;
  limiteUsoTotal: number | null;
  limiteUsoPorCliente: number | null;
  quantidadeUsada: number;
  bloqueiaCashback: boolean;
  criadoEm: string;
};

type FormState = {
  codigo: string;
  nome: string;
  tipo: string;
  valor: string;
  valorMinimoPedido: string;
  ativo: boolean;
  dataInicio: string;
  dataFim: string;
  limiteUsoTotal: string;
  limiteUsoPorCliente: string;
  bloqueiaCashback: boolean;
};

function getEstadoInicial(): FormState {
  return {
    codigo: "",
    nome: "",
    tipo: "PERCENTUAL",
    valor: "",
    valorMinimoPedido: "",
    ativo: true,
    dataInicio: "",
    dataFim: "",
    limiteUsoTotal: "",
    limiteUsoPorCliente: "",
    bloqueiaCashback: true,
  };
}

function moeda(valor: number) {
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

function dataInput(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function formatarData(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function numeroParaInput(value: number | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value).replace(".", ",");
}

function formatarTipo(tipo: string) {
  if (tipo === "PERCENTUAL") return "Percentual";
  if (tipo === "VALOR_FIXO") return "Valor fixo";
  if (tipo === "FRETE_GRATIS") return "Frete grátis";

  return tipo;
}

function formatarValorCupom(cupom: CupomLojaItem) {
  if (cupom.tipo === "PERCENTUAL") {
    return `${cupom.valor}%`;
  }

  if (cupom.tipo === "VALOR_FIXO") {
    return moeda(cupom.valor);
  }

  if (cupom.tipo === "FRETE_GRATIS") {
    return "Frete grátis";
  }

  return String(cupom.valor);
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function CuponsLojaClient({
  cupons,
}: {
  cupons: CupomLojaItem[];
}) {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(getEstadoInicial());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const cuponsFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return cupons.filter((cupom) => {
      if (!termo) return true;

      const texto = normalizarTexto(
        [
          cupom.codigo,
          cupom.nome,
          cupom.tipo,
          cupom.ativo ? "ativo" : "inativo",
          cupom.bloqueiaCashback ? "bloqueia cashback" : "permite cashback",
        ].join(" ")
      );

      return texto.includes(termo);
    });
  }, [busca, cupons]);

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

  function editar(cupom: CupomLojaItem) {
    limparMensagens();

    setEditandoId(cupom.id);
    setForm({
      codigo: cupom.codigo,
      nome: cupom.nome || "",
      tipo: cupom.tipo,
      valor: numeroParaInput(cupom.valor),
      valorMinimoPedido: numeroParaInput(cupom.valorMinimoPedido),
      ativo: cupom.ativo,
      dataInicio: dataInput(cupom.dataInicio),
      dataFim: dataInput(cupom.dataFim),
      limiteUsoTotal: cupom.limiteUsoTotal ? String(cupom.limiteUsoTotal) : "",
      limiteUsoPorCliente: cupom.limiteUsoPorCliente
        ? String(cupom.limiteUsoPorCliente)
        : "",
      bloqueiaCashback: cupom.bloqueiaCashback,
    });
  }

  async function salvar() {
    limparMensagens();

    if (!form.codigo.trim()) {
      setErro("Informe o código do cupom.");
      return;
    }

    if (form.tipo !== "FRETE_GRATIS" && !form.valor.trim()) {
      setErro("Informe o valor do cupom.");
      return;
    }

    setSalvando(true);

    try {
      const response = await fetch(
        editandoId
          ? `/api/configuracoes/loja/cupons/${editandoId}`
          : "/api/configuracoes/loja/cupons",
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
        setErro(data.error || "Erro ao salvar cupom.");
        return;
      }

      setSucesso(
        editandoId ? "Cupom atualizado com sucesso." : "Cupom criado com sucesso."
      );

      limparForm();
      router.refresh();
    } catch {
      setErro("Erro ao salvar cupom.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(cupom: CupomLojaItem) {
    limparMensagens();

    const confirmado = window.confirm(
      `Excluir ou inativar o cupom "${cupom.codigo}"?`
    );

    if (!confirmado) return;

    setExcluindoId(cupom.id);

    try {
      const response = await fetch(`/api/configuracoes/loja/cupons/${cupom.id}`, {
        method: "DELETE",
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao excluir cupom.");
        return;
      }

      setSucesso(
        data.inativado
          ? "Cupom já usado. Ele foi inativado."
          : "Cupom excluído com sucesso."
      );

      router.refresh();
    } catch {
      setErro("Erro ao excluir cupom.");
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
            <TicketPercent className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              {editandoId ? "Editar cupom" : "Novo cupom"}
            </h2>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Cadastre cupons promocionais e defina se eles bloqueiam cashback.
          </p>

          <div className="mt-5 space-y-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Código
              </span>

              <input
                value={form.codigo}
                onChange={(event) =>
                  atualizarForm("codigo", event.target.value.toUpperCase())
                }
                placeholder="Ex: PRIMEIRA10"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm uppercase outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno
              </span>

              <input
                value={form.nome}
                onChange={(event) => atualizarForm("nome", event.target.value)}
                placeholder="Ex: Cupom de primeira compra"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tipo
              </span>

              <select
                value={form.tipo}
                onChange={(event) => atualizarForm("tipo", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="PERCENTUAL">Percentual</option>
                <option value="VALOR_FIXO">Valor fixo</option>
                <option value="FRETE_GRATIS">Frete grátis</option>
              </select>
            </label>

            {form.tipo !== "FRETE_GRATIS" && (
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Valor
                </span>

                <input
                  value={form.valor}
                  onChange={(event) => atualizarForm("valor", event.target.value)}
                  placeholder={form.tipo === "PERCENTUAL" ? "Ex: 10" : "Ex: 30,00"}
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            )}

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Valor mínimo do pedido
              </span>

              <input
                value={form.valorMinimoPedido}
                onChange={(event) =>
                  atualizarForm("valorMinimoPedido", event.target.value)
                }
                placeholder="Opcional. Ex: 149,90"
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Início
                </span>

                <input
                  type="date"
                  value={form.dataInicio}
                  onChange={(event) =>
                    atualizarForm("dataInicio", event.target.value)
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Fim
                </span>

                <input
                  type="date"
                  value={form.dataFim}
                  onChange={(event) =>
                    atualizarForm("dataFim", event.target.value)
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Limite total
                </span>

                <input
                  value={form.limiteUsoTotal}
                  onChange={(event) =>
                    atualizarForm("limiteUsoTotal", event.target.value)
                  }
                  placeholder="Opcional"
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Limite por cliente
                </span>

                <input
                  value={form.limiteUsoPorCliente}
                  onChange={(event) =>
                    atualizarForm("limiteUsoPorCliente", event.target.value)
                  }
                  placeholder="Opcional"
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(event) => atualizarForm("ativo", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />

              <span>
                <span className="block">Cupom ativo</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  Quando desativado, o cupom não poderá ser aplicado.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              <input
                type="checkbox"
                checked={form.bloqueiaCashback}
                onChange={(event) =>
                  atualizarForm("bloqueiaCashback", event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-amber-300"
              />

              <span>
                <span className="block">Bloquear cashback</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-amber-800">
                  Recomendado: cupom aplicado não deve acumular cashback.
                </span>
              </span>
            </label>

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
                  : "Criar cupom"}
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
              Cupons cadastrados
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {cuponsFiltrados.length} cupom
              {cuponsFiltrados.length === 1 ? "" : "s"} encontrado
              {cuponsFiltrados.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar cupom..."
              className="h-11 w-full min-w-[260px] rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          {cuponsFiltrados.length === 0 ? (
            <div className="bg-slate-50 px-5 py-12 text-center">
              <TicketPercent className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                {cupons.length === 0
                  ? "Nenhum cupom cadastrado ainda"
                  : "Nenhum cupom encontrado"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {cupons.length === 0
                  ? "Crie cupons para campanhas e descontos da loja online."
                  : "Ajuste a busca para encontrar outros cupons."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {cuponsFiltrados.map((cupom) => (
                <article
                  key={cupom.id}
                  className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                          cupom.ativo
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }`}
                      >
                        {cupom.ativo ? "Ativo" : "Inativo"}
                      </span>

                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {formatarTipo(cupom.tipo)}
                      </span>

                      {cupom.bloqueiaCashback && (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          Bloqueia cashback
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-semibold text-slate-950">
                      {cupom.codigo}
                    </h3>

                    {cupom.nome && (
                      <p className="mt-1 text-sm text-slate-500">
                        {cupom.nome}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Valor:{" "}
                        <strong className="text-slate-800">
                          {formatarValorCupom(cupom)}
                        </strong>
                      </span>

                      <span>
                        Pedido mínimo:{" "}
                        <strong className="text-slate-800">
                          {moeda(cupom.valorMinimoPedido)}
                        </strong>
                      </span>

                      <span>
                        Usos:{" "}
                        <strong className="text-slate-800">
                          {cupom.quantidadeUsada}
                          {cupom.limiteUsoTotal
                            ? `/${cupom.limiteUsoTotal}`
                            : ""}
                        </strong>
                      </span>

                      <span>
                        Período:{" "}
                        <strong className="text-slate-800">
                          {formatarData(cupom.dataInicio)} até{" "}
                          {formatarData(cupom.dataFim)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => editar(cupom)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => excluir(cupom)}
                      disabled={excluindoId === cupom.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {excluindoId === cupom.id ? "Excluindo" : "Excluir"}
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
