import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CLIENTE_COOKIE_LEGADO,
  CLIENTE_SESSAO_COOKIE,
  criarClienteSessaoToken,
  hashClienteSessaoToken,
  validarClienteSessaoToken,
} from "../lib/loja/cliente-sessao.ts";

const clienteIdSintetico = "cliente-a-id-nao-pode-ser-cookie";
const credenciais = Array.from({ length: 32 }, () =>
  criarClienteSessaoToken(),
);

assert.equal(CLIENTE_COOKIE_LEGADO, "stella_cliente_id");
assert.equal(CLIENTE_SESSAO_COOKIE, "stella_cliente_session");
assert.equal(
  new Set(credenciais.map((credencial) => credencial.token)).size,
  credenciais.length,
);

for (const credencial of credenciais) {
  assert.match(credencial.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(credencial.hash, /^[a-f0-9]{64}$/);
  assert.notEqual(credencial.token, clienteIdSintetico);
  assert.equal(credencial.hash.includes(credencial.token), false);
  assert.equal(
    validarClienteSessaoToken(credencial.token, credencial.hash),
    true,
  );
  assert.equal(
    validarClienteSessaoToken(`${credencial.token.slice(0, -1)}A`, credencial.hash),
    credencial.token.endsWith("A"),
  );
}

assert.equal(validarClienteSessaoToken("", null), false);
assert.equal(validarClienteSessaoToken("token-curto", credenciais[0].hash), false);
assert.equal(
  hashClienteSessaoToken(credenciais[0].token),
  credenciais[0].hash,
);

const arquivos = {
  schema: await readFile("prisma/schema.prisma", "utf8"),
  servidor: await readFile("lib/loja/cliente-sessao.server.ts", "utf8"),
  middleware: await readFile("middleware.ts", "utf8"),
  login: await readFile("app/api/loja/auth/entrar/route.ts", "utf8"),
  cadastro: await readFile("app/api/loja/auth/cadastrar/route.ts", "utf8"),
  logout: await readFile("app/api/loja/auth/sair/route.ts", "utf8"),
  me: await readFile("app/api/loja/auth/me/route.ts", "utf8"),
  conta: await readFile("app/loja/minha-conta/page.tsx", "utf8"),
  contaDados: await readFile(
    "app/api/loja/minha-conta/dados/route.ts",
    "utf8",
  ),
  consentimentos: await readFile(
    "app/api/loja/minha-conta/consentimentos/route.ts",
    "utf8",
  ),
  checkout: await readFile("app/api/loja/checkout/route.ts", "utf8"),
  stripe: await readFile(
    "app/api/loja/stripe/criar-checkout/route.ts",
    "utf8",
  ),
  gatePedido: await readFile(
    "app/api/loja/pedido/acesso/route.ts",
    "utf8",
  ),
  reemissao: await readFile(
    "app/api/pedidos/[id]/reemitir-acesso/route.ts",
    "utf8",
  ),
};

assert.match(arquivos.schema, /model ClienteSessao/);
assert.match(arquivos.schema, /tokenHash\s+String\s+@unique/);
assert.match(arquivos.schema, /onDelete: Cascade/);
assert.doesNotMatch(arquivos.schema, /ClienteSessao[\s\S]*tokenBruto/);

assert.match(arquivos.servidor, /revogadoEm/);
assert.match(arquivos.servidor, /expiraEm > agora/);
assert.match(arquivos.servidor, /validarClienteSessaoToken/);
assert.match(arquivos.servidor, /status !== "NA_LIXEIRA"/);

assert.match(arquivos.middleware, /clienteSessaoToken/);
assert.match(arquivos.middleware, /removerCookieClienteLegado/);
assert.doesNotMatch(arquivos.middleware, /clienteCookieId/);

assert.match(arquivos.login, /criarSessaoCliente/);
assert.match(arquivos.login, /revogarSessaoClienteAtual/);
assert.match(arquivos.login, /definirCookieSessaoCliente/);
assert.match(arquivos.cadastro, /criarSessaoCliente/);
assert.match(arquivos.cadastro, /definirCookieSessaoCliente/);
assert.match(arquivos.logout, /revogarSessaoClienteAtual/);
assert.match(arquivos.logout, /limparCookiesSessaoCliente/);

for (const fonte of [
  arquivos.me,
  arquivos.conta,
  arquivos.contaDados,
  arquivos.consentimentos,
  arquivos.checkout,
  arquivos.stripe,
]) {
  assert.doesNotMatch(fonte, /stella_cliente_id/);
  assert.match(fonte, /obterClienteAutenticadoId/);
}

assert.match(arquivos.gatePedido, /resolverSessaoClienteToken/);
assert.doesNotMatch(arquivos.gatePedido, /clienteCookieId/);

assert.match(
  arquivos.reemissao,
  /exigirPermissaoExecutarAcaoSensivelPedidoAdmin/,
);
assert.match(
  arquivos.reemissao,
  /REEMITIR_ACESSO_PEDIDOS_LEGADOS/,
);
assert.match(arquivos.reemissao, /Cache-Control/);
assert.doesNotMatch(arquivos.reemissao, /console\.log/);

console.log(
  "Sessao opaca, bloqueio do cookie legado e reemissao controlada validados.",
);
