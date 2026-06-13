import { NextResponse } from "next/server";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";

type EnderecoEntrega = {
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

function texto(value: unknown) {
  return String(value || "").trim();
}

function normalizarCep(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarUf(value: unknown) {
  return texto(value).toUpperCase().slice(0, 2);
}

function montarEnderecoOrigem(
  config: Awaited<ReturnType<typeof buscarConfiguracaoFrete>>,
): EnderecoEntrega {
  return {
    cep: config.cepOrigem,
    rua: config.remetenteEndereco,
    numero: config.remetenteNumero,
    complemento: config.remetenteComplemento,
    bairro: config.remetenteBairro,
    cidade: config.remetenteCidade,
    estado: config.remetenteUf,
  };
}

function normalizarEndereco(value: unknown): EnderecoEntrega {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    cep: normalizarCep(record.cep),
    rua: texto(record.rua),
    numero: texto(record.numero),
    complemento: texto(record.complemento),
    bairro: texto(record.bairro),
    cidade: texto(record.cidade),
    estado: normalizarUf(record.estado),
  };
}

function enderecoCompleto(endereco: EnderecoEntrega) {
  return Boolean(
    normalizarCep(endereco.cep).length === 8 &&
      texto(endereco.rua) &&
      texto(endereco.numero) &&
      texto(endereco.bairro) &&
      texto(endereco.cidade) &&
      normalizarUf(endereco.estado).length === 2,
  );
}

function resumoEndereco(endereco: EnderecoEntrega) {
  return [
    texto(endereco.rua),
    texto(endereco.numero),
    texto(endereco.complemento),
    texto(endereco.bairro),
    texto(endereco.cidade),
    normalizarUf(endereco.estado),
    normalizarCep(endereco.cep),
  ]
    .filter(Boolean)
    .join(", ");
}

function enderecoParaBusca(endereco: EnderecoEntrega) {
  return [
    texto(endereco.rua),
    texto(endereco.numero),
    texto(endereco.bairro),
    texto(endereco.cidade),
    normalizarUf(endereco.estado),
    normalizarCep(endereco.cep),
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

function montarMapsUrl(origem: EnderecoEntrega, destino: EnderecoEntrega) {
  const params = new URLSearchParams({
    api: "1",
    origin: enderecoParaBusca(origem),
    destination: enderecoParaBusca(destino),
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function getOrigemResponse() {
  const config = await buscarConfiguracaoFrete();
  const origem = montarEnderecoOrigem(config);
  const origemCompleta = enderecoCompleto(origem);

  return {
    origem,
    origemResumo: resumoEndereco(origem),
    origemCompleta,
  };
}

export async function GET() {
  try {
    return NextResponse.json(await getOrigemResponse());
  } catch (error) {
    console.error("Erro ao carregar origem da entrega manual:", error);

    return NextResponse.json(
      { error: "Erro ao carregar origem da entrega manual." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const origemInfo = await getOrigemResponse();
    const body = await req.json().catch(() => ({}));
    const destino = normalizarEndereco(body.destino);

    if (!origemInfo.origemCompleta) {
      return NextResponse.json(
        {
          ...origemInfo,
          error:
            "Complete o endereço de despacho nas configurações de frete para gerar a rota no Maps.",
        },
        { status: 400 },
      );
    }

    if (!enderecoCompleto(destino)) {
      return NextResponse.json(
        {
          ...origemInfo,
          error: "Preencha CEP, endereço, número, bairro, cidade e UF do destino.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ...origemInfo,
      destino,
      destinoResumo: resumoEndereco(destino),
      mapsUrl: montarMapsUrl(origemInfo.origem, destino),
    });
  } catch (error) {
    console.error("Erro ao gerar rota da entrega manual:", error);

    return NextResponse.json(
      { error: "Erro ao gerar rota da entrega manual." },
      { status: 400 },
    );
  }
}
