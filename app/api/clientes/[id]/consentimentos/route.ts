import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AdminPermissaoError,
  exigirAdminComPermissao,
} from "@/lib/auth/admin";
import {
  listarConsentimentosCliente,
  obterResumoConsentimentosCliente,
  registrarConsentimentoManualCliente,
  revogarConsentimentoCliente,
} from "@/lib/clientes/consentimentos-cliente";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function garantirClienteExiste(clienteId: string) {
  const cliente = await prisma.cliente.findUnique({
    where: {
      id: clienteId,
    },
    select: {
      id: true,
    },
  });

  if (!cliente) {
    return false;
  }

  return true;
}

function parseTextoLimitado(value: unknown, limite: number) {
  const texto = String(value || "").trim();

  return texto.length > limite ? texto.slice(0, limite) : texto;
}

async function parseJsonSeguro(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Payload JSON invalido.");
  }
}

function erroEsperadoConsentimento(message: string) {
  return [
    "Payload JSON invalido.",
    "Cliente nao encontrado.",
    "Finalidade de consentimento invalida.",
    "Canal de consentimento invalido.",
    "Status de consentimento invalido.",
  ].includes(message);
}

function respostaErroConsentimento(
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof AdminPermissaoError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Cliente nao encontrado.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (erroEsperadoConsentimento(message)) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await exigirAdminComPermissao("clientes", "ver");

    const { id } = await context.params;

    if (!(await garantirClienteExiste(id))) {
      return NextResponse.json(
        { error: "Cliente nao encontrado." },
        { status: 404 }
      );
    }

    const [consentimentos, resumo] = await Promise.all([
      listarConsentimentosCliente(id),
      obterResumoConsentimentosCliente(id),
    ]);

    return NextResponse.json({ consentimentos, resumo });
  } catch (error) {
    return respostaErroConsentimento(error, "Erro ao listar consentimentos.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const usuario = await exigirAdminComPermissao("clientes", "editar");
    const { id } = await context.params;
    const body = await parseJsonSeguro(request);

    const consentimento = await registrarConsentimentoManualCliente({
      clienteId: id,
      finalidade: parseTextoLimitado(body.finalidade, 40),
      canal: parseTextoLimitado(body.canal, 40),
      status: parseTextoLimitado(body.status || "AUTORIZADO", 40),
      origem: "ADMIN_MANUAL",
      versaoPolitica: parseTextoLimitado(body.versaoPolitica, 80) || null,
      observacao: parseTextoLimitado(body.observacao, 500) || null,
      registradoPorAdmin: {
        id: usuario.id,
        nome: usuario.nome,
      },
    });
    const resumo = await obterResumoConsentimentosCliente(id);

    return NextResponse.json({ consentimento, resumo }, { status: 201 });
  } catch (error) {
    return respostaErroConsentimento(error, "Erro ao registrar consentimento.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const usuario = await exigirAdminComPermissao("clientes", "editar");
    const { id } = await context.params;
    const body = await parseJsonSeguro(request);

    const consentimento = await revogarConsentimentoCliente({
      clienteId: id,
      finalidade: parseTextoLimitado(body.finalidade, 40),
      canal: parseTextoLimitado(body.canal, 40),
      origem: "ADMIN_MANUAL",
      observacao: parseTextoLimitado(body.observacao, 500) || null,
      registradoPorAdmin: {
        id: usuario.id,
        nome: usuario.nome,
      },
    });
    const resumo = await obterResumoConsentimentosCliente(id);

    return NextResponse.json({ consentimento, resumo });
  } catch (error) {
    return respostaErroConsentimento(error, "Erro ao revogar consentimento.");
  }
}
