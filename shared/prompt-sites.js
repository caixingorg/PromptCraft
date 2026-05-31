(function () {
  "use strict";

  // AI 对话站点白名单 — 仅在此类站点上显示「优化提示词」按钮。
  // 匹配规则：当前页面 hostname 精确匹配或结尾匹配列表中的条目。
  globalThis.AIPO_PROMPT_SITES = [
    // ---- 北美 / 国际 ----
    "chatgpt.com",
    "chat.openai.com",
    "claude.ai",
    "gemini.google.com",
    "aistudio.google.com",
    "x.ai",
    "grok.com",
    "perplexity.ai",
    "poe.com",
    "copilot.microsoft.com",
    "huggingface.co",
    "meta.ai",
    "you.com",
    "pi.ai",
    "character.ai",
    "c.ai",
    "jasper.ai",
    "copy.ai",
    "writesonic.com",
    "phind.com",
    "chat.mistral.ai",
    "mistral.ai",
    "console.anthropic.com",
    "coral.cohere.com",
    "duck.ai",
    "playground.ai",
    "deepai.org",
    "monica.im",

    // ---- 中国 ----
    "chat.deepseek.com",
    "kimi.com",
    "tongyi.aliyun.com",
    "qianwen.aliyun.com",
    "doubao.com",
    "yiyan.baidu.com",
    "chatglm.cn",
    "xinghuo.xfyun.cn",
    "baichuan-ai.com",
    "hunyuan.tencent.com",
    "chat.360.cn",
    "chat.sensetime.com",
    "tiangong.cn",
    "metaso.cn"
  ];

  // 辅助：检查当前 hostname 是否命中白名单
  globalThis.AIPO_isPromptSite = function (hostname) {
    const normalized = String(hostname || "").trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    return globalThis.AIPO_PROMPT_SITES.some((site) => {
      return normalized === site || normalized.endsWith("." + site);
    });
  };
})();
