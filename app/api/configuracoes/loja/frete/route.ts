import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buscarConfiguracaoFrete,
  CHAVE_FRETE_CONFIG,
} from "@/lib/frete/configuracao";

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  return fallback;
}

function parseNumero(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();

  if (!raw) return fallback;

  const numero = Number(raw.replace(",", "."));

  return Number.isFinite(numero) ? numero : fallback;
}

function parseInteiro(value: unknown, fallback = 0) {
  const numero = Number(String(value ?? "").trim().replace(",", "."));

  return Number.isFinite(numero) ? Math.trunc(numero) : fallback;
}

function normalizarCep(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarDocumento(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarTelefone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarProvedor(value: unknown) {
  const provedor = String(value || "").trim().toUpperCase();

  if (provedor === "MANUAL" || provedor === "DESATIVADO") {
    return provedor;
  }

  return "MELHOR_ENVIO";
}

function normalizarAmbiente(value: unknown) {
  return String(value || "").trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export async function GET() {
  try {
    const config = await buscarConfiguracaoFrete();

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Erro ao buscar configuração de frete:", error);

    return NextResponse.json(
      { error: "Erro ao buscar configuração de frete." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const provedor = normalizarProvedor(body.provedor);
    const ambiente = normalizarAmbiente(body.ambiente);
    const cepOrigem = normalizarCep(body.cepOrigem);
    const userAgent = String(body.userAgent || "").trim();
    const pesoFallbackKg = Math.max(parseNumero(body.pesoFallbackKg, 0.3), 0);
    const alturaFallbackCm = Math.max(
      parseNumero(body.alturaFallbackCm, 4),
      0
    );
    const larguraFallbackCm = Math.max(
      parseNumero(body.larguraFallbackCm, 12),
      0
    );
    const comprimentoFallbackCm = Math.max(
      parseNumero(body.comprimentoFallbackCm, 18),
      0
    );
    const prazoAdicionalDias = Math.max(
      parseInteiro(body.prazoAdicionalDias, 0),
      0
    );
    const valorAdicional = Math.max(parseNumero(body.valorAdicional, 0), 0);
    const retiradaLocalHabilitada = parseBoolean(
      body.retiradaLocalHabilitada,
      false
    );
    const retiradaLocalTexto = String(body.retiradaLocalTexto || "").trim();
    const remetenteNome = String(body.remetenteNome || "").trim();
    const remetenteDocumento = normalizarDocumento(body.remetenteDocumento);
    const remetenteEmail = String(body.remetenteEmail || "").trim();
    const remetenteTelefone = normalizarTelefone(body.remetenteTelefone);
    const remetenteEndereco = String(body.remetenteEndereco || "").trim();
    const remetenteNumero = String(body.remetenteNumero || "").trim();
    const remetenteComplemento = String(
      body.remetenteComplemento || ""
    ).trim();
    const remetenteBairro = String(body.remetenteBairro || "").trim();
    const remetenteCidade = String(body.remetenteCidade || "").trim();
    const remetenteUf = String(body.remetenteUf || "")
      .trim()
      .toUpperCase();

    if (cepOrigem && cepOrigem.length !== 8) {
      return NextResponse.json(
        { error: "CEP de origem deve ter 8 dígitos." },
        { status: 400 }
      );
    }

    if (
      pesoFallbackKg <= 0 ||
      alturaFallbackCm <= 0 ||
      larguraFallbackCm <= 0 ||
      comprimentoFallbackCm <= 0
    ) {
      return NextResponse.json(
        { error: "Peso e dimensões fallback devem ser maiores que zero." },
        { status: 400 }
      );
    }

    if (
      remetenteDocumento &&
      remetenteDocumento.length !== 11 &&
      remetenteDocumento.length !== 14
    ) {
      return NextResponse.json(
        { error: "Documento do remetente deve ser CPF ou CNPJ válido." },
        { status: 400 }
      );
    }

    if (remetenteUf && remetenteUf.length !== 2) {
      return NextResponse.json(
        { error: "UF do remetente deve ter 2 letras." },
        { status: 400 }
      );
    }

    const config = await prisma.lojaFreteConfiguracao.upsert({
      where: {
        chave: CHAVE_FRETE_CONFIG,
      },
      create: {
        chave: CHAVE_FRETE_CONFIG,
        provedor,
        ambiente,
        cepOrigem: cepOrigem || null,
        userAgent: userAgent || null,
        pesoFallbackKg,
        alturaFallbackCm,
        larguraFallbackCm,
        comprimentoFallbackCm,
        prazoAdicionalDias,
        valorAdicional,
        retiradaLocalHabilitada,
        retiradaLocalTexto: retiradaLocalTexto || null,
        remetenteNome: remetenteNome || null,
        remetenteDocumento: remetenteDocumento || null,
        remetenteEmail: remetenteEmail || null,
        remetenteTelefone: remetenteTelefone || null,
        remetenteEndereco: remetenteEndereco || null,
        remetenteNumero: remetenteNumero || null,
        remetenteComplemento: remetenteComplemento || null,
        remetenteBairro: remetenteBairro || null,
        remetenteCidade: remetenteCidade || null,
        remetenteUf: remetenteUf || null,
      },
      update: {
        provedor,
        ambiente,
        cepOrigem: cepOrigem || null,
        userAgent: userAgent || null,
        pesoFallbackKg,
        alturaFallbackCm,
        larguraFallbackCm,
        comprimentoFallbackCm,
        prazoAdicionalDias,
        valorAdicional,
        retiradaLocalHabilitada,
        retiradaLocalTexto: retiradaLocalTexto || null,
        remetenteNome: remetenteNome || null,
        remetenteDocumento: remetenteDocumento || null,
        remetenteEmail: remetenteEmail || null,
        remetenteTelefone: remetenteTelefone || null,
        remetenteEndereco: remetenteEndereco || null,
        remetenteNumero: remetenteNumero || null,
        remetenteComplemento: remetenteComplemento || null,
        remetenteBairro: remetenteBairro || null,
        remetenteCidade: remetenteCidade || null,
        remetenteUf: remetenteUf || null,
      },
    });

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error("Erro ao salvar configuração de frete:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao salvar configuração de frete.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
