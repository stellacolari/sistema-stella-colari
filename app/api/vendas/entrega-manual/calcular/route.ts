import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";

type EnderecoEntrega = {
  id?: string | null;
  nome?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  uf?: string | null;
  observacao?: string | null;
};

type Coordenadas = {
  latitude: number;
  longitude: number;
};

type EnderecoGeocodificado = {
  endereco: EnderecoEntrega;
  enderecoFormatado: string;
  coordenadas: Coordenadas;
};

function texto(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function numeroNaoNegativo(value: unknown, fallback = 0) {
  const numero =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);

  return Number.isFinite(numero) && numero >= 0 ? numero : fallback;
}

function numeroPositivo(value: unknown, fallback: number) {
  const numero =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);

  return Number.isFinite(numero) && numero > 0 ? numero : fallback;
}

function normalizarCep(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function formatarCep(value: unknown) {
  const cep = normalizarCep(value);

  if (cep.length !== 8) {
    return cep;
  }

  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

function normalizarUf(value: unknown) {
  return texto(value).toUpperCase().slice(0, 2);
}

function removerAcentos(value: unknown) {
  return texto(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mesmoTexto(a: unknown, b: unknown) {
  return removerAcentos(a) === removerAcentos(b);
}

function normalizarEndereco(value: unknown): EnderecoEntrega {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: texto(record.id),
    nome: texto(record.nome),
    cep: normalizarCep(record.cep),
    rua: texto(record.rua),
    numero: texto(record.numero),
    complemento: texto(record.complemento),
    bairro: texto(record.bairro),
    cidade: texto(record.cidade),
    estado: normalizarUf(record.estado ?? record.uf),
    uf: normalizarUf(record.uf ?? record.estado),
    observacao: texto(record.observacao),
  };
}

function enderecoCompleto(endereco: EnderecoEntrega) {
  return Boolean(
    normalizarCep(endereco.cep).length === 8 &&
      texto(endereco.rua) &&
      texto(endereco.numero) &&
      texto(endereco.bairro) &&
      texto(endereco.cidade) &&
      normalizarUf(endereco.estado ?? endereco.uf).length === 2,
  );
}

function enderecoFormatado(endereco: EnderecoEntrega) {
  return [
    texto(endereco.rua),
    texto(endereco.numero),
    texto(endereco.bairro),
    texto(endereco.cidade),
    normalizarUf(endereco.estado ?? endereco.uf),
    formatarCep(endereco.cep),
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

function resumoEndereco(endereco: EnderecoEntrega) {
  const enderecoResumo = [
    texto(endereco.rua),
    texto(endereco.numero),
    texto(endereco.complemento),
    texto(endereco.bairro),
    texto(endereco.cidade),
    normalizarUf(endereco.estado ?? endereco.uf),
    formatarCep(endereco.cep),
  ]
    .filter(Boolean)
    .join(", ");

  return [texto(endereco.nome), enderecoResumo].filter(Boolean).join(" - ");
}

function montarMapsUrl(origem: EnderecoEntrega, destino: EnderecoEntrega) {
  const params = new URLSearchParams({
    api: "1",
    origin: enderecoFormatado(origem),
    destination: enderecoFormatado(destino),
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatarDuracao(minutos: number) {
  const minutosInteiros = Math.max(1, Math.round(minutos));
  const horas = Math.floor(minutosInteiros / 60);
  const minutosRestantes = minutosInteiros % 60;

  if (!horas) {
    return `${minutosInteiros} min`;
  }

  if (!minutosRestantes) {
    return `${horas} h`;
  }

  return `${horas} h ${minutosRestantes} min`;
}

function montarEnderecoOrigemFrete(
  config: Awaited<ReturnType<typeof buscarConfiguracaoFrete>>,
): EnderecoEntrega {
  return {
    id: "frete-config",
    nome: "Endereco de despacho",
    cep: config.cepOrigem,
    rua: config.remetenteEndereco,
    numero: config.remetenteNumero,
    complemento: config.remetenteComplemento,
    bairro: config.remetenteBairro,
    cidade: config.remetenteCidade,
    estado: config.remetenteUf,
    uf: config.remetenteUf,
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
  const endereco = {
    id: origem.id,
    nome: origem.nome,
    cep: origem.cep,
    rua: origem.rua,
    numero: origem.numero,
    complemento: origem.complemento,
    bairro: origem.bairro,
    cidade: origem.cidade,
    estado: origem.uf,
    uf: origem.uf,
    observacao: origem.observacao,
  };

  return {
    ...endereco,
    padrao: origem.padrao,
    ativo: origem.ativo,
    resumo: resumoEndereco(endereco),
    completo: enderecoCompleto(endereco),
    origemSistema: false,
  };
}

async function listarOrigens() {
  const [config, salvas] = await Promise.all([
    buscarConfiguracaoFrete(),
    prisma.lojaEntregaManualOrigem.findMany({
      where: { ativo: true },
      orderBy: [{ padrao: "desc" }, { criadoEm: "asc" }],
    }),
  ]);
  const fallbackEndereco = montarEnderecoOrigemFrete(config);
  const fallback = {
    ...fallbackEndereco,
    padrao: false,
    ativo: true,
    resumo: resumoEndereco(fallbackEndereco),
    completo: enderecoCompleto(fallbackEndereco),
    origemSistema: true,
  };
  const origens = salvas.map(serializarOrigem);
  const selecionada =
    origens.find((origem) => origem.padrao) || origens[0] || fallback;

  return {
    origens: origens.length > 0 ? origens : [fallback],
    fallback,
    selecionada,
  };
}

async function buscarOrigemPorId(id: string | null | undefined) {
  const origensInfo = await listarOrigens();

  if (!id || id === "frete-config") {
    return origensInfo.selecionada;
  }

  return (
    origensInfo.origens.find((origem) => origem.id === id) ||
    origensInfo.selecionada
  );
}

function featureProps(value: unknown): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "properties" in value &&
    value.properties &&
    typeof value.properties === "object" &&
    !Array.isArray(value.properties)
  ) {
    return value.properties as Record<string, unknown>;
  }

  return {};
}

function featureCoordinates(value: unknown): unknown[] | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "geometry" in value &&
    value.geometry &&
    typeof value.geometry === "object" &&
    !Array.isArray(value.geometry) &&
    "coordinates" in value.geometry &&
    Array.isArray(value.geometry.coordinates)
  ) {
    return value.geometry.coordinates;
  }

  return null;
}

function featureCompativelComEndereco(feature: unknown, endereco: EnderecoEntrega) {
  const props = featureProps(feature);
  const pais = texto(props.country_a || props.country);
  const uf = texto(props.region_a || props.region);
  const cidades = [
    props.locality,
    props.localadmin,
    props.county,
    props.macrocounty,
  ].filter(Boolean);
  const confidence = Number(props.confidence);

  if (pais && !["BR", "Brasil", "Brazil"].some((valor) => mesmoTexto(pais, valor))) {
    return false;
  }

  if (uf && !mesmoTexto(uf, normalizarUf(endereco.estado ?? endereco.uf))) {
    return false;
  }

  if (
    cidades.length > 0 &&
    !cidades.some((cidade) => mesmoTexto(cidade, endereco.cidade))
  ) {
    return false;
  }

  if (Number.isFinite(confidence) && confidence > 0 && confidence < 0.5) {
    return false;
  }

  return true;
}

async function geocodificarOpenRoute(
  endereco: EnderecoEntrega,
  key: string,
): Promise<EnderecoGeocodificado> {
  const enderecoBusca = enderecoFormatado(endereco);
  const params = new URLSearchParams({
    api_key: key,
    text: enderecoBusca,
    "boundary.country": "BR",
    size: "5",
  });
  const response = await fetch(
    `https://api.openrouteservice.org/geocode/search?${params}`,
    { cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  const features = Array.isArray(data?.features) ? data.features : [];
  const feature = features.find((item: unknown) =>
    featureCompativelComEndereco(item, endereco),
  );
  const coordinates = featureCoordinates(feature);
  const longitude = Number(coordinates?.[0]);
  const latitude = Number(coordinates?.[1]);

  if (
    !response.ok ||
    !feature ||
    !coordinates ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    throw new Error("Nao foi possivel localizar o endereco informado com seguranca.");
  }

  return {
    endereco,
    enderecoFormatado: enderecoBusca,
    coordenadas: {
      longitude,
      latitude,
    },
  };
}

async function calcularRotaOpenRoute(
  origem: EnderecoEntrega,
  destino: EnderecoEntrega,
  key: string,
) {
  const [origemGeo, destinoGeo] = await Promise.all([
    geocodificarOpenRoute(origem, key),
    geocodificarOpenRoute(destino, key),
  ]);
  const params = new URLSearchParams({
    api_key: key,
    start: `${origemGeo.coordenadas.longitude},${origemGeo.coordenadas.latitude}`,
    end: `${destinoGeo.coordenadas.longitude},${destinoGeo.coordenadas.latitude}`,
  });
  const response = await fetch(
    `https://api.openrouteservice.org/v2/directions/driving-car?${params}`,
    { cache: "no-store" },
  );
  const data = await response.json().catch(() => ({}));
  const summary = data?.features?.[0]?.properties?.summary;
  const metros = Number(summary?.distance);
  const segundos = Number(summary?.duration);

  if (!response.ok || !Number.isFinite(metros)) {
    throw new Error("Nao foi possivel calcular a rota pelo OpenRouteService.");
  }

  return {
    distanciaIdaKm: metros / 1000,
    duracaoMinutos: Number.isFinite(segundos) ? segundos / 60 : 0,
    origemGeo,
    destinoGeo,
  };
}

function mesmaCidadeUf(origem: EnderecoEntrega, destino: EnderecoEntrega) {
  return (
    mesmoTexto(origem.cidade, destino.cidade) &&
    mesmoTexto(
      normalizarUf(origem.estado ?? origem.uf),
      normalizarUf(destino.estado ?? destino.uf),
    )
  );
}

function erroDistanciaAbsurda() {
  return "A rota calculada parece incorreta. Revise o endereco ou tente complementar o destino.";
}

export async function GET() {
  try {
    return NextResponse.json(await listarOrigens());
  } catch (error) {
    console.error("Erro ao carregar origens da entrega manual:", error);

    return NextResponse.json(
      { error: "Erro ao carregar origens da entrega manual." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const key = texto(process.env.OPENROUTE_API_KEY);
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const origemBody = normalizarEndereco(body.origem);
    const destino = normalizarEndereco(body.destino);
    const origem =
      enderecoCompleto(origemBody) && origemBody.id !== "frete-config"
        ? origemBody
        : await buscarOrigemPorId(texto(body.origemId || origemBody.id));

    if (!enderecoCompleto(origem)) {
      return NextResponse.json(
        { error: "Complete a origem de entrega manual antes de calcular a rota." },
        { status: 400 },
      );
    }

    if (!enderecoCompleto(destino)) {
      return NextResponse.json(
        {
          error:
            texto(destino.numero)
              ? "Preencha CEP, endereco, bairro, cidade e UF do destino."
              : "Informe o numero para calcular a entrega.",
        },
        { status: 400 },
      );
    }

    if (!key) {
      return NextResponse.json(
        {
          origem,
          destino,
          origemResumo: resumoEndereco(origem),
          destinoResumo: resumoEndereco(destino),
          origemEnderecoFormatado: enderecoFormatado(origem),
          destinoEnderecoFormatado: enderecoFormatado(destino),
          mapsUrl: montarMapsUrl(origem, destino),
          error:
            "Configure OPENROUTE_API_KEY para calcular distancia automaticamente.",
        },
        { status: 400 },
      );
    }

    const parametros =
      body.parametros &&
      typeof body.parametros === "object" &&
      !Array.isArray(body.parametros)
        ? (body.parametros as Record<string, unknown>)
        : {};
    const consumoKmPorLitro = numeroPositivo(
      parametros.consumoKmPorLitro,
      16,
    );
    const precoCombustivel = numeroNaoNegativo(parametros.precoCombustivel, 0);
    const margemPercentual = numeroNaoNegativo(
      parametros.margemPercentual,
      15,
    );
    const taxaFixa = numeroNaoNegativo(parametros.taxaFixa, 0);
    const valorMinimo = numeroNaoNegativo(parametros.valorMinimo, 0);
    const rota = await calcularRotaOpenRoute(origem, destino, key);
    const distanciaIdaKm = Number(rota.distanciaIdaKm.toFixed(2));

    if (mesmaCidadeUf(origem, destino) && distanciaIdaKm > 100) {
      const error = erroDistanciaAbsurda();

      return NextResponse.json(
        {
          origem,
          destino,
          origemResumo: resumoEndereco(origem),
          destinoResumo: resumoEndereco(destino),
          origemEnderecoFormatado: rota.origemGeo.enderecoFormatado,
          destinoEnderecoFormatado: rota.destinoGeo.enderecoFormatado,
          origemCoordenadas: rota.origemGeo.coordenadas,
          destinoCoordenadas: rota.destinoGeo.coordenadas,
          providerDistancia: "openroute",
          mapsUrl: montarMapsUrl(origem, destino),
          calculoAutomatico: false,
          erroCalculo: error,
          error,
        },
        { status: 400 },
      );
    }

    const distanciaTotalKm = Number((distanciaIdaKm * 2).toFixed(2));
    const litrosEstimados = Number(
      (distanciaTotalKm / consumoKmPorLitro).toFixed(2),
    );
    const custoCombustivel = Number(
      (litrosEstimados * precoCombustivel).toFixed(2),
    );
    const valorComMargem = Number(
      (custoCombustivel * (1 + margemPercentual / 100)).toFixed(2),
    );
    const valorSugerido = Number(
      Math.max(valorComMargem + taxaFixa, valorMinimo).toFixed(2),
    );
    const duracaoMinutos = Math.max(1, Math.round(rota.duracaoMinutos));

    return NextResponse.json({
      origem,
      destino,
      distanciaIdaKm,
      distanciaTotalKm,
      duracaoMinutos,
      duracaoTexto: formatarDuracao(duracaoMinutos),
      consumoKmPorLitro,
      litrosEstimados,
      precoCombustivel,
      custoCombustivel,
      margemPercentual,
      valorComMargem,
      taxaFixa,
      valorMinimo,
      valorSugerido,
      valorFinal: valorSugerido,
      providerDistancia: "openroute",
      mapsUrl: montarMapsUrl(origem, destino),
      origemResumo: resumoEndereco(origem),
      destinoResumo: resumoEndereco(destino),
      origemEnderecoFormatado: rota.origemGeo.enderecoFormatado,
      destinoEnderecoFormatado: rota.destinoGeo.enderecoFormatado,
      origemCoordenadas: rota.origemGeo.coordenadas,
      destinoCoordenadas: rota.destinoGeo.coordenadas,
      calculoAutomatico: true,
    });
  } catch (error) {
    console.error("Erro ao calcular entrega manual:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao calcular entrega manual.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
