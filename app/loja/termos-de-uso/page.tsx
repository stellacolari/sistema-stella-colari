import type { Metadata } from "next";
import LegalPageShell, { gerarMetadataLegalGerenciada } from "@/app/loja/legal-page-shell";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return gerarMetadataLegalGerenciada({
    slug: "termos-de-uso",
    title: "Termos de Uso | Stella Colari",
    description: "Condições gerais para uso da loja online Stella Colari.",
  });
}

export default function TermosDeUsoPage() {
  return (
    <LegalPageShell
      slug="termos-de-uso"
      title="Termos de Uso"
      description="Estas condicoes orientam a navegacao, a escolha de produtos e o relacionamento com a loja online Stella Colari."
      sections={[
        {
          title: "Uso da loja",
          paragraphs: [
            "Ao navegar pela loja, a cliente se compromete a informar dados corretos e a utilizar os recursos disponiveis de forma adequada.",
            "As imagens, descricoes e valores apresentados devem ser conferidos no momento da compra, pois podem variar conforme disponibilidade, configuracao do produto e campanhas ativas.",
          ],
        },
        {
          title: "Produtos e disponibilidade",
          paragraphs: [
            "As pecas exibidas na loja estao sujeitas a disponibilidade de estoque e validacao operacional.",
            "Caracteristicas como tamanho, acabamento, embalagem e adicionais devem ser revisadas antes da finalizacao do pedido.",
          ],
        },
        {
          title: "Pedidos",
          paragraphs: [
            "O pedido e registrado com os dados fornecidos pela cliente e pode depender de confirmacao de pagamento, separacao e preparo.",
            "Em caso de inconsistencia de dados ou indisponibilidade, a loja podera entrar em contato pelos canais oficiais informados pela cliente.",
          ],
        },
      ]}
    />
  );
}
