import type { CotarFreteInput, FreteOpcao } from "@/lib/frete/types";
import type { FreteConfiguracaoOperacional } from "@/lib/frete/configuracao";

const MELHOR_ENVIO_URLS = {
  sandbox: "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate",
  production: "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate",
};

function normalizarCep(cep: string) {
  return String(cep || "").replace(/\D/g, "");
}

function getConfigMelhorEnvio(config: FreteConfiguracaoOperacional) {
  const token = String(process.env.MELHOR_ENVIO_TOKEN || "").trim();
  const cepOrigem = normalizarCep(config.cepOrigem);

  if (!token) {
    throw new Error("MELHOR_ENVIO_TOKEN não configurado.");
  }

  if (cepOrigem.length !== 8) {
    throw new Error("MELHOR_ENVIO_ORIGEM_CEP deve ter 8 dígitos.");
  }

  return {
    url: MELHOR_ENVIO_URLS[config.ambiente],
    token,
    cepOrigem,
    userAgent: config.userAgent,
  };
}

function parseNumero(value: unknown) {
  const numero = Number(value);

  return Number.isFinite(numero) ? numero : 0;
}

function parsePrazo(value: unknown) {
  const numero = Number(value);

  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : null;
}

function getTransportadora(item: Record<string, unknown>) {
  const company = item.company;

  if (company && typeof company === "object") {
    const name = (company as Record<string, unknown>).name;

    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }

  return "";
}

function getErroServico(item: Record<string, unknown>) {
  const error = item.error;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return null;
}

function montarProdutos(
  input: CotarFreteInput,
  config: FreteConfiguracaoOperacional
) {
  return input.produtos.map((produto) => {
    // Fallback temporario ate Produto ganhar campos reais de peso/dimensoes.
    const pesoKg = Number(produto.pesoKg || 0) || config.pesoFallbackKg;
    const alturaCm = Number(produto.alturaCm || 0) || config.alturaFallbackCm;
    const larguraCm = Number(produto.larguraCm || 0) || config.larguraFallbackCm;
    const comprimentoCm =
      Number(produto.comprimentoCm || 0) || config.comprimentoFallbackCm;

    return {
      id: produto.id,
      width: larguraCm,
      height: alturaCm,
      length: comprimentoCm,
      weight: pesoKg,
      insurance_value: Math.max(Number(produto.valorUnitario || 0), 1),
      quantity: Math.max(Math.round(Number(produto.quantidade || 1)), 1),
    };
  });
}

export async function cotarFreteMelhorEnvio(
  input: CotarFreteInput,
  freteConfig: FreteConfiguracaoOperacional
): Promise<FreteOpcao[]> {
  const config = getConfigMelhorEnvio(freteConfig);
  const cepDestino = normalizarCep(input.cepDestino);

  if (cepDestino.length !== 8) {
    throw new Error("CEP de destino inválido.");
  }

  if (input.produtos.length === 0) {
    throw new Error("Informe ao menos um produto para cotar frete.");
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": config.userAgent,
    },
    body: JSON.stringify({
      from: {
        postal_code: config.cepOrigem,
      },
      to: {
        postal_code: cepDestino,
      },
      products: montarProdutos(input, freteConfig),
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message || "")
        : "";

    throw new Error(message || "Erro ao cotar frete no Melhor Envio.");
  }

  if (!Array.isArray(data)) {
    throw new Error("Retorno inesperado do Melhor Envio.");
  }

  return data.map((item: unknown) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const servicoId = String(record.id || "");
    const nome = String(record.name || "Frete").trim();
    const transportadora = getTransportadora(record);
    const valorBase = parseNumero(record.custom_price || record.price);
    const prazoBase = parsePrazo(
      record.custom_delivery_time || record.delivery_time
    );
    const valor = Math.max(valorBase + freteConfig.valorAdicional, 0);
    const prazoDias =
      prazoBase !== null ? prazoBase + freteConfig.prazoAdicionalDias : null;
    const erro = getErroServico(record);

    return {
      id: `${servicoId}:${transportadora}:${nome}`,
      servicoId,
      nome,
      transportadora,
      valor,
      prazoDias,
      descricao: [
        transportadora,
        nome,
        prazoDias !== null ? `${prazoDias} dia${prazoDias === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(" - "),
      provider: "MELHOR_ENVIO",
      tipoEntrega: "ENTREGA",
      raw: record,
      erro,
    };
  });
}

export function getCepOrigemMelhorEnvio(config: FreteConfiguracaoOperacional) {
  return normalizarCep(config.cepOrigem);
}
