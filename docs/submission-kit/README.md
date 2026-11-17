# 投稿工具（submission-kit）

**仓库三份说明的分工**：根目录 `README.md` 是总入口（两条写作路线、纪律、
审校与汇报格式）；`reference/README.md` 讲领任务与逐语审校不可机检口径 R1–R12；
本文件只讲投稿工具的命令、判据归属、治理与封签。

唯一入口 `submit.py`，覆盖**起手 → 编写 → 检查 → 打包**。术语契约与语种注册
存在 `data/glossary.db`，检查项是 `plugins/*.py` 的独立插件；规则表由插件元数据
实时生成（`rules` 子命令），版本号唯一来源是数据库 `meta.policy_version`。

**怎么读本文件**：`环境` / `全流程` / `路径约定` 是上手必读；`治理` /
`问题回流` / `命令` / `退出码` / `临时根目录` / `打包与 dist` / `PASS 的语义`
是日常使用与改判据要看的；`目录` / `代码分层` / `新增一条判据` / `架构守卫` /
`策略库模型` / `并发与立刻生效` / `changeset` 是维护者内容。

**策略说明在哪**：跟着策略走，不另设文档目录——

| 想知道 | 看哪里 |
|---|---|
| 这条判据为什么这样定、射程多大、怎么校准的 | 该插件文件头 `RATIONALE`（`core/loader.py` 强制 ≥80 字并须写实测出处） |
| 这个词表怎么分类、收录判据、未证怎么标 | `plugins/_lexicon.py` 头部 |
| 词族召回/精度/射程/可判别性怎么量、阈值怎么读 | 对应 `tools/family_*.py`、`rule_p75_reach.py`、`pair_separability.py` 的模块 docstring |
| 三类归属（判据/词形/语言机制）与射程原则 | 本文件「代码分层」节 |


## 环境

| 依赖 | 用途 | 装法 |
|---|---|---|
| Python 3.9+ | 全工具链 | — |
| **PyYAML** | frontmatter 解析、图片尺寸校验、法规结构校验 | `"<你的python>" -m pip install pyyaml` |

PyYAML 是必装项。缺它时任何命令在入口直接退出（rc=2）并打印当前解释器的
安装命令，**不会**退回内置降级解析——降级会让格式坏的稿子本地全绿。
`doctor` 会把依赖版本打进结论（`deps` 字段）。

## 全流程

```bash
# ① 起手：条目落进投稿目录对应线，默认只留 zh 母版（--tmp 必填）
python submit.py start blog --slug=<slug> --root=submission \
       --title="中文标题" --tmp tmp
python submit.py start regulation --slug=<slug> --root=submission \
       --entry-name=REG<n>-<slug> --title="中文标题" \
       --published-at=2026-11-01 --effective-at=2027-01-01 --tmp tmp

# ② 编写：zh 母版定稿 → 审核预览 → 过审后逐语直接落稿
python submit.py preview submission/blogs/<条目名>/
#   过审前不进入翻译；过审后写 work/blog/<slug>/content/<lang>/<slug>.mdx

# ③ 检查指定单篇（默认；中文+译文全查）
python submit.py check submission/blogs/<条目名>/ --tmp tmp
# ③b 全库扫描（很耗时，须显式确认；--jobs 只在此生效）
python submit.py check submission --all --yes --tmp tmp --jobs=4
python submit.py check submission/blogs/<条目名>/ --json --tmp tmp

# ④ 47 语逐篇人工读取审计（机检 PASS 后必做）
python submit.py tools audit_prep --entry <条目根> --out <tmp根>/<编号>/audit

# ⑤ 问题回流：缺陷 → plugins/ 或 data/glossary.db + 同名自检臂（见下）

# ⑥ 打包
python submit.py pack --root=submission --tmp tmp
```

`start` 只做结构与元数据的机械替换（slug 同时落到目录名、文件名、
frontmatter、submission.json 与图片目录），不做内容改写；生成后 `check` 会报
缺语（S02），补齐 48 语后才转绿。默认 `--langs=zh`；`--langs=zh,en` 时须成对
给出 `--title-en` / `--excerpt-en`，且 `submission.json` 的 title/excerpt 受 M09
约束必须与 en frontmatter 逐字一致。`--langs` 不含 zh 会被拒绝（rc=2）。

**条目白名单**：博客/法规条目根只允许 `work/` 与 `preview_zh.html`。`check`
每次调用清点条目根，白名单外的文件/目录**发现即移出**（清单走 stderr，
`--json` 输出里同时给出 `purged` 字段，CI 可审计）。清场只发生在含 `work/`
的条目根这一层；`--keep-extras` 可整体停用（审计用）。

点开头的文件/目录**一律不参与清场**（`.git`、`.gitignore`、`.DS_Store`、
编辑器状态目录）：清场是为了让条目根只留内容，不是搬走版本控制元数据——
条目下临时 `git init` 做对照时，`.git` 必须原地不动。

**preview**：从 zh 母版渲染独立 `preview_zh.html`（博客/法规同版式），封面与
正文配图唯一取 `work/<kind>/<slug>/images/`；法规正文遇 `<!-- original -->`
自动插入分隔条。命令接受条目根、`work/` 或 `content/zh` 任意层级，`--out`
可改输出位置；frontmatter 用与判据同一份解析器。

## 路径约定

工具包只解析自身位置（`KIT` = `submit.py` 所在目录）；涉及项目或内容的路径
一律由调用者显式给出，代码不读 cwd 推断、也不向父目录搜索。

- `start --root=<dir>`（**必填**）：生成 `<dir>/work/<kind>/<slug>`。
- `check <path>`：位置参数即路径（线根目录、`work` 根或单篇草稿）。
- `pack --root=<dir>`（**必填**）：扫描 `<dir>/blogs` 与 `<dir>/regulations`，
  产物写 `<dir>/dist/`；`--root` 指向工具包内部会被拒绝（rc=2）。
- `doctor [--root=<dir>]`：`--root` 是旧名引用扫描的项目根；缺省只扫工具包自身。
  `--fix-longpaths`（Windows）把 `LongPathsEnabled` 设为 1，需管理员。
- `clean`：隔离区在工具包内 `.clean/`，插件启停状态在 `.state/plugins.json`；
  两者是点目录，不参与目录合规扫描，随包移动。
- 日志与 `--json` 里的路径统一输出相对 cwd 的正斜杠形式。
- **日志与 JSON 落盘**：任何命令只要给了 `--tmp`，stderr 诊断写
  `<tmp>/logs/<命令>-<时间戳>.log`、`--json` 结果写
  `<tmp>/json/<命令>-<时间戳>.json`（非 JSON 命令的报告写同名 `.out`）；
  结束在 stderr 打印 `[存档]` 路径。stdout 行为不变（`--json` 仍是纯 JSON）。

