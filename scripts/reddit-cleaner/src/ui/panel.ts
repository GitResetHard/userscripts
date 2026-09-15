/**
 * Panel — complete UI for Reddit Cleaner.
 *
 * Renders inside a Shadow DOM to prevent style conflicts with Reddit.
 * State is managed as a plain object; DOM nodes are updated imperatively
 * rather than re-rendered wholesale for good performance.
 */

import { CSS } from "./styles";
import { fetchUserInfo } from "../api/auth";
import { fetchAllSubscribed, unsubscribe } from "../api/subreddits";
import { fetchAllUpvoted, unvote } from "../api/votes";
import { fmtCount, fmtRelTime } from "../utils/fmt";
import { sleep } from "../utils/sleep";
import { log, warn } from "../utils/log";
import { config } from "../config";
import type {
  State,
  Subreddit,
  UpvotedPost,
  Tab,
  SubSort,
  VoteSort,
} from "../types";

// ── Icons (inline SVG strings) ──────────────────────────────────────────────

const ICON_BROOM =
  '<svg viewBox="0 0 24 24"><path d="M19.36 2.72 18 4.08l-1.36-1.36a1 1 0 0 0-1.41 0l-9.9 9.9a4 4 0 0 0 0 5.66l1.06 1.06a4 4 0 0 0 5.66 0l9.9-9.9a1 1 0 0 0 0-1.41L20.77 6.7l1.36-1.36a1 1 0 0 0-1.77-1.62ZM11.64 17.93a2 2 0 0 1-2.83 0l-1.06-1.06a2 2 0 0 1 0-2.83l7.07-7.07 3.89 3.89-7.07 7.07Z"/></svg>';

const ICON_CLOSE =
  '<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4Z"/></svg>';

const ICON_REDDIT =
  '<svg viewBox="0 0 20 20"><path d="M20 10c0-5.52-4.48-10-10-10S0 4.48 0 10s4.48 10 10 10 10-4.48 10-10Zm-9.07-4.18A5.5 5.5 0 0 1 15.48 7l.76-.36a1 1 0 1 1 .9 1.78l-.8.39a3.85 3.85 0 0 1 .14 1 3.9 3.9 0 0 1-7.79.35 5.15 5.15 0 0 1-2.48-.92 1 1 0 0 1 1.16-1.63c.38.27.8.47 1.24.59a5.5 5.5 0 0 1 2.32-2.38Zm-1.43 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4.5 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>';

const ICON_EMPTY =
  '<svg viewBox="0 0 24 24"><path d="M19 11H7.83l4.88-4.88a1 1 0 1 0-1.41-1.41l-6.59 6.59a1 1 0 0 0 0 1.41l6.59 6.59a1 1 0 0 0 1.41-1.41L7.83 13H19a1 1 0 0 0 0-2Z"/></svg>';

// ── State ────────────────────────────────────────────────────────────────────

const state: State = {
  userInfo: null,
  authError: null,
  tab: "subs",
  subsPhase: "idle",
  subreddits: [],
  selectedSubs: new Set(),
  subsFilter: "",
  subsSort: "az",
  votesPhase: "idle",
  upvoted: [],
  selectedPosts: new Set(),
  votesFilter: "",
  votesSort: "newest",
  actionPhase: "idle",
  progress: null,
};

// ── DOM refs (populated once in init) ───────────────────────────────────────

let shadow!: ShadowRoot;
let elBackdrop!: HTMLElement;
let elTabSubs!: HTMLButtonElement;
let elTabVotes!: HTMLButtonElement;
let elFilter!: HTMLInputElement;
let elSort!: HTMLSelectElement;
let elList!: HTMLElement;
let elSelCount!: HTMLElement;
let elActionBtn!: HTMLButtonElement;
let elProgress!: HTMLElement;
let elConfirmBar!: HTMLElement;
let elUser!: HTMLElement;

// ── Helpers ──────────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

// ── Filtering & sorting ───────────────────────────────────────────────────────

