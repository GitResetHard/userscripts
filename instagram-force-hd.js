// ==UserScript==
// @name         Instagram Force HD Media
// @namespace    https://github.com/GitResetHard/userscripts
// @version      1.0.0
// @author       GitResetHard
// @description  Force Instagram HD media and optionally open videos in fullscreen.
// @supportURL   https://github.com/GitResetHard/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/GitResetHard/userscripts/dist/instagram-force-hd.js
// @updateURL    https://raw.githubusercontent.com/GitResetHard/userscripts/dist/instagram-force-hd.js
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const config = {
    autoFullscreenOnOpen: true,
    gestureMaxAgeMs: 2500,
    logPrefix: "[IG Force HD]"
  };
  function initSettings() {
    config.autoFullscreenOnOpen = GM_getValue("autoFullscreenOnOpen", config.autoFullscreenOnOpen);
  }
  function registerMenuCommands() {
    const label = `Auto-fullscreen on open: ${config.autoFullscreenOnOpen ? "ON" : "OFF"} — click to toggle`;
    GM_registerMenuCommand(label, () => {
      const next = !config.autoFullscreenOnOpen;
      GM_setValue("autoFullscreenOnOpen", next);
      config.autoFullscreenOnOpen = next;
      location.reload();
    });
  }
  function spoofNetworkHints() {
    const fake = {
      downlink: 10,
      downlinkMax: Infinity,
      effectiveType: "4g",
      rtt: 50,
      saveData: false,
      type: "wifi",
      addEventListener() {
      },
      removeEventListener() {
      },
      dispatchEvent() {
        return false;
      },
      onchange: null
    };
    for (const prop of ["connection", "mozConnection", "webkitConnection"]) {
      try {
        Object.defineProperty(navigator, prop, {
          configurable: true,
          get: () => fake
        });
      } catch {
      }
    }
  }
  const bestVideoByKey = /* @__PURE__ */ new Map();
  function scoreDims(width, height) {
    return (Number(width) || 0) * (Number(height) || 0);
  }
  function pickBestVideoVersion(versions) {
    if (versions.length === 0) return null;
    let best = null;
    let bestScore = -1;
    for (const v of versions) {
      if (typeof v.url !== "string") continue;
      const score = scoreDims(v.width, v.height) || Number(v.bandwidth) || 0;
      if (score >= bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }
  function rememberVideo(node, best) {
    if (!best.url) return;
    const keys = [node.id, node.pk, node.code, node.shortcode, best.id].filter((k) => k != null).map(String);
    for (const key of keys) bestVideoByKey.set(key, best.url);
  }
  function upgradeImageCandidates(candidates) {
    if (candidates.length < 2) return false;
    const best = candidates.reduce(
      (a, b) => scoreDims(b.width, b.height) >= scoreDims(a.width, a.height) ? b : a
    );
    if (!best.url) return false;
    candidates.splice(0, candidates.length, best);
    return true;
  }
  function highestFromSrcset(srcset) {
    let bestUrl = null;
    let bestScore = -1;
    for (const part of srcset.split(",")) {
      const bits = part.trim().split(/\s+/);
      const url = bits[0];
      if (!url) continue;
      const score = parseFloat(bits[1] ?? "") || 0;
      if (score >= bestScore) {
        bestScore = score;
        bestUrl = url;
      }
    }
    return bestUrl;
  }
  function findUpgradeUrl(currentSrc) {
    if (!/cdninstagram\.com|fbcdn\.net/.test(currentSrc)) return null;
    const isLow = /_(?:240|270|360|480|540)(?:w|p)?_/.test(currentSrc) || /\/s\d+x\d+\//.test(currentSrc);
    if (!isLow) return null;
    for (const url of bestVideoByKey.values()) {
      if (!url || url === currentSrc) continue;
      if (!/cdninstagram\.com|fbcdn\.net/.test(url)) continue;
      return url;
    }
    return null;
  }
  function scoreDisplayResource(r) {
    return scoreDims(r.config_width, r.config_height);
  }
  function pruneDashManifest(mpd) {
    if (!mpd.includes("<MPD") || !mpd.includes("Representation")) return mpd;
    return mpd.replace(/<AdaptationSet\b[^>]*>[\s\S]*?<\/AdaptationSet>/gi, (adaptationSet) => {
      const isVideo = /contentType\s*=\s*["']video["']/i.test(adaptationSet) || /mimeType\s*=\s*["']video\//i.test(adaptationSet) && !/contentType\s*=\s*["']audio["']/i.test(adaptationSet);
      if (!isVideo) return adaptationSet;
      const reps = [...adaptationSet.matchAll(/<Representation\b[\s\S]*?<\/Representation>/gi)].map(
        (m) => m[0]
      );
      if (reps.length <= 1) return adaptationSet;
      let best = reps[0] ?? "";
      let bestScore = -1;
      for (const rep of reps) {
        const bw = Number((/\bbandwidth\s*=\s*["'](\d+)["']/i.exec(rep) ?? [])[1] ?? 0);
        const w = Number((/\bwidth\s*=\s*["'](\d+)["']/i.exec(rep) ?? [])[1] ?? 0);
        const h = Number((/\bheight\s*=\s*["'](\d+)["']/i.exec(rep) ?? [])[1] ?? 0);
        const score = bw || w * h;
        if (score >= bestScore) {
          bestScore = score;
          best = rep;
        }
      }
      let first = true;
      return adaptationSet.replace(/<Representation\b[\s\S]*?<\/Representation>/gi, () => {
        if (first) {
          first = false;
          return best;
        }
        return "";
      });
    });
  }
  function log(...args) {
  }
  function isObject(value) {
    return value !== null && typeof value === "object";
  }
  function rewriteNode(node) {
    var _a;
    let changed = false;
    if (Array.isArray(node.video_versions)) {
      const best = pickBestVideoVersion(node.video_versions);
      if (best) {
        rememberVideo(node, best);
        node.video_versions = [best];
        if (typeof node.video_url === "string") node.video_url = best.url;
        changed = true;
      }
    }
    for (const key of ["video_dash_manifest", "dash_manifest"]) {
      const manifest = node[key];
      if (typeof manifest === "string") {
        const pruned = pruneDashManifest(manifest);
        if (pruned !== manifest) {
          node[key] = pruned;
          changed = true;
        }
      }
    }
    const candidates = (_a = node.image_versions2) == null ? void 0 : _a.candidates;
    if (Array.isArray(candidates) && upgradeImageCandidates(candidates)) changed = true;
    if (Array.isArray(node.display_resources) && node.display_resources.length > 0) {
      const best = node.display_resources.reduce(
        (a, b) => scoreDisplayResource(b) >= scoreDisplayResource(a) ? b : a
      );
      node.display_resources = [best];
      if (typeof node.display_url === "string" && best.src) node.display_url = best.src;
      changed = true;
    }
    if (Array.isArray(node.candidates) && upgradeImageCandidates(node.candidates)) changed = true;
    return changed;
  }
  function walk(value, seen = /* @__PURE__ */ new WeakSet()) {
    if (!isObject(value)) return false;
    if (seen.has(value)) return false;
    seen.add(value);
    let changed = rewriteNode(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        if (walk(item, seen)) changed = true;
      }
      return changed;
    }
    for (const key of Object.keys(value)) {
      if (walk(value[key], seen)) changed = true;
    }
    return changed;
  }
  function rewriteJsonText(text) {
    if (text.length < 20) return null;
    if (!text.includes("video_versions") && !text.includes("video_dash_manifest") && !text.includes("dash_manifest") && !text.includes("image_versions2") && !text.includes("display_resources")) {
      return null;
    }
    try {
      const data = JSON.parse(text);
      if (!walk(data)) return null;
      log("rewrote API payload");
      return JSON.stringify(data);
    } catch {
      return null;
    }
  }
  function shouldTouchUrl(url) {
    if (!url) return false;
    return url.includes("instagram.com") || url.includes("/graphql") || url.includes("/api/v1/") || url.includes("fbcdn.net") || url.includes("cdninstagram.com");
  }
  function hookFetch() {
    const originalFetch = window.fetch;
    if (typeof originalFetch !== "function") return;
    window.fetch = async function patchedFetch(input, init) {
      const url = input instanceof URL ? input.href : typeof input === "string" ? input : input.url;
      const response = await originalFetch.call(this, input, init);
      if (!shouldTouchUrl(url)) return response;
      try {
        const clone = response.clone();
        const contentType = clone.headers.get("content-type") ?? "";
        if (contentType.includes("application/json") || url.includes("graphql") || url.includes("/api/")) {
          const text = await clone.text();
          const rewritten = rewriteJsonText(text);
          if (rewritten != null) {
            return new Response(rewritten, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
        }
        if (contentType.includes("application/dash+xml") || contentType.includes("application/xml") || url.includes(".mpd")) {
          const text = await clone.text();
          const pruned = pruneDashManifest(text);
          if (pruned !== text) {
            return new Response(pruned, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
        }
      } catch (err) {
      }
      return response;
    };
  }
  const requestUrls = /* @__PURE__ */ new WeakMap();
  function hookXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url, async = true, username, password) {
      requestUrls.set(this, String(url));
      originalOpen.call(this, method, url, async, username, password);
    };
    XMLHttpRequest.prototype.send = function(body) {
      if (shouldTouchUrl(requestUrls.get(this))) {
        this.addEventListener(
          "readystatechange",
          function() {
            if (this.readyState !== XMLHttpRequest.DONE) return;
            if (typeof this.responseText !== "string") return;
            const rewritten = rewriteJsonText(this.responseText);
            if (rewritten == null) return;
            try {
              Object.defineProperty(this, "responseText", {
                configurable: true,
                get: () => rewritten
              });
              Object.defineProperty(this, "response", {
                configurable: true,
                get: () => rewritten
              });
            } catch (err) {
            }
          },
          { once: true }
        );
      }
      originalSend.call(this, body);
    };
  }
  let lastGestureAt = 0;
  let lastFullscreenVideo = null;
  let cssFullscreenActive = false;
  function setLastGestureAt(time) {
    lastGestureAt = time;
  }
  function getLastFullscreenVideo() {
    return lastFullscreenVideo;
  }
  function isCssFullscreenActive() {
    return cssFullscreenActive;
  }
  function isNativeFullscreen(video) {
    const fsEl = document.fullscreenElement ?? document.webkitFullscreenElement ?? document.msFullscreenElement;
    return !!fsEl && (fsEl === video || fsEl.contains(video));
  }
  function isFullscreen(video) {
    return isNativeFullscreen(video) || cssFullscreenActive && lastFullscreenVideo === video;
  }
  function exitCssFullscreen() {
    var _a;
    lastFullscreenVideo == null ? void 0 : lastFullscreenVideo.classList.remove("ig-force-hd-css-fs");
    (_a = document.body) == null ? void 0 : _a.classList.remove("ig-force-hd-css-fs-lock");
    cssFullscreenActive = false;
  }
  async function enterNativeFullscreen(el) {
    var _a, _b, _c;
    const req = el.requestFullscreen.bind(el) ?? ((_a = el.webkitRequestFullscreen) == null ? void 0 : _a.bind(el)) ?? ((_b = el.webkitEnterFullscreen) == null ? void 0 : _b.bind(el)) ?? ((_c = el.msRequestFullscreen) == null ? void 0 : _c.bind(el));
    if (!req) return false;
    try {
      await req();
      return true;
    } catch (err) {
      return false;
    }
  }
  async function exitNativeFullscreen() {
    var _a, _b;
    const exit = document.exitFullscreen.bind(document) ?? ((_a = document.webkitExitFullscreen) == null ? void 0 : _a.bind(document)) ?? ((_b = document.msExitFullscreen) == null ? void 0 : _b.bind(document));
    if (!exit) return;
    try {
      await exit();
    } catch {
    }
  }
  async function enterFullscreen(video) {
    var _a;
    lastFullscreenVideo = video;
    injectFullscreenStyles();
    const ok = await enterNativeFullscreen(video);
    if (ok) {
      exitCssFullscreen();
      updateFsButton(video);
      return;
    }
    document.querySelectorAll("video.ig-force-hd-css-fs").forEach((v) => {
      v.classList.remove("ig-force-hd-css-fs");
    });
    video.classList.add("ig-force-hd-css-fs");
    (_a = document.body) == null ? void 0 : _a.classList.add("ig-force-hd-css-fs-lock");
    cssFullscreenActive = true;
    updateFsButton(video);
  }
  async function exitFullscreen(video) {
    if (document.fullscreenElement != null || document.webkitFullscreenElement != null) {
      await exitNativeFullscreen();
    }
    exitCssFullscreen();
    if (video) updateFsButton(video);
  }
  async function toggleFullscreen(video) {
    if (!video) return;
    if (isFullscreen(video)) await exitFullscreen(video);
    else await enterFullscreen(video);
  }
  function isPrimaryVideo(video) {
    const rect = video.getBoundingClientRect();
    if (rect.width < 160 || rect.height < 160) return false;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const visibleW = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (visibleW <= 0 || visibleH <= 0) return false;
    const visibleArea = visibleW * visibleH;
    if (visibleArea / (rect.width * rect.height) < 0.45) return false;
    return visibleArea >= vw * vh * 0.18 || rect.height >= vh * 0.45;
  }
  function getBestVisibleVideo() {
    const videos = [...document.querySelectorAll("video")].filter(isPrimaryVideo);
    if (videos.length === 0) return null;
    return videos.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.width * br.height - ar.width * ar.height;
    })[0] ?? null;
  }
  function fsIcon(expanded) {
    return expanded ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9H4V7h3V4h2v5zm6 0V4h2v3h3v2h-5zm0 6h5v2h-3v3h-2v-5zm-6 0v5H7v-3H4v-2h5z"/></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm10-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm16 0v5h-5v-2h3v-3h2z"/></svg>`;
  }
  function updateFsButton(video) {
    var _a;
    const btn = (_a = video.parentElement) == null ? void 0 : _a.querySelector(":scope > .ig-force-hd-fs-btn");
    if (!btn) return;
    const expanded = isFullscreen(video);
    btn.innerHTML = fsIcon(expanded);
    const label = expanded ? "Exit fullscreen (F / Esc)" : "Fullscreen (F)";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }
  function injectFullscreenStyles() {
    if (document.getElementById("ig-force-hd-fs-style")) return;
    const style = document.createElement("style");
    style.id = "ig-force-hd-fs-style";
    style.textContent = `
    .ig-force-hd-fs-btn {
      position: absolute; right: 12px; bottom: 12px; z-index: 2147483646;
      width: 40px; height: 40px; border: 0; border-radius: 999px;
      background: rgba(0,0,0,0.55); color: #fff; cursor: pointer;
      display: grid; place-items: center; padding: 0; opacity: 0.85;
      transition: opacity 120ms ease, transform 120ms ease;
    }
    .ig-force-hd-fs-btn:hover { opacity: 1; transform: scale(1.04); }
    .ig-force-hd-fs-btn svg { width: 20px; height: 20px; fill: currentColor; }
    .ig-force-hd-fs-host { position: relative !important; }
    video.ig-force-hd-css-fs {
      position: fixed !important; inset: 0 !important;
      width: 100vw !important; height: 100vh !important;
      max-width: none !important; max-height: none !important;
      object-fit: contain !important; background: #000 !important;
      z-index: 2147483645 !important;
    }
    body.ig-force-hd-css-fs-lock { overflow: hidden !important; }
  `;
    (document.head ?? document.documentElement).appendChild(style);
  }
  function ensureFsButton(video) {
    if (video.dataset.igFsBound === "1") return;
    video.dataset.igFsBound = "1";
    injectFullscreenStyles();
    const host = video.parentElement;
    if (host && getComputedStyle(host).position === "static") {
      host.classList.add("ig-force-hd-fs-host");
    }
    if (host && !host.querySelector(":scope > .ig-force-hd-fs-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ig-force-hd-fs-btn";
      btn.innerHTML = fsIcon(false);
      btn.title = "Fullscreen (F)";
      btn.setAttribute("aria-label", "Fullscreen (F)");
      btn.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          lastGestureAt = Date.now();
          void toggleFullscreen(video);
        },
        true
      );
      host.appendChild(btn);
    }
    if (video.dataset.igFsEvents === "1") return;
    video.dataset.igFsEvents = "1";
    video.addEventListener(
      "dblclick",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        lastGestureAt = Date.now();
        void toggleFullscreen(video);
      },
      true
    );
    video.addEventListener("playing", () => {
      if (!config.autoFullscreenOnOpen) return;
      if (Date.now() - lastGestureAt > config.gestureMaxAgeMs) return;
      if (isFullscreen(video)) return;
      if (!isPrimaryVideo(video)) return;
      void enterFullscreen(video);
    });
    video.addEventListener("play", () => {
      if (!lastFullscreenVideo) return;
      if (!isFullscreen(lastFullscreenVideo) && !cssFullscreenActive && document.fullscreenElement == null)
        return;
      if (video === lastFullscreenVideo) return;
      if (!isPrimaryVideo(video)) return;
      void enterFullscreen(video);
    });
  }
  function bindFullscreenChangeListener() {
    const onchange = () => {
      if (lastFullscreenVideo) updateFsButton(lastFullscreenVideo);
      if (document.fullscreenElement == null && document.webkitFullscreenElement == null) {
        exitCssFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", onchange);
    document.addEventListener("webkitfullscreenchange", onchange);
  }
  function bindGestureTracking() {
    const markGesture = () => setLastGestureAt(Date.now());
    for (const type of ["pointerdown", "click", "keydown", "touchstart"]) {
      window.addEventListener(type, markGesture, true);
    }
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.defaultPrevented) return;
        const target = e.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable) {
          return;
        }
        if (e.key === "f" || e.key === "F") {
          const video = getBestVisibleVideo() ?? getLastFullscreenVideo();
          if (!video) return;
          e.preventDefault();
          void toggleFullscreen(video);
          return;
        }
        if (e.key === "Escape" && isCssFullscreenActive()) {
          void exitFullscreen(getLastFullscreenVideo());
        }
      },
      true
    );
  }
  function upgradeImageElement(img) {
    if (img.dataset.igForceHd === "1") return;
    const srcset = img.getAttribute("srcset");
    if (srcset) {
      const best = highestFromSrcset(srcset);
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      if (best && img.src !== best) img.src = best;
    }
    img.dataset.igForceHd = "1";
  }
  function maybeUpgradeVideoElement(video) {
    if (video.dataset.igForceHd === "1") return;
    const current = video.currentSrc || video.src;
    if (!current) return;
    const better = findUpgradeUrl(current);
    if (!better) return;
    const wasPaused = video.paused;
    const t = video.currentTime;
    video.src = better;
    video.dataset.igForceHd = "1";
    video.addEventListener(
      "loadedmetadata",
      () => {
        try {
          if (t > 0) video.currentTime = t;
        } catch {
        }
        if (!wasPaused) video.play().catch(() => {
        });
      },
      { once: true }
    );
  }
  function prepareVideo(video) {
    maybeUpgradeVideoElement(video);
    ensureFsButton(video);
  }
  function scanDom(root = document) {
    root.querySelectorAll("img").forEach(upgradeImageElement);
    root.querySelectorAll("video").forEach(prepareVideo);
  }
  function observeDom() {
    const start = () => {
      injectFullscreenStyles();
      scanDom(document);
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "attributes") {
            const target = mutation.target;
            if (target instanceof HTMLImageElement && (mutation.attributeName === "srcset" || mutation.attributeName === "src")) {
              delete target.dataset.igForceHd;
              upgradeImageElement(target);
            }
            if (target instanceof HTMLVideoElement && (mutation.attributeName === "src" || mutation.attributeName === "srcObject")) {
              delete target.dataset.igForceHd;
              prepareVideo(target);
            }
          }
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (node instanceof HTMLImageElement) upgradeImageElement(node);
            else if (node instanceof HTMLVideoElement) prepareVideo(node);
            else if (node instanceof Element) scanDom(node);
          }
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset", "srcObject"]
      });
    };
    if (document.documentElement) {
      start();
    } else {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    }
  }
  initSettings();
  spoofNetworkHints();
  hookFetch();
  hookXHR();
  bindGestureTracking();
  bindFullscreenChangeListener();
  observeDom();
  registerMenuCommands();
  console.info(`${config.logPrefix} active (HD + fullscreen)`);

})();