"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MenuPublicoLoja, {
  type CategoriaMenuPublicoItem,
  type MenuPublicoItem,
} from "./MenuPublicoLoja";
import ProdutoCardLoja, {
  type ProdutoCardLojaItem,
} from "./ProdutoCardLoja";
import RodapePublicoLoja from "./RodapePublicoLoja";
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

  useEffect(() => {
    function atualizarFavoritos() {
      setFavoritosIds(lerFavoritosIds());
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
    <div className="min-h-screen bg-white text-[#27251f]">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
        mostrarFavoritos
      />

      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-12 border-b border-[#27251f]/20 pb-8 sm:mb-16 sm:pb-10">
          <h1 className="text-4xl font-normal uppercase leading-none tracking-[-0.04em] text-[#27251f] sm:text-6xl">
            Meus favoritos
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-[#645e54] sm:text-base">
            Veja os produtos que você marcou como favoritos. Toque no coração para adicionar ou remover favoritos enquanto explora a loja.
          </p>
        </div>

        {produtosFavoritos.length === 0 ? (
          <div className="border-y border-[#27251f]/20 py-16 text-center sm:py-20">
            <p className="mx-auto max-w-2xl text-xl font-normal uppercase leading-snug tracking-[-0.02em] text-[#27251f]">Você ainda não adicionou nenhum produto aos favoritos.</p>
            <p className="mt-4 text-sm text-[#645e54]">Salve produtos para encontrar rapidamente depois.</p>
            <Link
              href="/loja"
              className="mt-8 inline-flex min-h-11 items-center justify-center border border-[#27251f] bg-[#27251f] px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#3b3831] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#27251f]"
            >
              Voltar para a loja
            </Link>
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {produtosFavoritos.map((produto) => (
              <ProdutoCardLoja key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </main>

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
