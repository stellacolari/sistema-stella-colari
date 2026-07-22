import { NextResponse } from "next/server";
import {
  erroConteudo,
  exigirAcessoConteudo,
  payloadDentroDoLimite,
  payloadJsonDentroDoLimite,
  validarOrigemMutacao,
} from "@/lib/loja/conteudo/api-auth.server";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function uniqueSlug(baseValue: string) {
  const base = slugify(baseValue) || "campanha";
  let slug = base;
  let suffix = 2;
  while (await prisma.lojaPagina.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function POST(request: Request) {
  const usuario = await exigirAcessoConteudo("criar");
  if (!usuario) return erroConteudo("Você não possui permissão para criar campanhas.", 403);
  if (!validarOrigemMutacao(request)) return erroConteudo("Origem da requisição inválida.", 403);
  if (!payloadDentroDoLimite(request)) return erroConteudo("Conteúdo excede o limite permitido.", 413);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return erroConteudo("JSON inválido.");
  if (!payloadJsonDentroDoLimite(body)) {
    return erroConteudo("Conteúdo excede o limite permitido.", 413);
  }
  const title = String(body.title ?? "").trim().slice(0, 140);
  if (!title) return erroConteudo("Informe o nome da campanha.");

  const slug = await uniqueSlug(String(body.slug ?? "").trim() || title);
  const page = await prisma.lojaPagina.create({
    data: {
      titulo: title,
      slug,
      tipo: "CAMPANHA",
      ativo: false,
      statusPublicacao: "RASCUNHO",
    },
    select: { id: true, titulo: true, slug: true },
  });

  return NextResponse.json({ ok: true, page }, { status: 201 });
}
