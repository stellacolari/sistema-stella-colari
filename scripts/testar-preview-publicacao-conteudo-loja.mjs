import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  middleware: await readFile(new URL("../middleware.ts", import.meta.url), "utf8"),
  preview: await readFile(
    new URL("../app/loja/preview/pagina/[id]/page.tsx", import.meta.url),
    "utf8",
  ),
  publication: await readFile(
    new URL("../lib/loja/conteudo/repository.server.ts", import.meta.url),
    "utf8",
  ),
  route: await readFile(
    new URL(
      "../app/api/configuracoes/loja/conteudo/[id]/publicar/route.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  rollbackRoute: await readFile(
    new URL(
      "../app/api/configuracoes/loja/conteudo/[id]/rollback/route.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  revalidate: await readFile(
    new URL("../lib/loja/conteudo/revalidate.server.ts", import.meta.url),
    "utf8",
  ),
  mediaMutation: await readFile(
    new URL("../app/api/configuracoes/loja/midias/[id]/route.ts", import.meta.url),
    "utf8",
  ),
  pageList: await readFile(
    new URL("../app/configuracoes/loja/conteudo/paginas/page.tsx", import.meta.url),
    "utf8",
  ),
  legacyGuard: await readFile(
    new URL("../lib/loja/conteudo/api-auth.server.ts", import.meta.url),
    "utf8",
  ),
};

assert.match(files.preview, /robots:[\s\S]*index:\s*false/);
assert.match(files.middleware, /no-store/);
assert.match(files.preview, /buscarConteudoPreviewPagina/);
assert.match(files.publication, /versaoPublicadaId/);
assert.match(files.publication, /modoEntrega:\s*"NOVO"/);
assert.match(files.publication, /revisaoRascunho:\s*\{\s*increment:\s*1/);
assert.match(files.route, /exigirAcessoConteudo\("executar"\)/);
assert.match(files.route, /validarOrigemMutacao/);
assert.match(files.route, /revalidarConteudoLoja/);
assert.match(files.rollbackRoute, /revalidarConteudoLoja/);
assert.match(files.revalidate, /TEMPLATE_CATEGORIA/);
assert.match(files.revalidate, /PRODUTO_GLOBAL/);
assert.match(files.revalidate, /BUSCA_GLOBAL/);
assert.match(files.revalidate, /LEGAL/);
assert.match(files.mediaMutation, /validarOrigemMutacao/);
assert.match(files.mediaMutation, /payloadDentroDoLimite/);
assert.match(files.pageList, /\?conteudo=1/);
assert.match(files.legacyGuard, /protegerMutacaoConteudoLegado/);
assert.match(files.legacyGuard, /modoEntrega:\s*"NOVO"/);

console.log("Guardas de preview e publicação validadas.");
