# P0 Prompt Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn PromptCraft from a single prompt optimization button into an English-first, web-user-oriented prompt workspace with optimization goals and a before/after review flow.

**Architecture:** Keep the current Manifest V3, plain JavaScript/HTML/CSS, zero-runtime-dependency architecture. Add small shared modules for messages and optimization templates, extend local config with a backward-compatible `optimizationGoal`, and change the content-script flow from immediate overwrite to explicit user confirmation.

**Tech Stack:** Chrome Extension Manifest V3, plain JavaScript, HTML, CSS, `chrome.storage.local`, Node built-in test runner.

---

## Product Scope

### P0 In Scope

1. **Optimization Goals** instead of developer-heavy personas:
   - `better-ask` — default, broadest use case
   - `writing-polish` — writing, emails, posts, reports
   - `work-plan` — workplace planning and structured execution
   - `research` — structured research / analysis prompts
   - `custom` — preserve existing editable template behavior
2. **Before / After Review Panel**:
   - Show original prompt and optimized prompt before replacing the source input.
   - Actions: Replace Original, Copy, Retry, Close.
3. **English-first lightweight messages**:
   - Default UI text should be English.
   - Put all new user-facing strings behind a shared message map.
   - Keep Chinese language entries for later switching; P0 hardcodes locale to `"en"`.

### Explicitly Out of Scope for P0

- Cloud sync
- Account system
- Payments / subscription
- Community template market
- Full i18n framework (no locale auto-detection, no language switcher in popup)
- React/Vue/Tailwind/build tooling
- Code-specific optimization as a primary mode
- Any backend service

---

## Key Design Decisions

### 1. Use "Optimization Goal", not "Persona"

Web users understand outcomes better than roles. The popup label: `Optimize for`.

Options: **Better Ask**, **Writing Polish**, **Work Plan**, **Research**, **Custom**.

### 2. Preserve Existing Custom Template Users

New config adds `optimizationGoal`, but migration must be non-breaking:

- **New installs** default to `optimizationGoal: "better-ask"`.
- **Existing installs with a saved custom `promptTemplate` and no `optimizationGoal`** must migrate to `optimizationGoal: "custom"`, otherwise their existing template silently stops applying.
- `custom` is a valid optimization goal even though it is not stored inside `AIPO_OPTIMIZATION_GOALS`.
- Built-in goals use shared templates from `AIPO_OPTIMIZATION_GOALS`.
- `custom` uses `promptTemplate`.
- The `applyPromptTemplate` helper handles both `{originalPrompt}` (new goals) and `{原始提示词内容}` (legacy custom templates).

Default custom template should be English for new users, but existing saved templates must be preserved exactly.

### 3. Review Before Replace

P0 stops auto-overwriting the page input. Optimized text becomes visible in a review panel first. Replacement only happens after the user clicks **Replace Original**.

### 4. Locale: Hardcode English for P0

`AIPO_getMessage` is a **single-parameter** function: `getMessage(key)`. Internally it uses a hardcoded `"en"` locale. The `zh` map is preserved for P1 but not wired to any runtime logic. This avoids storage schema changes for locale preference.

### 5. Review Panel: Centered Modal (P0 Simplicity)

Position the panel as a fixed-position centered modal with a semi-transparent backdrop, not near the button/input. This avoids the ~200 lines of anchor-rect positioning logic the button currently requires, and guarantees the panel is always visible regardless of scroll position or input placement. Button-anchored positioning is deferred to P1.

### 6. Review Panel Loading Flow

```
User clicks "Optimize Prompt"
  → Button shows "Optimizing..." (existing behavior preserved)
  → Panel appears immediately with spinner + "Optimizing..."
  → Background returns result
  → Panel transitions to Before/After view
  → User chooses: Replace | Copy | Retry | Close
```

Button loading state is **not** removed; it coexists with the panel. This keeps the visual feedback users already expect.

### 7. Single Panel Instance (No Concurrent Panels)

Only one review panel exists at any time. If the user triggers optimization on a different input while a panel is open:
- If panel is idle (showing results): close old panel silently, open new one.
- If panel is loading: close old panel, open new one with new loading state.

No confirmation dialog — P0 simplicity.

### 8. Review Panel Accessibility

- Panel root has `role="dialog"` and `aria-label="Prompt review panel"`.
- Backdrop click = Close.
- Escape key = Close.
- P0 does **not** implement full focus trap. It only focuses the panel on open and supports Escape close. Full focus trapping is P1.
- Action buttons are keyboard-focusable.

### 9. Stale Request Guard

Every optimize request gets a monotonically increasing `reviewRequestId`. If a request finishes after its panel has been closed/replaced, the result must be ignored. This prevents closed panels from being updated by late async responses.

---

## Existing Test Assertion Impact

**Before starting any implementation, run `npm test` and record the baseline.**

The following existing test assertions reference Chinese strings that will break during Englishification. These must be updated **in the same commit** that changes the UI strings.