工具包可解包到任意目录；换位置后涉及项目/内容的命令都要带自己的 `--root` / `<path>`。

### 可移动与多机使用

- **自定位**：`KIT` = `submit.py` 所在目录，解包到任意路径（换盘符、中文路径、共享盘）即可运行；不安装、不读环境变量、不向父目录搜索。
- **策略库随包**：`data/glossary.db` 随工具包移动，分发包带的是 `VACUUM INTO` 净化快照（不含运行中事务）。多人/多机要共享同一份策略库时用 `--db=<共享路径>`（SQLite 单文件，避免同时写）。
- **稿件目录**：每台机器可以不同，`--root` / `<path>` 显式给；换机器只改参数，不改代码。
- **临时目录**：每台机器可以不同，`--tmp` 显式给（无默认值、无环境变量，且必须在工具包之外）；相对路径按当前工作目录解析。
- **整目录拷贝**：`.cache/`（插件字节码，按源码 sha 命名并校验 Python magic）与 `.state/`（插件启停）可一并删掉，缺失或跨 Python 版本会自动重建；点开头的运行态目录不进分发包。
- **只读部署**：读检查可直接用；`plugin enable/disable` 需要写 `.state/`，只读介质上会明确报「工具包目录不可写」而不是裸的 WinError。
- **Windows 长路径**：48 语 × 长 slug 的绝对路径可超过 260 字符（当前投稿树最长 276）。换机器前先确认目标机已启用长路径（`LongPathsEnabled=1`），或把稿件目录放浅；`doctor --root=<项目根>` 会打印最长路径与 ≥250 字符的文件数，超限且未启用时 `check --all --yes` / `pack` 也会提示，`doctor --fix-longpaths` 可一键开启（需管理员）。
- **Windows / Linux 同一套代码**：路径一律 `os.path.join`，对外输出统一 `/`；文本写文件固定 UTF-8 + `\n`；平台专属调用只有 `doctor --fix-longpaths` 的条件分支（`winreg` 仅函数内导入）。Linux 只需 Python 3.9+ 与 PyYAML，文件系统支持 UTF-8 文件名（归档目录名「待删除」）。`selftest/_portability.py` 用四个断言把这些约束钉住。Windows 与 Linux 两平台
跑同一套全量自检与全库批检，结论逐条一致；只读挂载下读检查照常，启停插件
给出可读报错。


## 治理：谁可以改什么，怎么改

**三条铁律**（守卫臂与钩子强制，详见本节与「代码分层」）：

1. **策略面 = `plugins/` + `data/glossary.db`**。判据词表不进 `core/consts/`
   ——那里只放语言机制（句末标点集、文种映射、边界策略、数字读法）。
2. **改库只能通过投稿工具**：`submit.py glossary`（含词族四工具透传与
   `lexicon --payload-file` 批量喂库）。`tools/` 无裸 SQL 写，DML 一律在
   `core/db.py`（事务 + 幂等键 + policy_version 留痕）。
3. **判据数据源以字面量出现在调用点**：插件里的 `phrase_block(view, "用途")`
   必须写死用途字符串（`_rule_data` 靠它核对数据源有效性）。

### 变更分级

| 级 | 改什么 | 路径 | 必做验证 |
|---|---|---|---|
| L1 | 词形/词表/契约/登记（数据） | 只经 `submit.py glossary` | doctor；`_rule_data`/`_word_data`；必要时单包 check |
| L2 | 插件判据逻辑 | 改 plugins/ 一规则一文件 | `plugin verify → sync` → doctor → selftest 对应臂 → check 基线比对 → 更新 RATIONALE |
| L3 | 机制层（core/、submit.py、tools/hooks、reference/submission_queue.py） | 见下方 L3 流程 | 提交说明写明理由与行为级等价断言 → `selftest --kit` 全量 → 带 **[arch]** |

**L3 流程**：改机制层先把理由和等价断言写进提交说明，`selftest --kit` 全量
FAIL 0 后再提交，说明带 **[arch]**。理由与验收结果留在提交说明和工作日志，
本文件只写当前规则，不记变更编年史。

### 被非法改动怎么发现、还原

```bash
python submit.py integrity --tmp tmp     # 五项：⓿ 封签 ① 工作区 ② 库 ③ 守卫臂 ④ doctor
python submit.py integrity --restore     # 无 git 时的还原：用封签归档覆盖机制层
```

**⓿ 封签校验不依赖 git**——分发出去的工具包通常不带 `.git`，这道检查只读
文件系统与 SQLite：

| 面 | 范围 | 判定 |
|---|---|---|
| **SEALED**（机制层） | `core/`、`submit.py`、`tools/`、`selftest/`、`plugins/_*.py` | 必须与签名清单**逐字节一致**；改动/缺失/多出即 FAIL 并点名 |
| **TRACKED**（判据） | `plugins/*.py`（178 个） | 允许改，但列出相对封签的差异，供复核 RATIONALE 与 check 结果 |
| **库快照** | `glossary.db` 逐表有序行哈希 + `policy_version` | 表变而版本未变 = **疑似绕过工具写库**；版本也变 = 正常变更 |

还原路径：

- **无 git / 分发环境**：`submit.py integrity --restore` —— 用 `data/sealed.zip`
  （签名时一并产出的原件归档）覆盖机制层，再复验；归档本身被替换时其摘要
  已进签名，验签会失败，需从原始发布包重取；
- **有 git**：`git checkout -- <文件>`，已提交的用 `git revert`；
- **库**：`git checkout -- data/glossary.db`（逻辑与 HEAD 一致时安全）；
  已提交的库变更用 `glossary diff --against=<基线>` 追溯，多人分歧走
  `glossary resolve --ours|--theirs`；
- **还原前先跑一次 `integrity` 留现场快照**（日志在 `tmp/logs/`）。

### 防改机制（四层）

1. **封签（Ed25519 分离签名）**：私钥只在发布方本机（`.keys/`，不入包、
   不入库），公钥硬编码在 `core/integrity.py`。分发后使用者**没有私钥**，
   改机制层就再也签不出合法清单 → 验签必红。这是唯一不依赖 git 的防线；
2. **commit-msg 钩子**：`python submit.py hooks install` 安装后，
   机制层文件的提交说明无 `[arch]` 即拒绝提交（`--no-verify` 可越过，留痕）；
3. **守卫臂矩阵**：`_db_write_surface`（除 core/db.py、core/schema.py 外
   无裸 SQL 写）· `_word_data`（consts 词形白名单 + 库用途行数基线）·
   A1/A5/A9（core 纯度）· `_lexicon_contract` · `_lexicon_behavior` ·
   `_integrity`（RFC 8032 向量 + 篡改/还原/zip-slip + 分发口径 41 断言）；
4. **机制层文件头声明**：机制层文件头部带治理声明，指回本节。

