import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
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
    <div className="min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
        mostrarFavoritos
      />

      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Informacoes da loja
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600">
          {description}
        </p>

        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-slate-950">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-slate-200 pt-6 text-xs leading-6 text-slate-500">
          Conteudo provisorio para preparacao de lancamento. Canais oficiais,
          prazos, dados cadastrais e politicas comerciais devem ser revisados
          pela Stella Colari antes da publicacao final.
        </p>
      </main>

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