function filterSubs(): Subreddit[] {
  const q = state.subsFilter.toLowerCase();
  let list = q
    ? state.subreddits.filter((s) => s.name.toLowerCase().includes(q))
    : state.subreddits;
  list = [...list];
  switch (state.subsSort) {
    case "za":
      list.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "most":
      list.sort((a, b) => b.subscribers - a.subscribers);
      break;
    case "least":
      list.sort((a, b) => a.subscribers - b.subscribers);
      break;
    default:
      list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return list;
}

function filterVotes(): UpvotedPost[] {
  const q = state.votesFilter.toLowerCase();
  let list = q
    ? state.upvoted.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subreddit.toLowerCase().includes(q),
      )
    : state.upvoted;
  list = [...list];
  switch (state.votesSort) {
    case "oldest":
      list.sort((a, b) => a.createdUtc - b.createdUtc);
      break;
    case "top":
      list.sort((a, b) => b.score - a.score);
      break;
    case "low":
      list.sort((a, b) => a.score - b.score);
      break;
    default:
      list.sort((a, b) => b.createdUtc - a.createdUtc);
  }
  return list;
}

// ── Renderers ────────────────────────────────────────────────────────────────

function renderSubItem(sub: Subreddit): HTMLElement {
  const selected = state.selectedSubs.has(sub.fullname);
  const item = el("div", { class: `rc-item${selected ? " selected" : ""}` });

  const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
  cb.checked = selected;

  const icon = el("div", { class: "rc-item-icon" });
  if (sub.iconUrl) {
    const img = el("img") as HTMLImageElement;
    img.src = sub.iconUrl;
    img.alt = "";
    img.onerror = () => {
      icon.innerHTML = ICON_REDDIT;
    };
    icon.appendChild(img);
  } else {
    icon.innerHTML = ICON_REDDIT;
  }

  const body = el("div", { class: "rc-item-body" });
  const name = el("p", { class: `rc-item-name${sub.nsfw ? " nsfw" : ""}` });
  const link = el(
    "a",
    { href: sub.url, target: "_blank" },
    sub.displayPrefixed,
  );
  link.addEventListener("click", (e) => e.stopPropagation());
  name.appendChild(link);

  const meta = el(
    "div",
    { class: "rc-item-meta" },
    fmtCount(sub.subscribers) + " members",
  );

  body.appendChild(name);
  item.append(cb, icon, body, meta);

  item.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).tagName === "A") return;
    toggleSub(sub.fullname, item, cb);
  });

  return item;
}

function renderPostItem(post: UpvotedPost): HTMLElement {
  const selected = state.selectedPosts.has(post.fullname);
  const item = el("div", { class: `rc-item${selected ? " selected" : ""}` });

  const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
  cb.checked = selected;

  const thumb = el("div", { class: "rc-item-thumb" });
  if (post.thumbnail) {
    const img = el("img") as HTMLImageElement;
    img.src = post.thumbnail;
    img.alt = "";
    img.onerror = () => thumb.remove();
    thumb.appendChild(img);
  }

  const body = el("div", { class: "rc-item-body" });

  const name = el("p", { class: `rc-item-name${post.nsfw ? " nsfw" : ""}` });
  const link = el("a", { href: post.permalink, target: "_blank" }, post.title);
  link.addEventListener("click", (e) => e.stopPropagation());
  name.appendChild(link);

  const sub = el(
    "p",
    { class: "rc-item-sub" },
    `${post.subredditPrefixed}  ·  ${fmtRelTime(post.createdUtc)}`,
  );
  body.append(name, sub);

  const meta = el("div", { class: "rc-item-meta" });
  meta.innerHTML = `<span class="score">▲ ${fmtCount(post.score)}</span><br><span>${post.numComments.toLocaleString()} cmt</span>`;

  item.append(cb, ...(post.thumbnail ? [thumb] : []), body, meta);

  item.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).tagName === "A") return;
    togglePost(post.fullname, item, cb);
  });

  return item;
}

function renderState(
  phase: "loading" | "error" | "private" | "empty",
  msg?: string,
): HTMLElement {
  const wrap = el("div", {
    class: `rc-state${phase === "error" ? " error" : ""}`,
  });
  if (phase === "loading") {
    const spinner = el("div", { class: "rc-spinner" });
    const text = el("p", {}, msg ?? "Loading…");
    wrap.append(spinner, text);
  } else {
    wrap.innerHTML = ICON_EMPTY;
    const title = el("p", { class: "rc-state-title" });
    const body = el("p", {});
    if (phase === "error") {
      title.textContent = "Something went wrong";
      body.textContent = msg ?? "An error occurred. Check the console.";
    } else if (phase === "private") {
      title.textContent = "Upvotes are private";
      body.textContent =
        'Go to Reddit settings → Privacy & Security and enable "Make my votes public".';
    } else {
      title.textContent = "Nothing here";
      body.textContent = msg ?? "No items found.";
    }
    wrap.append(title, body);
  }
  return wrap;
}

