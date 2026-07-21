import "server-only";

import type { ColecaoInteligente, ColecaoInteligenteProduto, Prisma, Produto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analisarPrecificacaoProdutos } from "@/lib/financeiro/precificacao-inteligente";
import { montarIntencaoComercial } from "@/lib/loja/intencao-comercial";

export const COLECOES_INTELIGENTES_TIPOS = [
  "EM_DESTAQUE",
  "ALTA_INTENCAO",
  "POUCO_TESTADOS",
  "CAMPEOES_PROVAVEIS",
  "ESTOQUE_PARADO",
  "PARA_PRESENTEAR",
  "CAMPANHA_ATIVA",
  "MARGEM_PROTEGIDA",
  "NOVIDADES",
  "GIRO_CONTROLADO",
  "PERSONALIZADA",
] as const;

export const COLECOES_INTELIGENTES_STATUS = ["RASCUNHO", "ATIVA", "PAUSADA", "ARQUIVADA"] as const;
export const COLECOES_INTELIGENTES_MODOS = ["MANUAL", "SUGERIDA", "DINAMICA", "APROVADA_FIXA"] as const;
export const COLECOES_INTELIGENTES_PRODUTO_STATUS = ["SUGERIDO", "APROVADO", "REMOVIDO", "IGNORADO"] as const;

type TipoColecao = (typeof COLECOES_INTELIGENTES_TIPOS)[number];

type ProdutoBase = {
  id: string;
  codigoInterno: string;
  nome: string;
  categoria: string;
  imagemUrl: string | null;
  imagemHoverUrl: string | null;
  tagsComerciais: string | null;
  criadoEm: Date;
  precoVenda: number;
  custoBase: number;
  estoqueTotal: number;
  vendidosTotal: number;
  visualizacoes: number;
  favoritos: number;
  adicoesCarrinho: number;
  scoreInteresse: number;
  statusComercial: string;
  vendasQuantidade: number;
  sellThroughPeriodo: number;
  classificacaoPrecificacao: string;
  margemBrutaPct: number;
  descontoPermitido: boolean;
  campanhaAberta: boolean;
};

function numero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function textoColecao(tipo: TipoColecao) {
  const textos: Record<TipoColecao, { nome: string; descricao: string }> = {
    EM_DESTAQUE: {
      nome: "Em destaque",
      descricao: "Produtos com bom equilibrio entre estoque, interesse, imagem e margem.",
    },
    ALTA_INTENCAO: {
      nome: "Alta intencao",
      descricao: "Produtos com sinais recentes de visualizacao, favorito ou carrinho.",
    },
    POUCO_TESTADOS: {
      nome: "Pouco testados",
      descricao: "Produtos com estoque e pouca exposicao para ganhar leitura antes de desconto.",
    },
    CAMPEOES_PROVAVEIS: {
      nome: "Campeoes provaveis",
      descricao: "Produtos com venda real, sell-through ou status comercial forte.",
    },
    ESTOQUE_PARADO: {
      nome: "Estoque parado",
      descricao: "Produtos com estoque e baixo giro para exposicao controlada.",
    },
    PARA_PRESENTEAR: {
      nome: "Para presentear",
      descricao: "Produtos com perfil de presente, boa apresentacao e disponibilidade.",
    },
    CAMPANHA_ATIVA: {
      nome: "Campanha ativa",
      descricao: "Produtos vinculados ou aderentes a campanhas abertas.",
    },
    MARGEM_PROTEGIDA: {
      nome: "Margem protegida",
      descricao: "Produtos para exposicao sem incentivo automatico de desconto.",
    },
    NOVIDADES: {
      nome: "Novidades",
      descricao: "Produtos recentes, ativos, com estoque e imagem.",
    },
    GIRO_CONTROLADO: {
      nome: "Giro controlado",
      descricao: "Produtos para trabalhar giro com cuidado de margem.",
    },
    PERSONALIZADA: {
      nome: "Personalizada",
      descricao: "Colecao montada manualmente.",
    },
  };

  return textos[tipo];
}

function codigoColecao(tipo: TipoColecao) {
  return `COL-${tipo}`;
}

