"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  Package,
  RefreshCcw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import ImageBox from "@/components/ui/ImageBox";

type ProdutoStatus = "ATIVO" | "INATIVO" | "NA_LIXEIRA" | string;

type ProdutoFamiliaOption = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  ordem: number;
};

type ProdutoCatalogItem = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  imagemUrl?: string | null;
  categoria: string;
  fornecedorPadrao: string;

  custoBase: number;
  custoAdicionais: number;
  quantidadeAdicionais: number;
  custoTotal: number;

  margemAplicada: number;
  precoVenda: number;

  descontoAtivo: boolean;
  precoPromocional?: number | null;

  lucroBruto: number;
  margemBruta: number;

  ativo: boolean;
  status: ProdutoStatus;
  statusAntesLixeira?: string | null;
  linkCompra?: string | null;
  estoqueAtual: number;
  valorEstoque: number;
  totalVendas: number;

  familiaId?: string | null;
  familiaNome?: string | null;
  familiaSlug?: string | null;
  familiaMaterial?: string | null;
  familiaCorJoia?: string | null;
  familiaImagemUrl?: string | null;
  familiaOrdem?: number;
};

type ProdutoAgrupamentoFormItem = {
  produtoId: string;
  familiaMaterial: string;
  familiaCorJoia: string;
  familiaImagemUrl: string;
  familiaOrdem: number;
};

const STATUS_OPTIONS = [
  { value: "ATIVOS", label: "Ativos" },
  { value: "TODOS", label: "Todos" },
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "NA_LIXEIRA", label: "Na lixeira" },
];

const MATERIAIS_JOIA = [
  "",
  "Prata",
  "Ouro",
  "Dourado",
  "Ródio branco",
  "Ródio negro",
  "Banho ouro",
];

const CORES_JOIA = [
  "",
  "Vermelha",
  "Azul",
  "Rosa",
  "Verde",
  "Cristal",
  "Preta",
  "Branca",
  "Pérola",
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function percentual(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor || 0);
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function labelStatus(status: string) {
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Oculto";
  if (status === "NA_LIXEIRA") return "Na lixeira";

  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "ATIVO") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "INATIVO") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  if (status === "NA_LIXEIRA") {
    return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusIcon(status: string) {
  if (status === "ATIVO") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }

  if (status === "NA_LIXEIRA") {
    return <Trash2 className="h-3.5 w-3.5" />;
  }

  return <Archive className="h-3.5 w-3.5" />;
}

function getStatusProduto(produto: ProdutoCatalogItem) {
  if (produto.status === "NA_LIXEIRA") {
    return "NA_LIXEIRA";
  }

  return produto.ativo ? "ATIVO" : "INATIVO";
}

function produtoTemDesconto(produto: ProdutoCatalogItem) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional !== undefined &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function getPrecoEfetivo(produto: ProdutoCatalogItem) {
  if (produtoTemDesconto(produto) && produto.precoPromocional) {
    return produto.precoPromocional;
  }

  return produto.precoVenda;
}

function getPercentualDesconto(produto: ProdutoCatalogItem) {
  if (!produtoTemDesconto(produto) || !produto.precoPromocional) {
    return null;
  }

  return Math.round(
    ((produto.precoVenda - produto.precoPromocional) / produto.precoVenda) *
      100
  );
}

function getLucroEfetivo(produto: ProdutoCatalogItem) {
  return getPrecoEfetivo(produto) - produto.custoTotal;
}

function getMargemEfetiva(produto: ProdutoCatalogItem) {
  const precoEfetivo = getPrecoEfetivo(produto);

  if (precoEfetivo <= 0) {
    return 0;
  }

  return ((precoEfetivo - produto.custoTotal) / precoEfetivo) * 100;
}

function getNomeVersaoFamilia(produto: ProdutoCatalogItem) {
  const partes = [produto.familiaMaterial, produto.familiaCorJoia]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return partes.length > 0 ? partes.join(" · ") : "Versão sem nome";
}

