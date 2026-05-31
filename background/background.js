"use strict";

if (typeof importScripts === "function" && !globalThis.AIPO_PROVIDER_REGISTRY) {
  importScripts("../shared/messages.js", "../shared/provider-config.js", "../shared/optimization-goals.js", "../shared/config-utils.js");
}

const AIPO_PROVIDER_REGISTRY = globalThis.AIPO_PROVIDER_REGISTRY;

function getMessage(key) {
  return typeof globalThis.AIPO_getMessage === "function" ? globalThis.AIPO_getMessage(key) : key;
}

function formatMessage(template, replacements) {
  return Object.keys(replacements).reduce((message, key) => {
    return message.split(`{${key}}`).join(String(replacements[key]));
  }, template);
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaultConfig();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return false;
  }

  if (message.type === "AIPO_OPTIMIZE_PROMPT") {
    const rawPrompt = String(message.rawPrompt || "").trim();
    if (!rawPrompt) {
      sendResponse({ ok: false, error: getMessage("bgEmptyPrompt") });
      return true;
    }

    optimizePrompt(rawPrompt)
      .then((optimizedPrompt) => {
        sendResponse({ ok: true, optimizedPrompt });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || getMessage("optimizeFailed") });
      });

    return true;
  }

  if (message.type === "AIPO_TEST_CONNECTION") {
    testConnection(message.provider, message.apiKey, message.model)
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || getMessage("connectionFailed") });
      });

    return true;
  }

  return false;
});

async function ensureDefaultConfig() {
  const currentConfig = await getLocalStorage(null);
  const normalizedConfig = globalThis.AIPO_normalizeConfig(currentConfig);
  await setLocalStorage(normalizedConfig);
}

async function optimizePrompt(rawPrompt) {
  const sourcePrompt = String(rawPrompt || "").trim();

  if (!sourcePrompt) {
    throw new Error(getMessage("bgEmptyPrompt"));
  }

  const config = await readConfigSafely();
  globalThis.AIPO_setLocale(config.language);
  const providerId = AIPO_PROVIDER_REGISTRY[config.selectedProvider] ? config.selectedProvider : "openai";
  const provider = AIPO_PROVIDER_REGISTRY[providerId];
  const providerConfig = config.providers[providerId] || {};
  const apiKey = String(providerConfig.apiKey || "").trim();

  if (!apiKey) {
    throw new Error(formatMessage(getMessage("bgMissingKey"), { provider: provider.label }));
  }

  const model = String(providerConfig.model || provider.defaultModel).trim();

  if (Array.isArray(provider.deprecatedModels) && provider.deprecatedModels.includes(model)) {
    throw new Error(formatMessage(getMessage("bgDeprecatedModel"), { model, provider: provider.label }));
  }

  const promptTemplate = resolvePromptTemplate(config);
  const requestPrompt = applyPromptTemplate(promptTemplate, sourcePrompt);

  if (provider.adapter === "anthropic-messages") {
    return callAnthropicMessagesProvider(provider, apiKey, model, requestPrompt);
  }

  return callOpenAICompatibleProvider(provider, apiKey, model, requestPrompt);
}

function resolvePromptTemplate(config) {
  if (config.optimizationGoal === "custom") {
    return String(config.promptTemplate || globalThis.AIPO_DEFAULT_CONFIG.promptTemplate);
  }

  const goals = globalThis.AIPO_OPTIMIZATION_GOALS || {};
  const goal = goals[config.optimizationGoal] || goals["better-ask"];
  return goal && goal.template ? goal.template : globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
}

function applyPromptTemplate(template, sourcePrompt) {
  return String(template)
    .split("{originalPrompt}").join(sourcePrompt)
    .split("{原始提示词内容}").join(sourcePrompt);
}

