"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageIcon, Plus, Trash2, Truck, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type ClienteBusca = {
  id: string;
  codigo: string;
  nome: string;
  documento: string;
  telefone?: string | null;
  email?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
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

type MedidaDisponivel = {
  valor: string;
  label: string;
  estoqueDisponivel: number;
  imagemUrl?: string | null;
};

type FreteOpcaoVenda = {
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

type ModalidadeEntregaManual =
  | "SEM_ENTREGA"
  | "MELHOR_ENVIO"
  | "RETIRADA_COMBINADA"
  | "ENTREGA_MANUAL"
  | "ENTREGA_LOCAL"
  | "CIDADE_PROXIMA";

type EnderecoEntrega = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type OrigemEntregaManualInfo = {
  id: string;
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado?: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  observacao: string | null;
  padrao: boolean;
  ativo: boolean;
  resumo: string;
  completo: boolean;
  origemSistema?: boolean;
};

const MODALIDADES_ENTREGA_MANUAL: {
  value: ModalidadeEntregaManual;
  label: string;
  descricao: string;
}[] = [
  {
    value: "SEM_ENTREGA",
    label: "Sem entrega",
    descricao: "Venda sem logistica vinculada ao pedido.",
  },
  {
    value: "RETIRADA_COMBINADA",
    label: "Retirada",
    descricao: "Sem frete. O operador combina a retirada com o cliente.",
  },
  {
    value: "ENTREGA_MANUAL",
    label: "Entrega manual",
    descricao: "Entrega propria com rota aberta no Google Maps.",
  },
  {
    value: "MELHOR_ENVIO",
    label: "Melhor Envio",
    descricao: "Cotacao e etiqueta pelo fluxo logistico atual.",
  },
];

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
  variacoes?: ProdutoVariacaoVenda[];
  tamanhoAnel: string;
}) {
  if (!produtoTemMedidas(item)) {
    return item.estoqueAtual;
  }

  const tamanho = normalizarTamanhoAnel(item.tamanhoAnel);

  if (!tamanho) {
    return 0;
  }

  const estoquePorTamanho =
    item.estoquesPorTamanho.find(
      (estoque) => normalizarTamanhoAnel(estoque.tamanhoAnel) === tamanho,
    )?.quantidadeAtual ?? null;

  if (estoquePorTamanho !== null) {
    return estoquePorTamanho;
  }

  const medidaPorVariacao = getOpcoesVariacaoAtivas(item).some(
    (opcao) => normalizarTamanhoAnel(opcao.nome) === tamanho,
  );

  return medidaPorVariacao ? item.estoqueAtual : 0;
}

function getOpcoesVariacaoAtivas(produto: {
  variacoes?: ProdutoVariacaoVenda[];
}) {
  return (produto.variacoes || []).flatMap((variacao) =>
    variacao.opcoes
      .filter((opcao) => opcao.ativo !== false)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)),
  );
}

function produtoTemMedidas(produto: {
  categoria: string;
  estoqueAtual: number;
  estoquesPorTamanho: EstoquePorTamanho[];
  variacoes?: ProdutoVariacaoVenda[];
}) {
  const temEstoquePorMedida = produto.estoquesPorTamanho.some(
    (estoque) =>
      normalizarTamanhoAnel(estoque.tamanhoAnel) !== "UNICO" &&
      estoque.quantidadeAtual > 0,
  );

  if (temEstoquePorMedida) {
    return true;
  }

  const temVariacaoAtiva =
    produto.estoqueAtual > 0 &&
    getOpcoesVariacaoAtivas(produto).some(
      (opcao) => normalizarTamanhoAnel(opcao.nome) !== "UNICO",
    );

  return temVariacaoAtiva || produtoEhAnel(produto);
}

function getMedidasDisponiveis(produto: ProdutoBusca): MedidaDisponivel[] {
  const opcoesVariacao = getOpcoesVariacaoAtivas(produto);

  const medidasPorEstoque = produto.estoquesPorTamanho
    .filter(
      (estoque) =>
        normalizarTamanhoAnel(estoque.tamanhoAnel) !== "UNICO" &&
        estoque.quantidadeAtual > 0,
    )
    .map((estoque) => {
      const valor = normalizarTamanhoAnel(estoque.tamanhoAnel);
      const opcaoVariacao = opcoesVariacao.find(
        (opcao) => normalizarTamanhoAnel(opcao.nome) === valor,
      );

      return {
        valor,
        label: opcaoVariacao?.nome || estoque.tamanhoAnel,
        estoqueDisponivel: estoque.quantidadeAtual,
        imagemUrl: opcaoVariacao?.imagemUrl || null,
      };
    });

  if (medidasPorEstoque.length > 0) {
    return medidasPorEstoque;
  }

  if (produto.estoqueAtual <= 0) {
    return [];
  }

  return opcoesVariacao
    .filter((opcao) => normalizarTamanhoAnel(opcao.nome) !== "UNICO")
    .map((opcao) => ({
      valor: normalizarTamanhoAnel(opcao.nome),
      label: opcao.nome,
      estoqueDisponivel: produto.estoqueAtual,
      imagemUrl: opcao.imagemUrl || null,
    }));
}

function getTamanhosDisponiveis(produto: ProdutoBusca) {
  return getMedidasDisponiveis(produto).map((medida) => ({
    tamanhoAnel: medida.valor,
    quantidadeAtual: medida.estoqueDisponivel,
    label: medida.label,
  }));
}

function getLabelMedida(produto: { categoria: string }) {
  return produtoEhAnel(produto) ? "Tamanho" : "Medida";
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
        normalizarTamanhoAnel(opcaoVariacao.nome) === tamanho,
    );

    if (opcao) {
      return opcao;
    }
  }

  return null;
}

