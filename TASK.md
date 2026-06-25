# trade-web 翻译任务清单

> ⚠️ 翻译工具位置: `/root/projects/translate-tool/`
> 虚拟环境: `source /root/projects/.venv/bin/activate`
> 调用入口: `translate-tool <command>`

---

## 📌 三个进行中的翻译任务

所有三个任务都因 **Google API 429 限流** 卡住，worker 进程已死，worker 锁未释放。

### 任务 A: `rules-data-strings-v1-20260624`
| 字段 | 值 |
|------|-----|
| 状态 | **75.8%**（标注 running，实际 worker 已死） |
| 内容 | 592 条 rules.ts 数据字符串（合规报告内容）× 47 语言 |
| 输入文件 | `/tmp/rules_data_translate_input.json` |
| 说明 | 第一批提交，进度最高 |

### 任务 B: `rules-data-strings-v2-20260624`
| 字段 | 值 |
|------|-----|
| 状态 | **24.7%**（标注 running，实际 worker 已死） |
| 内容 | 同上 592 条 × 47 语言 |
| 说明 | 第二次提交，因 429 限流只跑了少部分 |

### 任务 C: `portal-hardcoded-v3-20260624` ⭐ 主任务
| 字段 | 值 |
|------|-----|
| 状态 | **65.1%**（49398/75858，标注 running，实际 worker 已死） |
| 内容 | **1614 keys × 47 语言**（含 A+B 的缓存 + 新增组件字符串 + CATEGORY_LABELS） |
| 输入文件 | `/tmp/portal_hardcoded_translate_input.json` |
| 备注 | 覆盖全部翻译需求，A/B 完成后无需单独处理 |
| followup | 用 apply-portal-translations.mjs 写入 locale 文件 |

> **关系说明：** C 是新提交的综合任务，自动复用 A/B 已完成项的缓存。**任务 C 完成后即可，A/B 不需要单独取结果。**

---

## 🟡 已知阻塞问题

### 问题 1: Worker 锁未释放
- DB 里 `worker_lock` 表仍有死进程 PID（如 60208）
- Daemon cron（每分钟跑一次）检查到锁以为 worker 还活着，不会重启新 worker
- **解决：** 执行下面任一方案：
  ```bash
  # 方案 A: 暂停 + 恢复（清锁 + 重启）
  source /root/projects/.venv/bin/activate
  translate-tool pause -n portal-hardcoded-v3-20260624
  translate-tool resume -n portal-hardcoded-v3-20260624

  # 方案 B: 重试（会释放锁 + 重启）
  translate-tool retry -n portal-hardcoded-v3-20260624
  ```

### 问题 2: Google API 429 限流 + 渠道效率低
- 三个渠道中 `deep_translator` 和 `mobile_regex` 持续 429
- 冷却策略（AIMD）：连续 429 → 冷却翻倍（60→120→240→480→600s 封顶）
- 渠道顺序：`deep_translator` → `mobile_regex` → `translators`（健康的排在最后）
- 每条翻译都要等前两个渠道超时后才 fallback，效率极低
- **影响：** 剩余 26459 项即使 worker 重启也需要很长时间
- **建议：** 考虑手工从 translate.db 的 `channels` 表禁用前两个渠道（设 `enabled=0`），或联系开发者优化渠道顺序/跳过逻辑

---

## ✅ 翻译完成后的应用流程

### Step 1: 确认任务状态
```bash
source /root/projects/.venv/bin/activate
translate-tool list
# 确认 portal-hardcoded-v3-20260624 的进度为 100%
```

### Step 2: 取回翻译结果
```bash
translate-tool results -n portal-hardcoded-v3-20260624 -o /tmp/portal_translate_results.json
```

### Step 3: 应用到 Portal 语言文件
```bash
cd /root/projects/trade/web
node packages/scripts/apply-portal-translations.mjs \
  -i /tmp/portal_translate_results.json
```
这个脚本会：
- 读取翻译结果（translate-tool 的 `{results: {locale: {key: text}}}` 格式）
- 遍历 47 个语言文件
- **只替换值等于英文原文的 fallback 项**（不覆盖已有翻译）
- 写回对应 `<locale>.json` 文件

### Step 4: 验证翻译完整性
```bash
# i18n key 完整性检查
node packages/scripts/check-i18n-keys.mjs

# 硬编码英文检查
node packages/scripts/check-hardcoded.mjs apps/portal/src

# 全量 CI 检查
node packages/scripts/ci-check.mjs

# TypeScript 编译验证
cd /root/projects/trade/web
npm run build  # 三站全量构建
```

### Step 5: (如需要) 取回 A/B 的翻译结果
如果 C 任务 **仍未完成** 而 A/B 先完成了，也可以单独取：
```bash
translate-tool results -n rules-data-strings-v1-20260624 -o /tmp/rules_v1_results.json
translate-tool results -n rules-data-strings-v2-20260624 -o /tmp/rules_v2_results.json
```
然后合并结果：v2 优先（进度更高），v1 补充 v2 缺失项，用同一个 apply 脚本应用。
但**推荐等 C 任务完成**，C 的缓存已包含 A+B 完成的部分。

---

## 📁 相关文件索引

| 文件 | 用途 |
|------|------|
| `/root/projects/trade/web/apps/portal/messages/en.json` | Portal 英文源（翻译 key 定义在此） |
| `/root/projects/trade/web/apps/portal/messages/*.json` | 47 个语言翻译文件 |
| `/root/projects/trade/web/packages/scripts/apply-portal-translations.mjs` | 翻译结果应用脚本 |
| `/root/projects/trade/web/packages/scripts/check-i18n-keys.mjs` | i18n key 完整性检查 |
| `/root/projects/trade/web/packages/scripts/check-hardcoded.mjs` | 硬编码英文检查 |
| `/root/projects/translate-tool/data/translate.db` | 翻译引擎数据库（含任务状态、缓存、渠道限流状态） |
| `/root/projects/trade/web/TASK.md` | 本文件 |

## ⚡ 后续代码改造

翻译应用到语言文件后，还需完成：
1. 将 `rules.ts` 的数据字符串改为 `t()` 调用（已改造完成，见 commit 5984fe1）
2. 将 Portal 组件中的硬编码字符串改为 `t()` 调用
3. 最终验证：`check-hardcoded.mjs` 0 error，`check-i18n-keys.mjs` 0 missing
