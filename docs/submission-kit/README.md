# 投稿工具（submission-kit）

## 三份说明的分工

| 文档 | 讲什么 |
|---|---|
| 根 `README.md` | 总入口：两条写作路线、法规选题范围、内容纪律、审校与汇报格式 |
| `reference/README.md` | 领任务/队列命令、逐语审校口径 R1–R13 |
| 本文件 | 投稿工具的命令、判据归属、治理与封签 |

`README.md` 属框架层（SEALED），**只许维护者修改并重签**；编写者的建议写在
`FEEDBACK.md`（本目录，允许直接编辑，不参与封签）。

唯一入口 `submit.py`，覆盖起手 → 编写 → 检查 → 打包。真源：术语契约与词表
在 `data/glossary.db`，判据在 `plugins/*.py`，规则号/严重级/插件指纹在
`data/rules_registry.json`，版本号在 `meta.policy_version`。

**命令的 cwd 口径**：`python submission-kit/submit.py … --tmp tmp` 在仓库根执行；
`python submit.py … --tmp ../tmp` 在工具包目录内执行。两者等价，只换前缀与临时根。
`--tmp` 必须在工具包之外（包内路径 rc=2）。

**想查策略细节，跟着策略走，不要另建文档**：判据理由看插件文件头 `RATIONALE`；
词表分类看 `plugins/_lexicon.py` 头部；工具阈值看 `tools/<工具>.py` 的模块 docstring；
三类归属与射程原则看本文件「代码分层」。

---

## 环境

Python 3.9+ 与 **PyYAML**（`"<你的python>" -m pip install pyyaml`）为必装。缺依赖时
入口直接 rc=2 并给出安装命令，不退回内置降级解析——降级会让格式坏的稿子本地全绿。
`doctor` 把依赖版本写进结论。

---

## 全流程

```bash
# ① 起手：条目落进投稿目录对应线，默认只留 zh 母版（--tmp 必填）
python submission-kit/submit.py start blog --slug=<slug> --root=submission \
       --title="中文标题" --tmp tmp
python submission-kit/submit.py start regulation --slug=<slug> --root=submission \
       --entry-name=REG<n>-<slug> --title="中文标题" \
       --published-at=2026-11-01 --effective-at=2027-01-01 --tmp tmp

# ② 编写：zh 母版定稿 → 审核预览 → 过审后逐语落稿
python submission-kit/submit.py preview submission/blogs/<条目名>/
#   过审前不进入翻译；过审后写 work/<kind>/<slug>/content/<lang>/<slug>.mdx

# ③ 检查指定单篇（默认，zh + 47 译语）
python submission-kit/submit.py check submission/blogs/<条目名>/ --tmp tmp

# ④ 机检 PASS 后做逐语人工审计，两轮逐语直读（口径 R1–R13）
python submission-kit/submit.py tools audit_prep \
       --entry <条目根> --out <tmp根>/<编号>/audit

# ⑤ 问题回流：可机检问题写包外 tmp 草稿并当场 rules import；词形写 glossary

# ⑥ 打包：只收 48 语实际文件齐全的条目
python submission-kit/submit.py pack --root=submission --tmp tmp
```

`start` 只做结构与元数据机械替换（slug 落到目录名、文件名、frontmatter、
`submission.json` 与图片目录），不改写内容。默认 `--langs=zh`；`--langs=zh,en`
须成对给 `--title-en`/`--excerpt-en`，且 title/excerpt 与 en frontmatter 逐字
一致（M09）；不含 zh 直接 rc=2。

**条目根白名单**：博客/法规条目根只允许 `work/` 与 `preview_zh.html`；`check`
清点后发现白名单外文件即移出（走 stderr 与 `--json.purged`），`--keep-extras`
可整体停用。点开头的文件/目录（`.git`、`.gitignore`、`.DS_Store`）永不参与清场。

