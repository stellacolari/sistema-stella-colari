import "server-only";

import { prisma } from "@/lib/prisma";
import {
  extrairIntencaoSnapshot,
  montarIntencaoAgregada,
  type ConfiancaAnaliseIntencao,
} from "@/lib/produtos/metricas-produto";

type EventoComercialLeve = {
  tipo: string;
  produtoId: string | null;
  categoriaId: string | null;
  paginaId: string | null;
  blocoId: string | null;
  termoBusca: string | null;
  origem: string | null;
  sessionId: string | null;
  metadataJson: unknown;
};

export type IntencaoProduto = {
  produtoId: string;
  nome: string;
  codigoInterno: string;
  categoria: string;
  imagemUrl: string | null;
  precoVenda: number;
  precoPromocional: number | null;
  descontoAtivo: boolean;
  estoqueTotal: number;
  visualizacoes: number;
  favoritos: number;
  desfavoritos: number;
  adicoesCarrinho: number;
  remocoesCarrinho: number;
  cliquesBusca: number;
  cliquesVitrine: number;
  cliquesBanner: number;
  checkoutsIniciados: number;
  vendasQuantidade: number;
  receita: number;
  score: number;
  scoreInteresse: number;
  scoreConversao: number;
  taxaFavorito: number;
  taxaCarrinho: number;
  taxaConversao: number;
  confiancaAnalise: ConfiancaAnaliseIntencao;
  diagnostico: string;
};

export type IntencaoBusca = {
  termo: string;
  quantidade: number;
};

export type IntencaoConteudo = {
  chave: string;
  tipo: string;
  blocoId: string | null;
  label: string;
  href: string;
  quantidade: number;
};

export type IntencaoCategoria = {
  categoriaId: string;
  nome: string;
  slug: string;
  cliques: number;
};

export type IntencaoComercialResumo = {
  eventos: number;
  sessoes: number;
  visualizacoesProduto: number;
  favoritos: number;
  adicoesCarrinho: number;
  remocoesCarrinho: number;
  buscas: number;
  buscasSemResultado: number;
  cliquesResultadoBusca: number;
  cliquesConteudo: number;
  checkoutsIniciados: number;
};

export type IntencaoComercialDashboard = {
  periodo: {
    inicio: Date;
    fim: Date;
    dias: number;
  };
  resumo: IntencaoComercialResumo;
  produtos: IntencaoProduto[];
  produtosPromissores: IntencaoProduto[];
  produtosTravados: IntencaoProduto[];
  produtosPoucoTestados: IntencaoProduto[];
  buscasFrequentes: IntencaoBusca[];
  buscasSemResultado: IntencaoBusca[];
  conteudosClicados: IntencaoConteudo[];
  categoriasClicadas: IntencaoCategoria[];
};

type ProdutoAccumulator = {
  produtoId: string;
  visualizacoes: number;
  favoritos: number;
  desfavoritos: number;
  adicoesCarrinho: number;
  remocoesCarrinho: number;
  cliquesBusca: number;
  cliquesVitrine: number;
  cliquesBanner: number;
  checkoutsIniciados: number;
};

function incrementar(map: Map<string, number>, key: string | null | undefined) {
  const cleanKey = String(key || "").trim();

  if (!cleanKey) return;

  map.set(cleanKey, (map.get(cleanKey) || 0) + 1);
}

