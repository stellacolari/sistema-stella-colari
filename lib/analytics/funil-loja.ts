import "server-only";

import { prisma } from "@/lib/prisma";
import {
  montarIntencaoComercial,
  type IntencaoBusca,
  type IntencaoProduto,
} from "@/lib/loja/intencao-comercial";

export const PERIODOS_FUNIL_LOJA = [7, 30, 90] as const;

export type PeriodoFunilLoja = (typeof PERIODOS_FUNIL_LOJA)[number];

export type ConfiabilidadeFunilLoja = "sem_dados" | "baixa" | "media" | "alta";

export type FunilLojaEtapaId =
  | "busca_realizada"
  | "produto_visualizado"
  | "favorito"
  | "carrinho"
  | "checkout"
  | "pedido_criado"
  | "pedido_pago";

export type FunilLojaEtapa = {
  id: FunilLojaEtapaId;
  nome: string;
  descricao: string;
  contagem: number;
  contagemAnterior: number;
  taxaProxima: number | null;
  variacaoPercentual: number | null;
  confiabilidade: ConfiabilidadeFunilLoja;
  observacao: string;
};

export type ProdutoFunilLoja = {
  produtoId: string;
  nome: string;
  categoria: string;
  imagemUrl: string | null;
  visualizacoes: number;
  favoritos: number;
  adicoesCarrinho: number;
  checkoutsIniciados: number;
  vendasQuantidade: number;
  scoreInteresse: number;
  diagnostico: string;
};

export type BuscaFunilLoja = IntencaoBusca & {
  oportunidade: string;
  acaoSugerida: string;
};

export type GargaloFunilLoja = {
  titulo: string;
  descricao: string;
  gravidade: "dados" | "sinal" | "atencao";
  acaoSugerida: string;
};

export type FunilAnalyticsLoja = {
  periodo: {
    dias: PeriodoFunilLoja;
    inicio: Date;
    fim: Date;
  };
  resumo: {
    eventosAnalisados: number;
    sessoes: number;
    pedidosCriados: number;
    pedidosPagos: number;
    confiabilidade: ConfiabilidadeFunilLoja;
    amostraPequena: boolean;
  };
  etapas: FunilLojaEtapa[];
  produtos: {
    maisVisualizados: ProdutoFunilLoja[];
    maisFavoritados: ProdutoFunilLoja[];
    maisCarrinho: ProdutoFunilLoja[];
    intencaoSemVenda: ProdutoFunilLoja[];
  };
  buscas: {
    frequentes: BuscaFunilLoja[];
    semResultado: BuscaFunilLoja[];
  };
  gargalos: GargaloFunilLoja[];
  acoesSugeridas: string[];
  estadoVazio: boolean;
};

type ResumoEventosPeriodo = {
  eventos: number;
  sessoes: number;
  porTipo: Record<string, number>;
};

type ResumoPedidosPeriodo = {
  criados: number;
  pagos: number;
};

export function normalizarPeriodoFunilLoja(
  value: string | number | undefined | null
): PeriodoFunilLoja {
  const numero = Number(value);

  return PERIODOS_FUNIL_LOJA.includes(numero as PeriodoFunilLoja)
    ? (numero as PeriodoFunilLoja)
    : 30;
}

function subtrairDias(base: Date, dias: number) {
  const result = new Date(base);
  result.setDate(result.getDate() - dias);

  return result;
}

function arredondarPercentual(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 10) / 10;
}

function calcularVariacaoPercentual(atual: number, anterior: number) {
  if (anterior <= 0) return atual > 0 ? null : 0;

  return arredondarPercentual(((atual - anterior) / anterior) * 100);
}

function calcularTaxaProxima(atual: number, proxima?: number) {
  if (!proxima || atual <= 0) return null;

  return arredondarPercentual((proxima / atual) * 100);
}

function confiabilidadeGeral(eventos: number, pedidosPagos: number) {
  if (eventos <= 0 && pedidosPagos <= 0) return "sem_dados";
  if (eventos < 30 || pedidosPagos < 2) return "baixa";
  if (eventos < 150 || pedidosPagos < 5) return "media";

  return "alta";
}

