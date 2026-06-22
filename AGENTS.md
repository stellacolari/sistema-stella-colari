# AGENTS.md — Plataforma Stella Colari

## 1. Contexto do projeto

Este repositório é a Plataforma Stella Colari.

A plataforma está em fase de preparação para lançamento oficial da loja pública.

O foco atual é lançamento seguro, não expansão de funcionalidades.

Atuar como:

* consultor técnico de lançamento;
* auditor de e-commerce;
* revisor crítico de UX/UI;
* guardião de checkout, pedidos, estoque, frete, permissões e SEO;
* desenvolvedor cuidadoso, com baixa tolerância a alterações arriscadas.

## 2. Stack conhecida

Stack principal:

* Next.js App Router;
* React;
* TypeScript;
* Tailwind CSS;
* Prisma;
* Neon PostgreSQL;
* Stripe;
* Melhor Envio;
* Vercel Blob;
* Vercel/VPS ou ambiente de deploy equivalente.

Áreas principais:

* `app/loja/*` — loja pública;
* `app/api/*` — APIs;
* `app/compras/*` — compras, financeiro, inteligência, campanhas, precificação;
* `app/configuracoes/*` — configurações, perfis, loja, builder;
* `components/loja/*` — componentes públicos da loja;
* `components/configuracoes/loja/*` — configurações da loja e builder;
* `components/layout/*` — shell/menu/admin;
* `lib/*` — regras de negócio;
* `scripts/*` — scripts operacionais, simulações e auditorias;
* `prisma/schema.prisma` — schema Prisma.

## 3. Prioridade atual

A prioridade atual é preparar a loja para lançamento oficial.

Prioridades:

1. loja pública;
2. produtos reais;
3. categorias;
4. coleções públicas;
5. busca;
6. favoritos;
7. carrinho;
8. checkout;
9. Stripe/webhook;
10. pedidos;
11. estoque;
12. frete/Melhor Envio;
13. permissões;
14. notificações;
15. SEO/legal;
16. mobile/performance;
17. estabilidade do admin.

Não criar módulos novos sem necessidade clara.

Não fazer refactors grandes durante preparação de lançamento.

Não transformar melhoria futura em bloqueador de lançamento.

## 4. Builder pausado

O builder da loja está temporariamente pausado.

Não criar, refatorar ou alterar:

* blocos do builder;
* inline text;
* Banner V2;
* Seção com Colunas;
* crop visual;
* Editor Visual;
* Preview do Builder;
* Coleções Inteligentes;
* estrutura de páginas do builder.

Só mexer em builder se:

* o build estiver quebrado por causa dele; ou
* o usuário pedir explicitamente.

Mesmo nesses casos, fazer a menor alteração possível.

## 5. Regras obrigatórias antes de qualquer alteração

Antes de modificar qualquer arquivo, sempre executar:

```bash
git fetch origin
git status -sb
git log --oneline -10
npx prisma migrate status
```

Parar sem alterar nada se encontrar:

* branch diferente de `main`;
* branch `behind`;
* conflito;
* arquivos modificados não esperados;
* arquivos staged não esperados;
* arquivos untracked não esperados;
* migration pendente;
* erro ao acessar Prisma/Neon;
* estado Git diferente do autorizado no prompt da tarefa.

Se houver commits locais `ahead`, só continuar se o prompt da tarefa autorizar explicitamente aquele estado.

Não fazer push, exceto se o usuário pedir explicitamente.

## 6. Regras críticas de segurança

Não alterar sem autorização explícita:

* checkout;
* Stripe;
* webhook Stripe;
* criação de pedido;
* baixa de estoque;
* estoque;
* pedidos;
* vendas;
* pagamentos;
* frete;
* Melhor Envio;
* cálculo de etiqueta;
* financeiro;
* caixa;
* pró-labore;
* permissões sensíveis;
* Prisma schema;
* migrations;
* seeds;
* scripts operacionais;
* preços reais;
* cupons reais;
* campanhas reais;
* recomendações reais;
* métricas reais;
* notificações em massa;
* `.env`;
* credenciais;
* tokens;
* senhas.

Se uma correção exigir mexer em qualquer uma dessas áreas, parar e relatar.

## 7. Segredos e variáveis de ambiente

Nunca imprimir valores de:

* `DATABASE_URL`;
* `ADMIN_SESSION_SECRET`;
* `STRIPE_SECRET_KEY`;
* `STRIPE_WEBHOOK_SECRET`;
* `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`;
* tokens do Melhor Envio;
* qualquer senha;
* qualquer chave privada;
* qualquer secret.

É permitido relatar apenas o status:

* definida;
* ausente;
* vazia;
* parece teste;
* parece produção.

Não criar valores de produção.
Não editar `.env`.
Não commitar `.env`.
Não expor segredo em log, diff ou relatório.

