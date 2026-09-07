# Project Management

## Changelog

See root [CHANGELOG.md](../../CHANGELOG.md) for the complete changelog.

## Bug Tracking

Bugs are tracked in [BUGS.md](../decisions/BUGS.md) using the `BUG-###` format.

**Rules:**
- Every bug (past or known) should be documented with: ID, title, description, root cause, fix, status
- New bugs found → add entry, assign next ID
- Status values: `fixed`, `known`, `open`, `by-design`

## Technical Debt

Technical debt is tracked in [TECH_DEBT.md](../decisions/TECH_DEBT.md) using the `TD-###` format.

**Rules:**
- Every trade-off that bites later gets an entry
- Include: ID, title, description, impact, recommended action, status
- Status values: `open`, `in-progress`, `resolved`, `mitigated`

## Decision Records

Architecture Decision Records (ADRs) live in [docs/decisions/](../decisions/ADRs/).

**Rules:**
- One file per decision: `ADR-001-title.md`
- Status: `accepted`, `superseded`, `proposed`
- When a decision is superseded, add a link to the new ADR in the old one's header

## Documentation Sync Rules

**Rule 1**: Any code change that affects the accounting model (allocation, ledger, monthly summary) MUST update:
- `docs/architecture/ACCOUNTING_DOMAIN.md`
- `docs/architecture/DATA_FLOW.md` (if flow changed)
- `docs/database/SCHEMA.md` (if schema changed)

**Rule 2**: Any database migration MUST update:
- `docs/database/SCHEMA.md` (tables/functions/views affected)
- `docs/database/MIGRATIONS.md` (add to history table)

**Rule 3**: Any new feature/documentation that doesn't match existing docs MUST be reconciled.

**Rule 4**: The `docs/` directory is a living document, synced with the actual codebase after every major change.

**Rule 5**: `README.md` is the entry point. It lists key routes and links to detailed docs. If project structure changes, update README.

## None of the Above

**Rule 6**: The memory files (`~/.claude/projects/.../memory/`) hold project-specific non-obvious facts. These complement, not replace, repo documentation.

## Documenting a New Bug (Template)

```markdown
## BUG-###: Short Title

**Status:** open | fixed | known | by-design
**Found:** YYYY-MM-DD
**Fixed:** YYYY-MM-DD (if fixed)
**Region:** backend | frontend | database | integration

### Description
Plain English description of the bug.

### Root Cause
What actually caused it.

### Fix
How it was fixed (link to PR/migration if applicable).

### Preventative
How to avoid recurrence.
```