function motivoColecao(produto: ProdutoBase, tipo: TipoColecao, score: number) {
  const partes = [`Score ${Math.round(score)}`];
  if (produto.scoreInteresse > 0) partes.push(`${produto.scoreInteresse} pts de intencao`);
  if (produto.vendasQuantidade > 0) partes.push(`${produto.vendasQuantidade} venda(s)`);
  if (produto.margemBrutaPct > 0) partes.push(`margem ${Math.round(produto.margemBrutaPct)}%`);
  if (produto.campanhaAberta) partes.push("campanha aberta");
  if (tipo === "POUCO_TESTADOS") partes.push("precisa ganhar exposicao");
  if (tipo === "MARGEM_PROTEGIDA") partes.push("exposicao sem desconto automatico");
  return partes.join(" | ");
}

export function calcularScoreProdutoColecao(produto: ProdutoBase, tipo: TipoColecao) {
  let score = 0;
  score += Math.min(produto.scoreInteresse, 70);
  score += Math.min(produto.visualizacoes * 1.4, 24);
  score += Math.min(produto.favoritos * 4, 20);
  score += Math.min(produto.adicoesCarrinho * 5, 24);
  score += Math.min(produto.estoqueTotal * 1.5, 18);
  score += Math.min(produto.margemBrutaPct / 2, 28);
  if (produto.imagemUrl || produto.imagemHoverUrl) score += 18;
  if (produto.estoqueTotal <= 0) score -= 120;
  if (produto.classificacaoPrecificacao === "DADOS_INSUFICIENTES") score -= 20;
  if (produto.classificacaoPrecificacao === "DESCONTO_BLOQUEADO" && ["CAMPANHA_ATIVA", "GIRO_CONTROLADO"].includes(tipo)) score -= 30;

  if (tipo === "EM_DESTAQUE") {
    if (produto.scoreInteresse >= 15 || produto.campanhaAberta) score += 18;
    if (produto.margemBrutaPct >= 45) score += 12;
  }
  if (tipo === "ALTA_INTENCAO") score += produto.scoreInteresse * 1.3 + produto.favoritos * 4 + produto.adicoesCarrinho * 5;
  if (tipo === "POUCO_TESTADOS") {
    if (produto.visualizacoes <= 8) score += 20;
    if (produto.vendasQuantidade === 0) score += 12;
  }
  if (tipo === "CAMPEOES_PROVAVEIS") {
    if (produto.statusComercial === "CAMPEAO_PROVAVEL") score += 35;
    score += produto.sellThroughPeriodo * 0.4;
  }
  if (tipo === "ESTOQUE_PARADO" || tipo === "GIRO_CONTROLADO") {
    if (produto.statusComercial === "ESTOQUE_PARADO") score += 35;
    if (produto.estoqueTotal >= 3) score += 12;
  }
  if (tipo === "PARA_PRESENTEAR") {
    if (`${produto.tagsComerciais || ""} ${produto.categoria} ${produto.nome}`.toLowerCase().includes("presente")) score += 24;
    if (produto.precoVenda >= 80 && produto.precoVenda <= 260) score += 12;
  }
  if (tipo === "CAMPANHA_ATIVA" && produto.campanhaAberta) score += 45;
  if (tipo === "MARGEM_PROTEGIDA") {
    if (produto.classificacaoPrecificacao === "MARGEM_PROTEGIDA") score += 35;
    if (!produto.descontoPermitido) score += 10;
  }
  if (tipo === "NOVIDADES") score += Math.max(0, 30 - (Date.now() - produto.criadoEm.getTime()) / 86400000);

  return Math.round(score * 100) / 100;
}

