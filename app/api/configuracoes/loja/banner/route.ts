import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { salvarImagemLocalSegura } from "@/lib/security/upload-imagem-local";

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
    await exigirAdminComPermissao("lojaOnline", "editar");

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

    const imagemUrl = await salvarImagemLocalSegura(arquivo, "banners");

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
