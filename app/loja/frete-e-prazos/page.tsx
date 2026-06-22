import type { Metadata } from "next";
import LegalPageShell from "@/app/loja/legal-page-shell";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Frete e Prazos | Stella Colari",
  description:
    "Informacoes gerais sobre envio, retirada e prazos da loja Stella Colari.",
  path: "/loja/frete-e-prazos",
});

export default function FreteEPrazosPage() {
  return (
    <LegalPageShell
      title="Frete e Prazos"
      description="Os prazos e valores de entrega podem variar conforme endereco, modalidade escolhida, preparo do pedido e disponibilidade operacional."
      sections={[
        {
          title: "Calculo de frete",
          paragraphs: [
            "Quando disponivel, o frete e calculado durante a compra com base nos dados informados no carrinho ou no checkout.",
            "Valores e modalidades exibidos devem ser conferidos antes da finalizacao do pedido.",
          ],
        },
        {
          title: "Prazos",
          paragraphs: [
            "O prazo apresentado pode considerar separacao, embalagem, confirmacao de pagamento e transporte.",
            "Nao ha prazo fixo universal nesta pagina; a previsao aplicavel deve ser consultada no pedido ou nos canais oficiais.",
          ],
        },
        {
          title: "Retirada e acompanhamento",
          paragraphs: [
            "Caso a retirada local esteja disponivel, as instrucoes devem ser confirmadas pela loja antes do comparecimento.",
            "Pedidos com envio podem receber atualizacoes de status e rastreio quando esses dados estiverem disponiveis.",
          ],
        },
      ]}
    />
  );
}
