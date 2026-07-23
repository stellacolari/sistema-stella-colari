"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import MenuPublicoLoja, {
  type CategoriaMenuPublicoItem,
  type MenuPublicoItem,
} from "./MenuPublicoLoja";
import ProdutoCardLoja, {
  type ProdutoCardLojaItem,
} from "./ProdutoCardLoja";
import RodapePublicoLoja from "./RodapePublicoLoja";
import {
  StoreEmptyState,
  StorePageHeader,
} from "./StorefrontPrimitives";
import { FAVORITOS_UPDATED_EVENT, lerFavoritosIds } from "./favoritos";
import type { ComponentProps } from "react";

type MenuPublicoLojaProps = ComponentProps<typeof MenuPublicoLoja>;

type FavoritosClientProps = {
  produtos: ProdutoCardLojaItem[];
  menus: MenuPublicoItem[];
  categoriasMenu: CategoriaMenuPublicoItem[];
  configuracaoMenuRodape?: MenuPublicoLojaProps["configuracaoMenuRodape"];
};

export default function FavoritosClient({
  produtos,
  menus,
  categoriasMenu,
  configuracaoMenuRodape,
}: FavoritosClientProps) {
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);
  const [favoritosCarregados, setFavoritosCarregados] = useState(false);

  useEffect(() => {
    function atualizarFavoritos() {
      setFavoritosIds(lerFavoritosIds());
      setFavoritosCarregados(true);
    }

    atualizarFavoritos();
    window.addEventListener(FAVORITOS_UPDATED_EVENT, atualizarFavoritos);
    window.addEventListener("storage", atualizarFavoritos);

    return () => {
      window.removeEventListener(FAVORITOS_UPDATED_EVENT, atualizarFavoritos);
      window.removeEventListener("storage", atualizarFavoritos);
    };
  }, []);

  const produtosFavoritos = useMemo(
    () => produtos.filter((produto) => favoritosIds.includes(produto.id)),
    [produtos, favoritosIds]
  );

  return (
    <div className="store-flow min-h-screen bg-white text-[#27251f]">
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
          eyebrow="Sua curadoria"
          title="Meus favoritos"
          description="Reúna aqui as peças que chamaram sua atenção e retome sua seleção quando quiser."
        />

        <section className="store-page-content py-12 sm:py-16">
          {!favoritosCarregados ? (
            <StoreEmptyState
              busy
              icon={<Heart className="h-5 w-5" aria-hidden="true" />}
              title="Carregando sua seleção"
              description="Estamos reunindo as peças que você salvou."
            />
          ) : produtosFavoritos.length === 0 ? (
            <StoreEmptyState
              icon={<Heart className="h-5 w-5" aria-hidden="true" />}
              title="Sua seleção ainda está vazia"
              description="Salve suas peças favoritas para encontrá-las rapidamente depois."
              action={
                <Link
                  href="/loja"
                  className="brand-button inline-flex min-h-12 items-center justify-center px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  Explorar a loja
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
              {produtosFavoritos.map((produto) => (
                <ProdutoCardLoja
                  key={produto.id}
                  produto={produto}
                  imageSizes="(max-width: 1023px) 50vw, 25vw"
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
