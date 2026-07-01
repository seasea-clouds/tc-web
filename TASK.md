# TASK.md — Trade Web

## Current Plan (8 Issues)

Priority order: P0 → P1 → P2 → P3 → P4 → P5

### ✅ P0 — Privacy checkbox with highlight warning
**Files:** `apps/portal/src/app/[locale]/c/login/page.tsx`, `apps/portal/src/app/[locale]/c/register/page.tsx`

Replace plain text privacy link with a required checkbox. If submitted unchecked, show red-border highlight warning. Move checkbox above submit button.

**Status:** Done

---

### ✅ P1 — Subscription badge separation & centering
**Files:** 6 check-client.tsx (ccc/crossborder/gacc/label/nmpa/trademark) + `en.json` + `zh.json`

Move "✓ 活跃订阅" badge above "查看完整报告" button, center both as separate components. Fix button label to not duplicate the heading text (add `viewFullReport` key).

**Status:** Done

---

### ✅ P2 — Subscribe-user report persistence
**Files:** 6 check-client.tsx + `apps/portal/functions/api/report/save.ts`

- **A:** Modified `/api/report/save` to accept `paymentStatus` param (default `'pending'`)
- **B:** Each check-client subscribed branch now saves report with `paymentStatus: 'completed'`
- **C:** Reports list API already filters by `'completed'` — no changes needed

**Status:** Done (commit 09583cc)

---

### ⬜ P3 — "noNeedOne" dropdown 48-language optimization
**Files:** `apps/portal/messages/en.json` + translation submit

Fix `en.json` source: `"No: need one"` → `"No – need one"`. Submit translate-tool job for all 47 target languages.

**Status:** Not started

---

### ⬜ P4 — Subscription renewal billing cycle
**File:** `apps/portal/functions/api/webhook.ts`

In `handleSubscriptionCreated`, check if user already has an active subscription. If yes, extend existing period_end by 1 month + 1 day instead of creating a new record or overwriting with Creem's date.

**Status:** Not started

---

### ⬜ P5 — Report page i18n + Reports list i18n
**Status:** Awaiting user confirmation after P2 fix (reports need to be visible first)

---

## Latest Deploy

- **Commit:** `c417999` — fix: resolve TypeScript errors in nmpa/rules.ts and trademark/rules.ts
- **CF Deploy:** Site ✅ Active | Portal ✅ Active | Blog ✅ Active