// ── Toggle selection ─────────────────────────────────────────────────────────

function toggleSub(
  fullname: string,
  item: HTMLElement,
  cb: HTMLInputElement,
): void {
  if (state.selectedSubs.has(fullname)) {
    state.selectedSubs.delete(fullname);
    item.classList.remove("selected");
    cb.checked = false;
  } else {
    state.selectedSubs.add(fullname);
    item.classList.add("selected");
    cb.checked = true;
  }
  updateFooter();
}

function togglePost(
  fullname: string,
  item: HTMLElement,
  cb: HTMLInputElement,
): void {
  if (state.selectedPosts.has(fullname)) {
    state.selectedPosts.delete(fullname);
    item.classList.remove("selected");
    cb.checked = false;
  } else {
    state.selectedPosts.add(fullname);
    item.classList.add("selected");
    cb.checked = true;
  }
  updateFooter();
}

// ── Render entire list ───────────────────────────────────────────────────────

function renderList(): void {
  elList.innerHTML = "";

  if (state.tab === "subs") {
    if (state.subsPhase === "idle") {
      elList.appendChild(
        renderState("empty", 'Click "Load" to fetch your subscriptions.'),
      );
      return;
    }
    if (state.subsPhase === "loading") {
      const n = state.subreddits.length;
      elList.appendChild(
        renderState(
          "loading",
          n > 0 ? `Fetching… ${n} loaded` : "Loading subscriptions…",
        ),
      );
      return;
    }
    if (state.subsPhase === "error") {
      elList.appendChild(renderState("error", state.authError ?? undefined));
      return;
    }
    const visible = filterSubs();
    if (visible.length === 0) {
      elList.appendChild(
        renderState("empty", "No subscriptions match the filter."),
      );
      return;
    }
    const frag = document.createDocumentFragment();
    visible.forEach((s) => frag.appendChild(renderSubItem(s)));
    elList.appendChild(frag);
    return;
  }

  // votes tab
  if (state.votesPhase === "idle") {
    elList.appendChild(
      renderState("empty", 'Click "Load" to fetch your upvoted posts.'),
    );
    return;
  }
  if (state.votesPhase === "loading") {
    const n = state.upvoted.length;
    elList.appendChild(
      renderState(
        "loading",
        n > 0 ? `Fetching… ${n} loaded` : "Loading upvoted posts…",
      ),
    );
    return;
  }
  if (state.votesPhase === "error") {
    elList.appendChild(renderState("error", state.authError ?? undefined));
    return;
  }
  if (state.votesPhase === "private") {
    elList.appendChild(renderState("private"));
    return;
  }
  const visible = filterVotes();
  if (visible.length === 0) {
    elList.appendChild(renderState("empty", "No posts match the filter."));
    return;
  }
  const frag = document.createDocumentFragment();
  visible.forEach((p) => frag.appendChild(renderPostItem(p)));
  elList.appendChild(frag);
}

// ── Tab badges ───────────────────────────────────────────────────────────────

function updateTabBadges(): void {
  const subsCount = state.subsPhase === "done" ? state.subreddits.length : "…";
  const votesCount = state.votesPhase === "done" ? state.upvoted.length : "…";
  elTabSubs.innerHTML = `Subscriptions <span class="rc-badge">${subsCount}</span>`;
  elTabVotes.innerHTML = `Upvoted <span class="rc-badge">${votesCount}</span>`;
}

// ── Sort options ─────────────────────────────────────────────────────────────

function updateSortOptions(): void {
  elSort.innerHTML = "";
  const opts =
    state.tab === "subs"
      ? [
          ["az", "A → Z"],
          ["za", "Z → A"],
          ["most", "Most members"],
          ["least", "Least members"],
        ]
      : [
          ["newest", "Newest first"],
          ["oldest", "Oldest first"],
          ["top", "Highest score"],
          ["low", "Lowest score"],
        ];
  opts.forEach(([val, label]) => {
    const o = el("option", { value: val ?? "" }, label ?? "");
    if (
      state.tab === "subs" ? val === state.subsSort : val === state.votesSort
    ) {
      o.selected = true;
    }
    elSort.appendChild(o);
  });
}

