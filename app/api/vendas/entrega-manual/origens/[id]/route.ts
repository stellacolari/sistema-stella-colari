import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function texto(value: unknown) {
  return String(value || "").trim();
}

function normalizarCep(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarUf(value: unknown) {
  return texto(value).toUpperCase().slice(0, 2);
}

function normalizarCoordenada(value: unknown, min: number, max: number) {
  if (
    value === null ||
    typeof value === "undefined" ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  const numero =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);

  if (!Number.isFinite(numero) || numero < min || numero > max) {
    return Number.NaN;
  }

  return numero;
}

function coordenadasInvalidas(data: { latitude: number | null; longitude: number | null }) {
  return (
    Number.isNaN(data.latitude) ||
    Number.isNaN(data.longitude) ||
    (data.latitude === null && data.longitude !== null) ||
    (data.latitude !== null && data.longitude === null)
  );
}

function enderecoCompleto(origem: {
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}) {
  return Boolean(
    normalizarCep(origem.cep).length === 8 &&
      texto(origem.rua) &&
      texto(origem.numero) &&
      texto(origem.bairro) &&
      texto(origem.cidade) &&
      normalizarUf(origem.uf).length === 2,
  );
}

function resumoOrigem(origem: {
  nome?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}) {
  const endereco = [
    texto(origem.rua),
    texto(origem.numero),
    texto(origem.complemento),
    texto(origem.bairro),
    texto(origem.cidade),
    normalizarUf(origem.uf),
    normalizarCep(origem.cep),
  ]
    .filter(Boolean)
    .join(", ");

  return [texto(origem.nome), endereco].filter(Boolean).join(" - ");
}

function normalizarBody(body: Record<string, unknown>) {
  return {
    nome: texto(body.nome) || "Origem",
    cep: normalizarCep(body.cep),
    rua: texto(body.rua),
    numero: texto(body.numero),
    complemento: texto(body.complemento) || null,
    bairro: texto(body.bairro),
    cidade: texto(body.cidade),
    uf: normalizarUf(body.uf ?? body.estado),
    latitude: normalizarCoordenada(body.latitude, -90, 90),
    longitude: normalizarCoordenada(body.longitude, -180, 180),
    observacao: texto(body.observacao) || null,
    padrao: Boolean(body.padrao),
  };
}

function serializarOrigem(origem: {
  id: string;
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  observacao: string | null;
  padrao: boolean;
  ativo: boolean;
}) {
  return {
    ...origem,
    resumo: resumoOrigem(origem),
    completo: enderecoCompleto(origem),
    origemSistema: false,
  };
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const data = normalizarBody(body);

    if (!enderecoCompleto(data)) {
      return NextResponse.json(
        { error: "Preencha nome, CEP, rua, número, bairro, cidade e UF." },
        { status: 400 },
      );
    }

    if (coordenadasInvalidas(data)) {
      return NextResponse.json(
        { error: "Informe latitude entre -90 e 90 e longitude entre -180 e 180." },
        { status: 400 },
      );
    }

    const origem = await prisma.$transaction(async (tx) => {
      if (data.padrao) {
        await tx.lojaEntregaManualOrigem.updateMany({
          where: { padrao: true },
          data: { padrao: false },
        });
      }

      return tx.lojaEntregaManualOrigem.update({
        where: { id },
        data,
      });
    });

    return NextResponse.json({ origem: serializarOrigem(origem) });
  } catch (error) {
    console.error("Erro ao atualizar origem de entrega manual:", error);

    return NextResponse.json(
      { error: "Erro ao atualizar origem de entrega manual." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    await prisma.lojaEntregaManualOrigem.delete({
      where: { id },
    });

    const padraoAtual = await prisma.lojaEntregaManualOrigem.findFirst({
      where: { ativo: true, padrao: true },
      select: { id: true },
    });

    if (!padraoAtual) {
      const primeira = await prisma.lojaEntregaManualOrigem.findFirst({
        where: { ativo: true },
        orderBy: { criadoEm: "asc" },
        select: { id: true },
      });

      if (primeira) {
        await prisma.lojaEntregaManualOrigem.update({
          where: { id: primeira.id },
          data: { padrao: true },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao remover origem de entrega manual:", error);

    return NextResponse.json(
      { error: "Erro ao remover origem de entrega manual." },
      { status: 500 },
    );
  }
}
