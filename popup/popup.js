"use strict";

const form = document.getElementById("settingsForm");
const providerSelect = document.getElementById("providerSelect");
const apiKeyLabel = document.getElementById("apiKeyLabel");
const apiKeyInput = document.getElementById("apiKeyInput");
const toggleApiKeyButton = document.getElementById("toggleApiKeyButton");
const apiKeyHint = document.getElementById("apiKeyHint");
const modelInput = document.getElementById("modelInput");
const modelPresetList = document.getElementById("modelPresetList");
const modelHint = document.getElementById("modelHint");
const promptTemplateInput = document.getElementById("promptTemplateInput");
const showFloatingButtonInput = document.getElementById("showFloatingButtonInput");
const currentSiteRow = document.getElementById("currentSiteRow");
const currentSiteHint = document.getElementById("currentSiteHint");
const disableCurrentSiteInput = document.getElementById("disableCurrentSiteInput");
const resetTemplateButton = document.getElementById("resetTemplateButton");
const testConnectionButton = document.getElementById("testConnectionButton");
const testConnectionStatus = document.getElementById("testConnectionStatus");
const statusText = document.getElementById("statusText");

let providerDrafts = globalThis.AIPO_createDefaultProvidersConfig();
let activeProviderId = "openai";
let disabledHostnames = [];
let currentPageHostname = "";

const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("is-active")) {
      return;
    }
    saveCurrentProviderDraft();
    tabButtons.forEach((btn) => btn.classList.remove("is-active"));
    tabPanels.forEach((panel) => panel.classList.remove("is-active"));
    button.classList.add("is-active");
    const panel = document.getElementById("panel-" + button.getAttribute("data-tab"));
    if (panel) {
      panel.classList.add("is-active");
    }
  });
});

document.addEventListener("DOMContentLoaded", restoreOptions);
providerSelect.addEventListener("change", handleProviderChange);
form.addEventListener("submit", saveOptions);
resetTemplateButton.addEventListener("click", () => {
  promptTemplateInput.value = globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
  showStatus("已恢复默认模板，点击保存后生效", "success");
});
toggleApiKeyButton.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleApiKeyButton.setAttribute("aria-label", isPassword ? "隐藏 API Key" : "显示 API Key");
  toggleApiKeyButton.setAttribute("title", isPassword ? "隐藏 API Key" : "显示 API Key");
  toggleApiKeyButton.textContent = isPassword ? "🙈" : "👁";
});
testConnectionButton.addEventListener("click", testConnection);

async function restoreOptions() {
  try {
    const config = globalThis.AIPO_normalizeConfig(await getLocalStorage(null));
    providerDrafts = globalThis.AIPO_cloneProviders(config.providers);
    activeProviderId = config.selectedProvider;
    providerSelect.value = activeProviderId;
    renderProviderFields(activeProviderId);
    promptTemplateInput.value = config ? config.promptTemplate : globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
    showFloatingButtonInput.checked = config.showFloatingButton !== false;
    disabledHostnames = config.disabledHostnames;
    await restoreActivePageInfo();
    renderCurrentSiteControl();
  } catch (error) {
    showStatus("读取配置失败", "error");
  }
}

function handleProviderChange() {
  saveCurrentProviderDraft();
  activeProviderId = globalThis.AIPO_PROVIDER_REGISTRY[providerSelect.value] ? providerSelect.value : "openai";
  renderProviderFields(activeProviderId);
}

async function saveOptions(event) {
  event.preventDefault();
  saveCurrentProviderDraft();

  const promptTemplate = promptTemplateInput.value.trim();
  if (!promptTemplate.includes("{原始提示词内容}")) {
    showStatus("模板必须包含变量：{原始提示词内容}", "error");
    return;
  }

  const config = {
    selectedProvider: activeProviderId,
    providers: globalThis.AIPO_cloneProviders(providerDrafts),
    disabledHostnames: globalThis.AIPO_normalizeHostnames(getUpdatedDisabledHostnames()),
    promptTemplate,
    showFloatingButton: showFloatingButtonInput.checked
  };

  try {
    await setLocalStorage(config);
    await notifyActiveTab();
    showStatus("配置已保存", "success");
  } catch (error) {
    showStatus("保存配置失败：" + (error.message || "请重试"), "error");
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
    currentSiteRow.title = "当前页面不支持站点级设置";
    disableCurrentSiteInput.disabled = true;
    disableCurrentSiteInput.checked = false;
    currentSiteHint.textContent = "当前网站隐藏";
    return;
  }

  currentSiteRow.classList.remove("is-disabled");
  currentSiteRow.removeAttribute("title");
  disableCurrentSiteInput.disabled = false;
  disableCurrentSiteInput.checked = disabledHostnames.includes(currentPageHostname);
  currentSiteHint.textContent = `当前网站：${currentPageHostname}`;
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
  apiKeyHint.textContent = `${provider.label} API Key 仅存储在本地浏览器中，只会用于调用 ${provider.label}。`;

  // Reset API key visibility when switching providers
  apiKeyInput.type = "password";
  toggleApiKeyButton.setAttribute("aria-label", "显示 API Key");
  toggleApiKeyButton.setAttribute("title", "显示 API Key");
  toggleApiKeyButton.textContent = "👁";

  modelPresetList.textContent = "";
  provider.models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    modelPresetList.appendChild(option);
  });

  modelInput.value = providerConfig.model || provider.defaultModel;
  modelHint.textContent = `默认模型：${provider.defaultModel}。预设模型可能随厂商更新，若调用失败请填写厂商后台当前模型 ID。${provider.modelNote || ""}`;
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
    showStatus("请先在插件设置中填写 API Key", "error");
    return;
  }

  const provider = globalThis.AIPO_PROVIDER_REGISTRY[activeProviderId];
  const model = modelInput.value.trim() || provider.defaultModel;

  testConnectionButton.textContent = "测试中...";
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
      testConnectionStatus.textContent = "连接正常 ✓";
      testConnectionStatus.className = "test-status is-success";
    } else {
      const errorMsg = (response && response.error) ? response.error : "连接失败";
      testConnectionStatus.textContent = errorMsg;
      testConnectionStatus.className = "test-status is-error";
    }
  } catch (error) {
    if (error.message === "timeout") {
      testConnectionStatus.textContent = "连接超时";
    } else if (error.message && error.message.includes("not found")) {
      testConnectionStatus.textContent = "扩展后台未响应，请刷新页面或重新加载扩展";
    } else {
      testConnectionStatus.textContent = "网络请求失败，请检查网络连接";
    }
    testConnectionStatus.className = "test-status is-error";
  }

  testConnectionButton.textContent = "测试连接";
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
