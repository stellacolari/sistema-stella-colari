import type {
  AtualizarRastreioMelhorEnvioInput,
  ComprarEtiquetaMelhorEnvioInput,
  CotarFreteInput,
  FreteOpcao,
  FreteProdutoPayload,
  GerarEtiquetaMelhorEnvioInput,
  ImprimirEtiquetaMelhorEnvioInput,
  MelhorEnvioDestinatario,
  MelhorEnvioRemetente,
  PrepararEnvioMelhorEnvioInput,
} from "@/lib/frete/types";
import type { FreteConfiguracaoOperacional } from "@/lib/frete/configuracao";

const MELHOR_ENVIO_URLS = {
  sandbox: "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate",
  production: "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate",
};

const MELHOR_ENVIO_CART_URLS = {
  sandbox: "https://sandbox.melhorenvio.com.br/api/v2/me/cart",
  production: "https://www.melhorenvio.com.br/api/v2/me/cart",
};

const MELHOR_ENVIO_CHECKOUT_URLS = {
  sandbox: "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/checkout",
  production: "https://www.melhorenvio.com.br/api/v2/me/shipment/checkout",
};

const MELHOR_ENVIO_GENERATE_URLS = {
  sandbox: "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/generate",
  production: "https://www.melhorenvio.com.br/api/v2/me/shipment/generate",
};

const MELHOR_ENVIO_PRINT_URLS = {
  sandbox: "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/print",
  production: "https://www.melhorenvio.com.br/api/v2/me/shipment/print",
};

