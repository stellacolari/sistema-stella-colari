import { NextResponse } from "next/server";
import {
  obterResumoWhatsappPublicoCliente,
  registrarConsentimentoWhatsappPublico,
  revogarConsentimentoWhatsappPublico,
} from "@/lib/clientes/consentimentos-cliente";
import { obterClienteAutenticadoId } from "@/lib/loja/cliente-sessao.server";

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
  } catch {
    console.error("Erro interno ao listar consentimentos publicos.");

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
  } catch {
    console.error("Erro interno ao autorizar consentimento publico.");

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
  } catch {
    console.error("Erro interno ao revogar consentimento publico.");

    return NextResponse.json(
      { error: "Erro ao revogar consentimento." },
      { status: 500 }
    );
  }
}