判据插件（plugins/ 除 `_` 前缀外的 178 个文件）**是允许修改的面**，不设
头部声明；改法见「新增一条判据」。

### 封签运维（发布方一次，使用方零配置）

```bash
python submit.py tools integrity_seal keygen --install   # 生成 .keys/seal.key + 写公钥
python submit.py tools integrity_seal sign               # 出清单/签名/还原归档/锚点
python submit.py tools integrity_seal verify             # 使用方自查
python submit.py tools integrity_seal status             # 封签摘要
```

**发版纪律**：任何 SEALED 文件改动 → `sign` 重签 → 提交
`data/integrity.json` / `.sig` / `sealed.zip` / `trust_anchor.txt`。
没有重签就发出去，接收方 `integrity` 第一项就会 FAIL。`pack` 自带这道门禁：
封签过期时直接拒绝打包，不会把「验不过」的包发出去。

### 私钥与分发（工具包可整体拷走）

**私钥永不进包**，也不需要进包。Ed25519 是分离签名：**发布方持私钥签，
使用方拿包内公钥验**——把私钥放进分发包，等于把「重签权」发给每一个拿到
包的人，防篡改当场归零；而且一旦被改，无法判断是谁改的。

| 材料 | 在包里？ | 说明 |
|---|---|---|
| `data/integrity.json` / `.sig` | ✅ | 清单与签名，验签必需 |
| `data/sealed.zip` | ✅ | 机制层原件归档，`integrity --restore` 用 |
| `data/trust_anchor.txt` | ✅ | 公钥指纹（包外另有一份记录可比对） |
| `core/integrity.py` 里的公钥 | ✅ | 验签只用公钥 |
| `.keys/seal.key`（私钥） | ❌ **永不** | 只在发布方本机，`.gitignore` + 打包硬闸双保险 |

三道保险防止私钥混入分发包：

1. `.gitignore` 排除 `.keys/`，`git archive` 天然不带；
2. `pack` 的 `kit_skip()` 遇 `.keys/`、`*.key`、`*.pem`、`*.p12`、`*.pfx`
   **直接抛错**（不是静默跳过——静默跳过会让人误以为「本来就没打进去」）；
3. zip 写完后重读条目再自检一次，混入即删除产物并报错。

接收方零配置：解压 → `python submit.py integrity`，第一项就是验签（不需要
git、不需要私钥、不需要联网）。**要交出发布权**只有两条路，都不走压缩包：
① 接收方 `keygen --install --force` 生成自己的密钥对并全量重签——新信任根，
公钥指纹随之变化，旧签名作废；② 原发布方线下交接 `.keys/seal.key`，延续
同一信任根（适合团队内换经手人）。

**唯一需要人工核对的环节**：`sign` 打印的 `SHA256:<16位>` 公钥指纹，要与
发布说明 / README / 邮件里的记录一致。攻击者若能同时改公钥并重签，只有
这个包外指纹能发现——包内的一切（含清单、归档、锚点文件）都可能被替换，
指纹必须来自包外。其余判定全自动。

**边界（如实说明）**：root/管理员权限可以改任何文件、也可以改 Python 解释器；
封签防的是「改了还想过检查」，不是「有权限的人强行运行」。私钥丢失或泄漏的
处置相同：`keygen --install --force` 重新生成 → `sign` 全量重签 → 把新指纹
发出去，旧签名一律作废。



---

## 问题回流

写作、检查、修复中发现的问题，凡能机检的必须通用化进本工具：

| 问题类型 | 落点 | 验收凭据 |
|---|---|---|
| 文本/结构缺陷 | `plugins/<分类>-<名称>.py` 一规则一文件 + RATIONALE | `rules` 出现新规则 ID |
| 语义绑定缺陷（词形 / 文号 / 概念） | `data/glossary.db` 契约 | `glossary get <id>` 可查 |
| 上述两类的新增防线 | 同名自检臂，一规则至少一臂 | 注入报红 + 还原转绿，FAIL=0 |

- 判据只能写 `plugins/`；术语策略写 `data/glossary.db`；语向级/篇级
  **受控词表**写 `data/glossary.db` 的 `lexicons` 表（A9：core 不得 import
  plugins；`plugins/` 只允许一个访问层 `_lexicon.py`，不得夹带 `RULE`/`emit`，
  且必须被至少一处 import）；只读运营工具放 `tools/`。回归只有 `selftest/`
  一条路。
- **禁止只写 `tmp/`**：确实无法机检的语义层结论，写进契约 `options.note`
  或 `reference/README.md` 的 R1–R12 口径，并在汇报「回流」栏点名。
- 契约锚点必须用**本篇独有整句**，不能用泛化概念词。
- 逐语人工审计用 `tools/audit_prep.py` 出对照材料（只读，不判分、不改稿）。
- `doctor` 的 `core/contract_health.py` 门禁自动查「回流了却静默失效」：
  孤儿锚、坏正则、require/forbid 自碰、payload 结构损坏、重复 banned 词形。
- 改判据固定链见「新增一条判据」第 4 步；定版提交前自跑一轮全部电池，
  让全绿凭据对应当前源码。




---

## 命令

```bash
# 内容检查
python submit.py check <单篇路径> [--json] [--jobs=N] [--no-parity] --tmp tmp
python submit.py check <投稿目录根> --all [--yes] [--jobs=N] --tmp tmp  # 全库须确认
python submit.py check <draft.md> --body [--until=<标记>] --tmp tmp   # 草稿文风速检
#   --body 只跑 ST01–ST08 + B03/B07/B08 + P01；完整 179 条规则须落进条目后跑 check

# 检查射程：默认只查 <path> 指定的单篇（中文母版 + 47 译语），编写者各自
#   指定自己的条目即可，工具不跨篇。全库扫描须显式 --all 且确认：
#   · 非交互脚本：加 --yes；· 交互终端：输入 yes。
#   忘了 --all 直接给投稿目录根，会提示「是否想全库扫描（很耗时）」。

# 策略库（唯一数据权威）
python submit.py glossary list --section=body --lang=fr
python submit.py glossary get <id> --section=body
python submit.py glossary add --section=body --payload-file=term.json
python submit.py glossary update --section=body --payload-file=term.json --base-revision=3
python submit.py glossary delete <id> --section=body
python submit.py glossary scan --term=<词形> [--lang=<lg>]   # 按词形反查契约
python submit.py glossary audit --term=<禁用形条目 id> --face=work
python submit.py glossary export --since=1 --out=cs.json
python submit.py glossary import cs.json [--dry-run]
python submit.py glossary diff --against=baseline.db
python submit.py glossary resolve cs.json --ours|--theirs
python submit.py glossary lexicon [--id=<词表>] [--key=<语向|篇目>] [--json]
python submit.py glossary lexicon --id=neighbor --key=no --value=hvad --target=hva   # 登记
python submit.py glossary lexicon --id=neighbor --key=no --value=hvad --remove      # 删除
python submit.py glossary migrate        # 补建/升级 schema（幂等）
python submit.py glossary lexicon --id=phrase-block --payload-file=rows.json
#   批量登记词表行（JSON 行数组；--key 作 key 前缀）——consts 词表迁库
#   与补词形的正规路径，整批一个事务一次 bump
python submit.py glossary family-import  --family fam.json --audit audit.tsv
python submit.py glossary family-recheck --family ... --audit ... --apply
python submit.py glossary family-trim    --deny deny.json --apply
python submit.py glossary pair-open      --family ... --audit ... --gate ...
#   词族运营四工具（写库）只能经此入口；参数原样透传，--dry-run 预览

# 完整性（防篡改）
python submit.py integrity [--tmp tmp]
#   机制层未提交差异 + 库 vs HEAD 逐表比对 + 守卫臂 + doctor，异常给还原指引

# 插件与规则
python submit.py plugin list|sync|verify|enable|disable|report
python submit.py rules [--verbose] [--json]
python submit.py preview <path> [--out=<file>]
python submit.py doctor [--root=<dir>] [--fix-longpaths]
python submit.py hygiene [--json]
python submit.py clean --apply --confirm --tmp tmp
python submit.py selftest [--only=<分类>] [--kit] --tmp tmp
python submit.py pack --root=<dir> [--only=blog|regulation] [--slug=...] [--kit-only] --tmp tmp
python submit.py version
```

