# Cloude Code ToolBox — MCP & Skills awareness

_Generated: 2026-06-15T14:30:21.356Z_

## How to use this report

- **Saved copy:** This file is **`.claude/cloude-code-toolbox-mcp-skills-awareness.md`** — refreshed whenever the toolbox runs an MCP & Skills scan (including on workspace open when auto-scan is enabled). It is meant for **Claude Code workspace context** together with `CLAUDE.md` (which gets a shorter replaceable summary when auto-merge is on).
- **MCP:** Lists **configured** servers from Claude Code config (`~/.claude.json` for user scope, `.mcp.json` for project scope). Use `/mcp` in the Claude Code panel to connect servers for your session.
- **Skills:** **On-disk** folders with `SKILL.md`. Claude Code does not auto-load them; attach `SKILL.md` or paths in chat when useful.
- **Task routing:** When the user’s request matches a server’s purpose (e.g. Confluence → Confluence/Atlassian MCP), prefer that **server id** from the tables below.

---

## MCP — workspace

Workspace `mcp.json` _(folder: job-tracking-app)_

- **/Users/mamaheshreddy/Documents/Mahesh-docs/claude code/practice/job-tracking-app/.mcp.json** — _File missing_

_No active workspace servers in mcp.json._

## MCP — user profile

- **/Users/mamaheshreddy/.claude.json** — _File exists — no servers defined_

_No active user-scoped servers in mcp.json._

## Skills (local `SKILL.md` folders)

### Project-scoped

- **frontend-design** — `/Users/mamaheshreddy/Documents/Mahesh-docs/claude code/practice/job-tracking-app/.claude/skills/frontend-design`
  - Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.

- **scope-feature** — `/Users/mamaheshreddy/Documents/Mahesh-docs/claude code/practice/job-tracking-app/.claude/skills/scope-feature`
  - Scope a feature before building it. Use this whenever the user wants to add, implement, or build something new — even if they don't say "scope". Triggers on "I want to add X", "can we add X", "let's build X", "add a feat

- **frontend-design** — `/Users/mamaheshreddy/Documents/Mahesh-docs/claude code/practice/job-tracking-app/.agents/skills/frontend-design`
  - Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.

### User-scoped

- **frontend-design** — `/Users/mamaheshreddy/.agents/skills/frontend-design`
  - Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.

---

## Suggested next steps

- **MCP:** Use this extension’s hub **MCP** tab, or `claude mcp list` in the terminal. In Claude Code, use `/mcp` to connect servers for the session.
- **Edit config:** Open `~/.claude.json` (user MCP) or `<workspace>/.mcp.json` (project MCP) via the extension commands.
- **Refresh this report:** run **Intelligence — scan MCP & Skills awareness** again after changing MCP config or adding skills.

_Report from Cloude Code ToolBox extension._
