"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Package,
  Ruler,
  ShoppingCart,
  Truck,
} from "lucide-react";
import ImageBox from "@/components/ui/ImageBox";
import MenuPublicoLoja, {
  type CategoriaMenuPublicoItem,
  type MenuPublicoItem,
} from "@/components/loja/MenuPublicoLoja";

const CARRINHO_STORAGE_KEY = "sistema-stella-carrinho";
const LOGO_URL = "/logo-stella.png";
const CASHBACK_PERCENTUAL = 0.05;

export type ProdutoLojaMenuItem = {
  id: string;
  nome: string;
  href: string;
};

export type ProdutoLojaOpcaoAdicional = {
  id: string;
  nome: string;
  descricao: string | null;
  valorVenda: number;

  itemPadraoSubstituidoId: string | null;
  itemPadraoSubstituidoNome: string | null;

  itemAdicionalConsumidoId: string;
  itemAdicionalConsumidoNome: string;
  custoUnitario: number;
};

export type ProdutoLojaDetalhe = {
  id: string;
  codigoInterno: string;
  nome: string;
  imagemUrl?: string | null;
  imagemHoverUrl?: string | null;
  imagens: string[];
  categoria: string;
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  descricaoLoja: string | null;
  observacoes: string | null;
  estoqueTotal: number;
  tamanhosDisponiveis: {
    tamanhoAnel: string;
    quantidadeAtual: number;
  }[];
  variacoes?: {
    id: string;
    nome: string;
    obrigatoria: boolean;
    opcoes: {
      id: string;
      nome: string;
      imagemUrl?: string | null;
      precoAdicional?: number;
      custoAdicional?: number;
      quantidadeAtual: number;
    }[];
  }[];
  garantia: {
    titulo: string;
    conteudo: string;
  };
  opcoesAdicionais?: ProdutoLojaOpcaoAdicional[];
};

export type LojaProdutoRelacionado = {
  id: string;
  codigoInterno: string;
  nome: string;
  imagemUrl?: string | null;
  imagemHoverUrl?: string | null;
  categoria: string;
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  estoqueTotal: number;
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
  precoVenda: number;
  precoOriginal?: number | null;
  precoPromocional?: number | null;
  descontoPercentual?: number | null;
  tamanhoAnel: string | null;
  quantidade: number;
  estoqueDisponivel: number;
  opcaoAdicional?: CarrinhoItemOpcaoAdicional | null;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function produtoTemDesconto(produto: {
  descontoAtivo: boolean;
  precoPromocional: number | null;
  precoVenda: number;
}) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function precoFinalProduto(produto: {
  descontoAtivo: boolean;
  precoPromocional: number | null;
  precoVenda: number;
}) {
  if (produtoTemDesconto(produto) && produto.precoPromocional !== null) {
    return produto.precoPromocional;
  }

  return produto.precoVenda;
}

function percentualDesconto(produto: {
  descontoAtivo: boolean;
  precoPromocional: number | null;
  precoVenda: number;
}) {
  if (!produtoTemDesconto(produto) || produto.precoPromocional === null) {
    return null;
  }

  return Math.round(
    ((produto.precoVenda - produto.precoPromocional) / produto.precoVenda) * 100
  );
}

function getCarrinhoAtual(): CarrinhoItem[] {
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

    return parsed;
  } catch {
    return [];
  }
}

function salvarCarrinho(itens: CarrinhoItem[]) {
  window.localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(itens));
}
function getVariacaoPrincipalProduto(produto: ProdutoLojaDetalhe) {
  return (
    produto.variacoes?.find(
      (variacao) => Array.isArray(variacao.opcoes) && variacao.opcoes.length > 0
    ) || null
  );
}

function produtoTemVariacao(produto: ProdutoLojaDetalhe) {
  return Boolean(getVariacaoPrincipalProduto(produto));
}
function getItemKey(item: {
  produtoId: string;
  tamanhoAnel: string | null;
  opcaoAdicional?: {
    id: string;
  } | null;
}) {
  return [
    item.produtoId,
    item.tamanhoAnel ?? "UNICO",
    item.opcaoAdicional?.id ?? "SEM_OPCAO_ADICIONAL",
  ].join("-");
}

