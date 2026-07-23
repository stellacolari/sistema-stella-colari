import "server-only";

import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  conteudosPaginaIguais,
  extrairReferenciasMidia,
  getConteudoContratoVersionado,
  normalizarConteudoPagina,
  parseDataHoraConteudo,
  projetarConteudoPublico,
  resolverContratoPagina,
  validarConteudoPagina,
  type ConteudoContrato,
  type ConteudoImagem,
  type ConteudoPaginaPayload,
} from "@/lib/loja/conteudo/contracts";
import {
  adaptarBuilderLegado,
  type PaginaLegadaConteudo,
} from "@/lib/loja/conteudo/legacy-adapter";
import { serializarBlocosBuilderPublicos } from "@/lib/loja/blocos-publicos.server";
import {
  isStellaHomeBlockConfigSupported,
  STELLA_HOME_NAMESPACE,
} from "@/lib/loja/stella-home-contract";

export type ConteudoUsuarioAuditoria = {
  id: string;
  nome: string;
};

export type ConteudoPaginaBase = PaginaLegadaConteudo & {
  ativo: boolean;
  statusPublicacao: string;
  publicadoEm?: Date | null;
  atualizadoEm?: Date;
  categoria?: { slug: string } | null;
};

export type ConteudoBaseVisualHomeBloco = {
  id: string;
  tipo: string;
  titulo: string | null;
  ordem: number;
  ativo: true;
  configJson: Record<string, unknown>;
};

export type ConteudoEstadoEditor = {
  documentoId: string | null;
  chave: string;
  contrato: ReturnType<typeof resolverContratoPagina>;
  conteudo: ConteudoPaginaPayload;
  revisao: number;
  status: string;
  modoEntrega: string;
  publicadoEm: string | null;
  inicioPublicacao: string | null;
  fimPublicacao: string | null;
  prioridade: number;
  conteudoPublicado: ConteudoPaginaPayload | null;
  temAlteracoesNaoPublicadas: boolean;
  origemPublicada: "NOVO" | "LEGADO" | null;
  versaoPublicadaId: string | null;
  versaoPublicada: number | null;
  atualizadoEm: string | null;
  atualizadoPorNome: string | null;
  publicadoPorNome: string | null;
  avisosLegado: string[];
  blocosNaoMapeados: Array<{ id: string; tipo: string; titulo: string | null }>;
  historico: Array<{
    id: string;
    numero: number;
    operacao: string;
    resumo: string | null;
    autorNome: string | null;
    criadoEm: string;
    publicada: boolean;
  }>;
};

function jsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function planejamentoCampanha(
  contratoKey: string,
  conteudo: ConteudoPaginaPayload,
) {
  if (contratoKey !== "campanha") {
    return {
      inicioPublicacao: null,
      fimPublicacao: null,
      prioridade: 0,
    };
  }

  return {
    inicioPublicacao: parseDataHoraConteudo(conteudo.values["settings.startAt"]),
    fimPublicacao: parseDataHoraConteudo(conteudo.values["settings.endAt"]),
    prioridade: Math.max(
      0,
      Math.min(100, Number(conteudo.values["settings.priority"] ?? 0)),
    ),
  };
}

function chaveDocumentoPagina(pagina: { tipo: string; slug: string; id: string }) {
  if (pagina.tipo === "HOME" || pagina.slug === "home") return "page:home";
  if (pagina.tipo === "PRODUTO_GLOBAL") return "page:product:global";
  if (pagina.tipo === "BUSCA_GLOBAL") return "page:search";
  if (pagina.tipo === "CATEGORIA") return `page:category:${pagina.id}`;
  if (pagina.tipo === "TEMPLATE_CATEGORIA") return "page:category:default";
  if (pagina.tipo === "LEGAL") return `page:legal:${pagina.slug}`;
  if (pagina.tipo === "CAMPANHA") return `campaign:${pagina.id}`;
  return `page:${pagina.slug}`;
}

function rotaPublicaPagina(pagina: { tipo: string; slug: string }) {
  if (pagina.tipo === "HOME" || pagina.slug === "home") return "/loja";
  if (pagina.tipo === "PRODUTO_GLOBAL") return null;
  if (pagina.tipo === "BUSCA_GLOBAL") return "/loja/busca";
  if (pagina.tipo === "CATEGORIA") return null;
  if (pagina.tipo === "TEMPLATE_CATEGORIA") return null;
  if (pagina.tipo === "LEGAL") return `/loja/${pagina.slug}`;
  return `/loja/p/${pagina.slug}`;
}

const LIMITE_BLOCOS_BASE_VISUAL_HOME = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function paginaEhHome(pagina: { tipo: string; slug: string }) {
  return pagina.tipo === "HOME" || pagina.slug === "home";
}

function sanitizarBlocoBaseVisualHome(
  value: unknown,
): ConteudoBaseVisualHomeBloco | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const tipo = typeof value.tipo === "string" ? value.tipo.trim() : "";
  const titulo =
    value.titulo === null
      ? null
      : typeof value.titulo === "string"
        ? value.titulo
        : null;
  const ordem = value.ordem;

  if (
    !id ||
    !tipo ||
    (value.titulo !== null && typeof value.titulo !== "string") ||
    typeof ordem !== "number" ||
    !Number.isSafeInteger(ordem) ||
    value.ativo !== true ||
    !isRecord(value.configJson)
  ) {
    return null;
  }

  const [publico] = serializarBlocosBuilderPublicos([
    {
      id,
      tipo,
      titulo,
      ordem,
      ativo: true,
      configJson: value.configJson,
    },
  ]);
  if (!publico?.stellaHomeKey) return null;
  if (
    !isStellaHomeBlockConfigSupported(
      publico.stellaHomeKey,
      publico.configJson,
    )
  ) {
    return null;
  }

  const configJson = {
    ...publico.configJson,
    _stellaSetup: {
      namespace: STELLA_HOME_NAMESPACE,
      key: publico.stellaHomeKey,
      version: 2,
    },
  };

  return {
    id: publico.id,
    tipo: publico.tipo,
    titulo: publico.titulo,
    ordem: publico.ordem,
    ativo: true,
    configJson,
  };
}

