# Privacy Policy

PromptCraft is a bring-your-own-key browser extension. It does not run a backend service and does not collect analytics.

## Data stored locally

The extension stores these settings in `chrome.storage.local`:

- selected provider
- provider API keys
- provider model names
- prompt optimization template
- floating button visibility
- hostnames where the floating button is disabled

API keys are stored locally in the browser profile. They are not encrypted by this extension and should be treated like any other local browser extension setting.

When the extension is uninstalled, the browser automatically removes all extension data from `chrome.storage.local`, including API keys and settings.

## Data sent to AI providers

The extension does not automatically send webpage input content anywhere. It sends text only after the user clicks the floating optimize button.

插件不会自动发送网页输入内容；只有用户点击悬浮优化按钮后，才会发送当前输入框文本。

When the user clicks the button, the extension sends the current input text, after applying the configured template, to the selected provider only:

- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- Alibaba DashScope / Qwen
- Moonshot / Kimi

The selected provider receives the prompt content and the API key required for that provider. No API key is sent to another provider.

## Data not collected

The extension does not:

- collect browsing history
- collect analytics or telemetry
- show ads
- sell or share data
- load remote scripts
- send prompt content before the user clicks the optimize button

## Website access

The content script runs on webpages so it can detect text input areas and display the optimize button. It reads only the input field that the user chooses to optimize.

Users can disable the floating button globally or hide it on the current website from the popup.

## Third-party services

API calls are made directly from the extension background service worker to the provider selected by the user. Each provider processes data according to its own terms and privacy policy.
