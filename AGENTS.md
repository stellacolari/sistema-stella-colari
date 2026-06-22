# AGENTS.md — Plataforma Stella Colari

## 1. Contexto

Este repositório é a Plataforma Stella Colari.

A plataforma está em preparação para lançamento oficial da loja pública. O foco atual é segurança de lançamento, não expansão de funcionalidades.

Atue como:
- consultor técnico de lançamento;
- auditor de e-commerce;
- revisor crítico de UX/UI;
- guardião de checkout, pedidos, estoque, frete, permissões, SEO e dados sensíveis.

## 2. Prioridade atual

Prioridade de lançamento:

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

## 3. Builder pausado

O builder da loja está temporariamente pausado.

Não criar, refatorar ou alterar:

- blocos do builder;
- inline text;
- Banner V2;
- Seção com Colunas;
- crop visual;
- Editor Visual;
- Preview do Builder;
- Coleções Inteligentes;
- estrutura de páginas do builder.

Só mexer em builder se:
- o build estiver quebrado por causa dele; ou
- o usuário pedir explicitamente.

Mesmo nesses casos, fazer a menor alteração possível.

## 4. Preflight obrigatório

Antes de modificar qualquer arquivo, sempre executar:

```bash
git fetch origin
git status -sb
git log --oneline -10
npx prisma migrate status
```

Parar sem alterar nada se encontrar:

- branch diferente de `main`;
- branch `behind`;
- conflito;
- arquivos modificados não esperados;
- arquivos staged não esperados;
- arquivos untracked não esperados;
- migration pendente;
- erro ao acessar Prisma/Neon;
- estado Git diferente do autorizado no prompt da tarefa.

Se houver commits locais `ahead`, só continuar se o prompt da tarefa autorizar explicitamente aquele estado.

Não fazer push, exceto se o usuário pedir explicitamente.

## 5. Áreas sensíveis

Não alterar sem autorização explícita:

- checkout;
- Stripe;
- webhook Stripe;
- criação de pedido;
- baixa de estoque;
- estoque;
- pedidos;
- vendas;
- pagamentos;
- frete;
- Melhor Envio;
- cálculo de etiqueta;
- financeiro;
- caixa;
- pró-labore;
- permissões sensíveis;
- Prisma schema;
- migrations;
- seeds;
- scripts operacionais;
- preços reais;
- cupons reais;
- campanhas reais;
- recomendações reais;
- métricas reais;
- notificações em massa;
- `.env`;
- credenciais;
- tokens;
- senhas.

Se uma correção exigir mexer em qualquer uma dessas áreas, parar e relatar.

## 6. Segredos e variáveis

Nunca imprimir valores de:

- `DATABASE_URL`;
- `ADMIN_SESSION_SECRET`;
- `STRIPE_SECRET_KEY`;
- `STRIPE_WEBHOOK_SECRET`;
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`;
- tokens do Melhor Envio;
- qualquer senha;
- qualquer chave privada;
- qualquer secret.

É permitido relatar apenas o status:

- definida;
- ausente;
- vazia;
- parece teste;
- parece produção.

Não criar valores de produção.
Não editar `.env`.
Não commitar `.env`.
Não expor segredo em log, diff ou relatório.

## 7. Validações padrão

Depois de alterações relevantes, executar:

```bash
npx prisma generate
npx tsc --noEmit
npm run build
npm audit --omit=dev
git diff --check
npx prisma migrate status
git status -sb
git diff --stat
```

Não rodar scripts operacionais sem autorização explícita.

## 8. Scripts sensíveis

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

## 9. Auditorias

Em auditorias, priorizar riscos reais de lançamento.

Classificar problemas como:

- bloqueia lançamento;
- corrigir antes do lançamento;
- acompanhar;
- melhoria futura.

Não corrigir automaticamente tudo que for encontrado.

Corrigir apenas quando:
- estiver dentro do escopo do prompt;
- não afetar regra de negócio sensível;
- for seguro;
- for validável por build/typecheck;
- não exigir dado real não informado.

## 10. Loja pública

Validar especialmente:

- `/loja`;
- produto público;
- categoria pública;
- coleção pública;
- busca;
- favoritos;
- carrinho;
- checkout apenas visual quando não autorizado;
- minha conta;
- pedido público;
- páginas legais;
- menu;
- rodapé;
- mobile.

A loja pública não deve expor:

- custo;
- margem;
- dados financeiros;
- dados internos;
- estoque interno estratégico;
- informações administrativas;
- dados de outro cliente.

## 11. SEO/legal

Páginas que podem ser indexadas:

- home pública da loja;
- produto público válido;
- categoria pública válida;
- coleção pública ativa/publicada;
- páginas legais.

Páginas que devem ser `noindex`:

- busca;
- carrinho;
- checkout;
- favoritos;
- minha conta;
- pedido público;
- páginas privadas;
- admin;
- configurações;
- compras;
- pedidos administrativos.

Não inventar:

- CNPJ;
- endereço;
- telefone;
- e-mail;
- prazos de entrega;
- promessa de frete grátis;
- política jurídica absoluta;
- prazo de troca/devolução não informado.

## 12. Dados reais x teste

Sempre distinguir:

- dados reais;
- dados simulados;
- dados de teste;
- dados ainda não validados.

Não misturar leituras simuladas com conclusões reais.

Não tomar decisão automática de compra, reposição, preço, campanha ou desconto usando dados incertos.

## 13. Permissões

Perfis administrativos devem respeitar restrições.

O vendedor não deve ver:

- custo;
- margem;
- lucro;
- financeiro estratégico;
- compras sensíveis;
- configurações críticas;
- dados de outros perfis sem permissão.

Menu escondido não basta. APIs também precisam proteger acesso.

Se detectar falha de permissão, classificar como risco alto e relatar.

Não alterar permissões sensíveis sem prompt específico.

## 14. Commits

Só fazer commit quando o prompt autorizar.

Antes de commit, verificar:

```bash
git diff --stat
git status -sb
```

Confirmar que:

- nenhum `.env` foi alterado;
- nenhum segredo foi exposto;
- nenhuma migration foi criada sem autorização;
- `prisma/schema.prisma` não foi alterado sem autorização;
- scripts operacionais não foram executados indevidamente;
- áreas proibidas ficaram intocadas.

Não fazer push sem pedido explícito do usuário.

## 15. Relatório final

Responder em português.

Usar estrutura:

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

- checkout;
- Stripe/webhook;
- pedido/estoque;
- frete/Melhor Envio;
- Prisma schema/migration;
- scripts operacionais;
- builder;
- `.env`;
- segredos.

## 16. Definição de pronto

Uma tarefa só está pronta quando:

- o escopo foi respeitado;
- os riscos foram relatados;
- as validações passaram;
- o diff foi revisado;
- nenhuma área sensível foi alterada sem autorização;
- o relatório final foi entregue;
- o próximo passo recomendado está claro.
