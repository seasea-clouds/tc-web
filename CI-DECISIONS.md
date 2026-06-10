# CI Pipeline 决策记录

## 核心原则（2026-06-10）
1. **不得降低检测强度和缩小范围**。遇到不适合检测的地方，在检测脚本中添加精确特殊处理（如 `--skip-pattern` 参数），而非缩小检测范围。
2. **检测出来的问题必须修复**，不是掩盖。例如 blog layout.tsx 的硬编码 meta 描述已改为 `getTranslations()`。
3. **所有检测脚本统一在 `packages/scripts/`**，共享一套，不各自维护。各项目 `package.json` 仅传递不同参数。

## Portal hreflang 检查
Portal SSG 输出中 `/c/` 路径不含 hreflang（主站 Worker 边缘端注入）。
- 脚本中新增 `--skip-pattern` 参数：`check-hreflang.mjs --dir=out --skip-pattern=/c/,404,_not-found --ci`
- 跳过 /c/ 路径后仍检查其余路径（914 文件 → 跳过 912 文件 → 0 失败）
- 部署后用 `--url` 远程验证 Worker 注入的 hreflang：`check-hreflang.mjs --url=https://sinotradecompliance.com/en/c/ --ci`
- 脚本头部注释详细说明各项目模式选择

## check-hardcoded 全量扫描
portal 构建运行 `check-hardcoded.mjs --ci`（不带路径限定），全量扫描所有项目代码。
检测到的问题直接修复源码，而非绕过：
- blog layout.tsx metaTitle/metaDescription → 改为 next-intl getTranslations 调用
- LEGIT_ENGLISH 添加 "China Import Compliance Guide" 和 "Services."
