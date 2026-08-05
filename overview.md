# 初中学习工作台 — 英语课标词汇扩充（Request D）

## 完成内容
将 `EDITION_PRESETS` 中 6 册英语课标词汇从每册 15 个（共 90）扩充为真实教材量级：

| 册 | 词数 |
|----|----|
| 7上 | 173 |
| 7下 | 176 |
| 8上 | 111 |
| 8下 | 105 |
| 9上 | 97 |
| 9下 | 65 |
| **合计** | **727** |

## 关键修复
- `patch_words.js` 初版用 `indexOf('words: [')` 会误命中替换文本自身与 `userWords` 字段；
  改用 10 空格缩进 MARKER `'          words: ['`，先一次性定位 6 个数组起止，再**从后往前替换**避免下标偏移。

## 验证
- 内联脚本 `node --check` 通过（183,871 字节）
- 古诗文 `title:"` 仍为 104（未受影响）
- 册边界结构正确闭合：`...fat." }\n          ]\n        },\n        '7下': {`
- 线上部署后 curl `word:"` 由 90 → 727（Cloudflare 部署约 30s 延迟，已复验）
- `/api/sync` 返回 `{"error":"invalid code"}`（缺参正常响应，Functions 存活）

## 提交
- commit `e33b64a` (91761ae..e33b64a)，已 push，Cloudflare Git 自动部署上线
- 净变更 +733 / -96（index.html 829 行变动）

## 待办提醒（来自 Request A/B，已全部处理）
- ~~请在设置 → 数据管理 → 我发布的应用中删除误部署到 CloudStudio / agentos 的冗余链接~~ —— 用户已于 2026-08-05 自行删除，现仅 Cloudflare `chuzhong-study-workbench.pages.dev` 一个真身。

---

# 修复：今日要处理被导入项淹没

## 问题
按教材导入（当前册约 18 古诗 + 173 单词）后，「今日要处理」一次性涌出 ~191 条，全都是没背过的新项。

## 根因
`renderFocusCard()` 对诗/词/卡用 `|| { nextReview: today, graduated:false }` 兜底，把「未学过」默认成「今天到期」。而红点 Badge 与艾宾浩斯统计早已只计「已学过且到期」项——三处算法打架。

## 修复（commit `c2d1ff2`）
- 焦点看板诗/词/卡三项改为仅列入「已学过且 nextReview<=今天」的项，与 Badge/统计口径统一。
- 新增「📚 待开始」汇总卡：统计当前册无记忆记录的诗/词/卡数，引导去背诵库挑今日任务，今日不再是长列表。
- 背诵库列表的「未开始复习」灰字升级为醒目「待开始」橙标签。

## 验证
- `node --check` 通过
- 源码与线上 `nextReview: today, graduated: false` 兜底已清零
- 线上 curl：`focus-item.summary`=2、`待开始`=5、旧兜底=0
- 已 push，Cloudflare 自动部署上线

---

# 优化迭代：F3 今日复习队列（P0 收尾）

## 需求背景
词汇扩充到 727 词后，「从第一张翻到最后一张」式背诵不现实。F3 让背诵进入「只练今日该练的」编排队列，与 F2 分离「待开始/到期」一脉相承。

## 实现（commit `bcafe37`，已 push，Cloudflare 上线）
- 新增全屏专注浮层 `#review-overlay`（z-index 9000），复用 `.word-card` 翻卡样式，古诗/词汇/卡三态同构渲染。
- 三个背诵子 tab 各加「🚀 开始今日复习 (N)」按钮；N 实时显示=到期项+待开始项（`updateReviewBadges` 挂到 `renderMemoryLists`）。
- 队列算法 `buildReviewQueue`：到期项（mem 存在、未毕业、nextReview<=今天）+ 前 10 张待开始（无 mem）。
- 浮层逐张翻卡复习，复用 `handleMemoryReview` 落库；完成后 🎉 完成态；退出时刷新底层视图。
- 单测：毕业项/未来项正确排除、待开始封顶 10。

## 验证
- 内联脚本 `node --check` 通过
- 线上 curl：review-overlay / startReview('poetry') / review-progress-bar 均命中（Cloudflare 边缘缓存首次偶现旧节点，复验通过）

## P0 进度
F1 搜索筛选 ✅ · F2 日期 bug ✅ · F3 今日复习队列 ✅ — P0 全部完成。
下一步候选：F4 导入错峰排期 / 架构层 A1 抽成长 tab / UI 层 D1-D3 设计令牌与一致性。

