# TASK.md — 任务清单

## 当前任务：GACC 280 号令博客文章 + 48 语言本地化（2026-08-14）

### 任务背景
- 新文章：GACC Registration Under China's New Decree 280（海关总署 280 号令新规解读，2026-06-01 施行替代 248 号令）
- 分类 Food & Beverage；案例为印尼咖啡烘焙厂，叙事主体是"我方代办注册"
- 内容红线：不提价格/官方免费、不写客户自助注册教程、不出现木片/木材内容
- 本地化要求：不用翻译工具，各语言本地化撰写 + 本地化 SEO/GEO；本地化标题不加括号说明

### 已完成
- [x] CI 脚本新增 R21（文末 CTA 语言前缀匹配校验，含正/负向验证，528 文件零误报）
- [x] 英文版 content/en/gacc-decree-280.mdx（CI 全过）
- [x] 中文版 content/zh/gacc-decree-280.mdx（CI 全过）

### 已完成（2026-08-14）
- [x] 46 语言本地化（4 组子代理 + 手动补写 el/tr）
  - 批 A 欧西 6：es fr de it pt nl
  - 批 B 北欧东欧 14：sv no da fi pl cs ro hu bg hr sr sk sl uk ru
  - 批 C 中东南亚 14：ar he fa ur hi bn ta si ne ka hy az sq be
  - 批 D 亚太 9：ja ko vi th id ms sw af ca
  - 手动补写 2：el tr（分批清单遗漏，已补齐）
- [x] 全量 CI 验证：576 文件 0 错误（含 R07 48 语言齐全 / R10 date 一致 / R21 CTA 前缀）
- [ ] 构建 + 部署验证

### 验收标准
- `node packages/scripts/check-md-article.mjs --project=blog` 全量 0 错误
- 48 语言文件齐全，date 一致（2026-08-14），CTA 语言前缀全部匹配（R21）