export function selecionarProdutosParaColecao(produtos: ProdutoBase[], tipo: TipoColecao, limite = 12) {
  const existeImagem = produtos.some((produto) => produto.imagemUrl || produto.imagemHoverUrl);
  const agressiva = ["EM_DESTAQUE", "ALTA_INTENCAO", "CAMPEOES_PROVAVEIS", "CAMPANHA_ATIVA"].includes(tipo);
  const elegiveis = produtos.filter((produto) => {
    if (produto.estoqueTotal <= 0) return false;
    if (existeImagem && !produto.imagemUrl && !produto.imagemHoverUrl) return false;
    if (agressiva && produto.classificacaoPrecificacao === "DADOS_INSUFICIENTES") return false;
    if (["CAMPANHA_ATIVA", "GIRO_CONTROLADO"].includes(tipo) && produto.classificacaoPrecificacao === "DESCONTO_BLOQUEADO") return false;
    if (["EM_DESTAQUE", "MARGEM_PROTEGIDA"].includes(tipo) && produto.custoBase <= 0) return false;
    return true;
  });

  return elegiveis
    .map((produto) => ({ produto, score: calcularScoreProdutoColecao(produto, tipo) }))
    .sort((a, b) => b.score - a.score || a.produto.nome.localeCompare(b.produto.nome, "pt-BR"))
    .slice(0, Math.max(3, Math.min(12, limite)))
    .map((item, index) => ({
      produto: item.produto,
      score: item.score,
      ordem: index,
      motivo: motivoColecao(item.produto, tipo, item.score),
    }));
}

async function montarProdutosBase(): Promise<ProdutoBase[]> {
  const [intencao, precificacao, campanhas, produtosRaw] = await Promise.all([
    montarIntencaoComercial({ dias: 30 }),
    analisarPrecificacaoProdutos(),
    prisma.campanhaComercial.findMany({
      where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
      select: { produtoId: true, produtosJson: true },
    }),
    prisma.produto.findMany({
      where: { ativo: true, status: { not: "NA_LIXEIRA" } },
      select: {
        id: true,
        codigoInterno: true,
        nome: true,
        categoria: true,
        imagemUrl: true,
        imagemHoverUrl: true,
        tagsComerciais: true,
        criadoEm: true,
        precoVenda: true,
        custoBase: true,
        estoque: { select: { quantidadeAtual: true } },
        metricasSnapshots: {
          orderBy: { periodoFim: "desc" },
          take: 1,
          select: { vendasQuantidade: true, sellThroughPeriodo: true, statusComercial: true },
        },
      },
    }),
  ]);
  const intencaoPorProduto = new Map(intencao.produtos.map((item) => [item.produtoId, item]));
  const precificacaoPorProduto = new Map(precificacao.produtos.map((item) => [item.produtoId, item]));
  const campanhaIds = new Set<string>();
  for (const campanha of campanhas) {
    if (campanha.produtoId) campanhaIds.add(campanha.produtoId);
    if (Array.isArray(campanha.produtosJson)) {
      for (const item of campanha.produtosJson) {
        if (item && typeof item === "object") {
          const produtoId = String((item as Record<string, unknown>).produtoId || "");
          if (produtoId) campanhaIds.add(produtoId);
        }
      }
    }
  }

  return produtosRaw.map((produto) => {
    const intencaoProduto = intencaoPorProduto.get(produto.id);
    const precificacaoProduto = precificacaoPorProduto.get(produto.id);
    const snapshot = produto.metricasSnapshots[0];
    return {
      id: produto.id,
      codigoInterno: produto.codigoInterno,
      nome: produto.nome,
      categoria: produto.categoria,
      imagemUrl: produto.imagemUrl,
      imagemHoverUrl: produto.imagemHoverUrl,
      tagsComerciais: produto.tagsComerciais,
      criadoEm: produto.criadoEm,
      precoVenda: numero(produto.precoVenda),
      custoBase: numero(produto.custoBase),
      estoqueTotal: produto.estoque.reduce((total, item) => total + item.quantidadeAtual, 0),
      vendidosTotal: intencaoProduto?.vendasQuantidade || snapshot?.vendasQuantidade || 0,
      visualizacoes: intencaoProduto?.visualizacoes || 0,
      favoritos: intencaoProduto?.favoritos || 0,
      adicoesCarrinho: intencaoProduto?.adicoesCarrinho || 0,
      scoreInteresse: intencaoProduto?.scoreInteresse || 0,
      statusComercial: snapshot?.statusComercial || "NAO_TESTADO",
      vendasQuantidade: intencaoProduto?.vendasQuantidade || snapshot?.vendasQuantidade || 0,
      sellThroughPeriodo: numero(snapshot?.sellThroughPeriodo),
      classificacaoPrecificacao: precificacaoProduto?.classificacao || "DADOS_INSUFICIENTES",
      margemBrutaPct: precificacaoProduto?.margemBrutaPct || 0,
      descontoPermitido: Boolean(precificacaoProduto?.descontoPermitido),
      campanhaAberta: campanhaIds.has(produto.id),
    };
  });
}

