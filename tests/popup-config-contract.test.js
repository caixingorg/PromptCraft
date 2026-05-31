"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT_DIR = path.resolve(__dirname, "..");
const popupJs = fs.readFileSync(path.join(ROOT_DIR, "popup", "popup.js"), "utf8");
const popupHtml = fs.readFileSync(path.join(ROOT_DIR, "popup", "popup.html"), "utf8");
const backgroundJs = fs.readFileSync(path.join(ROOT_DIR, "background", "background.js"), "utf8");
const sharedProviderConfig = fs.readFileSync(path.join(ROOT_DIR, "shared", "provider-config.js"), "utf8");
const sharedConfigUtils = fs.readFileSync(path.join(ROOT_DIR, "shared", "config-utils.js"), "utf8");
const readme = fs.readFileSync(path.join(ROOT_DIR, "README.md"), "utf8");

test("model field explicitly supports manual input", () => {
  assert.match(popupHtml, /<span class="field-label">模型（可手动输入）<\/span>/);
  assert.match(popupHtml, /<input id="modelInput" list="modelPresetList"/);
  assert.match(popupHtml, /预设模型可能随厂商更新/);
  assert.match(popupJs, /若调用失败请填写厂商后台当前模型 ID/);
});

test("provider defaults and presets use updated editable model IDs", () => {
  [
    "gpt-5.1-mini",
    "gpt-5.1",
    "gpt-5.1-nano",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "gemini-2.5-flash-lite",
    "gemini-3-pro",
    "deepseek-v4-flash",
    "qwen3-next-80b-a3b-instruct",
    "qwen3-next-80b-a3b-thinking",
    "qwen3-235b-a22b-instruct-2507",
    "kimi-k2.6"
  ].forEach((modelId) => {
    assert.match(sharedProviderConfig, new RegExp(modelId.replace(/\./g, "\\.")));
  });

  assert.match(backgroundJs, /const AIPO_PROVIDER_REGISTRY = globalThis\.AIPO_PROVIDER_REGISTRY/);
  assert.match(popupJs, /globalThis\.AIPO_PROVIDER_REGISTRY/);
  assert.match(sharedProviderConfig, /defaultModel: "gpt-5\.1-mini"/);
  assert.match(sharedProviderConfig, /defaultModel: "deepseek-v4-flash"/);
  assert.match(sharedProviderConfig, /defaultModel: "qwen3-next-80b-a3b-instruct"/);
  assert.match(readme, /模型 ID 以厂商后台为准/);
  assert.match(readme, /手动填写有效模型 ID/);
});

test("popup exposes current-site disable control without reading tab URL", () => {
  assert.match(popupHtml, /id="disableCurrentSiteInput"/);
  assert.match(popupJs, /AIPO_GET_PAGE_INFO/);
  assert.match(popupJs, /globalThis\.AIPO_normalizeHostnames\(getUpdatedDisabledHostnames\(\)\)/);
  assert.match(popupJs, /globalThis\.AIPO_normalizeHostname/);
});

test("API Key field has show/hide toggle button", () => {
  assert.match(popupHtml, /id="toggleApiKeyButton"/);
  assert.match(popupJs, /password.*text|text.*password/);
});

test("test connection button exists and does not require page content script", () => {
  assert.match(popupHtml, /id="testConnectionButton"/);
  assert.match(popupJs, /AIPO_TEST_CONNECTION/);
  assert.match(popupJs, /测试中/);
});

test("current site disable control is disabled when hostname unavailable", () => {
  assert.match(popupJs, /classList\.add\("is-disabled"\)/);
  assert.match(popupHtml, /is-disabled/);
});

test("popup uses shared config-utils functions instead of local definitions", () => {
  assert.match(popupJs, /globalThis\.AIPO_normalizeConfig/);
  assert.doesNotMatch(popupJs, /function normalizeConfig\(config\)/);
});

test("popup.html loads shared config-utils.js", () => {
  assert.match(popupHtml, /config-utils\.js/);
});
