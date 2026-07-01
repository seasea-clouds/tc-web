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

### ✅ P3 — "noNeedOne" dropdown 48-language optimization
**Files:** `apps/portal/messages/en.json` + translation results merged into 47 locale JSONs

Fixed `en.json` source: `"No: need one"` → `"No – need one"`. Submitted `portal-noNeedOne-fix-v1` (47 langs, completed). Results merged into all 47 locale JSON files.

**Status:** Done (commit 9555262)

---

### ✅ P4 — Subscription renewal billing cycle
**File:** `apps/portal/functions/api/payment/webhook.ts`

- `handleSubscriptionCreated`: when updating existing sub, adjusted `current_period_start` to ≥ `old_period_end + 1 day`
- Added `handleSubscriptionUpdated` handler for Creem's subscription.updated webhook
- Same period adjustment applied in updated handler

**Status:** Done (commit 9555262)

---

### ✅ P5 — Report page i18n + Reports list i18n
**Files:** `apps/portal/src/app/[locale]/c/report/page.tsx`

- Fixed hardcoded English 'Report not found' → uses `t('notFoundDesc')` i18n key
- Reports list page already fully translated (51 Report keys in all locales)
- rebuildResult correctly re-renders reports with current locale via module check functions

**Status:** Done

---

## Latest Deploy

- **Commit:** `c417999` — fix: resolve TypeScript errors in nmpa/rules.ts and trademark/rules.ts
- **CF Deploy:** Site ✅ Active | Portal ✅ Active | Blog ✅ Active
