(function () {
  "use strict";

  globalThis.AIPO_PROVIDER_REGISTRY = {
    openai: {
      label: "OpenAI",
      adapter: "openai-compatible",
      endpoint: "https://api.openai.com/v1/chat/completions",
      defaultModel: "gpt-5.1-mini",
      models: ["gpt-5.1-mini", "gpt-5.1", "gpt-5.1-nano", "gpt-4o-mini"],
      keyPlaceholder: "sk-...",
      temperature: 0.2,
      maxTokens: 4096,
      deprecatedModels: []
    },
    anthropic: {
      label: "Anthropic Claude",
      adapter: "anthropic-messages",
      endpoint: "https://api.anthropic.com/v1/messages",
      defaultModel: "claude-sonnet-4-5",
      models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-3-5-haiku-20241022"],
      keyPlaceholder: "sk-ant-...",
      temperature: 0.2,
      maxTokens: 2048,
      deprecatedModels: []
    },
    gemini: {
      label: "Google Gemini",
      adapter: "openai-compatible",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      defaultModel: "gemini-2.5-flash",
      models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite", "gemini-3-pro"],
      keyPlaceholder: "AIza...",
      temperature: 0.2,
      maxTokens: 4096,
      deprecatedModels: []
    },
    deepseek: {
      label: "DeepSeek",
      adapter: "openai-compatible",
      endpoint: "https://api.deepseek.com/chat/completions",
      defaultModel: "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"],
      modelNote: "deepseek-chat / deepseek-reasoner are compatibility presets and are marked for deprecation by the provider.",
      keyPlaceholder: "sk-...",
      temperature: 0.2,
      maxTokens: 4096,
      deprecatedModels: ["deepseek-chat", "deepseek-reasoner"]
    },
    qwen: {
      label: "Qwen (Tongyi)",
      adapter: "openai-compatible",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      defaultModel: "qwen3-next-80b-a3b-instruct",
      models: ["qwen3-next-80b-a3b-instruct", "qwen3-next-80b-a3b-thinking", "qwen3-235b-a22b-instruct-2507", "qwen-plus"],
      keyPlaceholder: "sk-...",
      temperature: 0.2,
      maxTokens: 4096,
      deprecatedModels: []
    },
    kimi: {
      label: "Kimi",
      adapter: "openai-compatible",
      endpoint: "https://api.moonshot.ai/v1/chat/completions",
      defaultModel: "kimi-k2.6",
      models: ["kimi-k2.6", "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
      keyPlaceholder: "sk-...",
      temperature: 0.2,
      maxTokens: 4096,
      deprecatedModels: []
    }
  };
})();