// ── Footer ───────────────────────────────────────────────────────────────────

function updateFooter(): void {
  const isSubs = state.tab === "subs";
  const count = isSubs ? state.selectedSubs.size : state.selectedPosts.size;
  const total = isSubs ? filterSubs().length : filterVotes().length;

  if (count === 0) {
    elSelCount.innerHTML = `<strong>${total}</strong> item${total !== 1 ? "s" : ""} shown — select to remove`;
    elActionBtn.disabled = true;
    elActionBtn.textContent = isSubs
      ? "Unsubscribe Selected"
      : "Remove Upvotes";
  } else {
    elSelCount.innerHTML = `<strong>${count}</strong> of ${total} selected`;
    elActionBtn.disabled = state.actionPhase === "running";
    elActionBtn.textContent = isSubs
      ? `Unsubscribe (${count})`
      : `Remove ${count} upvote${count !== 1 ? "s" : ""}`;
  }
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function showProgress(done: number, total: number): void {
  const pct = total > 0 ? (done / total) * 100 : 0;
  elProgress.innerHTML = `
    <div class="rc-progress-bar-wrap">
      <div class="rc-progress-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="rc-progress-text">${done} / ${total}</div>
  `;
  elProgress.style.display = "block";
}

function hideProgress(): void {
  elProgress.style.display = "none";
}

// ── Load data ────────────────────────────────────────────────────────────────

async function loadSubs(): Promise<void> {
  if (state.subsPhase === "loading") return;
  state.subsPhase = "loading";
  state.subreddits = [];
  state.selectedSubs.clear();
  renderList();
  updateTabBadges();

  try {
    const subs = await fetchAllSubscribed((n) => {
      state.subreddits = [];
      renderState("loading", `Fetching… ${n} loaded`);
      updateTabBadges();
    });
    state.subreddits = subs;
    state.subsPhase = "done";
    log("Fetched", subs.length, "subscriptions");
  } catch (err) {
    warn("fetchAllSubscribed error:", err);
    state.subsPhase = "error";
    state.authError = String(err);
  }

  renderList();
  updateTabBadges();
  updateFooter();
}

async function loadVotes(): Promise<void> {
  if (!state.userInfo) return;
  if (state.votesPhase === "loading") return;
  state.votesPhase = "loading";
  state.upvoted = [];
  state.selectedPosts.clear();
  renderList();
  updateTabBadges();

  try {
    const result = await fetchAllUpvoted(state.userInfo.username, (n) => {
      renderState("loading", `Fetching… ${n} loaded`);
      updateTabBadges();
    });
    if (result === "private") {
      state.votesPhase = "private";
    } else {
      state.upvoted = result;
      state.votesPhase = "done";
      log("Fetched", result.length, "upvoted posts");
    }
  } catch (err) {
    warn("fetchAllUpvoted error:", err);
    state.votesPhase = "error";
    state.authError = String(err);
  }

  renderList();
  updateTabBadges();
  updateFooter();
}

// ── Batch actions ────────────────────────────────────────────────────────────

function showConfirmBar(count: number, label: string): void {
  elConfirmBar.innerHTML = `
    <span>Remove <strong>${count} ${label}</strong>? This cannot be undone.</span>
  `;
  const yes = el("button", { class: "rc-btn-action danger" }, "Yes, remove");
  const no = el("button", { class: "rc-toolbar-btn" }, "Cancel");

  yes.addEventListener("click", () => {
    elConfirmBar.style.display = "none";
    void runBatchAction();
  });
  no.addEventListener("click", () => {
    state.actionPhase = "idle";
    elConfirmBar.style.display = "none";
    updateFooter();
  });

  elConfirmBar.append(yes, no);
  elConfirmBar.style.display = "flex";
}

async function runBatchAction(): Promise<void> {
  if (!state.userInfo) return;
  state.actionPhase = "running";
  elActionBtn.disabled = true;

  const isSubs = state.tab === "subs";
  const ids = isSubs ? [...state.selectedSubs] : [...state.selectedPosts];
  const total = ids.length;
  let done = 0;
  const failed: string[] = [];

  showProgress(done, total);

  for (const id of ids) {
    try {
      if (isSubs) {
        const sub = state.subreddits.find((s) => s.fullname === id);
        if (sub) await unsubscribe(sub.name, state.userInfo.modhash);
      } else {
        await unvote(id, state.userInfo.modhash);
      }
    } catch (err) {
      warn("Action failed for", id, err);
      failed.push(id);
    }

    done++;
    showProgress(done, total);
    if (done < total) await sleep(config.api.actionDelayMs);
  }

  // Remove processed items from state (keep failed ones selected).
  if (isSubs) {
    const removedNames = ids
      .filter((id) => !failed.includes(id))
      .map((id) => state.subreddits.find((s) => s.fullname === id)?.name ?? "");
    state.subreddits = state.subreddits.filter(
      (s) => !ids.includes(s.fullname) || failed.includes(s.fullname),
    );
    state.selectedSubs = new Set(failed);
    log(`Unsubscribed from: ${removedNames.join(", ")}`);
  } else {
    state.upvoted = state.upvoted.filter(
      (p) => !ids.includes(p.fullname) || failed.includes(p.fullname),
    );
    state.selectedPosts = new Set(failed);
  }

  state.actionPhase = "done";
  hideProgress();
  renderList();
  updateTabBadges();
  updateFooter();
  state.actionPhase = "idle";
}

// ── Tab switch ───────────────────────────────────────────────────────────────

function switchTab(tab: Tab): void {
  state.tab = tab;
  elTabSubs.classList.toggle("active", tab === "subs");
  elTabVotes.classList.toggle("active", tab === "votes");
  elFilter.value = tab === "subs" ? state.subsFilter : state.votesFilter;
  updateSortOptions();
  renderList();
  updateTabBadges();
  updateFooter();

  // Auto-load on first switch
  if (tab === "subs" && state.subsPhase === "idle") void loadSubs();
  if (tab === "votes" && state.votesPhase === "idle") void loadVotes();
}

// ── Init ─────────────────────────────────────────────────────────────────────

export function initPanel(): void {
  // Shadow host
  const host = document.createElement("div");
  host.id = "rc-host";
  document.body.appendChild(host);
  shadow = host.attachShadow({ mode: "open" });

  // Styles
  const style = document.createElement("style");
  style.textContent = CSS;
  shadow.appendChild(style);

  // Trigger button
  const btn = document.createElement("button");
  btn.id = "rc-btn";
  btn.title = "Reddit Cleaner";
  btn.setAttribute("aria-label", "Open Reddit Cleaner");
  btn.innerHTML = ICON_BROOM;
  shadow.appendChild(btn);

  // Backdrop
  elBackdrop = document.createElement("div");
  elBackdrop.id = "rc-backdrop";
  elBackdrop.className = "hidden";
  shadow.appendChild(elBackdrop);

  // Panel
  const panel = document.createElement("div");
  panel.id = "rc-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Reddit Cleaner");
  elBackdrop.appendChild(panel);

  // Header
  const header = document.createElement("div");
  header.id = "rc-header";

  const title = document.createElement("div");
  title.id = "rc-title";
  title.innerHTML = `${ICON_BROOM} Reddit Cleaner`;

  elUser = document.createElement("div");
  elUser.id = "rc-user";
  elUser.textContent = "Loading…";

  const closeBtn = document.createElement("button");
  closeBtn.id = "rc-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = ICON_CLOSE;
  closeBtn.addEventListener("click", closePanel);

  header.append(title, elUser, closeBtn);
  panel.appendChild(header);

  // Tab bar
  const tabBar = document.createElement("div");
  tabBar.id = "rc-tabs";

  elTabSubs = document.createElement("button");
  elTabSubs.className = "rc-tab active";
  elTabSubs.innerHTML = `Subscriptions <span class="rc-badge">…</span>`;
  elTabSubs.addEventListener("click", () => switchTab("subs"));

  elTabVotes = document.createElement("button");
  elTabVotes.className = "rc-tab";
  elTabVotes.innerHTML = `Upvoted <span class="rc-badge">…</span>`;
  elTabVotes.addEventListener("click", () => switchTab("votes"));

  tabBar.append(elTabSubs, elTabVotes);
  panel.appendChild(tabBar);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.id = "rc-toolbar";

  elFilter = document.createElement("input");
  elFilter.id = "rc-filter";
  elFilter.type = "text";
  elFilter.placeholder = "Filter…";
  elFilter.addEventListener("input", () => {
    const val = elFilter.value;
    if (state.tab === "subs") state.subsFilter = val;
    else state.votesFilter = val;
    renderList();
    updateFooter();
  });

  elSort = document.createElement("select");
  elSort.id = "rc-sort";
  elSort.addEventListener("change", () => {
    const val = elSort.value;
    if (state.tab === "subs") state.subsSort = val as SubSort;
    else state.votesSort = val as VoteSort;
    renderList();
  });

  const selAllBtn = document.createElement("button");
  selAllBtn.className = "rc-toolbar-btn";
  selAllBtn.textContent = "Select All";
  selAllBtn.addEventListener("click", () => {
    if (state.tab === "subs") {
      filterSubs().forEach((s) => state.selectedSubs.add(s.fullname));
    } else {
      filterVotes().forEach((p) => state.selectedPosts.add(p.fullname));
    }
    renderList();
    updateFooter();
  });

  const deselBtn = document.createElement("button");
  deselBtn.className = "rc-toolbar-btn";
  deselBtn.textContent = "None";
  deselBtn.addEventListener("click", () => {
    if (state.tab === "subs") state.selectedSubs.clear();
    else state.selectedPosts.clear();
    renderList();
    updateFooter();
  });

  const reloadBtn = document.createElement("button");
  reloadBtn.className = "rc-toolbar-btn";
  reloadBtn.textContent = "↺ Reload";
  reloadBtn.addEventListener("click", () => {
    if (state.tab === "subs") void loadSubs();
    else void loadVotes();
  });

  toolbar.append(elFilter, elSort, selAllBtn, deselBtn, reloadBtn);
  panel.appendChild(toolbar);
  updateSortOptions();

  // Progress (hidden initially)
  elProgress = document.createElement("div");
  elProgress.id = "rc-progress";
  elProgress.style.display = "none";
  panel.appendChild(elProgress);

  // List
  elList = document.createElement("div");
  elList.id = "rc-list";
  panel.appendChild(elList);

  // Confirm bar (hidden initially)
  elConfirmBar = document.createElement("div");
  elConfirmBar.id = "rc-confirm-bar";
  elConfirmBar.style.display = "none";
  panel.appendChild(elConfirmBar);

  // Footer
  const footer = document.createElement("div");
  footer.id = "rc-footer";

  elSelCount = document.createElement("div");
  elSelCount.id = "rc-sel-count";

  elActionBtn = document.createElement("button");
  elActionBtn.className = "rc-btn-action danger";
  elActionBtn.disabled = true;
  elActionBtn.textContent = "Unsubscribe Selected";
  elActionBtn.addEventListener("click", () => {
    const count =
      state.tab === "subs" ? state.selectedSubs.size : state.selectedPosts.size;
    if (count === 0) return;
    state.actionPhase = "confirming";
    showConfirmBar(count, state.tab === "subs" ? "subreddits" : "upvotes");
  });

  footer.append(elSelCount, elActionBtn);
  panel.appendChild(footer);

  // Backdrop click to close
  elBackdrop.addEventListener("click", (e) => {
    if (e.target === elBackdrop) closePanel();
  });

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !elBackdrop.classList.contains("hidden"))
      closePanel();
  });

  // Trigger button opens panel
  btn.addEventListener("click", () => void openPanel());

  // Initial footer state
  renderList();
  updateFooter();
}

async function openPanel(): Promise<void> {
  elBackdrop.classList.remove("hidden");

  // Authenticate on first open
  if (!state.userInfo && !state.authError) {
    elUser.textContent = "Authenticating…";
    try {
      state.userInfo = await fetchUserInfo();
      elUser.textContent = `u/${state.userInfo.username}`;
      log("Authenticated as", state.userInfo.username);
    } catch (err) {
      warn("Auth error:", err);
      state.authError = String(err);
      elUser.textContent = "Not logged in";
    }
  }

  // Auto-load subscriptions on first open
  if (state.userInfo && state.subsPhase === "idle") {
    void loadSubs();
  }
}

function closePanel(): void {
  elBackdrop.classList.add("hidden");
  state.actionPhase = "idle";
  elConfirmBar.style.display = "none";
  hideProgress();
}

/** Programmatic open — called from GM_registerMenuCommand. */
export function togglePanel(): void {
  if (elBackdrop.classList.contains("hidden")) {
    void openPanel();
  } else {
    closePanel();
  }
}
