# Architecture

PromptCraft is a Manifest V3 Chrome Extension that optimizes prompt text in webpage input fields using user-provided AI provider keys (BYOK model). It consists of four main components: Content Script, Background Service Worker, Popup, and Shared Modules.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Web Page Input                              │
│                                                                      │
│  User types text → Content Script detects input                     │
│       ↓                                                              │
│  Content Script shows floating "✨ 优化提示词" button                │
│       ↓                                                              │
│  User clicks button → Content Script reads input text                │
│       ↓                                                              │
│  chrome.runtime.sendMessage({ type: "AIPO_OPTIMIZE_PROMPT",         │
│                                rawPrompt })                          │
│       ↓                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Background Service Worker                        │    │
│  │                                                               │    │
│  │  1. Read config from chrome.storage.local                     │    │
│  │     - selectedProvider, API key, model, promptTemplate        │    │
│  │  2. Resolve provider from AIPO_PROVIDER_REGISTRY              │    │
│  │  3. Select adapter: openai-compatible OR anthropic-messages   │    │
│  │  4. Call Provider API (fetch)                                 │    │
│  │  5. Parse response, extract optimized text                    │    │
│  │  6. Return { ok: true, optimizedPrompt }                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│       ↓                                                              │
│  Content Script receives response → writes text back to input        │
│       ↓                                                              │
│  Input field updated with optimized prompt                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Message Types

All messages use `chrome.runtime.sendMessage` or `chrome.tabs.sendMessage` with a `type` field:

| Type | Direction | Payload | Purpose |
| --- | --- | --- | --- |
| `AIPO_OPTIMIZE_PROMPT` | Content → Background | `{ rawPrompt: string }` | Request prompt optimization |
| `AIPO_GET_PAGE_INFO` | Popup → Content | (none) | Get current page hostname for site-level settings |
| `AIPO_REFRESH_SETTINGS` | Popup → Content | (none) | Trigger content script to re-scan inputs after config change |
| `AIPO_TEST_CONNECTION` | Popup → Background | `{ provider, apiKey, model, testPrompt }` | Test provider connectivity |

## API Key Boundary

A critical security boundary: **the Content Script never sees the API Key**.

- Content Script: reads user input text, sends it to Background via `sendMessage`
- Popup: manages API keys via form fields, saves to `chrome.storage.local`
- Background Service Worker: the only component that reads API keys from `chrome.storage.local` and makes authenticated fetch requests to provider APIs

API keys flow: `Popup → chrome.storage.local → Background Service Worker → Provider API`

The Content Script runs in the web page context with `<all_urls>` permissions but has no direct access to stored keys or provider endpoints.

## File Responsibilities

| File | Role | Key Responsibilities |
| --- | --- | --- |
| `manifest.json` | Extension manifest | Declares permissions, content scripts, background worker, host permissions |
| `background/background.js` | Service Worker | Reads config from storage, calls Provider APIs (OpenAI-compatible & Anthropic Messages), returns optimized text |
| `content/content.js` | Content Script | Injects into all pages, detects input fields, shows floating button, reads/writes input text, communicates with background |
| `content/content.css` | Button styles | Styles for the floating optimize button (injected into page) |
| `popup/popup.html` | Popup UI | Settings form: provider selection, API key, model, prompt template |
| `popup/popup.js` | Popup logic | Form handling, saves/loads config from storage, sends refresh messages to content script, test connection |
| `popup/popup.css` | Popup styles | Styles for the popup panel |
| `shared/provider-config.js` | Provider registry | Defines `AIPO_PROVIDER_REGISTRY` — all six providers with endpoints, adapters, default models, key placeholders |
| `shared/config-utils.js` | Config normalization | `normalizeConfig()`, `normalizeHostnames()`, `createDefaultProvidersConfig()`, `cloneProviders()` — shared between background and popup |
| `scripts/pack-extension.js` | Build script | Copies only release files to `dist/` and creates the extension zip |
| `tests/` | Contract tests | Tests for content button contract, popup config, provider adapters, open-source integrity |

## Provider Adapters

The extension supports two API formats:

### `openai-compatible` (default)

Used by: OpenAI, Google Gemini, DeepSeek, 通义千问 (Qwen/DashScope), Kimi

All follow the OpenAI Chat Completions API format:

```
POST {endpoint}
Authorization: Bearer {apiKey}
Body: { model, messages: [{ role: "user", content: prompt }], temperature: 0.2 }
Response: { choices[0].message.content }
```

### `anthropic-messages`

Used by: Anthropic Claude

Follows the Anthropic Messages API format with the `anthropic-dangerous-direct-browser-access: true` header required for direct browser-extension BYOK calls:

```
POST https://api.anthropic.com/v1/messages
x-api-key: {apiKey}
anthropic-version: 2023-06-01
anthropic-dangerous-direct-browser-access: true
Body: { model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }
Response: { content: [{ type: "text", text: "..." }] }
```

## Shared Modules

### `shared/provider-config.js`

Provider registry loaded as a global (`globalThis.AIPO_PROVIDER_REGISTRY`). Defines each provider's label, adapter type, endpoint, default model, available models, key placeholder format, temperature, max tokens, and deprecated model list. This is imported by `background.js` and `popup.js` via `<script>` tags or `importScripts()`.

### `shared/config-utils.js`

Configuration normalization utilities loaded as globals. Provides:

- `AIPO_normalizeConfig(config)` — fills missing fields, upgrades legacy single-provider configs, validates `selectedProvider`
- `AIPO_normalizeHostnames(hostnames)` — deduplicates and lowercases hostname lists
- `AIPO_createDefaultProvidersConfig()` — creates a blank provider config object for all registered providers
- `AIPO_cloneProviders(providers)` — deep-clones provider configs (used by popup for draft state)

These are used by both `background.js` (via `importScripts`) and `popup.js` (via `<script>` tag).

## Content Script Lifecycle

1. **Injection**: Manifest V3 `content_scripts` injects `content.js` and `content.css` into all matching pages at `document_idle`
2. **Discovery**: `MutationObserver` watches for DOM changes; `focusin` listener catches newly focused inputs; regular scanning with debounce
3. **Binding**: Each supported input gets a floated button (`position: fixed`), tracked in a `Map<Element, {button}>`
4. **Positioning**: Button position calculated from input's bounding rect; updated on scroll, resize, and DOM mutations
5. **Optimization**: Click → read input value → `chrome.runtime.sendMessage("AIPO_OPTIMIZE_PROMPT")` → write response back to input
6. **Cleanup**: Detached inputs are cleaned up periodically; all buttons removed when floating button is disabled

## Extension Lifecycle

1. **Install/Update**: `chrome.runtime.onInstalled` → `ensureDefaultConfig()` normalizes and writes default config to `chrome.storage.local`
2. **Popup Open**: Popup reads config from storage, queries active tab for hostname, renders settings form
3. **Settings Save**: Popup writes to storage, sends `AIPO_REFRESH_SETTINGS` to active tab's content script
4. **Storage Change**: Content script listens for `chrome.storage.onChanged` to react to show/hide toggles
5. **Uninstall**: Browser automatically removes all extension data from `chrome.storage.local`

## Security Model

- **BYOK**: No backend service; all API calls are made directly from the user's browser to their chosen provider
- **No remote scripts**: All code is bundled in the extension; no CDN or remote script loading
- **Minimal permissions**: Only `storage` and provider-specific `host_permissions`
- **API key isolation**: Keys stored locally in `chrome.storage.local`; never exposed to content scripts or web pages
- **No data collection**: No analytics, telemetry, or tracking of any kind
