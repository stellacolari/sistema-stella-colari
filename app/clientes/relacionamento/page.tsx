import type { Metadata } from "next";
import CrmAcionavelClientes from "@/components/clientes/CrmAcionavelClientes";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { obterCrmAcionavelClientes } from "@/lib/clientes/crm-acionavel";

export const metadata: Metadata = {
  title: "Relacionamento com Clientes | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function RelacionamentoClientesPage() {
  await exigirAdminComPermissao("clientes", "ver");

  const dados = await obterCrmAcionavelClientes();

  return <CrmAcionavelClientes dados={dados} />;
}