function confiabilidadeEtapa(
  contagem: number,
  confiabilidade: ConfiabilidadeFunilLoja
): ConfiabilidadeFunilLoja {
  if (contagem <= 0) return "sem_dados";
  if (confiabilidade === "sem_dados") return "baixa";
  if (contagem < 5) return "baixa";

  return confiabilidade;
}

async function buscarResumoEventosPeriodo(
  inicio: Date,
  fim: Date
): Promise<ResumoEventosPeriodo> {
  const where = {
    criadoEm: {
      gte: inicio,
      lte: fim,
    },
  };

  const [grupos, eventos, sessoes] = await Promise.all([
    prisma.eventoComercial.groupBy({
      by: ["tipo"],
      where,
      _count: {
        _all: true,
      },
    }),
    prisma.eventoComercial.count({
      where,
    }),
    prisma.eventoComercial.findMany({
      where: {
        ...where,
        sessionId: {
          not: null,
        },
      },
      distinct: ["sessionId"],
      select: {
        sessionId: true,
      },
      take: 20_000,
    }),
  ]);

  return {
    eventos,
    sessoes: sessoes.length,
    porTipo: Object.fromEntries(
      grupos.map((grupo) => [grupo.tipo, grupo._count._all])
    ),
  };
}

async function buscarResumoPedidosPeriodo(
  inicio: Date,
  fim: Date
): Promise<ResumoPedidosPeriodo> {
  const [criados, pagos] = await Promise.all([
    prisma.pedidoOnline.count({
      where: {
        criadoEm: {
          gte: inicio,
          lte: fim,
        },
        status: {
          not: "CANCELADO",
        },
      },
    }),
    prisma.pedidoOnline.count({
      where: {
        status: {
          not: "CANCELADO",
        },
        statusPagamento: "PAGO",
        OR: [
          {
            pagoEm: {
              gte: inicio,
              lte: fim,
            },
          },
          {
            pagoEm: null,
            criadoEm: {
              gte: inicio,
              lte: fim,
            },
          },
        ],
      },
    }),
  ]);

  return {
    criados,
    pagos,
  };
}

function tipoEvento(resumo: ResumoEventosPeriodo, tipo: string) {
  return resumo.porTipo[tipo] || 0;
}

function mapearProduto(produto: IntencaoProduto): ProdutoFunilLoja {
  return {
    produtoId: produto.produtoId,
    nome: produto.nome,
    categoria: produto.categoria,
    imagemUrl: produto.imagemUrl,
    visualizacoes: produto.visualizacoes,
    favoritos: produto.favoritos,
    adicoesCarrinho: produto.adicoesCarrinho,
    checkoutsIniciados: produto.checkoutsIniciados,
    vendasQuantidade: produto.vendasQuantidade,
    scoreInteresse: produto.scoreInteresse,
    diagnostico: produto.diagnostico,
  };
}

function topProdutos(
  produtos: IntencaoProduto[],
  campo: keyof Pick<
    IntencaoProduto,
    "visualizacoes" | "favoritos" | "adicoesCarrinho" | "scoreInteresse"
  >,
  take = 5
) {
  return [...produtos]
    .filter((produto) => Number(produto[campo] || 0) > 0)
    .sort(
      (a, b) =>
        Number(b[campo] || 0) - Number(a[campo] || 0) ||
        b.scoreInteresse - a.scoreInteresse ||
        a.nome.localeCompare(b.nome, "pt-BR")
    )
    .slice(0, take)
    .map(mapearProduto);
}

function produtosIntencaoSemVenda(produtos: IntencaoProduto[]) {
  const ids = new Set<string>();

  return [...produtos]
    .filter(
      (produto) =>
        produto.vendasQuantidade <= 0 &&
        (produto.scoreInteresse >= 18 ||
          produto.adicoesCarrinho > 0 ||
          produto.favoritos > 0)
    )
    .sort(
      (a, b) =>
        b.scoreInteresse - a.scoreInteresse ||
        b.adicoesCarrinho - a.adicoesCarrinho ||
        b.favoritos - a.favoritos ||
        a.nome.localeCompare(b.nome, "pt-BR")
    )
    .filter((produto) => {
      if (ids.has(produto.produtoId)) return false;
      ids.add(produto.produtoId);
      return true;
    })
    .slice(0, 6)
    .map(mapearProduto);
}

