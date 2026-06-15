import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PaginaLojaBlocosRedirectPage({
  params,
}: PageProps) {
  const { id } = await params;

  redirect(`/configuracoes/loja/paginas/${id}/editor`);
}
