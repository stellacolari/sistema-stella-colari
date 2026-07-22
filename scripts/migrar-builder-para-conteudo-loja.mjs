import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { adaptarBuilderLegado } from "../lib/loja/conteudo/legacy-adapter.ts";
import {
  criarConteudoPadrao,
  extrairReferenciasMidia,
  getConteudoContratoVersionado,
} from "../lib/loja/conteudo/contracts.ts";

const EXECUTE_CONFIRMATION = "MIGRAR_CONTEUDO_STELLA";
const ROLLBACK_CONFIRMATION = "RESTAURAR_CONTEUDO_STELLA";
const AUDIT_DIR = resolve(process.cwd(), "tmp", "auditorias");
const ADAPTER_VERSION = "conteudo-loja-v1";
const prisma = new PrismaClient();
const SYSTEM_PAGES = [
  {
    id: "cms-produto-global-v1",
    titulo: "Produto — conteúdo global",
    slug: "produto-global",
    tipo: "PRODUTO_GLOBAL",
    contratoChave: "produto",
    chaveDocumento: "page:product:global",
    slugPublico: null,
    usarComoTemplatePadrao: false,
  },
  {
    id: "cms-busca-global-v1",
    titulo: "Busca — conteúdo global",
    slug: "busca-global",
    tipo: "BUSCA_GLOBAL",
    contratoChave: "busca",
    chaveDocumento: "page:search",
    slugPublico: "/loja/busca",
    usarComoTemplatePadrao: false,
  },
  {
    id: "cms-categoria-template-v1",
    titulo: "Categorias — template padrão",
    slug: "template-categoria",
    tipo: "TEMPLATE_CATEGORIA",
    contratoChave: "categoria",
    chaveDocumento: "page:category:default",
    slugPublico: null,
    usarComoTemplatePadrao: true,
  },
  {
    id: "cms-legal-privacidade-v1",
    titulo: "Política de Privacidade",
    slug: "politica-de-privacidade",
    tipo: "LEGAL",
    contratoChave: "legal",
    chaveDocumento: "page:legal:politica-de-privacidade",
    slugPublico: "/loja/politica-de-privacidade",
    usarComoTemplatePadrao: false,
  },
  {
    id: "cms-legal-termos-v1",
    titulo: "Termos de Uso",
    slug: "termos-de-uso",
    tipo: "LEGAL",
    contratoChave: "legal",
    chaveDocumento: "page:legal:termos-de-uso",
    slugPublico: "/loja/termos-de-uso",
    usarComoTemplatePadrao: false,
  },
  {
    id: "cms-legal-trocas-v1",
    titulo: "Trocas e Devoluções",
    slug: "trocas-e-devolucoes",
    tipo: "LEGAL",
    contratoChave: "legal",
    chaveDocumento: "page:legal:trocas-e-devolucoes",
    slugPublico: "/loja/trocas-e-devolucoes",
    usarComoTemplatePadrao: false,
  },
];
const SYSTEM_PAGE_TYPES = [...new Set(SYSTEM_PAGES.map((page) => page.tipo))];

const LEGACY_PAGE_SELECT = {
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
  blocos: {
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    select: {
      id: true,
      tipo: true,
      titulo: true,
      ativo: true,
      ordem: true,
      configJson: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  },
};

function getArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || "";
}

function canonicalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function sourceFingerprint(page, adaptation) {
  return fingerprint({
    adapterVersion: ADAPTER_VERSION,
    contract: {
      key: adaptation.contrato.key,
      version: adaptation.contrato.version,
    },
    page,
  });
}

function systemSourceFingerprint(definition, contract, content) {
  return fingerprint({
    adapterVersion: ADAPTER_VERSION,
    source: "SYSTEM_PAGE",
    definition,
    contract: { key: contract.key, version: contract.version },
    content,
  });
}

function legacyPageState(page) {
  return {
    ativo: page.ativo,
    statusPublicacao: page.statusPublicacao,
    publicadoEm: page.publicadoEm?.toISOString() || null,
  };
}