| File | Line | Current Assertion | Will Break In |
|---|---|---|---|
| `popup-config-contract.test.js` | 17 | `/模型（可手动输入）<\/span>/` | Task 3 (popup English) |
| `popup-config-contract.test.js` | 18 | `/预设模型可能随厂商更新/` | Task 3 |
| `popup-config-contract.test.js` | 20 | `/若调用失败请填写厂商后台当前模型 ID/` | Task 3 |
| `popup-config-contract.test.js` | 46 | `/Model IDs are subject to change/` | Already English (safe) |
| `popup-config-contract.test.js` | 47 | `/manually enter a valid model ID/` | Already English (safe) |
| `content-button-contract.test.js` | ~10-20 | Any Chinese string assertions | Task 5 (messages) |
| `open-source-contract.test.js` | 46-48 | Chinese doc assertions (PRIVACY/SECURITY/README_CN) | Task 7 (docs review) |
| `provider-adapters.test.js` | various | May include Chinese labels from provider-config | Task 3 |

Each task below includes an explicit sub-step: **"Update existing test assertions that broke."**

---

## Target File Map

| Area | Files |
|---|---|
| Shared messages | Create `shared/messages.js` |
| Shared templates | Create `shared/optimization-goals.js` |
| Config normalization | Modify `shared/config-utils.js` |
| Provider labels | Modify `shared/provider-config.js` |
| Popup UI | Modify `popup/popup.html`, `popup/popup.js` |
| Background optimization | Modify `background/background.js` |
| Content review panel | Modify `content/content.js`, `content/content.css` |
| Manifest | Modify `manifest.json` |
| Tests | Modify/add tests under `tests/` |
| Docs | Update `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md` |

---

## Task Ordering Note

Tasks are ordered so that **dependencies are satisfied before consumers**:

```
Task 1 (goals.js) ─────────────────────────────────────────────┐
Task 2 (messages.js) ── prerequisite for ALL UI ────────────────┤
Task 3 (load scripts everywhere) ──────────────────────────────┤
Task 4 (popup English + goal selector) ← depends on 2,3 ────────┤
Task 5 (background uses goals) ← depends on 1,3,4 ──────────────┤
Task 6 (review panel) ← depends on 2,3 ────────────────────────┤
Task 7 (docs) ← depends on all above ───────────────────────────┘
```

Important implementation constraint: `shared/config-utils.js` must not crash when loaded before `shared/optimization-goals.js` in tests or partial environments. Either tests must load both files in correct order, or `config-utils.js` must defensively resolve goals with a fallback object. Prefer defensive code because it reduces runtime fragility.

---

## Task 1: Add Optimization Goal Templates

**Files:**
- Create: `shared/optimization-goals.js`
- Modify: `shared/config-utils.js`
- Test: `tests/popup-config-contract.test.js`
- Test: `tests/provider-adapters.test.js`

**Step 1: Write failing tests**

Add assertions that:

```js
// popup-config-contract.test.js
assert.match(sharedOptimizationGoals, /better-ask/);
assert.match(sharedOptimizationGoals, /writing-polish/);
assert.match(sharedOptimizationGoals, /work-plan/);
assert.match(sharedOptimizationGoals, /research/);
assert.match(sharedConfigUtils, /optimizationGoal/);
assert.match(sharedConfigUtils, /"better-ask"/);
```

In provider adapter tests, verify the outbound provider request uses the selected built-in goal template, not only the legacy `promptTemplate`.

**Step 2: Run expected failing tests**

```bash
npm test
```

Expected: fails because `shared/optimization-goals.js` and `optimizationGoal` config field do not exist.

**Step 3: Implement shared goal registry**

Create `shared/optimization-goals.js`:

```js
(function () {
  "use strict";

  const ORIGINAL_PROMPT_TOKEN = "{originalPrompt}";

  globalThis.AIPO_ORIGINAL_PROMPT_TOKEN = ORIGINAL_PROMPT_TOKEN;
  globalThis.AIPO_OPTIMIZATION_GOALS = {
    "better-ask": {
      label: "Better Ask",
      template:
        "Rewrite the user's prompt so it becomes clearer, more specific, and easier for an AI assistant to answer well.\n\n" +
        "Rules:\n" +
        "1. Preserve the user's original intent.\n" +
        "2. Add useful context, structure, constraints, and output expectations when they are implied.\n" +
        "3. Do not invent critical facts.\n" +
        "4. Return only the improved prompt.\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    },
    "writing-polish": {
      label: "Writing Polish",
      template:
        "Rewrite the user's prompt for a writing task so the AI produces polished, audience-aware, useful writing.\n\n" +
        "Improve clarity around audience, tone, length, structure, and desired format. Preserve intent and return only the improved prompt.\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    },
    "work-plan": {
      label: "Work Plan",
      template:
        "Rewrite the user's prompt so the AI creates a practical work plan.\n\n" +
        "The improved prompt should ask for objectives, stakeholders, timeline, steps, resources, risks, and success metrics. Return only the improved prompt.\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    },
    research: {
      label: "Research",
      template:
        "Rewrite the user's prompt so the AI performs structured research or analysis.\n\n" +
        "The improved prompt should ask for background, key dimensions, evidence, comparison, risks, opportunities, and actionable conclusions. Return only the improved prompt.\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    }
  };
})();
```

**Step 4: Update config normalization**

In `shared/config-utils.js`:

