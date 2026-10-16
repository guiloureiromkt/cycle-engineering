---
name: cycle-weekly-evolve-probe
description: One-shot probe for the cycle weekly routine: prints the working directory, the .cycle listing and the git root of /path/to/cycle-engineering, and nothing else.
---

Replace /path/to/cycle-engineering below with the absolute path of the method repository on this machine. Run exactly these three commands with Bash, print their output verbatim, and stop:

cd /path/to/cycle-engineering && pwd
cd /path/to/cycle-engineering && ls .cycle
cd /path/to/cycle-engineering && git rev-parse --show-toplevel

Do not read, write or change anything else.