**preview**：从 zh 母版渲染 `preview_zh.html`，封面与配图只取
`work/<kind>/<slug>/images/`；法规正文遇 `<!-- original -->` 自动插分隔条。
接受条目根、`work/` 或 `content/zh` 任意层级，`--out` 可改输出位置。

---

## 路径与临时根

- 工具包只解析自身位置（`KIT` = `submit.py` 所在目录）；项目与内容路径一律显式
  传入，不读 cwd 推断、不向父目录搜索。工具包可解包到任意目录。
- `start --root=<dir>` / `pack --root=<dir>` 必填；`<dir>` 必须是**投稿目录**
  （其下直接含 `blogs/` 或 `regulations/`），传项目根或工具包内部 rc=2。
- `check <path>` 的位置参数即路径（线根、`work` 根或单篇）；默认只查该单篇，
  全库须显式 `--all` 并确认（非交互加 `--yes`）。
- `doctor [--root=<dir>]` 缺省只扫工具包自身；`--fix-longpaths`（Windows，需管理员）。
- `--tmp` 只认显式指定：无默认值、无环境变量；相对路径相对 cwd 解析；**不许指向
  工具包内部**（含 `..`/大小写/软链绕回，rc=2）。判定在入口 argparse 之前，透传
  工具与 `glossary family-*` 同样受管。
- 写盘/移动类命令（`start`/`pack`/`clean`/`rules import|delete`）`--tmp` 必填；
  只读命令可不指定。`check`/`selftest` 给了就把 stderr 与 JSON 存档到
  `<tmp>/logs|json/`，stderr 打印 `[存档]` 路径。
- **删除即归档**：所有非白名单文件、临时文件一律**移动**到
  `<tmp>/待删除/<label>-<时间戳>-<id>/`，不真删、可恢复；工具包内不许有 `tmp/`，
  出现即整目录归档（`pack` 也排除）。`core/tmp_root.py` 提供
  `resolve_tmp / argv_tmp / tmp_path / pending_root / mkdtemp / archive_delete`。
- 多机：`data/glossary.db` 随包（分发包是 `VACUUM INTO` 净化快照）；多人共享库
  用 `--db=<共享文件>`。`.cache/`（字节码）、`.state/`（启停）可删，会自动重建。

---

## 治理：谁可以改什么

| 角色 | 可做 | 不可做 |
|---|---|---|
| **维护者**（持 `.keys/seal.key`） | 改 SEALED（`core/`、`submit.py`、`tools/`、`selftest/`、`README.md`）并重签；`rules adopt`（仅注册表缺失/损坏）；`pack --kit-only` | — |
| **编写者**（默认） | 写稿、`preview`、`check` 单篇、`pack`、`audit_prep`；`glossary get\|list\|add\|update\|import`；`rules list\|diff\|import\|delete`；`doctor`/`integrity`/`hygiene`；**编辑 `FEEDBACK.md`** | 改框架代码、`README.md`、`plugins/` 手写、改注册表、`rules adopt`、`sign`、全库 `check --all` |

**判据可随时由编写者导入**：包外 `tmp/rule-draft/` 写草稿 → `rules import`
（静态校验 → 原子落盘 → 装载 → 自检臂实跑 → `policy_version+1`，失败回滚）→
本条及后续稿件立即生效。导入造成封签暂不一致**不阻塞稿件包**；分发工具包前
由维护者重签。

**变更分级**

| 级 | 改什么 | 路径 | 验证 |
|---|---|---|---|
| L1 | 词形/词表/契约（数据） | 只经 `submit.py glossary` | `doctor`；`_rule_data`/`_word_data` |
| L2 | 判据逻辑 | 包外草稿 → `rules import`（**禁止直接改 `plugins/`**） | 入口内置臂实跑 → `doctor` → `integrity` |
| L3 | 机制层（`core/`、`submit.py`、`tools/`、本文件） | 维护者改后重签 | 提交说明写理由与等价断言 → `selftest --kit` 全 FAIL 0 → 带 **[arch]** |

