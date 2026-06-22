"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import ImageBox from "@/components/ui/ImageBox";

type ProdutoStatus = "ATIVO" | "INATIVO" | "NA_LIXEIRA" | string;

type ProdutoFamiliaCampoOption = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  ordem: number;
};

type ProdutoFamiliaProdutoOption = {
  id: string;
  produtoId: string;
  codigoInterno: string;
  nome: string;
  imagemUrl?: string | null;
  ativo: boolean;
  ordem: number;
  produtoAtivo: boolean;
  valores: {
    campoId: string;
    campoNome: string;
    campoSlug: string;
    valor: string;
  }[];
  valoresPorCampo: Record<string, string>;
};

type ProdutoFamiliaOption = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  ordem: number;
  campos?: ProdutoFamiliaCampoOption[];
  produtos?: ProdutoFamiliaProdutoOption[];
};

type ProdutoCatalogItem = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  imagemUrl?: string | null;
  categoria: string;
  fornecedorPadrao: string;

  custoBase: number;
  custoAdicionais: number;
  quantidadeAdicionais: number;
  custoTotal: number;

  margemAplicada: number;
  precoVenda: number;

  descontoAtivo: boolean;
  precoPromocional?: number | null;

  lucroBruto: number;
  margemBruta: number;

  ativo: boolean;
  status: ProdutoStatus;
  statusAntesLixeira?: string | null;
  linkCompra?: string | null;
  estoqueAtual: number;
  valorEstoque: number;
  totalVendas: number;

  familiaId?: string | null;
  familiaNome?: string | null;
  familiaSlug?: string | null;
  familiaMaterial?: string | null;
  familiaCorJoia?: string | null;
  familiaImagemUrl?: string | null;
  familiaOrdem?: number;

  familiaVinculoId?: string | null;
  familiaValores?: {
    campoId: string;
    campoNome: string;
    campoSlug: string;
    valor: string;
  }[];
  familiaValoresPorCampo?: Record<string, string>;
};

type CampoFamiliaFormItem = {
  id?: string;
  tempId: string;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
};

type ProdutoAgrupamentoFormItem = {
  produtoId: string;
  familiaImagemUrl: string;
  familiaOrdem: number;
  valores: Record<string, string>;
};

const STATUS_OPTIONS = [
  { value: "ATIVOS", label: "Ativos" },
  { value: "TODOS", label: "Todos" },
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "NA_LIXEIRA", label: "Na lixeira" },
];

const CAMPOS_PADRAO_FAMILIA: CampoFamiliaFormItem[] = [
  {
    tempId: "material",
    nome: "Material",
    slug: "material",
    ordem: 0,
    ativo: true,
  },
  {
    tempId: "cor-da-joia",
    nome: "Cor da joia",
    slug: "cor-da-joia",
    ordem: 1,
    ativo: true,
  },
];

const SUGESTOES_VALORES: Record<string, string[]> = {
  material: [
    "Prata",
    "Ouro",
    "Dourado",
    "Ródio branco",
    "Ródio negro",
    "Banho ouro",
  ],
  "cor-da-joia": [
    "Vermelha",
    "Azul",
    "Rosa",
    "Verde",
    "Cristal",
    "Preta",
    "Branca",
    "Pérola",
  ],
  pedra: ["Zircônia", "Pérola", "Cristal", "Rubi", "Safira", "Esmeralda"],
  acabamento: ["Polido", "Fosco", "Texturizado", "Escovado"],
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function percentual(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor || 0);
}