export async function atualizarProdutosSugeridos(colecaoId: string, itens: ReturnType<typeof selecionarProdutosParaColecao>) {
  const atuais = await prisma.colecaoInteligenteProduto.findMany({ where: { colecaoId } });
  const protegidos = new Set(atuais.filter((item) => item.status === "APROVADO" || item.fixado || item.adicionadoManual).map((item) => item.produtoId));
  const sugeridos = new Set(itens.map((item) => item.produto.id));

  await prisma.$transaction([
    ...itens.map((item) =>
      prisma.colecaoInteligenteProduto.upsert({
        where: { colecaoId_produtoId: { colecaoId, produtoId: item.produto.id } },
        update: {
          score: item.score,
          motivo: item.motivo,
          ordem: item.ordem,
          status: protegidos.has(item.produto.id) ? undefined : "SUGERIDO",
          metricasJson: item.produto as unknown as Prisma.InputJsonValue,
        },
        create: {
          colecaoId,
          produtoId: item.produto.id,
          score: item.score,
          motivo: item.motivo,
          ordem: item.ordem,
          status: "SUGERIDO",
          metricasJson: item.produto as unknown as Prisma.InputJsonValue,
        },
      }),
    ),
    prisma.colecaoInteligenteProduto.updateMany({
      where: {
        colecaoId,
        produtoId: { notIn: [...sugeridos] },
        status: "SUGERIDO",
        fixado: false,
        adicionadoManual: false,
      },
      data: { status: "IGNORADO" },
    }),
  ]);
}

export async function gerarColecaoPorTipo(tipo: TipoColecao, produtosBase?: ProdutoBase[]) {
  const produtos = produtosBase || (await montarProdutosBase());
  const texto = textoColecao(tipo);
  const codigo = codigoColecao(tipo);
  const colecao = await prisma.colecaoInteligente.upsert({
    where: { codigo },
    update: {
      nome: texto.nome,
      descricao: texto.descricao,
      tipo,
      modoAtualizacao: "SUGERIDA",
      criteriosJson: { tipo, limite: 12 } as Prisma.InputJsonValue,
      geradaEm: new Date(),
    },
    create: {
      codigo,
      nome: texto.nome,
      slug: slugify(texto.nome),
      descricao: texto.descricao,
      tipo,
      status: "RASCUNHO",
      modoAtualizacao: "SUGERIDA",
      criteriosJson: { tipo, limite: 12 } as Prisma.InputJsonValue,
      configJson: { fonteBuilder: "COLECAO_INTELIGENTE" } as Prisma.InputJsonValue,
      geradaEm: new Date(),
    },
  });

  const itens = selecionarProdutosParaColecao(produtos, tipo, 12);
  await atualizarProdutosSugeridos(colecao.id, itens);
  return { colecao, sugeridos: itens.length };
}

export async function gerarColecoesInteligentes() {
  const produtos = await montarProdutosBase();
  const tipos = COLECOES_INTELIGENTES_TIPOS.filter((tipo) => tipo !== "PERSONALIZADA");
  const resultados = [];
  for (const tipo of tipos) {
    resultados.push(await gerarColecaoPorTipo(tipo, produtos));
  }

  return {
    ok: true,
    produtosAnalisados: produtos.length,
    colecoes: resultados.length,
    produtosSugeridos: resultados.reduce((total, item) => total + item.sugeridos, 0),
  };
}

export async function aprovarProdutoNaColecao(colecaoId: string, produtoId: string) {
  return prisma.colecaoInteligenteProduto.update({
    where: { colecaoId_produtoId: { colecaoId, produtoId } },
    data: { status: "APROVADO" },
  });
}

