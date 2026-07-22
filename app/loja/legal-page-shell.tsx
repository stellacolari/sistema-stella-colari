import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import {
  StorePageHeader,
  StoreSectionHeader,
} from "@/components/loja/StorefrontPrimitives";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalPageShellProps = {
  title: string;
  description: string;
  sections: LegalSection[];
};

export default async function LegalPageShell({
  title,
  description,
  sections,
}: LegalPageShellProps) {
  const [menus, categoriasMenu, configuracaoMenuRodape] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),
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
            Conteudo provisorio para preparacao de lancamento. Canais oficiais,
            prazos, dados cadastrais e politicas comerciais devem ser revisados
            pela Stella Colari antes da publicacao final.
          </p>
        </div>
      </main>

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
