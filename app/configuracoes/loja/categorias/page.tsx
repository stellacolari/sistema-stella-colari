import type { Metadata } from "next";
import CategoriasLojaClient from "@/components/configuracoes/loja/CategoriasLojaClient";
import { prisma } from "@/lib/prisma";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
export const metadata: Metadata = {
  title: "Categorias da Loja | Plataforma Stella Colari",
};

export default async function CategoriasLojaPage() {
  const categorias = await prisma.categoriaProduto.findMany({
    where: {
      ativo: true,
    },
    orderBy: [
      {
        ordemMenu: "asc",
      },
      {
        nome: "asc",
      },
    ],
    select: {
      id: true,
      nome: true,
      slug: true,
      categoriaMaeId: true,
      descricao: true,
      imagemUrl: true,
      exibirNoMenu: true,
      ordemMenu: true,
      paginasBuilder: {
        where: {
          tipo: "CATEGORIA",
          statusPublicacao: {
            not: "ARQUIVADA",
          },
        },
        select: {
          id: true,
          ativo: true,
          statusPublicacao: true,
        },
        orderBy: {
          atualizadoEm: "desc",
        },
        take: 1,
      },
    },
  });

  const categoriasClient = categorias.map((categoria) => {
    const paginaBuilder = categoria.paginasBuilder[0] || null;

    return {
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      categoriaMaeId: categoria.categoriaMaeId,
      descricao: categoria.descricao,
      imagemUrl: categoria.imagemUrl,
      exibirNoMenu: categoria.exibirNoMenu,
      ordemMenu: categoria.ordemMenu,
      paginaBuilderId: paginaBuilder?.id || null,
      paginaBuilderAtiva: paginaBuilder?.ativo || false,
      paginaBuilderStatus: paginaBuilder?.statusPublicacao || null,
    };
  });

return (
  <main className="space-y-6">
    <LojaConfigHeader
      title="Categorias da loja"
      description="Organize taxonomia, hierarquia, imagens, menu público e páginas personalizadas de categoria."
    />

    <CategoriasLojaClient categoriasIniciais={categoriasClient} />
  </main>
)}
