"use client";

import { useMemo, useState } from "react";
import { PackagePlus, Plus, Trash2 } from "lucide-react";

export type ProdutoKitDisponivel = {
  id: string;
  codigoInterno: string;
  nome: string;
  categoria: string;
  tipoProduto: string;
  custoBase: number;
};

export type ComponenteKitInicial = {
  componenteProdutoId: string;
  quantidade: number;
};

type ComponenteSelecionado = {
  componenteProdutoId: string;
  quantidade: number;
};

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default function ComposicaoKitInput({
  produtosDisponiveis,
  componentesIniciais = [],
}: {
  produtosDisponiveis: ProdutoKitDisponivel[];
  componentesIniciais?: ComponenteKitInicial[];
}) {
  const [busca, setBusca] = useState("");
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [componentes, setComponentes] = useState<ComponenteSelecionado[]>(
    componentesIniciais
  );
  const [erro, setErro] = useState("");

  const termo = normalizarTexto(busca);

  const produtosFiltrados = useMemo(() => {
    const idsJaSelecionados = new Set(
      componentes.map((item) => item.componenteProdutoId)
    );

    return produtosDisponiveis
      .filter((produto) => !idsJaSelecionados.has(produto.id))
      .filter((produto) => {
        if (!termo) return true;

        const texto = normalizarTexto(
          [
            produto.codigoInterno,
            produto.nome,
            produto.categoria,
            produto.tipoProduto,
          ].join(" ")
        );

        return texto.includes(termo);
      })
      .slice(0, 20);
  }, [componentes, produtosDisponiveis, termo]);

  const componentesDetalhados = useMemo(() => {
    const mapa = new Map(
      produtosDisponiveis.map((produto) => [produto.id, produto])
    );

    return componentes
      .map((componente) => {
        const produto = mapa.get(componente.componenteProdutoId);

        if (!produto) return null;

        return {
          ...componente,
          produto,
        };
      })
      .filter(Boolean) as {
      componenteProdutoId: string;
      quantidade: number;
      produto: ProdutoKitDisponivel;
    }[];
  }, [componentes, produtosDisponiveis]);

  const custoCalculadoKit = useMemo(() => {
    return componentesDetalhados.reduce((total, item) => {
      return total + Number(item.produto.custoBase || 0) * item.quantidade;
    }, 0);
  }, [componentesDetalhados]);

  function adicionarComponente() {
    setErro("");

    if (!produtoSelecionadoId) {
      setErro("Selecione um produto para adicionar ao kit.");
      return;
    }

    const quantidadeNumero = Number(quantidade);

    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      setErro("A quantidade precisa ser maior que zero.");
      return;
    }

    const produto = produtosDisponiveis.find(
      (item) => item.id === produtoSelecionadoId
    );

    if (!produto) {
      setErro("Produto selecionado não encontrado.");
      return;
    }

    if (componentes.some((item) => item.componenteProdutoId === produto.id)) {
      setErro("Este produto já faz parte do kit.");
      return;
    }

    setComponentes((atuais) => [
      ...atuais,
      {
        componenteProdutoId: produto.id,
        quantidade: quantidadeNumero,
      },
    ]);

    setProdutoSelecionadoId("");
    setQuantidade("1");
    setBusca("");
  }

  function removerComponente(produtoId: string) {
    setComponentes((atuais) =>
      atuais.filter((item) => item.componenteProdutoId !== produtoId)
    );
  }

  function alterarQuantidade(produtoId: string, novaQuantidade: string) {
    const quantidadeNumero = Number(novaQuantidade);

    setComponentes((atuais) =>
      atuais.map((item) =>
        item.componenteProdutoId === produtoId
          ? {
              ...item,
              quantidade:
                Number.isFinite(quantidadeNumero) && quantidadeNumero > 0
                  ? quantidadeNumero
                  : item.quantidade,
            }
          : item
      )
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <input
        type="hidden"
        name="kitComponentes"
        value={JSON.stringify(componentes)}
      />

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <PackagePlus className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Composição do kit
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Escolha os produtos unitários que compõem este kit. O custo do kit
            será calculado automaticamente com base nos produtos internos.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_120px_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Buscar produto
            </span>

            <input
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                setProdutoSelecionadoId("");
              }}
              placeholder="Digite código ou nome do produto"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500"
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
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={adicionarComponente}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>
        </div>

        {busca.trim() && produtosFiltrados.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            {produtosFiltrados.map((produto) => {
              const selecionado = produtoSelecionadoId === produto.id;

              return (
                <button
                  key={produto.id}
                  type="button"
                  onClick={() => {
                    setProdutoSelecionadoId(produto.id);
                    setBusca(`${produto.codigoInterno} · ${produto.nome}`);
                  }}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                    selecionado ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-950">
                    {produto.nome}
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    {produto.codigoInterno} · {produto.categoria} · Custo:{" "}
                    {moeda(Number(produto.custoBase || 0))}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {busca.trim() && produtosFiltrados.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nenhum produto encontrado ou todos os resultados já foram adicionados
            ao kit.
          </div>
        )}

        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">
              Produtos dentro do kit
            </p>
          </div>

          {componentesDetalhados.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              Nenhum produto adicionado ao kit ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {componentesDetalhados.map((item) => (
                <div
                  key={item.componenteProdutoId}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_auto] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {item.produto.nome}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.produto.codigoInterno} · {item.produto.categoria} ·
                      Custo unitário: {moeda(Number(item.produto.custoBase || 0))}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Subtotal no kit:{" "}
                      {moeda(Number(item.produto.custoBase || 0) * item.quantidade)}
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">
                      Qtd. no kit
                    </span>

                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(event) =>
                        alterarQuantidade(
                          item.componenteProdutoId,
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => removerComponente(item.componenteProdutoId)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Custo calculado do kit
          </p>

          <p className="mt-1 text-xl font-semibold text-emerald-950">
            {moeda(custoCalculadoKit)}
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-700">
            Esse valor será salvo como custo base do kit. O preço de venda será
            calculado a partir deste custo multiplicado pela margem aplicada.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
          Exemplo: se o kit possui 1 anel e 1 colar, ao comprar 10 kits o
          estoque recebe 10 anéis e 10 colares. Ao vender 2 kits, o estoque baixa
          2 anéis e 2 colares.
        </div>
      </div>
    </div>
  );
}