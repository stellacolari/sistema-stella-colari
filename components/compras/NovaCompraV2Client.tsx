"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type ProdutoVariacaoOpcaoCompra = {
  id: string;
  nome: string;
  imagemUrl?: string | null;
  precoAdicional?: number;
  custoAdicional?: number;
  ativo?: boolean;
  ordem?: number;
};

type ProdutoVariacaoCompra = {
  id: string;
  nome: string;
  obrigatoria: boolean;
  opcoes: ProdutoVariacaoOpcaoCompra[];
};

type ItemBusca = {
  id: string;
  tipo: "produto" | "adicional";
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  custoBase: number;
  fornecedorPadrao: string;
  categoria: string;
  variacoes: ProdutoVariacaoCompra[];
};

type ItemPedido = ItemBusca & {
  itemKey: string;
  quantidade: number;
  tamanhoAnel: string;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getVariacaoPrincipal(item: { variacoes?: ProdutoVariacaoCompra[] }) {
  return (
    item.variacoes?.find(
      (variacao) =>
        variacao.obrigatoria !== false &&
        Array.isArray(variacao.opcoes) &&
        variacao.opcoes.length > 0
    ) || null
  );
}

function produtoTemVariacao(item: { variacoes?: ProdutoVariacaoCompra[] }) {
  return Boolean(getVariacaoPrincipal(item));
}

function normalizarOpcaoVariacao(valor: string) {
  return valor.trim();
}

function gerarItemKey(item: ItemBusca, tamanhoAnel = "") {
  return `${item.tipo}-${item.id}-${tamanhoAnel || "UNICO"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function Info({
  label,
  value,
  destaque = false,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 ${
          destaque ? "text-2xl font-bold" : "text-lg font-semibold"
        } text-slate-900`}
      >
        {value}
      </p>
    </div>
  );
}

