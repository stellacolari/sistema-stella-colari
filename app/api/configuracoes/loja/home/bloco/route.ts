import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function texto(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function booleano(value: FormDataEntryValue | null) {
  return String(value ?? "true") === "true";
}

function extensaoArquivo(nome: string) {
  const ext = path.extname(nome).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
}

async function salvarImagem(file: File) {
  const nomeArquivo = `${randomUUID()}${extensaoArquivo(file.name)}`;
  const pasta = path.join(process.cwd(), "public", "uploads", "loja-home");

  await mkdir(pasta, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(pasta, nomeArquivo), buffer);

  return `/uploads/loja-home/${nomeArquivo}`;
}

export async function GET() {
  const bloco = await prisma.lojaBlocoHome.findFirst({
    orderBy: { criadoEm: "asc" },
  });

  return NextResponse.json({ bloco });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const titulo = texto(formData.get("titulo"));
    const textoBloco = texto(formData.get("texto"));
    const textoBotao = texto(formData.get("textoBotao"));
    const linkBotao = texto(formData.get("linkBotao"));
    const ativo = booleano(formData.get("ativo"));
    const imagem = formData.get("imagem");

    const data: {
      titulo: string;
      texto: string;
      textoBotao: string | null;
      linkBotao: string | null;
      ativo: boolean;
      imagemUrl?: string;
    } = {
      titulo,
      texto: textoBloco,
      textoBotao: textoBotao || null,
      linkBotao: linkBotao || null,
      ativo,
    };

    if (imagem instanceof File && imagem.size > 0) {
      data.imagemUrl = await salvarImagem(imagem);
    }

    const existente = await prisma.lojaBlocoHome.findFirst({
      orderBy: { criadoEm: "asc" },
    });

    if (existente) {
      const bloco = await prisma.lojaBlocoHome.update({
        where: { id: existente.id },
        data,
      });

      return NextResponse.json({ bloco });
    }

    const bloco = await prisma.lojaBlocoHome.create({
      data: {
        ...data,
        imagemUrl: data.imagemUrl ?? null,
      },
    });

    return NextResponse.json({ bloco }, { status: 201 });
  } catch (error) {
    console.error("Erro ao salvar bloco da home:", error);

    return NextResponse.json(
      { error: "Erro ao salvar bloco da home." },
      { status: 500 }
    );
  }
}