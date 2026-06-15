import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarItemAdicional } from "../actions";
import ImageUploadCrop from "@/components/ui/ImageUploadCrop";

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

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default async function EditarItemAdicionalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await prisma.itemAdicional.findUnique({
    where: { id },
  });

  if (!item) {
    notFound();
  }

  const actionAtualizar = atualizarItemAdicional.bind(null, item.id);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Insumos e Embalagens
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Editar item adicional
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Atualize os dados do insumo físico controlado em estoque.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/insumos-embalagens"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Central de insumos
            </Link>

            <Link
              href="/itens-adicionais"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Voltar para lista
            </Link>
          </div>
        </div>
      </div>

      <form action={actionAtualizar} className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Identificação</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Código interno">
                <input
                  value={item.codigoInterno}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              <Field label="Código do fornecedor">
                <input
                  name="codigoFornecedor"
                  defaultValue={item.codigoFornecedor || ""}
                  placeholder="REF-001"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Nome do insumo físico" className="md:col-span-2">
                <input
                  name="nome"
                  defaultValue={item.nome}
                  placeholder="Tag, cartela, caixa, laço, papel, saco..."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Fornecedor padrão">
                <select
                  name="fornecedorPadrao"
                  defaultValue={item.fornecedorPadrao}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option>MONSUR</option>
                  <option>PRINTI</option>
                  <option>FORNITURA SOLER</option>
                  <option>OUTRO</option>
                </select>
              </Field>

              <Field label="Custo base">
                <input
                  name="custoBase"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={String(item.custoBase)}
                  placeholder="1.67"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Apoio</h2>

            <div className="mt-5 grid gap-4">
              <Field label="Link de compra">
                <input
                  name="linkCompra"
                  defaultValue={item.linkCompra || ""}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Observações">
                <textarea
                  name="observacoes"
                  defaultValue={item.observacoes || ""}
                  rows={4}
                  placeholder="Anotações internas sobre este insumo físico"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/itens-adicionais"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Salvar alterações
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Imagem</h2>

            <div className="mt-5">
              <ImageUploadCrop
                name="imagemCropData"
                initialImage={item.imagemUrl}
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Resumo</h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Custo atual
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {moeda(Number(item.custoBase))}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {item.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
