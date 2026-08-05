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

## 待办提醒（来自 Request A/B，仍未处理）
请在 **设置 → 数据管理 → 我发布的应用** 中删除之前误部署到 CloudStudio / agentos 沙箱的冗余链接（仅 Cloudflare 为生产路径）。

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
