(function () {
  "use strict";

  // 配置归一化工具模块。
  // 依赖 shared/provider-config.js 先生效（提供 globalThis.AIPO_PROVIDER_REGISTRY）。
  const AIPO_PROVIDER_REGISTRY = globalThis.AIPO_PROVIDER_REGISTRY;

  globalThis.AIPO_DEFAULT_CONFIG = {
    selectedProvider: "openai",
    optimizationGoal: "better-ask",
    language: "en",
    providers: createDefaultProvidersConfig(),
    disabledHostnames: [],
    showFloatingButton: true,
    promptTemplate:
      "Rewrite the user's prompt so it becomes clearer, more specific, and easier for an AI assistant to answer well.\n\n" +
      "Rules:\n" +
      "1. Preserve the user's original intent.\n" +
      "2. Add useful context, structure, constraints, and output expectations when they are implied.\n" +
      "3. Do not invent critical facts.\n" +
      "4. Return only the improved prompt.\n\n" +
      "Original prompt:\n" +
      "{originalPrompt}"
  };

  function getOptimizationGoals() {
    return globalThis.AIPO_OPTIMIZATION_GOALS && typeof globalThis.AIPO_OPTIMIZATION_GOALS === "object"
      ? globalThis.AIPO_OPTIMIZATION_GOALS
      : {};
  }

  function hasSavedCustomTemplate(source) {
    return typeof source.promptTemplate === "string" &&
      source.promptTemplate.trim() &&
      source.promptTemplate !== globalThis.AIPO_DEFAULT_CONFIG.promptTemplate;
  }

  function normalizeOptimizationGoal(source) {
    const goals = getOptimizationGoals();
    if (source.optimizationGoal === "custom") {
      return "custom";
    }
    if (typeof source.optimizationGoal === "string" && goals[source.optimizationGoal]) {
      return source.optimizationGoal;
    }
    if (!source.optimizationGoal && hasSavedCustomTemplate(source)) {
      return "custom";
    }
    return "better-ask";
  }

  function normalizeLanguage(language) {
    return language === "zh" ? "zh" : "en";
  }

  function normalizeConfig(config) {
    const source = config && typeof config === "object" ? config : {};
    const providers = createDefaultProvidersConfig();
    const sourceProviders = source.providers && typeof source.providers === "object" ? source.providers : {};

    Object.keys(AIPO_PROVIDER_REGISTRY).forEach((providerId) => {
      const current = sourceProviders[providerId] || {};
      providers[providerId] = {
        apiKey: typeof current.apiKey === "string" ? current.apiKey : "",
        model: typeof current.model === "string" && current.model.trim()
          ? current.model.trim()
          : AIPO_PROVIDER_REGISTRY[providerId].defaultModel
      };
    });

    // 兼容旧版单 OpenAI 配置，升级时保留用户已保存的 Key 和模型。
    if (!source.providers && (source.apiKey || source.model)) {
      providers.openai.apiKey = typeof source.apiKey === "string" ? source.apiKey : "";
      providers.openai.model = typeof source.model === "string" && source.model.trim()
        ? source.model.trim()
        : AIPO_PROVIDER_REGISTRY.openai.defaultModel;
    }

    return {
      selectedProvider: AIPO_PROVIDER_REGISTRY[source.selectedProvider] ? source.selectedProvider : "openai",
      optimizationGoal: normalizeOptimizationGoal(source),
      language: normalizeLanguage(source.language),
      providers,
      disabledHostnames: normalizeHostnames(source.disabledHostnames),
      showFloatingButton: source.showFloatingButton !== false,
      promptTemplate: typeof source.promptTemplate === "string" && source.promptTemplate.trim()
        ? source.promptTemplate
        : globalThis.AIPO_DEFAULT_CONFIG.promptTemplate
    };
  }

  function normalizeHostnames(hostnames) {
    if (!Array.isArray(hostnames)) {
      return [];
    }

    return Array.from(
      new Set(
        hostnames
          .map((hostname) => String(hostname || "").trim().toLowerCase())
          .filter(Boolean)
      )
    ).sort();
  }

  function normalizeHostname(hostname) {
    return String(hostname || "").trim().toLowerCase();
  }

  function createDefaultProvidersConfig() {
    const providers = {};
    Object.keys(AIPO_PROVIDER_REGISTRY).forEach((providerId) => {
      providers[providerId] = {
        apiKey: "",
        model: AIPO_PROVIDER_REGISTRY[providerId].defaultModel
      };
    });
    return providers;
  }

  function cloneProviders(providers) {
    const cloned = {};
    Object.keys(AIPO_PROVIDER_REGISTRY).forEach((providerId) => {
      const provider = AIPO_PROVIDER_REGISTRY[providerId];
      const current = providers[providerId] || {};
      cloned[providerId] = {
        apiKey: typeof current.apiKey === "string" ? current.apiKey : "",
        model: typeof current.model === "string" && current.model.trim()
          ? current.model.trim()
          : provider.defaultModel
      };
    });
    return cloned;
  }

  globalThis.AIPO_normalizeConfig = normalizeConfig;
  globalThis.AIPO_normalizeHostnames = normalizeHostnames;
  globalThis.AIPO_normalizeHostname = normalizeHostname;
  globalThis.AIPO_createDefaultProvidersConfig = createDefaultProvidersConfig;
  globalThis.AIPO_cloneProviders = cloneProviders;
})();
