# Repository Audit — AI Command Center Setup

**Date:** 2026-06-16
**Task:** Convert the Nutriwow repository into an AI Command Center without creating duplicates.
**Rule applied:** existing repository content = source of truth; reuse > create; append, don't overwrite.

---

## 1. Existing files found (pre-existing, treated as source of truth)

**Root docs (reused, not duplicated):**
- `CLAUDE.md` — project context, stack, design rules, gotchas
- `HANDOFF.md` — project overview + working rules
- `AUDIT_STATUS.md` — security & performance PRs (#2–#10)
- `WHATSAPP_CAMPAIGNS_HANDOFF.md` — live WhatsApp marketing
- `DEPLOY_VERCEL.md` — deployment architecture
- `ideas.md` — design/brand brainstorm
- `todo.md` — completed feature history

**Code/data referenced (source of truth):**
- `scripts/seed-products.mjs` (51 products, 7 categories) · `shared/pricing.ts` (variant pricing) · `client/src/pages/*` (product, blog, policy pages) · `vercel.json`

**Docs scaffold (created earlier this session, reused & extended):**
- `docs/README.md`, all `docs/*/README.md`, `docs/company/master-context.md`, and agent files (then `*-agent.md`).

## 2. New files created (this task)

| File | Purpose |
| --- | --- |
| `docs/company/business-goals.md` | Objectives + KPI grid |
| `docs/company/company-profile.md` | Foodondoor Pvt Ltd / Nutriwow profile |
| `docs/marketing/content-calendar.md` | Content planning grid |
| `docs/marketing/campaigns.md` | Channel status + campaign roadmap |
| `docs/marketing/seo-roadmap.md` | SEO setup + roadmap |
| `docs/technology/system-architecture.md` | Architecture overview |
| `docs/technology/roadmap.md` | Tech roadmap (done + next) |
| `docs/technology/infrastructure.md` | Live infra + AWS/Railway/PG note |
| `docs/operations/operations-roadmap.md` | Ops roadmap |
| `docs/finance/financial-goals.md` | Financial targets + cost structure |
| `docs/hr/team-structure.md` | Human team + AI agents |
| `docs/legal/compliance-checklist.md` | Statutory + e-commerce compliance |
| `docs/decisions/board-decisions.md` | Decision log (D-0001…D-0004) |
| `docs/reports/weekly-review-template.md` | Weekly review template |
| `docs/reports/repository-audit.md` | This audit |

**New folders created:** `operations/`, `finance/`, `hr/`, `legal/`.
**Folders already present (not recreated):** `company/`, `marketing/`, `technology/`, `decisions/`, `reports/`, `agents/`.

## 3. Files reused / extended (appended, not overwritten)

- `docs/company/master-context.md` — appended §8 Mission, §9 Competitors, §10 Tech stack, §11 Current challenges, §12 Company roadmap.
- `docs/README.md` — added **# AI Command Center** section + new folder rows.
- `docs/agents/README.md` — updated agent links to renamed files.
- `docs/agents/ceo.md`, `cmo.md`, `cto.md` — appended expanded "Mandate (AI Command Center)" sections.

## 4. Duplicate files avoided

- **Agent files:** requested `ceo.md/cmo.md/cto.md` already existed as `ceo-agent.md/cmo-agent.md/cto-agent.md` → **renamed (git mv)**, not duplicated.
- **Architecture/infra:** cross-referenced `CLAUDE.md`, `HANDOFF.md`, `DEPLOY_VERCEL.md` instead of copying content.
- **Campaigns:** linked to `WHATSAPP_CAMPAIGNS_HANDOFF.md` instead of restating live campaign details.
- **Roadmap/decisions:** linked to `AUDIT_STATUS.md` & `todo.md` instead of duplicating.
- **README:** did **not** create a root `README.md` (repo intentionally uses `CLAUDE.md`/`HANDOFF.md` as front door); AI Command Center section added to `docs/README.md`.
- Existing folder READMEs and folders were **not** recreated.

## 5. Missing information still required (owner input — 🔲)

| Area | Needed |
| --- | --- |
| Legal/statutory | CIN, GSTIN, **FSSAI license**, registered address, incorporation date, trademark |
| Financials | Revenue/GMV, AOV, margins, CAC, profit, break-even (all numbers) |
| Targets | Revenue & KPI goals + timelines |
| Team | Real names/roles per function |
| Customers | Verified personas, top cities, repeat rate (GA4) |
| Competitors | Confirm/prioritise list + their pricing/positioning |
| Marketing | Festive priority calendar; marketplace go-live confirmation (Amazon/Flipkart/JioMart/Blinkit/Zepto) |
| Operations | Courier/3PL partners, warehouse, daily volume, inventory data |
| Brand | Official mission/vision statement (verbatim); social handles |

> ⚠️ No business numbers, names, or registration details were invented. All unknowns are marked `🔲 TODO (owner)` in the respective files.
