import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analisarPrecificacaoProdutos } from "@/lib/financeiro/precificacao-inteligente";

export const NOTIFICACAO_CATEGORIAS = [
  "PEDIDO",
  "OPERACIONAL",
  "ESTOQUE",
  "REPOSICAO",
  "RECOMENDACAO",
  "CAMPANHA",
  "PRECIFICACAO",
  "FINANCEIRO",
  "MELHORIA",
  "SISTEMA",
] as const;

export const NOTIFICACAO_PRIORIDADES = ["CRITICA", "ALTA", "MEDIA", "BAIXA", "INFO"] as const;
export const NOTIFICACAO_STATUS = ["NOVA", "LIDA", "ARQUIVADA", "EXCLUIDA"] as const;
export const PERFIS_ESTRATEGICOS = ["ACESSO_GERAL"] as const;
export const PERFIS_OPERACIONAIS = ["ACESSO_GERAL", "VENDEDOR"] as const;

type PerfilAdmin = "ACESSO_GERAL" | "VENDEDOR" | string;
type NotificacaoPrioridade = (typeof NOTIFICACAO_PRIORIDADES)[number];

type CriarNotificacaoParams = {
  tipo: string;
  categoria: string;
  prioridade: NotificacaoPrioridade;
  titulo: string;
  descricao: string;
  resumo?: string | null;
  origemTipo: string;
  origemId?: string | null;
  linkAcao?: string | null;
  acaoLabel?: string | null;
  metadataJson?: Prisma.InputJsonValue;
  expiraEm?: Date | null;
  perfisDestino?: string[];
};

type ListarParams = {
  usuarioId: string;
  perfil: PerfilAdmin;
  categoria?: string | null;
  prioridade?: string | null;
  status?: string | null;
  busca?: string | null;
  take?: number;
};

function perfisPermitidos(perfil: PerfilAdmin) {
  if (perfil === "ACESSO_GERAL") return undefined;
  return ["PEDIDO", "OPERACIONAL"];
}

function destinoPadrao(categoria: string) {
  return categoria === "PEDIDO" || categoria === "OPERACIONAL"
    ? [...PERFIS_OPERACIONAIS]
    : [...PERFIS_ESTRATEGICOS];
}

function filtroAcesso(perfil: PerfilAdmin): Prisma.NotificacaoSistemaWhereInput {
  const categorias = perfisPermitidos(perfil);

  return categorias ? { categoria: { in: categorias } } : {};
}

function horasAtras(horas: number) {
  const data = new Date();
  data.setHours(data.getHours() - horas);
  return data;
}

async function garantirDestinatarios(notificacaoId: string, perfisDestino: string[]) {
  await Promise.all(
    perfisDestino.map((perfilDestino) =>
      prisma.notificacaoUsuario.upsert({
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
      }),
    ),
  );
}

export async function criarNotificacao(params: CriarNotificacaoParams) {
  const perfisDestino = params.perfisDestino?.length
    ? params.perfisDestino
    : destinoPadrao(params.categoria);
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
      expiraEm: params.expiraEm || null,
      canaisEnvio: {
        create: {
          canal: "IN_APP",
          status: "DISPONIVEL",
        },
      },
    },
  });

  await garantirDestinatarios(notificacao.id, perfisDestino);
  return notificacao;
}

export async function criarOuAtualizarNotificacao(params: CriarNotificacaoParams) {
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

  if (!existente) return criarNotificacao(params);

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
      expiraEm: params.expiraEm || null,
    },
  });

  await garantirDestinatarios(
    notificacao.id,
    params.perfisDestino?.length ? params.perfisDestino : destinoPadrao(params.categoria),
  );

  return notificacao;
}

export async function listarNotificacoes(params: ListarParams) {
  const where: Prisma.NotificacaoSistemaWhereInput = {
    status: { not: "EXCLUIDA" },
    ...filtroAcesso(params.perfil),
    destinatarios: {
      some: {
        OR: [{ usuarioId: params.usuarioId }, { perfilDestino: params.perfil }],
        excluidaEm: null,
      },
    },
  };

  if (params.categoria && params.categoria !== "TODAS") where.categoria = params.categoria;
  if (params.prioridade && params.prioridade !== "TODAS") where.prioridade = params.prioridade;
  if (params.status && params.status !== "TODAS") where.status = params.status;
  if (params.busca) {
    where.OR = [
      { titulo: { contains: params.busca, mode: "insensitive" } },
      { descricao: { contains: params.busca, mode: "insensitive" } },
      { origemTipo: { contains: params.busca, mode: "insensitive" } },
    ];
  }

  return prisma.notificacaoSistema.findMany({
    where,
    include: {
      destinatarios: {
        where: {
          OR: [{ usuarioId: params.usuarioId }, { perfilDestino: params.perfil }],
        },
        take: 1,
      },
    },
    orderBy: [
      { categoria: "asc" },
      { prioridade: "asc" },
      { criadoEm: "desc" },
    ],
    take: params.take || 100,
  });
}

