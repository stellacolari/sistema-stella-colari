import {
  getStellaHomeBlockKey,
  type StellaHomeBlockKey,
} from "@/lib/loja/stella-home-contract";

type BlocoBuilderPublicoInput = {
  id: string;
  tipo: string;
  titulo: string | null;
  ordem: number;
  ativo?: boolean;
  configJson: unknown;
};

export type BlocoBuilderPublico = {
  id: string;
  tipo: string;
  titulo: string | null;
  ordem: number;
  ativo?: boolean;
  configJson: Record<string, unknown>;
  stellaHomeKey: StellaHomeBlockKey | null;
};

const CHAVES_OPERACIONAIS = new Set([
  "_stellaSetup",
  "fonteResolvida",
  "campanhaId",
  "colecaoId",
  "colecaoSlug",
  "colecaoInteligenteId",
  "colecaoInteligenteSlug",
  "colecaoInteligenteNome",
  "ordenacaoColecao",
  "incluirSugeridos",
  "incluirSugeridosColecao",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizarValorPublico(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizarValorPublico);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !CHAVES_OPERACIONAIS.has(key))
      .map(([key, item]) => [key, sanitizarValorPublico(item)]),
  );
}

function sanitizarFontePublica(value: Record<string, unknown>) {
  const fonte: Record<string, unknown> = {};

  if (typeof value.tipo === "string") {
    fonte.tipo = value.tipo;
  }

  if (Array.isArray(value.produtosIds)) {
    fonte.produtosIds = value.produtosIds
      .map((produtoId) => String(produtoId || "").trim())
      .filter(Boolean);
  }

  const quantidade = Number(value.quantidade);
  if (Number.isFinite(quantidade)) {
    fonte.quantidade = quantidade;
  }

  return fonte;
}

function sanitizarConfigJsonPublico(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }

  const config: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    if (CHAVES_OPERACIONAIS.has(key)) {
      continue;
    }

    config[key] =
      key === "fonte" && isRecord(item)
        ? sanitizarFontePublica(item)
        : sanitizarValorPublico(item);
  }

  return config;
}

export function serializarBlocoBuilderPublico(
  bloco: BlocoBuilderPublicoInput,
): BlocoBuilderPublico {
  const stellaHomeKey = getStellaHomeBlockKey(bloco);

  return {
    id: bloco.id,
    tipo: bloco.tipo,
    titulo: bloco.titulo,
    ordem: bloco.ordem,
    ...(typeof bloco.ativo === "boolean" ? { ativo: bloco.ativo } : {}),
    configJson: sanitizarConfigJsonPublico(bloco.configJson),
    stellaHomeKey,
  };
}

export function serializarBlocosBuilderPublicos(
  blocos: BlocoBuilderPublicoInput[],
): BlocoBuilderPublico[] {
  return blocos.map(serializarBlocoBuilderPublico);
}