function topMap(map: Map<string, number>, take: number): IntencaoBusca[] {
  return Array.from(map.entries())
    .map(([termo, quantidade]) => ({ termo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.termo.localeCompare(b.termo))
    .slice(0, take);
}

function metadataRecord(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function metadataString(value: unknown, key: string) {
  const item = metadataRecord(value)[key];

  return typeof item === "string" ? item : "";
}

function diagnosticoProduto(produto: {
  vendasQuantidade: number;
  visualizacoes: number;
  favoritos: number;
  adicoesCarrinho: number;
  remocoesCarrinho: number;
  scoreInteresse: number;
  taxaConversao: number;
}) {
  if (produto.vendasQuantidade > 0 && produto.scoreInteresse >= 20) {
    return "Validado por venda";
  }

  if (produto.adicoesCarrinho >= 2 && produto.vendasQuantidade === 0) {
    return "Carrinho sem conversao";
  }

  if (produto.favoritos >= 3 && produto.vendasQuantidade === 0) {
    return "Favoritado sem venda";
  }

  if (produto.visualizacoes >= 8 && produto.adicoesCarrinho === 0) {
    return "Muita vitrine, pouco desejo";
  }

  if (
    produto.scoreInteresse >= 30 &&
    produto.vendasQuantidade === 0 &&
    produto.taxaConversao <= 0
  ) {
    return "Interesse sem conversao";
  }

  if (produto.scoreInteresse >= 18 && produto.vendasQuantidade === 0) {
    return "Promissor";
  }

  return "Observacao";
}

function somarVendas(
  map: Map<string, { quantidade: number; receita: number }>,
  produtoId: string | null,
  quantidade: number,
  receita: number
) {
  if (!produtoId) return;

  const atual = map.get(produtoId) || { quantidade: 0, receita: 0 };

  atual.quantidade += quantidade;
  atual.receita += receita;
  map.set(produtoId, atual);
}

export async function montarIntencaoComercial({
  dias = 30,
}: {
  dias?: number;
} = {}): Promise<IntencaoComercialDashboard> {
  const diasSeguro = Math.min(Math.max(Math.round(dias || 30), 7), 120);
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - diasSeguro);

  const eventos: EventoComercialLeve[] = await prisma.eventoComercial.findMany({
    where: {
      criadoEm: {
        gte: inicio,
        lte: fim,
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
    take: 20_000,
    select: {
      tipo: true,
      produtoId: true,
      categoriaId: true,
      paginaId: true,
      blocoId: true,
      termoBusca: true,
      origem: true,
      sessionId: true,
      metadataJson: true,
    },
  });

  const sessoes = new Set<string>();
  const produtosMap = new Map<string, ProdutoAccumulator>();
  const buscasMap = new Map<string, number>();
  const buscasSemResultadoMap = new Map<string, number>();
  const conteudosMap = new Map<string, IntencaoConteudo>();
  const categoriasMap = new Map<string, number>();

  const resumo: IntencaoComercialResumo = {
    eventos: eventos.length,
    sessoes: 0,
    visualizacoesProduto: 0,
    favoritos: 0,
    adicoesCarrinho: 0,
    remocoesCarrinho: 0,
    buscas: 0,
    buscasSemResultado: 0,
    cliquesResultadoBusca: 0,
    cliquesConteudo: 0,
    checkoutsIniciados: 0,
  };

  function getProdutoAcc(produtoId: string | null) {
    if (!produtoId) return null;

    const atual =
      produtosMap.get(produtoId) ||
      ({
        produtoId,
        visualizacoes: 0,
        favoritos: 0,
        desfavoritos: 0,
        adicoesCarrinho: 0,
        remocoesCarrinho: 0,
        cliquesBusca: 0,
        cliquesVitrine: 0,
        cliquesBanner: 0,
        checkoutsIniciados: 0,
      } satisfies ProdutoAccumulator);

    produtosMap.set(produtoId, atual);

    return atual;
  }

  eventos.forEach((evento) => {
    if (evento.sessionId) {
      sessoes.add(evento.sessionId);
    }

    const produto = getProdutoAcc(evento.produtoId);

    if (evento.tipo === "PRODUTO_VISUALIZADO") {
      resumo.visualizacoesProduto += 1;
      if (produto) produto.visualizacoes += 1;
    }

    if (evento.tipo === "PRODUTO_FAVORITADO") {
      resumo.favoritos += 1;
      if (produto) produto.favoritos += 1;
    }

    if (evento.tipo === "PRODUTO_DESFAVORITADO" && produto) {
      produto.desfavoritos += 1;
    }

    if (evento.tipo === "PRODUTO_ADICIONADO_CARRINHO") {
      resumo.adicoesCarrinho += 1;
      if (produto) produto.adicoesCarrinho += 1;
    }

    if (evento.tipo === "PRODUTO_REMOVIDO_CARRINHO") {
      resumo.remocoesCarrinho += 1;
      if (produto) produto.remocoesCarrinho += 1;
    }

    if (evento.tipo === "BUSCA_REALIZADA") {
      resumo.buscas += 1;
      incrementar(buscasMap, evento.termoBusca);
    }

    if (evento.tipo === "BUSCA_SEM_RESULTADO") {
      resumo.buscasSemResultado += 1;
      incrementar(buscasSemResultadoMap, evento.termoBusca);
    }

    if (evento.tipo === "BUSCA_RESULTADO_CLICADO") {
      resumo.cliquesResultadoBusca += 1;
      if (produto) produto.cliquesBusca += 1;
    }

    if (
      evento.tipo === "VITRINE_EDITORIAL_CLICADA" ||
      evento.tipo === "BANNER_CTA_CLICADO"
    ) {
      resumo.cliquesConteudo += 1;
      if (produto && evento.tipo === "VITRINE_EDITORIAL_CLICADA") {
        produto.cliquesVitrine += 1;
      }
      if (produto && evento.tipo === "BANNER_CTA_CLICADO") {
        produto.cliquesBanner += 1;
      }
      const label =
        metadataString(evento.metadataJson, "label") ||
        metadataString(evento.metadataJson, "titulo") ||
        evento.blocoId ||
        evento.origem ||
        "Conteudo";
      const href = metadataString(evento.metadataJson, "href");
      const chave = `${evento.tipo}:${evento.blocoId || label}:${href}`;
      const atual =
        conteudosMap.get(chave) ||
        ({
          chave,
          tipo: evento.tipo,
          blocoId: evento.blocoId,
          label,
          href,
          quantidade: 0,
        } satisfies IntencaoConteudo);

      atual.quantidade += 1;
      conteudosMap.set(chave, atual);
    }

    if (evento.tipo === "CHECKOUT_INICIADO") {
      resumo.checkoutsIniciados += 1;
      if (produto) produto.checkoutsIniciados += 1;
    }

    if (evento.tipo === "CATEGORIA_CLICADA") {
      incrementar(categoriasMap, evento.categoriaId);
    }
  });

  resumo.sessoes = sessoes.size;

  const produtoIds = Array.from(produtosMap.keys());
  const [produtosRaw, pedidosItens, vendasItens] = await Promise.all([
    produtoIds.length
      ? prisma.produto.findMany({
          where: {
            id: {
              in: produtoIds,
            },
          },
          select: {
            id: true,
            codigoInterno: true,
            nome: true,
            categoria: true,
            imagemUrl: true,
            precoVenda: true,
            precoPromocional: true,
            descontoAtivo: true,
            estoque: {
              select: {
                quantidadeAtual: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    produtoIds.length
      ? prisma.pedidoOnlineItem.findMany({
          where: {
            produtoId: {
              in: produtoIds,
            },
            pedidoOnline: {
              criadoEm: {
                gte: inicio,
                lte: fim,
              },
              status: {
                not: "CANCELADO",
              },
              statusPagamento: "PAGO",
            },
          },
          select: {
            produtoId: true,
            quantidade: true,
            total: true,
          },
        })
      : Promise.resolve([]),
    produtoIds.length
      ? prisma.vendaItem.findMany({
          where: {
            produtoId: {
              in: produtoIds,
            },
            venda: {
              criadoEm: {
                gte: inicio,
                lte: fim,
              },
              status: {
                notIn: ["CANCELADA", "NA_LIXEIRA"],
              },
            },
          },
          select: {
            produtoId: true,
            quantidade: true,
            valorTotal: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const vendasMap = new Map<string, { quantidade: number; receita: number }>();

  pedidosItens.forEach((item) => {
    somarVendas(
      vendasMap,
      item.produtoId,
      Number(item.quantidade || 0),
      Number(item.total || 0)
    );
  });

  vendasItens.forEach((item) => {
    somarVendas(
      vendasMap,
      item.produtoId,
      Number(item.quantidade || 0),
      Number(item.valorTotal || 0)
    );
  });

  const produtosPorId = new Map(produtosRaw.map((produto) => [produto.id, produto]));
  const produtos = Array.from(produtosMap.values())
    .map((acc): IntencaoProduto | null => {
      const produto = produtosPorId.get(acc.produtoId);

      if (!produto) return null;

      const vendas = vendasMap.get(acc.produtoId) || {
        quantidade: 0,
        receita: 0,
      };
      const estoqueTotal = produto.estoque.reduce(
        (total, estoque) => total + Number(estoque.quantidadeAtual || 0),
        0
      );
      const intencao = montarIntencaoAgregada(acc, vendas.quantidade, estoqueTotal);
      const itemBase = {
        vendasQuantidade: vendas.quantidade,
        visualizacoes: acc.visualizacoes,
        favoritos: acc.favoritos,
        adicoesCarrinho: acc.adicoesCarrinho,
        remocoesCarrinho: acc.remocoesCarrinho,
        scoreInteresse: intencao.scoreInteresse,
        taxaConversao: intencao.taxaConversao,
      };

      return {
        produtoId: acc.produtoId,
        nome: produto.nome,
        codigoInterno: produto.codigoInterno,
        categoria: produto.categoria,
        imagemUrl: produto.imagemUrl,
        precoVenda: Number(produto.precoVenda || 0),
        precoPromocional:
          produto.precoPromocional === null
            ? null
            : Number(produto.precoPromocional || 0),
        descontoAtivo: produto.descontoAtivo,
        estoqueTotal,
        visualizacoes: acc.visualizacoes,
        favoritos: acc.favoritos,
        desfavoritos: acc.desfavoritos,
        adicoesCarrinho: acc.adicoesCarrinho,
        remocoesCarrinho: acc.remocoesCarrinho,
        cliquesBusca: acc.cliquesBusca,
        cliquesVitrine: acc.cliquesVitrine,
        cliquesBanner: acc.cliquesBanner,
        checkoutsIniciados: acc.checkoutsIniciados,
        vendasQuantidade: vendas.quantidade,
        receita: vendas.receita,
        score: intencao.scoreInteresse,
        scoreInteresse: intencao.scoreInteresse,
        scoreConversao: intencao.scoreConversao,
        taxaFavorito: intencao.taxaFavorito,
        taxaCarrinho: intencao.taxaCarrinho,
        taxaConversao: intencao.taxaConversao,
        confiancaAnalise: intencao.confiancaAnalise,
        diagnostico: diagnosticoProduto(itemBase),
      };
    })
    .filter((produto): produto is IntencaoProduto => Boolean(produto))
    .sort((a, b) => b.score - a.score || b.visualizacoes - a.visualizacoes)
    .slice(0, 40);

  const metricasPoucoTestadasRaw = await prisma.produtoMetricaSnapshot.findMany({
    where: {
      periodoTipo: "ATUAL",
      statusComercial: "NAO_TESTADO",
      produto: {
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
      },
    },
    select: {
      produtoId: true,
      tamanhoAnel: true,
      vendasQuantidade: true,
      receita: true,
      dadosJson: true,
      criadoEm: true,
      produto: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          categoria: true,
          imagemUrl: true,
          precoVenda: true,
          precoPromocional: true,
          descontoAtivo: true,
          estoque: {
            select: {
              quantidadeAtual: true,
            },
          },
        },
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
    take: 80,
  });
  const metricaPoucoTestadaPorProduto = new Map<
    string,
    (typeof metricasPoucoTestadasRaw)[number]
  >();

  metricasPoucoTestadasRaw.forEach((metrica) => {
    const atual = metricaPoucoTestadaPorProduto.get(metrica.produtoId);

    if (!atual || (atual.tamanhoAnel !== "TODOS" && metrica.tamanhoAnel === "TODOS")) {
      metricaPoucoTestadaPorProduto.set(metrica.produtoId, metrica);
    }
  });

  const produtosPoucoTestados = Array.from(metricaPoucoTestadaPorProduto.values())
    .map((metrica): IntencaoProduto => {
      const produto = metrica.produto;
      const estoqueTotal = produto.estoque.reduce(
        (total, estoque) => total + Number(estoque.quantidadeAtual || 0),
        0
      );
      const intencao = extrairIntencaoSnapshot(metrica.dadosJson);

      return {
        produtoId: produto.id,
        nome: produto.nome,
        codigoInterno: produto.codigoInterno,
        categoria: produto.categoria,
        imagemUrl: produto.imagemUrl,
        precoVenda: Number(produto.precoVenda || 0),
        precoPromocional:
          produto.precoPromocional === null
            ? null
            : Number(produto.precoPromocional || 0),
        descontoAtivo: produto.descontoAtivo,
        estoqueTotal,
        visualizacoes: intencao.visualizacoes,
        favoritos: intencao.favoritos,
        desfavoritos: intencao.desfavoritos,
        adicoesCarrinho: intencao.adicoesCarrinho,
        remocoesCarrinho: intencao.remocoesCarrinho,
        cliquesBusca: intencao.cliquesBusca,
        cliquesVitrine: intencao.cliquesVitrine,
        cliquesBanner: intencao.cliquesBanner,
        checkoutsIniciados: intencao.checkoutsIniciados,
        vendasQuantidade: Number(metrica.vendasQuantidade || 0),
        receita: Number(metrica.receita || 0),
        score: intencao.scoreInteresse,
        scoreInteresse: intencao.scoreInteresse,
        scoreConversao: intencao.scoreConversao,
        taxaFavorito: intencao.taxaFavorito,
        taxaCarrinho: intencao.taxaCarrinho,
        taxaConversao: intencao.taxaConversao,
        confiancaAnalise: intencao.confiancaAnalise,
        diagnostico: "Pouco testado",
      };
    })
    .sort((a, b) => a.visualizacoes - b.visualizacoes || a.nome.localeCompare(b.nome))
    .slice(0, 8);

  const categoriaIds = Array.from(categoriasMap.keys());
  const categoriasRaw = categoriaIds.length
    ? await prisma.categoriaProduto.findMany({
        where: {
          id: {
            in: categoriaIds,
          },
        },
        select: {
          id: true,
          nome: true,
          slug: true,
        },
      })
    : [];
  const categoriasPorId = new Map(
    categoriasRaw.map((categoria) => [categoria.id, categoria])
  );

  return {
    periodo: {
      inicio,
      fim,
      dias: diasSeguro,
    },
    resumo,
    produtos,
    produtosPromissores: produtos
      .filter((produto) => produto.vendasQuantidade === 0 && produto.scoreInteresse >= 18)
      .slice(0, 8),
    produtosTravados: produtos
      .filter(
        (produto) =>
          produto.vendasQuantidade === 0 &&
          (produto.scoreInteresse >= 30 ||
            produto.adicoesCarrinho >= 2 ||
            produto.favoritos >= 3)
      )
      .slice(0, 8),
    produtosPoucoTestados,
    buscasFrequentes: topMap(buscasMap, 12),
    buscasSemResultado: topMap(buscasSemResultadoMap, 12),
    conteudosClicados: Array.from(conteudosMap.values())
      .sort((a, b) => b.quantidade - a.quantidade || a.label.localeCompare(b.label))
      .slice(0, 12),
    categoriasClicadas: Array.from(categoriasMap.entries())
      .map(([categoriaId, cliques]) => {
        const categoria = categoriasPorId.get(categoriaId);

        return categoria
          ? {
              categoriaId,
              nome: categoria.nome,
              slug: categoria.slug,
              cliques,
            }
          : null;
      })
      .filter((categoria): categoria is IntencaoCategoria => Boolean(categoria))
      .sort((a, b) => b.cliques - a.cliques || a.nome.localeCompare(b.nome))
      .slice(0, 12),
  };
}
