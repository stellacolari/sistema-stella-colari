import type { Prisma } from "@prisma/client";

export const ACOES_PERMISSAO = [
  "ver",
  "criar",
  "editar",
  "excluir",
  "executar",
  "aprovar",
  "verCustos",
  "verMargem",
  "verFinanceiro",
  "verEstrategico",
] as const;

export const MODULOS_PERMISSAO = [
  { codigo: "dashboard", nome: "Dashboard", rotas: ["/dashboard"] },
  { codigo: "pedidos", nome: "Pedidos", rotas: ["/pedidos"] },
  { codigo: "vendas", nome: "Vendas", rotas: ["/vendas"] },
  { codigo: "clientes", nome: "Clientes", rotas: ["/clientes"] },
  { codigo: "produtos", nome: "Produtos", rotas: ["/produtos"] },
  { codigo: "estoque", nome: "Estoque", rotas: ["/estoque", "/movimentacoes"] },
  { codigo: "reposicao", nome: "Reposicao", rotas: ["/compras/reposicao"] },
  { codigo: "compras", nome: "Compras", rotas: ["/compras", "/compras/estoque", "/compras/gastos", "/compras/nova", "/compras/nova-v2"] },
  { codigo: "financeiro", nome: "Financeiro", rotas: ["/compras/financeiro"] },
  { codigo: "resultado", nome: "Resultado", rotas: ["/compras/resultado"] },
  { codigo: "precificacao", nome: "Precificacao", rotas: ["/compras/precificacao"] },
  { codigo: "recomendacoes", nome: "Recomendacoes", rotas: ["/compras/recomendacoes"] },
  { codigo: "campanhas", nome: "Campanhas", rotas: ["/compras/campanhas"] },
  { codigo: "intencaoComercial", nome: "Intencao Comercial", rotas: ["/compras/intencao"] },
  { codigo: "lojaOnline", nome: "Loja Online", rotas: ["/configuracoes/loja"] },
  { codigo: "configuracoes", nome: "Configuracoes", rotas: ["/configuracoes", "/lixeira"] },
  { codigo: "notificacoes", nome: "Notificacoes", rotas: ["/notificacoes"] },
  { codigo: "relatorios", nome: "Relatorios", rotas: ["/relatorios", "/resumos"] },
] as const;

export type CodigoModuloPermissao = (typeof MODULOS_PERMISSAO)[number]["codigo"];
export type AcaoPermissao = (typeof ACOES_PERMISSAO)[number];
export type PermissoesPerfil = Record<string, string[]>;

const TODAS_ACOES = [...ACOES_PERMISSAO];
const VER = ["ver"];

function permissoesCompletas(): PermissoesPerfil {
  return Object.fromEntries(MODULOS_PERMISSAO.map((modulo) => [modulo.codigo, TODAS_ACOES]));
}

function permissoesDosModulos(modulos: string[], extras: Partial<PermissoesPerfil> = {}): PermissoesPerfil {
  return Object.fromEntries(
    MODULOS_PERMISSAO.map((modulo) => [
      modulo.codigo,
      extras[modulo.codigo] || (modulos.includes(modulo.codigo) ? VER : []),
    ]),
  );
}

