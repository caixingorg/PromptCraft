# Contributing

Thanks for improving PromptCraft.

## Development

This project intentionally uses plain JavaScript, HTML, and CSS. Do not add React, Vue, jQuery, Tailwind, build tools, or third-party runtime dependencies unless the project direction changes.

Run verification before opening a pull request:

```bash
npm run verify
```

## Pull request checklist

- Keep the extension Manifest V3 compatible.
- Do not add remote scripts, `eval`, `new Function`, or dynamic code execution.
- Do not log API keys or prompt content.
- Keep permissions minimal and document new permissions.
- Update tests when changing provider config, popup settings, content-script matching, or API adapters.
- Update `PRIVACY.md` if data handling changes.

## Provider updates

Provider defaults and presets live in `shared/provider-config.js`. Presets are not intended to be a real-time model catalog. Users must still be able to manually enter a model ID.