export async function removerProdutoDaColecao(colecaoId: string, produtoId: string) {
  return prisma.colecaoInteligenteProduto.update({
    where: { colecaoId_produtoId: { colecaoId, produtoId } },
    data: { status: "REMOVIDO", fixado: false },
  });
}

export async function fixarProdutoNaColecao(colecaoId: string, produtoId: string, fixado = true) {
  return prisma.colecaoInteligenteProduto.update({
    where: { colecaoId_produtoId: { colecaoId, produtoId } },
    data: { fixado, status: fixado ? "APROVADO" : undefined },
  });
}

export async function listarProdutosColecao(colecaoId: string) {
  return prisma.colecaoInteligenteProduto.findMany({
    where: { colecaoId, status: { notIn: ["REMOVIDO", "IGNORADO"] } },
    include: {
      produto: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          imagemUrl: true,
          imagemHoverUrl: true,
          categoria: true,
          precoVenda: true,
          ativo: true,
          status: true,
          estoque: { select: { quantidadeAtual: true } },
        },
      },
    },
    orderBy: [{ fixado: "desc" }, { ordem: "asc" }, { score: "desc" }],
  });
}

function getConfigObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function extrairProdutoIdsDeJson(value: unknown) {
  const ids: string[] = [];

  if (!Array.isArray(value)) return ids;

  for (const item of value) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const produtoId = String((item as Record<string, unknown>).produtoId || "");
      if (produtoId) ids.push(produtoId);
    }
  }

  return ids;
}

function resolverFonteCampanhaBuilder({
  campanhaId,
  produtosIds,
  limite,
}: {
  campanhaId: string;
  produtosIds: string[];
  limite: number;
}): Promise<string[]> {
  if (produtosIds.length > 0) {
    return Promise.resolve(produtosIds.slice(0, limite));
  }

  if (!campanhaId) return Promise.resolve([]);

  return prisma.campanhaComercial.findFirst({
    where: {
      id: campanhaId,
      status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] },
    },
    select: {
      produtoId: true,
      produtosJson: true,
    },
  }).then((campanha) => {
    if (!campanha) return [];

    return [
      ...(campanha.produtoId ? [campanha.produtoId] : []),
      ...extrairProdutoIdsDeJson(campanha.produtosJson),
    ].slice(0, limite);
  });
}

