import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";
import {
  exigirAdminComPermissao,
  usuarioPodeVerDadosFinanceirosAdmin,
} from "@/lib/auth/admin";

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
  latitude?: number | null;
  longitude?: number | null;
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
  encontrado: string;
  precisao:
    | "EXATA"
    | "APROXIMADA_RUA"
    | "APROXIMADA_CEP"
    | "APROXIMADA_BAIRRO"
    | "APROXIMADA_CIDADE"
    | "COORDENADA_FIXA";
  tentativa: string;
  coordenadaFixa?: boolean;
};

type TentativaGeocodificacao = {
  label: string;
  text: string;
  precisao:
    | "EXATA"
    | "APROXIMADA_RUA"
    | "APROXIMADA_CEP"
    | "APROXIMADA_BAIRRO"
    | "APROXIMADA_CIDADE";
};

type CandidatoDestino = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  precisao: EnderecoGeocodificado["precisao"];
  fonte: "openroute" | "nominatim";
};

class DestinoAmbiguoError extends Error {
  candidatos: CandidatoDestino[];

  constructor(candidatos: CandidatoDestino[]) {
    super("Encontramos opcoes proximas. Escolha uma para calcular a entrega.");
    this.name = "DestinoAmbiguoError";
    this.candidatos = candidatos;
  }
}

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