**三个只读命令**：`rules diff` 查注册表 vs 磁盘；`doctor` 查库/插件/契约一致性
与架构守卫；`integrity` 查封签 + 工作区差异 + 库快照 + 守卫臂 + doctor。

**三条铁律**

1. 策略面 = `plugins/` + `data/glossary.db`；`core/consts/` 只放语言机制
   （句末标点集、文种映射、边界策略、数字读法）。
2. 改库只能通过 `submit.py glossary`；`tools/` 无裸 SQL 写，DML 全在 `core/db.py`。
3. 判据数据源以字面量出现在调用点（如 `phrase_block(view, "用途")`）。

### 封签与还原

| 面 | 范围 | 判定 |
|---|---|---|
| SEALED | `core/`、`submit.py`、`tools/`、`selftest/`、`plugins/_*.py`、**`README.md`** | 逐字节一致；编写者模式入口自动还原改/删，清单外新增归档 |
| TRACKED | `plugins/*.py` + 同名自检臂 | 以注册表 sha 为准；手改/未登记 → 归档 |
| ASSETS | `template/**` | 只登记、不打包、不自动还原；改动报差异 |
| RUNTIME | `glossary.db*`、封签四件、`rules_registry.json`、`FEEDBACK.md`、`.gitignore` | 允许存在，不参与封签 |
| 库快照 | `glossary.db` 逐表有序行哈希 + `policy_version` | 表变版本未变 = 疑似绕过工具写库 |

```bash
python submit.py tools integrity_seal keygen --install  # 首次生成密钥对
python submit.py tools integrity_seal sign              # 任何 SEALED 改动后重签
python submit.py tools integrity_seal verify            # 使用方自查
python submit.py integrity --restore                    # 无 git 时用 sealed.zip 还原
```

维护者持私钥（`.keys/seal.key`，**永不进包**），使用方只拿公钥验签，零配置。
改 SEALED 后必须 `sign` 并提交 `data/integrity.json` / `.sig` / `sealed.zip` /
`trust_anchor.txt`，否则接收方验签必红。`sign` 打印的公钥指纹须与包外记录一致。

---

## 问题回流

| 问题类型 | 落点 | 凭据 |
|---|---|---|
| 文本/结构缺陷 | 包外草稿 → `rules import` 成对导入 | 新规则 ID；`rules diff` 零差异 |
| 语义/词形/概念 | `data/glossary.db` 契约或 `lexicons` | `glossary get <id>` 可查 |
| 新增防线 | 同名自检臂（一规则至少一臂） | 注入报红 + 还原转绿 FAIL 0 |
| 对框架/文档的建议（暂不能机检） | 本目录 `FEEDBACK.md` | 维护者重签前读取并决定采纳 |

禁止只改本篇稿件了事：同类缺陷会复发。确实无法机检的语义结论写进契约
`options.note` 或 `reference/README.md` 的 R1–R13 口径。契约锚点必须绑定本篇
独有整句，不能用泛化概念词。逐语审计材料由 `tools/audit_prep.py` 生成（只读、
不判分、不改稿）。

---

## 命令

在仓库根执行（`python submission-kit/submit.py`）；在包内去掉前缀、`--tmp ../tmp`。