export const PERFIS_PADRAO = [
  {
    nome: "Admin Geral",
    codigo: "ADMIN_GERAL",
    descricao: "Acesso total administrativo e estrategico.",
    tipoBase: "ADMIN_GERAL",
    permissoesJson: permissoesCompletas(),
  },
  {
    nome: "Operacao/Pedidos",
    codigo: "OPERACAO_PEDIDOS",
    descricao: "Rotina operacional de pedidos, clientes e caixa de entrada.",
    tipoBase: "OPERACAO",
    permissoesJson: permissoesDosModulos(["pedidos", "vendas", "clientes", "produtos", "notificacoes"]),
  },
  {
    nome: "Vendedor",
    codigo: "VENDEDOR",
    descricao: "Atendimento, vendas, clientes, pedidos e consulta de catalogo.",
    tipoBase: "VENDEDOR",
    permissoesJson: permissoesDosModulos(["pedidos", "vendas", "clientes", "produtos", "notificacoes"]),
  },
  {
    nome: "Marketing/Loja",
    codigo: "MARKETING_LOJA",
    descricao: "Campanhas, loja online e configuracoes comerciais da vitrine.",
    tipoBase: "MARKETING",
    permissoesJson: permissoesDosModulos(["campanhas", "lojaOnline", "notificacoes"], {
      campanhas: ["ver", "criar", "editar", "executar"],
      lojaOnline: ["ver", "criar", "editar", "executar"],
    }),
  },
  {
    nome: "Financeiro",
    codigo: "FINANCEIRO",
    descricao: "Compras, financeiro, resultado, precificacao, custos e margens.",
    tipoBase: "FINANCEIRO",
    permissoesJson: permissoesDosModulos(["compras", "financeiro", "resultado", "precificacao", "notificacoes"], {
      compras: ["ver", "criar", "editar", "verCustos", "verFinanceiro"],
      financeiro: ["ver", "criar", "editar", "verFinanceiro"],
      resultado: ["ver", "verFinanceiro", "verEstrategico"],
      precificacao: ["ver", "editar", "verCustos", "verMargem"],
    }),
  },
  {
    nome: "Estoque/Reposicao",
    codigo: "ESTOQUE_REPOSICAO",
    descricao: "Estoque, reposicao e produtos sem areas financeiras sensiveis.",
    tipoBase: "ESTOQUE",
    permissoesJson: permissoesDosModulos(["produtos", "estoque", "reposicao", "compras", "notificacoes"], {
      compras: ["ver", "criar"],
      reposicao: ["ver", "executar"],
    }),
  },
] as const;

export function mapearPerfilLegado(perfil?: string | null) {
  return perfil === "VENDEDOR" ? "VENDEDOR" : "ADMIN_GERAL";
}

export function normalizarPermissoes(value: Prisma.JsonValue | PermissoesPerfil | null | undefined, perfilLegado = "ACESSO_GERAL") {
  const fallback = PERFIS_PADRAO.find((perfil) => perfil.codigo === mapearPerfilLegado(perfilLegado))?.permissoesJson || permissoesCompletas();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  return Object.fromEntries(
    MODULOS_PERMISSAO.map((modulo) => {
      const raw = (value as Record<string, unknown>)[modulo.codigo];
      return [modulo.codigo, Array.isArray(raw) ? raw.filter((acao): acao is string => typeof acao === "string") : []];
    }),
  );
}

export function obterPermissoesUsuario(usuario: {
  perfil: string;
  perfilAdministrativo?: { ativo: boolean; permissoesJson: Prisma.JsonValue } | null;
}) {
  if (usuario.perfilAdministrativo?.ativo) {
    return normalizarPermissoes(usuario.perfilAdministrativo.permissoesJson, usuario.perfil);
  }

  return normalizarPermissoes(null, usuario.perfil);
}

export function usuarioTemPermissao(
  usuario: { perfil: string; perfilAdministrativo?: { ativo: boolean; permissoesJson: Prisma.JsonValue } | null },
  modulo: string,
  acao: string,
) {
  if (usuario.perfil === "ACESSO_GERAL" && !usuario.perfilAdministrativo) return true;
  return obterPermissoesUsuario(usuario)[modulo]?.includes(acao) || false;
}

export function perfilPodeAcessarRota(permissoes: PermissoesPerfil, rota: string) {
  const modulo = MODULOS_PERMISSAO.find((item) =>
    item.rotas.some((prefixo) => rota === prefixo || rota.startsWith(`${prefixo}/`)),
  );

  if (!modulo) return true;
  return permissoes[modulo.codigo]?.includes("ver") || false;
}

export function filtrarItensMenuPorPermissao<T extends { href: string; modulo?: string; links?: T[] }>(
  itens: T[],
  permissoes: PermissoesPerfil,
): T[] {
  return itens
    .map((item) => {
      const links: T[] | undefined = item.links ? filtrarItensMenuPorPermissao(item.links, permissoes) : undefined;
      return { ...item, ...(links ? { links } : {}) } as T;
    })
    .filter((item) => {
      const podeVerModulo = item.modulo ? permissoes[item.modulo]?.includes("ver") : perfilPodeAcessarRota(permissoes, item.href);
      return podeVerModulo || Boolean(item.links?.length);
    });
}

export function prioridadeAtendeMinima(prioridade: string, minima: string) {
  const pesos: Record<string, number> = { INFO: 0, BAIXA: 1, MEDIA: 2, ALTA: 3, CRITICA: 4 };
  return (pesos[prioridade] ?? 0) >= (pesos[minima] ?? 0);
}
