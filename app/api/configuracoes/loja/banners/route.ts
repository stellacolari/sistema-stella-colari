import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function textoOpcional(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function numeroFormulario(valor: FormDataEntryValue | null, fallback = 0) {
  const numero = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(numero) ? numero : fallback;
}

function booleanFormulario(valor: FormDataEntryValue | null) {
  return valor === "true" || valor === "on" || valor === "1";
}

function gerarNomeSeguro(nomeOriginal: string) {
  const extensao = nomeOriginal.split(".").pop()?.toLowerCase() || "jpg";

  const extensaoSegura = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(
    extensao
  )
    ? extensao
    : "jpg";

  const nomeBase = nomeOriginal
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `loja/banners/${Date.now()}-${nomeBase || "banner"}.${extensaoSegura}`;
}

async function uploadImagemSeEnviada(
  formData: FormData,
  nomeCampo: string
): Promise<string | null> {
  const arquivo = formData.get(nomeCampo);

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return null;
  }

  if (!arquivo.type.startsWith("image/")) {
    throw new Error("O arquivo enviado precisa ser uma imagem.");
  }

  const blob = await put(gerarNomeSeguro(arquivo.name), arquivo, {
    access: "public",
    addRandomSuffix: true,
  });

  return blob.url;
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
      { erro: "Erro ao listar banners da loja." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const titulo = textoOpcional(formData.get("titulo"));
    const subtitulo = textoOpcional(formData.get("subtitulo"));
    const linkUrl = textoOpcional(formData.get("linkUrl"));
    const ordem = numeroFormulario(formData.get("ordem"), 0);
    const ativo = booleanFormulario(formData.get("ativo"));

    const imagemUpload =
      (await uploadImagemSeEnviada(formData, "imagem")) ||
      (await uploadImagemSeEnviada(formData, "imagemUrl")) ||
      (await uploadImagemSeEnviada(formData, "arquivo")) ||
      (await uploadImagemSeEnviada(formData, "file"));

    const imagemUrl =
      imagemUpload || textoOpcional(formData.get("imagemUrl"));

    if (!imagemUrl) {
      return NextResponse.json(
        { erro: "Informe a imagem do banner." },
        { status: 400 }
      );
    }

    const banner = await prisma.bannerLoja.create({
      data: {
        titulo,
        subtitulo,
        imagemUrl,
        linkUrl,
        ordem,
        ativo,
      },
    });

    return NextResponse.json({ banner });
  } catch (error) {
    console.error("Erro ao criar banner da loja:", error);

    return NextResponse.json(
      {
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao criar banner da loja.",
      },
      { status: 500 }
    );
  }
}