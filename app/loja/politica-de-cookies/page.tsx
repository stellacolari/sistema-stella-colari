import type { Metadata } from "next";
import LegalPageShell, {
  gerarMetadataLegalGerenciada,
} from "@/app/loja/legal-page-shell";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return gerarMetadataLegalGerenciada({
    slug: "politica-de-cookies",
    title: "Política de Cookies | Stella Colari",
    description:
      "Informações técnicas sobre cookies, armazenamento local e preferências na loja Stella Colari.",
  });
}

export default function PoliticaDeCookiesPage() {
  return (
    <LegalPageShell
      slug="politica-de-cookies"
      title="Política de Cookies"
      description="Esta página descreve os recursos de navegador usados atualmente pela loja e como você pode controlar as categorias opcionais."
      sections={[
        {
          title: "Recursos essenciais",
          paragraphs: [
            "A loja usa cookies próprios e protegidos para sessões administrativas, login do cliente e acesso seguro a um pedido. Esses cookies são essenciais, usam HttpOnly, SameSite=Lax e Secure em produção, e não podem ser desativados pelo painel de preferências.",
            "O carrinho é salvo no armazenamento local do navegador para manter os itens durante a navegação. O registro da própria escolha de privacidade também é essencial para respeitar a decisão informada.",
          ],
        },
        {
          title: "Analytics e personalização",
          paragraphs: [
            "Analytics é opcional. Quando autorizado, a loja cria um identificador técnico aleatório no navegador e registra eventos limitados de navegação e funil, sem enviar e-mail, telefone, documento ou endereço nesses eventos.",
            "Personalização é opcional. Quando autorizada, favoritos e buscas recentes podem ser mantidos no armazenamento local do navegador.",
            "Ao rejeitar ou revogar essas categorias, os identificadores e históricos opcionais mantidos pela aplicação neste navegador são removidos. A revogação não apaga registros operacionais ou legais que já precisem ser preservados por outra finalidade.",
          ],
        },
        {
          title: "Marketing e terceiros",
          paragraphs: [
            "Nenhuma tecnologia de publicidade ou marketing comportamental está ativa nesta versão da loja. Por isso, a categoria Marketing permanece indisponível.",
            "Stripe, Melhor Envio, ViaCEP, Vercel, Vercel Blob e o provedor de banco podem receber dados estritamente necessários quando seus respectivos fluxos são usados. Esses serviços têm políticas e responsabilidades próprias; a Stella Colari deve manter a revisão contratual e documental desses operadores.",
          ],
        },
        {
          title: "Como controlar",
          paragraphs: [
            "No banner, Aceitar todos e Rejeitar não essenciais têm o mesmo destaque. A opção Configurar permite escolher Analytics e Personalização separadamente.",
            "A escolha pode ser revista a qualquer momento pelo link Preferências de privacidade no rodapé. Também é possível apagar os dados do site nas configurações do próprio navegador.",
          ],
        },
      ]}
    />
  );
}
