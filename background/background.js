"use strict";

if (typeof importScripts === "function" && !globalThis.AIPO_PROVIDER_REGISTRY) {
  importScripts("../shared/provider-config.js", "../shared/config-utils.js");
}

const AIPO_PROVIDER_REGISTRY = globalThis.AIPO_PROVIDER_REGISTRY;

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
      sendResponse({ ok: false, error: "请输入需要优化的 Prompt" });
      return true;
    }

    optimizePrompt(rawPrompt)
      .then((optimizedPrompt) => {
        sendResponse({ ok: true, optimizedPrompt });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || "优化失败，请稍后重试" });
      });

    return true;
  }

  if (message.type === "AIPO_TEST_CONNECTION") {
    testConnection(message.provider, message.apiKey, message.model)
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || "连接测试失败" });
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
    throw new Error("请输入需要优化的 Prompt");
  }

  const config = await readConfigSafely();
  const providerId = AIPO_PROVIDER_REGISTRY[config.selectedProvider] ? config.selectedProvider : "openai";
  const provider = AIPO_PROVIDER_REGISTRY[providerId];
  const providerConfig = config.providers[providerId] || {};
  const apiKey = String(providerConfig.apiKey || "").trim();

  if (!apiKey) {
    throw new Error(`请先在插件设置中填写 ${provider.label} API Key`);
  }

  const model = String(providerConfig.model || provider.defaultModel).trim();

  if (Array.isArray(provider.deprecatedModels) && provider.deprecatedModels.includes(model)) {
    throw new Error(`您使用的模型 ${model} 已被 ${provider.label} 弃用，请在插件设置中更换为当前有效模型。`);
  }

  const promptTemplate = String(config.promptTemplate || globalThis.AIPO_DEFAULT_CONFIG.promptTemplate);
  const requestPrompt = promptTemplate.split("{原始提示词内容}").join(sourcePrompt);

  if (provider.adapter === "anthropic-messages") {
    return callAnthropicMessagesProvider(provider, apiKey, model, requestPrompt);
  }

  return callOpenAICompatibleProvider(provider, apiKey, model, requestPrompt);
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
    throw new Error("网络请求失败，请检查网络连接");
  });

  const data = await parseJsonResponse(response, provider.label);

  if (!response.ok) {
    throw new Error(extractProviderError(data) || `${provider.label} 请求失败，HTTP ${response.status}`);
  }

  if (data && data.error) {
    throw new Error(extractProviderError(data) || `${provider.label} 返回错误`);
  }

  const optimizedPrompt = extractOpenAICompatibleText(data);

  if (!optimizedPrompt) {
    throw new Error(`${provider.label} 返回内容为空`);
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
    throw new Error("网络请求失败，请检查网络连接");
  });

  const data = await parseJsonResponse(response, provider.label);

  if (!response.ok) {
    throw new Error(extractProviderError(data) || `${provider.label} 请求失败，HTTP ${response.status}`);
  }

  if (data && data.error) {
    throw new Error(extractProviderError(data) || `${provider.label} 返回错误`);
  }

  const optimizedPrompt = extractAnthropicText(data);

  if (!optimizedPrompt) {
    throw new Error(`${provider.label} 返回内容为空`);
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
    throw new Error(`${providerLabel} 返回内容解析失败`);
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
    throw new Error("读取插件配置失败");
  }
}

async function testConnection(providerId, apiKey, model) {
  if (!providerId || !apiKey || !model) {
    throw new Error("缺少 Provider、API Key 或模型参数");
  }

  const provider = AIPO_PROVIDER_REGISTRY[providerId];
  if (!provider) {
    throw new Error(`未知的 Provider: ${providerId}`);
  }

  const testPrompt = "请回复 'OK'。";

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