---

# 架构/UI groundwork：A1 抽「我的成长」独立 tab + D1-D3 设计令牌与一致性

## 实现（commit `621b27b`，已 push，Cloudflare 上线）

### A1 信息架构：独立「我的成长」tab
- 原「今日」tab 内嵌的 豆豆/等级/四大指标 抽离为第 5 个导航项「我的成长」(tab-growth)。
- 「今天要处理」焦点看板移入 tab-today 作为其核心内容（今日页真正只剩"今天该做"）。
- 侧栏 / 平板顶栏 / 移动底栏 三处导航同步追加「成长」项；`switchTab` 的 `navMap` 加 `'growth':4`、`titleMap` 加 growth 标题。
- 侧栏原"今日与成就"改名为"今日"，消除歧义。

### D1 设计令牌
- 新增 `--grad-growth` 令牌；记忆 tab 的艾宾浩斯卡渐变由内联 `linear-gradient(...)` 改为 `var(--grad-growth)`，消除重复字面量。

### D2 通用工具类
- 新增 `.u-row` / `.u-between` / `.u-muted` / `.u-mt` 与语义色 `.c-orange` / `.c-green` / `.c-status`，成长 tab 已作为参考实现应用。

### D3 卡片规范
- 新增 `.stat-card`（浅纸底+圆角+内边距）与 `.stat-value`（大号加粗数值），成长 tab 四指标改用，去除原先 4 处内联 `background:var(--bg-paper);padding;radius`。

## 范围克制
- 未做全文件内联样式大清洗（风险高、收益低），仅在新成长 tab 作参考实现；存量内联样式全量迁移列为后续可选项。

## 校验
- 内联脚本 `node --check` 通过
- 线上 curl：tab-growth / growth-hero / grad-growth / switchTab('growth') 共 8 处命中（无边缘缓存延迟）

---

# F4 导入错峰排期：批量导入按每天 15 条平滑解锁

## 需求背景
F3 把复习队列收敛为「到期 + 待开始前 10 张」，但 pending 仍取「全部无 mem 项」。一次性批量导入 727 词后，新项会在导入当天全部变为「待开始」涌进队列与今日汇总卡——错峰排期才是根治。

## 实现（commit `e59c788`，已 push，Cloudflare 上线）
- 新增常量 `STAGING_PER_DAY = 15` 与助手 `dateFromOffset / isAvailableToday / formatMonthDay / newItemBadge`。
- 两条批量导入路径（`handleEditionImport` 教材预设、`importFromPaste` 粘贴/CSV）对每条新导入项写入 `scheduledStart = dateFromOffset(floor(全局 stageIdx / 15))`；跨诗/词用统一序号，保证整批导入逐日平滑解锁。
- 手动单条新增（古诗/词汇/记忆卡 CRUD）**不设** `scheduledStart`，保持即时可用——区分「系统导入」与「用户主动添加」的语义。
- F3 `buildReviewQueue` 的 pending 过滤追加 `&& isAvailableToday(x)`，只练今天可学的。
- 「今日」待开始汇总卡拆为「今天可学 N 篇/个/张」与「另有 M 条已排期，最晚 X月X日 解锁」两行；背诵库诗/词/卡三处徽标改为 `newItemBadge`，未来排期项显示「📅 排期 M月D日」。
- 向后兼容：旧数据 / 手动新增无 `scheduledStart` 一律视为今天可学。

## 验证
- 内联脚本 `node --check` 通过
- 单测：100 条导入 → 今天可学 15 + 未来 85（最晚 today+6，即 8月11日）；旧项恒可用；复习 pending 封顶 10
- 线上 curl：F4 标记 15 处命中（首次 curl 返回 0 系构建未就绪，sleep 45s 后复验通过）

## 当前进度
P0（F1 搜索 / F2 日期 / F3 队列）✅ · F4 错峰排期 ✅。下一步候选：F5 测验自测 / F6 错题归因 / F7 周计划 / 架构 A2-A5 / UI D4-D7。

---

# 记忆 tab 信息架构优化 · 第一刀：静态曲线卡 → 数据驱动总览条

## 动机
用户质疑「🧠 艾宾浩斯遗忘曲线」模块价值：曲线是写死的静态教科书图（每人相同、不反映真实数据），仅顶部一行「今日待复习」统计是动态的，但该数字在首页焦点板/红点里已重复。占着记忆 tab 最黄金的置顶位却是装饰。

