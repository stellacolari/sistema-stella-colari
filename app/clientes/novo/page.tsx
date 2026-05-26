import Link from "next/link";
import { criarCliente } from "../actions";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

export default function NovoClientePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Clientes
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Novo Cliente
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Cadastre um novo cliente com documento, telefone e tipo.
            </p>
          </div>

          <Link
            href="/clientes"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Voltar para lista
          </Link>
        </div>
      </div>

      <form action={criarCliente} className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Informações principais</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Código do cliente">
                <input
                  value="Gerado automaticamente ao salvar"
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              <Field label="Tipo de cliente">
                <select
                  name="tipoCliente"
                  defaultValue=""
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="">Selecione</option>
                  <option>PESSOA FÍSICA</option>
                  <option>REVENDEDORA</option>
                  <option>LOJA FISICA</option>
                </select>
              </Field>

              <Field label="Nome" className="md:col-span-2">
                <input
                  name="nome"
                  placeholder="Nome do cliente"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Telefone">
                <input
                  name="telefone"
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Email">
                <input
                  name="email"
                  placeholder="email@cliente.com"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Documento" className="md:col-span-2">
                <input
                  name="documento"
                  placeholder="CPF / Documento"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Endereço</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="CEP">
                <input
                  name="cep"
                  placeholder="00000-000"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Número">
                <input
                  name="numero"
                  placeholder="123"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Rua" className="md:col-span-2">
                <input
                  name="rua"
                  placeholder="Rua / Avenida"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Observações</h2>

            <div className="mt-5">
              <textarea
                name="observacoes"
                rows={4}
                placeholder="Observações internas sobre este cliente"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
              />
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/clientes"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Salvar cliente
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Resumo</h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status inicial
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  NOVO
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Validação
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  O sistema impedirá duplicidade por telefone, email e documento.
                </p>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}