```bash
# 检查
check <单篇路径> [--json] [--jobs=N] [--no-parity] --tmp tmp
check <投稿目录根> --all [--yes] [--jobs=N] --tmp tmp       # 全库须确认
check <draft.md> --body [--until=<标记>] --tmp tmp          # 草稿文风速检
#   --body 只跑 ST01–ST08 + B03/B07/B08 + P01；完整规则集见 rules list
preview <path> [--out=<file>]
doctor [--root=<dir>] [--fix-longpaths]
integrity [--tmp tmp]
hygiene [--json]
clean --apply --confirm --tmp tmp
selftest [--only=<分类>] [--kit] --tmp tmp

# 策略库（唯一数据权威）
glossary list|get|add|update|delete|audit|scan|export|import|diff|resolve
glossary lexicon [--id=<词表>] [--key=<键>] [--value=<值>] [--remove|--payload-file=rows.json]
glossary family-import|family-recheck|family-trim|pair-open   # 词族四工具，--dry-run 预览
glossary migrate                                              # schema 前向迁移（幂等）

# 规则与插件
rules [list] [--verbose] [--json]
rules diff                                                    # 注册表 vs 磁盘（只读）
rules import --plugin <草稿> --selftest <草稿> --yes --tmp tmp
rules delete <RULE_ID> --yes --tmp tmp
rules adopt --yes                                             # 仅注册表缺失/损坏时
plugin list|verify|enable|disable|report

# 打包与运维
pack --root=<dir> [--only=blog|regulation] [--slug=...] [--kit-only] --tmp tmp
tools integrity_seal keygen|sign|verify|status
hooks install
version
```

`--db=<path>` 是自检臂的测试注入能力。`--jobs=N` 只在 `--all` 全库扫描下生效。

**退出码**：0 = 无 error（warning 不阻断）；1 = 稿件有 error；2 = 配置/库/插件
故障、`doctor` 失败、缺 `--tmp` 或 `--tmp` 指向包内；3 = 并发或 changeset 冲突。
`--json` 时 stdout 纯 JSON，诊断写 stderr。

---

## 打包与 dist/

`pack --root=<投稿目录>` 一次产出双包，落 `<root>/dist/`。

- **全文档包** `submission-<yyyymmdd>-rN.zip`：顶层只 `blog/` + `regulation/`。
  **只收 48 语实际文件完整且非空的条目**（`content/<lang>/<slug>.mdx`），
  不采信 `submission.json.locales` 声明；半成品进 `manifest.skipped`，
  `--strict` 则中止。内容机检不在打包环节跑，由编写人打包前自行 `check`。
- **工具包** `submission-kit-v<policy_version>-<yyyymmdd>.zip`：含 `VACUUM INTO`
  净化的 `glossary.db`（无 WAL/SHM）、固定 ZipInfo 时间戳、拒绝静默覆盖。
  出稿件包时封签过期只跳过工具包重出；`--kit-only` 时封签必须一致否则 rc=2。
- `manifest.json`：双包 sha256、条目清单、`submit.py` sha、策略版本与 changeset 基线。
- `dist/` 只允许两类 zip 各留最新 5 份 + `manifest.json`，其余一律归档到
  `<tmp>/待删除/dist-stale-*`；`--out` 只接受 `submission-YYYYMMDD-rN.zip`。

`template/{blog,regulation}/` 是唯一内容资产根：每线一篇 48 语齐全的合格样例，
兼作官方尺（`check template` 判绿）与起手模板（复制后裁语言、逐字段改写）。

**文章配图文件名**须有意义、kebab-case（≥2 段、≥8 字符）、描述画面内容；
`fig-01.webp` 会被 I09 判错，`cover.webp` 是固定封面名不参与该规则。细则见
插件 `RATIONALE`。

---

## PASS 的语义

`PASS` = 「本次已执行的规则未发现 error」，**不等于语义终审**。术语语义错配、
译文事实核验、母版过审仍靠人工；两轮逐语直读（修复后再通读一遍）不可由机检
替代，口径见 `reference/README.md` 的 R1–R13。

- **C01** = 检查器本身有问题（库读不出、配置错、插件加载/运行失败）：结果行
  `ERROR`、rc=2，不会出现 PASS。
- **`skippedPlugins` 非空**时 PASS 不含被跳过的规则，修好后必须重跑。
- **H01/H02** 只是工具包目录卫生，不改稿件结论与退出码。

---

## 代码分层