- Add `optimizationGoal: "better-ask"` to `globalThis.AIPO_DEFAULT_CONFIG`.
- Replace the old Chinese default `promptTemplate` with an English default custom template for **new installs**. Do not mutate saved user templates during normalization.
- Add helper functions before `normalizeConfig()`:

```js
function getOptimizationGoals() {
  return globalThis.AIPO_OPTIMIZATION_GOALS && typeof globalThis.AIPO_OPTIMIZATION_GOALS === "object"
    ? globalThis.AIPO_OPTIMIZATION_GOALS
    : {};
}

function hasSavedCustomTemplate(source) {
  return typeof source.promptTemplate === "string" &&
    source.promptTemplate.trim() &&
    source.promptTemplate !== globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
}

function normalizeOptimizationGoal(source) {
  const goals = getOptimizationGoals();
  if (source.optimizationGoal === "custom") {
    return "custom";
  }
  if (typeof source.optimizationGoal === "string" && goals[source.optimizationGoal]) {
    return source.optimizationGoal;
  }
  if (!source.optimizationGoal && hasSavedCustomTemplate(source)) {
    return "custom";
  }
  return "better-ask";
}
```

- In `normalizeConfig()`, add:

```js
optimizationGoal: normalizeOptimizationGoal(source)
```

- Keep existing `promptTemplate` fallback for custom mode and preserve any saved user-provided template exactly.

**Required migration tests:**

```js
// New install defaults to better-ask.
assert.equal(AIPO_normalizeConfig(null).optimizationGoal, "better-ask");

// Explicit custom stays custom.
assert.equal(AIPO_normalizeConfig({ optimizationGoal: "custom" }).optimizationGoal, "custom");

// Existing users with saved promptTemplate and no optimizationGoal migrate to custom.
assert.equal(
  AIPO_normalizeConfig({ promptTemplate: "Legacy {原始提示词内容}" }).optimizationGoal,
  "custom"
);

// Unknown goal falls back to better-ask.
assert.equal(AIPO_normalizeConfig({ optimizationGoal: "bad" }).optimizationGoal, "better-ask");
```

**Step 5: Run tests**

```bash
npm test
```

Expected: goal registry and config tests pass.

---

## Task 2: Add English-First Shared Messages

> **This task must run before any popup/content HTML changes because every subsequent task depends on `AIPO_getMessage`.**

**Files:**
- Create: `shared/messages.js`
- Modify: `shared/provider-config.js` (provider labels)
- Modify: `manifest.json` (description)
- Test: `tests/open-source-contract.test.js`

**Step 1: Write failing tests**

```js
// open-source-contract.test.js
assert.match(sharedMessages, /Optimize Prompt/);
assert.match(sharedMessages, /Replace Original/);
assert.match(sharedMessages, /Retry/);
assert.match(read("manifest.json"), /Optimize your prompts/);
assert.match(read("shared/provider-config.js"), /Qwen \(Tongyi\)/);
```

**Step 2: Add message map**

Create `shared/messages.js`:

```js
(function () {
  "use strict";

  var AIPO_MESSAGES = {
    en: {
      // Button
      optimizeButton: "✨ Optimize Prompt",
      optimizing: "Optimizing...",

      // Popup
      saveConfig: "Save",
      showFloatingButton: "Show floating button",
      hideOnCurrentSite: "Hide on current site",
      providerConfig: "Provider Config",
      optimizeTemplate: "Optimize Template",
      provider: "Provider",
      apiKeyLabel: "API Key",
      apiKeyHint: "API Key is stored locally. Only sent to the selected provider.",
      model: "Model (manual input supported)",
      modelHint: "Model presets may change. Enter a valid model ID if the call fails.",
      testConnection: "Test Connection",
      connectedOk: "Connected ✔",
      resetTemplate: "Reset Template",
      configSaved: "Settings saved.",
      readConfigFailed: "Failed to read config.",
      templateReset: "Template reset.",
      customTemplateHint: "This template is only used when Custom Template is selected as the optimization goal.",
      optimizeFor: "Optimize for",

      // Review panel
      replaceOriginal: "Replace Original",
      copy: "Copy",
      retry: "Retry",
      close: "Close",
      before: "Before",
      after: "After",

      // Toasts
      emptyPrompt: "Enter a prompt to optimize.",
      optimizeFailed: "Optimization failed. Please try again.",
      promptReady: "Optimized prompt is ready.",
      promptReplaced: "Prompt replaced.",
      copied: "Copied.",
      configRequired: "Please configure your API Key in extension settings.",
      providerError: "Provider returned an error.",
      networkError: "Network error. Check your connection.",
      backgroundUnavailable: "Extension background unavailable. Reload the page.",

      // Background error messages
      bgEmptyPrompt: "Enter a prompt to optimize.",
      bgReadConfigFailed: "Failed to read extension config.",
      bgMissingKey: "Please configure your {provider} API Key in extension settings.",
      bgDeprecatedModel: "Model {model} has been deprecated by {provider}. Switch to an active model.",
      bgNetworkError: "Network request failed. Check your connection.",
      bgParseError: "{provider} returned an unparseable response.",
      bgEmptyResponse: "{provider} returned an empty response.",

      // Custom template
      customGoalLabel: "Custom Template"
    },
    zh: {
      optimizeButton: "✨ 优化提示词",
      optimizing: "优化中...",
      saveConfig: "保存配置",
      showFloatingButton: "显示悬浮按钮",
      hideOnCurrentSite: "当前网站隐藏",
      providerConfig: "Provider 配置",
      optimizeTemplate: "优化模板",
      provider: "Provider",
      apiKeyLabel: "API Key",
      apiKeyHint: "API Key 仅存储在本地浏览器中，只会用于调用当前选择的 Provider。",
      model: "模型（可手动输入）",
      modelHint: "预设模型可能随厂商更新，若调用失败请填写厂商后台当前模型 ID。",
      testConnection: "测试连接",
      connectedOk: "连接正常 ✓",
      resetTemplate: "恢复模板",
      configSaved: "配置已保存",
      readConfigFailed: "读取配置失败",
      templateReset: "已恢复默认模板",
      customTemplateHint: "此模板仅在优化目标选择「自定义模板」时生效。",
      optimizeFor: "优化目标",
      replaceOriginal: "替换原文",
      copy: "复制",
      retry: "重新优化",
      close: "关闭",
      before: "优化前",
      after: "优化后",
      emptyPrompt: "请输入需要优化的 Prompt",
      optimizeFailed: "优化失败，请稍后重试",
      promptReady: "Prompt 已优化",
      promptReplaced: "已替换原文",
      copied: "已复制",
      configRequired: "请先在插件设置中填写 API Key",
      providerError: "Provider 返回错误",
      networkError: "网络请求失败，请检查网络连接",
      backgroundUnavailable: "扩展后台未响应，请刷新页面",
      bgEmptyPrompt: "请输入需要优化的 Prompt",
      bgReadConfigFailed: "读取插件配置失败",
      bgMissingKey: "请先在插件设置中填写 {provider} API Key",
      bgDeprecatedModel: "您使用的模型 {model} 已被 {provider} 弃用，请更换为当前有效模型。",
      bgNetworkError: "网络请求失败，请检查网络连接",
      bgParseError: "{provider} 返回内容解析失败",
      bgEmptyResponse: "{provider} 返回内容为空",
      customGoalLabel: "自定义模板"
    }
  };

  // P0: hardcoded locale. P1: read from storage or navigator.language.
  globalThis.AIPO_MESSAGES = AIPO_MESSAGES;
  globalThis.AIPO_getMessage = function getMessage(key) {
    var locale = "en";
    var map = AIPO_MESSAGES[locale] || AIPO_MESSAGES.en;
    return map[key] || AIPO_MESSAGES.en[key] || key;
  };
})();
```

**Step 3: Englishify manifest.json**

Change `"description"` to:

```json
"description": "Optimize your prompts on AI chat platforms with one click."
```

**Step 4: Englishify provider labels**

In `shared/provider-config.js`, change `label: "通义千问"` to `label: "Qwen (Tongyi)"`.

**Step 5: Run tests**

```bash
npm test
```

Expected: message map tests pass; provider label test passes.

---

## Task 3: Load Shared Scripts in Every Runtime Environment

**Files:**
- Modify: `manifest.json` (content_scripts)
- Modify: `popup/popup.html`
- Modify: `background/background.js`
- Test: `tests/open-source-contract.test.js`
- Test: `tests/popup-config-contract.test.js`

**Step 1: Write failing tests**

```js
const manifest = JSON.parse(read("manifest.json"));
const contentScriptFiles = manifest.content_scripts[0].js;
assert.ok(contentScriptFiles.includes("shared/messages.js"));
assert.ok(contentScriptFiles.includes("shared/prompt-sites.js"));
// Content scripts do NOT need optimization-goals.js — only messages.js.
assert.ok(!contentScriptFiles.includes("shared/optimization-goals.js"));
assert.match(popupHtml, /shared\/messages\.js/);
assert.match(popupHtml, /shared\/optimization-goals\.js/);
assert.match(backgroundJs, /messages\.js/);
assert.match(backgroundJs, /optimization-goals\.js/);
```

