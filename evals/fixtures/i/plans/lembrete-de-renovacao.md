---
type: plan
status: accepted
spec: specs/lembrete-de-renovacao.md
intent: intent/lembrete-de-renovacao.md
research: research/lembrete-de-renovacao.md
date: 2026-09-10
accepted_by: Dona do produto · 2026-09-10 · "aceito"
gates: [graph, advocate, pre-mortem, council, loop]
---
# Plano: lembrete de renovação

**Objetivo:** um lote diário que avisa quem vence em 7 dias, uma vez por vencimento.

## Council demands absorbed (gate 4)
1. Segurança: o lote nunca lê e-mail de quem cancelou.
2. Dados: a marca de envio é escrita antes da chamada ao provedor.
3. Produto: o texto do e-mail diz a data exata do vencimento.

## Risks (gates 2, 3 and 4 · advocate · pre-mortem · council)
| Risco | Severidade | Origem | Teste barato antes de construir |
|---|---|---|---|
| Reenvio diário para a mesma pessoa | 🔴 | advogado | rodar o lote duas vezes no fixture |
| O provedor cai e o lote trava no meio | 🟠 | pre-mortem | falhar o envio de propósito e conferir a marca |

### Tarefa 1: a seleção do lote
- [x] **Passo 1:** teste vermelho com assinaturas de 6, 7 e 8 dias.
- [x] **Passo 2:** `selecionarLote()` em `src/lembretes.js`.

### Tarefa 2: a marca de envio
- [x] **Passo 1:** teste que roda o lote duas vezes e espera um envio.
- [x] **Passo 2:** grava a marca antes de chamar o provedor.

## Deviations during the build
- `src/relogio.js` foi criado (não estava na tabela de arquivos): o teste precisava de uma data fixa, e ler `Date.now()` dentro do lote deixava o teste dependente do dia em que roda.
- A marca de envio virou uma coluna em vez de um arquivo à parte: a tabela já existia e um arquivo novo criaria dois lugares para a mesma verdade.

## Proof (gate 5 · loop)
`npm test` verde, incluindo o teste que roda o lote duas vezes.
