import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  obterResumoWhatsappPublicoCliente,
  registrarConsentimentoWhatsappPublico,
  revogarConsentimentoWhatsappPublico,
} from "@/lib/clientes/consentimentos-cliente";

const COOKIE_CLIENTE_ID = "stella_cliente_id";

async function obterClienteAutenticadoId() {
  const cookieStore = await cookies();
  const clienteId = cookieStore.get(COOKIE_CLIENTE_ID)?.value || "";

  if (!clienteId) return null;

  const cliente = await prisma.cliente.findFirst({
    where: {
      id: clienteId,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    select: {
      id: true,
    },
  });

  return cliente?.id ?? null;
}

function respostaNaoAutenticado() {
  return NextResponse.json(
    { error: "Cliente nao autenticado." },
    { status: 401 }
  );
}

function observacaoLimitada(value: unknown) {
  const texto = String(value || "").trim();

  return texto ? texto.slice(0, 500) : null;
}

export async function GET() {
  try {
    const clienteId = await obterClienteAutenticadoId();

    if (!clienteId) return respostaNaoAutenticado();

    const resumo = await obterResumoWhatsappPublicoCliente(clienteId);

    return NextResponse.json({ resumo });
  } catch (error) {
    console.error("Erro ao listar consentimentos publicos:", error);

    return NextResponse.json(
      { error: "Erro ao listar consentimentos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const clienteId = await obterClienteAutenticadoId();

    if (!clienteId) return respostaNaoAutenticado();

    const body = await request.json().catch(() => ({}));

    await registrarConsentimentoWhatsappPublico({
      clienteId,
      origem: "MINHA_CONTA",
      observacao: observacaoLimitada(body.observacao),
    });

    const resumo = await obterResumoWhatsappPublicoCliente(clienteId);

    return NextResponse.json({ resumo });
  } catch (error) {
    console.error("Erro ao autorizar consentimento publico:", error);

    return NextResponse.json(
      { error: "Erro ao atualizar consentimento." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const clienteId = await obterClienteAutenticadoId();

    if (!clienteId) return respostaNaoAutenticado();

    const body = await request.json().catch(() => ({}));

    await revogarConsentimentoWhatsappPublico({
      clienteId,
      origem: "MINHA_CONTA",
      observacao: observacaoLimitada(body.observacao),
    });

    const resumo = await obterResumoWhatsappPublicoCliente(clienteId);

    return NextResponse.json({ resumo });
  } catch (error) {
    console.error("Erro ao revogar consentimento publico:", error);

    return NextResponse.json(
      { error: "Erro ao revogar consentimento." },
      { status: 500 }
    );
  }
}