async function callOpenAICompatibleProvider(provider, apiKey, model, requestPrompt) {
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: requestPrompt
        }
      ],
      temperature: provider.temperature !== undefined ? provider.temperature : 0.2,
      max_tokens: provider.maxTokens || 4096
    })
  }).catch(() => {
    throw new Error(getMessage("bgNetworkError"));
  });

  const data = await parseJsonResponse(response, provider.label);

  if (!response.ok) {
    throw new Error(extractProviderError(data) || formatMessage(getMessage("bgRequestFailed"), { provider: provider.label, status: response.status }));
  }

  if (data && data.error) {
    throw new Error(extractProviderError(data) || formatMessage(getMessage("bgReturnedError"), { provider: provider.label }));
  }

  const optimizedPrompt = extractOpenAICompatibleText(data);

  if (!optimizedPrompt) {
    throw new Error(formatMessage(getMessage("bgEmptyResponse"), { provider: provider.label }));
  }

  return optimizedPrompt;
}

async function callAnthropicMessagesProvider(provider, apiKey, model, requestPrompt) {
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Anthropic requires this header for direct browser-extension BYOK calls.
      // The key is still sent only to Anthropic's own API endpoint.
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: provider.maxTokens || 2048,
      temperature: provider.temperature !== undefined ? provider.temperature : 0.2,
      messages: [
        {
          role: "user",
          content: requestPrompt
        }
      ]
    })
  }).catch(() => {
    throw new Error(getMessage("bgNetworkError"));
  });

  const data = await parseJsonResponse(response, provider.label);

  if (!response.ok) {
    throw new Error(extractProviderError(data) || formatMessage(getMessage("bgRequestFailed"), { provider: provider.label, status: response.status }));
  }

  if (data && data.error) {
    throw new Error(extractProviderError(data) || formatMessage(getMessage("bgReturnedError"), { provider: provider.label }));
  }

  const optimizedPrompt = extractAnthropicText(data);

  if (!optimizedPrompt) {
    throw new Error(formatMessage(getMessage("bgEmptyResponse"), { provider: provider.label }));
  }

  return optimizedPrompt;
}

function extractOpenAICompatibleText(data) {
  return (
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message.content === "string"
      ? data.choices[0].message.content.trim()
      : ""
  );
}

function extractAnthropicText(data) {
  if (!data || !Array.isArray(data.content)) {
    return "";
  }

  return data.content
    .filter((item) => item && item.type === "text" && typeof item.text === "string")
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function parseJsonResponse(response, providerLabel) {
  try {
    return await response.json();
  } catch (error) {
    throw new Error(formatMessage(getMessage("bgParseError"), { provider: providerLabel }));
  }
}

function extractProviderError(data) {
  if (!data || !data.error) {
    return "";
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  if (typeof data.error.message === "string") {
    return data.error.message;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return "";
}

async function readConfigSafely() {
  try {
    const config = await getLocalStorage(null);
    return globalThis.AIPO_normalizeConfig(config);
  } catch (error) {
    throw new Error(getMessage("bgReadConfigFailed"));
  }
}

async function testConnection(providerId, apiKey, model) {
  const config = await readConfigSafely().catch(() => globalThis.AIPO_DEFAULT_CONFIG);
  globalThis.AIPO_setLocale(config.language);

  if (!providerId || !apiKey || !model) {
    throw new Error(getMessage("bgMissingConnectionParams"));
  }

  const provider = AIPO_PROVIDER_REGISTRY[providerId];
  if (!provider) {
    throw new Error(formatMessage(getMessage("bgUnknownProvider"), { provider: providerId }));
  }

  const testPrompt = getMessage("testPrompt");

  if (provider.adapter === "anthropic-messages") {
    return callAnthropicMessagesProvider(provider, apiKey, model, testPrompt);
  }

  return callOpenAICompatibleProvider(provider, apiKey, model, testPrompt);
}

function getLocalStorage(defaults) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(defaults, (items) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(items);
    });
  });
}

function setLocalStorage(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

// 隐私说明：background 仅在用户点击优化按钮后，将当前输入框文本发送给所选模型 Provider；
// API Key 只从 chrome.storage.local 读取，不写入日志，也不会发送到所选模型 provider 以外的服务。
if (!chrome.runtime.id) {
  globalThis.__AIPO_TEST__ = {
    optimizePrompt,
    normalizeConfig: globalThis.AIPO_normalizeConfig,
    AIPO_PROVIDER_REGISTRY
  };
}
