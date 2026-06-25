import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const FINALIDADES_CONSENTIMENTO_CLIENTE = [
  "RELACIONAMENTO",
  "MARKETING",
  "POS_VENDA",
  "ATENDIMENTO",
] as const;

export const CANAIS_CONSENTIMENTO_CLIENTE = [
  "WHATSAPP",
  "EMAIL",
  "SMS",
  "TELEFONE",
  "INSTAGRAM",
] as const;

export const STATUS_CONSENTIMENTO_CLIENTE = [
  "AUTORIZADO",
  "REVOGADO",
] as const;

export type FinalidadeConsentimentoCliente =
  (typeof FINALIDADES_CONSENTIMENTO_CLIENTE)[number];
export type CanalConsentimentoCliente =
  (typeof CANAIS_CONSENTIMENTO_CLIENTE)[number];
export type StatusConsentimentoCliente =
  (typeof STATUS_CONSENTIMENTO_CLIENTE)[number];

export type EstadoResumoConsentimentoCliente =
  | "AUTORIZADO"
  | "REVOGADO"
  | "NAO_REGISTRADO";

export type ConsentimentoClienteItem = {
  id: string;
  finalidade: FinalidadeConsentimentoCliente;
  canal: CanalConsentimentoCliente;
  status: StatusConsentimentoCliente;
  origem: string;
  versaoPolitica: string | null;
  registradoPorAdminId: string | null;
  registradoPorAdminNome: string | null;
  consentidoEm: string | null;
  revogadoEm: string | null;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ConsentimentoClienteResumoCanal = {
  canal: CanalConsentimentoCliente;
  finalidade: FinalidadeConsentimentoCliente;
  status: EstadoResumoConsentimentoCliente;
  podeContatoManual: boolean;
  ultimaAtualizacaoEm: string | null;
  origem: string | null;
  registradoPorAdminNome: string | null;
  observacao: string | null;
};

export type ConsentimentoClienteResumo = {
  statusGeral: EstadoResumoConsentimentoCliente;
  label: string;
  detalhe: string;
  canaisAutorizados: ConsentimentoClienteResumoCanal[];
  canaisRevogados: ConsentimentoClienteResumoCanal[];
  canaisSemRegistro: ConsentimentoClienteResumoCanal[];
  ultimaAtualizacaoEm: string | null;
  origem: string | null;
  historico: ConsentimentoClienteItem[];
};

export type OrigemConsentimentoWhatsappPublico =
  | "CADASTRO"
  | "CHECKOUT"
  | "MINHA_CONTA";

export type ConsentimentoWhatsappPublicoResumo = {
  status: EstadoResumoConsentimentoCliente;
  label: string;
  detalhe: string;
  ultimaAtualizacaoEm: string | null;
  origem: string | null;
  finalidades: {
    finalidade: Extract<FinalidadeConsentimentoCliente, "MARKETING" | "RELACIONAMENTO">;
    status: EstadoResumoConsentimentoCliente;
    atualizadoEm: string | null;
    origem: string | null;
  }[];
};

type ClienteConsentimentoRaw = Prisma.ClienteConsentimentoGetPayload<{
  select: typeof clienteConsentimentoSelect;
}>;

type AutorRegistroConsentimento = {
  id: string;
  nome: string;
};

export type RegistrarConsentimentoClienteInput = {
  clienteId: string;
  finalidade: string;
  canal: string;
  status?: string;
  origem?: string;
  versaoPolitica?: string | null;
  observacao?: string | null;
  registradoPorAdmin?: AutorRegistroConsentimento | null;
};

export type RevogarConsentimentoClienteInput = {
  clienteId: string;
  finalidade: string;
  canal: string;
  origem?: string;
  observacao?: string | null;
  registradoPorAdmin?: AutorRegistroConsentimento | null;
};

const ORIGEM_MANUAL_PADRAO = "ADMIN_MANUAL";
const CANAL_WHATSAPP_PUBLICO: CanalConsentimentoCliente = "WHATSAPP";
const FINALIDADES_WHATSAPP_PUBLICO = [
  "MARKETING",
  "RELACIONAMENTO",
] as const;
const VERSAO_POLITICA_CLIENTE_ATUAL = "2026-06-privacidade-v1";

const clienteConsentimentoSelect =
  Prisma.validator<Prisma.ClienteConsentimentoSelect>()({
    id: true,
    finalidade: true,
    canal: true,
    status: true,
    origem: true,
    versaoPolitica: true,
    registradoPorAdminId: true,
    registradoPorAdminNome: true,
    consentidoEm: true,
    revogadoEm: true,
    observacao: true,
    criadoEm: true,
    atualizadoEm: true,
  });

function normalizarCodigo(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizarFinalidadeConsentimentoCliente(
  value: string
): FinalidadeConsentimentoCliente | null {
  const normalizado = normalizarCodigo(value);

  return FINALIDADES_CONSENTIMENTO_CLIENTE.includes(
    normalizado as FinalidadeConsentimentoCliente
  )
    ? (normalizado as FinalidadeConsentimentoCliente)
    : null;
}

export function normalizarCanalConsentimentoCliente(
  value: string
): CanalConsentimentoCliente | null {
  const normalizado = normalizarCodigo(value);

  return CANAIS_CONSENTIMENTO_CLIENTE.includes(
    normalizado as CanalConsentimentoCliente
  )
    ? (normalizado as CanalConsentimentoCliente)
    : null;
}

export function normalizarStatusConsentimentoCliente(
  value: string
): StatusConsentimentoCliente | null {
  const normalizado = normalizarCodigo(value);

  return STATUS_CONSENTIMENTO_CLIENTE.includes(
    normalizado as StatusConsentimentoCliente
  )
    ? (normalizado as StatusConsentimentoCliente)
    : null;
}

export function labelCanalConsentimentoCliente(canal: string) {
  if (canal === "WHATSAPP") return "WhatsApp";
  if (canal === "EMAIL") return "E-mail";
  if (canal === "SMS") return "SMS";
  if (canal === "TELEFONE") return "Telefone";
  if (canal === "INSTAGRAM") return "Instagram";

  return canal.replaceAll("_", " ");
}

export function labelFinalidadeConsentimentoCliente(finalidade: string) {
  if (finalidade === "RELACIONAMENTO") return "Relacionamento";
  if (finalidade === "MARKETING") return "Marketing";
  if (finalidade === "POS_VENDA") return "Pos-venda";
  if (finalidade === "ATENDIMENTO") return "Atendimento";

  return finalidade.replaceAll("_", " ");
}

export function labelStatusConsentimentoCliente(status: string) {
  if (status === "AUTORIZADO") return "Autorizado";
  if (status === "REVOGADO") return "Revogado";
  if (status === "NAO_REGISTRADO") return "Sem consentimento";

  return status.replaceAll("_", " ");
}

function serializarConsentimento(
  consentimento: ClienteConsentimentoRaw
): ConsentimentoClienteItem {
  return {
    id: consentimento.id,
    finalidade:
      normalizarFinalidadeConsentimentoCliente(consentimento.finalidade) ||
      "RELACIONAMENTO",
    canal:
      normalizarCanalConsentimentoCliente(consentimento.canal) || "WHATSAPP",
    status:
      normalizarStatusConsentimentoCliente(consentimento.status) ||
      "REVOGADO",
    origem: consentimento.origem,
    versaoPolitica: consentimento.versaoPolitica,
    registradoPorAdminId: consentimento.registradoPorAdminId,
    registradoPorAdminNome: consentimento.registradoPorAdminNome,
    consentidoEm: consentimento.consentidoEm?.toISOString() ?? null,
    revogadoEm: consentimento.revogadoEm?.toISOString() ?? null,
    observacao: consentimento.observacao,
    criadoEm: consentimento.criadoEm.toISOString(),
    atualizadoEm: consentimento.atualizadoEm.toISOString(),
  };
}

function chaveResumo(finalidade: string, canal: string) {
  return `${finalidade}:${canal}`;
}

function ultimoPorFinalidadeCanal(consentimentos: ConsentimentoClienteItem[]) {
  const ultimosPorChave = new Map<string, ConsentimentoClienteItem>();

  [...consentimentos]
    .sort(
      (a, b) =>
        new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    )
    .forEach((consentimento) => {
      const chave = chaveResumo(consentimento.finalidade, consentimento.canal);
      if (!ultimosPorChave.has(chave)) {
        ultimosPorChave.set(chave, consentimento);
      }
    });

  return ultimosPorChave;
}

export function resumirConsentimentosCliente(
  consentimentos: ConsentimentoClienteItem[]
): ConsentimentoClienteResumo {
  const ultimosPorChave = ultimoPorFinalidadeCanal(consentimentos);

  const canaisAutorizados: ConsentimentoClienteResumoCanal[] = [];
  const canaisRevogados: ConsentimentoClienteResumoCanal[] = [];
  const canaisSemRegistro: ConsentimentoClienteResumoCanal[] = [];

  FINALIDADES_CONSENTIMENTO_CLIENTE.forEach((finalidade) => {
    CANAIS_CONSENTIMENTO_CLIENTE.forEach((canal) => {
      const atual = ultimosPorChave.get(chaveResumo(finalidade, canal));
      const status = atual?.status || "NAO_REGISTRADO";
      const item: ConsentimentoClienteResumoCanal = {
        finalidade,
        canal,
        status,
        podeContatoManual: status === "AUTORIZADO",
        ultimaAtualizacaoEm: atual?.criadoEm ?? null,
        origem: atual?.origem ?? null,
        registradoPorAdminNome: atual?.registradoPorAdminNome ?? null,
        observacao: atual?.observacao ?? null,
      };

      if (status === "AUTORIZADO") {
        canaisAutorizados.push(item);
      } else if (status === "REVOGADO") {
        canaisRevogados.push(item);
      } else {
        canaisSemRegistro.push(item);
      }
    });
  });

  const historicoOrdenado = [...consentimentos].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );
  const ultimaAtualizacao = historicoOrdenado[0] || null;
  let statusGeral: EstadoResumoConsentimentoCliente = "NAO_REGISTRADO";

  if (canaisAutorizados.length > 0) {
    statusGeral = "AUTORIZADO";
  } else if (canaisRevogados.length > 0) {
    statusGeral = "REVOGADO";
  }

  return {
    statusGeral,
    label: labelStatusConsentimentoCliente(statusGeral),
    detalhe:
      statusGeral === "AUTORIZADO"
        ? `${canaisAutorizados.length} canal/finalidade autorizado para contato manual.`
        : statusGeral === "REVOGADO"
          ? "Consentimentos registrados foram revogados. Nao sugerir contato ativo."
          : "Nenhum consentimento de relacionamento registrado.",
    canaisAutorizados,
    canaisRevogados,
    canaisSemRegistro,
    ultimaAtualizacaoEm: ultimaAtualizacao?.criadoEm ?? null,
    origem: ultimaAtualizacao?.origem ?? null,
    historico: historicoOrdenado,
  };
}

export function resumirConsentimentoWhatsappPublico(
  consentimentos: ConsentimentoClienteItem[]
): ConsentimentoWhatsappPublicoResumo {
  const ultimosPorChave = ultimoPorFinalidadeCanal(consentimentos);
  const finalidades = FINALIDADES_WHATSAPP_PUBLICO.map((finalidade) => {
    const atual = ultimosPorChave.get(
      chaveResumo(finalidade, CANAL_WHATSAPP_PUBLICO)
    );

    return {
      finalidade,
      status: (atual?.status || "NAO_REGISTRADO") as EstadoResumoConsentimentoCliente,
      atualizadoEm: atual?.criadoEm ?? null,
      origem: atual?.origem ?? null,
    };
  });
  const ultimaAtualizacao = [...finalidades]
    .filter((item) => item.atualizadoEm)
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm || "").getTime() -
        new Date(a.atualizadoEm || "").getTime()
    )[0];
  let status: EstadoResumoConsentimentoCliente = "NAO_REGISTRADO";

  if (finalidades.some((item) => item.status === "AUTORIZADO")) {
    status = "AUTORIZADO";
  } else if (finalidades.some((item) => item.status === "REVOGADO")) {
    status = "REVOGADO";
  }

  return {
    status,
    label: labelStatusConsentimentoCliente(status),
    detalhe:
      status === "AUTORIZADO"
        ? "WhatsApp autorizado para novidades, ofertas e relacionamento."
        : status === "REVOGADO"
          ? "WhatsApp revogado para mensagens de relacionamento e marketing."
          : "WhatsApp ainda sem autorizacao para relacionamento e ofertas.",
    ultimaAtualizacaoEm: ultimaAtualizacao?.atualizadoEm ?? null,
    origem: ultimaAtualizacao?.origem ?? null,
    finalidades,
  };
}

