import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analisarPrecificacaoProdutos } from "@/lib/financeiro/precificacao-inteligente";
import { mapearPerfilLegado, prioridadeAtendeMinima } from "@/lib/permissoes/perfis";

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
  if (perfil !== "VENDEDOR") return undefined;
  return ["PEDIDO", "OPERACIONAL"];
}

export function perfilNotificacaoUsuario(usuario: { perfil: string; perfilAdministrativo?: { codigo: string; ativo: boolean } | null }) {
  if (usuario.perfilAdministrativo?.ativo) return usuario.perfilAdministrativo.codigo;
  return usuario.perfil;
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

function chaveNotificacao(params: { tipo: string; origemTipo: string; origemId?: string | null; linkAcao?: string | null }) {
  return [params.tipo, params.origemTipo, params.origemId || "", params.linkAcao || ""].join("|");
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

async function resolverDestinatarios(params: {
  tipo: string;
  categoria: string;
  prioridade: string;
  perfisDestino?: string[];
}) {
  const regras = await prisma.regraNotificacaoPerfil.findMany({
    where: {
      ativo: true,
      canalInApp: true,
      OR: [
        { tipoNotificacao: params.tipo },
        { tipoNotificacao: "*" },
        { categoria: params.categoria },
      ],
    },
    include: {
      perfil: true,
      usuario: { select: { id: true, ativo: true } },
    },
  });

  const perfis = new Set<string>();
  const usuarios = new Set<string>();
  const regrasEspecificas = regras.filter((regra) => regra.tipoNotificacao === params.tipo);
  const regrasAplicaveis = regrasEspecificas.length ? regrasEspecificas : regras;

  for (const regra of regrasAplicaveis) {
    if (!prioridadeAtendeMinima(params.prioridade, regra.prioridadeMinima)) continue;
    if (regra.perfil?.ativo) {
      perfis.add(regra.perfil.codigo);
      if (regra.perfil.tipoBase === "ADMIN_GERAL") perfis.add("ACESSO_GERAL");
      if (regra.perfil.tipoBase === "VENDEDOR") perfis.add("VENDEDOR");
    }
    if (regra.usuario?.ativo) usuarios.add(regra.usuario.id);
  }

  if (perfis.size === 0 && usuarios.size === 0) {
    for (const perfil of params.perfisDestino?.length ? params.perfisDestino : destinoPadrao(params.categoria)) {
      perfis.add(mapearPerfilLegado(perfil) === "ADMIN_GERAL" ? "ACESSO_GERAL" : "VENDEDOR");
      perfis.add(perfil);
    }
  }

  return { perfis: [...perfis], usuarios: [...usuarios] };
}

async function garantirDestinatariosRegras(notificacaoId: string, params: CriarNotificacaoParams) {
  const destinos = await resolverDestinatarios({
    tipo: params.tipo,
    categoria: params.categoria,
    prioridade: params.prioridade,
    perfisDestino: params.perfisDestino,
  });

  await Promise.all([
    garantirDestinatarios(notificacaoId, destinos.perfis),
    prisma.notificacaoUsuario.deleteMany({
      where: {
        notificacaoId,
        usuarioId: null,
        perfilDestino: { notIn: destinos.perfis },
      },
    }),
    ...destinos.usuarios.map((usuarioId) =>
      prisma.notificacaoUsuario.upsert({
        where: {
          notificacaoId_usuarioId: {
            notificacaoId,
            usuarioId,
          },
        },
        update: {},
        create: {
          notificacaoId,
          usuarioId,
        },
      }),
    ),
  ]);
}

export async function criarNotificacao(params: CriarNotificacaoParams) {
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

  await garantirDestinatariosRegras(notificacao.id, params);
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

  await garantirDestinatariosRegras(notificacao.id, params);

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
  }).then((notificacoes) =>
    notificacoes
      .map((notificacao) => {
        const destinatarioUsuario = notificacao.destinatarios.find((item) => item.usuarioId === params.usuarioId);
        const destinatarioPerfil = notificacao.destinatarios.find((item) => item.perfilDestino === params.perfil);
        const destinatario = destinatarioUsuario || destinatarioPerfil;
        const statusIndividual = destinatario?.arquivadaEm
          ? "ARQUIVADA"
          : destinatario?.lidaEm
            ? "LIDA"
            : notificacao.status;

        return {
          ...notificacao,
          status: statusIndividual,
          destinatarios: destinatario ? [destinatario] : [],
        };
      })
      .filter((notificacao) => {
        const destinatario = notificacao.destinatarios[0];
        if (!destinatario || destinatario.excluidaEm) return false;
        if (params.status && params.status !== "TODAS") return notificacao.status === params.status;
        return true;
      }),
  );
}

