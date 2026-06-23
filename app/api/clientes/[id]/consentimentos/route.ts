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
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao listar consentimentos.";

    return NextResponse.json(
      { error: message },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const usuario = await exigirAdminComPermissao("clientes", "editar");
    const { id } = await context.params;
    const body = await request.json();

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
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao registrar consentimento.";
    const status =
      error instanceof AdminPermissaoError
        ? 403
        : message === "Cliente nao encontrado."
          ? 404
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const usuario = await exigirAdminComPermissao("clientes", "editar");
    const { id } = await context.params;
    const body = await request.json();

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
    const message =
      error instanceof Error ? error.message : "Erro ao revogar consentimento.";
    const status =
      error instanceof AdminPermissaoError
        ? 403
        : message === "Cliente nao encontrado."
          ? 404
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