function coordenada(value: unknown, min: number, max: number) {
  if (
    value === null ||
    typeof value === "undefined" ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  const numero =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);

  return Number.isFinite(numero) && numero >= min && numero <= max
    ? numero
    : null;
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

function normalizarLogradouro(value: unknown) {
  return texto(value)
    .replace(/^R\.\s+/i, "Rua ")
    .replace(/^R\s+/i, "Rua ")
    .replace(/^Av\.\s+/i, "Avenida ")
    .replace(/^Av\s+/i, "Avenida ");
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

function textoContem(a: unknown, b: unknown) {
  const normalizadoA = removerAcentos(a);
  const normalizadoB = removerAcentos(b);

  return Boolean(
    normalizadoA &&
      normalizadoB &&
      (normalizadoA.includes(normalizadoB) ||
        normalizadoB.includes(normalizadoA)),
  );
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
    rua: normalizarLogradouro(record.rua),
    numero: texto(record.numero),
    complemento: texto(record.complemento),
    bairro: texto(record.bairro),
    cidade: texto(record.cidade),
    estado: normalizarUf(record.estado ?? record.uf),
    uf: normalizarUf(record.uf ?? record.estado),
    latitude: coordenada(record.latitude, -90, 90),
    longitude: coordenada(record.longitude, -180, 180),
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

function temCoordenadas(endereco: EnderecoEntrega) {
  return (
    typeof endereco.latitude === "number" &&
    Number.isFinite(endereco.latitude) &&
    typeof endereco.longitude === "number" &&
    Number.isFinite(endereco.longitude)
  );
}

function coordenadasParaMaps(endereco: EnderecoEntrega) {
  return temCoordenadas(endereco)
    ? `${endereco.latitude},${endereco.longitude}`
    : enderecoFormatado(endereco);
}

function montarPartesEndereco(partes: unknown[]) {
  return partes
    .map(texto)
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

function montarTentativasGeocodificacao(
  endereco: EnderecoEntrega,
): TentativaGeocodificacao[] {
  const rua = normalizarLogradouro(endereco.rua);
  const numero = texto(endereco.numero);
  const bairro = texto(endereco.bairro);
  const cidade = texto(endereco.cidade);
  const uf = normalizarUf(endereco.estado ?? endereco.uf);
  const cep = formatarCep(endereco.cep);

  return [
    {
      label: "completo",
      text: montarPartesEndereco([rua, numero, bairro, cidade, uf, cep, "Brasil"]),
      precisao: "EXATA" as const,
    },
    {
      label: "sem_bairro",
      text: montarPartesEndereco([rua, numero, cidade, uf, cep, "Brasil"]),
      precisao: "APROXIMADA_RUA" as const,
    },
    {
      label: "rua_bairro",
      text: montarPartesEndereco([rua, bairro, cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_RUA" as const,
    },
    {
      label: "rua_cidade",
      text: montarPartesEndereco([rua, cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_RUA" as const,
    },
    {
      label: "cep",
      text: montarPartesEndereco([cep, cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_CEP" as const,
    },
    {
      label: "bairro",
      text: montarPartesEndereco([bairro, cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_BAIRRO" as const,
    },
    {
      label: "cidade",
      text: montarPartesEndereco([cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_CIDADE" as const,
    },
  ].filter((tentativa) => tentativa.text);
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
    origin: coordenadasParaMaps(origem),
    destination: coordenadasParaMaps(destino),
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
    latitude: null,
    longitude: null,
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
    latitude: origem.latitude,
    longitude: origem.longitude,
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

function adicionarCandidato(
  candidatos: CandidatoDestino[],
  candidato: CandidatoDestino,
) {
  const existe = candidatos.some(
    (atual) =>
      Math.abs(atual.latitude - candidato.latitude) < 0.00001 &&
      Math.abs(atual.longitude - candidato.longitude) < 0.00001,
  );

  if (!existe) {
    candidatos.push({ ...candidato, id: String(candidatos.length + 1) });
  }
}

function ufNominatim(address: Record<string, unknown>) {
  const iso = texto(address["ISO3166-2-lvl4"]);

  if (iso.includes("-")) {
    return iso.split("-").pop() || "";
  }

  return texto(address.state_code || address.state).toUpperCase().slice(0, 2);
}

function cidadeNominatim(address: Record<string, unknown>) {
  return texto(
    address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county,
  );
}

function pontuarFeature(
  feature: unknown,
  endereco: EnderecoEntrega,
  tentativa: TentativaGeocodificacao,
) {
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
  const rua = texto(props.street || props.name || props.label);
  const bairro = texto(props.neighbourhood || props.borough || props.localadmin);
  const numero = texto(props.housenumber || props.house_number || props.number);
  const cep = normalizarCep(props.postalcode);
  const cidadeOk =
    cidades.length === 0 ||
    cidades.some((cidade) => mesmoTexto(cidade, endereco.cidade));
  const ufOk = !uf || mesmoTexto(uf, normalizarUf(endereco.estado ?? endereco.uf));
  const paisOk =
    !pais || ["BR", "Brasil", "Brazil"].some((valor) => mesmoTexto(pais, valor));
  const ruaOk = textoContem(rua, endereco.rua);
  const numeroOk = numero && mesmoTexto(numero, endereco.numero);
  const bairroOk = texto(endereco.bairro)
    ? textoContem(bairro, endereco.bairro)
    : false;
  const cepOk = cep && cep === normalizarCep(endereco.cep);

  if (!paisOk || !ufOk || !cidadeOk) {
    return {
      score: -100,
      precisao: tentativa.precisao,
      encontrado: texto(props.label || props.name || rua),
      props,
    };
  }

  let score = 0;

  if (pais && paisOk) score += 2;
  if (uf && ufOk) score += 3;
  if (cidades.length > 0 && cidadeOk) score += 4;
  if (ruaOk) score += 5;
  if (numeroOk) score += 2;
  if (cepOk) score += 3;
  if (bairroOk) score += 2;
  if (Number.isFinite(confidence)) score += Math.max(0, confidence);

  if (Number.isFinite(confidence) && confidence > 0 && confidence < 0.5) {
    score -= 2;
  }

  return {
    score,
    precisao:
      tentativa.precisao === "EXATA" && numeroOk && cepOk && bairroOk && ruaOk
        ? ("EXATA" as const)
        : tentativa.precisao,
    encontrado: texto(props.label || props.name || rua),
    props,
  };
}

function pontuarNominatim(
  item: Record<string, unknown>,
  endereco: EnderecoEntrega,
  precisao: TentativaGeocodificacao["precisao"],
) {
  const address =
    item.address && typeof item.address === "object" && !Array.isArray(item.address)
      ? (item.address as Record<string, unknown>)
      : {};
  const pais = texto(address.country_code || address.country);
  const uf = ufNominatim(address);
  const cidade = cidadeNominatim(address);
  const rua = texto(address.road || address.pedestrian || address.residential);
  const bairro = texto(address.neighbourhood || address.suburb || address.quarter);
  const cep = normalizarCep(address.postcode);
  const paisOk =
    !pais || ["br", "BR", "Brasil", "Brazil"].some((valor) => mesmoTexto(pais, valor));
  const ufOk = !uf || mesmoTexto(uf, normalizarUf(endereco.estado ?? endereco.uf));
  const cidadeOk = !cidade || mesmoTexto(cidade, endereco.cidade);
  const ruaOk = textoContem(rua, endereco.rua);
  const bairroOk = texto(endereco.bairro)
    ? textoContem(bairro, endereco.bairro)
    : false;
  const cepOk = cep && cep === normalizarCep(endereco.cep);

  if (!paisOk || !ufOk || !cidadeOk) {
    return { score: -100, precisao };
  }

  let score = 0;

  if (paisOk) score += 2;
  if (ufOk) score += 3;
  if (cidadeOk) score += 4;
  if (ruaOk) score += 5;
  if (bairroOk) score += 2;
  if (cepOk) score += 3;

  return { score, precisao: ruaOk && cepOk ? precisao : "APROXIMADA_RUA" };
}

async function buscarNominatim(params: URLSearchParams) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": "PlataformaStellaColari/1.0",
        Accept: "application/json",
      },
    },
  );

  const data = await response.json().catch(() => []);

  return Array.isArray(data) ? data : [];
}

async function geocodificarNominatim(
  endereco: EnderecoEntrega,
  candidatos: CandidatoDestino[],
): Promise<EnderecoGeocodificado | null> {
  const rua = normalizarLogradouro(endereco.rua);
  const numero = texto(endereco.numero);
  const bairro = texto(endereco.bairro);
  const cidade = texto(endereco.cidade);
  const uf = normalizarUf(endereco.estado ?? endereco.uf);
  const cep = formatarCep(endereco.cep);
  const buscas: Array<{
    params: URLSearchParams;
    tentativa: string;
    texto: string;
    precisao: TentativaGeocodificacao["precisao"];
  }> = [
    {
      params: new URLSearchParams({
        street: montarPartesEndereco([rua, numero]),
        city: cidade,
        state: uf,
        postalcode: cep,
        country: "Brazil",
        format: "json",
        addressdetails: "1",
        limit: "5",
      }),
      tentativa: "nominatim_estruturado",
      texto: montarPartesEndereco([rua, numero, bairro, cidade, uf, cep, "Brasil"]),
      precisao: "EXATA",
    },
    {
      params: new URLSearchParams({
        q: montarPartesEndereco([rua, numero, bairro, cidade, uf, cep, "Brasil"]),
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "br",
      }),
      tentativa: "nominatim_texto_completo",
      texto: montarPartesEndereco([rua, numero, bairro, cidade, uf, cep, "Brasil"]),
      precisao: "EXATA",
    },
    {
      params: new URLSearchParams({
        q: montarPartesEndereco([rua, cidade, uf, "Brasil"]),
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "br",
      }),
      tentativa: "nominatim_rua_cidade",
      texto: montarPartesEndereco([rua, cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_RUA",
    },
    {
      params: new URLSearchParams({
        q: montarPartesEndereco([bairro, cidade, uf, "Brasil"]),
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "br",
      }),
      tentativa: "nominatim_bairro",
      texto: montarPartesEndereco([bairro, cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_BAIRRO",
    },
    {
      params: new URLSearchParams({
        q: montarPartesEndereco([cep, cidade, uf, "Brasil"]),
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "br",
      }),
      tentativa: "nominatim_cep",
      texto: montarPartesEndereco([cep, cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_CEP",
    },
    {
      params: new URLSearchParams({
        q: montarPartesEndereco([cidade, uf, "Brasil"]),
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "br",
      }),
      tentativa: "nominatim_cidade",
      texto: montarPartesEndereco([cidade, uf, "Brasil"]),
      precisao: "APROXIMADA_CIDADE",
    },
  ];

  let melhor:
    | {
        item: Record<string, unknown>;
        tentativa: (typeof buscas)[number];
        score: number;
        precisao: EnderecoGeocodificado["precisao"];
      }
    | null = null;

  for (const busca of buscas) {
    const resultados = await buscarNominatim(busca.params);

    for (const resultado of resultados) {
      if (!resultado || typeof resultado !== "object" || Array.isArray(resultado)) {
        continue;
      }

      const item = resultado as Record<string, unknown>;
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      const pontuacao = pontuarNominatim(item, endereco, busca.precisao);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }

      if (pontuacao.score >= 4) {
        adicionarCandidato(candidatos, {
          id: "",
          label: texto(item.display_name) || busca.texto,
          latitude,
          longitude,
          precisao: pontuacao.precisao,
          fonte: "nominatim",
        });
      }

      const scoreMinimo = busca.precisao === "EXATA" ? 10 : 8;

      if (pontuacao.score >= scoreMinimo && (!melhor || pontuacao.score > melhor.score)) {
        melhor = {
          item,
          tentativa: busca,
          score: pontuacao.score,
          precisao: pontuacao.precisao,
        };
      }
    }

    if (melhor) {
      break;
    }
  }

  if (!melhor) {
    return null;
  }

  return {
    endereco,
    enderecoFormatado: melhor.tentativa.texto || enderecoFormatado(endereco),
    encontrado: texto(melhor.item.display_name) || melhor.tentativa.texto,
    precisao: melhor.precisao,
    tentativa: melhor.tentativa.tentativa,
    coordenadas: {
      latitude: Number(melhor.item.lat),
      longitude: Number(melhor.item.lon),
    },
  };
}

async function geocodificarOpenRoute(
  endereco: EnderecoEntrega,
  key: string,
  options?: { destino?: boolean },
): Promise<EnderecoGeocodificado> {
  const tentativas = montarTentativasGeocodificacao(endereco);
  const candidatos: CandidatoDestino[] = [];
  let melhor:
    | {
        feature: unknown;
        tentativa: TentativaGeocodificacao;
        score: number;
        precisao: EnderecoGeocodificado["precisao"];
        encontrado: string;
      }
    | null = null;

  for (const tentativa of tentativas) {
    const params = new URLSearchParams({
      api_key: key,
      text: tentativa.text,
      "boundary.country": "BR",
      size: "8",
    });
    const response = await fetch(
      `https://api.openrouteservice.org/geocode/search?${params}`,
      { cache: "no-store" },
    );
    const data = await response.json().catch(() => ({}));
    const features = Array.isArray(data?.features) ? data.features : [];

    for (const feature of features) {
      const resultado = pontuarFeature(feature, endereco, tentativa);
      const coordinates = featureCoordinates(feature);
      const longitudeCandidato = Number(coordinates?.[0]);
      const latitudeCandidato = Number(coordinates?.[1]);

      const scoreMinimo = tentativa.precisao === "EXATA" ? 9 : 7;

      if (!coordinates || resultado.score < scoreMinimo) {
        if (
          options?.destino &&
          coordinates &&
          resultado.score >= 4 &&
          Number.isFinite(longitudeCandidato) &&
          Number.isFinite(latitudeCandidato)
        ) {
          adicionarCandidato(candidatos, {
            id: "",
            label: resultado.encontrado || tentativa.text,
            latitude: latitudeCandidato,
            longitude: longitudeCandidato,
            precisao: resultado.precisao,
            fonte: "openroute",
          });
        }
        continue;
      }

      if (
        options?.destino &&
        Number.isFinite(longitudeCandidato) &&
        Number.isFinite(latitudeCandidato)
      ) {
        adicionarCandidato(candidatos, {
          id: "",
          label: resultado.encontrado || tentativa.text,
          latitude: latitudeCandidato,
          longitude: longitudeCandidato,
          precisao: resultado.precisao,
          fonte: "openroute",
        });
      }

      if (!melhor || resultado.score > melhor.score) {
        melhor = {
          feature,
          tentativa,
          score: resultado.score,
          precisao: resultado.precisao,
          encontrado: resultado.encontrado,
        };
      }
    }

    if (melhor && melhor.score >= 14) {
      break;
    }
  }

  const coordinates = featureCoordinates(melhor?.feature);
  const longitude = Number(coordinates?.[0]);
  const latitude = Number(coordinates?.[1]);

  if (!melhor || !coordinates || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    if (options?.destino) {
      const nominatim = await geocodificarNominatim(endereco, candidatos);

      if (nominatim) {
        return nominatim;
      }

      if (candidatos.length > 0) {
        throw new DestinoAmbiguoError(candidatos.slice(0, 6));
      }
    }

    throw new Error("Nao foi possivel localizar o endereco informado com seguranca.");
  }

  if (process.env.NODE_ENV !== "production") {
    const props = featureProps(melhor.feature);
    console.info("OpenRoute entrega manual geocode", {
      tentativa: melhor.tentativa.label,
      cidade: props.locality || props.localadmin || props.county,
      uf: props.region_a || props.region,
      precisao: melhor.precisao,
      score: melhor.score,
    });
  }

  return {
    endereco,
    enderecoFormatado: melhor.tentativa.text || enderecoFormatado(endereco),
    encontrado: melhor.encontrado,
    precisao: melhor.precisao,
    tentativa: melhor.tentativa.label,
    coordenadas: {
      longitude,
      latitude,
    },
  };
}

function geocodificarCoordenadaFixa(
  endereco: EnderecoEntrega,
): EnderecoGeocodificado {
  if (!temCoordenadas(endereco)) {
    throw new Error("Origem sem coordenadas fixas validas.");
  }

  return {
    endereco,
    enderecoFormatado: enderecoFormatado(endereco),
    encontrado: resumoEndereco(endereco),
    precisao: "COORDENADA_FIXA",
    tentativa: "coordenada_fixa",
    coordenadaFixa: true,
    coordenadas: {
      latitude: endereco.latitude as number,
      longitude: endereco.longitude as number,
    },
  };
}

async function calcularRotaOpenRoute(
  origem: EnderecoEntrega,
  destino: EnderecoEntrega,
  key: string,
) {
  let origemGeo: EnderecoGeocodificado;
  let destinoGeo: EnderecoGeocodificado;

  try {
    origemGeo = temCoordenadas(origem)
      ? geocodificarCoordenadaFixa(origem)
      : await geocodificarOpenRoute(origem, key);
  } catch {
    throw new Error(
      "Nao foi possivel localizar a origem. Cadastre latitude e longitude na origem de despacho.",
    );
  }

  try {
    destinoGeo = temCoordenadas(destino)
      ? geocodificarCoordenadaFixa(destino)
      : await geocodificarOpenRoute(destino, key, { destino: true });
  } catch (error) {
    if (error instanceof DestinoAmbiguoError) {
      throw error;
    }

    throw new Error(
      "Nao encontramos o destino com seguranca. Revise CEP, rua e numero ou selecione uma sugestao de endereco.",
    );
  }

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
  return "A rota calculada parece incorreta. Ajuste o destino ou selecione outra sugestao.";
}

function precisaoAproximada(precisao: string | null | undefined) {
  return String(precisao || "").startsWith("APROXIMADA");
}

function erroDistanciaIncoerente({
  origem,
  destino,
  distanciaIdaKm,
  precisaoDestino,
}: {
  origem: EnderecoEntrega;
  destino: EnderecoEntrega;
  distanciaIdaKm: number;
  precisaoDestino: string;
}) {
  if (!Number.isFinite(distanciaIdaKm) || distanciaIdaKm <= 0) {
    return erroDistanciaAbsurda();
  }

  if (mesmaCidadeUf(origem, destino) && distanciaIdaKm > 100) {
    return erroDistanciaAbsurda();
  }

  if (precisaoAproximada(precisaoDestino) && distanciaIdaKm > 150) {
    return erroDistanciaAbsurda();
  }

  if (distanciaIdaKm > 500) {
    return erroDistanciaAbsurda();
  }

  return "";
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
  let origemErro: EnderecoEntrega | null = null;
  let destinoErro: EnderecoEntrega | null = null;

  try {
    const usuario = await exigirAdminComPermissao("vendas", "ver");
    const podeVerDadosFinanceiros =
      usuarioPodeVerDadosFinanceirosAdmin(usuario);
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
    origemErro = origem;
    destinoErro = destino;

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
          origemCoordenadas: temCoordenadas(origem)
            ? { latitude: origem.latitude, longitude: origem.longitude }
            : null,
          precisaoOrigem: temCoordenadas(origem) ? "COORDENADA_FIXA" : "",
          origemPrecisao: temCoordenadas(origem) ? "COORDENADA_FIXA" : "",
          origemCoordenadaFixa: temCoordenadas(origem),
          mapsUrl: montarMapsUrl(origem, destino),
          error:
            "Configure OPENROUTE_API_KEY para calcular distancia automaticamente.",
        },
        { status: 400 },
      );
    }

    const parametrosRaw =
      body.parametros &&
      typeof body.parametros === "object" &&
      !Array.isArray(body.parametros)
        ? (body.parametros as Record<string, unknown>)
        : {};
    const parametros = podeVerDadosFinanceiros ? parametrosRaw : {};
    const consumoKmPorLitro = numeroPositivo(
      parametros.consumoKmPorLitro,
      16,
    );
    const precoCombustivel = numeroNaoNegativo(
      parametros.precoCombustivel,
      podeVerDadosFinanceiros ? 0 : 6,
    );
    const margemPercentual = numeroNaoNegativo(
      parametros.margemPercentual,
      15,
    );
    const taxaFixa = numeroNaoNegativo(parametros.taxaFixa, 0);
    const valorMinimo = numeroNaoNegativo(parametros.valorMinimo, 0);
    const rota = await calcularRotaOpenRoute(origem, destino, key);
    const distanciaIdaKm = Number(rota.distanciaIdaKm.toFixed(2));
    const avisoDestinoAproximado = precisaoAproximada(
      rota.destinoGeo.precisao,
    );
    const erroDistancia = erroDistanciaIncoerente({
      origem,
      destino,
      distanciaIdaKm,
      precisaoDestino: rota.destinoGeo.precisao,
    });

    if (erroDistancia) {
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
          precisaoOrigem: rota.origemGeo.precisao,
          precisaoDestino: rota.destinoGeo.precisao,
          origemEncontrada: rota.origemGeo.encontrado,
          destinoEncontrado: rota.destinoGeo.encontrado,
          origemPrecisao: rota.origemGeo.precisao,
          origemCoordenadaFixa: Boolean(rota.origemGeo.coordenadaFixa),
          avisoDestinoAproximado,
          providerDistancia: "openroute",
          mapsUrl: montarMapsUrl(origem, destino),
          calculoAutomatico: false,
          erroCalculo: erroDistancia,
          error: erroDistancia,
        },
        { status: 400 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("OpenRoute entrega manual rota", {
        distanciaIdaKm,
        origemCidade: origem.cidade,
        origemUf: origem.uf || origem.estado,
        destinoCidade: destino.cidade,
        destinoUf: destino.uf || destino.estado,
        precisaoOrigem: rota.origemGeo.precisao,
        precisaoDestino: rota.destinoGeo.precisao,
      });
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

    const dadosFinanceiros = podeVerDadosFinanceiros
      ? {
          consumoKmPorLitro,
          precoCombustivel,
          litrosEstimados,
          custoCombustivel,
          margemPercentual,
          valorComMargem,
          taxaFixa,
          valorMinimo,
        }
      : {};

    return NextResponse.json({
      origem,
      destino,
      distanciaIdaKm,
      distanciaTotalKm,
      duracaoMinutos,
      duracaoTexto: formatarDuracao(duracaoMinutos),
      valorSugerido,
      valorFinal: valorSugerido,
      ...dadosFinanceiros,
      providerDistancia: "openroute",
      mapsUrl: montarMapsUrl(origem, destino),
      origemResumo: resumoEndereco(origem),
      destinoResumo: resumoEndereco(destino),
      origemEnderecoFormatado: rota.origemGeo.enderecoFormatado,
      destinoEnderecoFormatado: rota.destinoGeo.enderecoFormatado,
      origemCoordenadas: rota.origemGeo.coordenadas,
      destinoCoordenadas: rota.destinoGeo.coordenadas,
      precisaoOrigem: rota.origemGeo.precisao,
      precisaoDestino: rota.destinoGeo.precisao,
      avisoDestinoAproximado,
      origemEncontrada: rota.origemGeo.encontrado,
      destinoEncontrado: rota.destinoGeo.encontrado,
      origemPrecisao: rota.origemGeo.precisao,
      origemCoordenadaFixa: Boolean(rota.origemGeo.coordenadaFixa),
      calculoAutomatico: true,
    });
  } catch (error) {
    console.error("Erro ao calcular entrega manual:", error);

    if (error instanceof DestinoAmbiguoError) {
      return NextResponse.json(
        {
          error: "DESTINO_AMBIGUO",
          message: error.message,
          candidatosDestino: error.candidatos,
          mapsUrl:
            origemErro && destinoErro ? montarMapsUrl(origemErro, destinoErro) : "",
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Erro ao calcular entrega manual.";

    const errorTipo = message.includes("localizar a origem")
      ? "ORIGEM_GEOCODIFICACAO"
      : message.includes("destino")
        ? "DESTINO_GEOCODIFICACAO"
        : "CALCULO_ENTREGA_MANUAL";

    return NextResponse.json({ error: message, errorTipo }, { status: 400 });
  }
}
