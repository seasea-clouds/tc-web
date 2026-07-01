# TASK.md — Trade Web

## Pending

_None. All tasks completed and verified._

## Latest Deploy

- **Commit:** `c417999` — fix: resolve TypeScript errors in nmpa/rules.ts and trademark/rules.ts
- **CF Deploy:** Site ✅ Active | Portal ✅ Active | Blog ✅ Active
- **Verification:**
  - `/en/c/login` — loads, has privacy link → ✅
  - `/en/c/register` — loads, has privacy link → ✅
  - `/en/c/me` — My Account page, no billing link → ✅
  - `/en/c/me/subscription` — Subscription page → ✅
  - `/en/c/dashboard/billing` — returns 404 (deleted) → ✅
  - Hardcoded colors (`#1B365D`, `#D4AF37`) — replaced with CSS vars → ✅
  - Dashboard dead keys — 24 unused keys removed from 48 locales → ✅
  - Build — Portal `next build` succeeded, all CI checks pass → ✅

## Previous Tasks (for reference)

### ✅ P1 — Translation export & merge (commit 7a7d21c)
### ✅ P2 — build:ci consolidation (commit ed81c18)
### ✅ P3 — Billing page 404 → Dashboard consolidation (commit fddf6d2, 5f16379, 3004854)
### ✅ Audit items 1-9 (commit 3aa5513)
### ✅ CF Build fix — package.json ci-check args (commit bd28188)
### ✅ CF Build fix — TypeScript errors in nmpa & trademark rules (commit c417999)
