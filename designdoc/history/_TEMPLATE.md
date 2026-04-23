# Design modification record: {Title}

**Document type:** Design modification plan and implementation history  
**Location:** `designdoc/history/` — archived after all tasks complete  
**Design revision:** v{X.Y} — {Short description of the revision}

---

## Revision summary

| Field | Value |
| :--- | :--- |
| **Revision** | v{X.Y} |
| **Date** | YYYY-MM-DD |
| **Author** | toma-kazuki |
| **Scope** | {Brief scope — which files / subsystems are affected} |
| **Source gaps** | {Which document or observation identified the gap} |
| **Design specs** | {Which design docs are the authority for this revision} |
| **Baseline commit** | *(fill in before starting implementation)* |
| **Implementation commit** | *(fill in after implementation is complete)* |
| **Status** | 🔲 In progress |

### Commits that constitute this revision

| Hash | Message summary | Scope |
| :--- | :--- | :--- |
| *(baseline — pending)* | Baseline snapshot before this revision | — |
| *(pending)* | {Commit message summary} | {Files affected} |

---

## Background — {What gap or defect this revision addresses}

{2–4 paragraphs explaining:
- What the current state is and why it is insufficient
- Which design document or observation identified the gap
- Why the change is necessary now (not deferred)
}

### Root cause / Gap description

{Specific technical or design description of the problem. Quote the relevant
design spec lines where applicable.}

```
{Optional: code or data example illustrating the problem}
```

### Symptoms or evidence

{How the gap manifests — user-visible symptoms, test failures, inconsistency
with a design document, etc.}

---

## How to use this document type

This file is a **design modification record** — it documents a single logical revision to the HMU design and its implementation. One file per revision, stored in `designdoc/history/`.

**File naming convention:** `YYYY-MM-DD_{short_slug}.md`  
Example: `2026-04-22_symptom_alert_system.md`

**Per-task workflow (for future revisions):**

1. Identify gaps from the current design–implementation gap table in `5_software_implementation.md`.
2. Create a new file in `designdoc/history/` using this format.
3. **Create a baseline git commit** (see "Git workflow" below) before writing any code.
4. Scope each task for one Coding AI prompt; record prerequisites and test steps.
5. After implementation, create an implementation git commit per task (or per logical scope).
6. Record all git commit hashes in the Revision summary table.
7. Mark tasks complete (✅) and tick success criteria checkboxes (`- [x]`).

---

## Git workflow

### Before starting implementation

Create a baseline commit that captures the state of the repo before this revision begins.
This makes it trivial to diff the full revision later.

```bash
git add -p   # stage only intentional changes; do not use git add -A blindly
git commit -m "$(cat <<'EOF'
{Short scope}: baseline before {revision title}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Record the resulting hash in the **Baseline commit** field above.

### After each task (or logical scope)

If the revision touches multiple independent subsystems, commit each separately.
If all tasks form one logical unit, a single implementation commit is fine.

**Suggested commit granularity:**

| Condition | Commit strategy |
| :--- | :--- |
| One subsystem changed | Single implementation commit after all tasks complete |
| Multiple independent subsystems | One commit per subsystem (e.g. backend, frontend, docs) |
| Large refactor with doc updates | Separate commit for doc changes vs. code changes |

```bash
git add {specific files}
git commit -m "$(cat <<'EOF'
{Short description of what changed and why}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Record each resulting hash in the **Commits that constitute this revision** table above.

---

## Progress overview

| # | Task | Scope | Status |
| :--- | :--- | :--- | :--- |
| — | Baseline git commit | — | 🔲 Not started |
| 1 | {Task 1 title} | {Files} | 🔲 Not started |
| 2 | {Task 2 title} | {Files} | 🔲 Not started |
| 3 | {Task 3 title} | {Files} | 🔲 Not started |
| — | Implementation git commit(s) | — | 🔲 Not started |

---

## Baseline git commit

