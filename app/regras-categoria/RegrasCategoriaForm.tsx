"use client";

import { useMemo, useState } from "react";

type CategoriaRegraOption = {
  id: string;
  nome: string;
  caminho: string;
};

type ItemAdicionalOption = {
  id: string;
  codigoInterno: string;
  nome: string;
};

type RegrasCategoriaFormProps = {
  categorias: CategoriaRegraOption[];
  itensAdicionais: ItemAdicionalOption[];
  criarRegraCategoria: (formData: FormData) => void | Promise<void>;
};

export default function RegrasCategoriaForm({
  categorias,
  itensAdicionais,
  criarRegraCategoria,
}: RegrasCategoriaFormProps) {
  const [aplicarTodas, setAplicarTodas] = useState(false);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    string[]
  >([]);

  const selecionadas = useMemo(
    () => new Set(categoriasSelecionadas),
    [categoriasSelecionadas]
  );

  function selecionarTodas() {
    setAplicarTodas(false);
    setCategoriasSelecionadas(categorias.map((categoria) => categoria.id));
  }

  function limparSelecao() {
    setAplicarTodas(false);
    setCategoriasSelecionadas([]);
  }

  function alternarCategoria(categoriaId: string) {
    setAplicarTodas(false);
    setCategoriasSelecionadas((atuais) =>
      atuais.includes(categoriaId)
        ? atuais.filter((id) => id !== categoriaId)
        : [...atuais, categoriaId]
    );
  }

  return (
    <form action={criarRegraCategoria} className="mt-5 space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Categorias
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
          <input
            name="aplicarTodasCategorias"
            type="checkbox"
            checked={aplicarTodas}
            onChange={(event) => {
              setAplicarTodas(event.target.checked);

              if (event.target.checked) {
                setCategoriasSelecionadas([]);
              }
            }}
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
          />
          Todas as categorias
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selecionarTodas}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Selecionar todas
          </button>

          <button
            type="button"
            onClick={limparSelecao}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Limpar selecao
          </button>
        </div>

        <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
          {categorias.map((categoria) => (
            <label
              key={categoria.id}
              className="flex items-start gap-3 rounded-xl px-3 py-2 text-sm text-slate-800 transition hover:bg-white"
            >
              <input
                type="checkbox"
                checked={!aplicarTodas && selecionadas.has(categoria.id)}
                disabled={aplicarTodas}
                onChange={() => alternarCategoria(categoria.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <span>{categoria.caminho}</span>
            </label>
          ))}
        </div>

        {!aplicarTodas &&
          categoriasSelecionadas.map((categoriaId) => (
            <input
              key={categoriaId}
              type="hidden"
              name="categoriaIds"
              value={categoriaId}
            />
          ))}

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Regras novas podem usar uma ou mais categorias. Regras antigas por
          texto continuam sendo consideradas no calculo.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Item adicional
        </label>

        <select
          name="itemAdicionalId"
          defaultValue=""
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
        >
          <option value="">Selecione</option>

          {itensAdicionais.map((item) => (
            <option key={item.id} value={item.id}>
              {item.codigoInterno} - {item.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Quantidade consumida
        </label>

        <input
          name="quantidade"
          type="number"
          min="1"
          step="1"
          defaultValue={1}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
      >
        Salvar regra
      </button>
    </form>
  );
}