`--db=<path>` 是测试注入能力（自检臂用 `VACUUM INTO` 造临时库）。
`--tmp` 在**会写盘或移动文件**的命令上必填（`start` / `pack` / `clean`），
未指定直接 rc=2 退出。`check` / `selftest` 的 `--tmp` 是可选的：给了就把
stderr 诊断与 `--json` 结果存档到 `<tmp>/logs|json/`，不给则只在终端输出。
（`check` 的条目白名单清场也走 `<tmp>/待删除/`，所以会清场时仍建议给。）

`--jobs=N` **只在 `--all` 全库扫描下生效**（进程池按包并行）；单包检查固定按语向
串行，传了会给一行提示而不是静默忽略。单包 48 语约 13 秒，全库 77 包串行
约 19 分钟，`--jobs=4` 视机器约 5–6 分钟。

`glossary audit` 默认扫描 `<工作区根>/submission/{blogs,regulations}` 的
`work` 面（须有 zh 母版且至少两语面）；换目录用 `--root` 与 `--roots`，
显式 `--roots` 也接受绝对路径。`--term` 传禁用形条目 id（不带
`section:` 前缀）。一篇稿件都没找到时结论为 `REJECT` 并退出 1——不接受
无稿件的 `ACCEPT`。`--json` 输出 `articles` / `lang_faces` / `roots` 便于核对射程。

## 退出码

| 码 | 含义 |
|---|---|
| 0 | 无 error（warning 不阻断） |
| 1 | 稿件存在 error |
| 2 | 配置／策略库／插件故障；`doctor` 失败；缺 `--tmp` 或 `--tmp` 指向工具包内部 |
| 3 | 并发冲突或 changeset 冲突 |

`--json` 时 stdout 只输出 JSON，诊断写 stderr；输出含 `checkerVersion`
（即 `policy_version`）与 `configErrors`。

## 临时根目录（--tmp）与「删除即归档」

所有非白名单文件、临时文件、中间过程文件，删除时一律**移动**到
`<tmp>/待删除/<label>-<时间戳>-<id>/`，不真删、可恢复；非投稿文档与
中间过程文档都以 `--tmp` 为根组织目录结构。

- CLI 统一 `--tmp <路径>` / `--tmp=<路径>`；模块 `core/tmp_root.py` 零依赖，
  函数 `resolve_tmp / argv_tmp / tmp_path / pending_root / mkdtemp / archive_delete`。
- **只认显式指定**：无环境变量、无默认值；相对路径相对当前工作目录解析。
- 涉及删除/中间产物的 `start` / `check` / `pack` / `clean` 未指定即报错退出；
  只读命令（`doctor` / `version` / `rules` / `hygiene` / `preview` / `glossary`）不受影响。
- **不许指向工具包内部**：`--tmp` 落在工具包内（含工具包根、任意子目录，以及
  用 `..`、大小写变体、软链绕回来的同一位置）一律 rc=2 拒绝，报错里给出工具
  包根与包外示例。判定在 `submit.py main()` 的**最前面**（argparse 之前），
  所以 `tools <名字>` 透传与 `glossary family-*` 同样受管，不会抛 Traceback。
  理由：① 工具包结构规则要求包内不得有 `tmp/`（见下条），临时根指进包里等于
  每条命令先制造一次结构违规；② `pack` 只排除包内 `tmp/`，其余包内目录会被
  打进分发包——待删除区与中间产物会跟着分发出去。
- 已接入的删除点：start 覆盖与裁语言、check 条目白名单清场、pack 的 DB 快照
  与 staging、dist/ 清场、clean 锁文件、全部电池夹具清理。
- **工具包内不许有 `tmp/`**：临时根是包外的 `tmp/`（通常写作 `--tmp ../tmp`，
  与工具包放在哪无关，随命令传入；工具包不推导仓库根，也不会有默认值）。
  工具包内出现 `tmp/` 属结构违规：入口会**整目录**归档到
  `<repo>/tmp/待删除/foreign-<ts>/`，`pack` 也排除 `tmp/`——即使误建也不会
  进分发包。

## 打包与 dist/ 口径

`pack --root=<投稿目录>` 一次产出双包，落 `<投稿目录>/dist/`：

- `submission-<yyyymmdd>-rN.zip`：全文档包，顶层只 `blog/` + `regulation/`，
  条目级预检 0 error 才进包，半成品自动跳过。
- `submission-kit-v<policy_version>-<yyyymmdd>.zip`：工具包，含
  `VACUUM INTO` 生成的净化单文件 `data/glossary.db`（无 WAL/SHM）、固定
  `ZipInfo` 时间戳可重现、拒绝静默覆盖。
- `manifest.json`：双包 sha256、条目清单、submit.py sha、策略版本与 changeset 基线。

**dist/ 清场（最终口径）**：目录内**只允许**
工具包 `submission-kit-*.zip` 最新 5 份、全文档包 `submission-YYYYMMDD-rN.zip`
最新 5 份、以及 `manifest.json`。**其余一切条目**（单篇单包、旧命名、
自定义 `--out` 名、非 zip 文件、子目录）每轮 `pack` 一律清除，按磁盘 mtime
判新旧，清走的归档到 `<tmp>/待删除/dist-stale-*`。因此 `pack --out` 只接受
`submission-YYYYMMDD-rN.zip` 形态，不符合直接在写盘前报错；要留自定义名
成品，自行另存到 `dist/` 之外。口径由 `selftest/_dist_rotation.py` 四个断言钉死。

