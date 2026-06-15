#!/usr/bin/env bash
# UserPromptSubmit hook.
#
# When the user submits a message that reads like "this feature works" — and
# feature code (server/src/** or client/src/**) was edited in this session
# without CLAUDE.md being touched — inject an instruction telling Claude to
# update CLAUDE.md before responding to the user's actual prompt.
#
# Pairs with track-edits.sh (PostToolUse) which maintains the per-session
# edit log at /tmp/claude-claudemd-watch-<session_id>.log.

set -u

INPUT=$(cat)
SID=$(printf '%s' "$INPUT" | jq -r '.session_id // "unknown"')
PROMPT=$(printf '%s' "$INPUT" | jq -r '.prompt // .user_message // .message // ""')
LOG="/tmp/claude-claudemd-watch-${SID}.log"

# No edits tracked -> nothing to document, pass through.
if [ ! -s "$LOG" ]; then
  exit 0
fi

# Match confirmation phrases. Case-insensitive, must appear as a whole-word
# match so "It doesn't work" / "I network..." don't false-trigger.
shopt -s nocasematch
if [[ ! "$PROMPT" =~ (^|[^a-z])(it[[:space:]]*works|works[[:space:]]+(now|perfectly|fine|great)|tested[[:space:]]+(and[[:space:]]+)?(it[[:space:]]+)?works|i[[:space:]]+tested|tested[[:space:]]+ok|looks[[:space:]]+good|lgtm|ship[[:space:]]+it|all[[:space:]]+good|perfect|confirmed|done[[:space:]]+and[[:space:]]+tested)($|[^a-z]) ]]; then
  exit 0
fi
shopt -u nocasematch

FILES=$(sort -u "$LOG" | head -15 | sed 's|^|  - |')

# Clear so we do not re-inject for follow-up confirmations in the same session.
# track-edits.sh will refill this log if more feature code is edited later.
: > "$LOG"

jq -n --arg files "$FILES" '{
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: ("[auto-hook] The user just confirmed a feature is working. Before responding to their next message, update CLAUDE.md to reflect what changed this session — new env vars, new routes, new prompt logic, architecture decisions, gotchas, or anything else worth documenting per the project conventions. Edit CLAUDE.md first, then respond.\n\nFiles touched in this feature:\n" + $files + "\n\nIf the changes were genuinely trivial (typo, dependency bump, comment-only) and CLAUDE.md does not need an update, say so explicitly in one sentence and skip the edit.")
  }
}'
