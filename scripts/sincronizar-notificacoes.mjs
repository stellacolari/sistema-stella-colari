import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM_VALUE = "SINCRONIZAR_NOTIFICACOES_STELLA";
const TIPOS_SINCRONIZADOS = [
  "PEDIDO_PAGO_PREPARO",
  "PEDIDO_PAGAMENTO_PENDENTE",
  "PEDIDO_COM_PROBLEMA",
  "PEDIDO_CANCELADO_CONFERENCIA",
  "PEDIDO_ETIQUETA_PENDENTE",
  "PEDIDO_ETIQUETA_PRONTA_IMPRESSAO",
  "PEDIDO_RETIRADA_PENDENTE",
  "REPOSICAO_SUGERIDA",
  "RECOMENDACAO_GERENCIAL_NOVA",
  "RECOMENDACAO_VENCIDA",
  "CAMPANHA_AGUARDA_ACAO",
  "PRODUTO_SEM_CUSTO",
  "PRECIFICACAO_ALERTA",
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length).replace(/^["']|["']$/g, "") : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function horasAtras(horas) {
  const data = new Date();
  data.setHours(data.getHours() - horas);
  return data;
}

function chaveNotificacao(params) {
  return [params.tipo, params.origemTipo, params.origemId || "", params.linkAcao || ""].join("|");
}

function destinoPadrao(categoria) {
  return categoria === "PEDIDO" || categoria === "OPERACIONAL"
    ? ["ACESSO_GERAL", "VENDEDOR"]
    : ["ACESSO_GERAL"];
}

async function garantirDestinatarios(notificacaoId, perfisDestino) {
  for (const perfilDestino of perfisDestino) {
    await prisma.notificacaoUsuario.upsert({
      where: {
        notificacaoId_perfilDestino: {
          notificacaoId,
          perfilDestino,
        },
      },
      update: {},
      create: {
        notificacaoId,
        perfilDestino,
      },
    });
  }
}

async function criarOuAtualizar(params) {
  const existente = await prisma.notificacaoSistema.findFirst({
    where: {
      tipo: params.tipo,
      origemTipo: params.origemTipo,
      origemId: params.origemId || null,
      linkAcao: params.linkAcao || null,
      status: { not: "EXCLUIDA" },
    },
    orderBy: { criadoEm: "desc" },
  });
  const perfisDestino = params.perfisDestino || destinoPadrao(params.categoria);

  if (existente) {
    const notificacao = await prisma.notificacaoSistema.update({
      where: { id: existente.id },
      data: {
        categoria: params.categoria,
        prioridade: params.prioridade,
        titulo: params.titulo,
        descricao: params.descricao,
        resumo: params.resumo || null,
        status: existente.status === "ARQUIVADA" ? "NOVA" : existente.status,
        acaoLabel: params.acaoLabel || "Ir para acao",
        metadataJson: params.metadataJson,
      },
    });
    await garantirDestinatarios(notificacao.id, perfisDestino);
    return notificacao;
  }

  const notificacao = await prisma.notificacaoSistema.create({
    data: {
      tipo: params.tipo,
      categoria: params.categoria,
      prioridade: params.prioridade,
      titulo: params.titulo,
      descricao: params.descricao,
      resumo: params.resumo || null,
      status: "NOVA",
      origemTipo: params.origemTipo,
      origemId: params.origemId || null,
      linkAcao: params.linkAcao || null,
      acaoLabel: params.acaoLabel || "Ir para acao",
      metadataJson: params.metadataJson,
      canaisEnvio: {
        create: { canal: "IN_APP", status: "DISPONIVEL" },
      },
    },
  });
  await garantirDestinatarios(notificacao.id, perfisDestino);
  return notificacao;
}

async function sincronizarPedidos() {
  const ativas = new Set();
  const pedidos = await prisma.pedidoOnline.findMany({
    where: { status: { notIn: ["ENTREGUE", "FINALIZADO", "CANCELADO"] } },
    include: { envio: true },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });
  let total = 0;

  for (const pedido of pedidos) {
    const linkAcao = `/pedidos/${pedido.id}`;

    if (pedido.statusPagamento === "PAGO" && ["PEDIDO_RECEBIDO", "EM_SEPARACAO"].includes(pedido.status)) {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_PAGO_PREPARO", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
      await criarOuAtualizar({
        tipo: "PEDIDO_PAGO_PREPARO",
        categoria: "PEDIDO",
        prioridade: "CRITICA",
        titulo: `Pedido ${pedido.codigo} pago aguardando preparo`,
        descricao: `${pedido.nomeCliente} ja pagou. Separar itens e preparar envio.`,
        resumo: "Pedido pago para separar",
        origemTipo: "PEDIDO",
        origemId: pedido.id,
        linkAcao,
        acaoLabel: "Abrir pedido",
        metadataJson: { codigo: pedido.codigo, status: pedido.status },
      });
      total += 1;
    }

    if (["AGUARDANDO_PAGAMENTO", "PENDENTE"].includes(pedido.statusPagamento) && pedido.criadoEm < horasAtras(24)) {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_PAGAMENTO_PENDENTE", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
      await criarOuAtualizar({
        tipo: "PEDIDO_PAGAMENTO_PENDENTE",
        categoria: "PEDIDO",
        prioridade: "MEDIA",
        titulo: `Pedido ${pedido.codigo} aguardando pagamento`,
        descricao: "Pagamento pendente ha mais de 24 horas. Conferir link ou contato antes de cancelar.",
        resumo: "Pagamento pendente",
        origemTipo: "PEDIDO",
        origemId: pedido.id,
        linkAcao,
        acaoLabel: "Conferir pagamento",
        metadataJson: { codigo: pedido.codigo },
      });
      total += 1;
    }

    if (["PROBLEMA", "PROBLEMA_OPERACIONAL"].includes(pedido.status)) {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_COM_PROBLEMA", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
      await criarOuAtualizar({
        tipo: "PEDIDO_COM_PROBLEMA",
        categoria: "PEDIDO",
        prioridade: "CRITICA",
        titulo: `Pedido ${pedido.codigo} com problema`,
        descricao: "Pedido marcado com problema operacional. Conferir antes de seguir.",
        resumo: "Problema operacional",
        origemTipo: "PEDIDO",
        origemId: pedido.id,
        linkAcao,
        acaoLabel: "Resolver pedido",
        metadataJson: { codigo: pedido.codigo },
      });
      total += 1;
    }

    if (pedido.status === "CANCELADO") {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_CANCELADO_CONFERENCIA", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
      await criarOuAtualizar({
        tipo: "PEDIDO_CANCELADO_CONFERENCIA",
        categoria: "PEDIDO",
        prioridade: "ALTA",
        titulo: `Pedido ${pedido.codigo} cancelado para conferir`,
        descricao: "Pedido cancelado deve ser conferido para garantir que pagamento, estoque e atendimento estejam coerentes.",
        resumo: "Pedido cancelado",
        origemTipo: "PEDIDO",
        origemId: pedido.id,
        linkAcao,
        acaoLabel: "Conferir pedido",
        metadataJson: { codigo: pedido.codigo, status: pedido.status },
      });
      total += 1;
    }

    if (
      pedido.statusPagamento === "PAGO" &&
      pedido.status === "SEPARADO" &&
      pedido.envio?.tipoEntrega !== "RETIRADA" &&
      pedido.envio?.statusEnvio === "PENDENTE" &&
      !pedido.envio.etiquetaPdfUrl
    ) {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_ETIQUETA_PENDENTE", origemTipo: "PEDIDO_ENVIO", origemId: pedido.envio.id, linkAcao }));
      await criarOuAtualizar({
        tipo: "PEDIDO_ETIQUETA_PENDENTE",
        categoria: "OPERACIONAL",
        prioridade: "ALTA",
        titulo: `Etiqueta pendente do pedido ${pedido.codigo}`,
        descricao: "Pedido pago ainda precisa de etiqueta ou declaracao para envio.",
        resumo: "Etiqueta pendente",
        origemTipo: "PEDIDO_ENVIO",
        origemId: pedido.envio.id,
        linkAcao,
        acaoLabel: "Gerar etiqueta",
        metadataJson: { codigo: pedido.codigo, statusEnvio: pedido.envio.statusEnvio },
      });
      total += 1;
    }

    if (
      pedido.statusPagamento === "PAGO" &&
      pedido.envio?.tipoEntrega !== "RETIRADA" &&
      pedido.envio?.etiquetaPdfUrl &&
      ["ETIQUETA_GERADA", "PREPARADO"].includes(pedido.envio.statusEnvio)
    ) {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_ETIQUETA_PRONTA_IMPRESSAO", origemTipo: "PEDIDO_ENVIO", origemId: pedido.envio.id, linkAcao: "/pedidos/etiquetas/lote" }));
      await criarOuAtualizar({
        tipo: "PEDIDO_ETIQUETA_PRONTA_IMPRESSAO",
        categoria: "OPERACIONAL",
        prioridade: "ALTA",
        titulo: `Etiqueta pronta para impressao: ${pedido.codigo}`,
        descricao: "A etiqueta ja foi gerada. Imprimir e preparar postagem.",
        resumo: "Etiqueta pronta",
        origemTipo: "PEDIDO_ENVIO",
        origemId: pedido.envio.id,
        linkAcao: "/pedidos/etiquetas/lote",
        acaoLabel: "Imprimir etiqueta",
        metadataJson: { codigo: pedido.codigo, statusEnvio: pedido.envio.statusEnvio },
      });
      total += 1;
    }

    if (
      pedido.envio?.tipoEntrega === "RETIRADA" &&
      pedido.statusPagamento === "PAGO" &&
      pedido.status === "AGUARDANDO_RETIRADA" &&
      !pedido.envio.entregueEm
    ) {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_RETIRADA_PENDENTE", origemTipo: "PEDIDO_ENVIO", origemId: pedido.envio.id, linkAcao }));
      await criarOuAtualizar({
        tipo: "PEDIDO_RETIRADA_PENDENTE",
        categoria: "OPERACIONAL",
        prioridade: "ALTA",
        titulo: `Retirada local pendente: ${pedido.codigo}`,
        descricao: "Pedido pago com retirada local ainda precisa ser entregue ao cliente.",
        resumo: "Retirada pendente",
        origemTipo: "PEDIDO_ENVIO",
        origemId: pedido.envio.id,
        linkAcao,
        acaoLabel: "Abrir pedido",
        metadataJson: { codigo: pedido.codigo, tipoEntrega: pedido.envio.tipoEntrega },
      });
      total += 1;
    }
  }

  return { total, ativas };
}

async function sincronizarGestao() {
  const ativas = new Set();
  const [recomendacoes, campanhas] = await Promise.all([
    prisma.recomendacaoGerencial.findMany({
      where: { status: { in: ["NOVA", "ACEITA", "EM_EXECUCAO"] }, prioridade: { in: ["ALTA", "MEDIA"] } },
      take: 60,
      orderBy: [{ prioridade: "asc" }, { criadoEm: "desc" }],
    }),
    prisma.campanhaComercial.findMany({
      where: { status: { in: ["RASCUNHO", "PLANEJADA"] } },
      take: 40,
      orderBy: { criadoEm: "desc" },
    }),
  ]);
  let recomendacoesTotal = 0;
  let campanhasTotal = 0;

  for (const recomendacao of recomendacoes) {
    if (recomendacao.prioridade !== "ALTA" && recomendacao.tipo !== "REPOSICAO") continue;
    const linkAcao = recomendacao.tipo === "REPOSICAO" ? "/compras/reposicao" : "/compras/recomendacoes";
    ativas.add(chaveNotificacao({
      tipo: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO_SUGERIDA" : "RECOMENDACAO_GERENCIAL_NOVA",
      origemTipo: "RECOMENDACAO_GERENCIAL",
      origemId: recomendacao.id,
      linkAcao,
    }));
    await criarOuAtualizar({
      tipo: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO_SUGERIDA" : "RECOMENDACAO_GERENCIAL_NOVA",
      categoria: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO" : "RECOMENDACAO",
      prioridade: recomendacao.prioridade === "ALTA" ? "ALTA" : "MEDIA",
      titulo: recomendacao.titulo,
      descricao: recomendacao.descricao,
      resumo: recomendacao.motivo,
      origemTipo: "RECOMENDACAO_GERENCIAL",
      origemId: recomendacao.id,
      linkAcao,
      acaoLabel: "Ver recomendacao",
      metadataJson: { tipo: recomendacao.tipo, prioridade: recomendacao.prioridade },
      perfisDestino: ["ACESSO_GERAL"],
    });
    recomendacoesTotal += 1;
  }

  const vencidas = await prisma.recomendacaoGerencial.findMany({
    where: {
      status: { in: ["ACEITA", "EM_EXECUCAO"] },
      prazoSugerido: { lt: new Date() },
    },
    orderBy: { prazoSugerido: "asc" },
    take: 20,
  });

  for (const recomendacao of vencidas) {
    ativas.add(chaveNotificacao({ tipo: "RECOMENDACAO_VENCIDA", origemTipo: "RECOMENDACAO_GERENCIAL", origemId: recomendacao.id, linkAcao: "/compras/recomendacoes" }));
    await criarOuAtualizar({
      tipo: "RECOMENDACAO_VENCIDA",
      categoria: "RECOMENDACAO",
      prioridade: recomendacao.prioridade === "ALTA" ? "ALTA" : "MEDIA",
      titulo: `Recomendacao vencida: ${recomendacao.titulo}`,
      descricao: "A recomendacao aceita ou em execucao passou do prazo sugerido e precisa de revisao.",
      resumo: recomendacao.acaoSugerida || recomendacao.motivo,
      origemTipo: "RECOMENDACAO_GERENCIAL",
      origemId: recomendacao.id,
      linkAcao: "/compras/recomendacoes",
      acaoLabel: "Revisar recomendacao",
      metadataJson: {
        tipo: recomendacao.tipo,
        prioridade: recomendacao.prioridade,
        prazoSugerido: recomendacao.prazoSugerido?.toISOString(),
      },
      perfisDestino: ["ACESSO_GERAL"],
    });
    recomendacoesTotal += 1;
  }

  for (const campanha of campanhas) {
    ativas.add(chaveNotificacao({ tipo: "CAMPANHA_AGUARDA_ACAO", origemTipo: "CAMPANHA_COMERCIAL", origemId: campanha.id, linkAcao: "/compras/campanhas" }));
    await criarOuAtualizar({
      tipo: "CAMPANHA_AGUARDA_ACAO",
      categoria: "CAMPANHA",
      prioridade: campanha.status === "PLANEJADA" ? "MEDIA" : "BAIXA",
      titulo: `Campanha ${campanha.status.toLowerCase()}: ${campanha.titulo}`,
      descricao: campanha.descricao,
      resumo: campanha.objetivo,
      origemTipo: "CAMPANHA_COMERCIAL",
      origemId: campanha.id,
      linkAcao: "/compras/campanhas",
      acaoLabel: "Ver campanha",
      metadataJson: { status: campanha.status, tipo: campanha.tipo },
      perfisDestino: ["ACESSO_GERAL"],
    });
    campanhasTotal += 1;
  }

  return { recomendacoesTotal, campanhasTotal, ativas };
}

async function sincronizarPrecificacao() {
  const ativas = new Set();
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, status: { not: "NA_LIXEIRA" } },
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      precoVenda: true,
      custoBase: true,
    },
    take: 100,
  });
  let total = 0;

  for (const produto of produtos) {
    const preco = Number(produto.precoVenda || 0);
    const custo = Number(produto.custoBase || 0);
    const margemPct = preco > 0 ? ((preco - custo) / preco) * 100 : 0;

    if (custo <= 0 || margemPct < 25) {
      ativas.add(chaveNotificacao({
        tipo: custo <= 0 ? "PRODUTO_SEM_CUSTO" : "PRECIFICACAO_ALERTA",
        origemTipo: "PRECIFICACAO_PRODUTO",
        origemId: produto.id,
        linkAcao: "/compras/precificacao",
      }));
      await criarOuAtualizar({
        tipo: custo <= 0 ? "PRODUTO_SEM_CUSTO" : "PRECIFICACAO_ALERTA",
        categoria: "PRECIFICACAO",
        prioridade: custo <= 0 || margemPct < 15 ? "ALTA" : "MEDIA",
        titulo:
          custo <= 0
            ? `Cadastrar custo de ${produto.codigoInterno}`
            : `Conferir margem de ${produto.codigoInterno}`,
        descricao:
          custo <= 0
            ? `${produto.nome} esta sem custo base para decisao segura.`
            : `${produto.nome} esta com margem estimada abaixo da faixa segura.`,
        resumo: custo <= 0 ? "Produto sem custo" : `Margem ${margemPct.toFixed(1)}%`,
        origemTipo: "PRECIFICACAO_PRODUTO",
        origemId: produto.id,
        linkAcao: "/compras/precificacao",
        acaoLabel: "Abrir precificacao",
        metadataJson: { preco, custo, margemPct: Number(margemPct.toFixed(2)) },
        perfisDestino: ["ACESSO_GERAL"],
      });
      total += 1;
    }
  }

  return { total, ativas };
}

