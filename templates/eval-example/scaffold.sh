#!/usr/bin/env bash
# Runs in the empty workspace, as you, only under --scaffold. Seed whatever the case needs.
set -euo pipefail
git init -q .
mkdir -p src intent
printf 'export const settings = { theme: "light" };\n' > src/settings.js
# … and whatever else the case's situation requires
