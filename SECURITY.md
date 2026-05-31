# Security Policy

## Reporting a vulnerability

Please report security issues privately to the maintainer before opening a public issue. If no private contact is available, open a GitHub issue with a minimal description and do not include secrets or exploitable payload details.

## API keys

Do not include API keys, bearer tokens, screenshots containing keys, or provider account details in GitHub issues, pull requests, logs, or screenshots.

不要在 issue、pull request、日志或截图中提交 API Key、Bearer Token 或 provider 账户信息。

The extension uses a bring-your-own-key model. API keys are saved in `chrome.storage.local` and are sent only to the selected provider endpoint when the user clicks the optimize button.

## Data handling

The extension does not use a backend service. It does not collect telemetry, does not load remote scripts, and does not send page content unless the user explicitly clicks the optimize button.

## Provider errors

Provider error messages may be shown to the user to help diagnose API key, quota, model, or network issues. The code must not log full API keys or include them in errors.

## Extension permissions

The extension should keep permissions minimal. New permissions must be justified in README and store submission notes before release.