export function resolverFonteProdutosBuilder(
  config: Record<string, unknown>,
): Promise<string[]> {
  const fonteConfig = getConfigObject(config.fonte);
  const fonteAninhada = String(fonteConfig.tipo || "");
  const fonte = fonteAninhada || String(config.fonte || "");
  const limite = Math.max(
    1,
    Math.min(24, Number(fonteConfig.quantidade || config.limite || 12)),
  );

  if (fonte === "CAMPANHA") {
    return resolverFonteCampanhaBuilder({
      campanhaId: String(fonteConfig.campanhaId || config.campanhaId || ""),
      produtosIds: getStringArray(fonteConfig.produtosIds || config.produtosIds),
      limite,
    });
  }

  if (fonte === "MAIS_VENDIDOS") {
    return prisma.produto.findMany({
      where: {
        ativo: true,
        status: { not: "NA_LIXEIRA" },
      },
      select: {
        id: true,
        vendasItens: {
          where: {
            venda: {
              status: { notIn: ["CANCELADA", "NA_LIXEIRA"] },
            },
          },
          select: {
            quantidade: true,
          },
        },
      },
    }).then((produtos) =>
      produtos
        .map((produto) => ({
          id: produto.id,
          quantidadeVendida: produto.vendasItens.reduce(
            (total, item) => total + Number(item.quantidade || 0),
            0,
          ),
        }))
        .filter((produto) => produto.quantidadeVendida > 0)
        .sort(
          (a, b) =>
            b.quantidadeVendida - a.quantidadeVendida ||
            a.id.localeCompare(b.id),
        )
        .slice(0, limite)
        .map((produto) => produto.id),
    );
  }

  if (fonte !== "COLECAO_INTELIGENTE") return Promise.resolve([]);

  const colecaoId = String(
    fonteConfig.colecaoId || config.colecaoInteligenteId || ""
  );
  const colecaoSlug = String(
    fonteConfig.colecaoSlug || config.colecaoInteligenteSlug || ""
  );
  const incluirSugeridos =
    fonteConfig.incluirSugeridos === true || config.incluirSugeridosColecao === true;
  const ordenacao = String(
    fonteConfig.ordem || config.ordenacaoColecao || "ORDEM_APROVADA"
  );
  const ordenacaoNormalizada =
    ordenacao === "SCORE"
      ? "MAIOR_SCORE"
      : ordenacao === "RECENTES"
        ? "MAIS_RECENTES"
        : ordenacao;

  return prisma.colecaoInteligente.findFirst({
    where: {
      status: "ATIVA",
      OR: [{ id: colecaoId || "__none" }, { slug: colecaoSlug || "__none" }],
    },
    select: {
      produtos: {
        where: {
          status: { in: incluirSugeridos ? ["APROVADO", "SUGERIDO"] : ["APROVADO"] },
          produto: {
            ativo: true,
            status: { not: "NA_LIXEIRA" },
            estoque: { some: { quantidadeAtual: { gt: 0 } } },
          },
        },
        select: {
          produtoId: true,
          score: true,
          fixado: true,
          ordem: true,
          produto: {
            select: {
              criadoEm: true,
            },
          },
        },
      },
    },
  }).then((colecao) => {
    if (!colecao) return [];

    const itens = [...colecao.produtos].sort((a, b) => {
      if (ordenacaoNormalizada === "MAIOR_SCORE") return b.score - a.score;
      if (ordenacaoNormalizada === "MAIS_RECENTES") {
        return b.produto.criadoEm.getTime() - a.produto.criadoEm.getTime();
      }
      return (
        Number(b.fixado) - Number(a.fixado) ||
        a.ordem - b.ordem ||
        b.score - a.score
      );
    });

    return itens.slice(0, limite).map((item) => item.produtoId);
  });
}

export async function aplicarColecoesEmBlocosBuilder<T extends { configJson: unknown }>(blocos: T[]) {
  return Promise.all(
    blocos.map(async (bloco) => {
      const config = typeof bloco.configJson === "object" && bloco.configJson !== null && !Array.isArray(bloco.configJson)
        ? (bloco.configJson as Record<string, unknown>)
        : {};
      const fonteConfig = getConfigObject(config.fonte);
      const fonte = String(fonteConfig.tipo || config.fonte || "");

      if (!["COLECAO_INTELIGENTE", "CAMPANHA", "MAIS_VENDIDOS"].includes(fonte)) {
        return bloco;
      }

      const produtosIds = await resolverFonteProdutosBuilder(config);
      const configResolvido =
        fonteConfig.tipo === fonte
          ? {
              ...config,
              fonte: {
                ...fonteConfig,
                produtosIds,
              },
              produtosIds,
              fonteResolvida: fonte,
            }
          : {
              ...config,
              produtosIds,
              fonteResolvida: fonte,
            };

      return {
        ...bloco,
        configJson: configResolvido,
      };
    }),
  );
}

export function serializarColecao(
  colecao: ColecaoInteligente & {
    produtos: (ColecaoInteligenteProduto & {
      produto: Pick<Produto, "id" | "codigoInterno" | "nome" | "imagemUrl" | "imagemHoverUrl" | "categoria" | "precoVenda">;
    })[];
  },
) {
  return {
    ...colecao,
    criadoEm: colecao.criadoEm.toISOString(),
    atualizadoEm: colecao.atualizadoEm.toISOString(),
    geradaEm: colecao.geradaEm?.toISOString() || null,
    aprovadaEm: colecao.aprovadaEm?.toISOString() || null,
    desativadaEm: colecao.desativadaEm?.toISOString() || null,
    produtos: colecao.produtos.map((item) => ({
      ...item,
      criadoEm: item.criadoEm.toISOString(),
      atualizadoEm: item.atualizadoEm.toISOString(),
    })),
  };
}
