import { redirect } from "next/navigation";

export default async function PaginaLojaRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/configuracoes/loja/conteudo/paginas/${id}`);
}
