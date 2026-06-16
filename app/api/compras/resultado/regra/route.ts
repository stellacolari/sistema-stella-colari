import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  obterOuCriarRegraDistribuicaoAtiva,
  validarRegraDistribuicao,
} from "@/lib/financeiro/resultado";

type DestinoBody = {
  tipo?: unknown;
  nome?: unknown;
  percentual?: unknown;
  ordem?: unknown;
  ativo?: unknown;
  observacoes?: unknown;
};

function texto(value: unknown) {
  return String(value ?? "").trim();
}

function numero(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const regraAtual = await obterOuCriarRegraDistribuicaoAtiva();
    const destinosBody: DestinoBody[] = Array.isArray(body.destinos)
      ? body.destinos
      : [];
    const destinos = destinosBody.map((destino: DestinoBody, index: number) => ({
      tipo: texto(destino.tipo),
      nome: texto(destino.nome),
      percentual: numero(destino.percentual),
      ordem: Number.isInteger(Number(destino.ordem))
        ? Number(destino.ordem)
        : index + 1,
      ativo: destino.ativo !== false,
      observacoes: texto(destino.observacoes) || null,
    }));
    const percentualEmpresa = numero(body.percentualEmpresa);
    const percentualProLabore = numero(body.percentualProLabore);
    const erroValidacao = validarRegraDistribuicao({
      percentualEmpresa,
      percentualProLabore,
      destinos,
    });

    if (erroValidacao) {
      return NextResponse.json({ error: erroValidacao }, { status: 400 });
    }

    const regra = await prisma.$transaction(async (tx) => {
      await tx.regraDistribuicaoDestino.deleteMany({
        where: { regraId: regraAtual.id },
      });

      await tx.regraDistribuicaoResultado.updateMany({
        where: {
          id: { not: regraAtual.id },
          ativa: true,
        },
        data: { ativa: false },
      });

      return tx.regraDistribuicaoResultado.update({
        where: { id: regraAtual.id },
        data: {
          ativa: true,
          nome: texto(body.nome) || regraAtual.nome,
          percentualEmpresa,
          percentualProLabore,
          observacoes: texto(body.observacoes) || null,
          destinos: {
            create: destinos,
          },
        },
        include: {
          destinos: {
            orderBy: [{ ordem: "asc" }, { nome: "asc" }],
          },
        },
      });
    });

    return NextResponse.json({ ok: true, regra });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel salvar a regra de distribuicao.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