function sanitizarBaseVisualHome(
  blocos: readonly unknown[],
): ConteudoBaseVisualHomeBloco[] | null {
  if (
    blocos.length === 0 ||
    blocos.length > LIMITE_BLOCOS_BASE_VISUAL_HOME
  ) {
    return null;
  }

  const sanitizados = blocos.map(sanitizarBlocoBaseVisualHome);
  if (sanitizados.some((bloco) => bloco === null)) return null;

  const blocosValidos = sanitizados as ConteudoBaseVisualHomeBloco[];
  const ids = new Set(blocosValidos.map((bloco) => bloco.id));
  if (ids.size !== blocosValidos.length) return null;

  return blocosValidos;
}

function criarBaseVisualHome(
  pagina: ConteudoPaginaBase,
): ConteudoBaseVisualHomeBloco[] | null {
  if (!paginaEhHome(pagina)) return null;

  return sanitizarBaseVisualHome(
    pagina.blocos.filter((bloco) => bloco.ativo === true),
  );
}

function parseOrigemJson(value: unknown) {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const avisosLegado = Array.isArray(record.avisos)
    ? record.avisos.map(String).slice(0, 20)
    : [];
  const blocosNaoMapeados = Array.isArray(record.blocosNaoMapeados)
    ? record.blocosNaoMapeados
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const bloco = item as Record<string, unknown>;
          return {
            id: String(bloco.id ?? ""),
            tipo: String(bloco.tipo ?? ""),
            titulo: bloco.titulo ? String(bloco.titulo) : null,
          };
        })
        .filter((item) => item.id && item.tipo)
    : [];
  const paginaEstadoRecord =
    record.paginaEstadoLegado &&
    typeof record.paginaEstadoLegado === "object" &&
    !Array.isArray(record.paginaEstadoLegado)
      ? (record.paginaEstadoLegado as Record<string, unknown>)
      : null;
  const paginaEstadoLegado =
    paginaEstadoRecord &&
    typeof paginaEstadoRecord.ativo === "boolean" &&
    typeof paginaEstadoRecord.statusPublicacao === "string"
      ? {
          ativo: paginaEstadoRecord.ativo,
          statusPublicacao: paginaEstadoRecord.statusPublicacao,
          publicadoEm:
            typeof paginaEstadoRecord.publicadoEm === "string"
              ? paginaEstadoRecord.publicadoEm
              : null,
        }
      : null;

  const baseVisualHome = sanitizarBaseVisualHome(
    Array.isArray(record.baseVisualHome) ? record.baseVisualHome : [],
  );

  return {
    avisosLegado,
    blocosNaoMapeados,
    paginaEstadoLegado,
    baseVisualHome,
  };
}

export async function buscarPaginaConteudoBase(paginaId: string) {
  return prisma.lojaPagina.findUnique({
    where: { id: paginaId },
    select: {
      id: true,
      titulo: true,
      slug: true,
      tipo: true,
      ativo: true,
      statusPublicacao: true,
      publicadoEm: true,
      atualizadoEm: true,
      seoTitle: true,
      seoDescription: true,
      categoria: { select: { slug: true } },
      blocos: {
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        select: {
          id: true,
          tipo: true,
          titulo: true,
          ativo: true,
          ordem: true,
          configJson: true,
        },
      },
    },
  });
}

export async function montarEstadoEditorConteudo(
  pagina: ConteudoPaginaBase,
): Promise<ConteudoEstadoEditor> {
  const contrato = resolverContratoPagina(pagina);
  const documento = await prisma.lojaConteudoDocumento.findUnique({
    where: { paginaId: pagina.id },
    include: {
      versaoPublicada: {
        select: {
          id: true,
          numero: true,
          contratoChave: true,
          contratoVersao: true,
          conteudoJson: true,
          autorNome: true,
          criadoEm: true,
        },
      },
      versoes: {
        orderBy: { numero: "desc" },
        take: 30,
        select: {
          id: true,
          numero: true,
          operacao: true,
          resumo: true,
          autorNome: true,
          criadoEm: true,
        },
      },
    },
  });

  if (!documento) {
    const legado = adaptarBuilderLegado(pagina);
    const temPublicacaoLegada =
      pagina.ativo && pagina.statusPublicacao === "PUBLICADA";

    return {
      documentoId: null,
      chave: chaveDocumentoPagina(pagina),
      contrato,
      conteudo: legado.conteudo,
      revisao: 0,
      status: pagina.statusPublicacao === "PUBLICADA" ? "LEGADO_PUBLICADO" : "RASCUNHO",
      modoEntrega: "LEGADO",
      publicadoEm: pagina.publicadoEm?.toISOString() ?? null,
      inicioPublicacao: null,
      fimPublicacao: null,
      prioridade: 0,
      conteudoPublicado: temPublicacaoLegada ? legado.conteudo : null,
      temAlteracoesNaoPublicadas: !temPublicacaoLegada,
      origemPublicada: temPublicacaoLegada ? "LEGADO" : null,
      versaoPublicadaId: null,
      versaoPublicada: null,
      atualizadoEm: pagina.atualizadoEm?.toISOString() ?? null,
      atualizadoPorNome: null,
      publicadoPorNome: null,
      avisosLegado: legado.avisos,
      blocosNaoMapeados: legado.blocosNaoMapeados,
      historico: [],
    };
  }

  const originAtual =
    documento.modoEntrega === "LEGADO" ? sourceOrigin(pagina) : documento.origemJson;
  const origin = parseOrigemJson(originAtual);
  const contentContract = getConteudoContratoVersionado(
    documento.contratoChave,
    documento.contratoVersao,
  );
  const conteudo = normalizarConteudoPagina(contentContract, documento.rascunhoJson);
  const planejamentoRascunho = planejamentoCampanha(contentContract.key, conteudo);
  const ultimaEdicao = documento.versoes.find((versao) =>
    [
      "RASCUNHO",
      "RESTAURACAO",
      "RESTAURACAO_PUBLICADA",
      "MIGRACAO",
    ].includes(versao.operacao),
  );
  let conteudoPublicado: ConteudoPaginaPayload | null = null;
  let origemPublicada: ConteudoEstadoEditor["origemPublicada"] = null;
  let versaoPublicadaId: string | null = null;
  let versaoPublicada: number | null = null;
  let publicadoEm: string | null = null;
  let publicadoPorNome: string | null = null;

  if (documento.modoEntrega === "NOVO" && documento.versaoPublicada) {
    const contratoPublicado = getConteudoContratoVersionado(
      documento.versaoPublicada.contratoChave,
      documento.versaoPublicada.contratoVersao,
    );
    conteudoPublicado = normalizarConteudoPagina(
      contratoPublicado,
      documento.versaoPublicada.conteudoJson,
    );
    origemPublicada = "NOVO";
    versaoPublicadaId = documento.versaoPublicada.id;
    versaoPublicada = documento.versaoPublicada.numero;
    publicadoEm =
      documento.publicadoEm?.toISOString() ??
      documento.versaoPublicada.criadoEm.toISOString();
    publicadoPorNome =
      documento.publicadoPorNome ?? documento.versaoPublicada.autorNome;
  } else if (
    documento.modoEntrega === "LEGADO" &&
    pagina.ativo &&
    pagina.statusPublicacao === "PUBLICADA"
  ) {
    const legadoPublicado = adaptarBuilderLegado(pagina);
    conteudoPublicado = legadoPublicado.conteudo;
    origemPublicada = "LEGADO";
    publicadoEm = pagina.publicadoEm?.toISOString() ?? null;
    publicadoPorNome = null;
  }

  return {
    documentoId: documento.id,
    chave: documento.chave,
    contrato: contentContract,
    conteudo,
    revisao: documento.revisaoRascunho,
    status: documento.status,
    modoEntrega: documento.modoEntrega,
    publicadoEm,
    inicioPublicacao:
      planejamentoRascunho.inicioPublicacao?.toISOString() ??
      documento.inicioPublicacao?.toISOString() ??
      null,
    fimPublicacao:
      planejamentoRascunho.fimPublicacao?.toISOString() ??
      documento.fimPublicacao?.toISOString() ??
      null,
    prioridade: planejamentoRascunho.prioridade || documento.prioridade,
    conteudoPublicado,
    temAlteracoesNaoPublicadas:
      !conteudoPublicado || !conteudosPaginaIguais(conteudo, conteudoPublicado),
    origemPublicada,
    versaoPublicadaId,
    versaoPublicada,
    atualizadoEm:
      ultimaEdicao?.criadoEm.toISOString() ?? documento.atualizadoEm.toISOString(),
    atualizadoPorNome:
      ultimaEdicao?.autorNome ?? documento.atualizadoPorNome,
    publicadoPorNome,
    avisosLegado: origin.avisosLegado,
    blocosNaoMapeados: origin.blocosNaoMapeados,
    historico: documento.versoes.map((versao) => ({
      id: versao.id,
      numero: versao.numero,
      operacao: versao.operacao,
      resumo: versao.resumo,
      autorNome: versao.autorNome,
      criadoEm: versao.criadoEm.toISOString(),
      publicada: versao.id === documento.versaoPublicada?.id,
    })),
  };
}