export async function listarConsentimentosCliente(clienteId: string) {
  const consentimentos = await prisma.clienteConsentimento.findMany({
    where: {
      clienteId,
    },
    orderBy: {
      criadoEm: "desc",
    },
    select: clienteConsentimentoSelect,
  });

  return consentimentos.map(serializarConsentimento);
}

export async function obterResumoConsentimentosCliente(clienteId: string) {
  return resumirConsentimentosCliente(
    await listarConsentimentosCliente(clienteId)
  );
}

export async function obterResumoWhatsappPublicoCliente(clienteId: string) {
  return resumirConsentimentoWhatsappPublico(
    await listarConsentimentosCliente(clienteId)
  );
}

export async function podeContatoManualCliente(params: {
  clienteId: string;
  canal: string;
  finalidade: string;
}) {
  const canal = normalizarCanalConsentimentoCliente(params.canal);
  const finalidade = normalizarFinalidadeConsentimentoCliente(
    params.finalidade
  );

  if (!canal || !finalidade) return false;

  const resumo = await obterResumoConsentimentosCliente(params.clienteId);

  return resumo.canaisAutorizados.some(
    (item) => item.canal === canal && item.finalidade === finalidade
  );
}

async function validarClienteExiste(clienteId: string) {
  const cliente = await prisma.cliente.findUnique({
    where: {
      id: clienteId,
    },
    select: {
      id: true,
    },
  });

  if (!cliente) {
    throw new Error("Cliente nao encontrado.");
  }
}