| 类别 | 是什么 | 放在哪 | 改它意味着 |
|---|---|---|---|
| 判据（怎么判） | 阈值、分支、消息、射程 | `plugins/<类>-<名>.py`，一规则一文件 | 代码评审 / `rules import` |
| 词形载荷（判什么） | 黑名单、模板、正误对、词族 | `data/glossary.db` 的 `lexicons` | 改数据，`policy_version+1` |
| 语言机制（语言怎么运作） | 数字读法、量级词、词界策略、脚本集、缩写集、否定词 | `core/consts/` | 代码评审（等于改判据） |

判断顺序：① 能否逐语向枚举 → 能则词形载荷，否则语言机制；② 改它是否要读代码
上下文 → 加黑名单词是数据，改阈值/射程/消息是代码；③ 是否被多条规则复用 →
通用能力进 `core/`。

**射程的合法维度只有语向、词类、结构**。判据里出现篇目 slug 就是设计错了：
要么其实是某类术语，要么按当前规则照实报错——没有按篇豁免。

`core/` 只给测量原语（命中数、位置、归一后的数字），**不返回结论**。守卫臂
`_word_data` 钉住 consts 白名单与词表归属；A9 钉住 `core` 不得 import `plugins`、
`plugins/` 只允许 `_lexicon.py` 一个共享层且不得夹带判据与数据。

`tools/` 是维护者侧离线工具（词族/概念对/术语/规则数据质量），不在 `check`
流水线：入口 `python submit.py tools <名字>`，新增工具须登记 `tools/__init__.py`
的 `CATALOG`。判据与运维没有中间态：参与「这份稿子能不能过」的是插件，
回答「数据质量如何、该补什么词」的是工具。

### 新增一条判据（编写者随时可做）

1. 在**包外**写两份同名草稿：`tmp/rule-draft/plugin/<分类>-<名称>.py` 与
   `tmp/rule-draft/arm/<分类>-<名称>.py`。插件必填
   `RULE/RULES/PHASE/CATEGORY/APPLIES_TO/NEEDS/SEVERITY/ENABLED/COVERAGE/RATIONALE`
   （`RATIONALE` ≥80 字，写实测出处）+ `run(view, emit)` + `review(finding, view)`。
   `CATEGORY` 须等于文件名前缀且属 13 类之一；`COVERAGE` 写实际射程
   （`langs`: `all`/`scripted`/列表；`zones`: `frontmatter`/`body`/`metadata`/
   `images`/`package`，到处都看写 `["any"]`）。
2. 自检臂走 `H.main([(RULE, mutate, "说明")])` 或自带 `main()`；入口会实跑，
   注入不报红或还原不转绿即拒绝并回滚。
3. 导入：`submit.py rules import --plugin <草稿> --selftest <草稿> --yes --tmp tmp`。
   入口依次静态校验 → 原子落盘 → 装载 → 臂实跑 → `policy_version+1`。
4. 验收：`doctor` → `integrity` → `check <自己的条目路径>`；此后规则已生效。
5. 删除走 `rules delete <RULE_ID> --yes --tmp tmp`；分发新工具包前由维护者
   `sign` 并重出 `--kit-only`。

首次部署/灾后重建（仅注册表缺失或损坏）：`rules adopt --yes`，随后必须 `sign`。
注册表正常时 adopt 拒绝，防止「手写插件 → adopt 洗白」。

**架构守卫**（`doctor` 单一入口）：A1 无 `core/rules/`，`add(` 只在 checker；
A2 `tests/` 不得回流；A5 机制层不得出现 `RULE =`；A6 插件与自检臂文件名集合
相等；A7/A8 插件常量齐全、声明 `COVERAGE`、禁止内联 `add(`；A9 反向依赖与
共享层纯度。

---

## 策略库模型

