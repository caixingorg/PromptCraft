"use strict";

const form = document.getElementById("settingsForm");
const languageToggleButton = document.getElementById("languageToggleButton");
const optimizationGoalSelect = document.getElementById("optimizationGoalSelect");
const providerSelect = document.getElementById("providerSelect");
const apiKeyLabel = document.getElementById("apiKeyLabel");
const apiKeyInput = document.getElementById("apiKeyInput");
const toggleApiKeyButton = document.getElementById("toggleApiKeyButton");
const apiKeyHint = document.getElementById("apiKeyHint");
const modelInput = document.getElementById("modelInput");
const modelPresetList = document.getElementById("modelPresetList");
const modelHint = document.getElementById("modelHint");
const promptTemplateInput = document.getElementById("promptTemplateInput");
const promptTemplateHint = document.getElementById("promptTemplateHint");
const showFloatingButtonInput = document.getElementById("showFloatingButtonInput");
const currentSiteRow = document.getElementById("currentSiteRow");
const currentSiteHint = document.getElementById("currentSiteHint");
const disableCurrentSiteInput = document.getElementById("disableCurrentSiteInput");
const resetTemplateButton = document.getElementById("resetTemplateButton");
const testConnectionButton = document.getElementById("testConnectionButton");
const testConnectionStatus = document.getElementById("testConnectionStatus");
const statusText = document.getElementById("statusText");

let providerDrafts = globalThis.AIPO_createDefaultProvidersConfig();
let activeLanguage = "en";
let activeProviderId = "openai";
let activeOptimizationGoal = "better-ask";
let customPromptTemplateDraft = globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
let disabledHostnames = [];
let currentPageHostname = "";

function getMessage(key) {
  return typeof globalThis.AIPO_getMessage === "function" ? globalThis.AIPO_getMessage(key) : key;
}

function formatMessage(template, replacements) {
  return Object.keys(replacements).reduce((message, key) => {
    return message.split(`{${key}}`).join(String(replacements[key]));
  }, template);
}

const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("is-active")) {
      return;
    }
    saveCurrentProviderDraft();
    tabButtons.forEach((btn) => {
      btn.classList.remove("is-active");
    });
    tabPanels.forEach((panel) => {
      panel.classList.remove("is-active");
    });
    button.classList.add("is-active");
    const panel = document.getElementById("panel-" + button.getAttribute("data-tab"));
    if (panel) {
      panel.classList.add("is-active");
    }
  });
});

document.addEventListener("DOMContentLoaded", restoreOptions);
languageToggleButton.addEventListener("click", () => {
  activeLanguage = activeLanguage === "zh" ? "en" : "zh";
  globalThis.AIPO_setLocale(activeLanguage);
  applyLocalizedLabels();
});
optimizationGoalSelect.addEventListener("change", () => {
  rememberCustomTemplateDraft();
  activeOptimizationGoal = optimizationGoalSelect.value || "better-ask";
  renderPromptTemplateField();
});
providerSelect.addEventListener("change", handleProviderChange);
form.addEventListener("submit", saveOptions);
resetTemplateButton.addEventListener("click", () => {
  customPromptTemplateDraft = globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
  renderPromptTemplateField();
  showStatus(getMessage("templateReset"), "success");
});
toggleApiKeyButton.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleApiKeyButton.setAttribute("aria-label", isPassword ? getMessage("hideApiKey") : getMessage("showApiKey"));
  toggleApiKeyButton.setAttribute("title", isPassword ? getMessage("hideApiKey") : getMessage("showApiKey"));
  toggleApiKeyButton.textContent = isPassword ? "🙈" : "👁";
});
testConnectionButton.addEventListener("click", testConnection);

async function restoreOptions() {
  try {
    populateProviderSelect();
    populateOptimizationGoalSelect();
    const config = globalThis.AIPO_normalizeConfig(await getLocalStorage(null));
    activeLanguage = config.language;
    globalThis.AIPO_setLocale(activeLanguage);
    providerDrafts = globalThis.AIPO_cloneProviders(config.providers);
    activeProviderId = config.selectedProvider;
    activeOptimizationGoal = config.optimizationGoal;
    customPromptTemplateDraft = config.promptTemplate;
    applyLocalizedLabels();
    providerSelect.value = activeProviderId;
    optimizationGoalSelect.value = activeOptimizationGoal;
    renderProviderFields(activeProviderId);
    renderPromptTemplateField();
    showFloatingButtonInput.checked = config.showFloatingButton !== false;
    disabledHostnames = config.disabledHostnames;
    await restoreActivePageInfo();
    renderCurrentSiteControl();
  } catch (error) {
    showStatus(getMessage("readConfigFailed"), "error");
  }
}

function populateProviderSelect() {
  providerSelect.textContent = "";
  Object.keys(globalThis.AIPO_PROVIDER_REGISTRY).forEach((providerId) => {
    const provider = globalThis.AIPO_PROVIDER_REGISTRY[providerId];
    const option = document.createElement("option");
    option.value = providerId;
    option.textContent = provider.label;
    providerSelect.appendChild(option);
  });
}

