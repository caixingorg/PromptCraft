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

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

test("model field explicitly supports manual input", () => {
  assert.match(popupHtml, /Model \(manual input supported\)/);
  assert.match(popupHtml, /<input id="modelInput" list="modelPresetList"/);
  assert.match(popupHtml, /Model presets may change/);
  assert.match(popupJs, /getMessage\("modelHint"\)/);
});

test("shared messages and optimization goals are registered", () => {
  const sharedMessages = read("shared/messages.js");
  const sharedOptimizationGoals = read("shared/optimization-goals.js");

  assert.match(sharedMessages, /AIPO_setLocale/);
  assert.match(sharedMessages, /AIPO_getLocale/);
  assert.match(sharedMessages, /languageLabel/);
  assert.match(sharedMessages, /Optimize Prompt/);
  assert.match(sharedMessages, /Replace Original/);
  assert.match(sharedMessages, /Retry/);
  assert.match(sharedOptimizationGoals, /better-ask/);
  assert.match(sharedOptimizationGoals, /writing-polish/);
  assert.match(sharedOptimizationGoals, /work-plan/);
  assert.match(sharedOptimizationGoals, /research/);
  assert.match(sharedConfigUtils, /optimizationGoal/);
  assert.match(sharedConfigUtils, /language/);
});

test("built-in optimization templates target AI web chat prompts, not fiction writing", () => {
  const sharedOptimizationGoals = read("shared/optimization-goals.js");

  assert.match(sharedOptimizationGoals, /prompt optimizer/);
  assert.match(sharedOptimizationGoals, /Return only the rewritten prompt/);
  assert.match(sharedOptimizationGoals, /Do not add fiction, roleplay, or storytelling unless the user explicitly asks/);
  assert.doesNotMatch(sharedOptimizationGoals, /character arc|plot twist|worldbuilding|protagonist|chapter outline|narrative voice/i);
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
  assert.match(sharedProviderConfig, /label: "Qwen \(Tongyi\)"/);
  assert.match(sharedProviderConfig, /defaultModel: "gpt-5\.1-mini"/);
  assert.match(sharedProviderConfig, /defaultModel: "deepseek-v4-flash"/);
  assert.match(sharedProviderConfig, /defaultModel: "qwen3-next-80b-a3b-instruct"/);
  assert.match(readme, /Model IDs are subject to change by providers/);
  assert.match(readme, /manually enter a valid model ID/);
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
  assert.match(popupJs, /getMessage\("testing"\)/);
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
  assert.match(popupHtml, /messages\.js/);
  assert.match(popupHtml, /optimization-goals\.js/);
  assert.match(popupHtml, /config-utils\.js/);
});

test("popup exposes English optimization goal selector", () => {
  assert.match(popupHtml, /<html lang="en">/);
  assert.match(popupHtml, /id="optimizationGoalSelect"/);
  assert.match(popupHtml, /Optimize for/);
  assert.match(popupJs, /optimizationGoalSelect/);
  assert.match(popupJs, /AIPO_OPTIMIZATION_GOALS/);
  assert.match(popupJs, /AIPO_PROVIDER_REGISTRY/);
});

test("popup exposes persisted language toggle and applies localized labels", () => {
  assert.match(popupHtml, /id="languageToggleButton"/);
  assert.doesNotMatch(popupHtml, /id="languageSelect"/);
  assert.match(popupHtml, /class="header-actions"/);
  assert.match(popupJs, /languageToggleButton/);
  assert.match(popupJs, /globalThis\.AIPO_setLocale/);
  assert.match(popupJs, /applyLocalizedLabels/);
  assert.match(popupJs, /activeLanguage === "zh" \? "en" : "zh"/);
  assert.match(popupJs, /language: activeLanguage/);
  assert.match(popupJs, /notifyActiveTab/);
});

test("popup previews built-in goal templates and only lets custom template edit", () => {
  assert.match(popupHtml, /id="promptTemplateHint"/);
  assert.match(popupJs, /customPromptTemplateDraft/);
  assert.match(popupJs, /rememberCustomTemplateDraft/);
  assert.match(popupJs, /renderPromptTemplateField/);
  assert.match(popupJs, /getBuiltInGoalTemplate/);
  assert.match(popupJs, /promptTemplateInput\.readOnly = !isCustom/);
  assert.match(popupJs, /resetTemplateButton\.disabled = !isCustom/);
  assert.match(popupJs, /optimizationGoal === "custom"/);
});
