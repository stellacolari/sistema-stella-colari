import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Home no editor visual | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

async function garantirPaginaHomeVisual() {
  const existente = await prisma.lojaPagina.findFirst({
    where: {
      OR: [{ tipo: "HOME" }, { slug: "home" }],
    },
    select: {
      id: true,
    },
  });

  if (existente) {
    return existente;
  }

  return prisma.lojaPagina.create({
    data: {
      titulo: "Home",
      slug: "home",
      tipo: "HOME",
      ativo: false,
      statusPublicacao: "RASCUNHO",
      publicadoEm: null,
      seoTitle: "Stella Colari",
      seoDescription:
        "Joias selecionadas Stella Colari: colecoes, novidades e destaques da loja.",
    },
    select: {
      id: true,
    },
  });
}

export default async function HomeLojaRedirectPage() {
  const home = await garantirPaginaHomeVisual();

  redirect(`/configuracoes/loja/paginas/${home.id}/editor`);
}
