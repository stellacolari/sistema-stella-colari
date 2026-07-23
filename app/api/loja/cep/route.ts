import { NextResponse } from "next/server";

function normalizarCep(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizarTexto(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cep = normalizarCep(searchParams.get("cep"));

    if (!cep) {
      return NextResponse.json(
        { error: "Informe o CEP." },
        { status: 400 }
      );
    }

    if (cep.length !== 8) {
      return NextResponse.json(
        { error: "O CEP deve ter 8 dígitos." },
        { status: 400 }
      );
    }

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.erro) {
      return NextResponse.json(
        { error: "CEP não encontrado." },
        { status: 404 }
      );
    }

    const endereco = {
      cep,
      rua: normalizarTexto(data.logradouro),
      bairro: normalizarTexto(data.bairro),
      cidade: normalizarTexto(data.localidade),
      estado: normalizarTexto(data.uf).toUpperCase(),
    };

    return NextResponse.json({ endereco });
  } catch {
    console.error("Erro interno ao buscar CEP.");

    return NextResponse.json(
      { error: "Erro ao buscar CEP." },
      { status: 500 }
    );
  }
}
