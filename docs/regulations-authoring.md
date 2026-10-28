# 法规库收录规范（tc-web-regulations）

写给以后往 `apps/regulations` 加新法规的人（含未来的我）。一次收录 = 48 个语言目录各一份文件。

---

## 一、文件放哪里

```
apps/regulations/content/<locale>/<slug>.mdx      # 48 个语言各一份，slug 必须完全一致
apps/regulations/content/_source/<slug>.md        # 中文原文（翻译底稿，不上页面）
```

`_source` 里的中文原文**不渲染**，只作为翻译依据和留档；页面上读者看到的是本地语言全文译本，官方原文只通过元信息里的「官方链接」跳出去。

---

## 二、frontmatter 字段

```yaml
---
title: "进口食品境外生产企业注册管理规定"        # 只写标题本身
doc_number: "海关总署令第 280 号"                # 文号，列表第一列单独展示
issuer: "GACC"                                  # 发布机关
published_at: 2025-10-14                        # 发布日期
effective_at: 2026-06-01                        # 施行日期
status: in_force                                # in_force | upcoming | amended | repealed | draft
source_url: "https://www.gov.cn/..."            # 官方原文链接（元信息第六个字段）
category: food-registration                     # 类别，供筛选
excerpt: "一句话摘要……"                          # 只出现在详情页 hero 副标题
related_service: "/services/gacc/"              # 底部「相关服务」块，见第四节
---
```

### 三条硬规则

1. **`title` 里不要写文号**。以前写成「……管理规定（海关总署令第 280 号）」，列表标题列就重复了——文号在第一列已经有。标题只留标题本身，48 个语言都要去掉这类括号后缀。
2. **`excerpt` 不会进列表页**。列表的标题列只渲染 `title`，不放摘要第二行；`excerpt` 只用于详情页 hero 的一句话导语。
3. **`status` 只能是那五个值之一**，页面上的状态徽章和 JSON-LD 的 `legislationLegalForce` 都从这里来。

---

## 三、正文结构

```markdown
（这里是「解读」——我们自己的分析，会渲染成暖色卡片）

<!-- original -->

## 第X章 章名
**第X条**　条文正文……
```

- `<!-- original -->` **之前** = 分析（“解读”），**之后** = 该语言的全文译本。
- 译文按官方公布文本的排版走：`## 第X章` 居中带下划线，`**第X条**　` 加粗起段，段落间空行。
- 分析小节用 `##` 或 `###`，不要用 `#`（h1 归页面标题）。
- **全文，不是节选**。目前 en / zh / ja / de / fr / es 六种语言是 33 条全文；其余 42 种仍是旧版 7 条节选，待补。

---

## 四、底部「相关服务」块怎么跟着变

不需要改代码，**每篇法规由 `related_service` 决定**：

| frontmatter | 底部块显示 |
| --- | --- |
| `related_service: "/services/gacc/"` | 海关总署食品注册 + 按钮跳 `/{locale}/services/gacc/` |
| `related_service: "/services/ccc/"` | CCC 认证 + 按钮跳 `/{locale}/services/ccc/` |
| `related_service: "/services/cosmetics/"` | 化妆品备案 |
| `related_service: "/services/ecommerce/"` | 跨境电商 |
| `related_service: "/services/brand/"` | 品牌保护 |
| `related_service: "/services/label/"` | 中国标签合规 |
| 不写 `related_service` | 服务名显示「服务 / Services」+ 按钮跳 `/{locale}/services/` 总览 |
| key 写错 / 站上不存在 | 同上，兜底到 `/{locale}/services/` 总览 |

服务名取自 `packages/ui/messages/<locale>.json` 的 `Navbar.servicesDropdown.<key>`，48 语言现成，不需要为新法规补文案。

**这一块永远会渲染**，不会留空壳，也不会静默消失：key 命中就给精确服务和对应页面，没命中就给服务总览页。所以要新增服务类型时，先建 `apps/site` 的服务页 + 补 `servicesDropdown` 语言键，命中才会精确跳转。

那个大标题「需要办理中国合规业务？」（`ctaSectionTitle`）是全站通用文案，不随法规变化；随法规变化的是它上面那块「相关服务」卡片。

---

## 五、收录检查清单

1. 48 个语言目录都有 `<slug>.mdx`，`slug` 一致
2. 48 个 `title` 都不含文号括号
3. `status` 在枚举内，`source_url` 可访问
4. `related_service` 是六个合法 key 之一，或确认要隐藏
5. 正文 `<!-- original -->` 前后分明，译文是全文不是节选
6. 跑一次 `npm run build --workspace=@trade/regulations`，CI 全绿再 push
7. push 后等 CF Pages 部署完，抽查 en / ja / de / ar 四个语言：六个元信息字段齐、gov.cn 链接 1 个、`__next_error__` 为 0
