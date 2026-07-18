# Agents

Nutriwow AI command center ke agents aur unke **access scopes**.

Har agent ko sirf utna hi access milta hai jitna uske role ke liye zaroori hai (least-privilege). Detail har agent ki apni file me hai.

## Agents

| Agent | Role | File |
| --- | --- | --- |
| **CEO Agent** | Strategy, growth, profitability, expansion, decisions | [`ceo.md`](./ceo.md) |
| **CMO Agent** | D2C + marketplace marketing, SEO, content, performance | [`cmo.md`](./cmo.md) |
| **CTO Agent** | Architecture, infra, APIs, automation, security, scale | [`cto.md`](./cto.md) |

## Access matrix

| Resource | CEO | CMO | CTO |
| --- | :---: | :---: | :---: |
| `docs/company/` | ✅ | ✅ | — |
| `docs/marketing/` | ✅ | ✅ | — |
| `docs/technology/` | ✅ | — | ✅ |
| `docs/decisions/` | ✅ | — | — |
| Product pages (`client/src/pages` product/category) | — | ✅ | ✅ |
| SEO / blog content (`Blog`, `BlogPost`, `SEO.tsx`, `seed-blogs.mjs`) | — | ✅ | ✅ |
| Pure codebase (`client/ server/ api/ shared/ drizzle/ scripts/`) | — | — | ✅ |
| Architecture docs (`docs/technology/`, `CLAUDE.md`) | read | — | ✅ |
| Deployment configs (`DEPLOY_VERCEL.md`, `vercel.json`, `api/`) | — | — | ✅ |
| Infrastructure docs (`docs/technology/` infra notes) | read | — | ✅ |

> Legend: ✅ = full (read/write within scope), `read` = read-only, — = no access.

> Ye file access ka **source of truth** hai. Naya agent ya scope change karte waqt yahin update karein, phir us agent ki file me detail likhein.
