import ComprasEGastosClient from "@/components/compras/ComprasEGastosClient";
import { buscarLancamentosFinanceirosListagem } from "@/lib/compras/listagens";

export const dynamic = "force-dynamic";

export default async function GastosFinanceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const { novo } = await searchParams;
  const lancamentos = await buscarLancamentosFinanceirosListagem();

  return (
    <ComprasEGastosClient
      lancamentos={lancamentos}
      abrirNovoInicial={novo === "1"}
    />
  );
}
