"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKGROUND_FILE = path.join(ROOT_DIR, "background", "background.js");
const SHARED_MESSAGES_FILE = path.join(ROOT_DIR, "shared", "messages.js");
const SHARED_GOALS_FILE = path.join(ROOT_DIR, "shared", "optimization-goals.js");
const SHARED_PROVIDER_FILE = path.join(ROOT_DIR, "shared", "provider-config.js");
const SHARED_UTILS_FILE = path.join(ROOT_DIR, "shared", "config-utils.js");

function loadBackgroundTestApi(config, fetchImpl) {
  const storageState = { ...config };
  const context = {
    console,
    fetch: fetchImpl,
    globalThis: {},
    chrome: {
      runtime: {
        lastError: null,
        onInstalled: { addListener() {} },
        onMessage: { addListener() {} }
      },
      storage: {
        local: {
          get(defaults, callback) {
            callback(storageState);
          },
          set(items, callback) {
            Object.assign(storageState, items);
            callback();
          }
        }
      }
    }
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(SHARED_MESSAGES_FILE, "utf8"), context, {
    filename: SHARED_MESSAGES_FILE
  });
  vm.runInContext(fs.readFileSync(SHARED_PROVIDER_FILE, "utf8"), context, {
    filename: SHARED_PROVIDER_FILE
  });
  vm.runInContext(fs.readFileSync(SHARED_GOALS_FILE, "utf8"), context, {
    filename: SHARED_GOALS_FILE
  });
  vm.runInContext(fs.readFileSync(SHARED_UTILS_FILE, "utf8"), context, {
    filename: SHARED_UTILS_FILE
  });
  vm.runInContext(fs.readFileSync(BACKGROUND_FILE, "utf8"), context, {
    filename: BACKGROUND_FILE
  });

  assert.ok(context.__AIPO_TEST__, "background should expose provider adapter test hooks");
  return context.__AIPO_TEST__;
}

test("OpenAI-compatible providers use provider endpoint, bearer key, model, and chat response parser", async () => {
  const calls = [];
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "deepseek",
      providers: {
        deepseek: {
          apiKey: "deepseek-key",
          model: "deepseek-v4-flash"
        }
      },
      promptTemplate: "优化：{原始提示词内容}",
      showFloatingButton: true
    },
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "优化后的内容" } }]
        })
      };
    }
  );

  const result = await api.optimizePrompt("原始内容");
  assert.equal(result, "优化后的内容");
  assert.equal(calls[0].url, "https://api.deepseek.com/chat/completions");
  assert.equal(calls[0].options.headers.Authorization, "Bearer deepseek-key");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "deepseek-v4-flash");
  assert.equal(body.messages[0].content, "优化：原始内容");
});

test("Anthropic provider uses Messages API headers and text block parser", async () => {
  const calls = [];
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "anthropic",
      providers: {
        anthropic: {
          apiKey: "anthropic-key",
          model: "claude-sonnet-4-20250514"
        }
      },
      promptTemplate: "优化：{原始提示词内容}",
      showFloatingButton: true
    },
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            { type: "text", text: "第一段" },
            { type: "text", text: "第二段" }
          ]
        })
      };
    }
  );

  const result = await api.optimizePrompt("原始内容");
  assert.equal(result, "第一段\n第二段");
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(calls[0].options.headers["x-api-key"], "anthropic-key");
  assert.equal(calls[0].options.headers["anthropic-version"], "2023-06-01");
  assert.equal(calls[0].options.headers["anthropic-dangerous-direct-browser-access"], "true");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "claude-sonnet-4-20250514");
  assert.equal(body.max_tokens, 2048);
  assert.equal(body.messages[0].content, "优化：原始内容");
});

test("missing provider key reports provider-specific settings message", async () => {
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "kimi",
      providers: {
        kimi: {
          apiKey: "",
          model: "kimi-k2.6"
        }
      },
      promptTemplate: "优化：{原始提示词内容}",
      showFloatingButton: true
    },
    async () => {
      throw new Error("fetch should not be called without an API key");
    }
  );

  await assert.rejects(api.optimizePrompt("原始内容"), /Please configure your Kimi API Key/);
});