export async function contarNotificacoesNaoLidas(usuarioId: string, perfil: PerfilAdmin) {
  const whereBase: Prisma.NotificacaoSistemaWhereInput = {
    status: "NOVA",
    ...filtroAcesso(perfil),
    destinatarios: {
      some: {
        OR: [{ usuarioId }, { perfilDestino: perfil }],
        lidaEm: null,
        arquivadaEm: null,
        excluidaEm: null,
      },
    },
  };

  const [total, pedidos, reposicao, recomendacoes, campanhas, precificacao] = await Promise.all([
    prisma.notificacaoSistema.count({ where: whereBase }),
    prisma.notificacaoSistema.count({ where: { ...whereBase, categoria: "PEDIDO" } }),
    prisma.notificacaoSistema.count({ where: { ...whereBase, categoria: { in: ["ESTOQUE", "REPOSICAO"] } } }),
    prisma.notificacaoSistema.count({ where: { ...whereBase, categoria: "RECOMENDACAO" } }),
    prisma.notificacaoSistema.count({ where: { ...whereBase, categoria: "CAMPANHA" } }),
    prisma.notificacaoSistema.count({ where: { ...whereBase, categoria: "PRECIFICACAO" } }),
  ]);

  return { total, pedidos, reposicao, recomendacoes, campanhas, precificacao };
}

async function destinatarioDoUsuario(notificacaoId: string, usuarioId: string, perfil: PerfilAdmin) {
  const existente = await prisma.notificacaoUsuario.findFirst({
    where: {
      notificacaoId,
      OR: [{ usuarioId }, { perfilDestino: perfil }],
    },
    orderBy: { usuarioId: "desc" },
  });

  if (existente) return existente;

  return prisma.notificacaoUsuario.create({
    data: { notificacaoId, usuarioId },
  });
}

export async function marcarComoLida(id: string, usuarioId: string, perfil: PerfilAdmin) {
  const destinatario = await destinatarioDoUsuario(id, usuarioId, perfil);
  await prisma.notificacaoUsuario.update({
    where: { id: destinatario.id },
    data: { lidaEm: new Date() },
  });

  return prisma.notificacaoSistema.update({
    where: { id },
    data: { status: "LIDA" },
  });
}

export async function arquivarNotificacao(id: string, usuarioId: string, perfil: PerfilAdmin) {
  const destinatario = await destinatarioDoUsuario(id, usuarioId, perfil);
  await prisma.notificacaoUsuario.update({
    where: { id: destinatario.id },
    data: { arquivadaEm: new Date() },
  });

  return prisma.notificacaoSistema.update({
    where: { id },
    data: { status: "ARQUIVADA" },
  });
}

export async function excluirNotificacao(id: string, usuarioId: string, perfil: PerfilAdmin) {
  const destinatario = await destinatarioDoUsuario(id, usuarioId, perfil);
  await prisma.notificacaoUsuario.update({
    where: { id: destinatario.id },
    data: { excluidaEm: new Date() },
  });

  return prisma.notificacaoSistema.update({
    where: { id },
    data: { status: "EXCLUIDA" },
  });
}

export async function excluirVariasNotificacoes(ids: string[], usuarioId: string, perfil: PerfilAdmin) {
  await Promise.all(ids.map((id) => excluirNotificacao(id, usuarioId, perfil)));
  return { total: ids.length };
}

export async function excluirTodasNotificacoes(usuarioId: string, perfil: PerfilAdmin) {
  const notificacoes = await listarNotificacoes({ usuarioId, perfil, take: 500 });
  const ids = notificacoes.map((item) => item.id);
  await excluirVariasNotificacoes(ids, usuarioId, perfil);
  return { total: ids.length };
}