export async function contarNotificacoesNaoLidas(usuarioId: string, perfil: PerfilAdmin) {
  const notificacoes = (await listarNotificacoes({ usuarioId, perfil, take: 1000 })).filter((item) => item.status === "NOVA");
  const total = notificacoes.length;
  const pedidos = notificacoes.filter((item) => item.categoria === "PEDIDO").length;
  const reposicao = notificacoes.filter((item) => ["ESTOQUE", "REPOSICAO"].includes(item.categoria)).length;
  const recomendacoes = notificacoes.filter((item) => item.categoria === "RECOMENDACAO").length;
  const campanhas = notificacoes.filter((item) => item.categoria === "CAMPANHA").length;
  const precificacao = notificacoes.filter((item) => item.categoria === "PRECIFICACAO").length;

  return { total, pedidos, reposicao, recomendacoes, campanhas, precificacao };
}

async function destinatarioDoUsuario(notificacaoId: string, usuarioId: string, perfil: PerfilAdmin) {
  const notificacao = await prisma.notificacaoSistema.findFirst({
    where: {
      id: notificacaoId,
      status: { not: "EXCLUIDA" },
      ...filtroAcesso(perfil),
    },
    select: { id: true },
  });

  if (!notificacao) {
    throw new Error("Notificacao nao encontrada ou sem permissao para este perfil.");
  }

  const destinoUsuario = await prisma.notificacaoUsuario.findFirst({
    where: {
      notificacaoId,
      usuarioId,
    },
  });

  if (destinoUsuario) return destinoUsuario;

  const destinoPerfil = await prisma.notificacaoUsuario.findFirst({
    where: {
      notificacaoId,
      perfilDestino: perfil,
    },
  });

  if (!destinoPerfil) {
    throw new Error("Notificacao nao encontrada ou sem permissao para este perfil.");
  }

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

  return prisma.notificacaoSistema.findUniqueOrThrow({ where: { id } });
}

export async function arquivarNotificacao(id: string, usuarioId: string, perfil: PerfilAdmin) {
  const destinatario = await destinatarioDoUsuario(id, usuarioId, perfil);
  await prisma.notificacaoUsuario.update({
    where: { id: destinatario.id },
    data: { arquivadaEm: new Date() },
  });

  return prisma.notificacaoSistema.findUniqueOrThrow({ where: { id } });
}

