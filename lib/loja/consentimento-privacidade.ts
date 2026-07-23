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

export const CONSENTIMENTO_VERSAO = "2026-07-privacidade-v2";
export const CONSENTIMENTO_STORAGE_KEY = "stella_privacidade_consentimento";
export const CONSENTIMENTO_ABRIR_EVENTO = "stella_privacidade_abrir";
export const CONSENTIMENTO_ATUALIZADO_EVENTO = "stella_privacidade_atualizado";

export const CATEGORIAS_CONSENTIMENTO: {
  id: CategoriaConsentimento;
  titulo: string;
  descricao: string;
  obrigatoria?: boolean;
  disponivel?: boolean;
}[] = [
  {
    id: "ESSENCIAL",
    titulo: "Essenciais",
    descricao: "Mantém carrinho, login, segurança e funcionamento do checkout.",
    obrigatoria: true,
  },
  {
    id: "ANALYTICS",
    titulo: "Analytics",
    descricao: "Ajuda a entender busca, produto visualizado, carrinho e funil.",
  },
  {
    id: "PERSONALIZACAO",
    titulo: "Personalização",
    descricao: "Permite usar sinais como favoritos para melhorar a experiência.",
  },
  {
    id: "MARKETING",
    titulo: "Marketing",
    descricao:
      "Nenhuma tecnologia de marketing está ativa nesta versão da loja.",
    disponivel: false,
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
  preferencias.MARKETING = false;

  return preferencias;
}

function limparArmazenamentosNaoEssenciais(
  preferencias: PreferenciasConsentimento,
) {
  if (typeof window === "undefined") return;

  if (!preferencias.ANALYTICS) {
    window.localStorage.removeItem("stella_loja_session_id");
    window.sessionStorage.removeItem("stella_loja_eventos_recentes");
  }

  if (!preferencias.PERSONALIZACAO) {
    window.localStorage.removeItem("stella-favoritos-produtos");
    window.localStorage.removeItem("stella-buscas-recentes");
  }
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

    if (!raw) {
      limparArmazenamentosNaoEssenciais(PREFERENCIAS_PADRAO);
      return consentimentoPadrao();
    }

    const parsed = JSON.parse(raw) as Partial<ConsentimentoPrivacidade>;

    if (parsed.versao !== CONSENTIMENTO_VERSAO) {
      limparArmazenamentosNaoEssenciais(PREFERENCIAS_PADRAO);
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
    limparArmazenamentosNaoEssenciais(PREFERENCIAS_PADRAO);
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
      MARKETING: false,
    },
  };

  window.localStorage.setItem(
    CONSENTIMENTO_STORAGE_KEY,
    JSON.stringify(consentimento)
  );
  limparArmazenamentosNaoEssenciais(consentimento.preferencias);
  if (!consentimento.preferencias.PERSONALIZACAO) {
    window.dispatchEvent(new Event("stella-favoritos-updated"));
  }
  emitirAtualizacao();

  return consentimento;
}

export function aceitarTodosConsentimentos() {
  return salvarConsentimentoPrivacidade({
    ESSENCIAL: true,
    ANALYTICS: true,
    PERSONALIZACAO: true,
    MARKETING: false,
  });
}

export function aceitarSomenteEssenciais() {
  return salvarConsentimentoPrivacidade(PREFERENCIAS_PADRAO);
}

export function resetarConsentimentoPrivacidade() {
  if (typeof window === "undefined") return;

  limparArmazenamentosNaoEssenciais(PREFERENCIAS_PADRAO);
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