解包后 `cd` 进解包目录，应能 `python submit.py check template --tmp tmp` →
`PASS 0e/2w`，`doctor` 通过，`data/glossary.db` 可写。

`template/` 是**唯一内容资产根**，固定为 `template/{blog,regulation}/`，
每个线目录恰一篇 48 语齐全的合格样例，同时承担两个角色：

1. **官方尺**：`check template` 判绿是唯一自检基准，也是全部自检臂的夹具源
   （`selftest/_harness.py` 每次把样例整目录复制到 `--tmp` 下再注入，原件永不改）。
2. **起手模板**：复制对应条目 → 裁掉 `content/` 下除 zh 外的语言 → 逐字段改写。
   样例与判据同步演进，判据改了样例必须跟着跑绿。

配图文件名要能承载检索词（I09）：用 `china-entry-checklist-four-checks.webp`
这类 kebab-case，`fig-01.webp` / `img2.webp` 会被判错；`cover.webp` 不参与该规则。

## PASS 的语义

`PASS` 只表示「本次已执行的规则未发现 error」，**不等于语义终审**。术语表
语义错配、译文事实核验、母版过审仍属人工终审范围；47 语逐篇人工读取审计
不能由机检替代。改判据前先读对应插件的 `RATIONALE`
（`submit.py rules --verbose`）。

「检查不完整」与「稿件合格」必须能区分开，三条硬保证：

- **C01 = 检查器本身有问题**（策略库未加载、契约配置错、插件加载/运行失败）。
  出 C01 时结果行是 `ERROR`、退出码 2，`PASS` 不会出现。插件 `run()` 抛异常
  也会转成 C01，不再只往 stderr 写一行。
- **`skippedPlugins` 非空**时结果虽仍可能是 `PASS`，但那份 PASS 不含被跳过的
  规则，等插件修好后必须重跑。它只覆盖「加载期」跳过（语法错、常量缺失），
  运行期崩溃已升级为 C01。
- **H01/H02 只是工具包目录卫生**，不参与稿件结论，也不改退出码。




---

## 目录

```
submit.py            唯一入口（起手 / 检查 / 打包 / 策略库 / 自检）
core/                框架层：只提供事实与调度，0 条判据
  consts/            常量与词表分包（8 个按定义顺序切出的分片 + __init__ 再导出）
  checker.py         包级守卫 + 插件调度（装载 → 建视图 → run/review → 归并）
  glossary_loader.py 术语策略装配与配置校验（C01）
  kit_hygiene.py     工具包目录体检（H01/H02，CLI 直接调用）
  view.py            事实层：ArticleView / PackageView（懒加载 + 缓存）
  loader.py          插件发现 / 热加载 / 字节码缓存 / 启停 / 规则覆盖度
  model.py           Context / Finding / 异常
  textutil.py        切块、数字归一、结构度量（纯工具）
  frontmatter.py     frontmatter / YAML 子集、行尾、日期校验
  pkgio.py           包加载与打包、路径安全、图片尺寸与完整性
  db.py              策略库读写（载入 / 写入 / changeset / 体检）
  schema.py          schema 5 DDL、前向迁移与结构校验
  preview.py         中文母版预览
  arch_health.py     架构守卫（A1/A2/A5/A6/A7/A8/A9）
  deps.py            必装依赖门禁
plugins/             判据实现层：一规则一文件（分类-名称.py），176 个插件
  _lexicon.py        词表访问层（取行 → 整形 → 缓存）；词形数据全部在
                     data/glossary.db 的 lexicons 表，A9 钉住唯一性与纯度
tools/               维护者工具层：可同时依赖 core + plugins，反向依赖不允许（A9）
  __init__.py        CATALOG：分组 / 用途 / 入口·守卫·手工（新增工具必须登记）
  family_*.py        词族生命周期：audit/precision/spec/import/recheck/trim/expand…
  pair_*.py          概念对：open（准入）/ separability（可判别性）/ probe（对举取证）
  term_*.py          术语：pref_audit（实频）/ candidates（候选）/ verify（回读）
  rule_*.py          规则侧：data_audit（数据源）/ p75_reach（射程）
  form_probe.py      词形探针：给一个正则，逐语数命中并打上下文
  db_diff.py         库逻辑比对（工作区 vs HEAD，逐表逐行）
  integrity_seal.py  封签运维：keygen / sign / verify / status
  hooks/             commit-msg 钩子（install_hook.py + commit_msg_scope.py）
  family_deny.json   版本化人工否决表（expand 默认读，trim 用来清存量）
selftest/            与 plugins/ 文件名 1:1 的 179 个自检臂 + 44 个 `_*.py` 工具级臂
data/glossary.db     随工具包分发的策略库
data/integrity.*    封签清单/签名/还原归档/公钥锚点（勿手改）
data/whitelist.json 人工放行清单（restore --allow 写入，L1 数据）
template/{blog,regulation}/  唯一内容资产根：官方尺 + 起手模板
README.md            本文件
```

点目录 `.state/`（插件启停）、`.clean/`（清理锁与隔离区）、`.cache/`（字节码）
是运行时产物，不参与目录合规扫描，也不进分发包。

## 代码分层

**三类东西，三处归属，不许混**：

| 类别 | 判据 | 放在哪 | 改它意味着 |
|---|---|---|---|
| **判据（怎么判）** | 阈值、分支、消息、射程声明 | `plugins/<类>-<名>.py`，一规则一文件 | 代码评审 |
| **词形载荷（判什么）** | 黑名单、模板、正误对、套话、术语族 | `data/glossary.db` 的 `lexicons` | 改数据，`policy_version` +1 |
| **语言机制（这门语言怎么运作）** | 数字读法、量级词、词边界策略、附着前后缀、脚本集合、缩写集、否定词、助词表 | `core/consts/` | 代码评审（等于改判据） |

`core/` 只给「测量原语」——命中数、位置、规范化后的数字，**不返回结论**。

三条可操作的判断标准：

1. **能不能逐语向枚举？** 能（「bg 把 P49 写成 `пералік звужаецца`」）→
   词形载荷 → `lexicons`；不能、而是在描述语言机制（「中文数字有十百千」）→
   `core/consts/`。
2. **改它要不要读代码上下文？** 加一条黑名单词只需知道「这个词不该出现」→
   数据；改阈值/射程/消息 → 代码。
3. **会不会被第二条规则复用？** 与规则无关的通用能力（`blocks()`、
   `normalize_digits()`）→ `core/`；只服务一条规则、名字里带规则号 → 该插件。