三正交维度：`section`（body/banned/writing/excerpt/title/refs）、`assertion`
（require/require_all/forbid/verbatim）、`options`（其余配置）。`data/glossary.db`
共 6 张表，只含策略与词表，没有审计日志、actor 或时间戳：

| 表 | 一行是什么 |
|---|---|
| `meta` | 全局版本：`policy_version` / `schema_version` / `build_id` / `applied_cs` |
| `locales` | 一个语言码（只 `lang` 列，48 语） |
| `terms` | 一条契约：`options_json` 存词形以外的配置 |
| `anchors` | 一个中文锚点，绑定「该篇哪句原文激活契约」 |
| `forms` | 一个原子词形：`assertion × lang × value × match_mode`，重复入库即拦 |
| `lexicons` | 一个词表条目：`id / scope / key / value / target / meta_json / ord` |

完整表结构与 DDL 见 `core/schema.py`；`lexicons` 的类别清单、收录判据与访问
方式见 `plugins/_lexicon.py` 头部。契约载荷由 `core.db.payload_of()` 按固定映射
重建，库里不存在第二份真值。`forbid_re` 支持 `{"*": [正则]}` 对全部非母版语向
生效。`writing` 段由 WR01–WR05 消费，不登记按篇豁免。

多人协作：各自改本地库 → `glossary export --against=<分发库>` 出 changeset →
主线 `import` 整单事务应用；同条双方修改走 `resolve --ours|--theirs` 显式裁定，
重复 `cs_id` 幂等跳过。连接用 WAL + `BEGIN IMMEDIATE` + `revision` 乐观锁。

---

## 文件白名单

工具包内每个文件都必须命中 `integrity.allowed_files()` 的逐文件清单；`core/`
里凭空多出的 `.py` 同样违规。

| 清单来源 | 内容 | 谁能改 |
|---|---|---|
| SEALED | `core/`、`submit.py`、`tools/`、`selftest/`、`plugins/_*.py`、`README.md` | 维护者（改后重签） |
| ASSETS | `template/**` 逐文件摘要 | 维护者（改后重签） |
| 注册表 | `plugins/*.py` + 同名自检臂 sha256 | 编写者经 `rules import\|delete` |
| RUNTIME | `glossary.db*`、封签四件、`rules_registry.json`、`FEEDBACK.md`、`.gitignore` | 运行/入口；`FEEDBACK.md` 可由编写者写 |

**入口自愈**：入口最前执行 `core/selfheal.heal()`：编写者模式下 SEALED 被改/删 → 从
`sealed.zip` 逐字节还原；清单外新增 → 归档 `<tmp>/待删除/`；判据插件与注册表
sha 不符 → 归档。维护者模式跳过自愈。清单验签失败直接拒绝运行（只能从原始
分发包重解压）。归档保留原相对结构，可直接拷回。

`data/rules_registry.json` **不在 SEALED**：否则编写者每次 `rules import` 都会被
下次入口还原，「随时导入」无法成立；判据层以「注册表 ↔ 插件 sha 自洽」为准。

守卫臂：`_file_whitelist`（逐文件清单与自愈全链路）、`_rules_registry`（插件静态
校验与注册表审计）、`_integrity`（封签严格口径与还原）、`_layer_contract`（分层
契约）、`_strategy_home`（说明跟着策略走）

### 新内容写哪里

| 想写的内容 | 位置 |
|---|---|
| 判据理由、射程、校准记录 | 插件文件头 `RATIONALE` |
| 共享层机制说明 | `plugins/_*.py` 模块 docstring |
| 词表分类、收录判据 | `plugins/_lexicon.py` 头部 |
| 工具量什么、阈值怎么读 | `tools/<工具>.py` docstring |
| 三类归属、射程原则、变更分级、封签设计 | 本文件对应节 |
| 逐语审校口径（R1–R13） | `reference/README.md` |
| **对框架/文档的建议、改进意见** | **`FEEDBACK.md`**（编写者可写） |
