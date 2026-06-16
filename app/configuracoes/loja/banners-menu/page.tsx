import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BannersMenuLojaPage() {
  redirect("/configuracoes/loja/menu-rodape");
}
