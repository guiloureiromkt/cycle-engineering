---
name: task-graph
description: Use before splitting work between agents, before accepting an "and then" between two steps, and when writing the "Shape of the work" section of a plan.
---

# Task graph

Split only what splits: pieces that **never read each other's result**. Sequential work stays with one agent. Coordinated teams gain on what divides and lose on what is sequential; without a single merge owner, errors amplify.

- **False edge:** does the next step really read the previous result? If not, the arrow is false and both run together.
- **Separate verifier:** required when the slice touches money, hours, permission, schema, destructive data or a user surface. Otherwise inline review is enough.
- **Human gate:** where the error is expensive to undo (deploy, destructive migration, sending outside, wipe). Not on every step. Judge by a number that does not argue (a test that ran, a healthy container), never by the agent's self-report.
- **Merge owner:** always one, the main session.

More agents is not a strategy. The shape of the work decides.
