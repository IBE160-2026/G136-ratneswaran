# Arrangly — AI Agent Team

Arrangly is planned and built with the BMad Method. Instead of one general
assistant, the work is split across specialised AI agents, each with a fixed
persona, a clear responsibility and its own set of workflows (skills). Each
agent hands a document to the next, so every phase builds on a written
artefact rather than on chat history.

The agents are used as installed; their personas are not customised for this
project.

## The flow at a glance

```
 1 Analysis        2 Planning                      3 Solutioning       4 Implementation
 ───────────       ─────────────────────────       ──────────────       ────────────────
 Mary (Analyst) →  John (PM)  →  Sally (UX)    →   Winston          →   John: epics & stories
 Product brief     PRD           DESIGN.md +       (Architect)          → Sprint planning
                                 EXPERIENCE.md     Architecture         → Amelia (Dev): build
```

Each arrow is a handoff: the next agent reads the previous agent's document
as its input.

## Planning team

### 📊 Mary — Business Analyst

| | |
|---|---|
| **Phase** | 1 — Analysis |
| **Responsibility** | Explore and sharpen the idea before committing to it: research, elicitation, problem definition. |
| **Primary output** | Product brief |
| **Invoke** | `bmad-agent-analyst` |
| **Style** | Evidence first; structured like a consulting memo; makes sure every stakeholder is heard. |

Menu (what Mary can run):

| Code | Does | Skill |
|---|---|---|
| CB | Create or update the product brief | `bmad-product-brief` |
| WB | Working Backwards PRFAQ — stress-test the concept | `bmad-prfaq` |
| BP | Guided brainstorming | `bmad-brainstorming` |
| MR / DR / TR / CR / UV | Market, domain, technical, competitive, user-voice research | `bmad-deep-recon` |
| TS | Compare technologies or tools with a decision matrix | `bmad-deep-recon` |
| PC | Set up agent instructions for the repo | `bmad-project-context` |

**Use Mary when:** the problem is still fuzzy, you need facts about the
market or users, or you want the idea challenged before planning.

### 📋 John — Product Manager

| | |
|---|---|
| **Phase** | 2 — Planning (also returns after architecture, see below) |
| **Responsibility** | Turn the vision into validated requirements; decide scope and priority; later break the work into epics and stories. |
| **Primary output** | PRD (Product Requirements Document) |
| **Invoke** | `bmad-agent-pm` |
| **Style** | Keeps asking "why?"; direct; ships the smallest thing that proves the assumption. |

| Code | Does | Skill |
|---|---|---|
| PRD | Create, update or validate the PRD | `bmad-prd` |
| CE | Create epics and stories | `bmad-create-epics-and-stories` |
| IR | Check implementation readiness | `bmad-sprint-planning` |
| CC | Correct course when a big change appears mid-build | `bmad-correct-course` |

**Use John when:** deciding *what* to build and *what not* to build, and
when turning the plan into work items.

> Epics and stories are John's job, but they come **after** the
> architecture, not together with the PRD — stories need the technical
> decisions to be concrete.

### 🎨 Sally — UX Designer

| | |
|---|---|
| **Phase** | 2 — Planning (recommended whenever the product has a UI) |
| **Responsibility** | Turn user needs and the PRD into a UX specification: screens, flows, look and behaviour. |
| **Primary output** | `DESIGN.md` (how it looks) and `EXPERIENCE.md` (how it behaves) |
| **Invoke** | `bmad-agent-ux-designer` |
| **Style** | Empathetic user advocate; describes scenes so you feel the problem; starts simple. |

| Code | Does | Skill |
|---|---|---|
| CU | Create the UX design and experience documents | `bmad-ux` |

**Use Sally when:** the product is mostly interface. For Arrangly this means
the timeline swimlanes, the guest run of show and the mobile experience.

### 🏗️ Winston — System Architect

| | |
|---|---|
| **Phase** | 3 — Solutioning |
| **Responsibility** | Decide *how* to build it: technology choices, data model, the rules that keep separately built parts consistent. |
| **Primary output** | Architecture spine (a short architecture decisions document) |
| **Invoke** | `bmad-agent-architect` |
| **Style** | Calm and pragmatic; gives trade-offs rather than verdicts; prefers boring, stable technology. |

| Code | Does | Skill |
|---|---|---|
| CA | Create the architecture spine | `bmad-architecture` |
| IR | Check implementation readiness | `bmad-sprint-planning` |

**Use Winston when:** requirements exist (PRD, plus UX if any) and it is
time to pick the stack and structure.

## Build team

### 💻 Amelia — Senior Software Engineer

| | |
|---|---|
| **Phase** | 4 — Implementation |
| **Responsibility** | Implement stories test-first, review and verify them. |
| **Invoke** | `bmad-agent-dev` (main workflow: `bmad-build`) |
| **Style** | Precise and terse; cites file paths and acceptance criteria. |

Supporting implementation workflows: `bmad-code-review`,
`bmad-qa-generate-e2e-tests`, `bmad-walkthrough`, `bmad-retrospective`.

## Helpers available at any time

| Skill | Use |
|---|---|
| `bmad-help` | "Where am I and what's next?" |
| `bmad-party-mode` | Several agents discuss a question together |
| `bmad-advanced-elicitation` | Push a draft further (pre-mortem, red team, first principles) |
| `bmad-review` | Review a document or code change |

## Arrangly status (2026-09-25)

| Step | Owner | Status | Artefact |
|---|---|---|---|
| Product brief | Mary | Done | `_bmad-output/planning-artifacts/briefs/brief-Arrangly-2026-09-20/` |
| PRD | John | Final | `_bmad-output/planning-artifacts/prds/prd-Arrangly-2026-09-22/prd.md` |
| UX design | Sally | Next (recommended) | — |
| Architecture | Winston | Required next | — |
| Epics & stories | John | After architecture | — |
| Sprint planning → build | John → Amelia | Later | — |

## Working tips

- Run each workflow in a **fresh chat**. The documents carry the context,
  not the conversation.
- Call an agent for a conversation in its role, or call a skill directly
  when you already know which workflow you need. Both produce the same
  output.
- If a later phase reveals a planning mistake, don't patch around it: go
  back to the owning agent (e.g. John with `bmad-correct-course`).