function urlsLegadasPermitidas(pagina: ConteudoPaginaBase) {
  const legado = adaptarBuilderLegado(pagina).conteudo;
  const urls = new Set<string>();
  for (const value of Object.values(legado.values)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const media = value as ConteudoImagem;
    if (media.desktopUrl) urls.add(media.desktopUrl);
    if (media.mobileUrl) urls.add(media.mobileUrl);
  }
  return urls;
}

async function hidratarMidiasConteudo(
  pagina: ConteudoPaginaBase,
  contrato: ConteudoContrato,
  payload: ConteudoPaginaPayload,
) {
  const imageFields = contrato.sections
    .flatMap((section) => section.campos)
    .filter((field) => field.tipo === "IMAGEM");
  const ids = Array.from(
    new Set(
      imageFields.flatMap((field) => {
        const media = payload.values[field.key] as ConteudoImagem;
        return [media?.assetId, media?.mobileAssetId].filter(Boolean);
      }),
    ),
  );
  const assets = ids.length
    ? await prisma.midiaAsset.findMany({
        where: {
          id: { in: ids },
          status: "ATIVO",
          tipo: "IMAGEM",
          mimeType: { in: ["image/jpeg", "image/png", "image/webp"] },
        },
        select: { id: true, url: true },
      })
    : [];
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const legacyUrls = urlsLegadasPermitidas(pagina);
  const values = { ...payload.values };
  const issues: ReturnType<typeof validarConteudoPagina> = [];

  for (const field of imageFields) {
    const media = { ...(payload.values[field.key] as ConteudoImagem) };
    const desktopAsset = media.assetId ? assetById.get(media.assetId) : null;
    const mobileAsset = media.mobileAssetId ? assetById.get(media.mobileAssetId) : null;

    if (media.assetId && !desktopAsset) {
      issues.push({
        campo: field.key,
        mensagem: `${field.label} referencia uma imagem indisponível.`,
        nivel: "ERRO",
      });
    } else if (desktopAsset) {
      media.desktopUrl = desktopAsset.url;
    } else if (media.desktopUrl && !legacyUrls.has(media.desktopUrl)) {
      issues.push({
        campo: field.key,
        mensagem: `${field.label} deve usar uma imagem da biblioteca.`,
        nivel: "ERRO",
      });
    }

    if (media.mobileAssetId && !mobileAsset) {
      issues.push({
        campo: field.key,
        mensagem: `${field.label} referencia uma imagem mobile indisponível.`,
        nivel: "ERRO",
      });
    } else if (mobileAsset) {
      media.mobileUrl = mobileAsset.url;
    } else if (
      media.mobileUrl &&
      media.mobileUrl !== media.desktopUrl &&
      !legacyUrls.has(media.mobileUrl)
    ) {
      issues.push({
        campo: field.key,
        mensagem: `${field.label} deve usar uma imagem mobile da biblioteca.`,
        nivel: "ERRO",
      });
    }

    values[field.key] = media;
  }

  return {
    conteudo: { ...payload, values },
    issues,
  };
}

