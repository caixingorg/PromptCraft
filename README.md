<p align="center">
  <img src="icons/icon128.png" width="96" alt="PromptCraft" />
</p>

<h1 align="center">PromptCraft</h1>

<p align="center">
  <strong>One Click. Better Prompts. Instantly.</strong>
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

## 🎯 What It Does

A Chrome Extension that places an **"✨ Optimize Prompt"** button beside the input field on any AI chat platform. Click it — your rough prompt gets rewritten by your own AI Provider into a polished, precise, highly actionable prompt, then shown in a Before / After panel so you can replace, copy, retry, or close. No copy-paste. No tab switching.

---

## ✨ Why PromptCraft?

<table>
<tr>
<td width="50%">

### 🔐 Your Key, Your Rules
**BYOK (Bring Your Own Key)** architecture. API Keys live in `chrome.storage.local` — never touching a third-party server. Zero telemetry. Zero tracking. Zero remote scripts.

### 🎛 Six Providers, One Extension
OpenAI · Claude · Gemini · DeepSeek · Qwen · Kimi. Choose your model. Switch anytime.

### 🎯 Precision Targeting
A 40+ site whitelist ensures the button appears **only** on AI chat platforms — ChatGPT, Claude, Gemini, DeepSeek, Kimi, Copilot, Poe, Perplexity, and more. Blog comment sections, login forms, and search boxes stay clean.

</td>
<td width="50%">

### ⚡ Optimize & Review in Seconds
Click → AI optimizes → review Before / After → replace only when ready. Under 3 seconds, zero friction.

### 🧩 Fully Customizable
Your Prompt optimization template. Your rules. Tell the AI exactly how you want your prompts rewritten.

### 🧪 Battle-Tested
44 automated contract tests. Zero LSP errors. Zero third-party dependencies. Plain JavaScript, HTML, and CSS — clean as a whistle.

</td>
</tr>
</table>

---

## 🧭 Optimization Goals

PromptCraft now optimizes for common web-user scenarios instead of a single generic rewrite:

| Goal | Best For |
|------|----------|
| **Better Ask** | Turning rough questions into clear, actionable AI prompts |
| **Writing & Communication** | Emails, posts, reports, product copy, documentation, proposals, and other practical non-fiction writing |
| **Work Plan** | Turning vague work requests into structured plans with steps and success metrics |
| **Research** | Asking for structured analysis, comparison, risks, opportunities, and conclusions |
| **Custom Template** | Your own reusable optimization instructions |

---

## 🪞 Before / After Review

Optimized prompts are shown in a **Before / After** review panel before replacing your input. You can replace the original, copy the optimized prompt, retry, or close without changing anything.

---

## 📸 Preview

```
┌────────────────────────────────────┐
│  PromptCraft        [Save] │
│  ⬜ Show Button     ⬜ Hide on Site  │
├────────────────────────────────────┤
│  [Provider Config]  [Optimize Tmpl] │  ← Tab switching
├────────────────────────────────────┤
│  Optimize for: [Better Ask  ▼]     │
│  Provider: [OpenAI         ▼]      │
│  API Key:  [sk-···] [👁]          │
│  Model:    [gpt-5.1-mini  ▼]      │
│  [Test Connection]  Connected ✓    │
│                                    │
│  Or switch to Template tab:        │
│  ┌────────────────────────────┐   │
│  │ You are a professional···   │   │
│  │ {original prompt content}   │   │
│  └────────────────────────────┘   │
│  [Reset Template]                  │
├────────────────────────────────────┤
│      Before / After review first    │
└────────────────────────────────────┘
```

---

## 🏗 Architecture

```
User clicks button
      │
      ▼
┌─────────────┐    chrome.runtime     ┌─────────────┐    HTTPS (Bearer)    ┌──────────────┐
│  Content     │ ──sendMessage──────▶ │  Background  │ ──────────────────▶ │  AI Provider │
│  Script      │                      │  Service     │                      │  API         │
│              │ ◀────response─────── │  Worker      │ ◀────────────────── │              │
│  Reads input │                      │  Reads Key   │                      │  Returns     │
│  Shows btn   │                      │  Calls API   │                      │  optimized   │
│  Review pane │   Key never exposed  │  No logging  │  Sent on click only  │  Pay-per-use │
└─────────────┘                      └─────────────┘                      └──────────────┘
      │
      │  storage.onChanged
      ▼
┌─────────────┐
│  Popup       │  ← Settings: Goal / Provider / API Key / Model / Template
│  Panel       │
└─────────────┘
```

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/your-username/ai-prompt-optimizer.git
cd ai-prompt-optimizer

