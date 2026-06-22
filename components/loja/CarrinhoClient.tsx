"use client";

import Link from "next/link";
import {
  Gift,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type ComponentProps } from "react";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import ImageBox from "@/components/ui/ImageBox";
import {
  registrarCheckoutIniciado,
  registrarEventoCarrinho,
} from "@/lib/loja/eventos-client";

const CARRINHO_STORAGE_KEY = "sistema-stella-carrinho";

type MenuPublicoLojaProps = ComponentProps<typeof MenuPublicoLoja>;

type CarrinhoClientProps = {
  menus: MenuPublicoLojaProps["menus"];
  categoriasMenu: MenuPublicoLojaProps["categorias"];
  configuracaoMenuRodape?: MenuPublicoLojaProps["configuracaoMenuRodape"];
};

type CarrinhoItemOpcaoAdicional = {
  id: string;
  nome: string;
  descricao?: string | null;
  valorVenda: number;

  itemPadraoSubstituidoId?: string | null;
  itemPadraoSubstituidoNome?: string | null;

  itemAdicionalConsumidoId?: string | null;
  itemAdicionalConsumidoNome?: string | null;

  custoUnitario?: number | null;
};

type CarrinhoItem = {
  produtoId: string;
  codigoInterno: string;
  nome: string;
  imagemUrl?: string | null;
  categoria: string;

  // Já chega da página do produto com preço adicional de variação aplicado.
  precoVenda: number;
  precoOriginal?: number | null;
  precoPromocional?: number | null;
  descontoPercentual?: number | null;

  // Campo legado usado como chave operacional da variação.
  // Pode representar tamanho, modelo, comprimento, aro etc.
  tamanhoAnel: string | null;

  quantidade: number;
  estoqueDisponivel: number;

  opcaoAdicional?: CarrinhoItemOpcaoAdicional | null;
  embalagemPresenteModeloId?: string | null;
  embalagemPresenteNome?: string | null;
  embalagemPresenteImagemUrl?: string | null;
  embalagemPresentePreco?: number | null;
  embalagemPresenteMensagem?: string | null;
  embalagemPresenteSnapshot?: {
    modeloId: string;
    nome: string;
    descricao?: string | null;
    imagemUrl?: string | null;
    preco: number;
    mensagem?: string | null;
    substituiEmbalagemPadrao?: boolean | null;
  } | null;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function getItemKey(item: {
  produtoId: string;
  tamanhoAnel: string | null;
  opcaoAdicional?: {
    id: string;
  } | null;
  embalagemPresenteModeloId?: string | null;
  embalagemPresenteMensagem?: string | null;
}) {
  return [
    item.produtoId,
    item.tamanhoAnel ?? "UNICO",
    item.opcaoAdicional?.id ?? "SEM_OPCAO_ADICIONAL",
    item.embalagemPresenteModeloId ?? "SEM_EMBALAGEM_PRESENTE",
    item.embalagemPresenteMensagem?.trim() || "SEM_MENSAGEM_PRESENTE",
  ].join("-");
}

function normalizarCarrinhoItem(item: Partial<CarrinhoItem>): CarrinhoItem {
  return {
    produtoId: String(item.produtoId || ""),
    codigoInterno: String(item.codigoInterno || ""),
    nome: String(item.nome || ""),
    imagemUrl: item.imagemUrl ?? null,
    categoria: String(item.categoria || ""),
    precoVenda: Number(item.precoVenda || 0),
    precoOriginal:
      item.precoOriginal === null || typeof item.precoOriginal === "undefined"
        ? null
        : Number(item.precoOriginal || 0),
    precoPromocional:
      item.precoPromocional === null ||
      typeof item.precoPromocional === "undefined"
        ? null
        : Number(item.precoPromocional || 0),
    descontoPercentual:
      typeof item.descontoPercentual === "number"
        ? item.descontoPercentual
        : null,
    tamanhoAnel: item.tamanhoAnel ?? null,
    quantidade: Math.max(1, Number(item.quantidade || 1)),
    estoqueDisponivel: Number(item.estoqueDisponivel || 0),
    opcaoAdicional: item.opcaoAdicional
      ? {
          id: String(item.opcaoAdicional.id || ""),
          nome: String(item.opcaoAdicional.nome || "Opção adicional"),
          descricao: item.opcaoAdicional.descricao ?? null,
          valorVenda: Number(item.opcaoAdicional.valorVenda || 0),
          itemPadraoSubstituidoId:
            item.opcaoAdicional.itemPadraoSubstituidoId ?? null,
          itemPadraoSubstituidoNome:
            item.opcaoAdicional.itemPadraoSubstituidoNome ?? null,
          itemAdicionalConsumidoId:
            item.opcaoAdicional.itemAdicionalConsumidoId ?? null,
          itemAdicionalConsumidoNome:
            item.opcaoAdicional.itemAdicionalConsumidoNome ?? null,
          custoUnitario:
            item.opcaoAdicional.custoUnitario === null ||
            typeof item.opcaoAdicional.custoUnitario === "undefined"
              ? null
              : Number(item.opcaoAdicional.custoUnitario || 0),
        }
      : null,
    embalagemPresenteModeloId:
      item.embalagemPresenteModeloId ??
      item.embalagemPresenteSnapshot?.modeloId ??
      null,
    embalagemPresenteNome:
      item.embalagemPresenteNome ??
      item.embalagemPresenteSnapshot?.nome ??
      null,
    embalagemPresenteImagemUrl:
      item.embalagemPresenteImagemUrl ??
      item.embalagemPresenteSnapshot?.imagemUrl ??
      null,
    embalagemPresentePreco:
      item.embalagemPresentePreco === null ||
      typeof item.embalagemPresentePreco === "undefined"
        ? item.embalagemPresenteSnapshot
          ? Number(item.embalagemPresenteSnapshot.preco || 0)
          : null
        : Number(item.embalagemPresentePreco || 0),
    embalagemPresenteMensagem:
      item.embalagemPresenteMensagem ??
      item.embalagemPresenteSnapshot?.mensagem ??
      null,
    embalagemPresenteSnapshot: item.embalagemPresenteSnapshot
      ? {
          modeloId: String(item.embalagemPresenteSnapshot.modeloId || ""),
          nome: String(item.embalagemPresenteSnapshot.nome || ""),
          descricao: item.embalagemPresenteSnapshot.descricao ?? null,
          imagemUrl: item.embalagemPresenteSnapshot.imagemUrl ?? null,
          preco: Number(item.embalagemPresenteSnapshot.preco || 0),
          mensagem: item.embalagemPresenteSnapshot.mensagem ?? null,
          substituiEmbalagemPadrao:
            item.embalagemPresenteSnapshot.substituiEmbalagemPadrao ?? null,
        }
      : null,
  };
}

function lerCarrinho(): CarrinhoItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CARRINHO_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizarCarrinhoItem(item))
      .filter((item) => item.produtoId && item.nome);
  } catch {
    return [];
  }
}

