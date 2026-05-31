# Store Submission Notes

## Single purpose

PromptCraft helps users optimize prompt text inside webpage input fields. It displays a lightweight button near supported input areas, sends the selected input text to the user's chosen AI provider only after a click, and writes the optimized prompt back to the same input.

## Permission justification

- `storage`: stores local settings, including provider API keys, selected models, prompt template, floating button visibility, and disabled hostnames.
- `content_scripts` on `<all_urls>`: detects supported text input fields and displays the optimize button on ordinary websites and AI chat websites.
- `all_frames`: supports input fields inside iframes when the browser allows content script injection. Note: content scripts cannot inject into `chrome://`, `chrome-extension://`, or `edge://` pages. The popup shows 'page not supported' for these URLs.
- Provider `host_permissions`: allows the background service worker to call the selected AI provider API directly.

The extension does not request `activeTab`, `tabs`, browsing history, cookies, webRequest, or scripting permissions.

## Data use disclosure

The extension does not collect analytics, does not show ads, and does not use a backend service. Prompt text is sent only after the user clicks the optimize button. The prompt text and the relevant API key are sent only to the provider selected by the user.

API keys and settings are stored in `chrome.storage.local`.

## Third-party services

Users must bring their own provider API key. Provider services may charge the user's account according to their own pricing.

Supported providers:

- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- Alibaba DashScope / Qwen
- Moonshot / Kimi

## Test account note

The extension is BYOK and does not include a shared service account. Store reviewers can test empty-key validation without credentials. Full provider API testing requires a reviewer-owned provider API key.

## Screenshot checklist

- Popup provider/API key/model/template settings.
- Floating button beside a normal textarea.
- Current-site disable switch.
- Error message when API key is missing.