function LogoLoja() {
  const [logoErro, setLogoErro] = useState(false);

  return (
    <Link href="/loja" className="flex shrink-0 items-center">
      {!logoErro && (
        <img
          src={LOGO_URL}
          alt="Stella"
          onError={() => setLogoErro(true)}
          className="h-10 w-auto object-contain"
        />
      )}

      {logoErro && (
        <div className="flex h-10 items-center brand-bg px-4 text-sm font-semibold tracking-[0.22em]">
          STELLA
        </div>
      )}
    </Link>
  );
}

function ProdutoRelacionadoCard({
  produto,
}: {
  produto: LojaProdutoRelacionado;
}) {
  const semEstoque = produto.estoqueTotal <= 0;
  const desconto = percentualDesconto(produto);
  const temDesconto = produtoTemDesconto(produto);

  return (
    <Link
      href={`/loja/produto/${produto.id}`}
      className={`group block bg-white ${semEstoque ? "opacity-75" : ""}`}
    >
      <div className="relative overflow-hidden bg-slate-50">
        <ImageBox src={produto.imagemUrl} alt={produto.nome} />

        {produto.imagemHoverUrl && (
          <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
            <ImageBox src={produto.imagemHoverUrl} alt={produto.nome} />
          </div>
        )}

        {desconto !== null && (
          <div className="absolute right-3 top-3 brand-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]">
            -{desconto}%
          </div>
        )}

        {semEstoque && (
          <div className="absolute left-3 top-3 bg-white/95 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-700">
            Sem estoque
          </div>
        )}
      </div>

      <div className="pt-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-5 text-slate-900 transition group-hover:text-[var(--brand-blue)]">
          {produto.nome}
        </h3>

        {temDesconto && produto.precoPromocional !== null ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xs font-light tracking-wide text-slate-400 line-through">
              {moeda(produto.precoVenda)}
            </span>

            <span className="text-sm font-medium tracking-wide brand-text">
              {moeda(produto.precoPromocional)}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm font-light tracking-wide text-slate-700">
            {moeda(produto.precoVenda)}
          </p>
        )}
      </div>
    </Link>
  );
}

function ProdutosRelacionadosSection({
  titulo,
  produtos,
}: {
  titulo: string;
  produtos: LojaProdutoRelacionado[];
}) {
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 4;
  const totalPaginas = Math.max(1, Math.ceil(produtos.length / itensPorPagina));

  const produtosPagina = useMemo(() => {
    const inicio = paginaAtual * itensPorPagina;
    return produtos.slice(inicio, inicio + itensPorPagina);
  }, [paginaAtual, produtos]);

  if (produtos.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-light tracking-tight text-slate-950 md:text-4xl">
          {titulo}
        </h2>

        {totalPaginas > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setPaginaAtual((current) => Math.max(current - 1, 0))
              }
              disabled={paginaAtual === 0}
              className="flex h-11 w-11 items-center justify-center border brand-border bg-white brand-text transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)] disabled:pointer-events-none disabled:opacity-30"
              aria-label="Produtos anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setPaginaAtual((current) =>
                  Math.min(current + 1, totalPaginas - 1)
                )
              }
              disabled={paginaAtual >= totalPaginas - 1}
              className="flex h-11 w-11 items-center justify-center border brand-border bg-white brand-text transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)] disabled:pointer-events-none disabled:opacity-30"
              aria-label="Próximos produtos"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {produtosPagina.map((produto) => (
          <ProdutoRelacionadoCard key={produto.id} produto={produto} />
        ))}
      </div>
    </section>
  );
}