function salvarCarrinho(itens: CarrinhoItem[]) {
  window.localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(itens));
}

function itemTemDesconto(item: CarrinhoItem) {
  const precoOriginal = Number(item.precoOriginal || 0);
  const precoPromocional = Number(item.precoPromocional || 0);

  return (
    precoOriginal > 0 &&
    precoPromocional > 0 &&
    precoPromocional < precoOriginal
  );
}

function getPrecoUnitario(item: CarrinhoItem) {
  if (itemTemDesconto(item) && item.precoPromocional) {
    return Number(item.precoPromocional);
  }

  return Number(item.precoVenda || 0);
}

function getPrecoOriginal(item: CarrinhoItem) {
  if (itemTemDesconto(item) && item.precoOriginal) {
    return Number(item.precoOriginal);
  }

  return null;
}

function getDescontoPercentual(item: CarrinhoItem) {
  if (
    typeof item.descontoPercentual === "number" &&
    item.descontoPercentual > 0
  ) {
    return item.descontoPercentual;
  }

  const precoOriginal = getPrecoOriginal(item);
  const precoUnitario = getPrecoUnitario(item);

  if (!precoOriginal || precoUnitario >= precoOriginal) {
    return null;
  }

  return Math.round(((precoOriginal - precoUnitario) / precoOriginal) * 100);
}