function populateOptimizationGoalSelect() {
  optimizationGoalSelect.textContent = "";
  Object.keys(globalThis.AIPO_OPTIMIZATION_GOALS).forEach((goalId) => {
    const goal = globalThis.AIPO_OPTIMIZATION_GOALS[goalId];
    const option = document.createElement("option");
    option.value = goalId;
    option.textContent = getOptimizationGoalLabel(goalId, goal.label);
    optimizationGoalSelect.appendChild(option);
  });

  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = getMessage("customGoalLabel");
  optimizationGoalSelect.appendChild(customOption);
}

function getOptimizationGoalLabel(goalId, fallbackLabel) {
  const labelKeys = {
    "better-ask": "goalBetterAsk",
    "writing-polish": "goalWritingPolish",
    "work-plan": "goalWorkPlan",
    research: "goalResearch"
  };
  const key = labelKeys[goalId];
  return key ? getMessage(key) : fallbackLabel;
}

function applyLocalizedLabels() {
  languageToggleButton.textContent = activeLanguage === "zh" ? getMessage("englishOption") : getMessage("chineseOption");
  languageToggleButton.setAttribute("aria-label", getMessage("languageLabel"));
  document.querySelector('button[form="settingsForm"]').textContent = getMessage("saveConfig");
  document.querySelector('[data-tab="provider"]').textContent = getMessage("providerConfig");
  document.querySelector('[data-tab="template"]').textContent = getMessage("optimizeTemplate");
  document.querySelector('#panel-provider .field-label').textContent = getMessage("optimizeFor");
  document.querySelector('#panel-provider .field-hint').textContent = getMessage("customTemplateHint");
  document.querySelectorAll('#panel-provider .field-label')[1].textContent = getMessage("provider");
  document.querySelectorAll('#panel-provider .field-label')[2].textContent = `${globalThis.AIPO_PROVIDER_REGISTRY[activeProviderId].label} ${getMessage("apiKeyLabel")}`;
  document.querySelectorAll('#panel-provider .field-label')[3].textContent = getMessage("model");
  showFloatingButtonInput.closest("label").querySelector("span").textContent = getMessage("showFloatingButton");
  renderCurrentSiteControl();
  populateOptimizationGoalSelect();
  optimizationGoalSelect.value = activeOptimizationGoal;
  renderPromptTemplateField();
  renderProviderFields(activeProviderId);
  testConnectionButton.textContent = getMessage("testConnection");
  resetTemplateButton.textContent = getMessage("resetTemplate");
  promptTemplateInput.closest("label").querySelector(".field-label").textContent = getMessage("optimizeTemplate");
}

function handleProviderChange() {
  saveCurrentProviderDraft();
  activeProviderId = globalThis.AIPO_PROVIDER_REGISTRY[providerSelect.value] ? providerSelect.value : "openai";
  renderProviderFields(activeProviderId);
}

function rememberCustomTemplateDraft() {
  if (activeOptimizationGoal === "custom") {
    customPromptTemplateDraft = promptTemplateInput.value;
  }
}

function getBuiltInGoalTemplate(goalId) {
  const goals = globalThis.AIPO_OPTIMIZATION_GOALS || {};
  const goal = goals[goalId] || goals["better-ask"];
  return goal && goal.template ? goal.template : globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
}

function renderPromptTemplateField() {
  const optimizationGoal = activeOptimizationGoal || "better-ask";
  const isCustom = optimizationGoal === "custom";
  promptTemplateInput.value = isCustom ? customPromptTemplateDraft : getBuiltInGoalTemplate(optimizationGoal);
  promptTemplateInput.readOnly = !isCustom;
  resetTemplateButton.disabled = !isCustom;
  promptTemplateHint.textContent = isCustom ? getMessage("templateTokenHint") : getMessage("builtInTemplateHint");
}

async function saveOptions(event) {
  event.preventDefault();
  saveCurrentProviderDraft();
  rememberCustomTemplateDraft();

  const promptTemplate = customPromptTemplateDraft.trim();
  if (!promptTemplate.includes("{originalPrompt}") && !promptTemplate.includes("{原始提示词内容}")) {
    showStatus(getMessage("templateTokenError"), "error");
    return;
  }

  const config = {
    selectedProvider: activeProviderId,
    optimizationGoal: optimizationGoalSelect.value || "better-ask",
    language: activeLanguage,
    providers: globalThis.AIPO_cloneProviders(providerDrafts),
    disabledHostnames: globalThis.AIPO_normalizeHostnames(getUpdatedDisabledHostnames()),
    promptTemplate,
    showFloatingButton: showFloatingButtonInput.checked
  };

  try {
    await setLocalStorage(config);
    await notifyActiveTab();
    showStatus(getMessage("configSaved"), "success");
  } catch (error) {
    showStatus(error.message || getMessage("saveFailed"), "error");
  }
}

async function restoreActivePageInfo() {
  currentPageHostname = "";
  try {
    const tabs = await queryActiveTabs();
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) {
      return;
    }
    const pageInfo = await sendTabMessage(activeTab.id, { type: "AIPO_GET_PAGE_INFO" });
    currentPageHostname = globalThis.AIPO_normalizeHostname(pageInfo && pageInfo.hostname);
  } catch (error) {
    currentPageHostname = "";
  }
}

