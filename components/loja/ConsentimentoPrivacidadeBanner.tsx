"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import {
  CATEGORIAS_CONSENTIMENTO,
  CONSENTIMENTO_ABRIR_EVENTO,
  CONSENTIMENTO_ATUALIZADO_EVENTO,
  PREFERENCIAS_PADRAO,
  aceitarSomenteEssenciais,
  aceitarTodosConsentimentos,
  assinarEventoPrivacidade,
  lerConsentimentoPrivacidade,
  resetarConsentimentoPrivacidade,
  salvarConsentimentoPrivacidade,
  type CategoriaConsentimento,
  type PreferenciasConsentimento,
} from "@/lib/loja/consentimento-privacidade";

type ModoBanner = "resumo" | "preferencias";

export default function ConsentimentoPrivacidadeBanner() {
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<ModoBanner>("resumo");
  const [preferencias, setPreferencias] =
    useState<PreferenciasConsentimento>(PREFERENCIAS_PADRAO);

  function carregar() {
    const consentimento = lerConsentimentoPrivacidade();

    setPreferencias(consentimento.preferencias);
    setAberto(!consentimento.escolhido);
    setModo(consentimento.escolhido ? "preferencias" : "resumo");
  }

  useEffect(() => {
    setMontado(true);
    carregar();

    const removerAbrir = assinarEventoPrivacidade(CONSENTIMENTO_ABRIR_EVENTO, () => {
      const consentimento = lerConsentimentoPrivacidade();
      setPreferencias(consentimento.preferencias);
      setModo("preferencias");
      setAberto(true);
    });
    const removerAtualizacao = assinarEventoPrivacidade(
      CONSENTIMENTO_ATUALIZADO_EVENTO,
      carregar
    );

    return () => {
      removerAbrir();
      removerAtualizacao();
    };
  }, []);

  if (!montado || !aberto) {
    return null;
  }

  function fecharSeJaEscolheu() {
    const consentimento = lerConsentimentoPrivacidade();

    if (consentimento.escolhido) {
      setAberto(false);
    }
  }

  function aceitarTodos() {
    const consentimento = aceitarTodosConsentimentos();
    setPreferencias(consentimento.preferencias);
    setAberto(false);
  }

  function somenteEssenciais() {
    const consentimento = aceitarSomenteEssenciais();
    setPreferencias(consentimento.preferencias);
    setAberto(false);
  }

  function alternarCategoria(categoria: CategoriaConsentimento) {
    const configuracao = CATEGORIAS_CONSENTIMENTO.find(
      (item) => item.id === categoria,
    );

    if (categoria === "ESSENCIAL" || configuracao?.disponivel === false) return;

    setPreferencias((current) => ({
      ...current,
      [categoria]: !current[categoria],
      ESSENCIAL: true,
    }));
  }

  function salvarPreferencias() {
    const consentimento = salvarConsentimentoPrivacidade(preferencias);
    setPreferencias(consentimento.preferencias);
    setAberto(false);
  }

  function redefinir() {
    resetarConsentimentoPrivacidade();
    setPreferencias(PREFERENCIAS_PADRAO);
    setModo("resumo");
    setAberto(true);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] max-h-[min(90vh,46rem)] overflow-y-auto border-t border-[#27251f]/20 bg-white/95 backdrop-blur-md"
      role="region"
      aria-label="Preferências de privacidade"
      aria-live="polite"
    >
      <section className="mx-auto max-w-7xl px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center border border-[#27251f]/20 text-[#27251f] sm:flex">
            {modo === "preferencias" ? (
              <SlidersHorizontal className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27251f]">
                  Privacidade na loja
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f5a50]">
                  Usamos recursos essenciais para a compra e, com sua escolha,
                  sinais de experiência para melhorar busca, favoritos e funil.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharSeJaEscolheu}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-transparent text-[#777064] transition hover:border-[#27251f]/25 hover:text-[#27251f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
                aria-label="Fechar preferências de privacidade"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modo === "preferencias" && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORIAS_CONSENTIMENTO.map((categoria) => {
                  const ativo = preferencias[categoria.id];

                  return (
                    <label
                      key={categoria.id}
                      className={`border px-3 py-3 text-sm ${
                        ativo
                          ? "border-[#27251f] bg-[#f3f3f1]"
                          : "border-[#27251f]/20 bg-transparent"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#27251f]">
                          {categoria.titulo}
                        </span>
                        <input
                          type="checkbox"
                          checked={ativo}
                          disabled={
                            categoria.obrigatoria ||
                            categoria.disponivel === false
                          }
                          onChange={() => alternarCategoria(categoria.id)}
                          className="h-4 w-4 accent-[#27251f]"
                        />
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-[#716a5e]">
                        {categoria.descricao}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <Link
                  href="/loja/politica-de-privacidade"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[#665f54] underline-offset-4 transition hover:text-[#27251f] hover:underline"
                >
                  Ver Política de Privacidade
                </Link>
                <Link
                  href="/loja/politica-de-cookies"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[#665f54] underline-offset-4 transition hover:text-[#27251f] hover:underline"
                >
                  Ver Política de Cookies
                </Link>
              </div>

              {modo === "resumo" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={somenteEssenciais}
                    className="inline-flex min-h-10 items-center justify-center border border-[#27251f] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#27251f] transition hover:bg-[#f3f3f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
                  >
                    Rejeitar não essenciais
                  </button>
                  <button
                    type="button"
                    onClick={() => setModo("preferencias")}
                    className="inline-flex min-h-10 items-center justify-center border border-[#27251f]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#3d3931] transition hover:border-[#27251f] hover:bg-[#f3f3f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
                  >
                    Configurar
                  </button>
                  <button
                    type="button"
                    onClick={aceitarTodos}
                    className="inline-flex min-h-10 items-center justify-center border border-[#27251f] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#27251f] transition hover:bg-[#f3f3f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
                  >
                    Aceitar todos
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={redefinir}
                    className="inline-flex min-h-10 items-center justify-center border border-[#27251f]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#716a5e] transition hover:border-[#27251f] hover:bg-[#f3f3f1] hover:text-[#27251f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
                  >
                    Redefinir escolha
                  </button>
                  <button
                    type="button"
                    onClick={somenteEssenciais}
                    className="inline-flex min-h-10 items-center justify-center border border-[#27251f]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#3d3931] transition hover:border-[#27251f] hover:bg-[#f3f3f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
                  >
                    Rejeitar não essenciais
                  </button>
                  <button
                    type="button"
                    onClick={salvarPreferencias}
                    className="inline-flex min-h-10 items-center justify-center border border-[#27251f] bg-[#27251f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#3b3831] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27251f]"
                  >
                    Salvar preferências
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
