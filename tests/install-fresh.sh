#!/usr/bin/env bash
# cycle-engineering · proves a fresh machine can add this repo as a marketplace and install the plugin.
# A throwaway HOME isolates the run from the user's own Claude Code config. Run after the plugin manifest is final.
set -euo pipefail
repo=$(git rev-parse --show-toplevel)
tmp_home=$(mktemp -d)
trap 'rm -rf "$tmp_home"' EXIT
HOME="$tmp_home" claude plugin marketplace add "$repo"
HOME="$tmp_home" claude plugin install cycle@cycle-engineering
HOME="$tmp_home" claude plugin details cycle | grep -q "Skills (" && echo OK