**射程的合法维度只有三个：语向、词类（形态或词表）、结构（位置/搭配）。**
判据里一旦出现篇目 slug，就是设计错了——要么它其实是「某一类术语」被写成了
「某一篇的词」，要么是交付在前的存量欠账（进 `baseline` 表，不进判据源码）。
同形冲突（`media` 在 az 是合法本词、在 el 是英文残留）也不能按篇放行解决：
写进结构判据，或按语向单列。

**一规则一插件**：判据写在 `plugins/` 单文件里，`core/` 只提供事实 + 调度。

| 层 | 放什么 | 不放什么 |
|---|---|---|
| `core/consts/` | 全局常量、正则、枚举、**语言机制词表**（数字读法/附着前后缀/脚本集/缩写集/否定词） | 任何 `core.*` / `plugins.*` 导入；**判据载荷**（黑名单/模板/套话 → `lexicons`） |
| `core/model.py` `textutil.py` `frontmatter.py` `pkgio.py` | 模型、纯工具、解析、包读写 | 带规则编号的判断 |
| `core/view.py` | 事实层（懒加载 + 缓存） | 判红 |
| `core/checker.py` | 装载 → 视图 → 收 finding → `review` 归并 | 逐语规则 |
| `plugins/` | 判据实现：九项常量 + `run` + `review` | 跨规则共享状态；词形数据（在库） |
| `plugins/_lexicon.py` | 词表访问层：取行、整形、`hits()` 五档匹配、缓存 | 词形数据（在库）、判据、阈值 |
| `tools/` | 只读运营工具（逐语审计准备器） | 判据；被 `core/` 反向依赖 |

判据与词形的归属见本节开头「三类归属」；边界由 `selftest/_word_data.py` 机检钉住
（consts 白名单 + 库行数基线 + 五模式自证 + 三负向）。
| `selftest/` | 同名自检臂；`_*.py` 工具级臂 | 判据实现 |
| `data/glossary.db` | 术语契约（terms/anchors/forms）+ 受控词表（lexicons）+ 存量欠账（baseline） | 判据代码 |

`core/` 是**冻结层**：改它属架构变更，必须单独评审，不能夹在内容回流里。
回流只写 `plugins/` 与 `data/glossary.db` 两处。

### tools/：维护者工具（不在 check 流水线）

`tools/` 全是**维护者侧**工具：日常写稿检查不需要它们，`check` 只跑 `plugins/`
判据 + 库数据。它们回答的是「词表数据质量如何、阈值为什么这样定、候选词形从
哪来」。共 23 个，`python submit.py tools` 看完整索引（分组 / 用途 / 三档）。

**唯一入口**：`python submit.py tools <名字> [参数...]`。`python submit.py tools x`
会被 `require_entry` 拒绝（退出码 2，并提示正确写法）——工具不是独立程序：
`--tmp` 解析、日志归档、白名单执法、封签校验都挂在入口上，单独跑会绕过这些，
出现「命令能跑但产物不落盘 / 改了库没 bump」这类不一致。只有自检臂以子进程
验工具行为时才显式带 `SUBMIT_KIT_ENTRY=submit.py`（等同「由入口调用」）。

| 档 | 数量 | 含义 | 改动后的验证 |
|---|---|---|---|
| 入口 `entry` | 6 | 被 `submit.py` 直接挂载（4 个词族写库 + `db_diff` + `integrity_seal`） | `doctor` + 对应自检臂 |
| 守卫 `guard` | 9 | 被自检臂或其它工具 import（审计/体检类） | 跑相关臂 |
| 手工 `manual` | 8 | 候选生成、一次性体检，不参与自动化 | 抽查输出 |

**命名规则**：`<领域>_<用途>.py` —— `family_*` 词族、`pair_*` 概念对、`term_*`
术语、`rule_*` 规则侧数据、`form_*` 词形探针、`db_*` / `integrity_*` 运维。
`rule_p75_reach.py` 是「规则号 + 度量」：`P75` 是规则号，`reach` 是它量的东西
（射程）。

**为什么平铺、不建子目录**：`submit.py glossary <action>` 透传时模块名必须唯一
且可 import；`family/import.py` 会撞 Python 关键字，分包后透传也要从
`tools.family_import` 变长路径。**用前缀分组、用索引表说明，比搬目录更稳**。
新增工具必须登记 `tools/__init__.py` 的 `CATALOG`，否则 `_file_whitelist` 判红。

**能用在别人的稿子上吗**：语料类工具可以，前提是**目录同构**——

```
<root>/submission/<线>/<篇>/work/<kind>/<slug>/content/<lang>/<slug>.mdx
```

`zh` 是母版，`--root` 指到 `<root>` 即可（缺省=工具包同级）。两个限制：

1. **数据跟着库走**：`family_*` / `pair_*` / `term_*` 的结论依赖 `glossary.db`
   的 `concept-family` / `term-zh`。别人的库没有这些行，跑出来是 0——不是算法
   不通用，是数据没长出来；
2. **契约跟着工具包走**：frontmatter、语向目录、`slug` 规则由 `submit.py
   start/check` 定义；别的格式要先转成这套目录结构。

与文章无关的只有 `db_diff`（比库）和 `integrity_seal`（封签），它们服务工具包
自身，换谁的稿子都一样。例：`rule_p75_reach.py --root <外部目录>` 跑出
「1 篇 × 32 语向」射程；`form_probe` / `family_mine` / `family_probe` 同理。

### 为什么 tools 不并进 plugins

两者都是 Python、都依赖 `core`，但**不是一类东西**：`plugins/` 是「每个包、
每种语言都要跑的判据」，`tools/` 是「人要看数据时才跑一次的运维」。四条边界
抹掉任何一条都会立刻坏：

| 维度 | `plugins/` | `tools/` |
|---|---|---|
| 运行时机 | `check` 内，逐包 × 逐语向自动跑 | 人工按需，离线 |
| 输入 → 输出 | `PackageView` → `Finding` | 库/语料 → 报告/JSON（少数写库） |
| 契约 | 必填 `RULE/RULES/PHASE/CATEGORY/APPLIES_TO/NEEDS/SEVERITY/ENABLED/RATIONALE`(≥80 字) + `run/review` | 模块 docstring + `main()` |
| 变更面 | 策略面（TRACKED：允许改，只列差异） | 机制面（SEALED：必须持私钥重签） |

真把工具放进 `plugins/` 会依次坏四件事：

1. **装配直接失败**：`core/loader.py` 对 `plugins/*.py` 逐个校验文件名
   （必须 `<分类>-<名称>.py`）与九个必填常量，`family_audit.py` 连命名都不合法，
   `doctor` / `check` 报 `PluginError`，不是警告；
