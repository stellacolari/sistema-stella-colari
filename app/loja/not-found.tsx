import Link from "next/link";
import { Search } from "lucide-react";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";

export default async function LojaNotFound() {
  const [menus, categoriasMenu, configuracaoMenuRodape] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),
  ]);

  return (
    <div className="store-flow min-h-screen bg-white text-[#171916]">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
        mostrarFavoritos
      />

      <main className="store-page-content py-16 sm:py-24">
        <section className="store-empty-state">
          <p className="store-eyebrow">Página não encontrada</p>
          <h1 className="store-empty-state__title mt-4">Vamos encontrar outro caminho</h1>
          <p className="store-empty-state__description">
            Esta página não está disponível. Explore a loja ou busque pela peça
            que deseja encontrar.
          </p>
          <div className="store-empty-state__action flex flex-wrap justify-center gap-3">
            <Link
              href="/loja"
              className="brand-button inline-flex min-h-12 items-center justify-center px-6 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Voltar para a loja
            </Link>
            <Link
              href="/loja/busca"
              className="brand-button-outline inline-flex min-h-12 items-center justify-center gap-2 px-6 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar peças
            </Link>
          </div>
        </section>
      </main>

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
