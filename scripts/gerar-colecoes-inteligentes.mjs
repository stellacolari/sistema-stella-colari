import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM_VALUE = "GERAR_COLECOES_STELLA";
const TIPOS = [
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
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length).replace(/^["']|["']$/g, "") : fallback;
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function texto(tipo) {
  const map = {
    EM_DESTAQUE: ["Em destaque", "Produtos com bom equilibrio entre estoque, interesse, imagem e margem."],
    ALTA_INTENCAO: ["Alta intencao", "Produtos com sinais recentes de visualizacao, favorito ou carrinho."],
    POUCO_TESTADOS: ["Pouco testados", "Produtos com estoque e pouca exposicao para ganhar leitura."],
    CAMPEOES_PROVAVEIS: ["Campeoes provaveis", "Produtos com venda real, sell-through ou status comercial forte."],
    ESTOQUE_PARADO: ["Estoque parado", "Produtos com estoque e baixo giro para exposicao controlada."],
    PARA_PRESENTEAR: ["Para presentear", "Produtos com perfil de presente e disponibilidade."],
    CAMPANHA_ATIVA: ["Campanha ativa", "Produtos vinculados ou aderentes a campanhas abertas."],
    MARGEM_PROTEGIDA: ["Margem protegida", "Produtos para exposicao sem desconto automatico."],
    NOVIDADES: ["Novidades", "Produtos recentes, ativos, com estoque e imagem."],
    GIRO_CONTROLADO: ["Giro controlado", "Produtos para trabalhar giro com cuidado de margem."],
  };
  return map[tipo];
}

function scoreProduto(produto, tipo, campanhaIds) {
  let score = 0;
  score += Math.min(produto.estoqueTotal * 2, 24);
  score += produto.imagemUrl || produto.imagemHoverUrl ? 20 : -20;
  score += Math.min(produto.vendidosTotal * 8, 30);
  score += Math.min(produto.margemPct / 2, 28);
  if (produto.estoqueTotal <= 0) score -= 120;
  if (tipo === "POUCO_TESTADOS" && produto.vendidosTotal === 0) score += 30;
  if (tipo === "CAMPEOES_PROVAVEIS" && produto.vendidosTotal > 0) score += 30;
  if ((tipo === "ESTOQUE_PARADO" || tipo === "GIRO_CONTROLADO") && produto.estoqueTotal >= 3 && produto.vendidosTotal === 0) score += 28;
  if (tipo === "CAMPANHA_ATIVA" && campanhaIds.has(produto.id)) score += 45;
  if (tipo === "MARGEM_PROTEGIDA" && produto.margemPct >= 45) score += 35;
  if (tipo === "NOVIDADES") score += Math.max(0, 30 - (Date.now() - produto.criadoEm.getTime()) / 86400000);
  if (tipo === "PARA_PRESENTEAR" && `${produto.nome} ${produto.categoria} ${produto.tagsComerciais || ""}`.toLowerCase().includes("presente")) score += 30;
  if (tipo === "ALTA_INTENCAO") score += Math.min(productSignal(produto), 40);
  if (tipo === "EM_DESTAQUE") score += Math.min(productSignal(produto), 24);
  return Math.round(score * 100) / 100;
}

function productSignal(produto) {
  return Number(produto.eventos || 0) + Number(produto.vendidosTotal || 0) * 8;
}

async function main() {
  if (argValue("confirm") !== CONFIRM_VALUE) {
    throw new Error(`Use --confirm=${CONFIRM_VALUE}`);
  }

  const [produtosRaw, campanhas, eventos] = await Promise.all([
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
          select: { vendasQuantidade: true },
        },
      },
    }),
    prisma.campanhaComercial.findMany({
      where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
      select: { produtoId: true, produtosJson: true },
    }),
    prisma.eventoComercial.groupBy({
      by: ["produtoId"],
      where: { produtoId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const campanhaIds = new Set();
  for (const campanha of campanhas) {
    if (campanha.produtoId) campanhaIds.add(campanha.produtoId);
    if (Array.isArray(campanha.produtosJson)) {
      for (const item of campanha.produtosJson) {
        const produtoId = item && typeof item === "object" ? String(item.produtoId || "") : "";
        if (produtoId) campanhaIds.add(produtoId);
      }
    }
  }
  const eventosPorProduto = new Map(eventos.map((item) => [item.produtoId, item._count._all]));
  const produtos = produtosRaw.map((produto) => {
    const estoqueTotal = produto.estoque.reduce((total, item) => total + item.quantidadeAtual, 0);
    const vendidosTotal = produto.metricasSnapshots[0]?.vendasQuantidade || 0;
    const preco = Number(produto.precoVenda || 0);
    const custo = Number(produto.custoBase || 0);
    return {
      ...produto,
      estoqueTotal,
      vendidosTotal,
      eventos: eventosPorProduto.get(produto.id) || 0,
      margemPct: preco > 0 ? ((preco - custo) / preco) * 100 : 0,
    };
  });

  let produtosSugeridos = 0;
  for (const tipo of TIPOS) {
    const [nome, descricao] = texto(tipo);
    const colecao = await prisma.colecaoInteligente.upsert({
      where: { codigo: `COL-${tipo}` },
      update: { nome, descricao, tipo, modoAtualizacao: "SUGERIDA", geradaEm: new Date() },
      create: {
        codigo: `COL-${tipo}`,
        nome,
        slug: slugify(nome),
        descricao,
        tipo,
        status: "RASCUNHO",
        modoAtualizacao: "SUGERIDA",
        criteriosJson: { tipo, limite: 12 },
        configJson: { fonteBuilder: "COLECAO_INTELIGENTE" },
        geradaEm: new Date(),
      },
    });
    const selecionados = produtos
      .filter((produto) => produto.estoqueTotal > 0)
      .map((produto) => ({ produto, score: scoreProduto(produto, tipo, campanhaIds) }))
      .sort((a, b) => b.score - a.score || a.produto.nome.localeCompare(b.produto.nome, "pt-BR"))
      .slice(0, 12);
    produtosSugeridos += selecionados.length;

    for (const [ordem, item] of selecionados.entries()) {
      await prisma.colecaoInteligenteProduto.upsert({
        where: { colecaoId_produtoId: { colecaoId: colecao.id, produtoId: item.produto.id } },
        update: {
          ordem,
          score: item.score,
          motivo: `Score ${Math.round(item.score)} | estoque ${item.produto.estoqueTotal} | vendas ${item.produto.vendidosTotal}`,
          metricasJson: { estoqueTotal: item.produto.estoqueTotal, vendidosTotal: item.produto.vendidosTotal, margemPct: item.produto.margemPct },
        },
        create: {
          colecaoId: colecao.id,
          produtoId: item.produto.id,
          ordem,
          score: item.score,
          status: "SUGERIDO",
          motivo: `Score ${Math.round(item.score)} | estoque ${item.produto.estoqueTotal} | vendas ${item.produto.vendidosTotal}`,
          metricasJson: { estoqueTotal: item.produto.estoqueTotal, vendidosTotal: item.produto.vendidosTotal, margemPct: item.produto.margemPct },
        },
      });
    }
  }

  const resultado = { ok: true, produtosAnalisados: produtos.length, colecoes: TIPOS.length, produtosSugeridos };
  if (process.argv.includes("--json")) console.log(JSON.stringify(resultado, null, 2));
  else console.log(resultado);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
