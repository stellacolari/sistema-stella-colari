import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function limparTexto(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function limparBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "true") === "true";
}

function limparNumero(value: FormDataEntryValue | null) {
  const numero = Number(value ?? 0);

  if (Number.isNaN(numero)) {
    return 0;
  }

  return numero;
}

function getExtensaoArquivo(nome: string) {
  const extensao = path.extname(nome).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extensao)) {
    return extensao;
  }

  return ".jpg";
}

export async function GET() {
  try {
    const banners = await prisma.bannerLoja.findMany({
      orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
    });

    return NextResponse.json({ banners });
  } catch (error) {
    console.error("Erro ao listar banners da loja:", error);

    return NextResponse.json(
      { error: "Erro ao listar banners da loja." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const titulo = limparTexto(formData.get("titulo"));
    const subtitulo = limparTexto(formData.get("subtitulo"));
    const linkUrl = limparTexto(formData.get("linkUrl"));
    const ordem = limparNumero(formData.get("ordem"));
    const ativo = limparBoolean(formData.get("ativo"));
    const imagem = formData.get("imagem");

    if (!(imagem instanceof File)) {
      return NextResponse.json(
        { error: "Imagem do banner não enviada." },
        { status: 400 }
      );
    }

    if (imagem.size <= 0) {
      return NextResponse.json(
        { error: "Arquivo de imagem inválido." },
        { status: 400 }
      );
    }

    const extensao = getExtensaoArquivo(imagem.name);
    const nomeArquivo = `${randomUUID()}${extensao}`;

    const pastaUploads = path.join(
      process.cwd(),
      "public",
      "uploads",
      "banners"
    );

    await mkdir(pastaUploads, { recursive: true });

    const bytes = await imagem.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(path.join(pastaUploads, nomeArquivo), buffer);

    const banner = await prisma.bannerLoja.create({
      data: {
        titulo: titulo || null,
        subtitulo: subtitulo || null,
        imagemUrl: `/uploads/banners/${nomeArquivo}`,
        linkUrl: linkUrl || null,
        ordem,
        ativo,
      },
    });

    return NextResponse.json({ banner }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar banner da loja:", error);

    return NextResponse.json(
      { error: "Erro ao criar banner da loja." },
      { status: 500 }
    );
  }
}