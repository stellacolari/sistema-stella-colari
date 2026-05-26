"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Package, RefreshCcw, Search, X } from "lucide-react";
import ImageBox from "@/components/ui/ImageBox";

type ProdutoEstoque = {
  id: string;
  cadastroId: string;
  tipo: "produto";
  codigo: string;
  codigoFornecedor: string;
  nome: string;
  imagemUrl?: string | null;
  categoria: string;
  fornecedorPadrao: string;
  precoVenda: number;
  custoBase: number;
  margemAplicada: number;
  linkCompra?: string | null;
  statusCadastro: string;
  ativo: boolean;
  tamanhoAnel: string;
  quantidadeAtual: number;
  valorAcumulado: number;
  custoMedio: number;
  atualizadoEm: string;
};

type AdicionalEstoque = {
  id: string;
  cadastroId: string;
  tipo: "adicional";
  codigo: string;
  codigoFornecedor: string;
  nome: string;
  imagemUrl?: string | null;
  fornecedorPadrao: string;
  custoBase: number;
  linkCompra?: string | null;
  statusCadastro: string;
  ativo: boolean;
  quantidadeAtual: number;
  valorAcumulado: number;
  custoMedio: number;
  atualizadoEm: string;
};

type ItemEstoque = ProdutoEstoque | AdicionalEstoque;

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

function mostrarTamanhoAnel(item: ItemEstoque) {
  return item.tipo === "produto" && item.tamanhoAnel && item.tamanhoAnel !== "UNICO";
}

