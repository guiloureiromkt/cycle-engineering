# Cycle Engineering, em português

> A documentação completa está em inglês: [README.md](README.md). Este arquivo é pra quem vai rodar o primeiro ciclo num repositório próprio.

## O que é isso

SDLC é a sigla em inglês pra "ciclo de vida do desenvolvimento de software": o caminho que um pedido percorre até virar código rodando pra alguém, e depois até a manutenção. Todo time tem um, mesmo quem nunca desenhou o seu. Alguém pede, alguém especifica (ou não), alguém programa, alguém testa (ou não), alguém publica. Durante décadas, o gargalo desse caminho era escrever o código. Era a parte lenta, cara, e a que precisava de gente especializada.

Com um agente como o Claude Code, escrever código deixou de ser o gargalo. Ele produz em minutos o que levava dias. O problema mudou de lugar. Agora o que falta é saber o que pedir, conferir se o que saiu é o que se pediu, e não deixar o agente publicar em produção o que ninguém revisou. Cycle Engineering é um plugin de Claude Code que coloca esse caminho inteiro dentro do seu repositório, em arquivos Markdown que ficam no git, e trava com hooks (scripts que rodam antes de uma ação do agente) os passos que são caros de desfazer. Você continua decidindo. O agente para de decidir sozinho.

O que você recebe: dez skills (uma por etapa, mais o roteador), três agentes revisores, três comandos e cinco hooks. O que não vem: deploy automático, CI, integração com GitHub Actions. Ele organiza e trava. Quem publica continua sendo você.

## Primeiro ciclo em 30 minutos

Você precisa do Claude Code instalado e do Node.js 18 ou mais novo (os hooks rodam em Node). Sem o Node, os portões ficam desligados e o início da sessão avisa.

**Abra o Claude Code dentro do repositório.** Os hooks leem a pasta `.cycle/` do diretório onde a sessão começou, não do repositório que o comando toca. Sessão aberta numa pasta acima, ou no seu vault de notas, que edita e publica este repositório roda sem portão nenhum. Foi assim que o autor rodou um ciclo inteiro, com deploy em produção, sem um hook sequer disparar.

Escolha um repositório seu e um pedido pequeno de verdade: um botão, uma validação, um texto que muda. Não estreie com o pedido grande.

### 1. Instalar

```bash
claude plugin marketplace add guiloureiromkt/cycle-engineering
claude plugin install cycle@cycle-engineering
```

Dois comandos. Nada além disso entra na sua máquina.

### 2. Ligar no repositório

Abra o Claude Code dentro do repositório e rode:

```
/cycle:init
```

Ele cria a pasta `.cycle/` (configuração, padrões de deploy, área de trabalho) e um bloco marcado no seu `CLAUDE.md`. Só isso. Nenhum template é copiado pro seu repositório.

A partir daqui, toda sessão nesse repositório começa dizendo em que etapa do ciclo ele está e qual é o próximo passo.

### 3. Escrever o primeiro intent

Descreva o pedido em uma frase e chame:

```
cycle:intent
```

A skill faz perguntas curtas, em rodadas: o que quebra hoje, pra quem, como você vai saber que resolveu. Ela também varre o repositório e a internet pra ver o que já existe antes de inventar. No fim, grava `intent/<nome>.md`. Você lê e aceita, com seu nome no arquivo (`status: accepted`, `accepted_by`). Sem esse aceite, nada avança.

### 4. Pesquisar antes de especificar

```
cycle:research
```

Ela olha o que já existe dentro do repositório e fora dele, traz três a cinco referências de mercado com o que cada uma faz e uma evidência datada, separa fato de suposição, e termina com uma recomendação de cinco linhas. Fica em `research/<nome>.md`, ao lado do intent. Só o atalho de mudança pequena pula essa etapa, e ele pula a spec junto.

### 5. Spec curta

```
cycle:spec
```

A spec transforma o intent em requisitos que dá pra conferir um por um. Se tiver tela, ela pede uma referência visual antes de qualquer código. Fica em `specs/<nome>.md`. Você aprova (`status: approved`, `approved_by`).

Pra um pedido pequeno, a spec tem meia página. Está certo assim.

### 6. Plano com portões, em modo lite

```
cycle:plan
```

O plano lista as tarefas numeradas, os arquivos que mudam e os riscos. Antes de virar código, ele passa por portões. No modo `lite` (o padrão), um advogado do diabo em contexto separado tenta derrubar o plano. Se o pedido tocar dinheiro, permissão, banco de dados ou tela, a skill pergunta em uma linha se você quer chamar também o conselho de cinco revisores. Você responde sim ou não, e a resposta fica registrada no plano.

Você aceita o plano (`status: accepted`). Só então o agente pode editar código.

### 7. Build e teste

Chame `cycle:build`. Cada tarefa do plano vira um commit. Depois, `cycle:test`: a saída dos testes aparece colada, não descrita, e um verificador em contexto novo roda o que foi construído antes de alguém dizer "pronto".

Deploy e manutenção ficam pra depois do primeiro ciclo. Quando chegar lá: o portão de produção só abre com uma aprovação escrita por você, com a data de hoje, em `.cycle/release-approval`. O agente não consegue escrever esse arquivo.

## O que você vai ver de diferente

- O agente se recusa a editar código sem plano aceito. Se você disser "faz direto, sem perguntas", ele abre a spec em vez de programar.
- Comandos destrutivos (`git reset --hard`, `rm -rf` dentro do repositório, `drop table`) param se não houver uma nota de snapshot da última hora em `.cycle/work/`.
- Se você fechar a sessão com plano aceito e código sem commit, ele avisa. Uma vez a cada meia hora, não a cada mensagem.
- Tudo o que o agente decidiu está em arquivo, no git. Dá pra ler, dá pra discordar, dá pra voltar.

Pra desligar tudo neste repositório: apague a pasta `.cycle/` no seu terminal. O agente é impedido de fazer isso por você.

## Glossário

- **SDLC**: ciclo de vida do desenvolvimento de software. O caminho do pedido até o código em produção e sua manutenção.
- **Intent**: o primeiro arquivo do ciclo (`intent/<nome>.md`). Diz qual é o problema, de quem, e como saber que foi resolvido. Não diz como resolver.
- **Spec**: o segundo arquivo (`specs/<nome>.md`). Lista requisitos que dá pra conferir um a um, e a referência visual quando há tela.
- **Plano**: o terceiro arquivo (`plans/<nome>.md`). Tarefas numeradas, arquivos que mudam, riscos, e o registro dos portões. Só vale com `status: accepted`.
- **Portão (gate)**: um ponto onde o trabalho para até alguém, ou algo, liberar. Pode ser uma pessoa (aceitar o plano), um agente (o advogado do diabo) ou um hook (o de produção).
- **Hook**: um script que o Claude Code roda antes ou depois de uma ação. Aqui, em Node. Pode bloquear a ação (código de saída 2) ou só avisar.
- **Contexto separado**: uma sessão nova do agente, sem a conversa que gerou o trabalho. Quem revisa no próprio contexto não enxerga o próprio erro; por isso o advogado, o conselho e o verificador rodam assim.
- **Verificador**: o agente que, em contexto separado, roda o que foi construído e diz se funciona, antes de a sessão dar por pronto.
