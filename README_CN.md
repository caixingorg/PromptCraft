<p align="center">
  <img src="icons/icon128.png" width="96" alt="PromptCraft" />
</p>

<h1 align="center">PromptCraft</h1>

<p align="center">
  <strong>智能 Prompt 优化助手 · 精工细作，让你的提示词提升 10 倍</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue?logo=googlechrome" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License MIT" />
  <img src="https://img.shields.io/badge/tests-44%20pass-brightgreen" alt="44 tests pass" />
  <img src="https://img.shields.io/badge/providers-6-purple" alt="6 Providers" />
  <img src="https://img.shields.io/badge/sites-40%2B-orange" alt="40+ AI sites" />
  <img src="https://img.shields.io/badge/dependencies-zero-success" alt="Zero dependencies" />
</p>

---

## 🎯 一句话描述

在任何 AI 对话平台的输入框旁，一键将你粗糙的 Prompt 优化为专业、精准、高可执行性的提示词。

---

## ✨ 为什么选择 PromptCraft？

<table>
<tr>
<td width="50%">

### 🔐 你的 Key，你做主
**BYOK（Bring Your Own Key）** 架构。API Key 仅存本地浏览器，不经过任何第三方服务器。零遥测、零追踪、零远程脚本。

### 🎛 六大 Provider
OpenAI · Claude · Gemini · DeepSeek · Qwen (Tongyi) · Kimi — 一个插件，覆盖主流 AI 平台。

### 🎯 精准投放
40+ AI 站点白名单，只在 ChatGPT、Claude、Kimi 等对话平台显示按钮。博客评论区、登录表单、搜索引擎 — **绝不出现在不该出现的地方**。

</td>
<td width="50%">

### ⚡ 一键优化，先审后换
点击「✨ Optimize Prompt」→ AI 优化 → Before / After 面板确认 → 你决定是否替换原文。

### 🧩 目标化优化
内置 Better Ask、Writing & Communication、Work Plan、Research 四种目标，也可继续使用 Custom Template。

### 🧪 测试即上线
43 条自动化测试、零 LSP 错误、无第三方依赖。原生 JavaScript / HTML / CSS，代码干净如初雪。

</td>
</tr>
</table>

---

## 🧭 优化目标

PromptCraft 默认面向常见网页用户场景，而不是只做单一泛化改写：

| 目标 | 适合场景 |
|------|----------|
| **Better Ask** | 把粗略问题改写成清晰、可执行的 AI 提问 |
| **Writing & Communication** | 邮件、帖子、报告、产品文案、文档、方案等实用非虚构写作 |
| **Work Plan** | 把模糊工作请求整理为步骤、资源、风险和验收标准 |
| **Research** | 结构化调研、比较、风险机会分析和结论建议 |
| **Custom Template** | 使用你自己的固定优化规则 |

---

## 🪞 Before / After 审阅

优化结果会先显示在 **Before / After** 面板里。你可以替换原文、复制结果、重新优化，或直接关闭，不会在未经确认时改写输入框。

---

## 📸 预览

```
┌────────────────────────────────────┐
│  PromptCraft        [Save] │
│  ⬜ Show Button     ⬜ Hide on Site  │
├────────────────────────────────────┤
│  [Provider Config]  [Optimize Tmpl] │  ← Tab 切换
├────────────────────────────────────┤
│  Optimize for: [Better Ask  ▼]     │
│  Provider: [OpenAI       ▼]        │
│  API Key:  [sk-···] [👁]          │
│  Model:    [gpt-5.1-mini ▼]       │
│  [Test Connection] Connected ✓     │
│                                    │
│  Or switch to Template tab:        │
│  ┌────────────────────────────┐   │
│  │ Rewrite the user's prompt··· │   │
│  │ {originalPrompt}            │   │
│  └────────────────────────────┘   │
│  [Reset Template]                  │
├────────────────────────────────────┤
│      Before / After review first    │
└────────────────────────────────────┘
```

---

## 🏗 架构

```
用户点击按钮
      │
      ▼
┌─────────────┐    chrome.runtime     ┌─────────────┐    HTTPS (Bearer)    ┌──────────────┐
│  Content     │ ──sendMessage──────▶ │  Background  │ ──────────────────▶ │  AI Provider │
│  Script      │                      │  Service     │                      │  API         │
│              │ ◀────response─────── │  Worker      │ ◀────────────────── │              │
│  读取输入框   │                      │  读取 Key     │                      │  返回优化文本  │
│  显示按钮     │                      │  调用 API     │                      │              │
│  Review 面板  │   API Key 不可见     │  不写日志     │  仅用户点击后发送    │  按量计费     │
└─────────────┘                      └─────────────┘                      └──────────────┘
      │
      │  storage.onChanged
      ▼
┌─────────────┐
│  Popup       │  ← 配置面板：Goal / Provider / API Key / 模型 / 模板 / 开关
│  Panel       │
└─────────────┘
```