# 2. Verify
npm run verify        # Syntax + 44 tests + Manifest validation

# 3. Load in Chrome
#    chrome://extensions → Developer mode → Load unpacked → select project directory

# 4. Package for distribution
npm run pack          # → dist/ai-prompt-optimizer-extension.zip
```

---

## 🔌 Provider Support Matrix

| Provider | Default Model | API Type | Temp | Max Tokens |
|----------|--------------|---------|:----:|:----------:|
| **OpenAI** | `gpt-5.1-mini` | Chat Completions | 0.2 | 4096 |
| **Anthropic Claude** | `claude-sonnet-4-5` | Messages API | 0.2 | 2048 |
| **Google Gemini** | `gemini-2.5-flash` | OpenAI-compatible | 0.2 | 4096 |
| **DeepSeek** | `deepseek-v4-flash` | OpenAI-compatible | 0.2 | 4096 |
| **Qwen (Tongyi)** | `qwen3-next-80b-a3b-instruct` | DashScope-Compatible | 0.2 | 4096 |
| **Kimi** | `kimi-k2.6` | Chat Completions | 0.2 | 4096 |

> ⚠️ Model IDs are subject to change by providers. DeepSeek `deepseek-chat` / `deepseek-reasoner` are marked deprecated — you'll receive a clear notice if using them.

---

## 🛡 Privacy Commitments

| We Do | We Don't |
|-------|----------|
| ✅ Store Keys locally in `chrome.storage.local` | ❌ Upload Keys to any server |
| ✅ Send text only on explicit user click | ❌ Auto-read input fields |
| ✅ Send text only to the user-chosen Provider | ❌ Send to any other service |
| ✅ Auto-clear all data on uninstall | ❌ Collect browsing history |
| ✅ Keep Content Script blind to API Keys | ❌ Load remote scripts |

Full privacy policy: [PRIVACY.md](./PRIVACY.md)

---

## 📋 Permissions

| Permission | Why |
|-----------|-----|
| `storage` | Store your API Keys, model names, templates, and settings locally |
| `<all_urls>` | Show the optimize button on 40+ AI chat websites |
| `all_frames` | Support input fields inside iframes |
| 6× Provider `host_permissions` | Allow direct calls to your chosen AI Provider |

We do **not** request: `activeTab` / `tabs` / `history` / `cookies` / `webRequest` / `scripting`

---

## 📂 Project Structure

```text
.
├── manifest.json               # MV3 entry point
├── background/background.js    # Service Worker · message routing · API calls
├── content/
│   ├── content.js              # Input detection · button binding · write-back · whitelist
│   └── content.css             # Button & toast styles
├── popup/
│   ├── popup.html              # Tabbed settings panel
│   ├── popup.js                # Config read/write · Provider switching
│   └── popup.css               # Panel styles · dark mode
├── shared/
│   ├── messages.js             # English-first message registry
│   ├── optimization-goals.js   # Built-in optimization goal templates
│   ├── provider-config.js      # 6-Provider registry
│   ├── config-utils.js         # Configuration normalization
│   └── prompt-sites.js         # 40+ AI site whitelist
├── tests/                      # 44 contract tests
├── icons/                      # 16/48/128 icons
├── docs/store-submission.md    # Store submission notes
├── ARCHITECTURE.md             # Architecture deep dive
└── PRIVACY.md / SECURITY.md    # Privacy & security policies
```

---

## 🧪 Testing

```bash
npm test          # 44 contract tests — all passing
npm run check     # Syntax validation for all JS files
npm run verify    # Full one-shot verification
```

---

## ⚠️ Known Limitations

- Button uses `position: fixed` — may misalign inside CSS `transform` containers or complex iframes
- Shadow DOM, cross-origin iframes, and restrictive CSP may block button rendering
- Model presets are not a live catalog — manually enter a valid model ID if calls fail
- Provider API usage incurs charges on your own account

---

## 📄 License

MIT License · [LICENSE](./LICENSE)
