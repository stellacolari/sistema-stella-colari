import { prisma } from "@/lib/prisma";

export const CHAVE_FRETE_CONFIG = "PADRAO";
export const FRETE_RETIRADA_LOCAL_ID = "RETIRADA_LOCAL";
export const FRETE_MANUAL_ID = "FRETE_MANUAL";

export type FreteProvedor = "MELHOR_ENVIO" | "MANUAL" | "DESATIVADO";
export type FreteAmbiente = "sandbox" | "production";

export type FreteConfiguracaoOperacional = {
  id?: string;
  chave: string;
  provedor: FreteProvedor;
  ambiente: FreteAmbiente;
  cepOrigem: string;
  userAgent: string;
  pesoFallbackKg: number;
  alturaFallbackCm: number;
  larguraFallbackCm: number;
  comprimentoFallbackCm: number;
  prazoAdicionalDias: number;
  valorAdicional: number;
  retiradaLocalHabilitada: boolean;
  retiradaLocalTexto: string;
  melhorEnvioTokenConfigurado: boolean;
};

function normalizarCep(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function numeroEnv(nome: string, fallback: number) {
  const numero = Number(process.env[nome]);

  return Number.isFinite(numero) && numero > 0 ? numero : fallback;
}

function numeroPositivo(value: unknown, fallback: number) {
  const numero = Number(value);

  return Number.isFinite(numero) && numero > 0 ? numero : fallback;
}

function numeroNaoNegativo(value: unknown, fallback = 0) {
  const numero = Number(value);

  return Number.isFinite(numero) && numero >= 0 ? numero : fallback;
}

function inteiroNaoNegativo(value: unknown, fallback = 0) {
  const numero = Number(value);

  return Number.isFinite(numero) && numero >= 0 ? Math.trunc(numero) : fallback;
}

function normalizarProvedor(value: unknown): FreteProvedor {
  const provedor = String(value || "").trim().toUpperCase();

  if (provedor === "MANUAL" || provedor === "DESATIVADO") {
    return provedor;
  }

  return "MELHOR_ENVIO";
}

function normalizarAmbiente(value: unknown): FreteAmbiente {
  return String(value || "").trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

function getEnvConfigBase() {
  return {
    cepOrigem: normalizarCep(process.env.MELHOR_ENVIO_ORIGEM_CEP),
    ambiente: normalizarAmbiente(process.env.MELHOR_ENVIO_ENV),
    userAgent: String(
      process.env.MELHOR_ENVIO_USER_AGENT || "Sistema Stella"
    ).trim(),
    pesoFallbackKg: numeroEnv("FRETE_FALLBACK_PESO_KG", 0.3),
    alturaFallbackCm: numeroEnv("FRETE_FALLBACK_ALTURA_CM", 4),
    larguraFallbackCm: numeroEnv("FRETE_FALLBACK_LARGURA_CM", 12),
    comprimentoFallbackCm: numeroEnv("FRETE_FALLBACK_COMPRIMENTO_CM", 18),
    melhorEnvioTokenConfigurado: Boolean(
      String(process.env.MELHOR_ENVIO_TOKEN || "").trim()
    ),
  };
}

export function serializarConfiguracaoFrete(
  config: {
    id?: string;
    chave?: string;
    provedor?: string | null;
    cepOrigem?: string | null;
    ambiente?: string | null;
    userAgent?: string | null;
    pesoFallbackKg?: number | null;
    alturaFallbackCm?: number | null;
    larguraFallbackCm?: number | null;
    comprimentoFallbackCm?: number | null;
    prazoAdicionalDias?: number | null;
    valorAdicional?: number | null;
    retiradaLocalHabilitada?: boolean | null;
    retiradaLocalTexto?: string | null;
  } | null
): FreteConfiguracaoOperacional {
  const envConfig = getEnvConfigBase();
  const cepAdmin = normalizarCep(config?.cepOrigem);
  const userAgentAdmin = String(config?.userAgent || "").trim();

  return {
    id: config?.id,
    chave: config?.chave || CHAVE_FRETE_CONFIG,
    provedor: normalizarProvedor(config?.provedor),
    ambiente: normalizarAmbiente(config?.ambiente || envConfig.ambiente),
    cepOrigem: cepAdmin || envConfig.cepOrigem,
    userAgent: userAgentAdmin || envConfig.userAgent,
    pesoFallbackKg: numeroPositivo(
      config?.pesoFallbackKg,
      envConfig.pesoFallbackKg
    ),
    alturaFallbackCm: numeroPositivo(
      config?.alturaFallbackCm,
      envConfig.alturaFallbackCm
    ),
    larguraFallbackCm: numeroPositivo(
      config?.larguraFallbackCm,
      envConfig.larguraFallbackCm
    ),
    comprimentoFallbackCm: numeroPositivo(
      config?.comprimentoFallbackCm,
      envConfig.comprimentoFallbackCm
    ),
    prazoAdicionalDias: inteiroNaoNegativo(config?.prazoAdicionalDias),
    valorAdicional: numeroNaoNegativo(config?.valorAdicional),
    retiradaLocalHabilitada: Boolean(config?.retiradaLocalHabilitada),
    retiradaLocalTexto: String(config?.retiradaLocalTexto || "").trim(),
    melhorEnvioTokenConfigurado: envConfig.melhorEnvioTokenConfigurado,
  };
}

export async function buscarConfiguracaoFrete() {
  const config = await prisma.lojaFreteConfiguracao.upsert({
    where: {
      chave: CHAVE_FRETE_CONFIG,
    },
    create: {
      chave: CHAVE_FRETE_CONFIG,
      provedor: "MELHOR_ENVIO",
      cepOrigem: normalizarCep(process.env.MELHOR_ENVIO_ORIGEM_CEP) || null,
      ambiente: normalizarAmbiente(process.env.MELHOR_ENVIO_ENV),
      userAgent: String(
        process.env.MELHOR_ENVIO_USER_AGENT || "Sistema Stella"
      ).trim(),
      pesoFallbackKg: numeroEnv("FRETE_FALLBACK_PESO_KG", 0.3),
      alturaFallbackCm: numeroEnv("FRETE_FALLBACK_ALTURA_CM", 4),
      larguraFallbackCm: numeroEnv("FRETE_FALLBACK_LARGURA_CM", 12),
      comprimentoFallbackCm: numeroEnv("FRETE_FALLBACK_COMPRIMENTO_CM", 18),
      prazoAdicionalDias: 0,
      valorAdicional: 0,
      retiradaLocalHabilitada: false,
    },
    update: {},
  });

  return serializarConfiguracaoFrete(config);
}