test("configured Chinese language localizes background error messages", async () => {
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "kimi",
      language: "zh",
      providers: {
        kimi: {
          apiKey: "",
          model: "kimi-k2.6"
        }
      },
      promptTemplate: "Custom: {originalPrompt}",
      showFloatingButton: true
    },
    async () => {
      throw new Error("fetch should not be called without API key");
    }
  );

  await assert.rejects(api.optimizePrompt("原始内容"), /请先在插件设置中填写 Kimi API Key/);
});

test("selected optimization goal template is sent to provider", async () => {
  const calls = [];
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "openai",
      optimizationGoal: "work-plan",
      providers: {
        openai: {
          apiKey: "openai-key",
          model: "gpt-5.1-mini"
        }
      },
      promptTemplate: "Custom: {originalPrompt}",
      showFloatingButton: true
    },
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "work plan result" } }]
        })
      };
    }
  );

  await api.optimizePrompt("plan launch");
  const body = JSON.parse(calls[0].options.body);
  assert.match(body.messages[0].content, /prompt optimizer for task planning/);
  assert.match(body.messages[0].content, /focused, actionable work plan/);
  assert.match(body.messages[0].content, /Do not add fiction, roleplay, or storytelling/);
  assert.match(body.messages[0].content, /plan launch/);
});

test("legacy custom prompt template migrates to custom and replaces legacy token", async () => {
  const calls = [];
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "openai",
      providers: {
        openai: {
          apiKey: "openai-key",
          model: "gpt-5.1-mini"
        }
      },
      promptTemplate: "Legacy custom: {原始提示词内容}",
      showFloatingButton: true
    },
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "custom result" } }]
        })
      };
    }
  );

  assert.equal(api.normalizeConfig({ promptTemplate: "Legacy custom: {原始提示词内容}" }).optimizationGoal, "custom");
  await api.optimizePrompt("原始内容");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.messages[0].content, "Legacy custom: 原始内容");
});

test("OpenAI-compatible request includes provider temperature and max_tokens", async () => {
  const calls = [];
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "deepseek",
      providers: {
        deepseek: {
          apiKey: "deepseek-key",
          model: "deepseek-v4-flash"
        }
      },
      promptTemplate: "优化：{原始提示词内容}",
      showFloatingButton: true
    },
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "优化结果" } }]
        })
      };
    }
  );

  const result = await api.optimizePrompt("测试内容");
  assert.equal(result, "优化结果");

  const body = JSON.parse(calls[0].options.body);
  assert.ok(typeof body.temperature === "number", "request body must include temperature");
  assert.ok(typeof body.max_tokens === "number", "request body must include max_tokens");
});

test("deprecated model triggers clear error message", async () => {
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "deepseek",
      providers: {
        deepseek: {
          apiKey: "deepseek-key",
          model: "deepseek-chat"
        }
      },
      promptTemplate: "优化：{原始提示词内容}",
      showFloatingButton: true
    },
    async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "不应到达" } }]
      })
    })
  );

  await assert.rejects(
    api.optimizePrompt("测试内容"),
    /弃用|deprecated|DeepSeek/
  );
});

test("non-object message is rejected by background listener", () => {
  const backgroundSource = fs.readFileSync(BACKGROUND_FILE, "utf8");
  assert.match(backgroundSource, /typeof message !== "object"/);
});

test("missing or empty rawPrompt returns early without calling fetch", async () => {
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "openai",
      providers: {
        openai: {
          apiKey: "openai-key",
          model: "gpt-5.1-mini"
        }
      },
      promptTemplate: "优化：{原始提示词内容}",
      showFloatingButton: true
    },
    async () => {
      throw new Error("fetch should not be called for empty prompt");
    }
  );

  await assert.rejects(api.optimizePrompt(""), /Enter a prompt to optimize/);
});

test("Anthropic request includes provider temperature", async () => {
  const calls = [];
  const api = loadBackgroundTestApi(
    {
      selectedProvider: "anthropic",
      providers: {
        anthropic: {
          apiKey: "anthropic-key",
          model: "claude-sonnet-4-5"
        }
      },
      promptTemplate: "优化：{原始提示词内容}",
      showFloatingButton: true
    },
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ type: "text", text: "优化结果" }]
        })
      };
    }
  );

  const result = await api.optimizePrompt("原始内容");
  assert.equal(result, "优化结果");

  const body = JSON.parse(calls[0].options.body);
  assert.ok(typeof body.temperature === "number", "Anthropic request body must include temperature");
});
