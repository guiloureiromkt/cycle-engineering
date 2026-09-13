#!/usr/bin/env bash
# Runs in the empty workspace, as you, only under --scaffold. Seeds the fixture this case needs.
set -euo pipefail
node "$(dirname "$0")/../run.mjs" --assemble 0008-council-all-agree --out "$PWD"