function fingerprint(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function assertAuditDirectoryIgnored() {
  const probe = "tmp/auditorias/.conteudo-loja-probe";
  const result = spawnSync("git", ["check-ignore", "-q", probe], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  if (result.status !== 0) {
    throw new Error("tmp/auditorias precisa estar ignorado pelo Git antes da migração.");
  }
}

function publicPath(page) {
  if (page.tipo === "HOME" || page.slug === "home") return "/loja";
  if (["CATEGORIA", "TEMPLATE_CATEGORIA"].includes(page.tipo)) return null;
  return `/loja/p/${page.slug}`;
}

async function loadLegacyPages() {
  return prisma.lojaPagina.findMany({
    where: {
      statusPublicacao: { not: "ARQUIVADA" },
      tipo: { notIn: SYSTEM_PAGE_TYPES },
    },
    orderBy: [{ tipo: "asc" }, { slug: "asc" }],
    select: LEGACY_PAGE_SELECT,
  });
}

async function buildSystemPlan() {
  const candidates = await prisma.lojaPagina.findMany({
    where: {
      OR: [
        { id: { in: SYSTEM_PAGES.map((page) => page.id) } },
        { slug: { in: SYSTEM_PAGES.map((page) => page.slug) } },
      ],
    },
    select: {
      id: true,
      titulo: true,
      slug: true,
      tipo: true,
      ativo: true,
      statusPublicacao: true,
      publicadoEm: true,
      usarComoTemplatePadrao: true,
      conteudoDocumento: {
        select: {
          id: true,
          chave: true,
          contratoChave: true,
          contratoVersao: true,
          revisaoRascunho: true,
          modoEntrega: true,
          status: true,
          versaoPublicadaId: true,
          origemJson: true,
          versoes: {
            select: { numero: true, operacao: true },
            orderBy: { numero: "asc" },
          },
        },
      },
    },
  });

  return SYSTEM_PAGES.map((definition) => {
    const matches = candidates.filter(
      (page) => page.id === definition.id || page.slug === definition.slug,
    );
    const contract = getConteudoContratoVersionado(definition.contratoChave, 1);
    const content = criarConteudoPadrao(contract);
    const sourceFingerprintValue = systemSourceFingerprint(
      definition,
      contract,
      content,
    );
    const page = matches.length === 1 ? matches[0] : null;
    const document = page?.conteudoDocumento || null;
    const origin =
      document?.origemJson && typeof document.origemJson === "object"
        ? document.origemJson
        : {};
    const exactPage = Boolean(
      page &&
        page.id === definition.id &&
        page.slug === definition.slug &&
        page.tipo === definition.tipo &&
        page.usarComoTemplatePadrao === definition.usarComoTemplatePadrao,
    );
    const pristineDocument = Boolean(
      document &&
        document.chave === definition.chaveDocumento &&
        document.contratoChave === contract.key &&
        document.contratoVersao === contract.version &&
        document.revisaoRascunho === 1 &&
        document.modoEntrega === "LEGADO" &&
        document.status === "RASCUNHO" &&
        !document.versaoPublicadaId &&
        document.versoes.length === 1 &&
        document.versoes[0]?.numero === 1 &&
        document.versoes[0]?.operacao === "MIGRACAO" &&
        origin.fonte === "SISTEMA_CODIFICADO" &&
        origin.sourceFingerprint === sourceFingerprintValue,
    );

    return {
      kind: "SYSTEM",
      page: {
        ...definition,
        ativo: page?.ativo ?? false,
        statusPublicacao: page?.statusPublicacao ?? "RASCUNHO",
        publicadoEm: page?.publicadoEm ?? null,
        blocos: [],
      },
      adaptation: { contrato: contract, conteudo: content },
      sourceFingerprint: sourceFingerprintValue,
      existing: document,
      action:
        matches.length === 0
          ? "CRIAR"
          : matches.length === 1 && exactPage && pristineDocument
            ? "PRESERVAR"
            : "CONFLITO",
    };
  });
}

async function buildPlan() {
  const pages = await loadLegacyPages();
  const existingDocuments = await prisma.lojaConteudoDocumento.findMany({
    where: { paginaId: { in: pages.map((page) => page.id) } },
    select: {
      id: true,
      paginaId: true,
      revisaoRascunho: true,
      modoEntrega: true,
      versaoPublicadaId: true,
      origemJson: true,
    },
  });
  const documentByPage = new Map(
    existingDocuments.map((document) => [document.paginaId, document]),
  );

  const legacyItems = pages.map((page) => {
    const adaptation = adaptarBuilderLegado(page);
    const sourceFingerprintValue = sourceFingerprint(page, adaptation);
    const existing = documentByPage.get(page.id);
    const existingOrigin =
      existing?.origemJson && typeof existing.origemJson === "object"
        ? existing.origemJson
        : {};
    let action = "CRIAR";

    if (existing) {
      action =
        existingOrigin.sourceFingerprint === sourceFingerprintValue &&
        existingOrigin.adapterVersion === ADAPTER_VERSION &&
        existing.revisaoRascunho === 1 &&
        existing.modoEntrega === "LEGADO" &&
        !existing.versaoPublicadaId
          ? "PRESERVAR"
          : "CONFLITO";
    } else if (adaptation.blocosNaoMapeados.length > 0) {
      action = "NAO_MAPEADO";
    }

    return {
      kind: "LEGACY",
      page,
      adaptation,
      sourceFingerprint: sourceFingerprintValue,
      existing,
      action,
    };
  });

  const systemItems = await buildSystemPlan();

  return { pages, items: [...legacyItems, ...systemItems] };
}

function printPlan(items) {
  for (const item of items) {
    console.log(
      JSON.stringify({
        pagina: item.page.slug,
        origem: item.kind,
        tipo: item.page.tipo,
        status: item.page.statusPublicacao,
        contrato: `${item.adaptation.contrato.key}@${item.adaptation.contrato.version}`,
        blocosAtivos: item.page.blocos.filter((block) => block.ativo).length,
        naoMapeados: item.adaptation.blocosNaoMapeados?.length || 0,
        acao: item.action,
      }),
    );
  }

  const totals = Object.groupBy(items, (item) => item.action);
  console.log(
    JSON.stringify({
      resumo: {
        criar: totals.CRIAR?.length || 0,
        preservar: totals.PRESERVAR?.length || 0,
        conflito: totals.CONFLITO?.length || 0,
        naoMapeado: totals.NAO_MAPEADO?.length || 0,
      },
    }),
  );
}

async function createSnapshot(pages) {
  assertAuditDirectoryIgnored();
  await mkdir(AUDIT_DIR, { recursive: true });
  const snapshotPath = resolve(
    AUDIT_DIR,
    `conteudo-loja-snapshot-${timestamp()}.json`,
  );
  const [
    banners,
    categoriesHome,
    sectionsHome,
    blocksHome,
    institutionalTexts,
    menus,
    footer,
    media,
  ] = await Promise.all([
    prisma.bannerLoja.findMany(),
    prisma.lojaCategoriaHome.findMany(),
    prisma.lojaSecaoHome.findMany(),
    prisma.lojaBlocoHome.findMany(),
    prisma.lojaTextoInstitucional.findMany(),
    prisma.menuLoja.findMany(),
    prisma.lojaMenuRodapeConfiguracao.findMany(),
    prisma.midiaAsset.findMany({
      select: {
        id: true,
        nome: true,
        nomeOriginal: true,
        url: true,
        urlThumb: true,
        tipo: true,
        mimeType: true,
        tamanhoBytes: true,
        largura: true,
        altura: true,
        alt: true,
        descricao: true,
        tagsJson: true,
        origem: true,
        provider: true,
        providerKey: true,
        pasta: true,
        status: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    }),
  ]);

  await writeFile(
    snapshotPath,
    JSON.stringify(
      {
        schema: "conteudo-loja-snapshot-v1",
        createdAt: new Date().toISOString(),
        pages,
        banners,
        categoriesHome,
        sectionsHome,
        blocksHome,
        institutionalTexts,
        menus,
        footer,
        media,
      },
      null,
      2,
    ),
    "utf8",
  );
  return snapshotPath;
}

async function executeMigration(initialPlan) {
  const plan = await buildPlan();
  const initialByPage = new Map(
    initialPlan.items.map((item) => [item.page.id, item]),
  );
  if (
    plan.items.length !== initialPlan.items.length ||
    plan.items.some((item) => {
      const initial = initialByPage.get(item.page.id);
      return (
        !initial ||
        initial.sourceFingerprint !== item.sourceFingerprint ||
        initial.action !== item.action
      );
    })
  ) {
    throw new Error(
      "O conteúdo legado mudou após o dry-run. Execute a revisão novamente.",
    );
  }

  const publishedBlockers = plan.items.filter(
    (item) =>
      item.kind === "LEGACY" &&
      item.page.statusPublicacao === "PUBLICADA" &&
      item.action === "NAO_MAPEADO",
  );
  if (publishedBlockers.length > 0) {
    throw new Error(
      `${publishedBlockers.length} página(s) publicada(s) possuem conteúdo ativo não mapeado.`,
    );
  }
  if (plan.items.some((item) => item.action === "CONFLITO")) {
    throw new Error("Há documentos com edição nova; a migração não sobrescreverá conflitos.");
  }

  const snapshotPath = await createSnapshot(plan.pages);
  const toCreate = plan.items.filter((item) => item.action === "CRIAR");
  const toCreateLegacy = toCreate.filter((item) => item.kind === "LEGACY");
  const toCreateSystem = toCreate.filter((item) => item.kind === "SYSTEM");
  const runId = randomUUID();
  const manifestPath = resolve(
    AUDIT_DIR,
    `conteudo-loja-manifest-${timestamp()}.json`,
  );
  const manifestBase = {
    schema: "conteudo-loja-manifest-v2",
    runId,
    createdAt: new Date().toISOString(),
    snapshotPath,
    planned: toCreate.map((item) => ({
      paginaId: item.page.id,
      sourceFingerprint: item.sourceFingerprint,
      source: item.kind,
    })),
  };

  await writeFile(
    manifestPath,
    JSON.stringify({ ...manifestBase, status: "PREPARADO", created: [] }, null, 2),
    "utf8",
  );

  let created;
  try {
    created = await prisma.$transaction(
      async (tx) => {
        const results = [];
        for (const item of toCreateLegacy) {
          await tx.$queryRaw`SELECT "id" FROM "LojaPagina" WHERE "id" = ${item.page.id} FOR SHARE`;
          await tx.$queryRaw`SELECT "id" FROM "LojaPaginaBloco" WHERE "paginaId" = ${item.page.id} FOR SHARE`;

          const currentPage = await tx.lojaPagina.findUnique({
            where: { id: item.page.id },
            select: LEGACY_PAGE_SELECT,
          });
          if (!currentPage) {
            throw new Error("Uma página do plano deixou de existir.");
          }
          const currentAdaptation = adaptarBuilderLegado(currentPage);
          const currentFingerprint = sourceFingerprint(
            currentPage,
            currentAdaptation,
          );
          if (currentFingerprint !== item.sourceFingerprint) {
            throw new Error(
              "O conteúdo legado mudou durante a migração; nenhuma alteração foi confirmada.",
            );
          }
          const existing = await tx.lojaConteudoDocumento.findUnique({
            where: { paginaId: currentPage.id },
            select: { id: true },
          });
          if (existing) {
            throw new Error(
              "Um documento novo foi criado em paralelo; a migração foi cancelada.",
            );
          }

          const document = await tx.lojaConteudoDocumento.create({
            data: {
              chave:
                currentPage.tipo === "HOME" || currentPage.slug === "home"
                  ? "page:home"
                  : currentPage.tipo === "CATEGORIA"
                    ? `page:category:${currentPage.id}`
                    : currentPage.tipo === "TEMPLATE_CATEGORIA"
                      ? "page:category:default"
                      : currentPage.tipo === "CAMPANHA"
                        ? `campaign:${currentPage.id}`
                        : `page:${currentPage.slug}`,
              tipo: currentPage.tipo === "CAMPANHA" ? "CAMPANHA" : "PAGINA",
              paginaId: currentPage.id,
              slugPublico: publicPath(currentPage),
              contratoChave: currentAdaptation.contrato.key,
              contratoVersao: currentAdaptation.contrato.version,
              rascunhoJson: currentAdaptation.conteudo,
              revisaoRascunho: 1,
              status:
                currentPage.statusPublicacao === "PUBLICADA"
                  ? "LEGADO_PUBLICADO"
                  : "RASCUNHO",
              modoEntrega: "LEGADO",
              origemJson: {
                fonte: "BUILDER_LEGADO",
                namespace: ADAPTER_VERSION,
                adapterVersion: ADAPTER_VERSION,
                migrationRunId: runId,
                sourceFingerprint: currentFingerprint,
                paginaId: currentPage.id,
                paginaEstadoLegado: legacyPageState(currentPage),
                blocosMapeadosIds: currentAdaptation.blocosMapeadosIds,
                blocosNaoMapeados: currentAdaptation.blocosNaoMapeados,
                avisos: currentAdaptation.avisos,
              },
              criadoPorNome: "Migração controlada",
              atualizadoPorNome: "Migração controlada",
            },
          });
          await tx.lojaConteudoVersao.create({
            data: {
              documentoId: document.id,
              numero: 1,
              contratoChave: currentAdaptation.contrato.key,
              contratoVersao: currentAdaptation.contrato.version,
              conteudoJson: currentAdaptation.conteudo,
              operacao: "MIGRACAO",
              resumo: "Snapshot inicial do conteúdo legado",
              autorNome: "Migração controlada",
            },
          });
          const usages = extrairReferenciasMidia(currentAdaptation.conteudo);
          if (usages.length > 0) {
            await tx.lojaConteudoMidiaUso.createMany({
              data: usages.flatMap((usage) => [
                { ...usage, documentoId: document.id, escopo: "RASCUNHO" },
                { ...usage, documentoId: document.id, escopo: "HISTORICO" },
              ]),
              skipDuplicates: true,
            });
          }
          results.push({
            documentoId: document.id,
            paginaId: currentPage.id,
            sourceFingerprint: currentFingerprint,
            source: item.kind,
            paginaCriada: false,
          });
        }

        for (const item of toCreateSystem) {
          const definition = SYSTEM_PAGES.find(
            (page) => page.id === item.page.id,
          );
          if (!definition) {
            throw new Error("Uma superfície codificada deixou de existir no plano.");
          }

          await tx.$queryRaw`SELECT "id" FROM "LojaPagina" WHERE "id" = ${definition.id} OR "slug" = ${definition.slug} FOR SHARE`;
          const pageConflict = await tx.lojaPagina.findFirst({
            where: {
              OR: [{ id: definition.id }, { slug: definition.slug }],
            },
            select: { id: true },
          });
          const documentConflict = await tx.lojaConteudoDocumento.findFirst({
            where: {
              OR: [
                { paginaId: definition.id },
                { chave: definition.chaveDocumento },
              ],
            },
            select: { id: true },
          });
          if (pageConflict || documentConflict) {
            throw new Error(
              "Uma superfície codificada foi criada em paralelo; a migração foi cancelada.",
            );
          }

          const contract = getConteudoContratoVersionado(
            definition.contratoChave,
            1,
          );
          const content = criarConteudoPadrao(contract);
          const currentFingerprint = systemSourceFingerprint(
            definition,
            contract,
            content,
          );
          if (currentFingerprint !== item.sourceFingerprint) {
            throw new Error(
              "A definição de uma superfície codificada mudou durante a migração.",
            );
          }

          const page = await tx.lojaPagina.create({
            data: {
              id: definition.id,
              titulo: definition.titulo,
              slug: definition.slug,
              tipo: definition.tipo,
              ativo: false,
              statusPublicacao: "RASCUNHO",
              usarComoTemplatePadrao: definition.usarComoTemplatePadrao,
            },
          });
          const document = await tx.lojaConteudoDocumento.create({
            data: {
              chave: definition.chaveDocumento,
              tipo: "PAGINA",
              paginaId: page.id,
              slugPublico: definition.slugPublico,
              contratoChave: contract.key,
              contratoVersao: contract.version,
              rascunhoJson: content,
              revisaoRascunho: 1,
              status: "RASCUNHO",
              modoEntrega: "LEGADO",
              origemJson: {
                fonte: "SISTEMA_CODIFICADO",
                namespace: ADAPTER_VERSION,
                adapterVersion: ADAPTER_VERSION,
                migrationRunId: runId,
                sourceFingerprint: currentFingerprint,
                paginaId: page.id,
                paginaEstadoLegado: {
                  ativo: false,
                  statusPublicacao: "RASCUNHO",
                  publicadoEm: null,
                },
                blocosMapeadosIds: [],
                blocosNaoMapeados: [],
                avisos: [],
              },
              criadoPorNome: "Migração controlada",
              atualizadoPorNome: "Migração controlada",
            },
          });
          await tx.lojaConteudoVersao.create({
            data: {
              documentoId: document.id,
              numero: 1,
              contratoChave: contract.key,
              contratoVersao: contract.version,
              conteudoJson: content,
              operacao: "MIGRACAO",
              resumo: "Estrutura inicial da superfície codificada",
              autorNome: "Migração controlada",
            },
          });
          results.push({
            documentoId: document.id,
            paginaId: page.id,
            sourceFingerprint: currentFingerprint,
            source: item.kind,
            paginaCriada: true,
          });
        }
        return results;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    await writeFile(
      manifestPath,
      JSON.stringify(
        { ...manifestBase, status: "FALHOU", failedAt: new Date().toISOString(), created: [] },
        null,
        2,
      ),
      "utf8",
    ).catch(() => undefined);
    throw error;
  }

  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...manifestBase,
        status: "EXECUTADO",
        executedAt: new Date().toISOString(),
        created,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(JSON.stringify({ executado: true, documentosCriados: created.length }));
  console.log(`Snapshot: ${snapshotPath}`);
  console.log(`Manifesto: ${manifestPath}`);
}

async function rollback(manifestArgument) {
  if (getArgument("confirm") !== ROLLBACK_CONFIRMATION) {
    throw new Error(`Rollback exige --confirm=${ROLLBACK_CONFIRMATION}.`);
  }
  const manifestPath = resolve(process.cwd(), manifestArgument);
  if (
    !manifestPath.toLowerCase().startsWith(`${AUDIT_DIR}${sep}`.toLowerCase())
  ) {
    throw new Error("O manifesto precisa estar dentro de tmp/auditorias.");
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest.schema !== "conteudo-loja-manifest-v2" ||
    typeof manifest.runId !== "string" ||
    !Array.isArray(manifest.planned)
  ) {
    throw new Error("Manifesto de migração inválido.");
  }
  if (manifest.status === "REVERTIDO") {
    console.log(
      JSON.stringify({
        rollback: true,
        documentosRemovidos: 0,
        paginasRemovidas: 0,
        idempotente: true,
      }),
    );
    return;
  }

  const plannedByPage = new Map(
    manifest.planned.map((item) => [
      String(item.paginaId),
      String(item.sourceFingerprint),
    ]),
  );
  if (plannedByPage.size !== manifest.planned.length) {
    throw new Error("O manifesto possui páginas duplicadas ou inválidas.");
  }
  const plannedPageIds = [...plannedByPage.keys()];
  const systemPageIds = manifest.planned
    .filter((item) => item.source === "SYSTEM")
    .map((item) => String(item.paginaId));
  const createdDocumentIds = Array.isArray(manifest.created)
    ? manifest.created
        .map((item) => String(item?.documentoId || ""))
        .filter(Boolean)
    : [];

  const removed = await prisma.$transaction(
    async (tx) => {
      for (const pageId of systemPageIds) {
        await tx.$queryRaw`SELECT "id" FROM "LojaPagina" WHERE "id" = ${pageId} FOR UPDATE`;
      }
      for (const pageId of plannedPageIds) {
        await tx.$queryRaw`SELECT "id" FROM "LojaConteudoDocumento" WHERE "paginaId" = ${pageId} FOR UPDATE`;
      }
      for (const documentId of createdDocumentIds) {
        await tx.$queryRaw`SELECT "id" FROM "LojaConteudoDocumento" WHERE "id" = ${documentId} FOR UPDATE`;
      }

      const documents = await tx.lojaConteudoDocumento.findMany({
        where: {
          OR: [
            { paginaId: { in: plannedPageIds } },
            ...(createdDocumentIds.length > 0
              ? [{ id: { in: createdDocumentIds } }]
              : []),
            {
              origemJson: {
                path: ["migrationRunId"],
                equals: manifest.runId,
              },
            },
          ],
        },
        include: {
          versoes: {
            select: { numero: true, operacao: true },
            orderBy: { numero: "asc" },
          },
        },
      });
      const systemPages = systemPageIds.length > 0
        ? await tx.lojaPagina.findMany({
            where: { id: { in: systemPageIds } },
            select: {
              id: true,
              titulo: true,
              slug: true,
              tipo: true,
              ativo: true,
              statusPublicacao: true,
              publicadoEm: true,
              usarComoTemplatePadrao: true,
            },
          })
        : [];

      if (documents.length === 0) {
        if (systemPages.length > 0) {
          throw new Error(
            "O rollback foi recusado porque as superfícies codificadas estão incompletas.",
          );
        }
        return { documents: 0, pages: 0 };
      }
      if (
        documents.length !== plannedPageIds.length ||
        plannedPageIds.some(
          (pageId) =>
            documents.filter((document) => document.paginaId === pageId).length !== 1,
        )
      ) {
        throw new Error(
          "O rollback foi recusado porque o conjunto migrado está incompleto ou divergente.",
        );
      }

      const modified = documents.filter((document) => {
        const origin =
          document.origemJson && typeof document.origemJson === "object"
            ? document.origemJson
            : {};
        return (
          document.revisaoRascunho !== 1 ||
          document.modoEntrega !== "LEGADO" ||
          document.versaoPublicadaId !== null ||
          !["RASCUNHO", "LEGADO_PUBLICADO"].includes(document.status) ||
          document.versoes.length !== 1 ||
          document.versoes[0]?.numero !== 1 ||
          document.versoes[0]?.operacao !== "MIGRACAO" ||
          origin.migrationRunId !== manifest.runId ||
          origin.sourceFingerprint !== plannedByPage.get(document.paginaId || "")
        );
      });
      if (modified.length > 0) {
        throw new Error(
          "O rollback foi recusado porque há documentos editados ou publicados após a migração.",
        );
      }

      if (systemPages.length !== systemPageIds.length) {
        throw new Error(
          "O rollback foi recusado porque uma superfície codificada foi removida ou alterada.",
        );
      }
      const modifiedSystemPages = systemPages.filter((page) => {
        const definition = SYSTEM_PAGES.find((item) => item.id === page.id);
        return (
          !definition ||
          page.titulo !== definition.titulo ||
          page.slug !== definition.slug ||
          page.tipo !== definition.tipo ||
          page.ativo !== false ||
          page.statusPublicacao !== "RASCUNHO" ||
          page.publicadoEm !== null ||
          page.usarComoTemplatePadrao !== definition.usarComoTemplatePadrao
        );
      });
      if (modifiedSystemPages.length > 0) {
        throw new Error(
          "O rollback foi recusado porque uma superfície codificada foi editada ou publicada.",
        );
      }

      const documentResult = await tx.lojaConteudoDocumento.deleteMany({
        where: { id: { in: documents.map((document) => document.id) } },
      });
      const pageResult = systemPageIds.length > 0
        ? await tx.lojaPagina.deleteMany({
            where: { id: { in: systemPageIds } },
          })
        : { count: 0 };
      return { documents: documentResult.count, pages: pageResult.count };
    },
    { isolationLevel: "Serializable" },
  );
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...manifest,
        status: "REVERTIDO",
        rolledBackAt: new Date().toISOString(),
        removed: removed.documents,
        removedPages: removed.pages,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    JSON.stringify({
      rollback: true,
      documentosRemovidos: removed.documents,
      paginasRemovidas: removed.pages,
    }),
  );
}

try {
  const rollbackManifest = getArgument("rollback");
  if (rollbackManifest) {
    await rollback(rollbackManifest);
  } else {
    const plan = await buildPlan();
    printPlan(plan.items);
    if (!process.argv.includes("--execute")) {
      console.log("Dry-run concluído. Nenhum dado foi alterado.");
    } else {
      if (getArgument("confirm") !== EXECUTE_CONFIRMATION) {
        throw new Error(`Execução exige --confirm=${EXECUTE_CONFIRMATION}.`);
      }
      await executeMigration(plan);
    }
  }
} finally {
  await prisma.$disconnect();
}