2. **运行时光爆掉**：每个包 × 48 语各跑 23 个工具，产出还不是 `Finding`；
3. **封签边界消失**：`plugins/*.py` 是 TRACKED（改完只列差异），`tools/*.py`
   是 SEALED（改完必须重签）。合并等于把 23 个机制文件放进「随便改」区；
4. **纯度守卫冲突**：A9 要求 `plugins/` 只有一个 `_lexicon.py` 共享层、不许
   夹带数据模块、不许直连 `sqlite3`；工具要读库（`core.db`）会直接踩线。

判据和运维之间没有中间态：**参与「这份稿子能不能过」的是插件；回答「数据质量
如何、该补什么词」的是工具**。规则专属的体检工具用 `rule_*` 前缀，和判据一一
对应，但各走各的验证链（`plugin verify→sync→doctor` vs 相关 `selftest` 臂）。

### 新增一条判据

1. 建 `plugins/<分类>-<名称>.py`（文件名即插件 id；分类须在 13 类里：
   `structure frontmatter glossary text numbers parity language assets input
   hygiene pack audit contract`，且 `CATEGORY` 等于文件名前缀）：

   ```python
   RULE = "P32"
   RULES = [RULE]
   PHASE = 50
   CATEGORY = "numbers"
   APPLIES_TO = ["blog", "regulation"]
   NEEDS = ["blocks"]
   SEVERITY = "error"
   ENABLED = True
   COVERAGE = {"langs": "all", "zones": ["body"]}

   RATIONALE = {RULE: "<哪篇/哪语/什么形状的实测缺陷，>=80 字>"}

   def run(view, emit):
       for art in view.articles:
           for lg in art.langs:
               ...
               emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), "第N块 ...")

   def review(finding, view):
       return finding                 # None=丢弃（理由写进 RATIONALE）
   ```

2. `COVERAGE` 写**判据实际会看的地方**：`langs` 为 `"all"` / `"scripted"` /
   语向列表；`zones` 为 `frontmatter` / `body` / `metadata` / `images` /
   `package`，确实到处都看写 `["any"]`。写窄了自检会报「注入落在射程外」，
   写宽了等于没校验。
3. 写同名自检 `selftest/<分类>-<名称>.py`：`H.main([(RULE, mutate, "说明")])`。
   台架机检四件事：注入真改了字节、改动落在 COVERAGE 内、注入后该规则报红、
   还原后归零。
4. 固定链：`plugin verify` → `plugin sync` → `policy_version+1` → `doctor` →
   `selftest` 全跑 → 全库 `check --all --yes` 与基线零差异 → `pack --kit-only --force`。

### 架构守卫（`doctor` 单一入口）

- **A1**：`core/rules/`、`core/engine.py` 必须不存在；`core/**`（含 `consts/`
  分片）的 `add(` 发射点只允许 `checker.py`，且规则 ID ⊆ 6 条包级守卫。
- **A2**：`tests/` 不得回流。
- **A5**：`submit.py` 与 `core/**` 不得出现 `RULE = "..."`。
- **A6**：`plugins/` 与 `selftest/` 文件名集合完全相等。
- **A7/A8**：插件必须写全常量、声明 `COVERAGE`，且禁止内联 `add(`。
- **A9**：`core/**` 不得 import `plugins/`（防反向依赖）；`plugins/` 只允许
  一个词表访问层 `_lexicon.py`（词形数据一律进库），不得夹带判据，且必须被
  至少一处 import。

## 策略库模型

三正交维度：`section`（`body / banned / writing / excerpt / title / refs`）、
`assertion`（`require / require_all / forbid / verbatim`）、
`options`（其余全部配置：`scope / count / case_sensitive / lang / match /
only_slug / slug / forbid_licensed_by / require_match / forbid_match` 以及
`writing` 段的 `rule / langs / level / patterns / legacy / min / max`）。

`data/glossary.db` 共 7 张表，**只含策略与词表，没有审计日志、actor 或时间戳**：

| 表 | 一行是什么 | 用途 |
|---|---|---|
| `meta` | 单行全局元信息 | `policy_version`（工具与规则版本）、`schema_version`、`build_id`（分发包内容指纹）、`applied_cs`（已应用的 changeset 列表）。`version` 与 `pack` 都读它 |
| `locales` | 一个语言码 | 48 个语向的 `dir / name / script / native`。`S03` 校验目录名、`S02` 校验齐全度、术语本地化按此表展开 |
| `terms` | 一条契约 | 契约主体：`id`（`<section>:<契约id>`）/ `section` / `options_json`（词形以外的全部配置）/ `note` / `revision` / `ord`。没有 JSON 原文副本——载荷由三表重建 |
| `anchors` | 一个中文锚点 | 绑定「该篇哪句原文激活这条契约」；一条契约一个锚，`UNIQUE(term_id, zh_anchor)` |
| `forms` | 一个词形 | `assertion × lang × value × match_mode` 的原子词形，供 `glossary scan` 反查与 6 个契约插件消费，`UNIQUE(term_id, assertion, lang, value, match_mode)` 让重复词形**入库即拦** |
| `plugin_meta` | 一个磁盘插件的投影 | `plugin_id / version / phase / rules / rationale_sha / source_sha / enabled`，由 `plugin sync` 写入、`doctor` 双向校验；`RATIONALE` 全文只在插件源码里 |
| `lexicons` | 一个词表条目 | `id / scope / key / value / target / meta_json / ord`。九类：`country`（「我国」本土词形）、`neighbor`（近缘语言串味，`target` 是本语正形）、`latin-required`（要求变音的语向）、`latin-ascii`（ASCII 转写 → 正形）、`latin-taxon`（拉丁学名成分，P30 结构剥离用）、`latin-allow`（品牌/缩写/术语放行词）、`term-localization`（英文术语 → 本语词形，P31 用）、`term-zh`（中文概念 → 各语标准译法，法规名/机构名/许可证名统一口径）、`forbidden-currency`（其他货币的本地写法）。`scope` 恒为 `global`——按篇放行已撤除。由 `glossary lexicon` 维护，`plugins/_lexicon.py` 只读 |
| `baseline` | 一条存量欠账 | `rule / slug / detail / reason / status / ord`。判据源码里不出现 slug，某篇是否欠账由本表回答；`detail` 空串 = 整篇豁免，`status=closed` 表示已清账（不删行） |

**数据放置判据**：进 `lexicons` 的是「判据要匹配的领域术语词形」——某概念在
某语该写什么、不许写什么、哪些拉丁词放行、哪些货币名不许用；改这些不需要
动代码。留在 `core/consts/` 的是**语言功能类**常量：阈值与正则、停用词/功能
词表、承诺用语、数字拼写表（`NUMBER_WORDS`）、脚本判定表——它们是判据实现
的一部分，改它们等于改判据，必须走代码评审与全电池。