function getImagemProduto(item: ProdutoBusca | ItemPedido) {
  if ("itemKey" in item) {
    return (
      getOpcaoVariacaoSelecionada(item)?.imagemUrl || item.imagemUrl || null
    );
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

function normalizarTelefoneWhatsApp(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

function normalizarCep(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "");
}

function labelModalidadeEntrega(value: ModalidadeEntregaManual) {
  const normalizada =
    value === "CIDADE_PROXIMA" || value === "ENTREGA_LOCAL"
      ? "ENTREGA_MANUAL"
      : value;

  return (
    MODALIDADES_ENTREGA_MANUAL.find(
      (modalidade) => modalidade.value === normalizada,
    )
      ?.label || "Entrega"
  );
}

function numeroInputOuNull(value: string) {
  if (!String(value || "").trim()) {
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function coordenadaInputOuNull(value: string, min: number, max: number) {
  if (!String(value || "").trim()) {
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function temCoordenadas(
  endereco?: { latitude?: unknown; longitude?: unknown } | null,
) {
  const latitude = Number(endereco?.latitude);
  const longitude = Number(endereco?.longitude);

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function linkCompacto(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}/...`;
  } catch {
    return url;
  }
}

function resumoCurtoEndereco(endereco?: Partial<EnderecoEntrega> | null) {
  if (!endereco) {
    return "";
  }

  return [endereco.cidade, endereco.estado, endereco.cep]
    .filter(Boolean)
    .join(" / ");
}

function enderecoCompletoParaMaps(endereco?: Partial<EnderecoEntrega> | null) {
  return Boolean(
    endereco &&
      normalizarCep(endereco.cep).length === 8 &&
      String(endereco.rua || "").trim() &&
      String(endereco.numero || "").trim() &&
      String(endereco.bairro || "").trim() &&
      String(endereco.cidade || "").trim() &&
      String(endereco.estado || "").trim().length === 2,
  );
}

function enderecoParaMaps(endereco: Partial<EnderecoEntrega>) {
  return [
    endereco.rua,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    normalizarCep(endereco.cep),
    "Brasil",
  ]
    .map((parte) => String(parte || "").trim())
    .filter(Boolean)
    .join(", ");
}

function origemParaMaps(endereco: Partial<EnderecoEntrega>) {
  return temCoordenadas(endereco)
    ? `${Number(endereco.latitude)},${Number(endereco.longitude)}`
    : enderecoParaMaps(endereco);
}

function montarGoogleMapsUrl(
  origem?: Partial<EnderecoEntrega> | null,
  destino?: Partial<EnderecoEntrega> | null,
) {
  if (!enderecoCompletoParaMaps(origem) || !enderecoCompletoParaMaps(destino)) {
    return "";
  }

  const params = new URLSearchParams({
    api: "1",
    origin: origemParaMaps(origem!),
    destination: enderecoParaMaps(destino!),
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function origemParaEndereco(
  origem?: OrigemEntregaManualInfo | null,
): Partial<EnderecoEntrega> | null {
  if (!origem) {
    return null;
  }

  return {
    cep: origem.cep,
    rua: origem.rua,
    numero: origem.numero,
    complemento: origem.complemento || "",
    bairro: origem.bairro,
    cidade: origem.cidade,
    estado: origem.uf || origem.estado || "",
    latitude: origem.latitude,
    longitude: origem.longitude,
  };
}

function numeroParaCampo(value: unknown) {
  const numero =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);

  return Number.isFinite(numero) ? numero.toFixed(2).replace(".", ",") : "";
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
  const [produtoMedidaSelecionado, setProdutoMedidaSelecionado] =
    useState<ProdutoBusca | null>(null);
  const [medidaSelecionada, setMedidaSelecionada] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState("");
  const [tipoFinalizacao, setTipoFinalizacao] = useState<
    "PAGO_AGORA" | "PAGAR_ONLINE"
  >("PAGO_AGORA");
  const [gerandoLinkPagamento, setGerandoLinkPagamento] = useState(false);
  const [erroPagamento, setErroPagamento] = useState("");
  const [modalLinkPagamentoAberto, setModalLinkPagamentoAberto] =
    useState(false);
  const [linkPagamento, setLinkPagamento] = useState<{
    url: string;
    pedidoCodigo: string;
    assinatura: string;
  } | null>(null);
  const [enviarEntrega, setEnviarEntrega] = useState(false);
  const [modalEntregaAberto, setModalEntregaAberto] = useState(false);
  const [modalidadeEntrega, setModalidadeEntrega] =
    useState<ModalidadeEntregaManual>("SEM_ENTREGA");
  const [usarEnderecoCliente, setUsarEnderecoCliente] = useState(false);
  const [entrega, setEntrega] = useState({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [buscandoCepEntrega, setBuscandoCepEntrega] = useState(false);
  const [ultimoCepEntregaBuscado, setUltimoCepEntregaBuscado] = useState("");
  const [origemEntregaManual, setOrigemEntregaManual] =
    useState<OrigemEntregaManualInfo | null>(null);
  const [origensEntregaManual, setOrigensEntregaManual] = useState<
    OrigemEntregaManualInfo[]
  >([]);
  const [origemSelecionadaId, setOrigemSelecionadaId] = useState("");
  const [seletorOrigemAberto, setSeletorOrigemAberto] = useState(false);
  const [gerenciarOrigensAberto, setGerenciarOrigensAberto] = useState(false);
  const [salvandoOrigemManual, setSalvandoOrigemManual] = useState(false);
  const [origemEditandoId, setOrigemEditandoId] = useState<string | null>(null);
  const [buscandoCepOrigem, setBuscandoCepOrigem] = useState(false);
  const [origemForm, setOrigemForm] = useState({
    nome: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    latitude: "",
    longitude: "",
    observacao: "",
    padrao: false,
  });
  const [carregandoOrigemEntrega, setCarregandoOrigemEntrega] =
    useState(false);
  const [calculandoEntregaManual, setCalculandoEntregaManual] =
    useState(false);
  const [statusCalculoEntrega, setStatusCalculoEntrega] = useState(
    "Preencha CEP e número.",
  );
  const [configCalculoAberta, setConfigCalculoAberta] = useState(false);
  const [valorManualEditado, setValorManualEditado] = useState(false);
  const [entregaManual, setEntregaManual] = useState({
    valorManual: "",
    origemResumo: "",
    destinoResumo: "",
    mapsUrl: "",
    distanciaIdaKm: "",
    distanciaTotalKm: "",
    duracaoTexto: "",
    duracaoMinutos: "",
    consumoKmPorLitro: "16",
    precoCombustivel: "6",
    litrosEstimados: "",
    custoCombustivel: "",
    margemPercentual: "15",
    valorComMargem: "",
    taxaFixa: "0",
    valorMinimo: "0",
    valorSugerido: "",
    providerDistancia: "",
    calculoAutomatico: false,
    origemEnderecoFormatado: "",
    destinoEnderecoFormatado: "",
    origemCoordenadas: null as { latitude: number; longitude: number } | null,
    destinoCoordenadas: null as { latitude: number; longitude: number } | null,
    precisaoOrigem: "",
    precisaoDestino: "",
    origemEncontrada: "",
    destinoEncontrado: "",
    origemCoordenadaFixa: false,
    erroOrigemLocalizacao: false,
    erroCalculo: "",
    observacaoManual: "",
  });
  const [opcoesFrete, setOpcoesFrete] = useState<FreteOpcaoVenda[]>([]);
  const [freteSelecionadoId, setFreteSelecionadoId] = useState("");
  const [cotandoFrete, setCotandoFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState("");
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
      clientesDisponiveis.find(
        (cliente) => cliente.id === clienteSelecionadoId,
      ) || null
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

  const assinaturaPagamento = useMemo(() => {
    return JSON.stringify({
      clienteId: clienteSelecionadoId,
      meioVenda,
      descontoNumero,
      enviarEntrega,
      modalidadeEntrega,
      entrega,
      entregaManual,
      freteSelecionadoId,
      itens: itensPedido.map((item) => ({
        id: item.id,
        quantidade: item.quantidade,
        tamanhoAnel: item.tamanhoAnel,
      })),
    });
  }, [
    clienteSelecionadoId,
    descontoNumero,
    entrega,
    entregaManual,
    enviarEntrega,
    freteSelecionadoId,
    itensPedido,
    meioVenda,
    modalidadeEntrega,
  ]);

  const linkPagamentoDesatualizado =
    Boolean(linkPagamento) && linkPagamento?.assinatura !== assinaturaPagamento;

  function limparFreteCotado() {
    setFreteSelecionadoId("");
    setOpcoesFrete([]);
    setErroFrete("");
  }

  function adicionarProduto(produto: ProdutoBusca) {
    setErro("");
    limparFreteCotado();

    if (produto.estoqueAtual <= 0) {
      setErro(`O produto ${produto.nome} está sem saldo no estoque.`);
      return;
    }

    if (produtoTemMedidas(produto)) {
      const medidasDisponiveis = getMedidasDisponiveis(produto);

      if (medidasDisponiveis.length === 0) {
        setErro(`O produto ${produto.nome} não possui medidas disponíveis.`);
        return;
      }

      setProdutoMedidaSelecionado(produto);
      setMedidaSelecionada("");
      return;
    }

    setItensPedido((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id && !produtoTemMedidas(item),
      );

      if (existente) {
        if (existente.quantidade + 1 > produto.estoqueAtual) {
          setErro(
            `Não é possível adicionar mais unidades de ${produto.nome}. Saldo atual: ${produto.estoqueAtual}.`,
          );
          return atual;
        }

        return atual.map((item) =>
          item.itemKey === existente.itemKey
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
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

  function fecharModalMedida() {
    setProdutoMedidaSelecionado(null);
    setMedidaSelecionada("");
  }

  function confirmarAdicionarProdutoComMedida() {
    if (!produtoMedidaSelecionado || !medidaSelecionada) {
      return;
    }

    limparFreteCotado();

    const medidaNormalizada = normalizarTamanhoAnel(medidaSelecionada);
    const medida = getMedidasDisponiveis(produtoMedidaSelecionado).find(
      (opcao) => opcao.valor === medidaNormalizada,
    );

    if (!medida) {
      setErro("Escolha uma medida disponível para adicionar o produto.");
      return;
    }

    setErro("");
    setItensPedido((atual) => [
      ...atual,
      {
        ...produtoMedidaSelecionado,
        itemKey: gerarItemKey(produtoMedidaSelecionado.id, medida.valor),
        quantidade: 1,
        tamanhoAnel: medida.valor,
      },
    ]);
    fecharModalMedida();
  }

  function alterarQuantidade(itemKey: string, quantidade: number) {
    setErro("");
    limparFreteCotado();

    if (quantidade <= 0) return;

    setItensPedido((atual) =>
      atual.map((item) => {
        if (item.itemKey !== itemKey) return item;

        const estoqueDisponivel = getEstoqueDisponivel(item);

        if (quantidade > estoqueDisponivel) {
          setErro(
            produtoTemMedidas(item)
              ? `A quantidade de ${item.nome} medida ${item.tamanhoAnel} não pode ser maior que o estoque atual (${estoqueDisponivel}).`
              : `A quantidade de ${item.nome} não pode ser maior que o estoque atual (${estoqueDisponivel}).`,
          );
          return item;
        }

        return { ...item, quantidade };
      }),
    );
  }

  function alterarTamanhoAnel(itemKey: string, tamanho: string) {
    setErro("");
    limparFreteCotado();

    setItensPedido((atual) =>
      atual.map((item) => {
        if (item.itemKey !== itemKey) return item;

        const tamanhoNormalizado = normalizarTamanhoAnel(tamanho);

        const medidaNova = getMedidasDisponiveis(item).find(
          (medida) => medida.valor === tamanhoNormalizado,
        );
        const estoqueNovoTamanho = medidaNova?.estoqueDisponivel ?? 0;

        return {
          ...item,
          tamanhoAnel: tamanhoNormalizado,
          quantidade:
            item.quantidade > estoqueNovoTamanho
              ? Math.max(estoqueNovoTamanho, 1)
              : item.quantidade,
        };
      }),
    );
  }

  function removerItem(itemKey: string) {
    setErro("");
    limparFreteCotado();
    setItensPedido((atual) => atual.filter((item) => item.itemKey !== itemKey));
  }

  function valorUnitarioFinal(item: ItemPedido) {
    return item.precoVenda * (1 - descontoNumero / 100);
  }

  const subtotal = useMemo(() => {
    return itensPedido.reduce(
      (acc, item) => acc + item.precoVenda * item.quantidade,
      0,
    );
  }, [itensPedido]);

  const valorDesconto = useMemo(() => {
    return subtotal * (descontoNumero / 100);
  }, [subtotal, descontoNumero]);

  const subtotalComDesconto = useMemo(() => {
    return subtotal - valorDesconto;
  }, [subtotal, valorDesconto]);

  const freteSelecionado = useMemo(() => {
    return (
      opcoesFrete.find(
        (opcao) => opcao.id === freteSelecionadoId && !opcao.erro,
      ) || null
    );
  }, [freteSelecionadoId, opcoesFrete]);

  const modalidadeEntregaNormalizada =
    modalidadeEntrega === "CIDADE_PROXIMA" ||
    modalidadeEntrega === "ENTREGA_LOCAL"
      ? "ENTREGA_MANUAL"
      : modalidadeEntrega;

  const valorEntregaManual = numeroInputOuNull(entregaManual.valorManual) ?? 0;
  const origemEntregaEndereco = origemParaEndereco(origemEntregaManual);

  const origemEntregaResumo =
    origemEntregaManual?.resumo ||
    entregaManual.origemResumo ||
    "Endereço de despacho configurado";
  const origemEntregaResumoCurto =
    resumoCurtoEndereco(origemEntregaEndereco) || origemEntregaResumo;

  const valorFrete = !enviarEntrega
    ? 0
    : modalidadeEntregaNormalizada === "MELHOR_ENVIO"
      ? Number(freteSelecionado?.valor || 0)
      : modalidadeEntregaNormalizada === "RETIRADA_COMBINADA"
        ? 0
        : valorEntregaManual;

  const totalFinal = useMemo(() => {
    return subtotalComDesconto + valorFrete;
  }, [subtotalComDesconto, valorFrete]);

  const totalItens = useMemo(() => {
    return itensPedido.reduce((acc, item) => acc + item.quantidade, 0);
  }, [itensPedido]);

  const clienteTemEndereco = Boolean(
    clienteSelecionado &&
      (clienteSelecionado.cep ||
        clienteSelecionado.rua ||
        clienteSelecionado.cidade),
  );
  const enderecoEntregaResumo =
    [
      entrega.rua,
      entrega.numero,
      entrega.bairro,
      entrega.cidade,
      entrega.estado,
    ]
      .filter(Boolean)
      .join(", ") || entrega.cep || "";
  const destinoEntregaResumo =
    entregaManual.destinoResumo || enderecoEntregaResumo;
  const mapsUrlEntregaManual = useMemo(
    () =>
      modalidadeEntregaNormalizada === "ENTREGA_MANUAL"
        ? entregaManual.mapsUrl ||
          montarGoogleMapsUrl(origemParaEndereco(origemEntregaManual), entrega)
        : "",
    [
      entrega,
      entregaManual.mapsUrl,
      modalidadeEntregaNormalizada,
      origemEntregaManual,
    ],
  );
  const mostrarEnderecoEntrega =
    modalidadeEntregaNormalizada === "ENTREGA_MANUAL" ||
    modalidadeEntregaNormalizada === "MELHOR_ENVIO";
  const entregaConfigurada =
    enviarEntrega && modalidadeEntregaNormalizada !== "SEM_ENTREGA";

  function atualizarCampoEntrega(campo: keyof typeof entrega, valor: string) {
    setEntrega((atual) => ({
      ...atual,
      [campo]: campo === "estado" ? valor.toUpperCase().slice(0, 2) : valor,
    }));
    setFreteSelecionadoId("");
    setOpcoesFrete([]);
    setErroFrete("");

    if (campo === "cep") {
      setUltimoCepEntregaBuscado("");
    }

    if (modalidadeEntregaNormalizada === "ENTREGA_MANUAL") {
      setEntregaManual((atual) => ({
        ...atual,
        destinoResumo: "",
        mapsUrl: "",
        distanciaIdaKm: "",
        distanciaTotalKm: "",
        duracaoTexto: "",
        duracaoMinutos: "",
        litrosEstimados: "",
        custoCombustivel: "",
        valorComMargem: "",
        valorSugerido: "",
        providerDistancia: "",
        calculoAutomatico: false,
        origemEnderecoFormatado: "",
        destinoEnderecoFormatado: "",
        origemCoordenadas: null,
        destinoCoordenadas: null,
        precisaoOrigem: "",
        precisaoDestino: "",
        origemEncontrada: "",
        destinoEncontrado: "",
        origemCoordenadaFixa: false,
        erroOrigemLocalizacao: false,
        erroCalculo: "",
      }));
      setStatusCalculoEntrega("Preencha CEP e número.");
    }
  }

  function atualizarCampoEntregaManual(
    campo: keyof typeof entregaManual,
    valor: string | boolean,
  ) {
    setEntregaManual((atual) => ({
      ...atual,
      [campo]: valor,
    }));
    setErroFrete("");
  }

  function atualizarValorCobrado(value: string) {
    setValorManualEditado(true);
    atualizarCampoEntregaManual("valorManual", value);
  }

  function selecionarOrigemEntrega(origem: OrigemEntregaManualInfo) {
    setOrigemEntregaManual(origem);
    setOrigemSelecionadaId(origem.id);
    setSeletorOrigemAberto(false);
    setEntregaManual((atual) => ({
      ...atual,
      origemResumo: origem.resumo,
      mapsUrl: "",
      distanciaIdaKm: "",
      distanciaTotalKm: "",
      duracaoTexto: "",
      duracaoMinutos: "",
      litrosEstimados: "",
      custoCombustivel: "",
      valorComMargem: "",
      valorSugerido: "",
      providerDistancia: "",
      calculoAutomatico: false,
      origemEnderecoFormatado: "",
      destinoEnderecoFormatado: "",
      origemCoordenadas: null,
      destinoCoordenadas: null,
      precisaoOrigem: "",
      precisaoDestino: "",
      origemEncontrada: "",
      destinoEncontrado: "",
      origemCoordenadaFixa: false,
      erroOrigemLocalizacao: false,
      erroCalculo: "",
    }));
    setStatusCalculoEntrega("Preencha CEP e número.");
    setErroFrete("");
  }

  function resetarOrigemForm() {
    setOrigemEditandoId(null);
    setOrigemForm({
      nome: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      latitude: "",
      longitude: "",
      observacao: "",
      padrao: origensEntregaManual.every((origem) => origem.origemSistema),
    });
  }

  function editarOrigemForm(origem: OrigemEntregaManualInfo) {
    if (origem.origemSistema) {
      return;
    }

    setOrigemEditandoId(origem.id);
    setOrigemForm({
      nome: origem.nome || "",
      cep: origem.cep || "",
      rua: origem.rua || "",
      numero: origem.numero || "",
      complemento: origem.complemento || "",
      bairro: origem.bairro || "",
      cidade: origem.cidade || "",
      uf: origem.uf || origem.estado || "",
      latitude:
        origem.latitude === null || typeof origem.latitude === "undefined"
          ? ""
          : String(origem.latitude),
      longitude:
        origem.longitude === null || typeof origem.longitude === "undefined"
          ? ""
          : String(origem.longitude),
      observacao: origem.observacao || "",
      padrao: Boolean(origem.padrao),
    });
    setGerenciarOrigensAberto(true);
  }

  function abrirOrigemSelecionadaParaCoordenadas() {
    if (!origemEntregaManual) {
      setGerenciarOrigensAberto(true);
      return;
    }

    if (!origemEntregaManual.origemSistema) {
      editarOrigemForm(origemEntregaManual);
      return;
    }

    setOrigemEditandoId(null);
    setOrigemForm({
      nome: origemEntregaManual.nome || "Origem",
      cep: origemEntregaManual.cep || "",
      rua: origemEntregaManual.rua || "",
      numero: origemEntregaManual.numero || "",
      complemento: origemEntregaManual.complemento || "",
      bairro: origemEntregaManual.bairro || "",
      cidade: origemEntregaManual.cidade || "",
      uf: origemEntregaManual.uf || origemEntregaManual.estado || "",
      latitude: "",
      longitude: "",
      observacao: origemEntregaManual.observacao || "",
      padrao: true,
    });
    setGerenciarOrigensAberto(true);
  }

  async function buscarCepOrigemManual(cepInformado?: string) {
    const cep = normalizarCep(cepInformado || origemForm.cep);

    if (cep.length !== 8) {
      return;
    }

    setBuscandoCepOrigem(true);
    setErroFrete("");

    try {
      const response = await fetch(`/api/loja/cep?cep=${cep}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.endereco) {
        setErroFrete(data.error || "CEP da origem nao encontrado.");
        return;
      }

      setOrigemForm((atual) => ({
        ...atual,
        cep: data.endereco.cep || cep,
        rua: data.endereco.rua || atual.rua,
        bairro: data.endereco.bairro || atual.bairro,
        cidade: data.endereco.cidade || atual.cidade,
        uf: data.endereco.estado || atual.uf,
      }));
    } catch {
      setErroFrete("Nao foi possivel buscar o CEP da origem.");
    } finally {
      setBuscandoCepOrigem(false);
    }
  }

  async function recarregarOrigensEntrega(selecionarId?: string) {
    const response = await fetch("/api/vendas/entrega-manual/origens", {
      method: "GET",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Erro ao carregar origens.");
    }

    const origens = Array.isArray(data.origens)
      ? (data.origens as OrigemEntregaManualInfo[])
      : [];
    const selecionada =
      origens.find((origem) => origem.id === selecionarId) ||
      (data.selecionada as OrigemEntregaManualInfo | undefined) ||
      origens[0] ||
      null;

    setOrigensEntregaManual(origens);
    if (selecionada) {
      selecionarOrigemEntrega(selecionada);
    }
  }

  async function salvarOrigemManual() {
    setSalvandoOrigemManual(true);
    setErroFrete("");

    try {
      const latitudePreenchida = String(origemForm.latitude || "").trim();
      const longitudePreenchida = String(origemForm.longitude || "").trim();
      const latitude = coordenadaInputOuNull(origemForm.latitude, -90, 90);
      const longitude = coordenadaInputOuNull(origemForm.longitude, -180, 180);

      if (
        (latitudePreenchida || longitudePreenchida) &&
        (latitude === null || longitude === null)
      ) {
        setErroFrete("Informe latitude entre -90 e 90 e longitude entre -180 e 180.");
        return;
      }

      const url = origemEditandoId
        ? `/api/vendas/entrega-manual/origens/${origemEditandoId}`
        : "/api/vendas/entrega-manual/origens";
      const response = await fetch(url, {
        method: origemEditandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...origemForm,
          latitude,
          longitude,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroFrete(data.error || "Erro ao salvar origem.");
        return;
      }

      await recarregarOrigensEntrega(data.origem?.id);
      resetarOrigemForm();
    } catch {
      setErroFrete("Erro ao salvar origem.");
    } finally {
      setSalvandoOrigemManual(false);
    }
  }

  async function removerOrigemManual(origem: OrigemEntregaManualInfo) {
    if (origem.origemSistema) {
      return;
    }

    const confirmado = window.confirm(`Remover a origem ${origem.nome}?`);
    if (!confirmado) {
      return;
    }

    setErroFrete("");

    try {
      const response = await fetch(
        `/api/vendas/entrega-manual/origens/${origem.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroFrete(data.error || "Erro ao remover origem.");
        return;
      }

      await recarregarOrigensEntrega();
      resetarOrigemForm();
    } catch {
      setErroFrete("Erro ao remover origem.");
    }
  }

  function alterarModalidadeEntrega(value: ModalidadeEntregaManual) {
    const normalizada =
      value === "CIDADE_PROXIMA" || value === "ENTREGA_LOCAL"
        ? "ENTREGA_MANUAL"
        : value;

    setModalidadeEntrega(normalizada);
    setEnviarEntrega(normalizada !== "SEM_ENTREGA");
    setUsarEnderecoCliente(false);
    setErroFrete("");
    setFreteSelecionadoId("");
    setOpcoesFrete([]);
  }

  function aplicarEnderecoDoCliente() {
    if (!clienteSelecionado) {
      return;
    }

    setEntrega({
      cep: clienteSelecionado.cep || "",
      rua: clienteSelecionado.rua || "",
      numero: clienteSelecionado.numero || "",
      complemento: clienteSelecionado.complemento || "",
      bairro: clienteSelecionado.bairro || "",
      cidade: clienteSelecionado.cidade || "",
      estado: clienteSelecionado.estado || "",
    });
    setFreteSelecionadoId("");
    setOpcoesFrete([]);
    setErroFrete("");
    setUltimoCepEntregaBuscado("");
  }

  const buscarEnderecoEntregaPorCep = useCallback(
    async (cepInformado?: string) => {
      const cep = normalizarCep(cepInformado || entrega.cep);

      if (!cep || cep.length !== 8 || cep === ultimoCepEntregaBuscado) {
        return;
      }

      setBuscandoCepEntrega(true);
      setErroFrete("");

      try {
        const response = await fetch(`/api/loja/cep?cep=${cep}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.endereco) {
          setErroFrete(data.error || "CEP nao encontrado.");
          setUltimoCepEntregaBuscado(cep);
          return;
        }

        setEntrega((atual) => ({
          ...atual,
          cep: data.endereco.cep || cep,
          rua: data.endereco.rua || atual.rua,
          bairro: data.endereco.bairro || atual.bairro,
          cidade: data.endereco.cidade || atual.cidade,
          estado: data.endereco.estado || atual.estado,
        }));
        setUltimoCepEntregaBuscado(cep);
      } catch {
        setErroFrete("Nao foi possivel buscar o CEP automaticamente.");
      } finally {
        setBuscandoCepEntrega(false);
      }
    },
    [entrega.cep, ultimoCepEntregaBuscado],
  );

  useEffect(() => {
    if (!modalEntregaAberto) {
      return;
    }

    if (
      modalidadeEntregaNormalizada !== "ENTREGA_MANUAL" &&
      modalidadeEntregaNormalizada !== "MELHOR_ENVIO"
    ) {
      return;
    }

    const cep = normalizarCep(entrega.cep);

    if (cep.length !== 8 || cep === ultimoCepEntregaBuscado) {
      return;
    }

    void buscarEnderecoEntregaPorCep(cep);
  }, [
    entrega.cep,
    buscarEnderecoEntregaPorCep,
    modalidadeEntregaNormalizada,
    modalEntregaAberto,
    ultimoCepEntregaBuscado,
  ]);

  useEffect(() => {
    if (
      !modalEntregaAberto ||
      modalidadeEntregaNormalizada !== "ENTREGA_MANUAL" ||
      origemEntregaManual ||
      carregandoOrigemEntrega
    ) {
      return;
    }

    async function carregarOrigem() {
      setCarregandoOrigemEntrega(true);
      setErroFrete("");

      try {
        const response = await fetch("/api/vendas/entrega-manual/origens", {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setErroFrete(data.error || "Erro ao carregar origem da entrega.");
          return;
        }

        const origens = Array.isArray(data.origens)
          ? (data.origens as OrigemEntregaManualInfo[])
          : [];
        const selecionada =
          (data.selecionada as OrigemEntregaManualInfo | undefined) ||
          origens[0] ||
          null;

        setOrigensEntregaManual(origens);
        setOrigemEntregaManual(selecionada);
        setOrigemSelecionadaId(selecionada?.id || "");
        setEntregaManual((atual) => ({
          ...atual,
          origemResumo: String(selecionada?.resumo || ""),
        }));
      } catch {
        setErroFrete("Erro ao carregar origem da entrega.");
      } finally {
        setCarregandoOrigemEntrega(false);
      }
    }

    void carregarOrigem();
  }, [
    carregandoOrigemEntrega,
    modalidadeEntregaNormalizada,
    modalEntregaAberto,
    origemEntregaManual,
  ]);

  const calcularEntregaManual = useCallback(async () => {
    if (modalidadeEntregaNormalizada !== "ENTREGA_MANUAL") {
      return;
    }

    const origem = origemParaEndereco(origemEntregaManual);

    if (!enderecoCompletoParaMaps(origem)) {
      setStatusCalculoEntrega("Selecione uma origem completa.");
      return;
    }

    if (!String(entrega.numero || "").trim()) {
      setStatusCalculoEntrega("Informe o numero para calcular a entrega.");
      return;
    }

    if (!enderecoCompletoParaMaps(entrega)) {
      setStatusCalculoEntrega("Preencha CEP e número.");
      return;
    }

    setCalculandoEntregaManual(true);
    setStatusCalculoEntrega("Calculando entrega...");
    setErroFrete("");

    try {
      const response = await fetch("/api/vendas/entrega-manual/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem: {
            ...origem,
            id: origemEntregaManual?.id,
            nome: origemEntregaManual?.nome,
            uf: origem?.estado,
            latitude: origemEntregaManual?.latitude,
            longitude: origemEntregaManual?.longitude,
            observacao: origemEntregaManual?.observacao,
          },
          destino: entrega,
          parametros: {
            consumoKmPorLitro: entregaManual.consumoKmPorLitro,
            precoCombustivel: entregaManual.precoCombustivel,
            margemPercentual: entregaManual.margemPercentual,
            taxaFixa: entregaManual.taxaFixa,
            valorMinimo: entregaManual.valorMinimo,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const erroCalculo = String(
          data.erroCalculo ||
            data.error ||
            "Nao foi possivel calcular a entrega com seguranca. Revise o endereco ou abra a rota no Maps.",
        );
        setEntregaManual((atual) => ({
          ...atual,
          valorManual: valorManualEditado ? atual.valorManual : "",
          mapsUrl: String(data.mapsUrl || mapsUrlEntregaManual || ""),
          origemResumo: String(data.origemResumo || origemEntregaResumo),
          destinoResumo: String(data.destinoResumo || enderecoEntregaResumo),
          distanciaIdaKm: "",
          distanciaTotalKm: "",
          duracaoTexto: "",
          duracaoMinutos: "",
          litrosEstimados: "",
          custoCombustivel: "",
          valorComMargem: "",
          valorSugerido: "",
          providerDistancia: String(data.providerDistancia || ""),
          origemEnderecoFormatado: String(data.origemEnderecoFormatado || ""),
          destinoEnderecoFormatado: String(data.destinoEnderecoFormatado || ""),
          origemCoordenadas: data.origemCoordenadas || null,
          destinoCoordenadas: data.destinoCoordenadas || null,
          precisaoOrigem: String(data.precisaoOrigem || ""),
          precisaoDestino: String(data.precisaoDestino || ""),
          origemEncontrada: String(data.origemEncontrada || ""),
          destinoEncontrado: String(data.destinoEncontrado || ""),
          origemCoordenadaFixa: Boolean(
            data.origemCoordenadaFixa || temCoordenadas(origemEntregaManual),
          ),
          erroOrigemLocalizacao: data.errorTipo === "ORIGEM_GEOCODIFICACAO",
          erroCalculo,
          calculoAutomatico: false,
        }));
        setStatusCalculoEntrega(
          data.error || "Não foi possível calcular automaticamente.",
        );
        return;
      }

      setEntregaManual((atual) => ({
        ...atual,
        valorManual: valorManualEditado
          ? atual.valorManual
          : numeroParaCampo(data.valorFinal),
        origemResumo: String(data.origemResumo || origemEntregaResumo),
        destinoResumo: String(data.destinoResumo || enderecoEntregaResumo),
        mapsUrl: String(data.mapsUrl || mapsUrlEntregaManual || ""),
        distanciaIdaKm: numeroParaCampo(data.distanciaIdaKm),
        distanciaTotalKm: numeroParaCampo(data.distanciaTotalKm),
        duracaoTexto: String(data.duracaoTexto || ""),
        duracaoMinutos: String(data.duracaoMinutos || ""),
        consumoKmPorLitro: numeroParaCampo(data.consumoKmPorLitro),
        precoCombustivel: numeroParaCampo(data.precoCombustivel),
        litrosEstimados: numeroParaCampo(data.litrosEstimados),
        custoCombustivel: numeroParaCampo(data.custoCombustivel),
        margemPercentual: numeroParaCampo(data.margemPercentual),
        valorComMargem: numeroParaCampo(data.valorComMargem),
        taxaFixa: numeroParaCampo(data.taxaFixa),
        valorMinimo: numeroParaCampo(data.valorMinimo),
        valorSugerido: numeroParaCampo(data.valorSugerido),
        providerDistancia: String(data.providerDistancia || "openroute"),
        origemEnderecoFormatado: String(data.origemEnderecoFormatado || ""),
        destinoEnderecoFormatado: String(data.destinoEnderecoFormatado || ""),
        origemCoordenadas: data.origemCoordenadas || null,
        destinoCoordenadas: data.destinoCoordenadas || null,
        precisaoOrigem: String(data.precisaoOrigem || ""),
        precisaoDestino: String(data.precisaoDestino || ""),
        origemEncontrada: String(data.origemEncontrada || ""),
        destinoEncontrado: String(data.destinoEncontrado || ""),
        origemCoordenadaFixa: Boolean(data.origemCoordenadaFixa),
        erroOrigemLocalizacao: false,
        erroCalculo: "",
        calculoAutomatico: true,
      }));
      setStatusCalculoEntrega("Entrega calculada.");
    } catch {
      setStatusCalculoEntrega("Não foi possível calcular automaticamente.");
    } finally {
      setCalculandoEntregaManual(false);
    }
  }, [
    enderecoEntregaResumo,
    entrega,
    entregaManual.consumoKmPorLitro,
    entregaManual.margemPercentual,
    entregaManual.precoCombustivel,
    entregaManual.taxaFixa,
    entregaManual.valorMinimo,
    mapsUrlEntregaManual,
    modalidadeEntregaNormalizada,
    origemEntregaManual,
    origemEntregaResumo,
    valorManualEditado,
  ]);

  useEffect(() => {
    if (modalidadeEntregaNormalizada !== "ENTREGA_MANUAL") {
      return;
    }

    if (!enderecoCompletoParaMaps(origemParaEndereco(origemEntregaManual))) {
      setStatusCalculoEntrega("Selecione uma origem completa.");
      return;
    }

    if (!String(entrega.numero || "").trim()) {
      setStatusCalculoEntrega("Informe o numero para calcular a entrega.");
      return;
    }

    if (!enderecoCompletoParaMaps(entrega)) {
      setStatusCalculoEntrega("Preencha CEP e número.");
      return;
    }

    const timeout = window.setTimeout(() => {
      void calcularEntregaManual();
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [
    calcularEntregaManual,
    entrega,
    modalidadeEntregaNormalizada,
    origemEntregaManual,
  ]);

  function getPayloadEnvio() {
    if (!enviarEntrega || modalidadeEntregaNormalizada === "SEM_ENTREGA") {
      return null;
    }

    return {
      habilitado: true,
      modalidade: modalidadeEntregaNormalizada,
      origemDespachoSnapshot:
        modalidadeEntregaNormalizada === "ENTREGA_MANUAL"
          ? {
              id: origemEntregaManual?.id || null,
              nome: origemEntregaManual?.nome || null,
              cep: origemEntregaManual?.cep || null,
              rua: origemEntregaManual?.rua || null,
              numero: origemEntregaManual?.numero || null,
              complemento: origemEntregaManual?.complemento || null,
              bairro: origemEntregaManual?.bairro || null,
              cidade: origemEntregaManual?.cidade || null,
              estado: origemEntregaManual?.uf || origemEntregaManual?.estado || null,
              latitude: origemEntregaManual?.latitude ?? null,
              longitude: origemEntregaManual?.longitude ?? null,
              observacao: origemEntregaManual?.observacao || null,
            }
          : null,
      cep: entrega.cep,
      rua: entrega.rua,
      numero: entrega.numero,
      complemento: entrega.complemento,
      bairro: entrega.bairro,
      cidade: entrega.cidade,
      estado: entrega.estado,
      freteOpcaoId:
        modalidadeEntregaNormalizada === "MELHOR_ENVIO"
          ? freteSelecionadoId
          : null,
      kmIda: entregaManual.distanciaIdaKm || null,
      kmEstimado: entregaManual.distanciaIdaKm || null,
      distanciaIdaKm: entregaManual.distanciaIdaKm || null,
      distanciaTotalKm: entregaManual.distanciaTotalKm || null,
      kmIdaVolta: entregaManual.distanciaTotalKm || null,
      duracaoTexto: entregaManual.duracaoTexto || null,
      duracaoMinutos: entregaManual.duracaoMinutos || null,
      consumoKmPorLitro: entregaManual.consumoKmPorLitro || null,
      precoCombustivel: entregaManual.precoCombustivel || null,
      litrosEstimados: entregaManual.litrosEstimados || null,
      custoCombustivel: entregaManual.custoCombustivel || null,
      cobrarIdaVolta: Boolean(entregaManual.distanciaTotalKm),
      margemPercentual: entregaManual.margemPercentual || null,
      taxaFixa: entregaManual.taxaFixa || null,
      valorMinimo: entregaManual.valorMinimo || null,
      valorSugerido: entregaManual.valorSugerido || null,
      valorManual:
        modalidadeEntregaNormalizada === "RETIRADA_COMBINADA"
          ? 0
          : valorEntregaManual,
      valorFinal:
        modalidadeEntregaNormalizada === "RETIRADA_COMBINADA"
          ? 0
          : valorEntregaManual,
      providerDistancia: entregaManual.providerDistancia || null,
      origemEnderecoFormatado: entregaManual.origemEnderecoFormatado || null,
      destinoEnderecoFormatado: entregaManual.destinoEnderecoFormatado || null,
      origemCoordenadas: entregaManual.origemCoordenadas,
      destinoCoordenadas: entregaManual.destinoCoordenadas,
      precisaoOrigem: entregaManual.precisaoOrigem || null,
      precisaoDestino: entregaManual.precisaoDestino || null,
      origemEncontrada: entregaManual.origemEncontrada || null,
      destinoEncontrado: entregaManual.destinoEncontrado || null,
      origemCoordenadaFixa: entregaManual.origemCoordenadaFixa,
      erroCalculo: entregaManual.erroCalculo || null,
      mapsUrl:
        modalidadeEntregaNormalizada === "ENTREGA_MANUAL"
          ? mapsUrlEntregaManual || null
          : null,
      calculoAutomatico: Boolean(entregaManual.calculoAutomatico),
      origemResumo: origemEntregaResumo,
      destinoResumo: destinoEntregaResumo,
      observacaoManual: entregaManual.observacaoManual,
    };
  }

  function validarEntregaAntesDeFinalizar() {
    if (!enviarEntrega) {
      return true;
    }

    if (modalidadeEntregaNormalizada === "RETIRADA_COMBINADA") {
      return true;
    }

    const cepNormalizado = normalizarCep(entrega.cep);

    if (
      modalidadeEntregaNormalizada === "MELHOR_ENVIO" &&
      cepNormalizado.length !== 8
    ) {
      setErroFrete("Informe um CEP valido para entrega.");
      return false;
    }

    if (
      modalidadeEntregaNormalizada !== "MELHOR_ENVIO" &&
      cepNormalizado.length > 0 &&
      cepNormalizado.length !== 8
    ) {
      setErroFrete("Confira o CEP informado para a entrega manual.");
      return false;
    }

    if (modalidadeEntregaNormalizada === "MELHOR_ENVIO") {
      if (!freteSelecionado) {
        setErroFrete("Calcule e selecione uma opcao de frete.");
        return false;
      }

      if (freteSelecionado.tipoEntrega === "RETIRADA") {
        return true;
      }
    }

    if (
      modalidadeEntregaNormalizada === "ENTREGA_MANUAL" &&
      origemEntregaManual &&
      !origemEntregaManual.completo
    ) {
      setErroFrete(
        "Complete o endereço de despacho nas configurações de frete para gerar a rota no Maps.",
      );
      return false;
    }

    const camposObrigatorios = [
      entrega.cep,
      entrega.rua,
      entrega.numero,
      entrega.bairro,
      entrega.cidade,
      entrega.estado,
    ];

    if (camposObrigatorios.some((campo) => !String(campo || "").trim())) {
      setErroFrete("Preencha endereco, numero, bairro, cidade e UF para entrega.");
      return false;
    }

    if (
      modalidadeEntregaNormalizada === "ENTREGA_MANUAL" &&
      numeroInputOuNull(entregaManual.valorManual) === null
    ) {
      setErroFrete("Informe o valor da entrega manual.");
      return false;
    }

    return true;
  }

  async function cotarFrete() {
    try {
      setErroFrete("");
      setOpcoesFrete([]);
      setFreteSelecionadoId("");

      if (modalidadeEntregaNormalizada !== "MELHOR_ENVIO") {
        setErroFrete("Cotacao de frete e usada apenas no Melhor Envio.");
        return;
      }

      if (itensPedido.length === 0) {
        setErroFrete("Adicione ao menos um produto para calcular frete.");
        return;
      }

      if (normalizarCep(entrega.cep).length !== 8) {
        setErroFrete("Informe um CEP válido para calcular o frete.");
        return;
      }

      setCotandoFrete(true);

      const response = await fetch("/api/loja/frete/cotar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cepDestino: entrega.cep,
          itens: itensPedido.map((item) => ({
            produtoId: item.id,
            quantidade: item.quantidade,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      const opcoes = Array.isArray(data.opcoes)
        ? (data.opcoes as FreteOpcaoVenda[])
        : [];

      setOpcoesFrete(opcoes);

      if (!response.ok) {
        setErroFrete(data.error || "Erro ao calcular frete.");
        return;
      }

      const primeiraOpcaoValida = opcoes.find((opcao) => !opcao.erro);

      if (primeiraOpcaoValida) {
        setFreteSelecionadoId(primeiraOpcaoValida.id);
      } else {
        setErroFrete("Nenhuma opção de frete disponível para este CEP.");
      }
    } catch {
      setErroFrete("Erro ao calcular frete.");
    } finally {
      setCotandoFrete(false);
    }
  }

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

      const itemSemMedida = itensPedido.find(
        (item) =>
          produtoTemMedidas(item) && !normalizarTamanhoAnel(item.tamanhoAnel),
      );

      if (itemSemMedida) {
        setErro(`Informe a medida para o produto ${itemSemMedida.nome}.`);
        return;
      }

      const itemSemSaldo = itensPedido.find((item) => {
        const estoqueDisponivel = getEstoqueDisponivel(item);
        return item.quantidade > estoqueDisponivel;
      });

      if (itemSemSaldo) {
        setErro(
          produtoTemMedidas(itemSemSaldo)
            ? `O item ${itemSemSaldo.nome} medida ${itemSemSaldo.tamanhoAnel} está com quantidade acima do estoque disponível.`
            : `O item ${itemSemSaldo.nome} está com quantidade acima do estoque disponível.`,
        );
        return;
      }

      if (!validarEntregaAntesDeFinalizar()) {
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
          envio: getPayloadEnvio(),
          itens: itensPedido.map((item) => ({
            id: item.id,
            codigoInterno: item.codigoInterno,
            codigoFornecedor: item.codigoFornecedor,
            nome: item.nome,
            precoVenda: item.precoVenda,
            categoria: item.categoria,
            quantidade: item.quantidade,
            tamanhoAnel: produtoTemMedidas(item)
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
    valor: string,
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

  async function gerarLinkPagamento() {
    try {
      setErroPagamento("");
      setErro("");

      if (!clienteSelecionado) {
        setErroPagamento("Selecione um cliente antes de gerar o link.");
        return;
      }

      if (!meioVenda) {
        setErroPagamento("Selecione o meio de venda.");
        return;
      }

      if (itensPedido.length === 0) {
        setErroPagamento("Adicione pelo menos um produto.");
        return;
      }

      if (totalFinal <= 0) {
        setErroPagamento("O total precisa ser maior que zero.");
        return;
      }

      if (!validarEntregaAntesDeFinalizar()) {
        return;
      }

      setGerandoLinkPagamento(true);

      const response = await fetch("/api/vendas/link-pagamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSelecionado.id,
          meioVenda,
          descontoPercentual: descontoNumero,
          observacoes,
          envio: getPayloadEnvio(),
          itens: itensPedido.map((item) => ({
            id: item.id,
            quantidade: item.quantidade,
            tamanhoAnel: produtoTemMedidas(item)
              ? normalizarTamanhoAnel(item.tamanhoAnel)
              : null,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroPagamento(data.error || "Erro ao gerar link de pagamento.");
        setGerandoLinkPagamento(false);
        return;
      }

      setLinkPagamento({
        url: String(data.paymentUrl || ""),
        pedidoCodigo: String(data.pedidoCodigo || ""),
        assinatura: assinaturaPagamento,
      });
      setModalLinkPagamentoAberto(true);
    } catch {
      setErroPagamento("Erro ao gerar link de pagamento.");
    } finally {
      setGerandoLinkPagamento(false);
    }
  }

  async function copiarLinkPagamento() {
    if (!linkPagamento?.url) return;

    try {
      await navigator.clipboard.writeText(linkPagamento.url);
    } catch {
      setErroPagamento("Não foi possível copiar o link automaticamente.");
    }
  }

  const telefoneWhatsApp = normalizarTelefoneWhatsApp(
    clienteSelecionado?.telefone,
  );
  const mensagemWhatsApp =
    clienteSelecionado && linkPagamento?.url
      ? `Olá, ${clienteSelecionado.nome}! Segue o link para pagamento do seu pedido na Stella: ${linkPagamento.url}`
      : "";

  return (
    <>
      <div className="space-y-6 pb-36 md:pb-0 [&_input]:text-base [&_select]:text-base [&_textarea]:text-base md:[&_input]:text-sm md:[&_select]:text-sm md:[&_textarea]:text-sm">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Vendas
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Nova Venda
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Monte o pedido em uma única tela, pesquisando cliente por
                documento ou nome.
              </p>
            </div>

            <Link
              href="/vendas"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Voltar para lista
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-6">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
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
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                    onChange={(event) =>
                      setDescontoPercentual(event.target.value)
                    }
                    placeholder="0"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
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

              <div className="mt-5 space-y-3 md:hidden">
                {produtosFiltrados.map((produto) => (
                  <article
                    key={produto.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <MiniaturaProduto
                        imagemUrl={getImagemProduto(produto)}
                        nome={produto.nome}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {produto.nome}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {produto.codigoInterno} · {produto.categoria}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              produto.estoqueAtual <= 0
                                ? "bg-rose-100 text-rose-700"
                                : produto.estoqueAtual <= 3
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {produto.estoqueAtual <= 0
                              ? "Sem estoque"
                              : `${produto.estoqueAtual} em estoque`}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Preço
                            </p>
                            <p className="text-base font-bold text-slate-950">
                              {moeda(produto.precoVenda)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => adicionarProduto(produto)}
                            disabled={produto.estoqueAtual <= 0}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="min-w-[860px] w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-sm text-slate-600">
                      <th className="px-4 py-3 font-semibold">Código</th>
                      <th className="px-4 py-3 font-semibold">Nome</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Preço</th>
                      <th className="px-4 py-3 font-semibold">Estoque</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Ação
                      </th>
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
                                {produto.tipoProduto === "KIT"
                                  ? "Kit"
                                  : "Produto"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{produto.categoria}</td>
                        <td className="px-4 py-3">
                          {moeda(produto.precoVenda)}
                        </td>
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
              <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Itens da venda
                </h2>
              </div>

              {itensPedido.length === 0 ? (
                <div className="px-4 py-10 text-sm text-slate-500 sm:px-6">
                  Ainda não há produtos adicionados.
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 md:hidden">
                    {itensPedido.map((item) => {
                      const unitFinal = valorUnitarioFinal(item);
                      const totalLinha = unitFinal * item.quantidade;
                      const estoqueDisponivel = getEstoqueDisponivel(item);
                      const saldoRestante = estoqueDisponivel - item.quantidade;
                      const saldo = statusSaldo(
                        estoqueDisponivel,
                        item.quantidade,
                      );
                      const temMedidas = produtoTemMedidas(item);
                      const labelMedida = getLabelMedida(item);
                      const tamanhosDisponiveis = getTamanhosDisponiveis(item);

                      return (
                        <article
                          key={item.itemKey}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex gap-3">
                            <MiniaturaProduto
                              imagemUrl={getImagemProduto(item)}
                              nome={item.nome}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {item.nome}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.codigoInterno} · {item.categoria}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removerItem(item.itemKey)}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                                  title="Remover item"
                                  aria-label={`Remover ${item.nome}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-3">
                                {temMedidas ? (
                                  <label>
                                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                      {labelMedida}
                                    </span>
                                    <select
                                      value={item.tamanhoAnel}
                                      onChange={(event) =>
                                        alterarTamanhoAnel(
                                          item.itemKey,
                                          event.target.value,
                                        )
                                      }
                                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                                    >
                                      {tamanhosDisponiveis.map((estoque) => (
                                        <option
                                          key={estoque.tamanhoAnel}
                                          value={estoque.tamanhoAnel}
                                        >
                                          {estoque.label || estoque.tamanhoAnel}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : (
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                      Medida
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-500">
                                      -
                                    </p>
                                  </div>
                                )}

                                <label>
                                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Quantidade
                                  </span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantidade}
                                    onChange={(event) =>
                                      alterarQuantidade(
                                        item.itemKey,
                                        Number(event.target.value || 1),
                                      )
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                                  />
                                </label>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Estoque
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-900">
                                    {estoqueDisponivel}
                                  </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Saldo
                                  </p>
                                  <span
                                    className={`mt-1 inline-flex min-w-10 justify-center rounded-full border px-3 py-1 text-xs font-semibold ${saldo.numberClassName}`}
                                    title={saldo.label}
                                  >
                                    {saldoRestante}
                                  </span>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Unitário
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-900">
                                    {moeda(unitFinal)}
                                  </p>
                                </div>
                                <div className="rounded-xl bg-slate-900 px-3 py-2 text-white">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                                    Total
                                  </p>
                                  <p className="mt-1 font-bold">
                                    {moeda(totalLinha)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[1040px] w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-sm text-slate-600">
                          <th className="px-6 py-4 font-semibold">Código</th>
                          <th className="px-6 py-4 font-semibold">Descrição</th>
                          <th className="px-6 py-4 font-semibold">Medida</th>
                          <th className="px-6 py-4 font-semibold">Qtd</th>
                          <th className="px-6 py-4 font-semibold">Estoque</th>
                          <th className="px-6 py-4 font-semibold">
                            Saldo restante
                          </th>
                          <th className="px-6 py-4 font-semibold">
                            Unit. base
                          </th>
                          <th className="px-6 py-4 font-semibold">
                            Unit. final
                          </th>
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
                          const saldoRestante =
                            estoqueDisponivel - item.quantidade;
                          const saldo = statusSaldo(
                            estoqueDisponivel,
                            item.quantidade,
                          );
                          const temMedidas = produtoTemMedidas(item);
                          const tamanhosDisponiveis =
                            getTamanhosDisponiveis(item);

                          return (
                            <tr
                              key={item.itemKey}
                              className="text-sm text-slate-700"
                            >
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
                                {temMedidas ? (
                                  <select
                                    value={item.tamanhoAnel}
                                    onChange={(event) =>
                                      alterarTamanhoAnel(
                                        item.itemKey,
                                        event.target.value,
                                      )
                                    }
                                    className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                                  >
                                    {tamanhosDisponiveis.map((estoque) => (
                                      <option
                                        key={estoque.tamanhoAnel}
                                        value={estoque.tamanhoAnel}
                                      >
                                        {estoque.label || estoque.tamanhoAnel}
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
                                      Number(event.target.value || 1),
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
                </>
              )}
            </div>
          </section>

          <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Resumo do pedido
                </h2>

                <div className="mt-5 space-y-4">
                  <Info label="Subtotal" value={moeda(subtotal)} />
                  <Info label="Desconto" value={moeda(valorDesconto)} />
                  {enviarEntrega && (
                    <Info
                      label="Entrega"
                      value={
                        modalidadeEntregaNormalizada === "MELHOR_ENVIO" &&
                        !freteSelecionado
                          ? "Selecione"
                          : moeda(valorFrete)
                      }
                    />
                  )}
                  <Info
                    label="Total final"
                    value={moeda(totalFinal)}
                    destaque
                  />
                </div>
              </div>

              <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Finalização da venda
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Escolha se o pagamento já foi recebido ou se o cliente vai
                  pagar online pelo Stripe.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setTipoFinalizacao("PAGO_AGORA")}
                      className={`h-full min-h-[112px] rounded-2xl border p-4 text-left transition ${
                        tipoFinalizacao === "PAGO_AGORA"
                          ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-full items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                            tipoFinalizacao === "PAGO_AGORA"
                              ? "border-slate-900"
                              : "border-slate-300"
                          }`}
                        >
                          {tipoFinalizacao === "PAGO_AGORA" ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-950">
                            Já pagou
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            Registre a venda como paga quando o valor já foi
                            recebido por Pix externo, dinheiro, maquininha ou
                            outro meio.
                          </span>
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoFinalizacao("PAGAR_ONLINE")}
                      className={`h-full min-h-[112px] rounded-2xl border p-4 text-left transition ${
                        tipoFinalizacao === "PAGAR_ONLINE"
                          ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-full items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                            tipoFinalizacao === "PAGAR_ONLINE"
                              ? "border-indigo-600"
                              : "border-slate-300"
                          }`}
                        >
                          {tipoFinalizacao === "PAGAR_ONLINE" ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-950">
                            Pagar agora
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            Gere um link do Stripe para o cliente pagar online.
                          </span>
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <Truck className="h-4 w-4 shrink-0 text-slate-500" />
                          Entrega
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {entregaConfigurada
                            ? labelModalidadeEntrega(
                                modalidadeEntregaNormalizada,
                              )
                            : "Sem entrega vinculada ao pedido."}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setModalEntregaAberto(true)}
                        className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Configurar
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <span>Modalidade</span>
                        <strong className="text-right font-semibold text-slate-900">
                          {labelModalidadeEntrega(
                            modalidadeEntregaNormalizada,
                          )}
                        </strong>
                      </div>

                      {entregaConfigurada ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                          <span>Valor</span>
                          <strong className="font-semibold text-slate-900">
                            {modalidadeEntregaNormalizada === "MELHOR_ENVIO" &&
                            !freteSelecionado
                              ? "Selecione"
                              : moeda(valorFrete)}
                          </strong>
                        </div>
                      ) : null}

                      {entregaConfigurada && enderecoEntregaResumo ? (
                        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                          <span className="font-semibold text-slate-700">
                            Endereço:
                          </span>{" "}
                          <span>{enderecoEntregaResumo}</span>
                        </div>
                      ) : null}

                      {modalidadeEntregaNormalizada === "ENTREGA_MANUAL" &&
                      mapsUrlEntregaManual ? (
                        <a
                          href={mapsUrlEntregaManual}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                          Ver rota no Maps
                        </a>
                      ) : null}

                      {modalidadeEntregaNormalizada === "MELHOR_ENVIO" &&
                      !freteSelecionado ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                          Calcule e selecione o frete no modal.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {modalEntregaAberto ? (
                    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 px-2 py-2 sm:items-center sm:px-4 sm:py-6">
                      <div className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl [&_input]:text-base [&_select]:text-base [&_textarea]:text-base md:[&_input]:text-sm md:[&_select]:text-sm md:[&_textarea]:text-sm">
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Venda manual
                            </p>
                            <h2 className="mt-1 text-xl font-semibold text-slate-950">
                              Configurar entrega
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                              Defina retirada, entrega própria ou frete Melhor
                              Envio sem ocupar a finalização da venda.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setModalEntregaAberto(false)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                            aria-label="Fechar configuração de entrega"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="space-y-4 px-4 py-5 sm:px-6">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                                <Truck className="h-4 w-4" />
                              </span>

                              <span className="min-w-0">
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                                  Entrega do pedido
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                  Use &quot;sem entrega&quot; quando o pedido não tiver
                                  logística vinculada.
                                </span>
                              </span>
                            </div>

                            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                        <div className="grid gap-2">
                          {MODALIDADES_ENTREGA_MANUAL.map((modalidade) => {
                            const selecionada =
                              modalidadeEntregaNormalizada ===
                              modalidade.value;

                            return (
                              <button
                                key={modalidade.value}
                                type="button"
                                onClick={() =>
                                  alterarModalidadeEntrega(modalidade.value)
                                }
                                className={`rounded-2xl border p-3 text-left transition ${
                                  selecionada
                                    ? "border-slate-900 bg-white ring-1 ring-slate-900"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                              >
                                <span className="block text-sm font-semibold text-slate-950">
                                  {modalidade.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                  {modalidade.descricao}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {modalidadeEntregaNormalizada === "SEM_ENTREGA" ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                            Cliente ja levou ou este pedido nao precisa de entrega.
                          </div>
                        ) : null}

                        {modalidadeEntregaNormalizada === "ENTREGA_MANUAL" ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">
                                  Saindo de: {origemEntregaManual?.nome || "endereço de despacho"}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {carregandoOrigemEntrega
                                    ? "Carregando origem..."
                                    : origemEntregaResumoCurto}
                                </p>
                                <span
                                  className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                                    temCoordenadas(origemEntregaManual)
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                                  }`}
                                >
                                  {temCoordenadas(origemEntregaManual)
                                    ? "Localizacao exata configurada"
                                    : "Usando endereco textual"}
                                </span>
                              </div>
                              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSeletorOrigemAberto((atual) => !atual)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Alterar origem
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGerenciarOrigensAberto((atual) => !atual)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Gerenciar origens
                                </button>
                              </div>
                            </div>

                            {seletorOrigemAberto ? (
                              <div className="mt-3 grid gap-2">
                                {origensEntregaManual.map((origem) => (
                                  <button
                                    key={origem.id}
                                    type="button"
                                    onClick={() => selecionarOrigemEntrega(origem)}
                                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                                      origemSelecionadaId === origem.id
                                        ? "border-slate-900 bg-slate-50 text-slate-950"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span className="block font-semibold">
                                      {origem.nome}
                                      {origem.padrao ? " · padrão" : ""}
                                      {origem.origemSistema ? " · frete" : ""}
                                    </span>
                                    <span className="mt-1 block leading-5">
                                      {origem.resumo}
                                    </span>
                                    <span
                                      className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                                        temCoordenadas(origem)
                                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                                      }`}
                                    >
                                      {temCoordenadas(origem)
                                        ? "Localizacao exata configurada"
                                        : "Usando endereco textual"}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : null}

                            {gerenciarOrigensAberto ? (
                              <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                <div className="grid gap-2">
                                  {origensEntregaManual.map((origem) => (
                                    <div
                                      key={origem.id}
                                      className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-semibold text-slate-900">
                                            {origem.nome}
                                            {origem.padrao ? " · padrão" : ""}
                                          </p>
                                          <p className="mt-1 leading-5">
                                            {origem.resumo}
                                          </p>
                                          <span
                                            className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                                              temCoordenadas(origem)
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                                            }`}
                                          >
                                            {temCoordenadas(origem)
                                              ? "Localizacao exata configurada"
                                              : "Usando endereco textual"}
                                          </span>
                                        </div>
                                        {!origem.origemSistema ? (
                                          <div className="flex shrink-0 gap-2">
                                            <button
                                              type="button"
                                              onClick={() => editarOrigemForm(origem)}
                                              className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700"
                                            >
                                              Editar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => removerOrigemManual(origem)}
                                              className="rounded-lg border border-rose-200 px-2 py-1 font-semibold text-rose-700"
                                            >
                                              Remover
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="grid gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {origemEditandoId ? "Editar origem" : "Nova origem"}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={resetarOrigemForm}
                                      className="text-xs font-semibold text-slate-500 underline"
                                    >
                                      Limpar
                                    </button>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Nome
                                      </span>
                                      <input
                                        value={origemForm.nome}
                                        onChange={(event) =>
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            nome: event.target.value,
                                          }))
                                        }
                                        placeholder="Loja, atelier, estoque..."
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                      />
                                    </label>
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        CEP
                                      </span>
                                      <input
                                        value={origemForm.cep}
                                        onChange={(event) => {
                                          const cep = event.target.value;
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            cep,
                                          }));
                                          if (normalizarCep(cep).length === 8) {
                                            void buscarCepOrigemManual(cep);
                                          }
                                        }}
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                      />
                                      {buscandoCepOrigem ? (
                                        <span className="mt-1 block text-xs text-slate-500">
                                          Buscando CEP...
                                        </span>
                                      ) : null}
                                    </label>
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Rua
                                      </span>
                                      <input
                                        value={origemForm.rua}
                                        onChange={(event) =>
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            rua: event.target.value,
                                          }))
                                        }
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                      />
                                    </label>
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Número
                                      </span>
                                      <input
                                        value={origemForm.numero}
                                        onChange={(event) =>
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            numero: event.target.value,
                                          }))
                                        }
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                      />
                                    </label>
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Complemento
                                      </span>
                                      <input
                                        value={origemForm.complemento}
                                        onChange={(event) =>
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            complemento: event.target.value,
                                          }))
                                        }
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                      />
                                    </label>
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Bairro
                                      </span>
                                      <input
                                        value={origemForm.bairro}
                                        onChange={(event) =>
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            bairro: event.target.value,
                                          }))
                                        }
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                      />
                                    </label>
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Cidade
                                      </span>
                                      <input
                                        value={origemForm.cidade}
                                        onChange={(event) =>
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            cidade: event.target.value,
                                          }))
                                        }
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                      />
                                    </label>
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        UF
                                      </span>
                                      <input
                                        value={origemForm.uf}
                                        onChange={(event) =>
                                          setOrigemForm((atual) => ({
                                            ...atual,
                                            uf: event.target.value
                                              .toUpperCase()
                                              .slice(0, 2),
                                          }))
                                        }
                                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm uppercase outline-none transition focus:border-slate-500"
                                      />
                                    </label>
                                  </div>
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-950">
                                          Localizacao exata para calculo
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                          Use coordenadas quando o endereco nao for encontrado com seguranca pelo Maps/OpenRoute.
                                        </p>
                                      </div>
                                      <a
                                        href="https://support.google.com/maps/answer/18539"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold text-slate-700 underline"
                                      >
                                        Como pegar coordenadas no Google Maps
                                      </a>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                      <label>
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                          Latitude
                                        </span>
                                        <input
                                          value={origemForm.latitude}
                                          onChange={(event) =>
                                            setOrigemForm((atual) => ({
                                              ...atual,
                                              latitude: event.target.value,
                                            }))
                                          }
                                          placeholder="-22.435000"
                                          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                        />
                                      </label>
                                      <label>
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                          Longitude
                                        </span>
                                        <input
                                          value={origemForm.longitude}
                                          onChange={(event) =>
                                            setOrigemForm((atual) => ({
                                              ...atual,
                                              longitude: event.target.value,
                                            }))
                                          }
                                          placeholder="-46.820000"
                                          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                        />
                                      </label>
                                    </div>
                                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
                                      <p>Abra o local no Google Maps.</p>
                                      <p>Clique com o botao direito no ponto exato.</p>
                                      <p>Copie os numeros de latitude e longitude.</p>
                                      <p>Cole aqui.</p>
                                    </div>
                                  </div>
                                  <label>
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Observação
                                    </span>
                                    <textarea
                                      value={origemForm.observacao}
                                      onChange={(event) =>
                                        setOrigemForm((atual) => ({
                                          ...atual,
                                          observacao: event.target.value,
                                        }))
                                      }
                                      rows={2}
                                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                                    />
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={origemForm.padrao}
                                      onChange={(event) =>
                                        setOrigemForm((atual) => ({
                                          ...atual,
                                          padrao: event.target.checked,
                                        }))
                                      }
                                      className="h-4 w-4 rounded border-slate-300"
                                    />
                                    Definir como origem padrão
                                  </label>
                                  <button
                                    type="button"
                                    onClick={salvarOrigemManual}
                                    disabled={salvandoOrigemManual}
                                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {salvandoOrigemManual
                                      ? "Salvando..."
                                      : origemEditandoId
                                        ? "Salvar origem"
                                        : "Adicionar origem"}
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {origemEntregaManual &&
                            !origemEntregaManual.completo ? (
                              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                <p>
                                  Complete o endereço de despacho nas configurações de frete para gerar a rota no Maps.
                                </p>
                                <Link
                                  href="/configuracoes/loja/frete"
                                  className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-white px-3 py-2 font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                                >
                                  Configurar endereço de despacho
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {mostrarEnderecoEntrega && clienteTemEndereco ? (
                            <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                              <span>
                                <span className="block font-semibold text-slate-900">
                                  Endereço cadastrado do cliente
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                  {[
                                    clienteSelecionado?.rua,
                                    clienteSelecionado?.numero,
                                    clienteSelecionado?.bairro,
                                    clienteSelecionado?.cidade,
                                    clienteSelecionado?.estado,
                                  ]
                                    .filter(Boolean)
                                    .join(", ") || clienteSelecionado?.cep}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setUsarEnderecoCliente(true);
                                  aplicarEnderecoDoCliente();
                                }}
                                className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                {usarEnderecoCliente
                                  ? "Endereço aplicado"
                                  : "Usar endereço do cliente"}
                              </button>
                            </div>
                        ) : null}

                        {mostrarEnderecoEntrega ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label>
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                CEP destino
                              </span>
                              <input
                                value={entrega.cep}
                                onChange={(event) =>
                                  atualizarCampoEntrega(
                                    "cep",
                                    event.target.value,
                                  )
                                }
                                onBlur={() => buscarEnderecoEntregaPorCep()}
                                placeholder="00000-000"
                                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                              />
                              {buscandoCepEntrega ? (
                                <span className="mt-1 block text-xs text-slate-500">
                                  Buscando CEP...
                                </span>
                              ) : null}
                            </label>

                          <label>
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Endereço
                            </span>
                            <input
                              value={entrega.rua}
                              onChange={(event) =>
                                atualizarCampoEntrega("rua", event.target.value)
                              }
                              placeholder="Rua, avenida..."
                              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>

                          <label>
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Número
                            </span>
                            <input
                              value={entrega.numero}
                              onChange={(event) =>
                                atualizarCampoEntrega(
                                  "numero",
                                  event.target.value,
                                )
                              }
                              placeholder="123"
                              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>

                          <label>
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Complemento
                            </span>
                            <input
                              value={entrega.complemento}
                              onChange={(event) =>
                                atualizarCampoEntrega(
                                  "complemento",
                                  event.target.value,
                                )
                              }
                              placeholder="Apto, bloco..."
                              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>

                          <label>
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Bairro
                            </span>
                            <input
                              value={entrega.bairro}
                              onChange={(event) =>
                                atualizarCampoEntrega(
                                  "bairro",
                                  event.target.value,
                                )
                              }
                              placeholder="Bairro"
                              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>

                          <div className="grid grid-cols-[minmax(0,1fr)_76px] gap-3">
                            <label>
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Cidade
                              </span>
                              <input
                                value={entrega.cidade}
                                onChange={(event) =>
                                  atualizarCampoEntrega(
                                    "cidade",
                                    event.target.value,
                                  )
                                }
                                placeholder="Cidade"
                                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                              />
                            </label>

                            <label>
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                UF
                              </span>
                              <input
                                value={entrega.estado}
                                onChange={(event) =>
                                  atualizarCampoEntrega(
                                    "estado",
                                    event.target.value,
                                  )
                                }
                                placeholder="SP"
                                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm uppercase outline-none transition focus:border-slate-500"
                              />
                            </label>
                          </div>
                          </div>
                        ) : null}

                        {modalidadeEntregaNormalizada === "ENTREGA_MANUAL" ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-950">
                              Entrega manual
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {calculandoEntregaManual
                                ? "Calculando entrega..."
                                : statusCalculoEntrega}
                            </p>

                            <div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                              <div>
                                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Origem
                                </span>
                                <p className="mt-1 font-medium text-slate-950">
                                  Saindo de: {origemEntregaResumo}
                                </p>
                              </div>
                              <div>
                                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Destino
                                </span>
                                <p className="mt-1 font-medium text-slate-950">
                                  {destinoEntregaResumo || "Preencha CEP, número, bairro, cidade e UF."}
                                </p>
                              </div>

                              {mapsUrlEntregaManual ? (
                                <a
                                  href={mapsUrlEntregaManual}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  Ver rota no Maps
                                </a>
                              ) : (
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                  Complete a origem de despacho e o destino do cliente para gerar o link do Google Maps.
                                </p>
                              )}
                            </div>

                            {entregaManual.distanciaIdaKm ? (
                              <div className="mt-3 grid gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-950 ring-1 ring-emerald-200 sm:grid-cols-3">
                                <div>
                                  <span className="block text-xs text-emerald-700">
                                    Ida
                                  </span>
                                  <strong>{entregaManual.distanciaIdaKm} km</strong>
                                </div>
                                <div>
                                  <span className="block text-xs text-emerald-700">
                                    Ida e volta
                                  </span>
                                  <strong>{entregaManual.distanciaTotalKm} km</strong>
                                </div>
                                <div>
                                  <span className="block text-xs text-emerald-700">
                                    Duração ida
                                  </span>
                                  <strong>
                                    {entregaManual.duracaoTexto || "Não informado"}
                                  </strong>
                                </div>
                                <div>
                                  <span className="block text-xs text-emerald-700">
                                    Litros
                                  </span>
                                  <strong>{entregaManual.litrosEstimados} L</strong>
                                </div>
                                <div>
                                  <span className="block text-xs text-emerald-700">
                                    Combustível
                                  </span>
                                  <strong>
                                    {moeda(numeroInputOuNull(entregaManual.custoCombustivel) ?? 0)}
                                  </strong>
                                </div>
                                <div>
                                  <span className="block text-xs text-emerald-700">
                                    Sugerido
                                  </span>
                                  <strong>
                                    {moeda(numeroInputOuNull(entregaManual.valorSugerido) ?? 0)}
                                  </strong>
                                </div>
                              </div>
                            ) : null}

                            {entregaManual.origemCoordenadaFixa ? (
                              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                                Origem calculada por localizacao exata configurada.
                              </p>
                            ) : null}

                            {entregaManual.calculoAutomatico &&
                            (entregaManual.precisaoOrigem === "APROXIMADA" ||
                              entregaManual.precisaoDestino === "APROXIMADA") ? (
                              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                Endereco localizado de forma aproximada. Confira a rota no Maps antes de confirmar.
                              </p>
                            ) : null}

                            {entregaManual.erroOrigemLocalizacao ? (
                              <button
                                type="button"
                                onClick={abrirOrigemSelecionadaParaCoordenadas}
                                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                              >
                                Adicionar localizacao exata na origem
                              </button>
                            ) : null}

                            <label className="mt-3 block">
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Valor final da entrega
                              </span>
                              <input
                                value={entregaManual.valorManual}
                                onChange={(event) =>
                                  atualizarValorCobrado(event.target.value)
                                }
                                placeholder="0,00"
                                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                setConfigCalculoAberta((atual) => !atual)
                              }
                              className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Configurações do cálculo
                            </button>

                            {configCalculoAberta ? (
                              <div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-2">
                                <label>
                                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Consumo km/l
                                  </span>
                                  <input
                                    value={entregaManual.consumoKmPorLitro}
                                    onChange={(event) =>
                                      atualizarCampoEntregaManual(
                                        "consumoKmPorLitro",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                  />
                                </label>
                                <label>
                                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Preço combustível
                                  </span>
                                  <input
                                    value={entregaManual.precoCombustivel}
                                    onChange={(event) =>
                                      atualizarCampoEntregaManual(
                                        "precoCombustivel",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                  />
                                </label>
                                <label>
                                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Margem %
                                  </span>
                                  <input
                                    value={entregaManual.margemPercentual}
                                    onChange={(event) =>
                                      atualizarCampoEntregaManual(
                                        "margemPercentual",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                  />
                                </label>
                                <label>
                                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Taxa fixa
                                  </span>
                                  <input
                                    value={entregaManual.taxaFixa}
                                    onChange={(event) =>
                                      atualizarCampoEntregaManual(
                                        "taxaFixa",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                  />
                                </label>
                                <label>
                                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Valor mínimo
                                  </span>
                                  <input
                                    value={entregaManual.valorMinimo}
                                    onChange={(event) =>
                                      atualizarCampoEntregaManual(
                                        "valorMinimo",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                  />
                                </label>
                              </div>
                            ) : null}

                            <label className="mt-3 block">
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Observacao para entrega
                              </span>
                              <textarea
                                value={entregaManual.observacaoManual}
                                onChange={(event) =>
                                  atualizarCampoEntregaManual(
                                    "observacaoManual",
                                    event.target.value,
                                  )
                                }
                                rows={2}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                              />
                            </label>
                          </div>
                        ) : null}

                        {modalidadeEntregaNormalizada === "RETIRADA_COMBINADA" ? (
                          <label className="block rounded-2xl border border-slate-200 bg-white p-3">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Observação para retirada
                            </span>
                            <textarea
                              value={entregaManual.observacaoManual}
                              onChange={(event) =>
                                atualizarCampoEntregaManual(
                                  "observacaoManual",
                                  event.target.value,
                                )
                              }
                              rows={3}
                              placeholder="Combine local, data ou orientação para retirada."
                              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>
                        ) : null}

                        {modalidadeEntregaNormalizada === "MELHOR_ENVIO" && (
                          <button
                            type="button"
                            onClick={cotarFrete}
                            disabled={cotandoFrete || itensPedido.length === 0}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cotandoFrete ? "Calculando..." : "Calcular frete"}
                          </button>
                        )}

                        {erroFrete ? (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {erroFrete}
                          </div>
                        ) : null}

                        {modalidadeEntregaNormalizada === "MELHOR_ENVIO" &&
                          opcoesFrete.length > 0 && (
                          <div className="space-y-2">
                            {opcoesFrete.map((opcao) => {
                              const selecionada =
                                freteSelecionadoId === opcao.id && !opcao.erro;

                              return (
                                <label
                                  key={opcao.id}
                                  className={`flex min-w-0 items-start gap-3 rounded-2xl border bg-white p-3 text-sm transition ${
                                    selecionada
                                      ? "border-slate-900 ring-1 ring-slate-900"
                                      : "border-slate-200"
                                  } ${
                                    opcao.erro
                                      ? "cursor-not-allowed opacity-60"
                                      : "cursor-pointer"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="frete-manual"
                                    value={opcao.id}
                                    checked={selecionada}
                                    disabled={Boolean(opcao.erro)}
                                    onChange={() =>
                                      setFreteSelecionadoId(opcao.id)
                                    }
                                    className="mt-1 h-4 w-4 border-slate-300"
                                  />

                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-3">
                                      <span className="truncate font-semibold text-slate-950">
                                        {opcao.transportadora} - {opcao.nome}
                                      </span>
                                      <span className="shrink-0 font-bold text-slate-950">
                                        {moeda(Number(opcao.valor || 0))}
                                      </span>
                                    </span>

                                    <span className="mt-1 block truncate text-xs text-slate-500">
                                      {opcao.tipoEntrega === "RETIRADA"
                                        ? "Retirada local"
                                        : opcao.prazoDias !== null
                                          ? `${opcao.prazoDias} dia${
                                              opcao.prazoDias === 1 ? "" : "s"
                                            }`
                                          : "Prazo indisponível"}
                                      {opcao.erro ? ` · ${opcao.erro}` : ""}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                            </div>
                          </div>

                          <div className="grid gap-3 border-t border-slate-100 pt-5 sm:flex sm:flex-wrap sm:justify-end">
                            <button
                              type="button"
                              onClick={() => setModalEntregaAberto(false)}
                              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalEntregaAberto(false)}
                              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                            >
                              Concluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

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

                  {erroPagamento ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {erroPagamento}
                    </div>
                  ) : null}

                  {linkPagamento && tipoFinalizacao === "PAGAR_ONLINE" ? (
                    <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">
                          Link gerado
                          {linkPagamento.pedidoCodigo
                            ? ` para ${linkPagamento.pedidoCodigo}`
                            : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => setModalLinkPagamentoAberto(true)}
                          className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                        >
                          Ver QR
                        </button>
                      </div>
                      <p className="truncate rounded-xl bg-white/70 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-100">
                        {linkCompacto(linkPagamento.url)}
                      </p>
                      {linkPagamentoDesatualizado ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                          A venda foi alterada depois da geração. Gere um novo
                          link antes de enviar ao cliente.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={
                      tipoFinalizacao === "PAGO_AGORA"
                        ? confirmarVenda
                        : gerarLinkPagamento
                    }
                    disabled={
                      tipoFinalizacao === "PAGO_AGORA"
                        ? salvando
                        : gerandoLinkPagamento
                    }
                    className={`min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      tipoFinalizacao === "PAGO_AGORA"
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                    }`}
                  >
                    {tipoFinalizacao === "PAGO_AGORA"
                      ? salvando
                        ? "Salvando..."
                        : "Registrar venda paga"
                      : gerandoLinkPagamento
                        ? "Gerando link..."
                        : linkPagamentoDesatualizado
                          ? "Gerar novo link atualizado"
                          : "Gerar link de pagamento"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white px-4 pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.16)] ring-1 ring-slate-200 md:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-screen-sm items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {totalItens} {totalItens === 1 ? "item" : "itens"}
            </p>
            <p className="truncate text-lg font-bold text-slate-950">
              {moeda(totalFinal)}
            </p>
          </div>

          <button
            type="button"
            onClick={
              tipoFinalizacao === "PAGO_AGORA"
                ? confirmarVenda
                : gerarLinkPagamento
            }
            disabled={
              tipoFinalizacao === "PAGO_AGORA" ? salvando : gerandoLinkPagamento
            }
            className={`inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              tipoFinalizacao === "PAGO_AGORA"
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {tipoFinalizacao === "PAGO_AGORA"
              ? salvando
                ? "Salvando..."
                : "Registrar"
              : gerandoLinkPagamento
                ? "Gerando..."
                : "Gerar link"}
          </button>
        </div>
      </div>

      {produtoMedidaSelecionado ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 px-2 py-2 sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {getLabelMedida(produtoMedidaSelecionado)}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Escolha a medida
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModalMedida}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar escolha de medida"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-5 sm:px-6">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <MiniaturaProduto
                  imagemUrl={getImagemProduto(produtoMedidaSelecionado)}
                  nome={produtoMedidaSelecionado.nome}
                />

                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                    {produtoMedidaSelecionado.nome}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {moeda(produtoMedidaSelecionado.precoVenda)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {getMedidasDisponiveis(produtoMedidaSelecionado).map(
                  (medida) => (
                    <button
                      key={medida.valor}
                      type="button"
                      onClick={() => setMedidaSelecionada(medida.valor)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        medidaSelecionada === medida.valor
                          ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {medida.imagemUrl ? (
                          <MiniaturaProduto
                            imagemUrl={medida.imagemUrl}
                            nome={medida.label}
                          />
                        ) : null}

                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-slate-950">
                            {medida.label}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {medida.estoqueDisponivel} em estoque
                          </p>
                        </div>
                      </div>
                    </button>
                  ),
                )}
              </div>

              <div className="grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={fecharModalMedida}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarAdicionarProdutoComMedida}
                  disabled={!medidaSelecionada}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalLinkPagamentoAberto && linkPagamento ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 px-2 py-2 sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Stripe
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Link de pagamento gerado
                </h2>
                {linkPagamento.pedidoCodigo ? (
                  <p className="mt-1 text-sm text-slate-500">
                    Pedido {linkPagamento.pedidoCodigo}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setModalLinkPagamentoAberto(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar link de pagamento"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Pedido
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-950">
                    {linkPagamento.pedidoCodigo || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {moeda(totalFinal)}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-5 text-slate-600">
                Escaneie o QR Code ou envie o link para o cliente.
              </p>

              {linkPagamentoDesatualizado ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  A venda foi alterada depois da geração. Gere um novo link
                  antes de enviar ao cliente.
                </div>
              ) : null}

              <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-3">
                <QRCodeSVG
                  value={linkPagamento.url}
                  size={180}
                  level="M"
                  includeMargin
                  className="h-auto max-w-[180px] sm:max-w-[220px]"
                />
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Link Stripe
                </p>
                <p className="mt-1 truncate text-sm font-medium text-slate-700">
                  {linkCompacto(linkPagamento.url)}
                </p>
              </div>

              {erroPagamento ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {erroPagamento}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={copiarLinkPagamento}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Copiar link
                </button>

                <a
                  href={linkPagamento.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir link
                </a>

                {telefoneWhatsApp && !linkPagamentoDesatualizado ? (
                  <a
                    href={`https://wa.me/${telefoneWhatsApp}?text=${encodeURIComponent(
                      mensagemWhatsApp,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Enviar WhatsApp
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => setModalLinkPagamentoAberto(false)}
                  className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalClienteAberto ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 px-2 py-2 sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[96vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl [&_input]:text-base [&_select]:text-base [&_textarea]:text-base md:[&_input]:text-sm md:[&_select]:text-sm md:[&_textarea]:text-sm">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cliente
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Novo cliente
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cadastre sem sair da venda. Os itens adicionados serão
                  mantidos.
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

            <div className="space-y-5 px-4 py-5 sm:px-6">
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
                      atualizarCampoNovoCliente(
                        "tipoCliente",
                        event.target.value,
                      )
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
                      atualizarCampoNovoCliente(
                        "observacoes",
                        event.target.value,
                      )
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

              <div className="grid gap-3 border-t border-slate-100 pt-5 sm:flex sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModalCliente}
                  disabled={salvandoCliente}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={criarClienteRapido}
                  disabled={salvandoCliente}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