export async function excluirNotificacao(id: string, usuarioId: string, perfil: PerfilAdmin) {
  const destinatario = await destinatarioDoUsuario(id, usuarioId, perfil);
  await prisma.notificacaoUsuario.update({
    where: { id: destinatario.id },
    data: { excluidaEm: new Date() },
  });

  return prisma.notificacaoSistema.findUniqueOrThrow({ where: { id } });
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
  const ativas = new Set<string>();
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
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_PAGO_PREPARO", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
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
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_PAGAMENTO_PENDENTE", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
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
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_COM_PROBLEMA", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
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

    if (pedido.status === "CANCELADO") {
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_CANCELADO_CONFERENCIA", origemTipo: "PEDIDO", origemId: pedido.id, linkAcao }));
      await criarOuAtualizarNotificacao({
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
        metadataJson: { codigo: pedido.codigo, status: pedido.status, statusPagamento: pedido.statusPagamento },
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

    if (
      pedido.statusPagamento === "PAGO" &&
      pedido.envio?.tipoEntrega !== "RETIRADA" &&
      pedido.envio?.etiquetaPdfUrl &&
      ["ETIQUETA_GERADA", "PREPARADO"].includes(pedido.envio.statusEnvio)
    ) {
      const linkEtiquetasLote = `/pedidos/etiquetas/lote?ids=${encodeURIComponent(pedido.id)}`;
      ativas.add(chaveNotificacao({ tipo: "PEDIDO_ETIQUETA_PRONTA_IMPRESSAO", origemTipo: "PEDIDO_ENVIO", origemId: pedido.envio.id, linkAcao: linkEtiquetasLote }));
      await criarOuAtualizarNotificacao({
        tipo: "PEDIDO_ETIQUETA_PRONTA_IMPRESSAO",
        categoria: "OPERACIONAL",
        prioridade: "ALTA",
        titulo: `Etiqueta pronta para impressao: ${pedido.codigo}`,
        descricao: "A etiqueta ja foi gerada. Imprimir e preparar postagem.",
        resumo: "Etiqueta pronta",
        origemTipo: "PEDIDO_ENVIO",
        origemId: pedido.envio.id,
        linkAcao: linkEtiquetasLote,
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

  return { total, ativas };
}

async function sincronizarRecomendacoes() {
  const ativas = new Set<string>();
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
    const linkAcao = recomendacao.tipo === "REPOSICAO" ? "/compras/reposicao" : "/compras/recomendacoes";
    ativas.add(chaveNotificacao({
      tipo: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO_SUGERIDA" : "RECOMENDACAO_GERENCIAL_NOVA",
      origemTipo: "RECOMENDACAO_GERENCIAL",
      origemId: recomendacao.id,
      linkAcao,
    }));

    await criarOuAtualizarNotificacao({
      tipo: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO_SUGERIDA" : "RECOMENDACAO_GERENCIAL_NOVA",
      categoria: recomendacao.tipo === "REPOSICAO" ? "REPOSICAO" : "RECOMENDACAO",
      prioridade: recomendacao.prioridade === "ALTA" ? "ALTA" : "MEDIA",
      titulo: recomendacao.titulo,
      descricao: recomendacao.descricao,
      resumo: recomendacao.motivo || recomendacao.impactoEsperado,
      origemTipo: "RECOMENDACAO_GERENCIAL",
      origemId: recomendacao.id,
      linkAcao,
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
    await criarOuAtualizarNotificacao({
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
      perfisDestino: [...PERFIS_ESTRATEGICOS],
    });
    total += 1;
  }

  return { total, ativas };
}

async function sincronizarCampanhas() {
  const ativas = new Set<string>();
  const campanhas = await prisma.campanhaComercial.findMany({
    where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });
  let total = 0;

  for (const campanha of campanhas) {
    if (campanha.status === "RASCUNHO" || campanha.status === "PLANEJADA") {
      ativas.add(chaveNotificacao({ tipo: "CAMPANHA_AGUARDA_ACAO", origemTipo: "CAMPANHA_COMERCIAL", origemId: campanha.id, linkAcao: "/compras/campanhas" }));
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

  return { total, ativas };
}

async function sincronizarPrecificacao() {
  const ativas = new Set<string>();
  const analise = await analisarPrecificacaoProdutos();
  const criticos = analise.produtos.filter(
    (produto) =>
      produto.custoAusente ||
      produto.classificacao === "PRECO_CRITICO" ||
      produto.campanhasAbertas.some((campanha) => campanha.alertaDesconto),
  );
  let total = 0;

  for (const produto of criticos.slice(0, 30)) {
    ativas.add(chaveNotificacao({
      tipo: produto.custoAusente ? "PRODUTO_SEM_CUSTO" : "PRECIFICACAO_ALERTA",
      origemTipo: "PRECIFICACAO_PRODUTO",
      origemId: produto.produtoId,
      linkAcao: "/compras/precificacao",
    }));
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

  return { total, ativas };
}

async function arquivarNotificacoesObsoletas(ativas: Set<string>) {
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

export async function sincronizarNotificacoesOperacionais() {
  // WhatsApp/SMS/e-mail entram depois por provedor externo. Nesta etapa o canal criado e apenas IN_APP.
  const [pedidos, recomendacoes, campanhas, precificacao] = await Promise.all([
    sincronizarPedidos(),
    sincronizarRecomendacoes(),
    sincronizarCampanhas(),
    sincronizarPrecificacao(),
  ]);
  const ativas = new Set<string>([
    ...pedidos.ativas,
    ...recomendacoes.ativas,
    ...campanhas.ativas,
    ...precificacao.ativas,
  ]);
  const arquivadas = await arquivarNotificacoesObsoletas(ativas);

  return {
    total: pedidos.total + recomendacoes.total + campanhas.total + precificacao.total,
    arquivadas,
    porCategoria: {
      PEDIDO_OPERACIONAL: pedidos.total,
      RECOMENDACAO_REPOSICAO: recomendacoes.total,
      CAMPANHA: campanhas.total,
      PRECIFICACAO: precificacao.total,
    },
  };
}
