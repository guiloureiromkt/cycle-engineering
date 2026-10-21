# Routes: where the diagnosis sends the work

The diagnosis ends by naming a **route** (`route:` in the intent) and why, in one sentence. The route decides which stages and which skills carry the work; the kind, the size and the stakes are decided before it.

| `route:` | When | Where it goes |
|---|---|---|
| `software` | the result is code, a service, an integration, a fix | the code stages: spec, plan, build, test, deploy |
| `marketing` | the result is a brand, a message, a channel, an audience | a forja, when the person's plugins provide one: **Alma** (who you are), **Estratégia** (what to do), **Campo de Batalha** (how, per channel), **Faísca**, **Narrativa**, **Expressa**. The forja reads and writes the Master Brief at the `master_brief` path (same file, same section numbers), so there is no second brief |
| `other` | a page, a routine, a note, a decision, anything that is neither | the generic stages (intent, research in rounds, plan, proof by kind) with the mentor layer when the person is a mentee |

## Rules
- **The diagnosis names the route and says why in one sentence** ("this is marketing: you are asking what to say to whom"). The person can correct it.
- **A forja that is not installed is said so, and the generic route continues.** The route never blocks: "the strategy forja is not here; I will take the generic path and keep the Master Brief ready for it".
- **The forjas live in their own public package, `guiloureiromkt/forjas`** (`/plugin marketplace add guiloureiromkt/forjas`, then `/plugin install forjas@forjas`; the skills are `/forjas:alma`, `/forjas:estrategia`, `/forjas:campo-de-batalha` and `/forjas:expressa`). Faísca and Narrativa are not public yet. The forjas are not copied into this repository; what this repository carries is their common grammar, in `skills/using-cycle/references/mentor-layer.md`.
- **`route:` is not `path:`.** `path:` says how well the way is known (known, someone-knows, nobody-knows, split); `route:` says where the work goes.