export default function ProdutosCatalogClient({
  produtos,
  familiasDisponiveis = [],
}: {
  produtos: ProdutoCatalogItem[];
  familiasDisponiveis?: ProdutoFamiliaOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("ATIVOS");
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>(
    []
  );
  const [erroLixeira, setErroLixeira] = useState<string | null>(null);

  const [modalFamiliaAberto, setModalFamiliaAberto] = useState(false);
  const [familiaSelecionadaId, setFamiliaSelecionadaId] = useState("");
  const [novaFamiliaNome, setNovaFamiliaNome] = useState("");
  const [itensAgrupamento, setItensAgrupamento] = useState<
    ProdutoAgrupamentoFormItem[]
  >([]);
  const [erroFamilia, setErroFamilia] = useState<string | null>(null);
  const [salvandoFamilia, setSalvandoFamilia] = useState(false);

  const produtosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return produtos.filter((produto) => {
      const statusProduto = getStatusProduto(produto);

      if (statusSelecionado === "ATIVOS" && statusProduto === "NA_LIXEIRA") {
        return false;
      }

      if (
        statusSelecionado !== "ATIVOS" &&
        statusSelecionado !== "TODOS" &&
        statusProduto !== statusSelecionado
      ) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const texto = normalizarTexto(
        [
          produto.nome,
          produto.codigoInterno,
          produto.codigoFornecedor,
          produto.categoria,
          produto.fornecedorPadrao,
          produto.familiaNome,
          produto.familiaMaterial,
          produto.familiaCorJoia,
          statusProduto,
          produtoTemDesconto(produto) ? "desconto promoção promocional" : "",
          produto.custoAdicionais > 0 ? "adicionais pacote contém" : "",
        ].join(" ")
      );

      return texto.includes(termo);
    });
  }, [busca, produtos, statusSelecionado]);

  const produtosSelecionaveis = useMemo(() => {
    return produtosFiltrados.filter(
      (produto) => getStatusProduto(produto) !== "NA_LIXEIRA"
    );
  }, [produtosFiltrados]);

  const produtosSelecionadosObjetos = useMemo(() => {
    const selecionados = new Set(produtosSelecionados);

    return produtos.filter((produto) => selecionados.has(produto.id));
  }, [produtos, produtosSelecionados]);

  const todosSelecionados =
    produtosSelecionaveis.length > 0 &&
    produtosSelecionaveis.every((produto) =>
      produtosSelecionados.includes(produto.id)
    );

  const quantidadeSelecionada = produtosSelecionados.length;

  function limparFiltros() {
    setBusca("");
    setStatusSelecionado("ATIVOS");
    setProdutosSelecionados([]);
  }

  function alternarProdutoSelecionado(produtoId: string) {
    setProdutosSelecionados((selecionados) => {
      if (selecionados.includes(produtoId)) {
        return selecionados.filter((id) => id !== produtoId);
      }

      return [...selecionados, produtoId];
    });
  }

  function alternarTodosSelecionados() {
    if (todosSelecionados) {
      setProdutosSelecionados([]);
      return;
    }

    setProdutosSelecionados(produtosSelecionaveis.map((produto) => produto.id));
  }

  function abrirModalFamilia() {
    if (produtosSelecionadosObjetos.length === 0) {
      return;
    }

    const familiaIdBase =
      produtosSelecionadosObjetos.find((produto) => produto.familiaId)
        ?.familiaId || "";

    setFamiliaSelecionadaId(familiaIdBase);
    setNovaFamiliaNome("");

    setItensAgrupamento(
      produtosSelecionadosObjetos.map((produto, index) => ({
        produtoId: produto.id,
        familiaMaterial: produto.familiaMaterial || "",
        familiaCorJoia: produto.familiaCorJoia || "",
        familiaImagemUrl: produto.familiaImagemUrl || produto.imagemUrl || "",
        familiaOrdem: Number.isFinite(Number(produto.familiaOrdem))
          ? Number(produto.familiaOrdem)
          : index,
      }))
    );

    setErroFamilia(null);
    setModalFamiliaAberto(true);
  }

  function fecharModalFamilia() {
    if (salvandoFamilia) {
      return;
    }

    setModalFamiliaAberto(false);
    setErroFamilia(null);
  }

  function atualizarItemAgrupamento(
    produtoId: string,
    campo: keyof ProdutoAgrupamentoFormItem,
    value: string | number
  ) {
    setItensAgrupamento((atuais) =>
      atuais.map((item) =>
        item.produtoId === produtoId
          ? {
              ...item,
              [campo]: value,
            }
          : item
      )
    );
  }

  async function salvarAgrupamentoFamilia() {
    setErroFamilia(null);

    if (!familiaSelecionadaId && !novaFamiliaNome.trim()) {
      setErroFamilia(
        "Selecione uma família existente ou informe o nome de uma nova família."
      );
      return;
    }

    if (itensAgrupamento.length === 0) {
      setErroFamilia("Selecione pelo menos um produto para agrupar.");
      return;
    }

    setSalvandoFamilia(true);

    try {
      const response = await fetch("/api/produtos/familias/agrupar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familiaId: familiaSelecionadaId || null,
          familiaNome: novaFamiliaNome.trim() || null,
          produtos: itensAgrupamento,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroFamilia(data.error || "Erro ao agrupar produtos.");
        return;
      }

      setModalFamiliaAberto(false);
      setProdutosSelecionados([]);

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      setErroFamilia("Erro ao agrupar produtos.");
    } finally {
      setSalvandoFamilia(false);
    }
  }

  async function moverParaLixeira(produto: ProdutoCatalogItem) {
    const confirmado = window.confirm(
      `Mover o produto ${produto.codigoInterno} para a lixeira? Isso não apaga imagem, estoque ou movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    const response = await fetch(`/api/produtos/${produto.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "MOVER" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao mover produto para a lixeira.");
      return;
    }

    setProdutosSelecionados((selecionados) =>
      selecionados.filter((id) => id !== produto.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverSelecionadosParaLixeira() {
    if (produtosSelecionados.length === 0) {
      return;
    }

    const confirmado = window.confirm(
      `Mover ${produtosSelecionados.length} produto${
        produtosSelecionados.length > 1 ? "s" : ""
      } para a lixeira? Isso não apaga imagens, estoque ou movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    for (const produtoId of produtosSelecionados) {
      const response = await fetch(`/api/produtos/${produtoId}/lixeira`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acao: "MOVER" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroLixeira(data.error || "Erro ao mover produtos para a lixeira.");
        return;
      }
    }

    setProdutosSelecionados([]);

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarDaLixeira(produto: ProdutoCatalogItem) {
    setErroLixeira(null);

    const response = await fetch(`/api/produtos/${produto.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao restaurar produto.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function alternarVisibilidadeLoja(produto: ProdutoCatalogItem) {
    const proximoAtivo = !produto.ativo;
    const confirmado = window.confirm(
      proximoAtivo
        ? `Ativar o produto ${produto.codigoInterno} na loja pública?`
        : `Ocultar o produto ${produto.codigoInterno} da loja pública? Ele continuará cadastrado no sistema.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    const response = await fetch(`/api/produtos/${produto.id}/ativo`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ativo: proximoAtivo }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao alterar visibilidade do produto.");
      return;
    }

    setProdutosSelecionados((selecionados) =>
      selecionados.filter((id) => id !== produto.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Produtos
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Catálogo de Produtos
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Visualize preço, custo, adicionais, lucro, estoque e status dos
              produtos cadastrados.
            </p>
          </div>

          <Link
            href="/produtos/novo"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Novo produto
          </Link>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Pesquisar
            </span>

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar por nome, código, categoria, família ou fornecedor"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4 text-slate-400" />
              Status
            </span>

            <select
              value={statusSelecionado}
              onChange={(event) => {
                setStatusSelecionado(event.target.value);
                setProdutosSelecionados([]);
              }}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limparFiltros}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </button>
          </div>
        </div>

        {erroLixeira && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {erroLixeira}
          </div>
        )}
      </div>

      {quantidadeSelecionada > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {quantidadeSelecionada} produto
                {quantidadeSelecionada > 1
                  ? "s selecionados"
                  : " selecionado"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Agrupe versões da mesma joia ou envie produtos selecionados para
                a lixeira.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={abrirModalFamilia}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Tag className="h-4 w-4" />
                Agrupar como família
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={moverSelecionadosParaLixeira}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Enviar para lixeira
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {produtosFiltrados.length} produto
            {produtosFiltrados.length === 1 ? "" : "s"} encontrado
            {produtosFiltrados.length === 1 ? "" : "s"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Use os checkboxes dos cards para ações em lote.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={todosSelecionados}
            disabled={produtosSelecionaveis.length === 0}
            onChange={alternarTodosSelecionados}
            className="h-4 w-4 rounded border-slate-300"
          />
          Selecionar todos visíveis
        </label>
      </div>

      {produtosFiltrados.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          Nenhum produto encontrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {produtosFiltrados.map((produto) => {
            const statusProduto = getStatusProduto(produto);
            const produtoNaLixeira = statusProduto === "NA_LIXEIRA";
            const emDesconto = produtoTemDesconto(produto);
            const percentualDesconto = getPercentualDesconto(produto);
            const precoEfetivo = getPrecoEfetivo(produto);
            const lucroEfetivo = getLucroEfetivo(produto);
            const margemEfetiva = getMargemEfetiva(produto);
            const possuiFamilia = Boolean(produto.familiaId);

            return (
              <div
                key={produto.id}
                className={`relative flex h-full flex-col overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-1 ${
                  emDesconto ? "ring-amber-200" : "ring-slate-200"
                } ${produtoNaLixeira ? "opacity-75" : ""}`}
              >
                <div className="absolute left-4 top-4 z-10 rounded-xl bg-white/90 px-2 py-1 shadow-sm">
                  <input
                    type="checkbox"
                    checked={produtosSelecionados.includes(produto.id)}
                    disabled={produtoNaLixeira}
                    onChange={() => alternarProdutoSelecionado(produto.id)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Selecionar produto ${produto.codigoInterno}`}
                  />
                </div>

                <div className="relative">
                  <ImageBox src={produto.imagemUrl} alt={produto.nome} />

                  {emDesconto && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                      <Tag className="h-3.5 w-3.5" />
                      {percentualDesconto
                        ? `-${percentualDesconto}%`
                        : "Desconto"}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {produto.codigoInterno}
                      </p>

                      <h2 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">
                        {produto.nome}
                      </h2>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {produto.categoria}
                        </span>

                        {possuiFamilia && (
                          <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                            Família: {produto.familiaNome}
                          </span>
                        )}

                        {produto.familiaMaterial && (
                          <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            Material: {produto.familiaMaterial}
                          </span>
                        )}

                        {produto.familiaCorJoia && (
                          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                            Cor: {produto.familiaCorJoia}
                          </span>
                        )}

                        {produto.custoAdicionais > 0 && (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            <Package className="mr-1 h-3.5 w-3.5" />
                            {produto.quantidadeAdicionais} adicional
                            {produto.quantidadeAdicionais === 1 ? "" : "is"}
                          </span>
                        )}

                        {emDesconto && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            <Tag className="h-3.5 w-3.5" />
                            Em desconto
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${statusClass(
                        statusProduto
                      )}`}
                    >
                      {statusIcon(statusProduto)}
                      {labelStatus(statusProduto)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Venda
                        </p>

                        <p className="mt-1 text-xl font-bold text-slate-950">
                          {moeda(produto.precoVenda)}
                        </p>

                        {emDesconto && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Promo: {moeda(precoEfetivo)}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Lucro
                        </p>

                        <p
                          className={`mt-1 text-base font-bold ${
                            lucroEfetivo < 0
                              ? "text-red-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {moeda(lucroEfetivo)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {percentual(margemEfetiva)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <Info label="Estoque" value={`${produto.estoqueAtual} un.`} />

                    <Info
                      label="Custo produto"
                      value={moeda(Number(produto.custoBase))}
                    />

                    <Info
                      label="Adicionais"
                      value={moeda(Number(produto.custoAdicionais))}
                    />

                    <Info
                      label="Custo total"
                      value={moeda(Number(produto.custoTotal))}
                    />
                  </div>

                  {produto.linkCompra ? (
                    <a
                      href={produto.linkCompra}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-4 transition hover:text-slate-900"
                    >
                      Ver link de compra
                    </a>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      Sem link de compra
                    </p>
                  )}

                  {produto.totalVendas > 0 && (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Este produto possui {produto.totalVendas} registro
                      {produto.totalVendas > 1 ? "s" : ""} de venda.
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    {produtoNaLixeira ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => restaurarDaLixeira(produto)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Restaurar
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/produtos/${produto.id}`}
                          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Editar
                        </Link>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => alternarVisibilidadeLoja(produto)}
                          className={`inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            produto.ativo
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={
                            produto.ativo
                              ? "Ocultar da loja pública"
                              : "Ativar na loja pública"
                          }
                        >
                          {produto.ativo ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => moverParaLixeira(produto)}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Mover para lixeira"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalFamiliaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Família de produtos
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  Agrupar versões da mesma joia
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Use para conectar produtos separados, como versões em prata,
                  ouro ou cores diferentes da mesma joia. Eles continuam
                  aparecendo individualmente na loja, mas ficam relacionados na
                  página do produto.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalFamilia}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {erroFamilia && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroFamilia}
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Família existente
                  </span>

                  <select
                    value={familiaSelecionadaId}
                    onChange={(event) => {
                      setFamiliaSelecionadaId(event.target.value);
                      if (event.target.value) {
                        setNovaFamiliaNome("");
                      }
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">Criar nova família</option>

                    {familiasDisponiveis.map((familia) => (
                      <option key={familia.id} value={familia.id}>
                        {familia.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Nome da nova família
                  </span>

                  <input
                    value={novaFamiliaNome}
                    disabled={Boolean(familiaSelecionadaId)}
                    onChange={(event) => setNovaFamiliaNome(event.target.value)}
                    placeholder="Ex: Anel Coração"
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Material e cor da joia são informações de agrupamento visual.
                Tamanho, medida e comprimento continuam como variações internas
                do produto.
              </div>

              <div className="space-y-3">
                {produtosSelecionadosObjetos.map((produto, index) => {
                  const item = itensAgrupamento.find(
                    (agrupamento) => agrupamento.produtoId === produto.id
                  );

                  if (!item) {
                    return null;
                  }

                  return (
                    <div
                      key={produto.id}
                      className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[120px_1fr]"
                    >
                      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                        <ImageBox src={produto.imagemUrl} alt={produto.nome} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              {produto.codigoInterno}
                            </p>

                            <h3 className="mt-1 text-base font-semibold text-slate-950">
                              {produto.nome}
                            </h3>
                          </div>

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                            Ordem {index + 1}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Material
                            </span>

                            <input
                              list={`materiais-${produto.id}`}
                              value={item.familiaMaterial}
                              onChange={(event) =>
                                atualizarItemAgrupamento(
                                  produto.id,
                                  "familiaMaterial",
                                  event.target.value
                                )
                              }
                              placeholder="Prata, Ouro..."
                              className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />

                            <datalist id={`materiais-${produto.id}`}>
                              {MATERIAIS_JOIA.map((material) =>
                                material ? (
                                  <option key={material} value={material} />
                                ) : null
                              )}
                            </datalist>
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Cor da joia
                            </span>

                            <input
                              list={`cores-${produto.id}`}
                              value={item.familiaCorJoia}
                              onChange={(event) =>
                                atualizarItemAgrupamento(
                                  produto.id,
                                  "familiaCorJoia",
                                  event.target.value
                                )
                              }
                              placeholder="Vermelha, Azul..."
                              className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />

                            <datalist id={`cores-${produto.id}`}>
                              {CORES_JOIA.map((cor) =>
                                cor ? <option key={cor} value={cor} /> : null
                              )}
                            </datalist>
                          </label>

                          <label className="block md:col-span-2">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Imagem do seletor
                            </span>

                            <input
                              value={item.familiaImagemUrl}
                              onChange={(event) =>
                                atualizarItemAgrupamento(
                                  produto.id,
                                  "familiaImagemUrl",
                                  event.target.value
                                )
                              }
                              placeholder="Usa a imagem principal por padrão"
                              className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>
                        </div>

                        <div className="mt-3">
                          <label className="block max-w-[180px]">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Ordem
                            </span>

                            <input
                              type="number"
                              value={item.familiaOrdem}
                              onChange={(event) =>
                                atualizarItemAgrupamento(
                                  produto.id,
                                  "familiaOrdem",
                                  Number(event.target.value || 0)
                                )
                              }
                              className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModalFamilia}
                  disabled={salvandoFamilia}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarAgrupamentoFamilia}
                  disabled={salvandoFamilia}
                  className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvandoFamilia ? "Salvando..." : "Salvar família"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}