function situacaoEstoque(quantidade: number) {
  if (quantidade <= 0) {
    return {
      label: "ZERADO",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (quantidade <= 5) {
    return {
      label: "REPOR",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (quantidade <= 10) {
    return {
      label: "ATENÇÃO",
      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
    };
  }

  return {
    label: "OK",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function labelStatusCadastro(status: string) {
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Inativo";
  if (status === "NA_LIXEIRA") return "Na lixeira";
  if (status === "NOVO") return "Novo";

  return status.replaceAll("_", " ");
}

function statusCadastroClass(status: string) {
  if (status === "ATIVO" || status === "NOVO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "INATIVO") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (status === "NA_LIXEIRA") {
    return "border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function EstoqueResumoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function EstoqueTablesClient({
  produtos,
  adicionais,
}: {
  produtos: ProdutoEstoque[];
  adicionais: AdicionalEstoque[];
}) {
  const [busca, setBusca] = useState("");
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState<ItemEstoque | null>(null);

  const produtosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    if (!termo) return produtos;

    return produtos.filter((item) => {
      return normalizarTexto(
        [
          item.codigo,
          item.codigoFornecedor,
          item.nome,
          item.categoria,
          item.fornecedorPadrao,
          item.tamanhoAnel,
          item.statusCadastro,
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, produtos]);

  const adicionaisFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    if (!termo) return adicionais;

    return adicionais.filter((item) => {
      return normalizarTexto(
        [
          item.codigo,
          item.codigoFornecedor,
          item.nome,
          item.fornecedorPadrao,
          item.statusCadastro,
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, adicionais]);

  const totalValorProdutos = useMemo(() => {
    return produtos.reduce((total, item) => total + item.valorAcumulado, 0);
  }, [produtos]);

  const totalValorAdicionais = useMemo(() => {
    return adicionais.reduce((total, item) => total + item.valorAcumulado, 0);
  }, [adicionais]);

  const totalQuantidadeProdutos = useMemo(() => {
    return produtos.reduce((total, item) => total + item.quantidadeAtual, 0);
  }, [produtos]);

  const totalQuantidadeAdicionais = useMemo(() => {
    return adicionais.reduce((total, item) => total + item.quantidadeAtual, 0);
  }, [adicionais]);

  const alertasEstoque = useMemo(() => {
    return [...produtos, ...adicionais].filter((item) => item.quantidadeAtual <= 5);
  }, [produtos, adicionais]);

  function valorInput(item: ItemEstoque) {
    return quantidades[item.id] ?? String(item.quantidadeAtual);
  }

  async function salvarQuantidade(item: ItemEstoque) {
    const valorDigitado = quantidades[item.id];

    if (valorDigitado === undefined) return;

    const novaQuantidade = Number(valorDigitado);

    if (Number.isNaN(novaQuantidade) || novaQuantidade < 0) {
      setErro("Digite uma quantidade válida.");
      return;
    }

    const descricaoItem =
      item.tipo === "produto" && mostrarTamanhoAnel(item)
        ? `${item.nome} tamanho ${item.tamanhoAnel}`
        : item.nome;

    const confirmado = window.confirm(
      `Tem certeza que deseja alterar a quantidade de ${descricaoItem} para ${novaQuantidade}?`
    );

    if (!confirmado) return;

    try {
      setErro("");
      setSalvandoId(item.id);

      const rota =
        item.tipo === "produto"
          ? `/api/estoque/produtos/${item.id}`
          : `/api/estoque/adicionais/${item.id}`;

      const resposta = await fetch(rota, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantidadeAtual: novaQuantidade,
        }),
      });

      const data = await resposta.json();

      if (!resposta.ok) {
        setErro(data.error || "Erro ao atualizar quantidade.");
        setSalvandoId(null);
        return;
      }

      window.location.reload();
    } catch {
      setErro("Erro ao atualizar quantidade.");
      setSalvandoId(null);
    }
  }

  function limparBusca() {
    setBusca("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Estoque
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Controle de Estoque
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Consulte produtos, itens adicionais e variações de anéis por tamanho.
              Clique em um item para ver os detalhes completos.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Anéis aparecem separados por tamanho.
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EstoqueResumoCard
          label="Produtos em estoque"
          value={String(totalQuantidadeProdutos)}
          description={`Valor acumulado: ${moeda(totalValorProdutos)}`}
        />

        <EstoqueResumoCard
          label="Itens adicionais"
          value={String(totalQuantidadeAdicionais)}
          description={`Valor acumulado: ${moeda(totalValorAdicionais)}`}
        />

        <EstoqueResumoCard
          label="Valor total"
          value={moeda(totalValorProdutos + totalValorAdicionais)}
          description="Produtos + itens adicionais."
        />

        <EstoqueResumoCard
          label="Alertas"
          value={String(alertasEstoque.length)}
          description="Itens zerados ou com 5 unidades ou menos."
        />
      </section>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Busca no estoque
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Procure por código, nome, categoria, fornecedor ou tamanho.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
            <label className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar item no estoque"
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
              />
            </label>

            <button
              type="button"
              onClick={limparBusca}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCcw className="h-4 w-4" />
              Limpar
            </button>
          </div>
        </div>

        {erro ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erro}
          </div>
        ) : null}
      </div>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Produtos principais
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Exibindo {produtosFiltrados.length} de {produtos.length} registros.
            Anéis aparecem como registros separados por tamanho.
          </p>
        </div>

        {produtosFiltrados.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-sm text-slate-600">
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Quantidade</th>
                  <th className="px-6 py-4 font-semibold">Valor acumulado</th>
                  <th className="px-6 py-4 font-semibold">Custo médio</th>
                  <th className="px-6 py-4 font-semibold">Situação</th>
                  <th className="px-6 py-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {produtosFiltrados.map((item) => {
                  const status = situacaoEstoque(item.quantidadeAtual);

                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50"
                      onClick={() => setItemSelecionado(item)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-950">
                            {item.nome}
                          </span>

                          <span className="mt-1 text-xs text-slate-500">
                            {item.codigo} · {item.categoria}
                            {mostrarTamanhoAnel(item) ? ` · Tam. ${item.tamanhoAnel}` : ""}
                          </span>
                        </div>
                      </td>

                      <td
                        className="px-6 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="number"
                          min={0}
                          value={valorInput(item)}
                          onChange={(event) =>
                            setQuantidades((atual) => ({
                              ...atual,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </td>

                      <td className="px-6 py-4">
                        {moeda(Number(item.valorAcumulado))}
                      </td>

                      <td className="px-6 py-4">
                        {moeda(Number(item.custoMedio))}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td
                        className="px-6 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setItemSelecionado(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                            title="Ver detalhes"
                            aria-label={`Ver detalhes de ${item.nome}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => salvarQuantidade(item)}
                            disabled={salvandoId === item.id}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {salvandoId === item.id ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Itens adicionais
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Exibindo {adicionaisFiltrados.length} de {adicionais.length} registros.
          </p>
        </div>

        {adicionaisFiltrados.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            Nenhum item adicional encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-sm text-slate-600">
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Quantidade</th>
                  <th className="px-6 py-4 font-semibold">Valor acumulado</th>
                  <th className="px-6 py-4 font-semibold">Custo médio</th>
                  <th className="px-6 py-4 font-semibold">Situação</th>
                  <th className="px-6 py-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {adicionaisFiltrados.map((item) => {
                  const status = situacaoEstoque(item.quantidadeAtual);

                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50"
                      onClick={() => setItemSelecionado(item)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-950">
                            {item.nome}
                          </span>

                          <span className="mt-1 text-xs text-slate-500">
                            {item.codigo} · Item adicional
                          </span>
                        </div>
                      </td>

                      <td
                        className="px-6 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="number"
                          min={0}
                          value={valorInput(item)}
                          onChange={(event) =>
                            setQuantidades((atual) => ({
                              ...atual,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                        />
                      </td>

                      <td className="px-6 py-4">
                        {moeda(Number(item.valorAcumulado))}
                      </td>

                      <td className="px-6 py-4">
                        {moeda(Number(item.custoMedio))}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td
                        className="px-6 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setItemSelecionado(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                            title="Ver detalhes"
                            aria-label={`Ver detalhes de ${item.nome}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => salvarQuantidade(item)}
                            disabled={salvandoId === item.id}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {salvandoId === item.id ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Detalhes do estoque
                </p>

                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {itemSelecionado.nome}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {itemSelecionado.codigo}
                  {itemSelecionado.tipo === "produto"
                    ? ` · ${itemSelecionado.categoria}${
                        mostrarTamanhoAnel(itemSelecionado)
                          ? ` · Tam. ${itemSelecionado.tamanhoAnel}`
                          : ""
                      }`
                    : " · Item adicional"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setItemSelecionado(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar detalhes"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-5 lg:grid-cols-[260px_1fr]">
              <div className="space-y-4">
                <ImageBox
                  src={itemSelecionado.imagemUrl}
                  alt={itemSelecionado.nome}
                />

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusCadastroClass(
                    itemSelecionado.statusCadastro
                  )}`}
                >
                  {labelStatusCadastro(itemSelecionado.statusCadastro)}
                </span>

                {itemSelecionado.linkCompra ? (
                  <a
                    href={itemSelecionado.linkCompra}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver link de compra
                  </a>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Sem link de compra
                  </div>
                )}

                <Link
                  href={
                    itemSelecionado.tipo === "produto"
                      ? `/produtos/${itemSelecionado.cadastroId}`
                      : `/itens-adicionais/${itemSelecionado.cadastroId}`
                  }
                  className="block rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Editar cadastro
                </Link>
              </div>

              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="Código interno" value={itemSelecionado.codigo} />
                  <Info
                    label="Código fornecedor"
                    value={itemSelecionado.codigoFornecedor || "-"}
                  />
                  <Info
                    label="Fornecedor"
                    value={itemSelecionado.fornecedorPadrao}
                  />
                  <Info
                    label="Última atualização"
                    value={dataCompleta(itemSelecionado.atualizadoEm)}
                  />

                  {itemSelecionado.tipo === "produto" ? (
                    <>
                      <Info label="Categoria" value={itemSelecionado.categoria} />
                      <Info
                        label="Tamanho do anel"
                        value={
                          mostrarTamanhoAnel(itemSelecionado)
                            ? itemSelecionado.tamanhoAnel
                            : "-"
                        }
                      />
                      <Info
                        label="Preço de venda"
                        value={moeda(itemSelecionado.precoVenda)}
                      />
                      <Info
                        label="Custo base"
                        value={moeda(itemSelecionado.custoBase)}
                      />
                      <Info
                        label="Margem aplicada"
                        value={`${itemSelecionado.margemAplicada}x`}
                      />
                    </>
                  ) : (
                    <Info
                      label="Custo base"
                      value={moeda(itemSelecionado.custoBase)}
                    />
                  )}

                  <Info
                    label="Quantidade atual"
                    value={`${itemSelecionado.quantidadeAtual} un.`}
                  />
                  <Info
                    label="Valor acumulado"
                    value={moeda(itemSelecionado.valorAcumulado)}
                  />
                  <Info
                    label="Custo médio"
                    value={moeda(itemSelecionado.custoMedio)}
                  />
                  <Info
                    label="Situação"
                    value={situacaoEstoque(itemSelecionado.quantidadeAtual).label}
                  />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Package className="mt-1 h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Observação sobre estoque
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Para anéis, cada tamanho é tratado como um registro de
                        estoque separado. Alterar a quantidade aqui afeta apenas
                        este tamanho específico, não os demais tamanhos do mesmo
                        produto.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setItemSelecionado(null)}
                    className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}