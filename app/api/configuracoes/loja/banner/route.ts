import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getStringValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getBooleanValue(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true";
}

function getNumberValue(value: FormDataEntryValue | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const titulo = getStringValue(formData.get("titulo"));
    const subtitulo = getStringValue(formData.get("subtitulo"));
    const linkUrl = getStringValue(formData.get("linkUrl"));
    const ordem = getNumberValue(formData.get("ordem"));
    const ativo = getBooleanValue(formData.get("ativo"));
    const arquivo = formData.get("imagem");

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { error: "Envie uma imagem para o banner." },
        { status: 400 }
      );
    }

    if (!arquivo.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "O arquivo enviado precisa ser uma imagem." },
        { status: 400 }
      );
    }

    const extensao =
      arquivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "png";

    const nomeArquivo = `${randomUUID()}.${extensao}`;
    const pastaUploads = path.join(
      process.cwd(),
      "public",
      "uploads",
      "banners"
    );

    await mkdir(pastaUploads, { recursive: true });

    const bytes = await arquivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(path.join(pastaUploads, nomeArquivo), buffer);

    const imagemUrl = `/uploads/banners/${nomeArquivo}`;

    const banner = await prisma.bannerLoja.create({
      data: {
        titulo: titulo || null,
        subtitulo: subtitulo || null,
        linkUrl: linkUrl || null,
        imagemUrl,
        ordem,
        ativo,
      },
    });

    return NextResponse.json({ ok: true, banner });
  } catch (error) {
    console.error("Erro ao criar banner da loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao criar banner.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}