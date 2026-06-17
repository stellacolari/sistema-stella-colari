import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { serializarVitrineInteligente } from "@/lib/loja/vitrines-inteligentes";
import VitrinesInteligentesClient from "@/components/configuracoes/loja/VitrinesInteligentesClient";

export const metadata: Metadata = {
  title: "Vitrines Inteligentes | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    campanhaId?: string;
    recomendacaoId?: string;
    produtoId?: string;
    status?: string;
    tipo?: string;
    origem?: string;
  }>;
};

export default async function VitrinesInteligentesPage({ searchParams }: PageProps) {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/vendas/nova-v2");
  }

  const params = await searchParams;
  const [sugestoesRaw, paginas] = await Promise.all([
    prisma.vitrineInteligenteSugestao.findMany({
      orderBy: [{ criadoEm: "desc" }],
      take: 300,
      include: {
        campanha: {
          select: { id: true, codigo: true, titulo: true, tipo: true, status: true },
        },
        recomendacao: {
          select: { id: true, codigo: true, titulo: true, status: true },
        },
        paginaDestino: {
          select: { id: true, titulo: true, slug: true, tipo: true },
        },
        blocoCriado: {
          select: { id: true, titulo: true, ativo: true },
        },
      },
    }),
    prisma.lojaPagina.findMany({
      where: {
        statusPublicacao: { not: "ARQUIVADA" },
      },
      orderBy: [{ tipo: "asc" }, { titulo: "asc" }],
      select: {
        id: true,
        titulo: true,
        slug: true,
        tipo: true,
        ativo: true,
        statusPublicacao: true,
      },
    }),
  ]);

  return (
    <VitrinesInteligentesClient
      sugestoes={sugestoesRaw.map(serializarVitrineInteligente)}
      paginas={paginas}
      filtroInicial={params}
    />
  );
}