export async function registrarConsentimentoManualCliente(
  input: RegistrarConsentimentoClienteInput
) {
  await validarClienteExiste(input.clienteId);

  const finalidade = normalizarFinalidadeConsentimentoCliente(
    input.finalidade
  );
  const canal = normalizarCanalConsentimentoCliente(input.canal);
  const status = normalizarStatusConsentimentoCliente(
    input.status || "AUTORIZADO"
  );

  if (!finalidade) {
    throw new Error("Finalidade de consentimento invalida.");
  }

  if (!canal) {
    throw new Error("Canal de consentimento invalido.");
  }

  if (!status) {
    throw new Error("Status de consentimento invalido.");
  }

  const agora = new Date();
  const observacao = String(input.observacao || "").trim();
  const versaoPolitica = String(input.versaoPolitica || "").trim();
  const origem = String(input.origem || ORIGEM_MANUAL_PADRAO).trim();

  const consentimento = await prisma.clienteConsentimento.create({
    data: {
      clienteId: input.clienteId,
      finalidade,
      canal,
      status,
      origem: origem || ORIGEM_MANUAL_PADRAO,
      versaoPolitica: versaoPolitica || null,
      registradoPorAdminId: input.registradoPorAdmin?.id || null,
      registradoPorAdminNome: input.registradoPorAdmin?.nome || null,
      consentidoEm: status === "AUTORIZADO" ? agora : null,
      revogadoEm: status === "REVOGADO" ? agora : null,
      observacao: observacao || null,
    },
    select: clienteConsentimentoSelect,
  });

  return serializarConsentimento(consentimento);
}