async function validarReferenciasPublicas(
  contrato: ReturnType<typeof resolverContratoPagina>,
  payload: ConteudoPaginaPayload,
) {
  const productFields = contrato.sections
    .flatMap((section) => section.campos)
    .filter((field) => field.tipo === "PRODUTOS");
  const categoryFields = contrato.sections
    .flatMap((section) => section.campos)
    .filter((field) => field.tipo === "CATEGORIAS");
  const productIds = Array.from(
    new Set(productFields.flatMap((field) => payload.values[field.key] as string[])),
  );
  const categoryIds = Array.from(
    new Set(categoryFields.flatMap((field) => payload.values[field.key] as string[])),
  );
  const [products, categories] = await Promise.all([
    productIds.length
      ? prisma.produto.findMany({
          where: {
            id: { in: productIds },
            ativo: true,
            status: { not: "NA_LIXEIRA" },
          },
          select: {
            id: true,
            descontoAtivo: true,
            precoPromocional: true,
            precoVenda: true,
          },
        })
      : Promise.resolve([]),
    categoryIds.length
      ? prisma.categoriaProduto.findMany({
          where: { id: { in: categoryIds }, ativo: true },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);
  const publicProductIds = new Set(products.map((item) => item.id));
  const publicCategoryIds = new Set(categories.map((item) => item.id));
  const issues: ReturnType<typeof validarConteudoPagina> = [];

  for (const field of productFields) {
    const ids = payload.values[field.key] as string[];
    const unavailable = ids.filter((id) => !publicProductIds.has(id));
    if (unavailable.length > 0) {
      issues.push({
        campo: field.key,
        mensagem: `${field.label} contém ${unavailable.length} produto(s) indisponível(is).`,
        nivel: "ERRO",
      });
    }

    if (contrato.key === "ofertas") {
      const invalidDiscount = products.filter(
        (product) =>
          ids.includes(product.id) &&
          (!product.descontoAtivo ||
            product.precoPromocional === null ||
            product.precoPromocional >= product.precoVenda),
      );
      if (invalidDiscount.length > 0) {
        issues.push({
          campo: field.key,
          mensagem: "A seleção de ofertas contém produto sem desconto público válido.",
          nivel: "ERRO",
        });
      }
    }
  }

  for (const field of categoryFields) {
    const ids = payload.values[field.key] as string[];
    const unavailable = ids.filter((id) => !publicCategoryIds.has(id));
    if (unavailable.length > 0) {
      issues.push({
        campo: field.key,
        mensagem: `${field.label} contém ${unavailable.length} categoria(s) indisponível(is).`,
        nivel: "ERRO",
      });
    }
  }

  return issues;
}

function sourceOrigin(pagina: ConteudoPaginaBase) {
  const legado = adaptarBuilderLegado(pagina);
  const baseVisualHome = criarBaseVisualHome(pagina);
  return {
    fonte: "BUILDER_LEGADO",
    namespace: "conteudo-loja-v1",
    adapterVersion: "conteudo-loja-v1",
    paginaId: pagina.id,
    paginaEstadoLegado: {
      ativo: pagina.ativo,
      statusPublicacao: pagina.statusPublicacao,
      publicadoEm: pagina.publicadoEm?.toISOString() ?? null,
    },
    blocosMapeadosIds: legado.blocosMapeadosIds,
    blocosNaoMapeados: legado.blocosNaoMapeados,
    avisos: legado.avisos,
    ...(paginaEhHome(pagina) ? { baseVisualHome } : {}),
  };
}

async function proximoNumeroVersao(
  tx: Prisma.TransactionClient,
  documentoId: string,
) {
  const last = await tx.lojaConteudoVersao.findFirst({
    where: { documentoId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (last?.numero ?? 0) + 1;
}

async function substituirUsosMidia(
  tx: Prisma.TransactionClient,
  documentoId: string,
  payload: ConteudoPaginaPayload,
  escopo: "RASCUNHO" | "PUBLICADO",
) {
  const usages = extrairReferenciasMidia(payload);
  await tx.lojaConteudoMidiaUso.deleteMany({ where: { documentoId, escopo } });

  if (usages.length > 0) {
    await tx.lojaConteudoMidiaUso.createMany({
      data: usages.map((usage) => ({
        documentoId,
        assetId: usage.assetId,
        slot: usage.slot,
        dispositivo: usage.dispositivo,
        escopo,
      })),
      skipDuplicates: true,
    });
  }
}

async function registrarUsosHistoricosMidia(
  tx: Prisma.TransactionClient,
  documentoId: string,
  payload: ConteudoPaginaPayload,
) {
  const usages = extrairReferenciasMidia(payload);
  if (usages.length === 0) return;

  await tx.lojaConteudoMidiaUso.createMany({
    data: usages.map((usage) => ({
      documentoId,
      assetId: usage.assetId,
      slot: usage.slot,
      dispositivo: usage.dispositivo,
      escopo: "HISTORICO",
    })),
    skipDuplicates: true,
  });
}

export class ConteudoConflitoRevisaoError extends Error {}
export class ConteudoVersaoNaoEncontradaError extends Error {}
export class ConteudoValidacaoError extends Error {
  constructor(
    message: string,
    readonly issues: ReturnType<typeof validarConteudoPagina>,
  ) {
    super(message);
  }
}

export async function salvarRascunhoConteudo({
  pagina,
  input,
  expectedRevision,
  resumo,
  usuario,
}: {
  pagina: ConteudoPaginaBase;
  input: unknown;
  expectedRevision: number;
  resumo?: string;
  usuario: ConteudoUsuarioAuditoria;
}) {
  const contrato = resolverContratoPagina(pagina);
  const normalizado = normalizarConteudoPagina(contrato, input);
  const midias = await hidratarMidiasConteudo(pagina, contrato, normalizado);
  const conteudo = midias.conteudo;
  const issues = [
    ...validarConteudoPagina(contrato, conteudo, "RASCUNHO"),
    ...midias.issues,
  ];
  const errors = issues.filter((issue) => issue.nivel === "ERRO");
  if (errors.length > 0) {
    throw new ConteudoValidacaoError("O rascunho possui campos inválidos.", issues);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      let documento = await tx.lojaConteudoDocumento.findUnique({
      where: { paginaId: pagina.id },
    });

    if (!documento) {
      if (expectedRevision !== 0) {
        throw new ConteudoConflitoRevisaoError("O conteúdo foi criado em outra sessão.");
      }

      documento = await tx.lojaConteudoDocumento.create({
        data: {
          chave: chaveDocumentoPagina(pagina),
          tipo: pagina.tipo === "CAMPANHA" ? "CAMPANHA" : "PAGINA",
          paginaId: pagina.id,
          slugPublico: rotaPublicaPagina(pagina),
          contratoChave: contrato.key,
          contratoVersao: contrato.version,
          rascunhoJson: jsonInput(conteudo),
          revisaoRascunho: 1,
          status: "RASCUNHO",
          modoEntrega: "LEGADO",
          origemJson: jsonInput(sourceOrigin(pagina)),
          criadoPorId: usuario.id,
          criadoPorNome: usuario.nome,
          atualizadoPorId: usuario.id,
          atualizadoPorNome: usuario.nome,
        },
      });
    } else {
      const result = await tx.lojaConteudoDocumento.updateMany({
        where: { id: documento.id, revisaoRascunho: expectedRevision },
        data: {
          rascunhoJson: jsonInput(conteudo),
          contratoChave: contrato.key,
          contratoVersao: contrato.version,
          revisaoRascunho: { increment: 1 },
          atualizadoPorId: usuario.id,
          atualizadoPorNome: usuario.nome,
          ...(documento.modoEntrega === "LEGADO"
            ? { origemJson: jsonInput(sourceOrigin(pagina)) }
            : {}),
        },
      });

      if (result.count !== 1) {
        throw new ConteudoConflitoRevisaoError(
          "Este conteúdo foi alterado em outra sessão. Recarregue antes de continuar.",
        );
      }

      documento = (await tx.lojaConteudoDocumento.findUnique({
        where: { id: documento.id },
      }))!;
    }

    const numero = await proximoNumeroVersao(tx, documento.id);
    const versao = await tx.lojaConteudoVersao.create({
      data: {
        documentoId: documento.id,
        numero,
        contratoChave: contrato.key,
        contratoVersao: contrato.version,
        conteudoJson: jsonInput(conteudo),
        operacao: "RASCUNHO",
        resumo: String(resumo ?? "Rascunho salvo").trim().slice(0, 240),
        autorId: usuario.id,
        autorNome: usuario.nome,
      },
    });

    await substituirUsosMidia(tx, documento.id, conteudo, "RASCUNHO");
    await registrarUsosHistoricosMidia(tx, documento.id, conteudo);

      return {
        documentoId: documento.id,
        revisao: documento.revisaoRascunho,
        issues,
        versaoId: versao.id,
        numeroVersao: numero,
      };
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ConteudoConflitoRevisaoError(
        "O conteúdo foi criado ou atualizado em outra sessão. Recarregue antes de continuar.",
      );
    }
    throw error;
  }
}

export async function publicarConteudo({
  pagina,
  expectedRevision,
  resumo,
  usuario,
}: {
  pagina: ConteudoPaginaBase;
  expectedRevision: number;
  resumo?: string;
  usuario: ConteudoUsuarioAuditoria;
}) {
  const documento = await prisma.lojaConteudoDocumento.findUnique({
    where: { paginaId: pagina.id },
  });

  if (!documento || documento.revisaoRascunho !== expectedRevision) {
    throw new ConteudoConflitoRevisaoError(
      "Salve o rascunho mais recente antes de publicar.",
    );
  }

  const originAtual =
    documento.modoEntrega === "LEGADO" ? sourceOrigin(pagina) : documento.origemJson;
  const origin = parseOrigemJson(originAtual);
  if (origin.blocosNaoMapeados.length > 0) {
    throw new ConteudoValidacaoError(
      "A experiência nova não pode ser ativada enquanto houver seções legadas sem mapeamento.",
      origin.blocosNaoMapeados.map((bloco) => ({
        campo: "legacy",
        mensagem: `Revisar seção legada: ${bloco.titulo || bloco.tipo}.`,
        nivel: "ERRO" as const,
      })),
    );
  }
  if (paginaEhHome(pagina) && !origin.baseVisualHome) {
    throw new ConteudoValidacaoError(
      "A Home não pode ser publicada sem uma base visual válida e congelada.",
      [
        {
          campo: "legacy",
          mensagem:
            "A base visual ativa da Home está ausente ou inválida. A entrega atual foi preservada.",
          nivel: "ERRO" as const,
        },
      ],
    );
  }

  const contrato = getConteudoContratoVersionado(
    documento.contratoChave,
    documento.contratoVersao,
  );
  const normalizado = normalizarConteudoPagina(contrato, documento.rascunhoJson);
  const midias = await hidratarMidiasConteudo(pagina, contrato, normalizado);
  const conteudo = midias.conteudo;
  const planejamento = planejamentoCampanha(contrato.key, conteudo);
  const issues = [
    ...validarConteudoPagina(contrato, conteudo, "PUBLICAR"),
    ...midias.issues,
  ];
  issues.push(...(await validarReferenciasPublicas(contrato, conteudo)));
  if (issues.some((issue) => issue.nivel === "ERRO")) {
    throw new ConteudoValidacaoError("O conteúdo não está pronto para publicação.", issues);
  }

  return prisma.$transaction(async (tx) => {
    const claim = await tx.lojaConteudoDocumento.updateMany({
      where: { id: documento.id, revisaoRascunho: expectedRevision },
      data: {
        rascunhoJson: jsonInput(conteudo),
        revisaoRascunho: { increment: 1 },
        ...(documento.modoEntrega === "LEGADO"
          ? { origemJson: jsonInput(originAtual) }
          : {}),
      },
    });
    if (claim.count !== 1) {
      throw new ConteudoConflitoRevisaoError("O conteúdo mudou durante a publicação.");
    }

    const numero = await proximoNumeroVersao(tx, documento.id);
    const versao = await tx.lojaConteudoVersao.create({
      data: {
        documentoId: documento.id,
        numero,
        contratoChave: contrato.key,
        contratoVersao: contrato.version,
        conteudoJson: jsonInput(conteudo),
        operacao: "PUBLICACAO",
        resumo: String(resumo ?? "Conteúdo publicado").trim().slice(0, 240),
        autorId: usuario.id,
        autorNome: usuario.nome,
      },
    });

    const agora = new Date();
    const statusPublicacao =
      planejamento.inicioPublicacao && planejamento.inicioPublicacao > agora
        ? "AGENDADA"
        : "PUBLICADA";
    await tx.lojaConteudoDocumento.update({
      where: { id: documento.id },
      data: {
        versaoPublicadaId: versao.id,
        status: statusPublicacao,
        modoEntrega: "NOVO",
        ...planejamento,
        publicadoEm: agora,
        publicadoPorId: usuario.id,
        publicadoPorNome: usuario.nome,
      },
    });

    await tx.lojaPagina.update({
      where: { id: pagina.id },
      data: { ativo: true, statusPublicacao: "PUBLICADA", publicadoEm: agora },
    });

    await substituirUsosMidia(tx, documento.id, conteudo, "PUBLICADO");
    await registrarUsosHistoricosMidia(tx, documento.id, conteudo);

    return {
      documentoId: documento.id,
      versaoId: versao.id,
      versao: numero,
      revisao: expectedRevision + 1,
      status: statusPublicacao,
      publicadoEm: agora.toISOString(),
      issues,
    };
  });
}

export async function restaurarVersaoConteudo({
  pagina,
  versaoId,
  expectedRevision,
  usuario,
}: {
  pagina: ConteudoPaginaBase;
  versaoId: string;
  expectedRevision: number;
  usuario: ConteudoUsuarioAuditoria;
}) {
  const documento = await prisma.lojaConteudoDocumento.findUnique({
    where: { paginaId: pagina.id },
  });
  if (!documento || documento.revisaoRascunho !== expectedRevision) {
    throw new ConteudoConflitoRevisaoError("O conteúdo foi alterado em outra sessão.");
  }

  const versao = await prisma.lojaConteudoVersao.findFirst({
    where: { id: versaoId, documentoId: documento.id },
  });
  if (!versao) {
    throw new ConteudoVersaoNaoEncontradaError("Versão não encontrada.");
  }

  const contrato = getConteudoContratoVersionado(
    versao.contratoChave,
    versao.contratoVersao,
  );
  const normalizado = normalizarConteudoPagina(contrato, versao.conteudoJson);
  const midias = await hidratarMidiasConteudo(pagina, contrato, normalizado);
  const conteudo = midias.conteudo;
  const issues = [
    ...validarConteudoPagina(contrato, conteudo, "RASCUNHO"),
    ...midias.issues,
  ];
  if (issues.some((issue) => issue.nivel === "ERRO")) {
    throw new ConteudoValidacaoError("A versão não pode ser restaurada.", issues);
  }
  return prisma.$transaction(async (tx) => {
    const update = await tx.lojaConteudoDocumento.updateMany({
      where: { id: documento.id, revisaoRascunho: expectedRevision },
      data: {
        rascunhoJson: jsonInput(conteudo),
        contratoChave: contrato.key,
        contratoVersao: contrato.version,
        revisaoRascunho: { increment: 1 },
        atualizadoPorId: usuario.id,
        atualizadoPorNome: usuario.nome,
      },
    });
    if (update.count !== 1) {
      throw new ConteudoConflitoRevisaoError("O conteúdo mudou durante a restauração.");
    }

    const numero = await proximoNumeroVersao(tx, documento.id);
    const novaVersao = await tx.lojaConteudoVersao.create({
      data: {
        documentoId: documento.id,
        numero,
        contratoChave: contrato.key,
        contratoVersao: contrato.version,
        conteudoJson: jsonInput(conteudo),
        operacao: "RESTAURACAO",
        resumo: `Versão ${versao.numero} restaurada como rascunho`,
        autorId: usuario.id,
        autorNome: usuario.nome,
      },
    });

    await substituirUsosMidia(tx, documento.id, conteudo, "RASCUNHO");
    await registrarUsosHistoricosMidia(tx, documento.id, conteudo);
    return {
      revisao: expectedRevision + 1,
      versaoId: novaVersao.id,
      numeroVersao: numero,
      conteudo,
    };
  });
}

export async function restaurarPublicadoComoRascunho({
  pagina,
  expectedRevision,
  usuario,
}: {
  pagina: ConteudoPaginaBase;
  expectedRevision: number;
  usuario: ConteudoUsuarioAuditoria;
}) {
  const documento = await prisma.lojaConteudoDocumento.findUnique({
    where: { paginaId: pagina.id },
    include: {
      versaoPublicada: {
        select: {
          numero: true,
          contratoChave: true,
          contratoVersao: true,
          conteudoJson: true,
        },
      },
    },
  });
  if (!documento || documento.revisaoRascunho !== expectedRevision) {
    throw new ConteudoConflitoRevisaoError(
      "O conteúdo foi alterado em outra sessão. Recarregue antes de restaurar.",
    );
  }

  let origemPublicada: "NOVO" | "LEGADO";
  let versaoPublicada: number | null = null;
  let contrato: ConteudoContrato;
  let normalizado: ConteudoPaginaPayload;

  if (documento.modoEntrega === "NOVO") {
    if (!documento.versaoPublicada) {
      throw new ConteudoValidacaoError(
        "Não há uma versão publicada disponível para restaurar.",
        [],
      );
    }

    origemPublicada = "NOVO";
    versaoPublicada = documento.versaoPublicada.numero;
    contrato = getConteudoContratoVersionado(
      documento.versaoPublicada.contratoChave,
      documento.versaoPublicada.contratoVersao,
    );
    normalizado = normalizarConteudoPagina(
      contrato,
      documento.versaoPublicada.conteudoJson,
    );
  } else if (documento.modoEntrega === "LEGADO") {
    if (!pagina.ativo || pagina.statusPublicacao !== "PUBLICADA") {
      throw new ConteudoValidacaoError(
        "Não há conteúdo legado publicado disponível para restaurar.",
        [],
      );
    }

    origemPublicada = "LEGADO";
    const legado = adaptarBuilderLegado(pagina);
    contrato = legado.contrato;
    normalizado = normalizarConteudoPagina(contrato, legado.conteudo);
  } else {
    throw new ConteudoValidacaoError(
      "O modo de entrega atual é inválido; a restauração foi cancelada.",
      [],
    );
  }

  const midias = await hidratarMidiasConteudo(pagina, contrato, normalizado);
  const conteudo = midias.conteudo;
  const issues = [
    ...validarConteudoPagina(contrato, conteudo, "RASCUNHO"),
    ...midias.issues,
  ];
  if (issues.some((issue) => issue.nivel === "ERRO")) {
    throw new ConteudoValidacaoError(
      "O conteúdo publicado não pode ser restaurado como rascunho.",
      issues,
    );
  }

  return prisma.$transaction(async (tx) => {
    const update = await tx.lojaConteudoDocumento.updateMany({
      where: { id: documento.id, revisaoRascunho: expectedRevision },
      data: {
        rascunhoJson: jsonInput(conteudo),
        contratoChave: contrato.key,
        contratoVersao: contrato.version,
        revisaoRascunho: { increment: 1 },
        atualizadoPorId: usuario.id,
        atualizadoPorNome: usuario.nome,
        ...(documento.modoEntrega === "LEGADO"
          ? { origemJson: jsonInput(sourceOrigin(pagina)) }
          : {}),
      },
    });
    if (update.count !== 1) {
      throw new ConteudoConflitoRevisaoError(
        "O conteúdo mudou durante a restauração.",
      );
    }

    const numero = await proximoNumeroVersao(tx, documento.id);
    const novaVersao = await tx.lojaConteudoVersao.create({
      data: {
        documentoId: documento.id,
        numero,
        contratoChave: contrato.key,
        contratoVersao: contrato.version,
        conteudoJson: jsonInput(conteudo),
        operacao: "RESTAURACAO_PUBLICADA",
        resumo:
          origemPublicada === "NOVO" && versaoPublicada !== null
            ? `Versão publicada ${versaoPublicada} restaurada como rascunho`
            : "Conteúdo legado publicado restaurado como rascunho",
        autorId: usuario.id,
        autorNome: usuario.nome,
      },
    });

    await substituirUsosMidia(tx, documento.id, conteudo, "RASCUNHO");
    await registrarUsosHistoricosMidia(tx, documento.id, conteudo);

    return {
      revisao: expectedRevision + 1,
      versaoId: novaVersao.id,
      numeroVersao: numero,
      conteudo,
      issues,
      origemPublicada,
      versaoPublicada,
    };
  });
}

export async function rollbackConteudoParaLegado({
  pagina,
  expectedRevision,
  usuario,
}: {
  pagina: ConteudoPaginaBase;
  expectedRevision: number;
  usuario: ConteudoUsuarioAuditoria;
}) {
  const documento = await prisma.lojaConteudoDocumento.findUnique({
    where: { paginaId: pagina.id },
  });
  if (!documento || documento.revisaoRascunho !== expectedRevision) {
    throw new ConteudoConflitoRevisaoError("O conteúdo foi alterado em outra sessão.");
  }

  const origin = parseOrigemJson(documento.origemJson);
  const paginaEstadoLegado = origin.paginaEstadoLegado;
  if (!paginaEstadoLegado) {
    throw new ConteudoValidacaoError(
      "O estado público anterior não está disponível para um rollback seguro.",
      [],
    );
  }
  const publishedAt = paginaEstadoLegado.publicadoEm
    ? new Date(paginaEstadoLegado.publicadoEm)
    : null;
  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    throw new ConteudoValidacaoError(
      "A data do estado anterior é inválida; o rollback foi cancelado.",
      [],
    );
  }
  const contrato = getConteudoContratoVersionado(
    documento.contratoChave,
    documento.contratoVersao,
  );
  const conteudo = normalizarConteudoPagina(contrato, documento.rascunhoJson);

  return prisma.$transaction(async (tx) => {
    const claim = await tx.lojaConteudoDocumento.updateMany({
      where: { id: documento.id, revisaoRascunho: expectedRevision },
      data: {
        revisaoRascunho: { increment: 1 },
        modoEntrega: "LEGADO",
        status:
          paginaEstadoLegado.ativo &&
          paginaEstadoLegado.statusPublicacao === "PUBLICADA"
            ? "LEGADO_PUBLICADO"
            : "RASCUNHO",
        versaoPublicadaId: null,
        inicioPublicacao: null,
        fimPublicacao: null,
        prioridade: 0,
        publicadoEm: null,
        publicadoPorId: null,
        publicadoPorNome: null,
        atualizadoPorId: usuario.id,
        atualizadoPorNome: usuario.nome,
      },
    });
    if (claim.count !== 1) {
      throw new ConteudoConflitoRevisaoError("O conteúdo mudou durante o rollback.");
    }

    const numero = await proximoNumeroVersao(tx, documento.id);
    await tx.lojaConteudoVersao.create({
      data: {
        documentoId: documento.id,
        numero,
        contratoChave: contrato.key,
        contratoVersao: contrato.version,
        conteudoJson: jsonInput(conteudo),
        operacao: "ROLLBACK_LEGADO",
        resumo: "Entrega revertida para o renderer legado",
        autorId: usuario.id,
        autorNome: usuario.nome,
      },
    });
    await tx.lojaConteudoMidiaUso.deleteMany({
      where: { documentoId: documento.id, escopo: "PUBLICADO" },
    });

    await tx.lojaPagina.update({
      where: { id: pagina.id },
      data: {
        ativo: paginaEstadoLegado.ativo,
        statusPublicacao: paginaEstadoLegado.statusPublicacao,
        publicadoEm: publishedAt,
      },
    });

    return {
      revisao: expectedRevision + 1,
      numeroVersao: numero,
      modoEntrega: "LEGADO" as const,
      status:
        paginaEstadoLegado.ativo &&
        paginaEstadoLegado.statusPublicacao === "PUBLICADA"
          ? "LEGADO_PUBLICADO"
          : "RASCUNHO",
    };
  });
}

const buscarConteudoPublicadoPaginaMemo = cache(async (paginaId: string) => {
  const documento = await prisma.lojaConteudoDocumento.findUnique({
    where: { paginaId },
    select: {
      modoEntrega: true,
      status: true,
      inicioPublicacao: true,
      fimPublicacao: true,
      origemJson: true,
      versaoPublicada: {
        select: {
          contratoChave: true,
          contratoVersao: true,
          conteudoJson: true,
        },
      },
      pagina: {
        select: {
          ativo: true,
          statusPublicacao: true,
          tipo: true,
          slug: true,
        },
      },
    },
  });

  if (!documento || documento.modoEntrega === "LEGADO") {
    return null;
  }

  if (documento.modoEntrega !== "NOVO") {
    return {
      indisponivel: true as const,
      modoEntrega: documento.modoEntrega,
      motivo: "MODO_ENTREGA_INVALIDO" as const,
    };
  }

  if (!documento.versaoPublicada) {
    return {
      indisponivel: true as const,
      modoEntrega: "NOVO" as const,
      motivo: "VERSAO_PUBLICADA_AUSENTE" as const,
    };
  }

  if (
    !documento.pagina ||
    !documento.pagina.ativo ||
    documento.pagina.statusPublicacao !== "PUBLICADA"
  ) {
    return {
      indisponivel: true as const,
      modoEntrega: "NOVO" as const,
      motivo: "PAGINA_PUBLICA_INDISPONIVEL" as const,
    };
  }

  if (!["PUBLICADA", "AGENDADA"].includes(documento.status)) {
    return {
      indisponivel: true as const,
      modoEntrega: "NOVO" as const,
      motivo: "STATUS_PUBLICACAO_INVALIDO" as const,
    };
  }

  const now = new Date();
  if (
    (documento.inicioPublicacao && documento.inicioPublicacao > now) ||
    (documento.fimPublicacao && documento.fimPublicacao <= now)
  ) {
    return {
      indisponivel: true as const,
      modoEntrega: "NOVO" as const,
      motivo: "FORA_DA_JANELA_PUBLICACAO" as const,
    };
  }

  const origin = parseOrigemJson(documento.origemJson);
  const home = paginaEhHome(documento.pagina);
  if (home && !origin.baseVisualHome) {
    return {
      indisponivel: true as const,
      modoEntrega: "NOVO" as const,
      motivo: "BASE_VISUAL_HOME_AUSENTE" as const,
    };
  }

  const contrato = getConteudoContratoVersionado(
    documento.versaoPublicada.contratoChave,
    documento.versaoPublicada.contratoVersao,
  );
  const conteudo = normalizarConteudoPagina(
    contrato,
    documento.versaoPublicada.conteudoJson,
  );
  return {
    indisponivel: false as const,
    modoEntrega: "NOVO" as const,
    contrato,
    conteudo,
    publico: projetarConteudoPublico(contrato, conteudo),
    baseVisualHome: home ? origin.baseVisualHome : null,
  };
});

export function buscarConteudoPublicadoPagina(paginaId: string) {
  return buscarConteudoPublicadoPaginaMemo(paginaId);
}

export async function buscarConteudoPublicadoSistema({
  tipo,
  slug,
}: {
  tipo?: string;
  slug?: string;
}) {
  if ((!tipo && !slug) || (tipo && slug)) {
    throw new Error("Informe exatamente um identificador de página de conteúdo.");
  }

  const pagina = await prisma.lojaPagina.findFirst({
    where: {
      ...(tipo ? { tipo } : { slug }),
      ativo: true,
      statusPublicacao: "PUBLICADA",
    },
    select: { id: true, titulo: true, slug: true, tipo: true },
  });
  if (!pagina) return null;

  const publicado = await buscarConteudoPublicadoPagina(pagina.id);
  if (!publicado || publicado.indisponivel) return null;

  return { pagina, ...publicado };
}

export type ConteudoPreviewEscopo = "RASCUNHO" | "PUBLICADO";

type ConteudoPreviewProjetado = ReturnType<typeof projetarConteudoPublico> & {
  modoEntrega: "NOVO" | "LEGADO";
  baseVisualHome: ConteudoBaseVisualHomeBloco[] | null;
};

function projetarPreviewLegado(pagina: ConteudoPaginaBase) {
  const legado = adaptarBuilderLegado(pagina);
  return {
    ...projetarConteudoPublico(legado.contrato, legado.conteudo),
    modoEntrega: "LEGADO" as const,
    baseVisualHome: null,
  };
}

export function buscarConteudoPreviewPagina(
  pagina: ConteudoPaginaBase,
): Promise<ConteudoPreviewProjetado | null>;
export function buscarConteudoPreviewPagina(
  pagina: ConteudoPaginaBase,
  escopo: "RASCUNHO",
): Promise<ConteudoPreviewProjetado | null>;
export function buscarConteudoPreviewPagina(
  pagina: ConteudoPaginaBase,
  escopo: "PUBLICADO",
): Promise<ConteudoPreviewProjetado | null>;
export function buscarConteudoPreviewPagina(
  pagina: ConteudoPaginaBase,
  escopo: ConteudoPreviewEscopo,
): Promise<ConteudoPreviewProjetado | null>;
export async function buscarConteudoPreviewPagina(
  pagina: ConteudoPaginaBase,
  escopo: ConteudoPreviewEscopo = "RASCUNHO",
): Promise<ConteudoPreviewProjetado | null> {
  const documento = await prisma.lojaConteudoDocumento.findUnique({
    where: { paginaId: pagina.id },
  });

  if (escopo === "PUBLICADO") {
    const publicado = await buscarConteudoPublicadoPagina(pagina.id);
    if (publicado?.indisponivel) return null;
    if (publicado) {
      return {
        ...publicado.publico,
        modoEntrega: "NOVO" as const,
        baseVisualHome: publicado.baseVisualHome,
      };
    }

    if (documento && documento.modoEntrega !== "LEGADO") return null;
    if (!pagina.ativo || pagina.statusPublicacao !== "PUBLICADA") return null;

    return projetarPreviewLegado(pagina);
  }

  if (!documento) {
    return projetarPreviewLegado(pagina);
  }

  if (documento.modoEntrega !== "NOVO" && documento.modoEntrega !== "LEGADO") {
    return null;
  }

  const contrato = getConteudoContratoVersionado(
    documento.contratoChave,
    documento.contratoVersao,
  );
  const conteudo = normalizarConteudoPagina(contrato, documento.rascunhoJson);
  const origin = parseOrigemJson(documento.origemJson);
  const home = paginaEhHome(pagina);
  if (documento.modoEntrega === "NOVO" && home && !origin.baseVisualHome) {
    return null;
  }

  return {
    ...projetarConteudoPublico(contrato, conteudo),
    modoEntrega: documento.modoEntrega,
    baseVisualHome:
      documento.modoEntrega === "NOVO" && home
        ? origin.baseVisualHome
        : null,
  };
}
