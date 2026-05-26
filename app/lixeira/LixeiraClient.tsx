"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Package,
  RefreshCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";

export type VendaLixeiraItem = {
  id: string;
  codigo: string;
  clienteNome: string;
  clienteDocumento: string;
  meioVenda: string;
  quantidadeItens: number;
  itensTotais: number;
  valorTotal: number;
  statusAntesLixeira: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type CompraLixeiraItem = {
  id: string;
  codigo: string;
  fornecedor: string;
  quantidadeItens: number;
  itensTotais: number;
  valorTotalFinal: number;
  statusAntesLixeira: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ProdutoLixeiraItem = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string | null;
  nome: string;
  categoria: string;
  fornecedorPadrao: string;
  precoVenda: number;
  custoBase: number;
  estoqueAtual: number;
  valorEstoque: number;
  totalVendas: number;
  statusAntesLixeira: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

type LixeiraClientProps = {
  vendas: VendaLixeiraItem[];
  compras: CompraLixeiraItem[];
  produtos: ProdutoLixeiraItem[];
};

type AbaLixeira = "vendas" | "compras" | "produtos";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function dataCompleta(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarStatus(status: string | null) {
  if (!status) {
    return "-";
  }

  if (status === "VENDA_FINALIZADA") return "Venda finalizada";
  if (status === "EM_PREPARACAO") return "Em preparação";
  if (status === "ENVIADA") return "Enviada";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "CANCELADA") return "Cancelada";
  if (status === "ATIVA") return "Ativa";
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Inativo";

  return status.replaceAll("_", " ");
}

export default function LixeiraClient({
  vendas,
  compras,
  produtos,
}: LixeiraClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [aba, setAba] = useState<AbaLixeira>("vendas");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const buscaNormalizada = normalizarTexto(busca);

  const vendasFiltradas = useMemo(() => {
    if (!buscaNormalizada) {
      return vendas;
    }

    return vendas.filter((venda) => {
      const texto = normalizarTexto(
        [
          venda.codigo,
          venda.clienteNome,
          venda.clienteDocumento,
          venda.meioVenda,
          venda.statusAntesLixeira,
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [buscaNormalizada, vendas]);

  const comprasFiltradas = useMemo(() => {
    if (!buscaNormalizada) {
      return compras;
    }

    return compras.filter((compra) => {
      const texto = normalizarTexto(
        [compra.codigo, compra.fornecedor, compra.statusAntesLixeira].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [buscaNormalizada, compras]);

  const produtosFiltrados = useMemo(() => {
    if (!buscaNormalizada) {
      return produtos;
    }

    return produtos.filter((produto) => {
      const texto = normalizarTexto(
        [
          produto.codigoInterno,
          produto.codigoFornecedor,
          produto.nome,
          produto.categoria,
          produto.fornecedorPadrao,
          produto.statusAntesLixeira,
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [buscaNormalizada, produtos]);

  async function restaurarVenda(venda: VendaLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/vendas/${venda.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar venda.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarCompra(compra: CompraLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/compras/${compra.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar compra.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarProduto(produto: ProdutoLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/produtos/${produto.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar produto.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
              <Trash2 className="h-4 w-4" />
              Lixeira
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Registros na lixeira
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Consulte vendas, compras e produtos removidos da visualização
              principal. Restaurar um registro não altera estoque e não cria
              movimentações.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Vendas</p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {vendas.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Compras</p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {compras.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Produtos</p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {produtos.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Tipo de registro
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAba("vendas")}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  aba === "vendas"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                Vendas
              </button>

              <button
                type="button"
                onClick={() => setAba("compras")}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  aba === "compras"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                Compras
              </button>

              <button
                type="button"
                onClick={() => setAba("produtos")}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  aba === "produtos"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Package className="h-4 w-4" />
                Produtos
              </button>
            </div>
          </div>

          <label className="flex w-full flex-col gap-2 lg:max-w-md">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por código, cliente, documento, fornecedor ou produto..."
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
        </div>

        {erro && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}
      </section>

      {aba === "vendas" && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Vendas na lixeira
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Exibindo {vendasFiltradas.length} de {vendas.length} vendas.
            </p>
          </div>

          {vendasFiltradas.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhuma venda na lixeira.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Código</th>
                    <th className="px-6 py-4 font-semibold">Cliente</th>
                    <th className="px-6 py-4 font-semibold">Meio</th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Itens totais
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Quantidade
                    </th>
                    <th className="px-6 py-4 font-semibold">Total</th>
                    <th className="px-6 py-4 font-semibold">
                      Status anterior
                    </th>
                    <th className="px-6 py-4 font-semibold">Movida em</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {vendasFiltradas.map((venda) => (
                    <tr key={venda.id} className="text-slate-700">
                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {venda.codigo}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {venda.clienteNome}
                          </span>
                          <span className="text-xs text-slate-500">
                            {venda.clienteDocumento}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">{venda.meioVenda}</td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {venda.itensTotais}
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {venda.quantidadeItens}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {moeda(venda.valorTotal)}
                      </td>

                      <td className="px-6 py-4">
                        {formatarStatus(venda.statusAntesLixeira)}
                      </td>

                      <td className="px-6 py-4">
                        {dataCompleta(venda.atualizadoEm)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => restaurarVenda(venda)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {aba === "compras" && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Compras na lixeira
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Exibindo {comprasFiltradas.length} de {compras.length} compras.
            </p>
          </div>

          {comprasFiltradas.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhuma compra na lixeira.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Código</th>
                    <th className="px-6 py-4 font-semibold">Fornecedor</th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Itens totais
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Quantidade
                    </th>
                    <th className="px-6 py-4 font-semibold">Total final</th>
                    <th className="px-6 py-4 font-semibold">
                      Status anterior
                    </th>
                    <th className="px-6 py-4 font-semibold">Movida em</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {comprasFiltradas.map((compra) => (
                    <tr key={compra.id} className="text-slate-700">
                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {compra.codigo}
                      </td>

                      <td className="px-6 py-4">{compra.fornecedor}</td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {compra.itensTotais}
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {compra.quantidadeItens}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {moeda(compra.valorTotalFinal)}
                      </td>

                      <td className="px-6 py-4">
                        {formatarStatus(compra.statusAntesLixeira)}
                      </td>

                      <td className="px-6 py-4">
                        {dataCompleta(compra.atualizadoEm)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => restaurarCompra(compra)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {aba === "produtos" && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Produtos na lixeira
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Exibindo {produtosFiltrados.length} de {produtos.length} produtos.
            </p>
          </div>

          {produtosFiltrados.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhum produto na lixeira.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Código</th>
                    <th className="px-6 py-4 font-semibold">Produto</th>
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Fornecedor</th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Estoque
                    </th>
                    <th className="px-6 py-4 font-semibold">Preço</th>
                    <th className="px-6 py-4 font-semibold">
                      Status anterior
                    </th>
                    <th className="px-6 py-4 font-semibold">Movido em</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {produtosFiltrados.map((produto) => (
                    <tr key={produto.id} className="text-slate-700">
                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {produto.codigoInterno}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {produto.nome}
                          </span>

                          <span className="text-xs text-slate-500">
                            Fornecedor: {produto.codigoFornecedor || "-"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">{produto.categoria}</td>

                      <td className="px-6 py-4">
                        {produto.fornecedorPadrao}
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-slate-900">
                        {produto.estoqueAtual}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-950">
                        {moeda(produto.precoVenda)}
                      </td>

                      <td className="px-6 py-4">
                        {formatarStatus(produto.statusAntesLixeira)}
                      </td>

                      <td className="px-6 py-4">
                        {dataCompleta(produto.atualizadoEm)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => restaurarProduto(produto)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}