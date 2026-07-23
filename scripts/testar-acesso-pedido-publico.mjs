import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  clientePodeAcessarPedido,
  criarPedidoAcessoToken,
  criarUrlPedidoComAcesso,
  validarPedidoAcessoToken,
} from "../lib/loja/pedido-acesso.ts";

const emitidos = Array.from({ length: 32 }, () => criarPedidoAcessoToken());

assert.equal(new Set(emitidos.map((item) => item.token)).size, emitidos.length);
for (const emitido of emitidos) {
  assert.equal(emitido.token.length, 43);
  assert.match(emitido.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(emitido.hash, /^[a-f0-9]{64}$/);
  assert.equal(emitido.hash.includes(emitido.token), false);
  assert.equal(validarPedidoAcessoToken(emitido.token, emitido.hash), true);
  const ultimoCaractereAlternativo = emitido.token.endsWith("A") ? "B" : "A";
  assert.equal(
    validarPedidoAcessoToken(
      `${emitido.token.slice(0, -1)}${ultimoCaractereAlternativo}`,
      emitido.hash,
    ),
    false,
  );
}

assert.equal(validarPedidoAcessoToken("", null), false);
assert.equal(validarPedidoAcessoToken("token-curto", emitidos[0].hash), false);
assert.equal(validarPedidoAcessoToken(emitidos[0].token, null), false);
assert.equal(validarPedidoAcessoToken(emitidos[0].token, "hash-invalido"), false);

assert.equal(
  clientePodeAcessarPedido({
    clienteAutenticadoId: "cliente-a",
    pedidoClienteId: "cliente-a",
    clienteAtivo: true,
  }),
  true,
);
assert.equal(
  clientePodeAcessarPedido({
    clienteAutenticadoId: "cliente-a",
    pedidoClienteId: "cliente-b",
    clienteAtivo: true,
  }),
  false,
);
assert.equal(
  clientePodeAcessarPedido({
    clienteAutenticadoId: "cliente-a",
    pedidoClienteId: "cliente-a",
    clienteAtivo: false,
  }),
  false,
);

const url = criarUrlPedidoComAcesso({
  baseUrl: "https://example.com/",
  codigo: "PO000001",
  token: emitidos[0].token,
  pagamento: "sucesso",
});
const parsedUrl = new URL(url);
assert.equal(parsedUrl.pathname, "/loja/pedido/PO000001");
assert.equal(parsedUrl.searchParams.get("access"), emitidos[0].token);
assert.equal(parsedUrl.searchParams.get("pagamento"), "sucesso");

const files = {
  pagina: await readFile("app/loja/pedido/[codigo]/page.tsx", "utf8"),
  acessoServer: await readFile("lib/loja/pedido-acesso.server.ts", "utf8"),
  gate: await readFile("app/api/loja/pedido/acesso/route.ts", "utf8"),
  checkout: await readFile("app/api/loja/checkout/route.ts", "utf8"),
  stripe: await readFile(
    "app/api/loja/stripe/criar-checkout/route.ts",
    "utf8",
  ),
  cliente: await readFile("components/loja/PedidoPublicoClient.tsx", "utf8"),
  middleware: await readFile("middleware.ts", "utf8"),
};

assert.match(files.pagina, /buscarPedidoPublicoAutorizado/);
assert.match(files.pagina, /notFound\(\)/);
assert.doesNotMatch(files.pagina, /nomeCliente:\s*pedidoRaw/);
assert.doesNotMatch(files.pagina, /telefoneCliente:\s*pedidoRaw/);
assert.doesNotMatch(files.pagina, /codigoInterno:\s*item/);
assert.doesNotMatch(files.pagina, /cashback[A-Z]\w*:\s*pedidoRaw/);
assert.match(files.acessoServer, /clientePodeAcessarPedido/);
assert.match(files.acessoServer, /validarPedidoAcessoToken/);
assert.match(files.gate, /respostaGate\(pedido \? 204 : 404\)/);

assert.match(files.checkout, /pedidoAcessoTokenHash:\s*pedidoAcesso\.hash/);
assert.match(files.checkout, /accessToken:\s*pedidoAcesso\.token/);

const authIndex = files.stripe.indexOf("if (!pedido || (!clienteProprietario && !tokenValido))");
const stripeIndex = files.stripe.indexOf("stripe.checkout.sessions.create");
assert.ok(authIndex >= 0 && stripeIndex > authIndex);
assert.match(files.stripe, /respostaCheckoutAutorizado/);
assert.match(files.stripe, /criarUrlPedidoComAcesso/);

assert.doesNotMatch(files.cliente, /codigoInterno/);
assert.doesNotMatch(files.cliente, /nomeCliente/);
assert.doesNotMatch(files.cliente, /cashback/);
assert.match(files.middleware, /private, no-store, max-age=0, must-revalidate/);
assert.match(files.middleware, /noindex, nofollow, noarchive/);
assert.match(files.middleware, /Referrer-Policy/);
assert.match(files.middleware, /destino\.searchParams\.delete\("access"\)/);
assert.match(files.middleware, /response\.cookies\.set\(COOKIE_PEDIDO_ACESSO/);

console.log("Acesso publico de pedidos validado sem expor tokens.");
