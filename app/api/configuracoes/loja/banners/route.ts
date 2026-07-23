import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirAcessoMidia,
  inspecionarArquivoImagemMidia,
  validarArquivoImagemMidia,
} from "@/lib/loja/midia-assets";
import {
  respostaRateLimit,
  verificarRateLimit,
} from "@/lib/security/rate-limit";

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

function gerarNomeSeguro(nomeOriginal: string, mime: string) {
  const extensaoSegura: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const nomeBase = nomeOriginal
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `loja/banners/${Date.now()}-${nomeBase || "banner"}.${
    extensaoSegura[mime] || "bin"
  }`;
}

async function uploadImagemSeEnviada(
  formData: FormData,
  nomeCampo: string
): Promise<string | null> {
  const arquivo = formData.get(nomeCampo);

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return null;
  }

  const erroImagem = validarArquivoImagemMidia(arquivo);
  if (erroImagem) throw new Error(erroImagem);

  const imagem = await inspecionarArquivoImagemMidia(arquivo);
  const blob = await put(
    gerarNomeSeguro(arquivo.name, imagem.mimeReal),
    imagem.buffer,
    {
      access: "public",
      contentType: imagem.mimeReal,
      addRandomSuffix: true,
    },
  );

  return blob.url;
}

export async function GET() {
  try {
    const usuario = await exigirAcessoMidia("ver");
    if (!usuario) {
      return NextResponse.json({ erro: "Acesso nao permitido." }, { status: 403 });
    }

    const banners = await prisma.bannerLoja.findMany({
      orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
    });

    return NextResponse.json({ banners });
  } catch {
    console.error("Erro interno ao listar banners da loja.");

    return NextResponse.json(
      { erro: "Erro ao listar banners da loja." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirAcessoMidia("criar");
    if (!usuario) {
      return NextResponse.json({ erro: "Acesso nao permitido." }, { status: 403 });
    }

    const limite = verificarRateLimit({
      request,
      scope: "admin-upload-banners",
      identifier: usuario.id,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!limite.allowed) return respostaRateLimit(limite);

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
    const imagemMobileUpload =
      (await uploadImagemSeEnviada(formData, "imagemMobile")) ||
      (await uploadImagemSeEnviada(formData, "imagemMobileUrl")) ||
      null;

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
        imagemMobileUrl: imagemMobileUpload,
        linkUrl,
        ordem,
        ativo,
      },
    });

    return NextResponse.json({ banner });
  } catch {
    console.error("Erro interno ao criar banner da loja.");

    return NextResponse.json(
      {
        erro: "Nao foi possivel criar o banner da loja.",
      },
      { status: 500 }
    );
  }
}
