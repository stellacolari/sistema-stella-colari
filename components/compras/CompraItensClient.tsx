"use client";

import { useEffect, useMemo, useState } from "react";

type ItemCompra = {
  id: string;
  tipoItem: string;
  codigoDigitado: string;
  descricao: string;
  quantidade: number;
  valorUnitarioBase: number;
  valorUnitarioFinal: number;
  valorTotalComFrete: number;
};

type TipoItem = "produto" | "adicional";

type SugestaoItem = {
  id: string;
  tipoItem: TipoItem;
  codigoInterno: string;
  codigoFornecedor: string | null;
  codigoPreferencial: string;
  nome: string;
  categoria: string;
  valorUnitarioBase: number;
  tamanhos: string[];
  temTamanho: boolean;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function numeroParaInput(valor: number) {
  if (!Number.isFinite(valor)) {
    return "";
  }

  return String(valor).replace(".", ",");
}

function normalizarNumeroInput(valor: string) {
  return Number(String(valor || "0").replace(",", "."));
}

export default function CompraItensClient({
  compraId,
  itens,
}: {
  compraId: string;
  itens: ItemCompra[];
}) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [adicionarAberto, setAdicionarAberto] = useState(false);
  const [tipoItem, setTipoItem] = useState<TipoItem>("produto");
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [tamanhoAnel, setTamanhoAnel] = useState("UNICO");
  const [valorUnitarioBase, setValorUnitarioBase] = useState("");
  const [motivo, setMotivo] = useState("Inclusão posterior de item na compra.");

  const [buscaItem, setBuscaItem] = useState("");
  const [sugestoes, setSugestoes] = useState<SugestaoItem[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<SugestaoItem | null>(
    null
  );

  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);
  const [novaQuantidade, setNovaQuantidade] = useState("");
  const [motivoAlteracao, setMotivoAlteracao] = useState(
    "Alteração de quantidade de item da compra."
  );

  const mostrarCampoTamanho = useMemo(() => {
    return (
      tipoItem === "produto" &&
      itemSelecionado !== null &&
      itemSelecionado.temTamanho &&
      itemSelecionado.tamanhos.length > 0
    );
  }, [itemSelecionado, tipoItem]);

  useEffect(() => {
    const termo = buscaItem.trim();

    if (!adicionarAberto || termo.length < 2) {
      setSugestoes([]);
      return;
    }

    let ativo = true;

    async function buscarItens() {
      setBuscandoSugestoes(true);

      try {
        const response = await fetch(
          `/api/compras/buscar-itens?q=${encodeURIComponent(termo)}`
        );

        const data = await response.json().catch(() => ({}));

        if (!ativo) return;

        if (!response.ok) {
          setSugestoes([]);
          return;
        }

        setSugestoes(Array.isArray(data.itens) ? data.itens : []);
      } catch {
        if (ativo) {
          setSugestoes([]);
        }
      } finally {
        if (ativo) {
          setBuscandoSugestoes(false);
        }
      }
    }

    const timeout = window.setTimeout(() => {
      void buscarItens();
    }, 250);

    return () => {
      ativo = false;
      window.clearTimeout(timeout);
    };
  }, [adicionarAberto, buscaItem]);

  function toggleItem(id: string) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
  }

  function limparMensagens() {
    setErro("");
    setSucesso("");
  }

  function recarregarPagina() {
    window.location.reload();
  }

  function selecionarSugestao(item: SugestaoItem) {
    setItemSelecionado(item);
    setTipoItem(item.tipoItem);
    setCodigoDigitado(item.codigoPreferencial);
    setBuscaItem(`${item.codigoPreferencial} · ${item.nome}`);
    setValorUnitarioBase(numeroParaInput(item.valorUnitarioBase));
    setTamanhoAnel(item.temTamanho && item.tamanhos[0] ? item.tamanhos[0] : "UNICO");
    setSugestoes([]);
    limparMensagens();
  }

  function limparItemSelecionado() {
    setItemSelecionado(null);
    setBuscaItem("");
    setCodigoDigitado("");
    setValorUnitarioBase("");
    setTamanhoAnel("UNICO");
    setSugestoes([]);
  }

  async function cancelarSelecionados() {
    limparMensagens();

    if (selecionados.length === 0) {
      setErro("Selecione pelo menos um item.");
      return;
    }

    const confirmado = window.confirm(
      "Tem certeza que deseja cancelar os itens selecionados desta compra? Essa ação vai ajustar o estoque e registrar a movimentação."
    );

    if (!confirmado) return;

    try {
      setCarregando(true);

      const resposta = await fetch(`/api/compras/${compraId}/cancelar-itens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemIds: selecionados,
        }),
      });

      const data = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(data.error || "Erro ao cancelar itens.");
        setCarregando(false);
        return;
      }

      setSucesso("Itens cancelados com sucesso.");
      recarregarPagina();
    } catch {
      setErro("Erro ao cancelar itens.");
      setCarregando(false);
    }
  }

  async function adicionarItem() {
    limparMensagens();

    if (!itemSelecionado) {
      setErro("Selecione um produto ou item adicional da lista de sugestões.");
      return;
    }

    if (!codigoDigitado.trim()) {
      setErro("Informe o código do item.");
      return;
    }

    if (Number(quantidade) <= 0) {
      setErro("A quantidade deve ser maior que zero.");
      return;
    }

    if (normalizarNumeroInput(valorUnitarioBase) <= 0) {
      setErro("O valor unitário deve ser maior que zero.");
      return;
    }

    try {
      setCarregando(true);

      const resposta = await fetch(`/api/compras/${compraId}/adicionar-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipoItem,
          codigoDigitado,
          quantidade: Number(quantidade),
          tamanhoAnel: mostrarCampoTamanho ? tamanhoAnel : "UNICO",
          valorUnitarioBase: normalizarNumeroInput(valorUnitarioBase),
          motivo,
        }),
      });

      const data = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(data.error || "Erro ao adicionar item.");
        setCarregando(false);
        return;
      }

      setSucesso("Item adicionado com sucesso.");
      recarregarPagina();
    } catch {
      setErro("Erro ao adicionar item.");
      setCarregando(false);
    }
  }

  async function alterarQuantidade(item: ItemCompra) {
    limparMensagens();

    const quantidadeFinal = Number(novaQuantidade);

    if (!Number.isFinite(quantidadeFinal) || quantidadeFinal <= 0) {
      setErro("A nova quantidade deve ser maior que zero.");
      return;
    }

    if (quantidadeFinal === item.quantidade) {
      setErro("A nova quantidade é igual à quantidade atual.");
      return;
    }

    const confirmado = window.confirm(
      `Alterar a quantidade de "${item.descricao}" de ${item.quantidade} para ${quantidadeFinal}? Essa ação vai ajustar o estoque e registrar a movimentação.`
    );

    if (!confirmado) return;

    try {
      setCarregando(true);

      const resposta = await fetch(
        `/api/compras/${compraId}/itens/${item.id}/quantidade`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantidade: quantidadeFinal,
            motivo: motivoAlteracao,
          }),
        }
      );

      const data = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(data.error || "Erro ao alterar quantidade.");
        setCarregando(false);
        return;
      }

      setSucesso("Quantidade alterada com sucesso.");
      recarregarPagina();
    } catch {
      setErro("Erro ao alterar quantidade.");
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 px-6 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            {selecionados.length} item(ns) selecionado(s)
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Alterações feitas aqui ajustam estoque e geram registro em
            movimentações.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              limparMensagens();
              setAdicionarAberto((atual) => !atual);
            }}
            disabled={carregando}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adicionarAberto ? "Fechar adição" : "Adicionar item"}
          </button>

          <button
            type="button"
            onClick={cancelarSelecionados}
            disabled={carregando || selecionados.length === 0}
            className="inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {carregando ? "Processando..." : "Excluir itens selecionados"}
          </button>
        </div>
      </div>

      {erro ? (
        <div className="mx-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {erro}
        </div>
      ) : null}

      {sucesso ? (
        <div className="mx-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {sucesso}
        </div>
      ) : null}

      {adicionarAberto ? (
        <div className="mx-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-950">
              Adicionar item à compra
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Digite o código ou nome, selecione uma sugestão e o sistema
              preencherá o tipo, código, preço e variação quando existir.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="relative block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Buscar produto ou item adicional
              </span>

              <input
                value={buscaItem}
                onChange={(event) => {
                  setBuscaItem(event.target.value);
                  setItemSelecionado(null);
                  setCodigoDigitado("");
                  setValorUnitarioBase("");
                  setTamanhoAnel("UNICO");
                }}
                placeholder="Digite código interno, código do fornecedor ou nome"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
              />

              {(buscandoSugestoes || sugestoes.length > 0) && (
                <div className="absolute left-0 right-0 top-[74px] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {buscandoSugestoes ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      Buscando...
                    </div>
                  ) : (
                    sugestoes.map((item) => (
                      <button
                        key={`${item.tipoItem}-${item.id}`}
                        type="button"
                        onClick={() => selecionarSugestao(item)}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                      >
                        <span className="block text-sm font-semibold text-slate-950">
                          {item.nome}
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          {item.tipoItem === "produto"
                            ? "Produto"
                            : "Item adicional"}{" "}
                          · {item.codigoInterno}
                          {item.codigoFornecedor
                            ? ` · Fornecedor: ${item.codigoFornecedor}`
                            : ""}{" "}
                          · {moeda(item.valorUnitarioBase)}
                        </span>

                        {item.temTamanho && (
                          <span className="mt-1 block text-xs font-medium text-slate-600">
                            Variações: {item.tamanhos.join(", ")}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </label>

            {itemSelecionado && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold">
                      Selecionado: {itemSelecionado.nome}
                    </p>
                    <p className="mt-1 text-xs">
                      {itemSelecionado.tipoItem === "produto"
                        ? "Produto"
                        : "Item adicional"}{" "}
                      · Código {itemSelecionado.codigoInterno} ·{" "}
                      {moeda(itemSelecionado.valorUnitarioBase)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={limparItemSelecionado}
                    className="w-fit rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    Trocar item
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Tipo
                </span>

                <input
                  value={tipoItem === "produto" ? "Produto" : "Item adicional"}
                  readOnly
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Código
                </span>

                <input
                  value={codigoDigitado}
                  readOnly
                  placeholder="Selecione uma sugestão"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Quantidade
                </span>

                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(event) => setQuantidade(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Valor unitário base
                </span>

                <input
                  value={valorUnitarioBase}
                  onChange={(event) => setValorUnitarioBase(event.target.value)}
                  placeholder="Preenchido automaticamente"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                />
              </label>

              {mostrarCampoTamanho ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Tamanho / variação
                  </span>

                  <select
                    value={tamanhoAnel}
                    onChange={(event) => setTamanhoAnel(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                  >
                    {itemSelecionado?.tamanhos.map((tamanho) => (
                      <option key={tamanho} value={tamanho}>
                        {tamanho}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label
                className={`block ${
                  mostrarCampoTamanho
                    ? "md:col-span-1 xl:col-span-3"
                    : "md:col-span-2 xl:col-span-4"
                }`}
              >
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Motivo do ajuste
                </span>

                <input
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                />
              </label>
            </div>

            {!itemSelecionado && buscaItem.trim().length >= 2 && sugestoes.length === 0 && !buscandoSugestoes ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Nenhum item encontrado. Confira o código ou nome cadastrado.
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={adicionarItem}
              disabled={carregando || !itemSelecionado}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? "Adicionando..." : "Adicionar e registrar ajuste"}
            </button>
          </div>
        </div>
      ) : null}

      {itens.length === 0 ? (
        <div className="px-6 py-10 text-sm text-slate-500">
          Nenhum item cadastrado nesta compra ainda.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-sm text-slate-600">
                <th className="px-6 py-4 font-semibold"></th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Qtd</th>
                <th className="px-6 py-4 font-semibold">Unit. base</th>
                <th className="px-6 py-4 font-semibold">Unit. final</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {itens.map((item) => {
                const editando = editandoItemId === item.id;

                return (
                  <tr key={item.id} className="text-sm text-slate-700">
                    <td className="px-6 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>

                    <td className="px-6 py-4 align-top">{item.tipoItem}</td>

                    <td className="px-6 py-4 align-top font-medium text-slate-900">
                      {item.codigoDigitado}
                    </td>

                    <td className="px-6 py-4 align-top">{item.descricao}</td>

                    <td className="px-6 py-4 align-top">{item.quantidade}</td>

                    <td className="px-6 py-4 align-top">
                      {moeda(Number(item.valorUnitarioBase))}
                    </td>

                    <td className="px-6 py-4 align-top">
                      {moeda(Number(item.valorUnitarioFinal))}
                    </td>

                    <td className="px-6 py-4 align-top">
                      {moeda(Number(item.valorTotalComFrete))}
                    </td>

                    <td className="px-6 py-4 align-top">
                      {!editando ? (
                        <button
                          type="button"
                          onClick={() => {
                            limparMensagens();
                            setEditandoItemId(item.id);
                            setNovaQuantidade(String(item.quantidade));
                            setMotivoAlteracao(
                              "Alteração de quantidade de item da compra."
                            );
                          }}
                          disabled={carregando}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Alterar qtd
                        </button>
                      ) : (
                        <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Nova quantidade
                            </span>

                            <input
                              type="number"
                              min={1}
                              value={novaQuantidade}
                              onChange={(event) =>
                                setNovaQuantidade(event.target.value)
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                            />
                          </label>

                          <label className="mt-2 block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Motivo
                            </span>

                            <input
                              value={motivoAlteracao}
                              onChange={(event) =>
                                setMotivoAlteracao(event.target.value)
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                            />
                          </label>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => alterarQuantidade(item)}
                              disabled={carregando}
                              className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Salvar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditandoItemId(null);
                                setNovaQuantidade("");
                              }}
                              disabled={carregando}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}