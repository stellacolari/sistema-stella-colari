import assert from "node:assert/strict";
import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = String(
  process.env.QA_BASE_URL || "http://127.0.0.1:3010",
).replace(/\/$/, "");
const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const senhaSintetica = `Qa!${sufixo}`;
const idsCriados = {
  clientes: [],
  pedidos: [],
};

function hashSenha(senha) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(senha, salt, 100000, 64, "sha512").toString("hex");

  return `pbkdf2$${salt}$${hash}`;
}

function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function dadosCliente(indice) {
  const numeros = `${sufixo}${indice}`.replace(/\D/g, "");
  const documento = numeros.slice(-11).padStart(11, String(indice));
  const telefone = `119${numeros.slice(-8).padStart(8, String(indice))}`;

  return {
    codigo: `CL${numeros.slice(-6).padStart(6, String(indice))}`,
    nome: `Cliente QA ${indice}`,
    telefone,
    email: `qa-sessao-${indice}-${sufixo}@example.invalid`,
    documento,
    tipoCliente: "ONLINE",
    status: "NOVO",
    senhaHash: hashSenha(senhaSintetica),
    origemCadastro: "QA_SESSAO_SEGURA",
  };
}

function cookiesDaResposta(response) {
  return typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") || ""];
}

function cookiePorNome(response, nome) {
  const cabecalho = cookiesDaResposta(response).find((item) =>
    item.startsWith(`${nome}=`),
  );

  assert.ok(cabecalho, `Cookie ${nome} nao foi emitido.`);
  return cabecalho.split(";")[0];
}

async function requisitar(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
}

async function criarCliente(indice) {
  const cliente = await prisma.cliente.create({
    data: dadosCliente(indice),
    select: {
      id: true,
      codigo: true,
      nome: true,
      telefone: true,
      email: true,
      documento: true,
    },
  });
  idsCriados.clientes.push(cliente.id);
  return cliente;
}

async function criarPedido(cliente, indice) {
  const pedido = await prisma.pedidoOnline.create({
    data: {
      codigo: `POQA${indice}${sufixo}`.slice(0, 32),
      clienteId: cliente?.id ?? null,
      nomeCliente: cliente?.nome || `Anonimo QA ${indice}`,
      telefoneCliente: cliente?.telefone || `1199999${indice}000`,
      emailCliente: cliente?.email || null,
      documento: cliente?.documento || null,
      subtotal: 1,
      total: 1,
      origemCanal: "LOJA_STELLA",
      status: "PEDIDO_RECEBIDO",
      statusPagamento: "AGUARDANDO_PAGAMENTO",
    },
    select: {
      id: true,
      codigo: true,
    },
  });
  idsCriados.pedidos.push(pedido.id);
  return pedido;
}

