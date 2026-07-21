export type ProdutoPublicoTamanho = {
  tamanhoAnel: string;
  disponivel: boolean;
};

export type ProdutoPublico = {
  id: string;
  nome: string;
  imagemUrl: string | null;
  imagemHoverUrl: string | null;
  categoria: string;
  categoriaIds: string[];
  categoriaSlugs: string[];
  categoriaNomes: string[];
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  disponivel: boolean;
  criadoEm: string;
  tamanhosDisponiveis: ProdutoPublicoTamanho[];
};
