"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Gift,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import ImageBox from "@/components/ui/ImageBox";
import { registrarCheckoutIniciado } from "@/lib/loja/eventos-client";

const CARRINHO_STORAGE_KEY = "sistema-stella-carrinho";

type MenuPublicoLojaProps = ComponentProps<typeof MenuPublicoLoja>;

export type CheckoutCashbackConfig = {
  ativo: boolean;
  percentualPrimeiraCompra: number;
  percentualCompraRecorrente: number;
  somenteClienteCadastrado: boolean;
  permitirComCupom: boolean;
  permitirProdutoComDesconto: boolean;
  diasValidade: number | null;
};

export type CheckoutClienteLogado = {
  id: string;
  codigo: string;
  nome: string;
  telefone: string;
  email: string | null;
  documento: string;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  tipoCliente: string;
  cashbackSaldo: number;
  totalPedidosOnline: number;
  totalPedidosPagos: number;
};

type CheckoutClientProps = {
  menus: MenuPublicoLojaProps["menus"];
  categoriasMenu: MenuPublicoLojaProps["categorias"];
  configuracaoMenuRodape?: MenuPublicoLojaProps["configuracaoMenuRodape"];
  cashbackConfig: CheckoutCashbackConfig;
  clienteLogado: CheckoutClienteLogado | null;
};