**Step 2: Update manifest.json content_scripts**

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": [
      "shared/prompt-sites.js",
      "shared/messages.js",
      "content/content.js"
    ],
    "css": ["content/content.css"],
    "run_at": "document_idle",
    "all_frames": true
  }
]
```

> **Note**: `optimization-goals.js` is NOT loaded into content scripts — it is only needed by background (template resolution) and popup (goal selector population).

**Step 3: Update popup/popup.html script order**

```html
<script src="../shared/messages.js"></script>
<script src="../shared/provider-config.js"></script>
<script src="../shared/optimization-goals.js"></script>
<script src="../shared/config-utils.js"></script>
<script src="popup.js"></script>
```

**Step 4: Update background/background.js importScripts**

```js
importScripts(
  "../shared/messages.js",
  "../shared/provider-config.js",
  "../shared/optimization-goals.js",
  "../shared/config-utils.js"
);
```

**Step 5: Run tests**

```bash
npm test
```

Expected: script-loading contract tests pass.

---

## Task 4: Englishify Popup UI + Add Goal Selector

> **Combined task**: English labels and goal selector are made in the same pass to avoid doubling the test-update work.

**Files:**
- Modify: `popup/popup.html`
- Modify: `popup/popup.js`
- Test: `tests/popup-config-contract.test.js`

**Step 1: Run baseline tests and record failures**

```bash
npm test
```

Expected before editing: current tests pass. After Step 2/4 Englishifies popup strings, existing Chinese assertions will fail until Step 5 updates them. Do not move past this task until the updated English assertions pass.

**Step 2: Englishify popup.html**

- Change `<html lang="zh-CN">` → `<html lang="en">`
- Replace all static Chinese labels with English (use `getMessage` keys as reference):
  - `保存配置` → `Save`
  - `显示悬浮按钮` → `Show floating button`
  - `当前网站隐藏` → `Hide on current site`
  - `Provider 配置` → `Provider Config`
  - `优化模板` → `Optimize Template`
  - `Provider` → `Provider` (unchanged)
  - `OpenAI API Key` → `API Key` (dynamic via JS)
  - `API Key 仅存储在本地浏览器中...` → `API Key is stored locally...`
  - `模型（可手动输入）` → `Model (manual input supported)`
  - `预设模型可能随厂商更新...` → `Model presets may change...`
  - `测试连接` → `Test Connection`
  - `恢复模板` → `Reset Template`
  - Prompt template textarea hint: change to English
- Remove hardcoded provider `<option>` entries from `#providerSelect`; `popup.js` must populate providers from `globalThis.AIPO_PROVIDER_REGISTRY`. This ensures `qwen` displays as `Qwen (Tongyi)` and prevents HTML/provider registry drift.

Provider select target markup:

```html
<select id="providerSelect"></select>
```

**Step 3: Add goal selector to popup.html**

Add **before** the Provider Config / Optimize Template tab bar:

```html
<label class="field">
  <span class="field-label" id="optimizeForLabel">Optimize for</span>
  <select id="optimizationGoalSelect"></select>
  <span class="field-hint">Custom template is only used when Custom Template is selected.</span>
</label>
```

> Note: The `<select>` is populated dynamically by `popup.js` from `AIPO_OPTIMIZATION_GOALS`. No hardcoded `<option>` elements.

**Step 4: Update popup.js**

In `popup.js`:

- Import the `messages` and `goals` globals.
- Populate `#providerSelect` from `globalThis.AIPO_PROVIDER_REGISTRY` instead of relying on hardcoded HTML options.
- Populate `#optimizationGoalSelect` from `globalThis.AIPO_OPTIMIZATION_GOALS` plus a `custom` entry.
- Read/write `optimizationGoal` to storage via the normalized config.
- Replace all hardcoded Chinese strings (toasts, status updates, label updates) with `AIPO_getMessage(key)`.
- When `custom` is not selected, show a hint under the template textarea: use `getMessage("customTemplateHint")`.

Provider selector code pattern:

```js
var providerSelect = document.getElementById("providerSelect");
Object.keys(globalThis.AIPO_PROVIDER_REGISTRY).forEach(function (providerId) {
  var provider = globalThis.AIPO_PROVIDER_REGISTRY[providerId];
  var option = document.createElement("option");
  option.value = providerId;
  option.textContent = provider.label;
  providerSelect.appendChild(option);
});
```

Key code patterns:

```js
// Populate goal selector
var optimizationGoalSelect = document.getElementById("optimizationGoalSelect");
var goals = globalThis.AIPO_OPTIMIZATION_GOALS;
Object.keys(goals).forEach(function (id) {
  var option = document.createElement("option");
  option.value = id;
  option.textContent = goals[id].label;
  optimizationGoalSelect.appendChild(option);
});
var customOption = document.createElement("option");
customOption.value = "custom";
customOption.textContent = AIPO_getMessage("customGoalLabel");
optimizationGoalSelect.appendChild(customOption);
```

**Step 5: Update existing test assertions**

In `tests/popup-config-contract.test.js`, update all assertions that matched Chinese strings to match the equivalent English strings. Use the `AIPO_MESSAGES.en` map as reference.

Example changes:

```js
// Before:
assert.match(popupHtml, /<span class="field-label">模型（可手动输入）<\/span>/);
// After:
assert.match(popupHtml, /Model \(manual input supported\)/);

// Before:
assert.match(popupHtml, /预设模型可能随厂商更新/);
// After:
assert.match(popupHtml, /Model presets may change/);

// Before:
assert.match(popupJs, /若调用失败请填写厂商后台当前模型 ID/);
// After:
assert.match(popupJs, /Enter a valid model ID if the call fails/);
```

**Step 6: Run tests**

```bash
npm test
```

Expected: all popup contract tests pass with English assertions.

---

## Task 5: Background Uses Selected Goal Template

**Files:**
- Modify: `background/background.js`
- Test: `tests/provider-adapters.test.js`

**Step 1: Write failing test**

In the provider adapter test setup, store config:

```js
optimizationGoal: "work-plan"
```

Then assert the fetch body includes a Work Plan-specific phrase:

```js
assert.match(requestBody.messages[0].content, /practical work plan/);
```

Also test `optimizationGoal: "custom"` uses `promptTemplate` and handles the legacy Chinese token `{原始提示词内容}` via `applyPromptTemplate`.

**Step 2: Implement template resolution helpers**

In `background/background.js`, add before `optimizePrompt()`:

