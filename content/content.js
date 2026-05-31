(function () {
  "use strict";

  const AIPO_DEFAULT_CONFIG = {
    showFloatingButton: true,
    disabledHostnames: []
  };

  const AIPO_BUTTON_CLASS = "aipo-prompt-button";
  const AIPO_LOADING_CLASS = "aipo-prompt-button-loading";
  const AIPO_HIDDEN_CLASS = "aipo-prompt-button-hidden";
  const AIPO_BOUND_ATTRIBUTE = "data-aipo-bound";
  const AIPO_SCAN_DEBOUNCE_MS = 180;
  const AIPO_STYLE_ID = "aipo-runtime-styles-v2";
  const AIPO_BUTTON_LABEL = "✨ 优化提示词";
  const AIPO_BUTTON_LOADING_LABEL = "优化中...";

  const boundInputs = new Map();
  let showFloatingButton = true;
  let scanTimer = 0;
  let toastTimer = 0;
  let resizeObserver = null;
  let disabledHostnames = [];

  injectRuntimeStyles();

  loadContentSettings().then(() => {
    setupInputDiscovery();
    scanEditableElements(document);
    updateAllButtonPositions();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || (!changes.showFloatingButton && !changes.disabledHostnames)) {
      return;
    }

    loadContentSettings().then(() => {
      if (isButtonEnabledOnCurrentPage()) {
        scanEditableElements(document);
        updateAllButtonPositions();
      } else {
        removeAllButtons();
      }
    });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === "AIPO_GET_PAGE_INFO") {
      sendResponse({ hostname: window.location.hostname });
      return false;
    }

    if (message && message.type === "AIPO_REFRESH_SETTINGS") {
      loadContentSettings().then(() => {
        if (isButtonEnabledOnCurrentPage()) {
          scanEditableElements(document);
          updateAllButtonPositions();
        } else {
          removeAllButtons();
        }
      });
    }

    return false;
  });

  async function loadContentSettings() {
    const config = await getLocalStorage(AIPO_DEFAULT_CONFIG).catch(() => AIPO_DEFAULT_CONFIG);
    showFloatingButton = config.showFloatingButton !== false;
    disabledHostnames = normalizeHostnames(config.disabledHostnames);
  }

  function isButtonEnabledOnCurrentPage() {
    const hostname = normalizeHostname(window.location.hostname);
    return showFloatingButton && !disabledHostnames.includes(hostname) && isPromptSite(hostname);
  }

  function isPromptSite(hostname) {
    return typeof globalThis.AIPO_isPromptSite === "function"
      ? globalThis.AIPO_isPromptSite(hostname)
      : false;
  }

  function normalizeHostnames(hostnames) {
    if (!Array.isArray(hostnames)) {
      return [];
    }

    return Array.from(new Set(hostnames.map(normalizeHostname).filter(Boolean)));
  }

  function normalizeHostname(hostname) {
    return String(hostname || "").trim().toLowerCase();
  }

  function setupInputDiscovery() {
    document.addEventListener("focusin", (event) => {
      const target = event.target;
      if (target instanceof Element) {
        bindEditableElement(target);
        updateAllButtonPositions();
      }
    });

    window.addEventListener("scroll", handleScrollForPosition, true);
    window.addEventListener("resize", schedulePositionUpdate);

    resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(schedulePositionUpdate) : null;

    const mutationObserver = new MutationObserver((mutations) => {
      let shouldScan = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldScan = true;
        }
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          bindEditableElement(mutation.target);
          shouldScan = true;
        }
      });

      if (shouldScan) {
        scheduleScan();
      }
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["contenteditable", "role", "type", "disabled", "readonly", "style", "class"]
    });
  }

  function scheduleScan() {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => {
      scanEditableElements(document);
      cleanupDetachedInputs();
      updateAllButtonPositions();
    }, AIPO_SCAN_DEBOUNCE_MS);
  }

  function schedulePositionUpdate() {
    window.requestAnimationFrame(updateAllButtonPositions);
  }

  function handleScrollForPosition(event) {
    if (isInternalEditableScroll(event.target)) {
      return;
    }
    schedulePositionUpdate();
  }

  function isInternalEditableScroll(scrollTarget) {
    if (!(scrollTarget instanceof Element)) {
      return false;
    }

    const targetElement = scrollTarget;
    for (const editableElement of boundInputs.keys()) {
      if (isRelatedEditableScrollTarget(editableElement, targetElement)) {
        return true;
      }
    }

    return false;
  }

  function isRelatedEditableScrollTarget(editableElement, targetElement) {
    return editableElement === targetElement || editableElement.contains(targetElement) || targetElement.contains(editableElement);
  }

  function scanEditableElements(root) {
    if (!isButtonEnabledOnCurrentPage() || !root.querySelectorAll) {
      return;
    }

    const candidates = root.querySelectorAll(
      'textarea, input, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]'
    );

    candidates.forEach(bindEditableElement);
  }

  function bindEditableElement(element) {
    if (!isButtonEnabledOnCurrentPage() || !(element instanceof Element)) {
      return;
    }

    const editableElement = findSupportedEditableElement(element);
    if (!editableElement || boundInputs.has(editableElement)) {
      return;
    }

    if (!isVisibleEditableElement(editableElement)) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = AIPO_BUTTON_CLASS;
    button.textContent = AIPO_BUTTON_LABEL;
    button.title = "优化 Prompt";
    button.setAttribute("aria-label", "优化 Prompt");

    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleOptimizeClick(editableElement, button);
    });

    document.body.appendChild(button);
    editableElement.setAttribute(AIPO_BOUND_ATTRIBUTE, "true");
    boundInputs.set(editableElement, { button, loading: false });

    if (resizeObserver) {
      resizeObserver.observe(editableElement);
    }

    updateButtonPosition(editableElement, button);
  }

  function findSupportedEditableElement(element) {
    if (isSupportedEditableElement(element)) {
      return element;
    }

    const closestEditable = element.closest(
      'textarea, input, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]'
    );

    return isSupportedEditableElement(closestEditable) ? closestEditable : null;
  }

  function isSupportedEditableElement(element) {
    if (!(element instanceof Element)) {
      return false;
    }

    if (element instanceof HTMLTextAreaElement) {
      return !element.disabled && !element.readOnly;
    }

    if (element instanceof HTMLInputElement) {
      const type = (element.getAttribute("type") || "text").toLowerCase();
      const allowedTypes = new Set(["", "text", "search", "url", "email"]);
      return allowedTypes.has(type) && !element.disabled && !element.readOnly;
    }

    const ariaDisabled = element.getAttribute("aria-disabled") === "true";
    const ariaReadonly = element.getAttribute("aria-readonly") === "true";
    const role = (element.getAttribute("role") || "").toLowerCase();
    const contenteditable = (element.getAttribute("contenteditable") || "").toLowerCase();
    const editable = element.isContentEditable || contenteditable === "plaintext-only";
    const labelText = [
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("data-placeholder"),
      element.getAttribute("name"),
      element.getAttribute("id"),
      (() => {
        const describedBy = element.getAttribute("aria-describedby");
        if (describedBy) {
          const describedEl = document.getElementById(describedBy);
          return describedEl ? (describedEl.textContent || "") : "";
        }
        return "";
      })(),
      element.innerText || element.textContent || ""
    ].join(" ");
    const promptLikeInput = /(prompt|message|chat|ask|输入|提问|问题|尽管问|发消息)/i.test(labelText);
    const conservativeEditable = role === "textbox" ||
      contenteditable === "plaintext-only" ||
      (element.getAttribute("aria-multiline") === "true" && promptLikeInput);

    return !ariaDisabled && !ariaReadonly && editable && conservativeEditable;
  }

  function isVisibleEditableElement(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width >= 24 &&
      rect.height >= 18 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  }

  async function handleOptimizeClick(editableElement, button) {
    const entry = boundInputs.get(editableElement);
    if (entry && entry.loading) {
      return;
    }

    const rawPrompt = readEditableValue(editableElement).trim();

    if (!rawPrompt) {
      showToast("请输入需要优化的 Prompt");
      return;
    }

    if (entry) {
      entry.loading = true;
    }
    setButtonLoading(button, true);

    try {
      const response = await sendRuntimeMessage({
        type: "AIPO_OPTIMIZE_PROMPT",
        rawPrompt
      });

      if (!response || !response.ok) {
        const errorMsg = (response && response.error) || "优化失败，请稍后重试";
        throw new Error(errorMsg);
      }

      writeEditableValue(editableElement, response.optimizedPrompt);
      showToast("Prompt 已优化并回填");
    } catch (error) {
      const msg = error.message || "";
      if (/API[ _]Key|apiKey/i.test(msg)) {
        showToast("请先在插件设置中填写 API Key");
      } else if (/弃用|deprecated/i.test(msg)) {
        showToast(msg);
      } else if (/Could not establish connection|Extension context invalidated|receiving end|The message port closed/i.test(msg)) {
        showToast("扩展后台未响应，请刷新页面或重新加载扩展");
      } else if (/fetch|网络|Network/i.test(msg)) {
        showToast("网络请求失败，请检查网络连接");
      } else {
        showToast(msg || "优化失败，请稍后重试");
      }
    } finally {
      if (entry) {
        entry.loading = false;
      }
      setButtonLoading(button, false);
      updateAllButtonPositions();
    }
  }

  function readEditableValue(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return element.value || "";
    }

    return element.innerText || element.textContent || "";
  }

  function writeEditableValue(element, value) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;
      valueSetter.call(element, value);
      dispatchEditableEvents(element, value);
      return;
    }

    writeContentEditableValue(element, value);
  }

  function writeContentEditableValue(element, value) {
    element.focus();

    let insertedByCommand = false;
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      insertedByCommand = document.execCommand("insertText", false, value);
      selection.removeAllRanges();
    } catch (error) {
      insertedByCommand = false;
    }

    if (!insertedByCommand || normalizeWhitespace(element.innerText || element.textContent) !== normalizeWhitespace(value)) {
      element.textContent = value;
    }

    dispatchEditableEvents(element, value);
  }

  function dispatchEditableEvents(element, value) {
    try {
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: value
        })
      );
    } catch (error) {
      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }

    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function updateAllButtonPositions() {
    boundInputs.forEach(({ button }, editableElement) => {
      if (!document.documentElement.contains(editableElement) || !isButtonEnabledOnCurrentPage()) {
        removeButton(editableElement, button);
        return;
      }

      updateButtonPosition(editableElement, button);
    });
  }

  function updateButtonPosition(editableElement, button) {
    if (!isVisibleEditableElement(editableElement)) {
      button.classList.add(AIPO_HIDDEN_CLASS);
      return;
    }

    button.classList.remove(AIPO_HIDDEN_CLASS);

    const anchorRect = getPositionAnchorRect(editableElement);
    const placeInsideTopRight = shouldPlaceButtonInsideAnchor(editableElement);
    const buttonWidth = button.offsetWidth || 112;
    const buttonHeight = button.offsetHeight || 28;
    const gap = 8;
    const viewportPadding = 8;
    const rightInset = placeInsideTopRight ? 16 : 24;

    const preferredTop = placeInsideTopRight ? anchorRect.top + 10 : anchorRect.top - buttonHeight - gap;
    const fallbackTop = anchorRect.bottom + gap;
    const unclampedLeft = anchorRect.right - buttonWidth - rightInset;
    const top = preferredTop >= viewportPadding ? preferredTop : fallbackTop;
    const left = clamp(unclampedLeft, viewportPadding, window.innerWidth - buttonWidth - viewportPadding);

    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(clamp(top, viewportPadding, window.innerHeight - buttonHeight - viewportPadding))}px`;
  }

  function getPositionAnchorRect(editableElement) {
    const visibleEditableRect = getVisibleElementRect(editableElement);
    const kimiSite = isKimiSite();
    let bestRect = visibleEditableRect;
    let currentElement = editableElement.parentElement;

    for (let depth = 0; currentElement && depth < 5; depth += 1) {
      const candidateRect = intersectRects(currentElement.getBoundingClientRect(), getViewportRect());

      if (isUsefulAnchorRect(candidateRect, visibleEditableRect, kimiSite)) {
        bestRect = candidateRect;
        break;
      }

      currentElement = currentElement.parentElement;
    }

    return bestRect;
  }

  function isKimiSite() {
    return window.location.hostname === "kimi.com" || window.location.hostname.endsWith(".kimi.com");
  }

  function shouldPlaceButtonInsideAnchor(editableElement) {
    return isKimiSite() && isVisibleEditableElement(editableElement);
  }

  function getVisibleElementRect(element) {
    let visibleRect = intersectRects(element.getBoundingClientRect(), getViewportRect());
    let currentElement = element.parentElement;

    while (currentElement && currentElement !== document.documentElement) {
      if (clipsOverflow(currentElement)) {
        visibleRect = intersectRects(visibleRect, currentElement.getBoundingClientRect());
      }
      currentElement = currentElement.parentElement;
    }

    return visibleRect;
  }

  function clipsOverflow(element) {
    const style = window.getComputedStyle(element);
    const overflowValue = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
    return /\b(auto|scroll|hidden|clip|overlay)\b/.test(overflowValue);
  }

  function intersectRects(firstRect, secondRect) {
    const left = Math.max(firstRect.left, secondRect.left);
    const top = Math.max(firstRect.top, secondRect.top);
    const right = Math.min(firstRect.right, secondRect.right);
    const bottom = Math.min(firstRect.bottom, secondRect.bottom);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height
    };
  }

  function getViewportRect() {
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  function isUsefulAnchorRect(candidateRect, editableRect, useStrictHorizontalAnchor) {
    const verticalPaddingTop = editableRect.top - candidateRect.top;
    const horizontalExpansion = candidateRect.width - editableRect.width;
    const leftExpansion = editableRect.left - candidateRect.left;
    const rightExpansion = candidateRect.right - editableRect.right;
    const containsEditable =
      candidateRect.left <= editableRect.left + 2 &&
      candidateRect.right >= editableRect.right - 2 &&
      candidateRect.top <= editableRect.top + 2 &&
      candidateRect.bottom >= editableRect.bottom - 2;
    const isWiderContainer = candidateRect.width >= editableRect.width + 96 || candidateRect.width >= editableRect.width * 1.35;
    const isSameWidthInputSurface = candidateRect.width >= editableRect.width - 8 &&
      candidateRect.height >= editableRect.height + 48 &&
      horizontalExpansion <= Math.max(120, editableRect.width * 0.2) &&
      verticalPaddingTop >= -2 &&
      verticalPaddingTop <= 40;
    const matchesInputSurfaceShape = isWiderContainer || isSameWidthInputSurface;
    const isNearEditableWidth = horizontalExpansion <= Math.max(360, editableRect.width * 0.75);
    const maxHorizontalPadding = Math.max(260, editableRect.width * 0.65);
    const hasReasonableHorizontalPadding = leftExpansion >= -2 && rightExpansion >= -2 &&
      leftExpansion <= maxHorizontalPadding && rightExpansion <= maxHorizontalPadding;
    const strictHorizontalLimit = Math.max(220, editableRect.width * 0.45);
    const passesStrictHorizontalAnchor = !useStrictHorizontalAnchor ||
      (leftExpansion <= strictHorizontalLimit && rightExpansion <= strictHorizontalLimit);
    const hasTightTopPadding = verticalPaddingTop >= -2 && verticalPaddingTop <= 96;
    const hasReasonableHeight = candidateRect.height >= editableRect.height && candidateRect.height <= Math.max(260, editableRect.height + 140);
    const isNotViewportShell = candidateRect.width <= window.innerWidth - 16;

    return containsEditable &&
      matchesInputSurfaceShape &&
      isNearEditableWidth &&
      hasReasonableHorizontalPadding &&
      passesStrictHorizontalAnchor &&
      hasTightTopPadding &&
      hasReasonableHeight &&
      isNotViewportShell;
  }

  function clamp(value, min, max) {
    if (max < min) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  function cleanupDetachedInputs() {
    boundInputs.forEach((entry, editableElement) => {
      if (!document.documentElement.contains(editableElement)) {
        removeButton(editableElement, entry.button);
      }
    });
  }

  function removeAllButtons() {
    boundInputs.forEach((entry, editableElement) => {
      removeButton(editableElement, entry.button);
    });
  }

  function removeButton(editableElement, button) {
    if (resizeObserver) {
      resizeObserver.unobserve(editableElement);
    }
    editableElement.removeAttribute(AIPO_BOUND_ATTRIBUTE);
    button.remove();
    boundInputs.delete(editableElement);
  }

  function setButtonLoading(button, loading) {
    button.classList.toggle(AIPO_LOADING_CLASS, loading);
    button.textContent = loading ? AIPO_BUTTON_LOADING_LABEL : AIPO_BUTTON_LABEL;
  }

  function injectRuntimeStyles() {
    const previousStyle = document.getElementById(AIPO_STYLE_ID);
    if (previousStyle) {
      previousStyle.remove();
    }

    const style = document.createElement("style");
    style.id = AIPO_STYLE_ID;
    style.textContent = `
      .aipo-prompt-button {
        position: fixed !important;
        z-index: 2147483646 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        box-sizing: border-box !important;
        min-width: 104px !important;
        height: 28px !important;
        padding: 0 12px !important;
        border: 1px solid rgba(95, 99, 104, 0.2) !important;
        border-radius: 999px !important;
        background: rgba(255, 255, 255, 0.72) !important;
        color: #202124 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        font-size: 12px !important;
        font-weight: 650 !important;
        line-height: 1 !important;
        text-align: center !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        user-select: none !important;
        transition:
          transform 0.14s ease,
          background-color 0.14s ease,
          box-shadow 0.14s ease,
          opacity 0.14s ease !important;
      }

      .aipo-prompt-button:hover {
        border-color: rgba(37, 99, 235, 0.38) !important;
        background: rgba(244, 248, 255, 0.94) !important;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.14) !important;
        transform: translateY(-1px) !important;
      }

      .aipo-prompt-button:active {
        transform: translateY(0) !important;
      }

      .aipo-prompt-button.aipo-prompt-button-loading {
        opacity: 0.72 !important;
        cursor: wait !important;
        pointer-events: none !important;
      }

      .aipo-prompt-button.aipo-prompt-button-hidden {
        display: none !important;
      }

      @media (prefers-color-scheme: dark) {
        .aipo-prompt-button {
          border-color: rgba(255, 255, 255, 0.14) !important;
          background: rgba(32, 33, 36, 0.68) !important;
          color: #f1f3f4 !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.24) !important;
        }

        .aipo-prompt-button:hover {
          border-color: rgba(255, 255, 255, 0.28) !important;
          background: rgba(48, 52, 58, 0.88) !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important;
        }
      }
    `;
    document.documentElement.appendChild(style);
  }

  function showToast(message) {
    let toast = document.querySelector(".aipo-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "aipo-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("aipo-toast-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("aipo-toast-visible");
    }, 2800);
  }

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(response);
      });
    });
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

  // 隐私说明：content script 只读取当前用户点击的输入框内容，并把文本交给 background；
  // 它不会读取浏览历史，也不会直接访问 OpenAI API 或接触 API Key。
})();
