import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protegerMutacaoConteudoLegado } from "@/lib/loja/conteudo/api-auth.server";
import { salvarImagemLocalSegura } from "@/lib/security/upload-imagem-local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function texto(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function booleano(value: FormDataEntryValue | null) {
  return String(value ?? "true") === "true";
}

async function salvarImagem(file: File) {
  return salvarImagemLocalSegura(file, "loja-home");
}

export async function GET() {
  const bloco = await prisma.lojaBlocoHome.findFirst({
    orderBy: { criadoEm: "asc" },
  });

  return NextResponse.json({ bloco });
}

export async function POST(request: Request) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "editar",
    { tipos: ["HOME"], slugs: ["home"] },
  );
  if (bloqueio) return bloqueio;

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
