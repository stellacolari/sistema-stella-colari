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
    },
  });

return (
  <main className="space-y-6">
    <LojaConfigHeader
      title="Categorias da loja"
      description="Organize categorias, subcategorias, imagens, descrições e exibição no menu público."
    />

    <CategoriasLojaClient categoriasIniciais={categorias} />
  </main>
)}