const MELHOR_ENVIO_TRACKING_URLS = {
  sandbox: "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/tracking",
  production: "https://www.melhorenvio.com.br/api/v2/me/shipment/tracking",
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

function extrairMensagemErroMelhorEnvio(data: unknown) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const record = data as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  if (record.error && typeof record.error === "string") {
    return record.error.trim();
  }

  if (record.errors && typeof record.errors === "object") {
    const errors = record.errors as Record<string, unknown>;
    const mensagens = Object.entries(errors)
      .flatMap(([campo, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${campo}: ${String(item)}`);
        }

        if (value) {
          return [`${campo}: ${String(value)}`];
        }

        return [];
      })
      .filter(Boolean);

    if (mensagens.length > 0) {
      return mensagens.join(" | ");
    }
  }

  return "";
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

function montarProdutosDeclaracao(produtos: FreteProdutoPayload[]) {
  return produtos.map((produto) => ({
    name: produto.nome,
    quantity: Math.max(Math.round(Number(produto.quantidade || 1)), 1),
    unitary_value: Math.max(Number(produto.valorUnitario || 0), 1),
  }));
}

function montarVolumePadrao(
  produtos: FreteProdutoPayload[],
  config: FreteConfiguracaoOperacional
) {
  const quantidadeTotal = produtos.reduce(
    (total, produto) =>
      total + Math.max(Math.round(Number(produto.quantidade || 1)), 1),
    0
  );
  const pesoTotal = produtos.reduce((total, produto) => {
    const quantidade = Math.max(Math.round(Number(produto.quantidade || 1)), 1);
    const peso = Number(produto.pesoKg || 0) || config.pesoFallbackKg;

    return total + peso * quantidade;
  }, 0);
  const valorTotal = produtos.reduce((total, produto) => {
    const quantidade = Math.max(Math.round(Number(produto.quantidade || 1)), 1);

    return total + Number(produto.valorUnitario || 0) * quantidade;
  }, 0);

  return {
    height: config.alturaFallbackCm,
    width: config.larguraFallbackCm,
    length: config.comprimentoFallbackCm,
    weight: Math.max(pesoTotal, config.pesoFallbackKg),
    insurance_value: Math.max(valorTotal, 1),
    quantity: Math.max(quantidadeTotal, 1),
  };
}

function getCamposFaltantesEndereco(
  prefixo: string,
  dados: MelhorEnvioRemetente | MelhorEnvioDestinatario
) {
  const campos: [string, unknown][] = [
    [`${prefixo}.name`, dados.name],
    [`${prefixo}.phone`, dados.phone],
    [`${prefixo}.document`, dados.document],
    [`${prefixo}.address`, dados.address],
    [`${prefixo}.number`, dados.number],
    [`${prefixo}.district`, dados.district],
    [`${prefixo}.city`, dados.city],
    [`${prefixo}.state_abbr`, dados.state_abbr],
    [`${prefixo}.postal_code`, dados.postal_code],
  ];

  if (prefixo === "remetente") {
    campos.push([`${prefixo}.email`, dados.email]);
  }

  return campos
    .filter(([, value]) => !String(value || "").trim())
    .map(([campo]) => campo);
}

export function validarDadosRemetenteMelhorEnvio(
  remetente: MelhorEnvioRemetente
) {
  return getCamposFaltantesEndereco("remetente", remetente);
}

export function validarDadosDestinatarioMelhorEnvio(
  destinatario: MelhorEnvioDestinatario
) {
  return getCamposFaltantesEndereco("destinatario", destinatario);
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

export async function inserirEnvioNoCarrinhoMelhorEnvio(
  input: PrepararEnvioMelhorEnvioInput,
  freteConfig: FreteConfiguracaoOperacional
) {
  const config = getConfigMelhorEnvio(freteConfig);
  const camposRemetente = validarDadosRemetenteMelhorEnvio(input.remetente);
  const camposDestinatario = validarDadosDestinatarioMelhorEnvio(
    input.destinatario
  );
  const camposFaltantes = [...camposRemetente, ...camposDestinatario];

  if (camposFaltantes.length > 0) {
    throw new Error(
      `Dados incompletos para preparar envio no Melhor Envio: ${camposFaltantes.join(
        ", "
      )}. Próxima etapa: configurar dados completos do remetente.`
    );
  }

  const payload = {
    service: input.serviceId,
    from: {
      ...input.remetente,
      postal_code: normalizarCep(input.remetente.postal_code || ""),
    },
    to: {
      ...input.destinatario,
      postal_code: normalizarCep(input.destinatario.postal_code || ""),
    },
    products: montarProdutosDeclaracao(input.produtos),
    volumes: [montarVolumePadrao(input.produtos, freteConfig)],
    options: {
      insurance_value: true,
      receipt: false,
      own_hand: false,
      non_commercial: true,
      platform: "Sistema Stella",
      tags: [
        {
          tag: input.pedidoCodigo,
          url: "",
        },
      ],
    },
  };

  const response = await fetch(MELHOR_ENVIO_CART_URLS[freteConfig.ambiente], {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": config.userAgent,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message || "")
        : "";

    throw new Error(message || "Erro ao inserir envio no carrinho do Melhor Envio.");
  }

  return data;
}

export async function comprarEtiquetaMelhorEnvio(
  input: ComprarEtiquetaMelhorEnvioInput,
  freteConfig: FreteConfiguracaoOperacional
) {
  const config = getConfigMelhorEnvio(freteConfig);
  const orderId = String(input.orderId || "").trim();

  if (!orderId) {
    throw new Error("Identificador do envio no Melhor Envio não informado.");
  }

  const response = await fetch(
    MELHOR_ENVIO_CHECKOUT_URLS[freteConfig.ambiente],
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
      },
      body: JSON.stringify({
        orders: [orderId],
      }),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extrairMensagemErroMelhorEnvio(data);

    throw new Error(message || "Erro ao comprar etiqueta no Melhor Envio.");
  }

  return data;
}

export async function gerarEtiquetaMelhorEnvio(
  input: GerarEtiquetaMelhorEnvioInput,
  freteConfig: FreteConfiguracaoOperacional
) {
  const config = getConfigMelhorEnvio(freteConfig);
  const orderId = String(input.orderId || "").trim();

  if (!orderId) {
    throw new Error("Identificador do envio no Melhor Envio não informado.");
  }

  const response = await fetch(
    MELHOR_ENVIO_GENERATE_URLS[freteConfig.ambiente],
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
      },
      body: JSON.stringify({
        orders: [orderId],
      }),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extrairMensagemErroMelhorEnvio(data);

    throw new Error(message || "Erro ao gerar etiqueta no Melhor Envio.");
  }

  return data;
}

export async function imprimirEtiquetaMelhorEnvio(
  input: ImprimirEtiquetaMelhorEnvioInput,
  freteConfig: FreteConfiguracaoOperacional
) {
  const config = getConfigMelhorEnvio(freteConfig);
  const orderId = String(input.orderId || "").trim();

  if (!orderId) {
    throw new Error("Identificador do envio no Melhor Envio não informado.");
  }

  const response = await fetch(MELHOR_ENVIO_PRINT_URLS[freteConfig.ambiente], {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": config.userAgent,
    },
    body: JSON.stringify({
      mode: input.mode || "public",
      orders: [orderId],
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extrairMensagemErroMelhorEnvio(data);

    throw new Error(message || "Erro ao imprimir etiqueta no Melhor Envio.");
  }

  return data;
}

export async function atualizarRastreioMelhorEnvio(
  input: AtualizarRastreioMelhorEnvioInput,
  freteConfig: FreteConfiguracaoOperacional
) {
  const config = getConfigMelhorEnvio(freteConfig);
  const orderId = String(input.orderId || "").trim();

  if (!orderId) {
    throw new Error("Identificador do envio no Melhor Envio não informado.");
  }

  const response = await fetch(
    MELHOR_ENVIO_TRACKING_URLS[freteConfig.ambiente],
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
      },
      body: JSON.stringify({
        orders: [orderId],
      }),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extrairMensagemErroMelhorEnvio(data);

    throw new Error(message || "Erro ao atualizar rastreio no Melhor Envio.");
  }

  return data;
}
