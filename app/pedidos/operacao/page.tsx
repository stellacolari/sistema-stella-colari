import type { Metadata } from "next";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { montarPainelOperacionalPedidos } from "@/lib/pedidos/painel-operacional";
import PainelOperacionalPedidos from "@/components/pedidos/PainelOperacionalPedidos";

export const metadata: Metadata = {
  title: "Operacao de Pedidos | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function OperacaoPedidosPage() {
  await exigirAdminComPermissao("pedidos", "ver");

  const data = await montarPainelOperacionalPedidos();

  return <PainelOperacionalPedidos data={data} />;
}
