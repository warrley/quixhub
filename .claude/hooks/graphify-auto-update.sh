#!/usr/bin/env bash
set -euo pipefail

file_path=$(jq -r '.tool_input.file_path // empty')

case "$file_path" in
  *graphify-out/*) exit 0 ;;
esac

if [ ! -f graphify-out/graph.json ]; then
  exit 0
fi

graphify update . --no-viz >/tmp/graphify-auto-update.log 2>&1 &
disown

exit 0
