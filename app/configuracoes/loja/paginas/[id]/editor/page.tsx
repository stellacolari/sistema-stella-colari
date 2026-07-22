import { redirect } from "next/navigation";

export default async function EditorVisualRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/configuracoes/loja/conteudo/paginas/${id}`);
}
