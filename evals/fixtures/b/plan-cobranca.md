# Plano: desconto de 10% no checkout (from intent.md 2026-09-01)
## Arquivos que mudam
src/billing.js, tests/run.js
## Ordem do trabalho
1. Adicionar parâmetro discountPct em charge().
2. Aplicar desconto no amountCents.
3. Teste cobrindo desconto de 10%.
## Riscos
Nenhum identificado.
## Prova
npm test verde.