export default function NovaCompraV2Client({
  itensBusca,
}: {
  itensBusca: ItemBusca[];
}) {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<
    "todos" | "produto" | "adicional"
  >("todos");
  const [frete, setFrete] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [fornecedor, setFornecedor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return itensBusca.filter((item) => {
      const bateTipo = filtroTipo === "todos" ? true : item.tipo === filtroTipo;

      const bateFornecedor =
        fornecedor.trim() === ""
          ? true
          : item.fornecedorPadrao === fornecedor;

      const bateBusca =
        termo === ""
          ? true
          : item.nome.toLowerCase().includes(termo) ||
            item.codigoInterno.toLowerCase().includes(termo) ||
            item.codigoFornecedor.toLowerCase().includes(termo) ||
            item.fornecedorPadrao.toLowerCase().includes(termo) ||
            item.categoria.toLowerCase().includes(termo);

      return bateTipo && bateFornecedor && bateBusca;
    });
  }, [busca, filtroTipo, fornecedor, itensBusca]);

  const descontoAutomatico = useMemo(() => {
    const subtotalProdutos = itensPedido
      .filter((item) => item.tipo === "produto")
      .reduce((acc, item) => acc + item.custoBase * item.quantidade, 0);

    if (subtotalProdutos > 3000) return 20;
    if (subtotalProdutos > 2000) return 15;
    if (subtotalProdutos > 1200) return 10;
    if (subtotalProdutos > 800) return 5;
    return 0;
  }, [itensPedido]);

  const subtotalProdutos = useMemo(() => {
    return itensPedido
      .filter((item) => item.tipo === "produto")
      .reduce((acc, item) => acc + item.custoBase * item.quantidade, 0);
  }, [itensPedido]);

  const subtotalAdicionais = useMemo(() => {
    return itensPedido
      .filter((item) => item.tipo === "adicional")
      .reduce((acc, item) => acc + item.custoBase * item.quantidade, 0);
  }, [itensPedido]);

  const valorDescontoProdutos = useMemo(() => {
    return subtotalProdutos * (descontoAutomatico / 100);
  }, [subtotalProdutos, descontoAutomatico]);

  const freteNumero = Number(frete.replace(",", ".")) || 0;

  const totalFinal = useMemo(() => {
    return (
      subtotalProdutos -
      valorDescontoProdutos +
      subtotalAdicionais +
      freteNumero
    );
  }, [subtotalProdutos, valorDescontoProdutos, subtotalAdicionais, freteNumero]);

  function adicionarItem(item: ItemBusca) {
    setErro("");

    const fornecedorItem = item.fornecedorPadrao.trim();

    if (!fornecedorItem) {
      setErro(
        `O item ${item.nome} não possui fornecedor padrão cadastrado. Ajuste o cadastro antes de comprar.`
      );
      return;
    }

    if (fornecedor && fornecedorItem !== fornecedor) {
      setErro(
        `Este pedido já está vinculado ao fornecedor ${fornecedor}. Para comprar de ${fornecedorItem}, crie outro pedido.`
      );
      return;
    }

    if (!fornecedor) {
      setFornecedor(fornecedorItem);
    }

    const ehAnel = produtoTemVariacao(item);

    if (ehAnel) {
      setItensPedido((atual) => [
        ...atual,
        {
          ...item,
          itemKey: gerarItemKey(item),
          quantidade: 1,
          tamanhoAnel: "",
        },
      ]);

      return;
    }

    setItensPedido((atual) => {
      const existente = atual.find(
        (pedidoItem) =>
          pedidoItem.id === item.id &&
          pedidoItem.tipo === item.tipo &&
          !produtoTemVariacao(pedidoItem)
      );

      if (existente) {
        return atual.map((pedidoItem) =>
          pedidoItem.itemKey === existente.itemKey
            ? { ...pedidoItem, quantidade: pedidoItem.quantidade + 1 }
            : pedidoItem
        );
      }

      return [
        ...atual,
        {
          ...item,
          itemKey: gerarItemKey(item),
          quantidade: 1,
          tamanhoAnel: "",
        },
      ];
    });
  }

  function alterarQuantidade(itemKey: string, quantidade: number) {
    if (quantidade <= 0) return;

    setItensPedido((atual) =>
      atual.map((item) =>
        item.itemKey === itemKey ? { ...item, quantidade } : item
      )
    );
  }

  function alterarTamanhoAnel(itemKey: string, tamanho: string) {
    setErro("");

    setItensPedido((atual) =>
      atual.map((item) =>
        item.itemKey === itemKey
          ? {
              ...item,
              tamanhoAnel: tamanho,
            }
          : item
      )
    );
  }

  function removerItem(itemKey: string) {
    setItensPedido((atual) => {
      const novosItens = atual.filter((item) => item.itemKey !== itemKey);

      if (novosItens.length === 0) {
        setFornecedor("");
      }

      return novosItens;
    });
  }

  function valorUnitarioFinal(item: ItemPedido) {
    if (item.tipo === "produto") {
      return item.custoBase * (1 - descontoAutomatico / 100);
    }

    return item.custoBase;
  }

  async function confirmarCompra() {
    try {
      setErro("");

      if (!fornecedor) {
        setErro("Adicione pelo menos um item para definir o fornecedor.");
        return;
      }

      if (itensPedido.length === 0) {
        setErro("Adicione pelo menos um item à compra.");
        return;
      }

      const itemFornecedorDiferente = itensPedido.find(
        (item) => item.fornecedorPadrao !== fornecedor
      );

      if (itemFornecedorDiferente) {
        setErro(
          `O item ${itemFornecedorDiferente.nome} pertence a outro fornecedor. Use apenas um fornecedor por pedido.`
        );
        return;
      }

      const anelSemTamanho = itensPedido.find(
        (item) => produtoTemVariacao(item) && !normalizarOpcaoVariacao(item.tamanhoAnel)
      );

      if (anelSemTamanho) {
        setErro(
          `Informe a variação para o produto ${anelSemTamanho.nome}.`
        );
        return;
      }

      setSalvando(true);

      const resposta = await fetch("/api/compras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fornecedor,
          frete: freteNumero,
          observacoes,
          itens: itensPedido.map((item) => ({
            id: item.id,
            tipo: item.tipo,
            codigoInterno: item.codigoInterno,
            codigoFornecedor: item.codigoFornecedor,
            nome: item.nome,
            custoBase: item.custoBase,
            fornecedorPadrao: item.fornecedorPadrao,
            quantidade: item.quantidade,
            tamanhoAnel: produtoTemVariacao(item)
              ? normalizarOpcaoVariacao(item.tamanhoAnel)
              : null,
          })),
        }),
      });

      const data = await resposta.json();

      if (!resposta.ok) {
        setErro(data.error || "Erro ao finalizar compra.");
        setSalvando(false);
        return;
      }

      window.location.href = "/compras";
    } catch {
      setErro("Erro ao finalizar compra.");
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compras
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Nova Compra
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Monte o pedido em uma única tela. O fornecedor é definido
              automaticamente pelo primeiro item adicionado.
            </p>
          </div>

          <Link
            href="/compras"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Voltar para lista
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Busca de itens
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Após adicionar o primeiro item, a busca passa a mostrar apenas
                  itens do mesmo fornecedor.
                </p>
              </div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setFiltroTipo("todos")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    filtroTipo === "todos"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Todos
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroTipo("produto")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    filtroTipo === "produto"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Produtos
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroTipo("adicional")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    filtroTipo === "adicional"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Adicionais
                </button>
              </div>
            </div>

            {fornecedor ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Fornecedor do pedido:{" "}
                <span className="font-semibold">{fornecedor}</span>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                O fornecedor será preenchido automaticamente ao adicionar o
                primeiro item.
              </div>
            )}

            <div className="mt-5">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por código, nome, categoria ou fornecedor"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
              />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-[860px] w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-600">
                    <th className="px-4 py-3 font-semibold">Código</th>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 font-semibold">Custo</th>
                    <th className="px-4 py-3 font-semibold">Fornecedor</th>
                    <th className="px-4 py-3 text-right font-semibold">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        Nenhum item encontrado para os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    itensFiltrados.map((item) => (
                      <tr
                        key={`${item.tipo}-${item.id}`}
                        className="text-sm text-slate-700"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.codigoInterno}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span>{item.nome}</span>
                            <span className="mt-0.5 text-xs text-slate-400">
                              {item.tipo === "produto"
                                ? "Produto"
                                : "Item adicional"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {item.tipo === "produto" ? (
                            item.categoria
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3">{moeda(item.custoBase)}</td>

                        <td className="px-4 py-3">{item.fornecedorPadrao}</td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => adicionarItem(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                              title="Adicionar item"
                              aria-label={`Adicionar ${item.nome}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Itens da compra
              </h2>
            </div>

            {itensPedido.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">
                Ainda não há itens adicionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1080px] w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-sm text-slate-600">
                      <th className="px-6 py-4 font-semibold">Código</th>
                      <th className="px-6 py-4 font-semibold">Descrição</th>
                      <th className="px-6 py-4 font-semibold">Variação</th>
                      <th className="px-6 py-4 font-semibold">Qtd</th>
                      <th className="px-6 py-4 font-semibold">Unit. base</th>
                      <th className="px-6 py-4 font-semibold">Desc.</th>
                      <th className="px-6 py-4 font-semibold">Unit. final</th>
                      <th className="px-6 py-4 font-semibold">Total</th>
                      <th className="px-6 py-4 text-right font-semibold">
                        Ação
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {itensPedido.map((item) => {
                      const unitFinal = valorUnitarioFinal(item);
                      const totalLinha = unitFinal * item.quantidade;
                      const ehAnel = produtoTemVariacao(item);

                      return (
                        <tr key={item.itemKey} className="text-sm text-slate-700">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {item.codigoInterno}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span>{item.nome}</span>
                              <span className="mt-0.5 text-xs text-slate-400">
                                {item.tipo === "produto"
                                  ? item.categoria || "Produto"
                                  : "Item adicional"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {ehAnel ? (
                              <div className="min-w-[180px]">
                                <select
                                  value={item.tamanhoAnel}
                                  onChange={(event) =>
                                    alterarTamanhoAnel(item.itemKey, event.target.value)
                                  }
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                                >
                                  <option value="">
                                    Selecione {getVariacaoPrincipal(item)?.nome || "a opção"}
                                  </option>

                                  {(getVariacaoPrincipal(item)?.opcoes || []).map((opcao) => (
                                    <option key={opcao.id} value={opcao.nome}>
                                      {opcao.nome}
                                    </option>
                                  ))}
                                </select>

                                <p className="mt-1 text-[11px] text-slate-400">
                                  {getVariacaoPrincipal(item)?.nome || "Variação"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">Sem variação</span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <input
                              type="number"
                              min={1}
                              value={item.quantidade}
                              onChange={(event) =>
                                alterarQuantidade(
                                  item.itemKey,
                                  Number(event.target.value || 1)
                                )
                              }
                              className="w-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                            />
                          </td>

                          <td className="px-6 py-4">{moeda(item.custoBase)}</td>

                          <td className="px-6 py-4">
                            {item.tipo === "produto"
                              ? `${descontoAutomatico}%`
                              : "-"}
                          </td>

                          <td className="px-6 py-4">{moeda(unitFinal)}</td>

                          <td className="px-6 py-4">{moeda(totalLinha)}</td>

                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removerItem(item.itemKey)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                                title="Remover item"
                                aria-label={`Remover ${item.nome}`}
                              >
                                <Trash2 className="h-4 w-4" />
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
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Dados da compra
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Fornecedor
                </label>

                <input
                  value={fornecedor || "Será definido automaticamente"}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 outline-none"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Cada pedido permite apenas um fornecedor. Para trocar, remova
                  todos os itens do pedido.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Frete
                </label>

                <input
                  value={frete}
                  onChange={(event) => setFrete(event.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Observações
                </label>

                <textarea
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  rows={4}
                  placeholder="Observações da compra"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Resumo financeiro
            </h2>

            <div className="mt-5 space-y-4">
              <Info label="Subtotal produtos" value={moeda(subtotalProdutos)} />
              <Info
                label="Desconto automático"
                value={`${descontoAutomatico}%`}
              />
              <Info
                label="Valor do desconto"
                value={moeda(valorDescontoProdutos)}
              />
              <Info
                label="Subtotal adicionais"
                value={moeda(subtotalAdicionais)}
              />
              <Info label="Frete" value={moeda(freteNumero)} />
              <Info label="Total final" value={moeda(totalFinal)} destaque />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            {erro ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {erro}
              </div>
            ) : null}

            <button
              type="button"
              onClick={confirmarCompra}
              disabled={salvando}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Confirmar compra"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}