function mapearBusca(item: IntencaoBusca, semResultado: boolean): BuscaFunilLoja {
  return {
    ...item,
    oportunidade:
      semResultado && item.quantidade >= 3
        ? "Alta"
        : semResultado
          ? "Media"
          : "Sinal de demanda",
    acaoSugerida: semResultado
      ? "Revisar nome, tags, categoria ou cadastrar produto relacionado."
      : "Conferir se os produtos certos aparecem e se o termo merece destaque.",
  };
}

function montarGargalos(params: {
  eventos: number;
  buscasSemResultado: number;
  visualizacoes: number;
  carrinho: number;
  checkout: number;
  pedidosCriados: number;
  pedidosPagos: number;
  amostraPequena: boolean;
}) {
  const gargalos: GargaloFunilLoja[] = [];

  if (params.eventos <= 0 && params.pedidosCriados <= 0) {
    return [
      {
        titulo: "Dados insuficientes",
        descricao:
          "Ainda nao ha eventos ou pedidos suficientes para ler abandono da jornada.",
        gravidade: "dados",
        acaoSugerida:
          "Acompanhar a coleta antes de tomar decisoes de marketing, compra ou recomendacao.",
      },
    ] satisfies GargaloFunilLoja[];
  }

  if (params.amostraPequena) {
    gargalos.push({
      titulo: "Amostra pequena",
      descricao: "Os sinais existem, mas ainda podem oscilar muito de um periodo para outro.",
      gravidade: "dados",
      acaoSugerida: "Use como sinal, nao como verdade definitiva.",
    });
  }

  if (params.buscasSemResultado > 0) {
    gargalos.push({
      titulo: "Buscas sem resultado",
      descricao: "Clientes procuraram termos que nao retornaram produto suficiente.",
      gravidade: "atencao",
      acaoSugerida:
        "Revisar nomes, tags, categorias e oportunidades de cadastro de produto.",
    });
  }

  if (params.visualizacoes >= 10 && params.carrinho === 0) {
    gargalos.push({
      titulo: "Muitos veem, poucos adicionam ao carrinho",
      descricao: "A vitrine gera visita, mas o produto ainda nao vira intencao forte.",
      gravidade: "sinal",
      acaoSugerida:
        "Revisar foto, descricao, destaque e clareza da oferta antes de aumentar trafego.",
    });
  }

  if (
    params.carrinho >= 3 &&
    calcularTaxaProxima(params.carrinho, params.checkout) !== null &&
    Number(calcularTaxaProxima(params.carrinho, params.checkout)) < 30
  ) {
    gargalos.push({
      titulo: "Checkout iniciado baixo",
      descricao: "Ha produto no carrinho, mas poucos avancam para checkout.",
      gravidade: "atencao",
      acaoSugerida:
        "Revisar clareza do carrinho, frete visivel e confianca visual antes do pagamento.",
    });
  }

  if (
    params.checkout >= 3 &&
    calcularTaxaProxima(params.checkout, params.pedidosCriados) !== null &&
    Number(calcularTaxaProxima(params.checkout, params.pedidosCriados)) < 40
  ) {
    gargalos.push({
      titulo: "Checkout sem pedido",
      descricao: "O cliente inicia checkout, mas nem sempre chega ao pedido criado.",
      gravidade: "atencao",
      acaoSugerida:
        "Validar visualmente o checkout e observar se ha atrito de formulario ou frete.",
    });
  }

  if (
    params.pedidosCriados >= 2 &&
    calcularTaxaProxima(params.pedidosCriados, params.pedidosPagos) !== null &&
    Number(calcularTaxaProxima(params.pedidosCriados, params.pedidosPagos)) < 50
  ) {
    gargalos.push({
      titulo: "Pedido criado sem pagamento",
      descricao: "Ha pedidos criados que nao aparecem como pagos no periodo.",
      gravidade: "sinal",
      acaoSugerida:
        "Acompanhar pedidos pendentes manualmente, sem alterar Stripe ou regras de pedido.",
    });
  }

  if (gargalos.length === 0) {
    gargalos.push({
      titulo: "Sem gargalo forte",
      descricao: "Nao apareceu perda evidente no periodo selecionado.",
      gravidade: "sinal",
      acaoSugerida:
        "Continuar coletando dados antes de mudar campanhas, produtos ou recomendacoes.",
    });
  }

  return gargalos.slice(0, 6);
}

