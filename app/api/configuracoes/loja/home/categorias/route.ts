import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protegerMutacaoConteudoLegado } from "@/lib/loja/conteudo/api-auth.server";
import { salvarImagemLocalSegura } from "@/lib/security/upload-imagem-local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function texto(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function numero(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function booleano(value: FormDataEntryValue | null) {
  return String(value ?? "true") === "true";
}

async function salvarImagem(file: File) {
  return salvarImagemLocalSegura(file, "loja-home");
}

export async function GET() {
  const categorias = await prisma.lojaCategoriaHome.findMany({
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
  });

  return NextResponse.json({ categorias });
}

export async function POST(request: Request) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "criar",
    { tipos: ["HOME"], slugs: ["home"] },
  );
  if (bloqueio) return bloqueio;

  try {
    const formData = await request.formData();

    const titulo = texto(formData.get("titulo"));
    const categoria = texto(formData.get("categoria"));
    const ordem = numero(formData.get("ordem"));
    const ativo = booleano(formData.get("ativo"));
    const imagem = formData.get("imagem");

    if (!titulo) {
      return NextResponse.json(
        { error: "Informe o título da categoria." },
        { status: 400 }
      );
    }

    if (!categoria) {
      return NextResponse.json(
        { error: "Selecione uma categoria." },
        { status: 400 }
      );
    }

    if (!(imagem instanceof File) || imagem.size <= 0) {
      return NextResponse.json(
        { error: "Selecione uma imagem para a categoria." },
        { status: 400 }
      );
    }

    const imagemUrl = await salvarImagem(imagem);

    const item = await prisma.lojaCategoriaHome.create({
      data: {
        titulo,
        categoria,
        imagemUrl,
        ordem,
        ativo,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar categoria da home:", error);

    return NextResponse.json(
      { error: "Erro ao criar categoria da home." },
      { status: 500 }
    );
  }
}
