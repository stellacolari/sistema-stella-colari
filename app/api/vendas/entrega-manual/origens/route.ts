import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";

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

async function montarOrigemFallback() {
  let config: Awaited<ReturnType<typeof buscarConfiguracaoFrete>>;

  try {
    config = await buscarConfiguracaoFrete();
  } catch (error) {
    console.error(
      "Erro ao carregar endereco de despacho para entrega manual:",
      error,
    );
    return null;
  }
  const origem = {
    id: "frete-config",
    nome: "Endereço de despacho",
    cep: config.cepOrigem || "",
    rua: config.remetenteEndereco || "",
    numero: config.remetenteNumero || "",
    complemento: config.remetenteComplemento || "",
    bairro: config.remetenteBairro || "",
    cidade: config.remetenteCidade || "",
    uf: config.remetenteUf || "",
    latitude: null,
    longitude: null,
    observacao: "",
    padrao: false,
    ativo: true,
    origemSistema: true,
  };

  return {
    ...origem,
    resumo: resumoOrigem(origem),
    completo: enderecoCompleto(origem),
  };
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

function erroDeEstruturaDoBanco(error: unknown) {
  const erro = error as { code?: unknown; message?: unknown };
  const code = String(erro?.code || "");
  const message = String(erro?.message || error || "").toLowerCase();

  return (
    code === "P2021" ||
    code === "P2022" ||
    message.includes("does not exist") ||
    message.includes("column") ||
    message.includes("relation")
  );
}

function mensagemErroPersistencia(error: unknown, acao: string) {
  if (erroDeEstruturaDoBanco(error)) {
    return `Nao foi possivel ${acao} a origem. Verifique se as migrations foram aplicadas no banco de producao.`;
  }

  return `Erro ao ${acao} origem de entrega manual.`;
}

export async function GET() {
  const fallback = await montarOrigemFallback();

  try {
    const origensSalvas = await prisma.lojaEntregaManualOrigem.findMany({
      where: { ativo: true },
      orderBy: [{ padrao: "desc" }, { criadoEm: "asc" }],
    });

    const origens = origensSalvas.map(serializarOrigem);
    const selecionada =
      origens.find((origem) => origem.padrao) ||
      origens[0] ||
      fallback ||
      null;

    return NextResponse.json({
      origens: origens.length > 0 ? origens : fallback ? [fallback] : [],
      fallback,
      selecionada,
    });
  } catch (error) {
    console.error("Erro ao listar origens de entrega manual:", error);

    if (fallback) {
      return NextResponse.json({
        origens: [fallback],
        fallback,
        selecionada: fallback,
        warning:
          "Nao foi possivel carregar origens salvas. Usando endereco de despacho.",
        erroOrigens:
          "Nao foi possivel carregar origens salvas. Verifique se as migrations foram aplicadas.",
        requiresMigrationCheck: erroDeEstruturaDoBanco(error),
      });
    }

    return NextResponse.json(
      {
        error: "Nao foi possivel carregar origens nem endereco de despacho.",
        requiresMigrationCheck: erroDeEstruturaDoBanco(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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
      const deveSerPadrao =
        data.padrao ||
        (await tx.lojaEntregaManualOrigem.count({
          where: { ativo: true },
        })) === 0;

      if (deveSerPadrao) {
        await tx.lojaEntregaManualOrigem.updateMany({
          where: { padrao: true },
          data: { padrao: false },
        });
      }

      return tx.lojaEntregaManualOrigem.create({
        data: {
          ...data,
          padrao: deveSerPadrao,
        },
      });
    });

    return NextResponse.json({ origem: serializarOrigem(origem) });
  } catch (error) {
    console.error("Erro ao criar origem de entrega manual:", error);

    return NextResponse.json(
      {
        error: mensagemErroPersistencia(error, "salvar"),
        requiresMigrationCheck: erroDeEstruturaDoBanco(error),
      },
      { status: 500 },
    );
  }
}