```js
function resolvePromptTemplate(config) {
  if (config.optimizationGoal === "custom") {
    return String(config.promptTemplate || globalThis.AIPO_DEFAULT_CONFIG.promptTemplate);
  }
  var goal = globalThis.AIPO_OPTIMIZATION_GOALS[config.optimizationGoal];
  if (goal && goal.template) {
    return goal.template;
  }
  return globalThis.AIPO_OPTIMIZATION_GOALS["better-ask"].template;
}

function applyPromptTemplate(template, sourcePrompt) {
  return String(template)
    .split("{originalPrompt}").join(sourcePrompt)
    .split("{原始提示词内容}").join(sourcePrompt);
}
```

**Step 3: Update optimizePrompt()**

Replace the current template resolution:

```js
// Before:
var requestPrompt = promptTemplate.split("{原始提示词内容}").join(sourcePrompt);

// After:
var resolvedTemplate = resolvePromptTemplate(config);
var requestPrompt = applyPromptTemplate(resolvedTemplate, sourcePrompt);
```

**Step 4: Englishify background error messages (partial)**

Replace only the **user-visible** error messages (those returned to content script and shown in toasts/panel). Background-internal strings can remain as-is or use `AIPO_getMessage`:

```js
// Before:
throw new Error("请输入需要优化的 Prompt");
// After:
throw new Error(AIPO_getMessage("bgEmptyPrompt"));

// Before:
throw new Error("请先在插件设置中填写 " + provider.label + " API Key");
// After:
var msg = AIPO_getMessage("bgMissingKey").split("{provider}").join(provider.label);
throw new Error(msg);
```

Do the same for: deprecated model warning, network error, parse error, empty response, config read failure.

**Step 5: Run tests**

```bash
npm test
```

Expected: provider adapter tests pass for built-in and custom templates; message assertions pass.

---

## Task 6: Build Before / After Review Panel

**Files:**
- Modify: `content/content.js`
- Modify: `content/content.css`
- Test: `tests/content-button-contract.test.js`

**Step 1: Write failing tests**

```js
assert.match(contentJs, /AIPO_REVIEW_PANEL_CLASS/);
assert.match(contentJs, /showReviewPanel/);
assert.match(contentJs, /AIPO_getMessage\("replaceOriginal"\)/);
assert.match(contentJs, /AIPO_getMessage\("retry"\)/);
assert.match(contentJs, /navigator\.clipboard|document\.execCommand/);
assert.match(contentJs, /keydown.*Escape/);
assert.match(contentJs, /reviewRequestId/);
assert.match(contentJs, /tabIndex\s*=\s*-1/);
assert.match(contentJs, /role="dialog"/);
assert.match(contentCss, /\.aipo-review-panel/);
assert.match(contentCss, /\.aipo-review-panel-backdrop/);
assert.match(contentCss, /\.aipo-review-panel-actions/);
// Verify the old direct-write pattern is GONE:
var hasDirectWrite = /writeEditableValue\(editableElement,\s*response\.optimizedPrompt\)/.test(contentJs);
assert.ok(!hasDirectWrite, "Content script should NOT directly write optimized result — must go through review panel");
```

**Step 2: Add CSS for review panel**

In `content/content.css`, add styles for:

```css
.aipo-review-panel-backdrop {
  position: fixed; inset: 0; z-index: 2147483646;
  background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center;
}
.aipo-review-panel {
  background: #1e1e2e; color: #cdd6f4; border-radius: 12px;
  width: min(640px, 92vw); max-height: 80vh;
  box-shadow: 0 16px 48px rgba(0,0,0,0.4);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px; line-height: 1.5;
  display: flex; flex-direction: column; overflow: hidden;
  /* Aggressive reset against page CSS */
  box-sizing: border-box;
}
.aipo-review-panel *,
.aipo-review-panel *::before,
.aipo-review-panel *::after {
  box-sizing: border-box;
}
.aipo-review-panel-header {
  padding: 14px 16px; border-bottom: 1px solid #313244;
  font-weight: 600; font-size: 14px;
}
.aipo-review-panel-body {
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px; overflow-y: auto; flex: 1;
}
.aipo-review-panel-field {
  display: flex; flex-direction: column; gap: 6px;
}
.aipo-review-panel-field-label {
  font-size: 11px; font-weight: 600; color: #a6adc8;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.aipo-review-panel-textarea {
  width: 100%; min-height: 80px; max-height: 200px;
  background: #11111b; color: #cdd6f4;
  border: 1px solid #313244; border-radius: 8px;
  padding: 10px 12px; font: inherit;
  resize: vertical; overflow-y: auto;
}
.aipo-review-panel-actions {
  display: flex; gap: 8px; padding: 12px 16px;
  border-top: 1px solid #313244;
  justify-content: flex-end;
}
.aipo-review-panel-btn {
  padding: 7px 16px; border-radius: 6px; border: 1px solid #45475a;
  background: #313244; color: #cdd6f4; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 500;
}
.aipo-review-panel-btn:hover { background: #45475a; }
.aipo-review-panel-btn-primary {
  background: #cba6f7; color: #1e1e2e; border-color: #cba6f7;
}
.aipo-review-panel-btn-primary:hover { background: #b4befe; }
.aipo-review-panel-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 32px; gap: 10px; color: #a6adc8;
}
.aipo-review-panel-spinner {
  width: 20px; height: 20px; border: 2px solid #313244;
  border-top-color: #cba6f7; border-radius: 50%;
  animation: aipo-spin 0.6s linear infinite;
}
@keyframes aipo-spin { to { transform: rotate(360deg); } }
```

