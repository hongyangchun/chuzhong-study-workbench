# 初中学习台 · 初中三年个人工作台

一个**单文件 HTML** 的个人学习工作台，面向初中学生（初一至初三），由父亲为孩子搭建。
涵盖作业登记、背诵记忆、错题本、成就成长四大模块，支持年级/册全局切换。

## 特性
- **零依赖单文件**：`index.html` 内联全部 CSS / JS / SVG 图标与图表，离线可用，不引任何外部框架/CDN
- **四大模块**：作业登记 · 背诵记忆（统编版古诗文 + 英语课标词汇）· 错题本（艾宾浩斯四轮复习）· 我的成就（等级/连续打卡/成长宠物「豆豆」）
- **年级联动**：初一上 → 初三下六册，学科随年级动态变化（初二加物理、初三加化学、生地初二结业）
- **数据安全**：数据存浏览器 `localStorage`，提供 JSON 导出 / 导入备份、示例数据清理

## 部署（Cloudflare Pages）
1. 将本仓库连接到 Cloudflare Pages（GitHub 集成）
2. 构建设置：**无需构建**，构建命令留空，输出/根目录设为仓库根（含 `index.html`）
3. 部署后，手机浏览器打开 → 分享 →「添加到主屏幕」，即可当 App 使用

## 数据说明
所有数据保存在使用者浏览器的 localStorage，**不在服务器上**。部署后的页面公开可访问，但默认不含任何真实数据，首次打开会预置演示内容。

## 跨设备同步（可选，基于 Cloudflare KV）
本站点支持通过 Cloudflare KV 做跨设备同步。同步逻辑在 `functions/api/sync.js`（Pages Functions）。本项目为 **wrangler 管理模式**，KV 绑定已在仓库根 `wrangler.toml` 中声明（绑定名 `studybench_sync`），git push 部署即自动生效。

**1. 准备 KV namespace**
- 登录 Cloudflare 控制台 → **Workers & Pages** → 左侧 **KV** → 新建 namespace（如 `chuzhong-sync`）
- 复制该 namespace 的**真实 ID**（十六进制串），填入仓库根 `wrangler.toml` 的 `[[kv_namespaces]].id`（本仓库已预填，无需改动）
- ⚠️ 本项目为 wrangler 管理模式，**Cloudflare 后台 UI 手动添加的 KV 绑定不生效**，绑定只在 `wrangler.toml` 中声明才有效

**2. 使用**
- 重新部署一次（Push 后会自动触发）后，打开站点 → 左下角「系统设置与数据」→「云同步」
- 设置一个**同步码**（4-64 字符，如 `family2026`），点「保存同步码」
- 在任一设备点「推送到云端」，其他设备点「从云端拉取」即可同步
- 勾选「自动同步」后：启动自动拉取，本地改动 1.5 秒后自动推送

**同步规则与隐私**
- 全家共用同一同步码 = 共享同一份数据；不同码 = 各自独立 vault
- 冲突策略为 last-write-wins：云端按时间戳判定，推送比云端旧的版本会被拒绝（提示先拉取）
- 同步码仅存于本机私有 key，**不进入导出的 JSON 备份**，避免泄漏
- 开启同步后，数据副本会存入 Cloudflare KV（不再「仅在浏览器」）。数据为初中作业/错题，敏感度低；如不想上云，关闭同步、仅用本地存储即可
- KV 免费额度充足：每天 10 万次读 / 1000 次写，个人使用绰绰有余

## 本地预览
直接用浏览器打开 `index.html` 即可。云同步功能需部署到 Cloudflare Pages 后才会生效（依赖 Functions + KV）。

## 部署到 Cloudflare Pages
**方式一：后台连接仓库（推荐，零配置）**
- Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → 连接 GitHub 仓库 `chuzhong-study-workbench`
- 构建命令留空、输出目录留空（已是单文件静态站）；Functions 会自动读取 `functions/` 目录
- 仓库内置 `wrangler.toml` 已声明 `studybench_sync` 绑定，git push 部署即自动带上，**无需在后台手动绑定 KV**（wrangler 模式下后台手动绑定无效）

**方式二：本地命令行（可固化绑定，便于复现）**
- 安装并登录：`npm i -g wrangler && wrangler login`
- 预览：`wrangler pages dev .`
- 部署：`wrangler pages deploy .`
- KV 绑定已固化在仓库根 `wrangler.toml` 的 `[[kv_namespaces]]` 块（binding=`studybench_sync`，id=真实 namespace ID）。git push 部署时 Cloudflare 自动读取并应用该绑定；
  切勿把 id 改回 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` 之类占位符，否则 Pages 构建会报 `Error 8000022: Invalid KV namespace ID` 导致部署失败。

> KV 绑定名固定为 **`studybench_sync`**（在 `wrangler.toml` 中声明），与 `functions/api/sync.js` 读取的 `env.studybench_sync` 对应。修改 `wrangler.toml` 后需重新部署一次。