`lexicons` 与契约分开的理由：契约断言是 `require/forbid`，语义为「某篇某术语
必须/禁止写成某词形」且要求锚点绑具体句；词表是语向级闭类事实与放行集，
与篇目无关（`allow` 更是 `forbid` 的反面），塞进 `terms/forms` 会让契约空间
混入大量无锚点行，`glossary get/scan` 的语义也随之失真。

契约是**单一真值**：`terms` 存配置、`anchors` 存中文锚点、`forms` 存词形，
判据读到的 payload 由 `core.db.payload_of()` 按固定映射重建（与写入时的
`_derive()` 互为逆运算），库里不存在需要同步的第二份数据。
`core/schema.py.verify()` 每次 `doctor` 校验结构、语向注册与引用完整性。
`forbid_re` 支持 `{"*": [正则]}` 对全部非母版语向生效；逐语词形仍用
`require` / `forbid`。

`writing` 段是跨篇通用写作纪律的词表唯一来源，由 `WR01–WR05` 消费：
`rule` 必须是已注册规则 ID，`scope` ∈ `heading/body/meta/link/refs`，
`langs` 为数组或 `"*"`，`patterns` 按语向给正则，`level` 为 error/warning。
存量欠账不写在契约里——已迁 `baseline` 表（`rule=WR01/WR05`），契约只描述
判据本身。补一条禁用词形只需 `glossary add --section=writing`，不用改判据源码。

## 并发与立刻生效

- 连接用 `WAL + busy_timeout + foreign_keys=ON`；写事务 `BEGIN IMMEDIATE` +
  `revision` 乐观锁，过期 revision 报冲突（退出码 3）。
- 每次调用开始时一次性载入不可变 `PolicyView`，同一次调用内 48 语判据一致；
  术语或插件改动在**下一次调用**生效。
- 插件按 `(mtime_ns, size, sha256)` 热加载，磁盘是权威。check/pack 走容错
  模式：某插件写到一半出错时跳过、输出 `[SKIP]` stderr 告警与
  `--json` 的 `skippedPlugins` 字段，其余照常运行；全部不可用仍报 C01。
  doctor / plugin verify / rules / version 保持严格模式。
- `--jobs=N` 每个 worker 独立 Context 与独立连接。
- **多人共享同一策略库时 `--db` 必须指向同一个文件**：各用本地副本的锁
  不构成全局互斥；契约分歧走 changeset 导出/导入显式裁定。
- 定版链（改判据 → 全电池 → `policy_version+1` → 提交）不可并行：二进制库
  不可合并、版本号是单一全局计数器。凭据被并行升版作废时，在新版本重跑
  全电池再提交；他人升版不影响日常写稿与 `check`。

## changeset（多人协作）

分发库是共用策略的起点。接收方各自改本地库，用
`glossary export --against=<分发库>` 导出 JSON 变更集（可进 git、可评审），
主线 `import` 整单事务应用；同条被双方修改、一方 delete 一方 update 都判冲突，
必须 `resolve --ours|--theirs` 显式裁定。重复导入同一 `cs_id` 幂等跳过；
`--dry-run` 零副作用。



---

## 文件白名单：目录必须干净

**规则**：工具包内**每个文件**都必须命中白名单，**不限制文件类型**。
唯一例外：`plugins/` 下的 `.py` —— 那是策略面，随时会改，不做登记。

白名单分两层：

| 层 | 位置 | 放行什么 | 改它的代价 |
|---|---|---|---|
| 代码常量 | `core/kit_hygiene.py` | 入口文件（`submit.py` / `README.md` / `.gitignore`）、代码目录只允许 `.py`、`data/` 逐文件、`template/**` 整树 | 机制层改动，需重签 |
| 数据层 | `data/whitelist.json` | `restore --allow` 写入的相对路径或 glob | L1 数据变更，不动代码、不需重签 |

**违规处理（自动，不需要记得跑命令）**：

- `submit.py` **每个入口**先跑 `core/kit_hygiene.purge_foreign()`：非白名单文件
  立即归档到 `<repo>/tmp/待删除/foreign-<时间戳>/`，并打印 `[警告]` 清单；
- `hygiene` 报 **H01**（符号链接越界报 H02）；`clean` 是同一路径的兜底；
- **根层 `tmp/` 一律违规**：临时根在仓库 `tmp/`，与工具包放在哪无关；
  工具包内的 `tmp/` 会被**整目录**归档（不逐文件搬），`pack` 同时排除它；
- **熔断**：一次待移动超过 `PURGE_LIMIT = 50`，判定为「白名单配置错了」，
  拒绝执行并提示检查——宁可不动，也不能把工具包拆掉；
- 恢复是**显式动作**：`submit.py restore <相对路径>` 取回（默认不登记，下次
  入口会再次归档）；确属合法新增（新素材、外部资料）加 `--allow` 登记。

```bash
python submit.py restore template/blog/fig-extra.webp --allow   # 取回并登记
python submit.py restore core/scratch.md                        # 只取回，不登记
```

**免疫**：`submit.py`、`README.md`、`data/glossary.db*`、封签四件永远不移动
（白名单写错时也不）。**免疫射程必须小于违规判定**——只列具体文件，不列目录；
把整个 `core/` 列为免疫会让 `core/notes.md` 永不移动，等于白名单失效。

### 旧策略为什么没生效

白名单判据必须落在**文件**上，且违规要**自动执行**，否则等于没有：

- 目录级放行（`top in ALLOW_TOP`）会让 `core/`、`tools/`、`plugins/` 里放任何
  文件都不报；
- 只 warning 不归档，需要人记得跑清理命令，违规文件会一直留着；
- 封签四件必须列入放行清单，否则清理会删掉信任根；
- 运行时目录不能整目录跳过，否则包内 `tmp/` 既不报违规又会被打进分发包。

现在的实现：文件级白名单 + 入口自动归档、根层 `tmp/` 整目录归档、`pack`
排除 `tmp/`、守卫臂钉死「工具包根无 `tmp/`」。

### 新内容写哪里（不要再建文件）

| 想写的内容 | 位置 |
|---|---|
| 判据为什么这样定、射程、校准记录、反误报纪律 | 插件文件头 `RATIONALE`（`core/loader.py` 强制 ≥80 字并须写实测出处） |
| 共享层的机制说明 | `plugins/_*.py` 模块 docstring |
| 词表分类、收录判据、未证标记、未收清单 | `plugins/_lexicon.py` 头部 + `submit.py glossary term` 分支 |
| 工具量什么、阈值怎么读、0 命中怎么自证 | `tools/<工具>.py` docstring |
| 三类归属、射程原则、变更分级、封签设计 | 本文件「代码分层」「治理」两节 |

守卫臂：`selftest/_file_whitelist.py`（规则 30 例、隔离树全链路、restore 两态、
熔断、免疫射程）与 `selftest/_strategy_home.py`（说明必须跟着策略走）。

