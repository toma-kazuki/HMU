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
| **Implementation commit** | *(pending)* |
| **Status** | 🔲 In progress |

### Commits that constitute this revision

| Hash | Message summary | Scope |
| :--- | :--- | :--- |
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
3. Scope each task for one Coding AI prompt; record prerequisites and test steps.
4. After implementation, record the git commit hash in the Revision summary table.
5. Mark tasks complete (✅) and tick success criteria checkboxes (`- [x]`).

---

## Progress overview

| # | Task | Scope | Status |
| :--- | :--- | :--- | :--- |
| 1 | {Task 1 title} | {Files} | 🔲 Not started |
| 2 | {Task 2 title} | {Files} | 🔲 Not started |
| 3 | {Task 3 title} | {Files} | 🔲 Not started |

---

## Task 1 — {Task title}

**Status:** 🔲 Not started  
**Prerequisites:** None

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

*After each task is completed and all success criteria pass, update the Status
line to **✅ Complete**, tick all checkboxes, and update the Progress overview
table at the top of this file. Record the implementation commit hash in the
Revision summary table.*