## 实现（commit `240f0d7`，已 push，Cloudflare 上线）
- 移除占位的「艾宾浩斯曲线」卡片，改为 **记忆总览条**（`#mem-overview` + `.mem-chip`）：4 个可点 stat 芯片
  - 今日待复习 N（橙）→ 点跳到「复习到期」筛选下最有内容的子库
  - 已毕业 X（绿）→ 跳「已毕业」筛选
  - 连续复习 M 天（绿，取自 `appData.user.streakDays`）→ 展示不跳转
  - 在库 K 条 → 跳「全部」筛选
- 芯片点击 `gotoMemFilter(act)`：自动选该筛选下有内容的子库（poetry→word→card 兜底），再 `onMemFilter` 应用筛选，避免空结果。
- 原原理曲线降级为可折叠「复习原理 ▸」（`details.mem-principle`），曲线 SVG 仍在 `#ebbinghaus-chart` 内渲染，零信息损失；顶部重复统计行 `ebbinghaus-stat` 移除（`renderEbbinghausChart` 有 `if(statEl)` 守卫，无报错）。
- 接线：`renderMemOverview()` 挂到 `renderAll` 与 `renderMemoryLists`（复习后即时刷新计数）；CSS 复用 D2 语义色 `.c-orange/.c-green/.c-status`。

## 验证
- 内联脚本 `node --check` 通过
- 单测：综述计数 due=2/grad=2/total=6/streak=7 正确；子库路由空子库能正确兜底到下一个
- 线上 curl：mem-overview/renderMemOverview/gotoMemFilter/mem-principle 均命中（KIX 节点确认新内容；边缘节点传播期偶发旧节点返回 0）

## 进度
记忆 tab IA 优化第一刀完成。剩余：第二刀（🚀 开始今日复习按钮上提至子 tab 头部）、第三刀（F4 后「待开始」筛选项重命名「未开始/已排期」）。

---

# 记忆 tab 信息架构优化 · 第二刀：复习按钮上提至子 tab 头部

## 动机
第一刀后「🚀 开始今日复习」按钮仍埋在各子 tab 内容深处，切到子 tab 后还要往下滚才能找到。

## 实现（commit `25ca858`，已 push，Cloudflare 上线）
- `memory-tab-header` 行右侧新增**常驻**「🚀 开始今日复习 (<span id="reviewCount-active">)」按钮：`margin-left:auto` 靠右，窄屏 `flex-wrap` 自动换行；点击 `startReview(currentMemorySubTab)` 启动当前所在子 tab 的复习。
- 移除三个子面板内容里的重复「开始今日复习」按钮（`reviewCount-poetry/word/card` 一并删除；`updateReviewBadges` 用 `if(el)` 守卫，无报错）。
- `updateReviewBadges()` 额外写入 `reviewCount-active = reviewQueueSize(currentMemorySubTab)`；`switchMemorySubTab` 末尾补 `updateReviewBadges()`，切子 tab 即刷新该按钮计数，始终显示当前子 tab 的待复习量。

## 验证
- 内联脚本 `node --check` 通过
- grep 确认新标记 3 处、原三个埋入按钮计数=0
- 线上 curl 多 pass 均命中 3（边缘节点传播稳定）

---

# 记忆 tab 信息架构优化 · 第三刀：筛选/标签语义准确化

## 动机
F4 错峰排期后，「待开始」筛选项与首页焦点卡标签实际包含「已排期未到」的项，原词不再准确。

## 实现（commit `cb97d09`，已 push，Cloudflare 上线）
- 记忆 tab 筛选下拉 `value="start"` 的显示文案「待开始」→「未开始 / 已排期」。
- 同步首页焦点卡「📚 待开始」→「📚 未开始」（同一语义、两处一致）。
- 背诵库卡片 `newItemBadge` 对**今天可学**项仍显示「待开始」、未来项显示「📅 排期 M/D」——此处「待开始」语境正确，未改。

## 验证
- 内联脚本 `node --check` 通过
- grep 确认新标签就位、旧 `<option>待开始` 计数=0
- 线上 curl 4 pass 均命中 2（边缘节点稳定）

## 进度
记忆 tab IA 优化 第一刀 + 第二刀 + 第三刀 全部完成。

---

# 记忆 tab 信息架构优化 · 第二刀：复习按钮上提至子 tab 头部