type CarrinhoItemOpcaoAdicional = {
  id: string;
  nome: string;
  descricao?: string | null;
  valorVenda: number;
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

type CupomAplicado = {
  id: string;
  codigo: string;
  nome: string | null;
  tipo: string;
  valor: number;
  valorMinimoPedido: number;
  bloqueiaCashback: boolean;
  descontoValor: number;
};

type ModoCheckout = "SEM_CADASTRO" | "COM_CADASTRO";

type FreteOpcaoCheckout = {
  id: string;
  servicoId: string;
  nome: string;
  transportadora: string;
  valor: number;
  prazoDias: number | null;
  descricao: string;
  provider?: "MELHOR_ENVIO" | "MANUAL" | "RETIRADA_LOCAL";
  tipoEntrega?: "ENTREGA" | "RETIRADA";
  erro?: string | null;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function parseNumeroInput(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();

  if (!raw) {
    return 0;
  }

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");

  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : 0;
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
    quantidade: Number(item.quantidade || 1),
    estoqueDisponivel: Number(item.estoqueDisponivel || 0),
    opcaoAdicional: item.opcaoAdicional
      ? {
          id: String(item.opcaoAdicional.id || ""),
          nome: String(item.opcaoAdicional.nome || "Opção adicional"),
          descricao: item.opcaoAdicional.descricao ?? null,
          valorVenda: Number(item.opcaoAdicional.valorVenda || 0),
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

    const carrinho = parsed
      .map((item) => normalizarCarrinhoItem(item))
      .filter((item) => item.produtoId && item.nome);

    const carrinhoSanitizado = JSON.stringify(carrinho);

    if (carrinhoSanitizado !== raw) {
      window.localStorage.setItem(CARRINHO_STORAGE_KEY, carrinhoSanitizado);
    }

    return carrinho;
  } catch {
    return [];
  }
}

function limparCarrinho() {
  window.localStorage.removeItem(CARRINHO_STORAGE_KEY);
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

function getItemKey(item: CarrinhoItem) {
  return [
    item.produtoId,
    item.tamanhoAnel ?? "UNICO",
    item.opcaoAdicional?.id ?? "SEM_OPCAO_ADICIONAL",
    item.embalagemPresenteModeloId ?? "SEM_EMBALAGEM_PRESENTE",
    item.embalagemPresenteMensagem?.trim() || "SEM_MENSAGEM_PRESENTE",
  ].join("-");
}
function getTextoOpcaoProduto(item: CarrinhoItem) {
  if (!item.tamanhoAnel) {
    return null;
  }

  return item.tamanhoAnel;
}

function formatarTipoCupom(cupom: CupomAplicado) {
  if (cupom.tipo === "PERCENTUAL") return `${cupom.valor}% off`;
  if (cupom.tipo === "VALOR_FIXO") return `${moeda(cupom.valor)} off`;
  if (cupom.tipo === "FRETE_GRATIS") return "Frete grátis";

  return cupom.tipo;
}

export default function CheckoutClient({
  menus: menusPublicos,
  categoriasMenu,
  configuracaoMenuRodape,
  cashbackConfig,
  clienteLogado,
}: CheckoutClientProps) {
  const [itens] = useState<CarrinhoItem[]>(() => lerCarrinho());

  const [modoCheckout, setModoCheckout] = useState<ModoCheckout>(
    clienteLogado ? "COM_CADASTRO" : "SEM_CADASTRO"
  );

  const [salvando, setSalvando] = useState(false);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [ultimoCepBuscado, setUltimoCepBuscado] = useState("");
  const [erro, setErro] = useState("");
  const [erroCupom, setErroCupom] = useState("");
  const [erroCashback, setErroCashback] = useState("");
  const [erroCep, setErroCep] = useState("");
  const [cotandoFrete, setCotandoFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState("");
  const [opcoesFrete, setOpcoesFrete] = useState<FreteOpcaoCheckout[]>([]);
  const [freteSelecionadoId, setFreteSelecionadoId] = useState("");
  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<CupomAplicado | null>(
    null
  );
  const [cashbackUsoInput, setCashbackUsoInput] = useState("");
  const [pedidoFinalizado] = useState<{
    codigo: string;
    cashbackPrevistoValor: number;
  } | null>(null);

  const [form, setForm] = useState({
    nomeCliente: clienteLogado?.nome || "",
    telefoneCliente: clienteLogado?.telefone || "",
    emailCliente: clienteLogado?.email || "",
    documento: clienteLogado?.documento || "",
    senha: "",
    confirmarSenha: "",
    cep: clienteLogado?.cep || "",
    rua: clienteLogado?.rua || "",
    numero: clienteLogado?.numero || "",
    complemento: clienteLogado?.complemento || "",
    bairro: clienteLogado?.bairro || "",
    cidade: clienteLogado?.cidade || "",
    estado: clienteLogado?.estado || "",
    observacoes: "",
  });
  const [consentimentoWhatsapp, setConsentimentoWhatsapp] = useState(false);

  const clienteEstaLogado = Boolean(clienteLogado);
  const compraComConta = clienteEstaLogado || modoCheckout === "COM_CADASTRO";
  const criarCadastroNoCheckout =
    !clienteEstaLogado && modoCheckout === "COM_CADASTRO";

  const subtotalProdutos = useMemo(() => {
    return itens.reduce((total, item) => total + getTotalProdutoItem(item), 0);
  }, [itens]);

  const subtotalAdicionais = useMemo(() => {
    return itens.reduce((total, item) => total + getTotalAdicionalItem(item), 0);
  }, [itens]);

  const subtotalEmbalagensPresente = useMemo(() => {
    return itens.reduce(
      (total, item) => total + getTotalEmbalagemPresenteItem(item),
      0
    );
  }, [itens]);

  const subtotalBruto = useMemo(() => {
    return subtotalProdutos + subtotalAdicionais + subtotalEmbalagensPresente;
  }, [subtotalProdutos, subtotalAdicionais, subtotalEmbalagensPresente]);

  const descontoCupom = Number(cupomAplicado?.descontoValor || 0);

  const subtotalAposCupom = useMemo(() => {
    return Math.max(subtotalBruto - descontoCupom, 0);
  }, [subtotalBruto, descontoCupom]);

  const cashbackSaldoDisponivel = Number(clienteLogado?.cashbackSaldo || 0);

  const cashbackMaximoUsavel = useMemo(() => {
    if (!clienteLogado) {
      return 0;
    }

    return Math.min(cashbackSaldoDisponivel, subtotalAposCupom);
  }, [clienteLogado, cashbackSaldoDisponivel, subtotalAposCupom]);

  const cashbackUsoSolicitado = parseNumeroInput(cashbackUsoInput);

  const cashbackUsado = useMemo(() => {
    if (!clienteLogado) {
      return 0;
    }

    if (cashbackUsoSolicitado <= 0) {
      return 0;
    }

    return Math.min(cashbackUsoSolicitado, cashbackMaximoUsavel);
  }, [cashbackMaximoUsavel, cashbackUsoSolicitado, clienteLogado]);

  const subtotal = useMemo(() => {
    return Math.max(subtotalAposCupom - cashbackUsado, 0);
  }, [subtotalAposCupom, cashbackUsado]);

  const freteSelecionado = useMemo(() => {
    return (
      opcoesFrete.find(
        (opcao) => opcao.id === freteSelecionadoId && !opcao.erro
      ) || null
    );
  }, [freteSelecionadoId, opcoesFrete]);

  const valorFrete = Number(freteSelecionado?.valor || 0);

  const totalPedido = useMemo(() => {
    return subtotal + valorFrete;
  }, [subtotal, valorFrete]);

  const economia = useMemo(() => {
    return itens.reduce((total, item) => {
      const precoOriginal = getPrecoOriginal(item);

      if (!precoOriginal) {
        return total;
      }

      const precoUnitario = getPrecoUnitario(item);

      return total + (precoOriginal - precoUnitario) * item.quantidade;
    }, 0);
  }, [itens]);

  const quantidadeTotal = useMemo(() => {
    return itens.reduce((total, item) => total + item.quantidade, 0);
  }, [itens]);

  const cashbackPercentualEstimado = useMemo(() => {
    if (!cashbackConfig.ativo) {
      return 0;
    }

    if (
      cupomAplicado &&
      (cupomAplicado.bloqueiaCashback || !cashbackConfig.permitirComCupom)
    ) {
      return 0;
    }

    if (cashbackConfig.somenteClienteCadastrado && !compraComConta) {
      return 0;
    }

    if (clienteLogado) {
      return clienteLogado.totalPedidosPagos > 0
        ? cashbackConfig.percentualCompraRecorrente
        : cashbackConfig.percentualPrimeiraCompra;
    }

    if (modoCheckout === "COM_CADASTRO") {
      return cashbackConfig.percentualPrimeiraCompra;
    }

    return cashbackConfig.percentualCompraRecorrente;
  }, [cashbackConfig, clienteLogado, compraComConta, cupomAplicado, modoCheckout]);

  const cashbackBaseEstimado = useMemo(() => {
    return Math.max(subtotalAposCupom - cashbackUsado, 0);
  }, [subtotalAposCupom, cashbackUsado]);

  const cashbackPrevisto = useMemo(() => {
    return Number(
      ((cashbackBaseEstimado * cashbackPercentualEstimado) / 100).toFixed(2)
    );
  }, [cashbackBaseEstimado, cashbackPercentualEstimado]);

  const cashbackBloqueado = cashbackPercentualEstimado <= 0;

  const cashbackBloqueadoMotivo = useMemo(() => {
    if (!cashbackConfig.ativo) {
      return "Cashback desativado";
    }

    if (
      cupomAplicado &&
      (cupomAplicado.bloqueiaCashback || !cashbackConfig.permitirComCupom)
    ) {
      return "Cupom aplicado";
    }

    if (cashbackConfig.somenteClienteCadastrado && !compraComConta) {
      return "Disponível apenas para cliente cadastrado";
    }

    return null;
  }, [cashbackConfig, compraComConta, cupomAplicado]);

  const possuiItemSemEstoque = useMemo(() => {
    return itens.some((item) => item.estoqueDisponivel <= 0);
  }, [itens]);

  const quantidadeItensComDesconto = useMemo(() => {
    return itens.filter(itemTemDesconto).length;
  }, [itens]);

  const possuiAdicionais = subtotalAdicionais > 0;
  const possuiEmbalagensPresente = subtotalEmbalagensPresente > 0;

function atualizarCampo(campo: keyof typeof form, valor: string) {
  setErroCep("");

  if (campo === "cep") {
    setErroFrete("");
    setOpcoesFrete([]);
    setFreteSelecionadoId("");
  }

  setForm((current) => ({
    ...current,
    [campo]: campo === "estado" ? valor.toUpperCase() : valor,
  }));
}
const buscarEnderecoPorCep = useCallback(async (cepInformado?: string) => {
  const cep = String(cepInformado || form.cep || "").replace(/\D/g, "");

  setErroCep("");

  if (!cep) {
    setErroCep("Informe o CEP.");
    return;
  }

  if (cep.length !== 8) {
    setErroCep("O CEP deve ter 8 dígitos.");
    return;
  }

  setBuscandoCep(true);

  try {
    const response = await fetch(`/api/loja/cep?cep=${cep}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErroCep(data.error || "CEP não encontrado.");
      return;
    }

    setForm((current) => ({
      ...current,
      cep: data.endereco.cep || cep,
      rua: data.endereco.rua || current.rua,
      bairro: data.endereco.bairro || current.bairro,
      cidade: data.endereco.cidade || current.cidade,
      estado: data.endereco.estado || current.estado,
    }));

    setUltimoCepBuscado(cep);
  } catch {
    setErroCep("Erro ao buscar CEP.");
  } finally {
    setBuscandoCep(false);
  }
}, [form.cep]);
useEffect(() => {
  const cep = form.cep.replace(/\D/g, "");

  if (cep.length !== 8) {
    return;
  }

  if (cep === ultimoCepBuscado) {
    return;
  }

  const timer = window.setTimeout(() => {
    buscarEnderecoPorCep(cep);
  }, 500);

  return () => window.clearTimeout(timer);
}, [buscarEnderecoPorCep, form.cep, ultimoCepBuscado]);

  const assinaturaCotacaoFrete = useMemo(() => {
    const cep = form.cep.replace(/\D/g, "");
    const itensCotacao = itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
    }));

    return JSON.stringify({
      cep,
      itens: itensCotacao,
    });
  }, [form.cep, itens]);

  useEffect(() => {
    const cep = form.cep.replace(/\D/g, "");

    if (cep.length !== 8 || itens.length === 0) {
      setCotandoFrete(false);
      setOpcoesFrete([]);
      setFreteSelecionadoId("");
      setErroFrete("");
      return;
    }

    let cancelado = false;

    async function cotarFrete() {
      setCotandoFrete(true);
      setErroFrete("");

      try {
        const response = await fetch("/api/loja/frete/cotar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cepDestino: cep,
            itens: itens.map((item) => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
            })),
            subtotal,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (cancelado) {
          return;
        }

        if (!response.ok) {
          const opcoesFallback = Array.isArray(data.opcoes)
            ? (data.opcoes as FreteOpcaoCheckout[])
            : [];
          setOpcoesFrete(opcoesFallback);
          const primeiraOpcaoFallback = opcoesFallback.find(
            (opcao) => !opcao.erro
          );
          setFreteSelecionadoId(primeiraOpcaoFallback?.id || "");
          setErroFrete(data.error || "Erro ao cotar frete.");
          return;
        }

        const opcoes = Array.isArray(data.opcoes)
          ? (data.opcoes as FreteOpcaoCheckout[])
          : [];
        const opcoesOrdenadas = [...opcoes].sort((a, b) => {
          if (a.erro && !b.erro) return 1;
          if (!a.erro && b.erro) return -1;
          return Number(a.valor || 0) - Number(b.valor || 0);
        });

        setOpcoesFrete(opcoesOrdenadas);
        setErroFrete(
          typeof data.message === "string" && data.message ? data.message : ""
        );

        const primeiraOpcaoValida = opcoesOrdenadas.find((opcao) => !opcao.erro);
        setFreteSelecionadoId(primeiraOpcaoValida?.id || "");
      } catch {
        if (!cancelado) {
          setOpcoesFrete([]);
          setFreteSelecionadoId("");
          setErroFrete("Erro ao cotar frete.");
        }
      } finally {
        if (!cancelado) {
          setCotandoFrete(false);
        }
      }
    }

    cotarFrete();

    return () => {
      cancelado = true;
    };
  }, [assinaturaCotacaoFrete, form.cep, itens, subtotal]);

function preencherDadosClienteLogado() {
  if (!clienteLogado) {
    return;
  }

  setForm((current) => ({
    ...current,
    nomeCliente: clienteLogado.nome || "",
    telefoneCliente: clienteLogado.telefone || "",
    emailCliente: clienteLogado.email || "",
    documento: clienteLogado.documento || "",
    cep: clienteLogado.cep || current.cep,
    rua: clienteLogado.rua || current.rua,
    numero: clienteLogado.numero || current.numero,
    complemento: clienteLogado.complemento || current.complemento,
    bairro: clienteLogado.bairro || current.bairro,
    cidade: clienteLogado.cidade || current.cidade,
    estado: clienteLogado.estado || current.estado,
  }));
}

  function usarCashbackTotal() {
    if (!clienteLogado) {
      return;
    }

    setErroCashback("");
    setCashbackUsoInput(String(cashbackMaximoUsavel.toFixed(2)).replace(".", ","));
  }

  function removerCashback() {
    setErroCashback("");
    setCashbackUsoInput("");
  }

  function atualizarCashbackUso(valor: string) {
    setErroCashback("");

    const numero = parseNumeroInput(valor);

    if (numero > cashbackMaximoUsavel) {
      setErroCashback(
        `Você pode usar até ${moeda(cashbackMaximoUsavel)} de cashback neste pedido.`
      );
    }

    setCashbackUsoInput(valor);
  }

  async function aplicarCupom() {
    setErroCupom("");
    setErro("");

    if (!codigoCupom.trim()) {
      setErroCupom("Informe um cupom.");
      return;
    }

    setValidandoCupom(true);

    try {
      const response = await fetch("/api/loja/cupons/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigo: codigoCupom,
          subtotal: subtotalBruto,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroCupom(data.error || "Cupom inválido.");
        setCupomAplicado(null);
        return;
      }

      setCupomAplicado(data.cupom);
      setCodigoCupom(data.cupom.codigo);

      if (cashbackUsoSolicitado > 0) {
        setCashbackUsoInput("");
      }
    } catch {
      setErroCupom("Erro ao validar cupom.");
      setCupomAplicado(null);
    } finally {
      setValidandoCupom(false);
    }
  }

  function removerCupom() {
    setCupomAplicado(null);
    setCodigoCupom("");
    setErroCupom("");
  }

  async function finalizarPedido() {
    setErro("");
    setErroCashback("");

    if (itens.length === 0) {
      setErro("O carrinho está vazio.");
      return;
    }

    if (possuiItemSemEstoque) {
      setErro("Remova itens sem estoque antes de finalizar o pedido.");
      return;
    }

    if (!form.nomeCliente.trim()) {
      setErro("Informe seu nome.");
      return;
    }

    if (!form.telefoneCliente.trim()) {
      setErro("Informe seu telefone/WhatsApp.");
      return;
    }

    const cepNumeros = form.cep.replace(/\D/g, "");

    if (cepNumeros.length !== 8) {
      setErro("Informe um CEP válido para calcular o frete.");
      return;
    }

    if (cotandoFrete) {
      setErro("Aguarde a cotação do frete antes de finalizar.");
      return;
    }

    if (!freteSelecionado) {
      setErro("Selecione uma opção de frete para finalizar o pedido.");
      return;
    }

    if (criarCadastroNoCheckout) {
      if (!form.emailCliente.trim()) {
        setErro("Informe seu e-mail para criar o cadastro.");
        return;
      }

      if (!form.documento.trim()) {
        setErro("Informe seu CPF para criar o cadastro.");
        return;
      }

      const cpfNumeros = form.documento.replace(/\D/g, "");

      if (cpfNumeros.length !== 11) {
        setErro("Informe um CPF válido com 11 dígitos.");
        return;
      }

      if (form.senha.length < 6) {
        setErro("A senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (form.senha !== form.confirmarSenha) {
        setErro("As senhas não conferem.");
        return;
      }
    }

    if (cashbackUsoSolicitado > cashbackMaximoUsavel) {
      setErroCashback(
        `Você pode usar até ${moeda(cashbackMaximoUsavel)} de cashback neste pedido.`
      );
      return;
    }

    registrarCheckoutIniciado({
      origem: "checkout_submit",
      metadata: {
        acao: "finalizar_pedido",
        itensDistintos: itens.length,
        quantidadeItens: quantidadeTotal,
        possuiCupom: Boolean(cupomAplicado),
        possuiCashback: cashbackUsoSolicitado > 0,
        tipoEntrega: freteSelecionado.tipoEntrega || "ENTREGA",
        freteProvider: freteSelecionado.provider || "INDEFINIDO",
      },
    });

    setSalvando(true);

    try {
      const response = await fetch("/api/loja/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          criarCadastro: criarCadastroNoCheckout,
          consentimentoWhatsapp,
          cupomCodigo: cupomAplicado?.codigo || null,
          cashbackUsadoValor: cashbackUsado,
          freteOpcaoId: freteSelecionado.id,
          ...form,
          itens: itens.map((item) => ({
            produtoId: item.produtoId,
            tamanhoAnel: item.tamanhoAnel,
            quantidade: item.quantidade,
            embalagemPresenteModeloId: item.embalagemPresenteModeloId || null,
            embalagemPresenteMensagem: item.embalagemPresenteMensagem || null,
            opcaoAdicionalId: item.opcaoAdicional?.id || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao finalizar pedido.");
        setSalvando(false);
        return;
      }

      limparCarrinho();

    window.location.href = `/loja/pedido/${data.codigo}`;
    } catch {
      setErro("Erro ao finalizar pedido.");
      setSalvando(false);
    }
  }

  if (pedidoFinalizado) {
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

        <main className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center brand-bg-soft">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-3xl font-light tracking-tight text-slate-950 md:text-5xl">
            Pedido realizado
          </h1>

          <p className="mt-4 text-sm font-light leading-6 text-slate-600">
            Seu pedido foi registrado com sucesso. Código do pedido:
          </p>

          <p className="mt-3 text-2xl font-semibold brand-text">
            {pedidoFinalizado.codigo}
          </p>

          {pedidoFinalizado.cashbackPrevistoValor > 0 && (
            <div className="mt-6 border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-5 py-4 text-sm leading-6 text-[var(--brand-blue)]">
              Você gerou{" "}
              <strong>{moeda(pedidoFinalizado.cashbackPrevistoValor)}</strong>{" "}
              de cashback acumulativo para usar nas próximas compras após
              confirmação do pagamento.
            </div>
          )}

          <p className="mt-6 text-sm font-light leading-6 text-slate-500">
            O estoque dos produtos foi baixado automaticamente. A próxima etapa é
            o acompanhamento interno do pedido online.
          </p>

          <Link
            href="/loja"
            className="mt-8 inline-flex brand-button px-6 py-3 text-sm font-medium"
          >
            Continuar comprando
          </Link>
        </main>

        <RodapePublicoLoja
          menus={menusPublicos}
          configuracaoMenuRodape={configuracaoMenuRodape}
        />
      </div>
    );
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
            Loja Stella
          </p>

          <h1 className="mt-3 text-3xl font-light tracking-tight text-slate-950 md:text-5xl">
            Checkout
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-slate-500">
            Finalize seu pedido. Você pode comprar sem cadastro ou criar uma
            conta para acompanhar pedidos e acumular cashback.
          </p>
        </div>

        {itens.length === 0 ? (
          <section className="border border-slate-200 px-6 py-16 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />

            <h2 className="mt-4 text-2xl font-light tracking-tight text-slate-950">
              Seu carrinho está vazio
            </h2>

            <p className="mt-3 text-sm font-light text-slate-500">
              Adicione produtos antes de finalizar o pedido.
            </p>

            <Link
              href="/loja"
              className="mt-6 inline-flex brand-button px-6 py-3 text-sm font-medium"
            >
              Ver produtos
            </Link>
          </section>
        ) : (
          <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <section className="brand-bg-soft border brand-border p-5 md:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-white brand-text shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.24em] brand-text">
                      Cashback acumulativo
                    </p>

                    <h2 className="mt-1 text-2xl font-light tracking-tight text-slate-950">
                      {clienteLogado
                        ? `Você tem ${moeda(
                            cashbackSaldoDisponivel
                          )} disponível`
                        : modoCheckout === "COM_CADASTRO"
                        ? `Ganhe ${cashbackConfig.percentualPrimeiraCompra}% de cashback na primeira compra`
                        : "Crie uma conta para acumular cashback"}
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm font-light leading-6 text-slate-600">
                      {cashbackBloqueadoMotivo
                        ? `Cashback indisponível: ${cashbackBloqueadoMotivo}.`
                        : "O cashback fica previsto no pedido e é liberado após confirmação do pagamento."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between gap-4 border border-[var(--brand-blue)] bg-white px-4 py-3 text-sm">
                    <span className="font-medium text-[var(--brand-blue)]">
                      Cashback previsto
                    </span>

                    <span className="text-base font-semibold text-[var(--brand-blue)]">
                      {cashbackBloqueado
                        ? "R$ 0,00"
                        : `${moeda(cashbackPrevisto)} (${cashbackPercentualEstimado}%)`}
                    </span>
                  </div>

                  {clienteLogado && (
                    <div className="flex items-center justify-between gap-4 border border-slate-200 bg-white px-4 py-3 text-sm">
                      <span className="font-medium text-slate-600">
                        Usando cashback
                      </span>

                      <span className="text-base font-semibold text-slate-950">
                        -{moeda(cashbackUsado)}
                      </span>
                    </div>
                  )}
                </div>

                {clienteLogado ? (
                  <div className="mt-5 border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <Wallet className="mt-0.5 h-5 w-5 text-[var(--brand-blue)]" />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold text-slate-950">
                            Usar cashback neste pedido
                          </p>

                          <p className="text-xs text-slate-500">
                            Disponível: {moeda(cashbackSaldoDisponivel)}
                          </p>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <input
                            value={cashbackUsoInput}
                            onChange={(event) =>
                              atualizarCashbackUso(event.target.value)
                            }
                            placeholder="Ex: 20,00"
                            className="h-10 border border-slate-300 px-3 text-sm outline-none transition focus:border-[var(--brand-blue)]"
                          />

                          <button
                            type="button"
                            onClick={usarCashbackTotal}
                            disabled={cashbackMaximoUsavel <= 0}
                            className="h-10 border border-[var(--brand-blue)] bg-white px-4 text-sm font-medium text-[var(--brand-blue)] transition hover:bg-[var(--brand-blue-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Usar máximo
                          </button>

                          <button
                            type="button"
                            onClick={removerCashback}
                            disabled={cashbackUsado <= 0}
                            className="h-10 border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </div>

                        {erroCashback && (
                          <p className="mt-2 text-xs text-red-700">
                            {erroCashback}
                          </p>
                        )}

                        {cashbackUsado > 0 && (
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            O novo cashback será calculado apenas sobre o valor
                            restante após o uso do saldo.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModoCheckout("SEM_CADASTRO")}
                      className={`border px-4 py-4 text-left transition ${
                        modoCheckout === "SEM_CADASTRO"
                          ? "border-slate-950 bg-white text-slate-950 shadow-sm"
                          : "border-slate-200 bg-white/70 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      <p className="text-sm font-medium">Comprar sem cadastro</p>
                      <p className="mt-2 text-sm font-light leading-6 text-slate-500">
                        Finalize rapidamente informando seus dados de contato e
                        entrega.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModoCheckout("COM_CADASTRO")}
                      className={`relative overflow-hidden border px-4 py-4 text-left transition ${
                        modoCheckout === "COM_CADASTRO"
                          ? "border-[var(--brand-blue)] bg-white text-slate-950 shadow-md"
                          : "brand-border bg-white text-slate-700 hover:border-[var(--brand-blue)]"
                      }`}
                    >
                      <div className="absolute right-3 top-3 flex items-center gap-1 brand-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                        <Gift className="h-3.5 w-3.5" />
                        Conta
                      </div>

                      <p className="pr-24 text-base font-semibold brand-text">
                        Criar cadastro
                      </p>

                      <p className="mt-2 text-sm font-light leading-6 text-slate-600">
                        Crie uma conta para acompanhar pedidos e facilitar o uso
                        do cashback nas próximas compras.
                      </p>
                    </button>
                  </div>
                )}
              </section>

              <section className="border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-medium text-slate-950">
                  Cupom de desconto
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={codigoCupom}
                    onChange={(event) =>
                      setCodigoCupom(event.target.value.toUpperCase())
                    }
                    disabled={Boolean(cupomAplicado)}
                    placeholder="Digite seu cupom"
                    className="h-11 border border-slate-300 px-3 text-sm uppercase outline-none focus:border-[var(--brand-blue)] disabled:bg-slate-100"
                  />

                  {cupomAplicado ? (
                    <button
                      type="button"
                      onClick={removerCupom}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                      Remover
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={aplicarCupom}
                      disabled={validandoCupom}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Tag className="h-4 w-4" />
                      {validandoCupom ? "Validando..." : "Aplicar"}
                    </button>
                  )}
                </div>

                {cupomAplicado && (
                  <div className="mt-3 flex items-start justify-between gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <div>
                      <p className="font-semibold">
                        {cupomAplicado.codigo} aplicado
                      </p>

                      <p className="mt-1 text-xs leading-5">
                        {formatarTipoCupom(cupomAplicado)}
                        {cupomAplicado.bloqueiaCashback
                          ? " · Este cupom bloqueia cashback."
                          : ""}
                      </p>
                    </div>

                    <strong>-{moeda(cupomAplicado.descontoValor)}</strong>
                  </div>
                )}

                {erroCupom && (
                  <div className="mt-3 flex gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{erroCupom}</p>
                  </div>
                )}
              </section>

              <section className="border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-slate-950">
                      Dados do cliente
                    </h2>

                    {clienteLogado && (
                      <p className="mt-1 text-sm text-slate-500">
                        Dados preenchidos com sua conta Stella.
                      </p>
                    )}
                  </div>

                  {clienteLogado && (
                    <button
                      type="button"
                      onClick={preencherDadosClienteLogado}
                      className="text-sm font-medium text-[var(--brand-blue)] underline underline-offset-4"
                    >
                      Recarregar dados da conta
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Nome
                    </span>

                    <input
                      value={form.nomeCliente}
                      onChange={(event) =>
                        atualizarCampo("nomeCliente", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Telefone/WhatsApp
                    </span>

                    <input
                      value={form.telefoneCliente}
                      onChange={(event) =>
                        atualizarCampo("telefoneCliente", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      E-mail{" "}
                      {criarCadastroNoCheckout || clienteLogado
                        ? ""
                        : "opcional"}
                    </span>

                    <input
                      value={form.emailCliente}
                      onChange={(event) =>
                        atualizarCampo("emailCliente", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      CPF{" "}
                      {criarCadastroNoCheckout || clienteLogado
                        ? ""
                        : "opcional"}
                    </span>

                    <input
                      value={form.documento}
                      onChange={(event) =>
                        atualizarCampo("documento", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>
                </div>

                {criarCadastroNoCheckout && (
                  <div className="mt-5 grid gap-4 rounded-2xl brand-badge p-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Senha
                      </span>

                      <input
                        type="password"
                        value={form.senha}
                        onChange={(event) =>
                          atualizarCampo("senha", event.target.value)
                        }
                        className="h-11 w-full border brand-border bg-white px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Confirmar senha
                      </span>

                      <input
                        type="password"
                        value={form.confirmarSenha}
                        onChange={(event) =>
                          atualizarCampo("confirmarSenha", event.target.value)
                        }
                        className="h-11 w-full border brand-border bg-white px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                      />
                    </label>
                  </div>
                )}

                <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  <input
                    type="checkbox"
                    checked={consentimentoWhatsapp}
                    onChange={(event) =>
                      setConsentimentoWhatsapp(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-blue)]"
                  />

                  <span>
                    Tambem quero receber novidades e ofertas pelo WhatsApp neste
                    numero.
                    {!clienteLogado && !criarCadastroNoCheckout && (
                      <span className="block text-xs leading-5 text-slate-500">
                        Em compra sem cadastro, esta preferencia nao sera salva
                        para campanhas futuras.
                      </span>
                    )}
                  </span>
                </label>
              </section>

              <section className="border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-medium text-slate-950">
                  Endereço de entrega
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  CEP
                </span>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={form.cep}
                    onChange={(event) => atualizarCampo("cep", event.target.value)}
                    placeholder="00000-000"
                    className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                  />

                  <button
                    type="button"
                    onClick={() => buscarEnderecoPorCep()}
                    disabled={buscandoCep}
                    className="inline-flex h-11 items-center justify-center border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {buscandoCep ? "Buscando..." : "Buscar"}
                  </button>
                </div>

                {erroCep && (
                  <p className="mt-2 text-xs text-red-700">
                    {erroCep}
                  </p>
                )}
              </div>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Rua
                    </span>

                    <input
                      value={form.rua}
                      onChange={(event) =>
                        atualizarCampo("rua", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Número
                    </span>

                    <input
                      value={form.numero}
                      onChange={(event) =>
                        atualizarCampo("numero", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Complemento
                    </span>

                    <input
                      value={form.complemento}
                      onChange={(event) =>
                        atualizarCampo("complemento", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Bairro
                    </span>

                    <input
                      value={form.bairro}
                      onChange={(event) =>
                        atualizarCampo("bairro", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Cidade
                    </span>

                    <input
                      value={form.cidade}
                      onChange={(event) =>
                        atualizarCampo("cidade", event.target.value)
                      }
                      className="h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Estado
                    </span>

                    <input
                      value={form.estado}
                      onChange={(event) =>
                        atualizarCampo("estado", event.target.value.toUpperCase())
                      }
                      maxLength={2}
                      placeholder="UF"
                      className="h-11 w-full border border-slate-300 px-3 text-sm uppercase outline-none focus:border-[var(--brand-blue)]"
                    />
                  </label>
                </div>

                <div className="mt-5 border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-semibold text-slate-950">
                          Frete
                        </h3>

                        {cotandoFrete && (
                          <span className="text-xs font-medium text-slate-500">
                            Cotando...
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Informe um CEP válido para ver entrega ou retirada
                        disponíveis.
                      </p>

                      {erroFrete && (
                        <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                          {erroFrete}
                        </div>
                      )}

                      {opcoesFrete.length > 0 && (
                        <div className="mt-3 grid gap-2">
                          {opcoesFrete.map((opcao) => {
                            const selecionada =
                              freteSelecionadoId === opcao.id && !opcao.erro;

                            return (
                              <label
                                key={opcao.id}
                                className={`flex cursor-pointer items-start gap-3 border bg-white px-3 py-3 text-sm transition ${
                                  selecionada
                                    ? "border-[var(--brand-blue)] ring-1 ring-[var(--brand-blue)]"
                                    : opcao.erro
                                    ? "border-red-200 opacity-70"
                                    : "border-slate-200 hover:border-slate-400"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="frete"
                                  value={opcao.id}
                                  checked={selecionada}
                                  disabled={Boolean(opcao.erro)}
                                  onChange={() =>
                                    setFreteSelecionadoId(opcao.id)
                                  }
                                  className="mt-1 h-4 w-4"
                                />

                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium text-slate-950">
                                    {opcao.tipoEntrega === "RETIRADA"
                                      ? "Retirada local"
                                      : `${opcao.transportadora} - ${opcao.nome}`}
                                  </span>

                                  {opcao.erro ? (
                                    <span className="mt-1 block text-xs text-red-700">
                                      {opcao.erro}
                                    </span>
                                  ) : (
                                    <span className="mt-1 block text-xs text-slate-500">
                                      {opcao.tipoEntrega === "RETIRADA"
                                        ? opcao.descricao
                                        : opcao.prazoDias !== null
                                        ? `${opcao.prazoDias} dia${
                                            opcao.prazoDias === 1 ? "" : "s"
                                          }`
                                        : "Prazo indisponível"}
                                    </span>
                                  )}
                                </span>

                                {!opcao.erro && (
                                  <span className="shrink-0 font-semibold text-slate-950">
                                    {moeda(opcao.valor)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Observações
                  </span>

                  <textarea
                    value={form.observacoes}
                    onChange={(event) =>
                      atualizarCampo("observacoes", event.target.value)
                    }
                    rows={4}
                    className="w-full border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[var(--brand-blue)]"
                  />
                </label>
              </section>
            </div>

            <aside className="h-fit border border-slate-200 bg-white p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-medium text-slate-950">
                Resumo do pedido
              </h2>

              <div className="mt-5 space-y-4">
                {itens.map((item) => {
                  const desconto = getDescontoPercentual(item);
                  const totalAdicional = getTotalAdicionalItem(item);
                  const totalEmbalagemPresente =
                    getTotalEmbalagemPresenteItem(item);
                  const totalItem = getTotalItem(item);

                  return (
                    <div
                      key={getItemKey(item)}
                      className="grid grid-cols-[64px_1fr] gap-3 border-b border-slate-100 pb-4 last:border-b-0"
                    >
                    <div className="relative">
                      <ImageBox src={item.imagemUrl} alt={item.nome} />

                      <div className="pointer-events-none absolute inset-0 bg-black/5" />

                      {desconto !== null && (
                          <div className="absolute right-1 top-1 bg-slate-950 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            -{desconto}%
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-slate-950">
                          {item.nome}
                        </p>

                        <p className="mt-1 text-xs font-light text-slate-500">
                          {item.quantidade} un.
                        </p>

                        {getTextoOpcaoProduto(item) && (
                          <p className="mt-1 text-xs font-light text-slate-500">
                            Opção:{" "}
                            <span className="font-medium text-slate-700">
                              {getTextoOpcaoProduto(item)}
                            </span>
                          </p>
                        )}

                        <p className="mt-1 text-sm font-medium text-slate-950">
                          {moeda(totalItem)}
                        </p>

                        {item.opcaoAdicional && (
                          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-xs font-medium text-slate-800">
                              {item.opcaoAdicional.nome}
                            </p>

                            <p className="mt-1 text-xs font-light text-slate-500">
                              + {moeda(totalAdicional)}
                            </p>
                          </div>
                        )}

                        {item.embalagemPresenteModeloId && (
                          <div className="mt-2 border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-3 py-2">
                            <div className="flex items-start gap-2">
                              <div className="h-11 w-11 shrink-0 border border-white/70 [&>div]:h-full [&>div]:w-full [&>div]:rounded-none">
                                <ImageBox
                                  src={item.embalagemPresenteImagemUrl}
                                  alt={
                                    item.embalagemPresenteNome ||
                                    "Embalagem para presente"
                                  }
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-medium uppercase tracking-[0.14em] brand-text">
                                  Embalagem presente
                                </p>

                                <p className="mt-0.5 text-xs font-medium text-slate-800">
                                  {item.embalagemPresenteNome ||
                                    "Embalagem para presente"}
                                </p>

                                <p className="mt-1 text-xs font-light text-slate-500">
                                  + {moeda(totalEmbalagemPresente)}
                                </p>

                                {item.embalagemPresenteMensagem && (
                                  <p className="mt-1 text-xs font-light leading-5 text-slate-600">
                                    Mensagem: &quot;
                                    {item.embalagemPresenteMensagem}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-light text-slate-500">Itens</span>
                  <span className="font-medium text-slate-950">
                    {quantidadeTotal}
                  </span>
                </div>

                {economia > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-light text-slate-500">Economia</span>
                    <span className="font-medium text-emerald-700">
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
                    Total calculado com as embalagens presente selecionadas por
                    item.
                  </p>
                )}

                {cupomAplicado && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-light text-slate-500">
                      Cupom {cupomAplicado.codigo}
                    </span>
                    <span className="font-medium text-emerald-700">
                      -{moeda(descontoCupom)}
                    </span>
                  </div>
                )}

                {cashbackUsado > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-light text-slate-500">
                      Cashback usado
                    </span>
                    <span className="font-medium text-blue-700">
                      -{moeda(cashbackUsado)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="font-light text-slate-500">Frete</span>
                  <span className="font-medium text-slate-950">
                    {freteSelecionado ? moeda(valorFrete) : "Selecione"}
                  </span>
                </div>

                {freteSelecionado && (
                  <p className="text-right text-xs text-slate-500">
                    {freteSelecionado.transportadora} - {freteSelecionado.nome}
                    {freteSelecionado.prazoDias !== null
                      ? ` · ${freteSelecionado.prazoDias} dia${
                          freteSelecionado.prazoDias === 1 ? "" : "s"
                        }`
                      : ""}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-base font-medium text-slate-950">
                    Total
                  </span>

                  <span className="text-xl font-light text-slate-950">
                    {moeda(totalPedido)}
                  </span>
                </div>
              </div>

              <div
                className={`mt-5 border px-4 py-3 text-sm leading-6 ${
                  cashbackBloqueado
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Gift className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>
                    {cashbackBloqueado ? (
                      <>
                        Cashback indisponível
                        {cashbackBloqueadoMotivo
                          ? `: ${cashbackBloqueadoMotivo}.`
                          : "."}
                      </>
                    ) : (
                      <>
                        Cashback acumulativo previsto:{" "}
                        <strong>{moeda(cashbackPrevisto)}</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {quantidadeItensComDesconto > 0 && (
                <div className="mt-4 border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                  Este pedido possui {quantidadeItensComDesconto} produto
                  {quantidadeItensComDesconto > 1 ? "s" : ""} em desconto.
                </div>
              )}

              {erro && (
                <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <button
                type="button"
                onClick={finalizarPedido}
                disabled={
                  salvando || itens.length === 0 || cotandoFrete || !freteSelecionado
                }
                className="mt-5 w-full brand-button px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {salvando ? "Criando pedido..." : "Prosseguir para pagamento"}
              </button>

            <p className="mt-3 text-xs font-light leading-5 text-slate-500">
              Ao prosseguir, seu pedido será registrado e você seguirá para a etapa de
              pagamento.
            </p>
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