function montarAcoesSugeridas(params: {
  gargalos: GargaloFunilLoja[];
  buscasSemResultado: number;
  produtosSemVenda: number;
  eventos: number;
}) {
  const acoes = new Set<string>();

  params.gargalos.forEach((gargalo) => acoes.add(gargalo.acaoSugerida));

  if (params.eventos < 30) {
    acoes.add("Aguardar mais dados antes de acionar IA, campanha ou compra.");
  }

  if (params.buscasSemResultado > 0) {
    acoes.add("Criar uma rotina manual para revisar termos sem resultado toda semana.");
  }

  if (params.produtosSemVenda > 0) {
    acoes.add("Melhorar foto, descricao ou exposicao de produtos com interesse sem venda.");
  }

  acoes.add("Comparar 7, 30 e 90 dias antes de concluir tendencia.");

  return Array.from(acoes).slice(0, 7);
}

function montarEtapas(params: {
  atual: {
    busca: number;
    produto: number;
    favorito: number;
    carrinho: number;
    checkout: number;
    pedidoCriado: number;
    pedidoPago: number;
  };
  anterior: {
    busca: number;
    produto: number;
    favorito: number;
    carrinho: number;
    checkout: number;
    pedidoCriado: number;
    pedidoPago: number;
  };
  confiabilidade: ConfiabilidadeFunilLoja;
}) {
  const etapasBase = [
    {
      id: "busca_realizada",
      nome: "Busca realizada",
      descricao: "Termos digitados na busca da loja.",
      contagem: params.atual.busca,
      anterior: params.anterior.busca,
      observacao: "Mostra demanda declarada, mas nao representa visitante unico.",
    },
    {
      id: "produto_visualizado",
      nome: "Produto visualizado",
      descricao: "Acessos a paginas ou cards de produto rastreados.",
      contagem: params.atual.produto,
      anterior: params.anterior.produto,
      observacao: "Bom sinal de interesse inicial quando combinado com carrinho e favorito.",
    },
    {
      id: "favorito",
      nome: "Favorito",
      descricao: "Produtos salvos como favoritos.",
      contagem: params.atual.favorito,
      anterior: params.anterior.favorito,
      observacao: "Sinal de desejo, especialmente quando ainda nao ha compra.",
    },
    {
      id: "carrinho",
      nome: "Adicionado ao carrinho",
      descricao: "Itens adicionados ao carrinho.",
      contagem: params.atual.carrinho,
      anterior: params.anterior.carrinho,
      observacao: "Sinal forte, mas ainda contado por evento e nao por cliente unico.",
    },
    {
      id: "checkout",
      nome: "Checkout iniciado",
      descricao: "Inicio visual do checkout publico.",
      contagem: params.atual.checkout,
      anterior: params.anterior.checkout,
      observacao: "Indica avanco, sem validar pagamento ou alterar checkout.",
    },
    {
      id: "pedido_criado",
      nome: "Pedido criado",
      descricao: "Pedidos online criados no periodo.",
      contagem: params.atual.pedidoCriado,
      anterior: params.anterior.pedidoCriado,
      observacao: "Contagem operacional sem valores financeiros.",
    },
    {
      id: "pedido_pago",
      nome: "Pedido pago",
      descricao: "Pedidos pagos no periodo.",
      contagem: params.atual.pedidoPago,
      anterior: params.anterior.pedidoPago,
      observacao: "Contagem de conversao final sem receita, margem ou custo.",
    },
  ] satisfies Array<{
    id: FunilLojaEtapaId;
    nome: string;
    descricao: string;
    contagem: number;
    anterior: number;
    observacao: string;
  }>;

  return etapasBase.map((etapa, index): FunilLojaEtapa => {
    const proxima = etapasBase[index + 1];

    return {
      id: etapa.id,
      nome: etapa.nome,
      descricao: etapa.descricao,
      contagem: etapa.contagem,
      contagemAnterior: etapa.anterior,
      taxaProxima: calcularTaxaProxima(etapa.contagem, proxima?.contagem),
      variacaoPercentual: calcularVariacaoPercentual(etapa.contagem, etapa.anterior),
      confiabilidade: confiabilidadeEtapa(etapa.contagem, params.confiabilidade),
      observacao: etapa.contagem > 0 ? etapa.observacao : "Sem dados suficientes.",
    };
  });
}

