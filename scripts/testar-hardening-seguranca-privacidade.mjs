import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizarDestinoInterno } from "../lib/security/redirect-interno.ts";
import { normalizarHrefPublico } from "../lib/loja/url-publica.ts";

const ler = (arquivo) => readFile(arquivo, "utf8");

const arquivos = {
  middleware: await ler("middleware.ts"),
  headers: await ler("next.config.ts"),
  sessaoAdmin: await ler("lib/auth/session.ts"),
  redirectInterno: await ler("lib/security/redirect-interno.ts"),
  adminLogin: await ler("app/api/auth/login/route.ts"),
  adminLoginPage: await ler("app/login/page.tsx"),
  clienteLogin: await ler("app/api/loja/auth/entrar/route.ts"),
  cadastro: await ler("app/api/loja/auth/cadastrar/route.ts"),
  checkout: await ler("app/api/loja/checkout/route.ts"),
  stripeCheckout: await ler("app/api/loja/stripe/criar-checkout/route.ts"),
  stripeWebhook: await ler("app/api/loja/stripe/webhook/route.ts"),
  pagamentoAdmin: await ler("app/api/pedidos/[id]/pagamento/route.ts"),
  cashback: await ler("lib/clientes/creditar-cashback-pedido.ts"),
  estoque: await ler("lib/pedidos/efetivar-pedido-online-pago.ts"),
  upload: await ler("app/api/configuracoes/loja/uploads/route.ts"),
  uploadBanners: await ler("app/api/configuracoes/loja/banners/route.ts"),
  uploadMidias: await ler("app/api/configuracoes/loja/midias/upload/route.ts"),
  midia: await ler("lib/loja/midia-assets.ts"),
  jsonLd: await ler("app/loja/produto/[id]/page.tsx"),
  consentimento: await ler("lib/loja/consentimento-privacidade.ts"),
  formularios: await ler("app/api/loja/formularios/route.ts"),
  banner: await ler("components/loja/ConsentimentoPrivacidadeBanner.tsx"),
  favoritos: await ler("components/loja/favoritos.ts"),
  busca: await ler("components/loja/BuscaLojaClient.tsx"),
  politicaCookies: await ler("app/loja/politica-de-cookies/page.tsx"),
  retencaoDryRun: await ler("scripts/auditar-retencao-privacidade.mjs"),
  acoesRegras: await ler("app/regras-categoria/actions.ts"),
  acoesItens: await ler("app/itens-adicionais/actions.ts"),
  acoesCompras: await ler("app/compras/actions.ts"),
  acoesClientes: await ler("app/clientes/actions.ts"),
};

assert.match(arquivos.middleware, /isOrigemMutacaoInvalida/);
assert.match(arquivos.middleware, /LOJA_STRIPE_WEBHOOK_PATH/);
assert.match(arquivos.middleware, /Origem da requisicao nao permitida/);

for (const fonte of [
  arquivos.adminLogin,
  arquivos.clienteLogin,
  arquivos.cadastro,
  arquivos.checkout,
  arquivos.stripeCheckout,
]) {
  assert.match(fonte, /verificarRateLimit/);
  assert.match(fonte, /respostaRateLimit/);
}

assert.ok(
  arquivos.adminLogin.indexOf('scope: "admin-login-credencial"') <
    arquivos.adminLogin.indexOf("prisma.usuarioAdmin.findUnique"),
  "O limite do login administrativo deve rodar antes da consulta da credencial.",
);
assert.ok(
  arquivos.clienteLogin.indexOf('scope: "cliente-login-credencial"') <
    arquivos.clienteLogin.indexOf("prisma.cliente.findFirst"),
  "O limite do login do cliente deve rodar antes da consulta da credencial.",
);
for (const destinoPerigoso of [
  "https://evil.invalid",
  "//evil.invalid",
  "/\\evil.invalid",
  "/\n/evil.invalid",
  "/api/auth/login",
  "/login",
]) {
  assert.equal(normalizarDestinoInterno(destinoPerigoso), "/pedidos");
}
assert.equal(
  normalizarDestinoInterno("/pedidos?filtro=abertos"),
  "/pedidos?filtro=abertos",
);
assert.equal(normalizarHrefPublico("javascript:alert(1)"), "");
assert.equal(normalizarHrefPublico("data:text/html,teste"), "");
assert.equal(normalizarHrefPublico("//evil.invalid"), "");
assert.equal(normalizarHrefPublico("/loja/produto/1"), "/loja/produto/1");
assert.equal(
  normalizarHrefPublico("https://www.stellacolari.com.br/loja"),
  "https://www.stellacolari.com.br/loja",
);
assert.match(arquivos.redirectInterno, /u0000-\\u001f/);
assert.match(arquivos.adminLogin, /normalizarDestinoInterno/);
assert.match(arquivos.adminLoginPage, /normalizarDestinoInterno/);