function RodapeLoja({ menus }: { menus: ProdutoLojaMenuItem[] }) {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <LogoLoja />

          <p className="mt-4 max-w-md text-sm font-light leading-6 text-slate-500">
            Loja Stella. Produtos selecionados para compra online.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-light text-slate-600">
          <Link href="/loja" className="hover:text-[var(--brand-blue)]">
            Home
          </Link>

          {menus.map((menu) => (
            <Link
              key={menu.id}
              href={menu.href}
              className="hover:text-[var(--brand-blue)]"
            >
              {menu.nome}
            </Link>
          ))}

          <Link
            href="/loja/carrinho"
            className="hover:text-[var(--brand-blue)]"
          >
            Carrinho
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default function ProdutoLojaClient({
  produto,
  menus,
  categoriasMenu = [],
  relacionados,
  descontos,
}: {
  produto: ProdutoLojaDetalhe;
  menus: ProdutoLojaMenuItem[];
  categoriasMenu?: CategoriaMenuPublicoItem[];
  relacionados: LojaProdutoRelacionado[];
  descontos: LojaProdutoRelacionado[];
}) {
  const router = useRouter();
  const opcoesAdicionais = produto.opcoesAdicionais || [];

  const galeriaExibicao = useMemo(() => {
    const imagens = (produto.imagens || []).filter(Boolean);

    if (imagens.length > 0) {
      return imagens;
    }

    if (produto.imagemUrl) {
      return [produto.imagemUrl];
    }

    return [];
  }, [produto.imagemUrl, produto.imagens]);

  const possuiMaisDeUmaImagem = galeriaExibicao.length > 1;

  const [indiceImagemSelecionada, setIndiceImagemSelecionada] = useState(0);
  const [imagemVariacaoSelecionada, setImagemVariacaoSelecionada] =
  useState<string>("");
const variacaoPrincipal = getVariacaoPrincipalProduto(produto);

const [tamanhoSelecionado, setTamanhoSelecionado] = useState(
  variacaoPrincipal?.opcoes.find((opcao) => opcao.quantidadeAtual > 0)?.nome ??
    produto.tamanhosDisponiveis.find((tamanho) => tamanho.quantidadeAtual > 0)
      ?.tamanhoAnel ??
    ""
);
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"descricao" | "garantia">(
    "descricao"
  );
  const [cep, setCep] = useState("");
  const [freteMensagem, setFreteMensagem] = useState("");
  const [opcaoAdicionalSelecionadaId, setOpcaoAdicionalSelecionadaId] =
    useState<string>("");

const temVariacao = produtoTemVariacao(produto);
const produtoTemTamanho = temVariacao || produto.tamanhosDisponiveis.length > 0;
const semEstoque = produto.estoqueTotal <= 0;
  const temDesconto = produtoTemDesconto(produto);
  const desconto = percentualDesconto(produto);
  const precoFinal = precoFinalProduto(produto);

const imagemSelecionada =
  imagemVariacaoSelecionada ||
  galeriaExibicao[indiceImagemSelecionada] ||
  galeriaExibicao[0] ||
  "";

  const opcaoAdicionalSelecionada = useMemo(() => {
    if (!opcaoAdicionalSelecionadaId) {
      return null;
    }

    return (
      opcoesAdicionais.find(
        (opcao) => opcao.id === opcaoAdicionalSelecionadaId
      ) || null
    );
  }, [opcaoAdicionalSelecionadaId, opcoesAdicionais]);

  const valorAdicionalSelecionado = Number(
    opcaoAdicionalSelecionada?.valorVenda || 0
  );

  const totalAdicionalSelecionado = valorAdicionalSelecionado * quantidade;
  const totalProdutoSelecionado = precoFinal * quantidade;
  const totalComAdicional = totalProdutoSelecionado + totalAdicionalSelecionado;
  const cashbackValor = totalComAdicional * CASHBACK_PERCENTUAL;

const estoqueDisponivel = useMemo(() => {
  if (temVariacao) {
    return (
      variacaoPrincipal?.opcoes.find(
        (opcao) => opcao.nome === tamanhoSelecionado
      )?.quantidadeAtual ?? 0
    );
  }

  if (!produtoTemTamanho) {
    return produto.estoqueTotal;
  }

  return (
    produto.tamanhosDisponiveis.find(
      (tamanho) => tamanho.tamanhoAnel === tamanhoSelecionado
    )?.quantidadeAtual ?? 0
  );
}, [
  produto.estoqueTotal,
  produto.tamanhosDisponiveis,
  produtoTemTamanho,
  tamanhoSelecionado,
  temVariacao,
  variacaoPrincipal,
]);

  const menusPublicos: MenuPublicoItem[] = useMemo(
    () =>
      menus.map((menu) => ({
        id: menu.id,
        nome: menu.nome,
        href: menu.href,
      })),
    [menus]
  );

  const produtosBuscaMenu = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        codigoInterno: string;
        nome: string;
        categoria: string;
        tamanhosDisponiveis?: {
          tamanhoAnel: string;
          quantidadeAtual: number;
        }[];
      }
    >();

    mapa.set(produto.id, {
      id: produto.id,
      codigoInterno: produto.codigoInterno,
      nome: produto.nome,
      categoria: produto.categoria,
      tamanhosDisponiveis: produto.tamanhosDisponiveis,
    });

    relacionados.forEach((item) => {
      mapa.set(item.id, {
        id: item.id,
        codigoInterno: item.codigoInterno,
        nome: item.nome,
        categoria: item.categoria,
      });
    });

    descontos.forEach((item) => {
      mapa.set(item.id, {
        id: item.id,
        codigoInterno: item.codigoInterno,
        nome: item.nome,
        categoria: item.categoria,
      });
    });

    return Array.from(mapa.values());
  }, [produto, relacionados, descontos]);

  function irParaImagem(index: number) {
    if (index < 0 || index >= galeriaExibicao.length) {
      return;
    }

    setIndiceImagemSelecionada(index);
  }

  function irParaImagemAnterior() {
    if (galeriaExibicao.length <= 1) {
      return;
    }

    setIndiceImagemSelecionada((atual) =>
      atual === 0 ? galeriaExibicao.length - 1 : atual - 1
    );
  }

  function irParaProximaImagem() {
    if (galeriaExibicao.length <= 1) {
      return;
    }

    setIndiceImagemSelecionada((atual) =>
      atual === galeriaExibicao.length - 1 ? 0 : atual + 1
    );
  }

  function alterarQuantidade(value: number) {
    setErro("");
    setMensagem("");

    if (Number.isNaN(value) || value <= 0) {
      setQuantidade(1);
      return;
    }

    if (estoqueDisponivel > 0 && value > estoqueDisponivel) {
      setQuantidade(estoqueDisponivel);
      setErro(
        `Quantidade limitada ao estoque disponível (${estoqueDisponivel}).`
      );
      return;
    }

    setQuantidade(value);
  }

  function calcularFrete() {
    const cepLimpo = cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      setFreteMensagem("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setFreteMensagem(
      "Frete e prazo serão confirmados no checkout. Integração automática será adicionada em uma próxima etapa."
    );
  }

  function adicionarAoCarrinho(comprarAgora = false) {
    setErro("");
    setMensagem("");

    if (semEstoque || estoqueDisponivel <= 0) {
      setErro("Produto indisponível no momento.");
      return;
    }

if (produtoTemTamanho && !tamanhoSelecionado) {
  setErro(
    temVariacao
      ? `Selecione ${variacaoPrincipal?.nome.toLowerCase() || "a variação"}.`
      : "Selecione uma opção."
  );
  return;
}

    if (quantidade <= 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }

    if (quantidade > estoqueDisponivel) {
      setErro(
        `Quantidade maior que o estoque disponível (${estoqueDisponivel}).`
      );
      return;
    }

    const tamanhoAnel = produtoTemTamanho ? tamanhoSelecionado : null;

    const novoItem: CarrinhoItem = {
      produtoId: produto.id,
      codigoInterno: produto.codigoInterno,
      nome: produto.nome,
      imagemUrl: imagemSelecionada || produto.imagemUrl || null,
      categoria: produto.categoria,
      precoVenda: precoFinal,
      precoOriginal: temDesconto ? produto.precoVenda : null,
      precoPromocional:
        temDesconto && produto.precoPromocional !== null
          ? produto.precoPromocional
          : null,
      descontoPercentual: desconto,
      tamanhoAnel,
      quantidade,
      estoqueDisponivel,
      opcaoAdicional: opcaoAdicionalSelecionada
        ? {
            id: opcaoAdicionalSelecionada.id,
            nome: opcaoAdicionalSelecionada.nome,
            descricao: opcaoAdicionalSelecionada.descricao,
            valorVenda: Number(opcaoAdicionalSelecionada.valorVenda || 0),
            itemPadraoSubstituidoId:
              opcaoAdicionalSelecionada.itemPadraoSubstituidoId,
            itemPadraoSubstituidoNome:
              opcaoAdicionalSelecionada.itemPadraoSubstituidoNome,
            itemAdicionalConsumidoId:
              opcaoAdicionalSelecionada.itemAdicionalConsumidoId,
            itemAdicionalConsumidoNome:
              opcaoAdicionalSelecionada.itemAdicionalConsumidoNome,
            custoUnitario: Number(opcaoAdicionalSelecionada.custoUnitario || 0),
          }
        : null,
    };

    const carrinhoAtual = getCarrinhoAtual();
    const itemKey = getItemKey(novoItem);
    const itemExistente = carrinhoAtual.find(
      (item) => getItemKey(item) === itemKey
    );

    let novoCarrinho: CarrinhoItem[];

    if (itemExistente) {
      const novaQuantidade = itemExistente.quantidade + quantidade;

      if (novaQuantidade > estoqueDisponivel) {
        setErro(
          `Você já tem ${itemExistente.quantidade} un. no carrinho. O estoque disponível é ${estoqueDisponivel}.`
        );
        return;
      }

      novoCarrinho = carrinhoAtual.map((item) =>
        getItemKey(item) === itemKey
          ? {
              ...item,
              quantidade: novaQuantidade,
              precoVenda: precoFinal,
              precoOriginal: novoItem.precoOriginal,
              precoPromocional: novoItem.precoPromocional,
              descontoPercentual: novoItem.descontoPercentual,
              estoqueDisponivel,
              opcaoAdicional: novoItem.opcaoAdicional,
            }
          : item
      );
    } else {
      novoCarrinho = [...carrinhoAtual, novoItem];
    }

    salvarCarrinho(novoCarrinho);

    if (comprarAgora) {
      router.push("/loja/checkout");
      return;
    }

    setMensagem(
      opcaoAdicionalSelecionada
        ? "Produto com opção adicional adicionado ao carrinho."
        : "Produto adicionado ao carrinho."
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menusPublicos}
        categorias={categoriasMenu}
        produtos={produtosBuscaMenu}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
      />

      <main>
        <section className="mx-auto grid max-w-[1380px] items-start gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:px-8 lg:py-8">
          <div
            className={`grid gap-6 self-start ${
              possuiMaisDeUmaImagem
                ? "lg:grid-cols-[84px_minmax(0,1fr)]"
                : "lg:grid-cols-1"
            }`}
          >
            {possuiMaisDeUmaImagem && (
              <div className="hidden self-start lg:block">
                <div className="max-h-[560px] w-[84px] space-y-3 overflow-y-auto pr-1">
                  {galeriaExibicao.map((imagem, index) => (
                    <button
                      key={`${imagem}-${index}`}
                      type="button"
                      onClick={() => irParaImagem(index)}
                      className={`h-[84px] w-[84px] overflow-hidden bg-[#f7f7f7] transition ${
                        indiceImagemSelecionada === index
                          ? "ring-1 ring-slate-900"
                          : "ring-1 ring-slate-200 hover:ring-slate-400"
                      }`}
                    >
                      <img
                        src={imagem}
                        alt={`${produto.nome} ${index + 1}`}
                        className="h-full w-full object-cover object-center"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-hidden bg-[#f7f7f7]">
              {galeriaExibicao.length > 0 ? (
                <>
                  <div className="relative aspect-square overflow-hidden">
                    {possuiMaisDeUmaImagem ? (
                      <>
                        <div
                          className="flex h-full transition-transform duration-500 ease-out"
                          style={{
                            transform: `translateX(-${
                              indiceImagemSelecionada * 100
                            }%)`,
                          }}
                        >
                          {galeriaExibicao.map((imagem, index) => (
                            <div
                              key={`${imagem}-${index}`}
                              className="relative h-full min-w-full overflow-hidden"
                            >
                              <div
                                className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat"
                                style={{
                                  backgroundImage: `url(${imagem})`,
                                }}
                                aria-label={`${produto.nome} ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={irParaImagemAnterior}
                          className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-sm transition hover:bg-white"
                          aria-label="Imagem anterior"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={irParaProximaImagem}
                          className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-sm transition hover:bg-white"
                          aria-label="Próxima imagem"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
                          {galeriaExibicao.map((_, index) => (
                            <button
                              key={`dot-${index}`}
                              type="button"
                              onClick={() => irParaImagem(index)}
                              className={`h-1.5 transition-all ${
                                indiceImagemSelecionada === index
                                  ? "w-9 bg-[var(--brand-blue)]"
                                  : "w-6 bg-[var(--brand-blue-soft)]"
                              }`}
                              aria-label={`Ir para imagem ${index + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div
                        className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat"
                        style={{
                          backgroundImage: `url(${imagemSelecionada})`,
                        }}
                        aria-label={produto.nome}
                      />
                    )}
                  </div>

                  {possuiMaisDeUmaImagem && (
                    <div className="grid grid-cols-4 gap-3 p-4 lg:hidden">
                      {galeriaExibicao.slice(0, 4).map((imagem, index) => (
                        <button
                          key={`${imagem}-${index}`}
                          type="button"
                          onClick={() => irParaImagem(index)}
                          className={`aspect-square overflow-hidden bg-white transition ${
                            indiceImagemSelecionada === index
                              ? "ring-1 ring-slate-900"
                              : "ring-1 ring-slate-200"
                          }`}
                        >
                          <div
                            className="h-full w-full bg-cover bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url(${imagem})`,
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-sm font-light text-slate-400">
                  Produto sem imagem
                </div>
              )}
            </div>
          </div>

          <aside className="h-fit bg-white p-6 lg:sticky lg:top-24">
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-950">
                {produto.nome}
              </p>

              <p className="mt-1 text-sm font-light text-slate-700">
                {produto.categoria}
              </p>

              <p className="mt-1 text-[11px] font-light uppercase tracking-[0.18em] text-slate-400">
                {produto.codigoInterno}
              </p>
            </div>

            <div className="mt-4">
              {temDesconto && produto.precoPromocional !== null ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-light text-slate-400 line-through">
                      {moeda(produto.precoVenda)}
                    </span>

                    {desconto !== null && (
                      <span className="brand-bg px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]">
                        -{desconto}%
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xl font-light tracking-tight brand-text">
                    {moeda(produto.precoPromocional)}
                  </p>
                </>
              ) : (
                <p className="text-xl font-light tracking-tight text-slate-950">
                  {moeda(produto.precoVenda)}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <p className="font-light text-slate-500">
                  ou 4 parcelas de{" "}
                  <strong className="font-semibold text-slate-900">
                    {moeda(precoFinal / 4)}
                  </strong>{" "}
                  + juros
                </p>

                <button
                  type="button"
                  className="text-xs font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950"
                >
                  Ver parcelas
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-3 py-2 text-sm">
              <span className="font-medium text-[var(--brand-blue)]">
                Cashback acumulativo
              </span>

              <span className="shrink-0 font-semibold text-[var(--brand-blue)]">
                Ganhe {moeda(cashbackValor)}
              </span>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              {produtoTemTamanho ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      Tamanho
                    </p>

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 underline underline-offset-4 hover:text-slate-950"
                    >
                      <Ruler className="h-4 w-4" />
                      Guia de medida
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
{temVariacao && variacaoPrincipal ? (
  <>
    <p className="mb-3 text-sm font-light text-slate-600">
      Escolha {variacaoPrincipal.nome.toLowerCase()}:
    </p>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {variacaoPrincipal.opcoes.map((opcao) => {
        const selecionado = tamanhoSelecionado === opcao.nome;
        const semSaldo = opcao.quantidadeAtual <= 0;

        return (
          <button
            key={opcao.id}
            type="button"
            disabled={semSaldo}
            onClick={() => {
              setTamanhoSelecionado(opcao.nome);
              setErro("");

              if (opcao.imagemUrl) {
                setImagemVariacaoSelecionada(opcao.imagemUrl);
              } else {
                setImagemVariacaoSelecionada("");
              }
            }}
            className={`border px-3 py-3 text-sm font-medium transition ${
              selecionado
                ? "brand-border brand-bg-soft brand-text"
                : "border-slate-300 text-slate-700 hover:border-[var(--brand-blue)]"
            } ${semSaldo ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {opcao.nome}
          </button>
        );
      })}
    </div>
  </>
) : (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {produto.tamanhosDisponiveis.map((tamanho) => {
      const selecionado = tamanhoSelecionado === tamanho.tamanhoAnel;
      const semSaldo = tamanho.quantidadeAtual <= 0;

      return (
        <button
          key={tamanho.tamanhoAnel}
          type="button"
          disabled={semSaldo}
          onClick={() => {
            setTamanhoSelecionado(tamanho.tamanhoAnel);
            setErro("");
          }}
          className={`border px-3 py-3 text-sm font-medium transition ${
            selecionado
              ? "brand-border brand-bg-soft brand-text"
              : "border-slate-300 text-slate-700 hover:border-[var(--brand-blue)]"
          } ${semSaldo ? "cursor-not-allowed opacity-40" : ""}`}
        >
          {tamanho.tamanhoAnel}
        </button>
      );
    })}
  </div>
)}
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-light text-slate-600">
                  Produto sem variação de tamanho.
                </div>
              )}
            </div>

            {opcoesAdicionais.length > 0 && !semEstoque && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  {opcoesAdicionais.map((opcao) => {
                    const selecionada = opcaoAdicionalSelecionadaId === opcao.id;

                    return (
                      <label
                        key={opcao.id}
                        className={`flex cursor-pointer items-center gap-3 border px-3 py-2.5 transition ${
                          selecionada
                            ? "border-slate-950 bg-white"
                            : "border-slate-200 bg-slate-50 hover:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selecionada}
                          onChange={() =>
                            setOpcaoAdicionalSelecionadaId((atual) =>
                              atual === opcao.id ? "" : opcao.id
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />

                        <Gift className="h-4 w-4 shrink-0 brand-text" />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-medium text-slate-950">
                              {opcao.nome}
                            </span>

                            <span className="shrink-0 text-sm font-medium brand-text">
                              + {moeda(opcao.valorVenda)}
                            </span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-[82px_1fr]">
              <label>
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Qtd.
                </span>

                <input
                  type="number"
                  min={1}
                  max={estoqueDisponivel || 1}
                  value={quantidade}
                  disabled={semEstoque}
                  onChange={(event) =>
                    alterarQuantidade(Number(event.target.value))
                  }
                  className="h-12 w-full border border-slate-200 px-3 text-center text-sm outline-none transition [appearance:textfield] focus:border-slate-950 disabled:bg-slate-100 disabled:text-slate-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => adicionarAoCarrinho(true)}
                  disabled={semEstoque || estoqueDisponivel <= 0}
                  className="inline-flex h-12 w-full items-center justify-center bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Comprar agora
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => adicionarAoCarrinho(false)}
              disabled={semEstoque || estoqueDisponivel <= 0}
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 transition hover:border-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            >
              <ShoppingCart className="h-4 w-4" />
              Adicionar ao carrinho
            </button>

            {opcaoAdicionalSelecionada && (
              <div className="mt-4 border border-slate-200 bg-white px-4 py-3 text-sm leading-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-light text-slate-500">Produto</span>
                  <span className="font-medium text-slate-950">
                    {moeda(totalProdutoSelecionado)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="font-light text-slate-500">
                    {opcaoAdicionalSelecionada.nome}
                  </span>
                  <span className="font-medium text-slate-950">
                    {moeda(totalAdicionalSelecionado)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="font-light text-slate-500">Cashback</span>
                  <span className="font-medium text-[var(--brand-blue)]">
                    {moeda(cashbackValor)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
                  <span className="font-medium text-slate-950">
                    Total parcial
                  </span>
                  <span className="font-medium brand-text">
                    {moeda(totalComAdicional)}
                  </span>
                </div>
              </div>
            )}

            {erro && (
              <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </div>
            )}

            {mensagem && (
              <div className="mt-4 flex items-center gap-2 brand-badge px-4 py-3 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                {mensagem}
              </div>
            )}

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Truck className="h-4 w-4 brand-text" />
                Calcule o frete
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_105px]">
                <input
                  value={cep}
                  onChange={(event) => setCep(event.target.value)}
                  placeholder="Digite seu CEP"
                  className="h-10 border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-950"
                />

                <button
                  type="button"
                  onClick={calcularFrete}
                  className="h-10 border border-slate-950 bg-white px-4 text-xs font-semibold text-slate-950 transition hover:bg-slate-950 hover:text-white"
                >
                  Calcular
                </button>
              </div>

              <button
                type="button"
                className="mt-2 text-xs font-medium text-slate-500 underline underline-offset-4 hover:text-slate-950"
              >
                Não sei meu CEP
              </button>

              {freteMensagem && (
                <p className="mt-3 text-sm font-light leading-6 text-slate-600">
                  {freteMensagem}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <Truck className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-light">
                  Entrega para todo o Brasil. Trocas em até 30 dias.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Package className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-light">
                  Frete grátis em compras acima de R$ 349,90
                </span>
              </div>
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="border-b border-slate-200">
            <div className="flex gap-8">
              <button
                type="button"
                onClick={() => setAbaAtiva("descricao")}
                className={`border-b-2 py-4 text-sm font-medium transition ${
                  abaAtiva === "descricao"
                    ? "border-[var(--brand-blue)] brand-text"
                    : "border-transparent text-slate-400 hover:text-[var(--brand-blue)]"
                }`}
              >
                Descrição
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva("garantia")}
                className={`border-b-2 py-4 text-sm font-medium transition ${
                  abaAtiva === "garantia"
                    ? "border-[var(--brand-blue)] brand-text"
                    : "border-transparent text-slate-400 hover:text-[var(--brand-blue)]"
                }`}
              >
                {produto.garantia.titulo}
              </button>
            </div>
          </div>

          <div className="max-w-3xl py-8">
            {abaAtiva === "descricao" ? (
              <p className="whitespace-pre-line text-sm font-light leading-7 text-slate-600 md:text-base">
                {produto.descricaoLoja ||
                  produto.observacoes ||
                  "Descrição do produto em breve."}
              </p>
            ) : (
              <p className="whitespace-pre-line text-sm font-light leading-7 text-slate-600 md:text-base">
                {produto.garantia.conteudo}
              </p>
            )}
          </div>
        </section>

        <ProdutosRelacionadosSection
          titulo="Clientes também compram"
          produtos={relacionados}
        />

        <ProdutosRelacionadosSection
          titulo="Produtos em desconto"
          produtos={descontos}
        />
      </main>

      <RodapeLoja menus={menus} />
    </div>
  );
}