export default function LojaLoading() {
  return (
    <main
      className="store-flow min-h-[70vh] bg-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="store-page-content py-16 sm:py-24">
        <p className="store-eyebrow">Loja online</p>
        <h1 className="mt-4 max-w-3xl">Preparando sua experiência</h1>
        <p className="store-page-lead">Carregando a página selecionada.</p>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[4/5] bg-[var(--brand-blue-soft)]" />
              <div className="mt-4 h-3 w-3/4 bg-black/10" />
              <div className="mt-2 h-3 w-1/3 bg-black/10" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando conteúdo da loja.</span>
    </main>
  );
}
