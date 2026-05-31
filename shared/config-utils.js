(function () {
  "use strict";

  // 配置归一化工具模块。
  // 依赖 shared/provider-config.js 先生效（提供 globalThis.AIPO_PROVIDER_REGISTRY）。
  const AIPO_PROVIDER_REGISTRY = globalThis.AIPO_PROVIDER_REGISTRY;

  globalThis.AIPO_DEFAULT_CONFIG = {
    selectedProvider: "openai",
    providers: createDefaultProvidersConfig(),
    disabledHostnames: [],
    showFloatingButton: true,
    promptTemplate:
      "你是专业的提示词工程师，擅长优化大模型提示词。请基于用户原始内容，按照以下规则优化：\n\n" +
      "1. 梳理语义，补全缺失的角色、场景、任务目标和关键要求；\n" +
      "2. 重组结构，明确身份、任务、输入背景、输出格式、限制条件和细节要求；\n" +
      "3. 优化表达，去除冗余口语，使语言精炼、逻辑清晰、可执行性强；\n" +
      "4. 保留用户原本的全部核心意图，不篡改、不扩写无关需求；\n" +
      "5. 如果原始提示词信息不足，只能基于已有信息合理补全，不要虚构关键事实；\n" +
      "6. 输出仅返回【优化后的完整提示词】，不要添加解释、开场白、总结或 Markdown 代码块。\n\n" +
      "用户原始提示词：\n" +
      "{原始提示词内容}"
  };

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
