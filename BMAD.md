# BMAD Integration Guide

How to use the SPECLAN plugin's BMAD commands to move specifications between [BMAD-METHOD](https://github.com/bmad-method/BMAD-METHOD) and [SPECLAN](https://speclan.net).

## Why use both?

BMAD is great at generating planning artifacts — PRDs, epics, stories — through its AI-driven workflow. But once you start building, those artifacts become static documents that drift from reality.

SPECLAN keeps specifications alive. Each feature, requirement, and goal is a separate file with status tracking, change requests, and a lifecycle (`draft` through `released`). You can edit individual specs, mark them approved, implement them, and track what's done vs what's pending.

The round-trip between the two looks like this:

```
BMAD artifacts ──from-bmad──> SPECLAN specs ──to-bmad──> BMAD PRD
   (planning)                  (living specs)              (updated PRD)
```

You plan in BMAD, refine and manage in SPECLAN, and export back to BMAD when you need a fresh PRD for validation or downstream workflows.

## The three commands

| Command | Direction | What it does |
|---------|-----------|-------------|
| `/speclan:from-bmad` | BMAD → SPECLAN | Imports your PRD (and optionally epics/architecture) into SPECLAN's hierarchy |
| `/speclan:to-bmad` | SPECLAN → BMAD | Generates a BMAD PRD using BMAD's native PM agent — richer output |
| `/speclan:to-bmad-prd` | SPECLAN → BMAD | Generates a BMAD PRD using a standalone converter — no BMAD skills needed |

**Which export command should I use?**

- Use `/speclan:to-bmad` if you have BMAD skills installed (i.e., `/bmad-bmm-create-prd` is available). It feeds your specs into BMAD's PM agent, which synthesizes user journeys, risk sections, and phased scoping natively.
- Use `/speclan:to-bmad-prd` if you don't have BMAD skills or just want a quick standalone export. It maps SPECLAN entities directly to BMAD's PRD format using built-in rules.

Both produce a valid BMAD PRD at `_bmad-output/planning-artifacts/PRD.md`.

## Walkthrough: BMAD to SPECLAN

### Prerequisites

- BMAD installed in your project (`_bmad/` directory)
- A PRD generated via BMAD workflows (`_bmad-output/planning-artifacts/PRD.md`)

### Step 1: Import

```
/speclan:from-bmad
```

The command reads your BMAD artifacts and creates a `speclan/` directory with:

- **Goals** (`G-###`) from the PRD's Success Criteria sections
- **Features** (`F-####`) from capability areas (PRD-only) or epics (if available)
- **Requirements** (`R-####`) from individual FRs, mapped under their parent features
- **Vision and Mission** files from the Executive Summary
- NFR categories become features tagged `nfr`

If you also have an epics document, the command uses the **FR Coverage Map** from the epics to assign requirements to the right features. This is more accurate than guessing by name, since FRs often cross capability area boundaries.

All imported specs get `status: review` — they need your review before they're ready for anything else.

### Step 2: Review and refine

Open the generated specs in VS Code with the [SPECLAN extension](https://marketplace.visualstudio.com/items?itemName=DigitalDividend.speclan-vscode-extension), or browse them with `/speclan:ask`:

```
/speclan:ask what features exist?
/speclan:ask tell me about F-1234
```

At this stage you might:
- Adjust feature titles and descriptions
- Reorganize the hierarchy (move requirements between features)
- Add acceptance criteria to requirements
- Split or merge features

### Step 3: Approve

When a spec is solid, change its status from `review` to `approved`:

```yaml
# In the feature's YAML frontmatter:
status: approved
```

The `approved` status is the gate. It means: "This is specced out, reviewed, and ready." The export commands only pick up specs in `approved` status — everything else is filtered out.

### Step 4: Implement (optional)

If you want to implement approved specs before exporting back to BMAD, use the manual implementation flow:

```
/speclan:plan-manual     # Creates a checklist from approved specs
/speclan:implement-manual  # Implements the next item
/speclan:review-manual   # Reviews completed implementations
```

Specs move through: `approved` → `in-development` → `under-test` → `released`.

Once a spec is past `approved`, it's considered "past the handoff point" and won't appear in BMAD exports. This is intentional — specs that are already being built don't belong in a planning PRD.

## Walkthrough: SPECLAN to BMAD

### Prerequisites

- BMAD installed (`_bmad/` directory)
- At least some SPECLAN specs with `status: approved`

### Using the native approach

```
/speclan:to-bmad
```

This invokes BMAD's PM agent (`/bmad-bmm-create-prd`) with your approved specs as input. The agent reads every approved feature, requirement, and goal, then synthesizes a full BMAD-standard PRD including user journeys, risk analysis, and phased scoping.

The generated PRD includes traceability links back to the source SPECLAN files, so you can trace any FR in the PRD to the exact requirement it came from.

### Using the standalone converter

```
/speclan:to-bmad-prd
```

Same result — a BMAD PRD — but generated directly without BMAD's agent. The mapping:

| SPECLAN | BMAD PRD Section |
|---------|-----------------|
| `vision.md` + `mission.md` | Executive Summary |
| Goals | Success Criteria |
| Features (by scope tag) | Product Scope (MVP/Growth/Vision phases) |
| Features + requirements | Functional Requirements (grouped by capability area) |
| NFR-tagged features | Non-Functional Requirements |

You can also export specific features by ID:

```
/speclan:to-bmad-prd F-1001 F-1003
```

### After export

The PRD lands at `_bmad-output/planning-artifacts/PRD.md`. From there you can use BMAD's downstream workflows:

```
/bmad-bmm-validate-prd        # Validate the PRD
/bmad-bmm-edit-prd             # Refine with BMAD's PM agent
/bmad-bmm-create-architecture  # Generate architecture decisions
/bmad-bmm-create-epics-and-stories  # Break into implementable stories
```

## Re-importing updated BMAD artifacts

If you update your BMAD PRD (via `/bmad-bmm-edit-prd` or manually) and want to sync changes back into SPECLAN, run `/speclan:from-bmad` again. It operates in **re-import mode**:

- Specs with editable status (`draft`, `review`, `approved`) get updated in place
- Specs with locked status (`in-development`, `under-test`, `released`) get a Change Request instead — the existing implementation isn't touched
- Specs removed from the BMAD source are flagged as orphans for your attention
- New FRs in the BMAD source become new SPECLAN requirements

This makes the round-trip safe at any point in the lifecycle.

## The status gate explained

The `approved` status is central to the BMAD ↔ SPECLAN flow:

```
                    ┌──────────────────────────────┐
  BMAD import ───>  │  draft ─> review ─> approved │ ──> BMAD export picks up here
                    └──────────────────────────────┘
                                                               │
                                               implementation  ▼
                                             in-development ─> under-test ─> released
                                                (locked — changes need CRs)
```

- **Before `approved`**: Specs are still being shaped. Not ready for export.
- **At `approved`**: Specced out and reviewed. This is what `/speclan:to-bmad` exports.
- **After `approved`**: Being built or already shipped. Past the planning stage.

## Quick reference

| I want to... | Command |
|--------------|---------|
| Import BMAD planning into SPECLAN | `/speclan:from-bmad` |
| Export approved specs as a BMAD PRD (rich) | `/speclan:to-bmad` |
| Export approved specs as a BMAD PRD (standalone) | `/speclan:to-bmad-prd` |
| Ask about a spec | `/speclan:ask` |
| See project status | `/speclan:status` |
| Implement approved specs | `/speclan:plan-manual` → `/speclan:implement-manual` → `/speclan:review-manual` |