## 动机
第一刀后「🚀 开始今日复习」按钮仍埋在各子 tab 内容深处，切到子 tab 后还要往下滚才能找到。

## 实现（commit `25ca858`，已 push，Cloudflare 上线）
- `memory-tab-header` 行右侧新增**常驻**「🚀 开始今日复习 (<span id="reviewCount-active">)」按钮：`margin-left:auto` 靠右，窄屏 `flex-wrap` 自动换行；点击 `startReview(currentMemorySubTab)` 启动当前所在子 tab 的复习。
- 移除三个子面板内容里的重复「开始今日复习」按钮（`reviewCount-poetry/word/card` 一并删除；`updateReviewBadges` 用 `if(el)` 守卫，无报错）。
- `updateReviewBadges()` 额外写入 `reviewCount-active = reviewQueueSize(currentMemorySubTab)`；`switchMemorySubTab` 末尾补 `updateReviewBadges()`，切子 tab 即刷新该按钮计数，始终显示当前子 tab 的待复习量。

## 验证
- 内联脚本 `node --check` 通过
- grep 确认新标记 3 处、原三个埋入按钮计数=0
- 线上 curl 多 pass 均命中 3（边缘节点传播稳定）

## 进度
记忆 tab IA 优化 第一刀 + 第二刀 完成。剩余第三刀：F4 后「待开始」筛选项重命名「未开始/已排期」（更准确反映含「已排期未到」的项）。

---

# F5 测验自测：主动回忆 + 打分 + 成绩报告  ⚠️ 已废弃并合并（见末尾）

> 该「📝 自测模式」浮层与「一键遮句自测」已于 2026-08-05 合并进「🚀 开始今日复习」单一入口（commit `44d28a1`）。下方记录保留为历史依据，代码已移除。

## 需求背景
记忆 tab 已有「🚀 今日复习」（翻卡→标记记得/忘），但缺一个真正检验"记住没"的环节：主动回忆（先想再看）+ 自我评分。F5 补上"自测模式"。

## 实现（commit `3c72b67`，已 push，Cloudflare 上线）
- 记忆 tab 头部常驻「📝 自测模式 (N)」按钮（`mem-review-top` 行，与复习按钮并列），对应当前子 tab；N = 已学条目数（`quizQueueSize`）。
- 自测题库 `buildQuizQueue`：只抽**已学过**条目（有 mem 记录，含已毕业），due 优先 + 其余，封顶 20；**不含未学过的待开始项**（没学过自测无意义），与复习队列（due + pending）自然区分。
- 浮层 `#quiz-overlay`（复用 review 浮层样式 + 新增 `.quiz-prompt`/`.quiz-answer`）：
  - 先只给题目（诗名+作者 / 单词+音标 / 卡正面），点「👀 看答案」才揭晓答案；
  - 揭晓后三档自评：✅ 答对 / 🔶 模糊 / ❌ 答错了。
- 计分落库复用 `handleMemoryReview`（答对/模糊→进阶，答错→打回 stage 0）；结束 `renderQuizDone` 给成绩报告（对/模糊/错 三卡 + 有效掌握率，模糊计半对）。
- `updateReviewBadges` 同步写 `quizCount-active`。

## 验证
- 内联脚本 `node --check` 通过（209,111 字符）
- grep 确认 startQuiz / buildQuizQueue / quiz-overlay / quizCount-active / quizGrade 均上线
- 线上 curl 5 pass 复验稳定（pass1 旧节点=0，pass2–5 全命中）

---

# 记忆 tab 第一刀：结构精简（缓解「拥挤 / 无从下手」）

## 背景
用户实测反馈记忆 tab「信息偏多、界面拥挤、无从下手」。诊断：首屏叠 6 层控件（提示行 / 总览条 / 复习原理 / 子 tab 长标签+2 操作钮 / 搜索筛选 / 各子面板描述行）；且列表默认「全部」铺开，导入大库时一进子 tab 涌出几百张卡。

## 第一刀改动（用户选做，低风险）
- 子 tab 长标签「古诗文背诵 (0篇)」等 → 短标签「古诗文 / 词汇 / 记忆卡」，括号计数移除（总数已在总览条）。
- 「复习原理」折叠块由首屏移至记忆卡底部，首屏少占一行。
- 各子面板顶部重复描述行删除；「新增」按钮统一上提头部，按当前子库派发 `openAddCurrent()`（古诗文区保留「一键遮句自测」次级钮）。
- 新增 CSS `.mem-sub-actions`。