---

## 🚀 快速开始

```bash
# 1. 克隆
git clone https://github.com/your-username/ai-prompt-optimizer.git
cd ai-prompt-optimizer

# 2. 验证
npm run verify        # 语法 + 43 测试 + Manifest

# 3. 加载到 Chrome
#    chrome://extensions → 开发者模式 → 加载已解压 → 选择项目目录

# 4. 打包
npm run pack          # → dist/ai-prompt-optimizer-extension.zip
```

---

## 🔌 Provider 支持矩阵

| Provider | 默认模型 | 接口类型 | Temperature | Max Tokens |
|----------|---------|---------|:-----------:|:----------:|
| **OpenAI** | `gpt-5.1-mini` | Chat Completions | 0.2 | 4096 |
| **Anthropic Claude** | `claude-sonnet-4-5` | Messages API | 0.2 | 2048 |
| **Google Gemini** | `gemini-2.5-flash` | OpenAI-compatible | 0.2 | 4096 |
| **DeepSeek** | `deepseek-v4-flash` | OpenAI-compatible | 0.2 | 4096 |
| **Qwen (Tongyi)** | `qwen3-next-80b-a3b-instruct` | DashScope-Compatible | 0.2 | 4096 |
| **Kimi** | `kimi-k2.6` | Chat Completions | 0.2 | 4096 |

> ⚠️ 模型 ID 以厂商后台为准。DeepSeek `deepseek-chat` / `deepseek-reasoner` 已标记弃用，调用时将收到明确提示。

---

## 🛡 隐私承诺

| 我们做的事 | 我们不做的事 |
|-----------|------------|
| ✅ Key 仅存 `chrome.storage.local` | ❌ 不上传 Key 到任何服务器 |
| ✅ 仅在用户点击后发送文本 | ❌ 不自动读取输入框 |
| ✅ 文本仅发送给用户选择的 Provider | ❌ 不发送给其他服务 |
| ✅ 卸载自动清除所有数据 | ❌ 不收集浏览历史 |
| ✅ Content Script 不接触 Key | ❌ 不加载远程脚本 |

完整隐私政策：[PRIVACY.md](./PRIVACY.md)

---

## 📋 权限说明

| 权限 | 为什么需要 |
|------|-----------|
| `storage` | 本地保存你的 API Key、模型名、模板和设置 |
| `<all_urls>` | 在 40+ AI 对话网站中显示优化按钮 |
| `all_frames` | 支持 iframe 内的输入框 |
| 6 个 Provider `host_permissions` | 允许直接调用你选择的 AI API |

不申请：`activeTab` / `tabs` / `history` / `cookies` / `webRequest` / `scripting`

---

## 📂 项目结构

```text
.
├── manifest.json               # MV3 入口
├── background/background.js    # Service Worker · 消息路由 · API 调用
├── content/
│   ├── content.js              # 输入框发现 · 按钮绑定 · 回填 · 白名单门控
│   └── content.css             # 按钮 & Toast 样式
├── popup/
│   ├── popup.html              # Tab 化配置面板
│   ├── popup.js                # 配置读写 · Provider 切换
│   └── popup.css               # 面板样式 · 暗色模式
├── shared/
│   ├── messages.js             # English-first 消息注册表
│   ├── optimization-goals.js   # 内置优化目标模板
│   ├── provider-config.js      # 6 Provider 注册表
│   ├── config-utils.js         # 配置归一化工具
│   └── prompt-sites.js         # 40+ AI 站点白名单
├── tests/                      # 43 条契约测试
├── icons/                      # 16/48/128 图标
├── docs/store-submission.md    # 商店提交材料
├── ARCHITECTURE.md             # 架构详解
└── PRIVACY.md / SECURITY.md    # 隐私 & 安全
```

---

## 🧪 测试

```bash
npm test    # 43 条契约测试，全通过
npm run check    # 所有 JS 文件语法校验
npm run verify   # 一键全量验证
```

---

## ⚠️ 已知限制

- 按钮使用 `position: fixed`，在 CSS `transform` 容器或复杂 iframe 中可能定位偏移
- Shadow DOM、跨域 iframe、严格 CSP 可能阻止按钮显示
- 模型预设非实时目录，调用失败时手动填写有效模型 ID
- 使用 Provider API 会产生你账户下的调用费用

---

## 📄 许可

MIT License · [LICENSE](./LICENSE)
