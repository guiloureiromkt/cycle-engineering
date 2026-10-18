# Stakes

A stake is something the intention itself does that is expensive to get wrong. It is read from what the person wants, not from the size of the work: a one-line change can move money, and a big project can carry none. (Not the Floor of `CONSTRAINTS.md`, which is a number that must not drop.)

| id | The intention itself… | Examples | Not a stake |
|---|---|---|---|
| `money` | moves money, or produces a number someone is billed or paid by | a paid campaign, a billing e-mail, a price change, a refund rule, the hours report a client is billed by | reading numbers nobody is billed by |
| `outside` | speaks to people outside on someone's behalf: sends, posts, advertises, replies | a new post, an e-mail to clients, an ad, a reply to a customer | a fix to something already public that a person publishes by hand. Where a timer, a workflow or a connector publishes from the file, the edit is the release, and it is `outside` |
| `permission` | changes who can see or do what | roles, sharing a folder, a key's scope, a login rule, a system that holds other people's personal data | reading who has access |
| `irreversible` | destroys or overwrites data that does not come back | deleting a client's folder, restoring over production, a schema change or migration on shared or production data | deleting a draft that can be recreated |

What a stake does, at any size:
- the size is at least `small`;
- `cycle:plan` adds the council, without asking;
- the action that carries it is the owner's step: the session asks before it and names who presses the button.

Nothing lowers a stake: not the sizing sentence, not an objection, not hurry.

What holds it today. The plugin's hooks hold deploys and destructive shell commands, whatever the diagnosis said. A send or a post that runs as a shell command can be held now: add its command to `.cycle/gate.json → patterns`, and the owner's hand-written approval opens it. Sends, posts, ads and payments through a connector (an MCP server) have no hold yet besides the session asking; that gap has its own intent, `intent/2026-10-17-an-outbound-action-has-a-gate.md`.

What the four stakes do not cover: health claims, children, finance and other regulated sectors are not on this list. When a request touches one, say so in the sentence, size it at least `small`, and let the council's `legal` seat look.

This is the only place the list is written. `cycle:diagnosis`, `cycle:using-cycle` and `cycle:plan` cite this file.