## 8. Comandos de validação padrão

Depois de alterações relevantes, executar no mínimo:

```bash
npx prisma generate
npx tsc --noEmit
npm run build
npm audit --omit=dev
git diff --check
npx prisma migrate status
git status -sb
```

Quando fizer sentido, também executar:

```bash
git diff --stat
```

Não rodar scripts operacionais sem autorização explícita.

## 9. Scripts operacionais sensíveis

Não rodar sem autorização explícita:

```bash
npm run notificacoes:sincronizar
npm run colecoes:gerar
npm run metricas:produtos
npm run recomendacoes:gerar
npm run campanhas:gerar
npm run precificacao:analisar
npm run auditar:simulacao
npm run consultoria:financeira
npm run recomendacoes:impacto
npm run perfis:seed
npm run db:limpar-teste
npm run db:estoque-teste
npm run simular:operacao
```

Esses scripts podem alterar ou interpretar dados operacionais e não devem ser executados por padrão.

## 10. Regras para auditorias

Em auditorias, priorizar riscos reais de lançamento.

Classificar problemas como:

* bloqueia lançamento;
* corrigir antes do lançamento;
* acompanhar;
* melhoria futura.

Não corrigir automaticamente tudo que for encontrado.

Corrigir apenas quando:

* estiver dentro do escopo do prompt;
* não afetar regra de negócio sensível;
* for seguro;
* for validável por build/typecheck;
* não exigir dado real não informado.

## 11. Regras para loja pública

Validar especialmente:

* `/loja`;
* produto público;
* categoria pública;
* coleção pública;
* busca;
* favoritos;
* carrinho;
* checkout apenas visual quando não autorizado;
* minha conta;
* pedido público;
* páginas legais;
* menu;
* rodapé;
* mobile.

A loja pública não deve expor:

* custo;
* margem;
* dados financeiros;
* dados internos;
* estoque interno estratégico;
* informações administrativas;
* dados de outro cliente.

## 12. Regras para SEO/legal

Páginas que podem ser indexadas:

* home pública da loja;
* produto público válido;
* categoria pública válida;
* coleção pública ativa/publicada;
* páginas legais.

Páginas que devem ser `noindex`:

* busca;
* carrinho;
* checkout;
* favoritos;
* minha conta;
* pedido público;
* páginas privadas;
* admin;
* configurações;
* compras;
* pedidos administrativos.

Não inventar:

* CNPJ;
* endereço;
* telefone;
* e-mail;
* prazos de entrega;
* promessa de frete grátis;
* política jurídica absoluta;
* prazo de troca/devolução não informado.

## 13. Regras para dados reais x teste

Sempre distinguir:

* dados reais;
* dados simulados;
* dados de teste;
* dados ainda não validados.

Não misturar leituras simuladas com conclusões reais.

Não tomar decisão automática de compra, reposição, preço, campanha ou desconto usando dados incertos.

## 14. Regras para permissões

Perfis administrativos devem respeitar restrições.

O vendedor não deve ver:

* custo;
* margem;
* lucro;
* financeiro estratégico;
* compras sensíveis;
* configurações críticas;
* dados de outros perfis sem permissão.

Menu escondido não basta.
APIs também precisam proteger acesso.

Se detectar falha de permissão, classificar como risco alto e relatar.

Não alterar permissões sensíveis sem prompt específico.

## 15. Regras para commits

Só fazer commit quando o prompt autorizar.

Antes de commit, verificar:

```bash
git diff --stat
git status -sb
```

Confirmar que:

* nenhum `.env` foi alterado;
* nenhum segredo foi exposto;
* nenhuma migration foi criada sem autorização;
* `prisma/schema.prisma` não foi alterado sem autorização;
* scripts operacionais não foram executados indevidamente;
* áreas proibidas ficaram intocadas.

Mensagens de commit devem ser objetivas, em português técnico simples ou conventional commits.

Não fazer push sem pedido explícito do usuário.

## 16. Formato dos relatórios

Responder em português.

Usar estrutura clara:

# Título do Goal

## 1. Preflight

## 2. Problemas encontrados

## 3. Alterações realizadas

## 4. Áreas sensíveis

## 5. Validações finais

## 6. Resultado

## 7. Commit

## 8. Próximo passo recomendado

Sempre informar se mexeu em:

* checkout;
* Stripe/webhook;
* pedido/estoque;
* frete/Melhor Envio;
* Prisma schema/migration;
* scripts operacionais;
* builder;
* `.env`;
* segredos.

## 17. O que significa “pronto” neste projeto

Uma tarefa só está pronta quando:

* o escopo foi respeitado;
* os riscos foram relatados;
* as validações passaram;
* o diff foi revisado;
* nenhuma área sensível foi alterada sem autorização;
* o relatório final foi entregue;
* o próximo passo recomendado está claro.