> All class names are prefixed `aipo-` to avoid collisions with page CSS. All colors use Catppuccin Mocha palette (dark mode only for P0; light mode is P1).

**Step 3: Change optimize flow in content.js**

Current flow:

```js
writeEditableValue(editableElement, response.optimizedPrompt);
showToast("Prompt 已优化并回填");
```

Replace with two-phase flow:

```js
var requestId = nextReviewRequestId();

// Phase 1: Show loading panel immediately after click
var reviewState = showReviewPanel({
  editableElement: editableElement,
  button: button,
  originalPrompt: rawPrompt,
  requestId: requestId,
  loading: true
});

// Phase 2: Background returns → update panel
try {
  var response = await sendRuntimeMessage({
    type: "AIPO_OPTIMIZE_PROMPT",
    rawPrompt: rawPrompt
  });
  if (!response || !response.ok) {
    throw new Error((response && response.error) || getMessage("optimizeFailed"));
  }
  if (!isActiveReviewRequest(reviewState, requestId)) {
    return;
  }
  updateReviewPanel(reviewState, {
    originalPrompt: rawPrompt,
    optimizedPrompt: response.optimizedPrompt
  });
} catch (error) {
  if (!isActiveReviewRequest(reviewState, requestId)) {
    return;
  }
  closeReviewPanel(reviewState);
  handleOptimizeError(error);
}
```

Required stale-request helpers:

```js
var currentReviewPanel = null;
var currentReviewRequestId = 0;

function nextReviewRequestId() {
  currentReviewRequestId += 1;
  return currentReviewRequestId;
}

function isActiveReviewRequest(state, requestId) {
  return state && currentReviewPanel === state && currentReviewRequestId === requestId;
}
```

**Step 4: Implement showReviewPanel()**

```js
function showReviewPanel(opts) {
  closeReviewPanel(currentReviewPanel);

  var backdrop = document.createElement("div");
  backdrop.className = "aipo-review-panel-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-label", "Prompt review panel");

  var panel = document.createElement("div");
  panel.className = "aipo-review-panel";
  panel.tabIndex = -1;

  // Header
  var header = document.createElement("div");
  header.className = "aipo-review-panel-header";
  header.textContent = "PromptCraft";

  // Body
  var body = document.createElement("div");
  body.className = "aipo-review-panel-body";

  if (opts.loading) {
    body.innerHTML =
      '<div class="aipo-review-panel-loading">' +
      '<div class="aipo-review-panel-spinner"></div>' +
      '<span>' + getMessage("optimizing") + '</span>' +
      '</div>';
  } else {
    // Before field
    body.appendChild(buildReviewField(getMessage("before"), opts.originalPrompt));
    // After field
    body.appendChild(buildReviewField(getMessage("after"), opts.optimizedPrompt));
  }

  // Actions
  var actions = document.createElement("div");
  actions.className = "aipo-review-panel-actions";

  // showReviewPanel() only creates the loading/close shell.
  // updateReviewPanel() replaces this action row with Replace/Copy/Retry/Close after the request succeeds.
  actions.appendChild(buildActionBtn(getMessage("close"), "", function () {
    closeReviewPanel(state);
  }));

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(actions);
  backdrop.appendChild(panel);

  // Escape key
  backdrop.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeReviewPanel(state); }
  });
  // Click backdrop (not panel) to close
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) { closeReviewPanel(state); }
  });

  document.body.appendChild(backdrop);
  panel.focus();

  var state = {
    backdrop: backdrop,
    panel: panel,
    editableElement: opts.editableElement,
    button: opts.button,
    originalPrompt: opts.originalPrompt,
    optimizedPrompt: opts.optimizedPrompt || "",
    requestId: opts.requestId
  };
  currentReviewPanel = state;
  return state;
}
```

Helper functions:

