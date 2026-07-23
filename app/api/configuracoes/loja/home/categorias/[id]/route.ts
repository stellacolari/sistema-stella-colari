import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { protegerMutacaoConteudoLegado } from "@/lib/loja/conteudo/api-auth.server";
import { salvarImagemLocalSegura } from "@/lib/security/upload-imagem-local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function PATCH(request: Request, context: RouteContext) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "editar",
    { tipos: ["HOME"], slugs: ["home"] },
  );
  if (bloqueio) return bloqueio;

  try {
    const { id } = await context.params;
    const formData = await request.formData();

    const imagem = formData.get("imagem");
    const data: {
      titulo: string;
      categoria: string;
      ordem: number;
      ativo: boolean;
      imagemUrl?: string;
    } = {
      titulo: texto(formData.get("titulo")),
      categoria: texto(formData.get("categoria")),
      ordem: numero(formData.get("ordem")),
      ativo: booleano(formData.get("ativo")),
    };

    if (imagem instanceof File && imagem.size > 0) {
      data.imagemUrl = await salvarImagem(imagem);
    }

    const item = await prisma.lojaCategoriaHome.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Erro ao atualizar categoria da home:", error);

    return NextResponse.json(
      { error: "Erro ao atualizar categoria da home." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const bloqueio = await protegerMutacaoConteudoLegado(
    request,
    "excluir",
    { tipos: ["HOME"], slugs: ["home"] },
  );
  if (bloqueio) return bloqueio;

  try {
    const { id } = await context.params;

    await prisma.lojaCategoriaHome.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir categoria da home:", error);

    return NextResponse.json(
      { error: "Erro ao excluir categoria da home." },
      { status: 500 }
    );
  }
}