export async function montarFunilAnalyticsLoja({
  dias = 30,
}: {
  dias?: number;
} = {}): Promise<FunilAnalyticsLoja> {
  const periodo = normalizarPeriodoFunilLoja(dias);
  const fim = new Date();
  const inicio = subtrairDias(fim, periodo);
  const inicioAnterior = subtrairDias(inicio, periodo);

  const [intencao, eventosAtual, eventosAnterior, pedidosAtual, pedidosAnterior] =
    await Promise.all([
      montarIntencaoComercial({ dias: periodo }),
      buscarResumoEventosPeriodo(inicio, fim),
      buscarResumoEventosPeriodo(inicioAnterior, inicio),
      buscarResumoPedidosPeriodo(inicio, fim),
      buscarResumoPedidosPeriodo(inicioAnterior, inicio),
    ]);

  const confiabilidade = confiabilidadeGeral(eventosAtual.eventos, pedidosAtual.pagos);
  const amostraPequena = confiabilidade === "sem_dados" || confiabilidade === "baixa";
  const atual = {
    busca: intencao.resumo.buscas,
    produto: intencao.resumo.visualizacoesProduto,
    favorito: intencao.resumo.favoritos,
    carrinho: intencao.resumo.adicoesCarrinho,
    checkout: intencao.resumo.checkoutsIniciados,
    pedidoCriado: pedidosAtual.criados,
    pedidoPago: pedidosAtual.pagos,
  };
  const anterior = {
    busca: tipoEvento(eventosAnterior, "BUSCA_REALIZADA"),
    produto: tipoEvento(eventosAnterior, "PRODUTO_VISUALIZADO"),
    favorito: tipoEvento(eventosAnterior, "PRODUTO_FAVORITADO"),
    carrinho: tipoEvento(eventosAnterior, "PRODUTO_ADICIONADO_CARRINHO"),
    checkout: tipoEvento(eventosAnterior, "CHECKOUT_INICIADO"),
    pedidoCriado: pedidosAnterior.criados,
    pedidoPago: pedidosAnterior.pagos,
  };
  const intencaoSemVenda = produtosIntencaoSemVenda(intencao.produtos);
  const buscasSemResultado = intencao.buscasSemResultado.map((item) =>
    mapearBusca(item, true)
  );
  const gargalos = montarGargalos({
    eventos: eventosAtual.eventos,
    buscasSemResultado: intencao.resumo.buscasSemResultado,
    visualizacoes: intencao.resumo.visualizacoesProduto,
    carrinho: intencao.resumo.adicoesCarrinho,
    checkout: intencao.resumo.checkoutsIniciados,
    pedidosCriados: pedidosAtual.criados,
    pedidosPagos: pedidosAtual.pagos,
    amostraPequena,
  });

  return {
    periodo: {
      dias: periodo,
      inicio: intencao.periodo.inicio,
      fim: intencao.periodo.fim,
    },
    resumo: {
      eventosAnalisados: eventosAtual.eventos,
      sessoes: eventosAtual.sessoes,
      pedidosCriados: pedidosAtual.criados,
      pedidosPagos: pedidosAtual.pagos,
      confiabilidade,
      amostraPequena,
    },
    etapas: montarEtapas({
      atual,
      anterior,
      confiabilidade,
    }),
    produtos: {
      maisVisualizados: topProdutos(intencao.produtos, "visualizacoes"),
      maisFavoritados: topProdutos(intencao.produtos, "favoritos"),
      maisCarrinho: topProdutos(intencao.produtos, "adicoesCarrinho"),
      intencaoSemVenda,
    },
    buscas: {
      frequentes: intencao.buscasFrequentes.map((item) => mapearBusca(item, false)),
      semResultado: buscasSemResultado,
    },
    gargalos,
    acoesSugeridas: montarAcoesSugeridas({
      gargalos,
      buscasSemResultado: buscasSemResultado.length,
      produtosSemVenda: intencaoSemVenda.length,
      eventos: eventosAtual.eventos,
    }),
    estadoVazio: eventosAtual.eventos <= 0 && pedidosAtual.criados <= 0,
  };
}