## 验证
- node --check 通过（209,357 字符）
- grep 确认短标签 / `openAddCurrent` / `mem-sub-actions` 均上线，长标签按钮 = 0
- 线上 curl 多轮复验（边缘节点传播，pass3–4 稳定命中新版本）
- commit `0c2e108`，已 push，Cloudflare Git 自动部署上线

## 待做（第二刀，治本）
列表默认仍「全部」铺开——需改默认聚焦视图（复习到期 + 未开始前 N 条 + 「展开全部 X 条」入口），并让「开始今日复习」成为唯一强 CTA。

---

# 记忆 tab 第二刀：默认聚焦视图（治本「几百张卡涌出」）

## 改动
- 列表默认筛选由「全部」改为「今日优先」(focus)：仅显示「到期复习 + 今日可学未开始项」，封顶 `FOCUS_LIMIT=30`；复用 `isAvailableToday` 排除已排期未到项。
- 筛选项新增「今日优先」并设为默认；结果计数区显示「今日优先 · 共 N 条」。
- 三个子面板（古诗文列表 / 单词翻卡 / 记忆卡翻卡）在聚焦视图下，内容超阈值时底部给「展开全部 X 条 ▾」入口；当日无到期/未开始时给「查看全部 X 条」🎉 引导空态。
- 新增 `subLibAllCount()`（按当前搜索算全量数）/ `expandAll()`（切到全部）。

## 验证
- node --check 通过（212,836 字符）
- grep 确认 focusOpt / FOCUS_LIMIT / expandAll / 今日优先 / 展开全部 均上线
- 线上 curl 多轮复验（边缘节点传播，pass4–5 稳定命中新版本）
- commit `7d76bab`，已 push，Cloudflare Git 自动部署上线

## 进度
F1~F4 ✅ · 记忆 tab IA 三刀 ✅ · 记忆 tab 第一刀(结构精简) ✅ · 记忆 tab 第二刀(默认聚焦视图) ✅。下一步候选：F6 错题标签归因 / F7 周计划 / 架构 A2-A5 / UI D4-D7。

---

# 复习原理区块移除 + 记忆 tab 三按钮合并

## 背景
用户实测反馈：(1) 记忆 tab「复习原理」折叠块价值低、占位置；(2) 「🚀 开始今日复习 / 📝 自测模式 / 一键遮句自测」三个学习入口功能重叠、难以区分。经 AskUserQuestion 确认：删原理块、三按钮合并为一个。

## 改动 1：移除复习原理（commit `07c1972`）
- 删除记忆 tab 底部 `<details class="mem-principle">` 折叠块；`renderAll` 内 `renderEbbinghausChart()` 调用一并移除。
- `renderEbbinghausChart` 函数与 `.mem-principle` CSS 保留为无引用死代码（函数有 `if(!c) return` 守卫，零报错；保留便于将来恢复，符合"保留已删功能死代码降风险"惯例）。

## 改动 2：三按钮合并为单一入口（commit `44d28a1`）
- **仅保留「🚀 开始今日复习」一个学习入口**，删除「📝 自测模式」与「一键遮句自测」。
- 删除清单：
  - F5 自测浮层全套 `startQuiz / quizPromptText / quizCardHtml / renderQuizCard / quizReveal / quizGrade / renderQuizDone / exitQuiz` + `let quizMode` + DOM 节点 `#quiz-overlay`；
  - `buildQuizQueue()` / `quizQueueSize()` + `updateReviewBadges` 内 `quizCount-active` 引用；
  - 「一键遮句自测」的 `togglePoetryMaskAll / toggleLineMask` + 古诗文区 `.mem-sub-actions` 次级钮 + `poetry-line` 的 `onclick` + 相关 CSS（`.mem-sub-actions` / `.poetry-line.masked` / 全套 `.quiz-*` 死规则保留无害）。
- 复习浮层升级为**三档自评**：原 2 档（记住/忘记）→ 吸收自测的 答对/模糊/答错。
  - `reviewMode` 加 `score:{right,fuzzy,wrong}`；按钮 `reviewAct(bool)` → `reviewGrade(g)`；
  - 答对/模糊 → `handleMemoryReview(type,id,true)` 进阶，答错 → `handleMemoryReview(type,id,false)` 打回；
  - 完成页 `renderReviewDone` 改为显示 答对/模糊/答错 计数 + **有效掌握率（模糊计半对）**，复用原自测成绩报告样式。
