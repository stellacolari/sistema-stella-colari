import type { Metadata } from "next";
import LegalPageShell from "@/app/loja/legal-page-shell";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Contato | Stella Colari",
  description:
    "Orientacoes para atendimento da loja online Stella Colari.",
  path: "/loja/contato",
});

export default function ContatoPage() {
  return (
    <LegalPageShell
      title="Contato"
      description="Para suporte sobre produtos, pedidos, pagamentos ou entrega, utilize os canais oficiais publicados pela Stella Colari."
      sections={[
        {
          title: "Atendimento",
          paragraphs: [
            "Antes de solicitar atendimento, tenha em maos o codigo do pedido, nome usado na compra e uma descricao objetiva da duvida.",
            "A loja deve revisar e publicar os canais oficiais antes do lancamento, como e-mail, telefone, WhatsApp ou redes sociais, sem dados provisorios.",
          ],
        },
        {
          title: "Pedidos",
          paragraphs: [
            "Para duvidas sobre uma compra ja realizada, informe o codigo do pedido e o status exibido na pagina de acompanhamento.",
            "Mensagens sobre troca, devolucao, entrega ou pagamento podem depender de verificacao operacional.",
          ],
        },
        {
          title: "Produtos",
          paragraphs: [
            "Para orientacao sobre tamanho, combinacoes, embalagem ou disponibilidade, consulte a pagina do produto e os canais oficiais de atendimento.",
            "Informacoes comerciais finais devem ser validadas pela equipe da Stella Colari antes da publicacao.",
          ],
        },
      ]}
    />
  );
}
