import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import {
  StorePageHeader,
  StoreSectionHeader,
} from "@/components/loja/StorefrontPrimitives";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import ConteudoPaginaExperience from "@/components/loja/conteudo/ConteudoPaginaExperience";
import { extrairSeoConteudo } from "@/lib/loja/conteudo/contracts";
import { buscarConteudoPublicadoSistema } from "@/lib/loja/conteudo/repository.server";
import { criarMetadataLoja } from "@/lib/loja/seo";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalPageShellProps = {
  slug: string;
  title: string;
  description: string;
  sections: LegalSection[];
};

export default async function LegalPageShell({
  slug,
  title,
  description,
  sections,
}: LegalPageShellProps) {
  const [menus, categoriasMenu, configuracaoMenuRodape, gerenciado] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),
    buscarConteudoPublicadoSistema({ slug }),
  ]);

  return (
    <div className="store-flow min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
        mostrarFavoritos
      />

      <main>
        {gerenciado ? (
          <ConteudoPaginaExperience
            pagina={gerenciado.pagina}
            contrato={gerenciado.publico.contrato}
            conteudo={gerenciado.publico.conteudo}
            produtos={[]}
            categorias={categoriasMenu}
          />
        ) : (
          <>
            <StorePageHeader
              eyebrow="Informações da loja"
              title={title}
              description={description}
            />

            <div className="store-page-content max-w-4xl py-12 sm:py-16">
              <div className="space-y-12">
                {sections.map((section) => (
                  <section key={section.title}>
                    <StoreSectionHeader title={section.title} />
                    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <p className="mt-16 border-t border-slate-200 pt-6 text-xs leading-6 text-slate-500">
                Conteúdo provisório para preparação de lançamento. Canais oficiais,
                prazos, dados cadastrais e políticas comerciais devem ser revisados
                pela Stella Colari antes da publicação final.
              </p>
            </div>
          </>
        )}
      </main>

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}

export async function gerarMetadataLegalGerenciada({
  slug,
  title,
  description,
}: {
  slug: string;
  title: string;
  description: string;
}) {
  const gerenciado = await buscarConteudoPublicadoSistema({ slug });
  const seo = gerenciado ? extrairSeoConteudo(gerenciado.conteudo) : null;

  return criarMetadataLoja({
    title: seo?.title || title,
    description: seo?.description || description,
    path: `/loja/${slug}`,
    canonical: seo?.canonical,
    image: seo?.image,
    robots: gerenciado && !seo?.noindex
      ? { index: true, follow: true }
      : { index: false, follow: false },
  });
}
