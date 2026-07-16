#!/usr/bin/env bash
set -euo pipefail

file_path=$(jq -r '.tool_input.file_path // empty')

case "$file_path" in
  *backend/src/modules/*/*.routes.ts|*backend/src/db/schema.ts|*backend/src/docs/openapi.ts)
    jq -n --arg msg "Reminder: check whether this change requires updating docs/features.md (Shipped/Backlog section), docs/architecture.md, or backend/src/docs/openapi.ts to stay in sync -- see .claude/skills/academy-backend-module/SKILL.md and .claude/skills/academy-db-migration/SKILL.md for what's supposed to be kept current." \
      '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
    ;;
esac
