"use client";

import {
  METADATA_KEYS_SENSIVEIS_EVENTO,
  confiabilidadeEvento,
  etapaFunilEvento,
  type EventoComercialTipoPublico,
} from "@/lib/loja/eventos-taxonomia";
import {
  categoriaConsentimentoEvento,
  categoriaConsentimentoPermitida,
} from "@/lib/loja/consentimento-privacidade";

export type EventoComercialTipo = EventoComercialTipoPublico;

type EventoComercialPayload = {
  tipo: EventoComercialTipo;
  produtoId?: string | null;
  categoriaId?: string | null;
  paginaId?: string | null;
  blocoId?: string | null;
  pedidoId?: string | null;
  termoBusca?: string | null;
  origem?: string | null;
  metadata?: Record<string, unknown>;
  dedupeMs?: number;
};

type MetadataSeguro =
  | string
  | number
  | boolean
  | null
  | MetadataSeguro[]
  | { [key: string]: MetadataSeguro };

const SESSION_STORAGE_KEY = "stella_loja_session_id";
const EVENTOS_RECENTES_STORAGE_KEY = "stella_loja_eventos_recentes";
const EVENTOS_RECENTES = new Map<string, number>();

function gerarSessionId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function obterSessionId() {
  if (typeof window === "undefined") return "";

  try {
    const atual = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (atual) return atual;

    const novo = gerarSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, novo);

    return novo;
  } catch {
    return "";
  }
}

function limparString(value: string | null | undefined, max = 160) {
  const clean = String(value || "").trim();

  return clean ? clean.slice(0, max) : undefined;
}

function montarChaveDedupe(evento: EventoComercialPayload) {
  return [
    evento.tipo,
    evento.produtoId || "",
    evento.categoriaId || "",
    evento.paginaId || "",
    evento.blocoId || "",
    evento.termoBusca || "",
    evento.origem || "",
  ].join("|");
}

function lerEventosRecentesPersistidos() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(EVENTOS_RECENTES_STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === "number" && Number.isFinite(value)
      )
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

function salvarEventoRecentePersistido(key: string, timestamp: number) {
  if (typeof window === "undefined") return;

  try {
    const atual = lerEventosRecentesPersistidos();
    const limite = timestamp - 10 * 60_000;
    const entries = Object.entries(atual)
      .filter(([, value]) => value >= limite)
      .slice(-80);

    entries.push([key, timestamp]);

    window.sessionStorage.setItem(
      EVENTOS_RECENTES_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(entries))
    );
  } catch {
    return;
  }
}

function deveIgnorarPorDedupe(evento: EventoComercialPayload) {
  const dedupeMs = evento.dedupeMs ?? 700;

  if (dedupeMs <= 0) return false;

  const now = Date.now();
  const key = montarChaveDedupe(evento);
  const eventosPersistidos = lerEventosRecentesPersistidos();
  const ultimo = Math.max(EVENTOS_RECENTES.get(key) || 0, eventosPersistidos[key] || 0);

  if (now - ultimo < dedupeMs) {
    return true;
  }

  EVENTOS_RECENTES.set(key, now);
  salvarEventoRecentePersistido(key, now);

  if (EVENTOS_RECENTES.size > 120) {
    for (const [eventKey, timestamp] of EVENTOS_RECENTES.entries()) {
      if (now - timestamp > 120_000) {
        EVENTOS_RECENTES.delete(eventKey);
      }
    }
  }

  return false;
}

function sanitizarMetadataCliente(value: unknown, depth = 0): MetadataSeguro | undefined {
  if (depth > 3) return undefined;

  if (value === null) return null;

  if (typeof value === "string") {
    const clean = value.trim();

    return clean ? clean.slice(0, 220) : undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, 12)
      .map((item) => sanitizarMetadataCliente(item, depth + 1))
      .filter((item): item is MetadataSeguro => typeof item !== "undefined");

    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "object" && value) {
    const output: { [key: string]: MetadataSeguro } = {};

    Object.entries(value as Record<string, unknown>)
      .slice(0, 24)
      .forEach(([key, item]) => {
        const cleanKey = key.trim().slice(0, 48);

        if (!cleanKey || METADATA_KEYS_SENSIVEIS_EVENTO.test(cleanKey)) {
          return;
        }

        const cleanValue = sanitizarMetadataCliente(item, depth + 1);

        if (typeof cleanValue !== "undefined") {
          output[cleanKey] = cleanValue;
        }
      });

    return Object.keys(output).length > 0 ? output : undefined;
  }

  return undefined;
}

