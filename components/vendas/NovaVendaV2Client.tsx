"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ImageIcon, Plus, Trash2, X } from "lucide-react";

type ClienteBusca = {
  id: string;
  codigo: string;
  nome: string;
  documento: string;
};

type EstoquePorTamanho = {
  tamanhoAnel: string;
  quantidadeAtual: number;
};

type ProdutoVariacaoOpcaoVenda = {
  id: string;
  nome: string;
  imagemUrl?: string | null;
  ativo?: boolean;
  ordem?: number;
};

type ProdutoVariacaoVenda = {
  id: string;
  nome: string;
  obrigatoria: boolean;
  opcoes: ProdutoVariacaoOpcaoVenda[];
};

type ProdutoBusca = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  imagemUrl?: string | null;
  precoVenda: number;
  categoria: string;
  estoqueAtual: number;
  estoquesPorTamanho: EstoquePorTamanho[];
  tipoProduto?: string;
  variacoes?: ProdutoVariacaoVenda[];
};

type ItemPedido = ProdutoBusca & {
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

function produtoEhAnel(produto: { categoria: string }) {
  return normalizarTexto(produto.categoria) === "anel";
}

function normalizarTamanhoAnel(tamanho: string) {
  return tamanho.trim().toUpperCase();
}

function gerarItemKey(produtoId: string, tamanhoAnel = "") {
  return `${produtoId}-${tamanhoAnel || "UNICO"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getEstoqueDisponivel(item: {
  estoqueAtual: number;
  estoquesPorTamanho: EstoquePorTamanho[];
  categoria: string;
  tamanhoAnel: string;
}) {
  if (!produtoEhAnel(item)) {
    return item.estoqueAtual;
  }

  const tamanho = normalizarTamanhoAnel(item.tamanhoAnel);

  if (!tamanho) {
    return 0;
  }

  return (
    item.estoquesPorTamanho.find(
      (estoque) => normalizarTamanhoAnel(estoque.tamanhoAnel) === tamanho
    )?.quantidadeAtual ?? 0
  );
}

function getTamanhosDisponiveis(produto: ProdutoBusca) {
  return produto.estoquesPorTamanho
    .filter(
      (estoque) =>
        estoque.tamanhoAnel !== "UNICO" && estoque.quantidadeAtual > 0
    )
    .map((estoque) => ({
      tamanhoAnel: estoque.tamanhoAnel,
      quantidadeAtual: estoque.quantidadeAtual,
    }));
}

function getOpcaoVariacaoSelecionada(item: ItemPedido) {
  if (!item.tamanhoAnel) {
    return null;
  }

  const tamanho = normalizarTamanhoAnel(item.tamanhoAnel);

  for (const variacao of item.variacoes || []) {
    const opcao = variacao.opcoes.find(
      (opcaoVariacao) =>
        opcaoVariacao.ativo !== false &&
        normalizarTamanhoAnel(opcaoVariacao.nome) === tamanho
    );

    if (opcao) {
      return opcao;
    }
  }

  return null;
}

function getImagemProduto(item: ProdutoBusca | ItemPedido) {
  if ("itemKey" in item) {
    return getOpcaoVariacaoSelecionada(item)?.imagemUrl || item.imagemUrl || null;
  }

  return item.imagemUrl || null;
}

function MiniaturaProduto({
  imagemUrl,
  nome,
}: {
  imagemUrl?: string | null;
  nome: string;
}) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {imagemUrl ? (
        <img
          src={imagemUrl}
          alt={nome}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon className="h-5 w-5 text-slate-300" />
      )}
    </div>
  );
}

function statusSaldo(estoqueAtual: number, quantidade: number) {
  const restante = estoqueAtual - quantidade;

  if (restante < 0) {
    return {
      label: "Sem saldo",
      className: "bg-rose-100 text-rose-700",
      numberClassName: "text-rose-700 bg-rose-50 border-rose-200",
    };
  }

  if (restante === 0) {
    return {
      label: "Zerando",
      className: "bg-amber-100 text-amber-700",
      numberClassName: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }

  if (restante <= 3) {
    return {
      label: "Baixo",
      className: "bg-yellow-100 text-yellow-700",
      numberClassName: "text-yellow-700 bg-yellow-50 border-yellow-200",
    };
  }

  return {
    label: "OK",
    className: "bg-emerald-100 text-emerald-700",
    numberClassName: "text-emerald-700 bg-emerald-50 border-emerald-200",
  };
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

export default function NovaVendaV2Client({
  clientes,
  produtos,
}: {
  clientes: ClienteBusca[];
  produtos: ProdutoBusca[];
}) {
  const [clientesDisponiveis, setClientesDisponiveis] = useState(clientes);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [meioVenda, setMeioVenda] = useState("");
  const [descontoPercentual, setDescontoPercentual] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState("");
  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    telefone: "",
    email: "",
    documento: "",
    tipoCliente: "PESSOA FÍSICA",
    observacoes: "",
  });

  const clienteSelecionado = useMemo(() => {
    return (
      clientesDisponiveis.find((cliente) => cliente.id === clienteSelecionadoId) ||
      null
    );
  }, [clientesDisponiveis, clienteSelecionadoId]);

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();

    if (!termo) return [];

    return clientesDisponiveis
      .filter((cliente) => {
        return (
          cliente.nome.toLowerCase().includes(termo) ||
          cliente.documento.toLowerCase().includes(termo)
        );
      })
      .slice(0, 8);
  }, [clientesDisponiveis, buscaCliente]);

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase();

    if (!termo) return produtos;

    return produtos.filter((produto) => {
      return (
        produto.nome.toLowerCase().includes(termo) ||
        produto.codigoInterno.toLowerCase().includes(termo) ||
        produto.codigoFornecedor.toLowerCase().includes(termo)
      );
    });
  }, [produtos, buscaProduto]);

  const descontoNumero = Number(descontoPercentual.replace(",", ".")) || 0;

  function adicionarProduto(produto: ProdutoBusca) {
    setErro("");

    if (produto.estoqueAtual <= 0) {
      setErro(`O produto ${produto.nome} está sem saldo no estoque.`);
      return;
    }

    const ehAnel = produtoEhAnel(produto);

    if (ehAnel) {
      const tamanhosDisponiveis = getTamanhosDisponiveis(produto);

      if (tamanhosDisponiveis.length === 0) {
        setErro(`O produto ${produto.nome} não possui tamanhos disponíveis.`);
        return;
      }

      const primeiroTamanho = tamanhosDisponiveis[0].tamanhoAnel;

      return setItensPedido((atual) => [
        ...atual,
        {
          ...produto,
          itemKey: gerarItemKey(produto.id, primeiroTamanho),
          quantidade: 1,
          tamanhoAnel: primeiroTamanho,
        },
      ]);
    }

    setItensPedido((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id && !produtoEhAnel(item)
      );

      if (existente) {
        if (existente.quantidade + 1 > produto.estoqueAtual) {
          setErro(
            `Não é possível adicionar mais unidades de ${produto.nome}. Saldo atual: ${produto.estoqueAtual}.`
          );
          return atual;
        }

        return atual.map((item) =>
          item.itemKey === existente.itemKey
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }

      return [
        ...atual,
        {
          ...produto,
          itemKey: gerarItemKey(produto.id),
          quantidade: 1,
          tamanhoAnel: "",
        },
      ];
    });
  }

  function alterarQuantidade(itemKey: string, quantidade: number) {
    setErro("");

    if (quantidade <= 0) return;

    setItensPedido((atual) =>
      atual.map((item) => {
        if (item.itemKey !== itemKey) return item;

        const estoqueDisponivel = getEstoqueDisponivel(item);

        if (quantidade > estoqueDisponivel) {
          setErro(
            produtoEhAnel(item)
              ? `A quantidade de ${item.nome} tamanho ${item.tamanhoAnel} não pode ser maior que o estoque atual (${estoqueDisponivel}).`
              : `A quantidade de ${item.nome} não pode ser maior que o estoque atual (${estoqueDisponivel}).`
          );
          return item;
        }

        return { ...item, quantidade };
      })
    );
  }

  function alterarTamanhoAnel(itemKey: string, tamanho: string) {
    setErro("");

    setItensPedido((atual) =>
      atual.map((item) => {
        if (item.itemKey !== itemKey) return item;

        const tamanhoNormalizado = normalizarTamanhoAnel(tamanho);

        const estoqueNovoTamanho =
          item.estoquesPorTamanho.find(
            (estoque) =>
              normalizarTamanhoAnel(estoque.tamanhoAnel) === tamanhoNormalizado
          )?.quantidadeAtual ?? 0;

        return {
          ...item,
          tamanhoAnel: tamanhoNormalizado,
          quantidade:
            item.quantidade > estoqueNovoTamanho
              ? Math.max(estoqueNovoTamanho, 1)
              : item.quantidade,
        };
      })
    );
  }

  function removerItem(itemKey: string) {
    setErro("");
    setItensPedido((atual) => atual.filter((item) => item.itemKey !== itemKey));
  }

  function valorUnitarioFinal(item: ItemPedido) {
    return item.precoVenda * (1 - descontoNumero / 100);
  }

  const subtotal = useMemo(() => {
    return itensPedido.reduce(
      (acc, item) => acc + item.precoVenda * item.quantidade,
      0
    );
  }, [itensPedido]);

  const valorDesconto = useMemo(() => {
    return subtotal * (descontoNumero / 100);
  }, [subtotal, descontoNumero]);

  const totalFinal = useMemo(() => {
    return subtotal - valorDesconto;
  }, [subtotal, valorDesconto]);

  async function confirmarVenda() {
    try {
      setErro("");

      if (!clienteSelecionado) {
        setErro("Selecione um cliente.");
        return;
      }

      if (!meioVenda) {
        setErro("Selecione o meio de venda.");
        return;
      }

      if (itensPedido.length === 0) {
        setErro("Adicione pelo menos um produto.");
        return;
      }

      const anelSemTamanho = itensPedido.find(
        (item) => produtoEhAnel(item) && !normalizarTamanhoAnel(item.tamanhoAnel)
      );

      if (anelSemTamanho) {
        setErro(
          `Informe o tamanho do anel para o produto ${anelSemTamanho.nome}.`
        );
        return;
      }

      const itemSemSaldo = itensPedido.find((item) => {
        const estoqueDisponivel = getEstoqueDisponivel(item);
        return item.quantidade > estoqueDisponivel;
      });

      if (itemSemSaldo) {
        setErro(
          produtoEhAnel(itemSemSaldo)
            ? `O item ${itemSemSaldo.nome} tamanho ${itemSemSaldo.tamanhoAnel} está com quantidade acima do estoque disponível.`
            : `O item ${itemSemSaldo.nome} está com quantidade acima do estoque disponível.`
        );
        return;
      }

      setSalvando(true);

      const resposta = await fetch("/api/vendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSelecionado.id,
          documentoCliente: clienteSelecionado.documento,
          meioVenda,
          descontoPercentual: descontoNumero,
          observacoes,
          itens: itensPedido.map((item) => ({
            id: item.id,
            codigoInterno: item.codigoInterno,
            codigoFornecedor: item.codigoFornecedor,
            nome: item.nome,
            precoVenda: item.precoVenda,
            categoria: item.categoria,
            quantidade: item.quantidade,
            tamanhoAnel: produtoEhAnel(item)
              ? normalizarTamanhoAnel(item.tamanhoAnel)
              : null,
          })),
        }),
      });

      const data = await resposta.json();

      if (!resposta.ok) {
        setErro(data.error || "Erro ao finalizar venda.");
        setSalvando(false);
        return;
      }

      window.location.href = "/vendas";
    } catch {
      setErro("Erro ao finalizar venda.");
      setSalvando(false);
    }
  }

  function selecionarCliente(cliente: ClienteBusca) {
    setClienteSelecionadoId(cliente.id);
    setBuscaCliente(`${cliente.documento} - ${cliente.nome}`);
  }

  function atualizarCampoNovoCliente(
    campo: keyof typeof novoCliente,
    valor: string
  ) {
    setNovoCliente((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function fecharModalCliente() {
    if (salvandoCliente) return;

    setModalClienteAberto(false);
    setErroCliente("");
    setNovoCliente({
      nome: "",
      telefone: "",
      email: "",
      documento: "",
      tipoCliente: "PESSOA FÍSICA",
      observacoes: "",
    });
  }

  async function criarClienteRapido() {
    try {
      setErroCliente("");

      if (!novoCliente.nome.trim()) {
        setErroCliente("Informe o nome do cliente.");
        return;
      }

      if (!novoCliente.telefone.trim()) {
        setErroCliente("Informe telefone/WhatsApp.");
        return;
      }

      if (!novoCliente.documento.trim()) {
        setErroCliente("Informe CPF/CNPJ do cliente.");
        return;
      }

      setSalvandoCliente(true);

      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(novoCliente),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroCliente(data.error || "Erro ao cadastrar cliente.");
        setSalvandoCliente(false);
        return;
      }

      const clienteCriado = data.cliente as ClienteBusca | undefined;

      if (!clienteCriado?.id) {
        setErroCliente("Cliente criado, mas não foi possível selecioná-lo.");
        setSalvandoCliente(false);
        return;
      }

      setClientesDisponiveis((atuais) => [
        clienteCriado,
        ...atuais.filter((cliente) => cliente.id !== clienteCriado.id),
      ]);
      selecionarCliente(clienteCriado);
      setModalClienteAberto(false);
      setNovoCliente({
        nome: "",
        telefone: "",
        email: "",
        documento: "",
        tipoCliente: "PESSOA FÍSICA",
        observacoes: "",
      });
    } catch {
      setErroCliente("Erro ao cadastrar cliente.");
    } finally {
      setSalvandoCliente(false);
    }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Vendas
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Nova Venda
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Monte o pedido em uma única tela, pesquisando cliente por
              documento ou nome.
            </p>
          </div>

          <Link
            href="/vendas"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Voltar para lista
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Cliente e dados da venda
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Buscar cliente por documento ou nome
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setErroCliente("");
                      setModalClienteAberto(true);
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Novo cliente
                  </button>
                </div>

                <div className="relative">
                  <input
                    value={buscaCliente}
                    onChange={(event) => {
                      setBuscaCliente(event.target.value);
                      setClienteSelecionadoId("");
                    }}
                    placeholder="Digite documento ou nome"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                  />

                  {buscaCliente.trim() !== "" &&
                  !clienteSelecionado &&
                  clientesFiltrados.length > 0 ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                      {clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => selecionarCliente(cliente)}
                          className="flex w-full flex-col items-start gap-1 border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 last:border-b-0"
                        >
                          <span className="font-medium text-slate-900">
                            {cliente.nome}
                          </span>
                          <span className="text-xs text-slate-500">
                            {cliente.documento}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Documento do cliente
                </label>
                <input
                  value={clienteSelecionado?.documento || ""}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nome do cliente
                </label>
                <input
                  value={clienteSelecionado?.nome || ""}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Meio de venda
                </label>
                <select
                  value={meioVenda}
                  onChange={(event) => setMeioVenda(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="">Selecione</option>
                  <option>Venda Direta</option>
                  <option>WhatsApp</option>
                  <option>Instagram</option>
                  <option>Telefone</option>
                  <option>Revenda</option>
                  <option>Outro</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Desconto da venda (%)
                </label>
                <input
                  value={descontoPercentual}
                  onChange={(event) => setDescontoPercentual(event.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Busca de produtos
            </h2>

            <div className="mt-5">
              <input
                value={buscaProduto}
                onChange={(event) => setBuscaProduto(event.target.value)}
                placeholder="Buscar por código ou nome"
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
                    <th className="px-4 py-3 font-semibold">Preço</th>
                    <th className="px-4 py-3 font-semibold">Estoque</th>
                    <th className="px-4 py-3 text-right font-semibold">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {produtosFiltrados.map((produto) => (
                    <tr key={produto.id} className="text-sm text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {produto.codigoInterno}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <MiniaturaProduto
                            imagemUrl={getImagemProduto(produto)}
                            nome={produto.nome}
                          />

                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-slate-900">
                              {produto.nome}
                            </span>
                            <span className="mt-0.5 text-xs text-slate-400">
                              {produto.tipoProduto === "KIT" ? "Kit" : "Produto"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{produto.categoria}</td>
                      <td className="px-4 py-3">{moeda(produto.precoVenda)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            produto.estoqueAtual <= 0
                              ? "bg-rose-100 text-rose-700"
                              : produto.estoqueAtual <= 3
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {produto.estoqueAtual}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => adicionarProduto(produto)}
                            disabled={produto.estoqueAtual <= 0}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Adicionar produto"
                            aria-label={`Adicionar ${produto.nome}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Itens da venda
              </h2>
            </div>

            {itensPedido.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">
                Ainda não há produtos adicionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1040px] w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-sm text-slate-600">
                      <th className="px-6 py-4 font-semibold">Código</th>
                      <th className="px-6 py-4 font-semibold">Descrição</th>
                      <th className="px-6 py-4 font-semibold">Tamanho</th>
                      <th className="px-6 py-4 font-semibold">Qtd</th>
                      <th className="px-6 py-4 font-semibold">Estoque</th>
                      <th className="px-6 py-4 font-semibold">
                        Saldo restante
                      </th>
                      <th className="px-6 py-4 font-semibold">Unit. base</th>
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
                      const estoqueDisponivel = getEstoqueDisponivel(item);
                      const saldoRestante = estoqueDisponivel - item.quantidade;
                      const saldo = statusSaldo(
                        estoqueDisponivel,
                        item.quantidade
                      );
                      const ehAnel = produtoEhAnel(item);
                      const tamanhosDisponiveis = getTamanhosDisponiveis(item);

                      return (
                        <tr key={item.itemKey} className="text-sm text-slate-700">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {item.codigoInterno}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <MiniaturaProduto
                                imagemUrl={getImagemProduto(item)}
                                nome={item.nome}
                              />

                              <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium text-slate-900">
                                  {item.nome}
                                </span>
                                <span className="mt-0.5 text-xs text-slate-400">
                                  {item.categoria}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {ehAnel ? (
                              <select
                                value={item.tamanhoAnel}
                                onChange={(event) =>
                                  alterarTamanhoAnel(
                                    item.itemKey,
                                    event.target.value
                                  )
                                }
                                className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                              >
                                {tamanhosDisponiveis.map((estoque) => (
                                  <option
                                    key={estoque.tamanhoAnel}
                                    value={estoque.tamanhoAnel}
                                  >
                                    {estoque.tamanhoAnel}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400">-</span>
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

                          <td className="px-6 py-4">{estoqueDisponivel}</td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex min-w-10 justify-center rounded-full border px-3 py-1 text-xs font-semibold ${saldo.numberClassName}`}
                              title={saldo.label}
                            >
                              {saldoRestante}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {moeda(item.precoVenda)}
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

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Resumo do pedido
              </h2>

              <div className="mt-5 space-y-4">
                <Info label="Subtotal" value={moeda(subtotal)} />
                <Info label="Desconto" value={moeda(valorDesconto)} />
                <Info label="Total final" value={moeda(totalFinal)} destaque />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Ajustes finais
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Observações
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    rows={4}
                    placeholder="Observações da venda"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                  />
                </div>

                {erro ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {erro}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={confirmarVenda}
                  disabled={salvando}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Confirmar venda"}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    {modalClienteAberto ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cliente
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Novo cliente
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Cadastre sem sair da venda. Os itens adicionados serão mantidos.
              </p>
            </div>

            <button
              type="button"
              onClick={fecharModalCliente}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Fechar cadastro de cliente"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Nome
                </span>
                <input
                  value={novoCliente.nome}
                  onChange={(event) =>
                    atualizarCampoNovoCliente("nome", event.target.value)
                  }
                  placeholder="Nome do cliente"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Telefone/WhatsApp
                </span>
                <input
                  value={novoCliente.telefone}
                  onChange={(event) =>
                    atualizarCampoNovoCliente("telefone", event.target.value)
                  }
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  E-mail
                </span>
                <input
                  value={novoCliente.email}
                  onChange={(event) =>
                    atualizarCampoNovoCliente("email", event.target.value)
                  }
                  placeholder="email@cliente.com"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  CPF/CNPJ
                </span>
                <input
                  value={novoCliente.documento}
                  onChange={(event) =>
                    atualizarCampoNovoCliente("documento", event.target.value)
                  }
                  placeholder="Documento"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Tipo de cliente
                </span>
                <select
                  value={novoCliente.tipoCliente}
                  onChange={(event) =>
                    atualizarCampoNovoCliente("tipoCliente", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option>PESSOA FÍSICA</option>
                  <option>REVENDEDORA</option>
                  <option>LOJA FISICA</option>
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Observações
                </span>
                <textarea
                  value={novoCliente.observacoes}
                  onChange={(event) =>
                    atualizarCampoNovoCliente("observacoes", event.target.value)
                  }
                  rows={3}
                  placeholder="Observações internas"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </label>
            </div>

            {erroCliente ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {erroCliente}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={fecharModalCliente}
                disabled={salvandoCliente}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={criarClienteRapido}
                disabled={salvandoCliente}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvandoCliente ? "Salvando..." : "Salvar e selecionar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