async function arquivarObsoletas(ativas) {
  const abertas = await prisma.notificacaoSistema.findMany({
    where: {
      tipo: { in: TIPOS_SINCRONIZADOS },
      status: { in: ["NOVA", "LIDA"] },
    },
    select: {
      id: true,
      tipo: true,
      origemTipo: true,
      origemId: true,
      linkAcao: true,
    },
  });
  const obsoletas = abertas.filter((item) => !ativas.has(chaveNotificacao(item)));

  if (obsoletas.length > 0) {
    await prisma.notificacaoSistema.updateMany({
      where: { id: { in: obsoletas.map((item) => item.id) } },
      data: { status: "ARQUIVADA" },
    });
  }

  return obsoletas.length;
}

async function main() {
  if (argValue("confirm") !== CONFIRM_VALUE) {
    throw new Error(`Use --confirm=${CONFIRM_VALUE} para sincronizar notificacoes.`);
  }

  const pedidos = await sincronizarPedidos();
  const gestao = await sincronizarGestao();
  const precificacao = await sincronizarPrecificacao();
  const ativas = new Set([...pedidos.ativas, ...gestao.ativas, ...precificacao.ativas]);
  const arquivadas = await arquivarObsoletas(ativas);
  const result = {
    ok: true,
    total: pedidos.total + gestao.recomendacoesTotal + gestao.campanhasTotal + precificacao.total,
    arquivadas,
    porCategoria: {
      PEDIDO_OPERACIONAL: pedidos.total,
      RECOMENDACAO_REPOSICAO: gestao.recomendacoesTotal,
      CAMPANHA: gestao.campanhasTotal,
      PRECIFICACAO: precificacao.total,
    },
  };

  if (hasFlag("json")) console.log(JSON.stringify(result, null, 2));
  else {
    console.log("Notificacoes sincronizadas.");
    console.log(`Total: ${result.total}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