```js
function buildReviewField(label, text) {
  var field = document.createElement("div");
  field.className = "aipo-review-panel-field";
  var labelEl = document.createElement("div");
  labelEl.className = "aipo-review-panel-field-label";
  labelEl.textContent = label;
  var textarea = document.createElement("textarea");
  textarea.className = "aipo-review-panel-textarea";
  textarea.readOnly = true;
  textarea.value = text;
  field.appendChild(labelEl);
  field.appendChild(textarea);
  return field;
}

function buildActionBtn(text, cls, handler) {
  var btn = document.createElement("button");
  btn.className = "aipo-review-panel-btn" + (cls ? " aipo-review-panel-btn-" + cls : "");
  btn.textContent = text;
  btn.addEventListener("click", handler);
  return btn;
}

function updateReviewPanel(state, opts) {
  if (!state || currentReviewPanel !== state) {
    return;
  }
  state.optimizedPrompt = opts.optimizedPrompt;
  state.originalPrompt = opts.originalPrompt || state.originalPrompt || "";
  var body = state.panel.querySelector(".aipo-review-panel-body");
  body.innerHTML = "";
  body.appendChild(buildReviewField(getMessage("before"), state.originalPrompt));
  body.appendChild(buildReviewField(getMessage("after"), state.optimizedPrompt));

  // Replace actions with idle actions
  var actions = state.panel.querySelector(".aipo-review-panel-actions");
  actions.innerHTML = "";
  actions.appendChild(buildActionBtn(getMessage("replaceOriginal"), "primary", function () {
    writeEditableValue(state.editableElement, state.optimizedPrompt);
    closeReviewPanel(state);
    showToast(getMessage("promptReplaced"));
  }));
  actions.appendChild(buildActionBtn(getMessage("copy"), "", function () {
    copyToClipboard(state.optimizedPrompt);
    showToast(getMessage("copied"));
  }));
  actions.appendChild(buildActionBtn(getMessage("retry"), "", function () {
    closeReviewPanel(state);
    handleOptimizeClick(state.editableElement, state.button);
  }));
  actions.appendChild(buildActionBtn(getMessage("close"), "", function () {
    closeReviewPanel(state);
  }));
}

function closeReviewPanel(state) {
  if (state && state.backdrop && state.backdrop.parentNode) {
    state.backdrop.parentNode.removeChild(state.backdrop);
  }
  if (currentReviewPanel === state) {
    currentReviewPanel = null;
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(function () {});
    return;
  }
  var textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(textarea);
}
```

Add module-level variables for the current panel/request:

```js
var currentReviewPanel = null;
var currentReviewRequestId = 0;
```

**Step 5: Update existing content tests**

In `tests/content-button-contract.test.js`:

- Remove or update assertions that expect direct `writeEditableValue` call.
- Add assertions verifying review panel flow is present.
- Update any Chinese string assertions to English equivalents.

Also update the `error messages distinguish` test — if toast messages changed to English, those assertions need updating too.

**Step 6: Run tests**

```bash
npm test
```

Expected: content button contract tests pass.

---

## Task 7: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `CHANGELOG.md`
- Test: `tests/open-source-contract.test.js`

**Step 1: Write failing tests**

```js
assert.match(read("README.md"), /Optimization Goals/);
assert.match(read("README.md"), /Before \/ After/);
assert.match(read("README.md"), /Better Ask/);
assert.match(read("README.md"), /Writing Polish/);
assert.match(read("ARCHITECTURE.md"), /optimization-goals\.js/);
assert.match(read("ARCHITECTURE.md"), /messages\.js/);
assert.match(read("ARCHITECTURE.md"), /review panel/);
assert.match(read("CHANGELOG.md"), /Unreleased/);
```

**Step 2: Update docs**

README additions:

- New section after "Why PromptCraft?": **Optimization Goals**, listing each goal.
- New section after Architecture: **Before / After Review**, describing the panel flow.
- Update the Preview ASCII art to reflect new goal selector.
- Note: Default UI language is English.

ARCHITECTURE additions:

- `shared/optimization-goals.js` — goal template registry
- `shared/messages.js` — English-first message map
- Review panel data flow (Content Script → Background → Review Panel → User Confirmation)
- Update message types table

CHANGELOG:

```md
## Unreleased

- Added optimization goals: Better Ask, Writing Polish, Work Plan, Research, Custom Template.
- Added before/after review panel with loading state, copy, retry, and close actions.
- Switched default extension UI language to English.
- Added shared message map with English and Chinese locales.
```

**Step 3: Update documentation test assertions**

In `tests/open-source-contract.test.js`:

- If any assertions still reference Chinese doc content, update to English equivalents.
- The `README_CN.md` assertion (added in the previous README swap) should remain — it validates the Chinese backup still exists.

**Step 4: Run tests**

```bash
npm test
```

Expected: documentation contract tests pass.

---

## Final Verification

Run:

```bash
npm run verify
```

Expected:

- JS syntax check passes
- All contract tests pass (existing 33 + new assertions)
- Manifest validation passes

### Manual Verification Checklist

1. Load unpacked extension on `chrome://extensions`.
2. Configure a provider API key.
3. In popup, select each optimization goal — confirm selector works.
4. Open ChatGPT or another supported AI site.
5. Type a rough prompt.
6. Click **Optimize Prompt**.
7. Confirm loading spinner appears in panel.
8. Confirm panel transitions to Before/After view.
9. Confirm **Replace Original** writes optimized text back to input.
10. Confirm **Copy** copies to clipboard.
11. Confirm **Retry** triggers another optimization.
12. Confirm **Close** (Escape, backdrop click, or button) leaves input unchanged.
13. Repeat with different optimization goals.
14. Confirm Custom Template uses the textarea in popup.
15. Confirm all UI labels, toasts, and error messages are English.

---

## Suggested Git Flow

Branch: `feature/p0-prompt-workspace` (already created).

```
main
└── develop
    └── feature/p0-prompt-workspace
```

Suggested atomic commits:

1. `feat: add optimization goal templates`
2. `feat: add English-first message map`
3. `feat: load shared scripts in all environments`
4. `feat: englishify popup with goal selector`
5. `feat: resolve goal templates in background`
6. `feat: add before/after review panel`
7. `docs: document P0 prompt workspace features`

Do not push or open PR until `npm run verify` passes cleanly.