- 净变更 **+20 / −191**（大幅瘦身）。

## 验证
- 内联脚本 `node --check` 通过（205,038 字符）
- grep 确认 `reviewGrade(` = 4（定义 + 3 按钮）、`startQuiz(` = 0、`一键遮句自测` = 0；`#quiz-overlay` DOM 节点 = 0（仅 CSS 死规则）
- 线上 curl 多 pass：pass 1–2 偶发旧边缘节点（仍见 `startQuiz=2`），pass 3–6 稳定 `reviewGrade=4 / startQuiz=0 / 一键遮句=0`

## 进度
F1~F4 ✅ · 记忆 tab IA 三刀 ✅ · 记忆 tab 第一刀(结构精简) ✅ · 记忆 tab 第二刀(默认聚焦视图) ✅ · 三按钮合并 ✅。下一步候选：F6 错题标签归因 / F7 周计划 / 架构 A2-A5 / UI D4-D7。

---

# 记忆 tab 按钮位置调整（导航与操作分离）

## 背景
用户反馈「开始今日复习」和「＋新增」两个按钮位置怪。原布局（commit `44d28a1`）把两个 CTA 塞在子 tab 导航行最右端（`margin-left:auto`），导致：与子 tab 间留一大段空白、导航与操作混在同一行、视觉上像浮在角落的孤儿按钮。

## 改动（commit `f117d32`，已 push，Cloudflare 上线）
- 子 tab 行（古诗文 / 词汇 / 记忆卡）改为**纯导航**，去掉行内两个 CTA。
- 新增 `.mem-toolbar` 工具栏行：
  - 左侧：搜索框 + 状态筛选 + 结果计数（原 `.mem-filter-bar` 移入）
  - 右侧 `.mem-actions`：`＋ 新增`（次，outline）→ `🚀 开始今日复习`（主，绿色 primary，置右强调）
- 删除旧 `.mem-review-top { margin-left:auto }`；新增 `.mem-toolbar / .mem-filter-bar / .mem-actions`（均为 flex-wrap，移动端自动换行、按钮靠右）。

## 验证
- 内联脚本 `node --check` 通过
- grep：`mem-review-top` = 0、`mem-toolbar` 上线、`openAddCurrent` = 2
- 线上 curl 经边缘缓存传播（约 45s 延迟）后稳定：`mem-toolbar=2 / mem-review-top=0 / openAddCurrent=2`

## 进度
记忆 tab 学习交互收敛为「单一入口 + 三档自评 + 工具栏分离」的清爽结构。下一步候选：F6 错题标签归因 / F7 周计划 / 架构 A2-A5 / UI D4-D7。

---

# 「我的成长」tab 合并进「今日」tab

## 背景
用户实测反馈：今日 tab（仅"今天要处理"焦点板）与成长 tab（仅豆豆/等级/四指标）内容都偏少，两个独立 tab 显得空。注意：成长 tab 原是 A1(commit `621b27b`) 为"解决今日过载"而从今日抽离的；如今艾宾浩斯图已删、今日已瘦身，再合并回去正合适。

## 改动（commit `937fbf2`，已 push，Cloudflare 上线）
- 成长内容（小芽兽"豆豆" pet-card / 四大学习指标 stat-card / 生成本周战报 PNG 按钮）整体移入 `tab-today`，置于今日焦点板下方。
- 删除 `tab-growth` 及其在**侧栏 / 平板顶栏 / 移动底栏**三处导航项。
- `navMap` / `titleMap` 删除 `growth` 项，索引维持 `today0/homework1/memory2/error3`。
- 安全点：`renderStatsAndPet()` 按元素 id 渲染（stat-streak / pet-svg-wrapper 等），不依赖所在 tab；合并后由 `switchTab('today')` 照常调用刷新，**数据不丢**。

## 验证
- 内联脚本 `node --check` 通过
- grep：`switchTab('growth')` = 0、`tab-growth` = 0、`growth-hero` 保留（CSS + 卡片）
- 线上 curl 经边缘缓存传播（约 45s 延迟）后稳定：`tab-growth=0 / growth-hero=2 / nav-growth=0`
- 净变更 +3 / −16

## 进度
导航收敛为 4 个 tab（今日 / 作业 / 记忆 / 错题）。下一步候选：F6 错题标签归因 / F7 周计划 / 架构 A2-A5 / UI D4-D7。