export async function revogarConsentimentoCliente(
  input: RevogarConsentimentoClienteInput
) {
  return registrarConsentimentoManualCliente({
    clienteId: input.clienteId,
    finalidade: input.finalidade,
    canal: input.canal,
    status: "REVOGADO",
    origem: input.origem || ORIGEM_MANUAL_PADRAO,
    observacao: input.observacao,
    registradoPorAdmin: input.registradoPorAdmin,
  });
}

async function obterUltimosConsentimentosWhatsappPublico(clienteId: string) {
  const consentimentos = await prisma.clienteConsentimento.findMany({
    where: {
      clienteId,
      canal: CANAL_WHATSAPP_PUBLICO,
      finalidade: {
        in: [...FINALIDADES_WHATSAPP_PUBLICO],
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
    select: clienteConsentimentoSelect,
  });

  return ultimoPorFinalidadeCanal(consentimentos.map(serializarConsentimento));
}

export async function registrarConsentimentoWhatsappPublico({
  clienteId,
  origem,
  versaoPolitica = VERSAO_POLITICA_CLIENTE_ATUAL,
  observacao,
}: {
  clienteId?: string | null;
  origem: OrigemConsentimentoWhatsappPublico;
  versaoPolitica?: string | null;
  observacao?: string | null;
}) {
  if (!clienteId) return [];

  await validarClienteExiste(clienteId);

  const ultimos = await obterUltimosConsentimentosWhatsappPublico(clienteId);
  const criados: ConsentimentoClienteItem[] = [];

  for (const finalidade of FINALIDADES_WHATSAPP_PUBLICO) {
    const atual = ultimos.get(chaveResumo(finalidade, CANAL_WHATSAPP_PUBLICO));

    if (atual?.status === "AUTORIZADO") continue;

    criados.push(
      await registrarConsentimentoManualCliente({
        clienteId,
        finalidade,
        canal: CANAL_WHATSAPP_PUBLICO,
        status: "AUTORIZADO",
        origem,
        versaoPolitica,
        observacao:
          observacao ||
          "Cliente autorizou mensagens da Stella Colari pelo WhatsApp.",
      })
    );
  }

  return criados;
}

export async function revogarConsentimentoWhatsappPublico({
  clienteId,
  origem,
  observacao,
}: {
  clienteId?: string | null;
  origem: OrigemConsentimentoWhatsappPublico;
  observacao?: string | null;
}) {
  if (!clienteId) return [];

  await validarClienteExiste(clienteId);

  const ultimos = await obterUltimosConsentimentosWhatsappPublico(clienteId);
  const criados: ConsentimentoClienteItem[] = [];

  for (const finalidade of FINALIDADES_WHATSAPP_PUBLICO) {
    const atual = ultimos.get(chaveResumo(finalidade, CANAL_WHATSAPP_PUBLICO));

    if (atual?.status === "REVOGADO") continue;

    criados.push(
      await registrarConsentimentoManualCliente({
        clienteId,
        finalidade,
        canal: CANAL_WHATSAPP_PUBLICO,
        status: "REVOGADO",
        origem,
        observacao:
          observacao ||
          "Cliente revogou mensagens da Stella Colari pelo WhatsApp.",
      })
    );
  }

  return criados;
}
