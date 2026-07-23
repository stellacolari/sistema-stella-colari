import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { salvarImagemLocalSegura } from "@/lib/security/upload-imagem-local";

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

export async function GET() {
  try {
    await exigirAdminComPermissao("lojaOnline", "ver");

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
    await exigirAdminComPermissao("lojaOnline", "editar");

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

    const imagemUrl = await salvarImagemLocalSegura(imagem, "banners");

    const banner = await prisma.bannerLoja.create({
      data: {
        titulo: titulo || null,
        subtitulo: subtitulo || null,
        imagemUrl,
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
