import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularEstoqueProdutoVenda } from "@/lib/loja/estoque";
import {
  cotarFreteMelhorEnvio,
  getCepOrigemMelhorEnvio,
} from "@/lib/frete/melhor-envio";
import {
  buscarConfiguracaoFrete,
  FRETE_MANUAL_ID,
  FRETE_RETIRADA_LOCAL_ID,
} from "@/lib/frete/configuracao";
import type { FreteOpcao, FreteProdutoPayload } from "@/lib/frete/types";

export type ItemPedidoManualOnlinePayload = {
  id: string;
  quantidade: number;
  tamanhoAnel?: string | null;
};

export type EnvioPedidoManualOnlinePayload = {
  habilitado?: boolean;
  modalidade?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  freteOpcaoId?: string | null;
  origemDespachoSnapshot?: {
    cep?: string | null;
    rua?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
  kmIda?: number | string | null;
  kmEstimado?: number | string | null;
  distanciaIdaKm?: number | string | null;
  distanciaTotalKm?: number | string | null;
  kmIdaVolta?: number | string | null;
  consumoKmPorLitro?: number | string | null;
  precoCombustivel?: number | string | null;
  cobrarIdaVolta?: boolean | null;
  litrosEstimados?: number | string | null;
  custoCombustivel?: number | string | null;
  margemPercentual?: number | string | null;
  taxaFixa?: number | string | null;
  valorMinimo?: number | string | null;
  valorSugerido?: number | string | null;
  valorManual?: number | string | null;
  valorFinal?: number | string | null;
  providerDistancia?: string | null;
  mapsUrl?: string | null;
  calculoAutomatico?: boolean | null;
  origemResumo?: string | null;
  destinoResumo?: string | null;
  observacaoManual?: string | null;
};

type ModalidadeEntregaManual =
  | "SEM_ENTREGA"
  | "MELHOR_ENVIO"
  | "RETIRADA_COMBINADA"
  | "ENTREGA_MANUAL"
  | "ENTREGA_LOCAL"
  | "CIDADE_PROXIMA";

function gerarCodigoPedido(numero: number) {
  return `PO${String(numero).padStart(6, "0")}`;
}

async function gerarProximoCodigoPedido(tx: Prisma.TransactionClient) {
  const ultimoPedido = await tx.pedidoOnline.findFirst({
    where: {
      codigo: {
        startsWith: "PO",
      },
    },
    orderBy: {
      codigo: "desc",
    },
    select: {
      codigo: true,
    },
  });

  let proximoNumero = 1;

  if (ultimoPedido?.codigo) {
    const numeroAtual = Number(ultimoPedido.codigo.replace("PO", ""));

    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const codigo = gerarCodigoPedido(proximoNumero + tentativa);
    const existente = await tx.pedidoOnline.findUnique({
      where: { codigo },
      select: { id: true },
    });

    if (!existente) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código único para o pedido.");
}

function normalizarCategoria(categoria: string) {
  return categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function produtoExigeTamanhoAnel(categoria: string) {
  const categoriaNormalizada = normalizarCategoria(categoria);

  return (
    categoriaNormalizada === "anel" ||
    categoriaNormalizada === "aneis" ||
    categoriaNormalizada === "aneis e aliancas" ||
    categoriaNormalizada.includes("anel")
  );
}

function normalizarTamanhoAnel(tamanho: string | null | undefined) {
  const value = String(tamanho ?? "")
    .trim()
    .toUpperCase();

  if (!value || value === "UNICO") {
    return "";
  }

  return value;
}

function normalizarCep(cep: unknown) {
  return String(cep || "").replace(/\D/g, "");
}

function normalizarUf(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function texto(value: unknown) {
  return String(value || "").trim();
}

function numeroNaoNegativo(value: unknown, fallback = 0) {
  const numero =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);

  return Number.isFinite(numero) && numero >= 0 ? numero : fallback;
}

function normalizarModalidadeEntrega(
  envio: EnvioPedidoManualOnlinePayload | null | undefined,
): ModalidadeEntregaManual {
  if (!envio?.habilitado) {
    return "SEM_ENTREGA";
  }

  const modalidade = texto(envio.modalidade).toUpperCase();

  if (
    modalidade === "RETIRADA_COMBINADA" ||
    modalidade === "ENTREGA_MANUAL" ||
    modalidade === "ENTREGA_LOCAL" ||
    modalidade === "CIDADE_PROXIMA"
  ) {
    if (modalidade === "ENTREGA_LOCAL" || modalidade === "CIDADE_PROXIMA") {
      return "ENTREGA_MANUAL";
    }

    return modalidade;
  }

  return "MELHOR_ENVIO";
}

function selecionarOpcaoFrete(opcoes: FreteOpcao[], freteOpcaoId: string) {
  return (
    opcoes.find((opcao) => opcao.id === freteOpcaoId && !opcao.erro) || null
  );
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function montarOpcaoRetiradaLocal(textoConfig: string): FreteOpcao {
  return {
    id: FRETE_RETIRADA_LOCAL_ID,
    servicoId: FRETE_RETIRADA_LOCAL_ID,
    nome: "Retirada local",
    transportadora: "Retirada local",
    valor: 0,
    prazoDias: 0,
    descricao: textoConfig || "Retirada local sem custo de frete.",
    provider: "RETIRADA_LOCAL",
    tipoEntrega: "RETIRADA",
  };
}

function montarOpcaoManual(valor: number, prazoDias: number): FreteOpcao {
  return {
    id: FRETE_MANUAL_ID,
    servicoId: FRETE_MANUAL_ID,
    nome: "Frete manual",
    transportadora: "Frete manual",
    valor,
    prazoDias,
    descricao:
      prazoDias > 0
        ? `Frete configurado manualmente - ${prazoDias} dia${
            prazoDias === 1 ? "" : "s"
          }`
        : "Frete configurado manualmente.",
    provider: "MANUAL",
    tipoEntrega: "ENTREGA",
  };
}

function validarEnderecoEntrega({
  envio,
  cliente,
}: {
  envio: EnvioPedidoManualOnlinePayload;
  cliente: {
    nome: string;
    telefone?: string | null;
    documento?: string | null;
  };
}) {
  const cep = normalizarCep(envio.cep);
  const rua = texto(envio.rua);
  const numero = texto(envio.numero);
  const bairro = texto(envio.bairro);
  const cidade = texto(envio.cidade);
  const estado = normalizarUf(envio.estado);
  const telefone = texto(cliente.telefone);
  const documento = texto(cliente.documento).replace(/\D/g, "");

  if (cep.length !== 8) {
    throw new Error("Informe um CEP válido para entrega.");
  }

  if (!rua || !numero || !bairro || !cidade || estado.length !== 2) {
    throw new Error(
      "Preencha endereço, número, bairro, cidade e UF para entrega.",
    );
  }

  if (!telefone) {
    throw new Error("Cliente sem telefone para envio.");
  }

  if (!documento) {
    throw new Error("Cliente sem documento para envio.");
  }

  return {
    cep,
    rua,
    numero,
    complemento: texto(envio.complemento),
    bairro,
    cidade,
    estado,
  };
}

function validarEnderecoEntregaManual(envio: EnvioPedidoManualOnlinePayload) {
  const cep = normalizarCep(envio.cep);
  const rua = texto(envio.rua);
  const numero = texto(envio.numero);
  const bairro = texto(envio.bairro);
  const cidade = texto(envio.cidade);
  const estado = normalizarUf(envio.estado);

  if (cep && cep.length !== 8) {
    throw new Error("Informe um CEP valido para entrega.");
  }

  if (!rua || !numero || !bairro || !cidade || estado.length !== 2) {
    throw new Error(
      "Preencha endereco, numero, bairro, cidade e UF para entrega.",
    );
  }

  return {
    cep: cep || null,
    rua,
    numero,
    complemento: texto(envio.complemento),
    bairro,
    cidade,
    estado,
  };
}

function montarOrigemDespachoSnapshot(
  freteConfig: Awaited<ReturnType<typeof buscarConfiguracaoFrete>> | null,
) {
  if (!freteConfig) {
    return null;
  }

  return {
    cep: normalizarCep(freteConfig.cepOrigem) || null,
    rua: texto(freteConfig.remetenteEndereco) || null,
    numero: texto(freteConfig.remetenteNumero) || null,
    complemento: texto(freteConfig.remetenteComplemento) || null,
    bairro: texto(freteConfig.remetenteBairro) || null,
    cidade: texto(freteConfig.remetenteCidade) || null,
    estado: normalizarUf(freteConfig.remetenteUf) || null,
  };
}

function origemDespachoCompleta(
  origem: ReturnType<typeof montarOrigemDespachoSnapshot>,
) {
  return Boolean(
    origem &&
      normalizarCep(origem.cep).length === 8 &&
      texto(origem.rua) &&
      texto(origem.numero) &&
      texto(origem.bairro) &&
      texto(origem.cidade) &&
      normalizarUf(origem.estado).length === 2,
  );
}

function montarResumoEndereco(endereco: {
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}) {
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

function montarEntregaManual(
  modalidade: ModalidadeEntregaManual,
  envio: EnvioPedidoManualOnlinePayload,
  origemDespachoSnapshot: ReturnType<typeof montarOrigemDespachoSnapshot>,
) {
  const kmIda = numeroNaoNegativo(
    envio.distanciaIdaKm ?? envio.kmIda ?? envio.kmEstimado,
  );
  const kmIdaVolta =
    numeroNaoNegativo(envio.distanciaTotalKm ?? envio.kmIdaVolta) ||
    kmIda * 2;
  const consumoKmPorLitro = numeroNaoNegativo(envio.consumoKmPorLitro, 16);
  const precoCombustivel = numeroNaoNegativo(envio.precoCombustivel);
  const margemPercentual = numeroNaoNegativo(envio.margemPercentual, 15);
  const taxaFixa = numeroNaoNegativo(envio.taxaFixa);
  const valorMinimo = numeroNaoNegativo(envio.valorMinimo);
  const litrosEstimados =
    consumoKmPorLitro > 0 ? kmIdaVolta / consumoKmPorLitro : 0;
  const custoCombustivel = litrosEstimados * precoCombustivel;
  const valorComMargem = custoCombustivel * (1 + margemPercentual / 100);
  const valorCalculado = valorComMargem + taxaFixa;
  const valorSugerido = Math.max(
    numeroNaoNegativo(envio.valorSugerido, valorCalculado),
    valorMinimo,
  );
  const valorManualRaw =
    (envio.valorFinal ?? envio.valorManual) === null ||
    typeof (envio.valorFinal ?? envio.valorManual) === "undefined"
      ? null
      : numeroNaoNegativo(envio.valorFinal ?? envio.valorManual);
  const valorFinal = valorManualRaw === null ? valorSugerido : valorManualRaw;
  const endereco = {
    cep: normalizarCep(envio.cep) || null,
    rua: texto(envio.rua) || null,
    numero: texto(envio.numero) || null,
    complemento: texto(envio.complemento) || null,
    bairro: texto(envio.bairro) || null,
    cidade: texto(envio.cidade) || null,
    estado: normalizarUf(envio.estado) || null,
  };

  return {
    modalidade,
    kmIda,
    kmEstimado: kmIda,
    distanciaIdaKm: kmIda,
    distanciaTotalKm: kmIdaVolta,
    kmIdaVolta,
    consumoKmPorLitro,
    precoCombustivel,
    cobrarIdaVolta: true,
    litrosEstimados,
    custoCombustivel,
    margemPercentual,
    valorComMargem,
    taxaFixa,
    valorMinimo,
    valorSugerido,
    valorFinalCalculado: valorSugerido,
    valorFinal,
    providerDistancia: texto(envio.providerDistancia) || null,
    mapsUrl: texto(envio.mapsUrl) || null,
    calculoAutomatico: Boolean(envio.calculoAutomatico),
    origemDespachoSnapshot,
    origemResumo:
      texto(envio.origemResumo) ||
      (origemDespachoSnapshot
        ? montarResumoEndereco(origemDespachoSnapshot)
        : null),
    destinoResumo: texto(envio.destinoResumo) || montarResumoEndereco(endereco),
    observacaoManual: texto(envio.observacaoManual) || null,
    endereco,
  };
}

function labelModalidadeEntrega(modalidade: ModalidadeEntregaManual) {
  if (modalidade === "RETIRADA_COMBINADA") return "Retirada combinada";
  if (
    modalidade === "ENTREGA_MANUAL" ||
    modalidade === "ENTREGA_LOCAL" ||
    modalidade === "CIDADE_PROXIMA"
  ) {
    return "Entrega manual";
  }

  return "Melhor Envio";
}

export async function criarPedidoManualOnline({
  clienteId,
  meioVenda,
  descontoPercentual,
  observacoes,
  itens,
  envio,
}: {
  clienteId: string;
  meioVenda: string;
  descontoPercentual: number;
  observacoes?: string | null;
  itens: ItemPedidoManualOnlinePayload[];
  envio?: EnvioPedidoManualOnlinePayload | null;
}) {
  const modalidadeEntrega = normalizarModalidadeEntrega(envio);
  const usarEnvio = modalidadeEntrega !== "SEM_ENTREGA";
  const usaFretePublico = modalidadeEntrega === "MELHOR_ENVIO";
  const usaEntregaManual = modalidadeEntrega === "ENTREGA_MANUAL";
  const freteConfig =
    usaFretePublico || usaEntregaManual
      ? await buscarConfiguracaoFrete()
      : null;
  const origemDespachoSnapshot = usaEntregaManual
    ? montarOrigemDespachoSnapshot(freteConfig)
    : null;

  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
        documento: true,
      },
    });

    if (!cliente) {
      throw new Error("Cliente não encontrado.");
    }

    const codigo = await gerarProximoCodigoPedido(tx);
    let subtotal = 0;

    const itensProcessados = [];

    for (const item of itens) {
      const quantidade = Number(item.quantidade || 0);

      if (!item.id || !Number.isFinite(quantidade) || quantidade <= 0) {
        throw new Error("Existe um item inválido na venda.");
      }

      const produto = await tx.produto.findUnique({
        where: { id: item.id },
        include: {
          imagens: {
            orderBy: {
              ordem: "asc",
            },
            select: {
              imagemUrl: true,
            },
            take: 1,
          },
          estoque: {
            select: {
              tamanhoAnel: true,
              quantidadeAtual: true,
            },
            orderBy: {
              tamanhoAnel: "asc",
            },
          },
          componentesDoKit: {
            select: {
              quantidade: true,
              componenteProduto: {
                select: {
                  id: true,
                  codigoInterno: true,
                  nome: true,
                  estoque: {
                    select: {
                      tamanhoAnel: true,
                      quantidadeAtual: true,
                    },
                    orderBy: {
                      tamanhoAnel: "asc",
                    },
                  },
                },
              },
            },
            orderBy: {
              criadoEm: "asc",
            },
          },
        },
      });

      if (!produto || !produto.ativo || produto.status === "NA_LIXEIRA") {
        throw new Error("Um dos produtos selecionados está indisponível.");
      }

      const estoque = calcularEstoqueProdutoVenda({
        tipoProduto: produto.tipoProduto,
        estoque: produto.estoque,
        componentesDoKit: produto.componentesDoKit,
      });

      if (quantidade > estoque.estoqueAtual) {
        throw new Error(
          `Saldo insuficiente para ${produto.nome}. Saldo atual: ${estoque.estoqueAtual}.`,
        );
      }

      const exigeTamanho =
        produto.tipoProduto !== "KIT" &&
        produtoExigeTamanhoAnel(produto.categoria);
      const tamanhoAnel = exigeTamanho
        ? normalizarTamanhoAnel(item.tamanhoAnel)
        : null;

      if (exigeTamanho && !tamanhoAnel) {
        throw new Error(`Informe o tamanho do anel para ${produto.nome}.`);
      }

      if (exigeTamanho) {
        const estoqueTamanho =
          estoque.estoquesPorTamanho.find(
            (estoqueItem) =>
              normalizarTamanhoAnel(estoqueItem.tamanhoAnel) === tamanhoAnel,
          )?.quantidadeAtual ?? 0;

        if (quantidade > estoqueTamanho) {
          throw new Error(
            `Saldo insuficiente para ${produto.nome} tamanho ${tamanhoAnel}. Saldo atual: ${estoqueTamanho}.`,
          );
        }
      }

      const precoOriginal = Number(produto.precoVenda);
      const precoUnitario =
        precoOriginal * (1 - Number(descontoPercentual || 0) / 100);

      if (precoUnitario <= 0) {
        throw new Error("O total do pedido é inválido para pagamento.");
      }

      const total = precoUnitario * quantidade;
      subtotal += total;

      itensProcessados.push({
        produto,
        quantidade,
        tamanhoAnel,
        precoOriginal,
        precoUnitario,
        total,
      });
    }

    if (subtotal <= 0) {
      throw new Error("O total do pedido é inválido para pagamento.");
    }

    let valorFrete = 0;
    let envioData: {
      tipoEntrega: string;
      transportadora: string | null;
      servico: string | null;
      statusEnvio: string;
      cepOrigem: string | null;
      cepDestino: string | null;
      valorFrete: number;
      prazoDias: number | null;
      gatewayLogistico: string | null;
      gatewayEnvioId: string | null;
      observacoes: string;
    } | null = null;
    let enderecoPedido: {
      cep?: string | null;
      rua?: string | null;
      numero?: string | null;
      complemento?: string | null;
      bairro?: string | null;
      cidade?: string | null;
      estado?: string | null;
    } = {};

    let entregaManualData:
      | ReturnType<typeof montarEntregaManual>
      | null = null;

    if (usarEnvio && envio && modalidadeEntrega === "RETIRADA_COMBINADA") {
      entregaManualData = montarEntregaManual(
        modalidadeEntrega,
        envio,
        origemDespachoSnapshot,
      );
      valorFrete = 0;
      enderecoPedido = {
        cep: normalizarCep(envio.cep) || null,
        rua: texto(envio.rua) || null,
        numero: texto(envio.numero) || null,
        complemento: texto(envio.complemento) || null,
        bairro: texto(envio.bairro) || null,
        cidade: texto(envio.cidade) || null,
        estado: normalizarUf(envio.estado) || null,
      };

      envioData = {
        tipoEntrega: "RETIRADA",
        transportadora: "Stella Colari",
        servico: labelModalidadeEntrega(modalidadeEntrega),
        statusEnvio: "AGUARDANDO_RETIRADA",
        cepOrigem: null,
        cepDestino: normalizarCep(envio.cep) || null,
        valorFrete,
        prazoDias: null,
        gatewayLogistico: "ENTREGA_MANUAL",
        gatewayEnvioId: modalidadeEntrega,
        observacoes: JSON.stringify({
          provider: "ENTREGA_MANUAL",
          entregaManual: entregaManualData,
        }),
      };
    }

    if (
      usarEnvio &&
      envio &&
      modalidadeEntrega === "ENTREGA_MANUAL"
    ) {
      if (!origemDespachoCompleta(origemDespachoSnapshot)) {
        throw new Error(
          "Complete o endereço de despacho nas configurações de frete para calcular a entrega manual.",
        );
      }

      enderecoPedido = validarEnderecoEntregaManual(envio);
      entregaManualData = montarEntregaManual(
        modalidadeEntrega,
        envio,
        origemDespachoSnapshot,
      );
      valorFrete = entregaManualData.valorFinal;

      envioData = {
        tipoEntrega: "ENTREGA",
        transportadora: "Stella Colari",
        servico: labelModalidadeEntrega(modalidadeEntrega),
        statusEnvio: "PENDENTE",
        cepOrigem: origemDespachoSnapshot?.cep || null,
        cepDestino: enderecoPedido.cep || null,
        valorFrete,
        prazoDias: null,
        gatewayLogistico: "ENTREGA_MANUAL",
        gatewayEnvioId: modalidadeEntrega,
        observacoes: JSON.stringify({
          provider: "ENTREGA_MANUAL",
          entregaManual: entregaManualData,
        }),
      };
    }

    if (usarEnvio && envio && freteConfig && modalidadeEntrega === "MELHOR_ENVIO") {
      const cepDestino = normalizarCep(envio.cep);
      const freteOpcaoId = texto(envio.freteOpcaoId);

      if (cepDestino.length !== 8) {
        throw new Error("Informe um CEP válido para calcular o frete.");
      }

      if (!freteOpcaoId) {
        throw new Error("Selecione uma opção de frete.");
      }

      const produtosFrete: FreteProdutoPayload[] = itensProcessados.map(
        (item) => ({
          id: item.produto.id,
          nome: item.produto.nome,
          quantidade: item.quantidade,
          valorUnitario: Number(item.precoUnitario || 0),
        }),
      );

      const opcoesFrete: FreteOpcao[] = [];

      if (freteConfig.retiradaLocalHabilitada) {
        opcoesFrete.push(
          montarOpcaoRetiradaLocal(freteConfig.retiradaLocalTexto),
        );
      }

      if (freteConfig.provedor === "MANUAL") {
        opcoesFrete.push(
          montarOpcaoManual(
            freteConfig.valorAdicional,
            freteConfig.prazoAdicionalDias,
          ),
        );
      }

      if (freteConfig.provedor === "MELHOR_ENVIO") {
        if (!freteConfig.melhorEnvioTokenConfigurado) {
          throw new Error(
            "Token do Melhor Envio não configurado. Configure MELHOR_ENVIO_TOKEN no ambiente.",
          );
        }

        if (freteConfig.cepOrigem.length !== 8) {
          throw new Error(
            "CEP de origem do frete não configurado. Ajuste em Configurações > Frete e entrega.",
          );
        }

        const opcoesMelhorEnvio = await cotarFreteMelhorEnvio(
          {
            cepDestino,
            produtos: produtosFrete,
          },
          freteConfig,
        );

        opcoesFrete.push(...opcoesMelhorEnvio);
      }

      const freteSelecionado = selecionarOpcaoFrete(opcoesFrete, freteOpcaoId);

      if (!freteSelecionado) {
        throw new Error(
          "A opção de frete selecionada não está mais disponível. Recalcule o frete.",
        );
      }

      valorFrete = Number(freteSelecionado.valor || 0);
      const providerFrete = freteSelecionado.provider || freteConfig.provedor;
      const tipoEntrega = freteSelecionado.tipoEntrega || "ENTREGA";
      const cepOrigem =
        providerFrete === "MELHOR_ENVIO"
          ? getCepOrigemMelhorEnvio(freteConfig)
          : freteConfig.cepOrigem;

      if (tipoEntrega === "ENTREGA") {
        enderecoPedido = validarEnderecoEntrega({ envio, cliente });
      } else {
        enderecoPedido = {
          cep: cepDestino,
          rua: texto(envio.rua) || null,
          numero: texto(envio.numero) || null,
          complemento: texto(envio.complemento) || null,
          bairro: texto(envio.bairro) || null,
          cidade: texto(envio.cidade) || null,
          estado: normalizarUf(envio.estado) || null,
        };
      }

      envioData = {
        tipoEntrega,
        transportadora: freteSelecionado.transportadora || null,
        servico: freteSelecionado.nome || null,
        statusEnvio: "PENDENTE",
        cepOrigem: cepOrigem || null,
        cepDestino,
        valorFrete,
        prazoDias: freteSelecionado.prazoDias,
        gatewayLogistico: providerFrete,
        gatewayEnvioId: freteSelecionado.servicoId,
        observacoes: JSON.stringify({
          provider: providerFrete,
          cotacao: freteSelecionado,
        }),
      };
    }

    const totalPedido = subtotal + valorFrete;
    const dadosOriginaisJson = toPrismaJson({
      origem: "ADMIN_MANUAL",
      meioVenda,
      descontoPercentual,
      ...(envioData
        ? {
            frete: {
              provider: envioData.gatewayLogistico,
              cepOrigem: envioData.cepOrigem,
              cepDestino: envioData.cepDestino,
              opcao: envioData,
              ...(entregaManualData
                ? {
                    entregaManual: entregaManualData,
                  }
                : {}),
            },
            ...(entregaManualData
              ? {
                  entregaManual: entregaManualData,
                }
              : {}),
          }
        : {}),
    });

    return tx.pedidoOnline.create({
      data: {
        codigo,
        clienteId: cliente.id,
        nomeCliente: cliente.nome,
        telefoneCliente: cliente.telefone || "",
        emailCliente: cliente.email,
        documento: cliente.documento,
        cep: enderecoPedido.cep || null,
        rua: enderecoPedido.rua || null,
        numero: enderecoPedido.numero || null,
        complemento: enderecoPedido.complemento || null,
        bairro: enderecoPedido.bairro || null,
        cidade: enderecoPedido.cidade || null,
        estado: enderecoPedido.estado || null,
        subtotal,
        frete: valorFrete,
        total: totalPedido,
        valorPago: 0,
        status: "AGUARDANDO_PAGAMENTO",
        statusPagamento: "AGUARDANDO_PAGAMENTO",
        origemCanal: "ADMIN_MANUAL",
        observacoes: texto(observacoes) || null,
        dadosOriginaisJson,
        statusHistorico: {
          create: {
            statusAnterior: null,
            statusNovo: "AGUARDANDO_PAGAMENTO",
            tipoEvento: "CRIACAO",
            origem: "ADMIN_MANUAL",
            usuarioNome: "Sistema",
            observacao: envioData
              ? "Pedido manual com entrega criado pelo admin."
              : "Link de pagamento manual gerado pelo admin.",
          },
        },
        ...(envioData
          ? {
              envio: {
                create: envioData,
              },
            }
          : {}),
        itens: {
          create: itensProcessados.map((item) => ({
            produtoId: item.produto.id,
            codigoInterno: item.produto.codigoInterno,
            nomeProduto: item.produto.nome,
            imagemUrl:
              item.produto.imagens[0]?.imagemUrl ??
              item.produto.imagemUrl ??
              null,
            categoria: item.produto.categoria,
            tamanhoAnel: item.tamanhoAnel,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            precoOriginal: item.precoOriginal,
            descontoPercentual,
            total: item.total,
          })),
        },
      },
      select: {
        id: true,
        codigo: true,
        subtotal: true,
        frete: true,
        total: true,
        nomeCliente: true,
        emailCliente: true,
      },
    });
  });
}
