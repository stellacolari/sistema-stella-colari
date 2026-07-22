"use client";

import Link from "next/link";

export default function LojaError({ reset }: { reset: () => void }) {
  return (
    <main className="store-flow min-h-[70vh] bg-white">
      <div className="store-page-content py-16 sm:py-24">
        <section className="store-empty-state" role="alert">
          <p className="store-eyebrow">Não foi possível continuar</p>
          <h1 className="store-empty-state__title mt-4">Tente novamente em instantes</h1>
          <p className="store-empty-state__description">
            O conteúdo desta página não pôde ser carregado agora.
          </p>
          <div className="store-empty-state__action flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="brand-button min-h-12 px-6 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Tentar novamente
            </button>
            <Link
              href="/loja"
              className="brand-button-outline inline-flex min-h-12 items-center justify-center px-6 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Voltar para a loja
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
