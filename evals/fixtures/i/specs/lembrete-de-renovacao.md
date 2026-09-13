---
type: spec
status: approved
intent: intent/lembrete-de-renovacao.md
research: research/lembrete-de-renovacao.md
date: 2026-09-10
approved_by: Dona do produto · 2026-09-10
---
# Spec: lembrete de renovação

| ID | Requisito | Origem | Como se verifica |
|---|---|---|---|
| R1 | Quem vence em exatamente 7 dias entra no lote do dia | intent | teste com três assinaturas: 6, 7 e 8 dias |
| R2 | Cada pessoa recebe no máximo um aviso por vencimento | research (risco de reenvio) | rodar o lote duas vezes no mesmo dia: um envio |
| R3 | A marca de envio é gravada antes do envio | research | teste em que o envio falha e a marca permanece |