**Status:** 🔲 Not started

Before writing any code, create a commit that records the exact state of the repo
at the start of this revision. This commit should contain only already-staged or
in-progress work unrelated to this revision — do not include any implementation
changes for this revision.

```bash
git status   # confirm no unintended changes are staged
git add {any unrelated in-progress files if applicable}
git commit -m "$(cat <<'EOF'
snapshot: baseline before {revision title}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
# Record the hash here: ________________
```

---

## Task 1 — {Task title}

**Status:** 🔲 Not started  
**Prerequisites:** Baseline commit

### Objective

{1–3 sentences describing what this task accomplishes and why it is scoped
as a standalone unit.}

### Design references

- `{doc} §{section}` — {What to read and why}
- `{doc} §{section}` — {What to read and why}

### Files to modify

- `{path/to/file.py}`
- `{path/to/file.js}`

### Changes required

{Step-by-step description of the changes. Use code blocks for non-trivial
logic. Each step should be implementable without ambiguity.}

**Step A — {Sub-step title}**

```python
# Example implementation sketch
```

**Step B — {Sub-step title}**

{Description}

### Test steps

```bash
# Commands to verify the task output
curl -s "http://localhost:8000/api/..." | python3 -c "..."
```

Expected output:

| Field | Expected value |
| :--- | :--- |
| {field} | {value} |

### Success criteria

- [ ] {Verifiable criterion 1}
- [ ] {Verifiable criterion 2}
- [ ] {Verifiable criterion 3}
- [ ] No server errors or validation exceptions
- [ ] No regression in existing functionality

---

## Task 2 — {Task title}

**Status:** 🔲 Not started  
**Prerequisites:** Task 1

### Objective

{Description}

### Design references

- `{doc} §{section}` — {Purpose}

### Files to modify

- `{path/to/file}`

### Changes required

{Description}

### Test steps

```bash
{Commands}
```

### Success criteria

- [ ] {Criterion}
- [ ] {Criterion}

---

## Task 3 — Verify no regression

**Status:** 🔲 Not started  
**Prerequisites:** All prior tasks

### Objective

Confirm that all changes in this revision produce no unintended side effects
on existing functionality.

### Test steps

```bash
# Full crew × scenario matrix
for crew in CM-1 CM-2 CM-3 CM-4; do
  for scenario in nominal exercise stress sleep; do
    echo "=== $crew / $scenario ==="
    curl -s "http://localhost:8000/api/crew/$crew/detail?scenario=$scenario" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for a in d['alerts']:
    print(f'  [{a[\"severity\"]:8}] {a.get(\"symptom_title\") or a[\"title\"]}')
"
  done
done
```

### Success criteria

- [ ] All 16 scenario × crew combinations complete without server error
- [ ] {Revision-specific regression check 1}
- [ ] {Revision-specific regression check 2}
- [ ] No JavaScript console errors in the browser

---

## Implementation git commit(s)

**Status:** 🔲 Not started  
**Prerequisites:** All tasks complete and all success criteria passing

Decide on commit granularity (see "Git workflow" section above), then create commits.

```bash
# Example: single commit for a focused revision
git add backend/alerts.py frontend/app.js
git commit -m "$(cat <<'EOF'
{What changed}: {why / design reference}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
# Record the hash here: ________________

# Example: separate commits for backend and frontend
git add backend/
git commit -m "$(cat <<'EOF'
backend: {what changed}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
# Record hash: ________________

git add frontend/
git commit -m "$(cat <<'EOF'
frontend: {what changed}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
# Record hash: ________________
```

Update the **Commits that constitute this revision** table and the **Implementation commit** field in the Revision summary with all hashes.

---

*After each task is completed and all success criteria pass, update the Status
line to **✅ Complete**, tick all checkboxes, and update the Progress overview
table at the top of this file. After all implementation commits are created,
update the Revision summary table with all commit hashes.*