async function executar() {
  const health = await requisitar("/loja/entrar");
  assert.equal(health.status, 200);

  const clienteA = await criarCliente(1);
  const clienteB = await criarCliente(2);
  const pedidoA = await criarPedido(clienteA, 1);
  const pedidoB = await criarPedido(clienteB, 2);

  const legado = await requisitar("/api/loja/auth/me", {
    headers: {
      Cookie: `stella_cliente_id=${clienteA.id}`,
    },
  });
  assert.equal(legado.status, 200);
  assert.equal((await legado.json()).cliente, null);
  assert.ok(
    cookiesDaResposta(legado).some(
      (item) =>
        item.startsWith("stella_cliente_id=") &&
        /Max-Age=0/i.test(item),
    ),
  );

  const login = await requisitar("/api/loja/auth/entrar", {
    method: "POST",
    body: JSON.stringify({
      identificador: clienteA.email,
      senha: senhaSintetica,
      manterConectado: true,
    }),
  });
  assert.equal(login.status, 200);
  const cookieSessaoA = cookiePorNome(login, "stella_cliente_session");
  assert.equal(cookieSessaoA.includes(clienteA.id), false);
  assert.ok(
    cookiesDaResposta(login).some(
      (item) =>
        item.startsWith("stella_cliente_session=") &&
        /HttpOnly/i.test(item) &&
        /SameSite=Lax/i.test(item) &&
        /Max-Age=/i.test(item),
    ),
  );

  const tokenSessaoA = cookieSessaoA.split("=")[1];
  const sessaoA = await prisma.clienteSessao.findUnique({
    where: {
      tokenHash: hashToken(tokenSessaoA),
    },
  });
  assert.equal(sessaoA?.clienteId, clienteA.id);
  assert.equal(sessaoA?.revogadoEm, null);

  const me = await requisitar("/api/loja/auth/me", {
    headers: {
      Cookie: cookieSessaoA,
    },
  });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).cliente.id, clienteA.id);

  const perfilBAntes = await prisma.cliente.findUniqueOrThrow({
    where: {
      id: clienteB.id,
    },
    select: {
      nome: true,
      telefone: true,
      email: true,
      documento: true,
    },
  });
  const atualizarPerfilA = await requisitar("/api/loja/minha-conta/dados", {
    method: "PATCH",
    headers: {
      Cookie: cookieSessaoA,
    },
    body: JSON.stringify({
      id: clienteB.id,
      nome: clienteA.nome,
      telefone: clienteA.telefone,
      email: clienteA.email,
      documento: clienteA.documento,
    }),
  });
  assert.equal(atualizarPerfilA.status, 200);
  const perfilBDepois = await prisma.cliente.findUniqueOrThrow({
    where: {
      id: clienteB.id,
    },
    select: {
      nome: true,
      telefone: true,
      email: true,
      documento: true,
    },
  });
  assert.deepEqual(perfilBDepois, perfilBAntes);

  const consentimentos = await requisitar(
    "/api/loja/minha-conta/consentimentos",
    {
      headers: {
        Cookie: cookieSessaoA,
      },
    },
  );
  assert.equal(consentimentos.status, 200);

  const gatePedidoA = await requisitar("/api/loja/pedido/acesso", {
    method: "POST",
    body: JSON.stringify({
      codigo: pedidoA.codigo,
      clienteSessaoToken: tokenSessaoA,
      access: "",
      tokenCookie: "",
    }),
  });
  assert.equal(gatePedidoA.status, 204);

  const conta = await requisitar("/loja/minha-conta", {
    headers: {
      Cookie: cookieSessaoA,
    },
  });
  assert.equal(conta.status, 200);

  const carrinho = await requisitar("/loja/carrinho", {
    headers: {
      Cookie: cookieSessaoA,
    },
  });
  assert.equal(carrinho.status, 200);

  const checkoutAntesStripe = await requisitar("/loja/checkout", {
    headers: {
      Cookie: cookieSessaoA,
    },
  });
  assert.equal(checkoutAntesStripe.status, 200);

  const pedidoAComSessao = await requisitar(
    `/loja/pedido/${encodeURIComponent(pedidoA.codigo)}`,
    {
      headers: {
        Cookie: cookieSessaoA,
      },
    },
  );
  assert.equal(pedidoAComSessao.status, 200);

  const pedidoBComSessaoA = await requisitar(
    `/loja/pedido/${encodeURIComponent(pedidoB.codigo)}`,
    {
      headers: {
        Cookie: cookieSessaoA,
      },
    },
  );
  assert.equal(pedidoBComSessaoA.status, 404);

  const expiradoToken = randomBytes(32).toString("base64url");
  await prisma.clienteSessao.create({
    data: {
      clienteId: clienteA.id,
      tokenHash: hashToken(expiradoToken),
      expiraEm: new Date(Date.now() - 60_000),
    },
  });
  const meExpirado = await requisitar("/api/loja/auth/me", {
    headers: {
      Cookie: `stella_cliente_session=${expiradoToken}`,
    },
  });
  assert.equal((await meExpirado.json()).cliente, null);

  const revogadoToken = randomBytes(32).toString("base64url");
  await prisma.clienteSessao.create({
    data: {
      clienteId: clienteA.id,
      tokenHash: hashToken(revogadoToken),
      expiraEm: new Date(Date.now() + 60_000),
      revogadoEm: new Date(),
    },
  });
  const meRevogado = await requisitar("/api/loja/auth/me", {
    headers: {
      Cookie: `stella_cliente_session=${revogadoToken}`,
    },
  });
  assert.equal((await meRevogado.json()).cliente, null);

  const tokenPedido = randomBytes(32).toString("base64url");
  const pedidoAnonimo = await criarPedido(null, 3);
  await prisma.pedidoOnline.update({
    where: {
      id: pedidoAnonimo.id,
    },
    data: {
      pedidoAcessoTokenHash: hashToken(tokenPedido),
      pedidoAcessoCriadoEm: new Date(),
    },
  });
  const resgateToken = await requisitar(
    `/loja/pedido/${encodeURIComponent(pedidoAnonimo.codigo)}?access=${tokenPedido}`,
  );
  assert.equal(resgateToken.status, 307);
  assert.equal(
    new URL(resgateToken.headers.get("location"), baseUrl).searchParams.has(
      "access",
    ),
    false,
  );
  const cookiePedido = cookiePorNome(resgateToken, "stella_pedido_access");
  const pedidoAnonimoComCookie = await requisitar(
    `/loja/pedido/${encodeURIComponent(pedidoAnonimo.codigo)}`,
    {
      headers: {
        Cookie: cookiePedido,
      },
    },
  );
  assert.equal(pedidoAnonimoComCookie.status, 200);

  const pedidoLegadoFechado = await criarPedido(null, 4);
  const legadoSemToken = await requisitar(
    `/loja/pedido/${encodeURIComponent(pedidoLegadoFechado.codigo)}`,
  );
  assert.equal(legadoSemToken.status, 404);

  const cadastroBody = dadosCliente(3);
  const cadastro = await requisitar("/api/loja/auth/cadastrar", {
    method: "POST",
    body: JSON.stringify({
      nome: cadastroBody.nome,
      telefone: cadastroBody.telefone,
      email: cadastroBody.email,
      documento: cadastroBody.documento,
      senha: senhaSintetica,
      confirmarSenha: senhaSintetica,
      consentimentoWhatsapp: false,
      manterConectado: true,
    }),
  });
  assert.equal(cadastro.status, 200);
  const cadastroJson = await cadastro.json();
  idsCriados.clientes.push(cadastroJson.cliente.id);
  const cookieCadastro = cookiePorNome(
    cadastro,
    "stella_cliente_session",
  );
  const meCadastro = await requisitar("/api/loja/auth/me", {
    headers: {
      Cookie: cookieCadastro,
    },
  });
  assert.equal((await meCadastro.json()).cliente.id, cadastroJson.cliente.id);

  const logout = await requisitar("/api/loja/auth/sair", {
    method: "POST",
    headers: {
      Cookie: cookieSessaoA,
    },
  });
  assert.equal(logout.status, 200);
  assert.ok(
    cookiesDaResposta(logout).some(
      (item) =>
        item.startsWith("stella_cliente_session=") &&
        /Max-Age=0/i.test(item),
    ),
  );
  const sessaoRevogada = await prisma.clienteSessao.findUnique({
    where: {
      tokenHash: hashToken(tokenSessaoA),
    },
  });
  assert.ok(sessaoRevogada?.revogadoEm);

  const meDepoisLogout = await requisitar("/api/loja/auth/me", {
    headers: {
      Cookie: cookieSessaoA,
    },
  });
  assert.equal((await meDepoisLogout.json()).cliente, null);

  const adminLogin = await requisitar("/login", {
    headers: {
      Cookie: cookieCadastro,
    },
  });
  assert.equal(adminLogin.status, 200);

  console.log(
    "Integracao de sessao validada: login, persistencia, A x B, expiracao, revogacao, cadastro, logout e pedido anonimo.",
  );
}

try {
  await executar();
} finally {
  if (idsCriados.pedidos.length > 0) {
    await prisma.pedidoOnline.deleteMany({
      where: {
        id: {
          in: idsCriados.pedidos,
        },
      },
    });
  }

  if (idsCriados.clientes.length > 0) {
    await prisma.cliente.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: idsCriados.clientes,
            },
          },
          {
            email: {
              contains: sufixo,
            },
          },
        ],
      },
    });
  }

  await prisma.$disconnect();
}
