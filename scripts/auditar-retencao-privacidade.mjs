import { PrismaClient } from "@prisma/client";

function obterDataCorte(argumentos) {
  const argumento = argumentos.find((item) => item.startsWith("--antes-de="));
  const valor = argumento?.slice("--antes-de=".length) || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error(
      "Informe uma data de corte explicita: --antes-de=AAAA-MM-DD.",
    );
  }

  const data = new Date(`${valor}T00:00:00.000Z`);

  if (Number.isNaN(data.getTime()) || data >= new Date()) {
    throw new Error("A data de corte deve ser valida e anterior a hoje.");
  }

  return data;
}

async function executar() {
  const antesDe = obterDataCorte(process.argv.slice(2));
  const agora = new Date();
  const prisma = new PrismaClient();

  try {
    const [
      sessoesExpiradas,
      sessoesRevogadas,
      formulariosAnteriores,
      eventosAnteriores,
      consentimentosAnteriores,
      midiasInativasAnteriores,
    ] = await Promise.all([
      prisma.clienteSessao.count({
        where: {
          expiraEm: {
            lt: agora,
          },
        },
      }),
      prisma.clienteSessao.count({
        where: {
          revogadoEm: {
            not: null,
          },
        },
      }),
      prisma.lojaFormularioResposta.count({
        where: {
          criadoEm: {
            lt: antesDe,
          },
        },
      }),
      prisma.eventoComercial.count({
        where: {
          criadoEm: {
            lt: antesDe,
          },
        },
      }),
      prisma.clienteConsentimento.count({
        where: {
          criadoEm: {
            lt: antesDe,
          },
        },
      }),
      prisma.midiaAsset.count({
        where: {
          criadoEm: {
            lt: antesDe,
          },
          status: {
            not: "ATIVO",
          },
        },
      }),
    ]);

    console.log(
      JSON.stringify(
        {
          modo: "DRY_RUN",
          dataCorte: antesDe.toISOString(),
          observacao:
            "Contagens para avaliacao. Nenhum dado foi alterado ou excluido.",
          contagens: {
            sessoesExpiradas,
            sessoesRevogadas,
            formulariosAnteriores,
            eventosAnteriores,
            consentimentosAnteriores,
            midiasInativasAnteriores,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

executar().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Nao foi possivel executar o dry-run de retencao.",
  );
  process.exitCode = 1;
});