function valorInterno(valor: string, mostrarValoresInternos: boolean) {
  return mostrarValoresInternos ? valor : "••••";
}

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function gerarSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function criarTempId() {
  return `campo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function labelStatus(status: string) {
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Oculto";
  if (status === "NA_LIXEIRA") return "Na lixeira";

  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "ATIVO") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "INATIVO") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  if (status === "NA_LIXEIRA") {
    return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusIcon(status: string) {
  if (status === "ATIVO") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }

  if (status === "NA_LIXEIRA") {
    return <Trash2 className="h-3.5 w-3.5" />;
  }

  return <Archive className="h-3.5 w-3.5" />;
}

function getStatusProduto(produto: ProdutoCatalogItem) {
  if (produto.status === "NA_LIXEIRA") {
    return "NA_LIXEIRA";
  }

  return produto.ativo ? "ATIVO" : "INATIVO";
}

function produtoTemDesconto(produto: ProdutoCatalogItem) {
  return (
    produto.descontoAtivo &&
    produto.precoPromocional !== null &&
    produto.precoPromocional !== undefined &&
    produto.precoPromocional > 0 &&
    produto.precoPromocional < produto.precoVenda
  );
}

function getPrecoEfetivo(produto: ProdutoCatalogItem) {
  if (produtoTemDesconto(produto) && produto.precoPromocional) {
    return produto.precoPromocional;
  }

  return produto.precoVenda;
}

function getPercentualDesconto(produto: ProdutoCatalogItem) {
  if (!produtoTemDesconto(produto) || !produto.precoPromocional) {
    return null;
  }

  return Math.round(
    ((produto.precoVenda - produto.precoPromocional) / produto.precoVenda) *
      100
  );
}

function getLucroEfetivo(produto: ProdutoCatalogItem) {
  return getPrecoEfetivo(produto) - produto.custoTotal;
}

function getMargemEfetiva(produto: ProdutoCatalogItem) {
  const precoEfetivo = getPrecoEfetivo(produto);

  if (precoEfetivo <= 0) {
    return 0;
  }

  return ((precoEfetivo - produto.custoTotal) / precoEfetivo) * 100;
}

function getValoresFamiliaProduto(produto: ProdutoCatalogItem) {
  if (produto.familiaValores && produto.familiaValores.length > 0) {
    return produto.familiaValores;
  }

  const valores = [];

  if (produto.familiaMaterial) {
    valores.push({
      campoId: "material",
      campoNome: "Material",
      campoSlug: "material",
      valor: produto.familiaMaterial,
    });
  }

  if (produto.familiaCorJoia) {
    valores.push({
      campoId: "cor-da-joia",
      campoNome: "Cor da joia",
      campoSlug: "cor-da-joia",
      valor: produto.familiaCorJoia,
    });
  }

  return valores;
}

function getNomeVersaoFamilia(produto: ProdutoCatalogItem) {
  const valoresDinamicos = getValoresFamiliaProduto(produto)
    .map((item) => item.valor)
    .filter(Boolean);

  if (valoresDinamicos.length > 0) {
    return valoresDinamicos.join(" · ");
  }

  return "Versão sem nome";
}

function getValorCampoProduto({
  produto,
  campo,
}: {
  produto: ProdutoCatalogItem;
  campo: CampoFamiliaFormItem;
}) {
  const valoresPorCampo = produto.familiaValoresPorCampo || {};
  const valor =
    valoresPorCampo[campo.id || ""] ||
    valoresPorCampo[campo.tempId] ||
    valoresPorCampo[campo.slug] ||
    valoresPorCampo[campo.nome];

  if (valor) {
    return valor;
  }

  if (campo.slug === "material") {
    return produto.familiaMaterial || "";
  }

  if (campo.slug === "cor-da-joia") {
    return produto.familiaCorJoia || "";
  }

  return "";
}

function montarCamposIniciaisFamilia({
  familia,
  produtosBase,
}: {
  familia?: ProdutoFamiliaOption | null;
  produtosBase: ProdutoCatalogItem[];
}): CampoFamiliaFormItem[] {
  if (familia?.campos && familia.campos.length > 0) {
    return familia.campos
      .filter((campo) => campo.ativo)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
      .map((campo, index) => ({
        id: campo.id,
        tempId: campo.id,
        nome: campo.nome,
        slug: campo.slug,
        ordem: Number.isFinite(Number(campo.ordem)) ? campo.ordem : index,
        ativo: campo.ativo,
      }));
  }

  const usaMaterial = produtosBase.some((produto) => produto.familiaMaterial);
  const usaCorJoia = produtosBase.some((produto) => produto.familiaCorJoia);

  const campos = [];

  if (usaMaterial) {
    campos.push(CAMPOS_PADRAO_FAMILIA[0]);
  }

  if (usaCorJoia) {
    campos.push(CAMPOS_PADRAO_FAMILIA[1]);
  }

  if (campos.length > 0) {
    return campos.map((campo) => ({ ...campo }));
  }

  return CAMPOS_PADRAO_FAMILIA.map((campo) => ({ ...campo }));
}

export default function ProdutosCatalogClient({
  produtos,
  familiasDisponiveis = [],
  perfilAdmin,
  podeVerValoresInternos: podeVerValoresInternosProp,
  podeEditarCatalogo: podeEditarCatalogoProp,
}: {
  produtos: ProdutoCatalogItem[];
  familiasDisponiveis?: ProdutoFamiliaOption[];
  perfilAdmin?: "ACESSO_GERAL" | "VENDEDOR" | string;
  podeVerValoresInternos?: boolean;
  podeEditarCatalogo?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isVendedor = perfilAdmin === "VENDEDOR";
  const podeVerValoresInternos =
    podeVerValoresInternosProp ?? perfilAdmin === "ACESSO_GERAL";
  const podeEditarCatalogo =
    podeEditarCatalogoProp ?? perfilAdmin === "ACESSO_GERAL";
  const statusOptionsVisiveis = isVendedor
    ? STATUS_OPTIONS.filter((status) => status.value !== "NA_LIXEIRA")
    : STATUS_OPTIONS;

  const [busca, setBusca] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("ATIVOS");
  const [familiaFiltroId, setFamiliaFiltroId] = useState("TODAS");
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>(
    []
  );
  const [erroLixeira, setErroLixeira] = useState<string | null>(null);
  const [mostrarValoresInternos, setMostrarValoresInternos] = useState(false);
  const [colunasMobile, setColunasMobile] = useState<"1" | "2">("1");
  const exibirValoresInternos =
    podeVerValoresInternos && mostrarValoresInternos;

  const [modalFamiliaAberto, setModalFamiliaAberto] = useState(false);
  const [familiaSelecionadaId, setFamiliaSelecionadaId] = useState("");
  const [familiaNomeEditavel, setFamiliaNomeEditavel] = useState("");
  const [novaFamiliaNome, setNovaFamiliaNome] = useState("");
  const [camposFamilia, setCamposFamilia] = useState<CampoFamiliaFormItem[]>(
    []
  );
  const [itensAgrupamento, setItensAgrupamento] = useState<
    ProdutoAgrupamentoFormItem[]
  >([]);
  const [erroFamilia, setErroFamilia] = useState<string | null>(null);
  const [salvandoFamilia, setSalvandoFamilia] = useState(false);
  const [confirmarMoverFamilia, setConfirmarMoverFamilia] = useState(false);
  const [buscaProdutoFamilia, setBuscaProdutoFamilia] = useState("");

  useEffect(() => {
    const preferencia = window.localStorage.getItem(
      "stella-produtos-mobile-cols"
    );

    if (preferencia === "1" || preferencia === "2") {
      setColunasMobile(preferencia);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("stella-produtos-mobile-cols", colunasMobile);
  }, [colunasMobile]);

  const produtosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

const filtrados = produtos.filter((produto) => {
  const statusProduto = getStatusProduto(produto);

  if (isVendedor && statusProduto === "NA_LIXEIRA") {
    return false;
  }

  if (statusSelecionado === "ATIVOS" && statusProduto === "NA_LIXEIRA") {
    return false;
  }

  if (
    statusSelecionado !== "ATIVOS" &&
    statusSelecionado !== "TODOS" &&
    statusProduto !== statusSelecionado
  ) {
    return false;
  }

  if (familiaFiltroId === "SEM_FAMILIA" && produto.familiaId) {
    return false;
  }

  if (
    familiaFiltroId !== "TODAS" &&
    familiaFiltroId !== "SEM_FAMILIA" &&
    produto.familiaId !== familiaFiltroId
  ) {
    return false;
  }

  if (!termo) {
    return true;
  }

  const texto = normalizarTexto(
    [
      produto.nome,
      produto.codigoInterno,
      produto.codigoFornecedor,
      produto.categoria,
      produto.fornecedorPadrao,
      produto.familiaNome,
      produto.familiaMaterial,
      produto.familiaCorJoia,
      getNomeVersaoFamilia(produto),
      ...getValoresFamiliaProduto(produto).map((item) => item.valor),
      ...Object.values(produto.familiaValoresPorCampo || {}),
      statusProduto,
      produtoTemDesconto(produto) ? "desconto promoção promocional" : "",
      produto.custoAdicionais > 0 ? "adicionais pacote contém" : "",
    ].join(" ")
  );

  return texto.includes(termo);
});

if (
  familiaFiltroId !== "TODAS" &&
  familiaFiltroId !== "SEM_FAMILIA"
) {
  return filtrados.sort((a, b) => {
    const ordemA = Number(a.familiaOrdem || 0);
    const ordemB = Number(b.familiaOrdem || 0);

    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }

    return a.nome.localeCompare(b.nome);
  });
}

return filtrados;
  }, [busca, familiaFiltroId, isVendedor, produtos, statusSelecionado]);

  const produtosSelecionaveis = useMemo(() => {
    return produtosFiltrados.filter(
      (produto) => getStatusProduto(produto) !== "NA_LIXEIRA"
    );
  }, [produtosFiltrados]);

  const produtosSelecionadosObjetos = useMemo(() => {
    const selecionados = new Set(produtosSelecionados);

    return produtos.filter((produto) => selecionados.has(produto.id));
  }, [produtos, produtosSelecionados]);

  const todosSelecionados =
    produtosSelecionaveis.length > 0 &&
    produtosSelecionaveis.every((produto) =>
      produtosSelecionados.includes(produto.id)
    );

  const quantidadeSelecionada = produtosSelecionados.length;
  const quantidadeSemFamilia = useMemo(() => {
  return produtos.filter(
    (produto) =>
      getStatusProduto(produto) !== "NA_LIXEIRA" && !produto.familiaId
  ).length;
}, [produtos]);
  const produtosNoModalIds = useMemo(() => {
  return new Set(itensAgrupamento.map((item) => item.produtoId));
}, [itensAgrupamento]);

const produtosParaAdicionarFamilia = useMemo(() => {
  const termo = normalizarTexto(buscaProdutoFamilia);

  if (termo.length < 2) {
    return [];
  }

  return produtos
    .filter((produto) => {
      if (produtosNoModalIds.has(produto.id)) {
        return false;
      }

      if (getStatusProduto(produto) === "NA_LIXEIRA") {
        return false;
      }

    const texto = normalizarTexto(
      [
        produto.nome,
        produto.codigoInterno,
        produto.codigoFornecedor,
        produto.categoria,
        produto.fornecedorPadrao,
        produto.familiaNome,
        produto.familiaMaterial,
        produto.familiaCorJoia,
        ...getValoresFamiliaProduto(produto).map((item) => item.valor),
        ...Object.values(produto.familiaValoresPorCampo || {}),
      ].join(" ")
    );

      return texto.includes(termo);
    })
    .slice(0, 8);
}, [buscaProdutoFamilia, produtos, produtosNoModalIds]);

  function limparFiltros() {
    setBusca("");
    setStatusSelecionado("ATIVOS");
    setFamiliaFiltroId("TODAS");
    setProdutosSelecionados([]);
  }
  function filtrarPorFamilia(familiaId: string) {
  setBusca("");
  setFamiliaFiltroId(familiaId);
  setStatusSelecionado("ATIVOS");
  setProdutosSelecionados([]);
}
function filtrarSemFamilia() {
  setBusca("");
  setFamiliaFiltroId("SEM_FAMILIA");
  setStatusSelecionado("ATIVOS");
  setProdutosSelecionados([]);
}
  function alternarProdutoSelecionado(produtoId: string) {
    if (!podeEditarCatalogo) {
      return;
    }

    setProdutosSelecionados((selecionados) => {
      if (selecionados.includes(produtoId)) {
        return selecionados.filter((id) => id !== produtoId);
      }

      return [...selecionados, produtoId];
    });
  }

  function alternarTodosSelecionados() {
    if (!podeEditarCatalogo) {
      return;
    }

    if (todosSelecionados) {
      setProdutosSelecionados([]);
      return;
    }

    setProdutosSelecionados(produtosSelecionaveis.map((produto) => produto.id));
  }

  function montarItensAgrupamento({
    produtosBase,
    campos,
  }: {
    produtosBase: ProdutoCatalogItem[];
    campos: CampoFamiliaFormItem[];
  }) {
    return produtosBase.map((produto, index) => {
      const valores = campos.reduce<Record<string, string>>((acc, campo) => {
        acc[campo.tempId] = getValorCampoProduto({ produto, campo });
        return acc;
      }, {});

      return {
        produtoId: produto.id,
        familiaImagemUrl: produto.familiaImagemUrl || produto.imagemUrl || "",
        familiaOrdem: Number.isFinite(Number(produto.familiaOrdem))
          ? Number(produto.familiaOrdem)
          : index,
        valores,
      };
    });
  }

  function prepararModalFamilia({
    produtosBase,
    familiaId,
  }: {
    produtosBase: ProdutoCatalogItem[];
    familiaId?: string | null;
  }) {
    const familia =
      familiasDisponiveis.find((item) => item.id === familiaId) || null;

    const campos = montarCamposIniciaisFamilia({
      familia,
      produtosBase,
    });

    setFamiliaSelecionadaId(familiaId || "");
    setFamiliaNomeEditavel(familia?.nome || "");
    setNovaFamiliaNome("");
    setCamposFamilia(campos);
    setItensAgrupamento(
      montarItensAgrupamento({
        produtosBase,
        campos,
      })
    );
    setConfirmarMoverFamilia(false);
    setErroFamilia(null);
    setBuscaProdutoFamilia("");
    setModalFamiliaAberto(true);
  }

  function abrirModalFamilia() {
    if (produtosSelecionadosObjetos.length === 0) {
      return;
    }

    const familiaIdBase =
      produtosSelecionadosObjetos.find((produto) => produto.familiaId)
        ?.familiaId || "";

    prepararModalFamilia({
      produtosBase: produtosSelecionadosObjetos,
      familiaId: familiaIdBase,
    });
  }

  function abrirEdicaoFamilia(familiaId: string) {
    const produtosDaFamilia = produtos
      .filter((produto) => produto.familiaId === familiaId)
      .sort((a, b) => {
        const ordemA = Number(a.familiaOrdem || 0);
        const ordemB = Number(b.familiaOrdem || 0);

        if (ordemA !== ordemB) return ordemA - ordemB;

        return a.nome.localeCompare(b.nome);
      });

    if (produtosDaFamilia.length === 0) {
      return;
    }

    setProdutosSelecionados(produtosDaFamilia.map((produto) => produto.id));

    prepararModalFamilia({
      produtosBase: produtosDaFamilia,
      familiaId,
    });
  }

  function fecharModalFamilia() {
    if (salvandoFamilia) {
      return;
    }

  setModalFamiliaAberto(false);
  setErroFamilia(null);
  setConfirmarMoverFamilia(false);
  setBuscaProdutoFamilia("");
  }

  function atualizarCampoFamilia(
    tempId: string,
    campo: keyof CampoFamiliaFormItem,
    value: string | number | boolean
  ) {
    setCamposFamilia((atuais) =>
      atuais.map((item) => {
        if (item.tempId !== tempId) {
          return item;
        }

        if (campo === "nome") {
          const nome = String(value || "");
          return {
            ...item,
            nome,
            slug: gerarSlug(nome),
          };
        }

        return {
          ...item,
          [campo]: value,
        };
      })
    );
    setConfirmarMoverFamilia(false);
  }

  function adicionarCampoFamilia() {
    const proximaOrdem = camposFamilia.length;

    const novoCampo: CampoFamiliaFormItem = {
      tempId: criarTempId(),
      nome: "",
      slug: "",
      ordem: proximaOrdem,
      ativo: true,
    };

    setCamposFamilia((atuais) => [...atuais, novoCampo]);
    setItensAgrupamento((atuais) =>
      atuais.map((item) => ({
        ...item,
        valores: {
          ...item.valores,
          [novoCampo.tempId]: "",
        },
      }))
    );
  }

  function removerCampoFamilia(tempId: string) {
    const confirmado = window.confirm(
      "Remover este campo da família? Os valores preenchidos para ele deixarão de ser usados neste agrupamento."
    );

    if (!confirmado) {
      return;
    }

    setCamposFamilia((atuais) =>
      atuais
        .filter((campo) => campo.tempId !== tempId)
        .map((campo, index) => ({
          ...campo,
          ordem: index,
        }))
    );

    setItensAgrupamento((atuais) =>
      atuais.map((item) => {
        const novosValores = { ...item.valores };
        delete novosValores[tempId];

        return {
          ...item,
          valores: novosValores,
        };
      })
    );

    setConfirmarMoverFamilia(false);
  }

  function atualizarItemAgrupamento(
    produtoId: string,
    campo: "familiaImagemUrl" | "familiaOrdem",
    value: string | number
  ) {
    setItensAgrupamento((atuais) =>
      atuais.map((item) =>
        item.produtoId === produtoId
          ? {
              ...item,
              [campo]: value,
            }
          : item
      )
    );
    setConfirmarMoverFamilia(false);
  }

  function atualizarValorCampoProduto({
    produtoId,
    campoTempId,
    value,
  }: {
    produtoId: string;
    campoTempId: string;
    value: string;
  }) {
    setItensAgrupamento((atuais) =>
      atuais.map((item) =>
        item.produtoId === produtoId
          ? {
              ...item,
              valores: {
                ...item.valores,
                [campoTempId]: value,
              },
            }
          : item
      )
    );
    setConfirmarMoverFamilia(false);
  }
  function adicionarProdutoAoModalFamilia(produto: ProdutoCatalogItem) {
  if (produtosNoModalIds.has(produto.id)) {
    return;
  }

  const novaOrdem =
    itensAgrupamento.length > 0
      ? Math.max(...itensAgrupamento.map((item) => Number(item.familiaOrdem || 0))) + 1
      : 0;

  const valores = camposFamilia.reduce<Record<string, string>>((acc, campo) => {
    acc[campo.tempId] = getValorCampoProduto({ produto, campo }) || "";
    return acc;
  }, {});

  setProdutosSelecionados((atuais) =>
    atuais.includes(produto.id) ? atuais : [...atuais, produto.id]
  );

  setItensAgrupamento((atuais) => [
    ...atuais,
    {
      produtoId: produto.id,
      familiaImagemUrl: produto.familiaImagemUrl || produto.imagemUrl || "",
      familiaOrdem: novaOrdem,
      valores,
    },
  ]);

  setBuscaProdutoFamilia("");
  setConfirmarMoverFamilia(false);
  setErroFamilia(null);
}
  async function removerProdutoDaFamilia(produto: ProdutoCatalogItem) {
    if (!familiaSelecionadaId) {
      setProdutosSelecionados((selecionados) =>
        selecionados.filter((id) => id !== produto.id)
      );

      setItensAgrupamento((atuais) =>
        atuais.filter((item) => item.produtoId !== produto.id)
      );

      return;
    }

    const confirmado = window.confirm(
      `Remover "${produto.nome}" desta família? O produto continuará cadastrado normalmente.`
    );

    if (!confirmado) {
      return;
    }

    setBuscaProdutoFamilia("");
    setErroFamilia(null);
    setModalFamiliaAberto(true);

    try {
      const response = await fetch(
        `/api/produtos/familias/${familiaSelecionadaId}/produtos/${produto.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroFamilia(data.error || "Erro ao remover produto da família.");
        return;
      }

      setProdutosSelecionados((selecionados) =>
        selecionados.filter((id) => id !== produto.id)
      );

      setItensAgrupamento((atuais) =>
        atuais.filter((item) => item.produtoId !== produto.id)
      );

      if (data.familiaVazia) {
        setErroFamilia(
          "A família ficou sem produtos. Ela não foi excluída automaticamente."
        );
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      setErroFamilia("Erro ao remover produto da família.");
    } finally {
      setSalvandoFamilia(false);
    }
  }

  async function atualizarNomeFamiliaSeNecessario() {
    if (!familiaSelecionadaId) {
      return true;
    }

    const nome = familiaNomeEditavel.trim();

    if (!nome) {
      setErroFamilia("Informe um nome válido para a família.");
      return false;
    }

    const response = await fetch(`/api/produtos/familias/${familiaSelecionadaId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErroFamilia(data.error || "Erro ao atualizar o nome da família.");
      return false;
    }

    return true;
  }

  async function salvarAgrupamentoFamilia() {
    setErroFamilia(null);

    if (!familiaSelecionadaId && !novaFamiliaNome.trim()) {
      setErroFamilia(
        "Selecione uma família existente ou informe o nome de uma nova família."
      );
      return;
    }

    const camposValidos = camposFamilia
      .map((campo, index) => ({
        ...campo,
        nome: campo.nome.trim(),
        slug: gerarSlug(campo.slug || campo.nome),
        ordem: index,
        ativo: true,
      }))
      .filter((campo) => campo.nome && campo.slug);

    if (camposValidos.length === 0) {
      setErroFamilia("Adicione pelo menos um campo para identificar as versões.");
      return;
    }

    if (itensAgrupamento.length === 0) {
      setErroFamilia("Selecione pelo menos um produto para agrupar.");
      return;
    }

    const possuiValorDuplicado = (() => {
      const chaves = new Set<string>();

      for (const item of itensAgrupamento) {
        const chave = camposValidos
          .map((campo) => item.valores[campo.tempId]?.trim() || "")
          .join("|");

        if (!chave.replaceAll("|", "").trim()) {
          continue;
        }

        if (chaves.has(chave)) {
          return true;
        }

        chaves.add(chave);
      }

      return false;
    })();

    if (possuiValorDuplicado) {
      setErroFamilia(
        "Existem produtos com a mesma combinação de valores. Ajuste os campos para diferenciar cada versão."
      );
      return;
    }

    setSalvandoFamilia(true);

    try {
      const nomeAtualizado = await atualizarNomeFamiliaSeNecessario();

      if (!nomeAtualizado) {
        return;
      }

      const response = await fetch("/api/produtos/familias/agrupar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familiaId: familiaSelecionadaId || null,
          familiaNome: novaFamiliaNome.trim() || null,
          confirmarMover: confirmarMoverFamilia,
          campos: camposValidos,
          produtos: itensAgrupamento.map((item) => {
            const valoresNormalizados = camposValidos.reduce<
              Record<string, string>
            >((acc, campo) => {
              acc[campo.tempId] = item.valores[campo.tempId]?.trim() || "";
              return acc;
            }, {});

            return {
              produtoId: item.produtoId,
              familiaImagemUrl: item.familiaImagemUrl,
              familiaOrdem: item.familiaOrdem,
              valores: valoresNormalizados,

              // Compatibilidade temporária.
              familiaMaterial:
                valoresNormalizados[
                  camposValidos.find((campo) => campo.slug === "material")
                    ?.tempId || ""
                ] || null,
              familiaCorJoia:
                valoresNormalizados[
                  camposValidos.find((campo) => campo.slug === "cor-da-joia")
                    ?.tempId || ""
                ] || null,
            };
          }),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 409 && data.requerConfirmacao) {
        setErroFamilia(data.error || "Confirme a movimentação de família.");
        setConfirmarMoverFamilia(true);
        return;
      }

      if (!response.ok) {
        setErroFamilia(data.error || "Erro ao agrupar produtos.");
        return;
      }

      setModalFamiliaAberto(false);
      setProdutosSelecionados([]);
      setConfirmarMoverFamilia(false);
      setBuscaProdutoFamilia("");

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      setErroFamilia("Erro ao agrupar produtos.");
    } finally {
      setSalvandoFamilia(false);
    }
  }

  async function moverParaLixeira(produto: ProdutoCatalogItem) {
    const confirmado = window.confirm(
      `Mover o produto ${produto.codigoInterno} para a lixeira? Isso não apaga imagem, estoque ou movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    const response = await fetch(`/api/produtos/${produto.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "MOVER" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao mover produto para a lixeira.");
      return;
    }

    setProdutosSelecionados((selecionados) =>
      selecionados.filter((id) => id !== produto.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  async function moverSelecionadosParaLixeira() {
    if (produtosSelecionados.length === 0) {
      return;
    }

    const confirmado = window.confirm(
      `Mover ${produtosSelecionados.length} produto${
        produtosSelecionados.length > 1 ? "s" : ""
      } para a lixeira? Isso não apaga imagens, estoque ou movimentações.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    for (const produtoId of produtosSelecionados) {
      const response = await fetch(`/api/produtos/${produtoId}/lixeira`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acao: "MOVER" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroLixeira(data.error || "Erro ao mover produtos para a lixeira.");
        return;
      }
    }

    setProdutosSelecionados([]);

    startTransition(() => {
      router.refresh();
    });
  }

  async function restaurarDaLixeira(produto: ProdutoCatalogItem) {
    setErroLixeira(null);

    const response = await fetch(`/api/produtos/${produto.id}/lixeira`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "RESTAURAR" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao restaurar produto.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function alternarVisibilidadeLoja(produto: ProdutoCatalogItem) {
    const proximoAtivo = !produto.ativo;
    const confirmado = window.confirm(
      proximoAtivo
        ? `Ativar o produto ${produto.codigoInterno} na loja pública?`
        : `Ocultar o produto ${produto.codigoInterno} da loja pública? Ele continuará cadastrado no sistema.`
    );

    if (!confirmado) {
      return;
    }

    setErroLixeira(null);

    const response = await fetch(`/api/produtos/${produto.id}/ativo`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ativo: proximoAtivo }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setErroLixeira(data.error || "Erro ao alterar visibilidade do produto.");
      return;
    }

    setProdutosSelecionados((selecionados) =>
      selecionados.filter((id) => id !== produto.id)
    );

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Produtos
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Catálogo de Produtos
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              {isVendedor
                ? "Consulte produtos, preços de venda, estoque e status para atendimento e vendas."
                : "Visualize preço, custo, adicionais, lucro, estoque, status e famílias comerciais dos produtos cadastrados."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {podeVerValoresInternos && (
              <button
                type="button"
                onClick={() =>
                  setMostrarValoresInternos((valorAtual) => !valorAtual)
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {mostrarValoresInternos ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {mostrarValoresInternos
                  ? "Ocultar valores internos"
                  : "Mostrar valores internos"}
              </button>
            )}

            {podeEditarCatalogo && (
              <Link
                href="/produtos/novo"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                Novo produto
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_260px_auto]">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Pesquisar
            </span>

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar por nome, código, categoria, família ou fornecedor"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Tag className="h-4 w-4 text-slate-400" />
              Família
            </span>

            <select
              value={familiaFiltroId}
              onChange={(event) => {
                setFamiliaFiltroId(event.target.value);
                setProdutosSelecionados([]);
              }}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="TODAS">Todas as famílias</option>
              <option value="SEM_FAMILIA">Sem família</option>

              {familiasDisponiveis.map((familia) => (
                <option key={familia.id} value={familia.id}>
                  {familia.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4 text-slate-400" />
              Status
            </span>

            <select
              value={statusSelecionado}
              onChange={(event) => {
                setStatusSelecionado(event.target.value);
                setProdutosSelecionados([]);
              }}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              {statusOptionsVisiveis.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limparFiltros}
              className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </button>
          </div>
        </div>

        {erroLixeira && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {erroLixeira}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 md:hidden">
          <span className="text-xs font-semibold text-slate-600">
            Colunas no mobile
          </span>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {(["1", "2"] as const).map((quantidade) => (
              <button
                key={quantidade}
                type="button"
                onClick={() => setColunasMobile(quantidade)}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                  colunasMobile === quantidade
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {quantidade} col.
              </button>
            ))}
          </div>
        </div>

        {podeEditarCatalogo &&
          quantidadeSemFamilia > 0 &&
          familiaFiltroId !== "SEM_FAMILIA" && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">
                {quantidadeSemFamilia} produto
                {quantidadeSemFamilia === 1 ? "" : "s"} sem família comercial
              </p>

              <p className="mt-1 text-xs text-violet-700">
                Revise esses produtos para decidir se devem ser agrupados com versões comerciais.
              </p>
            </div>

            <button
              type="button"
              onClick={filtrarSemFamilia}
              className="rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100"
            >
              Ver produtos sem família
            </button>
          </div>
        )}
      </div>

      {podeEditarCatalogo && quantidadeSelecionada > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {quantidadeSelecionada} produto
                {quantidadeSelecionada > 1
                  ? "s selecionados"
                  : " selecionado"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Agrupe versões da mesma joia ou envie produtos selecionados para
                a lixeira.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={abrirModalFamilia}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Tag className="h-4 w-4" />
                Agrupar como família
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={moverSelecionadosParaLixeira}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Enviar para lixeira
              </button>
            </div>
          </div>
        </div>
      )}

<div className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
  <div>
    <p className="text-sm font-semibold text-slate-900">
      {produtosFiltrados.length} produto
      {produtosFiltrados.length === 1 ? "" : "s"} encontrado
      {produtosFiltrados.length === 1 ? "" : "s"}
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {familiaFiltroId !== "TODAS" && familiaFiltroId !== "SEM_FAMILIA"
        ? "Produtos filtrados por família e ordenados pela ordem configurada no agrupamento."
        : familiaFiltroId === "SEM_FAMILIA"
        ? "Exibindo produtos que ainda não pertencem a nenhuma família comercial."
        : podeEditarCatalogo
        ? "Use os checkboxes dos cards para ações em lote."
        : "Consulte produtos, preços, estoque e status para atendimento."}
    </p>
  </div>

  {podeEditarCatalogo && (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={todosSelecionados}
        disabled={produtosSelecionaveis.length === 0}
        onChange={alternarTodosSelecionados}
        className="h-4 w-4 rounded border-slate-300"
      />
      Selecionar todos visíveis
    </label>
  )}
</div>

{produtosFiltrados.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          Nenhum produto encontrado.
        </div>
      ) : (
        <div
          className={`grid ${
            colunasMobile === "2" ? "grid-cols-2 gap-3" : "grid-cols-1 gap-4"
          } sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4`}
        >
          {produtosFiltrados.map((produto) => {
            const statusProduto = getStatusProduto(produto);
            const produtoNaLixeira = statusProduto === "NA_LIXEIRA";
            const emDesconto = produtoTemDesconto(produto);
            const percentualDesconto = getPercentualDesconto(produto);
            const precoEfetivo = getPrecoEfetivo(produto);
            const lucroEfetivo = getLucroEfetivo(produto);
            const margemEfetiva = getMargemEfetiva(produto);
            const possuiFamilia = Boolean(produto.familiaId);
            const valoresFamilia = getValoresFamiliaProduto(produto);

            return (
              <div
                key={produto.id}
                className={`relative flex h-full flex-col overflow-hidden bg-white shadow-sm ring-1 ${
                  colunasMobile === "2"
                    ? "rounded-2xl p-2.5 sm:rounded-3xl sm:p-4"
                    : "rounded-3xl p-4"
                } ${
                  emDesconto ? "ring-amber-200" : "ring-slate-200"
                } ${produtoNaLixeira ? "opacity-75" : ""}`}
              >
                {podeEditarCatalogo && (
                  <div className="absolute left-4 top-4 z-10 rounded-xl bg-white/90 px-2 py-1 shadow-sm">
                    <input
                      type="checkbox"
                      checked={produtosSelecionados.includes(produto.id)}
                      disabled={produtoNaLixeira}
                      onChange={() => alternarProdutoSelecionado(produto.id)}
                      className="h-4 w-4 rounded border-slate-300"
                      aria-label={`Selecionar produto ${produto.codigoInterno}`}
                    />
                  </div>
                )}

                <div className="relative">
                  <ImageBox src={produto.imagemUrl} alt={produto.nome} />

                  {emDesconto && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                      <Tag className="h-3.5 w-3.5" />
                      {percentualDesconto
                        ? `-${percentualDesconto}%`
                        : "Desconto"}
                    </div>
                  )}
                </div>

                <div
                  className={`flex flex-1 flex-col ${
                    colunasMobile === "2" ? "mt-2.5 sm:mt-4" : "mt-4"
                  }`}
                >
                  <div
                    className={`flex items-start ${
                      colunasMobile === "2"
                        ? "flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3"
                        : "justify-between gap-3"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {produto.codigoInterno}
                      </p>

                      <h2
                        className={`mt-1 line-clamp-2 font-semibold text-slate-900 ${
                          colunasMobile === "2" ? "text-sm sm:text-base" : "text-base"
                        }`}
                      >
                        {produto.nome}
                      </h2>

                      <div
                        className={`mt-2 flex flex-wrap gap-1.5 ${
                          colunasMobile === "2" ? "max-sm:hidden" : ""
                        }`}
                      >
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {produto.categoria}
                        </span>

                        {possuiFamilia && produto.familiaId && (
                          <button
                            type="button"
                            onClick={() => filtrarPorFamilia(produto.familiaId!)}
                            className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
                            title="Filtrar esta família"
                          >
                            Família: {produto.familiaNome}
                          </button>
                        )}

                        {valoresFamilia.map((valor) => (
                          <span
                            key={`${produto.id}-${valor.campoId}-${valor.valor}`}
                            className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                          >
                            {valor.campoNome}: {valor.valor}
                          </span>
                        ))}

                        {podeVerValoresInternos && produto.custoAdicionais > 0 && (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            <Package className="mr-1 h-3.5 w-3.5" />
                            {produto.quantidadeAdicionais} adicional
                            {produto.quantidadeAdicionais === 1 ? "" : "is"}
                          </span>
                        )}

                        {emDesconto && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            <Tag className="h-3.5 w-3.5" />
                            Em desconto
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                        colunasMobile === "2" ? "max-sm:px-2 max-sm:py-0.5" : ""
                      } ${statusClass(
                        statusProduto
                      )}`}
                    >
                      {statusIcon(statusProduto)}
                      {labelStatus(statusProduto)}
                    </span>
                  </div>

                  {podeEditarCatalogo && possuiFamilia && produto.familiaId && (
                    <button
                      type="button"
                      onClick={() => abrirEdicaoFamilia(produto.familiaId!)}
                      className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                    >
                      Editar família completa
                    </button>
                  )}

                  <div
                    className={`border border-slate-200 bg-slate-50 ${
                      colunasMobile === "2"
                        ? "mt-3 rounded-2xl p-2.5 sm:mt-4 sm:rounded-3xl sm:p-3"
                        : "mt-4 rounded-3xl p-3"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Venda
                        </p>

                        <p
                          className={`mt-1 font-bold text-slate-950 ${
                            colunasMobile === "2" ? "text-base sm:text-xl" : "text-xl"
                          }`}
                        >
                          {moeda(produto.precoVenda)}
                        </p>

                        {emDesconto && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Promo: {moeda(precoEfetivo)}
                          </p>
                        )}
                      </div>

                      {podeVerValoresInternos && (
                        <div className="text-right">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Lucro
                          </p>

                          <p
                            className={`mt-1 text-base font-bold ${
                              !exibirValoresInternos
                                ? "text-slate-400"
                                : lucroEfetivo < 0
                                ? "text-red-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {valorInterno(
                              moeda(lucroEfetivo),
                              exibirValoresInternos
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {valorInterno(
                              `${percentual(margemEfetiva)}%`,
                              exibirValoresInternos
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <Info label="Estoque" value={`${produto.estoqueAtual} un.`} />

                    {podeVerValoresInternos && (
                      <div
                        className={`contents ${
                          colunasMobile === "2" ? "max-sm:hidden" : ""
                        }`}
                      >
                        <Info
                          label="Custo produto"
                          value={valorInterno(
                            moeda(Number(produto.custoBase)),
                            exibirValoresInternos
                          )}
                        />

                        <Info
                          label="Adicionais"
                          value={valorInterno(
                            moeda(Number(produto.custoAdicionais)),
                            exibirValoresInternos
                          )}
                        />

                        <Info
                          label="Custo total"
                          value={valorInterno(
                            moeda(Number(produto.custoTotal)),
                            exibirValoresInternos
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {podeVerValoresInternos && produto.linkCompra ? (
                    <a
                      href={produto.linkCompra}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-3 text-xs font-medium text-slate-700 underline underline-offset-4 transition hover:text-slate-900 ${
                        colunasMobile === "2" ? "max-sm:hidden" : ""
                      }`}
                    >
                      Ver link de compra
                    </a>
                  ) : podeVerValoresInternos ? (
                    <p
                      className={`mt-3 text-xs text-slate-400 ${
                        colunasMobile === "2" ? "max-sm:hidden" : ""
                      }`}
                    >
                      Sem link de compra
                    </p>
                  ) : null}

                  {podeVerValoresInternos && produto.totalVendas > 0 && (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Este produto possui {produto.totalVendas} registro
                      {produto.totalVendas > 1 ? "s" : ""} de venda.
                    </p>
                  )}

                  {podeEditarCatalogo && (
                  <div className="mt-4 flex gap-2">
                    {produtoNaLixeira ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => restaurarDaLixeira(produto)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Restaurar
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/produtos/${produto.id}`}
                          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Editar
                        </Link>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => alternarVisibilidadeLoja(produto)}
                          className={`inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            produto.ativo
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={
                            produto.ativo
                              ? "Ocultar da loja pública"
                              : "Ativar na loja pública"
                          }
                        >
                          {produto.ativo ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => moverParaLixeira(produto)}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Mover para lixeira"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {podeEditarCatalogo && modalFamiliaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Família de produtos
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  Agrupar versões da mesma joia
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Crie campos como Material, Cor da joia, Pedra ou Acabamento
                  para identificar versões comerciais relacionadas.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalFamilia}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {erroFamilia && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroFamilia}

                  {confirmarMoverFamilia && (
                    <p className="mt-2 text-xs font-medium">
                      Clique em salvar novamente para confirmar a movimentação.
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Família existente
                  </span>

                  <select
                    value={familiaSelecionadaId}
                    onChange={(event) => {
                      const novoFamiliaId = event.target.value;
                      const familia =
                        familiasDisponiveis.find(
                          (item) => item.id === novoFamiliaId
                        ) || null;

                      setFamiliaSelecionadaId(novoFamiliaId);
                      setConfirmarMoverFamilia(false);

                      if (novoFamiliaId) {
                        setNovaFamiliaNome("");
                        setFamiliaNomeEditavel(familia?.nome || "");

                        const produtosBase =
                          produtosSelecionadosObjetos.length > 0
                            ? produtosSelecionadosObjetos
                            : produtos;

                        const campos = montarCamposIniciaisFamilia({
                          familia,
                          produtosBase,
                        });

                        setCamposFamilia(campos);
                        setItensAgrupamento(
                          montarItensAgrupamento({
                            produtosBase: produtosSelecionadosObjetos,
                            campos,
                          })
                        );
                      } else {
                        setFamiliaNomeEditavel("");
                      }
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">Criar nova família</option>

                    {familiasDisponiveis.map((familia) => (
                      <option key={familia.id} value={familia.id}>
                        {familia.nome}
                      </option>
                    ))}
                  </select>
                </label>

                {familiaSelecionadaId ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Nome da família
                    </span>

                    <input
                      value={familiaNomeEditavel}
                      onChange={(event) => {
                        setFamiliaNomeEditavel(event.target.value);
                        setConfirmarMoverFamilia(false);
                      }}
                      placeholder="Ex: Anel Coração"
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                    />
                  </label>
                ) : (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Nome da nova família
                    </span>

                    <input
                      value={novaFamiliaNome}
                      onChange={(event) => {
                        setNovaFamiliaNome(event.target.value);
                        setConfirmarMoverFamilia(false);
                      }}
                      placeholder="Ex: Anel Coração"
                      className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
                    />
                  </label>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Campos da família
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Use campos para diferenciar os produtos agrupados. Ex:
                      Material, Cor da joia, Pedra, Acabamento.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={adicionarCampoFamilia}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar campo
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {camposFamilia.map((campo, index) => (
                    <div
                      key={campo.tempId}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_90px_auto]">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Nome do campo
                          </span>

                          <input
                            value={campo.nome}
                            onChange={(event) =>
                              atualizarCampoFamilia(
                                campo.tempId,
                                "nome",
                                event.target.value
                              )
                            }
                            placeholder="Material, Pedra..."
                            className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Ordem
                          </span>

                          <input
                            type="number"
                            value={campo.ordem}
                            onChange={(event) =>
                              atualizarCampoFamilia(
                                campo.tempId,
                                "ordem",
                                Number(event.target.value || index)
                              )
                            }
                            className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                          />
                        </label>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removerCampoFamilia(campo.tempId)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                            title="Remover campo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Identificador: {campo.slug || "gerado ao salvar"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Campos de família são apenas agrupamento visual/comercial.
                Tamanho, medida e comprimento continuam como variações internas
                do produto.
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-slate-950">
                Adicionar produto à família
              </p>

              <p className="text-sm leading-6 text-slate-500">
                Busque por nome, SKU interno ou código do fornecedor. A foto ajuda a
                conferir se é a joia correta antes de adicionar.
              </p>
            </div>

  <div className="mt-4">
    <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 transition focus-within:border-slate-500">
      <Search className="h-4 w-4 text-slate-400" />

      <input
        value={buscaProdutoFamilia}
        onChange={(event) => setBuscaProdutoFamilia(event.target.value)}
        placeholder="Buscar por nome, SKU interno, código fornecedor, categoria ou família"
        className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
    </label>
  </div>

  {buscaProdutoFamilia.trim().length >= 2 && (
    <div className="mt-3 space-y-2">
      {produtosParaAdicionarFamilia.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Nenhum produto encontrado para essa busca.
        </div>
      ) : (
        produtosParaAdicionarFamilia.map((produto) => {
          const estaEmOutraFamilia = Boolean(
            produto.familiaId && produto.familiaId !== familiaSelecionadaId
          );

          return (
            <div
              key={produto.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[72px_1fr_auto]"
            >
              <div className="overflow-hidden rounded-2xl bg-white">
                <ImageBox src={produto.imagemUrl} alt={produto.nome} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {produto.codigoInterno}
                  {produto.codigoFornecedor
                    ? ` · Forn.: ${produto.codigoFornecedor}`
                    : ""}
                </p>

                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-950">
                  {produto.nome}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    {produto.categoria}
                  </span>

                  {produto.familiaNome ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                        estaEmOutraFamilia
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-violet-50 text-violet-700 ring-violet-200"
                      }`}
                    >
                      Família atual: {produto.familiaNome}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Sem família
                    </span>
                  )}

                  {estaEmOutraFamilia && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      Será movido ao salvar
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => adicionarProdutoAoModalFamilia(produto)}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                >
                  {estaEmOutraFamilia ? "Adicionar e mover" : "Adicionar"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  )}
</div>
              <div className="space-y-3">
                {produtosSelecionadosObjetos.map((produto, index) => {
                  const item = itensAgrupamento.find(
                    (agrupamento) => agrupamento.produtoId === produto.id
                  );

                  if (!item) {
                    return null;
                  }

                  return (
                    <div
                      key={produto.id}
                      className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[120px_1fr]"
                    >
                      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                        <ImageBox src={produto.imagemUrl} alt={produto.nome} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              {produto.codigoInterno}
                            </p>

                            <h3 className="mt-1 text-base font-semibold text-slate-950">
                              {produto.nome}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                              Ordem {index + 1}
                            </span>

                            <button
                              type="button"
                              onClick={() => removerProdutoDaFamilia(produto)}
                              disabled={salvandoFamilia}
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Remover da família
                            </button>
                          </div>
                        </div>

                        <div
                          className={`mt-4 grid gap-3 ${
                            camposFamilia.length <= 2
                              ? "md:grid-cols-2"
                              : "md:grid-cols-3"
                          }`}
                        >
                          {camposFamilia.map((campo) => {
                            const sugestoes =
                              SUGESTOES_VALORES[campo.slug] || [];

                            return (
                              <label key={campo.tempId} className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  {campo.nome || "Campo sem nome"}
                                </span>

                                <input
                                  list={
                                    sugestoes.length > 0
                                      ? `sugestoes-${produto.id}-${campo.tempId}`
                                      : undefined
                                  }
                                  value={item.valores[campo.tempId] || ""}
                                  onChange={(event) =>
                                    atualizarValorCampoProduto({
                                      produtoId: produto.id,
                                      campoTempId: campo.tempId,
                                      value: event.target.value,
                                    })
                                  }
                                  placeholder={`Valor para ${
                                    campo.nome || "campo"
                                  }`}
                                  className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                                />

                                {sugestoes.length > 0 && (
                                  <datalist
                                    id={`sugestoes-${produto.id}-${campo.tempId}`}
                                  >
                                    {sugestoes.map((sugestao) => (
                                      <option
                                        key={sugestao}
                                        value={sugestao}
                                      />
                                    ))}
                                  </datalist>
                                )}
                              </label>
                            );
                          })}

                          <label className="block md:col-span-full">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Imagem do seletor
                            </span>

                            <input
                              value={item.familiaImagemUrl}
                              onChange={(event) =>
                                atualizarItemAgrupamento(
                                  produto.id,
                                  "familiaImagemUrl",
                                  event.target.value
                                )
                              }
                              placeholder="Usa a imagem principal por padrão"
                              className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>
                        </div>

                        <div className="mt-3">
                          <label className="block max-w-[180px]">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Ordem
                            </span>

                            <input
                              type="number"
                              value={item.familiaOrdem}
                              onChange={(event) =>
                                atualizarItemAgrupamento(
                                  produto.id,
                                  "familiaOrdem",
                                  Number(event.target.value || 0)
                                )
                              }
                              className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModalFamilia}
                  disabled={salvandoFamilia}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarAgrupamentoFamilia}
                  disabled={salvandoFamilia}
                  className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvandoFamilia
                    ? "Salvando..."
                    : confirmarMoverFamilia
                    ? "Confirmar e salvar"
                    : "Salvar família"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}
