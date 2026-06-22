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
    <div className="min-h-screen bg-slate-50">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
        mostrarFavoritos
      />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Meus favoritos
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
            Veja os produtos que você marcou como favoritos. Toque no coração para adicionar ou remover favoritos enquanto explora a loja.
          </p>
        </div>

        {produtosFavoritos.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-950">Você ainda não adicionou nenhum produto aos favoritos.</p>
            <p className="mt-3 text-sm text-slate-600">Salve produtos para encontrar rapidamente depois.</p>
            <Link
              href="/loja"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Voltar para a loja
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