function getValorAdicionalUnitario(item: CarrinhoItem) {
  return Number(item.opcaoAdicional?.valorVenda || 0);
}

function getTotalProdutoItem(item: CarrinhoItem) {
  return getPrecoUnitario(item) * item.quantidade;
}

function getTotalAdicionalItem(item: CarrinhoItem) {
  return getValorAdicionalUnitario(item) * item.quantidade;
}

function getValorEmbalagemPresenteUnitario(item: CarrinhoItem) {
  return Number(item.embalagemPresentePreco || 0);
}

function getTotalEmbalagemPresenteItem(item: CarrinhoItem) {
  return getValorEmbalagemPresenteUnitario(item) * item.quantidade;
}

function getTotalItem(item: CarrinhoItem) {
  return (
    getTotalProdutoItem(item) +
    getTotalAdicionalItem(item) +
    getTotalEmbalagemPresenteItem(item)
  );
}

function getTextoOpcaoProduto(item: CarrinhoItem) {
  if (!item.tamanhoAnel) {
    return null;
  }

  return item.tamanhoAnel;
}

export default function CarrinhoClient({
  menus: menusPublicos,
  categoriasMenu,
  configuracaoMenuRodape,
}: CarrinhoClientProps) {
  const [itens, setItens] = useState<CarrinhoItem[]>(() => lerCarrinho());

  const subtotalProdutos = useMemo(() => {
    return itens.reduce(
      (total: number, item) => total + getTotalProdutoItem(item),
      0
    );
  }, [itens]);

  const subtotalAdicionais = useMemo(() => {
    return itens.reduce(
      (total: number, item) => total + getTotalAdicionalItem(item),
      0
    );
  }, [itens]);

  const subtotalEmbalagensPresente = useMemo(() => {
    return itens.reduce(
      (total: number, item) => total + getTotalEmbalagemPresenteItem(item),
      0
    );
  }, [itens]);

  const subtotal = useMemo(() => {
    return subtotalProdutos + subtotalAdicionais + subtotalEmbalagensPresente;
  }, [subtotalProdutos, subtotalAdicionais, subtotalEmbalagensPresente]);

  const economia = useMemo(() => {
    return itens.reduce((total: number, item) => {
      const precoOriginal = getPrecoOriginal(item);

      if (!precoOriginal) {
        return total;
      }

      const precoUnitario = getPrecoUnitario(item);

      return total + (precoOriginal - precoUnitario) * item.quantidade;
    }, 0);
  }, [itens]);

  const quantidadeTotal = useMemo(() => {
    return itens.reduce((total: number, item) => total + item.quantidade, 0);
  }, [itens]);

  const possuiItemSemEstoque = useMemo(() => {
    return itens.some((item) => item.estoqueDisponivel <= 0);
  }, [itens]);

  const possuiAdicionais = subtotalAdicionais > 0;
  const possuiEmbalagensPresente = subtotalEmbalagensPresente > 0;

  function atualizarItens(novosItens: CarrinhoItem[]) {
    setItens(novosItens);
    salvarCarrinho(novosItens);
  }

  function alterarQuantidade(itemKey: string, novaQuantidade: number) {
    if (novaQuantidade <= 0) {
      removerItem(itemKey);
      return;
    }

    const novosItens = itens.map((item) => {
      if (getItemKey(item) !== itemKey) {
        return item;
      }

      const quantidadeSegura =
        novaQuantidade > item.estoqueDisponivel
          ? item.estoqueDisponivel
          : novaQuantidade;

      return {
        ...item,
        quantidade: quantidadeSegura > 0 ? quantidadeSegura : 1,
      };
    });

    atualizarItens(novosItens);
  }

  function removerItem(itemKey: string) {
    const itemRemovido = itens.find((item) => getItemKey(item) === itemKey);

    atualizarItens(itens.filter((item) => getItemKey(item) !== itemKey));

    if (itemRemovido) {
      registrarEventoCarrinho({
        tipo: "PRODUTO_REMOVIDO_CARRINHO",
        produtoId: itemRemovido.produtoId,
        origem: "carrinho",
        metadata: {
          nome: itemRemovido.nome,
          codigoInterno: itemRemovido.codigoInterno,
          categoria: itemRemovido.categoria,
          quantidade: itemRemovido.quantidade,
          tamanho: itemRemovido.tamanhoAnel,
          valorItem: getTotalItem(itemRemovido),
        },
      });
    }
  }

  function limparCarrinho() {
    const confirmado = window.confirm("Deseja limpar o carrinho?");

    if (!confirmado) {
      return;
    }

    itens.forEach((item) => {
      registrarEventoCarrinho({
        tipo: "PRODUTO_REMOVIDO_CARRINHO",
        produtoId: item.produtoId,
        origem: "limpar_carrinho",
        metadata: {
          nome: item.nome,
          codigoInterno: item.codigoInterno,
          categoria: item.categoria,
          quantidade: item.quantidade,
          tamanho: item.tamanhoAnel,
          valorItem: getTotalItem(item),
        },
      });
    });

    atualizarItens([]);
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menusPublicos}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
      />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.26em] brand-text">
            Stella Colari
          </p>

          <h1 className="mt-3 text-3xl font-light tracking-tight text-slate-950 md:text-5xl">
            Carrinho
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-slate-500">
            Revise seus produtos, variações, opções adicionais e valores antes
            de avançar para o checkout.
          </p>
        </div>

        {itens.length === 0 ? (
          <section className="border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center brand-bg-soft">
              <ShoppingCart className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-light tracking-tight text-slate-950">
              Seu carrinho está vazio
            </h2>

            <p className="mt-3 text-sm font-light text-slate-500">
              Adicione produtos pela loja para continuar.
            </p>

            <Link
              href="/loja"
              className="mt-6 inline-flex items-center justify-center brand-button px-6 py-3 text-sm font-medium"
            >
              Ver produtos
            </Link>
          </section>
        ) : (
          <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              {itens.map((item) => {
                const itemKey = getItemKey(item);
                const precoUnitario = getPrecoUnitario(item);
                const precoOriginal = getPrecoOriginal(item);
                const desconto = getDescontoPercentual(item);
                const totalProduto = getTotalProdutoItem(item);
                const totalAdicional = getTotalAdicionalItem(item);
                const totalEmbalagemPresente =
                  getTotalEmbalagemPresenteItem(item);
                const totalItem = getTotalItem(item);
                const valorAdicionalUnitario = getValorAdicionalUnitario(item);
                const valorEmbalagemPresenteUnitario =
                  getValorEmbalagemPresenteUnitario(item);
                const semEstoque = item.estoqueDisponivel <= 0;
                const possuiOpcaoAdicional = Boolean(item.opcaoAdicional);
                const possuiEmbalagemPresente = Boolean(
                  item.embalagemPresenteModeloId
                );
                const textoOpcaoProduto = getTextoOpcaoProduto(item);

                return (
                  <article
                    key={itemKey}
                    className={`grid gap-4 border bg-white p-4 md:grid-cols-[128px_1fr] ${
                      semEstoque
                        ? "border-red-200 opacity-70"
                        : desconto !== null || possuiOpcaoAdicional
                        ? "brand-border"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="relative">
                      <ImageBox src={item.imagemUrl} alt={item.nome} />

                      <div className="pointer-events-none absolute inset-0 bg-black/5" />

                      {desconto !== null && (
                        <div className="absolute right-2 top-2 brand-bg px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
                          -{desconto}%
                        </div>
                      )}

                      {semEstoque && (
                        <div className="absolute left-2 top-2 bg-white/95 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-red-700">
                          Sem estoque
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-light uppercase tracking-[0.2em] text-slate-400">
                            {item.codigoInterno}
                          </p>

                          <h2 className="mt-1 text-lg font-medium text-slate-950">
                            {item.nome}
                          </h2>

                          <div className="mt-2 space-y-1 text-sm font-light text-slate-500">
                            <p>{item.categoria}</p>

                            {textoOpcaoProduto && (
                              <p>
                                Opção selecionada:{" "}
                                <span className="font-medium text-slate-800">
                                  {textoOpcaoProduto}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-baseline gap-2">
                            {precoOriginal !== null && (
                              <span className="text-xs font-light text-slate-400 line-through">
                                {moeda(precoOriginal)}
                              </span>
                            )}

                            <span
                              className={`text-sm font-medium ${
                                desconto !== null
                                  ? "brand-text"
                                  : "text-slate-950"
                              }`}
                            >
                              {moeda(precoUnitario)}
                            </span>

                            {desconto !== null && (
                              <span className="brand-badge px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                                Promoção
                              </span>
                            )}
                          </div>

                          {item.opcaoAdicional && (
                            <div className="mt-4 border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-start gap-3">
                                <Gift className="mt-0.5 h-4 w-4 brand-text" />

                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-950">
                                    {item.opcaoAdicional.nome}
                                  </p>

                                  {item.opcaoAdicional.descricao && (
                                    <p className="mt-1 text-xs font-light leading-5 text-slate-500">
                                      {item.opcaoAdicional.descricao}
                                    </p>
                                  )}

                                  <p className="mt-2 text-xs font-medium text-slate-700">
                                    + {moeda(valorAdicionalUnitario)} por item
                                  </p>

                                  {item.opcaoAdicional
                                    .itemAdicionalConsumidoNome && (
                                    <p className="mt-1 text-[11px] font-light text-slate-400">
                                      Inclui:{" "}
                                      {
                                        item.opcaoAdicional
                                          .itemAdicionalConsumidoNome
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {possuiEmbalagemPresente && (
                            <div className="mt-4 border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-4 py-3">
                              <div className="flex items-start gap-3">
                                <div className="h-14 w-14 shrink-0 border border-white/70 [&>div]:h-full [&>div]:w-full [&>div]:rounded-none">
                                  <ImageBox
                                    src={item.embalagemPresenteImagemUrl}
                                    alt={
                                      item.embalagemPresenteNome ||
                                      "Embalagem para presente"
                                    }
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] brand-text">
                                    Embalagem presente
                                  </p>

                                  <p className="text-sm font-medium text-slate-950">
                                    {item.embalagemPresenteNome ||
                                      "Embalagem para presente"}
                                  </p>

                                  <p className="mt-2 text-xs font-medium text-slate-700">
                                    + {moeda(valorEmbalagemPresenteUnitario)} por
                                    item
                                  </p>

                                  {item.embalagemPresenteMensagem && (
                                    <p className="mt-2 text-xs font-light leading-5 text-slate-600">
                                      Mensagem do presente: &quot;
                                      {item.embalagemPresenteMensagem}&quot;
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-left lg:text-right">
                          <p className="text-xs font-light uppercase tracking-[0.18em] text-slate-400">
                            Total
                          </p>

                          <p className="mt-1 text-xl font-light text-slate-950">
                            {moeda(totalItem)}
                          </p>

                          {(possuiOpcaoAdicional ||
                            possuiEmbalagemPresente ||
                            textoOpcaoProduto) && (
                            <div className="mt-2 space-y-1 text-xs font-light text-slate-500">
                              <p>Produto: {moeda(totalProduto)}</p>

                              {possuiOpcaoAdicional && (
                                <p>Adicional: {moeda(totalAdicional)}</p>
                              )}

                              {possuiEmbalagemPresente && (
                                <p>
                                  Presente: {moeda(totalEmbalagemPresente)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              alterarQuantidade(itemKey, item.quantidade - 1)
                            }
                            className="flex h-10 w-10 items-center justify-center border border-slate-300 text-slate-700 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <input
                            type="number"
                            min={1}
                            max={item.estoqueDisponivel}
                            value={item.quantidade}
                            disabled={semEstoque}
                            onChange={(event) =>
                              alterarQuantidade(
                                itemKey,
                                Number(event.target.value || 1)
                              )
                            }
                            className="h-10 w-20 border border-slate-300 bg-white px-3 text-center text-sm font-medium outline-none transition focus:border-[var(--brand-blue)] disabled:bg-slate-100 disabled:text-slate-400"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              alterarQuantidade(itemKey, item.quantidade + 1)
                            }
                            disabled={
                              semEstoque ||
                              item.quantidade >= item.estoqueDisponivel
                            }
                            className="flex h-10 w-10 items-center justify-center border border-slate-300 text-slate-700 transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus className="h-4 w-4" />
                          </button>

                          <span className="text-xs font-light text-slate-500">
                            Estoque: {item.estoqueDisponivel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removerItem(itemKey)}
                          className="inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="h-fit border border-slate-200 bg-white p-6 lg:sticky lg:top-24">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 brand-text" />

                <h2 className="text-lg font-medium text-slate-950">Resumo</h2>
              </div>

              <div className="mt-6 space-y-4 border-b border-slate-200 pb-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-light text-slate-500">Itens</span>
                  <span className="font-medium text-slate-950">
                    {quantidadeTotal}
                  </span>
                </div>

                {economia > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-light text-slate-500">Economia</span>
                    <span className="font-medium brand-text">
                      -{moeda(economia)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="font-light text-slate-500">Produtos</span>
                  <span className="font-medium text-slate-950">
                    {moeda(subtotalProdutos)}
                  </span>
                </div>

                {possuiAdicionais && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-light text-slate-500">
                      Opções adicionais
                    </span>
                    <span className="font-medium text-slate-950">
                      {moeda(subtotalAdicionais)}
                    </span>
                  </div>
                )}

                {possuiEmbalagensPresente && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-light text-slate-500">
                      Embalagens para presente
                    </span>
                    <span className="font-medium text-slate-950">
                      {moeda(subtotalEmbalagensPresente)}
                    </span>
                  </div>
                )}

                {possuiEmbalagensPresente && (
                  <p className="text-xs font-light leading-5 text-slate-500">
                    O subtotal inclui as embalagens selecionadas por item.
                  </p>
                )}

                <div className="flex items-center justify-between text-base">
                  <span className="font-medium text-slate-950">Subtotal</span>
                  <span className="font-medium text-slate-950">
                    {moeda(subtotal)}
                  </span>
                </div>
              </div>

              {possuiItemSemEstoque && (
                <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  Existem itens sem estoque no carrinho. Remova-os para avançar
                  no checkout.
                </div>
              )}

              <div className="mt-5 brand-bg-soft p-4 text-sm font-light leading-6">
                Frete e pagamento serão definidos na próxima etapa do checkout.
              </div>

              <Link
                href="/loja/checkout"
                onClick={() =>
                  registrarCheckoutIniciado({
                    origem: "carrinho",
                    metadata: {
                      itensDistintos: itens.length,
                      quantidadeItens: quantidadeTotal,
                      subtotal,
                    },
                  })
                }
                className={`mt-5 flex w-full items-center justify-center px-4 py-3 text-sm font-medium text-white transition ${
                  possuiItemSemEstoque
                    ? "pointer-events-none bg-slate-300"
                    : "brand-button"
                }`}
              >
                Finalizar compra
              </Link>

              <button
                type="button"
                onClick={limparCarrinho}
                className="mt-3 w-full brand-button-outline px-4 py-3 text-sm font-medium"
              >
                Limpar carrinho
              </button>
            </aside>
          </section>
        )}
      </main>

      <RodapePublicoLoja
        menus={menusPublicos}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