assert.match(arquivos.headers, /Content-Security-Policy/);
assert.match(arquivos.headers, /Strict-Transport-Security/);
assert.match(arquivos.headers, /X-Content-Type-Options/);
assert.match(arquivos.headers, /frame-ancestors 'none'/);
assert.doesNotMatch(arquivos.headers, /default-src \*/);
assert.match(arquivos.sessaoAdmin, /jti: crypto\.randomUUID\(\)/);

assert.match(arquivos.stripeCheckout, /idempotencyKey/);
assert.match(arquivos.stripeWebhook, /stripe\.webhooks\.constructEvent/);
assert.match(arquivos.stripeWebhook, /validarCorrelacaoSessao/);
assert.match(arquivos.stripeWebhook, /gatewayPedidoId === session\.id/);
assert.match(arquivos.stripeWebhook, /session\.amount_total === totalEsperado/);
assert.match(
  arquivos.stripeWebhook,
  /pedido\.origemCanal !== "ADMIN_MANUAL"/,
);
assert.doesNotMatch(arquivos.stripeWebhook, /console\.log/);

assert.match(arquivos.cashback, /cashbackStatus: "PROCESSANDO"/);
assert.match(arquivos.cashback, /updateMany/);
assert.match(
  arquivos.pagamentoAdmin,
  /creditarCashbackPedidoIdempotente\(id\)/,
);
assert.match(arquivos.estoque, /quantidadeAtual:\s*\{\s*gte: quantidade/);
assert.match(arquivos.estoque, /decrement: quantidade/);

assert.doesNotMatch(arquivos.upload, /image\/svg\+xml/);
assert.match(arquivos.upload, /exigirAcessoMidia\("criar"\)/);
assert.match(arquivos.upload, /inspecionarArquivoImagemMidia/);
assert.match(arquivos.upload, /String\.fromCharCode/);
assert.match(arquivos.uploadBanners, /exigirAcessoMidia\("criar"\)/);
assert.match(arquivos.uploadBanners, /imagem\.mimeReal/);
assert.match(arquivos.uploadMidias, /scope: "admin-upload-midias"/);
assert.match(arquivos.midia, /limitInputPixels/);
assert.match(arquivos.midia, /metadata\.width \* metadata\.height/);

assert.match(arquivos.jsonLd, /serializarJsonLdSeguro/);
assert.match(arquivos.jsonLd, /\\\\u003c/);

assert.match(arquivos.consentimento, /2026-07-privacidade-v2/);
assert.match(arquivos.consentimento, /MARKETING: false/);
assert.match(arquivos.consentimento, /stella_loja_session_id/);
assert.match(arquivos.consentimento, /stella-favoritos-produtos/);
assert.match(arquivos.banner, /Rejeitar não essenciais/);
assert.match(arquivos.banner, /Configurar/);
assert.match(arquivos.banner, /Aceitar todos/);
assert.match(arquivos.favoritos, /categoriaConsentimentoPermitida/);
assert.match(arquivos.busca, /categoriaConsentimentoPermitida/);
assert.match(arquivos.politicaCookies, /Nenhuma tecnologia de publicidade/);
assert.match(arquivos.formularios, /hashUserAgent/);
assert.match(arquivos.formularios, /createHash\("sha256"\)/);
assert.match(arquivos.retencaoDryRun, /modo: "DRY_RUN"/);
assert.doesNotMatch(
  arquivos.retencaoDryRun,
  /\.(delete|deleteMany|update|updateMany|create|createMany|upsert)\(/,
);

for (const fonte of [
  arquivos.acoesRegras,
  arquivos.acoesItens,
  arquivos.acoesCompras,
  arquivos.acoesClientes,
]) {
  assert.match(fonte, /exigirAdminComPermissao/);
}

console.log(
  "Hardening de autorizacao, Stripe, estoque, upload, headers e consentimento validado.",
);