async function sincronizarPedidos() {
  const pedidos = await prisma.pedidoOnline.findMany({
    where: {
      status: { notIn: ["ENTREGUE", "FINALIZADO", "CANCELADO"] },
    },
    include: { envio: true },
    orderBy: { criadoEm: "desc" },
    take: 80,
  });
  let total = 0;

  for (const pedido of pedidos) {
    const linkAcao = `/pedidos/${pedido.id}`;

    if (pedido.statusPagamento === "PAGO" && ["PEDIDO_RECEBIDO", "EM_SEPARACAO"].includes(pedido.status)) {
      await criarOuAtualizarNotificacao({
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
        metadataJson: { codigo: pedido.codigo, status: pedido.status, statusPagamento: pedido.statusPagamento },
      });
      total += 1;
    }

    if (["AGUARDANDO_PAGAMENTO", "PENDENTE"].includes(pedido.statusPagamento) && pedido.criadoEm < horasAtras(24)) {
      await criarOuAtualizarNotificacao({
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
        metadataJson: { codigo: pedido.codigo, criadoEm: pedido.criadoEm.toISOString() },
      });
      total += 1;
    }

    if (["PROBLEMA", "PROBLEMA_OPERACIONAL"].includes(pedido.status)) {
      await criarOuAtualizarNotificacao({
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
        metadataJson: { codigo: pedido.codigo, status: pedido.status },
      });
      total += 1;
    }

    if (pedido.statusPagamento === "PAGO" && pedido.envio?.tipoEntrega !== "RETIRADA" && pedido.envio && !pedido.envio.etiquetaPdfUrl) {
      await criarOuAtualizarNotificacao({
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

    if (pedido.envio?.tipoEntrega === "RETIRADA" && pedido.statusPagamento === "PAGO" && !pedido.envio.entregueEm) {
      await criarOuAtualizarNotificacao({
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

  return total;
}

async function sincronizarRecomendacoes() {
  const recomendacoes = await prisma.recomendacaoGerencial.findMany({
    where: {
      status: { in: ["NOVA", "ACEITA", "EM_EXECUCAO"] },
      prioridade: { in: ["ALTA", "MEDIA"] },
    },
    orderBy: [{ prioridade: "asc" }, { criadoEm: "desc" }],
    take: 50,
  });
  let total = 0;

  for (const recomendacao of recomendacoes) {
    if (recomendacao.prioridade !== "ALTA" && recomendacao.tipo !== "REPOSICAO") continue;

    await criarOuAtualizarNotificacao({
      tipo: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO_SUGERIDA" : "RECOMENDACAO_GERENCIAL_NOVA",
      categoria: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO" : "RECOMENDACAO",
      prioridade: recomendacao.prioridade === "ALTA" ? "ALTA" : "MEDIA",
      titulo: recomendacao.titulo,
      descricao: recomendacao.descricao,
      resumo: recomendacao.motivo || recomendacao.impactoEsperado,
      origemTipo: "RECOMENDACAO_GERENCIAL",
      origemId: recomendacao.id,
      linkAcao: recomendacao.tipo === "REPOSICAO" ? "/compras/reposicao" : "/compras/recomendacoes",
      acaoLabel: "Ver recomendacao",
      metadataJson: {
        tipo: recomendacao.tipo,
        prioridade: recomendacao.prioridade,
        status: recomendacao.status,
      },
      perfisDestino: [...PERFIS_ESTRATEGICOS],
    });
    total += 1;
  }

  return total;
}

async function sincronizarCampanhas() {
  const campanhas = await prisma.campanhaComercial.findMany({
    where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });
  let total = 0;

  for (const campanha of campanhas) {
    if (campanha.status === "RASCUNHO" || campanha.status === "PLANEJADA") {
      await criarOuAtualizarNotificacao({
        tipo: "CAMPANHA_AGUARDA_ACAO",
        categoria: "CAMPANHA",
        prioridade: campanha.status === "RASCUNHO" ? "BAIXA" : "MEDIA",
        titulo: `Campanha ${campanha.status.toLowerCase()}: ${campanha.titulo}`,
        descricao: campanha.descricao,
        resumo: campanha.objetivo,
        origemTipo: "CAMPANHA_COMERCIAL",
        origemId: campanha.id,
        linkAcao: "/compras/campanhas",
        acaoLabel: "Ver campanha",
        metadataJson: { status: campanha.status, tipo: campanha.tipo },
        perfisDestino: [...PERFIS_ESTRATEGICOS],
      });
      total += 1;
    }
  }

  return total;
}

async function sincronizarPrecificacao() {
  const analise = await analisarPrecificacaoProdutos();
  const criticos = analise.produtos.filter(
    (produto) =>
      produto.custoAusente ||
      produto.classificacao === "PRECO_CRITICO" ||
      produto.campanhasAbertas.some((campanha) => campanha.alertaDesconto),
  );
  let total = 0;

  for (const produto of criticos.slice(0, 30)) {
    await criarOuAtualizarNotificacao({
      tipo: produto.custoAusente ? "PRODUTO_SEM_CUSTO" : "PRECIFICACAO_ALERTA",
      categoria: "PRECIFICACAO",
      prioridade: produto.classificacao === "PRECO_CRITICO" || produto.custoAusente ? "ALTA" : "MEDIA",
      titulo: produto.custoAusente
        ? `Cadastrar custo de ${produto.codigoInterno}`
        : `Conferir precificacao de ${produto.codigoInterno}`,
      descricao: produto.motivo,
      resumo: produto.classificacao,
      origemTipo: "PRECIFICACAO_PRODUTO",
      origemId: produto.produtoId,
      linkAcao: "/compras/precificacao",
      acaoLabel: "Abrir precificacao",
      metadataJson: { classificacao: produto.classificacao, margemBrutaPct: produto.margemBrutaPct },
      perfisDestino: [...PERFIS_ESTRATEGICOS],
    });
    total += 1;
  }

  return total;
}

export async function sincronizarNotificacoesOperacionais() {
  // WhatsApp/SMS/e-mail entram depois por provedor externo. Nesta etapa o canal criado e apenas IN_APP.
  const [pedidos, recomendacoes, campanhas, precificacao] = await Promise.all([
    sincronizarPedidos(),
    sincronizarRecomendacoes(),
    sincronizarCampanhas(),
    sincronizarPrecificacao(),
  ]);

  return {
    total: pedidos + recomendacoes + campanhas + precificacao,
    porCategoria: {
      PEDIDO_OPERACIONAL: pedidos,
      RECOMENDACAO_REPOSICAO: recomendacoes,
      CAMPANHA: campanhas,
      PRECIFICACAO: precificacao,
    },
  };
}
