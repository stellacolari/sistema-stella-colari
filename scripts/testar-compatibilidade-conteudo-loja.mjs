import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { adaptarBuilderLegado } from "../lib/loja/conteudo/legacy-adapter.ts";

const prisma = new PrismaClient();

try {
  const pages = await prisma.lojaPagina.findMany({
    where: { statusPublicacao: { not: "ARQUIVADA" } },
    orderBy: [{ tipo: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      titulo: true,
      slug: true,
      tipo: true,
      statusPublicacao: true,
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
        },
      },
    },
  });

  const report = pages.map((page) => {
    const result = adaptarBuilderLegado(page);
    return {
      slug: page.slug,
      status: page.statusPublicacao,
      contrato: `${result.contrato.key}@${result.contrato.version}`,
      ativos: page.blocos.filter((block) => block.ativo).length,
      mapeados: result.blocosMapeadosIds.length,
      naoMapeados: result.blocosNaoMapeados.length,
    };
  });

  for (const item of report) {
    console.log(JSON.stringify(item));
  }

  const publishedBlockers = report.filter(
    (item) => item.status === "PUBLICADA" && item.naoMapeados > 0,
  );
  assert.equal(
    publishedBlockers.length,
    0,
    "Página publicada possui seção ativa sem mapeamento.",
  );

  console.log(`Compatibilidade validada em ${report.length} página(s).`);
} finally {
  await prisma.$disconnect();
}
