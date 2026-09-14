// ==UserScript==
// @name         Bunkr Suite
// @namespace    https://github.com/userscripts/bunkr-suite
// @version      1.0.0
// @author       local
// @description  CDN link injector, album stats, hover quick-preview, and already-seen deduplication for balbums.st and bunkr.cr
// @icon         https://balbums.st/img/favicon.svg
// @match        https://balbums.st/*
// @match        https://bunkr.cr/*
// @connect      bunkr.cr
// @connect      s.bunkr.ru
// @connect      static.scdn.st
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  function observeAdded(root, selector, callback) {
    var _a;
    if (root instanceof Element || root instanceof Document) {
      (_a = root.querySelectorAll) == null ? void 0 : _a.call(root, selector).forEach(callback);
    }
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(selector)) callback(node);
          node.querySelectorAll(selector).forEach(callback);
        }
      }
    });
    obs.observe(root, { childList: true, subtree: true });
    return obs;
  }
  const config = {
    debug: false,
    logPrefix: "[BunkrSuite]",
    hoverPreview: {
      /** Milliseconds of hover dwell before fetching the album preview. */
      delayMs: 350,
      /** Max thumbnails shown in the preview popover. */
      maxThumbnails: 12
    },
    alreadySeen: {
      storageKey: "bks_visited",
      /** CSS opacity applied to seen album cards (0–1). */
      dimOpacity: "0.42",
      /** Cap on stored album IDs to prevent unbounded growth. */
      maxTracked: 1e4
    }
  };
  function getVisitedAlbums() {
    try {
      const raw = GM_getValue(config.alreadySeen.storageKey, "[]");
      return new Set(JSON.parse(raw));
    } catch {
      return /* @__PURE__ */ new Set();
    }
  }
  function addVisitedAlbum(albumId) {
    const visited = getVisitedAlbums();
    if (visited.has(albumId)) return;
    visited.add(albumId);
    const trimmed = [...visited].slice(-1e4);
    GM_setValue(config.alreadySeen.storageKey, JSON.stringify(trimmed));
  }
  function clearVisitedAlbums() {
    GM_setValue(config.alreadySeen.storageKey, "[]");
  }
  function log(...args) {
  }
  function warn(...args) {
    console.warn(config.logPrefix, ...args);
  }
  const TRACKED_ATTR = "data-bks-tracked";
  const SEEN_CLASS = "bks-seen";
  const STYLES$3 = `
.${SEEN_CLASS} {
  opacity: ${config.alreadySeen.dimOpacity} !important;
  transition: opacity 0.3s ease;
}
.${SEEN_CLASS}:hover {
  opacity: 0.75 !important;
}
.bks-seen-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  background: rgba(10, 10, 11, 0.78);
  color: #5e5e6b;
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 4px;
  z-index: 20;
  pointer-events: none;
  user-select: none;
}
`;
  function extractAlbumId(href) {
    var _a;
    return ((_a = href.match(/bunkr\.cr\/a\/([A-Za-z0-9_-]+)/)) == null ? void 0 : _a[1]) ?? null;
  }
  function markCardSeen(card) {
    if (card.classList.contains(SEEN_CLASS)) return;
    card.classList.add(SEEN_CLASS);
    if (getComputedStyle(card).position === "static") {
      card.style.position = "relative";
    }
    const badge = document.createElement("div");
    badge.className = "bks-seen-badge";
    badge.textContent = "Seen";
    card.appendChild(badge);
  }
  function attachCard(card, visited) {
    if (card.getAttribute(TRACKED_ATTR)) return;
    card.setAttribute(TRACKED_ATTR, "1");
    const albumId = extractAlbumId(card.href);
    if (!albumId) return;
    if (visited.has(albumId)) markCardSeen(card);
    card.addEventListener("click", () => {
      addVisitedAlbum(albumId);
      visited.add(albumId);
      markCardSeen(card);
    });
  }
  function initOnIndex() {
    const styleEl = document.createElement("style");
    styleEl.id = "bks-seen-styles";
    styleEl.textContent = STYLES$3;
    document.head.appendChild(styleEl);
    const visited = getVisitedAlbums();
    log("Loaded", visited.size, "visited albums");
    observeAdded(document.body, 'a[href*="bunkr.cr/a/"]', (el) => {
      attachCard(el, visited);
    });
    GM_registerMenuCommand("Bunkr Suite — Clear seen history", () => {
      clearVisitedAlbums();
      document.querySelectorAll(`.${SEEN_CLASS}`).forEach((card) => {
        var _a;
        card.classList.remove(SEEN_CLASS);
        card.style.opacity = "";
        (_a = card.querySelector(".bks-seen-badge")) == null ? void 0 : _a.remove();
        card.removeAttribute(TRACKED_ATTR);
      });
    });
  }
  function initOnAlbumPage() {
    var _a;
    const albumId = (_a = window.location.pathname.match(/\/a\/([A-Za-z0-9_-]+)/)) == null ? void 0 : _a[1];
    if (albumId) {
      addVisitedAlbum(albumId);
    }
  }
  function initAlreadySeen() {
    if (window.location.hostname === "balbums.st") {
      initOnIndex();
    } else {
      initOnAlbumPage();
    }
  }
  function gmFetch(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        timeout: 12e3,
        headers: { Accept: "text/html,application/json,*/*" },
        onload(r) {
          if (r.status >= 400) {
            reject(new Error(`HTTP ${r.status}: ${url}`));
          } else {
            resolve(r.responseText);
          }
        },
        onerror() {
          reject(new Error(`Network error fetching: ${url}`));
        },
        ontimeout() {
          reject(new Error(`Timeout fetching: ${url}`));
        }
      });
    });
  }
  function gmFetchJson(url) {
    return gmFetch(url).then((text) => JSON.parse(text));
  }
  const POPOVER_ID = "bks-preview-popover";
  const POPOVER_W = 316;
  const STYLES$2 = `
#${POPOVER_ID} {
  position: fixed;
  width: ${POPOVER_W}px;
  background: #15151a;
  border: 1px solid #25252d;
  border-radius: 12px;
  padding: 12px;
  z-index: 99999;
  box-shadow: 0 24px 64px rgba(0,0,0,0.88);
  pointer-events: none;
  animation: bks-pop-in 0.14s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes bks-pop-in {
  from { opacity: 0; transform: scale(0.95) translateY(5px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);   }
}
.bks-pop-title {
  font-size: 12px;
  font-family: 'Geist', system-ui, sans-serif;
  color: #9a9aa6;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bks-pop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-bottom: 9px;
}
.bks-pop-thumb {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border-radius: 5px;
  background: #1c1c22;
  display: block;
}
.bks-pop-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #5e5e6b;
  letter-spacing: 0.1em;
}
.bks-pop-state {
  text-align: center;
  padding: 22px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #5e5e6b;
}
.bks-pop-state.error { color: #ff7a59; }
`;
  const previewCache = /* @__PURE__ */ new Map();
  let activePopover = null;
  let hoverTimer = null;
  function injectStyles$2() {
    if (document.getElementById("bks-pop-styles")) return;
    const s = document.createElement("style");
    s.id = "bks-pop-styles";
    s.textContent = STYLES$2;
    document.head.appendChild(s);
  }
  function computePosition(anchor) {
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ESTIMATED_H = 270;
    const GAP = 10;
    let left = r.right + GAP;
    if (left + POPOVER_W > vw - 8) left = r.left - POPOVER_W - GAP;
    left = Math.max(8, Math.min(left, vw - POPOVER_W - 8));
    let top = r.top;
    if (top + ESTIMATED_H > vh - 8) top = vh - ESTIMATED_H - 8;
    top = Math.max(8, top);
    return { top, left };
  }
  function buildPopover(content, anchor) {
    const el = document.createElement("div");
    el.id = POPOVER_ID;
    const { top, left } = computePosition(anchor);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    if (content === "loading") {
      const state = document.createElement("div");
      state.className = "bks-pop-state";
      state.textContent = "Loading preview…";
      el.appendChild(state);
      return el;
    }
    if (content === "error") {
      const state = document.createElement("div");
      state.className = "bks-pop-state error";
      state.textContent = "Preview unavailable";
      el.appendChild(state);
      return el;
    }
    if (content.title) {
      const title = document.createElement("div");
      title.className = "bks-pop-title";
      title.textContent = content.title;
      el.appendChild(title);
    }
    if (content.thumbnails.length > 0) {
      const grid = document.createElement("div");
      grid.className = "bks-pop-grid";
      content.thumbnails.forEach((src) => {
        const img = document.createElement("img");
        img.className = "bks-pop-thumb";
        img.src = src;
        img.loading = "lazy";
        img.decoding = "async";
        grid.appendChild(img);
      });
      el.appendChild(grid);
    } else {
      const state = document.createElement("div");
      state.className = "bks-pop-state";
      state.textContent = "No thumbnails found";
      el.appendChild(state);
    }
    const meta = document.createElement("div");
    meta.className = "bks-pop-meta";
    meta.textContent = content.fileCount > 0 ? `${content.fileCount} files` : "";
    el.appendChild(meta);
    return el;
  }
  function showPopover(content, anchor) {
    removePopover();
    activePopover = buildPopover(content, anchor);
    document.body.appendChild(activePopover);
  }
  function removePopover() {
    activePopover == null ? void 0 : activePopover.remove();
    activePopover = null;
  }
  function parseAlbumPage(html, albumId) {
    var _a, _b, _c;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const thumbs = Array.from(doc.querySelectorAll("img")).map((img) => {
      const src = img.getAttribute("src") ?? "";
      if (src.startsWith("http")) return src;
      if (src.startsWith("/")) return `https://bunkr.cr${src}`;
      return "";
    }).filter((src) => src.includes("scdn.st") && src.includes("thumbs")).slice(0, config.hoverPreview.maxThumbnails);
    const title = ((_b = (_a = doc.querySelector("h1")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) ?? "";
    const countMatch = (_c = doc.body.textContent) == null ? void 0 : _c.match(/(\d[\d,]*)\s+[Ff]iles?/);
    const fileCount = (countMatch == null ? void 0 : countMatch[1]) ? parseInt(countMatch[1].replace(/,/g, ""), 10) : 0;
    log("Parsed preview for", albumId, "— thumbs:", thumbs.length);
    return { thumbnails: thumbs, title, fileCount };
  }
  async function fetchPreview(albumId) {
    const cached = previewCache.get(albumId);
    if (cached !== void 0) return cached;
    try {
      const html = await gmFetch(`https://bunkr.cr/a/${albumId}`);
      const data = parseAlbumPage(html, albumId);
      previewCache.set(albumId, data);
      return data;
    } catch (err) {
      previewCache.set(albumId, "error");
      return "error";
    }
  }
  async function onHover(card) {
    var _a;
    const albumId = (_a = card.href.match(/\/a\/([A-Za-z0-9_-]+)/)) == null ? void 0 : _a[1];
    if (!albumId) return;
    const cached = previewCache.get(albumId);
    if (cached !== void 0) {
      showPopover(cached, card);
      return;
    }
    showPopover("loading", card);
    const data = await fetchPreview(albumId);
    if (activePopover) showPopover(data, card);
  }
  function attachHoverListeners(card) {
    if (card.dataset.bksHover) return;
    card.dataset.bksHover = "1";
    card.addEventListener("mouseenter", () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        void onHover(card);
      }, config.hoverPreview.delayMs);
    });
    card.addEventListener("mouseleave", () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = null;
      removePopover();
    });
  }
  function initHoverPreview() {
    injectStyles$2();
    observeAdded(document.body, 'a[href*="bunkr.cr/a/"]', (el) => {
      attachHoverListeners(el);
    });
  }
  const PANEL_ID$1 = "bks-cdn-panel";
  const STYLES$1 = `
#${PANEL_ID$1} {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #15151a;
  border: 1px solid #25252d;
  border-radius: 12px;
  padding: 14px 16px;
  z-index: 99999;
  font-family: 'JetBrains Mono', monospace;
  color: #e8e8ec;
  box-shadow: 0 12px 48px rgba(0,0,0,0.82);
  max-width: 330px;
  animation: bks-cdn-in 0.18s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes bks-cdn-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.bks-cdn-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #5e5e6b;
  margin-bottom: 6px;
}
.bks-cdn-name {
  font-size: 10px;
  color: #9a9aa6;
  margin-bottom: 12px;
  word-break: break-all;
  line-height: 1.55;
  max-height: 46px;
  overflow: hidden;
}
.bks-cdn-btns {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  align-items: center;
}
.bks-cdn-btn {
  cursor: pointer;
  background: transparent;
  border: 1px solid #25252d;
  border-radius: 7px;
  padding: 6px 11px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: #9a9aa6;
  line-height: 1;
  transition: border-color 0.18s, color 0.18s;
}
.bks-cdn-btn:hover { border-color: #5e5e6b; color: #e8e8ec; }
.bks-cdn-btn-close { margin-left: auto; padding: 6px 9px; color: #5e5e6b; }
.bks-cdn-btn-close:hover { color: #e8e8ec; }
`;
  function injectStyles$1() {
    if (document.getElementById("bks-cdn-styles")) return;
    const s = document.createElement("style");
    s.id = "bks-cdn-styles";
    s.textContent = STYLES$1;
    document.head.appendChild(s);
  }
  function extractFilename(url) {
    try {
      const pathname2 = new URL(url).pathname;
      return pathname2.split("/").filter(Boolean).pop() ?? "file";
    } catch {
      return "file";
    }
  }
  function isCDNUrl(url) {
    if (!url.startsWith("http")) return false;
    try {
      const u = new URL(url);
      return !u.hostname.includes("bunkr.cr");
    } catch {
      return false;
    }
  }
  function showPanel(link) {
    if (document.getElementById(PANEL_ID$1)) return;
    const panel = document.createElement("div");
    panel.id = PANEL_ID$1;
    const label = document.createElement("div");
    label.className = "bks-cdn-label";
    label.textContent = "Direct CDN Link";
    const name = document.createElement("div");
    name.className = "bks-cdn-name";
    name.textContent = link.filename;
    name.title = link.url;
    const btns = document.createElement("div");
    btns.className = "bks-cdn-btns";
    function makeBtn(text, extra = "") {
      const b = document.createElement("button");
      b.className = `bks-cdn-btn ${extra}`.trim();
      b.textContent = text;
      return b;
    }
    const copyBtn = makeBtn("Copy URL");
    copyBtn.addEventListener("click", () => {
      GM_setClipboard(link.url);
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => {
        copyBtn.textContent = "Copy URL";
      }, 2e3);
    });
    const newTabBtn = makeBtn("New Tab");
    newTabBtn.addEventListener("click", () => {
      window.open(link.url, "_blank");
    });
    const closeBtn = makeBtn("✕", "bks-cdn-btn-close");
    closeBtn.title = "Dismiss";
    closeBtn.addEventListener("click", () => panel.remove());
    btns.append(copyBtn, newTabBtn);
    if (link.isVideo) {
      const vlcBtn = makeBtn("Open VLC");
      vlcBtn.title = "Requires VLC registered as a vlc:// protocol handler";
      vlcBtn.addEventListener("click", () => {
        window.location.href = `vlc://${link.url}`;
      });
      btns.appendChild(vlcBtn);
    }
    btns.appendChild(closeBtn);
    panel.append(label, name, btns);
    document.body.appendChild(panel);
    log("CDN panel injected for:", link.filename);
  }
  function tryFind() {
    const isVideo = window.location.pathname.startsWith("/v/");
    const dlAnchor = document.querySelector("a[download][href]");
    if ((dlAnchor == null ? void 0 : dlAnchor.href) && isCDNUrl(dlAnchor.href)) {
      showPanel({ url: dlAnchor.href, filename: extractFilename(dlAnchor.href), isVideo });
      return true;
    }
    if (isVideo) {
      const video = document.querySelector("video[src]");
      if ((video == null ? void 0 : video.src) && isCDNUrl(video.src)) {
        showPanel({ url: video.src, filename: extractFilename(video.src), isVideo: true });
        return true;
      }
      const source = document.querySelector("video source[src]");
      if ((source == null ? void 0 : source.src) && isCDNUrl(source.src)) {
        showPanel({ url: source.src, filename: extractFilename(source.src), isVideo: true });
        return true;
      }
    } else {
      const img = document.querySelector(
        'img[src*="ex="][src*="token="], .image-container img[src], main img[src]'
      );
      if ((img == null ? void 0 : img.src) && isCDNUrl(img.src)) {
        showPanel({ url: img.src, filename: extractFilename(img.src), isVideo: false });
        return true;
      }
    }
    return false;
  }
  function initCDNReconstructor() {
    injectStyles$1();
    if (tryFind()) return;
    const obs = new MutationObserver(() => {
      if (tryFind()) obs.disconnect();
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "href"]
    });
    const TIMEOUT_MS = 2e4;
    setTimeout(() => {
      obs.disconnect();
      if (!document.getElementById(PANEL_ID$1)) {
        warn("CDN URL not detected within", TIMEOUT_MS, "ms — panel not shown");
      }
    }, TIMEOUT_MS);
  }
  const PANEL_ID = "bks-stats-panel";
  const STYLES = `
#${PANEL_ID} {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: #111114;
  border: 1px solid #1d1d24;
  border-radius: 10px;
  padding: 9px 15px;
  margin-top: 10px;
  margin-bottom: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #9a9aa6;
  animation: bks-stats-in 0.25s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes bks-stats-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.bks-stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.bks-stat-val {
  color: #e8e8ec;
  font-weight: 500;
}
.bks-stat-sep {
  width: 1px;
  height: 11px;
  background: #25252d;
  flex-shrink: 0;
}
`;
  function injectStyles() {
    if (document.getElementById("bks-stats-styles")) return;
    const s = document.createElement("style");
    s.id = "bks-stats-styles";
    s.textContent = STYLES;
    document.head.appendChild(s);
  }
  function countFileTypes() {
    const items = document.querySelectorAll('.theItem, [class*="theItem"]');
    let videos = 0;
    let images = 0;
    items.forEach((item) => {
      const link = item.querySelector("a[href]");
      const href = (link == null ? void 0 : link.getAttribute("href")) ?? "";
      const hasVideoPath = href.startsWith("/v/");
      const hasVideoIcon = !!item.querySelector(
        '[class*="video"], [class*="play-circle"], svg[class*="play"]'
      );
      if (hasVideoPath || hasVideoIcon) {
        videos++;
      } else {
        images++;
      }
    });
    return { videos, images, total: videos + images };
  }
  function makeStat(value, label) {
    const el = document.createElement("div");
    el.className = "bks-stat-item";
    const v = document.createElement("span");
    v.className = "bks-stat-val";
    v.textContent = value;
    const l = document.createElement("span");
    l.textContent = label;
    el.append(v, l);
    return el;
  }
  function makeSep() {
    const el = document.createElement("div");
    el.className = "bks-stat-sep";
    return el;
  }
  function buildPanel(summary, apiData) {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    const parts = [];
    if (summary.videos > 0) parts.push(makeStat(String(summary.videos), "videos"));
    if (summary.images > 0) parts.push(makeStat(String(summary.images), "images"));
    if (summary.videos > 0 && summary.images > 0) {
      const ratio = (summary.videos / summary.total * 100).toFixed(0);
      parts.push(makeStat(`${ratio}%`, "video"));
    }
    if (apiData) {
      const views = apiData.views ?? apiData.totalViews;
      if (typeof views === "number" && views > 0) {
        parts.push(makeStat(views.toLocaleString(), "views"));
      }
      const rawDate = apiData.createdAt ?? apiData.created_at;
      if (typeof rawDate === "string") {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            parts.push(makeStat(d.toLocaleDateString(), "uploaded"));
          }
        } catch {
        }
      }
    }
    parts.forEach((part, i) => {
      panel.appendChild(part);
      if (i < parts.length - 1) panel.appendChild(makeSep());
    });
    return panel;
  }
  function injectPanel(summary, apiData) {
    var _a;
    if (summary.total === 0) return;
    (_a = document.getElementById(PANEL_ID)) == null ? void 0 : _a.remove();
    const panel = buildPanel(summary, apiData);
    const heading = document.querySelector("h1");
    if (heading == null ? void 0 : heading.parentElement) {
      heading.parentElement.insertBefore(panel, heading.nextSibling);
    }
  }
  async function fetchAlbumApiData(albumId) {
    try {
      const data = await gmFetchJson(
        `https://s.bunkr.ru/api/albums/ats/${albumId}`
      );
      log("Album API data:", data);
      return data;
    } catch (err) {
      warn("Album API unavailable:", err);
      return void 0;
    }
  }
  function waitForItems(timeoutMs = 1e4) {
    if (document.querySelector('.theItem, [class*="theItem"]')) return Promise.resolve();
    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        if (document.querySelector('.theItem, [class*="theItem"]')) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        resolve();
      }, timeoutMs);
    });
  }
  async function initAlbumStats() {
    var _a;
    injectStyles();
    const albumId = (_a = window.location.pathname.match(/\/a\/([A-Za-z0-9_-]+)/)) == null ? void 0 : _a[1];
    if (!albumId) return;
    const [, apiData] = await Promise.all([waitForItems(), fetchAlbumApiData(albumId)]);
    const summary = countFileTypes();
    injectPanel(summary, apiData);
    let lastTotal = summary.total;
    const obs = new MutationObserver(() => {
      const current = countFileTypes();
      if (current.total !== lastTotal) {
        lastTotal = current.total;
        injectPanel(current, apiData);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  const { hostname, pathname } = window.location;
  if (hostname === "balbums.st") {
    initAlreadySeen();
    initHoverPreview();
  } else if (hostname === "bunkr.cr") {
    if (pathname.startsWith("/a/")) {
      initAlreadySeen();
      void initAlbumStats();
    } else if (pathname.startsWith("/v/") || pathname.startsWith("/i/")) {
      initCDNReconstructor();
    }
  }

})();