function renderCurrentSiteControl() {
  if (!currentPageHostname) {
    currentSiteRow.classList.add("is-disabled");
    currentSiteRow.title = getMessage("currentSiteUnavailable");
    disableCurrentSiteInput.disabled = true;
    disableCurrentSiteInput.checked = false;
    currentSiteHint.textContent = getMessage("hideOnCurrentSite");
    return;
  }

  currentSiteRow.classList.remove("is-disabled");
  currentSiteRow.removeAttribute("title");
  disableCurrentSiteInput.disabled = false;
  disableCurrentSiteInput.checked = disabledHostnames.includes(currentPageHostname);
  currentSiteHint.textContent = formatMessage(getMessage("currentSite"), { hostname: currentPageHostname });
}

function getUpdatedDisabledHostnames() {
  const hostnames = new Set(disabledHostnames.map(globalThis.AIPO_normalizeHostname).filter(Boolean));
  if (currentPageHostname) {
    if (disableCurrentSiteInput.checked) {
      hostnames.add(currentPageHostname);
    } else {
      hostnames.delete(currentPageHostname);
    }
  }
  disabledHostnames = Array.from(hostnames).sort();
  return disabledHostnames;
}

function renderProviderFields(providerId) {
  const provider = globalThis.AIPO_PROVIDER_REGISTRY[providerId];
  const providerConfig = providerDrafts[providerId] || {
    apiKey: "",
    model: provider.defaultModel
  };

  apiKeyLabel.textContent = `${provider.label} API Key`;
  apiKeyInput.placeholder = provider.keyPlaceholder;
  apiKeyInput.value = providerConfig.apiKey || "";
  apiKeyHint.textContent = `${provider.label} ${getMessage("apiKeyHint")}`;

  // Reset API key visibility when switching providers
  apiKeyInput.type = "password";
  toggleApiKeyButton.setAttribute("aria-label", getMessage("showApiKey"));
  toggleApiKeyButton.setAttribute("title", getMessage("showApiKey"));
  toggleApiKeyButton.textContent = "👁";

  modelPresetList.textContent = "";
  provider.models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    modelPresetList.appendChild(option);
  });

  modelInput.value = providerConfig.model || provider.defaultModel;
  modelHint.textContent = `Default model: ${provider.defaultModel}. ${getMessage("modelHint")}${provider.modelNote ? " " + provider.modelNote : ""}`;
}

function saveCurrentProviderDraft() {
  const provider = globalThis.AIPO_PROVIDER_REGISTRY[activeProviderId];
  if (!provider) {
    return;
  }

  providerDrafts[activeProviderId] = {
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim() || provider.defaultModel
  };
}

async function testConnection() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus(getMessage("configRequired"), "error");
    return;
  }

  const provider = globalThis.AIPO_PROVIDER_REGISTRY[activeProviderId];
  const model = modelInput.value.trim() || provider.defaultModel;

  testConnectionButton.textContent = getMessage("testing");
  testConnectionButton.disabled = true;
  testConnectionStatus.textContent = "";
  testConnectionStatus.className = "test-status";

  let timeoutId;
  try {
    const response = await new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error("timeout")), 15000);
      chrome.runtime.sendMessage({
        type: "AIPO_TEST_CONNECTION",
        provider: activeProviderId,
        apiKey,
        model
      }, (response) => {
        clearTimeout(timeoutId);
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(response);
      });
    });

    if (response && response.ok) {
      testConnectionStatus.textContent = getMessage("connectedOk");
      testConnectionStatus.className = "test-status is-success";
    } else {
      const errorMsg = (response && response.error) ? response.error : getMessage("connectionFailed");
      testConnectionStatus.textContent = errorMsg;
      testConnectionStatus.className = "test-status is-error";
    }
  } catch (error) {
    if (error.message === "timeout") {
      testConnectionStatus.textContent = getMessage("connectionTimeout");
    } else if (error.message && error.message.includes("not found")) {
      testConnectionStatus.textContent = getMessage("backgroundUnavailable");
    } else {
      testConnectionStatus.textContent = getMessage("networkError");
    }
    testConnectionStatus.className = "test-status is-error";
  }

  testConnectionButton.textContent = getMessage("testConnection");
  testConnectionButton.disabled = false;
}

async function notifyActiveTab() {
  const tabs = await queryActiveTabs();
  await Promise.all(
    tabs.map((tab) => {
      if (!tab.id) {
        return Promise.resolve();
      }
      return sendTabMessage(tab.id, { type: "AIPO_REFRESH_SETTINGS" }).catch(() => undefined);
    })
  );
}

function showStatus(message, type) {
  statusText.textContent = message;
  statusText.className = `status-text is-${type}`;
  window.setTimeout(() => {
    statusText.textContent = "";
    statusText.className = "status-text";
  }, 2600);
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

function queryActiveTabs() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(tabs || []);
    });
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(response);
    });
  });
}
