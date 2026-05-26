"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Package,
  RefreshCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Users,
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

export type ItemAdicionalLixeiraItem = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string | null;
  nome: string;
  fornecedorPadrao: string;
  custoBase: number;
  estoqueAtual: number;
  valorEstoque: number;
  totalRegras: number;
  statusAntesLixeira: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ClienteLixeiraItem = {
  id: string;
  codigo: string;
  nome: string;
  documento: string;
  telefone: string;
  email: string | null;
  tipoCliente: string;
  totalVendas: number;
  totalVendasAtivas: number;
  valorTotalComprado: number;
  statusAntesLixeira: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

type LixeiraClientProps = {
  vendas: VendaLixeiraItem[];
  compras: CompraLixeiraItem[];
  produtos: ProdutoLixeiraItem[];
  itensAdicionais: ItemAdicionalLixeiraItem[];
  clientes: ClienteLixeiraItem[];
};

type AbaLixeira =
  | "vendas"
  | "compras"
  | "produtos"
  | "itensAdicionais"
  | "clientes";

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
  if (status === "NOVO") return "Novo";

  return status.replaceAll("_", " ");
}

export default function LixeiraClient({
  vendas,
  compras,
  produtos,
  itensAdicionais,
  clientes,
}: LixeiraClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [aba, setAba] = useState<AbaLixeira>("vendas");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const buscaNormalizada = normalizarTexto(busca);

  const vendasFiltradas = useMemo(() => {
    if (!buscaNormalizada) return vendas;

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
    if (!buscaNormalizada) return compras;

    return compras.filter((compra) => {
      const texto = normalizarTexto(
        [compra.codigo, compra.fornecedor, compra.statusAntesLixeira].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [buscaNormalizada, compras]);

  const produtosFiltrados = useMemo(() => {
    if (!buscaNormalizada) return produtos;

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

  const itensAdicionaisFiltrados = useMemo(() => {
    if (!buscaNormalizada) return itensAdicionais;

    return itensAdicionais.filter((item) => {
      const texto = normalizarTexto(
        [
          item.codigoInterno,
          item.codigoFornecedor,
          item.nome,
          item.fornecedorPadrao,
          item.statusAntesLixeira,
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [buscaNormalizada, itensAdicionais]);

  const clientesFiltrados = useMemo(() => {
    if (!buscaNormalizada) return clientes;

    return clientes.filter((cliente) => {
      const texto = normalizarTexto(
        [
          cliente.codigo,
          cliente.nome,
          cliente.documento,
          cliente.telefone,
          cliente.email,
          cliente.tipoCliente,
          cliente.statusAntesLixeira,
        ].join(" ")
      );

      return texto.includes(buscaNormalizada);
    });
  }, [buscaNormalizada, clientes]);

  async function restaurarVenda(venda: VendaLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/vendas/${venda.id}/lixeira`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar venda.");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function restaurarCompra(compra: CompraLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/compras/${compra.id}/lixeira`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar compra.");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function restaurarProduto(produto: ProdutoLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/produtos/${produto.id}/lixeira`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar produto.");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function restaurarItemAdicional(item: ItemAdicionalLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/itens-adicionais/${item.id}/lixeira`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar item adicional.");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function restaurarCliente(cliente: ClienteLixeiraItem) {
    setErro(null);

    const response = await fetch(`/api/clientes/${cliente.id}/lixeira`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErro(data.error || "Erro ao restaurar cliente.");
      return;
    }

    startTransition(() => router.refresh());
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
              Consulte vendas, compras, produtos, itens adicionais e clientes
              removidos da visualização principal. Restaurar um registro não
              altera estoque e não cria movimentações.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <ResumoCard label="Vendas" value={vendas.length} />
            <ResumoCard label="Compras" value={compras.length} />
            <ResumoCard label="Produtos" value={produtos.length} />
            <ResumoCard label="Adicionais" value={itensAdicionais.length} />
            <ResumoCard label="Clientes" value={clientes.length} />
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
              <AbaButton
                active={aba === "vendas"}
                onClick={() => setAba("vendas")}
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Vendas"
              />

              <AbaButton
                active={aba === "compras"}
                onClick={() => setAba("compras")}
                icon={<ShoppingCart className="h-4 w-4" />}
                label="Compras"
              />

              <AbaButton
                active={aba === "produtos"}
                onClick={() => setAba("produtos")}
                icon={<Package className="h-4 w-4" />}
                label="Produtos"
              />

              <AbaButton
                active={aba === "itensAdicionais"}
                onClick={() => setAba("itensAdicionais")}
                icon={<Boxes className="h-4 w-4" />}
                label="Itens adicionais"
              />

              <AbaButton
                active={aba === "clientes"}
                onClick={() => setAba("clientes")}
                icon={<Users className="h-4 w-4" />}
                label="Clientes"
              />
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
              placeholder="Buscar por código, cliente, fornecedor ou item..."
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
        <TabelaVendas
          vendas={vendasFiltradas}
          total={vendas.length}
          isPending={isPending}
          onRestaurar={restaurarVenda}
        />
      )}

      {aba === "compras" && (
        <TabelaCompras
          compras={comprasFiltradas}
          total={compras.length}
          isPending={isPending}
          onRestaurar={restaurarCompra}
        />
      )}

      {aba === "produtos" && (
        <TabelaProdutos
          produtos={produtosFiltrados}
          total={produtos.length}
          isPending={isPending}
          onRestaurar={restaurarProduto}
        />
      )}

      {aba === "itensAdicionais" && (
        <TabelaItensAdicionais
          itens={itensAdicionaisFiltrados}
          total={itensAdicionais.length}
          isPending={isPending}
          onRestaurar={restaurarItemAdicional}
        />
      )}

      {aba === "clientes" && (
        <TabelaClientes
          clientes={clientesFiltrados}
          total={clientes.length}
          isPending={isPending}
          onRestaurar={restaurarCliente}
        />
      )}
    </main>
  );
}

function ResumoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function AbaButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function RestaurarButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RefreshCcw className="h-4 w-4" />
      Restaurar
    </button>
  );
}

/* Tabelas reaproveitando o mesmo padrão */

function TabelaVendas({
  vendas,
  total,
  isPending,
  onRestaurar,
}: {
  vendas: VendaLixeiraItem[];
  total: number;
  isPending: boolean;
  onRestaurar: (venda: VendaLixeiraItem) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <TabelaHeader titulo="Vendas na lixeira" exibindo={vendas.length} total={total} />

      {vendas.length === 0 ? (
        <EmptyState texto="Nenhuma venda na lixeira." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Meio</th>
                <th className="px-6 py-4 text-center font-semibold">Itens</th>
                <th className="px-6 py-4 text-center font-semibold">Qtd.</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Status anterior</th>
                <th className="px-6 py-4 font-semibold">Movida em</th>
                <th className="px-6 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {vendas.map((venda) => (
                <tr key={venda.id} className="text-slate-700">
                  <td className="px-6 py-4 font-semibold text-slate-950">{venda.codigo}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{venda.clienteNome}</span>
                      <span className="text-xs text-slate-500">{venda.clienteDocumento}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{venda.meioVenda}</td>
                  <td className="px-6 py-4 text-center font-semibold">{venda.itensTotais}</td>
                  <td className="px-6 py-4 text-center font-semibold">{venda.quantidadeItens}</td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{moeda(venda.valorTotal)}</td>
                  <td className="px-6 py-4">{formatarStatus(venda.statusAntesLixeira)}</td>
                  <td className="px-6 py-4">{dataCompleta(venda.atualizadoEm)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <RestaurarButton disabled={isPending} onClick={() => onRestaurar(venda)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TabelaCompras({
  compras,
  total,
  isPending,
  onRestaurar,
}: {
  compras: CompraLixeiraItem[];
  total: number;
  isPending: boolean;
  onRestaurar: (compra: CompraLixeiraItem) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <TabelaHeader titulo="Compras na lixeira" exibindo={compras.length} total={total} />

      {compras.length === 0 ? (
        <EmptyState texto="Nenhuma compra na lixeira." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Fornecedor</th>
                <th className="px-6 py-4 text-center font-semibold">Itens</th>
                <th className="px-6 py-4 text-center font-semibold">Qtd.</th>
                <th className="px-6 py-4 font-semibold">Total final</th>
                <th className="px-6 py-4 font-semibold">Status anterior</th>
                <th className="px-6 py-4 font-semibold">Movida em</th>
                <th className="px-6 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {compras.map((compra) => (
                <tr key={compra.id} className="text-slate-700">
                  <td className="px-6 py-4 font-semibold text-slate-950">{compra.codigo}</td>
                  <td className="px-6 py-4">{compra.fornecedor}</td>
                  <td className="px-6 py-4 text-center font-semibold">{compra.itensTotais}</td>
                  <td className="px-6 py-4 text-center font-semibold">{compra.quantidadeItens}</td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{moeda(compra.valorTotalFinal)}</td>
                  <td className="px-6 py-4">{formatarStatus(compra.statusAntesLixeira)}</td>
                  <td className="px-6 py-4">{dataCompleta(compra.atualizadoEm)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <RestaurarButton disabled={isPending} onClick={() => onRestaurar(compra)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TabelaProdutos({
  produtos,
  total,
  isPending,
  onRestaurar,
}: {
  produtos: ProdutoLixeiraItem[];
  total: number;
  isPending: boolean;
  onRestaurar: (produto: ProdutoLixeiraItem) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <TabelaHeader titulo="Produtos na lixeira" exibindo={produtos.length} total={total} />

      {produtos.length === 0 ? (
        <EmptyState texto="Nenhum produto na lixeira." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Produto</th>
                <th className="px-6 py-4 font-semibold">Categoria</th>
                <th className="px-6 py-4 font-semibold">Fornecedor</th>
                <th className="px-6 py-4 text-center font-semibold">Estoque</th>
                <th className="px-6 py-4 font-semibold">Preço</th>
                <th className="px-6 py-4 font-semibold">Status anterior</th>
                <th className="px-6 py-4 font-semibold">Movido em</th>
                <th className="px-6 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {produtos.map((produto) => (
                <tr key={produto.id} className="text-slate-700">
                  <td className="px-6 py-4 font-semibold text-slate-950">{produto.codigoInterno}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{produto.nome}</span>
                      <span className="text-xs text-slate-500">Fornecedor: {produto.codigoFornecedor || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{produto.categoria}</td>
                  <td className="px-6 py-4">{produto.fornecedorPadrao}</td>
                  <td className="px-6 py-4 text-center font-semibold">{produto.estoqueAtual}</td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{moeda(produto.precoVenda)}</td>
                  <td className="px-6 py-4">{formatarStatus(produto.statusAntesLixeira)}</td>
                  <td className="px-6 py-4">{dataCompleta(produto.atualizadoEm)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <RestaurarButton disabled={isPending} onClick={() => onRestaurar(produto)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TabelaItensAdicionais({
  itens,
  total,
  isPending,
  onRestaurar,
}: {
  itens: ItemAdicionalLixeiraItem[];
  total: number;
  isPending: boolean;
  onRestaurar: (item: ItemAdicionalLixeiraItem) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <TabelaHeader titulo="Itens adicionais na lixeira" exibindo={itens.length} total={total} />

      {itens.length === 0 ? (
        <EmptyState texto="Nenhum item adicional na lixeira." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Item adicional</th>
                <th className="px-6 py-4 font-semibold">Fornecedor</th>
                <th className="px-6 py-4 text-center font-semibold">Estoque</th>
                <th className="px-6 py-4 font-semibold">Custo</th>
                <th className="px-6 py-4 text-center font-semibold">Regras</th>
                <th className="px-6 py-4 font-semibold">Status anterior</th>
                <th className="px-6 py-4 font-semibold">Movido em</th>
                <th className="px-6 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {itens.map((item) => (
                <tr key={item.id} className="text-slate-700">
                  <td className="px-6 py-4 font-semibold text-slate-950">{item.codigoInterno}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{item.nome}</span>
                      <span className="text-xs text-slate-500">Fornecedor: {item.codigoFornecedor || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.fornecedorPadrao}</td>
                  <td className="px-6 py-4 text-center font-semibold">{item.estoqueAtual}</td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{moeda(item.custoBase)}</td>
                  <td className="px-6 py-4 text-center font-semibold">{item.totalRegras}</td>
                  <td className="px-6 py-4">{formatarStatus(item.statusAntesLixeira)}</td>
                  <td className="px-6 py-4">{dataCompleta(item.atualizadoEm)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <RestaurarButton disabled={isPending} onClick={() => onRestaurar(item)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TabelaClientes({
  clientes,
  total,
  isPending,
  onRestaurar,
}: {
  clientes: ClienteLixeiraItem[];
  total: number;
  isPending: boolean;
  onRestaurar: (cliente: ClienteLixeiraItem) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <TabelaHeader titulo="Clientes na lixeira" exibindo={clientes.length} total={total} />

      {clientes.length === 0 ? (
        <EmptyState texto="Nenhum cliente na lixeira." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Documento</th>
                <th className="px-6 py-4 font-semibold">Telefone</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 text-center font-semibold">Vendas</th>
                <th className="px-6 py-4 font-semibold">Total comprado</th>
                <th className="px-6 py-4 font-semibold">Status anterior</th>
                <th className="px-6 py-4 font-semibold">Movido em</th>
                <th className="px-6 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="text-slate-700">
                  <td className="px-6 py-4 font-semibold text-slate-950">{cliente.codigo}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{cliente.nome}</span>
                      <span className="text-xs text-slate-500">{cliente.email || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{cliente.documento}</td>
                  <td className="px-6 py-4">{cliente.telefone}</td>
                  <td className="px-6 py-4">{cliente.tipoCliente}</td>
                  <td className="px-6 py-4 text-center font-semibold">{cliente.totalVendasAtivas}</td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{moeda(cliente.valorTotalComprado)}</td>
                  <td className="px-6 py-4">{formatarStatus(cliente.statusAntesLixeira)}</td>
                  <td className="px-6 py-4">{dataCompleta(cliente.atualizadoEm)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <RestaurarButton disabled={isPending} onClick={() => onRestaurar(cliente)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TabelaHeader({
  titulo,
  exibindo,
  total,
}: {
  titulo: string;
  exibindo: number;
  total: number;
}) {
  return (
    <div className="border-b border-slate-200 px-6 py-4">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Exibindo {exibindo} de {total} registros.
      </p>
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return <div className="px-6 py-10 text-sm text-slate-500">{texto}</div>;
}