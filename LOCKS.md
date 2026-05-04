# Agent Scope Locks

Before touching any files, an AI agent **must** claim its working scope here and release it when done.
This prevents two agents from editing the same files concurrently and producing conflicting states.
Do not claim this file `LOCKS.md`.

---

## Protocol

1. **On task start** — read this file in full. If an existing lock covers any file/area you need, pick a non-overlapping sub-task or wait.
2. **Claim your scope** — add an entry under `## Active Locks` before editing anything.
3. **Work on only your claimed scope.**
4. **On task end** — delete your entry.
5. **Staleness** — any lock older than ~30 minutes with no visible file activity is considered stale and may be cleared.

---

## Lock Entry Format

```
| AGENT_ID | Area / file paths | Claimed at | Task summary |
```

- **AGENT_ID**: a short random string you pick at session start (e.g. `ag-x7f2`). No two concurrent agents should share an ID.
- **Area**: glob-style paths or plain English area names. Be specific. Examples:
  - `frontend/src/pages/Admin/*`
  - `backend/app/api/admin.py`
  - `frontend/src/cms-editor/**`
  - `AGENTS.md`
- **Claimed at**: ISO timestamp or human date+time (`2026-04-14 10:30`).
- **Task summary**: one short phrase.

---

## Active Locks

| AGENT_ID | Area / file paths | Claimed at | Task summary |
|---|---|---|---|


 