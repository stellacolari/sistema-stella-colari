"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Gift,
  Package,
  Ruler,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import MenuPublicoLoja, {
  type CategoriaMenuPublicoItem,
  type MenuPublicoItem,
} from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import ProdutoCardLoja from "@/components/loja/ProdutoCardLoja";
import ImageBox from "@/components/ui/ImageBox";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";
import {
  registrarCheckoutIniciado,
  registrarEventoCarrinho,
  registrarProdutoVisualizado,
} from "@/lib/loja/eventos-client";

const CARRINHO_STORAGE_KEY = "sistema-stella-carrinho";
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

export type ProdutoLojaVariacao = {
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
};

export type ProdutoLojaFamiliaProduto = {
  id: string;
  codigoInterno: string;
  nome: string;
  nomeOpcao: string;
  imagemUrl?: string | null;
  material?: string | null;
  corJoia?: string | null;
  href: string;
  selecionado: boolean;
  estoqueTotal: number;
};

export type ProdutoLojaEmbalagemPresente = {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  preco: number;
  permiteMensagem: boolean;
  mensagemLimiteCaracteres: number | null;
  mensagemPlaceholder: string | null;
  substituiEmbalagemPadrao: boolean;
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
  variacoes?: ProdutoLojaVariacao[];
  familia?: {
    id: string;
    nome: string;
    slug: string;
  } | null;
  familiaMaterial?: string | null;
  familiaCorJoia?: string | null;
  familiaProdutos?: ProdutoLojaFamiliaProduto[];
  garantia: {
    titulo: string;
    conteudo: string;
  };
  opcoesAdicionais?: ProdutoLojaOpcaoAdicional[];
  embalagensPresente?: ProdutoLojaEmbalagemPresente[];
  embalagemPresentePadraoId?: string | null;
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
    ((produto.precoVenda - produto.precoPromocional) / produto.precoVenda) *
      100,
  );
}

function getVariacaoPrincipalProduto(produto: ProdutoLojaDetalhe) {
  return (
    produto.variacoes?.find(
      (variacao) =>
        Array.isArray(variacao.opcoes) && variacao.opcoes.length > 0,
    ) || null
  );
}