export function registrarEventoLoja(evento: EventoComercialPayload) {
  if (typeof window === "undefined") return;

  const categoriaConsentimento = categoriaConsentimentoEvento(evento.tipo);

  if (!categoriaConsentimentoPermitida(categoriaConsentimento)) return;
  if (deveIgnorarPorDedupe(evento)) return;

  const metadata = sanitizarMetadataCliente({
    etapa: etapaFunilEvento(evento.tipo),
    confiabilidade: confiabilidadeEvento(evento.tipo),
    consentimento: categoriaConsentimento,
    ...evento.metadata,
  });

  const payload = {
    tipo: evento.tipo,
    produtoId: limparString(evento.produtoId, 80),
    categoriaId: limparString(evento.categoriaId, 80),
    paginaId: limparString(evento.paginaId, 80),
    blocoId: limparString(evento.blocoId, 80),
    pedidoId: limparString(evento.pedidoId, 80),
    termoBusca: limparString(evento.termoBusca, 120),
    origem: limparString(evento.origem, 80),
    sessionId: obterSessionId(),
    metadata,
  };

  void fetch("/api/loja/eventos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export function registrarProdutoVisualizado(
  produtoId: string,
  metadata?: Record<string, unknown>
) {
  registrarEventoLoja({
    tipo: "PRODUTO_VISUALIZADO",
    produtoId,
    origem: "produto",
    metadata,
    dedupeMs: 60_000,
  });
}

export function registrarFavoritoProduto({
  produtoId,
  favorito,
  origem,
  metadata,
}: {
  produtoId: string;
  favorito: boolean;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: favorito ? "PRODUTO_FAVORITADO" : "PRODUTO_DESFAVORITADO",
    produtoId,
    origem: origem || "produto_card",
    metadata,
  });
}

export function registrarEventoCarrinho({
  tipo,
  produtoId,
  origem,
  metadata,
}: {
  tipo: "PRODUTO_ADICIONADO_CARRINHO" | "PRODUTO_REMOVIDO_CARRINHO";
  produtoId: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo,
    produtoId,
    origem: origem || "carrinho",
    metadata,
  });
}

export function registrarBuscaRealizada({
  termoBusca,
  origem,
  metadata,
}: {
  termoBusca: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: "BUSCA_REALIZADA",
    termoBusca,
    origem: origem || "busca",
    metadata,
    dedupeMs: 5_000,
  });
}

export function registrarBuscaSemResultado({
  termoBusca,
  origem,
  metadata,
}: {
  termoBusca: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: "BUSCA_SEM_RESULTADO",
    termoBusca,
    origem: origem || "busca",
    metadata,
    dedupeMs: 10_000,
  });
}

export function registrarCliqueResultadoBusca({
  termoBusca,
  tipoResultado,
  produtoId,
  origem,
  metadata,
}: {
  termoBusca: string;
  tipoResultado: "produto";
  produtoId?: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: "BUSCA_RESULTADO_CLICADO",
    produtoId,
    termoBusca,
    origem: origem || "busca",
    metadata: {
      tipoResultado,
      ...metadata,
    },
  });
}

export function registrarCliqueVitrineEditorial({
  blocoId,
  categoriaId,
  paginaId,
  origem,
  metadata,
}: {
  blocoId?: string;
  categoriaId?: string;
  paginaId?: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: "VITRINE_EDITORIAL_CLICADA",
    blocoId,
    categoriaId,
    paginaId,
    origem: origem || "vitrine_editorial",
    metadata,
  });
}

export function registrarCliqueBannerCta({
  blocoId,
  paginaId,
  origem,
  metadata,
}: {
  blocoId?: string;
  paginaId?: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: "BANNER_CTA_CLICADO",
    blocoId,
    paginaId,
    origem: origem || "banner",
    metadata,
  });
}

export function registrarCheckoutIniciado({
  origem,
  metadata,
}: {
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: "CHECKOUT_INICIADO",
    origem: origem || "checkout",
    metadata: {
      acao: "checkout_iniciado",
      ...metadata,
    },
    dedupeMs: 120_000,
  });
}

export function registrarCategoriaClicada({
  categoriaId,
  origem,
  metadata,
}: {
  categoriaId: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}) {
  registrarEventoLoja({
    tipo: "CATEGORIA_CLICADA",
    categoriaId,
    origem: origem || "menu",
    metadata,
  });
}
