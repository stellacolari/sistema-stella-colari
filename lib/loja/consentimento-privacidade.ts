"use client";

export type CategoriaConsentimento =
  | "ESSENCIAL"
  | "ANALYTICS"
  | "PERSONALIZACAO"
  | "MARKETING";

export type PreferenciasConsentimento = Record<CategoriaConsentimento, boolean>;

export type ConsentimentoPrivacidade = {
  versao: string;
  escolhido: boolean;
  atualizadoEm: string | null;
  preferencias: PreferenciasConsentimento;
};

export const CONSENTIMENTO_VERSAO = "2026-06-privacidade-v1";
export const CONSENTIMENTO_STORAGE_KEY = "stella_privacidade_consentimento";
export const CONSENTIMENTO_ABRIR_EVENTO = "stella_privacidade_abrir";
export const CONSENTIMENTO_ATUALIZADO_EVENTO = "stella_privacidade_atualizado";

export const CATEGORIAS_CONSENTIMENTO: {
  id: CategoriaConsentimento;
  titulo: string;
  descricao: string;
  obrigatoria?: boolean;
}[] = [
  {
    id: "ESSENCIAL",
    titulo: "Essenciais",
    descricao: "Mantem carrinho, login, seguranca e funcionamento do checkout.",
    obrigatoria: true,
  },
  {
    id: "ANALYTICS",
    titulo: "Analytics",
    descricao: "Ajuda a entender busca, produto visualizado, carrinho e funil.",
  },
  {
    id: "PERSONALIZACAO",
    titulo: "Personalizacao",
    descricao: "Permite usar sinais como favoritos para melhorar a experiencia.",
  },
  {
    id: "MARKETING",
    titulo: "Marketing",
    descricao: "Reserva preferencias para relacionamento e campanhas futuras.",
  },
];

export const PREFERENCIAS_PADRAO: PreferenciasConsentimento = {
  ESSENCIAL: true,
  ANALYTICS: false,
  PERSONALIZACAO: false,
  MARKETING: false,
};

function consentimentoPadrao(): ConsentimentoPrivacidade {
  return {
    versao: CONSENTIMENTO_VERSAO,
    escolhido: false,
    atualizadoEm: null,
    preferencias: { ...PREFERENCIAS_PADRAO },
  };
}

function normalizarPreferencias(value: unknown): PreferenciasConsentimento {
  const preferencias = { ...PREFERENCIAS_PADRAO };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return preferencias;
  }

  const raw = value as Partial<Record<CategoriaConsentimento, unknown>>;

  preferencias.ANALYTICS = raw.ANALYTICS === true;
  preferencias.PERSONALIZACAO = raw.PERSONALIZACAO === true;
  preferencias.MARKETING = raw.MARKETING === true;

  return preferencias;
}

function emitirAtualizacao() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(CONSENTIMENTO_ATUALIZADO_EVENTO));
}

export function lerConsentimentoPrivacidade(): ConsentimentoPrivacidade {
  if (typeof window === "undefined") {
    return consentimentoPadrao();
  }

  try {
    const raw = window.localStorage.getItem(CONSENTIMENTO_STORAGE_KEY);

    if (!raw) return consentimentoPadrao();

    const parsed = JSON.parse(raw) as Partial<ConsentimentoPrivacidade>;

    if (parsed.versao !== CONSENTIMENTO_VERSAO) {
      return consentimentoPadrao();
    }

    return {
      versao: CONSENTIMENTO_VERSAO,
      escolhido: parsed.escolhido === true,
      atualizadoEm:
        typeof parsed.atualizadoEm === "string" ? parsed.atualizadoEm : null,
      preferencias: normalizarPreferencias(parsed.preferencias),
    };
  } catch {
    return consentimentoPadrao();
  }
}

export function salvarConsentimentoPrivacidade(
  preferencias: Partial<PreferenciasConsentimento>
) {
  if (typeof window === "undefined") return consentimentoPadrao();

  const consentimento: ConsentimentoPrivacidade = {
    versao: CONSENTIMENTO_VERSAO,
    escolhido: true,
    atualizadoEm: new Date().toISOString(),
    preferencias: {
      ...PREFERENCIAS_PADRAO,
      ...preferencias,
      ESSENCIAL: true,
    },
  };

  window.localStorage.setItem(
    CONSENTIMENTO_STORAGE_KEY,
    JSON.stringify(consentimento)
  );
  emitirAtualizacao();

  return consentimento;
}

export function aceitarTodosConsentimentos() {
  return salvarConsentimentoPrivacidade({
    ESSENCIAL: true,
    ANALYTICS: true,
    PERSONALIZACAO: true,
    MARKETING: true,
  });
}

export function aceitarSomenteEssenciais() {
  return salvarConsentimentoPrivacidade(PREFERENCIAS_PADRAO);
}

export function resetarConsentimentoPrivacidade() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(CONSENTIMENTO_STORAGE_KEY);
  emitirAtualizacao();
  abrirPreferenciasPrivacidade();
}

export function categoriaConsentimentoPermitida(
  categoria: CategoriaConsentimento
) {
  if (categoria === "ESSENCIAL") return true;

  const consentimento = lerConsentimentoPrivacidade();

  if (!consentimento.escolhido) return false;

  return consentimento.preferencias[categoria] === true;
}

export function categoriaConsentimentoEvento(
  tipoEvento: string
): CategoriaConsentimento {
  if (
    tipoEvento === "PRODUTO_FAVORITADO" ||
    tipoEvento === "PRODUTO_DESFAVORITADO"
  ) {
    return "PERSONALIZACAO";
  }

  if (tipoEvento.startsWith("MARKETING_") || tipoEvento.startsWith("CRM_")) {
    return "MARKETING";
  }

  return "ANALYTICS";
}

export function abrirPreferenciasPrivacidade() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(CONSENTIMENTO_ABRIR_EVENTO));
}

export function assinarEventoPrivacidade(
  evento: string,
  callback: () => void
) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(evento, callback);

  return () => window.removeEventListener(evento, callback);
}
