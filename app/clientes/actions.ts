"use server";

import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

function gerarCodigoCliente(numero: number) {
  return `C${String(numero).padStart(6, "0")}`;
}

function limparDocumento(valor: string) {
  return valor.replace(/\D/g, "").trim();
}

function limparTelefone(valor: string) {
  return valor.replace(/\D/g, "").trim();
}

export async function criarCliente(formData: FormData) {
  await exigirAdminComPermissao("clientes", "criar");

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const documento = String(formData.get("documento") || "").trim();
  const cep = String(formData.get("cep") || "").trim();
  const rua = String(formData.get("rua") || "").trim();
  const numero = String(formData.get("numero") || "").trim();
  const tipoCliente = String(formData.get("tipoCliente") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();

  if (!nome) throw new Error("Nome é obrigatório.");
  if (!telefone) throw new Error("Telefone é obrigatório.");
  if (!documento) throw new Error("Documento é obrigatório.");
  if (!tipoCliente) throw new Error("Tipo de cliente é obrigatório.");

  const telefoneLimpo = limparTelefone(telefone);
  const documentoLimpo = limparDocumento(documento);

  const clienteDuplicado = await prisma.cliente.findFirst({
    where: {
      OR: [
        { telefone: telefoneLimpo },
        { documento: documentoLimpo },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (clienteDuplicado) {
    throw new Error("Já existe um cliente com esse telefone, documento ou email.");
  }

  const ultimoCliente = await prisma.cliente.findFirst({
    orderBy: { criadoEm: "desc" },
    select: { codigo: true },
  });

  let proximoNumero = 1;

  if (ultimoCliente?.codigo) {
    const numeroAtual = Number(ultimoCliente.codigo.replace("C", ""));
    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  const codigo = gerarCodigoCliente(proximoNumero);

  await prisma.cliente.create({
    data: {
      codigo,
      nome,
      telefone: telefoneLimpo,
      email: email || null,
      documento: documentoLimpo,
      cep: cep || null,
      rua: rua || null,
      numero: numero || null,
      tipoCliente,
      observacoes: observacoes || null,
    },
  });
}

export async function atualizarCliente(id: string, formData: FormData) {
  await exigirAdminComPermissao("clientes", "editar");

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const documento = String(formData.get("documento") || "").trim();
  const cep = String(formData.get("cep") || "").trim();
  const rua = String(formData.get("rua") || "").trim();
  const numero = String(formData.get("numero") || "").trim();
  const tipoCliente = String(formData.get("tipoCliente") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();

  if (!nome) throw new Error("Nome é obrigatório.");
  if (!telefone) throw new Error("Telefone é obrigatório.");
  if (!documento) throw new Error("Documento é obrigatório.");
  if (!tipoCliente) throw new Error("Tipo de cliente é obrigatório.");

  const telefoneLimpo = limparTelefone(telefone);
  const documentoLimpo = limparDocumento(documento);

  const clienteDuplicado = await prisma.cliente.findFirst({
    where: {
      id: { not: id },
      OR: [
        { telefone: telefoneLimpo },
        { documento: documentoLimpo },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (clienteDuplicado) {
    throw new Error("Já existe outro cliente com esse telefone, documento ou email.");
  }

  await prisma.cliente.update({
    where: { id },
    data: {
      nome,
      telefone: telefoneLimpo,
      email: email || null,
      documento: documentoLimpo,
      cep: cep || null,
      rua: rua || null,
      numero: numero || null,
      tipoCliente,
      observacoes: observacoes || null,
    },
  });
}

export async function alternarStatusCliente(id: string, statusAtual: string) {
  await exigirAdminComPermissao("clientes", "editar");

  await prisma.cliente.update({
    where: { id },
    data: {
      status: statusAtual === "INATIVO" ? "NOVO" : "INATIVO",
    },
  });
}