function produtoTemVariacao(produto: ProdutoLojaDetalhe) {
  return Boolean(getVariacaoPrincipalProduto(produto));
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

function ProdutoRelacionadoCard({
  produto,
}: {
  produto: LojaProdutoRelacionado;
}) {
  return <ProdutoCardLoja produto={produto} />;
}

function ProdutosRelacionadosSection({
  titulo,
  produtos,
}: {
  titulo: string;
  produtos: LojaProdutoRelacionado[];
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const dragRef = useRef({
    ativo: false,
    inicioX: 0,
    scrollInicial: 0,
  });

  if (produtos.length === 0) {
    return null;
  }

  function rolar(direcao: "esquerda" | "direita") {
    const container = scrollRef.current;

    if (!container) return;

    container.scrollBy({
      left: direcao === "esquerda" ? -360 : 360,
      behavior: "smooth",
    });
  }

  function iniciarArraste(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;

    if (!container) return;

    dragRef.current = {
      ativo: true,
      inicioX: event.clientX,
      scrollInicial: container.scrollLeft,
    };

    setArrastando(true);
    container.setPointerCapture(event.pointerId);
  }

  function moverArraste(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;

    if (!container || !dragRef.current.ativo) return;

    const deslocamento = event.clientX - dragRef.current.inicioX;
    container.scrollLeft = dragRef.current.scrollInicial - deslocamento;
  }

  function finalizarArraste(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;

    if (container) {
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {}
    }

    dragRef.current.ativo = false;

    window.setTimeout(() => {
      setArrastando(false);
    }, 80);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-light tracking-tight text-slate-950 md:text-4xl">
          {titulo}
        </h2>

        {produtos.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => rolar("esquerda")}
              className="flex h-11 w-11 items-center justify-center border brand-border bg-white brand-text transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)]"
              aria-label="Produtos anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => rolar("direita")}
              className="flex h-11 w-11 items-center justify-center border brand-border bg-white brand-text transition hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)]"
              aria-label="Próximos produtos"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onPointerDown={iniciarArraste}
        onPointerMove={moverArraste}
        onPointerUp={finalizarArraste}
        onPointerCancel={finalizarArraste}
        className={`-mx-5 flex gap-2 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] sm:-mx-6 sm:gap-3 sm:px-6 lg:-mx-8 lg:px-8 ${
          arrastando ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
      >
        {produtos.map((produto) => (
          <div
            key={produto.id}
            className="w-[220px] shrink-0 sm:w-[250px] lg:w-[270px]"
            onClick={(event) => {
              if (arrastando) {
                event.preventDefault();
              }
            }}
          >
            <ProdutoRelacionadoCard produto={produto} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ProdutoFamiliaSection({
  produtos,
}: {
  produtos: ProdutoLojaFamiliaProduto[];
}) {
  const opcoes = produtos.filter(() => produtos.length > 1);

  if (opcoes.length <= 1) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-950">
          Outras versões desta joia
        </p>

        <p className="mt-1 text-xs font-light leading-5 text-slate-500">
          Confira outras versões disponíveis desta peça.
        </p>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {opcoes.map((item) => {
          const semEstoque = item.estoqueTotal <= 0;

          const conteudo = (
            <div
              className={`group flex w-24 shrink-0 flex-col items-center text-center ${
                item.selecionado ? "pointer-events-none" : ""
              }`}
            >
              <div
                className={`relative flex h-20 w-20 items-center justify-center overflow-hidden bg-white transition-colors duration-200 ${
                  item.selecionado
                    ? "border border-[var(--brand-blue)]"
                    : "border border-transparent group-hover:border-slate-200"
                } ${semEstoque ? "opacity-50" : ""}`}
              >
                {item.imagemUrl ? (
                  <img
                    src={item.imagemUrl}
                    alt={item.nomeOpcao}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 px-2 text-center text-[10px] font-medium text-slate-400">
                    Sem imagem
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-black/5" />

                {!item.selecionado && semEstoque && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/75 px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Sem estoque
                  </div>
                )}
              </div>

              <span
                className={`mt-2 block max-w-full truncate text-center text-xs leading-4 ${
                  item.selecionado
                    ? "font-semibold text-[var(--brand-blue)]"
                    : "font-medium text-slate-600 group-hover:text-slate-950"
                }`}
                title={item.nomeOpcao}
              >
                {item.nomeOpcao}
              </span>
            </div>
          );

          if (item.selecionado) {
            return (
              <div key={item.id} aria-current="true">
                {conteudo}
              </div>
            );
          }

          return (
            <Link key={item.id} href={item.href}>
              {conteudo}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RodapeLoja({
  menus,
  configuracaoMenuRodape,
}: {
  menus: ProdutoLojaMenuItem[];
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
}) {
  return (
    <RodapePublicoLoja
      menus={menus}
      configuracaoMenuRodape={configuracaoMenuRodape}
    />
  );
}

export default function ProdutoLojaClient({
  produto,
  menus,
  categoriasMenu = [],
  configuracaoMenuRodape,
  relacionados,
  descontos,
}: {
  produto: ProdutoLojaDetalhe;
  menus: ProdutoLojaMenuItem[];
  categoriasMenu?: CategoriaMenuPublicoItem[];
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
  relacionados: LojaProdutoRelacionado[];
  descontos: LojaProdutoRelacionado[];
}) {
  const router = useRouter();
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    registrarProdutoVisualizado(produto.id, {
      nome: produto.nome,
      codigoInterno: produto.codigoInterno,
      categoria: produto.categoria,
    });
  }, [produto.categoria, produto.codigoInterno, produto.id, produto.nome]);

  const opcoesAdicionais = useMemo(
    () => produto.opcoesAdicionais || [],
    [produto.opcoesAdicionais],
  );
  const embalagensPresente = useMemo(
    () => produto.embalagensPresente || [],
    [produto.embalagensPresente],
  );
  const variacaoPrincipal = getVariacaoPrincipalProduto(produto);
  const temVariacao = produtoTemVariacao(produto);
  const familiaProdutos = produto.familiaProdutos || [];

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
  const mostrarSetasMiniaturas = galeriaExibicao.length > 6;

  const [indiceImagemSelecionada, setIndiceImagemSelecionada] = useState(0);
  const [imagemVariacaoSelecionada, setImagemVariacaoSelecionada] =
    useState("");
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(
    temVariacao && variacaoPrincipal?.obrigatoria !== false
      ? ""
      : (variacaoPrincipal?.opcoes.find((opcao) => opcao.quantidadeAtual > 0)
          ?.nome ??
          produto.tamanhosDisponiveis.find(
            (tamanho) => tamanho.quantidadeAtual > 0,
          )?.tamanhoAnel ??
          ""),
  );
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"descricao" | "garantia">(
    "descricao",
  );
  const [cep, setCep] = useState("");
  const [freteMensagem, setFreteMensagem] = useState("");
  const [opcaoAdicionalSelecionadaId, setOpcaoAdicionalSelecionadaId] =
    useState<string>("");
  const [embalagemPresenteSelecionadaId, setEmbalagemPresenteSelecionadaId] =
    useState<string>("");
  const [mensagemPresente, setMensagemPresente] = useState("");
  const [embalagemPresenteModalId, setEmbalagemPresenteModalId] =
    useState<string>("");

  const produtoTemTamanho =
    temVariacao || produto.tamanhosDisponiveis.length > 0;
  const semEstoque = produto.estoqueTotal <= 0;
  const temDesconto = produtoTemDesconto(produto);
  const desconto = percentualDesconto(produto);
  const precoFinal = precoFinalProduto(produto);

  const imagemSelecionada =
    imagemVariacaoSelecionada ||
    galeriaExibicao[indiceImagemSelecionada] ||
    galeriaExibicao[0] ||
    "";

  const opcaoVariacaoSelecionada = useMemo(() => {
    if (!temVariacao || !variacaoPrincipal || !tamanhoSelecionado) {
      return null;
    }

    return (
      variacaoPrincipal.opcoes.find(
        (opcao) => opcao.nome === tamanhoSelecionado,
      ) || null
    );
  }, [temVariacao, variacaoPrincipal, tamanhoSelecionado]);

  const opcoesVariacaoDisponiveis = useMemo(() => {
    if (!temVariacao || !variacaoPrincipal) {
      return [];
    }

    return variacaoPrincipal.opcoes.filter(
      (opcao) => opcao.quantidadeAtual > 0,
    );
  }, [temVariacao, variacaoPrincipal]);

  const menorPrecoAdicionalVariacao = useMemo(() => {
    if (opcoesVariacaoDisponiveis.length === 0) {
      return 0;
    }

    return Math.min(
      ...opcoesVariacaoDisponiveis.map((opcao) =>
        Number(opcao.precoAdicional || 0),
      ),
    );
  }, [opcoesVariacaoDisponiveis]);

  const variacaoObrigatoriaSemSelecao =
    temVariacao &&
    variacaoPrincipal?.obrigatoria !== false &&
    !opcaoVariacaoSelecionada;

  const precoAdicionalVariacao = variacaoObrigatoriaSemSelecao
    ? menorPrecoAdicionalVariacao
    : Number(opcaoVariacaoSelecionada?.precoAdicional || 0);

  const deveMostrarAPartirDe =
    variacaoObrigatoriaSemSelecao && opcoesVariacaoDisponiveis.length > 0;

  const precoVendaComVariacao = produto.precoVenda + precoAdicionalVariacao;

  const precoPromocionalComVariacao =
    temDesconto && produto.precoPromocional !== null
      ? produto.precoPromocional + precoAdicionalVariacao
      : null;

  const precoFinalComVariacao = precoFinal + precoAdicionalVariacao;

  const opcaoAdicionalSelecionada = useMemo(() => {
    if (!opcaoAdicionalSelecionadaId) {
      return null;
    }

    return (
      opcoesAdicionais.find(
        (opcao) => opcao.id === opcaoAdicionalSelecionadaId,
      ) || null
    );
  }, [opcaoAdicionalSelecionadaId, opcoesAdicionais]);

  const embalagemPresenteSelecionada = useMemo(() => {
    if (!embalagemPresenteSelecionadaId) {
      return null;
    }

    return (
      embalagensPresente.find(
        (embalagem) => embalagem.id === embalagemPresenteSelecionadaId,
      ) || null
    );
  }, [embalagemPresenteSelecionadaId, embalagensPresente]);

  const embalagemPresenteModal = useMemo(() => {
    if (!embalagemPresenteModalId) {
      return null;
    }

    return (
      embalagensPresente.find(
        (embalagem) => embalagem.id === embalagemPresenteModalId,
      ) || null
    );
  }, [embalagemPresenteModalId, embalagensPresente]);

  const valorAdicionalSelecionado = Number(
    opcaoAdicionalSelecionada?.valorVenda || 0,
  );
  const valorEmbalagemPresenteSelecionada = Number(
    embalagemPresenteSelecionada?.preco || 0,
  );

  const totalAdicionalSelecionado = valorAdicionalSelecionado * quantidade;
  const totalEmbalagemPresenteSelecionada =
    valorEmbalagemPresenteSelecionada * quantidade;
  const totalProdutoSelecionado = precoFinalComVariacao * quantidade;
  const totalComAdicional =
    totalProdutoSelecionado +
    totalAdicionalSelecionado +
    totalEmbalagemPresenteSelecionada;
  const cashbackValor = totalComAdicional * CASHBACK_PERCENTUAL;

  const estoqueDisponivel = useMemo(() => {
    if (temVariacao) {
      return (
        variacaoPrincipal?.opcoes.find(
          (opcao) => opcao.nome === tamanhoSelecionado,
        )?.quantidadeAtual ?? 0
      );
    }

    if (!produtoTemTamanho) {
      return produto.estoqueTotal;
    }

    return (
      produto.tamanhosDisponiveis.find(
        (tamanho) => tamanho.tamanhoAnel === tamanhoSelecionado,
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
    [menus],
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

    setImagemVariacaoSelecionada("");
    setIndiceImagemSelecionada(index);
  }

  function rolarMiniaturas(direcao: "cima" | "baixo") {
    const container = thumbsRef.current;

    if (!container) {
      return;
    }

    container.scrollBy({
      top: direcao === "cima" ? -180 : 180,
      behavior: "smooth",
    });
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
        `Quantidade limitada ao estoque disponível (${estoqueDisponivel}).`,
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
      "Frete e prazo serão confirmados no checkout. Integração automática será adicionada em uma próxima etapa.",
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
          : "Selecione uma opção.",
      );
      return;
    }

    if (quantidade <= 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }

    if (quantidade > estoqueDisponivel) {
      setErro(
        `Quantidade maior que o estoque disponível (${estoqueDisponivel}).`,
      );
      return;
    }

    if (
      embalagemPresenteSelecionada &&
      !embalagemPresenteSelecionada.permiteMensagem &&
      mensagemPresente.trim()
    ) {
      setErro("A embalagem selecionada não aceita mensagem.");
      return;
    }

    if (
      embalagemPresenteSelecionada?.mensagemLimiteCaracteres !== null &&
      embalagemPresenteSelecionada?.mensagemLimiteCaracteres !== undefined &&
      mensagemPresente.trim().length >
        embalagemPresenteSelecionada.mensagemLimiteCaracteres
    ) {
      setErro(
        `A mensagem do presente deve ter no máximo ${embalagemPresenteSelecionada.mensagemLimiteCaracteres} caracteres.`,
      );
      return;
    }

    const tamanhoAnel = produtoTemTamanho ? tamanhoSelecionado : null;
    const mensagemPresenteNormalizada = embalagemPresenteSelecionada
      ? mensagemPresente.trim()
      : "";

    const novoItem: CarrinhoItem = {
      produtoId: produto.id,
      codigoInterno: produto.codigoInterno,
      nome: produto.nome,
      imagemUrl: imagemSelecionada || produto.imagemUrl || null,
      categoria: produto.categoria,
      precoVenda: precoFinalComVariacao,
      precoOriginal: temDesconto ? precoVendaComVariacao : null,
      precoPromocional:
        temDesconto && precoPromocionalComVariacao !== null
          ? precoPromocionalComVariacao
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
      embalagemPresenteModeloId: embalagemPresenteSelecionada?.id || null,
      embalagemPresenteNome: embalagemPresenteSelecionada?.nome || null,
      embalagemPresenteImagemUrl:
        embalagemPresenteSelecionada?.imagemUrl || null,
      embalagemPresentePreco: embalagemPresenteSelecionada
        ? Number(embalagemPresenteSelecionada.preco || 0)
        : null,
      embalagemPresenteMensagem: mensagemPresenteNormalizada || null,
      embalagemPresenteSnapshot: embalagemPresenteSelecionada
        ? {
            modeloId: embalagemPresenteSelecionada.id,
            nome: embalagemPresenteSelecionada.nome,
            descricao: embalagemPresenteSelecionada.descricao,
            imagemUrl: embalagemPresenteSelecionada.imagemUrl,
            preco: Number(embalagemPresenteSelecionada.preco || 0),
            mensagem: mensagemPresenteNormalizada || null,
            substituiEmbalagemPadrao:
              embalagemPresenteSelecionada.substituiEmbalagemPadrao,
          }
        : null,
    };

    const carrinhoAtual = getCarrinhoAtual();
    const itemKey = getItemKey(novoItem);
    const itemExistente = carrinhoAtual.find(
      (item) => getItemKey(item) === itemKey,
    );

    let novoCarrinho: CarrinhoItem[];

    if (itemExistente) {
      const novaQuantidade = itemExistente.quantidade + quantidade;

      if (novaQuantidade > estoqueDisponivel) {
        setErro(
          `Você já tem ${itemExistente.quantidade} un. no carrinho. O estoque disponível é ${estoqueDisponivel}.`,
        );
        return;
      }

      novoCarrinho = carrinhoAtual.map((item) =>
        getItemKey(item) === itemKey
          ? {
              ...item,
              quantidade: novaQuantidade,
              precoVenda: precoFinalComVariacao,
              precoOriginal: novoItem.precoOriginal,
              precoPromocional: novoItem.precoPromocional,
              descontoPercentual: novoItem.descontoPercentual,
              estoqueDisponivel,
              opcaoAdicional: novoItem.opcaoAdicional,
              embalagemPresenteModeloId: novoItem.embalagemPresenteModeloId,
              embalagemPresenteNome: novoItem.embalagemPresenteNome,
              embalagemPresenteImagemUrl: novoItem.embalagemPresenteImagemUrl,
              embalagemPresentePreco: novoItem.embalagemPresentePreco,
              embalagemPresenteMensagem: novoItem.embalagemPresenteMensagem,
              embalagemPresenteSnapshot: novoItem.embalagemPresenteSnapshot,
            }
          : item,
      );
    } else {
      novoCarrinho = [...carrinhoAtual, novoItem];
    }

    salvarCarrinho(novoCarrinho);
    registrarEventoCarrinho({
      tipo: "PRODUTO_ADICIONADO_CARRINHO",
      produtoId: produto.id,
      origem: comprarAgora ? "comprar_agora" : "pagina_produto",
      metadata: {
        nome: produto.nome,
        codigoInterno: produto.codigoInterno,
        categoria: produto.categoria,
        quantidade,
        tamanho: tamanhoAnel,
        temOpcaoAdicional: Boolean(opcaoAdicionalSelecionada),
        temEmbalagemPresente: Boolean(embalagemPresenteSelecionada),
        valorItem: totalComAdicional,
      },
    });

    if (comprarAgora) {
      registrarCheckoutIniciado({
        origem: "comprar_agora",
        metadata: {
          itensDistintos: novoCarrinho.length,
          quantidadeItens: novoCarrinho.reduce(
            (total, item) => total + item.quantidade,
            0
          ),
        },
      });
      router.push("/loja/checkout");
      return;
    }

    setMensagem(
      embalagemPresenteSelecionada
        ? "Produto com embalagem para presente adicionado ao carrinho."
        : opcaoAdicionalSelecionada
        ? "Produto com opção adicional adicionado ao carrinho."
        : "Produto adicionado ao carrinho.",
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menusPublicos}
        categorias={categoriasMenu}
        produtos={produtosBuscaMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
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
                <div className="flex w-[84px] flex-col items-center gap-2">
                  {mostrarSetasMiniaturas && (
                    <button
                      type="button"
                      onClick={() => rolarMiniaturas("cima")}
                      className="flex h-7 w-7 items-center justify-center border border-slate-200 bg-white text-slate-400 transition hover:border-slate-400 hover:text-slate-700"
                      aria-label="Subir miniaturas"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  )}

                  <div
                    ref={thumbsRef}
                    className="max-h-[560px] w-[84px] space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {galeriaExibicao.map((imagem, index) => (
                      <button
                        key={`${imagem}-${index}`}
                        type="button"
                        onClick={() => irParaImagem(index)}
                        className={`h-[84px] w-[84px] overflow-hidden bg-white transition ${
                          !imagemVariacaoSelecionada &&
                          indiceImagemSelecionada === index
                            ? "opacity-100"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="relative h-full w-full">
                          <img
                            src={imagem}
                            alt={`${produto.nome} ${index + 1}`}
                            className="h-full w-full object-cover object-center"
                          />

                          <div className="pointer-events-none absolute inset-0 bg-black/5" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {mostrarSetasMiniaturas && (
                    <button
                      type="button"
                      onClick={() => rolarMiniaturas("baixo")}
                      className="flex h-7 w-7 items-center justify-center border border-slate-200 bg-white text-slate-400 transition hover:border-slate-400 hover:text-slate-700"
                      aria-label="Descer miniaturas"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-hidden bg-white">
              {imagemSelecionada ? (
                <>
                  <div className="relative aspect-square overflow-hidden">
                    <div
                      className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url(${imagemSelecionada})`,
                      }}
                      aria-label={produto.nome}
                    />

                    <div className="pointer-events-none absolute inset-0 bg-black/5" />
                  </div>

                  {possuiMaisDeUmaImagem && (
                    <div className="grid grid-cols-4 gap-3 p-4 lg:hidden">
                      {galeriaExibicao.slice(0, 4).map((imagem, index) => (
                        <button
                          key={`${imagem}-${index}`}
                          type="button"
                          onClick={() => irParaImagem(index)}
                          className={`aspect-square overflow-hidden bg-white transition ${
                            !imagemVariacaoSelecionada &&
                            indiceImagemSelecionada === index
                              ? "opacity-100"
                              : "opacity-60"
                          }`}
                        >
                          <div className="relative h-full w-full">
                            <div
                              className="h-full w-full bg-cover bg-center bg-no-repeat"
                              style={{
                                backgroundImage: `url(${imagem})`,
                              }}
                            />

                            <div className="pointer-events-none absolute inset-0 bg-black/5" />
                          </div>
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
              {deveMostrarAPartirDe && (
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  A partir de
                </p>
              )}
              {temDesconto && produto.precoPromocional !== null ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-light text-slate-400 line-through">
                      {moeda(precoVendaComVariacao)}
                    </span>

                    {desconto !== null && (
                      <span className="brand-bg px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]">
                        -{desconto}%
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xl font-light tracking-tight brand-text">
                    {moeda(
                      precoPromocionalComVariacao || precoFinalComVariacao,
                    )}
                  </p>
                </>
              ) : (
                <p className="text-xl font-light tracking-tight text-slate-950">
                  {moeda(precoFinalComVariacao)}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <p className="font-light text-slate-500">
                  ou 4 parcelas de{" "}
                  <strong className="font-semibold text-slate-900">
                    {moeda(precoFinalComVariacao / 4)}
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

            <ProdutoFamiliaSection produtos={familiaProdutos} />

            {produtoTemTamanho && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div>
                  {temVariacao && variacaoPrincipal ? (
                    <div>
                      <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Escolha {variacaoPrincipal.nome.toLowerCase()}
                          </p>

                          <p className="mt-1 text-xs font-light text-slate-500">
                            Selecione uma opção disponível para continuar.
                          </p>
                        </div>

                        {variacaoPrincipal.opcoes.length > 4 ? (
                          <p className="hidden text-xs font-light text-slate-400 sm:block">
                            Arraste para ver mais
                          </p>
                        ) : null}
                      </div>

                      <div className="-mx-1 overflow-x-auto pb-3 [scrollbar-width:thin]">
                        <div className="flex min-w-max gap-3 px-1">
                          {variacaoPrincipal.opcoes.map((opcao) => {
                            const selecionado =
                              tamanhoSelecionado === opcao.nome;
                            const semSaldo = opcao.quantidadeAtual <= 0;
                            const possuiImagem = Boolean(opcao.imagemUrl);
                            const precoExtra = Number(
                              opcao.precoAdicional || 0,
                            );

                            if (!possuiImagem) {
                              return (
                                <button
                                  key={opcao.id}
                                  type="button"
                                  disabled={semSaldo}
                                  onClick={() => {
                                    setTamanhoSelecionado(opcao.nome);
                                    setQuantidade(1);
                                    setErro("");
                                    setMensagem("");
                                    setImagemVariacaoSelecionada("");
                                  }}
                                  className={`shrink-0 border px-5 py-2.5 text-sm font-medium transition ${
                                    selecionado
                                      ? "brand-border brand-bg-soft brand-text"
                                      : "border-slate-300 bg-white text-slate-700 hover:border-[var(--brand-blue)]"
                                  } ${
                                    semSaldo
                                      ? "cursor-not-allowed opacity-40"
                                      : ""
                                  }`}
                                >
                                  <span>{opcao.nome}</span>

                                  {precoExtra > 0 && (
                                    <span className="ml-2 text-xs font-normal opacity-70">
                                      + {moeda(precoExtra)}
                                    </span>
                                  )}
                                </button>
                              );
                            }

                            return (
                              <button
                                key={opcao.id}
                                type="button"
                                disabled={semSaldo}
                                onClick={() => {
                                  setTamanhoSelecionado(opcao.nome);
                                  setQuantidade(1);
                                  setErro("");
                                  setMensagem("");

                                  if (opcao.imagemUrl) {
                                    setImagemVariacaoSelecionada(
                                      opcao.imagemUrl,
                                    );
                                  }
                                }}
                                className={`group w-24 shrink-0 text-center transition ${
                                  semSaldo
                                    ? "cursor-not-allowed opacity-40"
                                    : ""
                                }`}
                              >
                                <div
                                  className={`relative flex h-24 w-24 items-center justify-center overflow-hidden border bg-white transition ${
                                    selecionado
                                      ? "brand-border ring-2 ring-[var(--brand-blue)] ring-offset-2"
                                      : "border-slate-200 group-hover:border-[var(--brand-blue)]"
                                  }`}
                                >
                                  <img
                                    src={opcao.imagemUrl || ""}
                                    alt={opcao.nome}
                                    className="h-full w-full object-cover"
                                  />

                                  <div className="pointer-events-none absolute inset-0 bg-black/5" />

                                  {semSaldo ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                                      Indisp.
                                    </div>
                                  ) : null}
                                </div>

                                <span
                                  className={`mt-2 block truncate text-xs ${
                                    selecionado
                                      ? "font-semibold brand-text"
                                      : "text-slate-600"
                                  }`}
                                  title={opcao.nome}
                                >
                                  {opcao.nome}
                                </span>

                                {precoExtra > 0 && (
                                  <span className="block text-[11px] font-normal text-slate-400">
                                    + {moeda(precoExtra)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
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
                        {produto.tamanhosDisponiveis.map((tamanho) => {
                          const habilitado = tamanho.quantidadeAtual > 0;
                          const selecionado =
                            tamanhoSelecionado === tamanho.tamanhoAnel;

                          return (
                            <button
                              key={tamanho.tamanhoAnel}
                              type="button"
                              disabled={!habilitado}
                              onClick={() => {
                                setTamanhoSelecionado(tamanho.tamanhoAnel);
                                setQuantidade(1);
                                setErro("");
                                setMensagem("");
                                setImagemVariacaoSelecionada("");
                              }}
                              className={`relative flex h-12 items-center justify-center border text-sm font-medium transition ${
                                selecionado
                                  ? "border-slate-950 bg-white text-slate-950"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-800"
                              } ${
                                !habilitado
                                  ? "cursor-not-allowed bg-slate-50 text-slate-300 hover:border-slate-200"
                                  : ""
                              }`}
                            >
                              {tamanho.tamanhoAnel}

                              {!habilitado && (
                                <span className="absolute left-1/2 top-1/2 h-px w-[135%] -translate-x-1/2 -translate-y-1/2 rotate-[28deg] bg-slate-300" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {opcoesAdicionais.length > 0 && !semEstoque && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  {opcoesAdicionais.map((opcao) => {
                    const selecionada =
                      opcaoAdicionalSelecionadaId === opcao.id;

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
                              atual === opcao.id ? "" : opcao.id,
                            )
                          }
                          className="h-4 w-4 border-slate-300"
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

            {embalagensPresente.length > 0 && !semEstoque && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="mb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      Embalagem para presente
                    </p>

                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                      Opcional por item
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-light text-slate-500">
                    Escolha uma embalagem especial para este item do carrinho.
                  </p>
                </div>

                {embalagensPresente.length === 1 ? (
                  <div
                    className={`grid gap-3 border p-3 transition sm:grid-cols-[88px_1fr] ${
                      embalagemPresenteSelecionadaId === embalagensPresente[0].id
                        ? "border-[var(--brand-blue)] bg-[var(--brand-blue-soft)]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setEmbalagemPresenteModalId(embalagensPresente[0].id)
                      }
                      className="aspect-square overflow-hidden border border-slate-200 bg-slate-50 [&>div]:h-full [&>div]:w-full [&>div]:rounded-none"
                      aria-label={`Ver embalagem ${embalagensPresente[0].nome}`}
                    >
                      <ImageBox
                        src={embalagensPresente[0].imagemUrl}
                        alt={embalagensPresente[0].nome}
                      />
                    </button>

                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={
                          embalagemPresenteSelecionadaId ===
                          embalagensPresente[0].id
                        }
                        onChange={(event) => {
                          setErro("");
                          setMensagem("");
                          setMensagemPresente("");
                          setEmbalagemPresenteSelecionadaId(
                            event.target.checked ? embalagensPresente[0].id : "",
                          );
                        }}
                        className="mt-1 h-4 w-4 border-slate-300"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-slate-950">
                            {embalagensPresente[0].nome}
                          </span>

                          <span className="shrink-0 text-sm font-medium brand-text">
                            + {moeda(embalagensPresente[0].preco)}
                          </span>
                        </span>

                        {embalagensPresente[0].descricao && (
                          <span className="mt-1 line-clamp-2 block text-xs font-light leading-5 text-slate-500">
                            {embalagensPresente[0].descricao}
                          </span>
                        )}

                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium brand-text">
                          <Gift className="h-3.5 w-3.5" />
                          Presente neste item
                        </span>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            setEmbalagemPresenteModalId(embalagensPresente[0].id);
                          }}
                          className="mt-3 block text-xs font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950"
                        >
                          Ver detalhes da embalagem
                        </button>
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {embalagensPresente.map((embalagem) => {
                      const selecionada =
                        embalagemPresenteSelecionadaId === embalagem.id;

                      return (
                        <div
                          key={embalagem.id}
                          className={`grid gap-3 border px-3 py-3 transition sm:grid-cols-[64px_1fr] ${
                            selecionada
                              ? "border-[var(--brand-blue)] bg-[var(--brand-blue-soft)]"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setEmbalagemPresenteModalId(embalagem.id)}
                            className="aspect-square overflow-hidden bg-white"
                            aria-label={`Ver embalagem ${embalagem.nome}`}
                          >
                            {embalagem.imagemUrl ? (
                              <img
                                src={embalagem.imagemUrl}
                                alt={embalagem.nome}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                                Sem imagem
                              </span>
                            )}
                          </button>

                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="embalagemPresente"
                              checked={selecionada}
                              onChange={() => {
                                setErro("");
                                setMensagem("");
                                setMensagemPresente("");
                                setEmbalagemPresenteSelecionadaId(embalagem.id);
                              }}
                              className="mt-1 h-4 w-4"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="text-sm font-medium text-slate-950">
                                  {embalagem.nome}
                                </span>

                                <span className="shrink-0 text-sm font-medium brand-text">
                                  + {moeda(embalagem.preco)}
                                </span>
                              </span>

                              {embalagem.descricao && (
                                <span className="mt-1 line-clamp-2 block text-xs font-light leading-5 text-slate-500">
                                  {embalagem.descricao}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  setEmbalagemPresenteModalId(embalagem.id);
                                }}
                                className="mt-2 text-xs font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950"
                              >
                                Ver embalagem
                              </button>
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {embalagemPresenteSelecionadaId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmbalagemPresenteSelecionadaId("");
                          setMensagemPresente("");
                        }}
                        className="text-xs font-medium text-slate-500 underline underline-offset-4 hover:text-slate-950"
                      >
                        Remover embalagem para presente
                      </button>
                    )}
                  </div>
                )}

                {embalagemPresenteSelecionada?.permiteMensagem && (
                  <label className="mt-4 block border border-slate-200 bg-white p-3">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Mensagem para o presente
                    </span>

                    <span className="mb-2 block text-xs font-light text-slate-500">
                      Opcional. A mensagem acompanha somente esta embalagem.
                    </span>

                    <textarea
                      value={mensagemPresente}
                      maxLength={
                        embalagemPresenteSelecionada.mensagemLimiteCaracteres ||
                        undefined
                      }
                      onChange={(event) => setMensagemPresente(event.target.value)}
                      rows={3}
                      placeholder={
                        embalagemPresenteSelecionada.mensagemPlaceholder ||
                        "Escreva uma mensagem opcional"
                      }
                      className="w-full resize-none border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                    />

                    {embalagemPresenteSelecionada.mensagemLimiteCaracteres && (
                      <span className="mt-1 block text-xs text-slate-400">
                        {mensagemPresente.length}/
                        {embalagemPresenteSelecionada.mensagemLimiteCaracteres}{" "}
                        caracteres
                      </span>
                    )}
                  </label>
                )}
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

            {(opcaoAdicionalSelecionada || embalagemPresenteSelecionada) && (
              <div className="mt-4 border border-slate-200 bg-white px-4 py-3 text-sm leading-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-light text-slate-500">Produto</span>
                  <span className="font-medium text-slate-950">
                    {moeda(totalProdutoSelecionado)}
                  </span>
                </div>

                {opcaoAdicionalSelecionada && (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-light text-slate-500">
                      {opcaoAdicionalSelecionada.nome}
                    </span>
                    <span className="font-medium text-slate-950">
                      {moeda(totalAdicionalSelecionado)}
                    </span>
                  </div>
                )}

                {embalagemPresenteSelecionada && (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-light text-slate-500">
                      {embalagemPresenteSelecionada.nome}
                    </span>
                    <span className="font-medium text-slate-950">
                      {moeda(totalEmbalagemPresenteSelecionada)}
                    </span>
                  </div>
                )}

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

      <RodapeLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />

      {embalagemPresenteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-5 py-8">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                  Embalagem para presente
                </p>

                <h2 className="mt-1 text-lg font-medium text-slate-950">
                  {embalagemPresenteModal.nome}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setEmbalagemPresenteModalId("")}
                className="flex h-10 w-10 items-center justify-center border border-slate-200 text-slate-500 transition hover:border-slate-950 hover:text-slate-950"
                aria-label="Fechar embalagem"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {embalagemPresenteModal.imagemUrl ? (
              <div className="aspect-square overflow-hidden bg-slate-50">
                <img
                  src={embalagemPresenteModal.imagemUrl}
                  alt={embalagemPresenteModal.nome}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-slate-50 text-sm text-slate-400">
                Embalagem sem imagem
              </div>
            )}

            <div className="space-y-4 px-5 py-5">
              {embalagemPresenteModal.descricao && (
                <p className="text-sm font-light leading-6 text-slate-600">
                  {embalagemPresenteModal.descricao}
                </p>
              )}

              <div className="flex items-center justify-between border border-slate-200 px-4 py-3 text-sm">
                <span className="font-light text-slate-500">
                  Valor adicional
                </span>
                <span className="font-semibold brand-text">
                  + {moeda(embalagemPresenteModal.preco)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEmbalagemPresenteSelecionadaId(embalagemPresenteModal.id);
                  setMensagemPresente("");
                  setEmbalagemPresenteModalId("");
                }}
                className="w-full brand-button px-4 py-3 text-sm font-medium"
              >
                Escolher esta embalagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
