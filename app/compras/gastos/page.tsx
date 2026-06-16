import ComprasEGastosClient from "@/components/compras/ComprasEGastosClient";
import { buscarLancamentosFinanceirosListagem } from "@/lib/compras/listagens";
import { listarContasFinanceiras } from "@/lib/financeiro/resultado";

export const dynamic = "force-dynamic";

export default async function GastosFinanceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const { novo } = await searchParams;
  const [lancamentos, contasFinanceiras] = await Promise.all([
    buscarLancamentosFinanceirosListagem(),
    listarContasFinanceiras(),
  ]);

  return (
    <ComprasEGastosClient
      lancamentos={lancamentos}
      contasFinanceiras={contasFinanceiras.map((conta) => ({
        id: conta.id,
        nome: conta.nome,
        tipo: conta.tipo,
      }))}
      abrirNovoInicial={novo === "1"}
    />
  );
}
