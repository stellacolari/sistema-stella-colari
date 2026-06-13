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

type Coordenadas = {
  latitude: number;
  longitude: number;
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

function montarEnderecoOrigem(config: Awaited<ReturnType<typeof buscarConfiguracaoFrete>>): EnderecoEntrega {
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

function getProviderConfigurado() {
  const provider = texto(process.env.DISTANCIA_PROVIDER).toUpperCase();

  if (provider) {
    return provider;
  }

  if (texto(process.env.GOOGLE_MAPS_API_KEY)) return "GOOGLE";
  if (texto(process.env.MAPBOX_ACCESS_TOKEN)) return "MAPBOX";
  if (texto(process.env.OPENROUTE_API_KEY)) return "OPENROUTE";

  return "";
}

async function calcularGoogle(origem: EnderecoEntrega, destino: EnderecoEntrega) {
  const key = texto(process.env.GOOGLE_MAPS_API_KEY);

  if (!key) {
    throw new Error("Configure GOOGLE_MAPS_API_KEY para usar Google Maps.");
  }

  const params = new URLSearchParams({
    origins: enderecoParaBusca(origem),
    destinations: enderecoParaBusca(destino),
    mode: "driving",
    units: "metric",
    key,
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
    { cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  const element = data?.rows?.[0]?.elements?.[0];
  const metros = Number(element?.distance?.value);

  if (!response.ok || data?.status !== "OK" || element?.status !== "OK" || !Number.isFinite(metros)) {
    throw new Error("Não foi possível calcular a rota pelo Google Maps.");
  }

  return {
    distanciaIdaKm: metros / 1000,
    provider: "GOOGLE",
  };
}

async function geocodificarMapbox(endereco: EnderecoEntrega): Promise<Coordenadas> {
  const token = texto(process.env.MAPBOX_ACCESS_TOKEN);
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      enderecoParaBusca(endereco),
    )}.json?limit=1&country=br&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  const center = data?.features?.[0]?.center;

  if (!response.ok || !Array.isArray(center) || center.length < 2) {
    throw new Error("Não foi possível localizar o endereço pelo Mapbox.");
  }

  return {
    longitude: Number(center[0]),
    latitude: Number(center[1]),
  };
}

async function calcularMapbox(origem: EnderecoEntrega, destino: EnderecoEntrega) {
  const token = texto(process.env.MAPBOX_ACCESS_TOKEN);

  if (!token) {
    throw new Error("Configure MAPBOX_ACCESS_TOKEN para usar Mapbox.");
  }

  const [origemGeo, destinoGeo] = await Promise.all([
    geocodificarMapbox(origem),
    geocodificarMapbox(destino),
  ]);
  const coords = `${origemGeo.longitude},${origemGeo.latitude};${destinoGeo.longitude},${destinoGeo.latitude}`;
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?overview=false&access_token=${encodeURIComponent(
      token,
    )}`,
    { cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  const metros = Number(data?.routes?.[0]?.distance);

  if (!response.ok || !Number.isFinite(metros)) {
    throw new Error("Não foi possível calcular a rota pelo Mapbox.");
  }

  return {
    distanciaIdaKm: metros / 1000,
    provider: "MAPBOX",
  };
}

async function geocodificarOpenRoute(endereco: EnderecoEntrega): Promise<Coordenadas> {
  const key = texto(process.env.OPENROUTE_API_KEY);
  const params = new URLSearchParams({
    api_key: key,
    text: enderecoParaBusca(endereco),
    "boundary.country": "BR",
    size: "1",
  });
  const response = await fetch(
    `https://api.openrouteservice.org/geocode/search?${params}`,
    { cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  const coordinates = data?.features?.[0]?.geometry?.coordinates;

  if (!response.ok || !Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error("Não foi possível localizar o endereço pelo OpenRouteService.");
  }

  return {
    longitude: Number(coordinates[0]),
    latitude: Number(coordinates[1]),
  };
}

async function calcularOpenRoute(origem: EnderecoEntrega, destino: EnderecoEntrega) {
  const key = texto(process.env.OPENROUTE_API_KEY);

  if (!key) {
    throw new Error("Configure OPENROUTE_API_KEY para usar OpenRouteService.");
  }

  const [origemGeo, destinoGeo] = await Promise.all([
    geocodificarOpenRoute(origem),
    geocodificarOpenRoute(destino),
  ]);
  const params = new URLSearchParams({
    api_key: key,
    start: `${origemGeo.longitude},${origemGeo.latitude}`,
    end: `${destinoGeo.longitude},${destinoGeo.latitude}`,
  });
  const response = await fetch(
    `https://api.openrouteservice.org/v2/directions/driving-car?${params}`,
    { cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  const metros = Number(data?.features?.[0]?.properties?.summary?.distance);

  if (!response.ok || !Number.isFinite(metros)) {
    throw new Error("Não foi possível calcular a rota pelo OpenRouteService.");
  }

  return {
    distanciaIdaKm: metros / 1000,
    provider: "OPENROUTE",
  };
}

async function calcularDistancia(origem: EnderecoEntrega, destino: EnderecoEntrega) {
  const provider = getProviderConfigurado();

  if (!provider) {
    throw new Error("Configure um provedor de distância para cálculo automático.");
  }

  if (provider === "GOOGLE" || provider === "GOOGLE_MAPS") {
    return calcularGoogle(origem, destino);
  }

  if (provider === "MAPBOX") {
    return calcularMapbox(origem, destino);
  }

  if (provider === "OPENROUTE" || provider === "OPENROUTESERVICE") {
    return calcularOpenRoute(origem, destino);
  }

  throw new Error("Provedor de distância não suportado.");
}

async function getOrigemResponse() {
  const config = await buscarConfiguracaoFrete();
  const origem = montarEnderecoOrigem(config);
  const origemCompleta = enderecoCompleto(origem);

  return {
    origem,
    origemResumo: resumoEndereco(origem),
    origemCompleta,
    providerConfigurado: getProviderConfigurado() || null,
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
            "Complete o endereço de despacho nas configurações de frete para calcular a entrega manual.",
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

    const resultado = await calcularDistancia(origemInfo.origem, destino);
    const distanciaIdaKm = Number(resultado.distanciaIdaKm.toFixed(2));

    return NextResponse.json({
      ...origemInfo,
      destino,
      destinoResumo: resumoEndereco(destino),
      distanciaIdaKm,
      distanciaTotalKm: Number((distanciaIdaKm * 2).toFixed(2)),
      provider: resultado.provider,
    });
  } catch (error) {
    console.error("Erro ao calcular entrega manual:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao calcular entrega manual.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
