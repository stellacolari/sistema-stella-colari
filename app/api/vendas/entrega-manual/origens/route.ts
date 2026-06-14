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
  const config = await buscarConfiguracaoFrete();
  const origem = {
    id: "frete-config",
    nome: "Endereço de despacho",
    cep: config.cepOrigem,
    rua: config.remetenteEndereco,
    numero: config.remetenteNumero,
    complemento: config.remetenteComplemento,
    bairro: config.remetenteBairro,
    cidade: config.remetenteCidade,
    uf: config.remetenteUf,
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

export async function GET() {
  try {
    const [origensSalvas, fallback] = await Promise.all([
      prisma.lojaEntregaManualOrigem.findMany({
        where: { ativo: true },
        orderBy: [{ padrao: "desc" }, { criadoEm: "asc" }],
      }),
      montarOrigemFallback(),
    ]);

    const origens = origensSalvas.map(serializarOrigem);
    const selecionada =
      origens.find((origem) => origem.padrao) ||
      origens[0] ||
      fallback;

    return NextResponse.json({
      origens: origens.length > 0 ? origens : [fallback],
      fallback,
      selecionada,
    });
  } catch (error) {
    console.error("Erro ao listar origens de entrega manual:", error);

    return NextResponse.json(
      { error: "Erro ao carregar origens de entrega manual." },
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
      { error: "Erro ao salvar origem de entrega manual." },
      { status: 500 },
    );
  }
}
