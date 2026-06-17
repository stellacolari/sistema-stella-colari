import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM_VALUE = "CRIAR_PERFIS_PADRAO_STELLA";
const ACOES = ["ver", "criar", "editar", "excluir", "executar", "aprovar", "verCustos", "verMargem", "verFinanceiro", "verEstrategico"];
const MODULOS = [
  "dashboard", "pedidos", "vendas", "clientes", "produtos", "estoque", "reposicao", "compras", "financeiro", "resultado",
  "precificacao", "recomendacoes", "campanhas", "intencaoComercial", "lojaOnline", "configuracoes", "notificacoes", "relatorios",
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
}

function permissoesCompletas() {
  return Object.fromEntries(MODULOS.map((modulo) => [modulo, ACOES]));
}

function permissoesDosModulos(modulos, extras = {}) {
  return Object.fromEntries(MODULOS.map((modulo) => [modulo, extras[modulo] || (modulos.includes(modulo) ? ["ver"] : [])]));
}

const PERFIS = [
  { nome: "Admin Geral", codigo: "ADMIN_GERAL", tipoBase: "ADMIN_GERAL", descricao: "Acesso total administrativo e estrategico.", permissoesJson: permissoesCompletas() },
  { nome: "Operacao/Pedidos", codigo: "OPERACAO_PEDIDOS", tipoBase: "OPERACAO", descricao: "Rotina operacional de pedidos e atendimento.", permissoesJson: permissoesDosModulos(["pedidos", "vendas", "clientes", "produtos", "notificacoes"]) },
  { nome: "Vendedor", codigo: "VENDEDOR", tipoBase: "VENDEDOR", descricao: "Atendimento, vendas, clientes, pedidos e consulta de catalogo.", permissoesJson: permissoesDosModulos(["pedidos", "vendas", "clientes", "produtos", "notificacoes"]) },
  { nome: "Marketing/Loja", codigo: "MARKETING_LOJA", tipoBase: "MARKETING", descricao: "Campanhas, loja online e vitrine.", permissoesJson: permissoesDosModulos(["campanhas", "lojaOnline", "notificacoes"], { campanhas: ["ver", "criar", "editar", "executar"], lojaOnline: ["ver", "criar", "editar", "executar"] }) },
  { nome: "Financeiro", codigo: "FINANCEIRO", tipoBase: "FINANCEIRO", descricao: "Compras, financeiro, resultado, precificacao, custos e margens.", permissoesJson: permissoesDosModulos(["compras", "financeiro", "resultado", "precificacao", "notificacoes"], { compras: ["ver", "criar", "editar", "verCustos", "verFinanceiro"], financeiro: ["ver", "criar", "editar", "verFinanceiro"], resultado: ["ver", "verFinanceiro", "verEstrategico"], precificacao: ["ver", "editar", "verCustos", "verMargem"] }) },
  { nome: "Estoque/Reposicao", codigo: "ESTOQUE_REPOSICAO", tipoBase: "ESTOQUE", descricao: "Estoque, reposicao e produtos.", permissoesJson: permissoesDosModulos(["produtos", "estoque", "reposicao", "compras", "notificacoes"], { compras: ["ver", "criar"], reposicao: ["ver", "executar"] }) },
];

const REGRAS = [
  { categoria: "PEDIDO", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "OPERACAO_PEDIDOS", "VENDEDOR"] },
  { categoria: "OPERACIONAL", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "OPERACAO_PEDIDOS", "VENDEDOR"] },
  { categoria: "PEDIDO", tipoNotificacao: "PEDIDO_COM_PROBLEMA", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "OPERACAO_PEDIDOS"] },
  { categoria: "REPOSICAO", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "ESTOQUE_REPOSICAO"] },
  { categoria: "ESTOQUE", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "ESTOQUE_REPOSICAO"] },
  { categoria: "PRECIFICACAO", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "FINANCEIRO"] },
  { categoria: "FINANCEIRO", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "FINANCEIRO"] },
  { categoria: "CAMPANHA", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL", "MARKETING_LOJA"] },
  { categoria: "RECOMENDACAO", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL"] },
  { categoria: "SISTEMA", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL"] },
  { categoria: "MELHORIA", tipoNotificacao: "*", prioridadeMinima: "INFO", perfis: ["ADMIN_GERAL"] },
];

async function main() {
  if (argValue("confirm") !== CONFIRM_VALUE) {
    throw new Error(`Use --confirm=${CONFIRM_VALUE}`);
  }

  const perfis = {};
  for (const perfil of PERFIS) {
    perfis[perfil.codigo] = await prisma.perfilAdministrativo.upsert({
      where: { codigo: perfil.codigo },
      update: { nome: perfil.nome, descricao: perfil.descricao, tipoBase: perfil.tipoBase, permissoesJson: perfil.permissoesJson, ativo: true },
      create: { ...perfil, ativo: true },
    });
  }

  const usuarios = await prisma.usuarioAdmin.findMany({ select: { id: true, perfil: true, perfilAdministrativoId: true } });
  let usuariosMapeados = 0;
  for (const usuario of usuarios) {
    const perfilId = usuario.perfil === "VENDEDOR" ? perfis.VENDEDOR.id : perfis.ADMIN_GERAL.id;
    if (usuario.perfilAdministrativoId !== perfilId) {
      await prisma.usuarioAdmin.update({ where: { id: usuario.id }, data: { perfilAdministrativoId: perfilId } });
      usuariosMapeados += 1;
    }
  }

  let regrasCriadas = 0;
  for (const regra of REGRAS) {
    for (const codigoPerfil of regra.perfis) {
      const perfil = perfis[codigoPerfil];
      const existente = await prisma.regraNotificacaoPerfil.findFirst({
        where: { tipoNotificacao: regra.tipoNotificacao, categoria: regra.categoria, perfilId: perfil.id },
      });
      if (!existente) {
        await prisma.regraNotificacaoPerfil.create({
          data: {
            tipoNotificacao: regra.tipoNotificacao,
            categoria: regra.categoria,
            prioridadeMinima: regra.prioridadeMinima,
            perfilId: perfil.id,
            canalInApp: true,
          },
        });
        regrasCriadas += 1;
      }
    }
  }

  const result = { ok: true, perfis: Object.keys(perfis).length, usuariosMapeados, regrasCriadas };
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else console.log(result);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
